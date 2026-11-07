import { OBR, buildLine } from "../../platform/obr.js";
import type { LineItem, ToolEvent, ToolModeDefinition, Vector2 } from "../../platform/obr.js";
import { logger } from "../../core/logger.js";
import { requireGM } from "../../core/permissions.js";
import { PREFERENCES, readBooleanPreference, writeBooleanPreference } from "../../core/preferences.js";
import { createWallSources } from "../../scene/walls/source.js";
import { isLocalWall, isWallSource, readLocalWallMetadata, readWallSourceMetadata, WALL_SOURCE_KEY } from "../../scene/walls/model.js";
import type { WallSourceMetadata } from "../../scene/walls/model.js";
import { pointToSegmentDistance, transformPoint } from "../../scene/walls/geometry.js";
import type { WallReconciler } from "../../scene/walls/reconciler.js";

const TOOL_ID = "com.beholder-vtt/wall-editor";
const DRAW_MODE_ID = TOOL_ID + "/draw";
const POLYLINE_MODE_ID = TOOL_ID + "/polyline";
const RECTANGLE_MODE_ID = TOOL_ID + "/rectangle";
const SELECT_MODE_ID = TOOL_ID + "/select";
const ERASE_MODE_ID = TOOL_ID + "/erase";
const PROPERTIES_ACTION_ID = TOOL_ID + "/properties";
const PROPERTIES_POPOVER_ID = "com.beholder-vtt/wall-properties";
const ZERO: Vector2 = { x: 0, y: 0 };
const UNIT: Vector2 = { x: 1, y: 1 };
const MODE_IDS = [SELECT_MODE_ID, DRAW_MODE_ID, POLYLINE_MODE_ID, RECTANGLE_MODE_ID, ERASE_MODE_ID];
const ACTION_IDS = [PROPERTIES_ACTION_ID];

interface WallHit {
  source: LineItem;
  distance: number;
  tolerance: number;
  start: Vector2;
  end: Vector2;
}

interface EditSession {
  wallId: string;
  sources: LineItem[];
  mode: "move" | "node";
  node: Vector2 | null;
  anchor: Vector2;
  previewIds: string[];
}

interface EditedSegment {
  start: Vector2;
  end: Vector2;
}

export class WallDrawTool {
  private readonly reconciler: WallReconciler;
  private dragStart: Vector2 | null = null;
  private linePreviewId: string | null = null;
  private rectanglePreviewIds: string[] = [];
  private polylinePoints: Vector2[] = [];
  private polylinePreviewIds: string[] = [];
  private livePolylinePreviewId: string | null = null;
  private selectionPreviewIds: string[] = [];
  private selectedWallId: string | null = null;
  private editSession: EditSession | null = null;
  private toolbarVisible = false;
  private registered = false;
  private snapToGrid = false;
  private snapToEndpoints = true;
  private storageHandler: ((event: StorageEvent) => void) | null = null;

  constructor(reconciler: WallReconciler) {
    this.reconciler = reconciler;
  }

  async start(): Promise<void> {
    this.snapToGrid = readBooleanPreference(PREFERENCES.snap, false);
    this.snapToEndpoints = readBooleanPreference(PREFERENCES.endpointSnap, true);
    this.reconciler.setGuidesVisible(readBooleanPreference(PREFERENCES.guides, true));
    this.storageHandler = (event) => this.handleStorageChange(event);
    window.addEventListener("storage", this.storageHandler);
    await this.setToolbarVisible(readBooleanPreference(PREFERENCES.toolbar, true));
  }

  async stop(): Promise<void> {
    if (this.storageHandler) window.removeEventListener("storage", this.storageHandler);
    this.storageHandler = null;
    await this.cancelAllInteractions();
    await this.removeToolbarRegistrations();
  }

  private asset(path: string): string {
    return new URL("./" + path, window.location.href).toString();
  }

  private handleStorageChange(event: StorageEvent): void {
    if (event.key === PREFERENCES.toolbar) {
      void this.setToolbarVisible(event.newValue !== "false").catch((error) => {
        logger.error("Toolbar visibility update failed.", error);
      });
    } else if (event.key === PREFERENCES.snap) {
      this.snapToGrid = event.newValue === "true";
    } else if (event.key === PREFERENCES.endpointSnap) {
      this.snapToEndpoints = event.newValue !== "false";
    } else if (event.key === PREFERENCES.guides) {
      this.reconciler.setGuidesVisible(event.newValue !== "false");
    }
  }

