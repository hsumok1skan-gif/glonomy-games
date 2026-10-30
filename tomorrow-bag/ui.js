/* 내일 가방 — 화면 그리기, 전환, 알림, 쪽 넘기기, 가방 그림 */
var UI = (function () {
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // 보내기 아이콘 — index.html 머리 버튼과 같은 선 SVG
  var SHARE_IC = '<svg class="ic ic-share" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4M7.5 8.5L12 4l4.5 4.5"/><path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" stroke="var(--muted)"/></svg>';

  // ---- 전환: 화면·시트·겹침 창은 모두 이 함수를 거친다 (CSS 의 --dur 0.22초, 움직임 줄이기면 0) ----
  function transit(el, on) {
    if (!el) return;
    if (el.classList.contains('screen')) {
      if (on) {
        el.classList.remove('on');
        void el.offsetWidth; // 애니메이션 다시 걸기
        el.classList.add('on');
      } else el.classList.remove('on');
      return;
    }
    el.setAttribute('aria-hidden', on ? 'false' : 'true');
    if (on) el.classList.add('on'); else el.classList.remove('on');
  }

  function show(name) {
    var all = document.querySelectorAll('.screen');
    for (var i = 0; i < all.length; i++) if (all[i].id !== 'screen-' + name) transit(all[i], false);
    transit($('screen-' + name), true);
    var tabs = document.querySelectorAll('.tab');
    for (var j = 0; j < tabs.length; j++) tabs[j].classList.toggle('on', tabs[j].getAttribute('data-to') === name);
  }

  function openSheet(id) { transit($(id), true); }
  function closeSheet(id) { transit($(id), false); }
  function openSheets() { return document.querySelectorAll('.dim.on'); }
  function isOpen(id) { var el = $(id); return !!el && el.classList.contains('on'); }

  // ---- 알림 ----
  var toastTimer = null;
  function toast(msg, undo) {
    $('toast-msg').textContent = msg;
    $('toast-undo').style.display = undo ? '' : 'none';
    transit($('toast'), true);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { transit($('toast'), false); }, undo ? 5000 : 2200);
  }
  function hideToast() { transit($('toast'), false); }

  // 잘못된 입력: 입력란을 흔들고 이유를 바로 아래에
  function fieldErr(inputId, errId, msg) {
    var el = $(inputId);
    if (el) {
      el.classList.remove('bad');
      void el.offsetWidth;
      el.classList.add('bad');
      el.setAttribute('aria-invalid', 'true');
      try { el.focus(); } catch (e) { /* 포커스 못 해도 된다 */ }
    }
    if (errId) $(errId).textContent = msg;
  }
  function clearErr(inputId, errId) {
    var el = $(inputId);
    if (el) { el.classList.remove('bad'); el.removeAttribute('aria-invalid'); }
    if (errId) $(errId).textContent = '';
  }
  function flash(el) {
    if (!el) return;
    el.classList.remove('done-burst');
    void el.offsetWidth;
    el.classList.add('done-burst');
  }

  // ---- 물건 그림 (data.js ICONS, 사람 그림이 오기 전까지 선 SVG) ----
  function pic(name) {
    var ic = Logic.iconFor(name);
    return '<svg class="pic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + ic.d + '</svg>';
  }

  // ---- 쪽 넘기기: 옆으로 밀거나 아래 점을 누른다. id 마다 하나 ----
  function pagerHTML(id, pages, cur) {
    var n = Math.max(1, pages.length);
    cur = Math.max(0, Math.min(cur || 0, n - 1));
    var h = '<div class="pager" data-pg="' + id + '" data-n="' + n + '"><div class="track" style="transform:translateX(' + (-cur * 100) + '%)">';
    pages.forEach(function (p) { h += '<div class="pg"' + (p.g ? ' data-g="' + p.g + '"' : '') + '>' + p.html + '</div>'; });
    return h + '</div></div>' + dotsHTML(id, n, cur);
  }
  function dotsHTML(id, n, cur) {
    if (n <= 1) return '';
    var h = '<div class="dots" data-dots="' + id + '">';
    if (n <= 7) {
      for (var i = 0; i < n; i++) h += '<button class="dot' + (i === cur ? ' on' : '') + '" type="button" data-act="pg" data-pg="' + id + '" data-n="' + i + '" aria-label="' + (i + 1) + '쪽"></button>';
    } else {
      h += '<button class="icon-btn" type="button" data-act="pg-step" data-pg="' + id + '" data-d="-1" aria-label="앞 쪽">‹</button>' +
        '<span class="pg-count">' + (cur + 1) + ' / ' + n + '</span>' +
        '<button class="icon-btn" type="button" data-act="pg-step" data-pg="' + id + '" data-d="1" aria-label="다음 쪽">›</button>';
    }
    return h + '</div>';
  }
  // n 쪽으로 옮기고 실제로 옮긴 쪽 번호를 돌려준다
  function setPage(id, n) {
    var pager = document.querySelector('.pager[data-pg="' + id + '"]');
    if (!pager) return 0;
    var max = (+pager.getAttribute('data-n') || 1) - 1;
    n = Math.max(0, Math.min(n, max));
    pager.firstChild.style.transform = 'translateX(' + (-n * 100) + '%)';
    var dots = document.querySelector('.dots[data-dots="' + id + '"]');
    if (dots) {
      var ds = dots.querySelectorAll('.dot');
      for (var i = 0; i < ds.length; i++) ds[i].classList.toggle('on', i === n);
      var c = dots.querySelector('.pg-count');
      if (c) c.textContent = (n + 1) + ' / ' + (max + 1);
    }
    var pg = pager.querySelectorAll('.pg')[n];
    var g = pg && pg.getAttribute('data-g');
    var band = document.querySelector('[data-band="' + id + '"]');
    if (band && g) {
      var bs = band.querySelectorAll('.group-title');
      for (var j = 0; j < bs.length; j++) bs[j].classList.toggle('on', bs[j].getAttribute('data-g') === g);
    }
    return n;
  }

  // ---- 가방 그림: 둘레 진행 고리 + 챙긴 만큼 물건이 차오르는 가방 (0 빈 가방 · 1~3 차오름 · 4 다 차서 닫힘) ----
  var RING_R = 100, RING_C = 2 * Math.PI * RING_R;
  var LV_Y = 108, LV_H = 50;
  function stageOf(pr) {
    if (!pr.total || !pr.done) return 0;
    if (pr.done >= pr.total) return 4;
    if (pr.pct < 34) return 1;
    if (pr.pct < 67) return 2;
    return 3;
  }
  function artLabel(pr) { return '가방 그림: ' + pr.total + '개 중 ' + pr.done + '개 챙겼어요'; }
  function bagArt(pr) {
    var st = stageOf(pr);
    var hh = LV_H * pr.pct / 100;
    return '<svg class="bag-art s' + st + '" viewBox="0 0 220 220" role="img" aria-label="' + artLabel(pr) + '">' +
      '<circle class="bgc" cx="110" cy="110" r="' + RING_R + '" fill="none" stroke-width="10"/>' +
      '<circle class="fg" cx="110" cy="110" r="' + RING_R + '" fill="none" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + RING_C.toFixed(1) +
      '" stroke-dashoffset="' + (RING_C * (1 - pr.pct / 100)).toFixed(1) + '" transform="rotate(-90 110 110)"/>' +
      '<path d="M86 84 V70 a24 22 0 0 1 48 0 V84" fill="none" stroke="var(--ink)" stroke-width="7" stroke-linecap="round"/>' +
      '<g class="items">' +
      '<g class="lv lv1"><rect x="72" y="58" width="20" height="40" rx="3" fill="var(--sub)"/><path d="M78 62 h8" stroke="var(--surface)" stroke-width="2"/></g>' +
      '<g class="lv lv2"><rect x="98" y="46" width="9" height="52" rx="2" fill="var(--gold)"/><path d="M98 46 l4.5 -8 4.5 8z" fill="var(--ink)"/><rect x="111" y="60" width="18" height="38" rx="3" fill="var(--violet)"/></g>' +
      '<g class="lv lv3"><rect x="133" y="54" width="16" height="44" rx="6" fill="var(--surface)" stroke="var(--sub)" stroke-width="3"/><rect x="137" y="48" width="8" height="8" rx="2" fill="var(--sub)"/></g>' +
      '</g>' +
      '<rect x="56" y="84" width="108" height="94" rx="24" fill="var(--accent)"/>' +
      '<rect x="72" y="' + LV_Y + '" width="76" height="' + LV_H + '" rx="12" fill="var(--soft)"/>' +
      '<rect class="lvfill" x="72" y="' + (LV_Y + LV_H - hh).toFixed(1) + '" width="76" height="' + hh.toFixed(1) + '" rx="12" fill="var(--sub)"/>' +
      '<path class="flap" d="M56 108 Q56 84 80 84 H140 Q164 84 164 108 V118 H56Z" fill="var(--accent-deep)"/>' +
      '<path class="ok" d="M92 136 l12 12 l24 -24" fill="none" stroke="var(--on-accent)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<g class="spark" fill="var(--gold)"><path d="M40 52 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z"/><path d="M178 40 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z"/><path d="M182 160 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z"/></g>' +
      '</svg>';
  }
  function setArt(art, pr) {
    art.setAttribute('class', 'bag-art s' + stageOf(pr));
    art.setAttribute('aria-label', artLabel(pr));
    var fg = art.querySelector('.fg');
    if (fg) fg.setAttribute('stroke-dashoffset', (RING_C * (1 - pr.pct / 100)).toFixed(1));
    var lv = art.querySelector('.lvfill');
    if (lv) {
      var hh = LV_H * pr.pct / 100;
      lv.setAttribute('y', (LV_Y + LV_H - hh).toFixed(1));
      lv.setAttribute('height', hh.toFixed(1));
    }
  }
  function countText(pr) {
    if (!pr.total) return '아직 챙길 물건이 없어요';
    if (pr.done >= pr.total) return '가방 다 챙겼어요!';
    return pr.total + '개 중 ' + pr.done + '개 챙겼어요';
  }

  var ARTS = {
    bag: '<svg class="art" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="62" r="54" fill="var(--soft)"/><rect x="30" y="38" width="60" height="62" rx="16" fill="var(--accent)"/><path d="M45 38 V31 a15 15 0 0 1 30 0 V38" fill="none" stroke="var(--ink)" stroke-width="5"/><rect x="40" y="64" width="40" height="22" rx="7" fill="var(--surface)"/><circle cx="52" cy="75" r="3" fill="var(--ink)"/><circle cx="68" cy="75" r="3" fill="var(--ink)"/></svg>',
    week: '<svg class="art" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="62" r="54" fill="var(--subsoft)"/><rect x="24" y="30" width="72" height="66" rx="12" fill="var(--surface)" stroke="var(--sub)" stroke-width="4"/><rect x="24" y="30" width="72" height="16" rx="8" fill="var(--sub)"/><g fill="var(--line)"><rect x="32" y="54" width="14" height="10" rx="3"/><rect x="53" y="54" width="14" height="10" rx="3"/><rect x="74" y="54" width="14" height="10" rx="3"/><rect x="32" y="72" width="14" height="10" rx="3"/></g><rect x="53" y="72" width="14" height="10" rx="3" fill="var(--accent)"/></svg>',
    rest: '<svg class="art" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="62" r="54" fill="var(--soft)"/><circle cx="60" cy="56" r="20" fill="var(--gold)"/><path d="M30 92 q30 -18 60 0" fill="none" stroke="var(--sub)" stroke-width="6" stroke-linecap="round"/></svg>',
    pack: '<svg class="art" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="62" r="54" fill="var(--soft)"/><path d="M28 52 h64 l-8 44 h-48 z" fill="var(--gold)"/><rect x="40" y="34" width="12" height="26" rx="3" fill="var(--sub)"/><rect x="56" y="28" width="10" height="32" rx="3" fill="var(--accent)"/><rect x="70" y="38" width="12" height="22" rx="3" fill="var(--violet)"/></svg>'
  };

  function emptyBox(art, title, text, btns) {
    var h = '<div class="card empty">' + (ARTS[art] || '') + '<h3>' + esc(title) + '</h3><p>' + esc(text) + '</p><div class="row wrap" style="justify-content:center">';
    btns.forEach(function (b, i) {
      h += '<button class="btn ' + (i === 0 ? 'main' : '') + '" type="button" data-act="' + b.act + '"' + (b.extra || '') + '>' + esc(b.label) + '</button>';
    });
    return h + '</div></div>';
  }

  // 카드·시트 안의 작은 빈 목록: 그림(이모지) + 한 줄 + 바로 시작 버튼
  function miniEmpty(icon, text, btn) {
    return '<div class="mini-empty"><span class="em" aria-hidden="true">' + icon + '</span><p>' + esc(text) + '</p>' +
      '<button class="btn small main" type="button" data-act="' + btn.act + '"' + (btn.extra || '') + '>' + esc(btn.label) + '</button></div>';
  }

  // ---- 아이 고르기 줄 ----
  function renderKids(S) {
    // 아이가 없으면 줄을 숨긴다(가방 빈 화면 카드의 '시작하기'가 같은 일을 한다)
    var empty = S.kids.length === 0;
    $('kids').classList.toggle('hidden', empty);
    if (empty) { $('kids').innerHTML = ''; return; }
    var h = '';
    S.kids.forEach(function (k) {
      h += '<button class="chip' + (k.id === S.cur ? ' on' : '') + '" type="button" data-act="kid-pick" data-id="' + k.id + '">' + esc(k.name) + (k.sample ? ' (예시)' : '') + '</button>';
    });
    h += '<button class="chip" type="button" data-act="kid-new" aria-label="아이 넣기">+ 아이</button>';
    $('kids').innerHTML = h;
  }

  // ---- 가방 화면: 한 화면에 이름 칩 · 날짜 카드 · 가방 그림 · 수업 한 줄 · 방과후 한 줄 · 버튼 ----
  function dDay(k, todayKey) { return Math.round((Logic.fromKey(k) - Logic.fromKey(todayKey)) / 86400000); }

  // 처음 설정 3단계 카드: 날짜 카드 자리를 대신한다. 셋을 다 끝내면(app.js renderAll 이 setupDone 을 저장) 그리지 않는다
  function setupCard(S, kid, k) {
    if (S.settings.setupDone) return '';
    var st = Logic.setupSteps(S, kid);
    if (!st || st.all) return '';
    var dw = Logic.dow(k);
    var rows = [
      { s: st.steps[0], title: '시간표 칸 5개 채우기 (' + st.steps[0].filled + ' / ' + st.steps[0].total + ')', act: 'go', extra: ' data-to="week"', label: '시간표' },
      { s: st.steps[1], title: '방과후 · 학원 1개 넣기', act: 'after-new', extra: ' data-d="' + (dw >= 1 && dw <= 5 ? dw : 1) + '"', label: '+ 방과후' },
      { s: st.steps[2], title: '알림장 넣거나 한 번 챙기기', act: 'note-new', extra: '', label: '+ 알림장' }
    ];
    var h = '<div class="card setup-steps no-print" id="setup-steps"><div class="row"><b style="flex:1">처음 설정 3단계</b><span class="pill">' + st.n + ' / 3</span></div>';
    rows.forEach(function (r, i) {
      h += '<div class="step' + (r.s.done ? ' done' : '') + '"><span class="st-no" aria-hidden="true">' + (r.s.done ? '✓' : (i + 1)) + '</span>' +
        '<b style="flex:1">' + esc(r.title) + '</b>' +
        (r.s.done ? '<span class="tiny">끝</span>' : '<button class="btn small" type="button" data-act="' + r.act + '"' + r.extra + '>' + esc(r.label) + '</button>') + '</div>';
    });
    return h + '</div>';
  }

  function renderBag(S, V, kid, k, todayKey) {
    var root = $('bag-root');
    if (!kid) {
      root.innerHTML = emptyBox('bag', '내일 가방을 함께 챙겨요', '아이 이름과 학년만 알려 주면 바로 시작해요. 예시로 먼저 둘러봐도 좋아요.', [
        { act: 'kid-new', label: '시작하기' }, { act: 'sample-add', label: '예시로 둘러보기' }]);
      $('print-area').innerHTML = '';
      return;
    }
    var bag = Logic.buildBag(S, kid, k);
    var pr = Logic.progress(S, kid, bag);
    var h = '';

    // 며칠 뒤 준비물: 날짜 카드 위 작은 알약, 누르면 시트
    var up = Logic.upcoming(S, kid, k, 7);
    var top = '';
    if (up.length) {
      top += '<button class="up-pill" type="button" id="bag-upcoming" data-act="upcoming">D-' + dDay(up[0].date, todayKey) + ' ' + esc(up[0].title || '알림장') + ' 준비물' +
        (up.length > 1 ? ' 외 ' + (up.length - 1) : '') + '</button>';
    }
    if (V.offset !== 0) top += '<span class="spacer"></span><button class="chip" type="button" data-act="day-now">↺ 지금 가방</button>';
    if (top) h += '<div class="top-row no-print">' + top + '</div>';

    // 처음 설정 카드가 있으면 날짜 카드 자리를 대신한다
    var setup = setupCard(S, kid, k);
    h += setup || ('<div class="card date-card" data-swipe="day">' +
      '<button class="icon-btn" type="button" data-act="day-prev" aria-label="앞 학교 가는 날">‹</button>' +
      '<div class="mid"><span class="rel">' + Logic.relLabel(k, todayKey) + ' 가방</span><div class="big">' + Logic.label(k) + '</div></div>' +
      '<button class="icon-btn" type="button" data-act="day-next" aria-label="다음 학교 가는 날">›</button></div>');

    if (!bag.school) {
      root.innerHTML = h + emptyBox('rest', '이날은 쉬는 날이에요', '주말이나 쉬는 날로 넣어 둔 날이에요. 다음 학교 가는 날 가방을 볼까요?', [{ act: 'day-next', label: '다음 학교 가는 날' }]);
      $('print-area').innerHTML = '';
      return;
    }

    h += '<div class="bag-stage" id="bag-ring">' + bagArt(pr) + '</div>';
    h += '<p class="bag-count" id="bag-count" aria-live="polite">' + countText(pr) + '</p>';

    // 그날 수업 한 줄 (넘치면 옆으로 밀기)
    h += '<div class="strip" aria-label="수업"><span class="lab">수업</span>';
    var any = false;
    bag.periods.forEach(function (p, i) { if (p) { any = true; h += '<span class="ls">' + (i + 1) + '교시 ' + esc(p) + '</span>'; } });
    if (!any) h += '<button class="chip" type="button" data-act="go" data-to="week">시간표 넣기 ›</button>';
    h += '</div>';

    // 방과후 · 데리러 갈 사람 한 줄
    h += '<div class="strip" aria-label="방과후와 데리러 갈 사람"><span class="lab">방과후</span>';
    if (!bag.pickups.length) h += '<span class="tiny">이날은 방과후가 없어요</span>';
    bag.pickups.forEach(function (p) {
      h += '<span class="pk">' + esc(p.icon) + ' ' + esc(p.time || '') + ' ' + esc(p.name) + (p.who ? ' → <b>' + esc(p.who) + '</b>' : '') + '</span>';
    });
    h += '</div>';

    h += '<div class="bag-btns no-print">' +
      '<button class="btn main big" type="button" data-act="bag-open"' + (bag.items.length ? '' : ' disabled') + '>가방 챙기기</button>' +
      '<button class="btn" type="button" data-act="note-new">+ 알림장</button></div>';
    root.innerHTML = h;
    renderPrint(kid, bag);
  }

  // 인쇄할 때만: 그날 가방을 쪽 이름별 목록으로
  function renderPrint(kid, bag) {
    var h = '<h1>' + esc(Logic.nameI(kid.name)) + ' ' + Logic.dayLabel(bag.date) + ' 가방</h1>';
    PAGE_G.forEach(function (g) {
      var list = bag.items.filter(function (it) { return pageGroup(it.group) === g; });
      if (!list.length) return;
      h += '<h2>' + PAGE_NAME[g] + '</h2><ul>' + list.map(function (it) { return '<li>☐ ' + esc(it.name) + ' — ' + esc(it.sources.join(' · ')) + '</li>'; }).join('') + '</ul>';
    });
    $('print-area').innerHTML = h;
  }

  // ---- 가방 시트: 쪽 이름 띠(알림장 · 수업 · 방과후 · 매일), 한 쪽에 12칸(아이가 챙겨요는 9칸) ----
  var PAGE_G = ['note', 'class', 'after', 'daily'];
  var PAGE_NAME = { note: '알림장', class: '수업', after: '방과후', daily: '매일' };
  function pageGroup(g) { return g === 'rule' ? 'daily' : g; }   // 요일마다 챙길 것은 매일 쪽 맨 앞에

  // 자주 덜 챙긴 물건(최근 30일 2번 이상)은 말없이 그 쪽 맨 앞 칸에 놓기만 한다
  function bagPages(bag, miss, per) {
    var by = {};
    bag.items.forEach(function (it, i) {
      var g = pageGroup(it.group);
      (by[g] || (by[g] = [])).push({ it: it, i: i, first: (miss[Logic.norm(it.name).toLowerCase()] || 0) >= 2 ? 1 : 0 });
    });
    var pages = [];
    PAGE_G.forEach(function (g) {
      var list = by[g];
      if (!list) return;
      list.sort(function (a, b) { return (b.first - a.first) || (a.i - b.i); });
      for (var s = 0; s < list.length; s += per) pages.push({ g: g, rows: list.slice(s, s + per) });
    });
    return pages;
  }
  function cellHTML(it, on) {
    return '<button class="check' + (on ? ' done' : '') + '" type="button" data-act="check" data-name="' + esc(it.name) + '" aria-pressed="' + on + '" aria-label="' + esc(it.name) + '">' +
      '<span class="it-ic">' + pic(it.name) + '</span><span class="nm">' + esc(it.name) + '</span><span class="box" aria-hidden="true">✓</span></button>';
  }
  function groupCounts(bag, done) {
    var cnt = {};
    bag.items.forEach(function (it) {
      var g = pageGroup(it.group);
      var c = cnt[g] || (cnt[g] = { d: 0, t: 0 });
      c.t++;
      if (done.indexOf(it.name) >= 0) c.d++;
    });
    return cnt;
  }
  function renderBagSheet(S, V, kid, bag) {
    var sheet = $('sheet-bag').querySelector('.bag-sheet');
    var done = S.checks[Logic.checkKey(kid.id, bag.date)] || [];
    var pr = Logic.progress(S, kid, bag);
    sheet.classList.toggle('kid', !!V.kidMode);
    sheet.classList.toggle('closed', pr.total > 0 && pr.done >= pr.total);
    $('bs-title').textContent = Logic.nameI(kid.name) + ' ' + Logic.dayLabel(bag.date) + ' 가방';
    var kb = $('kid-mode');
    kb.setAttribute('aria-pressed', String(!!V.kidMode));
    kb.textContent = V.kidMode ? '아이가 챙겨요 ✓' : '아이가 챙겨요';
    var miss = Logic.missCounts(S.history, kid.id, Logic.addDays(bag.date, -30), bag.date);
    var pages = bagPages(bag, miss, V.kidMode ? 9 : 12);
    var cur = Math.max(0, Math.min(V.pg.bag || 0, pages.length - 1));
    var curG = pages[cur] ? pages[cur].g : '';
    var cnt = groupCounts(bag, done);
    var band = '';
    PAGE_G.forEach(function (g) {
      var c = cnt[g];
      if (!c) return;
      var first = 0;
      for (var i = 0; i < pages.length; i++) if (pages[i].g === g) { first = i; break; }
      band += '<button class="group-title g-' + g + (c.d === c.t ? ' all-done' : '') + (g === curG ? ' on' : '') + '" type="button" data-act="pg" data-pg="bag" data-n="' + first + '" data-g="' + g + '">' +
        PAGE_NAME[g] + ' <span class="g-count" aria-label="' + c.t + '개 가운데 ' + c.d + '개 챙김">' + c.d + '/' + c.t + '</span></button>';
    });
    $('bs-band').innerHTML = band;
    var html = pages.map(function (p) {
      return { g: p.g, html: '<div class="grid' + (V.kidMode ? ' c3' : '') + '">' + p.rows.map(function (r) { return cellHTML(r.it, done.indexOf(r.it.name) >= 0); }).join('') + '</div>' };
    });
    if (!html.length) html = [{ g: '', html: miniEmpty('🎒', '이날 챙길 물건이 아직 없어요. 알림장 준비물을 넣어 보세요.', { act: 'note-new', label: '+ 알림장' }) }];
    $('bs-pages').innerHTML = pagerHTML('bag', html, cur);
    V.pg.bag = cur;
    var ca = sheet.querySelector('[data-act="check-all"]');
    if (ca) ca.disabled = !bag.items.length || pr.done >= pr.total;
    var bd = sheet.querySelector('[data-act="bag-done"]');
    if (bd) bd.disabled = !bag.items.length;
    hideBubble();
  }
  function cellByName(name) {
    var all = document.querySelectorAll('#sheet-bag .check');
    for (var i = 0; i < all.length; i++) if (all[i].getAttribute('data-name') === name) return all[i];
    return null;
  }

  // 칸 하나만 바꾸기: 다시 그리지 않고 이미 있는 요소만 고친다
  // (가방 그림 SVG 가 그대로 남아 고리의 stroke-dashoffset·차오름 transition 이 돈다). 못 찾으면 false
  function updateBag(S, kid, bag, name) {
    var pr = Logic.progress(S, kid, bag);
    var art = document.querySelector('#bag-ring .bag-art');
    if (!art) return false;
    setArt(art, pr);
    var cnt = $('bag-count');
    if (cnt) cnt.textContent = countText(pr);
    if (!isOpen('sheet-bag')) return true;
    var btn = cellByName(name);
    var item = bag.items.filter(function (it) { return it.name === name; })[0];
    if (!btn || !item) return false;
    var done = S.checks[Logic.checkKey(kid.id, bag.date)] || [];
    var on = done.indexOf(name) >= 0;
    btn.classList.toggle('done', on);
    btn.setAttribute('aria-pressed', String(on));
    var g = pageGroup(item.group);
    var head = document.querySelector('#bs-band .group-title[data-g="' + g + '"]');
    if (head) {
      var c = groupCounts(bag, done)[g] || { d: 0, t: 0 };
      head.classList.toggle('all-done', c.d === c.t);
      var gc = head.querySelector('.g-count');
      if (gc) { gc.textContent = c.d + '/' + c.t; gc.setAttribute('aria-label', c.t + '개 가운데 ' + c.d + '개 챙김'); }
    }
    var sheet = $('sheet-bag').querySelector('.bag-sheet');
    sheet.classList.toggle('closed', pr.total > 0 && pr.done >= pr.total);
    var ca = sheet.querySelector('[data-act="check-all"]');
    if (ca) ca.disabled = pr.done >= pr.total;
    return true;
  }

  // 칸을 누르면 물건이 통 튀어 가방 입구로 쏙 (0.3초, 아이가 챙겨요는 조금 더 크게 돌며)
  function fly(btn, kidMode) {
    if (!btn || document.body.classList.contains('reduce')) return;
    var src = btn.querySelector('.it-ic'), mouth = $('bag-mouth');
    if (!src || !mouth) return;
    var a = src.getBoundingClientRect(), m = mouth.getBoundingClientRect();
    if (!a.width || !m.width) return;
    var el = document.createElement('div');
    el.className = 'fly';
    el.innerHTML = src.innerHTML;
    el.style.left = a.left + 'px'; el.style.top = a.top + 'px';
    el.style.width = a.width + 'px'; el.style.height = a.height + 'px';
    document.body.appendChild(el);
    function end() { if (el.parentNode) el.parentNode.removeChild(el); }
    var dx = m.left + m.width / 2 - (a.left + a.width / 2), dy = m.top + m.height / 2 - (a.top + a.height / 2);
    var up = kidMode ? 70 : 36;
    if (el.animate) {
      try {
        var an = el.animate([
          { transform: 'translate(0px, 0px) scale(1) rotate(0deg)', opacity: 1 },
          { transform: 'translate(' + (dx * 0.4).toFixed(0) + 'px, ' + (dy * 0.4 - up).toFixed(0) + 'px) scale(' + (kidMode ? 1.3 : 1.12) + ') rotate(' + (kidMode ? 180 : 15) + 'deg)', opacity: 1, offset: 0.4 },
          { transform: 'translate(' + dx.toFixed(0) + 'px, ' + dy.toFixed(0) + 'px) scale(0.25) rotate(' + (kidMode ? 360 : 30) + 'deg)', opacity: 0.3 }
        ], { duration: kidMode ? 420 : 300, easing: 'ease-in' });
        an.onfinish = end;
      } catch (e) { end(); }
    }
    setTimeout(end, 800);
    setTimeout(function () { mouth.classList.remove('gulp'); void mouth.offsetWidth; mouth.classList.add('gulp'); }, kidMode ? 380 : 260);
  }
  function stamp(btn) {
    if (!btn) return;
    btn.classList.remove('pop');
    void btn.offsetWidth;
    btn.classList.add('pop');
  }

  // 길게 누르면: 왜 필요한지 + '내일은 빼기' (아이가 챙겨요일 때는 이유만)
  function showBubble(btn, it, word, kidMode) {
    var b = $('bubble'), sheet = b.parentNode;
    b.innerHTML = '<b>' + esc(it.name) + '</b>' +
      (kidMode ? '' : '<button class="btn small" type="button" data-act="skip-item" data-name="' + esc(it.name) + '">' + word + '은 빼기</button>') +
      '<span class="tiny">' + esc(it.sources.join(' · ')) + '</span>';
    b.hidden = false;
    var sr = sheet.getBoundingClientRect(), r = btn.getBoundingClientRect();
    var top = r.bottom - sr.top + 6;
    if (top + b.offsetHeight > sheet.clientHeight - 8) top = r.top - sr.top - b.offsetHeight - 6;
    b.style.top = Math.max(8, top) + 'px';
  }
  function hideBubble() {
    var b = $('bubble');
    if (!b || b.hidden) return;
    b.hidden = true;
    b.innerHTML = '';
  }
  function bubbleOpen() { var b = $('bubble'); return !!b && !b.hidden; }

  // ---- 칭찬 스티커 ----
  function stickerHTML(k, big) {
    var s = DATA.STICKERS[Logic.stickerFor(k)];
    return '<span class="stk' + (big ? ' big' : '') + '" style="--c:var(' + s.c + ')" role="img" aria-label="' + esc(s.name) + ' 스티커">' +
      '<span aria-hidden="true">' + s.e + '</span>' + (big ? '<span class="sd" aria-hidden="true">' + Logic.shortDay(k) + '</span>' : '') + '</span>';
  }
  function renderDone(S, kid, k) {
    $('done-art').innerHTML = bagArt({ done: 1, total: 1, pct: 100 });
    var s = DATA.STICKERS[Logic.stickerFor(k)];
    $('done-sticker').innerHTML = stickerHTML(k, true) + '<span class="muted">' + Logic.dayLabel(k) + '<br><b>' + esc(s.name) + '</b> 스티커</span>';
    $('done-line').textContent = Logic.shareText(S, kid, Logic.buildBag(S, kid, k));
  }

  // ---- 가방 달력: 다 챙긴 날마다 칭찬 스티커, 덜 챙긴 날은 비워 둔다 ----
  function renderCal(S, kid, ym) {
    var p = ym.split('-'), y = +p[0], m = +p[1];
    $('cal-month').textContent = y + '년 ' + m + '월';
    $('cal-title').textContent = kid ? Logic.nameI(kid.name) + ' 가방 달력' : '가방 달력';
    if (!kid) {
      $('cal-grid').innerHTML = miniEmpty('🧒', '아이를 먼저 알려 주세요. 가방을 다 챙긴 날마다 이 달력에 스티커가 붙어요.', { act: 'cal-kid', label: '시작하기' });
      $('cal-sum').innerHTML = '';
      return;
    }
    var first = new Date(y, m - 1, 1, 12).getDay(), days = new Date(y, m, 0, 12).getDate();
    var full = {};
    S.history.forEach(function (h) { if (h.kid === kid.id && h.date.slice(0, 7) === ym && h.total > 0 && h.done === h.total) full[h.date] = true; });
    var h = '';
    DATA.DOW.forEach(function (d) { h += '<span class="cal-h">' + d + '</span>'; });
    for (var i = 0; i < first; i++) h += '<span class="cal-d empty"></span>';
    for (var d = 1; d <= days; d++) {
      var k = ym + '-' + (d < 10 ? '0' : '') + d;
      h += '<span class="cal-d' + (full[k] ? ' got' : '') + '"><span class="cn">' + d + '</span>' + (full[k] ? stickerHTML(k) : '') + '</span>';
    }
    $('cal-grid').innerHTML = h;
    var n = Logic.monthStickers(S.history, kid.id, ym);
    $('cal-sum').innerHTML = n ? '<p>이 달 칭찬 스티커 ' + n + '장이 모였어요</p>' :
      miniEmpty('🎒', '가방을 다 챙기면 이 달력에 칭찬 스티커가 붙어요.', { act: 'cal-bag', label: '가방 챙기기' });
  }

  // ---- 며칠 뒤 준비물 시트 ----
  function renderUpcoming(S, kid, k, todayKey) {
    var list = Logic.upcoming(S, kid, k, 7).slice(0, 6);
    var h = '';
    list.forEach(function (n) {
      h += '<div class="up-row"><span class="pill soon">D-' + dDay(n.date, todayKey) + '</span>' +
        '<span class="tx"><b>' + Logic.shortLabel(n.date) + '</b> ' + esc(n.title || '알림장') + '<span class="tiny">' + esc(n.items.join(', ')) + '</span></span>' +
        '<button class="btn small" type="button" data-act="note-edit" data-id="' + n.id + '">고치기</button></div>';
    });
    if (!list.length) h = miniEmpty('📅', '일주일 안에 미리 챙길 준비물이 없어요. 알림장에 적힌 준비물을 넣어 보세요.', { act: 'note-new', label: '+ 알림장' });
    $('up-list').innerHTML = h;
  }

  // ---- 시간표: 월~금 × 교시 격자 하나 ----
  function renderWeek(S, V, kid, todayKey) {
    var root = $('week-root');
    if (!kid) {
      root.innerHTML = '<h1>시간표</h1>' + emptyBox('week', '아이를 먼저 알려 주세요', '아이마다 시간표가 따로 있어요.', [{ act: 'kid-new', label: '시작하기' }]);
      return;
    }
    var tw = Logic.dow(todayKey);
    var h = '<div class="row head-row"><h1>' + esc(Logic.nameI(kid.name)) + ' 시간표</h1><div class="seg" role="group" aria-label="교시 수">';
    [4, 5, 6, 7].forEach(function (n) {
      h += '<button class="chip' + (kid.periods === n ? ' on' : '') + '" type="button" data-act="set-periods" data-v="' + n + '" aria-pressed="' + (kid.periods === n) + '" aria-label="' + n + '교시까지">' + n + '</button>';
    });
    h += '</div></div>';
    h += '<p class="tiny">칸을 누르면 과목을, 요일을 누르면 방과후를 넣어요. 오른쪽 숫자는 교시 수예요.</p>';
    h += '<div class="week" style="grid-template-rows:minmax(44px,auto) repeat(' + kid.periods + ', minmax(0,1fr))"><div></div>';
    for (var d = 1; d <= 5; d++) {
      var na = kid.week[d].after.length;
      h += '<button class="hd' + (d === tw ? ' today' : '') + '" type="button" data-act="day-open" data-d="' + d + '" aria-label="' + DATA.DOW[d] + '요일 방과후 ' + na + '개">' +
        DATA.DOW[d] + '<span class="tiny">' + (na ? '방과후 ' + na : '방과후 +') + '</span></button>';
    }
    for (var i = 0; i < kid.periods; i++) {
      h += '<div class="pn">' + (i + 1) + '</div>';
      for (var e = 1; e <= 5; e++) {
        var pk = kid.week[e].p[i] ? Logic.findPack(S.packs, kid.week[e].p[i]) : null;
        h += '<button class="cell' + (pk ? ' full' : '') + '" type="button" data-act="cell" data-d="' + e + '" data-i="' + i + '" id="cell-' + e + '-' + i + '" aria-label="' +
          DATA.DOW[e] + '요일 ' + (i + 1) + '교시 ' + (pk ? esc(pk.name) : '빈 칸') + '">' +
          (pk ? '<span class="ic" aria-hidden="true">' + esc(pk.icon) + '</span>' + esc(pk.name) : '+') + '</button>';
      }
    }
    h += '</div>';
    root.innerHTML = h;
  }

  // 요일 방과후 시트
  function renderDay(S, kid, d) {
    $('day-title').textContent = DATA.DOW[d] + '요일 방과후';
    var af = kid.week[d].after.slice().sort(function (a, b) { return (a.time || '').localeCompare(b.time || ''); });
    var h = '';
    af.slice(0, 6).forEach(function (a) {
      var p = Logic.findPack(S.packs, a.packId);
      h += '<div class="after-row"><span aria-hidden="true">' + esc(p ? p.icon : '❔') + '</span><span style="flex:1;min-width:0"><b>' + esc(a.time || '') + '</b> ' + esc(p ? p.name : '지운 꾸러미') +
        '<br><span class="tiny">데리러 갈 사람: ' + esc(a.who || '정하지 않음') + '</span></span>' +
        '<button class="btn small" type="button" data-act="after-edit" data-d="' + d + '" data-id="' + a.id + '">고치기</button></div>';
    });
    if (!af.length) h += miniEmpty('🏫', '이 요일은 방과후가 없어요. 학원·돌봄이 있으면 넣어 주세요.', { act: 'after-new', label: '+ 방과후 넣기', extra: ' data-d="' + d + '"' });
    else if (af.length < 6) h += '<button class="btn main wide" type="button" data-act="after-new" data-d="' + d + '" style="margin-top:12px">+ 방과후 넣기</button>';
    $('day-list').innerHTML = h;
  }

  // 과목 고르기 시트: 과목 그림 격자 (한 쪽 16칸)
  function renderCellSheet(S, V, kid) {
    var c = V.cell;
    $('cell-title').textContent = DATA.DOW[c.d] + '요일 ' + (c.i + 1) + '교시';
    var cur = kid.week[c.d].p[c.i];
    var list = S.packs.filter(function (p) { return p.kind === 'subj'; });
    var pages = [];
    for (var s = 0; s < list.length; s += 16) {
      pages.push({ html: '<div class="grid r4">' + list.slice(s, s + 16).map(function (p) {
        return '<button class="pick' + (p.id === cur ? ' on' : '') + '" type="button" data-act="cell-set" data-id="' + p.id + '"><span class="em" aria-hidden="true">' + esc(p.icon) + '</span>' + esc(p.name) + '</button>';
      }).join('') + '</div>' });
    }
    $('cell-picks').innerHTML = pages.length ? pagerHTML('cellp', pages, 0) :
      miniEmpty('📚', '고를 과목 꾸러미가 없어요. 꾸러미를 먼저 만들어 주세요.', { act: 'pack-new', label: '+ 새 꾸러미' });
    $('cell-copy-row').innerHTML = '';
  }

  function renderCopyRow(d) {
    var h = '';
    for (var w = 1; w <= 5; w++) if (w !== d) h += '<button class="chip" type="button" data-act="cell-copy-to" data-d="' + w + '">' + DATA.DOW[d] + ' → ' + DATA.DOW[w] + '</button>';
    $('cell-copy-row').innerHTML = h;
  }

  // ---- 꾸러미: 그림 카드 격자 (한 쪽 9개), 옆으로 넘긴다 ----
  function renderPacks(S, V) {
    var h = '<div class="row head-row"><h1>꾸러미</h1><button class="btn small main" type="button" data-act="pack-new">+ 새 꾸러미</button></div>' +
      '<div class="row"><button class="btn small" type="button" data-act="daily-open">매일 · 요일</button><button class="btn small" type="button" data-act="event-new">행사 꾸러미</button></div>';
    var list = S.packs.filter(function (p) { return p.kind === 'subj'; }).concat(S.packs.filter(function (p) { return p.kind !== 'subj'; }));
    if (!list.length) {
      h += emptyBox('pack', '꾸러미가 없어요', '새 꾸러미를 만들어 늘 챙기는 물건을 넣어 두세요.', [{ act: 'pack-new', label: '+ 새 꾸러미' }]);
    } else {
      var pages = [];
      for (var s = 0; s < list.length; s += 9) {
        pages.push({ html: '<div class="grid c3">' + list.slice(s, s + 9).map(function (p) {
          return '<button class="pcard' + (p.kind === 'acad' ? ' acad' : '') + '" type="button" data-act="pack-edit" data-id="' + p.id + '"><span class="em" aria-hidden="true">' + esc(p.icon) + '</span>' +
            '<span class="nm">' + esc(p.name) + '</span><span class="tiny">' + (p.kind === 'acad' ? '방과후' : '수업') + ' · ' + p.items.length + '개</span></button>';
        }).join('') + '</div>' });
      }
      h += pagerHTML('packs', pages, V.pg.packs || 0);
    }
    $('packs-root').innerHTML = h;
  }

  // 꾸러미 시트 안 물건 격자 (그림 + 이름, 누르면 빼기)
  function renderPackItems(items, cur) {
    var pages = [];
    for (var s = 0; s < items.length; s += 12) {
      pages.push({ html: '<div class="grid">' + items.slice(s, s + 12).map(function (x, j) {
        return '<button class="check" type="button" data-act="pack-item-del" data-i="' + (s + j) + '" aria-label="' + esc(x) + ' 빼기"><span class="it-ic">' + pic(x) + '</span><span class="nm">' + esc(x) + '</span><span class="x" aria-hidden="true">✕</span></button>';
      }).join('') + '</div>' });
    }
    $('pack-items').innerHTML = pages.length ? pagerHTML('pitems', pages, cur || 0) :
      miniEmpty('✏️', '아직 물건이 없어요. 이 꾸러미에 늘 챙기는 물건을 넣어 주세요.', { act: 'focus', label: '물건 넣기', extra: ' data-target="pack-add"' });
  }

  // 매일 · 요일 시트
  function renderDaily(S) {
    var h = '';
    S.daily.forEach(function (x, i) {
      h += '<button class="chip" type="button" data-act="daily-del" data-i="' + i + '" aria-label="' + esc(x) + ' 빼기">' + esc(x) + ' ✕</button>';
    });
    if (!S.daily.length) h = miniEmpty('🧴', '매일 챙길 것이 비어 있어요. 기본 다섯 가지를 넣거나 아래에 직접 넣어 주세요.', { act: 'daily-default', label: '기본 넣기' });
    $('daily-chips').innerHTML = h;
    var r = '';
    if (!S.rules.length) r = miniEmpty('📅', '요일마다 챙길 것이 없어요. 실내화 주머니 같은 기본 규칙을 넣어 보세요.', { act: 'rules-default', label: '기본 규칙 넣기' });
    S.rules.forEach(function (x) {
      r += '<div class="toggle"><span>' + DATA.DOW[x.dow] + '요일 · ' + esc(x.item) + '</span><button class="btn small' + (x.on ? ' main' : '') + '" type="button" data-act="rule-toggle" data-id="' + x.id + '" aria-pressed="' + x.on + '">' + (x.on ? '켜짐' : '꺼짐') + '</button></div>';
    });
    $('rules-list').innerHTML = r;
  }

  // 알림장 시트
  function renderNoteItems(items) {
    var h = '';
    items.forEach(function (x, i) {
      h += '<button class="chip pick" type="button" data-act="note-item-del" data-i="' + i + '" aria-label="' + esc(x) + ' 빼기">' + esc(x) + ' ✕</button>';
    });
    $('note-items').innerHTML = h;
  }
  // 준비물 고르기: 찾기 · 갈래 거르기 · 순서, 한 쪽 9개
  function renderSupplies(S, V, picked) {
    var cats = [['all', '모두']].concat(DATA.SUPPLIES.map(function (g) { return [g.cat, g.cat]; }));
    $('note-cats').innerHTML = cats.map(function (c) {
      return '<button class="chip' + (V.noteCat === c[0] ? ' on' : '') + '" type="button" data-act="note-cat" data-v="' + esc(c[0]) + '" aria-pressed="' + (V.noteCat === c[0]) + '">' + esc(c[1]) + '</button>';
    }).join('');
    var list = Logic.findSupplies(V.noteQ, V.noteCat, V.noteSort, Logic.supplyUsage(S));
    var pages = [];
    for (var s = 0; s < list.length; s += 9) {
      pages.push({ html: '<div class="grid c3">' + list.slice(s, s + 9).map(function (x) {
        var on = picked.indexOf(x) >= 0;
        return '<button class="chip' + (on ? ' pick' : '') + '" type="button" data-act="note-supply" data-name="' + esc(x) + '" aria-pressed="' + on + '">' + esc(x) + '</button>';
      }).join('') + '</div>' });
    }
    $('note-supplies').innerHTML = pages.length ? pagerHTML('sup', pages, V.pg.sup || 0) :
      miniEmpty('🔍', '‘' + V.noteQ + '’에 맞는 준비물이 없어요. 위 칸에 직접 써서 넣어도 돼요.', { act: 'note-q-clear', label: '찾기 지우기' });
  }

  function renderEvents(sel) {
    var h = '';
    DATA.EVENTS.forEach(function (e) {
      h += '<button class="pick' + (e.id === sel ? ' on' : '') + '" type="button" data-act="event-pick" data-id="' + e.id + '"><span class="em" aria-hidden="true">' + esc(e.icon) + '</span>' + esc(e.name) + '</button>';
    });
    $('event-list').innerHTML = h;
    var ev = DATA.EVENTS.filter(function (e) { return e.id === sel; })[0];
    $('event-items').textContent = ev ? '들어갈 것: ' + ev.items.join(', ') : '행사를 골라 주세요.';
  }

  // ---- 더보기: 칸 격자 한 화면 ----
  function tile(act, ic, nm, sub, extra, cls) {
    return '<button class="tile' + (cls ? ' ' + cls : '') + '" type="button" data-act="' + act + '"' + (extra || '') + '><span class="t-ic" aria-hidden="true">' + ic + '</span><span class="t-nm">' + esc(nm) + '</span>' +
      (sub ? '<span class="t-sub">' + esc(sub) + '</span>' : '') + '</button>';
  }
  var FONT_NAME = { 1: '보통', 1.15: '크게', 1.3: '아주 크게' };
  function renderMore(S, kid) {
    var st = S.settings;
    var ym = Logic.toKey(new Date()).slice(0, 7);
    var hasSample = S.kids.some(function (k) { return k.sample; });
    var h = '<h1>더보기</h1><div class="tiles">' +
      tile('kids-open', '🧒', '아이', S.kids.length + '명') +
      tile('guard-open', '🙋', '데리러 갈 사람', st.guardians.length + '명') +
      tile('days-open', '🏖️', '쉬는 날', st.holidays.length + '일') +
      tile('cal-open', '📅', '가방 달력', kid ? '스티커 ' + Logic.monthStickers(S.history, kid.id, ym) : '') +
      tile('font', '🔠', '글자 크기', FONT_NAME[st.font] || '보통') +
      tile('toggle-set', st.dark ? '🌙' : '☀️', '화면 색', st.dark ? '어둡게' : '밝게', ' data-k="dark" aria-pressed="' + !!st.dark + '"', st.dark ? 'on' : '') +
      tile('toggle-set', '🐢', '움직임 줄이기', st.reduce ? '켜짐' : '꺼짐', ' data-k="reduce" aria-pressed="' + !!st.reduce + '"', st.reduce ? 'on' : '') +
      tile('toggle-set', st.mute ? '🔕' : '🔔', '소리', st.mute ? '꺼짐' : '켜짐', ' data-k="mute" aria-pressed="' + !st.mute + '"', st.mute ? '' : 'on') +
      // 선생님 모드는 부모가 쓰는 화면에 섞이지 않게 여기서 켤 때만 링크 칸이 보인다
      tile('toggle-set', '🧑‍🏫', '선생님 모드', st.teacher ? '켜짐' : '꺼짐', ' data-k="teacher" aria-pressed="' + !!st.teacher + '"', st.teacher ? 'on' : '') +
      (st.teacher ? tile('teacher-open', '🔗', '반 준비물 링크', 'QR코드') : '') +
      tile('export-open', '📤', '내보내기', '글 복사') +
      tile('backup', '📥', '가져오기', '붙여 넣기') +
      (hasSample ? tile('sample-del', '🧸', '예시 빼기', '') : tile('sample-add', '🧸', '예시 넣기', '둘러보기')) +
      tile('print', '🖨️', '인쇄', '그날 가방') +
      tile('selftest-open', '✅', '계산 점검', '') +
      tile('help', '❓', '도움말', '') +
      tile('clear-all', '🗑️', '전체 지우기', '', '', 'danger') +
      '</div><p class="tiny">넣은 내용은 이 기기 브라우저에만 저장돼요. 서버로 보내지 않아요.</p>';
    $('more-root').innerHTML = h;
  }

  function renderKidsSheet(S) {
    var h = '';
    S.kids.forEach(function (k) {
      h += '<div class="toggle"><span>' + esc(k.name) + (k.sample ? ' (예시)' : '') + ' · ' + k.grade + '학년</span><button class="btn small" type="button" data-act="kid-edit" data-id="' + k.id + '">고치기</button></div>';
    });
    if (!S.kids.length) h = miniEmpty('🧒', '아직 아이가 없어요. 이름과 학년만 알려 주면 시작해요.', { act: 'kid-new', label: '시작하기' });
    $('kids-list').innerHTML = h;
  }
  function renderGuards(S) {
    var h = '';
    S.settings.guardians.forEach(function (g, i) {
      h += '<button class="chip" type="button" data-act="guard-del" data-i="' + i + '" aria-label="' + esc(g) + ' 빼기">' + esc(g) + ' ✕</button>';
    });
    if (!S.settings.guardians.length) h = miniEmpty('🙋', '데리러 갈 사람이 없어요. 엄마·아빠·할머니처럼 넣어 두면 방과후마다 고를 수 있어요.', { act: 'focus', label: '사람 넣기', extra: ' data-target="guard-add"' });
    $('guard-chips').innerHTML = h;
  }
  function renderDays(S, todayKey) {
    var st = S.settings, sel = $('set-hour'), o = '';
    for (var hr = 9; hr <= 20; hr++) o += '<option value="' + hr + '"' + (hr === st.switchHour ? ' selected' : '') + '>' + (hr < 12 ? '오전 ' + hr : '오후 ' + (hr === 12 ? 12 : hr - 12)) + '시</option>';
    sel.innerHTML = o;
    var list = st.holidays.slice().sort().filter(function (d) { return d >= todayKey; });
    var past = st.holidays.length - list.length;
    var h = '';
    list.slice(0, 12).forEach(function (d) {
      h += '<button class="chip" type="button" data-act="holiday-del" data-date="' + d + '" aria-label="' + Logic.shortLabel(d) + ' 빼기">' + Logic.shortLabel(d) + ' ✕</button>';
    });
    if (list.length > 12) h += '<span class="tiny">그 뒤 ' + (list.length - 12) + '일 더 있어요</span>';
    if (past) h += '<span class="tiny">지난 쉬는 날 ' + past + '일은 감췄어요</span>';
    if (!st.holidays.length) h = miniEmpty('🏖️', '넣은 쉬는 날이 없어요. 주말은 저절로 건너뛰니 재량휴업일만 넣어 주세요.', { act: 'focus', label: '쉬는 날 고르기', extra: ' data-target="holiday-add"' });
    $('holiday-chips').innerHTML = h;
  }

  // ---- 선생님 모드 ----
  function renderTeachItems(items) {
    var h = '';
    items.forEach(function (x, i) {
      h += '<button class="chip pick" type="button" data-act="teach-item-del" data-i="' + i + '" aria-label="' + esc(x) + ' 빼기">' + esc(x) + ' ✕</button>';
    });
    $('teach-items').innerHTML = h;
  }
  // o 가 없으면 만든 링크를 치우고 입력 칸을 다시 보인다 (내용이 바뀌면 옛 링크가 남지 않게)
  function renderTeachOut(o) {
    var el = $('teach-out');
    $('form-teacher').classList.toggle('has-out', !!o);
    if (!o) { el.innerHTML = ''; return; }
    var h = '<div class="teach-card">' +
      '<h3>' + esc(o.cls) + ' · ' + Logic.dayLabel(o.d) + ' 준비물 ' + o.n + '개</h3>' +
      '<div class="qr-box">' + o.qr + '</div>' +
      '<label class="f" for="teach-link">링크 (부모님이 열면 가방에 들어가요)</label>' +
      '<textarea id="teach-link" class="teach-link" readonly>' + esc(o.link) + '</textarea>' +
      '<div class="row wrap" style="margin-top:8px">' +
      '<button class="btn main" type="button" data-act="teach-share" style="flex:1 1 100%">' + SHARE_IC + '공유하기</button>' +
      '<button class="btn" type="button" data-act="teach-copy">링크 복사</button>' +
      '<button class="btn" type="button" data-act="teach-edit">내용 고치기</button></div>';
    if (o.local) h += '<p class="tiny">지금은 이 기기의 파일로 열려 있어 다른 기기에서는 이 링크가 열리지 않아요. 웹 주소로 열고 만들면 어디서나 열려요.</p>';
    el.innerHTML = h + '</div>';
    flash(el.firstChild);
  }

  // ---- 도움말 한 줄: 한 쪽에 하나씩 ----
  function renderHelp(V) {
    var pages = DATA.TIPS.map(function (t) { return { html: '<div class="tip">' + esc(t) + '</div>' }; });
    $('help-tips').innerHTML = pagerHTML('tips', pages, V.pg.tips || 0);
  }
  // 계산 점검 결과: 한 쪽에 10줄
  function renderSelfTest(res) {
    var ok = res.filter(function (r) { return r.ok; }).length;
    var pages = [];
    for (var s = 0; s < res.length; s += 10) {
      pages.push({ html: res.slice(s, s + 10).map(function (r) {
        return '<div class="st-line' + (r.ok ? '' : ' bad-line') + '">' + (r.ok ? '✓ ' : '✗ ') + esc(r.name) + ' = ' + esc(r.got) + (r.ok ? '' : ' (기대 ' + esc(r.want) + ')') + '</div>';
      }).join('') });
    }
    $('selftest-out').innerHTML = '<b>' + ok + ' / ' + res.length + ' 맞아요</b>' + pagerHTML('st', pages, 0);
  }

  return {
    $: $, esc: esc, transit: transit, show: show, openSheet: openSheet, closeSheet: closeSheet, openSheets: openSheets, isOpen: isOpen,
    toast: toast, hideToast: hideToast, fieldErr: fieldErr, clearErr: clearErr, flash: flash,
    setPage: setPage, renderKids: renderKids, renderBag: renderBag, renderBagSheet: renderBagSheet, updateBag: updateBag, cellByName: cellByName,
    fly: fly, stamp: stamp, showBubble: showBubble, hideBubble: hideBubble, bubbleOpen: bubbleOpen, renderDone: renderDone, renderCal: renderCal, renderUpcoming: renderUpcoming,
    renderWeek: renderWeek, renderDay: renderDay, renderCellSheet: renderCellSheet, renderCopyRow: renderCopyRow,
    renderPacks: renderPacks, renderPackItems: renderPackItems, renderDaily: renderDaily, renderNoteItems: renderNoteItems, renderSupplies: renderSupplies,
    renderEvents: renderEvents, renderMore: renderMore, renderKidsSheet: renderKidsSheet, renderGuards: renderGuards, renderDays: renderDays,
    renderTeachItems: renderTeachItems, renderTeachOut: renderTeachOut, renderHelp: renderHelp, renderSelfTest: renderSelfTest
  };
})();
