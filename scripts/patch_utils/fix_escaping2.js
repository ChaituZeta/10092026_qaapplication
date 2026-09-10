import fs from 'fs';
let content = fs.readFileSync('src/components/QAWorkspace/StageChecklist.tsx', 'utf8');

content = content.replace('name={\\`status-\\${item.id}\\`}', 'name={`status-${item.id}`}');
content = content.replace('name={\\`status-\\${item.id}\\`}', 'name={`status-${item.id}`}');

fs.writeFileSync('src/components/QAWorkspace/StageChecklist.tsx', content);

let finalContent = fs.readFileSync('src/components/QAWorkspace/FinalChecklist.tsx', 'utf8');
finalContent = finalContent.replace('name={\\`status-\\${item.id}\\`}', 'name={`status-${item.id}`}');
finalContent = finalContent.replace('name={\\`status-\\${item.id}\\`}', 'name={`status-${item.id}`}');
fs.writeFileSync('src/components/QAWorkspace/FinalChecklist.tsx', finalContent);
console.log("Fixed StageChecklist escaping 2");
