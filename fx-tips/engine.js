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

/* 가루 도트 캐릭터: 사람 몸을 둥근 막대(캡슐) 여러 개로 세우고, 칸마다 부드러운 입체 명암을 계산한 뒤
   1비트 디더링(점을 찍거나 비우거나)으로 바꾼다. 테두리는 바스러지고, 몸 둘레엔 가루가 흩날린다.
   우리 편과 적은 같은 사람 형태, 색만 다르다. */
const HUMAN = [ // 오른쪽을 보는 전투 자세. 단위: 가로 32 × 세로 44칸 기준
  // z: 0 뒤팔, 1 뒷다리, 2 몸통, 3 머리·앞다리, 4 앞팔
  { a: [12.6, 10], b: [11, 15], r0: 1.3, r1: 1.1, z: 0 },
  { a: [11, 15], b: [12.8, 19.2], r0: 1.05, r1: 0.9, z: 0 },
  { a: [13, 20], b: [13, 20], r0: 1.15, z: 0 },
  { a: [13.6, 21], b: [10.6, 29.6], r0: 2.0, r1: 1.55, z: 1 },
  { a: [10.6, 29.6], b: [7.8, 38.2], r0: 1.6, r1: 1.15, z: 1 },
  { a: [6.8, 39.8], b: [10, 40.2], r0: 0.95, r1: 0.85, z: 1 },
  { a: [12.6, 9.9], b: [12.6, 9.9], r0: 1.6, z: 1.5 },
  { a: [15.2, 10.6], b: [15, 14.5], r0: 3.4, r1: 3.0, z: 2 },
  { a: [15, 15], b: [14.8, 19], r0: 2.7, r1: 2.6, z: 2 },
  { a: [14.8, 19.5], b: [14.8, 21.2], r0: 3.0, r1: 2.8, z: 2 },
  { a: [15.4, 6.8], b: [15.6, 8.6], r0: 1.2, r1: 1.3, z: 2 },
  { a: [15.6, 4.2], b: [15.6, 4.2], r0: 2.75, z: 3 },
  { a: [16, 21], b: [19.6, 29.5], r0: 2.1, r1: 1.6, z: 3 },
  { a: [19.6, 29.5], b: [20.6, 38.6], r0: 1.65, r1: 1.2, z: 3 },
  { a: [20, 40], b: [23.6, 40.4], r0: 1.0, r1: 0.9, z: 3 },
  { a: [17.6, 9.8], b: [17.6, 9.8], r0: 1.75, z: 4 },
  { a: [17.8, 10], b: [21.5, 14.2], r0: 1.35, r1: 1.15, z: 4 },
  { a: [21.5, 14.2], b: [26, 12.6], r0: 1.1, r1: 0.95, z: 4 },
  { a: [27, 12.4], b: [27, 12.4], r0: 1.25, z: 4 },
];
const HUMAN_TOP = [ // 위에서 본 사람: 어깨 + 머리 + 앞으로 뻗은 팔 (가로 24 × 세로 24)
  { a: [12, 5.5], b: [12, 18.5], r0: 4.2, r1: 4.2, z: 0 },
  { a: [14, 15.5], b: [20.5, 14.5], r0: 1.4, r1: 1.2, z: 1 },
  { a: [12.6, 12], b: [12.6, 12], r0: 3.6, z: 2 },
];
const BAYER8 = (() => { const m = [[0, 2], [3, 1]]; let b = m; for (let n = 2; n < 8; n *= 2) { const o = []; for (let y = 0; y < n * 2; y++) { o.push([]); for (let x = 0; x < n * 2; x++) o[y][x] = 4 * b[y % n][x % n] + m[(y / n) | 0][(x / n) | 0]; } b = o; } return b; })();
// 부위들을 매끈하게 녹여 붙인 한 덩어리(관절 이음매 없음) → 둥근 명암 → 1비트 디더링 + 가루
function smin(a, b, k) { const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (b - a) / k)); return b + (a - b) * h - k * h * (1 - h); }
function dustSDF(GW, GH, field, rgb, seed0 = 7, opt = {}) {
  const PAD = opt.pad ?? 10, cw = GW + PAD * 2, ch = GH + PAD * 2, D = new Float32Array(cw * ch), RR = new Float32Array(cw * ch), DK = new Float32Array(cw * ch);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const f = field(x - PAD + 0.5, y - PAD + 0.5); D[y * cw + x] = f.d; RR[y * cw + x] = f.r; DK[y * cw + x] = f.dark || 1; }
  const L = [-0.55, -0.62, 0.56], at = (x, y) => (x < 0 || y < 0 || x >= cw || y >= ch ? 9 : D[y * cw + x]);
  let seed = seed0; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const c = document.createElement("canvas"), S = opt.dot || 2; c.width = cw * S; c.height = ch * S;
  const g = c.getContext("2d"); g.fillStyle = `rgb(${rgb.join(",")})`;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const d = D[y * cw + x];
    if (d > 0) {
      if ((FX.style === "dust" || FX.style === "art") && d < 7 && rnd() < (opt.dust ?? 0.3) * Math.exp(-d / 1.8)) g.fillRect(x * S, y * S, S, S); // 가루
      continue;
    }
    const gx = at(x + 1, y) - at(x - 1, y), gy = at(x, y + 1) - at(x, y - 1), gl = Math.hypot(gx, gy) || 1;
    const u = Math.max(0, Math.min(1, 1 + d / Math.max(1, RR[y * cw + x]))), nz = Math.sqrt(1 - u * u);
    const nx = gx / gl * u, ny = gy / gl * u;
    let v = (0.08 + 0.9 * Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]) + Math.pow(u, 4) * 0.45) * DK[y * cw + x];
    if (FX.style === "smooth") { const k = Math.min(1.15, 0.28 + v * 0.8); g.fillStyle = `rgb(${rgb.map(q => Math.min(255, Math.round(q * k))).join(",")})`; g.fillRect(x * S, y * S, S, S); continue; }
    if (FX.style === "flat") { g.fillStyle = `rgb(${rgb.map(q => Math.round(q * (DK[y * cw + x] < 1 ? 0.78 : 1))).join(",")})`; g.fillRect(x * S, y * S, S, S); continue; }
    if (d > -1.2 && rnd() < 0.3) continue; // 테두리는 바스러지게
    if (v > (BAYER8[y & 7][x & 7] + 0.5) / 64) g.fillRect(x * S, y * S, S, S);
  }
  return c;
}
// 사람: 캡슐들을 부드럽게 합친 거리장
function dustFig(parts, W, H, rgb, k = 3.4, seed0 = 7) {
  const P = parts.map(p => ({ ...p, a: [p.a[0] * k, p.a[1] * k], b: [p.b[0] * k, p.b[1] * k], r0: p.r0 * k, r1: (p.r1 ?? p.r0) * k }));
  return dustSDF(Math.round(W * k), Math.round(H * k), (px, py) => {
    let d = 1e9, r = 1, best = 1e9, dark = 1;
    for (const p of P) {
      const [ax, ay] = p.a, [bx, by] = p.b, dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
      const t = L2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L2)) : 0;
      const rad = p.r0 + (p.r1 - p.r0) * t, di = Math.hypot(px - ax - dx * t, py - ay - dy * t) - rad;
      d = smin(d, di, 2.2 * k * 0.5);
      if (di < best) { best = di; r = rad; dark = p.z < 2 ? 0.8 : 1; }
    }
    return { d, r, dark };
  }, rgb, seed0);
}
// 총: 둥근 상자들을 합친 모양
function sdBox(px, py, cx, cy, hw, hh, rad) { const qx = Math.abs(px - cx) - hw + rad, qy = Math.abs(py - cy) - hh + rad; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rad; }
function dustGun() {
  return dustSDF(120, 70, (x, y) => {
    const body = sdBox(x, y, 52, 26, 33, 13, 4), barrel = sdBox(x, y, 94, 21, 24, 6, 2.5), top = sdBox(x, y, 48, 14, 26, 3, 2);
    const gx = x - 32, gy = y - 50, rot = 0.28, grip = sdBox(gx * Math.cos(rot) - gy * Math.sin(rot) + 32, gx * Math.sin(rot) + gy * Math.cos(rot) + 50, 32, 50, 9, 15, 3);
    const guard = Math.abs(Math.hypot(x - 48, y - 42) - 7) - 1.6;
    let d = smin(smin(smin(body, barrel, 2), top, 2), grip, 3); d = Math.min(d, Math.max(guard, -(y - 38)));
    return { d, r: 9, dark: barrel < body ? 0.92 : 1 };
  }, FX.colors.gun, 5, { pad: 4, dust: 0.12 });
}
const DOT = { hero: [240, 236, 224], foe: [255, 112, 92] };
/* ───────── 내 그림·내 스타일로 바꾸기 (받아 간 사람이 고치는 곳) ─────────
   FX.style  : "art" 기본 그림(기본값) | "dust" 가루 도트 | "smooth" 매끈한 입체 | "flat" 단색 실루엣
   FX.colors : 우리 편·적·총 색 [r, g, b]
   FX.images : 내 그림 파일 경로나 주소. 넣으면 위 스타일 대신 그 그림을 써요.
               hero(오른쪽을 봄) · foe(왼쪽을 봄) · gun(오른쪽을 향함) · heroTop · foeTop(위에서 본 모습)
               배경이 투명한 PNG, 발(바닥)이 그림 맨 아래에 닿게. 크기는 자유(비율만 유지돼요). */
const FX = { style: "art", colors: { hero: DOT.hero, foe: DOT.foe, gun: [214, 218, 222] }, images: {},
  // 손·총 위치(그림 크기에 대한 비율). 비워 두면 스타일에 맞는 값을 써요. 내 그림을 넣었다면 여기만 맞추세요.
  hand: null,      // 주인공 손: [가운데에서 앞쪽으로 너비의 몇 배, 발에서 위로 키의 몇 배]
  gunGrip: null,   // 총 그림에서 손이 쥐는 곳 [왼쪽에서, 위에서]
  gunMuzzle: null, // 총 그림에서 총구 [왼쪽에서, 위에서]
  bgFloor: 0.69,   // 배경 그림에서 바닥선 높이(위에서부터 비율)
  bgDim: 0.28,     // 배경을 얼마나 어둡게 눌러 둘지(효과가 돋보이게)
  rig: false,      // 관절 부품으로 움직이기 (시험용, 기본은 끔)
  pixelFx: 2,      // 효과를 픽셀로: 월드 몇 칸을 1픽셀로 (0이면 매끈)
  pixel: 0,        // 픽셀 크기(1픽셀 = 화면 몇 칸). 0이면 매끈하게
  pixelLevels: 7,  // 색 단계 수(채널마다). 적을수록 픽셀 아트 느낌
};
// FX.style = "art" 일 때 쓰는 기본 그림 (FX Lab 기본 캐릭터·총·배경)
const FX_ART_BASE = (() => { try { const s = document.currentScript && document.currentScript.src; if (s) return s.replace(/engine\.js.*$/, "") + "art/"; } catch (e) {} return "https://glonomy.com/fx-tips/art/"; })();
const FX_ART = { images: { hero: FX_ART_BASE + "hero.webp", foe: FX_ART_BASE + "foe.webp", gun: FX_ART_BASE + "gun.webp", bg: FX_ART_BASE + "bg-ruins-px.png", heroTop: FX_ART_BASE + "heroTop-px.png", foeTop: FX_ART_BASE + "foeTop-px.png" },
  hand: [0.44, 0.73], gunGrip: [0.22, 0.5], gunMuzzle: [1.0, 0.27] };
