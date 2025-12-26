/**
 * Daily wealth state and caching helper for the Analyse tab.
 */

import type { PanelConfigLike } from '../tabs/types';
import type { HomeAssistant } from '../types/home-assistant';
import {
  fetchDailyWealthWS,
  type DailyWealthFetchOptions,
  type DailyWealthRange,
  type DailyWealthRecord,
  type DailyWealthRequest,
  type DailyWealthResponse,
  type DailyWealthScopeRecord,
  type DailyWealthSlices,
} from './api';

type DailyWealthStatus = 'idle' | 'loading' | 'loaded' | 'error';

export type DailyWealthSelection = DailyWealthFetchOptions;

export interface DailyWealthState {
  status: DailyWealthStatus;
  error: string | null;
  data: DailyWealthResponse | null;
  selection: DailyWealthSelection | null;
  lastUpdated: number | null;
}

type LoadDailyWealthOptions = DailyWealthSelection & {
  force?: boolean;
};

let state: DailyWealthState = {
  status: 'idle',
  error: null,
  data: null,
  selection: null,
  lastUpdated: null,
};

let lastRequestKey: string | null = null;

function toErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    const trimmed = error.trim();
    return trimmed || 'Unbekannter Fehler';
  }
  if (error instanceof Error) {
    const trimmed = error.message.trim();
    return trimmed || error.name;
  }
  try {
    return JSON.stringify(error) || String(error);
  } catch {
    return String(error);
  }
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeRange(range: unknown): DailyWealthRange | null {
  if (!range || typeof range !== 'object') {
    return null;
  }
  const raw = range as Record<string, unknown>;
  const start = normalizeDate(raw.start);
  const end = normalizeDate(raw.end);
  if (start && end) {
    return { start, end };
  }
  return null;
}

