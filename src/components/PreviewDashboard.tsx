import React, { useState } from 'react';
import type * as opentype from 'opentype.js';
import {
  Sparkles,
  Columns2,
  ListFilter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  FileText,
  Copy,
  Check,
} from 'lucide-react';
import type { SpecimenMode, PreviewSettings } from '../types';

interface PreviewDashboardProps {
  font: opentype.Font | null;
  originalFont: opentype.Font | null;
  liveFontFamily: string;
  originalFontFamily: string;
  settings: PreviewSettings;
  onChangeSettings: (settings: PreviewSettings) => void;
}

const PANGRAMS = [
  { label: 'SPHINX', text: 'Sphinx of black quartz, judge my vow.' },
  { label: 'QUICK FOX', text: 'The quick brown fox jumps over the lazy dog.' },
  { label: 'LIQUOR JUGS', text: 'Pack my box with five dozen liquor jugs.' },
  {
    label: 'GLYPH SET',
    text: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789 (!@#$%&*?)',
  },
  {
    label: 'HEADLINE',
    text: 'EXPERIMENTAL TYPOGRAPHY\nAlgorithmic Noise & Pixelated Forms',
  },
];

const COLOR_PRESETS = [
  { name: 'Paper', bg: '#f4f4f1', text: '#111111' },
  { name: 'Bone', bg: '#ecebe6', text: '#181818' },
  { name: 'White', bg: '#ffffff', text: '#0a0a0a' },
  { name: 'Ink Black', bg: '#141414', text: '#e8e8e5' },
];

export const PreviewDashboard: React.FC<PreviewDashboardProps> = ({
  font,
  originalFont,
  liveFontFamily,
  originalFontFamily,
  settings,
  onChangeSettings,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyText = () => {
    navigator.clipboard.writeText(settings.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fontFamilyStyle = {
    fontFamily: `'${liveFontFamily}', system-ui, sans-serif`,
  };

  const originalFontFamilyStyle = {
    fontFamily: `'${originalFontFamily}', system-ui, sans-serif`,
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 items-start text-zinc-900 select-none">
      {/* Left Column: Settings Panel (Side-by-Side) */}
      <div className="w-full lg:w-80 xl:w-96 shrink-0 bg-[#f4f4f1] border border-zinc-300 p-5 flex flex-col gap-5 text-xs font-mono">
        <div className="pb-3 border-b border-zinc-300 flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-zinc-900 text-xs">
            Specimen Controls
          </span>
          <button
            onClick={handleCopyText}
            className="flex items-center gap-1 px-2 py-1 border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span className="text-[10px]">{copied ? 'COPIED' : 'COPY'}</span>
          </button>
        </div>

        {/* Specimen Mode Selector */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
            Specimen Mode
          </span>
          <div className="grid grid-cols-2 gap-1 border border-zinc-300 bg-white p-1">
            <button
              onClick={() => onChangeSettings({ ...settings, specimenMode: 'tester' })}
              className={`flex items-center justify-center gap-1.5 py-1.5 text-[11px] transition-all ${
                settings.specimenMode === 'tester'
                  ? 'bg-zinc-900 text-white font-bold'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>Tester</span>
            </button>
            <button
              onClick={() => onChangeSettings({ ...settings, specimenMode: 'waterfall' })}
              className={`flex items-center justify-center gap-1.5 py-1.5 text-[11px] transition-all ${
                settings.specimenMode === 'waterfall'
                  ? 'bg-zinc-900 text-white font-bold'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <ListFilter className="w-3 h-3" />
              <span>Waterfall</span>
            </button>
            <button
              onClick={() => onChangeSettings({ ...settings, specimenMode: 'comparison' })}
              className={`flex items-center justify-center gap-1.5 py-1.5 text-[11px] transition-all ${
                settings.specimenMode === 'comparison'
                  ? 'bg-zinc-900 text-white font-bold'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <Columns2 className="w-3 h-3" />
              <span>A/B Compare</span>
            </button>
            <button
              onClick={() => onChangeSettings({ ...settings, specimenMode: 'poster' })}
              className={`flex items-center justify-center gap-1.5 py-1.5 text-[11px] transition-all ${
                settings.specimenMode === 'poster'
                  ? 'bg-zinc-900 text-white font-bold'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Poster</span>
            </button>
          </div>
        </div>

        {/* Pangram Presets */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
            Sample Phrases
          </span>
          <div className="flex flex-wrap gap-1">
            {PANGRAMS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => onChangeSettings({ ...settings, text: p.text })}
                className="px-2 py-1 border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 text-[10px] transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Typography Sliders */}
        <div className="flex flex-col gap-4 border-t border-zinc-300 pt-4">
          {/* Font Size */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-zinc-600 uppercase text-[10px]">Font Size</span>
              <span className="text-zinc-900 font-bold">{settings.fontSize}px</span>
            </div>
            <input
              type="range"
              min="14"
              max="140"
              value={settings.fontSize}
              onChange={(e) => onChangeSettings({ ...settings, fontSize: Number(e.target.value) })}
              className="w-full accent-zinc-900 h-1 bg-zinc-200 cursor-pointer"
            />
          </div>

          {/* Letter Spacing */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-zinc-600 uppercase text-[10px]">Letter Spacing</span>
              <span className="text-zinc-900 font-bold">{settings.letterSpacing}px</span>
            </div>
            <input
              type="range"
              min="-4"
              max="24"
              value={settings.letterSpacing}
              onChange={(e) =>
                onChangeSettings({ ...settings, letterSpacing: Number(e.target.value) })
              }
              className="w-full accent-zinc-900 h-1 bg-zinc-200 cursor-pointer"
            />
          </div>

          {/* Line Height */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-zinc-600 uppercase text-[10px]">Line Height</span>
              <span className="text-zinc-900 font-bold">{settings.lineHeight.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="2.4"
              step="0.05"
              value={settings.lineHeight}
              onChange={(e) =>
                onChangeSettings({ ...settings, lineHeight: Number(e.target.value) })
              }
              className="w-full accent-zinc-900 h-1 bg-zinc-200 cursor-pointer"
            />
          </div>

          {/* Text Alignment */}
          <div>
            <span className="text-zinc-600 uppercase text-[10px] block mb-1">Alignment</span>
            <div className="grid grid-cols-4 border border-zinc-300 bg-white">
              {(
                [
                  { id: 'left', icon: AlignLeft },
                  { id: 'center', icon: AlignCenter },
                  { id: 'right', icon: AlignRight },
                  { id: 'justify', icon: AlignJustify },
                ] as const
              ).map((align) => {
                const Icon = align.icon;
                return (
                  <button
                    key={align.id}
                    onClick={() => onChangeSettings({ ...settings, textAlign: align.id })}
                    className={`py-1.5 flex items-center justify-center border-r last:border-r-0 border-zinc-300 transition-colors ${
                      settings.textAlign === align.id
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Atmosphere / Color Presets */}
          <div>
            <span className="text-zinc-600 uppercase text-[10px] block mb-1">Atmosphere</span>
            <div className="grid grid-cols-2 gap-1">
              {COLOR_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() =>
                    onChangeSettings({
                      ...settings,
                      bgColor: preset.bg,
                      textColor: preset.text,
                    })
                  }
                  className={`px-2 py-1.5 border text-[11px] flex items-center gap-1.5 transition-all ${
                    settings.bgColor === preset.bg
                      ? 'border-zinc-900 bg-zinc-900 text-white font-bold'
                      : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 border border-black/20 shrink-0 inline-block"
                    style={{ backgroundColor: preset.bg }}
                  />
                  <span className="truncate">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Main Specimen Display Area (Side-by-Side) */}
      <div
        className="flex-1 w-full border border-zinc-300 p-6 sm:p-10 min-h-[580px] transition-colors overflow-hidden"
        style={{
          backgroundColor: settings.bgColor,
          color: settings.textColor,
        }}
      >
        {/* MODE 1: Interactive Tester */}
        {settings.specimenMode === 'tester' && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center text-[10px] font-mono opacity-50 pb-2 border-b border-current/15 uppercase tracking-wider">
              <span>Interactive Type Tester</span>
              <span>Direct Keyboard Input</span>
            </div>
            <textarea
              value={settings.text}
              onChange={(e) => onChangeSettings({ ...settings, text: e.target.value })}
              rows={8}
              className="w-full bg-transparent border-none outline-none resize-none transition-all placeholder:opacity-30 leading-relaxed"
              style={{
                ...fontFamilyStyle,
                fontSize: `${settings.fontSize}px`,
                lineHeight: settings.lineHeight,
                letterSpacing: `${settings.letterSpacing}px`,
                textAlign: settings.textAlign,
                color: settings.textColor,
              }}
              placeholder="Type anything to test your customized font..."
            />
          </div>
        )}

        {/* MODE 2: Waterfall */}
        {settings.specimenMode === 'waterfall' && (
          <div className="flex flex-col gap-6">
            <div className="text-[10px] font-mono opacity-50 pb-2 border-b border-current/15 uppercase tracking-wider">
              Waterfall Point Size Progression
            </div>
            {[14, 18, 24, 32, 44, 60, 80].map((size) => (
              <div
                key={size}
                className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6 border-b border-current/10 pb-4"
              >
                <span className="text-[10px] font-mono opacity-40 min-w-[40px]">{size}PT</span>
                <p
                  className="transition-all"
                  style={{
                    ...fontFamilyStyle,
                    fontSize: `${size}px`,
                    lineHeight: settings.lineHeight,
                    letterSpacing: `${settings.letterSpacing}px`,
                  }}
                >
                  {settings.text.split('\n')[0] || 'Sphinx of black quartz, judge my vow.'}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* MODE 3: A/B Comparison */}
        {settings.specimenMode === 'comparison' && (
          <div className="flex flex-col gap-6">
            <div className="text-[10px] font-mono opacity-50 pb-2 border-b border-current/15 flex justify-between items-center uppercase tracking-wider">
              <span>Outline Comparison</span>
              <span>Original Base vs Stylized Output</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Original Font */}
              <div className="flex flex-col gap-3 p-5 border border-current/15 bg-current/5">
                <div className="flex items-center justify-between text-[10px] font-mono opacity-60 pb-2 border-b border-current/15 uppercase tracking-wider">
                  <span>Base Font</span>
                  <span>Smooth</span>
                </div>
                <div
                  className="select-text pt-2"
                  style={{
                    ...originalFontFamilyStyle,
                    fontSize: `${settings.fontSize}px`,
                    lineHeight: settings.lineHeight,
                    letterSpacing: `${settings.letterSpacing}px`,
                    textAlign: settings.textAlign,
                  }}
                >
                  {settings.text}
                </div>
              </div>

              {/* Right: Transformed Styled Font */}
              <div className="flex flex-col gap-3 p-5 border border-current/25 bg-current/10">
                <div className="flex items-center justify-between text-[10px] font-mono pb-2 border-b border-current/15 uppercase tracking-wider font-bold">
                  <span>Stylized Font</span>
                  <span>Procedural</span>
                </div>
                <div
                  className="select-text pt-2"
                  style={{
                    ...fontFamilyStyle,
                    fontSize: `${settings.fontSize}px`,
                    lineHeight: settings.lineHeight,
                    letterSpacing: `${settings.letterSpacing}px`,
                    textAlign: settings.textAlign,
                  }}
                >
                  {settings.text}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODE 4: Specimen Poster */}
        {settings.specimenMode === 'poster' && (
          <div className="flex flex-col gap-8 select-text">
            {/* Header poster band */}
            <div className="flex justify-between items-start border-b border-current/15 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest opacity-50">
                  Type Specimen Sheet • Edition 01
                </span>
                <h1
                  className="text-4xl sm:text-6xl font-bold tracking-tight mt-1"
                  style={fontFamilyStyle}
                >
                  {font?.getEnglishName('fontFamily') || 'EXPERIMENTAL'}
                </h1>
              </div>
              <div className="text-right text-[10px] font-mono opacity-40 hidden sm:block">
                <div>UPEM: {font?.unitsPerEm || 1000}</div>
                <div>GLYPHS: {font?.glyphs.length || 0}</div>
                <div>FORMAT: OPENTYPE</div>
              </div>
            </div>

            {/* Giant Alphabet Display */}
            <div className="py-2">
              <p
                className="text-2xl sm:text-4xl tracking-wider uppercase leading-snug break-words"
                style={fontFamilyStyle}
              >
                A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
              </p>
              <p
                className="text-2xl sm:text-4xl tracking-wider lowercase leading-snug mt-3 break-words opacity-80"
                style={fontFamilyStyle}
              >
                a b c d e f g h i j k l m n o p q r s t u v w x y z
              </p>
              <p
                className="text-xl sm:text-3xl tracking-widest leading-snug mt-3 font-mono opacity-70"
                style={fontFamilyStyle}
              >
                0 1 2 3 4 5 6 7 8 9 & ( ) [ ] { } ? ! % @ # $
              </p>
            </div>

            {/* Paragraph Mockup */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-current/15">
              <div>
                <h3 className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-2">
                  Display Headline
                </h3>
                <h2 className="text-2xl font-bold leading-tight" style={fontFamilyStyle}>
                  Algorithmic vectors generate jagged noise contours & retro pixelated forms.
                </h2>
              </div>
              <div>
                <h3 className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-2">
                  Body Typography
                </h3>
                <p className="text-sm leading-relaxed opacity-80" style={fontFamilyStyle}>
                  Typography is the craft of endowing human language with durable visual form. By
                  intersecting mathematical noise distributions with bezier vector paths and merging
                  nodes by distance, traditional typefaces transform into organic, serrated, or
                  discretized specimens.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
