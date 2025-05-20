export function createThemeToggle(container) {
  const toggleWrapper = document.createElement('div');
  toggleWrapper.id = 'theme-toggle-wrapper';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'theme-toggle';

  // Ziel: pp-reader-dashboard im Shadow-DOM finden oder container selbst verwenden
  let target = null;
  if (container) {
    if (container.tagName === 'PP-READER-DASHBOARD') {
      target = container;
    } else {
      target = container.querySelector('pp-reader-dashboard');
    }
  }
  if (!target) {
    console.warn('pp-reader-dashboard nicht gefunden, ThemeToggle ohne Funktion.');
    return;
  }

  // Zustand beim Laden wiederherstellen
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    target.classList.add('dark-mode');
    checkbox.checked = true;
  }

  checkbox.addEventListener('change', () => {
    const isDarkMode = checkbox.checked;
    target.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  });

  toggleWrapper.appendChild(checkbox);
  container.appendChild(toggleWrapper);
}

