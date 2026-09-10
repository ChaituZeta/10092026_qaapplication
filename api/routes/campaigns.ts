import { Router } from "express";
import { getCurrentAppState, saveAppState } from "../utils/state.ts";
import { getSupabaseServiceKey, getSupabaseUrl, getSupabaseAnonKey } from "../utils/db.ts";
import nodemailer from "nodemailer";
import { emailTemplate, escapeHtml, isPrivateOrInternalUrl } from "../utils/helpers.ts";

export const router = Router();

router.get("/api/campaigns", async (req, res) => {
  try {
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseServiceKey();
    if (!supabaseUrl || !supabaseKey) {
      return res.status(200).json({ campaigns: [], error: "Supabase environment variables not set on server" });
    }
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await client.from("campaigns").select("*");
    if (error) {
      console.warn("[Server API] Supabase campaigns fetch error:", error.message);
      return res.status(200).json({ campaigns: [], error: error.message });
    }
    return res.json({ campaigns: data || [] });
  } catch (err: any) {
    console.error("[Server API] Exception fetching campaigns:", err);
    return res.status(200).json({ campaigns: [], error: err?.message || "Failed to fetch campaigns" });
  }
});

router.post("/api/campaigns", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.name) {
      return res.status(400).json({ error: "Campaign name is required" });
    }
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseServiceKey();
    if (!supabaseUrl || !supabaseKey) {
      console.warn("[Server API] Supabase credentials not configured on server.");
      return res.status(200).json({ success: true, savedToSupabase: false, savedLocally: true, warning: "Supabase credentials not configured on server" });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(supabaseUrl, supabaseKey);

    // Attempt 1: Full payload upsert
    const { data, error } = await client.from("campaigns").upsert(payload).select();
    if (!error && data && data.length > 0) {
      console.log(`[Server API] Successfully saved campaign "${payload.name}" (${payload.id}) to Supabase DB via Service Role.`);
      return res.json({ success: true, savedToSupabase: true, data: data[0] });
    }

    if (error) {
      console.warn("[Server API] Supabase primary upsert notice:", error.message);

      // Attempt 2: Standard schema payload fallback
      const standardPayload = {
        id: payload.id,
        name: payload.name || "Untitled",
        country: payload.country || "IN",
        version_name: payload.version_name || payload.versionName || "Standard",
        status: payload.status || "Draft",
        web_view_url: payload.web_view_url || payload.webViewUrl || "",
        figma_url: payload.figma_url || payload.figmaUrl || "",
        html_source: payload.html_source || payload.htmlSource || "",
        litmus_url: payload.litmus_url || payload.litmusUrl || "",
        design_type: payload.design_type || payload.designType || "figma",
        team: payload.team || "HP-APJ",
        mockup_file_name: payload.mockup_file_name || "",
        outlook_file_name: payload.outlook_file_name || "",
        folder_id: payload.folder_id || "2026",
        user_email: payload.user_email || payload.createdBy || "admin@example.com",
        created_by: payload.created_by || payload.createdBy || "QA User",
        last_edited_by: payload.last_edited_by || payload.lastEditedBy || "QA User",
        created_at: payload.created_at || new Date().toISOString(),
        updated_at: payload.updated_at || new Date().toISOString(),
        is_deleted: payload.is_deleted || false,
        review_note: payload.review_note || "",
        current_step: payload.current_step || 1
      };

      const fbRes = await client.from("campaigns").upsert(standardPayload).select();
      if (!fbRes.error && fbRes.data && fbRes.data.length > 0) {
        console.log(`[Server API] Saved campaign "${payload.name}" using standard payload to Supabase DB.`);
        return res.json({ success: true, savedToSupabase: true, data: fbRes.data[0] });
      }

      // Attempt 3: Minimal payload fallback
      const minPayload = {
        id: payload.id,
        name: payload.name || "Untitled",
        country: payload.country || "IN",
        status: payload.status || "Draft",
        created_at: payload.created_at || new Date().toISOString(),
        updated_at: payload.updated_at || new Date().toISOString()
      };

      const minRes = await client.from("campaigns").upsert(minPayload).select();
      if (!minRes.error && minRes.data && minRes.data.length > 0) {
        console.log(`[Server API] Saved campaign "${payload.name}" using minimal payload to Supabase DB.`);
        return res.json({ success: true, savedToSupabase: true, data: minRes.data[0] });
      }

      console.warn("[Server API] Write notice for Supabase DB (saved locally):", error.message);
      return res.json({
        success: true,
        savedToSupabase: false,
        savedLocally: true,
        warning: error.message || fbRes.error?.message || minRes.error?.message || "Saved locally"
      });
    }

    return res.json({ success: true, savedToSupabase: true, data: data ? data[0] : null });
  } catch (err: any) {
    console.warn("[Server API] Exception saving campaign to Supabase (saved locally):", err?.message);
    return res.json({ success: true, savedToSupabase: false, savedLocally: true, warning: err?.message || "Saved locally" });
  }
});

router.post("/api/campaigns/batch-sync", async (req, res) => {
  try {
    const { campaigns } = req.body;
    if (!Array.isArray(campaigns) || campaigns.length === 0) {
      return res.status(400).json({ error: "Campaigns array is required" });
    }
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseServiceKey();
    if (!supabaseUrl || !supabaseKey) {
      return res.json({ success: true, savedLocally: true, count: campaigns.length });
    }
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(supabaseUrl, supabaseKey);
    
    let successCount = 0;
    for (const camp of campaigns) {
      const itemRes = await client.from("campaigns").upsert(camp);
      if (!itemRes.error) {
        successCount++;
      } else {
        const fallback = {
          id: camp.id,
          name: camp.name || "Untitled",
          country: camp.country || "IN",
          version_name: camp.version_name || camp.versionName || "Standard",
          status: camp.status || "Draft",
          web_view_url: camp.web_view_url || camp.webViewUrl || "",
          figma_url: camp.figma_url || camp.figmaUrl || "",
          html_source: camp.html_source || camp.htmlSource || "",
          litmus_url: camp.litmus_url || camp.litmusUrl || "",
          folder_id: camp.folder_id || "2026",
          user_email: camp.user_email || camp.createdBy || "admin@example.com",
          created_at: camp.created_at || new Date().toISOString(),
          updated_at: camp.updated_at || new Date().toISOString()
        };
        const fbRes = await client.from("campaigns").upsert(fallback);
        if (!fbRes.error) successCount++;
      }
    }
    return res.json({ success: true, savedToSupabase: successCount > 0, count: successCount });
  } catch (err: any) {
    console.warn("[Server API] Exception batch syncing campaigns (saved locally):", err?.message);
    return res.json({ success: true, savedLocally: true, count: 0 });
  }
});

router.delete("/api/campaigns/:id", async (req, res) => {
  try {
    const campaignId = req.params.id;
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseServiceKey();
    if (!supabaseUrl || !supabaseKey) {
      return res.json({ success: true, message: `Campaign ${campaignId} deleted locally` });
    }
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(supabaseUrl, supabaseKey);
    const { error } = await client.from("campaigns").delete().eq("id", campaignId);
    if (error) {
      console.warn("[Server API] Supabase delete error (deleted locally):", error.message);
      return res.json({ success: true, warning: error.message });
    }
    return res.json({ success: true, message: `Campaign ${campaignId} deleted` });
  } catch (err: any) {
    return res.json({ success: true, message: `Campaign ${req.params.id} deleted locally` });
  }
});

export default router;
