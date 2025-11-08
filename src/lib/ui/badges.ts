/**
 * Shared HTML helpers for rendering overview badge elements.
 */

import type { OverviewBadge } from "../store/selectors/portfolio";

export interface BadgeListOptions {
  containerClass?: string;
}

export interface NameWithBadgeOptions extends BadgeListOptions {
  labelClass?: string;
}

export function escapeHtml(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value.replace(/[&<>"']/g, (match) => {
    switch (match) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return match;
    }
  });
}

export function renderBadgeList(
  badges: readonly OverviewBadge[] | null | undefined,
  options: BadgeListOptions = {},
): string {
  if (!badges || badges.length === 0) {
    return "";
  }
  const containerClass = ["meta-badges", options.containerClass]
    .filter(Boolean)
    .join(" ");
  const items = badges
    .map((badge) => {
      const toneClass = `meta-badge--${badge.tone}`;
      const title = badge.description
        ? ` title="${escapeHtml(badge.description)}"`
        : "";
      return `<span class="meta-badge ${toneClass}"${title}>${escapeHtml(
        badge.label,
      )}</span>`;
    })
    .join("");
  return `<span class="${containerClass}">${items}</span>`;
}

export function renderNameWithBadges(
  label: string,
  badges: readonly OverviewBadge[] | null | undefined,
  options: NameWithBadgeOptions = {},
): string {
  const badgeMarkup = renderBadgeList(badges, options);
  if (!badgeMarkup) {
    return escapeHtml(label);
  }
  const labelClass = options.labelClass ?? "name-with-badges__label";
  const containerClass = ["name-with-badges", options.containerClass]
    .filter(Boolean)
    .join(" ");
  return `<span class="${containerClass}"><span class="${labelClass}">${escapeHtml(
    label,
  )}</span>${badgeMarkup}</span>`;
}
