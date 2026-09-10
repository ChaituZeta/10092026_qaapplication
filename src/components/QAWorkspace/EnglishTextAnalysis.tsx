import React, { useState, useEffect, useCallback } from 'react';
import { analyzeEnglishText, extractPlainText, TextAnalysisResult, TextIssue } from '@/lib/text-analyzer';
import { 
  CheckCircle2, Copy, Check, RefreshCw, Type, 
  ExternalLink, Globe, Search, Trash2, AlertCircle, Link2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EnglishTextAnalysisProps {
  htmlSource?: string;
  webViewUrl?: string;
  onFixApplied?: (updatedHtml: string) => void;
}

export function EnglishTextAnalysis({ htmlSource, webViewUrl, onFixApplied }: EnglishTextAnalysisProps) {
  const [emailText, setEmailText] = useState<string>('');
  const [customViewOnlineUrl, setCustomViewOnlineUrl] = useState<string>(webViewUrl || '');
  const [analysis, setAnalysis] = useState<TextAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [copiedIssueId, setCopiedIssueId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [sourceStatus, setSourceStatus] = useState<string>('');
  const [fetchError, setFetchError] = useState<string | null>(null);

  const targetUrl = customViewOnlineUrl || webViewUrl || '';

  // Extract text strictly from View Online URL
  const fetchAndExtractFromViewOnline = useCallback(async (urlToFetch?: string) => {
    const activeUrl = urlToFetch || targetUrl;
    setFetchError(null);

    if (!activeUrl || !activeUrl.trim() || activeUrl === 'http://' || activeUrl === 'https://') {
      setEmailText('');
      setAnalysis(null);
      setSourceStatus('No View Online URL specified');
      return;
    }

    setIsExtracting(true);
    let extractedText = '';

    try {
      setSourceStatus(`Fetching View Online content...`);
      // Use server proxy to bypass CORS restrictions on external View Online URLs
      const proxyEndpoint = `/api/proxy?url=${encodeURIComponent(activeUrl.trim())}`;
      const response = await fetch(proxyEndpoint);

      if (response.ok) {
        const fetchedHtml = await response.text();
        if (fetchedHtml && fetchedHtml.length > 20) {
          extractedText = extractPlainText(fetchedHtml);
        }
      }

      // Direct fallback attempt if proxy returned short error wrapper
      if (!extractedText) {
        try {
          const directRes = await fetch(activeUrl, { mode: 'cors' });
          if (directRes.ok) {
            const rawHtml = await directRes.text();
            extractedText = extractPlainText(rawHtml);
          }
        } catch (e) {
          // ignore direct CORS failure
        }
      }

      if (extractedText) {
        setEmailText(extractedText);
        setSourceStatus(`✓ Loaded text from View Online: ${activeUrl}`);
        
        // Auto-run analysis on extracted text
        setIsAnalyzing(true);
        const res = await analyzeEnglishText(extractedText);
        setAnalysis(res);
        setIsAnalyzing(false);
      } else {
        setFetchError(`Could not extract readable text from View Online URL (${activeUrl}). Check if the link is accessible.`);
        setSourceStatus(`Failed to extract from View Online`);
      }
    } catch (err: any) {
      console.error('Error fetching View Online page:', err);
      setFetchError(`Failed to fetch View Online page: ${err?.message || 'Network error'}`);
      setSourceStatus('Fetch failed');
    } finally {
      setIsExtracting(false);
    }
  }, [targetUrl]);

  useEffect(() => {
    if (webViewUrl) {
      setCustomViewOnlineUrl(webViewUrl);
    }
  }, [webViewUrl]);

  useEffect(() => {
    if (targetUrl) {
      fetchAndExtractFromViewOnline(targetUrl);
    }
  }, []);

  // Run or re-run analysis on demand (Search button click)
  const handleSearch = async () => {
    if (!emailText.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await analyzeEnglishText(emailText);
      setAnalysis(res);
    } catch (err) {
      console.error('Failed to run English text analysis:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setEmailText('');
    setAnalysis(null);
    setFetchError(null);
  };

  const handleCopySuggestion = (issue: TextIssue) => {
    const textToCopy = (issue.suggestions && issue.suggestions.length > 0)
      ? issue.suggestions[0]
      : issue.word;
    navigator.clipboard.writeText(textToCopy);
    setCopiedIssueId(issue.id);
    setTimeout(() => setCopiedIssueId(null), 2000);
  };

  const handleCopyAllResults = () => {
    if (!analysis || analysis.issues.length === 0) return;
    
    const formatted = [
      "Check Results",
      "Grammar Mistakes & Spelling Issues:",
      ...analysis.issues.map((issue) => {
        const foundStr = issue.word !== undefined ? ` (Found: ${issue.word}` : '';
        const sugStr = issue.suggestions && issue.suggestions.length > 0 ? `, Suggested: ${issue.suggestions[0]})` : ')';
        return `• ${issue.message}${foundStr}${sugStr}`;
      })
    ].join('\n');

    navigator.clipboard.writeText(formatted);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Top Banner / Header matching screenshot */}
      <div className="bg-[#1d5bd8] text-white rounded-xl p-5 shadow-sm border-b-4 border-amber-400">
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <div className="p-2 bg-white/10 rounded-full">
            <Type className="w-6 h-6 text-amber-300" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            Spell &amp; Grammar Check
          </h2>
          <div className="w-24 h-1 bg-amber-400 rounded-full my-1" />
          <p className="text-xs text-blue-100 max-w-xl">
            Automatically loads and parses text directly from the <strong className="text-amber-300 underline">View Online</strong> link for spelling, grammar, and typography checks.
          </p>
        </div>
      </div>

      {/* View Online URL Controls bar */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <Link2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-bold text-slate-700 shrink-0">View Online Target URL:</span>
          <input
            type="text"
            value={customViewOnlineUrl}
            onChange={(e) => setCustomViewOnlineUrl(e.target.value)}
            placeholder="Enter View Online URL (e.g. https://...)"
            className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            onClick={() => fetchAndExtractFromViewOnline(customViewOnlineUrl)}
            disabled={isExtracting || !customViewOnlineUrl.trim()}
            className="bg-[#2b61d6] hover:bg-blue-700 text-white font-bold text-xs h-8 px-4 rounded-lg gap-1.5 cursor-pointer"
          >
            {isExtracting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Fetching...</span>
              </>
            ) : (
              <>
                <Globe className="w-3.5 h-3.5 text-amber-300" />
                <span>Fetch from View Online</span>
              </>
            )}
          </Button>

          {targetUrl && (
            <a
              href={targetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1"
            >
              <span>Open Link</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Error / Status Warning if no URL or fetch failed */}
      {fetchError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-800">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900">View Online Content Missing</p>
            <p className="mt-0.5 text-amber-700">{fetchError}</p>
          </div>
        </div>
      )}

      {/* Main Box */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Upper Card: Paste Email Text */}
        <div className="p-5 md:p-6 border-b border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Paste Email Text:</span>
              {isExtracting ? (
                <span className="text-xs font-normal text-blue-600 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Extracting from View Online...
                </span>
              ) : emailText ? (
                <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {sourceStatus}
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  Waiting for View Online URL
                </span>
              )}
            </label>

            {emailText && (
              <span className="text-xs font-medium text-slate-500">
                {emailText.split(/\s+/).filter(Boolean).length} words
              </span>
            )}
          </div>

          {/* Text Area */}
          <div className="relative">
            <textarea
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              placeholder="Content from the View Online target link will be automatically fetched and displayed here..."
              rows={9}
              className="w-full p-4 rounded-xl border-2 border-blue-200 focus:border-[#1d5bd8] focus:ring-2 focus:ring-blue-100 text-xs font-sans text-slate-800 bg-white placeholder:text-slate-400 transition-all resize-y shadow-inner leading-relaxed"
            />
          </div>

          {/* Action Buttons Row matching screenshot (Search in Yellow, Clear in Red) */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <Button
              type="button"
              onClick={handleSearch}
              disabled={isAnalyzing || !emailText.trim()}
              className="bg-[#eab308] hover:bg-amber-500 text-slate-950 font-bold text-xs gap-2 px-8 py-2.5 h-10 shadow-sm rounded-lg cursor-pointer transition-all active:scale-98"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Scanning Text...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 text-slate-950" />
                  <span>Search</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={handleClear}
              disabled={!emailText && !analysis}
              className="bg-[#ef4444] hover:bg-rose-600 text-white font-bold text-xs gap-2 px-8 py-2.5 h-10 shadow-sm rounded-lg cursor-pointer transition-all active:scale-98"
            >
              <Trash2 className="w-4 h-4 text-white" />
              <span>Clear</span>
            </Button>
          </div>
        </div>

        {/* Lower Card: Check Results (At the Bottom, matching screenshot) */}
        <div className="p-5 md:p-6 bg-slate-50/60 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-lg font-black text-[#eab308] tracking-tight">Check Results</h3>
              <p className="text-sm font-bold text-[#1d5bd8] mt-0.5">
                Grammar Mistakes:
              </p>
            </div>

            {analysis && analysis.issues.length > 0 && (
              <Button
                type="button"
                onClick={handleCopyAllResults}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold gap-1.5 px-3.5 py-1.5 h-8 rounded-lg cursor-pointer shadow-xs"
              >
                {copiedAll ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied All Results!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-amber-300" />
                    <span>Copy All Results</span>
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Bulleted List of Results matching exact screenshot format */}
          <div className="pt-2">
            {isAnalyzing ? (
              <div className="p-10 text-center text-slate-500 text-xs flex flex-col items-center gap-2 bg-white rounded-xl border border-slate-200">
                <RefreshCw className="w-6 h-6 animate-spin text-[#1d5bd8]" />
                <span className="font-semibold">Analyzing View Online copy for grammar &amp; spelling issues...</span>
              </div>
            ) : !analysis ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200 border-dashed">
                Click "Search" or "Fetch from View Online" to run grammar checks.
              </div>
            ) : analysis.issues.length === 0 ? (
              <div className="p-8 text-center bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-emerald-900 text-sm">No Grammar Mistakes Found!</h4>
                <p className="text-xs text-emerald-700">
                  All text extracted from the View Online link passed spell check cleanly.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <ul className="space-y-3.5">
                  {analysis.issues.map((issue) => (
                    <li key={issue.id} className="flex items-start justify-between gap-4 text-xs group">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <span className="text-rose-600 font-bold text-base leading-none select-none mt-0.5">•</span>
                        <div className="text-slate-800 font-medium leading-relaxed">
                          <span>{issue.message}</span>
                          <span className="text-slate-600 ml-1">
                            (Found:{' '}
                            <strong className="text-rose-600 font-bold">
                              {issue.word !== undefined ? issue.word : ''}
                            </strong>
                            , Suggested:{' '}
                            <strong className="text-emerald-700 font-bold">
                              {issue.suggestions && issue.suggestions.length > 0 ? issue.suggestions[0] : ''}
                            </strong>)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopySuggestion(issue)}
                          className="h-7 px-2.5 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded border border-slate-200 cursor-pointer"
                          title="Copy suggested fix"
                        >
                          {copiedIssueId === issue.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600 mr-1" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-500 mr-1" />
                              <span>Copy Fix</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
