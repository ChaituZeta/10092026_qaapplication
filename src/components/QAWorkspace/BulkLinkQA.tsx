import React, { useState, useEffect } from 'react';
import { Play, RefreshCw, CheckCircle2, XCircle, Clock, ArrowRight, ExternalLink, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExtractedLink } from './types';
import { cn } from '@/lib/utils';

interface BulkLinkQAProps {
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

export function BulkLinkQA({ links, onStatusUpdate, activeLinkId, onLinkSelect }: BulkLinkQAProps) {
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
      
      setResults(prev => ({
        ...prev,
        [linkId]: data.error ? { status: 0, finalUrl: '', responseTime: 0, error: data.error } : data
      }));

      // Auto-update QA status based on HTTP code
      if (onStatusUpdate && !data.error) {
        if (data.status >= 200 && data.status < 400) {
          onStatusUpdate(linkId, 'passed');
        } else {
          onStatusUpdate(linkId, 'failed');
        }
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
    // Process in batches to avoid overwhelming the server
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
    <div className="flex-1 flex flex-col bg-slate-50 relative h-full">
      <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-800">Automated Link Validation</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex gap-2 text-xs font-medium">
            <span className="text-slate-500">Total: {uniqueLinks.length}</span>
            <span className="text-emerald-600">Passed: {passedCount}</span>
            <span className="text-rose-600">Failed: {failedCount}</span>
          </div>
          <Button 
            size="sm" 
            onClick={handleCheckAll}
            disabled={isCheckingAll}
            className="h-8 bg-[#2b61d6] text-white hover:bg-blue-700"
          >
            {isCheckingAll ? (
              <span className="flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Checking...</span>
            ) : (
              <span className="flex items-center gap-2"><Play className="w-3.5 h-3.5" /> Run Bulk Check</span>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3 max-w-4xl mx-auto">
          {uniqueLinks.map((link, index) => {
            const isLoading = loadingIds.has(link.id);
            const result = results[link.id];
            const isSuccess = result && result.status >= 200 && result.status < 400;
            const isRedirect = result && result.status >= 300 && result.status < 400;
            
            return (
              <div 
                key={link.id} 
                className={cn(
                  "bg-white border rounded-lg p-3 shadow-sm transition-all",
                  activeLinkId === link.id ? "border-blue-400 ring-1 ring-blue-400" : "border-slate-200 hover:border-slate-300",
                  result && !isSuccess ? "border-rose-300 bg-rose-50/50" : ""
                )}
                onClick={() => onLinkSelect?.(link.id)}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold uppercase tracking-wide">
                        {link.moduleName || `Link ${index + 1}`}
                      </span>
                      {link.alias && (
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                          {link.alias}
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm text-slate-800 break-all mb-2 leading-tight">
                      {link.href}
                    </div>

                    {result && result.finalUrl && result.finalUrl !== link.href && (
                      <div className="flex items-start gap-2 mt-2 pt-2 border-t border-slate-100">
                        <ArrowRight className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-semibold text-amber-600 uppercase mb-0.5">Redirects To:</div>
                          <div className="text-xs text-slate-600 break-all">
                            {result.finalUrl}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {result && result.error && (
                      <div className="mt-2 text-xs text-rose-600 flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" /> {result.error}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0 w-32">
                    {isLoading ? (
                      <div className="flex items-center gap-1.5 text-blue-600 text-sm font-medium">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Testing...
                      </div>
                    ) : result ? (
                      <>
                        <div className={cn(
                          "flex items-center gap-1.5 text-sm font-bold px-2.5 py-1 rounded-md w-full justify-center",
                          isSuccess ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
                          isRedirect ? "bg-amber-100 text-amber-700" : ""
                        )}>
                          {isSuccess ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          {result.status > 0 ? result.status : 'ERR'}
                        </div>
                        {result.responseTime > 0 && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {result.responseTime}ms
                          </div>
                        )}
                      </>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 text-xs w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          checkUrl(link.id, link.href);
                        }}
                      >
                        Check Link
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {uniqueLinks.length === 0 && (
            <div className="text-center p-8 text-slate-500">
              No links extracted to validate.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
