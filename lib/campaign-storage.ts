import { supabase, isSupabaseConfigured, ensureSupabaseInitialized } from "@/lib/supabase";
export { isSupabaseConfigured, ensureSupabaseInitialized };
import { logAction } from "@/lib/logger";

export interface FolderItem {
  id: string;
  name: string;
  parentId: string | null; // null for top-level Year folder
  year?: string;
  created_at: string;
}

export interface CampaignRecord {
  id: string;
  name: string;
  country: string;
  versionName?: string;
  version_name?: string;
  status: string; // "Draft" | "QA Pending" | "Approved" | "Failed" | "Completed"
  webViewUrl?: string;
  web_view_url?: string;
  figmaUrl?: string;
  figma_url?: string;
  htmlSource?: string;
  html_source?: string;
  litmusUrl?: string;
  litmus_url?: string;
  designType?: "figma" | "image";
  team?: string;
  mockupFileName?: string;
  mockupDataUrl?: string;
  outlookFileName?: string;
  outlookExtractedHtml?: string;
  outlookSubject?: string;
  userEmail: string;
  createdBy: string;
  lastEditedBy?: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
  deleted_by?: string | null;
  deleted_at?: string | null;
  folder_id?: string | null;
  reviewNote?: string;
  qaResults?: any[];
  checklists?: any[];
  checklistAnswers?: Record<string, any>;
  currentStep?: number;
  current_step?: number;
  visualChecks?: { desktopLight: boolean; mobileLight: boolean; desktopDark: boolean; mobileDark: boolean };
  visual_checks?: { desktopLight: boolean; mobileLight: boolean; desktopDark: boolean; mobileDark: boolean };
}

// In-memory runtime cache for folders and campaigns (zero browser-storage)
let inMemoryFolders: FolderItem[] = [];
let inMemoryCampaigns: CampaignRecord[] = [];

/**
 * Gets all folders from Supabase or server API.
 */
export async function fetchFolders(): Promise<FolderItem[]> {
  await ensureSupabaseInitialized();
  const isDb = isSupabaseConfigured();
  if (isDb) {
    try {
      const { data, error } = await supabase.from('folders').select('*');
      if (!error && data) {
        const loaded: FolderItem[] = data.map((row: any) => ({
          id: String(row.id),
          name: row.name,
          parentId: row.parent_id || row.parentId || null,
          year: row.year || "2026",
          created_at: row.created_at || new Date().toISOString()
        }));
        
        inMemoryFolders = loaded;
        return loaded;
      }
    } catch (e) {
      console.warn("[CampaignStorage] Error loading folders from Supabase:", e);
    }
  }

  try {
    const apiRes = await fetch("/api/folders");
    if (apiRes.ok) {
      const json = await apiRes.json();
      if (json.folders && Array.isArray(json.folders)) {
        const loaded: FolderItem[] = json.folders.map((row: any) => ({
          id: String(row.id),
          name: row.name,
          parentId: row.parent_id || row.parentId || null,
          year: row.year || "2026",
          created_at: row.created_at || new Date().toISOString()
        }));
        inMemoryFolders = loaded;
        return loaded;
      }
    }
  } catch (e) {}

  return inMemoryFolders;
}

/**
 * Gets all folders synchronously from in-memory cache.
 */
export function getFolders(): FolderItem[] {
  return inMemoryFolders;
}

/**
 * Creates a new folder (Year folder or Subfolder) directly in database.
 */
export function createFolder(name: string, parentId: string | null = null): FolderItem {
  const year = parentId ? (inMemoryFolders.find(f => f.id === parentId)?.year || "2026") : name;
  const newFolder: FolderItem = {
    id: `folder_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim(),
    parentId,
    year,
    created_at: new Date().toISOString()
  };
  inMemoryFolders.push(newFolder);

  if (isSupabaseConfigured()) {
    supabase.from('folders').upsert({
      id: newFolder.id,
      name: newFolder.name,
      parent_id: newFolder.parentId,
      year: newFolder.year,
      created_at: newFolder.created_at
    }).then(({ error }) => {
      if (error) console.warn("[CampaignStorage] Folder save to Supabase error:", error);
    });
  }

  fetch("/api/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newFolder)
  }).catch(() => {});

  console.log("[CampaignStorage] Created new folder:", newFolder);
  return newFolder;
}

export async function renameFolder(id: string, newName: string): Promise<void> {
  const index = inMemoryFolders.findIndex(f => f.id === id);
  if (index !== -1) {
    inMemoryFolders[index].name = newName.trim();

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('folders').update({ name: newName.trim() }).eq('id', id);
      } catch (e) {
        console.warn("[CampaignStorage] Rename folder error in Supabase:", e);
      }
    }

    fetch(`/api/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() })
    }).catch(() => {});

    console.log("[CampaignStorage] Renamed folder:", id, newName);
  }
}

