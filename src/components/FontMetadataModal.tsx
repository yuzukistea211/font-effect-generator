import React, { useState } from 'react';
import { X, Check, HardDrive } from 'lucide-react';
import type { FontMetadata } from '../types';
import type { FontSizeDetails } from '../utils/fontSizeEstimator';
import { formatBytes } from '../utils/fontSizeEstimator';

interface FontMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: FontMetadata;
  onSave: (updated: FontMetadata) => void;
  sizeDetails?: FontSizeDetails;
}

export const FontMetadataModal: React.FC<FontMetadataModalProps> = ({
  isOpen,
  onClose,
  metadata,
  onSave,
  sizeDetails,
}) => {
  const [form, setForm] = useState<FontMetadata>(metadata);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 select-none font-mono">
      <div className="bg-[#f4f4f1] border border-zinc-400 max-w-lg w-full p-6 text-zinc-900 flex flex-col gap-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-300">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
              Font Metadata & Metrics
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">Family name, style, and em units</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs font-mono">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-600 block mb-1 uppercase text-[10px]">Family Name</label>
              <input
                type="text"
                value={form.family}
                onChange={(e) => setForm({ ...form, family: e.target.value })}
                className="w-full bg-white border border-zinc-300 px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-900 font-bold"
                placeholder="e.g. Nimbus Jagged"
                required
              />
            </div>

            <div>
              <label className="text-zinc-600 block mb-1 uppercase text-[10px]">Subfamily / Style</label>
              <input
                type="text"
                value={form.subfamily}
                onChange={(e) => setForm({ ...form, subfamily: e.target.value })}
                className="w-full bg-white border border-zinc-300 px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-900"
                placeholder="e.g. Regular, Bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-zinc-600 block mb-1 uppercase text-[10px]">Units Per Em</label>
              <input
                type="number"
                value={form.unitsPerEm}
                onChange={(e) => setForm({ ...form, unitsPerEm: Number(e.target.value) || 1000 })}
                className="w-full bg-white border border-zinc-300 px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div>
              <label className="text-zinc-600 block mb-1 uppercase text-[10px]">Ascender</label>
              <input
                type="number"
                value={form.ascender}
                onChange={(e) => setForm({ ...form, ascender: Number(e.target.value) || 800 })}
                className="w-full bg-white border border-zinc-300 px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div>
              <label className="text-zinc-600 block mb-1 uppercase text-[10px]">Descender</label>
              <input
                type="number"
                value={form.descender}
                onChange={(e) => setForm({ ...form, descender: Number(e.target.value) || -200 })}
                className="w-full bg-white border border-zinc-300 px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-900"
              />
            </div>
          </div>

          {/* Font File Size Statistics */}
          {sizeDetails && (
            <div className="bg-white border border-zinc-300 p-3 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-zinc-800 font-bold uppercase text-[10px]">
                <HardDrive className="w-3.5 h-3.5 text-zinc-600" />
                <span>Binary File Size & Compression</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-zinc-500 block text-[9px] uppercase">Current Binary</span>
                  <span className="font-bold text-zinc-900">{formatBytes(sizeDetails.currentSizeBytes)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[9px] uppercase">Original Base</span>
                  <span className="font-bold text-zinc-700">{formatBytes(sizeDetails.originalSizeBytes)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[9px] uppercase">Est. WOFF2</span>
                  <span className="font-bold text-emerald-700">{formatBytes(sizeDetails.estimatedWoff2Bytes)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2 border-t border-zinc-300">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 font-bold uppercase text-[11px] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold uppercase text-[11px] transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
