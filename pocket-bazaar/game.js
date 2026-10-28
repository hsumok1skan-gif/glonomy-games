// Pocket Bazaar — 규칙 (화면과 시험 훅이 같은 함수를 쓴다)
var Store = (function () {
  var KEY = 'pocketBazaar.meta.v1';
  var RUN = 'pocketBazaar.run.v1';
  var meta = null;
  var ok = true;

  function fresh() {
    var s = {};
    DATA.SETTINGS.forEach(function (x) { s[x.id] = x.def; });
    return {
      stamps: 0, best: 0, bestDay: 0, runs: 0, wins: 0,
      stalls: ['alley'], stall: 'alley',
      ach: {}, log: {},
      seen: { goods: {}, cust: {}, charms: {}, events: {} },
      stats: { sales: 0, earned: 0, skipped: 0, spoiled: 0, days: 0, biggest: 0, charms: 0, bought: 0 },
      settings: s, tutorialDone: false,
      daily: null, dailyBest: 0, dailyRuns: 0
    };
  }
  function load() {
    meta = fresh();
    try {
      var raw = window.localStorage.getItem(KEY);
      if (raw) {
        var m = JSON.parse(raw);
        if (m && typeof m === 'object') {
          Object.keys(m).forEach(function (k) { meta[k] = m[k]; });
          var base = fresh();
          DATA.SETTINGS.forEach(function (x) { if (typeof meta.settings[x.id] !== 'boolean') meta.settings[x.id] = x.def; });
          ['goods', 'cust', 'charms', 'events'].forEach(function (k) { if (!meta.seen[k]) meta.seen[k] = {}; });
          Object.keys(base.stats).forEach(function (k) { if (typeof meta.stats[k] !== 'number') meta.stats[k] = 0; });
        }
      }
    } catch (e) { ok = false; }
    return meta;
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(meta)); ok = true; } catch (e) { ok = false; }
    return ok;
  }
  function saveRun(run) {
    try { window.localStorage.setItem(RUN, JSON.stringify(run)); } catch (e) { ok = false; }
  }
  function loadRun() {
    try {
      var raw = window.localStorage.getItem(RUN);
      if (!raw) return null;
      var r = JSON.parse(raw);
      return r && r.shelf ? r : null;
    } catch (e) { return null; }
  }
  function clearRun() {
    try { window.localStorage.removeItem(RUN); } catch (e) { ok = false; }
  }
  function wipe() {
    try { window.localStorage.removeItem(KEY); window.localStorage.removeItem(RUN); } catch (e) { ok = false; }
    meta = fresh();
    save();
  }
  return {
    load: load, save: save, saveRun: saveRun, loadRun: loadRun, clearRun: clearRun, wipe: wipe,
    get meta() { return meta || load(); }, get ok() { return ok; }
  };
})();

