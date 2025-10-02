import { addSwipeEvents } from './interaction/tab_control.js';
import { renderDashboard, attachPortfolioToggleHandler } from './tabs/overview.js';
import { registerSecurityDetailTab } from './tabs/security_detail.js';
import {
  handleAccountUpdate,
  handleLastFileUpdate,
  handlePortfolioUpdate,
  handlePortfolioPositionsUpdate
} from './data/updateConfigsWS.js';
import { getEntryId } from './data/api.js';

const STICKY_HEADER_ANCHOR_ID = 'pp-reader-sticky-anchor';

const OVERVIEW_TAB_KEY = 'overview';

const baseTabs = [
  { key: OVERVIEW_TAB_KEY, title: 'Dashboard', render: renderDashboard }
];

const detailTabRegistry = new Map();
const detailTabOrder = [];
const securityTabLookup = new Map();
const SECURITY_DETAIL_TAB_PREFIX = 'security:';

function extractSecurityUuidFromKey(key) {
  if (typeof key !== 'string' || !key.startsWith(SECURITY_DETAIL_TAB_PREFIX)) {
    return null;
  }

  const uuid = key.slice(SECURITY_DETAIL_TAB_PREFIX.length);
  return uuid || null;
}

let securityDetailTabFactory = null;
let navigationInProgress = false;

function getVisibleTabs() {
  const detailTabs = detailTabOrder
    .map((key) => detailTabRegistry.get(key))
    .filter(Boolean);

  return [...baseTabs, ...detailTabs];
}

function clampPageIndex(index) {
  const tabs = getVisibleTabs();
  if (!tabs.length) {
    return 0;
  }
  if (index < 0) {
    return 0;
  }
  if (index >= tabs.length) {
    return tabs.length - 1;
  }
  return index;
}

async function navigateToPage(targetIndex, root, hass, panel) {
  const clampedIndex = clampPageIndex(targetIndex);
  if (clampedIndex === currentPage) {
    return;
  }

  if (navigationInProgress) {
    return;
  }

  navigationInProgress = true;
  try {
    currentPage = clampedIndex;
    await renderTab(root, hass, panel);
  } catch (error) {
    console.error('navigateToPage: Fehler beim Rendern des Tabs', error);
  } finally {
    navigationInProgress = false;
  }
}

function navigateByDelta(delta, root, hass, panel) {
  navigateToPage(currentPage + delta, root, hass, panel);
}

export function registerDetailTab(key, descriptor) {
  if (!key || !descriptor || typeof descriptor.render !== 'function') {
    console.error('registerDetailTab: Ungültiger Tab-Descriptor', key, descriptor);
    return;
  }

  const securityUuid = extractSecurityUuidFromKey(key);
  if (securityUuid) {
    const existingKey = securityTabLookup.get(securityUuid);
    if (existingKey && existingKey !== key) {
      unregisterDetailTab(existingKey);
    }
  }

  const normalizedDescriptor = {
    ...descriptor,
    key,
  };

  detailTabRegistry.set(key, normalizedDescriptor);

  if (securityUuid) {
    securityTabLookup.set(securityUuid, key);
  }

  if (!detailTabOrder.includes(key)) {
    detailTabOrder.push(key);
  }
}

export function unregisterDetailTab(key) {
  if (!key) {
    return;
  }

  const descriptor = detailTabRegistry.get(key);
  if (descriptor && typeof descriptor.cleanup === 'function') {
    try {
      descriptor.cleanup({ key });
    } catch (error) {
      console.error('unregisterDetailTab: Fehler beim Ausführen von cleanup', error);
    }
  }

  detailTabRegistry.delete(key);

  const index = detailTabOrder.indexOf(key);
  if (index >= 0) {
    detailTabOrder.splice(index, 1);
  }

  const securityUuid = extractSecurityUuidFromKey(key);
  if (securityUuid && securityTabLookup.get(securityUuid) === key) {
    securityTabLookup.delete(securityUuid);
  }
}

