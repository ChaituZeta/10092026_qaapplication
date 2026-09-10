import fs from 'fs';
let content = fs.readFileSync('src/components/QAWorkspace/StageChecklist.tsx', 'utf8');

content = content.replace(/name=\{\\\`status-\\\$\\{item\.id\\}\\\`\}/g, "name={`status-${item.id}`}");

fs.writeFileSync('src/components/QAWorkspace/StageChecklist.tsx', content);
console.log("Fixed StageChecklist escaping");

let setupContent = fs.readFileSync('src/pages/CampaignSetup.tsx', 'utf8');
setupContent = setupContent.replace(/name=\{\\\`status-\\\$\\{item\.id\\}\\\`\}/g, "name={`status-${item.id}`}");
fs.writeFileSync('src/pages/CampaignSetup.tsx', setupContent);

let finalContent = fs.readFileSync('src/components/QAWorkspace/FinalChecklist.tsx', 'utf8');
finalContent = finalContent.replace(/name=\{\\\`status-\\\$\\{item\.id\\}\\\`\}/g, "name={`status-${item.id}`}");
fs.writeFileSync('src/components/QAWorkspace/FinalChecklist.tsx', finalContent);
