export function percentDisplayValue(value: number): number {
  if (value === 0) return 0;
  return Math.abs(value) <= 1 ? value * 100 : value;
}

export function formatPercentMetric(value: number): string {
  return `${percentDisplayValue(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}%`;
}

export function formatPercentPointsMetric(value: number): string {
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}%`;
}

export function formatNumberMetric(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatCurrencyMetric(value: number): string {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function formatPriceMetric(value: number): string {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
