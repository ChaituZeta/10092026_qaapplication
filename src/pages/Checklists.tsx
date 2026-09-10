import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, CheckCircle2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { fetchPlatformChecklists, savePlatformChecklists, TeamChecklist, ChecklistItem } from "@/lib/checklist-storage";

export type { ChecklistItem, TeamChecklist };

export function Checklists({ role }: { role: string }) {
  const [checklists, setChecklists] = useState<TeamChecklist[]>([]);
  const [activeTeam, setActiveTeam] = useState<string>("HP-APJ");
  const [activeTemplateId, setActiveTemplateId] = useState<string>("");
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isRenamingTemplate, setIsRenamingTemplate] = useState(false);
  const [renameTemplateValue, setRenameTemplateValue] = useState("");
  const [newItemText, setNewItemText] = useState("");
  const [newItemStage, setNewItemStage] = useState<number>(0);
  const [newItemRequiresInput, setNewItemRequiresInput] = useState(false);
  const [newItemPlaceholder, setNewItemPlaceholder] = useState("");
  const [newItemHasOptions, setNewItemHasOptions] = useState(false);
  const [newItemOptions, setNewItemOptions] = useState("");
  const [teams, setTeams] = useState<string[]>(["HP-APJ", "HP-EMEA", "HP-AMS"]);

  const [stageLabels, setStageLabels] = useState<Record<string, string>>({
    "1": "Stage 1: Details & Source",
    "2": "Stage 2: Visual Comparison",
    "3": "Stage 3: Alt & Alias Tags",
    "4": "Stage 4: Link Validation",
    "5": "Stage 5: Grammar & Spell Check",
    "6": "Stage 6: Review & Approval / LAUNCH (FQA)",
    "7": "Stage 7: Review & Approval (FQA)"
  });

  useEffect(() => {
    const isDb = isSupabaseConfigured();

    const fetchTeams = async () => {
      if (isDb) {
        const { data } = await supabase.from('teams').select('*').order('created_at', { ascending: true });
        if (data && data.length > 0) {
          const teamNames = data.map(t => t.name);
          setTeams(teamNames);
          if (!teamNames.includes(activeTeam)) {
            setActiveTeam(teamNames[0]);
          }
        }
        
        const { data: settingsData } = await supabase.from('app_settings').select('stage_labels').limit(1).maybeSingle();
        if (settingsData && settingsData.stage_labels) {
          try {
            const parsed = typeof settingsData.stage_labels === 'string' ? JSON.parse(settingsData.stage_labels) : settingsData.stage_labels;
            setStageLabels(prev => ({ ...prev, ...parsed }));
          } catch (e) {
            console.warn("Failed to parse stage_labels", e);
          }
        }
      }
    };
    fetchTeams();

    const loadChecklists = async () => {
      const data = await fetchPlatformChecklists();
      setChecklists(data);
    };

    loadChecklists();
  }, []);

  const saveChecklists = async (newChecklists: TeamChecklist[]) => {
    setChecklists(newChecklists);
    await savePlatformChecklists(newChecklists);
  };

  const availableTeamTemplates = checklists.filter(c => c.team === activeTeam);

  useEffect(() => {
    if (availableTeamTemplates.length > 0) {
      const exists = availableTeamTemplates.find(t => (t.id || t.name || "default") === activeTemplateId);
      if (!exists) {
        setActiveTemplateId(availableTeamTemplates[0].id || availableTeamTemplates[0].name || "default");
      }
    }
  }, [activeTeam, availableTeamTemplates, activeTemplateId]);

  const activeChecklist = checklists.find(c => c.team === activeTeam && (c.id || c.name || "default") === activeTemplateId) 
    || availableTeamTemplates[0] 
    || { team: activeTeam, name: "Default Checklist", items: [] };

  const isFQA = React.useMemo(() => {
    const title = (activeChecklist.name || "").toLowerCase();
    return title.includes("fqa") && !title.includes("cqa");
  }, [activeChecklist]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    
    const newItem = { 
      id: Date.now().toString(), 
      text: newItemText.trim(), 
      stage: newItemStage, 
      requiresInput: newItemRequiresInput, 
      inputPlaceholder: newItemPlaceholder,
      options: newItemHasOptions && newItemOptions.trim() ? newItemOptions.split(',').map(o => o.trim()).filter(Boolean) : undefined
    };
    const newChecklists = [...checklists];
    const teamIndex = newChecklists.findIndex(c => c.team === activeTeam && (c.id || c.name || "default") === activeTemplateId);
    
    if (teamIndex >= 0) {
      newChecklists[teamIndex].items.push(newItem);
    } else {
      newChecklists.push({ team: activeTeam, name: activeTemplateId || "Default Checklist", items: [newItem] });
    }
    
    saveChecklists(newChecklists);
    setNewItemText("");
    setNewItemRequiresInput(false);
    setNewItemPlaceholder("");
    setNewItemHasOptions(false);
    setNewItemOptions("");
  };

  
  const moveItemUp = (index: number) => {
    if (index === 0) return;
    const newChecklists = [...checklists];
    const teamIndex = newChecklists.findIndex(c => c.team === activeTeam && (c.id || c.name || "default") === activeTemplateId);
    if (teamIndex >= 0) {
      const items = newChecklists[teamIndex].items;
      const temp = items[index - 1];
      items[index - 1] = items[index];
      items[index] = temp;
      saveChecklists(newChecklists);
    }
  };


  const moveItemDown = (index: number) => {
    const newChecklists = [...checklists];
    const teamIndex = newChecklists.findIndex(c => c.team === activeTeam && (c.id || c.name || "default") === activeTemplateId);
    if (teamIndex >= 0) {
      const items = newChecklists[teamIndex].items;
      if (index === items.length - 1) return;
      const temp = items[index + 1];
      items[index + 1] = items[index];
      items[index] = temp;
      saveChecklists(newChecklists);
    }
  };

  
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState<string>("");
  const [editingItemRequiresInput, setEditingItemRequiresInput] = useState<boolean>(false);
  const [editingItemPlaceholder, setEditingItemPlaceholder] = useState<string>("");
  const [editingItemHasOptions, setEditingItemHasOptions] = useState<boolean>(false);
  const [editingItemOptions, setEditingItemOptions] = useState<string>("");

  const handleStartEdit = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setEditingItemText(item.text);
    setEditingItemRequiresInput(item.requiresInput || false);
    setEditingItemPlaceholder(item.inputPlaceholder || "");
    setEditingItemHasOptions(!!item.options && item.options.length > 0);
    setEditingItemOptions(item.options ? item.options.join(", ") : "");
  };

  const handleSaveEdit = (id: string) => {
    if (!editingItemText.trim()) return;
    const newChecklists = checklists.map(c => {
      if (c.team === activeTeam && (c.id || c.name || "default") === activeTemplateId) {
        return {
          ...c,
          items: c.items.map(item => item.id === id ? { 
            ...item, 
            text: editingItemText.trim(),
            requiresInput: editingItemRequiresInput,
            inputPlaceholder: editingItemRequiresInput ? editingItemPlaceholder.trim() : undefined,
            options: editingItemHasOptions && editingItemOptions.trim() ? editingItemOptions.split(',').map(o => o.trim()).filter(Boolean) : undefined
          } : item)
        };
      }
      return c;
    });
    saveChecklists(newChecklists);
    setEditingItemId(null);
    setEditingItemText("");
    setEditingItemRequiresInput(false);
    setEditingItemPlaceholder("");
  };

  const handleSaveRenameTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTemplateValue.trim()) return;
    const newChecklists = checklists.map(c => {
      if (c.team === activeTeam && (c.id || c.name || "default") === activeTemplateId) {
        return { ...c, name: renameTemplateValue.trim() };
      }
      return c;
    });
    saveChecklists(newChecklists);
    setIsRenamingTemplate(false);
  };

  const handleChangeStage = (id: string, newStage: number) => {
    const newChecklists = checklists.map(c => {
      if (c.team === activeTeam && (c.id || c.name || "default") === activeTemplateId) {
        return { 
          ...c, 
          items: c.items.map(item => item.id === id ? { ...item, stage: newStage } : item) 
        };
      }
      return c;
    });
    saveChecklists(newChecklists);
  };

  const handleDeleteItem = (id: string) => {
    const newChecklists = checklists.map(c => {
      if (c.team === activeTeam && (c.id || c.name || "default") === activeTemplateId) {
        return { ...c, items: c.items.filter(item => item.id !== id) };
      }
      return c;
    });
    saveChecklists(newChecklists);
    setDeletingItemId(null);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Checklists</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage campaign review checkpoints for different teams.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-64 flex flex-col gap-2">
          {teams.map(team => (
            <button
              key={team}
              onClick={() => setActiveTeam(team)}
              className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTeam === team ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {team} Checkpoints
            </button>
          ))}
        </div>

        <Card className="flex-1 shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Master Checklist</CardTitle>
                <CardDescription>Points to verify during campaign review for {activeTeam}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {isCreatingTemplate ? (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!newTemplateName.trim()) return;
                    setActiveTemplateId(newTemplateName.trim());
                    setIsCreatingTemplate(false);
                    setNewTemplateName("");
                  }} className="flex items-center gap-2">
                    <Input 
                      placeholder="Template Name..." 
                      value={newTemplateName} 
                      onChange={e => setNewTemplateName(e.target.value)}
                      className="h-9 w-48 text-sm"
                      autoFocus
                    />
                    <Button type="submit" size="sm" className="h-9 bg-indigo-600 hover:bg-indigo-700">Add</Button>
                    <Button type="button" variant="ghost" size="sm" className="h-9" onClick={() => setIsCreatingTemplate(false)}>Cancel</Button>
                  </form>
                ) : isRenamingTemplate ? (
                  <form onSubmit={handleSaveRenameTemplate} className="flex items-center gap-2">
                    <Input 
                      value={renameTemplateValue} 
                      onChange={e => setRenameTemplateValue(e.target.value)}
                      className="h-9 w-48 text-sm"
                      autoFocus
                    />
                    <Button type="submit" size="sm" className="h-9 bg-indigo-600 hover:bg-indigo-700">Save</Button>
                    <Button type="button" variant="ghost" size="sm" className="h-9" onClick={() => setIsRenamingTemplate(false)}>Cancel</Button>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center gap-1">
                      <select
                        className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[200px]"
                        value={activeTemplateId}
                        onChange={e => setActiveTemplateId(e.target.value)}
                      >
                        {availableTeamTemplates.map(t => (
                          <option key={t.id || t.name || "default"} value={t.id || t.name || "default"}>
                            {t.name || "Default Checklist"}
                          </option>
                        ))}
                        {availableTeamTemplates.length === 0 && (
                          <option value="default">Default Checklist</option>
                        )}
                      </select>
                      {availableTeamTemplates.length > 0 && (
                        <Button 
                          onClick={() => {
                            setRenameTemplateValue(availableTeamTemplates.find(t => (t.id || t.name || "default") === activeTemplateId)?.name || "");
                            setIsRenamingTemplate(true);
                          }} 
                          size="icon" 
                          variant="ghost" 
                          className="h-9 w-9 text-slate-400 hover:text-slate-700 ml-1"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <Button onClick={() => setIsCreatingTemplate(true)} size="sm" variant="outline" className="h-9 gap-1.5 border-dashed border-slate-300">
                      <Plus className="w-3.5 h-3.5" /> New Template
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
                        <form onSubmit={handleAddItem} className="flex flex-col gap-3 border p-4 rounded-md border-slate-200">
              <div className="flex gap-3">
                <Input 
                  placeholder="New checkpoint text..." 
                  value={newItemText}
                  onChange={e => setNewItemText(e.target.value)}
                  className="flex-1"
                />
                <select
                  className="border border-slate-200 rounded-md px-3 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
                  value={newItemStage}
                  onChange={e => setNewItemStage(Number(e.target.value))}
                >
                  <option value={0}>{stageLabels["0"] || "All Stages (Global)"}</option>
                  <option value={1}>{stageLabels["1"] || "Stage 1: Details & Source"}</option>
                  <option value={2}>{stageLabels["2"] || "Stage 2: Visual Comparison"}</option>
                  <option value={3}>{stageLabels["3"] || "Stage 3: Alt & Alias Tags"}</option>
                  <option value={4}>{stageLabels["4"] || "Stage 4: Link Validation"}</option>
                  <option value={5}>{stageLabels["5"] || "Stage 5: Grammar & Spell Check"}</option>
                  {isFQA ? (
                    <>
                      <option value={6}>{stageLabels["6"] || "Stage 6: Review & Approval / LAUNCH (FQA)"}</option>
                      <option value={7}>{stageLabels["7"] || "Stage 7: Review & Approval (FQA)"}</option>
                    </>
                  ) : (
                    <option value={6}>{stageLabels["6"] || "Stage 6: Review & Approval"}</option>
                  )}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input 
                    type="checkbox" 
                    checked={newItemRequiresInput} 
                    onChange={e => {
                      setNewItemRequiresInput(e.target.checked);
                      if (e.target.checked) setNewItemHasOptions(false);
                    }} 
                    className="rounded text-indigo-600" 
                  />
                  Requires Text Input
                </label>
                {newItemRequiresInput && (
                  <Input 
                    placeholder="Input placeholder (e.g., Enter Campaign Name)" 
                    value={newItemPlaceholder}
                    onChange={e => setNewItemPlaceholder(e.target.value)}
                    className="flex-1"
                  />
                )}
                <label className="flex items-center gap-2 text-sm text-slate-700 ml-2">
                  <input 
                    type="checkbox" 
                    checked={newItemHasOptions} 
                    onChange={e => {
                      setNewItemHasOptions(e.target.checked);
                      if (e.target.checked) setNewItemRequiresInput(false);
                    }} 
                    className="rounded text-indigo-600" 
                  />
                  Has Dropdown
                </label>
                {newItemHasOptions && (
                  <Input 
                    placeholder="Options (comma separated)" 
                    value={newItemOptions}
                    onChange={e => setNewItemOptions(e.target.value)}
                    className="flex-1"
                  />
                )}
                <Button type="submit" className="gap-2 ml-auto">
                  <Plus className="w-4 h-4" /> Add Point
                </Button>
              </div>
            </form>

            <div className="space-y-6">
              {activeChecklist.items.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  No checkpoints defined for {activeTeam}.
                </div>
              ) : (
                [...new Set(activeChecklist.items.map(i => i.stage || 0))].sort((a: any, b: any) => Number(a) - Number(b)).map(stage => {
                  return (
                    <div key={stage} className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-2 rounded-md">{stageLabels[stage.toString()] || `Stage ${stage}`}</h3>
                      {activeChecklist.items.map((item, index) => {
                        if ((item.stage || 0) !== stage) return null;
                        return (
                          <div key={item.id} className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg group flex-col sm:flex-row">
                            <div className="flex flex-1 gap-3 items-start w-full">
                              <CheckCircle2 className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                              <div className="flex flex-col gap-1 flex-1">
                                {editingItemId === item.id ? (
                          <div className="flex flex-col gap-2 w-full">
                            <div className="flex items-center gap-2">
                              <Input 
                                value={editingItemText} 
                                onChange={(e) => setEditingItemText(e.target.value)}
                                className="h-8 text-sm flex-1"
                                autoFocus
                              />
                              <Button 
                                type="button" 
                                size="sm" 
                                onClick={() => handleSaveEdit(item.id)}
                                className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-700"
                              >
                                Save
                              </Button>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  setEditingItemId(null);
                                  setEditingItemRequiresInput(false);
                                  setEditingItemPlaceholder("");
                                  setEditingItemHasOptions(false);
                                  setEditingItemOptions("");
                                }}
                                className="h-8 px-3 text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={editingItemRequiresInput} 
                                  onChange={e => {
                                    setEditingItemRequiresInput(e.target.checked);
                                    if (e.target.checked) setEditingItemHasOptions(false);
                                  }} 
                                  className="rounded text-indigo-600" 
                                />
                                Requires Text Input
                              </label>
                              {editingItemRequiresInput && (
                                <Input 
                                  placeholder="Placeholder (e.g., Enter URL)" 
                                  value={editingItemPlaceholder}
                                  onChange={e => setEditingItemPlaceholder(e.target.value)}
                                  className="h-7 text-xs flex-1 max-w-[200px]"
                                />
                              )}
                              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer ml-2">
                                <input 
                                  type="checkbox" 
                                  checked={editingItemHasOptions} 
                                  onChange={e => {
                                    setEditingItemHasOptions(e.target.checked);
                                    if (e.target.checked) setEditingItemRequiresInput(false);
                                  }} 
                                  className="rounded text-indigo-600" 
                                />
                                Has Dropdown
                              </label>
                              {editingItemHasOptions && (
                                <Input 
                                  placeholder="Options (comma separated)" 
                                  value={editingItemOptions}
                                  onChange={e => setEditingItemOptions(e.target.value)}
                                  className="h-7 text-xs flex-1 max-w-[200px]"
                                />
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-sm text-slate-700 leading-relaxed">{item.text}</span>
                            {item.requiresInput && (
                              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-sm self-start">
                                Requires Input: {item.inputPlaceholder || "Text"}
                              </span>
                            )}
                            {item.options && item.options.length > 0 && (
                              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-sm self-start">
                                Dropdown: {item.options.join(", ")}
                              </span>
                            )}
                          </div>
                        )}
                        <select
                          className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 bg-slate-100 border-none outline-none px-2 py-0.5 rounded-sm self-start cursor-pointer hover:bg-slate-200"
                          value={item.stage === undefined ? 0 : item.stage}
                          onChange={(e) => handleChangeStage(item.id, Number(e.target.value))}
                        >
                          <option value={0}>{stageLabels["0"] || "All Stages (Global)"}</option>
                          <option value={1}>{stageLabels["1"] || "Stage 1: Details & Source"}</option>
                          <option value={2}>{stageLabels["2"] || "Stage 2: Visual Comparison"}</option>
                          <option value={3}>{stageLabels["3"] || "Stage 3: Alt & Alias Tags"}</option>
                          <option value={4}>{stageLabels["4"] || "Stage 4: Link Validation"}</option>
                          <option value={5}>{stageLabels["5"] || "Stage 5: Grammar & Spell Check"}</option>
                          {isFQA ? (
                            <>
                              <option value={6}>{stageLabels["6"] || "Stage 6: Review & Approval / LAUNCH (FQA)"}</option>
                              <option value={7}>{stageLabels["7"] || "Stage 7: Review & Approval (FQA)"}</option>
                            </>
                          ) : (
                            <option value={6}>{stageLabels["6"] || "Stage 6: Review & Approval"}</option>
                          )}
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-row items-center gap-1 self-end sm:self-auto">
                      {deletingItemId === item.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-bold text-rose-600 px-1">Delete?</span>
                          <Button 
                            type="button" 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDeleteItem(item.id)}
                            className="h-7 px-3 text-[12px] font-bold bg-rose-600 hover:bg-rose-700 shadow-none"
                          >
                            Confirm
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setDeletingItemId(null)}
                            className="h-7 px-3 text-[12px] font-semibold shadow-none border-slate-200"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleStartEdit(item)}
                            className="h-7 w-7 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                            title="Edit Checkpoint Text"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="icon" 
                            onClick={() => moveItemUp(index)}
                            disabled={index === 0}
                            className="h-7 w-7 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                            title="Move Up"
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
                            title="Move Down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setDeletingItemId(item.id)}
                            className="h-7 w-7 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                            title="Delete Checkpoint"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })
      )}
      </div>
    </CardContent>
  </Card>
</div>
</div>
);
}
