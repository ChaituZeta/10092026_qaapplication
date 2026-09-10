# Project Review & Documentation

## 1. Project Overview
- **Core Purpose**: Enterprise QA & Campaign Operations Management Platform designed to automate eDM link validation, AMPscript voucher detection, side-by-side Figma visual comparison with synchronized scrolling, English spellcheck and widow word detection, ASCII superscript tag formatting, audit logging, multi-region version URL mapping, and campaign status tracking with Supabase real-time database synchronization (`https://ogklfczlceubykreddib.supabase.co`) and local storage fallback.
- **Tech Stack**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React Icons, Supabase (Authentication & PostgreSQL database with Realtime subscriptions), LocalStorage Offline Queue engine, LanguageTool & Local Dictionary NLP Text Analyzer, XLSX/CSV Data Exporter.

## 2. Architecture & File Structure
```text
.
├── lib/
│   ├── campaign-storage.ts    # Dual local/Supabase campaign persistence & sync logic
│   ├── checklist-storage.ts   # QA checklist configuration & progress persistence
│   ├── checklist-utils.ts     # Helpers for QA checklist calculations
│   ├── logger.ts              # Immutable central audit log recorder & retriever
│   ├── msg-parser.ts          # Email/MSG header & link extractor
│   ├── qa-validator.ts        # Automated QA rule checkers, link status verifier & orphan coupon detector
│   ├── supabase.ts            # Supabase JS client (`https://ogklfczlceubykreddib.supabase.co`) & active configuration
│   ├── text-analyzer.ts       # Real-time English text analyzer, spellcheck, widow word & brand consistency engine
│   ├── url-validator.ts       # URL validation, UTM checker, hashtag placement & HTTP status checkers
│   └── utils.ts               # Shared Tailwind class joiners (cn)
├── scripts/
│   └── patch_utils/           # Organized legacy maintenance & patch scripts (fix_*.js, patch_*.js, rewrite.py)
├── src/
│   ├── App.tsx                # Main Router, Auth provider & Layout wrapper
│   ├── main.tsx               # Vite entry point
│   ├── index.css              # Global styles & Tailwind CSS imports
│   ├── components/
│   │   ├── AdminAuditLogModal.tsx      # Admin-only immutable audit log viewer modal
│   │   ├── DatabaseRequirementScreen.tsx # Supabase setup/configuration warning screen
│   │   ├── NetworkStatusBar.tsx       # Global sync status indicator & network banner
│   │   ├── OfflineSyncToast.tsx       # Offline sync notification toast
│   │   ├── QAWizard.tsx               # Step-by-step campaign QA wizard component
│   │   ├── SessionManager.tsx         # Auto-session expiry & user status manager
│   │   ├── QAWorkspace/               # Interactive QA validation workspace modules
│   │   │   ├── VisualComparison.tsx   # Split-screen Figma vs ViewOnline comparison with sync scroll, 3-tab preview & HTML source inspector
│   │   │   ├── EnglishTextAnalysis.tsx# Real-time spellcheck, widow word & brand audit component
│   │   │   ├── TagInspection.tsx      # Alt tags, Alias tags, and ASCII superscript inspector
│   │   │   ├── StageChecklist.tsx     # Stage-by-stage mandatory checkpoint verifier
│   │   │   ├── FinalChecklist.tsx      # Final stage summary checklist with PDF & Excel receipt export
│   │   │   ├── Skeletons.tsx          # Workspace & setup loading skeletons
│   │   │   └── BulkLinkQA.tsx         # URL parameter audit & HTTP status checker
│   │   └── layout/
│   │       ├── AppLayout.tsx          # Main shell layout with sidebar and sync header
│   │       └── Sidebar.tsx            # Primary navigation bar with role badges
│   ├── lib/
│   │   ├── export-qa-pdf.ts       # PDF Verification Receipt exporter
│   │   └── export-qa-excel.ts     # Excel / CSV Verification Report exporter
│   └── pages/
│       ├── Campaigns.tsx              # Main campaign matrix, 3-dot dropdowns & folder tree
│       ├── CampaignSetup.tsx          # Campaign creation, link verification, auto-wrap ASCII & edit engine
│       ├── Checklists.tsx             # QA template checklist management page
│       ├── Dashboard.tsx              # Operations analytics & campaign health summary
│       ├── Login.tsx                  # One-click quick login & Supabase authentication
│       ├── RecycleBin.tsx             # Soft-deleted campaign recovery & permanent cleanup
│       ├── Reports.tsx                # Campaign performance, QA accuracy & export reports
│       ├── Settings.tsx               # Region version URLs, Quick Login toggle & log controls
│       ├── Signup.tsx                 # New user registration page
│       └── Users.tsx                  # User role administration & permission manager
├── QA_CHECKPOINTS_GUIDE.md           # Comprehensive SFMC eDM QA Checkpoints Breakdown
└── PROJECT_REVIEW.md                  # Comprehensive Project Audit & Iteration Roadmap
```

## 3. Detailed Component Review
- **`lib/supabase.ts`**:
  - **Purpose**: Configures and initializes the Supabase client connection (`https://ogklfczlceubykreddib.supabase.co`) with authentication and database access keys.
  - **Strengths**: Successfully configured and connected to the active Supabase project endpoint with runtime environment detection and `isSupabaseConfigured()` validation logic.
  - **Areas for Improvement**: None.

