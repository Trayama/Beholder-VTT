import { OBR } from "./platform/obr.js";
import { PREFERENCES, readBooleanPreference, writeBooleanPreference } from "./core/preferences.js";

const toolbar = document.querySelector<HTMLInputElement>("#toolbar-visible");
const guides = document.querySelector<HTMLInputElement>("#guides-visible");
const snap = document.querySelector<HTMLInputElement>("#grid-snap");
const roleLabel = document.querySelector<HTMLElement>("#role-label");
const sceneLabel = document.querySelector<HTMLElement>("#scene-label");
const toolbarState = document.querySelector<HTMLElement>("#toolbar-state");

function setChecked(input: HTMLInputElement | null, value: boolean): void {
  if (input) input.checked = value;
}

function bind(input: HTMLInputElement | null, key: string, onChange?: (value: boolean) => void): void {
  if (!input) return;
  input.addEventListener("change", () => {
    const value = input.checked;
    writeBooleanPreference(key, value);
    onChange?.(value);
  });
}

function updateToolbarState(): void {
  if (!toolbarState || !toolbar) return;
  toolbarState.textContent = toolbar.checked ? "已显示" : "已隐藏";
}

setChecked(toolbar, readBooleanPreference(PREFERENCES.toolbar, true));
setChecked(guides, readBooleanPreference(PREFERENCES.guides, true));
setChecked(snap, readBooleanPreference(PREFERENCES.snap, true));
updateToolbarState();

bind(toolbar, PREFERENCES.toolbar, updateToolbarState);
bind(guides, PREFERENCES.guides);
bind(snap, PREFERENCES.snap);

OBR.onReady(async () => {
  try {
    const role = await OBR.player.getRole();
    if (roleLabel) roleLabel.textContent = role === "GM" ? "房主 / GM" : "玩家";
    const ready = await OBR.scene.isReady();
    if (sceneLabel) sceneLabel.textContent = ready ? "场景已就绪" : "当前没有打开场景";
    OBR.scene.onReadyChange((isReady) => {
      if (sceneLabel) sceneLabel.textContent = isReady ? "场景已就绪" : "当前没有打开场景";
    });
    if (role !== "GM") {
      const guideRow = document.querySelector<HTMLElement>("#guide-row");
      if (guideRow) guideRow.hidden = true;
    }
  } catch {
    if (sceneLabel) sceneLabel.textContent = "无法读取场景状态";
  }
});
