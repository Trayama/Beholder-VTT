import { transformPoint } from "./geometry.js";
import { isWallSource, readWallSourceMetadata } from "./model.js";
const ZERO = { x: 0, y: 0 };
const UNIT = { x: 1, y: 1 };
/** Query authoritative shared wall geometry for one independent spatial use. */
export function queryWallSegments(items, channel) {
    return items.filter(isWallSource).flatMap((source) => {
        const metadata = readWallSourceMetadata(source);
        const blocks = channel === "movement"
            ? metadata?.blocking.blocksMovement
            : channel === "vision"
                ? metadata?.blocking.blocksVision
                : metadata?.blocking.blocksLight;
        if (!metadata || !blocks)
            return [];
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
//# sourceMappingURL=spatial-query.js.map