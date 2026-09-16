import React, { useState, useRef, useMemo } from 'react';
import * as opentype from 'opentype.js';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  Crosshair,
  Layers,
  RotateCcw,
  Download,
  Sparkles,
} from 'lucide-react';
import type { GlyphData, StylingMode } from '../types';

interface GlyphCanvasEditorProps {
  glyph: GlyphData | null;
  originalGlyph?: GlyphData | null;
  previewPath?: opentype.Path | null;
  livePreviewEnabled?: boolean;
  activeMode?: StylingMode;
  onApplyPreviewToGlyph?: () => void;
  font: opentype.Font | null;
  onUpdateGlyphPath?: (glyphIndex: number, newPath: opentype.Path) => void;
  onUpdateAdvanceWidth: (glyphIndex: number, advanceWidth: number) => void;
}

export const GlyphCanvasEditor: React.FC<GlyphCanvasEditorProps> = ({
  glyph,
  originalGlyph,
  previewPath,
  livePreviewEnabled = false,
  activeMode,
  onApplyPreviewToGlyph,
  font,
  onUpdateGlyphPath,
  onUpdateAdvanceWidth,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [showMetrics, setShowMetrics] = useState<boolean>(true);
  const [showPoints, setShowPoints] = useState<boolean>(true);
  const [showGhostOriginal, setShowGhostOriginal] = useState<boolean>(false);
  const [fillMode, setFillMode] = useState<'fill' | 'stroke'>('fill');

  // Font dimensions and metrics
  const unitsPerEm = font?.unitsPerEm || 1000;
  const ascender = font?.ascender || 800;
  const descender = font?.descender || -200;
  const capHeight = font?.tables?.os2?.sCapHeight || 700;
  const advanceWidth = glyph?.advanceWidth || unitsPerEm;

  // Widescreen, shorter viewBox bounds with generous padding so the head (ascender) and tail (descender) fit on screen
  const verticalSpan = Math.max(ascender - descender, 800);
  const verticalMargin = Math.max(verticalSpan * 0.28, 260); // Ample padding above ascender and below descender
  const vbHeight = verticalSpan + verticalMargin * 2;
  const midY = -(ascender + descender) / 2; // Midpoint in SVG scale(1, -1) inverted coordinate system
  const vbY = midY - vbHeight / 2;

  // Make viewBox wider than it is tall (1.6:1 aspect ratio) so it is wider & shorter, fitting desktop screens
  const targetWidth = Math.max(vbHeight * 1.6, advanceWidth + 800, 2000);
  const vbWidth = targetWidth;
  const midX = advanceWidth / 2;
  const vbX = midX - vbWidth / 2;

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  const resetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const isPreviewing = Boolean(livePreviewEnabled && previewPath);
  const activePath = isPreviewing ? previewPath : glyph?.path || null;

  // Active path string (live preview or base)
  const activePathData = useMemo(() => {
    if (!activePath) return '';
    try {
      return activePath.toPathData(2);
    } catch {
      return '';
    }
  }, [activePath]);

  // Base path string
  const basePathData = useMemo(() => {
    if (!glyph?.path) return '';
    return glyph.path.toPathData(2);
  }, [glyph]);

  // Original path string
  const originalPathData = useMemo(() => {
    if (!originalGlyph?.path) return null;
    return originalGlyph.path.toPathData(2);
  }, [originalGlyph]);

  // Extract points for display
  const points = useMemo(() => {
    if (!showPoints || !activePath?.commands) return [];

    const pts: { x: number; y: number; type: string }[] = [];
    for (const cmd of activePath.commands) {
      if (cmd.type === 'M' || cmd.type === 'L') {
        pts.push({ x: cmd.x, y: cmd.y, type: 'on-curve' });
      } else if (cmd.type === 'C') {
        pts.push({ x: cmd.x1, y: cmd.y1, type: 'off-curve' });
        pts.push({ x: cmd.x2, y: cmd.y2, type: 'off-curve' });
        pts.push({ x: cmd.x, y: cmd.y, type: 'on-curve' });
      } else if (cmd.type === 'Q') {
        pts.push({ x: cmd.x1, y: cmd.y1, type: 'off-curve' });
        pts.push({ x: cmd.x, y: cmd.y, type: 'on-curve' });
      }
    }
    return pts;
  }, [showPoints, activePath]);

  // Revert glyph to original smooth path
  const handleRevertGlyph = () => {
    if (!glyph || !originalGlyph?.path || !onUpdateGlyphPath) return;
    onUpdateGlyphPath(glyph.index, originalGlyph.path);
  };

  // Export SVG
  const handleExportSvg = () => {
    if (!glyph || !font || !activePath) return;
    const tempGlyph = new opentype.Glyph({
      name: glyph.name,
      unicode: glyph.unicode,
      advanceWidth: glyph.advanceWidth,
      path: activePath,
    });
    const svgPath = tempGlyph.getPath(0, ascender, unitsPerEm);
    const svgContent = `<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${glyph.advanceWidth} ${unitsPerEm}" width="${glyph.advanceWidth}" height="${unitsPerEm}">
  <path d="${svgPath.toPathData(2)}" fill="#000000" />
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `glyph-${glyph.name || 'char'}${isPreviewing ? '-preview' : ''}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!glyph) {
    return (
      <div className="bg-[#f4f4f1] border border-zinc-300 p-8 flex flex-col items-center justify-center min-h-[480px] text-zinc-500 font-mono text-xs select-none">
        <Crosshair className="w-8 h-8 text-zinc-400 mb-2" />
        <p className="uppercase tracking-wider">No glyph selected</p>
        <p className="text-[11px] text-zinc-400 mt-1">Select a character from the glyph grid below</p>
      </div>
    );
  }

  const charDisplay = glyph.unicode ? String.fromCharCode(glyph.unicode) : glyph.name;
  const currentPointsCount = activePath?.commands?.length || glyph.path?.commands?.length || 0;

  return (
    <div className="bg-[#f4f4f1] border border-zinc-300 p-4 sm:p-5 flex flex-col gap-3.5 text-zinc-900 select-none h-full">
      {/* Top Bar: Glyph Info & Viewing Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-zinc-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border border-zinc-300 bg-white flex items-center justify-center text-xl font-mono font-bold text-zinc-900">
            {charDisplay}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-zinc-900 text-sm">
                {glyph.name || 'unnamed'}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 border border-zinc-300 bg-white text-zinc-600">
                {glyph.unicode
                  ? `U+${glyph.unicode.toString(16).toUpperCase().padStart(4, '0')}`
                  : 'NO-CODE'}
              </span>

              {/* Live Preview Active Badge */}
              {isPreviewing && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 border border-zinc-900 bg-zinc-900 text-white text-[10px] font-mono font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 bg-emerald-400 animate-pulse" />
                  <span>LIVE {activeMode ? `: ${activeMode.toUpperCase()}` : ''}</span>
                </div>
              )}
            </div>
            <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-2 mt-0.5">
              <span>ADV: <strong className="text-zinc-800">{advanceWidth}</strong></span>
              <span>•</span>
              <span>PTS: <strong className="text-zinc-800">{currentPointsCount}</strong></span>
              {isPreviewing && onApplyPreviewToGlyph && (
                <>
                  <span>•</span>
                  <button
                    onClick={onApplyPreviewToGlyph}
                    className="text-zinc-900 underline font-bold uppercase hover:text-black"
                  >
                    Commit to Glyph
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Viewing Controls (Sharp Rectangles) */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <button
            onClick={() => setShowMetrics(!showMetrics)}
            className={`px-2.5 py-1 border transition-colors flex items-center gap-1 ${
              showMetrics
                ? 'border-zinc-900 bg-zinc-900 text-white font-bold'
                : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100'
            }`}
            title="Toggle Baseline, Ascender & Width guides"
          >
            <Crosshair className="w-3 h-3" />
            <span>GUIDES</span>
          </button>

          <button
            onClick={() => setShowPoints(!showPoints)}
            className={`px-2.5 py-1 border transition-colors flex items-center gap-1 ${
              showPoints
                ? 'border-zinc-900 bg-zinc-900 text-white font-bold'
                : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100'
            }`}
            title="Display on-curve and off-curve vertices"
          >
            <Eye className="w-3 h-3" />
            <span>NODES</span>
          </button>

          {originalPathData && originalPathData !== basePathData && (
            <button
              onClick={() => setShowGhostOriginal(!showGhostOriginal)}
              className={`px-2.5 py-1 border transition-colors flex items-center gap-1 ${
                showGhostOriginal
                  ? 'border-amber-600 bg-amber-600 text-white font-bold'
                  : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100'
              }`}
              title="Show original glyph silhouette"
            >
              <Layers className="w-3 h-3" />
              <span>GHOST</span>
            </button>
          )}

          {/* Revert Single Glyph if modified */}
          {originalPathData && originalPathData !== basePathData && onUpdateGlyphPath && (
            <button
              onClick={handleRevertGlyph}
              className="flex items-center gap-1 px-2.5 py-1 border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 transition-colors"
              title="Revert active glyph to original outline"
            >
              <RotateCcw className="w-3 h-3" />
              <span>REVERT</span>
            </button>
          )}

          {/* Fill / Stroke Switch */}
          <div className="flex border border-zinc-300 bg-white">
            <button
              onClick={() => setFillMode('fill')}
              className={`px-2 py-1 text-[11px] transition-colors ${
                fillMode === 'fill' ? 'bg-zinc-900 text-white font-bold' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              FILL
            </button>
            <button
              onClick={() => setFillMode('stroke')}
              className={`px-2 py-1 text-[11px] border-l border-zinc-300 transition-colors ${
                fillMode === 'stroke' ? 'bg-zinc-900 text-white font-bold' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              LINE
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center border border-zinc-300 bg-white">
            <button
              onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
              className="p-1 text-zinc-600 hover:bg-zinc-100"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-mono px-1.5 text-zinc-700 min-w-[36px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(4, Number((z + 0.15).toFixed(2))))}
              className="p-1 text-zinc-600 hover:bg-zinc-100"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              onClick={resetView}
              className="flex items-center gap-1 px-1.5 py-1 text-[10px] font-bold text-zinc-700 hover:bg-zinc-100 border-l border-zinc-300"
              title="Fit Glyph to Screen (Reset Zoom & Pan)"
            >
              <Maximize2 className="w-2.5 h-2.5" />
              <span>FIT</span>
            </button>
          </div>

          {/* Export SVG */}
          {font && (
            <button
              onClick={handleExportSvg}
              className="flex items-center gap-1 px-2.5 py-1 border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 transition-colors"
              title="Export glyph SVG"
            >
              <Download className="w-3 h-3" />
              <span>SVG</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Vector Stage (Sharp Rectangular Canvas - Wider and Shorter) */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative min-h-[300px] sm:min-h-[340px] lg:min-h-[360px] max-h-[440px] bg-white border border-zinc-300 cursor-grab active:cursor-grabbing overflow-hidden flex items-center justify-center flex-1 w-full"
      >
        <svg
          viewBox={`${vbX} ${vbY} ${vbWidth} ${vbHeight}`}
          className="w-full h-full max-h-[420px]"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Guide Grid & Metrics in font coordinate space */}
          {showMetrics && (
            <g className="font-mono text-[18px] select-none pointer-events-none">
              {/* Ascender line */}
              <line
                x1={vbX}
                y1={-ascender}
                x2={vbX + vbWidth}
                y2={-ascender}
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.4"
              />
              <text x={vbX + 16} y={-ascender - 8} fill="#10b981" opacity="0.8">
                ASC ({ascender})
              </text>

              {/* Cap Height line */}
              <line
                x1={vbX}
                y1={-capHeight}
                x2={vbX + vbWidth}
                y2={-capHeight}
                stroke="#6366f1"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.35"
              />
              <text x={vbX + 16} y={-capHeight - 8} fill="#6366f1" opacity="0.7">
                CAP ({capHeight})
              </text>

              {/* Baseline (y = 0) */}
              <line
                x1={vbX}
                y1="0"
                x2={vbX + vbWidth}
                y2="0"
                stroke="#ef4444"
                strokeWidth="1.5"
                opacity="0.6"
              />
              <text x={vbX + 16} y="-8" fill="#ef4444" opacity="0.8">
                BASE (0)
              </text>

              {/* Descender line */}
              <line
                x1={vbX}
                y1={-descender}
                x2={vbX + vbWidth}
                y2={-descender}
                stroke="#9333ea"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.35"
              />
              <text x={vbX + 16} y={-descender + 20} fill="#9333ea" opacity="0.7">
                DESC ({descender})
              </text>

              {/* Left Side Bearing (x = 0) */}
              <line
                x1="0"
                y1={vbY}
                x2="0"
                y2={vbY + vbHeight}
                stroke="#a1a1aa"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.5"
              />

              {/* Advance Width (x = advanceWidth) */}
              <line
                x1={advanceWidth}
                y1={vbY}
                x2={advanceWidth}
                y2={vbY + vbHeight}
                stroke="#2563eb"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.5"
              />
              <text x={advanceWidth + 8} y="-10" fill="#2563eb" opacity="0.7">
                ADV ({advanceWidth})
              </text>
            </g>
          )}

          {/* Glyph Path Layers (scale(1, -1) font coordinates) */}
          <g transform="scale(1, -1)">
            {/* Ghost Original Outline (shown if ghost toggled OR if previewing) */}
            {(showGhostOriginal || isPreviewing) && (originalPathData || basePathData) && (
              <path
                d={originalPathData || basePathData}
                fill="none"
                stroke={isPreviewing ? '#a1a1aa' : '#f59e0b'}
                strokeWidth={isPreviewing ? '1.5' : '2.5'}
                strokeDasharray="4 4"
                opacity={isPreviewing ? '0.4' : '0.6'}
              />
            )}

            {/* Main Contour (Live Procedural Preview or Current Outline) */}
            <path
              d={activePathData}
              fill={fillMode === 'stroke' ? 'none' : '#111111'}
              stroke="#111111"
              strokeWidth={fillMode === 'fill' ? '1' : '2.5'}
              strokeLinejoin="miter"
              strokeLinecap="square"
            />

            {/* Anchor Points */}
            {showPoints &&
              points.map((pt, idx) => (
                <rect
                  key={idx}
                  x={pt.x - (pt.type === 'on-curve' ? 3.5 : 2)}
                  y={pt.y - (pt.type === 'on-curve' ? 3.5 : 2)}
                  width={pt.type === 'on-curve' ? 7 : 4}
                  height={pt.type === 'on-curve' ? 7 : 4}
                  fill={pt.type === 'on-curve' ? '#059669' : '#0284c7'}
                  stroke="#ffffff"
                  strokeWidth="0.8"
                />
              ))}
          </g>
        </svg>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-[#f4f4f1] border border-zinc-300 px-2.5 py-1 text-[11px] font-mono text-zinc-600 flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-zinc-900 inline-block" />
            <span className="font-bold text-zinc-900">
              {isPreviewing ? 'LIVE PREVIEW CONTOUR' : 'CONTOUR'}
            </span>
          </div>
          {isPreviewing && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-0.5 border-b border-dashed border-zinc-400 inline-block" />
              <span className="text-zinc-500">ORIGINAL OUTLINE</span>
            </div>
          )}
          {showGhostOriginal && !isPreviewing && originalPathData && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-amber-500 inline-block" />
              <span>ORIGINAL</span>
            </div>
          )}
          <span className="text-zinc-400">|</span>
          <span className="text-zinc-500">Pan & Zoom Active</span>
        </div>

        {/* Advance Width Control */}
        <div className="absolute bottom-3 right-3 bg-[#f4f4f1] border border-zinc-300 px-2 py-1 text-[11px] font-mono flex items-center gap-1.5">
          <span className="text-zinc-500 uppercase">ADV:</span>
          <input
            type="number"
            value={advanceWidth}
            onChange={(e) => onUpdateAdvanceWidth(glyph.index, Number(e.target.value) || 0)}
            className="w-16 bg-white border border-zinc-300 px-1 py-0.5 text-zinc-900 text-right font-bold focus:outline-none focus:border-zinc-900"
          />
        </div>
      </div>
    </div>
  );
};
