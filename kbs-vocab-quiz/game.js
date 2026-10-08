(() => {
  "use strict";

  /* ───────────── 데이터 ───────────── */
  const VOCAB = window.VOCAB_QUESTIONS || [];
  const EXAMS = window.EXAM_QUESTIONS || [];
  const CHOICE_COUNT = 5; // KBS 한국어능력시험과 같은 오지선다

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
  // 보기 후보가 모자랄 때 함께 쓰는 이웃 범위
  const NEIGHBOR = {
    "한자 성어": ["속담", "관용구"], "속담": ["한자 성어", "관용구"], "관용구": ["속담", "한자 성어"],
    "혼동·동음이의": ["한자어"], "한자어": ["혼동·동음이의"], "고유어": [], "다의어": ["고유어"]
  };

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  /* ───────────── 유사도 준비 ───────────── */
  const cleanTerm = t => t.replace(/\[[^\]]*\]/g, "").replace(/\([^)]*\)/g, "").replace(/[-\s]/g, "");
  const HANGUL = /[가-힣]/;

  function endingOf(t) {
    const c = cleanTerm(t);
    for (const e of ["스럽다", "거리다", "대다", "롭다", "답다", "하다", "되다", "없다", "이다", "다"]) {
      if (c.endsWith(e) && c.length > e.length) return e;
    }
    if (/(.{1,2})\1$/.test(c)) return "반복";
    if (c.endsWith("이") || c.endsWith("히")) return "부사";
    return "명";
  }

  function bigramsOf(s) {
    const t = s.replace(/[^가-힣a-z0-9]/gi, "");
    const out = [];
    for (let i = 0; i < t.length - 1; i++) out.push(t.slice(i, i + 2));
    return out;
  }

  // 뜻풀이에 흔한 말(…을 이르는 말, 비유적으로 등)은 유사도 계산에서 뺌
  const bigramFreq = new Map();
  VOCAB.forEach(v => new Set(bigramsOf(v.definition)).forEach(b => bigramFreq.set(b, (bigramFreq.get(b) || 0) + 1)));
  const STOP = new Set([...bigramFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 70).map(e => e[0]));

  const wordsOf = t => t.replace(/\[[^\]]*\]|\([^)]*\)/g, "").split(/\s+/).filter(w => w.length >= 1);

  VOCAB.forEach(v => {
    v.kind = "vocab";
    v.group = groupOf(v.category);
    v.id = "v" + hash(v.category + "|" + v.term + "|" + v.definition);
    const c = cleanTerm(v.term);
    v._clean = c;
    v._syl = new Set([...c].filter(ch => HANGUL.test(ch)));
    v._end = endingOf(v.term);
    v._big = new Set(bigramsOf(v.definition).filter(b => !STOP.has(b)));
    v._words = new Set(wordsOf(v.term));
    v._rel = new Set([c, ...(v.related || []).map(r => cleanTerm(r.replace(/^[=≒↔]\s*/, "")))]);
    v._anti = (v.related || []).some(r => /^↔/.test(r));
  });
  EXAMS.forEach(q => {
    q.kind = "exam";
    q.group = groupOf(q.category);
    q.id = "q" + hash(q.question + "|" + (q.passage || "") + "|" + q.choices[q.answer]);
  });
  const ALL = [...VOCAB, ...EXAMS];
  const BY_ID = new Map(ALL.map(x => [x.id, x]));

  const byTerm = new Map();
  const byGroup = new Map();
  VOCAB.forEach(v => {
    if (!byTerm.has(v.term)) byTerm.set(v.term, []);
    byTerm.get(v.term).push(v);
    if (!byGroup.has(v.group)) byGroup.set(v.group, []);
    byGroup.get(v.group).push(v);
  });

  function jaccard(a, b) {
    if (!a.size || !b.size) return 0;
    let n = 0;
    const [s, l] = a.size < b.size ? [a, b] : [b, a];
    s.forEach(x => { if (l.has(x)) n++; });
    return n / (a.size + b.size - n);
  }

  // 같은 뜻(동의 표현·같은 뜻풀이)이라 오답 보기로 쓰면 안 되는 경우
  function sameMeaning(a, b) {
    if (a.definition === b.definition) return true;
    if (a._rel.has(b._clean) || b._rel.has(a._clean)) return true;
    if (a._clean === b._clean) return true;
    if (a.syn && b.syn && a.syn.some(n => b.syn.includes(n))) return true; // 검수한 동의 묶음
    // 같은 표현을 '='로 함께 가리키면 같은 뜻 묶음
    for (const r of a._rel) if (r !== a._clean && b._rel.has(r)) return true;
    if (jaccard(a._big, b._big) >= 0.42) return true;
    // 짧은 뜻풀이가 긴 뜻풀이에 거의 다 들어 있으면 같은 뜻
    let n = 0;
    a._big.forEach(x => { if (b._big.has(x)) n++; });
    const small = Math.min(a._big.size, b._big.size);
    return small >= 4 && n / small >= 0.55;
  }

  // 헷갈리는 정도 점수: 모양이 닮았거나 뜻이 가까운(그러나 같지 않은) 말일수록 높음
  function confusability(a, b) {
    let s = 0;
    const sylShare = jaccard(a._syl, b._syl);
    s += sylShare * 4;
    if (a._clean[0] && a._clean[0] === b._clean[0]) s += 1.6;
    if (a._end === b._end) s += a._end === "명" ? 0.6 : 1.4;
    if (Math.abs(a._clean.length - b._clean.length) <= 1) s += 0.6;
    const d = jaccard(a._big, b._big);
    s += Math.min(d, 0.35) * 9; // 뜻이 비슷한 영역
    if (a.group !== "고유어" && a.group !== "다의어") s += jaccard(a._words, b._words) * 3; // 속담·관용구는 같은 낱말
    if (a.hanja && b.hanja && a.hanja !== b.hanja) {
      const ha = new Set([...a.hanja].filter(ch => /[一-鿿]/.test(ch)));
      const hb = new Set([...b.hanja].filter(ch => /[一-鿿]/.test(ch)));
      s += jaccard(ha, hb) * 3; // 같은 한자를 쓰는 다른 말
    }
    return s + Math.random() * 0.6; // 매번 조금씩 다른 보기
  }

  function pickDistractors(item, field, n) {
    const base = byGroup.get(item.group) || [];
    const neighbors = (NEIGHBOR[item.group] || []).flatMap(g => byGroup.get(g) || []);
    const candidates = [];
    const consider = list => list.forEach(v => {
      if (v === item || v.term === item.term) return;
      if (sameMeaning(item, v)) return;
      if (field === "term" && item.group === "다의어" && v.group === "다의어") return;
      candidates.push(v);
    });
    consider(base);
    if (candidates.length < 30) consider(neighbors);

    const scored = candidates.map(v => [confusability(item, v), v]).sort((a, b) => b[0] - a[0]);
    const top = scored.slice(0, Math.max(n * 3, 12));
    // 상위권에서 섞어 뽑아 같은 문제라도 매번 조금 다르게
    const out = [];
    const seen = new Set([item[field]]);
    const usedTerms = new Set([item._clean]);
    for (const [, v] of shuffle(top.slice(0, n * 2)).concat(top.slice(n * 2))) {
      const val = v[field];
      if (!val || seen.has(val) || usedTerms.has(v._clean)) continue;
      // 이미 고른 보기끼리도 같은 뜻이면 하나만
      if (out.some(o => sameMeaning(o, v))) continue;
      seen.add(val);
      usedTerms.add(v._clean);
      out.push(v);
      if (out.length >= n) break;
    }
    return out.map(v => v[field]);
  }

  /* ───────────── 저장 (이 기기 브라우저에만) ───────────── */
  const STORE_KEY = "kbs-vocab-v2";
  let store = { wrong: {}, days: {}, settings: {}, srs: {}, star: {} };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (saved && typeof saved === "object") store = Object.assign(store, saved);
  } catch (e) { /* 저장소를 못 쓰면 이번 접속 동안만 기억 */ }
  store.srs ||= {};
  store.star ||= {};

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* 무시 */ }
  }

  const dayNum = (d = new Date()) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
  const TODAY = () => dayNum();
  const todayKey = () => String(TODAY());
  const INTERVALS = [0, 1, 3, 7, 14, 30, 60]; // 단계별 다음 복습까지 날짜
  const MASTERED = 3;

  function isDue(id) {
    const s = store.srs[id];
    return s && s.due <= TODAY();
  }

  function record(item, ok) {
    const today = TODAY();
    const day = (store.days[todayKey()] ||= { solved: 0, correct: 0 });
    day.solved += 1;
    if (ok) day.correct += 1;

    // 복습 일정: 맞히면 간격을 늘리고, 틀리면 내일 다시
    const s = store.srs[item.id] || { lv: 0, due: today, ok: 0, bad: 0, last: -1 };
    if (ok) {
      s.ok += 1;
      if (s.last !== today || s.lv === 0) { // 같은 날 반복으로는 한 단계만
        s.lv = Math.min(s.lv + 1, INTERVALS.length - 1);
      }
      s.due = today + INTERVALS[s.lv];
    } else {
      s.bad += 1;
      s.lv = 0;
      s.due = today + 1;
    }
    s.last = today;
    store.srs[item.id] = s;

    // 오답노트: 서로 다른 날 2번 맞혀야 빠짐
    const w = store.wrong[item.id];
    if (ok) {
      if (w && w.okDay !== today) {
        w.streak = (w.streak || 0) + 1;
        w.okDay = today;
        if (w.streak >= 2) delete store.wrong[item.id];
      }
    } else {
      store.wrong[item.id] = { n: (w ? w.n : 0) + 1, streak: 0, t: Date.now() };
    }
    save();
    updateBadge();
  }

  function toggleStar(id) {
    if (store.star[id]) delete store.star[id];
    else store.star[id] = Date.now();
    save();
    updateBadge();
    return !!store.star[id];
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
  const rich = s => esc(s).replace(/‹([^›]*)›/g, "<u>$1</u>");
  const hasHanja = h => h && /[一-鿿]/.test(h);

  /* 예문에서 표제어(활용형 포함) 위치 찾기 */
  function stemsOf(term) {
    const t = term.replace(/\(.*?\)/g, "").replace(/-/g, "").trim();
    const list = [t];
    if (/다$/.test(t) && t.length >= 2) {
      list.push(t.slice(0, -1));
      if (/하다$/.test(t) && t.length >= 4) list.push(t.slice(0, -2));
      if (/스럽다$/.test(t) && t.length >= 5) list.push(t.slice(0, -3));
      if (/르다$/.test(t) && t.length >= 3) list.push(t.slice(0, -2));
      if (t.length === 2) list.push(t.slice(0, 1));
    }
    return [...new Set(list)].filter(s => s.length >= 1);
  }

  function findWord(sentence, term) {
    for (const stem of stemsOf(term)) {
      if (stem.length < 2 && term.length > 2) continue;
      let from = 0;
      while (true) {
        const i = sentence.indexOf(stem, from);
        if (i < 0) break;
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

  const splitExamples = ex => (ex || "").split(/\s\/\s/).map(s => s.trim()).filter(Boolean);

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

  function canBlank(v) {
    if (!v.example || v.group === "다의어") return false;
    if (/\(|\s/.test(v.term) && v.group !== "관용구") return false;
    return splitExamples(v.example).some(s => findWord(s, v.term));
  }

  const senseSiblings = v => (byTerm.get(v.term) || []).filter(o => o !== v && o.definition !== v.definition);

  function hanjaSiblings(v) {
    if (!hasHanja(v.hanja)) return [];
    const mine = v.hanja.split("/")[0];
    return (byTerm.get(v.term) || []).filter(o => hasHanja(o.hanja) && o.hanja.split("/")[0] !== mine);
  }

  function possibleTypes(v, wanted) {
    const types = [];
    const senseOk = v.example && senseSiblings(v).length >= 2 && splitExamples(v.example).some(s => findWord(s, v.term));
    if (v.group === "다의어") {
      types.push(senseOk ? "sense" : "def");
      return types;
    }
    if (wanted === "def" || wanted === "mix") types.push("def");
    if (wanted === "term" || wanted === "mix") types.push("term");
    if ((wanted === "blank" || wanted === "mix") && canBlank(v)) types.push("blank", "blank");
    if (wanted === "mix" && hanjaSiblings(v).length >= 1 && v.example) types.push("hanja", "hanja");
    if (wanted === "mix" && senseOk && v.sense) types.push("sense");
    if (!types.length) types.push("def");
    return types;
  }

  function buildVocabQuestion(v, wanted) {
    const type = pick(possibleTypes(v, wanted));
    const hanja = hasHanja(v.hanja) ? v.hanja : "";
    const q = { item: v, type, category: v.category, choiceIsTerm: false };
    const n = CHOICE_COUNT - 1;

    if (type === "def") {
      q.prompt = `<span class="word">${esc(v.term)}</span>${hanja ? ` <span class="hanja">${esc(hanja)}</span>` : ""}<br>의 뜻으로 가장 알맞은 것은?`;
      q.answer = v.definition;
      q.choices = shuffle([v.definition, ...pickDistractors(v, "definition", n)]);
    } else if (type === "term" || type === "blank") {
      if (type === "term") {
        q.prompt = "다음 뜻을 가진 말은?";
        q.passage = esc(v.definition);
      } else {
        const sentence = pick(splitExamples(v.example).filter(s => findWord(s, v.term)));
        q.prompt = "빈칸에 들어갈 말로 가장 알맞은 것은?";
        q.passage = blankOut(sentence, v.term);
      }
      q.answer = v.term;
      q.choices = shuffle([v.term, ...pickDistractors(v, "term", n)]);
      q.choiceIsTerm = true;
    } else if (type === "sense") {
      const sentence = pick(splitExamples(v.example).filter(s => findWord(s, v.term)));
      q.prompt = `밑줄 친 ‘${esc(v.term)}’의 의미로 가장 알맞은 것은?`;
      q.passage = highlight(sentence, v.term);
      q.answer = v.definition;
      // 같은 단어의 다른 뜻이 가장 헷갈리는 보기
      const sib = [...new Set(shuffle(senseSiblings(v)).map(o => o.definition))].slice(0, n);
      const extra = sib.length < n ? pickDistractors(v, "definition", n - sib.length) : [];
      q.choices = shuffle([v.definition, ...sib, ...extra]);
    } else if (type === "hanja") {
      const sentence = pick(splitExamples(v.example));
      q.prompt = `밑줄 친 ‘${esc(v.term)}’에 맞는 한자는?`;
      q.passage = highlight(sentence, v.term);
      q.answer = hanja;
      const sib = [...new Set(hanjaSiblings(v).map(o => o.hanja))];
      // 같은 소리의 한자가 모자라면 첫 글자를 공유하는 한자어로 채움
      if (sib.length < n) {
        const first = [...hanja].find(ch => /[一-鿿]/.test(ch));
        const more = shuffle(VOCAB.filter(o => hasHanja(o.hanja) && o.hanja !== hanja && o._clean.length === v._clean.length &&
          (o.hanja.includes(first) || o._clean[0] === v._clean[0]))).map(o => o.hanja);
        for (const h of more) { if (sib.length >= n) break; if (!sib.includes(h)) sib.push(h); }
      }
      q.choices = shuffle([hanja, ...sib.slice(0, n)]);
      q.choiceIsTerm = true;
    }
    q.typeLabel = TYPE_LABEL[type];
    return q;
  }

  function buildExamQuestion(x) {
    return {
      item: x, type: "exam", category: x.category, typeLabel: TYPE_LABEL.exam,
      prompt: rich(x.question), passage: x.passage ? rich(x.passage) : "",
      choices: x.choices.slice(), answer: x.choices[x.answer], richChoices: true
    };
  }

  const buildQuestion = (item, wanted) => item.kind === "exam" ? buildExamQuestion(item) : buildVocabQuestion(item, wanted);

  /* ───────────── 문제 풀기 화면 ───────────── */
  const settings = Object.assign(
    { groups: GROUPS.map(g => g.key), count: 20, mode: "mix", order: "smart" },
    store.settings || {}
  );
  if (settings.weak !== undefined) { delete settings.weak; }

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

  const countIn = g => ALL.filter(x => x.group === g).length;

  function renderChips(containerId, selected, onChange, multi = true, extras = []) {
    const box = $(containerId);
    box.innerHTML = "";
    const add = (key, label, n) => {
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML = `${esc(label)} <small>${n}</small>`;
      b.classList.toggle("selected", selected.includes(key));
      b.addEventListener("click", () => {
        let next;
        if (multi) {
          next = selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key];
          if (!next.length) next = [key];
        } else {
          next = selected.length === 1 && selected[0] === key ? [] : [key];
        }
        onChange(next);
      });
      box.appendChild(b);
    };
    extras.forEach(e => add(e.key, e.label, e.n));
    GROUPS.forEach(g => {
      const n = containerId === "categoryButtons" ? countIn(g.key) : (byGroup.get(g.key) || []).length;
      if (n) add(g.key, g.key, n);
    });
  }

  function persistSettings() {
    store.settings = settings;
    save();
  }

  function drawStartChips() {
    renderChips("categoryButtons", settings.groups, next => {
      settings.groups = next;
      persistSettings();
      drawStartChips();
    });
  }

  function setSeg(id, value) {
    document.querySelectorAll(`#${id} button`).forEach(b => b.classList.toggle("selected", b.dataset.value === String(value)));
  }

  const dueItems = () => ALL.filter(x => isDue(x.id));

  function drawToday() {
    const d = store.days[todayKey()] || { solved: 0, correct: 0 };
    const rate = d.solved ? Math.round((d.correct / d.solved) * 100) + "%" : "–";
    const due = dueItems().length;
    $("todayStats").innerHTML = `
      <div><b>${d.solved}</b><span>오늘 푼 문제</span></div>
      <div><b>${rate}</b><span>오늘 정답률</span></div>
      <div><b>${due}</b><span>복습할 것</span></div>`;

    const seenAny = Object.keys(store.srs).length;
    if (due) {
      $("reviewTitle").textContent = `오늘 복습할 것 ${due}개`;
      $("reviewDesc").textContent = "틀렸거나 복습 날짜가 된 것만 모았어요. 먼저 풀고 새 문제로 넘어가세요.";
      $("reviewButton").classList.remove("hidden");
    } else {
      $("reviewTitle").textContent = seenAny ? "오늘 복습은 끝났어요" : "첫 문제를 풀어 보세요";
      $("reviewDesc").textContent = seenAny
        ? "맞힌 것은 1일 → 3일 → 1주 → 2주 → 한 달 간격으로 다시 나옵니다."
        : "푼 문제는 맞히면 간격을 늘려, 틀리면 다음 날 다시 나옵니다.";
      $("reviewButton").classList.add("hidden");
    }
    drawProgress();
  }

  function drawProgress() {
    let seenTotal = 0, masteredTotal = 0;
    const rows = GROUPS.map(g => {
      const items = ALL.filter(x => x.group === g.key);
      if (!items.length) return "";
      const seen = items.filter(x => store.srs[x.id]).length;
      const mastered = items.filter(x => store.srs[x.id] && store.srs[x.id].lv >= MASTERED).length;
      seenTotal += seen; masteredTotal += mastered;
      const sp = (seen / items.length) * 100, mp = (mastered / items.length) * 100;
      return `<div class="prog-row">
        <span class="prog-name">${esc(g.key)}</span>
        <span class="prog-bar"><i class="seen" style="width:${sp}%"></i><i class="done" style="width:${mp}%"></i></span>
        <span class="prog-num">${mastered}/${seen}/${items.length}</span>
      </div>`;
    }).join("");
    $("progressList").innerHTML = `<div class="prog-legend"><span><i class="done"></i>익힘</span><span><i class="seen"></i>본 것</span><span class="muted">익힘/본 것/전체</span></div>` + rows;
    $("progressSummary").textContent = `· 본 것 ${seenTotal} · 익힘 ${masteredTotal} / ${ALL.length}`;
  }

  function orderedSample(source, n) {
    if (settings.order === "random") return shuffle(source).slice(0, n);
    const today = TODAY();
    const due = shuffle(source.filter(x => store.srs[x.id] && store.srs[x.id].due <= today))
      .sort((a, b) => store.srs[a.id].lv - store.srs[b.id].lv);
    const fresh = shuffle(source.filter(x => !store.srs[x.id]));
    const rest = shuffle(source.filter(x => store.srs[x.id] && store.srs[x.id].due > today));
    if (settings.order === "new") return [...fresh, ...due, ...rest].slice(0, n);
    // 복습 우선: 복습 몫을 앞에, 나머지는 새 문제
    return [...due, ...fresh, ...rest].slice(0, n);
  }

  function startQuiz(customItems, wanted) {
    let items;
    if (customItems) {
      items = shuffle(customItems);
    } else {
      let source = ALL.filter(x => settings.groups.includes(x.group));
      if (settings.mode !== "mix") {
        source = source.filter(x => x.kind === "vocab");
        if (settings.mode === "blank") source = source.filter(canBlank);
        if (!source.length) source = ALL.filter(x => settings.groups.includes(x.group));
      }
      items = orderedSample(source, Math.min(settings.count, source.length));
    }
    const mode = wanted || (customItems ? "mix" : settings.mode);
    questions = items.map(x => buildQuestion(x, mode)).filter(q => q.choices && q.choices.length >= 2);
    if (!questions.length) return;
    currentIndex = 0;
    answers = [];
    changeScreen("quizScreen");
    renderQuestion();
  }

  function drawStar(btn, id) {
    const on = !!store.star[id];
    btn.textContent = on ? "★ 단어장" : "☆ 단어장";
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
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
    drawStar($("questionStar"), q.item.id);

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
      button.innerHTML = `<span class="choice-number">${"①②③④⑤⑥"[index]}</span><span>${q.richChoices ? rich(choice) : esc(choice)}</span>`;
      button.addEventListener("click", () => checkAnswer(index));
      list.appendChild(button);
    });

    $("explanation").className = "explanation hidden";
    $("nextButton").classList.add("hidden");
  }

  function entryDetail(v) {
    const hanja = hasHanja(v.hanja) ? ` (${esc(v.hanja)})` : "";
    let html = `<p><b>${esc(v.term)}</b>${hanja}${v.sense ? ` ${v.sense}` : ""} — ${esc(v.definition)}</p>`;
    if (v.example) html += `<p>예) ${splitExamples(v.example).map(s => highlight(s, v.term)).join(" / ")}</p>`;
    if (v.related && v.related.length) html += `<p>비슷한·반대 표현: ${esc(v.related.join(", "))}</p>`;
    if (v.note) html += `<p>참고: ${esc(v.note)}</p>`;
    return html;
  }

  // 틀렸을 때 고른 보기가 무슨 뜻인지도 보여 줌
  function choiceMeaning(q, choice) {
    if (q.type === "term" || q.type === "blank") {
      const v = VOCAB.find(o => o.term === choice);
      return v ? `<p class="also">고른 ‘${esc(choice)}’ — ${esc(v.definition)}</p>` : "";
    }
    if (q.type === "def" || q.type === "sense") {
      const v = VOCAB.find(o => o.definition === choice);
      return v && v.term !== q.item.term ? `<p class="also">고른 뜻은 ‘${esc(v.term)}’의 뜻입니다.</p>` : "";
    }
    return "";
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
      const i = Number(btn.dataset.index);
      btn.disabled = true;
      if (q.choices[i] === q.answer) btn.classList.add("correct");
      else if (i === selectedIndex) btn.classList.add("wrong");
    });

    let body;
    if (q.item.kind === "exam") {
      const n = q.choices.indexOf(q.answer);
      body = `<p>정답 ${"①②③④⑤⑥"[n]} ${rich(q.answer)}</p>${q.item.explanation ? `<p>${rich(q.item.explanation)}</p>` : ""}`;
    } else {
      body = entryDetail(q.item);
      if (!ok) body += choiceMeaning(q, selected);
      if (q.type === "hanja") {
        const others = hanjaSiblings(q.item).map(o => `${esc(o.hanja)}: ${esc(o.definition)}`);
        if (others.length) body += `<p>${others.join("<br>")}</p>`;
      }
    }
    const s = store.srs[q.item.id];
    const nextTxt = s ? (s.lv === 0 || !ok ? "내일 다시 나와요." : `다음 복습: ${INTERVALS[s.lv]}일 뒤`) : "";
    const ex = $("explanation");
    ex.className = `explanation ${ok ? "correct" : "wrong"}`;
    ex.innerHTML = `<strong>${ok ? "정답입니다." : "아쉬워요. 오답노트에 담았어요."} <small>${nextTxt}</small></strong>${body}`;

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
    $("resultDescription").innerHTML = `${answered}문제 중 <b>${correct}문제</b>를 맞혔습니다. 틀린 것은 내일 복습에 다시 나옵니다.`;
    $("wrongRetryButton").classList.toggle("hidden", correct === answered);

    const wrongOnes = questions.filter((q, i) => answers[i] !== undefined && answers[i] !== q.answer);
    $("resultList").innerHTML = wrongOnes.length
      ? `<p class="eyebrow">틀린 문제 복습</p>` + wrongOnes.map(q => entryCard(q.item, false)).join("")
      : "";
    changeScreen("resultScreen");
  }

  /* ───────────── 목록 카드 ───────────── */
  function entryCard(x, withRemove) {
    const w = store.wrong[x.id];
    const star = `<button type="button" class="star-button${store.star[x.id] ? " on" : ""}" data-star="${x.id}">${store.star[x.id] ? "★" : "☆"}</button>`;
    const foot = withRemove
      ? `<div class="entry-foot"><span>${withRemove === "wrong" ? `틀린 횟수 ${w ? w.n : 0}회 · 다른 날 2번 맞히면 빠져요` : "단어장에 담은 말"}</span><button type="button" class="link-button" data-remove="${x.id}">빼기</button></div>`
      : "";
    if (x.kind === "exam") {
      return `<article class="entry">
        <div class="entry-head"><span class="entry-cat">${esc(x.category)}</span>${star}</div>
        <p class="entry-def">${rich(x.question)}</p>
        ${x.passage ? `<p class="entry-ex">${rich(x.passage)}</p>` : ""}
        <p class="entry-def"><b>정답</b> ${rich(x.choices[x.answer])}</p>
        ${x.explanation ? `<p class="entry-rel">${rich(x.explanation)}</p>` : ""}
        ${foot}</article>`;
    }
    const hanja = hasHanja(x.hanja) ? `<span class="entry-hanja">${esc(x.hanja)}</span>` : "";
    return `<article class="entry">
      <div class="entry-head">
        <span class="entry-term">${esc(x.term)}</span>${hanja}${x.sense ? `<span class="entry-hanja">뜻 ${x.sense}</span>` : ""}
        <span class="entry-cat">${esc(x.category)}</span>${star}
      </div>
      <p class="entry-def">${esc(x.definition)}</p>
      ${x.example ? `<p class="entry-ex">${splitExamples(x.example).map(s => highlight(s, x.term)).join(" / ")}</p>` : ""}
      ${x.related && x.related.length ? `<p class="entry-rel">${esc(x.related.join("  "))}</p>` : ""}
      ${x.note ? `<p class="entry-note">${esc(x.note)}</p>` : ""}
      ${foot}</article>`;
  }

  // 목록 어디서든 ☆ 누르면 단어장 토글
  document.addEventListener("click", e => {
    const id = e.target.dataset && e.target.dataset.star;
    if (!id) return;
    const on = toggleStar(id);
    e.target.textContent = on ? "★" : "☆";
    e.target.classList.toggle("on", on);
    if (noteTab === "star" && !$("wrongScreen").classList.contains("hidden")) drawWrong();
  });

  /* ───────────── 내 노트 (오답노트 + 단어장) ───────────── */
  let wrongConfirm = false;
  let noteTab = "wrong";

  function wrongItems() {
    return Object.entries(store.wrong)
      .filter(([id]) => BY_ID.has(id))
      .sort((a, b) => b[1].n - a[1].n || b[1].t - a[1].t)
      .map(([id]) => BY_ID.get(id));
  }
  function starItems() {
    return Object.entries(store.star)
      .filter(([id]) => BY_ID.has(id))
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => BY_ID.get(id));
  }

  function drawWrong() {
    const items = noteTab === "wrong" ? wrongItems() : starItems();
    $("noteWrongCount").textContent = wrongItems().length;
    $("noteStarCount").textContent = starItems().length;
    setSeg("noteTabs", noteTab);
    $("wrongSummary").textContent = items.length
      ? (noteTab === "wrong" ? `${items.length}개. 많이 틀린 순서입니다.` : `${items.length}개. 최근에 담은 순서입니다.`)
      : (noteTab === "wrong"
        ? "아직 틀린 문제가 없어요. 문제를 풀면 틀린 것이 여기에 모입니다."
        : "문제·카드·사전에서 ☆을 누르면 여기에 모입니다. 시험 직전에 볼 말을 담아 두세요.");
    $("wrongQuizButton").disabled = !items.length;
    $("wrongClearButton").textContent = "비우기";
    wrongConfirm = false;
    $("wrongList").innerHTML = items.slice(0, 300).map(x => entryCard(x, noteTab)).join("");
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
    let pool;
    if (cardGroups[0] === "★단어장") pool = starItems().filter(x => x.kind === "vocab");
    else if (cardGroups[0] === "오답") pool = wrongItems().filter(x => x.kind === "vocab");
    else pool = VOCAB.filter(v => !cardGroups.length || cardGroups.includes(v.group));
    if (!pool.length) pool = VOCAB;
    // 복습할 카드가 먼저
    const due = shuffle(pool.filter(x => isDue(x.id)));
    const rest = shuffle(pool.filter(x => !isDue(x.id)));
    cardDeck = [...due, ...rest];
    cardIndex = 0;
  }

  function drawCard() {
    if (!cardDeck.length) newDeck();
    const v = cardDeck[cardIndex % cardDeck.length];
    const reverse = $("cardReverse").checked;
    const hanja = hasHanja(v.hanja) ? `<span class="hanja">${esc(v.hanja)}</span>` : "";
    cardFlipped = false;
    $("cardCat").textContent = `${v.category} · ${cardIndex + 1}/${cardDeck.length}${isDue(v.id) ? " · 복습" : ""}`;
    const front = $("cardFront");
    front.classList.toggle("as-def", reverse);
    front.innerHTML = reverse ? esc(v.definition) : `${esc(v.term)}${hanja}`;
    const exHtml = v.example ? `<span class="ex">${splitExamples(v.example).map(s => highlight(s, v.term)).join("<br>")}</span>` : "";
    $("cardBack").innerHTML = reverse
      ? `<span class="big">${esc(v.term)}</span>${hanja ? `<span class="muted">${esc(v.hanja)}</span>` : ""}${exHtml}`
      : `<span>${esc(v.definition)}</span>${exHtml}${v.related && v.related.length ? `<span class="ex">${esc(v.related.join("  "))}</span>` : ""}`;
    $("cardBack").classList.add("hidden");
    $("cardHint").textContent = reverse ? "눌러서 단어 보기" : "눌러서 뜻 보기";
    drawStar($("cardStar"), v.id);
  }

  function flipCard() {
    cardFlipped = !cardFlipped;
    $("cardBack").classList.toggle("hidden", !cardFlipped);
    $("cardHint").textContent = cardFlipped ? "다시 누르면 앞면" : ($("cardReverse").checked ? "눌러서 단어 보기" : "눌러서 뜻 보기");
  }

  function nextCard(known) {
    const v = cardDeck[cardIndex % cardDeck.length];
    record(v, known); // 카드 결과도 복습 일정과 오답노트에 반영
    store.days[todayKey()].solved -= 1; // 카드는 '푼 문제' 수에는 넣지 않음
    if (known) store.days[todayKey()].correct -= 1;
    save();
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
    }, false, [
      { key: "★단어장", label: "★ 단어장", n: starItems().filter(x => x.kind === "vocab").length },
      { key: "오답", label: "오답", n: wrongItems().filter(x => x.kind === "vocab").length }
    ]);
  }

  /* ───────────── 사전 ───────────── */
  let dictGroups = [];
  let searchTimer = 0;

  function drawDict() {
    const raw = $("searchInput").value.trim();
    const qn = raw.replace(/\s+/g, "");
    let pool = VOCAB.filter(v => !dictGroups.length || dictGroups.includes(v.group));
    const total = pool.length;
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
    $("searchSummary").textContent = qn ? `${pool.length}개 찾음` : `무작위 30개 · 전체 ${total}개`;
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
  function openTab(tab) {
    document.querySelectorAll("#tabbar button").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    if (tab === "quiz") { drawToday(); changeScreen("startScreen"); }
    if (tab === "card") { drawCardChips(); changeScreen("cardScreen"); drawCard(); }
    if (tab === "wrong") { drawWrong(); changeScreen("wrongScreen"); }
    if (tab === "dict") { changeScreen("dictScreen"); drawDict(); }
  }

  /* ───────────── 이벤트 ───────────── */
  document.querySelectorAll("#tabbar button").forEach(b => b.addEventListener("click", () => openTab(b.dataset.tab)));

  $("allCategories").addEventListener("click", () => {
    settings.groups = GROUPS.map(g => g.key);
    persistSettings();
    drawStartChips();
  });

  [["countButtons", "count", Number], ["modeButtons", "mode", String], ["orderButtons", "order", String]].forEach(([id, key, cast]) => {
    document.querySelectorAll(`#${id} button`).forEach(b => b.addEventListener("click", () => {
      settings[key] = cast(b.dataset.value);
      setSeg(id, settings[key]);
      persistSettings();
    }));
  });

  $("startButton").addEventListener("click", () => startQuiz());
  $("reviewButton").addEventListener("click", () => {
    const due = dueItems().sort((a, b) => store.srs[a.id].lv - store.srs[b.id].lv).slice(0, 50);
    if (due.length) startQuiz(due);
  });
  $("nextButton").addEventListener("click", () => {
    if (currentIndex === questions.length - 1) { showResult(); return; }
    currentIndex += 1;
    renderQuestion();
  });
  $("quitButton").addEventListener("click", () => {
    if (answers.some(a => a !== undefined)) showResult();
    else openTab("quiz");
  });
  $("questionStar").addEventListener("click", () => {
    const id = questions[currentIndex].item.id;
    toggleStar(id);
    drawStar($("questionStar"), id);
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
  $("cardStar").addEventListener("click", () => {
    const v = cardDeck[cardIndex % cardDeck.length];
    toggleStar(v.id);
    drawStar($("cardStar"), v.id);
  });

  document.querySelectorAll("#noteTabs button").forEach(b => b.addEventListener("click", () => {
    noteTab = b.dataset.value;
    drawWrong();
  }));
  $("wrongQuizButton").addEventListener("click", () => {
    const items = noteTab === "wrong" ? wrongItems() : starItems();
    if (items.length) startQuiz(items.slice(0, 50));
  });
  $("wrongClearButton").addEventListener("click", () => {
    if (!wrongConfirm) {
      wrongConfirm = true;
      $("wrongClearButton").textContent = "정말 비울까요?";
      return;
    }
    if (noteTab === "wrong") store.wrong = {};
    else store.star = {};
    save();
    updateBadge();
    drawWrong();
  });
  $("wrongList").addEventListener("click", e => {
    const id = e.target.dataset && e.target.dataset.remove;
    if (!id) return;
    if (noteTab === "wrong") delete store.wrong[id];
    else delete store.star[id];
    save();
    updateBadge();
    drawWrong();
  });

  $("searchInput").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(drawDict, 150);
  });

  document.addEventListener("keydown", e => {
    if ($("quizScreen").classList.contains("hidden")) return;
    if (/^[1-6]$/.test(e.key)) {
      const btn = $("choiceList").querySelectorAll("button")[Number(e.key) - 1];
      if (btn) btn.click();
    } else if (e.key === "Enter" && answerChecked) {
      $("nextButton").click();
    }
  });

  /* ───────────── 시작 ───────────── */
  const homeLink = $("homeLink");
  if (homeLink && (location.protocol === "file:" || /claude|artifact/i.test(location.hostname) || !/\/[^/]+\/(index\.html)?$/.test(location.pathname))) {
    homeLink.classList.add("hidden");
  }

  // 예전 버전 날짜 키(YYYY-M-D) 정리
  Object.keys(store.days).forEach(k => { if (k.includes("-")) delete store.days[k]; });

  $("totalCount").textContent = `${VOCAB.length.toLocaleString()}어휘 · ${EXAMS.length}문항`;
  setSeg("countButtons", settings.count);
  setSeg("modeButtons", settings.mode);
  setSeg("orderButtons", settings.order);
  drawStartChips();
  drawToday();
  updateBadge();

  // 테스트·점검용 (화면에는 영향 없음)
  window.__kbs = { buildQuestion, VOCAB, EXAMS, pickDistractors };
})();
