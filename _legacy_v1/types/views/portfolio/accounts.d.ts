/**
 * Accounts tab rendering backed by normalized account snapshots.
 *
 * Renders dedicated EUR + FX sections that reuse the shared dashboard styles
 * while surfacing FX provenance/coverage metadata via badge helpers.
 */
import type { PanelConfigLike } from '../../tabs/types';
import type { HomeAssistant } from '../../types/home-assistant';
export declare const ACCOUNTS_TAB_KEY = "accounts";
declare function buildFxWarningBanner(count: number): string;
export declare function renderAccountsTab(_root: HTMLElement, hass: HomeAssistant | null | undefined, panelConfig: PanelConfigLike | null | undefined): Promise<string>;
export declare const accountsTabDescriptor: {
    key: string;
    title: string;
    render: typeof renderAccountsTab;
};
export declare const __TEST_ONLY__: {
    buildFxWarningBanner: typeof buildFxWarningBanner;
};
export {};
//# sourceMappingURL=accounts.d.ts.map