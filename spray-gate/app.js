/* Spray Gate — 상태·입력·동작 */
(function () {
  'use strict';
  var L = window.Logic, UI = window.UI, Store = window.Store, D = window.DATA;
  function $(id) { return document.getElementById(id); }

  var loaded = Store.load();
  var st = loaded.data;
  var now0 = L.today();
  var ui = {
    screen: 'today', tip: L.diff('2026-01-01', now0) % D.TIPS.length,
    logMonth: now0.slice(0, 7), logField: '', logQ: '', logSort: 'new', prodQ: '', prodKind: '', prodSort: 'name', gateField: '', gateDate: ''
  };
  if (ui.tip < 0) ui.tip = 0;
  var draft = newDraft();
  var undoSnap = '';
  var pending = null;
  var lastDay = now0;

  function uid() { return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function newDraft(fid) {
    return {
      editId: '', fieldId: fid || (st.fields[0] ? st.fields[0].id : ''), date: L.today(),
      water: st.settings.tank, tanks: 1, pids: [], targets: [], weather: [], memo: '', safety: []
    };
  }

  // ---------- 저장 ----------
  function save() {
    var err = Store.save(st);
    var w = $('store-warn');
    if (err) {
      w.textContent = err;
      w.hidden = false;
      UI.toast(err);
      return false;
    }
    return true;
  }
  function snapshot() { undoSnap = JSON.stringify(st); }

  // ---------- 소리 (첫 터치 뒤에만) ----------
  var actx = null;
  function wake() {
    if (actx || !st.settings.sound) return;
    try {
      var C = window.AudioContext || window.webkitAudioContext;
      if (C) actx = new C();
    } catch (e) { actx = null; }
  }
  function beep(kind) {
    if (!st.settings.sound || !actx) return;
    try {
      var o = actx.createOscillator(), g = actx.createGain();
      var f = { ok: 660, bad: 220, tap: 880, del: 330 }[kind] || 660;
      o.frequency.value = f;
      o.type = kind === 'bad' ? 'square' : 'sine';
      g.gain.setValueAtTime(0.0001, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.08, actx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + (kind === 'tap' ? 0.06 : 0.18));
      o.connect(g); g.connect(actx.destination);
      o.start(); o.stop(actx.currentTime + 0.2);
    } catch (e) { /* 소리 없이 계속 */ }
  }

  function done(msg, undo) { UI.toast(msg, undo); beep('ok'); }
  function fail(id, msg) { UI.fieldErr(id, msg); beep('bad'); return false; }

  // ---------- 보기 ----------
  function look() {
    var S = st.settings;
    var reduce = false;
    try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { reduce = false; }
    document.body.classList.toggle('big', !!S.big);
    document.body.classList.toggle('calm', !!S.calm || reduce);
    document.body.classList.toggle('dark', !!S.dark);
  }

  function renderAll() {
    if (draft.fieldId && !L.findField(st, draft.fieldId)) draft.fieldId = st.fields[0] ? st.fields[0].id : '';
    if (!draft.fieldId && st.fields[0]) draft.fieldId = st.fields[0].id;
    draft.pids = draft.pids.filter(function (p) { return !!L.findProduct(st, p); });
    UI.renderToday(st, ui);
    UI.renderSpray(st, draft);
    UI.renderFields(st);
    UI.renderProducts(st, ui);
    UI.renderLog(st, ui);
    UI.renderMore(st);
  }

  function go(to) {
    ui.screen = to;
    if (to === 'spray') UI.renderSpray(st, draft);
    UI.show(to);
  }

  function askConfirm(msg, yes, fn) {
    pending = fn;
    $('confirm-msg').textContent = msg;
    $('confirm-yes').textContent = yes || '지우기';
    UI.openOverlay('ov-confirm');
  }

  function copyText(text, okMsg) {
    var doneCopy = function () { done(okMsg); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(doneCopy, function () { fallbackCopy(text, okMsg); });
        return;
      }
    } catch (e) { /* 아래로 */ }
    fallbackCopy(text, okMsg);
  }
  function fallbackCopy(text, okMsg) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    if (ok) done(okMsg); else UI.toast('복사하지 못했어요. 글을 길게 눌러 직접 복사해 주세요');
  }

  function refreshCalc() {
    var c = $('spray-calc');
    if (c) { c.innerHTML = UI.sprayCalcHtml(st, draft); UI.flash(c); }
  }

  function toggleIn(arr, v) {
    var i = arr.indexOf(v);
    if (i >= 0) arr.splice(i, 1); else arr.push(v);
  }

  // ---------- 예시 ----------
  function addSample() {
    var t = L.today();
    var A = { id: 'ex-f1', name: '앞밭 1동 (예시)', crop: '상추', start: L.addDays(t, -40), harvest: L.addDays(t, 6), area: 660, memo: '' };
    var B = { id: 'ex-f2', name: '뒷밭 (예시)', crop: '고추', start: L.addDays(t, -120), harvest: L.addDays(t, 3), area: 990, memo: '' };
    var P = [
      { id: 'ex-p1', name: '노균병 약 (예시)', kind: 'fung', dil: 1000, unit: 'mL', phi: 7, max: 3, memo: '예시 카드 — 실제 라벨 값이 아님' },
      { id: 'ex-p2', name: '진딧물 약 (예시)', kind: 'insect', dil: 2000, unit: 'mL', phi: 3, max: 2, memo: '예시 카드 — 실제 라벨 값이 아님' },
      { id: 'ex-p3', name: '흰가루병 약 (예시)', kind: 'fung', dil: 1500, unit: 'g', phi: 14, max: 2, memo: '예시 카드 — 실제 라벨 값이 아님' },
      { id: 'ex-p4', name: '잎 영양제 (예시)', kind: 'etc', dil: 500, unit: 'mL', phi: 0, max: 0, memo: '예시 카드' }
    ];
    function item(p) { return { pid: p.id, name: p.name, kind: p.kind, dil: p.dil, unit: p.unit, phi: p.phi, max: p.max }; }
    var S = [
      { id: 'ex-s1', fieldId: 'ex-f1', date: L.addDays(t, -10), water: 20, tanks: 2, items: [item(P[0])], targets: ['노균병'], weather: ['아침', '바람 약함'], memo: '', safety: 18 },
      { id: 'ex-s2', fieldId: 'ex-f1', date: L.addDays(t, -2), water: 20, tanks: 2, items: [item(P[1]), item(P[3])], targets: ['진딧물'], weather: ['저녁'], memo: '아랫잎 위주', safety: 20 },
      { id: 'ex-s3', fieldId: 'ex-f2', date: L.addDays(t, -20), water: 100, tanks: 1, items: [item(P[1])], targets: ['진딧물', '총채벌레'], weather: ['노지'], memo: '', safety: 15 },
      { id: 'ex-s4', fieldId: 'ex-f2', date: L.addDays(t, -5), water: 100, tanks: 1, items: [item(P[2])], targets: ['흰가루병'], weather: ['흐림'], memo: '', safety: 16 }
    ];
    removeSample();
    st.fields = st.fields.concat([A, B]);
    st.products = st.products.concat(P);
    st.sprays = st.sprays.concat(S);
    st.sample = true;
  }
  function removeSample() {
    function real(x) { return x.id.indexOf('ex-') !== 0; }
    st.fields = st.fields.filter(real);
    st.products = st.products.filter(real);
    st.sprays = st.sprays.filter(function (s) { return real(s) && s.fieldId.indexOf('ex-') !== 0; });
    st.sample = false;
  }

  // ---------- 누르기 ----------
  var ACT = {
    go: function (el) { go(el.getAttribute('data-to')); },
    'tip-next': function () { ui.tip = (ui.tip + 1) % D.TIPS.length; var t = $('tip-text'); if (t) { t.textContent = D.TIPS[ui.tip]; UI.flash(t); } beep('tap'); },
    'close-sheet': function () { UI.closeSheet(); UI.renderSpray(st, draft); },
    'confirm-yes': function () { UI.closeOverlay('ov-confirm'); var fn = pending; pending = null; if (fn) fn(); },
    'confirm-no': function () { pending = null; UI.closeOverlay('ov-confirm'); },
    undo: function () {
      if (!undoSnap) return;
      try { st = JSON.parse(undoSnap); } catch (e) { return; }
      undoSnap = '';
      save(); look(); renderAll();
      UI.toast('되돌렸어요');
    },
    'welcome-start': function () { st.welcomed = true; save(); UI.closeOverlay('ov-welcome'); ACT['open-field'](null); },
    'welcome-sample': function () { st.welcomed = true; addSample(); save(); renderAll(); UI.closeOverlay('ov-welcome'); done('예시 밭 2곳과 약 카드 4장을 넣었어요'); },

    // 살포
    'spray-for': function (el) { draft = newDraft(el.getAttribute('data-id')); go('spray'); },
    'spray-cancel': function () { draft = newDraft(draft.fieldId); UI.renderSpray(st, draft); },
    'sp-tank': function (el) { draft.water = Number(el.getAttribute('data-v')); UI.renderSpray(st, draft); refreshCalc(); beep('tap'); },
    'sp-area': function () {
      var f = L.findField(st, draft.fieldId);
      if (!f || !f.area) return;
      draft.water = L.waterForArea(f.area, st.settings.per10a);
      draft.tanks = 1;
      UI.renderSpray(st, draft); refreshCalc();
    },
    'sp-prod': function (el) { toggleIn(draft.pids, el.getAttribute('data-id')); UI.renderSpray(st, draft); refreshCalc(); beep('tap'); },
    'sp-target': function (el) { toggleIn(draft.targets, el.getAttribute('data-v')); el.setAttribute('aria-pressed', String(draft.targets.indexOf(el.getAttribute('data-v')) >= 0)); },
    'sp-weather': function (el) { toggleIn(draft.weather, el.getAttribute('data-v')); el.setAttribute('aria-pressed', String(draft.weather.indexOf(el.getAttribute('data-v')) >= 0)); },
    'open-safety': function () { UI.safetySheet(draft); UI.openSheet('sheet-safety'); },
    'safe-toggle': function (el) {
      var i = Number(el.getAttribute('data-i'));
      toggleIn(draft.safety, i);
      el.setAttribute('aria-pressed', String(draft.safety.indexOf(i) >= 0));
      var c = $('safety-count'); if (c) c.textContent = draft.safety.length + '/' + D.SAFETY.length + ' 확인';
      beep('tap');
    },
    'safe-all': function () { draft.safety = D.SAFETY.map(function (s, i) { return i; }); UI.safetySheet(draft); done('모두 확인했어요'); },

    // 밭
    'open-field': function (el) {
      var id = el ? el.getAttribute('data-id') : '';
      UI.fieldSheet(st, id ? L.findField(st, id) : null);
      UI.openSheet('sheet-field');
    },
    'f-crop': function (el) { var i = $('f-crop'); if (i) { i.value = el.getAttribute('data-v'); UI.flash(i); } },
    'field-del': function (el) {
      var id = el.getAttribute('data-id');
      var f = L.findField(st, id);
      if (!f) return;
      var n = st.sprays.filter(function (s) { return s.fieldId === id; }).length;
      askConfirm('"' + f.name + '" 밭과 그 밭 살포 기록 ' + n + '개를 지울까요?', '지우기', function () {
        snapshot();
        st.fields = st.fields.filter(function (x) { return x.id !== id; });
        st.sprays = st.sprays.filter(function (s) { return s.fieldId !== id; });
        save(); UI.closeSheet(); renderAll();
        UI.toast('밭을 지웠어요', true); beep('del');
      });
    },
    'open-gate': function (el) {
      if (!st.fields.length) { ACT['open-field'](null); return; }
      var id = el ? el.getAttribute('data-id') : '';
      var f = L.findField(st, id) || st.fields[0];
      ui.gateField = f.id;
      ui.gateDate = f.harvest || L.today();
      UI.gateSheet(st, ui);
      UI.openSheet('sheet-gate');
    },
    'copy-share': function () { copyText(L.shareText(st, L.today()), '수확 가능일 글을 복사했어요'); },

    // 약 카드
    'open-product': function (el) {
      var id = el ? el.getAttribute('data-id') : '';
      UI.productSheet(st, id ? L.findProduct(st, id) : null);
      UI.openSheet('sheet-product');
    },
    'p-kind': function (el) {
      var k = el.getAttribute('data-k');
      var h = $('p-kind'); if (h) h.value = k;
      Array.prototype.forEach.call(document.querySelectorAll('[data-act="p-kind"]'), function (b) { b.setAttribute('aria-pressed', String(b === el)); });
    },
    'p-dil': function (el) {
      var i = $('p-dil'); if (i) { i.value = el.getAttribute('data-v'); UI.flash(i); }
      Array.prototype.forEach.call(document.querySelectorAll('[data-act="p-dil"]'), function (b) { b.setAttribute('aria-pressed', String(b === el)); });
    },
    'product-del': function (el) {
      var id = el.getAttribute('data-id');
      var p = L.findProduct(st, id);
      if (!p) return;
      askConfirm('"' + p.name + '" 약 카드를 지울까요? 지난 일지의 기록은 남아요.', '지우기', function () {
        snapshot();
        st.products = st.products.filter(function (x) { return x.id !== id; });
        save(); UI.closeSheet(); renderAll();
        UI.toast('약 카드를 지웠어요', true); beep('del');
      });
    },
    'prod-kind': function (el) { ui.prodKind = el.getAttribute('data-k'); UI.renderProducts(st, ui); },
    'prod-all': function () { ui.prodKind = ''; ui.prodQ = ''; UI.renderProducts(st, ui); },
    'prod-sort': function (el) { ui.prodSort = el.getAttribute('data-k'); UI.renderProducts(st, ui); UI.flash($('prod-list')); },

    // 일지
    'open-record': function (el) {
      var s = L.findSpray(st, el.getAttribute('data-id'));
      if (!s) return;
      UI.recordSheet(st, s);
      UI.openSheet('sheet-record');
    },
    'record-again': function (el) {
      var s = L.findSpray(st, el.getAttribute('data-id'));
      if (!s) return;
      draft = newDraft(s.fieldId);
      draft.water = s.water; draft.tanks = s.tanks || 1;
      draft.pids = s.items.map(function (i) { return i.pid; }).filter(function (p) { return !!L.findProduct(st, p); });
      draft.targets = (s.targets || []).slice();
      UI.closeSheet(); go('spray');
      if (draft.pids.length < s.items.length) UI.toast('지운 약 카드는 빼고 채웠어요');
    },
    'record-edit': function (el) {
      var s = L.findSpray(st, el.getAttribute('data-id'));
      if (!s) return;
      draft = {
        editId: s.id, fieldId: s.fieldId, date: s.date, water: s.water, tanks: s.tanks || 1,
        pids: s.items.map(function (i) { return i.pid; }).filter(function (p) { return !!L.findProduct(st, p); }),
        targets: (s.targets || []).slice(), weather: (s.weather || []).slice(), memo: s.memo || '',
        safety: D.SAFETY.map(function (x, i) { return i; }).slice(0, s.safety || 0)
      };
      UI.closeSheet(); go('spray');
    },
    'record-del': function (el) {
      var id = el.getAttribute('data-id');
      var s = L.findSpray(st, id);
      if (!s) return;
      askConfirm(L.md(s.date) + ' 살포 기록을 지울까요? 수확 가능일이 다시 계산돼요.', '지우기', function () {
        snapshot();
        st.sprays = st.sprays.filter(function (x) { return x.id !== id; });
        if (draft.editId === id) draft = newDraft(draft.fieldId);
        save(); UI.closeSheet(); renderAll();
        UI.toast('기록을 지웠어요', true); beep('del');
      });
    },
    'log-prev': function () { ui.logMonth = shiftMonth(ui.logMonth, -1); UI.renderLog(st, ui); },
    'log-next': function () { ui.logMonth = shiftMonth(ui.logMonth, 1); UI.renderLog(st, ui); },
    'log-field': function (el) { ui.logField = el.getAttribute('data-id'); UI.renderLog(st, ui); },
    'log-reset': function () { ui.logField = ''; ui.logQ = ''; UI.renderLog(st, ui); },
    'log-sort': function (el) { ui.logSort = el.getAttribute('data-k'); UI.renderLog(st, ui); UI.flash($('log-list')); },
    'print-log': function () {
      UI.printSheet(st, ui);
      try { window.print(); } catch (e) { UI.toast('이 브라우저에서는 인쇄를 열 수 없어요. 브라우저 메뉴의 인쇄를 써 주세요'); }
    },

    // 더보기
    toggle: function (el) {
      var k = el.getAttribute('data-k');
      st.settings[k] = !st.settings[k];
      if (k === 'sound' && st.settings.sound) wake();
      look(); save();
      el.setAttribute('aria-pressed', String(!!st.settings[k]));
      UI.flash(el); beep('tap');
    },
    'open-backup': function () { UI.backupSheet(st); UI.openSheet('sheet-backup'); },
    'copy-export': function () { copyText(Store.exportText(st), '전체 기록 글을 복사했어요'); },
    'sample-add': function () { snapshot(); addSample(); save(); renderAll(); done('예시 밭 2곳과 약 카드 4장을 넣었어요', true); },
    'sample-remove': function () {
      askConfirm('예시 밭·약 카드·기록을 모두 뺄까요? 내가 넣은 것은 그대로예요.', '빼기', function () {
        snapshot(); removeSample(); save(); renderAll(); UI.toast('예시를 뺐어요', true);
      });
    },
    'clear-all': function () {
      askConfirm('밭·약 카드·일지·설정을 모두 지울까요? 바로 뒤에는 되돌릴 수 있어요.', '전체 지우기', function () {
        snapshot();
        st = Store.blank();
        st.welcomed = true;
        draft = newDraft();
        save(); look(); renderAll();
        UI.toast('모두 지웠어요', true); beep('del');
      });
    },
    'self-test': function () {
      var o = $('test-out');
      if (!o) return;
      o.innerHTML = UI.testsHtml(L.selfTest());
      UI.flash(o);
    }
  };

  function shiftMonth(ym, n) {
    var y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)) - 1 + n;
    var d = new Date(y, m, 1);
    return d.getFullYear() + '-' + L.pad(d.getMonth() + 1);
  }

  // ---------- 입력 (폼) ----------
  var FORM = {
    'form-spray': function (form) {
      var f = L.findField(st, draft.fieldId);
      if (!f) return fail('sp-field', '밭을 골라 주세요');
      var date = $('sp-date').value;
      if (!L.validDate(date)) return fail('sp-date', '뿌린 날을 골라 주세요');
      if (L.diff(L.today(), date) > 60) return fail('sp-date', '60일 넘게 앞날은 넣을 수 없어요');
      var w = L.checkNum($('sp-water').value, 0.5, 5000, '한 통 물');
      if (!w.ok) return fail('sp-water', w.msg);
      var tk = L.checkNum($('sp-tanks').value, 1, 50, '통 수', true);
      if (!tk.ok) return fail('sp-tanks', tk.msg);
      if (!draft.pids.length) return fail('sp-prod', '약 카드를 하나 이상 눌러 주세요');
      var memo = L.checkText($('sp-memo').value, 120, '메모');
      if (!memo.ok) return fail('sp-memo', memo.msg);
      var items = draft.pids.map(function (pid) {
        var p = L.findProduct(st, pid);
        return { pid: p.id, name: p.name, kind: p.kind, dil: p.dil, unit: p.unit, phi: p.phi, max: p.max };
      });
      var verdict = L.planSpray(st, f.id, date, draft.pids, draft.editId);
      var rec = { id: draft.editId || uid(), fieldId: f.id, date: date, water: w.val, tanks: tk.val, items: items, targets: draft.targets.slice(), weather: draft.weather.slice(), memo: memo.val, safety: draft.safety.length };
      snapshot();
      if (draft.editId) st.sprays = st.sprays.map(function (s) { return s.id === draft.editId ? rec : s; });
      else st.sprays.push(rec);
      if (!save()) return false;
      draft = newDraft(f.id);
      renderAll();
      go('today');
      var card = document.querySelector('#today-root .fcard[data-id="' + f.id + '"]');
      UI.flash(card);
      var g = L.gate(st, f.id);
      done('저장했어요 · ' + f.name + ' 수확 문 ' + (g.earliest ? L.md(g.earliest) : '-') + (verdict.verdict === 'bad' ? ' (수확 예정과 겹쳐요)' : ''), true);
      return true;
    },
    'form-field': function () {
      var name = L.checkText($('f-name').value, 30, '밭 이름', true);
      if (!name.ok) return fail('f-name', name.msg);
      var crop = L.checkText($('f-crop').value, 20, '작물', true);
      if (!crop.ok) return fail('f-crop', crop.msg);
      var start = $('f-start').value, harvest = $('f-harvest').value;
      if (start && !L.validDate(start)) return fail('f-start', '작기 시작일이 바르지 않아요');
      if (harvest && !L.validDate(harvest)) return fail('f-harvest', '수확 예정일이 바르지 않아요');
      if (start && harvest && harvest < start) return fail('f-harvest', '수확 예정일이 작기 시작일보다 앞이에요');
      var areaRaw = $('f-area').value.trim();
      var area = 0;
      if (areaRaw) { var a = L.checkNum(areaRaw, 0, 1000000, '면적', true); if (!a.ok) return fail('f-area', a.msg); area = a.val; }
      var memo = L.checkText($('f-memo').value, 60, '메모');
      if (!memo.ok) return fail('f-memo', memo.msg);
      var id = $('f-id').value;
      var dup = st.fields.filter(function (x) { return x.name === name.val && x.id !== id; }).length;
      if (dup) return fail('f-name', '같은 이름의 밭이 있어요');
      snapshot();
      var rec = { id: id || uid(), name: name.val, crop: crop.val, start: start, harvest: harvest, area: area, memo: memo.val };
      if (id) st.fields = st.fields.map(function (x) { return x.id === id ? rec : x; });
      else { st.fields.push(rec); if (!draft.fieldId) draft.fieldId = rec.id; }
      if (!save()) return false;
      UI.closeSheet(); renderAll();
      done(id ? '밭을 고쳤어요' : '밭을 넣었어요', !!id);
      return true;
    },
    'form-product': function () {
      var name = L.checkText($('p-name').value, 30, '약 이름', true);
      if (!name.ok) return fail('p-name', name.msg);
      var dil = L.checkNum($('p-dil').value, 1, 10000, '희석배수');
      if (!dil.ok) return fail('p-dil', dil.msg);
      var phi = L.checkNum($('p-phi').value, 0, 365, '수확 전 날수', true);
      if (!phi.ok) return fail('p-phi', phi.msg);
      var max = L.checkNum($('p-max').value, 0, 50, '횟수', true);
      if (!max.ok) return fail('p-max', max.msg);
      var memo = L.checkText($('p-memo').value, 80, '메모');
      if (!memo.ok) return fail('p-memo', memo.msg);
      var id = $('p-id').value;
      var kind = $('p-kind').value || 'etc';
      var unit = $('p-unit').value === 'g' ? 'g' : 'mL';
      snapshot();
      var rec = { id: id || uid(), name: name.val, kind: kind, dil: dil.val, unit: unit, phi: phi.val, max: max.val, memo: memo.val };
      if (id) st.products = st.products.map(function (x) { return x.id === id ? rec : x; });
      else st.products.push(rec);
      if (!save()) return false;
      UI.closeSheet(); renderAll();
      done(id ? '약 카드를 고쳤어요' : '약 카드를 만들었어요', !!id);
      return true;
    },
    'form-gate': function () {
      var d = $('g-date').value;
      if (!L.validDate(d)) return fail('g-date', '수확할 날을 골라 주세요');
      ui.gateDate = d;
      ui.gateField = $('g-field').value;
      var o = $('gate-out');
      o.innerHTML = UI.gateOutHtml(st, ui);
      UI.flash(o);
      var r = L.checkHarvest(st, ui.gateField, d);
      beep(r.verdict === 'bad' ? 'bad' : 'ok');
      return true;
    },
    'form-settings': function () {
      var m = L.checkNum($('set-margin').value, 0, 14, '여유 날수', true);
      if (!m.ok) return fail('set-margin', m.msg);
      var p = L.checkNum($('set-per10a').value, 10, 2000, '10a당 물 양');
      if (!p.ok) return fail('set-per10a', p.msg);
      st.settings.margin = m.val;
      st.settings.per10a = p.val;
      st.settings.tank = Number($('set-tank').value) || 20;
      if (!save()) return false;
      renderAll();
      done('계산 기준을 저장했어요');
      return true;
    },
    'form-backup': function () {
      var r = Store.parseImport($('restore-text').value);
      if (!r.ok) return fail('restore-text', r.msg);
      askConfirm('지금 기록을 붙여 넣은 글의 기록(밭 ' + r.data.fields.length + ' · 약 카드 ' + r.data.products.length + ' · 살포 ' + r.data.sprays.length + ')으로 바꿀까요?', '바꾸기', function () {
        snapshot();
        st = r.data;
        st.welcomed = true;
        draft = newDraft();
        save(); look(); UI.closeSheet(); renderAll();
        UI.toast('기록을 되살렸어요', true);
      });
      return true;
    }
  };

  function onInput(e) {
    var t = e.target;
    if (!t || !t.id) return;
    if (t.removeAttribute && t.getAttribute('aria-invalid')) {
      t.removeAttribute('aria-invalid');
      var b = $(t.id + '-err'); if (b) { b.hidden = true; b.textContent = ''; }
    }
    switch (t.id) {
      case 'sp-water': draft.water = t.value; refreshCalc(); break;
      case 'sp-tanks': draft.tanks = t.value; refreshCalc(); break;
      case 'sp-memo': draft.memo = t.value; break;
      case 'sp-date': draft.date = t.value; refreshCalc(); break;
      case 'prod-q': ui.prodQ = t.value; $('prod-list').innerHTML = UI.productListHtml(st, filterProducts()); break;
      case 'log-q': ui.logQ = t.value; $('log-list').innerHTML = UI.logListHtml(st, ui); break;
      default: break;
    }
  }
  function onChange(e) {
    var t = e.target;
    if (!t || !t.id) return;
    if (t.id === 'sp-field') { draft.fieldId = t.value; UI.renderSpray(st, draft); refreshCalc(); }
    else if (t.id === 'sp-date') { draft.date = t.value; refreshCalc(); }
    else if (t.id === 'g-field' || t.id === 'g-date') {
      ui.gateField = $('g-field').value;
      if (L.validDate($('g-date').value)) ui.gateDate = $('g-date').value;
      $('gate-out').innerHTML = UI.gateOutHtml(st, ui);
    }
  }
  function filterProducts() {
    var q = ui.prodQ.trim();
    return L.sortProducts(st, st.products.filter(function (p) {
      return (!ui.prodKind || p.kind === ui.prodKind) && (!q || p.name.indexOf(q) >= 0 || (p.memo || '').indexOf(q) >= 0);
    }), ui.prodSort);
  }

  function bind() {
    document.addEventListener('pointerdown', wake, { passive: true });
    document.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!el || el.disabled) return;
      var fn = ACT[el.getAttribute('data-act')];
      if (!fn) return;
      e.preventDefault();
      fn(el, e);
    });
    document.addEventListener('submit', function (e) {
      var form = e.target;
      e.preventDefault();
      var fn = FORM[form.id];
      if (!fn) return;
      UI.clearErrs(form);
      fn(form);
    });
    // 브라우저 메뉴(Ctrl+P)로 인쇄해도 지금 일지 달·밭 거르기대로 인쇄 표를 채운다
    window.addEventListener('beforeprint', function () { UI.printSheet(st, ui); });
    document.addEventListener('input', onInput);
    document.addEventListener('change', onChange);
    // 열어 둔 채 자정을 넘기면 오늘 날짜로 다시 계산한다
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      var t = L.today();
      if (t !== lastDay) { lastDay = t; if (!draft.editId && draft.date < t) draft.date = t; renderAll(); }
    });
    setInterval(function () {
      var t = L.today();
      if (t !== lastDay && !document.hidden) { lastDay = t; renderAll(); }
    }, 60000);
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!$('ov-confirm').hidden) { ACT['confirm-no'](); return; }
      if (UI.sheetOpen()) { ACT['close-sheet'](); return; }
      if (!$('ov-welcome').hidden) { st.welcomed = true; save(); UI.closeOverlay('ov-welcome'); }
    });
  }

  function init() {
    if (loaded.warn) { var w = $('store-warn'); w.textContent = loaded.warn; w.hidden = false; }
    look();
    UI.renderHelp();
    renderAll();
    bind();
    UI.show('today');
    if (!st.welcomed) UI.openOverlay('ov-welcome');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
