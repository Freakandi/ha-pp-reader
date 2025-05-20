export function createThemeToggle(container) {
  const toggleWrapper = document.createElement('div');
  toggleWrapper.id = 'theme-toggle-wrapper';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'theme-toggle';

  // Zustand beim Laden wiederherstellen
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark-mode');
    checkbox.checked = true;
  }

  checkbox.addEventListener('change', () => {
    const isDarkMode = checkbox.checked;
    document.documentElement.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  });

  toggleWrapper.appendChild(checkbox);
  // Neu: In das übergebene Container-Element einfügen
  (container || document.body).appendChild(toggleWrapper);
}

