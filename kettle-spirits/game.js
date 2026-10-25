'use strict';
/* Kettle Spirits — 저장소와 게임 규칙. 화면 버튼(ui.js)과 시험 훅(window.__test)이 같은 함수를 부른다 */

var Store = (function () {
  var KEY = 'kettle-spirits-v1';
  var meta = null;

  function defStats() {
    return { runs: 0, wins: 0, brews: 0, calmed: 0, overflows: 0, skills: 0, junkCleared: 0, events: 0,
      bestChain: 0, bestCalm: 0, bestCoins: 0, bestStage: 0, cleanBoss: 0, potsOpen: 1, totalTime: 0,
      bestWinTime: 0, totalGinkgo: 0, bossCalmed: {}, spiritSeen: {}, relicSeen: {},
      dailyRuns: 0, dailyWins: 0, dailyStreak: 0, dailyBestStreak: 0, dailyBestStage: 0, lastDaily: '' };
  }
  function defMeta() {
    var settings = {};
    DATA.SETTINGS.forEach(function (s) { settings[s.id] = s.def; });
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) settings.reduce = true;
    } catch (e) { /* 무시 */ }
    return { ginkgo: 0, unlocked: {}, pots: { white: true }, settings: settings, stats: defStats(), achv: {}, tutDone: false, run: null, lastPot: 'white',
      daily: null, dailyLog: [] };
  }
  function load() {
    var base = defMeta();
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var m = JSON.parse(raw);
        for (var k in m) if (Object.prototype.hasOwnProperty.call(m, k)) base[k] = m[k];
        var st = defStats();
        for (var s in base.stats) st[s] = base.stats[s];
        base.stats = st;
        var set = defMeta().settings;
        for (var t in base.settings) set[t] = base.settings[t];
        base.settings = set;
      }
    } catch (e) { base = defMeta(); }
    meta = base;
    return meta;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(meta)); return true; } catch (e) { return false; }
  }
  function wipe() {
    meta = defMeta();
    try { localStorage.removeItem(KEY); } catch (e) { /* 저장소가 없어도 지운 것으로 본다 */ }
    return meta;
  }
  return { load: load, save: save, wipe: wipe, meta: function () { return meta || load(); } };
})();

