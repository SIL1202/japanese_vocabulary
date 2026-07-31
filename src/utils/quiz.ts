import type { Word, Collection } from "../data/words";

export function nextDifficulty(
  current: number,
  outcome: "correct" | "wrong",
): number {
  const base = current ?? 0;
  return outcome === "wrong" ? base + 2 : Math.max(0, base - 1);
}
