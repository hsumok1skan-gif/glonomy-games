/* Tint Ledger — 화면 그리기 (상태는 app.js 의 App.S·App.V 를 읽기만 한다) */
window.UI = (function () {
  var D = window.TL_DATA;
  var L = window.Logic;
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function S() { return window.App.S; }
  function V() { return window.App.V; }
  function kindOf(id) { for (var i = 0; i < D.KINDS.length; i++) if (D.KINDS[i].id === id) return D.KINDS[i]; return D.KINDS[D.KINDS.length - 1]; }
  function clientOf(id) { var c = S().clients; for (var i = 0; i < c.length; i++) if (c[i].id === id) return c[i]; return null; }
  function servicesOf(cid) {
    return S().services.filter(function (s) { return s.clientId === cid; })
      .sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
  }
  function lastService(cid) { var l = servicesOf(cid); return l.length ? l[0] : null; }
  function initial(name) { return esc(String(name || '?').trim().charAt(0) || '?'); }
  function hueOf(name) { var h = 0; String(name).split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) % 360; }); return h; }
  function avatar(c) { return '<span class="avatar" style="background:hsl(' + hueOf(c.name) + ',38%,46%)">' + initial(c.name) + '</span>'; }
  function sw(shade) { return '<span class="sw" style="background:' + L.swatch(shade) + '"></span>'; }
  function linesText(lines) {
    return (lines || []).map(function (l) { return esc(l.shade) + (l.g != null ? ' ' + L.gram(l.g) : ''); }).join(' + ');
  }
  function dueText(nextDate) {
    if (!nextDate) return '';
    var d = L.daysBetween(L.toKey(), nextDate);
    if (d < 0) return '지남 ' + (-d) + '일';
    if (d === 0) return '오늘';
    return 'D-' + d;
  }

  // ---- 화면 전환: 모든 화면은 이 함수를 거친다 (0.22초 흐려지며 밀기, 움직임 줄이기면 바로) ----
  var TAB_OF = { today: 'today', clients: 'clients', client: 'clients', mix: 'clients', timers: 'timers', log: 'log', shelf: 'more', more: 'more', help: 'more' };
  function show(name) {
    var all = document.querySelectorAll('.screen');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('on');
    var el = $('screen-' + name);
    if (!el) return;
    void el.offsetWidth; // 애니메이션 다시 걸기
    el.classList.add('on');
    var tabs = document.querySelectorAll('.tab');
    for (var j = 0; j < tabs.length; j++) {
      var on = tabs[j].getAttribute('data-tab') === TAB_OF[name];
      tabs[j].classList.toggle('on', on);
      if (on) tabs[j].setAttribute('aria-current', 'page'); else tabs[j].removeAttribute('aria-current');
    }
    try { window.scrollTo(0, 0); } catch (e) { /* 무시 */ }
  }
  // ---- 시트·겹침 창 ----
  function openSheet(id) {
    closeSheets(true);
    var s = $(id), b = $('sheet-back');
    if (!s) return;
    s.classList.remove('hidden'); b.classList.remove('hidden');
    void s.offsetWidth;
    s.classList.add('show'); b.classList.add('show');
    var f = s.querySelector('input:not([readonly]), textarea:not([readonly])');
    if (f && window.matchMedia && window.matchMedia('(pointer: fine)').matches) { try { f.focus(); } catch (e) { /* 무시 */ } }
  }
  function closeSheets(quick) {
    var list = document.querySelectorAll('.sheet');
    var b = $('sheet-back');
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (s.classList.contains('hidden')) continue;
      s.classList.remove('show');
      if (quick || document.body.classList.contains('reduce')) s.classList.add('hidden');
      else (function (el) { setTimeout(function () { if (!el.classList.contains('show')) el.classList.add('hidden'); }, 220); })(s);
    }
    b.classList.remove('show');
    if (quick || document.body.classList.contains('reduce')) b.classList.add('hidden');
    else setTimeout(function () { if (!b.classList.contains('show')) b.classList.add('hidden'); }, 220);
  }
  function anySheetOpen() { return !!document.querySelector('.sheet.show'); }
  // 겹침 창(ov-welcome·ov-confirm)은 모두 이 두 함수로 열고 닫는다 (0.22초 흐려지며 커지기, 움직임 줄이기면 바로)
  function openOverlay(id) {
    var o = $(id);
    if (!o) return;
    o.classList.remove('hidden');
    void o.offsetWidth;
    o.classList.add('show');
  }
  function closeOverlay(id, quick) {
    var o = $(id);
    if (!o || o.classList.contains('hidden')) return;
    o.classList.remove('show');
    if (quick || document.body.classList.contains('reduce')) o.classList.add('hidden');
    else setTimeout(function () { if (!o.classList.contains('show')) o.classList.add('hidden'); }, 220);
  }
  function overlayOpen(id) { var o = $(id); return !!(o && o.classList.contains('show')); }
  var toastTimer = null;
  function toast(msg, withUndo) {
    var t = $('toast');
    $('toast-text').innerHTML = '<span class="check-pop">✓</span> ' + esc(msg);
    $('toast-undo').classList.toggle('hidden', !withUndo);
    t.classList.remove('hidden');
    t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.add('hidden'); }, withUndo ? 5000 : 2200);
  }
  function hideToast() { $('toast').classList.add('hidden'); }
  // 잘못된 입력: 그 칸 흔들림 + 옆에 이유
  function fieldErr(id, msg) {
    var el = $(id), e = $(id + '-err');
    if (e) e.textContent = msg || '';
    if (!el) return;
    el.classList.remove('bad');
    if (msg) { void el.offsetWidth; el.classList.add('bad'); el.setAttribute('aria-invalid', 'true'); }
    else el.removeAttribute('aria-invalid');
  }
  function flash(el) { if (!el) return; el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }

  // ---- 빈 화면 ----
  var EMPTY_ART = {
    bowl: '<svg viewBox="0 0 96 72" aria-hidden="true"><ellipse cx="48" cy="60" rx="34" ry="6" fill="var(--soft)"/><path d="M14 30h68c0 18-14 28-34 28S14 48 14 30z" fill="var(--accent)"/><path d="M60 8l10 22" stroke="var(--teal)" stroke-width="5" stroke-linecap="round"/></svg>',
    cards: '<svg viewBox="0 0 96 72" aria-hidden="true"><rect x="18" y="14" width="50" height="40" rx="8" fill="var(--soft)"/><rect x="28" y="20" width="50" height="40" rx="8" fill="var(--surface)" stroke="var(--accent)" stroke-width="2"/><circle cx="42" cy="36" r="6" fill="var(--accent)"/><rect x="52" y="32" width="18" height="4" rx="2" fill="var(--line)"/><rect x="36" y="48" width="34" height="4" rx="2" fill="var(--line)"/></svg>',
    clock: '<svg viewBox="0 0 96 72" aria-hidden="true"><circle cx="48" cy="38" r="26" fill="var(--soft)" stroke="var(--teal)" stroke-width="4"/><path d="M48 24v15l10 6" stroke="var(--accent)" stroke-width="4" fill="none" stroke-linecap="round"/></svg>',
    chart: '<svg viewBox="0 0 96 72" aria-hidden="true"><rect x="16" y="40" width="12" height="20" rx="3" fill="var(--soft)"/><rect x="34" y="28" width="12" height="32" rx="3" fill="var(--accent)"/><rect x="52" y="34" width="12" height="26" rx="3" fill="var(--teal)"/><rect x="70" y="18" width="12" height="42" rx="3" fill="var(--soft)"/></svg>',
    shelf: '<svg viewBox="0 0 96 72" aria-hidden="true"><rect x="12" y="56" width="72" height="5" rx="2" fill="var(--line)"/><rect x="20" y="26" width="16" height="30" rx="4" fill="var(--accent)"/><rect x="42" y="32" width="16" height="24" rx="4" fill="var(--teal)"/><rect x="64" y="20" width="14" height="36" rx="4" fill="var(--soft)" stroke="var(--line)"/></svg>'
  };
  function emptyBox(art, title, text, btnHtml) {
    return '<div class="card empty">' + (EMPTY_ART[art] || '') + '<h3>' + esc(title) + '</h3><p>' + esc(text) + '</p>' + (btnHtml || '') + '</div>';
  }

  // ---- 인쇄: 종이 한 장 (머리 줄은 인쇄 때만, 긴 목록은 PRINT_ROWS 줄까지) ----
  var PRINT_ROWS = 10;
  function printHead(what) {
    return '<div class="print-only print-head"><b>Tint Ledger</b> · ' + esc(what) + '<span>인쇄 ' + esc(L.prettyDate(L.toKey())) + '</span></div>';
  }
  function printMore(n) {
    return n > PRINT_ROWS ? '<p class="print-only muted">그 밖 ' + (n - PRINT_ROWS) + '건은 앱에서 보세요.</p>' : '';
  }
  function printBtn() { return '<button type="button" class="btn small" data-act="print">인쇄</button>'; }

  // ---- 오늘 ----
  function renderToday() {
    var s = S(), today = L.toKey();
    var todaySvc = s.services.filter(function (x) { return x.date === today; });
    var due = dueClients(3);
    var running = s.timers.length;
    var h = '';
    if (!s.clients.length) {
      h += emptyBox('cards', '첫 손님을 더해 보세요', '손님 카드에 배합을 남겨 두면 다음 방문 때 다시 섞기 한 번으로 오늘 양의 g 이 나와요.',
        '<div class="row gap"><button type="button" class="btn primary grow" data-act="client-new">손님 더하기</button><button type="button" class="btn grow" data-act="sample-add">예시로 둘러보기</button></div>');
    } else {
      h += '<div class="card soft"><div class="muted">' + esc(L.prettyDate(today)) + '</div>';
      h += '<div class="big-line">오늘 시술 ' + todaySvc.length + '건' + (due.length ? ',<br>다시 올 때 된 손님 ' + due.length + '명' : '') + '</div>';
      h += '<button type="button" class="btn primary full" data-act="mix-new">새 시술 시작</button></div>';
    }
    if (running) {
      h += '<div class="card"><div class="card-head"><h3>돌고 있는 타이머 ' + running + '개</h3><button type="button" class="btn small" data-act="go" data-to="timers">크게 보기</button></div>';
      s.timers.forEach(function (t) {
        h += '<div class="row between"><span>' + esc(t.label) + '</span><b id="tt-' + esc(t.id) + '" class="big-mini">' + L.fmtClock(window.App.timerLeft(t)) + '</b></div>';
      });
      h += '</div>';
    }
    if (due.length) {
      h += '<div class="card"><div class="card-head"><h3>다시 올 때 된 손님</h3><span class="muted">권장일 3일 안쪽·지남</span></div>';
      due.slice(0, 6).forEach(function (d) {
        h += '<button type="button" class="list-row" data-act="client-open" data-id="' + esc(d.c.id) + '">' + avatar(d.c) +
          '<span class="lr-main"><span class="lr-title">' + esc(d.c.name) + '</span><span class="lr-sub">지난번 ' + linesText(d.svc.lines) + '</span></span>' +
          '<span class="lr-side">' + esc(dueText(d.svc.nextDate)) + '</span></button>';
      });
      h += '</div>';
    }
    if (todaySvc.length) {
      h += '<div class="card"><h3>오늘 한 시술</h3>';
      todaySvc.slice().sort(function (a, b) { return b.at - a.at; }).forEach(function (x) { h += serviceRow(x, true); });
      h += '</div>';
    }
    var tip = D.TIPS[(s.settings.tipIdx || 0) % D.TIPS.length];
    h += '<div class="card soft"><div class="card-head"><h3>오늘의 요령</h3><button type="button" class="btn small ghost" data-act="tip-next" aria-label="다음 요령">다음 ›</button></div><p id="tip-text">' + esc(tip) + '</p></div>';
    $('today-root').innerHTML = h;
  }
  // 권장일이 오늘+days 안쪽이거나 지난 손님 (마지막 시술 기준)
  function dueClients(days) {
    var lim = L.addDays(L.toKey(), days);
    var out = [];
    S().clients.forEach(function (c) {
      var last = servicesOf(c.id).filter(function (x) { return x.nextDate; })[0];
      if (last && last.nextDate <= lim) out.push({ c: c, svc: last });
    });
    return out.sort(function (a, b) { return a.svc.nextDate < b.svc.nextDate ? -1 : 1; });
  }
  function serviceRow(x, withClient, cut) {
    var c = clientOf(x.clientId);
    var title = withClient && c ? esc(c.name) + ' · ' + esc(kindOf(x.kind).name) : esc(L.prettyDate(x.date)) + ' · ' + esc(kindOf(x.kind).name);
    if (withClient) title += '<small class="print-inline"> · ' + esc(L.shortDate(x.date)) + '</small>';
    var side = x.done ? (x.score ? '★' + x.score : '마무리') : '진행 중';
    var first = (x.lines && x.lines[0]) ? x.lines[0].shade : '';
    return '<button type="button" class="list-row' + (cut ? ' print-cut' : '') + '" data-act="svc-open" data-svc="' + esc(x.id) + '">' + sw(first) +
      '<span class="lr-main"><span class="lr-title">' + title + '</span><span class="lr-sub">' + linesText(x.lines) + ' · ' + L.gram(x.total) + '</span></span>' +
      '<span class="lr-side">' + side + '</span></button>';
  }

  // ---- 손님 목록 ----
  function renderClients() {
    var s = S(), v = V();
    var h = '<form id="form-search" class="row gap" novalidate role="search"><input id="client-q" type="search" maxlength="20" placeholder="이름·메모·색 번호로 찾기" value="' + esc(v.q) + '" aria-label="손님 찾기"><button type="button" class="btn primary" data-act="client-new">더하기</button></form>';
    h += '<div class="chips scroll" style="margin-top:12px">';
    [['recent', '최근 방문'], ['name', '이름'], ['due', '다시 올 날']].forEach(function (o) {
      h += '<button type="button" class="chip' + (v.sort === o[0] ? ' on' : '') + '" data-act="sort" data-sort="' + o[0] + '">' + o[1] + '</button>';
    });
    h += '</div><div class="chips scroll" style="margin-top:8px"><button type="button" class="chip' + (!v.tagFilter ? ' on' : '') + '" data-act="tagf" data-tag="">모든 꼬리표</button>';
    D.HAIR_TAGS.forEach(function (t) { h += '<button type="button" class="chip' + (v.tagFilter === t ? ' on' : '') + '" data-act="tagf" data-tag="' + esc(t) + '">' + esc(t) + '</button>'; });
    h += '</div><div id="client-list" style="margin-top:12px">' + clientListHtml() + '</div>';
    $('clients-root').innerHTML = h;
  }
  function clientListHtml() {
    var s = S(), v = V();
    if (!s.clients.length) return emptyBox('cards', '아직 손님이 없어요', '이름이나 별명만 적어도 돼요. 꼬리표로 모발 상태를 남겨 두세요.', '<button type="button" class="btn primary" data-act="client-new">첫 손님 더하기</button>');
    var q = String(v.q || '').trim().toLowerCase();
    var rows = s.clients.map(function (c) { return { c: c, last: lastService(c.id) }; }).filter(function (r) {
      if (v.tagFilter && (r.c.tags || []).indexOf(v.tagFilter) < 0) return false;
      if (!q) return true;
      var hay = (r.c.name + ' ' + (r.c.note || '') + ' ' + (r.c.phone || '') + ' ' + servicesOf(r.c.id).map(function (x) { return (x.lines || []).map(function (l) { return l.shade; }).join(' '); }).join(' ')).toLowerCase();
      return hay.indexOf(q) >= 0;
    });
    rows.sort(function (a, b) {
      if (v.sort === 'name') return a.c.name.localeCompare(b.c.name, 'ko');
      if (v.sort === 'due') {
        var ad = a.last && a.last.nextDate ? a.last.nextDate : '9999', bd = b.last && b.last.nextDate ? b.last.nextDate : '9999';
        return ad < bd ? -1 : ad > bd ? 1 : 0;
      }
      return ((b.last && b.last.at) || b.c.created || 0) - ((a.last && a.last.at) || a.c.created || 0);
    });
    if (!rows.length) return emptyBox('cards', '찾는 손님이 없어요', '다른 낱말로 찾거나 꼬리표 거르기를 풀어 보세요.', '<button type="button" class="btn" data-act="search-clear">찾기 풀기</button>');
    return rows.map(function (r) {
      var sub = r.last ? L.shortDate(r.last.date) + ' ' + linesText(r.last.lines) : '아직 시술 없음';
      return '<button type="button" class="list-row" data-act="client-open" data-id="' + esc(r.c.id) + '">' + avatar(r.c) +
        '<span class="lr-main"><span class="lr-title">' + esc(r.c.name) + '</span><span class="lr-sub">' + sub + '</span></span>' +
        '<span class="lr-side">' + esc(r.last ? dueText(r.last.nextDate) : '') + '</span></button>';
    }).join('');
  }

  // ---- 손님 카드 ----
  function renderClient() {
    var v = V(), c = clientOf(v.clientId);
    if (!c) { $('client-root').innerHTML = emptyBox('cards', '손님을 찾지 못했어요', '지워졌을 수 있어요.', '<button type="button" class="btn" data-act="go" data-to="clients">손님 목록</button>'); return; }
    var list = servicesOf(c.id);
    var last = list[0];
    var ps = L.patchState(c.patch, Date.now());
    var h = printHead('손님 카드 — ' + c.name);
    h += '<div class="row gap no-print" style="margin-bottom:12px"><button type="button" class="icon-btn" data-act="go" data-to="clients" aria-label="손님 목록으로">‹</button><h2 class="grow">손님 카드</h2>' + (last ? printBtn() : '') + '<button type="button" class="btn small" data-act="client-edit">고치기</button></div>';
    h += '<div class="card"><div class="row gap">' + avatar(c) + '<div class="grow"><h3>' + esc(c.name) + '</h3><div class="muted">' + esc(c.phone || '전화번호 없음') + '</div></div></div><div style="margin-top:8px">';
    (c.tags || []).forEach(function (t) { h += '<span class="tag">' + esc(t) + '</span>'; });
    if (!ps.has) h += '<span class="tag warnt">패치 테스트 기록 없음</span>';
    else if (!ps.ready) h += '<span class="tag warnt">패치 테스트 ' + esc(L.fmtLeft(ps.leftMs)) + ' 뒤 시술 가능</span>';
    else h += '<span class="tag ok">패치 테스트 48시간 지남</span>' + (ps.old ? '<span class="tag warnt">반년 넘음 — 다시 확인</span>' : '');
    h += '</div>' + (c.note ? '<p class="muted">' + esc(c.note) + '</p>' : '') + '</div>';
    if (last) {
      var gap = L.visitGap(list);
      h += '<div class="card soft"><div class="card-head"><h3>지난 배합</h3><span class="muted">' + esc(L.prettyDate(last.date)) + '</span></div>';
      h += '<div class="big-line">' + linesText(last.lines) + '</div>';
      h += '<div class="muted">' + esc(kindOf(last.kind).name) + ' · 산화제 ' + esc(last.dev) + '% ' + esc(L.ratioText(last.ratio)) + ' · 전체 ' + L.gram(last.total) + (last.left != null ? ' · 남김 ' + L.gram(last.left) : '') + '</div>';
      if (last.score) h += '<div class="muted">색 점수 ★' + last.score + ' ' + esc(D.SCORES[last.score - 1]) + '</div>';
      if (last.note) h += '<p>' + esc(last.note) + '</p>';
      if (last.nextDate) h += '<div class="muted">다음 방문 권장 ' + esc(L.prettyDate(last.nextDate)) + ' (' + esc(dueText(last.nextDate)) + ')' + (gap ? ' · 보통 ' + gap + '일마다 옴' : '') + '</div>';
      h += '<div class="row gap" style="margin-top:12px"><button type="button" class="btn primary grow" data-act="mix-again" data-svc="' + esc(last.id) + '">다시 섞기</button><button type="button" class="btn grow" data-act="mix-new" data-client="' + esc(c.id) + '">새 배합</button></div></div>';
      h += '<div class="card"><h3>시술 기록 ' + list.length + '번</h3>';
      list.forEach(function (x, i) { h += serviceRow(x, false, i >= PRINT_ROWS); });
      h += printMore(list.length) + '</div>';
    } else {
      h += emptyBox('bowl', '아직 남긴 배합이 없어요', '오늘 섞을 배합을 만들면 이 카드 맨 위에 남아요.', '<button type="button" class="btn primary" data-act="mix-new" data-client="' + esc(c.id) + '">새 배합 만들기</button>');
    }
    $('client-root').innerHTML = h;
  }

  // ---- 배합 ----
  function renderMix() {
    var s = S(), v = V(), m = v.mix;
    if (!m) { $('mix-root').innerHTML = emptyBox('bowl', '배합을 시작하세요', '손님 카드에서 새 배합이나 다시 섞기를 눌러요.', '<button type="button" class="btn primary" data-act="mix-new">새 배합</button>'); return; }
    var h = '<div class="row gap no-print" style="margin-bottom:12px"><button type="button" class="icon-btn" data-act="mix-cancel" aria-label="배합 그만두기">‹</button><h2 class="grow">배합</h2>' + printBtn() + '<button type="button" class="btn small" data-act="template-open">예시에서</button></div>';
    h += '<form id="form-mix" novalidate>';
    // 손님
    h += '<div class="card"><label for="mix-client">손님</label><div class="row gap"><select id="mix-client" class="grow">';
    if (!s.clients.length) h += '<option value="">손님을 먼저 더해 주세요</option>';
    s.clients.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'ko'); }).forEach(function (c) {
      h += '<option value="' + esc(c.id) + '"' + (c.id === m.clientId ? ' selected' : '') + '>' + esc(c.name) + '</option>';
    });
    h += '</select><button type="button" class="btn small" data-act="mix-client-new">새 손님</button></div><div class="err" id="mix-client-err"></div><div id="mix-patch"></div>';
    if (m.fromSvc) h += '<p class="muted" id="mix-from"></p>';
    h += '</div>';
    // 시술 종류
    h += '<div class="card"><div class="label" style="margin-top:0">시술</div><div class="chips scroll">';
    D.KINDS.forEach(function (k) { h += '<button type="button" class="chip' + (m.kind === k.id ? ' on' : '') + '" data-act="mix-kind" data-kind="' + k.id + '">' + esc(k.name) + '</button>'; });
    h += '</div><p class="muted">' + esc(kindOf(m.kind).hint) + ' 방치 ' + m.minutes + '분</p>';
    h += '<div class="row gap"><label for="mix-min" class="grow" style="margin:0">방치 시간(분)</label><input id="mix-min" inputmode="numeric" style="width:96px" value="' + esc(m.minutes) + '"></div><div class="err" id="mix-min-err"></div></div>';
    // 바를 양
    h += '<div class="card"><div class="label" style="margin-top:0">바를 양 어림 <small>(숱 보통 기준)</small></div><div class="chips scroll">';
    D.AMOUNTS.forEach(function (a) { h += '<button type="button" class="chip' + (m.preset === a.g ? ' on' : '') + '" data-act="mix-amount" data-g="' + a.g + '">' + esc(a.name) + ' ' + a.g + 'g</button>'; });
    h += '</div><div class="chips" style="margin-top:8px">';
    D.DENSITY.forEach(function (d) { h += '<button type="button" class="chip' + (m.densityK === d.k ? ' on' : '') + '" data-act="mix-density" data-k="' + d.k + '">' + esc(d.name) + '</button>'; });
    h += '</div><label for="mix-total">섞을 약 전체 <small>(g, 염모제 + 산화제)</small></label><input id="mix-total" inputmode="decimal" autocomplete="off" value="' + esc(m.total) + '"><div class="err" id="mix-total-err"></div></div>';
    // 산화제
    h += '<div class="card"><div class="label" style="margin-top:0">산화제 비율 <small>(염모제 1 : 산화제)</small></div><div class="chips">';
    [1, 1.5, 2, 0].forEach(function (r) { h += '<button type="button" class="chip' + (m.ratio === r ? ' on' : '') + '" data-act="mix-ratio" data-r="' + r + '">' + (r === 0 ? '산화제 없음' : L.ratioText(r)) + '</button>'; });
    h += '</div><div class="label">산화제 %</div><div class="chips">';
    [3, 6, 9, 12].forEach(function (d) { h += '<button type="button" class="chip' + (m.dev === d ? ' on' : '') + '" data-act="mix-dev" data-d="' + d + '">' + d + '%</button>'; });
    h += '</div>';
    var devs = s.products.filter(function (p) { return p.kind === 'dev'; });
    if (devs.length) {
      h += '<label for="mix-devprod">산화제 제품</label><select id="mix-devprod"><option value="">기본 g당 값</option>';
      devs.forEach(function (p) { h += '<option value="' + esc(p.id) + '"' + (m.devProductId === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>'; });
      h += '</select>';
    }
    h += '</div>';
    // 색 줄
    var colors = s.products.filter(function (p) { return p.kind === 'color'; });
    h += '<div class="card" id="mix-lines"><div class="card-head"><h3>색 줄 <small>(몫으로 나눔)</small></h3><button type="button" class="btn small" data-act="line-add">색 더하기</button></div>';
    if (!m.lines.length) h += '<div class="empty" style="padding:8px">' + EMPTY_ART.bowl + '<p>색 번호를 하나 이상 넣어 주세요.</p><button type="button" class="btn primary" data-act="line-add">색 번호 고르기</button></div>';
    m.lines.forEach(function (l, i) {
      var info = L.shadeInfo(l.shade);
      h += '<div class="mix-line">' + sw(l.shade) + '<button type="button" class="btn ghost small" style="text-align:left;justify-content:flex-start" data-act="line-shade" data-i="' + i + '" aria-label="색 번호 바꾸기"><b>' + esc(l.shade) + '</b> <small>' + esc(info.known ? info.name : '') + '</small></button>' +
        '<div class="stepper"><button type="button" class="icon-btn" data-act="mix-part" data-i="' + i + '" data-d="-0.5" aria-label="몫 줄이기">−</button><b>' + esc(l.part) + '</b><button type="button" class="icon-btn" data-act="mix-part" data-i="' + i + '" data-d="0.5" aria-label="몫 늘리기">+</button><button type="button" class="icon-btn" data-act="line-del" data-i="' + i + '" aria-label="이 색 빼기">✕</button></div></div>';
      if (colors.length) {
        h += '<select class="line-prod" data-i="' + i + '" aria-label="' + esc(l.shade) + ' 제품"><option value="">기본 g당 값</option>';
        colors.forEach(function (p) { h += '<option value="' + esc(p.id) + '"' + (l.productId === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>'; });
        h += '</select>';
      }
    });
    h += '<div class="err" id="mix-lines-err"></div></div>';
    h += '<div id="mix-out"></div>';
    h += '<button type="submit" class="btn primary full" id="mix-save">저장하고 타이머 시작</button></form>';
    $('mix-root').innerHTML = h;
    renderMixOut();
  }
  var pourSeen = { mix: null, all: false };
  function renderMixOut() {
    var s = S(), v = V(), m = v.mix, box = $('mix-out');
    if (!m || !box) return;
    var r = L.mix(m.total, m.ratio, m.lines);
    var won = L.cost(r, m.lines, m.devProductId, s.products, s.settings);
    var mc = clientOf(m.clientId);
    var h = printHead('계량표' + (mc ? ' — ' + mc.name : ''));
    var ready = m.lines.length > 0 && Number(m.total) > 0;
    // 부을 차례: 색 줄 순서대로, 그다음 산화제. 아직 안 지운 첫 줄이 '지금 부을 줄'
    var order = [];
    if (ready) {
      r.lines.forEach(function (ml, i) { order.push({ key: i, cum: ml.cum }); });
      if (m.ratio > 0) order.push({ key: 'dev', cum: r.cumDev });
    }
    var poured = order.filter(function (o) { return !!m.checks[o.key]; }).length;
    var next = order.filter(function (o) { return !m.checks[o.key]; })[0] || { key: null };
    var allPoured = order.length > 0 && poured === order.length;
    h += '<div class="card">';
    if (ready) {
      h += '<div id="pour-progress" class="pour-progress no-print' + (allPoured ? ' all' : '') + '" aria-live="polite">' +
        (allPoured ? '✓ 다 부었어요' : poured + ' / ' + order.length + '줄 부음 · 다음 저울 <b>' + L.gram(next.cum) + '</b>') + '</div>';
    }
    h += '<div class="card-head"><h3>계량표</h3><span class="muted no-print">부은 줄을 누르세요</span></div>';
    if (!ready) {
      h += '<p class="muted">색 줄과 전체 g 을 넣으면 g 이 나와요.</p>';
    } else {
      h += '<div class="big-line">염모제 ' + L.gram(r.colorG) + (m.ratio > 0 ? ' + 산화제 ' + L.gram(r.devG) : '') + '</div>';
      h += '<div class="sum-bar" aria-hidden="true">';
      r.lines.forEach(function (ml) { h += '<span style="width:' + (r.total ? ml.g / r.total * 100 : 0) + '%;background:' + L.swatch(ml.shade) + '"></span>'; });
      if (m.ratio > 0) h += '<span style="width:' + (r.total ? r.devG / r.total * 100 : 0) + '%;background:var(--line)"></span>';
      h += '</div>';
      r.lines.forEach(function (ml, i) {
        var done = !!m.checks[i];
        var nx = !done && i === next.key;
        h += '<button type="button" class="pour' + (done ? ' done' : '') + (nx ? ' next' : '') + '" data-act="pour" data-i="' + i + '" aria-pressed="' + done + '"' + (nx ? ' aria-current="step"' : '') + '>' + sw(ml.shade) + '<span class="pname">' + esc(ml.shade) + ' <small>' + esc(ml.part) + '몫</small></span><span class="g">' + L.gram(ml.g) + '</span><span class="cum">저울 ' + L.gram(ml.cum) + '</span></button>';
      });
      if (m.ratio > 0) {
        var dd = !!m.checks.dev;
        var dn = !dd && next.key === 'dev';
        h += '<button type="button" class="pour' + (dd ? ' done' : '') + (dn ? ' next' : '') + '" data-act="pour" data-i="dev" aria-pressed="' + dd + '"' + (dn ? ' aria-current="step"' : '') + '><span class="sw" style="background:var(--line)"></span><span class="pname">산화제 ' + esc(m.dev) + '% <small>' + esc(L.ratioText(m.ratio)) + '</small></span><span class="g">' + L.gram(r.devG) + '</span><span class="cum">저울 ' + L.gram(r.cumDev) + '</span></button>';
      }
      h += '<div class="row between" style="margin-top:8px"><span class="muted">이번 약값 어림</span><b>' + L.won(won) + '</b></div>';
    }
    h += '</div>';
    box.innerHTML = h;
    // 마지막 줄을 지운 그 순간에만 한 번 번쩍임
    if (allPoured && !(pourSeen.mix === m && pourSeen.all)) flash($('pour-progress'));
    pourSeen = { mix: m, all: allPoured };
    // 다시 섞기: 지난 배합의 몫은 그대로, 오늘 전체 g 으로 나눈 배율
    var fromEl = $('mix-from'), src = m.fromSvc ? window.App.svcById(m.fromSvc) : null;
    if (fromEl && src) {
      var rs = L.rescale(src, Number(m.total) || 0);
      fromEl.textContent = '지난 배합(' + L.prettyDate(src.date) + ', ' + L.gram(src.total) + ')을 오늘 ' + L.gram(rs.total) + ' 으로 다시 섞는 중 · 배율 ' + rs.k + '배';
    }
    var c = clientOf(m.clientId), pbox = $('mix-patch');
    if (pbox) {
      var ps = c ? L.patchState(c.patch, Date.now()) : null;
      pbox.innerHTML = !c ? '' : !ps.has ? '<span class="tag warnt">패치 테스트 기록 없음 — 시술 48시간 전 (제품 설명서 확인)</span>' :
        !ps.ready ? '<span class="tag warnt">패치 테스트 ' + esc(L.fmtLeft(ps.leftMs)) + ' 남음</span>' : '<span class="tag ok">패치 테스트 48시간 지남</span>' + (ps.old ? '<span class="tag warnt">반년 넘음 — 다시 확인</span>' : '');
    }
    var btn = $('mix-save');
    if (btn) btn.textContent = '저장하고 타이머 시작 (' + m.minutes + '분)';
  }
  function renderShadeSheet() {
    var v = V();
    var h = '<div class="label">단계</div><div class="chips">';
    D.LEVELS.forEach(function (l) { h += '<button type="button" class="chip' + (v.shLevel === l.n ? ' on' : '') + '" data-act="sh-level" data-n="' + l.n + '">' + l.n + '</button>'; });
    h += '</div><div class="label">톤 (점 뒤 숫자)</div><div class="chips">';
    D.TONES.forEach(function (t) { h += '<button type="button" class="chip' + (v.shTone === t.t ? ' on' : '') + '" data-act="sh-tone" data-t="' + t.t + '">.' + t.t + ' ' + esc(t.name) + '</button>'; });
    h += '</div><div class="label">그 밖</div><div class="chips">';
    ['탈색 파우더', '클리어', '보정제 애쉬', '보정제 레드', '보정제 바이올렛'].forEach(function (x) { h += '<button type="button" class="chip" data-act="sh-pick" data-s="' + esc(x) + '">' + esc(x) + '</button>'; });
    h += '</div><div id="sh-desc" class="next-box"></div>';
    $('shade-root').innerHTML = h;
    renderShadeDesc();
  }
  function renderShadeDesc() {
    var el = $('sh-desc'); if (!el) return;
    var t = $('sh-text').value;
    var info = L.shadeInfo(t);
    el.innerHTML = t ? sw(t) + ' <b>' + esc(info.known ? info.name : t) + '</b><br>' + esc(info.desc) + '<br><small>화면 색은 흉내 낸 색이라 실제 발색과 달라요. 톤 번호 뜻은 브랜드마다 다를 수 있어요.</small>' : '단계와 톤을 누르거나 직접 적으세요.';
  }
  function renderTemplates() {
    var h = '';
    D.TEMPLATES.forEach(function (t, i) {
      h += '<button type="button" class="list-row" data-act="template-pick" data-i="' + i + '">' + sw(t.lines[0][0]) +
        '<span class="lr-main"><span class="lr-title">' + esc(t.name) + '</span><span class="lr-sub">' + t.lines.map(function (l) { return esc(l[0]) + ' ' + l[1] + '몫'; }).join(' + ') + ' · ' + esc(L.ratioText(t.ratio)) + ' · ' + t.dev + '% · ' + esc(t.note) + '</span></span></button>';
    });
    $('template-root').innerHTML = h;
  }

  // ---- 타이머 ----
  function renderTimers() {
    var s = S();
    var h = '<div class="row between" style="margin-bottom:12px"><h2>타이머</h2><div class="chips">';
    [5, 10, 20].forEach(function (n) { h += '<button type="button" class="chip" data-act="timer-quick" data-min="' + n + '">+ ' + n + '분 타이머</button>'; });
    h += '</div></div>';
    if (!s.timers.length) {
      h += emptyBox('clock', '돌고 있는 타이머가 없어요', '배합을 저장하면 방치 타이머가 저절로 돌아요. 의자 여러 개를 함께 잴 수 있어요.', '<button type="button" class="btn primary" data-act="mix-new">새 시술 시작</button>');
    }
    s.timers.forEach(function (t) {
      var left = window.App.timerLeft(t);
      var pct = t.dur > 0 ? Math.max(0, Math.min(100, (1 - left / t.dur) * 100)) : 100;
      var cls = left <= 0 ? ' done' : left < 120000 ? ' ending' : '';
      h += '<div class="card timer' + cls + '" id="tc-' + esc(t.id) + '"><div class="card-head"><h3>' + esc(t.label) + '</h3><span class="muted">' + (t.pausedAt ? '멈춤' : left <= 0 ? '끝' : '도는 중') + '</span></div>';
      h += '<div class="big-num" id="tl-' + esc(t.id) + '">' + (left <= 0 ? '끝났어요' : L.fmtClock(left)) + '</div>';
      h += '<div class="ring-bar"><span id="tb-' + esc(t.id) + '" style="width:' + pct.toFixed(1) + '%"></span></div>';
      h += '<div class="row gap wrap" style="margin-top:12px">';
      h += '<button type="button" class="btn small grow" data-act="timer-pause" data-id="' + esc(t.id) + '">' + (t.pausedAt ? '이어서' : '멈춤') + '</button>';
      h += '<button type="button" class="btn small grow" data-act="timer-plus" data-id="' + esc(t.id) + '">+5분</button>';
      h += t.serviceId ? '<button type="button" class="btn small primary grow" data-act="timer-done" data-id="' + esc(t.id) + '">마무리</button>' : '<button type="button" class="btn small grow" data-act="timer-del" data-id="' + esc(t.id) + '">끝내기</button>';
      h += '</div></div>';
    });
    $('timers-root').innerHTML = h;
  }
  function tickTimers() {
    var s = S();
    s.timers.forEach(function (t) {
      var left = window.App.timerLeft(t);
      var el = $('tl-' + t.id), b = $('tb-' + t.id), tt = $('tt-' + t.id);
      if (el) el.textContent = left <= 0 ? '끝났어요' : L.fmtClock(left);
      if (b) b.style.width = (t.dur > 0 ? Math.max(0, Math.min(100, (1 - left / t.dur) * 100)) : 100).toFixed(1) + '%';
      if (tt) tt.textContent = left <= 0 ? '끝' : L.fmtClock(left);
      var card = $('tc-' + t.id);
      if (card) { card.classList.toggle('ending', left > 0 && left < 120000); }
    });
    var badge = $('tab-badge');
    badge.textContent = String(s.timers.length);
    badge.classList.toggle('hidden', !s.timers.length);
  }

  // ---- 마무리 ----
  function renderFinishParts() {
    var v = V(), svc = window.App.svcById(v.finishSvc);
    if (!svc) return;
    var c = clientOf(svc.clientId);
    $('finish-head').textContent = (c ? c.name + ' · ' : '') + kindOf(svc.kind).name + ' · ' + svc.lines.map(function (l) { return l.shade + ' ' + L.gram(l.g); }).join(' + ') + ' · 전체 ' + L.gram(svc.total);
    var h = '';
    D.SCORES.forEach(function (name, i) { h += '<button type="button" class="chip' + (v.finishScore === i + 1 ? ' on' : '') + '" data-act="finish-score" data-n="' + (i + 1) + '" aria-pressed="' + (v.finishScore === i + 1) + '">★' + (i + 1) + ' ' + esc(name) + '</button>'; });
    $('f-score').innerHTML = h;
    h = '';
    D.NOTE_CHIPS.forEach(function (n, i) { h += '<button type="button" class="chip" data-act="finish-chip" data-i="' + i + '">' + esc(n) + '</button>'; });
    $('f-chips').innerHTML = h;
    renderFinishNext();
  }
  function renderFinishNext() {
    var v = V(), svc = window.App.svcById(v.finishSvc), s = S();
    if (!svc) return;
    var root = Number($('f-root').value);
    var nv = L.nextVisit(svc.date, s.settings.growth, root);
    var left = $('f-left').value;
    var w = left === '' ? null : L.waste(svc.total, Number(left), svc.cost);
    $('f-next').innerHTML = (nv ? '다음 방문 권장 <b>' + esc(L.prettyDate(nv.key)) + '</b><br>뿌리 ' + esc(root) + 'cm ÷ 한 달 ' + esc(s.settings.growth) + 'cm × 30.4일 = ' + nv.days + '일 뒤' : '뿌리 길이를 넣으면 다음 방문일이 나와요.') +
      (w ? '<br>남긴 약 ' + w.pct + '% · 약값으로 ' + L.won(w.won) : '');
  }

  // ---- 지난 시술 자세히 ----
  function renderService() {
    var v = V(), x = window.App.svcById(v.serviceId);
    if (!x) { $('service-root').innerHTML = '<p class="muted">시술을 찾지 못했어요.</p>'; return; }
    var c = clientOf(x.clientId);
    var h = '<p><b>' + esc(c ? c.name : '') + '</b> · ' + esc(L.prettyDate(x.date)) + ' · ' + esc(kindOf(x.kind).name) + '</p>';
    h += '<table><thead><tr><th>색</th><th class="num">몫</th><th class="num">g</th></tr></thead><tbody>';
    x.lines.forEach(function (l) { h += '<tr><td>' + sw(l.shade) + ' ' + esc(l.shade) + '</td><td class="num">' + esc(l.part) + '</td><td class="num">' + L.gram(l.g) + '</td></tr>'; });
    if (x.ratio > 0) h += '<tr><td>산화제 ' + esc(x.dev) + '%</td><td class="num">' + esc(L.ratioText(x.ratio)) + '</td><td class="num">' + L.gram(x.devG) + '</td></tr>';
    h += '<tr><th>전체</th><th></th><th class="num">' + L.gram(x.total) + '</th></tr></tbody></table>';
    h += '<p class="muted">약값 ' + L.won(x.cost) + (x.left != null ? ' · 남김 ' + L.gram(x.left) + ' (' + L.waste(x.total, x.left, x.cost).pct + '%)' : '') + (x.score ? ' · ★' + x.score + ' ' + esc(D.SCORES[x.score - 1]) : '') + '</p>';
    if (x.note) h += '<p>' + esc(x.note) + '</p>';
    if (x.nextDate) h += '<p class="muted">다음 방문 권장 ' + esc(L.prettyDate(x.nextDate)) + '</p>';
    h += '<div class="row gap wrap"><button type="button" class="btn primary grow" data-act="mix-again" data-svc="' + esc(x.id) + '">이 배합으로 섞기</button>';
    h += '<button type="button" class="btn grow" data-act="finish-open" data-svc="' + esc(x.id) + '">' + (x.done ? '마무리 고치기' : '마무리') + '</button>';
    h += '<button type="button" class="btn ghost grow" data-act="svc-del" data-svc="' + esc(x.id) + '">지우기</button></div>';
    $('service-root').innerHTML = h;
  }

  // ---- 기록 ----
  function periodRange() {
    var v = V(), today = L.toKey();
    if (v.logPeriod === 'all') return { from: '0000-01-01', to: '9999-12-31', label: '전체' };
    if (v.logPeriod === 'month') {
      var d = L.fromKey(today);
      var first = L.toKey(new Date(d.getFullYear(), d.getMonth() + v.logOffset, 1, 12));
      var fd = L.fromKey(first);
      return { from: first, to: L.monthEnd(first), label: fd.getFullYear() + '년 ' + (fd.getMonth() + 1) + '월' };
    }
    var ws = L.addDays(L.weekStart(today), v.logOffset * 7);
    return { from: ws, to: L.addDays(ws, 6), label: L.shortDate(ws) + ' ~ ' + L.shortDate(L.addDays(ws, 6)) };
  }
  function renderLog() {
    var s = S(), v = V();
    var pr = periodRange();
    var h = printHead('기록 — ' + (v.logPeriod === 'all' ? '전체' : pr.label));
    h += '<div class="row between gap no-print"><div class="chips">';
    [['week', '주'], ['month', '달'], ['all', '전체']].forEach(function (p) { h += '<button type="button" class="chip' + (v.logPeriod === p[0] ? ' on' : '') + '" data-act="log-period" data-p="' + p[0] + '">' + p[1] + '</button>'; });
    h += '</div>' + printBtn() + '</div>';
    if (v.logPeriod !== 'all') h += '<div class="row between no-print" style="margin:12px 0"><button type="button" class="icon-btn" data-act="log-move" data-d="-1" aria-label="앞 기간">‹</button><b>' + esc(pr.label) + '</b><button type="button" class="icon-btn" data-act="log-move" data-d="1" aria-label="다음 기간"' + (v.logOffset >= 0 ? ' disabled' : '') + '>›</button></div>';
    var st = L.stats(s.services, pr.from, pr.to);
    if (!st.count) {
      h += emptyBox('chart', '이 기간 시술이 없어요', '배합을 저장하면 섞은 약·남긴 약·약값이 여기에 쌓여요.', '<button type="button" class="btn primary" data-act="mix-new">새 시술 시작</button>');
      $('log-root').innerHTML = h; return;
    }
    h += '<div class="card soft"><div class="big-line">' + st.count + '번 시술, 약값 ' + L.won(st.cost) + '</div>';
    h += '<div class="muted">' + (st.leftKnown ? '남긴 약 ' + st.wastePct + '% — 약값으로 ' + L.won(st.wasteWon) + ' 버렸어요' : '마무리에서 남은 약을 적으면 버린 약값이 보여요') + '</div></div>';
    h += '<div class="stat-grid">' +
      '<div class="stat"><b>' + st.clientN + '명</b><span>손님</span></div>' +
      '<div class="stat"><b>' + L.gram(st.mixed) + '</b><span>섞은 약</span></div>' +
      '<div class="stat"><b>' + L.gram(st.left) + '</b><span>남긴 약</span></div>' +
      '<div class="stat"><b>' + (st.avgScore ? '★' + st.avgScore : '-') + '</b><span>평균 색 점수</span></div></div>';
    if (v.logPeriod !== 'all') {
      var days = L.daysBetween(pr.from, pr.to) + 1, max = 1, k, i;
      for (i = 0; i < days; i++) { k = L.addDays(pr.from, i); max = Math.max(max, st.days[k] || 0); }
      h += '<div class="card"><h3>날마다 시술</h3><div class="bars">';
      for (i = 0; i < days; i++) {
        k = L.addDays(pr.from, i);
        var n = st.days[k] || 0;
        h += '<div class="b' + (k === L.toKey() ? ' today' : '') + '" title="' + esc(L.prettyDate(k)) + ' ' + n + '건"><i style="height:' + (n / max * 100) + '%"></i><span>' + (days <= 7 || i % 5 === 0 ? L.fromKey(k).getDate() : '') + '</span></div>';
      }
      h += '</div></div>';
    }
    if (st.topShades.length) {
      var mx = st.topShades[0].g || 1;
      h += '<div class="card"><h3>많이 쓴 색</h3>';
      st.topShades.forEach(function (t) { h += '<div class="hbar"><span>' + sw(t.shade) + ' ' + esc(t.shade) + '</span><span class="track"><i style="width:' + (t.g / mx * 100) + '%;background:' + L.swatch(t.shade) + '"></i></span><b>' + L.gram(t.g) + '</b></div>'; });
      h += '</div>';
    }
    var kinds = Object.keys(st.kinds).sort(function (a, b) { return st.kinds[b] - st.kinds[a]; });
    if (kinds.length) {
      var km = st.kinds[kinds[0]];
      h += '<div class="card"><h3>시술 종류</h3>';
      kinds.forEach(function (k2, ki) { h += '<div class="hbar' + (ki >= 5 ? ' print-cut' : '') + '"><span>' + esc(kindOf(k2).name) + '</span><span class="track"><i style="width:' + (st.kinds[k2] / km * 100) + '%"></i></span><b>' + st.kinds[k2] + '번</b></div>'; });
      h += '</div>';
    }
    h += '<div class="card"><h3>시술 목록</h3>';
    var rows = s.services.filter(function (x) { return x.date >= pr.from && x.date <= pr.to; }).sort(function (a, b) { return b.at - a.at; });
    rows.forEach(function (x, i) { h += serviceRow(x, true, i >= PRINT_ROWS); });
    h += printMore(rows.length) + '</div>';
    $('log-root').innerHTML = h;
  }

  // ---- 선반 ----
  function renderShelf() {
    var s = S();
    var h = '<div class="row gap" style="margin-bottom:12px"><button type="button" class="icon-btn" data-act="go" data-to="more" aria-label="더보기로">‹</button><h2 class="grow">선반</h2></div>';
    h += '<div class="card soft"><p>제품마다 한 통 g 과 값을 넣으면 시술마다 약값이 계산되고, 남은 양을 넣으면 시술 저장 때마다 줄어요.</p><p class="muted">제품을 넣지 않은 줄은 기본 g당 값(염모제 ' + L.won(s.settings.colorWon) + ', 산화제 ' + L.won(s.settings.devWon) + ')으로 계산해요.</p>';
    h += '<div class="row gap"><button type="button" class="btn primary grow" data-act="product-new" data-k="color">염모제 더하기</button><button type="button" class="btn grow" data-act="product-new" data-k="dev">산화제 더하기</button></div></div>';
    if (!s.products.length) {
      h += emptyBox('shelf', '선반이 비어 있어요', '자주 쓰는 염모제와 산화제부터 넣어 보세요.', '');
    }
    [['color', '염모제·파우더'], ['dev', '산화제']].forEach(function (g) {
      var list = s.products.filter(function (p) { return p.kind === g[0]; });
      if (!list.length) return;
      h += '<div class="card"><h3>' + g[1] + '</h3>';
      list.forEach(function (p) {
        var low = p.stockG != null && p.stockG < p.packG * 0.25;
        h += '<button type="button" class="list-row" data-act="product-open" data-id="' + esc(p.id) + '">' + (g[0] === 'color' ? sw(p.name.replace(/^.*?(\d{1,2}[.\/]\d{1,2}).*$/, '$1')) : '<span class="sw" style="background:var(--line)"></span>') +
          '<span class="lr-main"><span class="lr-title">' + esc(p.name) + '</span><span class="lr-sub">' + L.gram(p.packG) + ' ' + L.won(p.price) + ' · g당 ' + (Math.round(p.price / p.packG * 10) / 10) + '원</span></span>' +
          '<span class="lr-side">' + (p.stockG == null ? '' : (low ? '⚠ ' : '') + '남음 ' + L.gram(p.stockG)) + '</span></button>';
      });
      h += '</div>';
    });
    $('shelf-root').innerHTML = h;
  }

  // ---- 더보기 ----
  function renderMore() {
    var s = S(), st = s.settings;
    var h = '<h2 style="margin-bottom:12px">더보기</h2>';
    h += '<div class="card"><h3>기본값</h3><form id="form-settings" novalidate>';
    h += numField('set-ratio', '기본 산화제 비율 (1 : ?)', st.ratio) + numField('set-dev', '기본 산화제 %', st.dev) +
      numField('set-growth', '한 달 뿌리 자람 (cm)', st.growth) + numField('set-root', '다시 바를 뿌리 길이 (cm)', st.rootCm) +
      numField('set-cwon', '염모제 기본 g당 값 (원)', st.colorWon) + numField('set-dwon', '산화제 기본 g당 값 (원)', st.devWon);
    h += '<p class="muted small">뿌리 자람은 사람마다 달라요. 손님 머리가 자라는 만큼 고쳐 쓰세요.</p>';
    h += '<button type="submit" class="btn primary full">기본값 저장</button></form></div>';
    h += '<div class="card"><h3>보기·알림</h3>';
    h += toggle('sound', '타이머 끝 소리', st.sound) + toggle('vibrate', '타이머 끝 진동', st.vibrate) + toggle('big', '글자 크게', st.big) + toggle('dark', '어두운 화면', st.dark) + toggle('reduce', '움직임 줄이기', st.reduce);
    h += '</div>';
    h += '<div class="card"><h3>선반 · 데이터</h3><div class="row gap wrap">' +
      '<button type="button" class="btn grow" data-act="go" data-to="shelf">선반 (제품 ' + s.products.length + ')</button>' +
      '<button type="button" class="btn grow" data-act="open-backup">내보내기 · 가져오기</button></div>' +
      '<div class="row gap wrap" style="margin-top:8px"><button type="button" class="btn grow" data-act="sample-add">예시 넣기</button><button type="button" class="btn grow" data-act="sample-remove">예시 빼기</button></div>' +
      '<p class="muted small">기록은 이 기기 브라우저에만 저장돼요. 서버로 보내지 않아요. 브라우저 데이터를 지우면 사라지니 가끔 내보내기 글을 따로 모아 두세요.</p>' +
      '<button type="button" class="btn danger full" data-act="clear-all">전체 지우기</button></div>';
    h += '<div class="card"><h3>계산 점검</h3><p class="muted">배합·약값·다음 방문일 계산이 예시와 같은 값을 내는지 봐요.</p><button type="button" class="btn" data-act="self-test">계산 점검 돌리기</button><div id="test-out"></div></div>';
    h += '<div class="card"><h3>정보</h3><p>Tint Ledger · 미용실 염색 배합 기록</p><p class="muted small">패치 테스트 48시간 안내는 염모제 사용상 주의사항을 따른 것이에요. 패치 테스트·색 번호 뜻·비율·방치 시간은 쓰는 제품 설명서를 먼저 따르세요. 예시 배합과 바를 양은 어림값이에요.</p><p class="muted small">기본 내용 ' + L.countContent() + '개 · 외부 도구·서버 없음</p></div>';
    $('more-root').innerHTML = h;
  }
  function numField(id, label, val) { return '<label for="' + id + '">' + esc(label) + '</label><input id="' + id + '" inputmode="decimal" autocomplete="off" value="' + esc(val) + '"><div class="err" id="' + id + '-err"></div>'; }
  function toggle(key, label, on) { return '<label class="toggle-row" for="tg-' + key + '"><span>' + esc(label) + '</span><input type="checkbox" id="tg-' + key + '" data-set="' + key + '"' + (on ? ' checked' : '') + '></label>'; }
  function renderTests(list) {
    var ok = list.filter(function (x) { return x.ok; }).length;
    $('test-out').innerHTML = '<p><b>' + ok + ' / ' + list.length + ' 맞음</b></p><pre class="test">' + list.map(function (x) { return (x.ok ? '○ ' : '✕ ') + esc(x.name) + ': ' + esc(x.got) + (x.ok ? '' : ' (기대 ' + esc(x.expect) + ')'); }).join('\n') + '</pre>';
  }

  // ---- 방법 ----
  function renderHelp() {
    var h = '<div class="row gap" style="margin-bottom:12px"><button type="button" class="icon-btn" data-act="back" aria-label="뒤로">‹</button><h2 class="grow">방법</h2></div>';
    h += '<div class="card"><h3>쓰는 순서</h3><ol>';
    D.STEPS.forEach(function (t) { h += '<li>' + esc(t) + '</li>'; });
    h += '</ol></div>';
    h += '<div class="card"><h3>계산 방식</h3><p>염모제 = 전체 g ÷ (1 + 산화제 몫). 색 줄마다 = 염모제 × 그 줄의 몫 ÷ 몫 합. 산화제 = 전체 − 염모제.</p><p>저울 누적: 볼을 올리고 영점을 한 번 맞춘 뒤, 줄마다 적힌 "저울" 숫자가 될 때까지 차례로 부어요.</p><p>다시 섞기: 지난 배합의 몫·비율은 그대로 두고 오늘 전체 g 으로 다시 나눠요.</p><p>다음 방문 권장일 = 시술일 + (다시 바를 뿌리 cm ÷ 한 달 자람 cm × 30.4일).</p><p>약값 = 줄마다 g × 그 제품의 g당 값(한 통 값 ÷ 한 통 g), 제품이 없으면 기본 g당 값.</p></div>';
    h += '<div class="card"><h3>색 번호 읽기</h3><p class="muted">점 앞은 밝기 단계, 점 뒤는 톤이에요. 7/43 처럼 두 자리면 앞 톤이 주 톤이에요. 브랜드마다 다를 수 있어요.</p><table><tbody>';
    D.LEVELS.forEach(function (l) { h += '<tr><td>' + sw(String(l.n) + '.0') + ' ' + l.n + '</td><td>' + esc(l.name) + '</td></tr>'; });
    h += '</tbody></table><table style="margin-top:8px"><tbody>';
    D.TONES.forEach(function (t) { h += '<tr><td>.' + t.t + '</td><td>' + esc(t.name) + ' — ' + esc(t.desc) + '</td></tr>'; });
    h += '</tbody></table></div>';
    h += '<div class="card"><h3>안전</h3><p>패치 테스트는 시술 48시간 전에 해요(염모제 사용상 주의사항, 제품 설명서 확인). 손님 카드에 한 때를 남기면 남은 시간을 보여 줘요.</p><p class="muted small">이 앱의 비율·시간·바를 양은 어림값이고, 쓰는 제품 설명서와 디자이너 판단이 먼저예요.</p></div>';
    h += '<div class="card"><h3>개인정보</h3><p>손님 이름·전화번호·배합 기록은 이 기기 브라우저에만 저장돼요. 서버로 보내지 않고, 다른 사람과 나누지 않아요. 이름 대신 별명만 적어도 되고 전화번호는 비워도 돼요.</p></div>';
    h += '<div class="card"><h3>요령 ' + D.TIPS.length + '가지</h3><ul>';
    D.TIPS.forEach(function (t) { h += '<li>' + esc(t) + '</li>'; });
    h += '</ul></div>';
    $('help-root').innerHTML = h;
  }

  return {
    $: $, esc: esc, show: show, openSheet: openSheet, closeSheets: closeSheets, anySheetOpen: anySheetOpen,
    openOverlay: openOverlay, closeOverlay: closeOverlay, overlayOpen: overlayOpen,
    toast: toast, hideToast: hideToast, fieldErr: fieldErr, flash: flash, kindOf: kindOf, clientOf: clientOf,
    servicesOf: servicesOf, renderToday: renderToday, renderClients: renderClients, clientListHtml: clientListHtml,
    renderClient: renderClient, renderMix: renderMix, renderMixOut: renderMixOut, renderShadeSheet: renderShadeSheet,
    renderShadeDesc: renderShadeDesc, renderTemplates: renderTemplates, renderTimers: renderTimers, tickTimers: tickTimers,
    renderFinishParts: renderFinishParts, renderFinishNext: renderFinishNext, renderService: renderService,
    renderLog: renderLog, renderShelf: renderShelf, renderMore: renderMore, renderTests: renderTests, renderHelp: renderHelp,
    dueClients: dueClients
  };
})();
