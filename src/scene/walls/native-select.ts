import { OBR } from "../../platform/obr.js";
import type { ItemInteractionUpdate, SceneItem, ToolEvent, Vector2 } from "../../platform/obr.js";
import { logger } from "../../core/logger.js";
import { PREFERENCES, readStringPreference } from "../../core/preferences.js";
import { constrainGroupDelta, type MovementFootprint, type WallSegment2D } from "./geometry.js";
import { getMovementWallSegments } from "./collision.js";
import {
  createWallAwareMoveMarker,
  isMovableToken,
  isWallSource,
  WALL_AWARE_MOVE_KEY,
} from "./model.js";

const COLLISION_MODE_ID = "com.beholder-vtt/native-select-collision";
const PASSTHROUGH_MODE_ID = "com.beholder-vtt/native-select-passthrough";
const HIDDEN_TOOL_FILTER_ID = "com.beholder-vtt/internal-mode-host";
const FALLBACK_RADIUS = 18;
const BUILTIN_TOOL_PREFIX = "rodeo.owlbear.tools/";

interface MoveSession {
  items: SceneItem[];
  startPointer: Vector2;
  lastPointer: Vector2;
  originalPositions: Map<string, Vector2>;
  currentPositions: Map<string, Vector2>;
  footprints: MovementFootprint[];
  walls: WallSegment2D[];
  update: ItemInteractionUpdate<SceneItem[]>;
  stop: () => void;
  blocked: boolean;
}

function sameVector(a: Vector2, b: Vector2): boolean {
  return Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;
}

export function isLikelyNativeSelectTool(toolId: string): boolean {
  return /(^|\/)select$/i.test(toolId);
}

/**
 * Bridges Beholder wall-aware movement into the currently bound Owlbear
 * native Select tool. Binding is local to each client and can be set from
 * the Beholder control panel.
 *
 * The collision mode owns normal CHARACTER/MOUNT drags. Before other pointer
 * gestures begin, it switches to an invisible pass-through mode so Owlbear
 * retains native prop/map movement, marquee selection and transformer handles.
 */
export class NativeSelectIntegration {
  private boundToolId = "";
  private registered = false;
  private switchingMode = false;
  private starting = false;
  private generation = 0;
  private session: MoveSession | null = null;
  private pendingPointer: Vector2 | null = null;
  private pendingFinish = false;
  private storageHandler: ((event: StorageEvent) => void) | null = null;
  private unsubscribeTool: (() => void) | null = null;

  async start(): Promise<void> {
    this.boundToolId = readStringPreference(PREFERENCES.selectToolId, "");
    this.storageHandler = (event) => {
      if (event.key === PREFERENCES.selectToolId) void this.refreshBinding();
    };
    window.addEventListener("storage", this.storageHandler);
    this.unsubscribeTool = OBR.tool.onToolChange((toolId) => {
      if (toolId === this.boundToolId) {
        void this.activateCollisionMode();
      } else {
        this.cancel();
      }
    });

    if (!this.boundToolId) {
      const activeTool = await OBR.tool.getActiveTool().catch(() => "");
      if (isLikelyNativeSelectTool(activeTool)) {
        this.boundToolId = activeTool;
        logger.info("Detected Owlbear native Select tool automatically.", { toolId: activeTool });
      }
    }

    if (this.boundToolId) {
      await this.registerModes();
      const activeTool = await OBR.tool.getActiveTool().catch(() => "");
      if (activeTool === this.boundToolId) await this.activateCollisionMode();
    } else {
      logger.info("Native Select integration is waiting for a local tool binding.");
    }
  }

  async stop(): Promise<void> {
    this.cancel();
    if (this.storageHandler) window.removeEventListener("storage", this.storageHandler);
    this.storageHandler = null;
    this.unsubscribeTool?.();
    this.unsubscribeTool = null;
    await this.removeModes();
  }

  private async refreshBinding(): Promise<void> {
    const next = readStringPreference(PREFERENCES.selectToolId, "");
    if (next === this.boundToolId) return;

    this.cancel();
    await this.removeModes();
    this.boundToolId = next;

    if (!this.boundToolId) {
      logger.info("Native Select integration unbound.");
      return;
    }

    await this.registerModes();
    const activeTool = await OBR.tool.getActiveTool().catch(() => "");
    if (activeTool === this.boundToolId) await this.activateCollisionMode();
  }

