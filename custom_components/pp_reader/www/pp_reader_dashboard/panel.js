import './js/dashboard.js'; // Importiere das Dashboard

class PPReaderPanel extends HTMLElement {
  constructor() {
    super();
    // Shadow DOM erstellen
    this.attachShadow({ mode: 'open' });

    // Wrapper-Struktur erstellen
    const wrapper = document.createElement('div');
    wrapper.classList.add('wrapper');

    // Dashboard-Container hinzufügen
    const dashboard = document.createElement('pp-reader-dashboard');
    wrapper.appendChild(dashboard);

    // CSS-Dateien ins Shadow DOM laden
    this._loadCss('/pp_reader_dashboard/css/base.css');
    this._loadCss('/pp_reader_dashboard/css/cards.css');
    this._loadCss('/pp_reader_dashboard/css/nav.css');
    this._loadCss('/pp_reader_dashboard/css/theme_dark.css');

    // Wrapper und Stile ins Shadow DOM einfügen
    this.shadowRoot.appendChild(wrapper);

    // ResizeObserver initialisieren
    this._resizeObserver = new ResizeObserver(() => this._updateWidth());
    this._resizeObserver.observe(this);
  }

  // Funktion zum Laden von CSS-Dateien ins Shadow DOM
  _loadCss(href) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    this.shadowRoot.appendChild(link);
  }

  // Dynamische Breitenanpassung
  _updateWidth() {
    const wrapper = this.shadowRoot.querySelector('.wrapper');
    if (wrapper) {
      const panelWidth = this.getBoundingClientRect().width;
      wrapper.style.setProperty('--panel-width', `${panelWidth}px`);
    }
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

  // Cleanup beim Entfernen des Elements
  disconnectedCallback() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  }
}

// Custom Element registrieren
customElements.define('pp-reader-panel', PPReaderPanel);