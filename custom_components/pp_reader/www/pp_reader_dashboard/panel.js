// Die Panel-Logik muss das Dashboard-Modul laden, bevor der Custom Element Code
// ausgeführt wird. Wir nutzen Top-Level-Await, um das gebaute Bundle zu
// importieren und optional den Dev-Server für Hot-Reloading zu booten.
const DASHBOARD_MODULE_SPECIFIER = './js/dashboard.module.js';
const DEV_SERVER_QUERY_PARAM = 'pp_reader_dev_server';
const DEV_SERVER_STORAGE_KEY = 'pp_reader:viteDevServer';
const DEV_SERVER_GLOBAL_KEY = '__PP_READER_VITE_DEV_SERVER__';

function normaliseDevServerUrl(candidate) {
  if (typeof candidate !== 'string') {
    return null;
  }

  const trimmed = candidate.trim();
  if (!trimmed) {
    return null;
  }

  const ensureProtocol = (value) => {
    try {
      const parsed = new URL(value);
      return parsed;
    } catch (error) {
      try {
        const fallback = new URL(`http://${value}`);
        return fallback;
      } catch (fallbackError) {
        console.warn(
          '[pp_reader] Ungültige Dev-Server-URL, kann nicht normalisieren:',
          value,
          fallbackError,
        );
        return null;
      }
    }
  };

  const parsed = ensureProtocol(trimmed);
  if (!parsed) {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    console.warn('[pp_reader] Dev-Server-URL benötigt http oder https:', parsed.href);
    return null;
  }

  const origin = parsed.origin;
  if (!origin) {
    return null;
  }

  return origin.replace(/\/$/, '');
}

function persistDevServerUrl(url) {
  try {
    window.localStorage.setItem(DEV_SERVER_STORAGE_KEY, url);
  } catch (error) {
    console.warn('[pp_reader] Konnte Dev-Server-URL nicht speichern:', error);
  }
}

function clearDevServerPreference() {
  try {
    window.localStorage.removeItem(DEV_SERVER_STORAGE_KEY);
  } catch (error) {
    console.warn('[pp_reader] Konnte Dev-Server-URL nicht entfernen:', error);
  }
}

function resolveDevServerUrl() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const query = new URLSearchParams(window.location.search);
    if (query.has(DEV_SERVER_QUERY_PARAM)) {
      const raw = query.get(DEV_SERVER_QUERY_PARAM);
      if (raw && raw.toLowerCase() === 'disable') {
        clearDevServerPreference();
        console.info('[pp_reader] Dev-Server-Hot-Reload deaktiviert.');
        return null;
      }

      const fromQuery = normaliseDevServerUrl(raw ?? '');
      if (fromQuery) {
        persistDevServerUrl(fromQuery);
        return fromQuery;
      }
    }
  } catch (error) {
    console.warn('[pp_reader] Konnte Dev-Server-Parameter nicht auswerten:', error);
  }

  const globalValue = window[DEV_SERVER_GLOBAL_KEY];
  if (typeof globalValue === 'string') {
    const fromGlobal = normaliseDevServerUrl(globalValue);
    if (fromGlobal) {
      return fromGlobal;
    }
  }

  try {
    const stored = window.localStorage.getItem(DEV_SERVER_STORAGE_KEY);
    const fromStorage = normaliseDevServerUrl(stored ?? '');
    if (fromStorage) {
      return fromStorage;
    }
  } catch (error) {
    console.warn('[pp_reader] Konnte gespeicherte Dev-Server-URL nicht lesen:', error);
  }

  return null;
}

async function bootViaDevServer(devServerUrl) {
  const base = devServerUrl.replace(/\/$/, '');
  await import(/* @vite-ignore */ `${base}/@vite/client`);
  await import(/* @vite-ignore */ `${base}/src/panel.ts`);
}

function resolveModuleUrl(specifier) {
  try {
    const moduleUrl = new URL(specifier, import.meta.url);
    const panelUrl = new URL(import.meta.url);
    if (panelUrl.search && !moduleUrl.search) {
      moduleUrl.search = panelUrl.search;
    }
    return moduleUrl.href;
  } catch (error) {
    console.warn(
      '[pp_reader] Konnte gebündelten Modulpfad nicht auflösen, verwende Fallback-Spezifier.',
      error,
    );
    return specifier;
  }
}

async function loadDashboardModule() {
  const devServerUrl = resolveDevServerUrl();
  if (devServerUrl) {
    try {
      await bootViaDevServer(devServerUrl);
      console.info('[pp_reader] Hot-Reload aktiv über Vite Dev-Server:', devServerUrl);
      return;
    } catch (error) {
      console.warn(
        '[pp_reader] Dev-Server konnte nicht geladen werden, falle auf Bundle zurück.',
        error,
      );
      clearDevServerPreference();
    }
  }

  try {
    const bundledModuleUrl = resolveModuleUrl(DASHBOARD_MODULE_SPECIFIER);
    await import(/* @vite-ignore */ bundledModuleUrl);
  } catch (error) {
    console.error('[pp_reader] Konnte gebündeltes Dashboard nicht laden.', error);
    throw error;
  }
}

await loadDashboardModule();

const PANEL_URL = new URL(import.meta.url);
const ASSET_BASE_URL = new URL('./', PANEL_URL);
const ASSET_VERSION = PANEL_URL.searchParams.get('v');

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

    this._upgradeProperty('hass');
    this._upgradeProperty('panel');
    this._upgradeProperty('route');
    this._upgradeProperty('narrow');

    // NEU: Referenz auf das Dashboard-Element sichern
    this._dashboardEl = container.querySelector('pp-reader-dashboard');
    if (!this._dashboardEl) {
      console.error("[pp_reader] Dashboard Element nicht gefunden – Rendering unmöglich.");
    } else {
      console.debug("[pp_reader] Dashboard Element referenziert.");
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
      const url = new URL(relativePath, ASSET_BASE_URL);
      if (ASSET_VERSION) {
        url.searchParams.set('v', ASSET_VERSION);
      }
      link.href = url.href;
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
    // console.log("PPReaderPanel: hass gesetzt:", this._hass); // Debugging
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

  _upgradeProperty(propertyName) {
    if (!Object.prototype.hasOwnProperty.call(this, propertyName)) {
      return;
    }
    const value = this[propertyName];
    delete this[propertyName];
    this[propertyName] = value;
  }
}

// Custom Element registrieren
if (!customElements.get('pp-reader-panel')) {
  customElements.define('pp-reader-panel', PPReaderPanel);
}
