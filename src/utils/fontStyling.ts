import * as opentype from 'opentype.js';
import type { BatchStyleConfig, PerlinConfig, PixelateConfig, CrystallineConfig, GlitchConfig, MeltConfig, CRTConfig } from '../types';
import { PerlinNoise } from './perlin';

interface Point {
  x: number;
  y: number;
}

// Cubic bezier evaluation: B(t)
function getCubicPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
  };
}

// Quadratic bezier evaluation: B(t)
function getQuadPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

// Approximate euclidean distance
function dist(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Transforms a glyph's path according to the provided BatchStyleConfig.
 * Returns a new, optimized opentype.Path instance.
 */
export function transformGlyphPath(
  originalPath: opentype.Path,
  config: BatchStyleConfig
): opentype.Path {
  if (!originalPath || !originalPath.commands || originalPath.commands.length === 0) {
    return new opentype.Path();
  }

  switch (config.mode) {
    case 'perlin':
      return transformPerlinJagged(originalPath, config.perlin);
    case 'pixelate':
      return transformPixelate(originalPath, config.pixelate);
    case 'crystalline':
      return transformCrystalline(originalPath, config.crystalline);
    case 'glitch':
      return transformGlitch(originalPath, config.glitch);
    case 'melt':
      return transformMelt(originalPath, config.melt);
    case 'crt':
      return transformCRT(originalPath, config.crt);
    default:
      return clonePath(originalPath);
  }
}

/**
 * Deep clone an opentype.Path
 */
export function clonePath(sourcePath: opentype.Path): opentype.Path {
  const newPath = new opentype.Path();
  newPath.commands = JSON.parse(JSON.stringify(sourcePath.commands));
  newPath.fill = sourcePath.fill;
  newPath.stroke = sourcePath.stroke;
  newPath.strokeWidth = sourcePath.strokeWidth;
  return newPath;
}

/**
 * Transform smooth lines into jagged serrations using Perlin Noise
 */
function transformPerlinJagged(path: opentype.Path, cfg: PerlinConfig): opentype.Path {
  const noise = new PerlinNoise(cfg.seed);
  const outPath = new opentype.Path();
  const stepSize = Math.max(8, cfg.stepSize || 20);

  let curr: Point = { x: 0, y: 0 };
  let contourStart: Point = { x: 0, y: 0 };
  let startDisplaced: Point = { x: 0, y: 0 };

  const displace = (p: Point, tangent?: Point): Point => {
    // calculate displacement using noise
    const nx = noise.fbm2D(p.x * cfg.scale, p.y * cfg.scale, cfg.octaves, cfg.roughness);
    
    if (cfg.displacementMode === 'normal' && tangent) {
      const len = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y) || 1;
      const normalX = -tangent.y / len;
      const normalY = tangent.x / len;
      return {
        x: p.x + normalX * nx * cfg.amplitude,
        y: p.y + normalY * nx * cfg.amplitude,
      };
    } else if (cfg.displacementMode === 'horizontal') {
      return {
        x: p.x + nx * cfg.amplitude,
        y: p.y,
      };
    } else if (cfg.displacementMode === 'vertical') {
      return {
        x: p.x,
        y: p.y + nx * cfg.amplitude,
      };
    } else {
      // 2D omnidirectional
      const ny = noise.fbm2D((p.x + 128.5) * cfg.scale, (p.y + 256.3) * cfg.scale, cfg.octaves, cfg.roughness);
      return {
        x: p.x + nx * cfg.amplitude,
        y: p.y + ny * cfg.amplitude,
      };
    }
  };

  const commands = path.commands;
  for (let cIdx = 0; cIdx < commands.length; cIdx++) {
    const cmd = commands[cIdx];
    if (cmd.type === 'M') {
      curr = { x: cmd.x, y: cmd.y };
      contourStart = { ...curr };

      // Compute initial tangent for the first point of the contour
      let initTangent: Point = { x: 1, y: 0 };
      const nextCmd = commands[cIdx + 1];
      if (nextCmd && nextCmd.type !== 'M' && nextCmd.type !== 'Z') {
        const nextX = ('x1' in nextCmd && nextCmd.x1 !== undefined) ? nextCmd.x1 : nextCmd.x;
        const nextY = ('y1' in nextCmd && nextCmd.y1 !== undefined) ? nextCmd.y1 : nextCmd.y;
        if (nextX !== cmd.x || nextY !== cmd.y) {
          initTangent = { x: nextX - cmd.x, y: nextY - cmd.y };
        }
      }

      startDisplaced = displace(curr, initTangent);
      outPath.moveTo(startDisplaced.x, startDisplaced.y);
    } else if (cmd.type === 'L') {
      const target: Point = { x: cmd.x, y: cmd.y };
      const d = dist(curr, target);
      const tangent: Point = { x: target.x - curr.x, y: target.y - curr.y };

      if (d < 4) {
        const dp = displace(target, tangent);
        outPath.lineTo(dp.x, dp.y);
      } else {
        const steps = Math.max(1, Math.ceil(d / stepSize));
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const pt: Point = {
            x: curr.x + t * (target.x - curr.x),
            y: curr.y + t * (target.y - curr.y),
          };
          const dp = displace(pt, tangent);
          outPath.lineTo(dp.x, dp.y);
        }
      }
      curr = target;
    } else if (cmd.type === 'C') {
      const p1: Point = { x: cmd.x1, y: cmd.y1 };
      const p2: Point = { x: cmd.x2, y: cmd.y2 };
      const p3: Point = { x: cmd.x, y: cmd.y };
      // Estimate cubic curve length
      const chord = dist(curr, p3);
      const net = dist(curr, p1) + dist(p1, p2) + dist(p2, p3);
      const estLength = (chord + net) / 2;
      const steps = Math.max(3, Math.ceil(estLength / stepSize));

      let prevPt = curr;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const pt = getCubicPoint(curr, p1, p2, p3, t);
        const tangent: Point = { x: pt.x - prevPt.x, y: pt.y - prevPt.y };
        prevPt = pt;
        const dp = displace(pt, tangent);
        outPath.lineTo(dp.x, dp.y);
      }
      curr = p3;
    } else if (cmd.type === 'Q') {
      const p1: Point = { x: cmd.x1, y: cmd.y1 };
      const p2: Point = { x: cmd.x, y: cmd.y };
      const chord = dist(curr, p2);
      const net = dist(curr, p1) + dist(p1, p2);
      const estLength = (chord + net) / 2;
      const steps = Math.max(3, Math.ceil(estLength / stepSize));

      let prevPt = curr;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const pt = getQuadPoint(curr, p1, p2, t);
        const tangent: Point = { x: pt.x - prevPt.x, y: pt.y - prevPt.y };
        prevPt = pt;
        const dp = displace(pt, tangent);
        outPath.lineTo(dp.x, dp.y);
      }
      curr = p2;
    } else if (cmd.type === 'Z') {
      // Subdivide the closing segment back to contourStart so the lower stroke line is consistently styled
      const d = dist(curr, contourStart);
      if (d > 0.5) {
        if (d >= 4) {
          const steps = Math.max(1, Math.ceil(d / stepSize));
          const tangent: Point = { x: contourStart.x - curr.x, y: contourStart.y - curr.y };
          for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const pt: Point = {
              x: curr.x + t * (contourStart.x - curr.x),
              y: curr.y + t * (contourStart.y - curr.y),
            };
            const dp = displace(pt, tangent);
            outPath.lineTo(dp.x, dp.y);
          }
        }
        // Connect directly into the displaced start point
        outPath.lineTo(startDisplaced.x, startDisplaced.y);
      }
      outPath.close();
      curr = contourStart;
    }
  }

  return outPath;
}

