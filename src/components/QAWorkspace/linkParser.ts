import { ExtractedLink } from './types';

// Common HP Country Locale mapping table
export const HP_COUNTRY_LOCALES: Record<string, { codes: string[]; label: string; defaultPattern: string }> = {
  "australia": { codes: ["au", "au-en"], label: "Australia", defaultPattern: "hp.com/au-en" },
  "au": { codes: ["au", "au-en"], label: "Australia", defaultPattern: "hp.com/au-en" },
  "new zealand": { codes: ["nz", "nz-en"], label: "New Zealand", defaultPattern: "hp.com/nz-en" },
  "nz": { codes: ["nz", "nz-en"], label: "New Zealand", defaultPattern: "hp.com/nz-en" },
  "india": { codes: ["in", "in-en"], label: "India", defaultPattern: "hp.com/in-en" },
  "in": { codes: ["in", "in-en"], label: "India", defaultPattern: "hp.com/in-en" },
  "singapore": { codes: ["sg", "sg-en"], label: "Singapore", defaultPattern: "hp.com/sg-en" },
  "sg": { codes: ["sg", "sg-en"], label: "Singapore", defaultPattern: "hp.com/sg-en" },
  "malaysia": { codes: ["my", "my-en"], label: "Malaysia", defaultPattern: "hp.com/my-en" },
  "my": { codes: ["my", "my-en"], label: "Malaysia", defaultPattern: "hp.com/my-en" },
  "indonesia": { codes: ["id", "id-en", "id-id"], label: "Indonesia", defaultPattern: "hp.com/id-en" },
  "id": { codes: ["id", "id-en", "id-id"], label: "Indonesia", defaultPattern: "hp.com/id-en" },
  "philippines": { codes: ["ph", "ph-en"], label: "Philippines", defaultPattern: "hp.com/ph-en" },
  "ph": { codes: ["ph", "ph-en"], label: "Philippines", defaultPattern: "hp.com/ph-en" },
  "thailand": { codes: ["th", "th-en", "th-th"], label: "Thailand", defaultPattern: "hp.com/th-en" },
  "th": { codes: ["th", "th-en", "th-th"], label: "Thailand", defaultPattern: "hp.com/th-en" },
  "vietnam": { codes: ["vn", "vn-en", "vn-vi"], label: "Vietnam", defaultPattern: "hp.com/vn-en" },
  "vn": { codes: ["vn", "vn-en", "vn-vi"], label: "Vietnam", defaultPattern: "hp.com/vn-en" },
  "hong kong": { codes: ["hk", "hk-en", "hk-zh"], label: "Hong Kong", defaultPattern: "hp.com/hk-en" },
  "hk": { codes: ["hk", "hk-en", "hk-zh"], label: "Hong Kong", defaultPattern: "hp.com/hk-en" },
  "taiwan": { codes: ["tw", "tw-zh"], label: "Taiwan", defaultPattern: "hp.com/tw-zh" },
  "tw": { codes: ["tw", "tw-zh"], label: "Taiwan", defaultPattern: "hp.com/tw-zh" },
  "japan": { codes: ["jp", "jp-ja"], label: "Japan", defaultPattern: "hp.com/jp-ja" },
  "jp": { codes: ["jp", "jp-ja"], label: "Japan", defaultPattern: "hp.com/jp-ja" },
  "korea": { codes: ["kr", "kr-ko"], label: "Korea", defaultPattern: "hp.com/kr-ko" },
  "kr": { codes: ["kr", "kr-ko"], label: "Korea", defaultPattern: "hp.com/kr-ko" },
  "united states": { codes: ["us", "us-en"], label: "United States", defaultPattern: "hp.com/us-en" },
  "us": { codes: ["us", "us-en"], label: "United States", defaultPattern: "hp.com/us-en" },
  "united kingdom": { codes: ["uk", "uk-en", "gb-en"], label: "United Kingdom", defaultPattern: "hp.com/uk-en" },
  "uk": { codes: ["uk", "uk-en", "gb-en"], label: "United Kingdom", defaultPattern: "hp.com/uk-en" }
};

