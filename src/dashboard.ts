/**
 * Mirrors the legacy dashboard controller for initial TypeScript migration.
 */

import { addSwipeEvents as addSwipeEventsUnsafe } from './interaction/tab_control';
import {
  renderDashboard,
  attachPortfolioToggleHandler,
  updatePortfolioFooterFromDom,
} from './tabs/overview';
import { registerSecurityDetailTab } from './tabs/security_detail';
import { accountsTabDescriptor } from './views/portfolio/accounts';
import {
  handleAccountUpdate,
  handleLastFileUpdate,
  handlePortfolioUpdate,
  handlePortfolioPositionsUpdate,
  __TEST_ONLY__,
  flushPendingPositions,
  reapplyPositionsSort,
} from './data/updateConfigsWS';
import { getEntryId } from './data/api';
import {
  getRegisteredDashboardElements,
  getRegisteredPanelHosts,
  registerDashboardElement,
  unregisterDashboardElement,
  registerPanelHost,
  unregisterPanelHost,
} from './dashboard/registry';
import type {
  DashboardTabDescriptor,
  PanelConfigLike,
} from './tabs/types';
import type {
  HassEvent,
  HassPanel,
  HassPanels,
  HassRoute,
  HassUnsubscribe,
  HomeAssistant,
} from './types/home-assistant';

export { updatePortfolioFooterFromDom };
export {
  __TEST_ONLY__,
  handlePortfolioPositionsUpdate,
  flushPendingPositions,
  reapplyPositionsSort,
};
export {
  registerDashboardElement,
  unregisterDashboardElement,
  registerPanelHost,
  unregisterPanelHost,
};

type AddSwipeEvents = (
  element: HTMLElement,
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
) => void;

const addSwipeEvents = addSwipeEventsUnsafe as AddSwipeEvents;

type PanelLike = PanelConfigLike | HassPanel | null | undefined;

type AccountsUpdatePayload = Parameters<typeof handleAccountUpdate>[0];
type LastFileUpdatePayload = Parameters<typeof handleLastFileUpdate>[0];
type PortfolioValuesUpdatePayload = Parameters<typeof handlePortfolioUpdate>[0];
type PortfolioPositionsUpdatePayload = Parameters<typeof handlePortfolioPositionsUpdate>[0];

type DashboardUpdateType =
  | 'accounts'
  | 'last_file_update'
  | 'portfolio_values'
  | 'portfolio_positions';

type DashboardUpdatePayloadMap = {
  accounts: AccountsUpdatePayload;
  last_file_update: LastFileUpdatePayload;
  portfolio_values: PortfolioValuesUpdatePayload;
  portfolio_positions: PortfolioPositionsUpdatePayload;
};

type DashboardUpdateQueueEntry<T extends DashboardUpdateType = DashboardUpdateType> = {
  type: T;
  data: DashboardUpdatePayloadMap[T] | null | undefined;
  portfolioUuid?: string | null;
};

interface PanelsUpdatedEventData {
  entry_id?: string | null;
  data_type?: string | null;
  data?: unknown;
  [key: string]: unknown;
}

type PanelsUpdatedEvent = HassEvent<PanelsUpdatedEventData>;

interface DashboardElement extends HTMLElement {
  rememberScrollPosition?: (page?: number) => void;
  _renderIfInitialized?: () => void;
  _render?: () => void;
  handleExternalRender?: (page: number) => void;
}

const STICKY_HEADER_ANCHOR_ID = 'pp-reader-sticky-anchor';
const OVERVIEW_TAB_KEY = 'overview';
const SECURITY_DETAIL_TAB_PREFIX = 'security:';

const baseTabs: DashboardTabDescriptor[] = [
  { key: OVERVIEW_TAB_KEY, title: 'Dashboard', render: renderDashboard },
  accountsTabDescriptor,
];

const detailTabRegistry = new Map<string, DashboardTabDescriptor>();
const detailTabOrder: string[] = [];
const securityTabLookup = new Map<string, string>();

let securityDetailTabFactory: DetailTabFactory | null = null;
let navigationInProgress = false;
let lastClosedSecurityUuid: string | null = null;
let currentPage = 0;
let observer: IntersectionObserver | null = null;

