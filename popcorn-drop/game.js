/* Popcorn Drop — 게임 규칙 (쏟아붓기·프라이팬·손님 줄·스킬 트리·저장·시험 훅) */
(function () {
  'use strict';
  const D = window.DATA, P = window.Phys;

  const KEY = 'popcorn-drop-v2';
  const TEST_STAGES = 6;              // 시험 판: 첫 판부터 6판까지 목표를 이어서 채우면 이김
  const BASE_CORN = 20;               // 첫 판 옥수수 20알
  const BASE_PAN = 132;               // 큰 프라이팬 하나 (판 폭의 약 절반)
  const BASE_QUEUE = 8, MAX_QUEUE = 28;
  const SERVE_GAP = 0.3;              // 손님 한 명씩 0.3초 간격
  const CAL_POURS = 40;               // 목표를 정할 때 같은 규칙으로 미리 쏟아 보는 횟수
  const GOAL_C = 0.8, GOAL_C_FIRST = 2;
  const DAILY_ROUND = 7;              // 오늘의 도전: 손님 줄은 7판째 길이
  const DAILY_NODES = [6, 10];        // 오늘의 도전: 날짜로 고른 스킬 6~10칸

  // ---------- 저장 ----------
  function defaults() {
    const settings = {};
    D.SETTINGS.forEach(s => { settings[s.key] = s.def; });
    return {
      settings, coins: 0, owned: { start: true }, theater: 1, theaters: 1, round: 1, streak: 0,
      tot: {}, best: {}, achs: {}, recent: [], tutDone: false, sinceAd: 0, adDay: '', daily: null
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
          this.data.settings = Object.assign(defaults().settings, d.settings || {});
          this.data.owned = Object.assign({ start: true }, d.owned || {});
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
  let sink = null;                    // 연습 판(sandbox) 동안 사건을 화면 대신 여기에 모은다
  function emit(type, data) {
    if (sink) sink.push({ type, data: data || {} });
    else if (!Game.testMode) {
      // 오늘의 도전 중이면 화면 반응(조각·흔들림)은 보통 무작위를 쓴다 — 도전 판의 씨앗 차례를 건드리지 않게
      if (!outerRandom) { handler(type, data || {}); return; }
      const r = Math.random;
      Math.random = outerRandom;
      try { handler(type, data || {}); } finally { Math.random = r; }
    }
  }
  // ---------- 오늘의 도전: 날짜 씨앗 ----------
  // 도전 판의 규칙 계산(쏟기·못·손님·팁) 동안만 Math.random 을 날짜 씨앗 난수로 바꿔 끼운다.
  // 그래서 같은 날에는 누구나 같은 판(같은 스킬·상영관·손님 줄·떨어지는 자리)을 한다.
  let dailyRng = null, outerRandom = null, mainS = null;
  function daily(fn) {
    if (!dailyRng || !S || !S.daily || outerRandom) return fn();
    outerRandom = Math.random; Math.random = dailyRng;
    try { return fn(); } finally { Math.random = outerRandom; outerRandom = null; }
  }
  function daySeed(day) {
    let h = 2166136261;
    for (let i = 0; i < day.length; i++) h = Math.imul(h ^ day.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  // 그날의 판: 시작 칸에서 이어진 칸을 씨앗 차례로 6~10칸 산 스킬, 상영관 하나, 상영작 하나
  function dailyPlan(day) {
    const seed = daySeed(day), r = P.seeded(seed ^ 0x5bd1e995);
    const owned = { start: true }, nodes = [];
    const n = DAILY_NODES[0] + Math.floor(r() * (DAILY_NODES[1] - DAILY_NODES[0] + 1));
    for (let i = 0; i < n; i++) {
      const cand = D.SKILLS.filter(s => !owned[s.id] && s.eff !== 'key' && s.links.some(l => owned[l]));
      if (!cand.length) break;
      const s = cand[Math.floor(r() * cand.length)];
      owned[s.id] = true; nodes.push(s.id);
    }
    const theater = 1 + Math.floor(r() * D.THEATERS.length);
    return { day, seed, owned, nodes, theater, film: D.FILMS[Math.floor(r() * D.FILMS.length)] };
  }
  function stat(key, n) { const t = Store.data.tot; t[key] = (t[key] || 0) + (n == null ? 1 : n); }
  function best(key, v) { const b = Store.data.best; if (!(b[key] >= v)) b[key] = v; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // ---------- 스킬 → 숫자 ----------
  function stats(owned) {
    owned = owned || Store.data.owned;
    const s = { corn: BASE_CORN, gold: 0, x2: 0, x3: 0, gpeg: 0, rows: P.BASE_ROWS, pan: BASE_PAN, rim: 0, rimw: 0, pan2: false,
      cust: 0, price: 0, tip: 0, vip: 0, bonus: 0, sold: 0, repour: 0, nodes: 0, keys: 0 };
    Object.keys(owned).forEach(id => {
      const n = D.SKILL[id];
      if (!owned[id] || !n || id === 'start') return;
      s.nodes++;
      switch (n.eff) {
        case 'corn': s.corn += n.val; break;
        case 'gold': s.gold += n.val; break;
        case 'x2': s.x2 += n.val; break;
        case 'x3': s.x3 += n.val; break;
        case 'gpeg': s.gpeg += n.val; break;
        case 'rows': s.rows += n.val; break;
        case 'pan': s.pan += n.val; break;
        case 'rim': s.rim += n.val; break;
        case 'rimw': s.rimw += n.val; break;
        case 'pan2': s.pan2 = true; break;
        case 'cust': s.cust += n.val; break;
        case 'price': s.price += n.val; break;
        case 'tip': s.tip += n.val; break;
        case 'vip': s.vip += n.val; break;
        case 'bonus': s.bonus += n.val; break;
        case 'sold': s.sold += n.val; break;
        case 'repour': s.repour += n.val; break;
        case 'key': s.keys++; break;
        default: break;
      }
    });
    s.rows = Math.min(P.MAX_ROWS, s.rows);
    s.rimAll = s.rim + s.rimw;          // 받침 넓히기만 있어도 좁은 받침이 생긴다
    return s;
  }
  function keysOwned() { return D.KEYS.filter(k => Store.data.owned[k.id]).length; }
  function costOf(id) { return D.costOf(D.SKILL[id], keysOwned()); }
  function canBuy(id) {
    const n = D.SKILL[id], o = Store.data.owned;
    if (!n || o[id]) return false;
    return n.links.some(l => o[l]);           // 이미 연 칸과 이어진 칸만
  }
  function nodeState(id) {
    if (Store.data.owned[id]) return 'owned';
    if (!canBuy(id)) return 'far';
    return Store.data.coins >= costOf(id) ? 'buy' : 'near';
  }

  // ---------- 판(쏟아붓기 한 번)의 세계: 진짜 판과 미리 쏟아 보기가 같은 함수를 쓴다 ----------
  function boardFor(st, t) {
    const th = D.THEATERS[t - 1] || D.THEATERS[0];
    return P.makeBoard(th.shape, st.rows, 1000 + t * 7919, { x2: st.x2, x3: st.x3, gpeg: st.gpeg });
  }
  function makeWorld(st, t) {
    return { st, board: boardFor(st, t), pans: P.makePans(st.pan, st.pan2), rim: st.rimAll, kernels: [],
      poured: 0, caught: 0, missed: 0, splits: 0, triples: 0, golds: 0, repourDone: false };
  }
  // 옥수수 n알을 화면 위쪽 폭 전체에 흩어 한꺼번에 쏟는다
  function spawn(w, n, goldPct) {
    for (let i = 0; i < n; i++) {
      w.kernels.push({ x: P.BL + P.KR + 2 + Math.random() * (P.USABLE - 4), y: P.SPAWN_Y0 + Math.random() * (P.SPAWN_Y1 - P.SPAWN_Y0),
        vx: (Math.random() - 0.5) * 30, vy: 20 + Math.random() * 80, life: 0, gen: 0, gold: Math.random() * 100 < goldPct,
        lastPeg: -1, wait: Math.random() * 0.28, out: false });
    }
    w.poured += n;
  }
  function panHit(w, x) {
    for (const p of w.pans) {
      const d = Math.abs(x - p.x);
      if (d <= p.w / 2) return 'in';
      if (w.rim && d <= p.w / 2 + w.rim) return 'rim';
    }
    return null;
  }
  // 특수 못: 두 배 못은 2알, 세 배 못은 3알로 가른다. 한 알 줄기는 두 번까지 갈라진다(같은 못에서 두 번은 안 됨).
  function onPeg(w, k, p, cb) {
    if (p.k === 'n') return;
    p.glow = 1;
    if (p.k === 'gold') {
      if (!k.gold) { k.gold = true; w.golds++; if (cb.gold) cb.gold(p); }
      return;
    }
    if (k.gen >= 2) return;
    const n = p.k === 'x3' ? 3 : 2;
    k.gen++;
    const sp = n === 3 ? [-1, 1, 0] : [-1, 1];
    k.vx = sp[0] * (60 + Math.random() * 40);
    for (let c = 1; c < n; c++) {
      w.kernels.push({ x: k.x + sp[c] * 3, y: k.y, vx: sp[c] * (60 + Math.random() * 40) + (Math.random() - 0.5) * 20, vy: k.vy * 0.5 - 30,
        life: k.life, gen: k.gen, gold: k.gold, lastPeg: p.i, wait: 0, out: false });
    }
    w.splits++; if (n === 3) w.triples++;
    w.poured += n - 1;
    if (cb.split) cb.split(p, n);
  }
  function stepKernels(w, dt, cb) {
    const ks = w.kernels;
    const hit = (kk, p) => onPeg(w, kk, p, cb);
    for (let i = ks.length - 1; i >= 0; i--) {
      const k = ks[i];
      if (k.wait > 0) { k.wait -= dt; continue; }
      const y0 = k.y;
      P.stepKernel(k, dt, w.board, hit);
      if (!k.out && y0 < P.PAN_Y && k.y >= P.PAN_Y) {
        const h = panHit(w, k.x);
        if (h) { ks.splice(i, 1); w.caught++; cb.land(k, h); continue; }
        k.out = true;                          // 프라이팬 밖: 바닥으로 떨어져 굴러 사라진다
      }
      if (k.out && k.y >= P.FLOOR) { ks.splice(i, 1); w.missed++; cb.miss(k); }
    }
  }

  // 미리 쏟아 보기: 같은 세계·같은 걸음으로 한 판을 그리지 않고 끝까지 돌려 팝콘 수만 센다
  function virtualPour(st, t) {
    const w = makeWorld(st, t);
    let made = 0;
    const cb = { land(k) { made += k.gold ? 5 : 1; }, miss() {}, split: null, gold: null };
    spawn(w, st.corn, st.gold);
    for (let g = 0; g < 1200; g++) {
      stepKernels(w, 1 / 60, cb);
      if (!w.kernels.length) {
        if (st.repour && !w.repourDone) { w.repourDone = true; spawn(w, Math.floor(st.corn * Math.min(75, st.repour) / 100), st.gold); }
        else break;
      }
    }
    return made;
  }
  const calCache = {};
  function calKey(st, t) { return [t, st.corn, st.gold, st.x2, st.x3, st.gpeg, st.rows, st.pan, st.rimAll, st.pan2 ? 1 : 0, st.repour].join(','); }
  function calibrate(st, t, m) {
    m = m || CAL_POURS;
    const key = calKey(st, t) + '|' + m;
    if (calCache[key]) return calCache[key];
    let s = 0, s2 = 0;
    for (let i = 0; i < m; i++) { const v = virtualPour(st, t); s += v; s2 += v * v; }
    const mean = s / m, sd = Math.sqrt(Math.max(0, s2 / m - mean * mean));
    calCache[key] = { mean, sd };
    return calCache[key];
  }
  // 목표 팝콘 = 지금 스킬로 보통 나오는 팝콘(평균)에서 흔들림(표준편차)의 0.8배를 뺀 만큼. 맨 첫 판은 연습이라 2배를 뺀다.
  function targetFor(st, t, first) {
    const c = calibrate(st, t);
    return Math.max(1, Math.floor(c.mean - (first ? GOAL_C_FIRST : GOAL_C) * c.sd));
  }

  // ---------- 손님 줄 ----------
  function queueSize(st, t, round) {
    const th = D.THEATERS[t - 1] || D.THEATERS[0];
    return Math.min(MAX_QUEUE, BASE_QUEUE + Math.floor((round - 1) / 2) + st.cust + th.extra);
  }
  function newCustomer(t, vip) {
    if (vip) return { cust: D.VIP, want: 10 + Math.floor(Math.random() * 5), vip: true, state: 'wait', t: 0, say: '', coins: 0 };
    const faces = D.CUSTOMERS.filter(c => c.hall === t);
    return { cust: pick(faces.length ? faces : D.CUSTOMERS), want: 3 + Math.floor(Math.random() * 6), vip: false, state: 'wait', t: 0, say: '', coins: 0 };
  }
  function fitQueue() {
    const want = queueSize(S.st, S.theater, S.round);
    const plain = S.queue.filter(q => !q.vip), vips = S.queue.filter(q => q.vip);
    while (plain.length < want) plain.push(newCustomer(S.theater, false));
    while (vips.length < S.st.vip) vips.push(newCustomer(S.theater, true));
    S.queue = plain.concat(vips);               // VIP 손님은 줄 끝
  }
  function payOf(q) {
    const th = D.THEATERS[S.theater - 1] || D.THEATERS[0];
    const coins = Math.round(q.want * (1 + S.st.price / 100) * th.pay * (q.vip ? 2 : 1));
    let tip = 0;
    if (S.st.tip && Math.random() * 100 < S.st.tip) tip = 1 + Math.floor(Math.random() * Math.max(2, q.want / 2));
    return { coins: coins + tip, tip };
  }

  // ---------- 판 하나 ----------
  let S = null;
  function blankRound(st, t, round) {
    return {
      phase: 'ready', round, theater: t, st, world: makeWorld(st, t), queue: [],
      film: D.FILMS[(round - 1) % D.FILMS.length], first: round === 1,
      pending: [], pops: [], rollers: [], popcorn: 0, made: 0, served: 0, coins: 0, tips: 0, vips: 0,
      serveIdx: 0, serveT: 0, endT: 0, soldOut: false, sellout: false, double: false,
      target: 0, cfgKey: '', time: 0, done: false, result: null, tut: 0, daily: null
    };
  }
  function newRound() {
    const d = Store.data, st = stats();
    dailyRng = null; mainS = null;              // 보통 판을 새로 열면 오늘의 도전 판은 끝난다
    d.theater = Math.max(1, Math.min(d.theaters, d.theater || 1));
    const t = d.theater;
    S = blankRound(st, t, d.round);
    fitQueue();
    if (S.first) S.queue[0].want = 3;           // 맨 첫 판의 첫 손님은 3개만 산다(나눠 주는 걸 꼭 보게)
    refreshTarget();
    if (!Game.testMode && !d.tutDone) S.tut = 1;
    emit('round', { round: S.round });
    return S;
  }
  // 쏟기 전에 스킬을 사면 목표·줄·못 판을 바로 다시 맞춘다
  function refreshTarget() {
    if (!S || S.phase !== 'ready' || S.daily) return;
    const st = stats();
    S.st = st;
    S.world = makeWorld(st, S.theater);
    fitQueue();
    const key = calKey(st, S.theater);
    if (key !== S.cfgKey) { S.cfgKey = key; S.target = targetFor(st, S.theater, S.first); }
  }
  function pourCount() { return S ? S.st.corn * (S.double ? 2 : 1) : 0; }

  function pour() {
    if (!S || S.phase !== 'ready') return false;
    if (S.daily) { Store.data.daily = { day: S.daily.day, done: false }; Store.save(); }   // 쏟으면 오늘 한 번을 쓴 것
    else refreshTarget();
    S.phase = 'pour';
    const n = pourCount();
    daily(() => spawn(S.world, n, S.st.gold));
    stat('rounds');
    emit('pour', { n });
    if (S.tut === 1) tutTo(2);
    return true;
  }

  const realCb = {
    land(k, h) {
      S.pending.push({ t: 0.3 + Math.random() * 0.35, x: k.x, gold: k.gold });
      emit('land', { x: k.x, rim: h === 'rim', gold: k.gold });
    },
    miss(k) {
      S.rollers.push({ x: k.x, vx: k.x < P.PAN_X ? -80 : 80, t: 0, gold: k.gold });
      emit('miss', { x: k.x });
    },
    split(p, n) { stat('splits'); if (n === 3) stat('triple'); emit('split', { x: p.x, y: p.y, n }); },
    gold(p) { emit('gold', { x: p.x, y: p.y }); }
  };
  function popOut(q) {
    S.pops.push({ x: q.x + (Math.random() - 0.5) * 10, y: P.PAN_Y - 4, vx: (Math.random() - 0.5) * 130, vy: -(280 + Math.random() * 140),
      v: q.gold ? 5 : 1, car: q.gold, spin: Math.random() * 6, vs: (Math.random() - 0.5) * 12 });
    if (q.gold) stat('caramel');
    emit('pop', { x: q.x, car: q.gold });
  }

  function update(dt) {
    if (!S || S.done) return;
    if (S.daily) daily(() => tick(dt));
    else tick(dt);
  }
  function tick(dt) {
    S.time += dt;
    const w = S.world;
    for (let i = S.rollers.length - 1; i >= 0; i--) {
      const r = S.rollers[i]; r.t += dt; r.x += r.vx * dt;
      if (r.t > 0.9) S.rollers.splice(i, 1);
    }
    for (const q of S.queue) if (q.state !== 'wait') q.t += dt;
    if (S.phase === 'pour') {
      stepKernels(w, dt, realCb);
      for (const p of w.board.all) if (p.glow > 0) p.glow = Math.max(0, p.glow - dt * 3);
      for (let i = S.pending.length - 1; i >= 0; i--) {
        const q = S.pending[i]; q.t -= dt;
        if (q.t <= 0) { S.pending.splice(i, 1); popOut(q); }
      }
      for (let i = S.pops.length - 1; i >= 0; i--) {
        const p = S.pops[i];
        if (P.stepPop(p, dt) === 'bin') { S.pops.splice(i, 1); S.popcorn += p.v; S.made += p.v; emit('bin', { v: p.v, x: p.x }); }
      }
      if (!w.kernels.length && !S.pending.length && !S.pops.length) {
        if (S.st.repour && !w.repourDone) {
          w.repourDone = true;
          const n = Math.floor(pourCount() * Math.min(75, S.st.repour) / 100);
          spawn(w, n, S.st.gold);
          stat('repours');
          emit('repour', { n });
        } else startServe();
      }
    } else if (S.phase === 'serve') {
      if (S.endT > 0) { S.endT -= dt; if (S.endT <= 0) finishRound(); }
      else {
        S.serveT -= dt;
        if (S.serveT <= 0) { S.serveT = SERVE_GAP; serveNext(); }
      }
    }
  }

  // ---------- 나눠 주기 ----------
  function startServe() {
    S.phase = 'serve';
    S.serveT = 0.45;
    emit('serveStart', { made: S.made });
    if (S.tut === 2) tutTo(3);
  }
  function serveNext() {
    const q = S.queue[S.serveIdx];
    if (!q) { S.sellout = true; S.endT = 0.8; emit('sellout', {}); return; }
    if (S.popcorn >= q.want) {
      S.popcorn -= q.want;
      const pay = payOf(q);
      q.state = 'got'; q.t = 0; q.coins = pay.coins; q.say = pick(D.HAPPY);
      S.coins += pay.coins; S.served++;
      stat('served');
      if (pay.tip) { S.tips++; stat('tips'); }
      if (q.vip) { S.vips++; stat('vips'); }
      emit('serve', { i: S.serveIdx, coins: pay.coins, tip: pay.tip, vip: q.vip });
      S.serveIdx++;
    } else {
      S.soldOut = true;
      for (let j = S.serveIdx; j < S.queue.length; j++) {
        const r = S.queue[j];
        r.state = 'sad'; r.t = -(j - S.serveIdx) * 0.06; r.say = j - S.serveIdx < 3 ? pick(D.SAD) : '';
      }
      S.endT = 1.1;
      emit('soldout', { left: S.queue.length - S.serveIdx, popcorn: S.popcorn });
    }
  }
  function finishRound() {
    if (!S || S.done) return;
    const d = Store.data, st = S.st, w = S.world;
    const bonus = st.bonus;
    let soldBonus = 0;
    if (S.sellout) { soldBonus = 5 + Math.round(S.coins * (0.2 + st.sold / 100)); stat('sellouts'); }
    const hit = S.made >= S.target;
    // 오늘의 도전은 연속·한 판 최고·최근 판·전면 광고 차례를 건드리지 않고, 도전 기록만 따로 남긴다
    const bestKey = S.daily ? 'daily' : 'round';
    if (!S.daily) { d.streak = hit ? (d.streak || 0) + 1 : 0; best('streak', d.streak); }
    const total = S.coins + bonus + soldBonus;
    d.coins += total;
    stat('coins', total); stat('popcorn', S.made);
    const prevBest = d.best[bestKey] || 0;
    best(bestKey, S.made);
    const res = {
      round: S.round, theater: S.theater, film: S.film, base: pourCount(), poured: w.poured, made: S.made,
      served: S.served, queue: S.queue.length, coins: S.coins, bonus, soldBonus, total, sellout: S.sellout,
      soldOut: S.soldOut, leftover: S.popcorn, target: S.target, hit, streak: d.streak, splits: w.splits,
      caught: w.caught, missed: w.missed, tips: S.tips, newBest: S.made > prevBest && prevBest > 0, bestRound: d.best[bestKey] || 0,
      doubled: false, daily: S.daily ? S.daily.day : ''
    };
    S.phase = 'result'; S.done = true; S.result = res;
    if (S.daily) {
      stat('dailies');
      d.daily = { day: S.daily.day, done: true, made: S.made, served: S.served, queue: S.queue.length, coins: total, hit, target: S.target };
    } else {
      d.sinceAd = (d.sinceAd || 0) + 1;
      d.recent.unshift({ round: S.round, t: S.theater, made: S.made, served: S.served, queue: S.queue.length, coins: total, hit });
      d.recent = d.recent.slice(0, 5);
    }
    checkAchs();
    Store.save();
    emit('end', res);
    if (S.tut === 3) tutTo(4);
  }
  function next() {
    if (!S || S.phase !== 'result' || S.daily) return false;
    if (S.tut) { Store.data.tutDone = true; }
    Store.data.round = (Store.data.round || 1) + 1;
    Store.save();
    newRound();
    return true;
  }

  // ---------- 스킬 트리 ----------
  function buy(id) {
    if (!canBuy(id)) return false;
    const c = costOf(id);
    if (Store.data.coins < c) return false;
    const d = Store.data, n = D.SKILL[id];
    d.coins -= c; d.owned[id] = true;
    stat('nodes');
    let opened = 0;
    if (n.eff === 'key') {
      stat('keys');
      d.theaters = Math.min(D.THEATERS.length, (d.theaters || 1) + 1);
      d.theater = d.theaters; opened = d.theater;
    }
    Store.save();
    emit('buy', { id, cost: c, opened });
    checkAchs();
    if (S && S.phase === 'ready' && !S.daily) {
      if (opened) { const keepTut = S.tut; newRound(); S.tut = keepTut; } else refreshTarget();
    }
    if (S && S.tut === 5 && id === S.tutNode) tutTo(6);
    return true;
  }
  // 상영관 고르기: 쏟기 전이면 바로, 아니면 다음 판부터
  function setTheater(t) {
    const d = Store.data;
    if (t < 1 || t > d.theaters) return false;
    d.theater = t; Store.save();
    if (S && S.phase === 'ready' && !S.daily) { const keepTut = S.tut; newRound(); S.tut = keepTut; }
    return true;
  }

  // ---------- 광고 자리 (광고 SDK 없음: 자리만 두고 보상을 준다) ----------
  function adDouble(res) {
    if (!res || res.doubled || res.total <= 0 || res.daily) return false;
    res.doubled = true; Store.data.coins += res.total; stat('coins', res.total);
    checkAchs(); Store.save();
    return true;
  }
  function canAdCorn() { return !!S && S.phase === 'ready' && !S.double && !S.daily && Store.data.adDay !== today(); }
  function adCorn() {
    if (!canAdCorn()) return false;
    Store.data.adDay = today(); S.double = true; Store.save();
    emit('adCorn', { n: pourCount() });
    return true;
  }
  // 전면 광고: 첫 5판은 없고, 그 뒤 판 4번마다 결과 창 뒤에 한 번
  function needInterstitial() { return !!S && !S.daily && S.round > 5 && (Store.data.sinceAd || 0) >= 4; }
  function interstitialShown() { Store.data.sinceAd = 0; Store.save(); }

  // ---------- 오늘의 도전 (하루 한 번) ----------
  function dailyDone() { const x = Store.data.daily; return !!x && x.day === today(); }
  function dailyInfo() {
    const day = today(), plan = dailyPlan(day), x = Store.data.daily;
    const done = dailyDone();
    return { day, done, last: done ? x : null, best: Store.data.best.daily || 0, theater: plan.theater, nodes: plan.nodes.length,
      corn: stats(plan.owned).corn, playing: !!S && !!S.daily };
  }
  // 그날의 판을 연다. 보통 판(S)은 그대로 두었다가 endDaily 에서 되돌린다.
  function startDaily() {
    if (dailyDone() || (S && S.daily)) return false;
    const plan = dailyPlan(today());
    const st = stats(plan.owned), t = plan.theater;
    const target = targetFor(st, t, false);       // 목표는 보통 무작위로 미리 쏟아 본다(씨앗 차례를 쓰지 않음)
    mainS = S;
    dailyRng = P.seeded(plan.seed);
    S = blankRound(st, t, DAILY_ROUND);
    S.first = false; S.film = plan.film; S.target = target; S.cfgKey = calKey(st, t);
    S.daily = { day: plan.day, seed: plan.seed, nodes: plan.nodes.length };
    daily(fitQueue);
    emit('round', { round: S.round, daily: true });
    return true;
  }
  // 도전 판을 닫고 보통 판으로 돌아간다. 쏟는 중이었으면 화면 없이 끝까지 돌려 결과를 남긴다.
  function endDaily() {
    if (!S || !S.daily) return false;
    if (S.phase !== 'ready' && !S.done) {
      const keep = sink;
      sink = [];
      try {
        for (let i = 0; i < 4000 && !S.done; i++) update(1 / 60);
        if (!S.done) daily(finishRound);
      } finally { sink = keep; }
    }
    S = mainS; mainS = null; dailyRng = null;
    return true;
  }

  // ---------- 처음 하는 사람 ----------
  // ① 쏟아붓기! 만 반짝 ② 쏟아지고 팝콘이 되는 걸 본다 ③ 손님에게 나눠 주고 품절을 본다 ④ 결과 창 ‘스킬 트리’ ⑤ ‘옥수수 +5’ 사기 ⑥ ‘다음 판’
  function tutTo(step) {
    if (!S || !S.tut) return;
    S.tut = step;
    if (step === 5) {
      // 사 볼 칸: 첫 칸 ‘옥수수 +5’. 이미 샀으면(안내 다시 보기) 지금 살 수 있는 가장 싼 칸
      const list = D.SKILLS.filter(n => canBuy(n.id)).sort((a, b) => costOf(a.id) - costOf(b.id));
      S.tutNode = canBuy('corn_M1') ? 'corn_M1' : (list[0] ? list[0].id : '');
    }
    emit('tut', { step });
  }
  function tutEvent(what) {
    if (!S || !S.tut) return;
    if (what === 'tree' && S.tut === 4) tutTo(5);
  }
  function skipTut() {
    if (!S || !S.tut) return;
    S.tut = 0; Store.data.tutDone = true; Store.save();
    emit('tut', { step: 0, skipped: true });
  }

  // ---------- 업적 ----------
  function checkAchs() {
    D.ACHS.forEach(a => {
      if (Store.data.achs[a.id]) return;
      const v = a.best ? (Store.data.best[a.key] || 0) : (Store.data.tot[a.key] || 0);
      if (v >= a.need) { Store.data.achs[a.id] = true; emit('ach', { a }); }
    });
  }

  // ---------- 연습 판 (시작 화면 예고편·성장 재기) ----------
  // 같은 규칙으로 따로 돌린다. 저장·기록·지금 판은 건드리지 않고 끝나면 되돌린다.
  function sandbox(fn) {
    const keep = { S, data: Store.data, mute: Store.mute, test: Game.testMode, sink, dailyRng, mainS };
    const d = defaults();
    d.tutDone = true; d.settings = keep.data.settings;
    Store.data = d; Store.mute = true; Game.testMode = true; sink = [];
    try { return fn(sink); } finally {
      S = keep.S; Store.data = keep.data; Store.mute = keep.mute; Game.testMode = keep.test; sink = keep.sink;
      dailyRng = keep.dailyRng; mainS = keep.mainS;
    }
  }
  // 스킬 10칸을 산 뒤 팝콘이 첫 판(스킬 없음)보다 몇 배 나오나 — 같은 규칙으로 60번씩 쏟아 본 평균
  const PLAN10 = ['corn_M1', 'corn_M2', 'corn_M3', 'corn_B3', 'pan_M1', 'pan_M2', 'pan_M3', 'peg_M1', 'peg_M2', 'peg_M3'];
  function growth() {
    const own0 = { start: true }, own10 = { start: true };
    PLAN10.forEach(id => { own10[id] = true; });
    const a = calibrate(stats(own0), 1, 60), b = calibrate(stats(own10), 1, 60);
    return { base: a.mean, ten: b.mean, ratio: a.mean ? b.mean / a.mean : 0, plan: PLAN10 };
  }

  // ---------- 시험 훅 (기획지시 14장) ----------
  // 시험 판 = 처음 하는 사람이 첫 판부터 이어서 한다. 판마다 목표 팝콘을 못 채우면 그 판에서 끝(진 판), 6판 모두 채우면 이긴 판.
  const run = { round: 1, time: 0, over: false, won: false, view: 'play', judged: false };
  function testActions() {
    if (run.over || !S) return [];
    if (run.view === 'tree') {
      const a = [];
      D.SKILLS.forEach(n => { if (canBuy(n.id) && Store.data.coins >= costOf(n.id)) a.push('buy:' + n.id); });
      a.push('close');
      return a;
    }
    if (S.phase === 'ready') return ['pour', 'tree'];
    if (S.phase === 'result') return ['tree', 'next'];
    return [];
  }
  function testAct(a) {
    const s = String(a), i = s.indexOf(':');
    const cmd = i < 0 ? s : s.slice(0, i), arg = i < 0 ? '' : s.slice(i + 1);
    if (cmd === 'pour') pour();
    else if (cmd === 'tree') run.view = 'tree';
    else if (cmd === 'close') run.view = 'play';
    else if (cmd === 'buy') buy(arg);
    else if (cmd === 'next' && S && S.phase === 'result' && !run.over) { run.round++; run.judged = false; next(); }
  }
  function judge() {
    if (!S || S.phase !== 'result' || run.judged || run.over) return;
    run.judged = true;
    if (!S.result.hit) { run.over = true; run.won = false; }
    else if (run.round >= TEST_STAGES) { run.over = true; run.won = true; }
  }
  window.__test = {
    reset(seed) {
      Game.testMode = true;
      Store.mute = true; Store.data = defaults(); Store.data.tutDone = true;
      run.round = 1; run.time = 0; run.over = false; run.won = false; run.view = 'play'; run.judged = false;
      newRound();
      return seed;
    },
    actions() { return testActions(); },
    act(a) { testAct(a); judge(); },
    advance(ms) {
      const steps = Math.max(1, Math.round(ms / (1000 / 60)));
      for (let i = 0; i < steps && !run.over; i++) {
        if (!S || S.done || S.phase === 'ready') { run.time += (steps - i) / 60; break; }
        update(1 / 60);
        run.time += 1 / 60;
        judge();
      }
    },
    state() { return { over: run.over, won: run.won, stage: run.round, stageMax: TEST_STAGES, time: run.time }; }
  };

  const Game = {
    Store, testMode: false,
    get S() { return S; },
    on(fn) { handler = fn; },
    newRound, pour, update, next, buy, canBuy, costOf, nodeState, keysOwned, setTheater, stats, pourCount,
    adDouble, canAdCorn, adCorn, needInterstitial, interstitialShown, tutEvent, skipTut,
    startDaily, endDaily, dailyInfo, dailyDone, dailyPlan,
    checkAchs, today, sandbox, growth, calibrate, targetFor, BASE_CORN, PLAN10
  };
  Store.load();
  window.Game = Game;
})();
