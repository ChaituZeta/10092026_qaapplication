import express from "express";
import rateLimit from "express-rate-limit";
import session from "express-session";

import { router as campaignsRouter } from "./server/routes/campaigns.ts";
import { router as foldersRouter } from "./server/routes/folders.ts";
import { router as miscRouter } from "./server/routes/misc.ts";
import { router as usersRouter } from "./server/routes/users.ts";
import { router as emailsRouter } from "./server/routes/emails.ts";
import { router as settingsRouter } from "./server/routes/settings.ts";
import { router as aiRouter } from "./server/routes/ai.ts";

import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import WebSocket from "ws";

(global as any).WebSocket = WebSocket;

dotenv.config({ override: true });

const escapeHtml = (str: string = "") => {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const isPrivateOrInternalUrl = (urlStr: string): boolean => {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return true;
    }
    const hostname = parsed.hostname.toLowerCase();
    
    // Block local / loopback / cloud metadata hostnames
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname === "169.254.169.254" ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".local")
    ) {
      return true;
    }

    // Check private IPv4 addresses (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16)
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const [, p1, p2] = match.map(Number);
      if (
        p1 === 10 ||
        (p1 === 172 && p2 >= 16 && p2 <= 31) ||
        (p1 === 192 && p2 === 168) ||
        (p1 === 169 && p2 === 254) ||
        p1 === 127 ||
        p1 === 0
      ) {
        return true;
      }
    }

    return false;
  } catch {
    return true; // Reject invalid URLs
  }
};

const emailTemplate = (title: string, content: string, ctaLink?: string, ctaText?: string) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0; }
  .header { padding: 32px; text-align: center; border-bottom: 1px solid #f1f5f9; }
  .logo { max-height: 36px; margin-bottom: 24px; }
  .title { color: #0f172a; font-size: 24px; font-weight: 600; margin: 0; letter-spacing: -0.025em; }
  .content { padding: 32px; color: #334155; font-size: 16px; line-height: 1.6; }
  .content p { margin-top: 0; margin-bottom: 16px; }
  .content strong { color: #0f172a; font-weight: 600; }
  .details-box { background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 24px 0; border: 1px solid #e2e8f0; }
  .button-container { text-align: center; margin: 32px 0 16px; }
  .button { display: inline-block; padding: 12px 28px; background-color: #2b61d6; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; transition: background-color 0.2s; }
  .footer { background-color: #f8fafc; padding: 24px 32px; text-align: center; color: #64748b; font-size: 13px; line-height: 1.5; border-top: 1px solid #e2e8f0; }
  .footer p { margin: 0; margin-bottom: 8px; }
  .footer p:last-child { margin-bottom: 0; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://zetaglobal.com/wp-content/uploads/2023/02/zeta_logoPrimary.svg" alt="Zeta Global" class="logo" />
      <h1 class="title">${escapeHtml(title)}</h1>
    </div>
    <div class="content">
      ${content}
      ${ctaLink && ctaText ? `
      <div class="button-container">
        <a href="${escapeHtml(ctaLink)}" class="button">${escapeHtml(ctaText)}</a>
      </div>
      ` : ''}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Zeta Global. All rights reserved.</p>
      <p>HP-QA Platform Automation System</p>
    </div>
  </div>
</body>
</html>
`;

export const app = express();
app.set("trust proxy", 1);

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false,
    forwardedHeader: false,
    default: true,
  },
});
app.use("/api", apiLimiter);

// Enable Safe CORS
app.use((req, res, next) => {
  const origin = (req.headers.origin as string) || "";
  const allowedOrigins = [process.env.FRONTEND_URL || "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"];
  
  const isVercelDomain = origin.endsWith(".vercel.app") || (process.env.VERCEL_URL && origin.includes(process.env.VERCEL_URL));
  const isLocalhost = origin.startsWith("http://localhost:") || origin.startsWith("https://localhost:") || origin.startsWith("http://127.0.0.1:");

  if (!origin || allowedOrigins.includes(origin) || isLocalhost || isVercelDomain) {
    res.header("Access-Control-Allow-Origin", origin || "*");
  } else {
    res.header("Access-Control-Allow-Origin", origin);
  }
  
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Configure session
app.use((session as any)({
  secret: process.env.SESSION_SECRET || "hp-qa-dev-secret-key-12345",
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 30 * 60 * 1000 // 30 minutes
  }
}));

// Standard payload size
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));

// Server-side dynamic state for persistence & configuration
const APP_STATE_FILE = path.join(process.cwd(), "app_state.json");

interface ServerAppState {
  quick_login_enabled: boolean;
  active_session?: {
    email: string;
    role: string;
    name: string;
    team?: string;
    status?: string;
    avatar?: string;
    timestamp: string;
  } | null;
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    team: string;
    status: string;
    quick_login_enabled: boolean;
    last_login?: string;
  }>;
}

const defaultAppState: ServerAppState = {
  quick_login_enabled: true,
  active_session: null,
  users: []
};

function loadAppState(): ServerAppState {
  try {
    if (fs.existsSync(APP_STATE_FILE)) {
      const data = fs.readFileSync(APP_STATE_FILE, "utf-8");
      const parsed = JSON.parse(data);
      
      const quick_login_enabled = parsed.quick_login_enabled !== undefined ? Boolean(parsed.quick_login_enabled) : true;
      let users = Array.isArray(parsed.users) ? parsed.users : defaultAppState.users;

      return { 
        quick_login_enabled, 
        users
      };
    }
  } catch (err) {
    console.warn("[Server] Error reading app_state.json:", err);
  }
  return { ...defaultAppState };
}

function saveAppState(state: ServerAppState) {
  try {
    fs.writeFileSync(APP_STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Server] Error writing app_state.json:", err);
  }
}

let currentAppState = loadAppState();

// Server-side Supabase credentials setup - exclusively loaded from .env
const getSupabaseServiceKey = () =>
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

const getSupabaseUrl = () =>
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";

const getSupabaseAnonKey = () =>
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  getSupabaseServiceKey();

// Server-side Supabase Config API
// Save Supabase Configuration API
// Test Database Connection API
// Export all migration data for seamless cross-domain migration
// Import migration data to restore on a new instance/domain
// Server-side campaigns API proxy
// Activity Logs API
// Checklists API
// Countries API
// Email sending API route
// Global App Settings API
// AI Agents API
  // Active Session API
// App Users API
  // Fetch available AI models
  // Agent Studio Chat Test Proxy

app.use(campaignsRouter);
app.use(foldersRouter);
app.use(miscRouter);
app.use(usersRouter);
app.use(emailsRouter);
app.use(settingsRouter);
app.use(aiRouter);


async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL && !process.env.VERCEL_ENV && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  startServer();
}

export default app;
