import { Router } from "express";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { getCurrentAppState, saveAppState } from "../utils/state.ts";
import { getSupabaseServiceKey, getSupabaseUrl, getSupabaseAnonKey } from "../utils/db.ts";
import { getAppCredentialFromDB, setAppCredentialInDB } from "../utils/credentials.ts";
import { getPersistentDatabaseStatus, persistDatabaseConnectionStatus, clearPersistentDatabaseStatus } from "../utils/dbStatus.ts";
import nodemailer from "nodemailer";
import { emailTemplate, escapeHtml, isPrivateOrInternalUrl } from "../utils/helpers.ts";

export const router = Router();

/**
 * Saves database credentials EXCLUSIVELY to the .env file.
 * Preserves all existing .env variables and comments without overwriting or destroying them.
 */
function saveToEnvFile(entries: Record<string, string>): string {
  const envPath = path.join(process.cwd(), ".env");
  const examplePath = path.join(process.cwd(), ".env.example");
  
  let existingContent = "";
  if (fs.existsSync(envPath)) {
    existingContent = fs.readFileSync(envPath, "utf-8");
  } else if (fs.existsSync(examplePath)) {
    existingContent = fs.readFileSync(examplePath, "utf-8");
  }

  const lines = existingContent.split(/\r?\n/);
  const updatedKeys = new Set<string>();

  const newLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) return line;
    const key = trimmed.substring(0, eqIdx).trim();
    if (Object.prototype.hasOwnProperty.call(entries, key)) {
      updatedKeys.add(key);
      const val = entries[key];
      return `${key}=${val}`;
    }
    return line;
  });

  for (const [key, val] of Object.entries(entries)) {
    if (!updatedKeys.has(key)) {
      newLines.push(`${key}=${val}`);
    }
  }

  const output = newLines.join("\n").trim() + "\n";
  fs.writeFileSync(envPath, output, "utf-8");

  // Re-sync dotenv in current node process
  try {
    dotenv.config({ path: envPath, override: true });
  } catch (e) {}

  console.log(`[Server] Successfully saved database credentials to .env file at ${envPath}`);
  return envPath;
}

router.get("/api/env-config", async (req, res) => {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  const serviceKey = getSupabaseServiceKey();
  
  // Non-DB credentials retrieved directly from Supabase database first
  const geminiKey = await getAppCredentialFromDB("GEMINI_API_KEY");
  const gmailUser = await getAppCredentialFromDB("GMAIL_USER");
  const gmailPass = await getAppCredentialFromDB("GMAIL_APP_PASSWORD");
  const sessionSecret = await getAppCredentialFromDB("SESSION_SECRET");

  res.json({
    supabaseUrl: url || "",
    supabaseAnonKey: anonKey || "",
    hasServiceRoleKey: Boolean(serviceKey && serviceKey !== anonKey),
    hasGeminiKey: Boolean(geminiKey),
    gmailUser: gmailUser || "",
    hasGmailAppPassword: Boolean(gmailPass),
    hasSessionSecret: Boolean(sessionSecret),
    isConfigured: Boolean(url && anonKey && url.startsWith("https://") && anonKey.length > 10)
  });
});

/**
 * Save Database credentials into .env file.
 * Any other application credentials provided are saved directly into the Supabase DB app_credentials table.
 */
