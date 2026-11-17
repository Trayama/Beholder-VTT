import type { SceneItem } from "../../platform/obr.js";
import type { WallSegment2D } from "./geometry.js";
import { queryWallSegments } from "./spatial-query.js";

/**
 * Extracts the shared LINE segments that independently block token movement.
 * Vision WALL projections and Light objects are intentionally not consulted.
 */
export function getMovementWallSegments(items: SceneItem[]): WallSegment2D[] {
  return queryWallSegments(items, "movement").map(({ start, end }) => ({ start, end }));
}
