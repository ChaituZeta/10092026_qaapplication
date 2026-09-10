import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { savePreLoginRedirectUrl, executePostLoginRedirect } from "@/lib/url-redirect";
import { setActiveSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { AuthShell } from "../components/auth/AuthShell";
import { Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft, Zap, Shield, User } from "lucide-react";

export function Login({ onLogin }: { onLogin: () => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // In-card Forgot Password toggle state
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Quick Login state for testing / demo accounts
  const [quickLoginEnabled, setQuickLoginEnabled] = useState(true);
  const [quickUsers, setQuickUsers] = useState<any[]>([]);
  const [showQuickMenu, setShowQuickMenu] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get("redirect") || params.get("next");
    if (redirectParam) {
      savePreLoginRedirectUrl(decodeURIComponent(redirectParam));
    }

    const loadQuickSettingsAndUsers = async () => {
      let isGlobalQuickEnabled = true;
      let settingsFound = false;

      if (isSupabaseConfigured()) {
        try {
          const { data: dbSettings } = await supabase
            .from("app_settings")
            .select("*")
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (dbSettings && dbSettings.quick_login_enabled !== undefined && dbSettings.quick_login_enabled !== null) {
            isGlobalQuickEnabled =
              dbSettings.quick_login_enabled === true ||
              dbSettings.quick_login_enabled === "true" ||
              dbSettings.quick_login_enabled === 1;
            settingsFound = true;
          }
        } catch (e) {}
      }

      if (!settingsFound) {
        try {
          const settingsRes = await fetch("/api/app-settings");
          if (settingsRes.ok) {
            const settingsData = await settingsRes.json();
            if (settingsData && settingsData.quick_login_enabled !== undefined && settingsData.quick_login_enabled !== null) {
              isGlobalQuickEnabled = Boolean(settingsData.quick_login_enabled);
            }
          }
        } catch (e) {}
      }

      setQuickLoginEnabled(isGlobalQuickEnabled);

      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase.from("app_users").select("*").neq("status", "banned");
          if (!error && Array.isArray(data)) {
            const filtered = data.filter((u: any) => {
              const isQuick = u.quick_login_enabled !== false && u.quick_login_enabled !== "false";
              return isQuick;
            });
            setQuickUsers(filtered);
            return;
          }
        } catch (e) {
          console.error("Error loading quick users from DB:", e);
        }
      }

      // Fallback only if database is not configured
      let serverUsers: any[] = [];
      try {
        const usersRes = await fetch("/api/app-users");
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          if (usersData && Array.isArray(usersData.users) && usersData.users.length > 0) {
            serverUsers = usersData.users;
          }
        }
      } catch (e) {}

      const filtered = serverUsers.filter((u: any) => {
        const isQuick = u.quick_login_enabled !== false && u.quick_login_enabled !== "false";
        return isQuick && u.status !== "banned";
      });

      setQuickUsers(filtered);
    };

    loadQuickSettingsAndUsers();
  }, []);

  const completeLoginSession = async (userEmail: string, userRole?: string, userName?: string) => {
    const cleanEmail = userEmail.trim().toLowerCase();
    let finalRole = userRole;
    let finalName = userName;

    if (!finalRole || !finalName) {
      try {
        const { data: dbUser } = await supabase.from("app_users").select("*").eq("email", cleanEmail).maybeSingle();
        if (dbUser) {
          if (dbUser.status === "banned") {
            throw new Error("This account has been suspended or banned. Please contact an administrator.");
          }
          finalRole = dbUser.role || finalRole;
          finalName = dbUser.name || finalName;
        }
      } catch (err: any) {
        if (err.message?.includes("suspended") || err.message?.includes("banned")) throw err;
      }
    }

    if (!finalRole) {
      finalRole = cleanEmail.includes("admin") ? "admin" : "user";
    }
    if (!finalName) {
      finalName = cleanEmail.split("@")[0];
    }

    const sessionObj = {
      email: cleanEmail,
      role: finalRole,
      name: finalName,
      timestamp: new Date().toISOString()
    };
    setActiveSession(sessionObj);

    try {
      await supabase.from("app_users").update({
        last_login: new Date().toISOString()
      }).eq("email", cleanEmail);
    } catch (e) {}

    window.dispatchEvent(new Event("app_auth_changed"));
    if (onLogin) onLogin();
    executePostLoginRedirect(navigate);
  };

  const handleQuickLogin = async (quickEmail: string, role?: string, name?: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: dbUser } = await supabase.from("app_users").select("*").eq("email", quickEmail).maybeSingle();
      if (dbUser && dbUser.status === "banned") {
        setError("This account has been suspended or banned.");
        setLoading(false);
        return;
      }

      await completeLoginSession(quickEmail, role || dbUser?.role, name || dbUser?.name);
    } catch (err: any) {
      setError(err.message || "An error occurred during quick login.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const { data: dbUser } = await supabase.from("app_users").select("*").eq("email", cleanEmail).maybeSingle();

      if (dbUser && dbUser.status === "banned") {
        setError("This account has been suspended or banned. Please contact an administrator.");
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (!signInError) {
        await completeLoginSession(cleanEmail, dbUser?.role, dbUser?.name);
        setLoading(false);
        return;
      }

      setError("Invalid email or password.");
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const { data: dbUser } = await supabase.from("app_users").select("*").eq("email", cleanEmail).maybeSingle();

      if (!dbUser) {
        setError("User not found. Please contact admin for password reset.");
        setLoading(false);
        return;
      }

      if (dbUser.status === "banned") {
        setError("This account has been suspended or banned. Please contact an administrator.");
        setLoading(false);
        return;
      }

      const resetUrl = `${window.location.origin}/reset-password?email=${encodeURIComponent(cleanEmail)}`;
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, resetUrl })
      });
      if (!response.ok) throw new Error("Failed to send reset email");
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || "Error sending reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      {isForgotPassword ? (
        /* FORGOT PASSWORD IN-CARD VIEW */
        <div>
          <div className="mb-6 text-left">
            <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight">
              Reset Password
            </h1>
            <p className="text-sm font-medium text-[#2b61d6] mt-1">
              Enter your registered email to receive recovery instructions
            </p>
          </div>

          {resetSent ? (
            <div className="space-y-5 text-center py-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 text-[#2b61d6] flex items-center justify-center border border-blue-200 shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-slate-900">
                  Recovery Link Dispatched
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                  Instructions have been sent to{" "}
                  <strong className="text-slate-800 font-medium">{email}</strong>. Please check your inbox.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setResetSent(false);
                  }}
                  className="w-full h-11 bg-[#2b61d6] hover:bg-[#2250b8] text-white font-semibold text-sm rounded-md shadow-sm transition-colors cursor-pointer"
                >
                  Return to Sign In
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {error && (
                <div className="p-3 text-xs sm:text-sm rounded-md bg-rose-50 text-rose-700 font-medium border border-rose-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="forgot-email" className="block text-xs font-semibold text-slate-700">
                  Work Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="username@zetaglobal.com"
                  required
                  className="w-full h-11 border border-slate-300 rounded-md px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2b61d6] focus:ring-2 focus:ring-[#2b61d6]/25 transition-all shadow-sm"
                />
              </div>

              <div className="pt-2 space-y-3">
                <Button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full h-11 bg-[#2b61d6] hover:bg-[#2250b8] text-white font-semibold text-sm rounded-md shadow-sm transition-colors cursor-pointer"
                >
                  {loading ? "Transmitting..." : "Send Reset Link"}
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setError(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2b61d6] hover:text-[#2250b8] hover:underline transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Return to Sign In</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      ) : (
        /* LOGIN VIEW - MATCHING REFERENCE SCREENSHOT */
        <div>
          {/* Header text matching reference screenshot */}
          <div className="mb-7 text-left">
            <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight">
              Welcome
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Sign in to access your platform
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div
                data-testid="login-error-alert"
                className="p-3 text-xs sm:text-sm rounded-lg bg-rose-50 text-rose-700 font-medium border border-rose-200 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Email Input with requested placeholder "username@zetaglobal.com" */}
            <div className="space-y-1.5 text-left">
              <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700">
                Email
              </label>
              <input
                id="login-email"
                data-testid="login-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="username@zetaglobal.com"
                required
                className="w-full h-11 border border-slate-200 bg-[#f8faff] rounded-lg px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#306de4] focus:bg-white focus:ring-2 focus:ring-[#306de4]/20 transition-all shadow-xs"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5 text-left">
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700">
                Password
              </label>
              <div className="relative flex items-center">
                <input
                  id="login-password"
                  data-testid="login-password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  placeholder="Enter your password"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-11 border border-slate-200 bg-[#f8faff] rounded-lg px-3.5 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#306de4] focus:bg-white focus:ring-2 focus:ring-[#306de4]/20 transition-all shadow-xs"
                />
                <button
                  type="button"
                  id="toggle-login-password-visibility"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer focus:outline-none"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowPassword((prev) => !prev);
                  }}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-600" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Row with "Forgot password?" link on left and "Log in" button on right matching reference screenshot */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(true);
                  setError(null);
                }}
                className="text-sm font-medium text-[#306de4] hover:text-[#2250b8] hover:underline transition-colors cursor-pointer"
              >
                Forgot password?
              </button>

              <Button
                type="submit"
                data-testid="login-submit-button"
                disabled={loading || !email.trim() || !password}
                className="px-6 py-2.5 bg-[#8aaae5] hover:bg-[#306de4] text-white font-medium text-sm rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? "Logging in..." : "Log in"}
              </Button>
            </div>
          </form>

          {/* Quick Login Helper for Demo/Development Environments */}
          {quickLoginEnabled && quickUsers.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowQuickMenu(!showQuickMenu)}
                className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-700 py-1 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Quick Access Profiles ({quickUsers.length})
                </span>
                <span className="text-[11px] underline">
                  {showQuickMenu ? "Hide" : "Show"}
                </span>
              </button>

              {showQuickMenu && (
                <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {quickUsers.map((u) => (
                    <button
                      key={u.email}
                      type="button"
                      onClick={() => handleQuickLogin(u.email, u.role, u.name)}
                      className="w-full flex items-center justify-between p-2 rounded-md bg-slate-50 hover:bg-blue-50 border border-slate-200/80 hover:border-blue-200 text-left text-xs transition-colors cursor-pointer"
                    >
                      <div className="truncate pr-2">
                        <span className="font-medium text-slate-800 block truncate">
                          {u.name || u.email.split("@")[0]}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate">
                          {u.email}
                        </span>
                      </div>
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-white border border-slate-200 text-slate-600">
                        {u.role || "User"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </AuthShell>
  );
}
