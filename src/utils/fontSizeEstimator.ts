import * as opentype from 'opentype.js';
import type { BatchStyleConfig } from '../types';
import { transformGlyphPath } from './fontStyling';
import { safeFontToArrayBuffer } from './fontExport';

export interface FontSizeDetails {
  currentSizeBytes: number;
  originalSizeBytes: number;
  deltaBytes: number;
  deltaPercentage: number;
  totalPoints: number;
  originalPoints: number;
  projectedSizeBytes: number;
  projectedDeltaBytes: number;
  projectedDeltaPercentage: number;
  estimatedWoff2Bytes: number;
  category: 'optimal' | 'good' | 'moderate' | 'heavy';
  categoryLabel: string;
}

/**
 * Formats a byte number to human-readable string (e.g. 48.2 KB).
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (isNaN(bytes) || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const absBytes = Math.abs(bytes);
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(absBytes) / Math.log(k)));
  const val = (bytes / Math.pow(k, i)).toFixed(dm);
  return `${val} ${sizes[i]}`;
}

/**
 * Counts the total number of vector path commands (vertices/nodes) in a font.
 */
export function countFontPathCommands(font: opentype.Font): number {
  if (!font || !font.glyphs) return 0;
  let total = 0;
  for (let i = 0; i < font.glyphs.length; i++) {
    const g = font.glyphs.get(i);
    if (g && g.path && Array.isArray(g.path.commands)) {
      total += g.path.commands.length;
    }
  }
  return total;
}

/**
 * Measures the exact binary size in bytes of an in-memory font by serializing it safely.
 */
export function getFontExactByteLength(font: opentype.Font): number {
  try {
    const buf = safeFontToArrayBuffer(font);
    return buf.byteLength;
  } catch (err) {
    console.warn('[fontSizeEstimator] Failed to serialize font, estimating:', err);
    // Fallback estimation: 24KB table overhead + 4 bytes per command
    const commands = countFontPathCommands(font);
    return 24576 + commands * 4;
  }
}

/**
 * Calculates detailed font size statistics and estimates the projected impact of a batch styling operation.
 */
export function calculateFontSizeDetails(
  font: opentype.Font | null,
  originalFont: opentype.Font | null,
  originalBufferLength: number,
  batchConfig: BatchStyleConfig,
  targetGlyphs: opentype.Glyph[],
  activeGlyph: opentype.Glyph | null,
  knownCurrentSizeBytes?: number
): FontSizeDetails {
  if (!font) {
    return {
      currentSizeBytes: 0,
      originalSizeBytes: 0,
      deltaBytes: 0,
      deltaPercentage: 0,
      totalPoints: 0,
      originalPoints: 0,
      projectedSizeBytes: 0,
      projectedDeltaBytes: 0,
      projectedDeltaPercentage: 0,
      estimatedWoff2Bytes: 0,
      category: 'optimal',
      categoryLabel: 'N/A',
    };
  }

  const currentSize = knownCurrentSizeBytes ?? getFontExactByteLength(font);
  const origSize = originalBufferLength > 0 ? originalBufferLength : currentSize;
  const currentTotalPoints = countFontPathCommands(font);
  const origTotalPoints = originalFont ? countFontPathCommands(originalFont) : currentTotalPoints;

  const deltaBytes = currentSize - origSize;
  const deltaPercentage = origSize > 0 ? (deltaBytes / origSize) * 100 : 0;

  // Approximate projected size if batch styling is applied to targeted glyphs
  let projectedSizeBytes = currentSize;

  if (targetGlyphs.length > 0) {
    // Determine the point scaling factor for the current effect configuration
    // Pick a test glyph (active glyph if in targets, or first target glyph with contours)
    let testGlyph = activeGlyph && targetGlyphs.some((g) => g.index === activeGlyph.index) ? activeGlyph : null;
    if (!testGlyph) {
      testGlyph = targetGlyphs.find((g) => g.path && g.path.commands && g.path.commands.length > 3) || null;
    }

    if (testGlyph && testGlyph.path && testGlyph.path.commands && testGlyph.path.commands.length > 0) {
      try {
        const origCommandCount = testGlyph.path.commands.length;
        const styledPath = transformGlyphPath(testGlyph.path, batchConfig);
        const styledCommandCount = styledPath.commands.length;

        const ratio = styledCommandCount / Math.max(1, origCommandCount);

        // Sum original points among target glyphs
        let targetPointsTotal = 0;
        for (const tg of targetGlyphs) {
          if (tg.path && tg.path.commands) {
            targetPointsTotal += tg.path.commands.length;
          }
        }

        // Each vector point in TrueType/OpenType requires approximately 3.6 to 4.2 bytes
        // (coordinate deltas, flags, on-curve bitmask, end-contour indices)
        const pointDelta = (styledCommandCount - origCommandCount) * (targetGlyphs.length / 1);
        const approxDeltaBytes = Math.round(pointDelta * 3.8);

        projectedSizeBytes = Math.max(currentSize, currentSize + approxDeltaBytes);
      } catch (e) {
        projectedSizeBytes = currentSize;
      }
    }
  }

  const projectedDeltaBytes = projectedSizeBytes - origSize;
  const projectedDeltaPercentage = origSize > 0 ? (projectedDeltaBytes / origSize) * 100 : 0;

  // WOFF2 typically achieves 45-60% compression ratio on TrueType/OpenType font binaries
  const estimatedWoff2Bytes = Math.round(projectedSizeBytes * 0.48);

  // Category evaluation
  let category: FontSizeDetails['category'] = 'optimal';
  let categoryLabel = 'Optimal (< 100 KB)';

  if (projectedSizeBytes > 500 * 1024) {
    category = 'heavy';
    categoryLabel = 'Heavy (> 500 KB)';
  } else if (projectedSizeBytes > 250 * 1024) {
    category = 'moderate';
    categoryLabel = 'Moderate (250 - 500 KB)';
  } else if (projectedSizeBytes > 100 * 1024) {
    category = 'good';
    categoryLabel = 'Normal (100 - 250 KB)';
  }

  return {
    currentSizeBytes: currentSize,
    originalSizeBytes: origSize,
    deltaBytes,
    deltaPercentage,
    totalPoints: currentTotalPoints,
    originalPoints: origTotalPoints,
    projectedSizeBytes,
    projectedDeltaBytes,
    projectedDeltaPercentage,
    estimatedWoff2Bytes,
    category,
    categoryLabel,
  };
}
