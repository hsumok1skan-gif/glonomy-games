// 완료 창 별 박기 연출 (H-17). game.js 의 tick 이 ClearFx.step(now) 을 부른다 — 따로 requestAnimationFrame 을 돌리지 않는다.
// 별 자리 세 칸: 가운데 별이 크고(반지름 46) 조금 위, 양옆 별은 작고(반지름 34) 조금 아래, 바깥으로 -0.22·+0.22 라디안 기울어 있다.
// 받은 별 수만큼 왼쪽부터 0.25초 간격으로 박는다. 하나는 3배·투명에서 0.18초 만에 1배·불투명으로 떨어진다.
// 박히는 순간: 소리(onLand) · 흔들림 0.2 + 0.15 × 순서 · 멈춤 0.04 + 0.03 × 순서 초 · 아래로 6 + 4 × 순서 px ·
// 금빛 고리(별 크기 2.6배, 0.35초) · 불꽃 8 + 6 × 순서 개(0.4초). 세 번째 별이 박히면 가운데 별을 중심으로 피날레(번쩍 0.25초·10% 확대·큰 빛 고리·빛줄기 16개·PERFECT! 1.8초·반짝이 18개·팡파르, H-18).
// 마지막 별 뒤에 기록을 0부터 0.9초 동안 올린다(처음 빠르고 끝에 느려짐). 움직임 줄이기면 흔들림·확대·번쩍임·튀는 것 없이 별이 바로 나타난다.
(function () {
  'use strict';

  var W = 540, H = 250;            // 별 자리 좌표계 (#clearStars 한 칸)
  var PX = 180, PY = 160;          // 빛줄기·불꽃이 나갈 수 있게 캔버스를 둘레로 더 넓힌다
  var SLOTS = [
    { x: 188, y: 110, r: 34, rot: -0.22 },
    { x: 270, y: 94, r: 46, rot: 0 },
    { x: 352, y: 110, r: 34, rot: 0.22 }
  ];
  var PERFECT_Y = 212;
  var START = 0.2, GAP = 0.25, FALL = 0.18;
  var TAU = Math.PI * 2;

  var fx = null;
  var imgOn = null, imgOff = null;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function easeOut(p) { return 1 - Math.pow(1 - p, 3); }

  // 사람 그림 star_on·star_off 가 들어왔으면(art.js ART_READY 와 style.css `--art-star_…`) 그 그림으로 별을 그린다. 없으면 null
  function artImage(name) {
    var u = window.ART && window.ART.url(name);
    if (!u) return null;
    var im = new Image();
    im.src = u;
    return im;
  }

  function play(o) {
    stop();
    var cv = document.createElement('canvas');
    cv.className = 'slam-canvas';
    o.host.innerHTML = '';
    o.host.appendChild(cv);
    if (imgOn === null) { imgOn = artImage('star_on') || false; imgOff = artImage('star_off') || false; }
    fx = {
      o: o, cv: cv, ctx: cv.getContext('2d'), still: !!o.still,
      t: 0, last: 0, hold: 0,
      stars: [], parts: [], rays: null, text: null,
      shake: 0, kick: 0, zoom: 0, flash: 0, count: null, landed: 0
    };
    for (var i = 0; i < Math.min(3, o.stars); i++) fx.stars.push({ s: SLOTS[i], begin: START + i * GAP, sc: 3, a: 0, state: 0 });
  }

  function stop() {
    if (!fx) return;
    if (fx.o.screen) fx.o.screen.style.transform = '';
    if (fx.o.flash) fx.o.flash.style.opacity = '0';
    fx = null;
  }

  function land(k) {
    var st = fx.stars[k], s = st.s, o = fx.o;
    st.sc = 1; st.a = 1; st.state = 2;
    fx.landed++;
    if (o.onLand) o.onLand(k);
    if (!fx.still) {
      fx.shake = Math.max(fx.shake, 0.2 + 0.15 * k);
      fx.hold = 0.04 + 0.03 * k;
      fx.kick = 6 + 4 * k;
      fx.parts.push({ type: 'ring', x: s.x, y: s.y, r0: s.r, r1: s.r * 2.6, age: 0, life: 0.35 });
      for (var n = 0; n < 8 + 6 * k; n++) {
        var a = rand(0, TAU), v = rand(160, 420);
        fx.parts.push({ type: 'spark', x: s.x, y: s.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, life: 0.4,
          color: pick(['255,230,120', '255,160,60']) });
      }
    }
    if (k === 2) finale(SLOTS[1]);   // 피날레 중심은 세 번째 별이 아니라 가운데(큰) 별 (H-18)
    if (fx.landed === fx.stars.length) fx.count = { t0: fx.t, dur: 0.9 };
  }

  // 세 번째 별이 박힌 직후: 가운데 별에서 빛이 팍 퍼진다 — 빛줄기 16개·화면 번쩍임 0.25초·큰 빛 고리·PERFECT!·반짝이
  function finale(s) {
    if (!fx.still) {
      fx.flash = 0.25;
      fx.zoom = 0.1;
      fx.parts.push({ type: 'ring', x: s.x, y: s.y, r0: s.r, r1: s.r * 5.5, age: 0, life: 0.6, big: true });
      fx.parts.push({ type: 'glow', x: s.x, y: s.y, r: s.r * 3.2, age: 0, life: 0.45 });
      for (var n = 0; n < 18; n++) {
        var a = rand(0, TAU), v = rand(80, 260);
        fx.parts.push({ type: 'sparkle', x: s.x, y: s.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, age: 0, life: rand(0.9, 1.4),
          size: rand(5, 9), spin: rand(-6, 6), rot: rand(0, TAU), color: pick(['255,230,120', '255,255,255', '255,170,80']) });
      }
    }
    fx.rays = { x: s.x, y: s.y, age: 0, rot: 0 };
    fx.text = { age: 0, life: 1.8 };
    if (fx.o.onFinale) fx.o.onFinale();
  }

  function step(now) {
    if (!fx) return;
    var real = fx.last ? Math.min(0.05, (now - fx.last) / 1000) : 0;
    fx.last = now;
    if (!fx.cv.isConnected) { stop(); return; }
    var dt = real;
    if (fx.hold > 0) { fx.hold -= real; dt = 0; }   // 아주 짧은 멈춤: 그동안 연출 시간이 흐르지 않는다
    fx.t += dt;

    for (var i = 0; i < fx.stars.length; i++) {
      var st = fx.stars[i];
      if (st.state === 0 && fx.t >= st.begin) {
        if (fx.still) land(i); else st.state = 1;
      }
      if (st.state === 1) {
        var p = Math.min(1, (fx.t - st.begin) / FALL);
        var e = p * p;                               // 처음 느리고 끝에 빨라지며 쾅
        st.sc = 3 - 2 * e; st.a = e;
        if (p >= 1) land(i);
      }
    }

    for (var k = fx.parts.length - 1; k >= 0; k--) {
      var q = fx.parts[k];
      q.age += dt;
      if (q.age >= q.life) { fx.parts.splice(k, 1); continue; }
      if (q.type === 'spark') {
        var d = Math.exp(-4 * dt);
        q.vx *= d; q.vy *= d;
        q.x += q.vx * dt; q.y += q.vy * dt;
      } else if (q.type === 'sparkle') {
        q.vy += 140 * dt;
        q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.spin * dt;
      }
    }
    if (fx.rays) { fx.rays.age += dt; if (!fx.still) fx.rays.rot += 0.7 * dt; }
    if (fx.text) fx.text.age += dt;

    if (fx.count) {
      var c = Math.min(1, (fx.t - fx.count.t0) / fx.count.dur);
      if (fx.o.onCount) fx.o.onCount((fx.o.countTo || 0) * easeOut(c), c >= 1);
      if (c >= 1) fx.count = null;
    }

    screenFx(real);
    draw();
  }

  // 화면 흔들림·아래로 밀림·확대·번쩍임 (움직임 줄이기면 켜지지 않는다)
  function screenFx(dt) {
    var o = fx.o;
    fx.shake = Math.max(0, fx.shake - dt * 2.5);
    fx.kick = fx.kick > 0.3 ? fx.kick * Math.exp(-dt * 16) : 0;
    fx.zoom = fx.zoom > 0.002 ? fx.zoom * Math.exp(-dt * 12) : 0;
    if (o.screen) {
      var m = 22 * fx.shake;
      var sx = m ? rand(-m, m) : 0, sy = (m ? rand(-m, m) : 0) + fx.kick;
      o.screen.style.transform = (sx || sy || fx.zoom) ? 'translate(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px) scale(' + (1 + fx.zoom).toFixed(3) + ')' : '';
    }
    if (o.flash) {
      o.flash.style.opacity = fx.flash > 0 ? (0.75 * fx.flash / 0.25).toFixed(3) : '0';
      fx.flash = Math.max(0, fx.flash - dt);
    }
  }

  function fit() {
    var cv = fx.cv, dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return 0;
    var bw = Math.round(w * dpr), bh = Math.round(h * dpr);
    if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
    return bw / (W + 2 * PX);
  }

  function starPath(ctx, r) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var rr = i % 2 ? r * 0.5 : r, a = -Math.PI / 2 + i * Math.PI / 5;
      if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  function drawStar(ctx, s, on, sc, a) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.scale(sc, sc);
    ctx.globalAlpha = a;
    var im = on ? imgOn : imgOff;
    if (im && im.complete && im.naturalWidth) {
      ctx.drawImage(im, -s.r * 1.1, -s.r * 1.1, s.r * 2.2, s.r * 2.2);
    } else {
      starPath(ctx, s.r);
      ctx.lineJoin = 'round';
      if (on) {
        var g = ctx.createRadialGradient(-s.r * 0.2, -s.r * 0.3, s.r * 0.1, 0, 0, s.r);
        g.addColorStop(0, '#fff3c4'); g.addColorStop(0.55, '#f4c95d'); g.addColorStop(1, '#d9952f');
        ctx.shadowColor = 'rgba(244, 201, 93, 0.8)';
        ctx.shadowBlur = 18;
        ctx.fillStyle = g;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#a8681c';
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(120, 124, 136, 0.32)';   // 못 받은 칸: 회색 빈 별
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#8d919c';
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function draw() {
    var ctx = fx.ctx, k = fit();
    if (!k) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, fx.cv.width, fx.cv.height);
    ctx.setTransform(k, 0, 0, k, PX * k, PY * k);

    // 가운데 별 뒤 빛줄기 16개 — 0.35초 만에 사방으로 쫙 뻗고, 별 밑에 깔려 창이 떠 있는 동안 천천히 돈다
    if (fx.rays) {
      var R = fx.rays, grow = easeOut(Math.min(1, R.age / 0.35)), len = 50 + (330 - 50) * grow;
      ctx.save();
      ctx.translate(R.x, R.y);
      ctx.rotate(R.rot);
      var rg = ctx.createRadialGradient(0, 0, 10, 0, 0, len);
      rg.addColorStop(0, 'rgba(255, 200, 90, 0.55)');
      rg.addColorStop(1, 'rgba(255, 200, 90, 0)');
      ctx.fillStyle = rg;
      ctx.globalAlpha = Math.min(1, R.age / 0.25);
      for (var i = 0; i < 16; i++) {
        var a = i * TAU / 16;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, len, a - 0.07, a + 0.07);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // 가운데 별 뒤에서 팍 터지는 빛 (피날레 0.45초)
    for (var g = 0; g < fx.parts.length; g++) {
      var G = fx.parts[g];
      if (G.type !== 'glow') continue;
      var gl = 1 - G.age / G.life, gr = G.r * (0.5 + 0.5 * easeOut(G.age / G.life));
      var gg = ctx.createRadialGradient(G.x, G.y, 0, G.x, G.y, gr);
      gg.addColorStop(0, 'rgba(255, 245, 200, ' + (0.9 * gl).toFixed(3) + ')');
      gg.addColorStop(0.4, 'rgba(255, 210, 100, ' + (0.5 * gl).toFixed(3) + ')');
      gg.addColorStop(1, 'rgba(255, 200, 90, 0)');
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.arc(G.x, G.y, gr, 0, TAU);
      ctx.fill();
    }

    for (var s = 0; s < 3; s++) drawStar(ctx, SLOTS[s], false, 1, 1);
    for (var j = 0; j < fx.stars.length; j++) {
      var st = fx.stars[j];
      if (st.state) drawStar(ctx, st.s, true, st.sc, st.a);
    }

    for (var p = 0; p < fx.parts.length; p++) {
      var q = fx.parts[p], life = 1 - q.age / q.life;
      if (q.type === 'ring') {
        var rr = q.r0 + (q.r1 - q.r0) * easeOut(q.age / q.life);
        ctx.beginPath();
        ctx.arc(q.x, q.y, rr, 0, TAU);
        ctx.lineWidth = q.big ? 2 + 16 * life : 1 + 8 * life;
        ctx.strokeStyle = 'rgba(255, 220, 120, ' + life.toFixed(3) + ')';
        ctx.stroke();
      } else if (q.type === 'glow') {
        continue;
      } else if (q.type === 'spark') {
        ctx.beginPath();
        ctx.arc(q.x, q.y, 3, 0, TAU);
        ctx.fillStyle = 'rgba(' + q.color + ', ' + life.toFixed(3) + ')';
        ctx.fill();
      } else {
        ctx.save();
        ctx.translate(q.x, q.y);
        ctx.rotate(q.rot);
        starPath(ctx, q.size);
        ctx.fillStyle = 'rgba(' + q.color + ', ' + Math.min(1, life * 1.5).toFixed(3) + ')';
        ctx.fill();
        ctx.restore();
      }
    }

    // PERFECT! — 별들 아래 금빛 큰 글자 1.8초
    if (fx.text && fx.text.age < fx.text.life) {
      var T = fx.text, pop = fx.still ? 1 : 1 + 0.4 * Math.max(0, 1 - T.age / 0.15);
      var fade = Math.min(1, (T.life - T.age) / 0.3);
      ctx.save();
      ctx.translate(W / 2, PERFECT_Y - (fx.still ? 0 : 6 * Math.min(1, T.age / T.life)));
      ctx.scale(pop, pop);
      ctx.globalAlpha = fade;
      ctx.font = '900 46px system-ui, "Malgun Gothic", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#5a3610';
      ctx.strokeText('PERFECT!', 0, 0);
      ctx.fillStyle = '#ffd75a';
      ctx.shadowColor = 'rgba(255, 200, 90, 0.8)';
      ctx.shadowBlur = 14;
      ctx.fillText('PERFECT!', 0, 0);
      ctx.restore();
    }
  }

  // 다음 프레임을 그려야 하나 (G-29). 보이지 않거나 다 멈췄으면 false — game.js 가 고리를 쉬고, 창을 다시 열면 깨운다.
  // 움직임 줄이기가 아니면 빛줄기가 창이 떠 있는 동안 계속 돌아서 보이는 동안은 true 다
  function busy() {
    if (!fx) return false;
    if (!fx.cv.isConnected) { stop(); return false; }
    if (!fx.cv.clientWidth || !fx.cv.clientHeight) {   // 다른 창에 가려졌다: 흔들림·번쩍임을 남겨 두지 않는다
      if (fx.o.screen) fx.o.screen.style.transform = '';
      if (fx.o.flash) fx.o.flash.style.opacity = '0';
      return false;
    }
    if (!fx.still) return true;
    if (fx.count || fx.parts.length || fx.hold > 0) return true;
    for (var i = 0; i < fx.stars.length; i++) if (fx.stars[i].state !== 2) return true;
    if (fx.rays && fx.rays.age < 0.35) return true;
    if (fx.text && fx.text.age < fx.text.life) return true;
    return false;
  }

  window.ClearFx = { play: play, step: step, stop: stop, busy: busy, SLOTS: SLOTS };
})();
