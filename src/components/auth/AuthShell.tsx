import React from "react";
import { Link } from "react-router-dom";

interface AuthShellProps {
  children: React.ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#080d1a] overflow-x-hidden font-sans">
      {/* LEFTSIDE: Bright, Fully Visible Image Showcase with Clean Top-Left Logo & Big Title with Points */}
      <div className="w-full lg:w-[65%] xl:w-[68%] min-h-[520px] lg:min-h-screen relative flex flex-col justify-between p-6 sm:p-8 lg:p-12 xl:p-14 overflow-hidden text-white select-none">
        {/* Full Bleed Image - Bright and Fully Visible without Darkening Overlays */}
        <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-[#080d1a]">
          <img
            src="/image.png"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://images.prismic.io/zeta-global/aeivC8BOoF08xNHt_cf3bedd3ee5ad018080168985b125309a1c65601.png";
            }}
            alt="Zeta Campaign Quality Assurance"
            className="w-full h-full object-cover object-center select-none"
            referrerPolicy="no-referrer"
          />
          {/* Subtle soft bottom shadow solely for text readability without darkening the rest of the image */}
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#080d1a]/85 via-[#080d1a]/40 to-transparent pointer-events-none" />
        </div>

        {/* LEFT TOP CORNER: Official Zeta Logo - Clean without background, border, or pill container */}
        <div className="relative z-30 self-start flex items-center gap-3 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
          <div className="flex items-center">
            <svg
              width="111"
              height="34"
              viewBox="0 0 111 34"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 sm:h-8 w-auto"
            >
              <g clipPath="url(#clip0_zeta_tl)">
                <path
                  d="M39.3468 10.5153H50.0685L39.2203 23.7249V27.1114L54.2662 27.0874L55.6569 23.7009L44.7329 23.7249L55.6569 10.4673V7.12885L40.7376 7.15286L39.3468 10.5153ZM73.2315 10.5153L74.6476 7.12885H58.565V24.5415C58.565 25.6943 58.8178 26.0066 59.3236 26.4869C59.9558 26.9673 60.3351 27.0874 61.5741 27.0633H73.2062L74.5464 23.7249H62.7626V18.6092H67.8706L69.2867 15.1987H62.7879V10.5153H73.2315ZM103.02 8.83409C102.514 7.7533 101.629 7.15286 100.365 7.15286H98.468L90.2497 27.1114H94.5485L96.445 22.428H104.309L106.206 27.1114H110.505L103.02 8.83409ZM97.5577 19.0415L100.466 11.8363L103.247 19.0415H97.5577ZM95.1554 7.12885H77.505L76.1142 10.4673H83.1693V27.0633H87.19V10.4673H93.7393L95.1554 7.12885Z"
                  fill="#FFFFFF"
                />
                <path
                  d="M15.3998 25.9585L14.4642 21.8996L8.14242 17.0721H0.531006L12.2895 26.0306L13.9837 33.5721L33.5307 17.0721H25.9192L15.3998 25.9585Z"
                  fill="url(#paint1_linear_zeta_tl)"
                />
                <path
                  d="M18.6619 8.18562L19.5722 12.2446L25.9192 17.0721H33.5307L21.7722 8.11357L20.0526 0.572083L0.531006 17.0721H8.14242L18.6619 8.18562Z"
                  fill="url(#paint2_linear_zeta_tl)"
                />
              </g>
              <defs>
                <linearGradient id="paint1_linear_zeta_tl" x1="33.5348" y1="25.3221" x2="0.535129" y2="25.3221" gradientUnits="userSpaceOnUse">
                  <stop offset="0.3987" stopColor="#3b82f6" />
                  <stop offset="1" stopColor="#60a5fa" />
                </linearGradient>
                <linearGradient id="paint2_linear_zeta_tl" x1="0.535153" y1="8.82208" x2="33.5348" y2="8.82208" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#00C2FF" />
                  <stop offset="0.5398" stopColor="#BC2676" />
                  <stop offset="0.8568" stopColor="#FFFB6A" />
                </linearGradient>
                <clipPath id="clip0_zeta_tl">
                  <rect width="110.833" height="33" fill="white" transform="translate(0 0.5)" />
                </clipPath>
              </defs>
            </svg>
          </div>
          <div className="h-5 w-[1.5px] bg-slate-500 mx-0.5" />
          <div className="flex flex-col justify-center text-left">
            <span className="text-[10px] font-bold tracking-wider uppercase text-white leading-none">
              Campaign
            </span>
            <span className="text-[9px] font-medium text-slate-300 tracking-wide leading-tight">
              QA Operations
            </span>
          </div>
        </div>

        {/* BOTTOM CONTENT: Big Title and Points Directly Below Title */}
        <div className="relative z-20 mt-auto pt-10 max-w-3xl text-left">
          {/* Big Simple Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-[44px] xl:text-[48px] font-extrabold text-white tracking-tight leading-[1.1] mb-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
            Empower your QA Workflow
          </h1>

          {/* Four Points directly bottom to title */}
          <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1.5 text-base sm:text-lg lg:text-xl font-bold tracking-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
            <span className="text-white">Simplified</span>
            <span className="text-[#3b82f6]">•</span>
            <span className="text-white">Automated</span>
            <span className="text-[#3b82f6]">•</span>
            <span className="text-white">Integrated</span>
            <span className="text-[#3b82f6]">•</span>
            <span className="text-white">Data-Driven</span>
          </div>
        </div>
      </div>

      {/* RIGHTSIDE: Compact White Login Card Column */}
      <div className="w-full lg:w-[35%] xl:w-[32%] flex flex-col justify-between bg-white min-h-screen p-6 sm:p-8 lg:p-10 xl:p-12 relative z-20 border-l border-slate-200 shadow-2xl">
        {/* Centered Form Wrapper */}
        <div className="my-auto w-full max-w-[360px] mx-auto py-6">
          {children}
        </div>

        {/* Footer with Privacy Policy Link */}
        <div className="mt-auto pt-4 text-center text-xs text-slate-400">
          &copy; 2001 &ndash; 2026 ZETA. All rights reserved |{" "}
          <Link
            to="/privacy"
            className="text-slate-500 hover:text-[#306de4] transition-colors underline"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AuthShell;
