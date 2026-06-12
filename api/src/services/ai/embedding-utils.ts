/** L2-normalize embedding vectors when output dimensionality is below 3072 (Gemini requirement). */
export function normalizeVector(values: number[]): number[] {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) {
    return values;
  }
  return values.map((value) => value / norm);
}
