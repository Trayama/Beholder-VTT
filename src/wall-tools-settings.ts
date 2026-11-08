import { OBR } from "./platform/obr.js";
import { PREFERENCES, readBooleanPreference, writeBooleanPreference } from "./core/preferences.js";
import { isWallSource } from "./scene/walls/model.js";

const TOOL_ID = "com.beholder-vtt/wall-editor";
const SETTINGS_POPOVER_ID = "com.beholder-vtt/wall-tools-settings";
const PROPERTIES_POPOVER_ID = "com.beholder-vtt/wall-properties";

const freeButton = document.querySelector<HTMLButtonElement>("#snap-free");
const gridButton = document.querySelector<HTMLButtonElement>("#snap-grid");
const endpointSnap = document.querySelector<HTMLInputElement>("#endpoint-snap");
const guidesVisible = document.querySelector<HTMLInputElement>("#guides-visible");
const editWallButton = document.querySelector<HTMLButtonElement>("#edit-wall");
const undoButton = document.querySelector<HTMLButtonElement>("#undo");
const redoButton = document.querySelector<HTMLButtonElement>("#redo");
const clearButton = document.querySelector<HTMLButtonElement>("#clear-walls");
const closeButton = document.querySelector<HTMLButtonElement>("#close");
const status = document.querySelector<HTMLElement>("#status");

let clearArmedUntil = 0;
let clearTimer: number | null = null;

function setStatus(message: string): void {
  if (status) status.textContent = message;
}

function syncPreferences(): void {
  const grid = readBooleanPreference(PREFERENCES.snap, false);
  freeButton?.classList.toggle("active", !grid);
  gridButton?.classList.toggle("active", grid);
  if (endpointSnap) endpointSnap.checked = readBooleanPreference(PREFERENCES.endpointSnap, true);
  if (guidesVisible) guidesVisible.checked = readBooleanPreference(PREFERENCES.guides, true);
}

async function updateHistoryButtons(): Promise<void> {
  try {
    const [canUndo, canRedo] = await Promise.all([
      OBR.scene.history.canUndo(),
      OBR.scene.history.canRedo(),
    ]);
    if (undoButton) undoButton.disabled = !canUndo;
    if (redoButton) redoButton.disabled = !canRedo;
  } catch {
    if (undoButton) undoButton.disabled = true;
    if (redoButton) redoButton.disabled = true;
  }
}

freeButton?.addEventListener("click", () => {
  writeBooleanPreference(PREFERENCES.snap, false);
  syncPreferences();
  setStatus("自由绘制已启用。");
});

gridButton?.addEventListener("click", () => {
  writeBooleanPreference(PREFERENCES.snap, true);
  syncPreferences();
  setStatus("网格吸附已启用。");
});

endpointSnap?.addEventListener("change", () => {
  writeBooleanPreference(PREFERENCES.endpointSnap, endpointSnap.checked);
  setStatus(endpointSnap.checked ? "端点吸附已启用。" : "端点吸附已关闭。");
});

guidesVisible?.addEventListener("change", () => {
  writeBooleanPreference(PREFERENCES.guides, guidesVisible.checked);
  setStatus(guidesVisible.checked ? "GM 辅助线已显示。" : "GM 辅助线已隐藏。");
});

editWallButton?.addEventListener("click", async () => {
  try {
    const metadata = await OBR.tool.getMetadata(TOOL_ID);
    const wallId = typeof metadata.selectedWallId === "string" ? metadata.selectedWallId : "";
    if (!wallId) {
      setStatus("请先在墙体编辑工具的选择模式中选中一条墙体。");
      return;
    }
    const sources = await OBR.scene.items.getItems(isWallSource);
    if (!sources.some((item) => (item.metadata["com.beholder-vtt/wall-source"] as { wallId?: string } | undefined)?.wallId === wallId)) {
      setStatus("选中的墙体已经不存在，请重新选择。");
      return;
    }
    await OBR.popover.close(SETTINGS_POPOVER_ID);
    await OBR.popover.open({
      id: PROPERTIES_POPOVER_ID,
      url: new URL("./wall-properties.html", window.location.href).toString(),
      width: 330,
      height: 360,
    });
  } catch (error) {
    setStatus("无法打开墙体属性：" + (error instanceof Error ? error.message : "未知错误"));
  }
});

undoButton?.addEventListener("click", async () => {
  try {
    if (!(await OBR.scene.history.canUndo())) {
      setStatus("没有可撤销的操作。");
      return;
    }
    await OBR.scene.history.undo();
    setStatus("已撤销上一步场景操作。");
    await updateHistoryButtons();
  } catch (error) {
    setStatus("撤销失败：" + (error instanceof Error ? error.message : "未知错误"));
  }
});

redoButton?.addEventListener("click", async () => {
  try {
    if (!(await OBR.scene.history.canRedo())) {
      setStatus("没有可重做的操作。");
      return;
    }
    await OBR.scene.history.redo();
    setStatus("已重做上一步场景操作。");
    await updateHistoryButtons();
  } catch (error) {
    setStatus("重做失败：" + (error instanceof Error ? error.message : "未知错误"));
  }
});

clearButton?.addEventListener("click", async () => {
  const now = Date.now();
  if (now > clearArmedUntil) {
    clearArmedUntil = now + 5000;
    clearButton.textContent = "再次点击确认清空（5 秒）";
    clearButton.classList.add("armed");
    setStatus("请在 5 秒内再次点击。此操作会删除当前场景全部 Beholder 墙体。");
    if (clearTimer !== null) window.clearTimeout(clearTimer);
    clearTimer = window.setTimeout(() => {
      clearArmedUntil = 0;
      if (clearButton) {
        clearButton.textContent = "清空本场景墙体";
        clearButton.classList.remove("armed");
      }
      clearTimer = null;
    }, 5000);
    return;
  }

  clearArmedUntil = 0;
  if (clearTimer !== null) window.clearTimeout(clearTimer);
  clearTimer = null;
  clearButton.disabled = true;
  try {
    const sources = await OBR.scene.items.getItems(isWallSource);
    if (sources.length) await OBR.scene.items.deleteItems(sources.map((item) => item.id));
    setStatus(sources.length ? "已清空 " + sources.length + " 段墙体。" : "当前场景没有 Beholder 墙体。");
    await updateHistoryButtons();
  } catch (error) {
    setStatus("清空失败：" + (error instanceof Error ? error.message : "未知错误"));
  } finally {
    clearButton.disabled = false;
    clearButton.textContent = "清空本场景墙体";
    clearButton.classList.remove("armed");
  }
});

closeButton?.addEventListener("click", () => void OBR.popover.close(SETTINGS_POPOVER_ID));

OBR.onReady(async () => {
  syncPreferences();
  await updateHistoryButtons();
  OBR.scene.items.onChange(() => void updateHistoryButtons());
});
