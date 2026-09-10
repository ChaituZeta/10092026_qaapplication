import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SessionTimeoutModalProps {
  isOpen: boolean;
  onStaySignedIn: () => void;
  onLogOut: () => void;
  countdownSeconds: number;
}

export function SessionTimeoutModal({
  isOpen,
  onStaySignedIn,
  onLogOut,
  countdownSeconds
}: SessionTimeoutModalProps) {
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
    } else {
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isRendered && !isOpen) return null;

  // Format seconds to mm:ss
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `00:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-[#08102B]/60 backdrop-blur-[2px] transition-opacity duration-300",
      isOpen ? "opacity-100" : "opacity-0"
    )}>
      {/* Modal Container */}
      <div 
        className={cn(
          "relative bg-white rounded-[1.25rem] shadow-2xl overflow-hidden flex flex-col md:flex-row w-full max-w-[800px] transform transition-transform duration-300 m-4",
          isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        )}
        style={{ minHeight: "400px" }}
      >
        {/* Left Side: Content */}
        <div className="flex-1 p-8 md:px-14 md:py-12 flex flex-col justify-center bg-white z-10">
          <h2 className="text-[28px] font-bold text-slate-800 tracking-tight mb-4 mt-2">
            Session Expiring Soon
          </h2>
          
          <div className="text-[46px] font-bold text-slate-900 tracking-tighter mb-6 flex justify-start">
            {formatTime(countdownSeconds)}
          </div>
          
          <p className="text-slate-600 text-[17px] leading-relaxed mb-8 max-w-sm">
            You've been inactive for a while. To protect your data, your session will end if no action is taken.
          </p>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={onLogOut}
              className="px-6 py-2.5 rounded-lg border border-slate-300 text-[#306DE4] font-medium hover:bg-slate-50 transition-colors text-[16px]"
            >
              Log Out
            </button>
            <button 
              onClick={onStaySignedIn}
              className="px-6 py-2.5 rounded-lg bg-[#3b7ced] hover:bg-[#2e62c2] text-white font-medium shadow-sm transition-colors text-[16px]"
            >
              Stay Signed In
            </button>
          </div>
        </div>

        {/* Right Side: Image */}
        <div className="hidden md:block md:w-[45%] relative shrink-0 -ml-4 z-0">
          <img 
            src="https://images.prismic.io/zeta-global/aj6CwVbRV8_Qf6sT_ZETAWEB_foragenciesB1.webp" 
            alt="User at laptop"
            className="absolute inset-0 w-full h-full object-cover object-left"
          />
        </div>
      </div>
    </div>
  );
}
