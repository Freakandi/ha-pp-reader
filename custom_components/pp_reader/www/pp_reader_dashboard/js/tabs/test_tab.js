import { createThemeToggle } from '../interaction/themeToggle.js';

export async function renderTestTab() {
  return `
    <div class="card header-card">
      <h1>Test Tab</h1>
    </div>
    <div class="card">
      <h2>Theme Toggle</h2>
      <div id="theme-toggle-container"></div>
    </div>
  `;
}

customElements.define('pp-test-tab', class extends HTMLElement {
  async connectedCallback() {
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = await renderTestTab();
    createThemeToggle();
  }
});