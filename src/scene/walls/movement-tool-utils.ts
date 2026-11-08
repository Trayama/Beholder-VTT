export const NATIVE_MOVE_TOOL_ID = "rodeo.owlbear.tool/move";
export const NATIVE_MOVE_TOOL_IDS = [
  NATIVE_MOVE_TOOL_ID,
  "rodeo.owlbear.tools/move",
] as const;

export function isNativeMoveTool(toolId: string): boolean {
  return (NATIVE_MOVE_TOOL_IDS as readonly string[]).includes(toolId);
}

export const NATIVE_MOVE_COLLISION_MODE_ID = "com.beholder-vtt/native-move-collision";
export const NATIVE_MOVE_PASSTHROUGH_MODE_ID = "com.beholder-vtt/native-move-passthrough";
export const HIDDEN_TOOL_FILTER_ID = "com.beholder-vtt/internal-mode-host";

export function getNativeMoveModeId(takeoverEnabled: boolean): string {
  return takeoverEnabled
    ? NATIVE_MOVE_COLLISION_MODE_ID
    : NATIVE_MOVE_PASSTHROUGH_MODE_ID;
}

export function isNativeMoveTransformer(event: { transformer?: boolean }): boolean {
  return event.transformer === true;
}
