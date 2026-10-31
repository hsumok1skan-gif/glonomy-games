// Ember Watch — 캔버스 그리기와 손맛 효과 (번쩍임·흔들림·튀는 숫자·조각)
// 낮에는 같은 숲이 밝게 보이고, 해 질 녘에 붉어지며, 밤에는 빛(모닥불·화톳불·등불) 둘레만 보인다
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
      skin: cssVar('--skin'), font: cssVar('--font'), dusk: cssVar('--dusk'),
      landNight: cssVar('--land-pine'), decoNight: cssVar('--land-pine-deco'), darkNight: cssVar('--land-pine-dark'),
      landDay: cssVar('--land-day'), decoDay: cssVar('--land-day-deco'),
      leaf: cssVar('--leaf'), leafPine: cssVar('--leaf-pine'), trunk: cssVar('--trunk'), stump: cssVar('--stump'),
      rock: cssVar('--rock'), rockHard: cssVar('--rock-hard'), grass: cssVar('--grass-tuft'),
      bush: cssVar('--bush'), berry: cssVar('--berry'), mushCap: cssVar('--mush-cap'), mushStem: cssVar('--mush-stem'),
      fence: cssVar('--fence'), trap: cssVar('--trap'),
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
  EW.addNum = function (x, y, text, c, big) {
    if (EW.testMode) return;
    if (fx.nums.length > 60) fx.nums.shift();
    fx.nums.push({ x: x + (Math.random() - 0.5) * 16, y: y - 10, text: String(text), col: c || PAL.text, big: !!big, t: 0, life: big ? 1.0 : 0.75 });
  };
  EW.burst = function (x, y, c, n, spd) {
    if (EW.testMode) return;
    const count = reduced() ? Math.ceil((n || 10) / 3) : (n || 10);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (spd || 160) * (0.4 + Math.random() * 0.8);
      fx.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, t: 0, life: 0.3 + Math.random() * 0.25, col: c, r: 2 + Math.random() * 3 });
    }
    if (fx.parts.length > 400) fx.parts.splice(0, fx.parts.length - 400);
  };
  EW.ring = function (x, y, c, r) {
    if (EW.testMode || reduced()) return;
    fx.rings.push({ x: x, y: y, col: c, r0: 10, r1: r || 120, t: 0, life: 0.35 });
  };
  EW.shakeIt = function (m) {
    if (EW.testMode || !EW.S || !EW.S.settings.shake || reduced()) return;
    fx.shake = Math.min(18, Math.max(fx.shake, m));
  };
  EW.flashIt = function (c, a) {
    if (EW.testMode) return;
    fx.flash = Math.max(fx.flash, a || 0.3); fx.flashCol = c;
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

  // ---- 낮과 밤의 밝기 ----
  function shownPhase(R) {
    if (R.phase === 'build') return R.prev;
    if (R.phase === 'down') return R.downFrom;
    if (R.phase === 'night') return 'night';
    return 'day';
  }
  // 1 = 한낮, 0 = 한밤. 해 질 녘 20초 동안 어두워지고, 밤 처음 3초·새벽 직전 4초는 조금 밝다
  function lightLevel(R) {
    const ph = shownPhase(R);
    if (ph === 'night') {
      const t = R.t, L = R.nightLen;
      if (t < 3) return 0.4 * (1 - t / 3);
      if (t > L - 4) return 0.35 * (t - (L - 4)) / 4;
      return 0;
    }
    if (R.phase === 'cards' || R.phase === 'relic') return 0.5;
    const s = EW.DAY_LEN - EW.DUSK;
    return R.t <= s ? 1 : Math.max(0.4, 1 - 0.6 * (R.t - s) / EW.DUSK);
  }
  function duskLevel(R) {
    if (shownPhase(R) !== 'day' || R.phase === 'cards' || R.phase === 'relic') return 0;
    const s = EW.DAY_LEN - EW.DUSK;
    return R.t <= s ? 0 : Math.min(1, (R.t - s) / EW.DUSK);
  }
  EW.duskLevel = function () { const R = EW.getRun(); return R ? duskLevel(R) : 0; };

  // 땅 무늬(풀 자국) 자리는 고정 무늬다(무작위 아님)
  function hash(i, k) { const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); }

  // 야영지마다 밤의 땅 색이 다르다 (style.css :root `--land-<야영지>`·`-deco`·`-dark`)
  function campCols(R) {
    const c = R.camp || 'pine';
    return { land: col('--land-' + c) || PAL.landNight, deco: col('--land-' + c + '-deco') || PAL.decoNight, dark: col('--land-' + c + '-dark') || PAL.darkNight };
  }
  EW.campCols = function (id) { return campCols({ camp: id }); };

  function drawGround(L, cc) {
    ctx.fillStyle = cc.land;
    ctx.fillRect(0, 0, EW.W, EW.H);
    if (L > 0) { ctx.globalAlpha = L; ctx.fillStyle = PAL.landDay; ctx.fillRect(0, 0, EW.W, EW.H); ctx.globalAlpha = 1; }
    for (let i = 0; i < 60; i++) {
      const x = hash(i, 1) * EW.W, y = hash(i + 99, 3) * EW.H;
      if (Math.abs(x - EW.FX) < 120 && Math.abs(y - EW.FY) < 90) continue;
      const s = 10 + hash(i, 7) * 22;
      ctx.fillStyle = L > 0.5 ? PAL.decoDay : cc.deco;
      ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.45, hash(i, 9) * 3, 0, Math.PI * 2); ctx.fill();
    }
    // 모닥불 둘레 밟힌 흙
    ctx.fillStyle = rgba(PAL.trunk, 0.35 * (0.4 + L * 0.6));
    ctx.beginPath(); ctx.ellipse(EW.FX, EW.FY + 6, 120, 84, 0, 0, Math.PI * 2); ctx.fill();
  }

  // ---- 자원 ----
  function progRing(x, y, r, p) {
    ctx.strokeStyle = PAL.fireHot; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.stroke();
  }
  function drawNode(n, R) {
    const nd = D.NODE_MAP[n.id];
    // 아직 열리지 않은 자원(송진 나무는 닷새째부터)은 지도에 없다
    if (!EW.nodeOpen(n)) return;
    const x = n.x, y = n.y, v = n.v || 0.5;
    const sway = reduced() ? 0 : Math.sin(clock * 1.5 + v * 9) * 1.5;
    if (n.id === 'tree' || n.id === 'pinetree') {
      if (!n.alive) { ctx.fillStyle = PAL.stump; ctx.beginPath(); ctx.ellipse(x, y + 10, 11, 7, 0, 0, Math.PI * 2); ctx.fill(); return; }
      ctx.fillStyle = PAL.trunk; ctx.fillRect(x - 5, y - 2, 10, 20);
      if (n.id === 'tree') {
        ctx.fillStyle = PAL.leaf;
        ctx.beginPath(); ctx.arc(x + sway, y - 18, 24 + v * 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = rgba(PAL.text, 0.08);
        ctx.beginPath(); ctx.arc(x - 8 + sway, y - 26, 9, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = PAL.leafPine;
        for (let k = 0; k < 3; k++) {
          const w = 26 - k * 6, top = y - 14 - k * 14;
          ctx.beginPath(); ctx.moveTo(x + sway, top - 22); ctx.lineTo(x + w + sway * 0.5, top + 8); ctx.lineTo(x - w + sway * 0.5, top + 8); ctx.closePath(); ctx.fill();
        }
        // 송진 방울 (먼 숲의 좋은 나무 표시)
        ctx.fillStyle = PAL.fireHot; ctx.beginPath(); ctx.arc(x + 3, y + 6, 3, 0, Math.PI * 2); ctx.fill();
      }
    } else if (n.id === 'stone' || n.id === 'hardstone') {
      if (!n.alive) { ctx.fillStyle = rgba(PAL.rock, 0.35); ctx.beginPath(); ctx.arc(x - 6, y + 4, 4, 0, Math.PI * 2); ctx.arc(x + 5, y + 6, 3, 0, Math.PI * 2); ctx.fill(); return; }
      ctx.fillStyle = n.id === 'stone' ? PAL.rock : PAL.rockHard;
      ctx.beginPath();
      if (n.id === 'stone') ctx.ellipse(x, y, 16 + v * 5, 11 + v * 3, v, 0, Math.PI * 2);
      else { ctx.moveTo(x - 20, y + 10); ctx.lineTo(x - 12, y - 14); ctx.lineTo(x + 8, y - 18); ctx.lineTo(x + 22, y + 2); ctx.lineTo(x + 10, y + 14); ctx.closePath(); }
      ctx.fill();
      ctx.fillStyle = rgba(PAL.text, 0.12); ctx.beginPath(); ctx.ellipse(x - 4, y - 5, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
    } else if (n.id === 'grass') {
      if (!n.alive) return;
      ctx.strokeStyle = PAL.grass; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath(); ctx.moveTo(x + k * 5, y + 10); ctx.quadraticCurveTo(x + k * 7 + sway, y - 2, x + k * 9 + sway * 2, y - 12 + Math.abs(k) * 3); ctx.stroke();
      }
      ctx.lineCap = 'butt';
    } else if (n.id === 'bush') {
      ctx.fillStyle = PAL.bush;
      ctx.beginPath(); ctx.arc(x - 9, y, 13, 0, Math.PI * 2); ctx.arc(x + 9, y, 13, 0, Math.PI * 2); ctx.arc(x, y - 9, 14, 0, Math.PI * 2); ctx.fill();
      if (n.alive) {
        ctx.fillStyle = PAL.berry;
        [[-9, -2], [6, -10], [10, 4], [-2, 6], [-12, -10]].forEach(function (p) { ctx.beginPath(); ctx.arc(x + p[0], y + p[1], 4, 0, Math.PI * 2); ctx.fill(); });
      }
    } else if (n.id === 'mushroom') {
      if (!n.alive) return;
      ctx.fillStyle = PAL.mushStem; ctx.fillRect(x - 4, y - 2, 8, 12);
      ctx.fillStyle = PAL.mushCap; ctx.beginPath(); ctx.ellipse(x, y - 3, 13, 9, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = PAL.mushStem; ctx.beginPath(); ctx.arc(x - 4, y - 7, 2, 0, Math.PI * 2); ctx.arc(x + 5, y - 6, 2, 0, Math.PI * 2); ctx.fill();
    }
    if (n.alive && n.prog > 0) progRing(x, y - 6, 30, n.prog / nd.time);
  }

  // ---- 지은 것 ----
  function drawBuild(b) {
    if (b.kind === 'brazier') {
      ctx.fillStyle = PAL.stone;
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.arc(b.x + Math.cos(a) * 15, b.y + Math.sin(a) * 10 + 6, 5, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = PAL.trunk; ctx.fillRect(b.x - 10, b.y + 2, 20, 5);
      if (b.fuel > 0) {
        const s = 5 + b.fuel * 0.22;
        const fl = reduced() ? 0 : Math.sin(clock * 12 + b.x) * 1.5;
        ctx.fillStyle = PAL.fire; ctx.beginPath(); ctx.ellipse(b.x, b.y - s * 0.3, s * 0.7, s + fl, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = PAL.fireHot; ctx.beginPath(); ctx.ellipse(b.x, b.y - s * 0.15, s * 0.35, s * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      } else {
        // 꺼진 화톳불: 재와 가는 연기
        ctx.fillStyle = PAL.muted; ctx.beginPath(); ctx.arc(b.x, b.y + 2, 6, 0, Math.PI * 2); ctx.fill();
      }
      const w = 30;
      ctx.fillStyle = rgba(PAL.ink, 0.55); ctx.fillRect(b.x - w / 2, b.y + 20, w, 4);
      ctx.fillStyle = PAL.fire; ctx.fillRect(b.x - w / 2, b.y + 20, w * Math.max(0, b.fuel) / (EW.getRun().st.brazierMax || 40), 4);
    } else if (b.kind === 'pile') {
      const n = b.wood.length;
      for (let i = 0; i < 6; i++) {
        const row = i < 3 ? 0 : 1, k = i < 3 ? i : i - 3;
        const x = b.x - 16 + k * 14 + row * 7, y = b.y + 8 - row * 9;
        const w = i < n ? D.WOOD_MAP[b.wood[i]] : null;
        ctx.fillStyle = w ? col(w.col) : rgba(PAL.trunk, 0.35);
        ctx.beginPath(); ctx.ellipse(x, y, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.font = '800 ' + PAL.fsS + 'px ' + PAL.font; ctx.textAlign = 'center';
      ctx.lineWidth = 3; ctx.strokeStyle = rgba(PAL.ink, 0.7); ctx.strokeText(n + '/6', b.x, b.y - 12);
      ctx.fillStyle = PAL.text; ctx.fillText(n + '/6', b.x, b.y - 12);
    } else if (b.kind === 'fence') {
      const tx = -Math.sin(b.a), ty = Math.cos(b.a);
      ctx.fillStyle = PAL.fence;
      for (let k = -1; k <= 1; k++) {
        const x = b.x + tx * k * 12, y = b.y + ty * k * 12;
        ctx.fillRect(x - 3, y - 14, 6, 18);
        ctx.beginPath(); ctx.moveTo(x - 3, y - 14); ctx.lineTo(x, y - 20); ctx.lineTo(x + 3, y - 14); ctx.fill();
      }
      ctx.strokeStyle = PAL.fence; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(b.x - tx * 16, b.y - ty * 16 - 6); ctx.lineTo(b.x + tx * 16, b.y + ty * 16 - 6); ctx.stroke();
    } else if (b.kind === 'trap') {
      ctx.globalAlpha = b.armed ? 1 : 0.4;
      ctx.strokeStyle = PAL.trap; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(b.x, b.y, 12, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; ctx.moveTo(b.x + Math.cos(a) * 12, b.y + Math.sin(a) * 12); ctx.lineTo(b.x + Math.cos(a) * 6, b.y + Math.sin(a) * 6); }
      ctx.stroke();
      ctx.globalAlpha = 1;
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
    if (!w) return;
    const bob = reduced() ? 0 : Math.sin(clock * 3 + l.rot * 5) * 2;
    ctx.save();
    ctx.translate(l.x, l.y + bob);
    ctx.rotate(l.rot);
    ctx.fillStyle = col(w.col);
    ctx.fillRect(-15, -5, 30, 10);
    ctx.fillStyle = rgba(PAL.ink, 0.25);
    ctx.fillRect(-15, 2, 30, 3);
    ctx.restore();
    // 가방 칸과 같은 글자 한 자 — 땅에 떨어진 장작도 색만으로 구분하지 않는다
    markText(w.mark, l.x, l.y + bob, PAL.fsS);
  }

  function drawFire(R) {
    const f = Math.max(0, R.fuel);
    // 돌 둘레 (모닥불을 키울수록 돌이 늘어난다)
    ctx.fillStyle = PAL.stone;
    const stones = 9 + R.fireLv * 3, rx = 34 + R.fireLv * 5, ry = 22 + R.fireLv * 3;
    for (let i = 0; i < stones; i++) {
      const a = i / stones * Math.PI * 2;
      ctx.beginPath(); ctx.arc(EW.FX + Math.cos(a) * rx, EW.FY + Math.sin(a) * ry + 8, 8, 0, Math.PI * 2); ctx.fill();
    }
    if (f <= 0) { ctx.fillStyle = PAL.muted; ctx.beginPath(); ctx.arc(EW.FX, EW.FY, 10, 0, Math.PI * 2); ctx.fill(); return; }
    const size = 10 + f * 0.3;
    const fl = reduced() ? 0 : Math.sin(clock * 13) * 2 + Math.sin(clock * 7.3) * 2;
    ctx.fillStyle = PAL.fire;
    ctx.beginPath(); ctx.ellipse(EW.FX, EW.FY - size * 0.4, size * 0.75, size + fl, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PAL.fireHot;
    ctx.beginPath(); ctx.ellipse(EW.FX, EW.FY - size * 0.25, size * 0.4, size * 0.6 + fl * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  }

  function drawPlayer(R, night) {
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
    // 들고 있는 등불 (밤에 등불 연료가 있으면 켜져 있다)
    const lx = R.px + 16, ly = R.py - 2;
    ctx.fillStyle = night && R.oil > 0 ? PAL.lamp : PAL.muted;
    ctx.fillRect(lx - 5, ly - 7, 10, 13);
    if (R.goal === 'fire') {
      ctx.strokeStyle = PAL.fire; ctx.setLineDash([8, 8]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(R.px, R.py); ctx.lineTo(EW.FX, EW.FY); ctx.stroke(); ctx.setLineDash([]);
    }
    // 모으는 중이면 손에 작은 도끼 흔들기
    if (R.gNode && !reduced()) {
      const a = Math.sin(clock * 18) * 0.6;
      ctx.save(); ctx.translate(R.px - 14, R.py - 6); ctx.rotate(a);
      ctx.fillStyle = PAL.trunk; ctx.fillRect(-2, -14, 4, 16);
      ctx.fillStyle = PAL.rock; ctx.fillRect(-6, -16, 9, 6);
      ctx.restore();
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
    // 큰 그림자 왕관: 크기·체력 막대와 함께 모양으로도 알린다
    if (e.boss) {
      const cw2 = e.r * 0.9, cy = e.y - e.r - 16;
      ctx.fillStyle = PAL.fireHot;
      ctx.beginPath();
      ctx.moveTo(e.x - cw2, cy); ctx.lineTo(e.x - cw2, cy - 12); ctx.lineTo(e.x - cw2 / 2, cy - 5);
      ctx.lineTo(e.x, cy - 16); ctx.lineTo(e.x + cw2 / 2, cy - 5); ctx.lineTo(e.x + cw2, cy - 12); ctx.lineTo(e.x + cw2, cy);
      ctx.closePath(); ctx.fill();
    }
    // 덫에 묶임: 발밑 쇠고리 / 울타리에 부딪혀 멈춤: 머리 위 별
    if (e.heldT > 0) {
      ctx.strokeStyle = PAL.trap; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * 0.8, e.r + 4, 6, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (e.stunT > 0) {
      ctx.fillStyle = PAL.fireHot;
      for (let k = 0; k < 3; k++) { const a = clock * 6 + k * 2.1; ctx.fillRect(e.x + Math.cos(a) * e.r - 2, e.y - e.r - 8 + Math.sin(a) * 3, 4, 4); }
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

  function drawEyes(R, lr) {
    R.enemies.forEach(function (e) {
      const inLight = EW.inLight(e.x, e.y) || (lr > 0 && Math.hypot(e.x - R.px, e.y - R.py) < lr);
      if (!inLight && e.sp.indexOf('blink') >= 0) return;
      const s = Math.max(2, e.r * 0.18);
      ctx.fillStyle = e.boss ? PAL.fire : PAL.danger;
      ctx.beginPath(); ctx.arc(e.x - e.r * 0.35, e.y - e.r * 0.2, s, 0, Math.PI * 2); ctx.arc(e.x + e.r * 0.35, e.y - e.r * 0.2, s, 0, Math.PI * 2); ctx.fill();
    });
  }

  // 어둠 덮개: 빛(모닥불·켜진 화톳불·등불) 자리만 구멍을 낸다
  function drawDarkness(R, A, fr, lr, sx, sy, cc) {
    dctx.setTransform(1, 0, 0, 1, 0, 0);
    dctx.globalCompositeOperation = 'source-over';
    dctx.clearRect(0, 0, dark.width, dark.height);
    dctx.fillStyle = rgba(cc.dark, A);
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
    hole(EW.FX, EW.FY, fr + (fr > 0 ? flick : 0));
    R.builds.forEach(function (b) { if (b.kind === 'brazier') hole(b.x, b.y, EW.brazierR(b)); });
    hole(R.px, R.py, lr);
    dctx.globalCompositeOperation = 'source-over';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(dark, 0, 0);
  }

  function drawLightTint(R, fr, lr, A) {
    ctx.globalCompositeOperation = 'lighter';
    function tint(x, y, r, c, a) {
      if (r <= 0) return;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, c); g.addColorStop(1, rgba(PAL.ink, 0));
      ctx.globalAlpha = a; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    tint(EW.FX, EW.FY, fr, PAL.fire, 0.16 * A);
    R.builds.forEach(function (b) { if (b.kind === 'brazier') tint(b.x, b.y, EW.brazierR(b), PAL.fire, 0.14 * A); });
    tint(R.px, R.py, lr, PAL.lamp, 0.13 * A);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // 빛의 테두리 (안전한 곳을 읽기 쉽게)
    ctx.lineWidth = 2; ctx.globalAlpha = 0.25 * A;
    ctx.strokeStyle = PAL.fire;
    if (fr > 0) { ctx.beginPath(); ctx.arc(EW.FX, EW.FY, fr, 0, Math.PI * 2); ctx.stroke(); }
    R.builds.forEach(function (b) { const r = b.kind === 'brazier' ? EW.brazierR(b) : 0; if (r > 0) { ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.stroke(); } });
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

    const L = lightLevel(R), dusk = duskLevel(R);
    const night = shownPhase(R) === 'night';
    const fr = EW.fireR(), lr = night ? EW.lampR() : 0;
    const cc = campCols(R);
    drawGround(L, cc);
    R.nodes.forEach(function (n) { if (!n.alive) drawNode(n, R); });
    R.builds.forEach(function (b) { if (b.kind === 'trap' || b.kind === 'pile') drawBuild(b); });
    R.logs.forEach(drawLog);
    R.nodes.forEach(function (n) { if (n.alive) drawNode(n, R); });
    R.builds.forEach(function (b) { if (b.kind === 'brazier' || b.kind === 'fence') drawBuild(b); });
    drawFire(R);
    R.enemies.forEach(drawEnemy);
    drawPlayer(R, night);

    // 해 질 녘: 하늘이 붉어진다
    if (dusk > 0) {
      ctx.globalAlpha = 0.3 * dusk; ctx.fillStyle = PAL.dusk;
      ctx.fillRect(0, 0, EW.W, EW.H); ctx.globalAlpha = 1;
    }
    const A = 0.93 * (1 - L);
    if (A > 0.01) {
      drawDarkness(R, A, fr, lr, sx, sy, cc);
      ctx.setTransform(k, 0, 0, k, (ox + sx) * dpr, (oy + sy) * dpr);
      drawLightTint(R, fr, lr, Math.min(1, A / 0.6));
    }
    if (night) {
      drawEyes(R, lr);
      // 어둠 속 장작 반짝임은 어둠 위에 한 번 더
      R.logs.forEach(function (l) {
        ctx.fillStyle = PAL.fire;
        ctx.globalAlpha = 0.35 + 0.35 * Math.sin(clock * 4 + l.rot * 9);
        ctx.fillRect(l.x - 3, l.y - 3, 6, 6);
      });
      ctx.globalAlpha = 1;
    }

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
