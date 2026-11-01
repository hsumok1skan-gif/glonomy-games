/* Myco Weave — 규칙 (화면과 시험 훅이 같은 함수를 부른다) */
window.Game = (function () {
  var D = window.DATA;
  var R = 4;                 // 판 반지름 (61칸)
  var BASE_INCOME = 3;
  var BASE_ENERGY = 6;
  var BASE_CAP = 24;
  var BASE_HEART = 5;
  var BASE_LOSS = 3;         // 거리 손실: 이 칸 수마다 1씩 준다
  var BASE_WITHER = 2;       // 끊긴 칸이 버티는 날
  var FRUIT_COST = 4;
  var THICK_COST = 2;
  var MOLD_CAP = 16;
  var THREAT_CAP = 24;

  // ---------- 판 모양 ----------
  var DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  var HEX = [];
  var IDX = {};
  (function () {
    for (var r = -R; r <= R; r++) {
      for (var q = -R; q <= R; q++) {
        var s = -q - r;
        if (Math.abs(s) > R) continue;
        IDX[q + ',' + r] = HEX.length;
        HEX.push({ q: q, r: r });
      }
    }
  })();
  var NB = HEX.map(function (h) {
    var out = [];
    DIRS.forEach(function (d) {
      var k = (h.q + d[0]) + ',' + (h.r + d[1]);
      if (IDX[k] !== undefined) out.push(IDX[k]);
    });
    return out;
  });
  var CENTER = IDX['0,0'];
  function hd(a, b) {
    var A = HEX[a], B = HEX[b];
    return (Math.abs(A.q - B.q) + Math.abs(A.r - B.r) + Math.abs((-A.q - A.r) - (-B.q - B.r))) / 2;
  }
  var EDGE = [];
  for (var ei = 0; ei < HEX.length; ei++) if (hd(ei, CENTER) === R) EDGE.push(ei);

  // ---------- 도움 함수 ----------
  var G = null;
  var listeners = [];
  function emit(type, o) {
    o = o || {};
    o.type = type;
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](o); } catch (e) { /* 화면 쪽 오류가 규칙을 멈추지 않게 */ }
    }
  }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function weighted(list, wf) {
    var sum = 0, i;
    for (i = 0; i < list.length; i++) sum += Math.max(0, wf(list[i]));
    if (sum <= 0) return list[0] || null;
    var x = Math.random() * sum;
    for (i = 0; i < list.length; i++) { x -= Math.max(0, wf(list[i])); if (x <= 0) return list[i]; }
    return list[list.length - 1];
  }
  function seen(group, id) {
    if (G && !G.sim && window.Store) window.Store.markSeen(group, id);
  }
  function strainDef() { return byId(D.STRAINS, G.strain) || D.STRAINS[0]; }
  function diffDef() { return byId(D.DIFFS, G.diff) || D.DIFFS[1]; }
  function forestDef() { return D.FORESTS[G.forest]; }
  function threatDef(id) { return byId(D.THREATS, id); }
  function treeDef(id) { return byId(D.TREES, id); }
  function mushDef(id) { return byId(D.MUSHROOMS, id); }

  // 형질 + 균주 효과 합
  function mod(key) {
    var v = 0;
    var s = strainDef();
    if (s.fx && s.fx[key]) v += s.fx[key];
    for (var i = 0; i < G.traits.length; i++) {
      var t = byId(D.TRAITS, G.traits[i]);
      if (t && t.fx[key]) v += t.fx[key];
    }
    return v;
  }
  function cap() { return BASE_CAP + mod('cap'); }
  function say(msg) {
    G.log.unshift(msg);
    if (G.log.length > 30) G.log.length = 30;
  }

  // ---------- 새 판 ----------
  function newRun(opts) {
    opts = opts || {};
    G = {
      v: 1,
      strain: opts.strain || 'white',
      diff: opts.diff || 'normal',
      sim: !!opts.sim,
      forest: 0,
      traits: [],
      heartMax: 0, heart: 0,
      totalSpores: 0, score: 0,
      phase: 'intro', over: false, won: false, endWhy: '',
      simTime: 0,
      reward: [],
      log: [],
      stats: {
        grown: 0, mush: 0, kinds: {}, kills: 0, bossKills: 0, digest: 0, thick: 0, bounces: 0,
        heartHits: 0, cleared: 0, fastest: 0, skills: 0, events: 0, maxIncome: 0, maxPartners: 0, lost: 0
      }
    };
    var s = strainDef();
    G.heartMax = Math.max(2, BASE_HEART + (s.heart || 0) + diffDef().heart);
    G.heart = G.heartMax;
    seen('strain', s.id);
    setupForest();
    emit('newRun');
    return G;
  }

  function setupForest() {
    var F = forestDef();
    G.day = 1;
    G.days = F.days + mod('daysPlus');
    G.goal = Math.max(4, Math.ceil(F.goal * diffDef().goal * (1 - mod('goalCut') / 100)));
    G.spores = 0;
    G.threats = [];
    G.energy = BASE_ENERGY + (strainDef().startEnergy || 0) + mod('startEnergy');
    G.skillCd = 0;
    G.today = {};
    G.growsToday = 0;
    G.growCount = 0;
    G.partnerSeen = {};
    G.lastIncome = 0;
    G.incomeParts = [];
    G.phase = 'intro';
    G.log = [];
    G.hexes = genBoard(F);
    say(F.name + ' — 포자 ' + G.goal + '개를 ' + G.days + '일 안에 모은다.');
  }

  function genBoard(F) {
    var tries = 0;
    while (tries < 40) {
      tries++;
      var hs = makeBoard(F);
      if (boardOk(hs)) return hs;
    }
    // 상한에 걸리면 바위를 모두 흙으로 바꿔 쓴다
    var fb = makeBoard(F);
    fb.forEach(function (h) { if (h.t === 'rock') h.t = 'soil'; });
    return fb;
  }

  function makeBoard(F) {
    var hs = HEX.map(function () {
      return { t: 'soil', tree: null, owned: false, heart: false, thick: 0, mush: null, wither: 0, wasLog: false, frozen: 0, guard: 0 };
    });
    hs[CENTER].owned = true;
    hs[CENTER].heart = true;
    var near = NB[CENTER];
    var ring2 = [], rest = [];
    for (var i = 0; i < HEX.length; i++) {
      if (i === CENTER || near.indexOf(i) >= 0) continue;
      if (hd(i, CENTER) === 2) ring2.push(i); else rest.push(i);
    }
    shuffle(ring2); shuffle(rest);
    // 나무: 하나는 두 칸 거리에
    var treeSpots = [ring2.shift()];
    var pool = shuffle(ring2.concat(rest));
    var oldUsed = false;
    while (treeSpots.length < F.trees && pool.length) treeSpots.push(pool.shift());
    treeSpots.forEach(function (ix) {
      var td = weighted(D.TREES, function (t) { return (t.id === 'oldoak' && oldUsed) ? 0 : t.weight; });
      if (td.id === 'oldoak') oldUsed = true;
      hs[ix].t = 'tree';
      hs[ix].tree = td.id;
    });
    function put(type, n) {
      for (var k = 0; k < n && pool.length; k++) hs[pool.shift()].t = type;
    }
    put('rock', F.rock);
    put('log', F.log);
    put('litter', F.litter);
    put('dry', F.dry);
    put('moist', F.moist);
    // 심장 둘레 둘은 젖은 흙
    shuffle(near.slice()).slice(0, 2).forEach(function (ix) { hs[ix].t = 'moist'; });
    return hs;
  }

  function passable(h) { return h.t !== 'rock' && h.t !== 'tree'; }

  function boardOk(hs) {
    var seenA = new Uint8Array(HEX.length);
    var q = [CENTER]; seenA[CENTER] = 1;
    var guard = 0;
    while (q.length && guard < 500) {
      guard++;
      var c = q.shift();
      NB[c].forEach(function (n) { if (!seenA[n] && passable(hs[n])) { seenA[n] = 1; q.push(n); } });
    }
    for (var i = 0; i < HEX.length; i++) {
      if (passable(hs[i]) && !seenA[i]) return false;
      if (hs[i].t === 'tree') {
        var ok = NB[i].some(function (n) { return seenA[n]; });
        if (!ok) return false;
      }
    }
    return true;
  }

  // ---------- 흐름 (망 이어짐·거리) ----------
  function flow() {
    var n = HEX.length;
    var conn = new Uint8Array(n);
    var dist = new Array(n);
    for (var i = 0; i < n; i++) dist[i] = 99;
    var hs = G.hexes;
    var q = [CENTER]; conn[CENTER] = 1; dist[CENTER] = 0;
    var head = 0;
    while (head < q.length) {
      var c = q[head++];
      var nb = NB[c];
      for (var k = 0; k < nb.length; k++) {
        var m = nb[k];
        if (conn[m]) continue;
        var h = hs[m];
        if (!h.owned || h.frozen > 0) continue;
        conn[m] = 1; dist[m] = dist[c] + 1; q.push(m);
      }
    }
    return { conn: conn, dist: dist };
  }

  function partners(f) {
    var out = [];
    var hs = G.hexes;
    for (var i = 0; i < HEX.length; i++) {
      if (hs[i].t !== 'tree') continue;
      var best = 99;
      NB[i].forEach(function (m) { if (f.conn[m] && f.dist[m] + 1 < best) best = f.dist[m] + 1; });
      if (best < 99) out.push({ i: i, d: best });
    }
    return out;
  }

  function lossStepFor(td) {
    if (td.fx === 'far') return 2;
    return BASE_LOSS + mod('lossStep');
  }

  // 오늘 수입과 그 내역
  function incomeDetail(f, opt) {
    opt = opt || {};
    var hs = G.hexes;
    var parts = [];
    var base = BASE_INCOME + (strainDef().income || 0) + mod('income');
    parts.push({ label: '심장', v: base });
    var lit = 0, moist = 0;
    for (var i = 0; i < HEX.length; i++) {
      if (!f.conn[i]) continue;
      if (hs[i].t === 'litter') lit++;
      if (hs[i].t === 'moist') moist++;
    }
    if (lit) parts.push({ label: '낙엽 ' + lit + '칸', v: lit * (1 + mod('litterIncome')) });
    var mi = mod('moistIncome');
    if (mi && moist >= 4) parts.push({ label: '이슬', v: Math.floor(moist / 4) * mi });
    var ps = partners(f);
    var pull = opt.pull !== undefined ? opt.pull : G.today.pull;
    ps.forEach(function (p) {
      var td = treeDef(hs[p.i].tree);
      var y = td.yield + mod('treeYield') + (G.today.sun ? 1 : 0) + (pull ? 1 : 0);
      if (G.today.frost) y = Math.floor(y / 2);
      var loss = pull ? 0 : Math.floor((p.d - 1) / lossStepFor(td));
      var v = Math.max(0, y - loss);
      parts.push({ label: td.name, v: v, tree: p.i, d: p.d, loss: loss });
    });
    var pb = mod('partnerBonus');
    if (pb && ps.length >= 3) parts.push({ label: '숲 이웃', v: Math.floor(ps.length / 3) * pb });
    var total = 0;
    parts.forEach(function (p) { total += p.v; });
    return { total: total, parts: parts, partners: ps };
  }

  // ---------- 비용과 가능 여부 ----------
  function adjTree(i, fx) {
    var hs = G.hexes;
    return NB[i].some(function (m) {
      if (hs[m].t !== 'tree') return false;
      if (!fx) return true;
      var td = treeDef(hs[m].tree);
      return td && td.fx === fx;
    });
  }
  function threatAt(i) {
    for (var k = 0; k < G.threats.length; k++) if (G.threats[k].at === i) return G.threats[k];
    return null;
  }
  function moldAt(i) {
    var t = threatAt(i);
    return t && threatDef(t.id).kind === 'spreader' ? t : null;
  }

  function growCost(i) {
    var h = G.hexes[i];
    var mold = moldAt(i);
    if (mold) {
      return Math.max(1, 2 + mold.hp - mod('digestCost') - (G.today.dissolve ? 1 : 0));
    }
    if (mod('freeGrow') > 0 && G.growsToday === 0) return 0;
    var c = D.TERRAIN[h.t].cost;
    if (h.t === 'moist') c -= mod('growMoist');
    if (h.t === 'dry') c -= mod('growDry');
    if (h.t === 'soil') c -= mod('growSoil');
    if (h.t === 'litter') c -= mod('growLitter');
    if (adjTree(i, 'growCheap')) c -= 1;
    c -= (G.today.rain || 0);
    return Math.max(0, c);
  }
  function canGrow(i, f) {
    if (!G || G.phase !== 'play') return false;
    var h = G.hexes[i];
    if (!h || h.owned || !passable(h)) return false;
    var t = threatAt(i);
    if (t && threatDef(t.id).kind !== 'spreader') return false;
    f = f || flow();
    var ok = false;
    for (var k = 0; k < NB[i].length; k++) if (f.conn[NB[i][k]]) { ok = true; break; }
    if (!ok) return false;
    return G.energy >= growCost(i);
  }
  function fruitCost(i) {
    var c = FRUIT_COST - mod('fruitCost');
    if (G.hexes[i].t === 'moist') c -= 1;
    return Math.max(1, c);
  }
  function canFruit(i, f) {
    if (!G || G.phase !== 'play') return false;
    var h = G.hexes[i];
    if (!h || !h.owned || h.heart || h.mush) return false;
    if (threatAt(i)) return false;
    f = f || flow();
    if (!f.conn[i]) return false;
    return G.energy >= fruitCost(i);
  }
  function thickMax() { return 1 + mod('thickMax'); }
  function thickCost(i) {
    var c = THICK_COST - mod('thickCost');
    if (adjTree(i, 'thickCheap')) c -= 1;
    return Math.max(1, c);
  }
  function canThick(i) {
    if (!G || G.phase !== 'play') return false;
    var h = G.hexes[i];
    if (!h || !h.owned || h.heart) return false;
    if (h.thick >= thickMax()) return false;
    return G.energy >= thickCost(i);
  }
  function canSkill() { return !!G && G.phase === 'play' && G.skillCd <= 0; }

  // 안 되는 까닭 — canGrow·canFruit·canThick 와 같은 검사 순서. 되면 '' 를 돌려준다.
  function lackMsg(need) { return '기운 부족 (필요 ' + need + ', 있음 ' + G.energy + ')'; }
  function why(i, mode, f) {
    if (!G) return '판이 없다';
    if (G.phase !== 'play') return '지금은 행동할 수 없다';
    var h = G.hexes[i];
    if (!h) return '판 밖이다';
    var t = threatAt(i);
    if (mode === 'grow') {
      if (h.heart) return '심장 칸이다';
      if (h.owned) return '이미 망 칸';
      if (!passable(h)) return '바위·나무에는 못 뻗는다';
      if (t && threatDef(t.id).kind !== 'spreader') return '위협이 있다';
      f = f || flow();
      var ok = false;
      for (var k = 0; k < NB[i].length; k++) if (f.conn[NB[i][k]]) { ok = true; break; }
      if (!ok) return '이어진 망에 붙은 칸이 아니다';
      if (G.energy < growCost(i)) return lackMsg(growCost(i));
      return '';
    }
    if (mode === 'fruit') {
      if (!h.owned) return '망 칸이 아니다';
      if (h.heart) return '심장에는 못 피운다';
      if (h.mush) return '이미 버섯';
      if (t) return '위협이 있다';
      f = f || flow();
      if (!f.conn[i]) return '끊긴 칸에는 못 피운다';
      if (G.energy < fruitCost(i)) return lackMsg(fruitCost(i));
      return '';
    }
    if (mode === 'thick') {
      if (!h.owned) return '망 칸이 아니다';
      if (h.heart) return '심장은 굵힐 수 없다';
      if (h.thick >= thickMax()) return '최대 굵기 (' + thickMax() + ')';
      if (G.energy < thickCost(i)) return lackMsg(thickCost(i));
      return '';
    }
    return '';
  }

  // ---------- 행동 ----------
  function grow(i) {
    var f = flow();
    if (!canGrow(i, f)) { emit('deny', { i: i }); return false; }
    var h = G.hexes[i];
    var cost = growCost(i);
    G.energy -= cost;
    var mold = moldAt(i);
    if (mold) {
      removeThreat(mold);
      G.stats.digest++;
      emit('digest', { i: i, cost: cost });
      say('곰팡이를 삭였다.');
    }
    h.owned = true;
    h.wither = 0;
    h.thick = 0;
    if (h.t === 'log') {
      var gain = 5 + mod('logBonus');
      G.energy = Math.min(cap(), G.energy + gain);
      h.t = 'soil';
      h.wasLog = true;
      emit('gain', { i: i, n: gain });
      say('통나무를 차지해 기운 +' + gain + '.');
    }
    if (adjTree(i, 'shield')) h.thick = 1;
    G.growCount++;
    var gt = mod('growThick');
    if (gt && G.growCount % gt === 0) h.thick = Math.max(h.thick, 1);
    G.growsToday++;
    G.stats.grown++;
    emit('grow', { i: i, cost: cost });
    afterAction();
    return true;
  }

  function mushKind(i) {
    var hs = G.hexes, h = hs[i];
    for (var k = 0; k < D.MUSHROOMS.length; k++) {
      var m = D.MUSHROOMS[k];
      var ok = false;
      switch (m.rule) {
        case 'wasLog': ok = h.wasLog; break;
        case 'nearFar': ok = adjTree(i, 'far'); break;
        case 'litter': ok = h.t === 'litter'; break;
        case 'dry': ok = h.t === 'dry'; break;
        case 'nearTree': ok = adjTree(i); break;
        case 'nearHeart': ok = NB[i].some(function (m2) { return hs[m2].heart; }); break;
        case 'nearMush': ok = NB[i].some(function (m2) { return !!hs[m2].mush; }); break;
        case 'thick': ok = h.thick > 0; break;
        case 'moist': ok = h.t === 'moist'; break;
        case 'toxic': ok = mod('toxicCap') > 0; break;
        case 'glow': ok = G.strain === 'glow'; break;
        default: ok = true;
      }
      if (ok) return m.id;
    }
    return 'threadcap';
  }

  function fruit(i) {
    var f = flow();
    if (!canFruit(i, f)) { emit('deny', { i: i }); return false; }
    var h = G.hexes[i];
    var cost = fruitCost(i);
    G.energy -= cost;
    h.mush = mushKind(i);
    h.guard = mod('mushGuard');
    G.stats.mush++;
    G.stats.kinds[h.mush] = 1;
    seen('mush', h.mush);
    emit('fruit', { i: i, cost: cost, kind: h.mush });
    afterAction();
    return true;
  }

  function thicken(i) {
    if (!canThick(i)) { emit('deny', { i: i }); return false; }
    var h = G.hexes[i];
    var cost = thickCost(i);
    G.energy -= cost;
    h.thick++;
    G.stats.thick++;
    emit('thick', { i: i, cost: cost });
    afterAction();
    return true;
  }

  function threatsNearNet(range) {
    var hs = G.hexes;
    return G.threats.filter(function (t) {
      for (var i = 0; i < HEX.length; i++) if (hs[i].owned && hd(i, t.at) <= range) return true;
      return false;
    });
  }

  function useSkill() {
    if (!canSkill()) { emit('deny', {}); return false; }
    var s = strainDef();
    var sk = s.skill;
    switch (sk.id) {
      case 'rain':
        G.today.rain = (G.today.rain || 0) + 1;
        break;
      case 'poison':
        threatsNearNet(2).forEach(function (t) { damage(t, 2, 'skill'); });
        break;
      case 'fortify':
        NB[CENTER].forEach(function (m) {
          var h = G.hexes[m];
          if (h.owned && h.thick < thickMax()) { h.thick++; emit('thick', { i: m, cost: 0 }); }
        });
        break;
      case 'glow':
        G.today.glow = true;
        break;
      case 'pull':
        var f = flow();
        var a = incomeDetail(f, { pull: false }).total;
        var b = incomeDetail(f, { pull: true }).total;
        G.today.pull = true;
        var gain = Math.max(0, b - a);
        G.energy = Math.min(cap(), G.energy + gain);
        emit('gain', { i: CENTER, n: gain });
        break;
      case 'dissolve':
        G.today.dissolve = 1;
        G.threats.slice().forEach(function (t) { if (threatDef(t.id).kind === 'spreader') damage(t, 2, 'skill'); });
        break;
    }
    G.skillCd = Math.max(1, sk.cd - mod('skillCd'));
    G.stats.skills++;
    say(sk.name + '!');
    emit('skill', { id: sk.id });
    afterAction();
    return true;
  }

  function afterAction() {
    emit('change');
  }

  // ---------- 위협 ----------
  function removeThreat(t) {
    var k = G.threats.indexOf(t);
    if (k >= 0) G.threats.splice(k, 1);
  }
  function alive(t) { return G.threats.indexOf(t) >= 0; }

  function damage(t, n, src) {
    if (!alive(t)) return;
    t.hp -= n;
    emit('hit', { i: t.at, n: n, src: src });
    if (t.hp <= 0) {
      removeThreat(t);
      var td = threatDef(t.id);
      G.stats.kills++;
      if (td.boss) G.stats.bossKills++;
      var ke = mod('killEnergy');
      if (ke) G.energy = Math.min(cap(), G.energy + ke);
      var ks = mod('killSpore');
      if (ks) { G.spores += ks; G.totalSpores += ks; }
      emit('kill', { i: t.at, id: t.id, energy: ke, spores: ks });
      say(td.name + '을(를) 쓰러뜨렸다.');
    }
  }

  function loseHex(i, why) {
    var h = G.hexes[i];
    if (!h.owned || h.heart) return;
    h.owned = false;
    h.mush = null;
    h.thick = 0;
    h.wither = 0;
    h.guard = 0;
    G.stats.lost++;
    emit('lose', { i: i, why: why });
  }

  function hitHeart(n, t) {
    G.heart -= n;
    G.stats.heartHits++;
    emit('heart', { i: CENTER, n: n });
    say('심장이 ' + n + ' 다쳤다!');
    if (t) {
      var td = threatDef(t.id);
      if (td.boss) damage(t, 2, 'heart'); else removeThreat(t);
    }
  }

  // 여러 칸에서 시작하는 거리 지도 (지나갈 수 있는 칸만)
  function distFrom(srcs, throughOwned) {
    var n = HEX.length;
    var dist = new Array(n);
    for (var i = 0; i < n; i++) dist[i] = 99;
    var q = [];
    srcs.forEach(function (s) { dist[s] = 0; q.push(s); });
    var hs = G.hexes, head = 0;
    while (head < q.length) {
      var c = q[head++];
      var nb = NB[c];
      for (var k = 0; k < nb.length; k++) {
        var m = nb[k];
        if (dist[m] <= dist[c] + 1) continue;
        var h = hs[m];
        if (!passable(h)) continue;
        if (!throughOwned && h.owned) continue;
        if (throughOwned && h.heart) continue;
        dist[m] = dist[c] + 1; q.push(m);
      }
    }
    return dist;
  }
  function ownedList() {
    var out = [];
    for (var i = 0; i < HEX.length; i++) if (G.hexes[i].owned) out.push(i);
    return out;
  }
  function tipList() {
    var hs = G.hexes, out = [];
    for (var i = 0; i < HEX.length; i++) {
      if (!hs[i].owned || hs[i].heart) continue;
      var c = 0;
      NB[i].forEach(function (m) { if (hs[m].owned) c++; });
      if (c <= 1) out.push(i);
    }
    return out;
  }
  function mushList() {
    var out = [];
    for (var i = 0; i < HEX.length; i++) if (G.hexes[i].owned && G.hexes[i].mush) out.push(i);
    return out;
  }
  function occupied(i, self) {
    for (var k = 0; k < G.threats.length; k++) {
      var t = G.threats[k];
      if (t !== self && t.at === i) return true;
    }
    return false;
  }

  function nextStep(t, dist) {
    var best = dist[t.at], cands = [];
    NB[t.at].forEach(function (m) {
      if (!passable(G.hexes[m])) return;
      if (dist[m] < best) { best = dist[m]; cands = [m]; } else if (dist[m] === best && best < dist[t.at]) cands.push(m);
    });
    if (!cands.length) return -1;
    return cands[rnd(cands.length)];
  }

  function bounce(t, i) {
    var h = G.hexes[i];
    var keep = mod('thickKeep') > 0 && Math.random() < 0.5;
    if (!keep) h.thick = Math.max(0, h.thick - 1);
    G.stats.bounces++;
    emit('bounce', { i: i });
    damage(t, 1 + mod('thickDmg'), 'thick');
  }

  function biteHex(t, i) {
    var td = threatDef(t.id);
    var h = G.hexes[i];
    if (h.heart) { hitHeart(td.boss ? 2 : 1, t); return; }
    if (h.thick > 0) { bounce(t, i); return; }
    if (td.kind === 'thief') {
      var n = Math.min(G.energy, td.steal || 3);
      G.energy -= n;
      emit('steal', { i: i, n: n });
      say(td.name + '이(가) 기운 ' + n + '을 훔쳤다.');
      removeThreat(t);
      return;
    }
    loseHex(i, 'bite');
    emit('bite', { i: i, id: t.id });
    if (td.freeze) {
      NB[i].forEach(function (m) { if (G.hexes[m].owned && !G.hexes[m].heart) G.hexes[m].frozen = 2; });
      emit('freeze', { i: i });
    }
    t.at = i;
    t.left = (t.left === undefined ? td.bites : t.left) - 1;
    if (t.left <= 0) removeThreat(t);
  }

  function walkerStep(t) {
    var td = threatDef(t.id);
    // 망 칸 위에 올라선 버섯 먹이(버섯이 없어진 뒤)는 그 자리를 갉는다
    if (G.hexes[t.at].owned) { biteHex(t, t.at); return; }
    var srcs = td.tip ? tipList() : [];
    if (!srcs.length) srcs = ownedList();
    var dist = distFrom(srcs, false);
    var n = nextStep(t, dist);
    if (n < 0) return;
    if (G.hexes[n].owned) { biteHex(t, n); return; }
    if (occupied(n, t)) return;
    t.at = n;
  }

  function eaterStep(t) {
    var td = threatDef(t.id);
    var ms = mushList();
    if (!ms.length) { walkerStep(t); return; }
    var dist = distFrom(ms, true);
    var n = dist[t.at] === 0 ? t.at : nextStep(t, dist);
    if (n < 0) return;
    var h = G.hexes[n];
    if (h.owned && h.mush) {
      if (h.thick > 0 && n !== t.at) { bounce(t, n); return; }
      if (h.guard > 0) {
        h.guard--;
        emit('bounce', { i: n });
        damage(t, 1, 'guard');
        return;
      }
      var kind = h.mush;
      h.mush = null;
      emit('eat', { i: n, id: t.id });
      say(td.name + '이(가) 버섯을 먹었다.');
      if (kind === 'thorncap') damage(t, 1, 'thorn');
      if (td.slime && h.t !== 'litter') h.t = 'dry';
      if ((td.bites || 1) >= 2) loseHex(n, 'bite');
      if (alive(t)) removeThreat(t);
      return;
    }
    if (h.owned && h.thick > 0) { bounce(t, n); return; }
    if (h.heart) { hitHeart(1, t); return; }
    if (occupied(n, t)) return;
    t.at = n;
  }

  function spread(t) {
    var td = threatDef(t.id);
    var molds = G.threats.filter(function (x) { return threatDef(x.id).kind === 'spreader'; }).length;
    var dist = distFrom(ownedList(), false);
    var best = 99, cands = [];
    NB[t.at].forEach(function (m) {
      var h = G.hexes[m];
      if (!passable(h)) return;
      var d = h.owned ? 0 : dist[m];
      if (moldAt(m)) return;
      if (d < best) { best = d; cands = [m]; } else if (d === best) cands.push(m);
    });
    if (!cands.length) return;
    var n = cands[rnd(cands.length)];
    var h = G.hexes[n];
    if (h.heart) { hitHeart(1, null); return; }
    if (h.owned && h.thick > 0) {
      h.thick = Math.max(0, h.thick - (t.id === 'blackmold' ? 2 : 1));
      G.stats.bounces++;
      emit('bounce', { i: n });
      return;
    }
    if (occupied(n, null)) return;
    if (molds >= MOLD_CAP) return;
    if (h.owned) { loseHex(n, 'mold'); emit('bite', { i: n, id: t.id }); }
    if (td.rot) {
      NB[n].forEach(function (m) { if (G.hexes[m].owned && G.hexes[m].mush) { G.hexes[m].mush = null; emit('eat', { i: m, id: t.id }); } });
    }
    G.threats.push({ id: t.id, at: n, hp: td.hp, age: 0 });
  }

  function moveThreats() {
    var list = G.threats.slice();
    for (var k = 0; k < list.length; k++) {
      var t = list[k];
      if (!alive(t)) continue;
      var td = threatDef(t.id);
      if (td.kind === 'spreader') {
        t.age = (t.age || 0) + 1;
        if (t.age % td.period === 0) spread(t);
        continue;
      }
      var steps = td.speed || 1;
      for (var s = 0; s < steps && alive(t); s++) {
        if (td.kind === 'eater') eaterStep(t); else walkerStep(t);
      }
    }
  }

  function toxinPhase() {
    var hs = G.hexes;
    G.threats.slice().forEach(function (t) {
      if (!alive(t)) return;
      var dmg = 0;
      NB[t.at].forEach(function (m) {
        var h = hs[m];
        if (h.t === 'tree' && treeDef(h.tree).fx === 'toxin') dmg++;
        if (h.owned && h.mush === 'toxcap') dmg++;
      });
      if (dmg) damage(t, dmg, 'toxin');
    });
  }

  function freeEdge() {
    var c = EDGE.filter(function (i) {
      var h = G.hexes[i];
      return passable(h) && !h.owned && !threatAt(i);
    });
    return c.length ? c[rnd(c.length)] : -1;
  }

  function spawnOne(id) {
    if (G.threats.length >= THREAT_CAP) return false;
    var at = freeEdge();
    if (at < 0) return false;
    var td = threatDef(id);
    G.threats.push({ id: id, at: at, hp: td.hp, age: 0 });
    seen('threat', id);
    emit('spawn', { i: at, id: id });
    return true;
  }

  function spawnThreats(extra) {
    var F = forestDef();
    var mult = diffDef().spawn * (1 - mod('spawnCut') / 100);
    var exp = (F.spawn + F.grow * G.day) * mult + (extra || 0);
    var n = Math.floor(exp) + (Math.random() < exp - Math.floor(exp) ? 1 : 0);
    var stage = G.forest + 1;
    var pool = D.THREATS.filter(function (t) { return t.weight > 0 && t.minForest <= stage; });
    for (var k = 0; k < n; k++) {
      var td = weighted(pool, function (t) { return t.weight; });
      var g = td.group || 1;
      for (var j = 0; j < g; j++) spawnOne(td.id);
    }
    if (stage === 8 && (G.day === 4 || G.day === 9)) {
      if (spawnOne('stag')) say('큰 사슴벌레가 나타났다!');
    }
  }

  // ---------- 하루 ----------
  function spawnTerrain(from, to, n, emptyOnly) {
    var hs = G.hexes;
    var c = [];
    for (var i = 0; i < HEX.length; i++) {
      var h = hs[i];
      if (from.indexOf(h.t) < 0) continue;
      if (emptyOnly && (h.owned || threatAt(i))) continue;
      c.push(i);
    }
    shuffle(c).slice(0, n).forEach(function (i) { hs[i].t = to; emit('terrain', { i: i }); });
  }

  function loseTips(n) {
    var tips = tipList().filter(function (i) { return G.hexes[i].thick === 0; });
    shuffle(tips).slice(0, n).forEach(function (i) { loseHex(i, 'event'); emit('bite', { i: i }); });
  }

  function walkersAlive() {
    return G.threats.filter(function (t) {
      var td = threatDef(t.id);
      return td.kind !== 'spreader' && !td.boss;
    });
  }

  function applyEvent(ev) {
    var hs = G.hexes;
    switch (ev.fx) {
      case 'rain': G.today.rain = (G.today.rain || 0) + 1; break;
      case 'heavyrain': spawnTerrain(['soil', 'dry'], 'moist', 4, true); G.today.rain = (G.today.rain || 0) + 1; break;
      case 'drought': loseTips(1); spawnTerrain(['soil', 'moist'], 'dry', 2, true); break;
      case 'heatwave': spawnTerrain(['soil', 'moist'], 'dry', 3, true); break;
      case 'leaffall': spawnTerrain(['soil', 'moist', 'dry'], 'litter', 3, true); break;
      case 'rotleaves': spawnTerrain(['soil', 'moist', 'dry'], 'litter', 4, true); break;
      case 'logfall': spawnTerrain(['soil', 'moist', 'dry'], 'log', 1, true); break;
      case 'thunder':
        var f = flow();
        var pIdx = partners(f).map(function (p) { return p.i; });
        var lone = [];
        for (var i = 0; i < HEX.length; i++) if (hs[i].t === 'tree' && pIdx.indexOf(i) < 0) lone.push(i);
        if (lone.length) { var x = lone[rnd(lone.length)]; hs[x].t = 'log'; hs[x].tree = null; emit('terrain', { i: x }); }
        break;
      case 'frost': G.today.frost = true; break;
      case 'sun': G.today.sun = true; break;
      case 'birds':
        shuffle(walkersAlive()).slice(0, 2).forEach(function (t) { damage(t, 99, 'event'); });
        break;
      case 'owl':
        var w = walkersAlive().sort(function (a, b) { return b.hp - a.hp; });
        if (w.length) damage(w[0], 99, 'event');
        break;
      case 'wind': spawnOne(weighted(D.THREATS.filter(function (t) { return t.weight > 0 && t.minForest <= G.forest + 1; }), function (t) { return t.weight; }).id); break;
      case 'antmarch': spawnOne('ant'); spawnOne('ant'); break;
      case 'worms': spawnTerrain(['dry'], 'soil', 3, false); break;
      case 'spring':
        for (var j = 0; j < HEX.length; j++) {
          if (hd(j, CENTER) <= 2 && (hs[j].t === 'soil' || hs[j].t === 'dry') && !hs[j].owned) { hs[j].t = 'moist'; emit('terrain', { i: j }); }
        }
        break;
      case 'dew': G.energy = Math.min(cap(), G.energy + 2); emit('gain', { i: CENTER, n: 2 }); break;
      case 'quiet': G.energy = Math.min(cap(), G.energy + 1); emit('gain', { i: CENTER, n: 1 }); break;
      case 'picker':
        var ms = mushList();
        if (ms.length) { var p = ms[rnd(ms.length)]; hs[p].mush = null; emit('eat', { i: p }); G.energy = Math.min(cap(), G.energy + 3); }
        else G.energy = Math.min(cap(), G.energy + 1);
        break;
      case 'hail':
        var hm = mushList().filter(function (i2) { return hs[i2].thick === 0; });
        if (hm.length) { var hx = hm[rnd(hm.length)]; hs[hx].mush = null; emit('eat', { i: hx }); }
        break;
      case 'mist': G.today.mist = true; break;
      case 'deer': loseTips(1); break;
      case 'boar': loseTips(2); break;
      case 'fireflies': G.today.fireflies = true; break;
      case 'sporecloud': G.spores += 3; G.totalSpores += 3; emit('gain', { i: CENTER, n: 3, spore: true }); break;
    }
  }

  function rollEvent() {
    var luck = mod('eventLuck');
    var chance = 0.35 + luck * 0.05;
    if (Math.random() >= chance) return null;
    var ev = weighted(D.EVENTS, function (e) { return e.good ? 1 + luck : 1; });
    G.stats.events++;
    seen('event', ev.id);
    applyEvent(ev);
    say('사건: ' + ev.name + ' — ' + ev.desc);
    emit('event', { ev: ev });
    return ev;
  }

  // 처음 짝을 맺은 나무의 한 번짜리 효과
  function partnerEffects(ps) {
    var hs = G.hexes;
    ps.forEach(function (p) {
      if (G.partnerSeen[p.i]) return;
      G.partnerSeen[p.i] = 1;
      var td = treeDef(hs[p.i].tree);
      seen('tree', td.id);
      emit('partner', { i: p.i, id: td.id });
      switch (td.fx) {
        case 'feast': G.energy = Math.min(cap(), G.energy + 4); emit('gain', { i: p.i, n: 4 }); break;
        case 'heal': if (G.heart < G.heartMax) { G.heart++; emit('heal', { i: CENTER }); } break;
        case 'bloom': G.spores += 3; G.totalSpores += 3; emit('gain', { i: p.i, n: 3, spore: true }); break;
        case 'moist': NB[p.i].forEach(function (m) { if (hs[m].t === 'soil' || hs[m].t === 'dry') hs[m].t = 'moist'; }); break;
        case 'soil': NB[p.i].forEach(function (m) { if (hs[m].t === 'dry') hs[m].t = 'soil'; }); break;
      }
    });
  }

  function hazelDrop(ps) {
    if (G.day % 3 !== 0) return;
    var hs = G.hexes;
    ps.forEach(function (p) {
      var td = treeDef(hs[p.i].tree);
      if (td.fx !== 'litter') return;
      var c = NB[p.i].filter(function (m) { return hs[m].t === 'soil' || hs[m].t === 'dry' || hs[m].t === 'moist'; });
      if (c.length) { var x = c[rnd(c.length)]; hs[x].t = 'litter'; emit('terrain', { i: x }); }
    });
  }

  function startDay(first) {
    G.today = {};
    G.growsToday = 0;
    if (!first) {
      if (G.skillCd > 0) G.skillCd--;
      rollEvent();
    }
    var f = flow();
    var inc = incomeDetail(f);
    G.lastIncome = inc.total;
    G.incomeParts = inc.parts;
    G.energy = Math.min(cap(), G.energy + inc.total);
    if (inc.total > G.stats.maxIncome) G.stats.maxIncome = inc.total;
    if (inc.partners.length > G.stats.maxPartners) G.stats.maxPartners = inc.partners.length;
    partnerEffects(inc.partners);
    hazelDrop(inc.partners);
    for (var i = 0; i < HEX.length; i++) if (G.hexes[i].frozen > 0) G.hexes[i].frozen--;
    emit('income', { n: inc.total });
  }

  function sporeOf(i) {
    var hs = G.hexes, h = hs[i];
    var md = mushDef(h.mush);
    var n = 1 + (md ? md.bonus : 0) + mod('spore');
    if (adjTree(i)) n += mod('sporeTree');
    if (adjTree(i, 'spore')) n += 1;
    if (h.mush === 'heartcap') n += mod('sporeHeart');
    if (h.mush === 'twincap') n += mod('sporeTwin');
    if (G.today.fireflies) n += 1;
    if (G.today.glow) n *= (h.mush === 'glowcap' ? 3 : 2);
    return n;
  }

  function witherCheck() {
    var f = flow();
    var hs = G.hexes;
    var limit = BASE_WITHER + mod('witherDays');
    for (var i = 0; i < HEX.length; i++) {
      var h = hs[i];
      if (!h.owned || h.heart) continue;
      if (f.conn[i]) { h.wither = 0; continue; }
      if (h.frozen > 0) continue;
      if (adjTree(i, 'calm')) continue;
      h.wither++;
      if (h.wither >= limit) { loseHex(i, 'wither'); emit('wither', { i: i }); }
    }
  }

  function endDay() {
    if (!G || G.phase !== 'play') return false;
    var f = flow();
    var hs = G.hexes;
    var total = 0;
    for (var i = 0; i < HEX.length; i++) {
      if (!hs[i].owned || !hs[i].mush || !f.conn[i]) continue;
      var n = sporeOf(i);
      total += n;
      emit('spore', { i: i, n: n });
    }
    G.spores += total;
    G.totalSpores += total;
    if (total) say(G.day + '일째 밤: 포자 +' + total + '.');
    emit('dayEnd', { spores: total });
    if (G.spores >= G.goal) { forestWin(); return true; }
    toxinPhase();
    if (!G.today.mist) moveThreats();
    witherCheck();
    if (G.heart <= 0) { endRun(false, 'heart'); return true; }
    G.day++;
    if (G.day > G.days) { endRun(false, 'time'); return true; }
    spawnThreats();
    startDay(false);
    emit('dayStart', { day: G.day });
    afterAction();
    return true;
  }

  function rollRewards() {
    var pool = D.TRAITS.filter(function (t) { return G.traits.indexOf(t.id) < 0; });
    var out = [];
    var guard = 0;
    while (out.length < 3 && pool.length && guard < 50) {
      guard++;
      var t = weighted(pool, function (x) { return 4 - x.rare; });
      out.push(t.id);
      pool.splice(pool.indexOf(t), 1);
    }
    return out;
  }

  function forestWin() {
    G.stats.cleared++;
    if (!G.stats.fastest || G.day < G.stats.fastest) G.stats.fastest = G.day;
    say(forestDef().name + '을(를) 넘겼다!');
    if (G.forest >= D.FORESTS.length - 1) { endRun(true, 'win'); return; }
    G.phase = 'reward';
    G.reward = rollRewards();
    G.reward.forEach(function (id) { seen('trait', id); });
    emit('forestWin', { stage: G.forest + 1 });
  }

  function pickReward(k) {
    if (!G || G.phase !== 'reward') return false;
    var id = G.reward[k];
    if (!id) return false;
    var t = byId(D.TRAITS, id);
    G.traits.push(id);
    var before = G.heart;
    if (t.fx.heartHp) { G.heartMax += t.fx.heartHp; G.heart += t.fx.heartHp; }
    G.heart = Math.min(G.heartMax, G.heart + 2 + mod('healForest'));
    G.forest++;
    G.reward = [];
    setupForest();
    emit('reward', { id: id });
    if (G.heart > before) emit('heal', { i: CENTER, n: G.heart - before });
    afterAction();
    return true;
  }

  function ackIntro() {
    if (!G || G.phase !== 'intro') return false;
    G.phase = 'play';
    seen('strain', G.strain);
    startDay(true);
    emit('forestStart', { stage: G.forest + 1 });
    afterAction();
    return true;
  }

  function scoreNow() {
    return G.totalSpores + G.stats.cleared * 20 + (G.won ? 50 + G.heart * 10 : 0);
  }

  function endRun(won, why) {
    G.phase = 'over';
    G.over = true;
    G.won = !!won;
    G.endWhy = why;
    G.score = scoreNow();
    emit('runEnd', { won: G.won, why: why });
  }

  function giveUp() {
    if (!G || G.over) return false;
    endRun(false, 'giveup');
    return true;
  }

  function runRecord() {
    var s = G.stats;
    return {
      strain: G.strain, diff: G.diff, stage: G.forest + 1, cleared: s.cleared, spores: G.totalSpores,
      score: G.score, won: G.won, kills: s.kills, grown: s.grown, mush: s.mush, kinds: Object.keys(s.kinds).length,
      maxPartners: s.maxPartners, digest: s.digest, thick: s.thick, bounces: s.bounces, heartHits: s.heartHits,
      fastest: s.fastest, traits: G.traits.length, skills: s.skills, events: s.events, maxIncome: s.maxIncome,
      bossKills: s.bossKills, time: G.simTime
    };
  }

  // ---------- 시험 훅이 쓰는 목록 ----------
  function actions() {
    if (!G) return [];
    if (G.phase === 'intro') return ['ok'];
    if (G.phase === 'reward') return G.reward.map(function (_, k) { return 'r:' + k; });
    if (G.phase !== 'play') return [];
    var f = flow();
    var out = [];
    for (var i = 0; i < HEX.length; i++) {
      if (canGrow(i, f)) out.push('g:' + i);
      if (canFruit(i, f)) out.push('f:' + i);
      if (canThick(i)) out.push('t:' + i);
    }
    if (canSkill()) out.push('s');
    out.push('e');
    return out;
  }

  function act(a) {
    if (typeof a !== 'string') return false;
    if (a === 'ok') return ackIntro();
    if (a === 'e') return endDay();
    if (a === 's') return useSkill();
    var p = a.split(':');
    var n = parseInt(p[1], 10);
    if (isNaN(n)) return false;
    if (p[0] === 'r') return pickReward(n);
    if (p[0] === 'g') return grow(n);
    if (p[0] === 'f') return fruit(n);
    if (p[0] === 't') return thicken(n);
    return false;
  }

  function load(obj) {
    if (!obj || obj.v !== 1 || !Array.isArray(obj.hexes) || obj.hexes.length !== HEX.length) return false;
    if (!byId(D.STRAINS, obj.strain) || !D.FORESTS[obj.forest]) return false;
    if (obj.over) return false;
    G = obj;
    G.sim = false;
    emit('load');
    return true;
  }

  return {
    R: R, HEX: HEX, NB: NB, CENTER: CENTER, hd: hd,
    on: function (fn) { listeners.push(fn); },
    get: function () { return G; },
    newRun: newRun, load: load, ackIntro: ackIntro, endDay: endDay, pickReward: pickReward, giveUp: giveUp,
    grow: grow, fruit: fruit, thicken: thicken, useSkill: useSkill,
    canGrow: canGrow, canFruit: canFruit, canThick: canThick, canSkill: canSkill, why: why,
    growCost: growCost, fruitCost: fruitCost, thickCost: thickCost, thickMax: thickMax,
    flow: flow, incomeDetail: incomeDetail, partners: partners, threatAt: threatAt, moldAt: moldAt, mushKind: mushKind,
    sporeOf: sporeOf, mod: mod, cap: cap, runRecord: runRecord, scoreNow: scoreNow,
    actions: actions, act: act,
    strainDef: function () { return G ? strainDef() : D.STRAINS[0]; },
    forestDef: function () { return G ? forestDef() : D.FORESTS[0]; },
    threatDef: threatDef, treeDef: treeDef, mushDef: mushDef,
    advance: function (ms) { if (G) G.simTime += Math.max(0, ms || 0) / 1000; },
    state: function () {
      if (!G) return { over: false, won: false, stage: 1, stageMax: D.FORESTS.length, time: 0 };
      return { over: G.over, won: G.won, stage: G.forest + 1, stageMax: D.FORESTS.length, time: G.simTime };
    }
  };
})();
