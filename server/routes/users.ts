import { Router } from "express";
import { getCurrentAppState, saveAppState } from "../utils/state.ts";

const currentAppState = getCurrentAppState();
import { getSupabaseServiceKey, getSupabaseUrl, getSupabaseAnonKey } from "../utils/db.ts";
import nodemailer from "nodemailer";
import { emailTemplate, escapeHtml, isPrivateOrInternalUrl } from "../utils/helpers.ts";

export const router = Router();

router.post("/api/invite", async (req, res) => {
  const { name, email, role, team, inviteUrl } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: "Email and Name are required" });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD, 
      },
    });

    const content = `
      <p>Hi ${escapeHtml(name)},</p>
      <p>You have been invited to join the <strong>HP-QA Platform</strong> by an administrator.</p>
      <div class="details-box">
        <p style="margin-bottom: 8px;"><strong>Assigned Team:</strong> ${escapeHtml(team)}</p>
        <p style="margin-bottom: 0;"><strong>Account Role:</strong> <span style="text-transform: capitalize;">${escapeHtml(role)}</span></p>
      </div>
      <p>Please click the button below to accept the invitation and securely complete your account setup:</p>
    `;

    const mailOptions = {
      from: `"HP-QA Platform" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Invitation to join HP-QA Platform",
      html: emailTemplate("Welcome to HP-QA Platform", content, inviteUrl, "Accept Invitation"),
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Invitation sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email." });
  }
});

router.get("/api/session", (req, res) => {
  res.json({ session: (req.session as any).active_session || null });
});

router.post("/api/session", (req, res) => {
  const session = req.body?.session || req.body;
  if (session && session.email) {
    (req.session as any).active_session = {
      email: (session.email || "").trim().toLowerCase(),
      role: session.role || "user",
      name: session.name || session.email.split("@")[0],
      team: session.team || "HP-APJ",
      status: session.status || "active",
      avatar: session.avatar || "",
      timestamp: session.timestamp || new Date().toISOString()
    };
  }
  res.json({ success: true, session: (req.session as any).active_session });
});

router.post("/api/session/logout", (req, res) => {
  req.session.destroy(() => {});
  res.json({ success: true, message: "Logged out" });
});

router.get("/api/app-users", async (req, res) => {
  try {
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseServiceKey() || getSupabaseAnonKey();
    if (supabaseUrl && supabaseKey && supabaseUrl.startsWith("https://")) {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(supabaseUrl, supabaseKey);
      const { data: dbUsers, error } = await client.from("app_users").select("*").order("created_at", { ascending: true });
      if (!error && Array.isArray(dbUsers)) {
        currentAppState.users = dbUsers;
        saveAppState(currentAppState);
        return res.json({ users: dbUsers });
      }
    }
  } catch (e) {
    console.warn("[Server API] Note fetching app_users from Supabase:", e);
  }
  res.json({ users: currentAppState.users || [] });
});

router.post("/api/app-users", async (req, res) => {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseServiceKey() || getSupabaseAnonKey();

  if (req.body && Array.isArray(req.body.users)) {
    currentAppState.users = req.body.users;
    saveAppState(currentAppState);
  } else if (req.body && (req.body.user || req.body.email)) {
    const updatedUser = req.body.user || req.body;
    const targetEmail = (updatedUser.email || "").trim().toLowerCase();
    if (targetEmail) {
      const idx = currentAppState.users.findIndex(u => (u.email || "").trim().toLowerCase() === targetEmail);
      if (idx >= 0) {
        currentAppState.users[idx] = { ...currentAppState.users[idx], ...updatedUser };
      } else {
        currentAppState.users.push(updatedUser);
      }
      saveAppState(currentAppState);

      if (supabaseUrl && supabaseKey) {
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const client = createClient(supabaseUrl, supabaseKey);
          await client.from("app_users").upsert(updatedUser, { onConflict: "email" });
        } catch (e) {}
      }
    }
  }
  res.json({ success: true, users: currentAppState.users });
});

router.post("/api/app-users/delete", async (req, res) => {
  const { email, id } = req.body || {};
  const targetEmail = (email || "").trim().toLowerCase();
  if (targetEmail || id) {
    currentAppState.users = (currentAppState.users || []).filter(u => {
      const uEmail = (u.email || "").trim().toLowerCase();
      if (targetEmail && uEmail === targetEmail) return false;
      if (id && u.id === id) return false;
      return true;
    });
    saveAppState(currentAppState);

    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseServiceKey() || getSupabaseAnonKey();
    if (supabaseUrl && supabaseKey) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const client = createClient(supabaseUrl, supabaseKey);
        if (id) {
          await client.from("app_users").delete().eq("id", id);
        }
        if (targetEmail) {
          await client.from("app_users").delete().eq("email", targetEmail);
        }
        console.log(`[Server API] Successfully deleted user ${targetEmail || id} from Supabase app_users table.`);
      } catch (e) {
        console.warn("[Server API] Note deleting user from Supabase app_users:", e);
      }
    }
  }
  res.json({ success: true, users: currentAppState.users });
});

export default router;

