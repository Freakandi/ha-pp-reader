export function createThemeToggle() {
  const toggleWrapper = document.createElement('div');
  toggleWrapper.id = 'theme-toggle-wrapper';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'theme-toggle';

  checkbox.addEventListener('change', () => {
    document.documentElement.classList.toggle('dark-mode', checkbox.checked);
  });

  toggleWrapper.appendChild(checkbox);
  document.body.appendChild(toggleWrapper);
}

