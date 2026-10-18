"use strict";
/* GLONOMY 게임 이펙트 TIP — 엔진
   레시피 파일(recipes/*.js)은 이 파일 다음에 불러오고, RECIPES.push({...})로 등록합니다. */
/* ───────── 기본 도구 ───────── */
const G = 280;                 // 바닥 높이 (월드 좌표)
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[(Math.random() * arr.length) | 0];
const E = {
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  inout: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  lin: t => t,
  back: t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
};

/* ───────── 그림: 전부 코드로 그린 단순 도형 ───────── */
const SPR = {};
const INK = "#0f172a";
function tinted(src, color) {
  const c = document.createElement("canvas");
  c.width = src.width; c.height = src.height;
  const x = c.getContext("2d");
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = "source-atop";
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}
function mk(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d"); x.lineJoin = "round"; x.lineCap = "round";
  draw(x, w, h);
  return c;
}
function rr(x, X, Y, W, H, R, fill, stroke = null, lw = 10) {
  x.beginPath(); x.roundRect(X, Y, W, H, R);
  x.fillStyle = fill; x.fill();
  if (stroke) { x.lineWidth = lw; x.strokeStyle = stroke; x.stroke(); }
}
function eye(x, cx, cy, r, look) {
  x.fillStyle = "#fff"; x.beginPath(); x.ellipse(cx, cy, r * 0.8, r, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = INK; x.beginPath(); x.arc(cx + look * r * 0.35, cy + r * 0.15, r * 0.45, 0, Math.PI * 2); x.fill();
}
function lg(x, x0, y0, x1, y1, stops) { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
function rg(x, cx, cy, r0, r1, stops, fx, fy) { const g = x.createRadialGradient(fx ?? cx, fy ?? cy, r0, cx, cy, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
function glowBar(x, X, Y, W, H, col, blur) {
  x.save(); x.shadowColor = col; x.shadowBlur = blur; x.fillStyle = col;
  x.beginPath(); x.roundRect(X, Y, W, H, H / 2); x.fill(); x.restore();
  x.fillStyle = "rgba(255,255,255,0.75)"; x.beginPath(); x.roundRect(X + W * 0.15, Y + H * 0.3, W * 0.5, H * 0.3, H * 0.15); x.fill();
}
function aoBottom(x, X, Y, W, H, R) {
  x.save(); x.beginPath(); x.roundRect(X, Y, W, H, R); x.clip();
  x.fillStyle = lg(x, 0, Y + H * 0.6, 0, Y + H, [[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,0.28)"]]); x.fillRect(X, Y, W, H);
  x.fillStyle = lg(x, X, 0, X + W * 0.25, 0, [[0, "rgba(255,255,255,0.35)"], [1, "rgba(255,255,255,0)"]]); x.fillRect(X, Y, W * 0.25, H);
  x.restore();
}
// 각진 원통: 앞쪽 면만 그리고, 왼쪽에서 오는 빛에 따라 면마다 한 가지 명암
const mixc = (a, b, t) => `rgb(${a.map((v, i) => Math.round(b[i] + (v - b[i]) * t)).join(",")})`;
function facetCyl(x, cx, topY, botY, rTop, rBot, n, ry, light, dark) {
  const off = Math.PI / n, pt = (k, r, y) => { const a = k * TAU / n + off; return [cx + Math.cos(a) * r, y + Math.sin(a) * ry * (r / rBot)]; };
  x.lineJoin = "round"; x.strokeStyle = "rgba(20,20,24,0.28)"; x.lineWidth = 1.6;
  for (let k = 0; k < n; k++) {
    const mid = (k + 0.5) * TAU / n + off;
    if (Math.sin(mid) <= 0) continue;
    const t = Math.max(0, Math.min(1, 0.55 - 0.5 * Math.cos(mid) + 0.15 * Math.sin(mid)));
    const q = [pt(k, rTop, topY), pt(k + 1, rTop, topY), pt(k + 1, rBot, botY), pt(k, rBot, botY)];
    x.fillStyle = mixc(light, dark, t);
    x.beginPath(); q.forEach((v, i) => x[i ? "lineTo" : "moveTo"](v[0], v[1])); x.closePath(); x.fill(); x.stroke();
  }
  x.fillStyle = mixc(light, dark, 0.93);
  x.beginPath(); for (let k = 0; k < n; k++) { const v = pt(k, rTop, topY); x[k ? "lineTo" : "moveTo"](v[0], v[1]); } x.closePath(); x.fill(); x.stroke();
}
// 크리스털: 십각 기둥 + 위아래 두 단 피라미드. 면마다 명암, 반투명, 밝은 모서리
function facetCrystal(x, cx, topY, botY, r, capH, n, ry, light, dark) {
  const off = Math.PI / n, y0 = topY + capH, y1 = botY - capH, rA = r * 0.58;
  const yA0 = topY + capH * 0.5, yA1 = botY - capH * 0.5;
  const ring = (k, y, rr, tw = 0) => { const a = (k + tw) * TAU / n + off; return [cx + Math.cos(a) * rr, y + Math.sin(a) * ry * rr / r]; };
  const poly = (pts, t) => { x.fillStyle = mixc(light, dark, Math.max(0, Math.min(1, t))); x.beginPath(); pts.forEach((v, i) => x[i ? "lineTo" : "moveTo"](v[0], v[1])); x.closePath(); x.fill(); x.stroke(); };
  x.lineJoin = "round"; x.lineWidth = 1.2; x.strokeStyle = `rgba(${light.join(",")},0.5)`;
  x.globalAlpha = 0.92;
  for (let k = 0; k < n; k++) {
    const mid = (k + 0.5) * TAU / n + off;
    if (Math.sin(mid) <= -0.05) continue;
    const sd = 0.55 - 0.5 * Math.cos(mid) + 0.12 * Math.sin(mid) + (k % 2 ? 0.06 : -0.04);
    poly([ring(k, y0, r), ring(k + 1, y0, r), ring(k + 1, y1, r), ring(k, y1, r)], sd * 0.85);
    poly([ring(k, yA0, rA, 0.5), ring(k + 1, yA0, rA, 0.5), ring(k + 1, y0, r), ring(k, y0, r)], sd * 0.75 + 0.18);
    poly([[cx, topY], ring(k, yA0, rA, 0.5), ring(k + 1, yA0, rA, 0.5)], sd * 0.6 + 0.36);
    poly([ring(k, yA1, rA, 0.5), ring(k + 1, yA1, rA, 0.5), ring(k + 1, y1, r), ring(k, y1, r)], sd * 0.6 - 0.05);
    poly([[cx, botY], ring(k, yA1, rA, 0.5), ring(k + 1, yA1, rA, 0.5)], sd * 0.45 - 0.1);
  }
  x.globalAlpha = 1;
  const g = x.createLinearGradient(cx - r * 0.35, 0, cx + r * 0.05, 0);
  g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,0.32)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(cx - r * 0.35, y0 + 6, r * 0.4, y1 - y0 - 12);
  x.strokeStyle = "rgba(255,255,255,0.9)"; x.lineWidth = 1.8;
  const e0 = ring(n / 2 - 0.5, yA0, rA, 0.5), e1 = ring(n / 2 - 0.5, y0, r), e2 = ring(n / 2 - 0.5, y1, r);
  x.beginPath(); x.moveTo(cx, topY + 2); x.lineTo(e0[0], e0[1]); x.lineTo(e1[0], e1[1]); x.lineTo(e2[0], e2[1]); x.stroke();
}
function facetTop(x, cx, cy, r, n, light, dark) {
  x.lineJoin = "round"; x.strokeStyle = "rgba(20,20,24,0.25)"; x.lineWidth = 1.4;
  for (let k = 0; k < n; k++) {
    const a0 = k * TAU / n, a1 = (k + 1) * TAU / n, mid = (a0 + a1) / 2;
    const t = Math.max(0, Math.min(1, 0.55 - 0.45 * Math.cos(mid + 0.8)));
    x.fillStyle = mixc(light, dark, 0.35 + t * 0.65);
    x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r); x.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r); x.closePath(); x.fill(); x.stroke();
  }
}
// 3D 느낌의 둥근 마디: 왼쪽 위에서 빛, 아래쪽 그늘, 작은 반사광
function seg(x, cx, cy, rx, ry, [light, base, dark]) {
  const g = x.createRadialGradient(cx - rx * 0.35, cy - ry * 0.45, Math.min(rx, ry) * 0.1, cx, cy, Math.max(rx, ry) * 1.05);
  g.addColorStop(0, light); g.addColorStop(0.55, base); g.addColorStop(1, dark);
  x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, TAU); x.fill();
  x.fillStyle = "rgba(255,255,255,0.55)"; x.beginPath(); x.ellipse(cx - rx * 0.38, cy - ry * 0.5, rx * 0.22, ry * 0.12, -0.5, 0, TAU); x.fill();
}
// ───── 석고상 같은 로우폴리: 상자·사다리꼴 기둥·피라미드로 몸을 만들고 면마다 한 가지 명암 ─────
// 블록: 아래 중심 (x, y0, z), 아래 크기 (dx, dz), 높이 h, 윗면 배율 t, 윗면 이동 (ox, oz)
function blk(x, y0, z, dx, h, dz, t = 1, ox = 0, oz = 0) {
  const b = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const v = b.map(([i, k]) => [x + i * dx / 2, y0, z + k * dz / 2]).concat(b.map(([i, k]) => [x + ox + i * dx / 2 * t, y0 + h, z + oz + k * dz / 2 * t]));
  return { v, f: [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]] };
}
// 피라미드: 바닥 네 점 + 꼭짓점
function pyr(base, apex) { return { v: base.concat([apex]), f: [[0, 1, 2, 3], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]] }; }
function renderPoly(x, W, H, parts, yaw, pitch, light, dark, pad = 4) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const T = ([a, b, c]) => { const x1 = a * cy + c * sy, z1 = -a * sy + c * cy; return [x1, b * cp - z1 * sp, b * sp + z1 * cp]; };
  const L = [-0.55, 0.62, 0.56], ln = Math.hypot(...L); L.forEach((q, i) => (L[i] = q / ln));
  const faces = [];
  for (const p of parts) {
    const tv = p.v.map(T), cen = tv.reduce((s, q) => [s[0] + q[0], s[1] + q[1], s[2] + q[2]], [0, 0, 0]).map(q => q / tv.length);
    for (const f of p.f) {
      const q = f.map(i => tv[i]);
      const u = [q[1][0] - q[0][0], q[1][1] - q[0][1], q[1][2] - q[0][2]], w = [q[2][0] - q[0][0], q[2][1] - q[0][1], q[2][2] - q[0][2]];
      let n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      const fc = q.reduce((s, r) => [s[0] + r[0], s[1] + r[1], s[2] + r[2]], [0, 0, 0]).map(r => r / q.length);
      if (n[0] * (fc[0] - cen[0]) + n[1] * (fc[1] - cen[1]) + n[2] * (fc[2] - cen[2]) < 0) n = n.map(r => -r);
      const nl = Math.hypot(...n) || 1; n = n.map(r => r / nl);
      if (n[2] <= 0.01) continue;
      const b = 0.16 + 0.84 * Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
      faces.push({ q, z: fc[2], b, light: p.light || light, dark: p.dark || dark });
    }
  }
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const f of faces) for (const q of f.q) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
  const k = Math.min((W - pad * 2) / (x1 - x0), (H - pad * 2) / (y1 - y0)), ox = W / 2 - (x0 + x1) / 2 * k, oy = H - pad + y0 * k;
  faces.sort((a, b) => a.z - b.z);
  x.lineJoin = "round"; x.lineWidth = 1.1; x.strokeStyle = "rgba(20,20,26,0.35)";
  for (const f of faces) {
    x.fillStyle = mixc(f.light, f.dark, f.b);
    x.beginPath(); f.q.forEach((q, i) => x[i ? "lineTo" : "moveTo"](ox + q[0] * k, oy - q[1] * k)); x.closePath(); x.fill(); x.stroke();
  }
}
// 사람: 오른쪽(+x)을 봄, 앞팔은 앞으로 뻗음 (뭉툭한 석고상 비율)
function humanModel() {
  return [
    blk(0, 0, -15, 30, 78, 26, 0.92), blk(0, 0, 15, 30, 78, 26, 0.92),
    blk(0, 76, 0, 40, 74, 66, 1.18),
    blk(-2, 104, -50, 22, 52, 22, 0.85, -3, 0),
    blk(2, 124, 51, 22, 32, 22, 0.9, 8, 0), blk(26, 112, 51, 44, 19, 19),
    blk(0, 148, 0, 20, 10, 22),
    blk(4, 156, 0, 50, 50, 46, 0.82, 2, 0),
  ];
}
// 고블린: 왼쪽(−x)을 봄, 구부정한 몸, 큰 머리, 길고 뾰족한 귀와 코
function goblinModel() {
  const F = -1;
  const ear = s => pyr([[F * 4, 108, s * 30], [F * 26, 108, s * 30], [F * 26, 134, s * 30], [F * 4, 134, s * 30]], [F * -6, 150, s * 84]);
  return [
    blk(0, 0, -15, 26, 40, 22, 0.9), blk(0, 0, 15, 26, 40, 22, 0.9),
    blk(0, 38, 0, 52, 52, 62, 0.9, F * 12, 0),
    blk(F * 10, 34, -42, 18, 58, 18, 0.85, F * 8, 0), blk(F * 10, 34, 42, 18, 58, 18, 0.85, F * 8, 0),
    blk(F * 18, 88, 0, 62, 58, 60, 0.8, F * 4, 0),
    ear(1), ear(-1),
    pyr([[F * 48, 102, -9], [F * 48, 102, 9], [F * 48, 122, 9], [F * 48, 122, -9]], [F * 76, 104, 0]),
  ];
}

