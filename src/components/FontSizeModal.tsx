import React from 'react';
import { X, HardDrive, Zap, TrendingUp, TrendingDown, Layers, FileArchive, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import type { FontSizeDetails } from '../utils/fontSizeEstimator';
import { formatBytes } from '../utils/fontSizeEstimator';

interface FontSizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  sizeDetails: FontSizeDetails;
  fontName: string;
  glyphCount: number;
  onQuickOptimize?: (type: 'merge' | 'simplify') => void;
}

export const FontSizeModal: React.FC<FontSizeModalProps> = ({
  isOpen,
  onClose,
  sizeDetails,
  fontName,
  glyphCount,
  onQuickOptimize,
}) => {
  if (!isOpen) return null;

  const {
    currentSizeBytes,
    originalSizeBytes,
    deltaBytes,
    deltaPercentage,
    totalPoints,
    originalPoints,
    projectedSizeBytes,
    projectedDeltaBytes,
    projectedDeltaPercentage,
    estimatedWoff2Bytes,
    category,
    categoryLabel,
  } = sizeDetails;

  const isLarger = deltaBytes > 0;
  const isProjectedLarger = projectedDeltaBytes > 0;

  // Percentage on a 0 - 600KB scale for the visual gauge
  const gaugePercent = Math.min(100, Math.max(5, (projectedSizeBytes / (600 * 1024)) * 100));

  const getCategoryColor = () => {
    switch (category) {
      case 'optimal':
        return 'text-emerald-700 bg-emerald-50 border-emerald-300';
      case 'good':
        return 'text-blue-700 bg-blue-50 border-blue-300';
      case 'moderate':
        return 'text-amber-700 bg-amber-50 border-amber-300';
      case 'heavy':
        return 'text-rose-700 bg-rose-50 border-rose-300';
    }
  };

  const getGaugeBarColor = () => {
    switch (category) {
      case 'optimal':
        return 'bg-emerald-600';
      case 'good':
        return 'bg-blue-600';
      case 'moderate':
        return 'bg-amber-600';
      case 'heavy':
        return 'bg-rose-600';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 select-none font-mono">
      <div className="bg-[#f4f4f1] border border-zinc-400 max-w-lg w-full p-6 text-zinc-900 flex flex-col gap-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-300">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-zinc-900 text-white">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                Font File Size & Memory Breakdown
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5 truncate max-w-[280px]">
                {fontName} ({glyphCount} glyphs)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Metric Hero Card */}
        <div className="bg-white border border-zinc-300 p-4 flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider">
              Current Edited Size (.OTF / .TTF)
            </span>
            <span className={`text-[10px] px-2 py-0.5 border font-bold uppercase ${getCategoryColor()}`}>
              {categoryLabel}
            </span>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-zinc-900 tracking-tight">
              {formatBytes(currentSizeBytes)}
            </span>
            {deltaBytes !== 0 && (
              <span
                className={`text-xs font-bold flex items-center gap-1 ${
                  isLarger ? 'text-amber-700' : 'text-emerald-700'
                }`}
              >
                {isLarger ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {isLarger ? '+' : ''}
                {formatBytes(deltaBytes)} ({deltaPercentage > 0 ? '+' : ''}
                {deltaPercentage.toFixed(1)}%)
              </span>
            )}
          </div>

          {/* Visual Scale Meter */}
          <div className="flex flex-col gap-1 mt-1">
            <div className="h-2 w-full bg-zinc-200 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${getGaugeBarColor()}`}
                style={{ width: `${gaugePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-zinc-400 font-mono">
              <span>0 KB (Minimal)</span>
              <span>100 KB</span>
              <span>250 KB</span>
              <span>500 KB+</span>
            </div>
          </div>
        </div>

        {/* Breakdown Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* Original Base Size */}
          <div className="bg-white border border-zinc-300 p-3 flex flex-col gap-1">
            <span className="text-[10px] text-zinc-500 uppercase">Original Imported Size</span>
            <span className="text-base font-bold text-zinc-900">{formatBytes(originalSizeBytes)}</span>
            <span className="text-[10px] text-zinc-500 font-mono">
              {originalPoints.toLocaleString()} baseline vertices
            </span>
          </div>

          {/* Webfont Compressed (WOFF2) Estimate */}
          <div className="bg-white border border-zinc-300 p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 uppercase">
              <FileArchive className="w-3 h-3 text-zinc-400" />
              <span>Est. Webfont (WOFF2)</span>
            </div>
            <span className="text-base font-bold text-emerald-800">{formatBytes(estimatedWoff2Bytes)}</span>
            <span className="text-[10px] text-emerald-600 font-mono">~50% web transmission savings</span>
          </div>

          {/* Projected Size with Current Batch Config */}
          <div className="bg-white border border-zinc-300 p-3 flex flex-col gap-1 col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase">
                <Sparkles className="w-3 h-3 text-zinc-600" />
                <span>Projected Size (If Pending Batch Applied)</span>
              </div>
              <span className="text-xs font-bold text-zinc-900">{formatBytes(projectedSizeBytes)}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-0.5">
              <span>Impact on targeted glyphs:</span>
              <span className={`font-bold ${isProjectedLarger ? 'text-amber-700' : 'text-zinc-700'}`}>
                {isProjectedLarger ? '+' : ''}
                {formatBytes(projectedDeltaBytes)} ({projectedDeltaPercentage > 0 ? '+' : ''}
                {projectedDeltaPercentage.toFixed(1)}%)
              </span>
            </div>
          </div>

          {/* Total Vector Vertices / Nodes */}
          <div className="bg-white border border-zinc-300 p-3 flex flex-col gap-1 col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase">
                <Layers className="w-3 h-3 text-zinc-600" />
                <span>Total Vector Vertices</span>
              </div>
              <span className="text-xs font-bold text-zinc-900">{totalPoints.toLocaleString()} nodes</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-0.5">
              <span>Avg. nodes per glyph:</span>
              <span className="font-bold text-zinc-700">
                {glyphCount > 0 ? Math.round(totalPoints / glyphCount) : 0} nodes/char
              </span>
            </div>
          </div>
        </div>

        {/* Optimization Recommendations */}
        {totalPoints > 4000 && onQuickOptimize && (
          <div className="bg-amber-50 border border-amber-200 p-3 flex flex-col gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px] uppercase">
              <Zap className="w-3.5 h-3.5 text-amber-700" />
              <span>File Size Reduction Tips</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Styling algorithms (such as CRT raster, Glitch, and ASCII) add thousands of fine vector segments.
              Use the built-in node reduction tools below to reduce file weight by up to 60% without losing visual detail.
            </p>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => {
                  onQuickOptimize('simplify');
                  onClose();
                }}
                className="px-2.5 py-1 bg-amber-900 hover:bg-amber-800 text-white text-[10px] font-bold uppercase transition-colors"
              >
                RDP Simplify (ε=3px)
              </button>
              <button
                onClick={() => {
                  onQuickOptimize('merge');
                  onClose();
                }}
                className="px-2.5 py-1 border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 text-[10px] font-bold uppercase transition-colors"
              >
                Merge Close Nodes (&lt;6px)
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex justify-end border-t border-zinc-300">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold uppercase text-[11px] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