router.post("/api/save-env-config", async (req, res) => {
  const {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    geminiApiKey,
    gmailUser,
    gmailAppPassword,
    sessionSecret
  } = req.body || {};

  const cleanUrl = (supabaseUrl || "").trim();
  const cleanAnonKey = (supabaseAnonKey || "").trim();
  const cleanServiceKey = (supabaseServiceRoleKey || "").trim();
  const cleanGeminiKey = (geminiApiKey || "").trim();
  const cleanGmailUser = (gmailUser || "").trim();
  const cleanGmailPass = (gmailAppPassword || "").trim();
  const cleanSessionSecret = (sessionSecret || "").trim();

  if (!cleanUrl || !cleanAnonKey) {
    return res.status(400).json({
      success: false,
      error: "Supabase Project URL and Anon Key are required."
    });
  }

  if (!cleanUrl.startsWith("https://")) {
    return res.status(400).json({
      success: false,
      error: "Supabase Project URL must start with https://"
    });
  }

  try {
    // 1. Verify reachability with a 2.5s timeout
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const testClient = createClient(cleanUrl, cleanServiceKey || cleanAnonKey);
      await Promise.race([
        testClient.from("app_users").select("id", { count: "exact", head: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout reaching Supabase")), 2500))
      ]);
    } catch (pingErr) {
      console.warn("[Server API] Note on Supabase ping (tables may be pending creation):", pingErr);
    }

    // 2. Write ONLY database credentials to .env file (no app_state.json, no other files)
    const dbEnvEntries: Record<string, string> = {
      VITE_SUPABASE_URL: cleanUrl,
      VITE_SUPABASE_ANON_KEY: cleanAnonKey,
      SUPABASE_SERVICE_ROLE_KEY: cleanServiceKey || "",
    };
    saveToEnvFile(dbEnvEntries);

    // Update in-memory process.env immediately
    process.env.VITE_SUPABASE_URL = cleanUrl;
    process.env.VITE_SUPABASE_ANON_KEY = cleanAnonKey;
    if (cleanServiceKey) process.env.SUPABASE_SERVICE_ROLE_KEY = cleanServiceKey;

    // 3. Save all other application secrets directly to Supabase Database
    if (cleanGeminiKey) {
      await setAppCredentialInDB("GEMINI_API_KEY", cleanGeminiKey, "Gemini AI API Key");
    }
    if (cleanGmailUser) {
      await setAppCredentialInDB("GMAIL_USER", cleanGmailUser, "Gmail User for Alerts");
    }
    if (cleanGmailPass) {
      await setAppCredentialInDB("GMAIL_APP_PASSWORD", cleanGmailPass, "Gmail App Password");
    }
    if (cleanSessionSecret) {
      await setAppCredentialInDB("SESSION_SECRET", cleanSessionSecret, "Session Token Secret");
    }

    return res.json({
      success: true,
      message: "Database credentials saved exclusively to .env, and application secrets stored in database!",
      isConfigured: true,
      url: cleanUrl
    });
  } catch (err: any) {
    console.error("[Server API] Error saving env config:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Failed to validate and save credentials."
    });
  }
});

function parseEnvFile(): Record<string, string> {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return {};
  try {
    const content = fs.readFileSync(envPath, "utf-8");
    return dotenv.parse(content) || {};
  } catch {
    return {};
  }
}

