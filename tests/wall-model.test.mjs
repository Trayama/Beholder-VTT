import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultWallMetadata,
  isLocalWall,
  isWallSource,
  LOCAL_WALL_KEY,
  readWallSourceMetadata,
  WALL_SOURCE_KEY,
} from "../dist/scene/walls/model.js";

const baseItem = {
  id: "wall-1",
  name: "source",
  visible: false,
  locked: true,
  layer: "FOG",
  position: { x: 0, y: 0 },
  rotation: 0,
  scale: { x: 1, y: 1 },
  metadata: {},
};

test("default wall metadata keeps movement, vision and light flags independent", () => {
  const metadata = createDefaultWallMetadata("wall-1");
  assert.deepEqual(metadata.blocking, {
    blocksMovement: true,
    blocksVision: true,
    blocksLight: true,
  });
  metadata.blocking.blocksVision = false;
  assert.equal(metadata.blocking.blocksMovement, true);
  assert.equal(metadata.blocking.blocksLight, true);
});

test("wall source validation accepts a well-formed hidden LINE", () => {
  const item = {
    ...baseItem,
    type: "LINE",
    startPosition: { x: 0, y: 0 },
    endPosition: { x: 100, y: 0 },
    metadata: { [WALL_SOURCE_KEY]: createDefaultWallMetadata("wall-1") },
  };
  assert.equal(isWallSource(item), true);
  assert.equal(readWallSourceMetadata(item).wallId, "wall-1");
});

test("wall source validation rejects malformed or unsupported metadata", () => {
  const item = {
    ...baseItem,
    type: "LINE",
    startPosition: { x: 0, y: 0 },
    endPosition: { x: 100, y: 0 },
    metadata: { [WALL_SOURCE_KEY]: { schemaVersion: 99 } },
  };
  assert.equal(isWallSource(item), false);
  assert.equal(readWallSourceMetadata(item), null);
});

test("local projection marker is distinct from the shared source marker", () => {
  const item = {
    ...baseItem,
    type: "WALL",
    points: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
    blocking: true,
    doubleSided: true,
    metadata: {
      [LOCAL_WALL_KEY]: {
        schemaVersion: 1,
        sourceId: "wall-1",
        sourceRevision: 1,
      },
    },
  };
  assert.equal(isLocalWall(item), true);
});
