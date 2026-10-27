/* Tide Haul — 화면·입력·효과. 규칙은 Game 함수를 부르기만 한다 */
'use strict';

var UI = (function () {
  var cur = 'scr-title', busy = false, testMode = false, backTo = null, overlay = null;
  var tick = 0, warnAt = 0, hintTimer = 0, toastTimer = 0, quitArmed = false, surfDelay = 0;
  var codexTab = 'T', recTab = 'ach';

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function set() { return Store.get().settings; }
  function fmtTime(sec) { sec = Math.floor(sec || 0); return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2); }

  /* ---------- 화면 전환: 모든 화면이 이 함수를 거친다 ---------- */
  function show(id) {
    if (testMode) return;
    var next = $(id);
    if (!next) return;
    var prev = $(cur);
    busy = true;
    if (prev && prev !== next) { prev.classList.remove('in'); prev.classList.remove('active'); }
    next.classList.add('active');
    cur = id;
    if (set().reduce) { next.classList.add('in'); busy = false; }
    else {
      void next.offsetWidth;
      next.classList.add('in');
      setTimeout(function () { busy = false; }, 240);
    }
    if (id === 'scr-dive') { Render.resize(); Render.snapCamera(); Render.start(); refreshDive(); }
    else Render.stop();
    syncRender();
    Render.redraw();
    tutShow();
  }
  // 겹침 화면이 떠 있거나 탭이 숨었거나 세로면 판 그리기를 멈춘다
  function syncRender() {
    if (testMode) return;
    Render.pause(!!overlay || document.hidden || window.innerHeight > window.innerWidth);
  }
  function openOv(id) {
    if (testMode) return;
    closeOv();
    var o = $(id);
    overlay = id;
    o.classList.add('active');
    busy = true;
    if (set().reduce) { o.classList.add('in'); busy = false; }
    else { void o.offsetWidth; o.classList.add('in'); setTimeout(function () { busy = false; }, 240); }
    syncRender();
    tutShow();
  }
  function closeOv() {
    if (!overlay) return;
    var o = $(overlay);
    o.classList.remove('in'); o.classList.remove('active');
    overlay = null;
    syncRender();
    tutShow();
  }

  function on(id, fn, sound) {
    var el = $(id);
    if (!el) return;
    el.addEventListener('click', function (e) {
      if (busy || testMode) return;
      Sfx.unlock();
      Sfx.play(sound || 'tap');
      fn(e);
    });
  }

  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, 1800);
  }
  function hint(msg) {
    if ($('tut').classList.contains('on')) return;  // 첫 판 안내가 같은 자리를 쓴다
    var h = $('hint');
    h.textContent = msg;
    h.classList.add('on');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(function () { h.classList.remove('on'); }, 2200);
  }

  /* ---------- 첫 판 안내: 한 단계에 한 동작. 끝까지 하거나 '다시 보지 않기'면 meta.tutDone 을 저장한다 ---------- */
  var TUT = [
    { scr: 'scr-boat', target: 'btn-dive', text: '배 위다. 오른쪽 아래 <b>잠수</b>를 눌러 바다로 내려간다. (엔터)' },
    { scr: 'scr-dive', target: 'btn-down', text: '<b>▼</b>를 누르거나 판을 아래로 밀어 한 칸 내려간다. (↓ 또는 S)' },
    { scr: 'scr-dive', target: 'stage-wrap', text: '반짝이는 <b>보물</b> 칸으로 걸어가 밟는다. 밟으면 가방에 들어간다.' },
    { scr: 'scr-dive', target: 'step-line', text: '왼쪽 <b>걸음당 산소</b>를 본다. 가방이 무거울수록 한 걸음이 비싸진다. 한 칸 더 움직여 본다.' },
    { scr: 'scr-dive', target: 'btn-pull', text: '산소 막대의 <b>흰 금</b>이 돌아갈 산소다. 산소가 흰 금보다 많을 때 <b>줄 당기기</b>를 누른다. (R)' },
    { scr: 'scr-boat', target: 'shop-list', text: '가게는 오늘 목표를 뺀 <b>여윳돈</b>으로만 산다. 준비되면 다시 <b>잠수</b>를 누른다. 이것으로 안내 끝!' }
  ];
  var tutStep = -1, tutFocus = null;

  function tutStart() {
    tutStep = (testMode || Store.get().tutDone) ? -1 : 0;
    tutShow();
  }
  // 사건 이름에 따라 다음 단계로. 앞 단계를 건너뛴 동작(먼저 주움·먼저 올라옴)도 받아 준다
  function tutEvent(name) {
    if (tutStep < 0) return;
    if (name === 'dive') { if (tutStep === 0) tutStep = 1; else if (tutStep === 5) { tutFinish(true); return; } }
    else if (name === 'step') { if (tutStep === 1) tutStep = 2; else if (tutStep === 3) tutStep = 4; }
    else if (name === 'pick') { if (tutStep === 1 || tutStep === 2) tutStep = 3; }
    else if (name === 'surface') { if (tutStep >= 1 && tutStep <= 4) tutStep = 5; }
    tutShow();
  }
  function tutFinish(saveIt) {
    tutStep = -1;
    if (saveIt) { Store.get().tutDone = true; Store.save(); }
    tutShow();
  }
  function tutShow() {
    var el = $('tut');
    if (tutFocus) { tutFocus.classList.remove('tut-focus'); tutFocus = null; }
    var s = tutStep >= 0 && !testMode ? TUT[tutStep] : null;
    var vis = !!s && cur === s.scr && !overlay;
    el.classList.toggle('on', vis);
    if (!vis) return;
    el.classList.toggle('boat', cur === 'scr-boat');
    $('tut-text').innerHTML = '<small>첫 판 안내 ' + (tutStep + 1) + '/' + TUT.length + '</small>' + s.text;
    tutFocus = $(s.target);
    if (tutFocus) tutFocus.classList.add('tut-focus');
    $('hint').classList.remove('on');
  }

  /* ---------- 손맛: 번쩍임·흔들림·튀는 숫자·짧은 애니메이션 ---------- */
  function flash(good) {
    var f = $('flash');
    f.classList.remove('on', 'good');
    void f.offsetWidth;
    if (good) f.classList.add('good');
    f.classList.add('on');
  }
  // hard: 'soft'(얻음·가벼운 실패) / false(보통) / true(큰 피해) — 세기는 피해에 맞춘다
  function shake(el, hard) {
    if (!set().shake || set().reduce) return;
    el = el || $('stage-wrap');
    el.classList.remove('shake', 'hard', 'soft');
    void el.offsetWidth;
    el.classList.add('shake');
    if (hard === 'soft') el.classList.add('soft');
    else if (hard) el.classList.add('hard');
  }
  // 잠수 판 밖(배 위 가게·잠수 결과)의 요소를 번쩍이게 한다
  function flashEl(el, good) {
    if (!el) return;
    el.classList.remove('hit-flash', 'good');
    void el.offsetWidth;
    if (good) el.classList.add('good');
    el.classList.add('hit-flash');
  }
  // 잠수 판 밖의 요소 위에 튀는 글자를 띄운다
  function popOn(el, text, cls) {
    if (!el) return;
    var b = el.getBoundingClientRect();
    var p = document.createElement('div');
    p.className = 'pop fixed ' + (cls || '');
    p.textContent = text;
    p.style.left = (b.left + b.width / 2) + 'px';
    p.style.top = (b.top + b.height / 2) + 'px';
    document.body.appendChild(p);
    setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 950);
  }
  function burstHere(colorKey, n) {
    var r = Game.run();
    if (r && r.p) Render.burstAt(r.p.x, r.p.y, Render.color(colorKey), n);
  }
  function bump(el) {
    if (!el || set().reduce) return;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }
  function pop(text, x, y, cls) {
    var r = Game.run();
    if (!r || !r.p) return;
    var s = Render.screenOf(x === undefined ? r.p.x : x, y === undefined ? r.p.y : y);
    var el = document.createElement('div');
    el.className = 'pop ' + (cls || '');
    el.textContent = text;
    el.style.left = s.x + 'px';
    el.style.top = s.y + 'px';
    $('fx-layer').appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 950);
  }

  /* ---------- 시작 화면 ---------- */
  function refreshTitle() {
    var m = Store.get();
    $('btn-continue').classList.toggle('hidden', !Game.canContinue());
    var suit = Game.S[m.lastSuit] || Game.S.plain;
    $('title-meta').textContent = '불빛 조각 ' + m.shards + ' · 최고 점수 ' + m.stats.bestScore + ' · 판 ' + m.stats.runs + ' · 등대를 켠 판 ' + m.stats.wins + ' · 잠수복 ' + suit.name;
    // 오늘의 바다: 오늘 아직 안 했으면 누를 수 있다. 했으면 결과를 적고 막는다(하던 판은 이어하기로)
    var d = Game.dailyInfo(), b = $('btn-daily');
    b.disabled = d.used;
    b.textContent = !d.used ? '오늘의 바다' : d.playing ? '오늘의 바다 · 하는 중' : d.done ? '오늘의 바다 ✔ ' + d.score + '점' : '오늘의 바다 ✔ 했음';
    b.setAttribute('aria-label', !d.used ? '오늘의 바다 — ' + d.date + ' 날짜로 정해지는 같은 판, 하루 한 번' : b.textContent + ' — 내일 새 바다가 열린다');
  }

  function startRun(daily) {
    var m = Store.get();
    if (daily === true && !Game.canDaily()) { toast('오늘의 바다는 오늘 이미 했다. 내일 새 바다가 열린다'); refreshTitle(); return; }
    if (Game.canContinue()) m.run = null;
    Game.newRun({ suit: m.lastSuit, daily: daily === true });
    handle();
    quitArmed = false;
    Sfx.play('start');
    show('scr-boat');
    refreshBoat();
    tutStart();
    toast(daily === true ? '오늘의 바다 ' + Game.run().daily + ' — 누구나 같은 바다, 하루 한 번' : '첫날 — ' + DATA.DAYS[0].name);
  }
  function startDaily() { startRun(true); }

  /* ---------- 배 위 ---------- */
  function refreshBoat() {
    var r = Game.run();
    if (!r) return;
    var dd = DATA.DAYS[r.day - 1], q = Game.quota();
    $('boat-day').textContent = (r.daily ? '🗓 ' : '') + r.day + '일째 · ' + dd.name;
    $('quota-num').textContent = r.coins + ' / ' + q;
    var bar = $('quota-bar'), segs = '', n = 12, fill = Math.min(n, Math.floor(r.coins / q * n));
    for (var i = 0; i < n; i++) segs += '<i class="' + (i < fill ? (r.coins >= q ? 'over' : 'on') : '') + '"></i>';
    bar.innerHTML = segs;
    $('quota-box').classList.toggle('met', r.coins >= q);
    $('boat-coins').textContent = '🪙 ' + r.coins;
    // 부탁
    $('req-list').innerHTML = r.reqs.map(function (q2) {
      var R = Game.R[q2.id];
      return '<div class="item req' + (q2.done ? ' done' : '') + '"><span class="ico">📜</span><div class="grow"><div class="t">' + esc(R.text) + '</div><div class="d">보상 🪙 ' + Math.round(R.reward * (1 + r.st.reqMul)) + '</div></div></div>';
    }).join('');
    // 지난 잠수
    var ld = r.lastDive;
    $('last-dive').innerHTML = ld && ld.day === r.day
      ? (ld.dive + '번째 잠수 · ' + (ld.emergency ? '비상 부표' : ld.how === 'pull' ? '줄 당김' : '걸어서') + ' · 깊이 ' + ld.deep + '줄 · 🪙 ' + (ld.total + ld.reqGain) + (ld.lost.length ? ' · 잃음 ' + ld.lost.length : ''))
      : '오늘은 아직 잠수하지 않았다. 배 아래 물길은 잠수할 때마다 새로 바뀐다.';
    // 가게
    $('spare-line').textContent = '여윳돈 ' + Math.max(0, Game.spare()) + ' (목표 몫은 못 씀)';
    var html = '';
    for (var j = 0; j < r.offers.length; j++) {
      var o = Game.offerInfo(j);
      if (!o) continue;
      html += '<button class="item" id="shop-' + j + '" data-i="' + j + '"' + (o.ok ? '' : ' disabled') + '><span class="ico">' + o.g.icon + '</span><div class="grow"><div class="t">' + esc(o.g.name) + ' ' + (o.max ? '(다 올림)' : (o.lv + 1) + '단계') + '</div><div class="d">' + (o.max ? '더 올릴 수 없다' : esc(o.next.desc)) + '</div></div><span class="price">' + (o.max ? '' : (o.ok ? '' : '🔒 ') + '🪙 ' + o.price) + '</span></button>';
    }
    $('shop-list').innerHTML = html || '<div class="small-text">살 것이 없다</div>';
    // 장비·부적
    var kit = [];
    DATA.GEAR.forEach(function (g) { var lv = r.gear[g.id] || 0; if (lv) kit.push('<span class="chip">' + g.icon + ' ' + esc(g.name) + ' ' + lv + '</span>'); });
    r.charms.forEach(function (id) { var c = Game.CH[id]; kit.push('<span class="chip" title="' + esc(c.desc) + '">' + c.icon + ' ' + esc(c.name) + '</span>'); });
    $('kit-list').innerHTML = kit.join('') || '<span class="small-text">아직 없다. 가게에서 사거나 하루를 넘기면 부적을 고른다.</span>';
    $('boat-stats').textContent = '점수 ' + r.score + ' · 산소 ' + r.st.airMax + ' · 힘 ' + r.st.str + ' · 무게 한도 ' + r.st.maxLoad + ' · 보이는 거리 ' + r.st.radius + ' · ' + (Game.S[r.suit] || Game.S.plain).name;
    $('btn-dive').textContent = '잠수 (' + (r.dive + 1) + '/' + DATA.DIVES + ')';
  }

  function doBuy(i) {
    if (Game.buy(i)) { handle(); refreshBoat(); }
    else { handle(); }
  }

  /* ---------- 잠수 ---------- */
  function goDive() {
    var r = Game.run();
    if (!r || r.phase !== 'boat') return;
    if (!Game.startDive()) return;
    handle();
    show('scr-dive');
    tutEvent('dive');
    if (tutStep < 0) hint(r.day + '일째 ' + (r.dive + 1) + '번째 잠수');
  }

  function refreshDive() {
    var r = Game.run();
    if (!r || r.phase !== 'dive') return;
    var info = Game.returnInfo();
    Render.setNeed(info);
    var air = Math.max(0, r.air), need = info.need;
    var bad = need === Infinity || air < need;
    $('air-num').textContent = Math.ceil(air);
    $('air-num').classList.toggle('low', bad || air <= r.airMax * 0.2);
    $('air-fill').style.width = Math.max(0, Math.min(100, air / r.airMax * 100)) + '%';
    $('air-fill').classList.toggle('low', bad);
    $('air-need').style.left = 'calc(' + Math.max(0, Math.min(100, (need === Infinity ? r.airMax : need) / r.airMax * 100)) + '% - 1px)';
    var nl = $('need-line');
    nl.classList.toggle('bad', bad);
    nl.innerHTML = r.p.y === 0 ? '배 위. 아래로 내려간다' : need === Infinity ? '배로 가는 길이 없다' : '돌아갈 산소 <b>' + Math.ceil(need) + '</b>' + (bad ? ' — 모자라!' : '');
    var step = Game.stepBase();
    var sl = $('step-line');
    sl.innerHTML = '걸음당 산소 <b>' + step + '</b>';
    sl.classList.toggle('up', step > 1);
    var w = Game.load();
    $('load-line').innerHTML = '무게 <b>' + w + '/' + r.st.maxLoad + '</b> · 힘 <b>' + r.st.str + '</b>';
    var z = DATA.ZONES[Game.zoneOf(r.p.y)];
    $('depth-line').innerHTML = '깊이 <b>' + r.p.y + '줄</b> · ' + (r.p.y === 0 ? '물 위' : esc(z.name));
    var st = [];
    if (r.ink > 0 && !r.st.inkImmune) st.push('먹물 ' + r.ink);
    if (r.slow > 0) st.push('느림 ' + r.slow);
    st.push(r.day + '일째 ' + (r.dive + 1) + '/' + DATA.DIVES);
    $('status-line').textContent = st.join(' · ');
    $('bag-weight').textContent = w + '/' + r.st.maxLoad;
    $('bag-list').innerHTML = r.bag.map(function (b, i) {
      var d = Game.T[b.t];
      var lbl = esc(d.name) + ' · 무게 ' + d.w + ' · ' + d.v + '동전';
      return '<div class="bag-cell' + (i === r.bag.length - 1 && lastPick ? ' new' : '') + '" role="img" aria-label="' + lbl + '" title="' + lbl + '">' + d.icon + '<small>' + d.w + '</small></div>';
    }).join('');
    lastPick = false;
    var pb = $('btn-pull');
    pb.disabled = !Game.canPull();
    pb.textContent = Game.canPull() ? '줄 당기기 ' + (need === Infinity ? '' : Math.ceil(need)) : '줄 당기기';
    $('btn-drop').disabled = !Game.canDrop();
    $('btn-up').disabled = !Game.canMove('up');
    $('btn-down').disabled = !Game.canMove('down');
    $('btn-left').disabled = !Game.canMove('left');
    $('btn-right').disabled = !Game.canMove('right');
  }
  var lastPick = false;

  function doMove(dir) {
    var r = Game.run();
    if (!r || r.phase !== 'dive' || overlay || busy) return;
    Sfx.unlock();
    Game.move(dir);
    handle();
  }
  function doPull() {
    var r = Game.run();
    if (!r || r.phase !== 'dive' || overlay) return;
    Game.pull();
    handle();
  }
  function doDrop() {
    var r = Game.run();
    if (!r || r.phase !== 'dive' || overlay) return;
    Game.drop();
    handle();
  }

  /* ---------- 사건 → 효과 ---------- */
  function handle() {
    var evs = Game.drain(), r = Game.run();
    var surfaced = null;
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i], d = e.d;
      switch (e.t) {
        case 'step':
          Sfx.play(d.cost >= 2 ? 'heavy' : 'step');
          if (d.cost >= 3) pop('-' + Math.round(d.cost * 10) / 10, undefined, undefined, 'bad');
          tutEvent('step');
          break;
        case 'bump':
          Sfx.play('bump'); flash(false); shake(null, 'soft');
          pop('막힘', undefined, undefined, 'bad');
          burstHere('--rock2', 5);
          break;
        case 'pick':
          lastPick = true;
          Sfx.play('pick'); Sfx.vibrate(15);
          pop(d.def.icon + ' +' + d.def.v, d.x, d.y, d.def.v >= 20 ? 'gold big' : 'gold');
          Render.burstAt(d.x, d.y, Render.color('--gold'), d.def.v >= 20 ? 16 : 9);
          flash(true);
          shake($('bag-list'), false);
          if (d.step > 1) { bump($('step-line')); hint('무거워졌다 — 이제 한 걸음에 산소 ' + d.step); }
          tutEvent('pick');
          break;
        case 'heavy':
          Sfx.play('heavy'); flash(false); shake($('bag-list'), false);
          pop(d.def.icon + ' 무게 초과', undefined, undefined, 'bad');
          bump($('bag-weight'));
          hint(d.def.name + '은(는) 너무 무겁다 — 가방 무게 한도');
          break;
        case 'drop': Sfx.play('drop'); pop(d.def.icon + ' 내려놓음', undefined, undefined, 'good'); bump($('step-line')); break;
        case 'dig': Sfx.play('dig'); if (r && r.p) Render.burstAt(r.p.x, r.p.y, Render.color('--sand'), 6); break;
        case 'found': hint('모래 속에서 무언가 나왔다'); break;
        case 'vent':
          Sfx.play('vent'); flash(true); shake(null, 'soft');
          pop('+' + d.add + ' 산소', undefined, undefined, 'good big');
          bump($('air-num')); burstHere('--vent', 10);
          break;
        case 'current': Sfx.play('current'); hint('물살에 떠밀렸다'); break;
        case 'creature': hint(d.def.icon + ' ' + d.def.name + ' — ' + d.def.note); break;
        case 'sting':
          Sfx.play('sting'); Sfx.vibrate(d.dmg >= 7 ? 60 : 30);
          flash(false); shake(null, d.dmg >= 7);
          pop('-' + d.dmg + ' 산소', undefined, undefined, d.dmg >= 7 ? 'bad big' : 'bad');
          bump($('air-num'));
          break;
        case 'lose':
          Sfx.play('lose'); Sfx.vibrate(40); flash(false); shake(null, true);
          pop(d.def.icon + ' -' + d.def.v + ' ' + (d.how === 'steal' ? '물려 감' : '떨어뜨림'), undefined, undefined, 'bad big');
          bump($('bag-list')); burstHere('--danger', 12);
          break;
        case 'block':
          Sfx.play('block'); flash(true); shake(null, 'soft');
          pop('막았다 (' + d.what + ')', undefined, undefined, 'good');
          burstHere('--mint', 8);
          break;
        case 'ink':
          Sfx.play('ink'); flash(false); shake(null, false);
          pop('시야 -1', undefined, undefined, 'bad');
          burstHere('--ink', 14);
          hint('먹물! ' + d.n + '걸음 동안 보이는 거리 -1');
          break;
        case 'push': Sfx.play('current'); hint('위로 ' + d.n + '칸 밀려 올라갔다'); break;
        case 'slow': Sfx.play('heavy'); hint(d.n + '걸음 동안 걸음마다 산소 +1'); break;
        case 'gift':
          Sfx.play('gift'); flash(true); shake(null, 'soft');
          pop('+' + d.n + ' 산소', undefined, undefined, 'good big');
          bump($('air-num')); burstHere('--mint', 10);
          break;
        case 'guide': Sfx.play('gift'); hint('둘레 ' + d.n + '칸이 밝아졌다'); break;
        case 'lowair':
          if (set().warnAir && Date.now() - warnAt > 3000) { warnAt = Date.now(); Sfx.play('warn'); bump($('air-num')); }
          break;
        case 'pull': Sfx.play(d.fail ? 'emergency' : 'surface'); break;
        case 'surface': surfaced = d; break;
        case 'buy': Sfx.play('buy'); Sfx.vibrate(15); toast(d.g.icon + ' ' + d.g.name + ' ' + d.lv + '단계'); break;
        case 'nobuy':
          Sfx.play('bump'); Sfx.vibrate(30);
          flashEl($('shop-list').parentNode, false); shake($('shop-list'), false);
          popOn($('spare-line'), '여윳돈 ' + Math.max(0, Game.spare()), 'bad');
          bump($('spare-line'));
          toast('여윳돈이 모자라다 — 오늘 목표 몫은 쓸 수 없다');
          break;
        case 'interest': toast('🐖 이자 +' + d.gain); break;
        case 'charm': Sfx.play('charm'); break;
        case 'log': setTimeout(function () { toast('📖 섬 일지에 새 글'); }, 900); break;
        case 'ach': (function (n) { setTimeout(function () { toast('🏅 업적: ' + n); }, 1400); })(d.def.name); break;
        case 'over':
          Sfx.play(d.won ? 'win' : 'fail');
          Sfx.vibrate(d.won ? 40 : 120);
          flash(d.won);
          shake(null, !d.won);
          if (r && r.p) pop(d.won ? '등대가 켜졌다' : '납품 실패', undefined, undefined, d.won ? 'gold big' : 'bad big');
          bump($('air-num'));
          burstHere(d.won ? '--gold' : '--danger', 16);
          break;
      }
    }
    if (surfaced) { tutEvent('surface'); openSurface(surfaced); }
    else if (cur === 'scr-dive') refreshDive();
  }

  /* ---------- 잠수 결과 (겹침) ---------- */
  function openSurface(ld) {
    Sfx.play(ld.emergency ? 'emergency' : 'surface');
    if (ld.emergency) { flash(false); shake(null, true); Sfx.vibrate(80); }
    var panel = $('ov-surface').querySelector('.panel');
    $('sf-title').textContent = ld.day + '일째 ' + ld.dive + '번째 잠수 — ' + (ld.emergency ? '비상 부표!' : ld.how === 'pull' ? '줄을 당겨 올라옴' : '걸어서 올라옴');
    var chips = ld.lines.map(function (l) { return '<span class="chip">' + l.def.icon + ' ' + esc(l.def.name) + ' +' + l.v + '</span>'; });
    ld.lost.forEach(function (d) { chips.push('<span class="chip lost">✕ ' + d.icon + ' ' + esc(d.name) + ' (잃음)</span>'); });
    ld.reqDone.forEach(function (q) { chips.push('<span class="chip">📜 ' + esc(q.text) + ' +' + q.g + '</span>'); });
    $('sf-lines').innerHTML = chips.join('') || '<span class="small-text">빈손이다.</span>';
    var total = ld.total + ld.reqGain;
    $('sf-total').innerHTML = '<b id="sf-num">0</b>동전 · 깊이 ' + ld.deep + '줄' + (ld.lost.length ? ' · 잃은 것 ' + ld.lost.length + '개' : '');
    surfDelay = Date.now();
    openOv('ov-surface');
    if (ld.emergency) {
      // 비상 부표: 겹침 패널도 빨갛게 번쩍이고 흔들리며, 잃은 수가 튄다
      flashEl(panel, false); shake($('sf-title'), ld.lost.length >= 3);
      if (ld.lost.length) popOn($('sf-lines'), '-잃음 ' + ld.lost.length, 'bad big');
      bump($('sf-lines'));
    }
    countUp($('sf-num'), total);
    if (total > 0) setTimeout(function () { Sfx.play('sell'); }, 250);
  }
  function countUp(el, to) {
    if (set().reduce || to <= 0 || testMode) { el.textContent = to; return; }
    var t0 = performance.now(), dur = 500;
    // 따로 고리를 돌리지 않고 Render 의 그리기 고리에 맡긴다
    function step(t) {
      var k = Math.max(0, Math.min(1, (t - t0) / dur));
      if (testMode) k = 1;
      el.textContent = Math.round(to * k);
      if (k < 1) Render.frame(step);
    }
    Render.frame(step);
  }
  function afterSurface() {
    closeOv();
    var r = Game.run();
    if (!r) { show('scr-title'); return; }
    if (r.over) { showResult(); return; }
    if (r.phase === 'charm') { openDay(); return; }
    show('scr-boat');
    refreshBoat();
  }

  /* ---------- 하루 끝 (겹침) ---------- */
  function openDay() {
    var r = Game.run(), lq = r.lastQuota;
    Sfx.play('quota');
    $('day-title').textContent = lq.day + '일째를 넘겼다';
    $('day-quota').textContent = '섬 장부에 🪙 ' + lq.q + ' 을(를) 냈다. 남은 동전 ' + r.coins + '. 내일 목표 🪙 ' + Math.round(DATA.DAYS[Math.min(DATA.DAY_MAX, lq.day + 1) - 1].quota * (1 + r.st.quotaMul)) + '. 부적 하나를 고른다.';
    $('charm-list').innerHTML = r.charmOffer.map(function (id, i) {
      var c = Game.CH[id];
      return '<button class="charm r' + c.rar + '" id="charm-' + i + '" data-i="' + i + '"><span class="ico">' + c.icon + '</span><span class="t">' + esc(c.name) + '</span><span class="d">' + esc(c.desc) + '</span><small>' + ['', '흔함', '귀함', '아주 귀함'][c.rar] + ' · ' + (i + 1) + '</small></button>';
    }).join('');
    openOv('ov-day');
  }
  function pickCharm(i) {
    if (!Game.pickCharm(i)) return;
    handle();
    closeOv();
    var r = Game.run();
    show('scr-boat');
    refreshBoat();
    toast(r.day + '일째 — ' + DATA.DAYS[r.day - 1].name);
  }

  /* ---------- 멈춤 ---------- */
  function openPause() {
    var r = Game.run();
    if (!r || r.over || (cur !== 'scr-dive' && cur !== 'scr-boat')) return;
    if (overlay) return;
    quitArmed = false;
    $('btn-quit').textContent = '그만두기';
    $('pause-info').innerHTML = r.day + '일째 · 잠수 ' + (r.dive + (r.phase === 'dive' ? 1 : 0)) + '/' + DATA.DIVES + ' · 🪙 ' + r.coins + ' · 점수 ' + r.score + '<br>지난 시간 ' + fmtTime(r.time) + ' · 부적 ' + r.charms.length + '개' + (r.phase === 'dive' ? '<br>잠수 중에 그만두면 그 판은 끝난다.' : '<br>배 위에서는 이어하기로 저장되어 있다.');
    openOv('ov-pause');
  }
  function resume() { closeOv(); if (cur === 'scr-dive') refreshDive(); }
  function quit() {
    if (!quitArmed) { quitArmed = true; $('btn-quit').textContent = '한 번 더 누르면 그만둔다'; return; }
    quitArmed = false;
    closeOv();
    Game.quit();
    handle();
    showResult();
  }

  /* ---------- 결과 ---------- */
  function showResult() {
    var r = Game.run();
    if (!r) { show('scr-title'); return; }
    var m = Store.get();
    var t = $('res-title');
    t.textContent = r.won ? '등대가 다시 켜졌다' : r.day + '일째에 멈췄다';
    t.classList.toggle('lose', !r.won);
    var why = r.won ? '여덟 날의 납품을 모두 채웠다.' : (r.lastQuota && !r.lastQuota.ok ? r.day + '일째 납품 목표 🪙 ' + r.lastQuota.q + ' 에 ' + r.lastQuota.had + ' 밖에 없었다.' : '판을 그만두었다.');
    $('res-why').textContent = why;
    var cells = [['점수', r.score], ['최고 점수', m.stats.bestScore], ['버틴 날', (r.won ? r.day : r.day - 1) + '/' + DATA.DAY_MAX], ['번 동전', r.earned],
      ['잠수', r.rs.dives], ['가장 깊이', r.rs.deepest + '줄'], ['부탁', r.reqDone], ['시간', fmtTime(r.time)]];
    $('res-lines').innerHTML = cells.map(function (c) { return '<div>' + c[0] + '<b>' + c[1] + '</b></div>'; }).join('');
    $('res-new').textContent = (r.daily ? '오늘의 바다 ' + r.daily + ' 기록 ' + r.score + '점 (하루 한 번) · ' : '') + '불빛 조각 +' + (r.shards || 0) + ' (모두 ' + m.shards + ')' + (r.best ? ' · 새 최고 점수!' : '');
    shareText = 'Tide Haul' + (r.daily ? ' · 오늘의 바다 ' + r.daily : '') + '\n' + t.textContent + '\n'
      + '🪙 점수 ' + r.score + ' · 버틴 날 ' + (r.won ? r.day : r.day - 1) + '/' + DATA.DAY_MAX + ' · 번 동전 ' + r.earned + '\n'
      + '🌊 가장 깊이 ' + r.rs.deepest + '줄 · 잠수 ' + r.rs.dives + ' · 부탁 ' + r.reqDone + ' · ' + fmtTime(r.time);
    $('share-text').value = shareText;
    $('share-box').classList.add('hidden');
    $('btn-share').textContent = '결과 복사';
    show('scr-result');
    bump(t);
  }

  /* ---------- 결과 공유 문구: 복사하고, 막히면 글 상자로 보여 준다 ---------- */
  var shareText = '';
  function shareBox() {
    var box = $('share-box'), ta = $('share-text');
    box.classList.remove('hidden');
    ta.value = shareText;
    try { ta.focus(); ta.select(); } catch (e) { /* 고르기가 막혀도 글은 보인다 */ }
    return ta;
  }
  function shareDone(ok) {
    var b = $('btn-share');
    if (ok) {
      b.textContent = '복사했다 ✔';
      flashEl(b, true); bump(b);
      toast('결과 문구를 복사했다');
      Sfx.play('pick');
    } else {
      var ta = shareBox();
      flashEl(ta, false);
      toast('복사가 막혀 있다 — 글 상자에서 직접 복사한다');
    }
  }
  // 예전 방식: 글 상자를 골라 execCommand('copy'). 막히면 글 상자를 남긴다
  function shareFallback() {
    var ok = false;
    var ta = shareBox();
    try { ok = !!(document.execCommand && document.execCommand('copy')); } catch (e) { ok = false; }
    if (ok) $('share-box').classList.add('hidden');
    shareDone(ok);
    if (!ok) ta.select();
  }
  function shareResult() {
    if (!shareText) return;
    var cb = null;
    try { cb = navigator.clipboard && window.isSecureContext ? navigator.clipboard : null; } catch (e) { cb = null; }
    if (cb && cb.writeText) {
      var p;
      try { p = cb.writeText(shareText); } catch (e) { p = null; }
      if (p && p.then) { p.then(function () { shareDone(true); }, shareFallback); return; }
    }
    shareFallback();
  }

  /* ---------- 설정 ---------- */
  function applySettings() {
    var s = set();
    document.body.classList.toggle('reduce', !!s.reduce);
    document.body.classList.toggle('big-text', !!s.bigText);
  }
  function refreshSettings() {
    var s = set();
    $('settings-list').innerHTML = DATA.SETTINGS.map(function (d) {
      return '<div class="item"><span class="grow t">' + esc(d.name) + '</span><button class="btn toggle" id="set-' + d.id + '" data-id="' + d.id + '" aria-label="' + esc(d.name) + ' ' + (s[d.id] ? '켬' : '끔') + '" aria-pressed="' + (s[d.id] ? 'true' : 'false') + '">' + (s[d.id] ? '켬' : '끔') + '</button></div>';
    }).join('');
    $('wipe-confirm').classList.add('hidden');
  }

  /* ---------- 잠수복 ---------- */
  function refreshLocker() {
    var m = Store.get();
    $('locker-shards').textContent = '불빛 조각 ' + m.shards;
    $('suit-list').innerHTML = DATA.SUITS.map(function (s) {
      var have = !!m.suits[s.id], sel = m.lastSuit === s.id;
      var label = sel ? '입는 중' : have ? '입기' : '열기 · 조각 ' + s.cost;
      var can = sel ? false : have ? true : m.shards >= s.cost;
      return '<button class="item' + (have ? '' : ' locked') + (sel ? ' done' : '') + '" id="suit-' + s.id + '" data-id="' + s.id + '"' + (can ? '' : ' disabled') + '><span class="ico">' + s.icon + '</span><div class="grow"><div class="t">' + esc(s.name) + '</div><div class="d">' + esc(s.desc) + '</div></div><span class="price">' + label + '</span></button>';
    }).join('');
  }
  function suitClick(id) {
    var m = Store.get();
    if (m.suits[id]) { m.lastSuit = id; Store.save(); Sfx.play('buy'); }
    else if (Game.buySuit(id)) { Sfx.play('quota'); toast('새 잠수복을 열었다'); }
    refreshLocker();
  }

  /* ---------- 도감 ---------- */
  var CODEX_TABS = [['T', '보물'], ['C', '생물'], ['G', '부적'], ['E', '장비'], ['Z', '구역']];
  function refreshCodex() {
    var m = Store.get();
    $('codex-tabs').innerHTML = CODEX_TABS.map(function (t) { return '<button class="btn" role="tab" id="ctab-' + t[0] + '" data-t="' + t[0] + '" aria-selected="' + (codexTab === t[0]) + '">' + t[1] + '</button>'; }).join('');
    var html = '', seenN = 0, all = 0;
    if (codexTab === 'T') {
      DATA.TREASURES.forEach(function (t) {
        var s = m.seen.t[t.id]; all++; if (s) seenN++;
        html += '<div class="item' + (s ? '' : ' locked') + '"><span class="ico">' + (s ? t.icon : '❔') + '</span><div class="grow"><div class="t">' + (s ? esc(t.name) : '아직 못 건짐') + '</div><div class="d">' + esc(DATA.ZONES[t.zone].name) + (s ? ' · 무게 ' + t.w + ' · ' + t.v + '동전 · 값/무게 ' + (t.v / t.w).toFixed(1) : '') + '</div></div></div>';
      });
    } else if (codexTab === 'C') {
      DATA.CREATURES.forEach(function (c) {
        var s = m.seen.c[c.id]; all++; if (s) seenN++;
        html += '<div class="item' + (s ? '' : ' locked') + '"><span class="ico">' + (s ? c.icon : '❔') + '</span><div class="grow"><div class="t">' + (s ? esc(c.name) : '아직 못 만남') + '</div><div class="d">' + esc(DATA.ZONES[c.zone].name) + (s ? ' · ' + esc(c.note) : '') + '</div></div></div>';
      });
    } else if (codexTab === 'G') {
      DATA.CHARMS.forEach(function (c) {
        var s = m.seen.g[c.id]; all++; if (s) seenN++;
        html += '<div class="item' + (s ? '' : ' locked') + '"><span class="ico">' + (s ? c.icon : '❔') + '</span><div class="grow"><div class="t">' + (s ? esc(c.name) : '아직 못 고름') + '</div><div class="d">' + (s ? esc(c.desc) : ['', '흔함', '귀함', '아주 귀함'][c.rar]) + '</div></div></div>';
      });
    } else if (codexTab === 'E') {
      DATA.GEAR.forEach(function (g) {
        all++; seenN++;
        html += '<div class="item"><span class="ico">' + g.icon + '</span><div class="grow"><div class="t">' + esc(g.name) + '</div><div class="d">' + g.levels.map(function (l, i) { return (i + 1) + '단계 🪙' + l.price + ' ' + esc(l.desc); }).join('<br>') + '</div></div></div>';
      });
    } else {
      DATA.ZONES.forEach(function (z) {
        all++; seenN++;
        html += '<div class="item"><span class="ico">🌊</span><div class="grow"><div class="t">' + esc(z.name) + ' (' + z.from + '~' + z.to + '줄)</div><div class="d">' + esc(z.note) + '</div></div></div>';
      });
    }
    $('codex-list').innerHTML = html;
    $('codex-count').textContent = seenN + '/' + all;
  }

  /* ---------- 기록 ---------- */
  var REC_TABS = [['ach', '업적'], ['log', '섬 일지'], ['stat', '통계']];
  function refreshRecords() {
    var m = Store.get(), s = m.stats;
    $('rec-tabs').innerHTML = REC_TABS.map(function (t) { return '<button class="btn" role="tab" id="rtab-' + t[0] + '" data-t="' + t[0] + '" aria-selected="' + (recTab === t[0]) + '">' + t[1] + '</button>'; }).join('');
    var html = '';
    if (recTab === 'ach') {
      html = DATA.ACHS.map(function (a) {
        var got = m.ach[a.id];
        return '<div class="item' + (got ? ' done' : ' locked') + '"><span class="ico">' + (got ? '🏅' : '🔒') + '</span><div class="grow"><div class="t">' + esc(a.name) + '</div><div class="d">' + esc(a.desc) + '</div></div></div>';
      }).join('');
    } else if (recTab === 'log') {
      html = DATA.LOG.map(function (l) {
        var got = m.log[l.id];
        return '<div class="item' + (got ? '' : ' locked') + '"><span class="ico">' + (got ? '📖' : '🔒') + '</span><div class="grow"><div class="t">' + esc(l.when) + '</div><div class="d">' + (got ? esc(l.text) : '아직 열리지 않았다') + '</div></div></div>';
      }).join('');
    } else {
      var rows = [['판', s.runs], ['등대를 켠 판', s.wins], ['잠수', s.dives], ['가장 깊이', s.deepest + '줄'], ['최고 점수', s.bestScore], ['가장 오래 버틴 날', s.bestDay],
        ['모두 번 동전', s.totalEarned], ['한 번에 가장 많이', s.bestHaul], ['한 번에 가장 무겁게', s.bestWeight], ['들어준 부탁', s.requests], ['공기 구멍', s.vents],
        ['물려 간 것', s.stolen], ['비상 부표', s.emergencies], ['산 장비', s.bought], ['고른 부적', s.charms], ['논 시간', fmtTime(s.playTime)]];
      html = rows.map(function (r) { return '<div class="item"><span class="grow t">' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join('');
    }
    $('rec-list').innerHTML = html;
  }

  /* ---------- 입력: 판 누르기·밀기 ---------- */
  var down = null;
  function bindStage() {
    var wrap = $('stage-wrap');
    wrap.addEventListener('pointerdown', function (e) {
      Sfx.unlock();
      var b = wrap.getBoundingClientRect();
      down = { x: e.clientX - b.left, y: e.clientY - b.top };
      var r = Game.run();
      if (!testMode && r && r.phase === 'dive' && !overlay && r.p) Render.setPress(Render.cellFromPoint(down.x, down.y));
    });
    wrap.addEventListener('pointerup', function (e) {
      Render.setPress(null);
      if (!down || testMode) return;
      var b = wrap.getBoundingClientRect();
      var ux = e.clientX - b.left, uy = e.clientY - b.top, dx = ux - down.x, dy = uy - down.y;
      down = null;
      var r = Game.run();
      if (!r || r.phase !== 'dive' || overlay) return;
      if (Math.abs(dx) > 24 || Math.abs(dy) > 24) {
        doMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
        return;
      }
      var c = Render.cellFromPoint(ux, uy), ddx = c.x - r.p.x, ddy = c.y - r.p.y;
      if (!ddx && !ddy) return;
      doMove(Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? 'right' : 'left') : (ddy > 0 ? 'down' : 'up'));
    });
    wrap.addEventListener('pointercancel', function () { down = null; Render.setPress(null); });
    wrap.addEventListener('pointerleave', function () { Render.setPress(null); });
  }

  function onKey(e) {
    if (testMode) return;
    var k = e.key;
    if (overlay === 'ov-day') {
      if (k === '1' || k === '2' || k === '3') pickCharm(parseInt(k, 10) - 1);
      return;
    }
    if (overlay === 'ov-surface') {
      if ((k === 'Enter' || k === ' ') && Date.now() - surfDelay > 400) { e.preventDefault(); afterSurface(); }
      return;
    }
    if (overlay === 'ov-pause') {
      if (k === 'Escape' || k === 'p' || k === 'P') resume();
      return;
    }
    if (cur === 'scr-dive') {
      var map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
      if (map[k]) { e.preventDefault(); doMove(map[k]); return; }
      if (k === 'r' || k === 'R' || k === ' ') { e.preventDefault(); doPull(); return; }
      if (k === 'x' || k === 'X') { doDrop(); return; }
      if (k === 'p' || k === 'P' || k === 'Escape') { openPause(); return; }
    } else if (cur === 'scr-boat') {
      if (k === 'Enter') { e.preventDefault(); goDive(); return; }
      if (k === '1' || k === '2' || k === '3') { doBuy(parseInt(k, 10) - 1); return; }
      if (k === 'p' || k === 'P' || k === 'Escape') { openPause(); return; }
    } else if (cur === 'scr-title') {
      if (k === 'Enter') { e.preventDefault(); if (Game.canContinue()) continueRun(); else startRun(false); }
    }
  }

  function continueRun() {
    if (!Game.resume()) { startRun(false); return; }
    handle();
    show('scr-boat');
    refreshBoat();
    tutStart();
    toast('이어서 한다 — ' + Game.run().day + '일째');
  }

  function openSub(id, fromPause) {
    backTo = fromPause ? cur : 'scr-title';
    closeOv();
    if (id === 'scr-help') { /* 글만 */ }
    if (id === 'scr-settings') refreshSettings();
    show(id);
  }
  function back() {
    var to = backTo || 'scr-title';
    backTo = null;
    if (to === 'scr-title') { refreshTitle(); show('scr-title'); return; }
    show(to);
    if (to === 'scr-boat') refreshBoat();
    openPause();
  }

  /* ---------- 묶기 ---------- */
  function bind() {
    on('btn-continue', continueRun, 'start');
    on('btn-start', function () { startRun(false); }, 'start');
    on('btn-daily', startDaily, 'start');
    on('btn-help', function () { openSub('scr-help', false); });
    on('btn-settings', function () { openSub('scr-settings', false); });
    on('btn-locker', function () { refreshLocker(); show('scr-locker'); });
    on('btn-codex', function () { refreshCodex(); show('scr-codex'); });
    on('btn-records', function () { refreshRecords(); show('scr-records'); });
    on('btn-help-back', back);
    on('btn-settings-back', back);
    on('btn-locker-back', function () { refreshTitle(); show('scr-title'); });
    on('btn-codex-back', function () { refreshTitle(); show('scr-title'); });
    on('btn-records-back', function () { refreshTitle(); show('scr-title'); });
    on('btn-dive', goDive, 'start');
    on('btn-boat-menu', openPause);
    on('btn-pause', openPause);
    on('btn-resume', resume);
    on('btn-pause-help', function () { openSub('scr-help', true); });
    on('btn-pause-settings', function () { openSub('scr-settings', true); });
    on('btn-quit', quit);
    on('btn-again', function () { startRun(false); }, 'start');
    on('btn-share', shareResult);
    on('btn-home', function () { refreshTitle(); show('scr-title'); });
    on('btn-sf-ok', function () { if (Date.now() - surfDelay > 300) afterSurface(); });
    on('btn-pull', doPull);
    on('btn-drop', doDrop);
    ['up', 'down', 'left', 'right'].forEach(function (d) {
      var el = $('btn-' + d);
      el.addEventListener('click', function () { if (busy || testMode) return; Sfx.unlock(); doMove(d); });
    });
    on('btn-tut-close', function () { tutFinish(false); toast('이번 판만 닫았다. 다음 판에 다시 나온다'); });
    on('btn-tut-never', function () { tutFinish(true); toast('첫 판 안내를 다시 보지 않는다 — 방법에서 다시 켤 수 있다'); });
    on('btn-tut-again', function () {
      var m = Store.get(), r = Game.run();
      m.tutDone = false; Store.save();
      // 판 중이면 지금 있는 곳(배 위·잠수)의 첫 단계부터, 아니면 다음 판 시작 때부터
      tutStep = r && !r.over ? (r.phase === 'dive' ? 1 : 0) : -1;
      toast('첫 판 안내를 다시 켰다');
    });
    on('btn-wipe', function () { $('wipe-confirm').classList.remove('hidden'); });
    on('btn-wipe-no', function () { $('wipe-confirm').classList.add('hidden'); });
    on('btn-wipe-yes', function () {
      Store.wipe();
      applySettings();
      refreshSettings();
      toast('기록을 지웠다');
      if (backTo && backTo !== 'scr-title') { backTo = 'scr-title'; }
    });
    // 동적 목록 (위임)
    $('shop-list').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-i]');
      if (!b || busy || testMode) return;
      Sfx.unlock(); doBuy(parseInt(b.getAttribute('data-i'), 10));
    });
    $('charm-list').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-i]');
      if (!b || busy || testMode) return;
      Sfx.unlock(); pickCharm(parseInt(b.getAttribute('data-i'), 10));
    });
    $('settings-list').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-id]');
      if (!b || testMode) return;
      var id = b.getAttribute('data-id'), s = set();
      s[id] = !s[id];
      Store.save();
      applySettings();
      Sfx.unlock(); Sfx.play('tap');
      refreshSettings();
      if (id === 'reduce' || id === 'bigText') Render.readColors();
    });
    $('suit-list').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-id]');
      if (!b || busy || testMode) return;
      Sfx.unlock(); suitClick(b.getAttribute('data-id'));
    });
    $('codex-tabs').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-t]');
      if (!b) return;
      codexTab = b.getAttribute('data-t'); Sfx.play('tap'); refreshCodex();
    });
    $('rec-tabs').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-t]');
      if (!b) return;
      recTab = b.getAttribute('data-t'); Sfx.play('tap'); refreshRecords();
    });
    // 누르는 순간 반응 (pointerdown 때 눌림 표시)
    document.addEventListener('pointerdown', function (e) {
      var b = e.target.closest && e.target.closest('.btn, button.item, .charm');
      if (b && !b.disabled) { b.classList.add('pressed'); setTimeout(function () { b.classList.remove('pressed'); }, 140); }
    });
    bindStage();
    document.addEventListener('keydown', onKey);
    // 화면 크기 대응: 창 크기·화면 돌림·판 칸 크기가 바뀌면 캔버스를 다시 잰다 (한 프레임에 한 번)
    var fitWait = false;
    function fitScreen() {
      if (fitWait) return;
      fitWait = true;
      Render.frame(function () {
        fitWait = false;
        syncRender();
        if (cur === 'scr-dive' && !testMode) { Render.resize(); refreshDive(); Render.redraw(); }
      });
    }
    window.addEventListener('resize', fitScreen);
    window.addEventListener('orientationchange', fitScreen);
    if (window.ResizeObserver) new ResizeObserver(fitScreen).observe($('stage-wrap'));
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && !testMode) openPause();
      syncRender();
    });
  }

  function startTicker() {
    tick = setInterval(function () {
      if (testMode) return;
      var r = Game.run();
      if (!r || r.over || document.hidden || overlay === 'ov-pause') return;
      if (cur !== 'scr-dive' && cur !== 'scr-boat') return;
      if (window.innerHeight > window.innerWidth) return;
      Game.addTime(1);
      var m = Store.get();
      m.stats.playTime++;
    }, 1000);
  }

  function enterTest() {
    testMode = true;
    tutStep = -1; tutShow();
    Render.stop();
    if (tick) { clearInterval(tick); tick = 0; }
    closeOv();
  }

  function init() {
    Store.load();
    applySettings();
    Render.init();
    bind();
    refreshTitle();
    var t = $('scr-title');
    t.classList.add('active');
    void t.offsetWidth;
    t.classList.add('in');
    startTicker();
  }

  return { init: init, enterTest: enterTest };
})();

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', UI.init);
else UI.init();
