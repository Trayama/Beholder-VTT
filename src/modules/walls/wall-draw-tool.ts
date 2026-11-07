import { OBR, buildLine } from "../../platform/obr.js";
import type { ToolEvent, Vector2 } from "../../platform/obr.js";
import { logger } from "../../core/logger.js";
import { requireGM } from "../../core/permissions.js";
import { createWallSource } from "../../scene/walls/source.js";
import { isLocalWall, readLocalWallMetadata } from "../../scene/walls/model.js";
import type { WallReconciler } from "../../scene/walls/reconciler.js";

const TOOL_ID = "com.beholder-vtt/wall-editor";
const DRAW_MODE_ID = "com.beholder-vtt/wall-draw";
const PREVIEW_KEY = "com.beholder-vtt/wall-preview";
const ZERO: Vector2 = { x: 0, y: 0 };
const UNIT: Vector2 = { x: 1, y: 1 };

export class WallDrawTool {
  private dragStart: Vector2 | null = null;
  private previewId: string | null = null;
  private readonly reconciler: WallReconciler;
  private readonly iconUrl: string;

  constructor(reconciler: WallReconciler) {
    this.reconciler = reconciler;
    this.iconUrl = new URL("./icon.svg", window.location.href).toString();
  }

  async start(): Promise<void> {
    // Tool registrations can outlive a background iframe reload in Owlbear.
    // Remove our own previous registrations first so startup is idempotent.
    try { await OBR.tool.removeMode(DRAW_MODE_ID); } catch { /* not registered yet */ }
    try { await OBR.tool.remove(TOOL_ID); } catch { /* not registered yet */ }

    // Register the toolbar tool before its mode. Do not set defaultMode here:
    // Owlbear's documented custom-tool flow creates the tool first, then its
    // mode; a single available mode is activated without a separate mode icon.
    await OBR.tool.create({
      id: TOOL_ID,
      icons: [{
        icon: this.iconUrl,
        label: "Beholder VTT · 墙体工具",
        filter: { roles: ["GM"] },
      }],
    });
    logger.info("Wall toolbar tool created.", { iconUrl: this.iconUrl });

    await OBR.tool.createMode({
      id: DRAW_MODE_ID,
      icons: [{
        icon: this.iconUrl,
        label: "拖动绘制墙体",
        filter: { activeTools: [TOOL_ID], roles: ["GM"] },
      }],
      disabled: { roles: ["PLAYER"] },
      cursors: [{ cursor: "crosshair" }],
      onToolDragStart: async (_context, event) => this.handleDragStart(event),
      onToolDragMove: async (_context, event) => this.handleDragMove(event),
      onToolDragEnd: async (_context, event) => this.handleDragEnd(event),
      onToolDragCancel: async () => this.cancelDrag(),
      onDeactivate: async () => this.cancelDrag(),
    });

    logger.info("Wall draw mode registered.");
    await OBR.notification.show("Beholder VTT：墙体工具已注册到右侧工具栏。", "SUCCESS");
  }

  async stop(): Promise<void> {
    await this.cancelDrag();
    try { await OBR.tool.removeMode(DRAW_MODE_ID); } catch { /* not registered */ }
    try { await OBR.tool.remove(TOOL_ID); } catch { /* not registered */ }
  }

  private async snap(point: Vector2): Promise<Vector2> {
    try {
      return await OBR.scene.grid.snapPosition(point, 1, true, false);
    } catch (error) {
      logger.warn("Grid snapping failed; using the pointer position.", error);
      return point;
    }
  }

  private async handleDragStart(event: ToolEvent): Promise<void> {
    await this.cancelDrag();
    try {
      if (!(await requireGM()) || !(await OBR.scene.isReady())) return;
      const start = await this.snap(event.pointerPosition);
      this.dragStart = start;

      const preview = buildLine()
        .name("Beholder Wall Preview")
        .startPosition(start)
        .endPosition(start)
        .position(ZERO)
        .rotation(0)
        .scale(UNIT)
        .strokeColor("#d85b64")
        .strokeOpacity(0.95)
        .strokeWidth(4)
        .strokeDash([8, 5])
        .visible(true)
        .layer("CONTROL")
        .locked(true)
        .disableHit(true)
        .metadata({ [PREVIEW_KEY]: true })
        .build();

      await OBR.scene.local.addItems([preview]);
      this.previewId = preview.id;
    } catch (error) {
      this.dragStart = null;
      await this.removePreview();
      logger.error("Could not start wall drawing.", error);
      await OBR.notification.show("无法开始绘制墙体。", "ERROR");
    }
  }

  private async handleDragMove(event: ToolEvent): Promise<void> {
    if (!this.previewId || !this.dragStart) return;
    try {
      const previewId = this.previewId;
      const end = await this.snap(event.pointerPosition);
      await OBR.scene.local.updateItems(
        (item) => item.id === previewId,
        (drafts) => {
          for (const draft of drafts) {
            if (draft.id === previewId) draft.endPosition = end;
          }
        },
      );
    } catch (error) {
      logger.warn("Wall preview could not be updated.", error);
    }
  }

  private async handleDragEnd(event: ToolEvent): Promise<void> {
    const start = this.dragStart;
    this.dragStart = null;
    if (!start || !this.previewId) {
      await this.cancelDrag();
      return;
    }

    try {
      if (!(await requireGM()) || !(await OBR.scene.isReady())) {
        await this.removePreview();
        return;
      }
      const end = await this.snap(event.pointerPosition);
      await this.removePreview();
      if (Math.hypot(end.x - start.x, end.y - start.y) < 4) {
        await OBR.notification.show("墙体太短，未保存。", "INFO");
        return;
      }

      const source = createWallSource(start, end);
      await OBR.scene.items.addItems([source]);
      await this.reconciler.schedule("wall-created");

      const localItems = await OBR.scene.local.getItems();
      const projected = localItems.some((item) => {
        if (!isLocalWall(item)) return false;
        return readLocalWallMetadata(item)?.sourceId === source.id;
      });

      if (!projected) {
        throw new Error("共享墙线已保存，但本地 WALL 投影未生成。");
      }
      await OBR.notification.show("墙体已保存并生成本地阻挡墙。", "SUCCESS");
      logger.info("Wall segment created.", { sourceId: source.id, start, end });
    } catch (error) {
      logger.error("Wall drawing failed.", error);
      await OBR.notification.show(
        `墙体保存失败：${error instanceof Error ? error.message : "未知错误"}`,
        "ERROR",
      );
    }
  }

  private async cancelDrag(): Promise<void> {
    this.dragStart = null;
    await this.removePreview();
  }

  private async removePreview(): Promise<void> {
    const id = this.previewId;
    this.previewId = null;
    if (!id) return;
    try {
      await OBR.scene.local.deleteItems([id]);
    } catch (error) {
      logger.warn("Temporary wall preview cleanup failed.", error);
    }
  }
}
