import { OBR } from "../../platform/obr.js";
import type { SceneItem, Vector2 } from "../../platform/obr.js";
import { logger } from "../../core/logger.js";
import { constrainMovement } from "./geometry.js";
import type { WallSegment2D } from "./geometry.js";
import { getMovementWallSegments } from "./collision.js";
import { isMovableToken } from "./model.js";

interface TokenSnapshot {
  position: Vector2;
  center: Vector2;
  centerOffset: Vector2;
  radius: number;
  rotation: number;
  scale: Vector2;
}

function sameVector(a: Vector2, b: Vector2): boolean {
  return Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;
}

/**
 * GM-authoritative fallback for movement performed with Owlbear's native tools.
 *
 * The real-time TokenMovementTool is the preferred movement path. This watcher
 * intentionally remains in place so native Select / other tools cannot leave
 * a CHARACTER or MOUNT image token beyond a movement-blocking wall.
 */
export class MovementBlocker {
  private readonly snapshots = new Map<string, TokenSnapshot>();
  private readonly unsubscribers: Array<() => void> = [];
  private disposed = false;
  private pendingItems: SceneItem[] | null = null;
  private queue: Promise<void> = Promise.resolve();
  private refreshSequence = 0;

  async start(): Promise<void> {
    const role = await OBR.player.getRole();
    if (role !== "GM") {
      logger.info("Native-tool movement fallback is enforced by the GM client.");
      return;
    }

    this.unsubscribers.push(
      // Always fetch the complete scene. The SDK event payload is not used as
      // an authoritative full-scene snapshot by this module.
      OBR.scene.items.onChange(() => {
        void this.refreshScene();
      }),
      OBR.scene.onReadyChange((ready) => {
        if (!ready) {
          this.refreshSequence += 1;
          this.snapshots.clear();
          this.pendingItems = null;
          return;
        }
        void this.refreshScene();
      }),
    );

    if (await OBR.scene.isReady()) {
      await this.refreshScene();
    }
    logger.info("GM native-tool movement fallback active.", {
      monitoredLayers: ["CHARACTER", "MOUNT"],
      lightRequired: false,
    });
  }

  stop(): void {
    this.disposed = true;
    this.refreshSequence += 1;
    this.pendingItems = null;
    for (const unsubscribe of this.unsubscribers.splice(0)) {
      try {
        unsubscribe();
      } catch (error) {
        logger.warn("A movement-blocker subscription could not be removed cleanly.", error);
      }
    }
    this.snapshots.clear();
  }

  private async refreshScene(): Promise<void> {
    const sequence = ++this.refreshSequence;
    try {
      if (!(await OBR.scene.isReady())) return;
      const items = await OBR.scene.items.getItems();
      if (this.disposed || sequence !== this.refreshSequence) return;
      await this.enqueue(items);
    } catch (error) {
      logger.warn("Could not refresh the GM movement-blocker scene snapshot.", error);
    }
  }

  private enqueue(items: SceneItem[]): Promise<void> {
    if (this.disposed) return Promise.resolve();
    this.pendingItems = items;
    this.queue = this.queue.then(async () => {
      while (this.pendingItems && !this.disposed) {
        const next = this.pendingItems;
        this.pendingItems = null;
        await this.process(next);
      }
    }).catch((error: unknown) => {
      logger.error("Movement-blocker processing failed.", error);
    });
    return this.queue;
  }

  private async capture(item: SceneItem): Promise<TokenSnapshot> {
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
    } catch (error) {
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

  private async process(items: SceneItem[]): Promise<void> {
    if (!(await OBR.scene.isReady())) return;

    const walls: WallSegment2D[] = getMovementWallSegments(items);
    const tokens = items.filter(isMovableToken);
    const presentIds = new Set(tokens.map((token) => token.id));

    for (const id of this.snapshots.keys()) {
      if (!presentIds.has(id)) this.snapshots.delete(id);
    }

    for (const token of tokens) {
      const previous = this.snapshots.get(token.id);
      if (!previous) {
        this.snapshots.set(token.id, await this.capture(token));
        continue;
      }

      const positionChanged = !sameVector(token.position, previous.position);
      const transformChanged = token.rotation !== previous.rotation ||
        !sameVector(token.scale, previous.scale);

      if (!positionChanged && !transformChanged) continue;

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
      const correctedSnapshot: TokenSnapshot = {
        ...current,
        position: correctedPosition,
        center: safeCenter,
      };

      // Update the snapshot before writing, so our own correction event does
      // not get interpreted as a fresh attempted move.
      this.snapshots.set(token.id, correctedSnapshot);

      try {
        await OBR.scene.items.updateItems(
          (item) => item.id === token.id,
          (drafts) => {
            for (const draft of drafts) draft.position = correctedPosition;
          },
        );
        logger.debug("Native-tool token movement corrected at wall boundary.", { itemId: token.id });
      } catch (error) {
        this.snapshots.set(token.id, previous);
        logger.warn("A token could not be returned to its last safe position.", { itemId: token.id, error });
      }
    }
  }
}
