import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight,
  ExternalLink,
  HelpCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  Settings2,
  Lock,
  Radio,
  Server,
  Database
} from "lucide-react";
import { 
  configureSupabase, 
  testSupabaseConnection, 
  checkSetupStatus 
} from "@/lib/supabase";
import { getActiveSession } from "@/lib/session";

interface SetupPageProps {
  onComplete?: () => void;
}

export function SetupPage({ onComplete }: SetupPageProps) {
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isReconfiguring, setIsReconfiguring] = useState(false);

  // Form Fields
  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [serviceKey, setServiceKey] = useState("");

  const [showAnonKey, setShowAnonKey] = useState(false);
  const [showServiceKey, setShowServiceKey] = useState(false);

  // Status & Details
  const [configuredUrl, setConfiguredUrl] = useState("");
  const [hasServiceRoleKey, setHasServiceRoleKey] = useState(false);
  const [storageTarget, setStorageTarget] = useState(".env");

  // Interaction States
  const [error, setError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Check setup & database connection status on mount
  const checkStatus = async () => {
    setIsLoadingStatus(true);
    setError(null);
    try {
      const status = await checkSetupStatus();
      const isDbOk = Boolean(
        status.isConfigured &&
        status.isConnected &&
        status.status === "connected" &&
        status.credentials?.VITE_SUPABASE_URL
      );

      if (isDbOk) {
        setIsConnected(true);
        try {
          localStorage.setItem("hp_qa_db_connected", "true");
        } catch {}
        if (status.credentials?.VITE_SUPABASE_URL) {
          setConfiguredUrl(status.credentials.VITE_SUPABASE_URL);
          setUrl(status.credentials.VITE_SUPABASE_URL);
        }
        if (status.credentials?.VITE_SUPABASE_ANON_KEY) {
          setAnonKey(status.credentials.VITE_SUPABASE_ANON_KEY);
        }
        setHasServiceRoleKey(Boolean(status.credentials?.hasServiceRoleKey));
        setStorageTarget(status.storageTarget || ".env");
        setIsReconfiguring(false);
      } else {
        setIsConnected(false);
        try {
          localStorage.removeItem("hp_qa_db_connected");
        } catch {}
        setConfiguredUrl("");
        setUrl(status.credentials?.VITE_SUPABASE_URL || "");
        setAnonKey(status.credentials?.VITE_SUPABASE_ANON_KEY || "");
      }
    } catch (err: any) {
      console.error("[SetupPage] Failed to fetch setup status:", err);
      setIsConnected(false);
      try {
        localStorage.removeItem("hp_qa_db_connected");
      } catch {}
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  // Ping live connection
  const handleTestPing = async () => {
    const targetUrl = url.trim() || configuredUrl;
    const targetKey = serviceKey.trim() || anonKey.trim();

    if (!targetUrl) {
      setError("Please provide a Supabase URL to test.");
      return;
    }

    setIsTesting(true);
    setError(null);
    setTestResult(null);

    try {
      const res = await testSupabaseConnection(targetUrl, targetKey);
      setTestResult({
        success: res.success,
        message: res.message,
        latencyMs: res.latencyMs
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || "Unable to reach Supabase database."
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Submit and save credentials
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTestResult(null);

    const cleanUrl = url.trim();
    const cleanAnon = anonKey.trim();
    const cleanService = serviceKey.trim();

    if (!cleanUrl) {
      setError("Supabase Project URL is required.");
      return;
    }

    if (!cleanUrl.startsWith("https://")) {
      setError("Supabase Project URL must start with https://");
      return;
    }

    if (!cleanAnon) {
      setError("Anon Public Key is required.");
      return;
    }

    if (!cleanService) {
      setError("Service Role Key is required. It is kept strictly server-side in .env.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/save-setup-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentials: {
            VITE_SUPABASE_URL: cleanUrl,
            VITE_SUPABASE_ANON_KEY: cleanAnon,
            SUPABASE_SERVICE_ROLE_KEY: cleanService
          }
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save configuration to .env.");
      }

      await configureSupabase(cleanUrl, cleanAnon, cleanService);

      setConfiguredUrl(cleanUrl);
      setHasServiceRoleKey(true);
      setStorageTarget(data.storageTarget || ".env");
      setIsConnected(true);
      setIsReconfiguring(false);
      try {
        localStorage.setItem("hp_qa_db_connected", "true");
      } catch {}
      setTestResult({
        success: true,
        message: "Connected and verified with Supabase!",
        latencyMs: data.latencyMs
      });
    } catch (err: any) {
      setError(err?.message || "Failed to save credentials to .env file.");
    } finally {
      setIsSaving(false);
    }
  };

  // Optional reset of database credentials
  const handleResetConnection = async () => {
    if (!window.confirm("Are you sure you want to reset the database connection? This will clear the credentials from .env and require re-entering them.")) {
      return;
    }

    setIsResetting(true);
    try {
      await fetch("/api/reset-supabase-config", { method: "POST" });
      try {
        localStorage.removeItem("hp_qa_db_connected");
      } catch {}
      setIsConnected(false);
      setIsReconfiguring(true);
      setUrl("");
      setAnonKey("");
      setServiceKey("");
      setConfiguredUrl("");
      setTestResult(null);
    } catch (err: any) {
      setError(err?.message || "Failed to reset database configuration.");
    } finally {
      setIsResetting(false);
    }
  };

  // Action to continue to the application with guaranteed forward navigation
  const handleContinueToApp = () => {
    try {
      localStorage.setItem("hp_qa_db_connected", "true");
    } catch {}

    if (onComplete) {
      try {
        onComplete();
      } catch (err) {
        console.error("onComplete callback error:", err);
      }
    }

    const session = getActiveSession();
    const destination = session?.email ? "/" : "/login";
    window.location.assign(destination);
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8 overflow-y-auto">
      <div className="w-full max-w-lg space-y-6 my-auto">
        {/* Top Header with ZETA Logo */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <img
              src="https://zeta-global.cdn.prismic.io/zeta-global/aeZqVMBOoF08xJYh_ZetaLogo.svg"
              alt="Zeta Global"
              className="h-10 w-auto"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              HP APJ QA Platform
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Supabase PostgreSQL Connection &amp; Environment Setup
            </p>
          </div>
        </div>

        {/* Loading State */}
        {isLoadingStatus ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-3">
            <RefreshCw className="w-7 h-7 text-[#2b61d6] animate-spin mx-auto" />
            <div className="text-sm font-medium text-slate-700">Verifying database connection...</div>
            <div className="text-xs text-slate-400">Checking .env file and Supabase reachability</div>
          </div>
        ) : isConnected && !isReconfiguring ? (
          /* ============================================================ */
          /* STATE 1: DATABASE CONNECTED (DO NOT SHOW CREDENTIAL FORM)    */
          /* ============================================================ */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            {/* Header Status Badge */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Database Connected</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  Ready &amp; Synchronized
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  The application is connected to your Supabase PostgreSQL database. Credentials are saved securely and will persist across restarts.
                </p>
              </div>
            </div>

            {/* Connection Information Summary */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-slate-400" />
                  Connection Status
                </span>
                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Connected &amp; Persistently Tracked
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-slate-400" />
                  Supabase Project
                </span>
                <a
                  href={configuredUrl || "https://supabase.com/dashboard"}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-slate-800 font-semibold text-[11px] hover:text-[#2b61d6] flex items-center gap-1"
                >
                  <span className="truncate max-w-[210px]">{configuredUrl}</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-slate-400" />
                  Public Client Access
                </span>
                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Anon Key Configured
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Service Role Key
                </span>
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Server-side in .env (Hidden)
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  Credential Persistence
                </span>
                <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-medium">
                  {storageTarget} (Saved)
                </span>
              </div>
            </div>

            {/* Live Ping Output */}
            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center justify-between border ${
                  testResult.success
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span className="font-medium">{testResult.message}</span>
                </div>
                {testResult.latencyMs !== undefined && (
                  <span className="text-[11px] font-mono font-semibold text-emerald-700">
                    {testResult.latencyMs}ms
                  </span>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                id="btn-continue-to-app"
                onClick={handleContinueToApp}
                className="w-full h-11 rounded-lg bg-[#2b61d6] hover:bg-[#2250b8] text-white font-semibold text-xs shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue to Application</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleTestPing}
                  disabled={isTesting}
                  className="flex-1 h-9 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? "animate-spin text-[#2b61d6]" : ""}`} />
                  <span>{isTesting ? "Testing Ping..." : "Test Live Connection"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsReconfiguring(true)}
                  className="h-9 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>Reconfigure</span>
                </button>
              </div>
            </div>

            {/* Storage Policy Guarantee */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Service Role Key is never exposed to the browser
              </span>
              <button
                type="button"
                onClick={handleResetConnection}
                disabled={isResetting}
                className="text-red-500 hover:underline cursor-pointer disabled:opacity-50"
              >
                {isResetting ? "Resetting..." : "Reset credentials"}
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* STATE 2: CREDENTIAL SETUP FORM (ONLY SHOWN WHEN NOT CONNECTED)*/
          /* ============================================================ */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {isReconfiguring ? "Reconfigure Supabase Connection" : "Connect Supabase Database"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Credentials are saved to <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-medium text-slate-700">.env</code>
                </p>
              </div>
              {isReconfiguring && (
                <button
                  type="button"
                  onClick={() => setIsReconfiguring(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Supabase URL */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Supabase Project URL <span className="text-red-500">*</span>
                  </label>
                  <a
                    href="https://supabase.com/dashboard/project/_/settings/api"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-[#2b61d6] hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>Find in Supabase</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-project.supabase.co"
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2b61d6] focus:ring-1 focus:ring-[#2b61d6] font-mono text-xs transition-colors"
                />
              </div>

              {/* Anon Public Key */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Anon Public Key <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showAnonKey ? "text" : "password"}
                    required
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full h-10 pl-3.5 pr-10 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2b61d6] focus:ring-1 focus:ring-[#2b61d6] font-mono text-xs transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAnonKey(!showAnonKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showAnonKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">Public client key used with Row Level Security.</p>
              </div>

              {/* Service Role Key */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Service Role Key <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>Server-side only</span>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showServiceKey ? "text" : "password"}
                    required
                    value={serviceKey}
                    onChange={(e) => setServiceKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full h-10 pl-3.5 pr-10 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2b61d6] focus:ring-1 focus:ring-[#2b61d6] font-mono text-xs transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowServiceKey(!showServiceKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showServiceKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Stored strictly in <code className="bg-slate-100 px-1 py-0.2 rounded text-slate-700 font-mono font-medium">.env</code> on the server. Never exposed to browser.
                </p>
              </div>

              {/* Live Test Connection Result */}
              {testResult && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center justify-between border ${
                    testResult.success
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-red-50 text-red-800 border-red-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span className="font-medium">{testResult.message}</span>
                  </div>
                  {testResult.latencyMs !== undefined && (
                    <span className="text-[11px] font-mono font-semibold text-emerald-700">
                      {testResult.latencyMs}ms
                    </span>
                  )}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestPing}
                  disabled={isTesting || isSaving}
                  className="h-10 px-4 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? "animate-spin text-[#2b61d6]" : ""}`} />
                  <span>{isTesting ? "Testing..." : "Test Connection"}</span>
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 h-10 rounded-lg bg-[#2b61d6] hover:bg-[#2250b8] text-white font-semibold text-xs shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to .env...</span>
                    </>
                  ) : (
                    <>
                      <span>Save &amp; Connect</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Storage Notice & Help */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Saved to .env &bull; Persists across restarts &amp; migrations</span>
              </div>

              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="text-[#2b61d6] hover:underline flex items-center gap-1 text-[11px] font-medium cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showHelp ? "Hide help" : "Help"}</span>
              </button>
            </div>

            {/* Collapsible Help */}
            {showHelp && (
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
                <div className="font-semibold text-slate-800">How to get your credentials:</div>
                <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-relaxed text-slate-600">
                  <li>Log in to your <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-[#2b61d6] underline">Supabase Dashboard</a>.</li>
                  <li>Select your project, click <strong>Project Settings</strong> (gear icon) &gt; <strong>API</strong>.</li>
                  <li>Copy <strong>Project URL</strong>, <strong>anon public</strong> key, and <strong>service_role</strong> key.</li>
                  <li>Paste them above and click <strong>Save &amp; Connect</strong>.</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-slate-400">
          Zeta Global &bull; HP APJ Email QA Platform
        </div>
      </div>
    </div>
  );
}

export { SetupPage as DatabaseRequirementScreen };
