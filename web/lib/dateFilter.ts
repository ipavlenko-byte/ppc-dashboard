export const PRESET_DAYS = [1, 7, 14, 30] as const;

export interface ResolvedDateFilter {
  mode: "days" | "range";
  days: number; // актуально при mode === "days"
  from?: string; // актуально при mode === "range"
  to?: string;
  label: string;
}

function daysWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "дня";
  return "дней";
}

export function resolveDateFilter(params: {
  days?: string;
  from?: string;
  to?: string;
}): ResolvedDateFilter {
  if (params.from && params.to) {
    return {
      mode: "range",
      days: 0,
      from: params.from,
      to: params.to,
      label: `${params.from} – ${params.to}`,
    };
  }
  const n = Number(params.days);
  const days = (PRESET_DAYS as readonly number[]).includes(n) ? n : 30;
  const label = days === 1 ? "последний день" : `последние ${days} ${daysWord(days)}`;
  return { mode: "days", days, label };
}
