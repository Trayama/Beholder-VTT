import { OBR } from "./platform/obr.js";
import { PREFERENCES, readBooleanPreference, writeBooleanPreference } from "./core/preferences.js";
import { isWallSource, readWallSourceMetadata } from "./scene/walls/model.js";

const toolbarToggle = document.querySelector<HTMLButtonElement>("#toolbar-toggle");
const movementTakeover = document.querySelector<HTMLInputElement>("#movement-takeover");
const actionStatus = document.querySelector<HTMLElement>("#action-status");
const sceneLabel = document.querySelector<HTMLElement>("#scene-label");
const sceneDot = document.querySelector<HTMLElement>("#scene-dot");
const roleLabel = document.querySelector<HTMLElement>("#role-label");
const wallCount = document.querySelector<HTMLElement>("#wall-count");
const tokenCount = document.querySelector<HTMLElement>("#token-count");
const activeToolLabel = document.querySelector<HTMLElement>("#active-tool-id");

function setStatus(message: string): void {
  if (actionStatus) actionStatus.textContent = message;
}

function updateToolbarButton(): void {
  if (!toolbarToggle) return;
  toolbarToggle.textContent = readBooleanPreference(PREFERENCES.toolbar, true)
    ? "隐藏"
    : "显示";
}

function syncPreferences(): void {
  if (movementTakeover) {
    movementTakeover.checked = readBooleanPreference(PREFERENCES.movementTakeover, true);
  }
  updateToolbarButton();
}

toolbarToggle?.addEventListener("click", () => {
  const next = !readBooleanPreference(PREFERENCES.toolbar, true);
  writeBooleanPreference(PREFERENCES.toolbar, next);
  updateToolbarButton();
  setStatus(next ? "墙体编辑工具栏已启用。" : "墙体编辑工具栏已隐藏；墙体数据与移动阻挡不受影响。");
});

movementTakeover?.addEventListener("change", () => {
  writeBooleanPreference(PREFERENCES.movementTakeover, movementTakeover.checked);
  setStatus(movementTakeover.checked
    ? "原生 Move 接管已开启：官方工具入口保留，角色 Token 拖动由 Beholder 实时检测墙体。"
    : "原生 Move 接管已关闭：官方 Move 恢复原生交互；Beholder 独立移动工具仍可使用。");
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

async function updateActiveToolLabel(): Promise<void> {
  try {
    if (activeToolLabel) activeToolLabel.textContent = await OBR.tool.getActiveTool();
  } catch {
    if (activeToolLabel) activeToolLabel.textContent = "无法读取";
  }
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
      const hint = document.querySelector<HTMLElement>("#client-hint");
      if (hint) hint.textContent = "玩家客户端：移动接管为本地设置；墙体绘制工具由 GM 管理。";
    }

    await updateActiveToolLabel();
    OBR.tool.onToolChange((toolId) => {
      if (activeToolLabel) activeToolLabel.textContent = toolId;
    });

    window.addEventListener("storage", (event) => {
      if (event.key === PREFERENCES.toolbar || event.key === PREFERENCES.movementTakeover) {
        syncPreferences();
      }
    });

    const ready = await OBR.scene.isReady();
    if (sceneLabel) sceneLabel.textContent = ready ? "场景已就绪" : "等待场景打开";
    if (sceneDot) sceneDot.style.background = ready ? "#6dbb92" : "#d5b574";
    if (ready) updateSceneStats(await OBR.scene.items.getItems());

    OBR.scene.onReadyChange(async (isReady) => {
      if (sceneLabel) sceneLabel.textContent = isReady ? "场景已就绪" : "等待场景打开";
      if (sceneDot) sceneDot.style.background = isReady ? "#6dbb92" : "#d5b574";
      if (isReady) updateSceneStats(await OBR.scene.items.getItems());
    });
    OBR.scene.items.onChange(updateSceneStats);
  } catch (error) {
    if (sceneLabel) sceneLabel.textContent = "无法读取场景状态";
    if (sceneDot) sceneDot.style.background = "#c87878";
    setStatus("总设置初始化失败：" + (error instanceof Error ? error.message : "未知错误"));
    console.error("Beholder global settings initialization failed.", error);
  }
});
