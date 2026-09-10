import { supabase } from "./supabase";

export async function logAction(userEmail: string, actionType: string, details: string, campaignId?: string) {
  const email = userEmail || 'unknown@example.com';
  const timestamp = new Date().toISOString();

  // Write to Supabase database
  try {
    const { error } = await supabase.from('activity_logs').insert([{
      user_email: email,
      action_type: actionType,
      details: details,
      campaign_id: campaignId || null
    }]);

    if (error) {
      console.warn("[Logger] Supabase log insert notice, trying server API:", error.message);
      // Fallback to server API if direct Supabase insert fails
      await fetch('/api/activity-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: email,
          action_type: actionType,
          details: details,
          campaign_id: campaignId || null,
          created_at: timestamp
        })
      });
    }
  } catch (err) {
    console.error("Failed to log action to database:", err);
  }
}

export async function getCampaignLogs(campaignId?: string, campaignName?: string): Promise<any[]> {
  let combined: any[] = [];

  // 1. Fetch from Supabase database
  try {
    let query = supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data, error } = await query;

    if (!error && data) {
      combined = [...data];
    }
  } catch (e) {
    console.error("Error fetching activity_logs from Supabase:", e);
  }

  // 2. Fetch from server API fallback if Supabase returns 0
  if (combined.length === 0) {
    try {
      const res = await fetch('/api/activity-logs');
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const json = await res.json();
        if (json && json.logs && Array.isArray(json.logs)) {
          combined = json.logs;
        }
      }
    } catch (e) {
      console.warn("[Logger] Notice fetching server activity_logs:", e);
    }
  }

  // Filter logs relevant to campaign if campaignId or campaignName provided
  if (campaignId || campaignName) {
    const idStr = String(campaignId || "").toLowerCase();
    const nameStr = String(campaignName || "").toLowerCase();

    combined = combined.filter(log => {
      const details = String(log.details || "").toLowerCase();
      const type = String(log.action_type || "").toLowerCase();
      const logCampId = String(log.campaign_id || "").toLowerCase();

      if (idStr && (logCampId === idStr || details.includes(idStr))) return true;
      if (nameStr && details.includes(nameStr)) return true;
      return false;
    });
  }

  // Sort by created_at descending
  combined.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  return combined;
}

