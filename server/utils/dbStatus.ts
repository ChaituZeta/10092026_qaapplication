import fs from "fs";
import path from "path";
import { getSupabaseUrl, getSupabaseAnonKey, getSupabaseServiceKey } from "./db.ts";
import { setAppCredentialInDB } from "./credentials.ts";

const HIDDEN_STATUS_FILE = path.join(process.cwd(), ".db_status.json");
const TMP_STATUS_FILE = path.join("/tmp", ".db_status.json");

export interface DatabaseConnectionStatus {
  connected: boolean;
  status: "connected" | "disconnected";
  url: string;
  connectedAt?: string;
  lastVerifiedAt?: string;
  storageTarget: string;
  hasServiceRoleKey: boolean;
  source: "hidden_file" | "database" | "environment" | "initial";
}

function readHiddenConfigFile(): Partial<DatabaseConnectionStatus> | null {
  const candidates = [HIDDEN_STATUS_FILE, TMP_STATUS_FILE];
  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          return parsed;
        }
      }
    } catch {
      // Continue to next candidate
    }
  }
  return null;
}

function writeHiddenConfigFile(data: DatabaseConnectionStatus): boolean {
  let success = false;
  const jsonStr = JSON.stringify(data, null, 2);

  try {
    fs.writeFileSync(HIDDEN_STATUS_FILE, jsonStr, "utf-8");
    success = true;
  } catch (e) {
    // Filesystem may be read-only in some environments
  }

  try {
    fs.writeFileSync(TMP_STATUS_FILE, jsonStr, "utf-8");
    success = true;
  } catch (e) {}

  return success;
}

/**
 * Persistently records the 'Database Connected' status in:
 * 1. Hidden configuration file (.db_status.json)
 * 2. Database table (app_credentials / app_settings)
 */
export async function persistDatabaseConnectionStatus(
  connected: boolean,
  details?: {
    url?: string;
    hasServiceRoleKey?: boolean;
    storageTarget?: string;
  }
): Promise<DatabaseConnectionStatus> {
  const now = new Date().toISOString();
  const existing = readHiddenConfigFile() || {};
  const currentUrl = details?.url || existing.url || getSupabaseUrl();
  const hasServiceRoleKey = details?.hasServiceRoleKey !== undefined
    ? details.hasServiceRoleKey
    : Boolean(getSupabaseServiceKey() && getSupabaseServiceKey().length > 10);

  const statusObj: DatabaseConnectionStatus = {
    connected,
    status: connected ? "connected" : "disconnected",
    url: connected ? currentUrl : "",
    connectedAt: connected ? (existing.connectedAt || now) : undefined,
    lastVerifiedAt: now,
    storageTarget: details?.storageTarget || existing.storageTarget || ".env",
    hasServiceRoleKey: connected ? hasServiceRoleKey : false,
    source: "hidden_file"
  };

  // Save to hidden configuration file
  writeHiddenConfigFile(statusObj);

  // Persistently record in database table (app_credentials) if connected
  if (connected && currentUrl && currentUrl.startsWith("https://")) {
    try {
      await setAppCredentialInDB(
        "DATABASE_CONNECTED_STATUS",
        JSON.stringify({
          connected: true,
          status: "connected",
          url: currentUrl,
          connectedAt: statusObj.connectedAt,
          lastVerifiedAt: statusObj.lastVerifiedAt,
          storageTarget: statusObj.storageTarget
        }),
        "Persistent tracking of database connected status for /setup confirmation view"
      );
    } catch (dbErr) {
      console.warn("[dbStatus] Note recording status to database table:", dbErr);
    }
  }

  return statusObj;
}

/**
 * Reads database connection status:
 * Checks .env credentials first! If credentials are missing or invalid in .env,
 * connection status MUST be disconnected.
 */
export function getPersistentDatabaseStatus(): DatabaseConnectionStatus {
  const envUrl = getSupabaseUrl();
  const envAnonKey = getSupabaseAnonKey();
  const envServiceKey = getSupabaseServiceKey();

  const envHasValidCreds = Boolean(
    envUrl &&
    envAnonKey &&
    envUrl.startsWith("https://") &&
    envUrl !== "https://placeholder.supabase.co" &&
    envAnonKey.length > 10 &&
    envAnonKey !== "placeholder_key"
  );

  // CRITICAL RULE: If .env does NOT have valid credentials, we are NOT connected!
  if (!envHasValidCreds) {
    clearPersistentDatabaseStatus();
    return {
      connected: false,
      status: "disconnected",
      url: "",
      storageTarget: ".env",
      hasServiceRoleKey: false,
      source: "environment"
    };
  }

  const hiddenData = readHiddenConfigFile();
  const statusObj: DatabaseConnectionStatus = {
    connected: true,
    status: "connected",
    url: envUrl,
    connectedAt: hiddenData?.connectedAt || new Date().toISOString(),
    lastVerifiedAt: new Date().toISOString(),
    storageTarget: ".env",
    hasServiceRoleKey: Boolean(envServiceKey && envServiceKey.length > 10),
    source: "environment"
  };
  writeHiddenConfigFile(statusObj);
  return statusObj;
}

/**
 * Clears database connection status in hidden file
 */
export function clearPersistentDatabaseStatus() {
  const resetObj: DatabaseConnectionStatus = {
    connected: false,
    status: "disconnected",
    url: "",
    storageTarget: ".env",
    hasServiceRoleKey: false,
    source: "initial"
  };
  writeHiddenConfigFile(resetObj);
  try {
    if (fs.existsSync(HIDDEN_STATUS_FILE)) fs.unlinkSync(HIDDEN_STATUS_FILE);
    if (fs.existsSync(TMP_STATUS_FILE)) fs.unlinkSync(TMP_STATUS_FILE);
  } catch {}
}
