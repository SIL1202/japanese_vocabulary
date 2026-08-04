# Gemini CLI Project Instructions

## restore claude session: claude --resume daadac6b-0aae-4179-b29c-e5dfbc7d6252
## 核心架構與開發準則

### 1. 資料儲存架構 (Hybrid Storage)
- **實體資料庫 (Primary)**: 資料儲存在 `src/data/db.json`。所有寫入操作必須同步至此檔案。
- **後端 API**: 透過 `server.js` (Express) 提供的 `GET /api/collections` 與 `POST /api/collections` 進行資料讀取與更新。
- **本地暫存 (Fallback)**: 仍保留 `localStorage` (`shigure_words`) 作為後端斷線時的備援。
- **同步邏輯**: 應使用 `App.tsx` 中的 `updateCollections` 函數來確保資料同時寫入 State、LocalStorage 與 Backend。

### 2. 單字解析邏輯 (Parser Rules)
- **格式支援**: 支援 Tab、空格、或 `|` 分隔的日文單字表。
- **重音過濾**: 解析時必須使用正則表達式 `/^\[\d+\]+$/` 過濾掉如 `[0]`, `[1][2]` 等重音標記。
- **累積匯入**: 新匯入的單字應追加（Append）至指定資料夾，而非覆蓋（Replace）現有題庫。

### 3. 出題邏輯 (Quiz Selection Logic)
- **純函式模組**: 抽樣、難度與統計邏輯集中在 `src/utils/quiz.ts`，與 React 解耦、以 Vitest 測試（`src/utils/quiz.test.ts`）。`App.tsx` 只負責呼叫這些函式並管理 state / 持久化。
- **單字識別鍵**: 一律用 `wordKey(word) = `${kanji} ${reading}``（避免同漢字不同讀音互相污染）。錯題去重、統計比對都用此鍵。
- **弱點難度分數**: 每個 `Word` 有選填的 `difficulty`（缺省視為 0）。答錯 `+2`、答對 `max(0, -1)`（`nextDifficulty`）。
- **加權抽樣**: `weightedSample` 以 `weight = 1 + (difficulty ?? 0)` 逐次不重複抽樣（非 `sort(() => Math.random() - 0.5)`）。「純隨機」模式時權重全為 1。
- **資料夾篩選**: `collectWords(collections, selectedFolderIds)` 只收勾選資料夾的字。選取狀態用「對帳」effect 與 `customWordBank` 同步；**不要**把 `setSelectedFolderIds` 放進 `updateCollections`（會在每次答題重設選取）。
- **統計更新**: 答對／命歸零／跳過時呼叫 `applyOutcome(...)`（immutable），再經 `updateCollections` 持久化，跨 session 累積。
- **測試注意**: 修改上述任一函式後務必跑 `npm test`；`weightedSample` 的機率行為以統計門檻驗證。

### 4. UI 與 組件規範
- **組件化**: 側邊欄題庫已抽離至 `src/components/Library.tsx`。未來新增功能（如設定面板）應優先考慮組件化。
- **視覺風格**: 嚴格遵守玻璃擬態（Glassmorphism）設計。修改 UI 時應確保符合 `liquid-glass-react` 的層級關係。
- **中央卡片高度**: 玻璃卡片使用固定高度 `h-[460px] overflow-y-auto`，內容過多時應在卡片內部捲動，**不可**讓內容撐破玻璃邊框（新增列時請沿用內部捲動，如資料夾晶片列的 `max-h-[76px] overflow-y-auto`）。
- **動態色彩**: 應用程式背景色應隨隨機圖片動態變更，由 `src/utils/color.ts` 提取主色調。

### 5. 開發流程指令
- **啟動開發**: 必須使用 `npm run dev` 以確保後端伺服器與前端同步執行。
- **資料庫同步**: `src/data/db.json` 由後端在每次答題時寫入。它已在 `vite.config.ts` 的 `server.watch.ignored` 中被排除，避免每答一題就觸發整頁 reload；請勿移除此排除設定（否則會回歸該 bug）。
- **測試安全**: 手動驗證時**切勿** `POST /api/collections` 覆蓋正式 `src/data/db.json`（那是使用者的真實題庫）。請改用拋棄式資料或先備份還原。

## 未來擴充方向 (Roadmap)
- [x] **資料夾篩選練習**: 允許使用者選擇特定的資料夾進行測驗，而非全部混合。（開始畫面多選晶片）
- [x] **弱點加權出題**: 依 `difficulty` 分數加權抽題，可切換「弱點優先／純隨機」。
- [ ] **多選題模式**: 除了輸入拼音，增加選擇題選項。
- [ ] **匯出功能**: 提供將題庫匯出為 JSON 或 CSV 檔案的功能。
- [ ] **重音顯示**: 可選擇性地在 Library 中重新顯示被過濾掉的重音資訊（僅作參考，不參與測驗）。
- [ ] **大量資料夾的選取 UI**: 資料夾數量很多時（如 20+），晶片捲動可用性待強化（全選/全不選、搜尋、折疊）。
