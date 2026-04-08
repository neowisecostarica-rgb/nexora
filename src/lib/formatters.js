export function formatCurrency(value, currency = "USD") {
  if (value === null || value === undefined) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value) {
  if (value === null || value === undefined) return "0";
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(value) {
  if (value === null || value === undefined) return "0%";
  return `${value.toFixed(1)}%`;
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function generateCode(prefix, length = 6) {
  const chars = "0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${result}`;
}