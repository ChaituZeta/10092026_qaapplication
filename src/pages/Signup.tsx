import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { setActiveSession } from "@/lib/session";
import { executePostLoginRedirect } from "@/lib/url-redirect";
import { UserPlus, Mail, Lock, User, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitedEmail = searchParams.get("email") || "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState(invitedEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [team, setTeam] = useState("HP-APJ");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (invitedEmail) {
      setEmail(invitedEmail);
    }
  }, [invitedEmail]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim() || !name.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Check if user already exists in app_users
      const { data: existingUser } = await supabase
        .from("app_users")
        .select("*")
        .eq("email", cleanEmail)
        .maybeSingle();

      const role = existingUser?.role || (cleanEmail.includes("admin") ? "admin" : "user");

      // 2. Try Supabase Auth SignUp if available
      try {
        await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: { name: name.trim(), team, role }
          }
        });
      } catch (authErr) {
        console.warn("[Signup] Supabase Auth note:", authErr);
      }

      // 3. Upsert into app_users table
      const userPayload = {
        name: name.trim(),
        email: cleanEmail,
        role: role,
        team: team,
        status: "active",
        last_login: new Date().toISOString()
      };

      try {
        await supabase.from("app_users").upsert(userPayload, { onConflict: "email" });
      } catch (dbErr) {
        console.warn("[Signup] Database upsert note:", dbErr);
      }

      // Also notify backend server
      try {
        await fetch("/api/app-users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: userPayload })
        });
      } catch (e) {}

      // 4. Set active session
      const sessionObj = {
        email: cleanEmail,
        role: role,
        name: name.trim(),
        team: team,
        timestamp: new Date().toISOString()
      };
      setActiveSession(sessionObj);
      window.dispatchEvent(new Event("app_auth_changed"));

      setSuccess(true);
      setTimeout(() => {
        executePostLoginRedirect(navigate);
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#2b61d6] text-white shadow-lg mb-4">
          <UserPlus className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Create your QA Platform Account
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Join the HP QA verification and campaign management workspace
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-200 sm:rounded-2xl sm:px-10">
          {error && (
            <div className="mb-5 rounded-lg bg-rose-50 p-4 border border-rose-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-800">{error}</p>
            </div>
          )}

          {success ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900">Account Created Successfully!</h3>
              <p className="text-sm text-slate-500 mt-1">Redirecting you to your dashboard...</p>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSignup}>
              <div>
                <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
                  Full Name
                </Label>
                <div className="mt-1 relative">
                  <Input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="pl-9 h-10"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                  Email Address
                </Label>
                <div className="mt-1 relative">
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@hp.com"
                    className="pl-9 h-10"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <Label htmlFor="team" className="text-xs font-semibold text-slate-700">
                  Region / Team
                </Label>
                <select
                  id="team"
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  className="mt-1 flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-[#2b61d6]"
                >
                  <option value="HP-APJ">HP-APJ (Asia Pacific & Japan)</option>
                  <option value="HP-EMEA">HP-EMEA (Europe, Middle East, Africa)</option>
                  <option value="HP-AMS">HP-AMS (Americas)</option>
                  <option value="Cheetah Digital">Cheetah Digital</option>
                </select>
              </div>

              <div>
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                  Password
                </Label>
                <div className="mt-1 relative">
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 h-10"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-700">
                  Confirm Password
                </Label>
                <div className="mt-1 relative">
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 h-10"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 bg-[#2b61d6] hover:bg-[#2250b8] text-white font-semibold flex items-center justify-center gap-2"
                >
                  {loading ? "Creating Account..." : "Create Account"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="text-[#2b61d6] font-semibold hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
export default Signup;
