import { OBR } from "./platform/obr.js";
import { isWallSource, readWallSourceMetadata, WALL_SOURCE_KEY } from "./scene/walls/model.js";
const TOOL_ID = "com.beholder-vtt/wall-editor";
const POPOVER_ID = "com.beholder-vtt/wall-properties";
const status = document.querySelector("#status");
const movement = document.querySelector("#blocks-movement");
const vision = document.querySelector("#blocks-vision");
const light = document.querySelector("#blocks-light");
const save = document.querySelector("#save");
const cancel = document.querySelector("#cancel");
function message(value) {
    if (status)
        status.textContent = value;
}
OBR.onReady(async () => {
    cancel?.addEventListener("click", () => void OBR.popover.close(POPOVER_ID));
    try {
        const toolMetadata = await OBR.tool.getMetadata(TOOL_ID);
        const wallId = typeof toolMetadata.selectedWallId === "string" ? toolMetadata.selectedWallId : "";
        if (!wallId) {
            message("请先在地图上选择一条墙体。");
            if (save)
                save.disabled = true;
            return;
        }
        const sources = await OBR.scene.items.getItems(isWallSource);
        const group = sources.filter((item) => readWallSourceMetadata(item)?.wallId === wallId);
        const metadata = group[0] ? readWallSourceMetadata(group[0]) : null;
        if (!metadata || group.length === 0) {
            message("选中的墙体已不存在，请重新选择。");
            if (save)
                save.disabled = true;
            return;
        }
        if (movement)
            movement.checked = metadata.blocking.blocksMovement;
        if (vision)
            vision.checked = metadata.blocking.blocksVision;
        if (light)
            light.checked = metadata.blocking.blocksLight;
        message("已选中 " + group.length + " 段墙体。修改后统一应用到整条墙体。");
        save?.addEventListener("click", async () => {
            save.disabled = true;
            try {
                const blocking = {
                    blocksMovement: movement?.checked ?? true,
                    blocksVision: vision?.checked ?? true,
                    blocksLight: light?.checked ?? true,
                };
                const ids = new Set(group.map((item) => item.id));
                await OBR.scene.items.updateItems((item) => ids.has(item.id), (drafts) => {
                    for (const draft of drafts) {
                        const raw = draft.metadata[WALL_SOURCE_KEY];
                        if (!raw)
                            continue;
                        draft.metadata[WALL_SOURCE_KEY] = { ...raw, revision: raw.revision + 1, blocking };
                    }
                });
                message("属性已保存。");
                await OBR.popover.close(POPOVER_ID);
            }
            catch (error) {
                message("保存失败：" + (error instanceof Error ? error.message : "未知错误"));
                save.disabled = false;
            }
        });
    }
    catch (error) {
        message("无法读取墙体属性：" + (error instanceof Error ? error.message : "未知错误"));
        if (save)
            save.disabled = true;
    }
});
//# sourceMappingURL=wall-properties.js.map