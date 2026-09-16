import type { Glyph } from 'opentype.js';

export type FontFormat = 'otf' | 'ttf' | 'woff';

export type GlyphData = Glyph;

export type StylingMode =
  | 'perlin'
  | 'pixelate'
  | 'crystalline'
  | 'glitch'
  | 'melt'
  | 'crt'
  | 'heat-haze'
  | 'ascii'
  | 'pseudo-3d';

export type BatchScope = 'all' | 'latin' | 'uppercase' | 'lowercase' | 'numbers' | 'custom' | 'current';

export interface PerlinConfig {
  scale: number; // noise frequency, e.g. 0.005 to 0.05
  amplitude: number; // displacement in font units, e.g. 10 to 120
  octaves: number; // 1 to 4
  roughness: number; // persistence, 0.2 to 0.8
  seed: number; // integer
  stepSize: number; // segment subdivision length in font units, e.g. 10 to 50
  displacementMode: 'normal' | '2d' | 'horizontal' | 'vertical';
}

export interface PixelateConfig {
  gridSize: number; // size of pixel block in font units, e.g. 20 to 120
  style: 'orthogonal' | 'stepped' | 'blocks';
  align: 'origin' | 'baseline';
}

export interface CrystallineConfig {
  chordLength: number; // distance between polygon vertices, e.g. 30 to 180
  randomness: number; // jitter on vertices, 0 to 40
}

export interface GlitchConfig {
  frequency: number; // probability of glitch slice, 0.1 to 0.9
  sliceHeight: number; // vertical height of glitch bands, 20 to 200
  displacement: number; // horizontal offset, 20 to 150
  seed: number;
}

export interface MeltConfig {
  gravity: number; // downwards stretch, 10 to 150
  viscosity: number; // noise scale for drip streaks, 0.002 to 0.02
  droopThreshold: number; // only affect lower or all sections
  seed: number;
}

export interface CRTConfig {
  scanlineHeight: number; // scanline thickness/pitch in font units, e.g. 12 to 60
  curvature: number; // CRT barrel tube curvature bulge, 0 to 50
  rasterJitter: number; // horizontal electron beam sync jitter, 0 to 35
  interlaceShift: number; // alternating odd/even raster line offset, 0 to 30
  beamRoll: number; // vertical sync tracking hum / roll distortion, -40 to 40
  seed: number;
}

export interface HeatHazeConfig {
  wobble: number; // horizontal shimmer amplitude, 5 to 60
  verticalStretch: number; // thermal buoyant elongation, 0 to 50
  frequency: number; // wave ripple frequency, 0.005 to 0.05
  groundTurbulence: number; // bottom-heavy heat mirage factor, 0.2 to 2.5
  seed: number;
}

export interface ASCIIConfig {
  charSize: number; // cell grid pitch in font units, 24 to 80
  charset: 'density' | 'binary' | 'matrix' | 'alphanumeric';
  fillThreshold: number; // minimum coverage threshold to draw cell, 0.1 to 0.7
  scale: number; // scale of micro-character inside cell, 0.5 to 1.0
}

export interface Pseudo3DConfig {
  depth: number; // extrusion offset distance in font units, 15 to 120
  angle: number; // projection angle in degrees (e.g. 45 for top-right, 135, etc.)
  layers: number; // number of extruded stepping shadow/depth layers, 1 to 8
  style: 'isometric' | 'stacked' | 'wire-offset';
}

export interface BatchStyleConfig {
  mode: StylingMode;
  scope: BatchScope;
  customChars: string;
  perlin: PerlinConfig;
  pixelate: PixelateConfig;
  crystalline: CrystallineConfig;
  glitch: GlitchConfig;
  melt: MeltConfig;
  crt: CRTConfig;
  heatHaze: HeatHazeConfig;
  ascii: ASCIIConfig;
  pseudo3D: Pseudo3DConfig;
}

export interface FontMetadata {
  family: string;
  subfamily: string;
  fullName: string;
  postScriptName: string;
  version: string;
  designer: string;
  description: string;
  copyright: string;
  unitsPerEm: number;
  ascender: number;
  descender: number;
  glyphCount: number;
}

export interface GlyphItemInfo {
  index: number;
  unicode?: number;
  name: string;
  char?: string;
  advanceWidth: number;
  leftSideBearing?: number;
  hasContours: boolean;
  pointCount: number;
}

export type SpecimenMode = 'tester' | 'waterfall' | 'comparison' | 'poster';

export interface PreviewSettings {
  text: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  textColor: string;
  bgColor: string;
  specimenMode: SpecimenMode;
  splitPosition: number; // 0 to 100 for comparison slider
}
