// MenuM — theme.js: Gestor de tema claro / oscuro y sincronización con Pixel 8a

const THEME_STORAGE_KEY = 'menum_theme_pref';
const COLOR_DARK = '#121214';
const COLOR_LIGHT = '#FDFBF7';

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme ? savedTheme : (systemPrefersDark ? 'dark' : 'light');
  applyTheme(initialTheme);

  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark');
      applyTheme(isDark ? 'light' : 'dark');
      if (navigator.vibrate) navigator.vibrate(25);
    });
  }

  // Escuchar cambios de preferencia del sistema si el usuario no ha forzado un tema
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(THEME_STORAGE_KEY)) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
}

function applyTheme(theme) {
  const iconContainer = document.getElementById('theme-icon-container');
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');

  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    if (iconContainer) iconContainer.innerHTML = '<i data-lucide="sun" class="w-5 h-5 text-amber-400"></i>';
    if (metaThemeColor) metaThemeColor.setAttribute('content', COLOR_DARK);
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    if (iconContainer) iconContainer.innerHTML = '<i data-lucide="moon" class="w-5 h-5 text-slate-700"></i>';
    if (metaThemeColor) metaThemeColor.setAttribute('content', COLOR_LIGHT);
  }

  if (window.lucide && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
}
