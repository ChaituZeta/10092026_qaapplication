import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { ChevronDown, Building2, User, Activity, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function Profile({ role, userEmail }: { role: string; userEmail?: string }) {
  const isAdmin = role === "admin";
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "PROFILE";
  const [activeTab, setActiveTabState] = useState(initialTab);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: userEmail || "",
    phone: "",
    jobTitle: "",
    language: "English",
    locale: "English (United Kingdom)",
    timezone: "Asia/Calcutta",
    currency: "INR - Indian Rupee",
    team: "Cheetah Digital",
    avatar: ""
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Activity Logs State
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    setSearchParams(prev => {
      prev.set("tab", tab);
      return prev;
    }, { replace: true });
  };

  useEffect(() => {
    async function loadProfile() {
      if (!userEmail) return;
      
      // Load local preferences first
      const localPrefsRaw = localStorage.getItem(`profile_prefs_${userEmail.trim().toLowerCase()}`);
      if (localPrefsRaw) {
        try {
          const localPrefs = JSON.parse(localPrefsRaw);
          setProfile(prev => ({ ...prev, ...localPrefs }));
        } catch (e) {}
      }

      const { data } = await supabase.from('app_users').select('*').eq('email', userEmail.trim().toLowerCase()).maybeSingle();
      if (data) {
        const names = (data.name || "").split(" ");
        const firstName = names[0] || "";
        const lastName = names.slice(1).join(" ") || "";

        setProfile(prev => ({
          ...prev,
          firstName,
          lastName,
          team: data.team || "Cheetah Digital",
          // avatar is loaded from local storage earlier if saved, else fallback to data if it existed
        }));
      }
    }
    loadProfile();
  }, [userEmail]);

  useEffect(() => {
    async function fetchLogs() {
      if (activeTab === "ACTIVITY" && userEmail) {
        setIsLoadingLogs(true);
        try {
          const { data } = await supabase
            .from('activity_logs')
            .select('*')
            .eq('user_email', userEmail.trim().toLowerCase())
            .order('created_at', { ascending: false })
            .limit(50);
          
          if (data) setLogs(data);
        } catch (e) {
          console.error("Failed to load logs:", e);
        } finally {
          setIsLoadingLogs(false);
        }
      }
    }
    fetchLogs();
  }, [activeTab, userEmail]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMsg(null);
    try {
      const fullName = `${profile.firstName} ${profile.lastName}`.trim();
      
      // Only update standard columns in app_users
      const { error } = await supabase.from('app_users').update({
        name: fullName,
        updated_at: new Date().toISOString()
      }).eq('email', userEmail?.trim().toLowerCase());

      if (error) throw error;
      
      // Save avatar and preferences to localStorage to bypass schema limitations safely
      const prefsToSave = {
        phone: profile.phone,
        jobTitle: profile.jobTitle,
        language: profile.language,
        locale: profile.locale,
        timezone: profile.timezone,
        currency: profile.currency,
        avatar: profile.avatar
      };
      
      localStorage.setItem(`profile_prefs_${userEmail?.trim().toLowerCase()}`, JSON.stringify(prefsToSave));
      
      setSaveMsg({ type: 'success', text: 'Profile updated successfully!' });
      window.dispatchEvent(new CustomEvent("profile_updated"));
    } catch (e: any) {
      setSaveMsg({ type: 'error', text: e.message || 'Failed to save profile' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setProfile(prev => ({ ...prev, avatar: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const TABS = ["PROFILE", "TEAMS", "SECURITY", "APP ACCESS", "ACTIVITY"];

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header Section */}
      <div className="bg-[#f5f9ff] px-8 py-6 border-b border-slate-200">
        <div className="max-w-6xl mx-auto flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#1e5eea] text-white flex items-center justify-center text-xl font-semibold shadow-sm overflow-hidden shrink-0">
              {profile.avatar ? (
                <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}` || "U"
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-[22px] font-semibold text-slate-800">
                  {profile.firstName} {profile.lastName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold tracking-wide">
                  Active
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 mt-1">
                <Building2 className="w-3.5 h-3.5" />
                <span className="text-sm font-medium">{profile.team}</span>
              </div>
            </div>
          </div>
          {/* OPTIONS button removed per user request */}
        </div>
      </div>

      {/* Tabs Section */}
      <div className="px-8 border-b border-slate-200">
        <div className="max-w-6xl mx-auto flex items-center gap-8">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "py-4 text-[11px] font-bold tracking-wider relative transition-colors cursor-pointer",
                activeTab === tab ? "text-[#407bf6]" : "text-slate-500 hover:text-slate-800"
              )}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#407bf6]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-8 py-8">
        <div className="max-w-6xl mx-auto">
          {activeTab === "PROFILE" ? (
            <div className="animate-in fade-in duration-300">
              {/* Profile Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold tracking-wide text-slate-800">PROFILE</h2>
                <div className="flex items-center gap-3">
                  {saveMsg && (
                    <span className={cn("text-xs font-semibold", saveMsg.type === 'success' ? 'text-emerald-600' : 'text-rose-600')}>
                      {saveMsg.text}
                    </span>
                  )}
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2 border border-slate-200 text-slate-600 font-bold text-[11px] rounded hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    {isSaving ? "SAVING..." : "SAVE"}
                  </button>
                </div>
              </div>
              
              <p className="text-[13px] text-slate-500 max-w-2xl leading-relaxed mb-8">
                Update your personal details for Zeta Login. Note that individual Zeta products may have local settings which you can access by switching to a product and selecting "Settings" or "Application Settings" in the profile menu.
              </p>

              <h3 className="text-[15px] font-bold text-slate-800 tracking-wide mb-6">PERSONAL INFO</h3>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12">
                {/* Left Column: Form Fields */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-800">Email</label>
                      <input 
                        type="text" 
                        value={profile.email} 
                        disabled
                        className="w-full border border-slate-200 rounded p-2.5 text-sm text-slate-400 bg-slate-50/50 focus:outline-none"
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-800">First Name</label>
                      <input 
                        type="text" 
                        value={profile.firstName}
                        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                        className="w-full border border-slate-200 rounded p-2.5 text-sm text-slate-700 focus:border-[#407bf6] focus:ring-1 focus:ring-[#407bf6] transition-all outline-none"
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-800">Last Name</label>
                      <input 
                        type="text" 
                        value={profile.lastName}
                        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                        className="w-full border border-slate-200 rounded p-2.5 text-sm text-slate-700 focus:border-[#407bf6] focus:ring-1 focus:ring-[#407bf6] transition-all outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-800">Phone Number</label>
                      <input 
                        type="text" 
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        placeholder="+91..."
                        className="w-full border border-slate-200 rounded p-2.5 text-sm text-slate-700 focus:border-[#407bf6] focus:ring-1 focus:ring-[#407bf6] transition-all outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-800">Job Title</label>
                      <input 
                        type="text" 
                        value={profile.jobTitle}
                        onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })}
                        className="w-full border border-slate-200 rounded p-2.5 text-sm text-slate-700 focus:border-[#407bf6] focus:ring-1 focus:ring-[#407bf6] transition-all outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-800">Language</label>
                      <div className="relative">
                        <select 
                          value={profile.language}
                          onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                          className="w-full border border-slate-200 rounded p-2.5 text-sm text-slate-700 appearance-none bg-white focus:border-[#407bf6] focus:ring-1 focus:ring-[#407bf6] outline-none"
                        >
                          <option>English</option>
                          <option>Spanish</option>
                          <option>French</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-800">Locale</label>
                      <div className="relative">
                        <select 
                          value={profile.locale}
                          onChange={(e) => setProfile({ ...profile, locale: e.target.value })}
                          className="w-full border border-slate-200 rounded p-2.5 text-sm text-slate-700 appearance-none bg-white focus:border-[#407bf6] focus:ring-1 focus:ring-[#407bf6] outline-none"
                        >
                          <option>English (United Kingdom)</option>
                          <option>English (United States)</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-800">Timezone</label>
                      <div className="relative">
                        <select 
                          value={profile.timezone}
                          onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                          className="w-full border border-slate-200 rounded p-2.5 text-sm text-slate-700 appearance-none bg-white focus:border-[#407bf6] focus:ring-1 focus:ring-[#407bf6] outline-none"
                        >
                          <option>Asia/Calcutta</option>
                          <option>America/New_York</option>
                          <option>Europe/London</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-800">Currency</label>
                      <div className="relative">
                        <select 
                          value={profile.currency}
                          onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
                          className="w-full border border-slate-200 rounded p-2.5 text-sm text-slate-700 appearance-none bg-white focus:border-[#407bf6] focus:ring-1 focus:ring-[#407bf6] outline-none"
                        >
                          <option>INR - Indian Rupee</option>
                          <option>USD - US Dollar</option>
                          <option>EUR - Euro</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Profile Image */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-800 mb-2">Profile Image</h4>
                  <div className="border border-slate-100 shadow-sm rounded flex flex-col items-center p-8 bg-white">
                    <div className="w-48 h-48 rounded-full bg-[#bde0df] mb-8 overflow-hidden relative flex items-center justify-center">
                      {profile.avatar ? (
                         <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                         <div className="absolute bottom-0 w-[140px] h-[160px] bg-[#3a7c8c] rounded-t-[100px] flex items-start justify-center pt-4">
                           <div className="w-16 h-16 rounded-full bg-white"></div>
                         </div>
                      )}
                    </div>
                    
                    <input 
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                    />
                    
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 border border-[#407bf6] text-[#407bf6] text-[11px] font-bold rounded hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      UPLOAD
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "ACTIVITY" ? (
            <div className="animate-in fade-in duration-300">
               <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold tracking-wide text-slate-800">LOGIN & PLATFORM ACTIVITY</h2>
              </div>
              
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                {isLoadingLogs ? (
                  <div className="p-8 text-center text-slate-400 text-sm font-semibold">Loading your activity logs...</div>
                ) : logs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm font-semibold">No recent activity found.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {logs.map((log, idx) => (
                      <div key={idx} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4">
                        <div className="mt-0.5 p-2 bg-blue-50 text-blue-600 rounded-full">
                          <Activity className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[13px] font-semibold text-slate-800">{log.action_type}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{log.details}</p>
                        </div>
                        <div className="text-right flex items-center gap-1.5 text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-medium">{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "TEAMS" && isAdmin ? (
             <div className="py-20 text-center flex flex-col items-center justify-center text-slate-500 animate-in fade-in">
              <Users className="w-12 h-12 text-indigo-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">Team Management</h3>
              <p className="text-sm max-w-sm mb-6">As an admin, you can manage platform teams, users, and their permissions.</p>
              <button 
                onClick={() => navigate('/settings?tab=teams')}
                className="px-6 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-indigo-700 transition-colors"
              >
                Go to Team Settings
              </button>
            </div>
          ) : (
            <div className="py-20 text-center flex flex-col items-center justify-center text-slate-500 animate-in fade-in">
              <User className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">{activeTab} Settings</h3>
              <p className="text-sm">This section is not fully implemented in the current prototype.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
