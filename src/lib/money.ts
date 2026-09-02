export function formatMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/** Parse a user-typed decimal amount ("12.50") into integer cents. */
export function parseAmountToCents(input: string | number): number | null {
  const s = String(input).trim().replace(/,/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  return Number(whole) * 100 + Number((frac + "00").slice(0, 2));
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