export function evaluateCountryMatch(
  url: string,
  selectedCountry?: string,
  versionName?: string,
  allowedPattern?: string | null
): { countryMismatch: boolean; countryMatchStatus: "match" | "mismatch" | "neutral"; countryMismatchReason?: string } {
  if (!url || !selectedCountry) {
    return { countryMismatch: false, countryMatchStatus: "neutral" };
  }

  const lowerUrl = url.toLowerCase();

  // Social media or third-party links are neutral
  if (
    lowerUrl.includes("facebook.com") ||
    lowerUrl.includes("twitter.com") ||
    lowerUrl.includes("x.com") ||
    lowerUrl.includes("instagram.com") ||
    lowerUrl.includes("linkedin.com") ||
    lowerUrl.includes("youtube.com") ||
    lowerUrl.includes("whatsapp.com")
  ) {
    return { countryMismatch: false, countryMatchStatus: "neutral" };
  }

  const countryKey = selectedCountry.trim().toLowerCase();
  const localeInfo = HP_COUNTRY_LOCALES[countryKey];

  // If we have an allowedPattern from DB/settings
  if (allowedPattern) {
    const cleanPattern = allowedPattern.toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (lowerUrl.includes(cleanPattern)) {
      return { countryMismatch: false, countryMatchStatus: "match" };
    }
  }

  // Check against known HP country locales
  if (localeInfo) {
    const isHpUrl = lowerUrl.includes("hp.com") || lowerUrl.includes("hp.io") || lowerUrl.includes("hp.cz");
    if (!isHpUrl) {
      return { countryMismatch: false, countryMatchStatus: "neutral" };
    }

    const matchesExpected = localeInfo.codes.some(code => 
      lowerUrl.includes(`/${code}/`) || 
      lowerUrl.includes(`/${code}-`) || 
      lowerUrl.includes(`/${code}?`) ||
      lowerUrl.endsWith(`/${code}`) ||
      lowerUrl.includes(`.${code}/`)
    );

    if (matchesExpected) {
      return { countryMismatch: false, countryMatchStatus: "match" };
    }

    // Check if it belongs to another known country (e.g. US or IN instead of AU)
    for (const [otherKey, otherInfo] of Object.entries(HP_COUNTRY_LOCALES)) {
      if (otherKey === countryKey || otherInfo.label === localeInfo.label) continue;
      const detectedOther = otherInfo.codes.find(code => 
        lowerUrl.includes(`/${code}/`) || 
        lowerUrl.includes(`/${code}-`)
      );
      if (detectedOther) {
        return {
          countryMismatch: true,
          countryMatchStatus: "mismatch",
          countryMismatchReason: `Points to ${otherInfo.label} (/${detectedOther}/) instead of ${localeInfo.label}`
        };
      }
    }

    // HP URL that does not match expected locale
    return {
      countryMismatch: true,
      countryMatchStatus: "mismatch",
      countryMismatchReason: `Missing required ${localeInfo.label} locale prefix (e.g. ${localeInfo.defaultPattern})`
    };
  }

  return { countryMismatch: false, countryMatchStatus: "neutral" };
}

