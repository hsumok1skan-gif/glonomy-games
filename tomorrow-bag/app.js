/* 내일 가방 — 상태와 동작 */
(function () {
  var $ = UI.$;
  var S = null;                 // 저장되는 데이터
  var V = {                     // 화면 상태 (저장하지 않음)
    screen: 'bag', offset: 0, pg: {}, kidMode: false, cal: null,
    noteQ: '', noteCat: 'all', noteSort: 'base',          // 알림장 준비물 찾기·거르기·순서
    noteMore: false,                                       // 알림장 '더 찾기' 펼침 (열 때마다 접힘)
    cell: null, after: null, day: null, note: null, pack: null, eventPick: null, kidEdit: null, teach: null,
    edit: null,                                            // 이날만 바꾸기 시트 { k: 날짜, off: {방과후 id: true} }
    kidStep: 1,                                            // 아이 넣기 시트의 걸음 (1 이름·학년·기본 시간표, 2 방과후, 3 오늘 알림장)
    kidAfter: null,                                        // 아이 넣기 시트의 방과후 고르기 { pack, days, who, list: 넣어 둔 것 }
    tplCell: null, tplEdits: {},                           // 아이 넣기 1단계 미리 보기: 고르는 중인 칸 {d, i}, 고친 칸 {'d-i': 꾸러미 id | null}
    kidNote: null,                                         // 아이 넣기 3단계 오늘 알림장에서 칩으로 고른 준비물 [이름] (새 아이일 때만, 글은 저장할 때 읽는다)
    times: null, help: null,                               // 교시 시간 시트, 도움말 (쪽 번호와 찍어 둔 화면)
    family: null,                                          // 가족 링크 시트 { name, link }
    firstBag: false,                                       // 기본 시간표로 아이를 막 넣었다 → 가방 화면에 처음 가방 카드
    tour: null,                                            // 첫 둘러보기 걸음 (0~3, 안 하는 중이면 null)
    dscope: null                                           // 매일 · 요일 시트에서 고르는 목록: null 모든 아이 공용, 아이 id 면 그 아이 목록
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
    if (V.tour !== null) { V.tour = null; UI.hideTour(); S.settings.tourSeen = true; }   // 예시를 되돌리면 둘러보기도 끝낸다
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
  // 기기 어두운 화면 설정 (matchMedia 가 없는 브라우저는 null → 밝게)
  var darkMQ = null;
  try { darkMQ = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null; } catch (e) { darkMQ = null; }
  function isDark() {
    var d = S.settings.dark;
    if (d === 'auto') return !!(darkMQ && darkMQ.matches);
    return d === true;
  }
  function applySettings() {
    document.body.classList.toggle('dark', isDark());
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
    // 가방 탭 배지: 지금 아이의 오늘 밤 가방에 남은 물건 수 (밤 물건을 다 챙겼으면 0)
    var left = 0;
    if (kid) {
      var tbag = Logic.buildBag(S, kid, Logic.bagDate(new Date(), S.settings));
      var tpr = Logic.progress(S, kid, tbag);
      left = Logic.nightDone(S, kid, tbag) ? 0 : tpr.total - tpr.done;
    }
    UI.setTabBadge(left);
    if (kid && UI.isOpen('sheet-upcoming')) UI.renderUpcoming(S, kid, bagKey(), t);
    if (kid && UI.isOpen('sheet-weekbag')) UI.renderWeekBag(S, kid, Logic.bagDate(now(), S.settings), t);
    // 열려 있는 시트도 새 데이터로
    if (UI.isOpen('sheet-bag')) {
      if (kid) UI.renderBagSheet(S, V, kid, Logic.buildBag(S, kid, bagKey()));
      else UI.closeSheet('sheet-bag');
    }
    if (UI.isOpen('sheet-kids')) UI.renderKidsSheet(S);
    if (UI.isOpen('sheet-guard')) UI.renderGuards(S);
    if (UI.isOpen('sheet-days')) UI.renderDays(S, t);
    if (UI.isOpen('sheet-daily')) UI.renderDaily(S, dScopeKid() ? V.dscope : null);
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
  // 닫아도 되는 창인지 (처음 안내, 아이가 챙겨요 중인 가방 시트는 닫히지 않는다)
  function canClose(el) {
    if (!el || el.id === 'ov-welcome') return false;
    if (el.id === 'sheet-bag' && V.kidMode) return false;   // 아이가 챙겨요: 어른이 끄기 전에는 닫히지 않는다
    return true;
  }
  function closeEl(el) {
    UI.closeSheet(el.id);
    if (el.id === 'ov-confirm') confirmFn = null;
    if (el.id === 'sheet-bag') UI.hideBubble();
  }
  function closeTop() {
    if (V.tour !== null) { endTour(); return true; }   // 예시 둘러보기가 맨 위 (Esc 로도 끝내고 다시 띄우지 않는다)
    var on = UI.openSheets();
    if (!on.length) return false;
    var el = on[on.length - 1];
    if (!canClose(el)) return false;
    closeEl(el);
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

  // ---- 읽어 주기: 아이가 챙겨요에서 넣은 물건 이름을 기기 음성으로 (설정 → 화면 색 → 읽어 주기) ----
  // 기기 안의 음성만 쓴다. 소리를 껐거나 읽어 주기를 껐거나 음성이 없는 브라우저면 말하지 않는다
  function speak(text) {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    if (S.settings.mute !== false || S.settings.speak !== true) return;
    try {
      window.speechSynthesis.cancel();   // 앞 말이 남아 있으면 끊고 새로 말한다 (빨리 여러 칸을 눌러도 밀리지 않게)
      var u = new window.SpeechSynthesisUtterance(String(text || ''));
      u.lang = 'ko-KR';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    } catch (e) { /* 읽어 주지 못해도 앱은 돈다 */ }
  }

  // ---- 진동: 진동이 되는 기기에서만 짧게 (설정 → 화면 색 → 진동) ----
  function haptic(ms) {
    if (!S.settings.vibe || !navigator.vibrate) return;
    try { navigator.vibrate(ms); } catch (e) { /* 진동이 안 돼도 앱은 돈다 */ }
  }

  // ---- 아이 ----
  function openKid(id) {
    V.kidEdit = id || null;
    var k = null;
    S.kids.forEach(function (x) { if (x.id === id) k = x; });
    $('kid-name').value = k ? k.name : '';
    $('kid-grade').value = k ? String(k.grade) : '1';
    // 얼굴: 고치기는 그 아이 것, 새 아이는 다른 아이가 아직 안 쓴 첫 얼굴
    if (k) V.kidAva = k.avatar >= 0 && k.avatar <= 11 ? k.avatar : 0;
    else {
      var used = S.kids.map(function (x) { return x.avatar; });
      V.kidAva = 0;
      for (var ai = 0; ai < DATA.STICKERS.length; ai++) if (used.indexOf(ai) < 0) { V.kidAva = ai; break; }
    }
    UI.renderKidAvatars(V.kidAva);
    $('kid-del').style.display = k ? '' : 'none';
    $('kid-template').checked = !k;
    $('kid-template-row').style.display = k ? 'none' : '';   // 고치기 모드에서는 이미 채운 칸을 건드리지 않는다
    V.tplEdits = {};                                          // 미리 보기에서 고친 칸은 열 때마다 비운다
    V.tplCell = null;
    renderTpl();                                              // 새 아이면 채워질 표를 미리 보여 준다
    // 방과후 고르기도 새 아이일 때만 (고치기는 시간표 탭의 방과후 칸에서)
    V.kidAfter = k ? null : { pack: null, days: [], who: '', list: [] };
    $('kid-after-time').value = '15:00';
    $('kid-after-new').value = '';
    $('kid-after-who-new').value = '';
    UI.clearErr('kid-after-new', '');
    UI.clearErr('kid-after-who-new', '');
    UI.clearErr('kid-after-time', 'kid-after-err');
    if (k) $('kid-after').style.display = 'none';
    else UI.renderKidAfter(S, V.kidAfter);
    // 오늘 알림장도 새 아이일 때만 (고치기는 가방 화면의 '+ 알림장')
    V.kidNote = k ? null : [];
    $('kid-note-paste').value = '';
    $('kid-note-found').textContent = '';
    UI.clearErr('kid-note-paste', 'kid-note-err');
    if (!k) UI.renderKidNote(V.kidNote, S);
    UI.clearErr('kid-name', 'kid-err');
    // 새 아이는 이름을 넣기 전까지 '다음' 을 흐리게 막아 둔다 (빈 칸 오류를 먼저 띄우지 않는다)
    $('kid-next').disabled = !k;
    showKidStep(1);
    openSheet('sheet-kid');
    if (!k) $('kid-name').focus();
  }
  // 걸음에 따라 한 단계만 보인다. 고치기는 1단계 칸과 저장 버튼만 (진행 점 없음, 2·3단계 없음)
  function showKidStep(n) {
    var edit = !!V.kidEdit;
    if (edit || n < 1 || n > 3) n = 1;
    V.kidStep = n;
    var dots = $('kid-steps');
    for (var i = 1; i <= 3; i++) {
      $('kid-step-' + i).style.display = i === n ? '' : 'none';
      if (dots.children[i - 1]) dots.children[i - 1].classList.toggle('on', i === n);
    }
    dots.style.display = edit ? 'none' : '';
    dots.setAttribute('aria-label', '3단계 중 ' + n + '단계');
    $('kid-title').textContent = edit ? '아이 고치기' : (n === 3 ? '오늘 알림장에 준비물이 있나요?' : n === 2 ? '방과후가 있나요?' : '아이 이름을 알려 주세요');
    $('kid-next').style.display = !edit && n === 1 ? '' : 'none';
    $('kid-back').style.display = n > 1 ? '' : 'none';
    $('kid-skip').style.display = n > 1 ? '' : 'none';
    $('kid-save').style.display = edit || n > 1 ? '' : 'none';
    $('kid-save').textContent = n === 2 ? '다음' : '저장';   // 2단계의 저장은 3단계로 넘어간다
    if (n === 2 && V.kidAfter) UI.renderKidAfter(S, V.kidAfter);   // 건너뛰기 막힘(고른 것이 있을 때)을 다시 맞춘다
    if (n === 3) { $('kid-skip').disabled = false; if (V.kidNote) UI.renderKidNote(V.kidNote, S); }
  }
  function hasAcad() { return S.packs.some(function (p) { return p.kind === 'acad'; }); }
  // 2단계 저장: 고르는 중인 방과후를 검사해 넣어 두고 3단계로
  function kidAfterDone() {
    if (!checkKidName()) return showKidStep(1);
    var ka = V.kidAfter;
    if (ka && ka.pack) {
      if (!checkKidAfter()) return;
      keepKidAfter();
      UI.renderKidAfter(S, ka);
    }
    showKidStep(3);
    $('kid-title').focus();
  }
  // 2단계 건너뛰기는 3단계로, 3단계 건너뛰기는 알림장 없이 저장
  function kidSkip() {
    if (V.kidEdit) return;
    if (V.kidStep === 2) { showKidStep(3); $('kid-title').focus(); return; }
    if (V.kidStep === 3) {
      V.kidNote = [];
      $('kid-note-paste').value = '';
      $('kid-note-found').textContent = '';
      UI.clearErr('kid-note-paste', 'kid-note-err');
      submitKid();
    }
  }
  function kidBack() {
    if (V.kidStep === 3 && hasAcad()) { showKidStep(2); $('kid-title').focus(); return; }
    showKidStep(1);
    $('kid-name').focus();
  }
  // 3단계 칩: 누르면 V.kidNote 에 넣고, 다시 누르면 뺀다
  function kidNoteSupply(name) {
    if (!V.kidNote || !name) return;
    var i = V.kidNote.indexOf(name);
    if (i >= 0) V.kidNote.splice(i, 1);
    else V.kidNote.push(name);
    UI.renderKidNote(V.kidNote, S);
  }
  // 3단계 오늘 알림장: 칩으로 고른 것 + 글(#kid-note-paste)에서 찾은 것, 중복 없이 30개까지. 날짜는 글에서 찾았으면 그 날, 아니면 다음 가방 날
  function kidNoteResult() {
    var r = Logic.parseNoteText(String($('kid-note-paste').value || '').slice(0, 1000), todayKey());
    var items = [], seen = {};
    (V.kidNote || []).concat(r.items).forEach(function (x) {
      var t = Logic.norm(x), key = t.toLowerCase();
      if (!t || t.length > 40 || seen[key]) return;
      seen[key] = true;
      items.push(t);
    });
    var d = r.date && Logic.validKey(r.date) ? r.date : Logic.bagDate(new Date(), S.settings);
    return { date: d, items: items.slice(0, 30) };
  }
  // 글을 칠 때마다 찾은 준비물 수만 알려 준다 (넣는 것은 저장할 때)
  function kidNotePaste() {
    if (!V.kidNote) return;
    var txt = String($('kid-note-paste').value || '');
    var r = Logic.parseNoteText(txt.slice(0, 1000), todayKey());
    $('kid-note-found').textContent = !Logic.norm(txt) ? '' :
      (r.items.length ? (r.date ? Logic.shortLabel(r.date) + ' · ' : '') + '글에서 준비물 ' + r.items.length + '개를 찾았어요. 저장하면 함께 넣어요.' : '글에서 준비물을 아직 찾지 못했어요. 칩을 눌러 골라도 돼요.');
  }
  // 이름 검사: 통과하면 다듬은 이름, 아니면 오류를 띄우고 null
  function checkKidName() {
    var name = Logic.norm($('kid-name').value);
    if (!name) { UI.fieldErr('kid-name', 'kid-err', '이름을 넣어 주세요.'); return null; }
    if (name.length > Store.MAX_NAME) { UI.fieldErr('kid-name', 'kid-err', '이름은 ' + Store.MAX_NAME + '자 안으로 넣어 주세요.'); return null; }
    var dup = S.kids.some(function (x) { return x.name === name && x.id !== V.kidEdit; });
    if (dup) { UI.fieldErr('kid-name', 'kid-err', '같은 이름의 아이가 있어요. 다른 이름으로 불러 주세요.'); return null; }
    return name;
  }
  function kidNext() {
    if (!checkKidName()) return;
    UI.clearErr('kid-name', 'kid-err');
    // 고를 방과후 꾸러미가 없으면 2단계가 비어 있으니 바로 3단계(오늘 알림장)로
    showKidStep(hasAcad() ? 2 : 3);
    $('kid-title').focus();   // 숨은 칸에 남은 포커스를 옮기고 휴대폰 글자판을 닫는다
  }
  // 1단계의 엔터(폼 제출)는 다음 걸음으로, 2단계 저장은 3단계로, 3단계·고치기는 저장으로
  function kidSubmit() {
    if (!V.kidEdit && V.kidStep === 1) {
      if (!Logic.norm($('kid-name').value)) return;   // 빈 이름의 엔터는 오류 없이 넘긴다 ('다음' 이 막혀 있다)
      kidNext();
    }
    else if (!V.kidEdit && V.kidStep === 2) kidAfterDone();
    else submitKid();
  }
  // 고르는 중인 방과후 검사: 요일 하나 이상, 시각은 8시~22시, 넣어 둔 것과 시각이 겹치지 않고 한 요일 6개까지 (submitAfter 와 같은 규칙)
  function checkKidAfter() {
    var ka = V.kidAfter, t = $('kid-after-time').value;
    if (!ka.days.length) { $('kid-after-err').textContent = '방과후에 가는 요일을 골라 주세요.'; UI.flash($('kid-after-days')); return false; }
    if (!/^\d{2}:\d{2}$/.test(t) || t < '08:00' || t > '22:00') { UI.fieldErr('kid-after-time', 'kid-after-err', '오전 8시에서 밤 10시 사이로 넣어 주세요.'); return false; }
    var same = ka.list.filter(function (a) { return a.time === t; }).some(function (a) { return a.days.some(function (d) { return ka.days.indexOf(d) >= 0; }); });
    if (same) { UI.fieldErr('kid-after-time', 'kid-after-err', '같은 시각에 이미 다른 방과후가 있어요.'); return false; }
    var full = ka.days.some(function (d) { return ka.list.filter(function (a) { return a.days.indexOf(d) >= 0; }).length >= 6; });
    if (full) { $('kid-after-err').textContent = '한 요일에 방과후는 6개까지 넣을 수 있어요.'; return false; }
    return true;
  }
  // 고른 방과후를 넣어 둔 목록으로 옮기고 다음 곳을 고를 수 있게 비운다
  function keepKidAfter() {
    var ka = V.kidAfter;
    ka.list.push({ pack: ka.pack, days: ka.days, time: $('kid-after-time').value, who: ka.who });
    ka.pack = null; ka.days = []; ka.who = '';
    $('kid-after-time').value = '15:00';
    UI.clearErr('kid-after-time', 'kid-after-err');
  }
  // 목록에 없는 학원: 이름만으로 방과후 꾸러미를 만들고 바로 고른 것으로 둔다 (챙길 물건은 꾸러미 탭에서 넣는다)
  function kidAfterNewAdd() {
    var ka = V.kidAfter, name = Logic.norm($('kid-after-new').value);
    if (!name) return UI.fieldErr('kid-after-new', 'kid-after-err', '학원 이름을 넣어 주세요.');
    if (name.length > 40) return UI.fieldErr('kid-after-new', 'kid-after-err', '40자 안으로 넣어 주세요.');
    var dup = S.packs.some(function (p) { return p.kind === 'acad' && p.name === name; });
    if (dup) return UI.fieldErr('kid-after-new', 'kid-after-err', '같은 이름의 방과후가 있어요. 위 칩에서 골라 주세요.');
    var p = { id: Store.uid('p'), kind: 'acad', name: name, icon: '🎒', pic: Logic.iconFor(name).id, items: [] };
    S.packs.push(p);
    save();
    ka.pack = p.id; ka.days = []; ka.who = ''; ka.custom = false;
    $('kid-after-new').value = '';
    UI.clearErr('kid-after-new', '');
    UI.clearErr('kid-after-time', 'kid-after-err');
    UI.renderKidAfter(S, ka);
    UI.toast('"' + name + '" 꾸러미를 만들었어요. 요일을 골라 주세요');
  }
  // 목록에 없는 데리러 갈 사람: 첫 시트에서 바로 넣고 그 사람을 고른 것으로 둔다 (설정 → 데리러 갈 사람과 같은 목록, 같은 규칙)
  function kidAfterWhoAdd() {
    var ka = V.kidAfter;
    if (!ka || !ka.pack) return;
    var t = Logic.norm($('kid-after-who-new').value), gs = S.settings.guardians;
    if (!t) return UI.fieldErr('kid-after-who-new', 'kid-after-err', '이름을 넣어 주세요.');
    if (t.length > 12) return UI.fieldErr('kid-after-who-new', 'kid-after-err', '12자 안으로 넣어 주세요.');
    if (gs.indexOf(t) >= 0) return UI.fieldErr('kid-after-who-new', 'kid-after-err', '이미 있어요. 위 칩에서 골라 주세요.');
    if (gs.length >= 8) return UI.fieldErr('kid-after-who-new', 'kid-after-err', '8명까지 넣을 수 있어요.');
    gs.push(t);
    save();
    ka.who = t; ka.whoCustom = false;
    $('kid-after-who-new').value = '';
    UI.clearErr('kid-after-who-new', 'kid-after-err');
    UI.renderKidAfter(S, ka);
    UI.toast('"' + t + '"을(를) 데리러 갈 사람에 넣었어요');
  }
  // 아이 넣기 1단계 미리 보기와 그 아래 고르기 줄을 지금 학년·체크·고친 칸으로 다시 그린다
  function tplOn() { return !V.kidEdit && $('kid-template').checked; }
  function renderTpl() {
    var grade = +$('kid-grade').value;
    if (!tplOn()) V.tplCell = null;
    UI.renderTplPreview(S, grade, tplOn(), V.tplEdits, V.tplCell);
    UI.renderTplPick(S, grade, V.tplEdits, V.tplCell);
  }
  function tplFocus(c) {
    var b = c && document.querySelector('#kid-tpl-preview [data-d="' + c.d + '"][data-i="' + c.i + '"]');
    if (b) b.focus();
  }
  function tplCell(b) {
    if (!tplOn()) return;
    var d = +b.getAttribute('data-d'), i = +b.getAttribute('data-i');
    if (!(d >= 1 && d <= 5 && i >= 0)) return;
    var same = V.tplCell && V.tplCell.d === d && V.tplCell.i === i;
    V.tplCell = same ? null : { d: d, i: i };   // 같은 칸을 다시 누르면 고르기 줄을 닫는다
    renderTpl();
    tplFocus({ d: d, i: i });
  }
  function tplSet(b) {
    var c = V.tplCell;
    if (!c || !tplOn()) return;
    var id = b.getAttribute('data-id') || null;
    if (id && !Logic.findPack(S.packs, id)) return;
    V.tplEdits[c.d + '-' + c.i] = id;
    V.tplCell = null;
    renderTpl();
    tplFocus(c);
    var pk = id ? Logic.findPack(S.packs, id) : null;
    UI.toast(DATA.DOW[c.d] + ' ' + (c.i + 1) + '교시 → ' + (pk ? pk.name : '빈 칸'));
  }
  function submitKid() {
    var name = checkKidName();
    if (!name) return;
    var grade = +$('kid-grade').value;
    // 새 아이의 방과후: 고르는 중인 것이 있으면 검사해서 넣어 둔 목록에 더한다
    var ka = !V.kidEdit && V.kidAfter ? V.kidAfter : null;
    if (ka && ka.pack) {
      if (!checkKidAfter()) return;
      keepKidAfter();
    }
    var kaList = ka ? ka.list.filter(function (a) { return Logic.findPack(S.packs, a.pack); }) : [];
    rememberUndo();
    var k = null;
    S.kids.forEach(function (x) { if (x.id === V.kidEdit) k = x; });
    var filled = false;
    var ava = V.kidAva >= 0 && V.kidAva <= 11 && V.kidAva % 1 === 0 ? V.kidAva : 0;
    if (k) { k.name = name; k.grade = grade; k.avatar = ava; }
    else {
      var np = S.settings.gradeP[grade] || 6;   // 학년별 교시 수 (설정 → 교시 시간)
      k = { id: Store.uid('k'), name: name, grade: grade, periods: np, week: Store.emptyWeek(np), avatar: ava };
      var tw = $('kid-template').checked ? Logic.gradeWeek(DATA.TIMETABLES, S.packs, grade, k.periods) : null;
      // 미리 보기에서 눌러 고친 칸을 기본 시간표 위에 덮는다 (교시 수 밖·지운 꾸러미는 버림)
      if (tw) Object.keys(V.tplEdits || {}).forEach(function (key) {
        var m = /^([1-5])-(\d+)$/.exec(key);
        if (!m || +m[2] >= k.periods) return;
        var id = V.tplEdits[key];
        tw[+m[1]][+m[2]] = id && Logic.findPack(S.packs, id) ? id : null;
      });
      if (tw) for (var d = 1; d <= 5; d++) { k.week[d].p = tw[d]; if (tw[d].some(Boolean)) filled = true; }
      kaList.forEach(function (a) {
        a.days.forEach(function (w) { k.week[w].after.push({ id: Store.uid('a'), packId: a.pack, time: a.time, who: a.who }); });
      });
      S.kids.push(k);
      // 3단계 오늘 알림장: 고른 준비물을 글에서 찾은 날(없으면 다음 가방 날) 알림장으로 넣는다
      var kn = V.kidNote ? kidNoteResult() : null;
      var nItems = kn ? kn.items : [];
      if (nItems.length) S.notes.push({ id: Store.uid('n'), kid: k.id, date: kn.date, title: '알림장', items: nItems });
    }
    S.cur = k.id;
    V.offset = 0;
    save();
    UI.closeSheet('sheet-kid');
    renderAll();
    if (!V.kidEdit && pendingTeach) return applyTeach();   // 선생님 링크로 받아 둔 준비물을 이 아이 가방에
    var kaMsg = kaList.length > 1 ? ' · 방과후 ' + kaList.length + '곳 넣었어요' : (kaList.length ? ' · 방과후 ' + kaList[0].days.length + '일 넣었어요' : '');
    if (!V.kidEdit && nItems && nItems.length) kaMsg += ' · 알림장 ' + nItems.length + '개';
    UI.toast(V.kidEdit ? '고쳤어요' : (filled ? grade + '학년 기본 시간표로 채웠어요' : Logic.nameI(name) + ' 시간표를 채워 볼까요?') + kaMsg, !!V.kidEdit);
    if (!V.kidEdit) {
      UI.closeSheet('sheet-kids');
      // 기본 시간표로 칸을 채웠으면 그 시간표가 만든 내일 가방을 바로 보여 준다
      if (filled) {
        V.offset = 0; V.firstBag = true; renderAll(); go('bag');
        // 처음 한 번: '시작하기'로 넣은 내 아이 가방에서도 네 곳을 차례로 짚어 준다 (R-78)
        if (S.settings.tourSeen === false) { V.tour = 0; if (!tourSync(UI.showTour(0))) endTour(); else setTimeout(placeTour, 300); }
      }
      else go('week');
    }
  }
  // 처음 가방 카드를 닫는다 (한 번 보면 다시 띄우지 않는다)
  function seeFirstBag() {
    V.firstBag = false;
    if (S.settings.firstBagSeen) return;
    S.settings.firstBagSeen = true;
    save();
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
    Object.keys(S.outs).forEach(function (ck) { if (ck.indexOf(id + '|') === 0) delete S.outs[ck]; });
    Object.keys(S.dayEdits).forEach(function (ck) { if (ck.indexOf(id + '|') === 0) delete S.dayEdits[ck]; });
    if (S.cur === id) S.cur = S.kids[0] ? S.kids[0].id : null;
  }

  // ---- 가방 시트: 칸을 누르면 쏙, 다 챙기면 닫히며 칭찬 스티커 ----
  function openBag() {
    var kid = curKid();
    if (!kid) return UI.toast('아이를 먼저 알려 주세요');
    var bag = Logic.buildBag(S, kid, bagKey());
    if (!bag.items.length) return UI.toast('이날 챙길 물건이 아직 없어요');
    V.pg.bag = 0;
    UI.showBagAdd(false);
    UI.renderBagSheet(S, V, kid, bag);
    // 알림장 쪽이 없어 맨 앞이 '+ 물건' 칸만 있는 쪽이면, 열 때는 물건이 있는 다음 쪽부터 보여 준다
    var pg0 = document.querySelector('#bs-pages .pg');
    if (pg0 && !pg0.querySelector('.check:not(.add-cell)')) { V.pg.bag = 1; UI.renderBagSheet(S, V, kid, bag); }
    openSheet('sheet-bag');
    zipOpenBag();
  }
  // 여는 순간 지퍼 열림: 'opening' 을 붙이면 CSS 가 입구(zipOpen)와 칸(cellIn, 차례로)을 움직인다.
  // 마지막 칸 애니메이션은 0.33s 지연 + 0.28s 라 약 700ms 뒤 뗀다(움직임 줄이기면 애니메이션이 없어 타이머로만).
  var zipTimer = 0;
  function zipOpenBag() {
    var sh = document.querySelector('#sheet-bag .bag-sheet');
    if (!sh) return;
    clearTimeout(zipTimer);
    sh.classList.remove('opening');
    void sh.offsetWidth;
    sh.classList.add('opening');
    zipTimer = setTimeout(function () { sh.classList.remove('opening'); }, 700);
  }
  // 가방 시트 '+ 물건': 그날 가방에 물건을 바로 하나 더 넣는다. 그 아이·그날의 '가방에서 넣음' 알림장에 이어 붙인다 (없으면 새로)
  var BAG_ADD_TITLE = '가방에서 넣음';
  function bagAdd() {
    var kid = curKid();
    if (!kid) return;
    var t = Logic.norm($('bag-add').value);
    if (!t) return UI.fieldErr('bag-add', 'bag-add-err', '물건 이름을 넣어 주세요.');
    if (t.length > 40) return UI.fieldErr('bag-add', 'bag-add-err', '40자 안으로 넣어 주세요.');
    var k = bagKey();
    var key = t.toLowerCase();
    var have = Logic.buildBag(S, kid, k).items.some(function (it) { return Logic.norm(it.name).toLowerCase() === key; });
    if (have) return UI.fieldErr('bag-add', 'bag-add-err', '이날 가방에 이미 있어요.');
    var n = S.notes.filter(function (x) { return x.kid === kid.id && x.date === k && x.title === BAG_ADD_TITLE; })[0];
    if (n && n.items.length >= 30) return UI.fieldErr('bag-add', 'bag-add-err', '한 번에 30개까지 넣을 수 있어요.');
    rememberUndo();
    if (n) n.items.push(t);
    else S.notes.push({ id: Store.uid('n'), kid: kid.id, date: k, title: BAG_ADD_TITLE, items: [t] });
    refreshHistory(kid, k);
    save();
    $('bag-add').value = '';
    UI.clearErr('bag-add', 'bag-add-err');
    UI.renderBagSheet(S, V, kid, Logic.buildBag(S, kid, k));
    var pg = UI.pageOfCell(t);
    if (pg >= 0) V.pg.bag = pg;
    renderAll();
    UI.flash(UI.cellByName(t));
    SFX.page();
    UI.toast(t + ' 넣었어요', true);
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
  // 지금 쪽을 다 챙겼으면 도장과 쏙이 끝난 뒤 다음 쪽으로 넘긴다. 그 사이 다시 누르거나, 쪽을 옮기거나, 시트를 닫았으면 그대로 둔다
  var PAGE_NEXT_MS = 400, pageTimer = null;
  function autoNextPage() {
    if (!UI.isOpen('sheet-bag') || UI.nextBagPage() < 0) return;
    var from = V.pg.bag || 0;
    pageTimer = setTimeout(function () {
      if (!UI.isOpen('sheet-bag') || swipe || (V.pg.bag || 0) !== from) return;
      var n = UI.nextBagPage();
      if (n < 0) return;
      V.pg.bag = UI.setPage('bag', n);
      UI.focusBagPage(n);
      UI.hideBubble();
      SFX.page();
    }, PAGE_NEXT_MS);
  }
  // 챙긴 칸은 도장이 찍힌 뒤 같은 쪽 뒤로 가라앉는다(R-70). 그 사이 다시 누르거나 쪽을 옮기거나 시트를 닫으면 취소
  var SINK_DELAY_MS = 500, sinkTimer = null;
  function sinkLater(name) {
    clearTimeout(sinkTimer);
    var from = V.pg.bag || 0;
    sinkTimer = setTimeout(function () {
      sinkTimer = null;
      if (!UI.isOpen('sheet-bag') || swipe || (V.pg.bag || 0) !== from) return;
      var c = UI.cellByName(name);
      if (c) UI.sinkCell(c);
    }, SINK_DELAY_MS);
  }
  function toggleCheck(btn) {
    var kid = curKid();
    if (!kid) return;
    clearTimeout(pageTimer);
    clearTimeout(sinkTimer);
    var k = bagKey(), name = btn.getAttribute('data-name');
    var ck = Logic.checkKey(kid.id, k);
    var list = S.checks[ck] || (S.checks[ck] = []);
    var wasNight = Logic.nightDone(S, kid, Logic.buildBag(S, kid, k));
    var i = list.indexOf(name);
    if (i >= 0) list.splice(i, 1); else list.push(name);
    // 처음 한 칸을 눌렀으면 누르기 안내를 끈다 (다시 띄우지 않는다)
    if (!S.settings.coachSeen) {
      S.settings.coachSeen = true;
      var co = document.querySelectorAll('#sheet-bag .check.coach');
      for (var c = 0; c < co.length; c++) co[c].classList.remove('coach');
    }
    refreshHistory(kid, k);
    save();
    var bag = Logic.buildBag(S, kid, k);
    var pr = Logic.progress(S, kid, bag);
    // 하나만 바꾸면 그 자리만 고친다 (가방 그림과 고리가 차오르게). 처음 설정 카드가 떠 있으면 다시 그린다
    if ($('setup-steps') || !UI.updateBag(S, kid, bag, name)) renderAll();
    // 다시 그리지 않은 경우에도 가방 탭 배지를 맞춘다 (오늘 밤 가방일 때만)
    else if (k === Logic.bagDate(now(), S.settings)) UI.setTabBadge(Logic.nightDone(S, kid, bag) ? 0 : pr.total - pr.done);
    var cell = UI.cellByName(name);
    if (i < 0) {
      UI.stamp(cell);
      UI.fly(cell, V.kidMode);
      UI.avaCheer('hop');   // 시트 제목의 아이 얼굴이 폴짝 뛴다
      (V.kidMode ? SFX.inKid : SFX.in)();
      if (V.kidMode) speak(name + ' 쏙');   // 글자를 아직 잘 못 읽는 아이도 무엇을 넣었는지 듣는다
      haptic(V.kidMode ? [12, 40, 12] : 12);
      // 아침에 넣을 물건만 남아도 밤에는 다 챙긴 것으로 친다. 아침 물건을 하나씩 넣을 때는(가방 화면 아침 줄) 다 넣었을 때만 다시 띄운다
      if ((pr.total && pr.done === pr.total) || (!wasNight && Logic.nightDone(S, kid, bag))) completeBag(kid, k);
      // 처음 챙긴 뒤 한 번만 길게 누르기를 알려 준다 ('알겠어요'를 누르면 다음 쪽으로)
      else if (!V.kidMode && !S.settings.holdTipSeen && UI.showHoldTip(cell)) seeHoldTip();   // 말풍선이 그 칸을 가리키는 동안은 옮기지 않는다
      else { autoNextPage(); if (cell) sinkLater(name); }
    } else {
      SFX.out(); haptic(6);
      if (cell) sinkLater(name);   // 다시 뺀 칸은 안 챙긴 칸 맨 뒤로 돌아온다
    }
  }
  // 길게 누르기 말풍선을 봤다 (다시 띄우지 않는다)
  function seeHoldTip() {
    if (S.settings.holdTipSeen) return;
    S.settings.holdTipSeen = true;
    save();
  }
  // '꺼낼 것' 칸: 어제 가방에서 꺼냈다고 표시만 한다 (챙김 수·기록·다 챙김에는 넣지 않는다)
  function toggleOut(btn) {
    var kid = curKid();
    if (!kid) return;
    var ck = Logic.checkKey(kid.id, bagKey()), name = btn.getAttribute('data-name');
    var list = S.outs[ck] || (S.outs[ck] = []);
    var i = list.indexOf(name);
    if (i >= 0) list.splice(i, 1); else list.push(name);
    save();
    UI.updateOut(btn, i < 0);
    if (i < 0) { UI.stamp(btn); SFX.out(); } else SFX.page();
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
    var wait =document.body.classList.contains('reduce') ? 0 : 650;
    setTimeout(function () {
      var bag = Logic.buildBag(S, kid, k), pr = Logic.progress(S, kid, bag);
      if ((!pr.total || pr.done !== pr.total) && !Logic.nightDone(S, kid, bag)) return;   // 그 사이 다시 뺐으면 그대로
      UI.hideBubble();
      UI.closeSheet('sheet-bag');
      UI.renderDone(S, kid, k, V.kidMode);
      openSheet('ov-done');
      UI.avaCheer('party');   // 다 챙겼어요 창의 아이 얼굴이 빙글 춤춘다
      if (V.kidMode) speak('가방 다 챙겼어요');
      haptic([20, 60, 20, 60, 40]);
      UI.confetti($('ov-done'));
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
  // '어제 넣은 것 그대로': 앞 학교 가는 날 챙겼고 오늘 가방에도 있는 물건(아침 물건 빼고)을 한 번에 챙김으로
  function carryCheck() {
    var kid = curKid();
    if (!kid || V.kidMode) return;
    var k = bagKey();
    var ck = Logic.checkKey(kid.id, k);
    var done = S.checks[ck] || [];
    var add = Logic.carryOver(S, kid, k).filter(function (x) { return done.indexOf(x) < 0; });
    if (!add.length) return;
    rememberUndo();
    S.checks[ck] = done.concat(add);
    if (!S.settings.coachSeen) S.settings.coachSeen = true;
    refreshHistory(kid, k);
    save();
    var bag = Logic.buildBag(S, kid, k);
    UI.renderBagSheet(S, V, kid, bag);
    renderAll();
    SFX.in();
    haptic(12);
    var pr = Logic.progress(S, kid, bag);
    UI.toast('어제 넣은 것 ' + add.length + '개를 그대로 챙겼어요', true);
    // 다 챙기게 되면 '모두 ✓' 와 같이 다 챙김으로 (되돌리기는 칭찬 창 뒤에도 알림에 남는다)
    if ((pr.total && pr.done === pr.total) || Logic.nightDone(S, kid, bag)) completeBag(kid, k);
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
    if ((pr.total && pr.done === pr.total) || Logic.nightDone(S, kid, bag)) completeBag(kid, k);
  }
  // 길게 누른 칸의 '아침에 넣기'/'밤에 넣기': 그 물건을 아침 물건 목록(S.morning)에 넣거나 뺀다 (모든 날에)
  function morningToggle(name) {
    var kid = curKid();
    if (!kid || V.kidMode) return;
    var key = Logic.norm(name).toLowerCase();
    var before = S.morning.length;
    S.morning = S.morning.filter(function (m) { return Logic.norm(m).toLowerCase() !== key; });
    var on = S.morning.length === before;
    if (on) S.morning.push(Logic.norm(name));
    var k = bagKey();
    refreshHistory(kid, k);
    save();
    UI.hideBubble();
    var bag = Logic.buildBag(S, kid, k);
    UI.renderBagSheet(S, V, kid, bag);
    renderAll();
    UI.toast(on ? name + '은(는) 아침에 넣어요' : name + '은(는) 밤에 넣어요');
    var pr = Logic.progress(S, kid, bag);
    if (on && ((pr.total && pr.done === pr.total) || Logic.nightDone(S, kid, bag))) completeBag(kid, k);
  }
  // 길게 누른 칸의 '입고 가요'/'가방에 넣어요': 그 물건을 입고 갈 것 목록(S.wear)에 넣거나 뺀다 (모든 날에).
  // 입고 갈 것은 가방 시트 '입고 가요' 쪽으로 따로 모이고, 챙김 수(progress)에는 그대로 든다
  function wearToggle(name) {
    var kid = curKid();
    if (!kid || V.kidMode) return;
    if (!Array.isArray(S.wear)) S.wear = [];
    var key = Logic.norm(name).toLowerCase();
    var before = S.wear.length;
    S.wear = S.wear.filter(function (m) { return Logic.norm(m).toLowerCase() !== key; });
    var on = S.wear.length === before;
    if (on) S.wear.push(Logic.norm(name));
    save();
    UI.hideBubble();
    var bag = Logic.buildBag(S, kid, bagKey());
    UI.renderBagSheet(S, V, kid, bag);
    renderAll();
    UI.toast(on ? name + '은(는) 입고 가요. 밤에 꺼내 두세요' : name + '은(는) 가방에 넣어요');
  }
  // 늘 학교에 두는 물건(S.stay)을 바꾼 뒤: 빠진 물건의 챙김 표시를 지우고, 빠져서 다 챙긴 것이 되면 skipItem 처럼 닫는다
  function changeStay(change, msg) {
    var kid = curKid(), k = bagKey();
    var before = kid ? Logic.buildBag(S, kid, k).items.length : 0;
    rememberUndo();
    change();
    UI.hideBubble();
    var bag = kid ? Logic.buildBag(S, kid, k) : null;
    if (kid) {
      var ck = Logic.checkKey(kid.id, k);
      var names = bag.items.map(function (it) { return it.name; });
      if (S.checks[ck]) S.checks[ck] = S.checks[ck].filter(function (x) { return names.indexOf(x) >= 0 || !Logic.isStay(S, x); });
      refreshHistory(kid, k);
    }
    save();
    if (kid && !bag.items.length) UI.closeSheet('sheet-bag');
    renderAll();
    UI.toast(msg, true);
    if (!kid || bag.items.length >= before) return;
    var pr = Logic.progress(S, kid, bag);
    if ((pr.total && pr.done === pr.total) || Logic.nightDone(S, kid, bag)) completeBag(kid, k);
  }
  // 길게 누른 칸의 '늘 학교에 둬요': 모든 날 가방에서 뺀다. 알림장에 적힌 날에는 남는다
  function stayToggle(name) {
    if (!curKid() || V.kidMode) return;
    var n = Logic.norm(name), key = n.toLowerCase();
    if (Logic.isStay(S, n)) {
      return changeStay(function () {
        S.stay = S.stay.filter(function (x) { return Logic.norm(x).toLowerCase() !== key; });
      }, n + '은(는) 학교에 두지 않아요');
    }
    var it = Logic.buildBag(S, curKid(), bagKey()).items.filter(function (x) { return x.name === name; })[0];
    changeStay(function () { S.stay.push(n); },
      n + (it && it.group === 'note' ? '은(는) 늘 학교에 둬요. 이날은 알림장에 있어 남아요' : '은(는) 늘 학교에 둬요'));
  }
  // 꾸러미 물건 가운데 이름에 '교과서'가 든 것을 모두 학교에 둔다
  function stayTextbooks() {
    var names = [];
    S.packs.forEach(function (p) {
      p.items.forEach(function (x) {
        var n = Logic.norm(x);
        if (n.indexOf('교과서') >= 0 && !Logic.isStay(S, n) && names.indexOf(n) < 0) names.push(n);
      });
    });
    if (!names.length) return UI.toast('더 둘 교과서가 없어요');
    changeStay(function () { S.stay = S.stay.concat(names); }, '교과서 ' + names.length + '가지를 늘 학교에 둬요');
  }
  function showWhy(btn) {
    var kid = curKid();
    if (!kid || !btn) return;
    var k = bagKey(), name = btn.getAttribute('data-name');
    var it = Logic.buildBag(S, kid, k).items.filter(function (x) { return x.name === name; })[0];
    if (!it) return;
    UI.showBubble(btn, it, relWord(k), V.kidMode);
    if (!V.kidMode) seeHoldTip();   // 직접 길게 눌러 봤으면 알려 줄 필요가 없다
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
  // 이번 주 가방: 지금 챙길 가방 날부터 학교 가는 날 5일
  function openWeekBag() {
    var kid = curKid();
    if (!kid) return;
    UI.renderWeekBag(S, kid, Logic.bagDate(now(), S.settings), todayKey());
    openSheet('sheet-weekbag');
  }
  // 줄을 누르면 그날 가방으로
  function weekBagDay(b) {
    var d = b.getAttribute('data-date');
    if (!Logic.validKey(d || '')) return;
    V.offset = offsetTo(d);
    UI.closeSheet('sheet-weekbag');
    renderAll();
    go('bag');
  }
  // 살 것: 며칠 뒤 준비물 칩을 눌러 모으고, 한 번에 복사해 장 보러 간다
  function buyToggle(name) {
    var t = Logic.norm(name);
    if (!t) return;
    var low = t.toLowerCase();
    var i = -1;
    S.buy.forEach(function (x, j) { if (i < 0 && Logic.norm(x).toLowerCase() === low) i = j; });
    if (i >= 0) S.buy.splice(i, 1);
    else S.buy.push(t);
    save();
    var kid = curKid();
    if (kid) UI.renderUpcoming(S, kid, bagKey(), todayKey());
  }
  function buyCopy() {
    if (!S.buy.length) return UI.toast('살 것을 먼저 눌러 골라 주세요');
    copyText(Logic.buyText(S.buy), '살 것 ' + S.buy.length + '개를 복사했어요');
  }
  function buyClear() {
    if (!S.buy.length) return;
    rememberUndo();
    S.buy = [];
    save();
    var kid = curKid();
    if (kid) UI.renderUpcoming(S, kid, bagKey(), todayKey());
    UI.toast('살 것을 비웠어요', true);
  }
  function openCal() {
    V.cal = bagKey().slice(0, 7);
    if (V.cal > todayKey().slice(0, 7)) V.cal = todayKey().slice(0, 7);
    UI.closeSheet('ov-done');
    UI.renderCal(S, curKid(), V.cal);
    openSheet('sheet-cal');
  }
  // 약속 상 저장: 수·상이 바뀌면 오늘(가방 날짜)부터 새로 센다. 약속 없음이면 상도 비운다
  function goalSave() {
    var n = +$('goal-n').value || 0;
    var prize = Array.from(($('goal-prize').value || '').replace(/\s+/g, ' ').trim()).slice(0, 20).join('');
    if (n && !prize) { $('goal-err').textContent = '모으면 받을 상을 적어 주세요'; $('goal-prize').focus(); return; }
    var old = S.settings.goal || { n: 0, prize: '' };
    if (old.n === n && (old.prize || '') === (n ? prize : '')) return UI.toast('이미 이 약속이에요');
    rememberUndo();
    S.settings.goal = n ? { n: Math.max(0, Math.min(60, n)), prize: prize, since: todayKey() } : { n: 0, prize: '' };
    save();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    UI.renderCal(S, curKid(), V.cal || bagKey().slice(0, 7));
    UI.toast(n ? '스티커 ' + n + '장 모으면 "' + prize + '" — 약속했어요' : '약속을 지웠어요', true);
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
    setNoteMore(false);
    $('note-head').textContent = Logic.nameI(kid.name) + ' 알림장';
    $('note-date').value = n ? n.date : (dateKey || bagKey());
    $('note-title').value = n ? (n.title || '') : '';
    $('note-add').value = '';
    $('note-paste').value = '';
    $('note-q').value = '';
    $('note-sort').value = V.noteSort;
    $('note-del').style.display = n ? '' : 'none';
    UI.clearErr('note-add', 'note-err');
    UI.clearErr('note-date', null);
    UI.clearErr('note-paste', null);
    UI.renderNoteItems(V.note.items);
    UI.renderSupplies(S, V, V.note.items);
    UI.closeSheet('sheet-upcoming');
    openSheet('sheet-note');
  }
  // 알림장 '더 찾기': 찾기·순서·갈래 칸(#note-more-box)을 펼치거나 접는다
  function setNoteMore(on) {
    V.noteMore = !!on;
    $('note-more-box').hidden = !V.noteMore;
    $('note-more').setAttribute('aria-expanded', String(V.noteMore));
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
  // 알림장 글 붙여 넣기 → 가져갈 날과 준비물을 뽑아 넣는다 (이미 넣은 것은 그대로, 30개까지)
  function noteParse() {
    var r = Logic.parseNoteText($('note-paste').value, Logic.toKey(new Date()));
    var add = 0;
    r.items.forEach(function (x) {
      var have = V.note.items.some(function (y) { return y.toLowerCase() === x.toLowerCase(); });
      if (!have && V.note.items.length < 30) { V.note.items.push(x); add++; }
    });
    if (r.date) { $('note-date').value = r.date; UI.clearErr('note-date', null); }
    if (!add && !r.date) return UI.fieldErr('note-paste', 'note-err', '글에서 준비물을 찾지 못했어요.');
    UI.clearErr('note-paste', 'note-err');
    $('note-paste').value = '';
    UI.renderNoteItems(V.note.items);
    UI.renderSupplies(S, V, V.note.items);
    UI.toast((r.date ? Logic.shortLabel(r.date) + ' · ' : '') + '준비물 ' + add + '개 넣었어요');
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
  // 다음 칸으로 넘어가 연달아 넣을 수 있게: 마지막 교시면 다음 요일 첫 칸, 금요일 마지막 교시에서만 닫는다
  function nextCell(kid) {
    var c = V.cell;
    if (c.i + 1 < kid.periods) c.i++;
    else if (c.d < 5) { c.d++; c.i = 0; }
    else { UI.closeSheet('sheet-cell'); return; }
    UI.renderCellSheet(S, V, kid);
  }
  function setCell(packId) {
    var kid = curKid();
    rememberUndo();
    kid.week[V.cell.d].p[V.cell.i] = packId;
    save();
    var d = V.cell.d, i = V.cell.i;
    nextCell(kid);
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
  // ---- 받은 시간표 글 붙여 넣기: 글에 있는 요일만 바꾸고 방과후는 그대로. 칸은 kid.periods 길이로 자르고 모자라면 빈 칸 ----
  function openWeekPaste() {
    if (!curKid()) return UI.toast('아이를 먼저 알려 주세요');
    V.weekPaste = true;
    $('week-paste').value = '';
    UI.clearErr('week-paste', 'week-paste-err');
    UI.closeSheet('sheet-cell');
    openSheet('sheet-weekpaste');
  }
  function weekParse() {
    var kid = curKid();
    if (!kid) return;
    var w = Logic.parseWeekText($('week-paste').value, S.packs);
    if (!w) return UI.fieldErr('week-paste', 'week-paste-err', '요일 줄(예: 월: 국어, 수학)에서 과목을 찾지 못했어요.');
    UI.clearErr('week-paste', 'week-paste-err');
    var days = [];
    for (var d = 1; d <= 5; d++) if (w[d].length) days.push(DATA.DOW[d]);
    askConfirm(Logic.nameI(kid.name) + ' 시간표의 ' + days.join('·') + '요일을 이 글대로 바꿀까요? (방과후는 그대로예요)', '바꾸기', function () {
      rememberUndo();
      var filled = 0;
      for (var e = 1; e <= 5; e++) {
        if (!w[e].length) continue;
        var p = [];
        for (var i = 0; i < kid.periods; i++) {
          var id = i < w[e].length ? w[e][i] : null;
          if (id && !Logic.findPack(S.packs, id)) id = null;
          if (id) filled++;
          p.push(id || null);
        }
        kid.week[e].p = p;
      }
      save();
      UI.closeSheet('sheet-weekpaste');
      renderAll();
      go('week');
      UI.toast(days.join('·') + '요일 ' + filled + '칸을 채웠어요', true);
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

  // ---- 밤 알림: 고른 시각의 달력 파일을 내려받는다 (앱이 울리지 않고 기기 달력이 울린다) ----
  function openRemind() {
    $('remind-time').value = S.settings.remindAt || '21:00';
    UI.clearErr('remind-time', 'remind-err');
    if (!S.settings.remindAsked) { S.settings.remindAsked = true; save(); }
    var asked = $('done-remind');   // 다 챙김 창에서 열었으면 돌아왔을 때 다시 보이지 않게
    if (asked) asked.parentNode.removeChild(asked);
    openSheet('sheet-remind');
  }
  function submitRemind() {
    var t = $('remind-time').value;
    if (!/^\d{2}:\d{2}$/.test(t)) return UI.fieldErr('remind-time', 'remind-err', '시각을 골라 주세요.');
    UI.clearErr('remind-time', 'remind-err');
    try {
      var url = URL.createObjectURL(new Blob([Logic.remindIcs(t, todayKey())], { type: 'text/calendar' }));
      var a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', '내일가방-알림.ics');
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
    } catch (e) {
      return UI.toast('달력 파일을 만들지 못했어요. 다시 눌러 주세요');
    }
    S.settings.remindAt = t;
    save();
    UI.closeSheet('sheet-remind');
    renderAll();
    UI.toast('달력 파일을 받았어요. 파일을 열면 달력에 들어가요');
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
  // ---- 처음 안내: 예시로 찍은 가방·가방 시트·시간표 3장을 보여 주고, 움직임 줄이기가 아니면 3초마다 넘긴다 ----
  var WELCOME_MS = 3000, welcomeTimer = null;
  function openWelcome() {
    var shots = captureShots();
    // captureShots 차례: 가방 · 가방 시트 · 시간표 · 꾸러미 ·더보기 → 앞 3장
    var n = UI.renderWelcomeShots(shots.slice(0, 3));
    V.pg.welcome = 0;
    UI.openSheet('ov-welcome'); UI.welcomeDemo(true);
    clearTimeout(welcomeTimer);
    welcomeTimer = null;
    if (n > 1 && !document.body.classList.contains('reduce')) welcomeTimer = setTimeout(welcomeTick, WELCOME_MS);
  }
  function welcomeTick() {
    welcomeTimer = null;
    if (!UI.isOpen('ov-welcome')) return;
    var pager = document.querySelector('.pager[data-pg="welcome"]');
    if (!pager) return;
    var n = +pager.getAttribute('data-n') || 1, cur = +pager.getAttribute('data-cur') || 0;
    // 손가락으로 미는 중에는 그 쪽을 건드리지 않는다
    if (!(swipe && swipe.drag && swipe.el === pager)) V.pg.welcome = UI.setPage('welcome', (cur + 1) % n);
    welcomeTimer = setTimeout(welcomeTick, WELCOME_MS);
  }
  function stopWelcome() { clearTimeout(welcomeTimer); welcomeTimer = null; }
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
      h += '<option value="' + p.id + '"' + (a && a.packId === p.id ? ' selected' : '') + '>' + UI.esc(p.name) + '</option>';
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

  // ---- 이날만 바꾸기: 시간표는 그대로 두고 그 날짜의 수업·방과후만 바꾼다 (S.dayEdits) ----
  function openEdit() {
    var kid = curKid();
    if (!kid) return UI.toast('아이를 먼저 알려 주세요');
    var k = bagKey(), w = Logic.dow(k);
    if (w < 1 || w > 5) return;
    var e = S.dayEdits[Logic.checkKey(kid.id, k)] || {};
    V.edit = { k: k, off: {} };
    Object.keys(e.after || {}).forEach(function (id) { if (e.after[id] && e.after[id].off) V.edit.off[id] = true; });
    UI.renderEdit(S, kid, k);
    openSheet('sheet-edit');
  }
  // 저장 뒤 공통: 기록을 맞추고, 빠진 물건 때문에 다 챙긴 날이 되면 칭찬 스티커까지
  function afterEdit(kid, k, wasDone, msg) {
    refreshHistory(kid, k);
    save();
    UI.closeSheet('sheet-edit');
    renderAll();
    UI.toast(msg, true);
    if (!wasDone && bagIsDone(kid, k)) completeBag(kid, k);
  }
  function bagIsDone(kid, k) {
    var bag = Logic.buildBag(S, kid, k), pr = Logic.progress(S, kid, bag);
    return (pr.total > 0 && pr.done === pr.total) || Logic.nightDone(S, kid, bag);
  }
  function submitEdit() {
    var kid = curKid(), k = V.edit.k;
    var day = kid.week[Logic.dow(k)];
    var p = {}, after = {};
    Array.prototype.forEach.call($('edit-list').querySelectorAll('select[data-no]'), function (sel) {
      var no = +sel.getAttribute('data-no');
      if ((sel.value || null) !== (day.p[no - 1] || null)) p[no] = sel.value || null;
    });
    Array.prototype.forEach.call($('edit-list').querySelectorAll('select[data-aid]'), function (sel) {
      var id = sel.getAttribute('data-aid');
      var a = day.after.filter(function (x) { return x.id === id; })[0];
      if (!a) return;
      var off = !!V.edit.off[id];
      if (off || sel.value !== (a.who || '')) after[id] = { who: sel.value, off: off };
    });
    var wasDone = bagIsDone(kid, k);
    var same = !Object.keys(p).length && !Object.keys(after).length;
    rememberUndo();
    if (same) delete S.dayEdits[Logic.checkKey(kid.id, k)];
    else S.dayEdits[Logic.checkKey(kid.id, k)] = { p: p, after: after };
    afterEdit(kid, k, wasDone, same ? '시간표대로예요' : Logic.shortLabel(k) + '만 바꿨어요');
  }
  function resetEdit() {
    var kid = curKid(), k = V.edit.k;
    var wasDone = bagIsDone(kid, k);
    rememberUndo();
    delete S.dayEdits[Logic.checkKey(kid.id, k)];
    afterEdit(kid, k, wasDone, Logic.shortLabel(k) + '을(를) 시간표대로 돌렸어요');
  }

  // ---- 꾸러미 ----
  function openPack(id) {
    var p = id ? Logic.findPack(S.packs, id) : null;
    // pic: 고른 선 그림 id. 새 꾸러미는 고르기 전까지 null(저장할 때 이름으로 정한다)
    V.pack = { id: p ? p.id : null, items: p ? p.items.slice() : [], pic: p ? UI.packPicId(p) : null };
    $('pack-title').textContent = p ? p.name + ' 꾸러미' : '새 꾸러미';
    $('pack-name').value = p ? p.name : '';
    UI.renderPackPics(V.pack.pic);
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
    var pic = V.pack.pic || Logic.iconFor(name).id;
    rememberUndo();
    var p = V.pack.id ? Logic.findPack(S.packs, V.pack.id) : null;
    if (p) {
      if (p.kind !== kind) detachPack(p.id);
      if (p.name !== name) delete p.short;   // 이름을 바꾸면 기본 짧은 이름은 버리고 새 이름 앞 3글자를 쓴다 (UI.shortName)
      p.name = name; p.pic = pic; p.kind = kind; p.items = V.pack.items.slice();
    } else S.packs.push({ id: Store.uid('p'), kind: kind, name: name, icon: '🎒', pic: pic, items: V.pack.items.slice() });
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
    // 이날만 바꾼 칸도 빈 칸이 되지 않게, 그 꾸러미로 바꾼 것을 지운다
    Object.keys(S.dayEdits).forEach(function (ck) {
      var ep = S.dayEdits[ck].p || {};
      Object.keys(ep).forEach(function (no) { if (ep[no] === id) delete ep[no]; });
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

  // ---- 매일 · 요일 목록: 모든 아이 공용(S.daily·S.rules) 또는 아이마다 따로(kid.daily·kid.rules) ----
  function dScopeKid() {
    if (!V.dscope) return null;
    for (var i = 0; i < S.kids.length; i++) if (S.kids[i].id === V.dscope) return S.kids[i];
    V.dscope = null;
    return null;
  }
  // which: 'daily' 또는 'rules'. make 이면 고르는 아이에게 따로 목록이 없을 때 공용을 베껴 그 아이 목록을 만든다
  function dList(which, make) {
    var k = dScopeKid();
    if (!k) return S[which];
    if (Array.isArray(k[which])) return k[which];
    if (!make) return S[which];
    k[which] = which === 'rules' ?
      S.rules.map(function (r) { var o = { id: r.id, dow: r.dow, item: r.item, on: r.on }; if (r.kind) o.kind = r.kind; return o; }) : S.daily.slice();
    return k[which];
  }
  function dWho() { var k = dScopeKid(); return k ? Logic.nameI(k.name) + ' ' : ''; }

  function addDaily(name) {
    var t = Logic.norm(name);
    var cur = dList('daily', false);
    if (!t) return UI.fieldErr('daily-add', 'daily-err', '물건 이름을 넣어 주세요.');
    if (t.length > 40) return UI.fieldErr('daily-add', 'daily-err', '40자 안으로 넣어 주세요.');
    if (cur.indexOf(t) >= 0) return UI.fieldErr('daily-add', 'daily-err', '이미 있어요.');
    if (cur.length >= 12) return UI.fieldErr('daily-add', 'daily-err', '매일 챙길 것은 12개까지 넣을 수 있어요.');
    UI.clearErr('daily-add', 'daily-err');
    rememberUndo();
    dList('daily', true).push(t);
    $('daily-add').value = '';
    save();
    renderAll();
    UI.toast(dWho() + t + '을(를) 매일 챙길 것에 넣었어요', true);
  }

  function addRule() {
    var dow = +$('rule-dow').value;
    var t = Logic.norm($('rule-add').value);
    if (!(dow >= 1 && dow <= 5)) return UI.fieldErr('rule-dow', 'rule-err', '요일을 골라 주세요.');
    if (!t) return UI.fieldErr('rule-add', 'rule-err', '물건 이름을 넣어 주세요.');
    if (t.length > 40) return UI.fieldErr('rule-add', 'rule-err', '40자 안으로 넣어 주세요.');
    var cur = dList('rules', false);
    var dup = cur.some(function (r) { return r.dow === dow && Logic.norm(r.item).toLowerCase() === t.toLowerCase(); });
    if (dup) return UI.fieldErr('rule-add', 'rule-err', DATA.DOW[dow] + '요일에 이미 있어요.');
    if (cur.length >= 20) return UI.fieldErr('rule-add', 'rule-err', '요일마다 챙길 것은 20개까지 넣을 수 있어요.');
    UI.clearErr('rule-add', 'rule-err');
    rememberUndo();
    dList('rules', true).push({ id: Store.uid('r'), dow: dow, item: t, on: true });
    $('rule-add').value = '';
    save();
    renderAll();
    UI.toast(dWho() + DATA.DOW[dow] + '요일마다 ' + t + '을(를) 챙겨요', true);
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
    var d = $('holiday-add').value, e = $('holiday-end').value;
    UI.clearErr('holiday-end', 'holiday-err');
    if (!d || !Logic.validKey(d)) return UI.fieldErr('holiday-add', 'holiday-err', '날짜를 골라 주세요.');
    // 끝을 비우거나 시작과 같으면 하루만 (예전과 같은 안내)
    if (!e || e === d) {
      if (S.settings.holidays.indexOf(d) >= 0) return UI.fieldErr('holiday-add', 'holiday-err', '이미 넣은 날이에요.');
      var w = Logic.dow(d);
      if (w === 0 || w === 6) return UI.fieldErr('holiday-add', 'holiday-err', '주말은 넣지 않아도 저절로 건너뛰어요.');
      UI.clearErr('holiday-add', 'holiday-err');
      rememberUndo();
      S.settings.holidays.push(d);
      $('holiday-add').value = ''; $('holiday-end').value = '';
      V.offset = 0;
      save(); renderAll();
      UI.toast(Logic.shortLabel(d) + '을(를) 쉬는 날로 넣었어요', true);
      return;
    }
    // 방학처럼 긴 쉬는 날: 시작~끝 사이 주말이 아닌 날을 한 번에
    if (!Logic.validKey(e)) return UI.fieldErr('holiday-end', 'holiday-err', '끝 날짜를 골라 주세요.');
    if (e < d) return UI.fieldErr('holiday-end', 'holiday-err', '끝 날짜는 시작 날짜와 같거나 뒤여야 해요.');
    if (Logic.spanDays(d, e) > Logic.HOLIDAY_MAX_DAYS) return UI.fieldErr('holiday-end', 'holiday-err', '한 번에 ' + Logic.HOLIDAY_MAX_DAYS + '일까지 넣을 수 있어요.');
    var hs = S.settings.holidays;
    var add = Logic.holidayRange(d, e).filter(function (k) { return hs.indexOf(k) < 0; });
    if (!add.length) return UI.fieldErr('holiday-end', 'holiday-err', '그 사이 평일은 이미 모두 쉬는 날이에요.');
    UI.clearErr('holiday-add', 'holiday-err');
    rememberUndo();
    add.forEach(function (k) { S.settings.holidays.push(k); });
    $('holiday-add').value = ''; $('holiday-end').value = '';
    V.offset = 0;
    save(); renderAll();
    UI.toast(add.length + '일을 쉬는 날로 넣었어요', true);
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
    shareLink(o.cls + ' 준비물', teachMsg(o), o.link);
  }
  // 공유 창으로 보내고, 안 되면 링크를 복사한다
  function shareLink(title, msg, link) {
    var data = { title: title, text: msg, url: link };
    var can = false;
    try { can = !!navigator.share && (!navigator.canShare || navigator.canShare(data)); } catch (e) { can = false; }
    if (!can) {
      copyText(msg + '\n' + link, '이 브라우저는 바로 보내기가 안 돼서 링크를 복사했어요. 대화방에 붙여 넣어 주세요');
      return;
    }
    try {
      navigator.share(data).then(function () { UI.toast('보낼 곳으로 넘겼어요'); }, function (err) {
        if (err && err.name === 'AbortError') return;   // 사람이 고르기 창을 닫음
        copyText(msg + '\n' + link, '바로 보내지 못해서 링크를 복사했어요. 대화방에 붙여 넣어 주세요');
      });
    } catch (e) {
      copyText(msg + '\n' + link, '바로 보내지 못해서 링크를 복사했어요. 대화방에 붙여 넣어 주세요');
    }
  }

  // ---- 가족 링크: 아이 하나의 시간표를 링크 주소(#f=…) 안에 담아 다른 보호자 폰으로 넘긴다. 서버 없음 ----
  function openFamily(id) {
    var k = S.kids.filter(function (x) { return x.id === id; })[0];
    if (!k) return;
    var pack = Logic.familyPack(S, k);
    var f = Logic.familyUnpack(pack);
    if (!f) return UI.toast('가족 링크를 만들지 못했어요');
    var link = teacherBase() + '#f=' + pack;
    var qr = QR.svg(link, k.name + ' 가족 링크 QR코드');
    var after = 0;
    for (var d = 1; d <= 5; d++) after += f.week[d].after.length;
    V.family = { name: k.name, link: link };
    UI.renderFamily({ name: f.name, grade: f.grade, periods: f.periods, after: after, packs: f.packs.length, notes: f.notes.length, link: link, qr: qr });
    openSheet('sheet-family');
    // 화면에 글을 두지 않고 알림으로만 (선생님 링크와 같다)
    if (!qr) UI.toast('내용이 길어 QR코드에 다 담기지 않아요. 링크로 보내 주세요');
    else if (!/^https?:$/.test(location.protocol)) UI.toast('이 기기 파일로 열려 있어 다른 기기에서는 링크가 열리지 않아요');
  }
  function familyMsg(o) {
    return Logic.nameI(o.name) + ' 시간표예요. 링크를 열면 내일 가방에 들어가요.';
  }
  // 받는 쪽: 링크를 열면 한 번 묻고 넣는다. 다른 아이와 기록은 그대로 둔다 (Logic.mergeFamily)
  function readFamilyHash() {
    var h = location.hash || '';
    if (h.indexOf('#f=') !== 0) return;
    var f = Logic.familyUnpack(h.slice(3));
    clearHash();
    if (!f) return UI.toast('가족 링크를 읽지 못했어요. 링크를 다시 받아 주세요');
    var has = S.kids.some(function (x) { return !x.sample && x.name === f.name; });
    var who = Logic.nameI(f.name);
    askConfirm(has ? who + ' 시간표를 받은 것으로 바꿀까요?' : who + ' 시간표를 이 폰에 넣을까요?', has ? '바꾸기' : '넣기', function () { applyFamily(f); });
  }
  function applyFamily(f) {
    S.settings.welcomed = true;
    UI.closeSheet('ov-welcome'); UI.welcomeDemo(false); stopWelcome();
    rememberUndo();
    var r = Logic.mergeFamily(S, f, Store.uid);
    S.cur = r.kid.id;
    V.offset = 0;
    save();
    renderAll();
    go('bag');
    UI.toast(Logic.nameI(f.name) + (r.isNew ? ' 시간표를 넣었어요' : ' 시간표를 바꿨어요'), true);
  }
  // ---- 받은 링크로 시작 (처음 안내): 대화방에서 복사한 글을 붙여 넣으면 링크를 연 것과 같게 넣는다 ----
  // 링크를 다른 브라우저(대화앱 안 창 등)에서 열어 이 폰의 앱에 안 들어가는 경우를 위한 길이다
  function openJoin() {
    $('join-text').value = '';
    UI.clearErr('join-text', 'join-err');
    openSheet('sheet-join');
  }
  // 글 안에서 표시(#f=, #t=) 뒤의 링크 조각만 꺼낸다 (b64url 글자: 영문·숫자·-·_·=)
  function linkPart(text, mark) {
    var at = text.indexOf(mark);
    if (at < 0) return null;
    var m = /^[A-Za-z0-9_\-=]+/.exec(text.slice(at + mark.length));
    return m ? m[0] : '';
  }
  function joinGo() {
    var text = String($('join-text').value || '');
    UI.clearErr('join-text', 'join-err');
    if (!text.trim()) return UI.fieldErr('join-text', 'join-err', '받은 링크를 붙여 넣어 주세요.');
    // 1) 가족 링크
    var fp = linkPart(text, '#f=');
    if (fp !== null) {
      var f = Logic.familyUnpack(fp);
      if (!f) return UI.fieldErr('join-text', 'join-err', '가족 링크가 잘렸거나 바뀌었어요. 링크 전체를 다시 복사해 주세요.');
      var has = S.kids.some(function (x) { return !x.sample && x.name === f.name; });
      var who = Logic.nameI(f.name);
      askConfirm(has ? who + ' 시간표를 받은 것으로 바꿀까요?' : who + ' 시간표를 이 폰에 넣을까요?', has ? '바꾸기' : '넣기', function () {
        UI.closeSheet('sheet-join');
        applyFamily(f);
      });
      return;
    }
    // 2) 선생님 준비물 링크
    var tp = linkPart(text, '#t=');
    if (tp !== null) {
      var t = Logic.teacherUnpack(tp);
      if (!t) return UI.fieldErr('join-text', 'join-err', '선생님 링크가 잘렸거나 바뀌었어요. 링크 전체를 다시 복사해 주세요.');
      UI.closeSheet('sheet-join');
      if (UI.isOpen('ov-welcome')) { S.settings.welcomed = true; save(); UI.closeSheet('ov-welcome'); UI.welcomeDemo(false); stopWelcome(); }
      pendingTeach = t;
      applyTeach();
      return;
    }
    // 3) 링크가 아닌 글
    UI.fieldErr('join-text', 'join-err', '받은 링크를 찾지 못했어요. 주소에 #f= 나 #t= 가 든 링크를 붙여 넣어 주세요.');
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
      UI.closeSheet('ov-welcome'); UI.welcomeDemo(false); stopWelcome();
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
  // ---- 첫 둘러보기 (처음 안내의 '예시로 둘러보기' 뒤, 또는 '시작하기'로 넣은 아이의 첫 가방에서 한 번, 4걸음) ----
  // 건너뛰기·마지막 걸음·Esc 모두 tourSeen 을 저장해 다시 띄우지 않는다
  function endTour() {
    V.tour = null;
    UI.hideTour();
    if (S.settings.tourSeen !== true) { S.settings.tourSeen = true; save(); }
  }
  function tourNext() {
    if (V.tour === null) return;
    if (V.tour >= UI.TOUR_N - 1) { endTour(); openBag(); return; }   // 마지막 '가방 챙기기'
    V.tour++;
    if (!tourSync(UI.showTour(V.tour))) endTour();
  }
  // showTour 는 없는 걸음을 건너뛰고 실제로 보인 걸음 번호 + 1 을 돌려준다 → V.tour 를 그 걸음에 맞춘다
  function tourSync(r) { if (r && V.tour !== null) V.tour = r - 1; return r; }
  // 화면 전환이 끝났거나 창 크기가 바뀌면 밝힐 자리를 다시 잡는다
  function placeTour() { if (V.tour !== null && !tourSync(UI.showTour(V.tour))) endTour(); }

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
    S.kids.push({ id: id, name: name, grade: 2, periods: 6, week: w, sample: true, avatar: 10 });
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
  // 가방 화면 맨 위 '내 아이로 시작': 예시를 빼고, 진짜 아이가 없으면 아이 넣기 시트를 연다
  function sampleStart() {
    var ids = S.kids.filter(function (k) { return k.sample; }).map(function (k) { return k.id; });
    if (!ids.length) return;
    askConfirm('예시를 빼고 우리 아이로 시작할까요?', '시작하기', function () {
      rememberUndo();
      ids.forEach(removeKid);
      var real = S.kids[0];
      if (real) S.cur = real.id;
      V.offset = 0;
      save();
      renderAll();
      go('bag');
      if (real) UI.toast('예시를 뺐어요 · ' + Logic.nameI(real.name) + ' 가방이에요', true);
      else openKid(null);
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
    'setup-skip': function () { S.settings.setupDone = true; save(); renderAll(); },
    'help': openHelp,
    'help-step': function (b) { helpStep(+b.getAttribute('data-d')); },
    'times-open': openTimes,
    'times-default': timesDefault,
    'remind-open': openRemind,
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
    // 아이 얼굴 고르기 (저장은 submitKid 가 k.avatar 로)
    'kid-avatar': function (b) {
      var i = +b.getAttribute('data-i');
      if (!(i >= 0 && i <= 11)) return;
      V.kidAva = i;
      UI.renderKidAvatars(i);
      var nb = document.querySelector('#kid-avatars [data-i="' + i + '"]');
      if (nb) nb.focus();
    },
    'kid-del': deleteKid,
    'kid-next': kidNext,
    'kid-back': kidBack,
    'kid-skip': kidSkip,   // 2단계는 고른 것이 없을 때만 눌린다 (renderKidAfter) → 3단계로, 3단계는 알림장 없이 저장
    'kid-note-supply': function (b) { kidNoteSupply(b.getAttribute('data-name')); },
    'kid-after-add': function () {
      if (!V.kidAfter.pack || !checkKidAfter()) return;
      keepKidAfter();
      UI.renderKidAfter(S, V.kidAfter);
    },
    'kid-after-custom': function () {
      V.kidAfter.custom = !V.kidAfter.custom;
      UI.clearErr('kid-after-new', '');
      UI.clearErr('kid-after-time', 'kid-after-err');
      UI.renderKidAfter(S, V.kidAfter);
      if (V.kidAfter.custom) $('kid-after-new').focus();
    },
    'kid-after-new-add': kidAfterNewAdd,
    'kid-after-remove': function (b) {
      V.kidAfter.list.splice(+b.getAttribute('data-i'), 1);
      UI.renderKidAfter(S, V.kidAfter);
    },
    // 한 곳씩 고른다: 방과후 꾸러미는 하나만 (다시 누르면 빼기), 요일은 여러 개, 데리러 갈 사람은 하나만
    'kid-after-pack': function (b) {
      var id = b.getAttribute('data-id');
      V.kidAfter.pack = V.kidAfter.pack === id ? null : id;
      if (!V.kidAfter.pack) { V.kidAfter.days = []; V.kidAfter.who = ''; V.kidAfter.whoCustom = false; }
      UI.clearErr('kid-after-time', 'kid-after-err');
      UI.renderKidAfter(S, V.kidAfter);
    },
    'kid-after-day': function (b) {
      var d = +b.getAttribute('data-d'), ds = V.kidAfter.days, i = ds.indexOf(d);
      if (i >= 0) ds.splice(i, 1); else { ds.push(d); ds.sort(); }
      UI.clearErr('kid-after-time', 'kid-after-err');
      UI.renderKidAfter(S, V.kidAfter);
    },
    'kid-after-who': function (b) {
      V.kidAfter.who = b.getAttribute('data-who') || '';
      V.kidAfter.whoCustom = false;
      UI.renderKidAfter(S, V.kidAfter);
    },
    'kid-after-who-custom': function () {
      if (!V.kidAfter.pack) return;
      V.kidAfter.whoCustom = !V.kidAfter.whoCustom;
      UI.clearErr('kid-after-who-new', 'kid-after-err');
      UI.renderKidAfter(S, V.kidAfter);
      if (V.kidAfter.whoCustom) $('kid-after-who-new').focus();
    },
    'kid-after-who-add': kidAfterWhoAdd,
    'kids-open': function () { UI.renderKidsSheet(S); openSheet('sheet-kids'); },
    'day-prev': function () { V.offset--; renderAll(); UI.slideDay(-1); },
    'day-next': function () { V.offset++; renderAll(); UI.slideDay(1); },
    'day-now': function () { V.offset = 0; renderAll(); },
    'bag-open': function () { if (UI.isOpen('sheet-cal')) UI.closeSheet('sheet-cal'); if (V.firstBag) { seeFirstBag(); renderAll(); } openBag(); },
    'first-bag-ok': function () { seeFirstBag(); renderAll(); },
    'first-bag-week': function () { seeFirstBag(); renderAll(); go('week'); },
    'check': toggleCheck,
    'hold-tip-ok': function () { seeHoldTip(); UI.hideBubble(); autoNextPage(); },
    'out-check': toggleOut,
    'check-all': checkAll,
    'bag-add': function () { UI.showBagAdd(true); },
    'bag-add-go': bagAdd,
    'bag-add-close': function () { UI.showBagAdd(false); },
    'carry-check': carryCheck,
    'bag-done': bagDone,
    'skip-item': function (b) { skipItem(b.getAttribute('data-name')); },
    'morning-toggle': function (b) { morningToggle(b.getAttribute('data-name')); },
    'wear-toggle': function (b) { wearToggle(b.getAttribute('data-name')); },
    'tpl-cell': tplCell,
    'tpl-set': tplSet,
    'stay-toggle': function (b) { stayToggle(b.getAttribute('data-name')); },
    'stay-textbooks': stayTextbooks,
    'stay-del': function (b) {
      var i = +b.getAttribute('data-i');
      var name = S.stay[i];
      changeStay(function () { S.stay.splice(i, 1); }, name + '은(는) 다시 가방에 넣어요');
    },
    'kid-mode': toggleKidMode,
    'pg': function (b) {
      var id = b.getAttribute('data-pg');
      if (id === 'bag') clearTimeout(sinkTimer);
      V.pg[id] = UI.setPage(id, +b.getAttribute('data-n'));
      UI.hideBubble();
    },
    'pg-step': function (b) {
      var id = b.getAttribute('data-pg');
      if (id === 'bag') clearTimeout(sinkTimer);
      V.pg[id]= UI.setPage(id, (V.pg[id] || 0) + (+b.getAttribute('data-d')));
    },
    'share': share,
    'done-copy': doneCopy,
    'upcoming': openUpcoming,
    'weekbag-open': openWeekBag,
    'weekbag-day': weekBagDay,
    'buy-toggle': function (b) { buyToggle(b.getAttribute('data-name')); },
    'buy-copy': buyCopy,
    'buy-clear': buyClear,
    'cal-open': openCal,
    // 가방 달력 빈 상태 버튼: 달력을 닫고 그 일을 연다 (달력 시트가 다른 시트 위에 있어서)
    'cal-kid': function () { UI.closeSheet('sheet-cal'); openKid(null); },
    'cal-prev': function () { calStep(-1); },
    'cal-next': function () { calStep(1); },
    'goal-save': goalSave,
    'note-new': function () { openNote(null); },
    'note-edit': function (b) { openNote(b.getAttribute('data-id')); },
    'note-add': function () { if (noteAddItem($('note-add').value) === true) $('note-add').value = ''; },
    'note-item-del': function (b) { V.note.items.splice(+b.getAttribute('data-i'), 1); UI.renderNoteItems(V.note.items); UI.renderSupplies(S, V, V.note.items); },
    'note-supply': function (b) { noteSupply(b.getAttribute('data-name')); },
    'note-cat': function (b) { V.noteCat = b.getAttribute('data-v'); V.pg.sup = 0; UI.renderSupplies(S, V, V.note.items); },
    'note-q-clear': function () { V.noteQ = ''; V.noteCat = 'all'; V.pg.sup = 0; $('note-q').value = ''; UI.renderSupplies(S, V, V.note.items); },
    'note-more': function () {
      setNoteMore(!V.noteMore); V.pg.sup = 0;
      UI.renderSupplies(S, V, V.note.items);
      if (V.noteMore) $('note-q').focus();
    },
    'note-del': deleteNote,
    'note-parse': noteParse,
    'event-new': openEvent,
    'event-pick': function (b) { V.eventPick = b.getAttribute('data-id'); $('event-err').textContent = ''; UI.renderEvents(V.eventPick); },
    'cell': function (b) { openCell(+b.getAttribute('data-d'), +b.getAttribute('data-i')); },
    'cell-set': function (b) { setCell(b.getAttribute('data-id')); },
    'cell-clear': function () { setCell(null); },
    'cell-skip': function () { nextCell(curKid()); },
    'cell-copy': function () { UI.renderCopyRow(V.cell.d); },
    'cell-copy-to': function (b) { copyDay(+b.getAttribute('data-d')); },
    'week-paste-open': openWeekPaste,
    'week-parse': weekParse,
    'after-new': function (b) { openAfter(+b.getAttribute('data-d') || 1, null); },
    'after-edit': function (b) { openAfter(+b.getAttribute('data-d'), b.getAttribute('data-id')); },
    'after-del': deleteAfter,
    'edit-open': openEdit,
    'edit-reset': resetEdit,
    'edit-off': function (b) {
      var id = b.getAttribute('data-id'), on = !V.edit.off[id];
      if (on) V.edit.off[id] = true; else delete V.edit.off[id];
      UI.setEditOff(b, on);
    },
    'pack-new': function () { openPack(null); },
    'pack-edit': function (b) { openPack(b.getAttribute('data-id')); },
    'pack-add': packAddItem,
    'pack-pic': function (b) { V.pack.pic = b.getAttribute('data-pic'); UI.renderPackPics(V.pack.pic); },
    'pack-item-del': function (b) {
      V.pack.items.splice(+b.getAttribute('data-i'), 1);
      UI.renderPackItems(V.pack.items, Math.min(V.pg.pitems || 0, Math.max(0, Math.floor((V.pack.items.length - 1) / 12))));
    },
    'pack-del': deletePack,
    'daily-open': function () { V.dscope = null; UI.renderDaily(S, null); UI.clearErr('daily-add', 'daily-err'); UI.clearErr('rule-add', 'rule-err'); openSheet('sheet-daily'); },
    // 누구 목록을 볼지 고른다: '모든 아이'(공용) 또는 아이 하나
    'daily-scope': function (b) {
      V.dscope = b.getAttribute('data-id') || null;
      dScopeKid();
      UI.clearErr('daily-add', 'daily-err'); UI.clearErr('rule-add', 'rule-err');
      UI.renderDaily(S, V.dscope);
    },
    // 그 아이 따로 목록을 지우고 다시 모든 아이 공용을 쓴다
    'daily-scope-reset': function () {
      var k = dScopeKid();
      if (!k) return;
      askConfirm(Logic.nameI(k.name) + ' 따로 목록을 지우고 모든 아이와 같게 할까요?', '같게 하기', function () {
        rememberUndo(); delete k.daily; delete k.rules; save(); renderAll(); UI.toast('모든 아이와 같게 했어요', true);
      });
    },
    'daily-del': function (b) {
      var i = +b.getAttribute('data-i');
      var name = dList('daily', false)[i];
      if (name === undefined) return;
      askConfirm(dWho() + name + '을(를) 매일 챙길 것에서 뺄까요?', '빼기', function () {
        rememberUndo(); dList('daily', true).splice(i, 1); save(); renderAll(); UI.toast('뺐어요', true);
      });
    },
    'daily-default': function () {
      rememberUndo();
      var k = dScopeKid();
      if (k) k.daily = DATA.DAILY.slice(); else S.daily = DATA.DAILY.slice();
      save(); renderAll(); UI.toast('기본 다섯 가지를 넣었어요', true);
    },
    'rules-default': function () {
      rememberUndo();
      var list = DATA.RULES.map(function (r) { var o = { id: r.id, dow: r.dow, item: r.item, on: true }; if (r.kind) o.kind = r.kind; return o; });
      var k = dScopeKid();
      if (k) k.rules = list; else S.rules = list;
      save(); renderAll(); UI.toast('기본 규칙을 넣었어요', true);
    },
    // 빈 목록의 시작 버튼: 그 목록을 채우는 입력란으로
    'focus': function (b) {
      var el = $(b.getAttribute('data-target'));
      if (el) { try { el.focus(); if (el.type === 'date' && el.showPicker) el.showPicker(); } catch (e) { /* 날짜 고르개를 못 열어도 포커스는 됐다 */ } }
    },
    'rule-toggle': function (b) {
      var id = b.getAttribute('data-id');
      dList('rules', true).forEach(function (r) { if (r.id === id) r.on = !r.on; });
      save(); renderAll(); UI.toast('바꿨어요');
    },
    'rule-del': function (b) {
      var id = b.getAttribute('data-id');
      var r = dList('rules', false).filter(function (x) { return x.id === id; })[0];
      if (!r) return;
      askConfirm(dWho() + DATA.DOW[r.dow] + '요일 ' + r.item + '을(를) 뺄까요?', '빼기', function () {
        rememberUndo();
        var k = dScopeKid();
        var left = dList('rules', true).filter(function (x) { return x.id !== id; });
        if (k) k.rules = left; else S.rules = left;
        save(); renderAll(); UI.toast('뺐어요', true);
      });
    },
    'guard-open': function () { UI.renderGuards(S); UI.clearErr('guard-add', 'guard-err'); openSheet('sheet-guard'); },
    'guard-del': function (b) {
      var i = +b.getAttribute('data-i');
      askConfirm(S.settings.guardians[i] + '을(를) 뺄까요?', '빼기', function () {
        rememberUndo(); S.settings.guardians.splice(i, 1); save(); renderAll(); UI.toast('뺐어요', true);
      });
    },
    'guard-week-copy': function (b) {
      var w = b.getAttribute('data-who') || '';
      var wk = Logic.pickupWeek(S, Logic.bagDate(now(), S.settings));
      copyText(Logic.pickupWeekText(w, wk[w] || []), w === Logic.NO_WHO ? '정하지 않은 날을 복사했어요' : w + ' 이번 주 데리러 갈 날을 복사했어요');
    },
    'days-open': function () { UI.renderDays(S, todayKey()); UI.clearErr('holiday-add', 'holiday-err'); UI.clearErr('holiday-end'); openSheet('sheet-days'); },
    'holiday-del': function (b) {
      var d = b.getAttribute('data-date');
      askConfirm(Logic.shortLabel(d) + '을(를) 쉬는 날에서 뺄까요?', '빼기', function () {
        rememberUndo();
        S.settings.holidays = S.settings.holidays.filter(function (x) { return x !== d; });
        V.offset = 0;
        save(); renderAll(); UI.toast('뺐어요', true);
      });
    },
    // 방학처럼 이어진 쉬는 날 묶음을 한 번에 빼기 (data-from~data-to 사이 쉬는 날 모두)
    'holiday-range-del': function (b) {
      var f = b.getAttribute('data-from'), t = b.getAttribute('data-to');
      if (!Logic.validKey(f) || !Logic.validKey(t)) return;
      var n = S.settings.holidays.filter(function (x) { return x >= f && x <= t; }).length;
      askConfirm(Logic.shortLabel(f) + '~' + Logic.shortLabel(t) + ' 쉬는 날 ' + n + '일을 모두 뺄까요?', '빼기', function () {
        rememberUndo();
        S.settings.holidays = S.settings.holidays.filter(function (x) { return x < f || x > t; });
        V.offset = 0;
        save(); renderAll(); UI.toast(n + '일을 뺐어요', true);
      });
    },
    'font': function () {
      var f = S.settings.font || 1;
      S.settings.font = f >= 1.3 ? 1 : (f >= 1.15 ? 1.3 : 1.15);
      save(); renderAll();
    },
    // 화면 색: 기기 따라 → 밝게 → 어둡게 → 기기 따라
    'look-dark': function () {
      var d = S.settings.dark;
      S.settings.dark = d === 'auto' ? false : (d === false ? true : 'auto');
      save(); renderAll();
    },
    'toggle-set': function (b) { var k = b.getAttribute('data-k'); S.settings[k] = !S.settings[k]; save(); renderAll(); },
    'teacher-open': openTeacher,
    'teach-add': teachAddItem,
    'teach-share': teachShare,
    'teach-copy': teachCopy,
    'teach-edit': function () { V.teach.out = null; UI.renderTeachOut(null); },
    'teach-item-del': function (b) { V.teach.items.splice(+b.getAttribute('data-i'), 1); UI.renderTeachItems(V.teach.items); },
    'family-link': function (b) { openFamily(b.getAttribute('data-id')); },
    'family-share': function () { shareLink(V.family.name + ' 시간표', familyMsg(V.family), V.family.link); },
    'family-copy': function () { copyText(familyMsg(V.family) + '\n' + V.family.link, '링크를 복사했어요. 카톡·문자 대화방에 붙여 넣어 주세요'); },
    'export-open': openExport,
    'backup': openBackup,
    'copy-export': function () { copyText($('export-text').value, '내보내기 글을 복사했어요'); },
    'print': function () { go('bag'); try { window.print(); } catch (e) { UI.toast('인쇄할 수 없는 브라우저예요'); } },
    'sample-add': function () { UI.closeSheet('ov-welcome'); UI.welcomeDemo(false); stopWelcome(); addSample(); },
    'sample-del': removeSample,
    'sample-start': sampleStart,
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
    'welcome-start': function () { S.settings.welcomed = true; save(); UI.closeSheet('ov-welcome'); UI.welcomeDemo(false); stopWelcome(); openKid(null); },
    'welcome-sample': function () {
      S.settings.welcomed = true; UI.closeSheet('ov-welcome'); UI.welcomeDemo(false); stopWelcome(); addSample();
      // 처음 한 번: 하윤이 가방 화면의 네 곳을 차례로 짚어 준다
      if (S.settings.tourSeen === false) { V.tour = 0; if (!tourSync(UI.showTour(0))) endTour(); else setTimeout(placeTour, 300); }
    },
    'welcome-join': openJoin,
    'join-go': joinGo,
    'tour-next': tourNext,
    'tour-skip': function () { endTour(); }
  };

  // 시트 안 동작은 그 시트를 연 뒤에만 (열린 적 없는 시트의 버튼이 눌려도 아무 일 없게)
  var NEED = {
    'cell-set': 'cell', 'cell-clear': 'cell', 'cell-skip': 'cell', 'cell-copy': 'cell', 'cell-copy-to': 'cell',
    'note-add': 'note', 'note-item-del': 'note', 'note-supply': 'note', 'note-cat': 'note', 'note-q-clear': 'note', 'note-more': 'note', 'note-del': 'note', 'note-parse': 'note',
    'pack-add': 'pack', 'pack-pic': 'pack', 'pack-item-del': 'pack', 'pack-del': 'pack', 'after-del': 'after',
    'edit-off': 'edit', 'edit-reset': 'edit', 'form-edit': 'edit',
    'form-note': 'note', 'form-pack': 'pack', 'week-parse': 'weekPaste', 'form-after': 'after', 'form-event': 'kid',
    'check': 'kid', 'out-check': 'kid', 'check-all': 'kid', 'bag-add': 'kid', 'bag-add-go': 'kid', 'carry-check': 'kid', 'bag-done': 'kid', 'skip-item': 'kid', 'morning-toggle': 'kid', 'wear-toggle': 'kid', 'stay-toggle': 'kid',
    'teach-add': 'teach', 'teach-item-del': 'teach', 'form-teacher': 'teach', 'teach-share': 'teach', 'teach-copy': 'teach', 'teach-edit': 'teach', 'family-share': 'family', 'family-copy': 'family',
    'times-default': 'times', 'form-times': 'times', 'help-step': 'help', 'kid-after-pack': 'kidAfter', 'kid-after-day': 'kidAfter', 'kid-after-who': 'kidAfter',
    'kid-next': 'kidAfter', 'kid-back': 'kidAfter', 'kid-skip': 'kidAfter', 'kid-after-add': 'kidAfter', 'kid-after-remove': 'kidAfter',
    'kid-after-custom': 'kidAfter', 'kid-after-new-add': 'kidAfter', 'kid-note-supply': 'kidAfter',
    'kid-after-who-custom': 'kidAfter', 'kid-after-who-add': 'kidAfter',
    'tpl-cell': 'kidAfter', 'tpl-set': 'kidAfter'
  };
  function ready(name) {
    var need = NEED[name];
    if (!need) return true;
    if (need === 'kid') return !!curKid();
    if (!V[need]) return false;
    return need === 'pack' || need === 'teach' || need === 'times' || need === 'help' || need === 'kidAfter' || !!curKid();
  }

  // ---- 길게 누르기(칸의 이유·내일은 빼기, 아이가 챙겨요 끄기)와 옆으로 밀기(쪽·날짜) ----
  var press = null, swipe = null, eatClick = false;
  // ---- 시트를 아래로 끌어 닫기: 손잡이(.grab)·머리(.sheet-head, 버튼 밖)·가방 입구(.bag-top)를 잡고 끈다 ----
  var sdrag = null;
  var SHEET_CLOSE = 80, SHEET_UP_PULL = 0.3;   // 80px 넘게 끌어내리면 닫힘, 위로 끌면 손가락의 0.3 만큼만 따라옴
  function sheetDragStart(e) {
    if (sdrag && sdrag.moved) return true;   // 끄는 중에 닿은 다른 손가락은 무시
    sdrag = null;   // 움직이지 않고 창 밖에서 놓아 남은 상태는 버린다
    var t = e.target;
    if (!t.closest('.sheet .grab, .sheet .sheet-head, .sheet .bag-top')) return false;
    if (t.closest('button, a, input, select, textarea, label, [data-act]')) return false;
    var sheet = t.closest('.sheet'), dim = sheet && sheet.closest('.dim.on');
    if (!dim || !canClose(dim) || dim.id === 'ov-confirm') return false;   // 확인 창은 끌어서 지나치지 않게 버튼으로만
    var on = UI.openSheets();
    if (on[on.length - 1] !== dim) return false;   // 맨 위 창만
    sdrag = { sheet: sheet, dim: dim, x: e.clientX, y: e.clientY, pid: e.pointerId, moved: false };
    return true;
  }
  function sheetDragMove(e) {
    var d = sdrag;
    if (!d || e.pointerId !== d.pid) return false;
    var dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved) {
      if (Math.abs(dx) >= 6 && Math.abs(dx) >= Math.abs(dy)) { sdrag = null; return true; }   // 가로가 더 크면 세로 끌기를 시작하지 않는다
      if (Math.abs(dy) < 6) return true;
      d.moved = true;
      d.sheet.classList.add('dragging');
      try { d.sheet.setPointerCapture(e.pointerId); } catch (err) { /* 못 잡아도 창 안에서는 그대로 돈다 */ }
      UI.hideBubble();
    }
    var y = dy > 0 ? dy : dy * SHEET_UP_PULL;
    d.sheet.style.transform = 'translateY(' + Math.round(y) + 'px)';
    return true;
  }
  function sheetDragEnd(e, cancel) {
    var d = sdrag;
    if (!d || e.pointerId !== d.pid) return false;
    sdrag = null;
    if (!d.moved) return true;
    eatClick = true;   // 끈 뒤 따라오는 누름은 버린다
    var dy = e.clientY - d.y;
    d.sheet.classList.remove('dragging');
    if (!cancel && dy >= SHEET_CLOSE && canClose(d.dim)) {
      // 손가락이 놓은 자리에서 아래로 마저 내려가며 닫힌다
      d.sheet.style.transform = 'translateY(100%)';
      closeEl(d.dim);
      setTimeout(function () { d.sheet.style.transform = ''; }, 320);   // 다 닫힌 뒤 손 위치를 지워 다음에 열 때 제자리에서 시작
    } else {
      d.sheet.style.transform = '';   // 제자리로 돌아온다 (CSS 전환)
    }
    return true;
  }
  function onDown(e) {
    eatClick = false;
    if (!e.target.closest) return;
    if (sheetDragStart(e)) { swipe = null; return; }
    var cell = e.target.closest('#sheet-bag .check:not(.out-cell):not(.add-cell)');   // '꺼낼 것'·'+ 물건' 칸은 길게 눌러도 그냥 누름
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
    if (swipe && swipe.drag) return;   // 미는 중에 닿은 다른 손가락은 쪽을 건드리지 않는다
    var sw = e.target.closest('.pager, [data-swipe]');
    swipe = sw ? { el: sw, x: e.clientX, y: e.clientY, pid: e.pointerId, day: sw.getAttribute('data-swipe') === 'day', cur: +sw.getAttribute('data-cur') || 0, drag: null } : null;
  }
  var EDGE_PULL = 0.35, DAY_PULL = 0.5;   // 첫 쪽·끝 쪽 바깥으로 밀 때, 날짜 카드를 밀 때 손가락을 따라오는 비율
  function onMove(e) {
    if (sheetDragMove(e)) return;
    if (press &&(Math.abs(e.clientX - press.x) > 10 || Math.abs(e.clientY - press.y) > 10)) { clearTimeout(press.timer); press = null; }
    var s = swipe;
    if (!s || e.pointerId !== s.pid) return;
    var dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (!s.drag) {
      if (Math.abs(dx) < 6 || Math.abs(dx) <= Math.abs(dy)) return;
      s.drag = s.day ? s.el : s.el.querySelector('.track');
      s.drag.classList.add('dragging');
      // 창 밖에서 놓아도 pointerup 을 받는다
      try { s.el.setPointerCapture(e.pointerId); } catch (err) { /* 못 잡아도 창 안에서는 그대로 돈다 */ }
      if (press) { clearTimeout(press.timer); press = null; }
      UI.hideBubble();
    }
    if (s.day) { s.drag.style.transform = 'translateX(' + Math.round(dx * DAY_PULL) + 'px)'; return; }
    var max = (+s.el.getAttribute('data-n') || 1) - 1;
    var outside = (s.cur <= 0 && dx > 0) || (s.cur >= max && dx < 0);
    s.drag.style.transform = 'translateX(calc(' + (-s.cur * 100) + '% + ' + Math.round(outside ? dx * EDGE_PULL : dx) + 'px))';
  }
  // 미는 것을 끝낸다: 쪽은 step 만큼 옮겨 붙이고(0 이면 제자리), 날짜 카드는 제자리로 돌아온 뒤 날을 바꾼다
  function settle(s, step) {
    if (s.drag) s.drag.classList.remove('dragging');
    if (s.day) {
      if (s.drag) s.drag.style.transform = '';
      if (step) { V.offset += step; renderAll(); UI.slideDay(step > 0 ? 1 : -1); }
      return;
    }
    var id = s.el.getAttribute('data-pg');
    V.pg[id] = UI.setPage(id, s.cur + step);
    if (V.pg[id] !== s.cur) SFX.page();
    UI.hideBubble();
  }
  function onUp(e) {
    if (sheetDragEnd(e, false)) return;
    if (press) { clearTimeout(press.timer); press = null; }
    var s = swipe;
    if (!s || e.pointerId !== s.pid) return;
    swipe = null;
    var dx = e.clientX - s.x, dy = e.clientY - s.y;
    var far = Math.abs(dx) >= 48 && Math.abs(dx) >= Math.abs(dy) * 1.2;
    if (!far && !s.drag) return;
    eatClick = true;   // 쪽이 움직였으면 짧게 밀었어도 칸을 누른 것으로 치지 않는다
    settle(s, far ? (dx < 0 ? 1 : -1) : 0);
  }
  function onCancel(e) {
    if (sheetDragEnd(e, true)) return;
    if (press) { clearTimeout(press.timer); press = null; }
    var s = swipe;
    if (!s || e.pointerId !== s.pid) return;
    swipe = null;
    if (s.drag) settle(s, 0);
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
    'form-kid': kidSubmit, 'form-after': submitAfter, 'form-note': submitNote, 'form-pack': submitPack,
    'form-event': submitEvent, 'form-backup': restore,
    'form-daily': function () { addDaily($('daily-add').value); },
    'form-rule': addRule,
    'form-guard': addGuardian, 'form-holiday': addHoliday, 'form-teacher': submitTeacher, 'form-times': submitTimes, 'form-edit': submitEdit, 'form-remind': submitRemind
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
    } else if (e.key === 'Enter' && e.target && e.target.id === 'goal-prize') {
      e.preventDefault();   // 약속 상: 엔터로도 저장
      goalSave();
    } else if (e.key === 'Enter' && e.target && e.target.id === 'bag-add') {
      e.preventDefault();   // 가방 시트 물건 넣기: 엔터로도 넣는다
      if (ready('bag-add-go')) bagAdd();
    } else if (e.key === 'Enter' && e.target && e.target.id === 'pack-add' && V.pack) {
      e.preventDefault();
      packAddItem();
    } else if (e.key === 'Enter' && e.target && e.target.id === 'kid-after-new' && V.kidAfter) {
      e.preventDefault();   // 아이 넣기 폼의 저장으로 가지 않고 꾸러미만 만든다
      kidAfterNewAdd();
    } else if (e.key === 'Enter' && e.target && e.target.id === 'kid-after-who-new' && V.kidAfter) {
      e.preventDefault();   // 아이 넣기 폼의 저장으로 가지 않고 사람만 넣는다
      kidAfterWhoAdd();
    } else if (e.key === 'Enter' && e.target && e.target.id === 'teach-add' && V.teach) {
      e.preventDefault();
      teachAddItem();
    } else if (e.key === 'Enter' && e.target && e.target.id === 'note-q') {
      e.preventDefault();
    } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && UI.isOpen('sheet-bag') && !(e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) {
      // 키보드로 가방 시트 쪽 넘기기
      e.preventDefault();
      clearTimeout(sinkTimer);
      V.pg.bag = UI.setPage('bag', (V.pg.bag || 0) + (e.key === 'ArrowRight' ? 1 : -1));
    }
  }

  function onChange(e) {
    var t = e.target;
    if (t.id === 'kid-grade') { V.tplEdits = {}; V.tplCell = null; }   // 학년을 바꾸면 고친 칸은 새 학년 표와 맞지 않아 비운다
    if (t.id === 'kid-grade' || t.id === 'kid-template') renderTpl();
    if (t.id === 'note-sort' && V.note) { V.noteSort = t.value; V.pg.sup = 0; UI.renderSupplies(S, V, V.note.items); }
    if (t.getAttribute && t.getAttribute('data-set') === 'switchHour') {
      S.settings.switchHour = +t.value;
      V.offset = 0;
      save(); renderAll();
      UI.toast('바꿨어요');
    }
    if (t.getAttribute && t.hasAttribute('data-base') && t.closest('.ed-cell')) t.closest('.ed-cell').classList.toggle('changed', t.value !== t.getAttribute('data-base'));
    if (t.classList && t.classList.contains('bad')) t.classList.remove('bad');
  }

  // 찾는 말: 칠 때마다 준비물 격자만 다시 그린다 (입력란 포커스가 그대로)
  function onInput(e) {
    var t = e.target;
    if (t.id === 'kid-name') {   // 이름을 넣으면 '다음' 이 열리고, 남아 있던 오류는 치운다
      $('kid-next').disabled = !Logic.norm(t.value);
      UI.clearErr('kid-name', 'kid-err');
    }
    else if (t.id === 'kid-note-paste' && V.kidNote) kidNotePaste();
    else if (t.id === 'note-q' && V.note) { V.noteQ = t.value; V.pg.sup = 0; UI.renderSupplies(S, V, V.note.items); }
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
    // 기기에서 어두운 화면을 켜고 끄면 '기기 따라' 일 때 바로 따라간다
    if (darkMQ) {
      if (darkMQ.addEventListener) darkMQ.addEventListener('change', applySettings);
      else if (darkMQ.addListener) darkMQ.addListener(applySettings);
    }
    window.addEventListener('resize', placeTour);
    window.addEventListener('resize', function () { if (UI.isOpen('ov-welcome')) UI.fitWelcomeShots(); });
    window.addEventListener('hashchange', readTeachHash);
    window.addEventListener('hashchange', readFamilyHash);
    setInterval(tick, 60000);
    if (!S.settings.welcomed && !/^#t=/.test(location.hash || '')) openWelcome();
    readTeachHash();
    readFamilyHash();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