export function hasDetailTab(key) {
  return detailTabRegistry.has(key);
}

export function getDetailTabDescriptor(key) {
  return detailTabRegistry.get(key) || null;
}

export function setSecurityDetailTabFactory(factory) {
  if (factory != null && typeof factory !== 'function') {
    console.error('setSecurityDetailTabFactory: Erwartet Funktion oder null', factory);
    return;
  }

  securityDetailTabFactory = factory || null;
}

function getSecurityDetailTabKey(securityUuid) {
  return `${SECURITY_DETAIL_TAB_PREFIX}${securityUuid}`;
}

function findDashboardElement() {
  const registered = window.__ppReaderDashboardElements;
  if (registered instanceof Set) {
    for (const element of registered) {
      if (element && element.isConnected) {
        return element;
      }
    }
  }

  const direct = document.querySelector('pp-reader-dashboard');
  if (direct) {
    return direct;
  }

  const panelElements = document.querySelectorAll('pp-reader-panel');
  for (const panelElement of panelElements) {
    if (!panelElement || !panelElement.shadowRoot) {
      continue;
    }

    const nested = panelElement.shadowRoot.querySelector('pp-reader-dashboard');
    if (nested) {
      return nested;
    }
  }

  return null;
}

function requestDashboardRender() {
  const dashboardElement = findDashboardElement();
  if (!dashboardElement) {
    console.warn('requestDashboardRender: Kein pp-reader-dashboard Element gefunden');
    return;
  }

  if (typeof dashboardElement._renderIfInitialized === 'function') {
    dashboardElement._renderIfInitialized();
    return;
  }

  if (typeof dashboardElement._render === 'function') {
    dashboardElement._render();
  }
}

export function openSecurityDetail(securityUuid) {
  if (!securityUuid) {
    console.error('openSecurityDetail: Ungültige securityUuid', securityUuid);
    return false;
  }

  const tabKey = getSecurityDetailTabKey(securityUuid);
  let descriptor = getDetailTabDescriptor(tabKey);

  if (!descriptor && typeof securityDetailTabFactory === 'function') {
    try {
      const maybeDescriptor = securityDetailTabFactory(securityUuid);
      if (maybeDescriptor && typeof maybeDescriptor.render === 'function') {
        registerDetailTab(tabKey, maybeDescriptor);
        descriptor = getDetailTabDescriptor(tabKey);
      } else {
        console.error('openSecurityDetail: Factory lieferte ungültigen Descriptor', maybeDescriptor);
      }
    } catch (error) {
      console.error('openSecurityDetail: Fehler beim Erzeugen des Tab-Descriptors', error);
    }
  }

  if (!descriptor) {
    console.warn(`openSecurityDetail: Kein Detail-Tab für ${securityUuid} verfügbar`);
    return false;
  }

  const tabs = getVisibleTabs();
  let targetIndex = tabs.findIndex((tab) => tab.key === tabKey);

  if (targetIndex === -1) {
    const updatedTabs = getVisibleTabs();
    targetIndex = updatedTabs.findIndex((tab) => tab.key === tabKey);
    if (targetIndex === -1) {
      console.error('openSecurityDetail: Tab nach Registrierung nicht auffindbar');
      return false;
    }
  }

  currentPage = targetIndex;
  requestDashboardRender();
  return true;
}

export function closeSecurityDetail(securityUuid) {
  if (!securityUuid) {
    console.error('closeSecurityDetail: Ungültige securityUuid', securityUuid);
    return false;
  }

  const tabKey = getSecurityDetailTabKey(securityUuid);
  if (!hasDetailTab(tabKey)) {
    return false;
  }

  const tabsBefore = getVisibleTabs();
  const tabIndexBefore = tabsBefore.findIndex((tab) => tab.key === tabKey);
  const wasActive = tabIndexBefore === currentPage;

  unregisterDetailTab(tabKey);

  const tabsAfter = getVisibleTabs();
  if (!tabsAfter.length) {
    currentPage = 0;
    requestDashboardRender();
    return true;
  }

  if (wasActive) {
    const overviewIndex = tabsAfter.findIndex((tab) => tab.key === OVERVIEW_TAB_KEY);
    if (overviewIndex >= 0) {
      currentPage = overviewIndex;
    } else {
      currentPage = Math.min(Math.max(tabIndexBefore - 1, 0), tabsAfter.length - 1);
    }
  } else if (currentPage >= tabsAfter.length) {
    currentPage = Math.max(0, tabsAfter.length - 1);
  }

  requestDashboardRender();
  return true;
}

