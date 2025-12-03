/**
 * Accounts tab rendering backed by normalized account snapshots.
 *
 * Renders dedicated EUR + FX sections that reuse the shared dashboard styles
 * while surfacing FX provenance/coverage metadata via badge helpers.
 */

import {
  createHeaderCard,
  formatNumber,
  makeTable,
} from '../../content/elements';
import { fetchAccountsWS } from '../../data/api';
import { setAccountSnapshots } from '../../lib/store/portfolioStore';
import {
  selectAccountOverviewRows,
  type AccountOverviewRow,
} from '../../lib/store/selectors/portfolio';
import { renderNameWithBadges, escapeHtml } from '../../lib/ui/badges';
import type { PanelConfigLike } from '../../tabs/types';
import type { HomeAssistant } from '../../types/home-assistant';

export const ACCOUNTS_TAB_KEY = 'accounts';

const ACCOUNT_TAB_TITLE = 'Konten';

interface AccountPartitions {
  eur: AccountOverviewRow[];
  fx: AccountOverviewRow[];
}

type AccountBadgeList = AccountOverviewRow['badges'];

function visibleAccountBadges(badges: AccountBadgeList | undefined): AccountBadgeList {
  return (badges ?? []).filter(
    (badge) =>
      !badge.key.endsWith('-coverage') && !badge.key.startsWith('provenance-'),
  );
}

function partitionAccounts(
  rows: AccountOverviewRow[],
): AccountPartitions {
  const eur: AccountOverviewRow[] = [];
  const fx: AccountOverviewRow[] = [];

  for (const account of rows) {
    const currency = (account.currency_code ?? '').toUpperCase() || 'EUR';
    if (currency === 'EUR') {
      eur.push(account);
    } else {
      fx.push(account);
    }
  }

  return { eur, fx };
}

function sumBalances(rows: AccountOverviewRow[]): number {
  return rows.reduce((sum, account) => {
    if (typeof account.balance === 'number' && Number.isFinite(account.balance)) {
      return sum + account.balance;
    }
    return sum;
  }, 0);
}

function formatEuroLabel(value: number): string {
  return `${formatNumber(value)}\u00A0€`;
}

