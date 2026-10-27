/* Ride Tally 동작 — 상태, 운행(시작·쉬기·콜·끝), 지출·고정비·정비·일하는 곳, 설정, 예시, 내보내기, 되돌리기 */
(function () {
  'use strict';
  var L = window.Logic, D = window.RT_DATA, U = window.UI, Store = window.Store;

  var A = {
    S: null,
    ui: {
      layers: [], screen: 'home', call: null, logRange: 'week', logOff: 0, mapRange: 'all', costOff: 0,
      resultId: null, shiftId: null, expDraft: null, fixedId: null, platId: null, maintKey: null,
      selCell: null, flashCells: null, confirm: null, undo: null, welcomeVeh: null, tipI: null
    }
  };
  window.App = A;

  A.ctx = function () { return { settings: A.S.settings, fixed: A.S.fixed, platforms: A.S.platforms }; };
  A.today = function () { return L.toKey(new Date()); };
  A.findShift = function (id) { for (var i = 0; i < A.S.shifts.length; i++) if (A.S.shifts[i].id === id) return A.S.shifts[i]; return null; };
  function findIn(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function $(id) { return document.getElementById(id); }
  function val(id) { var el = $(id); return el ? String(el.value).trim() : ''; }

  function save() {
    var ok = Store.save(A.S);
    var w = $('store-warn');
    if (!ok) { w.textContent = '저장하지 못했어요. 이 브라우저의 저장 공간이 꺼져 있거나 가득 찼을 수 있어요. 내보내기로 기록을 옮겨 두세요.'; w.hidden = false; }
    else if (w.getAttribute('data-load') !== '1') w.hidden = true;
    return ok;
  }

  function applySettings() {
    var st = A.S.settings, h = document.documentElement;
    h.classList.toggle('light', !!st.light);
    h.classList.toggle('reduce', !!st.reduce);
    h.classList.remove('fs-2', 'fs-3');
    if (st.fs === 2) h.classList.add('fs-2');
    if (st.fs === 3) h.classList.add('fs-3');
  }

  // ---------- 화면 ----------
  function go(name) {
    if (name === 'ride' && !A.S.ride) name = 'home';
    if (name === 'result' && !A.ui.resultId) name = 'home';
    A.ui.screen = name;
    render(name);
    U.show(name);
  }
  function render(name) {
    name = name || A.ui.screen;
    if (name === 'home') U.renderHome();
    else if (name === 'ride') U.rideTick();
    else if (name === 'result') U.renderResult();
    else if (name === 'log') U.renderLog();
    else if (name === 'map') U.renderMap();
    else if (name === 'cost') U.renderCost();
    else if (name === 'more') U.renderMore();
    else if (name === 'help') U.renderHelp();
  }
  function refresh() {
    render();
    if (U.topLayer() === 'sheet-shift') U.renderShift();
  }

  // ---------- 소리·진동 (첫 터치 뒤에만) ----------
  var audio = null;
  function unlockAudio() {
    if (audio) return;
    try { var AC = window.AudioContext || window.webkitAudioContext; if (AC) audio = new AC(); } catch (e) { audio = null; }
  }
  function beep(freq, ms) {
    if (!A.S.settings.sound || !audio) return;
    try {
      var o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
      o.type = 'triangle'; o.frequency.value = freq || 880;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + (ms || 120) / 1000);
      o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + (ms || 120) / 1000 + 0.02);
    } catch (e) { /* 소리 없음 */ }
  }
  function buzz(p) { if (!A.S.settings.vib) return; try { if (navigator.vibrate) navigator.vibrate(p || 30); } catch (e) { /* 진동 없음 */ } }

  // ---------- 되돌리기·한 번 더 묻기 ----------
  function withUndo(msg, fn) {
    var snap = JSON.stringify(A.S);
    fn();
    save();
    A.ui.undo = snap;
    U.toast(msg, true);
    refresh();
  }
  function doUndo() {
    if (!A.ui.undo) return;
    try { A.S = Store.fill(JSON.parse(A.ui.undo)); } catch (e) { return; }
    A.ui.undo = null;
    save(); applySettings();
    U.toast('되돌렸어요');
    if (A.ui.screen === 'ride' && !A.S.ride) A.ui.screen = 'home';
    if (A.ui.screen === 'result' && !A.findShift(A.ui.resultId)) A.ui.screen = 'home';
    go(A.ui.screen);
    if (U.topLayer() === 'sheet-shift') { if (A.findShift(A.ui.shiftId)) U.renderShift(); else U.closeLayer('sheet-shift'); }
  }
  function askConfirm(text, yes, fn) {
    A.ui.confirm = fn;
    $('confirm-text').textContent = text;
    $('confirm-yes').textContent = yes || '확인';
    U.openLayer('ov-confirm');
  }

  // ---------- 운행 ----------
  function openStart() {
    if (A.S.ride) { go('ride'); return; }
    U.renderStart();
    U.openLayer('sheet-start');
  }
  function startRide(odo) {
    if (A.S.ride) return;
    A.S.ride = { id: L.uid('s'), startMs: Date.now(), breaks: [], calls: [], startOdo: odo > 0 ? odo : null };
    if (odo > 0) A.S.odo = odo;
    save();
    U.closeLayer('sheet-start');
    go('ride');
    beep(660, 120); buzz(20);
  }
  function openBreak() { var b = A.S.ride && A.S.ride.breaks; return b && b.length && b[b.length - 1].e == null ? b[b.length - 1] : null; }
  function toggleBreak() {
    if (!A.S.ride) return;
    var ob = openBreak();
    if (ob) { ob.e = Date.now(); U.toast('다시 출발! 일한 시간을 이어서 셉니다'); }
    else { A.S.ride.breaks.push({ s: Date.now(), e: null }); U.toast('쉬는 시간은 시간당 계산에서 빠져요'); }
    save(); U.rideTick();
  }
  function openCall(opts) {
    opts = opts || {};
    var pid = A.S.lastPid;
    if (!findIn(A.S.platforms, pid) || findIn(A.S.platforms, pid).gone) {
      var first = A.S.platforms.filter(function (p) { return !p.gone; })[0];
      pid = first ? first.id : (A.S.platforms[0] && A.S.platforms[0].id);
    }
    A.ui.call = { amt: '', pid: pid, tags: [], shiftId: opts.shiftId || null, editCallId: null };
    if (opts.edit) {
      A.ui.call.amt = String(opts.edit.amt); A.ui.call.pid = opts.edit.pid; A.ui.call.tags = (opts.edit.tags || []).slice();
      A.ui.call.editCallId = opts.edit.id;
    }
    if (!opts.shiftId && !A.S.ride) { U.toast('먼저 운행을 시작하세요'); return; }
    U.clearErrs($('form-call'));
    U.renderCall();
    U.openLayer('sheet-call');
  }
  function submitCall() {
    var c = A.ui.call;
    if (!c) return;
    c.amt = val('call-amt');
    var err = L.checkAmount(c.amt);
    if (!U.fieldErr('call-amt', err)) return;
    var amt = +c.amt;
    if (c.shiftId) {
      var sh = A.findShift(c.shiftId);
      if (!sh) { U.closeLayer('sheet-call'); return; }
      withUndo(c.editCallId ? '콜을 고쳤어요' : '지난 운행에 콜을 더했어요', function () {
        if (c.editCallId) {
          var cc = findIn(sh.calls, c.editCallId);
          if (cc) { cc.amt = amt; cc.pid = c.pid; cc.tags = c.tags.slice(); }
        } else {
          sh.calls.push({ id: L.uid('c'), at: Math.max(sh.startMs, sh.endMs - 60000), amt: amt, pid: c.pid, tags: c.tags.slice() });
        }
        A.S.lastPid = c.pid;
      });
      A.ui.call = null;
      U.closeLayer('sheet-call');
      if (U.topLayer() === 'sheet-shift') U.renderShift();
      return;
    }
    if (!A.S.ride) { U.closeLayer('sheet-call'); return; }
    A.S.ride.calls.push({ id: L.uid('c'), at: Date.now(), amt: amt, pid: c.pid, tags: c.tags.slice() });
    A.S.lastPid = c.pid;
    save();
    A.ui.call = null;
    U.closeLayer('sheet-call');
    U.rideTick(); U.callPop();
    beep(988, 90); setTimeout(function () { beep(1318, 110); }, 90); buzz(25);
    U.toast(L.won(amt) + ' 찍었어요 · ' + A.S.ride.calls.length + '번째');
  }
  function undoCall() {
    if (!A.S.ride || !A.S.ride.calls.length) return;
    var c = A.S.ride.calls.pop();
    save(); U.rideTick();
    U.toast(L.won(c.amt) + ' 콜을 지웠어요');
  }
  function openEnd() {
    if (!A.S.ride) return;
    U.renderEnd();
    U.openLayer('sheet-end');
  }
  function submitEnd() {
    var R = A.S.ride;
    if (!R) { U.closeLayer('sheet-end'); return; }
    U.clearErrs($('form-end'));
    var odoS = val('end-odo'), kmS = val('end-km'), memo = val('end-memo');
    var km = 0, endOdo = null;
    if (odoS) {
      if (isNaN(+odoS) || +odoS < 0 || +odoS > 999999) { U.fieldErr('end-odo', '0~999,999 사이 숫자로 넣어 주세요'); return; }
      endOdo = +odoS;
      if (R.startOdo) {
        km = endOdo - R.startOdo;
        if (km < 0) { U.fieldErr('end-odo', '출발 때(' + L.num(R.startOdo) + 'km)보다 작아요'); return; }
        if (km > 1000) { U.fieldErr('end-odo', '한 번 운행에 1,000km를 넘을 수 없어요. 숫자를 다시 보세요'); return; }
      } else if (!kmS) {
        U.fieldErr('end-km', '출발 때 계기판을 안 넣었어요. 주행 km를 넣어 주세요'); return;
      }
    }
    if (kmS && !(odoS && R.startOdo)) {
      var e = L.checkKm(kmS, 1000);
      if (!U.fieldErr('end-km', e)) return;
      km = +kmS;
    }
    if (memo.length > 120) { U.fieldErr('end-memo', '120자까지 넣을 수 있어요'); return; }
    finishRide(km, endOdo, memo);
  }
  function finishRide(km, endOdo, memo) {
    var R = A.S.ride, now = Date.now();
    var ob = openBreak(); if (ob) ob.e = now;
    var work = L.workMs(R.startMs, now, R.breaks);
    U.closeLayer('sheet-end');
    if (work < 60000 && !R.calls.length) {
      A.S.ride = null; save();
      U.toast('1분이 안 되고 콜도 없어 남기지 않았어요');
      go('home'); return;
    }
    var sh = { id: R.id, date: L.toKey(R.startMs), startMs: R.startMs, endMs: now, breaks: R.breaks, calls: R.calls, km: Math.round(km * 10) / 10, memo: memo || '' };
    A.S.shifts.push(sh);
    if (endOdo != null) A.S.odo = Math.max(A.S.odo || 0, endOdo);
    else if (A.S.odo > 0 && km > 0) A.S.odo = Math.round(A.S.odo + km);
    A.S.ride = null;
    save();
    A.ui.resultId = sh.id;
    go('result');
    U.flash('res-head');
    if (U.goalHit(sh)) {
      // 그날 목표를 처음 넘김: 세 음 올라가기
      beep(784, 120); setTimeout(function () { beep(988, 120); }, 130); setTimeout(function () { beep(1318, 220); }, 260);
      buzz([30, 60, 30]);
    } else {
      beep(784, 120); setTimeout(function () { beep(1046, 160); }, 130);
    }
  }

  // ---------- 지난 운행 ----------
  function openShift(id) {
    if (!A.findShift(id)) return;
    A.ui.shiftId = id;
    U.renderShift();
    U.openLayer('sheet-shift');
  }
  function submitShift() {
    var sh = A.findShift(A.ui.shiftId);
    if (!sh) return;
    var km = val('shift-km'), memo = val('shift-memo');
    if (!U.fieldErr('shift-km', L.checkKm(km, 1000))) return;
    if (memo.length > 120) { U.fieldErr('shift-memo', '120자까지 넣을 수 있어요'); return; }
    withUndo('운행을 고쳤어요', function () { sh.km = km === '' ? 0 : Math.round(+km * 10) / 10; sh.memo = memo; });
    U.renderShift();
  }

  // ---------- 지출 ----------
  function openExpense(id) {
    var e = id ? findIn(A.S.expenses, id) : null;
    A.ui.expDraft = e ? { id: e.id, cat: e.cat } : { id: null, cat: 'fuel' };
    U.clearErrs($('form-exp'));
    $('exp-amt').value = e ? e.amt : '';
    $('exp-date').value = e ? e.date : A.today();
    $('exp-memo').value = e ? (e.memo || '') : '';
    U.renderExpense();
    U.openLayer('sheet-expense');
  }
  function submitExpense() {
    var d = A.ui.expDraft; if (!d) return;
    var amt = val('exp-amt'), date = val('exp-date'), memo = val('exp-memo');
    var ok = U.fieldErr('exp-amt', L.checkRange(amt, 1, 10000000, '금액'));
    ok = U.fieldErr('exp-date', L.validKey(date) ? (date > L.addDays(A.today(), 1) ? '앞으로 올 날은 넣을 수 없어요' : '') : '날짜를 골라 주세요') && ok;
    ok = U.fieldErr('exp-memo', memo.length > 60 ? '60자까지 넣을 수 있어요' : '') && ok;
    if (!ok) return;
    withUndo(d.id ? '지출을 고쳤어요' : '지출을 넣었어요', function () {
      if (d.id) { var e = findIn(A.S.expenses, d.id); if (e) { e.amt = Math.round(+amt); e.date = date; e.memo = memo; e.cat = d.cat; } }
      else A.S.expenses.push({ id: L.uid('e'), date: date, cat: d.cat, amt: Math.round(+amt), memo: memo });
    });
    U.closeLayer('sheet-expense');
    U.flash('cost-exp');
  }

  // ---------- 고정비 ----------
  function openFixed(id) {
    var f = id ? findIn(A.S.fixed, id) : null;
    A.ui.fixedId = f ? f.id : null;
    U.clearErrs($('form-fixed'));
    $('fixed-title').textContent = f ? '매달 나가는 돈 고치기' : '매달 나가는 돈';
    $('fixed-name').value = f ? f.name : '';
    $('fixed-amt').value = f ? f.monthly : '';
    U.renderFixedForm();
    U.openLayer('sheet-fixed');
  }
  function submitFixed() {
    var name = val('fixed-name'), amt = val('fixed-amt');
    var ok = U.fieldErr('fixed-name', L.checkName(name, 30));
    ok = U.fieldErr('fixed-amt', L.checkRange(amt, 0, 5000000, '금액')) && ok;
    if (!ok) return;
    var id = A.ui.fixedId;
    withUndo(id ? '고정비를 고쳤어요' : '고정비를 넣었어요', function () {
      if (id) { var f = findIn(A.S.fixed, id); if (f) { f.name = name; f.monthly = Math.round(+amt); } }
      else A.S.fixed.push({ id: L.uid('f'), name: name, monthly: Math.round(+amt) });
    });
    U.closeLayer('sheet-fixed');
    U.flash('cost-fixed');
  }

  // ---------- 일하는 곳 ----------
  function openPlat(id) {
    var p = id ? findIn(A.S.platforms, id) : null;
    A.ui.platId = p ? p.id : null;
    U.clearErrs($('form-plat'));
    $('plat-title').textContent = p ? '일하는 곳 고치기' : '일하는 곳 더하기';
    $('plat-name').value = p ? p.name : '';
    $('plat-cut').value = p ? p.cut : 3.3;
    $('plat-per').value = p ? p.perCall : 0;
    U.openLayer('sheet-platform');
  }
  function submitPlat() {
    var name = val('plat-name'), cut = val('plat-cut'), per = val('plat-per');
    var ok = U.fieldErr('plat-name', L.checkName(name, 16));
    var id = A.ui.platId;
    if (ok && A.S.platforms.some(function (p) { return !p.gone && p.id !== id && p.name === name; })) ok = U.fieldErr('plat-name', '같은 이름이 이미 있어요');
    ok = U.fieldErr('plat-cut', L.checkRange(cut, 0, 50, '비율')) && ok;
    ok = U.fieldErr('plat-per', L.checkRange(per, 0, 10000, '건당 금액')) && ok;
    if (!ok) return;
    withUndo(id ? '일하는 곳을 고쳤어요' : '일하는 곳을 더했어요', function () {
      if (id) { var p = findIn(A.S.platforms, id); if (p) { p.name = name; p.cut = Math.round(+cut * 10) / 10; p.perCall = Math.round(+per); } }
      else {
        if (A.S.platforms.filter(function (p) { return !p.gone; }).length >= 8) return;
        A.S.platforms.push({ id: L.uid('p'), name: name, cut: Math.round(+cut * 10) / 10, perCall: Math.round(+per), color: A.S.platforms.length % 6 });
      }
    });
    U.closeLayer('sheet-platform');
    U.flash('more-plat');
  }
  function delPlat(id) {
    var p = findIn(A.S.platforms, id); if (!p) return;
    var live = A.S.platforms.filter(function (x) { return !x.gone; });
    if (live.length <= 1) { U.toast('일하는 곳은 하나는 남아 있어야 해요'); return; }
    askConfirm('「' + p.name + '」' + (L.josa(p.name, '을').slice(-1)) + ' 지울까요? 지난 콜과 계산은 그대로 남아요.', '지우기', function () {
      withUndo('일하는 곳을 지웠어요', function () { p.gone = true; if (A.S.lastPid === id) A.S.lastPid = live.filter(function (x) { return x.id !== id; })[0].id; });
    });
  }

  // ---------- 정비 ----------
  function maintItem(key) { return D.MAINT.filter(function (m) { return m.key === key; })[0]; }
  function openMaint(key) {
    var item = maintItem(key); if (!item) return;
    A.ui.maintKey = key;
    var rec = A.S.maint[key] || {};
    var st = L.maintStatus(item, rec, A.S.odo, A.today());
    U.clearErrs($('form-maint'));
    $('maint-title').textContent = item.name;
    $('maint-hint').textContent = st.text ? '지금: ' + st.text : '';
    var byKm = st.interval > 0;
    $('maint-odo-wrap').hidden = !byKm;
    $('maint-odo').value = byKm ? (A.S.odo || '') : '';
    $('maint-date').value = A.today();
    $('maint-int-label').textContent = byKm ? '주기 (km)' : '주기 (일)';
    $('maint-int').value = byKm ? st.interval : st.days;
    $('maint-exp').checked = false;
    $('maint-cost').value = '';
    $('maint-cost-wrap').hidden = true;
    U.openLayer('sheet-maint');
  }
  function submitMaint() {
    var key = A.ui.maintKey, item = maintItem(key); if (!item) return;
    var rec = A.S.maint[key] || {};
    var byKm = L.maintStatus(item, rec, A.S.odo, A.today()).interval > 0;
    var odo = val('maint-odo'), date = val('maint-date'), iv = val('maint-int'), cost = val('maint-cost'), withExp = $('maint-exp').checked;
    var ok = true;
    if (byKm) ok = U.fieldErr('maint-odo', L.checkRange(odo, 0, 999999, '계기판 km')) && ok;
    ok = U.fieldErr('maint-date', L.validKey(date) ? (date > A.today() ? '앞으로 올 날은 넣을 수 없어요' : '') : '날짜를 골라 주세요') && ok;
    ok = U.fieldErr('maint-int', byKm ? L.checkRange(iv, 100, 100000, '주기') : L.checkRange(iv, 1, 3650, '주기')) && ok;
    if (withExp) ok = U.fieldErr('maint-cost', L.checkRange(cost, 1, 5000000, '정비비')) && ok;
    if (!ok) return;
    withUndo(item.name + ' 정비를 남겼어요', function () {
      var r = A.S.maint[key] = A.S.maint[key] || {};
      if (byKm) { r.lastKm = Math.round(+odo); r.km = Math.round(+iv); A.S.odo = Math.max(A.S.odo || 0, Math.round(+odo)); }
      else r.days = Math.round(+iv);
      r.lastDate = date;
      if (withExp) A.S.expenses.push({ id: L.uid('e'), date: date, cat: /tire/.test(key) ? 'tire' : 'repair', amt: Math.round(+cost), memo: item.name });
    });
    U.closeLayer('sheet-maint');
    U.flash('cost-maint');
  }

  // ---------- 설정 ----------
  function submitSettings() {
    var st = A.S.settings;
    var goal = val('set-goal'), days = val('set-days'), hours = val('set-hours'), aside = val('set-aside');
    var ok = U.fieldErr('set-goal', L.checkRange(goal, 10000, 1000000, '목표'));
    ok = U.fieldErr('set-days', L.checkRange(days, 1, 31, '일하는 날')) && ok;
    ok = U.fieldErr('set-hours', L.checkRange(hours, 1, 16, '하루 시간')) && ok;
    ok = U.fieldErr('set-aside', L.checkRange(aside, 0, 50, '비율')) && ok;
    var kmpl, fuel, perkm;
    if (st.costMode === 'perKm') { perkm = val('set-perkm'); ok = U.fieldErr('set-perkm', L.checkRange(perkm, 0, 500, 'km당 비용')) && ok; }
    else {
      kmpl = val('set-kmpl'); fuel = val('set-fuel');
      ok = U.fieldErr('set-kmpl', L.checkRange(kmpl, 1, 100, '연비')) && ok;
      ok = U.fieldErr('set-fuel', L.checkRange(fuel, 500, 5000, '기름값')) && ok;
    }
    if (!ok) return;
    withUndo('설정을 저장했어요', function () {
      st.goal = Math.round(+goal); st.workDays = Math.round(+days); st.dayHours = Math.round(+hours); st.setAside = Math.round(+aside);
      if (st.costMode === 'perKm') st.perKm = +perkm;
      else { st.kmPerL = Math.round(+kmpl * 10) / 10; st.fuelPrice = Math.round(+fuel); }
    });
    U.flash('more-goal');
  }
  function setVehicle(id) {
    var v = D.VEHICLES.filter(function (x) { return x.id === id; })[0]; if (!v) return;
    withUndo('차종을 「' + v.name + '」 기준으로 바꿨어요', function () {
      var st = A.S.settings;
      st.vehicle = v.id; st.costMode = v.mode;
      if (v.mode === 'fuel') st.kmPerL = v.kmPerL; else st.perKm = v.perKm;
    });
  }

  // ---------- 예시 ----------
  function addSample() {
    if (A.S.shifts.some(function (s) { return s.sample; })) { U.toast('예시 기록이 이미 들어 있어요'); return; }
    withUndo('예시 기록을 넣었어요 (21일)', function () {
      var seed = 7;
      var rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      var today = A.today();
      var pids = A.S.platforms.filter(function (p) { return !p.gone; }).map(function (p) { return p.id; });
      for (var i = 21; i >= 1; i--) {
        var k = L.addDays(today, -i), wd = L.weekdayIdx(k);
        if (wd === 2 && i % 2) continue; // 쉬는 날
        var plan = wd >= 5 ? [[11, 4], [17, 4]] : [[11, 3], [18, 3.5]];
        plan.forEach(function (pl) {
          var d = L.fromKey(k);
          var st = new Date(d.getFullYear(), d.getMonth(), d.getDate(), pl[0], Math.floor(rnd() * 30)).getTime();
          var en = st + pl[1] * L.HOUR;
          var calls = [], t = st + 12 * 60000;
          var rain = rnd() < 0.15;
          while (t < en - 5 * 60000) {
            var hr = new Date(t).getHours();
            var peak = (hr >= 11 && hr < 13) || (hr >= 18 && hr < 20);
            var amt = [3000, 3500, 4000, 4000, 4500, 5000, 6000][Math.floor(rnd() * 7)] + (rain ? 1000 : 0) + (wd >= 5 ? 500 : 0);
            var tags = []; if (rain) tags.push('rain'); if (peak) tags.push('peak'); if (wd >= 5) tags.push('weekend');
            calls.push({ id: L.uid('c'), at: t, amt: amt, pid: pids[Math.floor(rnd() * pids.length)], tags: tags });
            t += (peak ? 14 : 26) * 60000 + Math.floor(rnd() * 10) * 60000;
          }
          var brks = pl[1] >= 4 ? [{ s: st + 2 * L.HOUR, e: st + 2 * L.HOUR + 20 * 60000 }] : [];
          A.S.shifts.push({ id: L.uid('s'), date: k, startMs: st, endMs: en, breaks: brks, calls: calls, km: Math.round(pl[1] * (14 + rnd() * 8)), memo: rain ? '비 와서 천천히' : '', sample: true });
        });
      }
      A.S.expenses.push({ id: L.uid('e'), date: L.addDays(today, -15), cat: 'fuel', amt: 12000, memo: '셀프 주유', sample: true });
      A.S.expenses.push({ id: L.uid('e'), date: L.addDays(today, -8), cat: 'fuel', amt: 13000, memo: '셀프 주유', sample: true });
      A.S.expenses.push({ id: L.uid('e'), date: L.addDays(today, -6), cat: 'repair', amt: 25000, memo: '엔진오일', sample: true });
      A.S.expenses.push({ id: L.uid('e'), date: L.addDays(today, -2), cat: 'food', amt: 8000, memo: '김밥·물', sample: true });
      if (!A.S.fixed.length) A.S.fixed.push({ id: L.uid('f'), name: '유상운송 보험 (예시)', monthly: 120000, sample: true });
      A.S.shifts.sort(function (x, y) { return x.startMs - y.startMs; });
      A.S.settings.welcomed = true;
    });
  }
  function removeSample() {
    askConfirm('예시로 넣은 운행·지출·고정비를 모두 뺄까요? 내가 넣은 기록은 그대로예요.', '빼기', function () {
      withUndo('예시 기록을 뺐어요', function () {
        var no = function (x) { return !x.sample; };
        A.S.shifts = A.S.shifts.filter(no); A.S.expenses = A.S.expenses.filter(no); A.S.fixed = A.S.fixed.filter(no);
      });
    });
  }

  // ---------- 내보내기 ----------
  function copyText(text, okMsg) {
    var done = function () { U.toast(okMsg); };
    var fallback = function () {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      U.toast(ok ? okMsg : '복사하지 못했어요. 글을 길게 눌러 직접 복사해 주세요');
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
    } catch (e) { fallback(); }
  }
  function callsCsv() {
    var rows = ['날짜,시각,금액,일하는 곳,꼬리표'];
    A.S.shifts.forEach(function (s) {
      s.calls.forEach(function (c) {
        var tags = (c.tags || []).map(function (t) { var x = D.TAGS.filter(function (g) { return g.id === t; })[0]; return x ? x.name : t; }).join(' ');
        rows.push([s.date, L.hhmm(c.at), c.amt, '"' + L.platformOf(A.ctx(), c.pid).name.replace(/"/g, '""') + '"', '"' + tags + '"'].join(','));
      });
    });
    return rows.join('\n');
  }
  function submitBackup() {
    var r = Store.parseImport(val('restore-text'));
    if (!r.ok) { U.fieldErr('restore-text', r.why); return; }
    U.fieldErr('restore-text', '');
    askConfirm('지금 기록을 붙여 넣은 기록(운행 ' + r.data.shifts.length + '번)으로 바꿀까요?', '바꾸기', function () {
      withUndo('기록을 되살렸어요', function () { r.data.ride = r.data.ride || null; A.S = r.data; });
      applySettings();
      U.closeLayer('sheet-backup');
      go('home');
    });
  }

  // ---------- 누름 ----------
  var ACTS = {
    'go': function (el) { closeAllSheets(); go(el.getAttribute('data-to')); },
    'close': function () { var t = U.topLayer(); if (t) U.closeLayer(t); },
    'ride-start-open': openStart,
    'ride-break': toggleBreak,
    'call-open': function () { openCall(); },
    'call-chip': function (el) { if (!A.ui.call) return; A.ui.call.amt = el.getAttribute('data-amt'); U.fieldErr('call-amt', ''); U.renderCall(); },
    'call-plat': function (el) { if (!A.ui.call) return; A.ui.call.pid = el.getAttribute('data-pid'); U.renderCall(); },
    'call-tag': function (el) {
      var c = A.ui.call; if (!c) return;
      var t = el.getAttribute('data-t'), i = c.tags.indexOf(t);
      c.amt = val('call-amt');
      if (i >= 0) c.tags.splice(i, 1); else c.tags.push(t);
      U.renderCall();
    },
    'np': function (el) {
      var c = A.ui.call; if (!c) return;
      var k = el.getAttribute('data-k'), s = val('call-amt');
      if (k === 'back') s = s.slice(0, -1);
      else if (s.length < 6) s = (s === '0' ? '' : s) + k;
      if (s.length > 6) s = s.slice(0, 6);
      if (/^0+$/.test(s)) s = '';
      c.amt = s; $('call-amt').value = s; U.fieldErr('call-amt', '');
      U.renderCall();
    },
    'call-undo': undoCall,
    'ride-end': openEnd,
    'result-map': function () {
      var sh = A.findShift(A.ui.resultId), fl = {};
      if (sh) {
        var cells = L.heat([sh], A.ctx());
        for (var d = 0; d < 7; d++) for (var h = 0; h < 24; h++) if (cells[d][h].hours > 0.01) fl[d + '-' + h] = 1;
      }
      A.ui.mapRange = 'all'; A.ui.flashCells = fl; go('map');
    },
    'shift-open': function (el) { openShift(el.getAttribute('data-id')); },
    'call-edit': function (el) {
      var sh = A.findShift(el.getAttribute('data-sid')); if (!sh) return;
      var c = findIn(sh.calls, el.getAttribute('data-cid')); if (!c) return;
      openCall({ shiftId: sh.id, edit: c });
    },
    'call-del': function (el) {
      var sh = A.findShift(el.getAttribute('data-sid')); if (!sh) return;
      var c = findIn(sh.calls, el.getAttribute('data-cid')); if (!c) return;
      askConfirm(L.hhmm(c.at) + ' ' + L.won(c.amt) + ' 콜을 지울까요?', '지우기', function () {
        withUndo('콜을 지웠어요', function () { sh.calls = sh.calls.filter(function (x) { return x.id !== c.id; }); });
      });
    },
    'call-add-past': function (el) { var sh = A.findShift(el.getAttribute('data-sid')); if (sh) openCall({ shiftId: sh.id }); },
    'shift-del': function (el) {
      var id = el.getAttribute('data-id'), sh = A.findShift(id); if (!sh) return;
      askConfirm(L.dayLabel(sh.date) + ' ' + L.hhmm(sh.startMs) + ' 운행을 통째로 지울까요? 콜 ' + sh.calls.length + '건도 함께 지워져요.', '지우기', function () {
        U.closeLayer('sheet-shift');
        withUndo('운행을 지웠어요', function () { A.S.shifts = A.S.shifts.filter(function (x) { return x.id !== id; }); });
        if (A.ui.screen === 'result' && A.ui.resultId === id) go('log');
      });
    },
    'log-range': function (el) { A.ui.logRange = el.getAttribute('data-v'); A.ui.logOff = 0; U.renderLog(); },
    'log-prev': function () { A.ui.logOff--; U.renderLog(); },
    'log-next': function () { if (A.ui.logOff < 0) A.ui.logOff++; U.renderLog(); },
    'map-range': function (el) { A.ui.mapRange = el.getAttribute('data-v'); A.ui.selCell = null; U.renderMap(); },
    'cell': function (el) {
      var d = +el.getAttribute('data-d'), h = +el.getAttribute('data-h');
      if (!(d >= 0 && d < 7 && h >= 0 && h < 24)) return;
      A.ui.selCell = { d: d, h: h };
      U.renderCell(); U.openLayer('sheet-cell');
    },
    'cell-step': function (el) {
      var c = A.ui.selCell; if (!c) return;
      c.h = (c.h + (+el.getAttribute('data-v')) + 24) % 24;
      U.renderCell();
    },
    'cell-day': function (el) {
      var c = A.ui.selCell; if (!c) return;
      c.d = +el.getAttribute('data-d');
      U.renderCell();
    },
    'cost-prev': function () { A.ui.costOff--; U.renderCost(); },
    'cost-next': function () { if (A.ui.costOff < 0) A.ui.costOff++; U.renderCost(); },
    'exp-new': function () { openExpense(null); },
    'exp-open': function (el) { openExpense(el.getAttribute('data-id')); },
    'exp-cat': function (el) { if (!A.ui.expDraft) return; A.ui.expDraft.cat = el.getAttribute('data-c'); U.renderExpense(); },
    'exp-del': function () {
      var d = A.ui.expDraft; if (!d || !d.id) return;
      askConfirm('이 지출을 지울까요?', '지우기', function () {
        U.closeLayer('sheet-expense');
        withUndo('지출을 지웠어요', function () { A.S.expenses = A.S.expenses.filter(function (x) { return x.id !== d.id; }); });
      });
    },
    'fixed-new': function () { openFixed(null); },
    'fixed-open': function (el) { openFixed(el.getAttribute('data-id')); },
    'fixed-del': function (el) {
      var f = findIn(A.S.fixed, el.getAttribute('data-id')); if (!f) return;
      askConfirm('「' + f.name + '」 고정비를 지울까요? 지난 운행의 실수입도 다시 계산돼요.', '지우기', function () {
        withUndo('고정비를 지웠어요', function () { A.S.fixed = A.S.fixed.filter(function (x) { return x.id !== f.id; }); });
      });
    },
    'apply-kmpl': function (el) {
      var v = +el.getAttribute('data-v'); if (!(v >= 1 && v <= 100)) return;
      withUndo('연비를 ' + v + 'km/L로 바꿨어요', function () { A.S.settings.kmPerL = v; });
    },
    'maint-open': function (el) { openMaint(el.getAttribute('data-k')); },
    'plat-new': function () {
      if (A.S.platforms.filter(function (p) { return !p.gone; }).length >= 8) { U.toast('일하는 곳은 8곳까지예요'); return; }
      openPlat(null);
    },
    'plat-open': function (el) { openPlat(el.getAttribute('data-id')); },
    'plat-del': function (el) { delPlat(el.getAttribute('data-id')); },
    'set-vehicle': function (el) { setVehicle(el.getAttribute('data-id')); },
    'set-fs': function (el) { var v = +el.getAttribute('data-v'); withUndo('글자 크기를 바꿨어요', function () { A.S.settings.fs = v; }); applySettings(); },
    'toggle': function (el) {
      var k = el.getAttribute('data-k');
      if (['light', 'reduce', 'vib', 'sound'].indexOf(k) < 0) return;
      A.S.settings[k] = !!el.checked; save(); applySettings();
      U.toast(el.checked ? '켰어요' : '껐어요');
    },
    'open-backup': function () {
      $('export-text').value = Store.exportText(A.S);
      $('restore-text').value = '';
      U.clearErrs($('form-backup'));
      U.openLayer('sheet-backup');
    },
    'copy-export': function () { copyText(Store.exportText(A.S), '내보낸 글을 복사했어요'); },
    'copy-csv': function () { copyText(callsCsv(), '콜 목록을 표 글로 복사했어요'); },
    'sample-add': addSample,
    'sample-remove': removeSample,
    'print': function () { try { window.print(); } catch (e) { U.toast('인쇄를 열지 못했어요'); } },
    'clear-all': function () {
      askConfirm('운행·지출·설정을 모두 지울까요? 되돌리기는 잠깐만 할 수 있어요.', '모두 지우기', function () {
        withUndo('모두 지웠어요', function () { A.S = Store.blank(); A.S.settings.welcomed = true; });
        applySettings(); go('home');
      });
    },
    'self-test': function () { U.renderTests(); },
    'tip-next': function () {
      var n = D.TIPS.length;
      A.ui.tipI = ((A.ui.tipI != null ? A.ui.tipI : 0) + 1 + Math.floor(Math.random() * (n - 1))) % n;
      var el = $('home-tip'); if (el) { el.textContent = D.TIPS[A.ui.tipI]; U.flash(el); }
    },
    'welcome-veh': function (el) { A.ui.welcomeVeh = el.getAttribute('data-id'); U.renderWelcome(); },
    'welcome-sample': function () { finishWelcome(true); },
    'confirm-yes': function () { var f = A.ui.confirm; A.ui.confirm = null; U.closeLayer('ov-confirm'); if (f) f(); },
    'confirm-no': function () { A.ui.confirm = null; U.closeLayer('ov-confirm'); },
    'undo': doUndo
  };
  function closeAllSheets() { A.ui.layers.slice().forEach(function (id) { if (id !== 'ov-welcome') U.closeLayer(id); }); }
  function finishWelcome(sample) {
    var g = val('welcome-goal'), fx = val('welcome-fixed');
    // 일하는 곳 3칸: 첫 칸은 꼭, 2·3칸은 비우면 안 쓰는 곳(gone)
    var names = ['welcome-p1', 'welcome-p2', 'welcome-p3'].map(val);
    var ok = true, seen = {};
    names.forEach(function (n, i) {
      var id = 'welcome-p' + (i + 1);
      var err = (n || i === 0) ? L.checkName(n, 16) : '';
      if (!err && n && seen[n]) err = '같은 이름이 이미 있어요';
      if (n) seen[n] = 1;
      ok = U.fieldErr(id, err) && ok;
    });
    ok = U.fieldErr('welcome-fixed', fx === '' ? '' : L.checkRange(fx, 0, 5000000, '금액')) && ok;
    ok = U.fieldErr('welcome-goal', L.checkRange(g, 10000, 1000000, '목표')) && ok;
    if (!ok) return;
    var v = D.VEHICLES.filter(function (x) { return x.id === (A.ui.welcomeVeh || A.S.settings.vehicle); })[0] || D.VEHICLES[0];
    var st = A.S.settings;
    st.goal = Math.round(+g); st.vehicle = v.id; st.costMode = v.mode;
    if (v.mode === 'fuel') st.kmPerL = v.kmPerL; else st.perKm = v.perKm;
    names.forEach(function (n, i) {
      var p = A.S.platforms[i]; if (!p) return;
      if (n) { p.name = n; p.gone = false; } else p.gone = true;
    });
    if (A.S.platforms[0] && A.S.platforms[0].gone) A.S.platforms[0].gone = false;
    if (!findIn(A.S.platforms, A.S.lastPid) || findIn(A.S.platforms, A.S.lastPid).gone) A.S.lastPid = A.S.platforms[0].id;
    if (+fx > 0) {
      var wf = A.S.fixed.filter(function (f) { return f.welcome; })[0];
      if (wf) wf.monthly = Math.round(+fx);
      else A.S.fixed.push({ id: L.uid('f'), name: '보험·리스 등 합계', monthly: Math.round(+fx), welcome: true });
    }
    st.welcomed = true;
    save();
    U.closeLayer('ov-welcome');
    if (sample) addSample();
    go('home');
  }

  function onClick(e) {
    unlockAudio();
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el || el.disabled) return;
    var f = ACTS[el.getAttribute('data-act')];
    if (!f) return;
    if (el.tagName === 'BUTTON' && el.type !== 'submit') e.preventDefault();
    try { f(el, e); } catch (err) { U.toast('잠깐 문제가 생겼어요. 다시 해 주세요'); }
  }
  var FORMS = {
    'form-start': function () {
      var o = val('start-odo');
      if (o && !U.fieldErr('start-odo', L.checkRange(o, 0, 999999, '계기판 km'))) return;
      startRide(o ? Math.round(+o) : 0);
    },
    'form-call': submitCall,
    'form-end': submitEnd,
    'form-shift': submitShift,
    'form-exp': submitExpense,
    'form-fixed': submitFixed,
    'form-plat': submitPlat,
    'form-maint': submitMaint,
    'form-welcome': function () { finishWelcome(false); },
    'form-backup': submitBackup,
    'form-settings': submitSettings,
    'form-odo': function () {
      var o = val('odo-now');
      if (!U.fieldErr('odo-now', L.checkRange(o, 0, 999999, '계기판 km'))) return;
      withUndo('계기판 km를 저장했어요', function () { A.S.odo = Math.round(+o); });
    }
  };
  function onSubmit(e) {
    var f = FORMS[e.target.id];
    if (!f) return;
    e.preventDefault();
    try { f(); } catch (err) { U.toast('잠깐 문제가 생겼어요. 다시 해 주세요'); }
  }
  function onInput(e) {
    var t = e.target;
    if (t.classList && t.classList.contains('bad')) { t.classList.remove('bad'); var er = $(t.id + '-err'); if (er) er.textContent = ''; }
    if (t.id === 'call-amt' && A.ui.call) { A.ui.call.amt = String(t.value); }
    if (t.id === 'maint-exp') $('maint-cost-wrap').hidden = !t.checked;
    if (t.id === 'welcome-goal') { var gv = $('welcome-goal-view'); if (gv) gv.textContent = U.goalViewText(t.value); }
  }
  function onKey(e) {
    if (e.key === 'Escape') {
      var top = U.topLayer();
      if (top === 'ov-confirm') ACTS['confirm-no']();
      else if (top && top !== 'ov-welcome') U.closeLayer(top);
      return;
    }
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'SELECT') return;
    if (A.ui.screen === 'ride' && !U.topLayer() && A.S.ride && (e.key === ' ' || e.key === 'n' || e.key === 'N')) {
      e.preventDefault(); openCall();
    }
  }

  function tick() {
    if (!A.S || !A.S.ride) return;
    if (A.ui.screen === 'ride') U.rideTick();
    else if (A.ui.screen === 'home' && !U.topLayer()) {
      var el = document.getElementById('home-riding');
      if (el) U.renderHome();
    }
  }

  function init() {
    var r = Store.load();
    A.S = r.data;
    if (!r.ok) { var w = $('store-warn'); w.textContent = r.why; w.hidden = false; w.setAttribute('data-load', '1'); }
    applySettings();
    document.addEventListener('click', onClick);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('input', onInput);
    document.addEventListener('change', onInput);
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(); });
    setInterval(tick, 1000);
    window.__rtSelfTest = L.selfTest;
    go(A.S.ride ? 'ride' : 'home');
    if (!A.S.settings.welcomed) { U.renderWelcome(); U.openLayer('ov-welcome'); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
