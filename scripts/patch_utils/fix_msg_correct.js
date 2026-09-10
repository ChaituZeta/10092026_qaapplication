import fs from 'fs';
let content = fs.readFileSync('src/pages/CampaignSetup.tsx', 'utf8');

if (!content.includes('import MsgReader')) {
  content = content.replace('import React,', 'import MsgReader from "@kenjiuno/msgreader";\nimport React,');
}

const oldCode = `    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        // Try extracting subject line from MSG headers
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
      setOutlookSubject(extractedSubject);
      setExtractedSubject(extractedSubject);
      console.log(\`[Outlook Extraction] Extracted Subject Line: "\${extractedSubject}"\`);
      setLeftCompareTab("outlook");
    };
    reader.readAsText(file, "latin1");`;

const newCode = `    const reader = new FileReader();
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
    reader.readAsArrayBuffer(file);`;

if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    console.log("Successfully replaced old code.");
} else {
    console.log("Could not find old code.");
}

fs.writeFileSync('src/pages/CampaignSetup.tsx', content);
