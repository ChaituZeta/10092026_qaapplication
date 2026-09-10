import fs from 'fs';
let content = fs.readFileSync('src/pages/CampaignSetup.tsx', 'utf8');

// Add import MsgReader at top if not present
if (!content.includes('import MsgReader')) {
  content = content.replace('import React,', 'import MsgReader from "@kenjiuno/msgreader";\nimport React,');
}

const handleOutlookFileChangeRegex = /const handleOutlookFileChange = \(\(file: File \| null\).*?reader\.readAsText\(file, "latin1"\);\n  \};\n/s;
const handleOutlookFileChangeSearch = `  const handleOutlookFileChange = (file: File | null) => {
    setOutlookFile(file);
    if (!file) {
      setOutlookExtractedHtml(null);
      setOutlookSubject(null);
      setOutlookFileName(null);
      return;
    }

    setOutlookFileName(file.name);
    console.log(\`[Outlook Extraction] Processing file '\${file.name}'...\`);

    // Auto-detect subject from file name or raw text parse
    let extractedSubject = file.name.replace(/\\.msg$/i, "").replace(/^email[_-]?/i, "");
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (buffer) {
        try {
          const testMsg = new MsgReader(buffer);
          const msgData = testMsg.getFileData();
          if (msgData.subject) {
            extractedSubject = msgData.subject;
          }
          if (msgData.bodyHTML) {
            setOutlookExtractedHtml(msgData.bodyHTML);
          } else {
             // fallback to latin1 string match
             const text = new TextDecoder("latin1").decode(buffer);
             const htmlMatch = text.match(/<html[\\s\\S]*?<\\/html>/i) || text.match(/<!DOCTYPE html[\\s\\S]*?<\\/html>/i);
             if (htmlMatch) {
               setOutlookExtractedHtml(htmlMatch[0]);
             } else {
               setOutlookExtractedHtml(null);
             }
          }
        } catch (err) {
           console.error("MsgReader failed", err);
           const text = new TextDecoder("latin1").decode(buffer);
           const subjectMatch = text.match(/(?:Subject|Thread-Topic)\\s*[:=]\\s*([^\\r\\n\\x00-\\x1F]+)/i);
           if (subjectMatch && subjectMatch[1]?.trim()) {
             extractedSubject = subjectMatch[1].trim();
           }
           const htmlMatch = text.match(/<html[\\s\\S]*?<\\/html>/i) || text.match(/<!DOCTYPE html[\\s\\S]*?<\\/html>/i);
           if (htmlMatch) {
             setOutlookExtractedHtml(htmlMatch[0]);
           } else {
             setOutlookExtractedHtml(null);
           }
        }
      }
      setOutlookSubject(extractedSubject);
      setExtractedSubject(extractedSubject);
      console.log(\`[Outlook Extraction] Extracted Subject Line: "\${extractedSubject}"\`);
      setLeftCompareTab("outlook");
    };
    reader.readAsArrayBuffer(file);
  };
`;

const lines = content.split('\n');
const startIdx = lines.findIndex(l => l.includes('const handleOutlookFileChange = (file: File | null) => {'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('reader.readAsText(file, "latin1");'));
if (startIdx >= 0 && endIdx >= 0) {
  content = content.substring(0, content.indexOf(lines[startIdx])) + handleOutlookFileChangeSearch + content.substring(content.indexOf(lines[endIdx+2]));
} else {
  console.log("Could not find handleOutlookFileChange block!");
}

fs.writeFileSync('src/pages/CampaignSetup.tsx', content);
console.log("Patched msg reading");
