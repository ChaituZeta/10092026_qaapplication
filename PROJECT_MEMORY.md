# HP QA Platform (v5) — Project Memory & Architecture Guide

## 1. Project Overview & Business Context
- **Application Name**: HP QA Platform (v5)
- **Primary Stakeholders / Teams**: Zeta Global & HP APJ (Asia-Pacific & Japan)
- **Core Purpose**: Comprehensive Quality Assurance (QA) and Campaign Operations Management application engineered to automate the inspection, validation, and sign-off processes for Electronic Direct Mailers (eDMs), Salesforce Marketing Cloud (SFMC) dynamic email templates, AMPscript vouchers, and multi-region marketing campaigns.

---

## 2. Technology Stack & Key Dependencies

### Frontend
- **Framework**: React 19 (`react` & `react-dom` v19.0.1) with TypeScript
- **Bundler & Dev Tooling**: Vite 6, TSX, ESBuild
- **Styling**: Tailwind CSS v4, Lucide React icons, tw-animate-css
- **Routing**: React Router DOM v7 (`BrowserRouter`, `Routes`, `Route`, `Navigate`)
- **State Management & Form Handling**: React Hooks (`useState`, `useEffect`, `useCallback`, `useRef`), React Hook Form, Zod

### Backend & Middleware
- **Server**: Node.js with Express (`server.ts`)
- **Proxy Engine**: Custom CORS-bypassing proxy for iframe rendering of live ViewOnline emails and mockups
- **Communication & Notifications**: Nodemailer (SMTP dispatcher for QA approvals & user invites)
- **NLP & Quality Analyzers**: LanguageTool API integration, local dictionary text analyzer, `@kenjiuno/msgreader` for Outlook binary `.msg` email parsing

### Database & Storage
- **Primary Database**: Supabase PostgreSQL (`https://ogklfczlceubykreddib.supabase.co`) with Row-Level Security (RLS) and Realtime event subscriptions
- **Offline / Fallback Storage**: LocalStorage with an automatic sync queue and synchronization status banner

### Testing
- **E2E Automation**: Playwright test suite (`/e2e`) with multi-browser configurations (Chromium, Firefox, WebKit) and CI GitHub Actions workflow

---

## 3. Directory & File Organization

```text
hp-qa-platform-v5/
├── api/                                # Serverless & API route helpers
│   ├── index.ts                        # API handler exports
│   └── proxy.ts                        # Proxy routing logic
├── lib/                                # Core utilities, parsers, validators & persistence engines
│   ├── auth.ts                         # Authentication helper routines
│   ├── campaign-storage.ts             # Dual Supabase & LocalStorage sync & cache manager
│   ├── checklist-storage.ts            # QA checklist templates & item storage
│   ├── checklist-utils.ts              # Checkpoint scoring and completion helpers
│   ├── logger.ts                       # Immutable central audit logger
│   ├── msg-parser.ts                   # Binary Outlook MSG parsing & extraction
│   ├── qa-validator.ts                 # 22 automated QA checkpoint rule checkers
│   ├── session.ts                      # Session token resolution & persistence
│   ├── supabase.ts                     # Supabase client initializer & config state
│   ├── text-analyzer.ts                # Spellcheck, widow word & brand glossary analyzer
│   ├── url-redirect.ts                 # Redirection resolver & login redirect state
│   ├── url-validator.ts                # UTM parameter parser & link status inspector
│   └── utils.ts                        # Class name joiners (`clsx` / `twMerge`)
├── src/
│   ├── App.tsx                         # Main Router, Auth wrapper & session listener
│   ├── main.tsx                        # React application DOM entry point
│   ├── index.css                       # Global styles & Tailwind configuration
│   ├── components/
│   │   ├── AdminAuditLogModal.tsx      # Modal for viewing immutable activity logs
│   │   ├── DatabaseRequirementScreen.tsx # Fallback/Configuration setup screen for Supabase
│   │   ├── NetworkStatusBar.tsx        # Global real-time sync & offline state banner
│   │   ├── OfflineSyncToast.tsx        # Offline mode notification toast
│   │   ├── QAWizard.tsx                # Step-by-step campaign setup wizard
│   │   ├── SessionManager.tsx          # Session expiry & auto-logout controller
│   │   ├── QAWorkspace/                # Modular QA validation workspace
│   │   │   ├── BrowserPreview.tsx      # Embedded browser sandbox
│   │   │   ├── BulkLinkQA.tsx          # Comprehensive URL parameter audit
│   │   │   ├── EnglishTextAnalysis.tsx # Real-time spellcheck & widow word inspector
│   │   │   ├── FinalChecklist.tsx       # Stage 7 summary & export trigger
│   │   │   ├── IncompleteCheckpointsModal.tsx # Validation blocker modal
│   │   │   ├── MasterChecklistSidebar.tsx # Collapsible checkpoints sidebar
│   │   │   ├── SendApprovalEmailModal.tsx # Stakeholder sign-off email composer
│   │   │   ├── Skeletons.tsx           # Skeleton loading state placeholders
│   │   │   ├── StageChecklist.tsx      # Stage-specific checklist execution table
│   │   │   ├── TagInspection.tsx       # Alt, Alias, and ASCII superscript inspector
│   │   │   ├── UrlValidationTable.tsx  # Link HTTP status table
│   │   │   └── VisualComparison.tsx    # Split-screen Figma vs ViewOnline comparison
│   │   └── layout/
│   │       ├── AppLayout.tsx           # Master layout container with sidebar & navigation
│   │       └── Sidebar.tsx             # Main sidebar with role badges & links
│   ├── lib/
│   │   ├── export-qa-pdf.ts            # PDF Verification Certificate exporter
│   │   └── export-qa-excel.ts          # Excel (.csv) QA compliance report exporter
│   └── pages/
│       ├── Campaigns.tsx               # Campaign matrix, search, filters & folder tree
│       ├── CampaignSetup.tsx           # Campaign creation & stage-by-stage QA workflow
│       ├── Checklists.tsx              # QA checklist template manager
│       ├── Dashboard.tsx               # Analytics, QA score breakdown & activity feed
│       ├── Login.tsx                   # Auth page with One-Click Quick Login
│       ├── RecycleBin.tsx              # Soft-deleted campaign restoration & purge
│       ├── Reports.tsx                 # QA performance and accuracy analytics
│       ├── Settings.tsx                # Region URLs, Supabase config, profile & logs
│       ├── Signup.tsx                  # New user registration screen
│       └── Users.tsx                   # User management, role assignment & quick login toggle
├── e2e/                                # Playwright test suites & CI configuration
├── server.ts                           # Express server for API, Proxy & Nodemailer
├── supabase_schema.sql                 # PostgreSQL DDL table schemas, indexes & RLS
└── package.json                        # Project metadata, dependencies & scripts
```

