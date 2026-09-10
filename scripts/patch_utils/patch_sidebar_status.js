import fs from 'fs';
let content = fs.readFileSync('src/components/QAWorkspace/MasterChecklistSidebar.tsx', 'utf8');
content = content.replace(/status === 'checked'/g, "status === 'Checked'");
content = content.replace(/status === 'na'/g, "status === 'N/A'");
content = content.replace(/ans\?.input/g, "ans?.text");
content = content.replace(/ans.input/g, "ans.text");
content = content.replace(/case 'checked':/g, "case 'Checked':");
content = content.replace(/case 'na':/g, "case 'N/A':");
content = content.replace(/item.title/g, "item.text");

fs.writeFileSync('src/components/QAWorkspace/MasterChecklistSidebar.tsx', content);
console.log("Patched sidebar status and fields");
