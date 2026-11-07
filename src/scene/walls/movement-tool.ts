import { OBR } from "../../platform/obr.js";
import type { ItemInteractionUpdate, SceneItem, ToolEvent, Vector2 } from "../../platform/obr.js";
import { logger } from "../../core/logger.js";
import { constrainMovement } from "./geometry.js";
import type { WallSegment2D } from "./geometry.js";
import { getMovementWallSegments } from "./collision.js";
import { isMovableToken, isWallSource } from "./model.js";

const TOOL_ID = "com.beholder-vtt/token-movement";
const MOVE_MODE_ID = TOOL_ID + "/move";
const FALLBACK_RADIUS = 18;

interface MovementSession {
  item: SceneItem;
  startPointer: Vector2;
  startPosition: Vector2;
  centerOffset: Vector2;
  radius: number;
  walls: WallSegment2D[];
  currentPosition: Vector2;
  currentCenter: Vector2;
  update: ItemInteractionUpdate;
  stop: () => void;
  blocked: boolean;
}

/**
 * Real-time wall-aware token movement.
 *
 * This is an explicit Owlbear tool rather than an override of Owlbear's native
 * Select tool. It uses the Interaction API for high-frequency local movement,
 * constraining every proposed position against the shared LINE wall geometry.
 * The GM-side MovementBlocker remains as a fallback for native-tool movement.
 */
export class TokenMovementTool {
  private registered = false;
  private session: MovementSession | null = null;
  private generation = 0;
  private starting = false;
  private pendingPointer: Vector2 | null = null;
  private pendingFinish = false;

