import { Router } from "express";
import { getCurrentAppState, saveAppState } from "../utils/state.ts";
import { getSupabaseServiceKey, getSupabaseUrl, getSupabaseAnonKey } from "../utils/db.ts";
import nodemailer from "nodemailer";
import { emailTemplate, escapeHtml, isPrivateOrInternalUrl } from "../utils/helpers.ts";

export const router = Router();

router.get("/api/folders", async (req, res) => {
  try {
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseServiceKey();
    if (!supabaseUrl || !supabaseKey) {
      return res.status(200).json({ folders: [] });
    }
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await client.from("folders").select("*");
    if (error) {
      return res.status(200).json({ folders: [] });
    }
    return res.json({ folders: data || [] });
  } catch (err) {
    return res.status(200).json({ folders: [] });
  }
});

router.post("/api/folders", async (req, res) => {
  try {
    const folderData = req.body;
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseServiceKey();
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: "Supabase credentials not configured on server" });
    }
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await client.from("folders").upsert(folderData).select();
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to save folder" });
  }
});

router.delete("/api/folders/:id", async (req, res) => {
  try {
    const folderId = req.params.id;
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseServiceKey();
    if (supabaseUrl && supabaseKey) {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(supabaseUrl, supabaseKey);
      await client.from("folders").delete().eq("id", folderId);
    }
    return res.json({ success: true, message: `Folder ${folderId} deleted` });
  } catch (err: any) {
    return res.json({ success: true });
  }
});

export default router;
