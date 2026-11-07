import { buildLine, buildWall } from "../../platform/obr.js";
import type { LineItem, SceneItem, Vector2, WallItem } from "../../platform/obr.js";
import { transformPoint } from "./geometry.js";
import {
  createDefaultWallMetadata,
  LOCAL_GUIDE_KEY,
  LOCAL_WALL_KEY,
  readWallSourceMetadata,
  WALL_SOURCE_KEY,
} from "./model.js";

const ZERO: Vector2 = { x: 0, y: 0 };
const UNIT: Vector2 = { x: 1, y: 1 };

export function createWallSource(start: Vector2, end: Vector2): LineItem {
  const id = crypto.randomUUID();
  const metadata = createDefaultWallMetadata(id);
  return buildLine()
    .id(id)
    .name("Beholder Wall Source")
    .startPosition(start)
    .endPosition(end)
    .position(ZERO)
    .rotation(0)
    .scale(UNIT)
    .visible(false)
    .layer("FOG")
    .locked(true)
    .disableHit(true)
    .metadata({ [WALL_SOURCE_KEY]: metadata })
    .build();
}

export function createLocalWall(source: LineItem): WallItem {
  const metadata = readWallSourceMetadata(source);
  if (!metadata) throw new Error(`Invalid wall source metadata: ${source.id}`);

  return buildWall()
    .name("Beholder Local Wall")
    .points([source.startPosition, source.endPosition])
    .attachedTo(source.id)
    .position(source.position ?? ZERO)
    .rotation(source.rotation ?? 0)
    .scale(source.scale ?? UNIT)
    .visible(true)
    .layer("FOG")
    .blocking(metadata.blocking.blocksVision)
    .doubleSided(true)
    .disableAutoZIndex(true)
    .disableAttachmentBehavior(["VISIBLE", "COPY"])
    .metadata({
      [LOCAL_WALL_KEY]: {
        schemaVersion: 1,
        sourceId: source.id,
        sourceRevision: metadata.revision,
      },
    })
    .build();
}

export function applySourceToLocalDraft(draft: SceneItem, source: LineItem): void {
  const metadata = readWallSourceMetadata(source);
  if (!metadata) return;
  draft.name = "Beholder Local Wall";
  draft.points = [source.startPosition, source.endPosition];
  draft.attachedTo = source.id;
  draft.position = source.position ?? ZERO;
  draft.rotation = source.rotation ?? 0;
  draft.scale = source.scale ?? UNIT;
  draft.visible = true;
  draft.layer = "FOG";
  draft.blocking = metadata.blocking.blocksVision;
  draft.doubleSided = true;
  draft.disableAttachmentBehavior = ["VISIBLE", "COPY"];
  draft.metadata = {
    [LOCAL_WALL_KEY]: {
      schemaVersion: 1,
      sourceId: source.id,
      sourceRevision: metadata.revision,
    },
  };
}

export function sourceMatchesProjection(source: LineItem, projection: WallItem): boolean {
  const metadata = readWallSourceMetadata(source);
  if (!metadata) return false;
  const localMeta = projection.metadata?.[LOCAL_WALL_KEY] as { sourceId?: unknown; sourceRevision?: unknown } | undefined;
  const pointA = projection.points?.[0];
  const pointB = projection.points?.[1];
  const sourcePosition = source.position ?? ZERO;
  const sourceScale = source.scale ?? UNIT;
  const projectionPosition = projection.position ?? ZERO;
  const projectionScale = projection.scale ?? UNIT;
  const close = (a: number, b: number): boolean => Math.abs(a - b) < 0.001;
  const sameVector = (a: Vector2 | undefined, b: Vector2): boolean =>
    !!a && close(a.x, b.x) && close(a.y, b.y);

  return localMeta?.sourceId === source.id &&
    localMeta?.sourceRevision === metadata.revision &&
    projection.attachedTo === source.id &&
    projection.points?.length === 2 &&
    sameVector(pointA, source.startPosition) &&
    sameVector(pointB, source.endPosition) &&
    sameVector(projectionPosition, sourcePosition) &&
    sameVector(projectionScale, sourceScale) &&
    close(projection.rotation ?? 0, source.rotation ?? 0) &&
    projection.blocking === metadata.blocking.blocksVision &&
    projection.doubleSided === true &&
    projection.visible === true;
}


export function createLocalGuide(source: LineItem): LineItem {
  const metadata = readWallSourceMetadata(source);
  if (!metadata) throw new Error(`Invalid wall source metadata: ${source.id}`);
  const position = source.position ?? ZERO;
  const scale = source.scale ?? UNIT;
  const rotation = source.rotation ?? 0;
  const start = transformPoint(source.startPosition, position, rotation, scale);
  const end = transformPoint(source.endPosition, position, rotation, scale);

  return buildLine()
    .name("Beholder GM Wall Guide")
    .startPosition(start)
    .endPosition(end)
    .position(ZERO)
    .rotation(0)
    .scale(UNIT)
    .strokeColor("#d85b64")
    .strokeOpacity(0.95)
    .strokeWidth(4)
    .strokeDash([8, 5])
    .visible(true)
    .layer("CONTROL")
    .locked(true)
    .disableHit(true)
    .metadata({
      [LOCAL_GUIDE_KEY]: {
        schemaVersion: 1,
        sourceId: source.id,
        sourceRevision: metadata.revision,
      },
    })
    .build();
}

export function applySourceToGuideDraft(draft: SceneItem, source: LineItem): void {
  const metadata = readWallSourceMetadata(source);
  if (!metadata) return;
  const position = source.position ?? ZERO;
  const scale = source.scale ?? UNIT;
  const rotation = source.rotation ?? 0;
  draft.name = "Beholder GM Wall Guide";
  draft.startPosition = transformPoint(source.startPosition, position, rotation, scale);
  draft.endPosition = transformPoint(source.endPosition, position, rotation, scale);
  draft.position = ZERO;
  draft.rotation = 0;
  draft.scale = UNIT;
  draft.visible = true;
  draft.layer = "CONTROL";
  draft.locked = true;
  draft.disableHit = true;
  draft.metadata = {
    [LOCAL_GUIDE_KEY]: {
      schemaVersion: 1,
      sourceId: source.id,
      sourceRevision: metadata.revision,
    },
  };
  draft.style = {
    strokeColor: "#d85b64",
    strokeOpacity: 0.95,
    strokeWidth: 4,
    strokeDash: [8, 5],
  };
}

export function sourceMatchesGuide(source: LineItem, guide: LineItem): boolean {
  const metadata = readWallSourceMetadata(source);
  if (!metadata) return false;
  const localMeta = guide.metadata?.[LOCAL_GUIDE_KEY] as { sourceId?: unknown; sourceRevision?: unknown } | undefined;
  const position = source.position ?? ZERO;
  const scale = source.scale ?? UNIT;
  const rotation = source.rotation ?? 0;
  const expectedStart = transformPoint(source.startPosition, position, rotation, scale);
  const expectedEnd = transformPoint(source.endPosition, position, rotation, scale);
  const close = (a: number, b: number): boolean => Math.abs(a - b) < 0.001;
  const sameVector = (a: Vector2 | undefined, b: Vector2): boolean =>
    !!a && close(a.x, b.x) && close(a.y, b.y);

  return localMeta?.sourceId === source.id &&
    localMeta?.sourceRevision === metadata.revision &&
    sameVector(guide.startPosition, expectedStart) &&
    sameVector(guide.endPosition, expectedEnd) &&
    guide.visible === true &&
    guide.layer === "CONTROL";
}
