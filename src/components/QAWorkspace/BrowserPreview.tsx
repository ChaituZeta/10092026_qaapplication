import React, { useState, useRef } from 'react';
import { RefreshCw, Monitor, Smartphone, Tablet, Camera, ExternalLink, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrowserPreviewProps {
  activeUrl: string;
}

export function BrowserPreview({ activeUrl }: BrowserPreviewProps) {
  const [deviceSize, setDeviceSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [key, setKey] = useState(0); // To force refresh iframe
  
  const handleRefresh = () => {
    setKey(prev => prev + 1);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(activeUrl);
  };

  const handleOpenExternal = () => {
    if (activeUrl && activeUrl !== 'about:blank') {
      window.open(activeUrl, '_blank');
    }
  };

  const displayUrl = activeUrl && activeUrl !== 'about:blank' ? activeUrl : 'about:blank';
  const proxyUrl = displayUrl !== 'about:blank' ? `/api/proxy?url=${encodeURIComponent(displayUrl)}` : 'about:blank';


  return (
    <div className="flex-1 flex flex-col bg-slate-100 relative h-full">
      <div className="h-12 bg-slate-200 border-b border-slate-300 flex items-center justify-between px-3 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 ml-1 mr-4">
            <div className="w-3 h-3 rounded-full bg-rose-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
          </div>
          <div className="flex items-center">
            <button type="button" className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-300 rounded transition-colors" title="Back" disabled>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button type="button" className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-300 rounded transition-colors" title="Forward" disabled>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button type="button" onClick={handleRefresh} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-300 rounded transition-colors ml-1" title="Reload Frame">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 max-w-2xl mx-4 flex items-center bg-white rounded-md border border-slate-300 h-7 px-3 text-xs text-slate-600 truncate relative group">
          <span className="truncate pr-6">{displayUrl}</span>
          <button type="button" onClick={handleCopy} className="absolute right-2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-[#2b61d6]" title="Copy URL">
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button type="button" 
            onClick={() => setDeviceSize('desktop')}
            className={cn("p-1.5 rounded transition-colors", deviceSize === 'desktop' ? "text-[#2b61d6] bg-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-300")} 
            title="Desktop View"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button type="button" 
            onClick={() => setDeviceSize('tablet')}
            className={cn("p-1.5 rounded transition-colors", deviceSize === 'tablet' ? "text-[#2b61d6] bg-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-300")} 
            title="Tablet View"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button type="button" 
            onClick={() => setDeviceSize('mobile')}
            className={cn("p-1.5 rounded transition-colors", deviceSize === 'mobile' ? "text-[#2b61d6] bg-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-300")} 
            title="Mobile View"
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-300 mx-1" />
          <button type="button" className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-300 rounded transition-colors" title="Screenshot">
            <Camera className="w-4 h-4" />
          </button>
          <button type="button" onClick={handleOpenExternal} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-300 rounded transition-colors" title="Open in new tab">
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
        {displayUrl !== 'about:blank' ? (
          <div className={cn(
            "bg-white shadow-md overflow-hidden transition-all duration-300 flex items-center justify-center",
            deviceSize === 'mobile' ? "w-[375px] h-[812px] rounded-[2rem] border-8 border-slate-800 relative shadow-2xl" : 
            deviceSize === 'tablet' ? "w-[768px] h-[1024px] rounded-[2rem] border-8 border-slate-800 relative shadow-xl" : 
            "w-full h-full rounded-b-lg border border-slate-300"
          )}>
            <iframe 
              key={key}
              src={displayUrl.startsWith('http') ? proxyUrl : 'about:blank'}
              title="Browser Preview"
              className="w-full h-full border-0 bg-white"
              sandbox="allow-same-origin allow-scripts allow-popups"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400">
            <Monitor className="w-16 h-16 mb-4 text-slate-300" />
            <p className="text-sm">Preview will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
