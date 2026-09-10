import MsgReader from "@kenjiuno/msgreader";
import { decompressRTF } from "@kenjiuno/decompressrtf";

export interface ParsedMsgResult {
  subject: string;
  htmlContent: string;
  isHtml: boolean;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  const chunkSize = 0x8000; // 32KB
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return typeof btoa !== "undefined" ? btoa(binary) : Buffer.from(bytes).toString("base64");
}

function getMimeTypeFromFileName(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop() || "";
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "webp":
      return "image/webp";
    case "bmp":
      return "image/bmp";
    default:
      return "image/png";
  }
}

export function unwrapSafelinks(text: string): string {
  if (!text) return text;
  return text.replace(/https:\/\/[a-zA-Z0-9-]+\.safelinks\.protection\.outlook\.com\/\?url=([^&\s<>"']+)[^\s<>"']*/gi, (match, encodedUrl) => {
    try {
      return decodeURIComponent(encodedUrl);
    } catch (e) {
      return match;
    }
  });
}

function unescapeRtf(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\'\s*([0-9a-fA-F]{2})/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch (e) {
        return _;
      }
    })
    .replace(/\\\\/g, "\\")
    .replace(/\\\{/g, "{")
    .replace(/\\\}/g, "}")
    .replace(/\\par\b/gi, "\n")
    .replace(/\\r\\n/g, "\n");
}

export function extractHtmlFromRtf(rtfStr: string): string | null {
  if (!rtfStr) return null;

  if (rtfStr.includes("\\fromhtml1") || rtfStr.includes("htmltag")) {
    const htmlTagRegex = /\{\\\*\\htmltag\d*\s*([\s\S]*?)\}/g;
    let match;
    let htmlParts: string[] = [];
    while ((match = htmlTagRegex.exec(rtfStr)) !== null) {
      if (match[1]) {
        htmlParts.push(unescapeRtf(match[1]));
      }
    }
    if (htmlParts.length > 0) {
      return htmlParts.join("");
    }
  }

  const unescaped = unescapeRtf(rtfStr);
  const htmlMatch = unescaped.match(/<html[\s\S]*?<\/html>/i) || unescaped.match(/<!DOCTYPE html[\s\S]*?<\/html>/i);
  if (htmlMatch) {
    return htmlMatch[0];
  }

  return null;
}

export function formatPlainTextToHtmlEmail(plainText: string): string {
  if (!plainText) return "";
  const cleaned = unwrapSafelinks(plainText);
  const lines = cleaned.split(/\r?\n/);

  let htmlBody = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 700px; margin: 20px auto; padding: 28px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); color: #1e293b; line-height: 1.6;">`;

  for (let line of lines) {
    let trimmed = line.trim();
    if (!trimmed) {
      htmlBody += `<div style="height: 12px;"></div>`;
      continue;
    }

    if (trimmed.toUpperCase().startsWith("EXTERNAL EMAIL")) {
      htmlBody += `<div style="background-color: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; margin-bottom: 16px;">${trimmed}</div>`;
      continue;
    }

    let processedLine = trimmed.replace(/<?(https?:\/\/[^\s>]+)>?/g, (m, url) => {
      return `<a href="${url}" target="_blank" style="color: #2563eb; text-decoration: underline; word-break: break-all;">${url}</a>`;
    });

    if (trimmed.length < 50 && !trimmed.includes("<a ") && !trimmed.endsWith(".")) {
      htmlBody += `<h3 style="font-size: 15px; font-weight: 700; color: #0f172a; margin: 12px 0 6px 0;">${processedLine}</h3>`;
    } else {
      htmlBody += `<p style="margin: 4px 0; font-size: 14px; color: #334155;">${processedLine}</p>`;
    }
  }

  htmlBody += `</div>`;
  return htmlBody;
}

