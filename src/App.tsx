/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as opentype from 'opentype.js';
import confetti from 'canvas-confetti';
import { Navbar } from './components/Navbar';
import { BatchProcessingPanel } from './components/BatchProcessingPanel';
import { GlyphCanvasEditor } from './components/GlyphCanvasEditor';
import { GlyphGrid } from './components/GlyphGrid';
import { PreviewDashboard } from './components/PreviewDashboard';
import { FontMetadataModal } from './components/FontMetadataModal';
import { CssSnippetModal } from './components/CssSnippetModal';
import type {
  BatchStyleConfig,
  FontMetadata,
  PreviewSettings,
} from './types';
import {
  transformGlyphPath,
  isGlyphInScope,
  clonePath,
} from './utils/fontStyling';
import {
  injectLiveFontFace,
  downloadFontFile,
  sanitizeFontLayoutTables,
} from './utils/fontExport';
import { mergePathPointsByDistance, simplifyPathRDP } from './utils/pointMerger';
import {
  Upload,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

const getAssetUrl = (relPath: string) => {
  const base = import.meta.env.BASE_URL || './';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = relPath.startsWith('/') ? relPath.slice(1) : relPath;
  return `${cleanBase}${cleanPath}`;
};

const SAMPLE_FONTS = [
  {
    id: 'nimbus-sans',
    name: 'Nimbus Sans',
    format: 'OTF',
    path: getAssetUrl('sample-fonts/NimbusSans.otf'),
  },
  {
    id: 'liberation-serif',
    name: 'Liberation Serif',
    format: 'TTF',
    path: getAssetUrl('sample-fonts/LiberationSerif.ttf'),
  },
  {
    id: 'nimbus-mono',
    name: 'Nimbus Mono Bold',
    format: 'OTF',
    path: getAssetUrl('sample-fonts/NimbusMonoBold.otf'),
  },
];

const DEFAULT_BATCH_CONFIG: BatchStyleConfig = {
  mode: 'perlin',
  scope: 'all',
  customChars: '',
  perlin: {
    scale: 0.015,
    amplitude: 40,
    octaves: 3,
    roughness: 0.55,
    seed: 42,
    stepSize: 16,
    displacementMode: 'normal',
  },
  pixelate: {
    gridSize: 45,
    style: 'orthogonal',
    align: 'origin',
  },
  crystalline: {
    chordLength: 60,
    randomness: 10,
  },
  glitch: {
    frequency: 0.4,
    sliceHeight: 50,
    displacement: 60,
    seed: 42,
  },
  melt: {
    gravity: 50,
    viscosity: 0.008,
    droopThreshold: 0,
    seed: 42,
  },
  crt: {
    scanlineHeight: 28,
    curvature: 22,
    rasterJitter: 10,
    interlaceShift: 12,
    beamRoll: 8,
    seed: 42,
  },
};

const DEFAULT_PREVIEW_SETTINGS: PreviewSettings = {
  text: 'Sphinx of black quartz, judge my vow.\n黑色石英獅身人面像，請評判我的誓言。\n0123456789 • PERLIN & PIXEL',
  fontSize: 24,
  lineHeight: 1.3,
  letterSpacing: 0,
  textAlign: 'left',
  textColor: '#18181b',
  bgColor: '#ffffff',
  specimenMode: 'tester',
  splitPosition: 50,
};

export default function App() {
  const [font, setFont] = useState<opentype.Font | null>(null);
  const [originalFont, setOriginalFont] = useState<opentype.Font | null>(null);
  const originalBufferRef = useRef<ArrayBuffer | null>(null);

  const [currentSampleId, setCurrentSampleId] = useState<string>('nimbus-sans');
  const [selectedGlyphIndex, setSelectedGlyphIndex] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<'editor' | 'preview'>('editor');

  const [batchConfig, setBatchConfig] = useState<BatchStyleConfig>(DEFAULT_BATCH_CONFIG);
  const [previewSettings, setPreviewSettings] = useState<PreviewSettings>(DEFAULT_PREVIEW_SETTINGS);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number; char: string }>({
    current: 0,
    total: 0,
    char: '',
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [livePreviewEnabled, setLivePreviewEnabled] = useState<boolean>(true);

  const [isLoadingFont, setIsLoadingFont] = useState<boolean>(true);
  const [fontLoadError, setFontLoadError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState<boolean>(false);
  const [isCssModalOpen, setIsCssModalOpen] = useState<boolean>(false);

  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [glyphRevision, setGlyphRevision] = useState<number>(0);
  const [liveFontFamily, setLiveFontFamily] = useState<string>('StylizedFontLive');

  const refreshLiveFontFace = useCallback(async (fontToInject: opentype.Font) => {
    sanitizeFontLayoutTables(fontToInject);
    const newFamily = `StylizedFontLive_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    await injectLiveFontFace(fontToInject, newFamily);
    setLiveFontFamily(newFamily);
    return newFamily;
  }, []);

  // Metadata
  const [metadata, setMetadata] = useState<FontMetadata>({
    family: '',
    subfamily: 'Regular',
    fullName: '',
    postScriptName: '',
    version: '1.0',
    designer: '',
    description: '',
    copyright: '',
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    glyphCount: 0,
  });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  }, []);

  // Parse font array buffer and set up state
  const loadFontFromBuffer = useCallback(
    async (buffer: ArrayBuffer, familyFallback: string = 'LoadedFont') => {
      try {
        setIsLoadingFont(true);
        setFontLoadError(null);

        if (!buffer || buffer.byteLength < 16) {
          throw new Error('Font file is empty or corrupted.');
        }

        // Check for HTML document signature
        const headerBytes = new Uint8Array(buffer.slice(0, 5));
        const headerStr = String.fromCharCode(...headerBytes);
        if (headerStr.startsWith('<!') || headerStr.startsWith('<h') || headerStr.startsWith('<?')) {
          throw new Error('Received an HTML webpage instead of a valid OTF/TTF font binary.');
        }

        originalBufferRef.current = buffer.slice(0);

        const parsedFont = opentype.parse(buffer);
        const origParsedFont = opentype.parse(buffer.slice(0));
        sanitizeFontLayoutTables(parsedFont);
        sanitizeFontLayoutTables(origParsedFont);

        setFont(parsedFont);
        setOriginalFont(origParsedFont);

        const fam =
          parsedFont.getEnglishName('fontFamily') ||
          parsedFont.names?.fontFamily?.en ||
          familyFallback;
        const subfam =
          parsedFont.getEnglishName('fontSubfamily') ||
          parsedFont.names?.fontSubfamily?.en ||
          'Regular';
        const fullName =
          parsedFont.getEnglishName('fullName') ||
          parsedFont.names?.fullName?.en ||
          `${fam} ${subfam}`;
        const designer =
          parsedFont.getEnglishName('designer') ||
          parsedFont.names?.designer?.en ||
          '';

        const meta: FontMetadata = {
          family: fam,
          subfamily: subfam,
          fullName,
          postScriptName: parsedFont.getEnglishName('postScriptName') || fam,
          version: parsedFont.getEnglishName('version') || '1.0',
          designer,
          description: parsedFont.getEnglishName('description') || '',
          copyright: parsedFont.getEnglishName('copyright') || '',
          unitsPerEm: parsedFont.unitsPerEm || 1000,
          ascender: parsedFont.ascender || 800,
          descender: parsedFont.descender || -200,
          glyphCount: parsedFont.glyphs.length,
        };
        setMetadata(meta);

        // Set default selected glyph: letter 'A' or first printable
        let selectIndex = 0;
        const charA = parsedFont.charToGlyph('A');
        if (charA && charA.index !== undefined) {
          selectIndex = charA.index;
        } else {
          for (let i = 0; i < parsedFont.glyphs.length; i++) {
            const g = parsedFont.glyphs.get(i);
            if (g.path && g.path.commands.length > 0) {
              selectIndex = i;
              break;
            }
          }
        }
        setSelectedGlyphIndex(selectIndex);
        setHasUnsavedChanges(false);

        // Inject live font faces
        await injectLiveFontFace(origParsedFont, 'OriginalFontLive');
        await refreshLiveFontFace(parsedFont);

        setIsLoadingFont(false);
      } catch (err: any) {
        console.error('Failed to parse font buffer:', err);
        setFontLoadError(err?.message || 'Invalid font file format.');
        setIsLoadingFont(false);
      }
    },
    [refreshLiveFontFace]
  );

  // Load sample font
  const handleSelectSample = useCallback(
    async (id: string) => {
      const sample = SAMPLE_FONTS.find((s) => s.id === id);
      if (!sample) return;
      setCurrentSampleId(id);
      try {
        setIsLoadingFont(true);
        const res = await fetch(sample.path);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const buffer = await res.arrayBuffer();
        await loadFontFromBuffer(buffer, sample.name);
        showToast(`Loaded ${sample.name} (${sample.format})`);
      } catch (err: any) {
        console.error('Error fetching sample font:', err);
        setFontLoadError(`Failed to load sample font: ${err.message}`);
        setIsLoadingFont(false);
      }
    },
    [loadFontFromBuffer, showToast]
  );

  useEffect(() => {
    handleSelectSample('nimbus-sans');
  }, [handleSelectSample]);

  // Handle user file upload
  const handleFileUpload = useCallback(
    (file: File) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (result instanceof ArrayBuffer) {
          const rawName = file.name.replace(/\.[^/.]+$/, '');
          setCurrentSampleId('');
          loadFontFromBuffer(result, rawName);
          showToast(`Imported "${file.name}"`);
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [loadFontFromBuffer, showToast]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const currentGlyph = useMemo(() => {
    if (!font || selectedGlyphIndex === null) return null;
    return font.glyphs.get(selectedGlyphIndex);
  }, [font, selectedGlyphIndex, glyphRevision]);

  const currentOriginalGlyph = useMemo(() => {
    if (!originalFont || selectedGlyphIndex === null) return null;
    return originalFont.glyphs.get(selectedGlyphIndex);
  }, [originalFont, selectedGlyphIndex]);

  // Live procedural preview computed for the active glyph
  const previewPath = useMemo(() => {
    if (!livePreviewEnabled) return null;
    const baseGlyph = currentGlyph || currentOriginalGlyph;
    if (!baseGlyph?.path || !baseGlyph.path.commands || baseGlyph.path.commands.length === 0) {
      return null;
    }
    try {
      return transformGlyphPath(baseGlyph.path, batchConfig);
    } catch (err) {
      console.error('Live preview transform error:', err);
      return null;
    }
  }, [livePreviewEnabled, currentGlyph, currentOriginalGlyph, batchConfig]);

  const previewPathData = useMemo(() => {
    if (!previewPath) return null;
    try {
      return previewPath.toPathData(2);
    } catch (err) {
      console.error('Live preview toPathData error:', err);
      return null;
    }
  }, [previewPath]);

  // Apply procedural live preview to active glyph only
  const handleApplyPreviewToCurrentGlyph = useCallback(async () => {
    if (!font || !currentGlyph || !previewPath) return;
    const g = font.glyphs.get(currentGlyph.index);
    if (g) {
      g.path = clonePath(previewPath);
      setHasUnsavedChanges(true);
      setFont(font);
      setGlyphRevision((v) => v + 1);
      await refreshLiveFontFace(font);
      const char = g.unicode ? String.fromCharCode(g.unicode) : g.name;
      showToast(`Applied ${batchConfig.mode.toUpperCase()} procedural style to '${char}'`);
    }
  }, [font, currentGlyph, previewPath, batchConfig.mode, refreshLiveFontFace, showToast]);

  const targetGlyphs = useMemo(() => {
    if (!font) return [];
    if (batchConfig.scope === 'current') {
      if (selectedGlyphIndex === null) return [];
      const g = font.glyphs.get(selectedGlyphIndex);
      return g && g.path && g.path.commands && g.path.commands.length > 0 ? [g] : [];
    }
    const matched: opentype.Glyph[] = [];
    for (let i = 0; i < font.glyphs.length; i++) {
      const g = font.glyphs.get(i);
      if (isGlyphInScope(g, batchConfig.scope, batchConfig.customChars, selectedGlyphIndex)) {
        matched.push(g);
      }
    }
    return matched;
  }, [font, batchConfig.scope, batchConfig.customChars, selectedGlyphIndex, glyphRevision]);

  // Batch styling execution
  const handleApplyBatch = useCallback(async () => {
    if (!font || targetGlyphs.length === 0 || isProcessing) return;

    setIsProcessing(true);
    const total = targetGlyphs.length;
    setProgress({ current: 0, total, char: '' });

    const chunkSize = 15;
    let index = 0;

    const processNextChunk = async () => {
      const end = Math.min(index + chunkSize, total);
      for (let i = index; i < end; i++) {
        const targetG = targetGlyphs[i];
        const g = font.glyphs.get(targetG.index);
        if (g && g.path && g.path.commands.length > 0) {
          const transformed = transformGlyphPath(g.path, batchConfig);
          g.path = transformed;
        }
      }

      const currentChar = targetGlyphs[end - 1]?.unicode
        ? String.fromCharCode(targetGlyphs[end - 1].unicode!)
        : targetGlyphs[end - 1]?.name || '';

      setProgress({
        current: end,
        total,
        char: currentChar,
      });

      index = end;

      if (index < total) {
        setTimeout(processNextChunk, 0);
      } else {
        try {
          await refreshLiveFontFace(font);
          setHasUnsavedChanges(true);
          setGlyphRevision((v) => v + 1);
          setIsProcessing(false);
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.8 },
          });
          const successMsg =
            batchConfig.scope === 'current'
              ? `Successfully styled glyph '${currentChar}' with ${batchConfig.mode.toUpperCase()}!`
              : `Successfully batch styled ${total} glyphs!`;
          showToast(successMsg);
        } catch (err) {
          console.error('Error refreshing font after batch:', err);
          setIsProcessing(false);
        }
      }
    };

    processNextChunk();
  }, [font, targetGlyphs, isProcessing, batchConfig, refreshLiveFontFace, showToast]);

  // Batch node merging execution by distance
  const handleBatchMergeNodes = useCallback(
    async (distanceThreshold: number) => {
      if (!font || targetGlyphs.length === 0 || isProcessing) return;

      setIsProcessing(true);
      const total = targetGlyphs.length;
      setProgress({ current: 0, total, char: '' });

      const chunkSize = 15;
      let index = 0;

      const processMergeChunk = async () => {
        const end = Math.min(index + chunkSize, total);
        for (let i = index; i < end; i++) {
          const targetG = targetGlyphs[i];
          const g = font.glyphs.get(targetG.index);
          if (g.path && g.path.commands.length > 0) {
            const res = mergePathPointsByDistance(g.path, distanceThreshold);
            g.path = res.path;
          }
        }

        const currentChar = targetGlyphs[end - 1]?.unicode
          ? String.fromCharCode(targetGlyphs[end - 1].unicode!)
          : targetGlyphs[end - 1]?.name || '';

        setProgress({
          current: end,
          total,
          char: currentChar,
        });

        index = end;

        if (index < total) {
          setTimeout(processMergeChunk, 0);
        } else {
          try {
            await refreshLiveFontFace(font);
            setHasUnsavedChanges(true);
            setGlyphRevision((v) => v + 1);
            setIsProcessing(false);
            confetti({
              particleCount: 40,
              spread: 50,
              origin: { y: 0.8 },
            });
            showToast(
              `Merged nodes (< ${distanceThreshold}px) across ${total} glyphs!`
            );
          } catch (err) {
            console.error('Error refreshing font after merge:', err);
            setIsProcessing(false);
          }
        }
      };

      processMergeChunk();
    },
    [font, targetGlyphs, isProcessing, refreshLiveFontFace, showToast]
  );

  // Single active glyph node merging execution (no preview, direct apply)
  const handleMergeCurrentGlyph = useCallback(
    async (distanceThreshold: number) => {
      if (!font || !currentGlyph || isProcessing) return;
      const g = font.glyphs.get(currentGlyph.index);
      if (!g || !g.path || g.path.commands.length === 0) return;

      const res = mergePathPointsByDistance(g.path, distanceThreshold);
      g.path = res.path;
      setHasUnsavedChanges(true);
      setFont(font);
      setGlyphRevision((v) => v + 1);
      await refreshLiveFontFace(font);

      const charName = currentGlyph.unicode
        ? String.fromCharCode(currentGlyph.unicode)
        : currentGlyph.name || 'glyph';
      showToast(
        `Merged nodes (< ${distanceThreshold}px) on '${charName}': ${res.stats.removedPoints} vertices removed (-${res.stats.reductionPercentage}%)`
      );
    },
    [font, currentGlyph, isProcessing, refreshLiveFontFace, showToast]
  );

  // Batch path simplification using Ramer-Douglas-Peucker (RDP) algorithm across scoped glyphs
  const handleBatchSimplifyPath = useCallback(
    async (epsilon: number) => {
      if (!font || targetGlyphs.length === 0 || isProcessing) return;

      setIsProcessing(true);
      const total = targetGlyphs.length;
      let index = 0;
      let totalRemoved = 0;
      let totalOriginal = 0;
      const chunkSize = 10;

      const processSimplifyChunk = async () => {
        const end = Math.min(index + chunkSize, total);

        for (let i = index; i < end; i++) {
          const glyphInfo = targetGlyphs[i];
          const g = font.glyphs.get(glyphInfo.index);
          if (g && g.path && g.path.commands.length > 0) {
            const res = simplifyPathRDP(g.path, epsilon);
            g.path = res.path;
            totalRemoved += res.stats.removedPoints;
            totalOriginal += res.stats.originalPoints;
          }
        }

        const currentChar = targetGlyphs[end - 1]?.unicode
          ? String.fromCharCode(targetGlyphs[end - 1].unicode!)
          : targetGlyphs[end - 1]?.name || '';

        setProgress({
          current: end,
          total,
          char: currentChar,
        });

        index = end;

        if (index < total) {
          setTimeout(processSimplifyChunk, 0);
        } else {
          try {
            await refreshLiveFontFace(font);
            setHasUnsavedChanges(true);
            setGlyphRevision((v) => v + 1);
            setIsProcessing(false);
            confetti({
              particleCount: 40,
              spread: 50,
              origin: { y: 0.8 },
            });
            const pct = totalOriginal > 0 ? Math.round((totalRemoved / totalOriginal) * 100) : 0;
            showToast(
              `Path simplified (RDP ε = ${epsilon}px) across ${total} glyphs: ${totalRemoved} vertices reduced (-${pct}%)!`
            );
          } catch (err) {
            console.error('Error refreshing font after RDP simplify:', err);
            setIsProcessing(false);
          }
        }
      };

      processSimplifyChunk();
    },
    [font, targetGlyphs, isProcessing, refreshLiveFontFace, showToast]
  );

  // Single active glyph path simplification via Ramer-Douglas-Peucker (RDP) algorithm
  const handleSimplifyCurrentGlyph = useCallback(
    async (epsilon: number) => {
      if (!font || !currentGlyph || isProcessing) return;
      const g = font.glyphs.get(currentGlyph.index);
      if (!g || !g.path || g.path.commands.length === 0) return;

      const res = simplifyPathRDP(g.path, epsilon);
      g.path = res.path;
      setHasUnsavedChanges(true);
      setFont(font);
      setGlyphRevision((v) => v + 1);
      await refreshLiveFontFace(font);

      const charName = currentGlyph.unicode
        ? String.fromCharCode(currentGlyph.unicode)
        : currentGlyph.name || 'glyph';
      showToast(
        `Path simplified (RDP ε = ${epsilon}px) on '${charName}': ${res.stats.removedPoints} vertices removed (-${res.stats.reductionPercentage}%)`
      );
    },
    [font, currentGlyph, isProcessing, refreshLiveFontFace, showToast]
  );

  // Reset to original font
  const handleResetToOriginal = useCallback(async () => {
    if (!originalBufferRef.current) return;
    try {
      setIsLoadingFont(true);
      const reParsed = opentype.parse(originalBufferRef.current.slice(0));
      sanitizeFontLayoutTables(reParsed);
      setFont(reParsed);
      await refreshLiveFontFace(reParsed);
      setHasUnsavedChanges(false);
      setGlyphRevision((v) => v + 1);
      setIsLoadingFont(false);
      showToast('Reverted all glyph contours to original state.');
    } catch (err) {
      console.error('Reset error:', err);
      setIsLoadingFont(false);
    }
  }, [refreshLiveFontFace, showToast]);

  // Export Font (OTF or TTF)
  const handleExport = useCallback(
    (format: 'otf' | 'ttf') => {
      if (!font) return;
      try {
        downloadFontFile(font, format, metadata.family, metadata.subfamily);
        showToast(`Exported font as .${format.toUpperCase()}`);
      } catch (err: any) {
        console.error('Export error:', err);
        showToast(`Export failed: ${err?.message || 'Unknown error'}`);
      }
    },
    [font, metadata, showToast]
  );

  // Update path on individual glyph (e.g. from node merge or revert)
  const handleUpdateGlyphPath = useCallback(
    async (glyphIndex: number, newPath: opentype.Path) => {
      if (!font) return;
      const g = font.glyphs.get(glyphIndex);
      if (g) {
        g.path = newPath;
        setHasUnsavedChanges(true);
        setFont(font);
        setGlyphRevision((v) => v + 1);
        await refreshLiveFontFace(font);
      }
    },
    [font, refreshLiveFontFace]
  );

  // Update advance width on individual glyph
  const handleUpdateAdvanceWidth = useCallback(
    (glyphIndex: number, newWidth: number) => {
      if (!font) return;
      const g = font.glyphs.get(glyphIndex);
      if (g) {
        g.advanceWidth = newWidth;
        setHasUnsavedChanges(true);
        setFont(font);
        setGlyphRevision((v) => v + 1);
      }
    },
    [font]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="min-h-screen bg-[#ecebe6] text-zinc-900 flex flex-col font-mono relative select-none"
    >
      {/* Drag & drop overlay */}
      {isDraggingFile && (
        <div className="fixed inset-0 z-50 bg-[#ecebe6]/95 border-4 border-dashed border-zinc-900 flex flex-col items-center justify-center pointer-events-none">
          <Upload className="w-14 h-14 text-zinc-900 animate-bounce mb-3" />
          <h2 className="text-xl font-bold uppercase tracking-wider text-zinc-900">Drop OTF / TTF File</h2>
          <p className="text-xs text-zinc-600 mt-1 uppercase tracking-wider">
            Release to parse font contours
          </p>
        </div>
      )}

      {/* Navigation Bar */}
      <Navbar
        metadata={metadata}
        sampleFonts={SAMPLE_FONTS}
        currentSampleId={currentSampleId}
        onSelectSampleFont={handleSelectSample}
        onFileUpload={handleFileUpload}
        onExport={handleExport}
        onResetToOriginal={handleResetToOriginal}
        onOpenMetadata={() => setIsMetadataModalOpen(true)}
        activeView={activeView}
        setActiveView={setActiveView}
        hasUnsavedChanges={hasUnsavedChanges}
        onOpenCssSnippet={() => setIsCssModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Loading State */}
        {isLoadingFont && (
          <div className="flex items-center justify-center p-16 bg-[#f4f4f1] border border-zinc-300">
            <Loader2 className="w-5 h-5 text-zinc-900 animate-spin mr-3" />
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-700">
              PARSING FONT GLYPH CONTOURS...
            </span>
          </div>
        )}

        {/* Error Alert */}
        {fontLoadError && (
          <div className="bg-[#f4f4f1] border border-amber-500 text-zinc-900 p-4 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <div>
                <strong className="block font-bold uppercase text-amber-900">Font Loading Issue</strong>
                <span className="text-zinc-600">{fontLoadError}</span>
              </div>
            </div>
            <button
              onClick={() => handleSelectSample('nimbus-sans')}
              className="px-3 py-1.5 bg-zinc-900 text-white uppercase text-[11px] font-bold transition-colors hover:bg-zinc-800"
            >
              Load Default Font
            </button>
          </div>
        )}

        {/* Content Views */}
        {!isLoadingFont && font && (
          <>
            {/* VIEW 1: Vector Editor & Batch Studio (SIDE-BY-SIDE) */}
            {activeView === 'editor' && (
              <div className="flex flex-col gap-6">
                {/* Top Row: Batch Styling Engine and Font Previewer Side-by-Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                  <div className="flex flex-col">
                    <BatchProcessingPanel
                      config={batchConfig}
                      onChangeConfig={setBatchConfig}
                      onApplyBatch={handleApplyBatch}
                      onBatchMergeNodes={handleBatchMergeNodes}
                      onMergeCurrentGlyph={handleMergeCurrentGlyph}
                      onBatchSimplifyPath={handleBatchSimplifyPath}
                      onSimplifyCurrentGlyph={handleSimplifyCurrentGlyph}
                      currentGlyph={currentGlyph}
                      onApplyPreviewToCurrentGlyph={handleApplyPreviewToCurrentGlyph}
                      isProcessing={isProcessing}
                      progress={progress}
                      targetGlyphCount={targetGlyphs.length}
                      livePreviewEnabled={livePreviewEnabled}
                      onToggleLivePreview={setLivePreviewEnabled}
                    />
                  </div>

                  <div className="flex flex-col">
                    <GlyphCanvasEditor
                      glyph={currentGlyph}
                      originalGlyph={currentOriginalGlyph}
                      previewPath={previewPath}
                      livePreviewEnabled={livePreviewEnabled}
                      activeMode={batchConfig.mode}
                      onApplyPreviewToGlyph={handleApplyPreviewToCurrentGlyph}
                      font={font}
                      onUpdateGlyphPath={handleUpdateGlyphPath}
                      onUpdateAdvanceWidth={handleUpdateAdvanceWidth}
                    />
                  </div>
                </div>

                {/* Bottom Row: Glyph Character Map */}
                <GlyphGrid
                  font={font}
                  selectedGlyphIndex={selectedGlyphIndex}
                  onSelectGlyphIndex={setSelectedGlyphIndex}
                  glyphRevision={glyphRevision}
                />
              </div>
            )}

            {/* VIEW 2: Real-time Live Preview Dashboard (Settings & Preview Side-by-Side) */}
            {activeView === 'preview' && (
              <PreviewDashboard
                font={font}
                originalFont={originalFont}
                liveFontFamily={liveFontFamily}
                originalFontFamily="OriginalFontLive"
                settings={previewSettings}
                onChangeSettings={setPreviewSettings}
              />
            )}
          </>
        )}
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-zinc-900 border border-zinc-700 text-white px-4 py-2 flex items-center gap-2 text-xs font-mono shadow-lg">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <FontMetadataModal
        isOpen={isMetadataModalOpen}
        onClose={() => setIsMetadataModalOpen(false)}
        metadata={metadata}
        onSave={(updated) => {
          setMetadata(updated);
          showToast('Updated font properties');
        }}
      />

      <CssSnippetModal
        isOpen={isCssModalOpen}
        onClose={() => setIsCssModalOpen(false)}
        fontFamily={metadata.family || 'StylizedFont'}
      />
    </div>
  );
}