export function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export function ensureUuid(id: string): string {
  if (!id) return crypto.randomUUID();
  if (isUUID(id)) return id;
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57, h3 = 0xfae12345, h4 = 0x12345678;
  for (let i = 0; i < id.length; i++) {
    const ch = id.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 3812015801);
    h4 = Math.imul(h4 ^ ch, 2718281829);
  }
  const p1 = ((h1 >>> 0).toString(16) + (h2 >>> 0).toString(16)).padStart(16, '0').slice(0, 16);
  const p2 = ((h3 >>> 0).toString(16) + (h4 >>> 0).toString(16)).padStart(16, '0').slice(0, 16);
  return `${p1.slice(0,8)}-${p1.slice(8,12)}-4${p1.slice(13,16)}-a${p2.slice(1,4)}-${p2.slice(4,16)}`;
}

const INITIAL_SEED_CAMPAIGNS: CampaignRecord[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Spring Tech Promo 2026 - IN",
    country: "IN",
    versionName: "Standard",
    version_name: "Standard",
    status: "In Progress",
    webViewUrl: "https://example.com/preview/spring-tech-in",
    web_view_url: "https://example.com/preview/spring-tech-in",
    figmaUrl: "https://figma.com/file/sample-spring-tech-in",
    figma_url: "https://figma.com/file/sample-spring-tech-in",
    designType: "figma",
    team: "HP-APJ",
    folder_id: "2026",
    userEmail: "admin@example.com",
    createdBy: "Admin User",
    lastEditedBy: "QA Lead",
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    is_deleted: false,
    currentStep: 2
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    name: "Enterprise Solutions Newsletter Q3 - AU",
    country: "AU",
    versionName: "Enterprise B2B",
    version_name: "Enterprise B2B",
    status: "Approved",
    webViewUrl: "https://example.com/preview/enterprise-q3-au",
    web_view_url: "https://example.com/preview/enterprise-q3-au",
    figmaUrl: "https://figma.com/file/sample-enterprise-au",
    figma_url: "https://figma.com/file/sample-enterprise-au",
    designType: "figma",
    team: "HP-APJ",
    folder_id: "2026",
    userEmail: "admin@example.com",
    createdBy: "Admin User",
    lastEditedBy: "Admin User",
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    is_deleted: false,
    currentStep: 4
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440003",
    name: "Back to School Tech Sale - SG",
    country: "SG",
    versionName: "Consumer Retail",
    version_name: "Consumer Retail",
    status: "QA Pending",
    webViewUrl: "https://example.com/preview/bts-tech-sg",
    web_view_url: "https://example.com/preview/bts-tech-sg",
    figmaUrl: "https://figma.com/file/sample-bts-sg",
    figma_url: "https://figma.com/file/sample-bts-sg",
    designType: "figma",
    team: "HP-APJ",
    folder_id: "2026",
    userEmail: "admin@example.com",
    createdBy: "Marketing Lead",
    lastEditedBy: "QA Tester",
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    is_deleted: false,
    currentStep: 3
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440004",
    name: "OMEN Gaming Pavilion Launch - MY",
    country: "MY",
    versionName: "Gaming Premium",
    version_name: "Gaming Premium",
    status: "Active",
    webViewUrl: "https://example.com/preview/omen-gaming-my",
    web_view_url: "https://example.com/preview/omen-gaming-my",
    figmaUrl: "https://figma.com/file/sample-omen-my",
    figma_url: "https://figma.com/file/sample-omen-my",
    designType: "figma",
    team: "HP-APJ",
    folder_id: "2026",
    userEmail: "admin@example.com",
    createdBy: "Gaming Team",
    lastEditedBy: "Admin User",
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    is_deleted: false,
    currentStep: 4
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440005",
    name: "ZBook Workstation Fleet - NZ",
    country: "NZ",
    versionName: "Commercial Fleet",
    version_name: "Commercial Fleet",
    status: "Completed",
    webViewUrl: "https://example.com/preview/zbook-nz",
    web_view_url: "https://example.com/preview/zbook-nz",
    figmaUrl: "https://figma.com/file/sample-zbook-nz",
    figma_url: "https://figma.com/file/sample-zbook-nz",
    designType: "figma",
    team: "HP-APJ",
    folder_id: "2026",
    userEmail: "admin@example.com",
    createdBy: "Fleet Lead",
    lastEditedBy: "Admin User",
    created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    is_deleted: false,
    currentStep: 4
  }
];

