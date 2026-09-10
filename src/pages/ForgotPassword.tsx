import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { AuthShell } from "../components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, ArrowLeft, Mail } from "lucide-react";

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please provide your email address.");
      return;
    }

    setLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Verify user exists in app_users
      const { data: dbUser } = await supabase
        .from("app_users")
        .select("*")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (!dbUser) {
        setError("No account found matching this email address. Please check your spelling or contact your administrator.");
        setLoading(false);
        return;
      }

      if (dbUser.status === "banned") {
        setError("This account is currently suspended. Please contact your platform administrator.");
        setLoading(false);
        return;
      }

      // 2. Dispatch reset notification email
      const resetUrl = `${window.location.origin}/reset-password?email=${encodeURIComponent(cleanEmail)}`;
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, resetUrl })
      });

      if (!response.ok) {
        throw new Error("Unable to transmit reset instructions. Please try again shortly.");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "An error occurred while attempting to send the reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      {/* Heading & Subtitle matching screenshot style with rewritten wording */}
      <div className="mb-6 text-left">
        <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight">
          Reset Password
        </h1>
        <p className="text-sm font-medium text-[#2b61d6] mt-1">
          Enter your registered email to receive recovery instructions
        </p>
      </div>

      {success ? (
        <div className="space-y-5 text-center py-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 text-[#2b61d6] flex items-center justify-center border border-blue-200 shadow-sm">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-slate-900">
              Recovery Link Dispatched
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
              We've dispatched password reset instructions to{" "}
              <strong className="text-slate-800 font-medium">{email}</strong>. Please check your inbox.
            </p>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              onClick={() => navigate("/login")}
              className="w-full h-11 bg-[#2b61d6] hover:bg-[#2250b8] text-white font-semibold text-sm rounded-md shadow-sm transition-colors cursor-pointer"
            >
              Return to Sign In
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          {error && (
            <div className="p-3 text-xs sm:text-sm rounded-md bg-rose-50 text-rose-700 font-medium border border-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="forgot-email" className="block text-xs font-semibold text-slate-700">
              Email
            </label>
            <div className="relative">
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="username@zetaglobal.com"
                required
                className="w-full h-11 border border-slate-200 bg-[#f8faff] rounded-lg px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#306de4] focus:bg-white focus:ring-2 focus:ring-[#306de4]/20 transition-all shadow-xs"
              />
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <Button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full h-11 bg-[#306de4] hover:bg-[#2250b8] text-white font-semibold text-sm rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? "Transmitting..." : "Send Reset Link"}
            </Button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#306de4] hover:text-[#2250b8] hover:underline transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