type DetailTabDescriptorInput = {
  title: string;
  render: DashboardTabDescriptor['render'];
  cleanup?: DashboardTabDescriptor['cleanup'];
  key?: string;
  [key: string]: unknown;
};
type DetailTabFactory = (securityUuid: string) => DetailTabDescriptorInput | null | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PromiseLike<T>).then === 'function'
  );
}

function toErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    const trimmed = error.trim();
    return trimmed.length > 0 ? trimmed : 'Unbekannter Fehler';
  }
  if (error instanceof Error) {
    const trimmed = error.message.trim();
    return trimmed.length > 0 ? trimmed : error.name;
  }
  if (error != null) {
    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== '{}') {
        return serialized;
      }
    } catch {
      // Ignore serialization problems and fall back to String().
    }
  }
  return String(error);
}

function isDashboardUpdateType(value: unknown): value is DashboardUpdateType {
  return (
    value === 'accounts' ||
    value === 'last_file_update' ||
    value === 'portfolio_values' ||
    value === 'portfolio_positions'
  );
}

function extractPortfolioUuidFromSingleUpdate(
  update: Record<string, unknown>,
): string | null {
  const uuidCandidate = update['portfolio_uuid'];
  if (typeof uuidCandidate === 'string' && uuidCandidate) {
    return uuidCandidate;
  }
  const camelCaseCandidate = update['portfolioUuid'];
  if (typeof camelCaseCandidate === 'string' && camelCaseCandidate) {
    return camelCaseCandidate;
  }
  return null;
}

function extractPortfolioUuidFromPositionsUpdate(
  update: PortfolioPositionsUpdatePayload | null | undefined,
): string | null {
  if (!update) {
    return null;
  }
  if (Array.isArray(update)) {
    for (const item of update) {
      if (isRecord(item)) {
        const uuid = extractPortfolioUuidFromSingleUpdate(item);
        if (uuid) {
          return uuid;
        }
      }
    }
    return null;
  }
  if (!isRecord(update)) {
    return null;
  }
  return extractPortfolioUuidFromSingleUpdate(update);
}

function normalizeDashboardUpdate(
  dataType: DashboardUpdateType,
  data: unknown,
): DashboardUpdateQueueEntry | null {
  switch (dataType) {
    case 'accounts':
      return {
        type: dataType,
        data: Array.isArray(data) ? (data as AccountsUpdatePayload) : null,
      };
    case 'last_file_update':
      if (typeof data === 'string') {
        return { type: dataType, data: data as LastFileUpdatePayload };
      }
      if (isRecord(data)) {
        return { type: dataType, data: data as LastFileUpdatePayload };
      }
      return { type: dataType, data: null };
    case 'portfolio_values':
      if (Array.isArray(data)) {
        return { type: dataType, data: data as PortfolioValuesUpdatePayload };
      }
      return { type: dataType, data: null };
    case 'portfolio_positions':
      if (Array.isArray(data)) {
        return { type: dataType, data: data as PortfolioPositionsUpdatePayload };
      }
      if (isRecord(data)) {
        return { type: dataType, data: data as PortfolioPositionsUpdatePayload };
      }
      return { type: dataType, data: null };
    default:
      return null;
  }
}

function extractSecurityUuidFromKey(key: string | null | undefined): string | null {
  if (typeof key !== 'string' || !key.startsWith(SECURITY_DETAIL_TAB_PREFIX)) {
    return null;
  }

  const uuid = key.slice(SECURITY_DETAIL_TAB_PREFIX.length);
  return uuid || null;
}

function tryReopenLastDetail(): boolean {
  if (!lastClosedSecurityUuid) {
    return false;
  }

  const reopened = openSecurityDetail(lastClosedSecurityUuid);
  if (!reopened) {
    lastClosedSecurityUuid = null;
  }
  return reopened;
}

function getVisibleTabs(): DashboardTabDescriptor[] {
  const detailTabs = detailTabOrder
    .map((key) => detailTabRegistry.get(key))
    .filter((descriptor): descriptor is DashboardTabDescriptor => Boolean(descriptor));

  return [...baseTabs, ...detailTabs];
}

function getTabAtIndex(index: number): DashboardTabDescriptor | null {
  const tabs = getVisibleTabs();
  if (index < 0 || index >= tabs.length) {
    return null;
  }
  return tabs[index];
}