/* 도트(가루) 느낌: 그림을 굵은 점으로 나누고, 밝기에 따라 점을 찍거나 비움 (4×4 바이어 디더링) */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function ditherize(src, rgb, cell = 4) {
  const W = src.width, H = src.height, gw = Math.ceil(W / cell), gh = Math.ceil(H / cell);
  const d = src.getContext("2d").getImageData(0, 0, W, H).data;
  const A = new Float32Array(gw * gh), L = new Float32Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    let a = 0, l = 0, n = 0;
    for (let y = gy * cell; y < Math.min(H, gy * cell + cell); y++) for (let x = gx * cell; x < Math.min(W, gx * cell + cell); x++) {
      const i = (y * W + x) * 4, al = d[i + 3] / 255; a += al; l += al * (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255; n++;
    }
    A[gy * gw + gx] = a / n; L[gy * gw + gx] = a > 0 ? l / a : 0;
  }
  const out = document.createElement("canvas"); out.width = W; out.height = H;
  const x = out.getContext("2d"), [r, g, b] = rgb;
  const on = (gx, gy) => gx >= 0 && gy >= 0 && gx < gw && gy < gh && A[gy * gw + gx] > 0.45;
  const px = (gx, gy, k) => { x.fillStyle = `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`; x.fillRect(gx * cell, gy * cell, cell, cell); };
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    if (!on(gx, gy)) {
      // 가루: 몸 둘레에 흩날리는 점
      let near = 0; for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) if (on(gx + ox, gy + oy)) near++;
      if (near && rnd() < 0.05) px(gx, gy, 0.75);
      continue;
    }
    const edge = !on(gx - 1, gy) || !on(gx + 1, gy) || !on(gx, gy - 1) || !on(gx, gy + 1);
    const lum = Math.max(0.06, Math.min(1, (L[gy * gw + gx] - 0.2) * 1.55)), th = (BAYER[(gy & 3) * 4 + (gx & 3)] + 0.5) / 16;
    if (edge) px(gx, gy, 0.95);
    else if (lum > th) px(gx, gy, 0.72 + 0.28 * lum);
  }
  return out;
}