let currentPage = 0;
let observer; // Globale Variable für Debugging

async function renderTab(root, hass, panel) {
  // Fallback: Panel-Konfiguration aus hass.panels ableiten, falls panel undefined
  let effectivePanel = panel;
  if (!effectivePanel && hass?.panels) {
    // Versuche spezifische Keys
    effectivePanel =
      hass.panels.ppreader ||
      hass.panels.pp_reader ||
      // Suche nach unserem Webcomponent
      Object.values(hass.panels).find(p => p?.webcomponent_name === 'pp-reader-panel') ||
      null;
  }

  const tabs = getVisibleTabs();
  if (currentPage >= tabs.length) {
    currentPage = Math.max(0, tabs.length - 1);
  }

  const tab = tabs[currentPage];
  if (!tab || !tab.render) {
    console.error("renderTab: Kein gültiger Tab oder keine render-Methode gefunden!");
    return;
  }

  let content;
  try {
    content = await tab.render(root, hass, effectivePanel); // effectivePanel statt panel
  } catch (error) {
    console.error("renderTab: Fehler beim Rendern des Tabs:", error);
    root.innerHTML = `<div class="card"><h2>Fehler</h2><pre>${(error && error.message) || error}</pre></div>`;
    return;
  }

  if (!root) {
    console.error("renderTab: Root-Element nicht gefunden!");
    return;
  }

  root.innerHTML = content;

  // NEU (Section 6): Scoped Listener für Portfolio-Expand nur für Overview-Tab (Index 0 / Titel 'Dashboard')
  if (tab.render === renderDashboard) {
    attachPortfolioToggleHandler(root);
  }

  // Warte, bis die `.header-card` im DOM verfügbar ist
  const waitForHeaderCard = () => new Promise((resolve) => {
    const interval = setInterval(() => {
      const headerCard = root.querySelector('.header-card');
      if (headerCard) {
        clearInterval(interval);
        resolve(headerCard);
      }
    }, 50);
  });

  const headerCard = await waitForHeaderCard();
  if (!headerCard) {
    console.error("Header-Card nicht gefunden!");
    return;
  }

  // Sticky-Anchor für IntersectionObserver erstellen (scoped innerhalb des Root-Elements)
  let anchor = root.querySelector(`#${STICKY_HEADER_ANCHOR_ID}`);
  if (!anchor) {
    anchor = document.createElement('div');
    anchor.id = STICKY_HEADER_ANCHOR_ID;
    headerCard.parentNode.insertBefore(anchor, headerCard);
  }

  // Navigation und Scrollverhalten einrichten
  setupNavigation(root, hass, panel); // Lokale Parameter übergeben
  setupSwipeOnHeaderCard(root, hass, panel); // Lokale Parameter übergeben
  setupHeaderScrollBehavior(root);
}

function setupHeaderScrollBehavior(root) {
  const headerCard = root.querySelector('.header-card');
  const scrollBorder = root;
  const anchor = root.querySelector(`#${STICKY_HEADER_ANCHOR_ID}`);

  if (!headerCard || !scrollBorder || !anchor) {
    console.error("Fehlende Elemente für das Scrollverhalten: headerCard, scrollBorder oder anchor.");
    return;
  }

  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) {
        headerCard.classList.add('sticky');
      } else {
        headerCard.classList.remove('sticky');
      }
    },
    {
      root: null,
      rootMargin: `0px 0px 0px 0px`,
      threshold: 0
    }
  );

  observer.observe(anchor);
}

