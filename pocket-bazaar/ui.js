// Pocket Bazaar — 화면
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var W = DATA.SHELF_W, N = DATA.SHELF_W * DATA.SHELF_H;
  var current = null;      // 지금 화면 id
  var overlay = null;      // 지금 겹침 id
  var subReturn = null;    // 방법·설정을 닫으면 돌아갈 곳
  var busy = false;
  var selHand = -1;        // 고른 손 물건
  var cursor = 0;          // 키보드 칸
  var timers = [];
  var quitArmed = false;
  var codexTab = 'goods';
  var recTab = 'ach';
  var toastTimer = 0;

  function set() { return Store.meta.settings; }
  // 기기의 '동작 줄이기'(prefers-reduced-motion) 를 켜 두었으면 설정을 끄고 있어도 움직임을 줄인다
  var osMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function osReduce() { return !!(osMotion && osMotion.matches); }
  function reduced() { return !!set().reduce || osReduce(); }
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------- 화면 전환 (한 함수) ----------
  function show(id) {
    if (current === id) return;
    var prev = current ? $(current) : null;
    var next = $(id);
    busy = true;
    if (prev) { prev.classList.remove('in'); prev.classList.remove('on'); }
    next.classList.add('on');
    current = id;
    if (reduced()) next.classList.add('in');
    else requestAnimationFrame(function () { requestAnimationFrame(function () { next.classList.add('in'); }); });
    setTimeout(function () { busy = false; }, 240);
    if (id === 'scr-play') later(fitShelf, 30);
  }
  function openOv(id) {
    if (overlay && overlay !== id) closeOv(true);
    var el = $(id);
    overlay = id;
    busy = true;
    el.classList.add('on');
    if (reduced()) el.classList.add('in');
    else requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('in'); }); });
    setTimeout(function () { busy = false; }, 240);
  }
  function closeOv(instant) {
    if (!overlay) return;
    var el = $(overlay);
    el.classList.remove('in');
    el.classList.remove('on');
    overlay = null;
  }

  // ---------- 버튼 ----------
  function on(id, fn, sound) {
    var el = $(id);
    el.addEventListener('click', function (e) {
      if (busy || el.disabled) return;
      Sfx.unlock();
      if (sound !== false) Sfx.play(sound || 'tap');
      fn(e);
    });
  }
  document.addEventListener('pointerdown', function (e) {
    var b = e.target.closest ? e.target.closest('button') : null;
    if (b && !b.disabled) {
      b.classList.add('pressed');
      var up = function () { b.classList.remove('pressed'); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    }
    Sfx.unlock();
  });

  // ---------- 손맛 도구 ----------
  function flash(bad) {
    var f = $('flash');
    f.classList.remove('on', 'bad');
    void f.offsetWidth;
    if (bad) f.classList.add('bad');
    f.classList.add('on');
  }
  function flashEl(el) {
    if (!el) return;
    el.classList.remove('hit-flash');
    void el.offsetWidth;
    el.classList.add('hit-flash');
  }
  function shake(el, level) {
    if (reduced() || !set().shake) return;
    el = el || $('app');
    el.classList.remove('shake', 'soft', 'hard');
    void el.offsetWidth;
    el.classList.add('shake');
    if (level === 'soft') el.classList.add('soft');
    if (level === 'hard') el.classList.add('hard');
  }
  function bump(el) {
    if (!el || reduced()) return;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }
  // 장터 안의 요소는 장터 층(fx-layer), 겹침·다른 화면의 요소는 맨 위 층(fx-top)에 그린다
  function inPlay(el) { return !!(el.closest && el.closest('#scr-play')); }
  function hiddenFx(el) { return !el || (inPlay(el) && current !== 'scr-play'); }
  function layerFor(el) { return inPlay(el) ? $('fx-layer') : $('fx-top'); }
  function rectOf(el, layer) {
    var r = el.getBoundingClientRect();
    var a = (layer || $('fx-layer')).getBoundingClientRect();
    return { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2, w: r.width, h: r.height };
  }
  function pop(x, y, text, cls, layer) {
    var p = document.createElement('div');
    p.className = 'pop ' + (cls || '');
    p.textContent = text;
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    (layer || $('fx-layer')).appendChild(p);
    setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 950);
  }
  function popOn(el, text, cls) {
    if (hiddenFx(el)) { toast(text); return; }
    var layer = layerFor(el);
    var r = rectOf(el, layer);
    pop(r.x, r.y, text, cls, layer);
  }
  function burst(el, color, n) {
    if (hiddenFx(el) || reduced()) return;
    var layer = layerFor(el);
    var r = rectOf(el, layer);
    n = n || 10;
    for (var i = 0; i < n; i++) {
      var b = document.createElement('div');
      b.className = 'bit';
      var ang = Math.random() * Math.PI * 2, d = 30 + Math.random() * 40;
      b.style.left = r.x + 'px';
      b.style.top = r.y + 'px';
      b.style.setProperty('--dx', Math.cos(ang) * d + 'px');
      b.style.setProperty('--dy', Math.sin(ang) * d + 'px');
      if (color) b.style.background = color;
      layer.appendChild(b);
      (function (bb) { setTimeout(function () { if (bb.parentNode) bb.parentNode.removeChild(bb); }, 520); })(b);
    }
  }
  function ghost(slotEl) {
    if (!slotEl || reduced() || current !== 'scr-play') return;
    var r = rectOf(slotEl);
    var g = slotEl.cloneNode(true);
    g.removeAttribute('id');
    g.style.position = 'absolute';
    g.style.left = (r.x - r.w / 2) + 'px';
    g.style.top = (r.y - r.h / 2) + 'px';
    g.classList.add('sold');
    $('fx-layer').appendChild(g);
    setTimeout(function () { if (g.parentNode) g.parentNode.removeChild(g); }, 380);
  }
  function toast(text) {
    var t = $('toast');
    t.textContent = text;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, 1600);
  }
  function catColor(cat) { return getComputedStyle(document.documentElement).getPropertyValue('--c-' + cat).trim(); }

  // ---------- 첫 판 안내 (한 단계에 한 동작, 그 동작을 하면 다음 단계) ----------
  var TUT = [
    { key: 'pick', host: 'coach', hl: ['hand-list'], text: '오른쪽 <b>손에 든 물건</b> 하나를 누른다. (키보드 1~8)' },
    { key: 'place', host: 'coach', hl: ['shelf'], text: '<b>민트색 빈칸</b>을 누르면 진열된다. 같은 갈래·짝 갈래 옆에 두면 값이 오른다.' },
    { key: 'open', host: 'coach', hl: ['cust-queue', 'btn-open'], text: '왼쪽 손님 줄의 기호가 오늘 손님이 바라는 갈래다. 더 놓고, 다 됐으면 <b>문 열기</b>.' },
    { key: 'sell', host: 'coach', hl: ['shelf'], text: '<b>금색으로 빛나는 칸</b>을 눌러 판다. 판 칸은 비어 이웃 값이 떨어진다.' },
    { key: 'rest', host: 'coach', hl: ['cust-now', 'btn-skip'], text: '남은 손님도 같은 방법으로 받는다. 살 것이 없으면 <b>그냥 보내기</b>(평판 -1).' },
    { key: 'charm', host: 'coach-settle', hl: ['charm-list'], text: '자릿세를 냈다. <b>부적 하나</b>를 고른다 — 판 끝까지 효과가 남는다.' },
    { key: 'market', host: 'coach-market', hl: ['offer-list', 'btn-market-done'], text: '남은 동전으로 물건을 산다(하루 두 장). 산 물건은 다음 장날부터 손에 온다. <b>다음 장날로</b>를 누르면 안내 끝.' }
  ];
  var COACH_HOSTS = ['coach', 'coach-settle', 'coach-market'];
  var tut = -1;            // 지금 안내 단계 (-1 이면 안내 없음)

  function tutStart() {
    tut = Store.meta.tutorialDone ? -1 : 0;
    if (tut === 0) selHand = -1;   // 첫 동작(물건 고르기)을 직접 하게 한다
    renderCoach();
  }
  function tutStep(key) { return tut >= 0 && TUT[tut].key === key; }
  function tutTo(key) {    // 앞으로만 넘긴다
    if (tut < 0) return;
    for (var i = tut + 1; i < TUT.length; i++) {
      if (TUT[i].key === key) { tut = i; renderCoach(); bump($(TUT[i].host)); return; }
    }
  }
  function tutEnd(save, msg) {
    if (save) { Store.meta.tutorialDone = true; Store.save(); }
    if (tut < 0 && !save) return;
    tut = -1;
    renderCoach();
    if (msg) toast(msg);
  }
  function renderCoach() {
    var step = tut >= 0 ? TUT[tut] : null;
    var hl = document.querySelectorAll('.coach-hl');
    for (var i = 0; i < hl.length; i++) hl[i].classList.remove('coach-hl');
    var mainBefore = !$('coach').classList.contains('hidden');
    COACH_HOSTS.forEach(function (id) {
      var el = $(id);
      var here = !!step && step.host === id;
      el.classList.toggle('hidden', !here);
      el.innerHTML = here ? '<span class="coach-n">' + (tut + 1) + '/' + TUT.length + '</span><span class="coach-text">' + step.text + '</span>' +
        '<button class="btn coach-never" data-coach="never">다시 보지 않기</button>' : '';
    });
    if (step) step.hl.forEach(function (id) { var t = $(id); if (t) t.classList.add('coach-hl'); });
    if (mainBefore !== !$('coach').classList.contains('hidden')) later(fitShelf, 30);
  }

  // ---------- 시작 ----------
  function refreshTitle() {
    var m = Store.meta;
    $('btn-continue').classList.toggle('hidden', !Game.canContinue());
    var st = Game.stall(m.stall);
    $('title-meta').textContent = '가판대 ' + st.icon + ' ' + st.name + ' · 최고 점수 ' + m.best + ' · 장터 도장 ' + m.stamps + (Store.ok ? '' : ' · 저장이 안 되는 브라우저');
    var d = Game.daily();
    var saved = d.played && !d.done ? Store.loadRun() : null;
    var db = $('btn-daily');
    db.disabled = d.played;
    db.textContent = d.played ? '오늘 도전 끝' : '오늘의 도전';
    $('daily-note').textContent = d.done ? d.date + ' 도전 점수 ' + d.score + (d.won ? ' (버팀)' : ' (' + d.reached + '장날)') + ' · 내일 새 판'
      : d.played ? (saved && saved.daily && saved.dailyDate === d.date ? d.date + ' 도전 중 — 이어하기로 계속한다' : d.date + ' 도전은 마치지 않고 끝났다 · 내일 새 판')
      : d.date + ' 판 · 모두 같은 판, 하루 한 번' + (d.best ? ' · 도전 최고 ' + d.best : '');
  }
  function startRun(daily) {
    daily = daily === true;
    if (daily && Game.daily().played) { refreshTitle(); toast('오늘의 도전은 이미 했다 — 내일 새 판이 열린다'); return; }
    clearTimers();
    selHand = -1;
    cursor = 0;
    if (!Game.newRun(Store.meta.stall, false, daily)) { refreshTitle(); return; }
    closeOv();
    show('scr-play');
    tutStart();
    refreshPlay();
    Sfx.play('start');
    if (daily) toast('오늘의 도전 — ' + Game.run.dailyDate + ' 판 (하루 한 번)');
  }
  function continueRun() {
    clearTimers();
    if (!Game.resume()) { refreshTitle(); toast('이어할 판이 없다'); return; }
    selHand = -1;
    tut = -1;
    renderCoach();
    show('scr-play');
    refreshPlay();
    reopenPhase();
  }
  function reopenPhase() {
    var r = Game.run;
    if (!r) return;
    if (r.phase === 'settle') openSettle();
    else if (r.phase === 'market') openMarket();
  }

  // ---------- 장터 ----------
  function fitShelf() {
    var c = document.querySelector('.center');
    if (!c || !c.clientWidth) return;
    var lg = $('shelf-legend');
    var legend = (lg && lg.offsetHeight ? lg.offsetHeight : 18) + 6 + 2;   // 범례 실제 높이 + .center gap + 여유
    var gap = 6, pad = 16 + 8;
    var sw = (c.clientWidth - pad - gap * (W - 1)) / W;
    var sh = (c.clientHeight - legend - pad - gap * 2) / DATA.SHELF_H;
    var s = Math.floor(Math.max(44, Math.min(sw, sh, 150)));
    document.documentElement.style.setProperty('--slot', s + 'px');
    $('shelf').classList.toggle('large', s >= 110);
  }
  function repText(n) {
    var s = '';
    for (var i = 0; i < 10; i += 2) s += n >= i + 2 ? '●' : (n >= i + 1 ? '◐' : '○');
    return s + ' ' + n;
  }

  function refreshPlay() {
    var r = Game.run;
    if (!r) return;
    $('top-day').textContent = (r.daily ? '도전 ' : '') + r.day + '/' + DATA.DAYS.length;
    var ev = Game.event(r.event);
    $('top-event').textContent = ev.icon + ' ' + ev.name + ' — ' + ev.desc;
    $('top-coins').textContent = r.coins;
    $('top-rent').textContent = r.rent;
    $('top-rep').textContent = repText(r.rep);
    refreshCustomers();
    refreshShelf();
    refreshHand();
    var stock = r.phase === 'stock';
    var selling = r.phase === 'sell';
    $('btn-open').classList.toggle('hidden', !stock);
    $('btn-skip').classList.toggle('hidden', !selling || !r.cur);
    $('btn-open').disabled = !stock;
    $('deck-info').textContent = '· 남은 더미 ' + r.draw.length + ' · 버린 더미 ' + r.discard.length;
    var tip = '';
    if (stock) tip = r.hand.length ? '물건을 누르고 빈칸을 누른다. 같은 갈래·짝 갈래끼리 붙이면 값이 오른다.' : '다 놓았다. 문 열기를 누른다.';
    else if (selling) tip = '빛나는 칸 중 하나를 팔거나, 그냥 보낸다(평판 -1).';
    $('phase-tip').textContent = tip;
  }

  function wishLabel(w) {
    if (w === 'any') return '<b>아무거나</b>';
    var c = DATA.CATS[w];
    return '<b class="cat-' + w + '">' + c.mark + ' ' + c.name + '</b>';
  }
  function refreshCustomers() {
    var r = Game.run;
    var now = $('cust-now');
    if (r.phase === 'sell' && r.cur) {
      var c = Game.cust(r.cur);
      now.className = 'cust-now' + (c.wish !== 'any' ? ' cat-' + c.wish : '');
      now.innerHTML = '<div class="who"><span class="ic">' + c.icon + '</span>' + esc(c.name) + '</div>' +
        '<div class="wish">바람: ' + wishLabel(c.wish) + ' · ×' + c.mult.toFixed(1) + '</div>' +
        '<div class="line">' + esc(c.line) + (c.rep ? ' (팔면 평판 +' + c.rep + ')' : '') + '</div>';
      $('cust-title').textContent = '손님 ' + (r.qi + 1) + '/' + r.queue.length;
    } else {
      now.className = 'cust-now empty';
      now.innerHTML = r.phase === 'stock' ? '오늘은 손님 ' + r.queue.length + '명.<br>바라는 갈래를 보고 진열한다.' : '장날이 끝났다';
      $('cust-title').textContent = '오늘 올 손님';
    }
    var q = $('cust-queue');
    var html = '';
    r.queue.forEach(function (id, i) {
      var c = Game.cust(id);
      var cls = 'qchip' + (c.wish !== 'any' ? ' cat-' + c.wish : '');
      if (r.phase === 'sell' && i < r.qi) cls += ' done';
      if (r.phase === 'sell' && i === r.qi) cls += ' now';
      if (r.phase !== 'stock' && r.phase !== 'sell') cls += ' done';
      var mk = c.wish === 'any' ? '?' : DATA.CATS[c.wish].mark;
      html += '<span class="' + cls + '" title="' + esc(c.name) + '">' + c.icon + mk + '</span>';
    });
    q.innerHTML = html;
  }

  function refreshShelf() {
    var r = Game.run;
    var sh = $('shelf');
    if (sh.children.length !== N) {
      sh.innerHTML = '';
      for (var i = 0; i < N; i++) {
        var b = document.createElement('button');
        b.className = 'slot';
        b.id = 'slot-' + i;
        b.setAttribute('data-slot', i);
        sh.appendChild(b);
      }
    }
    var cust = r.phase === 'sell' && r.cur ? Game.cust(r.cur) : null;
    var sellable = cust ? Game.matches(cust) : [];
    var selCard = selHand >= 0 && r.hand[selHand] ? Game.goods(r.hand[selHand].id) : null;
    // 진열 도우미: 고른 물건을 빈칸마다 놓았을 때의 값(설정 `값 미리 보기`)
    var pv = [], best = -1;
    if (r.phase === 'stock' && selCard && set().preview) {
      for (var k = 0; k < N; k++) {
        pv[k] = r.shelf[k] ? null : Game.previewPlace(selHand, k);
        if (pv[k] && (best < 0 || pv[k].price + pv[k].gain > pv[best].price + pv[best].gain)) best = k;
      }
    }
    for (var s = 0; s < N; s++) {
      var el = sh.children[s];
      var it = r.shelf[s];
      var cls = 'slot';
      var html = '';
      var label = '';
      if (it) {
        var g = Game.goods(it.id);
        cls += ' full cat-' + g.cat;
        var p = Game.priceAt(s, cust);
        html = '<span class="mk">' + DATA.CATS[g.cat].mark + '</span>' +
          (g.tag ? '<span class="tg">' + DATA.TAGS[g.tag].name + '</span>' : '') +
          '<span class="ic">' + g.icon + '</span><span class="nm">' + esc(g.name) + '</span>' +
          (it.fresh > 0 ? '<span class="fr">' + it.fresh + '일</span>' : '') +
          (set().preview || cust ? '<span class="pr">' + p.price + '</span>' : '');
        label = g.name + ' ' + DATA.CATS[g.cat].name + ' 값 ' + p.price;
        if (cust) cls += sellable.indexOf(s) >= 0 ? ' can-sell' : ' dimmed';
        if (selCard) {
          if (g.cat === selCard.cat) cls += ' hot-same';
          else if (DATA.CATS[selCard.cat].pair === g.cat) cls += ' hot-pair';
        }
      } else {
        label = '빈칸';
        if (r.phase === 'stock' && selCard) cls += ' can-place';
        var q = pv[s];
        if (q) {
          html = '<span class="pv">' + q.price + '</span>' +
            (q.gain ? '<span class="pv-gain' + (q.gain < 0 ? ' bad' : '') + '">이웃 ' + (q.gain > 0 ? '+' : '') + q.gain + '</span>' : '');
          label = '빈칸 — ' + selCard.name + ' 놓으면 값 ' + q.price + (q.gain ? ', 이웃 ' + (q.gain > 0 ? '+' : '') + q.gain : '');
          if (s === best) cls += ' pv-best';
        }
      }
      if (s === cursor && kbUsed) cls += ' cursor';
      el.className = cls;
      el.innerHTML = html;
      el.setAttribute('aria-label', label);
      el.disabled = r.over;
    }
    var lg = '';
    DATA.CAT_KEYS.forEach(function (k) {
      var c = DATA.CATS[k];
      lg += '<span class="cat-' + k + '"><b>' + c.mark + '</b>' + c.name + '</span> ';
    });
    $('shelf-legend').innerHTML = lg + '· 짝: 먹↔마 · 옷↔장 · 장난감↔도구';
  }

  function refreshHand() {
    var r = Game.run;
    var list = $('hand-list');
    if (selHand >= r.hand.length) selHand = -1;
    if (!r.hand.length) {
      list.innerHTML = '<p class="empty-note">' + (r.phase === 'stock' ? '손에 든 물건이 없다' : '내일 새 물건을 받는다') + '</p>';
      return;
    }
    var html = '';
    r.hand.forEach(function (card, i) {
      var g = Game.goods(card.id);
      html += '<button class="hcard cat-' + g.cat + (i === selHand ? ' sel' : '') + '" data-hand="' + i + '"' + (r.phase !== 'stock' ? ' disabled' : '') +
        ' aria-label="' + esc(g.name + ' ' + DATA.CATS[g.cat].name + ' 값 ' + g.base) + '">' +
        '<span class="key">' + (i + 1) + '</span><span class="ic">' + g.icon + '</span><span class="nm">' + esc(g.name) +
        (g.tag ? ' <small>' + DATA.TAGS[g.tag].name + '</small>' : '') + '</span><span class="v">' + g.base + '</span></button>';
    });
    list.innerHTML = html;
  }

  function selectHand(i) {
    var r = Game.run;
    if (!r || r.phase !== 'stock' || !r.hand[i]) return;
    selHand = selHand === i ? -1 : i;
    Sfx.play('pick');
    if (selHand >= 0 && tutStep('pick')) tutTo('place');
    refreshShelf();
    refreshHand();
  }
  function slotPress(s) {
    var r = Game.run;
    if (!r || r.over || busy || overlay) return;
    if (r.phase === 'stock') {
      if (r.shelf[s]) {
        var g = Game.goods(r.shelf[s].id);
        var p = Game.priceAt(s, null);
        toast(g.icon + ' ' + g.name + ' — 지금 값 ' + p.price + (p.notes.length ? ' (' + p.notes.join(', ') + ')' : '') + ' · 이웃 같은 갈래 ' + p.same + ' · 짝 ' + p.pair);
        return;
      }
      if (selHand < 0) {
        if (r.hand.length) {
          selHand = 0; refreshShelf(); refreshHand(); toast('물건을 먼저 고른다 — 첫 물건을 골랐다');
          if (tutStep('pick')) tutTo('place');
        }
        return;
      }
      if (Game.place(selHand, s)) {
        if (selHand >= r.hand.length) selHand = r.hand.length - 1;
        refreshPlay();
      }
    } else if (r.phase === 'sell') {
      if (!r.cur) return;
      var c = Game.cust(r.cur);
      if (Game.matches(c).indexOf(s) < 0) {
        var el = $('slot-' + s);
        Sfx.play('block');
        flashEl(el);
        shake(el, 'soft');
        popOn(el, '이건 안 산다', 'bad');
        bump($('cust-now'));
        return;
      }
      Game.sell(s);
    }
  }

  // ---------- 규칙 사건 → 화면 ----------
  function handle(type, d) {
    var r = Game.run;
    switch (type) {
      case 'day':
        selHand = r && r.hand.length ? 0 : -1;
        if (current === 'scr-play') {
          refreshPlay();
          var ev = Game.event(d.event);
          toast(DATA.DAYS[d.day - 1].name + ' — ' + ev.icon + ' ' + ev.name);
          bump($('top-day'));
          flashEl($('top-event'));
        }
        break;
      case 'place': {
        Sfx.play('place');
        Sfx.buzz(8);
        if (r && selHand >= r.hand.length) selHand = r.hand.length - 1;
        refreshPlay();
        var el = $('slot-' + d.slot);
        flashEl(el);
        shake(el, 'soft');
        bump(el);
        var p = Game.priceAt(d.slot, null);
        popOn(el, '값 ' + p.price, p.same + p.pair > 0 ? 'good' : '');
        if (p.pair > 0) burst(el, catColor(Game.goods(d.id).cat), 6);
        if (tutStep('pick') || tutStep('place')) tutTo('open');
        break;
      }
      case 'open':
        Sfx.play('open');
        selHand = -1;
        tutTo('sell');
        refreshPlay();
        flash(false);
        shake($('shelf'), 'soft');
        break;
      case 'customer':
        Sfx.play('customer');
        refreshPlay();
        var cn = $('cust-now');
        cn.style.animationDuration = set().fast ? '0.12s' : '';
        bump(cn);
        break;
      case 'sell': {
        var se = $('slot-' + d.slot);
        ghost(se);
        var big = d.price >= 10;
        Sfx.play(big ? 'bigcoin' : 'coin');
        Sfx.buzz(big ? 30 : 12);
        popOn(se, '+' + d.price, big ? 'big' : '');
        burst(se, catColor(Game.goods(d.id).cat), big ? 16 : 9);
        flash(false);
        shake(big ? null : $('shelf'), big ? 'soft' : 'soft');
        refreshPlay();
        bump($('top-coins'));
        if (d.rep > 0) popOn($('top-rep'), '평판 +' + d.rep, 'good');
        if (d.info && (d.info.same || d.info.pair)) popOn($('cust-now'), (d.info.pair ? '짝 ' + d.info.pair + ' ' : '') + (d.info.same ? '같은 갈래 ' + d.info.same : ''), 'good');
        if (tutStep('sell')) tutTo('rest');
        break;
      }
      case 'leave': {
        Sfx.play(d.none ? 'leave' : 'sad');
        refreshPlay();
        var cp = $('cust-now');
        flashEl(cp);
        shake(cp, 'hard');
        flash(true);
        bump($('top-rep'));
        var c = Game.cust(d.id);
        popOn($('top-rep'), d.rep < 0 ? '평판 ' + d.rep : '평판 그대로', 'bad');
        if (d.none) toast(c.icon + ' ' + c.name + ': 바라는 물건이 없어 그냥 간다');
        break;
      }
      case 'spoil':
        Sfx.play('spoil');
        flash(true);
        shake($('shelf'), d.list.length > 2 ? 'hard' : false);
        d.list.forEach(function (x) {
          var el2 = $('slot-' + x.slot);
          flashEl(el2);
          ghost(el2);
          popOn(el2, '상함', 'bad');
          bump(el2);
        });
        if (d.refund) toast('얼음 상자: 동전 +' + d.refund);
        break;
      case 'settle':
        refreshPlay();
        tutTo('charm');
        later(function () { openSettle(); Sfx.play('rent'); }, 520);
        break;
      case 'charm':
        Sfx.play('charm');
        Sfx.buzz(20);
        tutTo('market');
        break;
      case 'market':
        later(openMarket, 60);
        break;
      case 'buy': {
        Sfx.play('buy');
        Sfx.buzz(15);
        refreshMarket();
        var oc = document.querySelector('[data-offer="' + d.idx + '"]');
        var bg = Game.goods(d.id);
        flashEl(oc);
        shake(oc, d.cost >= 6 ? false : 'soft');
        bump(oc);
        burst(oc, catColor(bg.cat), d.cost >= 6 ? 12 : 7);
        popOn(oc, '+1 ' + bg.icon, d.cost >= 6 ? 'big' : 'good');
        popOn($('market-coins'), '-' + d.cost, '');
        bump($('market-coins'));
        break;
      }
      case 'nobuy': {
        Sfx.play('nobuy');
        var ob = document.querySelector('[data-offer="' + d.idx + '"]');
        var oo = r && r.offers[d.idx];
        flashEl(ob);
        shake(ob, false);
        if (Game.buyLimitHit()) popOn(ob, DATA.BUY_MAX + '장 끝', 'bad');
        else if (oo) popOn(ob, '동전 ' + (r.coins - oo.cost), 'bad');
        bump($('market-coins'));
        toast(Game.buyLimitHit() ? '오늘은 ' + DATA.BUY_MAX + '장까지만 산다' : '동전이 모자라다');
        break;
      }
      case 'leaveMarket':
        closeOv();
        if (tutStep('market')) tutEnd(true, '첫 판 안내 끝 — 규칙은 멈춤 ❚❚ → 방법에서 다시 본다');
        break;
      case 'reshuffle':
        Sfx.play('shuffle');
        if (current === 'scr-play') popOn($('deck-info'), '더미를 섞었다', 'good');
        break;
      case 'ach':
        Sfx.play('ach');
        toast('업적: ' + d.name + ' (장터 도장 +1)');
        if (current === 'scr-play') {
          var ad = $('top-day');
          flashEl(ad);
          shake(ad, 'soft');
          bump(ad);
          burst(ad, null, 8);
          popOn(ad, '도장 +1', 'good');
        }
        break;
      case 'over':
        if (tut >= 0) { tut = -1; renderCoach(); }   // 안내 중에 판이 끝나면 다음 판에 다시 안내한다
        refreshPlay();
        Sfx.play(d.won ? 'win' : 'fail');
        flash(!d.won);
        shake(null, d.won ? 'soft' : 'hard');
        burst($('top-coins'), d.won ? null : catColor('toy'), 18);
        bump($('top-coins'));
        popOn($('top-coins'), (d.won ? '이겼다 ' : '점수 ') + r.score, d.won ? 'huge' : 'huge bad');
        later(showResult, 900);
        break;
      case 'resume':
        break;
    }
  }

  // ---------- 하루 끝 ----------
  function openSettle() {
    var r = Game.run;
    if (!r || r.phase !== 'settle') return;
    var s = r.summary;
    $('settle-title').textContent = DATA.DAYS[s.day - 1].name + ' 끝';
    var lines = [
      ['판 물건', s.sold + '개'], ['번 동전', '+' + s.earned], ['그냥 간 손님', s.skipped + '명'],
      ['상한 물건', s.spoiled + '개' + (s.refund ? ' (돌려받음 +' + s.refund + ')' : '')]
    ];
    if (s.interest) lines.push(['복주머니', '+' + s.interest]);
    lines.push(['자릿세', '-' + s.rent], ['남은 동전', r.coins]);
    $('settle-lines').innerHTML = lines.map(function (l) { return '<div class="ln"><span>' + l[0] + '</span><b>' + l[1] + '</b></div>'; }).join('');
    var html = '';
    r.charmOffer.forEach(function (id, i) {
      var c = Game.charm(id);
      html += '<button class="ccard r' + c.rar + '" data-charm="' + i + '"><span class="top"><span class="ic">' + c.icon + '</span>' + esc(c.name) +
        '</span><span class="desc">' + esc(c.desc) + '</span><span class="dim small">' + (i + 1) + '번</span></button>';
    });
    $('charm-list').innerHTML = html;
    openOv('ov-settle');
    bump($('settle-lines'));
  }
  function pickCharm(i) {
    if (busy) return;
    var el = document.querySelector('[data-charm="' + i + '"]');
    var ch = Game.run && Game.run.charmOffer[i] ? Game.charm(Game.run.charmOffer[i]) : null;
    if (el) {
      flashEl(el);
      shake(el, 'soft');
      bump(el);
      burst(el, null, ch && ch.rar >= 2 ? 14 : 8);
      if (ch) popOn(el, '+ ' + ch.icon + ' ' + ch.name, ch.rar >= 2 ? 'big' : 'good');
    }
    Game.pickCharm(i);
  }

  // ---------- 장보기 ----------
  function openMarket() {
    var r = Game.run;
    if (!r || r.phase !== 'market') return;
    refreshMarket();
    openOv('ov-market');
    refreshPlay();
  }
  function refreshMarket() {
    var r = Game.run;
    if (!r) return;
    $('market-coins').textContent = r.coins;
    var nd = DATA.DAYS[r.day] || DATA.DAYS[DATA.DAYS.length - 1];
    $('market-rent').textContent = '약 ' + nd.rent;
    $('market-deck').textContent = Game.deckSize();
    var html = '';
    var full = Game.buyLimitHit();
    r.offers.forEach(function (o, i) {
      var g = Game.goods(o.id);
      var can = Game.canBuy(i);
      html += '<button class="ccard cat-' + g.cat + (o.bought ? ' bought' : '') + '" data-offer="' + i + '"' + (o.bought ? ' disabled' : '') + '>' +
        '<span class="top"><span class="ic">' + g.icon + '</span>' + esc(g.name) + '</span>' +
        '<span class="desc">' + DATA.CATS[g.cat].mark + ' ' + DATA.CATS[g.cat].name + ' · 값 ' + g.base +
        (g.fresh ? ' · ' + g.fresh + '일 버팀' : '') + (g.tag ? ' · ' + DATA.TAGS[g.tag].name + ': ' + DATA.TAGS[g.tag].desc : '') + '</span>' +
        '<span class="cost">' + (o.bought ? '샀다' : '동전 ' + o.cost + (can ? '' : full ? ' (오늘 다 샀다)' : ' (모자람)')) + ' · ' + (i + 1) + '번</span></button>';
    });
    $('offer-list').innerHTML = html;
  }

  // ---------- 멈춤 ----------
  function openPause() {
    var r = Game.run;
    if (!r || r.over || current !== 'scr-play' || overlay) return;
    quitArmed = false;
    $('btn-quit').textContent = '장 접기';
    var charms = r.charms.map(function (id) { var c = Game.charm(id); return c.icon + ' ' + c.name; }).join(', ') || '없음';
    $('pause-info').innerHTML = [
      ['장날', r.day + '/' + DATA.DAYS.length], ['동전', r.coins], ['번 동전', r.earned], ['평판', r.rep],
      ['물건', Game.deckSize() + '장'], ['부적', charms], ['가판대', Game.stall(r.stall).name]
    ].concat(r.daily ? [['판', '오늘의 도전 ' + r.dailyDate]] : []).map(function (l) { return '<div class="ln"><span>' + l[0] + '</span><b>' + esc(l[1]) + '</b></div>'; }).join('');
    openOv('ov-pause');
  }
  function resumePlay() {
    closeOv();
    reopenPhase();
  }

  // ---------- 결과 ----------
  function showResult() {
    var r = Game.run;
    if (!r) return;
    closeOv();
    $('res-title').textContent = (r.daily ? '오늘의 도전 · ' : '') + (r.won ? '열 장날을 버텼다!' : DATA.DAYS[r.day - 1].name + '에 가판대를 접었다');
    $('res-why').textContent = r.reason + (r.daily ? ' · ' + r.dailyDate + ' 판은 끝났다. 내일 새 판이 열린다' : '');
    var m = Store.meta;
    var mm = Math.floor(r.time / 60), ss = Math.floor(r.time % 60);
    $('res-lines').innerHTML = (r.daily ? [['도전 최고', m.dailyBest || 0]] : []).concat([
      ['점수', r.score], ['최고 점수', m.best], ['버틴 장날', (r.won ? r.day : r.day - 1) + '/' + DATA.DAYS.length],
      ['번 동전', r.earned], ['판 물건', r.sold], ['가장 큰 장사', r.biggest], ['그냥 간 손님', r.skipped],
      ['상한 물건', r.spoiled], ['부적', r.charms.length], ['받은 장터 도장', r.stampsGot || 0], ['걸린 시간', mm + '분 ' + ss + '초']
    ]).map(function (l) { return '<div class="ln"><span>' + l[0] + '</span><b>' + l[1] + '</b></div>'; }).join('');
    $('res-new').classList.toggle('hidden', !r.newBest);
    $('share-box').classList.add('hidden');
    $('share-text').value = shareText();
    show('scr-result');
  }

  // ---------- 결과 공유 문구 ----------
  function shareText() {
    var r = Game.run;
    if (!r) return '';
    var days = (r.won ? r.day : r.day - 1) + '/' + DATA.DAYS.length;
    var head = 'Pocket Bazaar' + (r.daily ? ' · 오늘의 도전 ' + r.dailyDate : '');
    var body = (r.won ? '열 장날을 버텼다!' : DATA.DAYS[r.day - 1].name + '에 가판대를 접었다') +
      ' · 버틴 장날 ' + days;
    var nums = '점수 ' + r.score + ' · 번 동전 ' + r.earned + ' · 판 물건 ' + r.sold + ' · 가장 큰 장사 ' + r.biggest;
    return head + '\n' + body + '\n' + nums + (r.newBest ? '\n새 최고 점수!' : '');
  }
  // 복사가 막히면(권한·브라우저) 글 상자를 보여 주고 글을 골라 둔다
  function shareFallback() {
    var ta = $('share-text');
    $('share-box').classList.remove('hidden');
    ta.value = shareText();
    var ok = false;
    try { ta.focus(); ta.select(); ta.setSelectionRange(0, ta.value.length); ok = document.execCommand('copy'); } catch (e) { ok = false; }
    $('share-note').textContent = ok ? '결과 문구를 복사했다. 아래 글 상자에도 있다.' : '복사가 막혔다. 아래 글을 길게 눌러(또는 Ctrl+C) 복사한다.';
    if (ok) { toast('결과 문구를 복사했다'); bump($('btn-share')); }
  }
  function copyShare() {
    var text = shareText();
    if (!text) return;
    var done = function () {
      $('share-box').classList.remove('hidden');
      $('share-text').value = text;
      $('share-note').textContent = '결과 문구를 복사했다. 아래 글 상자에도 있다.';
      toast('결과 문구를 복사했다');
      bump($('btn-share'));
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext !== false) {
        navigator.clipboard.writeText(text).then(done, shareFallback);
        return;
      }
    } catch (e) { /* 아래 대체 방법으로 */ }
    shareFallback();
  }

  // ---------- 설정 ----------
  function applySettings() {
    var s = set();
    document.body.classList.toggle('reduce', reduced());
    document.body.classList.toggle('big', !!s.big);
  }
  function refreshSettings() {
    var s = set();
    $('settings-list').innerHTML = DATA.SETTINGS.map(function (x) {
      return '<button class="toggle' + (s[x.id] ? ' on' : '') + '" data-set="' + x.id + '" aria-pressed="' + !!s[x.id] + '"><span>' + x.name + '</span><span class="sw"></span></button>';
    }).join('');
    $('wipe-confirm').classList.add('hidden');
    $('btn-wipe').classList.remove('hidden');
    $('btn-tutorial').disabled = !Store.meta.tutorialDone;
    $('btn-tutorial').textContent = Store.meta.tutorialDone ? '첫 판 안내 다시 보기' : '다음 판에 첫 판 안내';
  }
  function openSub(id, back) {
    subReturn = back || null;
    if (id === 'scr-settings') refreshSettings();
    if (id === 'scr-stalls') refreshStalls();
    if (id === 'scr-codex') refreshCodex();
    if (id === 'scr-records') refreshRecords();
    if (overlay) closeOv();
    show(id);
  }
  function backFromSub() {
    if (subReturn === 'pause') {
      show('scr-play');
      refreshPlay();
      later(openPause, 260);
    } else {
      refreshTitle();
      show('scr-title');
    }
    subReturn = null;
  }

  // ---------- 가판대 ----------
  function refreshStalls() {
    var m = Store.meta;
    $('stall-stamps').textContent = m.stamps;
    $('stall-list').innerHTML = DATA.STALLS.map(function (st) {
      var own = m.stalls.indexOf(st.id) >= 0;
      var cur = m.stall === st.id;
      var lab = cur ? '쓰는 중' : own ? '고르기' : '장터 도장 ' + st.cost + '개로 열기';
      return '<button class="ccard' + (cur ? ' on' : '') + '" data-stall="' + st.id + '"' + (!own && m.stamps < st.cost ? ' disabled' : '') + '>' +
        '<span class="top"><span class="ic">' + st.icon + '</span>' + esc(st.name) + '</span><span class="desc">' + esc(st.desc) + '</span><span class="cost">' + lab + '</span></button>';
    }).join('');
  }

  // ---------- 도감 ----------
  var CODEX_TABS = [['goods', '물건'], ['cust', '손님'], ['charms', '부적'], ['events', '사건'], ['stalls', '가판대']];
  function refreshCodex() {
    var m = Store.meta;
    $('codex-tabs').innerHTML = CODEX_TABS.map(function (t) { return '<button class="btn' + (t[0] === codexTab ? ' on' : '') + '" data-ctab="' + t[0] + '">' + t[1] + '</button>'; }).join('');
    var items = [], seenN = 0;
    if (codexTab === 'goods') items = DATA.GOODS.map(function (g) {
      var s = !!m.seen.goods[g.id];
      return [s, g.cat, s ? g.icon + ' ' + g.name : '???', s ? DATA.CATS[g.cat].name + ' · 값 ' + g.base + (g.fresh ? ' · ' + g.fresh + '일' : '') + (g.tag ? ' · ' + DATA.TAGS[g.tag].name : '') : '아직 못 본 물건'];
    });
    else if (codexTab === 'cust') items = DATA.CUSTOMERS.map(function (c) {
      var s = !!m.seen.cust[c.id];
      return [s, c.wish === 'any' ? '' : c.wish, s ? c.icon + ' ' + c.name : '???', s ? '바람: ' + (c.wish === 'any' ? '아무거나' : DATA.CATS[c.wish].name) + ' · ×' + c.mult + ' · ' + c.line : c.minDay + '째 장날부터 온다'];
    });
    else if (codexTab === 'charms') items = DATA.CHARMS.map(function (c) {
      var s = !!m.seen.charms[c.id];
      return [s, '', s ? c.icon + ' ' + c.name : '???', s ? c.desc : '아직 못 고른 부적'];
    });
    else if (codexTab === 'events') items = DATA.EVENTS.map(function (e) {
      var s = !!m.seen.events[e.id];
      return [s, '', s ? e.icon + ' ' + e.name : '???', s ? e.desc : '아직 못 본 날'];
    });
    else items = DATA.STALLS.map(function (st) {
      var s = m.stalls.indexOf(st.id) >= 0;
      return [s, '', st.icon + ' ' + st.name, st.desc + (s ? '' : ' (잠김)')];
    });
    items.forEach(function (it) { if (it[0]) seenN++; });
    $('codex-count').textContent = seenN + '/' + items.length;
    $('codex-list').innerHTML = items.map(function (it) {
      return '<div class="citem' + (it[0] ? '' : ' locked') + (it[1] ? ' cat-' + it[1] : '') + '"><b>' + esc(it[2]) + '</b>' + esc(it[3]) + '</div>';
    }).join('');
  }

  // ---------- 기록 ----------
  var REC_TABS = [['ach', '업적'], ['log', '장터 일지'], ['stats', '통계'], ['ledger', '장부']];
  function refreshRecords() {
    var m = Store.meta;
    $('rec-tabs').innerHTML = REC_TABS.map(function (t) { return '<button class="btn' + (t[0] === recTab ? ' on' : '') + '" data-rtab="' + t[0] + '">' + t[1] + '</button>'; }).join('');
    var html = '';
    if (recTab === 'ach') html = DATA.ACHS.map(function (a) {
      var got = !!m.ach[a.id];
      return '<div class="citem' + (got ? '' : ' locked') + '"><b>' + (got ? '🏅 ' : '') + esc(a.name) + '</b>' + esc(a.desc) + '</div>';
    }).join('');
    else if (recTab === 'log') html = DATA.LOG.map(function (l, i) {
      var got = !!m.log[l.id];
      return '<div class="citem' + (got ? '' : ' locked') + '"><b>일지 ' + (i + 1) + '</b>' + (got ? esc(l.text) : '아직 쓰지 않은 쪽') + '</div>';
    }).join('');
    else if (recTab === 'ledger') html = Ledger.html(esc);   // ledger.js — 지난 판 장날별·갈래별·손님·큰 장사
    else {
      var st = m.stats;
      html = [
        ['판 수', m.runs], ['이긴 판', m.wins], ['최고 점수', m.best], ['가장 멀리 간 장날', m.bestDay],
        ['판 물건', st.sales], ['번 동전', st.earned], ['가장 큰 장사', st.biggest], ['그냥 간 손님', st.skipped],
        ['상한 물건', st.spoiled], ['자릿세 낸 날', st.days], ['고른 부적', st.charms], ['산 물건', st.bought],
        ['장터 도장', m.stamps], ['연 가판대', m.stalls.length + '/' + DATA.STALLS.length],
        ['평균 번 동전', m.runs ? Math.round(st.earned / m.runs) : 0], ['업적', Object.keys(m.ach).length + '/' + DATA.ACHS.length],
        ['오늘의 도전 한 날', m.dailyRuns || 0], ['도전 최고 점수', m.dailyBest || 0]
      ].map(function (l) { return '<div class="citem"><b>' + l[1] + '</b>' + l[0] + '</div>'; }).join('');
    }
    $('rec-list').innerHTML = html;
  }

  // ---------- 키보드 ----------
  var kbUsed = false;
  function onKey(e) {
    var k = e.key;
    var r = Game.run;
    if (busy) return;
    if (current === 'scr-title') {
      if (k === 'Enter' || k === ' ') { e.preventDefault(); if (Game.canContinue()) continueRun(); else startRun(); }
      return;
    }
    if (current === 'scr-result') {
      if (e.target && e.target.id === 'share-text' && k !== 'Escape') return;
      if (k === 'c' || k === 'C') { if (!e.ctrlKey && !e.metaKey) copyShare(); return; }
      if (k === 'Enter' || k === ' ') { e.preventDefault(); startRun(); }
      else if (k === 'Escape') { refreshTitle(); show('scr-title'); }
      return;
    }
    if (current !== 'scr-play') {
      if (k === 'Escape') backFromSub();
      return;
    }
    if (!r) return;
    if (overlay === 'ov-pause') {
      if (k === 'Escape' || k === 'p' || k === 'P' || k === 'Enter') { e.preventDefault(); resumePlay(); }
      return;
    }
    if (overlay === 'ov-settle') {
      var ci = parseInt(k, 10);
      if (ci >= 1 && ci <= 3) pickCharm(ci - 1);
      return;
    }
    if (overlay === 'ov-market') {
      var mi = parseInt(k, 10);
      if (mi >= 1 && mi <= 9) Game.buy(mi - 1);
      else if (k === 'Enter') { e.preventDefault(); Sfx.play('start'); Game.leaveMarket(); }
      return;
    }
    if (k === 'p' || k === 'P' || k === 'Escape') { openPause(); return; }
    if (r.over) return;
    if (k.indexOf('Arrow') === 0) {
      e.preventDefault();
      kbUsed = true;
      var cr = Math.floor(cursor / W), cc = cursor % W;
      if (k === 'ArrowLeft') cc = (cc + W - 1) % W;
      if (k === 'ArrowRight') cc = (cc + 1) % W;
      if (k === 'ArrowUp') cr = (cr + DATA.SHELF_H - 1) % DATA.SHELF_H;
      if (k === 'ArrowDown') cr = (cr + 1) % DATA.SHELF_H;
      cursor = cr * W + cc;
      refreshShelf();
      return;
    }
    var n = parseInt(k, 10);
    if (r.phase === 'stock' && n >= 1 && n <= 8) { selectHand(n - 1); return; }
    if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      kbUsed = true;
      if (r.phase === 'stock' && selHand >= 0 && !r.shelf[cursor]) slotPress(cursor);
      else if (r.phase === 'stock' && !r.hand.length) { Game.openShop(); }
      else if (r.phase === 'sell') {
        var mt = Game.matches(Game.cust(r.cur));
        if (mt.indexOf(cursor) < 0 && mt.length) { cursor = mt[0]; refreshShelf(); }
        else slotPress(cursor);
      }
      return;
    }
    if ((k === 'o' || k === 'O') && r.phase === 'stock') { Game.openShop(); return; }
    if ((k === 'x' || k === 'X') && r.phase === 'sell') { Game.skip(); return; }
  }

  // ---------- 시간 ----------
  function tick() {
    var r = Game.run;
    if (!r || r.over || current !== 'scr-play' || overlay === 'ov-pause' || document.hidden) return;
    if (window.innerHeight > window.innerWidth) return;
    Game.addTime(1);
  }

  // ---------- 묶기 ----------
  function bind() {
    Store.load();
    applySettings();
    if (osMotion) {
      if (osMotion.addEventListener) osMotion.addEventListener('change', applySettings);
      else if (osMotion.addListener) osMotion.addListener(applySettings);
    }
    Game.on(handle);

    on('btn-start', function () { startRun(false); }, 'start');
    on('btn-daily', function () { startRun(true); }, 'start');
    on('btn-continue', continueRun, 'start');
    on('btn-help', function () { openSub('scr-help'); });
    on('btn-settings', function () { openSub('scr-settings'); });
    on('btn-stalls', function () { openSub('scr-stalls'); });
    on('btn-codex', function () { openSub('scr-codex'); });
    on('btn-records', function () { openSub('scr-records'); });
    ['btn-help-back', 'btn-settings-back', 'btn-stalls-back', 'btn-codex-back', 'btn-records-back'].forEach(function (id) { on(id, backFromSub); });

    on('btn-pause', openPause);
    on('btn-resume', resumePlay);
    on('btn-pause-help', function () { openSub('scr-help', 'pause'); });
    on('btn-pause-settings', function () { openSub('scr-settings', 'pause'); });
    on('btn-quit', function () {
      if (!quitArmed) { quitArmed = true; $('btn-quit').textContent = '한 번 더 누르면 접는다'; shake($('btn-quit'), 'soft'); return; }
      quitArmed = false;
      closeOv();
      Game.quit();
    }, 'block');
    on('btn-open', function () { Game.openShop(); }, false);
    on('btn-skip', function () { Game.skip(); }, false);
    on('btn-market-done', function () { Game.leaveMarket(); }, 'start');
    on('btn-again', function () { startRun(false); }, 'start');
    on('btn-home', function () { refreshTitle(); show('scr-title'); });
    on('btn-share', copyShare);

    on('btn-tutorial', function () {
      Store.meta.tutorialDone = false;
      Store.save();
      refreshSettings();
      toast('다음 판을 시작하면 첫 판 안내가 다시 나온다');
    });
    document.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-coach="never"]') : null;
      if (!b) return;
      Sfx.unlock();
      Sfx.play('tap');
      tutEnd(true, '첫 판 안내를 다시 보지 않는다 (설정에서 다시 켠다)');
    });
    on('btn-wipe', function () { $('wipe-confirm').classList.remove('hidden'); $('btn-wipe').classList.add('hidden'); });
    on('btn-wipe-no', function () { $('wipe-confirm').classList.add('hidden'); $('btn-wipe').classList.remove('hidden'); });
    on('btn-wipe-yes', function () {
      Store.wipe();
      applySettings();
      refreshSettings();
      toast('기록을 지웠다');
    }, 'block');

    $('shelf').addEventListener('click', function (e) {
      var b = e.target.closest('.slot');
      if (!b || b.disabled) return;
      slotPress(+b.getAttribute('data-slot'));
    });
    $('hand-list').addEventListener('click', function (e) {
      var b = e.target.closest('.hcard');
      if (!b || b.disabled) return;
      selectHand(+b.getAttribute('data-hand'));
    });
    $('charm-list').addEventListener('click', function (e) {
      var b = e.target.closest('.ccard');
      if (!b) return;
      pickCharm(+b.getAttribute('data-charm'));
    });
    $('offer-list').addEventListener('click', function (e) {
      var b = e.target.closest('.ccard');
      if (!b || busy) return;
      Game.buy(+b.getAttribute('data-offer'));
    });
    $('settings-list').addEventListener('click', function (e) {
      var b = e.target.closest('.toggle');
      if (!b) return;
      var id = b.getAttribute('data-set');
      set()[id] = !set()[id];
      Store.save();
      applySettings();
      refreshSettings();
      Sfx.play('tap');
    });
    $('stall-list').addEventListener('click', function (e) {
      var b = e.target.closest('.ccard');
      if (!b || b.disabled) return;
      var res = Game.buyStall(b.getAttribute('data-stall'));
      Sfx.play(res === 'poor' ? 'nobuy' : res === 'bought' ? 'charm' : 'tap');
      if (res === 'bought') toast('새 가판대를 열었다');
      refreshStalls();
      var nb = document.querySelector('[data-stall="' + b.getAttribute('data-stall') + '"]');
      if (res === 'bought' && nb) {
        flashEl(nb);
        shake(nb, 'soft');
        bump(nb);
        burst(nb, null, 12);
        popOn(nb, '도장 -' + DATA.STALLS.filter(function (st) { return st.id === b.getAttribute('data-stall'); })[0].cost, 'big');
      } else if (res === 'poor' && nb) {
        flashEl(nb);
        shake(nb, false);
        bump(nb);
        popOn(nb, '도장 모자람', 'bad');
      }
    });
    $('codex-tabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-ctab]');
      if (!b) return;
      codexTab = b.getAttribute('data-ctab');
      Sfx.play('tap');
      refreshCodex();
    });
    $('rec-tabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-rtab]');
      if (!b) return;
      recTab = b.getAttribute('data-rtab');
      Sfx.play('tap');
      refreshRecords();
    });

    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', function () { if (document.hidden) openPause(); });
    var fitQueued = false;
    function queueFit() {
      if (fitQueued) return;
      fitQueued = true;
      requestAnimationFrame(function () { fitQueued = false; fitShelf(); });
    }
    window.addEventListener('resize', queueFit);
    window.addEventListener('orientationchange', queueFit);
    setInterval(tick, 1000);

    refreshTitle();
    show('scr-title');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
