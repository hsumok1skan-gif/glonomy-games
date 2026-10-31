/* 내일 가방 — 상태와 동작 */
(function () {
  var $ = UI.$;
  var S = null;                 // 저장되는 데이터
  var V = {                     // 화면 상태 (저장하지 않음)
    screen: 'bag', offset: 0, pg: {}, kidMode: false, cal: null,
    noteQ: '', noteCat: 'all', noteSort: 'base',          // 알림장 준비물 찾기·거르기·순서
    cell: null, after: null, day: null, note: null, pack: null, eventPick: null, kidEdit: null, teach: null,
    times: null, help: null                                // 교시 시간 시트, 도움말 (쪽 번호와 찍어 둔 화면)
  };
  var undoSnap = null;
  var confirmFn = null;

  // ---- 저장 ----
  function save() {
    var ok = Store.save(S);
    $('store-warn').classList.toggle('on', !ok);
    return ok;
  }
  function rememberUndo() { undoSnap = JSON.stringify(S); }
  function doUndo() {
    if (!undoSnap) return;
    S = JSON.parse(undoSnap);
    undoSnap = null;
    save();
    UI.hideToast();
    renderAll();
    UI.toast('되돌렸어요');
  }

  function now() { return new Date(); }
  function todayKey() { return Logic.toKey(now()); }
  function curKid() {
    for (var i = 0; i < S.kids.length; i++) if (S.kids[i].id === S.cur) return S.kids[i];
    return S.kids[0] || null;
  }
  function bagKey() {
    var hs = S.settings.holidays;
    var k = Logic.bagDate(now(), S.settings);
    var n = V.offset;
    while (n > 0) { k = Logic.nextSchoolDay(k, hs); n--; }
    while (n < 0) { k = Logic.prevSchoolDay(k, hs); n++; }
    return k;
  }
  function relWord(k) {
    var r = Logic.relLabel(k, todayKey());
    return (r === '오늘' || r === '내일') ? r : '이날';
  }

  // ---- 그리기 ----
  function applySettings() {
    document.body.classList.toggle('dark', !!S.settings.dark);
    document.body.classList.toggle('reduce', !!S.settings.reduce);
    document.documentElement.style.setProperty('--k', String(S.settings.font || 1));
  }
  function renderAll() {
    var kid = curKid();
    if (kid) S.cur = kid.id;
    // 처음 설정 3단계를 다 끝내면 안내 카드를 다시 띄우지 않는다 (예시 아이로는 끝내지 않는다)
    if (kid && !kid.sample && !S.settings.setupDone && Logic.setupSteps(S, kid).all) {
      S.settings.setupDone = true;
      save();
    }
    applySettings();
    UI.renderKids(S);
    var t = todayKey();
    UI.renderBag(S, V, kid, bagKey(), t);
    UI.renderWeek(S, V, kid, t);
    UI.renderPacks(S, V);
    UI.renderMore(S, kid);
    // 열려 있는 시트도 새 데이터로
    if (UI.isOpen('sheet-bag')) {
      if (kid) UI.renderBagSheet(S, V, kid, Logic.buildBag(S, kid, bagKey()));
      else UI.closeSheet('sheet-bag');
    }
    if (UI.isOpen('sheet-kids')) UI.renderKidsSheet(S);
    if (UI.isOpen('sheet-guard')) UI.renderGuards(S);
    if (UI.isOpen('sheet-days')) UI.renderDays(S, t);
    if (UI.isOpen('sheet-daily')) UI.renderDaily(S);
    if (UI.isOpen('sheet-day') && kid && V.day) UI.renderDay(S, kid, V.day);
    if (UI.isOpen('sheet-cal') && V.cal) UI.renderCal(S, kid, V.cal);
    if (UI.isOpen('sheet-look')) UI.renderLook(S);
  }

  function go(name) {
    if (['bag', 'week', 'packs', 'more'].indexOf(name) < 0) name = 'bag';
    V.screen = name;
    UI.show(name);
  }

  function openSheet(id) { UI.openSheet(id); }
  function closeTop() {
    var on = UI.openSheets();
    if (!on.length) return false;
    var el = on[on.length - 1];
    if (el.id === 'ov-welcome') return false;
    if (el.id === 'sheet-bag' && V.kidMode) return false;   // 아이가 챙겨요: 어른이 끄기 전에는 닫히지 않는다
    UI.closeSheet(el.id);
    if (el.id === 'ov-confirm') confirmFn = null;
    if (el.id === 'sheet-bag') UI.hideBubble();
    return true;
  }

  // 지우기·바꾸기 전에 한 번 더 묻기
  function askConfirm(msg, yesLabel, fn) {
    $('confirm-msg').textContent = msg;
    $('confirm-yes').textContent = yesLabel || '네';
    confirmFn = fn;
    UI.openSheet('ov-confirm');
  }

  // ---- 소리: Web Audio 로 짧게, 누른 뒤에만 켠다 ----
  var actx = null;
  function audio() {
    if (S.settings.mute) return null;
    try {
      if (!actx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        actx = new AC();
      }
      if (actx.state === 'suspended' && actx.resume) actx.resume();
    } catch (e) { return null; }
    return actx;
  }
  function tone(f1, f2, at, dur, type, vol) {
    var a = audio();
    if (!a) return;
    try {
      var o = a.createOscillator(), g = a.createGain(), t = a.currentTime + (at || 0);
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f1, t);
      o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(a.destination);
      o.start(t); o.stop(t + dur + 0.03);
    } catch (e) { /* 소리가 안 나도 앱은 돈다 */ }
  }
  var SFX = {
    in: function () { tone(520, 1150, 0, 0.09, 'sine', 0.2); tone(1400, 900, 0.07, 0.06, 'triangle', 0.08); },          // 쏙
    inKid: function () { tone(600, 1300, 0, 0.09, 'sine', 0.22); tone(900, 1800, 0.08, 0.1, 'triangle', 0.14); tone(1800, 2400, 0.17, 0.07, 'sine', 0.08); },
    out: function () { tone(700, 380, 0, 0.1, 'sine', 0.12); },
    page: function () { tone(300, 420, 0, 0.05, 'sine', 0.05); },
    done: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, f * 1.01, i * 0.11, 0.24, 'triangle', 0.16); }); }
  };

  // ---- 아이 ----
  function openKid(id) {
    V.kidEdit = id || null;
    var k = null;
    S.kids.forEach(function (x) { if (x.id === id) k = x; });
    $('kid-title').textContent = k ? '아이 고치기' : '아이 이름을 알려 주세요';
    $('kid-name').value = k ? k.name : '';
    $('kid-grade').value = k ? String(k.grade) : '1';
    $('kid-del').style.display = k ? '' : 'none';
    $('kid-template').checked = !k;
    $('kid-template-row').style.display = k ? 'none' : '';   // 고치기 모드에서는 이미 채운 칸을 건드리지 않는다
    UI.clearErr('kid-name', 'kid-err');
    openSheet('sheet-kid');
  }
  function submitKid() {
    var name = Logic.norm($('kid-name').value);
    if (!name) return UI.fieldErr('kid-name', 'kid-err', '이름을 넣어 주세요.');
    if (name.length > Store.MAX_NAME) return UI.fieldErr('kid-name', 'kid-err', '이름은 ' + Store.MAX_NAME + '자 안으로 넣어 주세요.');
    var dup = S.kids.some(function (x) { return x.name === name && x.id !== V.kidEdit; });
    if (dup) return UI.fieldErr('kid-name', 'kid-err', '같은 이름의 아이가 있어요. 다른 이름으로 불러 주세요.');
    var grade = +$('kid-grade').value;
    rememberUndo();
    var k = null;
    S.kids.forEach(function (x) { if (x.id === V.kidEdit) k = x; });
    var filled = false;
    if (k) { k.name = name; k.grade = grade; }
    else {
      var np = S.settings.gradeP[grade] || 6;   // 학년별 교시 수 (설정 → 교시 시간)
      k = { id: Store.uid('k'), name: name, grade: grade, periods: np, week: Store.emptyWeek(np) };
      var tw = $('kid-template').checked ? Logic.gradeWeek(DATA.TIMETABLES, S.packs, grade, k.periods) : null;
      if (tw) for (var d = 1; d <= 5; d++) { k.week[d].p = tw[d]; if (tw[d].some(Boolean)) filled = true; }
      S.kids.push(k);
    }
    S.cur = k.id;
    V.offset = 0;
    save();
    UI.closeSheet('sheet-kid');
    renderAll();
    if (!V.kidEdit && pendingTeach) return applyTeach();   // 선생님 링크로 받아 둔 준비물을 이 아이 가방에
    UI.toast(V.kidEdit ? '고쳤어요' : filled ? grade + '학년 기본 시간표로 채웠어요' : Logic.nameI(name) + ' 시간표를 채워 볼까요?', !!V.kidEdit);
    if (!V.kidEdit) { UI.closeSheet('sheet-kids'); go('week'); }
  }
  function deleteKid() {
    var id = V.kidEdit;
    var k = S.kids.filter(function (x) { return x.id === id; })[0];
    if (!k) return;
    askConfirm(k.name + '의 시간표·알림장·가방 달력을 모두 지울까요?', '지우기', function () {
      rememberUndo();
      removeKid(id);
      save();
      UI.closeSheet('sheet-kid');
      renderAll();
      UI.toast('지웠어요', true);
    });
  }
  function removeKid(id) {
    S.kids = S.kids.filter(function (x) { return x.id !== id; });
    S.notes = S.notes.filter(function (n) { return n.kid !== id; });
    S.history = S.history.filter(function (h) { return h.kid !== id; });
    Object.keys(S.checks).forEach(function (ck) { if (ck.indexOf(id + '|') === 0) delete S.checks[ck]; });
    Object.keys(S.skips).forEach(function (ck) { if (ck.indexOf(id + '|') === 0) delete S.skips[ck]; });
    if (S.cur === id) S.cur = S.kids[0] ? S.kids[0].id : null;
  }

  // ---- 가방 시트: 칸을 누르면 쏙, 다 챙기면 닫히며 칭찬 스티커 ----
  function openBag() {
    var kid = curKid();
    if (!kid) return UI.toast('아이를 먼저 알려 주세요');
    var bag = Logic.buildBag(S, kid, bagKey());
    if (!bag.items.length) return UI.toast('이날 챙길 물건이 아직 없어요');
    V.pg.bag = 0;
    UI.renderBagSheet(S, V, kid, bag);
    openSheet('sheet-bag');
  }
  // 그날 가방 기록이 이미 있으면 지금 챙긴 것으로 다시 쓴다 (가방 달력 스티커가 맞게)
  function refreshHistory(kid, k) {
    for (var j = 0; j < S.history.length; j++) {
      var h = S.history[j];
      if (h.kid === kid.id && h.date === k) {
        var s = Logic.snapshot(S, kid, k);
        if (h.auto) s.auto = true;
        if (h.sample) s.sample = true;
        S.history[j] = s;
        return;
      }
    }
  }
  function toggleCheck(btn) {
    var kid = curKid();
    if (!kid) return;
    var k = bagKey(), name = btn.getAttribute('data-name');
    var ck = Logic.checkKey(kid.id, k);
    var list = S.checks[ck] || (S.checks[ck] = []);
    var i = list.indexOf(name);
    if (i >= 0) list.splice(i, 1); else list.push(name);
    refreshHistory(kid, k);
    save();
    var bag = Logic.buildBag(S, kid, k);
    var pr = Logic.progress(S, kid, bag);
    // 하나만 바꾸면 그 자리만 고친다 (가방 그림과 고리가 차오르게). 처음 설정 카드가 떠 있으면 다시 그린다
    if ($('setup-steps') || !UI.updateBag(S, kid, bag, name)) renderAll();
    var cell = UI.cellByName(name);
    if (i < 0) {
      UI.stamp(cell);
      UI.fly(cell, V.kidMode);
      (V.kidMode ? SFX.inKid : SFX.in)();
      if (pr.total && pr.done === pr.total) completeBag(kid, k);
    } else SFX.out();
  }
  function completeBag(kid, k) {
    var snap = Logic.snapshot(S, kid, k);
    if (!snap.total || snap.done !== snap.total) return;
    S.history = S.history.filter(function (h) { return !(h.kid === kid.id && h.date === k); });
    S.history.push(snap);
    save();
    var sh = document.querySelector('#sheet-bag .bag-sheet');
    if (sh) sh.classList.add('closed');
    SFX.done();
    var wait = document.body.classList.contains('reduce') ? 0 : 650;
    setTimeout(function () {
      var bag = Logic.buildBag(S, kid, k), pr = Logic.progress(S, kid, bag);
      if (!pr.total || pr.done !== pr.total) return;   // 그 사이 다시 뺐으면 그대로
      UI.hideBubble();
      UI.closeSheet('sheet-bag');
      UI.renderDone(S, kid, k);
      openSheet('ov-done');
      renderAll();
    }, wait);
  }
  function checkAll() {
    var kid = curKid();
    if (!kid) return;
    var k = bagKey();
    var bag = Logic.buildBag(S, kid, k);
    if (!bag.items.length) return;
    rememberUndo();
    S.checks[Logic.checkKey(kid.id, k)] = bag.items.map(function (it) { return it.name; });
    save();
    UI.renderBagSheet(S, V, kid, bag);
    renderAll();
    SFX.in();
    completeBag(kid, k);
  }
  // 아직 남은 물건이 있을 때 저장: '오늘은 여기까지 챙겼어요'
  function bagDone() {
    var kid = curKid();
    if (!kid) return;
    var k = bagKey();
    var snap = Logic.snapshot(S, kid, k);
    if (!snap.total) return UI.toast('이날 챙길 물건이 아직 없어요');
    if (snap.done === snap.total) return completeBag(kid, k);
    rememberUndo();
    S.history = S.history.filter(function (h) { return !(h.kid === kid.id && h.date === k); });
    S.history.push(snap);
    save();
    UI.closeSheet('sheet-bag');
    renderAll();
    UI.toast('오늘은 여기까지 챙겼어요', true);
  }
  // 길게 누른 칸의 '내일은 빼기': 그날 가방에서만 뺀다
  function skipItem(name) {
    var kid = curKid();
    if (!kid || V.kidMode) return;
    var k = bagKey(), ck = Logic.checkKey(kid.id, k);
    rememberUndo();
    var sk = S.skips[ck] || (S.skips[ck] = []);
    if (sk.indexOf(name) < 0) sk.push(name);
    if (S.checks[ck]) S.checks[ck] = S.checks[ck].filter(function (x) { return x !== name; });
    refreshHistory(kid, k);
    save();
    UI.hideBubble();
    var bag = Logic.buildBag(S, kid, k);
    if (!bag.items.length) UI.closeSheet('sheet-bag');
    renderAll();
    UI.toast(name + '은(는) ' + relWord(k) + ' 가방에서 뺐어요', true);
    var pr = Logic.progress(S, kid, bag);
    if (pr.total && pr.done === pr.total) completeBag(kid, k);
  }
  function showWhy(btn) {
    var kid = curKid();
    if (!kid || !btn) return;
    var k = bagKey(), name = btn.getAttribute('data-name');
    var it = Logic.buildBag(S, kid, k).items.filter(function (x) { return x.name === name; })[0];
    if (it) UI.showBubble(btn, it, relWord(k), V.kidMode);
  }
  function toggleKidMode() {
    // 켜기는 한 번 누르기, 끄기는 어른이 길게 누르기 (아이 혼자서는 다른 설정을 바꿀 수 없게)
    if (V.kidMode) return UI.toast('어른이 이 버튼을 길게 누르면 꺼져요');
    V.kidMode = true;
    V.pg.bag = 0;
    var kid = curKid();
    if (kid) UI.renderBagSheet(S, V, kid, Logic.buildBag(S, kid, bagKey()));
    SFX.inKid();
    UI.toast('아이가 챙겨요! 칸을 눌러 가방에 쏙 넣어요');
  }
  function kidModeOff() {
    V.kidMode = false;
    V.pg.bag = 0;
    var kid = curKid();
    if (kid && UI.isOpen('sheet-bag')) UI.renderBagSheet(S, V, kid, Logic.buildBag(S, kid, bagKey()));
    UI.toast('어른 화면으로 돌아왔어요');
  }

  // ---- 복사 ----
  function copyText(t, okMsg) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = t;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      UI.toast(ok ? okMsg : '복사하지 못했어요. 글을 길게 눌러 직접 복사해 주세요');
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(function () { UI.toast(okMsg); }, fallback);
        return;
      }
    } catch (e) { /* 아래로 */ }
    fallback();
  }
  // 가족에게 보낼 글: '하윤이 11월 2일(월) 가방 다 챙겼어요 🎒' + 데리러 갈 사람 한 줄
  function share() {
    var kid = curKid();
    if (!kid) return UI.toast('아이를 먼저 알려 주세요');
    copyText(Logic.shareText(S, kid, Logic.buildBag(S, kid, bagKey())), '가족에게 보낼 글을 복사했어요');
  }
  function doneCopy() {
    var kid = curKid();
    if (!kid) return UI.toast('아이를 먼저 알려 주세요');
    var t = Logic.doneText(S, kid, Logic.buildBag(S, kid, bagKey()));
    if (!t) return UI.toast('다 챙기면 보낼 수 있어요');
    copyText(t, '가족에게 보낼 글을 복사했어요');
  }

  // ---- 며칠 뒤 준비물·가방 달력 ----
  function openUpcoming() {
    var kid = curKid();
    if (!kid) return;
    UI.renderUpcoming(S, kid, bagKey(), todayKey());
    openSheet('sheet-upcoming');
  }
  function openCal() {
    V.cal = bagKey().slice(0, 7);
    if (V.cal > todayKey().slice(0, 7)) V.cal = todayKey().slice(0, 7);
    UI.closeSheet('ov-done');
    UI.renderCal(S, curKid(), V.cal);
    openSheet('sheet-cal');
  }
  function calStep(n) {
    if (!V.cal) return;
    var p = V.cal.split('-'), y = +p[0], m = +p[1] + n;
    if (m < 1) { m = 12; y--; } else if (m > 12) { m = 1; y++; }
    V.cal = y + '-' + (m < 10 ? '0' : '') + m;
    UI.renderCal(S, curKid(), V.cal);
  }

  // ---- 알림장 ----
  function openNote(id, dateKey) {
    var kid = curKid();
    if (!kid) return UI.toast('아이를 먼저 알려 주세요');
    var n = id ? S.notes.filter(function (x) { return x.id === id; })[0] : null;
    V.note = { id: n ? n.id : null, items: n ? n.items.slice() : [] };
    V.noteQ = ''; V.noteCat = 'all'; V.pg.sup = 0;
    $('note-head').textContent = Logic.nameI(kid.name) + ' 알림장';
    $('note-date').value = n ? n.date : (dateKey || bagKey());
    $('note-title').value = n ? (n.title || '') : '';
    $('note-add').value = '';
    $('note-q').value = '';
    $('note-sort').value = V.noteSort;
    $('note-del').style.display = n ? '' : 'none';
    UI.clearErr('note-add', 'note-err');
    UI.clearErr('note-date', null);
    UI.renderNoteItems(V.note.items);
    UI.renderSupplies(S, V, V.note.items);
    UI.closeSheet('sheet-upcoming');
    openSheet('sheet-note');
  }
  function noteAddItem(name) {
    var t = Logic.norm(name);
    if (!t) return UI.fieldErr('note-add', 'note-err', '준비물 이름을 넣어 주세요.');
    if (t.length > 40) return UI.fieldErr('note-add', 'note-err', '40자 안으로 넣어 주세요.');
    if (V.note.items.indexOf(t) >= 0) return UI.fieldErr('note-add', 'note-err', '이미 넣은 준비물이에요.');
    if (V.note.items.length >= 30) return UI.fieldErr('note-add', 'note-err', '한 번에 30개까지 넣을 수 있어요.');
    UI.clearErr('note-add', 'note-err');
    V.note.items.push(t);
    UI.renderNoteItems(V.note.items);
    UI.renderSupplies(S, V, V.note.items);
    return true;
  }
  function noteSupply(name) {
    var i = V.note.items.indexOf(name);
    if (i >= 0) V.note.items.splice(i, 1);
    else noteAddItem(name);
    UI.renderNoteItems(V.note.items);
    UI.renderSupplies(S, V, V.note.items);
  }
  function submitNote() {
    var kid = curKid();
    var d = $('note-date').value;
    if (!d || !Logic.validKey(d)) return UI.fieldErr('note-date', 'note-err', '가져갈 날을 골라 주세요.');
    var pending = Logic.norm($('note-add').value);
    if (pending && V.note.items.indexOf(pending) < 0) { if (noteAddItem(pending) !== true) return; $('note-add').value = ''; }
    if (!V.note.items.length) return UI.fieldErr('note-add', 'note-err', '준비물을 하나 이상 넣어 주세요.');
    var title = Logic.norm($('note-title').value);
    if (title.length > 40) return UI.fieldErr('note-title', 'note-err', '40자 안으로 넣어 주세요.');
    rememberUndo();
    var n = V.note.id ? S.notes.filter(function (x) { return x.id === V.note.id; })[0] : null;
    if (n) { n.date = d; n.title = title; n.items = V.note.items.slice(); }
    else S.notes.push({ id: Store.uid('n'), kid: kid.id, date: d, title: title, items: V.note.items.slice() });
    save();
    UI.closeSheet('sheet-note');
    renderAll();
    var school = Logic.isSchoolDay(d, S.settings.holidays);
    UI.toast(Logic.shortLabel(d) + ' 가방에 ' + V.note.items.length + '개 넣었어요' + (school ? '' : ' (쉬는 날이에요)'), true);
  }
  function deleteNote() {
    var id = V.note && V.note.id;
    if (!id) return;
    askConfirm('이 알림장 준비물을 지울까요?', '지우기', function () {
      rememberUndo();
      S.notes = S.notes.filter(function (x) { return x.id !== id; });
      save();
      UI.closeSheet('sheet-note');
      renderAll();
      UI.toast('지웠어요', true);
    });
  }

  // ---- 행사 꾸러미 ----
  function openEvent() {
    if (!curKid()) return UI.toast('아이를 먼저 알려 주세요');
    V.eventPick = null;
    $('event-date').value = UI.isOpen('sheet-note') && $('note-date').value ? $('note-date').value : bagKey();
    UI.clearErr('event-date', 'event-err');
    UI.renderEvents(null);
    UI.closeSheet('sheet-note');
    openSheet('sheet-event');
  }
  function submitEvent() {
    var ev = DATA.EVENTS.filter(function (e) { return e.id === V.eventPick; })[0];
    if (!ev) { $('event-err').textContent = '행사를 골라 주세요.'; UI.flash($('event-list')); return; }
    var d = $('event-date').value;
    if (!d || !Logic.validKey(d)) return UI.fieldErr('event-date', 'event-err', '행사 날을 골라 주세요.');
    rememberUndo();
    S.notes.push({ id: Store.uid('n'), kid: curKid().id, date: d, title: ev.name, items: ev.items.slice() });
    save();
    UI.closeSheet('sheet-event');
    renderAll();
    UI.toast(Logic.shortLabel(d) + ' 가방에 ' + ev.name + ' 준비물을 넣었어요', true);
  }

  // ---- 시간표 ----
  function openCell(d, i) {
    V.cell = { d: d, i: i };
    UI.renderCellSheet(S, V, curKid());
    openSheet('sheet-cell');
  }
  function setCell(packId) {
    var kid = curKid();
    rememberUndo();
    kid.week[V.cell.d].p[V.cell.i] = packId;
    save();
    var d = V.cell.d, i = V.cell.i;
    // 다음 칸으로 넘어가 연달아 넣을 수 있게
    if (packId && i + 1 < kid.periods) {
      V.cell.i = i + 1;
      UI.renderCellSheet(S, V, kid);
    } else UI.closeSheet('sheet-cell');
    renderAll();
    var el = $('cell-' + d + '-' + i);
    if (el) el.classList.add('flash');
    UI.toast(packId ? DATA.DOW[d] + '요일 ' + (i + 1) + '교시에 넣었어요' : '빈 칸으로 바꿨어요', true);
  }
  function copyDay(to) {
    var kid = curKid();
    var from = V.cell.d;
    askConfirm(DATA.DOW[from] + '요일 시간표를 ' + DATA.DOW[to] + '요일에 덮어쓸까요? (방과후는 그대로예요)', '덮어쓰기', function () {
      rememberUndo();
      kid.week[to].p = kid.week[from].p.slice();
      save();
      UI.closeSheet('sheet-cell');
      renderAll();
      UI.toast(DATA.DOW[to] + '요일에 복사했어요', true);
    });
  }
  // ---- 교시 시간: 교시마다 시작·끝 시각과 학년별 교시 수 (설정 → 교시 시간) ----
  function lostCells(kid, n) {
    var lost = 0;
    for (var d = 1; d <= 5; d++) kid.week[d].p.slice(n).forEach(function (x) { if (x) lost++; });
    return lost;
  }
  function resizeKid(kid, n) {
    for (var e = 1; e <= 5; e++) {
      var p = kid.week[e].p;
      while (p.length < n) p.push(null);
      kid.week[e].p = p.slice(0, n);
    }
    kid.periods = n;
  }
  // 학년마다 지금 교시 수: 그 학년 아이가 있으면 그 아이의 교시 수, 없으면 설정 값
  function gradeNow() {
    var gp = {};
    for (var g = 1; g <= 6; g++) {
      var k = S.kids.filter(function (x) { return x.grade === g; })[0];
      gp[g] = k ? k.periods : (S.settings.gradeP[g] || 6);
    }
    return gp;
  }
  function openTimes() {
    V.times = true;
    UI.renderTimes(Logic.periodTimes(S.settings), gradeNow());
    UI.clearErr(null, 'times-err');
    openSheet('sheet-times');
  }
  function readTimes() {
    var list = [];
    for (var i = 0; i < Logic.MAX_P; i++) list.push([$('pt-s-' + i).value, $('pt-e-' + i).value]);
    return list;
  }
  function submitTimes() {
    var list = readTimes();
    var bad = Logic.checkTimes(list);
    if (bad) return UI.fieldErr('pt-' + (bad.end ? 'e' : 's') + '-' + bad.i, 'times-err', bad.msg);
    UI.clearErr(null, 'times-err');
    var gp = {};
    for (var g = 1; g <= 6; g++) gp[g] = +$('gp-' + g).value;
    var change = S.kids.filter(function (k) { return gp[k.grade] && gp[k.grade] !== k.periods; });
    var lost = 0;
    change.forEach(function (k) { lost += lostCells(k, gp[k.grade]); });
    function apply() {
      rememberUndo();
      S.settings.ptimes = list;
      S.settings.gradeP = gp;
      change.forEach(function (k) { resizeKid(k, gp[k.grade]); });
      save();
      UI.closeSheet('sheet-times');
      renderAll();
      UI.toast('교시 시간을 저장했어요', true);
    }
    if (lost) askConfirm('교시 수가 줄어 채운 칸 ' + lost + '개가 지워져요. 바꿀까요?', '바꾸기', apply);
    else apply();
  }
  function timesDefault() {
    Logic.defaultTimes().forEach(function (t, i) { $('pt-s-' + i).value = t[0]; $('pt-e-' + i).value = t[1]; });
    UI.clearErr(null, 'times-err');
  }

  // ---- 도움말: 예시 데이터를 넣은 화면을 그려 찍고(UI.makeShot) 바로 원래 화면으로 돌린다 ----
  function captureShots() {
    var realS = S, keep = { screen: V.screen, offset: V.offset, kidMode: V.kidMode, pg: V.pg };
    var shots = [];
    try {
      S = Store.defaults();
      S.settings.welcomed = true;
      S.settings.dark = realS.settings.dark;
      S.settings.font = realS.settings.font;
      S.settings.reduce = realS.settings.reduce;
      fillSample(S);
      V.offset = 0; V.kidMode = false; V.pg = { bag: 1 };
      var kid = curKid(), k = bagKey();
      var bag = Logic.buildBag(S, kid, k);
      // 반쯤 챙긴 모습 (가방 그림이 차오르고 칸에 ✓ 도장)
      S.checks[Logic.checkKey(kid.id, k)] = bag.items.filter(function (it, i) { return i % 2 === 0; }).map(function (it) { return it.name; });
      renderAll();
      ['bag', 'sheet', 'week', 'packs', 'more'].forEach(function (n) {
        if (n === 'sheet') {
          UI.renderBagSheet(S, V, kid, Logic.buildBag(S, kid, k));
          shots.push(UI.makeShot(document.querySelector('#sheet-bag .bag-sheet'), true));
          return;
        }
        UI.show(n);
        shots.push(UI.makeShot($('app'), false));
      });
    } catch (e) { shots = []; }
    S = realS;
    V.offset = keep.offset; V.kidMode = keep.kidMode; V.pg = keep.pg;
    renderAll();
    UI.show(keep.screen);
    V.screen = keep.screen;
    var kd = curKid();
    if (kd) UI.renderBagSheet(S, V, kd, Logic.buildBag(S, kd, bagKey()));
    return shots;
  }
  function openHelp() {
    V.help = { i: 0, shots: captureShots() };
    UI.renderHelpPage(0, V.help.shots, V);
    openSheet('sheet-help');
  }
  function helpStep(d) {
    var i = V.help.i + d;
    if (i >= UI.HELP_N) return UI.closeSheet('sheet-help');
    V.help.i = Math.max(0, i);
    UI.renderHelpPage(V.help.i, V.help.shots, V);
  }

  function openDay(d) {
    var kid = curKid();
    if (!kid) return;
    V.day = d;
    UI.renderDay(S, kid, d);
    openSheet('sheet-day');
  }

  function fillWho(sel, cur) {
    var h = '<option value="">정하지 않음</option>';
    S.settings.guardians.forEach(function (g) { h += '<option' + (g === cur ? ' selected' : '') + '>' + UI.esc(g) + '</option>'; });
    sel.innerHTML = h;
  }
  function openAfter(d, id) {
    var kid = curKid();
    if (!kid) return UI.toast('아이를 먼저 알려 주세요');
    var a = id ? kid.week[d].after.filter(function (x) { return x.id === id; })[0] : null;
    V.after = { d: d, id: a ? a.id : null };
    $('after-title').textContent = DATA.DOW[d] + '요일 방과후 ' + (a ? '고치기' : '넣기');
    var h = '';
    S.packs.filter(function (p) { return p.kind === 'acad'; }).forEach(function (p) {
      h += '<option value="' + p.id + '"' + (a && a.packId === p.id ? ' selected' : '') + '>' + UI.esc(p.icon + ' ' + p.name) + '</option>';
    });
    $('after-pack').innerHTML = h;
    $('after-time').value = a ? a.time : '15:00';
    fillWho($('after-who'), a ? a.who : '');
    $('after-del').style.display = a ? '' : 'none';
    UI.clearErr('after-time', 'after-err');
    openSheet('sheet-after');
  }
  function submitAfter() {
    var kid = curKid();
    var packId = $('after-pack').value;
    if (!packId) return UI.fieldErr('after-pack', 'after-err', '꾸러미 탭에서 방과후·학원 꾸러미를 먼저 만들어 주세요.');
    var t = $('after-time').value;
    if (!/^\d{2}:\d{2}$/.test(t)) return UI.fieldErr('after-time', 'after-err', '시작 시각을 넣어 주세요.');
    if (t < '08:00' || t > '22:00') return UI.fieldErr('after-time', 'after-err', '오전 8시에서 밤 10시 사이로 넣어 주세요.');
    var list = kid.week[V.after.d].after;
    var clash = list.some(function (x) { return x.time === t && x.id !== V.after.id; });
    if (clash) return UI.fieldErr('after-time', 'after-err', '같은 시각에 이미 다른 방과후가 있어요.');
    if (!V.after.id && list.length >= 6) return UI.fieldErr('after-pack', 'after-err', '한 요일에 방과후는 6개까지 넣을 수 있어요.');
    rememberUndo();
    var a = V.after.id ? list.filter(function (x) { return x.id === V.after.id; })[0] : null;
    if (a) { a.packId = packId; a.time = t; a.who = $('after-who').value; }
    else list.push({ id: Store.uid('a'), packId: packId, time: t, who: $('after-who').value });
    save();
    UI.closeSheet('sheet-after');
    renderAll();
    UI.toast('방과후를 저장했어요', true);
  }
  function deleteAfter() {
    var kid = curKid();
    var d = V.after.d, id = V.after.id;
    askConfirm('이 방과후 일정을 지울까요?', '지우기', function () {
      rememberUndo();
      kid.week[d].after = kid.week[d].after.filter(function (x) { return x.id !== id; });
      save();
      UI.closeSheet('sheet-after');
      renderAll();
      UI.toast('지웠어요', true);
    });
  }

  // ---- 꾸러미 ----
  function openPack(id) {
    var p = id ? Logic.findPack(S.packs, id) : null;
    V.pack = { id: p ? p.id : null, items: p ? p.items.slice() : [] };
    $('pack-title').textContent = p ? p.name + ' 꾸러미' : '새 꾸러미';
    $('pack-name').value = p ? p.name : '';
    $('pack-icon').value = p ? p.icon : '🎒';
    $('pack-kind').value = p ? p.kind : 'subj';
    $('pack-add').value = '';
    $('pack-del').style.display = p ? '' : 'none';
    UI.clearErr('pack-name', 'pack-err');
    UI.clearErr('pack-add', null);
    UI.closeSheet('sheet-cell');
    UI.renderPackItems(V.pack.items, 0);
    openSheet('sheet-pack');
  }
  function packAddItem() {
    var t = Logic.norm($('pack-add').value);
    if (!t) return UI.fieldErr('pack-add', 'pack-err', '물건 이름을 넣어 주세요.');
    if (t.length > 40) return UI.fieldErr('pack-add', 'pack-err', '40자 안으로 넣어 주세요.');
    if (V.pack.items.indexOf(t) >= 0) return UI.fieldErr('pack-add', 'pack-err', '이미 있는 물건이에요.');
    if (V.pack.items.length >= 20) return UI.fieldErr('pack-add', 'pack-err', '꾸러미 하나에 20개까지 넣을 수 있어요.');
    UI.clearErr('pack-add', 'pack-err');
    V.pack.items.push(t);
    $('pack-add').value = '';
    V.pg.pitems = Math.floor((V.pack.items.length - 1) / 12);
    UI.renderPackItems(V.pack.items, V.pg.pitems);
    return true;
  }
  function submitPack() {
    var name = Logic.norm($('pack-name').value);
    if (!name) return UI.fieldErr('pack-name', 'pack-err', '꾸러미 이름을 넣어 주세요.');
    if (name.length > Store.MAX_NAME) return UI.fieldErr('pack-name', 'pack-err', '이름은 ' + Store.MAX_NAME + '자 안으로 넣어 주세요.');
    var kind = $('pack-kind').value;
    var dup = S.packs.some(function (p) { return p.name === name && p.kind === kind && p.id !== V.pack.id; });
    if (dup) return UI.fieldErr('pack-name', 'pack-err', '같은 이름의 꾸러미가 있어요.');
    if (Logic.norm($('pack-add').value) && packAddItem() !== true) return;
    if (!V.pack.items.length) return UI.fieldErr('pack-add', 'pack-err', '늘 챙기는 물건을 하나 이상 넣어 주세요.');
    var icon = Logic.norm($('pack-icon').value) || '🎒';
    rememberUndo();
    var p = V.pack.id ? Logic.findPack(S.packs, V.pack.id) : null;
    if (p) {
      if (p.kind !== kind) detachPack(p.id);
      p.name = name; p.icon = icon; p.kind = kind; p.items = V.pack.items.slice();
    } else S.packs.push({ id: Store.uid('p'), kind: kind, name: name, icon: icon, items: V.pack.items.slice() });
    save();
    UI.closeSheet('sheet-pack');
    renderAll();
    UI.toast('꾸러미를 저장했어요', true);
  }
  // 꾸러미를 지우거나 종류를 바꾸면 시간표·방과후에서 뺀다
  function detachPack(id) {
    S.kids.forEach(function (k) {
      for (var d = 1; d <= 5; d++) {
        k.week[d].p = k.week[d].p.map(function (x) { return x === id ? null : x; });
        k.week[d].after = k.week[d].after.filter(function (a) { return a.packId !== id; });
      }
    });
  }
  function deletePack() {
    var id = V.pack && V.pack.id;
    if (!id) return;
    askConfirm('이 꾸러미를 지울까요? 시간표와 방과후에서도 빠져요.', '지우기', function () {
      rememberUndo();
      detachPack(id);
      S.packs = S.packs.filter(function (p) { return p.id !== id; });
      save();
      UI.closeSheet('sheet-pack');
      renderAll();
      UI.toast('지웠어요', true);
    });
  }

  function addDaily(name) {
    var t = Logic.norm(name);
    if (!t) return UI.fieldErr('daily-add', 'daily-err', '물건 이름을 넣어 주세요.');
    if (t.length > 40) return UI.fieldErr('daily-add', 'daily-err', '40자 안으로 넣어 주세요.');
    if (S.daily.indexOf(t) >= 0) return UI.fieldErr('daily-add', 'daily-err', '이미 있어요.');
    if (S.daily.length >= 12) return UI.fieldErr('daily-add', 'daily-err', '매일 챙길 것은 12개까지 넣을 수 있어요.');
    UI.clearErr('daily-add', 'daily-err');
    rememberUndo();
    S.daily.push(t);
    $('daily-add').value = '';
    save();
    renderAll();
    UI.toast(t + '을(를) 매일 챙길 것에 넣었어요', true);
  }

  // ---- 설정 ----
  function addGuardian() {
    var t = Logic.norm($('guard-add').value);
    if (!t) return UI.fieldErr('guard-add', 'guard-err', '이름을 넣어 주세요.');
    if (t.length > 12) return UI.fieldErr('guard-add', 'guard-err', '12자 안으로 넣어 주세요.');
    if (S.settings.guardians.indexOf(t) >= 0) return UI.fieldErr('guard-add', 'guard-err', '이미 있어요.');
    if (S.settings.guardians.length >= 8) return UI.fieldErr('guard-add', 'guard-err', '8명까지 넣을 수 있어요.');
    UI.clearErr('guard-add', 'guard-err');
    rememberUndo();
    S.settings.guardians.push(t);
    $('guard-add').value = '';
    save(); renderAll();
    UI.toast('넣었어요', true);
  }
  function addHoliday() {
    var d = $('holiday-add').value;
    if (!d || !Logic.validKey(d)) return UI.fieldErr('holiday-add', 'holiday-err', '날짜를 골라 주세요.');
    if (S.settings.holidays.indexOf(d) >= 0) return UI.fieldErr('holiday-add', 'holiday-err', '이미 넣은 날이에요.');
    var w = Logic.dow(d);
    if (w === 0 || w === 6) return UI.fieldErr('holiday-add', 'holiday-err', '주말은 넣지 않아도 저절로 건너뛰어요.');
    UI.clearErr('holiday-add', 'holiday-err');
    rememberUndo();
    S.settings.holidays.push(d);
    V.offset = 0;
    save(); renderAll();
    UI.toast(Logic.shortLabel(d) + '을(를) 쉬는 날로 넣었어요', true);
  }

  // ---- 선생님 모드: 반 준비물을 링크 주소(#t=…) 안에 담고 QR코드로 그린다. 서버 없음 ----
  function openTeacher() {
    if (!S.settings.teacher) return UI.toast('설정에서 선생님 모드를 먼저 켜 주세요');
    V.teach = { items: [] };
    $('teach-date').value = Logic.bagDate(now(), S.settings);
    $('teach-add').value = '';
    $('teach-memo').value = '';
    UI.clearErr('teach-class', 'teach-err');
    UI.clearErr('teach-add', null);
    UI.clearErr('teach-date', null);
    UI.clearErr('teach-memo', null);
    UI.renderTeachItems(V.teach.items);
    UI.renderTeachOut(null);
    openSheet('sheet-teacher');
  }
  function teachAddItem() {
    var t = Logic.norm($('teach-add').value);
    if (!t) return UI.fieldErr('teach-add', 'teach-err', '준비물 이름을 넣어 주세요.');
    if (t.length > 40) return UI.fieldErr('teach-add', 'teach-err', '40자 안으로 넣어 주세요.');
    if (V.teach.items.indexOf(t) >= 0) return UI.fieldErr('teach-add', 'teach-err', '이미 넣은 준비물이에요.');
    if (V.teach.items.length >= 15) return UI.fieldErr('teach-add', 'teach-err', '한 번에 15개까지 넣을 수 있어요.');
    UI.clearErr('teach-add', 'teach-err');
    V.teach.items.push(t);
    $('teach-add').value = '';
    UI.renderTeachItems(V.teach.items);
    return true;
  }
  function teacherBase() { return location.href.split('#')[0]; }
  function submitTeacher() {
    var cls = Logic.norm($('teach-class').value);
    if (!cls) return UI.fieldErr('teach-class', 'teach-err', '반 이름을 넣어 주세요.');
    if (cls.length > 20) return UI.fieldErr('teach-class', 'teach-err', '반 이름은 20자 안으로 넣어 주세요.');
    var d = $('teach-date').value;
    if (!d || !Logic.validKey(d)) return UI.fieldErr('teach-date', 'teach-err', '가져올 날을 골라 주세요.');
    if (Logic.norm($('teach-add').value) && teachAddItem() !== true) return;
    if (!V.teach.items.length) return UI.fieldErr('teach-add', 'teach-err', '준비물을 하나 이상 넣어 주세요.');
    var memo = Logic.norm($('teach-memo').value);
    if (memo.length > 100) return UI.fieldErr('teach-memo', 'teach-err', '메모는 100자 안으로 넣어 주세요.');
    var link = teacherBase() + '#t=' + Logic.teacherPack({ c: cls, d: d, i: V.teach.items, m: memo });
    var qr = QR.svg(link, cls + ' 준비물 링크 QR코드');
    if (!qr) return UI.fieldErr('teach-memo', 'teach-err', '내용이 길어 QR코드에 다 담기지 않아요. 준비물이나 메모를 줄여 주세요.');
    UI.clearErr('teach-class', 'teach-err');
    V.teach.out = { cls: cls, d: d, n: V.teach.items.length, link: link };
    var local = !/^https?:$/.test(location.protocol);
    UI.renderTeachOut({ cls: cls, d: d, n: V.teach.items.length, link: link, qr: qr });
    // 이 기기 파일로 열었으면 다른 기기에서는 링크가 열리지 않는다 (화면에 글을 두지 않고 알림으로만)
    UI.toast(local ? '링크를 만들었어요. 이 기기 파일로 열려 있어 다른 기기에서는 열리지 않아요' : '링크와 QR코드를 만들었어요');
  }
  // 지금 화면에 보이는 링크만 보낸다 (내용을 고치러 가면 링크를 치운다)
  function teachOut() {
    var o = V.teach && V.teach.out;
    if (!o || !$('teach-link') || $('teach-link').value !== o.link) return null;
    return o;
  }
  function teachMsg(o) {
    return o.cls + ' ' + Logic.dayLabel(o.d) + ' 준비물 ' + o.n + '개예요. 링크를 열면 내일 가방에 들어가요.';
  }
  function teachCopy() {
    var o = teachOut();
    if (!o) return UI.toast('먼저 링크 만들기를 눌러 주세요');
    copyText(teachMsg(o) + '\n' + o.link, '링크를 복사했어요. 카톡·문자 대화방에 붙여 넣어 주세요');
  }
  function teachShare() {
    var o = teachOut();
    if (!o) return UI.toast('먼저 링크 만들기를 눌러 주세요');
    var data = { title: o.cls + ' 준비물', text: teachMsg(o), url: o.link };
    var can = false;
    try { can = !!navigator.share && (!navigator.canShare || navigator.canShare(data)); } catch (e) { can = false; }
    if (!can) {
      copyText(teachMsg(o) + '\n' + o.link, '이 브라우저는 바로 보내기가 안 돼서 링크를 복사했어요. 대화방에 붙여 넣어 주세요');
      return;
    }
    try {
      navigator.share(data).then(function () { UI.toast('보낼 곳으로 넘겼어요'); }, function (err) {
        if (err && err.name === 'AbortError') return;   // 사람이 고르기 창을 닫음
        copyText(teachMsg(o) + '\n' + o.link, '바로 보내지 못해서 링크를 복사했어요. 대화방에 붙여 넣어 주세요');
      });
    } catch (e) {
      copyText(teachMsg(o) + '\n' + o.link, '바로 보내지 못해서 링크를 복사했어요. 대화방에 붙여 넣어 주세요');
    }
  }

  // ---- 부모 쪽: 선생님 링크(#t=…)를 열면 준비물을 지금 아이의 그날 알림장에 넣는다 ----
  var pendingTeach = null;   // 아이가 아직 없을 때 받아 둔 링크
  function clearHash() {
    try {
      if (/^https?:$/.test(location.protocol)) history.replaceState(null, '', location.href.split('#')[0]);
      else location.hash = '';
    } catch (e) { /* 주소를 못 지워도 같은 링크는 다시 넣지 않는다 (mergeTeacher) */ }
  }
  function readTeachHash() {
    var h = location.hash || '';
    if (h.indexOf('#t=') !== 0) return;
    var t = Logic.teacherUnpack(h.slice(3));
    clearHash();
    if (!t) return UI.toast('선생님 링크를 읽지 못했어요. 링크를 다시 받아 주세요');
    pendingTeach = t;
    applyTeach();
  }
  // 학교 가는 날 몇 칸 앞뒤인지 세어 가방 화면을 그날로 (그날이 학교 가는 날이 아니면 지금 가방)
  function offsetTo(d) {
    var base = Logic.bagDate(now(), S.settings), hs = S.settings.holidays, n = 0, k = base;
    if (d < base) { while (k > d && n > -400) { k = Logic.prevSchoolDay(k, hs); n--; } }
    else { while (k < d && n < 400) { k = Logic.nextSchoolDay(k, hs); n++; } }
    return k === d ? n : 0;
  }
  function applyTeach() {
    var t = pendingTeach;
    if (!t) return;
    var kid = curKid();
    if (!kid) {
      // 아이를 넣으면 바로 들어간다 (submitKid)
      S.settings.welcomed = true;
      save();
      UI.closeSheet('ov-welcome');
      openKid(null);
      UI.toast(t.c + ' 준비물 링크를 받았어요. 아이를 알려 주면 바로 들어가요');
      return;
    }
    pendingTeach = null;
    rememberUndo();
    var r = Logic.mergeTeacher(S, kid, t, Store.uid('n'));
    save();
    V.offset = offsetTo(r.date);
    renderAll();
    go('bag');
    if (!r.added.length) {
      undoSnap = null;
      return UI.toast(Logic.shortLabel(r.date) + ' 가방에 ' + r.cls + ' 준비물이 이미 다 들어 있어요');
    }
    UI.flash($('bag-ring'));
    UI.toast(Logic.shortLabel(r.date) + ' 가방에 ' + r.cls + ' 준비물 ' + r.added.length + '개를 넣었어요' +
      (r.merged.length ? ' · 이미 있던 ' + r.merged.length + '개는 하나로 합쳤어요' : ''), true);
  }

  // ---- 내보내기·가져오기 ----
  function openExport() {
    $('export-text').value = Store.exportText(S);
    openSheet('sheet-export');
  }
  function openBackup() {
    $('restore-text').value = '';
    UI.clearErr('restore-text', 'restore-err');
    var hasSample = S.kids.some(function (k) { return k.sample; });
    $('bk-sample-add').style.display = hasSample ? 'none' : '';
    $('bk-sample-del').style.display = hasSample ? '' : 'none';
    openSheet('sheet-backup');
  }
  function restore() {
    var r = Store.parseImport($('restore-text').value);
    if (!r.ok) return UI.fieldErr('restore-text', 'restore-err', r.errs.join(' '));
    askConfirm('지금 내용을 가져온 내용(아이 ' + r.data.kids.length + '명)으로 바꿀까요?', '바꾸기', function () {
      rememberUndo();
      S = r.data;
      S.settings.welcomed = true;
      V.offset = 0;
      save();
      UI.closeSheet('sheet-backup');
      renderAll();
      UI.toast('가져왔어요', true);
    });
  }

  // ---- 예시: 하윤이(2학년) 시간표·방과후·알림장, 지난 학교 가는 날 기록 ----
  function addSample() {
    if (S.kids.some(function (k) { return k.sample; })) return UI.toast('예시가 이미 들어 있어요');
    rememberUndo();
    fillSample(S);
    S.settings.welcomed = true;
    V.offset = 0;
    save();
    renderAll();
    go('bag');
    UI.closeSheet('sheet-backup');
    UI.toast('예시를 넣었어요', true);
  }
  // 받은 상태(S)에 예시 아이를 넣는다 (도움말 화면 찍기도 이것을 쓴다)
  function fillSample(S) {
    var id = Store.uid('k');
    var w = Store.emptyWeek(6);
    var T = {
      1: ['s-kor', 's-math', 's-int', 's-int', 's-pe', null],
      2: ['s-read', 's-kor', 's-math', 's-mus', 's-int', null],
      3: ['s-kor', 's-dict', 's-int', 's-int', null, null],
      4: ['s-math', 's-kor', 's-pe', 's-art', 's-art', null],
      5: ['s-kor', 's-safe', 's-int', 's-cre', 's-math', null]
    };
    for (var d = 1; d <= 5; d++) w[d].p = T[d].map(function (x) { return x && Logic.findPack(S.packs, x) ? x : null; });
    function af(d, pid, t, who) { if (Logic.findPack(S.packs, pid)) w[d].after.push({ id: Store.uid('a'), packId: pid, time: t, who: who }); }
    var g = S.settings.guardians;
    af(1, 'a-tkd', '14:30', g[1] || ''); af(3, 'a-tkd', '14:30', g[1] || '');
    af(2, 'a-swim', '16:00', g[0] || ''); af(4, 'a-piano', '15:00', g[0] || ''); af(5, 'a-care', '13:30', '');
    var name = S.kids.some(function (k) { return k.name === '하윤'; }) ? '예시 하윤' : '하윤';
    S.kids.push({ id: id, name: name, grade: 2, periods: 6, week: w, sample: true });
    S.cur = id;
    var hs = S.settings.holidays;
    var next = Logic.bagDate(now(), S.settings);
    S.notes.push({ id: Store.uid('n'), kid: id, date: next, title: '미술 만들기', items: ['휴지 심 2개', '색종이'] });
    // 며칠 뒤 준비물 알약이 보이게, 학교 가는 날 3번 뒤 알림장 하나
    var later = Logic.nextSchoolDay(Logic.nextSchoolDay(Logic.nextSchoolDay(next, hs), hs), hs);
    if (Logic.addDays(next, 7) >= later) S.notes.push({ id: Store.uid('n'), kid: id, date: later, title: '현장체험', items: ['돗자리', '물병', '모자'] });
    // 지난 학교 가는 날 8일 기록 (가방 달력에 스티커가 섞여 보이게, 다 챙긴 날 5일)
    var k = Logic.toKey(now());
    var part = [false, true, false, true, false, false, true, false];
    for (var i = 0; i < 8; i++) {
      k = Logic.prevSchoolDay(k, hs);
      var kid = S.kids[S.kids.length - 1];
      var names = Logic.buildBag(S, kid, k).items.map(function (it) { return it.name; });
      var m = part[i] && names.length ? [names[names.length - 1]] : [];
      S.history.push({ kid: id, date: k, total: names.length, done: names.length - m.length, missed: m, sample: true });
    }
  }
  function removeSample() {
    var ids = S.kids.filter(function (k) { return k.sample; }).map(function (k) { return k.id; });
    if (!ids.length) return UI.toast('들어 있는 예시가 없어요');
    askConfirm('예시 아이와 그 기록을 뺄까요?', '빼기', function () {
      rememberUndo();
      ids.forEach(removeKid);
      save();
      UI.closeSheet('sheet-backup');
      renderAll();
      UI.toast('예시를 뺐어요', true);
    });
  }

  function runSelfTest() {
    UI.closeSheet('sheet-help');   // 도움말 마지막 쪽에서 연다 (도움말 시트가 위에 있어서)
    UI.renderSelfTest(Logic.selfTest());
    openSheet('sheet-selftest');
  }

  // ---- 눌림 처리 ----
  var ACTIONS = {
    'go': function (b) { go(b.getAttribute('data-to')); },
    'help': openHelp,
    'help-step': function (b) { helpStep(+b.getAttribute('data-d')); },
    'times-open': openTimes,
    'times-default': timesDefault,
    'look-open': function () { UI.renderLook(S); openSheet('sheet-look'); },
    'privacy-open': function () { openSheet('sheet-privacy'); },
    // 시간표 방과후 칸: 비었으면 바로 넣기, 있으면 그 요일 방과후 목록
    'after-cell': function (b) {
      var kid = curKid(), d = +b.getAttribute('data-d');
      if (!kid) return;
      if (kid.week[d].after.length) openDay(d); else openAfter(d, null);
    },
    'kid-pick': function (b) { S.cur = b.getAttribute('data-id'); V.offset = 0; save(); renderAll(); },
    'kid-new': function () { openKid(null); },
    'kid-edit': function (b) { openKid(b.getAttribute('data-id')); },
    'kid-del': deleteKid,
    'kids-open': function () { UI.renderKidsSheet(S); openSheet('sheet-kids'); },
    'day-prev': function () { V.offset--; renderAll(); },
    'day-next': function () { V.offset++; renderAll(); },
    'day-now': function () { V.offset = 0; renderAll(); },
    'bag-open': function () { if (UI.isOpen('sheet-cal')) UI.closeSheet('sheet-cal'); openBag(); },
    'check': toggleCheck,
    'check-all': checkAll,
    'bag-done': bagDone,
    'skip-item': function (b) { skipItem(b.getAttribute('data-name')); },
    'kid-mode': toggleKidMode,
    'pg': function (b) {
      var id = b.getAttribute('data-pg');
      V.pg[id] = UI.setPage(id, +b.getAttribute('data-n'));
      UI.hideBubble();
    },
    'pg-step': function (b) {
      var id = b.getAttribute('data-pg');
      V.pg[id] = UI.setPage(id, (V.pg[id] || 0) + (+b.getAttribute('data-d')));
    },
    'share': share,
    'done-copy': doneCopy,
    'upcoming': openUpcoming,
    'cal-open': openCal,
    // 가방 달력 빈 상태 버튼: 달력을 닫고 그 일을 연다 (달력 시트가 다른 시트 위에 있어서)
    'cal-kid': function () { UI.closeSheet('sheet-cal'); openKid(null); },
    'cal-prev': function () { calStep(-1); },
    'cal-next': function () { calStep(1); },
    'note-new': function () { openNote(null); },
    'note-edit': function (b) { openNote(b.getAttribute('data-id')); },
    'note-add': function () { if (noteAddItem($('note-add').value) === true) $('note-add').value = ''; },
    'note-item-del': function (b) { V.note.items.splice(+b.getAttribute('data-i'), 1); UI.renderNoteItems(V.note.items); UI.renderSupplies(S, V, V.note.items); },
    'note-supply': function (b) { noteSupply(b.getAttribute('data-name')); },
    'note-cat': function (b) { V.noteCat = b.getAttribute('data-v'); V.pg.sup = 0; UI.renderSupplies(S, V, V.note.items); },
    'note-q-clear': function () { V.noteQ = ''; V.noteCat = 'all'; V.pg.sup = 0; $('note-q').value = ''; UI.renderSupplies(S, V, V.note.items); },
    'note-del': deleteNote,
    'event-new': openEvent,
    'event-pick': function (b) { V.eventPick = b.getAttribute('data-id'); $('event-err').textContent = ''; UI.renderEvents(V.eventPick); },
    'cell': function (b) { openCell(+b.getAttribute('data-d'), +b.getAttribute('data-i')); },
    'cell-set': function (b) { setCell(b.getAttribute('data-id')); },
    'cell-clear': function () { setCell(null); },
    'cell-copy': function () { UI.renderCopyRow(V.cell.d); },
    'cell-copy-to': function (b) { copyDay(+b.getAttribute('data-d')); },
    'after-new': function (b) { openAfter(+b.getAttribute('data-d') || 1, null); },
    'after-edit': function (b) { openAfter(+b.getAttribute('data-d'), b.getAttribute('data-id')); },
    'after-del': deleteAfter,
    'pack-new': function () { openPack(null); },
    'pack-edit': function (b) { openPack(b.getAttribute('data-id')); },
    'pack-add': packAddItem,
    'pack-item-del': function (b) {
      V.pack.items.splice(+b.getAttribute('data-i'), 1);
      UI.renderPackItems(V.pack.items, Math.min(V.pg.pitems || 0, Math.max(0, Math.floor((V.pack.items.length - 1) / 12))));
    },
    'pack-del': deletePack,
    'daily-open': function () { UI.renderDaily(S); UI.clearErr('daily-add', 'daily-err'); openSheet('sheet-daily'); },
    'daily-del': function (b) {
      var i = +b.getAttribute('data-i');
      var name = S.daily[i];
      askConfirm(name + '을(를) 매일 챙길 것에서 뺄까요?', '빼기', function () {
        rememberUndo(); S.daily.splice(i, 1); save(); renderAll(); UI.toast('뺐어요', true);
      });
    },
    'daily-default': function () {
      rememberUndo(); S.daily = DATA.DAILY.slice(); save(); renderAll(); UI.toast('기본 다섯 가지를 넣었어요', true);
    },
    'rules-default': function () {
      rememberUndo();
      S.rules = DATA.RULES.map(function (r) { return { id: r.id, dow: r.dow, item: r.item, on: true }; });
      save(); renderAll(); UI.toast('기본 규칙을 넣었어요', true);
    },
    // 빈 목록의 시작 버튼: 그 목록을 채우는 입력란으로
    'focus': function (b) {
      var el = $(b.getAttribute('data-target'));
      if (el) { try { el.focus(); if (el.type === 'date' && el.showPicker) el.showPicker(); } catch (e) { /* 날짜 고르개를 못 열어도 포커스는 됐다 */ } }
    },
    'rule-toggle': function (b) {
      var id = b.getAttribute('data-id');
      S.rules.forEach(function (r) { if (r.id === id) r.on = !r.on; });
      save(); renderAll(); UI.toast('바꿨어요');
    },
    'guard-open': function () { UI.renderGuards(S); UI.clearErr('guard-add', 'guard-err'); openSheet('sheet-guard'); },
    'guard-del': function (b) {
      var i = +b.getAttribute('data-i');
      askConfirm(S.settings.guardians[i] + '을(를) 뺄까요?', '빼기', function () {
        rememberUndo(); S.settings.guardians.splice(i, 1); save(); renderAll(); UI.toast('뺐어요', true);
      });
    },
    'days-open': function () { UI.renderDays(S, todayKey()); UI.clearErr('holiday-add', 'holiday-err'); openSheet('sheet-days'); },
    'holiday-del': function (b) {
      var d = b.getAttribute('data-date');
      askConfirm(Logic.shortLabel(d) + '을(를) 쉬는 날에서 뺄까요?', '빼기', function () {
        rememberUndo();
        S.settings.holidays = S.settings.holidays.filter(function (x) { return x !== d; });
        V.offset = 0;
        save(); renderAll(); UI.toast('뺐어요', true);
      });
    },
    'font': function () {
      var f = S.settings.font || 1;
      S.settings.font = f >= 1.3 ? 1 : (f >= 1.15 ? 1.3 : 1.15);
      save(); renderAll();
    },
    'toggle-set': function (b) { var k = b.getAttribute('data-k'); S.settings[k] = !S.settings[k]; save(); renderAll(); },
    'teacher-open': openTeacher,
    'teach-add': teachAddItem,
    'teach-share': teachShare,
    'teach-copy': teachCopy,
    'teach-edit': function () { V.teach.out = null; UI.renderTeachOut(null); },
    'teach-item-del': function (b) { V.teach.items.splice(+b.getAttribute('data-i'), 1); UI.renderTeachItems(V.teach.items); },
    'export-open': openExport,
    'backup': openBackup,
    'copy-export': function () { copyText($('export-text').value, '내보내기 글을 복사했어요'); },
    'print': function () { go('bag'); try { window.print(); } catch (e) { UI.toast('인쇄할 수 없는 브라우저예요'); } },
    'sample-add': function () { UI.closeSheet('ov-welcome'); addSample(); },
    'sample-del': removeSample,
    'clear-all': function () {
      askConfirm('모든 아이·시간표·꾸러미·가방 달력을 지울까요? 되돌릴 수 없으니 먼저 내보내기를 해 두세요.', '전체 지우기', function () {
        Store.clear();
        S = Store.defaults();
        S.settings.welcomed = true;
        undoSnap = null;
        V.offset = 0;
        UI.closeSheet('sheet-backup');
        save(); renderAll(); go('bag');
        UI.toast('모두 지웠어요');
      });
    },
    'selftest-open': runSelfTest,
    'close': function () { closeTop(); },
    'confirm-yes': function () { var f = confirmFn; confirmFn = null; UI.closeSheet('ov-confirm'); if (f) f(); },
    'confirm-no': function () { confirmFn = null; UI.closeSheet('ov-confirm'); },
    'undo': doUndo,
    'welcome-start': function () { S.settings.welcomed = true; save(); UI.closeSheet('ov-welcome'); openKid(null); },
    'welcome-sample': function () { S.settings.welcomed = true; UI.closeSheet('ov-welcome'); addSample(); }
  };

  // 시트 안 동작은 그 시트를 연 뒤에만 (열린 적 없는 시트의 버튼이 눌려도 아무 일 없게)
  var NEED = {
    'cell-set': 'cell', 'cell-clear': 'cell', 'cell-copy': 'cell', 'cell-copy-to': 'cell',
    'note-add': 'note', 'note-item-del': 'note', 'note-supply': 'note', 'note-cat': 'note', 'note-q-clear': 'note', 'note-del': 'note',
    'pack-add': 'pack', 'pack-item-del': 'pack', 'pack-del': 'pack', 'after-del': 'after',
    'form-note': 'note', 'form-pack': 'pack', 'form-after': 'after', 'form-event': 'kid',
    'check': 'kid', 'check-all': 'kid', 'bag-done': 'kid', 'skip-item': 'kid',
    'teach-add': 'teach', 'teach-item-del': 'teach', 'form-teacher': 'teach', 'teach-share': 'teach', 'teach-copy': 'teach', 'teach-edit': 'teach',
    'times-default': 'times', 'form-times': 'times', 'help-step': 'help'
  };
  function ready(name) {
    var need = NEED[name];
    if (!need) return true;
    if (need === 'kid') return !!curKid();
    if (!V[need]) return false;
    return need === 'pack' || need === 'teach' || need === 'times' || need === 'help' || !!curKid();
  }

  // ---- 길게 누르기(칸의 이유·내일은 빼기, 아이가 챙겨요 끄기)와 옆으로 밀기(쪽·날짜) ----
  var press = null, swipe = null, eatClick = false;
  function onDown(e) {
    eatClick = false;
    if (!e.target.closest) return;
    var cell = e.target.closest('#sheet-bag .check');
    var kidBtn = e.target.closest('#kid-mode');
    if (cell || (kidBtn && V.kidMode)) {
      var el = cell || kidBtn;
      press = { el: el, x: e.clientX, y: e.clientY };
      press.timer = setTimeout(function () {
        if (!press) return;
        eatClick = true;
        if (press.el.id === 'kid-mode') kidModeOff(); else showWhy(press.el);
        press = null;
      }, cell ? 520 : 900);
    }
    var sw = e.target.closest('.pager, [data-swipe]');
    swipe = sw ? { el: sw, x: e.clientX, y: e.clientY } : null;
  }
  function onMove(e) {
    if (press && (Math.abs(e.clientX - press.x) > 10 || Math.abs(e.clientY - press.y) > 10)) { clearTimeout(press.timer); press = null; }
  }
  function onUp(e) {
    if (press) { clearTimeout(press.timer); press = null; }
    var s = swipe;
    swipe = null;
    if (!s) return;
    var dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    eatClick = true;
    var step = dx < 0 ? 1 : -1;
    if (s.el.getAttribute('data-swipe') === 'day') { V.offset += step; renderAll(); return; }
    var id = s.el.getAttribute('data-pg');
    if (!id) return;
    var before = V.pg[id] || 0;
    V.pg[id] = UI.setPage(id, before + step);
    if (V.pg[id] !== before) SFX.page();
    UI.hideBubble();
  }
  function onCancel() {
    if (press) { clearTimeout(press.timer); press = null; }
    swipe = null;
  }

  function onClick(e) {
    // 길게 누른 뒤나 옆으로 민 뒤 따라오는 누름은 버린다 (키보드 누름은 detail 이 0 이라 그대로)
    if (eatClick) {
      eatClick = false;
      if (e.detail !== 0) { e.preventDefault(); return; }
    }
    // 말풍선이 떠 있으면 바깥 누름은 말풍선만 닫는다
    if (UI.bubbleOpen() && !(e.target.closest && e.target.closest('#bubble'))) {
      UI.hideBubble();
      if (e.target.closest && e.target.closest('#sheet-bag .check')) return;
    }
    var b = e.target.closest && e.target.closest('[data-act]');
    if (b) {
      if (b.disabled) return;
      var name = b.getAttribute('data-act');
      var f = ACTIONS[name];
      if (f) { e.preventDefault(); if (ready(name)) f(b); }
      return;
    }
    // 시트 바깥(어두운 배경)을 누르면 닫기 (처음 안내, 아이가 챙겨요 중인 가방 시트는 빼고)
    if (e.target.classList && e.target.classList.contains('dim') && e.target.id !== 'ov-welcome') {
      if (e.target.id === 'sheet-bag' && V.kidMode) return;
      UI.closeSheet(e.target.id);
      if (e.target.id === 'ov-confirm') confirmFn = null;
      if (e.target.id === 'sheet-bag') UI.hideBubble();
    }
  }

  var FORMS = {
    'form-kid': submitKid, 'form-after': submitAfter, 'form-note': submitNote, 'form-pack': submitPack,
    'form-event': submitEvent, 'form-backup': restore,
    'form-daily': function () { addDaily($('daily-add').value); },
    'form-guard': addGuardian, 'form-holiday': addHoliday, 'form-teacher': submitTeacher, 'form-times': submitTimes
  };
  function onSubmit(e) {
    var f = FORMS[e.target.id];
    if (f) { e.preventDefault(); if (ready(e.target.id)) f(); }
  }

  function onKey(e) {
    if (e.key === 'Escape') { if (UI.bubbleOpen()) { UI.hideBubble(); e.preventDefault(); return; } if (closeTop()) e.preventDefault(); return; }
    if (e.key === 'Enter' && e.target && e.target.id === 'note-add' && V.note) {
      e.preventDefault();
      if (noteAddItem(e.target.value) === true) e.target.value = '';
    } else if (e.key === 'Enter' && e.target && e.target.id === 'pack-add' && V.pack) {
      e.preventDefault();
      packAddItem();
    } else if (e.key === 'Enter' && e.target && e.target.id === 'teach-add' && V.teach) {
      e.preventDefault();
      teachAddItem();
    } else if (e.key === 'Enter' && e.target && e.target.id === 'note-q') {
      e.preventDefault();
    } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && UI.isOpen('sheet-bag') && !(e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) {
      // 키보드로 가방 시트 쪽 넘기기
      e.preventDefault();
      V.pg.bag = UI.setPage('bag', (V.pg.bag || 0) + (e.key === 'ArrowRight' ? 1 : -1));
    }
  }

  function onChange(e) {
    var t = e.target;
    if (t.id === 'note-sort' && V.note) { V.noteSort = t.value; V.pg.sup = 0; UI.renderSupplies(S, V, V.note.items); }
    if (t.getAttribute && t.getAttribute('data-set') === 'switchHour') {
      S.settings.switchHour = +t.value;
      V.offset = 0;
      save(); renderAll();
      UI.toast('바꿨어요');
    }
    if (t.classList && t.classList.contains('bad')) t.classList.remove('bad');
  }

  // 찾는 말: 칠 때마다 준비물 격자만 다시 그린다 (입력란 포커스가 그대로)
  function onInput(e) {
    var t = e.target;
    if (t.id === 'note-q' && V.note) { V.noteQ = t.value; V.pg.sup = 0; UI.renderSupplies(S, V, V.note.items); }
    else if ((t.id === 'teach-class' || t.id === 'teach-memo' || t.id === 'teach-date') && V.teach) { V.teach.out = null; UI.renderTeachOut(null); } // 내용이 바뀌면 옛 링크를 치운다
  }

  // 날짜가 바뀌면(자정 넘김, 오래 켜 둔 화면) 다시 계산
  var lastDay = null;
  function tick() {
    var t = todayKey();
    if (lastDay && t !== lastDay) {
      Logic.closePast(S, t);
      V.offset = 0;
      save();
      renderAll();
    }
    lastDay = t;
  }

  function init() {
    var ml = $('manifest-link');  // 홈 화면 추가 (웹 주소로 열었을 때만)
    if (ml && /^https?:$/.test(location.protocol)) ml.setAttribute('href', ml.getAttribute('data-href'));
    var r = Store.load();
    S = r.data;
    if (!r.ok) $('store-warn').classList.add('on');
    Logic.closePast(S, todayKey());
    lastDay = todayKey();
    renderAll();
    document.addEventListener('click', onClick);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('keydown', onKey);
    document.addEventListener('change', onChange);
    document.addEventListener('input', onInput);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    document.addEventListener('contextmenu', function (e) { if (e.target.closest && e.target.closest('#sheet-bag .check, #kid-mode')) e.preventDefault(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(); });
    window.addEventListener('hashchange', readTeachHash);
    setInterval(tick, 60000);
    if (!S.settings.welcomed && !/^#t=/.test(location.hash || '')) UI.openSheet('ov-welcome');
    readTeachHash();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
