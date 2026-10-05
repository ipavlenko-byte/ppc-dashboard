// Среднее без аномальных пиков: значение считается выбросом, если оно отклоняется от
// медианы сильнее, чем 2.5 робастных сигмы (MAD) И не меньше чем на 30% медианы
// (чтобы не помечать пиками мелкие колебания в рядах с почти одинаковыми значениями).
export interface RobustAvg {
  avg: number;
  outliers: boolean[]; // по индексам исходного массива
}

function median(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  return n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}

export function robustAvg(values: number[], weights?: number[], minDelta = 5): RobustAvg {
  const n = values.length;
  if (n < 4) {
    // Слишком мало точек, чтобы судить о выбросах.
    return { avg: weightedMean(values, weights, values.map(() => false)), outliers: values.map(() => false) };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const med = median(sorted);
  const mad = median(values.map((v) => Math.abs(v - med)).sort((a, b) => a - b));
  const threshold = Math.max(2.5 * 1.4826 * mad, 0.3 * med, minDelta);
  const outliers = values.map((v) => Math.abs(v - med) > threshold);
  return { avg: weightedMean(values, weights, outliers), outliers };
}

function weightedMean(values: number[], weights: number[] | undefined, outliers: boolean[]): number {
  let sum = 0;
  let w = 0;
  values.forEach((v, i) => {
    if (outliers[i]) return;
    const wi = weights ? weights[i] : 1;
    sum += v * wi;
    w += wi;
  });
  return w > 0 ? sum / w : 0;
}
