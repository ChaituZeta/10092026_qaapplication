import fs from 'fs';
let content = fs.readFileSync('src/pages/CampaignSetup.tsx', 'utf8');

const searchSidebar = `{/* Checklist Sidebar */}
            {values.team && teamChecklists.length > 0 && (`;

const replaceSidebar = `{/* Checklist Sidebar */}
            {checklists.length > 0 && (`;

content = content.replace(searchSidebar, replaceSidebar);

const sidebarContentSearch = `<div className="flex-1 overflow-y-auto p-2 space-y-1 bg-white">
                    {teamChecklists.find((c: any) => c.team === values.team)?.items?.filter((item: any) => !item.stage || item.stage === 0 || item.stage === currentStep).map((item: any) => (
                      <div key={item.id} className="flex items-start gap-2 p-2 hover:bg-slate-50 rounded-lg transition-colors group/item cursor-pointer" onClick={() => setCheckedCheckpoints({...checkedCheckpoints, [item.id]: !checkedCheckpoints[item.id]})}>
                        <div className="mt-0.5 shrink-0">
                          {checkedCheckpoints[item.id] ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <div className="w-4 h-4 border-2 border-slate-300 rounded-sm group-hover/item:border-[#2b61d6]" />
                          )}
                        </div>
                        <span className={\`text-xs \${checkedCheckpoints[item.id] ? 'text-slate-400 line-through' : 'text-slate-700'}\`}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                    {(!teamChecklists.find((c: any) => c.team === values.team) || teamChecklists.find((c: any) => c.team === values.team)?.items?.filter((item: any) => !item.stage || item.stage === 0 || item.stage === currentStep).length === 0) && (
                      <div className="text-center p-4 text-xs text-slate-400">
                        No checkpoints for this stage.
                      </div>
                    )}
                 </div>`;

const sidebarContentReplace = `<div className="flex-1 overflow-y-auto p-2 space-y-1 bg-white">
                    {checklists.map((item: any) => {
                      const ans = checklistAnswers[item.id];
                      const isChecked = ans?.status === "Checked";
                      const isNA = ans?.status === "N/A";
                      
                      return (
                        <div key={item.id} className="flex items-start gap-2 p-2 hover:bg-slate-50 rounded-lg transition-colors group/item cursor-pointer" onClick={() => {
                          const newStatus = isChecked ? "N/A" : (isNA ? null : "Checked");
                          setChecklistAnswers({ ...checklistAnswers, [item.id]: { ...ans, status: newStatus } });
                        }}>
                          <div className="mt-0.5 shrink-0">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : isNA ? (
                              <div className="w-4 h-4 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-[8px] font-bold text-slate-600">NA</div>
                            ) : (
                              <div className="w-4 h-4 border-2 border-slate-300 rounded-sm group-hover/item:border-[#2b61d6]" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className={\`text-xs \${isChecked ? 'text-slate-400 line-through' : 'text-slate-700'}\`}>
                              {item.text}
                            </span>
                            <span className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5">
                              {item.stage === 0 ? 'All Stages' : \`Step \${item.stage}\`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                 </div>`;

content = content.replace(sidebarContentSearch, sidebarContentReplace);

fs.writeFileSync('src/pages/CampaignSetup.tsx', content);
console.log("Patched Checklist Sidebar");
