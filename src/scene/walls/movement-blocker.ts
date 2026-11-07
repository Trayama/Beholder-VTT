import { OBR } from "../../platform/obr.js";
import type { LineItem, SceneItem, Vector2 } from "../../platform/obr.js";
import { logger } from "../../core/logger.js";
import { constrainMovement, transformPoint } from "./geometry.js";
import type { WallSegment2D } from "./geometry.js";
import { isWallSource, readWallSourceMetadata } from "./model.js";

interface TokenSnapshot {
  position: Vector2;
  center: Vector2;
  centerOffset: Vector2;
  radius: number;
  rotation: number;
  scale: Vector2;
}

const ZERO: Vector2 = { x: 0, y: 0 };
const UNIT: Vector2 = { x: 1, y: 1 };

function sameVector(a: Vector2, b: Vector2): boolean {
  return Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;
}

function isMovableToken(item: SceneItem): boolean {
  return item.type === "IMAGE" && (item.layer === "CHARACTER" || item.layer === "MOUNT");
}

/**
 * Independent movement collision.
 *
 * Only the GM client is authoritative. Owlbear's scene item change event
 * includes the full scene after a committed move, so the GM compares token
 * positions with the previous safe snapshot and corrects crossings from the
 * shared LINE wall geometry.
 *
 * This is deliberately separate from native WALL.blocking: that native flag
 * also affects light collision. Beholder keeps movement, vision and light
 * properties independent. The correction happens after Owlbear commits the
 * drag, so clients may see a brief snap-back; the SDK has no global
 * cancellable before-move hook for the native Select tool.
 */
export class MovementBlocker {
  private readonly snapshots = new Map<string, TokenSnapshot>();
  private readonly unsubscribers: Array<() => void> = [];
  private disposed = false;
  private processing = false;
  private pendingItems: SceneItem[] | null = null;

  async start(): Promise<void> {
    const role = await OBR.player.getRole();
    if (role !== "GM") {
      logger.info("Movement collision is enforced by the GM client.");
      return;
    }

    this.unsubscribers.push(
      OBR.scene.items.onChange((items) => this.enqueue(items)),
      OBR.scene.onReadyChange((ready) => {
        if (!ready) {
          this.snapshots.clear();
          this.pendingItems = null;
          return;
        }
        void OBR.scene.items.getItems().then((items) => this.enqueue(items)).catch((error) => {
          logger.warn("Could not initialize wall movement snapshots.", error);
        });
      }),
    );

    if (await OBR.scene.isReady()) {
      this.enqueue(await OBR.scene.items.getItems());
    }
  }

  stop(): void {
    this.disposed = true;
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

  private enqueue(items: SceneItem[]): void {
    if (this.disposed) return;
    this.pendingItems = items;
    if (!this.processing) void this.drain();
  }

  private async drain(): Promise<void> {
    if (this.processing || this.disposed) return;
    this.processing = true;
    try {
      while (this.pendingItems && !this.disposed) {
        const items = this.pendingItems;
        this.pendingItems = null;
        await this.process(items);
      }
    } finally {
      this.processing = false;
      if (this.pendingItems && !this.disposed) void this.drain();
    }
  }

  private wallSegments(items: SceneItem[]): WallSegment2D[] {
    const sources = items.filter(isWallSource) as LineItem[];
    return sources.flatMap((source) => {
      const metadata = readWallSourceMetadata(source);
      if (!metadata?.blocking.blocksMovement) return [];
      const position = source.position ?? ZERO;
      const scale = source.scale ?? UNIT;
      const rotation = source.rotation ?? 0;
      return [{
        start: transformPoint(source.startPosition, position, rotation, scale),
        end: transformPoint(source.endPosition, position, rotation, scale),
      }];
    });
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

    const walls = this.wallSegments(items);
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
        logger.debug("Token movement corrected at wall boundary.", { itemId: token.id });
      } catch (error) {
        this.snapshots.set(token.id, previous);
        logger.warn("A token could not be returned to its last safe position.", { itemId: token.id, error });
      }
    }
  }
}
