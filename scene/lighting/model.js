export const LIGHT_SOURCE_KEY = "com.beholder-vtt/light-source";
export const LOCAL_LIGHT_KEY = "com.beholder-vtt/local-light";
export const LIGHT_SCHEMA_VERSION = 1;
export function lightAttachmentTarget(source) {
    return source.attachedTo || source.id;
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function createLightMetadata(lightId) {
    return {
        schemaVersion: LIGHT_SCHEMA_VERSION,
        lightId,
        revision: 1,
        attenuationRadius: 240,
        sourceRadius: 8,
        falloff: 0.75,
        innerAngle: 360,
        outerAngle: 360,
        lightType: "PRIMARY",
    };
}
export function readLightSourceMetadata(item) {
    const raw = item.metadata?.[LIGHT_SOURCE_KEY];
    if (!isRecord(raw) || raw.schemaVersion !== LIGHT_SCHEMA_VERSION)
        return null;
    if (typeof raw.lightId !== "string" || raw.lightId.length === 0)
        return null;
    if (!Number.isInteger(raw.revision) || raw.revision < 1)
        return null;
    if (typeof raw.attenuationRadius !== "number" || raw.attenuationRadius <= 0)
        return null;
    if (typeof raw.sourceRadius !== "number" || raw.sourceRadius < 0)
        return null;
    if (typeof raw.falloff !== "number" || raw.falloff < 0)
        return null;
    if (typeof raw.innerAngle !== "number" || raw.innerAngle < 0 || raw.innerAngle > 360)
        return null;
    if (typeof raw.outerAngle !== "number" || raw.outerAngle < raw.innerAngle || raw.outerAngle > 360)
        return null;
    if (raw.lightType !== "PRIMARY" && raw.lightType !== "SECONDARY" && raw.lightType !== "AUXILIARY")
        return null;
    return raw;
}
export function updateLightSourceMetadata(item, update) {
    const current = readLightSourceMetadata(item);
    if (!current)
        return false;
    const next = { ...current, ...update, revision: current.revision + 1 };
    const candidate = { ...item, metadata: { ...item.metadata, [LIGHT_SOURCE_KEY]: next } };
    if (!readLightSourceMetadata(candidate))
        return false;
    item.metadata = { ...item.metadata, [LIGHT_SOURCE_KEY]: next };
    return true;
}
export function isLightSource(item) {
    return item.type === "LINE" && !!item.startPosition && !!item.endPosition && !!readLightSourceMetadata(item);
}
export function readLocalLightMetadata(item) {
    const raw = item.metadata?.[LOCAL_LIGHT_KEY];
    if (!isRecord(raw) || raw.schemaVersion !== LIGHT_SCHEMA_VERSION)
        return null;
    if (typeof raw.sourceId !== "string" || raw.sourceId.length === 0)
        return null;
    if (!Number.isInteger(raw.sourceRevision) || raw.sourceRevision < 1)
        return null;
    return raw;
}
export function isLocalLight(item) {
    return item.type === "LIGHT" && !!readLocalLightMetadata(item);
}
//# sourceMappingURL=model.js.map