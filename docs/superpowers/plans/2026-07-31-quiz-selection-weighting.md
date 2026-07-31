# 出題邏輯改版（資料夾篩選 + 弱點加權）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓練習可只從指定資料夾抽題，並讓常錯的單字被抽中機率更高（可切換純隨機／弱點優先）。

**Architecture:** 把抽樣與難度計算抽成 `src/utils/quiz.ts` 的純函式（可單元測試），`App.tsx` 只負責呼叫這些純函式、管理 React state 與持久化。弱點統計欄位掛在既有 `Word` 上，透過現有 `updateCollections()` 存回後端＋localStorage，後端零改動。

**Tech Stack:** React 19 + TypeScript + Vite；新增 Vitest 作測試框架。

## Global Constraints

- TypeScript / ESM（`package.json` 已 `"type": "module"`）。
- **後端 `server.js` 不得修改**——統計靠 `Word` 新欄位隨 `Collection[]` 一起持久化。
- 新欄位一律選填，缺省 `?? 0`，不做資料 migration。
- UI 沿用現有玻璃樣式 class：`bg-white/5`、`bg-white/10`、`border-white/10`、`rounded-2xl`、focus/hover 高亮（參考 `src/App.tsx:493-497`）。
- 單字比對鍵一律為 `` `${kanji} ${reading}` ``。

---

## File Structure

- Create: `src/utils/quiz.ts` — 純函式：`nextDifficulty`、`collectWords`、`weightedSample`、`applyOutcome`。
- Create: `src/utils/quiz.test.ts` — 上述函式的單元測試。
- Modify: `src/data/words.ts` — `Word` 加 `attempts?`、`difficulty?`。
- Modify: `src/App.tsx` — `beginSession` 改用純函式；`handleInputSubmit` / `handleSkip` 更新統計；開始畫面加資料夾晶片與模式開關 + state。
- Modify: `package.json` — 加 `vitest` devDependency 與 `test` script。
- Modify: `vite.config.ts` — 加 vitest test 設定（node 環境）。

---

### Task 1: 測試框架 + `nextDifficulty`

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/utils/quiz.ts`
- Test: `src/utils/quiz.test.ts`

**Interfaces:**
- Produces: `nextDifficulty(current: number, outcome: "correct" | "wrong"): number`

- [ ] **Step 1: 安裝 Vitest 並加 script**

Run:
```bash
npm install -D vitest
```
然後在 `package.json` 的 `scripts` 加一行：
```json
"test": "vitest run"
```

- [ ] **Step 2: 設定 vite.config.ts 測試環境**

在 `vite.config.ts` 的 `defineConfig({...})` 內加入（node 環境即可，純函式不需 DOM）：
```ts
test: {
  environment: "node",
  include: ["src/**/*.test.ts"],
},
```
若檔案頂端型別報錯，加上第一行：`/// <reference types="vitest/config" />`

- [ ] **Step 3: 寫失敗測試**

`src/utils/quiz.test.ts`：
```ts
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
```

- [ ] **Step 4: 執行測試確認失敗**

Run: `npm test`
Expected: FAIL，`nextDifficulty` is not defined / 無此模組。

- [ ] **Step 5: 寫最小實作**

`src/utils/quiz.ts`：
```ts
import type { Word, Collection } from "../data/words";

export function nextDifficulty(
  current: number,
  outcome: "correct" | "wrong",
): number {
  const base = current ?? 0;
  return outcome === "wrong" ? base + 2 : Math.max(0, base - 1);
}
```
（`Word`/`Collection` import 供後續任務使用，本任務先放著。）

- [ ] **Step 6: 執行測試確認通過**