/* 손으로 찍은 도트 캐릭터: '#' 밝은 점, '+' 그늘 점. 점 사이에 틈을 둬서 가루처럼 보이게 */
const PIX = {
  hero: [
    ".......####.........",
    "......######........",
    "......######........",
    "......#####+........",
    ".......####.........",
    "........##..........",
    ".....########.......",
    "....##########......",
    "....###########++#..",
    "...####+#####.+++##.",
    "...####+####...++##.",
    "...###++####........",
    "...###++####........",
    "....#######.........",
    "....###.####........",
    "...####..####.......",
    "...###....####......",
    "..####.....###......",
    "..###......####.....",
    ".####.......###.....",
    ".###........####....",
    "####.........###....",
    "###..........####...",
  ],
  foe: [
    "...#........#.......",
    "...##......##.......",
    "....##.###.#........",
    ".....######.........",
    "....#######+........",
    "....######++........",
    ".....#####+.........",
    "...##########.......",
    "..############......",
    ".##############.....",
    "##.###########+#....",
    "#..###########++#...",
    "...####++#####.++...",
    "...###++++####..#...",
    "...###########..#...",
    "....####..####......",
    "....###....###......",
    "...####....####.....",
    "...###......###.....",
    "..####......####....",
  ],
  heroTop: [
    "....######....",
    "..##########..",
    ".####++++####.",
    "####+####+####",
    "###+######+###",
    "###+######+###",
    "####+####+####",
    ".####++++####.",
    "..##########..",
    "....######....",
  ],
  foeTop: [
    "#............#",
    ".##.######.##.",
    "..##########..",
    ".####++++####.",
    "####+####+####",
    "###+######+###",
    "####+####+####",
    ".####++++####.",
    "..##########..",
    "....######....",
  ],
};
function pixSprite(rows, rgb, cell = 10) {
  const H = rows.length, W = rows[0].length;
  const c = document.createElement("canvas"); c.width = W * cell; c.height = H * cell;
  const x = c.getContext("2d"), [r, g, b] = rgb, gap = Math.max(1, Math.round(cell * 0.18));
  const dot = (cx, cy, k) => { x.fillStyle = `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`; x.fillRect(cx * cell, cy * cell, cell - gap, cell - gap); };
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const on = (i, j) => rows[j] && rows[j][i] && rows[j][i] !== ".";
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const ch = rows[j][i];
    if (ch === "#") dot(i, j, 1);
    else if (ch === "+") dot(i, j, 0.58);
    else {
      // 가루: 몸 가까이에 흩어진 점 몇 개
      let near = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (on(i + dx, j + dy)) near++;
      if (near && rnd() < 0.06) dot(i, j, 0.45);
    }
  }
  return c;
}
const DOT = { hero: [236, 230, 212], foe: [178, 214, 120] };
function makeSprites() {
  const S = {
    // 주인공: 로우폴리 사람 (석고상 톤)
    hero: pixSprite(PIX.hero, DOT.hero),
    // 적: 로우폴리 고블린
    foe: pixSprite(PIX.foe, DOT.foe),
    // 총
    gun: ditherize(mk(240, 140, x => {
      x.fillStyle = "#1c2028"; x.beginPath(); x.roundRect(52, 80, 42, 56, 10); x.fill();
      x.fillStyle = lg(x, 0, 20, 0, 84, [[0, "#5b6476"], [1, "#2a2f3a"]]); x.beginPath(); x.roundRect(38, 20, 128, 64, 14); x.fill();
      x.fillStyle = lg(x, 0, 26, 0, 56, [[0, "#3a414f"], [1, "#171a21"]]); x.beginPath(); x.roundRect(140, 26, 98, 30, 8); x.fill();
      x.fillStyle = "#c6f432"; x.fillRect(50, 62, 100, 5);
      x.fillStyle = "rgba(255,255,255,0.22)"; x.beginPath(); x.roundRect(46, 26, 112, 8, 4); x.fill();
    }), [215, 220, 210], 5),
    // 상자
    crate: mk(200, 200, x => {
      x.fillStyle = lg(x, 0, 12, 0, 188, [[0, "#fcd34d"], [1, "#d97706"]]); x.beginPath(); x.roundRect(12, 12, 176, 176, 28); x.fill();
      aoBottom(x, 12, 12, 176, 176, 28);
      x.strokeStyle = "rgba(124,45,18,0.35)"; x.lineWidth = 6; x.beginPath(); x.roundRect(30, 30, 140, 140, 16); x.stroke();
      x.fillStyle = "rgba(124,45,18,0.6)"; x.font = "900 92px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("?", 100, 106);
    }),
    // 수류탄
    grenade: mk(120, 140, x => {
      x.fillStyle = lg(x, 0, 6, 0, 40, [[0, "#d1d5db"], [1, "#6b7280"]]); x.beginPath(); x.roundRect(40, 6, 40, 34, 8); x.fill();
      x.fillStyle = rg(x, 60, 84, 4, 54, [[0, "#7c9a3a"], [1, "#2e4212"]], 42, 64); x.beginPath(); x.arc(60, 84, 50, 0, TAU); x.fill();
      x.fillStyle = "#c6f432"; x.fillRect(12, 80, 96, 6);
    }),
    // 동전
    coin: mk(120, 120, x => {
      x.fillStyle = rg(x, 60, 60, 4, 56, [[0, "#fff3b0"], [0.5, "#facc15"], [1, "#b7791f"]], 44, 40); x.beginPath(); x.arc(60, 60, 54, 0, TAU); x.fill();
      x.strokeStyle = "rgba(146,64,14,0.45)"; x.lineWidth = 6; x.beginPath(); x.arc(60, 60, 36, 0, TAU); x.stroke();
      x.fillStyle = "rgba(255,255,255,0.7)"; x.beginPath(); x.ellipse(44, 36, 12, 6, -0.6, 0, TAU); x.fill();
    }),
    // 보석 (면이 나뉜 다이아몬드)
    gem: mk(120, 130, x => {
      const f = (pts, c) => { x.beginPath(); pts.forEach((p, i) => x[i ? "lineTo" : "moveTo"](p[0], p[1])); x.closePath(); x.fillStyle = c; x.fill(); };
      f([[30, 12], [90, 12], [114, 46], [6, 46]], "#a5f3fc");
      f([[6, 46], [114, 46], [60, 124]], "#06b6d4");
      f([[6, 46], [60, 46], [60, 124]], "#22d3ee");
      f([[30, 12], [60, 12], [46, 46], [6, 46]], "#e0fdff");
    }),
    // 하트
    heart: mk(130, 120, x => {
      x.beginPath(); x.moveTo(65, 110);
      x.bezierCurveTo(8, 72, 4, 28, 36, 14); x.bezierCurveTo(52, 8, 62, 18, 65, 30);
      x.bezierCurveTo(68, 18, 78, 8, 94, 14); x.bezierCurveTo(126, 28, 122, 72, 65, 110); x.closePath();
      x.fillStyle = lg(x, 0, 10, 0, 110, [[0, "#fb7185"], [1, "#be123c"]]); x.fill();
      x.fillStyle = "rgba(255,255,255,0.5)"; x.beginPath(); x.ellipse(40, 34, 12, 7, -0.6, 0, TAU); x.fill();
    }),
  };
  // 위에서 본 주인공·적: 같은 모델을 위에서 내려다봄
  S.heroTop = pixSprite(PIX.heroTop, DOT.hero, 10);
  S.foeTop = pixSprite(PIX.foeTop, DOT.foe, 10);
  for (const k in S) SPR[k] = { c: S[k], white: tinted(S[k], "#ffffff"), red: tinted(S[k], "#ef4444"), orange: tinted(S[k], "#fb923c"), cyan: tinted(S[k], "#67e8f9") };
  return Promise.resolve();
}

/* ───────── 소리 (파일 없이 합성) ───────── */
const AU = { ctx: null };
function audioInit() {
  try {
    if (!AU.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      const c = new C();
      AU.ctx = c;
      AU.out = c.createGain(); AU.out.gain.value = 0.55;
      const comp = c.createDynamicsCompressor();
      AU.out.connect(comp); comp.connect(c.destination);
      const n = c.sampleRate, b = c.createBuffer(1, n, n), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      AU.noise = b;
    }
    if (AU.ctx.state !== "running") AU.ctx.resume();
  } catch (e) {}
}
function env(g, t, vol, dur) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}
function nz({ dur = 0.1, type = "lowpass", f = 1000, f2, q = 0.7, vol = 0.4, delay = 0 }) {
  const c = AU.ctx; if (!c) return;
  const t = c.currentTime + delay;
  const s = c.createBufferSource(); s.buffer = AU.noise;
  const fl = c.createBiquadFilter(); fl.type = type; fl.Q.value = q;
  fl.frequency.setValueAtTime(f, t);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = c.createGain(); env(g, t, vol, dur);
  s.connect(fl); fl.connect(g); g.connect(AU.out);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}
