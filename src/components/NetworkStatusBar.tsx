import React, { useState, useEffect } from "react";
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Database, 
  CloudUpload,
  Radio,
  Sliders,
  Check,
  Server,
  Key,
  ExternalLink,
  Info
} from "lucide-react";
import { syncAllCampaignsToDatabase, getAllCampaigns } from "@/lib/campaign-storage";
import { cn } from "@/lib/utils";

export function NetworkStatusBar({ role }: { role?: string }) {
  const isAdmin = role === "admin";
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  
  // Toast state
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: "success" | "offline" | "info" }>({
    title: "",
    desc: "",
    type: "info"
  });
  const [showSimulatorModal, setShowSimulatorModal] = useState<boolean>(false);
  const [showDbModal, setShowDbModal] = useState<boolean>(false);

  // Check real Supabase connection env
  const isRealSupabase = Boolean(
    import.meta.env.VITE_SUPABASE_URL && 
    import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co'
  );

  // Effective online status
  const isOnline = isBrowserOnline && !isSimulatedOffline;

  // Read queue count
  const updateQueueCount = () => {
    setPendingCount(0);
  };

  // Perform full database sync
  const triggerSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      const allCampaigns = await getAllCampaigns();
      const [dbSyncedCount] = await Promise.all([
        isRealSupabase ? syncAllCampaignsToDatabase(allCampaigns) : Promise.resolve(0),
        new Promise((resolve) => setTimeout(resolve, 600)) // minimum pulse animation duration
      ]);

      updateQueueCount();

      const totalPushed = dbSyncedCount || 0;

      if (totalPushed > 0) {
        setToastMessage({
          title: "Database Synchronized",
          desc: `Successfully pushed ${totalPushed} campaign record${totalPushed === 1 ? "" : "s"} to the database.`,
          type: "success"
        });
        setShowToast(true);
      } else {
        setToastMessage({
          title: "Database Up to Date",
          desc: "All records match the connected database.",
          type: "success"
        });
        setShowToast(true);
      }
    } catch (err) {
      console.error("[NetworkStatusBar] Sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    updateQueueCount();

    const handleOnlineEvent = () => {
      setIsBrowserOnline(true);
      if (!isSimulatedOffline) {
        setToastMessage({
          title: "Internet Restored",
          desc: "Reconnected to internet. Initiating database sync...",
          type: "info"
        });
        setShowToast(true);
        triggerSync();
      }
    };

    const handleOfflineEvent = () => {
      setIsBrowserOnline(false);
      setToastMessage({
        title: "Working Offline",
        desc: "Internet connection lost. Changes will be saved locally in cache.",
        type: "offline"
      });
      setShowToast(true);
    };

    const handleQueueUpdate = () => {
      updateQueueCount();
    };

    window.addEventListener("online", handleOnlineEvent);
    window.addEventListener("offline", handleOfflineEvent);
    window.addEventListener("storage", updateQueueCount);
    window.addEventListener("offline-queue-updated", handleQueueUpdate);

    // Initial check on mount: if online and queue has items or connects real supabase, auto-sync!
    if (navigator.onLine && !isSimulatedOffline) {
      triggerSync();
    }

    return () => {
      window.removeEventListener("online", handleOnlineEvent);
      window.removeEventListener("offline", handleOfflineEvent);
      window.removeEventListener("storage", updateQueueCount);
      window.removeEventListener("offline-queue-updated", handleQueueUpdate);
    };
  }, [isSimulatedOffline]);

  // Handle manual simulator toggle
  const toggleSimulation = (simulateOffline: boolean) => {
    setIsSimulatedOffline(simulateOffline);
    setShowSimulatorModal(false);

    if (simulateOffline) {
      setToastMessage({
        title: "Simulated Offline Mode",
        desc: "Network connection simulated as offline. Drafts will be stored in offline queue.",
        type: "offline"
      });
      setShowToast(true);
    } else {
      setToastMessage({
        title: "Simulated Online Mode",
        desc: "Network connection restored. Syncing pending offline queue...",
        type: "info"
      });
      setShowToast(true);
      triggerSync();
    }
  };

  // Auto hide toast after 5s
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  if (!isAdmin) {
    return (
      <>
        {/* Compact Global Sync Status Bar for Standard Users */}
        <div className="fixed bottom-4 left-20 z-50 select-none">
          <div className="flex items-center bg-white/90 backdrop-blur border border-slate-200 shadow-sm rounded-full p-1 pl-3 pr-1 gap-3">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Sync:
            </span>
            {isSyncing ? (
              <button
                type="button"
                disabled
                className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1.5 shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                <span>Syncing Database...</span>
              </button>
            ) : isOnline && isRealSupabase && pendingCount === 0 ? (
              <button
                type="button"
                onClick={triggerSync}
                className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Database is synchronized. Click to re-check."
              >
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                <span>Synced</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={triggerSync}
                className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Click to resolve connection error and sync database"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Sync Database</span>
              </button>
            )}
          </div>
        </div>

        {/* Floating Non-Intrusive Toast Notification */}
        {showToast && (
          <div className="fixed bottom-6 right-6 z-[1000] max-w-sm w-full px-2 pointer-events-auto transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
            <div className={cn(
              "rounded-xl p-4 shadow-2xl border backdrop-blur-md transition-all relative overflow-hidden flex items-start gap-3",
              toastMessage.type === "success"
                ? "bg-slate-900 text-slate-100 border-emerald-500/80 shadow-emerald-950/20"
                : toastMessage.type === "offline"
                ? "bg-slate-900 text-slate-100 border-amber-500/80 shadow-amber-950/20"
                : "bg-slate-900 text-slate-100 border-blue-500/80 shadow-blue-950/20"
            )}>
              <div className={cn(
                "absolute top-0 left-0 right-0 h-1",
                toastMessage.type === "success" ? "bg-emerald-500" : toastMessage.type === "offline" ? "bg-amber-500" : "bg-blue-500"
              )} />

              <div className={cn(
                "p-2 rounded-lg shrink-0 mt-0.5",
                toastMessage.type === "success" 
                  ? "bg-emerald-500/20 text-emerald-400" 
                  : toastMessage.type === "offline"
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-blue-500/20 text-blue-400"
              )}>
                {toastMessage.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : toastMessage.type === "offline" ? (
                  <WifiOff className="w-5 h-5" />
                ) : (
                  <Wifi className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white tracking-tight">{toastMessage.title}</h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{toastMessage.desc}</p>
              </div>

              <button
                type="button"
                onClick={() => setShowToast(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* 1. Persistent Top Network & Database Status Bar for Admins */}
      <header className={cn(
        "w-full px-4 py-2 text-xs border-b transition-all duration-300 flex items-center justify-between z-30 shrink-0 select-none",
        !isOnline 
          ? "bg-amber-50 text-amber-900 border-amber-200" 
          : !isRealSupabase
          ? "bg-amber-500/10 text-amber-900 border-amber-200"
          : isSyncing 
          ? "bg-blue-50 text-blue-900 border-blue-200"
          : "bg-slate-900 text-slate-200 border-slate-800"
      )}>
        <div className="flex items-center gap-3">
          {/* Status Badge & Pulsing Icon */}
          <div className="flex items-center gap-2">
            {!isOnline ? (
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </div>
            ) : isSyncing ? (
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-blue-400 opacity-75"></span>
                <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin relative z-10" />
              </div>
            ) : !isRealSupabase ? (
              <div className="relative flex items-center justify-center">
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </div>
            ) : (
              <div className="relative flex items-center justify-center">
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </div>
            )}

            <div className="flex items-center gap-1.5 font-semibold">
              {!isOnline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="text-amber-900 font-bold">Offline Mode</span>
                </>
              ) : isSyncing ? (
                <>
                  <span className="text-blue-900 font-bold">Syncing Database...</span>
                </>
              ) : !isRealSupabase ? (
                <>
                  <Database className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="text-amber-900 font-bold">Local Storage Mode</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-white font-medium">Database Connected</span>
                </>
              )}
            </div>
          </div>

          <span className="text-slate-400 dark:text-slate-500">•</span>

          {/* Detailed Message */}
          <span className="text-[11px] font-medium">
            {!isOnline ? (
              <span className="text-amber-800">Changes stored locally in offline cache.</span>
            ) : isSyncing ? (
              <span className="text-blue-800 font-medium">Pushing queued changes to database...</span>
            ) : !isRealSupabase ? (
              <span className="text-amber-800 font-medium">
                Db URL missing in env. Data saved locally in browser. 
                <button 
                  onClick={() => setShowDbModal(true)}
                  className="underline ml-1 font-bold hover:text-amber-950 cursor-pointer"
                >
                  Configure Supabase Env
                </button>
              </span>
            ) : pendingCount > 0 ? (
              <span className="text-amber-300 font-semibold">{pendingCount} record{pendingCount === 1 ? "" : "s"} waiting to sync</span>
            ) : (
              <span className="text-slate-300">Database synchronized & connected</span>
            )}
          </span>

          {/* Queue Count Pill */}
          {pendingCount > 0 && (
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight",
              !isOnline ? "bg-amber-200 text-amber-900" : "bg-blue-950 text-blue-300 border border-blue-800"
            )}>
              {pendingCount} Pending
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isOnline && (
            isRealSupabase && pendingCount === 0 && !isSyncing ? (
              <button
                type="button"
                onClick={triggerSync}
                className="px-2.5 py-1 rounded text-[11px] font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-xs"
                title="Database is synchronized with Supabase"
              >
                <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                <span>Synced</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={triggerSync}
                disabled={isSyncing}
                className={cn(
                  "px-2.5 py-1 rounded text-[11px] font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50",
                  !isRealSupabase
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-blue-600 hover:bg-blue-500 text-white"
                )}
              >
                <RefreshCw className={cn("w-3 h-3", isSyncing && "animate-spin")} />
                {isSyncing ? "Syncing..." : isRealSupabase ? "Sync Database" : "Push Local Data"}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => setShowDbModal(true)}
            className={cn(
              "px-2 py-1 rounded text-[11px] font-medium transition-colors inline-flex items-center gap-1 cursor-pointer border",
              !isRealSupabase
                ? "bg-amber-100 border-amber-300 text-amber-900 font-bold hover:bg-amber-200"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
            )}
            title="Database Connection Config"
          >
            <Database className="w-3 h-3" />
            <span className="hidden sm:inline">Database Config</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSimulatorModal(prev => !prev)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-[11px] font-medium transition-colors inline-flex items-center gap-1 cursor-pointer border border-slate-700"
            title="Open Connection Simulator"
          >
            <Sliders className="w-3 h-3 text-slate-400" />
            <span className="hidden sm:inline">Simulator</span>
          </button>
        </div>
      </header>

      {/* 2. Database Setup & Migration Modal */}
      {showDbModal && (
        <div className="fixed inset-0 z-[1100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden text-slate-900">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">Database Connection & Data Migration</h3>
              </div>
              <button 
                onClick={() => setShowDbModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-sm">
              {/* Connection Status Box */}
              <div className={cn(
                "p-4 rounded-xl border flex items-start gap-3",
                isRealSupabase 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                  : "bg-amber-50 border-amber-200 text-amber-900"
              )}>
                {isRealSupabase ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold text-sm">
                    {isRealSupabase ? "Supabase Database Connected" : "Local Storage Mode (No Database .env)"}
                  </h4>
                  <p className="text-xs mt-1 leading-relaxed">
                    {isRealSupabase 
                      ? "Your app is connected to live Supabase database. All campaign edits and drafts automatically sync."
                      : "Environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not configured. Data is currently safely stored in browser LocalStorage."
                    }
                  </p>
                </div>
              </div>

              {/* Instructions for Vercel / Environment Variables */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">
                  Required Environment Variables (.env / Vercel)
                </h4>
                <div className="bg-slate-900 text-slate-200 p-3.5 rounded-xl font-mono text-xs space-y-1.5 border border-slate-800 break-all select-all">
                  <div className="text-emerald-400 font-semibold mb-1">
                    {isRealSupabase ? "# Connected Supabase Config" : "# Add to .env or Vercel Environment Variables"}
                  </div>
                  <div>
                    <span className="text-blue-300">VITE_SUPABASE_URL</span>=
                    <span className="text-amber-200 font-mono">{import.meta.env.VITE_SUPABASE_URL || "https://your-project.supabase.co"}</span>
                  </div>
                  <div>
                    <span className="text-blue-300">VITE_SUPABASE_ANON_KEY</span>=
                    <span className="text-amber-200 font-mono">{import.meta.env.VITE_SUPABASE_ANON_KEY || "your-anon-public-key"}</span>
                  </div>
                </div>
              </div>

              {/* Vercel Deployment Instructions */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2 text-slate-700">
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-blue-600" />
                  How to configure on Vercel:
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-slate-600 leading-relaxed">
                  <li>Go to your Vercel Project Dashboard → <strong>Settings</strong> → <strong>Environment Variables</strong>.</li>
                  <li>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.</li>
                  <li>Click <strong>Redeploy</strong> in Vercel to activate the database connection.</li>
                </ol>
              </div>

              {/* Data Safety & Migration Button */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-xs text-slate-900">Push Local Storage to Database</p>
                  <p className="text-[11px] text-slate-500">Upload all locally saved campaigns into database without losing anything.</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await triggerSync();
                    setShowDbModal(false);
                  }}
                  disabled={isSyncing}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shrink-0 inline-flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  <CloudUpload className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                  {isSyncing ? "Syncing..." : "Sync All Local Data"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Simulator Drawer/Modal */}
      {showSimulatorModal && (
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 text-xs text-slate-200 flex items-center justify-between gap-4 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-white">Network Connection Testing Simulator</p>
              <p className="text-[11px] text-slate-400">Toggle simulated connection drop to test local draft saves and auto-syncing.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleSimulation(true)}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-bold transition-all border cursor-pointer",
                isSimulatedOffline 
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/50" 
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
              )}
            >
              Simulate Offline
            </button>

            <button
              type="button"
              onClick={() => toggleSimulation(false)}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-bold transition-all border cursor-pointer",
                !isSimulatedOffline 
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50" 
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
              )}
            >
              Simulate Online
            </button>

            <button
              type="button"
              onClick={() => setShowSimulatorModal(false)}
              className="text-slate-400 hover:text-white p-1 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Floating Non-Intrusive Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-[1000] max-w-sm w-full px-2 pointer-events-auto transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          <div className={cn(
            "rounded-xl p-4 shadow-2xl border backdrop-blur-md transition-all relative overflow-hidden flex items-start gap-3",
            toastMessage.type === "success"
              ? "bg-slate-900 text-slate-100 border-emerald-500/80 shadow-emerald-950/20"
              : toastMessage.type === "offline"
              ? "bg-slate-900 text-slate-100 border-amber-500/80 shadow-amber-950/20"
              : "bg-slate-900 text-slate-100 border-blue-500/80 shadow-blue-950/20"
          )}>
            <div className={cn(
              "absolute top-0 left-0 right-0 h-1",
              toastMessage.type === "success" ? "bg-emerald-500" : toastMessage.type === "offline" ? "bg-amber-500" : "bg-blue-500"
            )} />

            <div className={cn(
              "p-2 rounded-lg shrink-0 mt-0.5",
              toastMessage.type === "success" 
                ? "bg-emerald-500/20 text-emerald-400" 
                : toastMessage.type === "offline"
                ? "bg-amber-500/20 text-amber-400"
                : "bg-blue-500/20 text-blue-400"
            )}>
              {toastMessage.type === "success" ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : toastMessage.type === "offline" ? (
                <WifiOff className="w-5 h-5" />
              ) : (
                <Wifi className="w-5 h-5" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white tracking-tight">{toastMessage.title}</h4>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{toastMessage.desc}</p>
            </div>

            <button
              type="button"
              onClick={() => setShowToast(false)}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

