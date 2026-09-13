import * as opentype from 'opentype.js';

let activeBlobUrl: string | null = null;

/**
 * Sanitizes OpenType GSUB and GPOS layout tables.
 * opentype.js asserts that every script record in GSUB/GPOS has a valid defaultLangSys.
 * If a font has scripts (e.g. 'cyrl', 'latn') with defaultLangSys missing, opentype.js throws:
 * "Unable to write GSUB: script [tag] has no default language system."
 * This helper injects a compliant empty defaultLangSys to prevent serialization errors.
 */
export function sanitizeFontLayoutTables(font: opentype.Font): void {
  if (!font || !font.tables) return;

  const tableNames = ['gsub', 'gpos'] as const;
  for (const tableName of tableNames) {
    const table = (font.tables as any)[tableName];
    if (table && Array.isArray(table.scripts)) {
      for (const scriptRecord of table.scripts) {
        if (scriptRecord && scriptRecord.script) {
          if (!scriptRecord.script.defaultLangSys) {
            scriptRecord.script.defaultLangSys = {
              lookupOrder: 0,
              reqFeatureIndex: 65535,
              featureIndexes: [],
            };
          } else {
            if (typeof scriptRecord.script.defaultLangSys.reqFeatureIndex !== 'number') {
              scriptRecord.script.defaultLangSys.reqFeatureIndex = 65535;
            }
            if (!Array.isArray(scriptRecord.script.defaultLangSys.featureIndexes)) {
              scriptRecord.script.defaultLangSys.featureIndexes = [];
            }
          }
          if (!Array.isArray(scriptRecord.script.langSysRecords)) {
            scriptRecord.script.langSysRecords = [];
          }
        }
      }
    }
  }
}

/**
 * Safely converts an opentype.Font instance to an ArrayBuffer with multi-tier fallbacks.
 * Prevents crashes caused by GSUB script assertion errors or unsupported OpenType tables.
 */
export function safeFontToArrayBuffer(font: opentype.Font): ArrayBuffer {
  // Step 1: Sanitize known script layout issues
  sanitizeFontLayoutTables(font);

  // Attempt standard serialization
  try {
    return font.toArrayBuffer();
  } catch (err1: any) {
    console.warn(
      '[FontExport] Standard toArrayBuffer failed, attempting serialization without GSUB/GPOS:',
      err1?.message
    );
  }

  // Step 2: If GSUB/GPOS has unsupported lookup types or other writing bugs in opentype.js,
  // temporarily strip them for buffer generation so rendering and export succeed
  const savedGsub = (font.tables as any).gsub;
  const savedGpos = (font.tables as any).gpos;
  const savedGdef = (font.tables as any).gdef;

  try {
    delete (font.tables as any).gsub;
    delete (font.tables as any).gpos;
    delete (font.tables as any).gdef;
    const buf = font.toArrayBuffer();

    // Restore tables on the in-memory font instance
    if (savedGsub) (font.tables as any).gsub = savedGsub;
    if (savedGpos) (font.tables as any).gpos = savedGpos;
    if (savedGdef) (font.tables as any).gdef = savedGdef;

    return buf;
  } catch (err2: any) {
    // Restore tables
    if (savedGsub) (font.tables as any).gsub = savedGsub;
    if (savedGpos) (font.tables as any).gpos = savedGpos;
    if (savedGdef) (font.tables as any).gdef = savedGdef;

    console.warn(
      '[FontExport] Fallback without GSUB/GPOS failed, constructing clean Font instance:',
      err2?.message
    );
  }

  // Step 3: Minimal reconstructed Font instance containing only essential glyphs and metrics
  const glyphList: opentype.Glyph[] = [];
  for (let i = 0; i < font.glyphs.length; i++) {
    glyphList.push(font.glyphs.get(i));
  }

  const cleanFont = new opentype.Font({
    familyName:
      font.getEnglishName('fontFamily') ||
      font.names?.fontFamily?.en ||
      'StylizedFont',
    styleName:
      font.getEnglishName('fontSubfamily') ||
      font.names?.fontSubfamily?.en ||
      'Regular',
    unitsPerEm: font.unitsPerEm || 1000,
    ascender: font.ascender || 800,
    descender: font.descender || -200,
    glyphs: glyphList,
  });

  return cleanFont.toArrayBuffer();
}