function mapSupabaseToCampaignRecord(item: any): CampaignRecord {
  return {
    id: String(item.id),
    name: item.name || item.title || item.campaign_name || item.campaignName || "Untitled",
    country: item.country || item.country_code || item.countryCode || "IN",
    versionName: item.versionName || item.version_name || item.version || "Standard",
    version_name: item.version_name || item.versionName || item.version || "Standard",
    status: item.status || "Draft",
    webViewUrl: item.webViewUrl || item.web_view_url || item.url || "",
    web_view_url: item.web_view_url || item.webViewUrl || item.url || "",
    figmaUrl: item.figmaUrl || item.figma_url || "",
    figma_url: item.figma_url || item.figmaUrl || "",
    htmlSource: item.htmlSource || item.html_source || item.html || "",
    html_source: item.html_source || item.htmlSource || item.html || "",
    litmusUrl: item.litmusUrl || item.litmus_url || "",
    litmus_url: item.litmus_url || item.litmusUrl || "",
    designType: item.designType || item.design_type || "figma",
    team: item.team || "HP-APJ",
    mockupFileName: item.mockupFileName || item.mockup_file_name || "",
    mockupDataUrl: item.mockupDataUrl || item.mockup_data_url || "",
    outlookFileName: item.outlookFileName || item.outlook_file_name || "",
    outlookExtractedHtml: item.outlookExtractedHtml || item.outlook_extracted_html || "",
    outlookSubject: item.outlookSubject || item.outlook_subject || "",
    userEmail: item.userEmail || item.user_email || item.createdBy || item.created_by || "admin@example.com",
    createdBy: item.createdBy || item.created_by || item.userEmail || item.user_email || "QA User",
    lastEditedBy: item.lastEditedBy || item.last_edited_by || "QA User",
    created_at: item.created_at || item.createdAt || new Date().toISOString(),
    updated_at: item.updated_at || item.updatedAt || new Date().toISOString(),
    is_deleted: Boolean(item.is_deleted === true || item.is_deleted === "true"),
    deleted_by: item.deleted_by || null,
    deleted_at: item.deleted_at || null,
    folder_id: item.folder_id || item.folderId || "2026",
    reviewNote: item.reviewNote || item.review_note || "",
    qaResults: typeof (item.qaResults || item.qa_results) === 'string' ? JSON.parse(item.qaResults || item.qa_results || '[]') : (item.qaResults || item.qa_results || []),
    checklists: typeof item.checklists === 'string' ? JSON.parse(item.checklists || '[]') : (item.checklists || []),
    checklistAnswers: typeof (item.checklistAnswers || item.checklist_answers) === 'string' ? JSON.parse(item.checklistAnswers || item.checklist_answers || '{}') : (item.checklistAnswers || item.checklist_answers || {}),
    currentStep: item.currentStep !== undefined ? item.currentStep : (item.current_step !== undefined ? item.current_step : 1),
    current_step: item.current_step !== undefined ? item.current_step : (item.currentStep !== undefined ? item.currentStep : 1),
  };
}

/**
 * Gets a single campaign by ID from Supabase or server API.
 */
export async function getCampaignById(id: string): Promise<CampaignRecord | null> {
  await ensureSupabaseInitialized();
  const isRealSupabase = isSupabaseConfigured();

  if (isRealSupabase) {
    try {
      const rawId = String(id);
      const uuidId = ensureUuid(rawId);
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .or(`id.eq.${rawId},id.eq.${uuidId}`)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const rec = mapSupabaseToCampaignRecord(data);
        return rec;
      }
    } catch (err) {
      console.warn("[CampaignStorage] Exception fetching campaign by ID from Supabase:", err);
    }
  }

  // Fallback to server API
  try {
    const apiRes = await fetch("/api/campaigns");
    if (apiRes.ok) {
      const json = await apiRes.json();
      if (json.campaigns && Array.isArray(json.campaigns)) {
        const found = json.campaigns.find((c: any) => String(c.id) === String(id) || ensureUuid(String(c.id)) === ensureUuid(String(id)));
        if (found) {
          return mapSupabaseToCampaignRecord(found);
        }
      }
    }
  } catch (apiErr) {}

  // In-memory fallback
  const foundInMem = inMemoryCampaigns.find(c => String(c.id) === String(id) || ensureUuid(String(c.id)) === ensureUuid(String(id)));
  return foundInMem || null;
}

/**
 * Gets all campaigns from Supabase (single source of truth).
 */
