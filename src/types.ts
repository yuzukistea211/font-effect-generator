import type { Font, Glyph } from 'opentype.js';

export type FontFormat = 'otf' | 'ttf' | 'woff';

export type GlyphData = Glyph;

export type StylingMode = 'perlin' | 'pixelate' | 'crystalline' | 'glitch' | 'melt';

export type BatchScope = 'all' | 'latin' | 'uppercase' | 'lowercase' | 'numbers' | 'custom';

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

export interface BatchStyleConfig {
  mode: StylingMode;
  scope: BatchScope;
  customChars: string;
  perlin: PerlinConfig;
  pixelate: PixelateConfig;
  crystalline: CrystallineConfig;
  glitch: GlitchConfig;
  melt: MeltConfig;
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
