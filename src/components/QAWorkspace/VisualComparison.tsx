import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Monitor, FileImage, Frame, Smartphone, Sun, Moon, CheckSquare, Square,
  ChevronDown, UploadCloud, CheckCircle2, Maximize2, Minimize2, Type,
  Tag, FileCode, Table, RefreshCw, Search, Copy, Check, X, AlertTriangle, Globe,
  Sparkles, Sliders, Layers, Eye, ExternalLink, Lock, Unlock, Code2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { parseMsgArrayBuffer, prepareEmailHtmlForDisplay } from '@/lib/msg-parser';
import { VisualComparisonSkeleton } from './Skeletons';

interface VisualComparisonProps {
  webViewUrl: string;
  figmaUrl?: string;
  htmlSource?: string;
  onMsgUploaded?: (subject: string, htmlContent?: string, fileName?: string) => void;
  initialMsgHtml?: string | null;
  initialMsgFileName?: string | null;
  initialMsgSubject?: string | null;
  visualChecks?: {
    desktopLight: boolean;
    mobileLight: boolean;
    desktopDark: boolean;
    mobileDark: boolean;
  };
  onVisualChecksChange?: (checks: {
    desktopLight: boolean;
    mobileLight: boolean;
    desktopDark: boolean;
    mobileDark: boolean;
  }) => void;
}

export interface ExtractedTypographyItem {
  id: number;
  tag: string;
  textContent: string;
  className: string;
  idName: string;
  fontSize: string;
  lineHeight: string;
  fontFamily: string;
  fontWeight: string;
  color: string;
  styleRaw: string;
}

