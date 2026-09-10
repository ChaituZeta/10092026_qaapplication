import React, { useState, useEffect } from "react";
import * as Sentry from '@sentry/react';
import { Link, useNavigate } from "react-router-dom";
import { getAllCampaigns, CampaignRecord, isSupabaseConfigured, fetchFolders, FolderItem, createFolder } from "@/lib/campaign-storage";
import { 
  PlusCircle, 
  Mail, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Globe, 
  FileText, 
  MoreVertical, 
  ArrowRight,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter,
  X,
  Users,
  User,
  Search,
  RotateCcw,
  Layers,
  Activity,
  Folder,
  FolderOpen,
  FolderPlus
} from "lucide-react";
import { cn } from "@/lib/utils";

import { supabase } from "@/lib/supabase";
import { getCampaignCheckpointProgress } from "@/lib/checklist-utils";

interface DashboardProps {
  userEmail?: string;
  userRole?: string;
}

interface AppUser {
  id?: string;
  name: string;
  email: string;
  role?: string;
  team?: string;
}

interface UserStatItem {
  key: string;
  name: string;
  email: string;
  role: string;
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  failed: number;
  percent: number;
  avatarBg: string;
  badgeBg: string;
  barBg: string;
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-2xs relative overflow-hidden">
            <div className="flex justify-between items-start mb-3">
              <div className="h-4 w-24 bg-slate-200 rounded-md animate-pulse"></div>
              <div className="w-9 h-9 rounded-xl bg-slate-100 animate-pulse"></div>
            </div>
            <div className="h-8 w-16 bg-slate-200 rounded-md animate-pulse mt-2"></div>
            <div className="h-3 w-32 bg-slate-100 rounded-md animate-pulse mt-4"></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1 Skeleton */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs flex flex-col justify-between min-h-[320px]">
          <div className="h-5 w-36 bg-slate-200 rounded-md animate-pulse mb-6"></div>
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-8">
            <div className="w-36 h-36 rounded-full bg-slate-100 animate-pulse shrink-0"></div>
            <div className="flex-1 space-y-4 w-full">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200 animate-pulse"></div>
                    <div className="h-4 w-20 bg-slate-200 rounded-md animate-pulse"></div>
                  </div>
                  <div className="h-4 w-12 bg-slate-200 rounded-md animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2 Skeleton */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs flex flex-col justify-between min-h-[320px]">
          <div className="flex justify-between items-center mb-6">
            <div className="h-5 w-40 bg-slate-200 rounded-md animate-pulse"></div>
            <div className="h-4 w-16 bg-slate-100 rounded-md animate-pulse"></div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-20 bg-slate-200 rounded-md animate-pulse"></div>
                  <div className="h-4 w-8 bg-slate-200 rounded-md animate-pulse"></div>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3 Skeleton: User Wise */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs flex flex-col justify-between min-h-[320px]">
          <div className="flex justify-between items-center mb-6">
            <div className="h-5 w-36 bg-slate-200 rounded-md animate-pulse"></div>
            <div className="h-4 w-16 bg-slate-100 rounded-md animate-pulse"></div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-xl space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse"></div>
                  <div className="space-y-1 flex-1">
                    <div className="h-4 w-28 bg-slate-200 rounded-md animate-pulse"></div>
                    <div className="h-3 w-20 bg-slate-100 rounded-md animate-pulse"></div>
                  </div>
                  <div className="h-5 w-12 bg-slate-200 rounded-md animate-pulse"></div>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden flex flex-col relative">
        <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
          <div className="h-5 w-32 bg-slate-200 rounded-md animate-pulse"></div>
          <div className="flex gap-2">
            <div className="h-8 w-24 bg-slate-100 rounded-lg animate-pulse"></div>
            <div className="h-8 w-24 bg-slate-100 rounded-lg animate-pulse"></div>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div className="flex flex-col gap-2 w-1/3">
                <div className="h-4 w-48 bg-slate-200 rounded-md animate-pulse"></div>
                <div className="h-3 w-32 bg-slate-100 rounded-md animate-pulse"></div>
              </div>
              <div className="h-6 w-24 bg-slate-100 rounded-full animate-pulse"></div>
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-slate-200 animate-pulse"></div>
                <div className="w-6 h-6 rounded-full bg-slate-200 animate-pulse"></div>
                <div className="w-6 h-6 rounded-full bg-slate-200 animate-pulse"></div>
              </div>
              <div className="h-4 w-20 bg-slate-200 rounded-md animate-pulse"></div>
              <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function Dashboard({ userEmail, userRole }: DashboardProps) {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [isStartFolderModalOpen, setIsStartFolderModalOpen] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<FolderItem[]>([]);
  const [isCreatingFolderInModal, setIsCreatingFolderInModal] = useState(false);
  const [newFolderNameInModal, setNewFolderNameInModal] = useState("");

  const handleCreateFolderAndStart = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newFolderNameInModal.trim();
    if (!trimmed) return;
    const created = createFolder(trimmed);
    setAvailableFolders(prev => [...prev, created]);
    setNewFolderNameInModal("");
    setIsCreatingFolderInModal(false);
    setIsStartFolderModalOpen(false);
    navigate(`/campaigns/new?folder_id=${created.id}`);
  };

