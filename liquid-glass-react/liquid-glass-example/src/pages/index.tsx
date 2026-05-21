import { Geist } from "next/font/google";
import { useState, useRef, useEffect, useCallback } from "react";
import LiquidGlass from "liquid-glass-react";
import { Github } from "lucide-react";
import { WORD_BANK } from "@/data/words";
import type { Word } from "@/data/words";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

type Screen = "start" | "quiz" | "result";

export default function Home() {
  // --- Glass Controls ---
  const [displacementScale, setDisplacementScale] = useState(100);
  const [blurAmount, setBlurAmount] = useState(0.5);
  const [saturation, setSaturation] = useState(140);
  const [aberrationIntensity, setAberrationIntensity] = useState(2);
  const [elasticity, setElasticity] = useState(0);
  const [cornerRadius, setCornerRadius] = useState(32);
  const [overLight, setOverLight] = useState(false);
  const [mode, setMode] = useState<
    "standard" | "polar" | "prominent" | "shader"
  >("standard");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [scroll, setScroll] = useState(0);
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    requestAnimationFrame(() => {
      setScroll((event?.target as any)?.scrollTop);
    });
  };
  const scrollingOverBrightSection = scroll > 230 && scroll < 500;

  // --- Quiz State ---
  const [screen, setScreen] = useState<Screen>("start");
  const [sessionWords, setSessionWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lives, setLives] = useState(3);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState<Word[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState({ text: "", type: "" });
  const [isShaking, setIsShaking] = useState(false);
  const [inputDisabled, setInputDisabled] = useState(false);

  // result screen focused button for keyboard nav
  const [focusedBtn, setFocusedBtn] = useState(0);

  useEffect(() => {
    if (screen === "quiz") setTimeout(() => inputRef.current?.focus(), 100);
    if (screen !== "quiz") setFocusedBtn(0);
  }, [screen]);

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
    const shuffled = [...WORD_BANK].sort(() => Math.random() - 0.5);
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

  const handleSkip = () => {
    const currentWord = sessionWords[currentIndex];
    setMistakes((p) =>
      p.some((w) => w.kanji === currentWord.kanji) ? p : [...p, currentWord],
    );
    nextQuestion(currentIndex, sessionWords);
  };

  // Keyboard navigation for start/result screens, Escape to skip on quiz
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
            ? [{ action: startReview }, { action: () => location.reload() }]
            : [{ action: () => location.reload() }];

      if (e.key === "j")
        setFocusedBtn((p) => Math.min(p + 1, buttons.length - 1));
      else if (e.key === "k") setFocusedBtn((p) => Math.max(p - 1, 0));
      else if (e.key === "Enter") buttons[focusedBtn]?.action();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screen, focusedBtn, mistakes, sessionWords, currentIndex]);

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
      className={`${geistSans.className} grid grid-cols-1 grid-rows-2 md:grid-rows-1 md:grid-cols-3 shadow-2xl w-full max-w-5xl mx-auto md:my-10 h-screen md:max-h-[calc(100vh-5rem)] md:rounded-3xl overflow-hidden`}
    >
      {/* Left Panel */}
      <div
        className="flex-1 relative overflow-auto min-h-screen md:col-span-2"
        ref={containerRef}
        onScroll={handleScroll}
      >
        <div className="w-full min-h-[200vh] absolute top-0 left-0 pb-96 mb-96">
          <img
            src="https://picsum.photos/2000/2000"
            className="w-full h-96 object-cover"
            alt=""
          />
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold my-5 text-center">
              Some Heading
            </h2>
            <p className="px-10">
              Bacon ipsum dolor amet hamburger Bacon ipsum dolor amet hamburger{" "}
              <br />
              Bacon ipsum dolor amet hamburger Bacon ipsum dolor amet hamburger{" "}
              <br />
              Bacon ipsum dolor amet hamburger Bacon ipsum dolor amet hamburger{" "}
              <br />
              Bacon ipsum dolor amet hamburger Bacon ipsum dolor amet hamburger
            </p>
          </div>
          <img
            src="https://picsum.photos/1200/1200"
            className="w-full h-80 object-cover my-10"
            alt=""
          />
          <img
            src="https://picsum.photos/1400/1300"
            className="w-full h-72 object-cover my-10"
            alt=""
          />
          <img
            src="https://picsum.photos/1100/1200"
            className="w-full h-96 object-cover my-10 mb-96"
            alt=""
          />
        </div>

        <LiquidGlass
          displacementScale={displacementScale}
          blurAmount={blurAmount}
          saturation={saturation}
          aberrationIntensity={aberrationIntensity}
          elasticity={elasticity}
          cornerRadius={cornerRadius}
          mouseContainer={containerRef}
          overLight={scrollingOverBrightSection || overLight}
          mode={mode}
          padding="0px"
          style={{
            position: "fixed",
            top: "50%",
            left: "33%",
            // transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className={`w-80 min-h-[460px] flex flex-col justify-center transition-transform duration-300 ${isShaking ? "animate-[shake_0.3s_ease-in-out]" : ""}`}
            style={{ borderRadius: `${cornerRadius}px`, padding: "2.5rem" }}
          >
            {/* START */}
            {screen === "start" && (
              <>
                <h3 className="text-xl font-semibold mb-4">稱謂練習</h3>
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
                            ? "text-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]"
                            : "text-zinc-700"
                        }
                      >
                        {i <= lives ? "❤️" : "🖤"}
                      </span>
                    ))}
                  </div>
                </div>
                <h1 className="text-6xl font-bold text-white mb-3 tracking-tight">
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
                <h3 className="text-xl font-semibold mb-4">練習結束！</h3>
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
      </div>

      {/* Right Panel */}
      <div className="row-start-2 rounded-t-3xl md:rounded-none md:col-start-3 bg-gray-900/80 h-full overflow-y-auto backdrop-blur-md border-l border-white/10 p-8 flex flex-col">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">稱謂練習</h2>
            <a
              href="https://github.com/rdev/liquid-glass-react"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <Github className="w-6 h-6" />
            </a>
          </div>
          <p className="text-white/60 text-sm">
            Liquid Glass container effect for React.
          </p>
          <p className="font-semibold text-yellow-300 text-xs mt-2 leading-snug">
            ⚠️ This doesn't fully work in Safari and Firefox.
          </p>
        </div>

        <div className="space-y-8 flex-1">
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
                      id={`mode-${m}`}
                      name="mode"
                      value={m}
                      checked={mode === m}
                      onChange={(e) => setMode(e.target.value as typeof mode)}
                      className="w-4 h-4 accent-blue-500"
                    />
                    <label
                      htmlFor={`mode-${m}`}
                      className="text-sm text-white/90 capitalize"
                    >
                      {m}
                      {m === "shader" ? " (Experimental)" : ""}
                    </label>
                  </div>
                ),
              )}
            </div>
            <p className="text-xs text-white/50 mt-2">
              Controls the refraction calculation method
            </p>
          </div>

          <div>
            <span className="block text-sm font-semibold text-white/90 mb-3">
              Displacement Scale
            </span>
            <div className="mb-2">
              <span className="text-xl font-mono text-blue-300">
                {displacementScale}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              step="1"
              value={displacementScale}
              onChange={(e) => setDisplacementScale(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-white/50 mt-2">
              Controls the intensity of edge distortion
            </p>
          </div>

          <div>
            <span className="block text-sm font-semibold text-white/90 mb-3">
              Blur Amount
            </span>
            <div className="mb-2">
              <span className="text-xl font-mono text-green-300">
                {blurAmount.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={blurAmount}
              onChange={(e) => setBlurAmount(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-white/50 mt-2">
              Controls backdrop blur intensity
            </p>
          </div>

          <div>
            <span className="block text-sm font-semibold text-white/90 mb-3">
              Saturation
            </span>
            <div className="mb-2">
              <span className="text-xl font-mono text-purple-300">
                {saturation}%
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="300"
              step="10"
              value={saturation}
              onChange={(e) => setSaturation(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-white/50 mt-2">
              Controls color saturation of the backdrop
            </p>
          </div>

          <div>
            <span className="block text-sm font-semibold text-white/90 mb-3">
              Chromatic Aberration
            </span>
            <div className="mb-2">
              <span className="text-xl font-mono text-cyan-300">
                {aberrationIntensity}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={aberrationIntensity}
              onChange={(e) => setAberrationIntensity(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-white/50 mt-2">
              Controls RGB channel separation intensity
            </p>
          </div>

          <div>
            <span className="block text-sm font-semibold text-white/90 mb-3">
              Elasticity
            </span>
            <div className="mb-2">
              <span className="text-xl font-mono text-orange-300">
                {elasticity.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={elasticity}
              onChange={(e) => setElasticity(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-white/50 mt-2">
              Controls how much the glass reaches toward the cursor
            </p>
          </div>

          <div>
            <span className="block text-sm font-semibold text-white/90 mb-3">
              Corner Radius
            </span>
            <div className="mb-2">
              <span className="text-xl font-mono text-pink-300">
                {cornerRadius === 999 ? "Full" : `${cornerRadius}px`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={cornerRadius}
              onChange={(e) => setCornerRadius(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-white/50 mt-2">
              Controls the roundness of the glass corners
            </p>
          </div>

          <div>
            <span className="block text-sm font-semibold text-white/90 mb-3">
              Over Light
            </span>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="overLight"
                checked={overLight}
                onChange={(e) => setOverLight(e.target.checked)}
                className="w-5 h-5 accent-blue-500"
              />
              <label htmlFor="overLight" className="text-sm text-white/90">
                Tint liquid glass dark (use for bright backgrounds)
              </label>
            </div>
            <p className="text-xs text-white/50 mt-2">
              Makes the glass darker for better visibility on light backgrounds
            </p>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
      `,
        }}
      />
    </div>
  );
}
