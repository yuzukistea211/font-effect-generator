import * as opentype from 'opentype.js';

export interface Point {
  x: number;
  y: number;
}

export interface MergeStats {
  originalPoints: number;
  mergedPoints: number;
  removedPoints: number;
  reductionPercentage: number;
}

/**
 * Euclidean distance between two points
 */
export function euclideanDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.hypot(dx, dy);
}

/**
 * Perpendicular distance from point P to line segment AB
 */
function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const mag = Math.hypot(dx, dy);
  if (mag === 0) return euclideanDistance(p, a);
  return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / mag;
}

/**
 * Counts the total number of anchor/control points in an OpenType path
 */
export function countPathPoints(path: opentype.Path | null | undefined): number {
  if (!path || !path.commands) return 0;
  let count = 0;
  for (const cmd of path.commands) {
    if (cmd.type === 'M' || cmd.type === 'L') count += 1;
    else if (cmd.type === 'Q') count += 2;
    else if (cmd.type === 'C') count += 3;
  }
  return count;
}

/**
 * Merge consecutive nodes/points in an OpenType Path that are closer than the distance threshold.
 * Handles contours, keeps closed loops valid, and welds nearby points.
 */
export function mergePathPointsByDistance(
  path: opentype.Path,
  distanceThreshold: number = 10
): { path: opentype.Path; stats: MergeStats } {
  const originalPoints = countPathPoints(path);
  const newPath = new opentype.Path();

  if (!path.commands || path.commands.length === 0 || distanceThreshold <= 0) {
    return {
      path,
      stats: {
        originalPoints,
        mergedPoints: originalPoints,
        removedPoints: 0,
        reductionPercentage: 0,
      },
    };
  }

  // Split commands into distinct contours
  const contours: opentype.PathCommand[][] = [];
  let currentContour: opentype.PathCommand[] = [];

  for (const cmd of path.commands) {
    if (cmd.type === 'M') {
      if (currentContour.length > 0) contours.push(currentContour);
      currentContour = [cmd];
    } else {
      currentContour.push(cmd);
      if (cmd.type === 'Z') {
        contours.push(currentContour);
        currentContour = [];
      }
    }
  }
  if (currentContour.length > 0) contours.push(currentContour);

  for (const contour of contours) {
    if (contour.length === 0) continue;

    const startCmd = contour[0];
    if (startCmd.type !== 'M') continue;

    newPath.moveTo(startCmd.x, startCmd.y);
    let lastPt: Point = { x: startCmd.x, y: startCmd.y };
    const contourStart: Point = { x: startCmd.x, y: startCmd.y };

    for (let i = 1; i < contour.length; i++) {
      const cmd = contour[i];

      if (cmd.type === 'Z') {
        newPath.close();
      } else if (cmd.type === 'L') {
        const target: Point = { x: cmd.x, y: cmd.y };
        const distToLast = euclideanDistance(lastPt, target);
        const isNextZ = i === contour.length - 1 || (contour[i + 1] && contour[i + 1].type === 'Z');

        // Check if this point is too close to contourStart (avoid redundant closing jerk)
        const distToStart = euclideanDistance(target, contourStart);

        if (isNextZ && distToStart < distanceThreshold) {
          // Point is practically at contour start, let Z close it
          continue;
        }

        if (distToLast >= distanceThreshold || isNextZ) {
          newPath.lineTo(target.x, target.y);
          lastPt = target;
        }
      } else if (cmd.type === 'C') {
        const target: Point = { x: cmd.x, y: cmd.y };
        const distToLast = euclideanDistance(lastPt, target);
        if (distToLast >= distanceThreshold * 0.7) {
          newPath.curveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, target.x, target.y);
          lastPt = target;
        }
      } else if (cmd.type === 'Q') {
        const target: Point = { x: cmd.x, y: cmd.y };
        const distToLast = euclideanDistance(lastPt, target);
        if (distToLast >= distanceThreshold * 0.7) {
          newPath.quadraticCurveTo(cmd.x1, cmd.y1, target.x, target.y);
          lastPt = target;
        }
      }
    }
  }

  const mergedPoints = countPathPoints(newPath);
  const removedPoints = Math.max(0, originalPoints - mergedPoints);
  const reductionPercentage =
    originalPoints > 0 ? Math.round((removedPoints / originalPoints) * 100) : 0;

  return {
    path: newPath,
    stats: {
      originalPoints,
      mergedPoints,
      removedPoints,
      reductionPercentage,
    },
  };
}

/**
 * Merges nodes/points in an SVG path string ('M ... L ... Z') by distance threshold
 */
export function mergeSvgPathData(
  d: string,
  distanceThreshold: number = 10
): { d: string; stats: MergeStats } {
  try {
    const dummyFont = opentype.parse(new ArrayBuffer(0));
  } catch {
    // ignore
  }

  // Parse SVG d attribute commands
  const commands: { type: string; args: number[] }[] = [];
  const regex = /([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g;
  let match;

  while ((match = regex.exec(d)) !== null) {
    const type = match[1];
    const args = match[2]
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    commands.push({ type, args });
  }

  let originalCount = 0;
  for (const c of commands) {
    if (c.type.toUpperCase() !== 'Z') originalCount++;
  }

  const outCmds: string[] = [];
  let curr: Point = { x: 0, y: 0 };
  let contourStart: Point = { x: 0, y: 0 };

  for (let i = 0; i < commands.length; i++) {
    const { type, args } = commands[i];
    const uType = type.toUpperCase();

    if (uType === 'M' && args.length >= 2) {
      curr = { x: args[0], y: args[1] };
      contourStart = { ...curr };
      outCmds.push(`M ${curr.x} ${curr.y}`);
    } else if (uType === 'L' && args.length >= 2) {
      const target: Point = { x: args[0], y: args[1] };
      const d = euclideanDistance(curr, target);
      const isNextZ = i + 1 < commands.length && commands[i + 1].type.toUpperCase() === 'Z';
      if (d >= distanceThreshold || isNextZ) {
        outCmds.push(`L ${target.x} ${target.y}`);
        curr = target;
      }
    } else if (uType === 'Z') {
      outCmds.push('Z');
      curr = contourStart;
    } else {
      // Retain other SVG commands with arguments
      outCmds.push(`${type} ${args.join(' ')}`);
      if (args.length >= 2) {
        curr = { x: args[args.length - 2], y: args[args.length - 1] };
      }
    }
  }

  let mergedCount = 0;
  for (const s of outCmds) {
    if (!s.startsWith('Z')) mergedCount++;
  }

  const removedPoints = Math.max(0, originalCount - mergedCount);
  const reductionPercentage =
    originalCount > 0 ? Math.round((removedPoints / originalCount) * 100) : 0;

  return {
    d: outCmds.join(' '),
    stats: {
      originalPoints: originalCount,
      mergedPoints: mergedCount,
      removedPoints,
      reductionPercentage,
    },
  };
}