export async function getAllCampaigns(): Promise<CampaignRecord[]> {
  await ensureSupabaseInitialized();

  let remoteList: CampaignRecord[] = [];
  let fetchedRemote = false;

  // 1. Primary: Direct Supabase JS Client query for all campaigns
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*");

      if (!error && data) {
        remoteList = data.map((item: any) => mapSupabaseToCampaignRecord(item));
        fetchedRemote = true;
      } else if (error) {
        console.warn("[CampaignStorage] Direct Supabase fetch error:", error);
      }
    } catch (err) {
      console.warn("[CampaignStorage] Exception fetching directly from Supabase:", err);
    }
  }

  // 2. Secondary/Server Proxy: Query server /api/campaigns if direct fetch failed
  if (!fetchedRemote) {
    try {
      const apiRes = await fetch("/api/campaigns");
      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json.campaigns && Array.isArray(json.campaigns)) {
          const serverCampaigns = json.campaigns.map((item: any) => mapSupabaseToCampaignRecord(item));
          remoteList = serverCampaigns;
          fetchedRemote = true;
        }
      }
    } catch (apiErr) {
      console.warn("[CampaignStorage] Server API fallback fetch failed:", apiErr);
    }
  }

  if (fetchedRemote) {
    inMemoryCampaigns = remoteList;
  } else if (inMemoryCampaigns.length === 0) {
    inMemoryCampaigns = INITIAL_SEED_CAMPAIGNS;
  }

  // Sort by updated_at / created_at descending
  inMemoryCampaigns.sort((a, b) => {
    const tA = new Date(a.updated_at || a.created_at || 0).getTime();
    const tB = new Date(b.updated_at || b.created_at || 0).getTime();
    return tB - tA;
  });

  return inMemoryCampaigns;
}

/**
 * Syncs all folder records to Supabase database.
 */
export async function syncAllFoldersToDatabase(): Promise<number> {
  const isRealSupabase = isSupabaseConfigured();
  if (!isRealSupabase) return 0;

  try {
    const { data, error } = await supabase.from('folders').select('*');
    if (!error && data) {
      const loaded: FolderItem[] = data.map((row: any) => ({
        id: String(row.id),
        name: row.name,
        parentId: row.parent_id || row.parentId || null,
        year: row.year || "2026",
        created_at: row.created_at || new Date().toISOString()
      }));
      inMemoryFolders = loaded;
      return loaded.length;
    }
  } catch (e) {
    console.warn("[CampaignStorage] Error syncing folders from DB:", e);
  }
  return 0;
}

/**
 * Validates critical campaign fields required for Supabase and application consistency.
 */
export function validateCampaignRecord(rec: Partial<CampaignRecord>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!rec.id || typeof rec.id !== 'string' || !rec.id.trim()) {
    errors.push("Missing or invalid campaign ID");
  }
  if (!rec.name || typeof rec.name !== 'string' || !rec.name.trim()) {
    errors.push("Missing campaign Name");
  }
  if (!rec.country || typeof rec.country !== 'string' || !rec.country.trim()) {
    errors.push("Missing campaign Country code");
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}

export interface SyncAuditResult {
  timestamp: string;
  totalExamined: number;
  validatedCount: number;
  invalidCount: number;
  syncedCount: number;
  failedCount: number;
  verifiedCount: number;
  syncedFolderCount: number;
  validationErrors: { campaignId: string; name: string; errors: string[] }[];
  transmissionErrors: { campaignId: string; name: string; error: string }[];
  unverifiedCampaigns: { campaignId: string; name: string; reason: string }[];
  status: 'success' | 'partial' | 'failed';
}

/**
 * Performs a comprehensive audit and data sync of Campaigns to Supabase.
 */
