import { supabase } from "@/lib/supabase";
import { clearPostLoginRedirectUrl } from "@/lib/url-redirect";
import { clearActiveSession } from "@/lib/session";

export async function logoutUser(): Promise<void> {
  // 1. Clear in-memory session
  clearActiveSession();

  // 2. Clear redirect history from memory
  clearPostLoginRedirectUrl();

  // 3. Sign out explicitly from Supabase Auth
  try {
    if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co') {
      await supabase.auth.signOut();
    }
  } catch (e) {
    console.warn("[Auth] Supabase signOut warning:", e);
  }

  // 4. Notify app components
  window.dispatchEvent(new Event("app_auth_changed"));

  // 5. Hard redirect to '/login' so browser URL clears current page & parameters completely
  window.location.href = "/login";
}