  private async setToolbarVisible(visible: boolean): Promise<void> {
    if (visible === this.toolbarVisible && visible === this.registered) return;
    this.toolbarVisible = visible;
    await this.removeToolbarRegistrations();
    if (!visible) return;

    try {
      await OBR.tool.create({
        id: TOOL_ID,
        icons: [{
          icon: this.asset("icon.svg"),
          label: "Beholder VTT · 墙体编辑器",
          filter: { roles: ["GM"] },
        }],
        defaultMode: SELECT_MODE_ID,
        defaultMetadata: { snapToGrid: this.snapToGrid, selectedWallId: null },
      });
      this.registered = true;
      await this.registerModes();
      await this.registerActions();
    } catch (error) {
      await this.removeToolbarRegistrations();
      logger.error("Wall editor registration failed.", error);
      await OBR.notification.show("墙体工具注册失败：" + (error instanceof Error ? error.message : "未知错误"), "ERROR");
      throw error;
    }
  }

  private async removeToolbarRegistrations(): Promise<void> {
    for (const id of ACTION_IDS) {
      try { await OBR.tool.removeAction(id); } catch { /* not registered */ }
    }
    for (const id of MODE_IDS) {
      try { await OBR.tool.removeMode(id); } catch { /* not registered */ }
    }
    try { await OBR.tool.remove(TOOL_ID); } catch { /* not registered */ }
    this.registered = false;
  }

  private async registerModes(): Promise<void> {
    const filter = { activeTools: [TOOL_ID], roles: ["GM" as const] };
    const createMode = async (id: string, icon: string, label: string, handlers: Partial<ToolModeDefinition>) => {
      await OBR.tool.createMode({
        id,
        icons: [{ icon: this.asset("icons/" + icon), label, filter }],
        disabled: { roles: ["PLAYER"] },
        cursors: [{ cursor: "crosshair" }],
        ...handlers,
      });
    };

    await createMode(SELECT_MODE_ID, "select.svg", "选择 / 移动 / 编辑节点", {
      onToolClick: async (_context, event) => {
        await this.selectWallAt(event.pointerPosition);
        return false;
      },
      onToolDragStart: async (_context, event) => this.startEdit(event),
      onToolDragMove: async (_context, event) => this.moveEdit(event),
      onToolDragEnd: async (_context, event) => this.endEdit(event),
      onToolDragCancel: async () => this.cancelEdit(),
      onDeactivate: async () => this.cancelEdit(),
    });

    await createMode(DRAW_MODE_ID, "draw.svg", "直线墙体（拖动）", {
      onToolDragStart: async (_context, event) => this.startLine(event),
      onToolDragMove: async (_context, event) => this.moveLine(event),
      onToolDragEnd: async (_context, event) => this.endLine(event),
      onToolDragCancel: async () => this.cancelLine(),
      onDeactivate: async () => this.cancelLine(),
    });

    await createMode(POLYLINE_MODE_ID, "polyline.svg", "连续折线（点击节点，双击完成）", {
      onToolClick: async (_context, event) => this.addPolylinePoint(event),
      onToolMove: async (_context, event) => this.movePolylinePreview(event),
      onToolDoubleClick: async (_context, event) => {
        await this.addPolylinePoint(event);
        await this.finishPolyline();
        return false;
      },
      onToolDragCancel: async () => this.cancelPolyline(),
      onDeactivate: async () => this.cancelPolyline(),
    });

    await createMode(RECTANGLE_MODE_ID, "rectangle.svg", "矩形房间（拖动）", {
      onToolDragStart: async (_context, event) => this.startRectangle(event),
      onToolDragMove: async (_context, event) => this.moveRectangle(event),
      onToolDragEnd: async (_context, event) => this.endRectangle(event),
      onToolDragCancel: async () => this.cancelRectangle(),
      onDeactivate: async () => this.cancelRectangle(),
    });

    await createMode(ERASE_MODE_ID, "erase.svg", "删除整条墙体（点击）", {
      onToolClick: async (_context, event) => {
        await this.eraseAt(event.pointerPosition);
        return false;
      },
    });
  }

