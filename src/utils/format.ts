
import { normalizeCurrencyCode } from "./currency";

export function formatCurrency(value: number | null | undefined, currency = "EUR"): string {
  if (value === null || typeof value === "undefined") return "";

  // 🛡️ SECURITY: Validate currency code to prevent Intl.NumberFormat injection/errors
  // and ensure consistent output. normalizeCurrencyCode handles trimming and "EUR" aliases.
  // Fallback to "EUR" if invalid or missing to fail safe and maintain UI stability.
  const safeCurrency = normalizeCurrencyCode(currency) || "EUR";

  const formatter = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: safeCurrency,
  });
  return formatter.format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || typeof value === "undefined") return "";
  const formatter = new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || typeof value === "undefined") return "";
  const formatter = new Intl.NumberFormat("de-DE", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(value);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