  private async registerModes(): Promise<void> {
    if (!this.boundToolId || this.registered) return;
    const icon = new URL("./icons/select.svg", window.location.href).toString();

    try {
      await OBR.tool.createMode({
        id: COLLISION_MODE_ID,
        icons: [{
          icon,
          label: "Beholder VTT · 原生选择（墙体感知移动）",
          filter: { activeTools: [this.boundToolId] },
        }],
        preventDrag: {
          target: [
            { key: "layer", value: "CHARACTER", operator: "!=", coordinator: "&&" },
            { key: "layer", value: "MOUNT", operator: "!=", coordinator: "&&" },
          ],
        },
        onToolDown: (_context, event) => this.handlePointerDown(event),
        onToolClick: (_context, event) => this.handleClick(event),
        onToolDragStart: (_context, event) => this.begin(event),
        onToolDragMove: (_context, event) => this.move(event.pointerPosition),
        onToolDragEnd: (_context, event) => this.end(event.pointerPosition),
        onToolDragCancel: () => this.cancel(),
        onDeactivate: () => this.cancel(),
      });

      // This mode is deliberately hidden from the toolbar. It temporarily
      // delegates gestures that are not token movement back to Owlbear's
      // native drag implementation.
      await OBR.tool.createMode({
        id: PASSTHROUGH_MODE_ID,
        icons: [{
          icon,
          label: "Beholder VTT · 原生交互委托",
          filter: { activeTools: [HIDDEN_TOOL_FILTER_ID] },
        }],
        preventDrag: {},
        onToolClick: (_context, event) => this.handleClick(event),
        onToolUp: () => this.returnToCollisionMode(),
        onToolDragEnd: () => this.returnToCollisionMode(),
        onToolDragCancel: () => this.returnToCollisionMode(),
      });

      this.registered = true;
      logger.info("Native Select wall-aware mode registered.", { toolId: this.boundToolId });
    } catch (error) {
      await this.removeModes();
      logger.warn("Native Select mode registration failed; standalone movement remains available.", error);
    }
  }

  private async removeModes(): Promise<void> {
    try { await OBR.tool.removeMode(PASSTHROUGH_MODE_ID); } catch { /* not registered */ }
    try { await OBR.tool.removeMode(COLLISION_MODE_ID); } catch { /* not registered */ }
    this.registered = false;
  }

  private async activateCollisionMode(): Promise<void> {
    if (!this.boundToolId || !this.registered || this.switchingMode) return;
    this.switchingMode = true;
    try {
      const activeMode = await OBR.tool.getActiveToolMode();
      if (activeMode !== COLLISION_MODE_ID) {
        await OBR.tool.activateMode(this.boundToolId, COLLISION_MODE_ID);
      }
    } catch (error) {
      logger.warn("Could not activate Beholder's native Select mode.", {
        toolId: this.boundToolId,
        error,
      });
    } finally {
      this.switchingMode = false;
    }
  }

  private async activatePassthroughMode(): Promise<void> {
    if (!this.boundToolId || !this.registered || this.switchingMode) return;
    this.switchingMode = true;
    try {
      await OBR.tool.activateMode(this.boundToolId, PASSTHROUGH_MODE_ID);
    } catch (error) {
      logger.warn("Could not delegate this gesture to Owlbear's native interaction.", error);
    } finally {
      this.switchingMode = false;
    }
  }

  private async returnToCollisionMode(): Promise<void> {
    this.generation += 1;
    this.starting = false;
    this.pendingPointer = null;
    this.pendingFinish = false;
    const activeTool = await OBR.tool.getActiveTool().catch(() => "");
    if (activeTool === this.boundToolId) await this.activateCollisionMode();
  }

  private async handlePointerDown(event: ToolEvent): Promise<void> {
    const target = event.target;
    const shouldUseNative =
      event.transformer === true ||
      !target ||
      !isMovableToken(target) ||
      target.locked;

    if (shouldUseNative) {
      this.cancel();
      await this.activatePassthroughMode();
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
    const target = event.target;
    if (this.starting || this.session) this.cancel();
    if (!target || !isMovableToken(target) || target.locked || event.transformer) return;

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
      logger.warn("Could not start native Select wall-aware movement.", {
        itemId: target.id,
        error,
      });
    });
  }

  private async prepareSession(target: SceneItem, pointer: Vector2): Promise<MoveSession | null> {
    const selectedIds = await OBR.player.getSelection() ?? [];
    const movingIds = selectedIds.includes(target.id) ? selectedIds : [target.id];
    if (!selectedIds.includes(target.id)) {
      await OBR.player.select([target.id], true);
    }

    const [sceneItems, sourceItems] = await Promise.all([
      OBR.scene.items.getItems(movingIds),
      OBR.scene.items.getItems(isWallSource),
    ]);
    const items = sceneItems.filter((item) => !item.locked);
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
        logger.debug("Selected token bounds unavailable; using fallback footprint.", {
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
      startPointer: { ...pointer },
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
    if (this.session) this.applyPointer(pointer);
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
      logger.warn("Native Select wall-aware movement update failed.", error);
      this.cancel();
    }
  }

  private end(pointer: Vector2): void {
    if (this.session) {
      this.applyPointer(pointer);
      void this.finish();
    } else if (this.starting) {
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
      await OBR.scene.items.updateItems(session.items, (drafts) => {
        for (const draft of drafts) {
          const position = session.currentPositions.get(draft.id);
          if (position) draft.position = { ...position };
          if (isMovableToken(draft)) {
            draft.metadata[WALL_AWARE_MOVE_KEY] = createWallAwareMoveMarker();
          }
        }
      });
      logger.debug("Native Select group movement committed.", {
        itemIds: session.items.map((item) => item.id),
        blockedByWall: session.blocked,
      });
    } catch (error) {
      logger.warn("Could not commit native Select wall-aware movement.", error);
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
      logger.warn("Could not cancel native Select wall-aware movement.", error);
    }
  }
}
