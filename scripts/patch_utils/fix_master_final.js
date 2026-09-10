import fs from 'fs';
let content = fs.readFileSync('src/components/QAWorkspace/MasterChecklistSidebar.tsx', 'utf8');

// Replace ChecklistItem interface
content = content.replace(
  'export interface ChecklistItem { id: string; stage: number; category: string; description: string; requiresInput: boolean; }',
  'export interface ChecklistItem { id: string; text: string; stage?: number; requiresInput?: boolean; inputPlaceholder?: string; }'
);

// Replace c.description back to c.text
content = content.replace(/item\.description/g, 'item.text');

// Replace ans?.input back to ans?.text
content = content.replace(/ans\?\.input/g, 'ans?.text');

// Also fix answers: Record<string, { status: string, input?: string }> to use text?: string
content = content.replace(
  'answers: Record<string, { status: string, input?: string }>',
  'answers: Record<string, { status: string, text?: string }>'
);

fs.writeFileSync('src/components/QAWorkspace/MasterChecklistSidebar.tsx', content);
