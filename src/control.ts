import { OBR } from "./platform/obr.js";
import { PREFERENCES, readBooleanPreference, writeBooleanPreference } from "./core/preferences.js";
import { isWallSource, readWallSourceMetadata } from "./scene/walls/model.js";

const toolbarToggle = document.querySelector<HTMLButtonElement>("#toolbar-toggle");
const freeButton = document.querySelector<HTMLButtonElement>("#snap-free");
const gridButton = document.querySelector<HTMLButtonElement>("#snap-grid");
const endpointSnap = document.querySelector<HTMLInputElement>("#endpoint-snap");
const guidesVisible = document.querySelector<HTMLInputElement>("#guides-visible");
const undoButton = document.querySelector<HTMLButtonElement>("#undo");
const redoButton = document.querySelector<HTMLButtonElement>("#redo");
const clearButton = document.querySelector<HTMLButtonElement>("#clear-walls");
const sceneLabel = document.querySelector<HTMLElement>("#scene-label");
const sceneDot = document.querySelector<HTMLElement>("#scene-dot");
const roleLabel = document.querySelector<HTMLElement>("#role-label");
const wallCount = document.querySelector<HTMLElement>("#wall-count");
const tokenCount = document.querySelector<HTMLElement>("#token-count");
const playerHint = document.querySelector<HTMLElement>("#player-hint");

let isGM = false;
let clearArmedUntil = 0;

function setTab(tab: string): void {
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-tab]"))) {
    button.classList.toggle("active", button.dataset.tab === tab);
  }
  for (const panel of Array.from(document.querySelectorAll<HTMLElement>("[data-panel]"))) {
    panel.hidden = panel.dataset.panel !== tab;
  }
}

for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-tab]"))) {
  button.addEventListener("click", () => setTab(button.dataset.tab ?? "map"));
}

function updateToolbarButton(): void {
  if (!toolbarToggle) return;
  const visible = readBooleanPreference(PREFERENCES.toolbar, true);
  toolbarToggle.textContent = visible ? "隐藏工具" : "显示工具";
}

function updateSnapButtons(): void {
  const grid = readBooleanPreference(PREFERENCES.snap, false);
  freeButton?.classList.toggle("active", !grid);
  gridButton?.classList.toggle("active", grid);
}

function syncPreferences(): void {
  if (endpointSnap) endpointSnap.checked = readBooleanPreference(PREFERENCES.endpointSnap, true);
  if (guidesVisible) guidesVisible.checked = readBooleanPreference(PREFERENCES.guides, true);
  updateSnapButtons();
  updateToolbarButton();
}

function bindToggle(input: HTMLInputElement | null, key: string): void {
  input?.addEventListener("change", () => writeBooleanPreference(key, input.checked));
}

toolbarToggle?.addEventListener("click", () => {
  const next = !readBooleanPreference(PREFERENCES.toolbar, true);
  writeBooleanPreference(PREFERENCES.toolbar, next);
  updateToolbarButton();
});

freeButton?.addEventListener("click", () => {
  writeBooleanPreference(PREFERENCES.snap, false);
  updateSnapButtons();
});

gridButton?.addEventListener("click", () => {
  writeBooleanPreference(PREFERENCES.snap, true);
  updateSnapButtons();
});

bindToggle(endpointSnap, PREFERENCES.endpointSnap);
bindToggle(guidesVisible, PREFERENCES.guides);

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
  if (await OBR.scene.history.canUndo()) await OBR.scene.history.undo();
  await updateHistoryButtons();
});

redoButton?.addEventListener("click", async () => {
  if (await OBR.scene.history.canRedo()) await OBR.scene.history.redo();
  await updateHistoryButtons();
});

clearButton?.addEventListener("click", async () => {
  const now = Date.now();
  if (now > clearArmedUntil) {
    clearArmedUntil = now + 5000;
    clearButton.textContent = "再次点击确认清空";
    clearButton.classList.add("armed");
    return;
  }
  clearArmedUntil = 0;
  const sources = await OBR.scene.items.getItems(isWallSource);
  if (sources.length) await OBR.scene.items.deleteItems(sources.map((source) => source.id));
  clearButton.textContent = "清空本场景墙体";
  clearButton.classList.remove("armed");
});

function updateSceneStats(items: Awaited<ReturnType<typeof OBR.scene.items.getItems>>): void {
  const sources = items.filter(isWallSource);
  const walls = new Set(sources.map((source) => readWallSourceMetadata(source)?.wallId).filter(Boolean));
  const tokens = items.filter((item) => item.layer === "CHARACTER" && item.type === "IMAGE");
  if (wallCount) wallCount.textContent = String(walls.size);
  if (tokenCount) tokenCount.textContent = String(tokens.length);
  void updateHistoryButtons();
}

OBR.onReady(async () => {
  syncPreferences();
  try {
    isGM = (await OBR.player.getRole()) === "GM";
    if (roleLabel) roleLabel.textContent = isGM ? "房主 / GM" : "玩家视图";
    if (!isGM) {
      for (const element of Array.from(document.querySelectorAll<HTMLElement>("[data-gm-only]"))) element.hidden = true;
      if (playerHint) playerHint.hidden = false;
    }

    const ready = await OBR.scene.isReady();
    if (sceneLabel) sceneLabel.textContent = ready ? "场景已就绪" : "等待场景打开";
    if (sceneDot) sceneDot.style.background = ready ? "#6dbb92" : "#d5b574";
    if (ready) updateSceneStats(await OBR.scene.items.getItems());

    OBR.scene.onReadyChange(async (isReady) => {
      if (sceneLabel) sceneLabel.textContent = isReady ? "场景已就绪" : "等待场景打开";
      if (sceneDot) sceneDot.style.background = isReady ? "#6dbb92" : "#d5b574";
      if (isReady) updateSceneStats(await OBR.scene.items.getItems());
    });
    OBR.scene.items.onChange((items) => updateSceneStats(items));
  } catch (error) {
    if (sceneLabel) sceneLabel.textContent = "无法读取场景状态";
    if (sceneDot) sceneDot.style.background = "#c87878";
    console.error("Beholder control panel initialization failed.", error);
  }
});
