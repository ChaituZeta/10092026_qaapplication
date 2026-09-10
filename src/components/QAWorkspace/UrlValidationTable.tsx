import React, { useState } from 'react';
import { Play, CheckCircle2, XCircle, ArrowRight, RefreshCw, AlertCircle, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExtractedLink } from './types';
import { cn } from '@/lib/utils';

interface UrlValidationTableProps {
  expectedCountry?: string;
  expectedVersion?: string;
  links: ExtractedLink[];
  onStatusUpdate?: (linkId: string, status: 'passed' | 'failed') => void;
  activeLinkId?: string;
  onLinkSelect?: (linkId: string) => void;
}

interface LinkCheckResult {
  status: number;
  finalUrl: string;
  responseTime: number;
  error?: string;
}

export function UrlValidationTable({ links, onStatusUpdate, activeLinkId, onLinkSelect, expectedCountry, expectedVersion }: UrlValidationTableProps) {
  const [results, setResults] = useState<Record<string, LinkCheckResult>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [isCheckingAll, setIsCheckingAll] = useState(false);

  const checkUrl = async (linkId: string, url: string) => {
    setLoadingIds(prev => new Set(prev).add(linkId));
    try {
      const response = await fetch('/api/check-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await response.json();
      
      let finalUrl = data.finalUrl || '';
      let urlError = data.error;
      
      if (!urlError && finalUrl) {
        const lowerUrl = finalUrl.toLowerCase();
        if (expectedCountry && !lowerUrl.includes(`/${expectedCountry.toLowerCase()}/`)) {
          urlError = (urlError ? urlError + " | " : "") + `Country mismatch (${expectedCountry} missing)`;
        }
        if (expectedVersion && !lowerUrl.includes(expectedVersion.toLowerCase())) {
          urlError = (urlError ? urlError + " | " : "") + `Version mismatch (${expectedVersion} missing)`;
        }
      }
      
      setResults(prev => ({
        ...prev,
        [linkId]: { 
          status: data.status || 0, 
          finalUrl: finalUrl, 
          responseTime: data.responseTime || 0, 
          error: urlError 
        }
      }));

      if (onStatusUpdate && !urlError) {
        if (data.status >= 200 && data.status < 400) {
          onStatusUpdate(linkId, 'passed');
        } else {
          onStatusUpdate(linkId, 'failed');
        }
      } else if (onStatusUpdate && urlError) {
        onStatusUpdate(linkId, 'failed');
      }
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [linkId]: { status: 0, finalUrl: '', responseTime: 0, error: 'Network Error' }
      }));
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(linkId);
        return next;
      });
    }
  };

  const handleCheckAll = async () => {
    setIsCheckingAll(true);
    const batchSize = 3;
    for (let i = 0; i < links.length; i += batchSize) {
      const batch = links.slice(i, i + batchSize);
      await Promise.all(batch.map(link => checkUrl(link.id, link.href)));
    }
    setIsCheckingAll(false);
  };

  const uniqueLinks = Array.from(new Map(links.map(item => [item.href, item])).values());
  const passedCount = Object.values(results).filter((r: any) => r.status >= 200 && r.status < 400).length;
  const failedCount = Object.values(results).filter((r: any) => r.status >= 400 || r.error).length;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 border-l border-slate-200 h-full overflow-hidden">
      {/* Header */}
      <div className="h-16 px-6 flex items-center justify-between shrink-0 bg-white border-b border-slate-200 shadow-sm z-10">
        <div>
          <h2 className="font-semibold text-slate-800 text-sm">URL Link Validation</h2>
          <div className="flex gap-4 text-xs mt-0.5">
            <span className="text-slate-500">{uniqueLinks.length} Links</span>
            {passedCount > 0 && <span className="text-emerald-600 font-medium">{passedCount} Valid</span>}
            {failedCount > 0 && <span className="text-rose-600 font-medium">{failedCount} Broken</span>}
          </div>
        </div>
        
        <Button 
          size="sm" 
          onClick={handleCheckAll}
          disabled={isCheckingAll}
          className="bg-slate-900 text-white hover:bg-slate-800 h-9 px-4 rounded-full shadow-sm transition-all"
        >
          {isCheckingAll ? (
            <><RefreshCw className="w-4 h-4 mr-2 animate-spin text-slate-300" /> Validating...</>
          ) : (
            <><Play className="w-4 h-4 mr-2" /> Validate All</>
          )}
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto p-4 space-y-2">
        {uniqueLinks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
            <Link2 className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No URLs extracted.</p>
          </div>
        ) : (
          uniqueLinks.map((link) => {
            const isLoading = loadingIds.has(link.id);
            const result = results[link.id];
            const isSuccess = result && result.status >= 200 && result.status < 300 && !result.error;
            const isRedirect = result && result.status >= 300 && result.status < 400 && !result.error;
            const isError = result && (result.status >= 400 || result.error);

            return (
              <div 
                key={link.id}
                onClick={() => onLinkSelect?.(link.id)}
                className={cn(
                  "group bg-white p-3.5 rounded-xl border transition-all cursor-pointer shadow-sm hover:shadow-md",
                  activeLinkId === link.id ? "border-blue-300 bg-blue-50/30" : "border-slate-200 hover:border-slate-300",
                  isError && "border-rose-200 bg-rose-50/30"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* URL Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 truncate">
                        {link.moduleName || 'Link'}
                      </span>
                      
                      {/* Status Badge inline */}
                      {result && (
                        <div className={cn(
                          "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase",
                          isSuccess ? "bg-emerald-10 text-emerald-600" :
                          isRedirect ? "bg-amber-10 text-amber-600" :
                          "bg-rose-10 text-rose-600"
                        )}>
                          {isSuccess && "Valid"}
                          {isRedirect && "Redirect"}
                          {isError && "Error"}
                        </div>
                      )}
                    </div>
                    <div className="text-[13px] text-slate-800 break-all font-medium leading-relaxed">
                      {link.href}
                    </div>

                    {/* Feedback Messages */}
                    {isRedirect && result.finalUrl && (
                      <div className="mt-2 text-xs flex items-center gap-1.5 text-amber-700 bg-amber-50/50 p-1.5 rounded-md border border-amber-100">
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{result.finalUrl}</span>
                      </div>
                    )}
                    
                    {isError && result.error && (
                      <div className="mt-2 text-xs flex items-center gap-1.5 text-rose-700 bg-rose-50/50 p-1.5 rounded-md border border-rose-100">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{result.error}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions / Status Icon */}
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    {isLoading ? (
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                        <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                      </div>
                    ) : result ? (
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shadow-xs",
                        isSuccess ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                        isRedirect ? "bg-amber-50 text-amber-600 border border-amber-100" :
                        "bg-rose-50 text-rose-600 border border-rose-100"
                      )}>
                        {isSuccess ? <CheckCircle2 className="w-4 h-4" /> :
                         isRedirect ? <ArrowRight className="w-4 h-4" /> :
                         <XCircle className="w-4 h-4" />}
                      </div>
                    ) : (
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          checkUrl(link.id, link.href);
                        }}
                      >
                        <Play className="w-4 h-4 ml-0.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
