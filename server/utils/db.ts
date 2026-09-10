import fs from "fs";
import path from "path";
import dotenv from "dotenv";

/**
 * Parses the .env file directly from disk.
 * Returns null if .env does not exist.
 */
function readEnvDirectly(): Record<string, string> | null {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return null;
  try {
    return dotenv.parse(fs.readFileSync(envPath, "utf-8")) || {};
  } catch {
    return {};
  }
}

export const getSupabaseUrl = (): string => {
  const parsedEnv = readEnvDirectly();
  if (parsedEnv !== null) {
    // .env file exists on disk - it is the absolute source of truth
    const val = (parsedEnv.VITE_SUPABASE_URL || parsedEnv.SUPABASE_URL || "").trim();
    if (!val) {
      // Sync process.env: remove stale in-memory value if deleted from .env
      delete process.env.VITE_SUPABASE_URL;
      delete process.env.SUPABASE_URL;
    } else {
      process.env.VITE_SUPABASE_URL = val;
      process.env.SUPABASE_URL = val;
    }
    return val;
  }

  // If no .env file exists on disk, check runtime process.env (for cloud/Docker hosting)
  return (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
};

export const getSupabaseAnonKey = (): string => {
  const parsedEnv = readEnvDirectly();
  if (parsedEnv !== null) {
    // .env file exists on disk - it is the absolute source of truth
    const val = (parsedEnv.VITE_SUPABASE_ANON_KEY || parsedEnv.SUPABASE_ANON_KEY || "").trim();
    if (!val) {
      delete process.env.VITE_SUPABASE_ANON_KEY;
      delete process.env.SUPABASE_ANON_KEY;
    } else {
      process.env.VITE_SUPABASE_ANON_KEY = val;
      process.env.SUPABASE_ANON_KEY = val;
    }
    return val;
  }

  // If no .env file exists on disk, check runtime process.env
  return (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "").trim();
};

export const getSupabaseServiceKey = (): string => {
  const parsedEnv = readEnvDirectly();
  if (parsedEnv !== null) {
    // .env file exists on disk - it is the absolute source of truth
    const val = (
      parsedEnv.SUPABASE_SERVICE_ROLE_KEY ||
      parsedEnv.VITE_SUPABASE_SERVICE_ROLE_KEY ||
      ""
    ).trim();
    if (!val) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = val;
    }
    return val;
  }

  // If no .env file exists on disk, check runtime process.env
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();
};
