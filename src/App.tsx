import { useState, useRef, useEffect, useCallback } from "react";
import LiquidGlass from "liquid-glass-react";
import { Settings, FileText, CheckCircle2, X, BookOpen } from "lucide-react";
import type { Word } from "./data/words";

type Screen = "start" | "quiz" | "result";

export default function App() {
  // --- Background Logic ---
  const [bgImage, setBgBgImage] = useState("");
  useEffect(() => {
    const originalImages = [
      "https://picsum.photos/2000/2000",
      "https://picsum.photos/1200/1200",
      "https://picsum.photos/1400/1300",
      "https://picsum.photos/1100/1200",
    ];
    const randomImg =
      originalImages[Math.floor(Math.random() * originalImages.length)];
    setBgBgImage(randomImg);
  }, []);

  // --- Glass Controls ---
  const [displacementScale, setDisplacementScale] = useState(100);
  const [blurAmount, setBlurAmount] = useState(0.1);
  const [saturation, setSaturation] = useState(140);
  const [aberrationIntensity, setAberrationIntensity] = useState(2);
  const [elasticity, setElasticity] = useState(0.5);
  const [cornerRadius, setCornerRadius] = useState(50);
  const [overLight, setOverLight] = useState(false);
  const [mode, setMode] = useState<
    "standard" | "polar" | "prominent" | "shader"
  >("shader");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Quiz State ---
  const [screen, setScreen] = useState<Screen>("start");
  // 核心改動：改由動態管理目前的總單字庫，預設為空陣列
  const [customWordBank, setCustomWordBank] = useState<Word[]>([]);
  const [sessionWords, setSessionWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lives, setLives] = useState(3);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState<Word[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState({ text: "", type: "" });
  const [isShaking, setIsShaking] = useState(false);
  const [inputDisabled, setInputDisabled] = useState(false);

  // --- Import Raw Text State (新功能) ---
  const [rawText, setRawText] = useState("");
  const [importMessage, setImportMessage] = useState("");

  // result screen focused button for keyboard nav
  const [focusedBtn, setFocusedBtn] = useState(0);

  // --- UI State ---
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  // 初始化時，先嘗試從 localStorage 讀取上次匯入的單字庫
  useEffect(() => {
    const saved = localStorage.getItem("shigure_words");
    if (saved) {
      try {
        setCustomWordBank(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    if (screen === "quiz") setTimeout(() => inputRef.current?.focus(), 100);
    if (screen !== "quiz") setFocusedBtn(0);
  }, [screen]);

  // --- 純前端免 LLM 快速解析邏輯 ---
  const handleImportText = () => {
    if (!rawText.trim()) return;

    const lines = rawText.split("\n");
    const parsedWords: Word[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // 支援時雨之町常見的幾種複製格式 (Tab分隔、空格分隔、或直線|分隔)
      // 將所有的連續空白、Tab、或 | 符號統一替換成一個特殊字元來切分
      const tokens = trimmed
        .replace(/[\t|]+/g, " ")
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean);

      // 標準時雨複製格式一般會有 4 個主要欄位：漢字/語彙、讀音、詞性、中文
      if (tokens.length >= 3) {
        // 有些單字可能漢字和讀音相同（例如外來語），複製出來只有3欄
        const hasPart = tokens.some(
          (t) =>
            t.includes("名") ||
            t.includes("動") ||
            t.includes("形") ||
            t.includes("副"),
        );

        let kanji = tokens[0];
        let reading = tokens[1];
        let part = "單字";
        let meaning = tokens[2];

        if (tokens.length >= 4) {
          part = tokens[2];
          meaning = tokens.slice(3).join(" "); // 剩餘的通通當作中文解釋
        } else if (hasPart && tokens.length === 3) {
          // 如果只有三欄但中間有詞性
          reading = tokens[0]; // 漢字跟讀音一樣
          part = tokens[1];
          meaning = tokens[2];
        }

        parsedWords.push({
          kanji,
          reading: reading.replace(/[\s]/g, ""), // 移除讀音中可能的空格
          part,
          meaning,
        });
      }
    });

    if (parsedWords.length > 0) {
      const updatedBank = [...parsedWords];
      setCustomWordBank(updatedBank);
      localStorage.setItem("shigure_words", JSON.stringify(updatedBank));
      setImportMessage(`🎉 成功解析並匯入 ${parsedWords.length} 個單字！`);
      setRawText("");
      setTimeout(() => setImportMessage(""), 4000);
    } else {
      setImportMessage("❌ 解析失敗，請確認貼上的文字格式。");
    }
  };

  const startSession = useCallback((words: Word[]) => {
    setSessionWords(words);
    setCurrentIndex(0);
    setLives(3);
    setCorrectCount(0);
    setMistakes([]);
    setScreen("quiz");
    setFeedback({ text: "", type: "" });
    setInputDisabled(false);
    setInputValue("");
  }, []);

  const beginSession = (count: number | "all") => {
    if (customWordBank.length === 0) {
      alert("目前題庫空空如也！請先開啟右上角設定，貼入時雨之町的單字。");
      return;
    }
    const shuffled = [...customWordBank].sort(() => Math.random() - 0.5);
    startSession(count === "all" ? shuffled : shuffled.slice(0, count));
  };

  const startReview = () => {
    startSession([...mistakes]);
  };

  const nextQuestion = useCallback((idx: number, words: Word[]) => {
    if (idx + 1 < words.length) {
      setCurrentIndex(idx + 1);
      setLives(3);
      setInputValue("");
      setFeedback({ text: "", type: "" });
      setInputDisabled(false);
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setScreen("result");
    }
  }, []);

  const handleInputSubmit = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" || (e.nativeEvent as any).isComposing) return;
    const currentWord = sessionWords[currentIndex];
    const userValue = inputValue
      .trim()
      .normalize("NFC")
      .replace(/[\u200B-\u200D\uFEFF]/g, "");
    if (userValue === "") return;

    // Hiragana check
    const hasJapanese = /[\u3040-\u309F\u30FC]/.test(userValue);
    if (!hasJapanese) {
      setFeedback({
        text: "💡 提示：請使用「平假名」讀音輸入喔！",
        type: "text-amber-400",
      });
      return;
    }

    if (userValue === currentWord.reading) {
      setCorrectCount((prev) => prev + 1);
      setFeedback({ text: "正解です！太棒了！", type: "text-emerald-400" });
      setInputDisabled(true);
      setTimeout(() => nextQuestion(currentIndex, sessionWords), 1200);
    } else {
      const newLives = lives - 1;
      setLives(newLives);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 300);
      if (newLives <= 0) {
        setMistakes((p) =>
          p.some((w) => w.kanji === currentWord.kanji)
            ? p
            : [...p, currentWord],
        );
        setFeedback({
          text: `機會用盡！正解是：【${currentWord.reading}】`,
          type: "text-rose-400",
        });
        setInputDisabled(true);
        setTimeout(() => nextQuestion(currentIndex, sessionWords), 2000);
      } else {
        setFeedback({
          text: `殘念！讀音不對喔，剩餘 ${newLives} 次機會！`,
          type: "text-rose-400",
        });
      }
    }
  };

  const handleSkip = useCallback(() => {
    const currentWord = sessionWords[currentIndex];
    setMistakes((p) =>
      p.some((w) => w.kanji === currentWord.kanji) ? p : [...p, currentWord],
    );
    nextQuestion(currentIndex, sessionWords);
  }, [currentIndex, nextQuestion, sessionWords]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (screen === "quiz") {
        if (e.key === "Escape") handleSkip();
        return;
      }
      const buttons =
        screen === "start"
          ? [
              { action: () => beginSession(5) },
              { action: () => beginSession(10) },
              { action: () => beginSession("all") },
            ]
          : mistakes.length > 0
            ? [
                { action: startReview },
                {
                  action: () => {
                    setScreen("start");
                    setSessionWords([]);
                    setMistakes([]);
                  },
                },
              ]
            : [
                {
                  action: () => {
                    setScreen("start");
                    setSessionWords([]);
                    setMistakes([]);
                  },
                },
              ];

      if (e.key === "j")
        setFocusedBtn((p) => Math.min(p + 1, buttons.length - 1));
      else if (e.key === "k") setFocusedBtn((p) => Math.max(p - 1, 0));
      else if (e.key === "Enter") buttons[focusedBtn]?.action();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screen, focusedBtn, mistakes, customWordBank, currentIndex, handleSkip]);

  const accuracy =
    sessionWords.length > 0
      ? Math.round((correctCount / sessionWords.length) * 100)
      : 0;

  const startBtns = [
    { label: "5 題", action: () => beginSession(5) },
    { label: "10 題", action: () => beginSession(10) },
    { label: "所有題目", action: () => beginSession("all") },
  ];
  const resultBtns = [
    ...(mistakes.length > 0
      ? [
          {
            label: "複習錯誤題目",
            action: startReview,
            style:
              "bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/30 text-amber-400",
          },
        ]
      : []),
    {
      label: "重新開始",
      action: () => {
        setScreen("start");
        setSessionWords([]);
        setMistakes([]);
      },
      style: "bg-white/5 hover:bg-white/10 border-white/10 text-white",
    },
  ];

  return (
    <div
      className={`relative w-full max-w-5xl mx-auto md:my-10 h-screen md:max-h-[calc(100vh-5rem)] md:rounded-3xl overflow-hidden shadow-2xl bg-black`}
    >
      <div className="flex h-full w-full">
        {/* Left Panel - Sliding Library */}
        <div
          className={`h-full bg-black/20 backdrop-blur-xl border-r border-white/10 overflow-y-auto transition-all duration-500 ease-in-out flex flex-col ${
            isLibraryOpen
              ? "w-[300px] opacity-100 p-6"
              : "w-0 opacity-0 p-0 overflow-hidden border-none"
          }`}
        >
          <div className="min-w-[250px]">
            <div className="flex items-center justify-between mb-6 text-white">
              <div className="flex items-center gap-2">
                <BookOpen size={20} className="text-emerald-400" />
                <h3 className="font-bold text-sm uppercase tracking-wider">
                  單字題庫 ({customWordBank.length})
                </h3>
              </div>
              {customWordBank.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm("確定要清空所有題庫嗎？")) {
                      setCustomWordBank([]);
                      localStorage.removeItem("shigure_words");
                    }
                  }}
                  className="text-[10px] bg-red-500/20 hover:bg-red-500/40 text-red-400 px-2 py-1 rounded-md transition-colors"
                >
                  清空
                </button>
              )}
            </div>

            <div className="space-y-2 custom-scrollbar">
              {customWordBank.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 text-xs">
                  目前沒有單字，請從設定中匯入。
                </div>
              ) : (
                customWordBank.map((word, i) => (
                  <div
                    key={i}
                    className="p-3 bg-black/40 rounded-xl border border-white/5 text-[11px] group relative"
                  >
                    <button
                      onClick={() => {
                        const newBank = customWordBank.filter((_, idx) => idx !== i);
                        setCustomWordBank(newBank);
                        localStorage.setItem("shigure_words", JSON.stringify(newBank));
                      }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-red-400"
                    >
                      <X size={10} />
                    </button>
                    <div className="flex justify-between items-start mb-1 pr-4">
                      <span className="font-bold text-amber-200 text-sm">
                        {word.kanji}
                      </span>
                      <span className="text-[9px] text-zinc-500 bg-zinc-800 px-1 rounded">
                        {word.part}
                      </span>
                    </div>
                    <div className="text-zinc-400">
                      {word.reading} · {word.meaning}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Center Panel */}
        <div
          className="flex-1 relative bg-cover bg-center overflow-hidden transition-all duration-500"
          ref={containerRef}
          style={{ backgroundImage: `url('${bgImage}')` }}
        >
          <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>

          {/* Library Toggle Button */}
          <button
            onClick={() => setIsLibraryOpen(!isLibraryOpen)}
            className={`absolute top-4 left-4 z-50 p-3 bg-black/40 backdrop-blur-xl border border-white/10 text-white rounded-full hover:bg-white/10 transition-all ${isLibraryOpen ? "bg-emerald-600/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : ""}`}
          >
            <BookOpen size={20} />
          </button>

          <LiquidGlass
            displacementScale={displacementScale}
            blurAmount={blurAmount}
            saturation={saturation}
            aberrationIntensity={aberrationIntensity}
            elasticity={elasticity}
            cornerRadius={cornerRadius}
            mouseContainer={containerRef}
            overLight={overLight}
            mode={mode}
            padding="0px"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              className={`w-80 min-h-[460px] flex flex-col justify-center transition-transform duration-300 ${isShaking ? "animate-shake" : ""}`}
              style={{
                borderRadius: `${cornerRadius}px`,
                padding: "2.5rem",
              }}
            >
              {/* START */}
              {screen === "start" && (
                <>
                  <h3 className="text-xl font-semibold mb-1 text-white">
                    時雨日文練習機
                  </h3>
                  <div className="text-xs text-amber-400 mb-4 flex items-center gap-1">
                    <CheckCircle2 size={12} /> 當前題庫：{customWordBank.length}{" "}
                    個單字
                  </div>
                  <p className="text-sm text-white/70 mb-6">
                    選擇您想要練習的題數：
                  </p>
                  <div className="space-y-3">
                    {startBtns.map((btn, i) => (
                      <button
                        key={btn.label}
                        onClick={btn.action}
                        className={`w-full border text-white px-6 py-4 rounded-2xl transition-all active:scale-95 ${
                          focusedBtn === i
                            ? "bg-white/10 border-amber-400/60 shadow-[0_0_15px_rgba(251,191,36,0.2)] scale-[1.02]"
                            : "bg-white/5 hover:bg-white/10 border-white/10"
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* QUIZ */}
              {screen === "quiz" && (
                <>
                  <div className="mb-6">
                    <div className="flex justify-between items-center text-xs tracking-widest text-white/50 uppercase font-semibold">
                      <span>Vocabulary Test</span>
                      <span className="font-mono">
                        {(currentIndex + 1).toString().padStart(2, "0")} /{" "}
                        {sessionWords.length.toString().padStart(2, "0")}
                      </span>
                    </div>
                    <div className="flex justify-center gap-1.5 text-sm mt-3">
                      {[1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className={
                            i <= lives
                              ? "text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                              : "text-zinc-700"
                          }
                        >
                          {i <= lives ? "❤️" : "🖤"}
                        </span>
                      ))}
                    </div>
                  </div>
                  <h1 className="text-5xl font-bold text-white mb-3 tracking-tight break-all">
                    {sessionWords[currentIndex]?.kanji}
                  </h1>
                  <p className="text-white/50 text-sm mb-10 font-light">
                    【{sessionWords[currentIndex]?.part}】
                    {sessionWords[currentIndex]?.meaning}
                  </p>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    disabled={inputDisabled}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleInputSubmit}
                    placeholder="輸入平假名讀音..."
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xl text-center text-white placeholder-white/30 focus:outline-none focus:border-amber-400/40 transition-all shadow-inner"
                  />
                  <div
                    className={`h-6 text-sm font-semibold mt-4 text-center tracking-wide ${feedback.type}`}
                  >
                    {feedback.text}
                  </div>
                  <div className="mt-6 text-center">
                    <button
                      onClick={handleSkip}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white text-xs tracking-widest uppercase font-medium px-6 py-3 rounded-full transition-all active:scale-95"
                    >
                      跳過此題
                    </button>
                  </div>
                </>
              )}

              {/* RESULT */}
              {screen === "result" && (
                <>
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    練習結束！
                  </h3>
                  <div className="text-5xl font-bold text-white mb-3">
                    {accuracy}%
                  </div>
                  <div className="text-white/50 text-sm mb-8 space-y-1">
                    <p>完成題數：{sessionWords.length}</p>
                    <p>正確答對：{correctCount} 題</p>
                    <p>錯誤題目：{mistakes.length} 題</p>
                  </div>
                  <div className="space-y-3">
                    {resultBtns.map((btn, i) => (
                      <button
                        key={btn.label}
                        onClick={btn.action}
                        className={`w-full border px-6 py-4 rounded-2xl transition-all active:scale-95 ${btn.style} ${
                          focusedBtn === i
                            ? "ring-2 ring-amber-400/60 scale-[1.02]"
                            : ""
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </LiquidGlass>

          {/* Sidebar Toggle Button */}
          <button
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            className={`absolute top-4 right-4 z-50 p-3 bg-black/40 backdrop-blur-xl border border-white/10 text-white rounded-full hover:bg-white/10 transition-all ${isPanelOpen ? "rotate-90 bg-blue-600/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]" : ""}`}
          >
            <Settings
              size={20}
              className={isPanelOpen ? "animate-spin-slow" : ""}
            />
          </button>
        </div>

        {/* Right Panel - Sliding Sidebar */}
        <div
          className={`h-full bg-black/20 backdrop-blur-xl border-l border-white/10 overflow-y-auto transition-all duration-500 ease-in-out flex flex-col ${
            isPanelOpen
              ? "w-[340px] opacity-100 p-8"
              : "w-0 opacity-0 p-0 overflow-hidden border-none"
          }`}
        >
          <div className="min-w-[276px]">
            {/* 新功能區塊：時雨單字快速剪貼簿 */}
            <div className="mb-8 p-4 bg-white/5 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 mb-2 text-white">
                <FileText size={18} className="text-amber-400" />
                <h3 className="font-bold text-sm uppercase tracking-wider">
                  時雨單字剪貼簿
                </h3>
              </div>
              <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                直接至時雨之町網頁複製單字表，整塊貼在下方，系統將自動解析：
              </p>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="例如貼上：&#10;家族 かぞく 名 家人&#10;美味しい おいしい 形 美味"
                rows={5}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400 font-mono resize-none"
              />
              <button
                onClick={handleImportText}
                className="w-full mt-3 bg-amber-400 hover:bg-amber-500 text-black font-bold text-xs py-2.5 rounded-xl transition-all active:scale-95"
              >
                解析並匯入題庫
              </button>
              {importMessage && (
                <div className="mt-2 text-xs font-semibold text-center text-amber-300 animate-pulse">
                  {importMessage}
                </div>
              )}
            </div>

            <div className="space-y-8 flex-1 text-white">
              {/* 原有的 Glass 參數設定維持不變 */}
              <div>
                <span className="block text-sm font-semibold text-white/90 mb-3">
                  Refraction Mode
                </span>
                <div className="space-y-2">
                  {(["standard", "polar", "prominent", "shader"] as const).map(
                    (m) => (
                      <div key={m} className="flex items-center space-x-3">
                        <input
                          type="radio"
                          id={`m-${m}`}
                          name="mode"
                          value={m}
                          checked={mode === m}
                          onChange={(e) => setMode(e.target.value as any)}
                          className="w-4 h-4 accent-blue-500 cursor-pointer"
                        />
                        <label
                          htmlFor={`m-${m}`}
                          className="text-sm capitalize cursor-pointer hover:text-blue-400 transition-colors"
                        >
                          {m}
                        </label>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <Slider
                label="Displacement Scale"
                value={displacementScale}
                min={0}
                max={200}
                onChange={setDisplacementScale}
                color="text-blue-300"
              />
              <Slider
                label="Blur Amount"
                value={blurAmount}
                min={0}
                max={1}
                step={0.01}
                onChange={setBlurAmount}
                color="text-green-300"
              />
              <Slider
                label="Saturation"
                value={saturation}
                min={100}
                max={300}
                step={10}
                onChange={setSaturation}
                suffix="%"
                color="text-purple-300"
              />
              <Slider
                label="Chromatic Aberration"
                value={aberrationIntensity}
                min={0}
                max={20}
                step={1}
                onChange={setAberrationIntensity}
                color="text-cyan-300"
              />
              <Slider
                label="Elasticity"
                value={elasticity}
                min={0}
                max={1}
                step={0.05}
                onChange={setElasticity}
                color="text-orange-300"
              />
              <Slider
                label="Corner Radius"
                value={cornerRadius}
                min={0}
                max={100}
                onChange={setCornerRadius}
                suffix="px"
                color="text-pink-300"
              />

              <div>
                <span className="block text-sm font-semibold mb-3 text-white/90">
                  Over Light
                </span>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="overLight"
                    checked={overLight}
                    onChange={(e) => setOverLight(e.target.checked)}
                    className="w-5 h-5 accent-blue-500 cursor-pointer"
                  />
                  <label
                    htmlFor="overLight"
                    className="text-sm cursor-pointer hover:text-blue-400 transition-colors"
                  >
                    Tint dark
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix = "",
  color,
}: any) {
  return (
    <div>
      <div className="flex justify-between mb-3 text-[10px] uppercase tracking-widest text-zinc-500">
        <span>{label}</span>
        <span className={`font-mono ${color}`}>
          {typeof value === "number" && label.includes("Blur")
            ? value.toFixed(2)
            : value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
