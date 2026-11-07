import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultWallMetadata, WALL_SOURCE_KEY } from "../dist/scene/walls/model.js";
import { getMovementWallSegments } from "../dist/scene/walls/collision.js";

const baseLine = {
  id: "source-1",
  type: "LINE",
  name: "Beholder Wall Source",
  visible: false,
  locked: true,
  layer: "FOG",
  position: { x: 0, y: 0 },
  rotation: 0,
  scale: { x: 1, y: 1 },
  startPosition: { x: 50, y: -40 },
  endPosition: { x: 50, y: 40 },
  metadata: {},
};

test("movement collision reads shared LINE geometry and ignores vision projections", () => {
  const source = {
    ...baseLine,
    metadata: { [WALL_SOURCE_KEY]: createDefaultWallMetadata("wall-1") },
  };
  const visionOnly = {
    ...baseLine,
    id: "source-2",
    metadata: {
      [WALL_SOURCE_KEY]: {
        ...createDefaultWallMetadata("wall-2"),
        blocking: { blocksMovement: false, blocksVision: true, blocksLight: false },
      },
    },
  };
  const segments = getMovementWallSegments([source, visionOnly]);
  assert.equal(segments.length, 1);
  assert.deepEqual(segments[0], {
    start: { x: 50, y: -40 },
    end: { x: 50, y: 40 },
  });
});

test("movement collision applies source transforms before testing geometry", () => {
  const source = {
    ...baseLine,
    position: { x: 10, y: 20 },
    rotation: 90,
    scale: { x: 2, y: 1 },
    startPosition: { x: 0, y: 0 },
    endPosition: { x: 10, y: 0 },
    metadata: { [WALL_SOURCE_KEY]: createDefaultWallMetadata("wall-1") },
  };
  const segments = getMovementWallSegments([source]);
  assert.deepEqual(segments[0], {
    start: { x: 10, y: 20 },
    end: { x: 10, y: 40 },
  });
});