/**
 * Transform smooth lines to pixelated stepped/orthogonal paths
 */
function transformPixelate(path: opentype.Path, cfg: PixelateConfig): opentype.Path {
  const outPath = new opentype.Path();
  const grid = Math.max(8, cfg.gridSize || 30);
  const sampleStep = Math.max(4, Math.floor(grid / 2));

  let curr: Point = { x: 0, y: 0 };
  let lastEmitted: Point | null = null;
  let contourStart: Point = { x: 0, y: 0 };

  const quantize = (val: number): number => {
    return Math.round(val / grid) * grid;
  };

  const quantizePoint = (p: Point): Point => {
    return {
      x: quantize(p.x),
      y: quantize(p.y),
    };
  };

  const emitPoint = (target: Point) => {
    if (!lastEmitted) {
      outPath.moveTo(target.x, target.y);
      lastEmitted = target;
      return;
    }

    if (lastEmitted.x === target.x && lastEmitted.y === target.y) {
      return;
    }

    if (cfg.style === 'orthogonal') {
      // 8-bit Manhattan staircase: if diagonal, insert corner step
      if (lastEmitted.x !== target.x && lastEmitted.y !== target.y) {
        // corner at (target.x, lastEmitted.y)
        outPath.lineTo(target.x, lastEmitted.y);
      }
      outPath.lineTo(target.x, target.y);
    } else {
      // direct stepped line
      outPath.lineTo(target.x, target.y);
    }

    lastEmitted = target;
  };

  for (const cmd of path.commands) {
    if (cmd.type === 'M') {
      curr = { x: cmd.x, y: cmd.y };
      const q = quantizePoint(curr);
      contourStart = q;
      lastEmitted = null;
      emitPoint(q);
    } else if (cmd.type === 'L') {
      const target: Point = { x: cmd.x, y: cmd.y };
      const d = dist(curr, target);
      const steps = Math.max(1, Math.ceil(d / sampleStep));

      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const pt: Point = {
          x: curr.x + t * (target.x - curr.x),
          y: curr.y + t * (target.y - curr.y),
        };
        emitPoint(quantizePoint(pt));
      }
      curr = target;
    } else if (cmd.type === 'C') {
      const p1: Point = { x: cmd.x1, y: cmd.y1 };
      const p2: Point = { x: cmd.x2, y: cmd.y2 };
      const p3: Point = { x: cmd.x, y: cmd.y };
      const chord = dist(curr, p3);
      const net = dist(curr, p1) + dist(p1, p2) + dist(p2, p3);
      const steps = Math.max(2, Math.ceil(((chord + net) / 2) / sampleStep));

      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const pt = getCubicPoint(curr, p1, p2, p3, t);
        emitPoint(quantizePoint(pt));
      }
      curr = p3;
    } else if (cmd.type === 'Q') {
      const p1: Point = { x: cmd.x1, y: cmd.y1 };
      const p2: Point = { x: cmd.x, y: cmd.y };
      const chord = dist(curr, p2);
      const net = dist(curr, p1) + dist(p1, p2);
      const steps = Math.max(2, Math.ceil(((chord + net) / 2) / sampleStep));

      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const pt = getQuadPoint(curr, p1, p2, t);
        emitPoint(quantizePoint(pt));
      }
      curr = p2;
    } else if (cmd.type === 'Z') {
      const d = dist(curr, contourStart);
      if (d > 0.5) {
        const steps = Math.max(1, Math.ceil(d / sampleStep));
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const pt: Point = {
            x: curr.x + t * (contourStart.x - curr.x),
            y: curr.y + t * (contourStart.y - curr.y),
          };
          emitPoint(quantizePoint(pt));
        }
      }
      if (lastEmitted && (lastEmitted.x !== contourStart.x || lastEmitted.y !== contourStart.y)) {
        if (cfg.style === 'orthogonal') {
          outPath.lineTo(contourStart.x, lastEmitted.y);
        }
        outPath.lineTo(contourStart.x, contourStart.y);
      }
      outPath.close();
      lastEmitted = null;
      curr = contourStart;
    }
  }

  return outPath;
}

