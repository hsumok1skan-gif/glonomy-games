/* Popcorn Drop — 판 모양과 물리 (옥수수 알·팝콘). 화면 그리기는 하지 않는다. */
(function () {
  'use strict';

  // 논리 좌표: 9:16 세로 화면 360 × 640
  const W = 360, H = 640;
  const SIDE = 62;                 // 양옆 객석 띠 폭
  const BL = SIDE, BR = W - SIDE;  // 못 판 왼쪽·오른쪽 벽
  const FUNNEL_Y = 86, FUNNEL_MIN = 80, FUNNEL_MAX = 280;
  const PEG_TOP = 112, PEG_GAP_Y = 29, PEG_ROWS = 12, PEG_GAP_X = (BR - BL) / 8;
  const PEG_R = 4, KR = 4.5;
  const POT_TOP = 460, POT_BOT = 518, POT_N = 5, POT_W = (BR - BL) / POT_N;
  const FLOOR = 632;
  const ROW_BOTTOM = 604, ROW_GAP = 49;   // 객석 줄: 아래부터 위로
  const G_K = 760, G_P = 520;             // 중력 (알·팝콘)
  const MAX_LIFE = 9;                      // 알이 판에 9초 넘게 있으면 바로 아래 냄비로

  function potX(i) { return BL + POT_W * (i + 0.5); }
  function potAt(x) { return Math.max(0, Math.min(POT_N - 1, Math.floor((x - BL) / POT_W))); }
  function rowY(i) { return ROW_BOTTOM - i * ROW_GAP; }

  // 정해진 씨앗 난수 (못 판 무늬는 누구에게나 같아야 해서 Math.random 을 쓰지 않는다)
  function seeded(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 못 90개: 짝수 줄 8개, 홀수 줄 7개 엇갈림
  function makePegs() {
    const pegs = [];
    for (let r = 0; r < PEG_ROWS; r++) {
      const odd = r % 2 === 1;
      const n = odd ? 7 : 8;
      for (let j = 0; j < n; j++) {
        const x = odd ? BL + PEG_GAP_X * (j + 1) : BL + PEG_GAP_X * (j + 0.5);
        pegs.push({ i: pegs.length, r, j, n, x, y: PEG_TOP + r * PEG_GAP_Y, k: 'n', glow: 0, own: false });
      }
    }
    return pegs;
  }
  const ROW_START = [];
  (function () { let s = 0; for (let r = 0; r < PEG_ROWS; r++) { ROW_START.push(s); s += r % 2 ? 7 : 8; } })();

  function zoneScore(p, zone) {
    const cx = (p.x - BL) / (BR - BL) - 0.5, ry = p.r / (PEG_ROWS - 1);
    if (zone === 'center') return 1 - Math.abs(cx) * 1.6 + (ry > 0.15 && ry < 0.8 ? 0.3 : 0);
    if (zone === 'top') return 1 - ry;
    if (zone === 'low') return ry;
    if (zone === 'wide') return Math.abs(cx) * 1.4 + (ry > 0.2 ? 0.2 : 0);
    return 0.5;
  }

  // 무늬대로 특수 못을 놓는다. 쥐구멍은 가장자리 못(줄의 맨 앞·맨 끝)에만.
  function applyLayout(pegs, layout, extra, rats, seed) {
    const rnd = seeded(seed || 1);
    const free = () => pegs.filter(p => p.k === 'n' && p.r >= 1 && p.r <= PEG_ROWS - 2 && p.j > 0 && p.j < p.n - 1);
    function put(kind, count) {
      for (let c = 0; c < count; c++) {
        const list = free();
        if (!list.length) return;
        list.sort((a, b) => zoneScore(b, layout.zone) + rnd() * 0.9 - zoneScore(a, layout.zone) - rnd() * 0.9);
        // 같은 줄에 몰리지 않게 앞 몇 개 가운데서 고른다
        const pick = list[Math.floor(rnd() * Math.min(6, list.length))];
        pick.k = kind;
      }
    }
    put('x4', (layout.x4 || 0) + (extra.x4 || 0));
    put('gold', (layout.gold || 0) + (extra.gold || 0));
    put('x2', (layout.x2 || 0) + (extra.x2 || 0));
    const edges = pegs.filter(p => p.k === 'n' && p.r >= 2 && (p.j === 0 || p.j === p.n - 1));
    for (let c = 0; c < rats && edges.length; c++) {
      const at = Math.floor(rnd() * edges.length);
      edges.splice(at, 1)[0].k = 'rat';
    }
  }

  // 알 한 걸음. 못에 닿으면 onPeg(kernel, peg) 를 부른다. 냄비 줄에 닿으면 'pot' 을 돌려준다.
  function stepKernel(k, dt, pegs, onPeg) {
    k.life += dt;
    k.vy += G_K * dt;
    if (k.vy > 520) k.vy = 520;
    k.vx *= 0.995;
    k.x += k.vx * dt;
    k.y += k.vy * dt;
    if (k.x < BL + KR) { k.x = BL + KR; k.vx = Math.abs(k.vx) * 0.5; }
    if (k.x > BR - KR) { k.x = BR - KR; k.vx = -Math.abs(k.vx) * 0.5; }
    const rf = (k.y - PEG_TOP) / PEG_GAP_Y;
    const r = Math.round(rf);
    if (r >= 0 && r < PEG_ROWS) {
      const odd = r % 2 === 1;
      const jf = odd ? (k.x - BL) / PEG_GAP_X - 1 : (k.x - BL) / PEG_GAP_X - 0.5;
      const n = odd ? 7 : 8;
      const j0 = Math.round(jf);
      for (let j = j0 - 1; j <= j0 + 1; j++) {
        if (j < 0 || j >= n) continue;
        const p = pegs[ROW_START[r] + j];
        const dx = k.x - p.x, dy = k.y - p.y;
        const rr = (p.k === 'rat' ? PEG_R + 2.5 : PEG_R) + KR;
        const d2 = dx * dx + dy * dy;
        if (d2 < rr * rr) {
          const d = Math.sqrt(d2) || 0.01;
          const nx = dx / d, ny = dy / d;
          k.x = p.x + nx * rr; k.y = p.y + ny * rr;
          const vn = k.vx * nx + k.vy * ny;
          if (vn < 0) { k.vx -= 1.5 * vn * nx; k.vy -= 1.5 * vn * ny; }
          // 못 꼭대기에 얹히지 않게 옆으로 살짝 민다
          if (Math.abs(nx) < 0.2) k.vx += (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 40);
          k.vx += (Math.random() - 0.5) * 30;
          if (k.lastPeg !== p.i) { k.lastPeg = p.i; onPeg(k, p); }
          if (k.dead) return null;
        }
      }
    }
    if (k.life > MAX_LIFE && k.y < POT_TOP) { k.y = POT_TOP; }
    if (k.y >= POT_TOP) return 'pot';
    return null;
  }

  // 팝콘 한 걸음. 객석 띠에서 떨어지며 통 줄을 지나면 catchAt(side, x, yPrev, y) 를 묻는다.
  function stepPop(p, dt, catchAt) {
    const yPrev = p.y;
    p.vy += G_P * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.spin += p.vs * dt;
    if (p.x < 4) { p.x = 4; p.vx = Math.abs(p.vx) * 0.35; }
    if (p.x > W - 4) { p.x = W - 4; p.vx = -Math.abs(p.vx) * 0.35; }
    if (p.vy > 0) {
      const side = p.x < SIDE ? 0 : (p.x > W - SIDE ? 1 : -1);
      if (side >= 0 && catchAt(p, side, yPrev, p.y)) return 'caught';
      if (side < 0 && p.y > POT_TOP - 4 && yPrev <= POT_TOP - 4) return 'lost';
    }
    if (p.y > FLOOR) return 'lost';
    return null;
  }

  window.Phys = {
    W, H, SIDE, BL, BR, FUNNEL_Y, FUNNEL_MIN, FUNNEL_MAX, PEG_R, KR, POT_TOP, POT_BOT, POT_N, POT_W, FLOOR,
    ROW_BOTTOM, ROW_GAP, PEG_ROWS, potX, potAt, rowY, seeded, makePegs, applyLayout, stepKernel, stepPop
  };
})();
