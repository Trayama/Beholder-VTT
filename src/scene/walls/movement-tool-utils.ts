export const NATIVE_MOVE_TOOL_ID = "rodeo.owlbear.tools/move";

export function isNativeMoveTool(toolId: string): boolean {
  return toolId === NATIVE_MOVE_TOOL_ID;
}
