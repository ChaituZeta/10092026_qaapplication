import fs from 'fs';
let content = fs.readFileSync('src/components/QAWorkspace/MasterChecklistSidebar.tsx', 'utf8');
content = content.replace("import { Badge } from '@/components/ui/badge';", "");
content = content.replace(/<Badge variant=\{completed === total \? "default" : "secondary"\} className=\{completed === total \? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""\}>/g, '<span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", completed === total ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700")}>');
content = content.replace(/<\/Badge>/g, '</span>');

fs.writeFileSync('src/components/QAWorkspace/MasterChecklistSidebar.tsx', content);
console.log("Removed Badge component");
