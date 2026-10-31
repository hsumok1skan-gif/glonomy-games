/* Popcorn Drop — 화면·그리기·입력 */
(function () {
  'use strict';
  const D = window.DATA, P = window.Phys, G = window.Game, Sfx = window.Sfx, T = window.Tree;
  const $ = id => document.getElementById(id);
  const set = () => G.Store.data.settings;

  // ---------- 색 (style.css :root 변수를 그대로 읽는다) ----------
  const C = {};
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const names = ['bg', 'surface', 'surface2', 'line', 'glow', 'butter', 'corn', 'popcorn', 'caramel', 'seat', 'mint', 'gold',
      'fire', 'pot', 'pot-dark', 'peg', 'sack', 'text', 'muted', 'danger', 'shade'];
    for (let i = 1; i <= 5; i++) names.push('hall-' + i, 'screen-' + i);
    names.forEach(k => { C[k] = (cs.getPropertyValue('--' + k) || '').trim(); });
    ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', 'icon'].forEach(k => { C['fs-' + k] = parseInt(cs.getPropertyValue('--fs-' + k), 10) || 16; });
  }
  // 큰 글자 설정이면 캔버스 글자(판·예고편·스킬 트리)도 한 단계 크게 — 16px 까지만 올려 손님 줄 띠·칸 안에 들어가게 한다
  const FS_STEP = ['xxs', 'xs', 's', 'm', 'l'];
  function bigPx(px) {
    let big = false;
    try { big = !!set().big; } catch (e) { big = false; }
    if (!big) return px;
    for (let i = 0; i < FS_STEP.length - 1; i++) if (px === C['fs-' + FS_STEP[i]]) return C['fs-' + FS_STEP[i + 1]];
    return px;
  }
  function font(px, bold) { return (bold ? '800 ' : '600 ') + bigPx(px) + 'px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif'; }
  // 무지개 = 디자인 규칙 색 6개를 돌아가며
  const RAINBOW = ['butter', 'fire', 'seat', 'glow', 'mint', 'gold'];
  function col(name, t) {
    if (name === 'rainbow') return C[RAINBOW[Math.floor(t * 10) % RAINBOW.length]];
    return C[name] || name;
  }

  // ---------- 화면 전환 ----------
  let cur = 'scr-title', locked = false, paused = false, subFrom = null, treeFrom = 'play', hallsFrom = 'scr-title';
  function lock() { locked = true; setTimeout(() => { locked = false; }, 240); }
  function show(id) {
    if (cur === id) { refresh(id); return; }
    const prev = $(cur), next = $(id);
    if (prev) prev.classList.remove('in');
    if (cur === 'scr-tree') T.hide();
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
  function relRect(el) {
    const r = el.getBoundingClientRect(), fr = frame.getBoundingClientRect();
    return { x: (r.left - fr.left) / zoom, y: (r.top - fr.top) / zoom, w: r.width / zoom, h: r.height / zoom };
  }
  function popOn(el, text, bad) {
    if (!el) return;
    const r = relRect(el);
    const p = document.createElement('div');
    p.className = 'pop' + (bad ? ' bad' : '');
    p.textContent = text;
    p.style.left = r.x + r.w / 2 + 'px';
    p.style.top = r.y + 'px';
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
  // 캔버스 위 글자·조각·날아가는 동전
  const fx = [], bits = [], coinsFly = [];
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

  // ---------- 크기 맞추기 ----------
  const cv = $('cv');
  let cx = cv.getContext('2d');      // 예고편을 그릴 때만 잠깐 다른 캔버스로 바꾼다(snap)
  let scale = 1, dpr = 1, zoom = 1, LW = P.W, LH = P.H;
  // 9:16 판을 창 안에 맞춘다. 판이 360×640 보다 작아지면(가로 844×390 등)
  // 360×640 으로 짜고 통째로 줄여(transform) 버튼·글자가 넘치지 않게 한다.
  function fit() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const fw = Math.floor(Math.min(vw, vh * 9 / 16)), fh = Math.floor(fw * 16 / 9);
    zoom = fw < P.W ? fw / P.W : 1;
    LW = zoom < 1 ? P.W : fw; LH = zoom < 1 ? P.H : fh;
    frame.style.width = LW + 'px';
    frame.style.height = LH + 'px';
    frame.style.transform = zoom < 1 ? 'scale(' + zoom + ')' : '';
    dpr = Math.min(2, window.devicePixelRatio || 1) * zoom;
    scale = LW / P.W;
    cv.width = Math.round(LW * dpr);
    cv.height = Math.round(LH * dpr);
    T.resize(LW, LH, dpr);
    placeHand();
  }

  // ---------- 그리기 ----------
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function drawBg(S) {
    const c = cx, t = S.theater;
    c.fillStyle = C['hall-' + t] || C.bg;
    c.fillRect(0, 0, P.W, P.H);
    // 위쪽 은은한 스크린 빛
    const sc = C['screen-' + t] || C.glow;
    const g = c.createRadialGradient(P.W / 2 + 30, -60, 10, P.W / 2 + 30, -60, 380);
    g.addColorStop(0, sc); g.addColorStop(1, 'transparent');
    c.globalAlpha = 0.22; c.fillStyle = g; c.fillRect(0, 0, P.W, P.H * 0.7); c.globalAlpha = 1;
    // 왼쪽 손님 줄 자리
    c.fillStyle = C.bg; c.globalAlpha = 0.4; c.fillRect(0, 46, P.QW, P.FLOOR - 46); c.globalAlpha = 1;
    // 못 판 면
    c.fillStyle = C.surface; c.globalAlpha = 0.45;
    c.fillRect(P.BL, 108, P.BR - P.BL, P.PAN_Y - 112);
    c.globalAlpha = 1;
    c.strokeStyle = C.line; c.lineWidth = 1;
    c.strokeRect(P.BL + 0.5, 108.5, P.BR - P.BL - 1, P.PAN_Y - 112);
    // 매점 바닥과 판매대
    c.fillStyle = C.surface2; c.fillRect(0, P.FLOOR, P.W, P.BIN_Y - P.FLOOR);
    c.fillStyle = C.line; c.fillRect(0, P.FLOOR, P.W, 2);
    c.fillStyle = C.bg; c.fillRect(0, P.BIN_B, P.W, P.H - P.BIN_B);
    c.font = font(C['fs-xxs']); c.fillStyle = C.muted; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('《' + S.film + '》 상영 중', (P.BL + P.BR) / 2, 116);
  }
  function drawBag(S) {
    const c = cx, x = P.PAN_X, y = P.BAG_Y;
    const pouring = S.phase === 'pour' && S.time < 1.2 && !set().reduce;
    c.save();
    c.translate(x, y);
    if (pouring) c.rotate(Math.sin(S.time * 30) * 0.05 + 0.25);
    // 자루 몸통
    c.fillStyle = C.sack;
    rr(c, -34, -8, 68, 34, 12); c.fill();
    c.fillStyle = C['pot-dark']; c.globalAlpha = 0.35; c.fillRect(-34, 8, 68, 3); c.globalAlpha = 1;
    // 자루 입구의 옥수수
    if (S.phase === 'ready') {
      c.fillStyle = C.corn;
      for (let i = -3; i <= 3; i++) { c.beginPath(); c.ellipse(i * 8, 26, 4, 3.2, 0, 0, Math.PI * 2); c.fill(); }
    }
    c.font = font(C['fs-xs'], true); c.fillStyle = C.bg; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('🌽 ' + G.pourCount() + '알', 0, 8);
    c.restore();
  }
  const PEG_LABEL = { x2: '×2', x3: '×3', gold: '★' };
  function drawPegs(c, board) {
    for (const p of board.all) {
      if (p.k === 'n') {
        c.fillStyle = C.peg; c.beginPath(); c.arc(p.x, p.y, P.PEG_R, 0, Math.PI * 2); c.fill();
        continue;
      }
      const colr = p.k === 'x2' ? C.mint : p.k === 'x3' ? C.fire : C.gold;
      const r = 7 + (p.glow || 0) * 3;
      if (p.glow > 0) { c.globalAlpha = p.glow * 0.6; c.fillStyle = colr; c.beginPath(); c.arc(p.x, p.y, r + 5, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
      c.fillStyle = colr; c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = C.bg; c.font = font(C['fs-xxs'], true); c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(PEG_LABEL[p.k], p.x, p.y + 0.5);
    }
  }
  function drawKernel(c, x, y, gold, rot) {
    c.fillStyle = gold ? C.gold : C.corn;
    c.beginPath(); c.ellipse(x, y, P.KR, P.KR * 0.8, rot || 0, 0, Math.PI * 2); c.fill();
    // 황금 옥수수는 색과 함께 가운데 점으로도 구분한다
    if (gold) { c.fillStyle = C.popcorn; c.fillRect(x - 1, y - 2, 2, 2); }
  }
  function drawKernels(S) {
    for (const k of S.world.kernels) drawKernel(cx, k.x, k.y, k.gold, k.vx * 0.01);
    for (const r of S.rollers) {
      cx.globalAlpha = Math.max(0, 1 - r.t / 0.9);
      drawKernel(cx, r.x, P.FLOOR - 4, r.gold, r.t * 12);
      cx.globalAlpha = 1;
    }
  }
  function drawPans(S, t) {
    const c = cx, w = S.world, hot = S.pending.length > 0;
    w.pans.forEach((pan, i) => {
      const x0 = pan.x - pan.w / 2, y0 = P.PAN_Y;
      // 불
      if (hot || S.phase === 'pour') {
        for (let k = 0; k < 5; k++) {
          const fh = 4 + Math.abs(Math.sin(t * 13 + k * 1.7 + i)) * (hot ? 7 : 3);
          const fx0 = x0 + 10 + k * (pan.w - 20) / 4;
          c.fillStyle = k % 2 ? C.butter : C.fire;
          c.beginPath(); c.moveTo(fx0 - 4, y0 + 30); c.lineTo(fx0, y0 + 30 - fh - 4); c.lineTo(fx0 + 4, y0 + 30); c.fill();
        }
      }
      // 손잡이 (오른쪽 팬)
      if (i === w.pans.length - 1) { c.fillStyle = C['pot-dark']; rr(c, pan.x + pan.w / 2 - 2, y0 + 6, 26, 7, 3); c.fill(); }
      // 팬 몸통
      c.fillStyle = C['pot-dark']; rr(c, x0, y0, pan.w, 18, 9); c.fill();
      c.fillStyle = C.pot; rr(c, x0 + 3, y0 + 2, pan.w - 6, 9, 5); c.fill();
      // 가장자리 받침
      if (w.rim) {
        c.fillStyle = C.butter; c.globalAlpha = 0.8;
        rr(c, x0 - w.rim, y0 - 2, w.rim, 5, 2); c.fill();
        rr(c, x0 + pan.w, y0 - 2, w.rim, 5, 2); c.fill();
        c.globalAlpha = 1;
      }
    });
    // 팬 안에서 터지기를 기다리는 알 (들썩들썩)
    for (const q of S.pending) {
      const j = set().reduce ? 0 : Math.sin(t * 30 + q.x) * 1.5;
      drawKernel(c, q.x, P.PAN_Y + 4 + j, q.gold, 0);
    }
  }
  function drawPopcorn(c, x, y, s, spin, car) {
    c.fillStyle = car ? C.caramel : C.popcorn;
    c.beginPath();
    c.arc(x, y, s, 0, Math.PI * 2);
    c.arc(x + Math.cos(spin) * s, y + Math.sin(spin) * s, s * 0.8, 0, Math.PI * 2);
    c.arc(x - Math.sin(spin) * s, y + Math.cos(spin) * s, s * 0.75, 0, Math.PI * 2);
    c.fill();
    // 캐러멜 팝콘은 색과 함께 가운데 점·글자로도 구분한다
    if (car) { c.fillStyle = C['pot-dark']; c.fillRect(x - 1, y - 1, 2, 2); }
  }
  function drawPops(S) {
    for (const p of S.pops) drawPopcorn(cx, p.x, p.y, p.car ? 4.4 : 3.4, p.spin, p.car);
  }
  function drawBin(S) {
    const c = cx, x0 = P.BL - 2, w = P.BR - P.BL + 4, y0 = P.BIN_Y, h = P.BIN_B - P.BIN_Y;
    // 담긴 팝콘 무더기
    const n = S.popcorn;
    if (n > 0) {
      const f = Math.min(1, n / 60);
      c.fillStyle = C.popcorn;
      c.beginPath(); c.ellipse(x0 + w / 2, y0 + 2, w / 2 - 6, 4 + f * 12, 0, Math.PI, 0); c.fill();
    }
    c.save();
    rr(c, x0, y0, w, h, 6); c.clip();
    c.fillStyle = C.popcorn; c.fillRect(x0, y0, w, h);
    c.fillStyle = C.seat;
    for (let k = x0; k < x0 + w; k += 16) c.fillRect(k, y0, 8, h);
    c.restore();
    c.fillStyle = C.shade; rr(c, x0 + w / 2 - 62, y0 + h / 2 - 10, 124, 20, 10); c.fill();
    c.font = font(C['fs-s'], true); c.fillStyle = C.popcorn; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('팝콘 통 ' + n + '개', x0 + w / 2, y0 + h / 2 + 1);
  }
  // 손님 줄: 맨 앞(팝콘 통 옆)이 아래, 뒤로 갈수록 위
  const Q_Y0 = 490, Q_GAP = 32, Q_SHOW = 12;
  function drawQueue(S, t) {
    const c = cx;
    c.strokeStyle = C.gold; c.globalAlpha = 0.5; c.lineWidth = 2;
    c.beginPath(); c.moveTo(P.QW - 4, Q_Y0 + 14); c.lineTo(P.QW - 4, Q_Y0 - Q_GAP * (Q_SHOW - 1) - 14); c.stroke();
    c.globalAlpha = 1;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    let hidden = 0;
    S.queue.forEach((q, i) => {
      const slot = i - S.serveIdx;
      if (q.state === 'wait') {
        q._pos = q._pos == null ? slot : q._pos + (slot - q._pos) * (set().reduce ? 1 : 0.25);
        if (q._pos >= Q_SHOW) { hidden++; return; }
        const y = Q_Y0 - q._pos * Q_GAP;
        c.font = font(C['fs-l']); c.fillStyle = C.text;
        c.fillText(q.cust.face, 20, y + 4);
        // 원하는 팝콘 수: 머리 위 말풍선 (꼬리가 얼굴을 가리킨다)
        c.fillStyle = q.vip ? C.gold : C.popcorn;
        rr(c, 30, y - 20, 34, 18, 8); c.fill();
        c.beginPath(); c.moveTo(32, y - 6); c.lineTo(28, y); c.lineTo(38, y - 4); c.fill();
        c.font = font(set().guide ? C['fs-m'] : C['fs-s'], true); c.fillStyle = C.bg;
        c.fillText('🍿' + q.want, 47, y - 10);
        if (q.vip) { c.font = font(C['fs-xxs'], true); c.fillStyle = C.gold; c.fillText('VIP', 12, y - 12); }
      } else if (q.state === 'got') {
        // 받은 손님: 웃으며 팝콘 통을 들고 오른쪽 아래로 나간다
        const k = Math.min(1, q.t / 0.6);
        if (k >= 1) return;
        const y = Q_Y0 + k * 30, x = 20 + k * 40;
        c.globalAlpha = 1 - k;
        c.font = font(C['fs-l']); c.fillStyle = C.text; c.fillText('😄', x, y);
        drawPopcorn(c, x + 14, y - 4, 3.4, t * 3, false);
        if (q.say && k < 0.8) { c.font = font(C['fs-xxs'], true); c.fillStyle = C.popcorn; c.fillText(q.say, P.QW / 2 + 6, y - 20); }
        c.globalAlpha = 1;
      } else if (q.state === 'sad') {
        // 품절: 아쉬워하며 왼쪽으로 돌아간다
        if (q._pos == null) q._pos = slot;
        const k = Math.max(0, Math.min(1, q.t / 0.9));
        if (k >= 1 || q._pos >= Q_SHOW) return;
        const y = Q_Y0 - q._pos * Q_GAP, x = 20 - k * 40;
        c.globalAlpha = 1 - k * 0.9;
        c.font = font(C['fs-l']); c.fillStyle = C.text; c.fillText('😢', x, y);
        if (q.say && k < 0.6) { c.font = font(C['fs-xxs'], true); c.fillStyle = C.danger; c.fillText(q.say, 40, y - 16); }
        c.globalAlpha = 1;
      }
    });
    const waiting = S.queue.length - S.serveIdx;
    c.font = font(C['fs-xs'], true); c.fillStyle = C.popcorn;
    c.fillText(hidden ? '+' + hidden + '명' : '줄', P.QW / 2 - 4, Q_Y0 - Q_GAP * Q_SHOW + 6);
    c.font = font(C['fs-xxs'], true); c.fillStyle = C.muted;
    c.fillText('손님 ' + Math.max(0, waiting) + '/' + S.queue.length, P.QW / 2 - 2, P.FLOOR + 8);
  }
  function drawFx(dt, t) {
    const c = cx;
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i]; b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 300 * dt;
      if (b.t > b.life) { bits.splice(i, 1); continue; }
      c.globalAlpha = 1 - b.t / b.life; c.fillStyle = col(b.color, t);
      c.fillRect(b.x - 1.5, b.y - 1.5, 3, 3);
    }
    c.globalAlpha = 1;
    // 동전이 손님에게서 위 돈 숫자로 날아간다
    for (let i = coinsFly.length - 1; i >= 0; i--) {
      const f = coinsFly[i]; f.t += dt;
      const k = Math.min(1, f.t / 0.5), e = k * k;
      const x = f.x0 + (f.x1 - f.x0) * e, y = f.y0 + (f.y1 - f.y0) * k - Math.sin(k * Math.PI) * 40;
      c.fillStyle = C.gold; c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fill();
      c.fillStyle = C.bg; c.fillRect(x - 1, y - 3, 2, 6);
      if (k >= 1) { coinsFly.splice(i, 1); shownCoins += f.v; const el = $('hud-coins'); el.classList.add('tick'); setTimeout(() => el.classList.remove('tick'), 100); Sfx.play('coin'); }
    }
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
  function drawScene(S, t) {
    drawBg(S); drawBag(S); drawPegs(cx, S.world.board); drawPans(S, t); drawKernels(S); drawBin(S); drawPops(S); drawQueue(S, t);
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
    drawScene(S, t);
    drawFx(dt, t);
    hud(S);
  }

  // ---------- 예고편 (시작 화면 필름 띠) ----------
  // game.js sandbox 로 같은 규칙의 연습 판(첫 판: 옥수수 20알, 스킬 없음)을 돌리고, 그 순간을 판 화면과 같은 그리기로 칸에 담는다.
  function snap(id, S, box, labels) {
    const el = $(id), c = el.getContext('2d'), keep = cx;
    const k = el.width / box.w, t = performance.now() / 1000;
    cx = c;
    try {
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, el.width, el.height);
      c.setTransform(k, 0, 0, k, -box.x * k, -box.y * k);
      drawScene(S, t);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      (labels || []).forEach(l => {
        c.font = font(l.size || C['fs-xl'], true);
        c.lineWidth = 4; c.strokeStyle = C.bg; c.strokeText(l.text, l.x, l.y);
        c.fillStyle = col(l.color || 'butter', 0); c.fillText(l.text, l.x, l.y);
      });
    } finally { cx = keep; }
  }
  function cap(id, head, line) { $(id).innerHTML = '<b>' + head + '</b>' + line; }
  let trailerDone = false;
  function buildTrailer() {
    if (trailerDone) return;
    trailerDone = true;
    try {
      G.sandbox(() => {
        const S = G.newRound();
        const step = (cond, sec) => { for (let i = 0; i < sec * 60 && !cond(); i++) G.update(1 / 60); return cond(); };
        G.pour();
        // ① 쏟아붓기: 위쪽 폭 전체에 흩어져 떨어지는 옥수수
        step(() => S.time > 0.42, 2);
        const xs = S.world.kernels.map(k => k.x);
        const spread = xs.length ? Math.round(Math.max.apply(null, xs) - Math.min.apply(null, xs)) : 0;
        snap('tr-pour', S, { x: 62, y: 30, w: 296, h: 370 });
        cap('tc-pour', '쏟아붓기 한 번', S.world.poured + '알 · 폭 ' + spread + 'px');
        // ② 프라이팬: 팬 안 알은 팡! 팝콘, 밖으로 떨어진 알은 굴러 사라진다
        step(() => (S.pops.length >= 3 && S.rollers.length >= 1) || S.phase !== 'pour', 8);
        snap('tr-pan', S, { x: 66, y: 290, w: 280, h: 350 }, S.pops.length ? [{ x: S.pops[0].x, y: S.pops[0].y - 22, text: '팡!', color: 'butter', size: C['fs-l'] }] : []);
        step(() => S.phase !== 'pour', 10);
        cap('tc-pan', '팬 안만 팝콘', '팬 ' + S.world.caught + ' · 밖 ' + S.world.missed + '알 → 팝콘 ' + S.made + '개');
        // ③ 손님: 맨 앞부터 받아 가고, 모자라면 팝콘 품절!
        step(() => S.soldOut || S.sellout, 15);
        step(() => S.endT < 0.75 || S.done, 2);
        snap('tr-serve', S, { x: 0, y: 236, w: 248, h: 310 }, S.soldOut ? [{ x: 150, y: 330, text: '팝콘 품절!', color: 'danger', size: C['fs-xl'] }] : []);
        cap('tc-serve', S.soldOut ? '팝콘 품절!' : '매진!', '손님 ' + S.served + '/' + S.queue.length + '명 받음');
        // ④ 스킬 트리: 이어진 칸만 산다 → 산 칸의 효과가 다음 판에 바로 보인다(옥수수 +5 → 다음 판 25알)
        step(() => S.done, 3);
        const before = G.pourCount();
        const farLocked = !G.canBuy('corn_M2');   // 시작 칸과 이어지지 않은 칸은 아직 못 산다
        const d = G.Store.data, need = G.costOf('corn_M1');
        if (d.coins < need) d.coins = need;       // 첫 판에서 번 돈이 모자라면 연습 판에만 채운다
        const bought = G.buy('corn_M1') && G.next();
        const S2 = G.S, after = G.pourCount();
        snap('tr-buy', S2, { x: P.PAN_X - 64, y: 22, w: 128, h: 160 }, bought ? [
          { x: P.PAN_X, y: 104, text: after + '알!', color: 'butter', size: C['fs-xl'] },
          { x: P.PAN_X, y: 138, text: '🌽 +5 산 다음 판', color: 'popcorn', size: C['fs-s'] }
        ] : []);
        cap('tc-buy', bought ? '옥수수 +5 사면' : '스킬 사기', (bought ? '다음 판 ' + before + '→' + after + '알' : '사지 못함') + (farLocked ? ' · 먼 칸 잠김' : ''));
      });
      const gr = G.growth();
      $('tr-grow').textContent = '같은 규칙으로 60번씩: 첫 판 평균 팝콘 ' + gr.base.toFixed(1) + '개 → 스킬 10칸 뒤 ' + gr.ten.toFixed(1) + '개 (×' + gr.ratio.toFixed(1) + ')';
    } catch (e) {
      $('trailer').classList.add('hidden');   // 예고편을 못 그려도 시작 화면은 그대로 쓴다
      $('tr-grow').classList.add('hidden');
    }
  }

  // ---------- 위 정보 ----------
  let shownPop = 0, shownCoins = 0, lastHud = '';
  function coinTarget(S) { return G.Store.data.coins + (S && !S.done ? S.coins : 0); }
  function hud(S) {
    if (shownPop < S.made) {
      shownPop = Math.min(S.made, shownPop + Math.max(1, Math.ceil((S.made - shownPop) / 6)));
      const k = $('hud-pop'); k.classList.add('tick'); setTimeout(() => k.classList.remove('tick'), 90);
      Sfx.play('tick');
    } else if (shownPop > S.made) shownPop = S.made;
    const ct = coinTarget(S);
    if (!coinsFly.length && shownCoins !== ct) shownCoins = ct;
    const key = [S.round, S.theater, shownPop, shownCoins, S.target, S.phase, S.tut, G.Store.data.streak, G.canAdCorn(), G.Store.data.theaters, !!S.daily].join('|');
    if (key === lastHud) return;
    lastHud = key;
    $('hud-round').textContent = S.daily ? '오늘 도전' : S.round + '판';
    $('hud-hall').textContent = (D.THEATERS[S.theater - 1] || D.THEATERS[0]).n + '관';
    $('hud-pop').textContent = '팝콘 ' + shownPop + '개';
    const gl = $('hud-goal'), streak = S.daily ? 0 : G.Store.data.streak || 0;
    gl.textContent = '목표 팝콘 ' + S.target + '개' + (streak ? ' · 연속 ' + streak : '');
    gl.classList.toggle('hit', S.made >= S.target);
    $('hud-coins').textContent = '🎟 ' + shownCoins;
    const ready = S.phase === 'ready', tut = S.tut;
    const pour = $('btn-pour');
    pour.disabled = !ready;
    pour.textContent = ready ? '쏟아붓기!' : S.phase === 'pour' ? '팡팡…' : S.phase === 'serve' ? '나눠 주는 중' : '결과';
    pour.classList.toggle('glow-btn', ready && tut === 1);
    // 오늘의 도전은 날짜로 정해진 스킬·상영관 그대로 한다(트리·상영관 바꾸기 없음)
    $('btn-play-tree').disabled = !ready || tut === 1 || !!S.daily;
    $('btn-play-halls').disabled = !ready || tut === 1 || !!S.daily;
    $('btn-play-halls').classList.toggle('hidden', G.Store.data.theaters < 2 || !!S.daily);
    const ad = $('btn-adcorn');
    ad.classList.toggle('hidden', !G.canAdCorn() && !(ready && S.double));
    ad.disabled = !G.canAdCorn() || tut === 1;
  }

  // ---------- 고리 ----------
  let acc = 0, lastT = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (G.testMode) return;
    const dt = Math.min(0.1, lastT ? (now - lastT) / 1000 : 0);
    lastT = now;
    if (document.hidden) return;
    if (cur === 'scr-tree') { T.tick(now); return; }   // 스킬 트리도 이 고리 하나로 그린다
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

  // ---------- 판 ----------
  function enterPlay() {
    if (!G.S) { G.newRound(); resetFx(); }
    paused = false; closeOv('ov-pause');
    show('scr-play');
    tutBanner();
    if (G.S.phase === 'result' && G.S.result) showResult(G.S.result, true);
  }
  function resetFx() {
    fx.length = 0; bits.length = 0; coinsFly.length = 0; shownPop = 0; lastHud = '';
    shownCoins = coinTarget(G.S);
  }
  function pourNow() {
    const S = G.S;
    if (!S || S.phase !== 'ready' || paused) return;
    if (G.pour()) { Sfx.buzz(25); lastHud = ''; }
  }
  function pause() {
    if (cur !== 'scr-play' || !G.S || paused || ovOpen('ov-result') || ovOpen('ov-ad')) return;
    paused = true; openOv('ov-pause');
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

  function showResult(res, again) {
    const dly = !!res.daily;
    $('res-title').textContent = (dly ? '오늘의 도전 — ' : '') + (res.sellout ? '매진!' : '팝콘 품절!');
    const S = G.S;
    $('res-sub').textContent = S && S.tut === 4 ? '‘스킬 트리’를 눌러 첫 칸을 사 봐요'
      : S && S.tut === 6 ? '이제 ‘다음 판’을 눌러요'
      : dly ? res.daily + ' 도전 · 목표 ' + res.target + '개 ' + (res.hit ? '달성!' : '못 채움') + ' · 내일 새 판이 열려요'
      : (res.hit ? '목표 팝콘 ' + res.target + '개 달성! 연속 ' + res.streak + '판' : '목표 ' + res.target + '개에 ' + (res.target - res.made) + '개 모자랐어요 (벌칙 없음)')
        + (res.newBest ? ' · 한 판 최고 기록!' : '');
    const L = [
      ['상영작', '《' + res.film + '》'],
      ['쏟은 옥수수', res.base + '알' + (res.poured > res.base ? ' → 갈라져 ' + res.poured + '알' : '')],
      ['만든 팝콘', res.made + '개 (팬 ' + res.caught + '알 · 밖 ' + res.missed + '알)'],
      ['받은 손님', res.served + ' / ' + res.queue + '명'],
      ['번 돈', res.coins + '🎟' + (res.bonus ? ' · 판 끝 +' + res.bonus : '') + (res.soldBonus ? ' · 매진 +' + res.soldBonus : '')],
      ['합계', res.total + '🎟' + (res.doubled ? ' ×2' : '')],
      ['남은 팝콘', res.leftover + '개'],
      [dly ? '도전 최고' : '한 판 최고', Math.max(res.bestRound || 0, res.made) + '개' + (res.newBest ? ' · 새 기록!' : '')],
      dly ? ['스킬·상영관', '날짜로 정한 ' + (S && S.daily ? S.daily.nodes : 0) + '칸 · ' + res.theater + '관'] : ['목표 최고 연속', (G.Store.data.best.streak || 0) + '판']
    ];
    $('res-lines').innerHTML = L.map(l => '<div class="ln"><span>' + l[0] + '</span><b>' + l[1] + '</b></div>').join('');
    const sb = $('res-share');
    sb.value = shareText(res);
    sb.classList.add('hidden');
    $('btn-ad-double').disabled = res.doubled || res.total <= 0 || dly;
    $('btn-ad-double').classList.toggle('hidden', dly);
    $('btn-res-tree').classList.toggle('hidden', dly);
    $('btn-res-next').textContent = dly ? '평소 판으로' : '다음 판';
    $('btn-res-tree').classList.toggle('glow-btn', !!S && S.tut === 4);
    $('btn-res-next').classList.toggle('glow-btn', !!S && S.tut === 6);
    openOv('ov-result');
    placeHand();
    if (again) return;
    Sfx.play(res.sellout ? 'sellout' : res.hit ? 'win' : 'fail');
    flash(res.sellout || res.hit ? 'good' : 'bad');
    if (!res.hit) shake(null, 'soft');
    popOn($('res-title'), '+' + res.total + '🎟', !res.hit);
    burst((P.BL + P.BR) / 2, P.BIN_Y, res.sellout ? 'rainbow' : res.hit ? 'butter' : 'danger', res.sellout ? 40 : 24);
  }
  // ---------- 결과 공유 문구 (G-27) ----------
  function shareText(res) {
    const head = '🍿 Popcorn Drop ' + (res.daily ? '오늘의 도전 ' + res.daily : res.round + '판') + ' — ' + (res.sellout ? '매진!' : '팝콘 품절!');
    const body = '팝콘 ' + res.made + '개 · 손님 ' + res.served + '/' + res.queue + '명 · ' + res.total + '🎟' +
      ' · 목표 ' + res.target + '개 ' + (res.hit ? '달성' : '못 채움') + (!res.daily && res.hit ? ' (연속 ' + res.streak + '판)' : '');
    return head + '\n' + body + (res.newBest ? '\n한 판 최고 기록!' : '');
  }
  // 클립보드 → execCommand('copy') 순으로 해 보고, 둘 다 막히면 글 상자를 열어 골라 둔다
  function copyResult() {
    const res = G.S && G.S.result, sb = $('res-share');
    if (!res) return;
    const text = shareText(res);
    sb.value = text;
    const done = () => { sb.classList.add('hidden'); toast('결과 문구를 복사했어요'); bump($('btn-res-copy')); };
    const fallback = () => {
      sb.classList.remove('hidden');
      sb.focus(); sb.select();
      let ok = false;
      try { ok = document.execCommand && document.execCommand('copy'); } catch (e) { ok = false; }
      if (ok) toast('결과 문구를 복사했어요');
      else toast('복사가 막혀 있어요 · 글 상자를 길게 눌러 복사해요');
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
    } catch (e) { fallback(); }
  }

  // ---------- 오늘의 도전 ----------
  function startDaily() {
    if (!G.startDaily()) { toast('오늘의 도전은 이미 했어요 · 내일 새 판이 열려요'); refreshTitle(); return; }
    const info = G.dailyInfo();
    paused = false; closeOv('ov-pause');
    resetFx();
    show('scr-play');
    tutBanner();
    toast('오늘의 도전 · ' + info.day + ' · 스킬 ' + info.nodes + '칸 · ' + info.theater + '관 · 한 번만!');
  }
  // 도전 판을 닫고 보통 판으로 (쏟는 중이면 게임이 끝까지 돌려 결과를 남긴다)
  function leaveDaily() {
    if (!G.S || !G.S.daily) return false;
    G.endDaily();
    resetFx();
    return true;
  }

  function nextRound() {
    closeOv('ov-result');
    if (G.S && G.S.daily) {
      leaveDaily();
      if (!G.S) { G.newRound(); resetFx(); }
      tutBanner(); lastHud = '';
      if (G.S.phase === 'result' && G.S.result) showResult(G.S.result, true);
      return;
    }
    const go = () => { G.next(); resetFx(); tutBanner(); lastHud = ''; };
    if (G.needInterstitial()) openAd('광고', '잠깐 쉬어 가요.', () => { G.interstitialShown(); go(); });
    else go();
  }

  // ---------- 스킬 트리 ----------
  function openTree(from) {
    treeFrom = from;
    closeOv('ov-result');
    show('scr-tree');
    T.show();
    if (G.S && G.S.tut === 4) { G.tutEvent('tree'); }
    if (G.S && G.S.tut >= 5) T.centerOn('start', 1);
    treeHint();
    placeHand();
  }
  function closeTree() {
    closeOv('ov-node');
    if (treeFrom === 'title') { show('scr-title'); return; }
    show('scr-play');
    if (treeFrom === 'result' && G.S && G.S.result) showResult(G.S.result, true);
    tutBanner();
  }
  function treeHint() {
    const S = G.S;
    $('tree-coins').textContent = '🎟 ' + G.Store.data.coins;
    let txt = '밝은 칸을 눌러 사요 · 끌어서 움직이고 두 손가락으로 확대';
    if (S && S.tut === 5) txt = S.tutNode ? '‘' + D.SKILL[S.tutNode].name + '’ 칸을 눌러 사요' : '동전이 모자라요 · ◀ 닫고 다음 판에 사요';
    else if (S && S.tut === 6) txt = '다음 판엔 ' + G.stats().corn + '알! ◀ 닫고 ‘다음 판’을 눌러요';
    $('tree-hint').textContent = txt;
  }
  let nodeSel = null;
  function openNode(id) {
    const n = D.SKILL[id];
    if (!n) return;
    nodeSel = id;
    const st = id === 'start' ? 'owned' : G.nodeState(id);
    $('node-icon').textContent = n.icon;
    $('node-name').textContent = n.name;
    $('node-desc').textContent = D.descOf(n);
    const cost = id === 'start' ? 0 : G.costOf(id);
    $('node-cost').textContent = st === 'owned' ? '✔ 이미 샀어요' : st === 'far' ? '🔒 이어진 칸을 먼저 사요 · ' + cost + '🎟' : cost + '🎟' + (st === 'near' ? ' (동전이 모자라요)' : '');
    const b = $('btn-node-buy');
    b.disabled = st !== 'buy';
    b.textContent = st === 'owned' ? '샀어요' : '사기';
    b.classList.toggle('glow-btn', !!G.S && G.S.tut === 5 && id === G.S.tutNode);
    openOv('ov-node');
    placeHand();
  }
  function buyNode() {
    const id = nodeSel;
    if (!id) return;
    if (!G.buy(id)) { Sfx.play('block'); toast(G.canBuy(id) ? '동전이 모자라요' : '이어진 칸을 먼저 사요'); return; }
    closeOv('ov-node');
    T.draw(); treeHint(); placeHand();
  }

  // ---------- 처음 하는 사람: 한 줄 안내와 손가락 ----------
  function tutBanner() {
    const S = G.S, el = $('tut');
    if (!S || !S.tut || S.tut >= 4) { el.classList.add('hidden'); placeHand(); return; }
    el.classList.remove('hidden');
    const text = ['', '‘쏟아붓기!’를 눌러요', '프라이팬에 떨어진 옥수수만 팡! 팝콘이 돼요', S.soldOut ? '팝콘이 모자라면 품절! 남은 손님은 돌아가요' : '맨 앞 손님부터 팝콘을 받아 가요'][S.tut] || '';
    $('tut-text').textContent = text;
    bump(el);
    placeHand();
  }
  function placeHand() {
    const h = $('hand'), S = G.S;
    let target = null, pt = null;
    if (S && S.tut) {
      if (S.tut === 1 && cur === 'scr-play') target = $('btn-pour');
      else if (S.tut === 4 && ovOpen('ov-result')) target = $('btn-res-tree');
      else if (S.tut === 5 && cur === 'scr-tree') {
        if (ovOpen('ov-node')) target = $('btn-node-buy');
        else if (S.tutNode) pt = T.screenPos(S.tutNode);
      } else if (S.tut === 6) {
        if (cur === 'scr-tree') target = $('btn-tree-back');
        else if (ovOpen('ov-result')) target = $('btn-res-next');
      }
    }
    if (target) { const r = relRect(target); pt = { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
    if (!pt) { h.classList.add('hidden'); return; }
    h.classList.remove('hidden');
    h.style.left = pt.x + 'px'; h.style.top = pt.y + 'px';
  }

  // ---------- 게임 사건 반응 ----------
  let missT = 0, popT = 0;
  function handle(type, d) {
    const S = G.S;
    switch (type) {
      case 'pour':
        Sfx.play('pour'); shake(null, 'soft'); flash('good');
        popAt(P.PAN_X, P.BAG_Y + 30, '쏟아붓기! ' + d.n + '알', { color: 'butter', size: C['fs-l'] });
        burst(P.PAN_X, P.BAG_Y + 20, 'corn', 14);
        bump($('btn-pour'));
        break;
      case 'repour':
        Sfx.play('repour'); flash('good'); shake(null, 'soft');
        popAt(P.PAN_X, P.BAG_Y + 30, '다시 쏟기! ' + d.n + '알', { color: 'mint', size: C['fs-l'] });
        burst(P.PAN_X, P.BAG_Y + 20, 'mint', 10);
        break;
      case 'split':
        Sfx.play(d.n === 3 ? 'triple' : 'tok');
        popAt(d.x, d.y - 8, '톡! ×' + d.n, { color: d.n === 3 ? 'fire' : 'mint', size: d.n === 3 ? C['fs-l'] : C['fs-m'] });
        burst(d.x, d.y, d.n === 3 ? 'fire' : 'mint', d.n === 3 ? 8 : 5);
        shake(null, 'soft');                  // 번쩍임은 그 못 빛(game.js onPeg 의 p.glow)
        break;
      case 'gold':
        Sfx.play('gold'); popAt(d.x, d.y - 8, '황금!', { color: 'gold' }); burst(d.x, d.y, 'gold', 6);
        flash('good'); shake(null, 'soft');
        break;
      case 'land':
        Sfx.play(d.rim ? 'rim' : 'land');
        if (d.rim) { popAt(d.x, P.PAN_Y - 10, '받침!', { color: 'butter', size: C['fs-xs'] }); burst(d.x, P.PAN_Y, 'butter', 3); }
        break;
      case 'miss':
        // 알마다 오므로 번쩍임·흔들림·글자는 0.5초에 한 번, 조각은 매번
        Sfx.play('miss');
        burst(d.x, P.FLOOR - 4, 'muted', 2);
        if (performance.now() - missT > 500) {
          missT = performance.now();
          popAt(d.x, P.FLOOR - 14, '데구루루', { color: 'muted', size: C['fs-xxs'] });
          flash('bad'); shake(null, 'soft');
        }
        break;
      case 'pop':
        // 알마다 오므로 번쩍임·흔들림은 0.5초에 한 번, 글자·조각은 매번
        Sfx.play('pop');
        popAt(d.x, P.PAN_Y - 14, d.car ? '캐러멜 팡!' : '팡!', { color: d.car ? 'caramel' : 'popcorn', size: d.car ? C['fs-m'] : C['fs-s'], life: 0.6 });
        burst(d.x, P.PAN_Y, d.car ? 'caramel' : 'popcorn', 3);
        if (performance.now() - popT > 500) { popT = performance.now(); flash('good'); shake(null, 'soft'); }
        break;
      case 'bin': break;
      case 'serveStart':
        if (S && S.tut) tutBanner();
        popAt(P.QW + 40, P.BIN_Y - 30, '팝콘 ' + d.made + '개 완성!', { color: 'butter', size: C['fs-l'], life: 1.1 });
        flash('good'); shake(null, 'soft'); burst((P.BL + P.BR) / 2, P.BIN_Y, 'popcorn', 16);
        break;
      case 'serve': {
        Sfx.play('serve'); Sfx.buzz(8);
        const y = Q_Y0;
        popAt(48, y - 24, '+' + d.coins + '🎟' + (d.tip ? ' 팁!' : ''), { color: d.vip ? 'rainbow' : d.tip ? 'mint' : 'butter', size: d.vip ? C['fs-l'] : C['fs-m'] });
        burst(30, y, d.vip ? 'gold' : 'butter', d.vip ? 14 : 6);
        flash('good');
        shake(null, 'soft');
        const r = relRect($('hud-coins'));
        coinsFly.push({ x0: 30, y0: y, x1: r.x / scale + r.w / scale / 2, y1: r.y / scale + r.h / scale / 2, t: 0, v: d.coins });
        break;
      }
      case 'soldout':
        Sfx.play('soldout'); Sfx.buzz(60);
        flash('bad'); shake(null, null);
        popAt(P.W / 2, 300, '팝콘 품절!', { color: 'danger', size: C['fs-xxl'], life: 1.4 });
        popAt(P.W / 2, 340, '손님 ' + d.left + '명이 돌아가요', { color: 'popcorn', size: C['fs-s'], life: 1.3 });
        burst(36, Q_Y0, 'danger', 12);
        if (S && S.tut) tutBanner();
        break;
      case 'sellout':
        Sfx.play('sellout'); Sfx.buzz(80);
        flash('good'); shake(null, 'hard');
        popAt(P.W / 2, 300, '매진!', { color: 'rainbow', size: C['fs-icon'], life: 1.4 });
        burst(P.W / 2, 300, 'rainbow', 40);
        break;
      case 'end':
        $('tut').classList.add('hidden');
        setTimeout(() => { if (G.S && G.S.result === d) showResult(d); }, 280);
        break;
      case 'adCorn': toast('이번 판은 옥수수 ' + d.n + '알을 쏟아요!'); lastHud = ''; break;
      case 'buy': {
        const n = D.SKILL[d.id];
        Sfx.play(d.opened ? 'key' : 'buy'); Sfx.buzz(d.opened ? 60 : 15);
        flash('good');
        shake(null, d.opened ? 'hard' : 'soft');
        if (d.opened) toast('🔑 ' + D.THEATERS[d.opened - 1].name + ' 이 열렸어요!');
        else toast(n.icon + ' ' + n.name + ' — 다음 판에 바로 보여요');
        if (cur === 'scr-tree') {
          T.draw(); treeHint();
          const tc = $('tree-coins');
          popOn(tc, '−' + d.cost + '🎟'); bump(tc);
          T.ringAt(d.id);                     // 산 칸에서 금빛 고리가 퍼진다(0.45초)
        }
        break;
      }
      case 'tut':
        if (d.step === 0) toast('안내를 건너뛰었어요 · 설정에서 다시 볼 수 있어요');
        else Sfx.play('ach');
        tutBanner();
        if (cur === 'scr-tree') treeHint();
        if (ovOpen('ov-result') && G.S && G.S.result) showResult(G.S.result, true);
        break;
      case 'ach': Sfx.play('ach'); toast('업적: ' + d.a.name); break;
      case 'round': lastHud = ''; break;
      default: break;
    }
  }

  // ---------- 화면 내용 ----------
  function refresh(id) {
    if (id === 'scr-title') refreshTitle();
    else if (id === 'scr-halls') refreshHalls();
    else if (id === 'scr-help') refreshHelp();
    else if (id === 'scr-settings') refreshSettings();
    else if (id === 'scr-records') refreshRecords();
    else if (id === 'scr-tree') treeHint();
  }
  function refreshTitle() {
    const d = G.Store.data;
    $('title-meta').textContent = (G.Store.ok ? '' : '저장이 안 되는 브라우저예요 · ') + '🎟 ' + d.coins + ' · ' + d.round + '판째 · 상영관 ' + d.theaters + '개 열림';
    $('btn-start').textContent = d.round > 1 || (G.S && G.S.phase !== 'ready') ? '이어서 하기' : '매점 열기';
    $('btn-title-halls').disabled = d.theaters < 2;
    // 오늘의 도전: 하루 한 번. 했으면 그날 결과를 보여 주고 단추를 잠근다
    const di = G.dailyInfo(), db = $('btn-daily');
    db.disabled = di.done;
    db.textContent = di.done ? '도전 ✔' : '오늘 도전';
    db.setAttribute('aria-label', di.done
      ? '오늘의 도전 끝 — ' + (di.last && di.last.done ? '팝콘 ' + di.last.made + '개' : '중간에 그만둠') + ', 내일 새 판'
      : '오늘의 도전 — 날짜로 정한 같은 판, 하루 한 번');
    if (di.done) $('title-meta').textContent += ' · 오늘 도전 ' + (di.last && di.last.done ? di.last.made + '개' : '그만둠');
    buildTrailer();
  }
  function refreshHalls() {
    const d = G.Store.data, box = $('hall-list');
    box.innerHTML = '';
    D.THEATERS.forEach(th => {
      const open = th.n <= d.theaters, curH = d.theater === th.n;
      const row = document.createElement('div');
      row.className = 'item' + (curH ? ' got' : open ? '' : ' done');
      row.innerHTML = '<span class="sw" style="background:var(--hall-' + th.n + ');border-color:var(--screen-' + th.n + ')"></span><div class="txt"><div class="nm">' + th.name +
        '</div><div class="ds">' + (open ? '손님 ' + D.CUSTOMERS.filter(c => c.hall === th.n).map(c => c.face).join('') + ' · 값 ×' + th.pay + ' · 줄 +' + th.extra : '🔑 스킬 트리 귀퉁이의 열쇠로 열어요') + '</div></div>';
      const b = document.createElement('button');
      b.className = 'btn small';
      b.textContent = curH ? '여기' : open ? '고르기' : '잠김';
      b.disabled = !open || curH;
      b.setAttribute('aria-label', th.name + ' ' + b.textContent);
      b.addEventListener('click', () => {
        if (locked) return;
        Sfx.play('click');
        G.setTheater(th.n);
        toast(th.name + (G.S && G.S.phase === 'ready' ? ' — 이번 판부터' : ' — 다음 판부터'));
        refreshHalls();
      });
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
      b.setAttribute('aria-label', s.name + ' ' + (v ? '켬' : '끔'));
      b.addEventListener('click', () => { if (locked) return; set()[s.key] = !set()[s.key]; if (s.key === 'reduce') set().reduceSet = true; G.Store.save(); applySettings(); Sfx.play('click'); refreshSettings(); });
      row.appendChild(b);
      box.appendChild(row);
    });
    $('wipe-confirm').classList.add('hidden');
  }
  function refreshRecords() {
    const d = G.Store.data, t = d.tot, b = d.best;
    const L = [
      ['한 판 수', t.rounds || 0], ['만든 팝콘', t.popcorn || 0], ['받은 손님', t.served || 0], ['매진', t.sellouts || 0],
      ['갈라진 알', t.splits || 0], ['캐러멜 팝콘', t.caramel || 0], ['모은 동전', t.coins || 0], ['산 스킬 칸', (t.nodes || 0) + ' / ' + (D.SKILLS.length - 1)],
      ['연 상영관', d.theaters + ' / ' + D.THEATERS.length], ['팁', t.tips || 0], ['VIP 손님', t.vips || 0],
      ['한 판 최고 팝콘', (b.round || 0) + '개'], ['목표 최고 연속', (b.streak || 0) + '판'], ['지금 연속', (d.streak || 0) + '판'],
      ['오늘의 도전', (t.dailies || 0) + '번 · 최고 ' + (b.daily || 0) + '개']
    ];
    $('rec-lines').innerHTML = L.map(l => '<div class="ln"><span>' + l[0] + '</span><b>' + l[1] + '</b></div>').join('');
    $('rec-recent').innerHTML = d.recent.length ? d.recent.map(r => '<div class="ln"><span>' + r.round + '판 · ' + r.t + '관</span><b>팝콘 ' + r.made +
      ' · 손님 ' + r.served + '/' + r.queue + ' · ' + r.coins + '🎟' + (r.hit ? ' ✔' : '') + '</b></div>').join('') : '<p class="meta">아직 없어요</p>';
    const got = D.ACHS.filter(a => d.achs[a.id]).length;
    $('ach-title').textContent = '업적 ' + got + '/' + D.ACHS.length;
    $('ach-list').innerHTML = D.ACHS.map(a => '<div class="item' + (d.achs[a.id] ? ' got' : ' done') + '"><div class="txt"><div class="nm">' + a.name +
      '</div><div class="ds">' + a.desc + '</div></div></div>').join('');
  }
  // 기기에서 '동작 줄이기'(prefers-reduced-motion)를 켰으면, 사람이 설정에서 직접 바꾸기 전까지 움직임 줄이기를 따라 켠다 (G-25)
  const reduceMq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function followReduceMq() {
    if (reduceMq && !set().reduceSet) set().reduce = reduceMq.matches;
    applySettings();
    if (cur === 'scr-settings') refreshSettings();
  }
  function applySettings() {
    document.body.classList.toggle('reduce', !!set().reduce);
    document.body.classList.toggle('big', !!set().big);
  }

  // ---------- 버튼 ----------
  function openSub(id) {
    subFrom = cur === 'scr-play' ? 'play' : cur;
    if (cur === 'scr-play') closeOv('ov-pause');
    show(id);
  }
  function backFromSub() {
    if (subFrom === 'play') { show('scr-play'); if (G.S && !G.S.done) { paused = true; openOv('ov-pause'); } }
    else show(subFrom || 'scr-title');
    subFrom = null;
  }
  function bind() {
    on('btn-start', enterPlay, 'start');
    on('btn-title-tree', () => { if (!G.S) G.newRound(); openTree('title'); });
    on('btn-title-halls', () => { hallsFrom = 'scr-title'; show('scr-halls'); });
    on('btn-daily', startDaily, 'start');
    on('btn-help', () => openSub('scr-help'));
    on('btn-settings', () => openSub('scr-settings'));
    on('btn-records', () => openSub('scr-records'));
    on('btn-help-back', backFromSub);
    on('btn-settings-back', backFromSub);
    on('btn-records-back', backFromSub);
    on('btn-halls-back', () => { if (hallsFrom === 'scr-play') { show('scr-play'); lastHud = ''; } else show('scr-title'); });
    on('btn-pour', pourNow, 'start');
    on('btn-play-tree', () => { if (G.S && G.S.phase === 'ready' && !G.S.daily) openTree('play'); });
    on('btn-play-halls', () => { if (G.S && G.S.daily) return; hallsFrom = 'scr-play'; show('scr-halls'); });
    on('btn-adcorn', () => {
      if (!G.canAdCorn()) return;
      openAd('광고 보고 두 배로 쏟기', '보고 나면 이번 판 옥수수를 두 배로 쏟아요(하루 한 번).', () => G.adCorn());
    });
    on('btn-pause', pause);
    on('btn-resume', resume);
    on('btn-pause-help', () => openSub('scr-help'));
    on('btn-pause-settings', () => openSub('scr-settings'));
    on('btn-pause-home', () => {
      paused = false; closeOv('ov-pause');
      if (leaveDaily()) toast('오늘의 도전 결과를 남겼어요');
      show('scr-title');
    }, 'block');
    on('btn-tut-skip', () => G.skipTut());
    on('btn-tree-back', closeTree);
    on('btn-zoom-in', () => T.zoomBy(1.25));
    on('btn-zoom-out', () => T.zoomBy(0.8));
    on('btn-zoom-fit', () => T.fitAll());
    on('btn-node-buy', buyNode);
    on('btn-node-close', () => { closeOv('ov-node'); placeHand(); });
    on('btn-ad-close', () => {
      closeOv('ov-ad'); lastT = 0;
      const f = adDone; adDone = null;
      if (f) f();
    });
    on('btn-ad-double', () => {
      const res = G.S && G.S.result;
      if (!res || res.doubled || res.daily) return;
      openAd('광고 보고 돈 2배', '보고 나면 이번 판 동전을 한 번 더 받아요.', () => {
        if (G.adDouble(res)) { $('btn-ad-double').disabled = true; popOn($('res-title'), '+' + res.total + '🎟'); toast('돈 2배!'); showResult(res, true); }
      });
    });
    on('btn-res-tree', () => { if (!(G.S && G.S.daily)) openTree('result'); });
    on('btn-res-next', nextRound, 'start');
    on('btn-res-home', () => { closeOv('ov-result'); leaveDaily(); show('scr-title'); }, 'block');
    on('btn-res-copy', copyResult);
    on('btn-tut-again', () => { G.Store.data.tutDone = false; G.Store.save(); toast('다음 판에 처음 안내가 다시 나와요'); });
    on('btn-noads', () => toast('광고 제거는 준비 중이에요'));
    on('btn-wipe', () => $('wipe-confirm').classList.remove('hidden'), 'block');
    on('btn-wipe-no', () => $('wipe-confirm').classList.add('hidden'));
    on('btn-wipe-yes', () => {
      G.Store.wipe(); followReduceMq(); G.Store.save(); G.newRound(); resetFx(); trailerDone = true;
      toast('기록을 지웠어요'); refreshSettings();
    }, 'block');

    // 눌림 표시
    document.addEventListener('pointerdown', e => {
      const b = e.target.closest && e.target.closest('.btn');
      if (b && !b.disabled) { b.classList.add('pressed'); setTimeout(() => b.classList.remove('pressed'), 140); }
      Sfx.unlock();
    });
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', fit);
  }
  function onKey(e) {
    Sfx.unlock();
    if (locked || ovOpen('ov-ad')) return;
    const k = e.code;
    if (ovOpen('ov-node')) {
      if (k === 'Enter' || k === 'Space') { e.preventDefault(); $('btn-node-buy').click(); }
      else if (k === 'Escape') $('btn-node-close').click();
      return;
    }
    if (cur === 'scr-tree') {
      if (k === 'Escape' || k === 'KeyT') closeTree();
      else if (k === 'ArrowLeft') T.panBy(40, 0);
      else if (k === 'ArrowRight') T.panBy(-40, 0);
      else if (k === 'ArrowUp') T.panBy(0, 40);
      else if (k === 'ArrowDown') T.panBy(0, -40);
      else if (k === 'Equal' || k === 'NumpadAdd') T.zoomBy(1.25);
      else if (k === 'Minus' || k === 'NumpadSubtract') T.zoomBy(0.8);
      if (/^Arrow/.test(k)) e.preventDefault();
      return;
    }
    if (cur === 'scr-play') {
      if (paused) { if (k === 'KeyP' || k === 'Escape') resume(); return; }
      if (ovOpen('ov-result')) {
        if (k === 'Enter' || k === 'Space') { e.preventDefault(); $('btn-res-next').click(); }
        else if (k === 'KeyT') $('btn-res-tree').click();
        else if (k === 'KeyC') $('btn-res-copy').click();
        return;
      }
      if (k === 'Space' || k === 'Enter') { e.preventDefault(); pourNow(); }
      else if (k === 'KeyT') $('btn-play-tree').click();
      else if (k === 'KeyP' || k === 'Escape') pause();
      return;
    }
    if (k === 'Enter' && cur === 'scr-title') $('btn-start').click();
  }

  // ---------- 시작 ----------
  readColors();
  followReduceMq();
  if (reduceMq) {
    if (reduceMq.addEventListener) reduceMq.addEventListener('change', followReduceMq);
    else if (reduceMq.addListener) reduceMq.addListener(followReduceMq);
  }
  G.on(handle);
  T.init({ canvas: $('treecv'), colors: C, font, game: G, onTap: id => { Sfx.play('click'); openNode(id); }, reduce: () => !!set().reduce });
  bind();
  fit();
  $('scr-title').classList.add('in');
  refreshTitle();
  requestAnimationFrame(loop);
})();
