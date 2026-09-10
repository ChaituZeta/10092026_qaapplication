import fs from 'fs';
let content = fs.readFileSync('src/pages/CampaignSetup.tsx', 'utf8');

content = content.replace(
  `setCurrentStep(prev => Math.min(prev + 1, 4));`,
  `setCurrentStep(prev => Math.min(prev + 1, 7));`
);

fs.writeFileSync('src/pages/CampaignSetup.tsx', content);
console.log("Fixed setCurrentStep limit");
