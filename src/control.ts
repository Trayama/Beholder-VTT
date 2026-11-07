import { OBR } from "./platform/obr.js";
import {
  PREFERENCES,
  readBooleanPreference,
  readStringPreference,
  writeBooleanPreference,
  writeStringPreference,
} from "./core/preferences.js";
import { isWallSource, readWallSourceMetadata } from "./scene/walls/model.js";

const TOOL_ID = "com.beholder-vtt/wall-editor";
const PROPERTIES_POPOVER_ID = "com.beholder-vtt/wall-properties";
const toolbarToggle = document.querySelector<HTMLButtonElement>("#toolbar-toggle");
const freeButton = document.querySelector<HTMLButtonElement>("#snap-free");
const gridButton = document.querySelector<HTMLButtonElement>("#snap-grid");
const endpointSnap = document.querySelector<HTMLInputElement>("#endpoint-snap");
const guidesVisible = document.querySelector<HTMLInputElement>("#guides-visible");
const undoButton = document.querySelector<HTMLButtonElement>("#undo");
const redoButton = document.querySelector<HTMLButtonElement>("#redo");
const clearButton = document.querySelector<HTMLButtonElement>("#clear-walls");
const editWallButton = document.querySelector<HTMLButtonElement>("#edit-wall");
const actionStatus = document.querySelector<HTMLElement>("#action-status");
const sceneLabel = document.querySelector<HTMLElement>("#scene-label");
const sceneDot = document.querySelector<HTMLElement>("#scene-dot");
const roleLabel = document.querySelector<HTMLElement>("#role-label");
const wallCount = document.querySelector<HTMLElement>("#wall-count");
const tokenCount = document.querySelector<HTMLElement>("#token-count");
const playerHint = document.querySelector<HTMLElement>("#player-hint");
const activeToolLabel = document.querySelector<HTMLElement>("#active-tool-id");
const boundToolLabel = document.querySelector<HTMLElement>("#bound-tool-id");
const bindToolButton = document.querySelector<HTMLButtonElement>("#bind-select-tool");
const unbindToolButton = document.querySelector<HTMLButtonElement>("#unbind-select-tool");
const bindStatus = document.querySelector<HTMLElement>("#select-bind-status");

let clearArmedUntil = 0;
let historyRefreshTimer: number | null = null;

function scheduleHistoryRefresh(): void {
  if (historyRefreshTimer !== null) window.clearTimeout(historyRefreshTimer);
  historyRefreshTimer = window.setTimeout(() => {
    historyRefreshTimer = null;
    void updateHistoryButtons();
  }, 140);
}

function setActionStatus(message: string): void {
  if (actionStatus) actionStatus.textContent = message;
}

function setBindStatus(message: string): void {
  if (bindStatus) bindStatus.textContent = message;
}

function updateToolbarButton(): void {
  if (!toolbarToggle) return;
  toolbarToggle.textContent = readBooleanPreference(PREFERENCES.toolbar, true)
    ? "隐藏工具"
    : "显示工具";
}

function updateSnapButtons(): void {
  const grid = readBooleanPreference(PREFERENCES.snap, false);
  freeButton?.classList.toggle("active", !grid);
  gridButton?.classList.toggle("active", grid);
}

function updateBindingLabel(): void {
  if (boundToolLabel) {
    boundToolLabel.textContent = readStringPreference(PREFERENCES.selectToolId, "") || "尚未绑定";
  }
}

async function updateActiveToolLabel(): Promise<void> {
  try {
    const activeTool = await OBR.tool.getActiveTool();
    if (activeToolLabel) activeToolLabel.textContent = activeTool;
  } catch {
    if (activeToolLabel) activeToolLabel.textContent = "无法读取";
  }
}

function syncPreferences(): void {
  if (endpointSnap) endpointSnap.checked = readBooleanPreference(PREFERENCES.endpointSnap, true);
  if (guidesVisible) guidesVisible.checked = readBooleanPreference(PREFERENCES.guides, true);
  updateSnapButtons();
  updateToolbarButton();
  updateBindingLabel();
}

function bindToggle(input: HTMLInputElement | null, key: string): void {
  input?.addEventListener("change", () => writeBooleanPreference(key, input.checked));
}

toolbarToggle?.addEventListener("click", () => {
  const next = !readBooleanPreference(PREFERENCES.toolbar, true);
  writeBooleanPreference(PREFERENCES.toolbar, next);
  updateToolbarButton();
  setActionStatus(next ? "右侧墙体工具已启用。" : "右侧墙体工具已隐藏；墙体数据和同步不受影响。");
});

freeButton?.addEventListener("click", () => {
  writeBooleanPreference(PREFERENCES.snap, false);
  updateSnapButtons();
  setActionStatus("自由绘制已启用：光标位置不再吸附网格。");
});

gridButton?.addEventListener("click", () => {
  writeBooleanPreference(PREFERENCES.snap, true);
  updateSnapButtons();
  setActionStatus("网格吸附已启用。按住 Ctrl / Cmd 临时自由绘制。");
});

bindToggle(endpointSnap, PREFERENCES.endpointSnap);
bindToggle(guidesVisible, PREFERENCES.guides);

bindToolButton?.addEventListener("click", async () => {
  try {
    const activeTool = await OBR.tool.getActiveTool();
    if (!activeTool.startsWith("rodeo.owlbear.tools/")) {
      setBindStatus("当前工具不是 Owlbear 原生工具。请先在右侧工具栏选择原生 Select，再绑定。");
      return;
    }
    writeStringPreference(PREFERENCES.selectToolId, activeTool);
    updateBindingLabel();
    setBindStatus("已保存绑定：" + activeTool + "。切换一次工具或重新打开场景后，Beholder 会自动接管角色 Token 的普通拖动。");
  } catch (error) {
    setBindStatus("读取当前工具失败：" + (error instanceof Error ? error.message : "未知错误"));
  }
});

