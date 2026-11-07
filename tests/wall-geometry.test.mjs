import test from "node:test";
import assert from "node:assert/strict";
import {
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
