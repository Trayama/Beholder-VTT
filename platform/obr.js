/**
 * Narrow Owlbear SDK adapter.
 *
 * The browser resolves @owlbear-rodeo/sdk through the import map in
 * background.html. Keeping the SDK surface behind this adapter prevents
 * scene modules from depending on the full extension API.
 */
// @ts-ignore -- resolved by Owlbear's browser import map at runtime.
import OBRRuntime, { buildLine as sdkBuildLine, buildWall as sdkBuildWall, buildLight as sdkBuildLight } from "@owlbear-rodeo/sdk";
export const OBR = OBRRuntime;
export const buildLine = sdkBuildLine;
export const buildWall = sdkBuildWall;
export const buildLight = sdkBuildLight;
//# sourceMappingURL=obr.js.map