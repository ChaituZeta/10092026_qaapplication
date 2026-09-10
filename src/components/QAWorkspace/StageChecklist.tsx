import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Type } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getNormalizedStage } from "@/lib/checklist-storage";

interface StageChecklistProps {
  currentStep: number;
  checklists: any[];
  answers: Record<string, any>;
  setAnswers: (answers: Record<string, any>) => void;
  showError: boolean;
  disabled?: boolean;
  campaignMeta?: {
    campaignName?: string;
    team?: string;
    country?: string;
    versionName?: string;
    userEmail?: string;
    campaignStatus?: string;
  };
}

export function StageChecklist({ 
  currentStep, 
  checklists, 
  answers, 
  setAnswers, 
  showError, 
  disabled
}: StageChecklistProps) {
  const currentItems = checklists.filter(c => getNormalizedStage(c) === currentStep);
  
  if (currentItems.length === 0) return null;

  const completedCount = currentItems.filter(item => {
    const ans = answers[item.id];
    return ans && (ans.status === "Checked" || ans.status === "N/A");
  }).length;

  const handleToggleAll = () => {
    const allChecked = currentItems.every(item => answers[item.id]?.status === "Checked");
    const newAnswers = { ...answers };
    currentItems.forEach(item => {
      newAnswers[item.id] = {
        ...(answers[item.id] || {}),
        status: allChecked ? null : "Checked"
      };
    });
    setAnswers(newAnswers);
  };

  return (
    <Card className={cn("mb-3 border shadow-2xs transition-all", showError ? "border-rose-300 bg-rose-50/20" : "border-slate-200 bg-white")}>
      <CardContent className="p-2.5 sm:p-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className={cn("w-4 h-4 shrink-0", showError ? "text-rose-500" : "text-[#2b61d6]")} />
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs text-slate-800">Stage {currentStep} Checkpoints</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {completedCount}/{currentItems.length} Done
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Auto-saved
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleAll}
              disabled={disabled}
              className="text-[11px] h-6 px-2 font-medium text-slate-700 border-slate-300 hover:bg-slate-50 disabled:opacity-50"
            >
              {currentItems.every(item => answers[item.id]?.status === "Checked") ? "Uncheck All" : "Check All"}
            </Button>
          </div>
        </div>

        {showError && (
          <div className="flex items-center gap-1.5 text-[11px] text-rose-700 bg-rose-100/80 p-2 rounded-md font-medium border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
            <span>Please complete all mandatory checkpoints (mark each as Checked or N/A).</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 pt-0.5">
          {currentItems.map((item, index) => {
            const ans = answers[item.id] || { status: null, text: "", dropdownValue: "" };
            const isChecked = ans.status === "Checked";
            const isNA = ans.status === "N/A";
            const hasOptions = item.options && item.options.length > 0;
            
            // For a standard item with requiresInput, text is required if checked.
            // For a dropdown item, dropdownValue is required if checked.
            const isInvalid = showError && (
              !ans.status || 
              (hasOptions && isChecked && !ans.dropdownValue) ||
              (!hasOptions && item.requiresInput && isChecked && !ans.text?.trim())
            );
            
            return (
              <div 
                key={item.id} 
                className={cn(
                  "flex flex-col gap-1.5 p-2 rounded-md border transition-all text-xs",
                  isChecked ? "border-emerald-200 bg-emerald-50/30" :
                  isNA ? "border-slate-200 bg-slate-100/60 opacity-75" :
                  isInvalid ? "border-rose-300 bg-rose-50/60" : "border-slate-200 bg-slate-50/30 hover:border-slate-300"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <label className="flex items-start gap-2 cursor-pointer flex-1 min-w-0 select-none">
                    {!hasOptions && (
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        disabled={disabled}
                        onChange={(e) => {
                          if (disabled) return;
                          const newStatus = e.target.checked ? "Checked" : null;
                          setAnswers({ ...answers, [item.id]: { ...ans, status: newStatus } });
                        }}
                        className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer disabled:cursor-not-allowed shrink-0 mt-0.5"
                      />
                    )}
                    {hasOptions && (
                      <div className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 mt-0.5", isChecked ? "bg-emerald-500 border-emerald-500" : "border-slate-300")}>
                         {isChecked && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                    )}
                    <span className={cn("text-[11px] md:text-xs leading-snug font-medium", isChecked ? "text-slate-900 font-semibold" : isNA ? "text-slate-400 line-through" : "text-slate-700")}>
                      <span className="text-slate-400 font-semibold mr-1">{index + 1}.</span>
                      {item.text}
                    </span>
                  </label>

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) return;
                      const newStatus = isNA ? null : "N/A";
                      setAnswers({ ...answers, [item.id]: { ...ans, status: newStatus, text: newStatus === "N/A" ? "" : ans.text, dropdownValue: newStatus === "N/A" ? "" : ans.dropdownValue } });
                    }}
                    className={cn(
                      "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 transition-all cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed",
                      isNA 
                        ? "bg-slate-700 text-white border-slate-700" 
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-800"
                    )}
                  >
                    N/A
                  </button>
                </div>

                {hasOptions && !isNA && (
                  <div className="mt-1 pl-5">
                    <select
                      value={ans.dropdownValue || ""}
                      disabled={disabled}
                      onChange={(e) => {
                        if (disabled) return;
                        const val = e.target.value;
                        const newStatus = val ? "Checked" : null;
                        setAnswers({ ...answers, [item.id]: { ...ans, status: newStatus, dropdownValue: val } });
                      }}
                      className={cn(
                        "w-full h-8 text-[11px] rounded-md border bg-white px-2 cursor-pointer focus:ring-1 focus:ring-emerald-500 outline-none transition-colors",
                        isInvalid && !ans.dropdownValue ? "border-rose-400 bg-rose-50" : "border-slate-300"
                      )}
                    >
                      <option value="">-- Select an option --</option>
                      {item.options.map((opt: string, i: number) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                )}

                {item.requiresInput && isChecked && (
                  <div className="mt-0.5 pl-5 border-l-2 border-emerald-400">
                    <div className="relative">
                      <Type className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input 
                        placeholder={item.inputPlaceholder || "Enter details..."}
                        value={ans.text || ""}
                        disabled={disabled || (hasOptions && !!ans.dropdownValue)}
                        onChange={(e) => {
                          if (disabled) return;
                          setAnswers({ ...answers, [item.id]: { ...ans, text: e.target.value } });
                        }}
                        className={cn("pl-7 h-7 text-[11px] bg-white disabled:bg-slate-100 disabled:text-slate-400", (!hasOptions && isInvalid && !ans.text?.trim()) ? "border-rose-400 focus-visible:ring-rose-500" : "border-slate-200")}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