  useEffect(() => {
    fetchFolders().then((list) => {
      if (list && list.length > 0) {
        setAvailableFolders(list);
      } else {
        setAvailableFolders([
          { id: "2026", name: "2026 Campaigns", parentId: null, year: "2026", created_at: new Date().toISOString() },
          { id: "2025", name: "2025 Campaigns", parentId: null, year: "2025", created_at: new Date().toISOString() }
        ]);
      }
    });
  }, []);

  // Fetch registered app users
  useEffect(() => {
    async function loadUsers() {
      try {
        if (isSupabaseConfigured()) {
          const { data, error } = await supabase
            .from('app_users')
            .select('*')
            .order('created_at', { ascending: false });
          if (!error && Array.isArray(data) && data.length > 0) {
            setAppUsers(data);
            return;
          }
        }
        const res = await fetch('/api/app-users');
        if (res.ok) {
          const json = await res.json();
          if (json.users && Array.isArray(json.users)) {
            setAppUsers(json.users);
          }
        }
      } catch (err) {
        console.warn('[Dashboard] Error fetching app users:', err);
      }
    }
    loadUsers();
  }, []);

  useEffect(() => {
    const fetchUserName = async () => {
      if (userEmail && import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co') {
        const { data } = await supabase.from('app_users').select('name').eq('email', userEmail).single();
        if (data && data.name) {
          setUserName(data.name.split(' ')[0]);
        }
      }
    };
    fetchUserName();
  }, [userEmail]);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getAllCampaigns();
        const active = data.filter(c => !c.is_deleted);
        setCampaigns(active);
      } catch (err) {
        console.error("[Dashboard] Error loading campaign data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();

    const handleSynced = () => {
      loadData();
    };

    window.addEventListener("database-synced", handleSynced);
    window.addEventListener("focus", loadData);
    window.addEventListener("storage", handleSynced);
    const pollInterval = setInterval(loadData, 10000);

    let realtimeChannel: any = null;
    if (isSupabaseConfigured()) {
      try {
        realtimeChannel = supabase
          .channel("dashboard-realtime-changes")
          .on("postgres_changes", { event: "*", schema: "public", table: "campaigns" }, () => {
            console.log("[Dashboard] Supabase realtime change detected, refreshing dashboard...");
            loadData();
          })
          .subscribe();
      } catch (err) {
        console.warn("[Dashboard] Could not subscribe to Supabase Realtime:", err);
      }
    }

    return () => {
      window.removeEventListener("database-synced", handleSynced);
      window.removeEventListener("focus", loadData);
      window.removeEventListener("storage", handleSynced);
      clearInterval(pollInterval);
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, []);

  // Time-based greeting logic
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const getDisplayName = () => {
    if (userName) return userName;
    if (!userEmail) return "User";
    const namePart = userEmail.split("@")[0];
    const firstPart = namePart.split(/[._-]/)[0];
    return firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
  };

  // Helper to extract initials
  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Metrics calculation
  const total = campaigns.length;
  const pending = campaigns.filter(c => c.status === "QA Pending" || c.status === "Review Pending" || c.status === "Pending").length;
  const completed = campaigns.filter(c => c.status === "Completed" || c.status === "Approved").length;
  const failed = campaigns.filter(c => c.status === "Failed").length;
  const inProgress = campaigns.filter(c => c.status === "In Progress" || c.status === "Draft" || c.status === "Automating").length;

  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Status breakdown for Donut Chart
  const pendingPercent = total > 0 ? Math.round((pending / total) * 100) : 0;
  const completedPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const failedPercent = total > 0 ? Math.round((failed / total) * 100) : 0;
  const inProgressPercent = total > 0 ? Math.round((inProgress / total) * 100) : 0;

  // Helper: map campaign to user identifier key
  const getUserKeyForCampaign = (c: CampaignRecord): string => {
    const createdBy = (c.createdBy || "").trim().toLowerCase();
    const userEmailVal = (c.userEmail || "").trim().toLowerCase();

    // 1. Direct match with registered appUsers by email
    const matchedByEmail = appUsers.find(u => 
      u.email.toLowerCase() === userEmailVal || u.email.toLowerCase() === createdBy
    );
    if (matchedByEmail) return matchedByEmail.email.toLowerCase();

    // 2. Direct match with registered appUsers by name
    const matchedByName = appUsers.find(u => 
      u.name.toLowerCase() === createdBy
    );
    if (matchedByName) return matchedByName.email.toLowerCase();

    // 3. Fallback to creator or email
    if (createdBy.includes("@")) return createdBy;
    if (userEmailVal) return userEmailVal;
    return createdBy || "unknown";
  };

  // Helper: resolve clean human display name for campaign creator
  const resolveUserDisplayName = (c: CampaignRecord): { name: string; email: string } => {
    const key = getUserKeyForCampaign(c);
    const matched = appUsers.find(u => u.email.toLowerCase() === key.toLowerCase());
    if (matched) {
      return { name: matched.name, email: matched.email };
    }
    if (c.createdBy && !c.createdBy.includes("@")) {
      return { name: c.createdBy, email: c.userEmail || "" };
    }
    const emailToUse = c.userEmail || c.createdBy || key;
    const namePart = emailToUse.split("@")[0] || "User";
    const readable = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    return { name: readable, email: emailToUse };
  };

  // User-wise Campaign Stats aggregation
  const AVATAR_COLOR_PALETTES = [
    { avatarBg: "bg-blue-600 text-white", badgeBg: "bg-blue-50 text-blue-700 border-blue-200", barBg: "bg-blue-600" },
    { avatarBg: "bg-purple-600 text-white", badgeBg: "bg-purple-50 text-purple-700 border-purple-200", barBg: "bg-purple-600" },
    { avatarBg: "bg-emerald-600 text-white", badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200", barBg: "bg-emerald-600" },
    { avatarBg: "bg-amber-600 text-white", badgeBg: "bg-amber-50 text-amber-700 border-amber-200", barBg: "bg-amber-500" },
    { avatarBg: "bg-rose-600 text-white", badgeBg: "bg-rose-50 text-rose-700 border-rose-200", barBg: "bg-rose-500" },
    { avatarBg: "bg-indigo-600 text-white", badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200", barBg: "bg-indigo-600" },
  ];

  const userStatsMap: Record<string, {
    name: string;
    email: string;
    role: string;
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    failed: number;
  }> = {};

  // Pre-fill with registered app users
  appUsers.forEach(u => {
    const normEmail = (u.email || "").toLowerCase().trim();
    if (normEmail) {
      userStatsMap[normEmail] = {
        name: u.name || normEmail.split("@")[0],
        email: normEmail,
        role: u.role || "user",
        total: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
        failed: 0,
      };
    }
  });

  // Tally campaigns
  campaigns.forEach(c => {
    const key = getUserKeyForCampaign(c);
    if (!userStatsMap[key]) {
      const isEmail = key.includes("@");
      userStatsMap[key] = {
        name: isEmail ? key.split("@")[0] : (c.createdBy || key),
        email: isEmail ? key : (c.userEmail || ""),
        role: "user",
        total: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
        failed: 0,
      };
    }

    userStatsMap[key].total += 1;
    const s = c.status;
    if (s === "Completed" || s === "Approved") {
      userStatsMap[key].completed += 1;
    } else if (s === "QA Pending" || s === "Review Pending" || s === "Pending") {
      userStatsMap[key].pending += 1;
    } else if (s === "Failed") {
      userStatsMap[key].failed += 1;
    } else {
      userStatsMap[key].inProgress += 1;
    }
  });

  const userStatsList: UserStatItem[] = Object.entries(userStatsMap)
    .filter(([_, data]) => data.total > 0 || appUsers.some(u => u.email.toLowerCase() === data.email.toLowerCase()))
    .map(([key, data], idx) => {
      const palette = AVATAR_COLOR_PALETTES[idx % AVATAR_COLOR_PALETTES.length];
      return {
        key,
        name: data.name,
        email: data.email,
        role: data.role,
        total: data.total,
        completed: data.completed,
        inProgress: data.inProgress,
        pending: data.pending,
        failed: data.failed,
        percent: total > 0 ? Math.round((data.total / total) * 100) : 0,
        avatarBg: palette.avatarBg,
        badgeBg: palette.badgeBg,
        barBg: palette.barBg,
      };
    })
    .sort((a, b) => b.total - a.total);

  // Country metrics
  const countryCounts: Record<string, number> = {};
  campaigns.forEach(c => {
    const code = (c.country || "IN").toUpperCase();
    countryCounts[code] = (countryCounts[code] || 0) + 1;
  });

  const countryConfig: { code: string; label: string; color: string; barColor: string }[] = [
    { code: "IN", label: "India", color: "text-blue-600", barColor: "bg-blue-600" },
    { code: "AU", label: "Australia", color: "text-purple-600", barColor: "bg-purple-600" },
    { code: "NZ", label: "New Zealand", color: "text-emerald-600", barColor: "bg-emerald-600" },
    { code: "SG", label: "Singapore", color: "text-amber-500", barColor: "bg-amber-500" },
    { code: "MY", label: "Malaysia", color: "text-violet-500", barColor: "bg-violet-500" },
    { code: "OTHERS", label: "Others", color: "text-slate-500", barColor: "bg-slate-400" },
  ];

  const knownCodes = ["IN", "AU", "NZ", "SG", "MY"];
  const othersCount = Object.keys(countryCounts)
    .filter(k => !knownCodes.includes(k))
    .reduce((acc, k) => acc + countryCounts[k], 0);

  const getCountryCount = (code: string) => {
    if (code === "OTHERS") return othersCount;
    return countryCounts[code] || 0;
  };

  const maxCountryCount = Math.max(1, ...countryConfig.map(c => getCountryCount(c.code)));

  // Filter and sort recent campaigns
  const filteredCampaigns = campaigns
    .filter(c => {
      // Country Filter
      if (selectedCountry !== "all" && c.country.toUpperCase() !== selectedCountry.toUpperCase()) {
        return false;
      }
      // User Filter
      if (selectedUser !== "all") {
        const userKey = getUserKeyForCampaign(c);
        if (userKey.toLowerCase() !== selectedUser.toLowerCase()) {
          const directMatch =
            (c.userEmail && c.userEmail.toLowerCase() === selectedUser.toLowerCase()) ||
            (c.createdBy && c.createdBy.toLowerCase() === selectedUser.toLowerCase());
          if (!directMatch) return false;
        }
      }
      // Timeframe Filter
      if (selectedTimeframe !== "all") {
        const days = parseInt(selectedTimeframe, 10);
        const createdTime = new Date(c.updated_at || c.created_at || Date.now()).getTime();
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        if (createdTime < cutoff) return false;
      }
      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (c.name || "").toLowerCase().includes(q);
        const matchesCountry = (c.country || "").toLowerCase().includes(q);
        const matchesCreator = (c.createdBy || "").toLowerCase().includes(q) || (c.userEmail || "").toLowerCase().includes(q);
        if (!matchesName && !matchesCountry && !matchesCreator) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const tA = new Date(a.updated_at || a.created_at || 0).getTime();
      const tB = new Date(b.updated_at || b.created_at || 0).getTime();
      return tB - tA;
    });

  const formatDate = (isoString?: string) => {
    if (!isoString) return "Recent";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Recent";
    const dateStr = date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    return `${dateStr} ${timeStr}`;
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return "Recent";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Recent";
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
      case "Approved":
        return {
          label: "Completed",
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          progress: 100,
          progressColor: "bg-emerald-500"
        };
      case "QA Pending":
      case "Review Pending":
        return {
          label: "QA Pending",
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          progress: 0,
          progressColor: "bg-slate-200"
        };
      case "In Progress":
      case "Automating":
        return {
          label: "In Progress",
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          progress: 45,
          progressColor: "bg-amber-500"
        };
      case "Failed":
        return {
          label: "Failed",
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          progress: 100,
          progressColor: "bg-rose-500"
        };
      case "Draft":
        return {
          label: "Draft",
          bg: "bg-slate-100 text-slate-700 border-slate-200",
          progress: 0,
          progressColor: "bg-slate-300"
        };
      default:
        return {
          label: status || "Draft",
          bg: "bg-slate-100 text-slate-700 border-slate-200",
          progress: 0,
          progressColor: "bg-slate-300"
        };
    }
  };

  const hasActiveFilters = selectedCountry !== "all" || selectedUser !== "all" || selectedTimeframe !== "all" || searchQuery.trim().length > 0;

  const resetAllFilters = () => {
    setSelectedCountry("all");
    setSelectedUser("all");
    setSelectedTimeframe("all");
    setSearchQuery("");
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/70">
      {/* Top Header Bar */}
      <header id="dashboard-header" className="h-16 sm:h-20 bg-white border-b border-slate-200 px-3 sm:px-5 lg:px-6 flex items-center justify-between shrink-0 shadow-2xs sticky top-0 z-10">
        <div>
          <h2 id="dashboard-greeting-title" className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            {getGreeting()}, {getDisplayName()}
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Welcome to HP QA Platform • APJ Operations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="dashboard-new-campaign-button"
            onClick={() => setIsStartFolderModalOpen(true)}
            className="px-4 py-2 bg-[#2b61d6] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            New Campaign
          </button>
        </div>
      </header>

      {/* Main Container - Full Width with minimal responsive left & right spacing */}
      <div className="w-full px-3 sm:px-4 md:px-6 py-5 sm:py-6 space-y-6 flex-1 min-w-0">
        {isLoading ? <DashboardSkeleton /> : (
          <>
            {/* Top 4 Stat Cards */}
            <div id="dashboard-stat-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Total Campaigns */}
              <div id="stat-card-total-campaigns" className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold text-slate-500">Total Campaigns</span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-[#2b61d6] shadow-2xs">
                    <Mail className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{total}</span>
                  <svg className="w-16 h-8 text-blue-500" viewBox="0 0 60 25" fill="none">
                    <path d="M2 20 L 15 14 L 30 18 L 45 8 L 58 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-[11px] font-semibold text-emerald-600 mt-2 flex items-center gap-1">
                  <span>↑ 18%</span>
                  <span className="text-slate-400 font-normal">from last month</span>
                </p>
              </div>

              {/* Pending QA */}
              <div id="stat-card-pending-qa" className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold text-slate-500">Pending QA</span>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-2xs">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{pending}</span>
                  <svg className="w-16 h-8 text-amber-500" viewBox="0 0 60 25" fill="none">
                    <path d="M2 18 L 18 18 L 32 10 L 48 14 L 58 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-[11px] font-bold text-amber-600 mt-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  High Priority
                </p>
              </div>

              {/* Completed QA */}
              <div id="stat-card-completed-qa" className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold text-slate-500">Completed QA</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{completed}</span>
                  <svg className="w-16 h-8 text-emerald-500" viewBox="0 0 60 25" fill="none">
                    <path d="M2 20 L 15 15 L 28 22 L 42 10 L 58 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-[11px] font-semibold text-emerald-600 mt-2">
                  {successRate}% <span className="text-slate-400 font-normal">Success rate</span>
                </p>
              </div>

              {/* Failed QA */}
              <div id="stat-card-failed-qa" className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold text-slate-500">Failed QA</span>
                  <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 shadow-2xs">
                    <XCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{failed}</span>
                  <svg className="w-16 h-8 text-rose-500" viewBox="0 0 60 25" fill="none">
                    <path d="M2 12 L 15 18 L 28 12 L 42 22 L 58 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-[11px] font-semibold text-rose-600 mt-2">
                  Needs attention
                </p>
              </div>
            </div>

            {/* Middle Section: Overview, Countries & User-Wise Campaign Count */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1: QA Status Overview Card */}
              <div id="card-qa-status-overview" className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#2b61d6]" />
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">QA Status Overview</h3>
                  </div>
                  <span className="text-xs font-medium text-slate-400">{total} Total</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
                  {/* Custom SVG Donut Chart */}
                  <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="38" stroke="#f1f5f9" strokeWidth="12" fill="none" />
                      {total > 0 ? (
                        (() => {
                          const circumference = 2 * Math.PI * 38;
                          let offset = 0;

                          const cStroke = (completed / total) * circumference;
                          const pStroke = (pending / total) * circumference;
                          const fStroke = (failed / total) * circumference;
                          const iStroke = (inProgress / total) * circumference;

                          const segments = [
                            { stroke: cStroke, color: "#10b981" },
                            { stroke: pStroke, color: "#f59e0b" },
                            { stroke: fStroke, color: "#ef4444" },
                            { stroke: iStroke, color: "#2563eb" },
                          ];

                          return segments.map((seg, idx) => {
                            const dashArray = `${seg.stroke} ${circumference - seg.stroke}`;
                            const currentOffset = offset;
                            offset += seg.stroke;
                            return (
                              <circle
                                key={idx}
                                cx="50"
                                cy="50"
                                r="38"
                                stroke={seg.color}
                                strokeWidth="12"
                                strokeDasharray={dashArray}
                                strokeDashoffset={-currentOffset}
                                fill="none"
                                className="transition-all duration-500"
                              />
                            );
                          });
                        })()
                      ) : (
                        <circle cx="50" cy="50" r="38" stroke="#cbd5e1" strokeWidth="12" fill="none" />
                      )}
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-xl font-extrabold text-slate-900 tracking-tight">{total}</span>
                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Total</span>
                    </div>
                  </div>

                  {/* Legend List */}
                  <div className="flex-1 space-y-2.5 w-full">
                    <div className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                        <span className="font-semibold text-slate-700">Completed</span>
                      </div>
                      <span className="font-bold text-slate-900">{completed} <span className="text-slate-400 font-normal">({completedPercent}%)</span></span>
                    </div>

                    <div className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                        <span className="font-semibold text-slate-700">Pending</span>
                      </div>
                      <span className="font-bold text-slate-900">{pending} <span className="text-slate-400 font-normal">({pendingPercent}%)</span></span>
                    </div>

                    <div className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
                        <span className="font-semibold text-slate-700">Failed</span>
                      </div>
                      <span className="font-bold text-slate-900">{failed} <span className="text-slate-400 font-normal">({failedPercent}%)</span></span>
                    </div>

                    <div className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></span>
                        <span className="font-semibold text-slate-700">In Progress</span>
                      </div>
                      <span className="font-bold text-slate-900">{inProgress} <span className="text-slate-400 font-normal">({inProgressPercent}%)</span></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Campaigns by Country Card */}
              <div id="card-campaigns-by-country" className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">Campaigns by Country</h3>
                  </div>
                  <Link to="/campaigns" className="text-xs font-semibold text-[#2b61d6] hover:underline flex items-center gap-1">
                    View All
                  </Link>
                </div>

                <div className="space-y-3 py-1">
                  {countryConfig.map((item) => {
                    const count = getCountryCount(item.code);
                    const percent = Math.min(100, Math.round((count / maxCountryCount) * 100));

                    return (
                      <div 
                        key={item.code} 
                        onClick={() => setSelectedCountry(selectedCountry === item.code ? "all" : item.code)}
                        className={cn(
                          "space-y-1.5 p-2 rounded-xl transition-all cursor-pointer border",
                          selectedCountry === item.code 
                            ? "bg-blue-50/60 border-blue-200 ring-1 ring-blue-400" 
                            : "hover:bg-slate-50/80 border-transparent"
                        )}
                        title={`Click to filter by ${item.label}`}
                      >
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            <span>{item.code}</span>
                            <span className="text-[11px] font-normal text-slate-400">({item.label})</span>
                          </span>
                          <span className="font-bold text-slate-900">{count}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-500", item.barColor)}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Card 3: User-Wise Campaign Count Card */}
              <div id="card-user-wise-campaign-count" className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">Campaigns by User</h3>
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                    {userStatsList.length} {userStatsList.length === 1 ? "Contributor" : "Contributors"}
                  </span>
                </div>

                <div className="space-y-2.5 py-1 flex-1 overflow-y-auto max-h-[260px] pr-0.5">
                  {userStatsList.length > 0 ? (
                    userStatsList.map((uStat) => {
                      const isSelected = selectedUser.toLowerCase() === uStat.key.toLowerCase();

                      return (
                        <div
                          key={uStat.key}
                          id={`user-stat-row-${uStat.key.replace(/[^a-zA-Z0-9]/g, '_')}`}
                          onClick={() => setSelectedUser(isSelected ? "all" : uStat.key)}
                          className={cn(
                            "p-2.5 rounded-xl border transition-all cursor-pointer text-left group",
                            isSelected
                              ? "bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs"
                              : "hover:bg-slate-50 border-slate-100 hover:border-slate-200"
                          )}
                          title={`Click to filter recent campaigns by ${uStat.name}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            {/* Avatar & User Details */}
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs", uStat.avatarBg)}>
                                {getInitials(uStat.name)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-bold text-slate-900 truncate">
                                    {uStat.name}
                                  </p>
                                  {uStat.role === "admin" && (
                                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                                      Admin
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {uStat.email || "Team member"}
                                </p>
                              </div>
                            </div>

                            {/* Campaign Count Pill */}
                            <div className="text-right shrink-0">
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold border transition-colors",
                                isSelected ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-100 text-slate-800 border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-700"
                              )}>
                                <span>{uStat.total}</span>
                                <span className="font-normal text-[10px] opacity-80">{uStat.total === 1 ? "campaign" : "campaigns"}</span>
                              </span>
                            </div>
                          </div>

                          {/* Progress & Sub-stats */}
                          <div className="mt-2 space-y-1">
                            <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                              <span>
                                {uStat.completed} completed • {uStat.inProgress + uStat.pending} active
                              </span>
                              <span className="font-bold text-slate-700">{uStat.percent}% share</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full transition-all duration-500", uStat.barBg)}
                                style={{ width: `${uStat.percent}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No user campaign data found.
                    </div>
                  )}
                </div>

                {/* Footer action / quick link */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  {selectedUser !== "all" ? (
                    <button
                      onClick={() => setSelectedUser("all")}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Clear User Filter
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400">Click any user to filter</span>
                  )}
                  <Link
                    to="/users"
                    className="text-[11px] font-bold text-[#2b61d6] hover:underline flex items-center gap-1"
                  >
                    <span>Manage Team</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Bottom Section: Recent Campaigns */}
            <div id="section-recent-campaigns" className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
              {/* Header & Multi-Filter Bar */}
              <div className="p-5 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[#2b61d6] flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">Recent Campaigns</h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Showing {filteredCampaigns.length} {filteredCampaigns.length === 1 ? "campaign" : "campaigns"}
                      {selectedUser !== "all" && (
                        <span className="ml-1 text-indigo-700 font-semibold">
                          filtered by {userStatsList.find(u => u.key.toLowerCase() === selectedUser.toLowerCase())?.name || selectedUser}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Search input */}
                  <div className="relative">
                    <input
                      id="dashboard-campaigns-search-input"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search campaigns..."
                      className="bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs w-44 sm:w-56"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* User Filter Dropdown */}
                  <div className="relative">
                    <select
                      id="dashboard-user-filter-select"
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className={cn(
                        "appearance-none bg-white border rounded-lg pl-8 pr-7 py-1.5 text-xs font-semibold hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs",
                        selectedUser !== "all" ? "border-indigo-400 text-indigo-700 bg-indigo-50/50" : "border-slate-300 text-slate-700"
                      )}
                    >
                      <option value="all">All Users</option>
                      {userStatsList.map((u) => (
                        <option key={u.key} value={u.key}>
                          {u.name} ({u.total})
                        </option>
                      ))}
                    </select>
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Country Select */}
                  <div className="relative">
                    <select
                      id="dashboard-country-filter-select"
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      className={cn(
                        "appearance-none bg-white border rounded-lg pl-8 pr-7 py-1.5 text-xs font-semibold hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs",
                        selectedCountry !== "all" ? "border-blue-400 text-blue-700 bg-blue-50/50" : "border-slate-300 text-slate-700"
                      )}
                    >
                      <option value="all">All Countries</option>
                      <option value="IN">India (IN)</option>
                      <option value="AU">Australia (AU)</option>
                      <option value="NZ">New Zealand (NZ)</option>
                      <option value="SG">Singapore (SG)</option>
                      <option value="MY">Malaysia (MY)</option>
                    </select>
                    <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Date Timeframe Select */}
                  <div className="relative">
                    <select
                      id="dashboard-timeframe-filter-select"
                      value={selectedTimeframe}
                      onChange={(e) => setSelectedTimeframe(e.target.value)}
                      className="appearance-none bg-white border border-slate-300 rounded-lg pl-8 pr-7 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
                    >
                      <option value="all">All Time</option>
                      <option value="7">Last 7 Days</option>
                      <option value="30">Last 30 Days</option>
                      <option value="90">Last 90 Days</option>
                    </select>
                    <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Clear All Filters Button */}
                  {hasActiveFilters && (
                    <button
                      id="dashboard-clear-filters-btn"
                      onClick={resetAllFilters}
                      className="p-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors flex items-center gap-1 shadow-2xs"
                      title="Reset all filters"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table id="dashboard-recent-campaigns-table" className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/80 border-b border-slate-200">
                      <th className="px-6 py-3">Campaign Name</th>
                      <th className="px-6 py-3">Country</th>
                      <th className="px-6 py-3">Stage</th>
                      <th className="px-6 py-3">Created By</th>
                      <th className="px-6 py-3">Updated / Created</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Progress</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                          Loading dynamic campaign metrics...
                        </td>
                      </tr>
                    ) : filteredCampaigns.length > 0 ? (
                      filteredCampaigns.map((campaign) => {
                        const badge = getStatusBadge(campaign.status);
                        const prog = getCampaignCheckpointProgress(campaign);
                        const currentStage = campaign.currentStep || campaign.current_step || 1;
                        const progressPercent = (campaign.status === "Completed" || campaign.status === "Approved") 
                          ? 100 
                          : prog.percent;
                        const userDisplay = resolveUserDisplayName(campaign);

                        return (
                          <tr key={campaign.id} className="hover:bg-slate-50/80 transition-colors group">
                            {/* Name */}
                            <td className="px-6 py-4">
                              <div className="space-y-0.5">
                                <button
                                  onClick={() => navigate(`/campaigns/new?id=${campaign.id}`)}
                                  className="font-bold text-slate-900 hover:text-[#2b61d6] hover:underline text-left line-clamp-1 block"
                                >
                                  {campaign.name}
                                </button>
                                <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-normal">
                                  <span>{campaign.versionName || campaign.version_name || "Standard Version"}</span>
                                  <span>•</span>
                                  <span>{formatRelativeTime(campaign.updated_at || campaign.created_at)}</span>
                                </span>
                              </div>
                            </td>

                            {/* Country */}
                            <td className="px-6 py-4 font-bold text-slate-800">
                              <span className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200 text-[11px] font-semibold text-slate-700">
                                <Globe className="w-3 h-3 text-slate-500" />
                                <span>{campaign.country || "IN"}</span>
                              </span>
                            </td>

                            {/* Stage */}
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1 bg-blue-50 text-[#2b61d6] px-2.5 py-0.5 rounded-md border border-blue-200 text-[11px] font-bold">
                                Stage {currentStage} of 7
                              </span>
                            </td>

                            {/* Created By with Avatar */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                  {getInitials(userDisplay.name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-800 truncate">
                                    {userDisplay.name}
                                  </p>
                                  {userDisplay.email && (
                                    <p className="text-[10px] text-slate-400 truncate">
                                      {userDisplay.email}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Date */}
                            <td className="px-6 py-4 text-slate-500 font-medium">
                              <span className="block text-slate-800 font-semibold">{formatRelativeTime(campaign.updated_at || campaign.created_at)}</span>
                              <span className="text-[11px] text-slate-400">{formatDate(campaign.updated_at || campaign.created_at)}</span>
                            </td>

                            {/* Status */}
                            <td className="px-6 py-4">
                              <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border", badge.bg)}>
                                {badge.label}
                              </span>
                            </td>

                            {/* Progress */}
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1 w-32">
                                <div className="flex items-center justify-between text-[11px] font-bold">
                                  <span className={progressPercent === 100 ? "text-emerald-700" : "text-[#2b61d6]"}>
                                    {progressPercent}%
                                  </span>
                                  <span className="text-slate-500 text-[10px] font-normal">{prog.completed}/{prog.total}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={cn("h-full rounded-full transition-all duration-300", progressPercent === 100 ? "bg-emerald-500" : "bg-[#2b61d6]")}
                                    style={{ width: `${progressPercent}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Action */}
                            <td className="px-6 py-4 text-right relative">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  id={`dashboard-resume-btn-${campaign.id}`}
                                  onClick={() => navigate(`/campaigns/new?id=${campaign.id}`)}
                                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-[#2b61d6] bg-indigo-50 hover:bg-indigo-100 transition-colors"
                                >
                                  Open QA
                                </button>
                                <button
                                  id={`dashboard-action-menu-btn-${campaign.id}`}
                                  onClick={() => setActionMenuOpenId(actionMenuOpenId === campaign.id ? null : campaign.id)}
                                  className="p-1 hover:bg-slate-200/80 rounded-md text-slate-500 hover:text-slate-800 transition-colors"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </div>

                              {actionMenuOpenId === campaign.id && (
                                <div className="absolute right-6 top-10 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1.5 w-40 text-left animate-in fade-in zoom-in-95">
                                  <button
                                    onClick={() => {
                                      setActionMenuOpenId(null);
                                      navigate(`/campaigns/new?id=${campaign.id}`);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                                  >
                                    Edit Campaign
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActionMenuOpenId(null);
                                      navigate(`/campaigns`);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                                  >
                                    Manage Folders
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-500 text-xs">
                          <div className="max-w-sm mx-auto space-y-2">
                            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                            <p className="font-semibold text-slate-700">No matching campaigns found</p>
                            <p className="text-slate-400 text-[11px]">
                              {hasActiveFilters 
                                ? "Try clearing or adjusting your search filters to see more campaigns." 
                                : "No active campaigns are currently registered in the system."}
                            </p>
                            {hasActiveFilters && (
                              <button
                                onClick={resetAllFilters}
                                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[#2b61d6] bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Reset Filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer view all */}
              <div className="p-4 bg-slate-50/50 border-t border-slate-200/80 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {filteredCampaigns.length} of {total} total campaigns
                </span>
                <Link
                  id="dashboard-view-all-campaigns-link"
                  to="/campaigns"
                  className="text-xs font-bold text-[#2b61d6] hover:text-indigo-800 flex items-center gap-1.5 hover:underline"
                >
                  <span>View full campaigns manager</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Start New Campaign: Guided Folder Selection Modal */}
      {isStartFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 to-indigo-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#2b61d6] text-white flex items-center justify-center shadow-xs">
                  <FolderOpen className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Start New Campaign</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Select target destination folder</p>
                </div>
              </div>
              <button
                onClick={() => setIsStartFolderModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Select a destination folder where this new campaign and QA logs will be saved:
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreatingFolderInModal(!isCreatingFolderInModal)}
                  className="text-xs font-semibold text-[#2b61d6] hover:text-indigo-800 flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>{isCreatingFolderInModal ? "Hide New" : "+ New Folder"}</span>
                </button>
              </div>

              {/* Inline Create Folder Input */}
              {isCreatingFolderInModal && (
                <form onSubmit={handleCreateFolderAndStart} className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                  <label className="text-[11px] font-bold text-blue-900 block">
                    Create New Folder & Start Campaign
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFolderNameInModal}
                      onChange={(e) => setNewFolderNameInModal(e.target.value)}
                      placeholder="e.g. 2026 Q4 Deals"
                      className="flex-1 bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!newFolderNameInModal.trim()}
                      className="px-3 py-1.5 bg-[#2b61d6] hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-all shrink-0 cursor-pointer"
                    >
                      Create & Start
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {availableFolders.map((folder) => {
                  const folderCount = campaigns.filter(c => (c.folder_id || "2026") === folder.id).length;
                  return (
                    <button
                      key={folder.id}
                      onClick={() => {
                        setIsStartFolderModalOpen(false);
                        navigate(`/campaigns/new?folder_id=${folder.id}`);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-[#2b61d6] hover:bg-blue-50/60 transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2b61d6] flex items-center justify-center group-hover:bg-[#2b61d6] group-hover:text-white transition-colors">
                          <Folder className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700">
                            {folder.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {folder.year ? `Year ${folder.year}` : 'Campaign Directory'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 group-hover:bg-blue-100 group-hover:text-blue-800 px-2 py-0.5 rounded-full">
                          {folderCount} {folderCount === 1 ? 'campaign' : 'campaigns'}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#2b61d6] transition-colors" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => {
                  setIsStartFolderModalOpen(false);
                  setIsCreatingFolderInModal(false);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