function tn({ type = "sine", f = 440, f2, dur = 0.1, vol = 0.3, delay = 0 }) {
  const c = AU.ctx; if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = c.createGain(); env(g, t, vol, dur);
  o.connect(g); g.connect(AU.out);
  o.start(t); o.stop(t + dur + 0.05);
}
const SFX = {
  gun(p = 1) { nz({ dur: 0.07, type: "highpass", f: 2000 * p, vol: 0.7 }); tn({ type: "square", f: 170 * p, f2: 40, dur: 0.13, vol: 0.28 }); nz({ dur: 0.28, f: 700, f2: 120, vol: 0.35 }); },
  hit(p = 1) { tn({ f: 200 * p, f2: 55, dur: 0.11, vol: 0.55 }); nz({ dur: 0.05, type: "bandpass", f: 2600, q: 2, vol: 0.35 }); },
  ping() { tn({ type: "triangle", f: 1500, f2: 1350, dur: 0.4, vol: 0.22 }); tn({ f: 2250, dur: 0.25, vol: 0.08 }); tn({ f: 70, f2: 35, dur: 0.3, vol: 0.6 }); },
  charge() { tn({ f: 220, f2: 880, dur: 0.36, vol: 0.14 }); nz({ dur: 0.36, type: "bandpass", f: 400, f2: 2400, q: 4, vol: 0.12 }); },
  magic() { tn({ type: "triangle", f: 880, f2: 440, dur: 0.18, vol: 0.16 }); nz({ dur: 0.22, type: "bandpass", f: 1800, f2: 700, q: 3, vol: 0.2 }); },
  burst() { nz({ dur: 0.35, f: 2400, f2: 200, vol: 0.5 }); tn({ f: 320, f2: 70, dur: 0.25, vol: 0.4 }); tn({ type: "triangle", f: 1320, f2: 660, dur: 0.25, vol: 0.12 }); },
  slash() { nz({ dur: 0.13, type: "bandpass", f: 4200, f2: 900, q: 1.6, vol: 0.5 }); },
  thud() { tn({ f: 140, f2: 38, dur: 0.2, vol: 0.8 }); nz({ dur: 0.12, f: 900, vol: 0.45 }); },
  blip(n = 1) { const f = 620 * Math.pow(2, Math.min(n - 1, 14) / 12); tn({ type: "triangle", f, dur: 0.1, vol: 0.22 }); tn({ f: f * 2, dur: 0.07, vol: 0.08, delay: 0.015 }); },
  hurt() { tn({ type: "square", f: 320, f2: 110, dur: 0.16, vol: 0.18 }); nz({ dur: 0.1, type: "bandpass", f: 1400, q: 1.5, vol: 0.35 }); tn({ f: 90, f2: 50, dur: 0.15, vol: 0.5 }); },
  toss() { nz({ dur: 0.2, type: "bandpass", f: 700, f2: 1600, q: 2, vol: 0.15 }); },
  boom() { nz({ dur: 1.1, f: 900, f2: 80, vol: 0.9 }); tn({ f: 85, f2: 28, dur: 0.7, vol: 0.9 }); nz({ dur: 0.12, type: "highpass", f: 2500, vol: 0.35 }); },
  shotgun() { nz({ dur: 0.1, type: "highpass", f: 1200, vol: 0.8 }); tn({ type: "square", f: 120, f2: 35, dur: 0.22, vol: 0.4 }); nz({ dur: 0.5, f: 900, f2: 100, vol: 0.6 }); },
  pump() { nz({ dur: 0.03, type: "bandpass", f: 2500, q: 2, vol: 0.4 }); nz({ dur: 0.04, type: "bandpass", f: 1500, q: 2, vol: 0.45, delay: 0.09 }); tn({ type: "square", f: 900, dur: 0.02, vol: 0.08, delay: 0.09 }); },
  smg(p = 1) { nz({ dur: 0.04, type: "highpass", f: 2600 * p, vol: 0.4 }); tn({ type: "square", f: 220 * p, f2: 70, dur: 0.06, vol: 0.15 }); },
  tick() { nz({ dur: 0.025, type: "bandpass", f: 3200, q: 2, vol: 0.2 }); },
  creak() { tn({ type: "sawtooth", f: 90, f2: 150, dur: 0.5, vol: 0.04 }); },
  twang() { tn({ type: "triangle", f: 230, f2: 150, dur: 0.28, vol: 0.3 }); nz({ dur: 0.15, type: "bandpass", f: 900, f2: 300, q: 2, vol: 0.2 }); },
  thunk() { tn({ f: 170, f2: 60, dur: 0.12, vol: 0.6 }); nz({ dur: 0.06, type: "bandpass", f: 600, q: 1.5, vol: 0.4 }); },
  slam() { tn({ f: 70, f2: 28, dur: 0.55, vol: 0.95 }); nz({ dur: 0.75, f: 500, f2: 60, vol: 0.9 }); nz({ dur: 0.08, type: "highpass", f: 3000, vol: 0.3 }); },
  jump() { tn({ type: "square", f: 300, f2: 620, dur: 0.1, vol: 0.1 }); },
  land() { tn({ f: 130, f2: 60, dur: 0.08, vol: 0.35 }); nz({ dur: 0.06, f: 700, vol: 0.25 }); },
  dash() { nz({ dur: 0.18, type: "bandpass", f: 600, f2: 3200, q: 2, vol: 0.4 }); },
  skid() { nz({ dur: 0.22, type: "bandpass", f: 2400, f2: 700, q: 1, vol: 0.22 }); },
  pop() { tn({ f: 480, f2: 960, dur: 0.07, vol: 0.3 }); nz({ dur: 0.05, type: "highpass", f: 3000, vol: 0.2 }); nz({ dur: 0.18, f: 900, f2: 200, vol: 0.35, delay: 0.03 }); },
  crit() { tn({ f: 140, f2: 38, dur: 0.25, vol: 0.85 }); nz({ dur: 0.15, type: "bandpass", f: 4000, f2: 900, q: 1.5, vol: 0.5 }); tn({ type: "triangle", f: 1400, f2: 700, dur: 0.3, vol: 0.18 }); },
  slashHit() { nz({ dur: 0.1, type: "bandpass", f: 4200, f2: 900, q: 1.6, vol: 0.45 }); tn({ f: 200, f2: 55, dur: 0.11, vol: 0.5 }); },
  chime(n = 0) { const f = 1320 * Math.pow(2, n / 12); tn({ f, dur: 0.5, vol: 0.14 }); tn({ f: f * 1.5, dur: 0.35, vol: 0.06, delay: 0.04 }); },
  fanfare() { [0, 4, 7, 12, 16].forEach((st, i) => tn({ type: "triangle", f: 523 * Math.pow(2, st / 12), dur: 0.28, vol: 0.17, delay: i * 0.085 })); },
  swish() { nz({ dur: 0.08, type: "bandpass", f: 2000, f2: 4200, q: 2, vol: 0.18 }); },
  scrape() { nz({ dur: 0.16, type: "bandpass", f: 420, f2: 260, q: 3, vol: 0.3 }); },
  tock() { tn({ f: 320, f2: 170, dur: 0.07, vol: 0.32 }); },
  clickDown() { tn({ f: 170, dur: 0.035, vol: 0.4 }); nz({ dur: 0.02, type: "bandpass", f: 1800, q: 2, vol: 0.3 }); },
  clickUp() { tn({ f: 900, dur: 0.03, vol: 0.22 }); nz({ dur: 0.015, type: "bandpass", f: 4200, q: 2, vol: 0.2 }); },
  rattle() { for (let i = 0; i < 5; i++) tn({ type: "square", f: 130 + i * 12, dur: 0.03, vol: 0.07, delay: i * 0.08 }); },
  boost() { nz({ dur: 0.8, type: "bandpass", f: 300, f2: 2400, q: 1, vol: 0.4 }); tn({ type: "sawtooth", f: 80, f2: 170, dur: 0.8, vol: 0.05 }); },
};
const NOSFX = new Proxy({}, { get: () => () => {} });

/* ───────── 등장인물 ───────── */
const ACTOR = {
  hero: { spr: "hero", h: 140, home: 120 },
  foe: { spr: "foe", h: 140, home: 420, hp: 100 },
  crate: { spr: "crate", h: 90, home: 420 },
  heroTop: { spr: "heroTop", h: 64, home: 130, top: true },
  foeTop: { spr: "foeTop", h: 60, home: 450, top: true, hp: 30 },
};

/* ───────── 엔진: 이펙트를 돌리는 작은 세계 ───────── */
class World {
  // bare: 전후 비교용. 모든 단계의 "동작·타이밍"은 그대로 켜 두고, 이펙트(훅)만 끈 세계
  constructor(R, n, view, muted, bare) {
    this.R = R; this.view = view; this.muted = !!muted; this.bare = !!bare;
    this.parts = []; this.shots = []; this.timers = []; this.tweens = []; this.actors = [];
    this.trauma = 0; this.kx = 0; this.ky = 0; this.zoom = 0; this.cam = { x: 0, y: 0, tx: 0, ty: 0 }; this.stopT = 0; this.ts = 1; this.slowT = 0; this.slowDur = 1; this.slowTo = 1;
    this.flashA = 0; this.flashC = "255,255,255"; this.vig = 0; this.time = 0; this.busy = false;
    this.setN(n);
    R.setup(this);
  }
  setN(n) { this.n = n; this.steps = new Set(this.R.steps.slice(0, n).map(s => s.id)); }
  on(id) { return this.steps.has(id); }
  emit(ev, ...a) { if (this.bare) return; for (const s of this.R.steps) if (this.steps.has(s.id) && typeof s[ev] === "function") s[ev](this, ...a); }
  get sfx() { return this.muted || app.mute || !this.on("sound") ? NOSFX : SFX; }

