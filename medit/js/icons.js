// Professional SVG Icon Library for Medit PWA
// 24x24 viewport, consistent stroke width (1.75 - 2px), crisp geometry & rounded joins
window.MEDIT_ICONS = {
  // Navigation & Core Views
  home: (cls = 'w-5 h-5') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 10.5L12 3l9 7.5v9.5a1.5 1.5 0 0 1-1.5 1.5H15a1 1 0 0 1-1-1v-4.5a1.5 1.5 0 0 0-1.5-1.5h-1a1.5 1.5 0 0 0-1.5 1.5V21a1 1 0 0 1-1 1H4.5A1.5 1.5 0 0 1 3 20.5v-10z"/>
    </svg>
  `,

  breathe: (cls = 'w-5 h-5') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 8.5h9.5a3.5 3.5 0 1 0-3.5-3.5"/>
      <path d="M2.5 14h13.5a3.5 3.5 0 1 0-3.5-3.5"/>
      <path d="M5 19.5h7.5a2.5 2.5 0 1 0-2.5-2.5"/>
    </svg>
  `,

  timer: (cls = 'w-5 h-5') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      <circle cx="12" cy="3" r="1"/>
    </svg>
  `,

  learn: (cls = 'w-5 h-5') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      <line x1="8.5" y1="7" x2="15.5" y2="7"/>
      <line x1="8.5" y1="11" x2="13.5" y2="11"/>
    </svg>
  `,

  habits: (cls = 'w-5 h-5') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
    </svg>
  `,

  // Header & Settings
  soundOn: (cls = 'w-4 h-4') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>
  `,

  soundOff: (cls = 'w-4 h-4') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <line x1="23" y1="9" x2="17" y2="15"/>
      <line x1="17" y1="9" x2="23" y2="15"/>
    </svg>
  `,

  settings: (cls = 'w-4 h-4') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3.2"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  `,

  flame: (cls = 'w-4 h-4') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c-.6 1.8-1.5 3.3-2.6 4.6C8.2 8 7 9.8 7 12a5 5 0 0 0 10 0c0-1.8-.8-3.4-1.9-4.8C13.8 5.6 12.8 4 12 2zm0 15a2.5 2.5 0 0 1-2.5-2.5c0-.9.4-1.7 1.1-2.3.4-.3.9-.6 1.4-1.2.5.6 1 .9 1.4 1.2.7.6 1.1 1.4 1.1 2.3A2.5 2.5 0 0 1 12 17z"/>
    </svg>
  `,

  check: (cls = 'w-4 h-4') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  `,

  close: (cls = 'w-4 h-4') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  `,

  play: (cls = 'w-4 h-4') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="6 4 20 12 6 20 6 4"/>
    </svg>
  `,

  pause: (cls = 'w-4 h-4') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1.5"/>
      <rect x="14" y="4" width="4" height="16" rx="1.5"/>
    </svg>
  `,

  reset: (cls = 'w-4 h-4') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
    </svg>
  `,

  sparkle: (cls = 'w-4 h-4') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 6.9 6.9 2.4-6.9 2.4L12 20.6l-2.4-6.9L2.7 11.3l6.9-2.4L12 2z"/>
    </svg>
  `,

  eye: (cls = 'w-4 h-4') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  `,

  eyeOff: (cls = 'w-4 h-4') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  `,

  arrowRight: (cls = 'w-4 h-4') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  `,

  chevronRight: (cls = 'w-4 h-4') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  `,

  chevronDown: (cls = 'w-4 h-4') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  `,

  clock: (cls = 'w-4 h-4') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  `,

  award: (cls = 'w-4 h-4') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="8" r="6"/>
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
    </svg>
  `,

  wave: (cls = 'w-5 h-5') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 12c2.5-4 5.5-4 8 0s5.5 4 8 0 4-2 4-2"/>
      <path d="M2 17c2.5-4 5.5-4 8 0s5.5 4 8 0 4-2 4-2"/>
    </svg>
  `,

  // Anchors SVGs
  laptop: (cls = 'w-5 h-5') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="4" width="18" height="12" rx="2"/>
      <line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  `,

  coffee: (cls = 'w-5 h-5') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
      <line x1="6" y1="1" x2="6" y2="4"/>
      <line x1="10" y1="1" x2="10" y2="4"/>
      <line x1="14" y1="1" x2="14" y2="4"/>
    </svg>
  `,

  calendar: (cls = 'w-5 h-5') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  `,

  door: (cls = 'w-5 h-5') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 21h18"/>
      <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/>
      <circle cx="15" cy="12" r="1" fill="currentColor"/>
    </svg>
  `,

  moon: (cls = 'w-5 h-5') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  `,

  bolt: (cls = 'w-5 h-5') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  `,

  download: (cls = 'w-4 h-4') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  `,

  upload: (cls = 'w-4 h-4') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  `,

  trash: (cls = 'w-4 h-4') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  `,

  shield: (cls = 'w-4 h-4') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  `,

  mobile: (cls = 'w-4 h-4') => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="3"/>
      <line x1="12" y1="18" x2="12.01" y2="18" stroke-width="2"/>
    </svg>
  `
};

// Helper to get anchor icon SVG
window.getAnchorSvg = function(anchorId, cls = 'w-5 h-5') {
  const map = {
    'laptop-close': window.MEDIT_ICONS.laptop,
    'morning-coffee': window.MEDIT_ICONS.coffee,
    'pre-meeting-stop': window.MEDIT_ICONS.calendar,
    'doorway-threshold': window.MEDIT_ICONS.door,
    'night-unplug': window.MEDIT_ICONS.moon,
    'midday-reset': window.MEDIT_ICONS.bolt
  };
  return map[anchorId] ? map[anchorId](cls) : window.MEDIT_ICONS.sparkle(cls);
};
