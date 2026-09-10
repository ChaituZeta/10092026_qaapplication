import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { SessionManager } from "../SessionManager";
import { NetworkStatusBar } from "../NetworkStatusBar";

export function AppLayout({ role, userEmail }: { role: string; userEmail?: string }) {
  const location = useLocation();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans relative">
      <Sidebar role={role} userEmail={userEmail} />
      <main className="flex-1 flex flex-col relative overflow-y-auto overflow-x-auto min-w-0 bg-white">
        <NetworkStatusBar role={role} />
        <div className="flex-1 flex flex-col min-w-0 z-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