function setupSwipeOnHeaderCard(root, hass, panel) {
  const headerCard = root.querySelector('.header-card');
  if (!headerCard) {
    console.error("Header-Card nicht gefunden!");
    return;
  }

  addSwipeEvents(
    headerCard,
    () => navigateByDelta(1, root, hass, panel),
    () => navigateByDelta(-1, root, hass, panel)
  );
}

function setupNavigation(root, hass, panel) {
  const headerCard = root.querySelector('.header-card');
  if (!headerCard) {
    console.error("Header-Card nicht gefunden!");
    return;
  }

  const navLeft = headerCard.querySelector('#nav-left');
  const navRight = headerCard.querySelector('#nav-right');

  if (!navLeft || !navRight) {
    console.error("Navigationspfeile nicht gefunden!");
    return;
  }

  navLeft.addEventListener('click', () => {
    navigateByDelta(-1, root, hass, panel);
  });

  navRight.addEventListener('click', () => {
    navigateByDelta(1, root, hass, panel);
  });

  updateNavigationState(headerCard); // Initialer Zustand der Navigationspfeile
}

function updateNavigationState(headerCard) {
  const navLeft = headerCard.querySelector('#nav-left');
  const navRight = headerCard.querySelector('#nav-right');

  if (navLeft) {
    if (currentPage === 0) {
      navLeft.disabled = true;
      navLeft.classList.add('disabled');
    } else {
      navLeft.disabled = false;
      navLeft.classList.remove('disabled');
    }
  }

  if (navRight) {
    const tabs = getVisibleTabs();
    if (currentPage === tabs.length - 1) {
      navRight.disabled = true;
      navRight.classList.add('disabled');
    } else {
      navRight.disabled = false;
      navRight.classList.remove('disabled');
    }
  }
}

class PPReaderDashboard extends HTMLElement {
  constructor() {
    super();
    this._root = document.createElement('div');
    this._root.className = 'pp-reader-dashboard';
    this.appendChild(this._root);

    this._lastPanel = null;
    this._lastNarrow = null;
    this._lastRoute = null;
    this._lastPage = null;
    this._scrollPositions = {}; // Speichert die Scroll-Position pro Tab

    this._unsubscribeEvents = null; // Event-Bus-Listener für Updates
    this._initialized = false; // Initialisierungs-Flag
    this._hasNewData = false; // Flag für neue Daten
    this._pendingUpdates = []; // Gespeicherte WS-Updates zur Re-Anwendung nach Re-Renders
    this._entryIdWaitWarned = false; // Verhindert Log-Spam während wir auf entry_id warten
  }

  set hass(hass) {
    this._hass = hass;
    this._checkInitialization(); // Überprüfe die Initialisierung
  }

  set panel(panel) {
    if (this._panel === panel) {
      return;
    }
    this._panel = panel;
    // Debug
    // console.debug("PPReaderDashboard: panel setter", panel);
    this._checkInitialization();
  }

  set narrow(narrow) {
    if (this._narrow === narrow) {
      return;
    }
    this._narrow = narrow;
    this._renderIfInitialized(); // Rendere nur, wenn initialisiert
  }

  set route(route) {
    if (this._route === route) {
      return;
    }
    this._route = route;
    this._renderIfInitialized(); // Rendere nur, wenn initialisiert
  }

  connectedCallback() {
    this._checkInitialization();
  }

  disconnectedCallback() {
    // Wenn das Element aus dem DOM fliegt, sauber abmelden
    if (typeof this._unsubscribeEvents === "function") {
      this._unsubscribeEvents();
      // console.debug("PPReaderDashboard: Event-Listener entfernt");
      this._unsubscribeEvents = null;
    }
    super.disconnectedCallback && super.disconnectedCallback();
  }

