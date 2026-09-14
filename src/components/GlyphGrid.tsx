import React, { useState, useMemo } from 'react';
import type * as opentype from 'opentype.js';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface GlyphGridProps {
  font: opentype.Font | null;
  selectedGlyphIndex: number | null;
  onSelectGlyphIndex: (index: number) => void;
  glyphRevision?: number;
}

const ITEMS_PER_PAGE = 72;

export const GlyphGrid: React.FC<GlyphGridProps> = ({
  font,
  selectedGlyphIndex,
  onSelectGlyphIndex,
  glyphRevision = 0,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<
    'all' | 'uppercase' | 'lowercase' | 'numbers' | 'punctuation' | 'symbols'
  >('all');
  const [page, setPage] = useState(0);

  // Extract glyph items
  const glyphItems = useMemo(() => {
    if (!font || !font.glyphs) return [];
    const items: {
      glyph: opentype.Glyph;
      index: number;
      char: string;
      name: string;
      unicode?: number;
    }[] = [];

    for (let i = 0; i < font.glyphs.length; i++) {
      const g = font.glyphs.get(i);
      const char = g.unicode ? String.fromCharCode(g.unicode) : '';
      items.push({
        glyph: g,
        index: i,
        char,
        name: g.name || `glyph_${i}`,
        unicode: g.unicode,
      });
    }
    return items;
  }, [font, glyphRevision]);

  // Filtered list
  const filteredGlyphs = useMemo(() => {
    return glyphItems.filter((item) => {
      // Category filter
      if (category === 'uppercase') {
        if (!item.unicode || item.unicode < 65 || item.unicode > 90) return false;
      } else if (category === 'lowercase') {
        if (!item.unicode || item.unicode < 97 || item.unicode > 122) return false;
      } else if (category === 'numbers') {
        if (!item.unicode || item.unicode < 48 || item.unicode > 57) return false;
      } else if (category === 'punctuation') {
        if (!item.unicode) return false;
        const u = item.unicode;
        const isPunct =
          (u >= 33 && u <= 47) ||
          (u >= 58 && u <= 64) ||
          (u >= 91 && u <= 96) ||
          (u >= 123 && u <= 126);
        if (!isPunct) return false;
      } else if (category === 'symbols') {
        if (!item.unicode || (item.unicode >= 32 && item.unicode <= 126)) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesChar = item.char.toLowerCase() === q;
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesHex = item.unicode
          ? item.unicode.toString(16).toLowerCase().includes(q.replace(/^u\+/, ''))
          : false;
        if (!matchesChar && !matchesName && !matchesHex) return false;
      }

      return true;
    });
  }, [glyphItems, category, searchQuery]);

  const totalPages = Math.ceil(filteredGlyphs.length / ITEMS_PER_PAGE) || 1;
  const currentPage = Math.min(page, totalPages - 1);
  const pagedGlyphs = filteredGlyphs.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  const handleCategoryChange = (cat: typeof category) => {
    setCategory(cat);
    setPage(0);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(0);
  };

  const upem = font?.unitsPerEm || 1000;
  const ascender = font?.ascender || 800;
  const descender = font?.descender || -200;
  const totalHeight = ascender - descender;

  return (
    <div className="bg-[#f4f4f1] border border-zinc-300 p-5 sm:p-6 flex flex-col gap-4 text-zinc-900 select-none">
      {/* Header with Search & Categories */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-zinc-300">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-zinc-900 text-xs font-mono uppercase tracking-wider">
              Glyph Character Map
            </h3>
            <span className="text-[11px] font-mono text-zinc-500">
              ({filteredGlyphs.length} / {glyphItems.length})
            </span>
          </div>
          <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
            Select character to inspect vector paths, edit vertices, or merge nodes
          </p>
        </div>

        {/* Categories & Search */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* Category Tabs (Sharp Rectangular) */}
          <div className="flex border border-zinc-300 bg-white">
            {[
              { id: 'all', label: 'ALL' },
              { id: 'uppercase', label: 'A-Z' },
              { id: 'lowercase', label: 'a-z' },
              { id: 'numbers', label: '0-9' },
              { id: 'punctuation', label: 'PUNCT' },
              { id: 'symbols', label: 'SYM' },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => handleCategoryChange(c.id as any)}
                className={`px-2.5 py-1 text-[11px] border-r last:border-r-0 border-zinc-300 transition-colors ${
                  category === c.id
                    ? 'bg-zinc-900 text-white font-bold'
                    : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[170px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="FILTER GLYPH..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-white border border-zinc-300 pl-8 pr-2.5 py-1 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Glyph Card Grid (Sharp Rectangular Cells) */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-1.5 max-h-[360px] overflow-y-auto p-0.5 select-none font-mono">
        {pagedGlyphs.map((item) => {
          const isSelected = selectedGlyphIndex === item.index;
          const hasCommands = item.glyph.path && item.glyph.path.commands.length > 0;
          const pathData = hasCommands ? item.glyph.path.toPathData(1) : '';
          const advWidth = Math.max(100, item.glyph.advanceWidth || upem * 0.6);

          return (
            <button
              key={item.index}
              onClick={() => onSelectGlyphIndex(item.index)}
              className={`group relative flex flex-col items-center justify-between p-2 border transition-all ${
                isSelected
                  ? 'border-zinc-900 bg-zinc-900 text-white font-bold'
                  : 'border-zinc-300 bg-white hover:border-zinc-500 hover:bg-zinc-100 text-zinc-800'
              }`}
              title={`${item.name} (${item.unicode ? 'U+' + item.unicode.toString(16).toUpperCase() : 'No Unicode'})`}
            >
              {/* Top hex info */}
              <div className="w-full flex justify-between items-center text-[9px] opacity-70">
                <span>
                  {item.unicode ? item.unicode.toString(16).toUpperCase().padStart(4, '0') : ''}
                </span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                  #{item.index}
                </span>
              </div>

              {/* Vector Silhouette */}
              <div className="w-8 h-8 flex items-center justify-center my-1">
                {hasCommands ? (
                  <svg
                    viewBox={`0 ${-ascender} ${advWidth} ${totalHeight}`}
                    className="w-full h-full text-current"
                  >
                    <g transform="scale(1, -1)">
                      <path d={pathData} fill="currentColor" />
                    </g>
                  </svg>
                ) : (
                  <span className="text-zinc-400 text-[10px] italic">SP</span>
                )}
              </div>

              {/* Bottom Character / Name */}
              <div className="w-full text-center truncate text-[11px] font-bold">
                {item.char || item.name}
              </div>
            </button>
          );
        })}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs font-mono text-zinc-500 pt-2 border-t border-zinc-200">
          <span>
            PAGE {currentPage + 1} / {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="px-2.5 py-1 border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1 text-[11px]"
            >
              <ChevronLeft className="w-3 h-3" />
              <span>PREV</span>
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="px-2.5 py-1 border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1 text-[11px]"
            >
              <span>NEXT</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
