import type { LineItem, SceneItem } from "../../platform/obr.js";

export const LIGHT_SOURCE_KEY = "com.beholder-vtt/light-source";
export const LOCAL_LIGHT_KEY = "com.beholder-vtt/local-light";
export const LIGHT_SCHEMA_VERSION = 1 as const;

export interface LightSourceMetadata {
  schemaVersion: typeof LIGHT_SCHEMA_VERSION;
  lightId: string;
  revision: number;
  attenuationRadius: number;
  sourceRadius: number;
  falloff: number;
  innerAngle: number;
  outerAngle: number;
  lightType: "PRIMARY" | "SECONDARY" | "AUXILIARY";
}

export interface LocalLightMetadata {
  schemaVersion: typeof LIGHT_SCHEMA_VERSION;
  sourceId: string;
  sourceRevision: number;
}

export function lightAttachmentTarget(source: Pick<SceneItem, "id" | "attachedTo">): string {
  return source.attachedTo || source.id;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createLightMetadata(lightId: string): LightSourceMetadata {
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

export function readLightSourceMetadata(item: SceneItem): LightSourceMetadata | null {
  const raw = item.metadata?.[LIGHT_SOURCE_KEY];
  if (!isRecord(raw) || raw.schemaVersion !== LIGHT_SCHEMA_VERSION) return null;
  if (typeof raw.lightId !== "string" || raw.lightId.length === 0) return null;
  if (!Number.isInteger(raw.revision) || (raw.revision as number) < 1) return null;
  if (typeof raw.attenuationRadius !== "number" || raw.attenuationRadius <= 0) return null;
  if (typeof raw.sourceRadius !== "number" || raw.sourceRadius < 0) return null;
  if (typeof raw.falloff !== "number" || raw.falloff < 0) return null;
  if (typeof raw.innerAngle !== "number" || raw.innerAngle < 0 || raw.innerAngle > 360) return null;
  if (typeof raw.outerAngle !== "number" || raw.outerAngle < raw.innerAngle || raw.outerAngle > 360) return null;
  if (raw.lightType !== "PRIMARY" && raw.lightType !== "SECONDARY" && raw.lightType !== "AUXILIARY") return null;
  return raw as unknown as LightSourceMetadata;
}

export function updateLightSourceMetadata(item: SceneItem, update: Partial<Omit<LightSourceMetadata, "schemaVersion" | "lightId" | "revision">>): boolean {
  const current = readLightSourceMetadata(item);
  if (!current) return false;
  const next = { ...current, ...update, revision: current.revision + 1 };
  const candidate = { ...item, metadata: { ...item.metadata, [LIGHT_SOURCE_KEY]: next } };
  if (!readLightSourceMetadata(candidate)) return false;
  item.metadata = { ...item.metadata, [LIGHT_SOURCE_KEY]: next };
  return true;
}

export function isLightSource(item: SceneItem): item is LineItem {
  return item.type === "LINE" && !!item.startPosition && !!item.endPosition && !!readLightSourceMetadata(item);
}

export function readLocalLightMetadata(item: SceneItem): LocalLightMetadata | null {
  const raw = item.metadata?.[LOCAL_LIGHT_KEY];
  if (!isRecord(raw) || raw.schemaVersion !== LIGHT_SCHEMA_VERSION) return null;
  if (typeof raw.sourceId !== "string" || raw.sourceId.length === 0) return null;
  if (!Number.isInteger(raw.sourceRevision) || (raw.sourceRevision as number) < 1) return null;
  return raw as unknown as LocalLightMetadata;
}

export function isLocalLight(item: SceneItem): boolean {
  return item.type === "LIGHT" && !!readLocalLightMetadata(item);
}
