import { OBR } from "../../platform/obr.js";
import type { ItemInteractionUpdate, SceneItem, ToolEvent, Vector2 } from "../../platform/obr.js";
import { logger } from "../../core/logger.js";
import { PREFERENCES, readBooleanPreference } from "../../core/preferences.js";
import { constrainGroupDelta } from "./geometry.js";
import type { MovementFootprint, WallSegment2D } from "./geometry.js";
import { getMovementWallSegments } from "./collision.js";
import {
  createWallAwareMoveMarker,
  isLocalGuide,
  isLocalWall,
  isMovableToken,
  isWallSource,
  WALL_AWARE_MOVE_KEY,
} from "./model.js";
import { isNativeMoveTool, NATIVE_MOVE_TOOL_ID } from "./movement-tool-utils.js";

const TOOL_ID = "com.beholder-vtt/token-movement";
const MOVE_MODE_ID = TOOL_ID + "/move";
const SETTINGS_ACTION_ID = TOOL_ID + "/settings";
const SETTINGS_POPOVER_ID = "com.beholder-vtt/movement-settings";
const FALLBACK_RADIUS = 18;
const MARQUEE_BATCH_SIZE = 20;

interface MoveSession {
  items: SceneItem[];
  lastPointer: Vector2;
  originalPositions: Map<string, Vector2>;
  currentPositions: Map<string, Vector2>;
  footprints: MovementFootprint[];
  walls: WallSegment2D[];
  update: ItemInteractionUpdate<SceneItem[]>;
  stop: () => void;
  blocked: boolean;
}

interface SelectionRectangle {
  min: Vector2;
  max: Vector2;
}

function isSelectableItem(item: SceneItem): boolean {
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

function makeSelectionRectangle(start: Vector2, end: Vector2): SelectionRectangle {
  return {
    min: { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y) },
    max: { x: Math.max(start.x, end.x), y: Math.max(start.y, end.y) },
  };
}

function intersects(a: SelectionRectangle, min: Vector2, max: Vector2): boolean {
  return max.x >= a.min.x && min.x <= a.max.x &&
    max.y >= a.min.y && min.y <= a.max.y;
}

/**
 * Beholder's primary Select + Move tool.
 *
 * CHARACTER/MOUNT drags use real-time wall collision. Other scene-item drags
 * are explicitly handed back to Owlbear's built-in default drag behavior via
 * preventDrag. Empty-space drags perform a local marquee selection.
 */
export class TokenMovementTool {
  private registered = false;
  private session: MoveSession | null = null;
  private generation = 0;
  private starting = false;
  private pendingPointer: Vector2 | null = null;
  private pendingFinish = false;
  private marqueeStart: Vector2 | null = null;
  private marqueeAdditive = false;
  private groupMovement = true;
  private takeoverNativeMove = true;
  private redirecting = false;
  private storageHandler: ((event: StorageEvent) => void) | null = null;
  private unsubscribeTool: (() => void) | null = null;

