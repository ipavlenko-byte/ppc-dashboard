export const fmtMoney = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export const fmtInt = (v: number) => v.toLocaleString("en-US");

export const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;
