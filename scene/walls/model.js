export const WALL_SOURCE_KEY = "com.beholder-vtt/wall-source";
export const LOCAL_WALL_KEY = "com.beholder-vtt/local-wall";
export const LOCAL_GUIDE_KEY = "com.beholder-vtt/local-guide";
export const WALL_AWARE_MOVE_KEY = "com.beholder-vtt/wall-aware-move";
export const WALL_SCHEMA_VERSION = 1;
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isBlocking(value) {
    if (!isRecord(value))
        return false;
    return typeof value.blocksMovement === "boolean" &&
        typeof value.blocksVision === "boolean" &&
        typeof value.blocksLight === "boolean";
}
/**
 * The movement system identifies tokens by Owlbear item type and layer only.
 * It deliberately does not inspect Light attachments, player ownership or
 * which client created the token.
 */
export function isMovableToken(item) {
    return item.type === "IMAGE" && (item.layer === "CHARACTER" || item.layer === "MOUNT");
}
export function createWallAwareMoveMarker() {
    return { schemaVersion: 1, nonce: crypto.randomUUID() };
}
export function hasWallAwareMoveMarker(item) {
    const raw = item.metadata?.[WALL_AWARE_MOVE_KEY];
    return isRecord(raw) && raw.schemaVersion === 1 && typeof raw.nonce === "string";
}
export function createDefaultWallMetadata(wallId) {
    return {
        schemaVersion: WALL_SCHEMA_VERSION,
        wallId,
        segmentIndex: 0,
        segmentCount: 1,
        revision: 1,
        blocking: {
            blocksMovement: true,
            blocksVision: true,
            blocksLight: true,
        },
    };
}
export function readWallSourceMetadata(item) {
    const raw = item.metadata?.[WALL_SOURCE_KEY];
    if (!isRecord(raw))
        return null;
    if (raw.schemaVersion !== WALL_SCHEMA_VERSION)
        return null;
    if (typeof raw.wallId !== "string" || raw.wallId.length === 0)
        return null;
    if (!Number.isInteger(raw.segmentIndex) || raw.segmentIndex < 0)
        return null;
    if (!Number.isInteger(raw.segmentCount) || raw.segmentCount < 1)
        return null;
    if (!Number.isInteger(raw.revision) || raw.revision < 1)
        return null;
    if (!isBlocking(raw.blocking))
        return null;
    return raw;
}
export function readLocalWallMetadata(item) {
    const raw = item.metadata?.[LOCAL_WALL_KEY];
    if (!isRecord(raw))
        return null;
    if (raw.schemaVersion !== WALL_SCHEMA_VERSION)
        return null;
    if (typeof raw.sourceId !== "string" || raw.sourceId.length === 0)
        return null;
    if (!Number.isInteger(raw.sourceRevision) || raw.sourceRevision < 1)
        return null;
    return raw;
}
export function isWallSource(item) {
    return item.type === "LINE" &&
        !!item.startPosition &&
        !!item.endPosition &&
        !!readWallSourceMetadata(item);
}
export function isLocalWall(item) {
    return item.type === "WALL" && !!readLocalWallMetadata(item);
}
export function readLocalGuideMetadata(item) {
    const raw = item.metadata?.[LOCAL_GUIDE_KEY];
    if (!isRecord(raw))
        return null;
    if (raw.schemaVersion !== WALL_SCHEMA_VERSION)
        return null;
    if (typeof raw.sourceId !== "string" || raw.sourceId.length === 0)
        return null;
    if (!Number.isInteger(raw.sourceRevision) || raw.sourceRevision < 1)
        return null;
    return raw;
}
export function isLocalGuide(item) {
    return item.type === "LINE" && !!readLocalGuideMetadata(item);
}
//# sourceMappingURL=model.js.map