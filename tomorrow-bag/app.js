/* Tomorrow Bag — 상태와 동작 */
(function () {
  var $ = UI.$;
  var S = null;                 // 저장되는 데이터
  var V = {                     // 화면 상태 (저장하지 않음)
    screen: 'bag', offset: 0, range: '30',
    cell: null, after: null, note: null, pack: null, eventPick: null, kidEdit: null
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

  // ---- 그리기 ----
  function applySettings() {
    document.body.classList.toggle('dark', !!S.settings.dark);
    document.body.classList.toggle('reduce', !!S.settings.reduce);
    document.documentElement.style.setProperty('--k', String(S.settings.font || 1));
  }
  function renderAll() {
    var kid = curKid();
    if (kid) S.cur = kid.id;
    applySettings();
    UI.renderKids(S);
    var t = todayKey();
    UI.renderBag(S, V, kid, bagKey(), t);
    UI.renderWeek(S, V, kid, t);
    UI.renderPacks(S);
    UI.renderLog(S, V, kid, t);
    UI.renderMore(S, kid);
  }

  function go(name) {
    V.screen = name;
    UI.show(name);
  }

  function openSheet(id) { UI.openSheet(id); }
  function closeTop() {
    var on = UI.openSheets();
    if (!on.length) return false;
    var el = on[on.length - 1];
    if (el.id === 'ov-welcome') return false;
    UI.closeSheet(el.id);
    if (el.id === 'ov-confirm') confirmFn = null;
    return true;
  }

  // 지우기·바꾸기 전에 한 번 더 묻기
  function askConfirm(msg, yesLabel, fn) {
    $('confirm-msg').textContent = msg;
    $('confirm-yes').textContent = yesLabel || '네';
    confirmFn = fn;
    UI.openSheet('ov-confirm');
  }

  // ---- 아이 ----
  function openKid(id) {
    V.kidEdit = id || null;
    var k = null;
    S.kids.forEach(function (x) { if (x.id === id) k = x; });
    $('kid-title').textContent = k ? '아이 고치기' : '아이 넣기';
    $('kid-name').value = k ? k.name : '';
    $('kid-grade').value = k ? String(k.grade) : '1';
    $('kid-periods').value = k ? String(k.periods) : '6';
    $('kid-del').style.display = k ? '' : 'none';
    UI.clearErr('kid-name', 'kid-err');
    openSheet('sheet-kid');
  }
  function submitKid() {
    var name = Logic.norm($('kid-name').value);
    if (!name) return UI.fieldErr('kid-name', 'kid-err', '이름을 넣어 주세요.');
    if (name.length > Store.MAX_NAME) return UI.fieldErr('kid-name', 'kid-err', '이름은 ' + Store.MAX_NAME + '자 안으로 넣어 주세요.');
    var dup = S.kids.some(function (x) { return x.name === name && x.id !== V.kidEdit; });
    if (dup) return UI.fieldErr('kid-name', 'kid-err', '같은 이름의 아이가 있어요. 다른 이름으로 불러 주세요.');
    var grade = +$('kid-grade').value, periods = +$('kid-periods').value;
    rememberUndo();
    var k = null;
    S.kids.forEach(function (x) { if (x.id === V.kidEdit) k = x; });
    if (k) {
      k.name = name; k.grade = grade;
      if (periods !== k.periods) {
        for (var d = 1; d <= 5; d++) {
          var p = k.week[d].p;
          while (p.length < periods) p.push(null);
          k.week[d].p = p.slice(0, periods);
        }
        k.periods = periods;
      }
    } else {
      k = { id: Store.uid('k'), name: name, grade: grade, periods: periods, week: Store.emptyWeek(periods) };
      S.kids.push(k);
    }
    S.cur = k.id;
    save();
    UI.closeSheet('sheet-kid');
    renderAll();
    UI.toast(V.kidEdit ? '고쳤어요' : name + '을(를) 넣었어요. 시간표를 채워 볼까요?', !!V.kidEdit);
    if (!V.kidEdit) go('week');
  }
  function deleteKid() {
    var id = V.kidEdit;
    var k = S.kids.filter(function (x) { return x.id === id; })[0];
    if (!k) return;
    askConfirm(k.name + '의 시간표·알림장·기록을 모두 지울까요?', '지우기', function () {
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
    if (S.cur === id) S.cur = S.kids[0] ? S.kids[0].id : null;
  }

  // ---- 가방 체크 ----
  function toggleCheck(btn) {
    var kid = curKid();
    if (!kid) return;
    var name = btn.getAttribute('data-name');
    var ck = Logic.checkKey(kid.id, bagKey());
    var list = S.checks[ck] || (S.checks[ck] = []);
    var i = list.indexOf(name);
    if (i >= 0) list.splice(i, 1); else list.push(name);
    save();
    renderAll();
    var again = document.querySelector('.check[data-name="' + cssEsc(name) + '"]');
    if (again && i < 0) again.classList.add('pop');
    var pr = Logic.progress(S, kid, Logic.buildBag(S, kid, bagKey()));
    if (i < 0 && pr.total && pr.done === pr.total) {
      UI.flash($('bag-ring'));
      UI.toast('모두 챙겼어요! 다 쌌어요를 눌러 기록하세요');
    }
  }
  function cssEsc(s) { return String(s).replace(/["\\]/g, '\\$&'); }

  function checkAll() {
    var kid = curKid();
    if (!kid) return;
    var k = bagKey();
    var bag = Logic.buildBag(S, kid, k);
    rememberUndo();
    S.checks[Logic.checkKey(kid.id, k)] = bag.items.map(function (it) { return it.name; });
    save();
    renderAll();
    UI.flash($('bag-ring'));
    UI.toast('모두 체크했어요', true);
  }

  function bagDone() {
    var kid = curKid();
    if (!kid) return;
    var k = bagKey();
    var snap = Logic.snapshot(S, kid, k);
    if (!snap.total) return UI.toast('이날 챙길 물건이 없어요');
    rememberUndo();
    S.history = S.history.filter(function (h) { return !(h.kid === kid.id && h.date === k); });
    S.history.push(snap);
    save();
    renderAll();
    UI.flash($('bag-ring'));
    UI.toast(snap.missed.length ? '기록했어요. 빠진 것 ' + snap.missed.length + '개 — ' + snap.missed.slice(0, 2).join(', ') : '다 쌌어요! 빠진 것 없이 기록했어요', true);
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
  function share() {
    var kid = curKid();
    if (!kid) return UI.toast('아이를 먼저 넣어 주세요');
    copyText(Logic.shareText(S, kid, Logic.buildBag(S, kid, bagKey())), '가방 목록을 복사했어요. 가족 대화방에 붙여 넣으세요');
  }

  // ---- 알림장 ----
  function openNote(id, dateKey) {
    var kid = curKid();
    if (!kid) return UI.toast('아이를 먼저 넣어 주세요');
    var n = id ? S.notes.filter(function (x) { return x.id === id; })[0] : null;
    V.note = { id: n ? n.id : null, items: n ? n.items.slice() : [] };
    $('note-head').textContent = kid.name + ' 알림장 준비물';
    $('note-date').value = n ? n.date : (dateKey || bagKey());
    $('note-title').value = n ? (n.title || '') : '';
    $('note-add').value = '';
    $('note-del').style.display = n ? '' : 'none';
    var sel = $('note-cat');
    if (!sel.options.length) {
      DATA.SUPPLIES.forEach(function (g) { var o = document.createElement('option'); o.value = g.cat; o.textContent = g.cat; sel.appendChild(o); });
    }
    UI.clearErr('note-add', 'note-err');
    UI.clearErr('note-date', null);
    UI.renderNoteItems(V.note.items);
    UI.renderSupplies(sel.value, V.note.items);
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
    UI.renderSupplies($('note-cat').value, V.note.items);
    return true;
  }
  function noteSupply(name) {
    var i = V.note.items.indexOf(name);
    if (i >= 0) V.note.items.splice(i, 1);
    else noteAddItem(name);
    UI.renderNoteItems(V.note.items);
    UI.renderSupplies($('note-cat').value, V.note.items);
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
    if (!curKid()) return UI.toast('아이를 먼저 넣어 주세요');
    V.eventPick = null;
    $('event-date').value = bagKey();
    UI.clearErr('event-date', 'event-err');
    UI.renderEvents(null);
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
    UI.toast(packId ? DATA.DOW[d] + '요일 ' + (i + 1) + '교시 저장' : '빈 칸으로 바꿨어요', true);
  }
  function copyDay(to) {
    var kid = curKid();
    var from = V.cell.d;
    askConfirm(DATA.DOW[from] + '요일 시간표를 ' + DATA.DOW[to] + '요일에 덮어쓸까요? (방과후는 그대로)', '덮어쓰기', function () {
      rememberUndo();
      kid.week[to].p = kid.week[from].p.slice();
      save();
      UI.closeSheet('sheet-cell');
      renderAll();
      UI.toast(DATA.DOW[to] + '요일에 복사했어요', true);
    });
  }

  function fillWho(sel, cur) {
    var h = '<option value="">정하지 않음</option>';
    S.settings.guardians.forEach(function (g) { h += '<option' + (g === cur ? ' selected' : '') + '>' + UI.esc(g) + '</option>'; });
    sel.innerHTML = h;
  }
  function openAfter(d, id) {
    var kid = curKid();
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
    $('pack-title').textContent = p ? '꾸러미 고치기' : '새 꾸러미';
    $('pack-name').value = p ? p.name : '';
    $('pack-icon').value = p ? p.icon : '🎒';
    $('pack-kind').value = p ? p.kind : 'subj';
    $('pack-add').value = '';
    $('pack-del').style.display = p ? '' : 'none';
    UI.clearErr('pack-name', 'pack-err');
    UI.clearErr('pack-add', null);
    UI.renderPackItems(V.pack.items);
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
    UI.renderPackItems(V.pack.items);
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
    askConfirm('이 꾸러미를 지울까요? 시간표와 방과후에서도 빠집니다.', '지우기', function () {
      rememberUndo();
      detachPack(id);
      S.packs = S.packs.filter(function (p) { return p.id !== id; });
      save();
      UI.closeSheet('sheet-pack');
      renderAll();
      UI.toast('지웠어요', true);
    });
  }

  function addDaily(name, fromLog) {
    var t = Logic.norm(name);
    if (!t) return UI.fieldErr('daily-add', 'daily-err', '물건 이름을 넣어 주세요.');
    if (t.length > 40) return UI.fieldErr('daily-add', 'daily-err', '40자 안으로 넣어 주세요.');
    if (S.daily.indexOf(t) >= 0) {
      if (fromLog) return UI.toast('이미 매일 챙길 것에 있어요');
      return UI.fieldErr('daily-add', 'daily-err', '이미 있어요.');
    }
    rememberUndo();
    S.daily.push(t);
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
    rememberUndo();
    S.settings.guardians.push(t);
    save(); renderAll();
    UI.toast('넣었어요', true);
  }
  function addHoliday() {
    var d = $('holiday-add').value;
    if (!d || !Logic.validKey(d)) return UI.fieldErr('holiday-add', 'holiday-err', '날짜를 골라 주세요.');
    if (S.settings.holidays.indexOf(d) >= 0) return UI.fieldErr('holiday-add', 'holiday-err', '이미 넣은 날이에요.');
    var w = Logic.dow(d);
    if (w === 0 || w === 6) return UI.fieldErr('holiday-add', 'holiday-err', '주말은 넣지 않아도 저절로 건너뜁니다.');
    rememberUndo();
    S.settings.holidays.push(d);
    V.offset = 0;
    save(); renderAll();
    UI.toast(Logic.shortLabel(d) + '을(를) 쉬는 날로 넣었어요', true);
  }

  // ---- 내보내기·가져오기 ----
  function openBackup() {
    $('export-text').value = Store.exportText(S);
    $('restore-text').value = '';
    UI.clearErr('restore-text', 'restore-err');
    openSheet('sheet-backup');
  }
  function restore() {
    var r = Store.parseImport($('restore-text').value);
    if (!r.ok) return UI.fieldErr('restore-text', 'restore-err', r.errs.join(' '));
    askConfirm('지금 데이터를 가져온 데이터(아이 ' + r.data.kids.length + '명, 기록 ' + r.data.history.length + '일)로 바꿀까요?', '바꾸기', function () {
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

  // ---- 예시 ----
  function addSample() {
    if (S.kids.some(function (k) { return k.sample; })) return UI.toast('예시가 이미 들어 있어요');
    rememberUndo();
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
    S.kids.push({ id: id, name: '예시 하윤', grade: 2, periods: 6, week: w, sample: true });
    S.cur = id;
    var hs = S.settings.holidays;
    var next = Logic.bagDate(now(), S.settings);
    S.notes.push({ id: Store.uid('n'), kid: id, date: next, title: '미술 만들기', items: ['휴지 심 2개', '색종이'] });
    // 지난 학교 가는 날 8일 기록 (빠뜨린 것이 섞이게)
    var k = Logic.toKey(now());
    var miss = [[], ['리코더'], [], ['체육복', '물병'], [], [], ['숙제'], []];
    for (var i = 0; i < 8; i++) {
      k = Logic.prevSchoolDay(k, hs);
      var kid = S.kids[S.kids.length - 1];
      var bag = Logic.buildBag(S, kid, k);
      var names = bag.items.map(function (it) { return it.name; });
      var m = miss[i].filter(function (x) { return names.indexOf(x) >= 0; });
      if (!m.length && i % 3 === 1 && names.length) m = [names[names.length - 1]];
      S.history.push({ kid: id, date: k, total: names.length, done: names.length - m.length, missed: m, sample: true });
    }
    S.settings.welcomed = true;
    V.offset = 0;
    save();
    renderAll();
    UI.toast('예시를 넣었어요. 더보기에서 뺄 수 있어요', true);
  }
  function removeSample() {
    var ids = S.kids.filter(function (k) { return k.sample; }).map(function (k) { return k.id; });
    if (!ids.length) return UI.toast('들어 있는 예시가 없어요');
    askConfirm('예시 아이와 그 기록을 뺄까요?', '빼기', function () {
      rememberUndo();
      ids.forEach(removeKid);
      save();
      renderAll();
      UI.toast('예시를 뺐어요', true);
    });
  }

  function runSelfTest() {
    var res = Logic.selfTest();
    var ok = res.filter(function (r) { return r.ok; }).length;
    $('selftest-out').innerHTML = '<b>' + ok + ' / ' + res.length + ' 맞음</b><br>' + res.map(function (r) {
      return (r.ok ? '✓ ' : '✗ ') + UI.esc(r.name) + ' = ' + UI.esc(r.got) + (r.ok ? '' : ' (기대 ' + UI.esc(r.want) + ')');
    }).join('<br>');
  }

  // ---- 눌림 처리 ----
  var ACTIONS = {
    'go': function (b) { go(b.getAttribute('data-to')); },
    'kid-pick': function (b) { S.cur = b.getAttribute('data-id'); V.offset = 0; save(); renderAll(); },
    'kid-new': function () { openKid(null); },
    'kid-edit': function (b) { openKid(b.getAttribute('data-id')); },
    'kid-del': deleteKid,
    'day-prev': function () { V.offset--; renderAll(); },
    'day-next': function () { V.offset++; renderAll(); },
    'day-now': function () { V.offset = 0; renderAll(); },
    'check': toggleCheck,
    'check-all': checkAll,
    'bag-done': bagDone,
    'share': share,
    'note-new': function () { openNote(null); },
    'note-edit': function (b) { openNote(b.getAttribute('data-id')); },
    'note-add': function () { if (noteAddItem($('note-add').value) === true) $('note-add').value = ''; },
    'note-item-del': function (b) { V.note.items.splice(+b.getAttribute('data-i'), 1); UI.renderNoteItems(V.note.items); UI.renderSupplies($('note-cat').value, V.note.items); },
    'note-supply': function (b) { noteSupply(b.getAttribute('data-name')); },
    'note-del': deleteNote,
    'event-new': openEvent,
    'event-pick': function (b) { V.eventPick = b.getAttribute('data-id'); $('event-err').textContent = ''; UI.renderEvents(V.eventPick); },
    'cell': function (b) { openCell(+b.getAttribute('data-d'), +b.getAttribute('data-i')); },
    'cell-set': function (b) { setCell(b.getAttribute('data-id')); },
    'cell-clear': function () { setCell(null); },
    'cell-copy': function () { UI.renderCopyRow(V.cell.d); },
    'cell-copy-to': function (b) { copyDay(+b.getAttribute('data-d')); },
    'after-new': function (b) { openAfter(+b.getAttribute('data-d'), null); },
    'after-edit': function (b) { openAfter(+b.getAttribute('data-d'), b.getAttribute('data-id')); },
    'after-del': deleteAfter,
    'pack-new': function () { openPack(null); },
    'pack-edit': function (b) { openPack(b.getAttribute('data-id')); },
    'pack-add': packAddItem,
    'pack-item-del': function (b) { V.pack.items.splice(+b.getAttribute('data-i'), 1); UI.renderPackItems(V.pack.items); },
    'pack-del': deletePack,
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
    'range': function (b) { V.range = b.getAttribute('data-r'); renderAll(); },
    'to-daily': function (b) { addDaily(b.getAttribute('data-name'), true); },
    'hist-open': function (b) {
      var d = b.getAttribute('data-date');
      var base = Logic.bagDate(now(), S.settings), hs = S.settings.holidays, n = 0, k = base;
      // 그날까지 학교 가는 날 몇 칸인지 세어 가방 화면을 그날로
      if (d < base) { while (k > d && n > -400) { k = Logic.prevSchoolDay(k, hs); n--; } }
      else { while (k < d && n < 400) { k = Logic.nextSchoolDay(k, hs); n++; } }
      V.offset = k === d ? n : 0;
      renderAll(); go('bag');
    },
    'hist-del': function (b) {
      var d = b.getAttribute('data-date'), kid = curKid();
      askConfirm(Logic.shortLabel(d) + ' 기록을 지울까요?', '지우기', function () {
        rememberUndo();
        S.history = S.history.filter(function (h) { return !(h.kid === kid.id && h.date === d); });
        delete S.checks[Logic.checkKey(kid.id, d)];
        save(); renderAll(); UI.toast('지웠어요', true);
      });
    },
    'guard-del': function (b) {
      var i = +b.getAttribute('data-i');
      askConfirm(S.settings.guardians[i] + '을(를) 뺄까요?', '빼기', function () {
        rememberUndo(); S.settings.guardians.splice(i, 1); save(); renderAll(); UI.toast('뺐어요', true);
      });
    },
    'holiday-del': function (b) {
      var d = b.getAttribute('data-date');
      askConfirm(Logic.shortLabel(d) + '을(를) 쉬는 날에서 뺄까요?', '빼기', function () {
        rememberUndo();
        S.settings.holidays = S.settings.holidays.filter(function (x) { return x !== d; });
        V.offset = 0;
        save(); renderAll(); UI.toast('뺐어요', true);
      });
    },
    'font': function (b) { S.settings.font = +b.getAttribute('data-v'); save(); renderAll(); },
    'toggle-set': function (b) { var k = b.getAttribute('data-k'); S.settings[k] = !S.settings[k]; save(); renderAll(); },
    'backup': openBackup,
    'copy-export': function () { copyText($('export-text').value, '내보내기 글을 복사했어요'); },
    'print': function () { go('bag'); try { window.print(); } catch (e) { UI.toast('인쇄할 수 없는 브라우저예요'); } },
    'sample-add': addSample,
    'sample-del': removeSample,
    'clear-all': function () {
      askConfirm('모든 아이·시간표·꾸러미·기록을 지울까요? 되돌릴 수 없으니 먼저 내보내기를 해 두세요.', '전체 지우기', function () {
        Store.clear();
        S = Store.defaults();
        S.settings.welcomed = true;
        undoSnap = null;
        V.offset = 0;
        save(); renderAll(); go('bag');
        UI.toast('모두 지웠어요');
      });
    },
    'selftest': runSelfTest,
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
    'note-add': 'note', 'note-item-del': 'note', 'note-supply': 'note', 'note-del': 'note',
    'pack-add': 'pack', 'pack-item-del': 'pack', 'pack-del': 'pack', 'after-del': 'after',
    'form-note': 'note', 'form-pack': 'pack', 'form-after': 'after', 'form-event': 'kid'
  };
  function ready(name) {
    var need = NEED[name];
    if (!need) return true;
    if (need === 'kid') return !!curKid();
    if (!V[need]) return false;
    return need === 'pack' || !!curKid();
  }

  function onClick(e) {
    var b = e.target.closest('[data-act]');
    if (b) {
      if (b.disabled) return;
      var name = b.getAttribute('data-act');
      var f = ACTIONS[name];
      if (f) { e.preventDefault(); if (ready(name)) f(b); }
      return;
    }
    // 시트 바깥(어두운 배경)을 누르면 닫기
    if (e.target.classList && e.target.classList.contains('dim') && e.target.id !== 'ov-welcome') {
      UI.closeSheet(e.target.id);
      if (e.target.id === 'ov-confirm') confirmFn = null;
    }
  }

  var FORMS = {
    'form-kid': submitKid, 'form-after': submitAfter, 'form-note': submitNote, 'form-pack': submitPack,
    'form-event': submitEvent, 'form-backup': restore,
    'form-daily': function () { addDaily($('daily-add').value, false); },
    'form-guard': addGuardian, 'form-holiday': addHoliday
  };
  function onSubmit(e) {
    var f = FORMS[e.target.id];
    if (f) { e.preventDefault(); if (ready(e.target.id)) f(); }
  }

  function onKey(e) {
    if (e.key === 'Escape') { if (closeTop()) e.preventDefault(); return; }
    if (e.key === 'Enter' && e.target && e.target.id === 'note-add' && V.note) {
      e.preventDefault();
      if (noteAddItem(e.target.value) === true) e.target.value = '';
    } else if (e.key === 'Enter' && e.target && e.target.id === 'pack-add' && V.pack) {
      e.preventDefault();
      packAddItem();
    }
  }

  function onChange(e) {
    var t = e.target;
    if (t.id === 'note-cat' && V.note) UI.renderSupplies(t.value, V.note.items);
    if (t.getAttribute && t.getAttribute('data-set') === 'switchHour') {
      S.settings.switchHour = +t.value;
      V.offset = 0;
      save(); renderAll();
      UI.toast('바꿨어요');
    }
    if (t.classList && t.classList.contains('bad')) t.classList.remove('bad');
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
    var r = Store.load();
    S = r.data;
    if (!r.ok) $('store-warn').classList.add('on');
    Logic.closePast(S, todayKey());
    lastDay = todayKey();
    UI.renderHelp();
    renderAll();
    document.addEventListener('click', onClick);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('keydown', onKey);
    document.addEventListener('change', onChange);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(); });
    setInterval(tick, 60000);
    if (!S.settings.welcomed) UI.openSheet('ov-welcome');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
