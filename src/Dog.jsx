import React from "react";
export default function Dog({
  pose = "welcome",
  color = "#805e49",
  accessory = true,
  className = "",
}) {
  const happy = pose === "celebrate",
    thinking = pose === "thinking";
  return (
    <svg
      className={`dog ${className}`}
      viewBox="0 0 250 230"
      role="img"
      aria-label={`Petit brabançon, ${{ welcome: "accueil", thinking: "réflexion", shopping: "courses", prepare: "préparation", celebrate: "félicitations" }[pose]}`}
    >
      <defs>
        <linearGradient id={`fur-${pose}`} x2=".8" y2="1">
          <stop stopColor={color} />
          <stop offset="1" stopColor="#553c31" />
        </linearGradient>
      </defs>
      <ellipse cx="125" cy="215" rx="71" ry="9" fill="#dcd7c9" opacity=".55" />
      {happy && (
        <g fill="#e6ab64">
          <path d="m36 51 3-12 4 11 12 3-12 4-4 11-3-12-12-3z" />
          <path d="m210 85 2-9 3 8 8 3-8 2-3 9-2-8-9-3z" />
        </g>
      )}
      <path
        d="M164 160q59-9 35 27q-9 12-20-2"
        fill="none"
        stroke={color}
        strokeWidth="17"
        strokeLinecap="round"
      />
      <path
        d="M77 151q-8 30-1 53q8 14 22 3l10-30 23 1 9 28q15 9 24-2 9-35-8-58"
        fill={`url(#fur-${pose})`}
      />
      <path d="M101 158q19 26 39 0l-4 29-16 7-19-14z" fill="#c3a184" />
      <path
        d="M66 86Q35 85 47 51q3-14 20-7l29 16-20 31-8-27M159 60l24-17q18-9 23 8 13 35-14 41l-10-29-4 23"
        fill="#3e2d28"
        stroke="#3e2d28"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <path d="m54 54 6 21 12-13M195 54l-13 9 12 13" fill="#b28a71" />
      <path
        d="M56 99Q50 52 117 48q73-5 83 45 10 50-30 70-23 15-59 6-56-8-55-70"
        fill={`url(#fur-${pose})`}
      />
      <path
        d="M63 106q13-39 40-18l-5 35-28 5M147 86q30-22 45 18l-5 24-36-3"
        fill="#3d302b"
      />
      <ellipse cx="87" cy="106" rx="16" ry={happy ? 8 : 19} fill="#fff5e8" />
      <ellipse cx="166" cy="106" rx="16" ry={happy ? 8 : 19} fill="#fff5e8" />
      <ellipse
        cx={thinking ? 91 : 89}
        cy="109"
        rx="10"
        ry={happy ? 5 : 13}
        fill="#271e1b"
      />
      <ellipse
        cx={thinking ? 170 : 164}
        cy="109"
        rx="10"
        ry={happy ? 5 : 13}
        fill="#271e1b"
      />
      {!happy && (
        <g fill="white">
          <circle cx="91" cy="102" r="4" />
          <circle cx="167" cy="102" r="4" />
          <circle cx="85" cy="114" r="2" />
          <circle cx="161" cy="114" r="2" />
        </g>
      )}
      <path
        d="M99 131q-19 0-17 17 5 22 39 11 35 12 48-8 9-22-17-22"
        fill="#d0aa8b"
      />
      <path d="M99 128q23-12 47 0 2 20-24 22-23-5-23-22" fill="#302724" />
      <ellipse cx="117" cy="128" rx="8" ry="3" fill="#78635b" />
      <path
        d="M123 147v9m-16 0q16 12 34-1"
        stroke="#45312b"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      {(happy || pose === "welcome") && (
        <path d="M120 160q3 20 15 6l2-9" fill="#df8e88" />
      )}
      <path
        d="M78 87q9-8 20-3m57-1q10-5 19 2"
        stroke="#c8a487"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      {accessory && (
        <path d="m85 168 33 15 36-15-22 34-11-8-11 8z" fill="#b8cdb4" />
      )}
      <path d="M70 204h25m47 1h20" stroke="#3f302a" strokeWidth="2" />
      {pose === "shopping" && (
        <g>
          <path d="m164 166 38-3 9 47-45 3z" fill="#e5b975" />
          <path
            d="M173 168q-7-27 19-5"
            fill="none"
            stroke="#8c6238"
            strokeWidth="3"
          />
          <path d="m185 182-2 17m-8-8 17-2" stroke="#fff4dc" strokeWidth="4" />
        </g>
      )}
      {pose === "prepare" && (
        <g transform="rotate(20 181 170)">
          <path
            d="M180 164v39"
            stroke="#b4b9b4"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path d="m168 145 2 18 12 7 12-10-1-18-8 12-7-2z" fill="#b4b9b4" />
        </g>
      )}
      {thinking && (
        <text x="205" y="55" fill="#8e7ab5" fontSize="30" fontFamily="serif">
          ?
        </text>
      )}
    </svg>
  );
}
