/* Tide Haul — 바다 판 그리기 (Canvas 2D). 규칙은 바꾸지 않고 Game.run() 을 읽기만 한다 */
'use strict';

var Render = (function () {
  var cv = null, ctx = null, dpr = 1, cw = 0, ch = 0, cell = 30, ox = 0;
  var camY = 0, raf = 0, active = false, col = {}, parts = [], need = null, lastT = 0;
  var ROWS_VIEW = 7;

  function init() {
    cv = document.getElementById('cv');
    ctx = cv.getContext('2d');
    readColors();
  }
  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    ['--z0', '--z1', '--z2', '--z3', '--z4', '--sky', '--rock', '--rock2', '--sand', '--kelp', '--current', '--vent',
      '--diver', '--rope', '--fog', '--hull', '--mint', '--danger', '--gold', '--text', '--accent', '--bg', '--ink', '--good']
      .forEach(function (k) { col[k] = cs.getPropertyValue(k).trim() || '#000000'; });
  }
  function resize() {
    if (!cv) return;
    var wrap = cv.parentElement, r = wrap.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cw = Math.max(60, Math.floor(r.width));
    ch = Math.max(60, Math.floor(r.height));
    cv.width = cw * dpr; cv.height = ch * dpr;
    cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    cell = Math.max(12, Math.floor(Math.min(cw / DATA.W, ch / ROWS_VIEW)));
    ox = Math.floor((cw - cell * DATA.W) / 2);
  }
  function setNeed(info) { need = info; }
  function reduce() { var m = Store.get(); return m && m.settings.reduce; }

  /* 그리기 고리: 게임 전체가 이 requestAnimationFrame 하나만 쓴다.
     잠수 화면이 보이고 멈추지 않았을 때만 판을 그리고, 그 밖에는 맡긴 일(frame)이 남았을 때만 돈다 */
  var paused = false, tasks = [];
  function want() { return (active && !paused) || tasks.length > 0; }
  function kick() { if (!raf && want()) raf = requestAnimationFrame(loop); }
  function start() { active = true; kick(); }
  function stop() {
    active = false;
    if (raf && !tasks.length) { cancelAnimationFrame(raf); raf = 0; }
  }
  // 겹침 화면·숨긴 탭·세로 화면 동안은 판을 다시 그리지 않는다
  function pause(on) {
    on = !!on;
    if (paused === on) return;
    paused = on;
    if (!on) lastT = 0;
    kick();
  }
  function frame(fn) { tasks.push(fn); kick(); }
  // 멈춘 채 캔버스 크기가 바뀌면(크기를 바꾸면 캔버스가 지워진다) 한 장만 다시 그린다
  function redraw() { if (active && paused) frame(draw); }
  function loop(t) {
    raf = 0;
    t = t || 0;
    var run = tasks;
    tasks = [];
    for (var i = 0; i < run.length; i++) run[i](t);
    if (active && !paused) draw(t);
    kick();
  }

  function visRows() { return Math.ceil(ch / cell) + 1; }
  function camTarget(r) {
    var rows = ch / cell;
    var t = r.p.y - rows * 0.42;
    return Math.max(0, Math.min(DATA.H - rows, t));
  }
  function toScreen(x, y) { return { x: ox + x * cell + cell / 2, y: (y - camY) * cell + cell / 2 }; }

  function zoneColor(y) {
    if (y === 0) return col['--sky'];
    return col[DATA.ZONES[Game.zoneOf(y)].color];
  }

  function draw(t) {
    var r = Game.run();
    if (!ctx || !r || !r.map || !r.p) return;
    var dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    var target = camTarget(r);
    camY += reduce() ? (target - camY) : (target - camY) * Math.min(1, dt * 8);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = col['--fog'];
    ctx.fillRect(0, 0, cw, ch);
    var y0 = Math.max(0, Math.floor(camY)), y1 = Math.min(DATA.H - 1, y0 + visRows());
    var map = r.map, rad = Game.radius(), p = r.p, x, y;
    // 물과 칸
    for (y = y0; y <= y1; y++) {
      var sy = (y - camY) * cell;
      ctx.fillStyle = zoneColor(y);
      ctx.fillRect(ox, sy, cell * DATA.W, cell + 1);
      for (x = 0; x < DATA.W; x++) {
        var c = map.cells[y][x], sx = ox + x * cell;
        if (!map.seen[y][x]) continue;
        drawCell(c, sx, sy, t);
      }
    }
    // 배
    drawBoat(t);
    // 줄 (지나온 길)
    drawTrail(r);
    // 돌아갈 길
    var m = Store.get();
    if (m.settings.showPath && need && need.path && need.path.length > 1 && p.y > 0) drawPath(need.path, r.air >= need.need);
    // 보물·생물
    for (y = y0; y <= y1; y++) {
      for (x = 0; x < DATA.W; x++) {
        if (!map.seen[y][x]) continue;
        var it = map.items[y * DATA.W + x];
        if (it) drawIcon(Game.T[it.t].icon, x, y, 0.62, it.dropped ? 0.6 : 1, t, x + y);
      }
    }
    map.cr.forEach(function (c) {
      var def = Game.C[c.t];
      var near = Math.max(Math.abs(c.x - p.x), Math.abs(c.y - p.y)) <= rad;
      if (near || (def.stay && map.seen[c.y][c.x])) drawIcon(def.icon, c.x, c.y, 0.66, near ? 1 : 0.55, t, c.x * 3 + c.y);
    });
    // 안개: 안 본 칸은 짙게(구역 물색은 비치게), 본 칸이라도 등불 밖은 흐리게
    for (y = y0; y <= y1; y++) {
      var fy = (y - camY) * cell;
      for (x = 0; x < DATA.W; x++) {
        var d = Math.max(Math.abs(x - p.x), Math.abs(y - p.y));
        if (!map.seen[y][x]) { ctx.globalAlpha = 0.8; }
        else if (d > rad) { ctx.globalAlpha = 0.45; }
        else continue;
        ctx.fillStyle = col['--fog'];
        ctx.fillRect(ox + x * cell, fy, cell + 0.5, cell + 0.5);
      }
    }
    ctx.globalAlpha = 1;
    drawDiver(r, t);
    drawPress(p);
    drawParts(dt);
    // 판 가장자리
    ctx.strokeStyle = col['--ink'];
    ctx.globalAlpha = 0.5;
    ctx.strokeRect(ox + 0.5, -1, cell * DATA.W - 1, ch + 2);
    ctx.globalAlpha = 1;
  }

  function rr(x, y, w, h, rad) {
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  function drawCell(c, sx, sy, t) {
    var k = cell;
    if (c.t === '#') {
      ctx.fillStyle = col['--rock2'];
      rr(sx + 1, sy + 1, k - 2, k - 2, k * 0.28); ctx.fill();
      ctx.fillStyle = col['--rock'];
      rr(sx + 3, sy + 2, k - 7, k - 8, k * 0.24); ctx.fill();
    } else if (c.t === 's') {
      ctx.fillStyle = col['--sand'];
      ctx.globalAlpha = 0.55;
      rr(sx + 2, sy + k * 0.55, k - 4, k * 0.4, k * 0.18); ctx.fill();
      ctx.globalAlpha = 0.9;
      for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(sx + k * (0.25 + i * 0.25), sy + k * 0.72, k * 0.05, 0, 6.3); ctx.fill(); }
      ctx.globalAlpha = 1;
    } else if (c.t === 'k') {
      ctx.strokeStyle = col['--kelp'];
      ctx.lineWidth = Math.max(2, k * 0.09);
      var sway = reduce() ? 0 : Math.sin(t / 600 + sx) * k * 0.08;
      for (var j = 0; j < 3; j++) {
        var bx = sx + k * (0.25 + j * 0.25);
        ctx.beginPath(); ctx.moveTo(bx, sy + k);
        ctx.quadraticCurveTo(bx + sway + k * 0.12, sy + k * 0.5, bx + sway, sy + k * 0.12);
        ctx.stroke();
      }
    } else if (c.t === 'c') {
      ctx.strokeStyle = col['--current'];
      ctx.lineWidth = Math.max(2, k * 0.07);
      ctx.globalAlpha = 0.85;
      var cx = sx + k / 2, cy = sy + k / 2, a = c.dir === 'left' ? Math.PI : c.dir === 'right' ? 0 : Math.PI / 2;
      var off = reduce() ? 0 : ((t / 400) % 1) * k * 0.15;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.translate(off - k * 0.07, 0);
      ctx.beginPath(); ctx.moveTo(-k * 0.28, 0); ctx.lineTo(k * 0.22, 0);
      ctx.moveTo(k * 0.08, -k * 0.14); ctx.lineTo(k * 0.24, 0); ctx.lineTo(k * 0.08, k * 0.14); ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    } else if (c.t === 'b') {
      ctx.strokeStyle = col['--vent'];
      ctx.lineWidth = 2;
      for (var b = 0; b < 3; b++) {
        var ph = reduce() ? b / 3 : ((t / 900 + b / 3) % 1);
        ctx.globalAlpha = 1 - ph;
        ctx.beginPath(); ctx.arc(sx + k * (0.35 + b * 0.15), sy + k * (0.85 - ph * 0.7), k * (0.08 + b * 0.03), 0, 6.3); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawIcon(icon, x, y, scale, alpha, t, seed) {
    var s = toScreen(x, y);
    var bob = reduce() ? 0 : Math.sin(t / 500 + seed) * cell * 0.04;
    ctx.globalAlpha = alpha;
    ctx.font = Math.floor(cell * scale) + 'px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(icon, s.x, s.y + bob);
    ctx.globalAlpha = 1;
  }

  function drawBoat(t) {
    var s = toScreen(DATA.BOAT_X, 0);
    if (s.y < -cell) return;
    var k = cell, rock = reduce() ? 0 : Math.sin(t / 700) * k * 0.05;
    ctx.save();
    ctx.translate(s.x, s.y - k * 0.12 + rock);
    ctx.fillStyle = col['--hull'];
    ctx.beginPath();
    ctx.moveTo(-k * 1.3, -k * 0.1); ctx.lineTo(k * 1.3, -k * 0.1); ctx.lineTo(k * 0.9, k * 0.3); ctx.lineTo(-k * 0.9, k * 0.3); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = col['--text'];
    ctx.fillRect(-k * 0.05, -k * 0.75, k * 0.06, k * 0.65);
    ctx.fillStyle = col['--accent'];
    ctx.beginPath(); ctx.moveTo(k * 0.02, -k * 0.75); ctx.lineTo(k * 0.5, -k * 0.35); ctx.lineTo(k * 0.02, -k * 0.3); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawTrail(r) {
    if (!r.trail || r.trail.length < 2) return;
    ctx.strokeStyle = col['--rope'];
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = Math.max(1.5, cell * 0.05);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    var start = Math.max(0, r.trail.length - 60);
    for (var i = start; i < r.trail.length; i++) {
      var s = toScreen(r.trail[i].x, r.trail[i].y);
      if (i === start) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // 색만으로 구분하지 않는다: 닿으면 긴 점선, 모자라면 짧은 점 줄 + 끝(배 아래 칸)에 ✕ 표
  function drawPath(path, ok) {
    ctx.strokeStyle = ok ? col['--mint'] : col['--danger'];
    ctx.lineWidth = Math.max(2, cell * 0.07);
    ctx.lineCap = ok ? 'butt' : 'round';
    ctx.setLineDash(ok ? [cell * 0.15, cell * 0.15] : [cell * 0.02, cell * 0.14]);
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    for (var i = 0; i < path.length; i++) {
      var s = toScreen(path[i].x, path[i].y);
      if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    if (!ok) {
      var e = toScreen(path[path.length - 1].x, path[path.length - 1].y), k = cell * 0.2;
      ctx.lineWidth = Math.max(2, cell * 0.09);
      ctx.beginPath();
      ctx.moveTo(e.x - k, e.y - k); ctx.lineTo(e.x + k, e.y + k);
      ctx.moveTo(e.x + k, e.y - k); ctx.lineTo(e.x - k, e.y + k);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.globalAlpha = 1;
  }

  function drawDiver(r, t) {
    var s = toScreen(r.p.x, r.p.y), k = cell;
    var bob = reduce() ? 0 : Math.sin(t / 380) * k * 0.05;
    var heavy = Math.min(1, Game.load() / Math.max(1, r.st.maxLoad));
    // 등불 빛
    var g = ctx.createRadialGradient(s.x, s.y, k * 0.2, s.x, s.y, k * (Game.radius() + 0.6));
    g.addColorStop(0, col['--gold']); g.addColorStop(1, col['--fog']);
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(s.x, s.y, k * (Game.radius() + 0.6), 0, 6.3); ctx.fill();
    ctx.globalAlpha = 1;
    // 가방 (무게에 따라 커짐)
    ctx.fillStyle = col['--hull'];
    rr(s.x - k * (0.42 + heavy * 0.12), s.y - k * 0.12 + bob, k * (0.22 + heavy * 0.12), k * (0.3 + heavy * 0.16), k * 0.06);
    ctx.fill();
    // 몸
    ctx.fillStyle = col['--diver'];
    ctx.beginPath(); ctx.arc(s.x, s.y + bob, k * 0.3, 0, 6.3); ctx.fill();
    // 투구 창
    ctx.fillStyle = col['--z2'];
    ctx.beginPath(); ctx.arc(s.x + k * 0.06, s.y - k * 0.03 + bob, k * 0.15, 0, 6.3); ctx.fill();
    ctx.strokeStyle = col['--accent'];
    ctx.lineWidth = Math.max(1.5, k * 0.05);
    ctx.stroke();
    // 숨 방울
    if (!reduce() && Math.random() < 0.04) addPart(s.x + k * 0.1, s.y - k * 0.3, col['--vent'], 1, 'bubble');
  }

  function addPart(x, y, color, n, kind) {
    var lim = reduce() ? 0 : n;
    for (var i = 0; i < lim; i++) {
      parts.push({ x: x, y: y, vx: (Math.random() - 0.5) * (kind === 'bubble' ? 10 : 90), vy: kind === 'bubble' ? -30 - Math.random() * 20 : -40 - Math.random() * 60,
        life: kind === 'bubble' ? 1.6 : 0.5, max: kind === 'bubble' ? 1.6 : 0.5, color: color, r: kind === 'bubble' ? cell * 0.07 : cell * 0.06, kind: kind });
    }
    if (parts.length > 160) parts.splice(0, parts.length - 160);
  }
  function burstAt(x, y, color, n) {
    var s = toScreen(x, y);
    addPart(s.x, s.y, color || col['--gold'], n || 10, 'spark');
  }
  function drawParts(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var q = parts[i];
      q.life -= dt;
      if (q.life <= 0) { parts.splice(i, 1); continue; }
      q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.kind !== 'bubble') q.vy += 160 * dt;
      ctx.globalAlpha = Math.max(0, q.life / q.max);
      if (q.kind === 'bubble') { ctx.strokeStyle = q.color; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.3); ctx.stroke(); }
      else { ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.3); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }

  /* 판 칸 눌림 표시: 누른 칸은 반투명 채움, 갈 방향의 이웃 칸은 테두리 */
  var press = null;
  function setPress(c) { press = c; }
  function drawPress(p) {
    if (!press) return;
    var k = cell, ddx = press.x - p.x, ddy = press.y - p.y;
    ctx.strokeStyle = col['--mint'];
    ctx.fillStyle = col['--mint'];
    ctx.lineWidth = Math.max(2, k * 0.08);
    if (press.x >= 0 && press.x < DATA.W && press.y >= 0 && press.y < DATA.H) {
      var s = toScreen(press.x, press.y);
      ctx.globalAlpha = 0.28;
      rr(s.x - k / 2 + 1, s.y - k / 2 + 1, k - 2, k - 2, k * 0.2); ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.stroke();
    }
    if (ddx || ddy) {
      var nx = p.x, ny = p.y;
      if (Math.abs(ddx) > Math.abs(ddy)) nx += ddx > 0 ? 1 : -1; else ny += ddy > 0 ? 1 : -1;
      if (nx !== press.x || ny !== press.y) {
        var n = toScreen(nx, ny);
        ctx.globalAlpha = 0.9;
        rr(n.x - k / 2 + 2, n.y - k / 2 + 2, k - 4, k - 4, k * 0.2); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  /* 화면 좌표 → 판 칸 (터치로 이웃 칸 누르기) */
  function cellFromPoint(px, py) {
    var x = Math.floor((px - ox) / cell), y = Math.floor(py / cell + camY);
    return { x: x, y: y };
  }
  function screenOf(x, y) { return toScreen(x, y); }
  function snapCamera() { var r = Game.run(); if (r && r.p) camY = camTarget(r); }

  return { init: init, resize: resize, start: start, stop: stop, pause: pause, frame: frame, redraw: redraw, setNeed: setNeed, burstAt: burstAt, setPress: setPress,
    cellFromPoint: cellFromPoint, screenOf: screenOf, snapCamera: snapCamera, readColors: readColors, color: function (k) { return col[k]; } };
})();
