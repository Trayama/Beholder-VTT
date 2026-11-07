import type { Vector2 } from "../../platform/obr.js";

const EPSILON = 1e-8;

export function transformPoint(
  point: Vector2,
  position: Vector2,
  rotationDegrees: number,
  scale: Vector2,
): Vector2 {
  const scaledX = point.x * scale.x;
  const scaledY = point.y * scale.y;
  const radians = rotationDegrees * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: position.x + scaledX * cos - scaledY * sin,
    y: position.y + scaledX * sin + scaledY * cos,
  };
}

export function pointToSegmentDistance(point: Vector2, start: Vector2, end: Vector2): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= EPSILON) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }
  const t = Math.max(0, Math.min(1,
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
  ));
  const nearest = { x: start.x + t * dx, y: start.y + t * dy };
  return Math.hypot(point.x - nearest.x, point.y - nearest.y);
}

function orientation(a: Vector2, b: Vector2, c: Vector2): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function onSegment(a: Vector2, b: Vector2, point: Vector2): boolean {
  return point.x >= Math.min(a.x, b.x) - EPSILON &&
    point.x <= Math.max(a.x, b.x) + EPSILON &&
    point.y >= Math.min(a.y, b.y) - EPSILON &&
    point.y <= Math.max(a.y, b.y) + EPSILON;
}

export function segmentsIntersect(a: Vector2, b: Vector2, c: Vector2, d: Vector2): boolean {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);

  if (((o1 > EPSILON && o2 < -EPSILON) || (o1 < -EPSILON && o2 > EPSILON)) &&
      ((o3 > EPSILON && o4 < -EPSILON) || (o3 < -EPSILON && o4 > EPSILON))) {
    return true;
  }

  if (Math.abs(o1) <= EPSILON && onSegment(a, b, c)) return true;
  if (Math.abs(o2) <= EPSILON && onSegment(a, b, d)) return true;
  if (Math.abs(o3) <= EPSILON && onSegment(c, a, b)) return true;
  if (Math.abs(o4) <= EPSILON && onSegment(d, a, b)) return true;
  return false;
}

export function segmentToSegmentDistance(a: Vector2, b: Vector2, c: Vector2, d: Vector2): number {
  if (segmentsIntersect(a, b, c, d)) return 0;
  return Math.min(
    pointToSegmentDistance(a, c, d),
    pointToSegmentDistance(b, c, d),
    pointToSegmentDistance(c, a, b),
    pointToSegmentDistance(d, a, b),
  );
}

export interface WallSegment2D {
  start: Vector2;
  end: Vector2;
}

export interface MovementFootprint {
  center: Vector2;
  radius: number;
}

/**
 * Returns the last safe point along a token movement segment before its
 * circular footprint touches a blocking wall. A null result means the move
 * is clear. The calculation uses the token's bounding-circle radius.
 */
export function constrainMovement(
  start: Vector2,
  end: Vector2,
  walls: WallSegment2D[],
  radius: number,
): Vector2 | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length <= EPSILON || walls.length === 0) return null;

  const safeRadius = Math.max(0, radius);
  let earliest = 1;

  for (const wall of walls) {
    const startDistance = pointToSegmentDistance(start, wall.start, wall.end);
    const endDistance = pointToSegmentDistance(end, wall.start, wall.end);
    const crossesWall = segmentsIntersect(start, end, wall.start, wall.end);

    if (startDistance <= safeRadius + EPSILON) {
      if (crossesWall || endDistance < startDistance - EPSILON) return { ...start };
      continue;
    }

    if (segmentToSegmentDistance(start, end, wall.start, wall.end) > safeRadius + EPSILON) {
      continue;
    }

    let low = 0;
    let high = 1;
    for (let iteration = 0; iteration < 28; iteration += 1) {
      const middle = (low + high) / 2;
      const point = { x: start.x + dx * middle, y: start.y + dy * middle };
      const distance = segmentToSegmentDistance(start, point, wall.start, wall.end);
      if (distance > safeRadius) low = middle;
      else high = middle;
    }

    const safetyMargin = Math.min(0.02, 1 / length);
    earliest = Math.min(earliest, Math.max(0, low - safetyMargin));
  }

  if (earliest >= 1 - EPSILON) return null;
  return { x: start.x + dx * earliest, y: start.y + dy * earliest };
}

/**
 * Constrains a shared translation for a group of selected items. Every
 * character/mount footprint must remain clear; non-token selected items can
 * follow the same resulting group delta without independently blocking it.
 */
export function constrainGroupDelta(
  delta: Vector2,
  footprints: MovementFootprint[],
  walls: WallSegment2D[],
): Vector2 {
  const lengthSquared = delta.x * delta.x + delta.y * delta.y;
  if (lengthSquared <= EPSILON || footprints.length === 0 || walls.length === 0) {
    return { ...delta };
  }

  let allowedFraction = 1;
  for (const footprint of footprints) {
    const desired = {
      x: footprint.center.x + delta.x,
      y: footprint.center.y + delta.y,
    };
    const safe = constrainMovement(footprint.center, desired, walls, footprint.radius);
    if (!safe) continue;

    const fraction = (
      (safe.x - footprint.center.x) * delta.x +
      (safe.y - footprint.center.y) * delta.y
    ) / lengthSquared;
    allowedFraction = Math.min(allowedFraction, Math.max(0, Math.min(1, fraction)));
  }

  return {
    x: delta.x * allowedFraction,
    y: delta.y * allowedFraction,
  };
}
