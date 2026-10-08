(() => {
  "use strict";

  /* ───────────── 데이터 ───────────── */
  const VOCAB = window.VOCAB_QUESTIONS || [];
  const EXAMS = window.EXAM_QUESTIONS || [];

  // 화면에 보이는 출제 범위 묶음
  const GROUPS = [
    { key: "고유어", cats: ["고유어", "단위어"] },
    { key: "한자어", cats: ["한자어"] },
    { key: "혼동·동음이의", cats: ["혼동 어휘", "동음이의어"] },
    { key: "한자 성어", cats: ["한자 성어"] },
    { key: "속담", cats: ["속담"] },
    { key: "관용구", cats: ["관용구"] },
    { key: "다의어", cats: ["다의어"] },
    { key: "어법", cats: ["맞춤법", "띄어쓰기", "표준어", "표준 발음", "외래어 표기", "로마자 표기", "어법", "국어문화"] }
  ];
  const GROUP_OF = {};
  GROUPS.forEach(g => g.cats.forEach(c => { GROUP_OF[c] = g.key; }));
  const groupOf = cat => GROUP_OF[cat] || "고유어";

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  VOCAB.forEach(v => {
    v.kind = "vocab";
    v.group = groupOf(v.category);
    v.id = "v" + hash(v.category + "|" + v.term + "|" + v.definition);
  });
  EXAMS.forEach(q => {
    q.kind = "exam";
    q.group = groupOf(q.category);
    q.id = "q" + hash(q.question + "|" + (q.passage || "") + "|" + q.choices[q.answer]);
  });
  const ALL = [...VOCAB, ...EXAMS];
  const BY_ID = new Map(ALL.map(x => [x.id, x]));

  const byTerm = new Map();
  VOCAB.forEach(v => {
    if (!byTerm.has(v.term)) byTerm.set(v.term, []);
    byTerm.get(v.term).push(v);
  });

  /* ───────────── 저장 (이 기기 브라우저에만) ───────────── */
  const STORE_KEY = "kbs-vocab-v2";
  let store = { wrong: {}, days: {}, settings: {} };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (saved && typeof saved === "object") store = Object.assign(store, saved);
  } catch (e) { /* 저장소를 쓸 수 없으면 이번 접속 동안만 기억 */ }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* 무시 */ }
  }

  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };

  function record(item, ok) {
    const day = (store.days[todayKey()] ||= { solved: 0, correct: 0 });
    day.solved += 1;
    if (ok) day.correct += 1;

    const w = store.wrong[item.id];
    if (ok) {
      if (w) {
        w.streak = (w.streak || 0) + 1;
        if (w.streak >= 2) delete store.wrong[item.id]; // 연속 2번 맞히면 졸업
      }
    } else {
      store.wrong[item.id] = { n: (w ? w.n : 0) + 1, streak: 0, t: Date.now() };
    }
    save();
    updateBadge();
  }

  /* ───────────── 공통 도구 ───────────── */
  const $ = id => document.getElementById(id);

  function shuffle(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  // ‹밑줄› 표기를 <u>로
  const rich = s => esc(s).replace(/‹([^›]*)›/g, "<u>$1</u>");

  /* 예문에서 표제어(활용형 포함) 위치 찾기 */
  function stemsOf(term) {
    const t = term.replace(/\(.*?\)/g, "").replace(/-/g, "").trim();
    const list = [t];
    if (/다$/.test(t) && t.length >= 2) {
      list.push(t.slice(0, -1));
      if (/하다$/.test(t) && t.length >= 4) list.push(t.slice(0, -2));
      if (/스럽다$/.test(t) && t.length >= 5) list.push(t.slice(0, -3));
      if (/[르]다$/.test(t) && t.length >= 3) list.push(t.slice(0, -2));
      if (t.length === 2) list.push(t.slice(0, 1)); // 짧은 용언(달다, 두다)
    }
    return [...new Set(list)].filter(s => s.length >= 1);
  }

  // 예문 속 해당 어절의 [시작, 끝] 반환
  function findWord(sentence, term) {
    for (const stem of stemsOf(term)) {
      if (stem.length < 2 && term.length > 2) continue;
      let from = 0;
      while (true) {
        const i = sentence.indexOf(stem, from);
        if (i < 0) break;
        // 한 글자 어간은 어절 첫머리에서만 인정
        const before = sentence[i - 1];
        if (stem.length === 1 && before && !/[\s"'‘“(]/.test(before)) { from = i + 1; continue; }
        let end = i + stem.length;
        while (end < sentence.length && !/[\s.,!?/"'’”)…·]/.test(sentence[end])) end++;
        let start = i;
        while (start > 0 && !/[\s"'‘“(/]/.test(sentence[start - 1])) start--;
        return [start, end, i, i + stem.length];
      }
    }
    return null;
  }

  function splitExamples(ex) {
    return (ex || "").split(/\s\/\s/).map(s => s.trim()).filter(Boolean);
  }

  function highlight(sentence, term) {
    const hit = findWord(sentence, term);
    if (!hit) return esc(sentence);
    const [s, e] = hit;
    return esc(sentence.slice(0, s)) + "<mark>" + esc(sentence.slice(s, e)) + "</mark>" + esc(sentence.slice(e));
  }

  function blankOut(sentence, term) {
    const hit = findWord(sentence, term);
    if (!hit) return null;
    const isNounLike = !/다$/.test(term);
    // 명사는 표제어 부분만 비우고 조사는 남김
    const [s, e, ms, me] = hit;
    const cutStart = isNounLike ? ms : s;
    const cutEnd = isNounLike ? me : e;
    return esc(sentence.slice(0, cutStart)) + '<span class="blank">(　　　)</span>' + esc(sentence.slice(cutEnd));
  }

  /* ───────────── 문제 만들기 ───────────── */
  const TYPE_LABEL = {
    def: "뜻 고르기",
    term: "알맞은 말 고르기",
    blank: "빈칸 채우기",
    sense: "문맥 속 의미",
    hanja: "한자 고르기",
    exam: "기출·실전형"
  };

  const synonymsOf = v => {
    const set = new Set([v.term]);
    (v.related || []).forEach(r => set.add(r.replace(/^[=≒↔]\s*/, "").replace(/\(.*?\)/g, "").trim()));
    return set;
  };

  function distractors(item, field, n, opts = {}) {
    const exclude = synonymsOf(item);
    const correct = item[field];
    let pool = VOCAB.filter(v =>
      v !== item &&
      v.group === item.group &&
      v.term !== item.term &&
      !exclude.has(v.term) &&
      v.definition !== item.definition &&
      !(v.related || []).some(r => r.includes(item.term))
    );
    if (opts.verbLike !== undefined) {
      const same = pool.filter(v => /다$/.test(v.term) === opts.verbLike);
      if (same.length >= n * 3) pool = same;
    }
    // 비슷한 글자로 시작하는 것을 조금 더 섞어 난도 유지
    const first = item.term[0];
    const near = shuffle(pool.filter(v => v.term[0] === first)).slice(0, 1);
    const rest = shuffle(pool);
    const out = [];
    const seen = new Set([correct]);
    for (const v of [...near, ...rest]) {
      const val = v[field];
      if (!val || seen.has(val)) continue;
      seen.add(val);
      out.push(val);
      if (out.length >= n) break;
    }
    return out;
  }

  function canBlank(v) {
    if (!v.example || v.group === "다의어") return false;
    if (/\(|\s/.test(v.term) && v.group !== "관용구") return false;
    return splitExamples(v.example).some(s => findWord(s, v.term));
  }

  function senseSiblings(v) {
    return (byTerm.get(v.term) || []).filter(o => o !== v && o.definition !== v.definition);
  }

  function hanjaSiblings(v) {
    if (!v.hanja || !/[一-鿿]/.test(v.hanja)) return [];
    const mine = v.hanja.split("/")[0];
    return (byTerm.get(v.term) || []).filter(o => o.hanja && /[一-鿿]/.test(o.hanja) && o.hanja.split("/")[0] !== mine);
  }

  function possibleTypes(v, wanted) {
    const types = [];
    const senseOk = v.example && senseSiblings(v).length >= 1 && splitExamples(v.example).some(s => findWord(s, v.term));
    if (v.group === "다의어") {
      if (senseOk) types.push("sense");
      if (!types.length) types.push("def");
      return types;
    }
    if (wanted === "def" || wanted === "mix") types.push("def");
    if (wanted === "term" || wanted === "mix") types.push("term");
    if ((wanted === "blank" || wanted === "mix") && canBlank(v)) types.push("blank", "blank");
    if (wanted === "mix" && hanjaSiblings(v).length >= 1 && v.example) types.push("hanja", "hanja");
    if (wanted === "mix" && senseOk && v.sense) types.push("sense");
    if (!types.length) types.push(wanted === "blank" ? "def" : "def");
    return types;
  }

  function buildVocabQuestion(v, wanted) {
    const type = pick(possibleTypes(v, wanted));
    const hanja = v.hanja && /[一-鿿]/.test(v.hanja) ? v.hanja : "";
    const q = { item: v, type, category: v.category, choiceIsTerm: false };

    if (type === "def") {
      q.prompt = `<span class="word">${esc(v.term)}</span>${hanja ? ` <span class="hanja">${esc(hanja)}</span>` : ""}<br>의 뜻으로 가장 알맞은 것은?`;
      q.answer = v.definition;
      q.choices = shuffle([v.definition, ...distractors(v, "definition", 3)]);
    } else if (type === "term") {
      q.prompt = `다음 뜻을 가진 말은?`;
      q.passage = esc(v.definition);
      q.answer = v.term;
      q.choices = shuffle([v.term, ...distractors(v, "term", 3, { verbLike: /다$/.test(v.term) })]);
      q.choiceIsTerm = true;
    } else if (type === "blank") {
      const sentence = pick(splitExamples(v.example).filter(s => findWord(s, v.term)));
      q.prompt = `빈칸에 들어갈 말로 가장 알맞은 것은?`;
      q.passage = blankOut(sentence, v.term);
      q.answer = v.term;
      q.choices = shuffle([v.term, ...distractors(v, "term", 3, { verbLike: /다$/.test(v.term) })]);
      q.choiceIsTerm = true;
    } else if (type === "sense") {
      const sentence = pick(splitExamples(v.example).filter(s => findWord(s, v.term)));
      q.prompt = `밑줄 친 ‘${esc(v.term)}’의 의미로 가장 알맞은 것은?`;
      q.passage = highlight(sentence, v.term);
      q.answer = v.definition;
      const sib = shuffle(senseSiblings(v)).map(o => o.definition);
      const uniq = [...new Set(sib)].slice(0, 3);
      const extra = uniq.length < 3 ? distractors(v, "definition", 3 - uniq.length) : [];
      q.choices = shuffle([v.definition, ...uniq, ...extra]);
    } else if (type === "hanja") {
      const sentence = pick(splitExamples(v.example));
      q.prompt = `밑줄 친 ‘${esc(v.term)}’에 맞는 한자는?`;
      q.passage = highlight(sentence, v.term);
      q.answer = hanja;
      const sib = [...new Set(hanjaSiblings(v).map(o => o.hanja))].slice(0, 3);
      q.choices = shuffle([hanja, ...sib]);
      q.choiceIsTerm = true;
    }
    q.typeLabel = TYPE_LABEL[type];
    return q;
  }

  function buildExamQuestion(x) {
    return {
      item: x,
      type: "exam",
      category: x.category,
      typeLabel: TYPE_LABEL.exam,
      prompt: rich(x.question),
      passage: x.passage ? rich(x.passage) : "",
      choices: x.choices.slice(),
      answer: x.choices[x.answer],
      richChoices: true
    };
  }

  function buildQuestion(item, wanted) {
    return item.kind === "exam" ? buildExamQuestion(item) : buildVocabQuestion(item, wanted);
  }

  /* ───────────── 문제 풀기 화면 ───────────── */
  const settings = Object.assign(
    { groups: GROUPS.map(g => g.key), count: 20, mode: "mix", weak: false },
    store.settings || {}
  );

  let questions = [];
  let currentIndex = 0;
  let answers = [];
  let answerChecked = false;

  function changeScreen(name) {
    ["startScreen", "quizScreen", "resultScreen", "cardScreen", "wrongScreen", "dictScreen"].forEach(id => {
      $(id).classList.toggle("hidden", id !== name);
    });
    window.scrollTo(0, 0);
  }

  function countIn(groupKey) {
    return ALL.filter(x => x.group === groupKey).length;
  }

  function renderChips(containerId, selected, onChange, multi = true) {
    const box = $(containerId);
    box.innerHTML = "";
    GROUPS.forEach(g => {
      const n = containerId === "categoryButtons" ? countIn(g.key) : VOCAB.filter(v => v.group === g.key).length;
      if (!n) return;
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML = `${esc(g.key)} <small>${n}</small>`;
      b.classList.toggle("selected", selected.includes(g.key));
      b.addEventListener("click", () => {
        let next;
        if (multi) {
          next = selected.includes(g.key) ? selected.filter(k => k !== g.key) : [...selected, g.key];
          if (!next.length) next = [g.key];
        } else {
          next = selected.length === 1 && selected[0] === g.key ? [] : [g.key];
        }
        onChange(next);
      });
      box.appendChild(b);
    });
  }

  function drawStartChips() {
    renderChips("categoryButtons", settings.groups, next => {
      settings.groups = next;
      persistSettings();
      drawStartChips();
    });
  }

  function persistSettings() {
    store.settings = settings;
    save();
  }

  function setSeg(id, value) {
    document.querySelectorAll(`#${id} button`).forEach(b => b.classList.toggle("selected", b.dataset.value === String(value)));
  }

  function drawToday() {
    const d = store.days[todayKey()] || { solved: 0, correct: 0 };
    const rate = d.solved ? Math.round((d.correct / d.solved) * 100) + "%" : "–";
    $("todayStats").innerHTML = `
      <div><b>${d.solved}</b><span>오늘 푼 문제</span></div>
      <div><b>${rate}</b><span>오늘 정답률</span></div>
      <div><b>${Object.keys(store.wrong).length}</b><span>오답노트</span></div>`;
  }

  function weightedSample(source, n) {
    if (!settings.weak) return shuffle(source).slice(0, n);
    const wrong = shuffle(source.filter(x => store.wrong[x.id])).sort((a, b) => store.wrong[b.id].n - store.wrong[a.id].n);
    const rest = shuffle(source.filter(x => !store.wrong[x.id]));
    return [...wrong, ...rest].slice(0, n);
  }

  function startQuiz(customItems) {
    let items;
    if (customItems) {
      items = shuffle(customItems);
    } else {
      let source = ALL.filter(x => settings.groups.includes(x.group));
      if (settings.mode !== "mix") {
        // 유형을 지정하면 어법 실전 문항은 빼고, 빈칸은 예문 있는 단어만
        source = source.filter(x => x.kind === "vocab");
        if (settings.mode === "blank") source = source.filter(canBlank);
        if (!source.length) source = ALL.filter(x => settings.groups.includes(x.group));
      }
      items = weightedSample(source, Math.min(settings.count, source.length));
    }
    questions = items.map(x => buildQuestion(x, customItems ? "mix" : settings.mode)).filter(q => q.choices && q.choices.length >= 2);
    if (!questions.length) return;
    currentIndex = 0;
    answers = [];
    changeScreen("quizScreen");
    renderQuestion();
  }

  function renderQuestion() {
    const q = questions[currentIndex];
    answerChecked = false;

    $("progressBar").style.width = `${(currentIndex / questions.length) * 100}%`;
    $("currentNumber").textContent = currentIndex + 1;
    $("questionCount").textContent = questions.length;
    $("questionCategory").textContent = q.category;
    $("questionType").textContent = q.typeLabel;
    $("questionText").innerHTML = q.prompt;

    const passage = $("questionPassage");
    passage.innerHTML = q.passage || "";
    passage.classList.toggle("hidden", !q.passage);

    const list = $("choiceList");
    list.innerHTML = "";
    q.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-button" + (q.choiceIsTerm ? " term-choice" : "");
      button.dataset.index = index;
      button.innerHTML = `<span class="choice-number">${index + 1}</span><span>${q.richChoices ? rich(choice) : esc(choice)}</span>`;
      button.addEventListener("click", () => checkAnswer(index));
      list.appendChild(button);
    });

    $("explanation").className = "explanation hidden";
    $("nextButton").classList.add("hidden");
  }

  function entryDetail(v) {
    const hanja = v.hanja && /[一-鿿]/.test(v.hanja) ? ` (${esc(v.hanja)})` : "";
    let html = `<p><b>${esc(v.term)}</b>${hanja}${v.sense ? ` ${v.sense}` : ""} — ${esc(v.definition)}</p>`;
    if (v.example) html += `<p>예) ${splitExamples(v.example).map(s => highlight(s, v.term)).join(" / ")}</p>`;
    if (v.related && v.related.length) html += `<p>비슷한 표현: ${esc(v.related.join(", "))}</p>`;
    if (v.note) html += `<p>참고: ${esc(v.note)}</p>`;
    return html;
  }

  function checkAnswer(selectedIndex) {
    if (answerChecked) return;
    answerChecked = true;

    const q = questions[currentIndex];
    const selected = q.choices[selectedIndex];
    const ok = selected === q.answer;
    answers[currentIndex] = selected;
    record(q.item, ok);

    $("choiceList").querySelectorAll("button").forEach(btn => {
      const c = q.choices[Number(btn.dataset.index)];
      btn.disabled = true;
      if (c === q.answer) btn.classList.add("correct");
      else if (Number(btn.dataset.index) === selectedIndex) btn.classList.add("wrong");
    });

    let body;
    if (q.item.kind === "exam") {
      const n = q.choices.indexOf(q.answer) + 1;
      body = `<p>정답 ${n}번 — ${rich(q.answer)}</p>${q.item.explanation ? `<p>${rich(q.item.explanation)}</p>` : ""}`;
    } else {
      body = entryDetail(q.item);
      if (q.type === "hanja") {
        const others = hanjaSiblings(q.item).map(o => `${esc(o.hanja)}: ${esc(o.definition)}`);
        if (others.length) body += `<p>${others.join("<br>")}</p>`;
      }
    }
    const ex = $("explanation");
    ex.className = `explanation ${ok ? "correct" : "wrong"}`;
    ex.innerHTML = `<strong>${ok ? "정답입니다." : "아쉬워요. 오답노트에 담았어요."}</strong>${body}`;

    $("nextButton").textContent = currentIndex === questions.length - 1 ? "결과 보기" : "다음 문제";
    $("nextButton").classList.remove("hidden");
    $("progressBar").style.width = `${((currentIndex + 1) / questions.length) * 100}%`;
    setTimeout(() => $("nextButton").scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
  }

  function showResult() {
    const correct = questions.filter((q, i) => answers[i] === q.answer).length;
    const answered = answers.filter(a => a !== undefined).length || questions.length;
    const score = Math.round((correct / answered) * 100);

    $("scoreNumber").textContent = score;
    $("resultTitle").textContent = score >= 80 ? "어휘력이 탄탄합니다." : score >= 60 ? "조금만 더 복습하면 됩니다." : "오답부터 다시 풀어 봅시다.";
    $("resultDescription").innerHTML = `${answered}문제 중 <b>${correct}문제</b>를 맞혔습니다.`;
    $("wrongRetryButton").classList.toggle("hidden", correct === answered);

    const wrongOnes = questions.filter((q, i) => answers[i] !== undefined && answers[i] !== q.answer);
    $("resultList").innerHTML = wrongOnes.length
      ? `<p class="eyebrow">틀린 문제 복습</p>` + wrongOnes.map(q => entryCard(q.item, false)).join("")
      : "";
    changeScreen("resultScreen");
  }

  /* ───────────── 목록 카드 (오답노트·사전·결과) ───────────── */
  function entryCard(x, withRemove) {
    const w = store.wrong[x.id];
    const foot = withRemove
      ? `<div class="entry-foot"><span>틀린 횟수 ${w ? w.n : 0}회 · 연속 2번 맞히면 자동으로 빠져요</span><button type="button" class="link-button" data-remove="${x.id}">빼기</button></div>`
      : "";
    if (x.kind === "exam") {
      return `<article class="entry ${withRemove ? "is-wrong" : ""}">
        <div class="entry-head"><span class="entry-cat">${esc(x.category)}</span></div>
        <p class="entry-def">${rich(x.question)}</p>
        ${x.passage ? `<p class="entry-ex">${rich(x.passage)}</p>` : ""}
        <p class="entry-def"><b>정답</b> ${rich(x.choices[x.answer])}</p>
        ${x.explanation ? `<p class="entry-rel">${rich(x.explanation)}</p>` : ""}
        ${foot}</article>`;
    }
    const hanja = x.hanja && /[一-鿿]/.test(x.hanja) ? `<span class="entry-hanja">${esc(x.hanja)}</span>` : "";
    return `<article class="entry ${withRemove ? "is-wrong" : ""}">
      <div class="entry-head">
        <span class="entry-term">${esc(x.term)}</span>${hanja}${x.sense ? `<span class="entry-hanja">뜻 ${x.sense}</span>` : ""}
        <span class="entry-cat">${esc(x.category)}</span>
      </div>
      <p class="entry-def">${esc(x.definition)}</p>
      ${x.example ? `<p class="entry-ex">${splitExamples(x.example).map(s => highlight(s, x.term)).join(" / ")}</p>` : ""}
      ${x.related && x.related.length ? `<p class="entry-rel">${esc(x.related.join("  "))}</p>` : ""}
      ${x.note ? `<p class="entry-note">${esc(x.note)}</p>` : ""}
      ${foot}</article>`;
  }

  /* ───────────── 오답노트 ───────────── */
  let wrongConfirm = false;

  function wrongItems() {
    return Object.entries(store.wrong)
      .filter(([id]) => BY_ID.has(id))
      .sort((a, b) => b[1].n - a[1].n || b[1].t - a[1].t)
      .map(([id]) => BY_ID.get(id));
  }

  function drawWrong() {
    const items = wrongItems();
    $("wrongSummary").textContent = items.length
      ? `${items.length}개가 있어요. 많이 틀린 순서로 보여 줍니다.`
      : "아직 틀린 문제가 없어요. 문제를 풀면 틀린 것이 여기에 모입니다.";
    $("wrongQuizButton").disabled = !items.length;
    $("wrongClearButton").textContent = "비우기";
    wrongConfirm = false;
    $("wrongList").innerHTML = items.slice(0, 300).map(x => entryCard(x, true)).join("");
  }

  function updateBadge() {
    const n = Object.keys(store.wrong).filter(id => BY_ID.has(id)).length;
    const b = $("wrongBadge");
    b.textContent = n > 99 ? "99+" : n;
    b.classList.toggle("hidden", !n);
  }

  /* ───────────── 암기 카드 ───────────── */
  let cardGroups = [];
  let cardDeck = [];
  let cardIndex = 0;
  let cardFlipped = false;

  function newDeck() {
    const pool = VOCAB.filter(v => !cardGroups.length || cardGroups.includes(v.group));
    cardDeck = shuffle(pool);
    cardIndex = 0;
  }

  function drawCard() {
    if (!cardDeck.length) newDeck();
    const v = cardDeck[cardIndex % cardDeck.length];
    const reverse = $("cardReverse").checked;
    const hanja = v.hanja && /[一-鿿]/.test(v.hanja) ? `<span class="hanja">${esc(v.hanja)}</span>` : "";
    cardFlipped = false;
    $("cardCat").textContent = `${v.category} · ${cardIndex + 1}/${cardDeck.length}`;
    const front = $("cardFront");
    front.classList.toggle("as-def", reverse);
    front.innerHTML = reverse ? esc(v.definition) : `${esc(v.term)}${hanja}`;
    front.classList.remove("hidden");
    const back = $("cardBack");
    back.innerHTML = reverse
      ? `<span class="big">${esc(v.term)}</span>${hanja ? `<span class="muted">${esc(v.hanja)}</span>` : ""}${v.example ? `<span class="ex">${splitExamples(v.example).map(s => highlight(s, v.term)).join("<br>")}</span>` : ""}`
      : `<span>${esc(v.definition)}</span>${v.example ? `<span class="ex">${splitExamples(v.example).map(s => highlight(s, v.term)).join("<br>")}</span>` : ""}${v.related && v.related.length ? `<span class="ex">${esc(v.related.join("  "))}</span>` : ""}`;
    back.classList.add("hidden");
    $("cardHint").textContent = reverse ? "눌러서 단어 보기" : "눌러서 뜻 보기";
  }

  function flipCard() {
    cardFlipped = !cardFlipped;
    $("cardBack").classList.toggle("hidden", !cardFlipped);
    $("cardHint").textContent = cardFlipped ? "다시 누르면 앞면" : ($("cardReverse").checked ? "눌러서 단어 보기" : "눌러서 뜻 보기");
  }

  function nextCard(known) {
    const v = cardDeck[cardIndex % cardDeck.length];
    if (known === false) {
      const w = store.wrong[v.id];
      store.wrong[v.id] = { n: (w ? w.n : 0) + 1, streak: 0, t: Date.now() };
      save();
      updateBadge();
    }
    cardIndex += 1;
    if (cardIndex >= cardDeck.length) newDeck();
    drawCard();
  }

  function drawCardChips() {
    renderChips("cardCategoryButtons", cardGroups, next => {
      cardGroups = next;
      newDeck();
      drawCardChips();
      drawCard();
    }, false);
  }

  /* ───────────── 사전 ───────────── */
  let dictGroups = [];
  let searchTimer = 0;

  function drawDict() {
    const raw = $("searchInput").value.trim();
    const qn = raw.replace(/\s+/g, "");
    let pool = VOCAB.filter(v => !dictGroups.length || dictGroups.includes(v.group));
    if (qn) {
      const head = [], body = [];
      pool.forEach(v => {
        const t = v.term.replace(/\s+/g, "");
        if (t.includes(qn) || (v.hanja || "").includes(raw)) head.push(v);
        else if ((v.definition + (v.example || "") + (v.related || []).join("")).replace(/\s+/g, "").includes(qn)) body.push(v);
      });
      head.sort((a, b) => (a.term.startsWith(raw) ? 0 : 1) - (b.term.startsWith(raw) ? 0 : 1));
      pool = [...head, ...body];
    } else {
      pool = shuffle(pool);
    }
    $("searchSummary").textContent = qn ? `${pool.length}개 찾음` : `무작위 30개 · 전체 ${VOCAB.filter(v => !dictGroups.length || dictGroups.includes(v.group)).length}개`;
    $("searchList").innerHTML = pool.slice(0, qn ? 80 : 30).map(x => entryCard(x, false)).join("");
  }

  function drawDictChips() {
    renderChips("dictCategoryButtons", dictGroups, next => {
      dictGroups = next;
      drawDictChips();
      drawDict();
    }, false);
  }

  /* ───────────── 탭 ───────────── */
  let currentTab = "quiz";
  function openTab(tab) {
    currentTab = tab;
    document.querySelectorAll("#tabbar button").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    if (tab === "quiz") { drawToday(); changeScreen("startScreen"); }
    if (tab === "card") { changeScreen("cardScreen"); drawCard(); }
    if (tab === "wrong") { drawWrong(); changeScreen("wrongScreen"); }
    if (tab === "dict") { changeScreen("dictScreen"); drawDict(); }
  }

  /* ───────────── 이벤트 연결 ───────────── */
  document.querySelectorAll("#tabbar button").forEach(b => b.addEventListener("click", () => openTab(b.dataset.tab)));

  $("allCategories").addEventListener("click", () => {
    settings.groups = GROUPS.map(g => g.key);
    persistSettings();
    drawStartChips();
  });

  document.querySelectorAll("#countButtons button").forEach(b => b.addEventListener("click", () => {
    settings.count = Number(b.dataset.value);
    setSeg("countButtons", settings.count);
    persistSettings();
  }));

  document.querySelectorAll("#modeButtons button").forEach(b => b.addEventListener("click", () => {
    settings.mode = b.dataset.value;
    setSeg("modeButtons", settings.mode);
    persistSettings();
  }));

  $("weakFirst").addEventListener("change", e => {
    settings.weak = e.target.checked;
    persistSettings();
  });

  $("startButton").addEventListener("click", () => startQuiz());
  $("nextButton").addEventListener("click", () => {
    if (currentIndex === questions.length - 1) { showResult(); return; }
    currentIndex += 1;
    renderQuestion();
  });
  $("quitButton").addEventListener("click", () => {
    if (answers.some(a => a !== undefined)) showResult();
    else openTab("quiz");
  });
  $("wrongRetryButton").addEventListener("click", () => {
    startQuiz(questions.filter((q, i) => answers[i] !== q.answer).map(q => q.item));
  });
  $("restartButton").addEventListener("click", () => startQuiz());
  $("homeButton").addEventListener("click", () => openTab("quiz"));

  $("flashcard").addEventListener("click", flipCard);
  $("cardKnown").addEventListener("click", () => nextCard(true));
  $("cardUnknown").addEventListener("click", () => nextCard(false));
  $("cardReverse").addEventListener("change", drawCard);

  $("wrongQuizButton").addEventListener("click", () => {
    const items = wrongItems();
    if (items.length) startQuiz(items.slice(0, 50));
  });
  $("wrongClearButton").addEventListener("click", () => {
    if (!wrongConfirm) {
      wrongConfirm = true;
      $("wrongClearButton").textContent = "정말 비울까요?";
      return;
    }
    store.wrong = {};
    save();
    updateBadge();
    drawWrong();
  });
  $("wrongList").addEventListener("click", e => {
    const id = e.target.dataset && e.target.dataset.remove;
    if (!id) return;
    delete store.wrong[id];
    save();
    updateBadge();
    drawWrong();
  });

  $("searchInput").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(drawDict, 150);
  });

  // 키보드: 1~5로 선택, Enter로 다음
  document.addEventListener("keydown", e => {
    if ($("quizScreen").classList.contains("hidden")) return;
    if (/^[1-5]$/.test(e.key)) {
      const btn = $("choiceList").querySelectorAll("button")[Number(e.key) - 1];
      if (btn) btn.click();
    } else if (e.key === "Enter" && answerChecked) {
      $("nextButton").click();
    }
  });

  /* ───────────── 시작 ───────────── */
  // 사이트 밖(예: 공유 링크)에서 열면 상위 메뉴 링크 숨김
  const homeLink = $("homeLink");
  if (homeLink && (location.protocol === "file:" || /claude|artifact/i.test(location.hostname) || !/\/[^/]+\/(index\.html)?$/.test(location.pathname))) {
    homeLink.classList.add("hidden");
  }

  $("totalCount").textContent = `${VOCAB.length.toLocaleString()}어휘 · ${EXAMS.length}문항`;
  setSeg("countButtons", settings.count);
  setSeg("modeButtons", settings.mode);
  $("weakFirst").checked = !!settings.weak;
  drawStartChips();
  drawCardChips();
  drawDictChips();
  drawToday();
  updateBadge();
  newDeck();
})();
