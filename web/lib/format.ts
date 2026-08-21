export const fmtMoney = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "HKD", maximumFractionDigits: 2 });

// HKD жёстко привязан к USD Гонконгским валютным управлением в коридоре 7.75-7.85
// с 1983 года — фиксированный курс тут надёжен, живой API не нужен.
const USD_PER_HKD = 1 / 7.8;

export const fmtUsd = (v: number) =>
  (v * USD_PER_HKD).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

export const fmtMoneyDual = (v: number) => `${fmtMoney(v)} (≈${fmtUsd(v)})`;

export const fmtInt = (v: number) => v.toLocaleString("en-US");

export const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;

export const fmtDecimal = (v: number) => v.toFixed(2);

export const fmtDuration = (seconds: number) => {
  const totalSeconds = Math.round(seconds);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

export const fmtOrDash = (v: number | null, fmt: (v: number) => string) =>
  v === null ? "—" : fmt(v);