const FX_DOTPT = { hand: [0.27, 0.62], gunGrip: [0.28, 0.72], gunMuzzle: [0.98, 0.28] };
const fxPt = k => FX[k] || (FX._art && FX._art[k === "hand" ? "hero" : "gun"] ? FX_ART[k] : FX_DOTPT[k]);
// 배경 그림을 깔 장르 (옆에서 본 장면만)
function useBgArt(R) { return !!(SPR.bg && FX_BG_CATS.test(R.cat) && (!R.view || R.view === "side")); }
const FX_BG_CATS = /^(weapon|combat|duel|fighting|shooter|horde|action|move|survival|army|rpg|env)$/;
function fxLoadImages() {
  // "art" 스타일이면 기본 그림을 깔고, 직접 넣은 그림이 있으면 그걸 우선
  const user = FX.images || {}, art = FX.style === "art" ? FX_ART.images : {};
  if (typeof SPR !== "undefined") delete SPR.bg;
  for (const k in RIGS) { RIGS[k].img = null; RIGS[k].k = 0; }
  FX._art = {}; for (const k in art) if (!user[k]) FX._art[k] = true;
  const IM = Object.assign({}, art, user);
  for (const k in POSES) { POSES[k].img = null; if (FX._art[k] && FX.poses !== false) { IM["pose_" + k] = FX_ART_BASE + POSES[k].file; for (const a in POSES[k].anims || {}) { POSES[k].anims[a].img = null; IM["anim_" + k + "_" + a] = FX_ART_BASE + POSES[k].anims[a].file; } } }
  if (FX.rig) for (const k in RIGS) if (FX._art[k]) IM["rig_" + k] = FX_ART_BASE + RIGS[k].file;
  const keys = Object.keys(IM).filter(k => IM[k]);
  return Promise.all(keys.map(k => new Promise(res => {
    const im = new Image(); im.crossOrigin = "anonymous";
    im.onload = () => { const c = mk(im.naturalWidth, im.naturalHeight, x => x.drawImage(im, 0, 0)); if (k === "bg") { SPR.bg = { c }; return res(); } if (k.startsWith("rig_")) { RIGS[k.slice(4)].img = im; return res(); } if (k.startsWith("pose_")) { POSES[k.slice(5)].img = im; return res(); } if (k.startsWith("anim_")) { const [, who, nm] = k.split("_"); POSES[who].anims[nm].img = im; return res(); } SPR[k] = { c, white: tinted(c, "#ffffff"), red: tinted(c, "#ef4444"), orange: tinted(c, "#fb923c"), cyan: tinted(c, "#67e8f9") }; res(); };
    im.onerror = () => { console.warn("FX: could not load image for", k, IM[k]); res(); };
    im.src = IM[k];
  })));
}
function makeSprites() {
  const S = {
    // 주인공: 로우폴리 사람 (석고상 톤)
    hero: dustFig(HUMAN, 32, 44, FX.colors.hero),
    // 적: 로우폴리 고블린
    foe: (() => { const c = dustFig(HUMAN, 32, 44, FX.colors.foe, 3.4, 23), m = document.createElement("canvas"); m.width = c.width; m.height = c.height; const x = m.getContext("2d"); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return m; })(),
    // 총
    gun: dustGun(),
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
  S.heroTop = dustFig(HUMAN_TOP, 24, 24, FX.colors.hero, 4);
  S.foeTop = (() => { const c = dustFig(HUMAN_TOP, 24, 24, FX.colors.foe, 4, 23), m = document.createElement("canvas"); m.width = c.width; m.height = c.height; const x = m.getContext("2d"); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return m; })();
  for (const k in S) SPR[k] = { c: S[k], white: tinted(S[k], "#ffffff"), red: tinted(S[k], "#ef4444"), orange: tinted(S[k], "#fb923c"), cyan: tinted(S[k], "#67e8f9") };
  buildStudioArmRig();
  return fxLoadImages();
}


// Rigged variants keep the exact same dot material/lighting as the static hero.
// Pre-rendered pieces rotate at joint pivots; there is no per-frame 3D rendering.
function buildStudioArmRig() {
  const body=HUMAN.filter((_,i)=>![0,1,2,15,16,17,18].includes(i));
  SPR.heroRigBody={c:dustFig(body,32,44,FX.colors.hero,3.4,41)};
  const limb=(seed)=>dustFig([{a:[4,8],b:[28,8],r0:1.5,r1:1.15,z:4}],34,16,FX.colors.hero,3.4,seed);
  SPR.heroRigUpper={c:limb(47)};
  SPR.heroRigLower={c:limb(71)};
}
function studioLerp(a,b,t){return a+(b-a)*t;}
function studioEase(t){return t*t*(3-2*t);}
function studioRigPose(w) {
  const base={fe:[21.5,14.2],fh:[27,12.4],be:[11,15],bh:[13,20]};
  const id=w.R.id,rig=w.studioRig;
  if(!rig) return base;
  const t=Math.max(0,w.time-rig.at);
  let target=base,k=0;
  if(id==="weapon-railgun") {
    const charge={fe:[24,12.5],fh:[30,12],be:[15.5,13.6],bh:[24,13.3]};
    const kick={fe:[19,8.5],fh:[28,7],be:[13,10.5],bh:[22,11]};
    if(rig.phase==="charge"){target=charge;k=studioEase(Math.min(1,t/.55));}
    if(rig.phase==="fire"){target=kick;k=1-studioEase(Math.min(1,Math.max(0,t-.10)/.46));}
  } else if(id==="weapon-katana"){
    const sword={fe:[13.5,17],fh:[9,22],be:[10.5,16.5],bh:[12,22]};
    const strike={fe:[19,2],fh:[30,-1],be:[16,6],bh:[23,3]};
    const settle={fe:[23,12],fh:[32,14],be:[10,16],bh:[11.5,21]};
    if(rig.phase==="draw"){target=sword;k=1;}
    if(rig.phase==="cut"){target=strike;k=1-studioEase(Math.min(1,t/.46));}
    if(rig.phase==="sheathe"){target=settle;k=1-studioEase(Math.min(1,t/.55));}
  } else if(id==="magic"){
    const charge={fe:[20,5.5],fh:[26,1],be:[14.5,7],bh:[20,2.5]};
    const cast={fe:[24,9],fh:[34,8],be:[17,12],bh:[27,11]};
    if(rig.phase==="charge"){target=charge;k=studioEase(Math.min(1,t/.30));}
    if(rig.phase==="launch"){target=cast;k=1-studioEase(Math.min(1,Math.max(0,t-.08)/.5));}
  }
  if (window.FXDirector) {
    const general=FXDirector.pose(w,base);
    if (general) return general;
  }
  return {
    fe:base.fe.map((v,i)=>studioLerp(v,target.fe[i],k)),
    fh:base.fh.map((v,i)=>studioLerp(v,target.fh[i],k)),
    be:base.be.map((v,i)=>studioLerp(v,target.be[i],k)),
    bh:base.bh.map((v,i)=>studioLerp(v,target.bh[i],k))
  };
}
function drawStudioRigHero(ctx,a,w,top) {
  const pose=studioRigPose(w), k=3.4,pad=10,S=2,
    mw=SPR.hero.c.width,mh=SPR.hero.c.height;
  const xy=point=>({
    x:((point[0]*k+pad)*S/mw-.5)*a.w,
    y:((point[1]*k+pad)*S/mh-1)*a.h
  });
  const bone=(a0,b0,front)=>{
    const A=xy(a0),B=xy(b0),dx=B.x-A.x,dy=B.y-A.y,length=Math.hypot(dx,dy);
    if(length<.1)return;
    const key=front?"heroRigUpper":"heroRigLower",bmp=SPR[key].c;
    const x0=(4*k+pad)*S,x1=(28*k+pad)*S,cy=(8*k+pad)*S;
    ctx.save();ctx.translate(A.x,A.y);ctx.rotate(Math.atan2(dy,dx));
    ctx.scale(length/(x1-x0),a.h/mh);
    ctx.drawImage(bmp,-x0,-cy);ctx.restore();
  };
  const backShoulder=[12.6,10],frontShoulder=[17.6,9.8];
  bone(backShoulder,pose.be,false);bone(pose.be,pose.bh,false);
  ctx.drawImage(SPR.heroRigBody.c,-a.w/2,top,a.w,a.h);
  bone(frontShoulder,pose.fe,true);bone(pose.fe,pose.fh,true);
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
      AU.out = c.createGain(); AU.out.gain.value = 0.23; // voice-over safe default, lift as needed in CapCut
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
/* FX Lab Studio: art-direction pass shared by all 539 recipes.
   The RAW and completed scenes use the same backdrop, preserving fair comparisons. */
const STUDIO_MOODS = {
  weapon:[254,158,91], combat:[254,158,91], duel:[244,128,107], fighting:[247,144,99],
  shooter:[108,177,250], horde:[244,128,107], action:[248,166,90],
  rpg:[169,127,249], strategy:[111,207,166], army:[111,207,166],
  sim:[233,188,114], survival:[210,168,111], puzzle:[94,220,224],
  casual:[124,221,210], ui:[135,218,215], racing:[88,179,251],
  move:[107,175,249], env:[174,169,131]
};
/* Lightweight, code-drawn level dressing for the 3 featured demos (no assets). */
function studioDemoSet(ctx,v,id){
  if (!["weapon-railgun","weapon-katana","magic"].includes(id)) return;
  const [x,y,w,h]=v;
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
  if(id==="weapon-railgun"){
    ctx.fillStyle="rgba(36,83,99,.18)";ctx.fillRect(x,y+h*.16,w,h*.62);
    for(let i=0;i<6;i++){
      const px=x+w*(.07+i*.177);
      ctx.fillStyle="rgba(10,24,38,.55)";ctx.fillRect(px,y+h*.10,w*.037,h*.7);
      ctx.fillStyle="rgba(82,220,252,.13)";ctx.fillRect(px+w*.03,y+h*.12,2,h*.65);
      ctx.fillStyle="rgba(86,218,250,.065)";ctx.fillRect(px-5,y+h*.52,w*.12,2);
    }
    ctx.fillStyle="rgba(20,78,112,.16)";ctx.fillRect(x,y+h*.84,w,h*.16);
  } else if(id==="weapon-katana"){
    const moonX=x+w*.77,moonY=y+h*.2;
    const moon=ctx.createRadialGradient(moonX,moonY,7,moonX,moonY,w*.22);
    moon.addColorStop(0,"rgba(213,232,243,.17)");moon.addColorStop(1,"rgba(155,215,248,0)");
    ctx.fillStyle=moon;ctx.fillRect(x,y,w,h);
    ctx.fillStyle="rgba(110,157,155,.10)";ctx.beginPath();ctx.arc(moonX,moonY,44,0,TAU);ctx.fill();
    for(let i=0;i<4;i++){
      const px=x+w*(.1+i*.245);
      ctx.fillStyle="rgba(12,24,31,.50)";ctx.fillRect(px,y+h*.07,13,h*.65);
      ctx.fillStyle="rgba(106,191,188,.12)";ctx.fillRect(px,y+h*.13,2,h*.58);
    }
    ctx.fillStyle="rgba(32,72,80,.24)";ctx.fillRect(x,y+h*.79,w,h*.21);
  } else if(id==="magic"){
    const cx=x+w*.56,cy=y+h*.42,r=Math.min(w,h)*.31;
    const halo=ctx.createRadialGradient(cx,cy,5,cx,cy,r*1.5);
    halo.addColorStop(0,"rgba(139,94,234,.19)");halo.addColorStop(1,"rgba(139,94,234,0)");
    ctx.fillStyle=halo;ctx.fillRect(x,y,w,h);
    ctx.strokeStyle="rgba(176,128,241,.16)";ctx.lineWidth=2;
    for(const scale of [1,0.84,0.58]){
      ctx.beginPath();ctx.arc(cx,cy,r*scale,-Math.PI*.85,Math.PI*.83);ctx.stroke();
    }
    for(let i=0;i<9;i++){
      const a=i*TAU/9;
      ctx.fillStyle="rgba(215,174,255,.23)";
      ctx.fillRect(cx+Math.cos(a)*r*.82,cy+Math.sin(a)*r*.82,3,3);
    }
  }
  ctx.restore();
}

function studioBackdrop(ctx, v, cat, clock, recipeId, art) {
  const [x,y,w,h]=v, col=STUDIO_MOODS[cat] || [174,196,164], rgb=col.join(",");
  const floor=ctx.createLinearGradient(x,y,x,y+h);
  floor.addColorStop(0,"#090e17"); floor.addColorStop(0.58,"#111b26"); floor.addColorStop(1,"#090c12");
  ctx.fillStyle=floor; ctx.fillRect(x,y,w,h);
  const halo=ctx.createRadialGradient(x+w*0.54,y+h*0.40,4,x+w*0.54,y+h*0.40,w*0.64);
  halo.addColorStop(0,"rgba("+rgb+",0.17)"); halo.addColorStop(0.44,"rgba("+rgb+",0.045)");
  halo.addColorStop(1,"rgba("+rgb+",0)");
  ctx.fillStyle=halo; ctx.fillRect(x,y,w,h);
  if (art) return;
  studioDemoSet(ctx,v,recipeId);
  if (window.FXDirector) FXDirector.stage(ctx,v,cat,recipeId,clock);
  // Art direction: visible grid only when it communicates a board, interface or
  // tactical map. Hiding generic graph-paper lines keeps combat FX in focus.
  if (/^(ui|puzzle|strategy|army|sim)$/.test(cat)) {
    ctx.strokeStyle="rgba("+rgb+",0.045)"; ctx.lineWidth=1;
    const spacing=cat==="puzzle"?46:57;
    ctx.beginPath();
    for(let gx=x+spacing;gx<x+w;gx+=spacing){ctx.moveTo(gx,y);ctx.lineTo(gx,y+h);}
    for(let gy=y+spacing;gy<y+h;gy+=spacing){ctx.moveTo(x,gy);ctx.lineTo(x+w,gy);}
    ctx.stroke();
  }
  // Cinematic rim-light bars, kept below the foreground and UI.
  const rim=ctx.createLinearGradient(x,y,x+w,y);
  rim.addColorStop(0,"rgba("+rgb+",0.075)");rim.addColorStop(0.24,"rgba("+rgb+",0)");
  rim.addColorStop(0.76,"rgba("+rgb+",0)");rim.addColorStop(1,"rgba("+rgb+",0.075)");
  ctx.fillStyle=rim;ctx.fillRect(x,y,w,h);
}


/* Genre-specific final-stage payoff. Original RAW and each learning step stay untouched.
   Effects are throttled and share the normal particle budget for mobile safety. */
const STUDIO_PAYOFF_EVENTS = {
  weapon:["fire","cast","blast"],combat:["fire","blast"],duel:["strike","cast"],fighting:["strike","combo"],
  shooter:["fire","shoot"],action:["dash","blast"],horde:["fire","blast"],
  puzzle:["match","merge","clear","chain","done","unlock"],rpg:["cast","success","complete","gain","unlock"],
  ui:["claim","unlock","upgrade"],casual:["pop","done","unlock"],sim:["upgrade","gain"],
  racing:["finish","boost"],strategy:["complete","unlock"],survival:["heal","unlock"]
};
function studioPayoff(w, ev, args) {
  if (w.bare || w.n < 2 || w.n !== w.R.steps.length) return;
  const cat=w.R.cat, signals=STUDIO_PAYOFF_EVENTS[cat];
  if (!signals || !signals.includes(ev)) return;
  const cooldown=/^(weapon|shooter|combat|horde)$/.test(cat) ? 0.19 : 0.42;
  if (w.studioLast != null && w.time-w.studioLast < cooldown) return;
  w.studioLast=w.time;
  const src=args.find(a=>a && typeof a==="object" && Number.isFinite(a.x) && Number.isFinite(a.y));
  const focal=src || (cat==="weapon" || cat==="combat" ? (w.hero || w.foe) : null);
  const x=focal?focal.x:270,y=focal?(src?src.y:(focal.gy||G)-(focal.h||80)*0.56):184;
  const magic=/magic|spell|summon|mana|cast|arcane|lightning/i.test(w.R.id);
  const c=magic?"173,138,255":/^(puzzle|ui|casual)$/.test(cat)?"111,239,218":
          cat==="rpg"?"207,148,255":cat==="racing"?"102,190,255":"255,181,101";
  const isSpecial=["clear","chain","match","unlock","complete","gain","blast","cast"].includes(ev);
  const size=isSpecial?64:43, num=isSpecial?13:8;
  w.spawn({type:"glow",x,y,size:size*1.7,size1:0,life:0.25,color:c,alpha:0.75});
  w.spawn({type:"ring",x,y,size:7,size1:size,life:0.3,w:isSpecial?7:4,color:c});
  w.spawn({type:"rays",x,y,size:size*1.15,size1:0,life:0.19,n:12,color:c});
  w.spawn({type:"star",x,y,size:isSpecial?28:19,size1:0,life:0.16,color:"255,252,229"});
  for(let i=0;i<num;i++){
    const ang=Math.random()*TAU,speed=120+Math.random()*(isSpecial?410:270);
    w.spawn({type:"spark",x,y,vx:Math.cos(ang)*speed,vy:Math.sin(ang)*speed,
      size:1.35+Math.random()*1.9,drag:4.1,life:0.15+Math.random()*0.26,color:c});
  }
  if (/^(weapon|combat|fighting|shooter)$/.test(cat)) w.zoomPunch(0.018);
}

/* Three hero showcase scenes: fully procedural Canvas, no meshes or images.
   Only enabled on the FINAL layer; no additional continuous animation loops. */
function studioHeroEvent(w, ev, args) {
  if (w.bare || w.n !== w.R.steps.length) return;
  const id=w.R.id;
  if(["weapon-railgun","weapon-katana","magic"].includes(id)) {
    if((id==="weapon-railgun"&&(ev==="charge"||ev==="fire"))||
       (id==="weapon-katana"&&(ev==="cut"||ev==="sheathe"))||
       (id==="magic"&&(ev==="charge"||ev==="launch")))
      w.studioRig={phase:ev,at:w.time};
  }
  if (id==="weapon-railgun") {
    if(ev==="charge"){const at=args[0]; w.studioCharge={start:w.time};return;}
    if(ev==="fire"){
      const m=args[0];if(!m || !Number.isFinite(m.x))return;
      w.studioHero={kind:"rail",start:w.time,x:m.x,y:m.y};
      for(let i=0;i<12;i++){const xx=m.x+Math.random()*340;
        w.spawn({type:"spark",x:xx,y:m.y+rand(-12,12),vx:rand(90,260),vy:rand(-160,160),size:rand(1,2.7),drag:4,life:rand(.12,.37),color:"114,230,255"});}
    }
  } else if (id==="weapon-katana") {
    if(ev==="cut") {
      const c=args[0];if(!c)return;
      w.studioHero={kind:"katana",start:w.time,x:c.x0,y:c.y,x1:c.x1};
      for(let i=0;i<10;i++){const x=c.x0+(c.x1-c.x0)*Math.random();
        w.spawn({type:"spark",x,y:c.y+rand(-15,15),vx:rand(-120,150),vy:rand(-80,80),drag:4,size:rand(1.2,3),life:rand(.15,.38),color:"172,244,250"});}
    }
    if(ev==="sheathe" || ev==="hit") {
      if(w.studioHero&&w.studioHero.kind==="katana"){w.studioHero.burstAt=w.time;}
    }
  } else if(id==="magic"){
    if(ev==="charge")w.studioCharge={start:w.time};
    if(ev==="launch") {
      const o=args[0]; if(o)w.studioHero={kind:"magic",start:w.time,x:o.x,y:o.y};
    }
    if(ev==="hit"){
      const p=args[0];if(p && Number.isFinite(p.x)) {
        w.studioHero={kind:"magicBurst",start:w.time,x:p.x,y:p.y};
        for(let i=0;i<16;i++) {
          const a=Math.random()*TAU,vel=rand(110,400);
          w.spawn({type:"spark",x:p.x,y:p.y,vx:Math.cos(a)*vel,vy:Math.sin(a)*vel,drag:4.5,
            life:rand(.17,.5),size:rand(1.2,3),color:"198,147,255"});
        }
      }
    }
  }
}
function drawStudioHero(ctx,w){
  if(w.bare||w.n!==w.R.steps.length)return;
  const h=w.studioHero,c=w.studioCharge;
  // Charged spell and railgun rings: one glow gradient, two wireframe arcs.
  if(c && w.time-c.start<.78&&(w.R.id==="magic"||w.R.id==="weapon-railgun")){
    const age=w.time-c.start, power=Math.min(1,age/.66);
    const origin=w.R.id==="magic"?
      {x:(w.hero?.x||110)+50,y:G-72}:
      {x:(w.hero?.x||80)+150,y:G-75};
    const tint=w.R.id==="magic"?"164,116,255":"92,218,255";
    ctx.save();ctx.globalCompositeOperation="lighter";
    glow(ctx,origin.x,origin.y,38+power*50,tint,power*.55);
    ctx.translate(origin.x,origin.y);ctx.rotate(age*2.1);
    ctx.strokeStyle="rgba("+tint+","+(0.4+power*.5)+")";ctx.lineWidth=1.5;
    for(let k=0;k<2;k++){
      ctx.beginPath();ctx.ellipse(0,0,24+power*16,(24+power*16)*(k?.52:.92),k?.4:-.25,0,TAU);
      ctx.stroke();
    }
    ctx.restore();
  }
  if(!h)return;
  const t=w.time-h.start;if(t<0||t>1.02)return;
  ctx.save();ctx.globalCompositeOperation="lighter";ctx.lineCap="round";
  if(h.kind==="rail"){
    const fade=Math.max(0,1-t/.95);
    if(fade>0){
      const beam=ctx.createLinearGradient(h.x,h.y,580,h.y);
      beam.addColorStop(0,"rgba(100,231,255,.98)");beam.addColorStop(.4,"rgba(195,245,255,.98)");
      beam.addColorStop(1,"rgba(92,205,255,.05)");
      for(const [width,alpha] of [[62,.16],[37,.26],[18,.72],[5,.98]]) {
        ctx.beginPath();ctx.moveTo(h.x,h.y);ctx.lineTo(600,h.y);
        ctx.lineWidth=width*fade;ctx.strokeStyle=beam;ctx.globalAlpha=alpha*fade;ctx.stroke();
      }
      ctx.globalAlpha=1;glow(ctx,h.x,h.y,80,"130,223,255",.6*fade);
    }
  } else if(h.kind==="katana"){
    const age=t,fade=Math.max(0,1-age/.62),left=h.x-30,right=h.x1+30;
    ctx.lineWidth=2.5+fade*5;
    ctx.strokeStyle="rgba(190,254,255,"+fade+")";
    ctx.beginPath();ctx.moveTo(left,h.y+18);ctx.lineTo(right,h.y-17);ctx.stroke();
    const burst=h.burstAt==null?0:Math.max(0,1-(w.time-h.burstAt)/.36);
    if(burst>0) {
      glow(ctx,(left+right)/2,h.y,120,"122,233,255",burst*.7);
      ctx.lineWidth=1.5;ctx.strokeStyle="rgba(225,255,255,"+burst+")";
      ctx.beginPath();ctx.moveTo(left,h.y-38);ctx.lineTo(right,h.y+41);ctx.stroke();
    }
  } else if(h.kind==="magic"||h.kind==="magicBurst"){
    const fade=Math.max(0,1-t/.48),rr=h.kind==="magicBurst"?55+95*t:36+35*t;
    glow(ctx,h.x,h.y,rr*1.6,"162,115,255",fade*.65);
    ctx.strokeStyle="rgba(206,167,255,"+fade*.85+")";ctx.lineWidth=Math.max(1,6*fade);
    ctx.beginPath();ctx.arc(h.x,h.y,rr,0,TAU);ctx.stroke();
    ctx.beginPath();ctx.arc(h.x,h.y,rr*.68,0,TAU);ctx.stroke();
    if(h.kind==="magicBurst"){
      for(let i=0;i<8;i++){let a=i*TAU/8+t*1.2;ctx.beginPath();ctx.moveTo(h.x+Math.cos(a)*rr*.3,h.y+Math.sin(a)*rr*.3);
        ctx.lineTo(h.x+Math.cos(a)*rr*1.28,h.y+Math.sin(a)*rr*1.28);ctx.stroke();}
    }
  }
  ctx.restore();
}

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
  on(id) { return id === "sound" || this.steps.has(id); }
  // 소리는 단계가 아니라 처음(RAW)부터 늘 켜져 있음 — R.base에 들어 있는 소리 훅은 항상 실행
  emit(ev, ...a) {
    const rs = this.rigState || (this.rigState = {});
    if (RIG_HIT.test(ev)) rs.hit = this.time; else if (RIG_THROW.test(ev)) rs.thr = this.time;
    if (this.bare) return;
    for (const s of this.R.base || []) if (typeof s[ev] === "function") s[ev](this, ...a);
    for (const s of this.R.steps) if (this.steps.has(s.id) && typeof s[ev] === "function") s[ev](this, ...a);
    if (window.FXDirector && !this.R.polished) FXDirector.moment(this,ev,a);
    else if (!this.R.polished) studioPayoff(this, ev, a);
    studioHeroEvent(this, ev, a);
    // Showcase-grade impact accent on finished combat scenes only.
    // We leave RAW and intermediate steps untouched, so before/after stays meaningful.
    // 공들여 다듬은 레시피(polished)는 공통 장식을 끄고 자기 효과만 보여 줌
    if (!this.R.polished && (ev === "hit" || ev === "kill") && this.n >= 3 && this.n === this.R.steps.length &&
        /^(weapon|combat|duel|fighting|shooter|horde|action)$/.test(this.R.cat) &&
        this.time - (this.polishAt == null ? -10 : this.polishAt) > 0.12) {
      const a0 = a[0], target = a0 && typeof a0 === "object" && Number.isFinite(a0.x) ? a0 : this.foe;
      if (target && Number.isFinite(target.x)) {
        this.polishAt = this.time;
        const x = target.x, y = Number.isFinite(target.y) ? target.y : (target.gy || G) - (target.h || 75) * 0.55;
        const big = ev === "kill", C = big ? "255,216,143" : "255,241,202";
        this.spawn({ type:"ring", x,y, size:5,size1:big?83:41,w:big?10:5,life:big?0.3:0.21,color:C });
        this.spawn({ type:"glow", x,y, size:big?70:42,size1:0,life:0.17,color:C });
        const count=big?16:7;
        for(let i=0;i<count;i++){
          const angle=Math.random()*TAU, speed=(big?250:120)+Math.random()*(big?450:260);
          this.spawn({type:"spark",x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,drag:4.6,
            size:big?2.8:1.9,life:0.13+Math.random()*0.23,color:C});
        }
      }
    }
  }
  get sfx() { return this.muted || app.mute || this.bare ? NOSFX : SFX; }

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
  // land: true 이면 화면 밖으로 사라지지 않고 바닥에 떨어져 한 번 튀고 멈춤 (그 뒤 일어나기)
  fly(a, vx, vy, spin, land) { a.flying = true; a.vx = vx; a.vy = vy; a.spin = spin; a.land = !!land; a.bounced = false; }
  kill(a) {
    if (!a.alive) return;
    a.alive = false;
    this.emit("kill", a);
    if (!a.flying && !a.keep) a.alpha = 0;
    this.after(a.flying ? (a.land ? 2.0 : 1.2) : 0.55, () => this.respawn(a));
  }
  respawn(a) {
    Object.assign(a, { alive: true, flying: false, x: a.home, ox: 0, oy: 0, rot: 0, vx: 0, vy: 0, spin: 0, alpha: 1,
      flash: 0, tint: 0, burn: 0, keep: false, land: false, vib: 0, hp: a.maxHp, hpLag: a.maxHp, sx: 0.2, sy: 0.2 });
  }

  update(rdt) {
    this._rigDt = rdt;
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
        if (a.land) {
          if (a.oy >= 0 && a.vy > 0) {
            a.oy = 0;
            if (!a.bounced && a.vy > 260) { a.bounced = true; a.vy *= -0.28; a.vx *= 0.45; this.emit("land", a); }
            else { a.flying = false; a.vx = 0; a.vy = 0; a.rot = 0; a.keep = true; }
          }
        } else a.alpha = Math.max(0, a.alpha - dt * 0.9);
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

  // 픽셀 모드: 장면 전체(배경·캐릭터·효과)를 작은 화면에 그린 뒤 색 단계를 줄이고 크게 키움
  draw(ctx) {
    if (!FX.pixel) return this.drawRaw(ctx);
    const [rx, ry, rw, rh] = this.view.r, P = FX.pixel, LW = ctx.canvas.fxLogicalWidth || 540;
    const cw = Math.ceil(LW / P), ch = Math.ceil((ry + rh) / P) + 1;
    const c = PIXBUF.c || (PIXBUF.c = document.createElement("canvas")), x = PIXBUF.x || (PIXBUF.x = c.getContext("2d", { willReadFrequently: true }));
    if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
    c.fxLogicalWidth = LW;
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cw, ch); x.setTransform(1 / P, 0, 0, 1 / P, 0, 0);
    this.drawRaw(x);
    x.setTransform(1, 0, 0, 1, 0, 0);
    const X0 = Math.floor(rx / P), Y0 = Math.floor(ry / P), W = Math.ceil(rw / P), H = Math.ceil(rh / P);
    const im = x.getImageData(X0, Y0, W, H), d = im.data, PL = pixPalette(), cache = PIXBUF.cache || (PIXBUF.cache = new Map());
    for (let i = 0; i < d.length; i += 4) {
      const key = (d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3);
      let c = cache.get(key);
      if (c === undefined) { let best = 1e9; for (const p of PL) { const dr = d[i] - p[0], dg = d[i + 1] - p[1], db = d[i + 2] - p[2], e = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11; if (e < best) { best = e; c = p; } } cache.set(key, c); }
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    x.putImageData(im, X0, Y0);
    const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(c, X0, Y0, W, H, X0 * P, Y0 * P, W * P, H * P);
    ctx.imageSmoothingEnabled = sm;
  }
  drawRaw(ctx) {
    const OM = ctx.getTransform();
    const v = this.view, [rx, ry, rw, rh] = v.r;
    ctx.save();
    ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.clip();
    const art = useBgArt(this.R);
    studioBackdrop(ctx, v.r, this.R.cat, this.time, this.R.id, art);
    ctx.translate(v.x, v.y); ctx.scale(v.s, v.s);
    const tr = this.trauma * this.trauma;
    ctx.translate(270 + (Math.random() * 2 - 1) * tr * 24 + this.kx, 180 + (Math.random() * 2 - 1) * tr * 18 + this.ky);
    ctx.rotate((Math.random() * 2 - 1) * tr * 0.035);
    ctx.scale(1 + this.zoom, 1 + this.zoom);
    ctx.translate(-270 - this.cam.x, -180 - this.cam.y);

    // 배경 그림 (카메라와 같이 흔들림). 바닥선이 G에 오도록 맞춤
    if (art) { const c = SPR.bg.c, bw = 820, bh = bw * c.height / c.width, sm0 = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.drawImage(c, 270 - bw / 2, G - FX.bgFloor * bh, bw, bh); ctx.fillStyle = "rgba(4,6,12," + FX.bgDim + ")"; ctx.fillRect(270 - bw / 2, G - FX.bgFloor * bh, bw, bh); ctx.imageSmoothingEnabled = sm0; }
    // 바닥
    if (this.R.drawFloor) this.R.drawFloor(this, ctx);
    else if (!art) {
      ctx.fillStyle = "rgba(255,255,255,0.025)"; ctx.fillRect(-80, G, 700, 120);
      ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fillRect(-80, G - 1, 700, 1.5);
    }

    for (const p of this.parts) if (p.under) drawPart(ctx, p);
    for (const a of this.actors) drawShadow(ctx, a);
    if (this.R.drawBack) this.R.drawBack(this, ctx);
    for (const a of this.actors) drawActor(ctx, a, this);
    // 효과 층: 픽셀 그림이면 작은 화면에 따로 그려 경계를 또렷하게 + 색을 단계로 끊어서 얹음
    const fx = FX.pixelFx && FX._art && FX._art.hero ? pixFxBegin(ctx, OM, v.r) : null, fc = fx || ctx;
    if (this.R.drawFront) this.R.drawFront(this, fc);
    for (const p of this.shots) drawShot(fc, p);
    for (const p of this.parts) if (!p.under) drawPart(fc, p);
    drawStudioHero(fc,this);
    if (window.FXDirector && !this.R.polished) FXDirector.overlay(fc,this);
    if (fx) pixFxEnd(ctx);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    // 발광(블룸): 이펙트(파티클·탄)만 따로 그려 흐리게 겹침. 켜진 레이어가 많을수록 강해져요
    const N = this.R.steps.length, glowA = N && this.n > 0 && !this.bare ? 0.9 * this.n / N : 0;
    const gl = glowA > 0 && !(FX.pixelFx && FX._art && FX._art.hero) ? bloomBegin(ctx, rx, ry, rw, rh) : null;
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
      if (this.flashA > 0) { const pm = FX.pixelFx && FX._art && FX._art.hero; ctx.fillStyle = `rgba(${this.flashC},${pm ? Math.min(0.14, this.flashA * 0.3) : Math.min(1, this.flashA)})`; ctx.fillRect(r.x, r.y, r.w, r.h); }
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
  if (PIXMODE) return pxGlow(ctx, x, y, r * 0.75, c, a);
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
// 픽셀 모드용 효과 모양 (처리한 종류면 true)
function drawPartPx(ctx, p, s, a, k, rem) {
  const C = p.color || "255,255,255";
  switch (p.type) {
    case "glow": pxGlow(ctx, p.x, p.y, s * 0.8, C, a); return true;
    case "star": { const sz = s * (0.6 + 0.4 * rem); ctx.globalAlpha = Math.min(1, a); pxPlus(ctx, p.x, p.y, sz, `rgb(${pxShade(C, 0.75)})`); pxPlus(ctx, p.x, p.y, sz * 0.55, `rgb(${pxShade(C, 1.5)})`); return true; }
    case "spark": {
      const dir = Math.atan2(p.vy, p.vx), len = Math.max(s * 2.4, Math.hypot(p.vx, p.vy) * 0.04);
      ctx.globalAlpha = Math.min(1, a); ctx.lineCap = "butt";
      ctx.strokeStyle = `rgb(${pxShade(C, 0.7)})`; ctx.lineWidth = Math.max(2, s * 1.1);
      ctx.beginPath(); ctx.moveTo(p.x - Math.cos(dir) * len, p.y - Math.sin(dir) * len); ctx.lineTo(p.x, p.y); ctx.stroke();
      pxDisc(ctx, p.x, p.y, Math.max(1.2, s * 0.8), `rgb(${pxShade(C, 1.5)})`);
      if (s > 3 && k < 0.35) pxPlus(ctx, p.x, p.y, s * 1.6, `rgb(${pxShade(C, 1.3)})`);
      return true;
    }
    case "ring": {
      const r = Math.max(2, s), wdt = Math.max(2, (p.w || 6) * rem * 0.8);
      ctx.globalAlpha = Math.min(1, a); ctx.lineCap = "butt";
      const ell = (rr, lw, col) => { ctx.beginPath(); if (p.flat) ctx.ellipse(p.x, p.y, rr, rr * 0.24, 0, 0, TAU); else ctx.arc(p.x, p.y, rr, 0, TAU); ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.stroke(); };
      ell(r, wdt + 2, `rgb(${pxShade(C, 0.55)})`); ell(r, wdt, `rgb(${pxShade(C, 1)})`); if (k < 0.5) ell(r - wdt * 0.2, Math.max(1.5, wdt * 0.35), `rgb(${pxShade(C, 1.6)})`);
      return true;
    }
    case "smoke": { ctx.globalAlpha = Math.min(0.75, a * 0.75); pxDisc(ctx, p.x, p.y, s * 0.85, `rgb(${pxShade(C, 0.55)})`); ctx.globalAlpha = Math.min(0.75, a * 0.6); pxDisc(ctx, p.x - s * 0.2, p.y - s * 0.2, s * 0.5, `rgb(${pxShade(C, 0.8)})`); return true; }
    case "ellipse": { ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, p.round ? 1 : 0.22); pxGlow(ctx, 0, 0, s, C, a); ctx.restore(); return true; }
    case "rays": {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); const n = p.n || 10; ctx.globalAlpha = Math.min(1, a); ctx.lineCap = "butt";
      for (let i = 0; i < n; i++) { ctx.rotate(TAU / n); ctx.strokeStyle = `rgb(${pxShade(C, i % 2 ? 0.7 : 1.2)})`; ctx.lineWidth = i % 2 ? 2 : 3; ctx.beginPath(); ctx.moveTo(s * 0.2, 0); ctx.lineTo(s * (i % 2 ? 0.7 : 1), 0); ctx.stroke(); }
      ctx.restore(); return true;
    }
    case "arc": {
      ctx.globalAlpha = Math.min(1, a); ctx.lineCap = "butt";
      ctx.strokeStyle = `rgb(${pxShade(C, 0.6)})`; ctx.lineWidth = Math.max(3, s * 0.42 * rem); ctx.beginPath(); ctx.arc(p.x, p.y, s, p.a0, p.a1); ctx.stroke();
      ctx.strokeStyle = `rgb(${pxShade(C, 1.1)})`; ctx.lineWidth = Math.max(2, s * 0.24 * rem); ctx.beginPath(); ctx.arc(p.x, p.y, s * 0.98, p.a0 + 0.1, p.a1 - 0.05); ctx.stroke();
      ctx.strokeStyle = `rgb(${pxShade(C, 1.7)})`; ctx.lineWidth = Math.max(1.5, s * 0.08 * rem); ctx.beginPath(); ctx.arc(p.x, p.y, s * 0.96, p.a0 + 0.25, p.a1 - 0.15); ctx.stroke();
      return true;
    }
  }
  return false;
}
function drawPart(ctx, p) {
  const k = p.age / p.life, rem = 1 - k;
  // 직접 그리는 효과 (레시피가 모양을 정함): draw(ctx, p, 진행도 0→1)
  if (p.draw) { ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; p.draw(ctx, p, k); ctx.globalAlpha = 1; return; }
  const s = p.size1 == null ? p.size : p.size + (p.size1 - p.size) * E.out(k);
  let a = p.hold ? Math.min(1, rem * 4) : rem;
  if (p.alpha != null) a *= p.alpha;
  if (a <= 0 || s <= 0) return;
  ctx.globalCompositeOperation = p.add ? "lighter" : "source-over";
  ctx.globalAlpha = 1;
  if (PIXMODE && drawPartPx(ctx, p, s, a, k, rem)) { ctx.globalAlpha = 1; return; }
  switch (p.type) {
    case "glow": glow(ctx, p.x, p.y, s, p.color, a); break;
    case "spark": {
      const dir = Math.atan2(p.vy, p.vx), len = Math.max(s * 2.7, Math.hypot(p.vx, p.vy) * 0.045);
      const tx=p.x-Math.cos(dir)*len,ty=p.y-Math.sin(dir)*len;
      ctx.lineCap="round";ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(p.x,p.y);
      ctx.strokeStyle=`rgba(${p.color},${a*0.32})`;ctx.lineWidth=s*2.5;ctx.stroke();
      ctx.strokeStyle=`rgba(${p.color},${a})`;ctx.lineWidth=Math.max(0.8,s*0.75);ctx.stroke();
      if(s>2.4){ctx.beginPath();ctx.arc(p.x,p.y,Math.max(0.7,s*0.32),0,TAU);ctx.fillStyle=`rgba(255,252,225,${a*0.88})`;ctx.fill();}
      if (p.seek) { ctx.fillStyle = `rgba(${p.color},${a})`; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.fill(); }
      break;
    }
    case "star":
      ctx.fillStyle = `rgba(${p.color},${a})`; starPath(ctx, p.x, p.y, s * (0.6 + 0.4 * rem)); ctx.fill();
      glow(ctx, p.x, p.y, s * 0.7, p.color, a * 0.6); break;
    case "ring": {
      // A shockwave is no longer a perfect, flat cartoon circle. Asymmetric
      // energy arcs read as direction and force; grounded FX retain ellipses.
      const width=Math.max(.6,(p.w||6)*rem),r=Math.max(2,s);
      ctx.save();ctx.lineCap="round";
      if(p.flat){
        ctx.beginPath();ctx.ellipse(p.x,p.y,r,r*.22,0,0,TAU);
        ctx.lineWidth=width*2.4;ctx.strokeStyle=`rgba(${p.color},${a*.13})`;ctx.stroke();
        ctx.lineWidth=width*.75;ctx.strokeStyle=`rgba(${p.color},${a*.78})`;ctx.stroke();
      }else{
        const twist=(p.rot||0)+p.x*.003;
        for(let j=0;j<3;j++){
          ctx.beginPath();
          ctx.arc(p.x,p.y,r*(.84+j*.07),twist+j*2.1,twist+j*2.1+1.62);
          ctx.lineWidth=width*(j? .55:1.3);
          ctx.strokeStyle=`rgba(${p.color},${a*(j===0?.82:.37)})`;
          ctx.stroke();
        }
        if(r>26){
          ctx.beginPath();
          ctx.arc(p.x,p.y,r*.96,twist+2.28,twist+3.3);
          ctx.lineWidth=Math.max(.6,width*.3);
          ctx.strokeStyle=`rgba(255,251,228,${a*.64})`;
          ctx.stroke();
        }
      }
      ctx.restore();break;
    }
    case "arc":
      ctx.lineCap = "round";
      ctx.strokeStyle = `rgba(${p.color},${a})`; ctx.lineWidth = s * 0.34 * rem;
      ctx.beginPath(); ctx.arc(p.x, p.y, s, p.a0, p.a1); ctx.stroke();
      ctx.strokeStyle = `rgba(${p.color},${a * 0.35})`; ctx.lineWidth = s * 0.7 * rem;
      ctx.beginPath(); ctx.arc(p.x, p.y, s * 0.92, p.a0 + 0.2, p.a1 - 0.1); ctx.stroke();
      break;
    case "smoke": {
      const mist = ctx.createRadialGradient(p.x - s * 0.18, p.y - s * 0.17, s * 0.1, p.x, p.y, s);
      mist.addColorStop(0, `rgba(${p.color},${a * 0.34})`);
      mist.addColorStop(0.62, `rgba(${p.color},${a * 0.14})`);
      mist.addColorStop(1, `rgba(${p.color},0)`);
      ctx.fillStyle = mist; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.fill(); break;
    }
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
      // Soft volumetric shaft with a shaped core, not an opaque rectangle.
      const h=p.h||600,half=Math.max(2,s);
      const g=ctx.createLinearGradient(p.x-half,0,p.x+half,0);
      g.addColorStop(0,`rgba(${p.color},0)`);
      g.addColorStop(.28,`rgba(${p.color},${a*.18})`);
      g.addColorStop(.5,`rgba(${p.color},${a*.56})`);
      g.addColorStop(.72,`rgba(${p.color},${a*.18})`);
      g.addColorStop(1,`rgba(${p.color},0)`);
      ctx.save();
      ctx.beginPath();ctx.moveTo(p.x-half*.42,p.y-h);
      ctx.bezierCurveTo(p.x-half*.94,p.y-h*.65,p.x-half,p.y-h*.23,p.x-half*.77,p.y);
      ctx.lineTo(p.x+half*.77,p.y);
      ctx.bezierCurveTo(p.x+half,p.y-h*.23,p.x+half*.94,p.y-h*.65,p.x+half*.42,p.y-h);
      ctx.closePath();ctx.fillStyle=g;ctx.fill();
      ctx.beginPath();ctx.moveTo(p.x,p.y-h);
      ctx.lineTo(p.x,p.y);
      ctx.strokeStyle=`rgba(254,253,231,${a*.52})`;
      ctx.lineWidth=Math.max(.8,half*.075);ctx.stroke();
      ctx.restore();break;
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

/* ───────── 관절 캐릭터 (기본 그림: 부품을 뼈대에 꽂아 움직임) ─────────
   부품 그림 한 장(art/hero-rig.webp, art/foe-rig.webp)에서 잘라 씀. 둘 다 오른쪽을 보게 그려 두고, 적은 그릴 때 뒤집음.
   r: 그림 속 위치 [x, y, w, h] · pv: 부모에 꽂히는 관절(비율) · end: 다음 관절(비율) · pts: 자식이 꽂히는 곳
   chain: [부품, 부모, 꽂는 곳(null=허리, "end"=부모 끝, 이름=부모 pts)] · 동작 = 뼈마다 향하는 방향(도, 0=오른쪽, 90=아래) */
const PIXBUF = { c: null, x: null };
// 효과 층 픽셀화 (월드 2칸 = 1픽셀)
const PFX = { c: null, x: null };
let PIXMODE = false; // 픽셀 효과 층에 그리는 중이면 true → 효과를 계단식 명암·또렷한 모양으로
// 픽셀용 그리기 도구: 색 [r,g,b] 문자열을 받아 밝기 단계(0.45/0.7/1/밝게)를 만듦
function pxShade(c, k) { const v = String(c).split(",").map(Number); return v.map(x => Math.max(0, Math.min(255, Math.round(k > 1 ? x + (255 - x) * (k - 1) : x * k)))).join(","); }
function pxDisc(ctx, x, y, r, col) { if (r <= 0.3) return; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
// 계단식 빛: 바깥은 어둡고 성기게, 안쪽으로 갈수록 밝고 꽉 차게 (3~4단)
function pxGlow(ctx, x, y, r, c, a) {
  if (a <= 0.04 || r < 1) return;
  r = Math.min(r, 60);
  const steps = [[1, 0.5, 0.45 * a], [0.7, 0.8, 0.75 * a], [0.45, 1, a], [0.22, 1.6, a]];
  for (const [kr, kc, al] of steps) { ctx.globalAlpha = Math.min(1, al); pxDisc(ctx, x, y, r * kr, `rgb(${pxShade(c, kc)})`); }
  ctx.globalAlpha = 1;
}
/* ── 픽셀 효과 도구 (손으로 찍은 듯한 모양) ──
   색은 "r,g,b" 문자열. k = 0(시작) → 1(끝) */
// 총구 불꽃: 앞으로 뾰족한 다이아몬드 + 위아래 갈래, 흰 심지 → 노랑 → 주황 테
function pxMuzzle(ctx, x, y, s, k, ang = 0) {
  const sz = s * (k < 0.35 ? 1 : 1 - (k - 0.35) * 1.4); if (sz <= 1) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  const dia = (len, wid, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-len * 0.25, 0); ctx.lineTo(0, -wid); ctx.lineTo(len, 0); ctx.lineTo(0, wid); ctx.closePath(); ctx.fill(); };
  const prong = (a, len, col) => { ctx.save(); ctx.rotate(a); dia(len, len * 0.16, col); ctx.restore(); };
  for (const [kk, col] of [[1, "#c2410c"], [0.78, "#fb923c"], [0.55, "#fde047"], [0.3, "#fffbe6"]]) {
    dia(sz * 1.5 * kk, sz * 0.42 * kk, col); prong(-0.8, sz * 0.75 * kk, col); prong(0.8, sz * 0.75 * kk, col);
  }
  ctx.restore();
}
// 명중 섬광: 8방향 가시(긴 것/짧은 것 번갈아) + 계단식 심지
function pxImpact(ctx, x, y, s, k, c = "255,236,180") {
  const sz = s * (k < 0.25 ? 0.7 + k * 1.2 : 1 - (k - 0.25) * 1.3); if (sz <= 1) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(0.2);
  for (const [kk, sh] of [[1, 0.55], [0.7, 1], [0.42, 1.7]]) {
    ctx.fillStyle = `rgb(${pxShade(c, sh)})`;
    for (let i = 0; i < 8; i++) { const L = sz * kk * (i % 2 ? 0.55 : 1), W = Math.max(1.5, sz * kk * 0.13); ctx.save(); ctx.rotate(i * Math.PI / 4); ctx.beginPath(); ctx.moveTo(0, -W); ctx.lineTo(L, 0); ctx.lineTo(0, W); ctx.closePath(); ctx.fill(); ctx.restore(); }
    pxDisc(ctx, 0, 0, sz * kk * 0.32, `rgb(${pxShade(c, sh)})`);
  }
  ctx.restore();
}
// 바위 파편: 두 면이 다른 밝기인 각진 조각
function pxChip(ctx, x, y, s, rot, light, dark) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-s, -s * 0.5); ctx.lineTo(s * 0.6, -s); ctx.lineTo(s, s * 0.4); ctx.lineTo(-s * 0.3, s); ctx.closePath(); ctx.fill();
  ctx.fillStyle = light; ctx.beginPath(); ctx.moveTo(-s, -s * 0.5); ctx.lineTo(s * 0.6, -s); ctx.lineTo(s * 0.1, 0); ctx.closePath(); ctx.fill();
  ctx.restore();
}
// 초승달 베기 자국: 두께가 가운데서 가장 두꺼운 띠, 바깥 어둡게 → 안쪽 흰 심지 (k: 0→1 동안 그어졌다 사라짐)
function pxCrescent(ctx, x, y, r, a0, a1, th, k, c = "255,236,200") {
  const grow = Math.min(1, k * 5), fade = k < 0.4 ? 1 : 1 - (k - 0.4) / 0.6; if (fade <= 0) return;
  const end = a0 + (a1 - a0) * grow, n = 28;
  for (const [kk, sh] of [[1, 0.5], [0.7, 0.85], [0.42, 1.25], [0.18, 1.8]]) {
    ctx.fillStyle = `rgb(${pxShade(c, sh)})`;
    for (let i = 0; i <= n; i++) { const u = i / n, ang = a0 + (end - a0) * u, w = th * kk * fade * Math.sin(Math.PI * Math.min(1, u * 1.05)); if (w < 0.6) continue; pxDisc(ctx, x + Math.cos(ang) * r, y + Math.sin(ang) * r, w / 2, ctx.fillStyle); }
  }
}
// 십자 반짝이
function pxPlus(ctx, x, y, s, col) { const w = Math.max(2, s * 0.35); ctx.fillStyle = col; ctx.fillRect(x - s, y - w / 2, s * 2, w); ctx.fillRect(x - w / 2, y - s, w, s * 2); }
function pixFxBegin(ctx, OM, r) {
  const M = ctx.getTransform(), unit = Math.hypot(M.a, M.b) * FX.pixelFx;
  const x0 = OM.a * r[0] + OM.e, y0 = OM.d * r[1] + OM.f, w = OM.a * r[2], h = OM.d * r[3];
  const W = Math.max(1, Math.ceil(w / unit)), H = Math.max(1, Math.ceil(h / unit));
  const c = PFX.c || (PFX.c = document.createElement("canvas")), x = PFX.x || (PFX.x = c.getContext("2d", { willReadFrequently: true }));
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H); x.globalAlpha = 1; x.globalCompositeOperation = "source-over";
  x.setTransform(M.a / unit, M.b / unit, M.c / unit, M.d / unit, (M.e - x0) / unit, (M.f - y0) / unit);
  c.fxLogicalWidth = (ctx.canvas.fxLogicalWidth || 540) / unit * (ctx.canvas.width / (ctx.canvas.fxLogicalWidth || 540));
  PFX.place = [x0, y0, W * unit, H * unit];
  PIXMODE = true;
  return x;
}
function pixFxEnd(ctx) {
  PIXMODE = false;
  const c = PFX.c, x = PFX.x, W = c.width, H = c.height;
  x.setTransform(1, 0, 0, 1, 0, 0);
  const im = x.getImageData(0, 0, W, H), d = im.data, PL = pixPalette(), cache = PIXBUF.cache || (PIXBUF.cache = new Map());
  // 가장자리에서 얼마나 안쪽인지(0=테두리, 1, 2=속) → 테두리는 어둡게, 속은 밝게: 픽셀 아트식 명암 계단
  const on = new Uint8Array(W * H); for (let i = 0, j = 0; j < on.length; i += 4, j++) on[j] = d[i + 3] >= 72 ? 1 : 0;
  const depth = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x2 = 0; x2 < W; x2++) { const j = y * W + x2; if (!on[j]) continue;
    let dd = 3; for (let r2 = 1; r2 <= 2 && dd === 3; r2++) for (const [ox, oy] of [[r2, 0], [-r2, 0], [0, r2], [0, -r2]]) { const X = x2 + ox, Y = y + oy; if (X < 0 || Y < 0 || X >= W || Y >= H || !on[Y * W + X]) { dd = r2 - 1; break; } }
    depth[j] = dd; }
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    if (!on[j]) { d[i + 3] = 0; continue; }
    const a = d[i + 3], dp = depth[j], k = (a < 150 ? 0.8 : 1) * (dp === 0 ? 0.58 : dp === 1 ? 0.85 : 1.12);
    const r = Math.min(255, d[i] * k), g = Math.min(255, d[i + 1] * k), b = Math.min(255, d[i + 2] * k);
    const key = (r >> 3) << 10 | (g >> 3) << 5 | (b >> 3);
    let cc = cache.get(key);
    if (cc === undefined) { let best = 1e9; for (const p of PL) { const dr = r - p[0], dg = g - p[1], db = b - p[2], e = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11; if (e < best) { best = e; cc = p; } } cache.set(key, cc); }
    d[i] = cc[0]; d[i + 1] = cc[1]; d[i + 2] = cc[2]; d[i + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  const T = ctx.getTransform(); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  const [px, py, pw, ph] = PFX.place; ctx.drawImage(c, px, py, pw, ph);
  ctx.imageSmoothingEnabled = sm; ctx.restore(); ctx.setTransform(T);
}
// 픽셀 팔레트: 어두운 배경색 몇 개 + 색마다 어두움→밝음 4~5단계 (픽셀 아트처럼 끊어지는 명암)
let PIXPAL = null;
function pixPalette() {
  if (PIXPAL) return PIXPAL;
  const P = [[7, 9, 12], [14, 17, 24], [22, 26, 36], [34, 38, 52], [52, 56, 72], [84, 88, 104], [130, 134, 150], [190, 192, 204], [244, 244, 239]];
  const hues = [0, 18, 32, 48, 80, 120, 150, 180, 200, 220, 260, 290, 320];
  const hsl = (h, s, l) => { const a = s * Math.min(l, 1 - l), f = n => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return [f(0), f(8), f(4)].map(v => Math.round(v * 255)); };
  for (const h of hues) for (const [s, l] of [[0.55, 0.13], [0.65, 0.25], [0.75, 0.42], [0.85, 0.6], [0.95, 0.78], [1, 0.92]]) P.push(hsl(h, s, l));
  return (PIXPAL = P);
}
const RIGS = {
  hero: {
    file: "hero-rig.webp", img: null, k: 0,
    parts: {
      torso: { r: [319, 13, 298, 417], pv: [0.5, 0.9], end: [0.64, 0.06], pts: { shoulder: [0.4, 0.33], cape: [0.32, 0.14] } },
      head: { r: [87, 26, 212, 264], pv: [0.55, 0.86], end: [0.45, 0.12] },
      pelvis: { r: [597, 92, 306, 359], pv: [0.44, 0.1], end: [0.44, 0.6], pts: { hip: [0.42, 0.3] } },
      cape: { r: [907, 31, 335, 491], pv: [0.56, 0.05], end: [0.3, 0.9] },
      uarmF: { r: [52, 393, 190, 287], pv: [0.45, 0.17], end: [0.62, 0.86] },
      uarmB: { r: [305, 399, 167, 292], pv: [0.45, 0.17], end: [0.62, 0.86] },
      farmF: { r: [738, 491, 315, 205], pv: [0.12, 0.2], end: [0.9, 0.72] },
      farmB: { r: [484, 500, 322, 208], pv: [0.13, 0.24], end: [0.9, 0.74] },
      thighF: { r: [80, 696, 191, 376], pv: [0.42, 0.1], end: [0.5, 0.92] },
      thighB: { r: [329, 700, 178, 366], pv: [0.42, 0.1], end: [0.5, 0.92] },
      shinF: { r: [582, 707, 215, 371], pv: [0.52, 0.07], end: [0.42, 0.98] },
      shinB: { r: [896, 708, 291, 368], pv: [0.3, 0.07], end: [0.3, 0.98] },
      sword: { r: [38, 1055, 1182, 169], pv: [0.11, 0.5], end: [1, 0.5] },
    },
    chain: [["torso", null], ["pelvis", null], ["head", "torso", "end"], ["cape", "torso", "cape"],
      ["uarmF", "torso", "shoulder"], ["farmF", "uarmF", "end"], ["uarmB", "torso", "shoulder"], ["farmB", "uarmB", "end"],
      ["thighF", "pelvis", "hip"], ["shinF", "thighF", "end"], ["thighB", "pelvis", "hip"], ["shinB", "thighB", "end"], ["sword", "farmF", "end"]],
    order: [["cape", 1], ["uarmB", 0.62], ["farmB", 0.62], ["thighB", 0.62], ["shinB", 0.62], ["shinF", 1], ["thighF", 1], ["pelvis", 1], ["torso", 1], ["head", 1], ["sword", 1], ["farmF", 1], ["uarmF", 1]],
    feet: ["shinF", "shinB"], hand: "farmF",
    poses: {
      idle:   { torso: -84, head: -96, pelvis: 92, cape: 115, uarmF: 72, farmF: -8, uarmB: 84, farmB: 8, thighF: 72, shinF: 98, thighB: 108, shinB: 96, sword: -60 },
      aim:    { torso: -86, head: -92, uarmF: 6, farmF: 2, uarmB: 30, farmB: 8, thighF: 70, shinF: 98, thighB: 112, shinB: 96 },
      recoil: { torso: -96, head: -104, uarmF: -14, farmF: -34, uarmB: 18, farmB: -10 },
      windup: { torso: -100, head: -98, pelvis: 96, cape: 125, uarmF: -118, farmF: -160, uarmB: 120, farmB: 150, thighF: 64, shinF: 100, thighB: 116, shinB: 100, sword: -205 },
      slash:  { torso: -62, head: -70, pelvis: 86, cape: 150, uarmF: 38, farmF: 58, uarmB: 128, farmB: 160, thighF: 50, shinF: 92, thighB: 128, shinB: 112, sword: 72 },
      thrust: { torso: -72, head: -80, uarmF: -4, farmF: -4, uarmB: 120, farmB: 150, thighF: 54, shinF: 94, thighB: 124, shinB: 108, sword: -4 },
      hurt:   { torso: -112, head: -128, pelvis: 100, cape: 70, uarmF: 120, farmF: 170, uarmB: 60, farmB: 30, thighF: 80, shinF: 100, thighB: 98, shinB: 96 },
      dash:   { torso: -48, head: -58, pelvis: 80, cape: 178, uarmF: 120, farmF: 40, uarmB: 150, farmB: 190, thighF: 28, shinF: 84, thighB: 138, shinB: 150 },
      air:    { torso: -80, thighF: 20, shinF: 100, thighB: 70, shinB: 140, uarmF: -30, farmF: -40, uarmB: 150, farmB: 120 },
    },
  },
  foe: {
    file: "foe-rig.webp", img: null, k: 0, mirror: true,
    parts: {
      head: { r: [0, 0, 254, 309], pv: [0.45, 0.86], end: [0.4, 0.1] },
      torso: { r: [264, 0, 416, 495], pv: [0.52, 0.93], end: [0.55, 0.06], pts: { shoulder: [0.58, 0.3], cape: [0.3, 0.16] } },
      cape: { r: [690, 0, 384, 788], pv: [0.84, 0.04], end: [0.2, 0.95] },
      pelvis: { r: [1084, 0, 402, 389], pv: [0.6, 0.1], end: [0.55, 0.6], pts: { hip: [0.55, 0.3] } },
      armF: { r: [1496, 0, 240, 585], pv: [0.6, 0.12], end: [0.55, 0.95] },
      armB: { r: [1746, 0, 274, 521], pv: [0.6, 0.11], end: [0.7, 0.86] },
      legF: { r: [2030, 0, 352, 702], pv: [0.45, 0.07], end: [0.5, 0.99] },
      legB: { r: [2392, 0, 398, 697], pv: [0.88, 0.07], end: [0.4, 0.99] },
    },
    chain: [["torso", null], ["pelvis", null], ["head", "torso", "end"], ["cape", "torso", "cape"],
      ["armF", "torso", "shoulder"], ["armB", "torso", "shoulder"], ["legF", "pelvis", "hip"], ["legB", "pelvis", "hip"]],
    order: [["cape", 1], ["armB", 0.6], ["legB", 0.62], ["legF", 1], ["pelvis", 1], ["torso", 1], ["head", 1], ["armF", 1]],
    feet: ["legF", "legB"], hand: "armF",
    poses: {
      idle:   { torso: -78, head: -100, pelvis: 98, cape: 112, armF: 84, armB: 100, legF: 80, legB: 100 },
      windup: { torso: -98, head: -104, cape: 120, armF: -128, armB: 120, legF: 74, legB: 108 },
      slash:  { torso: -56, head: -66, cape: 150, armF: 34, armB: 130, legF: 64, legB: 118 },
      thrust: { torso: -64, head: -76, armF: 10, armB: 120, legF: 66, legB: 116 },
      hurt:   { torso: -114, head: -132, pelvis: 104, cape: 66, armF: 134, armB: 118, legF: 86, legB: 96 },
      dash:   { torso: -112, head: -128, cape: 60, armF: 140, armB: 130, legF: 70, legB: 118 },
      air:    { torso: -100, legF: 40, legB: 120, armF: -40, armB: 150 },
    },
  },
};
const RIG_MELEE = /melee|sword|katana|slash|blade|parry|cleave|riposte|counter|combo|crit|execute|finisher/;
const RIG_HIT = /^(hit|strike|swing|slam|stab|cut|smash|impact|crit|kill|break|finish|parry)$/;
const RIG_THROW = /^(cast|launch|release|throw|shoot|fire|shot|beam|blast)$/;
function rigOf(a) { if (!FX.rig || a.top || !FX._art) return null; const R = RIGS[a.key]; return R && R.img && FX._art[a.key] ? R : null; }
function rigOn(a) { return !!(rigOf(a) || poseSet(a)); }
const rigEase = x => x <= 0 ? 0 : x >= 1 ? 1 : 1 - (1 - x) * (1 - x);
function rigDirs(R, w, a) {
  const P = R.poses, base = Object.assign({}, P.idle), t = w.time, rs = w.rigState || {};
  const mix = (name, k) => { const p = P[name]; if (!p || k <= 0) return; for (const b in p) base[b] = base[b] + (p[b] - base[b]) * Math.min(1, k); };
  if (a.key === "hero") {
    if (w.gun) { mix("aim", 1); const g = w.gun; mix("recoil", Math.min(1, Math.abs(g.kick) / 10 + Math.abs(g.rot) * 2.5)); }
    else {
      const since = t - (rs.fire ?? -9), hitAgo = t - (rs.hit ?? -9), thr = t - (rs.thr ?? -9);
      const melee = RIG_MELEE.test(w.R.id) || (rs.hit != null && rs.hit >= (rs.fire ?? -9));
      if (rs.hit != null && hitAgo >= 0 && hitAgo < 0.7 && rs.hit >= (rs.fire ?? -9) - 0.01) {
        // 맞히는 순간 휘두름 → 잠깐 멈춤 → 대기로
        mix(melee ? "slash" : "thrust", hitAgo < 0.06 ? rigEase(hitAgo / 0.06) : 1 - rigEase((hitAgo - 0.2) / 0.5));
      } else if (since >= 0 && since < 0.9 && (rs.hit == null || rs.hit < rs.fire)) {
        // 동작을 시작했지만 아직 안 맞힘 → 예비 동작
        mix("windup", rigEase(since / 0.18) * (since > 0.6 ? 1 - rigEase((since - 0.6) / 0.3) : 1));
      }
      if (thr >= 0 && thr < 0.6) mix("thrust", thr < 0.08 ? rigEase(thr / 0.08) : 1 - rigEase((thr - 0.15) / 0.45));
    }
  }
  if (a.tint > 0.05 || a.vib > 0 || a.flash > 0.2) mix("hurt", Math.min(1, Math.max(a.tint, a.vib / 4, a.flash)));
  const vx = a._rigPrevOx != null ? (a.ox - a._rigPrevOx) / Math.max(1e-3, w._rigDt || 1 / 60) : 0;
  a._rigPrevOx = a.ox;
  const fwd = a.key === "hero" ? vx : -vx;
  if (fwd > 120) mix("dash", Math.min(1, (fwd - 120) / 300));
  if (fwd < -160) mix("hurt", Math.min(1, (-fwd - 160) / 300));
  if (a.oy < -6) mix("air", Math.min(1, -a.oy / 30));
  // 숨쉬기
  const br = Math.sin(t * 2.6 + a.home * 0.05);
  base.torso += br * 1.2; base.cape += Math.sin(t * 1.9 + a.home) * 4;
  for (const b of ["uarmF", "uarmB", "armF", "armB"]) if (b in base) base[b] += br * 2;
  return base;
}
function rigSolve(R, dirs, k) {
  const out = {};
  for (const [name, parent, at] of R.chain) {
    const p = R.parts[name], J = !parent ? { x: 0, y: 0 } : at === "end" ? out[parent].end : out[parent].at(R.parts[parent].pts[at]);
    const rest = Math.atan2((p.end[1] - p.pv[1]) * p.r[3], (p.end[0] - p.pv[0]) * p.r[2]);
    const rot = (dirs[name] ?? 90) * Math.PI / 180 - rest, c = Math.cos(rot), s = Math.sin(rot);
    const fn = f => { const lx = (f[0] - p.pv[0]) * p.r[2] * k, ly = (f[1] - p.pv[1]) * p.r[3] * k; return { x: J.x + lx * c - ly * s, y: J.y + lx * s + ly * c }; };
    out[name] = { J, rot, at: fn, end: fn(p.end) };
  }
  return out;
}
function drawRig(ctx, R, a, w) {
  const dirs = rigDirs(R, w, a);
  if (!R.k) { const s = rigSolve(R, R.poses.idle, 1); R.k = 1 / (Math.max(...R.feet.map(f => s[f].end.y)) - s.head.end.y); }
  const k = R.k * a.h * 1.04, S = rigSolve(R, dirs, k);
  const foot = Math.max(...R.feet.map(f => S[f].end.y)), dx = -S.head.end.x * 0.4;
  ctx.save(); if (R.mirror) ctx.scale(-1, 1); ctx.translate(dx, -foot);
  const sword = a.key === "hero" && !w.gun && RIG_MELEE.test(w.R.id);
  for (const [name, lum] of R.order) {
    if (name === "sword" && !sword) continue;
    const p = R.parts[name], s = S[name];
    ctx.save(); ctx.translate(s.J.x, s.J.y); ctx.rotate(s.rot); ctx.scale(k, k);
    if (lum < 1) ctx.filter = "brightness(" + lum + ")";
    ctx.drawImage(R.img, p.r[0], p.r[1], p.r[2], p.r[3], -p.pv[0] * p.r[2], -p.pv[1] * p.r[3], p.r[2], p.r[3]);
    ctx.restore();
  }
  ctx.restore();
  // 손 위치·팔 방향을 기억 (총·주먹 효과가 여기서 나감)
  const h = S[R.hand].end, m = R.mirror ? -1 : 1;
  a.rigHand = { x: m * (h.x + dx), y: h.y - foot, ang: R.mirror ? Math.PI - dirs[R.hand] * Math.PI / 180 : dirs[R.hand] * Math.PI / 180 };
}
// 화면 밖 캔버스에 그려서 번쩍임·붉은 기운을 덧입힘
const RIG_BUF = { c: null, x: null };
function drawRigActor(ctx, a, w) {
  const R = rigOf(a), W = Math.ceil(a.h * 2.4), H = Math.ceil(a.h * 1.5), sc = 2;
  if (!RIG_BUF.c) { RIG_BUF.c = document.createElement("canvas"); RIG_BUF.x = RIG_BUF.c.getContext("2d"); }
  const c = RIG_BUF.c, x = RIG_BUF.x;
  if (c.width !== W * sc || c.height !== H * sc) { c.width = W * sc; c.height = H * sc; }
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
  x.setTransform(sc, 0, 0, sc, W / 2 * sc, (H - 4) * sc); x.globalCompositeOperation = "source-over";
  drawRig(x, R, a, w);
  const over = (col, al) => { if (al <= 0) return; x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = "source-atop"; x.globalAlpha = Math.min(1, al); x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); x.globalAlpha = 1; x.globalCompositeOperation = "source-over"; };
  over("#ffffff", a.flash); over("#ef4444", a.tint * 0.85); over("#fb923c", a.burn > 0 ? 0.35 : 0);
  ctx.drawImage(c, -W / 2, -(H - 4), W, H);
}

