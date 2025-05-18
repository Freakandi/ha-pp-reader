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