unbindToolButton?.addEventListener("click", () => {
  writeStringPreference(PREFERENCES.selectToolId, "");
  updateBindingLabel();
  setBindStatus("已解除本客户端绑定。独立的墙体感知移动工具仍可使用。");
});

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

undoButton?.addEventListener("click", async () => {
  try {
    if (await OBR.scene.history.canUndo()) {
      await OBR.scene.history.undo();
      setActionStatus("已撤销上一步场景操作。");
    } else {
      setActionStatus("没有可撤销的操作。");
    }
    await updateHistoryButtons();
  } catch (error) {
    setActionStatus("撤销失败：" + (error instanceof Error ? error.message : "未知错误"));
  }
});

redoButton?.addEventListener("click", async () => {
  try {
    if (await OBR.scene.history.canRedo()) {
      await OBR.scene.history.redo();
      setActionStatus("已重做上一步场景操作。");
    } else {
      setActionStatus("没有可重做的操作。");
    }
    await updateHistoryButtons();
  } catch (error) {
    setActionStatus("重做失败：" + (error instanceof Error ? error.message : "未知错误"));
  }
});

editWallButton?.addEventListener("click", async () => {
  try {
    const metadata = await OBR.tool.getMetadata(TOOL_ID);
    const wallId = typeof metadata.selectedWallId === "string" ? metadata.selectedWallId : "";
    if (!wallId) {
      setActionStatus("请先在右侧选择 / 编辑模式中点击一条墙体。");
      return;
    }
    await OBR.popover.open({
      id: PROPERTIES_POPOVER_ID,
      url: new URL("./wall-properties.html", window.location.href).toString(),
      width: 330,
      height: 360,
    });
  } catch (error) {
    setActionStatus("无法打开墙体属性：" + (error instanceof Error ? error.message : "请先显示右侧工具"));
  }
});

clearButton?.addEventListener("click", async () => {
  const now = Date.now();
  if (now > clearArmedUntil) {
    clearArmedUntil = now + 5000;
    clearButton.textContent = "再次点击确认清空（5 秒）";
    clearButton.classList.add("armed");
    setActionStatus("这是不可逆的批量删除操作；请在 5 秒内再次点击确认。");
    return;
  }

  clearArmedUntil = 0;
  clearButton.disabled = true;
  try {
    const sources = await OBR.scene.items.getItems(isWallSource);
    if (sources.length) await OBR.scene.items.deleteItems(sources.map((source) => source.id));
    setActionStatus(sources.length ? "已清空 " + sources.length + " 段墙体。" : "当前场景没有 Beholder 墙体。");
    await updateHistoryButtons();
  } catch (error) {
    setActionStatus("清空失败：" + (error instanceof Error ? error.message : "未知错误"));
  } finally {
    clearButton.disabled = false;
    clearButton.textContent = "清空本场景墙体";
    clearButton.classList.remove("armed");
  }
});

function updateSceneStats(items: Awaited<ReturnType<typeof OBR.scene.items.getItems>>): void {
  const sources = items.filter(isWallSource);
  const walls = new Set(sources.map((source) => readWallSourceMetadata(source)?.wallId).filter(Boolean));
  const tokens = items.filter((item) =>
    item.type === "IMAGE" && (item.layer === "CHARACTER" || item.layer === "MOUNT")
  );
  if (wallCount) wallCount.textContent = String(walls.size);
  if (tokenCount) tokenCount.textContent = String(tokens.length);
}

OBR.onReady(async () => {
  syncPreferences();
  try {
    const isGM = (await OBR.player.getRole()) === "GM";
    if (roleLabel) roleLabel.textContent = isGM ? "房主 / GM" : "玩家视图";

    if (!isGM) {
      for (const element of Array.from(document.querySelectorAll<HTMLElement>("[data-gm-only]"))) {
        element.hidden = true;
      }
      if (playerHint) playerHint.hidden = false;
    }

    await updateActiveToolLabel();
    OBR.tool.onToolChange((toolId) => {
      if (activeToolLabel) activeToolLabel.textContent = toolId;
    });
    window.addEventListener("storage", (event) => {
      if (event.key === PREFERENCES.selectToolId) updateBindingLabel();
    });

    const ready = await OBR.scene.isReady();
    if (sceneLabel) sceneLabel.textContent = ready ? "场景已就绪" : "等待场景打开";
    if (sceneDot) sceneDot.style.background = ready ? "#6dbb92" : "#d5b574";
    if (ready) {
      updateSceneStats(await OBR.scene.items.getItems());
      await updateHistoryButtons();
    }

    OBR.scene.onReadyChange(async (isReady) => {
      if (sceneLabel) sceneLabel.textContent = isReady ? "场景已就绪" : "等待场景打开";
      if (sceneDot) sceneDot.style.background = isReady ? "#6dbb92" : "#d5b574";
      if (isReady) {
        updateSceneStats(await OBR.scene.items.getItems());
        await updateHistoryButtons();
      }
    });
    OBR.scene.items.onChange((items) => {
      updateSceneStats(items);
      scheduleHistoryRefresh();
    });
  } catch (error) {
    if (sceneLabel) sceneLabel.textContent = "无法读取场景状态";
    if (sceneDot) sceneDot.style.background = "#c87878";
    setBindStatus("控制台初始化失败：" + (error instanceof Error ? error.message : "未知错误"));
    console.error("Beholder control panel initialization failed.", error);
  }
});
