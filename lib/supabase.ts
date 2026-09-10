import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnv = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta?.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] || '';
  }
  return '';
};

let activeUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL') || '';
let activeKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY') || '';

export let supabase: SupabaseClient = createClient(
  activeUrl.startsWith('https://') ? activeUrl : 'https://placeholder.supabase.co', 
  activeKey || 'placeholder_key'
);

export const isSupabaseConfigured = (): boolean => {
  const url = activeUrl;
  const key = activeKey;
  return Boolean(
    url && 
    key && 
    url !== 'https://placeholder.supabase.co' && 
    key !== 'placeholder_key' &&
    url.startsWith('https://') &&
    key.length > 10
  );
};

export const getActiveSupabaseConfig = () => {
  return {
    url: activeUrl,
    key: activeKey,
    isConfigured: isSupabaseConfigured()
  };
};

export async function testSupabaseConnection(url: string, key: string): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
  tables?: { campaigns: boolean; app_users: boolean; teams: boolean; activity_logs: boolean; app_credentials?: boolean };
}> {
  const startTime = Date.now();
  try {
    const cleanUrl = (url || '').trim();
    const cleanKey = (key || '').trim();
    if (!cleanUrl || !cleanKey) {
      return { success: false, message: "Please provide both Supabase Project URL and API Key" };
    }
    if (!cleanUrl.startsWith("https://")) {
      return { success: false, message: "Invalid URL. Project URL must start with https://" };
    }

    const testClient = createClient(cleanUrl, cleanKey);
    
    // Check key tables
    let campaignsOk = false;
    let usersOk = false;
    let teamsOk = false;
    let logsOk = false;
    let credentialsOk = false;

    try {
      const { error } = await testClient.from('campaigns').select('id', { head: true, count: 'exact' });
      if (!error || error.code !== '42P01') campaignsOk = true;
    } catch (e) {}

    try {
      const { error } = await testClient.from('app_users').select('id', { head: true, count: 'exact' });
      if (!error || error.code !== '42P01') usersOk = true;
    } catch (e) {}

    try {
      const { error } = await testClient.from('teams').select('id', { head: true, count: 'exact' });
      if (!error || error.code !== '42P01') teamsOk = true;
    } catch (e) {}

    try {
      const { error } = await testClient.from('activity_logs').select('id', { head: true, count: 'exact' });
      if (!error || error.code !== '42P01') logsOk = true;
    } catch (e) {}

    try {
      const { error } = await testClient.from('app_credentials').select('key', { head: true, count: 'exact' });
      if (!error || error.code !== '42P01') credentialsOk = true;
    } catch (e) {}

    const latency = Date.now() - startTime;
    return {
      success: true,
      message: "Connected to Supabase database successfully!",
      latencyMs: latency,
      tables: { campaigns: campaignsOk, app_users: usersOk, teams: teamsOk, activity_logs: logsOk, app_credentials: credentialsOk }
    };
  } catch (err: any) {
    const latency = Date.now() - startTime;
    return {
      success: false,
      message: err?.message || "Connection failed. Please check URL and API Key.",
      latencyMs: latency
    };
  }
}

export async function configureSupabase(
  url: string, 
  anonKey: string, 
  serviceRoleKey?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const cleanUrl = (url || '').trim();
    const cleanKey = (anonKey || '').trim();
    const cleanServiceKey = (serviceRoleKey || '').trim();

    if (!cleanUrl || !cleanKey) {
      return { success: false, message: "Both Supabase Project URL and API Key are required." };
    }
    if (!cleanUrl.startsWith("https://")) {
      return { success: false, message: "Supabase Project URL must start with https://" };
    }

    activeUrl = cleanUrl;
    activeKey = cleanKey;
    supabase = createClient(activeUrl, activeKey);

    // Save to server so other tabs, incognito windows, and server routes persist it
    try {
      await fetch("/api/save-supabase-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: cleanUrl,
          key: cleanKey,
          anonKey: cleanKey,
          serviceRoleKey: cleanServiceKey
        })
      });
    } catch (err) {
      console.warn("[Supabase] Server config save notice:", err);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("database_config_changed", {
        detail: { isConfigured: true, url: cleanUrl }
      }));
    }

    return { success: true, message: "Database connected and saved successfully!" };
  } catch (err: any) {
    return { success: false, message: err?.message || "Failed to configure Supabase." };
  }
}

let initPromise: Promise<boolean> | null = null;

export interface SetupStatusResponse {
  envExists: boolean;
  isConfigured: boolean;
  isConnected?: boolean;
  status?: string;
  connectedAt?: string;
  lastVerifiedAt?: string;
  missingCredentials: string[];
  storageTarget?: string;
  credentials?: {
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
    hasServiceRoleKey?: boolean;
  };
}

export async function checkSetupStatus(): Promise<SetupStatusResponse> {
  try {
    const res = await fetch("/api/setup-status");
    if (res.ok) {
      const data: SetupStatusResponse = await res.json();
      if (data.isConfigured && data.isConnected && data.credentials?.VITE_SUPABASE_URL && data.credentials?.VITE_SUPABASE_ANON_KEY) {
        activeUrl = data.credentials.VITE_SUPABASE_URL;
        activeKey = data.credentials.VITE_SUPABASE_ANON_KEY;
        supabase = createClient(activeUrl, activeKey);
      } else {
        // Not configured or missing credentials: clear client state
        activeUrl = "";
        activeKey = "";
        supabase = createClient("https://placeholder.supabase.co", "placeholder_key");
        try {
          localStorage.removeItem("hp_qa_db_connected");
        } catch {}
      }
      return data;
    }
  } catch (err) {
    console.warn("[Supabase] Failed to check setup status from server:", err);
  }

  // Fallback: If server is unreachable and credentials are not verified, do not assume connected
  activeUrl = "";
  activeKey = "";
  supabase = createClient("https://placeholder.supabase.co", "placeholder_key");
  try {
    localStorage.removeItem("hp_qa_db_connected");
  } catch {}

  return {
    envExists: false,
    isConfigured: false,
    isConnected: false,
    status: "disconnected",
    missingCredentials: ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]
  };
}

export async function ensureSupabaseInitialized(): Promise<boolean> {
  if (isSupabaseConfigured()) return true;

  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const status = await checkSetupStatus();
      if (status.isConfigured) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent("database_config_changed", {
            detail: { isConfigured: true, url: activeUrl }
          }));
        }
        return true;
      }
    } catch (err) {
      console.warn("[Supabase] Failed to initialize server config:", err);
    }
    return isSupabaseConfigured();
  })();

  return initPromise;
}

if (typeof window !== 'undefined') {
  ensureSupabaseInitialized().catch(() => {});
}