  private async registerActions(): Promise<void> {
    const filter = { activeTools: [TOOL_ID], roles: ["GM" as const] };
    await OBR.tool.createAction({
      id: PROPERTIES_ACTION_ID,
      icons: [{
        icon: this.asset("icons/properties.svg"),
        label: "编辑选中墙体属性",
        filter,
      }],
      onClick: async (_context, elementId) => this.openProperties(elementId),
    });
  }

  private async snap(point: Vector2, allowEndpointSnap = false, bypassGrid = false): Promise<Vector2> {
    let snapped = point;
    if (this.snapToGrid && !bypassGrid) {
      try {
        snapped = await OBR.scene.grid.snapPosition(point, 1, true, false);
      } catch (error) {
        logger.warn("Grid snapping failed; using pointer position.", error);
      }
    }

    if (!allowEndpointSnap || !this.snapToEndpoints) return snapped;
    const scale = Math.max(await OBR.viewport.getScale().catch(() => 1), 0.1);
    const tolerance = 14 / scale;
    const sources = await this.allWallSources();
    let nearest: Vector2 | null = null;
    let nearestDistance = tolerance;
    for (const source of sources) {
      const segment = this.worldSegment(source);
      for (const endpoint of [segment.start, segment.end]) {
        const distance = Math.hypot(snapped.x - endpoint.x, snapped.y - endpoint.y);
        if (distance <= nearestDistance) {
          nearest = endpoint;
          nearestDistance = distance;
        }
      }
    }
    return nearest ?? snapped;
  }

  private previewLine(start: Vector2, end: Vector2, color = "#d85b64") {
    return buildLine()
      .name("Beholder Wall Editor Preview")
      .startPosition(start)
      .endPosition(end)
      .position(ZERO)
      .rotation(0)
      .scale(UNIT)
      .strokeColor(color)
      .strokeOpacity(0.95)
      .strokeWidth(4)
      .strokeDash([8, 5])
      .visible(true)
      .layer("CONTROL")
      .locked(true)
      .disableHit(true)
      .build();
  }

  private async updatePreviewLines(ids: string[], segments: EditedSegment[]): Promise<void> {
    if (!ids.length) return;
    const byId = new Map(ids.map((id, index) => [id, segments[index]]));
    await OBR.scene.local.updateItems(
      (item) => byId.has(item.id),
      (drafts) => {
        for (const draft of drafts) {
          const segment = byId.get(draft.id);
          if (segment) {
            draft.startPosition = segment.start;
            draft.endPosition = segment.end;
          }
        }
      },
    );
  }

  private async removePreviews(ids: string[]): Promise<void> {
    if (!ids.length) return;
    try { await OBR.scene.local.deleteItems(ids); } catch (error) {
      logger.warn("Could not remove temporary wall previews.", error);
    }
  }

  private async saveWall(points: Vector2[]): Promise<void> {
    const sources = createWallSources(points);
    if (!sources.length) return;
    await OBR.scene.items.addItems(sources);
    await this.reconciler.schedule("wall-created");
    const localItems = await OBR.scene.local.getItems();
    const projectedIds = new Set(localItems.filter(isLocalWall).map((item) => readLocalWallMetadata(item)?.sourceId));
    if (sources.some((source) => !projectedIds.has(source.id))) {
      throw new Error("共享墙体已保存，但至少一个本地阻挡墙未生成。");
    }
    const first = sources[0];
    logger.info("Wall geometry saved.", { wallId: first ? readWallSourceMetadata(first)?.wallId : null, segments: sources.length });
  }

  private async startLine(event: ToolEvent): Promise<void> {
    await this.cancelLine();
    if (!(await requireGM()) || !(await OBR.scene.isReady())) return;
    const start = await this.snap(event.pointerPosition, true, event.ctrlKey || event.metaKey);
    this.dragStart = start;
    const preview = this.previewLine(start, start);
    await OBR.scene.local.addItems([preview]);
    this.linePreviewId = preview.id;
  }

  private async moveLine(event: ToolEvent): Promise<void> {
    if (!this.dragStart || !this.linePreviewId) return;
    const end = await this.snap(event.pointerPosition, true, event.ctrlKey || event.metaKey);
    await this.updatePreviewLines([this.linePreviewId], [{ start: this.dragStart, end }]);
  }

