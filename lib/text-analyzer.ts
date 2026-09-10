export interface TextIssue {
  id: string;
  type: 'spelling' | 'grammar' | 'widow' | 'brand' | 'formatting';
  severity: 'error' | 'warning' | 'info';
  message: string;
  context: string;
  word: string;
  suggestions?: string[];
  lineNumber?: number;
}

export interface TextAnalysisResult {
  totalWords: number;
  issues: TextIssue[];
  widowWordsCount: number;
  spellingErrorsCount: number;
  brandInconsistenciesCount: number;
}

// Common marketing typos & brand vocabulary rules
const DICTIONARY_REPLACEMENTS: Record<string, string[]> = {
  recieve: ['receive'],
  teh: ['the'],
  seperate: ['separate'],
  untill: ['until'],
  occurred: ['occurred'],
  "offer's": ['offers', "offer's"],
  clik: ['click'],
  discounts: ['discounts'],
  promtion: ['promotion'],
  guaranteee: ['guarantee'],
  subscribtion: ['subscription'],
  unsubcribe: ['unsubscribe'],
};

// Brand dictionary rules
const BRAND_RULES: { pattern: RegExp; correction: string; reason: string }[] = [
  { pattern: /\bhp\b(?![-_])/gi, correction: 'HP', reason: 'Brand name "HP" must always be uppercase.' },
  { pattern: /\bedm\b/gi, correction: 'eDM', reason: 'Email Direct Mail should be capitalized as "eDM".' },
  { pattern: /\bsfmc\b/gi, correction: 'SFMC', reason: 'Salesforce Marketing Cloud should be "SFMC".' },
  { pattern: /\bintel\b/gi, correction: 'Intel', reason: 'Brand name "Intel" should be capitalized.' },
  { pattern: /\bryzen\b/gi, correction: 'Ryzen', reason: 'Brand name "Ryzen" should be capitalized.' },
  { pattern: /\bwindows\b/gi, correction: 'Windows', reason: 'Product name "Windows" should be capitalized.' },
];

/**
 * Strips HTML tags and extracts clean formatted plain text for email textareas
 */
export function extractPlainText(html: string): string {
  if (!html) return '';
  let cleanHtml = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  const parser = new DOMParser();
  const doc = parser.parseFromString(cleanHtml, 'text/html');
  let text = doc.body.textContent || doc.body.innerText || '';
  
  // Normalize whitespace & linebreaks cleanly
  text = text
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .filter(line => line.length > 0)
    .join('\n\n');

  return text.trim();
}

/**
 * Strips HTML tags and extracts plain text blocks with line context
 */
export function extractTextBlocks(html: string): { text: string; rawBlocks: string[] } {
  if (!html) return { text: '', rawBlocks: [] };

  // If html is already plain text, return it directly
  if (!html.includes('<') && !html.includes('>')) {
    const lines = html.split('\n').filter(Boolean);
    return { text: html, rawBlocks: lines };
  }

  const cleanHtml = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');

  const parser = new DOMParser();
  const doc = parser.parseFromString(cleanHtml, 'text/html');
  const bodyText = doc.body.textContent || doc.body.innerText || '';

  const blockElements = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, td, div, span, a, li');
  const rawBlocks: string[] = [];

  blockElements.forEach((el) => {
    if (el.children.length === 0 || Array.from(el.children).every(c => ['span', 'a', 'b', 'strong', 'i', 'sup', 'sub'].includes(c.tagName.toLowerCase()))) {
      const txt = (el.textContent || '').trim();
      if (txt.length > 2 && !rawBlocks.includes(txt)) {
        rawBlocks.push(txt);
      }
    }
  });

  return { text: bodyText, rawBlocks };
}

/**
 * Analyzes English text for spelling typos, widow words, brand consistency, and grammar
 */
