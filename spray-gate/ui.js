/* Spray Gate — 화면 그리기 */
(function () {
  'use strict';
  var L = window.Logic, D = window.DATA;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(id) { return document.getElementById(id); }

  var ART = {
    field: '<svg viewBox="0 0 96 64" width="96" height="64" aria-hidden="true"><rect x="4" y="40" width="88" height="20" rx="6" fill="var(--soil)"/><path d="M14 40c0-10 6-16 6-16s6 6 6 16M38 40c0-12 7-18 7-18s7 6 7 18M64 40c0-10 6-16 6-16s6 6 6 16" fill="var(--accent)"/><circle cx="78" cy="14" r="8" fill="var(--warn)"/></svg>',
    bottle: '<svg viewBox="0 0 96 64" width="96" height="64" aria-hidden="true"><rect x="36" y="4" width="24" height="10" rx="3" fill="var(--sub)"/><rect x="28" y="14" width="40" height="46" rx="10" fill="var(--soft)" stroke="var(--accent)" stroke-width="3"/><rect x="36" y="30" width="24" height="14" rx="3" fill="var(--surface)" stroke="var(--line)"/></svg>',
    sprayer: '<svg viewBox="0 0 96 64" width="96" height="64" aria-hidden="true"><rect x="20" y="16" width="30" height="42" rx="8" fill="var(--soft)" stroke="var(--accent)" stroke-width="3"/><path d="M50 26h20l14-8" stroke="var(--ink)" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="88" cy="14" r="3" fill="var(--accent)"/><circle cx="90" cy="22" r="2" fill="var(--accent)"/><circle cx="84" cy="8" r="2" fill="var(--accent)"/></svg>',
    log: '<svg viewBox="0 0 96 64" width="96" height="64" aria-hidden="true"><rect x="22" y="6" width="52" height="54" rx="8" fill="var(--surface)" stroke="var(--line)" stroke-width="3"/><path d="M32 22h32M32 34h32M32 46h20" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"/></svg>',
    search: '<svg viewBox="0 0 96 64" width="96" height="64" aria-hidden="true"><circle cx="42" cy="28" r="16" fill="none" stroke="var(--accent)" stroke-width="5"/><path d="M54 40l14 14" stroke="var(--ink)" stroke-width="6" stroke-linecap="round"/></svg>'
  };

  function emptyBox(art, title, text, btn, act, attrs) {
    return '<div class="empty card">' + ART[art] + '<h3>' + esc(title) + '</h3><p>' + esc(text) + '</p>' +
      (btn ? '<button type="button" class="btn primary" data-act="' + act + '"' + (attrs || '') + '>' + esc(btn) + '</button>' : '') + '</div>';
  }

  function verdictBand(v, title, reasons) {
    var label = { ok: '괜찮음', tight: '빠듯', bad: '불가', none: '판정 없음' }[v];
    var ic = { ok: '✓', tight: '!', bad: '✕', none: '·' }[v];
    return '<div class="band v-' + v + '" role="status"><span class="band-ic" aria-hidden="true">' + ic + '</span><div><b>' + esc(title || label) + '</b>' +
      (reasons && reasons.length ? '<ul>' + reasons.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>' : '') + '</div></div>';
  }
  function vchip(v) {
    return '<span class="vchip v-' + v + '">' + L.VERDICT[v] + '</span>';
  }
  function kindOf(key) { for (var i = 0; i < D.KINDS.length; i++) if (D.KINDS[i].key === key) return D.KINDS[i]; return D.KINDS[5]; }
  function kindDot(key) { var k = kindOf(key); return '<span class="kdot" style="background:' + k.color + '"></span>'; }

  // ---------- 전환 (A-50: 화면·탭·시트·겹침 창의 열고 닫기가 모두 이 함수를 거친다) ----------
  // wrap: 보이거나 숨길 바깥 요소, inner: 움직일 안쪽 요소, open: 열기/닫기, cls: 여는 움직임(enter 0.22초 · pop-in 0.26초)
  // 닫기는 바깥이 흐려지고(fade-out 0.2초) 안쪽이 내려간 뒤(pop-out 0.2초) hidden. 움직임 줄이기(body.calm)면 바로 바뀐다.
  var ANIMS = ['enter', 'pop-in', 'pop-out', 'fade-out'];
  function transit(wrap, inner, open, cls, instant) {
    if (!wrap) return;
    var calm = document.body.classList.contains('calm');
    var token = (wrap._tx || 0) + 1;
    wrap._tx = token;
    [wrap, inner].forEach(function (el) { if (el) el.classList.remove.apply(el.classList, ANIMS); });
    if (open) {
      wrap.hidden = false;
      if (calm || !inner) return;
      void inner.offsetWidth;
      inner.classList.add(cls || 'enter');
      return;
    }
    if (calm || instant || wrap.hidden) { wrap.hidden = true; return; }
    var finished = false;
    var finish = function () {
      if (finished || wrap._tx !== token) return;
      finished = true;
      wrap.hidden = true;
      [wrap, inner].forEach(function (el) { if (el) el.classList.remove.apply(el.classList, ANIMS); });
    };
    void wrap.offsetWidth;
    wrap.classList.add('fade-out');
    if (inner && inner !== wrap) inner.classList.add('pop-out');
    wrap.addEventListener('animationend', function onEnd(e) {
      if (e.target !== wrap) return;
      wrap.removeEventListener('animationend', onEnd);
      finish();
    });
    setTimeout(finish, 400);
  }
  function animateIn(el, cls) { transit(el, el, true, cls); }

  var SCREENS = ['today', 'spray', 'fields', 'products', 'log', 'more', 'help'];
  function show(name) {
    if (SCREENS.indexOf(name) < 0) name = 'today';
    SCREENS.forEach(function (n) {
      var el = $('screen-' + n);
      if (el && n !== name) el.hidden = true;
    });
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) {
      if (t.getAttribute('data-to') === name) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
    var cur = $('screen-' + name);
    transit(cur, cur, true, 'enter');
    window.scrollTo(0, 0);
  }

  var openSheetId = '';
  function openSheet(id) {
    if (openSheetId && openSheetId !== id) closeSheet(true);
    var w = $(id);
    if (!w) return;
    openSheetId = id;
    transit(w, w.querySelector('.sheet'), true, 'pop-in');
    var f = w.querySelector('input:not([type=hidden]), select, textarea, button');
    if (f && window.matchMedia && window.matchMedia('(pointer: fine)').matches) { try { f.focus(); } catch (e) { /* 무시 */ } }
  }
  // quick: 다른 시트로 바로 바꿀 때는 움직임 없이 닫는다
  function closeSheet(quick) {
    if (!openSheetId) return;
    var w = $(openSheetId);
    openSheetId = '';
    if (w) transit(w, w.querySelector('.sheet'), false, null, !!quick);
  }
  function sheetOpen() { return openSheetId; }

  function openOverlay(id) { var o = $(id); if (o) transit(o, o.querySelector('.ov-card'), true, 'pop-in'); }
  function closeOverlay(id) { var o = $(id); if (o) transit(o, o.querySelector('.ov-card'), false); }

  // ---------- 반응 (A-51) ----------
  var toastTimer = 0;
  function toast(msg, undo) {
    var t = $('toast');
    if (!t) return;
    t.innerHTML = '<span class="t-ic" aria-hidden="true">✓</span><span>' + esc(msg) + '</span>' + (undo ? '<button type="button" class="btn small ghost" data-act="undo">되돌리기</button>' : '');
    t.classList.remove('pop');
    void t.offsetWidth;
    t.classList.add('pop');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('pop'); }, undo ? 6000 : 2600);
  }
  function flash(el) {
    if (!el) return;
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }
  function fieldErr(id, msg) {
    var el = $(id);
    var box = $(id + '-err');
    if (el) {
      el.setAttribute('aria-invalid', 'true');
      el.classList.remove('shake');
      void el.offsetWidth;
      el.classList.add('shake');
      try { el.focus(); } catch (e) { /* 무시 */ }
    }
    if (box) { box.textContent = msg; box.hidden = false; }
  }
  function clearErrs(root) {
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll('[aria-invalid]'), function (e) { e.removeAttribute('aria-invalid'); });
    Array.prototype.forEach.call(root.querySelectorAll('.err'), function (e) { e.textContent = ''; e.hidden = true; });
  }
  function errBox(id) { return '<p class="err" id="' + id + '-err" role="alert" hidden></p>'; }

  // ---------- 오늘 ----------
  function renderToday(st, ui) {
    var now = L.today();
    var h = '<div class="hello"><p class="date">' + L.md(now) + ' (' + L.wday(now) + ')</p>';
    if (!st.fields.length) {
      h += '<h2>밭마다 수확 문을 지켜요</h2></div>';
      h += emptyBox('field', '아직 밭이 없어요', '밭 이름·작물·수확 예정일을 넣으면 약을 칠 때마다 수확 가능일을 계산해 드려요.', '첫 밭 넣기', 'open-field');
      $('today-root').innerHTML = h + tipCard(ui);
      return;
    }
    var stats = st.fields.map(function (f) { return L.fieldStatus(st, f, now); });
    var closed = stats.filter(function (s) { return !s.open; }).length;
    var bad = stats.filter(function (s) { return s.verdict === 'bad'; }).length;
    // 머리 문장 (V-03): 겹치는 밭 수는 var(--bad), 닫힌 밭 수·열린 밭 수는 var(--accent)
    h += '<h2>' + (bad ? '수확 예정과 겹치는 밭 <b class="hl hl-bad">' + bad + '곳</b>' : closed ? '수확 문이 닫힌 밭 <b class="hl">' + closed + '곳</b>' : '밭 <b class="hl">' + stats.length + '곳</b> 모두 수확 문이 열려 있어요') + '</h2></div>';
    h += todoCard(L.todayTasks(st, now));
    if (!st.products.length) {
      h += '<div class="card hint mini-empty">' + ART.bottle + '<p>약 카드가 아직 없어요. 약 병 라벨의 희석배수와 "수확 며칠 전까지" 를 옮겨 적어 두면 살포 때 바로 계산돼요.</p><button type="button" class="btn" data-act="open-product">약 카드 만들기</button></div>';
    }
    h += '<div class="list">';
    stats.forEach(function (s) {
      var f = s.field;
      h += '<article class="card fcard" data-id="' + esc(f.id) + '"><div class="fhead"><div><h3>' + esc(f.name) + '</h3><p class="sub">' + esc(f.crop) + (f.harvest ? ' · 수확 예정 ' + L.md(f.harvest) + (s.toHarvest >= 0 ? ' (D-' + s.toHarvest + ')' : ' (지남)') : ' · 수확 예정 없음') + '</p></div>' + (f.harvest ? vchip(s.verdict) : '') + '</div>';
      h += gateNum(s) + gateLine(s);
      h += '<div class="row2"><button type="button" class="btn primary" data-act="spray-for" data-id="' + esc(f.id) + '">이 밭에 뿌리기</button><button type="button" class="btn" data-act="open-gate" data-id="' + esc(f.id) + '">출하 판정</button></div></article>';
    });
    h += '</div>';
    var recent = st.sprays.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 3);
    h += '<h3 class="sec">최근 살포</h3>';
    if (!recent.length) h += '<div class="mini-empty card">' + ART.sprayer + '<p>아직 살포 기록이 없어요. 약을 치고 저장하면 여기 최근 3번이 보여요.</p><button type="button" class="btn" data-act="go" data-to="spray">살포 기록하기</button></div>';
    else h += '<div class="list">' + recent.map(function (s) { return recordRow(st, s); }).join('') + '</div>';
    $('today-root').innerHTML = h + tipCard(ui);
  }

  // 오늘 할 일 (A-27) — 오늘 화면 맨 위 카드. 급한 것부터, 줄마다 바로 가는 버튼
  function todoCard(tasks) {
    var h = '<section class="card todo" id="today-todo" aria-labelledby="todo-title"><h3 id="todo-title">오늘 할 일' + (tasks.length ? ' <span class="todo-n">' + tasks.length + '</span>' : '') + '</h3>';
    if (!tasks.length) return h + '<p class="todo-none"><span class="tdot t-ok"></span>오늘 꼭 할 일은 없어요. 약을 치면 수확 문을 다시 계산해요.</p></section>';
    h += '<ul class="todo-list">' + tasks.map(function (t) {
      return '<li class="todo-row t-' + t.level + '"><span class="tdot t-' + t.level + '" aria-hidden="true"></span><div class="todo-txt"><b>' + esc(t.name) + '</b><span>' + esc(t.text) + '</span></div>' +
        '<button type="button" class="btn small" data-act="' + t.act + '"' + (t.fieldId ? ' data-id="' + esc(t.fieldId) + '"' : '') + '>' + esc(t.btn) + '</button></li>';
    }).join('') + '</ul></section>';
    return h;
  }

  // 오늘 화면 밭 카드의 핵심 숫자 (V-01·V-04): .gate-num 에는 D-n 또는 수확 문 날짜만 넣는다.
  // 닫혔으면 열리기까지 D-n, 열렸으면 수확 예정까지 D-n 또는 열린 날(살포 없으면 오늘)
  // 색은 판정에 따라: 괜찮음 g-ok(accent) · 빠듯/닫힘 g-shut(warn) · 불가 g-bad(bad)
  function gateNum(s) {
    var f = s.field, num, cap;
    if (!s.open) {
      num = 'D-' + s.daysLeft;
      cap = '수확 문이 ' + L.md(s.earliest) + ' 에 열려요';
    } else if (f.harvest && s.toHarvest >= 0) {
      num = 'D-' + s.toHarvest;
      cap = '수확 예정 ' + L.md(f.harvest) + ' · 수확 문 열림';
    } else {
      num = L.md(s.earliest || L.today());
      cap = s.earliest ? '부터 수확 문 열림' : '부터 수확 가능 · 이번 작기 살포 없음';
    }
    var cls = s.verdict === 'bad' ? 'g-bad' : (s.verdict === 'tight' || !s.open) ? 'g-shut' : 'g-ok';
    if (s.verdict === 'bad') cap += ' · 수확 예정과 겹쳐요';
    else if (s.verdict === 'tight') cap += ' · 여유가 빠듯해요';
    return '<div class="gate-big"><b class="gate-num ' + cls + '">' + num + '</b><span class="gate-cap">' + esc(cap) + '</span></div>';
  }

  function gateLine(s) {
    if (!s.earliest) return '<p class="gate open"><span class="gdot"></span>이번 작기 살포 없음 — 언제든 수확할 수 있어요</p>';
    if (s.open) return '<p class="gate open"><span class="gdot"></span>수확 문 열림 (' + L.md(s.earliest) + ' 부터) · 마지막 ' + esc(s.by.name) + '</p>';
    return '<p class="gate shut"><span class="gdot"></span>수확 문 닫힘 — ' + L.md(s.earliest) + ' 에 열려요 (D-' + s.daysLeft + ') · ' + esc(s.by.name) + ' ' + s.by.phi + '일 전까지</p>';
  }

  function tipCard(ui) {
    var tip = D.TIPS[ui.tip % D.TIPS.length];
    return '<div class="card tip"><p class="sub">오늘의 요령</p><p id="tip-text">' + esc(tip) + '</p><button type="button" class="btn small ghost" data-act="tip-next">다른 요령</button></div>';
  }

  function recordRow(st, s) {
    var f = L.findField(st, s.fieldId);
    return '<button type="button" class="list-row" data-act="open-record" data-id="' + esc(s.id) + '"><span class="lr-date">' + L.md(s.date) + '<small>' + L.wday(s.date) + '</small></span><span class="lr-main"><b>' + esc(f ? f.name : '지운 밭') + '</b><small>' + s.items.map(function (it) { return esc(it.name); }).join(' + ') + ' · 물 ' + L.fmtNum(s.water * (s.tanks || 1)) + 'L</small></span><span class="lr-go" aria-hidden="true">›</span></button>';
  }

  // ---------- 살포 (핵심 흐름) ----------
  function renderSpray(st, dr) {
    var root = $('spray-root');
    if (!st.fields.length) {
      root.innerHTML = '<h2 class="title">살포 기록</h2>' + emptyBox('sprayer', '먼저 밭을 넣어요', '어느 밭에 뿌리는지 알아야 수확 가능일을 계산할 수 있어요.', '밭 넣기', 'open-field');
      return;
    }
    var h = '<h2 class="title">' + (dr.editId ? '살포 기록 고치기' : '살포 기록') + '</h2>';
    h += '<form id="form-spray" class="card form" novalidate>';
    h += '<div class="row2"><label>밭<select id="sp-field" name="field">' + st.fields.map(function (f) {
      return '<option value="' + esc(f.id) + '"' + (f.id === dr.fieldId ? ' selected' : '') + '>' + esc(f.name) + ' · ' + esc(f.crop) + '</option>';
    }).join('') + '</select></label><label>뿌린 날<input id="sp-date" type="date" value="' + esc(dr.date) + '" required></label></div>';
    h += errBox('sp-field') + errBox('sp-date');
    h += '<fieldset><legend>물 양 (한 통)</legend><div class="chips">' + D.TANKS.map(function (t) {
      return '<button type="button" class="chip" data-act="sp-tank" data-v="' + t + '" aria-pressed="' + (Number(dr.water) === t) + '">' + t + 'L</button>';
    }).join('') + '</div>';
    h += '<div class="row2"><label>한 통 물 (L)<input id="sp-water" type="number" inputmode="decimal" min="0.5" max="5000" step="0.5" value="' + esc(dr.water) + '"></label><label>통 수<input id="sp-tanks" type="number" inputmode="numeric" min="1" max="50" step="1" value="' + esc(dr.tanks) + '"></label></div>';
    var f = L.findField(st, dr.fieldId);
    if (f && f.area > 0) h += '<button type="button" class="btn small ghost" data-act="sp-area">면적 ' + f.area + '㎡ 로 물 양 채우기 (10a당 ' + st.settings.per10a + 'L)</button>';
    h += errBox('sp-water') + errBox('sp-tanks') + '</fieldset>';
    h += '<fieldset><legend>약 카드 (여러 개 고르면 섞어 뿌림)</legend>';
    if (!st.products.length) h += '<div class="mini-empty">' + ART.bottle + '<p>약 카드가 없어요. 라벨을 보고 하나 만들어요.</p><button type="button" class="btn" data-act="open-product">약 카드 만들기</button></div>';
    else h += '<div class="chips pick" id="sp-prod" tabindex="-1" role="group" aria-label="약 카드 고르기">' + st.products.map(function (p) {
      return '<button type="button" class="chip prod" data-act="sp-prod" data-id="' + esc(p.id) + '" aria-pressed="' + (dr.pids.indexOf(p.id) >= 0) + '">' + kindDot(p.kind) + esc(p.name) + '</button>';
    }).join('') + '<button type="button" class="chip add" data-act="open-product" aria-label="약 카드 더하기">＋ 약 카드</button></div>';
    h += errBox('sp-prod') + '</fieldset>';
    h += '<div id="spray-calc" aria-live="polite">' + sprayCalcHtml(st, dr) + '</div>';
    h += '<details class="more-in"' + (dr.targets.length ? ' open' : '') + '><summary>대상 병해충 ' + (dr.targets.length ? '(' + dr.targets.length + ')' : '고르기') + '</summary><div class="chips">' + D.PESTS.map(function (p) {
      return '<button type="button" class="chip" data-act="sp-target" data-v="' + esc(p) + '" aria-pressed="' + (dr.targets.indexOf(p) >= 0) + '">' + esc(p) + '</button>';
    }).join('') + '</div></details>';
    h += '<fieldset><legend>날씨·때</legend><div class="chips">' + D.WEATHER.map(function (w) {
      return '<button type="button" class="chip" data-act="sp-weather" data-v="' + esc(w) + '" aria-pressed="' + (dr.weather.indexOf(w) >= 0) + '">' + esc(w) + '</button>';
    }).join('') + '</div></fieldset>';
    h += '<label>메모<input id="sp-memo" type="text" maxlength="120" value="' + esc(dr.memo) + '" placeholder="예: 아랫잎 위주로"></label>' + errBox('sp-memo');
    h += '<div class="row2"><button type="button" class="btn" data-act="open-safety">안전 점검 ' + dr.safety.length + '/' + D.SAFETY.length + '</button><button type="submit" class="btn primary">' + (dr.editId ? '고친 것 저장' : '살포 저장') + '</button></div>';
    if (dr.editId) h += '<button type="button" class="btn ghost" data-act="spray-cancel">고치기 그만</button>';
    h += '</form>';
    root.innerHTML = h;
  }

  function sprayCalcHtml(st, dr) {
    if (!dr.pids.length) return '<p class="sub calc-hint">약 카드를 누르면 통에 넣을 양과 수확 판정이 여기 나와요.</p>';
    var water = Number(dr.water), tanks = Math.max(1, Math.floor(Number(dr.tanks) || 1));
    var h = '<div class="calc card inset"><table class="dose"><thead><tr><th>약</th><th>배수</th><th>한 통</th><th>전체 ' + tanks + '통</th></tr></thead><tbody>';
    dr.pids.forEach(function (pid) {
      var p = L.findProduct(st, pid);
      if (!p) return;
      var one = L.dose(water, p.dil);
      h += '<tr><td>' + kindDot(p.kind) + esc(p.name) + '</td><td>' + p.dil + '배</td><td class="big">' + L.fmtNum(one) + p.unit + '</td><td>' + L.fmtNum(Math.round(one * tanks * 10) / 10) + p.unit + '</td></tr>';
    });
    h += '</tbody></table>';
    if (!(water > 0)) h += '<p class="err">물 양을 넣어야 약 양이 나와요.</p>';
    var r = L.planSpray(st, dr.fieldId, dr.date, dr.pids, dr.editId);
    var gateTxt = r.after ? '수확 문: ' + (r.before && r.before !== r.after ? L.md(r.before) + ' → ' : '') + L.md(r.after) + ' 부터' : '';
    h += verdictBand(r.verdict, (r.verdict === 'none' ? '판정 없음' : L.VERDICT[r.verdict]) + (gateTxt ? ' · ' + gateTxt : ''), r.reasons);
    if (r.rows.length) {
      h += '<ul class="plan-rows">' + r.rows.map(function (row) {
        return '<li>' + vchip(row.v) + '<span>' + esc(row.name) + ' — ' + L.md(row.until) + ' 부터 수확 · 이번 작기 ' + row.after + (row.max ? '/' + row.max : '') + '회째</span></li>';
      }).join('') + '</ul>';
    }
    return h + '</div>';
  }

  // ---------- 밭 ----------
  function renderFields(st) {
    var now = L.today();
    var h = '<div class="titlebar"><h2 class="title">밭</h2><button type="button" class="btn primary small" data-act="open-field">＋ 새 밭</button></div>';
    if (!st.fields.length) {
      $('fields-root').innerHTML = h + emptyBox('field', '밭이 없어요', '밭마다 작물과 작기 시작일, 수확 예정일을 넣어 두면 횟수와 수확 가능일을 따로 셉니다.', '첫 밭 넣기', 'open-field');
      return;
    }
    h += '<div class="list">';
    st.fields.forEach(function (f) {
      var s = L.fieldStatus(st, f, now);
      var n = L.seasonSprays(st, f.id).length;
      h += '<article class="card fcard"><div class="fhead"><div><h3>' + esc(f.name) + '</h3><p class="sub">' + esc(f.crop) + ' · 작기 ' + (f.start ? L.md(f.start) + ' 부터' : '시작일 없음') + ' · 살포 ' + n + '회' + (f.area ? ' · ' + f.area + '㎡' : '') + '</p></div>' + (f.harvest ? vchip(s.verdict) : '') + '</div>' + gateLine(s) +
        '<div class="row2"><button type="button" class="btn" data-act="open-field" data-id="' + esc(f.id) + '">고치기</button><button type="button" class="btn primary" data-act="open-gate" data-id="' + esc(f.id) + '">출하 판정</button></div></article>';
    });
    h += '</div>';
    h += '<div class="card"><h3>밭별 수확 가능일 글</h3><p class="sub">작목반·직매장에 알릴 때 복사해 붙여요.</p><textarea id="share-text" rows="5" readonly>' + esc(L.shareText(st, now)) + '</textarea><button type="button" class="btn" data-act="copy-share">글 복사</button></div>';
    $('fields-root').innerHTML = h;
  }

  // ---------- 약 카드 ----------
  function renderProducts(st, ui) {
    var h = '<div class="titlebar"><h2 class="title">약 카드</h2><button type="button" class="btn primary small" data-act="open-product">＋ 새 약 카드</button></div>';
    if (!st.products.length) {
      $('products-root').innerHTML = h + emptyBox('bottle', '약 카드가 없어요', '약 병 라벨의 희석배수, "수확 며칠 전까지", "몇 회 이내" 를 그대로 옮겨 적어요.', '첫 약 카드 만들기', 'open-product');
      return;
    }
    h += '<label class="search">찾기<input id="prod-q" type="search" maxlength="30" value="' + esc(ui.prodQ) + '" placeholder="약 이름·메모"></label>';
    h += '<div class="chips"><button type="button" class="chip" data-act="prod-kind" data-k="" aria-pressed="' + (!ui.prodKind) + '">전체</button>' + D.KINDS.map(function (k) {
      return '<button type="button" class="chip" data-act="prod-kind" data-k="' + k.key + '" aria-pressed="' + (ui.prodKind === k.key) + '">' + kindDot(k.key) + k.name + '</button>';
    }).join('') + '</div>';
    h += sortChips('product', 'prod-sort', ui.prodSort);
    var q = ui.prodQ.trim();
    var list = st.products.filter(function (p) {
      return (!ui.prodKind || p.kind === ui.prodKind) && (!q || p.name.indexOf(q) >= 0 || (p.memo || '').indexOf(q) >= 0);
    });
    h += '<div id="prod-list">' + productListHtml(st, L.sortProducts(st, list, ui.prodSort)) + '</div>';
    $('products-root').innerHTML = h;
  }
  function productListHtml(st, list) {
    if (!list.length) return emptyBox('search', '맞는 약 카드가 없어요', '찾는 말을 지우거나 다른 종류를 눌러 보세요.', '모두 보기', 'prod-all');
    return '<div class="list">' + list.map(function (p) {
      var total = 0;
      st.sprays.forEach(function (s) { s.items.forEach(function (it) { if (it.pid === p.id) total++; }); });
      return '<button type="button" class="list-row" data-act="open-product" data-id="' + esc(p.id) + '"><span class="lr-main"><b>' + kindDot(p.kind) + esc(p.name) + '</b><small>' + kindOf(p.kind).name + ' · ' + p.dil + '배 · 수확 ' + p.phi + '일 전까지 · ' + (p.max ? p.max + '회 이내' : '횟수 제한 없음') + ' · 쓴 횟수 ' + total + '</small></span><span class="lr-go" aria-hidden="true">›</span></button>';
    }).join('') + '</div>';
  }

  // ---------- 일지 ----------
  function renderLog(st, ui) {
    var ym = ui.logMonth;
    var y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7));
    var h = '<div class="titlebar"><button type="button" class="btn icon" data-act="log-prev" aria-label="지난달">‹</button><h2 class="title">' + y + '년 ' + m + '월 일지</h2><button type="button" class="btn icon" data-act="log-next" aria-label="다음 달">›</button></div>';
    var ms = L.monthStats(st, ym);
    h += '<div class="card stats"><div><b>' + ms.count + '</b><small>살포</small></div><div><b>' + ms.days + '</b><small>뿌린 날</small></div><div><b>' + L.fmtNum(ms.water) + '</b><small>물 L</small></div><div><b>' + ms.items + '</b><small>약 쓴 번</small></div></div>';
    if (ms.products.length) {
      var maxN = ms.products[0][1];
      h += '<div class="card"><h3>이 달 많이 쓴 약</h3>' + ms.products.slice(0, 5).map(function (r) {
        return '<div class="bar"><span>' + esc(r[0]) + '</span><i style="width:' + Math.round(r[1] / maxN * 100) + '%"></i><b>' + r[1] + '</b></div>';
      }).join('') + (ms.targets.length ? '<p class="sub">많이 잡은 것: ' + ms.targets.slice(0, 4).map(function (t) { return esc(t[0]) + ' ' + t[1]; }).join(' · ') + '</p>' : '') + '</div>';
    }
    h += '<div class="chips"><button type="button" class="chip" data-act="log-field" data-id="" aria-pressed="' + (!ui.logField) + '">모든 밭</button>' + st.fields.map(function (f) {
      return '<button type="button" class="chip" data-act="log-field" data-id="' + esc(f.id) + '" aria-pressed="' + (ui.logField === f.id) + '">' + esc(f.name) + '</button>';
    }).join('') + '</div>';
    h += '<label class="search">찾기<input id="log-q" type="search" maxlength="30" value="' + esc(ui.logQ) + '" placeholder="약·병해충·메모"></label>';
    h += sortChips('log', 'log-sort', ui.logSort);
    h += '<div id="log-list">' + logListHtml(st, ui) + '</div>';
    if (st.fields.length) h += '<button type="button" class="btn" data-act="print-log">이 달 일지 인쇄 (종이 한 장)</button>';
    $('log-root').innerHTML = h;
  }

  // ---------- 인쇄 (A-26: 밭별 수확 문 + 그 달 살포 기록을 A4 한 장에) ----------
  var PRINT_ROWS = 24, PRINT_FIELDS = 8;
  function printSheet(st, ui) {
    var now = L.today();
    var ym = ui.logMonth;
    var y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7));
    var pf = ui.logField ? L.findField(st, ui.logField) : null;
    var fields = pf ? [pf] : st.fields;
    var h = '<header class="p-head"><h1>Spray Gate 살포 일지 — ' + y + '년 ' + m + '월' + (pf ? ' · ' + esc(pf.name) : '') + '</h1><p>뽑은 날 ' + L.md(now) + ' (' + L.wday(now) + ') · 수확 문 = 약마다 (뿌린 날 + 라벨의 수확 전 날수) 가운데 가장 늦은 날</p></header>';
    h += '<h2>밭별 수확 문 (' + L.md(now) + ' 기준)</h2><table class="p-table"><thead><tr><th>밭</th><th>작물</th><th>수확 예정</th><th>수확 문</th><th>이번 작기 살포</th><th>판정</th></tr></thead><tbody>';
    if (!fields.length) h += '<tr><td colspan="6">밭이 없어요</td></tr>';
    fields.slice(0, PRINT_FIELDS).forEach(function (f) {
      var s = L.fieldStatus(st, f, now);
      h += '<tr><td>' + esc(f.name) + '</td><td>' + esc(f.crop) + '</td><td>' + (f.harvest ? L.md(f.harvest) : '-') + '</td><td>' +
        (s.earliest ? L.md(s.earliest) + (s.open ? ' 열림' : ' (D-' + s.daysLeft + ')') : '살포 없음') + '</td><td>' + L.seasonSprays(st, f.id).length + '회</td><td>' + (f.harvest ? vchip(s.verdict) : '-') + '</td></tr>';
    });
    h += '</tbody></table>';
    if (fields.length > PRINT_FIELDS) h += '<p class="p-more">밭 ' + (fields.length - PRINT_FIELDS) + '곳 더 있음 — 앱의 밭 화면에서 보세요</p>';
    var list = L.sortSprays(st, st.sprays.filter(function (s) {
      return s.date.slice(0, 7) === ym && (!pf || s.fieldId === pf.id);
    }), 'old');
    var ms = L.monthStats(st, ym);
    h += '<h2>살포 기록 ' + list.length + '건' + (pf ? '' : ' · 뿌린 날 ' + ms.days + '일 · 물 ' + L.fmtNum(ms.water) + 'L') + '</h2>';
    h += '<table class="p-table"><colgroup><col style="width:11%"><col style="width:15%"><col style="width:36%"><col style="width:12%"><col style="width:10%"><col style="width:16%"></colgroup><thead><tr><th>날짜</th><th>밭</th><th>약 (배수 · 한 통)</th><th>물</th><th>수확 문</th><th>대상·메모</th></tr></thead><tbody>';
    if (!list.length) h += '<tr><td colspan="6">이 달 살포 기록이 없어요</td></tr>';
    list.slice(0, PRINT_ROWS).forEach(function (s) {
      var f = L.findField(st, s.fieldId);
      var until = '';
      s.items.forEach(function (it) { var u = L.addDays(s.date, it.phi); if (u > until) until = u; });
      var note = (s.targets || []).join(', ') + (s.memo ? ((s.targets || []).length ? ' / ' : '') + s.memo : '');
      h += '<tr><td>' + L.md(s.date) + ' (' + L.wday(s.date) + ')</td><td>' + esc(f ? f.name : '지운 밭') + '</td><td>' + s.items.map(function (it) {
        return esc(it.name) + ' ' + it.dil + '배 ' + L.fmtNum(L.dose(s.water, it.dil)) + esc(it.unit || 'mL');
      }).join('<br>') + '</td><td>' + L.fmtNum(s.water) + 'L×' + (s.tanks || 1) + '</td><td>' + (until ? L.md(until) : '-') + '</td><td>' + esc(note) + '</td></tr>';
    });
    h += '</tbody></table>';
    if (list.length > PRINT_ROWS) h += '<p class="p-more">' + (list.length - PRINT_ROWS) + '건 더 있음 — 밭을 골라 거른 뒤 다시 뽑으면 한 장에 들어가요</p>';
    h += '<p class="p-foot">이 표는 사용자가 약 병 라벨에서 옮겨 적은 값으로 계산했어요. 라벨과 다르면 라벨을 따르세요. 확인한 사람: ____________</p>';
    $('print-sheet').innerHTML = h;
  }
  function sortChips(kind, act, cur) {
    return '<div class="chips sort" role="group" aria-label="정렬"><span class="sort-label">정렬</span>' + L.SORTS[kind].map(function (o) {
      return '<button type="button" class="chip" data-act="' + act + '" data-k="' + o[0] + '" aria-pressed="' + (cur === o[0]) + '">' + o[1] + '</button>';
    }).join('') + '</div>';
  }
  function logListHtml(st, ui) {
    if (!st.sprays.length) return emptyBox('log', '일지가 비었어요', '살포를 저장하면 날짜·약·물 양이 여기 쌓여요.', '살포 기록하기', 'go', ' data-to="spray"');
    var q = ui.logQ.trim();
    var list = st.sprays.filter(function (s) {
      if (s.date.slice(0, 7) !== ui.logMonth) return false;
      if (ui.logField && s.fieldId !== ui.logField) return false;
      if (!q) return true;
      var hay = s.items.map(function (i) { return i.name; }).join(' ') + ' ' + (s.targets || []).join(' ') + ' ' + (s.memo || '');
      return hay.indexOf(q) >= 0;
    });
    list = L.sortSprays(st, list, ui.logSort);
    if (!list.length) return emptyBox('search', '이 달에 맞는 기록이 없어요', '다른 달로 넘기거나 거르기를 풀어 보세요.', '거르기 풀기', 'log-reset');
    return '<div class="list">' + list.map(function (s) { return recordRow(st, s); }).join('') + '</div>';
  }

  // ---------- 더보기 ----------
  function renderMore(st) {
    var S = st.settings;
    var h = '<h2 class="title">더보기</h2>';
    h += '<form id="form-settings" class="card form" novalidate><h3>계산 기준</h3>';
    h += '<label>기본 한 통 물 (L)<select id="set-tank">' + D.TANKS.map(function (t) { return '<option value="' + t + '"' + (S.tank === t ? ' selected' : '') + '>' + t + 'L</option>'; }).join('') + '</select></label>';
    h += '<label>여유 날수 (수확 문과 수확 예정 사이가 이보다 짧으면 빠듯)<input id="set-margin" type="number" inputmode="numeric" min="0" max="14" step="1" value="' + S.margin + '"></label>' + errBox('set-margin');
    h += '<label>10a(1000㎡)당 물 양 (L) — 면적으로 채우기에 써요<input id="set-per10a" type="number" inputmode="numeric" min="10" max="2000" step="10" value="' + S.per10a + '"></label>' + errBox('set-per10a');
    h += '<button type="submit" class="btn primary">기준 저장</button></form>';
    h += '<div class="card"><h3>보기</h3><div class="toggles">' +
      toggle('big', '글자 크게', S.big) + toggle('calm', '움직임 줄이기', S.calm) + toggle('sound', '효과음', S.sound) + toggle('dark', '어두운 화면', S.dark) + '</div></div>';
    h += '<div class="card"><h3>기록</h3><div class="btn-grid">' +
      '<button type="button" class="btn" data-act="open-backup">내보내기·가져오기</button>' +
      (st.sample ? '<button type="button" class="btn" data-act="sample-remove">예시 빼기</button>' : '<button type="button" class="btn" data-act="sample-add">예시 넣어 보기</button>') +
      '<button type="button" class="btn danger" data-act="clear-all">전체 지우기</button>' +
      '<button type="button" class="btn" data-act="self-test">계산 점검</button></div><div id="test-out"></div></div>';
    h += '<div class="card info"><h3>정보</h3><p>Spray Gate · 판 1.0</p><p>기록은 이 기기 브라우저에만 저장돼요. 어디로도 보내지 않아요.</p>' +
      '<p>판정은 사용자가 라벨에서 옮겨 적은 약 카드(희석배수·수확 전 날수·횟수)와 살포 기록으로만 계산해요. 이 앱에는 농약 등록 정보가 들어 있지 않아요. 라벨과 다르면 라벨을 따르세요.</p>' +
      '<p>근거: 「농약관리법」의 안전사용기준(라벨 표시), 식품의약품안전처 농약 허용물질목록 관리제도(PLS, 2019년 1월 1일 전면 시행).</p>' +
      '<p>기본 내용 ' + L.countContent() + '개 (작물 ' + D.CROPS.length + ' · 병해충 ' + D.PESTS.length + ' · 배수 ' + D.DILUTIONS.length + ' · 통 ' + D.TANKS.length + ' · 약 종류 ' + D.KINDS.length + ' · 안전 점검 ' + D.SAFETY.length + ' · 쓰는 순서 ' + D.STEPS.length + ' · 요령 ' + D.TIPS.length + ' · 날씨 ' + D.WEATHER.length + ')</p></div>';
    $('more-root').innerHTML = h;
  }
  function toggle(k, label, on) {
    return '<button type="button" class="toggle" data-act="toggle" data-k="' + k + '" aria-pressed="' + !!on + '"><span>' + label + '</span><i aria-hidden="true"></i></button>';
  }
  function testsHtml(T) {
    var ok = T.filter(function (t) { return t.ok; }).length;
    return '<p class="' + (ok === T.length ? 'ok-text' : 'err') + '">' + ok + '/' + T.length + ' 맞음</p><ul class="tests">' + T.map(function (t) {
      return '<li class="' + (t.ok ? 'ok' : 'no') + '">' + (t.ok ? '✓ ' : '✕ ') + esc(t.label) + ': ' + esc(t.got) + (t.ok ? '' : ' (기대 ' + esc(t.want) + ')') + '</li>';
    }).join('') + '</ul>';
  }

  // ---------- 방법 ----------
  function renderHelp() {
    var h = '<h2 class="title">방법</h2><div class="card"><h3>쓰는 순서</h3><ol class="steps">' + D.STEPS.map(function (s) {
      return '<li><b>' + esc(s.t) + '</b><p>' + esc(s.d) + '</p></li>';
    }).join('') + '</ol></div>';
    h += '<div class="card"><h3>판정 읽기</h3>' + verdictBand('ok', '괜찮음 — 수확 예정 전에 수확 문이 열리고 여유 날수도 남아요') +
      verdictBand('tight', '빠듯 — 수확 문이 열리긴 하지만 여유가 여유 날수보다 짧아요') +
      verdictBand('bad', '불가 — 수확 예정보다 수확 문이 늦게 열리거나, 라벨 횟수를 넘겨요') +
      '<p class="sub">수확 문 = 이번 작기에 친 약마다 (뿌린 날 + 라벨의 수확 전 날수) 가운데 가장 늦은 날이에요.</p></div>';
    h += '<div class="card"><h3>꼭 알아 둘 것</h3><p>이 앱은 계산을 돕는 기록장이에요. 약의 등록 작물·희석배수·수확 전 날수·횟수는 약 병 라벨이 기준이에요. 카드는 라벨을 그대로 옮겨 적어 주세요.</p><p>기록은 이 기기 브라우저에만 저장돼요. 어디로도 보내지 않아요.</p></div>';
    h += '<div class="card"><h3>요령 ' + D.TIPS.length + '</h3><ul class="tips">' + D.TIPS.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>';
    $('help-root').innerHTML = h;
  }

  // ---------- 시트 ----------
  function fieldSheet(st, f) {
    var e = f || { id: '', name: '', crop: '', start: L.today(), harvest: '', area: '', memo: '' };
    var h = '<h2>' + (f ? '밭 고치기' : '새 밭') + '</h2><form id="form-field" class="form" novalidate>';
    h += '<label>밭 이름<input id="f-name" type="text" maxlength="30" value="' + esc(e.name) + '" placeholder="예: 앞밭 1동" required></label>' + errBox('f-name');
    h += '<label>작물<input id="f-crop" type="text" maxlength="20" list="crop-list" value="' + esc(e.crop) + '" placeholder="예: 상추" required></label><datalist id="crop-list">' + D.CROPS.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist>' + errBox('f-crop');
    h += '<div class="chips small">' + D.CROPS.slice(0, 12).map(function (c) { return '<button type="button" class="chip" data-act="f-crop" data-v="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div>';
    h += '<div class="row2"><label>작기 시작일<input id="f-start" type="date" value="' + esc(e.start) + '"></label><label>수확 예정일<input id="f-harvest" type="date" value="' + esc(e.harvest) + '"></label></div>' + errBox('f-start') + errBox('f-harvest');
    h += '<label>면적 (㎡, 몰라도 돼요)<input id="f-area" type="number" inputmode="numeric" min="0" max="1000000" step="1" value="' + esc(e.area || '') + '"></label>' + errBox('f-area');
    h += '<label>메모<input id="f-memo" type="text" maxlength="60" value="' + esc(e.memo || '') + '"></label>' + errBox('f-memo');
    h += '<input type="hidden" id="f-id" value="' + esc(e.id) + '">';
    h += '<div class="row2"><button type="button" class="btn" data-act="close-sheet">닫기</button><button type="submit" class="btn primary">저장</button></div>';
    if (f) h += '<button type="button" class="btn danger" data-act="field-del" data-id="' + esc(f.id) + '">이 밭과 기록 지우기</button>';
    $('field-root').innerHTML = h + '</form>';
  }

  function productSheet(st, p) {
    var e = p || { id: '', name: '', kind: 'fung', dil: 1000, unit: 'mL', phi: 7, max: 3, memo: '' };
    var h = '<h2>' + (p ? '약 카드 고치기' : '새 약 카드') + '</h2><p class="sub">약 병 라벨을 보고 그대로 옮겨 적어요.</p><form id="form-product" class="form" novalidate>';
    h += '<label>약 이름 (라벨 이름 또는 내가 부르는 이름)<input id="p-name" type="text" maxlength="30" value="' + esc(e.name) + '" required></label>' + errBox('p-name');
    h += '<fieldset><legend>종류</legend><div class="chips">' + D.KINDS.map(function (k) {
      return '<button type="button" class="chip" data-act="p-kind" data-k="' + k.key + '" aria-pressed="' + (e.kind === k.key) + '">' + kindDot(k.key) + k.name + '</button>';
    }).join('') + '</div><input type="hidden" id="p-kind" value="' + esc(e.kind) + '"></fieldset>';
    h += '<fieldset><legend>희석배수</legend><div class="chips">' + D.DILUTIONS.map(function (d) {
      return '<button type="button" class="chip" data-act="p-dil" data-v="' + d + '" aria-pressed="' + (Number(e.dil) === d) + '">' + d + '배</button>';
    }).join('') + '</div><div class="row2"><label>배수<input id="p-dil" type="number" inputmode="numeric" min="1" max="10000" step="1" value="' + esc(e.dil) + '"></label><label>단위<select id="p-unit"><option value="mL"' + (e.unit === 'mL' ? ' selected' : '') + '>mL (물약)</option><option value="g"' + (e.unit === 'g' ? ' selected' : '') + '>g (가루약)</option></select></label></div>' + errBox('p-dil') + '</fieldset>';
    h += '<div class="row2"><label>수확 며칠 전까지<input id="p-phi" type="number" inputmode="numeric" min="0" max="365" step="1" value="' + esc(e.phi) + '"></label><label>몇 회 이내 (0 = 없음)<input id="p-max" type="number" inputmode="numeric" min="0" max="50" step="1" value="' + esc(e.max) + '"></label></div>' + errBox('p-phi') + errBox('p-max');
    h += '<label>메모 (성분·작물별 날수 등)<input id="p-memo" type="text" maxlength="80" value="' + esc(e.memo || '') + '"></label>' + errBox('p-memo');
    h += '<input type="hidden" id="p-id" value="' + esc(e.id) + '">';
    h += '<div class="row2"><button type="button" class="btn" data-act="close-sheet">닫기</button><button type="submit" class="btn primary">저장</button></div>';
    if (p) h += '<button type="button" class="btn danger" data-act="product-del" data-id="' + esc(p.id) + '">이 약 카드 지우기</button>';
    $('product-root').innerHTML = h + '</form>';
  }

  function gateSheet(st, ui) {
    var h = '<h2>출하 판정</h2><form id="form-gate" class="form" novalidate><div class="row2"><label>밭<select id="g-field">' + st.fields.map(function (f) {
      return '<option value="' + esc(f.id) + '"' + (f.id === ui.gateField ? ' selected' : '') + '>' + esc(f.name) + '</option>';
    }).join('') + '</select></label><label>수확할 날<input id="g-date" type="date" value="' + esc(ui.gateDate) + '"></label></div>' + errBox('g-date') +
      '<button type="submit" class="btn primary">판정</button></form><div id="gate-out">' + gateOutHtml(st, ui) + '</div>' +
      '<button type="button" class="btn" data-act="close-sheet">닫기</button>';
    $('gate-root').innerHTML = h;
  }
  function gateOutHtml(st, ui) {
    var f = L.findField(st, ui.gateField);
    if (!f || !L.validDate(ui.gateDate)) return '';
    var r = L.checkHarvest(st, f.id, ui.gateDate);
    var h = verdictBand(r.verdict, L.md(ui.gateDate) + ' 수확 — ' + L.VERDICT[r.verdict] + (r.earliest ? ' (수확 문 ' + L.md(r.earliest) + ')' : ''), r.reasons);
    if (r.rows.length) h += '<table class="dose"><thead><tr><th>약</th><th>뿌린 날</th><th>열림</th><th>여유</th></tr></thead><tbody>' + r.rows.map(function (x) {
      return '<tr><td>' + esc(x.name) + '</td><td>' + L.md(x.date) + '</td><td>' + L.md(x.until) + '</td><td>' + vchip(x.v) + ' ' + x.margin + '일</td></tr>';
    }).join('') + '</tbody></table>';
    if (st.products.length) {
      var today = L.today();
      var safe = L.safeProducts(st, f.id, today);
      h += '<h3 class="sec">오늘(' + L.md(today) + ') 이 밭에 친다면</h3><ul class="plan-rows">' + safe.map(function (x) {
        var row = x.r.rows[0];
        return '<li>' + vchip(x.r.verdict === 'none' ? 'ok' : x.r.verdict) + '<span>' + esc(x.p.name) + (row ? ' — ' + L.md(row.until) + ' 부터 수확 · ' + row.after + (row.max ? '/' + row.max : '') + '회째' : '') + '</span></li>';
      }).join('') + '</ul>';
    }
    return h;
  }

  function recordSheet(st, s) {
    var f = L.findField(st, s.fieldId);
    var tanks = s.tanks || 1;
    var h = '<h2>' + L.md(s.date) + ' (' + L.wday(s.date) + ') 살포</h2><p class="sub">' + esc(f ? f.name + ' · ' + f.crop : '지운 밭') + ' · 한 통 ' + L.fmtNum(s.water) + 'L × ' + tanks + '통</p>';
    h += '<table class="dose"><thead><tr><th>약</th><th>배수</th><th>한 통</th><th>수확 문</th></tr></thead><tbody>' + s.items.map(function (it) {
      return '<tr><td>' + esc(it.name) + '</td><td>' + it.dil + '배</td><td>' + L.fmtNum(L.dose(s.water, it.dil)) + esc(it.unit || 'mL') + '</td><td>' + L.md(L.addDays(s.date, it.phi)) + '</td></tr>';
    }).join('') + '</tbody></table>';
    if (s.targets && s.targets.length) h += '<p>대상: ' + s.targets.map(esc).join(', ') + '</p>';
    if (s.weather && s.weather.length) h += '<p>날씨·때: ' + s.weather.map(esc).join(', ') + '</p>';
    if (s.memo) h += '<p>메모: ' + esc(s.memo) + '</p>';
    h += '<p class="sub">안전 점검 ' + (s.safety || 0) + '/' + D.SAFETY.length + '</p>';
    h += '<div class="btn-grid"><button type="button" class="btn primary" data-act="record-again" data-id="' + esc(s.id) + '">같은 약으로 오늘 다시</button><button type="button" class="btn" data-act="record-edit" data-id="' + esc(s.id) + '">고치기</button><button type="button" class="btn danger" data-act="record-del" data-id="' + esc(s.id) + '">지우기</button><button type="button" class="btn" data-act="close-sheet">닫기</button></div>';
    $('record-root').innerHTML = h;
  }

  function safetySheet(dr) {
    var groups = [];
    D.SAFETY.forEach(function (s, i) {
      if (!groups.length || groups[groups.length - 1].g !== s.g) groups.push({ g: s.g, items: [] });
      groups[groups.length - 1].items.push({ t: s.t, i: i });
    });
    var h = '<h2>뿌리기 전 안전 점검</h2><p class="sub" id="safety-count">' + dr.safety.length + '/' + D.SAFETY.length + ' 확인</p>';
    groups.forEach(function (g) {
      h += '<h3 class="sec">' + esc(g.g) + '</h3><div class="checks">' + g.items.map(function (x) {
        return '<button type="button" class="check" data-act="safe-toggle" data-i="' + x.i + '" aria-pressed="' + (dr.safety.indexOf(x.i) >= 0) + '"><i aria-hidden="true"></i>' + esc(x.t) + '</button>';
      }).join('') + '</div>';
    });
    h += '<div class="row2"><button type="button" class="btn" data-act="safe-all">모두 확인</button><button type="button" class="btn primary" data-act="close-sheet">다 봤어요</button></div>';
    $('safety-root').innerHTML = h;
  }

  function backupSheet(st) {
    var h = '<h2>내보내기·가져오기</h2><h3 class="sec">내보내기</h3><p class="sub">밭·약 카드·일지·설정 전부를 글로 만들어요. 복사해 메모장이나 나에게 보내기에 붙여 두세요.</p>';
    h += '<textarea id="export-text" rows="5" readonly>' + esc(window.Store.exportText(st)) + '</textarea><button type="button" class="btn" data-act="copy-export">글 복사</button>';
    h += '<h3 class="sec">가져오기</h3><form id="form-backup" class="form" novalidate><label>내보낸 글 붙여 넣기<textarea id="restore-text" rows="5" placeholder="내보내기에서 복사한 글을 여기에 붙여 넣어요"></textarea></label>' + errBox('restore-text') +
      '<p class="sub">가져오면 지금 기록이 그 글의 기록으로 바뀌어요 (되돌리기 가능).</p><button type="submit" class="btn primary">되살리기</button></form><button type="button" class="btn" data-act="close-sheet">닫기</button>';
    $('backup-root').innerHTML = h;
  }

  window.UI = {
    esc: esc, show: show, openSheet: openSheet, closeSheet: closeSheet, sheetOpen: sheetOpen, openOverlay: openOverlay, closeOverlay: closeOverlay,
    transit: transit, animateIn: animateIn, toast: toast, flash: flash, fieldErr: fieldErr, clearErrs: clearErrs,
    renderToday: renderToday, renderSpray: renderSpray, sprayCalcHtml: sprayCalcHtml, renderFields: renderFields, renderProducts: renderProducts,
    productListHtml: productListHtml, renderLog: renderLog, logListHtml: logListHtml, printSheet: printSheet, renderMore: renderMore, testsHtml: testsHtml, renderHelp: renderHelp,
    fieldSheet: fieldSheet, productSheet: productSheet, gateSheet: gateSheet, gateOutHtml: gateOutHtml, recordSheet: recordSheet, safetySheet: safetySheet, backupSheet: backupSheet
  };
})();
