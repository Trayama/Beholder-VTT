import type { SceneItem } from "../../platform/obr.js";

export const WALL_SOURCE_KEY = "com.beholder-vtt/wall-source";
export const LOCAL_WALL_KEY = "com.beholder-vtt/local-wall";
export const LOCAL_GUIDE_KEY = "com.beholder-vtt/local-guide";
export const WALL_AWARE_MOVE_KEY = "com.beholder-vtt/wall-aware-move";
export const WALL_SCHEMA_VERSION = 1 as const;

export interface WallBlocking {
  blocksMovement: boolean;
  blocksVision: boolean;
  blocksLight: boolean;
}

export interface WallSourceMetadata {
  schemaVersion: typeof WALL_SCHEMA_VERSION;
  wallId: string;
  segmentIndex: number;
  segmentCount: number;
  revision: number;
  blocking: WallBlocking;
}

export interface LocalWallMetadata {
  schemaVersion: typeof WALL_SCHEMA_VERSION;
  sourceId: string;
  sourceRevision: number;
}

export interface LocalGuideMetadata {
  schemaVersion: typeof WALL_SCHEMA_VERSION;
  sourceId: string;
  sourceRevision: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBlocking(value: unknown): value is WallBlocking {
  if (!isRecord(value)) return false;
  return typeof value.blocksMovement === "boolean" &&
    typeof value.blocksVision === "boolean" &&
    typeof value.blocksLight === "boolean";
}

/**
 * The movement system identifies tokens by Owlbear item type and layer only.
 * It deliberately does not inspect Light attachments, player ownership or
 * which client created the token.
 */
export function isMovableToken(item: SceneItem): boolean {
  return item.type === "IMAGE" && (item.layer === "CHARACTER" || item.layer === "MOUNT");
}

export function createWallAwareMoveMarker(): { schemaVersion: 1; nonce: string } {
  return { schemaVersion: 1, nonce: crypto.randomUUID() };
}

export function hasWallAwareMoveMarker(item: SceneItem): boolean {
  const raw = item.metadata?.[WALL_AWARE_MOVE_KEY];
  return isRecord(raw) && raw.schemaVersion === 1 && typeof raw.nonce === "string";
}

export function createDefaultWallMetadata(wallId: string): WallSourceMetadata {
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

export function readWallSourceMetadata(item: SceneItem): WallSourceMetadata | null {
  const raw = item.metadata?.[WALL_SOURCE_KEY];
  if (!isRecord(raw)) return null;
  if (raw.schemaVersion !== WALL_SCHEMA_VERSION) return null;
  if (typeof raw.wallId !== "string" || raw.wallId.length === 0) return null;
  if (!Number.isInteger(raw.segmentIndex) || (raw.segmentIndex as number) < 0) return null;
  if (!Number.isInteger(raw.segmentCount) || (raw.segmentCount as number) < 1) return null;
  if (!Number.isInteger(raw.revision) || (raw.revision as number) < 1) return null;
  if (!isBlocking(raw.blocking)) return null;
  return raw as unknown as WallSourceMetadata;
}

export function readLocalWallMetadata(item: SceneItem): LocalWallMetadata | null {
  const raw = item.metadata?.[LOCAL_WALL_KEY];
  if (!isRecord(raw)) return null;
  if (raw.schemaVersion !== WALL_SCHEMA_VERSION) return null;
  if (typeof raw.sourceId !== "string" || raw.sourceId.length === 0) return null;
  if (!Number.isInteger(raw.sourceRevision) || (raw.sourceRevision as number) < 1) return null;
  return raw as unknown as LocalWallMetadata;
}

export function isWallSource(item: SceneItem): boolean {
  return item.type === "LINE" &&
    !!item.startPosition &&
    !!item.endPosition &&
    !!readWallSourceMetadata(item);
}

export function isLocalWall(item: SceneItem): boolean {
  return item.type === "WALL" && !!readLocalWallMetadata(item);
}

export function readLocalGuideMetadata(item: SceneItem): LocalGuideMetadata | null {
  const raw = item.metadata?.[LOCAL_GUIDE_KEY];
  if (!isRecord(raw)) return null;
  if (raw.schemaVersion !== WALL_SCHEMA_VERSION) return null;
  if (typeof raw.sourceId !== "string" || raw.sourceId.length === 0) return null;
  if (!Number.isInteger(raw.sourceRevision) || (raw.sourceRevision as number) < 1) return null;
  return raw as unknown as LocalGuideMetadata;
}

export function isLocalGuide(item: SceneItem): boolean {
  return item.type === "LINE" && !!readLocalGuideMetadata(item);
}
