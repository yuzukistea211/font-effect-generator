import React, { useRef, useState } from 'react';
import {
  Upload,
  Download,
  RotateCcw,
  Sliders,
  Sparkles,
  ChevronDown,
  Info,
  Check,
  FileCode,
} from 'lucide-react';
import type { FontMetadata } from '../types';

interface NavbarProps {
  metadata: FontMetadata;
  sampleFonts: { id: string; name: string; format: string; path: string }[];
  currentSampleId: string;
  onSelectSampleFont: (id: string) => void;
  onFileUpload: (file: File) => void;
  onExport: (format: 'otf' | 'ttf') => void;
  onResetToOriginal: () => void;
  onOpenMetadata: () => void;
  activeView: 'editor' | 'preview';
  setActiveView: (view: 'editor' | 'preview') => void;
  hasUnsavedChanges: boolean;
  onOpenCssSnippet: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  metadata,
  sampleFonts,
  currentSampleId,
  onSelectSampleFont,
  onFileUpload,
  onExport,
  onResetToOriginal,
  onOpenMetadata,
  activeView,
  setActiveView,
  hasUnsavedChanges,
  onOpenCssSnippet,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [samplesMenuOpen, setSamplesMenuOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#f4f4f1] border-b border-zinc-300 text-zinc-900 select-none">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: Current Font Indicator & Sample Selector (NO TITLE) */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Active Font Pill/Block - Sharp */}
          <div className="relative">
            <button
              onClick={() => {
                setSamplesMenuOpen(!samplesMenuOpen);
                setExportMenuOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 border border-zinc-300 bg-white hover:bg-zinc-100 text-xs font-mono transition-colors"
              title="Click to select sample font"
            >
              <span className="font-bold text-zinc-900 truncate max-w-[140px] sm:max-w-[200px]">
                {metadata.family || 'Untitled Font'}
              </span>
              <span className="text-zinc-400">/</span>
              <span className="text-zinc-600 hidden sm:inline">{metadata.subfamily || 'Regular'}</span>
              {hasUnsavedChanges && (
                <span
                  className="w-1.5 h-1.5 bg-amber-600 inline-block"
                  title="Unsaved modifications"
                />
              )}
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500 ml-1" />
            </button>

            {samplesMenuOpen && (
              <div className="absolute left-0 mt-1 w-64 bg-white border border-zinc-300 z-50 text-xs shadow-lg">
                <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-zinc-400 border-b border-zinc-200">
                  Sample Typefaces
                </div>
                {sampleFonts.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => {
                      onSelectSampleFont(sample.id);
                      setSamplesMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 border-b border-zinc-100 last:border-b-0 hover:bg-zinc-100 flex items-center justify-between text-zinc-900 transition-colors"
                  >
                    <div>
                      <div className="font-semibold">{sample.name}</div>
                      <div className="text-[10px] text-zinc-400 font-mono uppercase">{sample.format}</div>
                    </div>
                    {currentSampleId === sample.id && (
                      <Check className="w-3.5 h-3.5 text-zinc-900" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center: View Switcher (Sharp Rectangular Tabs) */}
        <div className="flex items-center border border-zinc-300 bg-white p-0.5 text-xs font-mono">
          <button
            onClick={() => setActiveView('editor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-medium transition-all ${
              activeView === 'editor'
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wide">Studio & Canvas</span>
          </button>
          <button
            onClick={() => setActiveView('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-medium transition-all ${
              activeView === 'preview'
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wide">Specimen Preview</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".otf,.ttf"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Import */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-300 bg-white hover:bg-zinc-100 text-xs font-mono font-medium text-zinc-800 transition-colors"
            title="Import OTF/TTF font"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-600" />
            <span className="hidden sm:inline">IMPORT</span>
          </button>

          {/* Properties */}
          <button
            onClick={onOpenMetadata}
            className="p-1.5 border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 transition-colors"
            title="Font Properties & Metrics"
          >
            <Info className="w-3.5 h-3.5" />
          </button>

          {/* CSS Code */}
          <button
            onClick={onOpenCssSnippet}
            className="p-1.5 border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 transition-colors hidden sm:block"
            title="Webfont @font-face CSS snippet"
          >
            <FileCode className="w-3.5 h-3.5" />
          </button>

          {/* Revert */}
          {hasUnsavedChanges && (
            <button
              onClick={onResetToOriginal}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-mono transition-colors"
              title="Revert all changes to original font"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">REVERT</span>
            </button>
          )}

          {/* Export */}
          <div className="relative">
            <button
              onClick={() => {
                setExportMenuOpen(!exportMenuOpen);
                setSamplesMenuOpen(false);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-mono font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT</span>
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-zinc-300 z-50 text-xs font-mono shadow-lg">
                <button
                  onClick={() => {
                    onExport('otf');
                    setExportMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 border-b border-zinc-100 hover:bg-zinc-100 flex items-center justify-between text-zinc-900 transition-colors"
                >
                  <span className="font-semibold">EXPORT .OTF</span>
                  <span className="text-[10px] text-zinc-400">OpenType</span>
                </button>
                <button
                  onClick={() => {
                    onExport('ttf');
                    setExportMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 hover:bg-zinc-100 flex items-center justify-between text-zinc-900 transition-colors"
                >
                  <span className="font-semibold">EXPORT .TTF</span>
                  <span className="text-[10px] text-zinc-400">TrueType</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
