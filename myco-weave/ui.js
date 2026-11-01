/* Myco Weave — 화면·입력·손맛 효과·시험 훅 */
(function () {
  var D = window.DATA;
  var S = window.Store;
  var GM = window.Game;
  var SQ3 = Math.sqrt(3);

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var ui = {
    screen: 'screen-title',
    overlay: null,
    prevOverlay: null,
    lock: false,
    mode: 'grow',
    cursor: GM.CENTER,
    back: 'screen-title',
    setupStrain: 'white',
    setupDiff: 'normal',
    codexTab: 'tree',
    confirmFn: null,
    sim: false,
    lastResult: null
  };

  var mqReduce = null;
  try { mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null; } catch (e) { mqReduce = null; }
  function reduced() { return S.settings().reduce || !!(mqReduce && mqReduce.matches); }

  function applySettings() {
    var s = S.settings();
    document.body.classList.toggle('big', !!s.big);
    document.body.classList.toggle('reduce', reduced());
  }

  // ---------- 화면 전환 (모든 화면·겹침 화면이 이 함수를 거친다) ----------
  function go(target) {
    if (ui.lock) return false;
    var dur = reduced() ? 0 : 260;
    if (target === null || (target && target.indexOf('overlay-') === 0)) {
      if (ui.overlay === target) return false;
      if (ui.overlay) $(ui.overlay).classList.remove('active');
      ui.overlay = target;
      if (target) $(target).classList.add('active');
    } else {
      if (ui.screen === target) return false;
      if (ui.overlay) { $(ui.overlay).classList.remove('active'); ui.overlay = null; }
      $(ui.screen).classList.remove('active');
      $(target).classList.add('active');
      ui.screen = target;
      onShow(target);
    }
    if (dur > 0) {
      ui.lock = true;
      setTimeout(function () { ui.lock = false; }, dur);
    }
    return true;
  }

  function onShow(id) {
    if (id === 'screen-title') renderTitle();
    if (id === 'screen-setup') renderSetup();
    if (id === 'screen-settings') renderSettings();
    if (id === 'screen-codex') renderCodex();
    if (id === 'screen-records') renderRecords();
    if (id === 'screen-game') { setTimeout(resize, 30); renderAll(); }
  }

  function press(name) {
    window.Sfx.play(name || 'click');
  }

  // 게임 단계에 맞춰 겹침 화면을 연다
  function syncPhase() {
    var G = GM.get();
    if (!G) return;
    if (G.phase === 'over') { finishRun(); return; }
    if (ui.screen !== 'screen-game') return;
    if (G.phase === 'intro') { renderIntro(); forceOverlay('overlay-intro'); }
    else if (G.phase === 'reward') { renderReward(); forceOverlay('overlay-reward'); }
    else if (ui.overlay === 'overlay-intro' || ui.overlay === 'overlay-reward') forceOverlay(null);
  }
  // 게임이 바꾼 단계는 잠금을 기다리지 않는다
  function forceOverlay(id) {
    var was = ui.lock;
    ui.lock = false;
    go(id);
    ui.lock = was;
  }

  // ---------- 시작 ----------
  function renderTitle() {
    var d = S.data();
    var saved = S.loadRun();
    $('btn-continue').hidden = !(saved && saved.v === 1 && !saved.over);
    $('title-best').textContent = d.best.score > 0
      ? '최고 점수 ' + d.best.score + ' · 가장 깊이 간 숲 ' + d.best.stage + ' · 판 ' + d.totals.runs
      : '처음이라면 방법을 먼저 보세요.';
    var today = todayKey();
    var dy = S.daily();
    var played = S.dailyPlayed(today);
    var ds = byId(D.STRAINS, GM.dailyStrain(today));
    var b = $('btn-daily');
    b.disabled = played;
    b.textContent = played ? '오늘의 도전 · 내일 다시' : '오늘의 도전';
    b.setAttribute('aria-label', played ? '오늘의 도전은 오늘 이미 했다' : '오늘의 도전 시작 (' + today + ', ' + ds.name + ')');
    $('title-daily').textContent = !played
      ? '오늘의 도전 ' + today + ' · ' + ds.icon + ' ' + ds.name + ' · 보통 — 하루 한 번'
      : (dy.done ? '오늘의 도전 점수 ' + dy.score + ' · 숲 ' + dy.stage + (dy.won ? ' · 이김' : '') : '오늘의 도전 진행 중 — 이어하기로 계속한다');
  }
  // 이 기기의 오늘 날짜 (YYYY-MM-DD) — 오늘의 도전 시드
  function todayKey() {
    var t = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return t.getFullYear() + '-' + p(t.getMonth() + 1) + '-' + p(t.getDate());
  }

  // ---------- 균주 고르기 ----------
  function strainOpen(s) { return s.unlock <= S.data().best.stage; }
  function renderSetup() {
    var box = $('setup-strains');
    box.innerHTML = '';
    if (!strainOpen(byId(D.STRAINS, ui.setupStrain))) ui.setupStrain = 'white';
    D.STRAINS.forEach(function (s) {
      var open = strainOpen(s);
      var b = el('button', 'card' + (s.id === ui.setupStrain ? ' on' : ''));
      b.innerHTML = '<b>' + s.icon + ' ' + esc(s.name) + '</b><span>' +
        (open ? esc(s.desc) + '<br>기술: ' + esc(s.skill.name) : '숲 ' + s.unlock + '까지 가면 열린다') + '</span>';
      b.disabled = !open;
      b.setAttribute('aria-label', s.name + (open ? '' : ' 잠김'));
      b.addEventListener('click', function () { if (!open || ui.lock) return; ui.setupStrain = s.id; press('click'); renderSetup(); });
      box.appendChild(b);
    });
    var dr = $('setup-diffs');
    dr.innerHTML = '';
    D.DIFFS.forEach(function (d) {
      var b = el('button', 'btn' + (d.id === ui.setupDiff ? ' on' : ''), esc(d.name));
      b.addEventListener('click', function () { if (ui.lock) return; ui.setupDiff = d.id; press('click'); renderSetup(); });
      dr.appendChild(b);
    });
    var s = byId(D.STRAINS, ui.setupStrain);
    var df = byId(D.DIFFS, ui.setupDiff);
    $('setup-summary').innerHTML = '<b>' + s.icon + ' ' + esc(s.name) + '</b><br>' + esc(s.desc) +
      '<br>기술 · ' + esc(s.skill.name) + ' (' + s.skill.cd + '일마다): ' + esc(s.skill.desc) +
      '<br><br>난이도 · ' + esc(df.name) + ': 위협 ×' + df.spawn + ', 포자 목표 ×' + df.goal +
      (df.heart ? ', 심장 ' + (df.heart > 0 ? '+' : '') + df.heart : '');
  }

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
  }

  function startRun(strain, diff, daily) {
    if (ui.lock) return;   // 전환 중 두 번 누르면 판을 두 번 만들지 않는다
    GM.newRun({ strain: strain, diff: diff, daily: daily || '' });
    ui.mode = 'grow';
    ui.cursor = GM.CENTER;
    press('start');
    window.Sfx.vibrate(20);
    if (!go('screen-game')) { forceScreen('screen-game'); }
    syncPhase();
    saveRun();
  }
  function forceScreen(id) {
    var was = ui.lock;
    ui.lock = false;
    go(id);
    ui.lock = was;
  }

  // ---------- 본 화면 그리기 ----------
  var cv = $('board');
  var ctx = cv.getContext('2d');
  // size 는 칸 세로 반지름, kx 는 가로 늘림 비율(좁은 가로 화면에서 칸 폭을 --tap 이상으로)
  var geo = { size: 20, kx: 1, cx: 0, cy: 0, w: 0, h: 0, dpr: 1 };
  var COL = {};
  var FS = [];
  var TAP = 44;

  // 판(Canvas)의 색과 글자 크기도 style.css :root 변수(--c-*, --fs-1~6)에서만 읽는다
  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    ['bg', 'face', 'line', 'soil', 'moist', 'dry', 'litter', 'log', 'rock', 'hypha', 'spore', 'tree', 'mold', 'frost', 'danger', 'text', 'dim'].forEach(function (k) {
      COL[k] = (cs.getPropertyValue('--c-' + k) || '').trim();
    });
    FS = [];
    for (var n = 1; n <= 6; n++) FS.push(parseFloat(cs.getPropertyValue('--fs-' + n)) || 0);
    TAP = parseFloat(cs.getPropertyValue('--tap')) || 44;
  }
  // 칸 크기에 맞는 글꼴 단계: want 이하인 가장 큰 단계 (가장 작아도 --fs-1)
  function fsFit(want) {
    var v = FS[0];
    for (var n = 1; n < FS.length; n++) if (FS[n] && FS[n] <= want) v = FS[n];
    return v;
  }
  function canvasFont(want, bold) {
    ctx.font = (bold ? 'bold ' : '') + fsFit(want) + 'px sans-serif';
  }

  function resize() {
    var wrap = $('board-wrap');
    var w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    geo.dpr = dpr; geo.w = w; geo.h = h;
    var R = GM.R;
    var sw = (w - 8) / (SQ3 * (2 * R + 1));
    var sh = (h - 8) / (3 * R + 2);
    geo.size = Math.max(10, Math.min(sw, sh));
    // 칸 폭(√3·가로 반지름)이 --tap 보다 좁으면 판 폭이 허락하는 만큼 가로로만 넓힌다 (최대 1.3배)
    var sx = Math.max(geo.size, Math.min(sw, (TAP + 0.5) / SQ3, geo.size * 1.3));
    geo.kx = sx / geo.size;
    geo.cx = w / 2; geo.cy = h / 2;
    requestDraw();
  }

  function hexXY(i) {
    var hx = GM.HEX[i];
    var x = geo.cx + geo.size * geo.kx * SQ3 * (hx.q + hx.r / 2), y = geo.cy + geo.size * 1.5 * hx.r;
    // 칸 흔들림: 그리는 동안만 흔들린 자리로 옮긴다 (누른 자리 찾기에는 쓰지 않음)
    var j = fx.drawing && fx.jig[i];
    if (j) {
      var t = (fx.drawing - j.t0) / JIG_MS;
      if (t < 1) { var a = j.amp * (1 - t); x += Math.sin(t * 38) * a; y += Math.cos(t * 31) * a * 0.5; }
    }
    return { x: x, y: y };
  }
  function pixelHex(x, y) {
    var dx = (x - geo.cx) / (geo.size * geo.kx), dy = (y - geo.cy) / geo.size;
    var q = (SQ3 / 3 * dx - dy / 3), r = (2 / 3 * dy);
    var s = -q - r;
    var rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
    var dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
    for (var i = 0; i < GM.HEX.length; i++) if (GM.HEX[i].q === rq && GM.HEX[i].r === rr) return i;
    return -1;
  }
  function hexPath(x, y, s) {
    ctx.beginPath();
    for (var k = 0; k < 6; k++) {
      var a = Math.PI / 180 * (60 * k - 30);
      var px = x + s * geo.kx * Math.cos(a), py = y + s * Math.sin(a);
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  // 손맛 상태
  var fx = { flash: [], pop: {}, jig: {}, parts: [], full: null, drawing: 0 };
  var JIG_MS = 220;
  var raf = 0;
  function requestDraw() {
    if (ui.sim) return;
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function frame() {
    raf = 0;
    draw();
    var now = performance.now();
    fx.flash = fx.flash.filter(function (f) { return now - f.t0 < f.dur; });
    fx.parts = fx.parts.filter(function (p) { return now - p.t0 < p.life; });
    Object.keys(fx.pop).forEach(function (k) { if (now - fx.pop[k] > 260) delete fx.pop[k]; });
    Object.keys(fx.jig).forEach(function (k) { if (now - fx.jig[k].t0 > JIG_MS) delete fx.jig[k]; });
    if (fx.full && now - fx.full.t0 > fx.full.dur) fx.full = null;
    if (fx.flash.length || fx.parts.length || Object.keys(fx.pop).length || Object.keys(fx.jig).length || fx.full) raf = requestAnimationFrame(frame);
  }

  function targetsFor(G, f) {
    var out = {};
    if (!G || G.phase !== 'play') return out;
    for (var i = 0; i < GM.HEX.length; i++) {
      if (ui.mode === 'grow' && GM.canGrow(i, f)) out[i] = GM.growCost(i);
      else if (ui.mode === 'fruit' && GM.canFruit(i, f)) out[i] = GM.fruitCost(i);
      else if (ui.mode === 'thick' && GM.canThick(i)) out[i] = GM.thickCost(i);
    }
    return out;
  }

  function draw() {
    var G = GM.get();
    ctx.setTransform(geo.dpr, 0, 0, geo.dpr, 0, 0);
    ctx.clearRect(0, 0, geo.w, geo.h);
    if (!G || !G.hexes) return;
    var now = performance.now();
    fx.drawing = now;
    try { drawBoard(G, now); } finally { fx.drawing = 0; }
  }
  function drawBoard(G, now) {
    var s = geo.size;
    var f = GM.flow();
    var ps = GM.partners(f);
    var pmap = {};
    ps.forEach(function (p) { pmap[p.i] = p; });
    var tg = targetsFor(G, f);
    var hs = G.hexes;
    var i, h, p;

    // 땅
    for (i = 0; i < hs.length; i++) {
      h = hs[i]; p = hexXY(i);
      var sc = fx.pop[i] ? 1 + 0.15 * Math.sin(Math.min(1, (now - fx.pop[i]) / 260) * Math.PI) : 1;
      hexPath(p.x, p.y, s * 0.96 * sc);
      ctx.fillStyle = h.t === 'tree' ? COL.soil : (COL[h.t] || COL.soil);
      ctx.fill();
      if (h.owned) tint(f.conn[i] ? COL.hypha : COL.dim, f.conn[i] ? 0.16 : 0.12);
      if (GM.moldAt(i)) tint(COL.mold, 0.35);
      if (h.frozen > 0) tint(COL.frost, 0.3);
      ctx.strokeStyle = COL.line; ctx.lineWidth = 1; ctx.stroke();
      terrainMark(h.t, p.x, p.y, s);
    }
    // 균사 줄
    ctx.lineCap = 'round';
    for (i = 0; i < hs.length; i++) {
      if (!hs[i].owned) continue;
      var a = hexXY(i);
      GM.NB[i].forEach(function (m) {
        if (m < i || !hs[m].owned) return;
        var b = hexXY(m);
        var live = f.conn[i] && f.conn[m];
        ctx.strokeStyle = live ? COL.hypha : COL.dim;
        ctx.globalAlpha = live ? 0.95 : 0.45;
        ctx.lineWidth = Math.max(2, s * (hs[i].thick && hs[m].thick ? 0.3 : 0.16));
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }
    // 나무 짝 줄
    ps.forEach(function (pp) {
      var a2 = hexXY(pp.i);
      GM.NB[pp.i].forEach(function (m) {
        if (!f.conn[m]) return;
        var b2 = hexXY(m);
        ctx.strokeStyle = COL.tree; ctx.globalAlpha = 0.7; ctx.lineWidth = Math.max(1.5, s * 0.08);
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(a2.x, a2.y); ctx.lineTo(b2.x, b2.y); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      });
    });
    // 칸 위 그림
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (i = 0; i < hs.length; i++) {
      h = hs[i]; p = hexXY(i);
      if (h.thick > 0 && h.owned) {
        hexPath(p.x, p.y, s * 0.78);
        ctx.strokeStyle = COL.hypha; ctx.lineWidth = h.thick > 1 ? 3.5 : 2; ctx.stroke();
      }
      if (h.t === 'tree') {
        var td = GM.treeDef(h.tree);
        if (pmap[i]) {
          ctx.beginPath(); ctx.arc(p.x, p.y, s * 0.72, 0, Math.PI * 2);
          ctx.strokeStyle = COL.tree; ctx.lineWidth = 2; ctx.stroke();
        }
        glyph(td ? td.icon : '🌳', p.x, p.y, s * 0.95);
      } else if (h.t === 'log') {
        glyph('🪵', p.x, p.y, s * 0.8);
      }
      if (h.heart) {
        ctx.beginPath(); ctx.arc(p.x, p.y, s * 0.62, 0, Math.PI * 2);
        ctx.fillStyle = COL.face; ctx.fill();
        ctx.strokeStyle = COL.hypha; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = COL.danger; canvasFont(s * 0.7, true);
        ctx.fillText('♥', p.x, p.y + 1);
      }
      if (h.mush) {
        glyph('🍄', p.x, p.y, s * 0.85);
        if (!f.conn[i]) { hexPath(p.x, p.y, s * 0.9); tint(COL.bg, 0.5); }
      }
      if (h.owned && !h.heart && !f.conn[i]) {
        ctx.fillStyle = COL.dim; canvasFont(s * 0.5, true);
        ctx.fillText('시듦 ' + h.wither, p.x, p.y + s * 0.55);
      }
    }
    // 위협
    G.threats.forEach(function (t) {
      var td = GM.threatDef(t.id);
      var pp = hexXY(t.at);
      glyph(td.icon, pp.x, pp.y, s * (td.boss ? 1.1 : 0.85));
      if (t.hp > 1) {
        ctx.fillStyle = COL.danger; canvasFont(s * 0.45, true);
        ctx.fillText(String(t.hp), pp.x + s * 0.5, pp.y - s * 0.45);
      }
    });
    // 할 수 있는 칸
    Object.keys(tg).forEach(function (k) {
      var ii = +k, pp = hexXY(ii);
      hexPath(pp.x, pp.y, s * 0.86);
      ctx.setLineDash([4, 3]); ctx.strokeStyle = COL.spore; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = COL.spore; canvasFont(s * 0.42, true);
      ctx.fillText(String(tg[k]), pp.x - s * 0.5, pp.y + s * 0.45);
    });
    // 고른 칸
    if (ui.cursor >= 0) {
      p = hexXY(ui.cursor);
      hexPath(p.x, p.y, s * 0.98);
      ctx.strokeStyle = COL.text; ctx.lineWidth = 2.5; ctx.stroke();
    }
    // 번쩍임
    fx.flash.forEach(function (fl) {
      var k = 1 - (now - fl.t0) / fl.dur;
      if (k <= 0) return;
      var pp = hexXY(fl.i);
      hexPath(pp.x, pp.y, s);
      ctx.globalAlpha = 0.6 * k; ctx.fillStyle = fl.color; ctx.fill(); ctx.globalAlpha = 1;
    });
    // 터지는 조각
    fx.parts.forEach(function (pt) {
      var t = (now - pt.t0) / pt.life;
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x + pt.vx * t, pt.y + pt.vy * t + 20 * t * t, pt.r * (1 - t * 0.5), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    });
    if (fx.full) {
      var k2 = 1 - (now - fx.full.t0) / fx.full.dur;
      if (k2 > 0) { ctx.globalAlpha = 0.35 * k2; ctx.fillStyle = fx.full.color; ctx.fillRect(0, 0, geo.w, geo.h); ctx.globalAlpha = 1; }
    }
  }
  function glyph(g, x, y, size) {
    ctx.font = fsFit(size) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    ctx.fillText(g, x, y + 1);
  }
  // 지금 경로를 변수 색 + 투명도로 덮는다
  function tint(color, alpha) {
    ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fill(); ctx.globalAlpha = 1;
  }
  function dots(x, y, s, n) {
    for (var k = 0; k < n; k++) {
      var a = k * 2.4 + 0.6;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * s * 0.4, y + Math.sin(a) * s * 0.35, Math.max(1, s * 0.07), 0, Math.PI * 2); ctx.fill();
    }
  }
  // 땅 무늬: 색을 못 가려도 땅 종류를 알 수 있게 칸 위쪽에 종류마다 다른 무늬를 그린다
  // (흙 고랑 두 줄 · 젖은 흙 물결 · 마른 흙 갈라진 금 · 낙엽 점 · 바위 빗금 · 통나무·나무는 그림)
  // 아래쪽은 비용 숫자·시듦 글자 자리라 비워 둔다
  function terrainMark(t, x, y, s) {
    var w = s * geo.kx, k;
    ctx.lineWidth = Math.max(1, s * 0.07);
    ctx.lineCap = 'round';
    ctx.strokeStyle = COL.text;
    if (t === 'soil') {
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.24, y - s * 0.5); ctx.lineTo(x + w * 0.24, y - s * 0.5);
      ctx.moveTo(x - w * 0.24, y - s * 0.32); ctx.lineTo(x + w * 0.24, y - s * 0.32);
      ctx.stroke();
    } else if (t === 'moist') {
      ctx.globalAlpha = 0.32;
      ctx.beginPath();
      for (k = 0; k < 2; k++) {
        var wy = y - s * (0.5 - k * 0.18);
        ctx.moveTo(x - w * 0.3, wy);
        ctx.quadraticCurveTo(x - w * 0.15, wy - s * 0.1, x, wy);
        ctx.quadraticCurveTo(x + w * 0.15, wy + s * 0.1, x + w * 0.3, wy);
      }
      ctx.stroke();
    } else if (t === 'dry') {
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.32, y - s * 0.28);
      ctx.lineTo(x - w * 0.12, y - s * 0.5);
      ctx.lineTo(x + w * 0.04, y - s * 0.3);
      ctx.lineTo(x + w * 0.3, y - s * 0.56);
      ctx.moveTo(x + w * 0.04, y - s * 0.3); ctx.lineTo(x + w * 0.1, y - s * 0.12);
      ctx.stroke();
    } else if (t === 'litter') {
      ctx.fillStyle = COL.hypha; ctx.globalAlpha = 0.35; dots(x, y, s, 4);
    } else if (t === 'rock') {
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      for (k = -1; k <= 1; k++) {
        var ox = k * w * 0.32;
        ctx.moveTo(x + ox - w * 0.2, y + s * 0.3); ctx.lineTo(x + ox + w * 0.2, y - s * 0.3);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- 손맛 효과 ----------
  function clampFlash(dur) { return Math.max(50, Math.min(200, dur || 160)); }
  function flashHex(i, color, dur) {
    fx.flash.push({ i: i, color: color, t0: performance.now(), dur: clampFlash(dur) });
    requestDraw();
  }
  // 칸 하나만 0.22초 흔든다. 크기는 피해·얻은 양에 비례 (움직임 줄이기면 하지 않음)
  function jigHex(i, amp) {
    if (!S.settings().shake || reduced()) return;
    fx.jig[i] = { t0: performance.now(), amp: Math.min(geo.size * 0.3, amp) };
    requestDraw();
  }
  // 맞힘·얻음·실패 반응 하나: 번쩍임 + 칸 흔들림(+화면 흔들림) + 튀는 숫자 + 커졌다 돌아오기·조각
  function react(i, o) {
    if (i == null || i < 0) i = GM.CENTER;
    flashHex(i, o.color, o.flash || 150);
    jigHex(i, o.amp || 2);
    if (o.shake) shake(o.shake);
    if (o.text) floatText(i, o.text, o.cls, o.big);
    if (o.pop !== false) popHex(i);
    if (o.parts) burst(i, o.color, o.parts);
  }
  function popHex(i) {
    if (reduced()) return;
    fx.pop[i] = performance.now();
    requestDraw();
  }
  function burst(i, color, n) {
    if (reduced()) n = Math.min(n, 3);
    var p = hexXY(i);
    for (var k = 0; k < n; k++) {
      var a = Math.random() * Math.PI * 2, v = 20 + Math.random() * 30;
      fx.parts.push({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 10, r: 1.5 + Math.random() * 2, color: color, t0: performance.now(), life: 300 + Math.random() * 200 });
    }
    requestDraw();
  }
  function floatText(i, text, cls, big) {
    if (!S.settings().floats) return;
    var p = hexXY(i);
    var e = el('div', 'float ' + (cls || '') + (big ? ' big' : ''), esc(text));
    e.style.left = p.x + 'px';
    e.style.top = p.y + 'px';
    $('fx-layer').appendChild(e);
    setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e); }, 850);
  }
  function shake(power) {
    if (!S.settings().shake || reduced()) return;
    var w = $('board-wrap');
    w.style.setProperty('--shake', Math.min(12, power) + 'px');
    w.classList.remove('shake');
    void w.offsetWidth;
    w.classList.add('shake');
    setTimeout(function () { w.classList.remove('shake'); }, 260);
  }
  function fullFlash(color, dur) {
    fx.full = { color: color, t0: performance.now(), dur: clampFlash(dur || 200) };
    requestDraw();
  }
  function chipPop(id) {
    var c = $(id);
    c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
  }
  var bannerTimer = 0;
  function banner(text) {
    var b = $('banner');
    b.textContent = text;
    b.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(function () { b.classList.remove('show'); }, 1500);
  }

  // ---------- 첫 판 안내 (한 단계에 한 동작: 뻗기 → 나무 짝 → 버섯 → 날 넘기기) ----------
  // met(e) 가 참이면 다음 단계로 간다. 이미 해 둔 동작은 그 단계를 열 때 바로 넘긴다.
  var TUTOR = [
    { btn: 'btn-mode-grow', text: '<b>뻗기</b>(Q)를 고른 채 점선 칸을 누르면 망이 한 칸 뻗는다. 칸 옆 숫자가 드는 기운이다.',
      met: function () { var G = GM.get(); return !!(G && G.stats && G.stats.grown > 0); } },
    { btn: 'btn-mode-grow', text: '나무 곁 칸까지 망을 이으면 그 나무와 <b>짝</b>을 맺는다(점선 줄). 짝 나무는 아침마다 기운을 준다 — 심장에서 멀수록 덜 온다.',
      met: function () { var G = GM.get(); return !!(G && G.hexes && GM.partners(GM.flow()).length); } },
    { btn: 'btn-mode-fruit', text: '<b>버섯</b>(W)을 고르고 이어진 망 칸을 누르면 버섯이 핀다. 버섯은 밤마다 포자를 낸다. 기운이 모자라면 날을 넘겨 기운을 받은 뒤 해도 된다.',
      met: function () { var G = GM.get(); return !!(G && G.hexes && G.hexes.some(function (h) { return h.owned && h.mush; })); } },
    { btn: 'btn-end', text: '할 일을 마쳤으면 <b>날 넘기기</b>(Space). 밤에 이어진 버섯이 포자를 내고, 위협이 움직인다.',
      met: function (e) { return e.type === 'dayEnd'; } }
  ];
  var tutor = { step: -1, timer: 0 };
  function tutorHint(id) {
    TUTOR.forEach(function (s) { var b = $(s.btn); if (b) b.classList.remove('hint'); });
    if (id && $(id)) $(id).classList.add('hint');
  }
  function tutorShow(n) {
    clearTimeout(tutor.timer);
    if (n < 0 || n >= TUTOR.length) { tutorHide(); return; }
    var st = TUTOR[n];
    tutor.step = n;
    $('tutor-step').textContent = '첫 판 안내 ' + (n + 1) + '/' + TUTOR.length;
    $('tutor-text').innerHTML = st.text;
    $('btn-tutor-next').textContent = n === TUTOR.length - 1 ? '안내 끝내기' : '건너뛰기';
    $('btn-tutor-off').hidden = false;
    $('tutor').hidden = false;
    tutorHint(st.btn);
    if (st.met({ type: '' })) tutorNext();
  }
  function tutorNext() {
    if (tutor.step < 0) return;
    if (tutor.step >= TUTOR.length) { tutorHide(); return; }
    if (tutor.step + 1 >= TUTOR.length) { tutorDone(); return; }
    tutorShow(tutor.step + 1);
  }
  // 네 단계를 마치면 다시 보지 않게 저장하고 끝 인사를 잠깐 보인다
  function tutorDone() {
    S.setSetting('tutorial', false);
    tutor.step = TUTOR.length;
    tutorHint(null);
    $('tutor-step').textContent = '첫 판 안내 끝';
    $('tutor-text').innerHTML = '포자를 목표만큼 모으면 다음 숲으로 간다. 방법은 메뉴(☰)에서, 이 안내는 설정의 <b>첫 판 안내</b>로 다시 볼 수 있다.';
    $('btn-tutor-next').textContent = '닫기';
    $('btn-tutor-off').hidden = true;
    $('tutor').hidden = false;
    clearTimeout(tutor.timer);
    tutor.timer = setTimeout(tutorHide, 7000);
  }
  function tutorHide() {
    clearTimeout(tutor.timer);
    tutor.step = -1;
    tutorHint(null);
    $('tutor').hidden = true;
  }
  function tutorEvent(e) {
    if (e.type === 'forestStart') {
      var G = GM.get();
      if (e.stage === 1 && G && G.day === 1 && S.settings().tutorial) tutorShow(0);
      return;
    }
    if (e.type === 'newRun' || e.type === 'load' || e.type === 'runEnd' || e.type === 'forestWin') { tutorHide(); return; }
    if (tutor.step >= 0 && tutor.step < TUTOR.length && TUTOR[tutor.step].met(e)) tutorNext();
  }

  var sporeSoundAt = 0;
  function onGame(e) {
    if (ui.sim) return;
    tutorEvent(e);
    var i = e.i;
    switch (e.type) {
      // 얻음
      case 'grow':
        react(i, { color: COL.hypha, flash: 140, amp: 1.5, parts: 5, text: e.cost ? '-' + e.cost + '⚡ +1칸' : '+1칸', cls: 'energy' });
        press('grow');
        break;
      case 'fruit':
        react(i, { color: COL.spore, flash: 160, amp: 2, parts: 8, text: '🍄 ' + (GM.mushDef(e.kind) || {}).name, cls: 'spore' });
        press('fruit'); window.Sfx.vibrate(10);
        break;
      case 'thick':
        react(i, { color: COL.hypha, flash: 120, amp: 1.5, parts: 3, text: '굵기 ' + ((GM.get().hexes[i] || {}).thick || 1), cls: 'energy' });
        press('thick');
        break;
      case 'spore':
        react(i, { color: COL.spore, flash: 180, amp: 1 + Math.min(4, e.n * 0.6), parts: 3 + Math.min(6, e.n), text: '+' + e.n + '✦', cls: 'spore', big: e.n >= 3 });
        if (performance.now() - sporeSoundAt > 80) { press('spore'); sporeSoundAt = performance.now(); }
        break;
      case 'gain':
        react(i, { color: e.spore ? COL.spore : COL.hypha, flash: 140, amp: 1 + Math.min(4, e.n * 0.5), parts: 3 + Math.min(6, e.n),
          text: '+' + e.n + (e.spore ? '✦' : '⚡'), cls: e.spore ? 'spore' : 'energy', big: e.n >= 4 });
        chipPop('hud-energy');
        break;
      case 'income':
        if (!e.n) break;
        react(GM.CENTER, { color: COL.hypha, flash: 150, amp: 1 + Math.min(4, e.n * 0.4), parts: 3 + Math.min(8, e.n),
          text: '+' + e.n + '⚡', cls: 'energy', big: e.n >= 8 });
        chipPop('hud-energy');
        break;
      case 'heal':
        react(i, { color: COL.tree, flash: 160, amp: 2 + Math.min(3, (e.n || 1) - 1), parts: 6, text: '+' + (e.n || 1) + '♥', cls: 'good', big: (e.n || 1) >= 3 });
        chipPop('hud-heart');
        break;
      case 'partner':
        react(i, { color: COL.tree, flash: 200, amp: 2, parts: 6, text: '짝!', cls: 'good' });
        press('partner'); window.Sfx.vibrate(12);
        break;
      // 맞힘
      case 'digest':
        react(i, { color: COL.mold, flash: 180, amp: 3, parts: 9, text: '삭임! +1칸', cls: 'good' });
        press('digest'); window.Sfx.vibrate(15);
        break;
      case 'hit':
        react(i, { color: COL.text, flash: 100, amp: 1.5 + e.n * 1.5, shake: e.n >= 3 ? e.n : 0, parts: 2 + e.n * 2, text: '-' + e.n, cls: 'bad', big: e.n >= 3 });
        break;
      case 'kill':
        react(i, { color: COL.text, flash: 160, amp: 4, shake: 3, parts: 12, text: '쓰러뜨림!' + (e.energy ? ' +' + e.energy + '⚡' : ''), cls: 'good', big: true });
        press('kill'); window.Sfx.vibrate(20);
        break;
      case 'bounce':
        react(i, { color: COL.hypha, flash: 150, amp: 2.5, shake: 2, parts: 4, text: '튕김!', cls: 'energy' });
        press('bounce');
        break;
      case 'freeze':
        react(i, { color: COL.frost, flash: 200, amp: 2, parts: 5, text: '얼림!', cls: 'energy' });
        break;
      // 실패 (피해·틀림·패배)
      case 'bite':
        react(i, { color: COL.danger, flash: 180, amp: 4, shake: 5, parts: 7, text: '갉힘 -1칸', cls: 'bad' });
        press('bite'); window.Sfx.vibrate(30);
        break;
      case 'eat':
        react(i, { color: COL.danger, flash: 180, amp: 3, shake: 3, parts: 5, text: '-🍄', cls: 'bad' });
        press('bite');
        break;
      case 'wither':
        react(i, { color: COL.dim, flash: 200, amp: 2, parts: 4, text: '시듦 -1칸', cls: 'bad' });
        press('wither');
        break;
      case 'heart':
        fullFlash(COL.danger, 200);
        react(i, { color: COL.danger, flash: 200, amp: 3 + e.n * 2, shake: 6 + e.n * 3, parts: 12, text: '-' + e.n + '♥', cls: 'bad', big: true });
        chipPop('hud-heart'); press('heart'); window.Sfx.vibrate(80);
        break;
      case 'steal':
        react(i, { color: COL.danger, flash: 160, amp: 1.5 + Math.min(5, e.n * 0.6), shake: Math.min(8, 2 + e.n), parts: 2 + Math.min(8, e.n),
          text: '-' + e.n + '⚡', cls: 'bad', big: e.n >= 5 });
        chipPop('hud-energy'); press('steal');
        break;
      case 'event':
        banner('사건 · ' + e.ev.name); press('event');
        break;
      case 'skill':
        banner('기술 · ' + GM.strainDef().skill.name); press('skill'); burst(GM.CENTER, COL.tree, 14); window.Sfx.vibrate(20);
        break;
      case 'dayStart':
        banner((GM.get().day) + '일째 아침'); press('day');
        break;
      case 'deny':
        denyAt(e.i);
        break;
      case 'forestWin':
        fullFlash(COL.spore, 200);
        react(GM.CENTER, { color: COL.spore, flash: 200, amp: 3, shake: 3, parts: 16, text: '숲 넘김! ' + (e.stage || '') + '번째', cls: 'spore', big: true });
        press('win');
        break;
      case 'reward':
        react(GM.CENTER, { color: COL.spore, flash: 160, amp: 2, parts: 8, text: '🧬 ' + ((byId(D.TRAITS, e.id) || {}).name || ''), cls: 'spore' });
        press('reward');
        break;
      case 'runEnd':
        press(e.won ? 'win' : 'lose');
        if (e.won) {
          fullFlash(COL.spore, 200);
          react(GM.CENTER, { color: COL.spore, flash: 200, amp: 3, shake: 3, parts: 18, text: '승리! +' + (GM.get().score || 0), cls: 'spore', big: true });
        } else {
          fullFlash(COL.danger, 200);
          react(GM.CENTER, { color: COL.danger, flash: 200, amp: 6, shake: 8, parts: 14, text: '패배 ' + (GM.get().score || 0) + '점', cls: 'bad', big: true });
        }
        break;
    }
    if (e.type === 'change' || e.type === 'runEnd' || e.type === 'forestWin' || e.type === 'reward') {
      renderAll();
      saveRun();
      syncPhase();
    }
  }
  GM.on(onGame);

  function saveRun() {
    if (ui.sim) return;
    var G = GM.get();
    if (!G || G.sim) return;
    if (G.over) { S.clearRun(); return; }
    S.saveRun(G);
  }

  // ---------- HUD·옆 칸 ----------
  function renderAll() {
    if (ui.sim) return;
    var G = GM.get();
    if (!G || !G.hexes) return;
    var F = GM.forestDef();
    $('hud-forest').textContent = '숲 ' + (G.forest + 1) + ' · ' + F.name;
    $('hud-day').textContent = G.day + '/' + G.days + '일';
    $('hud-spores').textContent = G.spores + '/' + G.goal;
    $('hud-spore-bar').style.width = Math.min(100, G.spores / G.goal * 100) + '%';
    $('hud-energy').textContent = '⚡ ' + G.energy + '/' + GM.cap();
    $('hud-heart').textContent = '♥ ' + Math.max(0, G.heart) + '/' + G.heartMax;
    // 읽어 주는 기능이 숫자까지 읽도록 이름표에도 값을 넣는다
    $('hud-energy').setAttribute('aria-label', '기운 ' + G.energy + '/' + GM.cap());
    $('hud-heart').setAttribute('aria-label', '심장 ' + Math.max(0, G.heart) + '/' + G.heartMax);
    $('hud-spores').parentNode.setAttribute('aria-label', '포자 ' + G.spores + '/' + G.goal);
    // 수입
    $('income-total').textContent = '+' + G.lastIncome;
    var il = $('income-list'); il.innerHTML = '';
    // 나무마다 길이·깎인 양을 모두 보인다 (자르지 않고 목록이 스크롤된다)
    (G.incomeParts || []).forEach(function (pt) {
      var li = el('li', '', '<span>' + esc(pt.label) + (pt.d ? ' <small>(' + pt.d + '칸' + (pt.loss ? ', -' + pt.loss : '') + ')</small>' : '') + '</span><span class="good">+' + pt.v + '</span>');
      il.appendChild(li);
    });
    // 위협
    var tl = $('threat-list'); tl.innerHTML = '';
    var groups = {};
    G.threats.forEach(function (t) { groups[t.id] = (groups[t.id] || 0) + 1; });
    var keys = Object.keys(groups);
    if (!keys.length) tl.appendChild(el('li', '', '<span>조용하다</span>'));
    keys.slice(0, 6).forEach(function (k) {
      var td = GM.threatDef(k);
      tl.appendChild(el('li', '', '<span>' + td.icon + ' ' + esc(td.name) + '</span><span class="bad">×' + groups[k] + '</span>'));
    });
    // 소식
    var ll = $('log-list'); ll.innerHTML = '';
    G.log.slice(0, 8).forEach(function (m) { ll.appendChild(el('li', '', esc(m))); });
    // 버튼
    ['grow', 'fruit', 'thick'].forEach(function (m) { $('btn-mode-' + m).classList.toggle('on', ui.mode === m); });
    var sk = GM.strainDef().skill;
    var sb = $('btn-skill');
    sb.innerHTML = esc(sk.name) + '<small>' + (G.skillCd > 0 ? G.skillCd + '일 뒤 · R' : '쓸 수 있음 · R') + '</small>';
    sb.disabled = !GM.canSkill();
    sb.setAttribute('aria-label', '기술 ' + sk.name + ': ' + sk.desc);
    $('btn-end').disabled = G.phase !== 'play';
    renderInfo();
    requestDraw();
  }

  function renderInfo() {
    var G = GM.get();
    var box = $('hex-info');
    if (!G || !G.hexes || ui.cursor < 0) { box.textContent = '칸을 눌러 보세요.'; return; }
    var i = ui.cursor, h = G.hexes[i];
    var f = GM.flow();
    var lines = [];
    var tname = D.TERRAIN[h.t] ? D.TERRAIN[h.t].name : '';
    if (h.heart) lines.push('<b>♥ 심장</b> — 망의 뿌리. 다치면 안 된다.');
    else if (h.t === 'tree') {
      var td = GM.treeDef(h.tree);
      var pp = GM.partners(f).filter(function (p) { return p.i === i; })[0];
      lines.push('<b>' + td.icon + ' ' + esc(td.name) + '</b> 기운 ' + td.yield);
      lines.push(esc(td.desc));
      lines.push(pp ? '짝 맺음 · 심장에서 ' + pp.d + '칸' : '곁 칸을 망에 이으면 짝을 맺는다.');
    } else {
      var mk = D.TERRAIN[h.t] && D.TERRAIN[h.t].mark;
      lines.push('<b>' + esc(tname) + '</b>' + (mk ? ' <small>(무늬: ' + esc(mk) + ')</small>' : '') + (h.owned ? (f.conn[i] ? ' · 이어진 망' : ' · <span style="color:var(--c-danger)">끊김 (시듦 ' + h.wither + ')</span>') : ''));
    }
    if (h.thick) lines.push('굵기 ' + h.thick);
    if (h.mush) {
      var md = GM.mushDef(h.mush);
      lines.push('🍄 ' + esc(md.name) + ' — 밤마다 포자 ' + (f.conn[i] ? GM.sporeOf(i) : 0));
    }
    var t = GM.threatAt(i);
    if (t) { var thd = GM.threatDef(t.id); lines.push(thd.icon + ' <b>' + esc(thd.name) + '</b> 체력 ' + t.hp + ' — ' + esc(thd.desc)); }
    if (G.phase === 'play') {
      var no = '<span style="color:var(--c-danger)">안 됨 — ';
      if (ui.mode === 'grow') lines.push(GM.canGrow(i, f) ? '뻗기: 기운 ' + GM.growCost(i) + (GM.moldAt(i) ? ' (삭이기)' : '') : '뻗기: ' + no + esc(GM.why(i, 'grow', f)) + '</span>');
      if (ui.mode === 'fruit') lines.push(GM.canFruit(i, f) ? '버섯: 기운 ' + GM.fruitCost(i) + ' → ' + esc(GM.mushDef(GM.mushKind(i)).name) : '버섯: ' + no + esc(GM.why(i, 'fruit', f)) + '</span>');
      if (ui.mode === 'thick') lines.push(GM.canThick(i) ? '굵히기: 기운 ' + GM.thickCost(i) : '굵히기: ' + no + esc(GM.why(i, 'thick', f)) + '</span>');
    }
    box.innerHTML = lines.filter(Boolean).join('<br>');
  }

  // ---------- 겹침 화면 내용 ----------
  function renderIntro() {
    var G = GM.get();
    var F = GM.forestDef();
    $('intro-kicker').textContent = (G.daily ? '오늘의 도전 ' + G.daily + ' · ' : '') + '숲 ' + (G.forest + 1) + ' / ' + D.FORESTS.length;
    $('intro-name').textContent = F.name;
    $('intro-desc').textContent = F.desc;
    var stage = G.forest + 1;
    var newOnes = D.THREATS.filter(function (t) { return t.minForest === stage; }).map(function (t) { return t.icon + ' ' + t.name; });
    if (stage === 8) newOnes.push('🦌 큰 사슴벌레 (4·9일)');
    $('intro-goal').innerHTML = '<span>✦ 포자 ' + G.goal + '</span><span>📅 ' + G.days + '일</span><span>♥ ' + G.heart + '/' + G.heartMax + '</span>' +
      (newOnes.length ? '<span>새 위협: ' + esc(newOnes.join(', ')) + '</span>' : '');
  }

  function renderReward() {
    var G = GM.get();
    var box = $('reward-list');
    box.innerHTML = '';
    G.reward.forEach(function (id, k) {
      var t = byId(D.TRAITS, id);
      var b = el('button', 'card', '<b>' + esc(t.name) + '</b><span>' + esc(t.desc) + '</span><span>' + (k + 1) + '</span>');
      b.addEventListener('click', function () { if (ui.lock) return; press('click'); window.Sfx.vibrate(15); GM.pickReward(k); });
      box.appendChild(b);
    });
  }

  function renderPause() {
    var G = GM.get();
    var box = $('pause-traits');
    box.innerHTML = '';
    if (!G) return;
    var s = GM.strainDef();
    box.appendChild(el('span', '', s.icon + ' ' + esc(s.name)));
    G.traits.forEach(function (id) { box.appendChild(el('span', '', esc(byId(D.TRAITS, id).name))); });
  }

  // ---------- 결과 ----------
  function finishRun() {
    var G = GM.get();
    if (!G || ui.sim) return;
    if (ui.lastResult === G) { if (ui.screen !== 'screen-result') forceScreen('screen-result'); return; }
    ui.lastResult = G;
    var rec = GM.runRecord();
    var res = S.recordRun(rec);
    S.clearRun();
    var why = { heart: '심장이 다쳐 망이 무너졌다', time: '날이 다 가도록 포자가 모자랐다', giveup: '이 판을 그만두었다', win: '여덟 숲을 모두 넘겼다' }[G.endWhy] || '';
    $('result-title').textContent = G.won ? '숲 심장에 닿았다!' : '숲을 떠났다';
    $('result-sub').textContent = (G.daily ? '오늘의 도전 ' + G.daily + ' · ' : '') + GM.forestDef().name + ' · ' + why;
    var st = $('result-stats'); st.innerHTML = '';
    [['점수', G.score], ['넘긴 숲', G.stats.cleared + '/8'], ['모은 포자', G.totalSpores], ['쓰러뜨린 위협', G.stats.kills],
     ['뻗은 칸', G.stats.grown], ['피운 버섯', G.stats.mush], ['형질', G.traits.length], ['시간', fmtTime(G.simTime)]].forEach(function (x) {
      st.appendChild(el('div', 'stat', '<b>' + esc(x[1]) + '</b><span>' + esc(x[0]) + '</span>'));
    });
    $('result-best').textContent = (res.newBest ? '새 최고 점수!' : '최고 점수 ' + S.data().best.score) +
      (G.daily ? ' · 오늘의 도전은 내일 새 판이 열린다' : '');
    $('result-ach').textContent = res.fresh.length ? '새 업적: ' + res.fresh.map(function (a) { return a.name; }).join(', ') : '';
    forceScreen('screen-result');
  }
  function fmtTime(sec) {
    sec = Math.round(sec || 0);
    return Math.floor(sec / 60) + '분 ' + (sec % 60) + '초';
  }

  // ---------- 설정 ----------
  var SETTINGS = [
    { k: 'sound', name: '소리' },
    { k: 'volume', name: '소리 크기', cycle: ['끔', '작게', '보통', '크게'] },
    { k: 'vibrate', name: '진동' },
    { k: 'shake', name: '화면 흔들림' },
    { k: 'reduce', name: '움직임 줄이기' },
    { k: 'floats', name: '튀는 숫자' },
    { k: 'big', name: '큰 글씨' },
    { k: 'tutorial', name: '첫 판 안내' }
  ];
  function renderSettings() {
    var box = $('settings-list');
    box.innerHTML = '';
    var s = S.settings();
    SETTINGS.forEach(function (it) {
      var row = el('div', 'set-row');
      row.appendChild(el('span', '', esc(it.name)));
      var b = el('button', 'btn');
      if (it.cycle) { b.textContent = it.cycle[s[it.k]] || '보통'; b.classList.add('on'); }
      else { b.textContent = s[it.k] ? '켬' : '끔'; b.classList.toggle('on', !!s[it.k]); }
      b.setAttribute('aria-label', it.name + ' 바꾸기');
      b.addEventListener('click', function () {
        if (ui.lock) return;
        if (it.cycle) S.setSetting(it.k, (s[it.k] + 1) % it.cycle.length);
        else S.setSetting(it.k, !s[it.k]);
        applySettings();
        press('click');
        renderSettings();
      });
      row.appendChild(b);
      box.appendChild(row);
    });
  }

  // ---------- 도감 ----------
  var CODEX = [
    { k: 'tree', name: '나무', list: function () { return D.TREES; }, icon: function (x) { return x.icon; } },
    { k: 'threat', name: '위협', list: function () { return D.THREATS; }, icon: function (x) { return x.icon; } },
    { k: 'mush', name: '버섯', list: function () { return D.MUSHROOMS; }, icon: function () { return '🍄'; } },
    { k: 'trait', name: '형질', list: function () { return D.TRAITS; }, icon: function () { return '🧬'; } },
    { k: 'event', name: '사건', list: function () { return D.EVENTS; }, icon: function (x) { return x.good ? '🌤' : '⛈'; } },
    { k: 'strain', name: '균주', list: function () { return D.STRAINS; }, icon: function (x) { return x.icon; } }
  ];
  function renderCodex() {
    var d = S.data();
    var tabs = $('codex-tabs'); tabs.innerHTML = '';
    var total = 0, got = 0;
    CODEX.forEach(function (c) {
      var lst = c.list();
      total += lst.length;
      lst.forEach(function (x) { if (d.seen[c.k] && d.seen[c.k][x.id]) got++; });
      var b = el('button', 'btn' + (ui.codexTab === c.k ? ' on' : ''), esc(c.name));
      b.setAttribute('role', 'tab');
      b.addEventListener('click', function () { if (ui.lock) return; ui.codexTab = c.k; press('click'); renderCodex(); });
      tabs.appendChild(b);
    });
    $('codex-count').textContent = got + '/' + total;
    var cur = CODEX.filter(function (c) { return c.k === ui.codexTab; })[0] || CODEX[0];
    var grid = $('codex-grid'); grid.innerHTML = '';
    cur.list().forEach(function (x) {
      var on = !!(d.seen[cur.k] && d.seen[cur.k][x.id]);
      grid.appendChild(el('div', 'codex-item' + (on ? ' on' : ''),
        on ? '<span class="ico">' + cur.icon(x) + '</span><b>' + esc(x.name) + '</b>' + esc(x.desc || '') : '<span class="ico">?</span><b>???</b>아직 만나지 못했다'));
    });
  }

  // ---------- 기록 ----------
  function renderRecords() {
    var d = S.data();
    var st = $('rec-stats'); st.innerHTML = '';
    [['판', d.totals.runs], ['이긴 판', d.totals.wins], ['최고 점수', d.best.score], ['가장 깊은 숲', d.best.stage],
     ['모은 포자', d.totals.spores], ['쓰러뜨린 위협', d.totals.kills], ['뻗은 칸', d.totals.grown], ['피운 버섯', d.totals.mush],
     ['넘긴 숲', d.totals.forests], ['평균 점수', d.history.length ? Math.round(d.history.reduce(function (a, h) { return a + h.score; }, 0) / d.history.length) : 0],
     ['한 시간', fmtTime(d.totals.playSec)]].forEach(function (x) {
      st.appendChild(el('div', 'stat', '<b>' + esc(x[1]) + '</b><span>' + esc(x[0]) + '</span>'));
    });
    var hl = $('rec-history'); hl.innerHTML = '';
    if (!d.history.length) hl.appendChild(el('li', '', '아직 끝낸 판이 없다.'));
    d.history.forEach(function (h) {
      var s = byId(D.STRAINS, h.strain), df = byId(D.DIFFS, h.diff);
      hl.appendChild(el('li', '', esc(h.date + ' · ' + s.name + ' · ' + df.name + ' · 숲 ' + h.cleared + '/8 · 포자 ' + h.spores + ' · 점수 ' + h.score + (h.won ? ' · 이김' : '') + (h.daily ? ' · 오늘의 도전' : ''))));
    });
    var ag = $('rec-ach'); ag.innerHTML = '';
    var got = 0;
    D.ACHIEVEMENTS.forEach(function (a) {
      var on = !!d.ach[a.id];
      if (on) got++;
      ag.appendChild(el('div', 'ach' + (on ? ' on' : ''), '<b>' + (on ? '★ ' : '☆ ') + esc(a.name) + '</b>' + esc(a.desc)));
    });
    $('rec-ach-count').textContent = got + '/' + D.ACHIEVEMENTS.length;
  }

  // ---------- 확인 ----------
  function askConfirm(title, text, fn) {
    ui.confirmFn = fn;
    ui.prevOverlay = ui.overlay;
    $('confirm-title').textContent = title;
    $('confirm-text').textContent = text;
    forceOverlay('overlay-confirm');
  }
  function closeConfirm(yes) {
    var fn = ui.confirmFn;
    ui.confirmFn = null;
    var prev = ui.prevOverlay;
    ui.prevOverlay = null;
    forceOverlay(prev && prev !== 'overlay-confirm' ? prev : null);
    if (yes && fn) fn();
  }

  // ---------- 칸 누르기 ----------
  function doAt(i) {
    var G = GM.get();
    if (!G || G.phase !== 'play' || ui.overlay) return false;
    if (ui.mode === 'grow') return GM.canGrow(i) ? GM.grow(i) : false;
    if (ui.mode === 'fruit') return GM.canFruit(i) ? GM.fruit(i) : false;
    if (ui.mode === 'thick') return GM.canThick(i) ? GM.thicken(i) : false;
    return false;
  }
  // 틀림: 고른 행동을 할 수 없는 칸을 눌렀다 — 빨간 번쩍임·흔들림·'안 됨'·조각 + 소리
  function denyAt(i) {
    react(i, { color: COL.danger, flash: 120, amp: 3, pop: false, parts: 3, text: '안 됨', cls: 'bad' });
    press('deny');
  }
  function canAct() {
    var G = GM.get();
    return !!(G && G.phase === 'play' && !ui.overlay);
  }
  function tapHex(i) {
    if (i < 0) return;
    ui.cursor = i;
    if (!doAt(i)) {
      if (canAct()) denyAt(i);
      renderInfo(); requestDraw();
    }
  }
  function setMode(m) {
    ui.mode = m;
    press('click');
    renderAll();
  }
  function endDay() {
    var G = GM.get();
    if (!G || G.phase !== 'play' || ui.overlay) return;
    window.Sfx.vibrate(10);
    GM.endDay();
  }
  function useSkill() {
    if (ui.overlay) return;
    GM.useSkill();
  }
  function openPause() {
    var G = GM.get();
    if (!G || ui.screen !== 'screen-game' || ui.overlay) return;
    renderPause();
    go('overlay-pause');
  }

  cv.addEventListener('pointerdown', function (ev) {
    window.Sfx.unlock();
    ev.preventDefault();
    if (ui.lock) return;
    var r = cv.getBoundingClientRect();
    tapHex(pixelHex(ev.clientX - r.left, ev.clientY - r.top));
  });

  // ---------- 버튼 연결 ----------
  function on(id, fn) {
    var b = $(id);
    if (!b) return;
    b.addEventListener('click', function (ev) { window.Sfx.unlock(); if (ui.lock) return; fn(ev); });
  }
  on('btn-start', function () { press('click'); go('screen-setup'); });
  on('btn-daily', function () {
    var today = todayKey();
    if (!S.startDaily(today)) { press('deny'); renderTitle(); banner('오늘의 도전은 오늘 이미 했다 · 내일 새 판이 열린다'); return; }
    startRun(null, 'normal', today);
  });
  on('btn-continue', function () {
    var saved = S.loadRun();
    if (saved && GM.load(saved)) {
      ui.cursor = GM.CENTER;
      press('start');
      go('screen-game');
      syncPhase();
    } else { S.clearRun(); renderTitle(); }
  });
  on('btn-help', function () { press('click'); ui.back = 'screen-title'; go('screen-help'); });
  on('btn-settings', function () { press('click'); ui.back = 'screen-title'; go('screen-settings'); });
  on('btn-codex', function () { press('click'); go('screen-codex'); });
  on('btn-records', function () { press('click'); go('screen-records'); });
  on('btn-setup-back', function () { press('click'); go('screen-title'); });
  on('btn-setup-go', function () { startRun(ui.setupStrain, ui.setupDiff); });
  on('btn-mode-grow', function () { setMode('grow'); });
  on('btn-mode-fruit', function () { setMode('fruit'); });
  on('btn-mode-thick', function () { setMode('thick'); });
  on('btn-skill', function () { useSkill(); });
  on('btn-end', function () { endDay(); });
  on('btn-pause', function () { press('click'); openPause(); });
  on('btn-resume', function () { press('click'); go(null); syncPhase(); });
  on('btn-pause-help', function () { press('click'); ui.back = 'screen-game'; go('screen-help'); });
  on('btn-pause-settings', function () { press('click'); ui.back = 'screen-game'; go('screen-settings'); });
  on('btn-giveup', function () {
    press('click');
    askConfirm('이 판을 그만둘까요?', '지금까지 모은 포자로 점수를 매기고 끝낸다.', function () { GM.giveUp(); });
  });
  on('btn-intro-go', function () { press('start'); GM.ackIntro(); });
  on('btn-again', function () {
    var G = GM.get();
    // 오늘의 도전은 하루 한 번 — 다시 하기는 보통 판(마지막으로 고른 균주·난이도)으로 연다
    if (!G || G.daily) startRun(ui.setupStrain, ui.setupDiff);
    else startRun(G.strain, G.diff);
  });
  on('btn-home', function () { press('click'); go('screen-title'); });
  function backFrom() {
    press('click');
    var target = ui.back || 'screen-title';
    var G = GM.get();
    if (target === 'screen-game' && (!G || G.over)) target = 'screen-title';
    if (go(target) && target === 'screen-game') { renderPause(); forceOverlay('overlay-pause'); }
    ui.back = 'screen-title';
  }
  on('btn-help-back', backFrom);
  on('btn-settings-back', backFrom);
  on('btn-codex-back', function () { press('click'); go('screen-title'); });
  on('btn-records-back', function () { press('click'); go('screen-title'); });
  on('btn-wipe', function () {
    press('click');
    askConfirm('기록을 모두 지울까요?', '최고 점수·업적·도감·설정·이어하기가 모두 지워진다. 되돌릴 수 없다.', function () {
      S.wipe();
      applySettings();
      renderSettings();
      renderTitle();
      banner('기록을 지웠다');
    });
  });
  on('btn-tutor-next', function () { press('click'); tutorNext(); });
  on('btn-tutor-off', function () { press('click'); S.setSetting('tutorial', false); tutorHide(); banner('첫 판 안내를 껐다 · 설정에서 다시 켤 수 있다'); });
  on('btn-confirm-yes', function () { press('click'); closeConfirm(true); });
  on('btn-confirm-no', function () { press('click'); closeConfirm(false); });

  // 버튼 눌림 표시 (키보드로 누를 때도)
  function flashButton(id) {
    var b = $(id);
    if (!b) return;
    b.classList.add('pressed');
    setTimeout(function () { b.classList.remove('pressed'); }, 120);
  }

  // ---------- 키보드 ----------
  var KEY_DIRS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  document.addEventListener('keydown', function (ev) {
    window.Sfx.unlock();
    var k = ev.key;
    var G = GM.get();
    if (k === 'Escape') {
      if (ui.overlay === 'overlay-confirm') { closeConfirm(false); return; }
      if (ui.screen === 'screen-game') {
        if (ui.overlay === 'overlay-pause') { go(null); syncPhase(); } else openPause();
        return;
      }
      if (ui.screen === 'screen-help' || ui.screen === 'screen-settings') { backFrom(); return; }
      if (ui.screen !== 'screen-title') { go('screen-title'); }
      return;
    }
    if (ui.screen !== 'screen-game' || !G) return;
    if (ui.lock) return;   // 화면 전환 중에는 판 조작 키도 받지 않는다
    if (ui.overlay === 'overlay-intro' && (k === 'Enter' || k === ' ')) { ev.preventDefault(); GM.ackIntro(); return; }
    if (ui.overlay === 'overlay-reward' && (k === '1' || k === '2' || k === '3')) { GM.pickReward(+k - 1); return; }
    if (ui.overlay) return;
    if (KEY_DIRS[k]) {
      ev.preventDefault();
      var hx = GM.HEX[ui.cursor] || GM.HEX[GM.CENTER];
      var dq = KEY_DIRS[k][0], dr = KEY_DIRS[k][1];
      for (var j = 0; j < GM.HEX.length; j++) {
        if (GM.HEX[j].q === hx.q + dq && GM.HEX[j].r === hx.r + dr) { ui.cursor = j; break; }
      }
      renderInfo(); requestDraw();
      return;
    }
    if (k === ' ' || k === 'Spacebar') { ev.preventDefault(); flashButton('btn-end'); endDay(); return; }
    if (k === 'Enter') { ev.preventDefault(); if (!doAt(ui.cursor)) { if (canAct()) denyAt(ui.cursor); else press('deny'); } return; }
    var lk = k.toLowerCase();
    if (lk === 'q') { flashButton('btn-mode-grow'); setMode('grow'); }
    else if (lk === 'w') { flashButton('btn-mode-fruit'); setMode('fruit'); }
    else if (lk === 'e') { flashButton('btn-mode-thick'); setMode('thick'); }
    else if (lk === 'r') { flashButton('btn-skill'); useSkill(); }
  });

  // ---------- 시간·숨김 ----------
  setInterval(function () {
    if (ui.sim || document.hidden) return;
    var G = GM.get();
    if (!G || G.phase !== 'play' || ui.screen !== 'screen-game' || ui.overlay) return;
    GM.advance(1000);
  }, 1000);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && ui.screen === 'screen-game' && !ui.overlay && !ui.sim) { renderPause(); forceOverlay('overlay-pause'); }
  });
  window.addEventListener('resize', function () { if (!ui.sim) resize(); });
  window.addEventListener('orientationchange', function () { setTimeout(resize, 200); });
  document.addEventListener('pointerdown', function () { window.Sfx.unlock(); }, { once: true });

  // ---------- 시험 훅 (화면 버튼과 같은 게임 함수를 부른다) ----------
  window.__test = {
    reset: function (seed) {
      ui.sim = true;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      GM.newRun({ strain: 'white', diff: 'normal', sim: true, seed: seed });
      return true;
    },
    actions: function () { return GM.actions(); },
    act: function (a) { return GM.act(a); },
    advance: function (ms) { GM.advance(ms); },
    state: function () { return GM.state(); }
  };

  // ---------- 시작 ----------
  applySettings();
  readColors();
  renderTitle();
  if (mqReduce && mqReduce.addEventListener) mqReduce.addEventListener('change', applySettings);
})();
