import test from "node:test";
import assert from "node:assert/strict";
import { constrainGroupDelta } from "../dist/scene/walls/geometry.js";
import { isLikelyNativeSelectTool } from "../dist/scene/walls/native-select.js";

test("group movement uses the most restrictive selected token footprint", () => {
  const delta = constrainGroupDelta(
    { x: 100, y: 0 },
    [
      { center: { x: 10, y: 0 }, radius: 5 },
      { center: { x: 20, y: 40 }, radius: 5 },
    ],
    [{ start: { x: 50, y: -100 }, end: { x: 50, y: 100 } }],
  );
  assert.ok(Math.abs(delta.x - 25) < 0.1);
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

test("native Select auto-detection is limited to the expected built-in select suffix", () => {
  assert.equal(isLikelyNativeSelectTool("rodeo.owlbear.tools/select"), true);
  assert.equal(isLikelyNativeSelectTool("vendor.example/select"), true);
  assert.equal(isLikelyNativeSelectTool("rodeo.owlbear.tools/pointer"), false);
  assert.equal(isLikelyNativeSelectTool("com.beholder-vtt/wall-editor"), false);
});
