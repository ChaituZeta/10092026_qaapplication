import { useState, useEffect, useRef, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { CampaignSetup } from "./pages/CampaignSetup";
import { Campaigns } from "./pages/Campaigns";
import { Login } from "./pages/Login";
import { ForgotPassword } from "./pages/ForgotPassword";
import { Signup } from "./pages/Signup";
import { supabase, isSupabaseConfigured, checkSetupStatus } from "@/lib/supabase";
import { getActiveSession, resolveCurrentSession, setActiveSession } from "@/lib/session";
import { savePreLoginRedirectUrl } from "@/lib/url-redirect";
import { Settings } from "./pages/Settings";
import { Profile } from "./pages/Profile";
import { Agents } from "./pages/Agents";
import { AgentChat } from "./pages/AgentChat";
import { UsersList } from "./pages/Users";
import { Checklists } from "./pages/Checklists";
import { Reports } from "./pages/Reports";
import { RecycleBin } from "./pages/RecycleBin";
import { SetupPage } from "./pages/SetupPage";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { SessionManager } from "./components/SessionManager";

function ProtectedLayout({
  isAuthenticated,
  isLoading,
  userRole,
  userEmail,
  checkAuthSession,
}: {
  isAuthenticated: boolean;
  isLoading: boolean;
  userRole: string;
  userEmail: string;
  checkAuthSession: () => void;
}) {
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-[#2b61d6] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const currentPath = location.pathname + location.search + location.hash;
    if (currentPath && currentPath !== "/" && !currentPath.startsWith("/login") && !currentPath.startsWith("/signup")) {
      savePreLoginRedirectUrl(currentPath);
    }
    return <Login onLogin={checkAuthSession} />;
  }

  return (
    <SessionManager>
      <AppLayout role={userRole} userEmail={userEmail} />
    </SessionManager>
  );
}

export default function App() {
  const initialSession = getActiveSession();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(initialSession?.email));
  const [userRole, setUserRole] = useState<string>(() => {
    return initialSession?.role || "user";
  });
  const [userEmail, setUserEmail] = useState<string>(() => initialSession?.email || "");
  const [isLoading, setIsLoading] = useState<boolean>(() => !initialSession?.email);
  const [isCheckingSetup, setIsCheckingSetup] = useState<boolean>(true);
  const [dbConnected, setDbConnected] = useState<boolean>(() => {
    try {
      return isSupabaseConfigured() || localStorage.getItem("hp_qa_db_connected") === "true";
    } catch {
      return isSupabaseConfigured();
    }
  });
  const sessionCheckSeq = useRef(0);

  const checkAuthSession = useCallback(async () => {
    const currentSeq = ++sessionCheckSeq.current;

    // 1. Check in-memory / stored session first
    const memSession = getActiveSession();
    if (memSession && memSession.email) {
      if (currentSeq === sessionCheckSeq.current) {
        setIsAuthenticated(true);
        setUserEmail(memSession.email.trim().toLowerCase());
        setUserRole(memSession.role || "user");
        setIsLoading(false);
      }
    }

    // 2. Resolve session directly from persistent storage, cookie, server, or DB
    try {
      const resolved = await resolveCurrentSession();
      if (resolved && resolved.email && currentSeq === sessionCheckSeq.current) {
        setIsAuthenticated(true);
        setUserEmail(resolved.email.trim().toLowerCase());
        setUserRole(resolved.role || "user");
        setIsLoading(false);
        return;
      }
    } catch (e) {}

    if (currentSeq === sessionCheckSeq.current && !getActiveSession()?.email) {
      setIsAuthenticated(false);
      setUserEmail("");
      setUserRole("user");
      setIsLoading(false);
    }
  }, [dbConnected]);

  // Initial Startup Check: inspect whether .env containing required database credentials exists
  useEffect(() => {
    let isMounted = true;

    const initSetup = async () => {
      try {
        const status = await checkSetupStatus();
        if (!isMounted) return;

        if (status.isConfigured && status.isConnected) {
          setDbConnected(true);
          try {
            localStorage.setItem("hp_qa_db_connected", "true");
          } catch {}
          checkAuthSession();
        } else {
          setDbConnected(false);
          try {
            localStorage.removeItem("hp_qa_db_connected");
          } catch {}
        }
      } catch (err) {
        console.warn("[App] Initial setup status check:", err);
        if (isMounted) setDbConnected(false);
      } finally {
        if (isMounted) setIsCheckingSetup(false);
      }
    };

    initSetup();

    const handleDbConfigChange = () => {
      const configured = isSupabaseConfigured();
      setDbConnected(configured);
      if (configured) {
        try {
          localStorage.setItem("hp_qa_db_connected", "true");
        } catch {}
      }
      checkAuthSession();
    };

    window.addEventListener("database_config_changed", handleDbConfigChange);
    return () => {
      isMounted = false;
      window.removeEventListener("database_config_changed", handleDbConfigChange);
    };
  }, [checkAuthSession]);

  useEffect(() => {
    if (!dbConnected) {
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    checkAuthSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session && session.user) {
        const email = (session.user.email || "").trim().toLowerCase();
        let role = session.user.user_metadata?.role;
        let name = session.user.user_metadata?.name;

        // Query app_users table directly for real profile role & status
        try {
          const { data: appUser } = await supabase
            .from("app_users")
            .select("*")
            .eq("email", email)
            .maybeSingle();

          if (appUser) {
            role = appUser.role || role;
            name = appUser.name || name;
          }
        } catch (e) {}

        const finalRole = role || "user";
        setActiveSession({
          email,
          role: finalRole,
          name: name || email.split('@')[0],
          timestamp: new Date().toISOString()
        });

        setIsAuthenticated(true);
        setUserEmail(email);
        setUserRole(finalRole);
        setIsLoading(false);
      } else {
        checkAuthSession();
      }
    });

    const handleAuthEvent = () => {
      checkAuthSession();
    };

    window.addEventListener("app_auth_changed", handleAuthEvent);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("app_auth_changed", handleAuthEvent);
    };
  }, [dbConnected, checkAuthSession]);

  // While checking environment configuration on initial startup
  if (isCheckingSetup) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 text-slate-700">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-[#2b61d6] rounded-full animate-spin"></div>
          <span className="text-xs text-slate-500 font-medium tracking-wide">
            Checking database configuration...
          </span>
        </div>
      </div>
    );
  }

  const handleSetupComplete = () => {
    setDbConnected(true);
    try {
      localStorage.setItem("hp_qa_db_connected", "true");
    } catch {}
    checkAuthSession();
    const session = getActiveSession();
    const destination = session?.email ? "/" : "/login";
    window.location.assign(destination);
  };

  // Initial Setup: If required database credentials are not available in .env, show Setup Page as the first screen
  if (!dbConnected) {
    return <SetupPage onComplete={handleSetupComplete} />;
  }

  // .env exists with required credentials: Skip Setup Page and load application normally
  return (
    <Router>
      <Routes>
        <Route
          path="/setup"
          element={<SetupPage onComplete={handleSetupComplete} />}
        />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login onLogin={() => checkAuthSession()} />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route
          path="/"
          element={
            <ProtectedLayout
              isAuthenticated={isAuthenticated}
              isLoading={isLoading}
              userRole={userRole}
              userEmail={userEmail}
              checkAuthSession={checkAuthSession}
            />
          }
        >
          <Route index element={<Dashboard userEmail={userEmail} userRole={userRole} />} />
          <Route path="campaigns/new" element={<CampaignSetup userEmail={userEmail} userRole={userRole} />} />
          <Route path="campaigns" element={<Campaigns userEmail={userEmail} userRole={userRole} />} />
          <Route path="campaign" element={<Navigate to="/campaigns" replace />} />
          <Route path="recycle-bin" element={<RecycleBin userEmail={userEmail} userRole={userRole} />} />
          <Route path="reports" element={<Reports />} />
          <Route path="users" element={<UsersList role={userRole} userEmail={userEmail} />} />
          <Route path="settings" element={<Settings role={userRole} userEmail={userEmail} />} />
          <Route path="profile" element={<Profile role={userRole} userEmail={userEmail} />} />
          <Route path="agents" element={<Agents role={userRole} />} />
          <Route path="agents/:id/edit" element={<Agents role={userRole} />} />
          <Route path="agents/:id/chat" element={<AgentChat role={userRole} />} />
          <Route path="checklists" element={<Checklists role={userRole} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

