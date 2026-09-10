import React, { useState, useEffect, useMemo } from 'react';
import { ExtractedLink } from './types';
import { extractLinksMerged, HP_COUNTRY_LOCALES, evaluateCountryMatch } from './linkParser';
import { 
  CheckCircle2, XCircle, Search, Filter, HelpCircle,
  ArrowRight, ExternalLink, RefreshCw, Play,
  Maximize2, Monitor, Copy, Check, Link as LinkIcon, 
  AlertTriangle, Globe, Image as ImageIcon, Sparkles,
  Info, ShieldCheck, ShieldAlert, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface QAWorkspaceProps {
  country?: string;
  versionName?: string;
  htmlSource: string;
  webViewUrl: string;
}

interface ValidationResult {
  status: number;
  finalUrl: string;
  responseTime: number;
  error?: string;
  utmParams?: Record<string, string>;
}

export function BrowserQAWorkspace({ htmlSource, webViewUrl, country, versionName }: QAWorkspaceProps) {
  const [links, setLinks] = useState<ExtractedLink[]>([]);
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});
  const [validatingIds, setValidatingIds] = useState<Set<string>>(new Set());
  const [isValidatingAll, setIsValidatingAll] = useState(false);
  const [validationProgress, setValidationProgress] = useState({ current: 0, total: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'mismatch' | 'redirects' | 'passed' | 'failed' | 'unchecked'>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string; alt?: string } | null>(null);

  // Derive target country configuration
  const targetCountryInfo = useMemo(() => {
    if (!country) return null;
    const key = country.toLowerCase().trim();
    return HP_COUNTRY_LOCALES[key] || null;
  }, [country]);

  const expectedPattern = targetCountryInfo?.defaultPattern || (country ? `hp.com/${country.toLowerCase()}` : '');

  // Extract links from HTML and web view URL with full country & version context
  useEffect(() => {
    let isCancelled = false;

    const fetchAndExtract = async () => {
      let viewHtml = htmlSource;
      if (webViewUrl && webViewUrl !== 'about:blank') {
        try {
          const res = await fetch(`/api/proxy?url=${encodeURIComponent(webViewUrl)}`);
          if (res.ok) {
            viewHtml = await res.text();
          }
        } catch (e) {
          console.warn("Failed to fetch webViewUrl for extraction proxy:", e);
        }
      }

      if (!isCancelled && (viewHtml || htmlSource)) {
        const extracted = extractLinksMerged(htmlSource, viewHtml, country, versionName, expectedPattern);
        setLinks(extracted);
      }
    };

    fetchAndExtract();

    return () => {
      isCancelled = true;
    };
  }, [htmlSource, webViewUrl, country, versionName, expectedPattern]);

  // Single URL validation function
  const validateSingleUrl = async (link: ExtractedLink) => {
    setValidatingIds(prev => new Set(prev).add(link.id));
    try {
      const response = await fetch('/api/check-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: link.href })
      });
      const data = await response.json();

      const finalUrl = data.finalUrl || link.href;
      let urlError = data.error;

      // Re-evaluate country match on final destination URL as well!
      const finalMatch = evaluateCountryMatch(finalUrl, country, versionName, expectedPattern);

      const result: ValidationResult = {
        status: data.status || 0,
        finalUrl: finalUrl,
        responseTime: data.responseTime || 0,
        error: urlError,
        utmParams: data.utmParams || link.utmParams || {}
      };

      setValidationResults(prev => ({
        ...prev,
        [link.id]: result
      }));

      // Update link status automatically if validation succeeded or failed
      setLinks(prev => prev.map(l => {
        if (l.id !== link.id) return l;
        const isSuccess = data.status >= 200 && data.status < 400 && !urlError && !finalMatch.countryMismatch;
        return {
          ...l,
          actualUrl: finalUrl,
          finalUrl: finalUrl,
          httpStatus: data.status,
          countryMismatch: finalMatch.countryMismatch || l.countryMismatch,
          countryMismatchReason: finalMatch.countryMismatchReason || l.countryMismatchReason,
          status: isSuccess ? 'passed' : (data.status >= 400 || urlError || finalMatch.countryMismatch ? 'failed' : l.status)
        };
      }));
    } catch (err: any) {
      setValidationResults(prev => ({
        ...prev,
        [link.id]: {
          status: 0,
          finalUrl: link.href,
          responseTime: 0,
          error: err?.message || 'Network error'
        }
      }));
    } finally {
      setValidatingIds(prev => {
        const next = new Set(prev);
        next.delete(link.id);
        return next;
      });
    }
  };

  // Validate all links sequentially or in small batches
  const handleValidateAll = async () => {
    if (links.length === 0 || isValidatingAll) return;
    setIsValidatingAll(true);
    setValidationProgress({ current: 0, total: links.length });

    const batchSize = 3;
    for (let i = 0; i < links.length; i += batchSize) {
      const batch = links.slice(i, i + batchSize);
      await Promise.all(batch.map(l => validateSingleUrl(l)));
      setValidationProgress({ current: Math.min(i + batchSize, links.length), total: links.length });
    }

    setIsValidatingAll(false);
  };

  const updateLinkStatus = (id: string, status: 'passed' | 'failed' | 'unchecked') => {
    setLinks(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrlId(id);
    setTimeout(() => setCopiedUrlId(null), 2000);
  };

  // Filtered links
  const filteredLinks = useMemo(() => {
    return links.filter(link => {
      const res = validationResults[link.id];
      const finalUrl = res?.finalUrl || link.finalUrl || link.href;
      const isRedirect = (res && res.status >= 300 && res.status < 400) || (finalUrl && finalUrl !== link.href);
      const isMismatch = link.countryMismatch || (res && res.error && res.error.includes('Country'));
      const isPassed = link.status === 'passed' || (res && res.status >= 200 && res.status < 400 && !isMismatch);
      const isFailed = link.status === 'failed' || (res && (res.status >= 400 || res.error || isMismatch));

      // Status filter
      if (statusFilter === 'mismatch' && !isMismatch) return false;
      if (statusFilter === 'redirects' && !isRedirect) return false;
      if (statusFilter === 'passed' && !isPassed) return false;
      if (statusFilter === 'failed' && !isFailed) return false;
      if (statusFilter === 'unchecked' && link.status !== 'unchecked' && res) return false;

      // Module filter
      if (moduleFilter !== 'all') {
        if (!link.moduleName.toLowerCase().includes(moduleFilter.toLowerCase())) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesModule = link.moduleName.toLowerCase().includes(q);
        const matchesText = link.linkText.toLowerCase().includes(q) || link.visibleText.toLowerCase().includes(q);
        const matchesHref = link.href.toLowerCase().includes(q) || finalUrl.toLowerCase().includes(q);
        const matchesAlias = link.alias.toLowerCase().includes(q);
        const matchesUtm = Object.entries(link.utmParams || {}).some(([k, v]) => 
          k.toLowerCase().includes(q) || String(v || "").toLowerCase().includes(q)
        );
        if (!matchesModule && !matchesText && !matchesHref && !matchesAlias && !matchesUtm) {
          return false;
        }
      }

      return true;
    });
  }, [links, validationResults, statusFilter, moduleFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = links.length;
    let passed = 0;
    let redirects = 0;
    let mismatches = 0;
    let broken = 0;

    links.forEach(l => {
      const res = validationResults[l.id];
      const finalUrl = res?.finalUrl || l.finalUrl || l.href;
      if (l.countryMismatch) mismatches++;
      if ((res && res.status >= 300 && res.status < 400) || (finalUrl && finalUrl !== l.href)) redirects++;
      if (l.status === 'passed' || (res && res.status >= 200 && res.status < 400 && !l.countryMismatch)) passed++;
      if (l.status === 'failed' || (res && (res.status >= 400 || res.error))) broken++;
    });

    return { total, passed, redirects, mismatches, broken };
  }, [links, validationResults]);

  // Unique module names for filter chips
  const moduleTypes = useMemo(() => {
    const set = new Set<string>();
    links.forEach(l => {
      const m = l.moduleName.split(' ')[0] || l.moduleName;
      if (m) set.add(m);
    });
    return Array.from(set);
  }, [links]);

  return (
    <div className="flex flex-col w-full bg-slate-50 min-h-[600px] text-slate-800">
      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{lightboxImage.title}</h3>
                {lightboxImage.alt && (
                  <p className="text-xs text-slate-500 font-mono mt-0.5">Alt: &quot;{lightboxImage.alt}&quot;</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex items-center justify-center bg-slate-950/5 overflow-auto max-h-[calc(90vh-120px)]">
              <img 
                src={lightboxImage.src} 
                alt={lightboxImage.alt || lightboxImage.title} 
                className="max-h-[650px] w-auto max-w-full object-contain rounded-lg shadow-md bg-white"
              />
            </div>
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
              <span className="truncate max-w-xl font-mono text-[11px]">{lightboxImage.src}</span>
              <a 
                href={lightboxImage.src} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-1.5 text-[#2b61d6] hover:underline font-semibold"
              >
                <span>Open Full Size</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER BAR: Stage Targeting & Quick Metrics */}
      <div className="bg-white border-b border-slate-200 p-5 shrink-0 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-[#2b61d6]" />
                <span>Link &amp; UTM Parameter Validation</span>
              </h2>
              <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-50 text-[#2b61d6] rounded-full border border-blue-200">
                Stage 4 QA
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Verify all extracted links, country/version locale routing, final redirected landing URLs, and UTM campaign parameters.
            </p>
          </div>

          {/* Target Country & Version Pill */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 rounded-lg border border-slate-200 text-xs">
              <Globe className="w-4 h-4 text-slate-500" />
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block leading-none">Target Country</span>
                <span className="font-bold text-slate-800">{country || "Global / Not Set"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block leading-none">Version</span>
                <span className="font-bold text-slate-800">{versionName || "Standard"}</span>
              </div>
            </div>

            {expectedPattern && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50/70 rounded-lg border border-indigo-200 text-xs">
                <div>
                  <span className="text-indigo-400 text-[10px] uppercase font-bold block leading-none">Locale Pattern</span>
                  <span className="font-mono font-semibold text-indigo-900">{expectedPattern}</span>
                </div>
              </div>
            )}

            {/* Validate All Action Button */}
            <Button
              type="button"
              onClick={handleValidateAll}
              disabled={isValidatingAll || links.length === 0}
              className="bg-[#2b61d6] hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 rounded-lg shadow-xs flex items-center gap-2 cursor-pointer transition-all"
            >
              {isValidatingAll ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Validating {validationProgress.current}/{validationProgress.total}...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Validate All ({links.length})</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* METRICS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Links</span>
            <span className="text-lg font-black text-slate-900">{stats.total}</span>
          </div>

          <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200 text-center">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Valid Links (200)</span>
            <span className="text-lg font-black text-emerald-700">{stats.passed}</span>
          </div>

          <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200 text-center">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Redirects (3xx)</span>
            <span className="text-lg font-black text-amber-700">{stats.redirects}</span>
          </div>

          <div className={cn(
            "p-2.5 rounded-xl border text-center",
            stats.mismatches > 0 ? "bg-rose-50 border-rose-300" : "bg-slate-50 border-slate-200"
          )}>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wider block",
              stats.mismatches > 0 ? "text-rose-600" : "text-slate-400"
            )}>
              Country Mismatches
            </span>
            <span className={cn(
              "text-lg font-black",
              stats.mismatches > 0 ? "text-rose-700" : "text-slate-600"
            )}>
              {stats.mismatches}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Broken / Errors</span>
            <span className={cn(
              "text-lg font-black",
              stats.broken > 0 ? "text-rose-600" : "text-slate-600"
            )}>
              {stats.broken}
            </span>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="bg-white border-b border-slate-200 px-5 py-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input 
            placeholder="Search links by module, URL, anchor text, or UTM parameter..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white w-full"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          {[
            { id: 'all', label: `All (${links.length})` },
            { id: 'mismatch', label: `Mismatches (${stats.mismatches})`, alert: stats.mismatches > 0 },
            { id: 'redirects', label: `Redirects (${stats.redirects})` },
            { id: 'passed', label: `Valid (${stats.passed})` },
            { id: 'failed', label: `Errors (${stats.broken})`, alert: stats.broken > 0 },
            { id: 'unchecked', label: 'Unchecked' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as any)}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap",
                statusFilter === tab.id
                  ? (tab.alert ? "bg-rose-600 text-white shadow-2xs" : "bg-[#2b61d6] text-white shadow-2xs")
                  : "text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* LINK CARDS LIST: Large Images & Clear UTM Validation */}
      <div className="flex-1 p-5 space-y-4 max-w-7xl mx-auto w-full">
        {filteredLinks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs">
            <LinkIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-700">No links found matching your filters</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Try adjusting your search query or switching the status filter to &quot;All&quot; to see all campaign links.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); setModuleFilter('all'); }}
              className="mt-4 text-xs font-semibold"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          filteredLinks.map((link, idx) => {
            const validation = validationResults[link.id];
            const isValidating = validatingIds.has(link.id);
            const finalUrl = validation?.finalUrl || link.finalUrl || link.href;
            const isRedirect = (validation && validation.status >= 300 && validation.status < 400) || (finalUrl && finalUrl !== link.href);
            const isCountryMismatch = link.countryMismatch || (validation && validation.error && validation.error.includes('Country'));
            const isPassed = link.status === 'passed';
            const isFailed = link.status === 'failed' || (validation && (validation.status >= 400 || validation.error || isCountryMismatch));

            // Combine utm params from extracted href and server response
            const combinedUtms: Record<string, string> = {
              ...(link.utmParams || {}),
              ...(validation?.utmParams || {})
            };
            const utmEntries = Object.entries(combinedUtms);
            const hasUtms = utmEntries.length > 0;

            return (
              <div 
                key={link.id}
                className={cn(
                  "bg-white rounded-2xl border transition-all shadow-2xs overflow-hidden",
                  isCountryMismatch 
                    ? "border-rose-300 bg-rose-50/10 hover:border-rose-400" 
                    : isFailed 
                    ? "border-rose-200 bg-rose-50/5 hover:border-rose-300"
                    : isPassed
                    ? "border-emerald-200 hover:border-emerald-300"
                    : "border-slate-200 hover:border-slate-300"
                )}
              >
                <div className="flex flex-col lg:flex-row items-stretch">
                  
                  {/* LEFT: LARGE EASY-TO-VIEW IMAGE PREVIEW CONTAINER */}
                  <div className="w-full lg:w-72 p-4 bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 shrink-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Module #{idx + 1}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                          {link.moduleName}
                        </span>
                      </div>

                      {/* Large Image Frame */}
                      <div className="w-full h-44 bg-white rounded-xl border border-slate-200 overflow-hidden relative group flex items-center justify-center p-2 shadow-2xs">
                        {link.imageUrl ? (
                          <>
                            <img 
                              src={link.imageUrl} 
                              alt={link.alt || link.visibleText || "Campaign Module"} 
                              className="max-h-full max-w-full object-contain rounded transition-transform group-hover:scale-105 duration-200"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            {/* Hover overlay for zoom */}
                            <button
                              type="button"
                              onClick={() => setLightboxImage({
                                src: link.imageUrl!,
                                title: `${link.moduleName} - Link #${idx + 1}`,
                                alt: link.alt
                              })}
                              className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold cursor-pointer"
                              title="Click to view large preview"
                            >
                              <Maximize2 className="w-4 h-4" />
                              <span>View Full Size</span>
                            </button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center p-4 text-slate-400">
                            <ImageIcon className="w-8 h-8 mb-1.5 text-slate-300" />
                            <span className="text-xs font-semibold text-slate-500">Text Button / Anchor</span>
                            <span className="text-[10px] text-slate-400 mt-0.5">No image tag attached</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Image Alt & Alias Details */}
                    <div className="mt-3 space-y-1 text-xs">
                      <div className="flex items-start gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 mt-0.5">Alt:</span>
                        <span className="text-slate-700 font-mono text-[11px] truncate block" title={link.alt || "None"}>
                          {link.alt ? `"${link.alt}"` : <em className="text-slate-400 font-sans">No Alt attribute</em>}
                        </span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 mt-0.5">Alias:</span>
                        <span className="text-slate-700 font-mono text-[11px] truncate block" title={link.alias || "None"}>
                          {link.alias ? `"${link.alias}"` : <em className="text-slate-400 font-sans">No Alias attribute</em>}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* CENTER: DETAILED URL & UTM PARAMETERS INSPECTION */}
                  <div className="flex-1 p-5 space-y-4">
                    
                    {/* Header Row: Label, Country Match Status, and Action Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">
                            {link.visibleText || link.linkText || link.moduleName}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {link.linkText ? `Anchor Text: "${link.linkText}"` : "Image Creative Link"}
                        </span>
                      </div>

                      {/* Country Match & HTTP Status Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Country verification badge */}
                        {isCountryMismatch ? (
                          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                            <span>Country Mismatch: {link.countryMismatchReason || `Expected ${country}`}</span>
                          </span>
                        ) : country ? (
                          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Country Match ({country})</span>
                          </span>
                        ) : null}

                        {/* HTTP Status Badge */}
                        {validation && (
                          <span className={cn(
                            "px-2.5 py-1 text-xs font-bold rounded-lg border flex items-center gap-1.5",
                            validation.status >= 200 && validation.status < 300 && !validation.error
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : validation.status >= 300 && validation.status < 400
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          )}>
                            <span>HTTP {validation.status || "Err"}</span>
                            {validation.responseTime > 0 && (
                              <span className="text-[10px] font-normal opacity-80">({validation.responseTime}ms)</span>
                            )}
                          </span>
                        )}

                        {/* Pass / Fail Toggle Controls */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                          <button
                            type="button"
                            onClick={() => updateLinkStatus(link.id, 'passed')}
                            className={cn(
                              "px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer",
                              isPassed 
                                ? "bg-emerald-600 text-white shadow-2xs" 
                                : "text-slate-600 hover:text-emerald-700 hover:bg-white"
                            )}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Pass</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => updateLinkStatus(link.id, 'failed')}
                            className={cn(
                              "px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer",
                              isFailed 
                                ? "bg-rose-600 text-white shadow-2xs" 
                                : "text-slate-600 hover:text-rose-700 hover:bg-white"
                            )}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Fail</span>
                          </button>
                        </div>

                        {/* Test Single Link Button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => validateSingleUrl(link)}
                          disabled={isValidating}
                          className="h-8 text-xs font-semibold text-slate-700 hover:text-slate-900 border-slate-300"
                        >
                          {isValidating ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          ) : (
                            <Play className="w-3 h-3 mr-1.5 fill-slate-700" />
                          )}
                          <span>{isValidating ? "Checking..." : "Test URL"}</span>
                        </Button>
                      </div>
                    </div>

                    {/* EXTRACTED HTML URL */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                          Extracted Source URL (from Email HTML)
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(link.href, `extracted-${link.id}`)}
                            className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedUrlId === `extracted-${link.id}` ? (
                              <><Check className="w-3 h-3 text-emerald-600" /> Copied!</>
                            ) : (
                              <><Copy className="w-3 h-3" /> Copy URL</>
                            )}
                          </button>
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-[#2b61d6] hover:underline flex items-center gap-1 font-semibold"
                          >
                            <span>Open URL</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 break-all leading-relaxed select-all">
                        {link.href}
                      </div>
                    </div>

                    {/* FINAL DESTINATION URL (AFTER REDIRECTS) */}
                    {isRedirect && finalUrl && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-amber-600 uppercase tracking-wider text-[10px] flex items-center gap-1">
                            <ArrowRight className="w-3.5 h-3.5" />
                            Final Destination Landing URL (After Redirects)
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(finalUrl, `final-${link.id}`)}
                              className="text-[11px] text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                            >
                              {copiedUrlId === `final-${link.id}` ? (
                                <><Check className="w-3 h-3 text-emerald-600" /> Copied!</>
                              ) : (
                                <><Copy className="w-3 h-3" /> Copy Final URL</>
                              )}
                            </button>
                            <a
                              href={finalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-amber-700 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <span>Open Final Landing Page</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200 font-mono text-xs text-amber-950 break-all leading-relaxed select-all">
                          {finalUrl}
                        </div>
                      </div>
                    )}

                    {/* UTM AND TRACKING PARAMETERS BREAKDOWN TABLE */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                          <span>UTM &amp; Campaign Tracking Parameters:</span>
                        </span>
                        {hasUtms ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {utmEntries.length} Tracking Parameters Verified
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            No UTM parameters found
                          </span>
                        )}
                      </div>

                      {hasUtms ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {utmEntries.map(([paramKey, paramVal]) => (
                            <div 
                              key={paramKey}
                              className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex flex-col justify-between overflow-hidden"
                            >
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                                {paramKey}
                              </span>
                              <span className="text-xs font-mono font-semibold text-slate-800 break-all mt-0.5" title={paramVal}>
                                {paramVal}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-50/50 rounded-lg border border-dashed border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Warning: No tracking parameters (utm_source, utm_campaign, utm_medium, or jumpid) detected in this link.</span>
                        </div>
                      )}
                    </div>

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

export default BrowserQAWorkspace;
