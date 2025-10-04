// @ts-nocheck

/**
 * TypeScript entrypoint for the PP Reader panel custom element.
 * Mirrors the legacy panel.js behaviour during the migration.
 */
import './dashboard';

const ASSET_BASE_URL = new URL('./', import.meta.url);

class PPReaderPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="panel-root">
        <header class="header">
          <button class="menu-button" aria-label="Toggle Sidebar">
            <svg viewBox="0 0 24 24" class="menu-icon">
              <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"></path>
            </svg>
          </button>
          <h1 class="title">Portfolio Dashboard</h1>
        </header>
        <div class="wrapper">
          <pp-reader-dashboard></pp-reader-dashboard>
        </div>
      </div>
    `;
    this._loadCss('css/base.css');
    this._loadCss('css/cards.css');
    this._loadCss('css/nav.css');
    this.shadowRoot.appendChild(container);

    // NEU: Referenz auf das Dashboard-Element sichern
    this._dashboardEl = container.querySelector('pp-reader-dashboard');
    if (!this._dashboardEl) {
      console.error('[pp_reader] Dashboard Element nicht gefunden – Rendering unmöglich.');
    } else {
      console.debug('[pp_reader] Dashboard Element referenziert.');
      try {
        if (!window.__ppReaderDashboardElements) {
          window.__ppReaderDashboardElements = new Set();
        }
        window.__ppReaderDashboardElements.add(this._dashboardEl);
      } catch (error) {
        console.warn('[pp_reader] Konnte Dashboard-Referenz nicht registrieren', error);
      }
    }

    try {
      if (!window.__ppReaderPanelHosts) {
        window.__ppReaderPanelHosts = new Set();
      }
      window.__ppReaderPanelHosts.add(this);
    } catch (error) {
      console.warn('[pp_reader] Konnte Panel-Instanz nicht verfolgen', error);
    }

    container.querySelector('.menu-button').addEventListener('click', () => {
      const haMain = document
        .querySelector('home-assistant')
        ?.shadowRoot
        ?.querySelector('home-assistant-main');
      if (haMain) {
        haMain.dispatchEvent(new CustomEvent('hass-toggle-menu', { bubbles: true, composed: true }));
      }
    });

    this._resizeObserver = new ResizeObserver(() => this._updateWidth());
    this._resizeObserver.observe(this);
    this._updateScheduled = false;
  }

  // Funktion zum Laden von CSS-Dateien ins Shadow DOM
  _loadCss(relativePath) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    try {
      link.href = new URL(relativePath, ASSET_BASE_URL).href;
    } catch (error) {
      console.error('[pp_reader] Fehler beim Auflösen des CSS-Pfades', relativePath, error);
      return;
    }
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
    // console.log('PPReaderPanel: hass gesetzt:', this._hass); // Debugging
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
    if (this._updateScheduled) {
      return;
    }

    const runUpdate = () => {
      this._updateScheduled = false;
      this._applyDashboardBindings();
    };

    this._updateScheduled = true;
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(runUpdate);
    } else {
      Promise.resolve().then(runUpdate);
    }
  }

  _applyDashboardBindings() {
    // Fallback: falls beim ersten Setter noch nicht gesetzt, jetzt versuchen
    if (!this._dashboardEl) {
      this._dashboardEl = this.shadowRoot?.querySelector('pp-reader-dashboard') || null;
      if (!this._dashboardEl) return; // nichts zu tun
    }
    if (this._panel) this._dashboardEl.panel = this._panel;
    if (this._route) this._dashboardEl.route = this._route;
    if (this._narrow !== undefined) this._dashboardEl.narrow = this._narrow;
    if (this._hass) this._dashboardEl.hass = this._hass;
  }

  // Cleanup beim Entfernen des Elements
  disconnectedCallback() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    if (window.__ppReaderPanelHosts instanceof Set) {
      window.__ppReaderPanelHosts.delete(this);
    }
    if (window.__ppReaderDashboardElements instanceof Set && this._dashboardEl) {
      window.__ppReaderDashboardElements.delete(this._dashboardEl);
    }
  }
}

// Custom Element registrieren
if (!customElements.get('pp-reader-panel')) {
  customElements.define('pp-reader-panel', PPReaderPanel);
}