/* ───────── 동작 컷 (기본 그림: 동작별 완성 그림을 갈아 끼움) ─────────
   r: 그림 속 위치 · ax: 몸통 가운데(가로 비율) · tip: 손끝/총구(비율) */
const SHOOT_TIPS = [[0.92, 0.189], [0.899, 0.169], [0.78, 0.06], [0.69, 0.06], [0.941, 0.203], [0.941, 0.176], [0.952, 0.176], [0.931, 0.169]];
const POSES = {
  hero: { file: "hero-px.png", img: null, pixel: true,
    // 여러 장짜리 동작(한 줄 시트: 칸 너비 cw, 높이 ch, n장, 초당 fps장)
    anims: { idle: { file: "hero-idle-px.png", img: null, cw: 82, ch: 75, n: 8, fps: 7, ax: 0.455, tip: [0.82, 0.53] },
      // 시전: 4번째 장(손을 든 순간)부터 앞으로 내뻗기까지 한 번만 재생
      // 총: 겨눔은 4~7번(제자리로 돌아오는 장)을 재생 후 유지, 반동은 1~3번(총구가 튐)
      aim: { file: "hero-shoot-px.png", img: null, cw: 94, ch: 74, n: 8, from: 4, fps: 20, once: true, ax: 0.416, tips: SHOOT_TIPS },
      recoil: { file: "hero-shoot-px.png", img: null, cw: 94, ch: 74, n: 2, from: 1, fps: 18, once: true, ax: 0.416, tips: SHOOT_TIPS },
      // 칼: 치켜든 채 대기(0~1번) → 내려베기(2~7번 한 번)
      windup: { file: "hero-sword-px.png", img: null, cw: 103, ch: 99, n: 2, fps: 5, ax: 0.449, tip: [0.65, 0.25] },
      slash: { file: "hero-sword-px.png", img: null, cw: 103, ch: 99, n: 8, from: 2, fps: 30, once: true, ax: 0.449, tip: [0.68, 0.63] },
      // 맞음: 5번째 장(맞는 순간)부터 뒤로 밀렸다 돌아오기까지 (PixelLab 128칸 → 키가 조금 작아 1.1배)
      hurt: { file: "hero-hurt-px.png", img: null, cw: 69, ch: 68, n: 26, from: 4, fps: 30, once: true, scale: 1.1, ax: 0.554, tip: [0.85, 0.5] },
      // 돌진: 제자리에서 달리는 8장 반복 (몸 이동은 엔진이 함)
      dash: { file: "hero-dash-px.png", img: null, cw: 90, ch: 70, n: 8, fps: 24, scale: 1.1, ax: 0.5, tip: [0.85, 0.5] },
      cast: { file: "hero-cast-px.png", img: null, cw: 82, ch: 75, n: 8, from: 3, fps: 22, once: true, ax: 0.426, tip: [0.945, 0.29] } },
    f: {
    idle: { r: [0, 0, 62, 75], ax: 0.46, tip: [0.847, 0.533] },
    aim: { r: [64, 0, 75, 73], ax: 0.357, tip: [0.993, 0.171] },
    recoil: { r: [141, 0, 75, 78], ax: 0.419, tip: [0.86, 0.115] },
    windup: { r: [218, 0, 60, 78], ax: 0.459, tip: [0.908, 0.179] },
    slash: { r: [280, 0, 96, 64], ax: 0.313, tip: [0.651, 0.586] },
    hurt: { r: [378, 0, 61, 65], ax: 0.488, tip: [0.959, 0.523] },
    dash: { r: [441, 0, 59, 53], ax: 0.533, tip: [0.992, 0.415] },
    cast: { r: [502, 0, 68, 68], ax: 0.384, tip: [0.993, 0.174] } } },
  foe: { file: "foe-px.png", img: null, pixel: true,
    anims: { idle: { file: "foe-idle-px.png", img: null, cw: 81, ch: 86, n: 25, fps: 12, ax: 0.416, tip: [0.06, 0.6] },
      // 공격: 팔을 젖힌 채(2~13번) → 발톱 휘두르기(14~20번) → 제자리(21~31번)
      windup: { file: "foe-attack-px.png", img: null, cw: 142, ch: 86, n: 12, from: 2, fps: 8, ax: 0.665, tip: [0.28, 0.4] },
      hurt: { file: "foe-hurt-px.png", img: null, cw: 95, ch: 86, n: 39, from: 8, fps: 32, once: true, ax: 0.358, tip: [0.1, 0.4] },
      // 날아감: 3번째 장(맞아 꺾임)부터 공중에서 뒤로 넘어가기까지 (마지막 장 유지)
      fly: { file: "foe-fly-px.png", img: null, cw: 106, ch: 86, n: 31, from: 2, fps: 26, once: true, ax: 0.5, tip: [0.3, 0.3] },
      // 일어나기: 엎어진 자세 → 선 자세 8장 (날아갔다 떨어진 뒤)
      getup: { file: "foe-getup-px.png", img: null, cw: 91, ch: 86, n: 8, fps: 12, once: true, ax: 0.491, tip: [0.1, 0.5] },
      down: { file: "foe-getup-px.png", img: null, cw: 91, ch: 86, n: 1, fps: 1, ax: 0.491, tip: [0.1, 0.5] },
      attack: { file: "foe-attack-px.png", img: null, cw: 142, ch: 86, n: 32, from: 12, fps: 26, once: true, ax: 0.665, tip: [0.02, 0.5] } },
    f: {
    idle: { r: [0, 0, 77, 86], ax: 0.415, tip: [0.06, 0.6] },
    windup: { r: [79, 0, 83, 85], ax: 0.488, tip: [0.1, 0.4] },
    attack: { r: [164, 0, 113, 79], ax: 0.536, tip: [0.02, 0.58] },
    hurt: { r: [279, 0, 74, 78], ax: 0.471, tip: [0.2, 0.4] },
    fly: { r: [355, 0, 95, 78], ax: 0.583, tip: [0.3, 0.3], lift: 0.25 } } },
};
function poseSet(a) { if (a.top || !FX._art || FX.poses === false) return null; const P = POSES[a.key]; return P && P.img && FX._art[a.key] ? P : null; }
function poseName(w, a) {
  const t = w.time, rs = w.rigState || {};
  const vx = a._pPrevOx != null ? (a.ox - a._pPrevOx) / Math.max(1e-3, w._rigDt || 1 / 60) : 0; a._pPrevOx = a.ox;
  if (a.key === "foe") {
    if (a.flying || a.oy < -10 || (!a.alive && Math.abs(a.rot || 0) > 0.2)) return "fly";
    // 떨어진 뒤: 잠깐 엎어져 있다가(0.45초) 일어남
    if (a.poseNow === "fly") a._getupAt = t + (a.land ? 0.45 : 0);
    if (t < (a._getupAt ?? -9)) return "down";
    if (t - (a._getupAt ?? -9) < 8 / 12 && a.poseNow !== "hurt") return "getup";
    if (a.tint > 0.15 || a.flash > 0.3 || (a.vib > 0.5 && !(a.burn > 0)) || vx > 160) return "hurt";
    const h = w.hero; if (h && (h.tint > 0.3 || h.flash > 0.4)) return "attack";
    return "idle";
  }
  if (a.tint > 0.25 || (a.flash > 0.45 && !w.gun)) return "hurt";
  if (w.gun) { const g = w.gun; return Math.abs(g.kick) > 3 || Math.abs(g.rot) > 0.05 ? "recoil" : "aim"; }
  if (a.oy < -6) return "dash";
  const since = t - (rs.fire ?? -9), hitAgo = t - (rs.hit ?? -9), thr = t - (rs.thr ?? -9);
  const sword = RIG_MELEE.test(w.R.id);
  const hitNow = rs.hit != null && rs.hit >= (rs.fire ?? -9) - 0.01;
  if (hitNow && hitAgo >= 0 && hitAgo < 0.38) return sword ? "slash" : "dash";
  if (thr >= 0 && thr < 0.4) return "cast";
  if (vx > 150) return "dash";
  if (sword && since >= 0 && since < 0.8 && !hitNow) return "windup";
  return "idle";
}
// 컷이 몇 장뿐이어도 부드럽게: 바뀔 때 잔상(이전 컷이 짧게 겹침) + 컷마다 작은 움직임(반동·쏠림·숨쉬기)
const POSE_MOVE = {
  idle: (u, t) => ({ sy: 1 + Math.sin(t * 2.4) * 0.012, rot: 0, dx: 0 }),
  aim: (u, t) => ({ sy: 1 + Math.sin(t * 2.2) * 0.008, rot: 0, dx: 0 }),
  recoil: u => ({ sy: 1, rot: 0, dx: -3 * Math.exp(-u * 14) }),
  windup: u => ({ sy: 1 + 0.03 * Math.min(1, u / 0.25), rot: -0.07 * Math.min(1, u / 0.3), dx: -6 * Math.min(1, u / 0.3) }),
  slash: u => ({ sy: 1 - 0.04 * Math.exp(-u * 10), rot: 0.09 * Math.exp(-u * 7), dx: 16 * Math.exp(-u * 6) }),
  attack: u => ({ sy: 1, rot: -0.08 * Math.exp(-u * 7), dx: -16 * Math.exp(-u * 6) }),
  hurt: u => ({ sy: 1, rot: (u < 0.25 ? -0.1 : -0.1 * Math.exp(-(u - 0.25) * 8)), dx: (Math.sin(u * 70) * 3) * Math.exp(-u * 6) }),
  dash: u => ({ sy: 1 - 0.03, rot: 0.05, dx: 0 }),
  cast: u => ({ sy: 1, rot: 0.04 * Math.exp(-u * 6), dx: 7 * Math.exp(-u * 8) }),
  fly: u => ({ sy: 1, rot: 0, dx: 0 }),
};
function drawPoseActor(ctx, a, w) {
  const P = poseSet(a), idle = P.f.idle, t = w.time;
  let name = poseName(w, a);
  // 너무 빨리 바뀌면 깜빡거려 보여서, 한 컷은 최소 0.07초 유지
  if (a.poseNow && name !== a.poseNow && t - (a.poseAt ?? -9) < 0.07 && name !== "hurt") name = a.poseNow;
  // 한 번 재생하는 동작(맞음·공격·베기 등)은 끝까지 보여 줌 — 날아가기·새로 맞기만 끼어들 수 있음
  const OA = P.anims && P.anims[a.poseNow];
  if (OA && OA.once && name !== a.poseNow && name !== "fly" && !(name === "hurt" && a.poseNow !== "hurt") && t - (a.poseAt ?? -9) < (OA.n - (OA.from || 0)) / OA.fps) name = a.poseNow;
  if (a.poseNow !== name) { a.posePrev = a.poseNow; a.poseAt = t; a.poseNow = name; }
  const u = t - (a.poseAt ?? -9);
  const W = Math.ceil(a.h * 2.6), H = Math.ceil(a.h * 1.6), sc = 2;
  if (!RIG_BUF.c) { RIG_BUF.c = document.createElement("canvas"); RIG_BUF.x = RIG_BUF.c.getContext("2d"); }
  const c = RIG_BUF.c, x = RIG_BUF.x;
  if (c.width !== W * sc || c.height !== H * sc) { c.width = W * sc; c.height = H * sc; }
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height); x.globalCompositeOperation = "source-over"; x.imageSmoothingEnabled = !P.pixel;
  const k = a.h / idle.r[3], dir = a.key === "foe" ? -1 : 1;
  const frame = (nm, age, alpha, extraDx) => {
    const f = P.f[nm] || idle, fw = f.r[2] * k, fh = f.r[3] * k, lift = (f.lift || 0) * a.h;
    const m = (POSE_MOVE[nm] || POSE_MOVE.idle)(age, t + a.home * 0.01);
    x.setTransform(sc, 0, 0, sc, W / 2 * sc, (H - 4) * sc);
    x.translate((m.dx + extraDx) * dir, -lift); x.rotate(m.rot * dir); x.scale(1, m.sy);
    const A = P.anims && P.anims[nm];
    if (A && A.img) {
      // 여러 장짜리 동작: 시간에 맞춰 칸을 넘김 (숨쉬기는 몸 움직임을 그림이 대신하니 크기 출렁임은 끔)
      const i = A.once ? Math.min(A.n - 1, (A.from || 0) + Math.floor(age * A.fps)) : (A.from || 0) + Math.floor((t + a.home * 0.13) * A.fps) % A.n, aw = A.cw * k * (A.scale || 1), ah = A.ch * k * (A.scale || 1);
      x.setTransform(sc, 0, 0, sc, W / 2 * sc, (H - 4) * sc); x.translate((m.dx + extraDx) * dir, 0);
      const left = -A.ax * aw, top = -ah;
      x.globalAlpha = alpha; x.drawImage(A.img, i * A.cw, 0, A.cw, A.ch, left, top, aw, ah); x.globalAlpha = 1;
      return { left, top, fw: aw, fh: ah, f: { tip: A.tips ? A.tips[i] : A.tip }, m: { dx: m.dx, rot: 0, sy: 1 }, lift: 0 };
    }
    const left = -f.ax * fw, top = -fh;
    x.globalAlpha = alpha; x.drawImage(P.img, f.r[0], f.r[1], f.r[2], f.r[3], left, top, fw, fh); x.globalAlpha = 1;
    return { left, top, fw, fh, f, m, lift };
  };
  // 잔상: 바뀐 직후 0.12초 동안 이전 컷이 옅게 남아 동작이 이어져 보임
  const fade = 0.12;
  const noGhost = name === "fly" || name === "getup" || a.posePrev === "fly" || name === "recoil" || a.posePrev === "recoil";
  if (a.posePrev && u < fade && !noGhost) frame(a.posePrev, u + 0.3, 0.55 * (1 - u / fade), name === "slash" || name === "attack" ? -10 : 0);
  const cur = frame(name, u, 1, 0);
  // 휘두르는 컷은 앞쪽으로 빠르게 번지는 잔상 2개를 더 깔아 속도감
  if ((name === "slash" || name === "attack") && u < 0.1) for (let i = 1; i <= 2; i++) frame(name, u, 0.22 * (1 - u / 0.14) / i, -i * 9);
  x.setTransform(1, 0, 0, 1, 0, 0);
  const over = (col, al) => { if (al <= 0) return; x.globalCompositeOperation = "source-atop"; x.globalAlpha = Math.min(1, al); x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); x.globalAlpha = 1; x.globalCompositeOperation = "source-over"; };
  // 번쩍임은 짧고 또렷하게: 처음 순간만 흰색, 그 뒤는 옅게
  over("#ffffff", a.flash > 0.88 ? 0.85 : a.flash * 0.28); over("#ef4444", Math.min(0.55, a.tint * 0.6)); over("#ff6a1a", a.burn > 0 ? Math.min(1, a.burn) * (0.14 + 0.1 * Math.sin(performance.now() / 45)) : 0);
  const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = !P.pixel; ctx.shadowBlur = 0;
  ctx.drawImage(c, -W / 2, -(H - 4), W, H); ctx.imageSmoothingEnabled = sm;
  // 손끝·총구 위치를 기억 (총알·주먹 효과가 여기서 나감)
  const { left, top, fw, fh, f, m, lift } = cur;
  a.rigHand = { x: (m.dx * dir) + left + f.tip[0] * fw, y: -lift + (top + f.tip[1] * fh) * m.sy, ang: name === "recoil" ? -0.35 : 0 };
}
function drawActor(ctx, a, w) {
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
  // Soft rim light on the hero silhouette, without changing the custom sprites.
  if (a.key === "hero" && !a.top) { ctx.shadowColor = "rgba(160,216,242,.38)"; ctx.shadowBlur = 9; }
  const rigged = w && a.key==="hero" && !a.top && !w.bare &&
    w.n===w.R.steps.length && (window.FXDirector || ["weapon-railgun","weapon-katana","magic"].includes(w.R.id)) &&
    !((FX.images || {}).hero || (FX._art && FX._art.hero)) && SPR.heroRigBody;
  if (w && poseSet(a) && !rigOf(a)) { drawPoseActor(ctx, a, w); ctx.restore(); return; }
  if (w && rigOf(a)) { drawRigActor(ctx, a, w); ctx.restore(); return; }
  if(rigged) drawStudioRigHero(ctx,a,w,top);
  else { const pxl = FX._art && FX._art[a.key], sm = ctx.imageSmoothingEnabled; if (pxl) ctx.imageSmoothingEnabled = false; ctx.drawImage(a.s.c,-a.w/2,top,a.w,a.h); ctx.imageSmoothingEnabled = sm; }
  ctx.shadowBlur = 0;
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
  if (p.len && PIXMODE) {
    const sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp; ctx.lineCap = "butt";
    for (const [f, w, col] of [[1, 5, "#9a3412"], [0.75, 4, "#f97316"], [0.45, 3, "#fde047"], [0.18, 2, "#fffbe6"]]) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(p.x - ux * p.len * f, p.y - uy * p.len * f); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
    pxDisc(ctx, p.x, p.y, 3, "#fffbe6");
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
function rigWorld(c) { const h = c.rigHand; return { x: c.x + c.ox + h.x * c.sx, y: c.gy + c.oy + h.y * c.sy }; }
function gripPt(w) { const c = w.hero; if (c && c.rigHand && rigOn(c)) return rigWorld(c); return { x: c.x + c.ox + c.w * fxPt("hand")[0], y: G - c.h * fxPt("hand")[1] * c.sy }; }
function muzzle(w) {
  if (w.hero && w.hero.rigHand && poseSet(w.hero) && !rigOf(w.hero)) return rigWorld(w.hero);
  const g = w.gun, p = gripPt(w), gh = GUNW * SPR.gun.c.height / SPR.gun.c.width;
  const r = gunRot(w), lx = (fxPt("gunMuzzle")[0] - fxPt("gunGrip")[0]) * GUNW - g.kick, ly = (fxPt("gunMuzzle")[1] - fxPt("gunGrip")[1]) * gh, c = Math.cos(r), s = Math.sin(r);
  return { x: p.x + lx * c - ly * s, y: p.y + lx * s + ly * c };
}
function gunRot(w) { const c = w.hero; return c && c.rigHand && rigOn(c) ? c.rigHand.ang : w.gun.rot; }
function drawGun(w, ctx) {
  if (w.hero && poseSet(w.hero) && !rigOf(w.hero)) return; // 동작 컷에 총이 이미 그려져 있음
  const g = w.gun, p = gripPt(w), img = SPR.gun.c, gh = GUNW * img.height / img.width;
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(gunRot(w));
  ctx.drawImage(img, -fxPt("gunGrip")[0] * GUNW - g.kick, -fxPt("gunGrip")[1] * gh, GUNW, gh);
  ctx.restore();
}
function paw(w) { const c = w.hero; if (c && c.rigHand && rigOn(c)) return rigWorld(c); return { x: c.x + c.ox + c.w * (fxPt("hand")[0] + 0.03), y: G - c.h * (fxPt("hand")[1] + 0.06) }; }

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
    // Match the actual canvas coordinate system: portrait uses 540 logical
    // pixels, while the desktop theater is 960 logical pixels wide.
    // Previously assuming 540 on the 960 theater scaled down bloom and
    // replayed it as a miniature duplicate in the upper-left corner.
    const logicalW = ctx.canvas.fxLogicalWidth || 540;
    const k = ctx.canvas.width / logicalW, D = BLOOM.D;
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
    ctx.globalAlpha = Math.min(1, a) * 0.9; ctx.filter = "blur(3px)"; ctx.drawImage(BLOOM.c, rx, ry, rw, rh);
    ctx.restore();
  } catch (e) { BLOOM.ok = false; }
}

/* ───────── 레시피 등록소 ───────── */
const RECIPES = [];
// 레시피를 등록할 때 "소리" 단계를 빼서 R.base로 옮김 → 소리는 RAW부터 항상 나오고, 단계 목록에는 눈에 보이는 효과만 남음
RECIPES.push = function (...rs) {
  for (const r of rs) if (r && r.steps && !r.base) {
    r.base = r.steps.filter(s => s.id === "sound"); r.steps = r.steps.filter(s => s.id !== "sound");
    // 동작을 시작한 시각을 기록 (관절 주인공의 예비 동작용)
    const f = r.fire; if (typeof f === "function") r.fire = function (w, ...x) { const st = w.rigState || (w.rigState = {}); st.fire = w.time; return f.call(this, w, ...x); };
  }
  return Array.prototype.push.apply(this, rs);
};
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
