import { OBR } from "./platform/obr.js";
import { PREFERENCES, readBooleanPreference, writeBooleanPreference } from "./core/preferences.js";

const POPOVER_ID = "com.beholder-vtt/movement-settings";
const groupMovement = document.querySelector<HTMLInputElement>("#group-movement");
const closeButton = document.querySelector<HTMLButtonElement>("#close");

OBR.onReady(() => {
  if (groupMovement) {
    groupMovement.checked = readBooleanPreference(PREFERENCES.groupMovement, true);
    groupMovement.addEventListener("change", () => {
      writeBooleanPreference(PREFERENCES.groupMovement, groupMovement.checked);
    });
  }
  closeButton?.addEventListener("click", () => void OBR.popover.close(POPOVER_ID));
});
