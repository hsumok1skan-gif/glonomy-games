/* Ward Rhythm — 상태·동작 (누르기·입력·저장을 받아 데이터를 바꾸고 다시 그린다) */
var App = (function () {
  var L = Logic, $ = UI.$;
  var S = null, cur = 'today', undoSnap = null, pendingConfirm = null, audio = null;
  var V = {
    ry: 0, rm: 0, ly: 0, lm: 0, brush: 'view', planQ: '', planF: 'up', planS: 'date',
    quick: { date: '', start: '19:00', dur: 120 }, tip: 0, tests: null
  };
  var dayE = null, planE = null, sleepE = null, patE = null;

  function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function ym(date) { var d = L.parse(date); return [d.getFullYear(), d.getMonth() + 1]; }

  /* ---------- 저장 ---------- */
  function save() {
    if (!Store.save(S)) {
      warn('저장하지 못했어요. 이 브라우저가 저장을 막았거나 공간이 모자라요. 내보내기로 기록을 남겨 두세요.');
      UI.toast('저장하지 못했어요', 'bad');
      return false;
    }
    return true;
  }
  function warn(msg) { var w = $('store-warn'); w.textContent = msg; w.hidden = !msg; }
  function setUndo() { undoSnap = Store.clone(S); }
  function undo() {
    if (!undoSnap) { UI.toast('되돌릴 것이 없어요'); return; }
    S = undoSnap; undoSnap = null;
    save(); applyLook(); UI.closeSheet(); render();
    UI.toast('되돌렸어요');
  }

  /* ---------- 소리 (첫 터치 뒤에만) ---------- */
  function unlockAudio() {
    if (audio) return;
    try { var C = window.AudioContext || window.webkitAudioContext; if (C) audio = new C(); } catch (e) { audio = null; }
  }
  function beep(kind) {
    if (!S.set.sound || !audio) return;
    try {
      var o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
      o.type = 'sine';
      o.frequency.setValueAtTime(kind === 'bad' ? 220 : 660, t);
      if (kind !== 'bad') o.frequency.linearRampToValueAtTime(880, t + 0.08);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g); g.connect(audio.destination);
      o.start(t); o.stop(t + 0.2);
    } catch (e) { /* 소리가 안 나도 된다 */ }
  }
  function done(msg, undoable) { UI.toast(msg, 'ok', undoable); beep('ok'); }
  function fail(inputId, msg) { UI.fieldErr(inputId, msg); beep('bad'); }

  /* ---------- 보기 ---------- */
  function applyLook() {
    document.body.classList.toggle('dark', !!S.set.dark);
    document.body.classList.toggle('big', !!S.set.big);
    var reduce = false;
    try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { reduce = false; }
    UI.setCalm(S.set.calm || reduce);
  }
  function render() {
    if (cur === 'today') UI.renderToday(S, V);
    else if (cur === 'roster') UI.renderRoster(S, V);
    else if (cur === 'plans') UI.renderPlans(S, V);
    else if (cur === 'log') UI.renderLog(S, V);
    else if (cur === 'more') UI.renderMore(S, V);
    else UI.renderHelp();
  }
  function go(name) {
    cur = name;
    render();
    UI.show(name);
  }

  /* ---------- 확인 창 ---------- */
  function askConfirm(text, okLabel, fn) {
    pendingConfirm = fn;
    $('confirm-text').textContent = text;
    $('confirm-ok').textContent = okLabel;
    UI.openOverlay('ov-confirm');
  }

  /* ---------- 시트 열기 ---------- */
  function openDay(date) {
    var n = S.notes[date] || { chips: [], text: '' };
    dayE = { date: date, chips: (n.chips || []).slice(), text: n.text || '' };
    UI.openSheet('sheet-day', UI.dayHtml(S, date, dayE));
  }
  function refreshDay() { if (dayE && UI.sheetOpen() === 'sheet-day') UI.refreshSheet(UI.dayHtml(S, dayE.date, dayE)); }
  function openPlan(p, preset) {
    if (p) planE = { id: p.id, kind: p.kind, title: p.title, date: p.date, start: p.start, dur: p.dur, memo: p.memo || '' };
    else {
      preset = preset || {};
      var k = UI.kindOf(preset.kind || 'meal');
      planE = { id: null, kind: k.id, title: '', date: preset.date || L.today(), start: preset.start || '19:00', dur: preset.dur || k.dur, memo: '' };
    }
    UI.openSheet('sheet-plan', UI.planHtml(S, planE));
    var row = document.querySelector('#form-plan .kinds'), on = row && row.querySelector('.chip.on');
    if (on) row.scrollLeft = Math.max(0, on.offsetLeft - row.offsetLeft - 16);
  }
  function openSleep(s) {
    if (s) sleepE = { id: s.id, date: s.date, bed: s.bed, wake: s.wake, q: s.q || 3, chips: (s.chips || []).slice() };
    else {
      var t = L.today(), sl = L.sleepFor(S, t);
      sleepE = { id: null, date: t, bed: L.clock(sl.bed), wake: L.clock(sl.wake), q: 3, chips: [] };
    }
    UI.openSheet('sheet-sleep', UI.sleepHtml(S, sleepE));
  }
  function findPlan(id) { for (var i = 0; i < S.plans.length; i++) if (S.plans[i].id === id) return S.plans[i]; return null; }
  function findSleep(id) { for (var i = 0; i < S.sleeps.length; i++) if (S.sleeps[i].id === id) return S.sleeps[i]; return null; }

  /* ---------- 예시 ---------- */
  function addSample() {
    var t = L.today(), from = L.addDays(t, -10), seq = DATA.PATTERNS[0].seq, rec = { dates: [], plans: [], sleeps: [], notes: [] };
    for (var i = 0; i < 48; i++) {
      var d = L.addDays(from, i);
      if (!S.roster[d]) { S.roster[d] = seq[i % seq.length]; rec.dates.push(d); }
    }
    [[1, '19:00', 'meal', '동기 저녁'], [3, '10:00', 'dental', '치과 정기 검진'], [5, '21:00', 'peers', '동기 모임 2차'], [8, '13:00', 'hair', '뿌리 염색']].forEach(function (x) {
      var k = UI.kindOf(x[2]), p = { id: uid('p'), kind: k.id, title: x[3], date: L.addDays(t, x[0]), start: x[1], dur: k.dur, memo: '' };
      S.plans.push(p); rec.plans.push(p.id);
    });
    [['23:40', '06:10', 3, ['늦게 잠듦']], ['08:50', '15:20', 2, ['자주 깸', '암막 커튼']], ['00:30', '08:00', 4, ['깊게 잠']], ['22:10', '05:20', 3, []], ['01:10', '07:40', 4, ['운동 함']]].forEach(function (x, i) {
      var s = { id: uid('s'), date: L.addDays(t, -5 + i), bed: x[0], wake: x[1], q: x[2], chips: x[3] };
      S.sleeps.push(s); rec.sleeps.push(s.id);
    });
    [[-2, ['인계 길었음', '늦게 퇴근'], ''], [-4, ['입원 많음'], '쉬는 시간 없이 바빴음']].forEach(function (x) {
      var d = L.addDays(t, x[0]);
      if (!S.notes[d]) { S.notes[d] = { chips: x[1], text: x[2] }; rec.notes.push(d); }
    });
    S.sample = rec;
    save();
  }
  function removeSample() {
    var r = S.sample;
    if (!r) return;
    r.dates.forEach(function (d) { delete S.roster[d]; });
    r.notes.forEach(function (d) { delete S.notes[d]; });
    S.plans = S.plans.filter(function (p) { return r.plans.indexOf(p.id) < 0; });
    S.sleeps = S.sleeps.filter(function (s) { return r.sleeps.indexOf(s.id) < 0; });
    S.sample = null;
    save();
  }

  /* ---------- 복사 ---------- */
  function copyFrom(id) {
    var ta = $(id);
    if (!ta) return;
    var txt = ta.value;
    function fallback() {
      try {
        ta.removeAttribute('readonly'); ta.select();
        var ok = document.execCommand('copy');
        ta.setAttribute('readonly', '');
        if (ok) done('복사했어요'); else UI.toast('복사가 막혔어요. 글을 길게 눌러 복사해 주세요', 'bad');
      } catch (e) { UI.toast('복사가 막혔어요. 글을 길게 눌러 복사해 주세요', 'bad'); }
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function () { done('복사했어요'); }, fallback);
        return;
      }
    } catch (e) { /* 아래로 */ }
    fallback();
  }

  /* ---------- 누르기 ---------- */
  var ACT = {
    'go': function (el) { UI.closeSheet(); go(el.getAttribute('data-to')); },
    'month': function (el) {
      var d = +el.getAttribute('data-d'), w = el.getAttribute('data-which');
      if (w === 'roster') { V.rm += d; if (V.rm < 1) { V.rm = 12; V.ry--; } if (V.rm > 12) { V.rm = 1; V.ry++; } }
      else { V.lm += d; if (V.lm < 1) { V.lm = 12; V.ly--; } if (V.lm > 12) { V.lm = 1; V.ly++; } }
      render();
    },
    'brush': function (el) { V.brush = el.getAttribute('data-id'); render(); },
    'cell': function (el) {
      var d = el.getAttribute('data-date');
      if (V.brush === 'view') { openDay(d); return; }
      var had = S.roster[d];
      if (V.brush === 'erase' && !had) return;
      // 찍힌 칸을 지우거나 바꿀 때만 되돌리기를 남긴다. 빈 칸 찍기는 지난 되돌리기를 끊는다
      if (had) setUndo(); else undoSnap = null;
      if (V.brush === 'erase' || had === V.brush) delete S.roster[d];
      else S.roster[d] = V.brush;
      save(); render();
      UI.flash('#roster-grid [data-date="' + d + '"]');
      if (had) done(d.slice(5).replace('-', '/') + (S.roster[d] ? ' 근무를 바꿨어요' : ' 근무를 지웠어요'), true);
    },
    'day-open': function (el) { openDay(el.getAttribute('data-date')); },
    'day-move': function (el) { if (dayE) openDay(L.addDays(dayE.date, +el.getAttribute('data-d'))); },
    'day-set': function (el) {
      if (!dayE) return;
      var id = el.getAttribute('data-id'), had = S.roster[dayE.date];
      if ((had || '') === (id || '')) return;
      if (had) setUndo(); else undoSnap = null;
      if (id) S.roster[dayE.date] = id; else delete S.roster[dayE.date];
      save(); refreshDay(); render();
      UI.flash('#sheet-day .kv');
      if (had) done(id ? '근무를 바꿨어요' : '근무를 비웠어요', true);
    },
    'day-chip': function (el) {
      var c = el.getAttribute('data-chip'), i = dayE.chips.indexOf(c);
      if (i >= 0) dayE.chips.splice(i, 1); else dayE.chips.push(c);
      el.classList.toggle('on', i < 0); el.setAttribute('aria-pressed', String(i < 0));
    },
    'plan-new': function (el) { openPlan(null, { date: el.getAttribute('data-date') || L.today() }); },
    'plan-open': function (el) { var p = findPlan(el.getAttribute('data-id')); if (p) openPlan(p); },
    'plan-kind': function (el) {
      var k = UI.kindOf(el.getAttribute('data-id'));
      readPlanForm();
      var oldK = UI.kindOf(planE.kind);
      if (+planE.dur === oldK.dur) planE.dur = k.dur;
      planE.kind = k.id;
      var row = el.parentNode, x = row ? row.scrollLeft : 0;
      UI.refreshSheet(UI.planHtml(S, planE));
      var nrow = document.querySelector('#form-plan .kinds');
      if (nrow) nrow.scrollLeft = x;
    },
    'plan-del': function (el) {
      var id = el.getAttribute('data-id');
      askConfirm('이 약속을 지울까요?', '지우기', function () {
        setUndo();
        S.plans = S.plans.filter(function (p) { return p.id !== id; });
        save(); UI.closeSheet(); render();
        done('약속을 지웠어요', true);
      });
    },
    'plan-filter': function (el) { V.planF = el.getAttribute('data-f'); if (cur !== 'plans') go('plans'); else render(); },
    'plan-sort': function (el) { V.planS = el.getAttribute('data-s'); render(); },
    'sleep-new': function () { openSleep(null); },
    'sleep-open': function (el) { var s = findSleep(el.getAttribute('data-id')); if (s) openSleep(s); },
    'sleep-q': function (el) { readSleepForm(); sleepE.q = +el.getAttribute('data-v'); UI.refreshSheet(UI.sleepHtml(S, sleepE)); },
    'sleep-chip': function (el) {
      var c = el.getAttribute('data-chip'), i = sleepE.chips.indexOf(c);
      if (i >= 0) sleepE.chips.splice(i, 1); else sleepE.chips.push(c);
      el.classList.toggle('on', i < 0); el.setAttribute('aria-pressed', String(i < 0));
    },
    'sleep-del': function (el) {
      var id = el.getAttribute('data-id');
      askConfirm('이 잠 기록을 지울까요?', '지우기', function () {
        setUndo();
        S.sleeps = S.sleeps.filter(function (s) { return s.id !== id; });
        save(); UI.closeSheet(); render();
        done('잠 기록을 지웠어요', true);
      });
    },
    'open-pattern': function () {
      patE = { i: patE ? patE.i : 0, start: L.monthKey(V.ry, V.rm) + '-01', days: L.monthDays(V.ry, V.rm) };
      UI.openSheet('sheet-pattern', UI.patternHtml(S, patE));
    },
    'pattern-pick': function (el) { readPatternForm(); patE.i = +el.getAttribute('data-i'); UI.refreshSheet(UI.patternHtml(S, patE)); },
    'open-shifts': function () { UI.openSheet('sheet-shifts', UI.shiftsHtml(S)); },
    'shifts-reset': function () {
      askConfirm('근무 시각을 기본으로 되돌릴까요?', '되돌리기', function () {
        setUndo();
        S.shifts = Store.clone(DATA.SHIFT_TYPES);
        save(); UI.refreshSheet(UI.shiftsHtml(S)); render();
        done('기본 시각으로 바꿨어요', true);
      });
    },
    'open-share': function () { UI.openSheet('sheet-share', UI.shareHtml(S, V)); },
    'open-backup': function () { UI.openSheet('sheet-backup', UI.backupHtml(S)); },
    'copy': function (el) { copyFrom(el.getAttribute('data-from')); },
    /* 인쇄: 지금 보는 화면(근무표·기록)을 종이 한 장으로. 모양은 style.css @media print */
    'print': function () {
      UI.closeSheet();
      $('toast').hidden = true;
      $('print-stamp').textContent = (cur === 'log' ? V.ly + '년 ' + V.lm + '월 기록' : V.ry + '년 ' + V.rm + '월 근무표') + ' · ' + L.md(L.today()) + ' 뽑음';
      if (typeof window.print !== 'function') { UI.toast('이 브라우저에서는 인쇄를 열 수 없어요. 브라우저 메뉴의 인쇄를 써 주세요', 'bad'); return; }
      try { window.print(); } catch (e) { UI.toast('인쇄를 열지 못했어요. 브라우저 메뉴의 인쇄를 써 주세요', 'bad'); }
    },
    'clear-month': function () {
      var key = L.monthKey(V.ry, V.rm);
      askConfirm(V.ry + '년 ' + V.rm + '월 근무표와 근무 메모를 모두 지울까요?', '지우기', function () {
        setUndo();
        Object.keys(S.roster).forEach(function (d) { if (d.indexOf(key) === 0) delete S.roster[d]; });
        Object.keys(S.notes).forEach(function (d) { if (d.indexOf(key) === 0) delete S.notes[d]; });
        save(); render();
        done('이 달을 지웠어요', true);
      });
    },
    'look': function (el) {
      var k = el.getAttribute('data-k');
      S.set[k] = !S.set[k];
      applyLook(); save(); render();
      done(S.set[k] ? '켰어요' : '껐어요');
    },
    'sample-add': function () { setUndo(); addSample(); render(); done('예시를 넣었어요. 더보기에서 뺄 수 있어요', true); },
    'sample-remove': function () {
      askConfirm('예시로 넣은 근무·약속·잠 기록을 뺄까요? 직접 넣은 것은 남아요.', '빼기', function () {
        setUndo(); removeSample(); render(); done('예시를 뺐어요', true);
      });
    },
    'clear-all': function () {
      askConfirm('근무표·메모·약속·잠 기록·설정을 모두 지울까요? 되돌리기는 이 화면을 떠나기 전까지만 돼요.', '모두 지우기', function () {
        setUndo();
        S = Store.defaults(); S.welcomed = true;
        Store.clear(); save(); applyLook(); render();
        done('모두 지웠어요', true);
      });
    },
    'self-test': function () {
      V.tests = L.selfTest();
      $('test-out').innerHTML = UI.testsHtml(V.tests);
      UI.flash('#test-out');
    },
    'tip-next': function () {
      V.tip = (V.tip + 1) % DATA.TIPS.length;
      var el = $('tip-text');
      if (el) { el.textContent = DATA.TIPS[V.tip]; UI.flash('#tip-text'); }
    },
    'welcome-sample': function () { S.welcomed = true; addSample(); UI.closeOverlay('ov-welcome'); go('today'); done('예시를 넣었어요. 더보기에서 뺄 수 있어요'); },
    'welcome-start': function () { S.welcomed = true; save(); UI.closeOverlay('ov-welcome'); V.brush = 'D'; go('roster'); },
    'confirm-ok': function () { var fn = pendingConfirm; pendingConfirm = null; UI.closeOverlay('ov-confirm'); if (fn) fn(); },
    'confirm-cancel': function () { pendingConfirm = null; UI.closeOverlay('ov-confirm'); },
    'close-sheet': function () { UI.closeSheet(); },
    'undo': function () { undo(); }
  };

  /* ---------- 폼 읽기 ---------- */
  function val(id) { var el = $(id); return el ? el.value : ''; }
  function readPlanForm() {
    if (!planE || !$('p-title')) return;
    planE.title = val('p-title'); planE.date = val('p-date'); planE.start = val('p-start'); planE.dur = val('p-dur'); planE.memo = val('p-memo');
  }
  function readSleepForm() {
    if (!sleepE || !$('s-date')) return;
    sleepE.date = val('s-date'); sleepE.bed = val('s-bed'); sleepE.wake = val('s-wake');
  }
  function readPatternForm() {
    if (!patE || !$('pt-start')) return;
    patE.start = val('pt-start'); patE.days = val('pt-days');
  }

  /* ---------- 제출 ---------- */
  var FORM = {
    'form-quick': function () {
      var q = V.quick, e = UI.quickErr(q);
      if (e) { fail(L.validDate(q.date) ? (L.validHM(q.start) ? 'q-dur' : 'q-start') : 'q-date', e); var b = $('q-date-err'); if (b) b.textContent = e; return; }
      openPlan(null, { date: q.date, start: q.start, dur: +q.dur });
    },
    'form-plan': function () {
      readPlanForm();
      var e;
      if ((e = L.checkText(planE.title, 40, '이름', false))) return fail('p-title', e);
      if (!L.validDate(planE.date)) return fail('p-date', '날짜를 골라 주세요');
      if (!L.validHM(planE.start)) { $('p-date-err').textContent = '시작 시각을 넣어 주세요'; return fail('p-start', '시작 시각을 넣어 주세요'); }
      if ((e = L.checkNum(planE.dur, 10, 1440, '길이'))) { $('p-date-err').textContent = e; return fail('p-dur', e); }
      if ((e = L.checkText(planE.memo, 100, '메모', false))) return fail('p-memo', e);
      var p = { id: planE.id || uid('p'), kind: planE.kind, title: planE.title.trim(), date: planE.date, start: planE.start, dur: Math.round(+planE.dur), memo: planE.memo.trim() };
      setUndo();
      if (planE.id) { S.plans = S.plans.map(function (x) { return x.id === p.id ? p : x; }); }
      else S.plans.push(p);
      if (!save()) return;
      var v = L.planCheck(S, p.date, p.start, p.dur);
      UI.closeSheet(); render();
      done((planE.id ? '약속을 고쳤어요 — ' : '약속을 남겼어요 — ') + L.LEVEL_NAME[v.level], true);
    },
    'form-day': function () {
      dayE.text = val('day-text');
      var e = L.checkText(dayE.text, 60, '메모', false);
      if (e) return fail('day-text', e);
      var hadNote = !!S.notes[dayE.date];
      setUndo();
      if (!dayE.chips.length && !dayE.text.trim()) delete S.notes[dayE.date];
      else S.notes[dayE.date] = { chips: dayE.chips.slice(), text: dayE.text.trim() };
      if (!save()) return;
      render();
      done(!S.notes[dayE.date] ? '메모를 지웠어요' : hadNote ? '메모를 고쳤어요' : '메모를 남겼어요', true);
    },
    'form-sleep': function () {
      readSleepForm();
      if (!L.validDate(sleepE.date)) { $('s-date-err').textContent = '일어난 날을 골라 주세요'; return fail('s-date', '일어난 날을 골라 주세요'); }
      if (sleepE.date > L.today()) { $('s-date-err').textContent = '앞날의 잠은 남길 수 없어요'; return fail('s-date', '앞날의 잠은 남길 수 없어요'); }
      if (!L.validHM(sleepE.bed)) { $('s-date-err').textContent = '누운 시각을 넣어 주세요'; return fail('s-bed', '누운 시각을 넣어 주세요'); }
      if (!L.validHM(sleepE.wake)) { $('s-date-err').textContent = '일어난 시각을 넣어 주세요'; return fail('s-wake', '일어난 시각을 넣어 주세요'); }
      var mm = L.sleepMins(sleepE.bed, sleepE.wake);
      if (mm < 20 || mm > 16 * 60) { $('s-date-err').textContent = '잔 시간이 ' + L.dur(mm) + '이에요. 20분~16시간으로 넣어 주세요'; return fail('s-wake', '잔 시간 범위 밖'); }
      var s = { id: sleepE.id || uid('s'), date: sleepE.date, bed: sleepE.bed, wake: sleepE.wake, q: sleepE.q, chips: sleepE.chips.slice() };
      setUndo();
      if (sleepE.id) S.sleeps = S.sleeps.map(function (x) { return x.id === s.id ? s : x; });
      else S.sleeps.push(s);
      if (!save()) return;
      var d = ym(s.date); V.ly = d[0]; V.lm = d[1];
      UI.closeSheet(); render();
      done('잠 ' + L.dur(mm) + (sleepE.id ? '으로 고쳤어요' : '을 남겼어요'), true);
    },
    'form-pattern': function () {
      readPatternForm();
      if (!L.validDate(patE.start)) { $('pt-start-err').textContent = '시작 날을 골라 주세요'; return fail('pt-start', '시작 날을 골라 주세요'); }
      var e = L.checkNum(patE.days, 7, 62, '며칠');
      if (e) { $('pt-start-err').textContent = e; return fail('pt-days', e); }
      var seq = DATA.PATTERNS[patE.i].seq, n = Math.round(+patE.days), over = 0;
      for (var i = 0; i < n; i++) if (S.roster[L.addDays(patE.start, i)]) over++;
      function apply() {
        setUndo();
        for (var j = 0; j < n; j++) S.roster[L.addDays(patE.start, j)] = seq[j % seq.length];
        if (!save()) return;
        var d = ym(patE.start); V.ry = d[0]; V.rm = d[1];
        UI.closeSheet(); go('roster');
        done(n + '일을 채웠어요', true);
      }
      if (over) askConfirm('이미 찍힌 ' + over + '일을 덮어써요. 채울까요?', '덮어쓰기', apply);
      else apply();
    },
    'form-shifts': function () {
      var next = Store.clone(S.shifts), bad = null;
      next.forEach(function (t) {
        if (!t.work || bad) return;
        var s = val('sh-' + t.id + '-s'), e = val('sh-' + t.id + '-e');
        if (!L.validHM(s) || !L.validHM(e)) bad = [t.id, t.name + ' 시각을 모두 넣어 주세요'];
        else if (s === e) bad = [t.id, t.name + ' 시작과 끝이 같아요'];
        else { t.start = s; t.end = e; }
      });
      if (bad) { $('sh-' + bad[0] + '-s-err').textContent = bad[1]; return fail('sh-' + bad[0] + '-s', bad[1]); }
      setUndo();
      S.shifts = next;
      if (!save()) return;
      UI.closeSheet(); render();
      done('근무 시각을 저장했어요', true);
    },
    'form-backup': function () {
      var r = Store.parseImport(val('restore-text'));
      if (!r.ok) return fail('restore-text', r.err);
      askConfirm('지금 기록을 붙여 넣은 기록(근무 ' + Object.keys(r.state.roster).length + '일·약속 ' + r.state.plans.length + '개·잠 ' + r.state.sleeps.length + '개)으로 바꿀까요?', '바꾸기', function () {
        setUndo();
        S = r.state; S.welcomed = true;
        save(); applyLook(); UI.closeSheet(); render();
        done('기록을 되살렸어요', true);
      });
    },
    'form-settings': function () {
      var spec = [['set-commute', 'commute', 0, 180, '통근 시간'], ['set-prep', 'prep', 0, 180, '준비 시간'], ['set-need', 'needSleep', 4, 10, '필요한 잠'],
        ['set-rest', 'minRest', 6, 16, '최소 쉬는 시간'], ['set-nights', 'maxNights', 1, 7, '연속 나이트 한도'], ['set-streak', 'maxStreak', 3, 10, '연속 근무 한도'], ['set-travel', 'travel', 0, 180, '오가는 시간']];
      var nv = {};
      for (var i = 0; i < spec.length; i++) {
        var x = spec[i], v = val(x[0]), e = L.checkNum(v, x[2], x[3], x[4]);
        if (e) { $(x[0] + '-err').textContent = e; return fail(x[0], e); }
        nv[x[1]] = +v;
      }
      nv.maxNights = Math.round(nv.maxNights); nv.maxStreak = Math.round(nv.maxStreak);
      var w = val('set-wake');
      if (!L.validHM(w)) { $('set-wake-err').textContent = '시각을 넣어 주세요'; return fail('set-wake', '시각을 넣어 주세요'); }
      nv.offWake = w;
      setUndo();
      Object.keys(nv).forEach(function (k) { S.set[k] = nv[k]; });
      if (!save()) return;
      render();
      done('기준을 저장했어요. 판정을 다시 계산했어요', true);
    }
  };

  /* ---------- 입력 ---------- */
  function onInput(e) {
    var id = e.target && e.target.id;
    if (!id) return;
    UI.clearErr(id);
    if (id === 'q-date' || id === 'q-start' || id === 'q-dur') {
      V.quick.date = val('q-date'); V.quick.start = val('q-start'); V.quick.dur = val('q-dur');
      var b = $('q-date-err'); if (b) b.textContent = '';
      $('quick-out').innerHTML = UI.quickOut(S, V.quick);
    } else if (id === 'plan-q') {
      V.planQ = val('plan-q');
      $('plan-list').innerHTML = UI.planListHtml(S, V);
    } else if (id === 'p-date' || id === 'p-start' || id === 'p-dur' || id === 'p-title' || id === 'p-memo') {
      readPlanForm();
      if (id !== 'p-title' && id !== 'p-memo') $('plan-verdict').innerHTML = UI.quickOut(S, { date: planE.date, start: planE.start, dur: planE.dur });
    } else if (id === 's-date' || id === 's-bed' || id === 's-wake') {
      readSleepForm();
      $('s-len').textContent = UI.sleepLen(sleepE);
    } else if (id === 'day-text' && dayE) {
      dayE.text = val('day-text');
    } else if (id === 'pt-start' || id === 'pt-days') {
      readPatternForm();
    }
  }

  function bind() {
    document.addEventListener('pointerdown', unlockAudio, { once: true });
    document.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!el || el.disabled) return;
      var fn = ACT[el.getAttribute('data-act')];
      if (fn) { e.preventDefault(); fn(el, e); }
    });
    document.addEventListener('submit', function (e) {
      e.preventDefault();
      var fn = FORM[e.target.id];
      if (fn) fn(e.target);
    });
    document.addEventListener('input', onInput);
    document.addEventListener('change', onInput);
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!$('ov-confirm').hidden) ACT['confirm-cancel']();
      else if (UI.sheetOpen()) UI.closeSheet();
      else if (!$('ov-welcome').hidden) { S.welcomed = true; save(); UI.closeOverlay('ov-welcome'); }
    });
  }

  function init() {
    var r = Store.load();
    S = r.state;
    if (!r.ok) warn(r.err);
    var t = L.today(), d = ym(t);
    V.ry = V.ly = d[0]; V.rm = V.lm = d[1];
    V.quick.date = t;
    V.tip = L.diffDays('2026-01-01', t) % DATA.TIPS.length;
    if (V.tip < 0) V.tip += DATA.TIPS.length;
    applyLook();
    bind();
    go('today');
    if (!S.welcomed) UI.openOverlay('ov-welcome');
  }

  return { init: init, state: function () { return S; } };
})();

App.init();