var Game = (function () {
  var SHELF = 12, STAGE_MAX = 12;
  var R = null;      // 지금 판 (JSON 으로 저장할 수 있는 값만)
  var Q = [];        // 화면이 받아 갈 일 목록
  var test = false;

  var LEAF = {}, SPIRIT = {}, BOSS = {}, RELIC = {}, RECIPE = {}, POT = {}, EVENT = {};
  DATA.LEAVES.forEach(function (x) { LEAF[x.id] = x; });
  LEAF.junk = DATA.JUNK;
  DATA.SPIRITS.forEach(function (x) { SPIRIT[x.id] = x; });
  DATA.BOSSES.forEach(function (x) { BOSS[x.id] = x; });
  DATA.RELICS.forEach(function (x) { RELIC[x.id] = x; });
  DATA.RECIPES.forEach(function (x) { RECIPE[x.id] = x; });
  DATA.POTS.forEach(function (x) { POT[x.id] = x; });
  DATA.EVENTS.forEach(function (x) { EVENT[x.id] = x; });
  var TOOL = {};
  DATA.TOOLS.forEach(function (x) { TOOL[x.id] = x; });
  function startTools() {
    var t = {};
    DATA.TOOLS.forEach(function (x) { t[x.id] = x.start; });
    return t;
  }

  function ev(t, o) { if (test) return; o = o || {}; o.t = t; Q.push(o); }
  function drain() { var q = Q; Q = []; return q; }
  /* 오늘의 도전은 날짜 시드로 굴린다(R.seed 를 판과 함께 저장해 이어해도 같은 흐름). 그 밖의 판·시험은 Math.random */
  function seeded() {
    var t = (R.seed = (R.seed + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function rnd(n) { return Math.floor((R && R.daily ? seeded() : Math.random()) * n); }
  function pickOne(a) { return a[rnd(a.length)]; }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function seasonOf(stage) { return Math.min(3, Math.floor((stage - 1) / 3)); }
  function meta() { return Store.meta(); }

  /* ---------- 오늘의 도전: 날짜 → 시드·바람 ---------- */

  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function todayKey() { return dayKey(new Date()); }
  function prevDay(key) {
    var p = key.split('-');
    return dayKey(new Date(+p[0], +p[1] - 1, +p[2] - 1));
  }
  function twistFor(key) { return DATA.DAILY[hashStr('wind:' + key) % DATA.DAILY.length]; }
  function twist() {
    if (!R || !R.twist) return null;
    return DATA.DAILY.filter(function (x) { return x.id === R.twist; })[0] || null;
  }

  function dailyInfo() {
    var key = todayKey(), m = meta();
    var played = !!(m.daily && m.daily.date === key && m.daily.played);
    var going = !!(m.run && m.run.daily && m.run.dailyDate === key && !m.run.over);
    return { date: key, twist: twistFor(key), played: played, inProgress: going,
      result: played && m.daily.result ? m.daily.result : null };
  }

  /* 하루 한 번: 시작하는 순간 오늘 한 것으로 적어 그만두고 다시 굴리지 못하게 한다 */
  function startDaily() {
    var info = dailyInfo();
    if (info.played) return false;
    newRun({ daily: true, date: info.date });
    meta().daily = { date: info.date, played: true, result: null };
    Store.save();
    return true;
  }

  function recordDaily() {
    var m = meta(), s = m.stats;
    s.dailyRuns++;
    if (R.won) s.dailyWins++;
    if (s.lastDaily !== R.dailyDate) s.dailyStreak = s.lastDaily === prevDay(R.dailyDate) ? s.dailyStreak + 1 : 1;
    s.dailyBestStreak = Math.max(s.dailyBestStreak, s.dailyStreak);
    s.dailyBestStage = Math.max(s.dailyBestStage, R.won ? STAGE_MAX + 1 : R.stage);
    s.lastDaily = R.dailyDate;
    var res = { date: R.dailyDate, twist: R.twist, won: R.won, stage: R.stage, calmed: R.st.calmed,
      brews: R.st.brews, overflows: R.st.overflows, time: Math.round(R.time) };
    m.daily = { date: R.dailyDate, played: true, result: res };
    if (!m.dailyLog) m.dailyLog = [];
    m.dailyLog.unshift(res);
    if (m.dailyLog.length > 30) m.dailyLog.length = 30;
  }

  /* ---------- 판 시작 ---------- */

  function availableLeaves() {
    return DATA.LEAVES.filter(function (l) { return l.base || (!R.pure && meta().unlocked['u_' + l.id]); })
      .map(function (l) { return l.id; });
  }

  function computeMods() {
    var m = {};
    function add(o, skip) {
      for (var k in o) { if (skip && skip.indexOf(k) >= 0) continue; m[k] = (m[k] || 0) + o[k]; }
    }
    var pot = POT[R.pot];
    if (pot.bonus) add(pot.bonus);
    R.relics.forEach(function (id) { add(RELIC[id].mod, ['maxHp']); });
    var tw = twist();
    if (tw) add(tw.mod);
    if (!R.pure) {
      DATA.UPGRADES.forEach(function (u) {
        if (u.kind === 'perk' && meta().unlocked[u.id]) add(u.perk, ['maxHp', 'coins', 'rerolls', 'startRelic']);
      });
    }
    R.mods = m;
  }

  function newRun(opts) {
    opts = opts || {};
    test = !!opts.test;
    Q = [];
    var daily = !test && !!opts.daily;
    /* 오늘의 도전은 모두 같은 조건: 백자 주전자, 찻집 개량·해금 없음 */
    var pot = daily ? POT.white : (POT[opts.pot] || POT.white);
    R = {
      v: 1, test: test, pure: test || daily, daily: daily, dailyDate: daily ? opts.date : '',
      seed: daily ? hashStr('seed:' + opts.date) : 0, twist: daily ? twistFor(opts.date).id : '',
      pot: pot.id, hp: pot.hp, maxHp: pot.hp, coins: 0, stage: 1, phase: 'map',
      over: false, won: false, time: 0, deck: {}, leafLv: {}, relics: [], mods: {}, chargeBonus: 0, rerolls: 0,
      tools: startTools(),
      nodeOpts: [], battle: null, reward: null, shop: null, event: null, rest: null, seenEvents: [], ginkgo: 0, newAchv: [],
      st: { brews: 0, calmed: 0, overflows: 0, skills: 0, junkCleared: 0, events: 0, bestChain: 0, bestCalm: 0,
        bossCalmed: {}, spiritSeen: {}, relicSeen: {}, cleanBoss: 0 }
    };
    DATA.LEAVES.forEach(function (l) { if (l.base) R.deck[l.id] = 5; });
    if (!R.pure) {
      DATA.UPGRADES.forEach(function (u) {
        if (u.kind !== 'perk' || !meta().unlocked[u.id]) return;
        if (u.perk.maxHp) { R.maxHp += u.perk.maxHp; R.hp += u.perk.maxHp; }
        if (u.perk.coins) R.coins += u.perk.coins;
        if (u.perk.rerolls) R.rerolls += u.perk.rerolls;
      });
    }
    var tw = twist();
    if (tw) {
      if (tw.coins) R.coins += tw.coins;
      if (tw.hp) { R.maxHp = Math.max(10, R.maxHp + tw.hp); R.hp = R.maxHp; }
    }
    computeMods();
    if (!R.pure && meta().unlocked.u_relic) {
      gainRelic(pickOne(DATA.RELICS).id);
    }
    if (tw && tw.relic) gainRelic(randomRelic());
    buildNodes();
    ev('runStart');
    return R;
  }

  function resume(saved) {
    if (!saved || saved.over) return false;
    R = saved; test = false; Q = [];
    /* 도우미가 생기기 전에 저장한 판 */
    if (!R.tools) R.tools = { undo: 0, shuffle: 0, pop: 0 };
    computeMods();
    return true;
  }

  /* ---------- 길 ---------- */

  function buildNodes() {
    var pos = (R.stage - 1) % 3;
    if (pos === 0) R.nodeOpts = ['battle'];
    else if (pos === 2) R.nodeOpts = ['boss'];
    else {
      var tw = twist();
      var kinds = ['battle', 'elite', 'rest', 'shop', 'event'].filter(function (k) { return !tw || k !== tw.noNode; });
      R.nodeOpts = shuffle(kinds).slice(0, 2);
      if (tw && tw.node && R.nodeOpts.indexOf(tw.node) < 0) R.nodeOpts[1] = tw.node;
    }
    R.phase = 'map';
  }

  function chooseNode(i) {
    if (!R || R.over || R.phase !== 'map') return false;
    var k = R.nodeOpts[i];
    if (!k) return false;
    ev('node', { kind: k });
    if (k === 'battle' || k === 'elite' || k === 'boss') startBattle(k);
    else if (k === 'rest') openRest();
    else if (k === 'shop') openShop();
    else openEvent();
    return true;
  }

  function nextStage() {
    R.stage++;
    R.reward = null; R.rest = null; R.shop = null; R.event = null;
    buildNodes();
    ev('stage', { stage: R.stage });
  }

  /* ---------- 싸움 ---------- */

  function traySize() { return POT[R.pot].tray + (R.mods.traySize || 0); }

  function makeSpirit(def, elite, boss) {
    var hp = Math.round(def.hp * (elite ? 1.6 : 1) * (1 + (R.mods.spiritHp || 0) / 100));
    R.st.spiritSeen[def.id] = 1;
    return { id: def.id, name: (elite ? '잔뜩 ' : '') + def.name, face: def.face, hp: hp, maxHp: hp, guard: 0,
      rage: elite ? 1 : 0, pi: 0, cd: def.pattern[0][2] + (R.mods.firstDelay || 0), done: false, boss: !!boss, elite: !!elite };
  }

  function startBattle(kind) {
    var s = seasonOf(R.stage);
    var pool = DATA.SPIRITS.filter(function (x) { return x.season === s; });
    var list = [];
    if (kind === 'boss') {
      list.push(makeSpirit(DATA.BOSSES[s], false, true));
    } else if (kind === 'elite') {
      list.push(makeSpirit(pickOne(pool), true, false));
      if (s >= 1) list.push(makeSpirit(pickOne(pool), false, false));
    } else {
      var n = R.stage === 1 ? 1 : (s === 0 ? 1 + rnd(2) : 2);
      var tw = twist();
      if (tw && tw.minSpirits) n = Math.max(n, tw.minSpirits);
      for (var i = 0; i < n; i++) list.push(makeSpirit(pickOne(pool), false, false));
    }
    R.battle = { kind: kind, spirits: list, shelf: [], locks: [], bag: [], tray: [],
      shield: R.mods.startShield || 0,
      charge: Math.min(100, (R.mods.startCharge || 0) + R.chargeBonus * 20),
      steam: 0, steamV: 0, doubleNext: false, brews: 0, moves: 0, lastBrewMove: -9, chain: 0, bestChain: 0,
      tri: [], lastBrew: null, overflowed: false, undo: null, lastPut: null };
    if (tutorialShelf(kind)) fillTutorialShelf();
    else for (var j = 0; j < SHELF; j++) { R.battle.shelf.push(draw()); R.battle.locks.push(0); }
    R.phase = 'battle';
    ev('battleStart', { kind: kind });
  }

  /* 안내를 아직 안 본 첫 판의 1단계 싸움만 짜인 선반을 쓴다(시험 판·오늘의 도전은 늘 무작위) */
  function tutorialShelf(kind) {
    return !R.test && !R.daily && !meta().tutDone && R.stage === 1 && kind === 'battle' &&
      DATA.TUTORIAL_SHELF && DATA.TUTORIAL_SHELF.length === SHELF;
  }
  function fillTutorialShelf() {
    var b = R.battle;
    for (var k in R.deck) for (var i = 0; i < R.deck[k]; i++) b.bag.push(k);
    shuffle(b.bag);
    /* 선반에 놓은 잎은 주머니에서 빼서 한 싸움의 잎 수를 무작위 선반과 같게 둔다 */
    DATA.TUTORIAL_SHELF.forEach(function (leaf) {
      var at = b.bag.indexOf(leaf);
      if (at >= 0) b.bag.splice(at, 1);
      b.shelf.push(leaf);
      b.locks.push(0);
    });
  }

  function deckTotal() {
    var n = 0;
    for (var k in R.deck) n += R.deck[k];
    return n;
  }

  /* 주머니가 비면 지금 주머니 구성 그대로 다시 채운다 */
  function draw() {
    var b = R.battle;
    if (!b.bag.length) {
      for (var k in R.deck) for (var i = 0; i < R.deck[k]; i++) b.bag.push(k);
      shuffle(b.bag);
    }
    if (!b.bag.length) return 'ssuk';
    return b.bag.pop();
  }

  function alive() { return R.battle ? R.battle.spirits.filter(function (s) { return !s.done; }) : []; }
  function front() { return alive()[0] || null; }

  function pick(i) {
    if (!R || R.over || R.phase !== 'battle') return false;
    var b = R.battle;
    var k = b.shelf[i];
    if (!k || b.locks[i] > 0) return false;
    b.shelf[i] = draw();
    b.moves++;
    for (var j = 0; j < b.locks.length; j++) if (b.locks[j] > 0) b.locks[j]--;
    ev('pick', { slot: i, kind: k });
    var brews0 = b.brews, over0 = R.st.overflows;
    b.undo = null;
    putInTray(k);
    /* 우러나거나 넘치지 않은 담기만 되돌릴 수 있다(효과가 난 것은 되돌리지 않는다) */
    if (b.brews === brews0 && R.st.overflows === over0) b.undo = { slot: i, kind: k, put: b.lastPut, drawn: b.shelf[i] };
    if (checkBattleEnd()) return true;
    if (b.steam > 0) {
      b.steam--;
      var f = front();
      if (f) calm(f, b.steamV, false);
      if (checkBattleEnd()) return true;
    }
    spiritsTurn();
    checkBattleEnd();
    return true;
  }

  function insertGrouped(k) {
    var t = R.battle.tray;
    var idx = t.lastIndexOf(k);
    if (idx < 0) t.push(k); else t.splice(idx + 1, 0, k);
  }
  function countIn(k) { return R.battle.tray.filter(function (x) { return x === k; }).length; }
  function removeN(k, n) {
    var t = R.battle.tray;
    for (var i = t.length - 1; i >= 0 && n > 0; i--) if (t[i] === k) { t.splice(i, 1); n--; }
  }

  function putInTray(k) {
    var b = R.battle;
    if (k === 'star') {
      var best = null, bc = 0, c = {};
      b.tray.forEach(function (x) {
        if (x === 'junk' || x === 'star') return;
        c[x] = (c[x] || 0) + 1;
        if (c[x] > bc) { bc = c[x]; best = x; }
      });
      if (best) { k = best; ev('wild', { kind: k }); }
    }
    b.lastPut = k;
    insertGrouped(k);
    if (countIn(k) >= 3) {
      /* 우리기 전 주전자에서 빠질 3칸(removeN 처럼 뒤에서부터) — 화면이 합쳐지기 연출에 쓴다 */
      var slots = [];
      for (var i = b.tray.length - 1; i >= 0 && slots.length < 3; i--) if (b.tray[i] === k) slots.unshift(i);
      removeN(k, 3);
      brew(k, slots);
      return;
    }
    if (b.tray.length >= traySize()) overflow();
  }

  function overflow() {
    var b = R.battle;
    var dmg = Math.max(1, 3 + seasonOf(R.stage) * 2 - (R.mods.overflowCut || 0));
    b.tray = [];
    b.undo = null;
    b.overflowed = true;
    R.st.overflows++;
    ev('overflow', { dmg: dmg });
    hurt(dmg, true);
  }

  function leafVal(k) {
    var L = LEAF[k];
    return L.v + L.up * (R.leafLv[k] || 0) + (R.mods['bonus_' + k] || 0);
  }

  function brew(k, slots) {
    var b = R.battle;
    var mult = 1;
    if (b.doubleNext) { mult = 2; b.doubleNext = false; }
    if (b.brews === 0 && R.mods.firstDouble) mult = 2;
    if (b.moves - b.lastBrewMove <= 2) b.chain++; else b.chain = 1;
    b.lastBrewMove = b.moves;
    b.bestChain = Math.max(b.bestChain, b.chain);
    R.st.bestChain = Math.max(R.st.bestChain, b.chain);
    b.brews++;
    R.st.brews++;
    ev('brew', { kind: k, mult: mult, chain: b.chain, slots: slots || [] });
    applyLeaf(k, mult);
    if (R.mods.fifthRepeat && b.brews % 5 === 0 && R.battle) { ev('repeat', { kind: k }); applyLeaf(k, 1); }
    if (!R.battle) return;
    b.charge = Math.min(100, b.charge + 20 + (R.mods.chargePerBrew || 0));
    b.tri.push(k);
    if (b.tri.length > 3) b.tri.shift();
    if (R.mods.triColor && b.tri.length === 3 && b.tri[0] !== b.tri[1] && b.tri[1] !== b.tri[2] && b.tri[0] !== b.tri[2]) {
      gainShield(R.mods.triColor);
      b.tri = [];
    }
    b.lastBrew = k;
  }

  function calmBonus() {
    var b = R.battle, x = 0;
    if (b && b.chain >= 2) x += (R.mods.chainCalm || 0);
    if (R.hp * 2 < R.maxHp) x += (R.mods.lowHpCalm || 0);
    return x;
  }

  function applyLeaf(k, mult) {
    var b = R.battle;
    if (!b) return;
    var L = LEAF[k];
    var v = leafVal(k) * mult;
    var f = front();
    var cb = calmBonus();
    switch (L.eff) {
      case 'calm': if (f) calm(f, v + cb, false); break;
      case 'shield': gainShield(v); break;
      case 'calmAll': alive().forEach(function (s) { calm(s, v + cb, false); }); break;
      case 'delay':
        if (f) { f.cd += v; ev('delay', { idx: b.spirits.indexOf(f), n: v }); calm(f, 2 * mult + cb, false); }
        break;
      case 'heal': heal(v); break;
      case 'charge':
        b.charge = Math.min(100, b.charge + v);
        ev('charge', { amt: v });
        if (f) calm(f, 3 * mult + cb, false);
        break;
      case 'pierce': if (f) calm(f, v + cb, true); break;
      case 'steam': b.steam = 4; b.steamV = v; ev('steam', { v: v }); break;
      case 'double': b.doubleNext = true; ev('double'); if (f) calm(f, v + cb, false); break;
      case 'sweep':
        var n = countIn('junk');
        b.tray = b.tray.filter(function (x) { return x !== 'junk'; });
        ev('sweep', { n: n });
        gainShield(v);
        break;
      case 'mix': if (f) calm(f, v + cb, false); heal(v); break;
      case 'wild':
        alive().forEach(function (s) { calm(s, 4 * mult + cb, false); });
        gainShield(4 * mult);
        break;
    }
  }

  function calm(sp, amt, pierce) {
    if (!sp || sp.done || !R.battle) return 0;
    amt = Math.max(0, Math.round(amt));
    var idx = R.battle.spirits.indexOf(sp);
    var absorbed = 0;
    if (!pierce && sp.guard > 0) { absorbed = Math.min(sp.guard, amt); sp.guard -= absorbed; amt -= absorbed; }
    sp.hp = Math.max(0, sp.hp - amt);
    R.st.bestCalm = Math.max(R.st.bestCalm, amt + absorbed);
    ev('calm', { idx: idx, amt: amt, absorbed: absorbed });
    if (sp.hp <= 0) {
      sp.done = true;
      R.st.calmed++;
      if (sp.boss) R.st.bossCalmed[sp.id] = (R.st.bossCalmed[sp.id] || 0) + 1;
      ev('calmed', { idx: idx, boss: sp.boss });
      if (R.mods.calmDelay) alive().forEach(function (s) { s.cd += R.mods.calmDelay; });
    }
    return amt;
  }

  function hurt(dmg, pierce) {
    var b = R.battle, blocked = 0;
    if (!pierce && b && b.shield > 0) { blocked = Math.min(b.shield, dmg); b.shield -= blocked; dmg -= blocked; }
    R.hp = Math.max(0, R.hp - dmg);
    ev('hurt', { dmg: dmg, blocked: blocked });
    if (R.hp <= 0) endRun(false);
  }

  function heal(v) {
    var h = Math.max(0, Math.min(R.maxHp - R.hp, v));
    R.hp += h;
    ev('heal', { amt: h });
    if (R.mods.overHealShield && v > h && R.battle) gainShield(v - h);
  }

  function gainShield(v) {
    if (!R.battle || v <= 0) return;
    R.battle.shield += v;
    ev('shield', { amt: v });
  }

  function patternOf(sp) { return (sp.boss ? BOSS : SPIRIT)[sp.id].pattern; }
  function intentOf(sp) {
    var p = patternOf(sp)[sp.pi];
    var v = p[1];
    if (p[0] === 'hit' || p[0] === 'drain') v += sp.rage;
    if (p[0] === 'clutter') v = Math.max(0, v - (R.mods.junkCut || 0));
    return { k: p[0], v: v, cd: sp.cd };
  }

  function spiritsTurn() {
    var b = R.battle;
    for (var i = 0; i < b.spirits.length; i++) {
      var sp = b.spirits[i];
      if (sp.done) continue;
      sp.cd--;
      if (sp.cd <= 0) {
        spiritAct(sp, i);
        if (R.over || !R.battle) return;
        var pat = patternOf(sp);
        sp.pi = (sp.pi + 1) % pat.length;
        sp.cd = pat[sp.pi][2];
      }
    }
  }

  function spiritAct(sp, i) {
    var it = intentOf(sp);
    ev('act', { idx: i, k: it.k, v: it.v });
    switch (it.k) {
      case 'hit': hurt(it.v, false); break;
      case 'drain': hurt(it.v, true); break;
      case 'guard': sp.guard += it.v; break;
      case 'rage': sp.rage += it.v; break;
      case 'sulk': sp.hp = Math.min(sp.maxHp, sp.hp + it.v); break;
      case 'lock': lockSlots(it.v); break;
      case 'clutter': addJunk(it.v); break;
    }
  }

  /* 늘 4칸 넘게 열려 있도록 잠근다 */
  function lockSlots(n) {
    var b = R.battle;
    var open = [];
    for (var i = 0; i < SHELF; i++) if (!b.locks[i]) open.push(i);
    shuffle(open);
    var can = Math.max(0, Math.min(n, open.length - 5));
    var done = [];
    for (var j = 0; j < can; j++) { b.locks[open[j]] = 2; done.push(open[j]); }
    ev('lock', { slots: done });
  }

  function addJunk(n) {
    var b = R.battle;
    if (n <= 0) return;
    for (var j = 0; j < n; j++) insertGrouped('junk');
    ev('junk', { n: n });
    var guardLoop = 0;
    while (countIn('junk') >= 3 && guardLoop++ < 10) {
      removeN('junk', 3);
      R.st.junkCleared++;
      ev('junkClear');
      if (R.mods.junkCalm) alive().forEach(function (s) { calm(s, R.mods.junkCalm, false); });
    }
    if (R.battle && b.tray.length >= traySize()) overflow();
  }

  function checkBattleEnd() {
    if (R.over) return true;
    if (!R.battle) return false;
    if (alive().length === 0) { winBattle(); return true; }
    return false;
  }

  function winBattle() {
    var b = R.battle;
    var s = seasonOf(R.stage);
    var coins = Math.round((8 + rnd(6)) * DATA.SEASONS[s].scale) + (b.kind === 'elite' ? 10 : 0) + (b.kind === 'boss' ? 25 : 0);
    coins = Math.round(coins * (1 + (R.mods.coinMul || 0) / 100));
    R.coins += coins;
    if (b.kind === 'boss' && !b.overflowed) R.st.cleanBoss++;
    ev('battleWon', { coins: coins, kind: b.kind });
    heal(5 + (R.mods.afterHeal || 0));
    var kind = b.kind;
    R.battle = null;
    if (kind === 'boss' && R.stage >= STAGE_MAX) { endRun(true); return; }
    openReward(kind);
  }

  function useSkill() {
    if (!R || R.over || R.phase !== 'battle') return false;
    var b = R.battle;
    if (b.charge < 100) return false;
    b.charge = 0;
    b.undo = null;
    R.st.skills++;
    var pot = POT[R.pot];
    ev('skill', { skill: pot.skill, name: pot.skillName });
    switch (pot.skill) {
      case 'breathe': alive().forEach(function (s) { s.cd += 2; }); break;
      case 'blaze': var f = front(); if (f) calm(f, 15, false); break;
      case 'rinse': b.tray = []; gainShield(8); break;
      case 'sprout':
        heal(10);
        for (var i = 0; i < SHELF; i++) { b.shelf[i] = draw(); b.locks[i] = 0; }
        break;
      case 'echo': if (b.lastBrew) applyLeaf(b.lastBrew, 1); else gainShield(5); break;
    }
    checkBattleEnd();
    return true;
  }

  /* ---------- 도우미 (엽전으로 산다. 차례를 쓰지 않아 정령은 움직이지 않는다) ---------- */

  function canTool(kind) {
    if (!R || R.over || R.phase !== 'battle' || !R.battle || !TOOL[kind]) return false;
    if (!R.tools || !(R.tools[kind] > 0)) return false;
    var b = R.battle;
    if (kind === 'undo') return !!b.undo && b.tray.indexOf(b.undo.put) >= 0;
    if (kind === 'pop') return b.tray.length > 0;
    for (var i = 0; i < SHELF; i++) if (!b.locks[i]) return true;
    return false;
  }

  function useTool(kind) {
    if (!canTool(kind)) return false;
    var b = R.battle, i;
    R.tools[kind]--;
    if (kind === 'undo') {
      /* 담은 잎은 선반 제자리로, 그 자리에 새로 뽑힌 잎은 주머니로. 정령의 남은 수(cd)는 그대로 둔다 */
      var u = b.undo;
      var at = b.tray.lastIndexOf(u.put);
      b.tray.splice(at, 1);
      if (b.shelf[u.slot]) b.bag.push(b.shelf[u.slot]);
      b.shelf[u.slot] = u.kind;
      b.locks[u.slot] = 0;
      b.undo = null;
      ev('tool', { kind: kind, slot: u.slot, leaf: u.kind });
    } else if (kind === 'shuffle') {
      var open = [];
      for (i = 0; i < SHELF; i++) if (!b.locks[i]) { open.push(i); if (b.shelf[i]) b.bag.push(b.shelf[i]); }
      shuffle(b.bag);
      open.forEach(function (j) { b.shelf[j] = draw(); });
      b.undo = null;
      ev('tool', { kind: kind, slots: open });
    } else {
      var leaf = b.tray.pop();
      ev('tool', { kind: kind, leaf: leaf, slot: b.tray.length });
    }
    return true;
  }

  /* ---------- 보상 ---------- */

  function recipeOptions(n) {
    var avail = availableLeaves();
    var total = deckTotal();
    var pool = DATA.RECIPES.filter(function (p) {
      if (p.leaf && avail.indexOf(p.leaf) < 0) return false;
      if (p.kind === 'up' && !(R.deck[p.leaf] > 0)) return false;
      if (p.kind === 'cut' && (!(R.deck[p.leaf] >= 3) || total <= 15)) return false;
      return true;
    });
    return shuffle(pool).slice(0, n).map(function (p) { return { type: 'recipe', id: p.id }; });
  }

  function openReward(kind) {
    var opts;
    if (kind === 'elite' || kind === 'boss') {
      var pool = DATA.RELICS.filter(function (r) { return R.relics.indexOf(r.id) < 0; });
      opts = shuffle(pool).slice(0, 3).map(function (r) { return { type: 'relic', id: r.id }; });
      if (!opts.length) opts = recipeOptions(3);
    } else {
      opts = recipeOptions(3);
    }
    R.reward = { kind: kind, opts: opts };
    R.phase = 'reward';
  }

  function applyRecipe(p) {
    if (p.kind === 'up') R.leafLv[p.leaf] = (R.leafLv[p.leaf] || 0) + 1;
    else if (p.kind === 'add') R.deck[p.leaf] = (R.deck[p.leaf] || 0) + (p.n || 3);
    else if (p.kind === 'cut') cutLeaf(p.leaf, 3);
    else if (p.kind === 'stat') {
      if (p.stat === 'maxHp') { R.maxHp += p.v; R.hp += p.v; }
      else if (p.stat === 'heal') heal(p.v);
      else if (p.stat === 'coins') R.coins += p.v;
      else if (p.stat === 'charge') R.chargeBonus++;
    }
  }

  function cutLeaf(k, n) {
    var keep = Math.max(0, (R.deck[k] || 0) - n);
    if (deckTotal() - ((R.deck[k] || 0) - keep) < 12) return false;
    if (keep > 0) R.deck[k] = keep; else delete R.deck[k];
    return true;
  }

  function gainRelic(id) {
    if (!id || R.relics.indexOf(id) >= 0) return false;
    R.relics.push(id);
    R.st.relicSeen[id] = 1;
    var r = RELIC[id];
    if (r.mod.maxHp) { R.maxHp += r.mod.maxHp; R.hp += r.mod.maxHp; }
    computeMods();
    ev('relic', { id: id });
    return true;
  }

  function randomRelic() {
    var pool = DATA.RELICS.filter(function (r) { return R.relics.indexOf(r.id) < 0; });
    return pool.length ? pickOne(pool).id : null;
  }

  function chooseReward(i) {
    if (!R || R.over || R.phase !== 'reward') return false;
    var o = R.reward.opts[i];
    if (!o) return false;
    if (o.type === 'relic') gainRelic(o.id); else applyRecipe(RECIPE[o.id]);
    ev('reward', { opt: o });
    nextStage();
    return true;
  }
  function skipReward() {
    if (!R || R.over || R.phase !== 'reward') return false;
    R.coins += 5;
    ev('skip');
    nextStage();
    return true;
  }
  function rerollReward() {
    if (!R || R.over || R.phase !== 'reward' || R.rerolls <= 0) return false;
    R.rerolls--;
    openReward(R.reward.kind);
    ev('reroll');
    return true;
  }

  /* ---------- 쉼터 · 장터 · 길에서 만난 일 ---------- */

  function openRest() {
    var opts = [{ k: 'heal', v: Math.round(R.maxHp * 0.3) }];
    var kinds = Object.keys(R.deck).filter(function (k) { return R.deck[k] > 0 && LEAF[k].up > 0; });
    shuffle(kinds).slice(0, 2).forEach(function (k) { opts.push({ k: 'up', leaf: k }); });
    R.rest = { opts: opts };
    R.phase = 'rest';
  }
  function restChoose(i) {
    if (!R || R.over || R.phase !== 'rest') return false;
    var o = R.rest.opts[i];
    if (!o) return false;
    if (o.k === 'heal') heal(o.v); else R.leafLv[o.leaf] = (R.leafLv[o.leaf] || 0) + 1;
    ev('rest', { opt: o });
    nextStage();
    return true;
  }

  function openShop() {
    var avail = shuffle(availableLeaves().slice());
    var items = avail.slice(0, 3).map(function (k) { return { type: 'add', leaf: k, n: k === 'star' ? 2 : 3, price: k === 'star' ? 18 : 12, sold: false }; });
    var cuttable = Object.keys(R.deck).filter(function (k) { return R.deck[k] >= 3; });
    if (cuttable.length && deckTotal() > 15) items.push({ type: 'cut', leaf: pickOne(cuttable), price: 10, sold: false });
    var rel = randomRelic();
    if (rel) items.push({ type: 'relic', id: rel, price: 38, sold: false });
    var tl = pickOne(DATA.TOOLS);
    items.push({ type: 'tool', tool: tl.id, n: 1, price: tl.price, sold: false });
    items.push({ type: 'heal', v: 12, price: 10, sold: false });
    R.shop = { items: items };
    R.phase = 'shop';
  }
  function shopBuy(i) {
    if (!R || R.over || R.phase !== 'shop') return false;
    var it = R.shop.items[i];
    if (!it || it.sold || R.coins < it.price) return false;
    if (it.type === 'cut' && !cutLeaf(it.leaf, 3)) return false;
    R.coins -= it.price;
    it.sold = true;
    if (it.type === 'add') R.deck[it.leaf] = (R.deck[it.leaf] || 0) + it.n;
    else if (it.type === 'relic') gainRelic(it.id);
    else if (it.type === 'tool') { if (!R.tools) R.tools = { undo: 0, shuffle: 0, pop: 0 }; R.tools[it.tool] = (R.tools[it.tool] || 0) + it.n; }
    else if (it.type === 'heal') heal(it.v);
    ev('buy', { item: it });
    return true;
  }
  function shopLeave() {
    if (!R || R.over || R.phase !== 'shop') return false;
    ev('leave');
    nextStage();
    return true;
  }

  function openEvent() {
    var pool = DATA.EVENTS.filter(function (e) { return R.seenEvents.indexOf(e.id) < 0; });
    if (!pool.length) pool = DATA.EVENTS.slice();
    var e = pickOne(pool);
    R.seenEvents.push(e.id);
    R.event = { id: e.id };
    R.st.events++;
    R.phase = 'event';
  }
  function choiceCost(c) {
    var cost = 0;
    c.fx.forEach(function (f) { if (f[0] === 'coins' && f[1] < 0) cost -= f[1]; });
    return cost;
  }
  function canChoose(c) { return R.coins >= choiceCost(c); }
  function applyFx(fx) {
    fx.forEach(function (f) {
      switch (f[0]) {
        case 'heal': heal(f[1]); break;
        case 'hurt': var d = Math.min(f[1], R.hp - 1); if (d > 0) { R.hp -= d; ev('hurt', { dmg: d, blocked: 0 }); } break;
        case 'coins': R.coins = Math.max(0, R.coins + f[1]); break;
        case 'maxHp': R.maxHp += f[1]; R.hp += f[1]; break;
        case 'add': R.deck[f[1]] = (R.deck[f[1]] || 0) + f[2]; break;
        case 'cut': cutLeaf(f[1], f[2]); break;
        case 'up': R.leafLv[f[1]] = (R.leafLv[f[1]] || 0) + 1; break;
        case 'relic': gainRelic(randomRelic()); break;
        case 'charge': R.chargeBonus++; break;
      }
    });
  }
  function eventChoose(i) {
    if (!R || R.over || R.phase !== 'event') return false;
    var e = EVENT[R.event.id];
    var c = e.choices[i];
    if (!c || !canChoose(c)) return false;
    applyFx(c.fx);
    ev('eventDone', { note: c.note });
    nextStage();
    return true;
  }

  /* ---------- 판 끝 ---------- */

  function endRun(won) {
    if (R.over) return;
    R.over = true;
    R.won = !!won;
    R.phase = 'over';
    var g = R.stage * 3 + R.st.calmed + (won ? 30 : 0);
    g = Math.round(g * (1 + (R.mods.ginkgoBonus || 0) / 100));
    R.ginkgo = g;
    if (!test) commitMeta();
    ev('runEnd', { won: R.won, ginkgo: g });
  }

  function abandon() {
    if (!R || R.over) return false;
    R.battle = null;
    endRun(false);
    return true;
  }

  function commitMeta() {
    var m = meta(), s = m.stats, st = R.st;
    s.runs++;
    if (R.won) {
      s.wins++;
      if (!s.bestWinTime || R.time < s.bestWinTime) s.bestWinTime = Math.round(R.time);
    }
    ['brews', 'calmed', 'overflows', 'skills', 'junkCleared', 'events', 'cleanBoss'].forEach(function (k) { s[k] += st[k]; });
    s.bestChain = Math.max(s.bestChain, st.bestChain);
    s.bestCalm = Math.max(s.bestCalm, st.bestCalm);
    s.bestCoins = Math.max(s.bestCoins, R.coins);
    s.bestStage = Math.max(s.bestStage, R.won ? STAGE_MAX + 1 : R.stage);
    s.totalTime += Math.round(R.time);
    s.totalGinkgo += R.ginkgo;
    for (var b in st.bossCalmed) s.bossCalmed[b] = (s.bossCalmed[b] || 0) + st.bossCalmed[b];
    for (var p in st.spiritSeen) s.spiritSeen[p] = 1;
    for (var r in st.relicSeen) s.relicSeen[r] = 1;
    s.potsOpen = Object.keys(m.pots).length;
    m.ginkgo += R.ginkgo;
    m.run = null;
    if (R.daily) recordDaily();
    R.newAchv = checkAchievements();
    Store.save();
  }

  function checkAchievements() {
    var m = meta(), fresh = [];
    DATA.ACHIEVEMENTS.forEach(function (a) {
      if (m.achv[a.id]) return;
      var ok = false;
      try { ok = a.test(m.stats); } catch (e) { ok = false; }
      if (ok) { m.achv[a.id] = Date.now(); fresh.push(a.id); }
    });
    return fresh;
  }

  /* 판 진행을 저장한다(이어하기). 시험 모드·끝난 판은 저장하지 않는다 */
  function persist() {
    if (!R || R.test) return true;
    var m = meta();
    m.run = R.over ? null : R;
    return Store.save();
  }

  /* 찻집 개량 사기 */
  function buyUpgrade(id) {
    var m = meta();
    var u = DATA.UPGRADES.filter(function (x) { return x.id === id; })[0];
    if (!u || m.unlocked[id] || m.ginkgo < u.cost) return false;
    if (u.need && !m.unlocked[u.need]) return false;
    m.ginkgo -= u.cost;
    m.unlocked[id] = true;
    if (u.kind === 'pot') m.pots[u.pot] = true;
    m.stats.potsOpen = Object.keys(m.pots).length;
    checkAchievements();
    Store.save();
    return true;
  }

  /* ---------- 행동 목록 (시험 훅과 키보드가 쓴다) ---------- */

  function actions() {
    if (!R || R.over) return [];
    var a = [], i;
    switch (R.phase) {
      case 'battle':
        for (i = 0; i < SHELF; i++) if (R.battle.shelf[i] && !R.battle.locks[i]) a.push('pick:' + i);
        if (R.battle.charge >= 100) a.push('skill');
        DATA.TOOLS.forEach(function (t) { if (canTool(t.id)) a.push('tool:' + t.id); });
        break;
      case 'map': R.nodeOpts.forEach(function (_, j) { a.push('node:' + j); }); break;
      case 'reward':
        R.reward.opts.forEach(function (_, j) { a.push('reward:' + j); });
        a.push('skip');
        if (R.rerolls > 0) a.push('reroll');
        break;
      case 'rest': R.rest.opts.forEach(function (_, j) { a.push('rest:' + j); }); break;
      case 'shop':
        R.shop.items.forEach(function (it, j) { if (!it.sold && R.coins >= it.price) a.push('buy:' + j); });
        a.push('leave');
        break;
      case 'event':
        EVENT[R.event.id].choices.forEach(function (c, j) { if (canChoose(c)) a.push('ev:' + j); });
        break;
    }
    return a;
  }

  function act(a) {
    var p = String(a).split(':');
    var n = parseInt(p[1], 10);
    switch (p[0]) {
      case 'pick': return pick(n);
      case 'skill': return useSkill();
      case 'tool': return useTool(p[1]);
      case 'node': return chooseNode(n);
      case 'reward': return chooseReward(n);
      case 'skip': return skipReward();
      case 'reroll': return rerollReward();
      case 'rest': return restChoose(n);
      case 'buy': return shopBuy(n);
      case 'leave': return shopLeave();
      case 'ev': return eventChoose(n);
    }
    return false;
  }

  function addTime(sec) { if (R && !R.over) R.time += sec; }

  return {
    SHELF: SHELF, STAGE_MAX: STAGE_MAX, LEAF: LEAF, SPIRIT: SPIRIT, BOSS: BOSS, RELIC: RELIC, RECIPE: RECIPE, POT: POT, EVENT: EVENT,
    run: function () { return R; }, drain: drain, newRun: newRun, resume: resume, persist: persist,
    TOOL: TOOL, chooseNode: chooseNode, pick: pick, useSkill: useSkill, useTool: useTool, canTool: canTool, chooseReward: chooseReward, skipReward: skipReward,
    rerollReward: rerollReward, restChoose: restChoose, shopBuy: shopBuy, shopLeave: shopLeave, eventChoose: eventChoose,
    abandon: abandon, buyUpgrade: buyUpgrade, actions: actions, act: act, addTime: addTime,
    intentOf: intentOf, leafVal: leafVal, traySize: traySize, seasonOf: seasonOf, deckTotal: deckTotal,
    canChoose: canChoose, checkAchievements: checkAchievements,
    dailyInfo: dailyInfo, startDaily: startDaily, twist: twist, twistFor: twistFor, todayKey: todayKey,
    setTest: function (v) { test = !!v; }
  };
})();

/* 자동 균형 시험 훅 (기획지시.md 14장). 화면 버튼과 같은 Game 함수를 부른다 */
window.__test = {
  reset: function (seed) {
    if (window.UI && UI.enterTest) UI.enterTest();
    Game.newRun({ pot: 'white', test: true });
    return true;
  },
  actions: function () { return Game.actions(); },
  act: function (a) { var r = Game.act(a); Game.drain(); return r; },
  advance: function (ms) { Game.addTime((ms || 0) / 1000); Game.drain(); },
  state: function () {
    var r = Game.run();
    return { over: !!(r && r.over), won: !!(r && r.won), stage: r ? r.stage : 1, stageMax: Game.STAGE_MAX, time: r ? r.time : 0 };
  }
};
