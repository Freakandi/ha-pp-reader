import type { RealizedTrade } from '../data/api';
import type { DashboardTabRenderFn } from './types';
export declare const __TEST_ONLY__: {
    buildTradeMetaCard: typeof buildTradeMetaCard;
};
declare function buildTradeMetaCard(trade: RealizedTrade): string;
interface RegisterTradeDetailTabOptions {
    setTradeDetailTabFactory?: ((factory: (securityUuid: string) => {
        title: string;
        render: DashboardTabRenderFn;
        cleanup: (context?: {
            key: string;
        }) => void;
    }) => void) | null;
}
export declare function registerTradeDetailTab(options: RegisterTradeDetailTabOptions): void;
export {};
//# sourceMappingURL=trade_detail.d.ts.map