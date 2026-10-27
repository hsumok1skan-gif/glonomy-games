/* Tide Haul — 저장소와 게임 규칙. 화면 버튼(ui.js)과 시험 훅(window.__test)이 같은 함수를 부른다 */
'use strict';

var Store = (function () {
  var KEY = 'tide-haul-v1';
  var meta = null;
  var temp = false;

  function defStats() {
    return { runs: 0, wins: 0, dives: 0, deepest: 0, bestHaul: 0, bestScore: 0, bestDay: 0, totalEarned: 0,
      requests: 0, vents: 0, stolen: 0, emergencies: 0, bought: 0, charms: 0, bestWeight: 0, playTime: 0,
      cleanWins: 0, deathsByDay: {} };
  }
  function defMeta() {
    var settings = {};
    DATA.SETTINGS.forEach(function (s) { settings[s.id] = s.def; });
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) settings.reduce = true;
    } catch (e) { /* 무시 */ }
    return { shards: 0, suits: { plain: true }, lastSuit: 'plain', settings: settings, stats: defStats(),
      ach: {}, log: {}, seen: { t: {}, c: {}, g: {} }, run: null, tutDone: false, daily: null };
  }
  function load() {
    var base = defMeta();
    temp = false;
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
        if (!base.seen || !base.seen.t) base.seen = { t: {}, c: {}, g: {} };
      }
    } catch (e) { base = defMeta(); }
    meta = base;
    return meta;
  }
  function save() {
    if (temp) return false;
    try { localStorage.setItem(KEY, JSON.stringify(meta)); return true; } catch (e) { return false; }
  }
  function wipe() {
    var keep = meta ? meta.settings : null, daily = meta ? meta.daily : null;
    meta = defMeta();
    if (keep) meta.settings = keep;
    // 오늘의 바다는 하루 한 번 — 기록을 지워도 오늘 한 것은 남긴다(진행 중이던 판은 끝난 것으로)
    if (daily) { meta.daily = daily; daily.done = true; }
    try { localStorage.removeItem(KEY); } catch (e) { /* 무시 */ }
    save();
  }
  /* 시험 모드: 저장된 기록을 무시하고 아무것도 쓰지 않는다 */
  function useTemp() { meta = defMeta(); meta.settings.sound = false; meta.settings.vibrate = false; temp = true; }
  function get() { return meta || load(); }
  function isTemp() { return temp; }
  return { load: load, save: save, wipe: wipe, get: get, useTemp: useTemp, isTemp: isTemp };
})();

