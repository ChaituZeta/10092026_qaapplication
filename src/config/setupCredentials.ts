export type CredentialStorageTarget = "env" | "database";
export type CredentialCategory = "database" | "ai" | "email" | "security" | "integrations";

export interface SetupCredentialField {
  id: string;
  key: string;
  label: string;
  placeholder: string;
  description: string;
  type: "text" | "password" | "url";
  required: boolean;
  storageTarget: CredentialStorageTarget;
  category: CredentialCategory;
  helperLink?: {
    text: string;
    url: string;
  };
  validate?: (value: string) => string | null;
}

/**
 * Extensible configuration registry for credentials on the centralized Setup Page.
 * 
 * Rules:
 * 1. Database connection credentials (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
 *    must ALWAYS have storageTarget: "env". They are saved exclusively to the .env file.
 * 2. Any additional application credentials/secrets added in the future should use storageTarget: "database".
 *    They will be stored securely inside the Supabase database (app_credentials table).
 * 3. All configuration fields render on this single Setup Page without requiring separate setup screens.
 */
export const SETUP_CREDENTIAL_FIELDS: SetupCredentialField[] = [
  {
    id: "supabase_url",
    key: "VITE_SUPABASE_URL",
    label: "Supabase Project URL",
    placeholder: "https://your-project.supabase.co",
    description: "The primary HTTPS REST and Realtime API endpoint for your Supabase PostgreSQL instance.",
    type: "url",
    required: true,
    storageTarget: "env",
    category: "database",
    helperLink: {
      text: "Supabase Project Settings > API",
      url: "https://supabase.com/dashboard/project/_/settings/api"
    },
    validate: (val) => {
      const trimmed = (val || "").trim();
      if (!trimmed) return "Supabase Project URL is required.";
      if (!trimmed.startsWith("https://")) return "Supabase Project URL must start with https://";
      if (trimmed === "https://placeholder.supabase.co") return "Please provide your actual Supabase Project URL.";
      return null;
    }
  },
  {
    id: "supabase_anon_key",
    key: "VITE_SUPABASE_ANON_KEY",
    label: "Supabase Public Anon API Key",
    placeholder: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    description: "Public client key used for browser queries with Row Level Security (RLS) policies.",
    type: "password",
    required: true,
    storageTarget: "env",
    category: "database",
    validate: (val) => {
      const trimmed = (val || "").trim();
      if (!trimmed) return "Supabase Public Anon API Key is required.";
      if (trimmed === "placeholder_key") return "Please provide your actual Anon Key.";
      if (trimmed.length < 15) return "Supabase Anon Key is too short.";
      return null;
    }
  },
  {
    id: "supabase_service_key",
    key: "SUPABASE_SERVICE_ROLE_KEY",
    label: "Supabase Service Role Key",
    placeholder: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    description: "Privileged server-side key for backend operations, schema validation, and user management.",
    type: "password",
    required: true,
    storageTarget: "env",
    category: "database",
    validate: (val) => {
      const trimmed = (val || "").trim();
      if (!trimmed) return "Supabase Service Role Key is required.";
      if (trimmed === "placeholder_key") return "Please provide your actual Service Role Key.";
      if (trimmed.length < 15) return "Supabase Service Role Key is too short.";
      return null;
    }
  }
];

export const CATEGORY_METADATA: Record<CredentialCategory, { title: string; description: string; badge: string }> = {
  database: {
    title: "Initial Database Connection",
    description: "These credentials establish the primary connection to Supabase and are stored strictly in the .env file.",
    badge: "Saved to .env"
  },
  ai: {
    title: "AI QA & Prompt Engine",
    description: "API keys for automated checklist verification, stored safely in the database.",
    badge: "Saved to Supabase DB"
  },
  email: {
    title: "Notification Dispatcher",
    description: "SMTP configuration for automated QA sign-off emails, stored in the database.",
    badge: "Saved to Supabase DB"
  },
  security: {
    title: "Session & Token Security",
    description: "Application encryption keys and session tokens, stored in the database.",
    badge: "Saved to Supabase DB"
  },
  integrations: {
    title: "Third-Party Webhooks & Integrations",
    description: "External API secrets and webhooks, stored in the database.",
    badge: "Saved to Supabase DB"
  }
};
