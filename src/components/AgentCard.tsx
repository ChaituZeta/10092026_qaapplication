import type * as React from "react";
import { Bot, Sparkles, CheckSquare, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type AIAgent = { 
  id: string; 
  name: string; 
  description: string; 
  rules: string; 
  is_default: boolean; 
  assigned_teams?: string[];
  model?: string;
  welcome_message?: string;
  conversation_starters?: string[];
  capabilities?: string[];
  mcp_servers?: string[];
};

interface AgentCardProps {
  key?: React.Key;
  agent: AIAgent;
  variant: 'library' | 'admin';
  onTryItNow?: (id: string) => void;
  onEdit?: (agent: AIAgent) => void;
  onDelete?: (id: string) => void;
}

export function AgentCard({ agent, variant, onTryItNow, onEdit, onDelete }: AgentCardProps) {
  if (variant === 'library') {
    return (
      <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full group">
        <div className="h-32 bg-gradient-to-br from-fuchsia-600 to-indigo-600 w-full shrink-0 relative">
          {agent.is_default && (
            <div className="absolute top-3 right-3 bg-white/20 backdrop-blur border border-white/30 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
              DEFAULT
            </div>
          )}
        </div>
        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 mb-2">
            <CheckSquare className="w-3 h-3" /> Zeta Verified
          </div>
          
          <h4 className="text-base font-bold text-slate-900 mb-1 line-clamp-1">{agent.name}</h4>
          <p className="text-sm text-slate-500 mb-6 line-clamp-3 min-h-[60px] leading-relaxed">
            {agent.description || "No description provided."}
          </p>
          
          <div className="mt-auto flex items-center justify-end">
            <button
              onClick={() => onTryItNow?.(agent.id)}
              className="text-indigo-600 font-semibold text-sm flex items-center gap-1 hover:text-indigo-700 transition-colors group-hover:underline"
            >
              Try It Now <span className="text-[10px] ml-0.5">❯</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Admin / My Agents view
  return (
    <div className={cn(
      "border rounded-2xl p-6 transition-all hover:shadow-md flex flex-col h-full",
      agent.is_default ? "border-indigo-300 bg-indigo-50/30" : "border-slate-200 bg-white"
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center shrink-0 shadow-inner">
          <Bot className="w-6 h-6 text-white" />
        </div>
        
        {agent.is_default && (
          <span className="px-2.5 py-1 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-full">
            SYSTEM DEFAULT
          </span>
        )}
      </div>

      <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-1">{agent.name}</h3>
      <p className="text-sm text-slate-500 mb-6 flex-1 line-clamp-3 leading-relaxed">
        {agent.description}
      </p>

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
        <button
          onClick={() => onTryItNow?.(agent.id)}
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
        >
          <Sparkles className="w-4 h-4" /> Try It
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit?.(agent)}
            className="p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 rounded-lg transition-colors"
            title="Edit Agent Settings"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {!agent.is_default && (
            <button
              onClick={() => onDelete?.(agent.id)}
              className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors"
              title="Delete Agent"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