/**
 * Transform curves into geometric faceted crystalline chords
 */
function transformCrystalline(path: opentype.Path, cfg: CrystallineConfig): opentype.Path {
  const outPath = new opentype.Path();
  const chordLen = Math.max(20, cfg.chordLength || 60);
  let curr: Point = { x: 0, y: 0 };
  let contourStart: Point = { x: 0, y: 0 };

  const addJitter = (p: Point, factor: number): Point => {
    if (cfg.randomness <= 0) return p;
    const angle = (p.x * 12.9898 + p.y * 78.233) % (Math.PI * 2);
    const r = (Math.abs(Math.sin(p.x + p.y)) * cfg.randomness) * factor;
    return {
      x: p.x + Math.cos(angle) * r,
      y: p.y + Math.sin(angle) * r,
    };
  };

  for (const cmd of path.commands) {
    if (cmd.type === 'M') {
      curr = { x: cmd.x, y: cmd.y };
      contourStart = { ...curr };
      const jp = addJitter(curr, 0.5);
      outPath.moveTo(jp.x, jp.y);
    } else if (cmd.type === 'L') {
      const target: Point = { x: cmd.x, y: cmd.y };
      const d = dist(curr, target);
      const steps = Math.max(1, Math.round(d / chordLen));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const pt: Point = {
          x: curr.x + t * (target.x - curr.x),
          y: curr.y + t * (target.y - curr.y),
        };
        const jp = addJitter(pt, i === steps ? 0.3 : 1);
        outPath.lineTo(jp.x, jp.y);
      }
      curr = target;
    } else if (cmd.type === 'C') {
      const p1: Point = { x: cmd.x1, y: cmd.y1 };
      const p2: Point = { x: cmd.x2, y: cmd.y2 };
      const p3: Point = { x: cmd.x, y: cmd.y };
      const d = dist(curr, p3);
      const steps = Math.max(2, Math.round(d / chordLen));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const pt = getCubicPoint(curr, p1, p2, p3, t);
        const jp = addJitter(pt, 1);
        outPath.lineTo(jp.x, jp.y);
      }
      curr = p3;
    } else if (cmd.type === 'Q') {
      const p1: Point = { x: cmd.x1, y: cmd.y1 };
      const p2: Point = { x: cmd.x, y: cmd.y };
      const d = dist(curr, p2);
      const steps = Math.max(2, Math.round(d / chordLen));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const pt = getQuadPoint(curr, p1, p2, t);
        const jp = addJitter(pt, 1);
        outPath.lineTo(jp.x, jp.y);
      }
      curr = p2;
    } else if (cmd.type === 'Z') {
      const d = dist(curr, contourStart);
      if (d > 0.5) {
        const steps = Math.max(1, Math.round(d / chordLen));
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const pt: Point = {
            x: curr.x + t * (contourStart.x - curr.x),
            y: curr.y + t * (contourStart.y - curr.y),
          };
          const jp = addJitter(pt, i === steps ? 0.3 : 1);
          outPath.lineTo(jp.x, jp.y);
        }
      }
      outPath.close();
      curr = contourStart;
    }
  }

  return outPath;
}