Run: `npm test`
Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/utils/quiz.ts src/utils/quiz.test.ts
git commit -m "test: add vitest + nextDifficulty pure function"
```

---

### Task 2: `collectWords` 與 `weightedSample`

**Files:**
- Modify: `src/utils/quiz.ts`
- Test: `src/utils/quiz.test.ts`

**Interfaces:**
- Consumes: `Word`, `Collection`（`src/data/words.ts`）
- Produces:
  - `collectWords(collections: Collection[], folderIds: string[]): Word[]`
  - `weightedSample(words: Word[], n: number, weighted: boolean): Word[]`

- [ ] **Step 1: 寫失敗測試**

在 `src/utils/quiz.test.ts` 追加：
```ts
import { collectWords, weightedSample } from "./quiz";
import type { Collection, Word } from "../data/words";

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
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test`
Expected: FAIL，`collectWords` / `weightedSample` is not defined。

- [ ] **Step 3: 寫實作**

在 `src/utils/quiz.ts` 追加：
```ts
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
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test`
Expected: PASS（統計測試偶爾邊界，若失敗重跑一次確認穩定）。

- [ ] **Step 5: Commit**

```bash
git add src/utils/quiz.ts src/utils/quiz.test.ts
git commit -m "feat: add collectWords + weightedSample pure functions"
```

---

### Task 3: `Word` 統計欄位 + `applyOutcome`

**Files:**
- Modify: `src/data/words.ts`
- Modify: `src/utils/quiz.ts`
- Test: `src/utils/quiz.test.ts`

**Interfaces:**
- Consumes: `wordKey`, `nextDifficulty`（Task 1/2）
- Produces: `applyOutcome(collections: Collection[], target: Word, outcome: "correct" | "wrong"): Collection[]`

- [ ] **Step 1: 擴充 Word 型別**

`src/data/words.ts` 的 `interface Word` 加兩個選填欄位：
```ts
export interface Word {
  kanji: string;
  reading: string;
  part: string;
  meaning: string;
  attempts?: number;    // 累計作答次數（統計顯示用）
  difficulty?: number;  // 難度分數，驅動加權；缺省視為 0
}
```

- [ ] **Step 2: 寫失敗測試**

追加到 `src/utils/quiz.test.ts`：
```ts
import { applyOutcome } from "./quiz";

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
```

- [ ] **Step 3: 執行測試確認失敗**

Run: `npm test`
Expected: FAIL，`applyOutcome` is not defined。

- [ ] **Step 4: 寫實作**

在 `src/utils/quiz.ts` 追加：
```ts
export function applyOutcome(
  collections: Collection[],
  target: Word,
  outcome: "correct" | "wrong",
): Collection[] {
  const key = wordKey(target);
  return collections.map((c) => ({
    ...c,
    words: c.words.map((w) =>
      wordKey(w) === key
        ? {
            ...w,
            attempts: (w.attempts ?? 0) + 1,
            difficulty: nextDifficulty(w.difficulty ?? 0, outcome),
          }
        : w,
    ),
  }));
}
```

- [ ] **Step 5: 執行測試確認通過**

Run: `npm test`
Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add src/data/words.ts src/utils/quiz.ts src/utils/quiz.test.ts
git commit -m "feat: add Word stats fields + applyOutcome pure function"
```

---

### Task 4: `App.tsx` 接上抽題與統計更新

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `collectWords`, `weightedSample`, `applyOutcome`（Task 2/3）

- [ ] **Step 1: import 純函式**

在 `src/App.tsx` 頂端 import 區加：
```ts
import { collectWords, weightedSample, applyOutcome } from "./utils/quiz";
```

- [ ] **Step 2: 新增 state（放在其他 quiz state 附近，約 `src/App.tsx:47-58`）**

```ts
const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
const [weightedMode, setWeightedMode] = useState(true);
```

- [ ] **Step 2b: 加一個 effect 讓資料夾選取與題庫同步（放在 state 定義之後、任一現有 useEffect 附近）**

不要把 `setSelectedFolderIds` 塞進 `updateCollections`（那會在每次答題更新統計時誤重設選取）。改用一個「對帳」effect：保留使用者仍有效的選取、丟掉已刪除的資料夾、選取為空時（含初次載入）預設全選。
```ts
useEffect(() => {
  setSelectedFolderIds((prev) => {
    const ids = customWordBank.map((c) => c.id);
    const kept = prev.filter((id) => ids.includes(id));
    return kept.length > 0 ? kept : ids;
  });
}, [customWordBank]);
```
如此：初次載入 `prev=[]` → 全選；新增資料夾後保留原選取（新資料夾預設不選，符合「只練我選的」直覺，如需預設全選可改為 `ids`）；刪除資料夾後自動移除；答題更新統計時 `ids` 不變、`kept===prev`，不會動到選取。

- [ ] **Step 3: 改寫 `beginSession`（取代 `src/App.tsx:229-237`）**

```ts
const beginSession = (count: number | "all") => {
  const pool = collectWords(customWordBank, selectedFolderIds);
  if (pool.length === 0) {
    alert("目前題庫空空如也！請先開啟右上角設定，貼入時雨之町的單字。");
    return;
  }
  const n = count === "all" ? pool.length : count;
  startSession(weightedSample(pool, n, weightedMode));
};
```

- [ ] **Step 4: 統計更新——答對與命歸零（改 `handleInputSubmit`，`src/App.tsx:275-296`）**

在答對分支（`if (userValue === currentWord.reading)`）內、`setCorrectCount` 之後加：
```ts
updateCollections(applyOutcome(customWordBank, currentWord, "correct"));
```
在 `newLives <= 0` 分支內、`setMistakes(...)` 之後加：
```ts
updateCollections(applyOutcome(customWordBank, currentWord, "wrong"));
```

- [ ] **Step 5: 統計更新——跳過（改 `handleSkip`，`src/App.tsx:306-312`）**

