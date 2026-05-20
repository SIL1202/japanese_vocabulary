let currentSessionWords = [];
let mistakeWords = [];
let currentIndex = 0;
let lives = 3;
let correctCount = 0;
let nextQuestionTimeout = null;

// DOM 元素
const startScreen = document.getElementById("start-screen");
const quizScreen = document.getElementById("quiz-screen");
const resultScreen = document.getElementById("result-screen");

const kanjiTitle = document.getElementById("word-kanji");
const wordInfo = document.getElementById("word-info");
const progressText = document.getElementById("progress-text");
const inputField = document.getElementById("answer-input");
const feedbackField = document.getElementById("feedback-msg");
const livesContainer = document.getElementById("lives-display");
const cardContainer = document.querySelector("#quiz-screen");
const skipButton = document.getElementById("skip-btn");

const resultStats = document.getElementById("result-stats");
const reviewBtn = document.getElementById("review-btn");

// 注入震動 CSS 動畫
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-8px); }
    40%, 80% { transform: translateX(8px); }
  }
  .shake-anim { animation: shake 0.3s ease-in-out; }
`;
document.head.appendChild(styleSheet);

/**
 * 開始測驗回合
 * @param {number|string} count - 題數
 */
function startSession(count) {
  // 洗牌原始題庫
  let shuffled = [...WORD_BANK].sort(() => Math.random() - 0.5);

  if (count === "all") {
    currentSessionWords = shuffled;
  } else {
    currentSessionWords = shuffled.slice(0, count);
  }

  currentIndex = 0;
  correctCount = 0;
  mistakeWords = [];

  showScreen("quiz");
  initQuestion();
}

/**
 * 開始複習錯誤題目
 */
function startReview() {
  currentSessionWords = [...mistakeWords];
  currentIndex = 0;
  correctCount = 0;
  mistakeWords = [];

  showScreen("quiz");
  initQuestion();
}

/**
 * 初始化單一題目
 */
function initQuestion() {
  const currentWord = currentSessionWords[currentIndex];
  lives = 3;

  if (kanjiTitle) kanjiTitle.innerText = currentWord.kanji;
  if (wordInfo)
    wordInfo.innerText = `【${currentWord.part}】${currentWord.meaning}`;

  if (progressText) {
    const currentNum = (currentIndex + 1).toString().padStart(2, "0");
    const totalNum = currentSessionWords.length.toString().padStart(2, "0");
    progressText.innerText = `${currentNum} / ${totalNum}`;
  }

  updateLivesDisplay();

  if (inputField) {
    inputField.disabled = false;
    inputField.value = "";
    inputField.className =
      "w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-xl text-center text-white placeholder-zinc-700 focus:outline-none focus:border-amber-400/40 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]";
    inputField.focus();
  }

  if (feedbackField) {
    feedbackField.innerText = "";
    feedbackField.className = "h-6 text-sm tracking-wider font-semibold";
  }
}

let currentScreen = "start";
let focusedBtnIndex = 0;

// 切換顯示畫面
function showScreen(screenType) {
  currentScreen = screenType;
  focusedBtnIndex = 0; // 重置焦點

  startScreen.classList.add("hidden");
  quizScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");

  if (screenType === "start") startScreen.classList.remove("hidden");
  if (screenType === "quiz") quizScreen.classList.remove("hidden");
  if (screenType === "result") resultScreen.classList.remove("hidden");

  updateNavFocus();
}

/**
 * 更新導航焦點視覺
 */
function updateNavFocus() {
  // 只在非測驗畫面處理
  if (currentScreen === "quiz") return;

  const currentContainer =
    currentScreen === "start" ? startScreen : resultScreen;
  const buttons = Array.from(
    currentContainer.querySelectorAll(".nav-btn:not(.hidden)"),
  );

  buttons.forEach((btn, index) => {
    if (index === focusedBtnIndex) {
      btn.classList.add("focused-btn");
    } else {
      btn.classList.remove("focused-btn");
    }
  });
}

/**
 * 全域鍵盤監聽 (用於導航)
 */
window.addEventListener("keydown", (e) => {
  if (currentScreen === "quiz") {
    if (e.key === "Escape") {
      if (skipButton) skipButton.click();
    }
    return;
  }

  const currentContainer =
    currentScreen === "start" ? startScreen : resultScreen;
  const buttons = Array.from(
    currentContainer.querySelectorAll(".nav-btn:not(.hidden)"),
  );
  if (buttons.length === 0) return;

  if (e.key === "j") {
    focusedBtnIndex = focusedBtnIndex + 1;
    if (focusedBtnIndex >= buttons.length) {
      focusedBtnIndex -= 1;
    }
    updateNavFocus();
  } else if (e.key === "k") {
    focusedBtnIndex = focusedBtnIndex - 1;
    if (focusedBtnIndex < 0) {
      focusedBtnIndex = 0;
    }
    updateNavFocus();
  } else if (e.key === "Enter") {
    buttons[focusedBtnIndex].click();
  }
});

// 初始化顯示
showScreen("start");

/**
 * 更新愛心顯示
 */
function updateLivesDisplay() {
  if (!livesContainer) return;
  let heartHtml = "";
  for (let i = 1; i <= 3; i++) {
    if (i <= lives) {
      heartHtml += `<span class="text-rose-500 text-base drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]">❤️</span>`;
    } else {
      heartHtml += `<span class="text-zinc-700 text-base">🖤</span>`;
    }
  }
  livesContainer.innerHTML = heartHtml;
}

/**
 * 處理 Enter 送出
 */
if (inputField) {
  inputField.addEventListener("keydown", function (e) {
    if (e.isComposing || e.keyCode === 229) return;

    if (e.key === "Enter") {
      const currentWord = currentSessionWords[currentIndex];
      let userValue = inputField.value
        .trim()
        .normalize("NFC")
        .replace(/[\u200B-\u200D\uFEFF]/g, "");

      if (userValue === "") return;

      if (userValue === currentWord.reading) {
        correctCount++;
        handleSuccess();
      } else {
        const hasJapanese = /[\u3040-\u309F\u30FC]/.test(userValue);
        if (!hasJapanese) {
          showFeedback(
            "💡 提示：請使用「平假名」讀音輸入喔！",
            "text-amber-400",
          );
          return;
        }

        lives--;
        updateLivesDisplay();
        triggerCardShake();

        if (lives > 0) {
          showFeedback(
            `殘念！讀音不對喔，剩餘 ${lives} 次機會！`,
            "text-rose-400",
          );
          inputField.classList.add("border-rose-500/50");
          setTimeout(
            () => inputField.classList.remove("border-rose-500/50"),
            300,
          );
        } else {
          handleFailure("機會用盡！");
        }
      }
    }
  });
}

function handleSuccess() {
  showFeedback("正解です！太棒了！", "text-emerald-400 animate-bounce");
  inputField.disabled = true;
  inputField.className =
    "w-full bg-black/40 border border-emerald-500/50 rounded-2xl px-6 py-4 text-xl text-center text-emerald-400 focus:outline-none transition-all";
  nextQuestionTimeout = setTimeout(nextQuestion, 1200);
}

function handleFailure(reason) {
  const currentWord = currentSessionWords[currentIndex];
  if (!mistakeWords.includes(currentWord)) {
    mistakeWords.push(currentWord);
  }

  showFeedback(`${reason} 正解是：【${currentWord.reading}】`, "text-rose-400");
  inputField.disabled = true;
  inputField.className =
    "w-full bg-black/20 border border-rose-500/30 rounded-2xl px-6 py-4 text-xl text-center text-zinc-500";
  nextQuestionTimeout = setTimeout(nextQuestion, 2000);
}

function showFeedback(text, className) {
  if (feedbackField) {
    feedbackField.innerText = text;
    feedbackField.className = `h-6 text-sm tracking-wider font-semibold ${className}`;
  }
}

function triggerCardShake() {
  if (!cardContainer) return;
  cardContainer.classList.add("shake-anim");
  setTimeout(() => cardContainer.classList.remove("shake-anim"), 300);
}

function nextQuestion() {
  if (nextQuestionTimeout) clearTimeout(nextQuestionTimeout);
  currentIndex++;

  if (currentIndex < currentSessionWords.length) {
    initQuestion();
  } else {
    showResults();
  }
}

function showResults() {
  showScreen("result");
  const accuracy = Math.round(
    (correctCount / currentSessionWords.length) * 100,
  );

  resultStats.innerHTML = `
    <div class="text-5xl font-bold text-white mb-4">${accuracy}%</div>
    <p>完成題數：${currentSessionWords.length}</p>
    <p>正確答對：${correctCount} 題</p>
    <p>錯誤題目：${mistakeWords.length} 題</p>
  `;

  if (mistakeWords.length > 0) {
    reviewBtn.classList.remove("hidden");
    reviewBtn.onclick = startReview;
  } else {
    reviewBtn.classList.add("hidden");
  }
}

if (skipButton) {
  skipButton.addEventListener("click", () => {
    const currentWord = currentSessionWords[currentIndex];
    if (!mistakeWords.includes(currentWord)) {
      mistakeWords.push(currentWord);
    }
    nextQuestion();
  });
}
