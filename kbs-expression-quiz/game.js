(function () {
  "use strict";

  const data = Array.isArray(window.KBS_EXPRESSION_DATA) ? window.KBS_EXPRESSION_DATA : [];
  const app = document.getElementById("app");
  const categories = ["어휘 관계", "속담", "한자 성어", "관용구"];
  const categoryMeta = {
    전체: { icon: "ALL", description: "네 영역을 골고루 섞어 출제" },
    "어휘 관계": { icon: "뜻", description: "다의어·동음이의어·혼동 어휘" },
    속담: { icon: "俗", description: "상황과 비유적 의미 연결" },
    "한자 성어": { icon: "漢", description: "한자 표기와 비유적 의미" },
    관용구: { icon: "句", description: "구성어와 관용적 의미" },
  };
  const pools = Object.fromEntries(categories.map((category) => [category, data.filter((item) => item.category === category)]));
  pools.전체 = data;

  const state = {
    stage: "setup",
    category: "전체",
    count: 20,
    questions: [],
    index: 0,
    options: [],
    selected: null,
    score: 0,
    records: [],
  };

  function shuffle(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
    })[char]);
  }

  function termLabel(item) {
    return item.origin ? `${item.term}(${item.origin})` : item.term;
  }

  function poolFor(item) {
    return pools[item.category] || data;
  }

  function makeOptions(answer) {
    const isRelation = answer.category === "어휘 관계";
    const correctText = isRelation ? answer.definition : termLabel(answer);
    const used = new Set([correctText]);
    const wrong = [];

    if (isRelation) {
      for (const meaning of answer.otherMeanings || []) {
        if (!meaning || used.has(meaning)) continue;
        used.add(meaning);
        wrong.push(meaning);
        if (wrong.length === 3) break;
      }
    }

    for (const item of shuffle(poolFor(answer))) {
      const text = isRelation ? item.definition : termLabel(item);
      if (item.id === answer.id || !text || used.has(text)) continue;
      used.add(text);
      wrong.push(text);
      if (wrong.length === 3) break;
    }

    return shuffle([
      { text: correctText, correct: true },
      ...wrong.slice(0, 3).map((text) => ({ text, correct: false })),
    ]);
  }

  function categoryCards() {
    return ["전체", ...categories].map((category) => {
      const meta = categoryMeta[category];
      return `
        <button class="category-card ${state.category === category ? "active" : ""} ${category === "전체" ? "all-card" : ""}"
          type="button" data-category="${category}" aria-pressed="${state.category === category}">
          <span class="category-icon">${meta.icon}</span>
          <span class="category-copy"><strong>${category}</strong><small>${meta.description}</small></span>
          <span class="category-count">${pools[category].length}</span>
        </button>`;
    }).join("");
  }

  function renderSetup() {
    state.stage = "setup";
    app.innerHTML = `
      <main class="site-shell">
        <header class="topbar">
          <a class="brand" href="../index.html" aria-label="GLONOMY Games 홈">
            <span class="brand-mark">K</span><span>KBS 표현 퀴즈</span>
          </a>
          <span class="quality-badge">사전 대조·검수</span>
        </header>

        <section class="hero">
          <div class="hero-copy">
            <p class="eyebrow">KBS 한국어능력시험 · 어휘</p>
            <h1>관계를 읽고,<br><em>표현을 꺼내는 힘.</em></h1>
            <p>어휘 관계·속담·한자 성어·관용구를 무작위로 풀고,<br class="desktop-only">답을 고른 즉시 정확한 뜻과 예문까지 확인하세요.</p>
          </div>
          <div class="total-card" aria-label="수록 문제 통계">
            <span>검수 완료 데이터</span><strong>${data.length}</strong><small>개 문제</small>
            <div class="mini-stats">
              ${categories.map((category) => `<div><b>${pools[category].length}</b><span>${category}</span></div>`).join("")}
            </div>
          </div>
        </section>

        <section class="setup-panel">
          <div class="setup-heading"><span>01</span><div><h2>학습 영역</h2><p>한 영역에 집중하거나 전체를 섞어 풀 수 있습니다.</p></div></div>
          <div class="category-grid">${categoryCards()}</div>

          <div class="count-section">
            <div class="setup-heading"><span>02</span><div><h2>문제 수</h2><p>시작할 때마다 문제와 보기가 새로 섞입니다.</p></div></div>
            <div class="count-options" role="group" aria-label="문제 수 선택">
              ${[10, 20, 50, 100, 0].map((count) => `<button type="button" data-count="${count}" class="${state.count === count ? "active" : ""}" aria-pressed="${state.count === count}">${count || "전체"}</button>`).join("")}
            </div>
          </div>

          <button class="primary-button" id="start-button" type="button">
            <span>${state.category} 퀴즈 시작</span><b>→</b>
          </button>
        </section>

        <footer class="site-footer">
          <p>제공된 KBS 학습 PDF의 표제어를 국립국어원 표준국어대사전과 대조해 구성했습니다.</p>
          <a href="https://stdict.korean.go.kr/" target="_blank" rel="noreferrer">표준국어대사전 ↗</a>
        </footer>
      </main>`;

    document.querySelectorAll("[data-category]").forEach((button) => button.addEventListener("click", () => {
      state.category = button.dataset.category;
      renderSetup();
    }));
    document.querySelectorAll("[data-count]").forEach((button) => button.addEventListener("click", () => {
      state.count = Number(button.dataset.count);
      renderSetup();
    }));
    document.getElementById("start-button").addEventListener("click", startQuiz);
  }

  function startQuiz() {
    const pool = pools[state.category];
    state.questions = shuffle(pool).slice(0, state.count || pool.length);
    state.index = 0;
    state.score = 0;
    state.records = [];
    state.selected = null;
    state.stage = "quiz";
    state.options = makeOptions(state.questions[0]);
    renderQuiz();
  }

  function questionContent(item) {
    if (item.category === "어휘 관계") {
      return {
        title: `‘${termLabel(item)}’의 예문 속 뜻으로 가장 알맞은 것은?`,
        contextLabel: "예문",
        context: item.example,
      };
    }
    const labels = {
      속담: "다음 뜻에 해당하는 속담은?",
      "한자 성어": "다음 뜻에 해당하는 한자 성어는?",
      관용구: "다음 뜻에 해당하는 관용구는?",
    };
    return { title: labels[item.category], contextLabel: "뜻풀이", context: item.definition };
  }

  function renderQuiz(scrollToFeedback) {
    const current = state.questions[state.index];
    const content = questionContent(current);
    const answered = state.selected !== null;
    const selectedCorrect = answered && state.options[state.selected].correct;
    const correctOption = state.options.find((option) => option.correct);
    const answers = state.options.map((option, index) => {
      const chosen = state.selected === index;
      const status = answered ? (option.correct ? "correct" : chosen ? "wrong" : "muted") : "";
      const symbol = answered && option.correct ? "✓" : chosen && !option.correct ? "×" : "";
      return `<button class="answer-option ${status}" type="button" data-answer="${index}" ${answered ? "disabled" : ""}>
        <span class="answer-number">${index + 1}</span><span>${escapeHtml(option.text)}</span><b>${symbol}</b>
      </button>`;
    }).join("");

    const otherMeanings = current.otherMeanings && current.otherMeanings.length
      ? `<details class="other-meanings"><summary>연관되거나 구별해야 할 뜻 ${current.otherMeanings.length}개</summary><ol>${current.otherMeanings.map((meaning) => `<li>${escapeHtml(meaning)}</li>`).join("")}</ol></details>`
      : "";
    const pageInfo = current.sourcePages && current.sourcePages.length ? ` · PDF ${current.sourcePages.join(", ")}쪽` : "";
    const explanation = answered ? `
      <section class="feedback ${selectedCorrect ? "success" : "failure"}" id="feedback" aria-live="polite">
        <div class="feedback-title"><span>${selectedCorrect ? "정답" : "오답"}</span><h2>${selectedCorrect ? "정확합니다!" : "다시 확인해 보세요."}</h2></div>
        ${selectedCorrect ? "" : `<p class="correct-answer">정답: <strong>${escapeHtml(correctOption.text)}</strong></p>`}
        <div class="explanation-box">
          <div class="fact"><span>표현</span><p><strong>${escapeHtml(termLabel(current))}</strong></p></div>
          <div class="fact"><span>관계</span><p>${escapeHtml(current.relation)}</p></div>
          <div class="fact full"><span>의미</span><p>${escapeHtml(current.definition)}</p></div>
          <div class="fact full"><span>예문</span><p>${escapeHtml(current.example)}</p><small>${escapeHtml(current.exampleSource)}${escapeHtml(pageInfo)}</small></div>
          ${otherMeanings}
        </div>
      </section>` : "";

    app.innerHTML = `
      <main class="quiz-shell">
        <header class="quiz-topbar">
          <button class="quiet-button" id="exit-button" type="button">← 나가기</button>
          <strong>KBS 표현 퀴즈</strong><span class="category-pill">${current.category}</span>
        </header>
        <div class="progress-meta"><span>${state.index + 1} / ${state.questions.length}</span><span>정답 ${state.score}</span></div>
        <div class="progress-track"><span style="width:${((state.index + 1) / state.questions.length) * 100}%"></span></div>

        <section class="question-card">
          <p class="question-number">QUESTION ${String(state.index + 1).padStart(2, "0")}</p>
          <h1>${escapeHtml(content.title)}</h1>
          <div class="context-box"><span>${content.contextLabel}</span><p>${escapeHtml(content.context)}</p></div>
          <div class="answer-list">${answers}</div>
          ${explanation}
        </section>
        ${answered ? `<div class="next-row"><button class="primary-button next-button" id="next-button" type="button"><span>${state.index + 1 === state.questions.length ? "결과 보기" : "다음 문제"}</span><b>→</b></button></div>` : ""}
      </main>`;

    document.getElementById("exit-button").addEventListener("click", renderSetup);
    document.querySelectorAll("[data-answer]").forEach((button) => button.addEventListener("click", () => chooseAnswer(Number(button.dataset.answer))));
    const nextButton = document.getElementById("next-button");
    if (nextButton) nextButton.addEventListener("click", nextQuestion);
    if (scrollToFeedback) requestAnimationFrame(() => document.getElementById("feedback")?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }

  function chooseAnswer(index) {
    if (state.selected !== null) return;
    state.selected = index;
    const correct = state.options[index].correct;
    if (correct) state.score += 1;
    state.records.push({ category: state.questions[state.index].category, correct });
    renderQuiz(true);
  }

  function nextQuestion() {
    if (state.index + 1 >= state.questions.length) {
      renderResult();
      return;
    }
    state.index += 1;
    state.selected = null;
    state.options = makeOptions(state.questions[state.index]);
    renderQuiz(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderResult() {
    state.stage = "result";
    const percentage = Math.round((state.score / state.questions.length) * 100);
    const breakdown = categories.map((category) => {
      const rows = state.records.filter((record) => record.category === category);
      if (!rows.length) return "";
      const correct = rows.filter((row) => row.correct).length;
      return `<div><span>${category}</span><strong>${correct} / ${rows.length}</strong></div>`;
    }).join("");
    app.innerHTML = `
      <main class="quiz-shell result-shell">
        <header class="quiz-topbar"><button class="quiet-button" id="home-button" type="button">← 처음으로</button><strong>KBS 표현 퀴즈</strong><span class="category-pill">${state.category}</span></header>
        <section class="result-card">
          <p class="eyebrow">학습 결과</p>
          <div class="result-ring" style="--score:${percentage * 3.6}deg"><div><strong>${percentage}</strong><span>점</span></div></div>
          <h1>${state.score}개를 맞혔습니다.</h1>
          <p>총 ${state.questions.length}문제 · 정답률 ${percentage}%</p>
          <div class="breakdown">${breakdown}</div>
          <div class="result-actions"><button class="primary-button" id="retry-button" type="button"><span>같은 조건으로 다시 풀기</span><b>↻</b></button><button class="secondary-button" id="reset-button" type="button">영역 다시 선택</button></div>
        </section>
      </main>`;
    document.getElementById("home-button").addEventListener("click", renderSetup);
    document.getElementById("retry-button").addEventListener("click", startQuiz);
    document.getElementById("reset-button").addEventListener("click", renderSetup);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.addEventListener("keydown", (event) => {
    if (state.stage !== "quiz") return;
    if (state.selected === null && /^[1-4]$/.test(event.key)) chooseAnswer(Number(event.key) - 1);
    else if (state.selected !== null && event.key === "Enter") nextQuestion();
    else if (event.key === "Escape") renderSetup();
  });

  if (!data.length) {
    app.innerHTML = `<main class="load-error"><h1>문제 데이터를 불러오지 못했습니다.</h1><p><code>questions.js</code>가 같은 폴더에 있는지 확인해 주세요.</p></main>`;
  } else {
    renderSetup();
  }
})();
