import React from "react";
import { 
  FileText, 
  ShieldCheck, 
  ClipboardCheck, 
  Check, 
  ChevronRight, 
  ArrowRight,
  ListChecks,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CampaignProgressStep {
  id: string;
  title: string;
}

interface CampaignProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: CampaignProgressStep[];
  checklists?: any[];
  checklistAnswers?: Record<string, any>;
  onStepClick?: (stepNum: number) => void;
  campaignStatus?: string;
  isApprovedLocked?: boolean;
}

type MacroPhase = "setup" | "validation" | "checklist";

interface MacroPhaseConfig {
  key: MacroPhase;
  name: string;
  shortName: string;
  subtitle: string;
  stepRange: number[]; // e.g. [1] or [2, 3, 4, 5] or [6]
  icon: React.ElementType;
}

export function CampaignProgressIndicator({
  currentStep,
  totalSteps,
  steps,
  checklists = [],
  checklistAnswers = {},
  onStepClick,
  campaignStatus = "Draft",
  isApprovedLocked = false
}: CampaignProgressIndicatorProps) {
  // Define the 3 Macro Phases: Setup -> Validation -> Checklist
  const validationSteps = React.useMemo(() => {
    const arr: number[] = [];
    for (let i = 2; i < totalSteps; i++) {
      arr.push(i);
    }
    return arr;
  }, [totalSteps]);

  const macroPhases: MacroPhaseConfig[] = [
    {
      key: "setup",
      name: "1. Setup",
      shortName: "Setup",
      subtitle: "Details, Target Region & Source",
      stepRange: [1],
      icon: FileText
    },
    {
      key: "validation",
      name: "2. Validation",
      shortName: "Validation",
      subtitle: "Visuals, Tags, UTMs & Grammar",
      stepRange: validationSteps,
      icon: ShieldCheck
    },
    {
      key: "checklist",
      name: "3. Checklist & Sign-off",
      shortName: "Checklist",
      subtitle: "QA Audits, Export & Approval",
      stepRange: [totalSteps],
      icon: ClipboardCheck
    }
  ];

  // Determine current active macro phase
  const currentMacroPhase: MacroPhase = 
    currentStep === 1 
      ? "setup" 
      : currentStep === totalSteps 
      ? "checklist" 
      : "validation";

  // Calculate overall checklist completion percentage
  const totalCheckpoints = checklists.length;
  const answeredCheckpoints = React.useMemo(() => {
    return Object.values(checklistAnswers).filter((val) => {
      if (typeof val === "boolean") return val === true;
      if (val && typeof val === "object") return val.status === "Checked" || val.status === "N/A";
      return false;
    }).length;
  }, [checklistAnswers]);

  // Overall workflow progress calculation:
  // Step progress represents 70% of completion, checklist answers represent 30%
  const stepPercentage = Math.round(((currentStep - 1) / Math.max(totalSteps - 1, 1)) * 100);
  const checklistPercentage = totalCheckpoints > 0 
    ? Math.round((answeredCheckpoints / totalCheckpoints) * 100) 
    : 0;
  
  const overallProgress = currentStep === totalSteps && answeredCheckpoints === totalCheckpoints
    ? 100
    : Math.min(Math.round(stepPercentage * 0.7 + checklistPercentage * 0.3), 98);

  const currentStepData = steps[currentStep - 1] || { id: "unknown", title: `Stage ${currentStep}` };

  return (
    <div className="w-full bg-white border-b border-slate-200/90 shadow-2xs shrink-0 select-none">
      {/* Primary Global Flow Bar: Setup -> Validation -> Checklist */}
      <div className="px-4 md:px-8 py-3 bg-gradient-to-r from-slate-50/70 via-white to-slate-50/70">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Macro Stages Visualizer */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {macroPhases.map((phase, idx) => {
              const isCurrentPhase = currentMacroPhase === phase.key;
              const isPastPhase = 
                (phase.key === "setup" && currentStep > 1) ||
                (phase.key === "validation" && currentStep === totalSteps);
              
              const isClickable = !isApprovedLocked && onStepClick;
              const targetStep = phase.stepRange[0];
              const Icon = phase.icon;

              return (
                <React.Fragment key={phase.key}>
                  <button
                    type="button"
                    onClick={() => {
                      if (isClickable && onStepClick) {
                        onStepClick(targetStep);
                      }
                    }}
                    disabled={isApprovedLocked}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left shrink-0 group border",
                      isCurrentPhase
                        ? "bg-blue-50/90 border-[#2b61d6] shadow-xs ring-2 ring-blue-100/80"
                        : isPastPhase
                        ? "bg-emerald-50/70 border-emerald-200/80 hover:bg-emerald-100/60"
                        : "bg-white border-slate-200/80 hover:bg-slate-50 opacity-70 hover:opacity-100",
                      isClickable ? "cursor-pointer" : "cursor-default"
                    )}
                    title={`Jump to ${phase.name}`}
                  >
                    {/* Phase Icon or Check */}
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0 font-bold text-xs",
                        isCurrentPhase
                          ? "bg-[#2b61d6] text-white shadow-xs"
                          : isPastPhase
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-500 border border-slate-200 group-hover:border-slate-300"
                      )}
                    >
                      {isPastPhase ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <Icon className="w-3.5 h-3.5" />
                      )}
                    </div>

                    {/* Phase Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "text-xs font-bold whitespace-nowrap tracking-tight",
                            isCurrentPhase
                              ? "text-blue-900 font-extrabold"
                              : isPastPhase
                              ? "text-emerald-950 font-bold"
                              : "text-slate-600 font-medium"
                          )}
                        >
                          {phase.name}
                        </span>

                        {isCurrentPhase && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
                        )}
                      </div>

                      <p className="text-[10px] text-slate-500 truncate hidden xl:block max-w-[180px]">
                        {phase.subtitle}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-wider hidden sm:inline-block",
                        isCurrentPhase
                          ? "bg-blue-600 text-white"
                          : isPastPhase
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-400"
                      )}
                    >
                      {isPastPhase ? "Done" : isCurrentPhase ? "Active" : "Pending"}
                    </span>
                  </button>

                  {/* Flow Arrow between Macro Stages */}
                  {idx < macroPhases.length - 1 && (
                    <div className="flex items-center text-slate-300 shrink-0 px-0.5">
                      <ArrowRight className="w-4 h-4 text-slate-400 stroke-[2.5]" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Right Side: Overall Progress Metrics */}
          <div className="flex items-center gap-4 shrink-0 justify-between lg:justify-end border-t lg:border-t-0 pt-2 lg:pt-0 border-slate-100">
            {/* Progress Bar & Percentage */}
            <div className="flex flex-col gap-1 w-36 sm:w-44">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-600">Workflow Progress</span>
                <span className="font-bold text-[#2b61d6]">{overallProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/80 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(overallProgress, 4)}%` }}
                />
              </div>
            </div>

            {/* Checkpoint Counter Badge */}
            {totalCheckpoints > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100/90 border border-slate-200 text-slate-700 text-xs shrink-0">
                <ListChecks className="w-3.5 h-3.5 text-[#2b61d6]" />
                <span className="font-medium">
                  <strong className="text-slate-900 font-bold">{answeredCheckpoints}</strong>
                  <span className="text-slate-400">/{totalCheckpoints}</span> checks
                </span>
              </div>
            )}

            {/* Current Active Stage Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50/80 border border-blue-200 text-blue-900 text-xs shrink-0 font-medium">
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700">Stage {currentStep}:</span>
              <span className="font-bold text-slate-900">{currentStepData.title}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
