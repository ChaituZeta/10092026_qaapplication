import fs from 'fs';

let content = fs.readFileSync('src/components/QAWorkspace/TagInspection.tsx', 'utf8');

content = content.replace(
  'if (rect.width === 0 || rect.height === 0) return;',
  '// if (rect.width === 0 || rect.height === 0) return;'
);

fs.writeFileSync('src/components/QAWorkspace/TagInspection.tsx', content);
console.log("Fixed zero size issue");
