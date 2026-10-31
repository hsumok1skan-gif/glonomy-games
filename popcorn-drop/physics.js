/* Popcorn Drop — 판 모양과 물리 (옥수수 알·팝콘). 화면 그리기는 하지 않는다. */
(function () {
  'use strict';

  // 논리 좌표: 9:16 세로 화면 360 × 640
  const W = 360, H = 640;
  const QW = 74;                    // 왼쪽 손님 줄 폭
  const BL = 78, BR = 350;          // 못 판 왼쪽·오른쪽 벽
  const BAG_Y = 50;                 // 옥수수 자루
  const SPAWN_Y0 = 64, SPAWN_Y1 = 104;
  const PEG_TOP = 124, PEG_GAP_Y = 30, PEG_R = 4, KR = 4.5;
  const BASE_ROWS = 8, MAX_ROWS = 11;
  const PAN_Y = 462;                // 프라이팬 윗면
  const FLOOR = 506;                // 프라이팬 밖으로 떨어진 알이 구르는 바닥
  const BIN_Y = 522;                // 아래 팝콘 통 띠 윗면
  const BIN_B = 560;
  const G_K = 760, G_P = 600;       // 중력 (알·팝콘)
  const MAX_LIFE = 7;               // 알이 7초 넘게 판에 있으면 곧장 아래로
  const PAN_X = (BL + BR) / 2;
  const USABLE = BR - BL - 2 * KR;  // 알이 떨어질 수 있는 폭

  // 정해진 씨앗 난수 (못 자리는 상영관마다 늘 같아야 해서 Math.random 을 쓰지 않는다)
  function seeded(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 못 판: 상영관 모양(shape)과 줄 수(rows)로 짓고, 특수 못(sp = {x2, x3, gpeg})을 정해진 자리에 박는다.
  // 특수 못 자리는 씨앗으로 섞은 목록에서 종류마다 다른 차례(3으로 나눈 나머지)로 고른다.
  // 그래서 못을 더 사도 이미 박힌 못은 그 자리에 그대로 있다.
  function makeBoard(shape, rows, seed, sp) {
    rows = Math.max(1, Math.min(MAX_ROWS, rows));
    const byRow = [], all = [];
    for (let r = 0; r < rows; r++) {
      const odd = r % 2 === 1;
      const n = odd ? shape.odd : shape.even;
      const gap = (BR - BL) / shape.even;
      const off = (shape.wave ? Math.sin(r * 1.3) * shape.wave : 0) + (shape.shift ? (odd ? shape.shift : -shape.shift) : 0);
      const row = [];
      for (let j = 0; j < n; j++) {
        let x = odd ? BL + gap * (j + 1) : BL + gap * (j + 0.5);
        x = Math.max(BL + 7, Math.min(BR - 7, x + off));
        const p = { i: all.length, r, j, n, x, y: PEG_TOP + r * PEG_GAP_Y, k: 'n', glow: 0 };
        row.push(p); all.push(p);
      }
      byRow.push(row);
    }
    const rnd = seeded(seed || 1);
    const cand = all.filter(p => p.r >= 1 && p.r <= rows - 2 && p.j > 0 && p.j < p.n - 1);
    for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = cand[i]; cand[i] = cand[j]; cand[j] = t; }
    const put = (kind, count, res) => {
      let c = 0;
      for (let i = res; i < cand.length && c < count; i += 3) { if (cand[i].k === 'n') { cand[i].k = kind; c++; } }
    };
    put('x2', sp.x2 || 0, 0);
    put('x3', sp.x3 || 0, 1);
    put('gold', sp.gpeg || 0, 2);
    return { rows, byRow, all };
  }

  // 프라이팬: 하나면 가운데, 둘이면 양쪽으로 나눠 놓는다(두 팬 합친 폭은 한 팬의 1.5배, 판 폭까지).
  function makePans(w, two) {
    w = Math.min(USABLE, w);
    if (!two) return [{ x: PAN_X, w }];
    const each = Math.min(USABLE / 2 - 4, w * 0.75);
    const gap = Math.max(4, (USABLE - each * 2) / 3);
    const x1 = BL + KR + gap + each / 2, x2 = BR - KR - gap - each / 2;
    return [{ x: x1, w: each }, { x: x2, w: each }];
  }

  // 알 한 걸음. 못에 닿으면 onPeg(kernel, peg) 를 부른다.
  function stepKernel(k, dt, board, onPeg) {
    k.life += dt;
    k.vy += G_K * dt;
    if (k.vy > 520) k.vy = 520;
    k.vx *= 0.995;
    k.x += k.vx * dt;
    k.y += k.vy * dt;
    if (k.x < BL + KR) { k.x = BL + KR; k.vx = Math.abs(k.vx) * 0.5; }
    if (k.x > BR - KR) { k.x = BR - KR; k.vx = -Math.abs(k.vx) * 0.5; }
    const r = Math.round((k.y - PEG_TOP) / PEG_GAP_Y);
    if (r >= 0 && r < board.rows) {
      const row = board.byRow[r];
      for (let j = 0; j < row.length; j++) {
        const p = row[j];
        const dx = k.x - p.x, dy = k.y - p.y;
        const rr = PEG_R + KR + (p.k === 'n' ? 0 : 1.5);
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
        }
      }
    }
    if (k.life > MAX_LIFE && k.y < PAN_Y - 8) { k.vx = 0; k.vy = Math.max(k.vy, 300); k.y = Math.max(k.y, PEG_TOP + board.rows * PEG_GAP_Y); }
  }

  // 팝콘 한 걸음: 위로 튀었다가 아래 팝콘 통 띠에 떨어지면 'bin'
  function stepPop(p, dt) {
    p.vy += G_P * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.spin += p.vs * dt;
    if (p.x < BL) { p.x = BL; p.vx = Math.abs(p.vx) * 0.4; }
    if (p.x > BR) { p.x = BR; p.vx = -Math.abs(p.vx) * 0.4; }
    if (p.vy > 0 && p.y >= BIN_Y + 6) return 'bin';
    return null;
  }

  window.Phys = {
    W, H, QW, BL, BR, BAG_Y, SPAWN_Y0, SPAWN_Y1, PEG_TOP, PEG_GAP_Y, PEG_R, KR, BASE_ROWS, MAX_ROWS,
    PAN_Y, FLOOR, BIN_Y, BIN_B, PAN_X, USABLE, MAX_LIFE, seeded, makeBoard, makePans, stepKernel, stepPop
  };
})();
