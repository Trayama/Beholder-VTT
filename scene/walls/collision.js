import { queryWallSegments } from "./spatial-query.js";
/**
 * Extracts the shared LINE segments that independently block token movement.
 * Vision WALL projections and Light objects are intentionally not consulted.
 */
export function getMovementWallSegments(items) {
    return queryWallSegments(items, "movement").map(({ start, end }) => ({ start, end }));
}
//# sourceMappingURL=collision.js.map