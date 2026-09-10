import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  getAllCampaigns, 
  restoreCampaign, 
  permanentlyDeleteCampaign, 
  CampaignRecord 
} from "@/lib/campaign-storage";
import { logAction, getCampaignLogs } from "@/lib/logger";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { 
  Trash2, 
  RotateCcw, 
  Search, 
  Eye, 
  AlertTriangle, 
  Calendar, 
  User, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  X, 
  Globe, 
  ShieldCheck, 
  FileText,
  RefreshCw,
  Folder,
  ChevronRight,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";

export function RecycleBin({ userEmail = "admin@example.com", userRole }: { userEmail?: string; userRole?: string }) {
  const [deletedCampaigns, setDeletedCampaigns] = useState<CampaignRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Inspect Modal
  const [inspectCampaign, setInspectCampaign] = useState<CampaignRecord | null>(null);
  const [inspectLogs, setInspectLogs] = useState<any[]>([]);

  // Permanent Delete Modal
  const [deleteConfirmCampaign, setDeleteConfirmCampaign] = useState<CampaignRecord | null>(null);
  const [isEmptyingBin, setIsEmptyingBin] = useState(false);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const all = await getAllCampaigns();
      const deletedOnly = all.filter(c => c.is_deleted === true);
      // Sort by deleted_at descending
      deletedOnly.sort((a, b) => new Date(b.deleted_at || b.updated_at || 0).getTime() - new Date(a.deleted_at || a.updated_at || 0).getTime());
      setDeletedCampaigns(deletedOnly);
    } catch (e) {
      console.error("[RecycleBin] Error loading deleted campaigns:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleSynced = () => loadData();
    window.addEventListener("database-synced", handleSynced);
    window.addEventListener("focus", loadData);
    window.addEventListener("storage", handleSynced);
    const pollInterval = setInterval(loadData, 10000);

    let realtimeChannel: any = null;
    if (isSupabaseConfigured()) {
      try {
        realtimeChannel = supabase
          .channel("recycle-bin-realtime")
          .on("postgres_changes", { event: "*", schema: "public", table: "campaigns" }, () => {
            loadData();
          })
          .subscribe();
      } catch (err) {
        console.warn("[RecycleBin] Supabase realtime subscription error:", err);
      }
    }

    return () => {
      window.removeEventListener("database-synced", handleSynced);
      window.removeEventListener("focus", loadData);
      window.removeEventListener("storage", handleSynced);
      clearInterval(pollInterval);
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, []);

  const handleRestore = async (campaign: CampaignRecord) => {
    const targetId = String(campaign.id);
    // OPTIMISTIC UI UPDATE: Remove from deleted list instantly so animation plays immediately
    setDeletedCampaigns(prev => prev.filter(c => String(c.id) !== targetId));
    setToastNotice(`Campaign "${campaign.name}" restored successfully to Campaigns.`);
    setTimeout(() => setToastNotice(null), 4000);

    try {
      await restoreCampaign(targetId, userEmail);
    } catch (e) {
      console.error("[RecycleBin] Restore error:", e);
      setToastNotice(`Failed to restore campaign "${campaign.name}".`);
      setTimeout(() => setToastNotice(null), 4000);
      loadData();
    }
  };

  const handlePermanentDelete = async (campaign: CampaignRecord) => {
    const targetId = String(campaign.id);
    // OPTIMISTIC UI UPDATE: Remove from deleted list instantly
    setDeletedCampaigns(prev => prev.filter(c => String(c.id) !== targetId));
    setToastNotice(`Campaign "${campaign.name}" permanently deleted.`);
    setTimeout(() => setToastNotice(null), 4000);
    setDeleteConfirmCampaign(null);

    try {
      await permanentlyDeleteCampaign(targetId, userEmail);
      await logAction(userEmail, "Permanent Delete", `Permanently deleted campaign "${campaign.name}" from Recycle Bin`, targetId);
    } catch (e) {
      console.error("[RecycleBin] Permanent delete error:", e);
      setToastNotice(`Failed to permanently delete campaign "${campaign.name}".`);
      setTimeout(() => setToastNotice(null), 4000);
      loadData();
    }
  };

  const handleEmptyBin = async () => {
    setIsEmptyingBin(true);
    try {
      for (const campaign of deletedCampaigns) {
        await permanentlyDeleteCampaign(String(campaign.id), userEmail);
      }
      await logAction(userEmail, "Empty Recycle Bin", `Permanently purged all ${deletedCampaigns.length} campaigns from Recycle Bin`);
      setToastNotice(`Recycle Bin emptied successfully (${deletedCampaigns.length} item(s) purged).`);
      setTimeout(() => setToastNotice(null), 4000);
      setShowEmptyConfirm(false);
      await loadData();
    } catch (e) {
      console.error("[RecycleBin] Empty bin error:", e);
      setToastNotice(`Failed to empty Recycle Bin.`);
      setTimeout(() => setToastNotice(null), 4000);
    } finally {
      setIsEmptyingBin(false);
    }
  };

  const handleOpenInspect = async (campaign: CampaignRecord) => {
    setInspectCampaign(campaign);
    try {
      const logs = await getCampaignLogs(String(campaign.id), campaign.name);
      setInspectLogs(logs);
    } catch (e) {
      setInspectLogs([]);
    }
  };

  const filteredCampaigns = deletedCampaigns.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.deleted_by || "").toLowerCase().includes(q) ||
      (c.team || "").toLowerCase().includes(q) ||
      (c.country || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 font-sans">
      {/* Toast Notice */}
      {toastNotice && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-3">
          <span>{toastNotice}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Recycle Bin</h1>
              <p className="text-xs text-slate-500">
                View soft-deleted campaigns, inspect deleted records, or permanently restore/delete
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search deleted campaigns..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          {deletedCampaigns.length > 0 && (
            <button
              onClick={() => setShowEmptyConfirm(true)}
              className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              Empty Recycle Bin ({deletedCampaigns.length})
            </button>
          )}

          <button
            onClick={loadData}
            title="Refresh Recycle Bin"
            className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </header>

      {/* Content Body */}
      <div className="flex-1 p-6 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium text-slate-500">Loading Recycle Bin items...</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto mt-12 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              {searchQuery ? "No matching deleted campaigns" : "Recycle Bin is Empty"}
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              {searchQuery 
                ? `No items match "${searchQuery}". Try a different search term.` 
                : "When campaigns are deleted, they will appear here with deletion timestamps and author info before permanent deletion."}
            </p>
            <Link
              to="/campaigns"
              className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Back to Active Campaigns
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Campaign Name</th>
                  <th className="py-3 px-4">Team & Region</th>
                  <th className="py-3 px-4">Status Before Delete</th>
                  <th className="py-3 px-4">Deleted By</th>
                  <th className="py-3 px-4">Deleted Date & Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                <AnimatePresence mode="popLayout" initial={false}>
                  {filteredCampaigns.map((c) => {
                    const deletedDate = c.deleted_at ? new Date(c.deleted_at).toLocaleString() : (c.updated_at ? new Date(c.updated_at).toLocaleString() : "Unknown");
                    const deletedBy = c.deleted_by || c.userEmail || c.createdBy || "System User";

                    return (
                      <motion.tr 
                        key={c.id} 
                        layout
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 30, scale: 0.96, transition: { duration: 0.22, ease: "easeInOut" } }}
                        className="hover:bg-slate-50/60 transition-colors group"
                      >
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                          <div>
                            <span className="block font-bold text-slate-900">{c.name}</span>
                            <span className="text-[10px] font-normal text-slate-400">ID: {String(c.id).substring(0, 8)}...</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {c.team || "HP-APJ"}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[10px]">
                            {c.country || "IN"}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1",
                          c.status === "Approved" ? "bg-emerald-100 text-emerald-800" :
                          c.status === "Failed" ? "bg-rose-100 text-rose-800" :
                          c.status === "In Progress" ? "bg-blue-100 text-blue-800" :
                          "bg-amber-100 text-amber-800"
                        )}>
                          {c.status || "Draft"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {deletedBy.substring(0, 1).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-800 truncate max-w-[160px]" title={deletedBy}>
                            {deletedBy}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{deletedDate}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenInspect(c)}
                            title="Inspect campaign details & checkpoints without restoring"
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            <span>View</span>
                          </button>

                          <button
                            onClick={() => handleRestore(c)}
                            title="Restore campaign back to active list"
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md font-semibold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Restore</span>
                          </button>

                          <button
                            onClick={() => setDeleteConfirmCampaign(c)}
                            title="Permanently remove campaign from database"
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md font-semibold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INSPECT MODAL (Read-Only Preview without restoring) */}
      {inspectCampaign && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base">{inspectCampaign.name}</h3>
                    <span className="px-2 py-0.5 rounded bg-rose-500/30 text-rose-300 font-bold text-[10px] uppercase">
                      In Recycle Bin
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Deleted by <span className="text-slate-200 font-semibold">{inspectCampaign.deleted_by || inspectCampaign.userEmail}</span> on {inspectCampaign.deleted_at ? new Date(inspectCampaign.deleted_at).toLocaleString() : "Unknown"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectCampaign(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Info grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="block text-slate-400 font-medium mb-1">Team</span>
                  <span className="font-bold text-slate-800">{inspectCampaign.team || "HP-APJ"}</span>
                </div>
                <div>
                  <span className="block text-slate-400 font-medium mb-1">Country</span>
                  <span className="font-bold text-slate-800">{inspectCampaign.country || "IN"}</span>
                </div>
                <div>
                  <span className="block text-slate-400 font-medium mb-1">Version</span>
                  <span className="font-bold text-slate-800">{inspectCampaign.versionName || "Standard"}</span>
                </div>
                <div>
                  <span className="block text-slate-400 font-medium mb-1">Status</span>
                  <span className="font-bold text-slate-800">{inspectCampaign.status || "Draft"}</span>
                </div>
              </div>

              {/* URLs / Assets */}
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] text-slate-400">
                  Associated Links & Assets
                </h4>
                <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Web View URL:</span>
                    <span className="font-mono text-slate-800 truncate max-w-md">{inspectCampaign.webViewUrl || "N/A"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Figma URL:</span>
                    <span className="font-mono text-slate-800 truncate max-w-md">{inspectCampaign.figmaUrl || "N/A"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Litmus Test URL:</span>
                    <span className="font-mono text-slate-800 truncate max-w-md">{inspectCampaign.litmusUrl || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Checklists Snapshot */}
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] text-slate-400">
                  QA Checkpoints Snapshot ({inspectCampaign.checklists?.length || 0} items)
                </h4>
                <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-200 max-h-48 overflow-y-auto">
                  {inspectCampaign.checklists && inspectCampaign.checklists.length > 0 ? (
                    inspectCampaign.checklists.map((chk: any, idx: number) => {
                      const ans = inspectCampaign.checklistAnswers?.[chk.id];
                      return (
                        <div key={chk.id || idx} className="p-3 flex items-start justify-between gap-3">
                          <div>
                            <span className="font-bold text-slate-800 block">{chk.name || chk.category}</span>
                            <span className="text-slate-500 text-[11px] block mt-0.5">{chk.description || chk.stage}</span>
                            {ans?.text && (
                              <span className="mt-1 block text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[10px] font-mono border border-blue-200">
                                Value: {ans.text}
                              </span>
                            )}
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0",
                            ans?.status === "Checked" ? "bg-emerald-100 text-emerald-800" :
                            ans?.status === "Failed" ? "bg-rose-100 text-rose-800" :
                            "bg-slate-200 text-slate-600"
                          )}>
                            {ans?.status || "Unchecked"}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="p-4 text-slate-400 italic text-center">No checklist snapshot available</p>
                  )}
                </div>
              </div>

              {/* Activity Logs */}
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] text-slate-400">
                  Audit History Logs
                </h4>
                <div className="bg-slate-900 text-slate-200 rounded-xl p-3 max-h-36 overflow-y-auto font-mono text-[11px] space-y-1.5">
                  {inspectLogs.length > 0 ? (
                    inspectLogs.map((log: any, idx: number) => (
                      <div key={log.id || idx} className="flex items-start gap-2 border-b border-slate-800 pb-1.5 last:border-0">
                        <span className="text-slate-500 shrink-0">{new Date(log.created_at).toLocaleTimeString()}</span>
                        <span className="text-amber-300 font-semibold shrink-0">[{log.user_email}]</span>
                        <span className="text-slate-300">{log.action_type}: {log.details}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 italic">No activity logs recorded for this campaign.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                Viewing in read-only recycle bin preview. To edit, restore campaign first.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInspectCampaign(null)}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    await handleRestore(inspectCampaign);
                    setInspectCampaign(null);
                  }}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restore Campaign Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE PERMANENT DELETE CONFIRM MODAL */}
      {deleteConfirmCampaign && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Permanently Delete Campaign?</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Are you sure you want to permanently purge <strong className="text-slate-900">"{deleteConfirmCampaign.name}"</strong>? This action cannot be undone and will permanently remove all checkpoints and assets.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmCampaign(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePermanentDelete(deleteConfirmCampaign)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMPTY BIN CONFIRM MODAL */}
      {showEmptyConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Empty Entire Recycle Bin?</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              This will permanently remove <strong className="text-slate-900">{deletedCampaigns.length} campaign(s)</strong> from the database. All checklists, files, and assets will be erased forever.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowEmptyConfirm(false)}
                disabled={isEmptyingBin}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleEmptyBin}
                disabled={isEmptyingBin}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isEmptyingBin ? "Emptying..." : "Yes, Purge All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
