import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';

interface CssSnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
  fontFamily: string;
}

export const CssSnippetModal: React.FC<CssSnippetModalProps> = ({
  isOpen,
  onClose,
  fontFamily,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const cssCode = `@font-face {
  font-family: '${fontFamily}';
  src: url('${fontFamily}.otf') format('opentype'),
       url('${fontFamily}.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

.custom-font {
  font-family: '${fontFamily}', sans-serif;
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(cssCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 select-none font-mono">
      <div className="bg-[#f4f4f1] border border-zinc-400 max-w-lg w-full p-6 text-zinc-900 flex flex-col gap-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-300">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
              Webfont @font-face CSS
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">Embed customized font into web stylesheets</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="relative">
            <pre className="bg-white border border-zinc-300 text-zinc-900 p-4 text-xs font-mono overflow-x-auto leading-relaxed select-text">
              {cssCode}
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 bg-zinc-900 text-white text-[11px] font-bold uppercase hover:bg-zinc-800 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'COPIED' : 'COPY'}</span>
            </button>
          </div>
          <p className="text-[10px] text-zinc-500 uppercase">
            Export font as .OTF or .TTF and place in web assets folder.
          </p>
        </div>

        <div className="flex justify-end pt-2 border-t border-zinc-300">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold uppercase text-[11px] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
