import fs from 'fs';
let content = fs.readFileSync('src/pages/Checklists.tsx', 'utf8');

content = content.replace(
  'import { Plus, Trash2, Edit2, CheckCircle2 } from "lucide-react";',
  'import { Plus, Trash2, Edit2, CheckCircle2, ChevronUp, ChevronDown } from "lucide-react";'
);

// Add sequence functions
const moveItemUp = `
  const moveItemUp = (index: number) => {
    if (index === 0) return;
    const newChecklists = [...checklists];
    const teamIndex = newChecklists.findIndex(c => c.team === activeTeam);
    if (teamIndex >= 0) {
      const items = newChecklists[teamIndex].items;
      const temp = items[index - 1];
      items[index - 1] = items[index];
      items[index] = temp;
      saveChecklists(newChecklists);
    }
  };
`;

const moveItemDown = `
  const moveItemDown = (index: number) => {
    const newChecklists = [...checklists];
    const teamIndex = newChecklists.findIndex(c => c.team === activeTeam);
    if (teamIndex >= 0) {
      const items = newChecklists[teamIndex].items;
      if (index === items.length - 1) return;
      const temp = items[index + 1];
      items[index + 1] = items[index];
      items[index] = temp;
      saveChecklists(newChecklists);
    }
  };
`;

content = content.replace(
  'const handleDeleteItem = (id: string) => {',
  moveItemUp + '\\n' + moveItemDown + '\\n  const handleDeleteItem = (id: string) => {'
);

const oldMap = `activeChecklist.items.map(item => (
                  <div key={item.id} className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg group flex-col sm:flex-row">`;
const newMap = `activeChecklist.items.map((item, index) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg group flex-col sm:flex-row">`;

content = content.replace(oldMap, newMap);

const oldButtons = `<Button 
                      type="button"
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteItem(item.id)}
                      className="h-7 w-7 text-rose-500 hover:bg-rose-50 hover:text-rose-700 opacity-0 group-hover:opacity-100 transition-opacity self-end sm:self-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>`;

const newButtons = `<div className="flex flex-row items-center gap-1 self-end sm:self-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon" 
                        onClick={() => moveItemUp(index)}
                        disabled={index === 0}
                        className="h-7 w-7 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon" 
                        onClick={() => moveItemDown(index)}
                        disabled={index === activeChecklist.items.length - 1}
                        className="h-7 w-7 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteItem(item.id)}
                        className="h-7 w-7 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>`;

content = content.replace(oldButtons, newButtons);

fs.writeFileSync('src/pages/Checklists.tsx', content);
console.log("Updated sequence UI");
