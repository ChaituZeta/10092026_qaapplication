import { Router } from "express";
import { getCurrentAppState, saveAppState } from "../utils/state.ts";
import { getSupabaseServiceKey, getSupabaseUrl, getSupabaseAnonKey } from "../utils/db.ts";
import nodemailer from "nodemailer";
import { emailTemplate, escapeHtml, isPrivateOrInternalUrl } from "../utils/helpers.ts";

export const router = Router();

router.get("/api/activity-logs", async (req, res) => {
  try {
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseServiceKey();
    if (supabaseUrl && supabaseKey) {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await client
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!error && data) {
        return res.json({ logs: data });
      }
    }
    return res.json({ logs: [] });
  } catch (err: any) {
    return res.status(200).json({ logs: [], error: err?.message });
  }
});

router.post("/api/activity-logs", async (req, res) => {
  try {
    const logData = req.body;
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseServiceKey();
    if (supabaseUrl && supabaseKey && logData) {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await client.from("activity_logs").insert([logData]).select();
      if (!error && data) {
        return res.json({ success: true, data: data[0] });
      }
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.json({ success: true, warning: err?.message });
  }
});

router.get("/api/checklists", async (req, res) => {
  try {
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseServiceKey();
    if (supabaseUrl && supabaseKey) {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await client.from("checklists").select("*");
      if (!error && data) {
        const checklists = data.map((row: any) => {
          let items = row.items;
          if (typeof items === "string") {
            try { items = JSON.parse(items); } catch (e) { items = []; }
          }
          return { team: row.team, items: Array.isArray(items) ? items : [] };
        });
        return res.json({ checklists });
      }
    }
    return res.json({ checklists: [] });
  } catch (err: any) {
    return res.status(200).json({ checklists: [] });
  }
});

router.post("/api/checklists", async (req, res) => {
  try {
    const { checklists } = req.body;
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseServiceKey();
    if (supabaseUrl && supabaseKey && Array.isArray(checklists)) {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(supabaseUrl, supabaseKey);
      for (const cl of checklists) {
        await client.from("checklists").upsert({
          team: cl.team,
          items: typeof cl.items === "string" ? cl.items : JSON.stringify(cl.items || [])
        });
      }
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.json({ success: true, warning: err?.message });
  }
});

router.get("/api/countries", async (req, res) => {
  try {
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseServiceKey();
    if (supabaseUrl && supabaseKey) {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await client.from("countries").select("*");
      if (!error && data) {
        return res.json({ countries: data });
      }
    }
    return res.json({ countries: [] });
  } catch (err: any) {
    return res.status(200).json({ countries: [] });
  }
});

router.post("/api/countries", async (req, res) => {
  try {
    const { countries } = req.body;
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseServiceKey();
    if (supabaseUrl && supabaseKey && Array.isArray(countries)) {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(supabaseUrl, supabaseKey);
      await client.from("countries").upsert(countries);
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.json({ success: true, warning: err?.message });
  }
});

router.get("/api/proxy", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  let rawUrl = req.query?.url;
  if (Array.isArray(rawUrl)) rawUrl = rawUrl[0];

  if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><title>No URL Provided</title></head>
        <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f8fafc; color: #64748b;">
          <div style="text-align: center; padding: 20px;">
            <p style="font-weight: 600;">No View Online URL specified</p>
            <p style="font-size: 12px; color: #94a3b8;">Enter a valid URL above to preview online campaign content.</p>
          </div>
        </body>
      </html>
    `);
  }

  let targetUrl = rawUrl.trim();
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = "https://" + targetUrl;
  }

  if (isPrivateOrInternalUrl(targetUrl)) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Forbidden URL</title></head>
        <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #fef2f2; color: #991b1b;">
          <div style="text-align: center; padding: 20px;">
            <p style="font-weight: 700; font-size: 16px;">Access Restricted</p>
            <p style="font-size: 13px;">Cannot proxy internal, private, or non-HTTP addresses.</p>
          </div>
        </body>
      </html>
    `);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      },
      redirect: "follow"
    });
    clearTimeout(timeout);

    if (!response.ok) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Fetch Status ${response.status}</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; text-align: center; }
              .card { background: #1e293b; border: 1px solid #334155; padding: 32px; border-radius: 16px; max-width: 480px; width: 100%; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
              .badge { background: #f59e0b; color: #78350f; font-weight: 800; font-size: 12px; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; margin-bottom: 12px; }
              h2 { font-size: 18px; margin: 0 0 8px 0; color: #ffffff; }
              p { font-size: 13px; color: #94a3b8; margin: 0 0 20px 0; line-height: 1.5; word-break: break-all; }
              .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #2563eb; color: #ffffff; font-weight: 600; font-size: 13px; text-decoration: none; padding: 10px 20px; border-radius: 8px; transition: background 0.2s; }
              .btn:hover { background: #1d4ed8; }
            </style>
          </head>
          <body>
            <div class="card">
              <span class="badge">HTTP ${response.status}</span>
              <h2>Upstream Server Error</h2>
              <p>The target server returned HTTP status <strong>${response.status}</strong> for URL:<br><span style="color:#60a5fa; font-family: monospace;">${targetUrl}</span></p>
              <a href="${targetUrl}" target="_blank" class="btn">Open Link Directly ↗</a>
            </div>
          </body>
        </html>
      `);
    }

    const html = await response.text();
    const baseTag = `<base href="${targetUrl}">`;
    const darkModeScript = `
      <style>
        html.dark-mode-preview {
          filter: invert(1) hue-rotate(180deg) !important;
          background-color: #0d1117 !important;
        }
        html.dark-mode-preview img, 
        html.dark-mode-preview picture, 
        html.dark-mode-preview video, 
        html.dark-mode-preview canvas, 
        html.dark-mode-preview svg, 
        html.dark-mode-preview [style*="background-image"],
        html.dark-mode-preview [style*="background:url"],
        html.dark-mode-preview [style*="background: url"],
        html.dark-mode-preview .dark-mode-preserve,
        html.dark-mode-preview [data-dark-mode-preserve] {
          filter: invert(1) hue-rotate(180deg) !important;
        }
        html.dark-mode-preview .light-img { display: none !important; }
        html.dark-mode-preview .dark-img { display: block !important; }
      </style>
      <script>
        window.addEventListener('message', function(e) {
          if (e.data && e.data.type === 'QA_THEME_UPDATE') {
            if (e.data.theme === 'dark') {
              document.documentElement.classList.add('dark-mode-preview');
            } else {
              document.documentElement.classList.remove('dark-mode-preview');
            }
          }
        });
      </script>
    `;

    let modifiedHtml = html;
    if (html.includes("<head>")) {
      modifiedHtml = html.replace("<head>", `<head>${baseTag}${darkModeScript}`);
    } else {
      modifiedHtml = baseTag + darkModeScript + html;
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(modifiedHtml);
  } catch (error: any) {
    console.error("[Proxy Error]:", error?.message || error);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>View Online Preview Error</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; text-align: center; }
            .card { background: #1e293b; border: 1px solid #334155; padding: 32px; border-radius: 16px; max-width: 480px; width: 100%; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
            .badge { background: #ef4444; color: #ffffff; font-weight: 800; font-size: 11px; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; margin-bottom: 12px; }
            h2 { font-size: 18px; margin: 0 0 8px 0; color: #ffffff; }
            p { font-size: 13px; color: #94a3b8; margin: 0 0 20px 0; line-height: 1.5; word-break: break-all; }
            .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #2563eb; color: #ffffff; font-weight: 600; font-size: 13px; text-decoration: none; padding: 10px 20px; border-radius: 8px; transition: background 0.2s; }
            .btn:hover { background: #1d4ed8; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">Connection Fallback</span>
            <h2>Unable to Proxy Content</h2>
            <p>Could not load live preview directly through proxy (<span style="font-family:monospace; color:#cbd5e1;">${error?.message || "Timeout or Network error"}</span>).</p>
            <a href="${targetUrl}" target="_blank" class="btn">Open View Online Link Directly ↗</a>
          </div>
        </body>
      </html>
    `);
  }
});

router.post("/api/check-url", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });
  if (isPrivateOrInternalUrl(url)) {
    return res.status(403).json({ error: "Forbidden: Access to internal or non-HTTP addresses is restricted." });
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const start = Date.now();
    let response: any;
    try {
      response = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        }
      });
      // If server rejects HEAD with 405 Method Not Allowed or 403 Forbidden, retry with GET
      if (response.status === 405 || response.status === 403) {
        response = await fetch(url, {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
          }
        });
      }
    } catch {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        }
      });
    }
    clearTimeout(timeout);

    const end = Date.now();
    const finalUrl = response.url || url;
    
    // Parse query params from finalUrl
    const urlObj = new URL(finalUrl);
    const utmParams: Record<string, string> = {};
    urlObj.searchParams.forEach((val, key) => {
      if (key.toLowerCase().startsWith("utm_") || key.toLowerCase() === "jumpid" || key.toLowerCase().startsWith("et_")) {
        utmParams[key] = val;
      }
    });

    res.json({
      status: response.status,
      finalUrl: finalUrl,
      responseTime: end - start,
      utmParams
    });
  } catch (error: any) {
    res.status(200).json({ 
      status: 0, 
      finalUrl: "", 
      responseTime: 0, 
      error: error?.message || "Failed to reach target URL" 
    });
  }
});

export default router;