var Game = (function () {
  var run = null;
  var events = [];
  var W = DATA.W, H = DATA.H, BX = DATA.BOAT_X;
  var DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  var T_BY = {}, C_BY = {}, G_BY = {}, CH_BY = {}, S_BY = {}, R_BY = {};
  DATA.TREASURES.forEach(function (t) { T_BY[t.id] = t; });
  DATA.CREATURES.forEach(function (c) { C_BY[c.id] = c; });
  DATA.GEAR.forEach(function (g) { G_BY[g.id] = g; });
  DATA.CHARMS.forEach(function (c) { CH_BY[c.id] = c; });
  DATA.SUITS.forEach(function (s) { S_BY[s.id] = s; });
  DATA.REQUESTS.forEach(function (r) { R_BY[r.id] = r; });

  function emit(t, d) { if (run && run.test) return; events.push({ t: t, d: d || {} }); }
  function drain() { var e = events; events = []; return e; }

  /* ---------- 오늘의 바다: 날짜 씨앗 ----------
     보통 판은 Math.random. 오늘의 바다 판은 같은 날짜면 누구에게나 같은 바다 판·가게·부탁·부적이 나온다.
     판·가게·부적은 (날짜, 날, 잠수) 마다 따로 씨앗을 써서, 앞에서 무엇을 했든 같은 날 같은 잠수는 같은 판이다. */
  var seeded = null;
  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mulberry(o) {
    o.s = (o.s + 0x6D2B79F5) | 0;
    var t = o.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function rnd() {
    if (seeded) return mulberry(seeded);
    if (run && run.daily) { var o = { s: run.drs | 0 }; var v = mulberry(o); run.drs = o.s; return v; }
    return Math.random();
  }
  function withSeed(tag, fn) {
    if (!run || !run.daily) return fn();
    var prev = seeded;
    seeded = { s: hashStr(run.daily + '|' + tag) };
    try { return fn(); } finally { seeded = prev; }
  }
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  /* 오늘의 바다는 하루 한 번 — 오늘 이미 시작했으면 다시 못 한다(하던 판은 이어하기로) */
  function dailyInfo() {
    var m = meta(), today = todayStr(), d = m.daily && m.daily.date === today ? m.daily : null;
    return { date: today, used: !!d, done: !!(d && d.done), score: d ? d.score || 0 : 0, won: !!(d && d.won), day: d ? d.day || 0 : 0,
      playing: !!(d && !d.done && m.run && m.run.daily === today && !m.run.over) };
  }
  function canDaily() { return !dailyInfo().used; }

  function ri(n) { return Math.floor(rnd() * n); }
  function pick(a) { return a[ri(a.length)]; }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = ri(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function meta() { return Store.get(); }
  function saveMeta() { if (run && run.test) return; Store.save(); }

  function zoneOf(y) {
    for (var i = 0; i < DATA.ZONES.length; i++) {
      if (y >= DATA.ZONES[i].from && y <= DATA.ZONES[i].to) return i;
    }
    return 0;
  }

  /* ---------- 능력치 ---------- */
  function addMod(s, mod) {
    for (var k in mod) if (Object.prototype.hasOwnProperty.call(mod, k)) s[k] = (s[k] || 0) + mod[k];
  }
  function buildStats() {
    var s = {};
    addMod(s, DATA.BASE);
    addMod(s, (S_BY[run.suit] || S_BY.plain).mod);
    DATA.GEAR.forEach(function (g) {
      var lv = run.gear[g.id] || 0;
      for (var i = 0; i < lv; i++) addMod(s, g.levels[i].mod);
    });
    run.charms.forEach(function (id) { if (CH_BY[id]) addMod(s, CH_BY[id].mod); });
    s.str = Math.max(2, s.str);
    s.maxLoad = Math.max(6, s.maxLoad);
    s.airMax = Math.max(20, s.airMax);
    s.radius = Math.max(1, s.radius);
    s.keep = Math.min(0.9, s.keep);
    s.upMul = Math.max(-0.6, s.upMul);
    s.quotaMul = Math.max(-0.5, s.quotaMul);
    s.stingMul = Math.max(-0.8, s.stingMul);
    s.pullDiscount = Math.min(0.6, s.pullDiscount);
    s.stealImmune = Math.min(0.9, s.stealImmune);
    run.st = s;
  }

  /* ---------- 무게와 걸음 (핵심 규칙) ---------- */
  function load() {
    var w = 0;
    for (var i = 0; i < run.bag.length; i++) w += T_BY[run.bag[i].t].w;
    return w;
  }
  /* 걸음당 산소 = 1 + 무게 ÷ 버티는 힘 (내림) */
  function stepBase(w) {
    if (w === undefined) w = load();
    return 1 + Math.floor(w / run.st.str);
  }
  function cellCost(dir, cell, base) {
    var c = base;
    if (dir === 'up') c *= (1 + run.st.upMul);
    if (cell.t === 'k' && !run.st.kelpFree) c += 1;
    if (cell.t === 's' && !run.st.digFree) c += 2;
    return c;
  }
  function cellAt(x, y) { return run.map.cells[y][x]; }
  function key(x, y) { return y * W + x; }

  /* 배까지 돌아가는 데 드는 산소 — 지금 무게 그대로 가장 싼 길 (다익스트라) */
  function returnInfo() {
    if (!run || run.phase !== 'dive' || !run.map) return { need: 0, path: [] };
    var p = run.p;
    if (p.y === 0) return { need: 0, path: [] };
    var n = W * H, dist = new Array(n), prev = new Array(n), done = new Array(n);
    for (var i = 0; i < n; i++) { dist[i] = Infinity; prev[i] = -1; done[i] = false; }
    var base = stepBase();
    var start = key(p.x, p.y), goal = key(BX, 0);
    dist[start] = 0;
    for (var iter = 0; iter < n; iter++) {
      var u = -1, best = Infinity;
      for (var j = 0; j < n; j++) if (!done[j] && dist[j] < best) { best = dist[j]; u = j; }
      if (u < 0 || u === goal) break;
      done[u] = true;
      var ux = u % W, uy = (u - ux) / W;
      for (var d in DIRS) {
        var nx = ux + DIRS[d][0], ny = uy + DIRS[d][1];
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
        if (ny === 0 && !(nx === BX && uy === 1)) continue;
        var c = run.map.cells[ny][nx];
        if (c.t === '#') continue;
        var v = key(nx, ny);
        var alt = dist[u] + cellCost(d, c, base);
        if (alt < dist[v]) { dist[v] = alt; prev[v] = u; }
      }
    }
    if (dist[goal] === Infinity) return { need: Infinity, path: [] };
    var path = [], cur = goal, guard = 0;
    while (cur >= 0 && guard++ < n) { path.push({ x: cur % W, y: Math.floor(cur / W) }); cur = prev[cur]; }
    path.reverse();
    return { need: dist[goal] * (1 - run.st.pullDiscount), raw: dist[goal], path: path };
  }

  /* ---------- 판 시작·하루 ---------- */
  function quota() {
    var d = DATA.DAYS[Math.min(run.day, DATA.DAY_MAX) - 1];
    return Math.max(1, Math.round(d.quota * (1 + run.st.quotaMul)));
  }
  function spare() { return run.coins - quota(); }

  function newRun(opts) {
    opts = opts || {};
    var m = meta();
    var daily = opts.daily && !opts.test ? todayStr() : null;
    if (daily && !canDaily()) return null;
    // 오늘의 바다는 모두 같은 조건 — 맨몸 물질옷으로 한다
    var suit = daily ? 'plain' : opts.suit && S_BY[opts.suit] && (opts.test || m.suits[opts.suit]) ? opts.suit : 'plain';
    run = { test: !!opts.test, daily: daily, drs: daily ? hashStr(daily + '|run') : 0, suit: suit, day: 1, dive: 0, coins: 0, earned: 0, score: 0, gear: {}, charms: [],
      phase: 'boat', over: false, won: false, time: 0, offers: [], reqs: [], reqDone: 0, charmOffer: [],
      lastDive: null, lastQuota: null, map: null, p: null, air: 0, airMax: 0, bag: [], trail: [], ink: 0, slow: 0,
      diveDeep: 0, rs: { dives: 0, emerg: 0, deepest: 0, bestHaul: 0, vents: 0, stolen: 0 } };
    buildStats();
    if (daily) m.daily = { date: daily, done: false, score: 0, won: false, day: 1 };
    startDay(true);
    if (!run.test) {
      m.stats.runs++;
      if (!daily) m.lastSuit = suit;
      saveMeta();
    }
    emit('newrun');
    return run;
  }

  function maxReqZone() { return Math.min(4, Math.floor(run.day / 2)); }

  function startDay(first) {
    run.dive = 0;
    run.phase = 'boat';
    if (!first && run.st.interest > 0 && run.coins > 0) {
      var gain = Math.floor(run.coins * run.st.interest);
      if (gain > 0) { run.coins += gain; run.earned += gain; emit('interest', { gain: gain }); }
    }
    withSeed('d' + run.day + '|boat', function () {
      var cand = DATA.GEAR.filter(function (g) { return (run.gear[g.id] || 0) < 3; }).map(function (g) { return g.id; });
      run.offers = shuffle(cand).slice(0, 3);
      var mz = maxReqZone();
      var pool = DATA.REQUESTS.filter(function (r) { return r.z <= mz && r.z >= mz - 1; });
      run.reqs = shuffle(pool.slice()).slice(0, 2).map(function (r) { return { id: r.id, done: false }; });
    });
    saveRun();
  }

  function saveRun() {
    if (run.test) return;
    var m = meta();
    if (run.phase !== 'boat' || run.over) return;
    var copy = {};
    for (var k in run) if (Object.prototype.hasOwnProperty.call(run, k) && k !== 'map' && k !== 'st') copy[k] = run[k];
    try { m.run = JSON.parse(JSON.stringify(copy)); } catch (e) { m.run = null; }
    saveMeta();
  }

  function canContinue() { var m = meta(); return !!(m.run && !m.run.over); }
  function resume() {
    var m = meta();
    if (!m.run) return null;
    run = m.run;
    run.test = false;
    run.phase = 'boat';
    run.map = null;
    buildStats();
    emit('newrun');
    return run;
  }

  /* ---------- 바다 판 만들기 ---------- */
  function randomTreasure(z) {
    var pool = DATA.TREASURES.filter(function (t) { return t.zone === z; });
    // 값이 낮은 것이 조금 더 자주 나온다
    var total = 0, ws = pool.map(function (t) { var w = 1 / Math.sqrt(t.v); total += w; return w; });
    var r = rnd() * total;
    for (var i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) return pool[i].id; }
    return pool[pool.length - 1].id;
  }

  function genMap() { withSeed('d' + run.day + '|v' + run.dive, buildMap); }
  function buildMap() {
    var day = DATA.DAYS[run.day - 1];
    var cells = [], seen = [], path = {};
    var x, y, i;
    for (y = 0; y < H; y++) {
      var row = [], srow = [];
      for (x = 0; x < W; x++) { row.push({ t: '.' }); srow.push(false); }
      cells.push(row); seen.push(srow);
    }
    // 배에서 바닥까지 막히지 않는 물길
    x = BX;
    path[key(x, 0)] = true; path[key(x, 1)] = true;
    for (y = 2; y < H; y++) {
      path[key(x, y)] = true;
      if (rnd() < 0.55) {
        x = Math.max(1, Math.min(W - 2, x + (rnd() < 0.5 ? -1 : 1)));
        path[key(x, y)] = true;
      }
    }
    // 옆 갈래 물길
    for (i = 0; i < 4; i++) {
      var by = 2 + ri(H - 3), bx = BX, steps = 3 + ri(5), dx = rnd() < 0.5 ? -1 : 1;
      for (var k2 in path) { var ky = Math.floor(k2 / W); if (ky === by) { bx = k2 % W; break; } }
      for (var s = 0; s < steps; s++) {
        bx = Math.max(0, Math.min(W - 1, bx + dx));
        path[key(bx, by)] = true;
      }
    }
    for (y = 1; y < H; y++) {
      var z = DATA.ZONES[zoneOf(y)];
      for (x = 0; x < W; x++) {
        if (path[key(x, y)]) continue;
        var r = rnd();
        if (r < z.rock) cells[y][x].t = '#';
        else if (r < z.rock + z.sand) cells[y][x].t = 's';
        else if (r < z.rock + z.sand + z.kelp) cells[y][x].t = 'k';
        else if (r < z.rock + z.sand + z.kelp + day.current) { cells[y][x].t = 'c'; cells[y][x].dir = pick(['left', 'right', 'down']); }
      }
    }
    // 닿을 수 있는 칸
    var reach = {}, queue = [{ x: BX, y: 1 }], guard = 0;
    reach[key(BX, 1)] = true;
    while (queue.length && guard++ < W * H * 4) {
      var c = queue.shift();
      for (var d in DIRS) {
        var nx = c.x + DIRS[d][0], ny = c.y + DIRS[d][1];
        if (nx < 0 || nx >= W || ny < 1 || ny >= H) continue;
        if (cells[ny][nx].t === '#' || reach[key(nx, ny)]) continue;
        reach[key(nx, ny)] = true;
        queue.push({ x: nx, y: ny });
      }
    }
    var map = { cells: cells, seen: seen, items: {}, cr: [], reach: reach };
    function freeCell(zIdx, minY) {
      var zz = DATA.ZONES[zIdx];
      for (var tries = 0; tries < 80; tries++) {
        var cy = zz.from + ri(zz.to - zz.from + 1), cx = ri(W);
        if (cy < (minY || 1)) continue;
        var kk = key(cx, cy);
        if (!reach[kk] || cells[cy][cx].t === '#' || cells[cy][cx].t === 'b') continue;
        if (map.items[kk]) continue;
        if (cx === BX && cy <= 1) continue;
        var taken = false;
        for (var q = 0; q < map.cr.length; q++) if (map.cr[q].x === cx && map.cr[q].y === cy) { taken = true; break; }
        if (taken) continue;
        return { x: cx, y: cy };
      }
      return null;
    }
    // 공기 구멍
    var vents = 3 + run.st.vent;
    for (i = 0; i < vents; i++) {
      var vz = 1 + ri(DATA.ZONES.length - 1);
      var vc = freeCell(vz, 3);
      if (vc) cells[vc.y][vc.x].t = 'b';
    }
    // 보물
    for (var zi = 0; zi < DATA.ZONES.length; zi++) {
      var cnt = 6 + day.loot + (zi === 0 ? 2 : 0);
      for (i = 0; i < cnt; i++) {
        var fc = freeCell(zi, 1);
        if (fc) map.items[key(fc.x, fc.y)] = { t: randomTreasure(zi) };
      }
    }
    // 생물 — 얕은 여울은 물때가 사나워져도 반만 늘어난다 (깊을수록 위험)
    for (zi = 0; zi < DATA.ZONES.length; zi++) {
      var n = zi === 0 ? 1 + Math.floor(day.hazard / 2) : 1 + day.hazard + Math.floor(zi / 2);
      var pool = DATA.CREATURES.filter(function (cr) { return cr.zone === zi || (cr.zone === zi - 1 && !cr.stay); });
      for (i = 0; i < n; i++) {
        var cc = freeCell(zi, 2);
        if (cc) map.cr.push({ t: pick(pool).id, x: cc.x, y: cc.y });
      }
    }
    run.map = map;
  }

  /* ---------- 잠수 ---------- */
  function startDive() {
    if (!run || run.over || run.phase !== 'boat') return false;
    genMap();
    run.airMax = run.st.airMax + (run.dive === 0 ? run.st.firstAir : 0);
    run.air = run.airMax;
    run.p = { x: BX, y: 0 };
    run.trail = [{ x: BX, y: 0 }];
    run.bag = [];
    run.ink = 0; run.slow = 0; run.diveDeep = 0;
    run.phase = 'dive';
    run.rs.dives++;
    reveal();
    emit('dive', { dive: run.dive + 1 });
    return true;
  }

  function canSurfaceWalk() { return run.bag.length > 0 || run.air <= run.airMax * 0.25; }

  function canMove(dir) {
    if (!run || run.phase !== 'dive') return false;
    var d = DIRS[dir];
    if (!d) return false;
    var p = run.p, nx = p.x + d[0], ny = p.y + d[1];
    if (p.y === 0) return dir === 'down' && cellAt(BX, 1).t !== '#';
    if (nx < 0 || nx >= W || ny < 0 || ny >= H) return false;
    if (ny === 0) return nx === BX && canSurfaceWalk();
    return cellAt(nx, ny).t !== '#';
  }

  function radius() {
    var r = run.st.radius;
    if (run.ink > 0 && !run.st.inkImmune) r -= 1;
    return Math.max(1, r);
  }
  function reveal(extra) {
    var r = extra || radius(), p = run.p, seen = run.map.seen;
    for (var dy = -r; dy <= r; dy++) {
      for (var dx = -r; dx <= r; dx++) {
        var x = p.x + dx, y = p.y + dy;
        if (x >= 0 && x < W && y >= 0 && y < H) seen[y][x] = true;
      }
    }
  }

  function move(dir) {
    if (!canMove(dir)) { emit('bump'); return false; }
    var d = DIRS[dir], p = run.p;
    var nx = p.x + d[0], ny = p.y + d[1];
    var cell = cellAt(nx, ny);
    var cost = cellCost(dir, cell, stepBase());
    if (run.slow > 0) { cost += 1; run.slow--; }
    run.air -= cost;
    if (run.ink > 0) run.ink--;
    p.x = nx; p.y = ny;
    run.trail.push({ x: nx, y: ny });
    emit('step', { cost: cost, dir: dir });
    if (ny === 0) { surface(false, 'walk'); return true; }
    if (cell.t === 's') {
      cell.t = '.';
      emit('dig');
      var kk = key(nx, ny);
      if (!run.map.items[kk] && rnd() < 0.2 + run.st.digLuck) {
        run.map.items[kk] = { t: randomTreasure(zoneOf(ny)) };
        emit('found', { x: nx, y: ny });
      }
    }
    if (cell.t === 'b') {
      var add = 8 + run.st.bubble;
      run.air = Math.min(run.airMax, run.air + add);
      cell.t = '.';
      run.rs.vents++;
      if (!run.test) meta().stats.vents++;
      emit('vent', { add: add });
    }
    arrive();
    if (cell.t === 'c' && run.phase === 'dive') {
      var cd = DIRS[cell.dir];
      var cx = p.x + cd[0], cy = p.y + cd[1];
      if (cx >= 0 && cx < W && cy >= 1 && cy < H && cellAt(cx, cy).t !== '#') {
        p.x = cx; p.y = cy;
        run.trail.push({ x: cx, y: cy });
        emit('current', { dir: cell.dir });
        arrive();
      }
    }
    if (run.phase !== 'dive') return true;
    moveCreatures();
    if (run.phase !== 'dive') return true;
    reveal();
    if (run.air <= 0) { run.air = 0; surface(true, 'empty'); }
    else if (run.air <= run.airMax * 0.2) emit('lowair');
    return true;
  }

  function arrive() {
    var p = run.p;
    if (p.y > run.diveDeep) run.diveDeep = p.y;
    if (p.y > run.rs.deepest) run.rs.deepest = p.y;
    if (!run.test) {
      var m = meta();
      if (p.y > m.stats.deepest) m.stats.deepest = p.y;
      var z = zoneOf(p.y);
      var zl = ['', 'l09', 'l10', 'l11', 'l12'][z];
      if (zl) unlockLog(zl);
      if (p.y >= H - 1) unlockLog('l18');
    }
    pickupAt();
    for (var i = 0; i < run.map.cr.length; i++) {
      var c = run.map.cr[i];
      if (c.x === p.x && c.y === p.y) { hit(c); break; }
    }
  }

  function pickupAt() {
    var p = run.p, kk = key(p.x, p.y), it = run.map.items[kk];
    if (!it) return;
    var def = T_BY[it.t];
    if (load() + def.w > run.st.maxLoad) { emit('heavy', { def: def }); return; }
    run.bag.push({ t: it.t });
    delete run.map.items[kk];
    if (!run.test) meta().seen.t[it.t] = 1;
    emit('pick', { def: def, x: p.x, y: p.y, step: stepBase() });
  }

  function lightest() {
    var bi = -1, bw = Infinity;
    run.bag.forEach(function (b, i) { var w = T_BY[b.t].w; if (w < bw) { bw = w; bi = i; } });
    return bi;
  }
  function priciest() {
    var bi = -1, bv = -1;
    run.bag.forEach(function (b, i) { var v = T_BY[b.t].v; if (v > bv) { bv = v; bi = i; } });
    return bi;
  }
  function worst() {
    var bi = -1, br = Infinity;
    run.bag.forEach(function (b, i) { var d = T_BY[b.t]; var r = d.v / d.w; if (r < br) { br = r; bi = i; } });
    return bi;
  }

  function applyFx(fx, p, c) {
    var i, idx, gone;
    switch (fx) {
      case 'sting':
        var dmg = Math.max(1, Math.round(p * (1 + run.st.stingMul)));
        run.air -= dmg;
        emit('sting', { dmg: dmg });
        break;
      case 'pinch':
        if (run.st.pinchImmune) { emit('block', { what: '집게' }); break; }
        for (i = 0; i < p && run.bag.length; i++) {
          idx = lightest(); gone = run.bag.splice(idx, 1)[0];
          emit('lose', { def: T_BY[gone.t], how: 'pinch' });
        }
        break;
      case 'steal':
        for (i = 0; i < p && run.bag.length; i++) {
          if (rnd() < run.st.stealImmune) { emit('block', { what: '이빨' }); continue; }
          idx = priciest(); gone = run.bag.splice(idx, 1)[0];
          run.rs.stolen++;
          if (!run.test) { meta().stats.stolen++; unlockLog('l16'); }
          emit('lose', { def: T_BY[gone.t], how: 'steal' });
        }
        break;
      case 'ink':
        if (run.st.inkImmune) { emit('block', { what: '먹물' }); break; }
        run.ink = Math.max(run.ink, p);
        emit('ink', { n: p });
        break;
      case 'push':
        var moved = 0;
        for (i = 0; i < p; i++) {
          if (run.p.y - 1 >= 1 && cellAt(run.p.x, run.p.y - 1).t !== '#') { run.p.y--; moved++; run.trail.push({ x: run.p.x, y: run.p.y }); }
        }
        emit('push', { n: moved });
        break;
      case 'slow':
        run.slow += p;
        emit('slow', { n: p });
        break;
      case 'gift':
        run.air = Math.min(run.airMax, run.air + p);
        emit('gift', { n: p });
        break;
      case 'guide':
        reveal(p);
        emit('guide', { n: p });
        break;
    }
  }

  function hit(c) {
    var def = C_BY[c.t];
    if (!run.test) {
      meta().seen.c[c.t] = 1;
      if (c.t === 'whale') unlockLog('l17');
    }
    emit('creature', { def: def, x: c.x, y: c.y });
    applyFx(def.fx, def.p, c);
    if (def.fx2) applyFx(def.fx2, def.p2, c);
    if (!def.stay) {
      var at = run.map.cr.indexOf(c);
      if (at >= 0) run.map.cr.splice(at, 1);
    }
  }

  function moveCreatures() {
    var list = run.map.cr.slice();
    for (var i = 0; i < list.length; i++) {
      var c = list[i], def = C_BY[c.t];
      if (!def.mover || run.map.cr.indexOf(c) < 0) continue;
      if (rnd() < 0.5) continue;
      var dn = pick(['up', 'down', 'left', 'right']), d = DIRS[dn];
      var nx = c.x + d[0], ny = c.y + d[1];
      if (nx < 0 || nx >= W || ny < 2 || ny >= H) continue;
      if (cellAt(nx, ny).t === '#') continue;
      var busy = false;
      for (var j = 0; j < run.map.cr.length; j++) if (run.map.cr[j] !== c && run.map.cr[j].x === nx && run.map.cr[j].y === ny) busy = true;
      if (busy) continue;
      c.x = nx; c.y = ny;
      if (nx === run.p.x && ny === run.p.y) {
        hit(c);
        if (run.phase !== 'dive') return;
      }
    }
  }

  function canDrop() {
    if (!run || run.phase !== 'dive' || !run.bag.length) return false;
    return stepBase() > 1 || load() >= run.st.maxLoad;
  }
  /* 값 ÷ 무게가 가장 낮은 것을 버린다. 버린 것은 그 칸에 가라앉는다 */
  function drop() {
    if (!canDrop()) return false;
    var idx = worst(), gone = run.bag.splice(idx, 1)[0];
    var kk = key(run.p.x, run.p.y);
    if (!run.map.items[kk]) run.map.items[kk] = { t: gone.t, dropped: true };
    emit('drop', { def: T_BY[gone.t], step: stepBase() });
    return true;
  }

  function canPull() { return !!(run && run.phase === 'dive' && run.bag.length && run.p.y > 0); }
  /* 줄 당기기: 지금 무게로 배까지 가장 싼 길의 산소를 한 번에 내고 올라간다. 모자라면 비상 부표 */
  function pull() {
    if (!canPull()) return false;
    var info = returnInfo();
    if (run.air >= info.need) {
      run.air -= info.need;
      emit('pull', { need: info.need });
      surface(false, 'pull');
    } else {
      run.air = 0;
      emit('pull', { need: info.need, fail: true });
      surface(true, 'pull');
    }
    return true;
  }

  /* ---------- 물 위로 ---------- */
  function surface(emergency, how) {
    var kept = run.bag.slice(), lost = [];
    if (emergency) {
      shuffle(kept);
      var keepN = Math.floor(kept.length * run.st.keep);
      lost = kept.splice(keepN);
      run.rs.emerg++;
      if (!run.test) { meta().stats.emergencies++; unlockLog('l13'); }
    }
    var total = 0, weight = 0, lines = [];
    kept.forEach(function (it) {
      var def = T_BY[it.t];
      var mul = 1 + run.st.valAll + (run.st['val' + def.zone] || 0);
      var v = Math.max(1, Math.round(def.v * mul));
      total += v; weight += def.w;
      lines.push({ def: def, v: v });
    });
    var reqGain = 0, reqDone = [];
    run.reqs.forEach(function (r) {
      if (r.done) return;
      var R = R_BY[r.id], ok = false, cnt;
      if (R.kind === 'item') { cnt = kept.filter(function (k) { return k.t === R.t; }).length; ok = cnt >= R.n; }
      else if (R.kind === 'zone') { cnt = kept.filter(function (k) { return T_BY[k.t].zone === R.zone; }).length; ok = cnt >= R.n; }
      else if (R.kind === 'haul') ok = total >= R.v;
      else if (R.kind === 'depth') ok = run.diveDeep >= R.row;
      else if (R.kind === 'weight') ok = weight >= R.w;
      if (ok) {
        r.done = true;
        var g = Math.round(R.reward * (1 + run.st.reqMul));
        reqGain += g; run.reqDone++;
        reqDone.push({ text: R.text, g: g });
      }
    });
    var gain = total + reqGain;
    run.coins += gain;
    run.earned += gain;
    run.score += Math.round(gain * (1 + run.st.score)) + run.diveDeep;
    if (total > run.rs.bestHaul) run.rs.bestHaul = total;
    run.lastDive = { lines: lines, lost: lost.map(function (l) { return T_BY[l.t]; }), total: total, reqGain: reqGain,
      reqDone: reqDone, emergency: emergency, how: how, deep: run.diveDeep, airLeft: Math.max(0, run.air), weight: weight,
      dive: run.dive + 1, day: run.day };
    if (!run.test) {
      var m = meta();
      m.stats.dives++;
      m.stats.totalEarned += gain;
      m.stats.requests += reqDone.length;
      if (total > m.stats.bestHaul) m.stats.bestHaul = total;
      if (weight > m.stats.bestWeight) m.stats.bestWeight = weight;
      if (reqDone.length) unlockLog('l14');
      if (total >= 100) unlockLog('l19');
    }
    run.bag = [];
    run.dive++;
    run.phase = 'boat';
    emit('surface', run.lastDive);
    checkAch();
    if (run.dive >= DATA.DIVES) dayEnd();
    else saveRun();
  }

  function dayEnd() {
    var q = quota();
    run.lastQuota = { q: q, had: run.coins, day: run.day, ok: run.coins >= q };
    if (run.coins >= q) {
      run.coins -= q;
      emit('quota', run.lastQuota);
      if (!run.test) {
        unlockLog('l0' + Math.min(8, run.day));
        var m = meta();
        if (run.day > m.stats.bestDay) m.stats.bestDay = run.day;
      }
      if (run.day >= DATA.DAY_MAX) { finish(true); return; }
      run.phase = 'charm';
      offerCharms();
      checkAch();
    } else {
      emit('quota', run.lastQuota);
      finish(false);
    }
  }

  function offerCharms() {
    var pool = DATA.CHARMS.filter(function (c) { return run.charms.indexOf(c.id) < 0; });
    var out = [], guard = 0;
    withSeed('d' + run.day + '|charm', function () {
      while (out.length < 3 && pool.length && guard++ < 200) {
        var total = 0;
        var ws = pool.map(function (c) { var w = c.rar === 1 ? 6 : c.rar === 2 ? 3 + run.day * 0.3 : 1 + run.day * 0.3; total += w; return w; });
        var r = rnd() * total, chosen = pool.length - 1;
        for (var i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) { chosen = i; break; } }
        out.push(pool[chosen].id);
        pool.splice(chosen, 1);
      }
    });
    run.charmOffer = out;
  }

  function pickCharm(i) {
    if (!run || run.phase !== 'charm') return false;
    var id = run.charmOffer[i];
    if (!id) return false;
    run.charms.push(id);
    if (!run.test) { var m = meta(); m.seen.g[id] = 1; m.stats.charms++; }
    buildStats();
    run.day++;
    emit('charm', { def: CH_BY[id] });
    checkAch();
    startDay(false);
    emit('day', { day: run.day });
    return true;
  }

  /* ---------- 가게 ---------- */
  function offerInfo(i) {
    var id = run.offers[i];
    if (!id) return null;
    var g = G_BY[id], lv = run.gear[id] || 0;
    if (lv >= 3) return { g: g, lv: lv, max: true, price: 0, ok: false };
    var price = g.levels[lv].price;
    return { g: g, lv: lv, max: false, price: price, ok: price <= spare(), next: g.levels[lv] };
  }
  /* 납품 몫은 장부가 묶어 둔다 — 가진 동전에서 오늘 목표를 뺀 여윳돈으로만 산다 */
  function canBuy(i) {
    if (!run || run.phase !== 'boat') return false;
    var o = offerInfo(i);
    return !!(o && o.ok);
  }
  function buy(i) {
    if (!canBuy(i)) { emit('nobuy'); return false; }
    var o = offerInfo(i);
    run.coins -= o.price;
    run.gear[o.g.id] = o.lv + 1;
    buildStats();
    if (!run.test) { meta().stats.bought++; unlockLog('l15'); }
    emit('buy', { g: o.g, lv: o.lv + 1, price: o.price });
    checkAch();
    saveRun();
    return true;
  }

  /* ---------- 판 끝 ---------- */
  function finish(won) {
    run.over = true;
    run.won = won;
    run.phase = 'over';
    var bonus = won ? 150 : 0;
    run.score += bonus + (run.day - (won ? 0 : 1)) * 10;
    var shards = (won ? run.day + 4 : run.day - 1);
    run.shards = Math.max(0, shards);
    if (!run.test) {
      var m = meta();
      m.shards += run.shards;
      if (won) {
        m.stats.wins++;
        unlockLog('l08');
        if (!run.rs.emerg) m.stats.cleanWins++;
      } else {
        m.stats.deathsByDay[run.day] = (m.stats.deathsByDay[run.day] || 0) + 1;
      }
      run.best = run.score > m.stats.bestScore;
      if (run.score > m.stats.bestScore) m.stats.bestScore = run.score;
      if (run.daily && m.daily && m.daily.date === run.daily) {
        m.daily.done = true; m.daily.score = run.score; m.daily.won = won; m.daily.day = run.day;
      }
      m.run = null;
      checkAch();
      saveMeta();
    }
    emit('over', { won: won });
  }

  function quit() {
    if (!run) return;
    if (!run.over) finish(false);
  }

  /* ---------- 업적·일지 ---------- */
  function unlockLog(id) {
    if (!run || run.test) return;
    var m = meta();
    if (m.log[id]) return;
    m.log[id] = 1;
    emit('log', { id: id });
  }
  function giveAch(id) {
    var m = meta();
    if (m.ach[id]) return;
    m.ach[id] = 1;
    m.shards += 1;
    var def = DATA.ACHS.filter(function (a) { return a.id === id; })[0];
    emit('ach', { def: def });
  }
  function checkAch() {
    if (!run || run.test) return;
    var m = meta(), s = m.stats, ld = run.lastDive;
    if (s.dives >= 1) giveAch('a01');
    if (s.deepest >= 5) giveAch('a02');
    if (s.deepest >= 10) giveAch('a03');
    if (s.deepest >= 15) giveAch('a04');
    if (s.deepest >= 20) giveAch('a05');
    if (s.deepest >= H - 1) giveAch('a06');
    if (run.lastQuota && run.lastQuota.ok) giveAch('a07');
    if (s.wins >= 1) giveAch('a08');
    if (s.bestHaul >= 50) giveAch('a09');
    if (s.bestHaul >= 120) giveAch('a10');
    if (run.reqDone >= 10) giveAch('a11');
    if (s.vents >= 20) giveAch('a12');
    if (s.cleanWins >= 1) giveAch('a13');
    if (s.bestWeight >= 20) giveAch('a14');
    for (var g in run.gear) if (run.gear[g] >= 3) giveAch('a15');
    if (run.charms.length >= 6) giveAch('a16');
    if (s.stolen >= 5) giveAch('a17');
    if (s.dives >= 100) giveAch('a18');
    var deepAll = DATA.TREASURES.filter(function (t) { return t.zone === 4; }).every(function (t) { return m.seen.t[t.id]; });
    if (deepAll) giveAch('a19');
    if (ld && !ld.emergency && ld.how === 'walk' && ld.airLeft <= 3) giveAch('a20');
    saveMeta();
  }

  function buySuit(id) {
    var m = meta(), s = S_BY[id];
    if (!s || m.suits[id] || m.shards < s.cost) return false;
    m.shards -= s.cost;
    m.suits[id] = true;
    m.lastSuit = id;
    unlockLogDirect('l20');
    saveMeta();
    return true;
  }
  function unlockLogDirect(id) { var m = meta(); if (!m.log[id]) m.log[id] = 1; }

  /* ---------- 시험 훅이 쓰는 행동 목록 ---------- */
  function actions() {
    if (!run || run.over) return [];
    var a = [];
    if (run.phase === 'boat') {
      a.push('dive');
      for (var i = 0; i < run.offers.length; i++) if (canBuy(i)) a.push('buy' + i);
    } else if (run.phase === 'dive') {
      ['up', 'down', 'left', 'right'].forEach(function (d) { if (canMove(d)) a.push(d); });
      if (canPull()) a.push('pull');
      if (canDrop()) a.push('drop');
    } else if (run.phase === 'charm') {
      for (var j = 0; j < run.charmOffer.length; j++) a.push('charm' + j);
    }
    return a;
  }
  function act(a) {
    if (!run || run.over || typeof a !== 'string') return false;
    if (a === 'dive') return startDive();
    if (a.indexOf('buy') === 0) return buy(parseInt(a.slice(3), 10));
    if (a.indexOf('charm') === 0) return pickCharm(parseInt(a.slice(5), 10));
    if (a === 'pull') return pull();
    if (a === 'drop') return drop();
    if (DIRS[a]) return move(a);
    return false;
  }

  function addTime(sec) { if (run && !run.over) run.time += sec; }

  return {
    newRun: newRun, resume: resume, canContinue: canContinue, canDaily: canDaily, dailyInfo: dailyInfo, startDive: startDive, move: move, canMove: canMove,
    pull: pull, canPull: canPull, drop: drop, canDrop: canDrop, buy: buy, canBuy: canBuy, offerInfo: offerInfo,
    pickCharm: pickCharm, quit: quit, actions: actions, act: act, drain: drain, addTime: addTime,
    run: function () { return run; }, load: function () { return run ? load() : 0; },
    stepBase: function () { return run ? stepBase() : 1; }, returnInfo: returnInfo, quota: function () { return run ? quota() : 0; },
    spare: function () { return run ? spare() : 0; }, zoneOf: zoneOf, radius: function () { return run ? radius() : 1; },
    buySuit: buySuit, T: T_BY, C: C_BY, G: G_BY, CH: CH_BY, S: S_BY, R: R_BY
  };
})();

window.__test = {
  reset: function (seed) {
    if (window.UI && UI.enterTest) UI.enterTest();
    Store.useTemp();
    Game.newRun({ suit: 'plain', test: true });
    return true;
  },
  actions: function () { return Game.actions(); },
  act: function (a) { var r = Game.act(a); Game.drain(); return r; },
  advance: function (ms) { Game.addTime((ms || 0) / 1000); Game.drain(); },
  state: function () {
    var r = Game.run();
    return { over: !!(r && r.over), won: !!(r && r.won), stage: r ? Math.min(r.day, DATA.DAY_MAX) : 1, stageMax: DATA.DAY_MAX, time: r ? r.time : 0 };
  }
};
