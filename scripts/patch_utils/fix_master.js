import fs from 'fs';
let content = fs.readFileSync('src/components/QAWorkspace/MasterChecklistSidebar.tsx', 'utf8');

const target = 'import { ChecklistItem } from "@/lib/supabase";';
const replacement = 'export interface ChecklistItem { id: string; stage: number; category: string; description: string; requiresInput: boolean; }';

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/QAWorkspace/MasterChecklistSidebar.tsx', content);
  console.log("Fixed");
} else {
  console.log("Not found");
}
