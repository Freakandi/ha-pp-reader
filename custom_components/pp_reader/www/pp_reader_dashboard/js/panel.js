// CSS dynamisch laden
function loadCss(href) {
  if (!document.querySelector(`link[href="${href}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }
}

loadCss('/pp_reader_dashboard/css/base.css');
loadCss('/pp_reader_dashboard/css/cards.css');
loadCss('/pp_reader_dashboard/css/nav.css');
loadCss('/pp_reader_dashboard/css/theme_dark.css');

import './dashboard.js'; // Importiere dein bestehendes Dashboard

class PPReaderPanel extends HTMLElement {
  set hass(hass) {
    // Dashboard-Root-Element einfügen (nur einmal)
    if (!this._initialized) {
      this.innerHTML = `<pp-reader-dashboard></pp-reader-dashboard>`;
      this._initialized = true;
    }
    // Optional: Das hass-Objekt an die Dashboard-Komponente weiterreichen
    this.querySelector('pp-reader-dashboard').hass = hass;
  }
}

customElements.define('pp-reader-panel', PPReaderPanel);