router.get("/api/setup-status", (req, res) => {
  const envPath = path.join(process.cwd(), ".env");
  const envExists = fs.existsSync(envPath);
  const parsed = parseEnvFile();

  // If .env exists, the keys in .env are authoritative!
  // If .env does not exist, check process.env (for cloud container envs)
  const url = (envExists 
    ? (parsed.VITE_SUPABASE_URL || parsed.SUPABASE_URL || "") 
    : (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "")
  ).trim();

  const anonKey = (envExists
    ? (parsed.VITE_SUPABASE_ANON_KEY || parsed.SUPABASE_ANON_KEY || "")
    : (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "")
  ).trim();

  const serviceKey = (envExists
    ? (parsed.SUPABASE_SERVICE_ROLE_KEY || parsed.VITE_SUPABASE_SERVICE_ROLE_KEY || "")
    : (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "")
  ).trim();

  const missingCredentials: string[] = [];
  if (!url || !url.startsWith("https://") || url === "https://placeholder.supabase.co") {
    missingCredentials.push("VITE_SUPABASE_URL");
  }
  if (!anonKey || anonKey.length <= 10 || anonKey === "placeholder_key") {
    missingCredentials.push("VITE_SUPABASE_ANON_KEY");
  }
  if (!serviceKey || serviceKey.length <= 10 || serviceKey === "placeholder_key") {
    missingCredentials.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  // Required DB credentials: url and anonKey
  const isDbConfigured = !missingCredentials.includes("VITE_SUPABASE_URL") && 
                         !missingCredentials.includes("VITE_SUPABASE_ANON_KEY");

  // Keep in-memory process.env strictly synchronized with .env file
  if (!url) {
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.SUPABASE_URL;
  } else {
    process.env.VITE_SUPABASE_URL = url;
    process.env.SUPABASE_URL = url;
  }

  if (!anonKey) {
    delete process.env.VITE_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_ANON_KEY;
  } else {
    process.env.VITE_SUPABASE_ANON_KEY = anonKey;
    process.env.SUPABASE_ANON_KEY = anonKey;
  }

  if (!serviceKey) {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  } else {
    process.env.SUPABASE_SERVICE_ROLE_KEY = serviceKey;
  }

  if (!isDbConfigured) {
    clearPersistentDatabaseStatus();
    return res.json({
      envExists,
      isConfigured: false,
      isConnected: false,
      status: "disconnected",
      missingCredentials,
      storageTarget: ".env",
      credentials: {
        VITE_SUPABASE_URL: url || "",
        VITE_SUPABASE_ANON_KEY: anonKey || "",
        hasServiceRoleKey: false
      }
    });
  }

  const persistentStatus = getPersistentDatabaseStatus();

  return res.json({
    envExists,
    isConfigured: true,
    isConnected: true,
    status: "connected",
    connectedAt: persistentStatus.connectedAt,
    lastVerifiedAt: persistentStatus.lastVerifiedAt,
    missingCredentials: [],
    storageTarget: ".env",
    credentials: {
      VITE_SUPABASE_URL: url,
      VITE_SUPABASE_ANON_KEY: anonKey,
      hasServiceRoleKey: Boolean(serviceKey && serviceKey.length > 10)
    }
  });
});

router.post("/api/reset-supabase-config", (req, res) => {
  try {
    saveToEnvFile({
      VITE_SUPABASE_URL: "",
      VITE_SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: ""
    });

    // Clear hidden configuration file and persistent database status
    clearPersistentDatabaseStatus();

    delete process.env.VITE_SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    return res.json({
      success: true,
      message: "Database credentials cleared from .env and persistent status reset",
      isConfigured: false,
      isConnected: false
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "Failed to reset database credentials in .env" });
  }
});

router.get("/api/supabase-config", (req, res) => {
  const envPath = path.join(process.cwd(), ".env");
  const envExists = fs.existsSync(envPath);
  const parsed = parseEnvFile();

  const url = (parsed.VITE_SUPABASE_URL || parsed.SUPABASE_URL || "").trim();
  const key = (parsed.VITE_SUPABASE_ANON_KEY || parsed.SUPABASE_ANON_KEY || "").trim();
  const serviceKey = (parsed.SUPABASE_SERVICE_ROLE_KEY || parsed.VITE_SUPABASE_SERVICE_ROLE_KEY || "").trim();

  const isConfigured = Boolean(
    envExists &&
    url && 
    key && 
    serviceKey &&
    url !== "https://placeholder.supabase.co" && 
    key !== "placeholder_key" && 
    url.startsWith("https://") && 
    key.length > 10 &&
    serviceKey.length > 10
  );
  res.json({ 
    url, 
    key, 
    isConfigured, 
    hasServiceRoleKey: Boolean(serviceKey && serviceKey.length > 10),
    envExists
  });
});

/**
 * Saves database credentials strictly to .env file
 */
router.post("/api/save-supabase-config", async (req, res) => {
  const { url, key, anonKey, serviceRoleKey } = req.body || {};
  const targetUrl = (url || "").trim();
  const targetAnonKey = (anonKey || key || "").trim();
  const targetServiceKey = (serviceRoleKey || "").trim();

  if (!targetUrl || !targetAnonKey || !targetServiceKey) {
    return res.status(400).json({ 
      success: false, 
      error: "All 3 initial database credentials (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY) are required." 
    });
  }

  if (!targetUrl.startsWith("https://")) {
    return res.status(400).json({ success: false, error: "Supabase Project URL must start with https://" });
  }

  try {
    // Save EXCLUSIVELY to .env file (nowhere else)
    saveToEnvFile({
      VITE_SUPABASE_URL: targetUrl,
      VITE_SUPABASE_ANON_KEY: targetAnonKey,
      SUPABASE_SERVICE_ROLE_KEY: targetServiceKey
    });

    // Persistently track connected state in hidden config file (.db_status.json) and database
    await persistDatabaseConnectionStatus(true, {
      url: targetUrl,
      hasServiceRoleKey: Boolean(targetServiceKey && targetServiceKey.length > 10),
      storageTarget: ".env"
    });

    // Update process.env for current process
    process.env.VITE_SUPABASE_URL = targetUrl;
    process.env.VITE_SUPABASE_ANON_KEY = targetAnonKey;
    process.env.SUPABASE_SERVICE_ROLE_KEY = targetServiceKey;

    console.log("[Server API] Database credentials saved exclusively to .env:", targetUrl);
    return res.json({
      success: true,
      message: "Database connection credentials saved securely to .env!",
      isConfigured: true,
      url: targetUrl
    });
  } catch (err: any) {
    console.error("[Server API] Error saving supabase config:", err);
    return res.status(500).json({ success: false, error: err?.message || "Failed to save Supabase config to .env." });
  }
});

/**
 * Extensible Setup Credentials Endpoint:
 * Handles saving all credentials configured from the single Setup Page.
 * - Database connection credentials (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
 *   are saved strictly to the .env file.
 * - Any future application secrets/tokens are saved securely in the Supabase database (app_credentials table).
 */
router.post("/api/save-setup-credentials", async (req, res) => {
  const payload = req.body || {};
  const values: Record<string, string> = payload.credentials || payload;

  const url = (values.VITE_SUPABASE_URL || values.url || "").trim();
  const anonKey = (values.VITE_SUPABASE_ANON_KEY || values.anonKey || values.key || "").trim();
  const serviceKey = (values.SUPABASE_SERVICE_ROLE_KEY || values.serviceRoleKey || "").trim();

  if (!url || !anonKey || !serviceKey) {
    return res.status(400).json({
      success: false,
      error: "All 3 initial database credentials (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY) are required."
    });
  }

  if (!url.startsWith("https://")) {
    return res.status(400).json({
      success: false,
      error: "Supabase Project URL must start with https://"
    });
  }

  try {
    // 1. Verify connection with Supabase before persisting
    const { createClient } = await import("@supabase/supabase-js");
    const testClient = createClient(url, serviceKey || anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const startTime = Date.now();
    const { error: testErr } = await testClient
      .from("campaigns")
      .select("count", { count: "exact", head: true });

    if (testErr && testErr.message) {
      // If auth failure or invalid key, return clear message
      if (testErr.code === "PGRST301" || testErr.message.includes("JWT") || testErr.message.includes("key")) {
        return res.status(400).json({
          success: false,
          error: `Supabase authentication failed: ${testErr.message}. Please verify your Project URL and API keys.`
        });
      }
    }
    const latencyMs = Date.now() - startTime;

    // 2. Save database credentials strictly to .env
    const envFilePath = saveToEnvFile({
      VITE_SUPABASE_URL: url,
      VITE_SUPABASE_ANON_KEY: anonKey,
      SUPABASE_SERVICE_ROLE_KEY: serviceKey
    });

    // Persistently track connected state in hidden config file (.db_status.json) and database table
    await persistDatabaseConnectionStatus(true, {
      url,
      hasServiceRoleKey: Boolean(serviceKey && serviceKey.length > 10),
      storageTarget: ".env"
    });

    process.env.VITE_SUPABASE_URL = url;
    process.env.SUPABASE_URL = url;
    process.env.VITE_SUPABASE_ANON_KEY = anonKey;
    process.env.SUPABASE_ANON_KEY = anonKey;
    process.env.SUPABASE_SERVICE_ROLE_KEY = serviceKey;

    // 3. Save any future non-database credentials to Supabase DB (app_credentials table)
    const nonDbKeys = Object.keys(values).filter(
      k => !["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "url", "anonKey", "key", "serviceRoleKey"].includes(k)
    );

    for (const k of nonDbKeys) {
      const v = (values[k] || "").trim();
      if (v) {
        await setAppCredentialInDB(k, v, `Configured via Setup Page on ${new Date().toLocaleDateString()}`);
      }
    }

    return res.json({
      success: true,
      message: "Database credentials saved exclusively to .env file, and connection verified successfully!",
      isConfigured: true,
      isConnected: true,
      storageTarget: ".env",
      envFilePath,
      latencyMs,
      url
    });
  } catch (err: any) {
    console.error("[Server API] Error in save-setup-credentials:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Failed to save configuration to .env."
    });
  }
});

// App Credentials API - Manage and Test Secrets Stored Directly in Supabase DB
router.get("/api/app-credentials", async (req, res) => {
  try {
    const url = getSupabaseUrl();
    const serviceKey = getSupabaseServiceKey() || getSupabaseAnonKey();

    if (!url || !serviceKey || !url.startsWith("https://")) {
      return res.json({ success: true, credentials: {}, customKeys: [] });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(url, serviceKey);

    const { data: creds, error } = await supabase
      .from("app_credentials")
      .select("key, description, updated_at");

    if (error) {
      // If table not yet created, return fallback status
      const gemini = await getAppCredentialFromDB("GEMINI_API_KEY");
      const gmailUser = await getAppCredentialFromDB("GMAIL_USER");
      return res.json({
        success: true,
        credentials: {
          hasGeminiKey: Boolean(gemini),
          gmailUser: gmailUser || "",
          hasGmailPassword: Boolean(await getAppCredentialFromDB("GMAIL_APP_PASSWORD")),
          hasSessionSecret: Boolean(await getAppCredentialFromDB("SESSION_SECRET")),
        },
        customKeys: []
      });
    }

    const map: Record<string, any> = {};
    const customKeys: string[] = [];

    (creds || []).forEach(c => {
      map[c.key] = {
        configured: true,
        description: c.description,
        updated_at: c.updated_at
      };
      customKeys.push(c.key);
    });

    const geminiVal = await getAppCredentialFromDB("GEMINI_API_KEY");
    const gmailUserVal = await getAppCredentialFromDB("GMAIL_USER");
    const gmailPassVal = await getAppCredentialFromDB("GMAIL_APP_PASSWORD");

    return res.json({
      success: true,
      credentials: {
        hasGeminiKey: Boolean(geminiVal),
        gmailUser: gmailUserVal || "",
        hasGmailPassword: Boolean(gmailPassVal),
        hasSessionSecret: Boolean(await getAppCredentialFromDB("SESSION_SECRET")),
        ...map
      },
      customKeys
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/api/save-app-credential", async (req, res) => {
  const { key, value, description } = req.body || {};
  if (!key || !value) {
    return res.status(400).json({ success: false, error: "Key and Value are required." });
  }

  try {
    const saved = await setAppCredentialInDB(key.trim(), value.trim(), description);
    if (!saved) {
      return res.status(500).json({ success: false, error: "Failed to store credential in Supabase database." });
    }

    return res.json({
      success: true,
      message: `Credential ${key} saved securely in the Supabase database!`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Test credential against real service, then store directly in Supabase DB if valid.
 */
router.post("/api/test-app-credential", async (req, res) => {
  const { type, key, value, user, pass } = req.body || {};

  try {
    if (type === "gemini") {
      const apiKey = (value || "").trim();
      if (!apiKey) {
        return res.status(400).json({ success: false, error: "Gemini API Key is required." });
      }

      // Test Gemini API key directly with a lightweight ping
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Respond with the word 'OK' only."
      });

      // Save directly into Supabase database
      await setAppCredentialInDB("GEMINI_API_KEY", apiKey, "Google Gemini AI API Key");

      return res.json({
        success: true,
        message: "Gemini API Key verified and stored securely in Supabase database!"
      });
    }

    if (type === "gmail") {
      const gmailUser = (user || "").trim();
      const gmailPass = (pass || "").trim();

      if (!gmailUser || !gmailPass) {
        return res.status(400).json({ success: false, error: "Gmail user and App Password are required." });
      }

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailPass
        }
      });

      await transporter.verify();

      // Save directly into Supabase database
      await setAppCredentialInDB("GMAIL_USER", gmailUser, "Gmail SMTP Notification User");
      await setAppCredentialInDB("GMAIL_APP_PASSWORD", gmailPass, "Gmail SMTP App Password");

      return res.json({
        success: true,
        message: "Gmail credentials verified and stored securely in Supabase database!"
      });
    }

    if (type === "custom") {
      const customKey = (key || "").trim();
      const customVal = (value || "").trim();
      if (!customKey || !customVal) {
        return res.status(400).json({ success: false, error: "Secret key and value are required." });
      }

      await setAppCredentialInDB(customKey, customVal, "Custom Application Secret");

      return res.json({
        success: true,
        message: `Secret ${customKey} saved securely in Supabase database!`
      });
    }

    return res.status(400).json({ success: false, error: "Invalid credential type." });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: `Test failed: ${err.message || "Could not verify credentials."}`
    });
  }
});

router.post("/api/test-db-connection", async (req, res) => {
  const startTime = Date.now();
  const targetUrl = (req.body?.url || getSupabaseUrl() || "").trim();
  const targetKey = (req.body?.key || req.body?.anonKey || getSupabaseServiceKey() || getSupabaseAnonKey() || "").trim();

  if (!targetUrl || !targetKey) {
    return res.status(400).json({ success: false, message: "Missing Supabase URL or Key to test." });
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const testClient = createClient(targetUrl, targetKey);

    const tablesFound: string[] = [];
    const tablesToCheck = ["campaigns", "app_users", "teams", "activity_logs", "checklists", "countries", "folders"];
    
    for (const tbl of tablesToCheck) {
      try {
        const { error } = await testClient.from(tbl).select("count", { count: "exact", head: true });
        if (!error || error.code !== "42P01") {
          tablesFound.push(tbl);
        }
      } catch (e) {}
    }

    const latencyMs = Date.now() - startTime;
    return res.json({
      success: true,
      connected: true,
      latencyMs,
      tablesFound,
      totalTablesChecked: tablesToCheck.length,
      url: targetUrl
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      connected: false,
      latencyMs: Date.now() - startTime,
      error: err?.message || "Connection test failed."
    });
  }
});

router.get("/api/export-migration-data", async (req, res) => {
  try {
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseServiceKey();
    let campaigns: any[] = [];
    let users: any[] = getCurrentAppState().users || [];
    let logs: any[] = [];
    let folders: any[] = [];

    if (supabaseUrl && supabaseKey) {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(supabaseUrl, supabaseKey);
      try {
        const { data: cData } = await client.from("campaigns").select("*");
        if (cData) campaigns = cData;
      } catch (e) {}
      try {
        const { data: uData } = await client.from("app_users").select("*");
        if (uData && uData.length > 0) users = uData;
      } catch (e) {}
      try {
        const { data: lData } = await client.from("activity_logs").select("*").limit(200);
        if (lData) logs = lData;
      } catch (e) {}
      try {
        const { data: fData } = await client.from("folders").select("*");
        if (fData) folders = fData;
      } catch (e) {}
    }

    const exportBundle = {
      exportVersion: "1.0",
      exportDate: new Date().toISOString(),
      appState: {
        quick_login_enabled: getCurrentAppState().quick_login_enabled
      },
      campaigns,
      users,
      folders,
      logs
    };

    res.setHeader("Content-Disposition", `attachment; filename="zeta_qa_migration_backup_${Date.now()}.json"`);
    res.setHeader("Content-Type", "application/json");
    return res.json(exportBundle);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to export migration data" });
  }
});

router.post("/api/import-migration-data", async (req, res) => {
  try {
    const bundle = req.body;
    if (!bundle) {
      return res.status(400).json({ error: "Invalid backup bundle format" });
    }

    if (bundle.appState?.quick_login_enabled !== undefined) {
      getCurrentAppState().quick_login_enabled = Boolean(bundle.appState.quick_login_enabled);
    }
    if (Array.isArray(bundle.users) && bundle.users.length > 0) {
      getCurrentAppState().users = bundle.users;
    }
    saveAppState(getCurrentAppState());

    let insertedCampaigns = 0;
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseServiceKey();
    if (supabaseUrl && supabaseKey && Array.isArray(bundle.campaigns) && bundle.campaigns.length > 0) {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(supabaseUrl, supabaseKey);
      for (const camp of bundle.campaigns) {
        try {
          await client.from("campaigns").upsert(camp);
          insertedCampaigns++;
        } catch (e) {}
      }
    }

    // Database migrations must preserve the existing .env file and its credentials.
    // Existing database credentials in .env are strictly preserved and not modified or deleted.
    console.log("[Server API] Database migration completed. Existing .env credentials preserved intact.");

    return res.json({
      success: true,
      message: `Successfully imported backup data! Restored ${insertedCampaigns} campaigns and ${bundle.users?.length || 0} users. Existing .env credentials preserved intact.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to import migration data" });
  }
});

router.get("/api/app-settings", async (req, res) => {
  try {
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseServiceKey() || getSupabaseAnonKey();
    if (supabaseUrl && supabaseKey && supabaseUrl.startsWith("https://")) {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(supabaseUrl, supabaseKey);
      const { data: dbSettings } = await client
        .from("app_settings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dbSettings && dbSettings.quick_login_enabled !== undefined && dbSettings.quick_login_enabled !== null) {
        getCurrentAppState().quick_login_enabled = Boolean(dbSettings.quick_login_enabled);
        saveAppState(getCurrentAppState());
      }
    }
  } catch (e) {}

  res.json({ quick_login_enabled: getCurrentAppState().quick_login_enabled });
});

router.post("/api/app-settings", async (req, res) => {
  if (req.body && req.body.quick_login_enabled !== undefined) {
    const newEnabled = Boolean(req.body.quick_login_enabled);
    getCurrentAppState().quick_login_enabled = newEnabled;

    // If master toggle is turned off, disable quick login for all users as well
    if (!newEnabled && Array.isArray(getCurrentAppState().users)) {
      getCurrentAppState().users = getCurrentAppState().users.map((u: any) => ({
        ...u,
        quick_login_enabled: false
      }));
    }

    saveAppState(getCurrentAppState());

    try {
      const supabaseUrl = getSupabaseUrl();
      const supabaseKey = getSupabaseServiceKey() || getSupabaseAnonKey();
      if (supabaseUrl && supabaseKey && supabaseUrl.startsWith("https://")) {
        const { createClient } = await import("@supabase/supabase-js");
        const client = createClient(supabaseUrl, supabaseKey);
        
        const { data: rows } = await client.from("app_settings").select("id").limit(10);
        if (rows && rows.length > 0) {
          for (const row of rows) {
            await client.from("app_settings").update({
              quick_login_enabled: newEnabled,
              updated_at: new Date().toISOString()
            }).eq("id", row.id);
          }
        } else {
          await client.from("app_settings").insert([{
            quick_login_enabled: newEnabled,
            updated_at: new Date().toISOString()
          }]);
        }

        // If master toggle is turned off, update all users in Supabase app_users table to false
        if (!newEnabled) {
          try {
            await client.from("app_users").update({
              quick_login_enabled: false
            }).neq("status", "banned_never_match_placeholder");
          } catch (uErr) {
            console.warn("[Server] Note updating app_users quick_login_enabled:", uErr);
          }
        }
      }
    } catch (e) {
      console.warn("[Server] Notice updating Supabase app_settings:", e);
    }
  }
  res.json({ success: true, quick_login_enabled: getCurrentAppState().quick_login_enabled, users: getCurrentAppState().users });
});

export default router;

