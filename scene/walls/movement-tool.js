import { OBR } from "../../platform/obr.js";
import { logger } from "../../core/logger.js";
import { PREFERENCES, readBooleanPreference } from "../../core/preferences.js";
import { constrainGroupDelta } from "./geometry.js";
import { getMovementWallSegments } from "./collision.js";
import { createWallAwareMoveMarker, isLocalGuide, isLocalWall, isMovableToken, isWallSource, WALL_AWARE_MOVE_KEY, } from "./model.js";
import { getNativeMoveModeId, HIDDEN_TOOL_FILTER_ID, isNativeMoveTool, isNativeMoveTransformer, NATIVE_MOVE_COLLISION_MODE_ID, NATIVE_MOVE_PASSTHROUGH_MODE_ID, NATIVE_MOVE_TOOL_ID, NATIVE_MOVE_TOOL_IDS, } from "./movement-tool-utils.js";
const LEGACY_TOOL_ID = "com.beholder-vtt/token-movement";
const SETTINGS_ACTION_ID = "com.beholder-vtt/native-move-settings";
const SETTINGS_POPOVER_ID = "com.beholder-vtt/movement-settings";
const FALLBACK_RADIUS = 18;
const MARQUEE_BATCH_SIZE = 20;
function isSelectableItem(item) {
    return item.visible &&
        !item.locked &&
        item.layer !== "FOG" &&
        item.layer !== "RULER" &&
        item.layer !== "CONTROL" &&
        item.layer !== "POPOVER" &&
        !isWallSource(item) &&
        !isLocalWall(item) &&
        !isLocalGuide(item);
}
function makeSelectionRectangle(start, end) {
    return {
        min: { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y) },
        max: { x: Math.max(start.x, end.x), y: Math.max(start.y, end.y) },
    };
}
function intersects(a, min, max) {
    return max.x >= a.min.x && min.x <= a.max.x &&
        max.y >= a.min.y && min.y <= a.max.y;
}
/**
 * Extends Owlbear's built-in Move tool with Beholder's wall-aware Token movement.
 *
 * CHARACTER/MOUNT drags use real-time wall collision. Other scene-item drags
 * are handed back to Owlbear's default Move behavior via preventDrag. Empty-space
 * drags perform Beholder's marquee selection.
 */
