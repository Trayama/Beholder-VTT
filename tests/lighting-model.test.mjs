import test from "node:test";
import assert from "node:assert/strict";
import {
  createLightMetadata,
  isLightSource,
  LIGHT_SOURCE_KEY,
  lightAttachmentTarget,
  readLightSourceMetadata,
  updateLightSourceMetadata,
} from "../dist/scene/lighting/model.js";

const baseItem = {
  id: "light-source-1",
  name: "source",
  visible: false,
  locked: true,
  layer: "FOG",
  position: { x: 10, y: 20 },
  rotation: 0,
  scale: { x: 1, y: 1 },
  startPosition: { x: 0, y: 0 },
  endPosition: { x: 1, y: 0 },
};

test("light definitions default to a valid circular native light", () => {
  const metadata = createLightMetadata("light-1");
  assert.equal(metadata.attenuationRadius, 240);
  assert.equal(metadata.innerAngle, 360);
  assert.equal(metadata.outerAngle, 360);
  assert.equal(metadata.lightType, "PRIMARY");
});

test("shared LINE light source metadata is recognized", () => {
  const item = { ...baseItem, type: "LINE", metadata: { [LIGHT_SOURCE_KEY]: createLightMetadata("light-1") } };
  assert.equal(isLightSource(item), true);
  assert.equal(readLightSourceMetadata(item)?.lightId, "light-1");
});

test("light sources reject impossible radii and cone angles", () => {
  const valid = createLightMetadata("light-1");
  for (const invalid of [
    { ...valid, attenuationRadius: 0 },
    { ...valid, sourceRadius: -1 },
    { ...valid, innerAngle: 361 },
    { ...valid, outerAngle: 10, innerAngle: 45 },
  ]) {
    const item = { ...baseItem, type: "LINE", metadata: { [LIGHT_SOURCE_KEY]: invalid } };
    assert.equal(readLightSourceMetadata(item), null);
    assert.equal(isLightSource(item), false);
  }
});

test("light property edits increment the shared revision and validate the full result", () => {
  const item = { ...baseItem, type: "LINE", metadata: { [LIGHT_SOURCE_KEY]: createLightMetadata("light-1") } };
  assert.equal(updateLightSourceMetadata(item, { attenuationRadius: 420, outerAngle: 90, innerAngle: 70 }), true);
  assert.equal(readLightSourceMetadata(item)?.revision, 2);
  assert.equal(readLightSourceMetadata(item)?.attenuationRadius, 420);
  assert.equal(updateLightSourceMetadata(item, { outerAngle: 45 }), false);
  assert.equal(readLightSourceMetadata(item)?.revision, 2);
});

test("local light attachment follows its token anchor when configured", () => {
  assert.equal(lightAttachmentTarget({ id: "source-1" }), "source-1");
  assert.equal(lightAttachmentTarget({ id: "source-1", attachedTo: "token-1" }), "token-1");
});
