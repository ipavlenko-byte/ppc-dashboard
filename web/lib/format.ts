export const fmtMoney = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "HKD", maximumFractionDigits: 2 });

export const fmtInt = (v: number) => v.toLocaleString("en-US");

export const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;

export const fmtDecimal = (v: number) => v.toFixed(2);

export const fmtDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

export const fmtOrDash = (v: number | null, fmt: (v: number) => string) =>
  v === null ? "—" : fmt(v);