  private async endLine(event: ToolEvent): Promise<void> {
    const start = this.dragStart;
    this.dragStart = null;
    if (!start) return;
    const end = await this.snap(event.pointerPosition, true, event.ctrlKey || event.metaKey);
    const id = this.linePreviewId;
    this.linePreviewId = null;
    if (id) await this.removePreviews([id]);
    if (Math.hypot(end.x - start.x, end.y - start.y) < 4) return;
    try { await this.saveWall([start, end]); } catch (error) {
      logger.error("Line wall creation failed.", error);
      await OBR.notification.show("墙体保存失败：" + (error instanceof Error ? error.message : "未知错误"), "ERROR");
    }
  }

  private async cancelLine(): Promise<void> {
    this.dragStart = null;
    const id = this.linePreviewId;
    this.linePreviewId = null;
    if (id) await this.removePreviews([id]);
  }

  private async addPolylinePoint(event: ToolEvent): Promise<boolean> {
    if (!(await requireGM()) || !(await OBR.scene.isReady())) return false;
    const point = await this.snap(event.pointerPosition, true, event.ctrlKey || event.metaKey);
    const last = this.polylinePoints[this.polylinePoints.length - 1];
    if (last && Math.hypot(point.x - last.x, point.y - last.y) < 4) return false;
    if (last && this.livePolylinePreviewId) {
      await this.updatePreviewLines([this.livePolylinePreviewId], [{ start: last, end: point }]);
    }
    this.polylinePoints.push(point);
    const live = this.previewLine(point, point);
    await OBR.scene.local.addItems([live]);
    this.polylinePreviewIds.push(live.id);
    this.livePolylinePreviewId = live.id;
    return false;
  }

  private async movePolylinePreview(event: ToolEvent): Promise<void> {
    const point = this.polylinePoints[this.polylinePoints.length - 1];
    if (!point || !this.livePolylinePreviewId) return;
    const end = await this.snap(event.pointerPosition, true, event.ctrlKey || event.metaKey);
    await this.updatePreviewLines([this.livePolylinePreviewId], [{ start: point, end }]);
  }

  private async finishPolyline(): Promise<void> {
    const points = [...this.polylinePoints];
    await this.cancelPolyline();
    if (points.length < 2) {
      return;
    }
    try { await this.saveWall(points); } catch (error) {
      logger.error("Polyline wall creation failed.", error);
      await OBR.notification.show("折线保存失败：" + (error instanceof Error ? error.message : "未知错误"), "ERROR");
    }
  }

  private async cancelPolyline(): Promise<void> {
    this.polylinePoints = [];
    this.livePolylinePreviewId = null;
    const ids = this.polylinePreviewIds.splice(0);
    await this.removePreviews(ids);
  }

  private rectanglePoints(start: Vector2, end: Vector2): Vector2[] {
    return [start, { x: end.x, y: start.y }, end, { x: start.x, y: end.y }, start];
  }

  private async startRectangle(event: ToolEvent): Promise<void> {
    await this.cancelRectangle();
    if (!(await requireGM()) || !(await OBR.scene.isReady())) return;
    this.dragStart = await this.snap(event.pointerPosition, true, event.ctrlKey || event.metaKey);
    const points = this.rectanglePoints(this.dragStart, this.dragStart);
    const previews = points.slice(0, 4).map((point, index) => this.previewLine(point, points[index + 1]!));
    await OBR.scene.local.addItems(previews);
    this.rectanglePreviewIds = previews.map((item) => item.id);
  }

  private async moveRectangle(event: ToolEvent): Promise<void> {
    if (!this.dragStart || this.rectanglePreviewIds.length !== 4) return;
    const end = await this.snap(event.pointerPosition, true, event.ctrlKey || event.metaKey);
    const points = this.rectanglePoints(this.dragStart, end);
    const segments = points.slice(0, 4).map((point, index) => ({ start: point, end: points[index + 1]! }));
    await this.updatePreviewLines(this.rectanglePreviewIds, segments);
  }

