import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { installDomEnvironment, InstalledDomEnvironment } from './dom';

describe('Dashboard', () => {
  let domEnv: InstalledDomEnvironment;
  let getVisibleTabs: any;
  let openTradeDetail: any;
  let setTradeDetailTabFactory: any;

  before(async () => {
    domEnv = installDomEnvironment();
    // Mock customElements
    (global as any).customElements = {
        define: () => {},
        get: () => {},
        whenDefined: async () => {},
        upgrade: () => {},
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
    const tradeDetailTab = tabs.find(tab => tab.key === `trade_detail:${securityUuid}`);
    assert.ok(tradeDetailTab, 'Trade detail tab should be present');
  });
});
