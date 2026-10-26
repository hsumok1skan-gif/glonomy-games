// Ember Watch — 게임 규칙 (화면 그리기·소리 없이 규칙만 계산한다. 시험 훅도 이 함수들을 그대로 부른다)
(function () {
  'use strict';
  const D = window.EW_DATA;
  const EW = window.EW = window.EW || {};

  const W = 1600, H = 900, FX = 800, FY = 470;
  const NIGHT_LEN = 64;      // 밤 하나의 길이(초)
  const STAGE_MAX = 10;
  const MAX_ENEMIES = 70;
  const MAX_LOGS = 9;
  EW.W = W; EW.H = H; EW.FX = FX; EW.FY = FY; EW.NIGHT_LEN = NIGHT_LEN; EW.STAGE_MAX = STAGE_MAX;

  // 화면·소리 쪽에서 덮어쓴다 (시험 모드에서는 아무것도 하지 않는다)
  EW.ev = function () {};

  const BASE = {
    moveSpeed: 190, maxHp: 100, regen: 3, carry: 4, pickR: 30,
    fireBurn: 1, fireRadius: 1, fireDps: 11, fuelMax: 100,
    lampDps: 20, lampDrain: 2.4, lampRadius: 1, oilMax: 100,
    woodFire: 1, woodLamp: 1, dropChance: 0.22, emberMul: 1,
    dawnFuel: 20, dawnHeal: 20, lightSlow: 0.3, armor: 0, logRate: 1, eatResist: 0,
    oilOnKill: 0, fuelOnKill: 0, hpOnKill: 0, spark: 0, shareFire: 0, shareLamp: 0,
    revive: 0, rage: 0, thorns: 0, feedBurst: 0,
    startWood: 0, startFuel: 0, startOil: 0
  };

  let R = null;
  EW.getRun = function () { return R; };

  function dist(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function has(e, s) { return e.sp.indexOf(s) >= 0; }

  // ---- 무작위 ----
  // 보통 판(과 시험 훅)은 Math.random 을 그대로 쓴다. 오늘의 도전 판만 날짜 씨앗으로 정해지는 흐름 넷을 쓴다:
  // e 시간 맞춰 오는 그림자, w 시간 맞춰 나오는 장작, o 새벽 카드·유물, m 쓰러뜨림·부르기처럼 플레이에 따라 생기는 것.
  // 흐름을 나눠서 플레이가 달라도 같은 밤의 그림자·장작·카드는 되도록 같게 나온다.
  function rnd(k) {
    if (!R || !R.rng) return Math.random();
    let t = (R.rng[k] = (R.rng[k] + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function makeStreams(seed) {
    const s = String(seed);
    return { e: hashStr(s + ':e'), w: hashStr(s + ':w'), o: hashStr(s + ':o'), m: hashStr(s + ':m') };
  }

  // 날짜(YYYY-MM-DD)로 오늘의 도전 판을 정한다: 씨앗·지역·등불. 누구나 같은 날이면 같은 판이다
  EW.dailySetup = function (date) {
    const seed = hashStr('ember-watch-daily-' + date);
    return {
      date: date, seed: seed,
      region: seed % D.REGIONS.length,
      lantern: D.LANTERNS[(seed >>> 8) % D.LANTERNS.length].id
    };
  };

  function applyMods(st, mods, times) {
    const k = times || 1;
    (mods || []).forEach(function (m) {
      const key = m[0], op = m[1], v = m[2];
      if (!(key in st)) return;
      if (op === 'mul') st[key] *= Math.pow(v, k);
      else st[key] += v * k;
    });
  }

  // 지역·등불·야영 준비·카드·유물을 합쳐 이번 판 능력치를 만든다
  function buildStats(run) {
    const st = Object.assign({}, BASE);
    const reg = D.REGIONS[run.region];
    applyMods(st, reg.mods);
    const lan = D.LANTERN_MAP[run.lantern] || D.LANTERNS[0];
    applyMods(st, lan.m);
    if (run.prep) {
      D.PREP.forEach(function (p) {
        const lv = run.prep[p.id] || 0;
        if (lv > 0) applyMods(st, p.m, lv);
      });
    }
    run.cards.forEach(function (id) { const c = D.CARD_MAP[id]; if (c) applyMods(st, c.m); });
    run.relics.forEach(function (id) { const c = D.RELIC_MAP[id]; if (c) applyMods(st, c.m); });
    st.carry = Math.max(1, Math.round(st.carry));
    st.armor = Math.min(0.6, st.armor);
    st.eatResist = Math.min(0.8, st.eatResist);
    st.lightSlow = Math.min(0.7, st.lightSlow);
    st.dropChance = Math.min(0.7, st.dropChance);
    st.oilMax = Math.max(40, st.oilMax);
    return st;
  }
  EW.buildStats = buildStats;

  // ---- 판 만들기 ----
  EW.newRun = function (o) {
    o = o || {};
    R = {
      region: o.region || 0, lantern: o.lantern || 'old', prep: o.prep || null,
      relicPool: o.relicPool || null,
      daily: o.daily || null, rng: o.daily ? makeStreams(o.seed) : null, nightRng: null,
      cards: [], relics: [], night: 1, phase: 'night', t: 0, time: 0,
      fuel: 0, hp: 0, oil: 0, wood: [], sel: 0,
      px: FX, py: FY + 90, dx: 0, dy: 0, goal: null, mireT: 0, frostT: 0, hurtT: 0, eatT: 0,
      enemies: [], logs: [], spawnAcc: 0, logAcc: 0, sparkAcc: 0, eliteDone: false,
      offer: [], kills: 0, bossKills: 0, embers: 0, fedFire: 0, fedLamp: 0,
      revived: 0, brightT: 0, dampT: 0, won: false, endWhy: '', dawns: 0,
      nightMinFuel: 100, lowWarned: false,
      flags: { close: false, full: false, maxCarry: 0 }
    };
    R.st = buildStats(R);
    R.fuel = Math.min(R.st.fuelMax, 70 + R.st.startFuel);
    R.hp = R.st.maxHp;
    R.oil = Math.min(R.st.oilMax, 60 + R.st.startOil);
    for (let i = 0; i < R.st.startWood; i++) R.wood.push('twig');
    startNight(1);
    return R;
  };

  // 저장한 판 불러오기 (밤이 시작될 때 저장한다)
  EW.loadRun = function (s) {
    EW.newRun({ region: s.region, lantern: s.lantern, prep: s.prep, relicPool: s.relicPool, daily: s.daily || null, seed: 0 });
    R.cards = (s.cards || []).filter(function (id) { return !!D.CARD_MAP[id]; });
    R.relics = (s.relics || []).filter(function (id) { return !!D.RELIC_MAP[id]; });
    R.st = buildStats(R);
    R.fuel = clamp(s.fuel || 50, 1, R.st.fuelMax);
    R.hp = clamp(s.hp || R.st.maxHp, 1, R.st.maxHp);
    R.oil = clamp(s.oil || 0, 0, R.st.oilMax);
    R.wood = (s.wood || []).filter(function (w) { return !!D.WOOD_MAP[w]; }).slice(0, R.st.carry);
    R.kills = s.kills || 0; R.bossKills = s.bossKills || 0; R.embers = s.embers || 0;
    R.fedFire = s.fedFire || 0; R.fedLamp = s.fedLamp || 0; R.time = s.time || 0;
    R.revived = s.revived || 0; R.dawns = s.dawns || 0;
    if (s.flags) R.flags = Object.assign(R.flags, s.flags);
    // 오늘의 도전은 그 밤이 시작될 때의 무작위 흐름으로 되돌려 같은 밤을 다시 연다
    if (R.daily && s.rng) R.rng = Object.assign({}, s.rng);
    startNight(clamp(s.night || 1, 1, STAGE_MAX));
    return R;
  };

  EW.snapshot = function () {
    if (!R || R.phase === 'over') return null;
    return {
      region: R.region, lantern: R.lantern, prep: R.prep, relicPool: R.relicPool,
      daily: R.daily, rng: R.nightRng ? Object.assign({}, R.nightRng) : null,
      cards: R.cards.slice(), relics: R.relics.slice(), night: R.night,
      fuel: R.fuel, hp: R.hp, oil: R.oil, wood: R.wood.slice(),
      kills: R.kills, bossKills: R.bossKills, embers: R.embers, fedFire: R.fedFire, fedLamp: R.fedLamp,
      time: R.time, revived: R.revived, dawns: R.dawns, flags: Object.assign({}, R.flags)
    };
  };

  function startNight(n) {
    R.night = n; R.phase = 'night'; R.t = 0;
    R.nightRng = R.rng ? Object.assign({}, R.rng) : null;
    R.enemies = []; R.logs = [];
    R.spawnAcc = 0; R.logAcc = 0; R.sparkAcc = 0; R.eliteDone = false;
    R.goal = null; R.nightMinFuel = R.fuel; R.lowWarned = false;
    R.px = FX; R.py = FY + 90;
    // 밤이 시작될 때 장작 셋은 모닥불 가까이에 있다
    for (let i = 0; i < 3; i++) spawnLog(true);
    EW.ev('night', n);
  }

  // ---- 빛 ----
  function fireR() { return R ? (70 + Math.max(0, R.fuel) * 2.3) * R.st.fireRadius : 0; }
  function lampR() { return R && R.oil > 0 ? (36 + R.oil * 1.05) * R.st.lampRadius : 0; }
  EW.fireR = fireR; EW.lampR = lampR;

  // ---- 장작 ----
  function pickWoodType() {
    const ws = D.REGIONS[R.region].woods;
    let sum = 0; Object.keys(ws).forEach(function (k) { sum += ws[k]; });
    let x = rnd('w') * sum;
    const keys = Object.keys(ws);
    for (let i = 0; i < keys.length; i++) { x -= ws[keys[i]]; if (x <= 0) return keys[i]; }
    return keys[0];
  }

  function spawnLog(near, x, y, type) {
    if (R.logs.length >= (x === undefined ? MAX_LOGS : 24)) return;
    let lx = x, ly = y;
    const k = x === undefined ? 'w' : 'm';
    if (lx === undefined) {
      const a = rnd(k) * Math.PI * 2;
      const fr = fireR();
      const d = near ? 60 + rnd(k) * Math.max(20, fr * 0.85 - 60) : 230 + rnd(k) * 430;
      lx = clamp(FX + Math.cos(a) * d, 40, W - 40);
      ly = clamp(FY + Math.sin(a) * d, 40, H - 40);
    }
    R.logs.push({ x: lx, y: ly, type: type || pickWoodType(), rot: rnd(k) * 3.14, age: 0 });
  }

  // ---- 그림자 ----
  function spawnEnemy(id, x, y, scale) {
    const b = D.ENEMY_MAP[id];
    if (!b) return null;
    const reg = D.REGIONS[R.region];
    const nt = D.NIGHTS[R.night - 1];
    let ex = x, ey = y;
    const k = x === undefined ? 'e' : 'm';
    if (ex === undefined) {
      const side = Math.floor(rnd(k) * 4);
      if (side === 0) { ex = rnd(k) * W; ey = -24; }
      else if (side === 1) { ex = rnd(k) * W; ey = H + 24; }
      else if (side === 2) { ex = -24; ey = rnd(k) * H; }
      else { ex = W + 24; ey = rnd(k) * H; }
    }
    const hp = b.hp * nt.hpMul * reg.hpMul * (scale || 1);
    const e = {
      id: id, b: b, x: ex, y: ey, hp: hp, maxHp: hp, r: b.r * (scale && scale < 1 ? 0.85 : 1),
      spd: b.spd * reg.spdMul * (0.9 + rnd(k) * 0.2), sp: b.sp || [],
      tm: rnd(k) * 2, dashT: 0, flee: false, acc: 0, numT: 0, hitT: 0,
      boss: !!b.boss, elite: !!(scale && scale < 1 && b.boss), wob: rnd(k) * 6
    };
    // 약한 모습의 우두머리는 모닥불도 덜 먹는다
    e.eatMul = e.elite ? 0.6 : 1;
    R.enemies.push(e);
    EW.ev('spawn', e);
    return e;
  }

  function pickEnemyId() {
    const list = D.REGIONS[R.region].enemies;
    const n = Math.min(list.length, 2 + R.night);
    return list[Math.floor(rnd('e') * n)];
  }

  function kill(e) {
    const st = R.st;
    R.kills++;
    R.embers += Math.round(e.b.ember * st.emberMul);
    if (rnd('m') < st.dropChance) spawnLog(false, e.x, e.y, 'twig');
    if (e.boss) {
      R.bossKills++;
      for (let i = 0; i < 3; i++) spawnLog(false, clamp(e.x + (i - 1) * 30, 40, W - 40), clamp(e.y + 20, 40, H - 40), 'oak');
    }
    if (st.oilOnKill) R.oil = Math.min(st.oilMax, R.oil + st.oilOnKill);
    if (st.fuelOnKill) R.fuel = Math.min(st.fuelMax, R.fuel + st.fuelOnKill);
    if (st.hpOnKill) R.hp = Math.min(st.maxHp, R.hp + st.hpOnKill);
    if (has(e, 'split') && e.id !== 'smoke_bit' && R.enemies.length < MAX_ENEMIES) {
      spawnEnemy('smoke_bit', e.x - 14, e.y);
      spawnEnemy('smoke_bit', e.x + 14, e.y);
    }
    EW.ev('kill', e);
  }

  // 모닥불 빛 안 모든 그림자에게 한 번에 피해 (자작 껍질, 불꽃 터뜨리기)
  function fireBurst(amount) {
    const fr = fireR();
    R.enemies.forEach(function (e) {
      if (dist(e.x, e.y, FX, FY) < fr) { e.hp -= amount; e.hitT = 0.12; EW.ev('dmg', { x: e.x, y: e.y, v: amount, big: true }); }
    });
    EW.ev('burst', amount);
  }

  // ---- 장작 나누기 (이 게임의 핵심 판단) ----
  function takeWood() {
    if (R.wood.length === 0) return null;
    const i = clamp(R.sel, 0, R.wood.length - 1);
    const type = R.wood.splice(i, 1)[0];
    R.sel = clamp(R.sel, 0, Math.max(0, R.wood.length - 1));
    return D.WOOD_MAP[type];
  }

  function doFeedFire() {
    const w = takeWood();
    if (!w) return false;
    const st = R.st;
    const add = w.fire * st.woodFire;
    R.fuel = Math.min(st.fuelMax, R.fuel + add);
    if (st.shareFire > 0) R.oil = Math.min(st.oilMax, R.oil + w.lamp * st.woodLamp * st.shareFire);
    if (w.sp === 'damp') R.dampT = 10;
    if (w.sp === 'ember') R.embers += Math.round(5 * st.emberMul);
    R.fedFire++;
    EW.ev('feedFire', { wood: w, v: add });
    if (w.sp === 'flash') fireBurst(30);
    if (st.feedBurst > 0) fireBurst(st.feedBurst);
    return true;
  }

  // 던져 넣을 수 있는 거리: 모닥불 빛 반경의 80% 안
  function throwRange() { return Math.max(64, fireR() * 0.8); }
  EW.throwRange = throwRange;

  // 🔥 불에 넣기: 모닥불 빛 안이면 바로 던져 넣고, 멀면 걸어가서 넣는다
  EW.feedFire = function () {
    if (!R || R.phase !== 'night' || R.wood.length === 0) return false;
    if (dist(R.px, R.py, FX, FY) <= throwRange()) return doFeedFire();
    R.goal = 'fire';
    EW.ev('goal', 'fire');
    return true;
  };

  // 🏮 등불에 넣기: 그 자리에서 바로 넣는다
  EW.feedLamp = function () {
    if (!R || R.phase !== 'night' || R.wood.length === 0) return false;
    const w = takeWood();
    if (!w) return false;
    const st = R.st;
    const add = w.lamp * st.woodLamp;
    R.oil = Math.min(st.oilMax, R.oil + add);
    if (st.shareLamp > 0) R.fuel = Math.min(st.fuelMax, R.fuel + w.fire * st.woodFire * st.shareLamp);
    if (w.sp === 'bright') R.brightT = 8;
    if (w.sp === 'ember') R.embers += Math.round(5 * st.emberMul);
    R.fedLamp++;
    EW.ev('feedLamp', { wood: w, v: add });
    return true;
  };

  EW.selectWood = function (i) {
    if (!R || i < 0 || i >= R.wood.length) return;
    R.sel = i;
    EW.ev('select', i);
  };

  // 움직임: 조이스틱·키보드·시험 훅이 모두 이 함수를 부른다
  EW.setMove = function (x, y) {
    if (!R) return;
    const len = Math.sqrt(x * x + y * y);
    if (len > 1) { x /= len; y /= len; }
    R.dx = x; R.dy = y;
    if (len > 0.15) R.goal = null;
  };

  // ---- 새벽·카드·유물 ----
  function weightedPick(pool, weightOf, count) {
    const out = [];
    const left = pool.slice();
    let guard = 0;
    while (out.length < count && left.length > 0 && guard < 60) {
      guard++;
      let sum = 0; left.forEach(function (x) { sum += weightOf(x); });
      let v = rnd('o') * sum;
      for (let i = 0; i < left.length; i++) {
        v -= weightOf(left[i]);
        if (v <= 0) { out.push(left[i]); left.splice(i, 1); break; }
      }
    }
    return out;
  }

  function offerCards() {
    const wt = { 1: 6, 2: 3, 3: 1 };
    return weightedPick(D.CARDS, function (c) { return wt[c.r] || 1; }, 3).map(function (c) { return c.id; });
  }

  function relicPool() {
    const unlocked = R.relicPool;
    return D.RELICS.filter(function (r) {
      if (R.relics.indexOf(r.id) >= 0) return false;
      return r.cost === 0 || (unlocked && unlocked.indexOf(r.id) >= 0);
    });
  }

  function dawn() {
    const st = R.st;
    const left = R.enemies;
    R.enemies = [];
    if (R.nightMinFuel < 5) R.flags.close = true;
    if (R.fuel >= 90) R.flags.full = true;
    R.fuel = Math.min(st.fuelMax, R.fuel + st.dawnFuel);
    R.hp = Math.min(st.maxHp, R.hp + st.dawnHeal);
    R.dawns = R.night;
    EW.ev('dawn', { night: R.night, enemies: left });
    if (R.night >= STAGE_MAX) { endRun(true, 'dawn'); return; }
    R.phase = 'cards';
    R.offer = offerCards();
    R.dx = 0; R.dy = 0; R.goal = null;
  }

  function nextNight() {
    R.st = buildStats(R);
    R.hp = Math.min(R.hp, R.st.maxHp);
    R.fuel = Math.min(R.fuel, R.st.fuelMax);
    R.oil = Math.min(R.oil, R.st.oilMax);
    while (R.wood.length > R.st.carry) R.wood.pop();
    startNight(R.night + 1);
    EW.ev('nextNight', R.night);
  }

  // 카드·유물 고르기 (보이는 버튼과 시험 훅이 같은 함수를 부른다)
  EW.pickOffer = function (i) {
    if (!R || (R.phase !== 'cards' && R.phase !== 'relic')) return false;
    const id = R.offer[i];
    if (!id) return false;
    if (R.phase === 'cards') {
      R.cards.push(id);
      EW.ev('card', id);
      if (R.night % 3 === 0) {
        const pool = relicPool();
        if (pool.length > 0) {
          R.phase = 'relic';
          R.offer = weightedPick(pool, function () { return 1; }, 3).map(function (r) { return r.id; });
          EW.ev('relicOffer');
          return true;
        }
      }
      nextNight();
    } else {
      R.relics.push(id);
      EW.ev('relic', id);
      nextNight();
    }
    return true;
  };

  function endRun(won, why) {
    R.phase = 'over'; R.won = won; R.endWhy = why;
    R.dx = 0; R.dy = 0;
    EW.ev('end', { won: won, why: why });
  }
  EW.giveUp = function () { if (R && R.phase !== 'over') endRun(false, 'quit'); };

  // ---- 한 걸음 계산 ----
  EW.update = function (dt) {
    if (!R || R.phase !== 'night') return;
    const st = R.st;
    const nt = D.NIGHTS[R.night - 1];
    const reg = D.REGIONS[R.region];
    R.t += dt; R.time += dt;
    if (R.brightT > 0) R.brightT -= dt;
    if (R.dampT > 0) R.dampT -= dt;
    if (R.mireT > 0) R.mireT -= dt;
    if (R.frostT > 0) R.frostT -= dt;
    if (R.hurtT > 0) R.hurtT -= dt;
    if (R.eatT > 0) R.eatT -= dt;

    // 불지기 움직임
    let vx = R.dx, vy = R.dy;
    if (R.goal === 'fire') {
      const d = dist(R.px, R.py, FX, FY);
      if (d <= throwRange()) { R.goal = null; doFeedFire(); vx = 0; vy = 0; }
      else { vx = (FX - R.px) / d; vy = (FY - R.py) / d; }
    }
    // 붙잡힘(늪 손에 닿아 있는 동안 0.35배)과 얼어붙음(닿은 뒤 1.5초 0.6배)은 따로 센다. 둘 다면 더 느린 쪽
    const sp = st.moveSpeed * Math.min(R.mireT > 0 ? 0.35 : 1, R.frostT > 0 ? 0.6 : 1);
    R.px = clamp(R.px + vx * sp * dt, 24, W - 24);
    R.py = clamp(R.py + vy * sp * dt, 24, H - 24);
    const dpf = dist(R.px, R.py, FX, FY);
    if (dpf < 38) { const a = Math.atan2(R.py - FY, R.px - FX) || 0.5; R.px = FX + Math.cos(a) * 38; R.py = FY + Math.sin(a) * 38; }

    // 장작 줍기
    for (let i = R.logs.length - 1; i >= 0; i--) {
      const l = R.logs[i];
      l.age += dt;
      if (R.wood.length < st.carry && dist(R.px, R.py, l.x, l.y) < st.pickR + 12) {
        R.wood.push(l.type);
        R.logs.splice(i, 1);
        R.flags.maxCarry = Math.max(R.flags.maxCarry, R.wood.length);
        EW.ev('pick', l);
      }
    }

    // 모닥불과 등불이 탄다
    R.fuel -= nt.burn * st.fireBurn * (R.dampT > 0 ? 0.5 : 1) * dt;
    // 얼어붙은 동안은 등불 기름이 1.8배로 닳는다
    R.oil = Math.max(0, R.oil - st.lampDrain * (R.frostT > 0 ? 1.8 : 1) * dt);
    const fr = fireR(), lr = lampR();
    if (dpf < fr) R.hp = Math.min(st.maxHp, R.hp + st.regen * dt);

    // 장작이 나온다
    R.logAcc += dt * st.logRate * reg.logMul;
    while (R.logAcc >= 2.0) { R.logAcc -= 2.0; spawnLog(rnd('w') < 0.4); }

    // 그림자가 온다 (새벽 4초 전부터는 더 오지 않는다)
    if (R.t < NIGHT_LEN - 4) {
      R.spawnAcc += dt;
      const every = nt.spawn * reg.spawnMul;
      let guard = 0;
      while (R.spawnAcc >= every && guard < 10) {
        guard++;
        R.spawnAcc -= every;
        if (R.enemies.length < MAX_ENEMIES) {
          spawnEnemy(pickEnemyId());
          if (R.night >= 6 && rnd('e') < 0.25) spawnEnemy(pickEnemyId());
        }
      }
    }
    if (!R.eliteDone && nt.elite && R.t > 8) { R.eliteDone = true; spawnEnemy(reg.boss, undefined, undefined, 0.45); }
    if (!R.eliteDone && nt.boss && R.t > 28) { R.eliteDone = true; spawnEnemy(reg.boss); }

    // 불티
    if (st.spark > 0) {
      R.sparkAcc += dt;
      if (R.sparkAcc >= 1.5) {
        R.sparkAcc = 0;
        let best = null, bd = 1e9;
        R.enemies.forEach(function (e) {
          const d = dist(e.x, e.y, FX, FY);
          if (d > fr && d < 560 && d < bd) { bd = d; best = e; }
        });
        if (best) { best.hp -= st.spark; best.hitT = 0.1; EW.ev('spark', { x: best.x, y: best.y, v: st.spark }); }
      }
    }

    // 그림자 움직임과 빛 피해
    const dimmers = R.enemies.filter(function (e) { return has(e, 'dim'); });
    const queue = [];
    const rageOn = st.rage > 0 && R.hp < st.maxHp * 0.35;
    for (let i = 0; i < R.enemies.length; i++) {
      const e = R.enemies[i];
      e.tm += dt; e.wob += dt;
      if (e.hitT > 0) e.hitT -= dt;
      const df = dist(e.x, e.y, FX, FY);
      const dp = dist(e.x, e.y, R.px, R.py);
      let tx = FX, ty = FY, toPlayer = false;
      if (e.flee) {
        const a = Math.atan2(e.y - FY, e.x - FX);
        tx = e.x + Math.cos(a) * 200; ty = e.y + Math.sin(a) * 200;
      } else if (e.b.tg === 'player' || (e.b.tg === 'mix' && dp < df)) {
        tx = R.px; ty = R.py; toPlayer = true;
      }
      const inFire = df < fr, inLamp = lr > 0 && dp < lr;

      let spdMul = 1;
      if (has(e, 'dash')) {
        if (e.tm > 3) { e.tm = 0; e.dashT = 0.6; }
        if (e.dashT > 0) { e.dashT -= dt; spdMul = 3; }
      }
      if (has(e, 'blink') && e.tm > 4) {
        e.tm = 0;
        if (!inFire && !inLamp) {
          const d0 = dist(e.x, e.y, tx, ty) || 1;
          const jump = Math.min(80, d0 * 0.5);
          e.x += (tx - e.x) / d0 * jump; e.y += (ty - e.y) / d0 * jump;
          EW.ev('blink', e);
        }
      }
      if (has(e, 'call') && e.tm > 6) {
        e.tm = 0;
        queue.push(['moth', e.x + 20, e.y]);
      }
      if (has(e, 'heal') && e.tm > 1) {
        e.tm = 0;
        R.enemies.forEach(function (o) {
          if (o !== e && o.hp > 0 && dist(o.x, o.y, e.x, e.y) < 120) o.hp = Math.min(o.maxHp, o.hp + 5);
        });
      }
      if (inFire || inLamp) spdMul *= (1 - st.lightSlow);

      const reach = toPlayer ? 16 + e.r : 30 + e.r;
      const dT = dist(e.x, e.y, tx, ty);
      if (e.flee || dT > reach) {
        const step = Math.min(dT, e.spd * spdMul * dt);
        if (dT > 0) { e.x += (tx - e.x) / dT * step; e.y += (ty - e.y) / dT * step; }
      }
      if (e.flee && (e.x < -60 || e.x > W + 60 || e.y < -60 || e.y > H + 60)) { e.gone = true; continue; }

      // 빛 피해
      let dmg = 0;
      if (inFire) dmg += st.fireDps * (has(e, 'armor') ? 0.4 : 1);
      if (inLamp) dmg += st.lampDps * (R.brightT > 0 ? 1.5 : 1) * (rageOn ? 1.5 : 1);
      if (dmg > 0 && dimmers.length) {
        for (let k = 0; k < dimmers.length; k++) {
          const m = dimmers[k];
          if (m !== e && dist(m.x, m.y, e.x, e.y) < 120) { dmg *= 0.5; break; }
        }
      }
      // 불지기에 닿음
      if (dp < 18 + e.r) {
        dmg += st.thorns;
        const hurt = e.b.dmg * (1 - st.armor) * dt;
        R.hp -= hurt;
        if (has(e, 'drink')) R.oil = Math.max(0, R.oil - 10 * dt);
        // 붙잡음: 닿아 있는 동안만 (떨어지면 0.25초 뒤 풀림)
        if (has(e, 'mire')) { if (R.mireT <= 0) EW.ev('mire', e); R.mireT = 0.25; }
        // 얼림: 닿는 순간 1.5초 얼고, 얼어 있는 동안 다시 닿아도 늘지 않는다
        if (has(e, 'frost') && R.frostT <= 0) { R.frostT = 1.5; EW.ev('frost', e); }
        if (R.hurtT <= 0) { R.hurtT = 0.45; EW.ev('hurt', { v: e.b.dmg * (1 - st.armor) * 0.45, x: R.px, y: R.py }); }
      }
      // 모닥불을 먹음
      if (!e.flee && df < 32 + e.r) {
        if (has(e, 'thief')) {
          const stolen = 8 * (1 - st.eatResist);
          R.fuel -= stolen; e.flee = true;
          EW.ev('steal', { v: stolen, e: e });
        } else {
          R.fuel -= e.b.eat * e.eatMul * (has(e, 'eat2') ? 2 : 1) * (1 - st.eatResist) * dt;
          if (R.eatT <= 0) { R.eatT = 0.6; EW.ev('eat', e); }
        }
      }
      if (dmg > 0) {
        e.hp -= dmg * dt;
        e.acc += dmg * dt;
        e.hitT = 0.08;
        e.numT -= dt;
        if (e.numT <= 0) { e.numT = 0.4; EW.ev('dmg', { x: e.x, y: e.y, v: e.acc }); e.acc = 0; }
      }
    }
    const dead = [];
    R.enemies = R.enemies.filter(function (e) {
      if (e.gone) { EW.ev('escape', e); return false; }
      if (e.hp <= 0) { dead.push(e); return false; }
      return true;
    });
    dead.forEach(kill);
    queue.forEach(function (q) { if (R.enemies.length < MAX_ENEMIES) spawnEnemy(q[0], q[1], q[2]); });

    R.nightMinFuel = Math.min(R.nightMinFuel, R.fuel);
    if (R.fuel < 20 && !R.lowWarned) { R.lowWarned = true; EW.ev('fireLow'); }
    if (R.fuel >= 30) R.lowWarned = false;

    // 끝나는 조건
    if (R.fuel <= 0) {
      if (st.revive > R.revived) { R.revived++; R.fuel = 30; EW.ev('revive'); }
      else { R.fuel = 0; endRun(false, 'fire'); return; }
    }
    if (R.hp <= 0) { R.hp = 0; endRun(false, 'hp'); return; }
    if (R.t >= NIGHT_LEN) dawn();
  };

  // ---- 시험 훅이 쓰는 목록 ----
  EW.actions = function () {
    if (!R) return [];
    if (R.phase === 'night') {
      const a = ['up', 'down', 'left', 'right', 'stop'];
      if (R.wood.length > 0) { a.push('fire'); a.push('lamp'); }
      return a;
    }
    if (R.phase === 'cards' || R.phase === 'relic') return R.offer.map(function (_, i) { return 'pick' + i; });
    return [];
  };

  EW.act = function (a) {
    if (!R) return;
    switch (a) {
      case 'up': EW.setMove(0, -1); break;
      case 'down': EW.setMove(0, 1); break;
      case 'left': EW.setMove(-1, 0); break;
      case 'right': EW.setMove(1, 0); break;
      case 'stop': EW.setMove(0, 0); break;
      case 'fire': EW.feedFire(); break;
      case 'lamp': EW.feedLamp(); break;
      default:
        if (typeof a === 'string' && a.indexOf('pick') === 0) EW.pickOffer(parseInt(a.slice(4), 10) || 0);
    }
  };

  EW.state = function () {
    if (!R) return { over: false, won: false, stage: 1, stageMax: STAGE_MAX, time: 0 };
    return { over: R.phase === 'over', won: R.won, stage: R.night, stageMax: STAGE_MAX, time: Math.round(R.time * 10) / 10 };
  };

  EW.score = function (run) {
    const r = run || R;
    if (!r) return 0;
    return r.dawns * 100 + r.kills * 2 + r.embers + (r.won ? 500 : 0);
  };
})();
