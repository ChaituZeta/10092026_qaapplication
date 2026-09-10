import fs from 'fs';
let content = fs.readFileSync('src/components/QAWorkspace/StageChecklist.tsx', 'utf8');

content = content.replace(
  `const currentItems = checklists.filter(c => c.stage === currentStep);`,
  `const currentItems = checklists.filter(c => c.stage === currentStep || c.stage === 0);`
);

fs.writeFileSync('src/components/QAWorkspace/StageChecklist.tsx', content);
console.log("Fixed StageChecklist stage 0 filter");
