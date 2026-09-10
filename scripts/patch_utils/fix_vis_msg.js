import fs from 'fs';
let content = fs.readFileSync('src/components/QAWorkspace/VisualComparison.tsx', 'utf8');

if (!content.includes('import MsgReader')) {
  content = content.replace('import React,', 'import MsgReader from "@kenjiuno/msgreader";\nimport React,');
}

const oldUpload = `  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const key = \`\${device}-\${theme}\`;
      setMsgFiles(prev => ({ ...prev, [key]: url }));
      
      if (file.name.endsWith('.eml')) {
        const text = await file.text();
        const subjectMatch = text.match(/^Subject:\\s*(.*)$/im);
        if (subjectMatch && subjectMatch[1]) {
          onMsgUploaded?.(subjectMatch[1].trim());
        }
      } else {
        // Fallback to filename for other formats like msg/png
        onMsgUploaded?.(file.name.replace(/\\.[^/.]+$/, ""));
      }
    }
  };`;

const newUpload = `  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const key = \`\${device}-\${theme}\`;
      
      if (file.name.endsWith('.msg')) {
         const reader = new FileReader();
         reader.onload = (e) => {
            const buffer = e.target?.result as ArrayBuffer;
            if (buffer) {
               try {
                 const testMsg = new MsgReader(buffer);
                 const msgData = testMsg.getFileData();
                 if (msgData.subject) {
                   onMsgUploaded?.(msgData.subject);
                 }
                 if (msgData.bodyHTML) {
                   const blob = new Blob([msgData.bodyHTML], { type: 'text/html' });
                   setMsgFiles(prev => ({ ...prev, [key]: URL.createObjectURL(blob) }));
                 } else {
                   setMsgFiles(prev => ({ ...prev, [key]: URL.createObjectURL(file) }));
                 }
               } catch (err) {
                 setMsgFiles(prev => ({ ...prev, [key]: URL.createObjectURL(file) }));
               }
            }
         };
         reader.readAsArrayBuffer(file);
      } else {
        const url = URL.createObjectURL(file);
        setMsgFiles(prev => ({ ...prev, [key]: url }));
        if (file.name.endsWith('.eml')) {
          const text = await file.text();
          const subjectMatch = text.match(/^Subject:\\s*(.*)$/im);
          if (subjectMatch && subjectMatch[1]) {
            onMsgUploaded?.(subjectMatch[1].trim());
          }
        } else {
          onMsgUploaded?.(file.name.replace(/\\.[^/.]+$/, ""));
        }
      }
    }
  };`;

content = content.replace(oldUpload, newUpload);
fs.writeFileSync('src/components/QAWorkspace/VisualComparison.tsx', content);
console.log("Patched VisualComparison msg reading");
