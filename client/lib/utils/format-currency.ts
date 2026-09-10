export function formatCurrency(
  amount: string | number | null | undefined,
  currencyInput = "₹"
): string {
  const isUsd = currencyInput === "USD" || currencyInput === "$";
  const currencySymbol = isUsd ? "$" : "₹";
  const locale = isUsd ? "en-US" : "en-IN";

  if (amount === null || amount === undefined || amount === "") {
    return `${currencySymbol}0.00`;
  }

  const strVal = String(amount).trim();
  const num = parseFloat(strVal);

  if (isNaN(num)) {
    return `${currencySymbol}0.00`;
  }

  const formatted = num.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${currencySymbol}${formatted}`;
}
