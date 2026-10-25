/* Tomorrow Bag — 화면 그리기, 전환, 알림 */
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
    window.scrollTo(0, 0);
  }

  function openSheet(id) { transit($(id), true); }
  function closeSheet(id) { transit($(id), false); }
  function openSheets() { return document.querySelectorAll('.dim.on'); }

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

  // ---- 그림 ----
  function ring(pct) {
    var r = 34, c = 2 * Math.PI * r;
    var off = c * (1 - pct / 100);
    return '<svg class="ring" viewBox="0 0 84 84" aria-hidden="true">' +
      '<circle class="bgc" cx="42" cy="42" r="' + r + '" fill="none" stroke-width="9"/>' +
      '<circle class="fg" cx="42" cy="42" r="' + r + '" fill="none" stroke-width="9" stroke-linecap="round" ' +
      'stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 42 42)"/>' +
      '<text x="42" y="49" text-anchor="middle">' + pct + '%</text></svg>';
  }

  var ARTS = {
    bag: '<svg class="art" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="62" r="54" fill="var(--soft)"/><rect x="30" y="38" width="60" height="62" rx="16" fill="var(--accent)"/><path d="M45 38 V31 a15 15 0 0 1 30 0 V38" fill="none" stroke="var(--ink)" stroke-width="5"/><rect x="40" y="64" width="40" height="22" rx="7" fill="var(--surface)"/><circle cx="52" cy="75" r="3" fill="var(--ink)"/><circle cx="68" cy="75" r="3" fill="var(--ink)"/></svg>',
    week: '<svg class="art" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="62" r="54" fill="var(--subsoft)"/><rect x="24" y="30" width="72" height="66" rx="12" fill="var(--surface)" stroke="var(--sub)" stroke-width="4"/><rect x="24" y="30" width="72" height="16" rx="8" fill="var(--sub)"/><g fill="var(--line)"><rect x="32" y="54" width="14" height="10" rx="3"/><rect x="53" y="54" width="14" height="10" rx="3"/><rect x="74" y="54" width="14" height="10" rx="3"/><rect x="32" y="72" width="14" height="10" rx="3"/></g><rect x="53" y="72" width="14" height="10" rx="3" fill="var(--accent)"/></svg>',
    log: '<svg class="art" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="62" r="54" fill="var(--subsoft)"/><rect x="30" y="70" width="12" height="24" rx="4" fill="var(--sub)"/><rect x="48" y="52" width="12" height="42" rx="4" fill="var(--sub)"/><rect x="66" y="62" width="12" height="32" rx="4" fill="var(--line)"/><rect x="84" y="40" width="12" height="54" rx="4" fill="var(--accent)"/></svg>',
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
    var h = '';
    S.kids.forEach(function (k) {
      h += '<button class="chip' + (k.id === S.cur ? ' on' : '') + '" type="button" data-act="kid-pick" data-id="' + k.id + '">' + esc(k.name) + ' · ' + k.grade + '학년</button>';
    });
    h += '<button class="chip" type="button" data-act="kid-new" aria-label="아이 넣기">+ 아이</button>';
    $('kids').innerHTML = h;
  }

  // ---- 가방 ----
  // 며칠 뒤 준비물 카드: 가방 날짜 다음 날부터 7일 안의 알림장, 없으면 빈 글
  function upcomingCard(S, kid, k, todayKey) {
    var list = Logic.upcoming(S, kid, k, 7);
    if (!list.length) return '';
    var h = '<div class="card" id="bag-upcoming"><div class="muted" style="font-weight:800">며칠 뒤 준비물 · 미리 사 둘 것</div>';
    list.forEach(function (n) {
      var diff = Math.round((Logic.fromKey(n.date) - Logic.fromKey(todayKey)) / 86400000);
      h += '<div class="row" style="margin-top:6px"><span class="pill miss">D-' + diff + '</span>' +
        '<span style="flex:1"><b>' + Logic.shortLabel(n.date) + '</b> ' + esc(n.title || '알림장') + '<br><span class="tiny">' + esc(n.items.join(', ')) + '</span></span>' +
        '<button class="btn small" type="button" data-act="note-edit" data-id="' + n.id + '">고치기</button></div>';
    });
    return h + '</div>';
  }

  function renderBag(S, V, kid, k, todayKey) {
    var root = $('bag-root');
    if (!kid) {
      root.innerHTML = '<h1>내일 가방</h1>' + emptyBox('bag', '아직 아이가 없어요', '아이 이름과 학년을 넣으면 시간표를 만들 수 있어요. 예시로 먼저 둘러봐도 됩니다.', [
        { act: 'kid-new', label: '아이 넣기' }, { act: 'sample-add', label: '예시 넣어 보기' }]);
      return;
    }
    var bag = Logic.buildBag(S, kid, k);
    var pr = Logic.progress(S, kid, bag);
    var done = S.checks[Logic.checkKey(kid.id, k)] || [];
    var hist = S.history.filter(function (x) { return x.kid === kid.id && x.date === k; })[0];
    var hasWeek = false;
    for (var d = 1; d <= 5; d++) if (kid.week[d].p.some(function (x) { return !!x; }) || kid.week[d].after.length) hasWeek = true;

    var h = '<div class="card date-card">' +
      '<button class="icon-btn" type="button" data-act="day-prev" aria-label="앞 학교 가는 날">‹</button>' +
      '<div class="mid"><span class="rel">' + Logic.relLabel(k, todayKey) + ' 가방</span><div class="big">' + Logic.label(k) + '</div>' +
      '<div class="tiny">' + esc(kid.name) + ' · ' + (bag.school ? '학교 가는 날' : '쉬는 날') + '</div></div>' +
      '<button class="icon-btn" type="button" data-act="day-next" aria-label="다음 학교 가는 날">›</button></div>';

    if (V.offset !== 0) h += '<button class="btn small subtle" type="button" data-act="day-now">↺ 지금 챙길 가방으로</button>';

    if (!bag.school) {
      root.innerHTML = h + emptyBox('rest', '이날은 쉬는 날이에요', '주말이나 쉬는 날로 넣어 둔 날입니다. 다음 학교 가는 날 가방을 보세요.', [{ act: 'day-next', label: '다음 학교 가는 날' }]) +
        upcomingCard(S, kid, k, todayKey);
      return;
    }
    if (!hasWeek && !bag.items.some(function (it) { return it.group === 'note'; })) {
      h += emptyBox('week', '시간표부터 넣어 주세요', '요일·교시마다 과목을 한 번 넣어 두면 날마다 가방 목록이 저절로 만들어집니다.', [
        { act: 'go', label: '시간표 넣기', extra: ' data-to="week"' }, { act: 'note-new', label: '+ 알림장 준비물' }]);
      h += '<h2>매일 챙길 것</h2>';
      h += checkList(bag, done);
      h += upcomingCard(S, kid, k, todayKey);
      root.innerHTML = h;
      return;
    }

    h += '<div class="card"><div class="ring-wrap" id="bag-ring">' + ring(pr.pct) +
      '<div><div style="font-weight:800;font-size:var(--t-4)">' + pr.done + ' / ' + pr.total + ' 챙김</div>' +
      (hist ? '<div class="pill">' + (hist.auto ? '기록됨' : '다 쌌어요 ✓') + ' · 빠진 것 ' + hist.missed.length + '</div>' :
        '<div class="muted">' + (pr.total - pr.done ? '남은 물건 ' + (pr.total - pr.done) + '개' : '모두 챙겼어요!') + '</div>') +
      '</div></div>';
    if (bag.periods.some(function (x) { return x; })) {
      h += '<div class="periods">';
      bag.periods.forEach(function (p, i) { if (p) h += '<span>' + (i + 1) + '교시 ' + esc(p) + '</span>'; });
      h += '</div>';
    }
    h += '</div>';

    if (bag.pickups.length) {
      h += '<div class="card"><div class="muted" style="font-weight:800;margin-bottom:6px">방과후 · 데리러 갈 사람</div><div class="pick-strip">';
      bag.pickups.forEach(function (p) {
        h += '<span class="pk">' + esc(p.icon) + ' ' + esc(p.time || '시간 미정') + ' ' + esc(p.name) + ' → <b>' + esc(p.who || '정하지 않음') + '</b></span>';
      });
      h += '</div></div>';
    }

    // 누를 수 없는 때는 disabled 로 흐리게: 물건이 없으면 모두 체크·다 쌌어요, 다 챙겼으면 모두 체크
    var noItems = !bag.items.length;
    var allDone = !noItems && pr.done >= pr.total;
    h += '<div class="row wrap no-print">' +
      '<button class="btn" type="button" data-act="note-new">+ 알림장</button>' +
      '<button class="btn" type="button" data-act="event-new">+ 행사</button>' +
      '<span class="spacer"></span>' +
      '<button class="btn small subtle" type="button" data-act="check-all"' + (noItems || allDone ? ' disabled' : '') + '>모두 체크</button></div>';

    h += checkList(bag, done);

    var notes = S.notes.filter(function (n) { return n.kid === kid.id && n.date === k; });
    if (notes.length) {
      h += '<div class="card"><div class="muted" style="font-weight:800">이날 알림장</div>';
      notes.forEach(function (n) {
        h += '<div class="row" style="margin-top:6px"><span style="flex:1">' + esc(n.title || '알림장') + ' — ' + esc(n.items.join(', ')) + '</span>' +
          '<button class="btn small" type="button" data-act="note-edit" data-id="' + n.id + '">고치기</button></div>';
      });
      h += '</div>';
    }
    h += upcomingCard(S, kid, k, todayKey);

    h += '<button class="btn main wide" type="button" data-act="bag-done" style="margin-top:8px"' + (noItems ? ' disabled' : '') + '>' + (hist ? '다시 기록하기' : '다 쌌어요') + '</button>';
    h += '<button class="btn wide subtle" type="button" data-act="share" style="margin-top:8px">' + SHARE_IC + '가족에게 보낼 글 복사</button>';
    root.innerHTML = h;
  }

  function checkList(bag, done) {
    var h = '', last = '';
    // 무리마다 챙긴 수/전체 (무리 머리의 g-count, 다 챙기면 all-done)
    var cnt = {};
    bag.items.forEach(function (it) {
      var c = cnt[it.group] || (cnt[it.group] = { d: 0, t: 0 });
      c.t++;
      if (done.indexOf(it.name) >= 0) c.d++;
    });
    bag.items.forEach(function (it) {
      if (it.group !== last) {
        last = it.group;
        var c = cnt[it.group];
        h += '<div class="group-title g-' + it.group + (c.d === c.t ? ' all-done' : '') + '"><span class="dot"></span>' + Logic.GROUP_NAME[it.group] +
          '<span class="g-count" aria-label="' + c.t + '개 가운데 ' + c.d + '개 챙김">' + c.d + '/' + c.t + '</span></div>';
      }
      var on = done.indexOf(it.name) >= 0;
      h += '<button class="check' + (on ? ' done' : '') + '" type="button" data-act="check" data-name="' + esc(it.name) + '" aria-pressed="' + on + '">' +
        '<span class="box">' + (on ? '✓' : '') + '</span><span class="it-ic" aria-hidden="true">' + esc(it.icon || '🎒') + '</span><span><span class="nm">' + esc(it.name) + '</span>' +
        '<span class="src">' + esc(it.sources.join(' · ')) + '</span></span></button>';
    });
    if (!bag.items.length) h += miniEmpty('🎒', '이날 챙길 물건이 아직 없어요. 알림장 준비물을 넣어 보세요.', { act: 'note-new', label: '+ 알림장 준비물' });
    return h;
  }

  // ---- 시간표 ----
  function renderWeek(S, V, kid, todayKey) {
    var root = $('week-root');
    if (!kid) {
      root.innerHTML = '<h1>시간표</h1>' + emptyBox('week', '아이를 먼저 넣어 주세요', '아이마다 시간표가 따로 있어요.', [{ act: 'kid-new', label: '아이 넣기' }]);
      return;
    }
    var tw = Logic.dow(todayKey);
    var h = '<h1>' + esc(kid.name) + ' 시간표</h1><p class="muted">칸을 눌러 과목을 고르세요. 과목마다 늘 챙기는 물건이 가방에 들어갑니다.</p>';
    h += '<div class="card" style="padding:10px"><div class="week"><div></div>';
    for (var d = 1; d <= 5; d++) h += '<div class="hd' + (d === tw ? ' today' : '') + '">' + DATA.DOW[d] + '</div>';
    for (var i = 0; i < kid.periods; i++) {
      h += '<div class="pn">' + (i + 1) + '</div>';
      for (var e = 1; e <= 5; e++) {
        var pk = kid.week[e].p[i] ? Logic.findPack(S.packs, kid.week[e].p[i]) : null;
        h += '<button class="cell' + (pk ? ' full' : '') + '" type="button" data-act="cell" data-d="' + e + '" data-i="' + i + '" id="cell-' + e + '-' + i + '" aria-label="' +
          DATA.DOW[e] + '요일 ' + (i + 1) + '교시 ' + (pk ? esc(pk.name) : '빈 칸') + '">' +
          (pk ? '<span class="ic">' + esc(pk.icon) + '</span>' + esc(pk.name) : '+') + '</button>';
      }
    }
    h += '</div></div>';

    h += '<h2>방과후 · 학원</h2>';
    for (var w = 1; w <= 5; w++) {
      var af = kid.week[w].after.slice().sort(function (a, b) { return (a.time || '').localeCompare(b.time || ''); });
      h += '<div class="card"><div class="row"><b style="flex:1">' + DATA.DOW[w] + '요일</b>' +
        '<button class="btn small" type="button" data-act="after-new" data-d="' + w + '">+ 넣기</button></div><div class="after-list">';
      if (!af.length) h += miniEmpty('🏫', '이 요일은 방과후가 없어요. 학원·돌봄이 있으면 넣어 주세요.', { act: 'after-new', label: '+ 방과후 넣기', extra: ' data-d="' + w + '"' });
      af.forEach(function (a) {
        var p = Logic.findPack(S.packs, a.packId);
        h += '<div class="af"><span>' + esc(p ? p.icon : '❔') + '</span><span style="flex:1"><b>' + esc(a.time || '시간 미정') + '</b> ' + esc(p ? p.name : '지운 꾸러미') +
          '<span class="tiny"> · 데리러: ' + esc(a.who || '정하지 않음') + '</span></span>' +
          '<button class="btn small" type="button" data-act="after-edit" data-d="' + w + '" data-id="' + a.id + '">고치기</button></div>';
      });
      h += '</div></div>';
    }
    root.innerHTML = h;
  }

  function renderCellSheet(S, V, kid) {
    var c = V.cell;
    $('cell-title').textContent = DATA.DOW[c.d] + '요일 ' + (c.i + 1) + '교시';
    var cur = kid.week[c.d].p[c.i];
    var h = '';
    S.packs.filter(function (p) { return p.kind === 'subj'; }).forEach(function (p) {
      h += '<button class="chip' + (p.id === cur ? ' pick' : '') + '" type="button" data-act="cell-set" data-id="' + p.id + '">' + esc(p.icon) + ' ' + esc(p.name) + '</button>';
    });
    if (!h) h = miniEmpty('📚', '고를 과목 꾸러미가 없어요. 꾸러미를 먼저 만들어 주세요.', { act: 'pack-new', label: '+ 새 꾸러미' });
    $('cell-picks').innerHTML = h;
    $('cell-copy-row').innerHTML = '';
  }

  function renderCopyRow(d) {
    var h = '<span class="tiny" style="width:100%">' + DATA.DOW[d] + '요일 시간표를 어느 요일에 복사할까요?</span>';
    for (var w = 1; w <= 5; w++) if (w !== d) h += '<button class="chip" type="button" data-act="cell-copy-to" data-d="' + w + '">' + DATA.DOW[w] + '요일로</button>';
    $('cell-copy-row').innerHTML = h;
  }

  // ---- 꾸러미 ----
  function renderPacks(S, V) {
    var h = '<h1>꾸러미</h1><p class="muted">과목·학원마다 늘 챙기는 물건 묶음입니다. 우리 학교·학원에 맞게 고치세요.</p>';
    h += '<div class="row wrap"><button class="btn main" type="button" data-act="pack-new">+ 새 꾸러미</button><button class="btn" type="button" data-act="event-new">행사 꾸러미 붙이기</button></div>';
    h += '<h2>매일 챙길 것</h2><div class="card"><div class="chips">';
    S.daily.forEach(function (x, i) {
      h += '<button class="chip" type="button" data-act="daily-del" data-i="' + i + '" aria-label="' + esc(x) + ' 빼기">' + esc(x) + ' ✕</button>';
    });
    if (!S.daily.length) h += miniEmpty('🧴', '매일 챙길 것이 비어 있어요. 기본 다섯 가지를 넣거나 아래에 직접 넣어 주세요.', { act: 'daily-default', label: '기본 넣기' });
    h += '</div><form id="form-daily" class="row" style="margin-top:8px"><input id="daily-add" type="text" maxlength="40" placeholder="예: 물티슈" aria-label="매일 챙길 것 넣기"><button class="btn" type="submit">넣기</button></form><div class="err" id="daily-err"></div></div>';

    // 찾기·거르기·정렬 (찾는 말을 칠 때는 아래 목록만 다시 그려 입력란 포커스가 그대로다)
    h += '<h2>꾸러미 찾기</h2><div class="card finder no-print">' +
      '<input id="pack-q" type="search" maxlength="40" placeholder="꾸러미 이름이나 물건 (예: 물병)" aria-label="꾸러미 찾기" value="' + esc(V.packQ) + '">' +
      '<div class="seg wrap" role="group" aria-label="종류 거르기">' +
      [['all', '모두'], ['subj', '수업 과목'], ['acad', '방과후 · 학원']].map(function (o) {
        return '<button class="chip' + (V.packKind === o[0] ? ' on' : '') + '" type="button" data-act="pack-kind" data-v="' + o[0] + '" aria-pressed="' + (V.packKind === o[0]) + '">' + o[1] + '</button>';
      }).join('') + '</div>' +
      '<label class="f" for="pack-sort">늘어놓는 순서</label><select id="pack-sort" data-view="packSort">' +
      [['base', '넣은 순서'], ['name', '이름 가나다순'], ['many', '물건 많은 순']].map(function (o) {
        return '<option value="' + o[0] + '"' + (V.packSort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
      }).join('') + '</select></div>';
    h += '<div id="pack-list"></div>';

    h += '<h2>요일마다 챙길 것</h2><div class="card">';
    if (!S.rules.length) h += miniEmpty('📅', '요일마다 챙길 것이 없어요. 실내화 주머니 같은 기본 규칙을 넣어 보세요.', { act: 'rules-default', label: '기본 규칙 넣기' });
    S.rules.forEach(function (r) {
      h += '<div class="toggle"><span>' + DATA.DOW[r.dow] + '요일 · ' + esc(r.item) + '</span><button class="btn small' + (r.on ? ' main' : '') + '" type="button" data-act="rule-toggle" data-id="' + r.id + '" aria-pressed="' + r.on + '">' + (r.on ? '켜짐' : '꺼짐') + '</button></div>';
    });
    h += '</div>';
    $('packs-root').innerHTML = h;
    renderPackList(S, V);
  }

  // 꾸러미 목록: 찾는 말·종류·순서를 거친 것만
  function renderPackList(S, V) {
    var root = $('pack-list');
    if (!root) return;
    var q = Logic.norm(V.packQ);
    var found = Logic.findPacks(S.packs, q, V.packKind, V.packSort);
    var h = '';
    if (q || V.packKind !== 'all') {
      h += '<p class="tiny" aria-live="polite">' + found.length + '개 찾음 / 모두 ' + S.packs.length + '개</p>';
      if (!found.length) {
        root.innerHTML = h + miniEmpty('🔍', (q ? '‘' + q + '’' : '이 종류') + '에 맞는 꾸러미가 없어요. 다른 말로 찾거나 새로 만들어 보세요.', { act: 'pack-q-clear', label: '찾기 지우기' });
        return;
      }
    }
    var kinds = [['subj', '수업 과목'], ['acad', '방과후 · 학원']];
    kinds.forEach(function (kd) {
      if (V.packKind !== 'all' && V.packKind !== kd[0]) return;
      var list = found.filter(function (p) { return p.kind === kd[0]; });
      if (q && !list.length) return;
      h += '<h2>' + kd[1] + ' <span class="tiny">' + list.length + '개</span></h2>';
      if (!list.length) h += emptyBox('pack', '꾸러미가 없어요', '새 꾸러미를 만들어 늘 챙기는 물건을 넣어 두세요.', [{ act: 'pack-new', label: '+ 새 꾸러미' }]);
      list.forEach(function (p) {
        h += '<button class="card pack btn" type="button" data-act="pack-edit" data-id="' + p.id + '"><span class="ic">' + esc(p.icon) + '</span><span><span class="nm">' + mark(p.name, q) + '</span><br><span class="tiny">' + (p.items.length ? p.items.map(function (x) { return mark(x, q); }).join(', ') : '물건 없음') + '</span></span></button>';
      });
    });
    root.innerHTML = h;
  }

  // 찾는 말에 맞은 부분을 <mark> 로
  function mark(s, q) {
    var t = String(s);
    if (!q) return esc(t);
    var i = t.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return esc(t);
    return esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length));
  }

  function renderPackItems(items) {
    var h = '';
    items.forEach(function (x, i) {
      h += '<div class="it"><span>' + esc(x) + '</span><button class="btn small" type="button" data-act="pack-item-del" data-i="' + i + '" aria-label="' + esc(x) + ' 빼기">빼기</button></div>';
    });
    if (!items.length) h = miniEmpty('✏️', '아직 물건이 없어요. 이 꾸러미에 늘 챙기는 물건을 넣어 주세요.', { act: 'focus', label: '물건 넣기', extra: ' data-target="pack-add"' });
    $('pack-items').innerHTML = h;
  }

  function renderNoteItems(items) {
    var h = '';
    items.forEach(function (x, i) {
      h += '<button class="chip pick" type="button" data-act="note-item-del" data-i="' + i + '" aria-label="' + esc(x) + ' 빼기">' + esc(x) + ' ✕</button>';
    });
    if (!items.length) h = miniEmpty('📝', '넣은 준비물이 없어요. 알림장에 적힌 것을 쓰거나 아래 갈래에서 눌러 넣으세요.', { act: 'focus', label: '준비물 쓰기', extra: ' data-target="note-add"' });
    $('note-items').innerHTML = h;
  }

  function renderSupplies(cat, picked) {
    var g = DATA.SUPPLIES.filter(function (s) { return s.cat === cat; })[0] || DATA.SUPPLIES[0];
    var h = '';
    g.items.forEach(function (x) {
      var on = picked.indexOf(x) >= 0;
      h += '<button class="chip' + (on ? ' pick' : '') + '" type="button" data-act="note-supply" data-name="' + esc(x) + '">' + esc(x) + '</button>';
    });
    $('note-supplies').innerHTML = h;
  }

  function renderEvents(sel) {
    var h = '';
    DATA.EVENTS.forEach(function (e) {
      h += '<button class="chip' + (e.id === sel ? ' pick' : '') + '" type="button" data-act="event-pick" data-id="' + e.id + '">' + esc(e.icon) + ' ' + esc(e.name) + '</button>';
    });
    $('event-list').innerHTML = h;
    var ev = DATA.EVENTS.filter(function (e) { return e.id === sel; })[0];
    $('event-items').textContent = ev ? '들어갈 것: ' + ev.items.join(', ') : '행사를 골라 주세요.';
  }

  // ---- 기록 ----
  function renderLog(S, V, kid, todayKey) {
    var root = $('log-root');
    if (!kid) {
      root.innerHTML = '<h1>기록</h1>' + emptyBox('log', '아직 기록이 없어요', '아이를 넣고 가방을 챙긴 뒤 다 쌌어요를 누르면 여기에 쌓입니다.', [{ act: 'kid-new', label: '아이 넣기' }]);
      return;
    }
    var from = V.range === 'all' ? '' : Logic.addDays(todayKey, -(+V.range));
    var sm = Logic.summary(S.history, kid.id, from);
    var h = '<h1>' + esc(kid.name) + ' 기록</h1><div class="seg" style="margin:8px 0 12px">';
    [['7', '1주'], ['30', '한 달'], ['all', '전체']].forEach(function (r) {
      h += '<button class="chip' + (V.range === r[0] ? ' on' : '') + '" type="button" data-act="range" data-r="' + r[0] + '">' + r[1] + '</button>';
    });
    h += '</div>';
    if (!sm.days) {
      root.innerHTML = h + emptyBox('log', '이 기간 기록이 없어요', '가방 화면에서 챙긴 물건을 누르고 다 쌌어요를 누르면 기록이 생깁니다.', [{ act: 'go', label: '가방 챙기러 가기', extra: ' data-to="bag"' }]);
      return;
    }
    h += '<div class="stat-grid"><div class="stat"><b>' + sm.rate + '%</b><span class="tiny">챙김률</span></div>' +
      '<div class="stat"><b>' + sm.full + '</b><span class="tiny">다 챙긴 날 / ' + sm.days + '일</span></div>' +
      '<div class="stat"><b>' + sm.streak + '</b><span class="tiny">연속 다 챙김</span></div></div>';

    h += '<h2>요일별 챙김</h2><div class="card"><div class="bars">';
    Logic.byWeekday(sm.list).forEach(function (b) {
      h += '<div class="bar"><span class="tiny">' + (b.pct == null ? '-' : b.pct + '%') + '</span><i class="' + (b.pct == null ? 'none' : '') + '" style="height:' + (b.pct == null ? 4 : Math.max(4, b.pct * 0.8)) + 'px"></i>' + DATA.DOW[b.dow] + '</div>';
    });
    h += '</div></div>';

    h += '<h2>자주 빠뜨린 것</h2><div class="card">';
    if (!sm.top.length) h += miniEmpty('🌟', '이 기간 빠뜨린 물건이 없어요. 아주 잘하고 있어요!', { act: 'go', label: '오늘 가방 보기', extra: ' data-to="bag"' });
    sm.top.forEach(function (t) {
      h += '<div class="hist-row"><span style="flex:1">' + esc(t.name) + '</span><span class="pill miss">' + t.n + '번</span>' +
        '<button class="btn small" type="button" data-act="to-daily" data-name="' + esc(t.name) + '">매일 챙길 것에 넣기</button></div>';
    });
    h += '</div>';

    // 날짜별: 거르기(모두·빠진 날만·다 챙긴 날)·정렬·빠진 물건 찾기
    h += '<h2>날짜별</h2><div class="card finder no-print">' +
      '<div class="seg wrap" role="group" aria-label="날짜 거르기">' +
      [['all', '모두'], ['miss', '빠진 날만'], ['full', '다 챙긴 날']].map(function (o) {
        return '<button class="chip' + (V.histShow === o[0] ? ' on' : '') + '" type="button" data-act="hist-show" data-v="' + o[0] + '" aria-pressed="' + (V.histShow === o[0]) + '">' + o[1] + '</button>';
      }).join('') + '</div>' +
      '<div class="row wrap"><input id="hist-q" type="search" maxlength="40" placeholder="빠진 물건 찾기 (예: 리코더)" aria-label="빠진 물건 찾기" value="' + esc(V.histQ) + '">' +
      '<select id="hist-sort" data-view="histSort" aria-label="늘어놓는 순서">' +
      [['new', '최근 날 먼저'], ['old', '오래된 날 먼저'], ['low', '챙김률 낮은 순']].map(function (o) {
        return '<option value="' + o[0] + '"' + (V.histSort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
      }).join('') + '</select></div></div>';
    h += '<div class="card" id="hist-list"></div>';
    root.innerHTML = h;
    renderHistList(sm.list, V);
  }

  // 날짜별 목록만 다시 그리기 (찾는 말을 칠 때 입력란을 그대로 두려고)
  var histBase = [];
  function renderHistList(list, V) {
    if (list) histBase = list;
    var root = $('hist-list');
    if (!root) return;
    var q = Logic.norm(V.histQ);
    var rows = Logic.filterHistory(histBase, V.histShow, V.histSort, q);
    var h = '';
    if (V.histShow !== 'all' || q) h += '<p class="tiny" aria-live="polite">' + rows.length + '일 / 모두 ' + histBase.length + '일</p>';
    if (!rows.length) {
      var why = q ? '‘' + q + '’을(를) 빠뜨린 날이 없어요.' : (V.histShow === 'miss' ? '이 기간 빠뜨린 날이 없어요. 아주 잘하고 있어요!' : '이 기간 다 챙긴 날이 아직 없어요.');
      root.innerHTML = h + miniEmpty('🔍', why + ' 거르기를 풀면 모든 날이 보여요.', { act: 'hist-clear', label: '거르기 풀기' });
      return;
    }
    rows.forEach(function (x) {
      h += '<div class="hist-row"><span style="flex:1"><b>' + Logic.shortLabel(x.date) + '</b> <span class="tiny">' + x.done + '/' + x.total + '</span>' +
        (x.missed.length ? '<br><span class="tiny">빠짐: ' + x.missed.map(function (m) { return mark(m, q); }).join(', ') + '</span>' : '') + '</span>' +
        '<span class="pill' + (x.missed.length ? ' miss' : '') + '">' + (x.total ? Math.round(x.done * 100 / x.total) : 0) + '%</span>' +
        '<button class="btn small" type="button" data-act="hist-open" data-date="' + x.date + '">보기</button>' +
        '<button class="btn small danger" type="button" data-act="hist-del" data-date="' + x.date + '" aria-label="' + Logic.shortLabel(x.date) + ' 기록 지우기">지우기</button></div>';
    });
    root.innerHTML = h;
  }

  // ---- 더보기(설정) ----
  function renderMore(S, kid) {
    var st = S.settings;
    var h = '<h1>더보기</h1>';
    h += '<h2>아이</h2><div class="card">';
    if (!S.kids.length) h += miniEmpty('🧒', '아직 아이가 없어요. 아이를 넣으면 시간표와 가방이 생겨요.', { act: 'kid-new', label: '아이 넣기' });
    S.kids.forEach(function (k) {
      h += '<div class="toggle"><span>' + esc(k.name) + ' · ' + k.grade + '학년 · ' + k.periods + '교시</span><button class="btn small" type="button" data-act="kid-edit" data-id="' + k.id + '">고치기</button></div>';
    });
    if (S.kids.length) h += '<button class="btn wide" type="button" data-act="kid-new" style="margin-top:8px">+ 아이 넣기</button>';
    h += '</div>';

    h += '<h2>데리러 갈 사람</h2><div class="card"><div class="chips">';
    st.guardians.forEach(function (g, i) {
      h += '<button class="chip" type="button" data-act="guard-del" data-i="' + i + '" aria-label="' + esc(g) + ' 빼기">' + esc(g) + ' ✕</button>';
    });
    if (!st.guardians.length) h += miniEmpty('🙋', '데리러 갈 사람이 없어요. 엄마·아빠·할머니처럼 넣어 두면 방과후마다 고를 수 있어요.', { act: 'focus', label: '사람 넣기', extra: ' data-target="guard-add"' });
    h += '</div><form id="form-guard" class="row" style="margin-top:8px"><input id="guard-add" type="text" maxlength="12" placeholder="예: 할머니" aria-label="데리러 갈 사람 넣기"><button class="btn" type="submit">넣기</button></form><div class="err" id="guard-err"></div></div>';

    h += '<h2>가방 날짜</h2><div class="card">' +
      '<label class="f" for="set-hour">이 시각부터 다음 학교 가는 날 가방을 보여 줘요</label>' +
      '<select id="set-hour" data-set="switchHour">';
    for (var hr = 9; hr <= 20; hr++) h += '<option value="' + hr + '"' + (hr === st.switchHour ? ' selected' : '') + '>' + (hr < 12 ? '오전 ' + hr : '오후 ' + (hr === 12 ? 12 : hr - 12)) + '시</option>';
    h += '</select>' +
      '<label class="f" for="holiday-add">쉬는 날 (재량휴업일·공휴일)</label>' +
      '<form id="form-holiday" class="row"><input id="holiday-add" type="date"><button class="btn" type="submit">넣기</button></form><div class="err" id="holiday-err"></div><div class="chips" style="margin-top:8px">';
    st.holidays.slice().sort().forEach(function (d) {
      h += '<button class="chip" type="button" data-act="holiday-del" data-date="' + d + '" aria-label="' + Logic.shortLabel(d) + ' 빼기">' + Logic.shortLabel(d) + ' ✕</button>';
    });
    if (!st.holidays.length) h += miniEmpty('🏖️', '넣은 쉬는 날이 없어요. 주말은 저절로 건너뛰니 재량휴업일만 넣으세요.', { act: 'focus', label: '쉬는 날 고르기', extra: ' data-target="holiday-add"' });
    h += '</div></div>';

    h += '<h2>보기</h2><div class="card">' +
      '<div class="toggle"><span>글자 크기</span><div class="seg">' +
      [[1, '보통'], [1.15, '크게'], [1.3, '아주 크게']].map(function (f) {
        return '<button class="chip' + (st.font === f[0] ? ' on' : '') + '" type="button" data-act="font" data-v="' + f[0] + '">' + f[1] + '</button>';
      }).join('') + '</div></div>' +
      '<div class="toggle"><span>어두운 화면</span><button class="btn small' + (st.dark ? ' main' : '') + '" type="button" data-act="toggle-set" data-k="dark" aria-pressed="' + st.dark + '">' + (st.dark ? '켜짐' : '꺼짐') + '</button></div>' +
      '<div class="toggle"><span>움직임 줄이기</span><button class="btn small' + (st.reduce ? ' main' : '') + '" type="button" data-act="toggle-set" data-k="reduce" aria-pressed="' + st.reduce + '">' + (st.reduce ? '켜짐' : '꺼짐') + '</button></div></div>';

    h += '<h2>데이터</h2><div class="card">' +
      '<p class="muted">기록은 이 기기 브라우저에만 저장됩니다. 서버로 보내지 않아요.</p>' +
      '<div class="row wrap"><button class="btn" type="button" data-act="backup">내보내기 · 가져오기</button>' +
      '<button class="btn" type="button" data-act="print">인쇄</button>' +
      '<button class="btn" type="button" data-act="sample-add">예시 넣기</button>' +
      '<button class="btn" type="button" data-act="sample-del"' + (S.kids.some(function (k) { return k.sample; }) ? '' : ' disabled') + '>예시 빼기</button>' +
      '<button class="btn danger" type="button" data-act="clear-all">전체 지우기</button></div></div>';

    h += '<h2>계산 점검</h2><div class="card"><p class="muted">학교 가는 날 계산과 가방 합치기가 맞게 도는지 확인합니다.</p>' +
      '<button class="btn" type="button" data-act="selftest">점검하기</button><div id="selftest-out" class="tiny" style="margin-top:8px"></div></div>';
    $('more-root').innerHTML = h;
  }

  function renderHelp() {
    var h = '';
    DATA.TIPS.forEach(function (t) { h += '<div class="tip">' + esc(t) + '</div>'; });
    $('help-tips').innerHTML = h;
  }

  return {
    $: $, esc: esc, transit: transit, show: show, openSheet: openSheet, closeSheet: closeSheet, openSheets: openSheets,
    toast: toast, hideToast: hideToast, fieldErr: fieldErr, clearErr: clearErr, flash: flash,
    renderKids: renderKids, renderBag: renderBag, renderWeek: renderWeek, renderCellSheet: renderCellSheet, renderCopyRow: renderCopyRow,
    renderPacks: renderPacks, renderPackList: renderPackList, renderHistList: renderHistList, renderPackItems: renderPackItems, renderNoteItems: renderNoteItems, renderSupplies: renderSupplies,
    renderEvents: renderEvents, renderLog: renderLog, renderMore: renderMore, renderHelp: renderHelp
  };
})();