export class NativeMoveIntegration {
    registered = false;
    session = null;
    generation = 0;
    starting = false;
    pendingPointer = null;
    pendingFinish = false;
    marqueeStart = null;
    marqueeAdditive = false;
    groupMovement = true;
    takeoverNativeMove = true;
    nativeModesRegistered = false;
    switchingNativeMode = false;
    requestedNativeMode = null;
    nativeTransformerActive = false;
    storageHandler = null;
    unsubscribeTool = null;
    unsubscribeMode = null;
    async start() {
        if (this.registered)
            return;
        this.groupMovement = readBooleanPreference(PREFERENCES.groupMovement, true);
        this.takeoverNativeMove = readBooleanPreference(PREFERENCES.movementTakeover, true);
        const settingsIcon = new URL("./icons/settings.svg", window.location.href).toString();
        try {
            const activeToolBeforeCleanup = await OBR.tool.getActiveTool().catch(() => "");
            // Remove the old independent Beholder movement tool and its settings.
            try {
                await OBR.tool.removeAction(LEGACY_TOOL_ID + "/settings");
            }
            catch { /* absent */ }
            try {
                await OBR.tool.removeMode(LEGACY_TOOL_ID + "/move");
            }
            catch { /* absent */ }
            try {
                await OBR.tool.remove(LEGACY_TOOL_ID);
            }
            catch { /* absent */ }
            if (activeToolBeforeCleanup === LEGACY_TOOL_ID) {
                await OBR.tool.activateTool(NATIVE_MOVE_TOOL_ID);
            }
            // Clean up modes left by earlier native Select experiments.
            try {
                await OBR.tool.removeMode("com.beholder-vtt/native-select-passthrough");
            }
            catch { /* absent */ }
            try {
                await OBR.tool.removeMode("com.beholder-vtt/native-select-collision");
            }
            catch { /* absent */ }
            await this.registerNativeMoveModes();
            await OBR.tool.createAction({
                id: SETTINGS_ACTION_ID,
                icons: [{
                        icon: settingsIcon,
                        label: "墙体感知移动设置",
                        filter: { activeTools: [...NATIVE_MOVE_TOOL_IDS] },
                    }],
                onClick: async (_context, elementId) => {
                    await OBR.popover.open({
                        id: SETTINGS_POPOVER_ID,
                        url: new URL("./movement-settings.html", window.location.href).toString(),
                        width: 330,
                        height: 330,
                        anchorElementId: elementId,
                    });
                },
            });
            this.registered = true;
            this.storageHandler = (event) => this.handleStorageChange(event);
            window.addEventListener("storage", this.storageHandler);
            this.unsubscribeTool = OBR.tool.onToolChange((toolId) => this.handleToolChange(toolId));
            this.unsubscribeMode = OBR.tool.onToolModeChange((modeId) => this.handleToolModeChange(modeId));
            logger.info("Beholder wall-aware mode registered on Owlbear's native Move tool.", {
                nativeMoveToolIds: [...NATIVE_MOVE_TOOL_IDS],
                groupMovement: this.groupMovement,
                wallAwareMovement: this.takeoverNativeMove,
                nativeMoveModeRegistered: this.nativeModesRegistered,
            });
            await this.syncNativeMoveMode();
        }
        catch (error) {
            await this.removeRegistrations();
            logger.error("Beholder native Move integration failed to initialize.", error);
            throw error;
        }
    }
    async stop() {
        this.nativeTransformerActive = false;
        this.cancel();
        if (this.storageHandler)
            window.removeEventListener("storage", this.storageHandler);
        this.storageHandler = null;
        this.unsubscribeTool?.();
        this.unsubscribeTool = null;
        this.unsubscribeMode?.();
        this.unsubscribeMode = null;
        await this.removeRegistrations();
    }
    async removeRegistrations() {
        await this.removeNativeMoveModes();
        try {
            await OBR.tool.removeAction(SETTINGS_ACTION_ID);
        }
        catch { /* not registered */ }
        try {
            await OBR.tool.removeAction(LEGACY_TOOL_ID + "/settings");
        }
        catch { /* absent */ }
        try {
            await OBR.tool.removeMode(LEGACY_TOOL_ID + "/move");
        }
        catch { /* absent */ }
        try {
            await OBR.tool.remove(LEGACY_TOOL_ID);
        }
        catch { /* absent */ }
        this.registered = false;
    }
    async registerNativeMoveModes() {
        if (this.nativeModesRegistered)
            return;
        const icon = new URL("./icons/move-token.svg", window.location.href).toString();
        const nativeMoveIcon = {
            icon,
            label: "Beholder · 墙体感知移动",
            filter: { activeTools: [...NATIVE_MOVE_TOOL_IDS] },
        };
        const hiddenPassThroughIcon = {
            icon,
            label: "Beholder · 原生变换委托",
            filter: { activeTools: [HIDDEN_TOOL_FILTER_ID] },
        };
        try {
            try {
                await OBR.tool.removeMode(NATIVE_MOVE_PASSTHROUGH_MODE_ID);
            }
            catch { /* absent */ }
            try {
                await OBR.tool.removeMode(NATIVE_MOVE_COLLISION_MODE_ID);
            }
            catch { /* absent */ }
            await OBR.tool.createMode({
                id: NATIVE_MOVE_COLLISION_MODE_ID,
                icons: [nativeMoveIcon],
                cursors: [{ cursor: "grab" }],
                preventDrag: {
                    target: [
                        { key: "layer", value: "CHARACTER", operator: "!=", coordinator: "&&" },
                        { key: "layer", value: "MOUNT", operator: "!=", coordinator: "&&" },
                    ],
                },
                onToolDown: (_context, event) => this.handleNativeMovePointerDown(event),
                onToolClick: (_context, event) => this.handleClick(event),
                onToolDragStart: (_context, event) => this.begin(event),
                onToolDragMove: (_context, event) => this.move(event.pointerPosition),
                onToolDragEnd: (_context, event) => this.end(event),
                onToolUp: (_context, event) => {
                    if (event.transformer) {
                        this.nativeTransformerActive = false;
                        void this.restoreNativeMoveMode();
                    }
                },
                onToolDragCancel: () => {
                    this.nativeTransformerActive = false;
                    this.cancel();
                    void this.restoreNativeMoveMode();
                },
                onDeactivate: () => this.cancel(),
            });
            await OBR.tool.createMode({
                id: NATIVE_MOVE_PASSTHROUGH_MODE_ID,
                icons: [hiddenPassThroughIcon],
                preventDrag: {},
                onToolUp: () => {
                    this.nativeTransformerActive = false;
                    void this.restoreNativeMoveMode();
                },
                onToolDragEnd: () => {
                    this.nativeTransformerActive = false;
                    void this.restoreNativeMoveMode();
                },
                onToolDragCancel: () => {
                    this.nativeTransformerActive = false;
                    void this.restoreNativeMoveMode();
                },
            });
            this.nativeModesRegistered = true;
            logger.info("Wall-aware collision mode is mounted on Owlbear's native Move.", {
                nativeMoveToolIds: [...NATIVE_MOVE_TOOL_IDS],
                visibleModeId: NATIVE_MOVE_COLLISION_MODE_ID,
            });
        }
        catch (error) {
            try {
                await OBR.tool.removeMode(NATIVE_MOVE_PASSTHROUGH_MODE_ID);
            }
            catch { /* absent */ }
            try {
                await OBR.tool.removeMode(NATIVE_MOVE_COLLISION_MODE_ID);
            }
            catch { /* absent */ }
            this.nativeModesRegistered = false;
            logger.error("Could not register Beholder's mode on Owlbear's native Move.", error);
            void OBR.notification.show("Beholder 无法挂载官方 Move 的墙体感知模式。请重载扩展并检查控制台。", "ERROR").catch(() => undefined);
        }
    }
    async removeNativeMoveModes() {
        this.cancel();
        this.requestedNativeMode = null;
        try {
            await OBR.tool.removeMode(NATIVE_MOVE_PASSTHROUGH_MODE_ID);
        }
        catch { /* absent */ }
        try {
            await OBR.tool.removeMode(NATIVE_MOVE_COLLISION_MODE_ID);
        }
        catch { /* absent */ }
        this.nativeModesRegistered = false;
    }
    handleNativeMovePointerDown(event) {
        if (isNativeMoveTransformer(event)) {
            this.nativeTransformerActive = true;
            void this.activateNativeMoveMode(NATIVE_MOVE_PASSTHROUGH_MODE_ID);
        }
    }
    async syncNativeMoveMode() {
        if (!this.registered || !this.nativeModesRegistered)
            return;
        const activeTool = await OBR.tool.getActiveTool().catch(() => "");
        if (!isNativeMoveTool(activeTool))
            return;
        await this.activateNativeMoveMode(getNativeMoveModeId(this.takeoverNativeMove));
    }
    async activateNativeMoveMode(modeId) {
        if (!this.nativeModesRegistered)
            return;
        this.requestedNativeMode = modeId;
        if (this.switchingNativeMode)
            return;
        this.switchingNativeMode = true;
        try {
            while (this.requestedNativeMode) {
                const requestedMode = this.requestedNativeMode;
                this.requestedNativeMode = null;
                const activeTool = await OBR.tool.getActiveTool().catch(() => "");
                if (!isNativeMoveTool(activeTool))
                    continue;
                const activeMode = await OBR.tool.getActiveToolMode().catch(() => undefined);
                if (activeMode !== requestedMode) {
                    await OBR.tool.activateMode(activeTool, requestedMode);
                    const confirmedMode = await OBR.tool.getActiveToolMode().catch(() => undefined);
                    if (confirmedMode !== requestedMode) {
                        logger.warn("Owlbear did not confirm the requested native Move mode.", {
                            activeTool,
                            requestedMode,
                            confirmedMode,
                        });
                    }
                }
            }
        }
        catch (error) {
            logger.warn("Could not switch the active mode of Owlbear's native Move tool.", {
                modeId,
                error,
            });
        }
        finally {
            this.switchingNativeMode = false;
        }
    }
    async restoreNativeMoveMode() {
        await this.syncNativeMoveMode();
    }
    handleToolModeChange(modeId) {
        if (this.switchingNativeMode)
            return;
        if (modeId === NATIVE_MOVE_COLLISION_MODE_ID && this.takeoverNativeMove)
            return;
        if (modeId === NATIVE_MOVE_PASSTHROUGH_MODE_ID &&
            (!this.takeoverNativeMove || this.nativeTransformerActive))
            return;
        void this.syncNativeMoveMode();
    }
    handleStorageChange(event) {
        if (event.key === PREFERENCES.groupMovement) {
            this.groupMovement = event.newValue !== "false";
        }
        else if (event.key === PREFERENCES.movementTakeover) {
            this.takeoverNativeMove = event.newValue !== "false";
            void this.syncNativeMoveMode();
        }
    }
    handleToolChange(toolId) {
        if (isNativeMoveTool(toolId)) {
            this.cancel();
            void this.syncNativeMoveMode();
            return;
        }
        this.nativeTransformerActive = false;
        this.cancel();
    }
    async handleClick(event) {
        if (event.transformer)
            return false;
        const target = event.target;
        const additive = event.shiftKey || event.ctrlKey || event.metaKey;
        if (!target) {
            if (!additive)
                await OBR.player.deselect();
            return false;
        }
        if (target.locked)
            return false;
        if (additive) {
            const selection = await OBR.player.getSelection() ?? [];
            if (selection.includes(target.id)) {
                await OBR.player.deselect([target.id]);
            }
            else {
                await OBR.player.select([target.id], false);
            }
        }
        else {
            await OBR.player.select([target.id], true);
        }
        return false;
    }
    begin(event) {
        if (this.starting || this.session)
            this.cancel();
        if (!event.target) {
            this.marqueeStart = { ...event.pointerPosition };
            this.marqueeAdditive = event.shiftKey || event.ctrlKey || event.metaKey;
            return;
        }
        this.marqueeStart = null;
        if (event.transformer)
            return;
        const target = event.target;
        if (!isMovableToken(target) || target.locked)
            return;
        const generation = ++this.generation;
        this.starting = true;
        this.pendingPointer = { ...event.pointerPosition };
        this.pendingFinish = false;
        void this.prepareSession(target, event.pointerPosition).then((session) => {
            if (generation !== this.generation) {
                session?.stop();
                return;
            }
            this.starting = false;
            if (!session)
                return;
            this.session = session;
            if (this.pendingPointer)
                this.applyPointer(this.pendingPointer);
            if (this.pendingFinish)
                void this.finish();
        }).catch((error) => {
            if (generation !== this.generation)
                return;
            this.starting = false;
            logger.warn("Could not start Beholder wall-aware movement.", {
                itemId: target.id,
                error,
            });
        });
    }
    async prepareSession(target, pointer) {
        const selectedIds = await OBR.player.getSelection() ?? [];
        const movingIds = this.groupMovement && selectedIds.includes(target.id)
            ? selectedIds
            : [target.id];
        if (!selectedIds.includes(target.id)) {
            await OBR.player.select([target.id], true);
        }
        const [sceneItems, sourceItems] = await Promise.all([
            OBR.scene.items.getItems(movingIds),
            OBR.scene.items.getItems(isWallSource),
        ]);
        const items = sceneItems.filter((item) => !item.locked && !isWallSource(item) && !isLocalWall(item) && !isLocalGuide(item));
        if (!items.some((item) => item.id === target.id))
            return null;
        const tokens = items.filter(isMovableToken);
        const footprints = await Promise.all(tokens.map(async (token) => {
            try {
                const bounds = await OBR.scene.items.getItemBounds([token.id]);
                const measuredRadius = Math.min(bounds.width, bounds.height) * 0.4;
                return {
                    center: { ...bounds.center },
                    radius: Number.isFinite(measuredRadius) && measuredRadius >= 2
                        ? measuredRadius
                        : FALLBACK_RADIUS,
                };
            }
            catch (error) {
                logger.debug("Selected Token bounds unavailable; using fallback footprint.", {
                    itemId: token.id,
                    error,
                });
                return { center: { ...token.position }, radius: FALLBACK_RADIUS };
            }
        }));
        const originalPositions = new Map(items.map((item) => [item.id, { ...item.position }]));
        const currentPositions = new Map(items.map((item) => [item.id, { ...item.position }]));
        const [update, stop] = await OBR.interaction.startItemInteraction(items);
        return {
            items,
            lastPointer: { ...pointer },
            originalPositions,
            currentPositions,
            footprints,
            walls: getMovementWallSegments(sourceItems),
            update,
            stop,
            blocked: false,
        };
    }
    move(pointer) {
        if (!this.session && this.starting) {
            this.pendingPointer = { ...pointer };
            return;
        }
        if (this.session) {
            this.applyPointer(pointer);
        }
    }
    applyPointer(pointer) {
        const session = this.session;
        if (!session)
            return;
        const requestedDelta = {
            x: pointer.x - session.lastPointer.x,
            y: pointer.y - session.lastPointer.y,
        };
        session.lastPointer = { ...pointer };
        const allowedDelta = constrainGroupDelta(requestedDelta, session.footprints, session.walls);
        if (Math.abs(allowedDelta.x - requestedDelta.x) > 0.001 ||
            Math.abs(allowedDelta.y - requestedDelta.y) > 0.001) {
            session.blocked = true;
        }
        if (Math.abs(allowedDelta.x) < 0.001 && Math.abs(allowedDelta.y) < 0.001)
            return;
        try {
            session.update((drafts) => {
                for (const draft of drafts) {
                    const current = session.currentPositions.get(draft.id);
                    if (!current)
                        continue;
                    draft.position = {
                        x: current.x + allowedDelta.x,
                        y: current.y + allowedDelta.y,
                    };
                }
            });
            for (const [id, current] of session.currentPositions) {
                session.currentPositions.set(id, {
                    x: current.x + allowedDelta.x,
                    y: current.y + allowedDelta.y,
                });
            }
            for (const footprint of session.footprints) {
                footprint.center = {
                    x: footprint.center.x + allowedDelta.x,
                    y: footprint.center.y + allowedDelta.y,
                };
            }
        }
        catch (error) {
            logger.warn("Beholder movement update failed.", error);
            this.cancel();
        }
    }
    end(event) {
        if (this.session) {
            this.applyPointer(event.pointerPosition);
            void this.finish();
            return;
        }
        if (this.starting) {
            this.pendingPointer = { ...event.pointerPosition };
            this.pendingFinish = true;
            return;
        }
        if (this.marqueeStart) {
            const start = this.marqueeStart;
            const additive = this.marqueeAdditive || event.shiftKey || event.ctrlKey || event.metaKey;
            this.marqueeStart = null;
            void this.finishMarquee(start, event.pointerPosition, additive);
        }
    }
    async finishMarquee(start, end, additive) {
        const rectangle = makeSelectionRectangle(start, end);
        if (rectangle.max.x - rectangle.min.x < 3 && rectangle.max.y - rectangle.min.y < 3)
            return;
        try {
            const candidates = (await OBR.scene.items.getItems()).filter(isSelectableItem);
            const hits = [];
            for (let index = 0; index < candidates.length; index += MARQUEE_BATCH_SIZE) {
                const batch = candidates.slice(index, index + MARQUEE_BATCH_SIZE);
                const results = await Promise.all(batch.map(async (item) => {
                    try {
                        const bounds = await OBR.scene.items.getItemBounds([item.id]);
                        return intersects(rectangle, bounds.min, bounds.max) ? item.id : null;
                    }
                    catch {
                        return null;
                    }
                }));
                for (const id of results)
                    if (id)
                        hits.push(id);
            }
            if (additive) {
                const existing = await OBR.player.getSelection() ?? [];
                const combined = [...new Set([...existing, ...hits])];
                if (combined.length)
                    await OBR.player.select(combined, true);
            }
            else if (hits.length) {
                await OBR.player.select(hits, true);
            }
            else {
                await OBR.player.deselect();
            }
        }
        catch (error) {
            logger.warn("Beholder marquee selection failed.", error);
        }
    }
    async finish() {
        const session = this.session;
        if (!session)
            return;
        this.session = null;
        this.pendingPointer = null;
        this.pendingFinish = false;
        try {
            session.stop();
            await OBR.scene.items.updateItems(session.items, (drafts) => {
                for (const draft of drafts) {
                    const position = session.currentPositions.get(draft.id);
                    if (position)
                        draft.position = { ...position };
                    if (isMovableToken(draft)) {
                        draft.metadata[WALL_AWARE_MOVE_KEY] = createWallAwareMoveMarker();
                    }
                }
            });
            logger.debug("Beholder group movement committed.", {
                itemIds: session.items.map((item) => item.id),
                blockedByWall: session.blocked,
            });
        }
        catch (error) {
            logger.warn("Could not commit Beholder movement.", error);
        }
    }
    cancel() {
        this.generation += 1;
        this.starting = false;
        this.pendingPointer = null;
        this.pendingFinish = false;
        this.marqueeStart = null;
        const session = this.session;
        this.session = null;
        if (session)
            void this.restore(session);
    }
    async restore(session) {
        try {
            session.update((drafts) => {
                for (const draft of drafts) {
                    const position = session.originalPositions.get(draft.id);
                    if (position)
                        draft.position = { ...position };
                }
            });
            session.stop();
            await OBR.scene.items.updateItems(session.items, (drafts) => {
                for (const draft of drafts) {
                    const position = session.originalPositions.get(draft.id);
                    if (position)
                        draft.position = { ...position };
                }
            });
        }
        catch (error) {
            logger.warn("Could not cancel Beholder movement.", error);
        }
    }
}
//# sourceMappingURL=movement-tool.js.map