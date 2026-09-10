import React, { useState, useEffect } from "react";
import { Upload, Sparkles, CheckCircle2 } from "lucide-react";

export function QaBannerShowcase() {
  const [customImage, setCustomImage] = useState<string | null>(() => {
    try {
      return localStorage.getItem("zeta_qa_banner_image");
    } catch {
      return null;
    }
  });

  const [hasFileError, setHasFileError] = useState(false);

  // Allow drag & drop or selection of custom image
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setCustomImage(result);
        try {
          localStorage.setItem("zeta_qa_banner_image", result);
        } catch (err) {
          console.warn("[QaBannerShowcase] Storage note:", err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative w-full max-w-3xl lg:max-w-none my-auto py-2 group">
      {/* 1. Custom Image if user uploaded it via local storage */}
      {customImage ? (
        <div className="relative w-full overflow-hidden rounded-2xl shadow-2xl border border-slate-800 bg-[#0e1424]">
          <img
            src={customImage}
            alt="Empower your QA Workflow - Zeta Global"
            className="w-full h-auto object-contain select-none"
            referrerPolicy="no-referrer"
          />
          <button
            onClick={() => {
              setCustomImage(null);
              localStorage.removeItem("zeta_qa_banner_image");
            }}
            className="absolute top-3 right-3 text-xs bg-black/60 hover:bg-black/80 text-white/80 hover:text-white px-2.5 py-1 rounded-md border border-white/20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
            title="Reset to default banner"
          >
            Reset Banner
          </button>
        </div>
      ) : !hasFileError ? (
        /* 2. Check for public /image.png or /qa-banner.png */
        <div className="relative w-full overflow-hidden rounded-2xl shadow-2xl border border-slate-800 bg-[#0e1424]">
          <img
            src="/image.png"
            alt="Empower your QA Workflow - Zeta Global"
            className="w-full h-auto object-contain select-none"
            onError={() => {
              setHasFileError(true);
            }}
            referrerPolicy="no-referrer"
          />
        </div>
      ) : (
        /* 3. Recreated Dynamic Artwork matching the exact uploaded reference */
        <div className="relative w-full aspect-[16/10] overflow-hidden rounded-2xl shadow-2xl border border-slate-800/80 bg-[#0b1020] flex flex-col justify-between select-none">
          {/* Background SVG with exact Zeta geometric yellow chevron & magenta gradient ribbon */}
          <div className="absolute inset-0 pointer-events-none">
            <svg
              className="w-full h-full object-cover"
              viewBox="0 0 1000 625"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                {/* Coral to magenta gradient for lower ribbon */}
                <linearGradient
                  id="zetaMagentaRibbon"
                  x1="100"
                  y1="550"
                  x2="700"
                  y2="300"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#FF4757" />
                  <stop offset="30%" stopColor="#FF2A6D" />
                  <stop offset="65%" stopColor="#BC2676" />
                  <stop offset="100%" stopColor="#7E1D50" />
                </linearGradient>

                {/* Soft glow filter */}
                <filter id="softGlow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="8" stdDeviation="16" floodColor="#000000" floodOpacity="0.5" />
                </filter>
              </defs>

              {/* Upper Right Sharp Electric Yellow Chevron */}
              <path
                d="M440 90 L680 90 L880 200 L840 260 L650 150 L440 150 Z"
                fill="#FFDD00"
                opacity="0.98"
                filter="url(#softGlow)"
              />
              <polygon
                points="680,90 920,200 860,280 650,150"
                fill="#FFE500"
              />

              {/* Lower Left Fiery Coral to Magenta Gradient Polygon Ribbon */}
              <path
                d="M60 540 L180 430 L550 560 L460 625 L0 625 L0 570 Z"
                fill="url(#zetaMagentaRibbon)"
                opacity="0.95"
              />
              <polygon
                points="180,430 450,220 580,300 350,500"
                fill="url(#zetaMagentaRibbon)"
                opacity="0.75"
              />
              <polygon
                points="350,500 550,560 680,440 520,380"
                fill="#9B1B56"
                opacity="0.65"
              />
            </svg>
          </div>

          {/* Cheerful Collaborative Team Centerpiece */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-[82%] h-[82%] overflow-hidden rounded-xl shadow-lg border border-white/5">
              <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=80"
                alt="Zeta QA Collaborative Team"
                className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              {/* Subtle dual-tone overlay blending with Zeta geometric shapes */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b1020] via-transparent to-[#0b1020]/40 mix-blend-multiply pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#9B1B56]/25 via-transparent to-[#FFE500]/15 pointer-events-none" />
            </div>
          </div>

          {/* Foreground Dynamic Accents */}
          <div className="absolute inset-0 pointer-events-none">
            <svg
              className="w-full h-full"
              viewBox="0 0 1000 625"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid slice"
            >
              {/* Foreground lower angled slice framing the text */}
              <polygon
                points="0,480 320,480 180,625 0,625"
                fill="url(#zetaMagentaRibbon)"
                opacity="0.4"
              />
            </svg>
          </div>

          {/* Top-Right Badge: Zeta QA Operations */}
          <div className="relative z-10 flex justify-end p-4 sm:p-5 pointer-events-none">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white/90 text-xs font-semibold shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#FFE500]" />
              <span>QA Excellence</span>
            </div>
          </div>

          {/* Bottom-Left Headline & Subtitle matching the exact image text */}
          <div className="relative z-10 p-6 sm:p-8 lg:p-9 max-w-xl bg-gradient-to-t from-[#0b1020] via-[#0b1020]/80 to-transparent">
            <h2 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-white tracking-tight leading-snug drop-shadow-md">
              Empower your QA Workflow
            </h2>
            <p className="mt-2 text-xs sm:text-sm lg:text-[14px] text-slate-200/95 font-normal leading-relaxed drop-shadow-sm max-w-md">
              Automate validations, streamline approvals, and launch campaigns with absolute confidence.
            </p>
          </div>

          {/* Convenient file upload trigger for the user's custom PNG */}
          <label className="absolute bottom-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-xs bg-black/70 hover:bg-black text-white/80 hover:text-white px-2.5 py-1.5 rounded-lg border border-white/20 cursor-pointer shadow-lg backdrop-blur-sm">
            <Upload className="w-3.5 h-3.5" />
            <span>Use Custom Image</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      )}
    </div>
  );
}

export default QaBannerShowcase;
