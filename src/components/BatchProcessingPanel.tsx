import React, { useState } from 'react';
import {
  Zap,
  Grid,
  Diamond,
  Tv,
  Droplets,
  Dices,
  Play,
  Scissors,
  Layers,
} from 'lucide-react';
import type { BatchStyleConfig, StylingMode, BatchScope, GlyphData } from '../types';
import { STYLE_PRESETS } from '../utils/fontStyling';

interface BatchProcessingPanelProps {
  config: BatchStyleConfig;
  onChangeConfig: (config: BatchStyleConfig) => void;
  onApplyBatch: () => void;
  onBatchMergeNodes?: (distanceThreshold: number) => void;
  onMergeCurrentGlyph?: (distanceThreshold: number) => void;
  currentGlyph?: GlyphData | null;
  onApplyPreviewToCurrentGlyph?: () => void;
  isProcessing: boolean;
  progress: { current: number; total: number; char: string };
  targetGlyphCount: number;
  livePreviewEnabled: boolean;
  onToggleLivePreview: (enabled: boolean) => void;
}

export const BatchProcessingPanel: React.FC<BatchProcessingPanelProps> = ({
  config,
  onChangeConfig,
  onApplyBatch,
  onBatchMergeNodes,
  onMergeCurrentGlyph,
  currentGlyph,
  onApplyPreviewToCurrentGlyph,
  isProcessing,
  progress,
  targetGlyphCount,
  livePreviewEnabled,
  onToggleLivePreview,
}) => {
  const [mergeDistance, setMergeDistance] = useState<number>(15);

  const handleModeChange = (mode: StylingMode) => {
    onChangeConfig({ ...config, mode });
  };

  const handleScopeChange = (scope: BatchScope) => {
    onChangeConfig({ ...config, scope });
  };

  const applyPreset = (presetId: string) => {
    const preset = STYLE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    onChangeConfig({
      ...config,
      ...preset.config,
      mode: preset.config.mode || config.mode,
      perlin: preset.config.perlin ? { ...config.perlin, ...preset.config.perlin } : config.perlin,
      pixelate: preset.config.pixelate ? { ...config.pixelate, ...preset.config.pixelate } : config.pixelate,
      crystalline: preset.config.crystalline ? { ...config.crystalline, ...preset.config.crystalline } : config.crystalline,
      glitch: preset.config.glitch ? { ...config.glitch, ...preset.config.glitch } : config.glitch,
      melt: preset.config.melt ? { ...config.melt, ...preset.config.melt } : config.melt,
    });
  };

  const randomizeSeed = () => {
    const newSeed = Math.floor(Math.random() * 100000);
    onChangeConfig({
      ...config,
      perlin: { ...config.perlin, seed: newSeed },
      glitch: { ...config.glitch, seed: newSeed },
      melt: { ...config.melt, seed: newSeed },
    });
  };

  return (
    <div className="bg-[#f4f4f1] border border-zinc-300 p-5 sm:p-6 flex flex-col gap-5 text-zinc-900 select-none h-full">
      {/* Header & Live Preview Switch */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-300">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-zinc-900">
            Procedural Engine
          </h2>
          <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
            Algorithmic noise, geometry & node welding
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-zinc-700 bg-white border border-zinc-300 px-2.5 py-1.5 hover:bg-zinc-100 transition-colors">
          <input
            type="checkbox"
            checked={livePreviewEnabled}
            onChange={(e) => onToggleLivePreview(e.target.checked)}
            className="w-3.5 h-3.5 accent-zinc-900"
          />
          <span>LIVE PREVIEW</span>
        </label>
      </div>

      {/* Mode Selector Tabs (Sharp Rectangles) */}
      <div className="grid grid-cols-5 border border-zinc-300 bg-white">
        <button
          onClick={() => handleModeChange('perlin')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-1 text-xs font-mono border-r border-zinc-300 transition-all ${
            config.mode === 'perlin'
              ? 'bg-zinc-900 text-white font-bold'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
          title="Perlin Noise"
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="text-[11px] truncate">Perlin</span>
        </button>

        <button
          onClick={() => handleModeChange('pixelate')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-1 text-xs font-mono border-r border-zinc-300 transition-all ${
            config.mode === 'pixelate'
              ? 'bg-zinc-900 text-white font-bold'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
          title="8-Bit Pixelate"
        >
          <Grid className="w-3.5 h-3.5" />
          <span className="text-[11px] truncate">Pixel</span>
        </button>

        <button
          onClick={() => handleModeChange('crystalline')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-1 text-xs font-mono border-r border-zinc-300 transition-all ${
            config.mode === 'crystalline'
              ? 'bg-zinc-900 text-white font-bold'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
          title="Crystalline Facets"
        >
          <Diamond className="w-3.5 h-3.5" />
          <span className="text-[11px] truncate">Crystal</span>
        </button>

        <button
          onClick={() => handleModeChange('glitch')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-1 text-xs font-mono border-r border-zinc-300 transition-all ${
            config.mode === 'glitch'
              ? 'bg-zinc-900 text-white font-bold'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
          title="Scanline Glitch"
        >
          <Tv className="w-3.5 h-3.5" />
          <span className="text-[11px] truncate">Glitch</span>
        </button>

        <button
          onClick={() => handleModeChange('melt')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-1 text-xs font-mono transition-all ${
            config.mode === 'melt'
              ? 'bg-zinc-900 text-white font-bold'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
          title="Acid Melt"
        >
          <Droplets className="w-3.5 h-3.5" />
          <span className="text-[11px] truncate">Melt</span>
        </button>
      </div>

      {/* Presets Bar */}
      <div className="flex flex-col gap-1.5">
        <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
          Typographic Presets
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STYLE_PRESETS.map((preset) => {
            const isMatch = preset.config.mode === config.mode;
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                className={`text-[11px] font-mono px-2.5 py-1 border transition-all ${
                  isMatch
                    ? 'border-zinc-900 bg-zinc-900 text-white font-bold'
                    : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500 hover:bg-zinc-100'
                }`}
                title={preset.description}
              >
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Parameter Sliders Box */}
      <div className="bg-white border border-zinc-300 p-4 flex-1">
        {/* Perlin Jagged Controls */}
        {config.mode === 'perlin' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-zinc-600 uppercase">Amplitude</span>
                <span className="text-zinc-900 font-bold">{config.perlin.amplitude}px</span>
              </div>
              <input
                type="range"
                min="5"
                max="120"
                step="1"
                value={config.perlin.amplitude}
                onChange={(e) =>
                  onChangeConfig({
                    ...config,
                    perlin: { ...config.perlin, amplitude: Number(e.target.value) },
                  })
                }
                className="w-full accent-zinc-900 h-1 bg-zinc-200 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-zinc-600 uppercase">Frequency</span>
                <span className="text-zinc-900 font-bold">{config.perlin.scale.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min="0.003"
                max="0.06"
                step="0.001"
                value={config.perlin.scale}
                onChange={(e) =>
                  onChangeConfig({
                    ...config,
                    perlin: { ...config.perlin, scale: Number(e.target.value) },
                  })
                }
                className="w-full accent-zinc-900 h-1 bg-zinc-200 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-zinc-600 uppercase">Subdivision</span>
                <span className="text-zinc-900 font-bold">{config.perlin.stepSize}px</span>
              </div>
              <input
                type="range"
                min="3"
                max="25"
                step="1"
                value={config.perlin.stepSize}
                onChange={(e) =>
                  onChangeConfig({
                    ...config,
                    perlin: { ...config.perlin, stepSize: Number(e.target.value) },
                  })
                }
                className="w-full accent-zinc-900 h-1 bg-zinc-200 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-zinc-600 uppercase">Roughness</span>
                <span className="text-zinc-900 font-bold">{config.perlin.roughness.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="0.8"
                step="0.05"
                value={config.perlin.roughness}
                onChange={(e) =>
                  onChangeConfig({
                    ...config,
                    perlin: { ...config.perlin, roughness: Number(e.target.value) },
                  })
                }
                className="w-full accent-zinc-900 h-1 bg-zinc-200 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-zinc-600 uppercase">Octaves</span>
                <span className="text-zinc-900 font-bold">{config.perlin.octaves}</span>
              </div>
              <div className="grid grid-cols-4 border border-zinc-300">
                {[1, 2, 3, 4].map((oct) => (
                  <button
                    key={oct}
                    onClick={() =>
                      onChangeConfig({
                        ...config,
                        perlin: { ...config.perlin, octaves: oct },
                      })
                    }
                    className={`py-1 text-center transition-colors border-r last:border-r-0 border-zinc-300 ${
                      config.perlin.octaves === oct
                        ? 'bg-zinc-900 text-white font-bold'
                        : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    {oct}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-zinc-600 uppercase">Random Seed</span>
                <span className="text-zinc-900 font-bold">{config.perlin.seed}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={config.perlin.seed}
                  onChange={(e) =>
                    onChangeConfig({
                      ...config,
                      perlin: {
                        ...config.perlin,
                        seed: parseInt(e.target.value, 10) || 0,
                      },
                    })
                  }
                  className="w-full px-2 py-1 border border-zinc-300 bg-zinc-50 font-mono text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
                <button
                  onClick={randomizeSeed}
                  className="px-2.5 py-1 flex items-center justify-center gap-1 border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-zinc-900 font-mono text-xs transition-colors shrink-0"
                  title="Roll random seed"
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Roll</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pixelate Controls */}
        {config.mode === 'pixelate' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-zinc-600 uppercase">Grid Size</span>
                <span className="text-zinc-900 font-bold">{config.pixelate.gridSize}px</span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="2"
                value={config.pixelate.gridSize}
                onChange={(e) =>
                  onChangeConfig({
                    ...config,
                    pixelate: { ...config.pixelate, gridSize: Number(e.target.value) },
                  })
                }
                className="w-full accent-zinc-900 h-1 bg-zinc-200 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-zinc-600 uppercase">Style</span>
              </div>
              <div className="grid grid-cols-2 border border-zinc-300">
                <button
                  onClick={() =>
                    onChangeConfig({
                      ...config,
                      pixelate: { ...config.pixelate, style: 'stepped' },
                    })
                  }
                  className={`py-1 text-center transition-colors border-r border-zinc-300 ${
                    config.pixelate.style === 'stepped'
                      ? 'bg-zinc-900 text-white font-bold'
                      : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  Stepped
                </button>
                <button
                  onClick={() =>
                    onChangeConfig({
                      ...config,
                      pixelate: { ...config.pixelate, style: 'blocks' },
                    })
                  }
                  className={`py-1 text-center transition-colors ${
                    config.pixelate.style === 'blocks'
                      ? 'bg-zinc-900 text-white font-bold'
                      : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  Blocks
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-zinc-600 uppercase">Grid Origin</span>
              </div>
              <div className="grid grid-cols-2 border border-zinc-300">
                <button
                  onClick={() =>
                    onChangeConfig({
                      ...config,
                      pixelate: { ...config.pixelate, align: 'origin' },
                    })
                  }
                  className={`py-1 text-center transition-colors border-r border-zinc-300 ${
                    config.pixelate.align === 'origin'
                      ? 'bg-zinc-900 text-white font-bold'
                      : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  (0,0)
                </button>
                <button
                  onClick={() =>
                    onChangeConfig({
                      ...config,
                      pixelate: { ...config.pixelate, align: 'baseline' },
                    })
                  }
                  className={`py-1 text-center transition-colors ${
                    config.pixelate.align === 'baseline'
                      ? 'bg-zinc-900 text-white font-bold'
                      : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  Baseline
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Crystalline Controls */}
        {config.mode === 'crystalline' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-zinc-600 uppercase">Facet Chord</span>
                <span className="text-zinc-900 font-bold">{config.crystalline.chordLength}px</span>
              </div>
              <input
                type="range"
                min="15"
                max="100"
                step="5"
                value={config.crystalline.chordLength}
                onChange={(e) =>
                  onChangeConfig({
                    ...config,
                    crystalline: { ...config.crystalline, chordLength: Number(e.target.value) },
                  })
                }
                className="w-full accent-zinc-900 h-1 bg-zinc-200 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-zinc-600 uppercase">Vertex Jitter</span>
                <span className="text-zinc-900 font-bold">{config.crystalline.randomness}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={config.crystalline.randomness}
                onChange={(e) =>
                  onChangeConfig({
                    ...config,
                    crystalline: { ...config.crystalline, randomness: Number(e.target.value) },
                  })
                }
                className="w-full accent-zinc-900 h-1 bg-zinc-200 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Glitch Controls */}
        {config.mode === 'glitch' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-zinc-600 uppercase">Slice Height</span>
                <span className="text-zinc-900 font-bold">{config.glitch.sliceHeight}px</span>
              </div>
              <input
                type="range"
                min="8"
                max="70"
                step="2"
                value={config.glitch.sliceHeight}
                onChange={(e) =>
                  onChangeConfig({
                    ...config,
                    glitch: { ...config.glitch, sliceHeight: Number(e.target.value) },
                  })
                }
                className="w-full accent-zinc-900 h-1 bg-zinc-200 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-zinc-600 uppercase">Tear Offset</span>
                <span className="text-zinc-900 font-bold">{config.glitch.displacement}px</span>
              </div>
              <input
                type="range"
                min="10"
                max="150"
                step="5"
                value={config.glitch.displacement}
                onChange={(e) =>
                  onChangeConfig({
                    ...config,
                    glitch: { ...config.glitch, displacement: Number(e.target.value) },
                  })
                }
                className="w-full accent-zinc-900 h-1 bg-zinc-200 cursor-pointer"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-zinc-600 uppercase">Random Seed</span>
                <span className="text-zinc-900 font-bold">{config.glitch.seed}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={config.glitch.seed}
                  onChange={(e) =>
                    onChangeConfig({
                      ...config,
                      glitch: {
                        ...config.glitch,
                        seed: parseInt(e.target.value, 10) || 0,
                      },
                    })
                  }
                  className="w-full px-2 py-1 border border-zinc-300 bg-zinc-50 font-mono text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
                <button
                  onClick={randomizeSeed}
                  className="px-3 py-1 flex items-center justify-center gap-1.5 border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-zinc-900 font-mono text-xs transition-colors shrink-0"
                  title="Roll random seed"
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Roll</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Melt Controls */}
        {config.mode === 'melt' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-zinc-600 uppercase">Gravity Pull</span>
                <span className="text-zinc-900 font-bold">{config.melt.gravity}px</span>
              </div>
              <input
                type="range"
                min="10"
                max="140"
                step="2"
                value={config.melt.gravity}
                onChange={(e) =>
                  onChangeConfig({
                    ...config,
                    melt: { ...config.melt, gravity: Number(e.target.value) },
                  })
                }
                className="w-full accent-zinc-900 h-1 bg-zinc-200 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-zinc-600 uppercase">Viscosity</span>
                <span className="text-zinc-900 font-bold">{config.melt.viscosity.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min="0.002"
                max="0.03"
                step="0.001"
                value={config.melt.viscosity}
                onChange={(e) =>
                  onChangeConfig({
                    ...config,
                    melt: { ...config.melt, viscosity: Number(e.target.value) },
                  })
                }
                className="w-full accent-zinc-900 h-1 bg-zinc-200 cursor-pointer"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-zinc-600 uppercase">Random Seed</span>
                <span className="text-zinc-900 font-bold">{config.melt.seed}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={config.melt.seed}
                  onChange={(e) =>
                    onChangeConfig({
                      ...config,
                      melt: {
                        ...config.melt,
                        seed: parseInt(e.target.value, 10) || 0,
                      },
                    })
                  }
                  className="w-full px-2 py-1 border border-zinc-300 bg-zinc-50 font-mono text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
                <button
                  onClick={randomizeSeed}
                  className="px-3 py-1 flex items-center justify-center gap-1.5 border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-zinc-900 font-mono text-xs transition-colors shrink-0"
                  title="Roll random seed"
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Roll</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Target Scope Section */}
      <div className="flex flex-col gap-2 font-mono text-xs">
        <div className="flex items-center justify-between text-zinc-500">
          <span className="uppercase text-[10px] tracking-widest flex items-center gap-1.5">
            <Layers className="w-3 h-3" />
            <span>Target Glyphs ({targetGlyphCount})</span>
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          {(
            [
              { id: 'current', label: 'CURRENT' },
              { id: 'all', label: 'ALL' },
              { id: 'latin', label: 'BASIC' },
              { id: 'uppercase', label: 'A-Z' },
              { id: 'lowercase', label: 'a-z' },
              { id: 'numbers', label: '0-9' },
              { id: 'custom', label: 'CUSTOM' },
            ] as const
          ).map((scopeOption) => (
            <button
              key={scopeOption.id}
              onClick={() => handleScopeChange(scopeOption.id)}
              className={`px-2 py-1 text-xs font-mono border transition-colors ${
                config.scope === scopeOption.id
                  ? 'border-zinc-900 bg-zinc-900 text-white font-bold'
                  : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              {scopeOption.label}
              {scopeOption.id === 'current' && currentGlyph && (
                <span className="ml-1 opacity-70">
                  ('{currentGlyph.unicode ? String.fromCharCode(currentGlyph.unicode) : currentGlyph.name}')
                </span>
              )}
            </button>
          ))}
          {config.scope === 'custom' && (
            <input
              type="text"
              placeholder="e.g. ABC012"
              value={config.customChars}
              onChange={(e) => onChangeConfig({ ...config, customChars: e.target.value })}
              className="bg-white border border-zinc-300 px-2 py-1 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 w-28 font-mono"
            />
          )}
        </div>
      </div>

      {/* Dedicated Merge Nodes Section in Procedural Engine */}
      <div className="border border-zinc-300 bg-white p-4 flex flex-col gap-3 font-mono text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <Scissors className="w-3.5 h-3.5 text-zinc-900" />
            <span className="font-bold uppercase tracking-wider text-zinc-900 text-xs">
              Merge Nodes
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
            Welding Threshold: {mergeDistance}px
          </span>
        </div>

        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Directly welds and collapses contour vertices within distance threshold to simplify shapes and reduce point count.
        </p>

        {/* Distance Slider & Quick Presets */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 flex items-center gap-2">
            <span className="text-zinc-500 text-xs">&lt;</span>
            <input
              type="range"
              min="2"
              max="50"
              step="1"
              value={mergeDistance}
              onChange={(e) => setMergeDistance(Number(e.target.value))}
              className="w-full accent-zinc-900 h-1 bg-zinc-200 cursor-pointer"
            />
            <span className="text-zinc-900 font-bold text-xs min-w-[36px] text-right">
              {mergeDistance}px
            </span>
          </div>

          {/* Quick Presets */}
          <div className="flex border border-zinc-300">
            {[5, 10, 15, 25, 40].map((dist) => (
              <button
                key={dist}
                onClick={() => setMergeDistance(dist)}
                className={`px-2 py-0.5 text-[10px] border-r last:border-r-0 border-zinc-300 transition-colors ${
                  mergeDistance === dist
                    ? 'bg-zinc-900 text-white font-bold'
                    : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {dist}px
              </button>
            ))}
          </div>
        </div>

        {/* Direct Action Buttons: Merge Active Glyph & Merge Scope Glyphs (No Preview) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-200">
          <button
            onClick={() => onMergeCurrentGlyph?.(mergeDistance)}
            disabled={!currentGlyph || isProcessing}
            className="flex items-center justify-center gap-1.5 px-3 py-2 border border-zinc-900 bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-[11px] uppercase transition-colors disabled:opacity-40"
            title={currentGlyph ? `Merge nodes on active glyph '${currentGlyph.unicode ? String.fromCharCode(currentGlyph.unicode) : currentGlyph.name}'` : 'Select a glyph to merge'}
          >
            <Scissors className="w-3 h-3" />
            <span>
              Merge Active {currentGlyph ? `('${currentGlyph.unicode ? String.fromCharCode(currentGlyph.unicode) : currentGlyph.name}')` : ''}
            </span>
          </button>

          <button
            onClick={() => onBatchMergeNodes?.(mergeDistance)}
            disabled={isProcessing || targetGlyphCount === 0}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-[11px] uppercase transition-colors disabled:opacity-40"
            title="Merge nodes across all glyphs in target scope"
          >
            <Layers className="w-3 h-3" />
            <span>Merge Scope ({targetGlyphCount})</span>
          </button>
        </div>
      </div>

      {/* Execution Footer (Actions) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-zinc-300">
        <div className="text-[11px] font-mono text-zinc-500">
          Scope: <strong className="text-zinc-800">{targetGlyphCount} glyphs</strong> ready
        </div>

        {/* Apply Batch Styling Button */}
        {isProcessing ? (
          <div className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 text-xs font-mono">
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin" />
            <span>
              {progress.current}/{progress.total} ('{progress.char || ' '}')
            </span>
          </div>
        ) : (
          <button
            onClick={onApplyBatch}
            disabled={targetGlyphCount === 0}
            className="flex items-center justify-center gap-2 px-5 py-2 text-xs font-mono font-bold uppercase bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white transition-all active:scale-[0.99]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>
              {config.scope === 'current'
                ? `Apply to Current Glyph ('${currentGlyph?.unicode ? String.fromCharCode(currentGlyph.unicode) : currentGlyph?.name || ''}')`
                : `Apply to ${targetGlyphCount} Glyphs`}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