function resolveDashboardPanel(panels: HassPanels | null | undefined): PanelLike {
  if (!panels) {
    return null;
  }
  const normalizedPanels = panels as Partial<Record<string, PanelLike>>;
  const preferred = normalizedPanels.ppreader ?? normalizedPanels.pp_reader;
  if (preferred) {
    return preferred;
  }
  const fallback = Object.values(normalizedPanels).find((panelConfig) => {
    if (!panelConfig || typeof panelConfig !== 'object') {
      return false;
    }
    const name = (panelConfig as { webcomponent_name?: unknown }).webcomponent_name;
    return name === 'pp-reader-panel';
  });
  return fallback ?? null;
}
function rememberCurrentPageScroll(): void {
  try {
    const dashboardElement = findDashboardElement();
    if (dashboardElement && typeof dashboardElement.rememberScrollPosition === 'function') {
      dashboardElement.rememberScrollPosition();
    }
  } catch (error) {
    console.warn('rememberCurrentPageScroll: konnte Scroll-Position nicht sichern', error);
  }
}

function clampPageIndex(index: number): number {
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

async function navigateToPage(
  targetIndex: number,
  root: HTMLElement,
  hass: HomeAssistant | null | undefined,
  panel: PanelLike,
): Promise<void> {
  const tabs = getVisibleTabs();
  const clampedIndex = clampPageIndex(targetIndex);
  if (clampedIndex === currentPage) {
    if (targetIndex > currentPage) {
      tryReopenLastDetail();
    }
    return;
  }

  rememberCurrentPageScroll();

  const currentTab = currentPage >= 0 && currentPage < tabs.length ? tabs[currentPage] : null;
  const currentSecurityUuid = currentTab
    ? extractSecurityUuidFromKey(currentTab.key)
    : null;
  let nextIndex = clampedIndex;

  if (currentSecurityUuid) {
    const intendedTarget = clampedIndex >= 0 && clampedIndex < tabs.length ? tabs[clampedIndex] : null;
    if (intendedTarget && intendedTarget.key === OVERVIEW_TAB_KEY) {
      const closed = closeSecurityDetail(currentSecurityUuid, { suppressRender: true });
      if (closed) {
        const updatedTabs = getVisibleTabs();
        const overviewIndex = updatedTabs.findIndex((tab) => tab.key === OVERVIEW_TAB_KEY);
        nextIndex = overviewIndex >= 0 ? overviewIndex : 0;
      }
    }
  }

  if (navigationInProgress) {
    return;
  }

  navigationInProgress = true;
  try {
    currentPage = clampPageIndex(nextIndex);
    const renderedPage = currentPage;
    await renderTab(root, hass, panel);
    notifyExternalRender(renderedPage);
  } catch (error) {
    console.error('navigateToPage: Fehler beim Rendern des Tabs', error);
  } finally {
    navigationInProgress = false;
  }
}

function navigateByDelta(
  delta: number,
  root: HTMLElement,
  hass: HomeAssistant | null | undefined,
  panel: PanelLike,
): void {
  void navigateToPage(currentPage + delta, root, hass, panel);
}

export function registerDetailTab(
  key: string,
  descriptor: DetailTabDescriptorInput | null | undefined,
): void {
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

  const normalizedDescriptor: DashboardTabDescriptor = {
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

export function unregisterDetailTab(key: string | null | undefined): void {
  if (!key) {
    return;
  }

  const descriptor = detailTabRegistry.get(key);
  if (descriptor && typeof descriptor.cleanup === 'function') {
    try {
      const cleanupResult = descriptor.cleanup({ key });
      if (isPromiseLike<unknown>(cleanupResult)) {
        cleanupResult.catch((cleanupError: unknown) => {
          console.error(
            'unregisterDetailTab: Fehler beim asynchronen cleanup',
            cleanupError,
          );
        });
      }
    } catch (error: unknown) {
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

export function hasDetailTab(key: string): boolean {
  return detailTabRegistry.has(key);
}

export function getDetailTabDescriptor(key: string): DashboardTabDescriptor | null {
  return detailTabRegistry.get(key) ?? null;
}

export function setSecurityDetailTabFactory(
  factory: DetailTabFactory | null | undefined,
): void {
  if (factory != null && typeof factory !== 'function') {
    console.error('setSecurityDetailTabFactory: Erwartet Funktion oder null', factory);
    return;
  }

  securityDetailTabFactory = factory ?? null;
}

function getSecurityDetailTabKey(securityUuid: string): string {
  return `${SECURITY_DETAIL_TAB_PREFIX}${securityUuid}`;
}

function findDashboardElement(): DashboardElement | null {
  for (const element of getRegisteredDashboardElements()) {
    if (element.isConnected) {
      return element;
    }
  }

  const hostCandidates = new Set<HTMLElement>();
  for (const host of getRegisteredPanelHosts()) {
    hostCandidates.add(host);
  }

  for (const host of hostCandidates) {
    const nested = host.shadowRoot?.querySelector<DashboardElement>('pp-reader-dashboard');
    if (nested) {
      return nested;
    }
  }

  if (typeof document !== 'undefined') {
    const standalone = document.querySelector<DashboardElement>('pp-reader-dashboard');
    if (standalone) {
      return standalone;
    }
  }

  return null;
}

function requestDashboardRender(): void {
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

export const __TEST_ONLY_DASHBOARD = {
  findDashboardElement,
};

function notifyExternalRender(page: number): void {
  const dashboardElement = findDashboardElement();
  if (!dashboardElement) {
    return;
  }

  if (typeof dashboardElement.handleExternalRender === 'function') {
    try {
      dashboardElement.handleExternalRender(page);
    } catch (error) {
      console.warn('notifyExternalRender: Fehler beim Synchronisieren des Dashboards', error);
    }
  }
}

export function openSecurityDetail(securityUuid: string | null | undefined): boolean {
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

  rememberCurrentPageScroll();

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
  lastClosedSecurityUuid = null;
  requestDashboardRender();
  return true;
}

interface CloseSecurityDetailOptions {
  suppressRender?: boolean;
}

export function closeSecurityDetail(
  securityUuid: string | null | undefined,
  options: CloseSecurityDetailOptions = {},
): boolean {
  if (!securityUuid) {
    console.error('closeSecurityDetail: Ungültige securityUuid', securityUuid);
    return false;
  }

  const { suppressRender = false } = options;

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
    if (!suppressRender) {
      requestDashboardRender();
    }
    return true;
  }

  lastClosedSecurityUuid = securityUuid;

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

  if (!suppressRender) {
    requestDashboardRender();
  }
  return true;
}
async function renderTab(
  root: HTMLElement,
  hass: HomeAssistant | null | undefined,
  panel: PanelLike,
): Promise<void> {
  let effectivePanel = panel;
  if (!effectivePanel) {
    effectivePanel = resolveDashboardPanel(hass ? hass.panels : null);
  }

  const tabs = getVisibleTabs();
  if (currentPage >= tabs.length) {
    currentPage = Math.max(0, tabs.length - 1);
  }

  const tab = getTabAtIndex(currentPage);
  if (!tab) {
    console.error('renderTab: Kein gültiger Tab oder keine render-Methode gefunden!');
    return;
  }

  let content: string | undefined;
  try {
    content = await tab.render(root, hass, effectivePanel);
  } catch (error: unknown) {
    console.error('renderTab: Fehler beim Rendern des Tabs:', error);
    root.innerHTML = `<div class="card"><h2>Fehler</h2><pre>${toErrorMessage(error)}</pre></div>`;
    return;
  }

  root.innerHTML = content ?? '';

  if (tab.render === renderDashboard) {
    attachPortfolioToggleHandler(root);
  }

  const waitForHeaderCard = (): Promise<HTMLElement> =>
    new Promise((resolve) => {
      const interval = window.setInterval(() => {
        const headerCard = root.querySelector<HTMLElement>('.header-card');
        if (headerCard) {
          clearInterval(interval);
          resolve(headerCard);
        }
      }, 50);
    });

  const headerCard = await waitForHeaderCard();

  let anchor = root.querySelector<HTMLElement>(`#${STICKY_HEADER_ANCHOR_ID}`);
  if (!anchor) {
    anchor = document.createElement('div');
    anchor.id = STICKY_HEADER_ANCHOR_ID;
    const parent = headerCard.parentNode as (ParentNode & Node) | null;
    if (parent && 'insertBefore' in parent) {
      parent.insertBefore(anchor, headerCard);
    }
  }

  setupNavigation(root, hass, panel);
  setupSwipeOnHeaderCard(root, hass, panel);
  setupHeaderScrollBehavior(root);
}

function setupHeaderScrollBehavior(root: HTMLElement): void {
  const headerCard = root.querySelector<HTMLElement>('.header-card');
  const anchor = root.querySelector<HTMLElement>(`#${STICKY_HEADER_ANCHOR_ID}`);

  if (!headerCard || !anchor) {
    console.error('Fehlende Elemente für das Scrollverhalten: headerCard oder anchor.');
    return;
  }

  observer?.disconnect();

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
      rootMargin: '0px 0px 0px 0px',
      threshold: 0,
    },
  );

  observer.observe(anchor);
}

function setupSwipeOnHeaderCard(
  root: HTMLElement,
  hass: HomeAssistant | null | undefined,
  panel: PanelLike,
): void {
  const headerCard = root.querySelector<HTMLElement>('.header-card');
  if (!headerCard) {
    console.error('Header-Card nicht gefunden!');
    return;
  }

  addSwipeEvents(
    headerCard,
    () => {
      navigateByDelta(1, root, hass, panel);
    },
    () => {
      navigateByDelta(-1, root, hass, panel);
    },
  );
}

function setupNavigation(
  root: HTMLElement,
  hass: HomeAssistant | null | undefined,
  panel: PanelLike,
): void {
  const headerCard = root.querySelector<HTMLElement>('.header-card');
  if (!headerCard) {
    console.error('Header-Card nicht gefunden!');
    return;
  }

  const navLeft = headerCard.querySelector<HTMLButtonElement>('#nav-left');
  const navRight = headerCard.querySelector<HTMLButtonElement>('#nav-right');

  if (!navLeft || !navRight) {
    console.error('Navigationspfeile nicht gefunden!');
    return;
  }

  navLeft.addEventListener('click', () => {
    navigateByDelta(-1, root, hass, panel);
  });

  navRight.addEventListener('click', () => {
    navigateByDelta(1, root, hass, panel);
  });

  updateNavigationState(headerCard);
}

function updateNavigationState(headerCard: HTMLElement): void {
  const navLeft = headerCard.querySelector<HTMLButtonElement>('#nav-left');
  const navRight = headerCard.querySelector<HTMLButtonElement>('#nav-right');

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
    const atEnd = currentPage === tabs.length - 1;
    const shouldEnable = !atEnd || !!lastClosedSecurityUuid;
    navRight.disabled = !shouldEnable;
    navRight.classList.toggle('disabled', !shouldEnable);
  }
}

class PPReaderDashboard extends HTMLElement {
  private _root: HTMLElement;

  private _hass: HomeAssistant | null = null;

  private _panel: PanelLike = null;

  private _narrow: boolean | null = null;

  private _route: HassRoute | null = null;

  private _lastPanel: PanelLike = null;

  private _lastNarrow: boolean | null = null;

  private _lastRoute: HassRoute | null = null;

  private _lastPage: number | null = null;

  private _scrollPositions: Record<number, number> = {};

  private _unsubscribeEvents: HassUnsubscribe | null = null;

  private _initialized = false;

  private _hasNewData = false;

  private _pendingUpdates: DashboardUpdateQueueEntry[] = [];

  private _entryIdWaitWarned = false;

  constructor() {
    super();
    this._root = document.createElement('div');
    this._root.className = 'pp-reader-dashboard';
    this.appendChild(this._root);
  }

  set hass(hass: HomeAssistant | null | undefined) {
    this._hass = hass ?? null;
    this._checkInitialization();
  }

  set panel(panel: PanelLike) {
    if (this._panel === panel) {
      return;
    }
    this._panel = panel ?? null;
    this._checkInitialization();
  }

  set narrow(narrow: boolean | null | undefined) {
    if (this._narrow === (narrow ?? null)) {
      return;
    }
    this._narrow = narrow ?? null;
    this._renderIfInitialized();
  }

  set route(route: HassRoute | null | undefined) {
    if (this._route === (route ?? null)) {
      return;
    }
    this._route = route ?? null;
    this._renderIfInitialized();
  }

  connectedCallback(): void {
    this._checkInitialization();
  }

  disconnectedCallback(): void {
    this._removeEventListeners();
  }

  public _checkInitialization(): void {
    if (!this._hass || this._initialized) {
      return;
    }

    if (!this._panel) {
      this._panel = resolveDashboardPanel(this._hass.panels ?? null);
    }

    const entryId = getEntryId(this._hass, this._panel);
    if (!entryId) {
      if (!this._entryIdWaitWarned) {
        console.warn('PPReaderDashboard: kein entry_id ermittelbar – warte auf Panel-Konfiguration.');
        this._entryIdWaitWarned = true;
      }
      return;
    }

    this._entryIdWaitWarned = false;
    console.debug('PPReaderDashboard: entry_id (fallback) =', entryId);
    this._initialized = true;
    this._initializeEventListeners();
    this._render();
  }

  private _initializeEventListeners(): void {
    this._removeEventListeners();

    const conn = this._hass?.connection;
    if (!conn || typeof conn.subscribeEvents !== 'function') {
      console.error('PPReaderDashboard: keine valide WebSocket-Verbindung oder subscribeEvents fehlt');
      return;
    }

    const eventTypes: readonly string[] = ['panels_updated'];

    const subs: HassUnsubscribe[] = [];
    const subscriptionPromise = Promise.all(
      eventTypes.map(async (eventType) => {
        try {
          const unsubscribe = await conn.subscribeEvents(
            this._handleBusEvent.bind(this),
            eventType,
          );
          if (typeof unsubscribe === 'function') {
            subs.push(unsubscribe);
            console.debug('PPReaderDashboard: subscribed to', eventType);
          } else {
            console.error(
              'PPReaderDashboard: subscribeEvents lieferte kein Unsubscribe-Func für',
              eventType,
              unsubscribe,
            );
          }
        } catch (subscribeError: unknown) {
          console.error('PPReaderDashboard: Fehler bei subscribeEvents für', eventType, subscribeError);
        }
      }),
    );
    subscriptionPromise
      .then(() => {
        this._unsubscribeEvents = () => {
          subs.forEach((unsubscribe) => {
            try {
              unsubscribe();
            } catch (error: unknown) {
              // ignore cleanup errors
            }
          });
          console.debug('PPReaderDashboard: alle Event-Subscriptions entfernt');
        };
      })
      .catch((error: unknown) => {
        console.error('PPReaderDashboard: Fehler beim Registrieren der Events', error);
      });
  }
  private _removeEventListeners(): void {
    if (typeof this._unsubscribeEvents === 'function') {
      try {
        this._unsubscribeEvents();
      } catch (error: unknown) {
        console.error('PPReaderDashboard: Fehler beim Entfernen der Event-Listener:', error);
      }
    }
    this._unsubscribeEvents = null;
  }

  private _handleBusEvent(event: PanelsUpdatedEvent): void {
    const currentEntryId = getEntryId(this._hass, this._panel);
    if (!currentEntryId) {
      return;
    }

    const eventData = event.data;
    if (!isDashboardUpdateType(eventData.data_type)) {
      return;
    }

    if (eventData.entry_id && eventData.entry_id !== currentEntryId) {
      return;
    }

    const normalized = normalizeDashboardUpdate(eventData.data_type, eventData.data);
    if (!normalized) {
      return;
    }

    this._queueUpdate(normalized.type, normalized.data);
    this._doRender(normalized.type, normalized.data);
  }

  private _doRender<T extends DashboardUpdateType>(
    dataType: T,
    pushedData: DashboardUpdatePayloadMap[T] | null | undefined,
  ): void {
    switch (dataType) {
      case 'accounts':
        handleAccountUpdate(
          pushedData as DashboardUpdatePayloadMap['accounts'],
          this._root,
        );
        break;
      case 'last_file_update':
        handleLastFileUpdate(
          pushedData as DashboardUpdatePayloadMap['last_file_update'],
          this._root,
        );
        break;
      case 'portfolio_values':
        handlePortfolioUpdate(
          pushedData as DashboardUpdatePayloadMap['portfolio_values'],
          this._root,
        );
        break;
      case 'portfolio_positions':
        handlePortfolioPositionsUpdate(
          pushedData as DashboardUpdatePayloadMap['portfolio_positions'],
          this._root,
        );
        break;
      default:
        console.warn('PPReaderDashboard: Unbekannter Datentyp:', dataType);
        break;
    }
  }

  private _queueUpdate<T extends DashboardUpdateType>(
    dataType: T,
    pushedData: DashboardUpdatePayloadMap[T] | null | undefined,
  ): void {
    const clonedData = this._cloneData(pushedData);
    const entry: DashboardUpdateQueueEntry<T> = {
      type: dataType,
      data: clonedData,
    };

    if (dataType === 'portfolio_positions') {
      entry.portfolioUuid = extractPortfolioUuidFromPositionsUpdate(
        clonedData as DashboardUpdatePayloadMap['portfolio_positions'],
      );
    }

    let index = -1;
    if (dataType === 'portfolio_positions' && entry.portfolioUuid) {
      index = this._pendingUpdates.findIndex(
        (item) => item.type === dataType && item.portfolioUuid === entry.portfolioUuid,
      );
    } else {
      index = this._pendingUpdates.findIndex((item) => item.type === dataType);
    }

    if (index >= 0) {
      this._pendingUpdates[index] = entry;
    } else {
      this._pendingUpdates.push(entry);
    }

    this._hasNewData = true;
  }

  private _cloneData<T>(data: T): T {
    if (data == null) {
      return data;
    }

    try {
      if (typeof structuredClone === 'function') {
        return structuredClone(data);
      }
    } catch (error: unknown) {
      console.warn('PPReaderDashboard: structuredClone fehlgeschlagen, falle auf JSON zurück', error);
    }

    try {
      return JSON.parse(JSON.stringify(data)) as T;
    } catch (error: unknown) {
      console.warn('PPReaderDashboard: JSON-Clone fehlgeschlagen, referenziere Originaldaten', error);
      return data;
    }
  }

  private _reapplyPendingUpdates(): void {
    if (!Array.isArray(this._pendingUpdates) || this._pendingUpdates.length === 0) {
      return;
    }

    for (const item of this._pendingUpdates) {
      try {
        this._doRender(item.type, this._cloneData(item.data));
      } catch (error: unknown) {
        console.error('PPReaderDashboard: Fehler beim erneuten Anwenden eines Updates', item, error);
      }
    }
  }

  public _renderIfInitialized(): void {
    if (this._initialized) {
      this._render();
    }
  }

  public handleExternalRender(page: number): void {
    this._afterRender(page);
  }

  public rememberScrollPosition(page: number = currentPage): void {
    const targetPage = Number.isInteger(page) ? page : currentPage;
    this._scrollPositions[targetPage] = this._root.scrollTop || 0;
  }

  private _render(): void {
    if (!this._hass) {
      console.warn('pp-reader-dashboard: noch kein hass, überspringe _render()');
      return;
    }
    if (!this._initialized) {
      console.debug('pp-reader-dashboard: _render aufgerufen bevor initialisiert');
      return;
    }

    const page = currentPage;
    if (
      !this._hasNewData &&
      this._panel === this._lastPanel &&
      this._narrow === this._lastNarrow &&
      this._route === this._lastRoute &&
      this._lastPage === page
    ) {
      return;
    }

    if (this._lastPage != null) {
      this._scrollPositions[this._lastPage] = this._root.scrollTop;
    }

    const renderResult = renderTab(this._root, this._hass, this._panel);
    if (isPromiseLike<unknown>(renderResult)) {
      renderResult
        .then(() => {
          this._afterRender(page);
        })
        .catch((error: unknown) => {
          console.error('PPReaderDashboard: Fehler beim Rendern des Tabs', error);
          this._afterRender(page);
        });
      return;
    }

    this._afterRender(page);
  }

  private _afterRender(page: number): void {
    const restore = this._scrollPositions[page] || 0;
    this._root.scrollTop = restore;

    this._lastPanel = this._panel;
    this._lastNarrow = this._narrow;
    this._lastRoute = this._route;
    this._lastPage = page;

    try {
      this._reapplyPendingUpdates();
    } catch (error) {
      console.error('PPReaderDashboard: Fehler beim Wiederanlegen der Updates', error);
    }

    this._hasNewData = false;
  }
}

if (!customElements.get('pp-reader-dashboard')) {
  customElements.define('pp-reader-dashboard', PPReaderDashboard);
}

console.log('PPReader dashboard module v20250914b geladen');

registerSecurityDetailTab({
  setSecurityDetailTabFactory,
});
