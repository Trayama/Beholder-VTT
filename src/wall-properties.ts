import { OBR } from "./platform/obr.js";
import { isWallSource, readWallSourceMetadata, WALL_SOURCE_KEY } from "./scene/walls/model.js";
import type { WallSourceMetadata } from "./scene/walls/model.js";

const TOOL_ID = "com.beholder-vtt/wall-editor";
const POPOVER_ID = "com.beholder-vtt/wall-properties";
const status = document.querySelector<HTMLElement>("#status");
const movement = document.querySelector<HTMLInputElement>("#blocks-movement");
const vision = document.querySelector<HTMLInputElement>("#blocks-vision");
const light = document.querySelector<HTMLInputElement>("#blocks-light");
const save = document.querySelector<HTMLButtonElement>("#save");
const cancel = document.querySelector<HTMLButtonElement>("#cancel");

function message(value: string): void {
  if (status) status.textContent = value;
}

OBR.onReady(async () => {
  try {
    const toolMetadata = await OBR.tool.getMetadata(TOOL_ID);
    const wallId = typeof toolMetadata.selectedWallId === "string" ? toolMetadata.selectedWallId : "";
    if (!wallId) {
      message("请先在地图上选择一段墙体。");
      if (save) save.disabled = true;
      return;
    }
    const sources = await OBR.scene.items.getItems(isWallSource);
    const selected = sources.find((item) => readWallSourceMetadata(item)?.wallId === wallId);
    const metadata = selected ? readWallSourceMetadata(selected) : null;
    if (!metadata) {
      message("选中的墙体已不存在，请重新选择。");
      if (save) save.disabled = true;
      return;
    }
    const group = sources.filter((item) => readWallSourceMetadata(item)?.wallId === wallId);
    if (movement) movement.checked = metadata.blocking.blocksMovement;
    if (vision) vision.checked = metadata.blocking.blocksVision;
    if (light) light.checked = metadata.blocking.blocksLight;
    message("已选中 " + group.length + " 段墙体。属性将应用到整条墙体。");

    save?.addEventListener("click", async () => {
      try {
        const blocking = {
          blocksMovement: movement?.checked ?? true,
          blocksVision: vision?.checked ?? true,
          blocksLight: light?.checked ?? true,
        };
        const ids = new Set(group.map((item) => item.id));
        await OBR.scene.items.updateItems(
          (item) => ids.has(item.id),
          (drafts) => {
            for (const draft of drafts) {
              const raw = draft.metadata[WALL_SOURCE_KEY] as WallSourceMetadata | undefined;
              if (!raw) continue;
              draft.metadata[WALL_SOURCE_KEY] = { ...raw, revision: raw.revision + 1, blocking };
            }
          },
        );
        await OBR.notification.show("墙体属性已保存。", "SUCCESS");
        await OBR.popover.close(POPOVER_ID);
      } catch (error) {
        message("保存失败：" + (error instanceof Error ? error.message : "未知错误"));
      }
    });
    cancel?.addEventListener("click", () => void OBR.popover.close(POPOVER_ID));
  } catch (error) {
    message("无法读取墙体属性：" + (error instanceof Error ? error.message : "未知错误"));
  }
});
