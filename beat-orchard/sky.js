/* Beat Orchard — 메뉴 뒤에 깔리는 움직이는 밤하늘 (별·달·언덕·과수원 그림자·흐르는 안개·반딧불) */
(function () {
  'use strict';
  var Store = window.Store;

  var cv = null;
  var g = null;
  var W = 0;
  var H = 0;
  var dpr = 1;
  var loopId = 0;
  var lastTs = 0;
  var t = 0;
  var mode = 'menu'; // menu | battle
  var stars = [];
  var flies = [];
  var hills = null; // 언덕·나무 그림자는 크기가 바뀔 때만 다시 그린다

  function calm() {
    if (Store && Store.settings && Store.settings.reduceMotion) return true;
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function hrand(i) { var x = Math.sin(i * 91.7 + 17.3) * 43758.5453; return x - Math.floor(x); }

  function build() {
    stars = [];
    var n = Math.min(160, Math.round(W * H / 6000));
    for (var i = 0; i < n; i++) {
      stars.push({ x: hrand(i) * W, y: hrand(i + 500) * H * 0.62, r: 0.4 + hrand(i + 900) * 1.3, p: hrand(i + 1300) * 6.28, s: 0.6 + hrand(i + 1700) * 2 });
    }
    flies = [];
    for (var k = 0; k < 16; k++) {
      flies.push({ x: hrand(k + 40) * W, y: H * (0.55 + hrand(k + 80) * 0.4), p: hrand(k + 120) * 6.28, s: 0.4 + hrand(k + 160) * 0.8 });
    }
    // 언덕과 과수원 그림자
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(W * dpr));
    c.height = Math.max(1, Math.round(H * dpr));
    var h = c.getContext('2d');
    h.setTransform(dpr, 0, 0, dpr, 0, 0);
    function hill(base, amp, color, seed) {
      h.fillStyle = color;
      h.beginPath();
      h.moveTo(0, H);
      for (var x = 0; x <= W + 20; x += 20) {
        var y = base + Math.sin(x / W * 5 + seed) * amp + Math.sin(x / W * 13 + seed * 2) * amp * 0.3;
        h.lineTo(x, y);
      }
      h.lineTo(W, H);
      h.closePath();
      h.fill();
      return base;
    }
    hill(H * 0.7, H * 0.035, '#101a3a', 1);
    hill(H * 0.78, H * 0.03, '#0b142c', 3);
    // 나무 그림자 한 줄
    h.fillStyle = '#081024';
    var trees = Math.max(6, Math.round(W / 70));
    for (var j = 0; j < trees; j++) {
      var tx = (j + 0.5) * W / trees + (hrand(j + 300) - 0.5) * 30;
      var ty = H * 0.8 + Math.sin(tx / W * 5 + 3) * H * 0.02;
      var tr = 14 + hrand(j + 400) * 16;
      h.fillRect(tx - 2, ty - tr * 0.4, 4, tr * 1.2);
      h.beginPath();
      h.arc(tx, ty - tr * 0.8, tr, 0, Math.PI * 2);
      h.arc(tx - tr * 0.7, ty - tr * 0.4, tr * 0.7, 0, Math.PI * 2);
      h.arc(tx + tr * 0.7, ty - tr * 0.4, tr * 0.7, 0, Math.PI * 2);
      h.fill();
    }
    hill(H * 0.88, H * 0.02, '#060c1c', 5);
    hills = c;
  }

  function resize() {
    if (!cv) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth || 360;
    H = window.innerHeight || 640;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    build();
    draw();
  }

  function fogBand(y, amp, speed, alpha, seed) {
    var grd = g.createLinearGradient(0, y - amp * 2, 0, y + amp * 2);
    grd.addColorStop(0, 'rgba(190,205,245,0)');
    grd.addColorStop(0.5, 'rgba(190,205,245,' + alpha + ')');
    grd.addColorStop(1, 'rgba(190,205,245,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(0, y + amp * 2);
    for (var x = 0; x <= W + 24; x += 24) {
      g.lineTo(x, y + Math.sin(x / 120 + t * speed + seed) * amp - amp);
    }
    g.lineTo(W, y + amp * 2);
    g.closePath();
    g.fill();
  }

  function draw() {
    if (!g || W <= 0) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#05061a');
    sky.addColorStop(0.45, '#14154a');
    sky.addColorStop(0.75, '#2a1d5c');
    sky.addColorStop(1, '#0a1230');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    // 오로라처럼 흐르는 빛
    var ax = W * (0.5 + Math.sin(t * 0.05) * 0.2);
    var au = g.createRadialGradient(ax, H * 0.25, 0, ax, H * 0.25, W * 0.8);
    au.addColorStop(0, 'rgba(90,240,190,0.10)');
    au.addColorStop(0.5, 'rgba(150,90,255,0.06)');
    au.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = au;
    g.fillRect(0, 0, W, H);
    // 별
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.s + s.p));
      g.fillStyle = 'rgba(255,250,235,' + a.toFixed(3) + ')';
      g.beginPath();
      g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      g.fill();
    }
    // 달
    var mx = W * 0.8;
    var my = H * 0.16;
    var mr = Math.max(26, Math.min(W, H) * 0.075);
    var glow = g.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 4);
    glow.addColorStop(0, 'rgba(255,230,160,0.35)');
    glow.addColorStop(1, 'rgba(255,230,160,0)');
    g.fillStyle = glow;
    g.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
    var moon = g.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
    moon.addColorStop(0, '#fffbe6');
    moon.addColorStop(0.8, '#ffe08a');
    moon.addColorStop(1, '#f0b860');
    g.fillStyle = moon;
    g.beginPath();
    g.arc(mx, my, mr, 0, Math.PI * 2);
    g.fill();
    // 언덕·과수원
    if (hills) g.drawImage(hills, 0, 0, W, H);
    // 흐르는 안개
    fogBand(H * 0.74, 14, 0.25, 0.16, 0);
    fogBand(H * 0.86, 18, -0.18, 0.22, 2);
    fogBand(H * 0.97, 22, 0.12, 0.3, 4);
    // 반딧불
    g.globalCompositeOperation = 'lighter';
    for (var k = 0; k < flies.length; k++) {
      var f = flies[k];
      var fx = (f.x + Math.sin(t * f.s + f.p) * 30 + t * 6 * f.s) % (W + 20);
      var fy = f.y + Math.cos(t * f.s * 1.3 + f.p) * 16;
      var fa = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2.5 + f.p));
      var fg = g.createRadialGradient(fx, fy, 0, fx, fy, 9);
      fg.addColorStop(0, 'rgba(255,245,170,' + fa.toFixed(3) + ')');
      fg.addColorStop(1, 'rgba(255,220,120,0)');
      g.fillStyle = fg;
      g.fillRect(fx - 9, fy - 9, 18, 18);
    }
    g.globalCompositeOperation = 'source-over';
    // 전투 중에는 어둡게 깔아 판이 돋보이게 한다
    if (mode === 'battle') {
      g.fillStyle = 'rgba(3,5,14,0.6)';
      g.fillRect(0, 0, W, H);
    }
  }

  function frame(ts) {
    loopId = 0;
    var dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0;
    lastTs = ts;
    t += dt;
    draw();
    schedule();
  }
  // 전투 중·탭이 숨었을 때·움직임 줄이기면 멈춘다 (전투는 판 그리기만 돈다)
  function schedule() {
    if (loopId) return;
    if (document.hidden || mode === 'battle' || calm()) { lastTs = 0; return; }
    loopId = requestAnimationFrame(frame);
  }
  function stop() {
    if (loopId) cancelAnimationFrame(loopId);
    loopId = 0;
    lastTs = 0;
  }

  var Sky = {
    // ui.js 가 화면을 바꿀 때 부른다
    screen: function (id) {
      var next = id === 'scr-battle' ? 'battle' : 'menu';
      if (next === mode && loopId) return;
      mode = next;
      if (mode === 'battle') stop();
      draw();
      schedule();
    },
    refresh: function () { stop(); draw(); schedule(); }
  };
  window.Sky = Sky;

  function init() {
    cv = document.getElementById('sky');
    if (!cv) return;
    g = cv.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else schedule(); });
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