function formatOriginalBalance(account: AccountOverviewRow): string {
  if (typeof account.orig_balance !== 'number' || !Number.isFinite(account.orig_balance)) {
    return '—';
  }
  const currency = account.currency_code ?? '';
  const amount = account.orig_balance.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount}${currency ? `\u00A0${currency}` : ''}`;
}

function formatFxRate(value: number | null): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

function formatFxTimestamp(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFxSource(account: AccountOverviewRow): string {
  const parts: string[] = [];
  const source = account.fx_rate_source;
  const timestamp = formatFxTimestamp(account.fx_rate_timestamp);
  const rateLabel = formatFxRate(account.fx_rate);

  if (source) {
    parts.push(source);
  }
  if (timestamp) {
    parts.push(timestamp);
  }
  if (rateLabel) {
    parts.push(`Kurs ${rateLabel}`);
  }
  if (parts.length === 0) {
    return account.fx_unavailable ? 'FX-Daten fehlen' : '—';
  }
  return parts.join(' · ');
}

function buildHeaderMeta(
  eurTotal: number,
  fxTotal: number,
  fxMissingCount: number,
): string {
  const fxTotalLabel =
    fxTotal > 0 ? formatEuroLabel(fxTotal) : '—';
  const missingNote = fxMissingCount
    ? `<span class="total-wealth-note">${String(
        fxMissingCount,
      )}&nbsp;FX-Konten ohne Kurs</span>`
    : '';

  return `
    <div class="header-meta-row accounts-meta">
      <span>💶 EUR-Konten: <strong>${formatEuroLabel(eurTotal)}</strong></span>
      <span>💱 FX-Konten (EUR): <strong>${fxTotalLabel}</strong></span>
      ${missingNote}
    </div>
  `;
}

function buildFxWarningBanner(count: number): string {
  if (count === 0) {
    return '';
  }
  const plural = count === 1 ? '' : 'e';
  return `
    <div class="card warning-card">
      <h2>FX-Warnung</h2>
      <p>${String(
        count,
      )} Fremdwährungskont${plural} ohne aktuelle FX-Daten. EUR-Werte fehlen für diese Konten.</p>
    </div>
  `;
}

function buildAccountsTables(
  eurAccounts: AccountOverviewRow[],
  fxAccounts: AccountOverviewRow[],
): { eurTable: string; fxTable: string } {
  const eurRows = eurAccounts.map((account) => ({
    name: renderNameWithBadges(account.name, visibleAccountBadges(account.badges), {
      containerClass: 'account-name',
      labelClass: 'account-name__label',
    }),
    balance: account.balance ?? null,
    fx_unavailable: account.fx_unavailable,
  }));

  const eurTable = makeTable(
    eurRows,
    [
      { key: 'name', label: 'Name' },
      { key: 'balance', label: 'Kontostand (EUR)', align: 'right' as const },
    ],
    ['balance'],
  );

  const fxRows = fxAccounts.map((account) => ({
    name: renderNameWithBadges(account.name, visibleAccountBadges(account.badges), {
      containerClass: 'account-name',
      labelClass: 'account-name__label',
    }),
    fx_display: formatOriginalBalance(account),
    fx_source: escapeHtml(formatFxSource(account)),
    balance: account.fx_unavailable ? null : account.balance ?? null,
    fx_unavailable: account.fx_unavailable,
  }));

  const fxTable = makeTable(
    fxRows,
    [
      { key: 'name', label: 'Name' },
      { key: 'fx_display', label: 'Betrag (FX)' },
      { key: 'fx_source', label: 'FX-Provenienz' },
      { key: 'balance', label: 'EUR', align: 'right' as const },
    ],
    ['balance'],
  );

  return { eurTable, fxTable };
}

export async function renderAccountsTab(
  _root: HTMLElement,
  hass: HomeAssistant | null | undefined,
  panelConfig: PanelConfigLike | null | undefined,
): Promise<string> {
  const accountsResp = await fetchAccountsWS(hass, panelConfig);
  setAccountSnapshots(accountsResp.accounts);

  const rows = selectAccountOverviewRows();
  const { eur, fx } = partitionAccounts(rows);

  const eurTotal = sumBalances(eur);
  const fxTotal = sumBalances(
    fx.filter((account) => !account.fx_unavailable),
  );
  const fxMissingCount = fx.filter(
    (account) => account.fx_unavailable || account.balance == null,
  ).length;

  const headerMeta = buildHeaderMeta(eurTotal, fxTotal, fxMissingCount);
  const headerCard = createHeaderCard(ACCOUNT_TAB_TITLE, headerMeta);

  const warningBanner = buildFxWarningBanner(fxMissingCount);
  const { eurTable, fxTable } = buildAccountsTables(eur, fx);

  return `
    ${headerCard.outerHTML}
    ${warningBanner}
    <div class="card">
      <h2>EUR-Konten</h2>
      <div class="scroll-container account-table">
        ${eurTable}
      </div>
    </div>
    <div class="card">
      <h2>Fremdwährungen</h2>
      <div class="scroll-container fx-account-table">
        ${fxTable}
      </div>
      ${
        fx.length
          ? `
        <p class="table-note" role="note">
          <span class="table-note__icon" aria-hidden="true">ℹ️</span>
          <span>FX-Provenienz zeigt Quelle, Zeitpunkt und Kurs des letzten Abgleichs.</span>
        </p>`
          : ''
      }
    </div>
  `;
}

export const accountsTabDescriptor = {
  key: ACCOUNTS_TAB_KEY,
  title: ACCOUNT_TAB_TITLE,
  render: renderAccountsTab,
};
