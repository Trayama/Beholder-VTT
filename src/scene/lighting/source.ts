import { buildLight, buildLine } from "../../platform/obr.js";
import type { LightItem, LineItem, Vector2 } from "../../platform/obr.js";
import { createLightMetadata, LIGHT_SOURCE_KEY, LOCAL_LIGHT_KEY, lightAttachmentTarget, readLightSourceMetadata } from "./model.js";

const ZERO: Vector2 = { x: 0, y: 0 };
const UNIT: Vector2 = { x: 1, y: 1 };

export function createLightSource(position: Vector2): LineItem {
  return buildLine()
    .name("Beholder Light Source")
    .startPosition(ZERO)
    .endPosition({ x: 1, y: 0 })
    .position(position)
    .rotation(0)
    .scale(UNIT)
    .visible(false)
    .layer("FOG")
    .locked(true)
    .disableHit(true)
    .metadata({ [LIGHT_SOURCE_KEY]: createLightMetadata(crypto.randomUUID()) })
    .build();
}

export function createLocalLight(source: LineItem): LightItem | null {
  const metadata = readLightSourceMetadata(source);
  if (!metadata) return null;
  const light = buildLight()
    .name("Beholder Light")
    .position(source.position ?? ZERO)
    .rotation(source.rotation ?? 0)
    .scale(source.scale ?? UNIT)
    .layer("FOG")
    .visible(true)
    .attachedTo(lightAttachmentTarget(source))
    .disableAutoZIndex(true)
    .zIndex(0)
    .sourceRadius(metadata.sourceRadius)
    .attenuationRadius(metadata.attenuationRadius)
    .falloff(metadata.falloff)
    .innerAngle(metadata.innerAngle)
    .outerAngle(metadata.outerAngle)
    .lightType(metadata.lightType)
    .metadata({
      [LOCAL_LIGHT_KEY]: {
        schemaVersion: 1,
        sourceId: source.id,
        sourceRevision: metadata.revision,
      },
    })
    .build();
  return light;
}

export function localLightMatches(source: LineItem, light: LightItem): boolean {
  const metadata = readLightSourceMetadata(source);
  const local = light.metadata?.[LOCAL_LIGHT_KEY] as { sourceId?: unknown; sourceRevision?: unknown } | undefined;
  if (!metadata || local?.sourceId !== source.id || local.sourceRevision !== metadata.revision) return false;
  const close = (a: number | undefined, b: number): boolean => typeof a === "number" && Math.abs(a - b) < 0.001;
  const pos = source.position ?? ZERO;
  return light.attachedTo === lightAttachmentTarget(source) &&
    close(light.position?.x, pos.x) && close(light.position?.y, pos.y) &&
    close(light.rotation, source.rotation ?? 0) &&
    close(light.attenuationRadius, metadata.attenuationRadius) &&
    close(light.sourceRadius, metadata.sourceRadius) &&
    close(light.falloff, metadata.falloff) &&
    close(light.innerAngle, metadata.innerAngle) &&
    close(light.outerAngle, metadata.outerAngle) &&
    light.lightType === metadata.lightType;
}

export function applySourceToLight(source: LineItem, light: LightItem): void {
  const metadata = readLightSourceMetadata(source);
  if (!metadata) return;
  light.name = "Beholder Light";
  light.position = source.position ?? ZERO;
  light.rotation = source.rotation ?? 0;
  light.scale = source.scale ?? UNIT;
  light.layer = "FOG";
  light.visible = true;
  light.attachedTo = lightAttachmentTarget(source);
  light.disableAutoZIndex = true;
  light.zIndex = 0;
  light.sourceRadius = metadata.sourceRadius;
  light.attenuationRadius = metadata.attenuationRadius;
  light.falloff = metadata.falloff;
  light.innerAngle = metadata.innerAngle;
  light.outerAngle = metadata.outerAngle;
  light.lightType = metadata.lightType;
  light.metadata = { [LOCAL_LIGHT_KEY]: { schemaVersion: 1, sourceId: source.id, sourceRevision: metadata.revision } };
}
