import fs from 'fs';
let content = fs.readFileSync('src/components/QAWorkspace/MasterChecklistSidebar.tsx', 'utf8');
content = content.replace(/import.*?ChecklistItem.*?from.*?@\/lib\/supabase.*?;/, 'export interface ChecklistItem { id: string; stage: number; category: string; description: string; requiresInput: boolean; }');
fs.writeFileSync('src/components/QAWorkspace/MasterChecklistSidebar.tsx', content);
