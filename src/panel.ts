/**
 * TypeScript entrypoint for the PP Reader panel custom element.
 * Mirrors the legacy panel.js behaviour during the migration.
 */
import './dashboard';
import type { DashboardElement } from './dashboard/registry';
import {
  registerDashboardElement,
  registerPanelHost,
  unregisterDashboardElement,
  unregisterPanelHost,
} from './dashboard/registry';
import type {
  HassPanel,
  HassRoute,
  HomeAssistant,
} from './types/home-assistant';

type PanelConfigLike = HassPanel | Record<string, unknown> | null | undefined;

interface DashboardHostElement extends DashboardElement {
  hass?: HomeAssistant | null | undefined;
  narrow?: boolean | null | undefined;
  route?: HassRoute | null | undefined;
  panel?: PanelConfigLike;
}

const PANEL_URL = new URL(import.meta.url);
const ASSET_BASE_URL = new URL('./', PANEL_URL);
const ASSET_VERSION = PANEL_URL.searchParams.get('v');

class PPReaderPanel extends HTMLElement {
  private _dashboardEl: DashboardHostElement | null = null;
  private _resizeObserver: ResizeObserver | null = null;
  private _updateScheduled = false;
  private _hass: HomeAssistant | null | undefined = undefined;
  private _narrow: boolean | null | undefined = undefined;
  private _route: HassRoute | null | undefined = null;
  private _panel: PanelConfigLike = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
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
    shadow.appendChild(container);

    this._upgradeProperty('hass');
    this._upgradeProperty('panel');
    this._upgradeProperty('route');
    this._upgradeProperty('narrow');

    // NEU: Referenz auf das Dashboard-Element sichern
    this._dashboardEl = container.querySelector<DashboardHostElement>('pp-reader-dashboard');
    if (!this._dashboardEl) {
      console.error('[pp_reader] Dashboard Element nicht gefunden – Rendering unmöglich.');
    } else {
      console.debug('[pp_reader] Dashboard Element referenziert.');
      try {
        registerDashboardElement(this._dashboardEl);
      } catch (error) {
        console.warn('[pp_reader] Konnte Dashboard-Referenz nicht registrieren', error);
      }
    }

    try {
      registerPanelHost(this);
    } catch (error) {
      console.warn('[pp_reader] Konnte Panel-Instanz nicht verfolgen', error);
    }

    const menuButton = container.querySelector<HTMLButtonElement>('.menu-button');
    menuButton?.addEventListener('click', () => {
      const haMain = document
        .querySelector('home-assistant')
        ?.shadowRoot
        ?.querySelector('home-assistant-main');
      if (haMain) {
        haMain.dispatchEvent(new CustomEvent('hass-toggle-menu', { bubbles: true, composed: true }));
      }
    });

    this._resizeObserver = new ResizeObserver(() => {
      this._updateWidth();
    });
    this._resizeObserver.observe(this);
  }

  // Funktion zum Laden von CSS-Dateien ins Shadow DOM
  private _loadCss(relativePath: string): void {
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
    this.shadowRoot?.appendChild(link);
  }

  // Dynamische Breitenanpassung
  private _updateWidth(): void {
    const wrapper = this.shadowRoot?.querySelector<HTMLElement>('.wrapper');
    if (wrapper) {
      const panelWidth = this.getBoundingClientRect().width;
      const widthValue = Number.isFinite(panelWidth)
        ? `${String(panelWidth)}px`
        : '0px';
      wrapper.style.setProperty('--panel-width', widthValue);
    }
  }

  // Setter für Home Assistant-Attribute
  set hass(hass: HomeAssistant | null | undefined) {
    this._hass = hass;
    this._updateDashboard();
    // console.log('PPReaderPanel: hass gesetzt:', this._hass); // Debugging
  }
  set narrow(narrow: boolean | null | undefined) {
    this._narrow = narrow;
    this._updateDashboard();
  }
  set route(route: HassRoute | null | undefined) {
    this._route = route;
    this._updateDashboard();
  }
  set panel(panel: PanelConfigLike) {
    this._panel = panel;
    this._updateDashboard();
  }

  // Dashboard aktualisieren
  private _updateDashboard(): void {
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
      void Promise.resolve().then(runUpdate);
    }
  }

  private _applyDashboardBindings(): void {
    // Fallback: falls beim ersten Setter noch nicht gesetzt, jetzt versuchen
    if (!this._dashboardEl) {
      this._dashboardEl =
        this.shadowRoot?.querySelector<DashboardHostElement>('pp-reader-dashboard') || null;
      if (!this._dashboardEl) return; // nichts zu tun
    }
    if (this._panel !== undefined) this._dashboardEl.panel = this._panel;
    if (this._route !== undefined) this._dashboardEl.route = this._route ?? undefined;
    if (this._narrow !== undefined) this._dashboardEl.narrow = this._narrow ?? undefined;
    if (this._hass !== undefined) this._dashboardEl.hass = this._hass ?? undefined;
  }

  // Cleanup beim Entfernen des Elements
  disconnectedCallback(): void {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    unregisterPanelHost(this);
    unregisterDashboardElement(this._dashboardEl);
  }

  private _upgradeProperty(propertyName: keyof this): void {
    if (!Object.prototype.hasOwnProperty.call(this, propertyName)) {
      return;
    }
    const value = this[propertyName];
    Reflect.deleteProperty(this, propertyName);
    this[propertyName] = value;
  }
}

// Custom Element registrieren
if (!customElements.get('pp-reader-panel')) {
  customElements.define('pp-reader-panel', PPReaderPanel);
}
