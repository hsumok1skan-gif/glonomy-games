/* Ride Tally 화면 — 화면·시트 전환(swap), 알림, 입력 오류, 화면마다 그리기 */
(function () {
  'use strict';
  var L = window.Logic;
  var D = window.RT_DATA;
  function A() { return window.App; }
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var won = L.won;
  var SCREENS = ['home', 'log', 'map', 'cost', 'more', 'help', 'result', 'ride'];
  var TAB_OF = { home: 'home', log: 'log', map: 'map', cost: 'cost', more: 'more', result: 'log', help: '' };

  function reduced() {
    var s = A() && A().S && A().S.settings;
    if (s && s.reduce) return true;
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  // 모든 화면·시트·겹침 창 전환이 거치는 한 함수 (0.22초 흐려지기+밀기, 시트는 아래에서 올라옴)
  function swap(el, on) {
    if (!el) return;
    clearTimeout(el._swapT);
    el.classList.remove('layer-in', 'layer-out');
    if (reduced()) { el.hidden = !on; return; }
    if (on) {
      el.hidden = false;
      void el.offsetWidth;
      el.classList.add('layer-in');
      el._swapT = setTimeout(function () { el.classList.remove('layer-in'); }, 320);
    } else {
      if (el.hidden) return;
      el.classList.add('layer-out');
      el._swapT = setTimeout(function () { el.hidden = true; el.classList.remove('layer-out'); }, 230);
    }
  }

  function show(name) {
    SCREENS.forEach(function (n) {
      var el = $('screen-' + n);
      if (!el) return;
      if (n === name) { if (el.hidden) swap(el, true); }
      else { clearTimeout(el._swapT); el.classList.remove('layer-in', 'layer-out'); el.hidden = true; }
    });
    var tab = TAB_OF[name];
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) {
      var on = t.getAttribute('data-to') === tab;
      t.classList.toggle('on', on);
      if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
    document.body.classList.toggle('riding', name === 'ride');
    try { window.scrollTo(0, 0); } catch (e) { /* 스크롤 없음 */ }
  }

  function openLayer(id) {
    var ui = A().ui;
    var i = ui.layers.indexOf(id);
    if (i >= 0) ui.layers.splice(i, 1);
    ui.layers.push(id);
    var el = $(id);
    swap(el, true);
    var fine = false;
    try { fine = window.matchMedia('(pointer: fine)').matches; } catch (e) { fine = false; }
    if (fine && el) {
      var f = el.querySelector('input:not([type=checkbox]):not([readonly]), textarea:not([readonly])');
      if (f) setTimeout(function () { try { f.focus(); } catch (e) { /* 초점 없음 */ } }, 30);
    }
  }
  function closeLayer(id) {
    var ui = A().ui;
    var i = ui.layers.indexOf(id);
    if (i >= 0) ui.layers.splice(i, 1);
    swap($(id), false);
  }
  function topLayer() { var l = A().ui.layers; return l.length ? l[l.length - 1] : null; }

  var toastT = null;
  function toast(msg, undo) {
    var t = $('toast');
    t.innerHTML = '<span class="ok" aria-hidden="true">✓</span><span>' + esc(msg) + '</span>' +
      (undo ? '<button type="button" data-act="undo">되돌리기</button>' : '');
    t.hidden = false;
    t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.hidden = true; }, undo ? 6000 : 2600);
  }
  function flash(id) {
    var el = typeof id === 'string' ? $(id) : id;
    if (!el) return;
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    setTimeout(function () { el.classList.remove('flash'); }, 700);
  }
  function markBad(el) {
    if (!el) return;
    el.classList.remove('bad'); void el.offsetWidth; el.classList.add('bad');
  }
  function fieldErr(id, msg) {
    var inp = $(id), err = $(id + '-err');
    if (err) err.textContent = msg || '';
    if (inp) { if (msg) markBad(inp); else inp.classList.remove('bad'); }
    return !msg;
  }
  function clearErrs(root) {
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll('.err'), function (e) { e.textContent = ''; });
    Array.prototype.forEach.call(root.querySelectorAll('.bad'), function (e) { e.classList.remove('bad'); });
  }

  var EMPTY_ART = '<svg class="empty-art" viewBox="0 0 120 72" aria-hidden="true">' +
    '<rect x="4" y="6" width="70" height="60" rx="10" class="art-card"/>' +
    '<rect x="14" y="40" width="10" height="16" rx="2" class="art-bar1"/><rect x="30" y="30" width="10" height="26" rx="2" class="art-bar2"/><rect x="46" y="20" width="10" height="36" rx="2" class="art-bar3"/>' +
    '<circle cx="90" cy="56" r="10" class="art-wheel"/><circle cx="112" cy="58" r="6" class="art-wheel"/><path d="M90 56 L100 38 H108 L112 58" class="art-frame"/><rect x="98" y="22" width="16" height="12" rx="3" class="art-box"/></svg>';
  function emptyBox(text, buttons) {
    return '<div class="empty">' + EMPTY_ART + '<p>' + text + '</p><div class="row wrap" style="justify-content:center">' + (buttons || '') + '</div></div>';
  }
  function btn(act, label, cls, attrs) {
    return '<button type="button" class="btn ' + (cls || '') + '" data-act="' + act + '"' + (attrs || '') + '>' + label + '</button>';
  }
  function segBar(ratio, n) {
    n = n || 10;
    var on = Math.floor(Math.max(0, ratio) * n + 1e-9);
    var over = ratio >= 1;
    var h = '';
    for (var i = 0; i < n; i++) h += '<i class="seg' + (i < on ? (over ? ' over' : ' on') : '') + '"></i>';
    return h;
  }
  // 숫자를 0부터 ms 동안 차오르게 (움직임 줄이기면 바로 최종값)
  function countUp(el, to, ms) {
    if (!el) return;
    ms = ms || 600;
    if (el._cu) cancelAnimationFrame(el._cu);
    if (reduced() || !window.requestAnimationFrame) { el.textContent = won(to); return; }
    var t0 = null;
    el.textContent = won(0);
    function step(t) {
      if (t0 == null) t0 = t;
      var p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      el.textContent = won(p < 1 ? to * e : to);
      el._cu = p < 1 ? requestAnimationFrame(step) : null;
    }
    el._cu = requestAnimationFrame(step);
  }
  // 이 운행으로 그날 실수입이 목표를 처음 넘겼나 (이 운행 전 합계 < 목표 ≤ 그날 실수입)
  function goalHit(sh) {
    var a = A(), S = a.S, ctx = a.ctx(), goal = S.settings.goal;
    if (!sh || !(goal > 0)) return false;
    var before = L.summarize(S.shifts.filter(function (x) { return x.id !== sh.id && x.startMs < sh.startMs; }), ctx, sh.date, sh.date).net;
    var dayNet = L.summarize(S.shifts, ctx, sh.date, sh.date).net;
    return before < goal && goal <= dayNet;
  }
  function plat(pid) { return L.platformOf(A().ctx(), pid); }
  function signCls(n) { return n < 0 ? 'minus' : 'plus'; }

  // 오늘 실수입 (끝난 운행 + 지금 운행)
  function todayStat() {
    var a = A(), S = a.S, ctx = a.ctx(), k = a.today();
    var t = L.summarize(S.shifts, ctx, k, k);
    var live = null;
    if (S.ride) {
      live = L.liveRide(S.ride, Date.now(), ctx, L.avgKmPerHour(S.shifts));
      if (L.toKey(S.ride.startMs) === k) { t.net += live.net; t.hours += live.hours; t.calls += live.calls; t.gross += live.gross; }
    }
    t.perHour = t.hours > 0 ? t.net / t.hours : 0;
    return { t: t, live: live };
  }

  // ---------- 홈 ----------
  function renderHome() {
    var a = A(), S = a.S, ctx = a.ctx(), k = a.today();
    var h = '';
    var ts = todayStat(), t = ts.t;
    var goal = S.settings.goal;
    var g = L.goalLeft(goal, t.net, t.perHour);
    if (S.ride) {
      h += '<div class="card hero" id="home-riding"><div class="card-title"><h3>🛵 운행 중</h3><span class="tiny">' + L.hhmm(S.ride.startMs) + ' 출발</span></div>' +
        '<p>' + L.fmtDur(ts.live.ms) + ' · 콜 ' + ts.live.calls + '건 · 시간당 <b>' + won(ts.live.perHour) + '</b></p>' +
        btn('go', '운행 화면으로', 'primary block big', ' data-to="ride"') + '</div>';
    }
    h += '<div class="card' + (S.ride ? '' : ' hero') + '" id="home-today">' +
      '<div class="hero-top"><div><div class="tiny">오늘 실수입 · ' + L.dayLabel(k) + '</div><div class="hero-num ' + (t.net < 0 ? 'minus' : '') + '">' + won(t.net) + '</div></div>' +
      '<div class="tiny" style="text-align:right">목표<br><b>' + won(goal) + '</b></div></div>' +
      '<div class="seg-bar" role="img" aria-label="목표의 ' + Math.round(g.ratio * 100) + '%">' + segBar(goal > 0 ? t.net / goal : 0) + '</div>' +
      '<div class="goal-line">' + goalText(g) + '</div>' +
      '<div class="stat3"><div><span>일한 시간</span><b>' + L.fmtDur(t.hours * L.HOUR) + '</b></div><div><span>시간당</span><b>' + won(t.perHour) + '</b></div><div><span>콜</span><b>' + t.calls + '건</b></div></div>' +
      (S.ride ? '' : btn('ride-start-open', '🛵 운행 시작', 'primary start-btn', ' id="btn-start"')) +
      '</div>';

    if (!S.shifts.length && !S.ride) {
      h += '<div class="card">' + emptyBox('아직 운행 기록이 없어요. 운행 시작을 누르고 배달 하나 끝날 때마다 금액만 찍어 보세요.',
        btn('ride-start-open', '운행 시작', 'primary') + btn('sample-add', '예시로 둘러보기', 'ghost')) + '</div>';
    } else {
      // 이번 주
      var ws = L.weekStart(k), we = L.addDays(ws, 6);
      var w = L.summarize(S.shifts, ctx, ws, we);
      h += '<div class="card"><div class="card-title"><h3>이번 주</h3>' + btn('go', '기록 보기', 'ghost small', ' data-to="log"') + '</div>' +
        '<div class="stat3"><div><span>실수입</span><b class="' + signCls(w.net) + '">' + won(w.net) + '</b></div><div><span>일한 시간</span><b>' + L.fmtDur(w.hours * L.HOUR) + '</b></div><div><span>시간당</span><b>' + won(w.perHour) + '</b></div></div>' +
        dayBars(ws, 7, w.days, k) + '</div>';
      // 남는 시간대
      var best = bestCells(L.heat(S.shifts, ctx), 3);
      if (best.length) {
        h += '<div class="card best-cells"><div class="card-title"><h3>잘 남았던 시간대</h3>' + btn('go', '지도', 'ghost small', ' data-to="map"') + '</div>' +
          best.map(function (b) { return '<div class="line-row"><span class="l">' + L.DAY_NAMES[b.d] + '요일 ' + b.h + '시대</span><b>시간당 ' + won(b.v) + '</b></div>'; }).join('') + '</div>';
      }
    }
    // 정비 알림
    var due = maintDue();
    if (due.length) {
      h += '<div class="card" id="home-maint"><div class="card-title"><h3>🔧 정비할 때가 됐어요</h3></div>' +
        due.slice(0, 3).map(function (m) {
          return '<div class="alert-row"><span>' + esc(m.item.name) + ' · <span class="' + (m.st.left <= 0 ? 'minus' : '') + '">' + esc(m.st.text) + '</span></span>' +
            btn('maint-open', '했어요', 'small', ' data-k="' + m.item.key + '"') + '</div>';
        }).join('') + '</div>';
    }
    var tipI = a.ui.tipI != null ? a.ui.tipI : (L.fromKey(k).getDate() * 7) % D.TIPS.length;
    h += '<div class="card"><div class="card-title"><h3>오늘의 요령</h3>' + btn('tip-next', '다른 요령', 'ghost small') + '</div><p class="tip" id="home-tip">' + esc(D.TIPS[tipI % D.TIPS.length]) + '</p></div>';
    $('home-root').innerHTML = h;
  }
  function goalText(g) {
    if (g.left <= 0) return '🎉 오늘 목표를 채웠어요';
    if (g.minutes == null) return '목표까지 ' + won(g.left) + ' 남았어요';
    return '목표까지 ' + won(g.left) + ' · 지금 시간당이면 약 ' + L.fmtDur(g.minutes * 60000) + ' 더';
  }
  function dayBars(startKey, n, days, todayKey) {
    var vals = [], max = 1;
    for (var i = 0; i < n; i++) {
      var k = L.addDays(startKey, i);
      var v = days[k] ? days[k].net : 0;
      vals.push({ k: k, v: v });
      max = Math.max(max, Math.abs(v));
    }
    var step = n > 14 ? 5 : 1;
    return '<div class="bars" role="img" aria-label="날짜별 실수입 막대">' + vals.map(function (x, i) {
      var d = L.fromKey(x.k);
      var lbl = n <= 7 ? L.DAY_NAMES[i % 7] : ((i % step === 0) ? String(d.getDate()) : '');
      return '<div class="col"><div class="bar' + (x.v < 0 ? ' neg' : '') + (x.k === todayKey ? ' today' : '') + '" style="height:' + Math.round(Math.abs(x.v) / max * 100) + '%" title="' + esc(L.dayLabel(x.k) + ' ' + won(x.v)) + '"></div><span class="lbl">' + lbl + '</span></div>';
    }).join('') + '</div>';
  }
  function bestCells(cells, n) {
    var list = [];
    for (var d = 0; d < 7; d++) for (var h = 0; h < 24; h++) {
      var c = cells[d][h], v = L.cellPerHour(c);
      if (v != null && c.hours >= 0.5) list.push({ d: d, h: h, v: v, hours: c.hours });
    }
    list.sort(function (a, b) { return b.v - a.v; });
    return list.slice(0, n);
  }
  function maintDue() {
    var a = A(), S = a.S, k = a.today();
    var out = [];
    D.MAINT.forEach(function (item) {
      var st = L.maintStatus(item, S.maint[item.key], S.odo, k);
      if (st.known && st.due) out.push({ item: item, st: st });
    });
    out.sort(function (x, y) { return y.st.ratio - x.st.ratio; });
    return out;
  }

  // ---------- 운행 화면 ----------
  function rideTick() {
    var a = A(), S = a.S;
    if (!S.ride) return;
    var ctx = a.ctx();
    var r = L.liveRide(S.ride, Date.now(), ctx, L.avgKmPerHour(S.shifts));
    $('ride-clock').textContent = L.fmtClock(r.ms);
    var st = $('ride-state');
    st.textContent = r.onBreak ? '☕ 쉬는 중 — 일한 시간이 멈췄어요' : '운행 중 · ' + L.hhmm(S.ride.startMs) + ' 출발';
    st.classList.toggle('break', r.onBreak);
    $('btn-break').textContent = r.onBreak ? '▶ 다시 출발' : '☕ 쉬기';
    $('btn-break').setAttribute('aria-pressed', r.onBreak ? 'true' : 'false');
    var per = $('ride-per');
    var perText = r.calls ? won(r.perHour) : '0원';
    if (per.textContent !== perText) per.textContent = perText;
    per.classList.toggle('neg', r.calls > 0 && r.perHour < 0);
    $('ride-sub').textContent = r.calls ? '공제 ' + won(r.cut) + ' · 기름값 어림 ' + won(r.fuel) + ' (' + Math.round(r.estKm) + 'km) · 고정비 ' + won(r.fixed) : '콜을 찍으면 공제·기름값·고정비를 빼고 바로 계산해요';
    var ts = todayStat().t, goal = S.settings.goal;
    var g = L.goalLeft(goal, ts.net, ts.perHour);
    $('ride-seg').innerHTML = segBar(goal > 0 ? ts.net / goal : 0);
    $('ride-goal-text').textContent = '오늘 ' + won(ts.net) + ' · ' + goalText(g);
    $('ride-calls').textContent = r.calls + '건';
    $('ride-gross').textContent = won(r.gross);
    $('ride-net').textContent = won(r.net);
    var last = S.ride.calls[S.ride.calls.length - 1];
    $('ride-last').textContent = last ? '마지막 콜 ' + L.hhmm(last.at) + ' · ' + won(last.amt) + ' · ' + plat(last.pid).name : '첫 콜을 기다리는 중';
    $('btn-undo-call').disabled = !S.ride.calls.length;
    rideCell(r, S, ctx);
  }
  // 이 시간대 평소 — 지도 칸(30분 넘게 일한 칸만)의 시간당 실수입과 지금 운행 비교
  var cellCache = null;
  function rideCell(r, S, ctx) {
    var box = $('ride-cell');
    if (!box) return;
    var now = Date.now(), key = Math.floor(now / 60000) + ':' + S.shifts.length;
    if (!cellCache || cellCache.key !== key) {
      var cells = L.heat(S.shifts, ctx);
      var at = function (ms) { var d = new Date(ms), c = cells[(d.getDay() + 6) % 7][d.getHours()]; return c.hours >= 0.5 ? L.cellPerHour(c) : null; };
      cellCache = { key: key, cur: at(now), next: at(now + L.HOUR), avg: L.avgPerHour(S.shifts, ctx) };
    }
    var cur = cellCache.cur, next = cellCache.next, avg = cellCache.avg;
    if (cur == null && next == null) { box.hidden = true; return; }
    var parts = [];
    parts.push(cur != null ? '이 시간대 평소 시간당 ' + won(cur) : '이 시간대 평소 기록 없음');
    if (next != null) parts.push('다음 시간 ' + won(next));
    $('ride-cell-text').textContent = parts.join(' · ');
    var cmp = cur != null && r.calls > 0;
    box.classList.toggle('plus', cmp && r.perHour >= cur);
    box.classList.toggle('minus', cmp && r.perHour < cur);
    box.title = cmp ? (r.perHour >= cur ? '지금 운행이 평소보다 잘 남아요' : '지금 운행이 평소보다 덜 남아요') : '';
    $('ride-cell-warn').hidden = !(next != null && avg != null && next < avg * 0.7);
    box.hidden = false;
  }
  function callPop() {
    var b = $('btn-call'), p = $('ride-per');
    [b, p].forEach(function (el) {
      el.classList.remove('pop', 'bump'); void el.offsetWidth;
      el.classList.add(el === b ? 'pop' : 'bump');
    });
  }

  // ---------- 운행 시작 ----------
  function renderStart() {
    var S = A().S;
    $('start-odo').value = S.odo > 0 ? S.odo : '';
    clearErrs($('form-start'));
    var p = S.platforms.filter(function (x) { return !x.gone; }).map(function (x) { return x.name; }).join(' · ');
    $('start-hint').textContent = '일하는 곳: ' + p + '. 계기판을 모르면 비워 두고 출발하세요.';
  }

  // ---------- 콜 찍기 ----------
  function renderCall() {
    var a = A(), S = a.S, c = a.ui.call;
    $('call-title').textContent = c.editCallId ? '콜 고치기' : (c.shiftId ? '지난 운행에 콜 더하기' : '콜 찍기');
    $('call-save').textContent = c.editCallId ? '고치기' : '찍기';
    var amtEl = $('call-amt');
    if (String(amtEl.value) !== String(c.amt)) amtEl.value = c.amt;
    var amts = L.topAmounts(S.shifts, S.ride, 6);
    $('call-chips').innerHTML = amts.map(function (v) {
      return '<button type="button" class="chip' + (+c.amt === v ? ' on' : '') + '" data-act="call-chip" data-amt="' + v + '">' + L.num(v) + '</button>';
    }).join('');
    $('call-plat').innerHTML = S.platforms.filter(function (p) { return !p.gone || p.id === c.pid; }).map(function (p) {
      return '<button type="button" class="chip' + (p.id === c.pid ? ' on' : '') + '" data-act="call-plat" data-pid="' + esc(p.id) + '" aria-pressed="' + (p.id === c.pid) + '"><span class="dot pc-' + (p.color % 6) + '"></span>' + esc(p.name) + '</button>';
    }).join('');
    $('call-tags').innerHTML = D.TAGS.map(function (t) {
      var on = c.tags.indexOf(t.id) >= 0;
      return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-act="call-tag" data-t="' + t.id + '" aria-pressed="' + on + '">' + t.icon + ' ' + esc(t.name) + '</button>';
    }).join('');
  }

  // ---------- 운행 끝 ----------
  function renderEnd() {
    var a = A(), S = a.S;
    var r = L.liveRide(S.ride, Date.now(), a.ctx(), L.avgKmPerHour(S.shifts));
    $('end-summary').textContent = '일한 시간 ' + L.fmtDur(r.ms) + ' · 콜 ' + r.calls + '건 · 매출 ' + won(r.gross);
    clearErrs($('form-end'));
    $('end-odo').value = ''; $('end-km').value = ''; $('end-memo').value = '';
    $('end-odo').placeholder = S.ride.startOdo ? '출발 ' + L.num(S.ride.startOdo) : '예: 15160';
    $('end-km-hint').textContent = S.ride.startOdo ?
      '출발 때 계기판 ' + L.num(S.ride.startOdo) + 'km. 지금 숫자를 넣으면 거리를 셉니다.' :
      '거리를 모르면 비워 두세요. 기름값은 0원으로 계산해요 (지난 운행 평균이면 약 ' + Math.round(r.estKm) + 'km).';
  }

  // ---------- 결과 ----------
  function renderResult() {
    var a = A(), S = a.S, ctx = a.ctx();
    var sh = a.findShift(a.ui.resultId);
    var root = $('result-root');
    if (!sh) { root.innerHTML = '<div class="card">' + emptyBox('보여 줄 운행이 없어요.', btn('go', '홈으로', 'primary', ' data-to="home"')) + '</div>'; return; }
    var r = L.calcShift(sh, ctx);
    var day = L.summarize(S.shifts, ctx, sh.date, sh.date);
    var cm = L.comment(r, sh, ctx, S.shifts, S.settings.goal, day.net, D.COMMENTS);
    var pct = function (v) { return r.gross > 0 ? Math.min(100, Math.max(0, v) / r.gross * 100) : 0; };
    var h = '<div class="card hero res-head" id="res-head"><div class="tiny">' + L.dayLabel(sh.date) + ' ' + L.hhmm(sh.startMs) + '~' + L.hhmm(sh.endMs) + ' · 시간당 실수입</div>' +
      '<div class="big-num ' + (r.perHour < 0 ? 'minus' : '') + '">' + won(r.perHour) + '</div>' +
      '<p>실수입 <b class="' + signCls(r.net) + '">' + won(r.net) + '</b> · 일한 시간 ' + L.fmtDur(r.ms) + '</p>' +
      '<div class="split" role="img" aria-label="매출 나눔: 실수입 ' + Math.round(pct(r.net)) + '%"><i class="s-net" style="width:' + pct(r.net) + '%"></i><i class="s-cut" style="width:' + pct(r.cut) + '%"></i><i class="s-fuel" style="width:' + pct(r.fuel) + '%"></i><i class="s-fixed" style="width:' + pct(r.fixed) + '%"></i></div>' +
      '<div class="legend" style="justify-content:center"><i class="s-net"></i>실수입 <i class="s-cut"></i>공제 <i class="s-fuel"></i>기름값 <i class="s-fixed"></i>고정비</div>' +
      cm.map(function (c) { return '<div class="comment">' + esc(c.text) + '</div>'; }).join('') + '</div>';
    h += '<div class="card"><h3>정산</h3><div class="kv">' +
      '<span>매출 (콜 ' + r.calls + '건)</span><span class="v">' + won(r.gross) + '</span>' +
      '<span>정산 공제</span><span class="v minus">−' + won(r.cut) + '</span>' +
      '<span>기름값 (' + L.num(sh.km || 0) + 'km)</span><span class="v minus">−' + won(r.fuel) + '</span>' +
      '<span>고정비 몫 (시간당 ' + won(L.fixedPerHour(S.settings, S.fixed)) + ')</span><span class="v minus">−' + won(r.fixed) + '</span>' +
      '<span class="total">실수입</span><span class="v total ' + signCls(r.net) + '">' + won(r.net) + '</span>' +
      '<span>떼어 둘 돈 (' + S.settings.setAside + '%)</span><span class="v">' + won(Math.max(0, r.net) * S.settings.setAside / 100) + '</span>' +
      '<span>쉰 시간</span><span class="v">' + L.fmtDur(r.brk) + '</span>' +
      '<span>시간당 콜</span><span class="v">' + (r.hours > 0 ? (Math.round(r.calls / r.hours * 10) / 10) : 0) + '건</span>' +
      '</div></div>';
    var goal = S.settings.goal, hit = goalHit(sh);
    h += '<div class="card goal-card' + (hit ? ' goal-hit' : '') + '"><h3>그날 목표</h3>' +
      (hit ? '<div class="goal-badge" role="status">🎉 이 운행으로 그날 목표를 넘겼어요!</div>' : '') +
      '<div class="seg-bar">' + segBar(goal > 0 ? day.net / goal : 0) + '</div><div class="goal-line">' + L.dayLabel(sh.date) + ' 실수입 ' + won(day.net) + ' / ' + won(goal) + '</div></div>';
    // 이 운행이 칠한 칸
    var cells = L.heat([sh], ctx), touched = [];
    for (var d = 0; d < 7; d++) for (var hh = 0; hh < 24; hh++) { var c = cells[d][hh]; if (c.hours > 0.01) touched.push({ d: d, h: hh, c: c }); }
    h += '<div class="card"><div class="card-title"><h3>지도에 칠한 칸</h3>' + btn('result-map', '지도에서 보기', 'ghost small') + '</div>' +
      touched.map(function (x) {
        var v = L.cellPerHour(x.c);
        return '<div class="line-row"><span class="l">' + L.DAY_NAMES[x.d] + ' ' + x.h + '시대 · ' + L.fmtDur(x.c.hours * L.HOUR) + ' · 콜 ' + x.c.calls + '건</span><b class="' + signCls(v || 0) + '">' + (v == null ? '-' : won(v)) + '</b></div>';
      }).join('') + '</div>';
    if (sh.memo) h += '<div class="card"><h3>메모</h3><p>' + esc(sh.memo) + '</p></div>';
    h += '<div class="row wrap">' + btn('shift-open', '운행 고치기', 'ghost grow', ' data-id="' + esc(sh.id) + '"') + btn('go', '홈으로', 'primary grow', ' data-to="home"') + '</div>';
    root.innerHTML = h;
    countUp(root.querySelector('#res-head .big-num'), r.perHour, 600);
    countUp(root.querySelector('#res-head p b'), r.net, 600);
  }

  // ---------- 기록 ----------
  function logRange() {
    var a = A(), k = a.today(), u = a.ui;
    if (u.logRange === 'week') {
      var ws = L.addDays(L.weekStart(k), u.logOff * 7);
      return { from: ws, to: L.addDays(ws, 6), label: L.dayLabel(ws) + ' ~ ' + L.dayLabel(L.addDays(ws, 6)), days: 7 };
    }
    if (u.logRange === 'month') {
      var d = L.fromKey(k);
      var m = new Date(d.getFullYear(), d.getMonth() + u.logOff, 1, 12);
      var ms = L.toKey(m), me = L.monthEnd(ms);
      return { from: ms, to: me, label: m.getFullYear() + '년 ' + (m.getMonth() + 1) + '월', days: L.fromKey(me).getDate() };
    }
    return { from: null, to: null, label: '모든 기록', days: 0 };
  }
  function renderLog() {
    var a = A(), S = a.S, ctx = a.ctx(), u = a.ui;
    var rg = logRange();
    var h = '<div class="chips" style="margin-bottom:10px">' + [['week', '주'], ['month', '달'], ['all', '전체']].map(function (x) {
      return '<button type="button" class="chip' + (u.logRange === x[0] ? ' on' : '') + '" data-act="log-range" data-v="' + x[0] + '" aria-pressed="' + (u.logRange === x[0]) + '">' + x[1] + '</button>';
    }).join('') + '</div>';
    if (u.logRange !== 'all') {
      h += '<div class="row" style="margin-bottom:10px"><button type="button" class="icon-btn" data-act="log-prev" aria-label="이전">‹</button><b class="grow" style="text-align:center">' + rg.label + '</b><button type="button" class="icon-btn" data-act="log-next" aria-label="다음"' + (u.logOff >= 0 ? ' disabled' : '') + '>›</button></div>';
    }
    if (!S.shifts.length) {
      h += '<div class="card">' + emptyBox('운행을 한 번 끝내면 여기에 날마다 실수입과 시간당이 쌓여요.', btn('ride-start-open', '운행 시작', 'primary') + btn('sample-add', '예시로 둘러보기', 'ghost')) + '</div>';
      $('log-root').innerHTML = h; return;
    }
    var t = L.summarize(S.shifts, ctx, rg.from, rg.to);
    var ex = L.sumExpenses(S.expenses, rg.from, rg.to);
    h += '<div class="card" id="log-sum"><div class="stat3"><div><span>실수입</span><b class="' + signCls(t.net) + '">' + won(t.net) + '</b></div><div><span>일한 시간</span><b>' + L.fmtDur(t.hours * L.HOUR) + '</b></div><div><span>시간당</span><b>' + won(t.perHour) + '</b></div></div>' +
      '<div class="kv"><span>매출 (콜 ' + t.calls + '건 · 운행 ' + t.shifts + '번)</span><span class="v">' + won(t.gross) + '</span>' +
      '<span>정산 공제</span><span class="v minus">−' + won(t.cut) + '</span>' +
      '<span>기름값 어림 (' + L.num(t.km) + 'km)</span><span class="v minus">−' + won(t.fuel) + '</span>' +
      '<span>고정비 몫</span><span class="v minus">−' + won(t.fixed) + '</span>' +
      '<span>이 기간 지출 기록 (참고)</span><span class="v">' + won(ex.total) + '</span>' +
      '<span>떼어 둘 돈 (' + S.settings.setAside + '%)</span><span class="v">' + won(Math.max(0, t.net) * S.settings.setAside / 100) + '</span>' +
      (t.best ? '<span>가장 남은 운행</span><span class="v">' + L.dayLabel(t.best.date) + ' · ' + won(t.best.perHour) + '</span>' : '') +
      '</div>' + (rg.days ? dayBars(rg.from, rg.days, t.days, a.today()) : monthBars(S.shifts, ctx)) + '</div>';
    // 일하는 곳별
    var ps = Object.keys(t.byP);
    if (ps.length) {
      var maxG = Math.max.apply(null, ps.map(function (p) { return t.byP[p].gross; })) || 1;
      h += '<div class="card"><h3>일하는 곳별</h3>' + ps.sort(function (x, y) { return t.byP[y].gross - t.byP[x].gross; }).map(function (pid) {
        var b = t.byP[pid], p = plat(pid);
        return '<div style="margin-bottom:8px"><div class="line-row" style="border:0;padding:0"><span class="l"><span class="dot pc-' + (p.color % 6) + '"></span>' + esc(p.name) + ' · ' + b.calls + '건</span><b>' + won(b.gross) + '</b></div>' +
          '<div class="hbar"><i class="pc-' + (p.color % 6) + '" style="width:' + Math.round(b.gross / maxG * 100) + '%"></i></div><div class="tiny">건당 평균 ' + won(b.gross / b.calls) + ' · 공제 ' + won(b.cut) + '</div></div>';
      }).join('') + '</div>';
    }
    // 운행 목록
    var list = S.shifts.filter(function (s) { return (!rg.from || s.date >= rg.from) && (!rg.to || s.date <= rg.to); })
      .sort(function (x, y) { return y.startMs - x.startMs; });
    h += '<div class="card"><div class="card-title"><h3>운행 ' + list.length + '번</h3>' + btn('print', '인쇄', 'ghost small') + '</div>';
    if (!list.length) h += emptyBox('이 기간에는 운행이 없어요.', btn('log-range', '전체 보기', 'ghost', ' data-v="all"'));
    h += list.slice(0, 60).map(function (s) {
      var r = L.calcShift(s, ctx);
      return '<button type="button" class="list-row" data-act="shift-open" data-id="' + esc(s.id) + '"><span class="l"><b>' + L.dayLabel(s.date) + ' ' + L.hhmm(s.startMs) + '~' + L.hhmm(s.endMs) + '</b><span class="tiny">' + L.fmtDur(r.ms) + ' · 콜 ' + r.calls + '건 · ' + L.num(s.km || 0) + 'km' + (s.sample ? ' · 예시' : '') + '</span></span>' +
        '<span class="r"><b class="' + signCls(r.net) + '">' + won(r.net) + '</b><br><span class="tiny">시간당 ' + won(r.perHour) + '</span></span></button>';
    }).join('');
    if (list.length > 60) h += '<p class="tiny">최근 60번만 보여요.</p>';
    h += '</div>';
    $('log-root').innerHTML = h;
  }
  function monthBars(shifts, ctx) {
    var k = A().today(), d = L.fromKey(k), vals = [], max = 1;
    for (var i = 5; i >= 0; i--) {
      var m = new Date(d.getFullYear(), d.getMonth() - i, 1, 12), ms = L.toKey(m);
      var t = L.summarize(shifts, ctx, ms, L.monthEnd(ms));
      vals.push({ lbl: (m.getMonth() + 1) + '월', v: t.net }); max = Math.max(max, Math.abs(t.net));
    }
    return '<div class="bars" role="img" aria-label="달별 실수입 막대">' + vals.map(function (x) {
      return '<div class="col"><div class="bar' + (x.v < 0 ? ' neg' : '') + '" style="height:' + Math.round(Math.abs(x.v) / max * 100) + '%" title="' + esc(x.lbl + ' ' + won(x.v)) + '"></div><span class="lbl">' + x.lbl + '</span></div>';
    }).join('') + '</div>';
  }

  // ---------- 운행 자세히 ----------
  function renderShift() {
    var a = A(), S = a.S, ctx = a.ctx();
    var sh = a.findShift(a.ui.shiftId);
    var root = $('shift-root');
    if (!sh) { root.innerHTML = '<p class="hint">운행을 찾지 못했어요.</p>'; return; }
    var r = L.calcShift(sh, ctx);
    var h = '<p><b>' + L.dayLabel(sh.date) + ' ' + L.hhmm(sh.startMs) + '~' + L.hhmm(sh.endMs) + '</b> · ' + L.fmtDur(r.ms) + '</p>' +
      '<div class="kv" style="margin-bottom:10px"><span>매출</span><span class="v">' + won(r.gross) + '</span><span>실수입</span><span class="v ' + signCls(r.net) + '">' + won(r.net) + '</span><span>시간당</span><span class="v">' + won(r.perHour) + '</span></div>';
    h += '<div class="sub-label">콜 ' + sh.calls.length + '건</div><div id="shift-calls">';
    if (!sh.calls.length) h += emptyBox('이 운행에는 찍은 콜이 없어요.', btn('call-add-past', '콜 더하기', 'primary', ' data-sid="' + esc(sh.id) + '"'));
    h += sh.calls.slice().sort(function (x, y) { return x.at - y.at; }).map(function (c) {
      var p = plat(c.pid);
      var tags = (c.tags || []).map(function (t) { var tg = D.TAGS.filter(function (x) { return x.id === t; })[0]; return tg ? tg.icon : ''; }).join('');
      return '<div class="line-row"><span class="l">' + L.hhmm(c.at) + ' · <b>' + won(c.amt) + '</b> · <span class="dot pc-' + (p.color % 6) + '"></span>' + esc(p.name) + ' ' + tags + '</span>' +
        btn('call-edit', '고치기', 'small', ' data-sid="' + esc(sh.id) + '" data-cid="' + esc(c.id) + '"') +
        btn('call-del', '지우기', 'small ghost', ' data-sid="' + esc(sh.id) + '" data-cid="' + esc(c.id) + '" aria-label="' + L.hhmm(c.at) + ' 콜 지우기"') + '</div>';
    }).join('') + '</div>';
    if (sh.calls.length) h += btn('call-add-past', '＋ 콜 더하기', 'ghost block', ' data-sid="' + esc(sh.id) + '"');
    h += '<form id="form-shift" autocomplete="off" novalidate style="margin-top:12px">' +
      '<label class="field"><span>주행 km</span><input id="shift-km" type="number" inputmode="decimal" min="0" max="1000" value="' + (sh.km || '') + '"><span class="err" id="shift-km-err"></span></label>' +
      '<label class="field"><span>메모</span><input id="shift-memo" maxlength="120" value="' + esc(sh.memo || '') + '"><span class="err" id="shift-memo-err"></span></label>' +
      '<div class="row"><button type="button" class="btn danger" data-act="shift-del" data-id="' + esc(sh.id) + '">운행 지우기</button><button type="submit" class="btn primary grow">저장</button></div></form>';
    root.innerHTML = h;
  }

  // ---------- 지도 ----------
  function mapShifts() {
    var a = A(), S = a.S, u = a.ui, k = a.today();
    if (u.mapRange === '4w') { var from = L.addDays(k, -27); return S.shifts.filter(function (s) { return s.date >= from; }); }
    if (u.mapRange === 'rain') return S.shifts.filter(function (s) { return s.calls.some(function (c) { return (c.tags || []).indexOf('rain') >= 0 || (c.tags || []).indexOf('snow') >= 0; }); });
    return S.shifts;
  }
  function renderMap() {
    var a = A(), S = a.S, ctx = a.ctx(), u = a.ui;
    var h = '<div class="chips" style="margin-bottom:10px">' + [['all', '전체'], ['4w', '최근 4주'], ['rain', '비·눈 온 운행']].map(function (x) {
      return '<button type="button" class="chip' + (u.mapRange === x[0] ? ' on' : '') + '" data-act="map-range" data-v="' + x[0] + '" aria-pressed="' + (u.mapRange === x[0]) + '">' + x[1] + '</button>';
    }).join('') + '</div>';
    var list = mapShifts();
    if (!list.length) {
      h += '<div class="card">' + emptyBox(S.shifts.length ? '이 조건에 맞는 운행이 없어요.' : '운행을 남기면 요일·시간대마다 시간당 실수입이 칸에 칠해져요.',
        S.shifts.length ? btn('map-range', '전체 보기', 'ghost', ' data-v="all"') : btn('ride-start-open', '운행 시작', 'primary') + btn('sample-add', '예시로 둘러보기', 'ghost')) + '</div>';
      $('map-root').innerHTML = h; return;
    }
    var cells = L.heat(list, ctx), max = 0;
    for (var d = 0; d < 7; d++) for (var hh = 0; hh < 24; hh++) { var v = L.cellPerHour(cells[d][hh]); if (v != null && v > max) max = v; }
    h += '<div class="card"><div class="card-title"><h3>요일 × 시간대 시간당 실수입</h3></div><div class="heat-wrap"><div class="heat-grid" id="heat-grid" role="grid" aria-label="요일과 시간대별 시간당 실수입">' +
      '<span></span>' + L.DAY_NAMES.map(function (n) { return '<span class="hd">' + n + '</span>'; }).join('');
    var flashSet = u.flashCells || {};
    for (var h2 = 0; h2 < 24; h2++) {
      h += '<span class="hh">' + h2 + '</span>';
      for (var d2 = 0; d2 < 7; d2++) {
        var c = cells[d2][h2], pv = L.cellPerHour(c), lv = L.heatLevel(pv, max);
        var cls = 'hc' + (lv === -1 ? ' hneg' : (lv > 0 ? ' h' + lv : '')) + (u.selCell && u.selCell.d === d2 && u.selCell.h === h2 ? ' sel' : '') + (flashSet[d2 + '-' + h2] ? ' flash-cell' : '');
        h += '<span class="' + cls + '" data-act="cell" data-d="' + d2 + '" data-h="' + h2 + '" role="gridcell" aria-label="' + L.DAY_NAMES[d2] + '요일 ' + h2 + '시 ' + (pv == null ? '기록 없음' : '시간당 ' + won(pv)) + '"></span>';
      }
    }
    u.flashCells = null;
    var nowD = L.weekdayIdx(Date.now()), nowH = new Date().getHours();
    h += '</div></div><p class="tiny" style="margin-top:6px">칸을 누르면 그 시간대 자세히 나와요.</p>' +
      btn('cell', '🕘 지금 시간대부터 하나씩 보기', 'ghost block', ' data-d="' + nowD + '" data-h="' + nowH + '"') +
      '<div class="legend"><span>적음</span><i style="background:var(--heat-1)"></i><i style="background:var(--heat-2)"></i><i style="background:var(--heat-3)"></i><i style="background:var(--heat-4)"></i><i style="background:var(--heat-5)"></i><span>많음 (' + won(max) + ')</span><i style="background:var(--minus)"></i><span>손해</span></div></div>';
    var best = bestCells(cells, 5);
    h += '<div class="card best-cells"><h3>가장 남은 시간대</h3>' + (best.length ? best.map(function (b, i) {
      return '<div class="line-row"><span class="l">' + (i + 1) + '. ' + L.DAY_NAMES[b.d] + '요일 ' + b.h + '시대 · ' + L.fmtDur(b.hours * L.HOUR) + ' 일함</span><b>' + won(b.v) + '</b></div>';
    }).join('') : '<p class="hint">30분 넘게 일한 칸이 생기면 여기에 순위가 나와요.</p>') + '</div>';
    // 평일·주말
    var wk = { net: 0, h: 0 }, we = { net: 0, h: 0 };
    for (var d3 = 0; d3 < 7; d3++) for (var h3 = 0; h3 < 24; h3++) { var cc = cells[d3][h3], o = d3 >= 5 ? we : wk; o.net += cc.net; o.h += cc.hours; }
    h += '<div class="card"><h3>평일 · 주말</h3><div class="kv"><span>평일 시간당 (' + L.fmtDur(wk.h * L.HOUR) + ')</span><span class="v">' + (wk.h > 0 ? won(wk.net / wk.h) : '-') + '</span><span>주말 시간당 (' + L.fmtDur(we.h * L.HOUR) + ')</span><span class="v">' + (we.h > 0 ? won(we.net / we.h) : '-') + '</span></div>' +
      '<p class="fine">각 운행의 실수입을 콜 금액 비율로 그 콜을 찍은 시간 칸에 나눠 담고, 쉬지 않고 일한 시간으로 나눠요.</p></div>';
    $('map-root').innerHTML = h;
  }
  function renderCell() {
    var a = A(), ctx = a.ctx(), sc = a.ui.selCell;
    if (!sc) return;
    var cells = L.heat(mapShifts(), ctx), c = cells[sc.d][sc.h], v = L.cellPerHour(c);
    var all = L.summarize(mapShifts(), ctx);
    $('cell-title').textContent = L.DAY_NAMES[sc.d] + '요일 ' + sc.h + '시~' + (sc.h + 1) + '시';
    var nav = '<div class="chips" style="margin-bottom:8px">' + L.DAY_NAMES.map(function (n, i) {
      return '<button type="button" class="chip' + (i === sc.d ? ' on' : '') + '" data-act="cell-day" data-d="' + i + '" aria-pressed="' + (i === sc.d) + '">' + n + '</button>';
    }).join('') + '</div><div class="row" style="margin-bottom:10px"><button type="button" class="icon-btn" data-act="cell-step" data-v="-1" aria-label="한 시간 앞">‹</button><b class="grow" style="text-align:center">' + sc.h + '시대</b><button type="button" class="icon-btn" data-act="cell-step" data-v="1" aria-label="한 시간 뒤">›</button></div>';
    var h = nav + (c.hours < 0.01 ? emptyBox('이 시간대에는 아직 일한 기록이 없어요. 한 번 나가 보면 칸이 칠해져요.', btn('close', '닫기', 'ghost')) :
      '<div class="kv"><span>일한 시간</span><span class="v">' + L.fmtDur(c.hours * L.HOUR) + '</span><span>콜</span><span class="v">' + c.calls + '건</span><span>매출</span><span class="v">' + won(c.gross) + '</span><span>실수입 몫</span><span class="v ' + signCls(c.net) + '">' + won(c.net) + '</span><span class="total">시간당</span><span class="v total">' + (v == null ? '-' : won(v)) + '</span><span>전체 평균 시간당</span><span class="v">' + won(all.perHour) + '</span></div>' +
      '<p class="hint" style="margin-top:8px">' + (v != null && all.perHour > 0 ? (v >= all.perHour ? '평균보다 ' + won(v - all.perHour) + ' 더 남는 시간대예요.' : '평균보다 ' + won(all.perHour - v) + ' 덜 남는 시간대예요.') : '') + '</p>');
    $('cell-root').innerHTML = h;
    Array.prototype.forEach.call(document.querySelectorAll('.hc.sel'), function (x) { x.classList.remove('sel'); });
    var g = document.querySelector('.hc[data-d="' + sc.d + '"][data-h="' + sc.h + '"]');
    if (g) g.classList.add('sel');
  }

  // ---------- 지출 ----------
  function costMonth() {
    var a = A(), d = L.fromKey(a.today());
    var m = new Date(d.getFullYear(), d.getMonth() + a.ui.costOff, 1, 12), ms = L.toKey(m);
    return { from: ms, to: L.monthEnd(ms), label: m.getFullYear() + '년 ' + (m.getMonth() + 1) + '월' };
  }
  function catOf(id) { return D.EXPENSE_CATS.filter(function (c) { return c.id === id; })[0] || D.EXPENSE_CATS[D.EXPENSE_CATS.length - 1]; }
  function renderCost() {
    var a = A(), S = a.S, ctx = a.ctx(), u = a.ui, k = a.today();
    var cm = costMonth();
    var h = '<div class="row" style="margin-bottom:10px"><button type="button" class="icon-btn" data-act="cost-prev" aria-label="이전 달">‹</button><b class="grow" style="text-align:center">' + cm.label + '</b><button type="button" class="icon-btn" data-act="cost-next" aria-label="다음 달"' + (u.costOff >= 0 ? ' disabled' : '') + '>›</button></div>';
    var ex = L.sumExpenses(S.expenses, cm.from, cm.to);
    var list = S.expenses.filter(function (e) { return e.date >= cm.from && e.date <= cm.to; }).sort(function (x, y) { return x.date < y.date ? 1 : -1; });
    h += '<div class="card" id="cost-exp"><div class="card-title"><h3>지출 ' + won(ex.total) + '</h3>' + btn('exp-new', '＋ 지출', 'primary small') + '</div>';
    if (!list.length) h += emptyBox('이 달 지출이 없어요. 주유·정비 영수증을 넣으면 연비 맞추기와 한 달 정리에 쓰여요.', btn('exp-new', '지출 넣기', 'primary'));
    else {
      var maxC = Math.max.apply(null, Object.keys(ex.by).map(function (c) { return ex.by[c]; })) || 1;
      h += Object.keys(ex.by).sort(function (x, y) { return ex.by[y] - ex.by[x]; }).map(function (cid) {
        var c = catOf(cid);
        return '<div style="margin-bottom:6px"><div class="line-row" style="border:0;padding:0"><span class="l">' + c.icon + ' ' + esc(c.name) + '</span><b>' + won(ex.by[cid]) + '</b></div><div class="hbar"><i style="width:' + Math.round(ex.by[cid] / maxC * 100) + '%;background:var(--accent)"></i></div></div>';
      }).join('');
      h += '<div style="margin-top:8px">' + list.map(function (e) {
        var c = catOf(e.cat);
        return '<button type="button" class="list-row" data-act="exp-open" data-id="' + esc(e.id) + '"><span class="l"><b>' + c.icon + ' ' + esc(c.name) + '</b><span class="tiny">' + L.dayLabel(e.date) + (e.memo ? ' · ' + esc(e.memo) : '') + '</span></span><span class="r"><b>' + won(e.amt) + '</b></span></button>';
      }).join('') + '</div>';
    }
    h += '</div>';
    // 고정비
    var fm = L.fixedMonthly(S.fixed);
    h += '<div class="card" id="cost-fixed"><div class="card-title"><h3>매달 나가는 돈 ' + won(fm) + '</h3>' + btn('fixed-new', '＋ 더하기', 'small') + '</div>';
    if (!S.fixed.length) h += emptyBox('보험·리스·통신비처럼 매달 나가는 돈을 넣으면 일한 시간만큼 나눠 실수입에서 빼요.', btn('fixed-new', '고정비 넣기', 'primary'));
    else h += S.fixed.map(function (f) {
      return '<div class="line-row"><span class="l">' + esc(f.name) + ' · <b>' + won(f.monthly) + '</b></span>' + btn('fixed-open', '고치기', 'small', ' data-id="' + esc(f.id) + '"') + btn('fixed-del', '지우기', 'small ghost', ' data-id="' + esc(f.id) + '" aria-label="' + esc(f.name) + ' 지우기"') + '</div>';
    }).join('');
    h += '<p class="fine">시간당 몫 ' + won(L.fixedPerHour(S.settings, S.fixed)) + ' = 월 ' + won(fm) + ' ÷ (한 달 ' + S.settings.workDays + '일 × 하루 ' + S.settings.dayHours + '시간). 일하는 날·시간은 더보기에서 고쳐요.</p></div>';
    // 연비 맞추기
    var fc = L.fuelCheck(S.expenses, S.shifts, ctx, cm.from);
    h += '<div class="card" id="cost-fuel"><h3>연비 맞추기</h3><div class="kv"><span>이 달 주행 (기록)</span><span class="v">' + L.num(fc.km) + 'km</span><span>기름값 어림</span><span class="v">' + won(fc.est) + '</span><span>기름·충전 지출 (영수증)</span><span class="v">' + won(fc.actual) + '</span></div>';
    if (fc.suggestKmPerL) {
      h += '<p class="hint" style="margin-top:8px">영수증대로라면 실제 연비는 약 <b>' + fc.suggestKmPerL + 'km/L</b> 예요 (지금 설정 ' + S.settings.kmPerL + 'km/L).</p>' + btn('apply-kmpl', '이 연비로 바꾸기', 'ghost', ' data-v="' + fc.suggestKmPerL + '"');
    } else {
      h += '<p class="hint" style="margin-top:8px">한 달 동안 주유 영수증을 지출에 넣고 운행 끝에 거리를 넣으면, 어림과 실제를 비교해 연비를 맞춰 드려요.</p>';
    }
    h += '</div>';
    // 정비
    h += '<div class="card" id="cost-maint"><h3>정비</h3><form id="form-odo" class="row" autocomplete="off" novalidate><label class="field grow" style="margin:0"><span>지금 계기판 km</span><input id="odo-now" type="number" inputmode="numeric" min="0" max="999999" value="' + (S.odo || '') + '"><span class="err" id="odo-now-err"></span></label><button type="submit" class="btn" style="align-self:flex-end">저장</button></form>';
    h += D.MAINT.map(function (item) {
      var st = L.maintStatus(item, S.maint[item.key], S.odo, k);
      var cls = st.ratio >= 1 ? ' over-m' : (st.due ? ' warn-m' : '');
      return '<div class="line-row" style="display:block"><div class="row"><span class="grow"><b>' + esc(item.name) + '</b> <span class="tiny">' + (st.interval > 0 ? L.num(st.interval) + 'km마다' : st.days + '일마다') + '</span><br><span class="tiny ' + (st.ratio >= 1 ? 'minus' : '') + '">' + esc(st.text) + '</span></span>' + btn('maint-open', '했어요', 'small', ' data-k="' + item.key + '"') + '</div>' +
        (st.known ? '<div class="meter' + cls + '"><i style="width:' + Math.min(100, Math.round(st.ratio * 100)) + '%"></i></div>' : '') + '</div>';
    }).join('') + '<p class="fine">주기는 흔한 예시예요. 내 차종 설명서를 따르고 했어요 창에서 고쳐 쓰세요.</p></div>';
    $('cost-root').innerHTML = h;
  }
  function renderExpense() {
    var a = A(), u = a.ui, e = u.expDraft;
    $('exp-title').textContent = e.id ? '지출 고치기' : '지출 넣기';
    $('exp-cats').innerHTML = D.EXPENSE_CATS.map(function (c) {
      return '<button type="button" class="chip' + (c.id === e.cat ? ' on' : '') + '" data-act="exp-cat" data-c="' + c.id + '" aria-pressed="' + (c.id === e.cat) + '">' + c.icon + ' ' + esc(c.name) + '</button>';
    }).join('');
    var form = $('form-exp');
    var del = form.querySelector('[data-act="exp-del"]');
    if (e.id && !del) form.insertAdjacentHTML('beforeend', btn('exp-del', '이 지출 지우기', 'danger block', ' style="margin-top:8px"'));
    if (!e.id && del) del.parentNode.removeChild(del);
  }
  function renderFixedForm() {
    $('fixed-list').innerHTML = ['유상운송 보험', '리스료', '할부금', '휴대폰 요금', '배달대행 가입비', '헬멧·장비 나눠 내기'].map(function (n) { return '<option value="' + n + '">'; }).join('');
  }

  // ---------- 더보기 ----------
  function renderMore() {
    var a = A(), S = a.S, st = S.settings;
    var veh = D.VEHICLES.map(function (v) {
      return '<button type="button" class="chip' + (st.vehicle === v.id ? ' on' : '') + '" data-act="set-vehicle" data-id="' + v.id + '" aria-pressed="' + (st.vehicle === v.id) + '">' + v.icon + ' ' + esc(v.name) + '</button>';
    }).join('');
    var h = '<div class="card" id="more-goal"><h3>목표·차종</h3><div class="chips">' + veh + '</div>' +
      '<form id="form-settings" autocomplete="off" novalidate style="margin-top:10px">' +
      '<label class="field"><span>하루 목표 실수입 (원)</span><input id="set-goal" type="number" inputmode="numeric" min="10000" max="1000000" value="' + st.goal + '"><span class="err" id="set-goal-err"></span></label>' +
      (st.costMode === 'perKm' ?
        '<label class="field"><span>km당 전기·유지비 (원)</span><input id="set-perkm" type="number" inputmode="decimal" min="0" max="500" value="' + st.perKm + '"><span class="err" id="set-perkm-err"></span></label>' :
        '<div class="row2"><label class="field"><span>연비 (km/L)</span><input id="set-kmpl" type="number" inputmode="decimal" min="1" max="100" step="0.1" value="' + st.kmPerL + '"><span class="err" id="set-kmpl-err"></span></label>' +
        '<label class="field"><span>기름값 (원/L)</span><input id="set-fuel" type="number" inputmode="numeric" min="500" max="5000" value="' + st.fuelPrice + '"><span class="err" id="set-fuel-err"></span></label></div>') +
      '<div class="row2"><label class="field"><span>한 달 일하는 날</span><input id="set-days" type="number" inputmode="numeric" min="1" max="31" value="' + st.workDays + '"><span class="err" id="set-days-err"></span></label>' +
      '<label class="field"><span>하루 일하는 시간</span><input id="set-hours" type="number" inputmode="numeric" min="1" max="16" value="' + st.dayHours + '"><span class="err" id="set-hours-err"></span></label></div>' +
      '<label class="field"><span>떼어 둘 돈 비율 (세금·수리 비상금, %)</span><input id="set-aside" type="number" inputmode="numeric" min="0" max="50" value="' + st.setAside + '"><span class="err" id="set-aside-err"></span></label>' +
      '<button type="submit" class="btn primary block">저장</button></form></div>';
    h += '<div class="card" id="more-plat"><div class="card-title"><h3>일하는 곳</h3>' + btn('plat-new', '＋ 더하기', 'small') + '</div>' +
      S.platforms.filter(function (p) { return !p.gone; }).map(function (p) {
        return '<div class="line-row"><span class="l"><span class="dot pc-' + (p.color % 6) + '"></span><b>' + esc(p.name) + '</b> · 공제 ' + p.cut + '%' + (p.perCall ? ' + 건당 ' + won(p.perCall) : '') + '</span>' +
          btn('plat-open', '고치기', 'small', ' data-id="' + esc(p.id) + '"') + btn('plat-del', '지우기', 'small ghost', ' data-id="' + esc(p.id) + '" aria-label="' + esc(p.name) + ' 지우기"') + '</div>';
      }).join('') + '<p class="fine">지운 곳의 지난 콜은 그대로 남고 계산도 그대로예요.</p></div>';
    var tg = function (key, label) { return '<label class="check"><input type="checkbox" data-act="toggle" data-k="' + key + '"' + (st[key] ? ' checked' : '') + '> <span>' + label + '</span></label>'; };
    h += '<div class="card" id="more-view"><h3>보기</h3><div class="sub-label">글자 크기</div><div class="chips">' + [[1, '보통'], [2, '크게'], [3, '아주 크게']].map(function (x) {
      return '<button type="button" class="chip' + (st.fs === x[0] ? ' on' : '') + '" data-act="set-fs" data-v="' + x[0] + '" aria-pressed="' + (st.fs === x[0]) + '">' + x[1] + '</button>';
    }).join('') + '</div><div style="margin-top:8px">' + tg('light', '밝은 화면 (낮 햇빛 아래)') + tg('reduce', '움직임 줄이기') + tg('vib', '콜 찍을 때 진동') + tg('sound', '콜 찍을 때 소리') + '</div></div>';
    h += '<div class="card" id="more-data"><h3>데이터</h3><p class="hint">기록은 이 기기 브라우저에만 저장돼요. 어디로도 보내지 않아요. 브라우저 기록을 지우면 함께 지워지니 가끔 내보내 두세요.</p><div class="row wrap">' +
      btn('open-backup', '내보내기·가져오기', 'ghost') +
      (S.shifts.some(function (s) { return s.sample; }) ? btn('sample-remove', '예시 기록 빼기', 'ghost') : btn('sample-add', '예시 기록 넣기', 'ghost')) +
      btn('print', '기록 인쇄', 'ghost') + btn('clear-all', '전체 지우기', 'danger') + '</div></div>';
    h += '<div class="card" id="more-test"><div class="card-title"><h3>계산 점검</h3>' + btn('self-test', '점검하기', 'small') + '</div><div id="test-out" class="tests"><p class="hint">기획서의 계산 예시와 같은 값이 나오는지 확인해요.</p></div></div>';
    h += '<div class="card" id="more-info"><h3>정보</h3><p class="small-t">' + esc(D.BASIS) + '</p><p class="tiny">Ride Tally · 인터넷 없이 이 기기에서만 돌아가요. 그림은 모두 앱 안에서 그렸어요.</p></div>';
    $('more-root').innerHTML = h;
  }
  function renderTests() {
    var res = L.selfTest(), ok = res.filter(function (r) { return r.ok; }).length;
    $('test-out').innerHTML = '<p><b class="' + (ok === res.length ? 'plus' : 'minus') + '">' + ok + ' / ' + res.length + ' 맞음</b></p>' + res.map(function (r) {
      return '<div class="line-row"><span class="l">' + esc(r.name) + '<br><span class="tiny">' + esc(String(r.got)) + (r.ok ? '' : ' (기대 ' + esc(String(r.want)) + ')') + '</span></span><span class="' + (r.ok ? 'ok' : 'no') + '">' + (r.ok ? '맞음' : '틀림') + '</span></div>';
    }).join('');
    flash('test-out');
  }

  // ---------- 방법 ----------
  function renderHelp() {
    var h = '<div class="card"><h3>쓰는 순서</h3><ol>' + D.HELP_STEPS.map(function (s) { return '<li class="small-t">' + esc(s) + '</li>'; }).join('') + '</ol>' +
      btn('go', '홈으로', 'primary', ' data-to="home"') + '</div>';
    h += '<div class="card"><h3>어떻게 계산하나요</h3><div class="kv"><span>실수입</span><span class="v">매출 − 공제 − 기름값 − 고정비 몫</span><span>공제</span><span class="v">콜 금액 × 비율 + 건당</span><span>기름값</span><span class="v">km ÷ 연비 × 기름값</span><span>고정비 몫</span><span class="v">월 고정비 ÷ (날 × 시간) × 일한 시간</span><span>시간당</span><span class="v">실수입 ÷ 쉰 시간 뺀 일한 시간</span></div>' +
      '<p class="fine">운행 중에는 거리를 모르니 지난 운행의 평균 시간당 거리로 기름값을 어림하고, 운행을 끝낼 때 넣은 거리로 다시 계산해요.</p></div>';
    h += '<div class="card"><h3>개인정보</h3><p class="small-t">기록은 이 기기 브라우저에만 저장돼요. 어디로도 보내지 않고, 로그인도 없어요. 내보내기 글은 사람이 직접 복사할 때만 밖으로 나가요.</p></div>';
    h += '<div class="card"><h3>기본값 안내</h3><p class="small-t">' + esc(D.BASIS) + '</p></div>';
    h += '<div class="card"><h3>요령 ' + D.TIPS.length + '가지</h3>' + D.TIPS.map(function (t) { return '<p class="tip">' + esc(t) + '</p>'; }).join('') + '</div>';
    $('help-root').innerHTML = h;
  }

  // ---------- 처음 안내 ----------
  function renderWelcome() {
    var a = A(), v = a.ui.welcomeVeh || a.S.settings.vehicle;
    $('welcome-vehicles').innerHTML = D.VEHICLES.map(function (x) {
      return '<button type="button" class="chip' + (x.id === v ? ' on' : '') + '" data-act="welcome-veh" data-id="' + x.id + '" aria-pressed="' + (x.id === v) + '">' + x.icon + ' ' + esc(x.name) + '</button>';
    }).join('');
    $('welcome-goal-view').textContent = goalViewText($('welcome-goal').value);
  }
  function goalViewText(v) {
    var s = String(v == null ? '' : v).trim();
    if (s === '' || isNaN(+s) || +s <= 0) return '숫자로 넣어 주세요';
    return '하루 ' + L.won(+s);
  }

  window.UI = {
    $: $, esc: esc, swap: swap, show: show, openLayer: openLayer, closeLayer: closeLayer, topLayer: topLayer,
    toast: toast, flash: flash, markBad: markBad, fieldErr: fieldErr, clearErrs: clearErrs, reduced: reduced,
    renderHome: renderHome, rideTick: rideTick, callPop: callPop, renderStart: renderStart, renderCall: renderCall,
    renderEnd: renderEnd, renderResult: renderResult, goalHit: goalHit, countUp: countUp, renderLog: renderLog, renderShift: renderShift,
    renderMap: renderMap, renderCell: renderCell, renderCost: renderCost, renderExpense: renderExpense,
    renderFixedForm: renderFixedForm, renderMore: renderMore, renderTests: renderTests, renderHelp: renderHelp,
    renderWelcome: renderWelcome, goalViewText: goalViewText, catOf: catOf
  };
})();
