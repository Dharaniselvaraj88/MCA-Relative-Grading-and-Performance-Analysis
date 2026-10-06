import React from 'react';

interface CITLogoProps {
  className?: string;
  size?: number;
}

export const CITLogo: React.FC<CITLogoProps> = ({ className = "w-10 h-10", size }) => {
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <svg
        width={size || "100%"}
        height={size || "100%"}
        viewBox="0 0 300 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm select-none"
      >
        <defs>
          {/* Path for text curve along the navy blue ring */}
          <path
            id="citTextPathTop"
            d="M 42, 150 A 108,108 0 1,1 258, 150 A 108,108 0 1,1 42, 150"
          />
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* 1. Outer Maroon Scalloped Wavy Border */}
        <circle cx="150" cy="150" r="148" fill="#7A0000" />
        
        {/* Scallop wave detail ring */}
        <path
          d="M 150,4 C 160,4 165,12 175,10 C 185,8 188,0 198,2 C 208,4 210,14 219,18 C 228,22 234,14 242,20 C 250,26 251,36 258,44 C 265,52 274,48 279,57 C 284,66 280,76 284,86 C 288,96 296,101 297,112 C 298,123 291,130 291,141 C 291,152 297,160 295,171 C 293,182 284,188 280,198 C 276,208 279,219 273,228 C 267,237 257,238 249,246 C 241,254 242,265 233,271 C 224,277 214,272 204,276 C 194,280 188,290 177,292 C 166,294 159,286 148,286 C 137,286 130,294 119,292 C 108,290 102,280 92,276 C 82,272 72,277 63,271 C 54,265 55,254 47,246 C 39,238 29,237 23,228 C 17,219 20,208 16,198 C 12,188 3,182 1,171 C -1,160 5,152 5,141 C 5,130 -2,123 -1,112 C 0,101 8,96 12,86 C 16,76 12,66 17,57 C 22,48 31,52 38,44 C 45,36 46,26 54,20 C 62,14 68,22 77,18 C 86,14 88,4 98,2 C 108,0 111,8 121,10 C 131,12 136,4 150,4 Z"
          fill="#800000"
          stroke="#500000"
          strokeWidth="2"
        />

        {/* Outer White Divider Circle */}
        <circle cx="150" cy="150" r="138" fill="#FFFFFF" />

        {/* 2. Dark Navy Blue Circular Band */}
        <circle cx="150" cy="150" r="134" fill="#040A50" />

        {/* Circular White Text: COIMBATORE INSTITUTE OF TECHNOLOGY */}
        <text fill="#FFFFFF" fontWeight="900" fontSize="19.5" fontFamily="Arial, Helvetica, sans-serif" letterSpacing="2.2">
          <textPath href="#citTextPathTop" startOffset="50%" textAnchor="middle">
            COIMBATORE INSTITUTE OF TECHNOLOGY  *
          </textPath>
        </text>

        {/* Inner White Divider Circle */}
        <circle cx="150" cy="150" r="88" fill="#FFFFFF" />

        {/* 3. Bright Yellow Inner Ring */}
        <circle cx="150" cy="150" r="85" fill="#FFE500" />

        {/* Inner Maroon Divider Circle */}
        <circle cx="150" cy="150" r="54" fill="#FFFFFF" />

        {/* 4. Central Maroon Emblem Circle */}
        <circle cx="150" cy="150" r="51" fill="#7A0000" />

        {/* Atomic Orbit Ellipses in White/Gold */}
        <g stroke="#FFFFFF" strokeWidth="1.2" fill="none" opacity="0.85">
          <ellipse cx="150" cy="162" rx="28" ry="10" transform="rotate(0 150 162)" />
          <ellipse cx="150" cy="162" rx="28" ry="10" transform="rotate(60 150 162)" />
          <ellipse cx="150" cy="162" rx="28" ry="10" transform="rotate(120 150 162)" />
        </g>

        {/* Central Hands & Chisel/Hammer Emblem */}
        <g stroke="#FFFFFF" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Column / Chisel held in hand */}
          <rect x="146" y="118" width="8" height="28" rx="1" fill="#7A0000" stroke="#FFFFFF" strokeWidth="1.5" />
          <text x="150" y="130" fill="#FFFFFF" fontSize="6.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
            1956
          </text>
          
          {/* Top Hand holding hammer */}
          <path d="M 132 122 C 138 122, 144 120, 148 122" stroke="#FFFFFF" strokeWidth="1.5" />
          <path d="M 152 120 L 168 120" stroke="#FFFFFF" strokeWidth="2.5" />
          <path d="M 144 116 C 142 124, 148 126, 150 124" />

          {/* Lower Hand holding column */}
          <path d="M 134 148 C 140 144, 146 148, 152 148" />
          <path d="M 136 152 C 142 148, 148 152, 154 150" />
        </g>

        {/* 5. Bottom Ribbon: NATURE IN THE SERVICE OF MAN */}
        <g>
          {/* Ribbon Background path */}
          <path
            d="M 112 182 Q 150 196 188 182 L 192 192 Q 150 206 108 192 Z"
            fill="#7A0000"
            stroke="#FFE500"
            strokeWidth="1"
          />
          {/* Ribbon Text */}
          <path id="ribbonPath" d="M 112 188 Q 150 200 188 188" fill="none" />
          <text fill="#FFFFFF" fontSize="6.2" fontWeight="bold" fontFamily="Arial, sans-serif" letterSpacing="0.5">
            <textPath href="#ribbonPath" startOffset="50%" textAnchor="middle">
              NATURE IN THE SERVICE OF MAN
            </textPath>
          </text>
        </g>
      </svg>
    </div>
  );
};
