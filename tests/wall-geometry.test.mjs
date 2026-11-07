import test from "node:test";
import assert from "node:assert/strict";
import {
  constrainMovement,
  pointToSegmentDistance,
  segmentToSegmentDistance,
  segmentsIntersect,
  transformPoint,
} from "../dist/scene/walls/geometry.js";

test("transformPoint applies scale, rotation, then translation", () => {
  const result = transformPoint(
    { x: 2, y: 1 },
    { x: 10, y: 20 },
    90,
    { x: 2, y: 3 },
  );
  assert.ok(Math.abs(result.x - 7) < 1e-8);
  assert.ok(Math.abs(result.y - 24) < 1e-8);
});

test("pointToSegmentDistance measures the nearest point on a segment", () => {
  assert.equal(pointToSegmentDistance({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 }), 3);
  assert.equal(pointToSegmentDistance({ x: 13, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }), 3);
});

test("segmentsIntersect detects crossing and collinear contact", () => {
  assert.equal(segmentsIntersect(
    { x: 0, y: 0 }, { x: 10, y: 10 },
    { x: 0, y: 10 }, { x: 10, y: 0 },
  ), true);
  assert.equal(segmentsIntersect(
    { x: 0, y: 0 }, { x: 10, y: 0 },
    { x: 5, y: 0 }, { x: 15, y: 0 },
  ), true);
  assert.equal(segmentsIntersect(
    { x: 0, y: 0 }, { x: 10, y: 0 },
    { x: 0, y: 2 }, { x: 10, y: 2 },
  ), false);
});

test("segmentToSegmentDistance is zero on intersection", () => {
  assert.equal(segmentToSegmentDistance(
    { x: 0, y: 0 }, { x: 10, y: 0 },
    { x: 5, y: -5 }, { x: 5, y: 5 },
  ), 0);
});

test("movement stops before a wall using the token footprint radius", () => {
  const safe = constrainMovement(
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    [{ start: { x: 50, y: -40 }, end: { x: 50, y: 40 } }],
    10,
  );
  assert.ok(safe);
  assert.ok(safe.x < 40);
  assert.ok(safe.x > 38);
  assert.equal(safe.y, 0);
});

test("movement remains free when it passes outside a wall endpoint", () => {
  const safe = constrainMovement(
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    [{ start: { x: 50, y: 30 }, end: { x: 50, y: 80 } }],
    10,
  );
  assert.equal(safe, null);
});

test("a token already touching a wall may move away from it", () => {
  const safe = constrainMovement(
    { x: 40, y: 0 },
    { x: 20, y: 0 },
    [{ start: { x: 50, y: -40 }, end: { x: 50, y: 40 } }],
    10,
  );
  assert.equal(safe, null);
});

test("a token already touching a wall cannot cross through it", () => {
  const safe = constrainMovement(
    { x: 40, y: 0 },
    { x: 80, y: 0 },
    [{ start: { x: 50, y: -40 }, end: { x: 50, y: 40 } }],
    10,
  );
  assert.deepEqual(safe, { x: 40, y: 0 });
});
