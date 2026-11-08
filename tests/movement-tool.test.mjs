import test from "node:test";
import assert from "node:assert/strict";
import { constrainGroupDelta } from "../dist/scene/walls/geometry.js";
import {
  getNativeMoveModeId,
  isNativeMoveTool,
  isNativeMoveTransformer,
  NATIVE_MOVE_COLLISION_MODE_ID,
  NATIVE_MOVE_PASSTHROUGH_MODE_ID,
  NATIVE_MOVE_TOOL_ID,
  NATIVE_MOVE_TOOL_IDS,
} from "../dist/scene/walls/movement-tool-utils.js";

test("group movement uses the most restrictive selected token footprint", () => {
  const delta = constrainGroupDelta(
    { x: 100, y: 0 },
    [
      { center: { x: 10, y: 0 }, radius: 5 },
      { center: { x: 20, y: 40 }, radius: 5 },
    ],
    [{ start: { x: 50, y: -100 }, end: { x: 50, y: 100 } }],
  );
  assert.ok(Math.abs(delta.x - 24) < 0.1);
  assert.equal(delta.y, 0);
});

test("group movement leaves an unobstructed translation unchanged", () => {
  const requested = { x: 24, y: -12 };
  const actual = constrainGroupDelta(
    requested,
    [{ center: { x: 0, y: 0 }, radius: 10 }],
    [],
  );
  assert.deepEqual(actual, requested);
});

test("native Move uses the observed singular Owlbear tool id", () => {
  assert.equal(NATIVE_MOVE_TOOL_ID, "rodeo.owlbear.tool/move");
  assert.equal(isNativeMoveTool("rodeo.owlbear.tool/move"), true);
  assert.equal(isNativeMoveTool("rodeo.owlbear.tools/move"), true);
  assert.equal(isNativeMoveTool("rodeo.owlbear.tool/select"), false);
  assert.equal(isNativeMoveTool("com.beholder-vtt/token-movement"), false);
  assert.equal(isNativeMoveTool("vendor.example/move"), false);
  assert.deepEqual([...NATIVE_MOVE_TOOL_IDS], [
    "rodeo.owlbear.tool/move",
    "rodeo.owlbear.tools/move",
  ]);
});

test("native Move switches between wall-aware and native transformer modes", () => {
  assert.equal(getNativeMoveModeId(true), NATIVE_MOVE_COLLISION_MODE_ID);
  assert.equal(getNativeMoveModeId(false), NATIVE_MOVE_PASSTHROUGH_MODE_ID);
});

test("only transformer gestures temporarily delegate to Owlbear's native Move", () => {
  assert.equal(isNativeMoveTransformer({}), false);
  assert.equal(isNativeMoveTransformer({ transformer: false }), false);
  assert.equal(isNativeMoveTransformer({ transformer: true }), true);
});