export function extractCidMap(reader: MsgReader, msgData: any): Map<string, string> {
  const cidMap = new Map<string, string>();

  if (!msgData.attachments || !Array.isArray(msgData.attachments)) {
    return cidMap;
  }

  for (let i = 0; i < msgData.attachments.length; i++) {
    const attInfo = msgData.attachments[i];
    try {
      const att = reader.getAttachment(attInfo);
      if (!att || !att.content) continue;

      const bytes = att.content instanceof Uint8Array ? att.content : new Uint8Array(att.content);
      if (bytes.length === 0) continue;

      const fileName = attInfo.fileName || attInfo.name || att.fileName || `image_${i + 1}.png`;
      const mimeType = attInfo.attachMimeTag || (attInfo as any)['370e'] || getMimeTypeFromFileName(fileName);
      const base64 = uint8ArrayToBase64(bytes);
      const dataUrl = `data:${mimeType};base64,${base64}`;

      // 1. pidContentId / contentId
      const rawCid = attInfo.pidContentId || (attInfo as any).contentId || (attInfo as any)['3712'];
      if (rawCid && typeof rawCid === 'string') {
        const cleanCid = rawCid.replace(/^<|>$/g, '').trim();
        if (cleanCid) {
          cidMap.set(cleanCid, dataUrl);
          cidMap.set(cleanCid.toLowerCase(), dataUrl);
          const namePart = cleanCid.split('@')[0];
          if (namePart) {
            cidMap.set(namePart, dataUrl);
            cidMap.set(namePart.toLowerCase(), dataUrl);
          }
        }
      }

      // 2. fileName
      if (fileName && typeof fileName === 'string') {
        const cleanName = fileName.trim();
        cidMap.set(cleanName, dataUrl);
        cidMap.set(cleanName.toLowerCase(), dataUrl);
      }

      // 3. fileNameShort
      if (attInfo.fileNameShort && typeof attInfo.fileNameShort === 'string') {
        const cleanShort = attInfo.fileNameShort.trim();
        cidMap.set(cleanShort, dataUrl);
        cidMap.set(cleanShort.toLowerCase(), dataUrl);
      }

      // 4. Fallbacks by index
      cidMap.set(`image${i + 1}`, dataUrl);
      cidMap.set(`image${i + 1}.png`, dataUrl);
    } catch (e) {
      console.warn(`[MSG Parser] Failed to extract attachment #${i}:`, e);
    }
  }

  return cidMap;
}

