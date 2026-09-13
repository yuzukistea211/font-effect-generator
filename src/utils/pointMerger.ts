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

/**
 * Ramer-Douglas-Peucker (RDP) algorithm on an open chain of points
 */
export function rdp(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let index = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const left = rdp(points.slice(0, index + 1), epsilon);
    const right = rdp(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  } else {
    return [first, last];
  }
}

/**
 * Simplifies a closed polygon using RDP by splitting at the furthest point
 */
export function simplifyClosedPolygonRDP(polygon: Point[], epsilon: number): Point[] {
  if (polygon.length <= 3) return polygon;
  const n = polygon.length;
  let maxD = 0;
  let farIdx = Math.floor(n / 2);
  for (let i = 1; i < n; i++) {
    const d = euclideanDistance(polygon[i], polygon[0]);
    if (d > maxD) {
      maxD = d;
      farIdx = i;
    }
  }

  const chain1 = polygon.slice(0, farIdx + 1);
  const chain2 = polygon.slice(farIdx).concat([polygon[0]]);

  const simp1 = rdp(chain1, epsilon);
  const simp2 = rdp(chain2, epsilon);

  return simp1.slice(0, -1).concat(simp2.slice(0, -1));
}

/**
 * Simplifies an opentype.Path using the Ramer-Douglas-Peucker (RDP) algorithm.
 * Decimates redundant points on straight lines, noisy polylines, and discretized curves
 * within epsilon perpendicular tolerance.
 */
export function simplifyPathRDP(
  path: opentype.Path,
  epsilon: number = 2.5
): { path: opentype.Path; stats: MergeStats } {
  const originalPoints = countPathPoints(path);
  const newPath = new opentype.Path();

  if (!path.commands || path.commands.length === 0 || epsilon <= 0) {
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

  // Split commands into contours
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

    const isAllLines = contour.slice(1).every((c) => c.type === 'L' || c.type === 'Z');
    const isClosed = contour[contour.length - 1].type === 'Z';

    if (isAllLines && isClosed && contour.length > 4) {
      const pts: Point[] = [{ x: startCmd.x, y: startCmd.y }];
      for (let i = 1; i < contour.length; i++) {
        if (contour[i].type === 'L') {
          const lCmd = contour[i] as { type: 'L'; x: number; y: number };
          pts.push({ x: lCmd.x, y: lCmd.y });
        }
      }
      const simplified = simplifyClosedPolygonRDP(pts, epsilon);
      if (simplified.length >= 2) {
        newPath.moveTo(simplified[0].x, simplified[0].y);
        for (let i = 1; i < simplified.length; i++) {
          newPath.lineTo(simplified[i].x, simplified[i].y);
        }
        newPath.close();
      } else {
        newPath.moveTo(startCmd.x, startCmd.y);
        newPath.close();
      }
    } else {
      newPath.moveTo(startCmd.x, startCmd.y);
      let i = 1;
      let lastPt: Point = { x: startCmd.x, y: startCmd.y };

      while (i < contour.length) {
        const cmd = contour[i];
        if (cmd.type === 'L') {
          const lineChain: Point[] = [lastPt];
          while (i < contour.length && contour[i].type === 'L') {
            const lCmd = contour[i] as { type: 'L'; x: number; y: number };
            lineChain.push({ x: lCmd.x, y: lCmd.y });
            i++;
          }
          const simp = rdp(lineChain, epsilon);
          for (let k = 1; k < simp.length; k++) {
            newPath.lineTo(simp[k].x, simp[k].y);
          }
          lastPt = simp[simp.length - 1];
        } else if (cmd.type === 'C') {
          newPath.curveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
          lastPt = { x: cmd.x, y: cmd.y };
          i++;
        } else if (cmd.type === 'Q') {
          newPath.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
          lastPt = { x: cmd.x, y: cmd.y };
          i++;
        } else if (cmd.type === 'Z') {
          newPath.close();
          i++;
        } else {
          i++;
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
 * Simplifies an SVG path string 'M ... L ... Z' using RDP
 */
export function simplifySvgPathRDP(
  d: string,
  epsilon: number = 2.5
): { d: string; stats: MergeStats } {
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
  let i = 0;

  while (i < commands.length) {
    const { type, args } = commands[i];
    const uType = type.toUpperCase();

    if (uType === 'M' && args.length >= 2) {
      curr = { x: args[0], y: args[1] };
      outCmds.push(`M ${curr.x} ${curr.y}`);
      i++;
    } else if (uType === 'L' && args.length >= 2) {
      const lineChain: Point[] = [curr];
      while (i < commands.length && commands[i].type.toUpperCase() === 'L' && commands[i].args.length >= 2) {
        lineChain.push({ x: commands[i].args[0], y: commands[i].args[1] });
        i++;
      }
      const simp = rdp(lineChain, epsilon);
      for (let k = 1; k < simp.length; k++) {
        outCmds.push(`L ${simp[k].x} ${simp[k].y}`);
      }
      curr = simp[simp.length - 1];
    } else if (uType === 'Z') {
      outCmds.push('Z');
      i++;
    } else {
      outCmds.push(`${type} ${args.join(' ')}`);
      if (args.length >= 2) {
        curr = { x: args[args.length - 2], y: args[args.length - 1] };
      }
      i++;
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