- **`scripts/patch_utils/`**:
  - **Purpose**: Centralized storage for legacy patch scripts (`fix_*.js`, `patch_*.js`, `rewrite.py`, `rewrite_inspection.js`).
  - **Strengths**: Keeps the root application directory completely clean, structured, and free of single-use script clutter while retaining developer utility history.
  - **Areas for Improvement**: None.

- **`src/components/QAWorkspace/VisualComparison.tsx`**:
  - **Purpose**: Side-by-side split screen view for View Online / Outlook MSG / HTML Source Code vs Figma design assets.
  - **Strengths**: Features default View Online view, HTML Code tab with Alt Tag & Alias Tag inspection panels, Classes/Font Sizes/Line Heights overlay, and Pixel Diff layout shift inspector. Auto-swaps to HTML tab when Alt or Alias tags are toggled, and auto-swaps to View Online when font/line-height overlays are toggled.
  - **Areas for Improvement**: Add search filtering within the HTML code tab.

- **`src/components/QAWorkspace/FinalChecklist.tsx` & `src/lib/export-qa-excel.ts`**:
  - **Purpose**: Consolidated Stage 7 Final Verification summary and Export suite.
  - **Strengths**: Exports full campaign verification reports to both PDF receipts and formatted Excel (.csv) spreadsheets containing metadata, stage-by-stage checkpoint statuses, and compliance scores.
  - **Areas for Improvement**: Add customizable Excel column selections.

## 4. Current Feature Roadmap (Completed)
- [x] **Active Supabase Database Connection**: Successfully configured `lib/supabase.ts` with project URL `https://ogklfczlceubykreddib.supabase.co` and service keys.
- [x] **Organized Legacy Patch Scripts**: Moved all 38 root utility scripts (`fix_*.js`, `patch_*.js`, `rewrite.py`, `rewrite_inspection.js`) into `/scripts/patch_utils/` to maintain a clean project structure.
- [x] **View Online Default in Visual Comparison**: Configured Visual Comparison to load View Online as the default primary tab on step navigation.
- [x] **HTML Source Code Tab in Visual Comparison**: Created a dedicated HTML Code tab next to Outlook MSG and View Online with syntax line numbers and copy functionality.
- [x] **Contextual Auto-Tab Swapping**: Clicking Alt Tags or Alias Tags auto-swaps to the HTML Code tab with highlighted inspection cards; clicking Classes/Font Sizes auto-swaps to View Online.
- [x] **Unified Stage 7 PDF & Excel Export**: Consolidated receipt exports exclusively into Stage 7 Final Checklist with support for both PDF and Excel format downloads.
- [x] **User Profile & Team Visibility**: Implemented full profile view accessible to all users in Settings with team membership listing, role level badge, and profile details.
- [x] **Profile Picture Upload & Instant Sync**: Added profile picture photo uploader supporting custom image files with real-time avatar synchronization across the sidebar navigation and headers without page reloads.
- [x] **Vercel Serverless Function Crash Fix**: Fixed `500 FUNCTION_INVOCATION_FAILED` on Vercel by eliminating static top-level `vite` module import from `server.ts`, switching to dynamic import inside `startServer()`, and mapping `/api` rewrites explicitly in `vercel.json`.
- [x] **Admin Per-User Quick Login Control**: Added explicit per-user toggle switches in Settings and User Management allowing Admins to selectively enable or disable One-Click Quick Login access for specific accounts.
- [x] **Clean New Campaign Form Initialization**: Fixed New Campaign navigation (`/campaigns/new`) to ensure opening "New Campaign" always initializes a clean empty campaign workspace without restoring previous campaign drafts or retaining lingering campaign IDs.
- [x] **Session Logout & Login Navigation Sync**: Updated logout behavior in Sidebar and Session Manager to clear pre-login redirect state and return cleanly to Home (`/`), ensuring subsequent logins start fresh at the Home screen.
- [x] **Playwright End-to-End Testing Suite**: Installed and configured Playwright for local and CI automation with retries, failure traces, screenshots, resilient `data-testid` selectors, custom auth fixtures, test data seeding, npm scripts (`test:e2e`, `test:e2e:ui`, `test:e2e:ci`), and GitHub Actions workflow template (`/e2e/ci-workflow.yml.example`).

## 5. Future Features & Iteration Pipeline
- **Short-Term (Next Sprint)**:
  - [ ] **Search & Syntax Highlighting in HTML Code Tab**: Add instant keyword search and colorized syntax highlighting inside the Visual Comparison HTML tab.
  - [ ] **Audit Log CSV Export**: Add "Export Logs" button in `AdminAuditLogModal` to download structured CSV activity reports for compliance audits.
  - [ ] **Bulk Action Bar in Campaigns**: Enable multi-select checkboxes for batch moving, archiving, or folder assignment of multiple campaigns simultaneously.

- **Long-Term (Backlog)**:
  - [ ] **Automated Email Notification Engine**: Send automated notifications to Slack or Teams when a campaign transitions to "Approved" or "Failed" status.
  - [ ] **Role-Based Granular Permissions (RBAC)**: Expand beyond binary Admin/User roles to include Read-Only Auditor, Regional QA Lead, and Campaign Author roles.
