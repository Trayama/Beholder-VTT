export const NATIVE_MOVE_TOOL_ID = "rodeo.owlbear.tool/move";
export const NATIVE_MOVE_TOOL_IDS = [
    NATIVE_MOVE_TOOL_ID,
    "rodeo.owlbear.tools/move",
];
export function isNativeMoveTool(toolId) {
    return NATIVE_MOVE_TOOL_IDS.includes(toolId);
}
export const NATIVE_MOVE_COLLISION_MODE_ID = "com.beholder-vtt/native-move-collision";
export const NATIVE_MOVE_PASSTHROUGH_MODE_ID = "com.beholder-vtt/native-move-passthrough";
export const HIDDEN_TOOL_FILTER_ID = "com.beholder-vtt/internal-mode-host";
export function getNativeMoveModeId(takeoverEnabled) {
    return takeoverEnabled
        ? NATIVE_MOVE_COLLISION_MODE_ID
        : NATIVE_MOVE_PASSTHROUGH_MODE_ID;
}
export function isNativeMoveTransformer(event) {
    return event.transformer === true;
}
//# sourceMappingURL=movement-tool-utils.js.map