---

## 4. Core Features & Functional Modules

### A. Visual Comparison Workspace
- **Side-by-Side Split View**: Loads live ViewOnline URLs, Outlook MSG previews, or raw HTML source code alongside Figma design mockups.
- **Synchronized Scrolling**: Dual iframe scroll listeners ensure identical viewport positioning across both panels.
- **Pixel Shift Diff Inspector**: Visual overlay highlighting layout discrepancies between design and HTML code.
- **Element Overlay Tools**: Real-time visual bounding boxes for font sizes, line heights, CSS class names, and missing tags.

### B. Automated 22-Point QA Validation Engine
Standardized across 7 logical QA stages:
1. **Link & Tracking Validation**:
   - Mandatory UTM tags (`utm_source`, `utm_medium`, `utm_campaign`, `utm_id`)
   - SFMC parameters (`et_rid`, `et_cid`, `jumpid`, `att1`, `hid`)
   - Syntax error cleanup (`%20` unencoded spaces, `hhttps://`, malformed protocols)
   - Anchor tag positioning (ensuring `#fragment` occurs after tracking variables)
   - Mandatory HP Logo check (`https://image.hpnews.hp.com/...`)
   - Clickable `tel:` phone numbers and functional Unsubscribe links
2. **Content, Typography & Brief Matching**:
   - Product pricing consistency vs landing pages
   - T&C offer date alignment
   - Legal symbol superscript enforcement (`<sup>©</sup>`, `<sup>®</sup>`, `<sup>™</sup>`, `<sup>*</sup>`)
   - Real-time English dictionary spellcheck, grammar verification, and typographic widow word detection
3. **Visual & Design Fidelity**:
   - Background hex color comparison vs Figma tokens
   - Duplicate image source detection
   - Litmus multi-client preview integration (Outlook, Apple Mail, Dark/Light modes)
4. **Landing Page & AMPscript Logic**:
   - Automated HTTP status checks (200 OK, 3xx Redirect, 4xx/5xx Broken)
   - Out-of-Stock (OOS) badge detection on target product URLs
   - AMPscript voucher variable validation (`@vouchersent_1`, `SET @vouchersent = "..."`)

### C. Campaign Lifecycle & Data Persistence
- **Dual Storage Strategy**: Prioritizes Supabase PostgreSQL; automatically falls back to LocalStorage when offline, synchronizing pending mutations upon reconnection.
- **Multi-Region URL Mapping**: Supports country-specific versions (e.g., IN, AU, SG, JP, KR, NZ, MY, PH, TH, VN, TW, HK) under unified parent campaigns.
- **Recycle Bin**: Implements safe soft-deletes (`is_deleted: true`) with single-click restoration and permanent deletion for administrative users.

