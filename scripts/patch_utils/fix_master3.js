import fs from 'fs';
let content = fs.readFileSync('src/components/QAWorkspace/MasterChecklistSidebar.tsx', 'utf8');
content = content.replace(/c\.text/g, 'c.description');
content = content.replace(/ans\.text/g, 'ans.input');
fs.writeFileSync('src/components/QAWorkspace/MasterChecklistSidebar.tsx', content);
