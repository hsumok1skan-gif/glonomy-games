/* Popcorn Drop — 게임 규칙 (상영·냄비·손님·영화관 키우기·저장·시험 훅) */
(function () {
  'use strict';
  const D = window.DATA, P = window.Phys;

  const KEY = 'popcorn-drop-v1';
  const TEST_STAGES = 6;            // 시험 판: 상영관 1부터 6까지 이어서
  const DROP_GAP = 0.25;            // 1초에 4알
  const BASE_CORN = 100, BASE_POT = 200, BASE_FIRES = 2, SHOW_TIME = 90;
  const FIRE_DELAY = 2, BURN_DELAY = 6, MEGA = 50, STREAM = 10;
  const MAX_PLACED = 15;

  // ---------- 저장 ----------
  function defaults() {
    const settings = {};
    D.SETTINGS.forEach(s => { settings[s.key] = s.def; });
    return {
      settings, coins: 0, hall: 1, pick: 1,
      up: { corn: 0, pot: 0, fire: 0, rat: 0 },
      inv: { x2: 0, x4: 0, gold: 0 }, placed: [],
      deco: { owned: ['hall1', 'seat1', 'screen1'], eq: { hall: 'hall1', seat: 'seat1', screen: 'screen1' } },
      tot: {}, best: {}, hallBest: {}, achs: {}, recent: [], tutDone: false, sinceAd: 0,
      daily: { date: '', best: 0, played: false }
    };
  }
  const Store = {
    data: defaults(), ok: true, mute: false,
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const d = JSON.parse(raw), base = defaults();
          this.data = Object.assign(base, d);
          this.data.settings = Object.assign(base.settings, d.settings || {});
          this.data.up = Object.assign(defaults().up, d.up || {});
          this.data.inv = Object.assign(defaults().inv, d.inv || {});
          this.data.deco = Object.assign(defaults().deco, d.deco || {});
        }
      } catch (e) { this.ok = false; this.data = defaults(); }
    },
    save() {
      if (this.mute) return;
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { this.ok = false; }
    },
    wipe() {
      try { localStorage.removeItem(KEY); } catch (e) { this.ok = false; }
      this.data = defaults();
    }
  };

  let handler = function () {};
  let sink = null;                  // 연습 상영(sandbox) 동안 사건을 화면 대신 여기에 모은다
  function emit(type, data) {
    if (sink) sink.push({ type, data: data || {} });
    else if (!Game.testMode) handler(type, data || {});
  }
  function stat(key, n) { const t = Store.data.tot; t[key] = (t[key] || 0) + (n == null ? 1 : n); }
  function best(key, v) { const b = Store.data.best; if (!(b[key] >= v)) b[key] = v; }
  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // ---------- 영화관 키우기 값 ----------
  function upTotal(key) { const L = D.UPGRADES[key].levels; let s = 0; for (let i = 0; i < Store.data.up[key]; i++) s += L[i].add; return s; }
  function cornMax() { return BASE_CORN + upTotal('corn'); }
  function potCap() { return BASE_POT + upTotal('pot'); }
  function firesMax() { return BASE_FIRES + upTotal('fire'); }
  function upNext(key) { return D.UPGRADES[key].levels[Store.data.up[key]] || null; }

  // ---------- 상영 하나 ----------
  let S = null;

  function buildPegs(hall, mode, mod, seed) {
    const pegs = P.makePegs();
    const layout = D.LAYOUTS[hall.layout % D.LAYOUTS.length];
    const extra = mod ? { x2: mod.x2 || 0, x4: mod.x4 || 0, gold: mod.gold || 0 } : {};
    let rats = hall.rats + (mod && mod.rats ? mod.rats : 0);
    if (mode !== 'daily') rats -= upTotal('rat');
    P.applyLayout(pegs, layout, extra, Math.max(0, rats), seed);
    if (mode !== 'daily') {
      Store.data.placed.forEach(pl => { const p = pegs[pl.i]; if (p && p.k !== 'rat') { p.k = pl.k; p.own = true; } });
    }
    return { pegs, layout };
  }

  function makeSeats(rows, tubs) {
    const kinds = shuffle(tubs.split(''));
    const seats = [];
    const faces = shuffle(D.CUSTOMERS.slice());
    let c = 0;
    for (let side = 0; side < 2; side++) {
      for (let r = 0; r < rows; r++) {
        const kind = kinds[c] || 'S';
        const t = D.TUBS[kind];
        seats.push({ id: c, side, row: r, x: side === 0 ? P.SIDE / 2 : P.W - P.SIDE / 2, y: P.rowY(r) - 8,
          kind, cap: t.cap, coin: t.coin, fill: 0, full: false, cust: faces[c % faces.length], cheer: 0, bump: 0 });
        c++;
      }
    }
    const bySide = [0, 1].map(s => seats.filter(x => x.side === s).sort((a, b) => a.y - b.y));
    return { seats, bySide };
  }

  function startShow(hallNo, mode) {
    mode = mode || 'hall';
    let hall, mod = null, seed;
    if (mode === 'daily') {
      const dseed = hashStr(today());
      const base = D.HALLS[4];
      mod = D.DAILY_MODS[dseed % D.DAILY_MODS.length];
      hall = Object.assign({}, base, { layout: dseed % D.LAYOUTS.length, n: 0 });
      seed = dseed;
    } else {
      hall = D.HALLS[Math.max(1, Math.min(D.HALLS.length, hallNo)) - 1];
      seed = hall.n * 7919 + 13;
    }
    const built = buildPegs(hall, mode, mod, seed);
    const rows = Math.min(8, hall.rows + (mod && mod.rows ? mod.rows : 0));
    let tubs = hall.tubs;
    while (tubs.length < rows * 2) tubs += 'M';
    const st = makeSeats(rows, tubs);
    const daily = mode === 'daily';
    const corn = daily ? BASE_CORN + (mod.corn || 0) : cornMax();
    S = {
      mode, hall, hallNo: hall.n, mod, layout: built.layout, pegs: built.pegs,
      film: D.FILMS[(Math.max(1, hall.n) - 1) % D.FILMS.length] || D.FILMS[0],
      seats: st.seats, bySide: st.bySide, goal: Math.min(hall.goal, st.seats.length),
      corn, cornMax: corn, kernelTotal: 0, funnelX: 180, holding: false, dropAcc: DROP_GAP,
      kernels: [], pops: [], rolls: [],
      pots: [0, 1, 2, 3, 4].map(i => ({ i, n: 0, gold: 0, fire: false, fireT: 0, emptyT: 0, burning: false, popping: false, acc: 0, bump: 0 })),
      potCap: daily ? BASE_POT + (mod.pot || 0) : potCap(),
      firesMax: daily ? BASE_FIRES + (mod.fire || 0) : firesMax(),
      time: 0, timeMax: SHOW_TIME + (mod && mod.time ? mod.time : 0),
      clockOn: true, idle: 0, done: false, result: null,
      coins: 0, filled: 0, biggest: 0, chain: 0, chainT: -9, bestChain: 0,
      popped: 0, caramel: 0, burnt: 0, ratted: 0, splits: 0, overflow: 0, lost: 0,
      adCornUsed: false, cornOutSaid: false,
      prevBig: Store.data.best.biggest || 0,
      tut: 0
    };
    if (mode === 'hall' && !Game.testMode && !Store.data.tutDone && hall.n === 1) { S.tut = 1; S.clockOn = false; }
    stat('shows');
    if (daily) stat('daily');
    emit('start', { mode });
    return S;
  }

  // ---------- 조작 ----------
  function setFunnel(x) { if (S && !S.done) S.funnelX = Math.max(P.FUNNEL_MIN, Math.min(P.FUNNEL_MAX, x)); }
  function moveFunnel(dx) { if (S) setFunnel(S.funnelX + dx); }
  function setHold(on) {
    if (!S || S.done) return;
    if (on && !S.holding) S.dropAcc = DROP_GAP;
    S.holding = !!on;
  }
  function firesOn() { return S ? S.pots.filter(p => p.fire).length : 0; }
  function canFire(i) { const p = S && S.pots[i]; return !!p && !S.done && (p.fire || firesOn() < S.firesMax); }
  function toggleFire(i) {
    if (!S || S.done) return false;
    const p = S.pots[i];
    if (!p) return false;
    if (p.fire) {
      p.fire = false; p.fireT = 0; p.emptyT = 0; p.burning = false; p.popping = false; p.acc = 0;
      emit('fire', { i, on: false });
      return true;
    }
    if (firesOn() >= S.firesMax) { emit('fireFull', { i, max: S.firesMax }); return false; }
    p.fire = true; p.fireT = 0; p.emptyT = 0; p.popping = false; p.acc = 0;
    emit('fire', { i, on: true });
    return true;
  }

  // ---------- 못 ----------
  function onPeg(k, p) {
    if (p.k === 'n') return;
    p.glow = 1;
    if (p.k === 'rat') {
      k.dead = true; S.ratted++; stat('ratted');
      emit('rat', { x: p.x, y: p.y });
      return;
    }
    if (p.k === 'gold') {
      if (!k.gold) { k.gold = true; emit('gold', { x: p.x, y: p.y }); }
      return;
    }
    if (k.split) return;                 // 한 알당 한 번만 갈라진다
    const n = p.k === 'x4' ? 4 : 2;
    k.split = true;
    const sp = [-1, 1, -0.45, 0.45];
    for (let c = 1; c < n; c++) {
      S.kernels.push({ x: k.x + sp[c % 4] * 3, y: k.y, vx: sp[c] * (70 + Math.random() * 40), vy: k.vy * 0.5 - 30,
        life: k.life, split: true, gold: k.gold, lastPeg: p.i, dead: false });
    }
    k.vx = sp[0] * (70 + Math.random() * 40);
    S.kernelTotal += n - 1; S.splits++;
    stat('splits');
    if (n === 4) stat('quad');
    emit('split', { x: p.x, y: p.y, n });
    if (S.tut === 1) tutNext();
  }

  function land(k) {
    const pot = S.pots[P.potAt(k.x)];
    pot.bump = 1;
    if (pot.burning) { S.burnt++; stat('burnt'); emit('burnt', { i: pot.i }); return; }
    if (pot.n >= S.potCap) {
      S.overflow++;
      S.rolls.push({ x: P.potX(pot.i), y: P.POT_TOP, vx: (Math.random() < 0.5 ? -1 : 1) * 60, t: 0 });
      emit('overflow', { i: pot.i });
      return;
    }
    pot.n++;
    if (k.gold) pot.gold++;
  }

  // ---------- 터뜨리기 ----------
  const LEFT_BIAS = [0.85, 0.72, 0.5, 0.28, 0.15];
  function popMany(pot, count, big) {
    count = Math.min(count, pot.n);
    if (count <= 0) return;
    const boost = big ? 1.18 : 1;
    let car = 0;
    for (let c = 0; c < count; c++) {
      const isCar = pot.gold > 0 && Math.random() < pot.gold / pot.n;
      if (isCar) { pot.gold--; car++; }
      pot.n--;
      const dir = Math.random() < LEFT_BIAS[pot.i] ? -1 : 1;
      S.pops.push({ x: P.potX(pot.i) + (Math.random() - 0.5) * 24, y: P.POT_TOP - 2,
        vx: dir * (50 + Math.random() * 115) * boost, vy: -(330 + Math.random() * 200) * boost,
        car: isCar, spin: Math.random() * 6, vs: (Math.random() - 0.5) * 12 });
    }
    S.popped += count; S.caramel += car;
    stat('popped', count); if (car) stat('caramel', car);
    if (count > S.biggest) S.biggest = count;
    best('biggest', count);
    if (big) stat('mega');
    pot.bump = 1;
    emit(big ? 'mega' : 'pop', { i: pot.i, n: count });
    if (S.tut === 2) tutNext();
  }

  function updatePot(pot, dt) {
    if (pot.bump > 0) pot.bump = Math.max(0, pot.bump - dt * 4);
    if (!pot.fire) return;
    pot.fireT += dt;
    if (pot.fireT < FIRE_DELAY) return;
    if (pot.n > 0) {
      pot.emptyT = 0;
      if (!pot.popping) {
        pot.popping = true;
        const big = pot.n >= MEGA;
        popMany(pot, big ? Math.ceil(pot.n * 0.6) : Math.ceil(pot.n * 0.35), big);
      } else {
        pot.acc += dt * STREAM;
        while (pot.acc >= 1 && pot.n > 0) { pot.acc -= 1; popMany(pot, 1, false); }
      }
    } else {
      pot.popping = false; pot.acc = 0;
      if (!pot.burning) {
        pot.emptyT += dt;
        if (pot.emptyT >= BURN_DELAY) { pot.burning = true; emit('burn', { i: pot.i }); }
      }
    }
  }

  // ---------- 손님 통 ----------
  function catchAt(pc, side, y0, y1) {
    const list = S.bySide[side];
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      if (s.y > y0 && s.y <= y1) {
        if (s.full) continue;
        s.fill += pc.car ? 5 : 1;
        s.bump = 1;
        if (s.fill >= s.cap) { s.fill = s.cap; fillSeat(s); }
        else emit('catch', { seat: s.id, car: pc.car });
        return true;
      }
    }
    return false;
  }

  function coinTier(v) { return v >= 40 ? 3 : v >= 15 ? 2 : v >= 5 ? 1 : 0; }
  function fillSeat(s) {
    s.full = true; s.cheer = 1;
    S.chain = S.time - S.chainT <= 1 ? S.chain + 1 : 1;
    S.chainT = S.time;
    if (S.chain > S.bestChain) S.bestChain = S.chain;
    best('chain', S.chain);
    const coins = Math.round((s.coin + s.cust.tip) * (1 + 0.5 * (S.chain - 1)));
    S.coins += coins; S.filled++;
    stat('filled');
    emit('fill', { seat: s.id, x: s.x, y: s.y, coins, tier: coinTier(coins), chain: S.chain });
    if (S.tut === 3) tutNext();
    if (S.filled >= S.seats.length) endShow('soldout');
  }

  // ---------- 튜토리얼 ----------
  function tutNext() {
    if (!S || !S.tut) return;
    S.tut++;
    if (S.tut > 3) { S.tut = 0; S.clockOn = true; Store.data.tutDone = true; Store.save(); }
    emit('tut', { step: S.tut });
  }
  function skipTut() {
    if (!S || !S.tut) return;
    S.tut = 0; S.clockOn = true; Store.data.tutDone = true; Store.save();
    emit('tut', { step: 0 });
  }

  // ---------- 한 걸음 ----------
  function update(dt) {
    if (!S || S.done) return;
    if (S.clockOn) S.time += dt;
    // 떨구기
    if (S.holding && S.corn > 0) {
      S.dropAcc += dt;
      while (S.dropAcc >= DROP_GAP && S.corn > 0) {
        S.dropAcc -= DROP_GAP;
        S.corn--; S.kernelTotal++;
        S.kernels.push({ x: S.funnelX + (Math.random() - 0.5) * 4, y: P.FUNNEL_Y, vx: (Math.random() - 0.5) * 20, vy: 40,
          life: 0, split: false, gold: false, lastPeg: -1, dead: false });
        emit('drop', {});
      }
    }
    if (S.corn <= 0 && !S.cornOutSaid) { S.cornOutSaid = true; emit('cornOut', { ad: !S.adCornUsed }); }
    // 알
    const ks = S.kernels;
    for (let i = ks.length - 1; i >= 0; i--) {
      const k = ks[i];
      const r = P.stepKernel(k, dt, S.pegs, onPeg);
      if (k.dead) { ks.splice(i, 1); continue; }
      if (r === 'pot') { ks.splice(i, 1); land(k); }
    }
    for (const p of S.pegs) if (p.glow > 0) p.glow = Math.max(0, p.glow - dt * 3);
    // 냄비
    for (const pot of S.pots) updatePot(pot, dt);
    // 팝콘
    const ps = S.pops;
    for (let i = ps.length - 1; i >= 0; i--) {
      const r = P.stepPop(ps[i], dt, catchAt);
      if (r === 'caught') ps.splice(i, 1);
      else if (r === 'lost') { ps.splice(i, 1); S.lost++; }
      if (S.done) return;
    }
    for (let i = S.rolls.length - 1; i >= 0; i--) {
      const r = S.rolls[i]; r.t += dt; r.x += r.vx * dt;
      if (r.t > 1.2) S.rolls.splice(i, 1);
    }
    for (const s of S.seats) { if (s.bump > 0) s.bump = Math.max(0, s.bump - dt * 4); if (s.cheer > 0 && s.cheer < 3) s.cheer += dt; }
    // 끝
    if (S.time >= S.timeMax) { endShow('time'); return; }
    const empty = S.corn <= 0 && !ks.length && !ps.length && S.pots.every(p => p.n === 0);
    if (empty && (S.adCornUsed || Game.testMode || S.mode === 'daily') && !S.tut) {
      S.idle += dt;
      if (S.idle > 1.5) endShow('empty');
    } else S.idle = 0;
  }

  function endShow(why) {
    if (!S || S.done) return;
    S.done = true; S.holding = false;
    const soldout = S.filled >= S.seats.length;
    let bonus = 0;
    if (soldout) { bonus = 30 + Math.round(S.coins * 0.5); stat('soldout'); }
    const total = S.coins + bonus;
    const passed = S.mode === 'hall' && S.filled >= S.goal;
    const res = { why, mode: S.mode, hallNo: S.hallNo, film: S.film, filled: S.filled, seats: S.seats.length, goal: S.goal,
      coins: total, bonus, soldout, biggest: S.biggest, popped: S.popped, caramel: S.caramel, burnt: S.burnt,
      ratted: S.ratted, splits: S.splits, overflow: S.overflow, bestChain: S.bestChain, passed, opened: false,
      doubled: false, newDaily: false, time: Math.round(S.time) };
    Store.data.coins += total; stat('coins', total);
    if (passed && S.hallNo >= Store.data.hall && Store.data.hall < D.HALLS.length) {
      Store.data.hall = S.hallNo + 1; Store.data.pick = Store.data.hall; res.opened = true;
    }
    best('hall', Store.data.hall);
    // 최고 기록: 가장 크게 터진 한 번(모든 상영)과 상영관마다 번 동전
    res.bestBig = Store.data.best.biggest || 0;
    res.newBig = S.biggest > 0 && S.biggest > S.prevBig;
    if (S.mode === 'hall') {
      const hb = Store.data.hallBest || (Store.data.hallBest = {});
      const prev = hb[S.hallNo] || 0;
      res.newHallBest = total > prev;
      if (res.newHallBest) hb[S.hallNo] = total;
      res.hallBest = hb[S.hallNo] || 0;
    }
    if (S.mode === 'daily') {
      const t = today();
      if (Store.data.daily.date !== t) Store.data.daily = { date: t, best: 0, played: false };
      Store.data.daily.played = true;
      if (total > Store.data.daily.best) { Store.data.daily.best = total; res.newDaily = true; }
    }
    Store.data.sinceAd = (Store.data.sinceAd || 0) + 1;
    Store.data.recent.unshift({ hall: S.hallNo, mode: S.mode, filled: S.filled, seats: S.seats.length, coins: total, big: S.biggest });
    Store.data.recent = Store.data.recent.slice(0, 5);
    S.result = res;
    checkAchs();
    Store.save();
    emit('end', res);
  }

  // ---------- 광고 자리 (광고 SDK 없음: 자리만 두고 보상을 준다) ----------
  function adCorn() {
    if (!S || S.done || S.adCornUsed || S.corn > 0) return false;
    S.adCornUsed = true; S.corn += 30; S.cornMax += 30; S.cornOutSaid = false;
    emit('adCorn', {});
    return true;
  }
  function adDouble(res) {
    if (!res || res.doubled) return false;
    res.doubled = true; Store.data.coins += res.coins; stat('coins', res.coins);
    checkAchs(); Store.save();
    return true;
  }
  function needInterstitial() { return (Store.data.sinceAd || 0) >= 3; }
  function interstitialShown() { Store.data.sinceAd = 0; Store.save(); }

  // ---------- 영화관 키우기 ----------
  function buyUp(key) {
    const nx = upNext(key);
    if (!nx || Store.data.coins < nx.cost) return false;
    Store.data.coins -= nx.cost; Store.data.up[key]++;
    Store.save(); emit('buy', { key }); checkAchs();
    return true;
  }
  function pegPrice(kind) { return D.PEG_KINDS[kind].price; }
  function buyPeg(kind) {
    if (!D.PEG_KINDS[kind] || !D.PEG_KINDS[kind].price || Store.data.coins < pegPrice(kind)) return false;
    Store.data.coins -= pegPrice(kind); Store.data.inv[kind]++;
    Store.save(); emit('buy', { key: kind });
    return true;
  }
  function boardPreview() { return buildPegs(D.HALLS[Store.data.pick - 1] || D.HALLS[0], 'hall', null, (Store.data.pick) * 7919 + 13).pegs; }
  function placePeg(kind, i) {
    if (!Store.data.inv[kind] || Store.data.placed.length >= MAX_PLACED) return false;
    if (Store.data.placed.some(p => p.i === i)) return false;
    const pegs = boardPreview();
    if (!pegs[i] || pegs[i].k !== 'n') return false;
    Store.data.inv[kind]--; Store.data.placed.push({ i, k: kind });
    stat('placed'); Store.save(); emit('place', { i, kind }); checkAchs();
    return true;
  }
  function removePeg(i) {
    const at = Store.data.placed.findIndex(p => p.i === i);
    if (at < 0) return false;
    const pl = Store.data.placed.splice(at, 1)[0];
    Store.data.inv[pl.k]++; Store.save(); emit('unplace', { i });
    return true;
  }
  function randomFreePeg() {
    const pegs = boardPreview().filter(p => p.k === 'n' && p.r >= 1 && !Store.data.placed.some(q => q.i === p.i));
    return pegs.length ? pegs[Math.floor(Math.random() * pegs.length)].i : -1;
  }
  function buyDeco(id) {
    const d = D.DECO.find(x => x.id === id);
    if (!d) return false;
    const o = Store.data.deco;
    if (o.owned.indexOf(id) < 0) {
      if (Store.data.coins < d.cost) return false;
      Store.data.coins -= d.cost; o.owned.push(id); stat('decos');
    }
    o.eq[d.kind] = id;
    Store.save(); emit('deco', { id }); checkAchs();
    return true;
  }
  function pickHall(dir) {
    Store.data.pick = Math.max(1, Math.min(Store.data.hall, (Store.data.pick || 1) + dir));
    Store.save();
  }
  function dailyState() {
    const d = Store.data.daily, t = today();
    return { date: t, played: d.date === t && d.played, best: d.date === t ? d.best : 0, mod: D.DAILY_MODS[hashStr(t) % D.DAILY_MODS.length] };
  }

  // ---------- 업적 ----------
  function checkAchs() {
    D.ACHS.forEach(a => {
      if (Store.data.achs[a.id]) return;
      const v = a.best ? (Store.data.best[a.key] || 0) : (Store.data.tot[a.key] || 0);
      if (v >= a.need) { Store.data.achs[a.id] = true; emit('ach', { a }); }
    });
  }

  // ---------- 연습 상영 (시작 화면 예고편) ----------
  // 같은 규칙으로 따로 한 판을 돌린다. 저장·기록·지금 상영은 건드리지 않고 끝나면 되돌린다.
  function sandbox(fn) {
    const keep = { S, data: Store.data, mute: Store.mute, test: Game.testMode, sink };
    const d = defaults();
    d.tutDone = true; d.settings = keep.data.settings; d.deco = keep.data.deco;   // 꾸미기·설정은 보기만 한다
    Store.data = d; Store.mute = true; Game.testMode = true; sink = [];
    try { return fn(sink); } finally {
      S = keep.S; Store.data = keep.data; Store.mute = keep.mute; Game.testMode = keep.test; sink = keep.sink;
    }
  }

  // ---------- 시험 훅 (기획지시 14장) ----------
  const run = { stage: 1, time: 0, over: false, won: false, phase: 'play' };
  function testActions() {
    if (run.over) return [];
    if (run.phase === 'lobby') {
      const a = [];
      ['corn', 'pot', 'fire', 'rat'].forEach(k => { const nx = upNext(k); if (nx && Store.data.coins >= nx.cost) a.push('up:' + k); });
      ['x2', 'x4', 'gold'].forEach(k => { if (Store.data.coins >= pegPrice(k) && Store.data.placed.length < MAX_PLACED) a.push('peg:' + k); });
      a.push('next');
      return a;
    }
    if (!S || S.done) return [];
    const a = ['left', 'right', S.holding ? 'release' : 'hold'];
    for (let i = 0; i < 5; i++) if (canFire(i)) a.push('fire:' + i);
    return a;
  }
  function testAct(a) {
    const [cmd, arg] = String(a).split(':');
    if (cmd === 'left') moveFunnel(-30);
    else if (cmd === 'right') moveFunnel(30);
    else if (cmd === 'hold') setHold(true);
    else if (cmd === 'release') setHold(false);
    else if (cmd === 'fire') toggleFire(Number(arg));
    else if (cmd === 'up') buyUp(arg);
    else if (cmd === 'peg') { if (buyPeg(arg)) { const i = randomFreePeg(); if (i >= 0) placePeg(arg, i); } }
    else if (cmd === 'next') { run.phase = 'play'; Store.data.pick = run.stage; startShow(run.stage, 'hall'); }
  }
  function afterShow() {
    if (!S || !S.done || run.phase !== 'play' || run.over) return;
    if (!S.result.passed) { run.over = true; run.won = false; return; }
    if (run.stage >= TEST_STAGES) { run.over = true; run.won = true; return; }
    run.stage++; run.phase = 'lobby';
  }
  window.__test = {
    reset(seed) {
      Game.testMode = true;
      Store.mute = true; Store.data = defaults(); Store.data.tutDone = true;
      run.stage = 1; run.time = 0; run.over = false; run.won = false; run.phase = 'play';
      startShow(1, 'hall');
      return seed;
    },
    actions() { return testActions(); },
    act(a) { testAct(a); afterShow(); },
    advance(ms) {
      const steps = Math.max(1, Math.round(ms / (1000 / 60)));
      for (let i = 0; i < steps && !run.over; i++) {
        if (run.phase === 'play' && S && !S.done) update(1 / 60);
        run.time += 1 / 60;
        afterShow();
        if (run.phase === 'lobby') { run.time += (steps - i - 1) / 60; break; }
      }
    },
    state() { return { over: run.over, won: run.won, stage: run.stage, stageMax: TEST_STAGES, time: run.time }; }
  };

  const Game = {
    Store, testMode: false,
    get S() { return S; },
    on(fn) { handler = fn; },
    startShow, update, endShow, setFunnel, moveFunnel, setHold, toggleFire, canFire, firesOn,
    skipTut, adCorn, adDouble, needInterstitial, interstitialShown,
    buyUp, upNext, upTotal, buyPeg, pegPrice, placePeg, removePeg, boardPreview, buyDeco, pickHall, dailyState,
    cornMax, potCap, firesMax, coinTier, checkAchs, today, sandbox, MAX_PLACED, MEGA
  };
  Store.load();
  window.Game = Game;
})();
