import { Router } from "express";
import { getCurrentAppState, saveAppState } from "../utils/state.ts";
import { getSupabaseServiceKey, getSupabaseUrl, getSupabaseAnonKey } from "../utils/db.ts";
import nodemailer from "nodemailer";
import { emailTemplate, escapeHtml, isPrivateOrInternalUrl } from "../utils/helpers.ts";

export const router = Router();

router.post("/api/forgot-password", async (req, res) => {
  const { email, resetUrl } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
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
      <p>Hi there,</p>
      <p>We received a request to reset the password for your HP-QA Platform account associated with this email address.</p>
      <p>Click the button below to choose a new password. This link will expire in 24 hours.</p>
    `;

    const mailOptions = {
      from: `"HP-QA Platform" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Password Reset Request - HP-QA Platform",
      html: emailTemplate("Reset Your Password", content, resetUrl, "Reset Password"),
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Password reset email sent successfully!" });
  } catch (error) {
    console.error("Error sending forgot password email:", error);
    res.status(500).json({ error: "Failed to send reset email." });
  }
});

router.post("/api/send-password-setup", async (req, res) => {
  const { name, email, setupUrl } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
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
      <p>Hello ${name || email.split("@")[0]},</p>
      <p>An administrator has generated a secure password setup link for your <strong>HP-QA Platform</strong> account.</p>
      <p>Please click the button below to set up or change your password and access your dashboard.</p>
    `;

    const mailOptions = {
      from: `"HP-QA Platform Admin" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Set Up Your Password - HP-QA Platform",
      html: emailTemplate("Password Setup", content, setupUrl || `${req.headers.origin || ''}/signup?email=${encodeURIComponent(email)}&type=password-setup`, "Set Up Password"),
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Password setup email sent successfully!" });
  } catch (error) {
    console.error("Error sending password setup email:", error);
    res.status(500).json({ error: "Failed to send password setup email." });
  }
});

router.post("/api/send-approval-email", async (req, res) => {
  const { to, cc, subject, body, html, senderEmail } = req.body;
  if (!to) {
    return res.status(400).json({ error: "Recipient email is required" });
  }

  try {
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      const mailOptions = {
        from: `"HP-QA Platform" <${process.env.GMAIL_USER}>`,
        to: to,
        cc: cc || undefined,
        subject: subject || "QA Approval Notification",
        text: body,
        html: html || undefined,
      };

      await transporter.sendMail(mailOptions);
      return res.json({ success: true, message: "Approval email sent successfully via SMTP server!" });
    } else {
      // SMTP not configured - notify client to use mailto/webmail
      return res.json({ 
        success: true, 
        deliveredVia: "client",
        message: "Email drafted. Use Outlook/Mail Client or Webmail link to deliver." 
      });
    }
  } catch (error: any) {
    console.error("Error sending approval email via server:", error);
    res.status(500).json({ error: error.message || "Failed to send email via SMTP" });
  }
});

export default router;