  async start(): Promise<void> {
    if (this.registered) return;
    const icon = new URL("./icons/move-token.svg", window.location.href).toString();

    try {
      await OBR.tool.create({
        id: TOOL_ID,
        icons: [{ icon, label: "Beholder VTT · 墙体感知移动" }],
        defaultMode: MOVE_MODE_ID,
      });

      await OBR.tool.createMode({
        id: MOVE_MODE_ID,
        icons: [{
          icon,
          label: "拖动角色 Token（实时避开移动阻挡墙体）",
          filter: { activeTools: [TOOL_ID] },
        }],
        cursors: [{ cursor: "grab" }],
        onToolDragStart: (_context, event) => this.begin(event),
        onToolDragMove: (_context, event) => this.move(event.pointerPosition),
        onToolDragEnd: (_context, event) => this.end(event.pointerPosition),
        onToolDragCancel: () => this.cancel(),
        onDeactivate: () => this.cancel(),
      });

      this.registered = true;
      logger.info("Wall-aware token movement tool registered.");
    } catch (error) {
      try { await OBR.tool.removeMode(MOVE_MODE_ID); } catch { /* not registered */ }
      try { await OBR.tool.remove(TOOL_ID); } catch { /* not registered */ }
      logger.error("Wall-aware token movement tool registration failed.", error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.cancel();
    if (!this.registered) return;
    try { await OBR.tool.removeMode(MOVE_MODE_ID); } catch { /* already removed */ }
    try { await OBR.tool.remove(TOOL_ID); } catch { /* already removed */ }
    this.registered = false;
  }

  private begin(event: ToolEvent): void {
    this.cancel();
    const item = event.target;
    if (!item || !isMovableToken(item) || item.locked) return;

    const generation = this.generation;
    this.starting = true;
    this.pendingPointer = { ...event.pointerPosition };
    this.pendingFinish = false;

    void this.prepareSession(item, event.pointerPosition).then((session) => {
      if (generation !== this.generation) {
        session?.stop();
        return;
      }
      this.starting = false;
      if (!session) return;

      this.session = session;
      if (this.pendingPointer) this.applyPointer(this.pendingPointer);
      if (this.pendingFinish) void this.finish();
    }).catch((error: unknown) => {
      if (generation !== this.generation) return;
      this.starting = false;
      logger.warn("Could not start wall-aware token movement.", { itemId: item.id, error });
    });
  }

  private async prepareSession(item: SceneItem, pointer: Vector2): Promise<MovementSession | null> {
    const latestItems = await OBR.scene.items.getItems([item.id]);
    const current = latestItems[0];
    if (!current || !isMovableToken(current) || current.locked) return null;

    const [sources, bounds] = await Promise.all([
      OBR.scene.items.getItems(isWallSource),
      OBR.scene.items.getItemBounds([current.id]).catch((error: unknown) => {
        logger.debug("Token bounds unavailable; using fallback movement radius.", { itemId: current.id, error });
        return null;
      }),
    ]);

    const center = bounds?.center ?? { ...current.position };
    const measuredRadius = bounds ? Math.min(bounds.width, bounds.height) * 0.4 : FALLBACK_RADIUS;
    const radius = Number.isFinite(measuredRadius) && measuredRadius >= 2
      ? measuredRadius
      : FALLBACK_RADIUS;
    const [update, stop] = await OBR.interaction.startItemInteraction(current);

    return {
      item: current,
      startPointer: { ...pointer },
      startPosition: { ...current.position },
      centerOffset: {
        x: center.x - current.position.x,
        y: center.y - current.position.y,
      },
      radius,
      walls: getMovementWallSegments(sources),
      currentPosition: { ...current.position },
      currentCenter: { ...center },
      update,
      stop,
      blocked: false,
    };
  }

  private move(pointer: Vector2): void {
    if (!this.session && this.starting) {
      this.pendingPointer = { ...pointer };
      return;
    }
    if (this.session) this.applyPointer(pointer);
  }

  private applyPointer(pointer: Vector2): void {
    const session = this.session;
    if (!session) return;

    const delta = {
      x: pointer.x - session.startPointer.x,
      y: pointer.y - session.startPointer.y,
    };
    const desiredPosition = {
      x: session.startPosition.x + delta.x,
      y: session.startPosition.y + delta.y,
    };
    const desiredCenter = {
      x: desiredPosition.x + session.centerOffset.x,
      y: desiredPosition.y + session.centerOffset.y,
    };
    const constrained = constrainMovement(
      session.currentCenter,
      desiredCenter,
      session.walls,
      session.radius,
    );
    const nextCenter = constrained ?? desiredCenter;
    const nextPosition = {
      x: nextCenter.x - session.centerOffset.x,
      y: nextCenter.y - session.centerOffset.y,
    };

    if (constrained) session.blocked = true;
    if (Math.abs(nextPosition.x - session.currentPosition.x) < 0.001 &&
        Math.abs(nextPosition.y - session.currentPosition.y) < 0.001) {
      return;
    }

    try {
      session.update((draft) => {
        draft.position = nextPosition;
      });
      session.currentPosition = nextPosition;
      session.currentCenter = nextCenter;
    } catch (error) {
      logger.warn("Wall-aware token movement update failed.", { itemId: session.item.id, error });
      this.cancel();
    }
  }

  private end(pointer: Vector2): void {
    if (this.session) {
      this.applyPointer(pointer);
      void this.finish();
      return;
    }
    if (this.starting) {
      this.pendingPointer = { ...pointer };
      this.pendingFinish = true;
    }
  }

  private async finish(): Promise<void> {
    const session = this.session;
    if (!session) return;
    this.session = null;
    this.pendingPointer = null;
    this.pendingFinish = false;

    try {
      session.stop();
      await OBR.scene.items.updateItems([session.item], (drafts) => {
        for (const draft of drafts) draft.position = { ...session.currentPosition };
      });
      logger.debug("Wall-aware token movement committed.", {
        itemId: session.item.id,
        blockedByWall: session.blocked,
      });
    } catch (error) {
      logger.warn("Could not commit wall-aware token movement.", { itemId: session.item.id, error });
    }
  }

  private cancel(): void {
    this.generation += 1;
    this.starting = false;
    this.pendingPointer = null;
    this.pendingFinish = false;

    const session = this.session;
    this.session = null;
    if (session) void this.restore(session);
  }

  private async restore(session: MovementSession): Promise<void> {
    try {
      session.update((draft) => {
        draft.position = { ...session.startPosition };
      });
      session.stop();
      await OBR.scene.items.updateItems([session.item], (drafts) => {
        for (const draft of drafts) draft.position = { ...session.startPosition };
      });
    } catch (error) {
      logger.warn("Could not cancel wall-aware token movement.", { itemId: session.item.id, error });
    }
  }
}