/**
 * Injects a live @font-face into the document for real-time CSS typography rendering.
 */
export async function injectLiveFontFace(
  font: opentype.Font,
  familyName: string = 'StylizedFontLive'
): Promise<string> {
  try {
    const buffer = safeFontToArrayBuffer(font);
    const blob = new Blob([buffer], { type: 'font/opentype' });
    const newUrl = URL.createObjectURL(blob);

    if (activeBlobUrl) {
      URL.revokeObjectURL(activeBlobUrl);
    }
    activeBlobUrl = newUrl;

    if (typeof window !== 'undefined' && 'fonts' in document) {
      const fontFace = new FontFace(familyName, `url(${newUrl})`);
      const loadedFace = await fontFace.load();
      // Remove any existing face with the same family
      document.fonts.forEach((face) => {
        if (face.family === familyName) {
          document.fonts.delete(face);
        }
      });
      document.fonts.add(loadedFace);
    }

    return newUrl;
  } catch (err) {
    console.error('Error injecting live font face:', err);
    throw err;
  }
}

/**
 * Downloads the current font as an OTF or TTF file.
 */
export function downloadFontFile(
  font: opentype.Font,
  format: 'otf' | 'ttf',
  customFamilyName?: string,
  customStyleName?: string
): void {
  try {
    const family = customFamilyName?.trim() || font.getEnglishName('fontFamily') || 'CustomFont';
    const style = customStyleName?.trim() || font.getEnglishName('fontSubfamily') || 'Regular';

    // Gather all glyphs
    const glyphList: opentype.Glyph[] = [];
    for (let i = 0; i < font.glyphs.length; i++) {
      glyphList.push(font.glyphs.get(i));
    }

    // Build fresh font with proper names
    const exportFontObj = new opentype.Font({
      familyName: family,
      styleName: style,
      unitsPerEm: font.unitsPerEm || 1000,
      ascender: font.ascender || 800,
      descender: font.descender || -200,
      glyphs: glyphList,
    });

    const buffer = safeFontToArrayBuffer(exportFontObj);
    const mimeType = format === 'otf' ? 'font/otf' : 'font/ttf';
    const blob = new Blob([buffer], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const safeFilename = `${family.replace(/[^a-zA-Z0-9_-]/g, '_')}-${style.replace(/[^a-zA-Z0-9_-]/g, '_')}.${format}`;

    const link = document.createElement('a');
    link.href = url;
    link.download = safeFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error('Failed to export font file:', err);
    throw err;
  }
}

/**
 * Exports a single glyph as a standalone SVG vector file.
 */
export function downloadGlyphSvg(
  glyph: opentype.Glyph,
  font: opentype.Font
): void {
  try {
    const upem = font.unitsPerEm || 1000;
    const ascender = font.ascender || 800;
    const descender = font.descender || -200;
    const totalHeight = ascender - descender;
    const width = Math.max(100, glyph.advanceWidth || upem);

    const pathData = glyph.path ? glyph.path.toPathData(2) : '';
    // Font coords: y is up. In SVG viewBox, we scale by (1, -1) and translate by -ascender
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${-ascender} ${width} ${totalHeight}" width="${width}" height="${totalHeight}">
  <g transform="scale(1, -1)">
    <path d="${pathData}" fill="currentColor" />
  </g>
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const charName = glyph.name || (glyph.unicode ? String.fromCharCode(glyph.unicode) : 'glyph');
    const safeName = `glyph_${charName.replace(/[^a-zA-Z0-9_-]/g, '_')}.svg`;

    const link = document.createElement('a');
    link.href = url;
    link.download = safeName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error('Failed to export glyph SVG:', err);
    throw err;
  }
}

/**
 * Generates ready-to-copy CSS @font-face code snippet.
 */
export function generateCssSnippet(familyName: string, filename: string): string {
  return `/* Copy this snippet into your website CSS */
@font-face {
  font-family: '${familyName}';
  src: url('${filename}') format('opentype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

/* Example usage */
.artistic-typography {
  font-family: '${familyName}', system-ui, sans-serif;
  letter-spacing: 0.05em;
}`;
}
