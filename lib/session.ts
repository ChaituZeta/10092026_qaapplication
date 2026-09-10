import { supabase, isSupabaseConfigured } from "./supabase";

export interface ActiveUserSession {
  email: string;
  role: string;
  name: string;
  team?: string;
  status?: string;
  avatar?: string;
  timestamp: string;
}

const STORAGE_KEY = "hpqa_active_session";

// Hydrate session synchronously from local storage on load
let currentSession: ActiveUserSession | null = (() => {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.email) {
          return parsed;
        }
      }
    } catch (e) {}
  }
  return null;
})();

/**
 * Gets the current active session.
 */
export function getActiveSession(): ActiveUserSession | null {
  if (!isSupabaseConfigured()) {
    currentSession = null;
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
    }
    return null;
  }

  if (!currentSession && typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.email) {
          currentSession = parsed;
        }
      }
    } catch (e) {}
  }
  return currentSession;
}

/**
 * Sets the active session, persists to storage, syncs to server API, and notifies components.
 */
export function setActiveSession(session: ActiveUserSession | null): void {
  currentSession = session;

  if (typeof window !== "undefined") {
    try {
      if (session && session.email) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {}
  }

  if (session && session.email) {
    fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session })
    }).catch((e) => console.warn("[Session] Error syncing session to server:", e));
  } else {
    fetch('/api/session/logout', {
      method: 'POST'
    }).catch(() => {});
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("app_auth_changed"));
  }
}

/**
 * Resolves authentication status from memory, storage, server session endpoint, or Supabase Auth.
 */
export async function resolveCurrentSession(): Promise<ActiveUserSession | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  // 1. If session is already active in memory or localStorage, prioritize it
  const active = getActiveSession();
  if (active && active.email) {
    // Check DB for latest role/status if configured
    if (isSupabaseConfigured()) {
      (async () => {
        try {
          const { data: appUser } = await supabase
            .from("app_users")
            .select("*")
            .eq("email", active.email.trim().toLowerCase())
            .maybeSingle();

          if (appUser) {
            if (appUser.status === "banned") {
              clearActiveSession();
              return;
            }
            if (appUser.role && appUser.role !== active.role) {
              active.role = appUser.role;
              active.name = appUser.name || active.name;
              active.team = appUser.team || active.team;
              currentSession = { ...active };
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSession));
              } catch (e) {}
              if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("app_auth_changed"));
              }
            }
          }
        } catch (e) {}
      })();
    }

    return active;
  }

  // 2. Query server-persisted session store
  try {
    const res = await fetch('/api/session');
    if (res.ok) {
      const data = await res.json();
      if (data && data.session && data.session.email) {
        currentSession = data.session;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.session));
        } catch (e) {}
        return currentSession;
      }
    }
  } catch (e) {}

  // 3. Check Supabase Auth session directly from client
  if (isSupabaseConfigured()) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user && session.user.email) {
        const email = session.user.email.trim().toLowerCase();
        let role = session.user.user_metadata?.role;
        let name = session.user.user_metadata?.name;

        const { data: appUser } = await supabase
          .from("app_users")
          .select("*")
          .eq("email", email)
          .maybeSingle();

        if (appUser) {
          if (appUser.status === "banned") {
            currentSession = null;
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch (e) {}
            return null;
          }
          role = appUser.role || role;
          name = appUser.name || name;
        }

        const newSession: ActiveUserSession = {
          email,
          role: role || "user",
          name: name || email.split("@")[0],
          team: appUser?.team || "HP-APJ",
          avatar: appUser?.avatar,
          timestamp: new Date().toISOString()
        };

        currentSession = newSession;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
        } catch (e) {}
        return newSession;
      }
    } catch (e) {
      console.warn("[Session] Error resolving Supabase Auth session:", e);
    }
  }

  return null;
}

/**
 * Clears current session from memory, storage, and server.
 */
export function clearActiveSession(): void {
  currentSession = null;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }
  fetch('/api/session/logout', {
    method: 'POST'
  }).catch(() => {});
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("app_auth_changed"));
  }
}


