import type { LineItem, SceneItem, Vector2 } from "../../platform/obr.js";
import { transformPoint } from "./geometry.js";
import type { WallSegment2D } from "./geometry.js";
import { isWallSource, readWallSourceMetadata } from "./model.js";

const ZERO: Vector2 = { x: 0, y: 0 };
const UNIT: Vector2 = { x: 1, y: 1 };

/**
 * Extracts the shared LINE segments that independently block token movement.
 * Vision WALL projections and Light objects are intentionally not consulted.
 */
export function getMovementWallSegments(items: SceneItem[]): WallSegment2D[] {
  const sources = items.filter(isWallSource) as LineItem[];
  return sources.flatMap((source) => {
    const metadata = readWallSourceMetadata(source);
    if (!metadata?.blocking.blocksMovement) return [];
    const position = source.position ?? ZERO;
    const scale = source.scale ?? UNIT;
    const rotation = source.rotation ?? 0;
    return [{
      start: transformPoint(source.startPosition, position, rotation, scale),
      end: transformPoint(source.endPosition, position, rotation, scale),
    }];
  });
}
