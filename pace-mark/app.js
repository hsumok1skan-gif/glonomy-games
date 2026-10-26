/* Pace Mark — 상태와 동작 */
(function () {
  'use strict';
  var D = window.PM_DATA, L = window.Logic, U = window.UI, $ = U.$;

  var A = {
    S: null,
    ui: { screen: 'home', cat: '전체', examQ: '', draft: null, tplEdit: null, logName: '전체', logSort: 'new', view: null, confirmFn: null, undo: null }
  };
  window.App = A;

  /* ---------- 저장 ---------- */
  function save() {
    var ok = window.Store.save(A.S);
    var w = $('store-warn');
    if (!ok) { w.textContent = '저장이 되지 않아요. 브라우저 저장 공간이나 사생활 보호 모드를 확인하세요. 지금 화면의 기록은 이 창을 닫으면 사라져요.'; w.hidden = false; }
    else if (!w.dataset.keep) w.hidden = true;
    return ok;
  }
  function uid(p) { return p + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
  function copyTpl(t) {
    return { id: t.id, cat: t.cat, custom: !!t.custom, name: t.name, total: t.total, reserve: t.reserve,
      sections: t.sections.map(function (s) { return { name: s.name, count: s.count, min: s.min || 0 }; }) };
  }

  /* ---------- 틀·기록 찾기 ---------- */
  A.allTemplates = function () {
    return A.S.templates.map(function (t) { t.custom = true; return t; }).concat(D.PRESETS);
  };
  A.findTpl = function (id) {
    if (id === D.TRIAL.id) return D.TRIAL;
    var all = A.allTemplates();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  };
  A.sortedSessions = function (mode) {
    var m = mode || 'new', list = A.S.sessions.slice();
    if (m === 'fast') list.sort(function (a, b) { return (a.elapsed || 0) - (b.elapsed || 0); });
    else if (m === 'acc') {
      var acc = function (s) { var v = L.summary(s).acc; return v === null ? -1 : v; };
      list.sort(function (a, b) { return acc(b) - acc(a) || b.startedAt - a.startedAt; });
    } else list.sort(function (a, b) { return b.startedAt - a.startedAt; });
    return list;
  };
  A.recentTemplates = function (n) {
    var out = [], seen = {};
    A.sortedSessions('new').forEach(function (s) {
      if (out.length >= n || seen[s.tplId]) return;
      seen[s.tplId] = true;
      var t = A.findTpl(s.tplId);
      if (t) out.push(t);
    });
    return out;
  };
  A.prevOf = function (s) {
    var best = null;
    A.S.sessions.forEach(function (x) {
      if (x.id !== s.id && x.name === s.name && x.startedAt < s.startedAt && (!best || x.startedAt > best.startedAt)) best = x;
    });
    return best;
  };
  A.adviceFor = function (s) {
    var seq = A.S.sessions.indexOf(s);
    return L.advice(s, A.prevOf(s), D.STRATEGIES, seq < 0 ? 0 : seq);
  };
  function findSession(id) {
    for (var i = 0; i < A.S.sessions.length; i++) if (A.S.sessions[i].id === id) return A.S.sessions[i];
    return null;
  }

  /* ---------- 화면 이동 ---------- */
  function go(to) {
    if (to === 'home') U.renderHome(A);
    else if (to === 'exams') U.renderExams(A);
    else if (to === 'log') U.renderLog(A);
    else if (to === 'more') U.renderMore(A);
    else if (to === 'help') U.renderHelp();
    else if (to === 'result') { var s = findSession(A.ui.view); if (!s) return go('log'); U.renderResult(A, s); }
    else if (to === 'grade') { var g = findSession(A.ui.view); if (!g) return go('log'); U.renderGrade(A, g); }
    else if (to === 'run') { if (!A.S.run) return go('home'); U.runTick(A); }
    A.ui.screen = to;
    U.show(to);
  }
  function rerender() {
    var sc = A.ui.screen;
    if (sc === 'run') return;
    go(sc);
  }

  /* ---------- 소리·진동 ---------- */
  var actx = null;
  function initAudio() {
    if (actx) return;
    try { var C = window.AudioContext || window.webkitAudioContext; if (C) actx = new C(); } catch (e) { actx = null; }
  }
  function beep(freq, dur, vol) {
    if (!A.S.settings.sound || !actx) return;
    try {
      var o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.08, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* 소리가 안 나도 계속 */ }
  }
  function buzz(ms) {
    if (!A.S.settings.vibrate) return;
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* 진동 없음 */ }
  }

  /* ---------- 풀이 ---------- */
  var planCache = { id: null, p: null };
  A.runPlan = function () {
    var R = A.S.run;
    if (!R) return null;
    var key = R.id + ':' + R.reserve + ':' + R.sections.map(function (s) { return s.name + s.count + s.min; }).join('|');
    if (planCache.id !== key) { planCache.id = key; planCache.p = L.plan(R); }
    return planCache.p;
  };
  A.runElapsed = function () {
    var R = A.S.run;
    if (!R) return 0;
    var now = Date.now();
    return Math.max(0, now - R.startMs - R.pausedTotal - (R.pausedAt ? now - R.pausedAt : 0));
  };
  // 풀이 중 겨루는 최고 회차 (지워졌으면 null)
  A.runGhost = function () {
    var R = A.S.run;
    return R && R.ghostId ? findSession(R.ghostId) : null;
  };
  var timer = null;
  function startTimer() { if (!timer) timer = setInterval(tick, 250); }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function tick() {
    var R = A.S.run;
    if (!R) { stopTimer(); return; }
    if (R.pausedAt) return;
    var p = A.runPlan(), el = A.runElapsed() / 1000, left = p.total - el;
    if (left <= 0) {
      U.toast('시간이 끝났어요. 채점으로 넘어가요.');
      beep(440, 0.6, 0.12); buzz([200, 100, 200]);
      finishRun('time');
      return;
    }
    if (el >= p.usable && p.reserve > 0 && !R.markWarned) {
      R.markWarned = true; save();
      beep(660, 0.25); setTimeout(function () { beep(660, 0.25); }, 320); buzz([120, 80, 120]);
    }
    var wm = A.S.settings.warnMin;
    if (wm > 0 && left <= wm * 60 && !R.warned && p.total > wm * 60) {
      R.warned = true; save();
      beep(880, 0.3); buzz(200);
    }
    if (A.ui.screen === 'run') U.runTick(A);
  }
  function startRun(d) {
    A.S.run = { id: uid('r'), name: d.name, tplId: d.id, total: d.total, reserve: d.reserve,
      sections: d.sections.map(function (s) { return { name: s.name, count: s.count, min: s.min || 0 }; }),
      laps: [], startMs: Date.now(), pausedTotal: 0, pausedAt: null, warned: false, markWarned: false, ghostId: d.ghostId || null };
    if (d.id !== D.TRIAL.id) A.S.lastTpl = d.id;
    save();
    initAudio();
    beep(520, 0.15);
    go('run');
    startTimer();
  }
  function lap(flag) {
    var R = A.S.run;
    if (!R || R.pausedAt) return;
    var p = A.runPlan(), done = R.laps.length;
    if (done >= p.N) return;
    var el = A.runElapsed(), lastAt = done ? R.laps[done - 1].at : 0;
    var item = { q: done + 1, sec: L.secOf(p, done), t: Math.max(0, el - lastAt), at: el };
    if (flag) item.flag = true;
    R.laps.push(item);
    save();
    var behind = el / 1000 > p.targets[done] + 0.5;
    U.lapPop(behind);
    beep(behind ? 300 : 700, 0.07, 0.05);
    buzz(behind ? 40 : 15);
    if (done + 1 >= p.N) { U.toast('마지막 문항까지 끝냈어요. 끝내기를 눌러 채점하세요.'); beep(990, 0.2); }
    else if (p.secs[item.sec] && done + 1 === p.secs[item.sec].endQ) U.toast(p.secs[item.sec].name + ' 끝 · ' + L.fmtDelta(el / 1000 - p.targets[done]));
    U.runTick(A);
  }
  // 2분 체험: 처음 안내와 홈 빈 상태의 버튼에서 바로 시작한다
  function startTrial() {
    if (A.S.run) { U.toast('풀던 회차가 있어요. 이어 풀거나 그만둔 뒤 체험해 보세요.'); go('home'); return; }
    startRun(D.TRIAL);
  }

  /* ---------- 첫 풀이 안내 ---------- */
  // runTick 이 settings.coached 가 false 일 때 부른다. 안내 동안 시계를 멈춘다
  var coach = { on: false, step: 0, paused: false };
  A.coachStart = function () {
    var R = A.S.run;
    if (coach.on || !R || R.pausedAt || A.S.settings.coached) return;
    coach.on = true; coach.step = 0;
    R.pausedAt = Date.now(); coach.paused = true;
    save();
    setTimeout(function () { if (coach.on) U.coachShow(coach.step); }, 0);
  };
  function coachEnd() {
    if (!coach.on) return;
    coach.on = false;
    A.S.settings.coached = true;
    var R = A.S.run;
    if (R && coach.paused && R.pausedAt) { R.pausedTotal += Date.now() - R.pausedAt; R.pausedAt = null; }
    coach.paused = false;
    save();
    U.coachHide();
    if (R) { startTimer(); U.runTick(A); }
  }
  function coachNext() {
    if (!coach.on) return;
    if (coach.step >= U.COACH_N - 1) { coachEnd(); return; }
    coach.step++;
    U.coachShow(coach.step);
  }

  function undoLap() {
    var R = A.S.run;
    if (!R || !R.laps.length || R.pausedAt) return;
    var l = R.laps.pop();
    save();
    U.toast(l.q + '번을 되돌렸어요. 다시 풀고 누르세요.');
    U.runTick(A);
  }
  function skipSection() {
    var R = A.S.run;
    if (!R || R.pausedAt) return;
    var p = A.runPlan(), done = R.laps.length;
    if (done >= p.N) return;
    var si = L.secOf(p, done), sec = p.secs[si], n = sec.endQ - done;
    askConfirm(sec.name + '의 남은 ' + n + '문항을 못 푼 것으로 넘길까요? 넘긴 문항은 한 문항 되돌리기로 하나씩 살릴 수 있어요.', '넘기기', function () {
      var el = A.runElapsed();
      for (var q = done; q < sec.endQ; q++) R.laps.push({ q: q + 1, sec: si, t: 0, at: el, skip: true });
      save();
      U.toast(sec.name + L.josa(sec.name, '을') + ' 넘겼어요.');
      U.runTick(A);
    });
  }
  function pauseRun() {
    var R = A.S.run;
    if (!R || R.pausedAt) return;
    R.pausedAt = Date.now();
    save();
    $('pause-text').textContent = '시계가 멈췄어요 (' + R.laps.length + '문항 끝냄). 시험장에서는 멈출 수 없으니 연습 때만 쓰세요.';
    U.openLayer('ov-pause');
  }
  function resumeRun() {
    var R = A.S.run;
    if (!R) { U.closeLayer('ov-pause'); return; }
    if (R.pausedAt) { R.pausedTotal += Date.now() - R.pausedAt; R.pausedAt = null; save(); }
    U.closeLayer('ov-pause');
    if (A.ui.screen !== 'run') go('run');
    startTimer();
    U.runTick(A);
  }
  function askFinish() {
    var R = A.S.run;
    if (!R) return;
    var p = A.runPlan(), left = p.N - R.laps.length;
    if (left <= 0) { finishRun('done'); return; }
    askConfirm('아직 ' + left + '문항이 남았어요. 지금 끝내고 채점할까요? 남은 문항은 못 푼 것으로 남아요.', '끝내기', function () { finishRun('quit'); });
  }
  function finishRun(reason) {
    if (coach.on) coachEnd();
    var R = A.S.run;
    if (!R) return;
    var p = L.plan(R), el = A.runElapsed();
    if (R.pausedAt) { R.pausedTotal += Date.now() - R.pausedAt; R.pausedAt = null; el = A.runElapsed(); }
    var grade = [];
    for (var i = 0; i < p.N; i++) grade.push('');
    var s = { id: uid('s'), date: L.toKey(new Date(R.startMs)), startedAt: R.startMs, name: R.name, tplId: R.tplId, total: R.total, reserve: R.reserve,
      sections: R.sections, laps: R.laps, elapsed: Math.min(el, p.total * 1000), ended: reason, grade: grade, reasons: {}, memo: '' };
    A.S.sessions.push(s);
    A.S.run = null;
    stopTimer();
    save();
    U.closeLayer('ov-pause');
    A.ui.view = s.id;
    go('grade');
  }
  function discardRun() {
    askConfirm('풀던 회차를 기록하지 않고 지울까요?', '지우기', function () {
      if (coach.on) coachEnd();
      A.S.run = null; stopTimer(); save();
      U.toast('풀던 회차를 지웠어요.');
      go('home');
    });
  }

  /* ---------- 한 번 더 묻기·되돌리기 ---------- */
  function askConfirm(text, yes, fn) {
    $('confirm-text').textContent = text;
    $('confirm-yes').textContent = yes || '확인';
    A.ui.confirmFn = fn;
    U.openLayer('ov-confirm');
  }
  function withUndo(msg, undoFn) {
    A.ui.undo = undoFn;
    U.toast(msg, '되돌리기');
  }

  /* ---------- 틀 ---------- */
  function openPlan(id) {
    var t = A.findTpl(id);
    if (!t) { U.toast('그 틀을 찾지 못했어요.'); return; }
    A.ui.draft = copyTpl(t);
    setGhost(A.ui.draft);
    U.renderPlan(A);
    U.openLayer('sheet-plan');
  }
  // 같은 이름의 최고 회차가 있으면 처음부터 그 기록과 겨룬다(시작 준비의 칩으로 끌 수 있다)
  function setGhost(d) {
    var b = L.bestOf(A.S.sessions, d.name);
    d.ghostId = b ? b.id : null;
  }
  function readRows() {
    return Array.prototype.map.call(document.querySelectorAll('#tpl-rows .tpl-row'), function (row) {
      var mv = row.querySelector('.r-min').value.trim();
      return { name: row.querySelector('.r-name').value.trim(), count: Number(row.querySelector('.r-count').value), min: mv === '' ? 0 : Number(mv) };
    });
  }
  function openTplForm(t, isNew) {
    A.ui.tplEdit = isNew ? null : t.id;
    U.fillTplForm(t, isNew);
    U.openLayer('sheet-tpl');
  }
  function submitTpl() {
    U.clearErr('form-tpl');
    var t = { name: $('tpl-name').value.trim(), total: Number($('tpl-total').value), reserve: Number($('tpl-reserve').value === '' ? 'x' : $('tpl-reserve').value), sections: readRows() };
    var errs = L.checkTemplate(t);
    if (!errs.length) {
      var dup = A.S.templates.some(function (x) { return x.name === t.name && x.id !== A.ui.tplEdit; });
      if (dup) errs.push({ f: 'name', m: '같은 이름의 내 틀이 있어요.' });
    }
    if (errs.length) {
      var rowMsgs = [];
      errs.forEach(function (e) {
        if (e.f === 'name' || e.f === 'total' || e.f === 'reserve') U.fieldErr('tpl-' + e.f, e.m);
        else {
          rowMsgs.push(e.m);
          if (e.f === 'row') {
            var row = document.querySelectorAll('#tpl-rows .tpl-row')[e.i];
            if (row) Array.prototype.forEach.call(row.querySelectorAll('input'), U.markBad);
          }
        }
      });
      $('tpl-rows-err').textContent = rowMsgs.join(' ');
      return;
    }
    if (A.ui.tplEdit) {
      var cur = null;
      A.S.templates.forEach(function (x) { if (x.id === A.ui.tplEdit) cur = x; });
      if (cur) { cur.name = t.name; cur.total = t.total; cur.reserve = t.reserve; cur.sections = t.sections; }
    } else {
      A.S.templates.push({ id: uid('t'), cat: '내 틀', custom: true, name: t.name, total: t.total, reserve: t.reserve, sections: t.sections });
    }
    save();
    U.closeLayer('sheet-tpl');
    U.toast(A.ui.tplEdit ? '틀을 고쳤어요.' : '내 틀을 만들었어요.');
    if (A.ui.screen === 'exams') { A.ui.cat = '내 틀'; A.ui.examQ = ''; }
    rerender();
  }
  function deleteTpl(id) {
    var i = -1;
    A.S.templates.forEach(function (x, k) { if (x.id === id) i = k; });
    if (i < 0) return;
    var t = A.S.templates[i];
    askConfirm('내 틀 「' + t.name + '」' + L.josa(t.name, '을') + ' 지울까요? 지난 기록은 남아요.', '지우기', function () {
      A.S.templates.splice(i, 1);
      var wasLast = A.S.lastTpl === id;
      if (wasLast) A.S.lastTpl = 'p-g9';
      save();
      rerender();
      withUndo('틀을 지웠어요.', function () {
        A.S.templates.splice(Math.min(i, A.S.templates.length), 0, t);
        if (wasLast) A.S.lastTpl = id;
        save(); rerender(); U.toast('되돌렸어요.');
      });
    });
  }

  /* ---------- 예시 기록 ---------- */
  function addSample() {
    removeSampleNow();
    var tpl = D.PRESETS[0], seed = 20261026;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    var p = L.plan(tpl);
    [-9, -6, -5, -4, -2, -1].forEach(function (off, k) {
      var date = L.addDays(L.today(), off), at = 0, laps = [], grade = [];
      var speed = 1.12 - k * 0.045;
      for (var q = 0; q < p.N; q++) {
        var si = L.secOf(p, q), mul = si === 3 ? 1.25 : si === 0 ? 1.1 : 0.88;
        var base = p.secs[si].per * speed * mul;
        var t = Math.round((base * (0.55 + rnd() * 0.9) + (rnd() < 0.05 ? base * 2 : 0)) * 1000);
        if (at + t > p.usable * 1000 + 240000) break;
        at += t;
        var l = { q: q + 1, sec: si, t: t, at: at };
        if (rnd() < 0.05) l.flag = true;
        laps.push(l);
        var r = rnd();
        grade.push(r < 0.76 + k * 0.02 ? 'o' : r < 0.85 ? 'g' : 'x');
      }
      while (grade.length < p.N) grade.push('x');
      var s = { id: 'sample-' + k, date: date, startedAt: L.fromKey(date).getTime() - 3 * 3600000, name: tpl.name, tplId: tpl.id, total: tpl.total, reserve: tpl.reserve,
        sections: copyTpl(tpl).sections, laps: laps, elapsed: Math.min(p.total * 1000, at + Math.round(rnd() * 180000)),
        ended: laps.length < p.N ? 'time' : 'done', grade: grade, reasons: {}, memo: k === 5 ? '전공 1에서 계산 문항이 오래 걸렸다.' : '', sample: true };
      L.slowest(s, 2).forEach(function (it, i) { s.reasons[it.q] = D.REASONS[(k + i * 3) % D.REASONS.length].id; });
      A.S.sessions.push(s);
    });
    save();
  }
  function removeSampleNow() {
    A.S.sessions = A.S.sessions.filter(function (s) { return !s.sample; });
  }

  /* ---------- 설정 ---------- */
  function applySettings() {
    var st = A.S.settings, h = document.documentElement;
    h.classList.toggle('dark', !!st.dark);
    h.classList.toggle('reduce', !!st.reduce);
    h.classList.toggle('fs-2', st.fs === 2);
    h.classList.toggle('fs-3', st.fs === 3);
  }

  function copyText(text) {
    var ok = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { U.toast('복사했어요.'); }, function () { fallbackCopy(); });
        return;
      }
    } catch (e) { ok = false; }
    fallbackCopy();
    function fallbackCopy() {
      var ta = $('export-text');
      try { ta.removeAttribute('readonly'); ta.select(); ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      ta.setAttribute('readonly', '');
      U.toast(ok ? '복사했어요.' : '글을 길게 눌러 직접 복사해 주세요.');
    }
  }

  /* ---------- 누름 ---------- */
  var ACTS = {
    go: function (b) { go(b.getAttribute('data-to')); },
    close: function (b) {
      var layer = b.closest('.layer');
      if (layer) U.closeLayer(layer.id);
    },
    undo: function () { var f = A.ui.undo; A.ui.undo = null; U.hideToast(); if (f) f(); },
    'confirm-yes': function () { var f = A.ui.confirmFn; A.ui.confirmFn = null; U.closeLayer('ov-confirm'); if (f) f(); },
    'confirm-no': function () { A.ui.confirmFn = null; U.closeLayer('ov-confirm'); },
    'welcome-start': function () { A.S.settings.welcomed = true; save(); U.closeLayer('ov-welcome'); go('exams'); },
    'welcome-try': function () { A.S.settings.welcomed = true; save(); U.closeLayer('ov-welcome'); startTrial(); },
    'coach-next': coachNext,
    'coach-skip': coachEnd,
    'welcome-sample': function () { A.S.settings.welcomed = true; addSample(); U.closeLayer('ov-welcome'); go('log'); U.toast('예시 기록 6회를 넣었어요. 더보기에서 뺄 수 있어요.'); },

    cat: function (b) { A.ui.cat = b.getAttribute('data-c'); U.renderExams(A); },
    'exam-reset': function () { A.ui.cat = '전체'; A.ui.examQ = ''; U.renderExams(A); },
    'open-plan': function (b) { openPlan(b.getAttribute('data-id')); },
    'plan-move': function (b) {
      var d = A.ui.draft, i = +b.getAttribute('data-i'), j = i + (+b.getAttribute('data-d'));
      if (!d || j < 0 || j >= d.sections.length) return;
      var t = d.sections[i]; d.sections[i] = d.sections[j]; d.sections[j] = t;
      U.renderPlan(A);
    },
    'plan-reserve': function (b) {
      var d = A.ui.draft;
      if (!d) return;
      d.reserve = Math.max(0, Math.min(30, d.total - 1, d.reserve + (+b.getAttribute('data-d'))));
      U.renderPlan(A);
    },
    'plan-save': function () {
      var d = A.ui.draft;
      if (!d) return;
      if (d.custom) {
        A.S.templates.forEach(function (x) { if (x.id === d.id) { x.sections = copyTpl(d).sections; x.reserve = d.reserve; } });
        save(); U.toast('내 틀에 이 순서를 저장했어요.');
      } else {
        var name = (d.name + ' (내 순서)').slice(0, 30), n = 2;
        while (A.S.templates.some(function (x) { return x.name === name; })) name = (d.name.slice(0, 24) + ' (내 순서 ' + n++ + ')');
        var t = { id: uid('t'), cat: '내 틀', custom: true, name: name, total: d.total, reserve: d.reserve, sections: copyTpl(d).sections };
        A.S.templates.push(t);
        d.id = t.id; d.custom = true; d.name = name;
        save(); U.renderPlan(A); U.toast('「' + name + '」 로 내 틀에 저장했어요.');
      }
    },
    'plan-ghost': function () {
      var d = A.ui.draft;
      if (!d) return;
      var b = L.bestOf(A.S.sessions, d.name);
      d.ghostId = d.ghostId || !b ? null : b.id;
      U.renderPlan(A);
    },
    'plan-start': function () { var d = A.ui.draft; if (!d) return; U.closeLayer('sheet-plan'); startRun(d); },

    'tpl-new': function () { openTplForm({ name: '', total: 60, reserve: 5, sections: [{ name: '', count: 20, min: 0 }] }, true); },
    'tpl-edit': function (b) { var t = A.findTpl(b.getAttribute('data-id')); if (t) openTplForm(copyTpl(t), false); },
    'tpl-copy': function (b) {
      var t = A.findTpl(b.getAttribute('data-id'));
      if (!t) return;
      var c = copyTpl(t); c.name = (t.name + ' (내 틀)').slice(0, 30);
      openTplForm(c, true);
    },
    'tpl-del': function (b) { deleteTpl(b.getAttribute('data-id')); },
    'tpl-row-add': function () {
      var rows = readRows();
      if (rows.length >= 12) { $('tpl-rows-err').textContent = '과목은 12개까지예요.'; return; }
      rows.push({ name: '', count: 10, min: 0 });
      U.renderTplRows(rows);
      var ins = document.querySelectorAll('#tpl-rows .r-name');
      if (ins.length) ins[ins.length - 1].focus();
    },
    'tpl-row-del': function (b) {
      var rows = readRows(), i = +b.getAttribute('data-i');
      if (rows.length <= 1) { $('tpl-rows-err').textContent = '과목은 하나 넘게 있어야 해요.'; return; }
      rows.splice(i, 1);
      U.renderTplRows(rows);
      $('tpl-rows-err').textContent = '';
    },

    lap: function () { lap(false); },
    'lap-flag': function () { lap(true); },
    'lap-undo': undoLap,
    'skip-sec': skipSection,
    'run-pause': pauseRun,
    'run-resume': resumeRun,
    'run-finish': function () {
      if (A.S.run && A.S.run.pausedAt) { U.closeLayer('ov-pause'); resumeRun(); }
      askFinish();
    },
    'run-open': function () {
      if (!A.S.run) return;
      go('run'); startTimer();
      if (A.S.run.pausedAt) pauseRunShow();
    },
    'run-discard': discardRun,

    'g-cycle': function (b) {
      var s = findSession(A.ui.view), q = +b.getAttribute('data-q');
      if (!s || !q) return;
      var v = s.grade[q - 1] || '';
      s.grade[q - 1] = v === '' ? 'o' : v === 'o' ? 'x' : v === 'x' ? 'g' : '';
      save();
      U.updateGq(A, s, q);
    },
    'g-all': function () {
      var s = findSession(A.ui.view);
      if (!s) return;
      var solved = {};
      s.laps.forEach(function (l) { if (!l.skip) solved[l.q] = true; });
      for (var i = 0; i < s.grade.length; i++) if (!s.grade[i]) s.grade[i] = solved[i + 1] ? 'o' : 'x';
      save(); U.renderGrade(A, s);
      U.toast('남은 문항을 맞음으로 채웠어요. 못 푼 문항은 틀림이에요.');
    },
    'g-clear': function () {
      var s = findSession(A.ui.view);
      if (!s) return;
      askConfirm('채점한 것을 모두 비울까요?', '비우기', function () {
        var old = s.grade.slice();
        for (var i = 0; i < s.grade.length; i++) s.grade[i] = '';
        save(); U.renderGrade(A, s);
        withUndo('채점을 비웠어요.', function () { s.grade = old; save(); U.renderGrade(A, s); });
      });
    },
    'g-skip': function () { go('result'); },
    'g-save': function () { go('result'); U.toast('채점을 저장했어요.'); U.flash($('res-head')); },
    'open-grade': function (b) { A.ui.view = b.getAttribute('data-id'); go('grade'); },
    'open-session': function (b) { A.ui.view = b.getAttribute('data-id'); go('result'); },
    reason: function (b) {
      var s = findSession(A.ui.view);
      if (!s) return;
      var q = b.getAttribute('data-q'), r = b.getAttribute('data-r');
      s.reasons = s.reasons || {};
      if (s.reasons[q] === r) delete s.reasons[q]; else s.reasons[q] = r;
      save();
      var group = b.parentNode;
      Array.prototype.forEach.call(group.querySelectorAll('.chip'), function (c) { c.setAttribute('aria-pressed', String(s.reasons[q] === c.getAttribute('data-r'))); });
      // 고르면 목록을 접고 고른 이유 하나만 남긴다
      var item = group.parentNode, pick = item.querySelector('.reason-pick'), open = item.querySelector('[data-act="reason-open"]');
      if (pick) {
        var tmp = document.createElement('div');
        tmp.innerHTML = U.reasonPicked(s.reasons[q] || '');
        pick.replaceChild(tmp.firstChild, pick.querySelector('.reason-now'));
      }
      group.hidden = true;
      if (open) { open.textContent = s.reasons[q] ? '이유 바꾸기' : '이유 붙이기'; open.setAttribute('aria-expanded', 'false'); open.focus(); }
      U.toast(s.reasons[q] ? q + '번 이유를 남겼어요.' : q + '번 이유를 뺐어요.');
    },
    'reason-open': function (b) {
      var group = $('reason-' + b.getAttribute('data-q'));
      if (!group) return;
      var on = group.hidden;
      group.hidden = !on;
      b.setAttribute('aria-expanded', String(on));
      b.textContent = on ? '접기' : (group.querySelector('[aria-pressed="true"]') ? '이유 바꾸기' : '이유 붙이기');
      if (on) { var f = group.querySelector('[aria-pressed="true"]') || group.querySelector('.chip'); if (f) f.focus(); }
    },
    'sess-del': function (b) {
      var id = b.getAttribute('data-id'), s = findSession(id);
      if (!s) return;
      askConfirm(L.dayLabel(s.date) + ' 「' + s.name + '」 기록을 지울까요?', '지우기', function () {
        var i = A.S.sessions.indexOf(s);
        A.S.sessions.splice(i, 1);
        save();
        go('log');
        withUndo('기록을 지웠어요.', function () { A.S.sessions.splice(Math.min(i, A.S.sessions.length), 0, s); save(); rerender(); U.toast('되돌렸어요.'); });
      });
    },
    again: function (b) {
      var s = findSession(b.getAttribute('data-id'));
      if (!s) return;
      if (A.findTpl(s.tplId)) { openPlan(s.tplId); return; }
      A.ui.draft = { id: s.tplId, cat: '내 틀', custom: false, name: s.name, total: s.total, reserve: s.reserve, sections: copyTpl(s).sections };
      setGhost(A.ui.draft);
      U.renderPlan(A);
      U.openLayer('sheet-plan');
    },

    'log-filter': function (b) { A.ui.logName = b.getAttribute('data-n'); U.renderLog(A); },
    'log-sort': function (b) { A.ui.logSort = b.getAttribute('data-s'); U.renderLog(A); },
    print: function () { if (A.ui.screen !== 'log') go('log'); try { window.print(); } catch (e) { U.toast('이 브라우저에서는 인쇄할 수 없어요.'); } },

    set: function (b) {
      var k = b.getAttribute('data-k');
      A.S.settings[k] = !A.S.settings[k];
      save(); applySettings(); U.renderMore(A);
      U.toast(A.S.settings[k] ? '켰어요.' : '껐어요.');
    },
    'set-fs': function (b) { A.S.settings.fs = +b.getAttribute('data-v'); save(); applySettings(); U.renderMore(A); },
    'set-warn': function (b) { A.S.settings.warnMin = +b.getAttribute('data-v'); save(); U.renderMore(A); },
    'open-backup': function () {
      $('export-text').value = window.Store.exportText(A.S);
      $('restore-text').value = '';
      U.clearErr('form-backup');
      U.openLayer('sheet-backup');
    },
    'copy-export': function () { copyText($('export-text').value); },
    'sample-add': function () { addSample(); rerender(); U.toast('예시 기록 6회를 넣었어요. 더보기에서 뺄 수 있어요.'); },
    'sample-remove': function () {
      askConfirm('예시 기록을 모두 뺄까요? 직접 푼 기록은 남아요.', '빼기', function () { removeSampleNow(); save(); rerender(); U.toast('예시 기록을 뺐어요.'); });
    },
    'clear-all': function () {
      askConfirm('내 틀과 모든 기록, 설정을 지울까요? 되돌릴 수 없어요. 먼저 내보내기를 해 두세요.', '전체 지우기', function () {
        window.Store.clear();
        stopTimer();
        A.S = window.Store.blank();
        A.S.settings.welcomed = true;
        save(); applySettings(); rerender();
        U.toast('모두 지웠어요.');
      });
    },
    'self-test': function () { U.renderTests(L.selfTest()); }
  };
  function pauseRunShow() {
    $('pause-text').textContent = '시계가 멈춰 있어요 (' + A.S.run.laps.length + '문항 끝냄). 이어 풀기를 누르면 다시 흘러요.';
    U.openLayer('ov-pause');
  }

  function onClick(e) {
    var b = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!b || b.disabled) return;
    var fn = ACTS[b.getAttribute('data-act')];
    if (fn) fn(b, e);
  }

  function onSubmit(e) {
    var f = e.target;
    if (!f || !f.id) return;
    e.preventDefault();
    if (f.id === 'form-tpl') submitTpl();
    else if (f.id === 'form-backup') {
      U.clearErr('form-backup');
      var r = window.Store.parseImport($('restore-text').value);
      if (!r.ok) { U.fieldErr('restore-text', r.why); return; }
      askConfirm('지금 기록을 붙여 넣은 내용(내 틀 ' + r.data.templates.length + '개, 회차 ' + r.data.sessions.length + '개)으로 바꿀까요?', '바꾸기', function () {
        var old = A.S;
        r.data.settings.welcomed = true;
        A.S = r.data;
        stopTimer();
        save(); applySettings();
        U.closeLayer('sheet-backup');
        rerender();
        withUndo('되살렸어요.', function () { A.S = old; save(); applySettings(); rerender(); U.toast('되돌렸어요.'); });
      });
    } else if (f.id === 'form-wrong') {
      U.clearErr('form-wrong');
      var s = findSession(A.ui.view);
      if (!s) return;
      var txt = $('wrong-nums').value;
      if (!txt.trim()) { U.fieldErr('wrong-nums', '틀린 번호를 적어 주세요. 예: 3, 7, 12-14'); return; }
      var res = L.parseNums(txt, s.grade.length);
      if (res.bad.length) { U.fieldErr('wrong-nums', '읽지 못한 번호: ' + res.bad.slice(0, 3).join(', ') + ' (1~' + s.grade.length + ' 사이 숫자만)'); return; }
      res.nums.forEach(function (n) { s.grade[n - 1] = 'x'; });
      save(); U.renderGrade(A, s);
      U.toast(res.nums.length + '문항을 틀림으로 표시했어요.');
    } else if (f.id === 'form-memo') {
      U.clearErr('form-memo');
      var m = findSession(A.ui.view);
      if (!m) return;
      var v = $('memo-text').value.trim();
      if (v.length > 200) { U.fieldErr('memo-text', '메모는 200자까지예요. 지금 ' + v.length + '자예요.'); return; }
      m.memo = v;
      save();
      U.toast(v ? '메모를 저장했어요.' : '메모를 비웠어요.');
    }
  }

  function onKey(e) {
    var tag = e.target && e.target.tagName;
    var typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if (e.key === 'Escape') {
      if (coach.on && !U.topLayer()) { coachEnd(); return; }
      var top = U.topLayer();
      if (!top) return;
      if (top === 'ov-welcome') { A.S.settings.welcomed = true; save(); }
      if (top === 'ov-pause') { resumeRun(); return; }
      if (top === 'ov-confirm') A.ui.confirmFn = null;
      U.closeLayer(top);
      return;
    }
    if (A.ui.screen === 'run' && !U.topLayer() && !typing && tag !== 'BUTTON' && (e.key === ' ' || e.key === 'n' || e.key === 'N')) {
      e.preventDefault();
      lap(false);
    }
  }

  function onInput(e) {
    if (e.target && e.target.id === 'exam-q') {
      var v = e.target.value;
      if (v.length > 30) { U.fieldErr('exam-q', '30자까지 찾을 수 있어요.'); return; }
      A.ui.examQ = v;
      U.renderExamList(A);
    }
  }

  function onVisible() {
    if (document.visibilityState !== 'visible' || !A.S) return;
    if (A.S.run && !A.S.run.pausedAt) tick();
  }

  /* ---------- 시작 ---------- */
  function init() {
    var r = window.Store.load();
    A.S = r.data;
    applySettings();
    if (!r.ok) { var w = $('store-warn'); w.textContent = r.why; w.hidden = false; w.dataset.keep = '1'; }
    // 오래 두었던 풀이가 제한 시간을 넘겼으면 시간 끝으로 저장한다
    if (A.S.run) {
      var p = L.plan(A.S.run);
      if (!A.S.run.pausedAt && A.runElapsed() / 1000 >= p.total) {
        finishRun('time');
        U.toast('지난번 풀던 회차를 시간 끝으로 저장했어요.');
      } else { go('home'); startTimer(); }
    } else go('home');
    document.addEventListener('click', onClick);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('keydown', onKey);
    document.addEventListener('input', onInput);
    document.addEventListener('pointerdown', initAudio, { once: true });
    document.addEventListener('visibilitychange', onVisible);
    if (!A.S.settings.welcomed) U.openLayer('ov-welcome');
  }
  init();
})();
