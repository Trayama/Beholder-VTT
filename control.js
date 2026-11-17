import { OBR } from "./platform/obr.js";
import { PREFERENCES, readBooleanPreference, writeBooleanPreference } from "./core/preferences.js";
import { isWallSource, readWallSourceMetadata } from "./scene/walls/model.js";
import { setDoorOpenDraft } from "./scene/walls/source.js";
const toolbarToggle = document.querySelector("#toolbar-toggle");
const actionStatus = document.querySelector("#action-status");
const sceneLabel = document.querySelector("#scene-label");
const sceneDot = document.querySelector("#scene-dot");
const roleLabel = document.querySelector("#role-label");
const wallCount = document.querySelector("#wall-count");
const tokenCount = document.querySelector("#token-count");
const activeToolLabel = document.querySelector("#active-tool-id");
const fogFill = document.querySelector("#fog-fill");
const fogColor = document.querySelector("#fog-color");
const fogStroke = document.querySelector("#fog-stroke");
const fogSave = document.querySelector("#fog-save");
const doorList = document.querySelector("#door-list");
let canManageDoors = false;
function updateDoors(items) {
    if (!doorList || !canManageDoors)
        return;
    const doors = items.filter((item) => isWallSource(item) && readWallSourceMetadata(item)?.kind === "door")
        .sort((a, b) => a.id.localeCompare(b.id));
    doorList.replaceChildren();
    if (!doors.length) {
        doorList.textContent = "当前场景没有门。";
        return;
    }
    doors.forEach((door, index) => {
        const metadata = readWallSourceMetadata(door);
        if (!metadata)
            return;
        const row = document.createElement("div");
        row.className = "setting-row";
        const label = document.createElement("span");
        label.textContent = `门 ${index + 1} · ${metadata.open ? "已打开" : "已关闭"}`;
        const button = document.createElement("button");
        button.className = "secondary";
        button.textContent = metadata.open ? "关门" : "开门";
        button.addEventListener("click", async () => {
            button.disabled = true;
            try {
                await OBR.scene.items.updateItems([door], (drafts) => {
                    for (const draft of drafts) {
                        const current = readWallSourceMetadata(draft);
                        if (current?.kind === "door")
                            setDoorOpenDraft(draft, !current.open);
                    }
                });
            }
            catch (error) {
                setStatus("门操作失败：" + (error instanceof Error ? error.message : "未知错误"));
                button.disabled = false;
            }
        });
        row.append(label, button);
        doorList.append(row);
    });
}
function setStatus(message) {
    if (actionStatus)
        actionStatus.textContent = message;
}
function updateToolbarButton() {
    if (!toolbarToggle)
        return;
    toolbarToggle.textContent = readBooleanPreference(PREFERENCES.toolbar, true) ? "隐藏" : "显示";
}
function syncPreferences() {
    updateToolbarButton();
}
toolbarToggle?.addEventListener("click", () => {
    const next = !readBooleanPreference(PREFERENCES.toolbar, true);
    writeBooleanPreference(PREFERENCES.toolbar, next);
    updateToolbarButton();
    setStatus(next ? "墙体工具栏已显示。" : "墙体工具栏已隐藏。");
});
function updateSceneStats(items) {
    const sources = items.filter(isWallSource);
    const walls = new Set(sources.map((source) => readWallSourceMetadata(source)?.wallId).filter(Boolean));
    const tokens = items.filter((item) => item.type === "IMAGE" && (item.layer === "CHARACTER" || item.layer === "MOUNT"));
    if (wallCount)
        wallCount.textContent = String(walls.size);
    if (tokenCount)
        tokenCount.textContent = String(tokens.length);
}
async function updateActiveToolLabel() {
    try {
        if (activeToolLabel)
            activeToolLabel.textContent = await OBR.tool.getActiveTool();
    }
    catch {
        if (activeToolLabel)
            activeToolLabel.textContent = "无法读取";
    }
}
OBR.onReady(async () => {
    syncPreferences();
    try {
        const isGM = (await OBR.player.getRole()) === "GM";
        canManageDoors = isGM;
        if (roleLabel)
            roleLabel.textContent = isGM ? "主持人 / GM" : "玩家";
        if (!isGM) {
            for (const element of Array.from(document.querySelectorAll("[data-gm-only]"))) {
                element.hidden = true;
            }
            const hint = document.querySelector("#client-hint");
            if (hint)
                hint.textContent = "玩家可查看当前状态。";
        }
        if (isGM && fogFill && fogColor && fogStroke) {
            const [filled, color, strokeWidth] = await Promise.all([
                OBR.scene.fog.getFilled(),
                OBR.scene.fog.getColor(),
                OBR.scene.fog.getStrokeWidth(),
            ]);
            fogFill.checked = filled;
            fogColor.value = /^#[0-9a-f]{6}$/i.test(color) ? color : "#111820";
            fogStroke.value = String(strokeWidth);
            fogSave?.addEventListener("click", async () => {
                const width = Number(fogStroke.value);
                if (!Number.isFinite(width) || width < 1 || width > 200) {
                    setStatus("迷雾画笔宽度须在 1 至 200 之间。");
                    return;
                }
                try {
                    await OBR.scene.fog.setColor(fogColor.value);
                    await OBR.scene.fog.setStrokeWidth(width);
                    await OBR.scene.fog.setFilled(fogFill.checked);
                    setStatus("迷雾设置已保存。");
                }
                catch (error) {
                    setStatus("Could not save scene fog: " + (error instanceof Error ? error.message : "unknown error"));
                }
            });
        }
        await updateActiveToolLabel();
        OBR.tool.onToolChange((toolId) => {
            if (activeToolLabel)
                activeToolLabel.textContent = toolId;
        });
        window.addEventListener("storage", (event) => {
            if (event.key === PREFERENCES.toolbar) {
                syncPreferences();
            }
        });
        const ready = await OBR.scene.isReady();
        if (sceneLabel)
            sceneLabel.textContent = ready ? "场景已就绪" : "等待场景";
        if (sceneDot)
            sceneDot.style.background = ready ? "#6dbb92" : "#d5b574";
        if (ready) {
            const items = await OBR.scene.items.getItems();
            updateSceneStats(items);
            updateDoors(items);
        }
        OBR.scene.onReadyChange(async (isReady) => {
            if (sceneLabel)
                sceneLabel.textContent = isReady ? "场景已就绪" : "等待场景";
            if (sceneDot)
                sceneDot.style.background = isReady ? "#6dbb92" : "#d5b574";
            if (isReady) {
                const items = await OBR.scene.items.getItems();
                updateSceneStats(items);
                updateDoors(items);
            }
        });
        OBR.scene.items.onChange(updateSceneStats);
        OBR.scene.items.onChange(updateDoors);
    }
    catch (error) {
        if (sceneLabel)
            sceneLabel.textContent = "无法读取场景状态";
        if (sceneDot)
            sceneDot.style.background = "#c87878";
        setStatus("总设置初始化失败：" + (error instanceof Error ? error.message : "未知错误"));
        console.error("Beholder global settings initialization failed.", error);
    }
});
//# sourceMappingURL=control.js.map