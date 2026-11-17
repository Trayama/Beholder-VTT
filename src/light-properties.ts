import { OBR } from "./platform/obr.js";
import { isLightSource, readLightSourceMetadata, updateLightSourceMetadata } from "./scene/lighting/model.js";

const TOOL_ID = "com.beholder-vtt/lighting";
const POPOVER_ID = "com.beholder-vtt/light-properties";
const status = document.querySelector<HTMLElement>("#status");
const radius = document.querySelector<HTMLInputElement>("#radius");
const sourceRadius = document.querySelector<HTMLInputElement>("#source-radius");
const falloff = document.querySelector<HTMLInputElement>("#falloff");
const innerAngle = document.querySelector<HTMLInputElement>("#inner-angle");
const outerAngle = document.querySelector<HTMLInputElement>("#outer-angle");
const save = document.querySelector<HTMLButtonElement>("#save");
const cancel = document.querySelector<HTMLButtonElement>("#cancel");

function message(value: string): void {
  if (status) status.textContent = value;
}

OBR.onReady(async () => {
  cancel?.addEventListener("click", () => void OBR.popover.close(POPOVER_ID));
  try {
    const metadata = await OBR.tool.getMetadata(TOOL_ID);
    const sourceId = typeof metadata.selectedLightSourceId === "string" ? metadata.selectedLightSourceId : "";
    const lightSource = (await OBR.scene.items.getItems(isLightSource)).find((item) => item.id === sourceId);
    const light = lightSource ? readLightSourceMetadata(lightSource) : null;
    if (!lightSource || !light) {
      message("Place a light first, then reopen its properties.");
      if (save) save.disabled = true;
      return;
    }
    if (radius) radius.value = String(light.attenuationRadius);
    if (sourceRadius) sourceRadius.value = String(light.sourceRadius);
    if (falloff) falloff.value = String(light.falloff);
    if (innerAngle) innerAngle.value = String(light.innerAngle);
    if (outerAngle) outerAngle.value = String(light.outerAngle);
    message("Editing the most recently placed shared light.");

    save?.addEventListener("click", async () => {
      save.disabled = true;
      const attenuationRadius = Number(radius?.value);
      const sourceRadiusValue = Number(sourceRadius?.value);
      const falloffValue = Number(falloff?.value);
      const inner = Number(innerAngle?.value);
      const outer = Number(outerAngle?.value);
      if (!Number.isFinite(attenuationRadius) || attenuationRadius <= 0 ||
          !Number.isFinite(sourceRadiusValue) || sourceRadiusValue < 0 ||
          !Number.isFinite(falloffValue) || falloffValue < 0 ||
          !Number.isFinite(inner) || inner < 0 || inner > 360 ||
          !Number.isFinite(outer) || outer < inner || outer > 360) {
        message("Check the radius, falloff, and cone angles.");
        save.disabled = false;
        return;
      }
      try {
        await OBR.scene.items.updateItems([lightSource], (drafts) => {
          for (const draft of drafts) {
            updateLightSourceMetadata(draft, {
              attenuationRadius,
              sourceRadius: sourceRadiusValue,
              falloff: falloffValue,
              innerAngle: inner,
              outerAngle: outer,
            });
          }
        });
        message("Light properties saved and synchronized.");
        await OBR.popover.close(POPOVER_ID);
      } catch (error) {
        message("Could not save light properties: " + (error instanceof Error ? error.message : "unknown error"));
        save.disabled = false;
      }
    });
  } catch (error) {
    message("Could not read light properties: " + (error instanceof Error ? error.message : "unknown error"));
    if (save) save.disabled = true;
  }
});
