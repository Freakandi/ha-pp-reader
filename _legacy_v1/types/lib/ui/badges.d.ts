/**
 * Shared HTML helpers for rendering overview badge elements.
 */
import type { OverviewBadge } from "../store/selectors/portfolio";
import { escapeHtml } from '../../utils/html';
export interface BadgeListOptions {
    containerClass?: string;
}
export interface NameWithBadgeOptions extends BadgeListOptions {
    labelClass?: string;
}
export { escapeHtml };
export declare function renderBadgeList(badges: readonly OverviewBadge[] | null | undefined, options?: BadgeListOptions): string;
export declare function renderNameWithBadges(label: string, badges: readonly OverviewBadge[] | null | undefined, options?: NameWithBadgeOptions): string;
//# sourceMappingURL=badges.d.ts.map