/**
 * Transform outlines with horizontal scanline glitch slicing
 */
function transformGlitch(path: opentype.Path, cfg: GlitchConfig): opentype.Path {
  const noise = new PerlinNoise(cfg.seed);
  const outPath = new opentype.Path();
  const sliceH = Math.max(20, cfg.sliceHeight || 60);

  const getShift = (y: number): number => {
    const sliceIndex = Math.floor(y / sliceH);
    const n = noise.noise2D(sliceIndex * 0.35, 12.34);
    if (Math.abs(n) > (1 - cfg.frequency)) {
      return (n > 0 ? 1 : -1) * cfg.displacement * (0.5 + Math.abs(n) * 0.5);
    }
    return 0;
  };

  const displace = (p: Point): Point => {
    return {
      x: p.x + getShift(p.y),
      y: p.y,
    };
  };

  let curr: Point = { x: 0, y: 0 };
  let contourStart: Point = { x: 0, y: 0 };

  for (const cmd of path.commands) {
    if (cmd.type === 'M') {
      curr = { x: cmd.x, y: cmd.y };
      contourStart = { ...curr };
      const p = displace(curr);
      outPath.moveTo(p.x, p.y);
    } else if (cmd.type === 'L') {
      const target: Point = { x: cmd.x, y: cmd.y };
      const dy = Math.abs(target.y - curr.y);
      if (dy > sliceH) {
        const steps = Math.max(2, Math.ceil(dy / (sliceH * 0.8)));
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const pt: Point = {
            x: curr.x + t * (target.x - curr.x),
            y: curr.y + t * (target.y - curr.y),
          };
          const p = displace(pt);
          outPath.lineTo(p.x, p.y);
        }
      } else {
        const p = displace(target);
        outPath.lineTo(p.x, p.y);
      }
      curr = target;
    } else if (cmd.type === 'C') {
      const p1 = displace({ x: cmd.x1, y: cmd.y1 });
      const p2 = displace({ x: cmd.x2, y: cmd.y2 });
      const p = displace({ x: cmd.x, y: cmd.y });
      outPath.curveTo(p1.x, p1.y, p2.x, p2.y, p.x, p.y);
      curr = { x: cmd.x, y: cmd.y };
    } else if (cmd.type === 'Q') {
      const p1 = displace({ x: cmd.x1, y: cmd.y1 });
      const p = displace({ x: cmd.x, y: cmd.y });
      outPath.quadTo(p1.x, p1.y, p.x, p.y);
      curr = { x: cmd.x, y: cmd.y };
    } else if (cmd.type === 'Z') {
      const d = dist(curr, contourStart);
      if (d > 0.5) {
        const dy = Math.abs(contourStart.y - curr.y);
        if (dy > sliceH) {
          const steps = Math.max(2, Math.ceil(dy / (sliceH * 0.8)));
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const pt: Point = {
              x: curr.x + t * (contourStart.x - curr.x),
              y: curr.y + t * (contourStart.y - curr.y),
            };
            const p = displace(pt);
            outPath.lineTo(p.x, p.y);
          }
        } else {
          const p = displace(contourStart);
          outPath.lineTo(p.x, p.y);
        }
      }
      outPath.close();
      curr = contourStart;
    }
  }

  return outPath;
}