var Game = (function () {
  var W = DATA.SHELF_W, H = DATA.SHELF_H, N = W * H;
  var GOODS = {}, CUST = {}, CHARM = {}, EVENT = {};
  DATA.GOODS.forEach(function (g) { GOODS[g.id] = g; });
  DATA.CUSTOMERS.forEach(function (c) { CUST[c.id] = c; });
  DATA.CHARMS.forEach(function (c) { CHARM[c.id] = c; });
  DATA.EVENTS.forEach(function (e) { EVENT[e.id] = e; });

  var run = null;
  var listeners = [];
  var api = { quiet: false };

  function emit(type, data) {
    if (api.quiet) return;
    for (var i = 0; i < listeners.length; i++) listeners[i](type, data || {});
  }
  // 오늘의 도전은 날짜 씨앗(run.rs)으로, 다른 판은 Math.random 으로 굴린다
  function hashStr(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h | 0;
  }
  function seeded() {
    var t = (run.rs = (run.rs + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function R() { return run && run.daily ? seeded() : Math.random(); }
  function rnd(n) { return Math.floor(R() * n); }
  function todayKey() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function dailyInfo() {
    var m = Store.meta;
    var today = todayKey();
    var d = m.daily && m.daily.date === today ? m.daily : null;
    return { date: today, played: !!d, done: !!(d && d.done), score: d ? d.score : 0, won: !!(d && d.won), reached: d ? d.reached : 0, best: m.dailyBest || 0 };
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---------- 능력치 ----------
  function baseStats() {
    return { same: 0.25, pair: 0.5, flat: 0, cust: 0, fresh: 0, draw: 0, rentMul: 1, cat: {},
      lone: 0, edge: 2, center: 2, twin: 0, grow: 1, crowd: 1, interest: 0, cheap: 0, any: 0,
      repEvery: 0, refund: 0, keepHand: 0, offers: 0, highRep: 0, soft: 0, all: 0, spoil: 0, rentAdd: 0, growNow: 0 };
  }
  function addFx(s, fx) {
    if (!fx) return s;
    Object.keys(fx).forEach(function (k) {
      if (k === 'cat') {
        Object.keys(fx.cat).forEach(function (c) { s.cat[c] = (s.cat[c] || 0) + fx.cat[c]; });
      } else if (k === 'rentMul') {
        s.rentMul += fx.rentMul;
      } else if (k === 'repNow') {
        // 고를 때 한 번만 (pickCharm)
      } else if (typeof s[k] === 'number') {
        s[k] += fx[k];
      }
    });
    return s;
  }
  function buildStats() {
    var s = baseStats();
    var st = stallById(run.stall);
    addFx(s, st.fx);
    run.charms.forEach(function (id) { if (CHARM[id]) addFx(s, CHARM[id].fx); });
    if (run.event && EVENT[run.event]) addFx(s, EVENT[run.event].fx);
    run.S = s;
    return s;
  }
  function S() { return run.S || buildStats(); }
  function stallById(id) {
    for (var i = 0; i < DATA.STALLS.length; i++) if (DATA.STALLS[i].id === id) return DATA.STALLS[i];
    return DATA.STALLS[0];
  }

  // ---------- 판 시작 ----------
  function newRun(stallId, test, daily) {
    daily = !!daily && !test;
    if (daily && dailyInfo().played) return null;   // 오늘의 도전은 하루 한 번
    var date = daily ? todayKey() : '';
    var st = stallById(daily ? DATA.STALLS[0].id : stallId);   // 모두 같은 가판대로
    run = {
      daily: daily, dailyDate: date, rs: daily ? hashStr('bazaar:' + date) : 0,
      test: !!test, stall: st.id, day: 0, rep: DATA.REP_START, coins: DATA.COINS_START, earned: 0,
      draw: [], discard: [], hand: [], shelf: [], charms: [], uid: 1,
      phase: 'stock', queue: [], qi: 0, cur: null, event: 'clear', rent: 0, S: null,
      offers: [], charmOffer: [], summary: null, over: false, won: false, time: 0, score: 0,
      sold: 0, skipped: 0, spoiled: 0, daySkipped: 0, softCount: 0, wishCount: 0, bought: 0,
      biggest: 0, reason: '', log: []
    };
    for (var i = 0; i < N; i++) run.shelf.push(null);
    st.deck.forEach(function (id) { run.draw.push({ uid: run.uid++, id: id }); });
    shuffle(run.draw);
    if (!test) {
      var m = Store.meta;
      m.runs++;
      if (daily) {
        m.daily = { date: date, done: false, score: 0, won: false, reached: 0 };
        m.dailyRuns = (m.dailyRuns || 0) + 1;
      }
      unlockLog();
      Store.save();
    }
    startDay();
    return run;
  }

  function resume() {
    var r = Store.loadRun();
    if (!r) return null;
    run = r;
    run.S = null;
    buildStats();
    emit('resume');
    return run;
  }
  function canContinue() { return !!Store.loadRun(); }

  function custCount() {
    var s = S();
    var d = DATA.DAYS[run.day - 1];
    var n = d.cust + s.cust + Math.max(-DATA.REP_LOW_MAX, Math.floor((run.rep - 5) / 2));
    if (s.highRep && run.rep >= 7) n += s.highRep;
    return clamp(n, 2, 14);
  }
  function rentToday() {
    var s = S();
    var d = DATA.DAYS[run.day - 1];
    return Math.max(1, Math.round((d.rent + s.rentAdd) * Math.max(0.5, s.rentMul)));
  }
  function pickEvent() {
    if (run.day === 1) return 'clear';
    return DATA.EVENTS[rnd(DATA.EVENTS.length)].id;
  }
  function buildQueue(n) {
    var pool = DATA.CUSTOMERS.filter(function (c) { return c.minDay <= run.day; });
    var q = [];
    var guard = 0;
    while (q.length < n && guard < 200) {
      guard++;
      var c = pool[rnd(pool.length)];
      if (c.id === 'nightguest' && q.indexOf('nightguest') >= 0) continue;
      q.push(c.id);
    }
    while (q.length < n) q.push('traveler');
    return q;
  }

  function startDay() {
    run.day++;
    // 오늘의 도전: 장날마다 날짜·장날로 씨앗을 다시 정해, 앞 장날을 어떻게 했든 그날의 사건·손님 줄이 같다
    if (run.daily) run.rs = hashStr('bazaar:' + run.dailyDate + ':' + run.day);
    run.event = pickEvent();
    run.S = null;
    var s = buildStats();
    if (s.growNow) {
      run.shelf.forEach(function (it) { if (it && GOODS[it.id].tag === 'grow') it.age += s.growNow; });
    }
    run.rent = rentToday();
    run.queue = buildQueue(custCount());
    run.qi = 0;
    run.cur = null;
    run.daySkipped = 0;
    run.daySold = 0;
    run.dayEarned = 0;
    run.daySpoiled = 0;
    run.phase = 'stock';
    var want = DATA.HAND_BASE + s.draw;
    drawCards(Math.max(0, Math.min(DATA.HAND_MAX, run.hand.length + want) - run.hand.length));
    seen('events', run.event);
    run.queue.forEach(function (id) { seen('cust', id); });
    if (!run.test) Store.saveRun(strip());
    emit('day', { day: run.day, event: run.event });
  }

  function strip() {
    var c = JSON.parse(JSON.stringify(run));
    c.S = null;
    return c;
  }

  function drawCards(n) {
    var got = 0;
    for (var i = 0; i < n; i++) {
      if (!run.draw.length) {
        if (!run.discard.length) break;
        run.draw = shuffle(run.discard);
        run.discard = [];
        emit('reshuffle');
      }
      run.hand.push(run.draw.pop());
      got++;
    }
    return got;
  }

  // ---------- 진열대 ----------
  function rc(s) { return { r: Math.floor(s / W), c: s % W }; }
  function neighbors(s) {
    var p = rc(s), out = [];
    if (p.r > 0) out.push(s - W);
    if (p.r < H - 1) out.push(s + W);
    if (p.c > 0) out.push(s - 1);
    if (p.c < W - 1) out.push(s + 1);
    return out;
  }
  function isEdge(s) { var p = rc(s); return p.r === 0 || p.r === H - 1 || p.c === 0 || p.c === W - 1; }
  function isCenter(s) { var p = rc(s); return p.r === 1; }
  function emptySlots() {
    var out = [];
    for (var i = 0; i < N; i++) if (!run.shelf[i]) out.push(i);
    return out;
  }

  function place(h, s) {
    if (run.phase !== 'stock' || run.over) return false;
    if (h < 0 || h >= run.hand.length || s < 0 || s >= N || run.shelf[s]) return false;
    var card = run.hand.splice(h, 1)[0];
    var g = GOODS[card.id];
    var fr = g.fresh > 0 ? g.fresh + S().fresh : 0;
    run.shelf[s] = { uid: card.uid, id: card.id, age: 0, fresh: fr };
    seen('goods', card.id);
    emit('place', { slot: s, id: card.id });
    if (emptySlots().length === 0) { achieve('fullshelf'); }
    return true;
  }

  // 값 계산 — 핵심 규칙: 이웃 칸이 값을 바꾼다
  function priceAt(s, cust) {
    var it = run.shelf[s];
    if (!it) return null;
    var g = GOODS[it.id];
    var st = S();
    var nb = neighbors(s).map(function (k) { return run.shelf[k]; }).filter(Boolean);
    var same = 0, pair = 0, twin = false;
    var pc = DATA.CATS[g.cat].pair;
    nb.forEach(function (o) {
      var og = GOODS[o.id];
      if (og.cat === g.cat) same++;
      else if (og.cat === pc) pair++;
      if (o.id === it.id) twin = true;
    });
    var v = g.base;
    var notes = [];
    if (g.tag === 'grow') { var gv = it.age * st.grow; if (gv) { v += gv; notes.push('묵힘 +' + gv); } }
    if (g.tag === 'edge' && isEdge(s)) { v += st.edge; notes.push('가장자리 +' + st.edge); }
    if (g.tag === 'center' && isCenter(s)) { v += st.center; notes.push('한가운데 +' + st.center); }
    if (g.tag === 'crowd' && nb.length) { var cv = nb.length * st.crowd; v += cv; notes.push('북적 +' + cv); }
    var mult = 1 + same * st.same + pair * st.pair + (st.cat[g.cat] || 0) + st.all;
    if (cust && cust.wish === 'any') mult += st.any;
    mult = Math.max(0.3, mult);
    v = v * mult;
    var lone = false, tw = false;
    if (g.tag === 'lone' && nb.length === 0) { v *= 2 + st.lone; lone = true; notes.push('외톨이 ×' + (2 + st.lone)); }
    if (g.tag === 'twin' && twin) { v *= 2 + st.twin; tw = true; notes.push('짝꿍 ×' + (2 + st.twin)); }
    var cm = cust ? cust.mult : 1;
    var price = Math.max(1, Math.round(v * cm + st.flat));
    return { price: price, same: same, pair: pair, mult: mult, lone: lone, twin: tw, notes: notes, neighbors: nb.length };
  }

  // 진열 도우미 — 손 물건 h 를 빈칸 s 에 놓았을 때의 값(priceAt 그대로)과 이웃 값이 얼마나 바뀌는지.
  // 잠깐 놓아 셈하고 바로 되돌린다(판 상태는 바뀌지 않는다).
  function previewPlace(h, s) {
    if (!run || run.phase !== 'stock' || run.over) return null;
    if (h < 0 || h >= run.hand.length || s < 0 || s >= N || run.shelf[s]) return null;
    var card = run.hand[h];
    var nb = neighbors(s).filter(function (k) { return run.shelf[k]; });
    var before = 0;
    nb.forEach(function (k) { before += priceAt(k, null).price; });
    run.shelf[s] = { uid: card.uid, id: card.id, age: 0, fresh: 0 };
    try {
      var p = priceAt(s, null);
      var after = 0;
      nb.forEach(function (k) { after += priceAt(k, null).price; });
      return { price: p.price, same: p.same, pair: p.pair, notes: p.notes, gain: after - before };
    } finally {
      run.shelf[s] = null;
    }
  }

  function wants(cust, s) {
    var it = run.shelf[s];
    if (!it) return false;
    return cust.wish === 'any' || GOODS[it.id].cat === cust.wish;
  }
  function matches(cust) {
    var out = [];
    for (var i = 0; i < N; i++) if (wants(cust, i)) out.push(i);
    return out;
  }

  function openShop() {
    if (run.phase !== 'stock' || run.over) return false;
    if (!S().keepHand) {
      run.hand.forEach(function (c) { run.discard.push(c); });
      run.hand = [];
    }
    run.phase = 'sell';
    emit('open');
    nextCustomer();
    return true;
  }

  function changeRep(d) {
    var before = run.rep;
    run.rep = clamp(run.rep + d, 0, DATA.REP_MAX);
    if (run.rep >= DATA.REP_MAX) achieve('rep10');
    return run.rep - before;
  }

  // 다음 손님. 살 것이 없는 손님은 아쉬워하며 간다.
  function nextCustomer() {
    var guard = 0;
    while (run.qi < run.queue.length && guard < 40) {
      guard++;
      var c = CUST[run.queue[run.qi]];
      run.cur = c.id;
      if (matches(c).length) { emit('customer', { id: c.id, idx: run.qi }); return; }
      var d = changeRep(-1);
      run.daySkipped++;
      run.skipped++;
      emit('leave', { id: c.id, none: true, rep: d });
      run.qi++;
    }
    run.cur = null;
    endDay();
  }

  function sell(s) {
    if (run.phase !== 'sell' || run.over || !run.cur) return false;
    var c = CUST[run.cur];
    if (!wants(c, s)) return false;
    var p = priceAt(s, c);
    var it = run.shelf[s];
    var g = GOODS[it.id];
    run.shelf[s] = null;
    run.discard.push({ uid: it.uid, id: it.id });
    run.coins += p.price;
    run.earned += p.price;
    run.dayEarned += p.price;
    run.sold++;
    run.daySold++;
    if (p.price > run.biggest) run.biggest = p.price;
    var dr = 0;
    if (c.rep) dr += changeRep(c.rep);
    var st = S();
    if (c.wish !== 'any' && st.repEvery) {
      run.wishCount++;
      if (run.wishCount % st.repEvery === 0) dr += changeRep(1);
    }
    // 업적
    achieve('first_sale');
    if (p.price >= 10) achieve('big10');
    if (p.price >= 20) achieve('big20');
    if (p.pair >= 3) achieve('pair3');
    if (p.same >= 3) achieve('same3');
    if (p.lone) achieve('lone');
    if (p.twin) achieve('twin');
    if (g.tag === 'grow' && it.age * st.grow > 5) achieve('grow5');
    if (c.id === 'nightguest') achieve('night');
    if (run.earned >= 100) achieve('coins100');
    emit('sell', { slot: s, id: it.id, price: p.price, cust: c.id, rep: dr, info: p });
    run.qi++;
    nextCustomer();
    return true;
  }

  function skip() {
    if (run.phase !== 'sell' || run.over || !run.cur) return false;
    var c = CUST[run.cur];
    var d = 0;
    if (S().soft) {
      run.softCount++;
      if (run.softCount % 2 === 1) d = changeRep(-1);
    } else d = changeRep(-1);
    run.daySkipped++;
    run.skipped++;
    emit('leave', { id: c.id, none: false, rep: d });
    run.qi++;
    nextCustomer();
    return true;
  }

  function endDay() {
    var st = S();
    var spoiled = [];
    for (var i = 0; i < N; i++) {
      var it = run.shelf[i];
      if (!it) continue;
      it.age++;
      if (it.fresh > 0) {
        var g = GOODS[it.id];
        it.fresh -= 1 + (g.cat === 'food' ? st.spoil : 0);
        if (it.fresh <= 0) {
          run.shelf[i] = null;
          run.discard.push({ uid: it.uid, id: it.id });
          spoiled.push({ slot: i, id: it.id });
        }
      }
    }
    var refund = spoiled.length * st.refund;
    run.coins += refund;
    run.spoiled += spoiled.length;
    run.daySpoiled = spoiled.length;
    var interest = st.interest ? Math.floor(run.coins / 10) * st.interest : 0;
    run.coins += interest;
    if (spoiled.length) emit('spoil', { list: spoiled, refund: refund });
    var paid = run.coins >= run.rent;
    run.summary = {
      day: run.day, sold: run.daySold, earned: run.dayEarned, skipped: run.daySkipped,
      spoiled: spoiled.length, refund: refund, interest: interest, rent: run.rent, paid: paid
    };
    if (run.daySkipped === 0 && run.daySold > 0) achieve('nofail');
    if (!paid) {
      run.reason = '자릿세 ' + run.rent + ' 를 내지 못했다 (가진 동전 ' + run.coins + ')';
      finish(false);
      return;
    }
    run.coins -= run.rent;
    if (run.day >= 3) achieve('day3');
    if (run.day >= 6) achieve('day6');
    if (run.day >= 6 && run.spoiled === 0) achieve('nospoil');
    if (!run.test) { Store.meta.stats.days++; }
    if (run.day >= DATA.DAYS.length) {
      run.reason = '열 장날을 모두 버텼다';
      finish(true);
      return;
    }
    run.phase = 'settle';
    run.charmOffer = offerCharms();
    emit('settle', run.summary);
  }

  function offerCharms() {
    var pool = DATA.CHARMS.filter(function (c) { return run.charms.indexOf(c.id) < 0; });
    var out = [];
    var guard = 0;
    while (out.length < 3 && pool.length && guard < 200) {
      guard++;
      var c = pool[rnd(pool.length)];
      if (c.rar === 3 && R() < 0.6) continue;
      if (c.rar === 2 && R() < 0.3) continue;
      if (out.indexOf(c.id) < 0) out.push(c.id);
    }
    return out;
  }

  function pickCharm(i) {
    if (run.phase !== 'settle' || run.over) return false;
    var id = run.charmOffer[i];
    if (!id) return false;
    run.charms.push(id);
    var c = CHARM[id];
    if (c.fx.repNow) changeRep(c.fx.repNow);
    seen('charms', id);
    if (run.charms.length >= 5) achieve('charm5');
    run.charmOffer = [];
    run.S = null;
    buildStats();
    emit('charm', { id: id });
    openMarket();
    return true;
  }

  // ---------- 장보기 ----------
  function marketPool() {
    var maxBase = 3 + run.day;
    return DATA.GOODS.filter(function (g) { return g.base <= maxBase; });
  }
  function costOf(g) {
    return Math.max(1, g.base * 2 - 1 - S().cheap);
  }
  function openMarket() {
    run.phase = 'market';
    run.dayBought = 0;
    var pool = marketPool();
    var n = 4 + S().offers;
    var picks = [];
    var guard = 0;
    while (picks.length < n && guard < 100) {
      guard++;
      var g = pool[rnd(pool.length)];
      if (picks.some(function (p) { return p.id === g.id; })) continue;
      picks.push({ id: g.id, cost: costOf(g), bought: false });
    }
    run.offers = picks;
    emit('market');
  }
  function canBuy(i) {
    var o = run.offers[i];
    return !!(o && !o.bought && run.coins >= o.cost && run.phase === 'market' && !buyLimitHit());
  }
  function buyLimitHit() { return (run.dayBought || 0) >= DATA.BUY_MAX; }
  function buy(i) {
    if (!canBuy(i)) { emit('nobuy', { idx: i }); return false; }
    var o = run.offers[i];
    o.bought = true;
    run.coins -= o.cost;
    run.discard.push({ uid: run.uid++, id: o.id });
    run.bought++;
    run.dayBought = (run.dayBought || 0) + 1;
    seen('goods', o.id);
    if (deckSize() >= 20) achieve('deck20');
    emit('buy', { idx: i, id: o.id, cost: o.cost });
    return true;
  }
  function leaveMarket() {
    if (run.phase !== 'market' || run.over) return false;
    emit('leaveMarket');
    startDay();
    return true;
  }
  function deckSize() {
    return run.draw.length + run.discard.length + run.hand.length + run.shelf.filter(Boolean).length;
  }

  // ---------- 판 끝 ----------
  function finish(won) {
    run.over = true;
    run.won = won;
    run.phase = 'over';
    run.score = run.earned + (won ? run.day : run.day - 1) * 10 + (won ? 100 : 0) + run.rep * 2;
    if (won) achieve('win');
    var stamps = 0;
    if (!run.test) {
      var m = Store.meta;
      var reached = won ? run.day : run.day - 1;
      stamps = reached + (won ? 5 : 0);
      m.stamps += stamps;
      run.newBest = run.score > m.best;
      if (run.newBest) m.best = run.score;
      if (reached > m.bestDay) m.bestDay = reached;
      if (won) m.wins++;
      m.stats.sales += run.sold;
      m.stats.earned += run.earned;
      m.stats.skipped += run.skipped;
      m.stats.spoiled += run.spoiled;
      m.stats.charms += run.charms.length;
      m.stats.bought += run.bought;
      if (run.biggest > m.stats.biggest) m.stats.biggest = run.biggest;
      if (run.daily && m.daily && m.daily.date === run.dailyDate) {
        m.daily.done = true;
        m.daily.score = run.score;
        m.daily.won = won;
        m.daily.reached = reached;
        if (run.score > (m.dailyBest || 0)) m.dailyBest = run.score;
      }
      unlockLog();
      Store.save();
      Store.clearRun();
    }
    run.stampsGot = stamps;
    emit('over', { won: won });
  }

  function quit() {
    if (!run || run.over) return;
    run.reason = '장을 일찍 접었다';
    finish(false);
  }

  // ---------- 판 사이 ----------
  function seen(kind, id) {
    if (run && run.test) return;
    var m = Store.meta;
    if (!m.seen[kind][id]) { m.seen[kind][id] = 1; }
  }
  function achieve(id) {
    if (run && run.test) return;
    var m = Store.meta;
    if (m.ach[id]) return;
    m.ach[id] = Date.now();
    m.stamps += 1;
    unlockLog();
    Store.save();
    var a = DATA.ACHS.filter(function (x) { return x.id === id; })[0];
    emit('ach', { id: id, name: a ? a.name : id });
  }
  function unlockLog() {
    var m = Store.meta;
    DATA.LOG.forEach(function (l) {
      if (m.log[l.id]) return;
      var ok = false;
      if (l.need === 'runs1') ok = m.runs >= 1;
      else if (l.need === 'runs5') ok = m.runs >= 5;
      else ok = !!m.ach[l.need];
      if (ok) m.log[l.id] = 1;
    });
  }
  function buyStall(id) {
    var m = Store.meta;
    var st = stallById(id);
    if (m.stalls.indexOf(id) >= 0) { m.stall = id; Store.save(); return 'pick'; }
    if (m.stamps < st.cost) return 'poor';
    m.stamps -= st.cost;
    m.stalls.push(id);
    m.stall = id;
    if (m.stalls.length >= DATA.STALLS.length) achieve('allstalls');
    Store.save();
    return 'bought';
  }

  // ---------- 시험 훅과 같은 행동 목록 ----------
  function actions() {
    if (!run || run.over) return [];
    var out = [];
    if (run.phase === 'stock') {
      var es = emptySlots();
      for (var h = 0; h < run.hand.length; h++) for (var k = 0; k < es.length; k++) out.push('place:' + h + ':' + es[k]);
      out.push('open');
    } else if (run.phase === 'sell') {
      if (run.cur) {
        matches(CUST[run.cur]).forEach(function (s) { out.push('sell:' + s); });
        out.push('skip');
      }
    } else if (run.phase === 'settle') {
      run.charmOffer.forEach(function (id, i) { out.push('charm:' + i); });
    } else if (run.phase === 'market') {
      run.offers.forEach(function (o, i) { if (canBuy(i)) out.push('buy:' + i); });
      out.push('done');
    }
    return out;
  }
  function act(a) {
    var p = String(a).split(':');
    switch (p[0]) {
      case 'place': return place(+p[1], +p[2]);
      case 'open': return openShop();
      case 'sell': return sell(+p[1]);
      case 'skip': return skip();
      case 'charm': return pickCharm(+p[1]);
      case 'buy': return buy(+p[1]);
      case 'done': return leaveMarket();
    }
    return false;
  }

  api.on = function (fn) { listeners.push(fn); };
  api.newRun = newRun;
  api.resume = resume;
  api.canContinue = canContinue;
  api.daily = dailyInfo;
  api.place = place;
  api.openShop = openShop;
  api.sell = sell;
  api.skip = skip;
  api.pickCharm = pickCharm;
  api.buy = buy;
  api.canBuy = canBuy;
  api.buyLimitHit = function () { return !!run && buyLimitHit(); };
  api.leaveMarket = leaveMarket;
  api.quit = quit;
  api.priceAt = priceAt;
  api.previewPlace = previewPlace;
  api.matches = matches;
  api.neighbors = neighbors;
  api.isEdge = isEdge;
  api.isCenter = isCenter;
  api.buyStall = buyStall;
  api.actions = actions;
  api.act = act;
  api.deckSize = deckSize;
  api.stats = function () { return S(); };
  api.goods = function (id) { return GOODS[id]; };
  api.cust = function (id) { return CUST[id]; };
  api.charm = function (id) { return CHARM[id]; };
  api.event = function (id) { return EVENT[id]; };
  api.stall = stallById;
  api.addTime = function (sec) { if (run && !run.over) run.time += sec; };
  Object.defineProperty(api, 'run', { get: function () { return run; } });
  return api;
})();

// 시험 훅 (기획지시.md 14장) — 화면 버튼과 같은 Game 함수를 부른다
window.__test = {
  reset: function (seed) {
    Game.quiet = true;
    Game.newRun('alley', true);
    return true;
  },
  actions: function () { return Game.actions(); },
  act: function (a) { return Game.act(a); },
  advance: function (ms) { Game.addTime((ms || 0) / 1000); },
  state: function () {
    var r = Game.run;
    if (!r) return { over: false, won: false, stage: 1, stageMax: DATA.DAYS.length, time: 0 };
    return { over: !!r.over, won: !!r.won, stage: Math.max(1, r.day), stageMax: DATA.DAYS.length, time: r.time };
  }
};
