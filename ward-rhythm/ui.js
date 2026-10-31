/* Ward Rhythm — 화면 그리기 (글을 만들어 넣기만 하고, 데이터는 app.js 가 바꾼다) */
var UI = (function () {
  var L = Logic;
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var SCREENS = ['today', 'roster', 'plans', 'log', 'more', 'help'];
  var TAB_OF = { today: 'today', roster: 'roster', plans: 'plans', log: 'log', more: 'more', help: 'more' };
  var calm = false;
  function setCalm(v) { calm = !!v; document.body.classList.toggle('calm', calm); }

  /* ---------- 전환: 화면·시트·겹침 창은 모두 여기를 거친다 ---------- */
  function animateIn(el, cls) {
    el.classList.remove(cls);
    if (calm) return;
    void el.offsetWidth;
    el.classList.add(cls);
  }
  function show(name) {
    SCREENS.forEach(function (n) {
      var el = $('screen-' + n);
      if (n === name) { el.hidden = false; animateIn(el, 'enter'); } else el.hidden = true;
    });
    var tabs = document.querySelectorAll('#tabs .tab');
    for (var i = 0; i < tabs.length; i++) {
      var on = tabs[i].getAttribute('data-tab') === TAB_OF[name];
      tabs[i].classList.toggle('on', on);
      if (on) tabs[i].setAttribute('aria-current', 'page'); else tabs[i].removeAttribute('aria-current');
    }
    try { window.scrollTo(0, 0); } catch (e) { /* 없어도 된다 */ }
  }
  var openSheetId = null, sheetTimer = null;
  function openSheet(id, html) {
    var wrap = $('sheet-wrap');
    clearTimeout(sheetTimer);
    var sheets = wrap.querySelectorAll('.sheet');
    for (var i = 0; i < sheets.length; i++) { sheets[i].hidden = sheets[i].id !== id; sheets[i].classList.remove('up'); }
    var root = $(id).firstElementChild;
    if (html !== undefined) root.innerHTML = html;
    wrap.hidden = false;
    openSheetId = id;
    if (calm) { $(id).classList.add('up'); wrap.classList.add('on'); }
    else { void wrap.offsetWidth; wrap.classList.add('on'); $(id).classList.add('up'); }
    var f = $(id).querySelector('input:not([type=hidden]),textarea,select,button');
    if (f && f.focus) { try { f.focus({ preventScroll: true }); } catch (e) { /* 없어도 된다 */ } }
  }
  function refreshSheet(html) { if (openSheetId) $(openSheetId).firstElementChild.innerHTML = html; }
  function closeSheet() {
    var wrap = $('sheet-wrap');
    if (wrap.hidden) return;
    wrap.classList.remove('on');
    if (openSheetId) $(openSheetId).classList.remove('up');
    openSheetId = null;
    if (calm) { wrap.hidden = true; return; }
    sheetTimer = setTimeout(function () { if (!openSheetId) wrap.hidden = true; }, 230);
  }
  function sheetOpen() { return openSheetId; }
  /* 겹침 창은 주 버튼에 focus 를 준다. 키보드로 연 때만 테두리를 보인다 */
  var byKey = false;
  document.addEventListener('keydown', function () {
    byKey = true;
    var q = document.querySelectorAll('.no-ring');
    for (var i = 0; i < q.length; i++) q[i].classList.remove('no-ring');
  }, true);
  document.addEventListener('pointerdown', function () { byKey = false; }, true);
  /* 크롬은 focusVisible 옵션을 모르고 첫 화면 focus 에 테두리를 그린다. no-ring 으로 끈다 */
  function openOverlay(id) {
    var el = $(id); el.hidden = false; animateIn(el, 'enter');
    var b = el.querySelector('.btn.primary') || el.querySelector('button');
    if (!b) return;
    if (!byKey) {
      b.classList.add('no-ring');
      b.addEventListener('blur', function off() { b.classList.remove('no-ring'); b.removeEventListener('blur', off); });
    }
    try { b.focus({ preventScroll: true, focusVisible: byKey }); } catch (e) { b.focus(); }
  }
  function closeOverlay(id) { $(id).hidden = true; }

  /* ---------- 짧은 반응 ---------- */
  var toastTimer = null;
  function toast(msg, kind, undo) {
    var el = $('toast');
    el.className = 'toast ' + (kind || 'ok');
    el.innerHTML = '<span class="t-ic" aria-hidden="true">' + (kind === 'bad' ? '!' : '✓') + '</span><span>' + esc(msg) + '</span>' +
      (undo ? '<button type="button" class="btn small ghost" data-act="undo">되돌리기</button>' : '');
    el.hidden = false;
    animateIn(el, 'pop');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, undo ? 6000 : 2800);
  }
  function fieldErr(inputId, msg) {
    var inp = $(inputId), box = $(inputId + '-err');
    if (box) box.textContent = msg;
    if (inp) {
      inp.setAttribute('aria-invalid', 'true');
      animateIn(inp, 'shake');
      try { inp.focus(); } catch (e) { /* 없어도 된다 */ }
    }
  }
  function clearErr(inputId) {
    var inp = $(inputId), box = $(inputId + '-err');
    if (box) box.textContent = '';
    if (inp) inp.removeAttribute('aria-invalid');
  }
  function flash(sel) {
    var el = document.querySelector(sel);
    if (el) animateIn(el, 'flash');
  }

  /* ---------- 조각 ---------- */
  var ART = {
    moon: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" style="fill:var(--accent-soft)"/><path d="M38 14a19 19 0 1 0 12 30A16 16 0 0 1 38 14z" style="fill:var(--accent)"/><circle cx="20" cy="20" r="2.5" style="fill:var(--sun)"/><circle cx="46" cy="48" r="2" style="fill:var(--sun)"/></svg>',
    cal: '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="10" width="52" height="46" rx="10" style="fill:var(--accent-soft)"/><rect x="6" y="10" width="52" height="12" rx="6" style="fill:var(--accent)"/><rect x="14" y="28" width="10" height="10" rx="3" style="fill:var(--c-d)"/><rect x="27" y="28" width="10" height="10" rx="3" style="fill:var(--c-e)"/><rect x="40" y="28" width="10" height="10" rx="3" style="fill:var(--c-n)"/><rect x="14" y="41" width="10" height="10" rx="3" style="fill:var(--c-off)"/></svg>',
    cup: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" style="fill:var(--accent-soft)"/><rect x="16" y="26" width="26" height="22" rx="6" style="fill:var(--surface);stroke:var(--accent);stroke-width:3"/><path d="M42 31h4a5 5 0 0 1 0 10h-4" style="fill:none;stroke:var(--accent);stroke-width:3"/><path d="M24 14c0 4 4 4 4 8M32 14c0 4 4 4 4 8" style="fill:none;stroke:var(--teal);stroke-width:3;stroke-linecap:round"/></svg>',
    bed: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" style="fill:var(--accent-soft)"/><rect x="10" y="34" width="44" height="12" rx="4" style="fill:var(--accent)"/><rect x="14" y="26" width="14" height="9" rx="4" style="fill:var(--surface)"/><rect x="10" y="44" width="4" height="8" style="fill:var(--accent)"/><rect x="50" y="44" width="4" height="8" style="fill:var(--accent)"/><text x="38" y="24" font-size="12" style="fill:var(--accent);font-weight:700">z</text><text x="46" y="16" font-size="9" style="fill:var(--accent);font-weight:700">z</text></svg>',
    search: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" style="fill:var(--accent-soft)"/><circle cx="28" cy="28" r="11" style="fill:none;stroke:var(--accent);stroke-width:4"/><path d="M36 36l10 10" style="stroke:var(--accent);stroke-width:5;stroke-linecap:round"/></svg>'
  };
  function emptyBox(art, title, text, btnLabel, act, attrs) {
    return '<div class="empty card">' + '<div class="empty-art">' + ART[art] + '</div>' +
      '<p class="empty-t">' + esc(title) + '</p><p class="muted">' + esc(text) + '</p>' +
      (btnLabel ? '<button type="button" class="btn primary" data-act="' + act + '"' + (attrs || '') + '>' + esc(btnLabel) + '</button>' : '') + '</div>';
  }
  function chip(t, extra) {
    if (!t) return '<span class="code c-none' + (extra || '') + '">·</span>';
    return '<span class="code ' + t.cls + (extra || '') + '">' + esc(t.short) + '</span>';
  }
  function badge(level) { return '<span class="badge lv-' + level + '">' + L.LEVEL_NAME[level] + '</span>'; }
  function kindOf(id) {
    for (var i = 0; i < DATA.PLAN_KINDS.length; i++) if (DATA.PLAN_KINDS[i].id === id) return DATA.PLAN_KINDS[i];
    return DATA.PLAN_KINDS[DATA.PLAN_KINDS.length - 1];
  }
  function endHM(p) { return L.fmtHM(L.hm(p.start) + p.dur); }
  function riskRow(r) {
    var info = L.riskInfo(r.type);
    return '<button type="button" class="list-row" data-act="day-open" data-date="' + r.date + '">' +
      '<span class="dot lv-' + info.level + '" aria-hidden="true"></span><span class="grow"><b>' + esc(L.md(r.date)) + ' · ' + esc(info.name) + '</b><span class="muted small-t">' + esc(L.riskText(r)) + '</span></span><span class="chev" aria-hidden="true">›</span></button>';
  }
  function planRow(S, p) {
    var k = kindOf(p.kind), v = L.planCheck(S, p.date, p.start, p.dur);
    return '<button type="button" class="list-row" data-act="plan-open" data-id="' + esc(p.id) + '">' +
      '<span class="pic" aria-hidden="true">' + k.icon + '</span><span class="grow"><b>' + esc(p.title || k.name) + '</b><span class="muted small-t">' +
      esc(L.md(p.date) + ' ' + p.start + '~' + endHM(p)) + ' · ' + esc(v.why) + '</span></span>' + badge(v.level) + '</button>';
  }
  function sleepLine(sl) {
    if (sl.mins <= 0) return '잘 수 있는 시간이 없어요';
    return L.clock(sl.bed) + ' ~ ' + L.clock(sl.wake) + ' (' + L.dur(sl.mins) + ')';
  }
  function monthHead(which, y, m) {
    return '<div class="month-nav"><button type="button" class="btn icon" data-act="month" data-which="' + which + '" data-d="-1" aria-label="지난달">‹</button>' +
      '<h2>' + y + '년 ' + m + '월</h2><button type="button" class="btn icon" data-act="month" data-which="' + which + '" data-d="1" aria-label="다음 달">›</button></div>';
  }

  /* ---------- 오늘 ---------- */
  function renderToday(S, V) {
    var t = L.today(), now = Date.now(), h = '';
    var has = Object.keys(S.roster).length > 0;
    if (!has) {
      /* 첫 실행: hero 하나에 안내와 주 버튼을 모은다 */
      h += '<div class="card hero hero-empty"><p class="hero-k">' + esc(L.md(t)) + '</p><p class="hero-t">근무표부터 찍어 볼까요?</p><p class="hero-s">D·E·N 칩을 고르고 날짜를 누르면 오늘 잘 시간과 다가올 위험이 여기에 떠요. 돌아가는 근무면 패턴으로 한 번에 넣어요.</p>' +
        '<button type="button" class="btn primary wide" data-act="go" data-to="roster">근무표 찍기</button></div>';
    } else {
      var working = L.workingAt(S, now), nw = L.nextWork(S, now), off = L.nextOff(S, t);
      var big, small;
      if (working) { big = '지금 ' + working.t.name + ' 근무 중'; small = L.clock(working.e) + ' 퇴근 예정'; }
      else if (nw) { big = '다음 근무 ' + L.md(nw.date) + ' ' + nw.t.name; small = L.clock(nw.s) + ' 시작 · ' + L.dur((nw.s - now) / 60000) + ' 남음'; }
      else { big = '앞으로 찍힌 근무가 없어요'; small = '근무표에서 다음 달을 찍어 주세요'; }
      var offTxt = off ? (off.days === 0 ? '오늘은 쉬는 날' : '다음 쉬는 날 ' + L.md(off.date) + ' · D-' + off.days) : '앞으로 쉬는 날이 안 찍혔어요';
      h += '<div class="card hero"><p class="hero-k">' + esc(L.md(t)) + ' · ' + esc(offTxt) + '</p><p class="hero-t">' + esc(big) + '</p><p class="hero-s">' + esc(small) + '</p></div>';
      /* 다음 잘 시간 */
      var sl = L.sleepFor(S, t);
      if (sl.wake <= now) sl = L.sleepFor(S, L.addDays(t, 1));
      h += '<div class="card"><p class="card-k">다음 잘 시간</p><p class="big-num">' + esc(sleepLine(sl)) + '</p>' +
        '<p class="muted">' + (sl.kind === 'day' ? '나이트 뒤 낮잠이에요. 방을 어둡게 해요.' : '알람 ' + esc(L.clock(sl.wake))) +
        (sl.short ? ' · <b class="t-warn">필요한 잠(' + S.set.needSleep + '시간)보다 짧아요</b>' : '') + '</p>' +
        (sl.nap ? '<p class="muted">나이트 전 낮잠 ' + esc(L.clock(sl.nap.s) + ' ~ ' + L.clock(sl.nap.e)) + '</p>' : '') + '</div>';
      /* 이번 주 */
      var rmap = L.risksByDate(L.risks(S, t, L.addDays(t, 13)));
      h += '<div class="card"><p class="card-k">앞으로 7일</p><div class="week">';
      for (var i = 0; i < 7; i++) {
        var d = L.addDays(t, i), rs = rmap[d] || [], lv = '';
        rs.forEach(function (r) { var l = L.riskInfo(r.type).level; if (l === 'bad' || !lv) lv = l; });
        h += '<button type="button" class="wday' + (i === 0 ? ' now' : '') + '" data-act="day-open" data-date="' + d + '"><span class="small-t">' + L.DOW[L.dow(d)] + '</span>' + chip(L.shiftOf(S, d)) +
          '<span class="small-t">' + L.parse(d).getDate() + '</span>' + (lv ? '<i class="dot lv-' + lv + '" aria-label="위험"></i>' : '') + '</button>';
      }
      h += '</div></div>';
      var all = []; Object.keys(rmap).sort().forEach(function (k) { all = all.concat(rmap[k]); });
      h += '<div class="card"><p class="card-k">앞으로 14일 위험 ' + all.length + '개</p>' +
        (all.length ? all.slice(0, 5).map(riskRow).join('') + (all.length > 5 ? '<button type="button" class="btn ghost wide" data-act="go" data-to="roster">근무표에서 모두 보기</button>' : '')
          : '<p class="muted">퀵리턴·연속 나이트·잠 부족이 없어요.</p>') + '</div>';
    }
    /* 다가올 약속 */
    var up = S.plans.filter(function (p) { return p.date >= t && p.date <= L.addDays(t, 14); }).sort(planSort);
    h += '<div class="card"><div class="card-head"><p class="card-k">다가올 약속</p><button type="button" class="btn small" data-act="plan-new">약속 더하기</button></div>' +
      (up.length ? up.slice(0, 5).map(function (p) { return planRow(S, p); }).join('') :
        '<div class="mini-empty">' + ART.cup + '<p class="muted">2주 안에 잡힌 약속이 없어요. 약속 부탁이 오면 여기서 먼저 판정해요.</p><button type="button" class="btn" data-act="go" data-to="plans">약속 판정하기</button></div>') + '</div>';
    h += '<div class="card tip"><p class="card-k">오늘의 요령</p><p id="tip-text">' + esc(DATA.TIPS[V.tip % DATA.TIPS.length]) + '</p><button type="button" class="btn small ghost" data-act="tip-next">다음 요령</button></div>';
    $('today-root').innerHTML = h;
  }
  function planSort(a, b) { return (a.date + a.start) < (b.date + b.start) ? -1 : 1; }

  /* ---------- 근무표 ---------- */
  function renderRoster(S, V) {
    var y = V.ry, m = V.rm, n = L.monthDays(y, m), first = L.monthKey(y, m) + '-01', last = L.monthKey(y, m) + '-' + L.pad(n);
    var t = L.today();
    var h = monthHead('roster', y, m);
    h += '<div class="brush" role="toolbar" aria-label="찍을 근무 고르기">';
    h += '<button type="button" class="bchip' + (V.brush === 'view' ? ' on' : '') + '" data-act="brush" data-id="view" aria-pressed="' + (V.brush === 'view') + '">👁 보기</button>';
    S.shifts.forEach(function (s) {
      h += '<button type="button" class="bchip ' + s.cls + (V.brush === s.id ? ' on' : '') + '" data-act="brush" data-id="' + s.id + '" aria-pressed="' + (V.brush === s.id) + '">' + esc(s.short) + '<span class="bname">' + esc(s.name) + '</span></button>';
    });
    h += '<button type="button" class="bchip' + (V.brush === 'erase' ? ' on' : '') + '" data-act="brush" data-id="erase" aria-pressed="' + (V.brush === 'erase') + '">⌫ 지우개</button></div>';
    var bt = L.typeById(S, V.brush);
    h += '<p class="hint">' + (V.brush === 'view' ? '칸을 누르면 그날 근무·잘 시간·약속을 자세히 봐요.' : V.brush === 'erase' ? '칸을 누르면 근무를 지워요.' : '칸을 누르면 ' + esc(bt ? bt.name : '') + '이(가) 찍혀요. 같은 칸을 다시 누르면 지워요.') + '</p>';
    var rmap = L.risksByDate(L.risks(S, first, last));
    var planDays = {}; S.plans.forEach(function (p) { planDays[p.date] = true; });
    h += '<div class="grid-head">' + L.DOW.map(function (d, i) { return '<span class="' + (i === 0 ? 'sun' : i === 6 ? 'sat' : '') + '">' + d + '</span>'; }).join('') + '</div><div class="grid" id="roster-grid">';
    var lead = L.dow(first);
    for (var b = 0; b < lead; b++) h += '<span class="cell blank"></span>';
    var filled = 0;
    for (var i = 0; i < n; i++) {
      var d = L.addDays(first, i), s = L.shiftOf(S, d), rs = rmap[d] || [], lv = '';
      if (s) filled++;
      rs.forEach(function (r) { var l = L.riskInfo(r.type).level; if (l === 'bad' || !lv) lv = l; });
      h += '<button type="button" class="cell' + (s ? ' has ' + s.cls : '') + (d === t ? ' now' : '') + '" data-act="cell" data-date="' + d + '" aria-label="' + esc(L.md(d) + ' ' + (s ? s.name : '비어 있음')) + '">' +
        '<span class="dn">' + (i + 1) + '</span><span class="cc">' + (s ? esc(s.short) : '') + '</span>' +
        (lv ? '<i class="dot lv-' + lv + '"></i>' : '') + (planDays[d] ? '<i class="pdot"></i>' : '') + '</button>';
    }
    h += '</div>';
    if (!filled) {
      h += emptyBox('cal', '이 달은 아직 비어 있어요', '위 칩을 고르고 날짜를 누르거나, 돌아가는 근무면 패턴으로 한 번에 채워요.', '패턴으로 채우기', 'open-pattern');
    } else {
      var cnt = {}; for (var j = 0; j < n; j++) { var sx = L.shiftOf(S, L.addDays(first, j)); if (sx) cnt[sx.id] = (cnt[sx.id] || 0) + 1; }
      h += '<p class="sumline">' + S.shifts.filter(function (s) { return cnt[s.id]; }).map(function (s) { return chip(s) + ' ' + cnt[s.id]; }).join(' · ') + ' · 빈 칸 ' + (n - filled) + '</p>';
      var all = []; Object.keys(rmap).sort().forEach(function (k) { all = all.concat(rmap[k]); });
      h += '<div class="card"><p class="card-k">이 달 위험 ' + all.length + '개</p>' + (all.length ? all.map(riskRow).join('') : '<p class="muted">이 달은 위험이 없어요. 👍</p>') + '</div>';
    }
    h += '<div class="btn-grid"><button type="button" class="btn" data-act="open-pattern">패턴으로 채우기</button><button type="button" class="btn" data-act="open-shifts">근무 시각</button>' +
      '<button type="button" class="btn" data-act="open-share">쉬는 날 글</button><button type="button" class="btn" data-act="print"' + (filled ? '' : ' disabled') + '>🖨 이 달 인쇄</button>' +
      '<button type="button" class="btn" data-act="clear-month"' + (filled ? '' : ' disabled') + '>이 달 지우기</button></div>';
    $('roster-root').innerHTML = h;
  }

  /* ---------- 날 보기 시트 ---------- */
  function dayHtml(S, date, E) {
    var s = L.shiftOf(S, date), sp = L.span(S, date), sl = L.sleepFor(S, date);
    var rs = L.risks(S, date, date);
    var note = S.notes[date] || { chips: [], text: '' };
    var h = '<div class="sheet-head"><button type="button" class="btn icon" data-act="day-move" data-d="-1" aria-label="전날">‹</button><h2>' + esc(L.md(date)) + '</h2>' +
      '<button type="button" class="btn icon" data-act="day-move" data-d="1" aria-label="다음 날">›</button><button type="button" class="btn icon close" data-act="close-sheet" aria-label="닫기">✕</button></div>';
    h += '<p class="card-k">근무</p><div class="brush">';
    S.shifts.forEach(function (t) { h += '<button type="button" class="bchip ' + t.cls + (s && s.id === t.id ? ' on' : '') + '" data-act="day-set" data-id="' + t.id + '" aria-pressed="' + !!(s && s.id === t.id) + '">' + esc(t.short) + '<span class="bname">' + esc(t.name) + '</span></button>'; });
    h += '<button type="button" class="bchip" data-act="day-set" data-id=""' + (s ? '' : ' disabled') + '>비우기</button></div>';
    h += '<div class="kv"><span>근무 시각</span><b>' + (sp ? esc(L.clock(sp.s) + ' ~ ' + L.clock(sp.e) + (L.dateOf(sp.e) !== date ? ' (다음 날)' : '') + ' · ' + L.hours(sp) + '시간') : s ? '쉬는 날' : '비어 있음') + '</b></div>';
    h += '<div class="kv"><span>' + (sl.kind === 'day' ? '나이트 뒤 잠' : '이날 아침까지 잠') + '</span><b class="' + (sl.short ? 't-warn' : '') + '">' + esc(sleepLine(sl)) + '</b></div>';
    if (sl.nap) h += '<div class="kv"><span>나이트 전 낮잠</span><b>' + esc(L.clock(sl.nap.s) + ' ~ ' + L.clock(sl.nap.e)) + '</b></div>';
    h += rs.length ? rs.map(function (r) { var i = L.riskInfo(r.type); return '<div class="risk lv-' + i.level + '"><b>' + esc(i.name) + '</b> ' + esc(L.riskText(r)) + '<br><span class="small-t">' + esc(i.fix) + '</span></div>'; }).join('') : '<p class="muted">이날은 위험이 없어요.</p>';
    var ps = S.plans.filter(function (p) { return p.date === date; }).sort(planSort);
    h += '<div class="card-head"><p class="card-k">이날 약속</p><button type="button" class="btn small" data-act="plan-new" data-date="' + date + '">약속 더하기</button></div>';
    h += ps.length ? ps.map(function (p) { return planRow(S, p); }).join('') : '<p class="muted">약속이 없어요.</p>';
    h += '<form id="form-day" class="form" novalidate><p class="card-k">근무 메모</p><div class="chips">';
    DATA.DAY_CHIPS.forEach(function (c) { var on = E.chips.indexOf(c) >= 0; h += '<button type="button" class="chip' + (on ? ' on' : '') + '" data-act="day-chip" data-chip="' + esc(c) + '" aria-pressed="' + on + '">' + esc(c) + '</button>'; });
    h += '</div><label for="day-text">한 줄 메모 (60자까지)</label><input id="day-text" maxlength="80" value="' + esc(E.text) + '" placeholder="예: 3번 병실 인계 길었음"><p id="day-text-err" class="err" aria-live="polite"></p>' +
      '<button type="submit" class="btn primary wide">메모 저장</button></form>';
    return h;
  }

  /* ---------- 약속 ---------- */
  function renderPlans(S, V) {
    var t = L.today(), q = V.quick;
    var h = '<form id="form-quick" class="card quick" novalidate><p class="card-k">이 시간 괜찮을까?</p>' +
      '<div class="row3"><label>날짜<input type="date" id="q-date" value="' + esc(q.date) + '"></label><label>시작<input type="time" id="q-start" value="' + esc(q.start) + '"></label>' +
      '<label>길이(분)<input type="number" id="q-dur" inputmode="numeric" min="10" max="1440" step="10" value="' + esc(q.dur) + '"></label></div>' +
      '<p id="q-date-err" class="err" aria-live="polite"></p><div id="quick-out" aria-live="polite">' + quickOut(S, q) + '</div>' +
      '<button type="submit" class="btn primary wide">이대로 약속 남기기</button></form>';
    h += '<div class="toolbar"><label class="search"><span class="sr">약속 찾기</span><input type="search" id="plan-q" placeholder="약속 이름·메모 찾기" value="' + esc(V.planQ) + '"></label>' +
      '<button type="button" class="btn small" data-act="plan-new">약속 더하기</button></div><div class="chips">';
    [['up', '다가올'], ['bad', '무리·빠듯만'], ['past', '지난'], ['all', '전체']].forEach(function (f) {
      h += '<button type="button" class="chip' + (V.planF === f[0] ? ' on' : '') + '" data-act="plan-filter" data-f="' + f[0] + '" aria-pressed="' + (V.planF === f[0]) + '">' + f[1] + '</button>';
    });
    h += '</div><div class="chips sort-row" role="group" aria-label="정렬"><span class="card-k sort-k">정렬</span>';
    PLAN_SORTS.forEach(function (o) {
      h += '<button type="button" class="chip' + (V.planS === o[0] ? ' on' : '') + '" data-act="plan-sort" data-s="' + o[0] + '" aria-pressed="' + (V.planS === o[0]) + '">' + o[1] + '</button>';
    });
    h += '</div><div id="plan-list">' + planListHtml(S, V) + '</div>';
    $('plans-root').innerHTML = h;
  }
  function quickOut(S, q) {
    var e = quickErr(q);
    if (e) return '<p class="muted">' + esc(e) + '</p>';
    var v = L.planCheck(S, q.date, q.start, +q.dur);
    var s = L.shiftOf(S, q.date), prev = L.shiftOf(S, L.addDays(q.date, -1)), next = L.shiftOf(S, L.addDays(q.date, 1));
    return '<div class="verdict lv-' + v.level + '">' + badge(v.level) + '<span>' + esc(v.why) + '</span></div>' +
      '<p class="muted small-t">' + esc(L.md(q.date) + ' ' + q.start + '~' + L.fmtHM(L.hm(q.start) + +q.dur)) + ' · 전날 ' + (prev ? esc(prev.name) : '비어 있음') + ' · 그날 ' + (s ? esc(s.name) : '비어 있음') + ' · 다음 날 ' + (next ? esc(next.name) : '비어 있음') + ' · 오가는 시간 ' + S.set.travel + '분 포함</p>';
  }
  function quickErr(q) {
    if (!L.validDate(q.date)) return '날짜를 골라 주세요';
    if (!L.validHM(q.start)) return '시작 시각을 넣어 주세요';
    var e = L.checkNum(q.dur, 10, 1440, '길이');
    return e;
  }
  function planListHtml(S, V) {
    var t = L.today(), q = V.planQ.trim().toLowerCase();
    var list = S.plans.filter(function (p) {
      if (q && (p.title + ' ' + (p.memo || '') + ' ' + kindOf(p.kind).name).toLowerCase().indexOf(q) < 0) return false;
      if (V.planF === 'up') return p.date >= t;
      if (V.planF === 'past') return p.date < t;
      if (V.planF === 'bad') return p.date >= t && L.planCheck(S, p.date, p.start, p.dur).level !== 'ok';
      return true;
    });
    sortPlans(S, list, V.planS, V.planF === 'past');
    if (!S.plans.length) return emptyBox('cup', '남긴 약속이 없어요', '위에서 날짜·시각을 넣어 판정을 보고, 괜찮으면 그대로 남겨요.', '약속 더하기', 'plan-new');
    if (!list.length) return emptyBox('search', '맞는 약속이 없어요', q ? '찾는 말을 바꾸거나 지워 보세요.' : '다른 칩을 눌러 보세요.', '전체 보기', 'plan-filter', ' data-f="all"');
    return '<div class="card">' + list.map(function (p) { return planRow(S, p); }).join('') + '</div>';
  }
  /* 약속 정렬: 날짜(지난 약속은 최근 것부터) · 판정 나쁜 순 · 종류 · 이름. 같으면 날짜순 */
  var PLAN_SORTS = [['date', '날짜순'], ['risk', '판정 나쁜 순'], ['kind', '종류순'], ['name', '이름순']];
  var LEVEL_RANK = { bad: 0, tight: 1, ok: 2 };
  function sortPlans(S, list, mode, newestFirst) {
    var byDate = function (a, b) { return newestFirst ? planSort(b, a) : planSort(a, b); };
    var key = {};
    list.forEach(function (p) {
      if (mode === 'risk') key[p.id] = LEVEL_RANK[L.planCheck(S, p.date, p.start, p.dur).level];
      else if (mode === 'kind') key[p.id] = DATA.PLAN_KINDS.indexOf(kindOf(p.kind));
    });
    return list.sort(function (a, b) {
      var d = 0;
      if (mode === 'risk' || mode === 'kind') d = (key[a.id] || 0) - (key[b.id] || 0);
      else if (mode === 'name') d = (a.title || '').localeCompare(b.title || '', 'ko');
      return d || byDate(a, b);
    });
  }
  function planHtml(S, E) {
    var k = kindOf(E.kind);
    var h = '<div class="sheet-head"><h2>' + (E.id ? '약속 고치기' : '새 약속') + '</h2><button type="button" class="btn icon close" data-act="close-sheet" aria-label="닫기">✕</button></div>' +
      '<form id="form-plan" class="form" novalidate><p class="card-k">종류</p><div class="chips kinds">';
    DATA.PLAN_KINDS.forEach(function (x) { h += '<button type="button" class="chip' + (x.id === E.kind ? ' on' : '') + '" data-act="plan-kind" data-id="' + x.id + '" aria-pressed="' + (x.id === E.kind) + '">' + x.icon + ' ' + esc(x.name) + '</button>'; });
    h += '</div><label for="p-title">이름 (40자까지)</label><input id="p-title" maxlength="60" value="' + esc(E.title) + '" placeholder="' + esc(k.name) + '"><p id="p-title-err" class="err"></p>' +
      '<div class="row3"><label>날짜<input type="date" id="p-date" value="' + esc(E.date) + '"></label><label>시작<input type="time" id="p-start" value="' + esc(E.start) + '"></label>' +
      '<label>길이(분)<input type="number" id="p-dur" inputmode="numeric" min="10" max="1440" step="10" value="' + esc(E.dur) + '"></label></div><p id="p-date-err" class="err"></p>' +
      '<div id="plan-verdict" aria-live="polite">' + quickOut(S, { date: E.date, start: E.start, dur: E.dur }) + '</div>' +
      '<label for="p-memo">메모 (100자까지)</label><input id="p-memo" maxlength="140" value="' + esc(E.memo) + '" placeholder="예: 끝나는 시각 21시로 말해 두기"><p id="p-memo-err" class="err"></p>' +
      '<button type="submit" class="btn primary wide">저장</button>' +
      (E.id ? '<button type="button" class="btn danger wide" data-act="plan-del" data-id="' + esc(E.id) + '">약속 지우기</button>' : '') + '</form>';
    return h;
  }

  /* ---------- 기록 ---------- */
  function renderLog(S, V) {
    var y = V.ly, m = V.lm, st = L.monthStats(S, y, m);
    var h = monthHead('log', y, m);
    var work = 0; S.shifts.forEach(function (s) { if (s.work) work += st.counts[s.id] || 0; });
    if (!st.filled) {
      h += emptyBox('cal', '이 달 근무표가 비어 있어요', '근무를 찍으면 근무 수·밤 시간·주말 오프·위험을 달마다 모아 보여 줘요.', '근무표 찍기', 'go', ' data-to="roster"');
    } else {
      h += '<div class="card hero"><p class="hero-k">' + m + '월 요약</p><p class="hero-t">근무 ' + work + '일 · 나이트 ' + (st.counts.N || 0) + '번</p><p class="hero-s">주말 오프 ' + st.weekendOff + '/' + st.weekendDays + '일 · 위험 ' + st.risks.length + '개</p></div>';
      var max = 1; S.shifts.forEach(function (s) { max = Math.max(max, st.counts[s.id] || 0); });
      h += '<div class="card"><p class="card-k">근무 종류</p>' + S.shifts.filter(function (s) { return st.counts[s.id]; }).map(function (s) {
        return '<div class="bar-row">' + chip(s) + '<span class="bar"><i class="' + s.cls + '" style="width:' + Math.round((st.counts[s.id] / max) * 100) + '%"></i></span><b>' + st.counts[s.id] + '</b></div>';
      }).join('') + '</div>';
      h += '<div class="stats"><div class="stat"><span>일한 시간</span><b>' + Math.round(st.hours * 10) / 10 + '시간</b></div><div class="stat"><span>밤(22~06시) 시간</span><b>' + Math.round(st.night * 10) / 10 + '시간</b></div>' +
        '<div class="stat"><span>가장 긴 연속 근무</span><b>' + st.longest + '일</b></div><div class="stat"><span>퀵리턴</span><b>' + (st.riskCount.quick || 0) + '번</b></div>' +
        '<div class="stat"><span>잠 부족 날</span><b>' + (st.riskCount.short || 0) + '일</b></div><div class="stat"><span>찍은 날</span><b>' + st.filled + '/' + st.days + '</b></div></div>';
      var chips = Object.keys(st.chips).sort(function (a, b) { return st.chips[b] - st.chips[a]; });
      if (chips.length) h += '<div class="card"><p class="card-k">근무 메모 많이 단 것</p><div class="chips">' + chips.slice(0, 8).map(function (c) { return '<span class="chip static">' + esc(c) + ' ' + st.chips[c] + '</span>'; }).join('') + '</div></div>';
    }
    /* 잠 기록 */
    var sl = S.sleeps.filter(function (s) { return s.date >= st.first && s.date <= st.last; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    h += '<div class="card"><div class="card-head"><p class="card-k">잠 기록</p><button type="button" class="btn small" data-act="sleep-new">잠 남기기</button></div>';
    if (sl.length) {
      h += '<p class="big-num">평균 ' + esc(L.dur(st.sleepAvg)) + '</p><p class="muted">필요한 잠보다 모자란 시간 합 ' + esc(L.dur(st.debt)) + (st.qAvg ? ' · 느낌 평균 ' + st.qAvg.toFixed(1) + '/5' : '') + '</p>';
      h += sl.map(function (s) {
        var mm = L.sleepMins(s.bed, s.wake), q = DATA.SLEEP_Q[(s.q || 3) - 1];
        return '<button type="button" class="list-row" data-act="sleep-open" data-id="' + esc(s.id) + '"><span class="pic" aria-hidden="true">' + q.icon + '</span><span class="grow"><b>' + esc(L.md(s.date)) + ' · ' + esc(L.dur(mm)) + '</b><span class="muted small-t">' + esc(s.bed + ' → ' + s.wake + (s.chips && s.chips.length ? ' · ' + s.chips.join('·') : '')) + '</span></span>' +
          '<span class="mini-bar" aria-hidden="true"><i style="width:' + Math.min(100, Math.round(mm / (S.set.needSleep * 60) * 100)) + '%"></i></span></button>';
      }).join('');
    } else {
      h += '<div class="mini-empty">' + ART.bed + '<p class="muted">이 달 잠 기록이 없어요. 일어나자마자 누운 시각·일어난 시각만 남겨도 평균이 보여요.</p><button type="button" class="btn" data-act="sleep-new">잠 남기기</button></div>';
    }
    h += '</div>';
    if (st.filled || sl.length) h += '<button type="button" class="btn wide" data-act="print">🖨 이 달 기록 인쇄</button>';
    $('log-root').innerHTML = h;
  }
  function sleepHtml(S, E) {
    var h = '<div class="sheet-head"><h2>' + (E.id ? '잠 기록 고치기' : '잠 남기기') + '</h2><button type="button" class="btn icon close" data-act="close-sheet" aria-label="닫기">✕</button></div>' +
      '<form id="form-sleep" class="form" novalidate><div class="row3"><label>일어난 날<input type="date" id="s-date" value="' + esc(E.date) + '"></label><label>누운 시각<input type="time" id="s-bed" value="' + esc(E.bed) + '"></label><label>일어난 시각<input type="time" id="s-wake" value="' + esc(E.wake) + '"></label></div>' +
      '<p id="s-date-err" class="err" aria-live="polite"></p><p id="s-len" class="muted">' + esc(sleepLen(E)) + '</p><p class="card-k">느낌</p><div class="chips">';
    DATA.SLEEP_Q.forEach(function (q) { h += '<button type="button" class="chip' + (E.q === q.v ? ' on' : '') + '" data-act="sleep-q" data-v="' + q.v + '" aria-pressed="' + (E.q === q.v) + '">' + q.icon + ' ' + q.name + '</button>'; });
    h += '</div><p class="card-k">있었던 일</p><div class="chips">';
    DATA.SLEEP_CHIPS.forEach(function (c) { var on = E.chips.indexOf(c) >= 0; h += '<button type="button" class="chip' + (on ? ' on' : '') + '" data-act="sleep-chip" data-chip="' + esc(c) + '" aria-pressed="' + on + '">' + esc(c) + '</button>'; });
    h += '</div><button type="submit" class="btn primary wide">저장</button>' + (E.id ? '<button type="button" class="btn danger wide" data-act="sleep-del" data-id="' + esc(E.id) + '">기록 지우기</button>' : '') + '</form>';
    return h;
  }
  function sleepLen(E) {
    if (!L.validHM(E.bed) || !L.validHM(E.wake)) return '누운 시각과 일어난 시각을 넣어 주세요';
    return '잔 시간 ' + L.dur(L.sleepMins(E.bed, E.wake));
  }

  /* ---------- 패턴·근무 시각·쉬는 날 글·내보내기 ---------- */
  function patternHtml(S, E) {
    var p = DATA.PATTERNS[E.i] || DATA.PATTERNS[0];
    var h = '<div class="sheet-head"><h2>패턴으로 채우기</h2><button type="button" class="btn icon close" data-act="close-sheet" aria-label="닫기">✕</button></div><form id="form-pattern" class="form" novalidate><div class="plist">';
    DATA.PATTERNS.forEach(function (x, i) {
      h += '<button type="button" class="list-row' + (i === E.i ? ' on' : '') + '" data-act="pattern-pick" data-i="' + i + '" aria-pressed="' + (i === E.i) + '"><span class="grow"><b>' + esc(x.name) + '</b><span class="seq">' +
        x.seq.map(function (id) { return chip(L.typeById(S, id)); }).join('') + '</span></span></button>';
    });
    h += '</div><div class="row3"><label>시작 날<input type="date" id="pt-start" value="' + esc(E.start) + '"></label><label>며칠 (7~62)<input type="number" id="pt-days" inputmode="numeric" min="7" max="62" value="' + esc(E.days) + '"></label></div>' +
      '<p id="pt-start-err" class="err" aria-live="polite"></p><p class="muted small-t">고른 패턴: ' + esc(p.name) + ' · 이미 찍힌 칸은 덮어써요.</p><button type="submit" class="btn primary wide">채우기</button></form>';
    return h;
  }
  function shiftsHtml(S) {
    var h = '<div class="sheet-head"><h2>근무 시각</h2><button type="button" class="btn icon close" data-act="close-sheet" aria-label="닫기">✕</button></div><form id="form-shifts" class="form" novalidate><p class="muted">우리 병동 시각에 맞춰요. 끝 시각이 시작보다 이르면 다음 날 끝나는 근무예요.</p>';
    S.shifts.forEach(function (t) {
      if (!t.work) return;
      h += '<div class="shift-row">' + chip(t) + '<b>' + esc(t.name) + '</b><label>시작<input type="time" id="sh-' + t.id + '-s" value="' + esc(t.start) + '"></label><label>끝<input type="time" id="sh-' + t.id + '-e" value="' + esc(t.end) + '"></label></div><p id="sh-' + t.id + '-s-err" class="err"></p>';
    });
    h += '<button type="submit" class="btn primary wide">저장</button><button type="button" class="btn wide" data-act="shifts-reset">기본 시각으로</button></form>';
    return h;
  }
  function shareHtml(S, V) {
    return '<div class="sheet-head"><h2>' + V.ry + '년 ' + V.rm + '월 쉬는 날 글</h2><button type="button" class="btn icon close" data-act="close-sheet" aria-label="닫기">✕</button></div>' +
      '<p class="muted">복사해서 가족·친구 대화방에 붙여 넣어요. 저녁 7시 약속 판정은 지금 근무표·설정으로 계산했어요.</p>' +
      '<label for="share-text" class="sr">쉬는 날 글</label><textarea id="share-text" rows="8" readonly>' + esc(L.shareText(S, V.ry, V.rm)) + '</textarea>' +
      '<button type="button" class="btn primary wide" data-act="copy" data-from="share-text">글 복사</button>' +
      '<label for="table-text" class="card-k">근무표 표 (표 계산 프로그램에 붙여 넣기)</label><textarea id="table-text" rows="5" readonly>' + esc(Store.rosterTable(S, V.ry, V.rm)) + '</textarea>' +
      '<button type="button" class="btn wide" data-act="copy" data-from="table-text">표 복사</button>';
  }
  function backupHtml(S) {
    return '<div class="sheet-head"><h2>내보내기·가져오기</h2><button type="button" class="btn icon close" data-act="close-sheet" aria-label="닫기">✕</button></div>' +
      '<p class="card-k">내보내기</p><p class="muted">근무표·메모·약속·잠 기록·설정을 모두 글 하나로 담았어요. 메모장이나 내게 보내기에 붙여 두면 다른 기기에서 되살릴 수 있어요.</p>' +
      '<label for="export-text" class="sr">내보낸 글</label><textarea id="export-text" rows="5" readonly>' + esc(Store.exportText(S)) + '</textarea>' +
      '<button type="button" class="btn wide" data-act="copy" data-from="export-text">내보낸 글 복사</button>' +
      '<form id="form-backup" class="form" novalidate><p class="card-k">가져오기</p><label for="restore-text">내보낸 글을 붙여 넣어요. 지금 기록은 붙여 넣은 것으로 바뀌어요.</label><textarea id="restore-text" rows="5" placeholder="내보내기에서 복사한 글을 여기에 붙여 넣어요"></textarea>' +
      '<p id="restore-text-err" class="err" aria-live="polite"></p><button type="submit" class="btn primary wide">가져오기</button></form>';
  }

  /* ---------- 더보기 ---------- */
  function renderMore(S, V) {
    var s = S.set;
    function num(id, label, val, min, max, step, unit) {
      return '<label for="' + id + '">' + label + ' <span class="muted small-t">(' + min + '~' + max + unit + ')</span></label><input type="number" id="' + id + '" inputmode="decimal" min="' + min + '" max="' + max + '" step="' + step + '" value="' + esc(val) + '"><p id="' + id + '-err" class="err"></p>';
    }
    var h = '<form id="form-settings" class="card form" novalidate><p class="card-k">계산 기준</p>' +
      num('set-commute', '통근 시간 (한쪽, 분)', s.commute, 0, 180, 5, '분') +
      num('set-prep', '일어나서 나가기까지 (분)', s.prep, 0, 180, 5, '분') +
      num('set-need', '하루 필요한 잠 (시간)', s.needSleep, 4, 10, 0.5, '시간') +
      num('set-rest', '근무 사이 최소 쉬는 시간 (시간)', s.minRest, 6, 16, 0.5, '시간') +
      num('set-nights', '연속 나이트 한도 (번)', s.maxNights, 1, 7, 1, '번') +
      num('set-streak', '연속 근무 한도 (일)', s.maxStreak, 3, 10, 1, '일') +
      num('set-travel', '약속 장소 오가는 시간 (한쪽, 분)', s.travel, 0, 180, 5, '분') +
      '<label for="set-wake">근무 없는 날 일어나는 시각</label><input type="time" id="set-wake" value="' + esc(s.offWake) + '"><p id="set-wake-err" class="err"></p>' +
      '<button type="submit" class="btn primary wide">기준 저장</button></form>';
    h += '<div class="card"><p class="card-k">보기</p>' + [['dark', '어두운 화면 (나이트 때 눈부심 줄이기)'], ['big', '글자 크게'], ['calm', '움직임 줄이기'], ['sound', '저장할 때 짧은 소리']].map(function (o) {
      return '<button type="button" class="toggle" data-act="look" data-k="' + o[0] + '" aria-pressed="' + !!s[o[0]] + '"><span>' + o[1] + '</span><i class="sw" aria-hidden="true"></i></button>';
    }).join('') + '</div>';
    h += '<div class="card"><p class="card-k">근무표·기록</p><div class="btn-grid">' +
      '<button type="button" class="btn" data-act="open-shifts">근무 시각</button><button type="button" class="btn" data-act="open-backup">내보내기·가져오기</button>' +
      (S.sample ? '<button type="button" class="btn" data-act="sample-remove">예시 빼기</button>' : '<button type="button" class="btn" data-act="sample-add">예시 넣어 보기</button>') +
      '<button type="button" class="btn danger" data-act="clear-all">전체 지우기</button></div></div>';
    h += '<div class="card"><div class="card-head"><p class="card-k">계산 점검</p><button type="button" class="btn small" data-act="self-test">점검하기</button></div><div id="test-out">' + (V.tests ? testsHtml(V.tests) : '<p class="muted">미리 손으로 계산해 둔 예시와 같은 값을 내는지 이 기기에서 확인해요.</p>') + '</div></div>';
    h += '<div class="card"><p class="card-k">정보</p><p>Ward Rhythm · 판 1.0</p><p class="muted">기록은 이 기기 브라우저에만 저장돼요. 서버로 보내지 않고, 로그인·광고·분석 도구가 없어요. 브라우저 데이터를 지우면 기록도 지워지니 내보내기로 남겨 두세요.</p>' +
      '<p class="muted">잘 시간·위험·약속 판정은 근무 시각과 넣은 기준으로 하는 어림이에요. 의료 조언이 아니며, 근무 규정은 병원마다 달라요.</p><p class="muted">기본 내용 ' + L.countContent() + '개 · 바깥 도구·글꼴·그림 파일 없이 만들었어요.</p></div>';
    $('more-root').innerHTML = h;
  }
  function testsHtml(list) {
    var ok = list.filter(function (x) { return x.ok; }).length;
    return '<p class="' + (ok === list.length ? 't-ok' : 't-warn') + '"><b>' + ok + '/' + list.length + ' 맞음</b></p><ul class="tests">' +
      list.map(function (x) { return '<li class="' + (x.ok ? 'ok' : 'no') + '">' + (x.ok ? '✓ ' : '✗ ') + esc(x.name) + ' — ' + esc(x.got) + (x.ok ? '' : ' (기대 ' + esc(x.want) + ')') + '</li>'; }).join('') + '</ul>';
  }

  /* ---------- 방법 ---------- */
  function renderHelp() {
    var h = '<div class="card hero"><p class="hero-k">방법</p><p class="hero-t">한 달에 한 번 찍고, 약속 앞에서 판정</p><p class="hero-s">근무표 → 잘 시간·위험 → 약속 판정 → 쉬는 날 글</p></div>';
    h += '<div class="card"><p class="card-k">쓰는 순서</p><ol class="steps">' + DATA.STEPS.map(function (s) { return '<li><b>' + esc(s.t) + '</b><span class="muted">' + esc(s.d) + '</span></li>'; }).join('') + '</ol></div>';
    h += '<div class="card"><p class="card-k">판정은 이렇게 해요</p><p>' + badge('bad') + ' 약속(오가는 시간 포함)이 근무(통근 포함)와 겹치거나, 잘 시간을 1시간 30분 넘게 깎아요.</p><p>' + badge('tight') + ' 잘 시간을 조금 깎거나 나이트 전 낮잠과 겹쳐요.</p><p>' + badge('ok') + ' 근무·잘 시간과 겹치지 않아요.</p>' +
      '<p class="muted">잘 시간: 다음 근무 시작에서 준비·통근 시간을 빼면 일어날 시각, 거기서 필요한 잠을 빼면 누울 시각이에요. 앞 근무가 늦게 끝나면 퇴근 + 통근 + 30분부터 잘 수 있어요. 나이트가 아침에 끝난 날은 그 뒤 낮잠이 큰 잠이에요.</p></div>';
    h += '<div class="card"><p class="card-k">위험 표시</p>' + DATA.RISKS.map(function (r) { return '<div class="risk lv-' + r.level + '"><b>' + esc(r.name) + '</b> ' + esc(r.text) + '<br><span class="small-t">' + esc(r.fix) + '</span></div>'; }).join('') + '</div>';
    h += '<div class="card"><p class="card-k">근무 종류</p>' + DATA.SHIFT_TYPES.map(function (t) { return '<p>' + chip(t) + ' ' + esc(t.name) + (t.work ? ' · 기본 ' + t.start + '~' + t.end : ' · 쉬는 날') + '</p>'; }).join('') + '</div>';
    h += '<div class="card"><p class="card-k">개인정보</p><p class="muted">기록은 이 기기 브라우저에만 저장돼요. 어디로도 보내지 않아요. 다른 기기로 옮길 때는 더보기 → 내보내기·가져오기를 써요.</p></div>';
    h += '<div class="card"><p class="card-k">요령 ' + DATA.TIPS.length + '</p><ol class="tips">' + DATA.TIPS.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol></div>';
    $('help-root').innerHTML = h;
  }

  return {
    $: $, esc: esc, setCalm: setCalm, show: show, openSheet: openSheet, refreshSheet: refreshSheet, closeSheet: closeSheet, sheetOpen: sheetOpen,
    openOverlay: openOverlay, closeOverlay: closeOverlay, toast: toast, fieldErr: fieldErr, clearErr: clearErr, flash: flash,
    renderToday: renderToday, renderRoster: renderRoster, renderPlans: renderPlans, renderLog: renderLog, renderMore: renderMore, renderHelp: renderHelp,
    dayHtml: dayHtml, planHtml: planHtml, sleepHtml: sleepHtml, sleepLen: sleepLen, patternHtml: patternHtml, shiftsHtml: shiftsHtml, shareHtml: shareHtml, backupHtml: backupHtml,
    quickOut: quickOut, quickErr: quickErr, planListHtml: planListHtml, testsHtml: testsHtml, kindOf: kindOf
  };
})();
