import React from "react";

export function FacetBackground() {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden select-none pointer-events-none bg-[#050811]">
      {/* Faceted SVG geometric polygon mesh using Zeta Global brand blues on deep black */}
      <svg
        className="w-full h-full object-cover"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="facetBlue1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="facetBlue2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2b61d6" />
            <stop offset="100%" stopColor="#090d16" />
          </linearGradient>
          <linearGradient id="facetBlue3" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#050811" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
          <linearGradient id="facetBlue4" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#0c1322" />
          </linearGradient>
          <linearGradient id="facetBlue5" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#1e40af" />
            <stop offset="100%" stopColor="#050811" />
          </linearGradient>
        </defs>

        {/* Geometric Polygons in Zeta brand blue values */}
        <polygon points="0,0 480,0 260,320" fill="url(#facetBlue1)" opacity="0.9" />
        <polygon points="480,0 1000,0 720,280" fill="url(#facetBlue2)" opacity="0.95" />
        <polygon points="480,0 720,280 260,320" fill="#172554" opacity="0.9" />
        
        <polygon points="1000,0 1000,450 720,280" fill="url(#facetBlue3)" opacity="0.95" />
        <polygon points="1000,450 1000,780 820,560" fill="url(#facetBlue1)" opacity="0.92" />
        <polygon points="720,280 1000,450 820,560" fill="url(#facetBlue5)" opacity="0.88" />

        <polygon points="0,0 260,320 0,420" fill="#090d16" opacity="0.95" />
        <polygon points="0,420 260,320 210,640" fill="url(#facetBlue4)" opacity="0.9" />
        <polygon points="0,420 210,640 0,760" fill="#050811" opacity="0.98" />
        
        {/* Central facets framing card */}
        <polygon points="260,320 720,280 540,610" fill="url(#facetBlue2)" opacity="0.85" />
        <polygon points="260,320 540,610 210,640" fill="#172554" opacity="0.9" />
        <polygon points="720,280 820,560 540,610" fill="#0c1322" opacity="0.95" />

        {/* Lower facets */}
        <polygon points="210,640 540,610 440,1000" fill="url(#facetBlue1)" opacity="0.92" />
        <polygon points="0,760 210,640 0,1000" fill="url(#facetBlue3)" opacity="0.97" />
        <polygon points="0,1000 210,640 440,1000" fill="#050811" opacity="0.98" />

        <polygon points="540,610 820,560 760,860" fill="url(#facetBlue5)" opacity="0.9" />
        <polygon points="540,610 760,860 440,1000" fill="#172554" opacity="0.92" />
        <polygon points="820,560 1000,780 1000,1000" fill="url(#facetBlue3)" opacity="0.95" />
        <polygon points="820,560 1000,1000 760,860" fill="url(#facetBlue4)" opacity="0.92" />
        <polygon points="760,860 1000,1000 440,1000" fill="#04060b" opacity="0.98" />
      </svg>

      {/* Edge gradient smoothly transitioning from pure black on the left */}
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black to-transparent pointer-events-none hidden lg:block" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
    </div>
  );
}
export default FacetBackground;