  async start(): Promise<void> {
    if (this.registered) return;
    this.groupMovement = readBooleanPreference(PREFERENCES.groupMovement, true);
    this.takeoverNativeMove = readBooleanPreference(PREFERENCES.movementTakeover, true);

    const icon = new URL("./icons/move-token.svg", window.location.href).toString();
    const settingsIcon = new URL("./icons/settings.svg", window.location.href).toString();

    try {
      await OBR.tool.create({
        id: TOOL_ID,
        icons: [{ icon, label: "Beholder VTT · 选择与移动（墙体感知）" }],
        defaultMode: MOVE_MODE_ID,
      });

      await OBR.tool.createMode({
        id: MOVE_MODE_ID,
        icons: [{
          icon,
          label: "选择与移动：角色 Token 实时碰撞，其他对象沿用 Owlbear 默认拖动",
          filter: { activeTools: [TOOL_ID] },
        }],
        cursors: [{ cursor: "grab" }],
        preventDrag: {
          target: [
            { key: "layer", value: "CHARACTER", operator: "!=", coordinator: "&&" },
            { key: "layer", value: "MOUNT", operator: "!=", coordinator: "&&" },
          ],
        },
        onToolClick: (_context, event) => this.handleClick(event),
        onToolDragStart: (_context, event) => this.begin(event),
        onToolDragMove: (_context, event) => this.move(event.pointerPosition),
        onToolDragEnd: (_context, event) => this.end(event),
        onToolDragCancel: () => this.cancel(),
        onDeactivate: () => this.cancel(),
      });

      await OBR.tool.createAction({
        id: SETTINGS_ACTION_ID,
        icons: [{
          icon: settingsIcon,
          label: "移动工具设置",
          filter: { activeTools: [TOOL_ID] },
        }],
        onClick: async (_context, elementId) => {
          await OBR.popover.open({
            id: SETTINGS_POPOVER_ID,
            url: new URL("./movement-settings.html", window.location.href).toString(),
            width: 330,
            height: 300,
            anchorElementId: elementId,
          });
        },
      });

      this.registered = true;
      this.storageHandler = (event) => this.handleStorageChange(event);
      window.addEventListener("storage", this.storageHandler);
      this.unsubscribeTool = OBR.tool.onToolChange((toolId) => this.handleToolChange(toolId));

      logger.info("Beholder Select + Move tool registered.", {
        groupMovement: this.groupMovement,
        takeoverNativeMove: this.takeoverNativeMove,
      });

      await this.enforceNativeMoveTakeover();
    } catch (error) {
      await this.removeRegistrations();
      logger.error("Beholder Select + Move tool registration failed.", error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.cancel();
    if (this.storageHandler) window.removeEventListener("storage", this.storageHandler);
    this.storageHandler = null;
    this.unsubscribeTool?.();
    this.unsubscribeTool = null;
    await this.removeRegistrations();
  }

  private async removeRegistrations(): Promise<void> {
    try { await OBR.tool.removeAction(SETTINGS_ACTION_ID); } catch { /* not registered */ }
    try { await OBR.tool.removeMode(MOVE_MODE_ID); } catch { /* not registered */ }
    try { await OBR.tool.remove(TOOL_ID); } catch { /* not registered */ }
    this.registered = false;
  }

  private handleStorageChange(event: StorageEvent): void {
    if (event.key === PREFERENCES.groupMovement) {
      this.groupMovement = event.newValue !== "false";
    } else if (event.key === PREFERENCES.movementTakeover) {
      this.takeoverNativeMove = event.newValue !== "false";
      if (this.takeoverNativeMove) void this.enforceNativeMoveTakeover();
    }
  }

  private handleToolChange(toolId: string): void {
    if (isNativeMoveTool(toolId) && this.takeoverNativeMove) {
      this.cancel();
      void this.redirectNativeMove();
      return;
    }
    if (toolId !== TOOL_ID) this.cancel();
  }

  private async enforceNativeMoveTakeover(): Promise<void> {
    if (!this.registered || !this.takeoverNativeMove) return;
    const activeTool = await OBR.tool.getActiveTool().catch(() => "");
    if (isNativeMoveTool(activeTool)) await this.redirectNativeMove();
  }

  private async redirectNativeMove(): Promise<void> {
    if (!this.registered || this.redirecting || !this.takeoverNativeMove) return;
    this.redirecting = true;
    try {
      await OBR.tool.activateTool(TOOL_ID);
      logger.debug("Owlbear native Move selection redirected to Beholder.");
    } catch (error) {
      logger.warn("Could not redirect Owlbear native Move to Beholder.", {
        nativeToolId: NATIVE_MOVE_TOOL_ID,
        error,
      });
    } finally {
      this.redirecting = false;
    }
  }

  private async handleClick(event: ToolEvent): Promise<boolean> {
    const target = event.target;
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;

    if (!target) {
      if (!additive) await OBR.player.deselect();
      return false;
    }
    if (target.locked) return false;

    if (additive) {
      const selection = await OBR.player.getSelection() ?? [];
      if (selection.includes(target.id)) {
        await OBR.player.deselect([target.id]);
      } else {
        await OBR.player.select([target.id], false);
      }
    } else {
      await OBR.player.select([target.id], true);
    }
    return false;
  }

  private begin(event: ToolEvent): void {
    if (!event.target) {
      this.marqueeStart = { ...event.pointerPosition };
      this.marqueeAdditive = event.shiftKey || event.ctrlKey || event.metaKey;
      return;
    }

    this.marqueeStart = null;
    if (event.transformer) return;

    const target = event.target;
    if (!isMovableToken(target) || target.locked) return;
    if (this.starting || this.session) this.cancel();

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
      if (!session) return;
      this.session = session;
      if (this.pendingPointer) this.applyPointer(this.pendingPointer);
      if (this.pendingFinish) void this.finish();
    }).catch((error: unknown) => {
      if (generation !== this.generation) return;
      this.starting = false;
      logger.warn("Could not start Beholder wall-aware movement.", {
        itemId: target.id,
        error,
      });
    });
  }

