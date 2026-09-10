import fs from 'fs';
let content = fs.readFileSync('src/pages/CampaignSetup.tsx', 'utf8');
console.log(content.includes('import MsgReader'));
