import type { Word, Collection } from "../data/words";

export function nextDifficulty(
  current: number,
  outcome: "correct" | "wrong",
): number {
  const base = current ?? 0;
  return outcome === "wrong" ? base + 2 : Math.max(0, base - 1);
}

export const wordKey = (w: Word): string => `${w.kanji} ${w.reading}`;

export function collectWords(
  collections: Collection[],
  folderIds: string[],
): Word[] {
  const set = new Set(folderIds);
  return collections.filter((c) => set.has(c.id)).flatMap((c) => c.words);
}

export function weightedSample(
  words: Word[],
  n: number,
  weighted: boolean,
): Word[] {
  const pool = [...words];
  const count = Math.min(n, pool.length);
  const result: Word[] = [];
  for (let i = 0; i < count; i++) {
    const weights = pool.map((w) => (weighted ? 1 + (w.difficulty ?? 0) : 1));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let idx = 0;
    while (idx < weights.length - 1 && r >= weights[idx]) {
      r -= weights[idx];
      idx++;
    }
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}
