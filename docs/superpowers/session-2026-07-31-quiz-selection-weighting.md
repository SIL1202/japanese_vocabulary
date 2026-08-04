# Session 摘要 — 出題邏輯改版（資料夾篩選 + 弱點加權）

日期：2026-07-31
分支：`feature/quiz-selection-weighting`（基於 `main`，**尚未合併**，保留中）

## 目標

改進出題（抽題）邏輯：
1. **按資料夾出題**：可只從勾選的資料夾抽題。
2. **弱點加權抽題**：常錯的單字更常被抽到，練熟的字逐漸淡出；可用「弱點優先／純隨機」開關切換。

## 關鍵設計決策

- **弱點分數（難度）**：採「折衷難度分數」而非單純線性或單純正確率。
  - 答錯 `difficulty += 2`；答對 `difficulty = max(0, difficulty - 1)`。
  - 抽題權重 `weight = 1 + (difficulty ?? 0)`。練熟後 difficulty 降回 0 自然「畢業」。
- **持久化**：統計欄位掛在 `Word` 上（`attempts?`、`difficulty?`），隨既有 `Collection[]` 一起經 `POST /api/collections` 寫入 `db.json`。**後端 server.js 零改動**。
- **單字識別鍵**：`kanji + " " + reading`（`wordKey`），避免同漢字不同讀音互相污染。
- **洗牌**：以逐次加權抽樣取代原本有偏差的 `sort(() => Math.random() - 0.5)`。
- **資料夾選取同步**：用「對帳」effect（保留有效選取、丟掉已刪資料夾、空選取時預設全選），避免把 `setSelectedFolderIds` 放進 `updateCollections` 造成每次答題重設選取的 bug。

## 架構

- 抽樣／難度／統計全部抽成純函式放 `src/utils/quiz.ts`，與 React 解耦、可單元測試：
  - `nextDifficulty(current, outcome)`
  - `wordKey(word)`
  - `collectWords(collections, folderIds)`
  - `weightedSample(words, n, weighted)`
  - `applyOutcome(collections, target, outcome)`（immutable）
- `src/App.tsx` 只負責呼叫純函式、管理 state（`selectedFolderIds`、`weightedMode`）與持久化。

## 變更檔案

- `src/utils/quiz.ts`（新）、`src/utils/quiz.test.ts`（新，14 個測試）
- `src/data/words.ts`：`Word` 加 `attempts?`、`difficulty?`
- `src/App.tsx`：資料夾篩選、加權抽題、統計更新、開始畫面晶片＋模式開關、UI 修正
- `package.json` / `vite.config.ts`：加 Vitest
- 文件：`docs/superpowers/specs/2026-07-31-quiz-selection-weighting-design.md`、`docs/superpowers/plans/2026-07-31-quiz-selection-weighting.md`

## Commit（main..HEAD）

```
fc03741 fix: keep start-screen glass card at fixed height and correct word-count label
3afc690 fix: align mistakes dedup with canonical kanji+reading word key
c8071ef feat: add folder-filter chips and random/weighted mode toggle to start screen
310fb43 feat: wire folder filter + weighted sampling + stat updates into quiz
98e47ab feat: add Word stats fields + applyOutcome pure function
35cda21 feat: add collectWords + weightedSample pure functions
6ec4d1f test: add vitest + nextDifficulty pure function
ce5f389 docs: refine folder-selection sync to avoid reset-on-answer bug
```

## 開發流程

用 superpowers 的 brainstorming → writing-plans → subagent-driven-development：每個任務派獨立 subagent 實作、任務後 review、最後整枝 review（opus）。最終判定 merge-ready、無 Critical。

## 驗證

- `npm test`：14/14 通過。`npm run build`：通過。
- 瀏覽器實測：開始畫面資料夾晶片、模式開關、玻璃卡片版面（使用者確認「非常完美」）。

## UI 修正（session 後段）

使用者回報開始畫面玻璃效果超出白色邊界（新增的晶片＋開關把內容撐破固定卡片）。修法：
- 玻璃卡片改固定高度 `h-[460px]` + 內部 `overflow-y-auto`，跨畫面高度一致、不再撐破邊框。
- 資料夾晶片列 `max-h-[76px] overflow-y-auto`，資料夾多時內部捲動。
- 順手修正 `當前題庫` 標籤：由顯示「資料夾數」改為 `reduce` 加總實際單字數。

## 已知／延後項目（非阻擋）

- `updateCollections` 每次答題都會 POST 後端 + 寫 localStorage（既有模式，網路較頻繁）。
- 新晶片／膠囊按鈕可 Tab 到達，但未接入自訂 j/k 鍵盤導航。
- 新匯入的資料夾預設不勾選（刻意，符合「只練我選的」）。
- 資料夾數量很多時（如 20 個）晶片區改為捲動，可用性待強化（見討論）。

## ⚠️ 事故備註

驗證階段一度用 `POST /api/collections` 塞測試資料，覆蓋了使用者的 `src/data/db.json`。事前已備份，隨後完整還原（4 個資料夾、127 字）。**教訓：驗證應使用拋棄式 DB 路徑或唯讀方式，不可動正式 `db.json`。**
