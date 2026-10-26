// Ember Watch — 캔버스 그리기와 손맛 효과 (번쩍임·흔들림·튀는 숫자·조각)
(function () {
  'use strict';
  const EW = window.EW = window.EW || {};
  const D = window.EW_DATA;

  let cv = null, ctx = null, dark = null, dctx = null;
  let cw = 1, ch = 1, dpr = 1, scale = 1, ox = 0, oy = 0;
  let PAL = {};
  let clock = 0;

  const fx = { parts: [], nums: [], shake: 0, flash: 0, flashCol: '', rings: [] };
  EW.fx = fx;

  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }

  // 캔버스 색은 모두 style.css :root 변수를 거친다. 데이터의 색은 변수 이름('--wood-oak' 등)이라 여기서 값으로 바꾼다
  const varCache = {};
  function col(c) { return c && c.charAt(0) === '-' ? (varCache[c] || (varCache[c] = cssVar(c))) : c; }
  EW.col = col;
  // 반투명은 변수 색에 투명도만 얹는다
  function rgba(hex, a) {
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.replace(/./g, '$&$&');
    const n = parseInt(h, 16) || 0;
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  EW.renderInit = function () {
    cv = document.getElementById('cv');
    ctx = cv.getContext('2d');
    dark = document.createElement('canvas');
    dctx = dark.getContext('2d');
    PAL = {
      bg: cssVar('--bg'), surface: cssVar('--surface'), fire: cssVar('--fire'), fireHot: cssVar('--fire-hot'),
      lamp: cssVar('--lamp'), text: cssVar('--text'), muted: cssVar('--muted'), danger: cssVar('--danger'),
      good: cssVar('--good'), ink: cssVar('--ink'), stone: cssVar('--stone'), keeper: cssVar('--keeper'),
      skin: cssVar('--skin'), font: cssVar('--font'),
      fsS: parseInt(cssVar('--fs-s'), 10) || 14, fsM: parseInt(cssVar('--fs-m'), 10) || 16,
      fsL: parseInt(cssVar('--fs-l'), 10) || 20, fsXl: parseInt(cssVar('--fs-xl'), 10) || 28
    };
    EW.PAL = PAL;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && PAL.bg) meta.setAttribute('content', PAL.bg);
    EW.resizeCanvas();
  };

  EW.resizeCanvas = function () {
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cw = Math.max(1, r.width); ch = Math.max(1, r.height);
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    dark.width = cv.width; dark.height = cv.height;
    scale = Math.min(cw / EW.W, ch / EW.H);
    ox = (cw - EW.W * scale) / 2; oy = (ch - EW.H * scale) / 2;
  };

  EW.screenToWorld = function (x, y) {
    const r = cv.getBoundingClientRect();
    return { x: (x - r.left - ox) / scale, y: (y - r.top - oy) / scale };
  };
  EW.worldToScreen = function (x, y) { return { x: ox + x * scale, y: oy + y * scale }; };

  function reduced() { return EW.S && EW.S.settings.reduce; }

  // ---- 효과 만들기 ----
  EW.addNum = function (x, y, text, col, big) {
    if (EW.testMode) return;
    if (fx.nums.length > 60) fx.nums.shift();
    fx.nums.push({ x: x + (Math.random() - 0.5) * 16, y: y - 10, text: String(text), col: col || PAL.text, big: !!big, t: 0, life: big ? 1.0 : 0.75 });
  };
  EW.burst = function (x, y, col, n, spd) {
    if (EW.testMode) return;
    const count = reduced() ? Math.ceil((n || 10) / 3) : (n || 10);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (spd || 160) * (0.4 + Math.random() * 0.8);
      fx.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, t: 0, life: 0.3 + Math.random() * 0.25, col: col, r: 2 + Math.random() * 3 });
    }
    if (fx.parts.length > 400) fx.parts.splice(0, fx.parts.length - 400);
  };
  EW.ring = function (x, y, col, r) {
    if (EW.testMode || reduced()) return;
    fx.rings.push({ x: x, y: y, col: col, r0: 10, r1: r || 120, t: 0, life: 0.35 });
  };
  EW.shakeIt = function (m) {
    if (EW.testMode || !EW.S || !EW.S.settings.shake || reduced()) return;
    fx.shake = Math.min(18, Math.max(fx.shake, m));
  };
  EW.flashIt = function (col, a) {
    if (EW.testMode) return;
    fx.flash = Math.max(fx.flash, a || 0.3); fx.flashCol = col;
  };

  function updateFx(dt) {
    fx.parts = fx.parts.filter(function (p) {
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.vx *= 0.96;
      return p.t < p.life;
    });
    fx.nums = fx.nums.filter(function (n) { n.t += dt; n.y -= 46 * dt; return n.t < n.life; });
    fx.rings = fx.rings.filter(function (r) { r.t += dt; return r.t < r.life; });
    fx.shake = Math.max(0, fx.shake - 50 * dt);
    fx.flash = Math.max(0, fx.flash - 1.6 * dt);
  }

  // 장식(나무·돌) 자리는 지역 번호로 정해지는 고정 무늬다(무작위 아님)
  function hash(i, k) { const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); }

  function drawGround(R) {
    const reg = D.REGIONS[R.region];
    ctx.fillStyle = col(reg.ground);
    ctx.fillRect(0, 0, EW.W, EW.H);
    ctx.fillStyle = col(reg.deco);
    for (let i = 0; i < 70; i++) {
      const x = hash(i, R.region + 1) * EW.W, y = hash(i + 99, R.region + 3) * EW.H;
      if (Math.abs(x - EW.FX) < 160 && Math.abs(y - EW.FY) < 120) continue;
      const s = 14 + hash(i, 7) * 26;
      ctx.beginPath();
      if (R.region === 3) { ctx.ellipse(x, y, s, s * 0.6, 0, 0, Math.PI * 2); }
      else if (R.region === 4 && i % 5 === 0) { ctx.rect(x - s, y - s, s * 2, s * 1.4); }
      else { ctx.moveTo(x, y - s * 1.6); ctx.lineTo(x + s * 0.8, y + s * 0.6); ctx.lineTo(x - s * 0.8, y + s * 0.6); ctx.closePath(); }
      ctx.fill();
    }
  }

  // 몸 위에 쓰는 글자 한 자 (색 대신 글자로 종류를 알린다)
  function markText(t, x, y, size) {
    if (!t) return;
    ctx.font = '900 ' + size + 'px ' + PAL.font;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = rgba(PAL.ink, 0.8);
    ctx.strokeText(t, x, y);
    ctx.fillStyle = PAL.text;
    ctx.fillText(t, x, y);
    ctx.textBaseline = 'alphabetic';
  }

  function drawLog(l) {
    const w = D.WOOD_MAP[l.type];
    const bob = reduced() ? 0 : Math.sin(clock * 3 + l.rot * 5) * 2;
    ctx.save();
    ctx.translate(l.x, l.y + bob);
    ctx.rotate(l.rot);
    ctx.fillStyle = col(w.col);
    ctx.fillRect(-15, -5, 30, 10);
    ctx.fillStyle = rgba(PAL.ink, 0.25);
    ctx.fillRect(-15, 2, 30, 3);
    ctx.restore();
    // 장작 칸과 같은 글자 한 자 — 땅에 떨어진 장작도 색만으로 구분하지 않는다
    markText(w.mark, l.x, l.y + bob, PAL.fsS);
    // 빛 밖에서도 보이게 작은 반짝임
    ctx.fillStyle = PAL.fire;
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(clock * 4 + l.rot * 9);
    ctx.fillRect(l.x - 2, l.y - 14 + bob, 4, 4);
    ctx.globalAlpha = 1;
  }

  function drawFire(R) {
    const f = Math.max(0, R.fuel);
    // 돌 둘레
    ctx.fillStyle = PAL.stone;
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2;
      ctx.beginPath(); ctx.arc(EW.FX + Math.cos(a) * 34, EW.FY + Math.sin(a) * 22 + 8, 8, 0, Math.PI * 2); ctx.fill();
    }
    const size = 10 + f * 0.32;
    const fl = reduced() ? 0 : Math.sin(clock * 13) * 2 + Math.sin(clock * 7.3) * 2;
    ctx.fillStyle = PAL.fire;
    ctx.beginPath(); ctx.ellipse(EW.FX, EW.FY - size * 0.4, size * 0.75, size + fl, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PAL.fireHot;
    ctx.beginPath(); ctx.ellipse(EW.FX, EW.FY - size * 0.25, size * 0.4, size * 0.6 + fl * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  }

  function drawPlayer(R) {
    const hurt = R.hurtT > 0.3;
    const sq = hurt && !reduced() ? 0.85 : 1;
    ctx.save();
    ctx.translate(R.px, R.py);
    ctx.scale(1 / sq, sq);
    ctx.fillStyle = hurt ? PAL.danger : PAL.keeper;
    ctx.beginPath(); ctx.ellipse(0, 4, 15, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PAL.skin;
    ctx.beginPath(); ctx.arc(0, -14, 9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // 붙잡힘: 발밑에서 늪 손 세 갈래가 휘감는다
    if (R.mireT > 0) {
      const sway = reduced() ? 0 : Math.sin(clock * 9) * 3;
      ctx.strokeStyle = PAL.good; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.moveTo(R.px + k * 12, R.py + 24);
        ctx.quadraticCurveTo(R.px + k * 20 + sway, R.py + 10, R.px + k * 6, R.py - 2);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
    // 얼어붙음: 몸을 감싼 얼음 껍질과 남은 시간 고리
    if (R.frostT > 0) {
      ctx.fillStyle = rgba(PAL.text, 0.28);
      ctx.strokeStyle = PAL.text; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * Math.PI * 2, rr = k % 2 ? 22 : 27;
        const x = R.px + Math.cos(a) * rr, y = R.py - 4 + Math.sin(a) * rr;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(R.px, R.py - 4, 32, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, R.frostT / 1.5)); ctx.stroke();
    }
    // 들고 있는 등불
    const lx = R.px + 16, ly = R.py - 2;
    ctx.fillStyle = R.oil > 0 ? PAL.lamp : PAL.muted;
    ctx.fillRect(lx - 5, ly - 7, 10, 13);
    if (R.goal === 'fire') {
      ctx.strokeStyle = PAL.fire; ctx.setLineDash([8, 8]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(R.px, R.py); ctx.lineTo(EW.FX, EW.FY); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  function drawEnemy(e) {
    const wob = reduced() ? 0 : Math.sin(e.wob * 6) * 2;
    let jx = 0, jy = 0;
    if (e.hitT > 0 && !reduced()) { jx = (Math.random() - 0.5) * 4; jy = (Math.random() - 0.5) * 4; }
    ctx.fillStyle = e.hitT > 0 ? PAL.text : col(e.b.col);
    ctx.globalAlpha = e.hitT > 0 ? 0.85 : 1;
    ctx.beginPath();
    ctx.ellipse(e.x + jx, e.y + jy, e.r + wob * 0.5, e.r - wob * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // 종류 글자(data.js mark) — 같은 색 그림자도 글자로 가린다. 눈 아래에 둔다
    markText(e.b.mark, e.x + jx, e.y + jy + e.r * 0.35, Math.max(PAL.fsS - 4, Math.round(e.r * 0.9)));
    // 우두머리 왕관: 크기·체력 막대와 함께 모양으로도 알린다
    if (e.boss) {
      const cw2 = e.r * 0.9, cy = e.y - e.r - 16;
      ctx.fillStyle = PAL.fireHot;
      ctx.beginPath();
      ctx.moveTo(e.x - cw2, cy); ctx.lineTo(e.x - cw2, cy - 12); ctx.lineTo(e.x - cw2 / 2, cy - 5);
      ctx.lineTo(e.x, cy - 16); ctx.lineTo(e.x + cw2 / 2, cy - 5); ctx.lineTo(e.x + cw2, cy - 12); ctx.lineTo(e.x + cw2, cy);
      ctx.closePath(); ctx.fill();
    }
    if (e.flee) {
      ctx.fillStyle = PAL.fire;
      ctx.beginPath(); ctx.arc(e.x, e.y - e.r - 4, 4, 0, Math.PI * 2); ctx.fill();
    }
    if (e.boss || e.b.hp >= 50) {
      const w = e.r * 2;
      ctx.fillStyle = rgba(PAL.ink, 0.6); ctx.fillRect(e.x - w / 2, e.y - e.r - 12, w, 5);
      ctx.fillStyle = PAL.danger; ctx.fillRect(e.x - w / 2, e.y - e.r - 12, w * Math.max(0, e.hp / e.maxHp), 5);
    }
  }

  function drawEyes(R, fr, lr) {
    R.enemies.forEach(function (e) {
      const inLight = Math.hypot(e.x - EW.FX, e.y - EW.FY) < fr || (lr > 0 && Math.hypot(e.x - R.px, e.y - R.py) < lr);
      if (!inLight && e.sp.indexOf('blink') >= 0) return;
      const s = Math.max(2, e.r * 0.18);
      ctx.fillStyle = e.boss ? PAL.fire : PAL.danger;
      ctx.beginPath(); ctx.arc(e.x - e.r * 0.35, e.y - e.r * 0.2, s, 0, Math.PI * 2); ctx.arc(e.x + e.r * 0.35, e.y - e.r * 0.2, s, 0, Math.PI * 2); ctx.fill();
    });
  }

  function drawDarkness(R, fr, lr, sx, sy) {
    const reg = D.REGIONS[R.region];
    dctx.setTransform(1, 0, 0, 1, 0, 0);
    dctx.globalCompositeOperation = 'source-over';
    dctx.clearRect(0, 0, dark.width, dark.height);
    dctx.fillStyle = rgba(col(reg.dark), reg.darkA);
    dctx.fillRect(0, 0, dark.width, dark.height);
    dctx.globalCompositeOperation = 'destination-out';
    const k = dpr * scale;
    function hole(x, y, r) {
      if (r <= 0) return;
      const cx = (ox + sx) * dpr + x * k, cy = (oy + sy) * dpr + y * k, rr = r * k;
      const g = dctx.createRadialGradient(cx, cy, rr * 0.15, cx, cy, rr);
      g.addColorStop(0, rgba(PAL.ink, 1));
      g.addColorStop(0.75, rgba(PAL.ink, 0.85));
      g.addColorStop(1, rgba(PAL.ink, 0));
      dctx.fillStyle = g;
      dctx.beginPath(); dctx.arc(cx, cy, rr, 0, Math.PI * 2); dctx.fill();
    }
    const flick = reduced() ? 0 : Math.sin(clock * 9) * 4;
    hole(EW.FX, EW.FY, fr + flick);
    hole(R.px, R.py, lr);
    dctx.globalCompositeOperation = 'source-over';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(dark, 0, 0);
  }

  function drawLightTint(R, fr, lr) {
    ctx.globalCompositeOperation = 'lighter';
    function tint(x, y, r, c, a) {
      if (r <= 0) return;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, c); g.addColorStop(1, rgba(PAL.ink, 0));
      ctx.globalAlpha = a; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    tint(EW.FX, EW.FY, fr, PAL.fire, 0.16);
    tint(R.px, R.py, lr, PAL.lamp, R.brightT > 0 ? 0.24 : 0.13);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // 빛의 테두리 (불빛 반경을 읽기 쉽게)
    ctx.lineWidth = 2;
    ctx.strokeStyle = PAL.fire; ctx.globalAlpha = 0.25;
    ctx.beginPath(); ctx.arc(EW.FX, EW.FY, fr, 0, Math.PI * 2); ctx.stroke();
    if (lr > 0) { ctx.strokeStyle = PAL.lamp; ctx.beginPath(); ctx.arc(R.px, R.py, lr, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }

  EW.render = function (dt) {
    const R = EW.getRun();
    if (!ctx || !R) return;
    clock += dt;
    updateFx(dt);
    let sx = 0, sy = 0;
    if (fx.shake > 0) { sx = (Math.random() - 0.5) * fx.shake * 2; sy = (Math.random() - 0.5) * fx.shake * 2; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = PAL.bg;
    ctx.fillRect(0, 0, cw, ch);
    const k = dpr * scale;
    ctx.setTransform(k, 0, 0, k, (ox + sx) * dpr, (oy + sy) * dpr);

    const fr = EW.fireR(), lr = EW.lampR();
    drawGround(R);
    R.logs.forEach(drawLog);
    drawFire(R);
    R.enemies.forEach(drawEnemy);
    drawPlayer(R);

    drawDarkness(R, fr, lr, sx, sy);
    ctx.setTransform(k, 0, 0, k, (ox + sx) * dpr, (oy + sy) * dpr);
    drawLightTint(R, fr, lr);
    drawEyes(R, fr, lr);
    // 어둠 속 장작 반짝임은 어둠 위에 한 번 더
    R.logs.forEach(function (l) {
      ctx.fillStyle = PAL.fire;
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(clock * 4 + l.rot * 9);
      ctx.fillRect(l.x - 3, l.y - 3, 6, 6);
    });
    ctx.globalAlpha = 1;

    fx.rings.forEach(function (r) {
      const p = r.t / r.life;
      ctx.strokeStyle = r.col; ctx.globalAlpha = 1 - p; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * p, 0, Math.PI * 2); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    fx.parts.forEach(function (p) {
      ctx.globalAlpha = 1 - p.t / p.life;
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
    });
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    fx.nums.forEach(function (n) {
      const p = n.t / n.life;
      const pop = p < 0.15 && !reduced() ? 1 + (0.15 - p) * 3 : 1;
      const size = (n.big ? PAL.fsXl : PAL.fsL) * pop;
      ctx.font = '800 ' + size + 'px ' + PAL.font;
      ctx.globalAlpha = 1 - p * p;
      ctx.lineWidth = 4; ctx.strokeStyle = rgba(PAL.ink, 0.7);
      ctx.strokeText(n.text, n.x, n.y);
      ctx.fillStyle = n.col;
      ctx.fillText(n.text, n.x, n.y);
    });
    ctx.globalAlpha = 1;

    if (fx.flash > 0) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = Math.min(0.5, fx.flash);
      ctx.fillStyle = fx.flashCol || PAL.text;
      ctx.fillRect(0, 0, cw, ch);
      ctx.globalAlpha = 1;
    }
  };
})();
