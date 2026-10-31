/* Popcorn Drop — 스킬 트리 화면: 그물 모양 칸 그리기, 끌어 움직이기, 두 손가락 확대·축소, 칸 누르기 */
(function () {
  'use strict';
  const D = window.DATA;
  const U = 54;                      // 트리 1칸 거리 = 54px (확대 1배일 때)
  const R_NODE = 19, R_KEY = 22, R_START = 24;
  const Z_MIN = 0.35, Z_MAX = 2.2;

  let cv = null, cx = null, C = null, font = null, G = null, onTap = null, isReduce = () => false;
  let lw = 360, lh = 640, dpr = 1;
  let z = 1, ox = 0, oy = 0;         // 확대 배수와 트리 가운데의 화면 위치(가운데에서 떨어진 정도)
  let open = false, lastPulse = 0;
  const ptrs = new Map();
  let drag = null;
  let pressId = null;                // 누르고 있는 칸 (눌린 동안 작게·밝게 그린다)

  function init(o) {
    cv = o.canvas; cx = cv.getContext('2d'); C = o.colors; font = o.font; G = o.game; onTap = o.onTap; isReduce = o.reduce || isReduce;
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { e.preventDefault(); const p = local(e); zoomAt(p.x, p.y, e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
  }
  function resize(w, h, ratio) {
    lw = w; lh = h; dpr = ratio;
    if (!cv) return;
    cv.width = Math.round(w * ratio); cv.height = Math.round(h * ratio);
    draw();
  }
  function local(e) {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * lw, y: (e.clientY - r.top) / r.height * lh };
  }
  // 트리 좌표(칸 단위) → 화면(판 안 px)
  function toScreen(n) { return { x: lw / 2 + ox + n.x * U * z, y: lh / 2 + 20 + oy + n.y * U * z }; }
  function hitNode(px, py) {
    let best = null, bd = 1e9;
    D.SKILLS.forEach(n => {
      const s = toScreen(n), r = radius(n) * z + 8;
      const d2 = (s.x - px) ** 2 + (s.y - py) ** 2;
      if (d2 < r * r && d2 < bd) { bd = d2; best = n; }
    });
    return best;
  }
  function radius(n) { return n.id === 'start' ? R_START : n.eff === 'key' ? R_KEY : R_NODE; }
  function clampView() {
    const lim = 7.6 * U * z;
    ox = Math.max(-lim, Math.min(lim, ox)); oy = Math.max(-lim, Math.min(lim, oy));
  }
  function zoomAt(px, py, f) {
    const nz = Math.max(Z_MIN, Math.min(Z_MAX, z * f));
    const k = nz / z;
    const cxp = lw / 2 + ox, cyp = lh / 2 + 20 + oy;
    ox = px - (px - cxp) * k - lw / 2;
    oy = py - (py - cyp) * k - lh / 2 - 20;
    z = nz; clampView(); draw();
  }
  function zoomBy(f) { zoomAt(lw / 2, lh / 2 + 20, f); }
  function panBy(dx, dy) { ox += dx; oy += dy; clampView(); draw(); }
  function centerOn(id, zz) {
    const n = D.SKILL[id] || D.SKILL.start;
    if (zz) z = zz;
    ox = -n.x * U * z; oy = -n.y * U * z; clampView(); draw();
  }
  function fitAll() { z = Math.max(Z_MIN, Math.min(1, (Math.min(lw, lh - 120) / 2 - 20) / (7.4 * U))); ox = 0; oy = 0; draw(); }

  function down(e) {
    if (!open) return;
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* 붙잡기를 못 해도 끌기는 된다 */ }
    const p = local(e);
    ptrs.set(e.pointerId, p);
    if (ptrs.size === 1) {
      drag = { x: p.x, y: p.y, sx: p.x, sy: p.y, moved: 0, id: e.pointerId };
      const n = hitNode(p.x, p.y);
      pressId = n ? n.id : null;
    } else { drag = null; pressId = null; }
    draw();
  }
  function clearPress() { if (pressId !== null) { pressId = null; draw(); } }
  function move(e) {
    if (!ptrs.has(e.pointerId)) return;
    const p = local(e), prev = ptrs.get(e.pointerId);
    if (ptrs.size >= 2) {
      // 두 손가락: 두 점 사이 거리 변화만큼 확대·축소, 가운데 점 이동만큼 움직이기
      const [a, b] = Array.from(ptrs.values());
      const d0 = Math.hypot(a.x - b.x, a.y - b.y);
      ptrs.set(e.pointerId, p);
      const [a2, b2] = Array.from(ptrs.values());
      const d1 = Math.hypot(a2.x - b2.x, a2.y - b2.y);
      const mx = (a2.x + b2.x) / 2, my = (a2.y + b2.y) / 2;
      if (d0 > 4) zoomAt(mx, my, d1 / d0);
      panBy((p.x - prev.x) / 2, (p.y - prev.y) / 2);
      return;
    }
    ptrs.set(e.pointerId, p);
    if (drag && drag.id === e.pointerId) {
      drag.moved = Math.max(drag.moved, Math.hypot(p.x - drag.sx, p.y - drag.sy));
      if (drag.moved > 8) pressId = null;
      panBy(p.x - drag.x, p.y - drag.y);
      drag.x = p.x; drag.y = p.y;
    }
  }
  function up(e) {
    if (!ptrs.has(e.pointerId)) return;
    const p = local(e);
    const wasDrag = drag && drag.id === e.pointerId ? drag : null;
    ptrs.delete(e.pointerId);
    if (wasDrag && wasDrag.moved < 8 && ptrs.size === 0) {
      const n = hitNode(p.x, p.y);
      if (n && onTap) onTap(n.id);
    }
    if (ptrs.size === 0) drag = null;
    clearPress();
  }

  // ---------- 그리기 ----------
  function stateOf(n) { return n.id === 'start' ? 'owned' : G.nodeState(n.id); }
  function draw() {
    if (!cx || !open) return;
    const t = performance.now() / 1000;
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.clearRect(0, 0, cv.width, cv.height);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 바탕: 어두운 매점 벽과 가운데 빛
    cx.fillStyle = C.bg; cx.fillRect(0, 0, lw, lh);
    const g = cx.createRadialGradient(lw / 2 + ox, lh / 2 + 20 + oy, 10, lw / 2 + ox, lh / 2 + 20 + oy, 420 * z);
    g.addColorStop(0, C.surface2); g.addColorStop(1, C.bg);
    cx.fillStyle = g; cx.fillRect(0, 0, lw, lh);
    // 트리 공간: 화면 가운데 + 움직인 만큼, 확대 배수
    cx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (lw / 2 + ox), dpr * (lh / 2 + 20 + oy));
    const owned = G.Store.data.owned;
    // 가지 이름
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    D.BRANCHES.forEach(b => {
      const a = b.angle * Math.PI / 180;
      cx.font = font(C['fs-s'], true); cx.fillStyle = C[b.color]; cx.globalAlpha = 0.85;
      cx.fillText(b.name, Math.cos(a) * 7.9 * U, Math.sin(a) * 7.9 * U);
    });
    cx.globalAlpha = 1;
    // 이음줄
    D.LINKS.forEach(l => {
      const A = D.SKILL[l.a], B = D.SKILL[l.b];
      const both = owned[l.a] && owned[l.b], one = owned[l.a] || owned[l.b];
      cx.strokeStyle = both ? C.gold : one ? C.butter : C.line;
      cx.globalAlpha = both ? 1 : one ? 0.7 : 0.45;
      cx.lineWidth = both ? 4 : 2.5;
      cx.setLineDash(l.kind === 'web' ? [6, 6] : []);
      cx.beginPath(); cx.moveTo(A.x * U, A.y * U); cx.lineTo(B.x * U, B.y * U); cx.stroke();
    });
    cx.setLineDash([]); cx.globalAlpha = 1;
    // 방금 산 칸: 금빛 고리가 퍼진다
    if (ring && t - ring.t0 < 0.45 && !isReduce()) {
      const n = D.SKILL[ring.id], k = (t - ring.t0) / 0.45;
      cx.globalAlpha = 1 - k; cx.strokeStyle = C.gold; cx.lineWidth = 4;
      cx.beginPath(); cx.arc(n.x * U, n.y * U, radius(n) + 4 + k * 26, 0, Math.PI * 2); cx.stroke();
      cx.globalAlpha = 1;
    }
    // 칸
    const pulse = isReduce() ? 0 : (Math.sin(t * 4) + 1) / 2;
    D.SKILLS.forEach(n => {
      const pressed = n.id === pressId;
      const st = stateOf(n), r = radius(n) * (pressed ? 0.94 : 1), x = n.x * U, y = n.y * U;
      const br = D.BRANCHES.find(b => b.key === n.br);
      if (st === 'buy') {
        cx.globalAlpha = 0.35 + pulse * 0.35; cx.fillStyle = C.butter;
        cx.beginPath(); cx.arc(x, y, r + 6 + pulse * 3, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = 1;
      }
      cx.globalAlpha = st === 'far' ? 0.4 : 1;
      cx.fillStyle = st === 'owned' ? C.surface2 : st === 'far' ? C.bg : C.surface;
      cx.beginPath(); cx.arc(x, y, r, 0, Math.PI * 2); cx.fill();
      cx.lineWidth = st === 'owned' || pressed ? 4 : 2.5;
      cx.strokeStyle = pressed ? C.butter : st === 'owned' ? C.gold : st === 'buy' ? C.butter : br ? C[br.color] : C.line;
      if (pressed) cx.globalAlpha = 1;
      if (st === 'near' && !pressed) cx.setLineDash([4, 3]);
      cx.stroke(); cx.setLineDash([]);
      cx.font = font(n.id === 'start' ? C['fs-l'] : C['fs-m']);
      cx.fillStyle = C.text;
      cx.fillText(n.icon, x, y + 1);
      // 색만으로 구분하지 않게 글자도: 산 칸 ✔, 살 수 있는 칸·이어진 칸은 값, 먼 칸은 자물쇠
      cx.font = font(C['fs-xxs'], true);
      if (n.id !== 'start') {
        const label = st === 'owned' ? '✔' : st === 'far' ? '🔒' : G.costOf(n.id) + '🎟';
        cx.lineWidth = 3; cx.strokeStyle = C.bg;
        cx.strokeText(label, x, y + r + 8);
        cx.fillStyle = st === 'owned' ? C.gold : st === 'buy' ? C.butter : C.muted;
        cx.fillText(label, x, y + r + 8);
      }
      cx.globalAlpha = 1;
    });
  }
  // 깜빡임·고리는 ui.js 의 고리 하나(requestAnimationFrame)가 트리 화면일 때만 부른다
  function tick(now) {
    if (!open || isReduce()) return;
    if (now - lastPulse > 50) { lastPulse = now; draw(); }
  }
  function show() { open = true; draw(); }
  function hide() { open = false; ptrs.clear(); drag = null; pressId = null; }
  function screenPos(id) { const n = D.SKILL[id]; return n ? toScreen(n) : null; }
  let ring = null;
  function ringAt(id) { if (D.SKILL[id]) { ring = { id, t0: performance.now() / 1000 }; draw(); } }

  window.Tree = { init, resize, show, hide, draw, tick, zoomBy, panBy, centerOn, fitAll, screenPos, ringAt, get zoom() { return z; } };
})();
