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

import './js/dashboard.js'; // Importiere dein bestehendes Dashboard

class PPReaderPanel extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    this._render();
  }
  set narrow(narrow) {
    this._narrow = narrow;
    this._render();
  }
  set route(route) {
    this._route = route;
    this._render();
  }
  set panel(panel) {
    this._panel = panel;
    this._render();
  }

  _render() {
    if (!this._initialized) {
      this.innerHTML = `<pp-reader-dashboard></pp-reader-dashboard>`;
      this._initialized = true;
    }
    const dashboard = this.querySelector('pp-reader-dashboard');
    if (dashboard) {
      dashboard.hass = this._hass;
      dashboard.narrow = this._narrow;
      dashboard.route = this._route;
      dashboard.panel = this._panel;
    }
  }
}

customElements.define('pp-reader-panel', PPReaderPanel);