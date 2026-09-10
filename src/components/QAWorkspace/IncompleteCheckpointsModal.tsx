import React from 'react';
import { AlertTriangle, CheckSquare, XCircle, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface MissingCheckpoint {
  id: string;
  label: string;
  reason?: string;
}

interface IncompleteCheckpointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stageNumber: number;
  stageTitle: string;
  missingCheckpoints: MissingCheckpoint[];
}

export function IncompleteCheckpointsModal({
  isOpen,
  onClose,
  stageNumber,
  stageTitle,
  missingCheckpoints
}: IncompleteCheckpointsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-rose-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-rose-50/90 border-b border-rose-100 p-5 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0 text-rose-600 shadow-2xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold uppercase tracking-wider mb-1 border border-rose-200">
                Action Required • Stage {stageNumber}
              </span>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Mandatory Checkpoints Incomplete
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                You must complete all required checkpoints in <strong className="text-slate-800">Stage {stageNumber}: {stageTitle}</strong> before advancing to the next stage.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-rose-100/50 transition-colors shrink-0 cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body - List of missing checkpoints */}
        <div className="p-5 overflow-y-auto space-y-3 bg-slate-50/50 flex-1 min-h-0">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wide">
            <span className="flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-rose-500" />
              <span>Unchecked Items ({missingCheckpoints.length})</span>
            </span>
            <span className="text-rose-600 font-semibold text-[10px] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              Mandatory
            </span>
          </div>

          <div className="space-y-2 pt-1">
            {missingCheckpoints.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-3 bg-white rounded-xl border border-rose-200/90 shadow-2xs flex items-start gap-3 transition-all hover:border-rose-300"
              >
                <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 leading-snug">
                    {item.label}
                  </p>
                  {item.reason && (
                    <p className="text-[11px] text-amber-800 mt-1 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80 inline-block">
                      {item.reason}
                    </p>
                  )}
                </div>
                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
            Please mark each item as <strong className="text-slate-700">Checked</strong> or <strong className="text-slate-700">N/A</strong>.
          </span>
          <Button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-9 px-5 rounded-lg shadow-xs flex items-center justify-center gap-2 cursor-pointer ml-auto"
          >
            <span>Complete Missing Checkpoints</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