export function replaceCidReferences(html: string, cidMap: Map<string, string>): string {
  if (!html) return html;

  let result = html;

  if (cidMap.size > 0) {
    result = result.replace(/cid:([^"'\s)>]+)/gi, (match, cidValue) => {
      const cleanCid = cidValue.replace(/^<|>$/g, '').trim();
      if (cidMap.has(cleanCid)) {
        return cidMap.get(cleanCid)!;
      }
      if (cidMap.has(cleanCid.toLowerCase())) {
        return cidMap.get(cleanCid.toLowerCase())!;
      }
      const nameOnly = cleanCid.split('@')[0];
      if (cidMap.has(nameOnly)) {
        return cidMap.get(nameOnly)!;
      }
      if (cidMap.has(nameOnly.toLowerCase())) {
        return cidMap.get(nameOnly.toLowerCase())!;
      }
      return match;
    });
  }

  return result;
}

export function prepareEmailHtmlForDisplay(html: string): string {
  if (!html) return "";

  let cleaned = unwrapSafelinks(html);

  const styleFix = `
<style id="outlook-msg-renderer-fix">
  v\\:*, v\\:rect, v\\:roundrect, v\\:shape, v\\:fill, v\\:stroke, v\\:textbox, v\\:group, v\\:path, v\\:line, o\\:* {
    display: none !important;
  }
  html, body {
    margin: 0 !important;
    padding: 16px !important;
    background-color: #ffffff !important;
    color: #0f172a !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    -webkit-font-smoothing: antialiased;
  }
  img {
    max-width: 100% !important;
    height: auto !important;
    display: inline-block;
    border: 0;
  }
  table {
    border-collapse: collapse;
  }
  a {
    color: #2563eb;
  }
</style>
`;

  if (cleaned.includes("</head>")) {
    cleaned = cleaned.replace("</head>", `${styleFix}</head>`);
  } else if (cleaned.includes("<html")) {
    cleaned = cleaned.replace(/<html[^>]*>/i, `$&<head>${styleFix}</head>`);
  } else {
    cleaned = `<!DOCTYPE html><html><head>${styleFix}</head><body>${cleaned}</body></html>`;
  }

  return cleaned;
}

export async function parseMsgArrayBuffer(buffer: ArrayBuffer, fileName?: string): Promise<ParsedMsgResult> {
  let subject = fileName ? fileName.replace(/\.msg$/i, "") : "Email Campaign";
  let rawHtml = "";
  let isHtml = false;

  try {
    const reader = new MsgReader(buffer);
    const msgData = reader.getFileData();

    if (msgData.subject) {
      subject = msgData.subject;
    }

    const cidMap = extractCidMap(reader, msgData);

    // 1. Check bodyHtml
    if (msgData.bodyHtml && typeof msgData.bodyHtml === "string" && msgData.bodyHtml.trim().length > 0) {
      rawHtml = msgData.bodyHtml;
      isHtml = true;
    }

    // 2. Check binary html property
    if (!rawHtml && (msgData as any).html) {
      const binHtml = (msgData as any).html;
      if (typeof binHtml === "string") {
        rawHtml = binHtml;
        isHtml = true;
      } else if (binHtml instanceof Uint8Array || Array.isArray(binHtml)) {
        rawHtml = new TextDecoder("utf-8").decode(new Uint8Array(binHtml));
        isHtml = true;
      }
    }

    // 3. Decompress RTF to extract encapsulated HTML
    if (!rawHtml && msgData.compressedRtf && msgData.compressedRtf.length > 0) {
      try {
        const decompressedBytes = decompressRTF(Array.from(msgData.compressedRtf));
        if (decompressedBytes && decompressedBytes.length > 0) {
          const rtfStr = new TextDecoder("latin1").decode(new Uint8Array(decompressedBytes));
          const extractedHtml = extractHtmlFromRtf(rtfStr);
          if (extractedHtml) {
            rawHtml = extractedHtml;
            isHtml = true;
          }
        }
      } catch (rtfErr) {
        console.warn("[MSG Parser] Error decompressing RTF:", rtfErr);
      }
    }

    // 4. Check HTML attachments
    if (!rawHtml && msgData.attachments && msgData.attachments.length > 0) {
      for (const attInfo of msgData.attachments) {
        if (attInfo.fileName && (attInfo.fileName.toLowerCase().endsWith(".html") || attInfo.fileName.toLowerCase().endsWith(".htm"))) {
          try {
            const att = reader.getAttachment(attInfo);
            if (att && att.content) {
              rawHtml = new TextDecoder("utf-8").decode(att.content);
              isHtml = true;
              break;
            }
          } catch (e) {
            console.warn("[MSG Parser] Error reading HTML attachment:", e);
          }
        }
      }
    }

    // 5. Check if msgData.body contains embedded HTML tags
    if (!rawHtml && msgData.body) {
      const rawBody = unwrapSafelinks(msgData.body);
      const htmlMatch = rawBody.match(/<html[\s\S]*?<\/html>/i) || rawBody.match(/<!DOCTYPE html[\s\S]*?<\/html>/i);
      if (htmlMatch) {
        rawHtml = htmlMatch[0];
        isHtml = true;
      } else {
        rawHtml = formatPlainTextToHtmlEmail(msgData.body);
        isHtml = false;
      }
    }

    // Replace cid references with data URLs
    if (rawHtml) {
      rawHtml = replaceCidReferences(rawHtml, cidMap);
    }
  } catch (err) {
    console.warn("[MSG Parser] MsgReader parsing error, falling back to buffer decoding:", err);
    const text = new TextDecoder("latin1").decode(new Uint8Array(buffer));
    const htmlMatch = text.match(/<html[\s\S]*?<\/html>/i) || text.match(/<!DOCTYPE html[\s\S]*?<\/html>/i);
    if (htmlMatch) {
      rawHtml = htmlMatch[0];
      isHtml = true;
    } else {
      const subMatch = text.match(/^Subject:\s*(.*)$/im);
      if (subMatch && subMatch[1]) {
        subject = subMatch[1].trim();
      }
      rawHtml = formatPlainTextToHtmlEmail(text);
      isHtml = false;
    }
  }

  if (!rawHtml) {
    rawHtml = `<div style="font-family: sans-serif; padding: 24px; color: #64748b; text-align: center;">No email body content found in .msg file.</div>`;
  }

  const finalHtml = prepareEmailHtmlForDisplay(rawHtml);

  return { subject, htmlContent: finalHtml, isHtml };
}