export async function auditAndSyncCampaigns(campaigns?: CampaignRecord[]): Promise<SyncAuditResult> {
  const timestamp = new Date().toISOString();
  const isRealSupabase = isSupabaseConfigured();

  // 1. Gather target campaigns
  let targetList: CampaignRecord[] = campaigns || inMemoryCampaigns;
  if (!targetList || targetList.length === 0) {
    targetList = await getAllCampaigns();
  }

  // Retain all valid campaign records
  targetList = targetList.filter(c => Boolean(c && c.id));

  // Normalize campaign IDs to valid UUIDs for Supabase PostgreSQL UUID datatype
  targetList = targetList.map(rec => ({
    ...rec,
    id: ensureUuid(String(rec.id))
  }));

  const totalExamined = targetList.length;
  const validationErrors: { campaignId: string; name: string; errors: string[] }[] = [];
  const transmissionErrors: { campaignId: string; name: string; error: string }[] = [];
  const unverifiedCampaigns: { campaignId: string; name: string; reason: string }[] = [];

  const validRecords: CampaignRecord[] = [];

  // 2. Validate critical fields
  for (const rec of targetList) {
    const val = validateCampaignRecord(rec);
    if (!val.isValid) {
      validationErrors.push({
        campaignId: String(rec.id || 'unknown'),
        name: rec.name || 'Untitled',
        errors: val.errors
      });
    } else {
      validRecords.push(rec);
    }
  }

  const validatedCount = validRecords.length;
  const invalidCount = validationErrors.length;

  if (!isRealSupabase) {
    return {
      timestamp,
      totalExamined,
      validatedCount,
      invalidCount,
      syncedCount: 0,
      failedCount: 0,
      verifiedCount: validatedCount,
      syncedFolderCount: 0,
      validationErrors,
      transmissionErrors: [],
      unverifiedCampaigns: [],
      status: invalidCount === 0 ? 'success' : 'partial'
    };
  }

  // 3. Sync folders first to maintain foreign key integrity
  let syncedFolderCount = 0;
  try {
    syncedFolderCount = await syncAllFoldersToDatabase();
  } catch (e) {
    console.warn("[CampaignAudit] Error syncing folders:", e);
  }

  // 4. Transmit valid campaigns to Supabase
  const successfullyTransmittedIds: string[] = [];
  for (const rec of validRecords) {
    const payload = formatSupabaseCampaignRecord(rec);
    try {
      const { error } = await supabase.from("campaigns").upsert(payload);
      if (!error) {
        successfullyTransmittedIds.push(String(rec.id));
      } else {
        // Retry via server API proxy
        try {
          const apiRes = await fetch("/api/campaigns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (apiRes.ok) {
            successfullyTransmittedIds.push(String(rec.id));
          } else {
            transmissionErrors.push({
              campaignId: String(rec.id),
              name: rec.name,
              error: `API error: ${apiRes.statusText}`
            });
          }
        } catch (apiErr: any) {
          transmissionErrors.push({
            campaignId: String(rec.id),
            name: rec.name,
            error: error.message || apiErr.message || 'Transmission failed'
          });
        }
      }
    } catch (err: any) {
      transmissionErrors.push({
        campaignId: String(rec.id),
        name: rec.name,
        error: err.message || 'Unexpected transmission error'
      });
    }
  }

  // 5. Post-sync verification: query DB for transmitted IDs
  let verifiedCount = 0;
  if (successfullyTransmittedIds.length > 0) {
    for (const id of successfullyTransmittedIds) {
      try {
        const { data, error } = await supabase
          .from("campaigns")
          .select("id")
          .eq("id", id)
          .maybeSingle();

        if (!error && data) {
          verifiedCount++;
        } else {
          const rec = validRecords.find(r => String(r.id) === id);
          unverifiedCampaigns.push({
            campaignId: id,
            name: rec?.name || 'Unknown',
            reason: `Post-sync verification query error: ${error?.message || 'Record not found in database'}`
          });
        }
      } catch (verErr: any) {
        const rec = validRecords.find(r => String(r.id) === id);
        unverifiedCampaigns.push({
          campaignId: id,
          name: rec?.name || 'Unknown',
          reason: `Verification exception: ${verErr.message}`
        });
      }
    }
  }

  const syncedCount = successfullyTransmittedIds.length;
  const failedCount = transmissionErrors.length;

  let status: 'success' | 'partial' | 'failed' = 'success';
  if (failedCount > 0 || invalidCount > 0 || unverifiedCampaigns.length > 0) {
    status = (syncedCount > 0) ? 'partial' : 'failed';
  }

  return {
    timestamp,
    totalExamined,
    validatedCount,
    invalidCount,
    syncedCount,
    failedCount,
    verifiedCount,
    syncedFolderCount,
    validationErrors,
    transmissionErrors,
    unverifiedCampaigns,
    status
  };
}

/**
 * Syncs/Populates all given or stored campaign records to Supabase database.
 */
export async function syncAllCampaignsToDatabase(campaigns?: CampaignRecord[]): Promise<number> {
  const result = await auditAndSyncCampaigns(campaigns);
  return result.syncedCount;
}

/**
 * Verifies if a campaign name is unique across all non-deleted campaigns.
 */
export async function isCampaignNameUnique(name: string, currentId?: string | null): Promise<boolean> {
  const trimmedName = name.trim().toLowerCase();
  if (!trimmedName) return false;

  const all = await getAllCampaigns();
  const duplicate = all.find(c => {
    if (c.is_deleted) return false; // Ignore deleted campaigns
    if (currentId && (String(c.id) === String(currentId) || ensureUuid(String(c.id)) === ensureUuid(String(currentId)))) return false; // Ignore self when editing
    return c.name.trim().toLowerCase() === trimmedName;
  });

  return !duplicate;
}