  private async prepareSession(target: SceneItem, pointer: Vector2): Promise<MoveSession | null> {
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
    const items = sceneItems.filter((item) =>
      !item.locked && !isWallSource(item) && !isLocalWall(item) && !isLocalGuide(item)
    );
    if (!items.some((item) => item.id === target.id)) return null;

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
      } catch (error) {
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

  private move(pointer: Vector2): void {
    if (!this.session && this.starting) {
      this.pendingPointer = { ...pointer };
      return;
    }
    if (this.session) {
      this.applyPointer(pointer);
    }
  }

  private applyPointer(pointer: Vector2): void {
    const session = this.session;
    if (!session) return;

    const requestedDelta = {
      x: pointer.x - session.lastPointer.x,
      y: pointer.y - session.lastPointer.y,
    };
    session.lastPointer = { ...pointer };

    const allowedDelta = constrainGroupDelta(
      requestedDelta,
      session.footprints,
      session.walls,
    );

    if (Math.abs(allowedDelta.x - requestedDelta.x) > 0.001 ||
        Math.abs(allowedDelta.y - requestedDelta.y) > 0.001) {
      session.blocked = true;
    }
    if (Math.abs(allowedDelta.x) < 0.001 && Math.abs(allowedDelta.y) < 0.001) return;

    try {
      session.update((drafts) => {
        for (const draft of drafts) {
          const current = session.currentPositions.get(draft.id);
          if (!current) continue;
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
    } catch (error) {
      logger.warn("Beholder movement update failed.", error);
      this.cancel();
    }
  }

  private end(event: ToolEvent): void {
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

  private async finishMarquee(start: Vector2, end: Vector2, additive: boolean): Promise<void> {
    const rectangle = makeSelectionRectangle(start, end);
    if (rectangle.max.x - rectangle.min.x < 3 && rectangle.max.y - rectangle.min.y < 3) return;

    try {
      const candidates = (await OBR.scene.items.getItems()).filter(isSelectableItem);
      const hits: string[] = [];

      for (let index = 0; index < candidates.length; index += MARQUEE_BATCH_SIZE) {
        const batch = candidates.slice(index, index + MARQUEE_BATCH_SIZE);
        const results = await Promise.all(batch.map(async (item) => {
          try {
            const bounds = await OBR.scene.items.getItemBounds([item.id]);
            return intersects(rectangle, bounds.min, bounds.max) ? item.id : null;
          } catch {
            return null;
          }
        }));
        for (const id of results) if (id) hits.push(id);
      }

      if (additive) {
        const existing = await OBR.player.getSelection() ?? [];
        const combined = [...new Set([...existing, ...hits])];
        if (combined.length) await OBR.player.select(combined, true);
      } else if (hits.length) {
        await OBR.player.select(hits, true);
      } else {
        await OBR.player.deselect();
      }
    } catch (error) {
      logger.warn("Beholder marquee selection failed.", error);
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
      await OBR.scene.items.updateItems(session.items, (drafts) => {
        for (const draft of drafts) {
          const position = session.currentPositions.get(draft.id);
          if (position) draft.position = { ...position };
          if (isMovableToken(draft)) {
            draft.metadata[WALL_AWARE_MOVE_KEY] = createWallAwareMoveMarker();
          }
        }
      });
      logger.debug("Beholder group movement committed.", {
        itemIds: session.items.map((item) => item.id),
        blockedByWall: session.blocked,
      });
    } catch (error) {
      logger.warn("Could not commit Beholder movement.", error);
    }
  }

  private cancel(): void {
    this.generation += 1;
    this.starting = false;
    this.pendingPointer = null;
    this.pendingFinish = false;
    this.marqueeStart = null;

    const session = this.session;
    this.session = null;
    if (session) void this.restore(session);
  }

  private async restore(session: MoveSession): Promise<void> {
    try {
      session.update((drafts) => {
        for (const draft of drafts) {
          const position = session.originalPositions.get(draft.id);
          if (position) draft.position = { ...position };
        }
      });
      session.stop();
      await OBR.scene.items.updateItems(session.items, (drafts) => {
        for (const draft of drafts) {
          const position = session.originalPositions.get(draft.id);
          if (position) draft.position = { ...position };
        }
      });
    } catch (error) {
      logger.warn("Could not cancel Beholder movement.", error);
    }
  }
}
