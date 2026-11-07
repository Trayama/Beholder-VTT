export function isLikelyNativeSelectTool(toolId: string): boolean {
  return /(^|\/)select$/i.test(toolId);
}
