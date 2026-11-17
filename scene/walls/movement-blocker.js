import { OBR } from "../../platform/obr.js";
import { logger } from "../../core/logger.js";
import { constrainMovement } from "./geometry.js";
import { getMovementWallSegments } from "./collision.js";
import { hasWallAwareMoveMarker, isMovableToken, WALL_AWARE_MOVE_KEY } from "./model.js";
function sameVector(a, b) {
    return Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;
}
/**
 * GM-authoritative safety net for Token movement paths that bypass Beholder's
 * real-time Select + Move tool. This remains active when native Move takeover
 * is temporarily disabled or another extension tool moves a Token.
 */
export class MovementBlocker {
    snapshots = new Map();
    unsubscribers = [];
    disposed = false;
    pendingItems = null;
    queue = Promise.resolve();
    refreshSequence = 0;
    async start() {
        const role = await OBR.player.getRole();
        if (role !== "GM") {
            logger.info("Native-tool movement fallback is enforced by the GM client.");
            return;
        }
        this.unsubscribers.push(OBR.scene.items.onChange(() => {
            void this.refreshScene();
        }), OBR.scene.onReadyChange((ready) => {
            if (!ready) {
                this.refreshSequence += 1;
                this.snapshots.clear();
                this.pendingItems = null;
                return;
            }
            void this.refreshScene();
        }));
        if (await OBR.scene.isReady()) {
            await this.refreshScene();
        }
        logger.info("GM native-tool movement fallback active.", {
            monitoredLayers: ["CHARACTER", "MOUNT"],
            lightRequired: false,
        });
    }
    stop() {
        this.disposed = true;
        this.refreshSequence += 1;
        this.pendingItems = null;
        for (const unsubscribe of this.unsubscribers.splice(0)) {
            try {
                unsubscribe();
            }
            catch (error) {
                logger.warn("A movement-blocker subscription could not be removed cleanly.", error);
            }
        }
        this.snapshots.clear();
    }
    async refreshScene() {
        const sequence = ++this.refreshSequence;
        try {
            if (!(await OBR.scene.isReady()))
                return;
            const items = await OBR.scene.items.getItems();
            if (this.disposed || sequence !== this.refreshSequence)
                return;
            await this.enqueue(items);
        }
        catch (error) {
            logger.warn("Could not refresh the GM movement-blocker scene snapshot.", error);
        }
    }
    enqueue(items) {
        if (this.disposed)
            return Promise.resolve();
        this.pendingItems = items;
        this.queue = this.queue.then(async () => {
            while (this.pendingItems && !this.disposed) {
                const next = this.pendingItems;
                this.pendingItems = null;
                await this.process(next);
            }
        }).catch((error) => {
            logger.error("Movement-blocker processing failed.", error);
        });
        return this.queue;
    }
    async capture(item) {
        const position = { ...item.position };
        const scale = { ...item.scale };
        let center = { ...position };
        let radius = 18;
        try {
            const bounds = await OBR.scene.items.getItemBounds([item.id]);
            center = { ...bounds.center };
            const measuredRadius = Math.min(bounds.width, bounds.height) * 0.4;
            if (Number.isFinite(measuredRadius) && measuredRadius >= 2) {
                radius = measuredRadius;
            }
        }
        catch (error) {
            logger.debug("Token bounds unavailable; using fallback collision radius.", { itemId: item.id, error });
        }
        return {
            position,
            center,
            centerOffset: { x: center.x - position.x, y: center.y - position.y },
            radius,
            rotation: item.rotation,
            scale,
        };
    }
    async clearTrustedMoveMarker(token) {
        try {
            await OBR.scene.items.updateItems([token], (drafts) => {
                for (const draft of drafts)
                    delete draft.metadata[WALL_AWARE_MOVE_KEY];
            });
        }
        catch (error) {
            logger.warn("Could not clear the wall-aware movement marker.", { itemId: token.id, error });
        }
    }
    async process(items) {
        if (!(await OBR.scene.isReady()))
            return;
        const walls = getMovementWallSegments(items);
        const tokens = items.filter(isMovableToken);
        const presentIds = new Set(tokens.map((token) => token.id));
        for (const id of this.snapshots.keys()) {
            if (!presentIds.has(id))
                this.snapshots.delete(id);
        }
        for (const token of tokens) {
            // A custom-tool path was already checked at each drag update. Accept its
            // final position as the new safe snapshot, then remove the one-shot marker.
            // This prevents a legal path around a wall endpoint being mistaken for a
            // straight-line wall crossing by the GM fallback.
            if (hasWallAwareMoveMarker(token)) {
                this.snapshots.set(token.id, await this.capture(token));
                await this.clearTrustedMoveMarker(token);
                continue;
            }
            const previous = this.snapshots.get(token.id);
            if (!previous) {
                this.snapshots.set(token.id, await this.capture(token));
                continue;
            }
            const positionChanged = !sameVector(token.position, previous.position);
            const transformChanged = token.rotation !== previous.rotation ||
                !sameVector(token.scale, previous.scale);
            if (!positionChanged && !transformChanged)
                continue;
            const current = transformChanged
                ? await this.capture(token)
                : {
                    ...previous,
                    position: { ...token.position },
                    center: {
                        x: token.position.x + previous.centerOffset.x,
                        y: token.position.y + previous.centerOffset.y,
                    },
                };
            if (!positionChanged || walls.length === 0) {
                this.snapshots.set(token.id, current);
                continue;
            }
            const safeCenter = constrainMovement(previous.center, current.center, walls, current.radius);
            if (!safeCenter) {
                this.snapshots.set(token.id, current);
                continue;
            }
            const correctedPosition = {
                x: token.position.x + safeCenter.x - current.center.x,
                y: token.position.y + safeCenter.y - current.center.y,
            };
            const correctedSnapshot = {
                ...current,
                position: correctedPosition,
                center: safeCenter,
            };
            this.snapshots.set(token.id, correctedSnapshot);
            try {
                await OBR.scene.items.updateItems((item) => item.id === token.id, (drafts) => {
                    for (const draft of drafts)
                        draft.position = correctedPosition;
                });
                logger.debug("Native-tool token movement corrected at wall boundary.", { itemId: token.id });
            }
            catch (error) {
                this.snapshots.set(token.id, previous);
                logger.warn("A token could not be returned to its last safe position.", { itemId: token.id, error });
            }
        }
    }
}
//# sourceMappingURL=movement-blocker.js.map