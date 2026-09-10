import fs from 'fs';
let content = fs.readFileSync('src/components/QAWorkspace/MasterChecklistSidebar.tsx', 'utf8');
content = content.replace(/\\`Stage \\\${stage}\\`/g, "`Stage ${stage}`");
fs.writeFileSync('src/components/QAWorkspace/MasterChecklistSidebar.tsx', content);
console.log("Fixed");
