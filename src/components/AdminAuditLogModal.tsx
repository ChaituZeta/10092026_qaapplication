import React, { useState, useEffect } from "react";
import { 
  X, 
  History, 
  Search, 
  Filter, 
  ShieldCheck, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  FolderInput, 
  RefreshCw,
  User,
  Calendar,
  Database
} from "lucide-react";
import { getCampaignLogs } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface AdminAuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

export function AdminAuditLogModal({ isOpen, onClose, userRole = "admin" }: AdminAuditLogModalProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await getCampaignLogs();
      setLogs(data);
    } catch (e) {
      console.error("[AuditLog] Failed to fetch logs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter(log => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchEmail = (log.user_email || "").toLowerCase().includes(q);
      const matchType = (log.action_type || "").toLowerCase().includes(q);
      const matchDetails = (log.details || "").toLowerCase().includes(q);
      const matchId = (log.campaign_id || "").toLowerCase().includes(q);
      if (!matchEmail && !matchType && !matchDetails && !matchId) return false;
    }

    if (actionFilter === "deletions") {
      const t = (log.action_type || "").toLowerCase();
      return t.includes("delete");
    }

    if (actionFilter === "status") {
      const t = (log.action_type || "").toLowerCase();
      return t.includes("approve") || t.includes("fail") || t.includes("status");
    }

    if (actionFilter === "edits") {
      const t = (log.action_type || "").toLowerCase();
      return t.includes("edit") || t.includes("update") || t.includes("save");
    }

    return true;
  });

  const getActionBadge = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("delete")) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 rounded flex items-center gap-1">
          <Trash2 className="w-3 h-3 text-rose-600" />
          {type}
        </span>
      );
    }
    if (t.includes("approve")) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          {type}
        </span>
      );
    }
    if (t.includes("fail")) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded flex items-center gap-1">
          <XCircle className="w-3 h-3 text-amber-600" />
          {type}
        </span>
      );
    }
    if (t.includes("move")) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300 rounded flex items-center gap-1">
          <FolderInput className="w-3 h-3 text-purple-600" />
          {type}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 rounded flex items-center gap-1">
        <Edit3 className="w-3 h-3 text-blue-600" />
        {type}
      </span>
    );
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return "N/A";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }) + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#2b61d6] uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4 text-[#2b61d6]" />
              <span>Centralized Security & Operations</span>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Campaign Operations Audit Logs
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Centralized, immutable record tracking all campaign deletions, status changes, and administrator edits.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadLogs}
              className="p-2 text-slate-500 hover:text-[#2b61d6] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Refresh Audit Logs"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter logs by user email, campaign ID, or action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:ring-1 focus:ring-[#2b61d6]"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            {[
              { id: "all", label: "All Logs" },
              { id: "deletions", label: "Deletions Only" },
              { id: "status", label: "Status Changes" },
              { id: "edits", label: "Edits & Updates" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActionFilter(tab.id)}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-all cursor-pointer text-[11px]",
                  actionFilter === tab.id ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-[#2b61d6]" />
              <span className="text-xs font-medium">Loading centralized audit records...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-xs">
              <History className="w-8 h-8 text-slate-300 mb-2" />
              <span>No audit logs match your search criteria.</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User / Admin</th>
                  <th className="px-4 py-3">Action Executed</th>
                  <th className="px-4 py-3">Details & Target</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100">
                {filteredLogs.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 shrink-0 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDateTime(log.created_at)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 shrink-0 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.user_email || "System"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 shrink-0 whitespace-nowrap">
                      {getActionBadge(log.action_type)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <p className="font-medium text-slate-800 break-words">{log.details}</p>
                      {log.campaign_id && (
                        <span className="text-[10px] text-slate-400 font-mono">ID: {log.campaign_id}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between shrink-0 text-xs">
          <span className="text-slate-400">
            Total records: <strong className="text-slate-700">{filteredLogs.length}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close Audit Log
          </button>
        </div>
      </div>
    </div>
  );
}
