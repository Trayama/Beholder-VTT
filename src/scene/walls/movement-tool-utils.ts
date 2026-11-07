export const NATIVE_MOVE_TOOL_ID = "rodeo.owlbear.tools/move";

export function isNativeMoveTool(toolId: string): boolean {
  return toolId === NATIVE_MOVE_TOOL_ID;
}

export const NATIVE_MOVE_COLLISION_MODE_ID = "com.beholder-vtt/native-move-collision";
export const NATIVE_MOVE_PASSTHROUGH_MODE_ID = "com.beholder-vtt/native-move-passthrough";
export const HIDDEN_TOOL_FILTER_ID = "com.beholder-vtt/internal-mode-host";

export function getNativeMoveModeId(takeoverEnabled: boolean): string {
  return takeoverEnabled
    ? NATIVE_MOVE_COLLISION_MODE_ID
    : NATIVE_MOVE_PASSTHROUGH_MODE_ID;
}

export function shouldDelegateNativeMove(event: {
  target?: { layer?: string; locked?: boolean };
  transformer?: boolean;
}): boolean {
  return event.transformer === true ||
    !event.target ||
    event.target.locked === true ||
    (event.target.layer !== "CHARACTER" && event.target.layer !== "MOUNT");
}
