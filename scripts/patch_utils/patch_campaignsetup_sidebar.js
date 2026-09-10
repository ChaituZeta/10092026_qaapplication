import fs from 'fs';
let content = fs.readFileSync('src/pages/CampaignSetup.tsx', 'utf8');

if (!content.includes('import { MasterChecklistSidebar }')) {
  content = content.replace('import { StageChecklist }', 'import { MasterChecklistSidebar } from "@/src/components/QAWorkspace/MasterChecklistSidebar";\nimport { StageChecklist }');
}

const target = `<QAWizard`;
if (content.includes(target) && !content.includes('<MasterChecklistSidebar')) {
  content = content.replace(target, `<MasterChecklistSidebar checklists={checklists} answers={checklistAnswers} />\n        <QAWizard`);
}

fs.writeFileSync('src/pages/CampaignSetup.tsx', content);
console.log("Patched MasterChecklistSidebar");
