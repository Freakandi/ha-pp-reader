export function createThemeToggle(container) {
  const toggleWrapper = document.createElement('div');
  toggleWrapper.id = 'theme-toggle-wrapper';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'theme-toggle';

  // Ziel für die Klasse bestimmen
  let target;
  if (container && container.getRootNode && container.getRootNode().host) {
    target = container.getRootNode().host;
    _console.console.log('Container gefunden, Ziel gesetzt.');
  } else {
    target = document.documentElement;
    _console.console.log('Container nicht gefunden, Standardziel verwendet.');
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
  (container || document.body).appendChild(toggleWrapper);
}

