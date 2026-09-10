# HP QA Platform (v5) - Project Context & Handover Document

## 1. Project Purpose & Target Users
**Purpose:** An Enterprise Quality Assurance (QA) and Campaign Operations Management Platform. It is designed to automate the inspection, validation, and sign-off processes for Electronic Direct Mailers (eDMs), Salesforce Marketing Cloud (SFMC) dynamic email templates, and AMPscript vouchers.
**Target Users:** Campaign Managers, QA Testers, and Administrators at **Zeta Global** and **HP APJ (Asia-Pacific & Japan)**.

---

## 2. Technology Stack
- **Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS v4, Lucide React (Icons).
- **Backend:** Node.js with Express (`server.ts`), ESBuild.
- **Database:** Supabase (PostgreSQL) with Realtime subscriptions, paired with a LocalStorage dual-sync fallback engine for offline work.
- **Authentication:** Custom Session management (`/api/session`) paired with Supabase.
- **Hosting/Deployment:** Designed for Vercel (includes Vercel serverless function adaptations).
- **Integrations & External Services:**
  - **Nodemailer:** SMTP email dispatcher (Gmail) for sending invites, password resets, and approval sign-offs.
  - **Google Gemini API / OpenAI API:** Used for automated AI grammar checking, copy editing, and custom AI QA validations.
  - **Playwright:** E2E Testing Automation.

---

## 3. Directory & File Structure
```text
hp-qa-platform-v5/
├── api/                           # Serverless route helpers (Future modularization target)
├── lib/                           # Core utilities, state sync, and parsers
│   ├── auth.ts                    # Authentication helpers
│   ├── campaign-storage.ts        # Dual Supabase & LocalStorage sync manager
│   ├── qa-validator.ts            # 22 automated QA checkpoint rule checkers
│   └── supabase.ts                # Supabase client initializer
├── src/                           
│   ├── App.tsx                    # Main React Router & App layout wrapper
│   ├── index.css                  # Global styles and Tailwind configuration
│   ├── components/                # Reusable UI elements and modals
│   │   └── QAWorkspace/           # Modular QA validation workspace (Visual Comparison, Checklists)
│   ├── pages/                     # Main Application Views
│   │   ├── Dashboard.tsx          # Analytics and overview
│   │   ├── Campaigns.tsx          # Main campaign matrix
│   │   ├── CampaignSetup.tsx      # Step-by-step QA wizard
│   │   ├── Agents.tsx             # Dedicated AI Agent Studio
│   │   ├── Settings.tsx           # Profile and system config
│   │   └── ...                    # (Login, Signup, Users, Reports, RecycleBin, Checklists)
├── server.ts                      # Monolithic Express backend (Proxy, SMTP, AI endpoints)
├── supabase_schema.sql            # PostgreSQL DDL table schemas
└── package.json                   # Dependencies and scripts
```

---

## 4. Completed Features & Workflows
- **Campaign QA Wizard (`CampaignSetup.tsx`):** A step-by-step wizard to guide QA testers through validation.
- **Visual Comparison Workspace (`VisualComparison.tsx`):** Split-screen UI comparing live ViewOnline URLs, Outlook MSG files, or raw HTML against Figma design assets. Includes synchronized scrolling and Pixel Shift diffing.
- **Automated Validation:** Automatic URL parameter validation (UTMs, SFMC variables), Alt-tag detection, HTTP status checking, and missing superscript detection.
- **AI Agent Studio (`Agents.tsx`):** A dedicated administrative page to create, edit, and assign specialized AI Agents to specific teams.
- **Reporting & Export:** Generates PDF Verification Certificates and Excel (.csv) QA compliance reports.
- **Team-Based Access Control:** Users and AI Agents are strictly scoped by Team (e.g., HP-APJ).
- **User Management & Audit Logs:** Full administrative controls for creating users, sending secure email invites, and tracking system actions in an immutable activity log.

---

## 5. QA Process Workflow
1. **Input:** User creates a campaign, supplying Figma URL, View Online URL, and/or HTML source.
2. **Link & Tracking Validation:** System checks UTM tags, SFMC parameters, valid links, and Unsubscribe functionality.
3. **Content & Typography:** System executes automated English dictionary checks, grammar validation, and legal symbol checks (©, ®, ™).
4. **Visual Fidelity:** Side-by-side comparison of the HTML output vs. the Figma design.
5. **Logic:** Verifies AMPscript vouchers and Out-of-Stock (OOS) badge routing.
6. **AI Review:** Triggers custom AI Agents to run specialized heuristic checks on the HTML.
7. **Approval & Sign-off:** User completes Stage 7, generating a PDF certificate and sending an SMTP approval email to stakeholders.

---

## 6. AI Agents Architecture
The platform features a multi-agent system managed via the **AI Agent Studio**.