### D. Export, Approvals & Audit Logging
- **PDF Verification Certificate**: Generates official sign-off certificates with compliance scores, metadata, and checkpoint audit tables.
- **Excel/CSV Export**: Structured tabular export of all link parameters, validation statuses, and QA results.
- **Email Sign-off Dispatcher**: Integrates with SMTP via `nodemailer` in `server.ts` to dispatch stakeholder approval notifications.
- **Central Audit Logging**: Logs every user action (login, campaign edit, deletion, checklist modification) into the `activity_logs` table.

---

## 5. Database Schema Reference (`supabase_schema.sql`)

1. **`folders`**:
   - `id` (PK, Text), `name` (Text), `parent_id` (Text), `year` (Text), `created_at` (Timestamptz)
2. **`campaigns`**:
   - `id` (PK, Text), `name` (Text), `country` (Text), `version_name` (Text), `status` (Text), `web_view_url` (Text), `figma_url` (Text), `html_source` (Text), `litmus_url` (Text), `design_type` (Text), `team` (Text), `mockup_file_name` (Text), `mockup_data_url` (Text), `outlook_file_name` (Text), `outlook_extracted_html` (Text), `outlook_subject` (Text), `folder_id` (Text), `user_email` (Text), `created_by` (Text), `last_edited_by` (Text), `is_deleted` (Boolean), `deleted_by` (Text), `deleted_at` (Timestamptz), `review_note` (Text), `qa_results` (JSONB), `checklists` (JSONB), `checklist_answers` (JSONB), `current_step` (Integer), `created_at` / `updated_at` (Timestamptz)
3. **`app_users`**:
   - `id` (PK, UUID), `name` (Text), `email` (Text), `role` (Text), `team` (Text), `status` (Text), `last_login` (Text), `created_at` (Timestamptz)
4. **`activity_logs`**:
   - `id` (PK, UUID), `user_email` (Text), `user_name` (Text), `action` (Text), `details` (Text), `campaign_id` (Text), `campaign_name` (Text), `timestamp` (Timestamptz)
5. **`checklist_templates`**:
   - `id` (PK, Text), `name` (Text), `description` (Text), `items` (JSONB), `created_at` / `updated_at` (Timestamptz)
6. **`country_version_urls`**:
   - `id` (PK, UUID), `country_code` (Text), `country_name` (Text), `default_url` (Text), `created_at` (Timestamptz)
7. **`app_settings`**:
   - `key` (PK, Text), `value` (JSONB), `updated_at` (Timestamptz)

---

## 6. Server Endpoints Reference (`server.ts`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/supabase-config` | GET | Returns Supabase connectivity status & credentials |
| `/api/save-supabase-config` | POST | Updates and persists Supabase configuration |
| `/api/test-db-connection` | POST | Validates connection to PostgreSQL / Supabase |
| `/api/campaigns` | GET / POST | Retrieves or creates/updates campaign records |
| `/api/campaigns/batch-sync` | POST | Batch synchronizes offline campaigns to database |
| `/api/campaigns/:id` | DELETE | Soft-deletes or permanently purges a campaign |
| `/api/folders` | GET / POST | Retrieves or creates campaign folders |
| `/api/folders/:id` | DELETE | Deletes a campaign folder |
| `/api/activity-logs` | GET / POST | Fetches or writes system audit activity logs |
| `/api/checklists` | GET / POST | Manages custom QA checklist templates |
| `/api/countries` | GET / POST | Fetches and updates country version URL configurations |
| `/api/session` | GET / POST | Retrieves or updates active session state |
| `/api/session/logout` | POST | Clears server session cache |
| `/api/app-users` | GET / POST | Manages team user accounts and permissions |
| `/api/app-users/delete` | POST | Removes a user account |
| `/api/send-approval-email` | POST | Sends sign-off / approval email via Nodemailer |
| `/api/proxy` | GET | Bypasses CORS for rendering external URLs / images in iframes |
| `/api/check-url` | POST | Tests HTTP status & detects Out-of-Stock indicators |
| `/api/grammar-check` | POST | Submits text to LanguageTool API for grammar validation |

---

## 7. Developer Scripts & Common Commands

```bash
# Start local development server (Express + Vite SSR)
npm run dev

# Run TypeScript type checker
npm run lint

# Build production bundle
npm run build

# Start production server
npm run start

# Run Playwright End-to-End Tests
npm run test:e2e

# Open Playwright Interactive UI Mode
npm run test:e2e:ui
```
