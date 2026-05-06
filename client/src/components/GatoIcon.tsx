import React from 'react';

export const GatoIcon = ({ className = 'w-12 h-12' }: { className?: string }) => (
  <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="gato-red" x1="12" y1="8" x2="52" y2="58" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ff2d61" />
        <stop offset="1" stopColor="#c90b35" />
      </linearGradient>
      <radialGradient id="gato-white" cx="30%" cy="20%" r="80%">
        <stop stopColor="#ffffff" />
        <stop offset="1" stopColor="#f1f1f1" />
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="30" fill="url(#gato-red)" />
    <path d="M13 34c0-12 8-22 19-22s19 10 19 22c0 10-8 18-19 18s-19-8-19-18Z" fill="url(#gato-white)" />
    <path d="M18 25 14 9c-.4-1.4 1.2-2.5 2.4-1.7l13 9.2Z" fill="#fff" />
    <path d="M46 25 50 9c.4-1.4-1.2-2.5-2.4-1.7l-13 9.2Z" fill="#fff" />
    <path d="M19 23 17 13l8 6Z" fill="#ff7d99" opacity=".75" />
    <path d="M45 23 47 13l-8 6Z" fill="#ff7d99" opacity=".75" />
    <path d="M11 31c0-8 3-15 9-19" fill="none" stroke="#251a2f" strokeWidth="5" strokeLinecap="round" />
    <path d="M53 31c0-8-3-15-9-19" fill="none" stroke="#251a2f" strokeWidth="5" strokeLinecap="round" />
    <rect x="8" y="28" width="8" height="15" rx="4" fill="#ff2d61" />
    <rect x="48" y="28" width="8" height="15" rx="4" fill="#ff2d61" />
    <ellipse cx="25" cy="34" rx="4.2" ry="5.5" fill="#251a2f" />
    <circle cx="26.4" cy="32.2" r="1.4" fill="#fff" />
    <path d="M37 35c2-4 6-4 8 0" fill="none" stroke="#251a2f" strokeWidth="2.8" strokeLinecap="round" />
    <path d="M30 40c1.4-1.3 2.6-1.3 4 0-1.1 2.3-2.9 2.3-4 0Z" fill="#ff2d61" />
    <path d="M29 43c1.4 3 4.6 3 6 0" fill="none" stroke="#b40a35" strokeWidth="2" strokeLinecap="round" />
    <path d="M19 39 9 36M19 43 9 44M45 39l10-3M45 43l10 1" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M25 51 22 61M34 51l-2 10" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M38 49c7 1 14-2 18-8" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
  </svg>
);