/**
 * Organic downward noise melt / gravity drip
 */
function transformMelt(path: opentype.Path, cfg: MeltConfig): opentype.Path {
  const noise = new PerlinNoise(cfg.seed);
  const outPath = new opentype.Path();
  const stepSize = 25;

  let curr: Point = { x: 0, y: 0 };
  let contourStart: Point = { x: 0, y: 0 };
  let startDisplaced: Point = { x: 0, y: 0 };

  const displace = (p: Point): Point => {
    const dripNoise = noise.fbm2D(p.x * cfg.viscosity, 42.0, 2, 0.5);
    const pull = Math.max(0, dripNoise + 0.4) * cfg.gravity;
    return {
      x: p.x,
      y: p.y - pull, // font y is positive upwards, so -pull pulls downwards
    };
  };

  for (const cmd of path.commands) {
    if (cmd.type === 'M') {
      curr = { x: cmd.x, y: cmd.y };
      contourStart = { ...curr };
      startDisplaced = displace(curr);
      outPath.moveTo(startDisplaced.x, startDisplaced.y);
    } else if (cmd.type === 'L') {
      const target: Point = { x: cmd.x, y: cmd.y };
      const d = dist(curr, target);
      if (d < 4) {
        const dp = displace(target);
        outPath.lineTo(dp.x, dp.y);
      } else {
        const steps = Math.max(1, Math.ceil(d / stepSize));
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const pt: Point = {
            x: curr.x + t * (target.x - curr.x),
            y: curr.y + t * (target.y - curr.y),
          };
          const dp = displace(pt);
          outPath.lineTo(dp.x, dp.y);
        }
      }
      curr = target;
    } else if (cmd.type === 'C') {
      const p1: Point = { x: cmd.x1, y: cmd.y1 };
      const p2: Point = { x: cmd.x2, y: cmd.y2 };
      const p3: Point = { x: cmd.x, y: cmd.y };
      const chord = dist(curr, p3);
      const steps = Math.max(3, Math.ceil(chord / stepSize));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const pt = getCubicPoint(curr, p1, p2, p3, t);
        const dp = displace(pt);
        outPath.lineTo(dp.x, dp.y);
      }
      curr = p3;
    } else if (cmd.type === 'Q') {
      const p1: Point = { x: cmd.x1, y: cmd.y1 };
      const p2: Point = { x: cmd.x, y: cmd.y };
      const chord = dist(curr, p2);
      const steps = Math.max(3, Math.ceil(chord / stepSize));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const pt = getQuadPoint(curr, p1, p2, t);
        const dp = displace(pt);
        outPath.lineTo(dp.x, dp.y);
      }
      curr = p2;
    } else if (cmd.type === 'Z') {
      const d = dist(curr, contourStart);
      if (d > 0.5) {
        const steps = Math.max(2, Math.ceil(d / stepSize));
        for (let i = 1; i < steps; i++) {
          const t = i / steps;
          const pt: Point = {
            x: curr.x + t * (contourStart.x - curr.x),
            y: curr.y + t * (contourStart.y - curr.y),
          };
          const dp = displace(pt);
          outPath.lineTo(dp.x, dp.y);
        }
        outPath.lineTo(startDisplaced.x, startDisplaced.y);
      }
      outPath.close();
      curr = contourStart;
    }
  }

  return outPath;
}

