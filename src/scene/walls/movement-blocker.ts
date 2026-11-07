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

function sameVector(a: Vector2, b: Vector2): boolean {
  return Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;
}

function sameScale(a: Vector2, b: Vector2): boolean {
  return sameVector(a, b);
}

/**
 * Enforces blocksMovement independently from Owlbear's native WALL.blocking
 * flag. Native WALL.blocking couples token and light collision, so Beholder
 * keeps that flag off and resolves token movement from the shared LINE source.
 *
 * Owlbear exposes committed scene-item changes rather than a cancellable
 * before-move hook. The guard therefore corrects the local mover's position
 * to the last safe point as soon as a moved token is reported by the scene.
 */
export class MovementBlocker {
  private readonly snapshots = new Map<string, TokenSnapshot>();
  private readonly unsubscribers: Array<() => void> = [];
  private playerId = "";
  private disposed = false;
  private processing = false;
  private pendingItems: SceneItem[] | null = null;
  private walls: WallSegment2D[] = [];

  async start(): Promise<void> {
    this.playerId = await OBR.player.getId();
    this.unsubscribers.push(
      OBR.scene.items.onChange((items) => this.enqueue(items)),
      OBR.scene.onReadyChange((ready) => {
        if (!ready) {
          this.snapshots.clear();
          this.walls = [];
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
      const scale = source.scale ?? { x: 1, y: 1 };
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
    let radius = 0;
    try {
      const bounds = await OBR.scene.items.getItemBounds([item.id]);
      center = { ...bounds.center };
      radius = Math.max(0, Math.min(bounds.width, bounds.height) / 2);
    } catch (error) {
      logger.debug("Token bounds unavailable; using center-point collision.", { itemId: item.id, error });
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

    this.walls = this.wallSegments(items);
    const tokens = items.filter((item) => item.layer === "CHARACTER" && item.type === "IMAGE");
    const presentIds = new Set(tokens.map((item) => item.id));
    for (const id of this.snapshots.keys()) {
      if (!presentIds.has(id)) this.snapshots.delete(id);
    }

    let localSelection: string[] | undefined;
    for (const token of tokens) {
      const previous = this.snapshots.get(token.id);
      if (!previous) {
        this.snapshots.set(token.id, await this.capture(token));
        continue;
      }

      const positionChanged = !sameVector(token.position, previous.position);
      const transformChanged = token.rotation !== previous.rotation || !sameScale(token.scale, previous.scale);
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

      if (!positionChanged) {
        this.snapshots.set(token.id, current);
        continue;
      }

      let movedByThisPlayer = token.lastModifiedUserId === this.playerId;
      if (!movedByThisPlayer && !token.lastModifiedUserId) {
        localSelection ??= await OBR.player.getSelection();
        movedByThisPlayer = localSelection?.includes(token.id) ?? false;
      }

      if (!movedByThisPlayer || this.walls.length === 0) {
        this.snapshots.set(token.id, current);
        continue;
      }

      const safeCenter = constrainMovement(previous.center, current.center, this.walls, current.radius);
      if (!safeCenter) {
        this.snapshots.set(token.id, current);
        continue;
      }

      const correctedPosition = {
        x: token.position.x + safeCenter.x - current.center.x,
        y: token.position.y + safeCenter.y - current.center.y,
      };
      this.snapshots.set(token.id, {
        ...current,
        position: correctedPosition,
        center: safeCenter,
      });

      try {
        await OBR.scene.items.updateItems([token.id], (drafts) => {
          for (const draft of drafts) draft.position = correctedPosition;
        });
      } catch (error) {
        this.snapshots.set(token.id, previous);
        logger.warn("A token could not be returned to its last safe position.", { itemId: token.id, error });
      }
    }
  }
}