  actor(key, o = {}) {
    const d = Object.assign({}, ACTOR[key], o), s = SPR[d.spr], ar = s.c.width / s.c.height;
    const h = d.h || d.w / ar, w = d.w || d.h * ar;
    const a = {
      key, s, w, h, x: d.home, home: d.home, gy: d.gy || G, top: !!d.top, oySpring: !!d.top, vib: 0, vibAxis: "x",
      ox: 0, oy: 0, sx: 1, sy: 1, rot: 0, k: 10,
      flash: 0, tint: 0, burn: 0, blink: 0, barShake: 0, alpha: 1, flip: !!d.flip, alive: true,
      flying: false, vx: 0, vy: 0, spin: 0, maxHp: d.hp || 0, hp: d.hp || 0, hpLag: d.hp || 0, lagWait: 0,
    };
    this.actors.push(a);
    return a;
  }
  spawn(p) {
    const q = Object.assign({ x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: 0, life: 0.5, age: 0, size: 4, color: "255,255,255", type: "circle", rot: 0, vr: 0 }, p);
    if (q.add == null) q.add = ["glow", "spark", "star", "ring", "arc", "slash", "beam", "rays"].includes(q.type);
    if (q.seek) { q.x0 = q.x; q.y0 = q.y; }
    this.parts.push(q);
    if (this.parts.length > 700) this.parts.shift();
    return q;
  }
  shoot(p) { p.age = 0; this.shots.push(p); return p; }
  after(t, fn) { this.timers.push({ t, fn }); }
  tween(o, to, dur, ease = "out", done) {
    const from = {}; for (const k in to) from[k] = o[k];
    this.tweens.push({ o, from, to, dur, t: 0, ease: E[ease], done });
  }
  shake(amount, dir = 0) { this.trauma = Math.min(1, this.trauma + amount); this.kx += dir * amount * 30; }
  kick(dx, dy) { this.kx += dx; this.ky += dy; }
  zoomPunch(a) { this.zoom = Math.max(this.zoom, a); }
  hitstop(sec) { this.stopT = Math.max(this.stopT, sec); }
  /* 소리 단계가 켜져 있을 때만 직접 만든 소리를 냄: w.play(() => tn({...})) */
  play(fn) { if (this.sfx !== NOSFX && AU.ctx) fn(); }
  slowmo(scale, sec) { this.ts = scale; this.slowTo = scale; this.slowT = sec; this.slowDur = sec; }
  flash(color, a) { this.flashC = color; this.flashA = Math.max(this.flashA, a); }
  vignette(a) { this.vig = Math.max(this.vig, a); }
  fly(a, vx, vy, spin) { a.flying = true; a.vx = vx; a.vy = vy; a.spin = spin; }
  kill(a) {
    if (!a.alive) return;
    a.alive = false;
    this.emit("kill", a);
    if (!a.flying && !a.keep) a.alpha = 0;
    this.after(a.flying ? 1.2 : 0.55, () => this.respawn(a));
  }
  respawn(a) {
    Object.assign(a, { alive: true, flying: false, x: a.home, ox: 0, oy: 0, rot: 0, vx: 0, vy: 0, spin: 0, alpha: 1,
      flash: 0, tint: 0, burn: 0, keep: false, vib: 0, hp: a.maxHp, hpLag: a.maxHp, sx: 0.2, sy: 0.2 });
  }

  update(rdt) {
    this.frames = (this.frames || 0) + 1;
    this.trauma = Math.max(0, this.trauma - rdt * 1.7);
    this.kx -= this.kx * Math.min(1, rdt * 12);
    this.ky -= this.ky * Math.min(1, rdt * 12);
    this.zoom -= this.zoom * Math.min(1, rdt * 7);
    this.cam.x += (this.cam.tx - this.cam.x) * Math.min(1, rdt * 6);
    this.cam.y += (this.cam.ty - this.cam.y) * Math.min(1, rdt * 6);
    for (const a of this.actors) a.vib = Math.max(0, a.vib - rdt * (a.vibFade || 60));
    this.flashA = Math.max(0, this.flashA - rdt * 6);
    this.vig = Math.max(0, this.vig - rdt * 1.4);
    let dt;
    if (this.stopT > 0) { this.stopT -= rdt; dt = 0; }
    else {
      if (this.slowT > 0) {
        this.slowT -= rdt;
        const k = Math.max(0, 1 - this.slowT / this.slowDur);
        this.ts = this.slowT > 0 ? this.slowTo + (1 - this.slowTo) * E.in(k) : 1;
      }
      dt = rdt * this.ts;
    }
    if (dt > 0) this.step(dt);
  }
  step(dt) {
    this.time += dt;
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const t = this.timers[i]; t.t -= dt;
      if (t.t <= 0) { this.timers.splice(i, 1); t.fn(); }
    }
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const t = this.tweens[i]; t.t += dt;
      const k = Math.min(1, t.t / t.dur), e = t.ease(k);
      for (const p in t.to) t.o[p] = t.from[p] + (t.to[p] - t.from[p]) * e;
      if (k >= 1) { this.tweens.splice(i, 1); if (t.done) t.done(); }
    }
    for (const a of this.actors) {
      a.ox -= a.ox * Math.min(1, dt * a.k);
      if (a.oySpring && !a.flying) a.oy -= a.oy * Math.min(1, dt * a.k);
      if (a.k < 10 && Math.abs(a.ox) < 2) a.k = 10;
      a.sx += (1 - a.sx) * Math.min(1, dt * 12);
      a.sy += (1 - a.sy) * Math.min(1, dt * 12);
      a.flash = Math.max(0, a.flash - dt * 7);
      a.tint = Math.max(0, a.tint - dt * 2.5);
      a.blink = Math.max(0, a.blink - dt);
      a.barShake = Math.max(0, a.barShake - dt);
      if (a.flying) {
        a.x += a.vx * dt; a.oy += a.vy * dt; a.vy += 1500 * dt; a.rot += a.spin * dt;
        a.alpha = Math.max(0, a.alpha - dt * 0.9);
      }
    }
    if (this.R.update) this.R.update(this, dt);
    this.emit("update", dt);

    for (let i = this.shots.length - 1; i >= 0; i--) {
      const p = this.shots[i];
      p.age += dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; p.rot = (p.rot || 0) + (p.vr || 0) * dt;
      if (p.trail) {
        this.spawn({ type: "glow", x: p.x + rand(-3, 3), y: p.y + rand(-3, 3), vx: rand(-80, 0), vy: rand(-40, 40), size: rand(6, 10), size1: 0, life: rand(0.25, 0.45), color: p.trail });
        if (Math.random() < 0.3) this.spawn({ type: "spark", x: p.x, y: p.y, vx: rand(-200, -60), vy: rand(-90, 90), drag: 3, size: 1.6, life: 0.25, color: "255,255,255" });
      }
      if ((p.hitX != null && p.x >= p.hitX) || (p.hitY != null && p.y >= p.hitY) || (p.test && p.test(p))) {
        this.shots.splice(i, 1);
        if (p.onHit) p.onHit(p);
      } else if (p.x > 760 || p.y > 600 || p.x < -220 || p.y < -400 || (p.box && (p.x < p.box[0] || p.x > p.box[2] || p.y < p.box[1] || p.y > p.box[3]))) {
        this.shots.splice(i, 1);
        if (p.onOut) p.onOut(p);
      }
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.age += dt;
      if (p.age >= p.life) { this.parts.splice(i, 1); continue; }
      if (p.seek) {
        const k = E.in(p.age / p.life);
        p.x = p.x0 + (p.tx - p.x0) * k; p.y = p.y0 + (p.ty - p.y0) * k;
        continue;
      }
      const d = 1 / (1 + p.drag * dt);
      p.vx *= d; p.vy *= d; p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.floor) { const f = Math.max(0, 1 - dt * p.floor); p.vx *= f; p.vy *= f; p.vr *= f; }
      const gy = p.gy || G;
      if (p.ground && p.y > gy - 2) {
        p.y = gy - 2;
        if (Math.abs(p.vy) < 70) { p.vy = 0; const f = Math.max(0, 1 - dt * 8); p.vx *= f; p.vr *= f; }
        else { p.vy *= -p.bounce; p.vx *= 0.6; p.vr *= 0.5; }
      }
    }
  }

  draw(ctx) {
    const v = this.view, [rx, ry, rw, rh] = v.r;
    ctx.save();
    ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.clip();
    ctx.fillStyle = "#12140f"; ctx.fillRect(rx, ry, rw, rh);
    ctx.fillStyle = "rgba(255,255,255,0.045)";
    for (let gx = rx + 25; gx < rx + rw; gx += 25) ctx.fillRect(gx, ry, 1, rh);
    for (let gy = ry + 25; gy < ry + rh; gy += 25) ctx.fillRect(rx, gy, rw, 1);
    ctx.translate(v.x, v.y); ctx.scale(v.s, v.s);
    const tr = this.trauma * this.trauma;
    ctx.translate(270 + (Math.random() * 2 - 1) * tr * 24 + this.kx, 180 + (Math.random() * 2 - 1) * tr * 18 + this.ky);
    ctx.rotate((Math.random() * 2 - 1) * tr * 0.035);
    ctx.scale(1 + this.zoom, 1 + this.zoom);
    ctx.translate(-270 - this.cam.x, -180 - this.cam.y);

    // 바닥
    if (this.R.drawFloor) this.R.drawFloor(this, ctx);
    else {
      ctx.fillStyle = "rgba(255,255,255,0.025)"; ctx.fillRect(-80, G, 700, 120);
      ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fillRect(-80, G - 1, 700, 1.5);
    }

    for (const p of this.parts) if (p.under) drawPart(ctx, p);
    for (const a of this.actors) drawShadow(ctx, a);
    if (this.R.drawBack) this.R.drawBack(this, ctx);
    for (const a of this.actors) drawActor(ctx, a);
    if (this.R.drawFront) this.R.drawFront(this, ctx);
    for (const p of this.shots) drawShot(ctx, p);
    for (const p of this.parts) if (!p.under) drawPart(ctx, p);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    // 발광(블룸): 이펙트(파티클·탄)만 따로 그려 흐리게 겹침. 켜진 레이어가 많을수록 강해져요
    const N = this.R.steps.length, glowA = N && this.n > 0 && !this.bare ? 0.9 * this.n / N : 0;
    const gl = glowA > 0 ? bloomBegin(ctx, rx, ry, rw, rh) : null;
    if (gl) {
      for (const p of this.shots) drawShot(gl, p);
      for (const p of this.parts) if (!p.under) drawPart(gl, p);
    }
    if (this.R.drawHud) this.R.drawHud(this, ctx);
    ctx.restore();
    if (gl) bloomEnd(ctx, rx, ry, rw, rh, glowA);

    // 화면 전체 효과 (번쩍임, 붉은 테두리)
    if (this.flashA > 0 || this.vig > 0) {
      ctx.save();
      const r = { x: rx, y: ry, w: rw, h: rh };
      ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
      if (this.flashA > 0) { ctx.fillStyle = `rgba(${this.flashC},${Math.min(1, this.flashA)})`; ctx.fillRect(r.x, r.y, r.w, r.h); }
      if (this.vig > 0) {
        const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        const vg = ctx.createRadialGradient(cx, cy, Math.min(r.w, r.h) * 0.32, cx, cy, Math.max(r.w, r.h) * 0.62);
        vg.addColorStop(0, "rgba(220,38,38,0)"); vg.addColorStop(1, `rgba(220,38,38,${Math.min(0.9, this.vig)})`);
        ctx.fillStyle = vg; ctx.fillRect(r.x, r.y, r.w, r.h);
      }
      ctx.restore();
    }
    // 뷰포트 테두리와 모서리 눈금
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1;
    ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
    ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 2;
    const t = 14;
    ctx.beginPath();
    ctx.moveTo(rx, ry + t); ctx.lineTo(rx, ry); ctx.lineTo(rx + t, ry);
    ctx.moveTo(rx + rw - t, ry); ctx.lineTo(rx + rw, ry); ctx.lineTo(rx + rw, ry + t);
    ctx.moveTo(rx + rw, ry + rh - t); ctx.lineTo(rx + rw, ry + rh); ctx.lineTo(rx + rw - t, ry + rh);
    ctx.moveTo(rx + t, ry + rh); ctx.lineTo(rx, ry + rh); ctx.lineTo(rx, ry + rh - t);
    ctx.stroke();
  }
}

