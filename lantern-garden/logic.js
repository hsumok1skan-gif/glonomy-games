/*
  등불 정원 — 판 풀이·생성 공용 코드 (node 와 브라우저 둘 다 쓴다)

  판: n×n 칸, 꽃밭 n개. 가로줄·세로줄·꽃밭마다 등불이 하나씩, 등불끼리는 대각선으로도 닿지 않는다.
  칸 상태(풀이기 안): 0 모름, 1 등불, -1 비움(×).

  풀이기는 사람이 쓰는 추리 기법을 쉬운 순서로 쓴다.
    ① 한 칸만 남은 줄·열·꽃밭 채우기
    ② 등불 둘레·같은 줄·열·꽃밭 지우기
    ③ 꽃밭이 한 줄(열) 안에만 있으면 그 줄(열) 나머지 지우기 (줄이 한 꽃밭 안에만 있으면 꽃밭 나머지 지우기)
    ④ 꽃밭 k개가 줄 k개를 차지하면 그 줄의 나머지 지우기 (줄 k개가 꽃밭 k개 안에만 있으면 꽃밭 나머지 지우기)
    ⑤ 한 줄·열·꽃밭의 어느 칸에 놓아도 공통으로 막히는 칸 지우기
  이 다섯으로 끝까지 못 풀면 가정이 필요한 판이라 버린다.

  tools\make_levels.js 가 이 파일을 코드\logic.js 로 복사한다(게임의 힌트가 같은 풀이기를 쓴다).
*/
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LanternLogic = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TECH_NAMES = ['', '한 칸만 남은 곳 채우기', '등불 둘레 지우기', '한 줄에 갇힌 꽃밭', '꽃밭 묶음', '공통으로 막히는 칸'];

  // ---------- 씨앗값 난수 ----------

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- 판 준비 ----------

  function prepare(n, reg) {
    var N = n * n, i, j;
    var units = [];
    for (i = 0; i < 3 * n; i++) units.push([]);
    var cellUnits = [];
    for (i = 0; i < N; i++) {
      var r = (i / n) | 0, c = i % n;
      units[r].push(i);
      units[n + c].push(i);
      units[2 * n + reg[i]].push(i);
      cellUnits.push([r, n + c, 2 * n + reg[i]]);
    }
    var peer = new Uint8Array(N * N);
    for (i = 0; i < N; i++) {
      var r1 = (i / n) | 0, c1 = i % n;
      for (j = 0; j < N; j++) {
        if (i === j) continue;
        var r2 = (j / n) | 0, c2 = j % n;
        if (r1 === r2 || c1 === c2 || reg[i] === reg[j] ||
            (Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1)) peer[i * N + j] = 1;
      }
    }
    return { n: n, N: N, reg: reg, units: units, cellUnits: cellUnits, peer: peer };
  }

  function popcount(x) {
    var c = 0;
    while (x) { x &= x - 1; c++; }
    return c;
  }

  // ---------- 추리 한 단계 ----------

  // 지금 상태에서 가장 쉬운 추리 한 단계를 찾는다. 없으면 null.
  function findStep(P, st) {
    var n = P.n, N = P.N, units = P.units, peer = P.peer, reg = P.reg;
    var u, k, i, j, list, el;
    var lampIn = [], cand = [];
    for (u = 0; u < 3 * n; u++) {
      var l = -1, cs = [];
      list = units[u];
      for (k = 0; k < list.length; k++) {
        i = list[k];
        if (st[i] === 1) l = i;
        else if (st[i] === 0) cs.push(i);
      }
      lampIn.push(l);
      cand.push(cs);
      if (l < 0 && cs.length === 0) return { tech: 0, bad: true, unit: u, place: [], elim: [], focus: list.slice() };
    }

    // ① 한 칸만 남은 줄·열·꽃밭
    for (u = 0; u < 3 * n; u++) {
      if (lampIn[u] < 0 && cand[u].length === 1) {
        return { tech: 1, unit: u, place: [cand[u][0]], elim: [], focus: units[u].slice() };
      }
    }

    // ② 등불 둘레·같은 줄·열·꽃밭 지우기
    for (i = 0; i < N; i++) {
      if (st[i] !== 1) continue;
      el = [];
      for (j = 0; j < N; j++) if (st[j] === 0 && peer[i * N + j]) el.push(j);
      if (el.length) return { tech: 2, lamp: i, place: [], elim: el, focus: [i] };
    }

    // ③ 꽃밭이 한 줄(열) 안에만 / 줄(열)이 한 꽃밭 안에만
    for (u = 2 * n; u < 3 * n; u++) {
      if (lampIn[u] >= 0) continue;
      var cs3 = cand[u];
      var r0 = (cs3[0] / n) | 0, c0 = cs3[0] % n, sameR = true, sameC = true;
      for (k = 1; k < cs3.length; k++) {
        if (((cs3[k] / n) | 0) !== r0) sameR = false;
        if (cs3[k] % n !== c0) sameC = false;
      }
      var g3 = u - 2 * n;
      if (sameR) {
        el = cellsWhere(units[r0], function (x) { return st[x] === 0 && reg[x] !== g3; });
        if (el.length) return { tech: 3, unit: u, line: r0, dir: 'regionToLine', place: [], elim: el, focus: cs3.slice() };
      }
      if (sameC) {
        el = cellsWhere(units[n + c0], function (x) { return st[x] === 0 && reg[x] !== g3; });
        if (el.length) return { tech: 3, unit: u, line: n + c0, dir: 'regionToLine', place: [], elim: el, focus: cs3.slice() };
      }
    }
    for (u = 0; u < 2 * n; u++) {
      if (lampIn[u] >= 0) continue;
      var csl = cand[u], g0 = reg[csl[0]], same = true;
      for (k = 1; k < csl.length; k++) if (reg[csl[k]] !== g0) { same = false; break; }
      if (!same) continue;
      var lineU = u;
      el = cellsWhere(units[2 * n + g0], function (x) { return st[x] === 0 && P.cellUnits[x].indexOf(lineU) < 0; });
      if (el.length) return { tech: 3, unit: u, line: 2 * n + g0, dir: 'lineToRegion', place: [], elim: el, focus: csl.slice() };
    }

    // ④ 꽃밭 k개 ↔ 줄 k개
    var g4 = groupStep(P, st, lampIn, cand);
    if (g4) return g4;

    // ⑤ 어느 칸에 놓아도 공통으로 막히는 칸
    for (u = 0; u < 3 * n; u++) {
      if (lampIn[u] >= 0) continue;
      var cs5 = cand[u];
      if (cs5.length < 2) continue;
      el = [];
      for (j = 0; j < N; j++) {
        if (st[j] !== 0 || P.cellUnits[j].indexOf(u) >= 0) continue;
        var all = true;
        for (k = 0; k < cs5.length; k++) if (!peer[cs5[k] * N + j]) { all = false; break; }
        if (all) el.push(j);
      }
      if (el.length) return { tech: 5, unit: u, place: [], elim: el, focus: cs5.slice() };
    }
    return null;
  }

  function cellsWhere(list, fn) {
    var out = [];
    for (var k = 0; k < list.length; k++) if (fn(list[k])) out.push(list[k]);
    return out;
  }

  // 꽃밭 묶음: 아직 등불이 없는 꽃밭(또는 줄) k개의 빈칸이 줄(또는 꽃밭) k개 안에만 있으면 나머지를 지운다.
  // 네 방향(꽃밭→가로줄, 꽃밭→세로줄, 가로줄→꽃밭, 세로줄→꽃밭) 가운데 k 가 가장 작은 것을 고른다.
  function groupStep(P, st, lampIn, cand) {
    var n = P.n, reg = P.reg, best = null;
    var kinds = [
      { from: 2 * n, to: 'row' }, { from: 2 * n, to: 'col' },
      { from: 0, to: 'region' }, { from: n, to: 'region' }
    ];
    for (var t = 0; t < kinds.length; t++) {
      var kd = kinds[t], ids = [], masks = [];
      for (var a = 0; a < n; a++) {
        var u = kd.from + a;
        if (lampIn[u] >= 0) continue;
        var m = 0, cs = cand[u];
        for (var k = 0; k < cs.length; k++) {
          var x = cs[k];
          m |= 1 << (kd.to === 'row' ? (x / n) | 0 : kd.to === 'col' ? x % n : reg[x]);
        }
        ids.push(u);
        masks.push(m);
      }
      var cnt = ids.length;
      if (cnt < 3) continue;
      var uni = new Int32Array(1 << cnt);
      for (var sub = 1; sub < (1 << cnt); sub++) {
        var low = sub & -sub, bit = 31 - Math.clz32(low);
        uni[sub] = uni[sub ^ low] | masks[bit];
        var size = popcount(sub);
        if (size < 2 || size > cnt - 1) continue;
        if (best && size >= best.k) continue;
        if (popcount(uni[sub]) !== size) continue;
        var chosen = [], focus = [];
        for (var b = 0; b < cnt; b++) if (sub & (1 << b)) { chosen.push(ids[b]); focus = focus.concat(cand[ids[b]]); }
        var el = groupElims(P, st, kd, chosen, uni[sub]);
        if (el.length) best = { tech: 4, k: size, from: kd.from === 2 * n ? 'region' : (kd.from === 0 ? 'row' : 'col'), to: kd.to, units: chosen, place: [], elim: el, focus: focus };
      }
    }
    return best;
  }

  function groupElims(P, st, kd, chosen, targetMask) {
    var n = P.n, N = P.N, reg = P.reg, out = [];
    var inChosen = {};
    for (var c = 0; c < chosen.length; c++) inChosen[chosen[c]] = true;
    for (var i = 0; i < N; i++) {
      if (st[i] !== 0) continue;
      var r = (i / n) | 0, col = i % n, target, source;
      if (kd.to === 'row') { target = r; source = 2 * n + reg[i]; }
      else if (kd.to === 'col') { target = col; source = 2 * n + reg[i]; }
      else { target = reg[i]; source = kd.from === 0 ? r : n + col; }
      if ((targetMask & (1 << target)) && !inChosen[source]) out.push(i);
    }
    return out;
  }

  function applyStep(st, step) {
    var k;
    for (k = 0; k < step.place.length; k++) st[step.place[k]] = 1;
    for (k = 0; k < step.elim.length; k++) st[step.elim[k]] = -1;
  }

  // ---------- 끝까지 풀기 ----------

  function solveLogic(n, reg, keepLog) {
    var P = prepare(n, reg);
    var st = new Int8Array(P.N);
    var counts = [0, 0, 0, 0, 0, 0], maxTech = 0, steps = 0, lamps = 0, log = [];
    // 한 단계마다 칸이 하나 이상 정해지므로 N + 1 단계를 넘지 않는다. 상한에 걸리면 solved: false (그 판은 버린다)
    for (var guard = 0; guard <= P.N && lamps < n; guard++) {
      var s = findStep(P, st);
      if (!s || s.bad) break;
      applyStep(st, s);
      counts[s.tech]++;
      steps++;
      if (s.tech > maxTech) maxTech = s.tech;
      lamps += s.place.length;
      if (keepLog) log.push(s);
    }
    var sol = [], unknown = 0;
    for (var q = 0; q < P.N; q++) if (st[q] === 0) unknown++;
    if (lamps === n) {
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (st[r * n + c] === 1) sol[r] = c;
    }
    return { solved: lamps === n, maxTech: maxTech, steps: steps, counts: counts, sol: sol, log: log, unknown: unknown + (n - lamps) * n };
  }

  // 난이도 점수: 가장 어려운 기법 번호 × 10 + ③ 횟수 + ④ 횟수 × 2 + ⑤ 횟수 × 3 + 추리 단계 수 ÷ 4 (반올림)
  var SCORE_RULE = '가장 어려운 기법 번호 × 10 + ③ 횟수 + ④ 횟수 × 2 + ⑤ 횟수 × 3 + 추리 단계 수 ÷ 4(반올림)';
  function score(res) {
    return res.maxTech * 10 + res.counts[3] + res.counts[4] * 2 + res.counts[5] * 3 + Math.round(res.steps / 4);
  }

  // 답 개수 세기 (가정까지 쓰는 검사용, limit 에서 멈춘다)
  // 되짚기는 maxNodes 칸(기본 500만)까지만 돈다. 넘으면 끝까지 세지 못한 것이라 limit 을 돌려준다
  // — '답이 하나가 아님' 으로 쳐서 그 판을 버린다(잘못 받아들이지 않는 쪽). lastCountAborted() 로 알 수 있다.
  var countAborted = false;
  function countSolutions(n, reg, limit, maxNodes) {
    var usedCol = [], usedReg = [], cols = [], count = 0, nodes = 0, cap = maxNodes || 5000000;
    countAborted = false;
    function go(r) {
      if (count >= limit) return;
      if (++nodes > cap) { countAborted = true; count = limit; return; }
      if (r === n) { count++; return; }
      for (var c = 0; c < n; c++) {
        if (usedCol[c]) continue;
        var g = reg[r * n + c];
        if (usedReg[g]) continue;
        if (r > 0 && Math.abs(cols[r - 1] - c) <= 1) continue;
        usedCol[c] = true; usedReg[g] = true; cols[r] = c;
        go(r + 1);
        usedCol[c] = false; usedReg[g] = false;
      }
    }
    go(0);
    return count;
  }

  // ---------- 판 만들기 ----------

  function neighbours4(n, i) {
    var r = (i / n) | 0, c = i % n, out = [];
    if (r > 0) out.push(i - n);
    if (r < n - 1) out.push(i + n);
    if (c > 0) out.push(i - 1);
    if (c < n - 1) out.push(i + 1);
    return out;
  }

  function shuffled(n, rand) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(i);
    for (var j = n - 1; j > 0; j--) {
      var k = (rand() * (j + 1)) | 0;
      var t = a[j]; a[j] = a[k]; a[k] = t;
    }
    return a;
  }

  // 줄마다·열마다 하나, 서로 닿지 않는 등불 자리.
  // 되짚기는 maxNodes 칸(기본 2만)까지만 — 넘으면 null 이고, generate 도 null 을 돌려 부르는 쪽이 다음 씨앗으로 넘어간다.
  function genSolution(n, rand, maxNodes) {
    var cols = [], used = [], nodes = 0, cap = maxNodes || 20000;
    function place(r) {
      if (r === n) return true;
      if (++nodes > cap) return false;
      var order = shuffled(n, rand);
      for (var k = 0; k < n; k++) {
        var c = order[k];
        if (used[c]) continue;
        if (r > 0 && Math.abs(cols[r - 1] - c) <= 1) continue;
        cols[r] = c; used[c] = true;
        if (place(r + 1)) return true;
        used[c] = false;
      }
      return false;
    }
    return place(0) ? cols : null;
  }

  // 등불 자리에서 꽃밭을 하나씩 키운다. 꽃밭 번호 = 그 등불의 줄 번호.
  // 한 바퀴에 한 칸씩 채우므로 N 바퀴를 넘지 않는다. 붙일 칸이 없어 멈추면 남은 칸은 같은 가로줄의 꽃밭에 준다
  // (이어지지 않은 꽃밭이 생기면 solveLogic 이 못 풀어 generate 가 그 판을 버린다).
  function growRegions(n, sol, rand) {
    var N = n * n, reg = [], i, k, filled = n;
    for (i = 0; i < N; i++) reg.push(-1);
    for (var r = 0; r < n; r++) reg[r * n + sol[r]] = r;
    for (var guard = 0; filled < N && guard < N; guard++) {
      var cand = [];
      for (i = 0; i < N; i++) {
        if (reg[i] >= 0) continue;
        var nb = neighbours4(n, i);
        for (k = 0; k < nb.length; k++) if (reg[nb[k]] >= 0) cand.push(i, reg[nb[k]]);
      }
      if (!cand.length) break;
      var p = ((rand() * (cand.length / 2)) | 0) * 2;
      reg[cand[p]] = cand[p + 1];
      filled++;
    }
    for (i = 0; i < N; i++) if (reg[i] < 0) reg[i] = (i / n) | 0;
    return reg;
  }

  function regionConnected(n, reg, g) {
    var N = n * n, start = -1, total = 0, i;
    for (i = 0; i < N; i++) if (reg[i] === g) { total++; if (start < 0) start = i; }
    if (start < 0) return false;
    var seen = new Uint8Array(N), stack = [start], got = 0;
    seen[start] = 1;
    while (stack.length) {
      var x = stack.pop();
      got++;
      var nb = neighbours4(n, x);
      for (var k = 0; k < nb.length; k++) {
        var y = nb[k];
        if (!seen[y] && reg[y] === g) { seen[y] = 1; stack.push(y); }
      }
    }
    return got === total;
  }

  // 등불 자리가 아닌 경계 칸 하나를 이웃 꽃밭으로 옮긴다(꽃밭은 이어진 채로).
  function mutate(n, reg, isSol, rand) {
    var N = n * n;
    for (var tries = 0; tries < 60; tries++) {
      var i = (rand() * N) | 0;
      if (isSol[i]) continue;
      var nb = neighbours4(n, i);
      var j = nb[(rand() * nb.length) | 0];
      if (reg[j] === reg[i]) continue;
      var old = reg[i];
      reg[i] = reg[j];
      if (regionConnected(n, reg, old)) return true;
      reg[i] = old;
    }
    return false;
  }

  // 논리만으로 풀리는 판 하나. 막히면 꽃밭 경계를 한 칸씩 고쳐 다시 풀고, 남은 모르는 칸이 늘지 않을 때만 받아들인다
  // (최대 maxMut 번, 없으면 n × 14 번). 못 만들면 null — 부르는 쪽(tools\make_levels.js 등)은 시도 횟수·초 상한 안에서
  // 다음 씨앗으로 다시 하고, 상한에 걸리면 이미 모은 판(pool.json)만으로 레벨을 놓는다.
  function generate(n, rand, maxMut) {
    if (!(maxMut >= 0)) maxMut = n * 14;
    var sol = genSolution(n, rand);
    if (!sol) return null;
    var reg = growRegions(n, sol, rand);
    var isSol = new Uint8Array(n * n);
    for (var r = 0; r < n; r++) isSol[r * n + sol[r]] = 1;
    var res = solveLogic(n, reg, false);
    for (var m = 0; m < maxMut && !res.solved; m++) {
      var keep = reg.slice();
      if (!mutate(n, reg, isSol, rand)) break;
      var res2 = solveLogic(n, reg, false);
      if (res2.solved || res2.unknown <= res.unknown) res = res2;
      else reg = keep;
    }
    return res.solved ? { n: n, reg: reg, sol: sol, res: res } : null;
  }

  // ---------- 답이 하나인 판 ----------

  // 판 고르기 시도 상한. 넘으면 대체 판을 쓴다
  var MAX_TRIES = 400;

  // 답이 하나인 판인가: 꽃밭 n개가 모두 있고, 저장된 답이 규칙에 맞고, 되짚기로 센 답이 정확히 하나(끝까지 셌을 때만)
  function isUnique(n, reg, sol) {
    var N = n * n, r, g;
    if (!reg || reg.length !== N || !sol || sol.length !== n) return false;
    var seenReg = [];
    for (var i = 0; i < N; i++) {
      if (!(reg[i] >= 0 && reg[i] < n)) return false;
      seenReg[reg[i]] = true;
    }
    for (g = 0; g < n; g++) if (!seenReg[g]) return false;
    var usedC = [], usedG = [];
    for (r = 0; r < n; r++) {
      var c = sol[r];
      if (!(c >= 0 && c < n) || usedC[c]) return false;
      g = reg[r * n + c];
      if (usedG[g]) return false;
      if (r > 0 && Math.abs(sol[r - 1] - c) <= 1) return false;
      usedC[c] = true; usedG[g] = true;
    }
    return countSolutions(n, reg, 2) === 1 && !countAborted;
  }

  // 답이 하나인 판 하나를 고른다.
  //   first 가 답이 하나면 그대로 쓴다(source 'data').
  //   아니면 씨앗값 seed 로 generate 를 돌려 풀이기(isUnique)로 답이 하나인 판을 찾는다(source 'made').
  //   시도가 maxTries(기본 400)번에 걸리거나 budgetMs 가 지나면 fallback 을 대체 판으로 쓴다(source 'fallback', 답이 하나가 아닐 수 있다
  //   — 게임은 판을 깼는지 저장된 답이 아니라 규칙으로 보므로 규칙에 맞는 다른 배치도 깬 것으로 친다).
  function pickUnique(n, first, seed, fallback, maxTries, budgetMs) {
    if (first && isUnique(n, first.reg, first.sol)) return { board: first, source: 'data', tries: 0, unique: true };
    var cap = maxTries >= 0 ? maxTries : MAX_TRIES;
    var rand = rng(seed), t0 = Date.now(), tries = 0;
    while (tries < cap) {
      tries++;
      var g = generate(n, rand);
      if (g && isUnique(n, g.reg, g.sol)) {
        return { board: { n: n, reg: g.reg, sol: g.sol, score: score(g.res), maxTech: g.res.maxTech, steps: g.res.steps },
          source: 'made', tries: tries, unique: true };
      }
      if (budgetMs > 0 && Date.now() - t0 > budgetMs) break;
    }
    var fb = fallback || first || null;
    return { board: fb, source: 'fallback', tries: tries, unique: !!fb && isUnique(n, fb.reg, fb.sol) };
  }

  // ---------- 겹침 확인과 저장 형식 ----------

  // 돌리기·뒤집기 8가지 가운데 가장 작은 글자열 (꽃밭 번호는 처음 나온 차례로 다시 붙인다)
  function canonical(n, reg) {
    var best = null;
    for (var t = 0; t < 8; t++) {
      var map = [], next = 0, s = '';
      for (var r = 0; r < n; r++) {
        for (var c = 0; c < n; c++) {
          var rr = r, cc = c, tmp;
          if (t & 1) cc = n - 1 - cc;
          if (t & 2) rr = n - 1 - rr;
          if (t & 4) { tmp = rr; rr = cc; cc = tmp; }
          var g = reg[rr * n + cc];
          if (map[g] === undefined) map[g] = next++;
          s += map[g].toString(36);
        }
      }
      if (best === null || s < best) best = s;
    }
    return best;
  }

  function encode(arr) {
    var s = '';
    for (var i = 0; i < arr.length; i++) s += arr[i].toString(36);
    return s;
  }

  function decode(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) out.push(parseInt(str.charAt(i), 36));
    return out;
  }

  // ---------- 힌트 (게임에서 쓴다) ----------

  function unitName(n, u) {
    if (u < n) return '위에서 ' + (u + 1) + '번째 가로줄';
    if (u < 2 * n) return '왼쪽에서 ' + (u - n + 1) + '번째 세로줄';
    return '이 꽃밭';
  }

  function lineWord(to, k) {
    if (to === 'row') return '가로줄 ' + k + '개';
    if (to === 'col') return '세로줄 ' + k + '개';
    return '꽃밭 ' + k + '개';
  }

  // 추리 한 단계를 이유 한 줄로
  function describe(n, step) {
    switch (step.tech) {
      case 1: return unitName(n, step.unit) + '에 등불이 들어갈 칸이 한 곳만 남았어요.';
      case 2: return '등불 둘레와 같은 줄·열·꽃밭에는 등불을 놓을 수 없어요.';
      case 3:
        if (step.dir === 'regionToLine') return '이 꽃밭은 ' + unitName(n, step.line) + ' 안에만 등불이 들어갈 수 있어요. 그 줄의 다른 칸은 비워요.';
        return unitName(n, step.unit) + '은 이 꽃밭 안에만 등불이 들어갈 수 있어요. 꽃밭의 다른 칸은 비워요.';
      case 4:
        return lineWord(step.from, step.k) + '가 ' + lineWord(step.to, step.k) + ' 안에 모여 있어요. 그 안의 다른 칸은 비워요.';
      case 5: return unitName(n, step.unit) + '의 어느 칸에 놓아도 표시한 칸은 막혀요.';
      default: return '';
    }
  }

  // marks: 0 빈칸, 1 ×, 2 등불. 답 칸을 찍어 주지 않고 다음 추리 한 단계를 돌려준다.
  function hintStep(n, reg, sol, marks) {
    var P = prepare(n, reg), N = P.N, st = new Int8Array(N), i, j;
    var isSol = new Uint8Array(N);
    for (var r = 0; r < n; r++) isSol[r * n + sol[r]] = 1;
    for (i = 0; i < N; i++) {
      if (marks[i] === 2) {
        if (!isSol[i]) return { tech: 0, wrong: true, place: [], elim: [], focus: [i], msg: '이 등불은 자리가 맞지 않아요. 빼고 다시 생각해 봐요.' };
        st[i] = 1;
      } else if (marks[i] === 1 && !isSol[i]) {
        st[i] = -1;
      }
    }
    // 놓인 등불의 둘레는 말없이 지우고 그다음 추리를 찾는다
    for (i = 0; i < N; i++) {
      if (st[i] !== 1) continue;
      for (j = 0; j < N; j++) if (st[j] === 0 && P.peer[i * N + j]) st[j] = -1;
    }
    var s = findStep(P, st);
    if (!s || s.bad) return null;
    s.msg = describe(n, s);
    return s;
  }

  return {
    TECH_NAMES: TECH_NAMES,
    SCORE_RULE: SCORE_RULE,
    rng: rng,
    prepare: prepare,
    findStep: findStep,
    applyStep: applyStep,
    solveLogic: solveLogic,
    score: score,
    countSolutions: countSolutions,
    lastCountAborted: function () { return countAborted; },
    genSolution: genSolution,
    growRegions: growRegions,
    regionConnected: regionConnected,
    generate: generate,
    MAX_TRIES: MAX_TRIES,
    isUnique: isUnique,
    pickUnique: pickUnique,
    canonical: canonical,
    encode: encode,
    decode: decode,
    describe: describe,
    hintStep: hintStep
  };
});
