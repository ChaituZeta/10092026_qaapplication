import React, { useState } from 'react';
import { CheckSquare, X, ChevronLeft, CheckCircle2, MinusCircle, HelpCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getNormalizedStage } from '@/lib/checklist-storage';

export interface ChecklistItem {
  id: string;
  text: string;
  stage?: number;
  requiresInput?: boolean;
  inputPlaceholder?: string;
  options?: string[];
}

interface MasterChecklistSidebarProps {
  checklists: ChecklistItem[];
  answers: Record<string, { status: string; text?: string; dropdownValue?: string }>;
  onToggleItem?: (itemId: string, newStatus: 'Checked' | null) => void;
  disabled?: boolean;
}

export function MasterChecklistSidebar({ 
  checklists, 
  answers, 
  onToggleItem,
  disabled 
}: MasterChecklistSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case 'Checked':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'N/A':
        return <MinusCircle className="w-4 h-4 text-slate-400 shrink-0" />;
      default:
        return <HelpCircle className="w-4 h-4 text-amber-500 shrink-0" />;
    }
  };

  const getStageName = (stage: number) => {
    const stages: Record<number, string> = {
      1: "1. Details & Source",
      2: "2. Visual Comparison",
      3: "3. Alt & Alias Tags",
      4: "4. Link Validation",
      5: "5. Grammar & Spell Check",
      6: "6. Review & Launch"
    };
    return stages[stage] || `Stage ${stage}`;
  };

  // Group checklists strictly by normalized stage (1-6)
  const grouped = checklists.reduce((acc, item) => {
    const s = getNormalizedStage(item);
    if (!acc[s]) acc[s] = [];
    acc[s].push(item);
    return acc;
  }, {} as Record<number, ChecklistItem[]>);

  // Calculate overall metrics
  const totalCount = checklists.length;
  const completedCount = checklists.filter(i => {
    const s = answers[i.id]?.status;
    return s === 'Checked' || s === 'N/A';
  }).length;
  const overallPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <>
      {/* Trigger Zone / Button */}
      <div 
        className={cn(
          "fixed top-1/2 right-0 -translate-y-1/2 z-[100] flex items-center transition-transform duration-300 select-none",
          isOpen ? "translate-x-full" : "translate-x-0"
        )}
        onClick={() => setIsOpen(true)}
        title="Open Master Checklist"
      >
        <button 
          type="button"
          className="bg-[#2b61d6] hover:bg-blue-700 text-white p-2.5 rounded-l-lg shadow-xl flex flex-col items-center gap-2 transition-all border border-r-0 border-blue-500 cursor-pointer group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span style={{ writingMode: 'vertical-rl' }} className="font-bold text-[11px] tracking-widest uppercase">
            MASTER CHECKLIST
          </span>
          <span className="text-[10px] font-black bg-white text-[#2b61d6] px-1 py-0.5 rounded-full mt-1">
            {completedCount}/{totalCount}
          </span>
        </button>
      </div>

      {/* Backdrop for easy closing */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs z-[100] transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <div 
        className={cn(
          "fixed top-0 right-0 h-full w-[430px] max-w-[92vw] bg-white shadow-2xl border-l border-slate-200 z-[101] transition-transform duration-300 flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-600 rounded-md">
                <CheckSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-white">Master QA Checklist</h2>
                <p className="text-[11px] text-slate-400">All stage checkpoints stay synchronized</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setIsOpen(false)} 
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Overall Progress Bar */}
          <div className="mt-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Overall Progress</span>
              <span className="font-bold text-emerald-400">{completedCount} of {totalCount} ({overallPercent}%)</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${overallPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* List of Stages & Checkpoints */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
          {Object.entries(grouped)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([stageStr, items]) => {
              const stage = Number(stageStr);
              const total = items.length;
              const completed = items.filter(i => {
                const s = answers[i.id]?.status;
                return s === 'Checked' || s === 'N/A';
              }).length;
              const isStageDone = completed === total && total > 0;

              return (
                <div key={stage} className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className={cn(
                    "flex items-center justify-between px-3.5 py-2.5 border-b",
                    isStageDone ? "bg-emerald-50/60 border-emerald-200" : "bg-slate-100/70 border-slate-200"
                  )}>
                    <div className="flex items-center gap-2">
                      {isStageDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-slate-400 flex items-center justify-center text-[10px] font-bold text-slate-600">
                          {stage}
                        </div>
                      )}
                      <h3 className="text-xs font-bold text-slate-800">{getStageName(stage)}</h3>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[11px] font-bold border",
                      isStageDone 
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
                        : "bg-white text-slate-700 border-slate-300"
                    )}>
                      {completed}/{total} Done
                    </span>
                  </div>

                  <div className="p-2 space-y-1.5 divide-y divide-slate-100">
                    {items.map((item, idx) => {
                      const ans = answers[item.id] as any;
                      const isChecked = ans?.status === 'Checked';
                      const isNA = ans?.status === 'N/A';

                      return (
                        <div 
                          key={item.id} 
                          className={cn(
                            "flex items-start gap-2.5 p-2 rounded-lg transition-colors text-xs pt-2",
                            isChecked ? "bg-emerald-50/40" : isNA ? "bg-slate-50 opacity-70" : "hover:bg-slate-50"
                          )}
                        >
                          {/* Interactive checkbox if toggle handler is passed */}
                          {onToggleItem ? (
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => onToggleItem(item.id, isChecked ? null : 'Checked')}
                              className={cn(
                                "w-4 h-4 rounded mt-0.5 shrink-0 border flex items-center justify-center transition-all cursor-pointer",
                                isChecked 
                                  ? "bg-emerald-600 border-emerald-600 text-white" 
                                  : "border-slate-300 bg-white hover:border-slate-400"
                              )}
                              title={isChecked ? "Uncheck checkpoint" : "Check checkpoint"}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>
                          ) : (
                            <div className="mt-0.5 shrink-0">
                              {getStatusIcon(ans?.status)}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-xs leading-snug break-words",
                              isChecked ? "text-slate-900 font-semibold" : isNA ? "text-slate-400 line-through" : "text-slate-700"
                            )}>
                              <span className="text-slate-400 font-medium mr-1.5">{idx + 1}.</span>
                              {item.text}
                            </p>
                            {(ans?.text || ans?.dropdownValue) && (
                              <div className="mt-1.5 p-1.5 bg-slate-50 border border-slate-200/70 rounded text-[11px] text-slate-600 italic break-words">
                                "{ans.dropdownValue || ans.text}"
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </>
  );
}
