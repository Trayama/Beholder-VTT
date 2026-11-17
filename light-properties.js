import { OBR } from "./platform/obr.js";
import { isLightSource, readLightSourceMetadata, updateLightSourceMetadata } from "./scene/lighting/model.js";
const TOOL_ID = "com.beholder-vtt/lighting";
const POPOVER_ID = "com.beholder-vtt/light-properties";
const status = document.querySelector("#status");
const radius = document.querySelector("#radius");
const sourceRadius = document.querySelector("#source-radius");
const falloff = document.querySelector("#falloff");
const innerAngle = document.querySelector("#inner-angle");
const outerAngle = document.querySelector("#outer-angle");
const lightSelect = document.querySelector("#light-source");
const tokenSelect = document.querySelector("#attached-token");
const save = document.querySelector("#save");
const cancel = document.querySelector("#cancel");
const remove = document.querySelector("#delete-light");
let lightSources = [];
let activeSource = null;
function loadLight(source) {
    activeSource = source;
    const light = readLightSourceMetadata(source);
    if (!light)
        return;
    if (radius)
        radius.value = String(light.attenuationRadius);
    if (sourceRadius)
        sourceRadius.value = String(light.sourceRadius);
    if (falloff)
        falloff.value = String(light.falloff);
    if (innerAngle)
        innerAngle.value = String(light.innerAngle);
    if (outerAngle)
        outerAngle.value = String(light.outerAngle);
    if (tokenSelect)
        tokenSelect.value = source.attachedTo ?? "";
}
function message(value) {
    if (status)
        status.textContent = value;
}
OBR.onReady(async () => {
    cancel?.addEventListener("click", () => void OBR.popover.close(POPOVER_ID));
    remove?.addEventListener("click", async () => {
        if (!activeSource || !(await OBR.player.getRole() === "GM"))
            return;
        if (!window.confirm("确定删除当前光源？"))
            return;
        try {
            await OBR.scene.items.deleteItems([activeSource.id]);
            await OBR.tool.setMetadata(TOOL_ID, { selectedLightSourceId: null });
            await OBR.popover.close(POPOVER_ID);
        }
        catch (error) {
            message("删除失败：" + (error instanceof Error ? error.message : "未知错误"));
        }
    });
    try {
        const metadata = await OBR.tool.getMetadata(TOOL_ID);
        const selectedId = typeof metadata.selectedLightSourceId === "string" ? metadata.selectedLightSourceId : "";
        lightSources = (await OBR.scene.items.getItems(isLightSource)).sort((a, b) => a.id.localeCompare(b.id));
        const tokens = (await OBR.scene.items.getItems()).filter((item) => item.type === "IMAGE" && (item.layer === "CHARACTER" || item.layer === "MOUNT"));
        if (!lightSources.length) {
            message("场景中还没有光源。请先使用光源工具点击地图放置。");
            if (save)
                save.disabled = true;
            return;
        }
        if (lightSelect) {
            lightSelect.replaceChildren(...lightSources.map((item, index) => new Option(`光源 ${index + 1}`, item.id)));
            lightSelect.value = lightSources.some((item) => item.id === selectedId) ? selectedId : lightSources[0].id;
            lightSelect.addEventListener("change", () => {
                const next = lightSources.find((item) => item.id === lightSelect.value);
                if (next)
                    loadLight(next);
            });
        }
        if (tokenSelect) {
            tokenSelect.replaceChildren(new Option("不绑定", ""));
            for (const token of tokens)
                tokenSelect.add(new Option(`${token.name || token.id} (${token.layer})`, token.id));
        }
        loadLight(lightSources.find((item) => item.id === lightSelect?.value) ?? lightSources[0]);
        message("选择光源进行编辑，或将其绑定到角色棋子。");
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
                message("请检查半径、衰减和角度的数值。");
                save.disabled = false;
                return;
            }
            try {
                if (!activeSource)
                    throw new Error("请先选择光源。");
                await OBR.scene.items.updateItems([activeSource], (drafts) => {
                    for (const draft of drafts) {
                        if (!updateLightSourceMetadata(draft, {
                            attenuationRadius,
                            sourceRadius: sourceRadiusValue,
                            falloff: falloffValue,
                            innerAngle: inner,
                            outerAngle: outer,
                        }))
                            throw new Error("光源参数无效。");
                        if (tokenSelect?.value)
                            draft.attachedTo = tokenSelect.value;
                        else
                            delete draft.attachedTo;
                    }
                });
                await OBR.tool.setMetadata(TOOL_ID, { selectedLightSourceId: activeSource.id });
                message("光源设置已保存并同步。");
                await OBR.popover.close(POPOVER_ID);
            }
            catch (error) {
                message("保存光源失败：" + (error instanceof Error ? error.message : "未知错误"));
                save.disabled = false;
            }
        });
    }
    catch (error) {
        message("读取光源失败：" + (error instanceof Error ? error.message : "未知错误"));
        if (save)
            save.disabled = true;
    }
});
//# sourceMappingURL=light-properties.js.map