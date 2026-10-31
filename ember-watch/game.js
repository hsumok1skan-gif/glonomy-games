// Ember Watch — 게임 규칙 (화면 그리기·소리 없이 규칙만 계산한다. 시험 훅도 이 함수들을 그대로 부른다)
// 낮(90초)에 모으고 짓고, 밤에 빛을 지킨다. 낮과 밤은 끝없이 이어지고, 버틴 밤의 수가 기록이다.
(function () {
  'use strict';
  const D = window.EW_DATA;
  const EW = window.EW = window.EW || {};

  const W = 1600, H = 900, FX = 800, FY = 470;
  const DAY_LEN = 90;          // 낮 길이(초)
  const DUSK = 20;             // 낮이 끝나기 이만큼 전에 '곧 밤이 와요'
  const GOAL_DAY = 2;          // 첫 목표: 첫 새벽을 맞아 둘째 날에 닿는다 (state().won)
  const MAX_ENEMIES = 70, MAX_LOGS = 6, BAG = 8, STACK = 10, WOOD_STACK = 5, PILE_MAX = 6;
  const BUILD_R = 150;         // 모닥불에서 이 거리 안이면 '짓기'
  const START_FUEL = 40;       // 첫 모닥불 연료: 가만히 두면 첫째 밤(60초) 중간쯤 바닥난다
  const LAMP_MIN_T = 3.2;      // 등불 빛만으로는 보통 그림자가 이 초보다 빨리 쓰러지지 않는다
  const LAMP_LURE = 0.6;       // 빛 끌기: 등불 밝기 = 등불 연료 × 이 값 (모닥불·화톳불 밝기 = 그 연료)
  const LOG_SHARE = 0.7;       // 밤 하나에 드는 장작의 이만큼만 어둠 속에 떨어진다 (늘 모자라게)
  const RING = { brazier: 240, fence: 150, trap: 300 };
  const SLOTS = { brazier: 8, fence: 16, trap: 12 };
  const MAIN = { kind: 'main', x: FX, y: FY };
  EW.W = W; EW.H = H; EW.FX = FX; EW.FY = FY; EW.DAY_LEN = DAY_LEN; EW.DUSK = DUSK; EW.BAG = BAG;

  // 화면·소리 쪽에서 덮어쓴다 (시험 모드에서는 아무것도 하지 않는다)
  EW.ev = function () {};

  const BASE = {
    moveSpeed: 170, maxHp: 100, regen: 1.5, pickR: 28, reach: 56, gatherSpeed: 1,
    fireBurn: 1, fireRadius: 1, fireDps: 0, fuelMax: 100, woodFire: 1, brazierMax: 40,
    // 등불 미는 힘 30 은 빛 안 그림자 걸음(떠도는 그을음 31·기는 재 25 — 0.65배)과 비슷해 붙잡아 둘 뿐 멀리 쫓지 못한다
    lampDps: 9, lampPush: 30, lampDrain: 1, lampRadius: 1, oilMax: 60, woodLamp: 1,
    // 배고픔 100 이 0.41/초로 약 244초(낮 90 + 밤 60 + 낮 90 + 4초)에 바닥난다 — 먹지 않으면 이틀째 밤 들머리부터 체력이 준다
    darkDps: 3, hungerRate: 0.41, hungerMax: 100, foodMul: 1,
    lightSlow: 0.35, armor: 0, hitResist: 0, dropChance: 0.1, logRate: 1, emberMul: 1,
    dawnHeal: 10, oilOnKill: 0, fuelOnKill: 0, hpOnKill: 0, spark: 0, revive: 0, rage: 0,
    thorns: 0, feedBurst: 0, trapTime: 3, fenceStun: 1.5,
    startWood: 0, startFuel: 0
  };

  let R = null;
  EW.getRun = function () { return R; };

  function dist(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function has(e, s) { return e.sp.indexOf(s) >= 0; }

  // 날마다 밤이 5초씩 길어지고 그림자 수·체력이 는다
  function nightLen(d) { return 55 + 5 * d; }
  // 첫째 밤 여섯(네 쪽을 돌아가며), 둘째 밤 열하나, 그 뒤로 밤마다 셋씩
  function shadowCount(d) { return d === 1 ? 6 : 8 + 3 * (d - 1); }
  function hpMul(d) { return 1 + 0.06 * (d - 1); }
  // 밤 하나를 버티는 데 드는 장작 수(사람 지시: 6~8개에서 날마다 조금씩 는다). 어둠 속에는 그 70% 만 떨어진다
  function logNeed(d) { return 6 + Math.floor((d - 1) / 2); }
  function nightLogs(d, rate) { return Math.max(1, Math.round(logNeed(d) * LOG_SHARE * (rate || 1))); }
  EW.nightLen = nightLen; EW.shadowCount = shadowCount; EW.logNeed = logNeed; EW.nightLogs = nightLogs;

  // 장작은 차례로 열린다: 첫날 마른 가지, 셋째 날 참나무, 닷새째 송진, 이레째 젖은 장작
  function woodOpen(id) { const w = D.WOOD_MAP[id]; return !w || !R || R.day >= (w.day || 1); }
  function nodeOpen(n) { const nd = D.NODE_MAP[n.id]; return !nd || !nd.day || !R || R.day >= nd.day; }
  // 아직 열리지 않은 장작은 마른 가지로 나온다 (나무를 베면 이틀째까지는 마른 가지 둘)
  function openGives(gives) { return gives.map(function (g) { return [woodOpen(g[0]) ? g[0] : 'twig', g[1]]; }); }
  EW.woodOpen = woodOpen; EW.nodeOpen = nodeOpen;

  // ---- 무작위 ----
  // 보통 판(과 시험 훅)은 Math.random 을 그대로 쓴다. 오늘의 도전 판만 날짜 씨앗으로 정해지는 흐름 넷을 쓴다:
  // e 그림자, w 지도·장작, o 새벽 카드·유물, m 쓰러뜨림·부르기처럼 플레이에 따라 생기는 것.
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
  // 날짜(YYYY-MM-DD)로 오늘의 도전 판의 씨앗을 정한다. 같은 날이면 누구나 같은 숲이다
  EW.dailySetup = function (date) { return { date: date, seed: hashStr('ember-watch-daily-' + date) }; };

  function applyMods(st, mods, times) {
    const k = times || 1;
    (mods || []).forEach(function (m) {
      const key = m[0], op = m[1], v = m[2];
      if (!(key in st)) return;
      if (op === 'mul') st[key] *= Math.pow(v, k);
      else st[key] += v * k;
    });
  }

  // 등불·야영지·야영 준비·카드·유물·지은 것(등불 손질·모닥불 키우기)을 합쳐 이번 판 능력치를 만든다
  function buildStats(run) {
    const st = Object.assign({}, BASE);
    const lan = D.LANTERN_MAP[run.lantern];
    if (lan) applyMods(st, lan.m);
    const camp = D.CAMP_MAP[run.camp];
    if (camp) applyMods(st, camp.m);
    if (run.prep) {
      D.PREP.forEach(function (p) {
        const lv = run.prep[p.id] || 0;
        if (lv > 0) applyMods(st, p.m, lv);
      });
    }
    run.cards.forEach(function (id) { const c = D.CARD_MAP[id]; if (c) applyMods(st, c.m); });
    run.relics.forEach(function (id) { const c = D.RELIC_MAP[id]; if (c) applyMods(st, c.m); });
    st.fuelMax += 20 * run.fireLv;
    st.fireRadius *= Math.pow(1.15, run.fireLv);
    st.oilMax += 20 * run.lampLv;
    st.armor = Math.min(0.6, st.armor);
    st.hitResist = Math.min(0.7, st.hitResist);
    st.lightSlow = Math.min(0.7, st.lightSlow);
    st.dropChance = Math.min(0.6, st.dropChance);
    return st;
  }
  EW.buildStats = buildStats;

  // ---- 가방 (8칸, 한 칸에 같은 것 10개까지 — 장작은 5개까지라 낮에 쌓아 두기 어렵다) ----
  function stackOf(id) { return D.WOOD_MAP[id] ? WOOD_STACK : STACK; }
  function addTo(bag, id, n) {
    let left = n;
    const cap = stackOf(id);
    for (let i = 0; i < BAG && left > 0; i++) {
      const s = bag[i];
      if (s && s.id === id && s.n < cap) { const k = Math.min(left, cap - s.n); s.n += k; left -= k; }
    }
    for (let i = 0; i < BAG && left > 0; i++) {
      if (!bag[i]) { const k = Math.min(left, cap); bag[i] = { id: id, n: k }; left -= k; }
    }
    return n - left;
  }
  function addItem(id, n) { return addTo(R.bag, id, n); }
  // 여러 가지를 한꺼번에 다 넣을 수 있는지 (가방을 베껴 넣어 본다)
  function fits(gives) {
    const copy = R.bag.map(function (s) { return s ? { id: s.id, n: s.n } : null; });
    return gives.every(function (g) { return addTo(copy, g[0], g[1]) === g[1]; });
  }
  function countItem(id) {
    let n = 0;
    R.bag.forEach(function (s) { if (s && s.id === id) n += s.n; });
    return n;
  }
  function removeItem(id, n) {
    let left = n;
    for (let i = BAG - 1; i >= 0 && left > 0; i--) {
      const s = R.bag[i];
      if (s && s.id === id) { const k = Math.min(left, s.n); s.n -= k; left -= k; if (s.n <= 0) R.bag[i] = null; }
    }
    return n - left;
  }
  const DRY = ['twig', 'oak', 'pine'];
  function dryWood() { return countItem('twig') + countItem('oak') + countItem('pine'); }
  function hasAnyWood() { return dryWood() + countItem('wet') > 0; }
  // 짓는 데 쓰는 장작: 가벼운 것부터
  function payDry(n) {
    let left = n;
    DRY.forEach(function (id) { if (left > 0) left -= removeItem(id, left); });
  }
  EW.countItem = function (id) { return R ? countItem(id) : 0; };
  EW.dryWood = function () { return R ? dryWood() : 0; };

  // 넣을 장작: 고른 칸이 장작이면 그것, 아니면 마른 장작을 먼저, 젖은 장작은 마지막
  function pickWoodSlot() {
    const s = R.bag[R.sel];
    if (s && D.WOOD_MAP[s.id]) return R.sel;
    let wet = -1;
    for (let i = 0; i < BAG; i++) {
      const t = R.bag[i];
      if (!t || !D.WOOD_MAP[t.id]) continue;
      if (t.id === 'wet') { if (wet < 0) wet = i; continue; }
      return i;
    }
    return wet;
  }
  function takeWood() {
    const i = pickWoodSlot();
    if (i < 0) return null;
    const s = R.bag[i];
    const id = s.id;
    s.n--;
    if (s.n <= 0) R.bag[i] = null;
    return D.WOOD_MAP[id];
  }

  // ---- 지은 것 ----
  function getPile() { for (let i = 0; i < R.builds.length; i++) if (R.builds[i].kind === 'pile') return R.builds[i]; return null; }
  function countBuild(kind) { return R.builds.filter(function (b) { return b.kind === kind; }).length; }
  function braziers() { return R.builds.filter(function (b) { return b.kind === 'brazier'; }); }
  EW.getPile = function () { return R ? getPile() : null; };

  // ---- 빛 ----
  function fireR() { return R && R.fuel > 0 ? (60 + R.fuel * 1.6) * R.st.fireRadius : 0; }
  function brazierR(b) { return b.fuel > 0 ? 45 + b.fuel * 1.5 : 0; }
  function lampR() { return R && R.oil > 0 ? (40 + R.oil * 0.9) * R.st.lampRadius : 0; }
  EW.fireR = fireR; EW.brazierR = brazierR; EW.lampR = lampR;
  function inMain(x, y, pad) { return dist(x, y, FX, FY) <= fireR() + (pad || 0); }
  // 모닥불·켜진 화톳불 빛 안인가 (어둠이 체력을 갉지 않는 곳)
  function inLight(x, y, pad) {
    if (inMain(x, y, pad)) return true;
    const bs = braziers();
    for (let i = 0; i < bs.length; i++) if (bs[i].fuel > 0 && dist(x, y, bs[i].x, bs[i].y) <= brazierR(bs[i]) + (pad || 0)) return true;
    return false;
  }
  EW.inLight = function (x, y) { return R ? inLight(x, y, 0) : false; };
  // 등불이 밝히고 있나: 밤에 등불 연료가 남아 있으면 켜져 있다 (등불 연료는 불빛 밖에 있을 때만 닳는다)
  function lampOn() { return R.phase === 'night' && R.oil > 0; }
  EW.lampOn = function () { return R ? lampOn() : false; };

  // ---- 지도 (자원) ----
  function makeNodes() {
    const out = [];
    const camp = D.CAMP_MAP[R.camp] || D.CAMPS[0];
    camp.plan.forEach(function (p) {
      const nd = D.NODE_MAP[p[0]];
      for (let i = 0; i < p[1]; i++) {
        let x = 0, y = 0, ok = false;
        for (let g = 0; g < 30 && !ok; g++) {
          x = 50 + rnd('w') * (W - 100); y = 70 + rnd('w') * (H - 120);
          const d = dist(x, y, FX, FY);
          ok = d >= nd.dMin && d <= nd.dMax && out.every(function (o) { return dist(o.x, o.y, x, y) > 46; });
        }
        if (ok) out.push({ id: nd.id, x: x, y: y, alive: true, prog: 0, regrow: 0, v: rnd('w') });
      }
    });
    return out;
  }

  // ---- 판 만들기 ----
  EW.newRun = function (o) {
    o = o || {};
    R = {
      lantern: D.LANTERN_MAP[o.lantern] ? o.lantern : 'tin', camp: D.CAMP_MAP[o.camp] ? o.camp : 'pine',
      prep: o.prep || null, relicPool: o.relicPool || null,
      daily: o.daily || null, rng: o.daily ? makeStreams(o.seed) : null, dayRng: null,
      cards: [], relics: [], day: 1, dawns: 0, phase: 'day', prev: 'day', t: 0, time: 0, nightLen: nightLen(1),
      fuel: 0, hp: 0, oil: 0, hunger: 0, bag: [], sel: 0, builds: [], fireLv: 0, lampLv: 0,
      nodes: [], logs: [], enemies: [], plan: [], bossAt: -1, offer: [],
      px: FX, py: FY + 90, dx: 0, dy: 0, goal: null, gather: false, gNode: null,
      mireT: 0, frostT: 0, hurtT: 0, dampT: 0, roastT: 0, fireHitT: 0,
      logPlan: [], sparkAcc: 0, kills: 0, bossKills: 0, embers: 0, fedFire: 0, fedLamp: 0,
      gathered: 0, trees: 0, built: 0, eaten: 0, trapped: 0, revived: 0, reviveDay: 0, adWoodDay: 0,
      downWhy: '', downFrom: 'day', nightMinFuel: 100, lowWarned: false, duskWarned: false, nightPicked: 0,
      endWhy: '', won: false,
      flags: { close: false, fences: 0, pileFull: false }
    };
    for (let i = 0; i < BAG; i++) R.bag.push(null);
    R.st = buildStats(R);
    R.fuel = Math.min(R.st.fuelMax, START_FUEL + R.st.startFuel);
    R.hp = R.st.maxHp;
    R.oil = R.st.oilMax;
    R.hunger = R.st.hungerMax;
    // 누구나 마른 가지 하나로 시작한다 (야영 준비 '챙겨 온 장작'이 있으면 더).
    // 시작 연료 40 + 가지 15 = 55 < 첫째 밤 60 — 어둠 속 장작을 주워 오지 않으면 첫째 밤을 못 넘긴다
    addItem('twig', 1 + Math.round(R.st.startWood));
    R.nodes = makeNodes();
    beginDay(true);
    return R;
  };

  // 저장한 판 불러오기 (낮이 시작될 때 저장한다)
  EW.loadRun = function (s) {
    if (!s || s.v !== 3) throw new Error('예전 저장');
    EW.newRun({ lantern: s.lantern, camp: s.camp, prep: s.prep, relicPool: s.relicPool, daily: s.daily || null, seed: 0 });
    R.cards = (s.cards || []).filter(function (id) { return !!D.CARD_MAP[id]; });
    R.relics = (s.relics || []).filter(function (id) { return !!D.RELIC_MAP[id]; });
    R.fireLv = clamp(s.fireLv || 0, 0, 3); R.lampLv = clamp(s.lampLv || 0, 0, 3);
    R.st = buildStats(R);
    R.day = Math.max(1, s.day || 1); R.dawns = Math.max(0, s.dawns || 0);
    R.fuel = clamp(s.fuel || 30, 1, R.st.fuelMax);
    R.hp = clamp(s.hp || R.st.maxHp, 1, R.st.maxHp);
    R.hunger = clamp(s.hunger === undefined ? R.st.hungerMax : s.hunger, 0, R.st.hungerMax);
    R.bag = []; for (let i = 0; i < BAG; i++) {
      const b = s.bag && s.bag[i];
      R.bag.push(b && D.ITEM_MAP[b.id] ? { id: b.id, n: clamp(b.n || 1, 1, stackOf(b.id)) } : null);
    }
    R.builds = (s.builds || []).filter(function (b) { return b && D.BUILD_MAP[b.kind]; }).map(function (b) {
      const c = Object.assign({}, b);
      if (b.kind === 'pile') c.wood = (b.wood || []).filter(function (w) { return !!D.WOOD_MAP[w]; }).slice(0, PILE_MAX);
      return c;
    });
    if (s.nodes && s.nodes.length) {
      R.nodes = s.nodes.filter(function (n) { return n && D.NODE_MAP[n.id]; }).map(function (n) {
        return { id: n.id, x: n.x, y: n.y, alive: !!n.alive, prog: n.prog || 0, regrow: n.regrow || 0, v: n.v || 0 };
      });
    }
    ['kills', 'bossKills', 'embers', 'fedFire', 'fedLamp', 'gathered', 'trees', 'built', 'eaten', 'trapped', 'time', 'revived'].forEach(function (k) { R[k] = s[k] || 0; });
    if (s.flags) R.flags = Object.assign(R.flags, s.flags);
    // 오늘의 도전은 그 날이 시작될 때의 무작위 흐름으로 되돌려 같은 날을 다시 연다
    if (R.daily && s.rng) R.rng = Object.assign({}, s.rng);
    beginDay(true);
    return R;
  };

  EW.snapshot = function () {
    if (!R || R.phase === 'over') return null;
    return {
      v: 3, lantern: R.lantern, camp: R.camp, prep: R.prep, relicPool: R.relicPool, daily: R.daily,
      rng: R.dayRng ? Object.assign({}, R.dayRng) : null,
      cards: R.cards.slice(), relics: R.relics.slice(), day: R.day, dawns: R.dawns,
      fuel: R.fuel, hp: R.hp, hunger: R.hunger, fireLv: R.fireLv, lampLv: R.lampLv,
      bag: R.bag.map(function (b) { return b ? { id: b.id, n: b.n } : null; }),
      builds: R.builds.map(function (b) { const c = Object.assign({}, b); if (b.wood) c.wood = b.wood.slice(); return c; }),
      nodes: R.nodes.map(function (n) { return { id: n.id, x: Math.round(n.x), y: Math.round(n.y), alive: n.alive, prog: n.prog, regrow: n.regrow, v: n.v }; }),
      kills: R.kills, bossKills: R.bossKills, embers: R.embers, fedFire: R.fedFire, fedLamp: R.fedLamp,
      gathered: R.gathered, trees: R.trees, built: R.built, eaten: R.eaten, trapped: R.trapped,
      time: R.time, revived: R.revived, flags: Object.assign({}, R.flags)
    };
  };

  // ---- 낮 ----
  // 낮이 시작되면: 등불 연료가 다 차고, 덫이 다시 놓이고, 장작 더미의 젖은 장작이 마르고, 벤 자원이 다시 난다
  function beginDay(skipAd) {
    R.t = 0; R.duskWarned = false; R.dampT = 0; R.goal = null;
    R.enemies = [];
    R.logs = R.logs.filter(function (l) { return !l.night; });
    R.oil = R.st.oilMax;
    R.builds.forEach(function (b) {
      if (b.kind === 'trap') b.armed = true;
      if (b.kind === 'pile') b.wood = b.wood.map(function (w) { return w === 'wet' ? 'oak' : w; });
    });
    R.nodes.forEach(function (n) { if (!n.alive && n.regrow <= R.dawns) { n.alive = true; n.prog = 0; } });
    R.dayRng = R.rng ? Object.assign({}, R.rng) : null;
    // 전면 광고는 사흘마다 낮이 시작될 때 한 번 (밤 도중에는 띄우지 않는다)
    if (!skipAd && R.day % 3 === 0) { R.phase = 'ad'; R.dx = 0; R.dy = 0; R.gather = false; EW.ev('adShow'); return; }
    R.phase = 'day';
    EW.ev('day', R.day);
  }
  EW.closeAd = function () {
    if (!R || R.phase !== 'ad') return false;
    R.phase = 'day';
    EW.ev('day', R.day);
    return true;
  };

  // ---- 밤 ----
  // 판 가장자리 한 쪽(0 위, 1 아래, 2 왼쪽, 3 오른쪽)의 u(0~1) 자리
  function sideSpot(side, u) {
    if (side === 0) return { x: u * W, y: -24 };
    if (side === 1) return { x: u * W, y: H + 24 };
    if (side === 2) return { x: -24, y: u * H };
    return { x: W + 24, y: u * H };
  }
  // 그림자가 나올 때와 자리를 미리 정한다.
  // 첫째·둘째 밤: 네 쪽을 돌아가며 하나씩 — 첫째 밤부터 사방에서 온다.
  // 셋째 밤부터: 두 쪽에서 같은 때에 무리 지어 몰려오는 물결.
  function planShadows() {
    const n = shadowCount(R.day);
    const span = Math.max(10, R.nightLen - 17);
    const plan = [];
    if (R.day < 3) {
      const off = Math.floor(rnd('e') * 4);
      for (let i = 0; i < n; i++) plan.push({ t: 2 + rnd('e') * span, side: (off + i) % 4, u: 0.1 + rnd('e') * 0.8 });
    } else {
      const per = 2 + Math.floor((R.day - 3) / 3);   // 물결 하나에 한 쪽마다 몇
      let left = n, guard = 0;
      while (left > 0 && guard < 40) {
        guard++;
        const t = 2 + rnd('e') * span;
        const a = Math.floor(rnd('e') * 4);
        const b = (a + 1 + Math.floor(rnd('e') * 3)) % 4;
        const ua = 0.15 + rnd('e') * 0.7, ub = 0.15 + rnd('e') * 0.7;
        for (let k = 0; k < per && left > 0; k++) {
          plan.push({ t: t + k * 0.5, side: a, u: clamp(ua + (rnd('e') - 0.5) * 0.12, 0.05, 0.95), wave: k === 0 ? [a, b] : null });
          left--;
          if (left > 0) { plan.push({ t: t + k * 0.5, side: b, u: clamp(ub + (rnd('e') - 0.5) * 0.12, 0.05, 0.95) }); left--; }
        }
      }
    }
    plan.sort(function (p, q) { return p.t - q.t; });
    return plan;
  }

  function startNight() {
    R.phase = 'night'; R.t = 0; R.nightLen = nightLen(R.day);
    R.plan = planShadows();
    R.bossAt = R.day % 5 === 0 ? R.nightLen * 0.35 : -1;
    // 어둠 속 장작은 밤에 드는 양의 70% 만, 밤 동안 흩어져 떨어진다
    R.logPlan = [];
    const nl = nightLogs(R.day, R.st.logRate);
    for (let i = 0; i < nl; i++) R.logPlan.push(i === 0 ? 1 : rnd('w') * Math.max(10, R.nightLen - 10));
    R.logPlan.sort(function (a, b) { return a - b; });
    R.sparkAcc = 0; R.nightMinFuel = R.fuel; R.lowWarned = false; R.nightPicked = 0;
    EW.ev('night', R.day);
  }

  // 장작은 빛 밖 어둠 속에만 떨어진다. 깊은 어둠(모닥불에서 480 넘게)일수록 송진 장작이 많다 (열린 장작만)
  function spawnNightLog() {
    if (R.logs.length >= MAX_LOGS) return;
    const fr = fireR();
    for (let g = 0; g < 10; g++) {
      const a = rnd('w') * Math.PI * 2;
      const d = fr + 60 + rnd('w') * Math.max(60, 640 - fr);
      const x = FX + Math.cos(a) * d, y = FY + Math.sin(a) * d;
      if (x < 40 || x > W - 40 || y < 60 || y > H - 40) continue;
      if (inLight(x, y, 40)) continue;
      const r = rnd('w');
      let type = 'twig';
      if (d > 480 && r < 0.5 && woodOpen('pine')) type = 'pine';
      else if (r < 0.14 && woodOpen('wet')) type = 'wet';
      else if (r < 0.35 && woodOpen('oak')) type = 'oak';
      R.logs.push({ x: x, y: y, type: type, rot: rnd('w') * 3.14, age: 0, night: true });
      return;
    }
  }

  // ---- 그림자 ----
  function spawnEnemy(id, x, y, scale) {
    const b = D.ENEMY_MAP[id];
    if (!b) return null;
    let ex = x, ey = y;
    const k = x === undefined ? 'e' : 'm';
    if (ex === undefined) {
      const side = Math.floor(rnd(k) * 4);
      if (side === 0) { ex = rnd(k) * W; ey = -24; }
      else if (side === 1) { ex = rnd(k) * W; ey = H + 24; }
      else if (side === 2) { ex = -24; ey = rnd(k) * H; }
      else { ex = W + 24; ey = rnd(k) * H; }
    }
    const hp = b.hp * hpMul(R.day) * (scale || 1);
    const e = {
      id: id, b: b, x: ex, y: ey, hp: hp, maxHp: hp, r: b.r,
      spd: b.spd * (0.9 + rnd(k) * 0.2), sp: b.sp || [],
      tm: rnd(k) * 2, dashT: 0, flee: false, acc: 0, numT: 0, hitT: 0, heldT: 0, stunT: 0,
      boss: !!b.boss, wob: rnd(k) * 6
    };
    R.enemies.push(e);
    EW.ev('spawn', e);
    return e;
  }
  function pickEnemyId() {
    const list = D.SPAWN_ORDER;
    const n = Math.min(list.length, 2 + R.day);
    return list[Math.floor(rnd('e') * n)];
  }
  // 가장 가까운 켜진 불 (모닥불·화톳불)
  function nearestFire(x, y) {
    let best = null, bd = 1e9;
    if (R.fuel > 0) { bd = dist(x, y, FX, FY); best = MAIN; }
    braziers().forEach(function (b) {
      if (b.fuel <= 0) return;
      const d = dist(x, y, b.x, b.y);
      if (d < bd) { bd = d; best = b; }
    });
    return best;
  }
  // 빛 끌기 (차별점): 그림자는 가장 '끌리는' 빛을 노린다. 끌림 = 밝기 ÷ 거리(60 아래는 60).
  // 장작을 등불에 넣으면 등불이 밝아져 그림자가 불 대신 불지기에게 온다(미끼) — 모닥불은 덜 깎이지만 불지기가 맞는다.
  // 모닥불 빛 안에서는 등불 빛이 묻혀 끌지 못한다. 큰 그림자는 끌리지 않는다
  function firePull(e, f) {
    if (!f) return 0;
    return (f === MAIN ? R.fuel : f.fuel) / Math.max(60, dist(e.x, e.y, f.x, f.y));
  }
  function lampPull(e) {
    if (e.boss || !lampOn() || inMain(R.px, R.py, 0)) return 0;
    return R.oil * LAMP_LURE / Math.max(60, dist(e.x, e.y, R.px, R.py));
  }

  function kill(e) {
    const st = R.st;
    R.kills++;
    R.embers += Math.round(e.b.ember * st.emberMul);
    // 쓰러진 그림자가 떨어뜨리는 장작도 빛 안에는 떨어지지 않는다
    if (rnd('m') < st.dropChance && !inLight(e.x, e.y, 0) && R.logs.length < MAX_LOGS + 4) {
      R.logs.push({ x: clamp(e.x, 40, W - 40), y: clamp(e.y, 60, H - 40), type: 'twig', rot: rnd('m') * 3.14, age: 0, night: true });
    }
    if (e.boss) {
      R.bossKills++;
      for (let i = 0; i < 3; i++) {
        const lx = clamp(e.x + (i - 1) * 30, 40, W - 40), ly = clamp(e.y + 20, 60, H - 40);
        if (!inLight(lx, ly, 0)) R.logs.push({ x: lx, y: ly, type: 'pine', rot: rnd('m') * 3.14, age: 0, night: true });
      }
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

  // 모닥불 빛 안 모든 그림자에게 한 번에 피해 (송진 장작, 불꽃 터뜨리기)
  function fireBurst(amount) {
    const fr = fireR();
    R.enemies.forEach(function (e) {
      if (!e.boss && dist(e.x, e.y, FX, FY) < fr) { e.hp -= amount; e.hitT = 0.12; EW.ev('dmg', { x: e.x, y: e.y, v: amount, big: true }); }
    });
    EW.ev('burst', amount);
  }

  // ---- 불에 넣기 (한 버튼: 가까운 불 → 밤에 빛 밖이면 등불 → 아니면 모닥불까지 걸어가서) ----
  function active() { return !!R && (R.phase === 'day' || R.phase === 'night'); }
  function throwMain() { return Math.max(70, fireR() * 0.7); }
  function nearMain() { return dist(R.px, R.py, FX, FY) <= throwMain(); }
  function mainRoom() { return R.fuel <= R.st.fuelMax - 8; }
  function nearBrazierNeeding() {
    let best = null, bd = 1e9;
    braziers().forEach(function (b) {
      if (b.fuel > R.st.brazierMax - 8) return;
      const d = dist(R.px, R.py, b.x, b.y);
      if (d <= Math.max(60, brazierR(b) * 0.9 + 20) && d < bd) { bd = d; best = b; }
    });
    return best;
  }
  function lampRoom() { return R.phase === 'night' && R.oil <= R.st.oilMax - 8; }
  function pileCount() { const p = getPile(); return p ? p.wood.length : 0; }

  // 지금 누르면 어디로 가나: 'fire' 모닥불, 'brazier' 화톳불, 'lamp' 등불, 'walk' 모닥불까지 걸어감, null 못 넣음
  EW.feedTarget = function () {
    if (!active()) return null;
    const wood = hasAnyWood();
    const nm = nearMain();
    if (nm && mainRoom() && (wood || pileCount() > 0)) return 'fire';
    if (!wood) return null;
    if (nearBrazierNeeding()) return 'brazier';
    if (!nm && lampRoom()) return 'lamp';
    if (nm && lampRoom()) return 'lamp';
    if (!nm && mainRoom()) return 'walk';
    return null;
  };
  EW.canFeed = function () { return EW.feedTarget() !== null; };

  function feedMain() {
    let w = takeWood();
    if (!w) {
      const p = getPile();
      if (!p || !p.wood.length) return false;
      w = D.WOOD_MAP[p.wood.pop()];
      EW.ev('pileTake', p);
    }
    const st = R.st;
    const add = w.fire * st.woodFire;
    R.fuel = Math.min(st.fuelMax, R.fuel + add);
    if (w.sp === 'damp') R.dampT = 10;
    R.fedFire++;
    EW.ev('feedFire', { wood: w, v: add, x: FX, y: FY });
    if (w.sp === 'flash') fireBurst(20);
    if (st.feedBurst > 0) fireBurst(st.feedBurst);
    return true;
  }
  function feedBrazier(b) {
    const w = takeWood();
    if (!w) return false;
    const was = b.fuel;
    b.fuel = Math.min(R.st.brazierMax, b.fuel + w.fire * R.st.woodFire);
    R.fedFire++;
    EW.ev('feedFire', { wood: w, v: b.fuel - was, x: b.x, y: b.y, brazier: true, relit: was <= 0 });
    return true;
  }
  function feedLamp() {
    const w = takeWood();
    if (!w) return false;
    const add = w.lamp * R.st.woodLamp;
    R.oil = Math.min(R.st.oilMax, R.oil + add);
    R.fedLamp++;
    EW.ev('feedLamp', { wood: w, v: add });
    return true;
  }
  EW.feed = function () {
    const t = EW.feedTarget();
    if (t === 'fire') return feedMain();
    if (t === 'brazier') return feedBrazier(nearBrazierNeeding());
    if (t === 'lamp') return feedLamp();
    if (t === 'walk') { R.goal = 'fire'; R.gather = false; EW.ev('goal', 'fire'); return true; }
    return false;
  };

  // ---- 줍기/모으기 (누르고 있는 동안 모은다) ----
  function nearestLog(r) {
    let best = null, bd = r;
    R.logs.forEach(function (l) { const d = dist(R.px, R.py, l.x, l.y); if (d <= bd) { bd = d; best = l; } });
    return best;
  }
  function gatherNode() {
    let best = null, bd = R.st.reach;
    R.nodes.forEach(function (n) {
      if (!n.alive || !nodeOpen(n)) return;
      const d = dist(R.px, R.py, n.x, n.y);
      if (d <= bd) { bd = d; best = n; }
    });
    return best;
  }
  function pickLog(l) {
    if (addItem(l.type, 1) < 1) { EW.ev('bagFull'); return false; }
    R.logs.splice(R.logs.indexOf(l), 1);
    if (R.phase === 'night') R.nightPicked++;
    EW.ev('pick', l);
    return true;
  }
  function pileSpot() {
    const p = getPile();
    return p && dist(R.px, R.py, p.x, p.y) <= 70 ? p : null;
  }
  // 장작 더미 곁이면 든 장작을 쌓는다 (젖은 장작부터 — 하루 두면 마른다)
  function depositPile(p) {
    let moved = 0;
    ['wet', 'twig', 'oak', 'pine'].forEach(function (id) {
      while (p.wood.length < PILE_MAX && countItem(id) > 0) { removeItem(id, 1); p.wood.push(id); moved++; }
    });
    if (p.wood.length >= PILE_MAX) R.flags.pileFull = true;
    EW.ev('pileAdd', { n: moved, p: p });
    return moved > 0;
  }
  EW.canGather = function () {
    if (!active()) return false;
    if (nearestLog(R.st.reach)) return true;
    const p = pileSpot();
    if (p && p.wood.length < PILE_MAX && hasAnyWood()) return true;
    return !!gatherNode();
  };
  EW.gatherPress = function () {
    if (!active()) return false;
    R.goal = null;
    const l = nearestLog(R.st.reach);
    if (l) { pickLog(l); R.gather = true; return true; }
    const p = pileSpot();
    if (p && p.wood.length < PILE_MAX && hasAnyWood() && !gatherNode()) return depositPile(p);
    if (p && p.wood.length < PILE_MAX && hasAnyWood()) depositPile(p);
    R.gather = true;
    return true;
  };
  EW.gatherRelease = function () { if (R) R.gather = false; };

  function gatherStep(dt) {
    const n = gatherNode();
    R.gNode = n;
    if (!n) return;
    const nd = D.NODE_MAP[n.id];
    n.prog = Math.min(nd.time, n.prog + dt * R.st.gatherSpeed);
    if (n.prog < nd.time) return;
    const gives = openGives(nd.gives);
    if (!fits(gives)) { R.gather = false; EW.ev('bagFull'); return; }
    gives.forEach(function (g) { addItem(g[0], g[1]); });
    n.alive = false; n.prog = 0; n.regrow = R.dawns + nd.regrow;
    R.gathered++;
    if (n.id === 'tree' || n.id === 'pinetree') R.trees++;
    R.gNode = null;
    EW.ev('gather', { node: n, nd: nd, gives: gives });
  }

  // ---- 먹기·가방 칸 ----
  function firstFood() {
    for (let i = 0; i < BAG; i++) { const s = R.bag[i]; if (s && D.ITEM_MAP[s.id].food) return i; }
    return -1;
  }
  EW.canEat = function () { return active() && firstFood() >= 0 && R.hunger < R.st.hungerMax - 5; };
  // 칸 누르기: 먹을 것은 먹고, 장작은 먼저 넣을 장작으로 고른다
  EW.useSlot = function (i) {
    if (!R || i < 0 || i >= BAG) return false;
    const s = R.bag[i];
    if (!s) return false;
    const it = D.ITEM_MAP[s.id];
    if (it.food) {
      if (!active()) return false;
      if (R.hunger >= R.st.hungerMax - 5) { EW.ev('full'); return false; }
      R.hunger = Math.min(R.st.hungerMax, R.hunger + it.food * R.st.foodMul);
      if (it.hp) R.hp = Math.min(R.st.maxHp, R.hp + it.hp);
      s.n--; if (s.n <= 0) R.bag[i] = null;
      R.eaten++;
      EW.ev('eat', it);
      return true;
    }
    if (it.raw) { EW.ev('raw'); return false; }
    R.sel = i;
    EW.ev('select', i);
    return true;
  };
  EW.eat = function () { const i = firstFood(); return i >= 0 ? EW.useSlot(i) : false; };

  // ---- 광고 보상 (광고 SDK 는 출시 때 붙인다. 지금은 화면의 광고 자리만 있다) ----
  EW.canAdWood = function () { return !!R && R.phase === 'day' && R.day >= 2 && R.adWoodDay !== R.day; };
  EW.adWood = function () {
    if (!EW.canAdWood()) return false;
    R.adWoodDay = R.day;
    const got = addItem('twig', 3);
    // 가방에 못 넣은 것은 발밑에 둔다
    for (let i = got; i < 3; i++) R.logs.push({ x: clamp(R.px + (i - 1) * 24, 40, W - 40), y: clamp(R.py + 26, 60, H - 40), type: 'twig', rot: i, age: 0, night: false });
    EW.ev('adWood', got);
    return true;
  };

  // ---- 짓기 ----
  EW.canBuildHere = function () { return active() && dist(R.px, R.py, FX, FY) <= BUILD_R; };
  EW.openBuild = function () {
    if (!EW.canBuildHere()) return false;
    R.prev = R.phase; R.phase = 'build';
    R.dx = 0; R.dy = 0; R.gather = false; R.goal = null;
    EW.ev('buildOpen');
    return true;
  };
  EW.closeBuild = function () {
    if (!R || R.phase !== 'build') return false;
    R.phase = R.prev;
    EW.ev('buildClose');
    return true;
  };
  function builtCount(id) {
    if (id === 'lamp') return R.lampLv;
    if (id === 'fireup') return R.fireLv;
    return countBuild(id);
  }
  function ringSpot(kind) {
    const n = SLOTS[kind], r = RING[kind];
    const pa = Math.atan2(R.py - FY, R.px - FX);
    const off = kind === 'fence' ? 0 : Math.PI / n;
    let best = -1, bd = 1e9;
    for (let i = 0; i < n; i++) {
      if (R.builds.some(function (b) { return b.kind === kind && b.slot === i; })) continue;
      const a = i / n * Math.PI * 2 + off;
      const da = Math.abs(((a - pa) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
      if (da < bd) { bd = da; best = i; }
    }
    if (best < 0) return null;
    const a = best / n * Math.PI * 2 + off;
    return { slot: best, a: a, x: FX + Math.cos(a) * r, y: clamp(FY + Math.sin(a) * r, 70, H - 40) };
  }
  // 지을 수 있나: { ok, why, n, max }
  EW.buildInfo = function (id) {
    const b = D.BUILD_MAP[id];
    if (!R || !b) return { ok: false, why: '', n: 0, max: 0 };
    const n = builtCount(id);
    const out = { ok: false, why: '', n: n, max: b.max };
    if (n >= b.max) { out.why = '다 지음'; return out; }
    const c = b.cost;
    if ((c.stone || 0) > countItem('stone')) { out.why = '돌 모자람'; return out; }
    if ((c.grass || 0) > countItem('grass')) { out.why = '풀 모자람'; return out; }
    if ((c.wood || 0) > dryWood()) { out.why = '마른 장작 모자람'; return out; }
    if (SLOTS[id] && !ringSpot(id)) { out.why = '자리 없음'; return out; }
    out.ok = true;
    return out;
  };
  EW.build = function (id) {
    if (!R || R.phase !== 'build') return false;
    const info = EW.buildInfo(id);
    if (!info.ok) return false;
    const b = D.BUILD_MAP[id], c = b.cost;
    if (c.stone) removeItem('stone', c.stone);
    if (c.grass) removeItem('grass', c.grass);
    if (c.wood) payDry(c.wood);
    let obj = null;
    if (id === 'lamp') { R.lampLv++; R.st = buildStats(R); R.oil = Math.min(R.st.oilMax, R.oil + 20); }
    else if (id === 'fireup') { R.fireLv++; R.st = buildStats(R); }
    else if (id === 'pile') { obj = { kind: 'pile', x: FX + 78, y: FY + 34, wood: [] }; }
    else {
      const sp = ringSpot(id);
      obj = { kind: id, slot: sp.slot, a: sp.a, x: sp.x, y: sp.y };
      if (id === 'brazier') obj.fuel = 30;
      if (id === 'trap') obj.armed = true;
      if (id === 'fence') R.flags.fences++;
    }
    if (obj) R.builds.push(obj);
    R.built++;
    EW.ev('built', { id: id, obj: obj });
    return true;
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
    const left = R.enemies;
    R.enemies = [];
    if (R.nightMinFuel < 5) R.flags.close = true;
    // 큰 그림자가 온 밤을 버텼다 (큰 그림자는 쓰러지지 않고 새벽에 물러간다)
    if (left.some(function (e) { return e.boss; })) R.bossKills++;
    R.dawns++;
    R.day++;
    R.hp = Math.min(R.st.maxHp, R.hp + R.st.dawnHeal);
    R.dx = 0; R.dy = 0; R.goal = null;
    EW.ev('dawn', { dawns: R.dawns, enemies: left });
    // 새벽 강화 카드는 사흘마다 한 번
    if (R.dawns % 3 === 0) {
      R.phase = 'cards'; R.gather = false;
      R.offer = offerCards();
      return;
    }
    beginDay(false);
  }

  // 카드·유물 고르기 (보이는 버튼과 시험 훅이 같은 함수를 부른다)
  EW.pickOffer = function (i) {
    if (!R || (R.phase !== 'cards' && R.phase !== 'relic')) return false;
    const id = R.offer[i];
    if (!id) return false;
    if (R.phase === 'cards') {
      R.cards.push(id);
      R.st = buildStats(R);
      EW.ev('card', id);
      if (R.dawns % 6 === 0) {
        const pool = relicPool();
        if (pool.length > 0) {
          R.phase = 'relic';
          R.offer = weightedPick(pool, function () { return 1; }, 3).map(function (r) { return r.id; });
          EW.ev('relicOffer');
          return true;
        }
      }
    } else {
      R.relics.push(id);
      R.st = buildStats(R);
      EW.ev('relic', id);
    }
    R.hp = Math.min(R.hp, R.st.maxHp);
    R.fuel = Math.min(R.fuel, R.st.fuelMax);
    beginDay(false);
    return true;
  };

  // ---- 쓰러짐·다시 일어나기·끝 ----
  function down(why) {
    if (R.reviveDay !== R.day) {
      R.downFrom = R.phase; R.downWhy = why; R.phase = 'down';
      R.dx = 0; R.dy = 0; R.gather = false; R.goal = null;
      EW.ev('down', why);
      return;
    }
    endRun(why);
  }
  // 광고 보고 다시 일어나기: 하루 한 번, 체력 절반·모닥불 연료 절반으로
  EW.revive = function () {
    if (!R || R.phase !== 'down') return false;
    R.reviveDay = R.day;
    R.hp = Math.max(R.hp, R.st.maxHp / 2);
    R.fuel = Math.max(R.fuel, R.st.fuelMax / 2);
    R.enemies.forEach(function (e) {
      const d = dist(e.x, e.y, FX, FY);
      if (d < fireR() + 60) { const a = Math.atan2(e.y - FY, e.x - FX); e.x = FX + Math.cos(a) * (d + 160); e.y = FY + Math.sin(a) * (d + 160); e.stunT = 1; }
    });
    R.phase = R.downFrom === 'night' ? 'night' : 'day';
    EW.ev('revive');
    return true;
  };
  EW.endDown = function () { if (R && R.phase === 'down') endRun(R.downWhy || 'fire'); };

  function endRun(why) {
    R.endPhase = R.phase === 'down' ? R.downFrom : (R.phase === 'build' ? R.prev : R.phase);
    R.phase = 'over'; R.won = R.dawns >= 1; R.endWhy = why;
    R.dx = 0; R.dy = 0; R.gather = false;
    EW.ev('end', { won: R.won, why: why });
  }
  EW.giveUp = function () { if (R && R.phase !== 'over') endRun('quit'); };

  // 움직임: 조이스틱·키보드·시험 훅이 모두 이 함수를 부른다. 움직이면 모으기와 걸어가기를 멈춘다
  EW.setMove = function (x, y) {
    if (!R) return;
    const len = Math.sqrt(x * x + y * y);
    if (len > 1) { x /= len; y /= len; }
    R.dx = x; R.dy = y;
    if (len > 0.15) { R.goal = null; R.gather = false; }
  };

  // ---- 한 걸음 계산 ----
  EW.update = function (dt) {
    if (!active()) return;
    const st = R.st;
    const night = R.phase === 'night';
    R.t += dt; R.time += dt;
    if (R.dampT > 0) R.dampT -= dt;
    if (R.mireT > 0) R.mireT -= dt;
    if (R.frostT > 0) R.frostT -= dt;
    if (R.hurtT > 0) R.hurtT -= dt;
    if (R.fireHitT > 0) R.fireHitT -= dt;

    // 불지기 움직임
    let vx = R.dx, vy = R.dy;
    if (R.goal === 'fire') {
      const d = dist(R.px, R.py, FX, FY);
      if (d <= throwMain()) { R.goal = null; if (mainRoom() && hasAnyWood()) feedMain(); vx = 0; vy = 0; }
      else { vx = (FX - R.px) / d; vy = (FY - R.py) / d; }
    }
    const sp = st.moveSpeed * Math.min(R.mireT > 0 ? 0.35 : 1, R.frostT > 0 ? 0.6 : 1);
    R.px = clamp(R.px + vx * sp * dt, 24, W - 24);
    R.py = clamp(R.py + vy * sp * dt, 30, H - 24);
    const dpf = dist(R.px, R.py, FX, FY);
    if (dpf < 38) { const a = Math.atan2(R.py - FY, R.px - FX) || 0.5; R.px = FX + Math.cos(a) * 38; R.py = FY + Math.sin(a) * 38; }

    // 모으기 (누르고 있는 동안)
    if (R.gather) gatherStep(dt); else R.gNode = null;
    // 발에 닿은 장작은 저절로 줍는다
    for (let i = R.logs.length - 1; i >= 0; i--) {
      const l = R.logs[i];
      l.age += dt;
      if (dist(R.px, R.py, l.x, l.y) < st.pickR + 10 && fits([[l.type, 1]])) pickLog(l);
    }
    // 모닥불 빛 안에 2초 있으면 버섯이 하나씩 구워진다
    const inFireLight = R.fuel > 0 && dpf <= fireR();
    if (inFireLight && countItem('mush') > 0) {
      R.roastT += dt;
      if (R.roastT >= 2) {
        R.roastT = 0;
        removeItem('mush', 1);
        if (addItem('mush_r', 1) < 1) addItem('mush', 1); else EW.ev('roast');
      }
    } else R.roastT = 0;

    // 배고픔: 낮과 밤 내내 천천히 준다. 0이면 체력이 준다
    R.hunger = Math.max(0, R.hunger - st.hungerRate * dt);
    if (R.hunger <= 0) R.hp -= 1 * dt;
    // 모닥불 빛 안에서 체력이 찬다 (배고프지 않을 때)
    else if (inFireLight) R.hp = Math.min(st.maxHp, R.hp + st.regen * dt);

    if (night) {
      // 모닥불은 가만히 있어도 1초에 1씩 준다. 화톳불은 0.4씩
      R.fuel -= 1 * st.fireBurn * (R.dampT > 0 ? 0.5 : 1) * dt;
      braziers().forEach(function (b) {
        if (b.fuel <= 0) return;
        b.fuel -= 0.4 * dt;
        if (b.fuel <= 0) { b.fuel = 0; EW.ev('brazierOut', b); }
      });
      // 빛 밖: 등불이 켜져 있으면 등불 연료가 닳고, 다 닳으면 어둠이 체력을 갉아먹는다
      if (!inLight(R.px, R.py, 0)) {
        if (R.oil > 0) R.oil = Math.max(0, R.oil - st.lampDrain * (R.frostT > 0 ? 1.8 : 1) * dt);
        else {
          R.hp -= st.darkDps * dt;
          if (R.hurtT <= 0) { R.hurtT = 0.6; EW.ev('dark', { x: R.px, y: R.py, v: st.darkDps * 0.6 }); }
        }
      }
      nightStep(dt);
      if (!active()) return;
    } else {
      if (!R.duskWarned && R.t >= DAY_LEN - DUSK) { R.duskWarned = true; EW.ev('dusk'); }
    }

    // 끝나는 조건
    if (R.fuel <= 0) {
      R.fuel = 0;
      if (st.revive > R.revived) { R.revived++; R.fuel = 30; EW.ev('relight'); }
      else { down('fire'); return; }
    }
    if (R.hp <= 0) { R.hp = 0; down(R.hunger <= 0 ? 'hunger' : (night && R.oil <= 0 && !inLight(R.px, R.py, 0) ? 'dark' : 'hp')); return; }

    if (R.phase === 'day' && R.t >= DAY_LEN) startNight();
    else if (R.phase === 'night' && R.t >= R.nightLen) dawn();
  };

  // 밤의 그림자·장작
  function nightStep(dt) {
    const st = R.st;
    // 장작이 어둠 속에 떨어진다 (밤에 드는 양의 70% 만)
    while (R.logPlan.length && R.logPlan[0] <= R.t) { R.logPlan.shift(); spawnNightLog(); }
    // 그림자가 온다 (날마다 수가 늘고, 셋째 밤부터 두 쪽에서 물결로, 닷새마다 큰 그림자)
    while (R.plan.length && R.plan[0].t <= R.t) {
      const p = R.plan.shift();
      if (p.wave) EW.ev('wave', p.wave);
      const s = sideSpot(p.side, p.u);
      if (R.enemies.length < MAX_ENEMIES) spawnEnemy(pickEnemyId(), s.x, s.y);
    }
    if (R.bossAt > 0 && R.t >= R.bossAt) {
      R.bossAt = -1;
      spawnEnemy(D.BOSSES[Math.floor(R.day / 5 - 1) % D.BOSSES.length]);
    }
    const fr = fireR(), lr = lampR();
    const lit = lampOn();
    // 모닥불 빛 안에서는 등불 빛이 모닥불 빛에 묻혀 그림자를 밀지 못한다 (깎기만 한다).
    // 모닥불 곁에 서서 등불만 휘둘러서는 그림자가 불에 닿는다 — 밖으로 나가 맞서야 밀어낼 수 있다
    const lampPushMul = inMain(R.px, R.py, 0) ? 0 : 1;

    // 불티
    if (st.spark > 0) {
      R.sparkAcc += dt;
      if (R.sparkAcc >= 1.5) {
        R.sparkAcc = 0;
        let best = null, bd = 1e9;
        R.enemies.forEach(function (e) {
          const d = dist(e.x, e.y, FX, FY);
          if (!e.boss && d > fr && d < 560 && d < bd) { bd = d; best = e; }
        });
        if (best) { best.hp -= st.spark; best.hitT = 0.1; EW.ev('spark', { x: best.x, y: best.y, v: st.spark }); }
      }
    }

    const dimmers = R.enemies.filter(function (e) { return has(e, 'dim'); });
    const queue = [];
    const rageOn = st.rage > 0 && R.hp < st.maxHp * 0.35;
    for (let i = 0; i < R.enemies.length; i++) {
      const e = R.enemies[i];
      e.tm += dt; e.wob += dt;
      if (e.hitT > 0) e.hitT -= dt;
      if (e.stunT > 0) e.stunT -= dt;
      if (e.heldT > 0) e.heldT -= dt;
      const dp = dist(e.x, e.y, R.px, R.py);
      // 노리는 곳: 가장 가까운 불 / 불지기 / 가까운 쪽
      let tgt = nearestFire(e.x, e.y);
      let toPlayer = false;
      if (e.b.tg === 'player' || !tgt) toPlayer = true;
      else if (e.b.tg === 'mix' && dp < dist(e.x, e.y, tgt.x, tgt.y)) toPlayer = true;
      // 빛 끌기: 불을 노리던 그림자도 등불이 더 끌리면 불지기에게 온다
      // (한 번 끌린 그림자는 불 쪽 끌림이 1.25배를 넘어야 돌아간다 — 경계에서 오락가락하지 않게)
      const lured = !toPlayer && !e.flee && lampPull(e) * (e.lured ? 1.25 : 1) > firePull(e, tgt);
      if (lured) {
        toPlayer = true;
        if (!e.lured) EW.ev('lure', e);
      }
      e.lured = lured;
      let tx = toPlayer ? R.px : tgt.x, ty = toPlayer ? R.py : tgt.y;
      if (e.flee) {
        const a = Math.atan2(e.y - FY, e.x - FX);
        tx = e.x + Math.cos(a) * 200; ty = e.y + Math.sin(a) * 200;
      }
      const inFire = fr > 0 && dist(e.x, e.y, FX, FY) < fr;
      const inLamp = lit && dp < lr + e.r * 0.5;
      const inAnyLight = inFire || inLamp || inLight(e.x, e.y, 0);

      let spdMul = 1;
      if (has(e, 'dash')) {
        if (e.tm > 3) { e.tm = 0; e.dashT = 0.6; }
        if (e.dashT > 0) { e.dashT -= dt; spdMul = 3; }
      }
      if (has(e, 'blink') && e.tm > 4) {
        e.tm = 0;
        if (!inAnyLight) {
          const d0 = dist(e.x, e.y, tx, ty) || 1;
          const jump = Math.min(80, d0 * 0.5);
          e.x += (tx - e.x) / d0 * jump; e.y += (ty - e.y) / d0 * jump;
          EW.ev('blink', e);
        }
      }
      if (has(e, 'call') && e.tm > 6) { e.tm = 0; queue.push(['moth', e.x + 20, e.y]); }
      if (has(e, 'heal') && e.tm > 1) {
        e.tm = 0;
        R.enemies.forEach(function (o) {
          if (o !== e && o.hp > 0 && dist(o.x, o.y, e.x, e.y) < 120) o.hp = Math.min(o.maxHp, o.hp + 5);
        });
      }
      if (inAnyLight) spdMul *= (1 - st.lightSlow);

      // 덫에 묶이거나 울타리에 부딪혀 멈춘 동안은 움직이지 않는다
      const frozen = e.heldT > 0 || e.stunT > 0;
      const reach = toPlayer ? 16 + e.r : (tgt === MAIN ? 30 : 18) + e.r;
      const dT = dist(e.x, e.y, tx, ty);
      if (!frozen && (e.flee || dT > reach)) {
        const step = Math.min(dT, e.spd * spdMul * dt);
        if (dT > 0) { e.x += (tx - e.x) / dT * step; e.y += (ty - e.y) / dT * step; }
      }
      if (e.flee && (e.x < -60 || e.x > W + 60 || e.y < -60 || e.y > H + 60)) { e.gone = true; continue; }

      // 등불 빛: 밀어내고 조금 깎을 뿐이다. 보통 그림자는 등불 빛 안에 LAMP_MIN_T(3.2)초 넘게 붙잡아 둬야 쓰러지고
      // (강화가 아무리 붙어도 초당 최대 체력의 1/3.2 까지만 깎는다), 큰 그림자는 등불로 깎이지도 거의 밀리지도 않는다
      let dmg = 0;
      if (inLamp) {
        if (!e.boss) dmg += Math.min(e.maxHp / LAMP_MIN_T, st.lampDps * (has(e, 'armor') ? 0.4 : 1) * (rageOn ? 1.5 : 1));
        const push = st.lampPush * lampPushMul * (has(e, 'armor') ? 0.4 : 1) * (e.boss ? 0.1 : 1) * dt;
        const a = Math.atan2(e.y - R.py, e.x - R.px);
        e.x += Math.cos(a) * push; e.y += Math.sin(a) * push;
      }
      if (inFire && st.fireDps > 0) dmg += st.fireDps * (has(e, 'armor') ? 0.4 : 1);
      if (dmg > 0 && dimmers.length) {
        for (let k = 0; k < dimmers.length; k++) {
          const m = dimmers[k];
          if (m !== e && dist(m.x, m.y, e.x, e.y) < 120) { dmg *= 0.5; break; }
        }
      }

      // 울타리: 부딪힌 그림자를 잠깐 멈춰 세우고 부서진다
      for (let k = R.builds.length - 1; k >= 0; k--) {
        const b = R.builds[k];
        if (b.kind === 'fence' && !e.flee && dist(e.x, e.y, b.x, b.y) < e.r + 16) {
          R.builds.splice(k, 1);
          e.stunT = st.fenceStun;
          const a = Math.atan2(e.y - FY, e.x - FX);
          e.x += Math.cos(a) * 34; e.y += Math.sin(a) * 34;
          EW.ev('fenceBreak', b);
          break;
        }
        if (b.kind === 'trap' && b.armed && e.heldT <= 0 && dist(e.x, e.y, b.x, b.y) < e.r + 14) {
          b.armed = false;
          e.heldT = st.trapTime;
          R.trapped++;
          EW.ev('trap', { b: b, e: e });
        }
      }

      // 불지기에 닿음
      if (toPlayer && dp < 18 + e.r) {
        dmg += st.thorns;
        R.hp -= e.b.dmg * (1 - st.armor) * dt;
        if (has(e, 'drink')) R.oil = Math.max(0, R.oil - 10 * dt);
        if (has(e, 'mire')) { if (R.mireT <= 0) EW.ev('mire', e); R.mireT = 0.25; }
        if (has(e, 'frost') && R.frostT <= 0) { R.frostT = 1.5; EW.ev('frost', e); }
        if (R.hurtT <= 0) { R.hurtT = 0.45; EW.ev('hurt', { v: e.b.dmg * (1 - st.armor) * 0.45, x: R.px, y: R.py }); }
      }
      // 불에 닿음: 연료를 크게 깎는다 (한 번에 15). 보통 그림자는 그 자리에서 스러지고, 큰 그림자는 튕겨 나갔다가 다시 온다
      if (!toPlayer && !e.flee && !frozen && tgt && dT <= reach + 2) {
        const mul = (has(e, 'double') ? 2 : 1) * (1 - st.hitResist);
        const amount = (has(e, 'thief') ? 8 : e.b.hit) * mul;
        if (tgt === MAIN) R.fuel -= amount;
        else { tgt.fuel = Math.max(0, tgt.fuel - amount); if (tgt.fuel <= 0) EW.ev('brazierOut', tgt); }
        R.fireHitT = 0.3;
        EW.ev('fireHit', { x: tgt.x, y: tgt.y, v: amount, brazier: tgt !== MAIN, e: e });
        if (has(e, 'thief')) e.flee = true;
        else if (e.boss) {
          const a = Math.atan2(e.y - tgt.y, e.x - tgt.x);
          e.x += Math.cos(a) * 140; e.y += Math.sin(a) * 140; e.stunT = 2;
        } else e.faded = true;
      }
      // 큰 그림자는 쓰러지지 않는다 — 덫·울타리·화톳불로 막고 새벽까지 버틴다
      if (e.boss) dmg = 0;
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
      if (e.faded) { EW.ev('fade', e); return false; }
      if (e.hp <= 0) { dead.push(e); return false; }
      return true;
    });
    dead.forEach(kill);
    queue.forEach(function (q) { if (R.enemies.length < MAX_ENEMIES) spawnEnemy(q[0], q[1], q[2]); });

    R.nightMinFuel = Math.min(R.nightMinFuel, R.fuel);
    if (R.fuel < 20 && !R.lowWarned) { R.lowWarned = true; EW.ev('fireLow'); }
    if (R.fuel >= 30) R.lowWarned = false;
  }

  // ---- 시험 훅이 쓰는 목록 (화면 버튼과 같다) ----
  EW.actions = function () {
    if (!R) return [];
    if (R.phase === 'day' || R.phase === 'night') {
      const a = ['up', 'down', 'left', 'right', 'stop'];
      if (EW.canGather()) a.push('gather');
      if (EW.canFeed()) a.push('feed');
      if (EW.canBuildHere()) a.push('build');
      if (EW.canEat()) a.push('eat');
      if (EW.canAdWood()) a.push('adwood');
      return a;
    }
    if (R.phase === 'build') {
      const a = ['close'];
      D.BUILDS.forEach(function (b) { if (EW.buildInfo(b.id).ok) a.push('b:' + b.id); });
      return a;
    }
    if (R.phase === 'cards' || R.phase === 'relic') return R.offer.map(function (_, i) { return 'pick' + i; });
    if (R.phase === 'down') return ['revive', 'end'];
    if (R.phase === 'ad') return ['adclose'];
    return [];
  };

  EW.act = function (a) {
    if (!R || typeof a !== 'string') return;
    switch (a) {
      case 'up': EW.setMove(0, -1); break;
      case 'down': EW.setMove(0, 1); break;
      case 'left': EW.setMove(-1, 0); break;
      case 'right': EW.setMove(1, 0); break;
      case 'stop': EW.setMove(0, 0); break;
      case 'gather': EW.gatherPress(); break;
      case 'feed': EW.feed(); break;
      case 'build': EW.openBuild(); break;
      case 'eat': EW.eat(); break;
      case 'adwood': EW.adWood(); break;
      case 'close': EW.closeBuild(); break;
      case 'revive': EW.revive(); break;
      case 'end': EW.endDown(); break;
      case 'adclose': EW.closeAd(); break;
      default:
        if (a.indexOf('b:') === 0) EW.build(a.slice(2));
        else if (a.indexOf('pick') === 0) EW.pickOffer(parseInt(a.slice(4), 10) || 0);
    }
  };

  EW.state = function () {
    if (!R) return { over: false, won: false, stage: 1, stageMax: GOAL_DAY, time: 0 };
    return { over: R.phase === 'over', won: R.dawns >= 1, stage: R.day, stageMax: GOAL_DAY, time: Math.round(R.time * 10) / 10 };
  };

  EW.score = function (run) {
    const r = run || R;
    if (!r) return 0;
    return r.dawns * 100 + r.kills * 2 + r.embers + r.built * 5;
  };
})();
