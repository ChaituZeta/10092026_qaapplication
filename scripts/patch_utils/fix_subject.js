import fs from 'fs';
let content = fs.readFileSync('src/pages/CampaignSetup.tsx', 'utf8');

content = content.replace(
  'setOutlookSubject(extractedSubject);\n      setExtractedSubject(extractedSubject);',
  'setOutlookSubject(extractedSubject);'
); // Undo just in case

content = content.replace(
  'setOutlookSubject(extractedSubject);',
  'setOutlookSubject(extractedSubject);\n      setExtractedSubject(extractedSubject);'
);

fs.writeFileSync('src/pages/CampaignSetup.tsx', content);
console.log("Fixed subject line state update");
