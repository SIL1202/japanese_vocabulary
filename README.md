# Vocabulary Practice (日文練習機)

一個美觀且實用的日文單字練習工具，支援從「時雨之町」等網站快速匯入單字，並提供資料夾分類管理與實體檔案儲存功能。

## 🌟 核心功能

- **玻璃擬態 UI**: 採用 `liquid-glass-react` 打造現代感的視覺體驗。
- **單字剪貼簿**: 自動解析複製的日文單字表（支援漢字、讀音、詞性、中文意思）。
- **資料夾管理**: 支援建立多個題庫資料夾，並可進行累積匯入與管理。
- **實體資料庫**: 透過 Node.js 後端將單字永久儲存於 `src/data/db.json`。
- **測驗模式**: 支援自定義題數練習，具備生命值系統與錯誤題目複習。
- **資料夾篩選出題**: 開始畫面可勾選一個或多個資料夾，只從所選範圍抽題（預設全選）。
- **弱點加權出題**: 記錄每個單字的作答表現（`attempts` / `difficulty`），常錯的字更常被抽到、練熟後自然淡出；可用「弱點優先／純隨機」開關切換。
- **自動遷移**: 首次執行時會自動將舊版的 LocalStorage 資料遷移至新資料庫。

## 🚀 快速開始

### 1. 安裝依賴
```bash
npm install
```

### 2. 啟動開發伺服器
此指令會同時啟動前端 (Vite) 與後端伺服器 (Node.js)：
```bash
npm run dev
```
- 前端網址: `http://localhost:5173`
- 後端 API: `http://localhost:3001`

### 3. 建置專案
```bash
npm run build
```

### 4. 執行測試
出題邏輯（抽樣、難度、統計）的純函式以 Vitest 覆蓋：
```bash
npm test
```

## 🛠 技術棧

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide React
- **Backend**: Node.js, Express, CORS
- **Storage**: JSON File (`src/data/db.json`)
- **Animation**: Liquid Glass

## 📂 專案結構

- `src/App.tsx`: 主要邏輯與狀態管理。
- `src/components/Library.tsx`: 題庫清單與資料夾管理組件。
- `src/data/db.json`: 單字實體資料庫檔案。
- `src/data/words.ts`: `Word` / `Collection` 型別（`Word` 含選填的 `attempts` / `difficulty` 統計欄位）。
- `src/utils/quiz.ts`: 出題純函式（`collectWords` 資料夾篩選、`weightedSample` 加權抽樣、`nextDifficulty` 難度更新、`applyOutcome` 統計更新、`wordKey` 單字識別鍵）。
- `src/utils/quiz.test.ts`: 出題純函式的 Vitest 單元測試。
- `server.js`: 輕量級 Express 伺服器。
- `src/utils/color.ts`: 背景顏色動態提取工具。

## 📝 授權

MIT