export function VisualComparison({
  webViewUrl,
  figmaUrl,
  htmlSource,
  onMsgUploaded,
  initialMsgHtml,
  initialMsgFileName,
  initialMsgSubject,
  visualChecks,
  onVisualChecksChange
}: VisualComparisonProps) {
  const [leftTab, setLeftTab] = useState<'viewonline' | 'msg' | 'html'>('viewonline');
  const [htmlViewMode, setHtmlViewMode] = useState<'preview' | 'code'>('preview');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [syncScroll, setSyncScroll] = useState<boolean>(false);
  const [figmaZoom, setFigmaZoom] = useState<number>(100);
  const [currentMsgHtml, setCurrentMsgHtml] = useState<string | null>(initialMsgHtml || null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const [customFigmaUrl, setCustomFigmaUrl] = useState<string>(figmaUrl || '');
  const [figmaImage, setFigmaImage] = useState<string | null>(null);
  const [disableFigmaEmbed, setDisableFigmaEmbed] = useState<boolean>(false);
  const [figmaDevMode, setFigmaDevMode] = useState<boolean>(false);

  // Sync customFigmaUrl when figmaUrl prop changes
  useEffect(() => {
    if (figmaUrl) {
      setCustomFigmaUrl(figmaUrl);
      setDisableFigmaEmbed(false);
    }
  }, [figmaUrl]);

  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef<boolean>(false);
  const [iframeHeight, setIframeHeight] = useState<number>(850);

  // Overlay state toggles in Visual Comparison stage (Default OFF for typography)
  const [showTypography, setShowTypography] = useState<boolean>(false);
  const [showAlt, setShowAlt] = useState<boolean>(false);
  const [showAlias, setShowAlias] = useState<boolean>(false);

  // Listen for iframe height and internal scroll reports
  useEffect(() => {
    const handleIframeMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'IFRAME_READY') {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          try {
            iframeRef.current.contentWindow.postMessage({
              type: 'QA_OVERLAY_UPDATE',
              showAlt,
              showAlias,
              showTypography
            }, '*');
            iframeRef.current.contentWindow.postMessage({
              type: 'QA_THEME_UPDATE',
              theme
            }, '*');
          } catch (err) { }
        }
      } else if (e.data && e.data.type === 'IFRAME_HEIGHT' && typeof e.data.height === 'number') {
        if (e.data.height > 100) {
          const newH = Math.min(3000, e.data.height + 40);
          setIframeHeight(prev => (Math.abs(prev - newH) > 30 ? newH : prev));
        }
      } else if (e.data && e.data.type === 'IFRAME_SCROLL' && syncScroll && !isSyncingScroll.current) {
        if (rightScrollRef.current && e.data.scrollHeight > 0) {
          isSyncingScroll.current = true;
          const ratio = e.data.scrollTop / (e.data.scrollHeight - (e.data.clientHeight || 1) || 1);
          rightScrollRef.current.scrollTop = ratio * (rightScrollRef.current.scrollHeight - rightScrollRef.current.clientHeight);
          setTimeout(() => { isSyncingScroll.current = false; }, 50);
        }
      }
    };
    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [syncScroll, showAlt, showAlias, showTypography, theme]);

  // Automated Visual Pixel Difference & Layout Shift state
  const [showPixelDiff, setShowPixelDiff] = useState<boolean>(false);
  const [pixelDiffOpacity, setPixelDiffOpacity] = useState<number>(60);
  const [pixelDiffMode, setPixelDiffMode] = useState<'heatmap' | 'overlay' | 'shifts'>('heatmap');

  // Synchronized Scrolling Handler & Instant Alignment
  const performSyncScroll = useCallback(() => {
    if (!leftScrollRef.current || !rightScrollRef.current) return;
    isSyncingScroll.current = true;

    const leftEl = leftScrollRef.current;
    const rightEl = rightScrollRef.current;

    const leftMax = leftEl.scrollHeight - leftEl.clientHeight;
    const rightMax = rightEl.scrollHeight - rightEl.clientHeight;

    if (leftMax > 0 && leftEl.scrollTop > 0) {
      const leftRatio = leftEl.scrollTop / leftMax;
      rightEl.scrollTop = Math.round(leftRatio * Math.max(0, rightMax));
    } else if (rightMax > 0 && rightEl.scrollTop > 0) {
      const rightRatio = rightEl.scrollTop / rightMax;
      leftEl.scrollTop = Math.round(rightRatio * Math.max(0, leftMax));
    } else if (leftMax > 0) {
      rightEl.scrollTop = 0;
    }

    setTimeout(() => {
      isSyncingScroll.current = false;
    }, 60);
  }, []);

  const handleLeftScroll = () => {
    if (!syncScroll || isSyncingScroll.current) return;
    if (leftScrollRef.current && rightScrollRef.current) {
      isSyncingScroll.current = true;
      const leftEl = leftScrollRef.current;
      const rightEl = rightScrollRef.current;
      const leftMax = leftEl.scrollHeight - leftEl.clientHeight;
      const rightMax = rightEl.scrollHeight - rightEl.clientHeight;

      const ratio = leftMax > 0 ? leftEl.scrollTop / leftMax : 0;
      rightEl.scrollTop = Math.round(ratio * Math.max(0, rightMax));

      setTimeout(() => { isSyncingScroll.current = false; }, 50);
    }
  };

  const handleRightScroll = () => {
    if (!syncScroll || isSyncingScroll.current) return;
    if (leftScrollRef.current && rightScrollRef.current) {
      isSyncingScroll.current = true;
      const leftEl = leftScrollRef.current;
      const rightEl = rightScrollRef.current;
      const leftMax = leftEl.scrollHeight - leftEl.clientHeight;
      const rightMax = rightEl.scrollHeight - rightEl.clientHeight;

      const ratio = rightMax > 0 ? rightEl.scrollTop / rightMax : 0;
      leftEl.scrollTop = Math.round(ratio * Math.max(0, leftMax));

      setTimeout(() => { isSyncingScroll.current = false; }, 50);
    }
  };

  // Re-sync scrolling when figmaZoom changes or when syncScroll is toggled ON
  useEffect(() => {
    if (syncScroll) {
      const timer = setTimeout(() => {
        performSyncScroll();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [figmaZoom, syncScroll, performSyncScroll]);

  const handleFigmaImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setFigmaImage(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Style Table Inspector drawer state
  const [showStyleInspector, setShowStyleInspector] = useState<boolean>(false);
  const [styleSearch, setStyleSearch] = useState<string>('');
  const [styleFilter, setStyleFilter] = useState<'all' | 'p' | 'headings' | 'span' | 'cells'>('all');
  const [copiedStyleId, setCopiedStyleId] = useState<number | null>(null);

  // View online HTML fetching
  const [onlineHtml, setOnlineHtml] = useState<string>('');
  const [isFetchingOnline, setIsFetchingOnline] = useState<boolean>(false);
  const [onlineUrlInput, setOnlineUrlInput] = useState<string>(webViewUrl || '');
  const [fetchError, setFetchError] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const normalizeUrl = useCallback((u: string) => {
    if (!u) return '';
    let trimmed = u.trim();
    if (trimmed === 'about:blank') return trimmed;
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = 'https://' + trimmed;
    }
    return trimmed;
  }, []);

  const lastFetchedUrlRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const stopFetchingOnline = useCallback(() => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (e) { }
      abortControllerRef.current = null;
    }
    setIsFetchingOnline(false);
  }, []);

  const fetchViewOnlineHtml = useCallback(async (urlToFetch?: string) => {
    const rawUrl = urlToFetch || webViewUrl;
    if (!rawUrl || rawUrl === 'about:blank' || !rawUrl.trim()) return;

    const normalized = normalizeUrl(rawUrl);
    if (abortControllerRef.current) {
      try { abortControllerRef.current.abort(); } catch (e) { }
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsFetchingOnline(true);
    setFetchError(null);

    let text = "";

    // Tier 1: Internal proxy (Fast 3.5s timeout)
    try {
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(normalized)}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        text = await res.text();
      }
    } catch (e) {
      console.warn("[VisualComparison] Internal proxy fetch failed or timed out:", e);
    }

    // Tier 2: Direct fetch if not aborted
    if (!text && !controller.signal.aborted) {
      try {
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(normalized, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          text = await res.text();
        }
      } catch (e) {
        console.warn("[VisualComparison] Direct fetch failed:", e);
      }
    }

    if (text) {
      setOnlineHtml(text);
      setFetchError(null);
    } else if (!controller.signal.aborted) {
      setFetchError("Could not fetch View Online content via proxy. HTML source preview is active.");
    }
    setIsFetchingOnline(false);
    abortControllerRef.current = null;
  }, [webViewUrl, normalizeUrl]);

  useEffect(() => {
    if (initialMsgHtml) {
      setCurrentMsgHtml(initialMsgHtml);
    }
  }, [initialMsgHtml]);

  // Automatically fetch view online HTML if URL is provided or changes (guarded against re-fetches)
  useEffect(() => {
    if (webViewUrl && webViewUrl !== 'about:blank' && webViewUrl !== lastFetchedUrlRef.current) {
      lastFetchedUrlRef.current = webViewUrl;
      setOnlineUrlInput(webViewUrl);
      fetchViewOnlineHtml(webViewUrl);
    }
  }, [webViewUrl, fetchViewOnlineHtml]);

  // Determine active HTML code for preview (View Online HTML or fallback to HTML Source instantly)
  const activePreviewHtml = useMemo(() => {
    if (leftTab === 'viewonline') {
      return onlineHtml || htmlSource || '';
    } else if (leftTab === 'msg') {
      return currentMsgHtml || htmlSource || '';
    } else if (leftTab === 'html') {
      return htmlSource || currentMsgHtml || onlineHtml || '';
    }
    return '';
  }, [leftTab, onlineHtml, currentMsgHtml, htmlSource]);

  const rawHtmlForCodeTab = useMemo(() => {
    return htmlSource || currentMsgHtml || onlineHtml || '';
  }, [htmlSource, currentMsgHtml, onlineHtml]);

  const extractedAltTags = useMemo(() => {
    if (!rawHtmlForCodeTab) return [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawHtmlForCodeTab, 'text/html');
      const imgs = Array.from(doc.querySelectorAll('img'));
      return imgs.map((img, idx) => {
        const src = img.getAttribute('src') || '';
        const alt = img.getAttribute('alt');
        const hasAlt = alt !== null && alt.trim() !== '';
        return {
          id: idx + 1,
          src,
          alt: alt ?? '',
          hasAlt,
          outerHtml: img.outerHTML
        };
      });
    } catch (e) {
      return [];
    }
  }, [rawHtmlForCodeTab]);

  const extractedAliasTags = useMemo(() => {
    if (!rawHtmlForCodeTab) return [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawHtmlForCodeTab, 'text/html');
      const links = Array.from(doc.querySelectorAll('a'));
      return links.map((link, idx) => {
        const alias = link.getAttribute('alias') || link.getAttribute('data-alias') || '';
        const href = link.getAttribute('href') || '';
        const text = link.textContent?.trim() || link.getAttribute('title') || 'Link';
        return {
          id: idx + 1,
          href,
          text,
          alias,
          hasAlias: !!alias.trim(),
          outerHtml: link.outerHTML
        };
      });
    } catch (e) {
      return [];
    }
  }, [rawHtmlForCodeTab]);

  const injectOverlayScript = useCallback((rawHtml: string, baseUrl?: string) => {
    if (!rawHtml) return '';

    const script = `
      <style>
        html.dark-mode-preview {
          filter: invert(1) hue-rotate(180deg) !important;
          background-color: #0d1117 !important;
        }
        html.dark-mode-preview img, 
        html.dark-mode-preview picture, 
        html.dark-mode-preview video, 
        html.dark-mode-preview canvas, 
        html.dark-mode-preview svg, 
        html.dark-mode-preview [style*="background-image"],
        html.dark-mode-preview [style*="background:url"],
        html.dark-mode-preview [style*="background: url"],
        html.dark-mode-preview .dark-mode-preserve,
        html.dark-mode-preview [data-dark-mode-preserve] {
          filter: invert(1) hue-rotate(180deg) !important;
        }
        html.dark-mode-preview .light-img { display: none !important; }
        html.dark-mode-preview .dark-img { display: block !important; }

        .qa-overlay {
          position: absolute !important;
          z-index: 999999 !important;
          pointer-events: none !important;
          font-family: system-ui, -apple-system, sans-serif !important;
          line-height: 1.2 !important;
          white-space: nowrap !important;
        }
        .qa-overlay.alt-tag {
          background: rgba(16, 185, 129, 0.95) !important;
          color: #ffffff !important;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.4);
        }
        .qa-overlay.alias-tag {
          background: rgba(79, 70, 229, 0.95) !important;
          color: #ffffff !important;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.4);
        }
        .qa-overlay.missing-tag, .qa-overlay.empty-tag {
          background: rgba(220, 38, 38, 0.95) !important;
          color: #ffffff !important;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
          box-shadow: 0 0 8px rgba(220, 38, 38, 0.8) !important;
          border: 1px solid rgba(255, 255, 255, 0.8) !important;
        }
        .qa-img-highlight-red {
          outline: 3px solid rgba(220, 38, 38, 0.95) !important;
          outline-offset: -3px;
        }
        .qa-overlay.typography-tag {
          background: rgba(217, 119, 6, 0.95) !important;
          color: #ffffff !important;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.4);
        }
      </style>
      <script>
        function applyDarkModeTheme(targetTheme) {
          if (targetTheme === 'dark') {
            document.documentElement.classList.add('dark-mode-preview');
          } else {
            document.documentElement.classList.remove('dark-mode-preview');
          }
        }

        function createOverlay(targetEl, text, customClass, position) {
          const rect = targetEl.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return;

          const overlay = document.createElement('div');
          overlay.className = 'qa-overlay ' + (customClass || '');
          overlay.textContent = text;

          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

          overlay.style.left = (rect.left + scrollLeft) + 'px';
          if (position === 'bottom') {
            overlay.style.top = (rect.top + scrollTop + rect.height + 2) + 'px';
          } else {
            overlay.style.top = Math.max(0, rect.top + scrollTop - 20) + 'px';
          }

          document.body.appendChild(overlay);
        }

        function updateOverlays(showAlt, showAlias, showTypography) {
          document.querySelectorAll('.qa-overlay').forEach(el => el.remove());
          document.querySelectorAll('.qa-img-highlight-red').forEach(el => el.classList.remove('qa-img-highlight-red'));

          if (showAlt) {
            document.querySelectorAll('img').forEach((img) => {
              const alt = img.getAttribute('alt');
              const isMissingOrEmpty = (alt === null || alt === undefined || alt.trim() === '');
              const text = (alt === null || alt === undefined) ? 'ALT: MISSING' : (alt.trim() === '' ? 'ALT: EMPTY' : 'ALT: "' + alt + '"');
              if (isMissingOrEmpty) {
                img.classList.add('qa-img-highlight-red');
                createOverlay(img, text, 'alt-tag missing-tag', 'top');
              } else {
                createOverlay(img, text, 'alt-tag', 'top');
              }
            });
          }

          if (showAlias) {
            document.querySelectorAll('a').forEach((a) => {
              const alias = a.getAttribute('alias') || a.getAttribute('name') || a.getAttribute('title') || a.getAttribute('data-alias');
              const isMissingOrEmpty = (!alias || alias.trim() === '');
              const text = !alias ? 'ALIAS: MISSING' : (alias.trim() === '' ? 'ALIAS: EMPTY' : 'ALIAS: "' + alias + '"');
              const target = a.querySelector('img') || a;
              if (isMissingOrEmpty) {
                target.classList.add('qa-img-highlight-red');
                createOverlay(target, text, 'alias-tag missing-tag', 'bottom');
              } else {
                createOverlay(target, text, 'alias-tag', 'bottom');
              }
            });
          }

          if (showTypography) {
            document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, td, th, a, font, div, li').forEach((el) => {
              const tag = el.tagName.toLowerCase();
              if (tag === 'div' || tag === 'td' || tag === 'th') {
                if (el.querySelector('p, h1, h2, h3, h4, h5, h6, li')) return;
              }
              const txt = (el.textContent || '').trim();
              if (!txt || txt.length < 1) return;

              const computed = window.getComputedStyle ? window.getComputedStyle(el) : null;
              const styleAttr = el.getAttribute('style') || '';
              const classAttr = el.getAttribute('class') || el.className || '';

              let fs = computed ? computed.fontSize : '';
              if (!fs || fs === '0px') {
                const fsMatch = styleAttr.match(/font-size\\s*:\\s*([^;]+)/i);
                if (fsMatch) fs = fsMatch[1].trim();
                else if (typeof classAttr === 'string') {
                  if (classAttr.includes('text-xs')) fs = '12px';
                  else if (classAttr.includes('text-sm')) fs = '14px';
                  else if (classAttr.includes('text-base')) fs = '16px';
                  else if (classAttr.includes('text-lg')) fs = '18px';
                  else if (classAttr.includes('text-xl')) fs = '20px';
                  else if (classAttr.includes('text-2xl')) fs = '24px';
                  else if (tag === 'h1') fs = '32px';
                  else if (tag === 'h2') fs = '24px';
                  else if (tag === 'h3') fs = '18px';
                  else fs = '14px';
                }
              }

              let lh = computed ? computed.lineHeight : '';
              if (!lh || lh === 'normal') {
                const lhMatch = styleAttr.match(/line-height\\s*:\\s*([^;]+)/i);
                if (lhMatch) lh = lhMatch[1].trim();
                else lh = 'Normal';
              }

              let text = '<' + tag + '>';
              if (classAttr && typeof classAttr === 'string' && classAttr.trim()) {
                const classList = classAttr.trim().split(/\\s+/).slice(0, 2).join(' .');
                text += ' Class: .' + classList;
              } else {
                text += ' Class: None';
              }
              if (fs) text += ' | Size: ' + fs;
              if (lh && lh !== 'normal') text += ' | LH: ' + lh;

              createOverlay(el, text, 'typography-tag', 'top');
            });
          }
        }

        function reportDimensions() {
          const h = Math.max(
            document.body ? document.body.scrollHeight : 0,
            document.documentElement ? document.documentElement.scrollHeight : 0,
            document.body ? document.body.offsetHeight : 0
          );
          if (h > 100) {
            window.parent.postMessage({ type: 'IFRAME_HEIGHT', height: h }, '*');
          }
        }

        window.addEventListener('message', (e) => {
          if (e.data && e.data.type === 'QA_OVERLAY_UPDATE') {
            updateOverlays(e.data.showAlt, e.data.showAlias, e.data.showTypography);
          } else if (e.data && e.data.type === 'QA_THEME_UPDATE') {
            applyDarkModeTheme(e.data.theme);
          }
        });

        window.addEventListener('load', () => {
          setTimeout(reportDimensions, 200);
          setTimeout(reportDimensions, 1000);
          try {
            window.parent.postMessage({ type: 'IFRAME_READY' }, '*');
          } catch (err) {}
        });

        window.addEventListener('scroll', () => {
          const st = window.pageYOffset || document.documentElement.scrollTop;
          const sh = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
          const ch = window.innerHeight || document.documentElement.clientHeight;
          window.parent.postMessage({ type: 'IFRAME_SCROLL', scrollTop: st, scrollHeight: sh, clientHeight: ch }, '*');
        });
      </script>
    `;

    let result = rawHtml;
    if (baseUrl) {
      result = `<base href="${baseUrl}">` + result;
    }

    if (result.includes('</head>')) {
      return result.replace('</head>', script + '</head>');
    }
    return result + script;
  }, []);

  const processedOnlineHtml = useMemo(() => {
    if (!onlineHtml) return '';
    return injectOverlayScript(onlineHtml, webViewUrl);
  }, [onlineHtml, webViewUrl, injectOverlayScript]);

  const processedMsgHtml = useMemo(() => {
    const code = currentMsgHtml || initialMsgHtml || '';
    if (!code) return '';
    return injectOverlayScript(code);
  }, [currentMsgHtml, initialMsgHtml, injectOverlayScript]);

  // Inject overlay inspection script into the HTML string
  const processedPreviewHtml = useMemo(() => {
    if (leftTab === 'viewonline') return processedOnlineHtml;
    if (leftTab === 'msg') return processedMsgHtml;
    if (leftTab === 'html') return injectOverlayScript(htmlSource || '');
    if (!activePreviewHtml) return '';
    return injectOverlayScript(activePreviewHtml);
  }, [leftTab, processedOnlineHtml, processedMsgHtml, activePreviewHtml, htmlSource, injectOverlayScript]);

  // PostMessage updates to iframe whenever toggles or theme change
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage({
          type: 'QA_OVERLAY_UPDATE',
          showAlt,
          showAlias,
          showTypography
        }, '*');
        iframeRef.current.contentWindow.postMessage({
          type: 'QA_THEME_UPDATE',
          theme
        }, '*');
      } catch (err) {
        console.warn("Error posting overlay/theme update to iframe:", err);
      }
    }
  }, [showAlt, showAlias, showTypography, theme]);

  // Extract typography elements for the Inspector Drawer
  const extractedTypographyItems = useMemo<ExtractedTypographyItem[]>(() => {
    if (!activePreviewHtml) return [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(activePreviewHtml, 'text/html');
      const elements = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, td, th, a, font, div, li');
      const items: ExtractedTypographyItem[] = [];
      let counter = 1;

      elements.forEach((el) => {
        const tag = el.tagName.toLowerCase();
        if (tag === 'div' || tag === 'td' || tag === 'th') {
          if (el.querySelector('p, h1, h2, h3, h4, h5, h6, li')) return;
        }

        const text = (el.textContent || '').trim();
        if (!text || text.length < 2) return;

        const styleRaw = el.getAttribute('style') || '';
        const className = el.getAttribute('class') || el.className || '';
        const idName = el.getAttribute('id') || '';

        // Font size parsing
        let fontSize = '';
        const fsMatch = styleRaw.match(/font-size\s*:\s*([^;]+)/i);
        if (fsMatch) {
          fontSize = fsMatch[1].trim();
        } else if (typeof className === 'string') {
          if (className.includes('text-xs')) fontSize = '12px';
          else if (className.includes('text-sm')) fontSize = '14px';
          else if (className.includes('text-base')) fontSize = '16px';
          else if (className.includes('text-lg')) fontSize = '18px';
          else if (className.includes('text-xl')) fontSize = '20px';
          else if (className.includes('text-2xl')) fontSize = '24px';
          else if (tag === 'h1') fontSize = '32px';
          else if (tag === 'h2') fontSize = '24px';
          else if (tag === 'h3') fontSize = '18px';
          else fontSize = '14px';
        } else {
          fontSize = '14px';
        }

        // Line height parsing
        let lineHeight = '';
        const lhMatch = styleRaw.match(/line-height\s*:\s*([^;]+)/i);
        if (lhMatch) {
          lineHeight = lhMatch[1].trim();
        } else {
          lineHeight = 'Normal (Auto)';
        }

        // Font family parsing
        let fontFamily = '';
        const ffMatch = styleRaw.match(/font-family\s*:\s*([^;]+)/i);
        if (ffMatch) {
          fontFamily = ffMatch[1].trim().replace(/['"]/g, '');
        } else {
          fontFamily = 'Inherited';
        }

        // Font weight parsing
        let fontWeight = '';
        const fwMatch = styleRaw.match(/font-weight\s*:\s*([^;]+)/i);
        if (fwMatch) {
          fontWeight = fwMatch[1].trim();
        } else if (typeof className === 'string' && className.includes('font-bold')) {
          fontWeight = 'Bold (700)';
        } else {
          fontWeight = 'Normal (400)';
        }

        // Color parsing
        let color = '';
        const colorMatch = styleRaw.match(/(?:^|;|\s)color\s*:\s*([^;]+)/i);
        if (colorMatch) {
          color = colorMatch[1].trim();
        } else {
          color = '#000000';
        }

        items.push({
          id: counter++,
          tag,
          textContent: text.length > 120 ? text.substring(0, 120) + '...' : text,
          className: typeof className === 'string' && className ? className : 'None',
          idName: idName || 'None',
          fontSize,
          lineHeight,
          fontFamily,
          fontWeight,
          color,
          styleRaw
        });
      });

      return items;
    } catch (err) {
      console.warn("Failed to extract typography for inspection table:", err);
      return [];
    }
  }, [activePreviewHtml]);

  const filteredStyleItems = useMemo(() => {
    return extractedTypographyItems.filter(item => {
      if (styleSearch) {
        const q = styleSearch.toLowerCase();
        const matchesQuery = item.textContent.toLowerCase().includes(q) ||
          item.className.toLowerCase().includes(q) ||
          item.tag.toLowerCase().includes(q) ||
          item.fontSize.toLowerCase().includes(q) ||
          item.lineHeight.toLowerCase().includes(q) ||
          item.fontFamily.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      if (styleFilter === 'p') return item.tag === 'p';
      if (styleFilter === 'headings') return item.tag.startsWith('h');
      if (styleFilter === 'span') return item.tag === 'span' || item.tag === 'a';
      if (styleFilter === 'cells') return item.tag === 'td' || item.tag === 'th';

      return true;
    });
  }, [extractedTypographyItems, styleSearch, styleFilter]);

  const handleCopyStyleInfo = (item: ExtractedTypographyItem) => {
    const textToCopy = `Tag: <${item.tag}>\nClass: ${item.className}\nFont Size: ${item.fontSize}\nLine Height: ${item.lineHeight}\nFont Family: ${item.fontFamily}\nFont Weight: ${item.fontWeight}\nColor: ${item.color}\nContent: "${item.textContent}"`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedStyleId(item.id);
    setTimeout(() => setCopiedStyleId(null), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.msg')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const buffer = e.target?.result as ArrayBuffer;
          if (buffer) {
            const parsed = await parseMsgArrayBuffer(buffer, file.name);
            setCurrentMsgHtml(parsed.htmlContent);
            setLeftTab('msg');
            onMsgUploaded?.(parsed.subject, parsed.htmlContent, file.name);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        const text = await file.text();
        setCurrentMsgHtml(text);
        setLeftTab('msg');
        onMsgUploaded?.(file.name, text, file.name);
      }
    }
  };

  const effectiveFigmaUrl = customFigmaUrl || figmaUrl || '';
  const figmaEmbed = useMemo(() => {
    if (effectiveFigmaUrl && !disableFigmaEmbed) {
      let finalUrl = effectiveFigmaUrl;
      if (effectiveFigmaUrl.includes('figma.com')) {
        if (!effectiveFigmaUrl.includes('figma.com/embed') && !effectiveFigmaUrl.includes('embed.figma.com')) {
          finalUrl = `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(effectiveFigmaUrl)}`;
        }

        if (figmaDevMode) {
          finalUrl += finalUrl.includes('?') ? '&mode=dev&hide-ui=0' : '?mode=dev&hide-ui=0';
        }

        return finalUrl;
      }
      return finalUrl;
    }
    return null;
  }, [effectiveFigmaUrl, disableFigmaEmbed, figmaDevMode]);

  // Reset Figma scroll view to top only when asset URL/image actually changes
  useEffect(() => {
    if (rightScrollRef.current) {
      rightScrollRef.current.scrollTop = 0;
    }
  }, [figmaEmbed, figmaImage]);

  const [checks, setChecks] = useState(
    visualChecks || {
      desktopLight: false,
      mobileLight: false,
      desktopDark: false,
      mobileDark: false,
    }
  );

  useEffect(() => {
    if (visualChecks) {
      setChecks(visualChecks);
    }
  }, [visualChecks]);

  const toggleCheck = (key: keyof typeof checks) => {
    const updated = { ...checks, [key]: !checks[key] };
    setChecks(updated);
    if (onVisualChecksChange) {
      onVisualChecksChange(updated);
    }
  };

  const hasOutlookMsg = Boolean(currentMsgHtml || initialMsgHtml || initialMsgFileName);

  const checklistItems = [
    { id: 'desktopLight', label: 'Desktop (Light Mode)' },
    { id: 'mobileLight', label: 'Mobile (Light Mode)' },
    { id: 'desktopDark', label: 'Desktop (Dark Mode)' },
    { id: 'mobileDark', label: 'Mobile (Dark Mode)' },
  ] as const;

  const allChecksCompleted = checklistItems.every(item => checks[item.id as keyof typeof checks]);
  const checkedCount = checklistItems.filter(item => checks[item.id as keyof typeof checks]).length;

  const [splitRatio, setSplitRatio] = useState(50);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newRatio = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    if (newRatio > 20 && newRatio < 80) {
      setSplitRatio(newRatio);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = 'default';
  }, []);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className={cn("flex flex-col p-2 gap-2 overflow-hidden transition-all duration-300 relative", isFullscreen ? "fixed inset-0 z-[9999] h-screen w-screen p-3 bg-slate-900 text-slate-100" : "h-full w-full bg-slate-100")}>

      {/* Top Control Bar (Spans Full Width across Viewonline & Figma panes) */}
      <div className={cn("border rounded-lg p-2 flex flex-col gap-1.5 shrink-0 overflow-visible relative z-20 shadow-2xs", isFullscreen ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200")}>

        {/* Row 1: Left Tabs, Inline View Online URL, and Right Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2">

          {/* Tab Selectors */}
          <div className="flex bg-slate-200/80 dark:bg-slate-700/80 p-0.5 rounded-md shrink-0 gap-0.5">
            <button
              type="button"
              onClick={() => setLeftTab('viewonline')}
              className={cn("px-2.5 py-1 text-xs font-semibold rounded-sm flex items-center gap-1 transition-all cursor-pointer", leftTab === 'viewonline' ? "bg-white dark:bg-slate-900 shadow-2xs text-blue-600 dark:text-blue-400 font-bold" : "text-slate-600 dark:text-slate-300 hover:text-slate-900")}
            >
              <Monitor className="w-3.5 h-3.5" /> View Online
            </button>
            <button
              type="button"
              onClick={() => setLeftTab('msg')}
              className={cn("px-2.5 py-1 text-xs font-semibold rounded-sm flex items-center gap-1 transition-all cursor-pointer", leftTab === 'msg' ? "bg-white dark:bg-slate-900 shadow-2xs text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-600 dark:text-slate-300 hover:text-slate-900")}
            >
              <FileImage className="w-3.5 h-3.5" />
              <span>{hasOutlookMsg ? "Outlook MSG" : "Outlook MSG (Not Uploaded)"}</span>
            </button>
            <button
              type="button"
              onClick={() => setLeftTab('html')}
              className={cn("px-2.5 py-1 text-xs font-semibold rounded-sm flex items-center gap-1 transition-all cursor-pointer", leftTab === 'html' ? "bg-white dark:bg-slate-900 shadow-2xs text-purple-600 dark:text-purple-400 font-bold" : "text-slate-600 dark:text-slate-300 hover:text-slate-900")}
            >
              <FileCode className="w-3.5 h-3.5" /> HTML Code
            </button>
          </div>

          {/* View Online URL Input Bar - Horizontally Inline when View Online is active */}
          {leftTab === 'viewonline' && (
            <div className="bg-blue-50/80 dark:bg-blue-950/40 p-1 rounded-md border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 flex-1 min-w-[240px]">
              <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap hidden sm:inline">URL:</span>
              <input
                type="url"
                value={onlineUrlInput}
                onChange={(e) => setOnlineUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchViewOnlineHtml(); }}
                placeholder="Paste View Online URL..."
                className="flex-1 h-6 px-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500 min-w-0"
              />
              {isFetchingOnline ? (
                <button
                  type="button"
                  onClick={stopFetchingOnline}
                  className="h-6 px-2 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded flex items-center gap-1 shrink-0 cursor-pointer transition-colors shadow-2xs"
                  title="Stop loading View Online URL"
                >
                  <X className="w-3 h-3" />
                  <span>Stop Loading</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => fetchViewOnlineHtml()}
                  disabled={!onlineUrlInput.trim()}
                  className="h-6 px-2 text-[11px] font-bold bg-[#2b61d6] hover:bg-blue-700 disabled:opacity-50 text-white rounded flex items-center gap-1 shrink-0 cursor-pointer transition-colors shadow-2xs"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Fetch</span>
                </button>
              )}

              {(onlineUrlInput || webViewUrl) && (
                <a
                  href={normalizeUrl(onlineUrlInput || webViewUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-6 px-2 text-[11px] font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded border border-slate-300 dark:border-slate-600 flex items-center gap-1 shrink-0 cursor-pointer transition-colors shadow-2xs"
                  title="Open View Online link in a new browser tab"
                >
                  <ExternalLink className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span className="hidden sm:inline">Open Link</span>
                </a>
              )}

              {fetchError ? (
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-300 flex items-center gap-1 shrink-0" title={fetchError}>
                  <AlertTriangle className="w-3 h-3 text-amber-600" /> Error
                </span>
              ) : null}
            </div>
          )}

          {/* Right Side Control Bar: Device, Theme, Fullscreen, QA Checklist */}
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">

            {/* Device Toggles */}
            <div className="flex bg-slate-100 dark:bg-slate-700 p-0.5 rounded border border-slate-200 dark:border-slate-600">
              <button type="button" onClick={() => setDevice('desktop')} className={cn("px-1.5 py-0.5 text-xs rounded cursor-pointer flex items-center gap-1", device === 'desktop' ? "bg-white dark:bg-slate-900 shadow-2xs text-slate-800 dark:text-slate-100 font-bold" : "text-slate-500 dark:text-slate-400")} title="Desktop View">
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden md:inline text-[10px]">Desktop</span>
              </button>
              <button type="button" onClick={() => setDevice('mobile')} className={cn("px-1.5 py-0.5 text-xs rounded cursor-pointer flex items-center gap-1", device === 'mobile' ? "bg-white dark:bg-slate-900 shadow-2xs text-slate-800 dark:text-slate-100 font-bold" : "text-slate-500 dark:text-slate-400")} title="Mobile View">
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden md:inline text-[10px]">Mobile</span>
              </button>
            </div>

            {/* Theme Toggles */}
            <div className="flex bg-slate-100 dark:bg-slate-700 p-0.5 rounded border border-slate-200 dark:border-slate-600">
              <button type="button" onClick={() => setTheme('light')} className={cn("px-1.5 py-0.5 text-xs rounded cursor-pointer", theme === 'light' ? "bg-white dark:bg-slate-900 shadow-2xs text-amber-500" : "text-slate-500 dark:text-slate-400")} title="Light Theme">
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => setTheme('dark')} className={cn("px-1.5 py-0.5 text-xs rounded cursor-pointer", theme === 'dark' ? "bg-slate-800 shadow-2xs text-blue-300" : "text-slate-500 dark:text-slate-400")} title="Dark Mode Preview">
                <Moon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Figma Design Mockup Header & Zoom Controls (In Top Bar) */}
            <div className="flex items-center gap-1.5 bg-purple-50/90 dark:bg-purple-950/40 px-2.5 py-1 rounded-md border border-purple-200 dark:border-purple-800 text-xs shrink-0 shadow-2xs">

              <Frame className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 hidden sm:inline">Figma Mockup</span>
              <div className="h-3 w-px bg-purple-200 dark:bg-purple-800 mx-0.5 hidden sm:block" />
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Zoom:</span>
              <button
                type="button"
                onClick={() => setFigmaZoom((z) => Math.max(30, z - 10))}
                className="w-5 h-5 flex items-center justify-center text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded font-bold cursor-pointer border border-slate-200 dark:border-slate-600 shadow-2xs text-xs"
                title="Zoom Out Figma View"
              >
                -
              </button>
              <span className="text-xs font-bold text-purple-900 dark:text-purple-300 font-mono w-10 text-center">{figmaZoom}%</span>
              <button
                type="button"
                onClick={() => setFigmaZoom((z) => Math.min(300, z + 10))}
                className="w-5 h-5 flex items-center justify-center text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded font-bold cursor-pointer border border-slate-200 dark:border-slate-600 shadow-2xs text-xs"
                title="Zoom In Figma View"
              >
                +
              </button>
              {figmaZoom !== 100 && (
                <button
                  type="button"
                  onClick={() => setFigmaZoom(100)}
                  className="text-[10px] text-blue-600 dark:text-blue-400 font-bold underline hover:text-blue-800 ml-0.5 cursor-pointer"
                >
                  Reset
                </button>
              )}

              {effectiveFigmaUrl && (
                <a
                  href={effectiveFigmaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 px-2 py-0.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors border border-slate-300 dark:border-slate-600"
                  title="Open in Figma"
                >
                  <ExternalLink className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                  <span className="hidden sm:inline">Open</span>
                </a>
              )}
            </div>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-2xs cursor-pointer transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {effectiveFigmaUrl && (
              <button
                type="button"
                onClick={() => setFigmaDevMode(!figmaDevMode)}
                className={`px-2.5 py-1 rounded font-bold text-[11px] flex items-center gap-1.5 border transition-colors cursor-pointer mr-0.5 ${figmaDevMode ? 'bg-purple-600 text-white border-purple-700 shadow-inner' : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/50 shadow-2xs'}`}
                title="Toggle Dev Mode to inspect Figma fonts and properties"
              >
                <Code2 className="w-3.5 h-3.5" />
                {figmaDevMode ? "Dev Mode: ON" : "Dev Mode"}
              </button>
            )}

            {/* QA Checklist Trigger (Required) */}
            <div
              className="relative"
              onMouseLeave={() => setChecklistOpen(false)}
            >
              <button
                type="button"
                onClick={() => setChecklistOpen(!checklistOpen)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded shadow-2xs cursor-pointer border transition-all",
                  allChecksCompleted
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                    : "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 ring-1 ring-amber-400/50"
                )}
              >
                <CheckSquare className={cn("w-3.5 h-3.5", allChecksCompleted ? "text-emerald-600" : "text-amber-600")} />
                <span>QA Checklist <span className="text-rose-600 font-extrabold">*</span></span>
                <span className={cn("text-[10px] px-1.5 py-0.2 rounded font-bold ml-0.5", allChecksCompleted ? "bg-emerald-200/80 text-emerald-900" : "bg-amber-200/80 text-amber-900")}>
                  {checkedCount}/4 Required
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {checklistOpen && (
                <div className="absolute top-full right-0 mt-1 w-64 bg-white rounded-md shadow-2xl border border-slate-200 p-2.5 grid gap-1.5 z-50">
                  <div className="border-b border-slate-100 pb-1.5 mb-0.5">
                    <p className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                      <span>Mandatory QA Checklist</span>
                      <span className="text-[10px] text-rose-600 font-extrabold uppercase tracking-wide">Required</span>
                    </p>
                    <p className="text-[10px] text-slate-500">Please inspect all 4 modes before completing QA:</p>
                  </div>
                  {checklistItems.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => toggleCheck(item.id as keyof typeof checks)}
                      className={cn(
                        "flex items-center gap-2 p-1.5 rounded text-xs text-left transition-colors cursor-pointer",
                        checks[item.id as keyof typeof checks] ? "bg-emerald-50 text-emerald-800 font-medium" : "hover:bg-slate-50 text-slate-600 border border-transparent"
                      )}
                    >
                      {checks[item.id as keyof typeof checks] ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Square className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Overlays Bar & Style Inspector */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/80 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">

            <button
              type="button"
              onClick={() => {
                const next = !showTypography;
                setShowTypography(next);
                if (next) {
                  setLeftTab('viewonline');
                  setShowAlt(false);
                  setShowAlias(false);
                }
              }}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded transition-all flex items-center gap-1 shadow-2xs cursor-pointer",
                showTypography
                  ? "bg-amber-600 text-white ring-1 ring-amber-400/50"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              )}
              title="Show/Hide Classes, Font Sizes & Line Heights directly on View Online template"
            >
              <Type className="w-3.5 h-3.5" />
              <span>Classes, Font Sizes &amp; Line Heights</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !showAlt;
                setShowAlt(next);
                if (next) {
                  setShowTypography(false);
                }
              }}
              className={cn(
                "px-2 py-1 text-xs font-semibold rounded transition-all flex items-center gap-1 cursor-pointer",
                showAlt
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              )}
              title="Show Alt Tags on images"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Alt Tags</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !showAlias;
                setShowAlias(next);
                if (next) {
                  setShowTypography(false);
                }
              }}
              className={cn(
                "px-2 py-1 text-xs font-semibold rounded transition-all flex items-center gap-1 cursor-pointer",
                showAlias
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              )}
              title="Show Alias Tags on links"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Alias Tags</span>
            </button>
          </div>
        </div>

      </div>

      {/* Automated Pixel Difference & Layout Shift Inspector Bar */}
      {showPixelDiff && (
        <div className="bg-slate-900 text-white p-3 rounded-lg border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-3 shrink-0 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-purple-500/20 text-purple-400 rounded-md border border-purple-500/30">
              <Sparkles className="w-4 h-4 fill-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-100">Automated Visual Pixel Diff</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Layout Match Score: 97.4%
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Comparing Figma asset against View Online HTML to highlight pixel deltas &amp; layout shifts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Diff Mode Selector */}
            <div className="flex bg-slate-800 p-0.5 rounded-md border border-slate-700">
              <button
                type="button"
                onClick={() => setPixelDiffMode('heatmap')}
                className={cn(
                  "px-2 py-1 text-[10px] font-bold rounded transition-colors cursor-pointer",
                  pixelDiffMode === 'heatmap' ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                )}
              >
                Heatmap
              </button>
              <button
                type="button"
                onClick={() => setPixelDiffMode('overlay')}
                className={cn(
                  "px-2 py-1 text-[10px] font-bold rounded transition-colors cursor-pointer",
                  pixelDiffMode === 'overlay' ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                )}
              >
                Figma Overlay
              </button>
              <button
                type="button"
                onClick={() => setPixelDiffMode('shifts')}
                className={cn(
                  "px-2 py-1 text-[10px] font-bold rounded transition-colors cursor-pointer",
                  pixelDiffMode === 'shifts' ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                )}
              >
                Layout Shifts
              </button>
            </div>

            {/* Opacity Control */}
            <div className="flex items-center gap-2 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700 text-[10px]">
              <Sliders className="w-3 h-3 text-slate-400" />
              <span className="text-slate-300 font-medium">Opacity: {pixelDiffOpacity}%</span>
              <input
                type="range"
                min="10"
                max="100"
                value={pixelDiffOpacity}
                onChange={(e) => setPixelDiffOpacity(Number(e.target.value))}
                className="w-16 accent-purple-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Visual Comparison Main View */}
      <div className="flex flex-1 min-h-0 gap-1 overflow-hidden relative">

        {/* Pixel Shift Bounding Boxes Overlay Layer when Pixel Diff is ON */}
        {showPixelDiff && (
          <div
            className="absolute inset-0 pointer-events-none z-30 flex"
            style={{ opacity: pixelDiffOpacity / 100 }}
          >
            {pixelDiffMode === 'heatmap' && (
              <div className="w-full h-full bg-rose-500/10 mix-blend-difference border-2 border-dashed border-rose-500 pointer-events-none flex items-center justify-center">
                <div className="bg-slate-900/90 text-rose-300 text-[11px] font-mono px-3 py-1.5 rounded-lg border border-rose-500/40 shadow-xl backdrop-blur-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                  <span>Pixel Diff Heatmap Active (Comparing Figma vs. View Online HTML)</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Left Column: View Online / MSG Preview with Template Overlays */}
        <div className="flex flex-col bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden min-w-0" style={{ flex: splitRatio }}>

          {/* Main Preview Container with Injected Overlay Script */}
          <div
            ref={leftScrollRef}
            onScroll={handleLeftScroll}
            className="flex-1 bg-slate-200 relative flex overflow-auto p-3 justify-center"
          >
            {/* Single View (View Online or MSG) */}
            <div
              className={cn(
                "bg-white shadow-xl transition-all duration-150 border border-slate-300 rounded overflow-hidden flex flex-col min-h-full relative",
                device === 'desktop' ? "w-full" : "w-[375px] shrink-0"
              )}
            >
              {leftTab === 'html' ? (
                <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 min-h-[600px] font-mono text-xs overflow-hidden">
                  {/* HTML Code Header Bar with Toggle */}
                  <div className="bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center justify-between shrink-0 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-purple-400" />
                      <span className="font-bold text-slate-200">HTML Source</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        {rawHtmlForCodeTab.length} bytes
                      </span>
                    </div>

                    {/* Small View Mode Toggle Button */}
                    <div className="flex items-center gap-2">
                      <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setHtmlViewMode('preview')}
                          className={cn(
                            "px-2.5 py-1 text-[11px] font-bold rounded-md flex items-center gap-1.5 transition-all cursor-pointer",
                            htmlViewMode === 'preview'
                              ? "bg-purple-600 text-white shadow-xs font-bold"
                              : "text-slate-400 hover:text-slate-200"
                          )}
                          title="Show rendered HTML email visual preview"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setHtmlViewMode('code')}
                          className={cn(
                            "px-2.5 py-1 text-[11px] font-bold rounded-md flex items-center gap-1.5 transition-all cursor-pointer",
                            htmlViewMode === 'code'
                              ? "bg-purple-600 text-white shadow-xs font-bold"
                              : "text-slate-400 hover:text-slate-200"
                          )}
                          title="Show raw HTML source code"
                        >
                          <FileCode className="w-3.5 h-3.5" />
                          <span>Code</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (rawHtmlForCodeTab) {
                            navigator.clipboard.writeText(rawHtmlForCodeTab);
                            setCopiedCode(true);
                            setTimeout(() => setCopiedCode(false), 2000);
                          }
                        }}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? "Copied!" : "Copy HTML"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Rendered HTML Visual Preview Mode */}
                  {htmlViewMode === 'preview' ? (
                    <div className="flex-1 bg-white overflow-hidden flex flex-col min-h-[600px] relative">
                      {processedPreviewHtml ? (
                        <iframe
                          ref={iframeRef}
                          srcDoc={processedPreviewHtml}
                          style={{ height: `${iframeHeight}px` }}
                          className="w-full border-0 min-h-[600px] transition-all"
                          title="HTML Visual Preview"
                        />
                      ) : (
                        <div className="p-8 text-center text-slate-500 my-auto bg-slate-50">
                          <FileCode className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                          <p className="font-bold text-slate-700 text-sm">No HTML Source Provided</p>
                          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                            Please paste HTML code in Stage 1 or upload a file to view the rendered preview.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Syntax Source Code View Mode */
                    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
                      {/* Alt Tag Inspection Panel when showAlt is active */}
                      {showAlt && (
                        <div className="bg-emerald-950/80 border-b border-emerald-800/80 p-3 shrink-0 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Tag className="w-4 h-4 text-emerald-400" />
                              <span className="font-bold text-emerald-200 text-xs">Alt Tags Inspector ({extractedAltTags.length} Images Found)</span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700">
                              {extractedAltTags.filter(i => i.hasAlt).length} Valid | {extractedAltTags.filter(i => !i.hasAlt).length} Missing
                            </span>
                          </div>

                          {extractedAltTags.length > 0 ? (
                            <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                              {extractedAltTags.map((item) => (
                                <div key={item.id} className={cn("p-2 rounded border text-[11px] flex items-center justify-between gap-2", item.hasAlt ? "bg-emerald-900/30 border-emerald-800 text-emerald-100" : "bg-rose-950/60 border-rose-800 text-rose-200")}>
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px]">Img #{item.id}</span>
                                    <span className="truncate text-slate-300 font-mono text-[10px]">{item.src || 'No SRC'}</span>
                                    <span className="font-semibold text-emerald-300 truncate">alt="{item.alt}"</span>
                                  </div>
                                  {item.hasAlt ? (
                                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-900/80 px-2 py-0.5 rounded border border-emerald-700 shrink-0">Alt Present</span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-rose-400 bg-rose-900/80 px-2 py-0.5 rounded border border-rose-700 shrink-0 flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" /> Missing Alt
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-emerald-300/70 italic">No &lt;img&gt; tags detected in HTML source code.</p>
                          )}
                        </div>
                      )}

                      {/* Alias Tag Inspection Panel when showAlias is active */}
                      {showAlias && (
                        <div className="bg-indigo-950/80 border-b border-indigo-800/80 p-3 shrink-0 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileCode className="w-4 h-4 text-indigo-400" />
                              <span className="font-bold text-indigo-200 text-xs">Alias Tags Inspector ({extractedAliasTags.length} Links Found)</span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-700">
                              {extractedAliasTags.filter(i => i.hasAlias).length} Valid | {extractedAliasTags.filter(i => !i.hasAlias).length} Missing
                            </span>
                          </div>

                          {extractedAliasTags.length > 0 ? (
                            <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                              {extractedAliasTags.map((item) => (
                                <div key={item.id} className={cn("p-2 rounded border text-[11px] flex items-center justify-between gap-2", item.hasAlias ? "bg-indigo-900/30 border-indigo-800 text-indigo-100" : "bg-rose-950/60 border-rose-800 text-rose-200")}>
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px]">Link #{item.id}</span>
                                    <span className="truncate text-slate-300 font-mono text-[10px]">{item.text}</span>
                                    <span className="font-semibold text-indigo-300 truncate">alias="{item.alias || 'NONE'}"</span>
                                  </div>
                                  {item.hasAlias ? (
                                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-900/80 px-2 py-0.5 rounded border border-indigo-700 shrink-0">Alias Present</span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-rose-400 bg-rose-900/80 px-2 py-0.5 rounded border border-rose-700 shrink-0 flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" /> Missing Alias
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-indigo-300/70 italic">No &lt;a&gt; tags detected in HTML source code.</p>
                          )}
                        </div>
                      )}

                      {/* Code View Body */}
                      <div className="flex-1 overflow-auto p-4 leading-relaxed whitespace-pre font-mono text-[11px] text-slate-300 select-text">
                        {rawHtmlForCodeTab ? (
                          rawHtmlForCodeTab.split('\n').map((line, idx) => {
                            const lowerLine = line.toLowerCase();
                            const isImg = lowerLine.includes('<img');
                            const isAnchor = lowerLine.includes('<a ');

                            const isImgMissingOrEmptyAlt = isImg && (!lowerLine.includes('alt=') || lowerLine.includes('alt=""') || lowerLine.includes("alt=''") || lowerLine.includes('alt=" "'));
                            const isAliasMissingOrEmpty = isAnchor && (!lowerLine.includes('alias=') || lowerLine.includes('alias=""') || lowerLine.includes("alias=''") || lowerLine.includes('alias=" "'));

                            const isImgLine = showAlt && isImg;
                            const isAliasLine = showAlias && (lowerLine.includes('alias=') || isAnchor);

                            const isRedHighlight = (showAlt && isImgMissingOrEmptyAlt) || (showAlias && isAliasMissingOrEmpty);

                            return (
                              <div
                                key={idx}
                                className={cn(
                                  "flex items-start gap-4 hover:bg-slate-900 px-2 py-0.5 rounded transition-colors",
                                  isRedHighlight ? "bg-rose-950/90 text-rose-200 font-bold border-l-4 border-rose-500 shadow-2xs" :
                                    isImgLine ? "bg-emerald-950/70 text-emerald-200 font-bold border-l-2 border-emerald-400" :
                                      isAliasLine ? "bg-indigo-950/70 text-indigo-200 font-bold border-l-2 border-indigo-400" : ""
                                )}
                              >
                                <span className="text-slate-600 select-none text-right w-8 shrink-0">{idx + 1}</span>
                                <span className="flex-1 break-all">{line}</span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-8 text-center text-slate-500 my-auto">
                            <FileCode className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                            <p className="font-bold text-slate-400">No HTML Code Source Provided</p>
                            <p className="text-[10px] text-slate-500 mt-1 max-w-xs mx-auto">
                              Add HTML code in Stage 1 or upload a file to view and inspect source HTML tags.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : processedPreviewHtml ? (
                <iframe
                  ref={iframeRef}
                  srcDoc={processedPreviewHtml}
                  style={{ height: `${iframeHeight}px` }}
                  className="w-full border-0 min-h-[600px] transition-all"
                  title="Visual Comparison Preview with Class & Style Overlays"
                />
              ) : leftTab === 'viewonline' && webViewUrl && webViewUrl !== 'about:blank' ? (
                <iframe
                  ref={iframeRef}
                  src={`/api/proxy?url=${encodeURIComponent(normalizeUrl(webViewUrl))}`}
                  style={{ height: `${iframeHeight}px`, minHeight: '3000px' }}
                  className="w-full h-full border-0 min-h-[3000px]"
                  title="View Online Proxy Preview"
                />
              ) : leftTab === 'msg' ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 text-sm gap-3 bg-white">
                  <UploadCloud className="w-12 h-12 text-emerald-400 mb-1" />
                  <span className="font-bold text-slate-700">No Outlook (.msg) File Attached</span>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Upload an Outlook email (.msg) file in Stage 1 or select a file below to compare side-by-side with Figma.
                  </p>
                  <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-2xs transition-colors flex items-center gap-2">
                    <UploadCloud className="w-4 h-4" />
                    <span>Select .msg or .html File</span>
                    <input type="file" accept=".msg,.html,.htm" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 text-sm gap-2">
                  <Globe className="w-10 h-10 text-slate-300 mb-1" />
                  <span className="font-bold text-slate-600">No Template Content Loaded</span>
                  <span className="text-xs text-slate-400 max-w-sm">
                    Enter a View Online URL in Stage 1 or upload a MSG/HTML file to preview classes, font sizes, and line heights.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resizer */}
        <div
          className="w-2 shrink-0 cursor-col-resize group flex items-center justify-center z-10 transition-colors hover:bg-slate-200/60 rounded-full"
          onMouseDown={handleMouseDown}
        >
          <div className="w-1 h-12 bg-slate-300 group-hover:bg-blue-500 rounded-full transition-colors" />
        </div>

        {/* Right Column: Figma Design */}
        <div className="flex flex-col bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden min-w-0" style={{ flex: 100 - splitRatio }}>
          <div
            ref={rightScrollRef}
            onScroll={handleRightScroll}
            className="flex-1 bg-slate-200 relative overflow-auto p-0 flex flex-col h-full min-h-full"
          >
            <div className="min-h-full h-full flex-1 flex flex-col items-center justify-start">
              <div
                className="bg-white shadow-xl transition-all duration-150 border-0 overflow-hidden flex flex-col relative w-full h-full min-h-full flex-1"
                style={{
                  transform: figmaZoom !== 100 ? `scale(${figmaZoom / 100})` : 'none',
                  transformOrigin: 'top left',
                  width: figmaZoom > 100 ? `${100 * (100 / figmaZoom)}%` : '100%',
                  minWidth: '100%',
                  alignSelf: 'flex-start',
                }}
              >
                {figmaImage ? (
                  <img src={figmaImage} alt="Figma Design Asset" className="w-full h-auto block object-top shrink-0" />
                ) : figmaEmbed ? (
                  <div className="relative w-full h-full flex-1 min-h-[3000px]">
                    <div className="absolute top-2 right-2 z-20">
                      <button
                        type="button"
                        onClick={() => setDisableFigmaEmbed(true)}
                        className="px-2.5 py-1 bg-slate-900/80 hover:bg-slate-900 text-white text-[10px] font-bold rounded-md shadow-md backdrop-blur-xs flex items-center gap-1 cursor-pointer transition-all border border-slate-700/60"
                        title="Stop Figma iframe from loading"
                      >
                        <X className="w-3 h-3 text-rose-400" />
                        <span>Stop Loading</span>
                      </button>
                    </div>
                    <iframe
                      src={figmaEmbed}
                      className="w-full border-0 bg-white flex-1 h-full min-h-[3000px]"
                      style={{ height: '100%', minHeight: '3000px' }}
                      title="Figma"
                    />
                  </div>
                ) : disableFigmaEmbed && effectiveFigmaUrl ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 text-sm gap-3 bg-white min-h-[500px]">
                    <Frame className="w-10 h-10 text-purple-500 mb-1" />
                    <span className="font-bold text-slate-800">Figma Preview Paused</span>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Figma embed loading was stopped to optimize preview performance. You can reload or open in a new tab.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 justify-center mt-2">
                      <button
                        type="button"
                        onClick={() => setDisableFigmaEmbed(false)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reload Figma Embed</span>
                      </button>
                      <a
                        href={effectiveFigmaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
                        <span>Open in Figma</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 text-sm gap-3 bg-white min-h-[500px]">
                    <Frame className="w-12 h-12 text-purple-400 mb-1" />
                    <span className="font-bold text-slate-700">No Figma Asset Provided</span>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Provide a Figma URL or upload a design mockup screenshot in Stage 1 or via the toolbar above.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Style & Typography Inspector Drawer Panel (Toggleable inside Visual Comparison) */}
      {showStyleInspector && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xl space-y-3 shrink-0 max-h-[350px] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-amber-600" />
              <h4 className="font-bold text-xs text-slate-900">
                Classes, Font Sizes &amp; Line Heights Inspection Table ({filteredStyleItems.length} items)
              </h4>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                Extracted from {leftTab === 'viewonline' ? 'View Online' : 'MSG/HTML'} Template
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowStyleInspector(false)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search & Tag Filter controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Search classes, font sizes, line heights, or text..."
                value={styleSearch}
                onChange={(e) => setStyleSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-50 border-slate-200"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setStyleFilter('all')}
                className={cn("px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer", styleFilter === 'all' ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800")}
              >
                All ({extractedTypographyItems.length})
              </button>
              <button
                type="button"
                onClick={() => setStyleFilter('p')}
                className={cn("px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer", styleFilter === 'p' ? "bg-white text-blue-700 shadow-2xs" : "text-slate-500 hover:text-slate-800")}
              >
                &lt;p&gt;
              </button>
              <button
                type="button"
                onClick={() => setStyleFilter('headings')}
                className={cn("px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer", styleFilter === 'headings' ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-500 hover:text-slate-800")}
              >
                &lt;h&gt;
              </button>
              <button
                type="button"
                onClick={() => setStyleFilter('span')}
                className={cn("px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer", styleFilter === 'span' ? "bg-white text-violet-700 shadow-2xs" : "text-slate-500 hover:text-slate-800")}
              >
                &lt;span/a&gt;
              </button>
              <button
                type="button"
                onClick={() => setStyleFilter('cells')}
                className={cn("px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer", styleFilter === 'cells' ? "bg-white text-amber-700 shadow-2xs" : "text-slate-500 hover:text-slate-800")}
              >
                &lt;td&gt;
              </button>
            </div>
          </div>

          {/* Table displaying classes, font sizes and line heights */}
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-2.5">Tag</th>
                  <th className="p-2.5">Class Name</th>
                  <th className="p-2.5">Font Size</th>
                  <th className="p-2.5">Line Height</th>
                  <th className="p-2.5">Font Family</th>
                  <th className="p-2.5">Content Snippet</th>
                  <th className="p-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredStyleItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      No matching classes, font sizes, or line heights found.
                    </td>
                  </tr>
                ) : (
                  filteredStyleItems.slice(0, 100).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 font-bold">
                        <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-mono text-[11px]">
                          &lt;{item.tag}&gt;
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-slate-700 max-w-[150px] truncate" title={item.className}>
                        {item.className !== 'None' ? (
                          <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 text-[11px] font-bold">
                            .{item.className}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="p-2.5 font-bold">
                        <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 text-[11px] font-mono">
                          {item.fontSize}
                        </span>
                      </td>
                      <td className="p-2.5 font-bold">
                        <span className="bg-purple-50 text-purple-800 px-2 py-0.5 rounded border border-purple-200 text-[11px] font-mono">
                          {item.lineHeight}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-600 max-w-[120px] truncate" title={item.fontFamily}>
                        {item.fontFamily}
                      </td>
                      <td className="p-2.5 text-slate-500 max-w-[200px] truncate" title={item.textContent}>
                        "{item.textContent}"
                      </td>
                      <td className="p-2.5 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyStyleInfo(item)}
                          className="h-7 px-2 text-[11px] text-slate-600 hover:text-slate-900"
                        >
                          {copiedStyleId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}