function formatSupabaseCampaignRecord(rec: CampaignRecord): Record<string, any> {
  return {
    id: ensureUuid(String(rec.id)),
    name: rec.name || "Untitled",
    country: rec.country || "IN",
    version_name: rec.versionName || rec.version_name || "Standard",
    status: rec.status || "Draft",
    web_view_url: rec.webViewUrl || rec.web_view_url || "",
    figma_url: rec.figmaUrl || rec.figma_url || "",
    html_source: rec.htmlSource || rec.html_source || "",
    litmus_url: rec.litmusUrl || rec.litmus_url || "",
    design_type: rec.designType || "figma",
    team: rec.team || "HP-APJ",
    mockup_file_name: rec.mockupFileName || "",
    mockup_data_url: rec.mockupDataUrl || "",
    outlook_file_name: rec.outlookFileName || "",
    outlook_extracted_html: rec.outlookExtractedHtml || "",
    outlook_subject: rec.outlookSubject || "",
    folder_id: rec.folder_id || "2026",
    user_email: rec.userEmail || rec.createdBy || "admin@example.com",
    created_by: rec.createdBy || rec.userEmail || "QA User",
    last_edited_by: rec.lastEditedBy || rec.userEmail || "QA User",
    created_at: rec.created_at || new Date().toISOString(),
    updated_at: rec.updated_at || new Date().toISOString(),
    is_deleted: rec.is_deleted || false,
    deleted_by: rec.deleted_by || null,
    deleted_at: rec.deleted_at || null,
    review_note: rec.reviewNote || "",
    qa_results: rec.qaResults || [],
    checklists: rec.checklists || [],
    checklist_answers: rec.checklistAnswers || {},
    current_step: rec.currentStep !== undefined ? rec.currentStep : (rec.current_step || 1)
  };
}

/**
 * Saves or updates a campaign in Supabase database directly.
 */
export async function saveCampaignRecord(campaign: Partial<CampaignRecord> & { name: string; country?: string }): Promise<CampaignRecord> {
  const now = new Date().toISOString();
  let id = campaign.id ? ensureUuid(String(campaign.id)) : undefined;

  const existingList = await getAllCampaigns();

  // If ID not explicitly provided, check if a non-deleted campaign with the exact same trimmed name already exists
  if (!id && campaign.name) {
    const trimmed = campaign.name.trim().toLowerCase();
    const match = existingList.find(c => !c.is_deleted && c.name.trim().toLowerCase() === trimmed);
    if (match) {
      id = ensureUuid(String(match.id));
    }
  }

  // If still no ID, generate a new UUID for this campaign
  if (!id) {
    id = crypto.randomUUID();
  }

  // Name uniqueness check against OTHER campaigns
  const isUnique = await isCampaignNameUnique(campaign.name, id);
  if (!isUnique) {
    throw new Error(`Campaign name "${campaign.name}" already exists. Campaign names must be unique.`);
  }

  const existing = existingList.find(c => String(c.id) === String(id) || ensureUuid(String(c.id)) === String(id));

  const record: CampaignRecord = {
    id,
    name: campaign.name.trim(),
    country: campaign.country || existing?.country || "IN",
    versionName: campaign.versionName || campaign.version_name || existing?.versionName || "Standard",
    version_name: campaign.versionName || campaign.version_name || existing?.versionName || "Standard",
    status: campaign.status || existing?.status || "Draft",
    webViewUrl: campaign.webViewUrl || campaign.web_view_url || "",
    web_view_url: campaign.webViewUrl || campaign.web_view_url || "",
    figmaUrl: campaign.figmaUrl || campaign.figma_url || "",
    figma_url: campaign.figmaUrl || campaign.figma_url || "",
    htmlSource: campaign.htmlSource || campaign.html_source || "",
    html_source: campaign.htmlSource || campaign.html_source || "",
    litmusUrl: campaign.litmusUrl || campaign.litmus_url || "",
    litmus_url: campaign.litmusUrl || campaign.litmus_url || "",
    designType: campaign.designType || "figma",
    mockupFileName: campaign.mockupFileName || "",
    mockupDataUrl: campaign.mockupDataUrl || "",
    outlookFileName: campaign.outlookFileName || "",
    outlookExtractedHtml: campaign.outlookExtractedHtml || "",
    outlookSubject: campaign.outlookSubject || "",
    userEmail: campaign.userEmail || "admin@example.com",
    createdBy: existing?.createdBy || campaign.userEmail || "admin@example.com",
    lastEditedBy: campaign.userEmail || "admin@example.com",
    created_at: existing?.created_at || campaign.created_at || now,
    updated_at: now,
    is_deleted: campaign.is_deleted !== undefined ? campaign.is_deleted : (existing?.is_deleted || false),
    deleted_by: campaign.deleted_by !== undefined ? campaign.deleted_by : (existing?.deleted_by || null),
    deleted_at: campaign.deleted_at !== undefined ? campaign.deleted_at : (existing?.deleted_at || null),
    folder_id: campaign.folder_id || existing?.folder_id || "2026",
    reviewNote: campaign.reviewNote !== undefined ? campaign.reviewNote : (existing?.reviewNote || ""),
    qaResults: campaign.qaResults !== undefined ? campaign.qaResults : (existing?.qaResults || []),
    checklists: campaign.checklists !== undefined ? campaign.checklists : (existing?.checklists || []),
    checklistAnswers: campaign.checklistAnswers !== undefined ? campaign.checklistAnswers : (existing?.checklistAnswers || {}),
    currentStep: campaign.currentStep !== undefined ? campaign.currentStep : (existing?.currentStep || existing?.current_step || 1),
    current_step: campaign.currentStep !== undefined ? campaign.currentStep : (existing?.current_step || existing?.currentStep || 1)
  };

  // Update in-memory cache
  const idx = inMemoryCampaigns.findIndex(c => String(c.id) === String(id));
  if (idx >= 0) {
    inMemoryCampaigns[idx] = record;
  } else {
    inMemoryCampaigns.unshift(record);
  }

  // Save to Supabase
  await ensureSupabaseInitialized();
  const isRealSupabase = isSupabaseConfigured();
  const payload = formatSupabaseCampaignRecord(record);

  if (isRealSupabase) {
    try {
      const { error } = await supabase.from("campaigns").upsert(payload);
      if (error) {
        console.warn("[CampaignStorage] Direct upsert warning, attempting server API save:", error.message);
        await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }
    } catch (err) {
      console.warn("[CampaignStorage] Supabase save error:", err);
      await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(() => {});
    }
  } else {
    await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => {});
  }

  await logAction(
    record.userEmail,
    existing ? "Update Campaign" : "Create Campaign",
    `Saved campaign "${record.name}" (Status: ${record.status}, Step: ${record.currentStep})`,
    record.id
  );

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("database-synced"));
  }

  return record;
}