export function extractTrackingParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  try {
    const parsedUrl = new URL(url, 'https://dummy.com');
    parsedUrl.searchParams.forEach((value, key) => {
      params[key] = value;
    });
  } catch (e) {
    // Fallback manual regex
    const regex = /[?&]([^=#]+)=([^&#]*)/g;
    let match;
    while ((match = regex.exec(url)) !== null) {
      params[decodeURIComponent(match[1])] = decodeURIComponent(match[2]);
    }
  }
  return params;
}

export function extractUtmParams(url: string): Record<string, string> {
  const allParams = extractTrackingParams(url);
  const utm: Record<string, string> = {};
  for (const [k, v] of Object.entries(allParams)) {
    if (k.toLowerCase().startsWith('utm_') || k.toLowerCase() === 'jumpid' || k.toLowerCase().startsWith('et_') || k.toLowerCase().includes('track')) {
      utm[k] = v;
    }
  }
  return utm;
}

function findNearestImage(a: Element): string | null {
  // 1. Direct <img> child
  const directImg = a.querySelector('img');
  if (directImg?.getAttribute('src')) {
    return directImg.getAttribute('src') || directImg.getAttribute('data-src') || null;
  }

  // 2. Nearest parent container (td, tr, div, li, table)
  let parent = a.parentElement;
  for (let i = 0; i < 4 && parent; i++) {
    const parentImg = parent.querySelector('img');
    if (parentImg?.getAttribute('src')) {
      return parentImg.getAttribute('src') || parentImg.getAttribute('data-src') || null;
    }
    parent = parent.parentElement;
  }

  return null;
}

function guessModuleName(a: HTMLAnchorElement, index: number, href: string, text: string, alt: string): string {
  const lowerHref = href.toLowerCase();
  const lowerText = text.toLowerCase();
  const lowerAlt = alt.toLowerCase();

  if (lowerHref.includes('facebook') || lowerHref.includes('linkedin') || lowerHref.includes('twitter') || lowerHref.includes('instagram') || lowerHref.includes('youtube')) {
    return 'Social Icon';
  }
  if (lowerHref.includes('privacy')) return 'Footer Privacy';
  if (lowerHref.includes('terms') || lowerHref.includes('conditions')) return 'Footer Terms';
  if (lowerHref.includes('contact') || lowerHref.includes('support')) return 'Support / Contact';
  if (lowerHref.includes('unsubscribe') || lowerHref.includes('opt-out') || lowerHref.includes('optout')) return 'Footer Unsubscribe';
  
  if (lowerAlt.includes('hero') || lowerText.includes('hero') || index === 0) return 'Hero Banner';
  if (lowerText.includes('shop') || lowerText.includes('buy') || lowerText.includes('learn more') || lowerText.includes('order') || lowerText.includes('explore')) return 'CTA Button';
  if (lowerHref.includes('product') || lowerAlt.includes('product') || lowerHref.includes('/p/')) return 'Product Tile';
  if (lowerAlt.includes('logo') || lowerHref.includes('hp.com') && index <= 1) return 'Header Logo';

  return `Module ${index + 1}`;
}

export function extractLinksFromHtml(
  html: string,
  country?: string,
  versionName?: string,
  allowedPattern?: string | null
): ExtractedLink[] {
  if (!html) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const anchors = Array.from(doc.querySelectorAll('a'));
  
  const extracted: ExtractedLink[] = [];
  
  anchors.forEach((a, index) => {
    const href = a.getAttribute('href') || '';
    if (!href || href.startsWith('#') || href.startsWith('mailto:')) return;

    const imgs = Array.from(a.querySelectorAll('img'));
    const imageUrl = findNearestImage(a);
    const alts = imgs.map(img => img.getAttribute('alt')).filter(altVal => altVal !== null && altVal !== '');
    const alt = alts.length > 0 ? alts.join(' | ') : (a.getAttribute('title') || '');
    const linkText = a.textContent?.trim() || '';
    const visibleText = linkText || alt || (a.getAttribute('aria-label') || '');
    const alias = a.getAttribute('alias') || a.getAttribute('data-alias') || '';
    const title = a.getAttribute('title') || '';
    
    const tracking = extractTrackingParams(href);
    const utmParams = extractUtmParams(href);
    const moduleName = guessModuleName(a, index, href, linkText, alt);

    const matchInfo = evaluateCountryMatch(href, country, versionName, allowedPattern);

    extracted.push({
      id: `link-${index}-${href.substring(0, 20).replace(/[^a-z0-9]/gi, '')}`,
      moduleName,
      linkText,
      href,
      alt,
      alias,
      title,
      tracking,
      utmParams,
      modulePosition: index,
      imageUrl,
      buttonText: linkText,
      visibleText,
      status: "unchecked",
      countryMismatch: matchInfo.countryMismatch,
      countryMatchStatus: matchInfo.countryMatchStatus,
      countryMismatchReason: matchInfo.countryMismatchReason,
    });
  });

  return extracted;
}

export function extractLinksMerged(
  codeHtml: string, 
  viewOnlineHtml: string,
  country?: string,
  versionName?: string,
  allowedPattern?: string | null
): ExtractedLink[] {
  const parser = new DOMParser();
  const codeDoc = parser.parseFromString(codeHtml || '', 'text/html');
  const viewDoc = parser.parseFromString(viewOnlineHtml || '', 'text/html');

  const codeAnchors = Array.from(codeDoc.querySelectorAll('a')).filter(a => {
    const href = a.getAttribute('href') || '';
    return href && !href.startsWith('#') && !href.startsWith('mailto:');
  });

  const viewAnchors = Array.from(viewDoc.querySelectorAll('a')).filter(a => {
    const href = a.getAttribute('href') || '';
    return href && !href.startsWith('#') && !href.startsWith('mailto:');
  });

  // If viewOnlineHtml didn't produce anchors (e.g. not provided or proxy failure), fall back directly to code anchors!
  if (viewAnchors.length === 0) {
    return extractLinksFromHtml(codeHtml, country, versionName, allowedPattern);
  }

  const extracted: ExtractedLink[] = [];
  const processedHrefs = new Set<string>();

  // Process viewOnline anchors first (they have the resolved final link mirrors)
  viewAnchors.forEach((viewA, index) => {
    const codeA = codeAnchors[index] || codeAnchors.find(ca => ca.getAttribute('href') === viewA.getAttribute('href'));

    const href = viewA.getAttribute('href') || '';
    if (!href) return;
    processedHrefs.add(href);

    const imageUrl = findNearestImage(viewA) || (codeA ? findNearestImage(codeA) : null);
    
    const codeImgs = codeA ? Array.from(codeA.querySelectorAll('img')) : [];
    const viewImgs = Array.from(viewA.querySelectorAll('img'));
    
    const codeAlts = codeImgs.map(img => img.getAttribute('alt')).filter(Boolean);
    const viewAlts = viewImgs.map(img => img.getAttribute('alt')).filter(Boolean);
    
    const alt = codeAlts.join(' | ') || viewAlts.join(' | ') || (codeA?.getAttribute('title') || viewA.getAttribute('title') || '');
    const linkText = viewA.textContent?.trim() || (codeA?.textContent?.trim() || '');
    const visibleText = linkText || alt || viewA.getAttribute('aria-label') || '';
    const alias = (codeA ? (codeA.getAttribute('alias') || codeA.getAttribute('data-alias') || '') : '') || (viewA.getAttribute('alias') || viewA.getAttribute('data-alias') || '');
    const title = viewA.getAttribute('title') || (codeA ? codeA.getAttribute('title') || '' : '');
    
    const tracking = extractTrackingParams(href);
    const utmParams = extractUtmParams(href);
    const moduleName = guessModuleName(viewA, index, href, linkText, alt);

    const matchInfo = evaluateCountryMatch(href, country, versionName, allowedPattern);

    extracted.push({
      id: `link-${index}-${href.substring(0, 20).replace(/[^a-z0-9]/gi, '')}`,
      moduleName,
      linkText,
      href,
      alt,
      alias,
      title,
      tracking,
      utmParams,
      modulePosition: index,
      imageUrl,
      buttonText: linkText,
      visibleText,
      status: "unchecked",
      countryMismatch: matchInfo.countryMismatch,
      countryMatchStatus: matchInfo.countryMatchStatus,
      countryMismatchReason: matchInfo.countryMismatchReason,
    });
  });

  // Also include any anchors from codeHtml that weren't represented in viewAnchors
  codeAnchors.forEach((codeA, idx) => {
    const codeHref = codeA.getAttribute('href') || '';
    if (!codeHref || processedHrefs.has(codeHref)) return;
    processedHrefs.add(codeHref);

    const imageUrl = findNearestImage(codeA);
    const imgs = Array.from(codeA.querySelectorAll('img'));
    const alts = imgs.map(img => img.getAttribute('alt')).filter(Boolean);
    const alt = alts.join(' | ') || codeA.getAttribute('title') || '';
    const linkText = codeA.textContent?.trim() || '';
    const visibleText = linkText || alt || codeA.getAttribute('aria-label') || '';
    const alias = codeA.getAttribute('alias') || codeA.getAttribute('data-alias') || '';
    const title = codeA.getAttribute('title') || '';

    const tracking = extractTrackingParams(codeHref);
    const utmParams = extractUtmParams(codeHref);
    const moduleName = guessModuleName(codeA, extracted.length, codeHref, linkText, alt);
    const matchInfo = evaluateCountryMatch(codeHref, country, versionName, allowedPattern);

    extracted.push({
      id: `code-link-${idx}-${codeHref.substring(0, 20).replace(/[^a-z0-9]/gi, '')}`,
      moduleName,
      linkText,
      href: codeHref,
      alt,
      alias,
      title,
      tracking,
      utmParams,
      modulePosition: extracted.length,
      imageUrl,
      buttonText: linkText,
      visibleText,
      status: "unchecked",
      countryMismatch: matchInfo.countryMismatch,
      countryMatchStatus: matchInfo.countryMatchStatus,
      countryMismatchReason: matchInfo.countryMismatchReason,
    });
  });

  return extracted;
}


export interface ExtractedTag {
  id: string;
  type: 'alias' | 'alt';
  value: string;
  elementHtml: string;
  isDuplicate: boolean;
}

export function extractTagsFromHtml(html: string): ExtractedTag[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tags: ExtractedTag[] = [];
  
  const anchors = doc.querySelectorAll('a');
  const aliasValues = new Set<string>();
  const duplicateAliases = new Set<string>();
  
  anchors.forEach((a) => {
    const alias = a.getAttribute('alias') || a.getAttribute('data-alias');
    if (alias) {
      if (aliasValues.has(alias)) {
        duplicateAliases.add(alias);
      }
      aliasValues.add(alias);
      tags.push({
        id: `alias-${Math.random().toString(36).substr(2, 9)}`,
        type: 'alias',
        value: alias,
        elementHtml: a.outerHTML.substring(0, 150) + (a.outerHTML.length > 150 ? '...' : ''),
        isDuplicate: false,
      });
    }
  });
  
  const images = doc.querySelectorAll('img');
  images.forEach((img) => {
    const alt = img.getAttribute('alt');
    if (alt !== null) {
      tags.push({
        id: `alt-${Math.random().toString(36).substr(2, 9)}`,
        type: 'alt',
        value: alt,
        elementHtml: img.outerHTML.substring(0, 150) + (img.outerHTML.length > 150 ? '...' : ''),
        isDuplicate: false,
      });
    }
  });
  
  tags.forEach(tag => {
    if (tag.type === 'alias' && duplicateAliases.has(tag.value)) {
      tag.isDuplicate = true;
    }
  });
  
  return tags;
}