- **Storage:** Agents are persisted in `app_state.json` via `/api/ai-agents`.
- **Inputs:** The AI receives the campaign's raw HTML source code and a dynamically constructed System Prompt.
- **Outputs:** Agents return structured JSON containing a `summary`, an array of `issues`, and an array of `passed` checks.
- **Endpoint:** `/api/run-ai-qa` connects to the configured LLM (defaults to `gpt-4o` or Gemini depending on env variables).
- **Schema per Agent:**
  - `id`: Unique identifier
  - `name`: E.g., "Legal Compliance Agent"
  - `description`: Short summary of the agent's purpose.
  - `rules`: The specific system prompt instructions injected into the LLM context.
  - `assigned_teams`: Array of teams allowed to use this agent (e.g., `["HP-APJ"]`). If empty, it is a Global agent.
  - `is_default`: Boolean indicating if it runs automatically.
- **Handoff Logic:** Currently, agents run independently based on user selection in the UI. There is no automated agent-to-agent conversational handoff implemented.

---

## 7. MCP Integrations
- **Currently Configured MCP Servers:** None.
- **Purpose:** While the platform utilizes external APIs (OpenAI, Gemini), it does not currently expose or consume tools via the Model Context Protocol (MCP).

---

## 8. Database Schema (Supabase)
| Table | Description |
|---|---|
| **`campaigns`** | Stores campaign metadata, HTML source, Litmus URLs, QA results, step progress, and soft-delete states. |
| **`app_users`** | Team accounts, roles (`admin`, `user`), team assignments, and Quick Login permissions. |
| **`folders`** | Hierarchical structure for organizing campaigns. |
| **`activity_logs`** | Immutable ledger of system events (logins, deletions, edits). |
| **`checklists`** | Custom QA template definitions. |
| **`countries`** | Region URL configurations. |
| **`app_settings`** | Global application state (e.g., global Quick Login toggles). |

---

## 9. APIs & External Services
- **`GET/POST /api/campaigns`**: Dual-sync campaign storage.
- **`POST /api/invite` & `/api/send-approval-email`**: SMTP dispatcher using **Nodemailer** (requires `GMAIL_USER` and `GMAIL_APP_PASSWORD`).
- **`GET /api/proxy`**: Custom CORS-bypassing proxy for rendering external URLs inside sandboxed iframes.
- **`POST /api/grammar-check`**: Utilizes `@google/genai` (Gemini 2.5 Flash) for intelligent copy editing. Falls back to a local regex dictionary if offline.
- **`POST /api/run-ai-qa`**: Utilizes OpenAI (or generic API) via `AI_API_URL` and `AI_API_KEY` for executing custom AI Agents.

---

## 10. Known Bugs, Limitations & Technical Debt
1. **Campaign Status Bug:** Campaigns that reach "Approved" status occasionally still show as "In Progress" on the Dashboard/Campaigns matrix. *(Identified by user)*
2. **Monolithic Backend:** `server.ts` is over 1,500 lines long. Route handlers need to be modularized into the `api/routes/` directory.
3. **No Code Search:** The HTML Source tab inside the Visual Comparison workspace lacks a search function (CTRL+F) and syntax highlighting.
4. **RBAC Limitations:** Role-based access is currently binary (Admin vs. User). Needs granular permissions (e.g., Read-Only Auditor, Regional Lead).

---

## 11. Running & Deploying
**Prerequisites:** Node.js (v20+), npm.

**Local Setup:**
1. `npm install`
2. Create a `.env` file with your credentials:
   ```env
   SUPABASE_URL=...
   SUPABASE_ANON_KEY=...
   GMAIL_USER=...
   GMAIL_APP_PASSWORD=...
   GEMINI_API_KEY=...
   AI_API_URL=...
   AI_API_KEY=...
   ```
3. `npm run dev` (Starts Vite and the Express backend simultaneously on port 3000).

**Production Deployment:**
1. `npm run build` (Compiles React via Vite and bundles `server.ts` via ESBuild into `dist/server.cjs`).
2. `npm run start` (Runs the bundled production Node server).
3. For Vercel, the `vercel.json` maps `/api/*` routes to serverless functions.

---

## 12. Recommended Next Priorities (By Impact)
1. **Fix Campaign Status Bug:** Resolve the issue where approved campaigns remain stuck "In Progress" in the UI.
2. **Backend Modularization:** Refactor `server.ts` to cleanly separate API routes, improving maintainability.
3. **HTML Code Workspace Enhancements:** Add Syntax Highlighting and a search bar to the HTML inspection tab.
4. **Automated Notification Engine:** Integrate Webhooks to ping Slack or Microsoft Teams channels automatically when a campaign is approved or fails QA.
5. **Campaign Bulk Actions:** Add checkboxes to the Campaign matrix for batch archiving and folder assignments.