在 `setMistakes(...)` 之後、`nextQuestion(...)` 之前加：
```ts
updateCollections(applyOutcome(customWordBank, currentWord, "wrong"));
```
注意：`handleSkip` 為 `useCallback`，其依賴陣列（`src/App.tsx:312`）需加入 `customWordBank`。

- [ ] **Step 6: 型別/建置檢查**

Run: `npm run build`
Expected: TypeScript 編譯通過、無型別錯誤。若 `updateCollections` 因 Step 2 修改而觸發 `selectedFolderIds` 重設造成 lint 疑慮，確認行為：新增/刪資料夾後恢復全選，屬預期。

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire folder filter + weighted sampling + stat updates into quiz"
```

---

### Task 5: 開始畫面 UI（資料夾晶片 + 模式開關）

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `selectedFolderIds`, `setSelectedFolderIds`, `weightedMode`, `setWeightedMode`（Task 4）

- [ ] **Step 1: 在 START 區塊插入 UI（`src/App.tsx:485-487` 的說明文字與 `src/App.tsx:488` 的按鈕群之間）**

在 `<p>選擇您想要練習的題數：</p>` 之前插入資料夾晶片與模式開關：
```tsx
{customWordBank.length > 0 && (
  <div className="mb-5">
    <p className="text-xs text-white/50 mb-2">選擇資料夾：</p>
    <div className="flex flex-wrap gap-2 mb-4">
      {customWordBank.map((c) => {
        const active = selectedFolderIds.includes(c.id);
        return (
          <button
            key={c.id}
            onClick={() =>
              setSelectedFolderIds((prev) =>
                prev.includes(c.id)
                  ? prev.filter((id) => id !== c.id)
                  : [...prev, c.id],
              )
            }
            className={`text-xs px-3 py-1.5 rounded-full border transition-all active:scale-95 ${
              active
                ? "bg-white/10 border-amber-400/60 text-white shadow-[0_0_10px_rgba(251,191,36,0.2)]"
                : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
            }`}
          >
            {c.name}
          </button>
        );
      })}
    </div>
    <div className="flex gap-2 bg-white/5 border border-white/10 rounded-2xl p-1">
      {[
        { key: true, label: "弱點優先" },
        { key: false, label: "純隨機" },
      ].map((m) => (
        <button
          key={m.label}
          onClick={() => setWeightedMode(m.key)}
          className={`flex-1 text-xs px-3 py-2 rounded-xl transition-all active:scale-95 ${
            weightedMode === m.key
              ? "bg-white/10 border border-amber-400/60 text-white shadow-[0_0_10px_rgba(251,191,36,0.2)]"
              : "text-white/50 hover:text-white"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 2: 建置檢查**

Run: `npm run build`
Expected: 編譯通過。

- [ ] **Step 3: 手動驗證（TDD 之外的 UI 驗證）**

Run: `npm run dev`，開瀏覽器：
- 開始畫面出現資料夾晶片（預設全部高亮）與「弱點優先／純隨機」膠囊（預設弱點優先高亮）。
- 取消勾選某資料夾後開始測驗，出現的題目不含該資料夾單字。
- 切到「純隨機」開始，抽題不受 difficulty 影響。
- 玻璃風格與現有題數按鈕一致（同樣的 border/hover/發光）。

- [ ] **Step 4: 驗證弱點加權端到端**

- 對某字連續答錯到命歸零幾次 → 重新開始 → 該字明顯更常出現。
- 之後多次答對該字 → 出現頻率下降。
- 重新整理頁面（重讀後端/localStorage）→ 統計仍在（`difficulty`/`attempts` 已持久化）。

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add folder-filter chips and random/weighted mode toggle to start screen"
```

---

## Self-Review

**Spec coverage：**
- 資料模型（attempts/difficulty）→ Task 3。
- 弱點加權規則（+2 / −1 floor 0、weight=1+difficulty）→ Task 1（difficulty）、Task 2（sample）。
- 抽題流程（資料夾池、空池提示、加權/純隨機、N>池、Fisher–Yates）→ Task 2 + Task 4。
- 統計更新（答對/命歸零/跳過、kanji+reading 鍵、updateCollections 持久化）→ Task 3 + Task 4。
- UI（資料夾多選晶片、模式開關、玻璃樣式）→ Task 5。
- 純函式模組邊界（quiz.ts）＋單元測試 → Task 1–3。
- 相容性（?? 0、後端不改）→ Global Constraints + Task 3/4。

**Placeholder scan：** 無 TBD/TODO；所有步驟含實際程式碼與指令。

**Type consistency：** `nextDifficulty` / `collectWords` / `weightedSample` / `applyOutcome` / `wordKey` 簽章在定義任務與呼叫任務一致；`outcome` 型別統一為 `"correct" | "wrong"`；`Word` 新欄位命名一致。