export async function analyzeEnglishText(inputText: string): Promise<TextAnalysisResult> {
  const isHtml = inputText.includes('<') && inputText.includes('>');
  const text = isHtml ? extractPlainText(inputText) : inputText;
  const { rawBlocks } = extractTextBlocks(inputText);
  const issues: TextIssue[] = [];

  if (!text.trim()) {
    return {
      totalWords: 0,
      issues: [],
      widowWordsCount: 0,
      spellingErrorsCount: 0,
      brandInconsistenciesCount: 0,
    };
  }

  const words = text.match(/\b[A-Za-z0-9'-]+\b/g) || [];
  const totalWords = words.length;

  let widowWordsCount = 0;
  let spellingErrorsCount = 0;
  let brandInconsistenciesCount = 0;

  // 1. Consecutive spaces check
  const consecutiveSpacesRegex = /[a-zA-Z0-9.,!?]\s{2,}[a-zA-Z0-9]/g;
  let matchCS: RegExpExecArray | null;
  while ((matchCS = consecutiveSpacesRegex.exec(text)) !== null) {
    issues.push({
      id: `cs-${matchCS.index}`,
      type: 'grammar',
      severity: 'warning',
      message: 'It seems like there are too many consecutive spaces here.',
      context: text.substring(Math.max(0, matchCS.index - 10), Math.min(text.length, matchCS.index + 15)),
      word: '  ',
      suggestions: [' '],
    });
  }

  // 2. Missing hyphen check (e.g., Same Day Delivery -> Same-Day Delivery, High Quality -> High-Quality)
  const compoundHyphens = [
    { pattern: /\bSame Day Delivery\b/gi, suggestion: 'Same-Day Delivery' },
    { pattern: /\bReal Time\b/gi, suggestion: 'Real-Time' },
    { pattern: /\bHigh Quality\b/gi, suggestion: 'High-Quality' },
    { pattern: /\bLow Cost\b/gi, suggestion: 'Low-Cost' },
    { pattern: /\bBuilt In\b/gi, suggestion: 'Built-In' },
    { pattern: /\bAll In One\b/gi, suggestion: 'All-In-One' },
  ];
  compoundHyphens.forEach((ch, idx) => {
    let m: RegExpExecArray | null;
    while ((m = ch.pattern.exec(text)) !== null) {
      if (m[0] !== ch.suggestion) {
        issues.push({
          id: `hyphen-${idx}-${m.index}`,
          type: 'grammar',
          severity: 'warning',
          message: 'It appears that a hyphen is missing.',
          context: m[0],
          word: m[0],
          suggestions: [ch.suggestion],
        });
      }
    }
  });

  // 3. British English spelling checks
  const britishWords: Record<string, string> = {
    recognised: 'recognized',
    recognise: 'recognize',
    customise: 'customize',
    optimise: 'optimize',
    colour: 'color',
    favour: 'favor',
    honour: 'honor',
    centre: 'center',
    theatre: 'theater',
    organisation: 'organization',
    prioritise: 'prioritize',
  };
  words.forEach((w, idx) => {
    const lw = w.toLowerCase();
    if (britishWords[lw]) {
      spellingErrorsCount++;
      const sug = britishWords[lw];
      issues.push({
        id: `brit-${idx}-${w}`,
        type: 'spelling',
        severity: 'warning',
        message: `Possible spelling mistake. '${w}' is British English.`,
        context: w,
        word: w,
        suggestions: [w[0] === w[0].toUpperCase() ? sug[0].toUpperCase() + sug.slice(1) : sug],
      });
    }
  });

  // 4. Specific Platform & Brand Capitalization rules
  const brandCaps = [
    { pattern: /\byoutube\b/g, suggestion: 'YouTube', message: 'The official name of this popular video platform is spelled with a capital T.' },
    { pattern: /\bhp\b(?![-_])/gi, suggestion: 'HP', message: 'The brand name "HP" should be fully capitalized.' },
    { pattern: /\bsdn\b/g, suggestion: 'SDN', message: 'Possible spelling mistake found.' },
    { pattern: /\bbhd\b/g, suggestion: 'BHD', message: 'Possible spelling mistake found.' },
  ];
  brandCaps.forEach((bc, idx) => {
    let m: RegExpExecArray | null;
    while ((m = bc.pattern.exec(text)) !== null) {
      if (m[0] !== bc.suggestion) {
        brandInconsistenciesCount++;
        issues.push({
          id: `brandcap-${idx}-${m.index}`,
          type: 'brand',
          severity: 'info',
          message: bc.message,
          context: m[0],
          word: m[0],
          suggestions: [bc.suggestion],
        });
      }
    }
  });

  // 5. Dictionary typos
  words.forEach((word, idx) => {
    const lowerWord = word.toLowerCase();
    if (DICTIONARY_REPLACEMENTS[lowerWord]) {
      spellingErrorsCount++;
      const suggestions = DICTIONARY_REPLACEMENTS[lowerWord];
      issues.push({
        id: `spell-${idx}-${word}`,
        type: 'spelling',
        severity: 'error',
        message: `Possible spelling mistake found.`,
        context: word,
        word,
        suggestions,
      });
    }
  });

  // 6. Sentence spacing check (e.g., "word.Next")
  const missingSpacePunctuation = /([a-z0-9])([.!?])([A-Z])/g;
  let mPunct: RegExpExecArray | null;
  while ((mPunct = missingSpacePunctuation.exec(text)) !== null) {
    issues.push({
      id: `punct-${mPunct.index}`,
      type: 'grammar',
      severity: 'warning',
      message: 'Add a space between sentences.',
      context: mPunct[0],
      word: `${mPunct[1]}${mPunct[2]}`,
      suggestions: [`${mPunct[1]}${mPunct[2]} ${mPunct[3]}`],
    });
  }

  // 7. Try LanguageTool API for deep spell checking
  try {
    const truncatedText = text.substring(0, 3000);
    const params = new URLSearchParams({
      text: truncatedText,
      language: 'en-US',
    });

    const response = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    if (response.ok) {
      const data = await response.json();
      if (data.matches && Array.isArray(data.matches)) {
        data.matches.forEach((m: any, idx: number) => {
          if (m.rule && m.rule.category && m.rule.category.id !== 'TYPOGRAPHY') {
            const badWord = truncatedText.substring(m.offset, m.offset + m.length);
            const suggestions = (m.replacements || []).slice(0, 3).map((r: any) => r.value);

            if (!issues.some(i => i.word.toLowerCase() === badWord.toLowerCase())) {
              spellingErrorsCount++;
              issues.push({
                id: `lt-${idx}-${m.offset}`,
                type: 'spelling',
                severity: m.rule.issueType === 'misspelling' ? 'error' : 'warning',
                message: m.message || `Possible spelling mistake found.`,
                context: badWord,
                word: badWord,
                suggestions,
              });
            }
          }
        });
      }
    }
  } catch (err) {
    console.log('LanguageTool API check skipped or offline.');
  }

  return {
    totalWords,
    issues,
    widowWordsCount,
    spellingErrorsCount,
    brandInconsistenciesCount,
  };
}
