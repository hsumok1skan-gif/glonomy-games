(function () {
  "use strict";

  const data = Array.isArray(window.VOCAB_DATA) ? window.VOCAB_DATA : [];
  const app = document.getElementById("app");
  const pools = {
    고유어: data.filter((item) => item.category === "고유어"),
    한자어: data.filter((item) => item.category === "한자어"),
  };
  const state = { stage: "setup", category: "고유어", count: 20, questions: [], index: 0, options: [], selected: null, score: 0 };

  function shuffle(items) {
    const next = [...items];
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  }

  function makeOptions(answer) {
    const used = new Set([answer.definition]);
    const wrong = [];
    for (const item of shuffle(pools[state.category])) {
      if (item.id === answer.id || used.has(item.definition)) continue;
      used.add(item.definition);
      wrong.push({ text: item.definition, correct: false });
      if (wrong.length === 3) break;
    }
    return shuffle([{ text: answer.definition, correct: true }, ...wrong]);
  }

  function termLabel(item) {
    return item.origin ? `${item.term}(${item.origin})` : item.term;
  }

  function renderSetup() {
    app.innerHTML = `
      <main class="app-shell">
        <header class="brand-bar"><a class="brand" href="../index.html"><span class="brand-mark">한</span><span>KBS 어휘 퀴즈</span></a><span class="verified-badge">사전 검수본</span></header>
        <section class="hero"><p class="eyebrow">KBS 한국어능력시험 · 어휘</p><h1>외우는 대신,<br>문제로 익히세요.</h1><p class="hero-copy">고유어와 한자어 764개를 무작위 객관식으로 풀고,<br class="desktop-only">정답과 함께 정확한 의미·예문·다른 뜻까지 확인합니다.</p><div class="stat-row"><div><strong>${pools.고유어.length}</strong><span>고유어</span></div><div><strong>${pools.한자어.length}</strong><span>한자어</span></div><div><strong>${data.length}</strong><span>전체 문제</span></div></div></section>
        <section class="setup-card"><div class="section-heading"><span class="step-number">01</span><div><h2>문제 영역 선택</h2><p>한 영역씩 집중해서 학습합니다.</p></div></div>
          <div class="category-grid">${["고유어", "한자어"].map((category) => `<button class="category-card ${state.category === category ? "active" : ""}" data-category="${category}"><span class="category-icon">${category === "고유어" ? "가" : "漢"}</span><span class="category-content"><strong>${category}</strong><small>${pools[category].length}개 수록</small></span><span class="radio-dot"></span></button>`).join("")}</div>
          <div class="count-block"><div class="section-heading compact"><span class="step-number">02</span><div><h2>문제 수 선택</h2><p>문제는 시작할 때마다 새롭게 섞입니다.</p></div></div><div class="count-options">${[10,20,50,0].map((count) => `<button class="${state.count === count ? "active" : ""}" data-count="${count}">${count || "전체"}</button>`).join("")}</div></div>
          <button class="primary-button" id="start-button">${state.category} 퀴즈 시작 <span>→</span></button>
        </section>
        <footer class="site-footer"><p>국립국어원 표준국어대사전 자료를 기준으로 검수했습니다.</p><a href="https://stdict.korean.go.kr/" target="_blank" rel="noreferrer">사전 출처 보기 ↗</a></footer>
      </main>`;
    document.querySelectorAll("[data-category]").forEach((button) => button.addEventListener("click", () => { state.category = button.dataset.category; renderSetup(); }));
    document.querySelectorAll("[data-count]").forEach((button) => button.addEventListener("click", () => { state.count = Number(button.dataset.count); renderSetup(); }));
    document.getElementById("start-button").addEventListener("click", startQuiz);
  }

  function startQuiz() {
    const pool = pools[state.category];
    state.questions = shuffle(pool).slice(0, state.count || pool.length);
    state.index = 0; state.score = 0; state.selected = null; state.stage = "quiz";
    state.options = makeOptions(state.questions[0]);
    renderQuiz();
  }

  function renderQuiz() {
    const current = state.questions[state.index];
    const answered = state.selected !== null;
    const selectedCorrect = answered && state.options[state.selected].correct;
    const answers = state.options.map((option, index) => {
      const chosen = state.selected === index;
      const status = answered ? (option.correct ? "correct" : chosen ? "wrong" : "muted") : "";
      return `<button class="answer-option ${status}" data-answer="${index}" ${answered ? "disabled" : ""}><span class="answer-number">${index + 1}</span><span>${escapeHtml(option.text)}</span>${answered && option.correct ? '<span class="answer-symbol">✓</span>' : chosen && !option.correct ? '<span class="answer-symbol">×</span>' : ""}</button>`;
    }).join("");
    const other = current.otherMeanings.length ? `<details class="other-meanings"><summary>사전에 실린 다른 뜻 ${current.otherMeanings.length}개 보기</summary><ol>${current.otherMeanings.map((meaning) => `<li>${escapeHtml(meaning)}</li>`).join("")}</ol></details>` : "";
    const label = termLabel(current);
    const explanation = answered ? `<div class="explanation-card ${selectedCorrect ? "success" : "failure"}"><h2>${selectedCorrect ? "정답입니다!" : "오답입니다."}</h2>${selectedCorrect ? "" : `<p class="correct-answer">정답: ${escapeHtml(current.definition)}</p>`}<div class="meaning-box"><div class="explanation-section"><span>의미</span><p><strong>${escapeHtml(label)}</strong> — ${escapeHtml(current.definition)}</p></div><div class="explanation-section"><span>예문</span><p>${escapeHtml(current.example)}</p><small>${escapeHtml(current.exampleSource)}</small></div>${other}</div></div>` : "";
    app.innerHTML = `<main class="app-shell quiz-background"><header class="quiz-header"><button class="text-button" id="exit-button">← 나가기</button><span class="header-title">KBS 어휘 퀴즈</span><span class="category-pill">${state.category}</span></header><div class="progress-meta"><span>${state.index + 1} / ${state.questions.length}</span><span>정답 ${state.score}</span></div><div class="progress-track"><span style="width:${((state.index + 1) / state.questions.length) * 100}%"></span></div><section class="question-card"><p class="question-label">QUESTION ${String(state.index + 1).padStart(2,"0")}</p><h1>‘${escapeHtml(label)}’의 뜻으로<br class="desktop-only"> 가장 알맞은 것은?</h1><div class="answer-list">${answers}</div>${explanation}</section>${answered ? `<div class="next-row"><button class="primary-button next-button" id="next-button">${state.index + 1 === state.questions.length ? "결과 보기" : "다음 문제"} <span>→</span></button></div>` : ""}</main>`;
    document.getElementById("exit-button").addEventListener("click", () => { state.stage = "setup"; renderSetup(); });
    document.querySelectorAll("[data-answer]").forEach((button) => button.addEventListener("click", () => chooseAnswer(Number(button.dataset.answer))));
    const next = document.getElementById("next-button"); if (next) next.addEventListener("click", nextQuestion);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function chooseAnswer(index) {
    if (state.selected !== null) return;
    state.selected = index;
    if (state.options[index].correct) state.score += 1;
    renderQuiz();
  }

  function nextQuestion() {
    if (state.index + 1 >= state.questions.length) { state.stage = "result"; renderResult(); return; }
    state.index += 1; state.selected = null; state.options = makeOptions(state.questions[state.index]); renderQuiz();
  }

  function renderResult() {
    const percentage = Math.round((state.score / state.questions.length) * 100);
    app.innerHTML = `<main class="app-shell quiz-background"><header class="quiz-header"><button class="text-button" id="home-button">← 처음으로</button><span class="header-title">KBS 어휘 퀴즈</span><span class="category-pill">${state.category}</span></header><section class="result-card"><p class="eyebrow">학습 결과</p><div class="result-ring" style="--score:${percentage * 3.6}deg"><div><strong>${percentage}</strong><span>점</span></div></div><h1>${state.score}개를 맞혔습니다.</h1><p>총 ${state.questions.length}문제 · 정답률 ${percentage}%</p><div class="result-actions"><button class="primary-button" id="retry-button">같은 조건으로 다시 풀기</button><button class="secondary-button" id="reset-button">영역 다시 선택</button></div></section></main>`;
    document.getElementById("home-button").addEventListener("click", renderSetup);
    document.getElementById("retry-button").addEventListener("click", startQuiz);
    document.getElementById("reset-button").addEventListener("click", renderSetup);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!data.length) app.innerHTML = "<p>문제 데이터를 불러오지 못했습니다.</p>";
  else renderSetup();
})();
