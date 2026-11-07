import test from "node:test";
import assert from "node:assert/strict";
import { constrainGroupDelta } from "../dist/scene/walls/geometry.js";
import { isNativeMoveTool, NATIVE_MOVE_TOOL_ID } from "../dist/scene/walls/movement-tool-utils.js";

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

test("native Move takeover matches only Owlbear's built-in Move tool", () => {
  assert.equal(isNativeMoveTool(NATIVE_MOVE_TOOL_ID), true);
  assert.equal(isNativeMoveTool("rodeo.owlbear.tools/select"), false);
  assert.equal(isNativeMoveTool("com.beholder-vtt/token-movement"), false);
  assert.equal(isNativeMoveTool("vendor.example/move"), false);
});