  private async endRectangle(event: ToolEvent): Promise<void> {
    const start = this.dragStart;
    this.dragStart = null;
    if (!start) return;
    const end = await this.snap(event.pointerPosition, true, event.ctrlKey || event.metaKey);
    await this.cancelRectangle();
    if (Math.abs(end.x - start.x) < 4 || Math.abs(end.y - start.y) < 4) return;
    try { await this.saveWall(this.rectanglePoints(start, end)); } catch (error) {
      logger.error("Rectangle wall creation failed.", error);
      await OBR.notification.show("矩形墙体保存失败：" + (error instanceof Error ? error.message : "未知错误"), "ERROR");
    }
  }

  private async cancelRectangle(): Promise<void> {
    this.dragStart = null;
    const ids = this.rectanglePreviewIds.splice(0);
    await this.removePreviews(ids);
  }

  private worldSegment(source: LineItem): { start: Vector2; end: Vector2 } {
    const position = source.position ?? ZERO;
    const scale = source.scale ?? UNIT;
    const rotation = source.rotation ?? 0;
    return {
      start: transformPoint(source.startPosition, position, rotation, scale),
      end: transformPoint(source.endPosition, position, rotation, scale),
    };
  }

  private async allWallSources(): Promise<LineItem[]> {
    return await OBR.scene.items.getItems(isWallSource) as LineItem[];
  }

  private async nearestWall(point: Vector2): Promise<WallHit | null> {
    const sources = await this.allWallSources();
    const scale = Math.max(await OBR.viewport.getScale().catch(() => 1), 0.1);
    const tolerance = 18 / scale;
    let nearest: WallHit | null = null;
    for (const source of sources) {
      const segment = this.worldSegment(source);
      const distance = pointToSegmentDistance(point, segment.start, segment.end);
      if (distance <= tolerance && (!nearest || distance < nearest.distance)) {
        nearest = { source, distance, tolerance, start: segment.start, end: segment.end };
      }
    }
    return nearest;
  }

  private async wallGroup(wallId: string): Promise<LineItem[]> {
    const sources = await this.allWallSources();
    return sources.filter((source) => readWallSourceMetadata(source)?.wallId === wallId);
  }

  private async setSelection(wallId: string | null): Promise<void> {
    this.selectedWallId = wallId;
    if (this.registered) await OBR.tool.setMetadata(TOOL_ID, { selectedWallId: wallId });
    await this.removePreviews(this.selectionPreviewIds);
    this.selectionPreviewIds = [];
    if (!wallId) return;
    const group = await this.wallGroup(wallId);
    const previews = group.map((source) => {
      const segment = this.worldSegment(source);
      return this.previewLine(segment.start, segment.end, "#e6c16f");
    });
    if (previews.length) {
      await OBR.scene.local.addItems(previews);
      this.selectionPreviewIds = previews.map((item) => item.id);
    }
  }

  private async selectWallAt(point: Vector2): Promise<void> {
    const hit = await this.nearestWall(point);
    const metadata = hit ? readWallSourceMetadata(hit.source) : null;
    await this.setSelection(metadata?.wallId ?? null);
  }

  private async startEdit(event: ToolEvent): Promise<void> {
    await this.cancelEdit();
    const hit = await this.nearestWall(event.pointerPosition);
    if (!hit) {
      await this.setSelection(null);
      return;
    }
    const metadata = readWallSourceMetadata(hit.source);
    if (!metadata) return;
    const group = await this.wallGroup(metadata.wallId);
    await this.setSelection(metadata.wallId);
    await this.removePreviews(this.selectionPreviewIds);
    this.selectionPreviewIds = [];

    const startDistance = Math.hypot(event.pointerPosition.x - hit.start.x, event.pointerPosition.y - hit.start.y);
    const endDistance = Math.hypot(event.pointerPosition.x - hit.end.x, event.pointerPosition.y - hit.end.y);
    const endpointTolerance = hit.tolerance * 0.85;
    const node = Math.min(startDistance, endDistance) <= endpointTolerance
      ? (startDistance <= endDistance ? hit.start : hit.end)
      : null;

    const session: EditSession = {
      wallId: metadata.wallId,
      sources: group,
      mode: node ? "node" : "move",
      node,
      anchor: await this.snap(event.pointerPosition, false, event.ctrlKey || event.metaKey),
      previewIds: [],
    };
    const previews = group.map((source) => {
      const segment = this.worldSegment(source);
      return this.previewLine(segment.start, segment.end, "#e6c16f");
    });
    if (previews.length) {
      await OBR.scene.local.addItems(previews);
      session.previewIds = previews.map((item) => item.id);
    }
    this.editSession = session;
  }

