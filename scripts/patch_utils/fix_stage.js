import fs from 'fs';
let content = fs.readFileSync('src/pages/Checklists.tsx', 'utf8');

const newStageHandler = `
  const handleChangeStage = (id: string, newStage: number) => {
    const newChecklists = checklists.map(c => {
      if (c.team === activeTeam) {
        return { 
          ...c, 
          items: c.items.map(item => item.id === id ? { ...item, stage: newStage } : item) 
        };
      }
      return c;
    });
    saveChecklists(newChecklists);
  };
  const handleDeleteItem = (id: string) => {`;

content = content.replace('const handleDeleteItem = (id: string) => {', newStageHandler);

const oldStageRender = `<span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-sm self-start">
                          {item.stage === 0 || item.stage === undefined ? "All Stages" : \`Step \${item.stage}\`}
                        </span>`;

const newStageRender = `<select
                          className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 bg-slate-100 border-none outline-none px-2 py-0.5 rounded-sm self-start cursor-pointer hover:bg-slate-200"
                          value={item.stage === undefined ? 0 : item.stage}
                          onChange={(e) => handleChangeStage(item.id, Number(e.target.value))}
                        >
                          <option value={0}>All Stages</option>
                          <option value={1}>Step 1: Details</option>
                          <option value={2}>Step 2: Comparison</option>
                          <option value={3}>Step 3: Tags</option>
                          <option value={4}>Step 4: Links</option>
                          <option value={5}>Step 5: Grammar</option>
                          <option value={6}>Step 6: Review</option>
                        </select>`;

content = content.replace(oldStageRender, newStageRender);

fs.writeFileSync('src/pages/Checklists.tsx', content);
console.log("Added change stage feature");