/**
 * Soft deletes a campaign and moves it to Recycle Bin in database.
 */
export async function softDeleteCampaign(id: string, userEmail: string): Promise<void> {
  const now = new Date().toISOString();
  await ensureSupabaseInitialized();
  const all = await getAllCampaigns();
  const target = all.find(c => String(c.id) === String(id) || ensureUuid(String(c.id)) === ensureUuid(String(id)));

  if (!target) return;

  const targetId = isUUID(id) ? id : ensureUuid(String(id));
  const idSet = Array.from(new Set([String(id), String(targetId), String(target.id)]));

  // Update in memory
  inMemoryCampaigns = inMemoryCampaigns.map(c => 
    (String(c.id) === String(id) || ensureUuid(String(c.id)) === targetId)
      ? { ...c, is_deleted: true, deleted_by: userEmail, deleted_at: now, updated_at: now }
      : c
  );

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from("campaigns").update({
        is_deleted: true,
        deleted_by: userEmail,
        deleted_at: now,
        updated_at: now
      }).in("id", idSet);

      if (error) {
        await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formatSupabaseCampaignRecord({ ...target, is_deleted: true, deleted_by: userEmail, deleted_at: now, updated_at: now }))
        }).catch(() => {});
      }
    } catch (e) {
      await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formatSupabaseCampaignRecord({ ...target, is_deleted: true, deleted_by: userEmail, deleted_at: now, updated_at: now }))
      }).catch(() => {});
    }
  } else {
    await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formatSupabaseCampaignRecord({ ...target, is_deleted: true, deleted_by: userEmail, deleted_at: now, updated_at: now }))
    }).catch(() => {});
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("database-synced"));
  }

  await logAction(userEmail, "Delete Campaign", `Moved campaign "${target.name}" to Recycle Bin`, id);
}

/**
 * Restores a campaign from the Recycle Bin in database.
 */
export async function restoreCampaign(id: string, userEmail: string): Promise<void> {
  const now = new Date().toISOString();
  await ensureSupabaseInitialized();
  const all = await getAllCampaigns();
  const target = all.find(c => String(c.id) === String(id) || ensureUuid(String(c.id)) === ensureUuid(String(id)));

  const targetId = isUUID(id) ? id : ensureUuid(String(id));
  const idSet = Array.from(new Set([String(id), String(targetId), String(target?.id || id)]));

  // Update in memory
  inMemoryCampaigns = inMemoryCampaigns.map(c => 
    (String(c.id) === String(id) || ensureUuid(String(c.id)) === targetId)
      ? { ...c, is_deleted: false, deleted_by: null, deleted_at: null, updated_at: now }
      : c
  );

  if (isSupabaseConfigured()) {
    try {
      await supabase.from("campaigns").update({
        is_deleted: false,
        deleted_by: null,
        deleted_at: null,
        updated_at: now
      }).in("id", idSet);
    } catch (e) {
      console.warn("[CampaignStorage] Supabase restore error:", e);
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("database-synced"));
  }

  await logAction(userEmail, "Restore Campaign", `Restored campaign "${target?.name || id}" from Recycle Bin`, id);
}