  private editedGeometry(session: EditSession, pointer: Vector2): Map<string, EditedSegment> {
    const delta = { x: pointer.x - session.anchor.x, y: pointer.y - session.anchor.y };
    const result = new Map<string, EditedSegment>();
    for (const source of session.sources) {
      let start = { ...source.startPosition };
      let end = { ...source.endPosition };
      if (session.mode === "move") {
        start = { x: start.x + delta.x, y: start.y + delta.y };
        end = { x: end.x + delta.x, y: end.y + delta.y };
      } else if (session.node) {
        if (Math.hypot(start.x - session.node.x, start.y - session.node.y) < 0.001) {
          start = { x: start.x + delta.x, y: start.y + delta.y };
        }
        if (Math.hypot(end.x - session.node.x, end.y - session.node.y) < 0.001) {
          end = { x: end.x + delta.x, y: end.y + delta.y };
        }
      }
      result.set(source.id, { start, end });
    }
    return result;
  }

  private async moveEdit(event: ToolEvent): Promise<void> {
    const session = this.editSession;
    if (!session) return;
    const pointer = await this.snap(event.pointerPosition, true, event.ctrlKey || event.metaKey);
    const geometry = this.editedGeometry(session, pointer);
    const segments = session.sources.map((source) => geometry.get(source.id) ?? {
      start: source.startPosition,
      end: source.endPosition,
    });
    await this.updatePreviewLines(session.previewIds, segments);
  }

  private async endEdit(event: ToolEvent): Promise<void> {
    const session = this.editSession;
    this.editSession = null;
    if (!session) return;
    const pointer = await this.snap(event.pointerPosition, true, event.ctrlKey || event.metaKey);
    const geometry = this.editedGeometry(session, pointer);
    await this.removePreviews(session.previewIds);
    const delta = Math.hypot(pointer.x - session.anchor.x, pointer.y - session.anchor.y);
    if (delta < 1) {
      await this.setSelection(session.wallId);
      return;
    }
    try {
      const byId = new Map(session.sources.map((source) => [source.id, geometry.get(source.id)]));
      const ids = new Set(byId.keys());
      await OBR.scene.items.updateItems(
        (item) => ids.has(item.id),
        (drafts) => {
          for (const draft of drafts) {
            const segment = byId.get(draft.id);
            if (!segment) continue;
            draft.startPosition = segment.start;
            draft.endPosition = segment.end;
            const raw = draft.metadata[WALL_SOURCE_KEY] as WallSourceMetadata | undefined;
            if (raw) draft.metadata[WALL_SOURCE_KEY] = { ...raw, revision: raw.revision + 1 };
          }
        },
      );
      await this.reconciler.schedule("wall-edited");
      await this.setSelection(session.wallId);
    } catch (error) {
      logger.error("Wall edit failed.", error);
      await OBR.notification.show("墙体编辑失败：" + (error instanceof Error ? error.message : "未知错误"), "ERROR");
    }
  }

  private async cancelEdit(): Promise<void> {
    const session = this.editSession;
    this.editSession = null;
    if (session) {
      await this.removePreviews(session.previewIds);
      await this.setSelection(session.wallId);
    }
  }

  private async eraseAt(point: Vector2): Promise<void> {
    const hit = await this.nearestWall(point);
    if (!hit) return;
    const metadata = readWallSourceMetadata(hit.source);
    if (!metadata) return;
    const group = await this.wallGroup(metadata.wallId);
    await OBR.scene.items.deleteItems(group.map((source) => source.id));
    if (this.selectedWallId === metadata.wallId) await this.setSelection(null);
    await this.reconciler.schedule("wall-erased");
  }

  private async openProperties(elementId: string): Promise<void> {
    await OBR.popover.open({
      id: PROPERTIES_POPOVER_ID,
      url: this.asset("wall-properties.html"),
      width: 310,
      height: 330,
      anchorElementId: elementId,
    });
  }

  private async cancelAllInteractions(): Promise<void> {
    await this.cancelLine();
    await this.cancelRectangle();
    await this.cancelPolyline();
    await this.cancelEdit();
    await this.removePreviews(this.selectionPreviewIds);
    this.selectionPreviewIds = [];
  }
}