/* ───────── 그리기 도우미 ───────── */
let frameNo = 0;
function glow(ctx, x, y, r, c, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(0.35, `rgba(${c},${a * 0.45})`); g.addColorStop(1, `rgba(${c},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}
function starPath(ctx, x, y, s) {
  const t = s * 0.16;
  ctx.beginPath();
  ctx.moveTo(x, y - s); ctx.lineTo(x + t, y - t); ctx.lineTo(x + s, y); ctx.lineTo(x + t, y + t);
  ctx.lineTo(x, y + s); ctx.lineTo(x - t, y + t); ctx.lineTo(x - s, y); ctx.lineTo(x - t, y - t); ctx.closePath();
}
function drawPart(ctx, p) {
  const k = p.age / p.life, rem = 1 - k;
  const s = p.size1 == null ? p.size : p.size + (p.size1 - p.size) * E.out(k);
  let a = p.hold ? Math.min(1, rem * 4) : rem;
  if (p.alpha != null) a *= p.alpha;
  if (a <= 0 || s <= 0) return;
  ctx.globalCompositeOperation = p.add ? "lighter" : "source-over";
  ctx.globalAlpha = 1;
  switch (p.type) {
    case "glow": glow(ctx, p.x, p.y, s, p.color, a); break;
    case "spark": {
      const dir = Math.atan2(p.vy, p.vx), len = Math.max(s * 2, Math.hypot(p.vx, p.vy) * 0.035);
      ctx.strokeStyle = `rgba(${p.color},${a})`; ctx.lineWidth = s; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(p.x - Math.cos(dir) * len, p.y - Math.sin(dir) * len); ctx.lineTo(p.x, p.y); ctx.stroke();
      if (p.seek) { ctx.fillStyle = `rgba(${p.color},${a})`; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.fill(); }
      break;
    }
    case "star":
      ctx.fillStyle = `rgba(${p.color},${a})`; starPath(ctx, p.x, p.y, s * (0.6 + 0.4 * rem)); ctx.fill();
      glow(ctx, p.x, p.y, s * 0.7, p.color, a * 0.6); break;
    case "ring":
      ctx.strokeStyle = `rgba(${p.color},${a})`; ctx.lineWidth = Math.max(0.5, (p.w || 6) * rem);
      ctx.beginPath();
      if (p.flat) ctx.ellipse(p.x, p.y, s, s * 0.22, 0, 0, TAU); else ctx.arc(p.x, p.y, s, 0, TAU);
      ctx.stroke(); break;
    case "arc":
      ctx.lineCap = "round";
      ctx.strokeStyle = `rgba(${p.color},${a})`; ctx.lineWidth = s * 0.34 * rem;
      ctx.beginPath(); ctx.arc(p.x, p.y, s, p.a0, p.a1); ctx.stroke();
      ctx.strokeStyle = `rgba(${p.color},${a * 0.35})`; ctx.lineWidth = s * 0.7 * rem;
      ctx.beginPath(); ctx.arc(p.x, p.y, s * 0.92, p.a0 + 0.2, p.a1 - 0.1); ctx.stroke();
      break;
    case "smoke":
      ctx.fillStyle = `rgba(${p.color},${a * 0.5})`; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.fill(); break;
    case "shell":
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = a; ctx.fillStyle = `rgb(${p.color})`; ctx.fillRect(-s / 2, -s / 4, s, s / 2);
      ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fillRect(-s / 2, -s / 4, s, s / 8);
      ctx.restore(); break;
    case "chunk":
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = a;
      ctx.fillStyle = `rgb(${p.color})`;
      ctx.beginPath(); ctx.moveTo(-s, -s * 0.6); ctx.lineTo(s * 0.7, -s); ctx.lineTo(s, s * 0.5); ctx.lineTo(-s * 0.4, s); ctx.closePath(); ctx.fill();
      ctx.restore(); break;
    case "text": {
      const pop = p.age < 0.12 ? 1.5 - (p.age / 0.12) * 0.5 : 1;
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(pop, pop);
      ctx.globalAlpha = Math.min(1, rem * 3);
      ctx.font = `800 ${p.size}px Pretendard, "Apple SD Gothic Neo", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = p.size * 0.18; ctx.strokeStyle = "rgba(10,12,20,0.9)"; ctx.lineJoin = "round";
      ctx.strokeText(p.text, 0, 0); ctx.fillStyle = p.color; ctx.fillText(p.text, 0, 0);
      ctx.restore(); break;
    }
    case "ghost":
      ctx.save(); ctx.globalAlpha = a * (p.alpha0 || 0.6); ctx.translate(p.x, p.y); ctx.scale(p.sx || 1, p.sy || 1);
      ctx.drawImage(p.img, -p.w / 2, p.top ? -p.h / 2 : -p.h, p.w, p.h); ctx.restore(); break;
    case "rays": {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      const n = p.n || 10;
      for (let i = 0; i < n; i++) {
        ctx.rotate(TAU / n);
        const g = ctx.createLinearGradient(0, 0, s, 0);
        g.addColorStop(0, `rgba(${p.color},${a * 0.55})`); g.addColorStop(1, `rgba(${p.color},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s, -s * 0.09); ctx.lineTo(s, s * 0.09); ctx.closePath(); ctx.fill();
      }
      ctx.restore(); break;
    }
    case "slash": {
      const grow = Math.min(1, k * 5), dx = Math.cos(p.ang) * p.len, dy = Math.sin(p.ang) * p.len;
      ctx.strokeStyle = `rgba(${p.color},${a})`; ctx.lineCap = "round"; ctx.lineWidth = s * rem;
      ctx.beginPath(); ctx.moveTo(p.x - dx, p.y - dy); ctx.lineTo(p.x - dx + 2 * dx * grow, p.y - dy + 2 * dy * grow); ctx.stroke();
      break;
    }
    case "beam": {
      const g = ctx.createLinearGradient(p.x - s, 0, p.x + s, 0);
      g.addColorStop(0, `rgba(${p.color},0)`); g.addColorStop(0.5, `rgba(${p.color},${a * 0.8})`); g.addColorStop(1, `rgba(${p.color},0)`);
      ctx.fillStyle = g; ctx.fillRect(p.x - s, p.y - (p.h || 600), s * 2, p.h || 600); break;
    }
    case "crack":
      ctx.strokeStyle = `rgba(${p.color},${a})`; ctx.lineWidth = p.w || 3; ctx.lineJoin = "round";
      ctx.beginPath(); p.pts.forEach((q, i) => (i ? ctx.lineTo(p.x + q[0], p.y + q[1]) : ctx.moveTo(p.x + q[0], p.y + q[1]))); ctx.stroke(); break;
    case "ellipse": {
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, p.round ? 1 : 0.2);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
      g.addColorStop(0, `rgba(${p.color},${a})`); g.addColorStop(1, `rgba(${p.color},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU); ctx.fill(); ctx.restore(); break;
    }
    default:
      ctx.fillStyle = `rgba(${p.color},${a})`; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
}
function drawShadow(ctx, a) {
  if (a.alpha <= 0) return;
  if (a.noShadow) return;
  if (a.top) {
    ctx.fillStyle = `rgba(0,0,0,${0.35 * a.alpha})`;
    ctx.beginPath(); ctx.ellipse(a.x + a.ox + 5, a.gy + a.oy + 7, a.w * 0.48, a.h * 0.48, 0, 0, TAU); ctx.fill();
    return;
  }
  const lift = a.oy < 0 ? Math.max(0, 1 + a.oy / 220) : 1;
  ctx.fillStyle = `rgba(0,0,0,${0.32 * a.alpha * lift})`;
  ctx.beginPath(); ctx.ellipse(a.x + a.ox, a.gy + 2, a.w * 0.34 * a.sx, 8, 0, 0, TAU); ctx.fill();
}
function drawActor(ctx, a) {
  if (a.alpha <= 0) return;
  const hide = a.blink > 0 && Math.floor(a.blink * 14) % 2 === 0;
  ctx.save();
  ctx.globalAlpha = a.alpha * (hide ? 0.2 : 1);
  // 맞는 순간 떨림: 땅에선 좌우, 공중에선 상하, 점점 작게
  const vb = a.vib > 0 ? ((frameNo & 1) ? 1 : -1) * a.vib : 0;
  ctx.translate(a.x + a.ox + (a.vibAxis === "x" ? vb : 0), a.gy + a.oy + (a.vibAxis === "y" ? vb : 0));
  const top = a.top ? -a.h / 2 : -a.h;
  if (a.top) ctx.rotate(a.rot);
  else if (a.rot) { ctx.translate(0, -a.h / 2); ctx.rotate(a.rot); ctx.translate(0, a.h / 2); }
  // 가만히 있어도 살짝 숨 쉬는 대기 동작
  const br = !a.top && a.alive && !a.flying ? Math.sin(performance.now() / 380 + a.home * 0.05) * 0.018 : 0;
  ctx.scale(a.sx * (1 - br * 0.5) * (a.flip ? -1 : 1), a.sy * (1 + br));
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(a.s.c, -a.w / 2, top, a.w, a.h);
  if (a.flash > 0) { ctx.globalAlpha = Math.min(1, a.flash) * a.alpha; ctx.drawImage(a.s.white, -a.w / 2, top, a.w, a.h); }
  if (a.tint > 0) { ctx.globalAlpha = Math.min(1, a.tint) * 0.85 * a.alpha; ctx.drawImage(a.s.red, -a.w / 2, top, a.w, a.h); }
  if (a.burn > 0) { ctx.globalAlpha = (0.3 + 0.15 * Math.sin(performance.now() / 60)) * a.alpha; ctx.drawImage(a.s.orange, -a.w / 2, top, a.w, a.h); }
  ctx.restore();
}
function drawShot(ctx, p) {
  if (p.draw) { p.draw(ctx, p); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; return; }
  if (p.img) {
    const c = SPR[p.img].c, w = p.w, h = w * c.height / c.width;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0); ctx.drawImage(c, -w / 2, -h / 2, w, h); ctx.restore();
    return;
  }
  if (p.orb) {
    if (p.core) {
      ctx.globalCompositeOperation = "lighter";
      glow(ctx, p.x, p.y, 30 * (1 + 0.15 * Math.sin(p.age * 40)), "167,139,250", 1);
      glow(ctx, p.x, p.y, 13, "255,255,255", 0.9);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, TAU); ctx.fill();
    } else { ctx.fillStyle = "#8b7fd6"; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, TAU); ctx.fill(); }
    return;
  }
  if (p.len) {
    ctx.globalCompositeOperation = "lighter";
    const sp = Math.hypot(p.vx, p.vy) || 1, bx = p.x - p.vx / sp * p.len, by = p.y - p.vy / sp * p.len;
    const g = ctx.createLinearGradient(bx, by, p.x, p.y);
    g.addColorStop(0, "rgba(255,180,70,0)"); g.addColorStop(1, "rgba(255,244,210,1)");
    ctx.strokeStyle = g; ctx.lineWidth = p.lw || 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(p.x, p.y); ctx.stroke();
    glow(ctx, p.x, p.y, 14, "255,200,110", 0.8);
    ctx.globalCompositeOperation = "source-over";
    return;
  }
  ctx.fillStyle = p.color || "#cbd5e1"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r || 3, 0, TAU); ctx.fill();
}
function drawBar(ctx, a, lag) {
  if (!a.maxHp || !a.alive) return;
  const bw = 74, bh = 9;
  let x = a.x - bw / 2, y = a.gy - (a.top ? a.h / 2 : a.h) - 22;
  if (a.barShake > 0) { x += rand(-3, 3); y += rand(-2, 2); }
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.roundRect(x - 3, y - 3, bw + 6, bh + 6, 6); ctx.fill();
  if (lag) { ctx.fillStyle = "#facc15"; ctx.fillRect(x, y, bw * Math.max(0, a.hpLag) / a.maxHp, bh); }
  ctx.fillStyle = "#ef4444"; ctx.fillRect(x, y, bw * Math.max(0, a.hp) / a.maxHp, bh);
  ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(x, y, bw * Math.max(0, a.hp) / a.maxHp, 3);
}
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(r || 0, w / 2, h / 2);
    this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
  };
}

