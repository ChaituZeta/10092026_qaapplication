import React, { useState, useEffect } from "react";
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Database, 
  HardDrive,
  CloudUpload,
  Radio,
  Sliders
} from "lucide-react";
import { getAllCampaigns, syncAllCampaignsToDatabase } from "@/lib/campaign-storage";
import { cn } from "@/lib/utils";

export function OfflineSyncToast() {
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toastState, setToastState] = useState<"hidden" | "offline" | "syncing" | "synced" | "error">("hidden");
  const [syncedCount, setSyncedCount] = useState<number>(0);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [showSimControls, setShowSimControls] = useState<boolean>(false);

  // Effective online status (combines actual browser status and user simulation)
  const isOnline = isBrowserOnline && !isSimulatedOffline;

  // Helper to read pending count
  const updatePendingCount = () => {
    setPendingCount(0);
  };

  // Perform sync when back online
  const triggerSync = async () => {
    setIsSyncing(true);
    setToastState("syncing");
    setIsDismissed(false);

    try {
      const all = await getAllCampaigns();
      const [synced] = await Promise.all([
        syncAllCampaignsToDatabase(all),
        new Promise((resolve) => setTimeout(resolve, 800))
      ]);

      setSyncedCount(synced);
      updatePendingCount();

      if (synced > 0) {
        setToastState("synced");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("database-synced", { detail: { syncedCount: synced } }));
        }
      } else {
        setToastState("synced");
      }
    } catch (e) {
      console.error("[OfflineSyncToast] Error syncing database:", e);
      setToastState("error");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    updatePendingCount();

    const handleOnlineEvent = () => {
      setIsBrowserOnline(true);
      if (!isSimulatedOffline) {
        setToastState("syncing");
        triggerSync();
      }
    };

    const handleOfflineEvent = () => {
      setIsBrowserOnline(false);
      setToastState("offline");
      setIsDismissed(false);
    };

    const handleQueueUpdate = () => {
      updatePendingCount();
      if (!isOnline && toastState === "hidden") {
        setToastState("offline");
      }
    };

    window.addEventListener("online", handleOnlineEvent);
    window.addEventListener("offline", handleOfflineEvent);
    window.addEventListener("storage", updatePendingCount);
    window.addEventListener("offline-queue-updated", handleQueueUpdate);

    return () => {
      window.removeEventListener("online", handleOnlineEvent);
      window.removeEventListener("offline", handleOfflineEvent);
      window.removeEventListener("storage", updatePendingCount);
      window.removeEventListener("offline-queue-updated", handleQueueUpdate);
    };
  }, [isSimulatedOffline, isOnline, toastState]);

  // Effect when toggle offline simulation changes
  const toggleSimulation = (simulateOffline: boolean) => {
    setIsSimulatedOffline(simulateOffline);
    setIsDismissed(false);
    if (simulateOffline) {
      setToastState("offline");
    } else {
      // Returning to online mode
      triggerSync();
    }
  };

  // Auto hide "synced" toast after 6 seconds
  useEffect(() => {
    if (toastState === "synced") {
      const timer = setTimeout(() => {
        setToastState("hidden");
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [toastState]);

  return (
    <>
      {/* 1. Persistent Top Connectivity Ribbon when Offline or Queue Pending */}
      {(!isOnline || pendingCount > 0) && (
        <div className={cn(
          "fixed top-0 left-0 right-0 z-[999] px-4 py-1.5 text-xs font-semibold flex items-center justify-between shadow-sm transition-all duration-300",
          !isOnline 
            ? "bg-amber-500 text-slate-950 border-b border-amber-600" 
            : "bg-blue-600 text-white border-b border-blue-700"
        )}>
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
            <div className="flex items-center gap-2">
              {!isOnline ? (
                <>
                  <WifiOff className="w-4 h-4 text-slate-950 animate-pulse shrink-0" />
                  <span>Working in <strong>Offline Mode</strong>. All saves are stored locally in cache.</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-4 h-4 text-white animate-bounce shrink-0" />
                  <span>Online — <strong>{pendingCount} change{pendingCount === 1 ? "" : "s"}</strong> queued for database synchronization.</span>
                </>
              )}
              {pendingCount > 0 && (
                <span className="bg-slate-950 text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-bold ml-1">
                  {pendingCount} Pending
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isOnline && pendingCount > 0 && (
                <button
                  type="button"
                  onClick={triggerSync}
                  disabled={isSyncing}
                  className="bg-white text-blue-800 hover:bg-blue-50 px-2.5 py-0.5 rounded text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={cn("w-3 h-3", isSyncing && "animate-spin")} />
                  {isSyncing ? "Syncing..." : "Sync Now"}
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowSimControls(prev => !prev)}
                className="bg-slate-900/20 hover:bg-slate-900/40 text-current px-2 py-0.5 rounded text-[10px] font-medium transition-colors inline-flex items-center gap-1 cursor-pointer"
                title="Open Connection Simulator options"
              >
                <Sliders className="w-3 h-3" />
                Network Simulator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Floating Connection Toast Modal in Bottom-Right Corner */}
      {(!isDismissed && (toastState !== "hidden" || !isOnline || pendingCount > 0)) && (
        <div className="fixed bottom-6 right-6 z-[1000] max-w-md w-full px-2 pointer-events-auto transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          <div className={cn(
            "rounded-xl p-4 shadow-2xl border backdrop-blur-md transition-all duration-300 relative overflow-hidden",
            !isOnline
              ? "bg-slate-900/95 text-slate-100 border-amber-500/80 shadow-amber-950/20"
              : toastState === "synced"
              ? "bg-slate-900/95 text-slate-100 border-emerald-500/80 shadow-emerald-950/20"
              : "bg-slate-900/95 text-slate-100 border-blue-500/80 shadow-blue-950/20"
          )}>
            {/* Top Accent Line */}
            <div className={cn(
              "absolute top-0 left-0 right-0 h-1",
              !isOnline ? "bg-amber-500" : toastState === "synced" ? "bg-emerald-500" : "bg-blue-500"
            )} />

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2.5 rounded-xl shrink-0 mt-0.5",
                  !isOnline 
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
                    : toastState === "synced"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                )}>
                  {!isOnline ? (
                    <WifiOff className="w-5 h-5 animate-pulse" />
                  ) : isSyncing ? (
                    <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
                  ) : toastState === "synced" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Wifi className="w-5 h-5 text-blue-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white tracking-tight">
                      {!isOnline 
                        ? "Offline Mode Active" 
                        : isSyncing 
                        ? "Syncing Database..." 
                        : toastState === "synced"
                        ? "Database Synchronization Complete"
                        : "Internet Connection Restored"}
                    </h4>

                    {isSimulatedOffline && (
                      <span className="bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Simulated
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {!isOnline
                      ? "You are currently disconnected from the internet. All campaign changes and form updates are saved safely to local storage."
                      : isSyncing
                      ? "Pushing queued local updates to remote database server..."
                      : toastState === "synced" && syncedCount > 0
                      ? `Successfully synced ${syncedCount} queued change${syncedCount === 1 ? "" : "s"} to the database.`
                      : "All local campaign data is up to date and synchronized with the remote database."}
                  </p>

                  {/* Queued Stats Bar */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-slate-500" />
                      Pending DB Sync Queue:
                    </span>
                    <span className={cn(
                      "font-bold px-2 py-0.5 rounded-full text-[10px]",
                      pendingCount > 0 ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-slate-800 text-slate-400"
                    )}>
                      {pendingCount} record{pendingCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDismissed(true)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                title="Dismiss toast notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Actions Bar */}
            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowSimControls(prev => !prev)}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer flex items-center gap-1"
              >
                <Radio className="w-3 h-3 text-slate-500" />
                {showSimControls ? "Hide Simulator Controls" : "Simulate Offline/Online"}
              </button>

              <div className="flex items-center gap-2">
                {!isOnline ? (
                  <button
                    type="button"
                    onClick={() => toggleSimulation(false)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-colors shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <CloudUpload className="w-3.5 h-3.5" />
                    Simulate Reconnect
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={triggerSync}
                    disabled={isSyncing}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")} />
                    {isSyncing ? "Syncing..." : "Sync Database Now"}
                  </button>
                )}
              </div>
            </div>

            {/* Simulator Control Drawer inside Toast */}
            {showSimControls && (
              <div className="mt-3 p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-2 animate-in fade-in">
                <div className="font-bold text-slate-200 flex items-center justify-between">
                  <span>Connection Simulator Options</span>
                  <span className="text-[10px] text-slate-500">For QA & Offline Testing</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Simulate dropping internet connectivity to verify offline draft caching, form saves, and auto-syncing upon reconnecting.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => toggleSimulation(true)}
                    className={cn(
                      "flex-1 py-1.5 rounded text-[11px] font-bold transition-colors border",
                      isSimulatedOffline 
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/50" 
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                    )}
                  >
                    Simulate Offline
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSimulation(false)}
                    className={cn(
                      "flex-1 py-1.5 rounded text-[11px] font-bold transition-colors border",
                      !isSimulatedOffline 
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50" 
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                    )}
                  >
                    Simulate Online
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
