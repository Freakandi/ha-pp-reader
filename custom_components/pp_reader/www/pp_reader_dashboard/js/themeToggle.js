export function createThemeToggle() {
  const button = document.createElement('button');
  button.id = 'theme-toggle';
  button.textContent = 'Dark Mode';
  button.style.position = 'fixed';
  button.style.top = '1rem';
  button.style.right = '1rem';
  button.style.padding = '0.5rem 1rem';
  button.style.border = 'none';
  button.style.borderRadius = '0.5rem';
  button.style.cursor = 'pointer';
  button.style.background = '#3b82f6';
  button.style.color = '#fff';
  button.style.fontSize = '0.9rem';
  button.style.zIndex = '1000';

  button.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark-mode');
    button.textContent = document.documentElement.classList.contains('dark-mode') ? 'Light Mode' : 'Dark Mode';
  });

  document.body.appendChild(button);
}