/* ───────── 총·손 위치 ───────── */
const GUNW = 68;
function gripPt(w) { const c = w.hero; return { x: c.x + c.ox + c.w * 0.36, y: G - c.h * 0.52 * c.sy }; }
function muzzle(w) {
  const g = w.gun, p = gripPt(w), gh = GUNW * SPR.gun.c.height / SPR.gun.c.width;
  const lx = 0.7 * GUNW - g.kick, ly = -0.44 * gh, c = Math.cos(g.rot), s = Math.sin(g.rot);
  return { x: p.x + lx * c - ly * s, y: p.y + lx * s + ly * c };
}
function drawGun(w, ctx) {
  const g = w.gun, p = gripPt(w), img = SPR.gun.c, gh = GUNW * img.height / img.width;
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(g.rot);
  ctx.drawImage(img, -0.28 * GUNW - g.kick, -0.72 * gh, GUNW, gh);
  ctx.restore();
}
function paw(w) { const c = w.hero; return { x: c.x + c.ox + c.w * 0.46, y: G - c.h * 0.56 }; }

/* ───────── 레시피용 도우미 ───────── */
function gunSpring(w, dt) { const g = w.gun; g.kick -= g.kick * Math.min(1, dt * 16); g.rot -= g.rot * Math.min(1, dt * 12); }
function bowPt(w) { const h = w.hero; return { x: h.x + h.ox + 46, y: G - 72 }; }
function drawArrowAt(ctx, x, y, rot, alpha = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha;
  ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-50, 0); ctx.lineTo(6, 0); ctx.stroke();
  ctx.fillStyle = "#e5e7eb"; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(2, -6); ctx.lineTo(2, 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#fb7185"; ctx.beginPath(); ctx.moveTo(-50, 0); ctx.lineTo(-58, -7); ctx.lineTo(-42, 0); ctx.lineTo(-58, 7); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawArrow(ctx, p) { drawArrowAt(ctx, p.x, p.y, p.align ? Math.atan2(p.vy, p.vx) : 0); }
function drawBow(w, ctx) {
  const b = bowPt(w), pull = w.bow.pull * 34 + w.bow.snap;
  ctx.save(); ctx.translate(b.x, b.y);
  ctx.strokeStyle = "#a16207"; ctx.lineWidth = 7; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-6, -48); ctx.quadraticCurveTo(30, 0, -6, 48); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-6, -48); ctx.lineTo(-6 - pull, 0); ctx.lineTo(-6, 48); ctx.stroke();
  ctx.restore();
  if (w.bow.pull > 0.02) drawArrowAt(ctx, b.x - pull + 50, b.y, 0);
}
function hammerPivot(w) { const h = w.hero; return { x: h.x + h.ox + 30, y: G - 70 + (1 - h.sy) * 50 }; }
function drawHammer(w, ctx) {
  const p = hammerPivot(w), L = 120;
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(w.ham.rot);
  ctx.fillStyle = "#a16207"; ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(-5, -L, 10, L + 10, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#64748b"; ctx.beginPath(); ctx.roundRect(-30, -L - 22, 60, 36, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(-24, -L - 17, 48, 6);
  ctx.restore();
}
// 매치3 보석 모양
const GEM_COL = ["244,63,94", "56,189,248", "74,222,128", "250,204,21", "192,132,252"];
function drawGem(ctx, c, x, y, r) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = `rgb(${GEM_COL[c]})`; ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 2;
  ctx.beginPath();
  if (c === 0) ctx.arc(0, 0, r, 0, TAU);
  else if (c === 1) { ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); ctx.closePath(); }
  else if (c === 2) ctx.roundRect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7, r * 0.3);
  else if (c === 3) { ctx.moveTo(0, -r); ctx.lineTo(r * 0.95, r * 0.8); ctx.lineTo(-r * 0.95, r * 0.8); ctx.closePath(); }
  else { for (let i = 0; i < 6; i++) { const a = i / 6 * TAU - Math.PI / 2; ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); }
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.35, r * 0.28, r * 0.16, -0.6, 0, TAU); ctx.fill();
  ctx.restore();
}
const M3 = { cols: 6, rows: 5, cell: 54, x0: 108, y0: 48 };
const m3pos = (r, c) => ({ x: M3.x0 + c * M3.cell + M3.cell / 2, y: M3.y0 + r * M3.cell + M3.cell / 2 });
// 쿼터뷰(아이소메트릭) 좌표
const ISO = { ox: 270, oy: 96, tw: 76, th: 38 };
const isoPt = (gx, gy, z = 0) => ({ x: ISO.ox + (gx - gy) * ISO.tw / 2, y: ISO.oy + (gx + gy) * ISO.th / 2 - z });
function drawCube(ctx, gx, gy, hgt, cols, sx = 1, sy = 1) {
  const b = isoPt(gx + 0.5, gy + 0.5), hw = ISO.tw / 2 * 0.86 * sx, hh = ISO.th / 2 * 0.86 * sx, H = hgt * sy;
  ctx.save(); ctx.translate(b.x, b.y); ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1.2; ctx.lineJoin = "round";
  ctx.fillStyle = cols[1]; ctx.beginPath(); ctx.moveTo(-hw, 0); ctx.lineTo(0, hh); ctx.lineTo(0, hh - H); ctx.lineTo(-hw, -H); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = cols[2]; ctx.beginPath(); ctx.moveTo(hw, 0); ctx.lineTo(0, hh); ctx.lineTo(0, hh - H); ctx.lineTo(hw, -H); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = cols[0]; ctx.beginPath(); ctx.moveTo(0, -hh - H); ctx.lineTo(hw, -H); ctx.lineTo(0, hh - H); ctx.lineTo(-hw, -H); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawBigBar(ctx, a, lag) {
  const bw = 190, bh = 13, x = a.x - bw / 2 + (a.barShake > 0 ? rand(-3, 3) : 0), y = a.gy - a.h - 34;
  ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.beginPath(); ctx.roundRect(x - 3, y - 3, bw + 6, bh + 6, 5); ctx.fill();
  if (lag) { ctx.fillStyle = "#facc15"; ctx.fillRect(x, y, bw * Math.max(0, a.hpLag) / a.maxHp, bh); }
  ctx.fillStyle = "#ef4444"; ctx.fillRect(x, y, bw * Math.max(0, a.hp) / a.maxHp, bh);
  ctx.font = "700 12px 'JetBrains Mono', monospace"; ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.textAlign = "right";
  ctx.fillText(`HP ${Math.max(0, Math.round(a.hp))}/${a.maxHp}`, x + bw, y - 7);
}
function lagBar(a, dt) {
  if (a.hpLag < a.hp) a.hpLag = a.hp;
  if (a.lagWait > 0) a.lagWait -= dt; else a.hpLag += (a.hp - a.hpLag) * Math.min(1, dt * 3.5);
}
function dust(w, x, y, n, dir = 0, col = "200,200,210") {
  for (let i = 0; i < n; i++) w.spawn({ type: "smoke", x: x + rand(-10, 10), y: y - rand(0, 6), vx: (dir || (Math.random() < 0.5 ? -1 : 1)) * rand(40, 180), vy: rand(-60, -10), drag: 3, size: rand(4, 8), size1: rand(12, 20), life: rand(0.35, 0.6), color: col });
}
function sparks(w, x, y, n, col, sp = [150, 500], a0 = 0, a1 = TAU) {
  for (let i = 0; i < n; i++) { const a = rand(a0, a1), v = rand(sp[0], sp[1]); w.spawn({ type: "spark", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 5, life: rand(0.15, 0.35), size: 2.4, color: col }); }
}
function addXp(w, n) {
  const x = w.xp; x.v += n;
  if (x.v >= 100) { x.v -= 100; x.lv++; x.over = true; w.emit("levelup", x); }
}
function m3Board(w) {
  const B = [];
  for (let r = 0; r < M3.rows; r++) {
    B.push([]);
    for (let c = 0; c < M3.cols; c++) {
      let col; do { col = (Math.random() * 5) | 0; } while ((c > 1 && B[r][c - 1].c === col && B[r][c - 2].c === col) || (r > 1 && B[r - 1][c].c === col && B[r - 2][c].c === col));
      const p = m3pos(r, c); B[r].push({ c: col, x: p.x, y: p.y, ty: p.y, sc: 1, sq: 1, vy: 0, falling: false });
    }
  }
  w.board = B;
  const c = 1 + ((Math.random() * 2) | 0); w.mc = c;
  const X = B[1][c + 2].c;
  B[0][c].c = X; B[0][c + 1].c = X; B[0][c + 2].c = (X + 1 + ((Math.random() * 4) | 0)) % 5;
}


/* ───────── 블룸: 이펙트만 작은 캔버스에 한 번 더 그리고, 흐리게 해서 더하기로 겹침 ───────── */
const BLOOM = { c: null, x: null, ok: true, D: 4 };
function bloomBegin(ctx, rx, ry, rw, rh) {
  if (!BLOOM.ok) return null;
  try {
    const M = ctx.getTransform(), base = BLOOM.base = BLOOM.base || new DOMMatrix();
    const k = ctx.canvas.width / 540, D = BLOOM.D;
    const W = Math.max(1, Math.round(rw * k / D)), H = Math.max(1, Math.round(rh * k / D));
    if (!BLOOM.c) { BLOOM.c = document.createElement("canvas"); BLOOM.x = BLOOM.c.getContext("2d"); }
    if (BLOOM.c.width !== W || BLOOM.c.height !== H) { BLOOM.c.width = W; BLOOM.c.height = H; }
    const g = BLOOM.x;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; g.clearRect(0, 0, W, H);
    g.setTransform(new DOMMatrix().scale(1 / D).translate(-rx * k, -ry * k).multiply(M));
    return g;
  } catch (e) { BLOOM.ok = false; return null; }
}
function bloomEnd(ctx, rx, ry, rw, rh, a) {
  try {
    ctx.save(); ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.clip();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = Math.min(1, a); ctx.filter = "blur(10px)"; ctx.drawImage(BLOOM.c, rx, ry, rw, rh);
    ctx.globalAlpha = Math.min(1, a) * 0.7; ctx.filter = "blur(3px)"; ctx.drawImage(BLOOM.c, rx, ry, rw, rh);
    ctx.restore();
  } catch (e) { BLOOM.ok = false; }
}

/* ───────── 레시피 등록소 ───────── */
const RECIPES = [];
function arrive(w, it) {
  it.dead = true;
  w.hud.score += 15; w.combo++; w.comboT = 1;
  w.emit("arrive", it);
}

/* 레시피용 그림을 한 번만 만들고 재사용 (흰색·빨강·주황·하늘 틴트 포함) */
function sprite(key, W, H, draw) {
  if (!SPR[key]) { const c = mk(W, H, draw); SPR[key] = { c, white: tinted(c, "#ffffff"), red: tinted(c, "#ef4444"), orange: tinted(c, "#fb923c"), cyan: tinted(c, "#67e8f9") }; }
  return SPR[key];
}
/* 로우폴리 모델을 그림으로 굽기: model = [blk(...), pyr(...)] */
function polySprite(key, model, W, H, yaw = 0, pitch = 0.3, light = [246, 244, 240], dark = [70, 70, 80]) {
  return sprite(key, W, H, x => renderPoly(x, W, H, typeof model === "function" ? model() : model, yaw, pitch, light, dark));
}
/* 캔버스에 글자 쓰기 (월드 좌표) */
function label(ctx, text, x, y, size = 16, color = "#fff", align = "center", font = "Pretendard, sans-serif", weight = 800) {
  ctx.font = `${weight} ${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = "middle"; ctx.fillStyle = color; ctx.fillText(text, x, y);
}