  _checkInitialization() {
    if (!this._hass || this._initialized) return;

    // Panel-Fallback falls nicht gesetzt
    if (!this._panel && this._hass.panels) {
      this._panel =
        this._hass.panels.ppreader ||
        this._hass.panels.pp_reader ||
        Object.values(this._hass.panels).find(p => p?.config?._panel_custom?.module_url?.includes('pp_reader_dashboard')) ||
        null;
    }

    const entryId = getEntryId(this._hass, this._panel);
    if (!entryId) {
      if (!this._entryIdWaitWarned) {
        console.warn("PPReaderDashboard: kein entry_id ermittelbar – warte auf Panel-Konfiguration.");
        this._entryIdWaitWarned = true;
      }
      return;
    }

    this._entryIdWaitWarned = false;
    console.debug("PPReaderDashboard: entry_id (fallback) =", entryId);
    this._initialized = true;
    this._initializeEventListeners(entryId);
    this._render();
  }

  _initializeEventListeners(entryId) {
    // Wenn schon mal registriert, vorher sauber abmelden
    if (this._unsubscribeEvents) {
      this._unsubscribeEvents();
      this._unsubscribeEvents = null;
    }

    const conn = this._hass?.connection;
    if (!conn || typeof conn.subscribeEvents !== "function") {
      console.error("PPReaderDashboard: keine valide WebSocket-Verbindung oder subscribeEvents fehlt");
      return;
    }

    // Korrektur: Richtiger Event-Typ ist 'panels_updated' (Wert von HA CONST EVENT_PANELS_UPDATED)
    // Zur Sicherheit auch Legacy-Fehlwert registrieren (wird einfach nie feuern)
    const eventTypes = ["panels_updated"]; // früher fälschlich: "EVENT_PANELS_UPDATED"

    const subs = [];
    Promise.all(
      eventTypes.map(et =>
        conn
          .subscribeEvents(this._handleBusEvent.bind(this), et)
          .then(unsub => {
            if (typeof unsub === "function") {
              subs.push(unsub);
              console.debug("PPReaderDashboard: subscribed to", et);
            } else {
              console.error("PPReaderDashboard: subscribeEvents lieferte kein Unsubscribe-Func für", et, unsub);
            }
          })
          .catch(err => {
            console.error("PPReaderDashboard: Fehler bei subscribeEvents für", et, err);
          })
      )
    ).then(() => {
      this._unsubscribeEvents = () => {
        subs.forEach(f => {
          try { f(); } catch (e) { /* noop */ }
        });
        console.debug("PPReaderDashboard: alle Event-Subscriptions entfernt");
      };
    });
  }

  _removeEventListeners() {
    if (typeof this._unsubscribeEvents === "function") {
      try {
        this._unsubscribeEvents();
        this._unsubscribeEvents = null;
        // console.debug("PPReaderDashboard: Event-Listener erfolgreich entfernt.");
      } catch (error) {
        console.error("PPReaderDashboard: Fehler beim Entfernen der Event-Listener:", error);
      }
    } else {
      console.warn("PPReaderDashboard: Kein gültiger Event-Listener zum Entfernen gefunden.");
    }
  }

  _handleBusEvent(event) {
    const currentEntryId = getEntryId(this._hass, this._panel);
    if (!currentEntryId || event.data.entry_id !== currentEntryId) return;

    console.debug("PPReaderDashboard: Bus-Update erhalten", event.data);

    this._queueUpdate(event.data.data_type, event.data.data);
    // Daten direkt ins Rendern einfließen lassen
    this._doRender(event.data.data_type, event.data.data);
  }

  _doRender(dataType, pushedData) {
    if (dataType === "accounts") {
      handleAccountUpdate(pushedData, this._root);
    } else if (dataType === "last_file_update") {
      handleLastFileUpdate(pushedData, this._root);
    } else if (dataType === "portfolio_values") {
      handlePortfolioUpdate(pushedData, this._root);
    } else if (dataType === "portfolio_positions") {
      // NEU: Einzelpositions-Update für ein bestimmtes Depot
      handlePortfolioPositionsUpdate(pushedData, this._root);
    } else {
      console.warn("PPReaderDashboard: Unbekannter Datentyp:", dataType);
    }
  }

