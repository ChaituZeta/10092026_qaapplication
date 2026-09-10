import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FileText, BarChart2, Users, Settings, LogOut, ChevronLeft, ChevronRight, Trash2, CheckSquare, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { logoutUser } from "@/lib/auth";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Campaigns", href: "/campaigns", icon: FileText },
  { name: "Recycle Bin", href: "/recycle-bin", icon: Trash2 },
  { name: "Reports", href: "/reports", icon: BarChart2 },
  { name: "Checklists", href: "/checklists", icon: CheckSquare, adminOnly: true },
  
  { name: "User Management", href: "/users", icon: Users, adminOnly: true },
  { name: "AI Agent Studio", href: "/agents", icon: Sparkles, adminOnly: true },
  { name: "MyProfile", href: "/profile", icon: User },
  { name: "System Settings", href: "/settings?tab=database", icon: Settings, adminOnly: true },
];

export function Sidebar({ role, userEmail }: { role: string; userEmail?: string }) {
  const location = useLocation();
  const isAdmin = role === "admin";
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [logos, setLogos] = useState({ expanded: "https://zetaglobal.com/wp-content/uploads/2023/02/zeta_logoPrimary.svg", collapsed: "https://companieslogo.com/img/orig/ZETA-424536bc.png" });
  const [profile, setProfile] = useState({
    name: isAdmin ? "Admin User" : "QA User",
    team: "HP-APJ",
    avatar: ""
  });

  // Auto-collapse sidebar on campaign setup page or small screen for focused workspace
  useEffect(() => {
    const isSetupPage = location.pathname.startsWith("/campaigns/new");
    if (isSetupPage || window.innerWidth < 1024) {
      setIsCollapsed(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    async function fetchLogos() {
      const { data } = await supabase.from('app_settings').select('*').limit(1).single();
      if (data) {
        if (data.expanded_logo_url) setLogos(prev => ({ ...prev, expanded: data.expanded_logo_url }));
        if (data.collapsed_logo_url) setLogos(prev => ({ ...prev, collapsed: data.collapsed_logo_url }));
      }
    }
    fetchLogos();
  }, []);

  const loadProfileData = async () => {
    if (!userEmail) return;
    try {
      const { data } = await supabase.from('app_users').select('*').eq('email', userEmail.trim().toLowerCase()).maybeSingle();
      if (data) {
        setProfile({
          name: data.name || (isAdmin ? "Admin User" : "QA User"),
          team: data.team || "HP-APJ",
          avatar: data.avatar || ""
        });
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadProfileData();
    window.addEventListener("profile_updated", loadProfileData);
    return () => window.removeEventListener("profile_updated", loadProfileData);
  }, [role, userEmail]);

  const handleLogout = async () => {
    await logoutUser();
  };

  // Determine effective display state
  const effectivelyExpanded = isHovered;

  return (
    <div className="flex-shrink-0 relative transition-all duration-300 w-20">
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "bg-white text-slate-800 flex flex-col z-[100] transition-all duration-300 absolute left-0 top-0 bottom-0 border-r border-slate-200 shadow-xl overflow-hidden",
          effectivelyExpanded ? "w-64 shadow-2xl" : "w-20"
        )}
      >
        
        <div className={cn("p-5 pb-4 overflow-hidden whitespace-nowrap border-b border-slate-100 shrink-0", !effectivelyExpanded ? "px-3 text-center" : "px-5")}>
          <div className="flex items-center gap-3">
            <img 
              src={!effectivelyExpanded ? logos.collapsed : logos.expanded} 
              alt="Platform Logo" 
              className={cn("transition-all object-contain", !effectivelyExpanded ? "h-7 w-7 mx-auto" : "h-7 max-w-[140px]")}
            />
            {effectivelyExpanded && (
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider leading-tight">HP-QA</span>
                <span className="text-[9px] font-medium text-slate-400">Campaign Platform</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 overflow-x-hidden">
          <nav className={cn("flex-1 space-y-1", !effectivelyExpanded ? "px-2" : "px-3")}>
            {NAV_ITEMS.map((item) => {
              if (item.adminOnly && !isAdmin) return null;
              
              const currentPath = location.pathname + location.search;
              const isActive = item.href === "/"
                ? location.pathname === "/"
                : item.href.includes("?")
                  ? currentPath.includes(item.href.split("?")[1])
                  : location.pathname.startsWith(item.href.split("?")[0]);
              
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  data-testid={`nav-link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  title={!effectivelyExpanded ? item.name : undefined}
                  className={cn(
                    "flex items-center rounded-lg transition-all text-xs font-semibold",
                    !effectivelyExpanded ? "justify-center p-2.5" : "px-3 py-2.5 space-x-3",
                    isActive 
                      ? "bg-[#2b61d6] text-white shadow-xs" 
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <item.icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-white" : "text-slate-500")} />
                  {effectivelyExpanded && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className={cn("p-3 flex flex-col gap-1.5 border-t border-slate-100 bg-slate-50/60 shrink-0", !effectivelyExpanded ? "items-center px-2" : "")}>
          <div className={cn("flex items-center rounded-lg p-2 transition-colors", !effectivelyExpanded ? "justify-center p-0" : "space-x-2.5 bg-white border border-slate-200/60")}>
            <div className="w-8 h-8 shrink-0 rounded-full bg-slate-900 flex items-center justify-center font-bold text-white text-xs overflow-hidden shadow-2xs">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                profile.name.substring(0, 2).toUpperCase()
              )}
            </div>
            {effectivelyExpanded && (
              <div className="overflow-hidden min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 leading-tight truncate">{profile.name}</p>
                <p className="text-[10px] text-slate-500 font-medium truncate">{profile.team || "HP-APJ"}</p>
              </div>
            )}
          </div>
          
          <button 
            data-testid="logout-button"
            onClick={handleLogout}
            title={!effectivelyExpanded ? "Logout" : undefined}
            className={cn(
              "flex items-center rounded-lg font-semibold text-slate-600 transition-all hover:bg-rose-50 hover:text-rose-600 cursor-pointer",
              !effectivelyExpanded ? "justify-center p-2.5 mt-1" : "w-full gap-2 px-3 py-2 text-xs"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-rose-500" />
            {effectivelyExpanded && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </div>
  );
}
