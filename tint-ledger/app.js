/* Tint Ledger — 상태와 동작 */
window.App = (function () {
  var D = window.TL_DATA, L = window.Logic, U = window.UI;
  var $ = function (id) { return document.getElementById(id); };
  var loaded = window.Store.load();
  var S = loaded.data;
  var V = {
    screen: 'today', prev: 'today', clientId: null, q: '', sort: 'recent', tagFilter: '',
    logPeriod: 'week', logOffset: 0, mix: null, finishSvc: null, finishScore: 0,
    editClient: null, clientTags: [], editProduct: null, productKind: 'color',
    shadeTarget: -1, shLevel: 0, shTone: '', serviceId: null, undo: null, confirmFn: null,
    wRatio: 1.5, wDev: 6, rang: {}
  };

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function save() {
    var ok = window.Store.save(S);
    var w = $('store-warn');
    if (!ok) { w.textContent = '저장하지 못했어요. 브라우저 저장 공간이 꽉 찼거나 막혀 있어요. 내보내기로 따로 남겨 주세요.'; w.classList.remove('hidden'); }
    return ok;
  }
  function svcById(id) { for (var i = 0; i < S.services.length; i++) if (S.services[i].id === id) return S.services[i]; return null; }
  function productById(id) { for (var i = 0; i < S.products.length; i++) if (S.products[i].id === id) return S.products[i]; return null; }
  function timerLeft(t) {
    var now = t.pausedAt || Date.now();
    return t.dur - (now - t.start - (t.pausedTotal || 0));
  }
  function applyLook() {
    var b = document.body, st = S.settings;
    b.classList.toggle('big', !!st.big);
    b.classList.toggle('dark', !!st.dark);
    b.classList.toggle('reduce', !!st.reduce || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
  }

  // ---- 화면 이동 ----
  var RENDER = {
    today: function () { U.renderToday(); }, clients: function () { U.renderClients(); }, client: function () { U.renderClient(); },
    mix: function () { U.renderMix(); }, timers: function () { U.renderTimers(); }, log: function () { U.renderLog(); },
    shelf: function () { U.renderShelf(); }, more: function () { U.renderMore(); }, help: function () { U.renderHelp(); }
  };
  function go(name) {
    if (!RENDER[name]) return;
    if (name !== V.screen) V.prev = V.screen;
    V.screen = name;
    RENDER[name]();
    U.show(name);
    U.tickTimers();
  }
  function refresh() { if (RENDER[V.screen]) RENDER[V.screen](); U.tickTimers(); }

  // ---- 확인 창 ----
  function askConfirm(text, yes, fn) {
    $('confirm-text').textContent = text;
    $('confirm-yes').textContent = yes || '지우기';
    V.confirmFn = fn;
    U.openOverlay('ov-confirm');
    try { $('confirm-yes').focus(); } catch (e) { /* 무시 */ }
  }
  function closeConfirm() { U.closeOverlay('ov-confirm'); V.confirmFn = null; }
  function setUndo(label, restore) { V.undo = restore; U.toast(label, true); }
  // 고치기 되돌리기: 고치기 전 사본을 남겨 두고, 되돌릴 때 같은 id 자리에 다시 넣는다
  function copyOf(o) { return JSON.parse(JSON.stringify(o)); }
  function putBack(list, old) {
    for (var i = 0; i < list.length; i++) if (list[i].id === old.id) { list[i] = old; return true; }
    return false;
  }

  // ---- 손님 ----
  function openClientSheet(c) {
    V.editClient = c ? c.id : null;
    V.clientTags = c ? (c.tags || []).slice() : [];
    $('client-title').textContent = c ? '손님 고치기' : '손님 더하기';
    $('c-name').value = c ? c.name : '';
    $('c-phone').value = c ? (c.phone || '') : '';
    $('c-note').value = c ? (c.note || '') : '';
    $('c-patch').value = c && c.patch ? localInput(c.patch) : '';
    $('c-del').classList.toggle('hidden', !c);
    ['c-name', 'c-phone', 'c-note', 'c-patch'].forEach(function (id) { U.fieldErr(id, ''); });
    renderClientTags();
    U.openSheet('sheet-client');
  }
  function localInput(ms) {
    var d = new Date(ms);
    return L.toKey(d) + 'T' + L.pad(d.getHours()) + ':' + L.pad(d.getMinutes());
  }
  function renderClientTags() {
    $('c-tags').innerHTML = D.HAIR_TAGS.map(function (t) {
      var on = V.clientTags.indexOf(t) >= 0;
      return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-act="client-tag" data-tag="' + U.esc(t) + '" aria-pressed="' + on + '">' + U.esc(t) + '</button>';
    }).join('');
  }
  function submitClient() {
    var name = $('c-name').value.trim(), phone = $('c-phone').value.trim(), note = $('c-note').value.trim(), patch = $('c-patch').value;
    var bad = false, e;
    e = L.checkName(name, 20); U.fieldErr('c-name', e); if (e) bad = true;
    e = L.checkPhone(phone); U.fieldErr('c-phone', e); if (e) bad = true;
    e = note.length > 100 ? '메모는 100자 안쪽으로 적어 주세요.' : ''; U.fieldErr('c-note', e); if (e) bad = true;
    var pms = null;
    if (patch) {
      pms = new Date(patch).getTime();
      e = !isFinite(pms) ? '날짜·시각을 다시 골라 주세요.' : pms > Date.now() + 60000 ? '앞날 시각은 넣을 수 없어요.' : '';
      U.fieldErr('c-patch', e); if (e) bad = true;
    }
    if (!bad) {
      var dup = S.clients.filter(function (c) { return c.name === name && c.id !== V.editClient; })[0];
      if (dup) { U.fieldErr('c-name', '같은 이름이 있어요. 별명이나 특징을 붙여 구분해 주세요.'); bad = true; }
    }
    if (bad) return;
    var c, before = null;
    if (V.editClient) {
      c = U.clientOf(V.editClient);
      before = copyOf(c);
      c.name = name; c.phone = phone; c.note = note; c.tags = V.clientTags.slice(); c.patch = pms;
    } else {
      c = { id: uid(), name: name, phone: phone, note: note, tags: V.clientTags.slice(), patch: pms, created: Date.now() };
      S.clients.push(c);
    }
    save();
    U.closeSheets();
    var done = function () {
      if (before) setUndo('손님 카드를 고쳤어요', function () { putBack(S.clients, before); });
      else U.toast('손님을 더했어요');
    };
    if (V.screen === 'mix' && V.mix) { V.mix.clientId = c.id; U.renderMix(); done(); return; }
    V.clientId = c.id;
    go('client');
    done();
  }
  function deleteClient() {
    var c = U.clientOf(V.editClient);
    if (!c) return;
    var n = S.services.filter(function (x) { return x.clientId === c.id; }).length;
    askConfirm(c.name + ' 손님과 시술 기록 ' + n + '개를 지울까요?', '지우기', function () {
      var keepC = S.clients.slice(), keepS = S.services.slice(), keepT = S.timers.slice();
      S.clients = S.clients.filter(function (x) { return x.id !== c.id; });
      S.services = S.services.filter(function (x) { return x.clientId !== c.id; });
      S.timers = S.timers.filter(function (x) { return x.clientId !== c.id; });
      save(); U.closeSheets(); go('clients');
      setUndo('손님을 지웠어요', function () { S.clients = keepC; S.services = keepS; S.timers = keepT; });
    });
  }

  // ---- 배합 ----
  function newMix(clientId) {
    var st = S.settings;
    var k = D.KINDS[0];
    V.mix = {
      clientId: clientId || V.clientId || (S.clients[0] && S.clients[0].id) || '',
      kind: k.id, minutes: k.min, preset: 60, densityK: 1, total: 60,
      ratio: st.ratio, dev: st.dev, lines: [], devProductId: '', fromSvc: null, checks: {}
    };
    if (V.mix.clientId && !U.clientOf(V.mix.clientId)) V.mix.clientId = S.clients[0] ? S.clients[0].id : '';
    go('mix');
  }
  function mixAgain(svcId) {
    var x = svcById(svcId);
    if (!x) return;
    var k = U.kindOf(x.kind);
    V.mix = {
      clientId: x.clientId, kind: x.kind, minutes: x.minutes || k.min, preset: 0, densityK: 1, total: x.total,
      ratio: x.ratio, dev: x.dev, devProductId: x.devProductId || '', fromSvc: x.id, checks: {},
      lines: x.lines.map(function (l) { return { shade: l.shade, part: l.part, productId: l.productId || '' }; })
    };
    U.closeSheets(true);
    go('mix');
    U.toast('지난 배합을 불러왔어요. 오늘 양만 고르세요');
  }
  function setTotal(g) {
    var m = V.mix; m.total = g; m.checks = {};
    var el = $('mix-total'); if (el) { el.value = g; U.fieldErr('mix-total', ''); U.flash(el); }
  }
  function submitMix() {
    var m = V.mix; if (!m) return;
    var bad = false, e;
    var cEl = $('mix-client');
    if (cEl) m.clientId = cEl.value;
    e = !m.clientId || !U.clientOf(m.clientId) ? '손님을 골라 주세요. 없으면 새 손님을 더해요.' : ''; U.fieldErr('mix-client', e); if (e) bad = true;
    e = L.checkNum($('mix-total').value, 5, 1000, '전체 g'); U.fieldErr('mix-total', e); if (e) bad = true;
    e = L.checkNum($('mix-min').value, 1, 180, '방치 시간'); U.fieldErr('mix-min', e); if (e) bad = true;
    e = !m.lines.length ? '색 줄을 하나 이상 넣어 주세요.' : ''; U.fieldErr('mix-lines', e); if (e) bad = true;
    if (bad) { var first = document.querySelector('#form-mix .bad'); if (first) try { first.scrollIntoView({ block: 'center' }); } catch (x) { /* 무시 */ } return; }
    m.total = Number($('mix-total').value); m.minutes = Math.round(Number($('mix-min').value));
    var r = L.mix(m.total, m.ratio, m.lines);
    var won = L.cost(r, m.lines, m.devProductId, S.products, S.settings);
    var k = U.kindOf(m.kind);
    var svc = {
      id: uid(), clientId: m.clientId, date: L.toKey(), at: Date.now(), kind: m.kind, kindName: k.name, minutes: m.minutes,
      total: r.total, ratio: m.ratio, dev: m.dev, colorG: r.colorG, devG: r.devG, devProductId: m.devProductId || '',
      lines: m.lines.map(function (l, i) { return { shade: l.shade, part: l.part, productId: l.productId || '', g: r.lines[i].g }; }),
      cost: won, left: null, score: 0, note: '', rootCm: null, nextDate: null, done: false, from: m.fromSvc || null
    };
    S.services.push(svc);
    // 선반 남은 양 줄이기
    svc.lines.forEach(function (l) { var p = productById(l.productId); if (p && p.stockG != null) p.stockG = Math.max(0, L.round1(p.stockG - l.g)); });
    var dp = productById(svc.devProductId); if (dp && dp.stockG != null) dp.stockG = Math.max(0, L.round1(dp.stockG - svc.devG));
    var c = U.clientOf(m.clientId);
    S.timers.push({ id: uid(), label: (c ? c.name : '') + ' · ' + k.name, clientId: m.clientId, serviceId: svc.id, start: Date.now(), dur: m.minutes * 60000, pausedAt: null, pausedTotal: 0 });
    save();
    V.mix = null;
    U.toast('저장했어요. 방치 타이머 시작');
    go('timers');
  }
  function applyTemplate(i) {
    var t = D.TEMPLATES[i], m = V.mix;
    if (!t || !m) return;
    var k = U.kindOf(t.kind);
    m.kind = t.kind; m.minutes = k.min; m.ratio = t.ratio; m.dev = t.dev; m.checks = {};
    m.lines = t.lines.map(function (l) { return { shade: l[0], part: l[1], productId: '' }; });
    U.closeSheets();
    U.renderMix();
    U.toast('예시 배합을 넣었어요');
  }
  function openShade(i) {
    V.shadeTarget = i;
    var cur = i >= 0 && V.mix && V.mix.lines[i] ? V.mix.lines[i].shade : '';
    $('sh-text').value = cur;
    var info = L.shadeInfo(cur);
    V.shLevel = info.known ? info.level : 0;
    V.shTone = info.known ? info.tones[0] : '';
    U.fieldErr('sh-text', '');
    U.renderShadeSheet();
    U.openSheet('sheet-shade');
  }
  function submitShade() {
    var t = $('sh-text').value.trim();
    var e = L.checkName(t, 12);
    U.fieldErr('sh-text', e);
    if (e || !V.mix) return;
    if (V.shadeTarget >= 0 && V.mix.lines[V.shadeTarget]) V.mix.lines[V.shadeTarget].shade = t;
    else {
      if (V.mix.lines.length >= 6) { U.fieldErr('sh-text', '색 줄은 6개까지예요.'); return; }
      V.mix.lines.push({ shade: t, part: 1, productId: '' });
    }
    V.mix.checks = {};
    U.closeSheets();
    U.renderMix();
  }

  // ---- 타이머 ----
  var audio = null;
  function ensureAudio() {
    if (audio || !S.settings.sound) return;
    try { var AC = window.AudioContext || window.webkitAudioContext; if (AC) audio = new AC(); } catch (e) { audio = null; }
  }
  function beep() {
    if (!S.settings.sound || !audio) return;
    try {
      var t0 = audio.currentTime;
      [0, 0.28, 0.56].forEach(function (d, i) {
        var o = audio.createOscillator(), g = audio.createGain();
        o.type = 'sine'; o.frequency.value = i === 2 ? 1046 : 880;
        g.gain.setValueAtTime(0.0001, t0 + d);
        g.gain.exponentialRampToValueAtTime(0.25, t0 + d + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.22);
        o.connect(g); g.connect(audio.destination);
        o.start(t0 + d); o.stop(t0 + d + 0.25);
      });
    } catch (e) { /* 소리 못 냄 */ }
  }
  function tick() {
    var changed = false;
    S.timers.forEach(function (t) {
      if (t.pausedAt) return;
      if (timerLeft(t) <= 0 && !V.rang[t.id]) {
        V.rang[t.id] = true; changed = true;
        beep();
        if (S.settings.vibrate && navigator.vibrate) { try { navigator.vibrate([300, 150, 300]); } catch (e) { /* 무시 */ } }
        U.toast(t.label + ' 방치 시간이 끝났어요');
      }
    });
    if (changed && (V.screen === 'timers' || V.screen === 'today')) refresh();
    else U.tickTimers();
  }
  function timerById(id) { for (var i = 0; i < S.timers.length; i++) if (S.timers[i].id === id) return S.timers[i]; return null; }

  // ---- 마무리 ----
  function openFinish(svcId) {
    var x = svcById(svcId);
    if (!x) return;
    V.finishSvc = x.id;
    V.finishScore = x.score || 0;
    $('f-left').value = x.left == null ? '' : x.left;
    $('f-note').value = x.note || '';
    $('f-root').value = x.rootCm || S.settings.rootCm;
    ['f-left', 'f-note', 'f-root'].forEach(function (id) { U.fieldErr(id, ''); });
    U.renderFinishParts();
    U.openSheet('sheet-finish');
  }
  function submitFinish() {
    var x = svcById(V.finishSvc);
    if (!x) return;
    var bad = false, e;
    var left = $('f-left').value.trim(), note = $('f-note').value.trim(), root = $('f-root').value.trim();
    e = left === '' ? '' : L.checkNum(left, 0, x.total, '남은 약'); U.fieldErr('f-left', e); if (e) bad = true;
    e = note.length > 120 ? '메모는 120자 안쪽으로 적어 주세요.' : ''; U.fieldErr('f-note', e); if (e) bad = true;
    e = L.checkNum(root, 0.3, 10, '뿌리 길이'); U.fieldErr('f-root', e); if (e) bad = true;
    if (bad) return;
    var before = x.done ? copyOf(x) : null;
    x.left = left === '' ? null : L.round1(Number(left));
    x.note = note; x.score = V.finishScore || 0; x.rootCm = Number(root);
    var nv = L.nextVisit(x.date, S.settings.growth, x.rootCm);
    x.nextDate = nv ? nv.key : null;
    x.done = true;
    S.timers = S.timers.filter(function (t) { return t.serviceId !== x.id; });
    save();
    U.closeSheets();
    V.clientId = x.clientId;
    go('client');
    var msg = '마무리 저장 · 다음 방문 ' + (x.nextDate ? L.prettyDate(x.nextDate) : '-');
    // 이미 마무리한 시술을 고친 것이면 고치기 전으로 되돌릴 수 있다
    if (before) setUndo('마무리를 고쳤어요 · 다음 방문 ' + (x.nextDate ? L.prettyDate(x.nextDate) : '-'), function () { putBack(S.services, before); });
    else U.toast(msg);
  }

  // ---- 선반 ----
  function openProduct(p, kind) {
    V.editProduct = p ? p.id : null;
    V.productKind = p ? p.kind : (kind || 'color');
    $('p-name').value = p ? p.name : '';
    $('p-pack').value = p ? p.packG : (V.productKind === 'dev' ? 1000 : 80);
    $('p-price').value = p ? p.price : '';
    $('p-stock').value = p && p.stockG != null ? p.stockG : '';
    $('p-del').classList.toggle('hidden', !p);
    ['p-name', 'p-pack', 'p-price', 'p-stock'].forEach(function (id) { U.fieldErr(id, ''); });
    renderProductKind();
    U.openSheet('sheet-product');
  }
  function renderProductKind() {
    $('p-kind').innerHTML = [['color', '염모제·파우더'], ['dev', '산화제']].map(function (k) {
      return '<button type="button" class="chip' + (V.productKind === k[0] ? ' on' : '') + '" data-act="prod-kind" data-k="' + k[0] + '">' + k[1] + '</button>';
    }).join('');
  }
  function submitProduct() {
    var name = $('p-name').value.trim(), pack = $('p-pack').value.trim(), price = $('p-price').value.trim(), stock = $('p-stock').value.trim();
    var bad = false, e;
    e = L.checkName(name, 20); U.fieldErr('p-name', e); if (e) bad = true;
    e = L.checkNum(pack, 1, 5000, '한 통 g'); U.fieldErr('p-pack', e); if (e) bad = true;
    e = L.checkNum(price, 0, 1000000, '한 통 값'); U.fieldErr('p-price', e); if (e) bad = true;
    e = stock === '' ? '' : L.checkNum(stock, 0, 100000, '남은 양'); U.fieldErr('p-stock', e); if (e) bad = true;
    if (bad) return;
    var p = V.editProduct ? productById(V.editProduct) : null;
    var before = p ? copyOf(p) : null;
    if (!p) { p = { id: uid() }; S.products.push(p); }
    p.kind = V.productKind; p.name = name; p.packG = Number(pack); p.price = Math.round(Number(price)); p.stockG = stock === '' ? null : Number(stock);
    save(); U.closeSheets();
    refresh();
    if (before) setUndo('선반 제품을 고쳤어요', function () { putBack(S.products, before); });
    else U.toast('선반에 저장했어요');
  }

  // ---- 예시 데이터 ----
  function addSample() {
    if (S.clients.some(function (c) { return c.id.indexOf('ex-') === 0; })) { U.toast('예시가 이미 들어 있어요'); return; }
    var today = L.toKey();
    var now = Date.now();
    S.products.push(
      { id: 'ex-p1', kind: 'color', name: '예시 염모제 7.0', packG: 80, price: 9600, stockG: 320 },
      { id: 'ex-p2', kind: 'color', name: '예시 염모제 7.3', packG: 80, price: 9600, stockG: 60 },
      { id: 'ex-p3', kind: 'dev', name: '예시 산화제 6%', packG: 1000, price: 8000, stockG: 2400 }
    );
    var cs = [
      { id: 'ex-c1', name: '예시 · 수요일 단발', phone: '', note: '정수리부터 바름', tags: ['새치 많음', '두피 예민'], patch: now - 3 * 86400000, created: now },
      { id: 'ex-c2', name: '예시 · 긴머리 애쉬', phone: '', note: '노란 기 싫어함', tags: ['탈색 이력', '노란 기 잘 올라옴'], patch: now - 20 * 3600000, created: now },
      { id: 'ex-c3', name: '예시 · 톤다운 대학생', phone: '', note: '', tags: ['자연 흑발'], patch: null, created: now }
    ];
    S.clients = S.clients.concat(cs);
    function svc(id, cid, daysAgo, kind, total, ratio, dev, lines, left, score, note, root) {
      var date = L.addDays(today, -daysAgo);
      var r = L.mix(total, ratio, lines);
      var cost = L.cost(r, lines, 'ex-p3', S.products, S.settings);
      var nv = L.nextVisit(date, S.settings.growth, root);
      return { id: id, clientId: cid, date: date, at: L.fromKey(date).getTime() + 3600000, kind: kind, kindName: U.kindOf(kind).name, minutes: U.kindOf(kind).min,
        total: r.total, ratio: ratio, dev: dev, colorG: r.colorG, devG: r.devG, devProductId: 'ex-p3',
        lines: lines.map(function (l, i) { return { shade: l.shade, part: l.part, productId: l.productId || '', g: r.lines[i].g }; }),
        cost: cost, left: left, score: score, note: note, rootCm: root, nextDate: nv ? nv.key : null, done: true, from: null };
    }
    S.services.push(
      svc('ex-s1', 'ex-c1', 75, 'gray', 80, 1, 6, [{ shade: '7.0', part: 2, productId: 'ex-p1' }, { shade: '7.3', part: 1, productId: 'ex-p2' }], 12, 3, '새치 덜 덮임', 1.5),
      svc('ex-s2', 'ex-c1', 36, 'gray', 70, 1, 6, [{ shade: '7.0', part: 3, productId: 'ex-p1' }, { shade: '7.3', part: 1, productId: 'ex-p2' }], 5, 5, '새치 잘 덮임, 손님 만족', 1.5),
      svc('ex-s3', 'ex-c2', 40, 'toner', 90, 2, 3, [{ shade: '9.1', part: 2 }, { shade: '9.2', part: 1 }], 20, 4, '노란 기 남음', 2),
      svc('ex-s4', 'ex-c2', 3, 'retouch', 60, 2, 6, [{ shade: '탈색 파우더', part: 1 }], 8, 4, '뿌리·끝 차이 남음', 2),
      svc('ex-s5', 'ex-c3', 1, 'down', 100, 1.5, 3, [{ shade: '4.0', part: 1 }], 15, 5, '원하는 색 그대로', 3)
    );
    S.settings.welcomed = true;
    save();
    U.closeOverlay('ov-welcome');
    U.toast('예시 손님 3명을 넣었어요');
    refresh();
  }
  function removeSample() {
    var has = S.clients.some(function (c) { return c.id.indexOf('ex-') === 0; }) || S.products.some(function (p) { return p.id.indexOf('ex-') === 0; });
    if (!has) { U.toast('넣은 예시가 없어요'); return; }
    askConfirm('예시 손님·시술·선반을 뺄까요? 직접 넣은 기록은 그대로예요.', '빼기', function () {
      var ex = function (o) { return String(o.id).indexOf('ex-') !== 0; };
      S.clients = S.clients.filter(ex);
      S.services = S.services.filter(function (x) { return ex(x) && String(x.clientId).indexOf('ex-') !== 0; });
      S.products = S.products.filter(ex);
      S.timers = S.timers.filter(function (t) { return String(t.clientId).indexOf('ex-') !== 0; });
      save(); U.toast('예시를 뺐어요'); refresh();
    });
  }

  // ---- 동작 표 ----
  var ACTS = {
    go: function (el) { U.closeSheets(true); go(el.getAttribute('data-to')); },
    back: function () { go(V.prev && V.prev !== 'help' ? V.prev : 'today'); },
    close: function () { U.closeSheets(); },
    'client-new': function () { openClientSheet(null); },
    'mix-client-new': function () { openClientSheet(null); },
    'client-open': function (el) { V.clientId = el.getAttribute('data-id'); go('client'); },
    'client-edit': function () { var c = U.clientOf(V.clientId); if (c) openClientSheet(c); },
    'client-del': function () { deleteClient(); },
    'client-tag': function (el) {
      var t = el.getAttribute('data-tag'), i = V.clientTags.indexOf(t);
      if (i >= 0) V.clientTags.splice(i, 1); else V.clientTags.push(t);
      renderClientTags();
    },
    sort: function (el) { V.sort = el.getAttribute('data-sort'); U.renderClients(); },
    tagf: function (el) { V.tagFilter = el.getAttribute('data-tag'); U.renderClients(); },
    'search-clear': function () { V.q = ''; V.tagFilter = ''; U.renderClients(); },
    'mix-new': function (el) { U.closeSheets(true); newMix(el.getAttribute('data-client')); },
    'mix-again': function (el) { mixAgain(el.getAttribute('data-svc')); },
    'mix-cancel': function () {
      askConfirm('만들던 배합을 그만둘까요? 저장하지 않은 배합은 사라져요.', '그만두기', function () {
        var cid = V.mix && V.mix.clientId; V.mix = null;
        if (cid && U.clientOf(cid)) { V.clientId = cid; go('client'); } else go('today');
      });
    },
    'mix-kind': function (el) { var k = U.kindOf(el.getAttribute('data-kind')); V.mix.kind = k.id; V.mix.minutes = k.min; U.renderMix(); },
    'mix-amount': function (el) { var g = Number(el.getAttribute('data-g')); V.mix.preset = g; U.renderMix(); setTotal(L.recommend(g, V.mix.densityK)); U.renderMixOut(); },
    'mix-density': function (el) {
      V.mix.densityK = Number(el.getAttribute('data-k'));
      U.renderMix();
      if (V.mix.preset) { setTotal(L.recommend(V.mix.preset, V.mix.densityK)); U.renderMixOut(); }
    },
    'mix-ratio': function (el) { V.mix.ratio = Number(el.getAttribute('data-r')); V.mix.checks = {}; U.renderMix(); },
    'mix-dev': function (el) { V.mix.dev = Number(el.getAttribute('data-d')); U.renderMix(); },
    'mix-part': function (el) {
      var i = Number(el.getAttribute('data-i')), d = Number(el.getAttribute('data-d')), l = V.mix.lines[i];
      if (!l) return;
      l.part = Math.max(0.5, Math.min(20, L.round1(l.part + d)));
      V.mix.checks = {};
      U.renderMix();
    },
    'line-del': function (el) { V.mix.lines.splice(Number(el.getAttribute('data-i')), 1); V.mix.checks = {}; U.renderMix(); },
    'line-add': function () { openShade(-1); },
    'line-shade': function (el) { openShade(Number(el.getAttribute('data-i'))); },
    'sh-level': function (el) { V.shLevel = Number(el.getAttribute('data-n')); $('sh-text').value = V.shLevel + '.' + (V.shTone || '0'); U.renderShadeSheet(); },
    'sh-tone': function (el) { V.shTone = el.getAttribute('data-t'); $('sh-text').value = (V.shLevel || 7) + '.' + V.shTone; if (!V.shLevel) V.shLevel = 7; U.renderShadeSheet(); },
    'sh-pick': function (el) { $('sh-text').value = el.getAttribute('data-s'); submitShade(); },
    'template-open': function () { U.renderTemplates(); U.openSheet('sheet-template'); },
    'template-pick': function (el) { applyTemplate(Number(el.getAttribute('data-i'))); },
    pour: function (el) {
      var i = el.getAttribute('data-i');
      V.mix.checks[i] = !V.mix.checks[i];
      U.renderMixOut();
    },
    'timer-pause': function (el) {
      var t = timerById(el.getAttribute('data-id')); if (!t) return;
      if (t.pausedAt) { t.pausedTotal = (t.pausedTotal || 0) + (Date.now() - t.pausedAt); t.pausedAt = null; }
      else t.pausedAt = Date.now();
      save(); U.renderTimers();
    },
    'timer-plus': function (el) {
      var t = timerById(el.getAttribute('data-id')); if (!t) return;
      if (timerLeft(t) < 0) { t.dur += -timerLeft(t); }
      t.dur += 300000; V.rang[t.id] = false;
      save(); U.renderTimers(); U.toast('5분 더했어요');
    },
    'timer-done': function (el) { var t = timerById(el.getAttribute('data-id')); if (t && t.serviceId) openFinish(t.serviceId); },
    'timer-del': function (el) {
      var id = el.getAttribute('data-id');
      var keep = S.timers.slice();
      S.timers = S.timers.filter(function (t) { return t.id !== id; });
      save(); U.renderTimers(); U.tickTimers();
      setUndo('타이머를 지웠어요', function () { S.timers = keep; });
    },
    'timer-quick': function (el) {
      if (S.timers.length >= 8) { U.toast('타이머는 8개까지예요'); return; }
      var n = Number(el.getAttribute('data-min'));
      S.timers.push({ id: uid(), label: n + '분 타이머', clientId: '', serviceId: '', start: Date.now(), dur: n * 60000, pausedAt: null, pausedTotal: 0 });
      save(); U.renderTimers(); U.tickTimers();
    },
    'finish-open': function (el) { openFinish(el.getAttribute('data-svc')); },
    'finish-score': function (el) { var n = Number(el.getAttribute('data-n')); V.finishScore = V.finishScore === n ? 0 : n; U.renderFinishParts(); },
    'finish-chip': function (el) {
      var t = D.NOTE_CHIPS[Number(el.getAttribute('data-i'))], f = $('f-note');
      if (!t) return;
      if (f.value.indexOf(t) < 0) f.value = (f.value.trim() ? f.value.trim() + ', ' : '') + t;
      U.flash(f);
    },
    'svc-open': function (el) { V.serviceId = el.getAttribute('data-svc'); U.renderService(); U.openSheet('sheet-service'); },
    'svc-del': function (el) {
      var x = svcById(el.getAttribute('data-svc')); if (!x) return;
      askConfirm(L.prettyDate(x.date) + ' 시술 기록을 지울까요?', '지우기', function () {
        var keepS = S.services.slice(), keepT = S.timers.slice();
        S.services = S.services.filter(function (s) { return s.id !== x.id; });
        S.timers = S.timers.filter(function (t) { return t.serviceId !== x.id; });
        save(); U.closeSheets(); refresh();
        setUndo('시술 기록을 지웠어요', function () { S.services = keepS; S.timers = keepT; });
      });
    },
    'log-period': function (el) { V.logPeriod = el.getAttribute('data-p'); V.logOffset = 0; U.renderLog(); },
    'log-move': function (el) { V.logOffset = Math.min(0, V.logOffset + Number(el.getAttribute('data-d'))); U.renderLog(); },
    'product-new': function (el) { openProduct(null, el.getAttribute('data-k')); },
    'product-open': function (el) { openProduct(productById(el.getAttribute('data-id'))); },
    'prod-kind': function (el) { V.productKind = el.getAttribute('data-k'); renderProductKind(); },
    'product-del': function () {
      var p = productById(V.editProduct); if (!p) return;
      askConfirm(p.name + ' 을(를) 선반에서 지울까요? 지난 시술의 약값은 그대로예요.', '지우기', function () {
        var keep = S.products.slice();
        S.products = S.products.filter(function (x) { return x.id !== p.id; });
        save(); U.closeSheets(); refresh();
        setUndo('선반에서 지웠어요', function () { S.products = keep; });
      });
    },
    'open-backup': function () { $('export-text').value = window.Store.exportText(S); $('restore-text').value = ''; U.fieldErr('restore-text', ''); U.openSheet('sheet-backup'); },
    'copy-export': function () { copyText($('export-text').value, '내보내기 글을 복사했어요'); },
    'copy-csv': function () { copyText(window.Store.exportCsv(S), '시술 표를 복사했어요'); },
    'self-test': function () { U.renderTests(L.selfTest()); },
    // 인쇄: 지금 화면(손님 카드·배합 계량표·기록)을 종이 한 장으로 (style.css @media print)
    print: function () { U.closeSheets(true); U.hideToast(); try { window.print(); } catch (e) { /* 인쇄 못 하는 브라우저 */ } },
    'sample-add': function () { addSample(); },
    'sample-remove': function () { removeSample(); },
    'clear-all': function () {
      askConfirm('손님·시술·선반·설정을 모두 지울까요? 되돌릴 수 없어요. 먼저 내보내기를 해 두세요.', '모두 지우기', function () {
        window.Store.clear();
        var w = S.settings.welcomed;
        S = window.Store.blank(); S.settings.welcomed = w; window.App.S = S;
        V.mix = null; V.clientId = null; V.undo = null;
        save(); applyLook(); U.toast('모두 지웠어요'); go('today');
      });
    },
    'confirm-yes': function () { var fn = V.confirmFn; closeConfirm(); if (fn) fn(); },
    'confirm-no': function () { closeConfirm(); },
    undo: function () {
      if (!V.undo) return;
      var fn = V.undo; V.undo = null; fn(); save(); U.hideToast(); refresh();
      U.toast('되돌렸어요');
    },
    'welcome-sample': function () { addSample(); },
    'w-ratio': function (el) { V.wRatio = Number(el.getAttribute('data-r')); renderWelcome(); },
    'w-dev': function (el) { V.wDev = Number(el.getAttribute('data-d')); renderWelcome(); },
    'tip-next': function () {
      S.settings.tipIdx = ((S.settings.tipIdx || 0) + 1) % D.TIPS.length; save();
      var el = $('tip-text'); if (el) { el.textContent = D.TIPS[S.settings.tipIdx]; U.flash(el); }
    }
  };
  function copyText(text, msg) {
    var done = function () { U.toast(msg); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, msg); }); return; }
    } catch (e) { /* 아래로 */ }
    fallbackCopy(text, msg);
  }
  function fallbackCopy(text, msg) {
    var ta = $('export-text');
    var old = ta.value;
    ta.value = text; ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.value = old;
    U.toast(ok ? msg : '복사하지 못했어요. 글을 길게 눌러 직접 복사해 주세요');
  }

  // ---- 폼 ----
  var FORMS = {
    'form-client': submitClient,
    'form-mix': submitMix,
    'form-shade': submitShade,
    'form-finish': submitFinish,
    'form-product': submitProduct,
    'form-search': function () { var q = $('client-q'); if (q) q.blur(); },
    'form-backup': function () {
      var r = window.Store.parseImport($('restore-text').value);
      if (r.error) { U.fieldErr('restore-text', r.error); return; }
      U.fieldErr('restore-text', '');
      askConfirm('지금 기록을 붙여 넣은 글(손님 ' + r.data.clients.length + '명, 시술 ' + r.data.services.length + '개)로 바꿀까요?', '바꾸기', function () {
        var keep = S;
        S = r.data; S.settings.welcomed = true; window.App.S = S;
        save(); applyLook(); U.closeSheets(); go('today');
        setUndo('가져온 글로 바꿨어요', function () { S = keep; window.App.S = S; });
      });
    },
    'form-settings': function () {
      var f = [['set-ratio', 0, 4, '산화제 비율', 'ratio'], ['set-dev', 1, 12, '산화제 %', 'dev'], ['set-growth', 0.3, 3, '한 달 뿌리 자람', 'growth'],
        ['set-root', 0.3, 10, '뿌리 길이', 'rootCm'], ['set-cwon', 0, 2000, '염모제 g당 값', 'colorWon'], ['set-dwon', 0, 500, '산화제 g당 값', 'devWon']];
      var bad = false;
      f.forEach(function (x) { var e = L.checkNum($(x[0]).value.trim(), x[1], x[2], x[3]); U.fieldErr(x[0], e); if (e) bad = true; });
      if (bad) return;
      var before = copyOf(S.settings);
      f.forEach(function (x) { S.settings[x[4]] = Number($(x[0]).value); });
      save();
      setUndo('기본값을 저장했어요', function () { f.forEach(function (x) { S.settings[x[4]] = before[x[4]]; }); });
    },
    'form-welcome': function () {
      S.settings.ratio = V.wRatio; S.settings.dev = V.wDev; S.settings.welcomed = true;
      save(); U.closeOverlay('ov-welcome'); refresh();
      U.toast('준비됐어요. 첫 손님을 더해 보세요');
    }
  };
  function renderWelcome() {
    $('w-ratio').innerHTML = [1, 1.5, 2].map(function (r) { return '<button type="button" class="chip' + (V.wRatio === r ? ' on' : '') + '" data-act="w-ratio" data-r="' + r + '">' + L.ratioText(r) + '</button>'; }).join('');
    $('w-dev').innerHTML = [3, 6, 9, 12].map(function (d) { return '<button type="button" class="chip' + (V.wDev === d ? ' on' : '') + '" data-act="w-dev" data-d="' + d + '">' + d + '%</button>'; }).join('');
  }

  // ---- 이벤트 ----
  // 만들던 배합이 있어야 하는 동작 (배합을 그만둔 뒤 남은 버튼을 눌러도 예외가 나지 않게)
  var NEEDS_MIX = { 'mix-kind': 1, 'mix-amount': 1, 'mix-density': 1, 'mix-ratio': 1, 'mix-dev': 1, 'mix-part': 1, 'line-del': 1, 'line-add': 1, 'line-shade': 1, 'sh-pick': 1, 'template-open': 1, 'template-pick': 1, pour: 1 };
  function onClick(ev) {
    var el = ev.target.closest ? ev.target.closest('[data-act]') : null;
    if (!el || el.disabled) return;
    var fn = ACTS[el.getAttribute('data-act')];
    if (!fn) return;
    if (el.id === 'sheet-back' && ev.target !== el) return;
    ev.preventDefault();
    if (NEEDS_MIX[el.getAttribute('data-act')] && !V.mix) return;
    fn(el);
  }
  function onSubmit(ev) {
    var f = ev.target;
    var fn = FORMS[f.id];
    ev.preventDefault();
    if (fn) fn();
  }
  function onInput(ev) {
    var t = ev.target;
    if (t.id === 'client-q') { V.q = t.value; var box = $('client-list'); if (box) box.innerHTML = U.clientListHtml(); return; }
    if (t.id === 'mix-total' && V.mix) { V.mix.total = Number(t.value) || 0; V.mix.preset = 0; V.mix.checks = {}; U.fieldErr('mix-total', ''); U.renderMixOut(); return; }
    if (t.id === 'mix-min' && V.mix) { var n = Number(t.value); if (n > 0 && n <= 180) V.mix.minutes = Math.round(n); U.fieldErr('mix-min', ''); U.renderMixOut(); return; }
    if (t.id === 'sh-text') { U.renderShadeDesc(); return; }
    if (t.id === 'f-root' || t.id === 'f-left') { U.renderFinishNext(); return; }
    if (t.id && t.classList && t.classList.contains('bad')) U.fieldErr(t.id, '');
  }
  function onChange(ev) {
    var t = ev.target;
    if (t.id === 'mix-client' && V.mix) { V.mix.clientId = t.value; U.fieldErr('mix-client', ''); U.renderMixOut(); return; }
    if (t.id === 'mix-devprod' && V.mix) { V.mix.devProductId = t.value; U.renderMixOut(); return; }
    if (t.classList && t.classList.contains('line-prod') && V.mix) { var l = V.mix.lines[Number(t.getAttribute('data-i'))]; if (l) l.productId = t.value; U.renderMixOut(); return; }
    var key = t.getAttribute && t.getAttribute('data-set');
    if (key) {
      S.settings[key] = !!t.checked; save(); applyLook();
      if (key === 'sound' && t.checked) ensureAudio();
      U.toast('설정을 바꿨어요');
    }
  }
  function onKey(ev) {
    if (ev.key === 'Escape') {
      if (U.overlayOpen('ov-confirm')) { closeConfirm(); return; }
      if (U.anySheetOpen()) { U.closeSheets(); return; }
    }
  }

  function init() {
    applyLook();
    if (loaded.error) { var w = $('store-warn'); w.textContent = loaded.error; w.classList.remove('hidden'); }
    document.addEventListener('click', onClick);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('input', onInput);
    document.addEventListener('change', onChange);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', ensureAudio, { passive: true });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
    // 이미 끝난 타이머는 다시 울리지 않는다
    S.timers.forEach(function (t) { if (timerLeft(t) <= 0) V.rang[t.id] = true; });
    go('today');
    if (!S.settings.welcomed) { V.wRatio = S.settings.ratio; V.wDev = S.settings.dev; renderWelcome(); U.openOverlay('ov-welcome'); }
    setInterval(tick, 1000);
  }

  var api = { S: S, V: V, timerLeft: timerLeft, svcById: svcById, go: go };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else setTimeout(init, 0);
  return api;
})();
