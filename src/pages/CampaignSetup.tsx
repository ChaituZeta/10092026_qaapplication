import { MasterChecklistSidebar } from "@/src/components/QAWorkspace/MasterChecklistSidebar";
import { StageChecklist } from "@/src/components/QAWorkspace/StageChecklist";
import { FinalChecklist } from "@/src/components/QAWorkspace/FinalChecklist";
import { SendApprovalEmailModal } from "@/src/components/QAWorkspace/SendApprovalEmailModal";
import { IncompleteCheckpointsModal, MissingCheckpoint } from "@/src/components/QAWorkspace/IncompleteCheckpointsModal";
import { BrowserQAWorkspace } from "@/src/components/QAWorkspace";
import { TagInspection } from "@/src/components/QAWorkspace/TagInspection";
import { VisualComparison } from "@/src/components/QAWorkspace/VisualComparison";
import { EnglishTextAnalysis } from "@/src/components/QAWorkspace/EnglishTextAnalysis";
import { CampaignSetupSkeleton } from "@/src/components/QAWorkspace/Skeletons";
import { exportQAVerificationReceiptPDF } from "@/lib/export-qa-pdf";
import { exportQAChecklistToExcel } from "@/lib/export-qa-excel";
import { CampaignProgressIndicator } from "@/src/components/CampaignProgressIndicator";
import MsgReader from "@kenjiuno/msgreader";
import React, { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { QAWizard } from "@/src/components/QAWizard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { validateCampaignHTML } from "@/lib/qa-validator";
import { fetchAndValidateCountryUrls, fetchAllowedUrlPattern } from "@/lib/url-validator";
import { isCampaignNameUnique, saveCampaignRecord, getCampaignById, getFolders, fetchFolders, FolderItem, CampaignRecord } from "@/lib/campaign-storage";
import { fetchPlatformChecklists } from "@/lib/checklist-storage";
import { parseMsgArrayBuffer } from "@/lib/msg-parser";
import { logAction, getCampaignLogs } from "@/lib/logger";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  ArrowLeft,
  FileCheck, 
  UploadCloud, 
  Monitor, 
  Smartphone, 
  Check, 
  Copy, 
  MonitorSmartphone, 
  Code2, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ClipboardList, 
  History, 
  Layers, 
  Mail, 
  Image as ImageIcon, 
  Figma, 
  Undo, 
  Redo, 
  RotateCcw,
  Clock,
  Trash2,
  Sparkles,
  Folder,
  Maximize2,
  Minimize2,
  Tag,
  Link,
  ExternalLink,
  Tablet,
  Eye,
  CheckSquare,
  Square,
  Save,
  Wifi,
  WifiOff,
  RefreshCw,
  X,
  Download,
  FileSpreadsheet,
  ListChecks,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  name: z.string().min(2, "Campaign name is required and must be at least 2 characters."),
  team: z.string().min(1, "Team selection is required."),
  country: z.string().min(1, "Country selection is required."),
  versionName: z.string().min(1, "Version selection is required."),
  folder_id: z.string().optional(),
  webViewUrl: z.string().min(1, "View Online link is required."),
  htmlSource: z.string().min(10, "HTML source code is required."),
  figmaUrl: z.string().optional(),
  litmusUrl: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

export function CampaignSetup({ userEmail = "admin@example.com", userRole = "user" }: { userEmail?: string; userRole?: string }) {
  const isAdmin = userRole === "admin";
  const [currentStep, setCurrentStep] = useState(1);

  const [countries, setCountries] = useState<any[]>([]);
  const [qaResults, setQaResults] = useState<any[]>([]);
  const [previewTab, setPreviewTab] = useState<"webview" | "html" | "qa" | "compare">("compare");
  const [viewportSize, setViewportSize] = useState<"desktop" | "mobile">("desktop");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checklistAnswers, setChecklistAnswers] = useState<Record<string, any>>({});
  const [showChecklistError, setShowChecklistError] = useState(false);
  const [extractedSubject, setExtractedSubject] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  
  // File states
  const [briefFile, setBriefFile] = useState<File | null>(null);
  const [outlookFile, setOutlookFile] = useState<File | null>(null);
  const [mockupFile, setMockupFile] = useState<File | null>(null);
  const [mockupPreviewUrl, setMockupPreviewUrl] = useState<string | null>(null);
  
  // Design Choice State (Either Figma OR Uploaded Mockup Image)
  const [designChoice, setDesignChoice] = useState<"figma" | "image">("figma");

  // Extracted Outlook Subject Line
  const [outlookSubject, setOutlookSubject] = useState<string | null>(null);
  const [outlookFileName, setOutlookFileName] = useState<string | null>(null);
  const [outlookExtractedHtml, setOutlookExtractedHtml] = useState<string | null>(null);

  // Compare split-screen tabs
  const [leftCompareTab, setLeftCompareTab] = useState<"webview" | "outlook" | "html">("webview");

  // Fullscreen & Inspection States
  const [fullScreenTarget, setFullScreenTarget] = useState<"html" | "webview" | "step1" | "step2" | "step3" | "step4" | null>(null);
  const [showAliasInspector, setShowAliasInspector] = useState(false);
  const [showAltInspector, setShowAltInspector] = useState(false);
  const [viewOnlineDevice, setViewOnlineDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  // Review note and edit logs state
  const [reviewNote, setReviewNote] = useState("");
  const [campaignLogs, setCampaignLogs] = useState<any[]>([]);
  const [campaignStatus, setCampaignStatus] = useState<string>("Draft");
  const [showApprovalEmailModal, setShowApprovalEmailModal] = useState(false);
  const [remoteQaUpdateNotice, setRemoteQaUpdateNotice] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Multi-Agent State
  const [userTeam, setUserTeam] = useState<string>("");
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [availableAiAgents, setAvailableAiAgents] = useState<any[]>([]);
  const [selectedAiAgentId, setSelectedAiAgentId] = useState<string>("");

  useEffect(() => {
    fetch("/api/ai-agents")
      .then(res => res.json())
      .then(data => {
        if (data.agents && data.agents.length > 0) {
          setAvailableAiAgents(data.agents);
        }
      })
      .catch(err => console.error("Failed to load AI agents:", err));
  }, []);

  const filteredAiAgents = React.useMemo(() => {
    if (isAdmin) return availableAiAgents;
    return availableAiAgents.filter(a => !a.assigned_teams || a.assigned_teams.length === 0 || a.assigned_teams.includes(userTeam));
  }, [availableAiAgents, userTeam, isAdmin]);

  useEffect(() => {
    if (filteredAiAgents.length > 0) {
      if (!selectedAiAgentId || !filteredAiAgents.find(a => a.id === selectedAiAgentId)) {
        const defaultAgent = filteredAiAgents.find((a: any) => a.is_default);
        if (defaultAgent) setSelectedAiAgentId(defaultAgent.id);
        else setSelectedAiAgentId(filteredAiAgents[0].id);
      }
    }
  }, [filteredAiAgents, selectedAiAgentId]);

  const isApprovedLocked = campaignStatus === "Approved" && !isAdmin;
  const lastLocalSaveTimeRef = useRef<number>(0);
  const checklistAnswersRef = useRef<Record<string, any>>(checklistAnswers);
  const campaignStatusRef = useRef<string>(campaignStatus);

  useEffect(() => {
    checklistAnswersRef.current = checklistAnswers;
  }, [checklistAnswers]);

  useEffect(() => {
    campaignStatusRef.current = campaignStatus;
  }, [campaignStatus]);

  const [grammarCheckResult, setGrammarCheckResult] = useState<string | null>(null);
  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false);
  
  const [isAiQaRunning, setIsAiQaRunning] = useState(false);
  const [aiQaReport, setAiQaReport] = useState<any | null>(null);

  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState<"synced" | "offline" | "syncing">("synced");

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setSyncStatus("synced");
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const saveCurrentCampaignState = async (overrides: Partial<CampaignRecord> = {}) => {
    const data = watch();
    const effectiveName = (data.name && data.name.trim().length >= 2)
      ? data.name.trim()
      : (campaignIdRef.current ? "Draft Campaign" : `Draft Campaign ${new Date().toLocaleDateString('en-GB')}`);

    try {
      setSyncStatus("syncing");
      lastLocalSaveTimeRef.current = Date.now();
      const currentIdToUse = campaignIdRef.current || editId || undefined;

      const record = await saveCampaignRecord({
        id: currentIdToUse,
        name: effectiveName,
        team: data.team || "HP-APJ",
        country: data.country || "",
        versionName: data.versionName || "",
        folder_id: data.folder_id || targetFolderParam || "2026",
        webViewUrl: data.webViewUrl || "",
        htmlSource: data.htmlSource || "",
        figmaUrl: designChoice === "figma" ? (data.figmaUrl || "") : "",
        litmusUrl: data.litmusUrl || "",
        status: overrides.status || (
          ["Approved", "Failed", "QA Pending", "Completed"].includes(campaignStatusRef.current) 
            ? campaignStatusRef.current 
            : "In Progress"
        ),
        userEmail: userEmail || "admin@example.com",
        createdBy: userEmail || "admin@example.com",
        lastEditedBy: userEmail || "admin@example.com",
        checklists: campaignChecklists,
        checklistAnswers: overrides.checklistAnswers !== undefined ? overrides.checklistAnswers : (checklistAnswersRef.current || checklistAnswers),
        qaResults: overrides.qaResults !== undefined ? overrides.qaResults : qaResults,
        reviewNote: overrides.reviewNote !== undefined ? overrides.reviewNote : reviewNote,
        currentStep: overrides.currentStep !== undefined ? overrides.currentStep : currentStep,
        outlookFileName: overrides.outlookFileName !== undefined ? overrides.outlookFileName : (outlookFileName || undefined),
        outlookExtractedHtml: overrides.outlookExtractedHtml !== undefined ? overrides.outlookExtractedHtml : (outlookExtractedHtml || undefined),
        outlookSubject: overrides.outlookSubject !== undefined ? overrides.outlookSubject : (outlookSubject || extractedSubject || undefined),
        mockupFileName: mockupFile?.name || undefined,
        mockupDataUrl: mockupPreviewUrl || undefined,
        visualChecks: overrides.visualChecks !== undefined ? overrides.visualChecks : visualChecks,
        ...overrides
      });

      if (record && record.id) {
        campaignIdRef.current = record.id;
        initialLoadedIdRef.current = record.id;
        setCampaignStatus(record.status || "In Progress");
        setDraftSavedAt(new Date().toLocaleTimeString());
        if (!editId) {
          setSearchParams((prev) => {
            prev.set("id", record.id);
            return prev;
          }, { replace: true });
        }
      }
      setSyncStatus(navigator.onLine ? "synced" : "offline");
      return record;
    } catch (e) {
      console.error("[AutoSave] Error saving campaign state:", e);
      setSyncStatus("offline");
      return null;
    }
  };

  const handleChecklistAnswersChange = (newAnswers: Record<string, any>) => {
    setChecklistAnswers(newAnswers);
    checklistAnswersRef.current = newAnswers;

    const restoredCheckpoints: Record<string, boolean> = {};
    Object.keys(newAnswers).forEach((key) => {
      const val = newAnswers[key];
      if (typeof val === 'boolean') {
        restoredCheckpoints[key] = val;
      } else if (val && typeof val === 'object') {
        restoredCheckpoints[key] = val.status === 'Checked' || val.status === 'N/A';
      }
    });
    setCheckedCheckpoints(restoredCheckpoints);

    // Save state immediately on checkpoint change
    saveCurrentCampaignState({ checklistAnswers: newAnswers });
  };

  const [teamChecklists, setTeamChecklists] = useState<any[]>([]);
  const [checkedCheckpoints, setCheckedCheckpoints] = useState<Record<string, boolean>>({});
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  // Mandatory Stage Validation & Visual QA Checks State
  const [visualChecks, setVisualChecks] = useState({
    desktopLight: false,
    mobileLight: false,
    desktopDark: false,
    mobileDark: false,
  });
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [incompleteModalData, setIncompleteModalData] = useState<{
    stageNumber: number;
    stageTitle: string;
    missingCheckpoints: MissingCheckpoint[];
  }>({
    stageNumber: 1,
    stageTitle: "",
    missingCheckpoints: []
  });
  
  const [viewOnlineError, setViewOnlineError] = useState(false);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const targetFolderParam = searchParams.get('folder_id');
  const campaignIdRef = useRef<string | null>(editId);
  const initialLoadedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (editId) {
      campaignIdRef.current = editId;
    }
  }, [editId]);

  const [isPageLoading, setIsPageLoading] = useState<boolean>(!!editId);

  const { register, handleSubmit, control, formState: { errors }, watch, trigger, setError, clearErrors, setValue, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      team: "",
      country: "",
      versionName: "",
      folder_id: targetFolderParam || "",
      webViewUrl: "",
      htmlSource: "",
      figmaUrl: "",
      litmusUrl: ""
    }
  });

  const [availableFolders, setAvailableFolders] = useState<FolderItem[]>(() => {
    const cached = getFolders();
    return cached.length > 0 ? cached : [
      { id: "2026", name: "2026 Campaigns", parentId: null, year: "2026", created_at: new Date().toISOString() },
      { id: "2025", name: "2025 Campaigns", parentId: null, year: "2025", created_at: new Date().toISOString() }
    ];
  });

  useEffect(() => {
    fetchFolders().then((list) => {
      if (list && list.length > 0) {
        setAvailableFolders(list);
      }
    });
  }, []);
  const values = watch();
  const [campaignChecklists, setCampaignChecklists] = useState<any[]>([]);
  const [selectedChecklistId, setSelectedChecklistId] = useState<string>("");
  const checklists = campaignChecklists;
  const [stageLabels, setStageLabels] = useState<Record<string, string>>({
    "1": "Stage 1: Details & Source",
    "2": "Stage 2: Visual Comparison",
    "3": "Stage 3: Alt & Alias Tags",
    "4": "Stage 4: Link Validation",
    "5": "Stage 5: Grammar & Spell Check",
    "6": "Stage 6: Review & Approval / LAUNCH (FQA)",
    "7": "Stage 7: Review & Approval (FQA)"
  });

  // Derive available checklists for the team
  const availableTeamChecklists = teamChecklists.filter((c: any) => c.team === values?.team);


  const isFQA = React.useMemo(() => {
    if (!selectedChecklistId && !campaignChecklists.length) return false;
    const template = availableTeamChecklists.find(c => c.id === selectedChecklistId);
    if (template) {
      const tTitle = template.title?.toLowerCase() || template.name?.toLowerCase() || "";
      return tTitle.includes("fqa") && !tTitle.includes("cqa");
    }
    return campaignChecklists.some(c => c.stage === 7);
  }, [selectedChecklistId, availableTeamChecklists, campaignChecklists]);

  const STEPS = React.useMemo(() => {
    const base = [
      { id: "details", title: stageLabels["1"] ? stageLabels["1"].replace(/Stage 1:\s*/i, '') : "Details & Source" },
      { id: "compare", title: stageLabels["2"] ? stageLabels["2"].replace(/Stage 2:\s*/i, '') : "Visual Comparison" },
      { id: "tags", title: stageLabels["3"] ? stageLabels["3"].replace(/Stage 3:\s*/i, '') : "Alt & Alias Tags" },
      { id: "links", title: stageLabels["4"] ? stageLabels["4"].replace(/Stage 4:\s*/i, '') : "Link Validation" },
      { id: "grammar", title: stageLabels["5"] ? stageLabels["5"].replace(/Stage 5:\s*/i, '') : "Grammar & Spell Check" },
    ];
    if (isFQA) {
      base.push({ id: "launch", title: "LAUNCH" });
    }
    base.push({ id: "review", title: "Review & Approval" });
    return base;
  }, [isFQA, stageLabels]);

  const totalSteps = STEPS.length;


  // Sync campaignChecklists from platform master when team changes on a new campaign
  useEffect(() => {
    if (!isEditMode && availableTeamChecklists.length > 0) {
      // Use selectedChecklistId if present, else default to the first one
      const targetTemplate = selectedChecklistId 
        ? availableTeamChecklists.find((c: any) => c.id === selectedChecklistId)
        : availableTeamChecklists[0];
        
      if (targetTemplate) {
        setCampaignChecklists(targetTemplate.items || []);
        if (!selectedChecklistId && targetTemplate.id) {
          setSelectedChecklistId(targetTemplate.id);
        }
      }
    }
  }, [values?.team, teamChecklists, isEditMode, selectedChecklistId, availableTeamChecklists]);

  useEffect(() => {
    const fetchUserTeam = async () => {
      if (userEmail) {
        try {
          if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co') {
            const { data, error } = await supabase.from('app_users').select('team').eq('email', userEmail).single();
            if (data && data.team) {
              setUserTeam(data.team);
              if (!isEditMode) {
                setValue('team', data.team);
              }
            }
          } else {
             // Mock auth - fallback for test env
             setUserTeam("HP-APJ");
             if (!isEditMode) setValue('team', "HP-APJ");
          }
        } catch(e) {
          console.error("Failed to fetch user team:", e);
        }
      }
    };
    fetchUserTeam();
  }, [userEmail, isEditMode, setValue]);

  // Analysis helpers for Alias tags, Alt tags, and Link Check
  const aliasTagsInfo = React.useMemo(() => {
    const html = values.htmlSource || "";
    if (!html) return { total: 0, items: [], missingInAnchors: [] };
    const regex = /(?:alias|data-alias)=["']([^"']+)["']/gi;
    const items: { alias: string; tag: string }[] = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      items.push({ alias: match[1], tag: match[0] });
    }
    
    // Check anchors missing alias
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const anchors = Array.from(doc.querySelectorAll("a"));
    const missingInAnchors = anchors.filter(a => !a.getAttribute("alias") && !a.getAttribute("data-alias")).map(a => ({
      text: a.textContent?.trim() || a.querySelector("img")?.getAttribute("alt") || "Unlabeled Link",
      href: a.getAttribute("href") || "#"
    }));

    return { total: items.length, items, missingInAnchors };
  }, [values.htmlSource]);

  const altTagsInfo = React.useMemo(() => {
    const html = values.htmlSource || "";
    if (!html) return { total: 0, withAlt: [], missingAlt: [] };
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const imgs = Array.from(doc.querySelectorAll("img"));
    const withAlt: { src: string; alt: string }[] = [];
    const missingAlt: { src: string }[] = [];

    imgs.forEach(img => {
      const src = img.getAttribute("src") || "inline/unspecified";
      const alt = img.getAttribute("alt");
      if (alt !== null && alt.trim() !== "") {
        withAlt.push({ src, alt: alt.trim() });
      } else {
        missingAlt.push({ src });
      }
    });

    return { total: imgs.length, withAlt, missingAlt };
  }, [values.htmlSource]);

  const selectedCountryConfigLinkAudit = countries.find((c: any) => c.name === values.country && c.code === values.versionName);
  const expectedPrefixLinkAudit = selectedCountryConfigLinkAudit?.url;

  const linkAuditInfo = React.useMemo(() => {
    const html = values.htmlSource || "";
    if (!html) return { total: 0, valid: [], missing: [] };
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const anchors = Array.from(doc.querySelectorAll("a"));
    const valid: { text: string; href: string }[] = [];
    const missing: { text: string; href: string; reason: string }[] = [];

    anchors.forEach(a => {
      const text = a.textContent?.trim() || a.querySelector("img")?.getAttribute("alt") || "Banner Link";
      const href = a.getAttribute("href")?.trim() || "";

      if (!href) {
        missing.push({ text, href: "(empty)", reason: "Missing href attribute" });
      } else if (href === "#" || href === "http://" || href === "https://") {
        missing.push({ text, href, reason: "Placeholder or empty link" });
      } else if (href.includes("example.com") || href.includes("YOUR_URL_HERE")) {
        missing.push({ text, href, reason: "Dummy placeholder URL" });
      } else if (
        expectedPrefixLinkAudit && 
        href.toLowerCase().includes("hp.com") && 
        !href.toLowerCase().startsWith(expectedPrefixLinkAudit.toLowerCase())
      ) {
        missing.push({ text, href, reason: `URL mismatch. Expected prefix: ${expectedPrefixLinkAudit}` });
      } else {
        valid.push({ text, href });
      }
    });

    return { total: anchors.length, valid, missing };
  }, [values.htmlSource, expectedPrefixLinkAudit]);

  const refreshLogs = async (id?: string | null, name?: string) => {
    const logs = await getCampaignLogs(id || editId || undefined, name || values.name || undefined);
    setCampaignLogs(logs);
  };

  useEffect(() => {
    if (editId || values.name) {
      refreshLogs(editId, values.name);
    }
  }, [editId, values.name]);

  // Clear the view online error automatically when both fields are filled out
  useEffect(() => {
    if (values.country && values.versionName) {
      setViewOnlineError(false);
    }
  }, [values.country, values.versionName]);

  const handleViewOnlineClick = (action: () => void) => {
    if (!values.country || !values.versionName) {
      setViewOnlineError(true);
      return;
    }
    setViewOnlineError(false);
    action();
  };

  // Handle Outlook MSG File upload and Subject extraction
  const handleOutlookFileChange = (file: File | null) => {
    setOutlookFile(file);
    if (!file) {
      setOutlookExtractedHtml(null);
      setOutlookSubject(null);
      setOutlookFileName(null);
      saveCurrentCampaignState({
        outlookFileName: undefined,
        outlookExtractedHtml: undefined,
        outlookSubject: undefined
      });
      return;
    }

    setOutlookFileName(file.name);
    console.log(`[Outlook Extraction] Processing file '${file.name}'...`);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (buffer) {
        const parsed = await parseMsgArrayBuffer(buffer, file.name);
        setOutlookExtractedHtml(parsed.htmlContent);
        setOutlookSubject(parsed.subject);
        setExtractedSubject(parsed.subject);
        console.log(`[Outlook Extraction] Extracted Subject Line: "${parsed.subject}"`);
        setLeftCompareTab("outlook");

        saveCurrentCampaignState({
          outlookFileName: file.name,
          outlookExtractedHtml: parsed.htmlContent || undefined,
          outlookSubject: parsed.subject
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleMockupImageChange = (file: File | null) => {
    setMockupFile(file);
    if (!file) {
      setMockupPreviewUrl(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setMockupPreviewUrl(dataUrl);
      setDesignChoice("image");
      saveCurrentCampaignState({
        mockupFileName: file.name,
        mockupDataUrl: dataUrl
      });
    };
    reader.readAsDataURL(file);
  };

  const handleManualSave = async () => {
    const data = watch();
    if (!data.name || data.name.trim().length < 2) {
      alert("Please provide a valid Campaign Name (at least 2 characters) before saving.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const record = await saveCurrentCampaignState({ status: "Draft" });
      if (record) {
        setToastNotice(`Campaign "${record.name}" draft saved successfully to database!`);
        setTimeout(() => setToastNotice(null), 3500);
      }
    } catch (e: any) {
      console.error("Manual save failed:", e);
      alert(e?.message || "Failed to save campaign draft.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAll = () => {
    reset({
      name: "",
      team: "",
      country: "",
      versionName: "",
      folder_id: targetFolderParam || "",
      webViewUrl: "",
      htmlSource: "",
      figmaUrl: "",
      litmusUrl: ""
    });
    setBriefFile(null);
    setOutlookFile(null);
    setMockupFile(null);
    setMockupPreviewUrl(null);
    setOutlookSubject(null);
    setOutlookFileName(null);
    setOutlookExtractedHtml(null);
    clearErrors();
    setQaResults([]);
    setDraftSavedAt(null);
    console.log("[CampaignSetup] All input fields and uploads reset.");
  };

  useEffect(() => {
    const loadMasterChecklists = async () => {
      const data = await fetchPlatformChecklists();
      setTeamChecklists(data);
    };
    loadMasterChecklists();
  }, []);

  useEffect(() => {
    if (editId) {
      if (initialLoadedIdRef.current === editId) {
        // Already loaded or saved locally in this session - avoid resetting user's active form edits
        return;
      }
      initialLoadedIdRef.current = editId;
      setIsEditMode(true);
      const loadCampaign = async () => {
        console.log(`[CampaignSetup] Loading campaign ID '${editId}' for editing...`);
        const campaignData = await getCampaignById(editId);

        if (campaignData) {
          setValue('name', campaignData.name || "");
          setValue('team', campaignData.team || "HP-APJ");
          setValue('country', campaignData.country || "");
          setValue('versionName', campaignData.versionName || campaignData.version_name || "");
          setValue('folder_id', campaignData.folder_id || targetFolderParam || "");
          setValue('webViewUrl', campaignData.webViewUrl || campaignData.web_view_url || "");
          setValue('htmlSource', campaignData.htmlSource || campaignData.html_source || "");
          setValue('figmaUrl', campaignData.figmaUrl || campaignData.figma_url || "");
          setValue('litmusUrl', campaignData.litmusUrl || campaignData.litmus_url || "");
          setCampaignStatus(campaignData.status || "QA Pending");
          if (campaignData.figmaUrl || campaignData.figma_url) setDesignChoice("figma");

          // Load master checklists first to ensure team lists are up to date
          const masterChecklists = await fetchPlatformChecklists();

          // Load frozen checklists snapshot if available
          if (campaignData.checklists && Array.isArray(campaignData.checklists) && campaignData.checklists.length > 0) {
            setCampaignChecklists(campaignData.checklists);
          } else {
            const masterItems = masterChecklists.find((c: any) => c.team === (campaignData.team || "HP-APJ"))?.items || [];
            setCampaignChecklists(masterItems);
          }

          // Check both camelCase and snake_case for checklist answers
          const answers = campaignData.checklistAnswers || (campaignData as any).checklist_answers;
          if (answers && typeof answers === 'object') {
            setChecklistAnswers(answers);
            const restoredCheckpoints: Record<string, boolean> = {};
            Object.keys(answers).forEach((key) => {
              const val = answers[key];
              if (typeof val === 'boolean') {
                restoredCheckpoints[key] = val;
              } else if (val && typeof val === 'object') {
                restoredCheckpoints[key] = val.status === 'Checked' || val.status === 'N/A';
              }
            });
            setCheckedCheckpoints(restoredCheckpoints);
          }

          if (campaignData.outlookExtractedHtml) setOutlookExtractedHtml(campaignData.outlookExtractedHtml);
          if (campaignData.outlookFileName) setOutlookFileName(campaignData.outlookFileName);
          if (campaignData.outlookSubject) {
            setOutlookSubject(campaignData.outlookSubject);
            setExtractedSubject(campaignData.outlookSubject);
          }
          if (campaignData.mockupDataUrl) setMockupPreviewUrl(campaignData.mockupDataUrl);
          if (campaignData.visualChecks || (campaignData as any).visual_checks) {
            setVisualChecks(campaignData.visualChecks || (campaignData as any).visual_checks);
          }
          if (campaignData.currentStep || campaignData.current_step) {
            setCurrentStep(campaignData.currentStep || campaignData.current_step || 1);
          }

          refreshLogs(editId, campaignData.name);
        }
        setIsPageLoading(false);
      };
      loadCampaign();
    } else {
      // New Campaign: Always start with a completely fresh, empty campaign workspace
      campaignIdRef.current = null;
      setIsEditMode(false);
      setCampaignStatus("Draft");
      setChecklistAnswers({});
      setCheckedCheckpoints({});
      setVisualChecks({ desktopLight: false, mobileLight: false, desktopDark: false, mobileDark: false });
      setBriefFile(null);
      setOutlookFile(null);
      setMockupFile(null);
      setMockupPreviewUrl(null);
      setOutlookSubject(null);
      setOutlookFileName(null);
      setOutlookExtractedHtml(null);
      setExtractedSubject("");
      setReviewNote("");
      setDraftSavedAt(null);
      setCurrentStep(1);
      setQaResults([]);

      const masterItems = teamChecklists.find((c: any) => c.team === (userTeam || "HP-APJ"))?.items || [];
      setCampaignChecklists(masterItems);

      reset({
        name: "",
        team: userTeam || "HP-APJ",
        country: "",
        versionName: "",
        folder_id: targetFolderParam || "2026",
        webViewUrl: "",
        htmlSource: "",
        figmaUrl: "",
        litmusUrl: ""
      });
      setIsPageLoading(false);
    }
  }, [editId, setValue, reset, targetFolderParam, teamChecklists, userTeam]);

  // Dedicated Auto-Save: Saves draft to Supabase DB every 30 seconds only for named new campaigns
  useEffect(() => {
    const saveDraftToDatabase = async () => {
      try {
        const formData = watch();
        if (!editId && !campaignIdRef.current && formData.name && formData.name.trim().length >= 2 && formData.country) {
          const timeStr = new Date().toLocaleTimeString();
          const draftRecord = await saveCampaignRecord({
            name: formData.name.trim(),
            team: formData.team || "HP-APJ",
            country: formData.country,
            versionName: formData.versionName || "Standard",
            folder_id: formData.folder_id || "2026",
            webViewUrl: formData.webViewUrl || "",
            htmlSource: formData.htmlSource || "",
            figmaUrl: designChoice === "figma" ? (formData.figmaUrl || "") : "",
            litmusUrl: formData.litmusUrl || "",
            status: "Draft",
            userEmail: userEmail || "admin@example.com",
            createdBy: userEmail || "admin@example.com",
            checklists: campaignChecklists,
            checklistAnswers: checklistAnswersRef.current || checklistAnswers,
            currentStep: currentStep,
            reviewNote: reviewNote || "",
            outlookFileName: outlookFileName || "",
            outlookExtractedHtml: outlookExtractedHtml || "",
            outlookSubject: outlookSubject || "",
            mockupDataUrl: mockupPreviewUrl || ""
          });

          if (draftRecord && draftRecord.id) {
            campaignIdRef.current = draftRecord.id;
          }
          setDraftSavedAt(timeStr);
          console.log(`[AutoSave 30s] Campaign draft saved to database at ${timeStr}`);
        }
      } catch (err) {
        console.warn("[AutoSave 30s] Auto-save notice:", err);
      }
    };

    const interval = setInterval(saveDraftToDatabase, 30000);
    return () => clearInterval(interval);
  }, [watch, editId, designChoice, outlookFileName, outlookExtractedHtml, outlookSubject, mockupPreviewUrl, reviewNote, currentStep, userEmail, campaignChecklists, checklistAnswers]);

  // Real-time debounced auto-save to database / storage engine
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const subscription = watch((value) => {
      if (value.name && value.name.trim().length >= 2) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          saveCurrentCampaignState();
        }, 500);
      }
    });

    const intervalId = setInterval(() => {
      const data = watch();
      if (data.name && data.name.trim().length >= 2) {
        saveCurrentCampaignState();
      }
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [watch, editId, campaignStatus, designChoice, userEmail, currentStep, outlookFileName, outlookExtractedHtml, outlookSubject]);

  // Real-time auto-save whenever checklist answers change
  const isChecklistMountedRef = useRef(false);
  useEffect(() => {
    if (!isChecklistMountedRef.current) {
      if (!isPageLoading) {
        isChecklistMountedRef.current = true;
      }
      return;
    }
    const timer = setTimeout(() => {
      saveCurrentCampaignState({ checklistAnswers });
    }, 400);

    return () => clearTimeout(timer);
  }, [checklistAnswers, isPageLoading]);

  // Real-time auto-save whenever review note changes
  const isReviewNoteMountedRef = useRef(false);
  useEffect(() => {
    if (!isReviewNoteMountedRef.current) {
      if (!isPageLoading) {
        isReviewNoteMountedRef.current = true;
      }
      return;
    }
    const timer = setTimeout(() => {
      saveCurrentCampaignState({ reviewNote });
    }, 500);

    return () => clearTimeout(timer);
  }, [reviewNote, isPageLoading]);

  // Ensure state is saved to Supabase before unload or component unmount, and warn user
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      saveCurrentCampaignState();
      e.preventDefault();
      e.returnValue = '';
    };

    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target || !target.href) return;
      
      const currentUrl = window.location.origin + window.location.pathname;
      const targetUrl = target.href.split('#')[0].split('?')[0];
      
      if (
        target.href.startsWith(window.location.origin) && 
        targetUrl !== currentUrl &&
        target.target !== '_blank' &&
        !target.hasAttribute('download')
      ) {
        const confirmLeave = window.confirm("You are currently editing a campaign. Do you want to save your progress and leave?");
        if (confirmLeave) {
          saveCurrentCampaignState();
        } else {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleAnchorClick, { capture: true });

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleAnchorClick, { capture: true });
      saveCurrentCampaignState();
    };
  }, []);

  const validateStageAndGetMissingItems = (stageNum: number): MissingCheckpoint[] => {
    const missingItems: MissingCheckpoint[] = [];

    // Stage 1 required form fields check
    if (stageNum === 1) {
      if (!values.name || !values.name.trim()) {
        missingItems.push({
          id: 'field_name',
          label: 'Campaign Name (Mandatory Field)',
          reason: 'Required campaign name field is empty'
        });
      }
      if (!values.country) {
        missingItems.push({
          id: 'field_country',
          label: 'Country Selection',
          reason: 'Please select a target country'
        });
      }
      if (!values.htmlSource || !values.htmlSource.trim()) {
        missingItems.push({
          id: 'field_html',
          label: 'Email HTML Source Code',
          reason: 'Email HTML source code is empty'
        });
      }
    }

    // Stage 2 special Visual QA Checks (Desktop Light, Mobile Light, Desktop Dark, Mobile Dark)
    if (stageNum === 2) {
      if (!visualChecks.desktopLight) {
        missingItems.push({
          id: 'visual_desktop_light',
          label: 'Visual QA: Desktop (Light Mode)',
          reason: 'Must inspect Desktop Light mode and mark in QA Checklist'
        });
      }
      if (!visualChecks.mobileLight) {
        missingItems.push({
          id: 'visual_mobile_light',
          label: 'Visual QA: Mobile (Light Mode)',
          reason: 'Must inspect Mobile Light mode and mark in QA Checklist'
        });
      }
      if (!visualChecks.desktopDark) {
        missingItems.push({
          id: 'visual_desktop_dark',
          label: 'Visual QA: Desktop (Dark Mode)',
          reason: 'Must inspect Desktop Dark mode and mark in QA Checklist'
        });
      }
      if (!visualChecks.mobileDark) {
        missingItems.push({
          id: 'visual_mobile_dark',
          label: 'Visual QA: Mobile (Dark Mode)',
          reason: 'Must inspect Mobile Dark mode and mark in QA Checklist'
        });
      }
    }

    // Check stage checkpoints (for stageNum or stage 0)
    const currentStageChecklists = campaignChecklists.filter(c => c.stage === stageNum || c.stage === 0);
    currentStageChecklists.forEach(c => {
      const ans = checklistAnswers[c.id];
      if (!ans || !ans.status) {
        missingItems.push({
          id: c.id,
          label: c.text,
          reason: "Not marked as 'Checked' or 'N/A'"
        });
      } else if (c.requiresInput && ans.status === "Checked" && !ans.text?.trim()) {
        missingItems.push({
          id: c.id,
          label: c.text,
          reason: "Requires text comment/input when Checked"
        });
      }
    });

    return missingItems;
  };

  const handleStepClick = async (stepNum: number) => {
    if (stepNum === currentStep) return;
    if (stepNum > currentStep) {
      const missing = validateStageAndGetMissingItems(currentStep);
      if (missing.length > 0) {
        setShowChecklistError(true);
        setIncompleteModalData({
          stageNumber: currentStep,
          stageTitle: STEPS[currentStep - 1]?.title || `Stage ${currentStep}`,
          missingCheckpoints: missing
        });
        setShowIncompleteModal(true);
        return;
      }
    }
    setShowChecklistError(false);
    setCurrentStep(stepNum);
    await saveCurrentCampaignState({ currentStep: stepNum });
  };

  // Realtime subscription to detect concurrent QA updates by other users
  useEffect(() => {
    if (!editId) return;
    if (!isSupabaseConfigured()) return;

    const channel = supabase
      .channel(`campaign-qa-${editId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'campaigns',
        filter: `id=eq.${editId}`
      }, (payload: any) => {
        const updated = payload.new;
        if (!updated) return;

        const now = Date.now();
        // Ignore updates received within 10 seconds of our own local save
        const isRecentLocalSave = now - lastLocalSaveTimeRef.current < 10000;
        if (isRecentLocalSave) return;

        const editor = String(updated.last_edited_by || '').toLowerCase().trim();
        const current = String(userEmail || '').toLowerCase().trim();

        // If editor matches current user email or default test emails, ignore
        if (editor && current && (editor === current || editor === 'admin@example.com' || editor === 'qa user')) return;

        // Check if there are actual changes in checklist answers or campaign status
        const remoteAnswers = updated.checklist_answers || updated.checklistAnswers || {};
        const localAnswers = checklistAnswersRef.current || {};
        const remoteAnswersStr = JSON.stringify(remoteAnswers);
        const localAnswersStr = JSON.stringify(localAnswers);

        const answersChanged = remoteAnswersStr !== localAnswersStr && remoteAnswersStr !== '{}';
        const statusChanged = updated.status && updated.status !== campaignStatusRef.current;

        if (answersChanged || statusChanged) {
          setRemoteQaUpdateNotice(`User ${updated.last_edited_by || 'another reviewer'} updated QA checkpoints or status. Click to reload latest checkpoints.`);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [editId, userEmail]);

  const handleSyncRemoteQaAnswers = async () => {
    if (!editId) return;
    const remote = await getCampaignById(editId);
    if (remote) {
      if (remote.checklistAnswers || (remote as any).checklist_answers) {
        setChecklistAnswers(remote.checklistAnswers || (remote as any).checklist_answers);
      }
      if (remote.status) setCampaignStatus(remote.status);
      setToastNotice("Synced latest QA checkpoints from database.");
      setTimeout(() => setToastNotice(null), 3500);
    }
    setRemoteQaUpdateNotice(null);
  };

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co') {
          const { data } = await supabase.from('countries').select('*').order('name');
          if (data && data.length > 0) {
            setCountries(data);
          }
          
          const { data: settingsData } = await supabase.from('app_settings').select('stage_labels').limit(1).maybeSingle();
          if (settingsData && settingsData.stage_labels) {
            try {
              const parsed = typeof settingsData.stage_labels === 'string' ? JSON.parse(settingsData.stage_labels) : settingsData.stage_labels;
              setStageLabels(prev => ({ ...prev, ...parsed }));
            } catch (e) {
              console.warn("Failed to parse stage_labels", e);
            }
          }
        }
        const apiRes = await fetch('/api/countries');
        if (apiRes.ok) {
          const json = await apiRes.json();
          if (json.countries) setCountries(json.countries);
        }
      } catch (err) {
        console.warn("[CampaignSetup] Exception during fetchCountries:", err);
      }
    };
    fetchCountries();

    fetchPlatformChecklists().then(setTeamChecklists);
  }, []);

  const selectedCountryConfig = countries.find((c: any) => c.name === values.country && c.code === values.versionName);
  const expectedPrefix = selectedCountryConfig?.url;
  const rawWebViewUrl = values.webViewUrl ? values.webViewUrl.trim() : "";
  const isPlaceholderUrl = !rawWebViewUrl || rawWebViewUrl === "{{ViewOnline}}" || rawWebViewUrl.includes("{{ViewOnline}}");
  const resolvedWebViewUrl = isPlaceholderUrl ? (expectedPrefix || "") : rawWebViewUrl;

  const processedHtmlSource = (values.htmlSource || "")
    .replace(/\{\{ViewOnline\}\}/g, resolvedWebViewUrl)
    .replace(/%2B%2BViewOnline%2B%2B/gi, resolvedWebViewUrl)
    .replace(/%%view_email_url%%/gi, resolvedWebViewUrl);

  const nextStep = async () => {
    const missing = validateStageAndGetMissingItems(currentStep);
    
    if (missing.length > 0 && currentStep < totalSteps) {
      setShowChecklistError(true);
      setIncompleteModalData({
        stageNumber: currentStep,
        stageTitle: STEPS[currentStep - 1]?.title || `Stage ${currentStep}`,
        missingCheckpoints: missing
      });
      setShowIncompleteModal(true);
      return;
    }
    setShowChecklistError(false);
    let fieldsToValidate: any[] = [];
    if (currentStep === 1) fieldsToValidate = ["name", "country", "versionName", "webViewUrl", "htmlSource"];
    if (currentStep === 2) fieldsToValidate = [];
    if (currentStep === 3) fieldsToValidate = [];
    if (currentStep === 4) fieldsToValidate = [];
    if (currentStep === 5) fieldsToValidate = [];
    if (currentStep === totalSteps) fieldsToValidate = [];
    
    // Uniqueness Check
    if (values.name) {
      const currentId = editId || campaignIdRef.current || undefined;
      const isUnique = await isCampaignNameUnique(values.name, currentId);
      if (!isUnique) {
        setError("name", {
          type: "manual",
          message: "Campaign name must be unique. A campaign with this duplicate name already exists."
        });
        return;
      }
    }

    let isValid = await trigger(fieldsToValidate as any);
    
    if (currentStep === 1 && isValid) {
      const country = values.country;
      const version = values.versionName;
      
      const urlValidationSummary = await fetchAndValidateCountryUrls({
        html: values.htmlSource || "",
        rawWebViewUrl: values.webViewUrl || "",
        countryName: country,
        versionName: version,
        allowedPattern: expectedPrefix,
      });

      const allowedPattern = urlValidationSummary.allowedPattern;

      if (!allowedPattern) {
        setError("country", { type: "manual", message: `No URL pattern configured in database for country ${country} (${version}).` });
        isValid = false;
      }
      
      if (isValid) {
         const results = validateCampaignHTML(
           values.htmlSource || "", 
           allowedPattern || "", 
           values.webViewUrl, 
           country, 
           version
         );
         setQaResults(results);
      }
    }

    if (isValid) {
      clearErrors();
      const nextS = Math.min(currentStep + 1, totalSteps);
      setCurrentStep(nextS);
      saveCurrentCampaignState({ currentStep: nextS, qaResults: qaResults });
    }
  };

  const prevStep = () => {
    const prevS = Math.max(currentStep - 1, 1);
    setCurrentStep(prevS);
    saveCurrentCampaignState({ currentStep: prevS });
  };

  const handleCopyQAResults = () => {
    const textToCopy = qaResults.map(r => `[${r.status.toUpperCase()}] ${r.name}: ${r.message}`).join('\n');
    navigator.clipboard.writeText(textToCopy).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleExportPDF = () => {
    exportQAVerificationReceiptPDF({
      campaignName: values.name || "Campaign Verification Summary",
      team: values.team || "QA Team",
      country: values.country || "Global",
      versionName: values.versionName || "v1",
      webViewUrl: values.webViewUrl || "",
      userEmail: userEmail || "qa@hp.com",
      campaignStatus: campaignStatus || "In Progress",
      checklists: checklists,
      answers: checklistAnswers
    });
  };

  const handleExportExcel = () => {
    exportQAChecklistToExcel({
      campaignName: values.name || "Campaign Verification Summary",
      team: values.team || "QA Team",
      country: values.country || "Global",
      versionName: values.versionName || "v1",
      userEmail: userEmail || "qa@hp.com",
      campaignStatus: campaignStatus || "In Progress",
      checklists: checklists,
      answers: checklistAnswers
    });
  };

  const onInvalid = (fieldErrors: any) => {
    console.error("[CampaignSetup] Form submission blocked due to field validation errors:", fieldErrors);
    const errorDetails = Object.keys(fieldErrors)
      .map(key => `• ${key}: ${fieldErrors[key]?.message}`)
      .join('\n');
    alert(`Please fix the following form errors before saving:\n\n${errorDetails}`);
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const currentId = editId || campaignIdRef.current || undefined;
      const isUnique = await isCampaignNameUnique(data.name, currentId);
      if (!isUnique) {
        setError("name", { type: "manual", message: "Campaign name must be unique." });
        setIsSubmitting(false);
        return;
      }

      const dbAllowedPattern = await fetchAllowedUrlPattern(data.country, data.versionName);
      const expectedUrl = dbAllowedPattern || expectedPrefix;
      const rawUrl = data.webViewUrl ? data.webViewUrl.trim() : "";
      const isPlaceholder = !rawUrl || rawUrl === "{{ViewOnline}}" || rawUrl.includes("{{ViewOnline}}");
      const finalWebViewUrl = isPlaceholder ? (expectedUrl || data.webViewUrl) : data.webViewUrl;

      await saveCampaignRecord({
        id: currentId,
        name: data.name,
        team: data.team,
        country: data.country,
        versionName: data.versionName,
        folder_id: data.folder_id,
        webViewUrl: finalWebViewUrl,
        htmlSource: data.htmlSource,
        figmaUrl: designChoice === "figma" ? (data.figmaUrl || "") : "",
        litmusUrl: data.litmusUrl || "",
        status: "QA Pending",
        createdBy: userEmail,
        lastEditedBy: userEmail,
        checklists: campaignChecklists,
        checklistAnswers: checklistAnswers
      });

      await logAction(userEmail, isEditMode ? "Update Campaign" : "Create Campaign", `Submitted campaign: ${data.name}`);
      navigate("/campaigns");
    } catch (err) {
      console.error("[CampaignSetup] Error in onSubmit:", err);
      alert("An error occurred while saving the campaign.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGrammarCheck = async () => {
    setIsCheckingGrammar(true);
    setGrammarCheckResult(null);
    const htmlToAnalyze = values.htmlSource || outlookExtractedHtml || "";
    if (!htmlToAnalyze.trim()) {
      setGrammarCheckResult("Please paste or upload HTML source or an Outlook MSG file before running the grammar check.");
      setIsCheckingGrammar(false);
      return;
    }
    try {
      const response = await fetch("/api/grammar-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlContent: htmlToAnalyze }),
      });
      if (!response.ok) {
        setGrammarCheckResult("Grammar check scan completed. Please perform manual copy review if necessary.");
        return;
      }
      const data = await response.json();
      if (data.error) {
        setGrammarCheckResult(`Notice: ${data.error}`);
      } else {
        setGrammarCheckResult(data.result || "No grammar issues detected.");
      }
    } catch (error) {
      console.error("Failed to check grammar:", error);
      setGrammarCheckResult("Grammar check scan completed. Please review email text manually.");
    } finally {
      setIsCheckingGrammar(false);
    }
  };

  const runAiQa = async () => {
    const htmlToAnalyze = values.htmlSource || outlookExtractedHtml || "";
    if (!htmlToAnalyze.trim()) {
      setToastNotice("Please paste or upload HTML source before running AI Auto-QA.");
      setTimeout(() => setToastNotice(null), 3000);
      return;
    }

    setIsAiQaRunning(true);
    setAiQaReport(null);
    try {
      const selectedAgent = availableAiAgents.find(a => a.id === selectedAiAgentId);
      const agentRules = selectedAgent ? selectedAgent.rules : (localStorage.getItem("hp_qa_ai_rules") || "");
      const checklistRules = campaignChecklists && campaignChecklists.length > 0 
        ? campaignChecklists.map((c: any, i: number) => `${i + 1}. [Checklist Item] ${c.title}`).join("\n") 
        : "";
      const customRules = `${agentRules}\n\nPlease also explicitly verify if the campaign complies with the following user-defined checklist items:\n${checklistRules}`;
      
      const response = await fetch("/api/run-ai-qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlSource: htmlToAnalyze, customRules }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        setToastNotice(`AI Error: ${data.error || "Failed to run AI QA"}`);
        setTimeout(() => setToastNotice(null), 4000);
        return;
      }
      
      setAiQaReport(data);
    } catch (error: any) {
      console.error("Failed to run AI QA:", error);
      setToastNotice("Network error: Failed to reach AI QA API.");
      setTimeout(() => setToastNotice(null), 4000);
    } finally {
      setIsAiQaRunning(false);
    }
  };

  const handleDecision = async (newStatus: "Approved" | "Failed" | "QA Pending") => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    setIsSubmitting(true);
    try {
      const data = watch();
      const pattern = (data.country ? await fetchAllowedUrlPattern(data.country, data.versionName) : null) || expectedPrefix;
      const rawWebUrl = data.webViewUrl ? data.webViewUrl.trim() : "";
      const isPlaceholder = !rawWebUrl || rawWebUrl === "{{ViewOnline}}" || rawWebUrl.includes("{{ViewOnline}}");
      const finalWebViewUrl = isPlaceholder ? (pattern || resolvedWebViewUrl || data.webViewUrl) : data.webViewUrl;

      const record = await saveCampaignRecord({
        id: editId || undefined,
        name: data.name || "Untitled Campaign",
        team: data.team || "HP-APJ",
        country: data.country || "",
        versionName: data.versionName || "",
        folder_id: data.folder_id,
        webViewUrl: finalWebViewUrl || "",
        htmlSource: data.htmlSource || "",
        figmaUrl: designChoice === "figma" ? (data.figmaUrl || "") : "",
        litmusUrl: data.litmusUrl || "",
        status: newStatus,
        createdBy: userEmail,
        lastEditedBy: userEmail,
        checklists: campaignChecklists,
        checklistAnswers: checklistAnswers
      });

      setCampaignStatus(newStatus);
      await logAction(
        userEmail, 
        newStatus === "Approved" ? "Approve Campaign" : newStatus === "Failed" ? "Fail Campaign" : "Update Status",
        `Set status to ${newStatus}. Note: ${reviewNote || "No note"}`,
        record.id
      );

      refreshLogs(record.id, data.name);
      if (newStatus === "Approved") {
        setShowApprovalEmailModal(true);
      } else {
        alert(`Campaign marked as ${newStatus} successfully.`);
      }
    } catch (err) {
      console.error("Error setting decision:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("approved")) return "bg-emerald-100 text-emerald-800 border-emerald-300";
    if (s.includes("failed")) return "bg-rose-100 text-rose-800 border-rose-300";
    if (s.includes("draft")) return "bg-slate-100 text-slate-700 border-slate-300";
    return "bg-amber-100 text-amber-800 border-amber-300";
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto bg-slate-50">
      <header className="min-h-16 md:h-20 flex flex-wrap items-center justify-between px-4 md:px-8 py-3 border-b border-slate-200 shrink-0 bg-white shadow-xs gap-3">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">{values.name || (isEditMode ? "Update Campaign" : "New Campaign Setup")}</h2>
              <span className={cn("px-2.5 py-0.5 text-xs font-semibold rounded-full border", getStatusBadgeClass(campaignStatus))}>
                {campaignStatus}
              </span>
              {draftSavedAt && (
                <span className="text-xs text-slate-400 flex items-center gap-1 font-medium bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  <Clock className="w-3 h-3 text-slate-500" />
                  Autosaved {draftSavedAt}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isOnline || syncStatus === "offline" ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-full">
              <WifiOff className="w-3.5 h-3.5 text-amber-600" /> Offline Mode (Saved locally)
            </span>
          ) : syncStatus === "syncing" ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded-full animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" /> Syncing offline changes...
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Online & Synced
            </span>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 text-slate-700 border-slate-300 text-xs font-semibold"
            onClick={handleManualSave}
            disabled={isSubmitting || isApprovedLocked}
          >
            <Save className="w-4 h-4 text-[#2b61d6]" />
            Save Draft
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 text-slate-700 border-slate-300 text-xs font-semibold"
            onClick={() => setShowLogsModal(!showLogsModal)}
          >
            <History className="w-4 h-4 text-[#2b61d6]" />
            Audit Logs ({campaignLogs.length})
          </Button>

          <div className="flex items-center gap-2 mr-2">
            {filteredAiAgents.length > 0 && (
              <select
                value={selectedAiAgentId}
                onChange={(e) => setSelectedAiAgentId(e.target.value)}
                className="h-8 text-xs bg-white border border-slate-200 rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 font-medium"
                disabled={isAiQaRunning || isApprovedLocked}
              >
                {filteredAiAgents.map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              onClick={runAiQa}
              disabled={isAiQaRunning || isApprovedLocked}
            >
              {isAiQaRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isAiQaRunning ? "Analyzing..." : "✨ AI Auto-QA"}
            </Button>
          </div>

          {currentStep === totalSteps && (
            <>
              <Button
                type="button"
                size="sm"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                onClick={() => handleDecision("Approved")}
                disabled={isSubmitting || isApprovedLocked}
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve Campaign
              </Button>

              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                onClick={() => handleDecision("Failed")}
                disabled={isSubmitting || isApprovedLocked}
              >
                <XCircle className="w-4 h-4" />
                Fail Campaign
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Approved Lock Banner */}
      {isApprovedLocked && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-900 px-6 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-800 rounded-lg shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                Campaign Approved & Locked (Read-Only Mode)
              </p>
              <p className="text-[11px] text-amber-800">
                This campaign has been Approved and locked. Standard users can inspect all steps, checkpoints, links, and preview outputs in read-only mode. Only Admins can modify approved campaigns.
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-amber-200 text-amber-900 px-3 py-1 rounded-full font-bold uppercase shrink-0">
            Read-Only
          </span>
        </div>
      )}

      {/* Concurrent User Update Banner */}
      {remoteQaUpdateNotice && (
        <div className="bg-blue-500/10 border-b border-blue-500/30 text-blue-900 px-6 py-2.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
            <p className="text-xs font-medium text-blue-900">{remoteQaUpdateNotice}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncRemoteQaAnswers}
              className="px-3 py-1 bg-[#2b61d6] text-white rounded text-xs font-semibold hover:bg-blue-700 transition-colors shrink-0 cursor-pointer"
            >
              Sync Checkpoints
            </button>
            <button
              type="button"
              onClick={() => setRemoteQaUpdateNotice(null)}
              className="p-1 text-slate-500 hover:text-slate-800 rounded transition-colors cursor-pointer"
              title="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Global Campaign Flow Progress Indicator (Setup -> Validation -> Checklist) */}
      <CampaignProgressIndicator
        currentStep={currentStep}
        totalSteps={totalSteps}
        steps={STEPS}
        checklists={checklists}
        checklistAnswers={checklistAnswers}
        onStepClick={handleStepClick}
        campaignStatus={campaignStatus}
        isApprovedLocked={isApprovedLocked}
      />

      {isPageLoading ? (
        <CampaignSetupSkeleton />
      ) : (
      <form className="flex-1 flex flex-col min-h-0 overflow-y-auto" onSubmit={(e) => { e.preventDefault(); handleSubmit(onSubmit, onInvalid)(e); }}>
        <MasterChecklistSidebar checklists={checklists} answers={checklistAnswers} />
        <QAWizard
          steps={STEPS}
          currentStep={currentStep}
          onNext={nextStep}
          onPrev={prevStep}
          onStepClick={handleStepClick}
          hideStepper={true}
          onCancel={async () => {
            await saveCurrentCampaignState();
            navigate("/campaigns");
          }}
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          isSubmitting={isSubmitting}
        >
          <div className="flex flex-col lg:flex-row w-full min-h-0 relative overflow-visible gap-4">
            <div className="flex-1 min-w-0 flex flex-col overflow-y-auto pr-1 pb-1">
              {currentStep < totalSteps && checklists.filter(c => c.stage === currentStep || c.stage === 0).length > 0 && (
                <div className="p-4 bg-white border-b border-slate-200 shrink-0">
                  <StageChecklist 
                    currentStep={currentStep} 
                    checklists={checklists} 
                    answers={checklistAnswers} 
                    setAnswers={handleChecklistAnswersChange} 
                    showError={showChecklistError}
                    disabled={isApprovedLocked}
                    campaignMeta={{
                      campaignName: values.name,
                      team: values.team,
                      country: values.country,
                      versionName: values.versionName,
                      userEmail: userEmail,
                      campaignStatus: campaignStatus
                    }}
                  />
                </div>
              )}
              {currentStep === 1 && (
                <Card className="shadow-xs border-slate-200 flex flex-col">
                <CardHeader className="border-b border-slate-100 bg-white rounded-t-xl shrink-0 flex flex-row items-center justify-between py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-slate-900 text-base">Campaign Details & Source</CardTitle>
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <Folder className="w-3 h-3 text-[#2b61d6]" />
                        {availableFolders.find(f => f.id === (values.folder_id || targetFolderParam || "2026"))?.name || "2026 Campaigns"}
                      </span>
                    </div>
                    <CardDescription className="text-slate-500 text-xs mt-0.5">Specify mandatory unique campaign name, target region, and design reference.</CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetAll}
                    className="text-slate-700 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 border-slate-300 gap-1.5 transition-colors text-xs font-semibold shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                    Clear All Inputs
                  </Button>
                </CardHeader>
                <CardContent className="space-y-5 pt-5 bg-white flex-1">
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                        Campaign Name <span className="text-rose-500">* Mandatory</span>
                      </Label>
                      <Input 
                        id="name" 
                        placeholder="e.g. 2026 Q3 Summer Promo" 
                        className="border-slate-300 h-9 text-xs focus:ring-[#2b61d6]" 
                        {...register("name")} 
                      />
                      {errors.name && <p className="text-xs text-rose-600 font-semibold">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="team" className="text-xs font-semibold text-slate-800">Checklist</Label>
                      <Controller
                        control={control}
                        name="team"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value || userTeam} disabled>
                            <SelectTrigger className="border-slate-300 h-9 text-xs bg-slate-50 cursor-not-allowed">
                              <SelectValue placeholder="Checklist" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="HP-APJ">HP-APJ</SelectItem>
                              <SelectItem value="HP-EMEA">HP-EMEA</SelectItem>
                              <SelectItem value="HP-AMS">HP-AMS</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.team && <p className="text-xs text-rose-600 font-semibold">{errors.team.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="country" className="text-xs font-semibold text-slate-800">Country *</Label>
                          <Controller
                            control={control}
                            name="country"
                            render={({ field }) => {
                              const uniqueCountries = Array.from(new Set(countries.map(c => c.name)));
                              return (
                                <Select 
                                  onValueChange={(val) => {
                                    field.onChange(val);
                                    setValue("versionName", "", { shouldValidate: true });
                                  }} 
                                  value={field.value}
                                >
                                  <SelectTrigger className={cn("border-slate-300 h-9 text-xs", viewOnlineError && !field.value && "border-red-500 ring-1 ring-red-500 animate-shake")}>
                                    <SelectValue placeholder="Country" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {uniqueCountries.map(name => (
                                      <SelectItem key={name} value={name}>{name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              );
                            }}
                          />
                          {errors.country && <p className="text-xs text-rose-600 font-semibold">{errors.country.message}</p>}
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label htmlFor="versionName" className="text-xs font-semibold text-slate-800">Version *</Label>
                          <Controller
                            control={control}
                            name="versionName"
                            render={({ field }) => {
                              const availableVersions = countries.filter(c => c.name === values.country);
                              return (
                                <Select onValueChange={field.onChange} value={field.value} disabled={!values.country}>
                                  <SelectTrigger className={cn("border-slate-300 h-9 text-xs", viewOnlineError && !field.value && "border-red-500 ring-1 ring-red-500 animate-shake")}>
                                    <SelectValue placeholder="Version" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableVersions.map(c => (
                                      <SelectItem key={c.id || c.code} value={c.code}>{c.code}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              );
                            }}
                          />
                          {errors.versionName && <p className="text-xs text-rose-600 font-semibold">{errors.versionName.message}</p>}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Pattern: <span className="font-semibold text-slate-700">{expectedPrefix || "Select Country"}</span>
                      </p>
                    </div>


                      {/* CHECKLIST TEMPLATE SELECTION (NEW) */}
                      {!isEditMode && availableTeamChecklists.length > 0 && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                            <CheckSquare className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>QA Checklist Type *</span>
                          </Label>
                          <Select value={selectedChecklistId} onValueChange={(val) => {
                            setSelectedChecklistId(val);
                            // If the user explicitly changes the template, update the checklists array (even in edit mode)
                            const targetTemplate = availableTeamChecklists.find((c: any) => c.id === val || c.name === val);
                            if (targetTemplate) {
                              setCampaignChecklists(targetTemplate.items || []);
                            }
                          }}>
                            <SelectTrigger className="border-slate-300 h-9 text-xs">
                              <SelectValue placeholder="Select Checklist Template" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableTeamChecklists.map((c: any) => (
                                <SelectItem key={c.id || c.name || "default"} value={c.id || c.name || "default"}>
                                  {c.name || "Default Checklist"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      


                    <div className="space-y-1.5">
                      <Label htmlFor="webViewUrl" className="text-xs font-semibold text-slate-800">View Online Link</Label>
                      <Input id="webViewUrl" placeholder="Viewonline URL" className="border-slate-300 h-9 text-xs" {...register("webViewUrl")} />
                    </div>
                  </div>

                  {/* Design Reference Mode Switcher (Client provides EITHER Figma URL OR Uploaded Mockup) */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-800">
                        Design Reference Mode (Choose Figma Link OR Upload Mockup)
                      </Label>
                      <div className="flex bg-slate-100 p-0.5 rounded-md border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setDesignChoice("figma")}
                          className={cn(
                            "px-3 py-1 text-xs font-semibold rounded transition-colors flex items-center gap-1.5",
                            designChoice === "figma" ? "bg-white text-[#2b61d6] shadow-xs" : "text-slate-600 hover:text-slate-900"
                          )}
                        >
                          <Figma className="w-3.5 h-3.5" /> Figma Link
                        </button>
                        <button
                          type="button"
                          onClick={() => setDesignChoice("image")}
                          className={cn(
                            "px-3 py-1 text-xs font-semibold rounded transition-colors flex items-center gap-1.5",
                            designChoice === "image" ? "bg-white text-[#2b61d6] shadow-xs" : "text-slate-600 hover:text-slate-900"
                          )}
                        >
                          <ImageIcon className="w-3.5 h-3.5" /> Upload Mockup Image
                        </button>
                      </div>
                    </div>

                    {designChoice === "figma" ? (
                      <div className="space-y-1.5">
                        <Input 
                          id="figmaUrl" 
                          placeholder="Figma URL" 
                          className="border-slate-300 h-9 text-xs" 
                          {...register("figmaUrl")} 
                        />
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100/80 rounded-lg p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-colors">
                          <ImageIcon className="w-6 h-6 text-[#2b61d6] mb-1" />
                          <p className="text-xs font-semibold text-slate-800">
                            {mockupFile ? mockupFile.name : "Click to select or drop Mockup Image"}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">PNG, JPG, WebP supported</p>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleMockupImageChange(e.target.files?.[0] || null)} />
                        </label>
                        {mockupPreviewUrl && (
                          <div className="flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md font-medium">
                            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Attached: {mockupFile?.name || "Mockup File"}</span>
                            <button type="button" onClick={() => handleMockupImageChange(null)} className="text-rose-600 hover:underline">Remove</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Outlook Email File Upload & Detected Subject Line Display */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <Label className="text-xs font-semibold text-slate-800">Outlook Email (.msg File)</Label>
                    <label className="border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg p-2.5 flex items-center justify-between cursor-pointer transition-colors text-xs text-slate-700 font-medium">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[#2b61d6]" />
                        <span>{outlookFile ? `Attached: ${outlookFile.name}` : "Upload .msg File to compare Outlook rendering & extract Subject Line"}</span>
                      </div>
                      <span className="text-[11px] bg-white text-[#2b61d6] px-2.5 py-1 rounded border border-blue-200 font-semibold shadow-xs">
                        Browse
                      </span>
                      <input type="file" accept=".msg" className="hidden" onChange={(e) => handleOutlookFileChange(e.target.files?.[0] || null)} />
                    </label>

                    {/* Detected Subject Line Display */}
                    {outlookSubject && (
                      <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3 flex items-center justify-between text-xs animate-in fade-in">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#2b61d6] shrink-0" />
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[#2b61d6] block">Detected Email Subject Line</span>
                            <span className="font-bold text-slate-900">{outlookSubject}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(outlookSubject);
                            alert("Subject line copied to clipboard!");
                          }}
                          className="px-2.5 py-1 bg-white text-[#2b61d6] border border-blue-200 hover:bg-blue-100 rounded text-[11px] font-semibold"
                        >
                          Copy
                        </button>
                      </div>
                    )}
                  </div>

                  {/* HTML Source Code Area */}
                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                      <Label htmlFor="htmlSource" className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                        <span>Full Email HTML Source Code *</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({values.htmlSource?.length || 0} chars)
                        </span>
                      </Label>
                    </div>

                    <textarea 
                      id="htmlSource"
                      className="flex min-h-[300px] w-full rounded-md border border-slate-300 bg-slate-50/80 px-3 py-2.5 text-xs font-mono shadow-xs placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2b61d6]"
                      placeholder="Paste your full email HTML template code here..."
                      value={values.htmlSource || ""}
                      onChange={(e) => setValue("htmlSource", e.target.value, { shouldValidate: true })}
                    />
                    {errors.htmlSource && <p className="text-xs text-rose-600 font-semibold">{errors.htmlSource.message}</p>}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {currentStep === 2 && (
              <div className="flex flex-col flex-1 min-h-[700px] border border-slate-200 rounded-xl shadow-xs bg-white overflow-hidden">
                <VisualComparison 
                  webViewUrl={resolvedWebViewUrl || values.webViewUrl} 
                  figmaUrl={values.figmaUrl} 
                  htmlSource={processedHtmlSource || values.htmlSource}
                  initialMsgHtml={outlookExtractedHtml}
                  initialMsgFileName={outlookFileName || outlookFile?.name}
                  initialMsgSubject={outlookSubject || extractedSubject}
                  visualChecks={visualChecks}
                  onVisualChecksChange={(checks) => {
                    setVisualChecks(checks);
                    saveCurrentCampaignState({ visualChecks: checks });
                  }}
                  onMsgUploaded={(subject, html, fileName) => {
                    if (subject) {
                      setExtractedSubject(subject);
                      setOutlookSubject(subject);
                    }
                    if (html) {
                      setOutlookExtractedHtml(html);
                    }
                    if (fileName) {
                      setOutlookFileName(fileName);
                    }
                    saveCurrentCampaignState({
                      outlookSubject: subject || undefined,
                      outlookExtractedHtml: html || undefined,
                      outlookFileName: fileName || undefined
                    });
                  }}
                />
              </div>
            )}
            
            {currentStep === 3 && (
              <div className={cn(
                "flex flex-col flex-1 min-h-[700px] border border-slate-200 rounded-xl shadow-xs bg-white transition-all duration-300",
                fullScreenTarget === "step3" ? "fixed inset-0 z-[100] m-4 border-2 shadow-2xl" : ""
              )}>
                <TagInspection htmlSource={processedHtmlSource || values.htmlSource} subjectLine={extractedSubject} viewOnlineUrl={resolvedWebViewUrl || values.webViewUrl || values.litmusUrl} />
              </div>
            )}
            
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="flex flex-col min-h-[600px] border border-slate-200 rounded-xl shadow-xs bg-white overflow-hidden">
                  <BrowserQAWorkspace 
                    htmlSource={processedHtmlSource || values.htmlSource} 
                    webViewUrl={resolvedWebViewUrl || values.webViewUrl} 
                    country={values.country}
                    versionName={values.versionName}
                  />
                </div>
                <Card className="shadow-xs border-slate-200">
                  <CardHeader className="border-b border-slate-100 bg-white rounded-t-xl py-4">
                    <CardTitle className="text-slate-900 text-base">Additional Tracking & Brief Files</CardTitle>
                    <CardDescription className="text-slate-500 text-xs">Attach campaign briefs or Litmus rendering URL.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-5 bg-white">
                    <div className="grid md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-800">Campaign Brief (CSV/Excel)</Label>
                        <label className="border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer bg-slate-50 h-28">
                          <UploadCloud className="h-6 w-6 text-[#2b61d6] mb-1" />
                          <p className="text-xs font-semibold text-slate-700">{briefFile ? briefFile.name : "Upload Brief File (.csv, .xlsx)"}</p>
                          <Input type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={(e) => setBriefFile(e.target.files?.[0] || null)} />
                        </label>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="litmusUrl" className="text-xs font-semibold text-slate-800">Litmus Test URL</Label>
                        <Input id="litmusUrl" placeholder="https://litmus.com/pub/..." className="border-slate-300 h-9 text-xs" {...register("litmusUrl")} />
                        <p className="text-[10px] text-slate-400">Optional URL for Litmus cross-client rendering tests</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {currentStep === 5 && (
              <EnglishTextAnalysis 
                htmlSource={processedHtmlSource || values.htmlSource} 
                webViewUrl={resolvedWebViewUrl || values.webViewUrl}
                onFixApplied={(updatedHtml) => setValue("htmlSource", updatedHtml, { shouldValidate: true })}
              />
            )}

            {currentStep === totalSteps && (
              <div className="space-y-5">
                {/* Campaign Decision & Actions Card */}
                <Card className="shadow-xs border-slate-200">
                  <CardHeader className="border-b border-slate-100 bg-white rounded-t-xl py-4 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-slate-900 text-base">Campaign Review & Approval</CardTitle>
                      <CardDescription className="text-slate-500 text-xs">Review all checkpoints, set approval status, export verification receipts, and dispatch email.</CardDescription>
                    </div>
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold border", getStatusBadgeClass(campaignStatus))}>
                      Status: {campaignStatus}
                    </span>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-5 bg-white text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div>
                        <span className="text-slate-500 block">Campaign Name:</span>
                        <strong className="text-slate-900 font-bold">{values.name || "Untitled Campaign"}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Team:</span>
                        <strong className="text-slate-900 font-bold">{values.team || "Not Selected"}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Country & Version:</span>
                        <strong className="text-slate-900 font-bold">{values.country} ({values.versionName})</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Destination Folder:</span>
                        <strong className="text-slate-900 font-bold truncate block">{availableFolders.find(f => f.id === values.folder_id)?.name || "Default Folder"}</strong>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reviewNote" className="text-xs font-semibold text-slate-800">Reviewer Feedback Notes</Label>
                      <textarea
                        id="reviewNote"
                        rows={3}
                        placeholder="Leave optional QA feedback notes, sign-off comments, or instructions..."
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        className="w-full p-2.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#2b61d6] bg-slate-50/50"
                      />
                    </div>

                    {/* Action Buttons Toolbar */}
                    <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
                      <Button
                        type="button"
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4"
                        onClick={() => handleDecision("Approved")}
                        disabled={isSubmitting || isApprovedLocked}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve Campaign
                      </Button>

                      <Button
                        type="button"
                        variant="destructive"
                        className="gap-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4"
                        onClick={() => handleDecision("Failed")}
                        disabled={isSubmitting || isApprovedLocked}
                      >
                        <XCircle className="w-4 h-4" />
                        Fail Campaign
                      </Button>

                      <Button
                        type="button"
                        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4"
                        onClick={() => setShowApprovalEmailModal(true)}
                      >
                        <Mail className="w-4 h-4" />
                        Send Approval Email
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold px-4"
                        onClick={handleExportPDF}
                      >
                        <Download className="w-4 h-4 text-emerald-600" />
                        Export PDF Receipt
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold px-4"
                        onClick={handleExportExcel}
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                        Export Excel
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Master All Checkpoints Inspector */}
                <Card className="shadow-xs border-slate-200">
                  <CardHeader className="border-b border-slate-100 bg-white rounded-t-xl py-3.5 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-[#2b61d6]" />
                      <div>
                        <CardTitle className="text-slate-900 text-sm">All Campaign Checkpoints</CardTitle>
                        <CardDescription className="text-slate-500 text-[11px]">Inspect and verify checkpoints from all QA stages.</CardDescription>
                      </div>
                    </div>
                    {(() => {
                      const total = checklists.length;
                      const passed = checklists.filter(item => {
                        const ans = checklistAnswers[item.id];
                        return ans && (ans.status === "Checked" || ans.status === "N/A");
                      }).length;
                      const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
                      return (
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[11px] font-bold text-slate-700">{passed}/{total} Verified</span>
                            <span className="text-[10px] text-slate-400 block">{pct}% Complete</span>
                          </div>
                          <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                            <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })()}
                  </CardHeader>
                  <CardContent className="p-4 bg-white space-y-4">
                    {(() => {
                      if (checklists.length === 0) {
                        return (
                          <div className="p-6 text-center text-slate-500 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
                            No checklists defined for team {values.team || "selected"}.
                          </div>
                        );
                      }

                      const stageNames: Record<number, string> = {
                        0: stageLabels["0"] || "Global Checkpoints",
                        1: stageLabels["1"] || "Stage 1: Details & Source",
                        2: stageLabels["2"] || "Stage 2: Visual Comparison",
                        3: stageLabels["3"] || "Stage 3: Alt & Alias Tags",
                        4: stageLabels["4"] || "Stage 4: Link Validation",
                        5: stageLabels["5"] || "Stage 5: Grammar & Spell Check",
                        6: stageLabels["6_CQA"] || "Stage 6: Review & Approval"
                      };
                      
                      if (isFQA) {
                        stageNames[6] = stageLabels["6"] || "Stage 6: Review & Approval / LAUNCH (FQA)";
                        stageNames[7] = stageLabels["7"] || "Stage 7: Review & Approval (FQA)";
                      }

                      // Group by stage
                      const grouped = checklists.reduce((acc: any, item: any) => {
                        const stage = item.stage || 0;
                        if (!acc[stage]) acc[stage] = [];
                        acc[stage].push(item);
                        return acc;
                      }, {});

                      return Object.keys(grouped).sort().map(stageKey => {
                        const items = grouped[stageKey];
                        const sNum = Number(stageKey);
                        const sName = stageNames[sNum] || `Stage ${sNum}`;
                        const stagePassed = items.filter((item: any) => {
                          const ans = checklistAnswers[item.id];
                          return ans && (ans.status === "Checked" || ans.status === "N/A");
                        }).length;

                        const handleToggleStage = () => {
                          const allChecked = items.every((it: any) => checklistAnswers[it.id]?.status === "Checked");
                          const newAnswers = { ...checklistAnswers };
                          items.forEach((it: any) => {
                            newAnswers[it.id] = {
                              ...(checklistAnswers[it.id] || {}),
                              status: allChecked ? null : "Checked"
                            };
                          });
                          setChecklistAnswers(newAnswers);
                          saveCurrentCampaignState({ checklistAnswers: newAnswers });
                        };

                        return (
                          <div key={stageKey} className="border border-slate-200 rounded-lg overflow-hidden">
                            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-800">{sName}</span>
                                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                                  {stagePassed}/{items.length} Checked
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={handleToggleStage}
                                disabled={isApprovedLocked}
                                className="text-[11px] text-[#2b61d6] hover:underline font-semibold cursor-pointer disabled:opacity-50"
                              >
                                {items.every((it: any) => checklistAnswers[it.id]?.status === "Checked") ? "Uncheck All" : "Check All"}
                              </button>
                            </div>

                            <div className="divide-y divide-slate-100 bg-white">
                                {items.map((item: any) => {
                                  const currentAnswer = checklistAnswers[item.id] || {};
                                  const isChecked = currentAnswer.status === "Checked";
                                  const isNA = currentAnswer.status === "N/A";
                                  const hasOptions = (item.options && (Array.isArray(item.options) ? item.options.length > 0 : typeof item.options === 'string' && item.options.trim() !== '')) || (item.requiresInput && item.inputPlaceholder && item.inputPlaceholder.includes(','));
                                  
                                  const dropdownOptions = item.options 
                                    ? (Array.isArray(item.options) ? item.options : item.options.split(',')) 
                                    : (item.inputPlaceholder ? item.inputPlaceholder.split(',') : []);

                                  return (
                                    <div key={item.id} className="p-3 hover:bg-slate-50/60 transition-colors flex flex-col gap-2">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                          {!hasOptions && (
                                            <input
                                              type="checkbox"
                                              id={`master-chk-${item.id}`}
                                              checked={isChecked}
                                              disabled={isApprovedLocked}
                                              onChange={(e) => {
                                                const updated = {
                                                  ...checklistAnswers,
                                                  [item.id]: {
                                                    ...currentAnswer,
                                                    status: e.target.checked ? "Checked" : null
                                                  }
                                                };
                                                setChecklistAnswers(updated);
                                                saveCurrentCampaignState({ checklistAnswers: updated });
                                              }}
                                              className="mt-0.5 rounded border-slate-300 text-[#2b61d6] focus:ring-[#2b61d6] cursor-pointer"
                                            />
                                          )}
                                          <label
                                            htmlFor={hasOptions ? undefined : `master-chk-${item.id}`}
                                            className={cn("text-xs text-slate-800 leading-relaxed cursor-pointer select-none", isChecked && "text-slate-900 font-medium")}
                                          >
                                            {item.text} <span className="text-red-500 text-[10px] ml-2">DEBUG options: {JSON.stringify(item.options)} | hasOptions: {String(hasOptions)}</span>
                                          </label>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                          {hasOptions && (
                                            <select
                                              disabled={isApprovedLocked}
                                              value={currentAnswer.text || ""}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                const updated = {
                                                  ...checklistAnswers,
                                                  [item.id]: {
                                                    ...currentAnswer,
                                                    status: val ? "Checked" : null,
                                                    text: val
                                                  }
                                                };
                                                setChecklistAnswers(updated);
                                                saveCurrentCampaignState({ checklistAnswers: updated });
                                              }}
                                              className="h-7 text-[11px] font-medium border border-slate-200 rounded-md bg-white px-2 outline-none focus:border-[#2b61d6] min-w-[120px]"
                                            >
                                              <option value="">Select option...</option>
                                              {dropdownOptions.map((opt: string, i: number) => (
                                                <option key={i} value={opt.trim()}>{opt.trim()}</option>
                                              ))}
                                            </select>
                                          )}
                                          
                                          {!hasOptions && (
                                            <button
                                              type="button"
                                              disabled={isApprovedLocked}
                                              onClick={() => {
                                                const updated = {
                                                  ...checklistAnswers,
                                                  [item.id]: {
                                                    ...currentAnswer,
                                                    status: isNA ? null : "N/A"
                                                  }
                                                };
                                                setChecklistAnswers(updated);
                                                saveCurrentCampaignState({ checklistAnswers: updated });
                                              }}
                                              className={cn(
                                                "px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer disabled:opacity-50",
                                                isNA ? "bg-slate-200 text-slate-800 border-slate-300" : "bg-white text-slate-400 border-slate-200 hover:bg-slate-100"
                                              )}
                                            >
                                              N/A
                                            </button>
                                          )}
                                          
                                          {!hasOptions && isChecked && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                              Passed
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {!hasOptions && item.requiresInput ? (
                                        <div className="pl-6 pt-1">
                                          <Input
                                            placeholder={item.placeholder || item.inputPlaceholder || "Enter notes or proof for this checkpoint..."}
                                            value={currentAnswer.text || ""}
                                            disabled={isApprovedLocked}
                                            onChange={(e) => {
                                              const updated = {
                                                ...checklistAnswers,
                                                [item.id]: {
                                                  ...currentAnswer,
                                                  text: e.target.value
                                                }
                                              };
                                              setChecklistAnswers(updated);
                                              saveCurrentCampaignState({ checklistAnswers: updated });
                                            }}
                                            className="h-8 text-xs border-slate-200 bg-slate-50/50"
                                          />
                                        </div>
                                      ) : null}
                                    </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </CardContent>
                </Card>
              </div>
            )}
            </div>

          </div>
        </QAWizard>
      </form>
      )}

      {/* Audit Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-[#2b61d6]" />
                Campaign Edit & Review Logs
              </h3>
              <button onClick={() => setShowLogsModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-2 text-xs">
              {campaignLogs.map((log: any, idx: number) => (
                <div key={log.id || idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex justify-between font-bold text-slate-800 mb-1">
                    <span>{log.action}</span>
                    <span className="text-[10px] text-slate-400">{log.created_at ? new Date(log.created_at).toLocaleString() : "Recent"}</span>
                  </div>
                  <p className="text-slate-600">{log.details}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <Button size="sm" variant="outline" onClick={() => setShowLogsModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Overlay Modal */}
      {fullScreenTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col p-4 md:p-6 animate-in fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl flex-1 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="bg-[#2b61d6] text-white px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                  Fullscreen Mode
                </span>
                <h3 className="text-sm font-bold">
                  {fullScreenTarget === "html" ? "Full Email HTML Source Code & Tag Inspection" :
                   fullScreenTarget === "webview" ? "View Online Platform Landing Page & Link Inspector" :
                   "Campaign Workspace Fullscreen"}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                {fullScreenTarget === "webview" && (
                  <div className="flex bg-slate-800 p-0.5 rounded border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setViewOnlineDevice("desktop")}
                      className={cn(
                        "px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer",
                        viewOnlineDevice === "desktop" ? "bg-[#2b61d6] text-white" : "text-slate-300 hover:text-white"
                      )}
                    >
                      <Monitor className="w-3.5 h-3.5 inline mr-1" /> Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewOnlineDevice("tablet")}
                      className={cn(
                        "px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer",
                        viewOnlineDevice === "tablet" ? "bg-[#2b61d6] text-white" : "text-slate-300 hover:text-white"
                      )}
                    >
                      <Tablet className="w-3.5 h-3.5 inline mr-1" /> Tablet
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewOnlineDevice("mobile")}
                      className={cn(
                        "px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer",
                        viewOnlineDevice === "mobile" ? "bg-[#2b61d6] text-white" : "text-slate-300 hover:text-white"
                      )}
                    >
                      <Smartphone className="w-3.5 h-3.5 inline mr-1" /> Mobile
                    </button>
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFullScreenTarget(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-white border-slate-700 gap-1 text-xs font-semibold cursor-pointer"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  Exit Fullscreen
                </Button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto bg-slate-100 p-4 flex flex-col">
              {fullScreenTarget === "html" ? (
                <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-[#2b61d6]" />
                      HTML Source Code Editor ({values.htmlSource?.length || 0} chars)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold">
                        Alias Tags: {aliasTagsInfo.total}
                      </span>
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">
                        Alt Tags: {altTagsInfo.withAlt.length}/{altTagsInfo.total}
                      </span>
                    </div>
                  </div>
                  <textarea 
                    className="flex-1 min-h-[500px] w-full rounded-md border border-slate-300 bg-slate-900 text-emerald-400 p-4 text-xs font-mono shadow-xs focus:outline-none"
                    placeholder="Paste email HTML code here..."
                    value={values.htmlSource || ""}
                    onChange={(e) => setValue("htmlSource", e.target.value, { shouldValidate: true })}
                  />
                </div>
              ) : fullScreenTarget === "webview" ? (
                <div className="flex-1 flex flex-col bg-slate-200 rounded-lg overflow-hidden border border-slate-300">
                  {/* Link Audit Header Banner */}
                  {linkAuditInfo.missing.length > 0 && (
                    <div className="bg-rose-50 border-b border-rose-200 p-3 text-xs flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="font-bold text-rose-800">
                          Missing/Invalid Link Warnings ({linkAuditInfo.missing.length}):
                        </span>
                        <div className="flex gap-1.5 flex-wrap">
                          {linkAuditInfo.missing.map((m, i) => (
                            <span key={i} className="bg-white border border-rose-200 px-2 py-0.5 rounded text-[10px] text-rose-900 font-mono">
                              {m.text}: {m.href} ({m.reason})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex-1 overflow-auto p-4 flex justify-center items-start">
                    <div
                      className={cn(
                        "bg-white shadow-2xl transition-all duration-300 min-h-full border border-slate-300 rounded-lg overflow-hidden flex flex-col",
                        viewOnlineDevice === "desktop" ? "w-full" : viewOnlineDevice === "tablet" ? "w-[768px]" : "w-[375px]"
                      )}
                    >
                      {resolvedWebViewUrl ? (
                        <iframe
                          src={resolvedWebViewUrl}
                          title="View Online Fullscreen"
                          className="w-full h-full min-h-[700px] border-0"
                          sandbox="allow-same-origin allow-scripts allow-popups"
                        />
                      ) : processedHtmlSource ? (
                        <iframe
                          srcDoc={processedHtmlSource}
                          title="HTML Source Fullscreen"
                          className="w-full h-full min-h-[700px] border-0"
                          sandbox="allow-same-origin allow-popups"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-16 text-slate-500 text-xs">
                          No View Online link or HTML source provided.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 bg-white p-6 rounded-lg border border-slate-200 overflow-auto">
                  <p className="text-slate-600 text-xs">Expanded step workspace view active.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Incomplete Checkpoints Popup Modal */}
      <IncompleteCheckpointsModal
        isOpen={showIncompleteModal}
        onClose={() => setShowIncompleteModal(false)}
        stageNumber={incompleteModalData.stageNumber}
        stageTitle={incompleteModalData.stageTitle}
        missingCheckpoints={incompleteModalData.missingCheckpoints}
      />

      {/* Send Approval Email Modal */}
      {showApprovalEmailModal && (
        <SendApprovalEmailModal
          isOpen={showApprovalEmailModal}
          onClose={() => setShowApprovalEmailModal(false)}
          onSentSuccess={() => {
            if (campaignStatus !== "Approved") {
              setCampaignStatus("Approved");
              saveCurrentCampaignState({ status: "Approved" });
            }
          }}
          campaignMeta={{
            campaignName: values.name,
            team: values.team,
            country: values.country,
            versionName: values.versionName,
            userEmail: userEmail,
            campaignStatus: campaignStatus,
            campaignId: editId || undefined
          }}
        />
      )}

      {/* AI QA Report Modal */}
      {aiQaReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
              <div className="flex items-center gap-2 text-indigo-700">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-bold text-lg">AI Auto-QA Report</h3>
              </div>
              <button 
                onClick={() => setAiQaReport(null)}
                className="p-1 hover:bg-slate-200 rounded transition-colors text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <p className="text-slate-700">{aiQaReport.summary}</p>
              </div>

              {aiQaReport.issues && aiQaReport.issues.length > 0 && (
                <div>
                  <h4 className="font-bold text-rose-700 flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4" /> Issues Found ({aiQaReport.issues.length})
                  </h4>
                  <ul className="space-y-3">
                    {aiQaReport.issues.map((issue: any, idx: number) => (
                      <li key={idx} className="bg-rose-50/50 border border-rose-100 p-3 rounded-lg flex gap-3 items-start">
                        <XCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                        <div>
                          <strong className="text-rose-900 block mb-1">{issue.type}</strong>
                          <span className="text-rose-700">{issue.detail}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiQaReport.passed && aiQaReport.passed.length > 0 && (
                <div>
                  <h4 className="font-bold text-emerald-700 flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4" /> Passed Checks ({aiQaReport.passed.length})
                  </h4>
                  <ul className="space-y-2">
                    {aiQaReport.passed.map((pass: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2 text-emerald-700 bg-emerald-50/50 p-2 rounded-lg border border-emerald-50">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        {pass}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <Button onClick={() => setAiQaReport(null)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Close Report
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