  _queueUpdate(dataType, pushedData) {
    if (!dataType) {
      return;
    }

    if (!Array.isArray(this._pendingUpdates)) {
      this._pendingUpdates = [];
    }

    const entry = { type: dataType, data: this._cloneData(pushedData) };

    let index = -1;
    if (dataType === "portfolio_positions" && pushedData && pushedData.portfolio_uuid) {
      index = this._pendingUpdates.findIndex(
        (item) =>
          item.type === dataType &&
          item.data &&
          item.data.portfolio_uuid === pushedData.portfolio_uuid
      );
    } else {
      index = this._pendingUpdates.findIndex(item => item.type === dataType);
    }

    if (index >= 0) {
      this._pendingUpdates[index] = entry;
    } else {
      this._pendingUpdates.push(entry);
    }

    this._hasNewData = true;
  }

  _cloneData(data) {
    if (data == null) {
      return data;
    }
    try {
      if (typeof structuredClone === "function") {
        return structuredClone(data);
      }
    } catch (err) {
      console.warn("PPReaderDashboard: structuredClone fehlgeschlagen, falle auf JSON zurück", err);
    }
    try {
      return JSON.parse(JSON.stringify(data));
    } catch (err) {
      console.warn("PPReaderDashboard: JSON-Clone fehlgeschlagen, referenziere Originaldaten", err);
      return data;
    }
  }

  _reapplyPendingUpdates() {
    if (!Array.isArray(this._pendingUpdates) || this._pendingUpdates.length === 0) {
      return;
    }

    for (const item of this._pendingUpdates) {
      try {
        this._doRender(item.type, this._cloneData(item.data));
      } catch (error) {
        console.error("PPReaderDashboard: Fehler beim erneuten Anwenden eines Updates", item, error);
      }
    }
  }

  _renderIfInitialized() {
    // Rendere nur, wenn die Initialisierung abgeschlossen ist
    if (this._initialized) {
      this._render();
    }
  }

  _render() {
    if (!this._hass) {
      console.warn("pp-reader-dashboard: noch kein hass, überspringe _render()");
      return;
    }
    if (!this._initialized) {
      console.debug("pp-reader-dashboard: _render aufgerufen bevor initialisiert");
      return;
    }

    // Prüfen, ob ein Render notwendig ist
    const page = currentPage;
    if (
      !this._hasNewData && // Nur rendern, wenn neue Daten vorliegen
      this._panel === this._lastPanel &&
      this._narrow === this._lastNarrow &&
      this._route === this._lastRoute &&
      this._lastPage === page
    ) {
      // console.log("pp-reader-dashboard: keine Änderungen → skip render");
      return;
    }

    // Alte Scroll-Position merken (pro Tab)
    if (this._lastPage != null) {
      this._scrollPositions[this._lastPage] = this._root.scrollTop;
    }

    const maybePromise = renderTab(this._root, this._hass, this._panel);
    if (maybePromise && typeof maybePromise.then === "function") {
      maybePromise
        .then(() => {
          this._afterRender(page);
        })
        .catch((error) => {
          console.error("PPReaderDashboard: Fehler beim Rendern des Tabs", error);
          this._afterRender(page);
        });
    } else {
      this._afterRender(page);
    }
  }

  _afterRender(page) {
    if (!this._root) {
      return;
    }

    const restore = this._scrollPositions[page] || 0;
    this._root.scrollTop = restore;

    this._lastPanel = this._panel;
    this._lastNarrow = this._narrow;
    this._lastRoute = this._route;
    this._lastPage = page;

    try {
      this._reapplyPendingUpdates();
    } catch (error) {
      console.error("PPReaderDashboard: Fehler beim Wiederanlegen der Updates", error);
    }

    this._hasNewData = false;
  }
}

if (!customElements.get('pp-reader-dashboard')) {
  customElements.define('pp-reader-dashboard', PPReaderDashboard);
}

console.log("PPReader dashboard.js v20250914b geladen");

registerSecurityDetailTab({
  setSecurityDetailTabFactory,
});
