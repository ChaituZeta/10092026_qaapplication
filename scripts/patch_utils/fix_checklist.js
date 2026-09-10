import fs from 'fs';
let content = fs.readFileSync('src/components/QAWorkspace/FinalChecklist.tsx', 'utf8');

const target = '{stageNum === 0 ? "Global Checkpoints (All Stages)" : \\`Step \\${stageNum}: \\${stageNames[stageNum - 1]}\\`}';
const replacement = '{stageNum === 0 ? "Global Checkpoints (All Stages)" : `Step ${stageNum}: ${stageNames[stageNum - 1]}`}';

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/QAWorkspace/FinalChecklist.tsx', content);
  console.log("Fixed");
} else {
  console.log("Not found");
}
