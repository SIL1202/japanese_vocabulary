import { describe, it, expect } from "vitest";
import { nextDifficulty } from "./quiz";

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