function hash1D(x: number, seed: number): number {
  const n = Math.sin(x * 127.1 + seed * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

/**
 * Procedural CRT Monitor glyph distortion:
 * - Spherical CRT tube glass curvature (barrel distortion)
 * - Horizontal electron beam scanline raster displacement & stepping
 * - Odd/even interlace scanline shift
 * - Horizontal beam sync jitter & magnetic phosphor drift
 * - Vertical sync beam hum/roll
 */
function transformCRT(path: opentype.Path, cfg: CRTConfig): opentype.Path {
  const outPath = new opentype.Path();
  const bbox = path.getBoundingBox();
  const minX = bbox.x1;
  const maxX = bbox.x2;
  const minY = bbox.y1;
  const maxY = bbox.y2;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const halfW = Math.max(60, (maxX - minX) / 2);
  const halfH = Math.max(60, (maxY - minY) / 2);

  const scanH = Math.max(6, cfg.scanlineHeight || 28);
  const curveAmount = (cfg.curvature || 0) / 100;
  const jitterAmount = cfg.rasterJitter || 0;
  const interlaceAmount = cfg.interlaceShift || 0;
  const beamRollAmount = cfg.beamRoll || 0;
  const seed = cfg.seed || 42;

  const displace = (p: Point): Point => {
    // 1. Barrel tube curvature (bulging outward from screen center)
    const dx = p.x - cx;
    const dy = p.y - cy;
    const nx = dx / halfW;
    const ny = dy / halfH;
    const r2 = nx * nx + ny * ny;

    const barrelX = p.x + dx * curveAmount * (0.15 * ny * ny + 0.1 * r2);
    const barrelY = p.y + dy * curveAmount * (0.15 * nx * nx + 0.1 * r2);

    // 2. Scanline raster stepping
    const lineIndex = Math.floor(barrelY / scanH);
    const linePhase = (((barrelY % scanH) + scanH) % scanH) / scanH;

    // Alternating interlace shift on odd/even scanlines
    const interlace = (lineIndex % 2 === 0 ? 1 : -1) * interlaceAmount * Math.sin(linePhase * Math.PI);

    // 3. Horizontal raster jitter / beam drift
    const jitter = (hash1D(lineIndex, seed) - 0.5) * 2 * jitterAmount;

    // 4. Vertical sync / beam roll wobble
    const beamRoll = Math.sin(barrelY * 0.012 + seed * 0.1) * beamRollAmount;

    return {
      x: barrelX + interlace + jitter + beamRoll,
      y: barrelY,
    };
  };

  const stepSize = Math.max(6, Math.min(18, scanH / 2));
  let curr: Point = { x: 0, y: 0 };
  let contourStart: Point = { x: 0, y: 0 };
  let startDisplaced: Point = { x: 0, y: 0 };

  const commands = path.commands;
  for (let cIdx = 0; cIdx < commands.length; cIdx++) {
    const cmd = commands[cIdx];
    if (cmd.type === 'M') {
      curr = { x: cmd.x, y: cmd.y };
      contourStart = { ...curr };
      startDisplaced = displace(curr);
      outPath.moveTo(startDisplaced.x, startDisplaced.y);
    } else if (cmd.type === 'L') {
      const target: Point = { x: cmd.x, y: cmd.y };
      const dTotal = dist(curr, target);
      const steps = Math.max(1, Math.ceil(dTotal / stepSize));
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const pt: Point = {
          x: curr.x + (target.x - curr.x) * t,
          y: curr.y + (target.y - curr.y) * t,
        };
        const dp = displace(pt);
        outPath.lineTo(dp.x, dp.y);
      }
      curr = target;
    } else if (cmd.type === 'C') {
      const p1: Point = { x: cmd.x1, y: cmd.y1 };
      const p2: Point = { x: cmd.x2, y: cmd.y2 };
      const p3: Point = { x: cmd.x, y: cmd.y };
      const chord = dist(curr, p3);
      const steps = Math.max(3, Math.ceil(chord / stepSize));
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const pt = getCubicPoint(curr, p1, p2, p3, t);
        const dp = displace(pt);
        outPath.lineTo(dp.x, dp.y);
      }
      curr = p3;
    } else if (cmd.type === 'Q') {
      const p1: Point = { x: cmd.x1, y: cmd.y1 };
      const p2: Point = { x: cmd.x, y: cmd.y };
      const chord = dist(curr, p2);
      const steps = Math.max(3, Math.ceil(chord / stepSize));
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const pt = getQuadPoint(curr, p1, p2, t);
        const dp = displace(pt);
        outPath.lineTo(dp.x, dp.y);
      }
      curr = p2;
    } else if (cmd.type === 'Z') {
      const d = dist(curr, contourStart);
      if (d > 0.5) {
        const steps = Math.max(1, Math.ceil(d / stepSize));
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          const pt: Point = {
            x: curr.x + t * (contourStart.x - curr.x),
            y: curr.y + t * (contourStart.y - curr.y),
          };
          const dp = displace(pt);
          outPath.lineTo(dp.x, dp.y);
        }
        outPath.lineTo(startDisplaced.x, startDisplaced.y);
      }
      outPath.close();
      curr = contourStart;
    }
  }

  return outPath;
}

