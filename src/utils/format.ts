
export function formatCurrency(value: number | null | undefined, currency = "EUR"): string {
  if (value === null || typeof value === "undefined") return "";
  const formatter = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
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
