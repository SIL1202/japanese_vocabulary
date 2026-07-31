import { describe, it, expect } from "vitest";
import { nextDifficulty, collectWords, weightedSample, applyOutcome } from "./quiz";
import type { Collection, Word } from "../data/words";

describe("nextDifficulty", () => {
  it("答錯時 +2", () => {
    expect(nextDifficulty(0, "wrong")).toBe(2);
    expect(nextDifficulty(3, "wrong")).toBe(5);
  });
  it("答對時 -1", () => {
    expect(nextDifficulty(3, "correct")).toBe(2);
  });
  it("答對不會低於 0", () => {
    expect(nextDifficulty(0, "correct")).toBe(0);
  });
});

const w = (kanji: string, difficulty = 0): Word => ({
  kanji, reading: kanji, part: "名", meaning: "x", difficulty,
});

describe("collectWords", () => {
  const cols: Collection[] = [
    { id: "a", name: "A", words: [w("犬"), w("猫")] },
    { id: "b", name: "B", words: [w("鳥")] },
  ];
  it("只收勾選資料夾的字", () => {
    expect(collectWords(cols, ["a"]).map((x) => x.kanji)).toEqual(["犬", "猫"]);
  });
  it("多選會合併", () => {
    expect(collectWords(cols, ["a", "b"]).length).toBe(3);
  });
  it("沒勾任何資料夾回傳空陣列", () => {
    expect(collectWords(cols, [])).toEqual([]);
  });
});

describe("weightedSample", () => {
  const pool = [w("犬"), w("猫"), w("鳥")];
  it("回傳數量正確且不重複", () => {
    const out = weightedSample(pool, 2, false);
    expect(out.length).toBe(2);
    expect(new Set(out.map((x) => x.kanji)).size).toBe(2);
  });
  it("n 大於池大小時回傳全部", () => {
    expect(weightedSample(pool, 99, true).length).toBe(3);
  });
  it("weighted=true 時高 difficulty 較常被抽第一個", () => {
    const p = [w("低", 0), w("高", 9)];
    let highFirst = 0;
    for (let i = 0; i < 2000; i++) {
      if (weightedSample(p, 1, true)[0].kanji === "高") highFirst++;
    }
    expect(highFirst).toBeGreaterThan(1500); // 期望約 10/11 ≈ 1818
  });
  it("weighted=false 時近似均勻", () => {
    const p = [w("低", 0), w("高", 9)];
    let highFirst = 0;
    for (let i = 0; i < 2000; i++) {
      if (weightedSample(p, 1, false)[0].kanji === "高") highFirst++;
    }
    expect(highFirst).toBeGreaterThan(800);
    expect(highFirst).toBeLessThan(1200);
  });
});

describe("applyOutcome", () => {
  const cols: Collection[] = [
    { id: "a", name: "A", words: [w("犬", 0), w("猫", 3)] },
  ];
  it("答錯：attempts+1、difficulty+2", () => {
    const out = applyOutcome(cols, cols[0].words[0], "wrong");
    expect(out[0].words[0].attempts).toBe(1);
    expect(out[0].words[0].difficulty).toBe(2);
  });
  it("答對：attempts+1、difficulty-1 不低於 0", () => {
    const out = applyOutcome(cols, cols[0].words[1], "correct");
    expect(out[0].words[1].attempts).toBe(1);
    expect(out[0].words[1].difficulty).toBe(2);
  });
  it("不更動其他字", () => {
    const out = applyOutcome(cols, cols[0].words[0], "wrong");
    expect(out[0].words[1].difficulty).toBe(3);
  });
  it("回傳新物件（不 mutate 原資料）", () => {
    const out = applyOutcome(cols, cols[0].words[0], "wrong");
    expect(cols[0].words[0].attempts).toBeUndefined();
    expect(out).not.toBe(cols);
  });
});

