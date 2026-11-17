import type { LineItem, SceneItem } from "../../platform/obr.js";
import { transformPoint } from "./geometry.js";
import type { WallSegment2D } from "./geometry.js";
import { isWallSource, readWallSourceMetadata } from "./model.js";

export type SpatialChannel = "movement" | "vision" | "light";

export interface SpatialWallSegment extends WallSegment2D {
  sourceId: string;
  wallId: string;
  segmentIndex: number;
}

const ZERO = { x: 0, y: 0 };
const UNIT = { x: 1, y: 1 };

/** Query authoritative shared wall geometry for one independent spatial use. */
export function queryWallSegments(items: SceneItem[], channel: SpatialChannel): SpatialWallSegment[] {
  return (items.filter(isWallSource) as LineItem[]).flatMap((source) => {
    const metadata = readWallSourceMetadata(source);
    const blocks = channel === "movement"
      ? metadata?.blocking.blocksMovement
      : channel === "vision"
        ? metadata?.blocking.blocksVision
        : metadata?.blocking.blocksLight;
    if (!metadata || !blocks) return [];
    const position = source.position ?? ZERO;
    const scale = source.scale ?? UNIT;
    const rotation = source.rotation ?? 0;
    return [{
      sourceId: source.id,
      wallId: metadata.wallId,
      segmentIndex: metadata.segmentIndex,
      start: transformPoint(source.startPosition, position, rotation, scale),
      end: transformPoint(source.endPosition, position, rotation, scale),
    }];
  });
}
