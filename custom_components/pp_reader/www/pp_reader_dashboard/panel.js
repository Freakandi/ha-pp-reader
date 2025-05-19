import './js/dashboard.js'; // Importiere dein bestehendes Dashboard

// Shadow DOM für das Panel verwenden
class PPReaderPanel extends HTMLElement {
  constructor() {
    super();
    // Shadow DOM erstellen
    this.attachShadow({ mode: 'open' });

    // CSS-Dateien ins Shadow DOM laden
    this._loadCss('/pp_reader_dashboard/css/base.css');
    this._loadCss('/pp_reader_dashboard/css/cards.css');
    this._loadCss('/pp_reader_dashboard/css/nav.css');
    this._loadCss('/pp_reader_dashboard/css/theme_dark.css');

    // Dashboard-Container hinzufügen
    const container = document.createElement('div');
    container.innerHTML = `<pp-reader-dashboard></pp-reader-dashboard>`;
    this.shadowRoot.appendChild(container);
  }

  // Funktion zum Laden von CSS-Dateien ins Shadow DOM
  _loadCss(href) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    this.shadowRoot.appendChild(link);
  }

  // Setter für Home Assistant-Attribute
  set hass(hass) {
    this._hass = hass;
    this._updateDashboard();
  }
  set narrow(narrow) {
    this._narrow = narrow;
    this._updateDashboard();
  }
  set route(route) {
    this._route = route;
    this._updateDashboard();
  }
  set panel(panel) {
    this._panel = panel;
    this._updateDashboard();
  }

  // Dashboard aktualisieren
  _updateDashboard() {
    const dashboard = this.shadowRoot.querySelector('pp-reader-dashboard');
    if (dashboard) {
      dashboard.hass = this._hass;
      dashboard.narrow = this._narrow;
      dashboard.route = this._route;
      dashboard.panel = this._panel;
    }
  }
}

// Custom Element registrieren
customElements.define('pp-reader-panel', PPReaderPanel);