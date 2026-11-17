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
const lightSelect = document.querySelector<HTMLSelectElement>("#light-source");
const tokenSelect = document.querySelector<HTMLSelectElement>("#attached-token");
const save = document.querySelector<HTMLButtonElement>("#save");
const cancel = document.querySelector<HTMLButtonElement>("#cancel");
let lightSources: Awaited<ReturnType<typeof OBR.scene.items.getItems>> = [];
let activeSource: (typeof lightSources)[number] | null = null;

function loadLight(source: (typeof lightSources)[number]): void {
  activeSource = source;
  const light = readLightSourceMetadata(source);
  if (!light) return;
  if (radius) radius.value = String(light.attenuationRadius);
  if (sourceRadius) sourceRadius.value = String(light.sourceRadius);
  if (falloff) falloff.value = String(light.falloff);
  if (innerAngle) innerAngle.value = String(light.innerAngle);
  if (outerAngle) outerAngle.value = String(light.outerAngle);
  if (tokenSelect) tokenSelect.value = source.attachedTo ?? "";
}

function message(value: string): void {
  if (status) status.textContent = value;
}

OBR.onReady(async () => {
  cancel?.addEventListener("click", () => void OBR.popover.close(POPOVER_ID));
  try {
    const metadata = await OBR.tool.getMetadata(TOOL_ID);
    const selectedId = typeof metadata.selectedLightSourceId === "string" ? metadata.selectedLightSourceId : "";
    lightSources = (await OBR.scene.items.getItems(isLightSource)).sort((a, b) => a.id.localeCompare(b.id));
    const tokens = (await OBR.scene.items.getItems()).filter((item) =>
      item.type === "IMAGE" && (item.layer === "CHARACTER" || item.layer === "MOUNT")
    );
    if (!lightSources.length) {
      message("There are no shared lights in this scene yet.");
      if (save) save.disabled = true;
      return;
    }
    if (lightSelect) {
      lightSelect.replaceChildren(...lightSources.map((item, index) => new Option(`Light ${index + 1}`, item.id)));
      lightSelect.value = lightSources.some((item) => item.id === selectedId) ? selectedId : lightSources[0]!.id;
      lightSelect.addEventListener("change", () => {
        const next = lightSources.find((item) => item.id === lightSelect.value);
        if (next) loadLight(next);
      });
    }
    if (tokenSelect) {
      tokenSelect.replaceChildren(new Option("No attachment", ""));
      for (const token of tokens) tokenSelect.add(new Option(`${token.name || token.id} (${token.layer})`, token.id));
    }
    loadLight(lightSources.find((item) => item.id === lightSelect?.value) ?? lightSources[0]!);
    message("Choose any shared light to edit or attach it to a character token.");

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
        if (!activeSource) throw new Error("Select a light first.");
        await OBR.scene.items.updateItems([activeSource], (drafts) => {
          for (const draft of drafts) {
            updateLightSourceMetadata(draft, {
              attenuationRadius,
              sourceRadius: sourceRadiusValue,
              falloff: falloffValue,
              innerAngle: inner,
              outerAngle: outer,
            });
            if (tokenSelect?.value) draft.attachedTo = tokenSelect.value;
            else delete draft.attachedTo;
          }
        });
        await OBR.tool.setMetadata(TOOL_ID, { selectedLightSourceId: activeSource.id });
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
