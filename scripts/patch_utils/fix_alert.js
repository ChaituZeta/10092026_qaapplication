import fs from 'fs';
let content = fs.readFileSync('src/pages/CampaignSetup.tsx', 'utf8');

const target = `    if (!isChecklistValid && currentStep < 7) {
      setShowChecklistError(true);
      return;
    }`;

const replacement = `    if (!isChecklistValid && currentStep < 7) {
      setShowChecklistError(true);
      window.alert("Please complete all mandatory checkpoints for this stage (mark as 'Checked' or 'N/A') before proceeding.");
      return;
    }`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/pages/CampaignSetup.tsx', content);
  console.log("Alert added");
} else {
  console.log("Could not find target");
}
