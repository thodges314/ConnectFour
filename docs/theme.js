// ============================================================
// Connect Four — Theme Switcher
// Toggles between Synthwave (default) and Frutiger Aero.
// Persists choice to localStorage; updates labels and title.
// ============================================================
'use strict';

const THEME_KEY   = 'c4-theme';
const THEME_AERO  = 'aero';

const LABELS = {
  synthwave: {
    tagline: 'Synthwave Edition · Perfect AI',
    title:   'Connect Four — Synthwave AI',
    btnTip:  'Switch to Frutiger Aero',
    btnIcon: '✦',
    p1:      'You (Pink)',
    p2:      'AI (Cyan)',
  },
  aero: {
    tagline: 'Frutiger Aero Edition · Perfect AI',
    title:   'Connect Four — Frutiger Aero AI',
    btnTip:  'Switch to Synthwave',
    btnIcon: '★',
    p1:      'You (Red)',
    p2:      'AI (Gold)',
  },
};

let _currentTheme = 'synthwave';

function _applyTheme(theme, animate) {
  const html   = document.documentElement;
  const btn    = document.getElementById('btn-theme');
  const tagEl  = document.getElementById('tagline-text');
  const p1El   = document.getElementById('p1-label');
  const p2El   = document.getElementById('p2-label');
  const lbl    = LABELS[theme];

  _currentTheme = theme;

  if (animate) {
    // Fade out then swap, then fade in
    html.classList.add('theme-transitioning');
  }

  if (theme === THEME_AERO) {
    html.setAttribute('data-theme', THEME_AERO);
  } else {
    html.removeAttribute('data-theme');
  }

  if (btn) {
    btn.textContent = lbl.btnIcon;
    btn.title       = lbl.btnTip;
  }
  if (tagEl)  tagEl.textContent  = lbl.tagline;
  if (p1El)   p1El.textContent   = lbl.p1;
  if (p2El)   p2El.textContent   = lbl.p2;
  document.title = lbl.title;

  if (animate) {
    // Remove transition lock after CSS transition completes
    setTimeout(() => html.classList.remove('theme-transitioning'), 700);
  }

  localStorage.setItem(THEME_KEY, theme);

  // Notify the game board to re-render cells for the new theme.
  // app.js registers this hook so pieces switch between flat CSS fills
  // (Synthwave) and 3D SVG gradient + overlay elements (Aero).
  if (typeof window._c4OnThemeChange === 'function') {
    window._c4OnThemeChange(theme);
  }
}

function themeToggle() {
  const next = _currentTheme === THEME_AERO ? 'synthwave' : THEME_AERO;
  // Play a subtle click sound if available
  if (typeof soundEngine !== 'undefined') {
    try { soundEngine.playClick(); } catch(e) { /* ignore */ }
  }
  _applyTheme(next, true);
}

function themeInit() {
  const saved = localStorage.getItem(THEME_KEY) || 'synthwave';
  _applyTheme(saved, false);

  const btn = document.getElementById('btn-theme');
  if (btn) btn.addEventListener('click', themeToggle);
}

// Auto-initialise on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', themeInit);
} else {
  themeInit();
}