/**
 * Restores all soft-deleted campaigns back to active view.
 */
export async function restoreAllCampaigns(userEmail: string): Promise<number> {
  const now = new Date().toISOString();
  let count = 0;
  await ensureSupabaseInitialized();

  inMemoryCampaigns = inMemoryCampaigns.map(c => {
    if (c.is_deleted) {
      count++;
      return { ...c, is_deleted: false, deleted_by: null, deleted_at: null, updated_at: now };
    }
    return c;
  });

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from("campaigns").update({
        is_deleted: false,
        deleted_by: null,
        deleted_at: null,
        updated_at: now
      }).eq("is_deleted", true).select("id");

      if (!error && data) {
        count = data.length;
      }
    } catch (e) {
      console.warn("[CampaignStorage] Supabase restore all error:", e);
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("database-synced"));
  }

  await logAction(userEmail, "Restore All Campaigns", `Restored ${count} campaigns from Recycle Bin`);
  return count;
}

/**
 * Permanently deletes a campaign from database.
 */
export async function permanentlyDeleteCampaign(id: string, userEmail: string): Promise<void> {
  const targetId = isUUID(id) ? id : ensureUuid(String(id));
  const idSet = Array.from(new Set([String(id), String(targetId)]));
  await ensureSupabaseInitialized();

  inMemoryCampaigns = inMemoryCampaigns.filter(c => String(c.id) !== String(id) && ensureUuid(String(c.id)) !== targetId);

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from("campaigns").delete().in("id", idSet);
      if (error) {
        await fetch(`/api/campaigns/${targetId}`, { method: "DELETE" }).catch(() => {});
        await fetch(`/api/campaigns/${id}`, { method: "DELETE" }).catch(() => {});
      }
    } catch (e) {
      await fetch(`/api/campaigns/${targetId}`, { method: "DELETE" }).catch(() => {});
      await fetch(`/api/campaigns/${id}`, { method: "DELETE" }).catch(() => {});
    }
  } else {
    await fetch(`/api/campaigns/${targetId}`, { method: "DELETE" }).catch(() => {});
    await fetch(`/api/campaigns/${id}`, { method: "DELETE" }).catch(() => {});
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("database-synced"));
  }

  await logAction(userEmail, "Permanent Delete", `Permanently deleted campaign ID: ${id}`, id);
}

/**
 * Moves a campaign to a specified folder in database.
 */
export async function moveCampaignToFolder(id: string, folderId: string, userEmail: string): Promise<void> {
  const now = new Date().toISOString();
  const targetId = isUUID(id) ? id : ensureUuid(String(id));

  inMemoryCampaigns = inMemoryCampaigns.map(c => 
    String(c.id) === String(id) ? { ...c, folder_id: folderId, updated_at: now } : c
  );

  try {
    await supabase.from("campaigns").update({ folder_id: folderId, updated_at: now }).eq("id", targetId);
  } catch (e) {
    console.warn("[CampaignStorage] Supabase move folder error:", e);
  }

  await logAction(userEmail, "Move Campaign", `Moved campaign ID: ${id} to folder ${folderId}`, id);
}

/**
 * Deletes a folder provided it is completely empty of active campaigns.
 */
export async function deleteFolder(folderId: string, userEmail: string): Promise<void> {
  const folders = inMemoryFolders;
  const folderToDelete = folders.find(f => f.id === folderId);
  if (!folderToDelete) return;

  const childFolderIds = folders.filter(f => f.parentId === folderId).map(f => f.id);
  const idsToRemove = [folderId, ...childFolderIds];

  // Enforce rule: Folder MUST be empty (no non-deleted campaigns)
  const allCampaigns = await getAllCampaigns();
  const campaignsInFolder = allCampaigns.filter(c => !c.is_deleted && idsToRemove.includes(c.folder_id || ""));

  if (campaignsInFolder.length > 0) {
    throw new Error(`Cannot delete folder "${folderToDelete.name}": Folder contains ${campaignsInFolder.length} active campaign(s). Only empty folders can be deleted.`);
  }

  inMemoryFolders = folders.filter(f => !idsToRemove.includes(f.id));

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('folders').delete().in('id', idsToRemove);
    } catch (e) {
      console.warn("[CampaignStorage] Supabase delete folder error:", e);
    }
  }

  fetch(`/api/folders/${folderId}`, { method: "DELETE" }).catch(() => {});

  await logAction(userEmail, "Delete Folder", `Deleted empty folder "${folderToDelete.name}" (ID: ${folderId})`, folderId);
}
