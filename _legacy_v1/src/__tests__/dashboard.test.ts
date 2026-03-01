/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import assert from 'node:assert';
import { after, before, describe, it } from 'node:test';
import type { DashboardTabDescriptor } from '../tabs/types';
import { installDomEnvironment, InstalledDomEnvironment } from './dom';

describe('Dashboard', () => {
  let domEnv: InstalledDomEnvironment;
  let getVisibleTabs: () => DashboardTabDescriptor[];
  let openTradeDetail: (securityUuid: string) => boolean;

  let setTradeDetailTabFactory: (factory: any) => void;

  before(async () => {
    domEnv = installDomEnvironment();
    // Mock customElements

    (global as any).customElements = {
      define: () => undefined,
      get: () => undefined,
      whenDefined: () => Promise.resolve(undefined),
      upgrade: () => undefined,
    };
    const dashboard = await import('../dashboard');
    getVisibleTabs = dashboard.getVisibleTabs;
    openTradeDetail = dashboard.openTradeDetail;
    setTradeDetailTabFactory = dashboard.setTradeDetailTabFactory;

    setTradeDetailTabFactory((securityUuid: string) => ({
      title: 'Trade Detail',
      render: () => `<div>${securityUuid}</div>`,
    }));
  });

  after(() => {
    domEnv.restore();
  });

  it('should open a trade detail tab', () => {
    const securityUuid = 'test-uuid';
    openTradeDetail(securityUuid);
    const tabs = getVisibleTabs();
    const tradeDetailTab = tabs.find((tab) => tab.key === `trade_detail:${securityUuid}`);
    assert.ok(tradeDetailTab, 'Trade detail tab should be present');
  });
});
