import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  title: string;
}

interface QAWizardProps {
  steps: Step[];
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onStepClick?: (stepNum: number) => void;
  onCancel: () => void;
  onSubmit: (e?: React.FormEvent) => void;
  isSubmitting?: boolean;
  hideStepper?: boolean;
  children: React.ReactNode;
}

export function QAWizard({
  steps,
  currentStep,
  onNext,
  onPrev,
  onStepClick,
  onCancel,
  onSubmit,
  isSubmitting,
  hideStepper = false,
  children
}: QAWizardProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
      {/* Wizard Header / Navigation Action Bar */}
      <div className={cn("px-4 md:px-8 py-2.5 bg-white border-b border-slate-200 shrink-0 shadow-2xs", !hideStepper && "py-3")}>
        {/* Top Back & Next Stage Navigation Bar */}
        <div className={cn("flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap", !hideStepper && "pb-2.5 mb-2.5 border-b border-slate-100")}>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Back to Campaigns List"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#2b61d6]" />
              <span>← Back to Campaigns</span>
            </button>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={onPrev}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title="Go to Previous Stage"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                <span>Previous Stage</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-auto">
            <div className="text-xs font-medium text-slate-500 hidden md:block">
              Current Stage: <span className="font-bold text-slate-800">Stage {currentStep} of {steps.length} - {steps[currentStep - 1]?.title}</span>
            </div>

            {currentStep < steps.length ? (
              <Button
                type="button"
                size="sm"
                onClick={onNext}
                className="gap-1.5 bg-[#2b61d6] hover:bg-blue-700 text-white text-xs font-bold shadow-xs px-4 h-8.5 rounded-lg cursor-pointer"
              >
                <span>Next Stage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="sm"
                onClick={onSubmit}
                disabled={isSubmitting}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs px-4 h-8.5 rounded-lg cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? "Saving Campaign..." : "Submit & Save Campaign"}</span>
              </Button>
            )}
          </div>
        </div>

        {!hideStepper && (
          <>
            <div className="w-full flex items-center justify-between mb-3 overflow-x-auto pb-1 min-w-0 scrollbar-none gap-2">
              {steps.map((step, index) => {
                const stepNum = index + 1;
                const isCompleted = currentStep > stepNum;
                const isCurrent = currentStep === stepNum;

                return (
                  <React.Fragment key={step.id}>
                    <button
                      type="button"
                      onClick={() => onStepClick && onStepClick(stepNum)}
                      className={cn(
                        "flex items-center gap-2 shrink-0 rounded-lg p-1 transition-colors text-left",
                        onStepClick ? "hover:bg-slate-100 cursor-pointer" : "cursor-default"
                      )}
                      title={`Go to Step ${stepNum}: ${step.title}`}
                    >
                      <div
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0",
                          isCompleted
                            ? "bg-emerald-600 text-white"
                            : isCurrent
                            ? "bg-[#2b61d6] text-white shadow-xs"
                            : "bg-slate-100 text-slate-500 border border-slate-300"
                        )}
                      >
                        {isCompleted ? <Check className="w-3.5 h-3.5" /> : stepNum}
                      </div>
                      <span
                        className={cn(
                          "text-xs font-semibold tracking-tight whitespace-nowrap",
                          isCurrent ? "text-slate-900 font-bold" : isCompleted ? "text-slate-700" : "text-slate-400"
                        )}
                      >
                        {step.title}
                      </span>
                    </button>
                    {index < steps.length - 1 && (
                      <div className={cn("h-0.5 min-w-[20px] flex-1 mx-2 transition-colors shrink-0", stepNum < currentStep ? "bg-emerald-500" : "bg-slate-200")} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            
            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-[#2b61d6] h-full transition-all duration-300 ease-in-out" 
                style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* Main Step Content */}
      <div className="flex-1 p-3 md:p-6 bg-slate-100/60 flex flex-col overflow-y-auto min-h-0">
        <div className="w-full flex-1 flex flex-col min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}