/**
 * Filter glyphs for batch processing based on scope
 */
export function isGlyphInScope(
  glyph: opentype.Glyph,
  scope: BatchStyleConfig['scope'],
  customChars: string,
  currentGlyphIndex?: number | null
): boolean {
  if (!glyph || !glyph.path || glyph.path.commands.length === 0) {
    return false;
  }

  if (scope === 'current') {
    return currentGlyphIndex !== undefined && currentGlyphIndex !== null
      ? glyph.index === currentGlyphIndex
      : false;
  }

  const unicode = glyph.unicode;
  if (!unicode) {
    return scope === 'all';
  }

  const char = String.fromCharCode(unicode);

  switch (scope) {
    case 'all':
      return true;
    case 'latin':
      return unicode >= 32 && unicode <= 126;
    case 'uppercase':
      return unicode >= 65 && unicode <= 90;
    case 'lowercase':
      return unicode >= 97 && unicode <= 122;
    case 'numbers':
      return unicode >= 48 && unicode <= 57;
    case 'custom':
      return customChars.includes(char) || customChars.includes(glyph.name);
    default:
      return true;
  }
}

/**
 * Curated artistic style presets
 */
export interface PresetItem {
  id: string;
  name: string;
  category: 'perlin' | 'pixelate' | 'artistic';
  description: string;
  config: Partial<BatchStyleConfig>;
}

