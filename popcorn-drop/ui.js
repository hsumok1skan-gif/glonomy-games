/* Popcorn Drop — 화면·그리기·입력 */
(function () {
  'use strict';
  const D = window.DATA, P = window.Phys, G = window.Game, Sfx = window.Sfx;
  const $ = id => document.getElementById(id);
  const set = () => G.Store.data.settings;

  // ---------- 색 (style.css :root 변수를 그대로 읽는다) ----------
  const C = {};
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    ['bg', 'surface', 'surface2', 'line', 'glow', 'butter', 'corn', 'popcorn', 'caramel', 'burnt', 'seat', 'mint', 'gold',
      'fire', 'pot', 'pot-dark', 'peg', 'rat', 'text', 'muted', 'danger', 'shade'].concat(D.DECO.map(d => d.color)).forEach(k => {
      C[k] = (cs.getPropertyValue('--' + k) || '').trim();
    });
    ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', 'icon'].forEach(k => { C['fs-' + k] = parseInt(cs.getPropertyValue('--fs-' + k), 10) || 16; });
  }
  function deco(kind) {
    const id = G.Store.data.deco.eq[kind];
    const d = D.DECO.find(x => x.id === id) || D.DECO.find(x => x.kind === kind);
    return C[d.color];
  }

  // ---------- 화면 전환 ----------
  let cur = 'scr-title', locked = false, subFrom = null, paused = false;
  function lock() { locked = true; setTimeout(() => { locked = false; }, 240); }
  function show(id) {
    if (cur === id) return;
    const prev = $(cur), next = $(id);
    if (prev) prev.classList.remove('in');
    cur = id;
    if (set().reduce) next.classList.add('in');
    else requestAnimationFrame(() => next.classList.add('in'));
    lock();
    refresh(id);
  }
  function openOv(id) { $(id).classList.add('in'); lock(); }
  function closeOv(id) { $(id).classList.remove('in'); }
  function ovOpen(id) { return $(id).classList.contains('in'); }

  function on(id, fn, snd) {
    const el = $(id);
    if (!el) return;
    el.addEventListener('click', e => {
      if (locked) return;
      Sfx.play(snd || 'click');
      fn(e);
    });
  }

  // ---------- 손맛 도구 ----------
  const frame = $('frame');
  function flash(kind) {
    const f = $('flash');
    f.className = 'flash';
    void f.offsetWidth;
    f.className = 'flash on' + (kind ? ' ' + kind : '');
  }
  let shakeT = 0, shakeA = 0;
  function shake(el, level) {
    if (!set().shake || set().reduce) return;
    if (!el) { shakeT = level === 'hard' ? 0.36 : level === 'soft' ? 0.18 : 0.28; shakeA = level === 'hard' ? 7 : 3; }
    // 판을 줄여 놓았으면(zoom < 1) #frame 의 scale 을 덮지 않게 캔버스만 흔든다
    if (!el && zoom < 1) return;
    const target = el || frame;
    target.classList.remove('shake', 'soft', 'hard');
    void target.offsetWidth;
    target.classList.add('shake');
    if (level) target.classList.add(level);
    setTimeout(() => target.classList.remove('shake', 'soft', 'hard'), 400);
  }
  function bump(el) {
    if (!el || set().reduce) return;
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    setTimeout(() => el.classList.remove('bump'), 320);
  }
  function popOn(el, text, bad) {
    if (!el) return;
    const r = el.getBoundingClientRect(), fr = frame.getBoundingClientRect();
    const p = document.createElement('div');
    p.className = 'pop' + (bad ? ' bad' : '');
    p.textContent = text;
    p.style.left = (r.left - fr.left + r.width / 2) / zoom + 'px';
    p.style.top = (r.top - fr.top) / zoom + 'px';
    frame.appendChild(p);
    setTimeout(() => p.remove(), 950);
  }
  let toastT = 0;
  function toast(text) {
    const t = $('toast');
    t.textContent = text; t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('on'), 1800);
  }

  // 캔버스 위 글자·조각
  const fx = [], bits = [];
  const TIER = ['text', 'butter', 'fire', 'rainbow'];
  function popAt(x, y, text, o) {
    o = o || {};
    if (fx.length > 60) fx.shift();
    fx.push({ x, y, text, color: o.color || 'butter', size: o.size || C['fs-m'], t: 0, life: o.life || 0.9 });
  }
  function burst(x, y, color, n) {
    if (set().reduce) n = Math.min(n, 3);
    for (let i = 0; i < n && bits.length < 260; i++) {
      const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 120;
      bits.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, t: 0, life: 0.3 + Math.random() * 0.2, color });
    }
  }
  const smoke = [];

  // ---------- 크기 맞추기 ----------
  const cv = $('cv');
  let cx = cv.getContext('2d');      // 예고편을 그릴 때만 잠깐 다른 캔버스로 바꾼다(snap)
  let scale = 1, dpr = 1, zoom = 1;
  // 9:16 판을 창 안에 맞춘다. 판이 360×640 보다 작아지면(가로 844×390 등)
  // 360×640 으로 짜고 통째로 줄여(transform) 버튼·글자가 넘치지 않게 한다.
  function fit() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const fw = Math.floor(Math.min(vw, vh * 9 / 16)), fh = Math.floor(fw * 16 / 9);
    zoom = fw < P.W ? fw / P.W : 1;
    const lw = zoom < 1 ? P.W : fw, lh = zoom < 1 ? P.H : fh;
    frame.style.width = lw + 'px';
    frame.style.height = lh + 'px';
    frame.style.transform = zoom < 1 ? 'scale(' + zoom + ')' : '';
    dpr = Math.min(2, window.devicePixelRatio || 1) * zoom;
    scale = lw / P.W;
    cv.width = Math.round(lw * dpr);
    cv.height = Math.round(lh * dpr);
    frame.style.fontSize = '';
    drawPegBoard();
  }

  // ---------- 그리기 ----------
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function font(px, bold) { return (bold ? '800 ' : '600 ') + px + 'px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif'; }
  // 무지개 = 디자인 규칙 색 6개를 돌아가며
  const RAINBOW = ['butter', 'fire', 'seat', 'glow', 'mint', 'gold'];
  function col(name, t) {
    if (name === 'rainbow') return C[RAINBOW[Math.floor(t * 10) % RAINBOW.length]];
    return C[name];
  }

  function drawBg(S) {
    const c = cx;
    c.fillStyle = deco('hall');
    c.fillRect(0, 0, P.W, P.H);
    // 은은한 스크린 빛
    const sc = deco('screen');
    const g = c.createRadialGradient(P.W / 2, -40, 10, P.W / 2, -40, 360);
    g.addColorStop(0, sc); g.addColorStop(1, 'transparent');
    c.globalAlpha = 0.2; c.fillStyle = g; c.fillRect(0, 0, P.W, P.H * 0.7); c.globalAlpha = 1;
    c.fillStyle = sc; c.globalAlpha = 0.55; rr(c, 70, 2, P.W - 140, 6, 3); c.fill(); c.globalAlpha = 1;
    // 객석 띠
    c.fillStyle = C.bg; c.globalAlpha = 0.45;
    c.fillRect(0, 40, P.SIDE, P.H); c.fillRect(P.W - P.SIDE, 40, P.SIDE, P.H);
    c.globalAlpha = 1;
    // 못 판 면
    c.fillStyle = C.surface; c.globalAlpha = 0.5;
    c.fillRect(P.BL, 96, P.BR - P.BL, P.POT_TOP - 96);
    c.globalAlpha = 1;
    c.strokeStyle = C.line; c.lineWidth = 1;
    c.strokeRect(P.BL + 0.5, 96.5, P.BR - P.BL - 1, P.POT_TOP - 96);
  }

  const TUB_W = { S: 22, M: 28, L: 34 };
  function drawSeats(S, t) {
    const c = cx;
    for (const s of S.seats) {
      const x = s.x, y = s.y;
      // 의자
      c.fillStyle = deco('seat');
      rr(c, x - 26, y - 4, 52, 40, 8); c.fill();
      c.fillStyle = C.bg; c.globalAlpha = 0.25; rr(c, x - 22, y + 24, 44, 10, 4); c.fill(); c.globalAlpha = 1;
      // 손님 얼굴 (기다림 / 환호)
      const cheer = s.full;
      const hop = cheer && !set().reduce ? Math.abs(Math.sin((t + s.id) * 8)) * 3 : 0;
      c.font = font(C['fs-l']); c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(cheer ? '🥳' : s.cust.face, x + (s.side === 0 ? -10 : 10), y + 8 - hop);
      // 팝콘 통 (빨강·흰 줄무늬), 앞에 들고 있음
      const w = TUB_W[s.kind], b = s.bump * 2;
      const tx = x + (s.side === 0 ? 8 : -8);
      c.save();
      c.translate(tx, y);
      c.scale(1 + b * 0.04, 1 + b * 0.04);
      c.beginPath(); c.moveTo(-w / 2, 0); c.lineTo(w / 2, 0); c.lineTo(w / 2 - 4, 22); c.lineTo(-w / 2 + 4, 22); c.closePath();
      c.fillStyle = C.popcorn; c.fill();
      c.save(); c.clip();
      c.fillStyle = C.seat;
      for (let k = -w / 2; k < w / 2; k += 8) c.fillRect(k, 0, 4, 22);
      c.restore();
      // 담긴 팝콘
      const f = s.fill / s.cap;
      if (f > 0) {
        c.fillStyle = C.popcorn;
        const hh = 4 + f * 9;
        c.beginPath(); c.ellipse(0, 1, w / 2 - 1, hh * (f >= 1 ? 1 : 0.55), 0, Math.PI, 0); c.fill();
      }
      c.restore();
      // 숫자 (색만으로 구분하지 않게 글자로)
      c.font = font(C['fs-xxs'], true);
      c.fillStyle = s.full ? C.mint : C.text;
      c.fillText(s.full ? '가득!' : s.fill + '/' + s.cap, tx, y + 30);
    }
  }

  function drawFunnel(S) {
    const c = cx, x = S.funnelX;
    c.fillStyle = C.pot;
    c.beginPath(); c.moveTo(x - 30, 46); c.lineTo(x + 30, 46); c.lineTo(x + 8, 78); c.lineTo(x - 8, 78); c.closePath(); c.fill();
    c.fillStyle = C['pot-dark']; c.fillRect(x - 7, 78, 14, 6);
    const f = S.cornMax ? S.corn / S.cornMax : 0;
    if (f > 0) {
      c.fillStyle = C.corn;
      const top = 76 - f * 26;
      c.beginPath();
      const half = 8 + (76 - top) * 0.8;
      c.moveTo(x - half, top); c.lineTo(x + half, top); c.lineTo(x + 8, 76); c.lineTo(x - 8, 76); c.closePath(); c.fill();
    }
    if (S.holding && S.corn > 0) { c.strokeStyle = C.butter; c.lineWidth = 2; c.beginPath(); c.arc(x, 82, 7, 0, Math.PI * 2); c.stroke(); }
    c.font = font(C['fs-xxs'], true); c.fillStyle = C.text; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(S.corn + '알', x, 56);
  }

  const PEG_LABEL = { x2: '×2', x4: '×4', gold: '★' };
  function drawPegs(c, pegs, t) {
    for (const p of pegs) {
      if (p.k === 'n') {
        c.fillStyle = C.peg; c.beginPath(); c.arc(p.x, p.y, P.PEG_R, 0, Math.PI * 2); c.fill();
        continue;
      }
      if (p.k === 'rat') {
        c.fillStyle = C.rat; c.beginPath(); c.ellipse(p.x, p.y, 8, 6, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = C.danger; c.fillRect(p.x - 3, p.y - 1, 1.5, 1.5); c.fillRect(p.x + 1.5, p.y - 1, 1.5, 1.5);
        continue;
      }
      const colr = p.k === 'x2' ? C.mint : p.k === 'x4' ? C.fire : C.gold;
      const r = 7 + (p.glow || 0) * 3;
      if (p.glow > 0) { c.globalAlpha = p.glow * 0.6; c.fillStyle = colr; c.beginPath(); c.arc(p.x, p.y, r + 5, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
      c.fillStyle = colr; c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill();
      if (p.own) { c.strokeStyle = C.text; c.lineWidth = 1; c.stroke(); }
      c.fillStyle = C.bg; c.font = font(C['fs-xxs'], true); c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(PEG_LABEL[p.k], p.x, p.y + 0.5);
    }
  }

  function drawKernels(S) {
    const c = cx;
    for (const k of S.kernels) {
      c.fillStyle = k.gold ? C.gold : C.corn;
      c.beginPath(); c.ellipse(k.x, k.y, P.KR, P.KR * 0.8, k.vx * 0.01, 0, Math.PI * 2); c.fill();
      if (k.gold) { c.fillStyle = C.popcorn; c.fillRect(k.x - 1, k.y - 2, 2, 2); }
    }
    for (const r of S.rolls) {
      c.globalAlpha = Math.max(0, 1 - r.t / 1.2);
      c.fillStyle = C.corn; c.beginPath(); c.arc(r.x, P.POT_BOT + 2 + r.t * 50, 3.5, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
    }
  }

  function drawPots(S, t) {
    const c = cx;
    for (const pot of S.pots) {
      const x0 = P.BL + pot.i * P.POT_W + 3, w = P.POT_W - 6, y0 = P.POT_TOP, h = P.POT_BOT - P.POT_TOP;
      const b = set().reduce ? 0 : pot.bump * 2;
      // 불꽃
      if (pot.fire) {
        for (let k = 0; k < 4; k++) {
          const fh = 6 + Math.abs(Math.sin(t * 14 + k * 1.7 + pot.i)) * 6;
          c.fillStyle = k % 2 ? C.butter : C.fire;
          c.beginPath(); const fx0 = x0 + 6 + k * (w - 12) / 3;
          c.moveTo(fx0 - 4, P.POT_BOT + 4); c.lineTo(fx0, P.POT_BOT + 4 - fh - 4); c.lineTo(fx0 + 4, P.POT_BOT + 4); c.fill();
        }
      }
      c.fillStyle = pot.burning ? C.burnt : C.pot;
      rr(c, x0 - b, y0 - b, w + b * 2, h + b, 6); c.fill();
      c.fillStyle = C['pot-dark']; c.fillRect(x0 - 2, y0 - 2, w + 4, 4);
      // 쌓인 알 (막대)
      const f = Math.min(1, pot.n / S.potCap);
      c.fillStyle = C.bg; rr(c, x0 + 4, y0 + h - 12, w - 8, 7, 3); c.fill();
      if (f > 0) { c.fillStyle = f >= 1 ? C.danger : pot.n >= G.MEGA ? C.fire : C.corn; rr(c, x0 + 4, y0 + h - 12, (w - 8) * f, 7, 3); c.fill(); }
      // 알 무더기
      if (pot.n > 0) {
        c.fillStyle = C.corn;
        const hh = 3 + f * 16;
        c.beginPath(); c.ellipse(x0 + w / 2, y0 + 1, w / 2 - 3, hh, 0, Math.PI, 0); c.fill();
      }
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = font(set().guide ? C['fs-m'] : C['fs-s'], true); c.fillStyle = C.text;
      c.fillText(String(pot.n), x0 + w / 2, y0 + 22);
      if (pot.fire && pot.fireT < 2) {
        c.font = font(C['fs-xs'], true); c.fillStyle = C.butter;
        c.fillText(Math.ceil(2 - pot.fireT) + '…', x0 + w / 2, y0 - 10);
      } else if (pot.burning) {
        c.font = font(C['fs-xs'], true); c.fillStyle = C.danger; c.fillText('탄다!', x0 + w / 2, y0 - 10);
      } else if (pot.fire && pot.n === 0 && pot.emptyT > 2) {
        c.font = font(C['fs-xs'], true); c.fillStyle = C.danger; c.fillText('빔 ' + Math.ceil(6 - pot.emptyT), x0 + w / 2, y0 - 10);
      }
      if (pot.burning && Math.random() < 0.3 && smoke.length < 80) smoke.push({ x: x0 + w / 2 + (Math.random() - 0.5) * 20, y: y0, t: 0 });
    }
  }

  function drawPops(S) {
    const c = cx;
    for (const p of S.pops) {
      c.fillStyle = p.car ? C.caramel : C.popcorn;
      const s = 3.2;
      c.beginPath();
      c.arc(p.x, p.y, s, 0, Math.PI * 2);
      c.arc(p.x + Math.cos(p.spin) * s, p.y + Math.sin(p.spin) * s, s * 0.8, 0, Math.PI * 2);
      c.arc(p.x - Math.sin(p.spin) * s, p.y + Math.cos(p.spin) * s, s * 0.75, 0, Math.PI * 2);
      c.fill();
    }
  }

  function drawFx(dt, t) {
    const c = cx;
    for (let i = smoke.length - 1; i >= 0; i--) {
      const s = smoke[i]; s.t += dt; s.y -= 30 * dt; s.x += Math.sin(s.t * 3) * 0.3;
      if (s.t > 1.4) { smoke.splice(i, 1); continue; }
      c.globalAlpha = 0.35 * (1 - s.t / 1.4); c.fillStyle = C.muted;
      c.beginPath(); c.arc(s.x, s.y, 5 + s.t * 8, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i]; b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 300 * dt;
      if (b.t > b.life) { bits.splice(i, 1); continue; }
      c.globalAlpha = 1 - b.t / b.life; c.fillStyle = col(b.color, t);
      c.fillRect(b.x - 1.5, b.y - 1.5, 3, 3);
    }
    c.globalAlpha = 1;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i]; f.t += dt;
      if (f.t > f.life) { fx.splice(i, 1); continue; }
      const k = f.t / f.life;
      const rise = set().reduce ? 0 : k * 34;
      const sc = set().reduce ? 1 : (k < 0.15 ? 0.8 + k * 2.6 : 1);
      c.globalAlpha = k < 0.7 ? 1 : (1 - k) / 0.3;
      c.font = font(Math.round(f.size * sc), true);
      c.lineWidth = 3; c.strokeStyle = C.bg; c.strokeText(f.text, f.x, f.y - rise);
      c.fillStyle = col(f.color, t + i); c.fillText(f.text, f.x, f.y - rise);
    }
    c.globalAlpha = 1;
  }

  let lastDraw = 0;
  function render(now) {
    const S = G.S;
    if (!S) return;
    const t = now / 1000, dt = Math.min(0.05, lastDraw ? t - lastDraw : 0.016);
    lastDraw = t;
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.clearRect(0, 0, cv.width, cv.height);
    let ox = 0, oy = 0;
    if (shakeT > 0) { shakeT -= dt; ox = (Math.random() - 0.5) * shakeA; oy = (Math.random() - 0.5) * shakeA; }
    cx.setTransform(scale * dpr, 0, 0, scale * dpr, ox * dpr, oy * dpr);
    drawBg(S);
    drawSeats(S, t);
    drawPegs(cx, S.pegs, t);
    drawFunnel(S);
    drawKernels(S);
    drawPots(S, t);
    drawPops(S);
    drawFx(dt, t);
    hud(S);
  }

  // ---------- 예고편 (시작 화면 필름 띠) ----------
  // game.js sandbox 로 같은 규칙의 연습 상영을 돌리고, 장면이 일어난 그 순간을 상영 화면과 같은 그리기로 칸에 담는다.
  function snap(id, S, box, labels, extra) {
    const el = $(id), c = el.getContext('2d'), keep = cx, keepSmoke = smoke.length;
    const k = el.width / box.w, t = performance.now() / 1000;
    cx = c;
    try {
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, el.width, el.height);
      c.setTransform(k, 0, 0, k, -box.x * k, -box.y * k);
      drawBg(S); drawSeats(S, t); drawPegs(c, S.pegs, t); drawFunnel(S); drawKernels(S); drawPots(S, t); drawPops(S);
      if (extra) extra(c);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      (labels || []).forEach(l => {
        c.font = font(l.size || C['fs-l'], true);
        c.lineWidth = 3; c.strokeStyle = C.bg; c.strokeText(l.text, l.x, l.y);
        c.fillStyle = col(l.color || 'butter', 0); c.fillText(l.text, l.x, l.y);
      });
    } finally { cx = keep; smoke.length = keepSmoke; }
  }
  function cap(id, head, line) { $(id).innerHTML = '<b>' + head + '</b>' + line; }
  function boxAt(x, y, w, h) { return { x: Math.max(0, Math.min(P.W - w, x - w / 2)), y: Math.max(0, Math.min(P.H - h, y - h / 2)), w, h }; }
  // 상영 화면의 버너 단추·위 시계를 큰 칸에만 그려 넣는다(실제로는 HTML 단추)
  function drawPlayChrome(S) {
    return c => {
      const bw = (P.BR - P.BL) / P.POT_N;
      S.pots.forEach((p, i) => {
        const x = P.BL + i * bw + 1.5;
        c.fillStyle = p.burning ? C.burnt : p.fire ? C.fire : C.surface;
        rr(c, x, 524, bw - 3, 52, 10); c.fill();
        c.strokeStyle = C.line; c.lineWidth = 2; c.stroke();
        c.font = font(C['fs-m']); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = C.text;
        c.fillText('🔥', x + (bw - 3) / 2, 546);
      });
      c.font = font(C['fs-m'], true); c.fillStyle = C.popcorn;
      c.fillText('상영까지 ' + Math.max(0, Math.ceil(S.timeMax - S.time)) + '초', P.W / 2, 14);
      c.font = font(C['fs-s'], true); c.fillStyle = C.butter;
      c.fillText('옥수수 ' + S.kernelTotal + '알', P.W / 2, 32);
    };
  }
  function smokeOver(x) {
    return c => {
      c.fillStyle = C.muted;
      [[-8, -10, 6], [6, -22, 8], [-4, -36, 10]].forEach(s => { c.globalAlpha = 0.4; c.beginPath(); c.arc(x + s[0], P.POT_TOP + s[1], s[2], 0, Math.PI * 2); c.fill(); });
      c.globalAlpha = 1;
    };
  }

  let trailerKey = '';
  function buildTrailer() {
    const eq = G.Store.data.deco.eq, key = eq.hall + eq.seat + eq.screen;
    if (key === trailerKey) return;
    trailerKey = key;
    try {
      G.sandbox(ev => {
        const step = (cond, sec) => { for (let i = 0; i < sec * 60 && !cond(); i++) G.update(1 / 60); return cond(); };
        const ticks = n => { for (let i = 0; i < n; i++) G.update(1 / 60); };
        const got = type => ev.find(e => e.type === type);

        // 한 판: 옥수수 통을 다 키운 상영관 1, 깔때기는 가운데
        G.Store.data.up.corn = D.UPGRADES.corn.levels.length;
        let S = G.startShow(1, 'hall');
        S.clockOn = false;                     // 연습 상영이라 시계는 멈춰 둔다(튜토리얼과 같음)
        G.setFunnel(P.W / 2); G.setHold(true);

        // ① 두 배 못에 닿은 알이 두 알로 갈라져 따로 떨어진다
        if (step(() => got('split'), 30)) {
          const d = got('split').data;
          ticks(6);
          const near = S.kernels.filter(k => k.split && Math.abs(k.x - d.x) < 40 && Math.abs(k.y - d.y) < 40).length;
          snap('tr-split', S, boxAt(d.x, d.y + 12, 120, 100), [{ x: d.x, y: d.y - 16, text: '×' + d.n, color: d.n === 4 ? 'fire' : 'mint' }]);
          cap('tc-split', d.n === 4 ? '네 배 못' : '두 배 못', '1알 → ' + near + '알');
        }

        // ② 불 꺼진 가운데 냄비에 옥수수가 쌓인다
        step(() => S.pots[2].n >= 56 || S.corn <= 0, 90);
        G.setHold(false);
        step(() => !S.kernels.length, 10);
        const charged = S.pots[2].n;
        snap('tr-charge', S, { x: 105, y: 400, w: 150, h: 125 });
        cap('tc-charge', '불 끄고 모으기', charged + '알 쌓임');

        // ③ 옆 냄비 불을 켜면 2초 뒤 팝콘이 위로 튄다
        const side = [1, 3, 0, 4].filter(i => S.pots[i].n > 0 && S.pots[i].n < G.MEGA).sort((a, b) => S.pots[b].n - S.pots[a].n)[0];
        if (side != null) {
          ev.length = 0;
          G.toggleFire(side);
          if (step(() => got('pop'), 3)) {
            const n = got('pop').data.n;
            ticks(18);
            const up = S.pops.filter(p => p.vy < 0).length;
            snap('tr-pop', S, boxAt(P.potX(side), 410, 240, 200));
            cap('tc-pop', '불 켜면 팡팡', n + '개 터짐 · ' + up + '개 위로');
          }
          G.toggleFire(side);
        }

        // ④ 많이 모은 냄비를 한 번에 켜면 대폭발
        ev.length = 0;
        G.toggleFire(2);
        step(() => got('mega') || got('pop'), 3);
        const mega = got('mega');
        ticks(15);
        snap('tr-mega', S, { x: 0, y: 200, w: 360, h: 300 }, mega
          ? [{ x: P.W / 2, y: 280, text: '대폭발!', color: 'butter', size: C['fs-icon'] }, { x: P.potX(2), y: P.POT_TOP - 28, text: mega.data.n + '알 팡!', color: 'fire', size: C['fs-xl'] }]
          : []);
        snap('tr-full', S, { x: 0, y: 0, w: P.W, h: P.H }, mega ? [{ x: P.W / 2, y: 300, text: '대폭발!', color: 'butter', size: C['fs-xxl'] }] : [], drawPlayChrome(S));
        cap('tc-mega', mega ? '대폭발!' : '보통 팡', charged + '알 한 번에');

        // ⑥ 팝콘이 손님 통에 들어가 통이 차면 동전
        ev.length = 0;
        if (step(() => got('fill') || S.done, 20) && got('fill')) {
          const d = got('fill').data, s = S.seats[d.seat];
          ticks(3);
          snap('tr-fill', S, { x: s.side === 0 ? 0 : P.W - 120, y: Math.max(0, Math.min(P.H - 100, s.y - 40)), w: 120, h: 100 },
            [{ x: s.side === 0 ? 60 : P.W - 60, y: Math.max(14, s.y - 26), text: '+' + d.coins + '🎟', color: TIER[d.tier] === 'rainbow' ? 'fire' : TIER[d.tier] }]);
          cap('tc-fill', '통 가득', '+' + d.coins + '🎟 동전');
        }

        // ⑤ 다른 판: 빈 냄비에 불을 켜 둔 채 6초면 타고, 그때 들어간 옥수수는 팝콘이 되지 않는다
        S = G.startShow(1, 'hall');
        S.clockOn = false;
        ev.length = 0;
        G.toggleFire(0);
        if (step(() => S.pots[0].burning, 10)) {
          G.setFunnel(P.FUNNEL_MIN); G.setHold(true);
          step(() => S.burnt >= 3, 15);
          G.setHold(false);
          snap('tr-burn', S, { x: 20, y: 395, w: 156, h: 130 }, [], smokeOver(P.potX(0)));
          cap('tc-burn', '빈 냄비 6초', '탄 옥수수 ' + S.burnt + ' · 팝콘 ' + S.popped);
        }
      });
    } catch (e) {
      $('trailer').classList.add('hidden');   // 예고편을 못 그려도 시작 화면은 그대로 쓴다
    }
  }

  // ---------- 위 정보 ----------
  let shownKern = 0, lastHud = '';
  function hud(S) {
    if (shownKern < S.kernelTotal) {
      shownKern = Math.min(S.kernelTotal, shownKern + Math.max(1, Math.ceil((S.kernelTotal - shownKern) / 6)));
      const k = $('hud-kern'); k.classList.add('tick'); setTimeout(() => k.classList.remove('tick'), 90);
      Sfx.play('tick');
    }
    const left = Math.max(0, Math.ceil(S.timeMax - S.time));
    const key = [S.hallNo, S.corn, left, shownKern, S.filled, S.tut, G.firesOn(), S.firesMax, S.pots.map(p => (p.fire ? 1 : 0) + (p.burning ? 2 : 0)).join('')].join('|');
    if (key === lastHud) return;
    lastHud = key;
    $('hud-hall').textContent = S.mode === 'daily' ? '오늘의 상영' : '상영관 ' + S.hallNo;
    $('hud-corn').textContent = '통 ' + S.corn + '알';
    const tm = $('hud-time');
    tm.textContent = S.tut ? '상영까지 ' + left + '초 (연습)' : '상영까지 ' + left + '초';
    tm.classList.toggle('low', left <= 10);
    $('hud-kern').textContent = '옥수수 ' + shownKern + '알';
    $('hud-fill').textContent = '손님 ' + S.filled + '/' + (S.mode === 'daily' ? S.seats.length : S.goal);
    const on = G.firesOn();
    $('fire-count').textContent = '불 ' + on + '/' + S.firesMax + ' · 50알 넘게 모아 켜면 대폭발!';
    document.querySelectorAll('.burner').forEach(b => {
      const i = Number(b.dataset.i), p = S.pots[i];
      b.classList.toggle('on', p.fire && !p.burning);
      b.classList.toggle('burn', p.burning);
      b.disabled = S.done || (!p.fire && on >= S.firesMax);
      b.setAttribute('aria-pressed', p.fire ? 'true' : 'false');
    });
  }

  // ---------- 고리 ----------
  let acc = 0, lastT = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (G.testMode) return;
    const dt = Math.min(0.1, lastT ? (now - lastT) / 1000 : 0);
    lastT = now;
    if (cur !== 'scr-play' || !G.S) return;
    if (paused || document.hidden || ovOpen('ov-ad')) return;   // 멈춘 동안은 다시 그리지 않는다
    if (!G.S.done) {
      acc += dt;
      let n = 0;
      while (acc >= 1 / 60 && n < 8) { G.update(1 / 60); acc -= 1 / 60; n++; }
      if (n >= 8) acc = 0;
    }
    render(now);
  }

  // ---------- 상영 ----------
  function startPlay(hallNo, mode) {
    fx.length = 0; bits.length = 0; smoke.length = 0; shownKern = 0; lastHud = '';
    paused = false; closeOv('ov-pause'); closeOv('ov-result');
    $('btn-more-corn').classList.add('hidden');
    G.startShow(hallNo, mode);
    show('scr-play');
    tutBanner();
    Sfx.buzz(20);
  }
  function tutBanner() {
    const S = G.S, el = $('tut');
    if (!S || !S.tut) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const text = [
      '',
      '① 화면을 누른 채 좌우로 끌어 옥수수를 떨궈요. 두 배 못(×2)에 닿으면 알이 갈라져요!',
      '② 냄비 아래 🔥 단추로 불을 켜요. 2초 뒤 팡팡 터져요!',
      '③ 팝콘이 손님 통에 들어가요. 통이 가득 차면 영화 표 동전!'
    ][S.tut];
    $('tut-text').textContent = text;
    bump(el);
  }
  function pause() {
    if (cur !== 'scr-play' || !G.S || G.S.done || paused) return;
    paused = true; G.setHold(false); openOv('ov-pause');
  }
  function resume() { paused = false; closeOv('ov-pause'); lastT = 0; }

  // 광고 자리 — 광고 SDK 가 없어 3초 뒤 닫기만 열린다
  let adDone = null, adTimer = 0;
  function openAd(title, text, done) {
    adDone = done;
    $('ad-title').textContent = title;
    const btn = $('btn-ad-close');
    btn.disabled = true;
    let n = 3;
    $('ad-text').textContent = text + ' (광고 자리 · 준비 중) ' + n + '초';
    clearInterval(adTimer);
    adTimer = setInterval(() => {
      n--;
      if (n <= 0) { clearInterval(adTimer); btn.disabled = false; $('ad-text').textContent = text + ' (광고 자리 · 준비 중)'; }
      else $('ad-text').textContent = text + ' (광고 자리 · 준비 중) ' + n + '초';
    }, 1000);
    openOv('ov-ad');
  }

  function showResult(res) {
    const tl = $('res-title');
    if (res.mode === 'daily') tl.textContent = '오늘의 상영 끝!';
    else tl.textContent = res.soldout ? '매진 상영!' : res.passed ? '상영 시작!' : '아쉬운 상영';
    $('res-sub').textContent = res.mode === 'daily' ? (res.newDaily ? '오늘 최고 점수!' : '오늘 최고 ' + G.dailyState().best + '🎟')
      : (res.passed ? (res.opened ? '상영관 ' + (res.hallNo + 1) + ' 이 열렸어요' : '목표 달성') : '목표 ' + res.goal + '명 — 다시 해 봐요')
        + (res.newHallBest ? ' · 새 기록!' : ' · 이 상영관 최고 ' + res.hallBest + '🎟');
    const L = [
      ['상영작', '《' + res.film + '》'],
      ['다 채운 손님', res.filled + ' / ' + res.seats + '명' + (res.mode === 'hall' ? ' (목표 ' + res.goal + ')' : '')],
      ['번 동전', res.coins + '🎟' + (res.bonus ? ' (매진 보너스 +' + res.bonus + ')' : '')],
      res.mode === 'hall' ? ['이 상영관 최고', res.newHallBest ? res.hallBest + '🎟 ★ 새 기록!' : res.hallBest + '🎟'] : ['오늘 최고', G.dailyState().best + '🎟'],
      ['가장 크게 터진 한 번', res.biggest + '알' + (res.newBig ? ' ★ 새 기록!' : ' (최고 ' + res.bestBig + '알)')],
      ['튀긴 팝콘', res.popped + '개 (캐러멜 ' + res.caramel + ')'],
      ['갈라진 알', res.splits + '번'],
      ['탄 옥수수 · 쥐구멍', res.burnt + ' · ' + res.ratted],
      ['연달아 채움', res.bestChain + '통']
    ];
    $('res-lines').innerHTML = L.map(l => '<div class="ln"><span>' + l[0] + '</span><b>' + l[1] + '</b></div>').join('');
    $('btn-ad-double').disabled = res.doubled || res.coins <= 0;
    $('btn-res-again').disabled = res.mode === 'daily';
    openOv('ov-result');
    Sfx.play(res.passed || res.mode === 'daily' ? 'win' : 'fail');
    flash(res.passed ? 'good' : 'bad');
    if (!res.passed && res.mode !== 'daily') shake(null);
    popOn($('res-title'), res.coins + '🎟', !res.passed && res.mode !== 'daily');
    burst(P.W / 2, P.H / 2, res.passed ? 'butter' : 'danger', 30);
  }
  function afterResult(go) {
    closeOv('ov-result');
    if (G.needInterstitial()) {
      openAd('광고', '잠깐 쉬어 가요.', () => { G.interstitialShown(); go(); });
    } else go();
  }

  // ---------- 게임 사건 반응 ----------
  let overT = 0, burntT = 0;
  function handle(type, d) {
    const S = G.S;
    switch (type) {
      case 'drop': Sfx.play('drop'); break;
      case 'split':
        Sfx.play(d.n === 4 ? 'quad' : 'tok');
        popAt(d.x, d.y - 8, '×' + d.n, { color: d.n === 4 ? 'fire' : 'mint', size: d.n === 4 ? C['fs-l'] : C['fs-m'] });
        burst(d.x, d.y, d.n === 4 ? 'fire' : 'mint', d.n === 4 ? 10 : 5);
        shake(null, d.n === 4 ? null : 'soft');   // 번쩍임은 그 못 빛(game.js onPeg 의 p.glow)
        break;
      case 'gold':
        Sfx.play('gold'); popAt(d.x, d.y - 8, '황금!', { color: 'gold' }); burst(d.x, d.y, 'gold', 6);
        flash('good'); shake(null, 'soft');
        break;
      case 'rat':
        Sfx.play('rat'); popAt(d.x, d.y - 8, '찍!', { color: 'danger', size: C['fs-s'] });
        flash('bad'); shake(null, 'soft'); burst(d.x, d.y, 'danger', 6);
        break;
      case 'fire': Sfx.play(d.on ? 'fire' : 'fireoff'); bump(document.querySelector('.burner[data-i="' + d.i + '"]')); Sfx.buzz(10); break;
      case 'fireFull': {
        const bn = document.querySelector('.burner[data-i="' + d.i + '"]');
        Sfx.play('block'); toast('불은 한 번에 ' + d.max + '개까지 켤 수 있어요');
        flash('bad'); shake(bn, 'soft'); popOn(bn, '최대 ' + d.max + '개', true);
        burst(P.potX(d.i), P.POT_TOP + 30, 'danger', 4);
        break;
      }
      case 'pop': {
        Sfx.play('pop');
        const x = P.potX(d.i);
        if (d.n >= 5) { popAt(x, P.POT_TOP - 16, '팡! ' + d.n, { color: 'popcorn' }); burst(x, P.POT_TOP, 'popcorn', 8); flash('good'); shake(null, 'soft'); }
        else if (Math.random() < 0.3) burst(x, P.POT_TOP, 'popcorn', 2);
        break;
      }
      case 'mega': {
        const x = P.potX(d.i);
        Sfx.play('mega'); Sfx.buzz(80);
        flash('good'); shake(null, 'hard');
        popAt(P.W / 2, 300, '대폭발!', { color: 'rainbow', size: C['fs-xxl'], life: 1.4 });
        popAt(x, P.POT_TOP - 18, d.n + '알 팡!', { color: 'fire', size: C['fs-l'], life: 1.1 });
        burst(x, P.POT_TOP, 'butter', 40);
        break;
      }
      case 'burn':
        Sfx.play('burn'); flash('bad'); shake(null, 'soft');
        popAt(P.potX(d.i), P.POT_TOP - 18, '냄비가 타요!', { color: 'danger' });
        burst(P.potX(d.i), P.POT_TOP, 'muted', 8);
        if (S && S.pots[d.i]) S.pots[d.i].bump = 1;
        break;
      case 'burnt':
        // 알마다 오므로 번쩍임·흔들림·글자는 0.5초에 한 번, 조각·냄비 통통(land 의 pot.bump)은 매번
        if (performance.now() - burntT > 500) {
          burntT = performance.now();
          popAt(P.potX(d.i), P.POT_TOP - 4, '탄 옥수수', { color: 'danger', size: C['fs-xs'] });
          flash('bad'); shake(null, 'soft');
        }
        burst(P.potX(d.i), P.POT_TOP, 'muted', 3);
        break;
      case 'overflow':
        if (performance.now() - overT > 600) {
          overT = performance.now(); Sfx.play('overflow');
          popAt(P.potX(d.i), P.POT_TOP - 8, '넘침!', { color: 'danger', size: C['fs-s'] });
          flash('bad'); shake(null, 'soft');
        }
        burst(P.potX(d.i), P.POT_TOP, 'danger', 3);
        break;
      case 'catch': Sfx.play('catch'); break;
      case 'fill': {
        Sfx.play(d.chain > 1 ? 'combo' : 'fill'); Sfx.buzz(d.tier >= 2 ? 40 : 15);
        const tier = TIER[d.tier];
        popAt(d.x, d.y - 10, '+' + d.coins + '🎟', { color: tier, size: [C['fs-m'], C['fs-l'], C['fs-xl'], C['fs-xl']][d.tier], life: 1.1 });
        if (d.chain > 1) popAt(d.x, d.y - 34, d.chain + '연속!', { color: 'mint', size: C['fs-s'] });
        burst(d.x, d.y, d.tier >= 3 ? 'rainbow' : 'butter', 10 + d.tier * 6);
        flash('good');
        shake(null, d.tier >= 2 ? null : 'soft');
        break;
      }
      case 'cornOut':
        if (d.ad && S && S.mode === 'hall') $('btn-more-corn').classList.remove('hidden');
        toast('옥수수 통이 비었어요');
        break;
      case 'adCorn': $('btn-more-corn').classList.add('hidden'); toast('옥수수 30알을 더 받았어요'); break;
      case 'tut':
        tutBanner();
        if (d.step === 0) { toast('이제 상영 시계가 돌아가요!'); Sfx.play('start'); }
        else Sfx.play('ach');
        break;
      case 'end':
        G.setHold(false);
        $('btn-more-corn').classList.add('hidden');
        $('tut').classList.add('hidden');
        setTimeout(() => showResult(d), d.soldout ? 500 : 250);
        break;
      case 'ach': Sfx.play('ach'); toast('업적: ' + d.a.name); break;
      case 'buy': case 'place': case 'unplace': case 'deco':
        Sfx.play(type === 'unplace' ? 'block' : type === 'place' ? 'place' : 'buy'); Sfx.buzz(10);
        break;
      default: break;
    }
  }

  // ---------- 화면 내용 ----------
  function refresh(id) {
    if (id === 'scr-title') refreshTitle();
    else if (id === 'scr-lobby') refreshLobby();
    else if (id === 'scr-pegs') refreshPegs();
    else if (id === 'scr-deco') refreshDeco();
    else if (id === 'scr-help') refreshHelp();
    else if (id === 'scr-settings') refreshSettings();
    else if (id === 'scr-records') refreshRecords();
  }
  function refreshTitle() {
    const d = G.Store.data, ds = G.dailyState();
    $('title-meta').textContent = (G.Store.ok ? '' : '저장이 안 되는 브라우저예요 · ') + '🎟 ' + d.coins + ' · 상영관 ' + d.hall + ' 열림';
    const b = $('btn-daily');
    b.textContent = ds.played ? '오늘의 상영 — 오늘 ' + ds.best + '🎟 (내일 또)' : '오늘의 상영 · ' + ds.mod.name;
    b.disabled = ds.played;
    buildTrailer();
  }
  function coinsTo(id) { $(id).textContent = '🎟 ' + G.Store.data.coins; }
  function refreshLobby() {
    const d = G.Store.data;
    coinsTo('lobby-coins');
    const h = D.HALLS[(d.pick || 1) - 1];
    $('lobby-hall').textContent = '상영관 ' + h.n + (h.n < d.hall ? ' ✔' : '');
    $('lobby-film').textContent = '《' + D.FILMS[(h.n - 1) % D.FILMS.length] + '》 · 손님 ' + h.tubs.length + '명 · 쥐구멍 ' + Math.max(0, h.rats - G.upTotal('rat'));
    const cnt = { S: 0, M: 0, L: 0 };
    h.tubs.split('').forEach(k => { cnt[k]++; });
    $('lobby-goal').textContent = '목표: 손님 ' + h.goal + '명 통 채우기 · 작은 통 ' + cnt.S + ' · 중간 ' + cnt.M + ' · 큰 통 ' + cnt.L;
    $('btn-hall-prev').disabled = d.pick <= 1;
    $('btn-hall-next').disabled = d.pick >= d.hall;
    const box = $('up-list');
    box.innerHTML = '';
    Object.keys(D.UPGRADES).forEach(k => {
      const u = D.UPGRADES[k], lv = d.up[k], nx = G.upNext(k);
      const now = k === 'corn' ? G.cornMax() + '알' : k === 'pot' ? '최대 ' + G.potCap() + '알' : k === 'fire' ? G.firesMax() + '개' : G.upTotal('rat') + '개 막음';
      const row = document.createElement('div');
      row.className = 'item' + (nx ? '' : ' done');
      row.innerHTML = '<div class="txt"><div class="nm">' + u.name + ' <small>' + lv + '/' + u.levels.length + '</small></div><div class="ds">지금 ' + now +
        (nx ? ' → +' + nx.add + u.unit : ' · 다 키움') + '</div></div>';
      const b = document.createElement('button');
      b.className = 'btn small'; b.id = 'up-' + k;
      b.textContent = nx ? nx.cost + '🎟' : '끝';
      b.disabled = !nx || d.coins < nx.cost;
      b.addEventListener('click', () => { if (locked) return; if (G.buyUp(k)) { popOn(b, '+' + nx.add + u.unit); bump(row); refreshLobby(); } });
      row.appendChild(b);
      box.appendChild(row);
    });
  }

  let pegSel = 'x2', pegBoard = [];
  function refreshPegs() {
    coinsTo('pegs-coins');
    const d = G.Store.data, box = $('peg-shop');
    box.innerHTML = '';
    ['x2', 'x4', 'gold'].forEach(k => {
      const pk = D.PEG_KINDS[k];
      const b = document.createElement('button');
      b.className = 'ccard' + (pegSel === k ? ' sel' : '');
      b.innerHTML = '<b>' + PEG_LABEL[k] + ' ' + pk.name + '</b>' + pk.price + '🎟 · 가진 것 ' + d.inv[k];
      b.setAttribute('aria-label', pk.name + ' 사기·고르기');
      b.addEventListener('click', () => {
        if (locked) return;
        pegSel = k;
        if (d.inv[k] === 0) { if (G.buyPeg(k)) popOn(b, '+1'); else { toast('동전이 모자라요'); Sfx.play('block'); } }
        refreshPegs();
      });
      box.appendChild(b);
    });
    $('pegs-hint').textContent = '고른 못: ' + D.PEG_KINDS[pegSel].name + ' · 판의 보통 못을 눌러 끼워요 (' + d.placed.length + '/' + G.MAX_PLACED + '). 끼운 못을 누르면 빠져요.';
    drawPegBoard();
  }
  const pcv = $('pegcv'), pcx = pcv.getContext('2d');
  const PB = { sx: 360 / (P.BR - P.BL), sy: 1.14, oy: 100 };
  function drawPegBoard() {
    if (cur !== 'scr-pegs') return;
    pegBoard = G.boardPreview();
    pcx.setTransform(1, 0, 0, 1, 0, 0);
    pcx.fillStyle = C.surface; pcx.fillRect(0, 0, pcv.width, pcv.height);
    pcx.setTransform(PB.sx, 0, 0, PB.sy, -P.BL * PB.sx, -PB.oy * PB.sy + 10);
    drawPegs(pcx, pegBoard, 0);
  }
  pcv.addEventListener('pointerdown', e => {
    if (locked || cur !== 'scr-pegs') return;
    const r = pcv.getBoundingClientRect();
    const lx = (e.clientX - r.left) / r.width * pcv.width, ly = (e.clientY - r.top) / r.height * pcv.height;
    const x = lx / PB.sx + P.BL, y = (ly - 10) / PB.sy + PB.oy;
    let bestP = null, bd = 14 * 14;
    for (const p of pegBoard) { const d2 = (p.x - x) ** 2 + (p.y - y) ** 2; if (d2 < bd) { bd = d2; bestP = p; } }
    if (!bestP) return;
    if (bestP.own) { G.removePeg(bestP.i); }
    else if (bestP.k === 'n') {
      if (!G.Store.data.inv[pegSel]) { toast('먼저 위에서 못을 사요'); Sfx.play('block'); return; }
      if (!G.placePeg(pegSel, bestP.i)) { toast('여기에는 끼울 수 없어요'); Sfx.play('block'); return; }
    } else { toast('특수 못·쥐구멍 자리는 바꿀 수 없어요'); Sfx.play('block'); return; }
    refreshPegs();
  });

  let decoKind = 'hall';
  function refreshDeco() {
    coinsTo('deco-coins');
    document.querySelectorAll('#deco-tabs .tab').forEach(t => t.classList.toggle('on', t.dataset.kind === decoKind));
    const d = G.Store.data, box = $('deco-list');
    box.innerHTML = '';
    D.DECO.filter(x => x.kind === decoKind).forEach(it => {
      const owned = d.deco.owned.indexOf(it.id) >= 0, eq = d.deco.eq[it.kind] === it.id;
      const row = document.createElement('div');
      row.className = 'item' + (eq ? ' got' : '');
      row.innerHTML = '<span class="sw" style="background:var(--' + it.color + ')"></span><div class="txt"><div class="nm">' + it.name + '</div><div class="ds">' +
        D.DECO_KINDS[it.kind] + (eq ? ' · 쓰는 중' : owned ? ' · 가짐' : '') + '</div></div>';
      const b = document.createElement('button');
      b.className = 'btn small';
      b.textContent = eq ? '쓰는 중' : owned ? '쓰기' : it.cost + '🎟';
      b.disabled = eq || (!owned && d.coins < it.cost);
      b.addEventListener('click', () => { if (locked) return; if (G.buyDeco(it.id)) { bump(row); refreshDeco(); } });
      row.appendChild(b);
      box.appendChild(row);
    });
  }
  function refreshHelp() {
    $('help-list').innerHTML = D.HELP.map(h => '<div class="help-item"><h3>' + h[0] + '</h3><p>' + h[1] + '</p></div>').join('');
  }
  function refreshSettings() {
    const box = $('set-list');
    box.innerHTML = '';
    D.SETTINGS.forEach(s => {
      const row = document.createElement('div');
      row.className = 'item';
      row.innerHTML = '<div class="txt"><div class="nm">' + s.name + '</div></div>';
      const b = document.createElement('button');
      const v = set()[s.key];
      b.className = 'btn toggle' + (v ? ' on' : '');
      b.textContent = v ? '켬' : '끔';
      b.setAttribute('aria-pressed', v ? 'true' : 'false');
      b.addEventListener('click', () => { if (locked) return; set()[s.key] = !set()[s.key]; G.Store.save(); applySettings(); Sfx.play('click'); refreshSettings(); });
      row.appendChild(b);
      box.appendChild(row);
    });
    $('wipe-confirm').classList.add('hidden');
  }
  function refreshRecords() {
    const d = G.Store.data, t = d.tot, b = d.best;
    const L = [
      ['열린 상영관', d.hall + ' / ' + D.HALLS.length], ['상영 횟수', t.shows || 0], ['채운 손님', t.filled || 0],
      ['튀긴 팝콘', t.popped || 0], ['캐러멜 팝콘', t.caramel || 0], ['대폭발', (t.mega || 0) + '번'],
      ['가장 크게 터진 한 번', (b.biggest || 0) + '알'], ['연달아 채움 최고', (b.chain || 0) + '통'], ['매진 상영', t.soldout || 0],
      ['모은 동전', t.coins || 0], ['갈라진 알', t.splits || 0], ['탄 옥수수', t.burnt || 0], ['쥐구멍', t.ratted || 0],
      ['오늘의 상영 최고', G.dailyState().best + '🎟']
    ];
    $('rec-lines').innerHTML = L.map(l => '<div class="ln"><span>' + l[0] + '</span><b>' + l[1] + '</b></div>').join('');
    $('rec-recent').innerHTML = d.recent.length ? d.recent.map(r => '<div class="ln"><span>' + (r.mode === 'daily' ? '오늘의 상영' : '상영관 ' + r.hall) +
      '</span><b>손님 ' + r.filled + '/' + r.seats + ' · ' + r.coins + '🎟 · 최대 ' + r.big + '알</b></div>').join('') : '<p class="meta">아직 없어요</p>';
    const got = D.ACHS.filter(a => d.achs[a.id]).length;
    $('ach-title').textContent = '업적 ' + got + '/' + D.ACHS.length;
    $('ach-list').innerHTML = D.ACHS.map(a => '<div class="item' + (d.achs[a.id] ? ' got' : ' done') + '"><div class="txt"><div class="nm">' + a.name +
      '</div><div class="ds">' + a.desc + '</div></div></div>').join('');
  }
  function applySettings() {
    document.body.classList.toggle('reduce', !!set().reduce);
    document.body.classList.toggle('big', !!set().big);
  }

  // ---------- 버튼 ----------
  function openSub(id) { subFrom = cur === 'scr-play' ? 'play' : cur; if (cur === 'scr-play') closeOv('ov-pause'); show(id); }
  function backFromSub() {
    if (subFrom === 'play') { show('scr-play'); openOv('ov-pause'); }
    else show(subFrom || 'scr-title');
    subFrom = null;
  }
  function bind() {
    on('btn-start', () => { G.Store.data.pick = G.Store.data.hall; show('scr-lobby'); }, 'start');
    on('btn-daily', () => { if (!G.dailyState().played) startPlay(0, 'daily'); }, 'start');
    on('btn-help', () => openSub('scr-help'));
    on('btn-settings', () => openSub('scr-settings'));
    on('btn-records', () => openSub('scr-records'));
    on('btn-help-back', backFromSub);
    on('btn-settings-back', backFromSub);
    on('btn-records-back', backFromSub);
    on('btn-lobby-back', () => show('scr-title'));
    on('btn-hall-prev', () => { G.pickHall(-1); refreshLobby(); });
    on('btn-hall-next', () => { G.pickHall(1); refreshLobby(); });
    on('btn-play', () => startPlay(G.Store.data.pick, 'hall'), 'start');
    on('btn-pegs', () => show('scr-pegs'));
    on('btn-deco', () => show('scr-deco'));
    on('btn-pegs-back', () => show('scr-lobby'));
    on('btn-deco-back', () => show('scr-lobby'));
    document.querySelectorAll('#deco-tabs .tab').forEach(t => t.addEventListener('click', () => { if (locked) return; Sfx.play('click'); decoKind = t.dataset.kind; refreshDeco(); }));
    on('btn-pause', pause);
    on('btn-resume', resume);
    on('btn-pause-help', () => openSub('scr-help'));
    on('btn-pause-settings', () => openSub('scr-settings'));
    on('btn-quit', () => { resume(); G.endShow('quit'); }, 'block');
    on('btn-tut-skip', () => G.skipTut());
    on('btn-more-corn', () => {
      G.setHold(false);
      openAd('광고 보고 옥수수 30알 더', '보고 나면 옥수수 30알을 더 받아요.', () => G.adCorn());
    });
    on('btn-ad-close', () => {
      closeOv('ov-ad'); lastT = 0;
      const f = adDone; adDone = null;
      if (f) f();
    });
    on('btn-ad-double', () => {
      const res = G.S && G.S.result;
      if (!res || res.doubled) return;
      openAd('광고 보고 동전 2배', '보고 나면 이번 동전을 한 번 더 받아요.', () => {
        if (G.adDouble(res)) { $('btn-ad-double').disabled = true; popOn($('res-title'), '+' + res.coins + '🎟'); toast('동전 2배!'); }
      });
    });
    on('btn-res-next', () => afterResult(() => { G.Store.data.pick = G.Store.data.hall; show('scr-lobby'); }));
    on('btn-res-again', () => { const n = G.S ? G.S.hallNo : 1; afterResult(() => startPlay(n, 'hall')); }, 'start');
    on('btn-tut-again', () => { G.Store.data.tutDone = false; G.Store.save(); toast('상영관 1에서 튜토리얼이 다시 나와요'); });
    on('btn-noads', () => toast('광고 제거는 준비 중이에요'));
    on('btn-wipe', () => $('wipe-confirm').classList.remove('hidden'), 'block');
    on('btn-wipe-no', () => $('wipe-confirm').classList.add('hidden'));
    on('btn-wipe-yes', () => { G.Store.wipe(); G.Store.save(); applySettings(); toast('기록을 지웠어요'); refreshSettings(); }, 'block');
    document.querySelectorAll('.burner').forEach(b => b.addEventListener('click', () => {
      if (locked || paused || !G.S) return;
      G.toggleFire(Number(b.dataset.i));
      lastHud = '';
    }));

    // 깔때기 끌기 — 누르는 동안 떨어진다
    let dragId = null;
    const toLogical = e => { const r = cv.getBoundingClientRect(); return (e.clientX - r.left) / r.width * P.W; };
    cv.addEventListener('pointerdown', e => {
      if (cur !== 'scr-play' || paused || !G.S || G.S.done) return;
      dragId = e.pointerId;
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* 붙잡기를 못 해도 끌기는 된다 */ }
      G.setFunnel(toLogical(e)); G.setHold(true);
    });
    cv.addEventListener('pointermove', e => { if (dragId === e.pointerId) G.setFunnel(toLogical(e)); });
    const up = e => { if (dragId === e.pointerId) { dragId = null; G.setHold(false); } };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);

    // 눌림 표시
    document.addEventListener('pointerdown', e => {
      const b = e.target.closest && e.target.closest('.btn, .burner, .ccard');
      if (b && !b.disabled) { b.classList.add('pressed'); setTimeout(() => b.classList.remove('pressed'), 140); }
      Sfx.unlock();
    });
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', e => { if (e.code === 'Space' && cur === 'scr-play') G.setHold(false); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', fit);
  }
  function onKey(e) {
    Sfx.unlock();
    if (locked) return;
    if (ovOpen('ov-ad')) return;
    if (cur === 'scr-play' && G.S && !G.S.done && !paused) {
      if (e.code === 'ArrowLeft') { G.moveFunnel(-12); e.preventDefault(); }
      else if (e.code === 'ArrowRight') { G.moveFunnel(12); e.preventDefault(); }
      else if (e.code === 'Space') { if (!e.repeat) G.setHold(true); e.preventDefault(); }
      else if (/^Digit[1-5]$/.test(e.code)) { G.toggleFire(Number(e.code.slice(5)) - 1); lastHud = ''; }
      else if (e.code === 'KeyP' || e.code === 'Escape') pause();
      return;
    }
    if (paused && (e.code === 'KeyP' || e.code === 'Escape')) { resume(); return; }
    if (e.code === 'Enter') {
      if (ovOpen('ov-result')) $('btn-res-next').click();
      else if (cur === 'scr-title') $('btn-start').click();
      else if (cur === 'scr-lobby') $('btn-play').click();
    }
  }

  // ---------- 시작 ----------
  readColors();
  applySettings();
  G.on(handle);
  bind();
  fit();
  $('scr-title').classList.add('in');
  refreshTitle();
  requestAnimationFrame(loop);
})();
