import { transformPoint } from "./geometry.js";
import { isWallSource, readWallSourceMetadata } from "./model.js";
const ZERO = { x: 0, y: 0 };
const UNIT = { x: 1, y: 1 };
/**
 * Extracts the shared LINE segments that independently block token movement.
 * Vision WALL projections and Light objects are intentionally not consulted.
 */
export function getMovementWallSegments(items) {
    const sources = items.filter(isWallSource);
    return sources.flatMap((source) => {
        const metadata = readWallSourceMetadata(source);
        if (!metadata?.blocking.blocksMovement)
            return [];
        const position = source.position ?? ZERO;
        const scale = source.scale ?? UNIT;
        const rotation = source.rotation ?? 0;
        return [{
                start: transformPoint(source.startPosition, position, rotation, scale),
                end: transformPoint(source.endPosition, position, rotation, scale),
            }];
    });
}
//# sourceMappingURL=collision.js.map