function normalizeScopeList(list: unknown): string[] {
  if (!Array.isArray(list)) {
    return [];
  }
  const normalized = list
    .map(entry => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(entry => entry.length > 0);
  const unique = Array.from(new Set(normalized));
  unique.sort();
  return unique;
}

function normalizeSelection(input: DailyWealthSelection): DailyWealthSelection {
  const date = normalizeDate(input.date ?? null);
  const range = normalizeRange(input.range ?? null);

  if (date && range) {
    throw new Error('loadDailyWealth: date und range können nicht gleichzeitig gesetzt werden');
  }
  if (!date && !range) {
    throw new Error('loadDailyWealth: entweder date oder range erforderlich');
  }

  const scopes: DailyWealthRequest['scopes'] = input.scopes ?? {};
  const accounts = normalizeScopeList(scopes.accounts);
  const portfolios = normalizeScopeList(scopes.portfolios);

  const normalizedSelection: DailyWealthSelection = {};
  if (date) {
    normalizedSelection.date = date;
  }
  if (range) {
    normalizedSelection.range = range;
  }

  const includeSlices =
    (input as { include_slices?: boolean }).include_slices ?? input.includeSlices ?? undefined;
  const includeScopes =
    (input as { include_scopes?: boolean }).include_scopes ?? input.includeScopes ?? undefined;

  if (includeSlices !== undefined) {
    normalizedSelection.includeSlices = includeSlices;
  }
  if (includeScopes !== undefined) {
    normalizedSelection.includeScopes = includeScopes;
  }

  if (accounts.length || portfolios.length) {
    normalizedSelection.scopes = {};
    if (accounts.length) {
      normalizedSelection.scopes.accounts = accounts;
    }
    if (portfolios.length) {
      normalizedSelection.scopes.portfolios = portfolios;
    }
  }

  if (typeof input.limit === 'number' && Number.isFinite(input.limit) && input.limit > 0) {
    normalizedSelection.limit = input.limit;
  }
  if (typeof input.offset === 'number' && Number.isFinite(input.offset) && input.offset >= 0) {
    normalizedSelection.offset = input.offset;
  }

  return normalizedSelection;
}

function serializeSelection(selection: DailyWealthSelection): string {
  const datePart = selection.date ?? '';
  const rangePart = selection.range ? `${selection.range.start}..${selection.range.end}` : '';
  const scopeAccounts = selection.scopes?.accounts ?? [];
  const scopePortfolios = selection.scopes?.portfolios ?? [];
  const scopePart = JSON.stringify({ accounts: scopeAccounts, portfolios: scopePortfolios });
  const includeSlices = selection.includeSlices ? '1' : '0';
  const includeScopes = selection.includeScopes ? '1' : '0';
  const limit = selection.limit ?? '';
  const offset = selection.offset ?? '';
  return [datePart, rangePart, scopePart, includeSlices, includeScopes, limit, offset].join('::');
}

function cloneRecord(record: DailyWealthRecord): DailyWealthRecord {
  const cloned: DailyWealthRecord = { ...record };
  return cloned;
}

function cloneScopeRecord(record: DailyWealthScopeRecord): DailyWealthScopeRecord {
  const cloned: DailyWealthScopeRecord = { ...record };
  return cloned;
}

function cloneSlices(slices: DailyWealthSlices | undefined): DailyWealthSlices | undefined {
  if (!slices) {
    return undefined;
  }
  return {
    accounts: slices.accounts.map(cloneScopeRecord),
    portfolios: slices.portfolios.map(cloneScopeRecord),
  };
}

function cloneResponse(response: DailyWealthResponse | null): DailyWealthResponse | null {
  if (!response) {
    return null;
  }
  const clonedSlices = cloneSlices(response.slices);
  return {
    range: { ...response.range },
    records: response.records.map(cloneRecord),
    ...(clonedSlices ? { slices: clonedSlices } : {}),
    ...(response.metrics ? { metrics: { ...response.metrics } } : {}),
  };
}

function cloneSelection(selection: DailyWealthSelection | null): DailyWealthSelection | null {
  if (!selection) {
    return null;
  }
  const cloned: DailyWealthSelection = {};
  if (selection.date) {
    cloned.date = selection.date;
  }
  if (selection.range) {
    cloned.range = { ...selection.range };
  }
  if (selection.scopes) {
    cloned.scopes = {
      ...(selection.scopes.accounts ? { accounts: [...selection.scopes.accounts] } : {}),
      ...(selection.scopes.portfolios ? { portfolios: [...selection.scopes.portfolios] } : {}),
    };
  }
  if (selection.includeSlices !== undefined) {
    cloned.includeSlices = selection.includeSlices;
  }
  if (selection.includeScopes !== undefined) {
    cloned.includeScopes = selection.includeScopes;
  }
  if (selection.limit !== undefined) {
    cloned.limit = selection.limit;
  }
  if (selection.offset !== undefined) {
    cloned.offset = selection.offset;
  }
  return cloned;
}

function setState(next: Partial<DailyWealthState>): void {
  state = {
    ...state,
    ...next,
  };
}

export function resetDailyWealthState(): void {
  state = {
    status: 'idle',
    error: null,
    data: null,
    selection: null,
    lastUpdated: null,
  };
  lastRequestKey = null;
}

export function getDailyWealthState(): DailyWealthState {
  return {
    status: state.status,
    error: state.error,
    lastUpdated: state.lastUpdated,
    data: cloneResponse(state.data),
    selection: cloneSelection(state.selection),
  };
}

export function invalidateDailyWealthCache(): void {
  lastRequestKey = null;
}

export async function loadDailyWealth(
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
  options: LoadDailyWealthOptions = {},
): Promise<DailyWealthState> {
  const selection = normalizeSelection(options);
  const requestKey = serializeSelection(selection);

  if (state.data && !options.force && lastRequestKey === requestKey) {
    return getDailyWealthState();
  }

  setState({
    status: 'loading',
    error: null,
    selection,
  });

  try {
    const response = await fetchDailyWealthWS(hass, panelConfig, selection);
    lastRequestKey = requestKey;
    setState({
      status: 'loaded',
      error: null,
      data: response,
      selection,
      lastUpdated: Date.now(),
    });
  } catch (error) {
    setState({
      status: 'error',
      error: toErrorMessage(error),
      selection,
      lastUpdated: Date.now(),
    });
  }

  return getDailyWealthState();
}
