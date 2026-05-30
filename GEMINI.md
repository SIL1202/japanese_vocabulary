# Gemini CLI Project Instructions

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

### 3. UI 與 組件規範
- **組件化**: 側邊欄題庫已抽離至 `src/components/Library.tsx`。未來新增功能（如設定面板）應優先考慮組件化。
- **視覺風格**: 嚴格遵守玻璃擬態（Glassmorphism）設計。修改 UI 時應確保符合 `liquid-glass-react` 的層級關係。
- **動態色彩**: 應用程式背景色應隨隨機圖片動態變更，由 `src/utils/color.ts` 提取主色調。

### 4. 開發流程指令
- **啟動開發**: 必須使用 `npm run dev` 以確保後端伺服器與前端同步執行。
- **資料庫同步**: 修改 `src/data/db.json` 後，Vite 會觸發熱重載。若不希望頻繁重整，可考慮將其移出 `src` 或修改 Vite 設定。

## 未來擴充方向 (Roadmap)
- [ ] **多選題模式**: 除了輸入拼音，增加選擇題選項。
- [ ] **資料夾篩選練習**: 允許使用者選擇特定的資料夾進行測驗，而非全部混合。
- [ ] **匯出功能**: 提供將題庫匯出為 JSON 或 CSV 檔案的功能。
- [ ] **重音顯示**: 可選擇性地在 Library 中重新顯示被過濾掉的重音資訊（僅作參考，不參與測驗）。
