const { decompressRTF } = require('@kenjiuno/decompressrtf');

function unescapeRtf(str) {
  return str
    .replace(/\\'\s*([0-9a-fA-F]{2})/g, (m, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\\\/g, "\\")
    .replace(/\\\{/g, "{")
    .replace(/\\\}/g, "}")
    .replace(/\\par/gi, "\n");
}

function extractHtmlFromRtf(rtfStr) {
  if (!rtfStr) return null;
  if (rtfStr.includes("\\fromhtml1") || rtfStr.includes("htmltag")) {
    const htmlTagRegex = /\{\\\*\\htmltag\d*\s*([\s\S]*?)\}/g;
    let match;
    let htmlParts = [];
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
  return htmlMatch ? htmlMatch[0] : null;
}

const sampleRtf = "{\\rtf1\\ansi\\fromhtml1 {\\*\\htmltag1 <html xmlns:v=\\'22urn:schemas-microsoft-com:vml\\'3e}{\\*\\htmltag8 <body>}{\\*\\htmltag16 <h1 style=\\'3d\\'22color:red\\'22>Hello HP Campaign</h1>}{\\*\\htmltag24 </body></html>}}";

console.log("Extracted HTML result:", extractHtmlFromRtf(sampleRtf));