export const STYLE_PRESETS: PresetItem[] = [
  {
    id: 'perlin-sawtooth',
    name: 'Perlin Sawtooth Jagged',
    category: 'perlin',
    description: 'High-energy organic jagged edges displacing along outline normals',
    config: {
      mode: 'perlin',
      perlin: {
        scale: 0.015,
        amplitude: 45,
        octaves: 3,
        roughness: 0.55,
        seed: 42,
        stepSize: 16,
        displacementMode: 'normal',
      },
    },
  },
  {
    id: 'perlin-electric',
    name: 'Electric Lightning Fracture',
    category: 'perlin',
    description: 'Ultra-rough high-frequency fractal spikes reminiscent of electricity',
    config: {
      mode: 'perlin',
      perlin: {
        scale: 0.04,
        amplitude: 35,
        octaves: 4,
        roughness: 0.7,
        seed: 108,
        stepSize: 10,
        displacementMode: '2d',
      },
    },
  },
  {
    id: 'perlin-rough-woodcut',
    name: 'Rough Woodcut Stamp',
    category: 'perlin',
    description: 'Subtle hand-carved organic irregularities and ink-bleed roughness',
    config: {
      mode: 'perlin',
      perlin: {
        scale: 0.008,
        amplitude: 22,
        octaves: 2,
        roughness: 0.45,
        seed: 777,
        stepSize: 22,
        displacementMode: 'normal',
      },
    },
  },
  {
    id: 'pixel-8bit-arcade',
    name: '8-Bit Arcade Pixelate',
    category: 'pixelate',
    description: 'Crisp orthogonal Manhattan staircase steps for authentic retro arcade type',
    config: {
      mode: 'pixelate',
      pixelate: {
        gridSize: 48,
        style: 'orthogonal',
        align: 'origin',
      },
    },
  },
  {
    id: 'pixel-chunky',
    name: 'Heavy Voxel Stepped',
    category: 'pixelate',
    description: 'Chunky low-resolution stepped blocks with larger pixel quantization',
    config: {
      mode: 'pixelate',
      pixelate: {
        gridSize: 80,
        style: 'orthogonal',
        align: 'baseline',
      },
    },
  },
  {
    id: 'pixel-fine-dither',
    name: 'Fine Matrix 16-Bit',
    category: 'pixelate',
    description: 'Delicate high-density pixel quantization preserving nuanced letterforms',
    config: {
      mode: 'pixelate',
      pixelate: {
        gridSize: 28,
        style: 'orthogonal',
        align: 'origin',
      },
    },
  },
  {
    id: 'crystalline-facets',
    name: 'Crystalline Low-Poly',
    category: 'artistic',
    description: 'Geometric faceted chords turning bezier curves into diamond-cut edges',
    config: {
      mode: 'crystalline',
      crystalline: {
        chordLength: 70,
        randomness: 12,
      },
    },
  },
  {
    id: 'glitch-cyber-slice',
    name: 'Cyber Scanline Glitch',
    category: 'artistic',
    description: 'Horizontal scanline jitter bands and television broadcast disruption',
    config: {
      mode: 'glitch',
      glitch: {
        frequency: 0.45,
        sliceHeight: 55,
        displacement: 65,
        seed: 99,
      },
    },
  },
  {
    id: 'melt-acid-drip',
    name: 'Acid Slime Melt',
    category: 'artistic',
    description: 'Downward viscous dripping distortion guided by gravitational flow',
    config: {
      mode: 'melt',
      melt: {
        gravity: 55,
        viscosity: 0.007,
        droopThreshold: 0,
        seed: 314,
      },
    },
  },
  {
    id: 'crt-retro-terminal',
    name: 'CRT Phosphor Terminal',
    category: 'artistic',
    description: '1980s green-screen phosphor monitor with scanlines and barrel tube curvature',
    config: {
      mode: 'crt',
      crt: {
        scanlineHeight: 28,
        curvature: 22,
        rasterJitter: 10,
        interlaceShift: 12,
        beamRoll: 8,
        seed: 42,
      },
    },
  },
  {
    id: 'crt-arcade-raster',
    name: 'CRT Arcade Raster Beam',
    category: 'artistic',
    description: 'High-contrast arcade CRT monitor with heavy alternating interlace beam steps',
    config: {
      mode: 'crt',
      crt: {
        scanlineHeight: 38,
        curvature: 28,
        rasterJitter: 18,
        interlaceShift: 20,
        beamRoll: 16,
        seed: 88,
      },
    },
  },
  {
    id: 'crt-cyber-sync',
    name: 'CRT Cyber Magnetic Roll',
    category: 'artistic',
    description: 'Electromagnetic sync roll and raster jitter across curved cathode tube',
    config: {
      mode: 'crt',
      crt: {
        scanlineHeight: 22,
        curvature: 35,
        rasterJitter: 22,
        interlaceShift: 8,
        beamRoll: 28,
        seed: 314,
      },
    },
  },
];

export {
  mergePathPointsByDistance,
  simplifyPathRDP,
  simplifySvgPathRDP,
  simplifyClosedPolygonRDP,
  rdp,
} from './pointMerger';


