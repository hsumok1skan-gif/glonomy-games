// 한끼 계산기 — 화면 그리기 (상태를 읽어 HTML 을 만든다. 상태는 바꾸지 않는다)

function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function won(n) {
  if (n == null || !isFinite(n)) return '—';
  return Math.round(n).toLocaleString('ko-KR') + '원';
}
function pct(n) {
  if (n == null || !isFinite(n)) return '—';
  return (Math.round(n * 10) / 10).toFixed(1) + '%';
}
function signPct(n) {
  if (n == null) return '처음 값';
  if (n > 0.05) return '▲ ' + pct(n);
  if (n < -0.05) return '▼ ' + pct(-n);
  return '그대로';
}
function fmtQty(q) { return (Math.round(q * 100) / 100).toLocaleString('ko-KR', { maximumFractionDigits: 2 }); }

function S() { return App.state.settings; }
function ingById(id) {
  var list = App.state.ingredients;
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return null;
}
function menuById(id) {
  var list = App.state.menus;
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return null;
}
function usedBy(ingId) {
  return App.state.menus.filter(function (m) { return m.lines.some(function (l) { return l.ingId === ingId; }); });
}
function byName(a, b) { return a.name.localeCompare(b.name, 'ko'); }
function sortedIngs() { return App.state.ingredients.slice().sort(byName); }

// 집밥 메뉴 하나의 한 끼 값·사 먹는 값 대비 %·아낀 돈. finder 를 넘기면 바뀐 재료로 미리 계산한다.
function menuInfo(m, finder) {
  var s = S();
  var r = Calc.menuCost(m, finder || ingById);
  var rate = Calc.costRate(r.cost, m.price);
  return {
    cost: r.cost, extra: r.extra, missing: r.missing, parts: r.parts, rate: rate,
    level: Calc.level(rate, s),
    margin: Calc.savedOf(r.cost, m.price)
  };
}

// ---------- 챌린지 ----------
function activeChal() {
  var list = App.state.challenges;
  for (var i = list.length - 1; i >= 0; i--) if (list[i].status === 'active') return list[i];
  return null;
}
function chalById(id) {
  var list = App.state.challenges;
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return null;
}
function spendById(id) {
  var list = App.state.spends;
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return null;
}
function spendsIn(ch) {
  return App.state.spends.filter(function (x) { return Calc.inPeriod(x.date, ch.start, ch.end); });
}
function spentIn(ch, extra) {
  return spendsIn(ch).reduce(function (a, x) { return a + x.amount; }, 0) + (extra || 0);
}
function mealsIn(ch) {
  return App.state.meals.filter(function (x) { return Calc.inPeriod(x.date, ch.start, ch.end); });
}
// extra: 아직 저장하지 않은 돈(미리보기). 끝난 챌린지는 끝날 때 센 값을 쓴다.
function chalInfo(ch, extra) {
  var spent = ch.status !== 'active' && ch.spent != null && !extra ? ch.spent : spentIn(ch, extra);
  var st = Calc.challengeState(ch.budget, spent, ch.start, ch.end, Calc.today());
  st.spent = spent;
  return st;
}
function kindIcon(k) {
  for (var i = 0; i < SPEND_KINDS.length; i++) if (SPEND_KINDS[i].key === k) return SPEND_KINDS[i].icon;
  return '🧾';
}
var PACE_TEXT = { good: '여유 있음', mid: '조금 빠름', bad: '목표 넘음' };
var STATUS_TEXT = { active: '진행 중', won: '성공', lost: '실패', quit: '그만둠' };
function paceLine(ch, st) {
  if (st.upcoming) return Calc.shortDay(ch.start) + '에 시작한다. 그 전 식비는 세지 않는다.';
  if (st.pace === 'bad') return '목표보다 ' + won(-st.left) + ' 더 썼다. 남은 ' + st.daysLeft + '일은 집밥으로 버텨 보자.';
  if (st.pace === 'mid') return '고르게 썼다면 지금까지 ' + won(st.expected) + '. ' + won(st.spent - st.expected) + ' 빠르다.';
  return '고르게 썼다면 지금까지 ' + won(st.expected) + '. ' + won(st.expected - st.spent) + ' 여유가 있다.';
}
// 숫자를 from 에서 to 로 굴리며 won() 글로 바꾼다 (300~800ms, 움직임 줄이기면 바로)
function animateNumber(el, from, to, ms) {
  if (!el) return;
  cancelAnimationFrame(el._numRaf);
  if (!isFinite(from) || !isFinite(to) || from === to || reduced()) { el.textContent = won(to); return; }
  ms = Math.max(300, Math.min(800, ms || 600));
  var t0 = null;
  el.textContent = won(from);
  el.classList.add('rolling');
  function step(now) {
    if (t0 == null) t0 = now;
    var k = Math.min(1, (now - t0) / ms);
    var e = 1 - Math.pow(1 - k, 3); // 끝에서 천천히
    el.textContent = won(k < 1 ? from + (to - from) * e : to);
    if (k < 1) el._numRaf = requestAnimationFrame(step);
    else el.classList.remove('rolling');
  }
  el._numRaf = requestAnimationFrame(step);
}
function numAttr(n) { return n != null && isFinite(n) ? String(Math.round(n)) : ''; }
// 챌린지 하루 기준: 목표를 기간 날 수로 나눈 값(원 아래 버림)
function dayBase(ch) { return Math.floor(ch.budget / Calc.periodDays(ch.start, ch.end)); }
// 챌린지 기간의 날마다 그날 쓴 돈 합과 하루 기준을 견준다: good(기준 이하)·bad(넘음)·future(오늘 뒤)
function chalDays(ch) {
  var base = dayBase(ch), today = Calc.today(), sums = {};
  spendsIn(ch).forEach(function (x) { sums[x.date] = (sums[x.date] || 0) + x.amount; });
  var out = [], total = Calc.periodDays(ch.start, ch.end);
  for (var i = 0; i < total; i++) {
    var d = Calc.addDays(ch.start, i), spent = sums[d] || 0;
    out.push({ date: d, spent: spent, today: d === today, state: d > today ? 'future' : spent <= base ? 'good' : 'bad' });
  }
  return out;
}
// 오늘(챌린지가 끝났으면 마지막 날)부터 거꾸로 이어진 good 날 수. 오늘을 넘었으면 0
function streakOf(ch, days) {
  days = days || chalDays(ch);
  var today = Calc.today();
  if (today < ch.start) return 0;
  var i = Math.min(days.length, Calc.daysBetween(ch.start, today) + 1) - 1, n = 0;
  for (; i >= 0 && days[i].state === 'good'; i--) n++;
  return n;
}
var STREAK_MARKS = [3, 7, 14];
var DAY_TEXT = { good: '지킴', bad: '넘음', future: '아직' };
// 챌린지 화면의 날짜 판: 기간 날 수만큼 칸, 지킨 날 초록·넘은 날 빨강·남은 날 옅게, 오늘은 테두리
function chalDaysHtml(ch) {
  var days = chalDays(ch), base = dayBase(ch);
  var good = days.filter(function (d) { return d.state === 'good'; }).length;
  var bad = days.filter(function (d) { return d.state === 'bad'; }).length;
  return '<div class="card chal-board"><h3>날짜 판 <small>하루 기준 ' + won(base) + '</small></h3>' +
    '<ol class="chal-days">' + days.map(function (d, i) {
      var p = d.date.split('-'), label = i === 0 || p[2] === '01' ? (+p[1]) + '/' + (+p[2]) : String(+p[2]);
      return '<li class="day ' + d.state + (d.today ? ' today' : '') + '" aria-label="' + Calc.shortDay(d.date) + (d.today ? ' 오늘' : '') + ' ' + DAY_TEXT[d.state] +
        (d.state === 'future' ? '' : ' ' + won(d.spent)) + '"' + (d.today ? ' aria-current="date"' : '') + '>' + label + '</li>';
    }).join('') + '</ol>' +
    '<p class="hint day-legend"><span class="dot good"></span>지킨 날 ' + good + ' · <span class="dot bad"></span>넘은 날 ' + bad +
      ' · <span class="dot future"></span>남은 날 ' + (days.length - good - bad) + '</p></div>';
}
function streakLine(ch, st) {
  if (st.upcoming || st.ended) return '';
  var n = streakOf(ch);
  return '<p class="streak-line">' + (n > 0 ? '🔥 ' + n + '일 연속 지킴 <small>하루 ' + won(dayBase(ch)) + ' 이하</small>'
    : '오늘 하루 기준 ' + won(dayBase(ch)) + '을 넘었다. 내일 다시 연속을 쌓자') + '</p>';
}
// 진행 중 챌린지 카드 (오늘·챌린지 화면이 같이 쓴다)
// App.chalFrom: 저장 직전 값. 있으면 data-from 에 넣어 그린 뒤 rollChalNums 가 굴린다.
function chalCard(ch, big) {
  var st = chalInfo(ch);
  var f = App.chalFrom && App.chalFrom.id === ch.id ? App.chalFrom : { left: st.left, perDay: st.perDay, usedPct: st.usedPct };
  var meals = mealsIn(ch);
  var saved = meals.reduce(function (a, x) { return a + Math.max(0, x.out - x.cost); }, 0);
  return '<div class="card chal pace-' + st.pace + '">' +
    '<div class="chal-head"><h3>🎯 ' + esc(ch.name) + '</h3><small>' + Calc.shortDay(ch.start) + ' ~ ' + Calc.shortDay(ch.end) +
      (st.upcoming ? ' · 곧 시작' : ' · ' + st.passed + '/' + st.total + '일째') + '</small></div>' +
    '<div class="chal-big"><span><small>남은 돈</small><b class="' + (st.left < 0 ? 'warn-text' : '') + '" data-from="' + numAttr(f.left) + '" data-to="' + numAttr(st.left) + '">' + won(st.left) + '</b></span>' +
      '<span><small>오늘 쓸 수 있는 돈</small><b data-from="' + numAttr(f.perDay) + '" data-to="' + numAttr(st.perDay) + '">' + won(st.perDay) + '</b></span></div>' +
    '<div class="chal-meter" aria-hidden="true"><i class="used lv-' + st.pace + '" data-from="' + Math.min(100, f.usedPct || 0) + '" data-to="' + Math.min(100, st.usedPct) + '" style="width:' + Math.min(100, st.usedPct) + '%"></i><b class="time" style="left:' + Math.min(100, st.timePct) + '%"></b></div>' +
    '<p class="hint">' + won(st.spent) + ' / ' + won(ch.budget) + ' (' + pct(st.usedPct) + ') · <span class="badge lv-' + st.pace + '">' + PACE_TEXT[st.pace] + '</span></p>' +
    '<p class="pace-line">' + paceLine(ch, st) + '</p>' +
    streakLine(ch, st) +
    (big || meals.length ? '<p class="hint">🍳 집밥 ' + meals.length + '끼 · 사 먹었으면 ' + won(saved) + ' 더 들었다</p>' : '') +
    (big ? '' : '<div class="btn-row">' + btn({ act: 'spend-new', label: '+ 식비 쓰기', cls: 'small primary' }) + btn({ act: 'go', label: '챌린지 보기', cls: 'small', data: { to: 'chal' } }) + '</div>') +
  '</div>';
}
function spendRow(x) {
  return '<div class="row' + flashCls(x.id) + '" data-row="' + x.id + '">' +
    '<button type="button" class="row-main" data-act="spend-edit" data-id="' + x.id + '">' +
      '<span class="row-title">' + kindIcon(x.kind) + ' ' + esc(x.kind) + ' <b class="amt">' + won(x.amount) + '</b></span>' +
      '<span class="row-sub">' + Calc.shortDay(x.date) + (x.memo ? ' · ' + esc(x.memo) : '') + '</span>' +
    '</button>' +
  '</div>';
}
// 먹은 집밥 한 줄 (챌린지 화면·메뉴 자세히가 같이 쓴다)
function mealRow(x) {
  var saved = Math.max(0, x.out - x.cost);
  return '<div class="row compact" data-row="' + x.id + '"><span class="row-main static">' +
      '<span class="row-title">🍳 ' + esc(x.name) + '</span>' +
      '<span class="row-sub">' + Calc.shortDay(x.date) + ' · 한 끼 ' + won(x.cost) + (saved > 0 ? ' · ' + won(saved) + ' 아낌' : '') + '</span>' +
    '</span>' +
    btn({ act: 'meal-del', label: '지우기', cls: 'row-btn', data: { id: x.id }, aria: Calc.shortDay(x.date) + ' ' + x.name + ' 먹은 기록 지우기' }) +
  '</div>';
}
function mealList(list, max) {
  var sorted = list.slice().sort(function (a, b) { return b.date.localeCompare(a.date) || b.id.localeCompare(a.id); });
  return sorted.slice(0, max).map(mealRow).join('') +
    (sorted.length > max ? '<p class="hint">최근 ' + max + '끼만 보인다. 나머지 ' + (sorted.length - max) + '끼는 챌린지 기간 요약에 들어 있다.</p>' : '');
}

function unitText(dim) { return dim === 'w' ? '100g당' : dim === 'v' ? '100ml당' : '개당'; }
function unitPriceShown(up, unit) {
  if (up == null) return null;
  return Calc.dimOf(unit) === 'c' ? up : up * 100;
}
function unitPriceText(ing) {
  var up = Calc.unitPrice(ing);
  if (up == null) return '값 없음';
  return unitText(Calc.dimOf(ing.buyUnit)) + ' ' + won(unitPriceShown(up, ing.buyUnit));
}
function buyText(ing) {
  return fmtQty(ing.buyQty) + ing.buyUnit + (Calc.hasPrice(ing) ? ' ' + won(ing.price) : '');
}

var LEVEL_TEXT = { good: '알뜰', mid: '보통', bad: '비쌈', none: '사 먹는 값 없음' };
function rateBadge(info) {
  return '<span class="badge lv-' + info.level + '">' + pct(info.rate) + ' ' + LEVEL_TEXT[info.level] + '</span>';
}
function isStale(ing) {
  return !!ing.updated && Calc.daysBetween(ing.updated, Calc.today()) > S().staleDays;
}
function flashCls(id) { return App.flash && App.flash === id ? ' flash' : ''; }

function btn(o) {
  var attrs = ' data-act="' + o.act + '"';
  if (o.data) Object.keys(o.data).forEach(function (k) { attrs += ' data-' + k + '="' + esc(o.data[k]) + '"'; });
  if (o.aria) attrs += ' aria-label="' + esc(o.aria) + '"';
  return '<button type="button" class="' + (o.cls || '') + '"' + attrs + '>' + o.label + '</button>';
}
function emptyBox(art, title, text, buttons) {
  return '<div class="empty"><div class="empty-art" aria-hidden="true">' + art + '</div><h3>' + title + '</h3><p>' + text + '</p>' +
    '<div class="empty-btns">' + buttons.map(btn).join('') + '</div></div>';
}

// 빈 화면 그림: 사람 그림 assets/한끼_계산기_2.png 한 장을 3칸×2줄로 잘라 쓴다 (style.css .art-img.six)
var ART = {
  bowl: '<span class="art-img six c1"></span>',   // 밥그릇·계산기·동전
  chal: '<span class="art-img six c2"></span>',   // 달력·과녁
  spend: '<span class="art-img six c3"></span>',  // 장바구니·배달 상자·영수증
  ing: '<span class="art-img six c4"></span>',    // 당근·양파·달걀·쌀
  menu: '<span class="art-img six c5"></span>',   // 볶음밥·밥·젓가락 쟁반
  hist: '<span class="art-img six c6"></span>',   // 오르는 선 영수증
  // assets/한끼_계산기_3.png 왼쪽 반 빈 냉장고, 오른쪽 반 사진 없음 (style.css .art-img.two)
  fridgeEmpty: '<span class="art-img two left"></span>',
  noPhoto: '<span class="art-img two right"></span>',
  search: '<span class="emoji-art">🔍</span>'
};

// 처음 5분 시작 단계 (R-03): 챌린지 → 첫 식비 → 메뉴 예시 → 장 본 값. 예시 자취방(sample) 식비·값 기록은 직접 한 것으로 세지 않는다
function startSteps() {
  var st = App.state;
  function mine(list) { return list.some(function (x) { return !x.sample; }); }
  return [
    { key: 'chal', title: '챌린지 고르기', text: '\'한 달 10만원\'처럼 기간과 목표를 정한다',
      done: st.challenges.length > 0, act: 'chal-open', btn: { act: 'chal-open', label: '고르기' } },
    { key: 'spend', title: '첫 식비 넣기', text: '오늘 밥에 쓴 돈 하나면 남은 돈이 나온다',
      done: mine(st.spends), act: 'spend-new', btn: { act: 'spend-new', label: '넣기' } },
    { key: 'menu', title: '메뉴 예시 하나 넣기', text: '자취 집밥 ' + MENU_TEMPLATES.length + '개 가운데 하나를 고른다',
      done: st.menus.length > 0, act: 'tpl-open menu', btn: { act: 'tpl-open', label: '고르기', data: { tab: 'menu' } } },
    { key: 'price', title: '장 본 값 넣기', text: '산 값을 넣으면 한 끼 값과 남은 돈이 다시 계산된다',
      done: mine(st.history), act: 'price-open', btn: { act: 'price-open', label: '넣기' } }
  ];
}
// 냉장고·식비 화면 맨 위 카드. 네 단계를 다 하면 그리지 않는다
function startCardHtml() {
  var steps = startSteps();
  var n = steps.filter(function (s) { return s.done; }).length;
  if (n === steps.length) return '';
  var next = steps.filter(function (s) { return !s.done; })[0];
  return '<div class="card start-card" role="group" aria-label="처음 5분 시작 단계">' +
    '<div class="start-head"><h3>처음 5분, 네 단계면 된다</h3><small>' + n + ' / ' + steps.length + '</small></div>' +
    '<div class="start-meter" role="progressbar" aria-valuemin="0" aria-valuemax="' + steps.length + '" aria-valuenow="' + n + '" aria-label="시작 단계 ' + n + '개 끝냄">' +
      '<i style="width:' + Math.round(n / steps.length * 100) + '%"></i></div>' +
    '<ol class="start-steps">' + steps.map(function (s, i) {
      var cls = s.done ? ' done' : s === next ? ' next' : '';
      return '<li class="start-step' + cls + '" data-step="' + s.key + '">' +
        '<span class="start-no" aria-hidden="true">' + (s.done ? '✓' : i + 1) + '</span>' +
        '<span class="todo-tx"><b>' + s.title + (s.done ? ' <small class="sr">끝냄</small>' : '') + '</b><small>' + s.text + '</small></span>' +
        (s.done ? '<span class="badge soft">끝</span>'
          : btn(Object.assign({}, s.btn, { cls: 'small' + (s === next ? ' primary' : ''), aria: s.title + ' ' + s.btn.label }))) +
      '</li>';
    }).join('') + '</ol></div>';
}

// ---------- 1. 오늘 ----------
function renderHome() {
  var st = App.state, s = st.settings, today = Calc.today();
  var top = $('home-today'), body = $('home-body'), chalBox = $('home-chal');
  var ch = activeChal();
  $('home-start').innerHTML = startCardHtml();
  $('btn-price-open').hidden = st.ingredients.length === 0;
  chalBox.innerHTML = ch ? chalCard(ch, false) : (st.ingredients.length || st.menus.length || st.spends.length
    ? '<div class="card chal-cta"><p><b>🎯 아직 진행 중인 식비 챌린지가 없다</b><br><small class="hint">\'한 달 10만원\'처럼 기간과 목표를 정하면 오늘 쓸 수 있는 돈이 나온다.</small></p>' +
      btn({ act: 'chal-open', label: '챌린지 고르기', cls: 'primary' }) + '</div>'
    : '');
  if (!st.ingredients.length && !st.menus.length) {
    top.innerHTML = '';
    body.innerHTML = ch
      ? emptyBox(ART.ing, '집밥 재료를 넣어 보자', '자주 사는 재료를 넣고 집밥 메뉴를 적으면, 한 끼 값과 사 먹을 때보다 아낀 돈이 나온다.', [
          { act: 'ing-new', label: '+ 첫 재료 넣기', cls: 'primary' },
          { act: 'tpl-open', label: '메뉴 예시에서', data: { tab: 'menu' } }
        ])
      : emptyBox(ART.bowl, '이번 달 식비를 정해 볼까요?',
        '식비 챌린지를 고르고 밥에 쓴 돈을 넣으면, 남은 돈과 오늘 쓸 수 있는 돈이 바로 나온다.', [
          { act: 'chal-open', label: '🎯 챌린지 고르기', cls: 'primary' },
          { act: 'ing-new', label: '+ 첫 재료 넣기' },
          { act: 'sample', label: '예시 자취방으로 둘러보기' }
        ]);
    return;
  }
  var infos = st.menus.map(function (m) { return { m: m, i: menuInfo(m) }; });
  var bad = infos.filter(function (x) { return x.i.level === 'bad'; });
  var mid = infos.filter(function (x) { return x.i.level === 'mid'; });
  var noPrice = st.ingredients.filter(function (g) { return !Calc.hasPrice(g); });
  var stale = st.ingredients.filter(function (g) { return Calc.hasPrice(g) && isStale(g); });
  var broken = infos.filter(function (x) { return x.i.missing > 0 || !x.m.lines.length; });

  var todo = [];
  if (ch) {
    var cst = chalInfo(ch);
    if (cst.pace === 'bad') todo.push(['🔴', '챌린지 목표를 넘었다', won(-cst.left) + ' 더 썼다. 남은 날은 집밥으로', { act: 'go', label: '보기', data: { to: 'chal' } }]);
    else if (cst.pace === 'mid') todo.push(['🟠', '식비가 조금 빠르다', '고르게 썼을 때보다 ' + won(cst.spent - cst.expected) + ' 더 썼다', { act: 'go', label: '보기', data: { to: 'chal' } }]);
    var todaySpent = App.state.spends.filter(function (x) { return x.date === today; }).length;
    if (!todaySpent && !cst.upcoming) todo.push(['📝', '오늘 쓴 식비를 아직 안 넣었다', '안 썼다면 그대로 두면 된다', { act: 'spend-new', label: '+ 식비', cls: 'primary' }]);
  }
  var soon = expSoon();
  if (soon.length) todo.push(['⏰', '냉장고 유통기한 ' + soon.length + '개', esc(soon.slice(0, 3).map(function (x) { return x.name + ' ' + expInfo(x.exp).text; }).join(', ')) + ' — 사 먹기 전에 먼저', { act: 'shelf-open', label: '보기', data: { id: soon[0].shelf } }]);
  if (bad.length) todo.push(['🍳', '비싼 집밥 메뉴 ' + bad.length + '개', '사 먹는 값의 ' + s.warn + '% 이상: ' + esc(bad.slice(0, 3).map(function (x) { return x.m.name; }).join(', ')) + (bad.length > 3 ? ' 외' : ''), { act: 'detail', label: '보기', data: { id: bad.sort(function (a, b) { return b.i.rate - a.i.rate; })[0].m.id } }]);
  if (noPrice.length) todo.push(['🟡', '값 없는 재료 ' + noPrice.length + '개', esc(noPrice.slice(0, 3).map(function (g) { return g.name; }).join(', ')) + (noPrice.length > 3 ? ' 외' : ''), { act: 'price-for', label: '값 넣기', data: { id: noPrice[0].id } }]);
  if (stale.length) todo.push(['🕒', '값 확인할 때 ' + stale.length + '개', s.staleDays + '일 넘게 안 바뀐 재료 값', { act: 'ing-stale', label: '보기' }]);
  if (broken.length) todo.push(['⚠', '한 끼 값이 덜 잡힌 메뉴 ' + broken.length + '개', '재료 줄이 없거나 값 없는 재료가 들어 있다', { act: 'menu-edit', label: '고치기', data: { id: broken[0].m.id } }]);
  if (!st.menus.length) todo.push(['🍚', '아직 집밥 메뉴가 없다', '메뉴를 넣으면 한 끼 값과 아낀 돈이 나온다', { act: 'menu-new', label: '+ 메뉴', cls: 'primary' }]);

  top.innerHTML = '<div class="card today"><h3>오늘 챙길 것 <small>' + Calc.shortDay(today) + '</small></h3>' +
    (todo.length
      ? '<ul class="todo">' + todo.map(function (t) {
          return '<li><span class="todo-ic" aria-hidden="true">' + t[0] + '</span><span class="todo-tx"><b>' + t[1] + '</b><small>' + t[2] + '</small></span>' + btn(t[3]) + '</li>';
        }).join('') + '</ul>'
      : '<p class="ok-line">✅ 오늘 챙길 것이 없다. 장을 봤다면 바뀐 값만 넣자.</p>') +
    '</div>';

  var html = '';
  var tip = TIPS[Math.abs(Calc.daysBetween('2026-01-01', today)) % TIPS.length];
  html += '<div class="card tip"><span aria-hidden="true">💡</span> ' + esc(tip) + '</div>';
  if (infos.length) {
    infos.sort(function (a, b) { return (b.i.rate || 0) - (a.i.rate || 0); });
    var avg = avgRate(infos);
    html += '<div class="sec-head"><h3>집밥 한 끼 값</h3><small>사 먹는 값의 평균 ' + pct(avg) + ' · 알뜰 ' + s.target + '% 이하 · 보통 ' + mid.length + ' · 비쌈 ' + bad.length + '</small></div>';
    html += infos.slice(0, 8).map(function (x) { return menuRow(x.m, x.i); }).join('');
    if (infos.length > 8) html += btn({ act: 'go', label: '메뉴 ' + infos.length + '개 모두 보기', cls: 'wide', data: { to: 'menu' } });
  }
  var recent = st.history.slice(-3).reverse();
  if (recent.length) {
    html += '<div class="sec-head"><h3>최근 바뀐 재료 값</h3></div>' + recent.map(histRow).join('');
  }
  body.innerHTML = html;
}

// ---------- 2. 챌린지 ----------
function renderChal() {
  var st = App.state, ch = activeChal();
  var now = $('chal-now'), list = $('chal-spends'), past = $('chal-past');
  if (!ch) {
    now.innerHTML = emptyBox(ART.chal, '진행 중인 챌린지가 없다', '\'한 달 10만원\', \'두 달 30만원\'처럼 기간과 식비 목표를 고르면 하루 쓸 수 있는 돈이 나온다.', [
      { act: 'chal-open', label: '🎯 챌린지 고르기', cls: 'primary' },
      { act: 'sample', label: '예시 자취방으로 둘러보기' }
    ]);
    list.innerHTML = '';
  } else {
    var info = chalInfo(ch);
    var spends = spendsIn(ch).slice().sort(function (a, b) { return b.date.localeCompare(a.date) || b.id.localeCompare(a.id); });
    // 종류별로 나눠 보기
    var byKind = SPEND_KINDS.map(function (k) {
      return { k: k, sum: spends.filter(function (x) { return x.kind === k.key; }).reduce(function (a, x) { return a + x.amount; }, 0) };
    }).filter(function (x) { return x.sum > 0; }).sort(function (a, b) { return b.sum - a.sum; });
    var maxK = byKind.length ? byKind[0].sum : 1;
    now.innerHTML = chalCard(ch, true) + chalDaysHtml(ch) +
      (byKind.length ? '<div class="card"><h3>어디에 썼나</h3><ul class="kinds">' + byKind.map(function (x) {
        return '<li><span>' + x.k.icon + ' ' + esc(x.k.key) + '</span><b>' + won(x.sum) + '<small>' + pct(x.sum / Math.max(1, info.spent) * 100) + '</small></b>' +
          '<span class="meter"><i class="lv-good" style="width:' + (x.sum / maxK * 100) + '%"></i></span></li>';
      }).join('') + '</ul></div>' : '') +
      '<div class="btn-row">' + btn({ act: 'chal-quit', label: '이 챌린지 그만두기', cls: 'danger small' }) + '</div>';
    list.innerHTML = '<div class="sec-head"><h3>이 기간 식비 ' + spends.length + '건</h3><small>누르면 고친다</small></div>' + (spends.length
      ? spends.map(spendRow).join('')
      : emptyBox(ART.spend, '아직 넣은 식비가 없다', '장보기·배달·외식·편의점에 쓴 돈을 넣으면 남은 돈이 줄어든다.', [
          { act: 'spend-new', label: '+ 식비 쓰기', cls: 'primary' },
          { act: 'price-open', label: '🧾 장 본 값 넣기' }
        ]));
    var meals = mealsIn(ch);
    if (meals.length) list.innerHTML += '<div class="sec-head"><h3>먹은 집밥 ' + meals.length + '끼</h3><small>잘못 넣었으면 지운다</small></div>' + mealList(meals, 30);
  }
  var done = st.challenges.filter(function (c) { return c.status !== 'active'; }).slice().reverse();
  if (!done.length) { past.innerHTML = ''; return; }
  var wins = done.filter(function (c) { return c.status === 'won'; }).length;
  past.innerHTML = '<div class="sec-head"><h3>지난 챌린지</h3><small>성공 ' + wins + ' / ' + done.length + '</small></div>' + done.map(function (c) {
    var lv = c.status === 'won' ? 'good' : c.status === 'lost' ? 'bad' : 'none';
    var spent = c.spent != null ? c.spent : spentIn(c);
    return '<div class="hrow chal-row">' +
      '<span class="h-date"><span class="badge lv-' + lv + '">' + STATUS_TEXT[c.status] + '</span></span>' +
      '<span class="h-name">' + esc(c.name) + '<small>' + c.start.replace(/-/g, '.') + ' ~ ' + c.end.replace(/-/g, '.') + '</small></span>' +
      '<span class="h-ch">' + won(spent) + '<small>목표 ' + won(c.budget) + '</small></span>' +
    '</div>';
  }).join('');
}

// ---------- 챌린지 끝 결과 창 (R-05) ----------
// 성공/실패 제목 + 다섯 줄: 쓴 돈/목표, 남긴 돈 또는 넘은 돈, 지킨 날, 기간 중 가장 많이 쓴 날·종류, 집밥 끼니·아낀 돈
function renderResult(ch) {
  var spent = ch.spent != null ? ch.spent : spentIn(ch);
  var winRun = ch.status === 'won', diff = ch.budget - spent;
  var days = chalDays(ch);
  var good = days.filter(function (d) { return d.state === 'good'; }).length;
  var best = 0, run = 0;
  days.forEach(function (d) { run = d.state === 'good' ? run + 1 : 0; if (run > best) best = run; });
  var top = days.reduce(function (a, d) { return d.spent > (a ? a.spent : 0) ? d : a; }, null);
  var spends = spendsIn(ch);
  var kind = SPEND_KINDS.map(function (k) {
    return { k: k, sum: spends.filter(function (x) { return x.kind === k.key; }).reduce(function (a, x) { return a + x.amount; }, 0) };
  }).sort(function (a, b) { return b.sum - a.sum; })[0];
  var meals = mealsIn(ch);
  var saved = meals.reduce(function (a, x) { return a + Math.max(0, x.out - x.cost); }, 0);
  var usedPct = ch.budget > 0 ? spent / ch.budget * 100 : 0;
  $('h-result').textContent = winRun ? '🎉 챌린지 성공!' : '챌린지 실패 — 다음엔 해낸다';
  function row(lv, icon, label, value, sub) {
    return '<li class="lv-' + lv + '"><span class="res-icon" aria-hidden="true">' + icon + '</span><span class="res-name">' + label +
      (sub ? '<small>' + sub + '</small>' : '') + '</span><b>' + value + '</b></li>';
  }
  $('result-body').innerHTML =
    '<div class="result-hero ' + (winRun ? 'won' : 'lost') + '">' +
      '<span class="result-badge" aria-hidden="true">' + (winRun ? '🏆' : '💪') + '</span>' +
      '<p><b>' + esc(ch.name) + '</b><small>' + Calc.shortDay(ch.start) + ' ~ ' + Calc.shortDay(ch.end) + ' · ' + days.length + '일</small></p>' +
    '</div>' +
    '<ul class="impact result-list">' +
      row(usedPct <= 100 ? 'good' : 'bad', '🧾', '쓴 돈 / 목표', won(spent) + ' / ' + won(ch.budget), pct(usedPct) + ' 썼다') +
      row(diff >= 0 ? 'good' : 'bad', diff >= 0 ? '💰' : '⚠️', diff >= 0 ? '남긴 돈' : '넘은 돈', won(Math.abs(diff)),
        diff >= 0 ? '목표 안에서 끝냈다' : '목표보다 더 썼다') +
      row(good * 2 >= days.length ? 'good' : 'mid', '📅', '지킨 날', good + ' / ' + days.length + '일',
        '하루 기준 ' + won(dayBase(ch)) + ' 이하 · 가장 긴 연속 ' + best + '일') +
      row(top ? 'mid' : 'good', '📈', '가장 많이 쓴 날', top ? Calc.shortDay(top.date) + ' ' + won(top.spent) : '없음',
        kind && kind.sum > 0 ? '가장 많이 쓴 종류 ' + kind.k.icon + ' ' + esc(kind.k.key) + ' ' + won(kind.sum) : '넣은 식비가 없다') +
      row(meals.length ? 'good' : 'none', '🍳', '먹은 집밥', meals.length + '끼', saved > 0 ? '사 먹었으면 ' + won(saved) + ' 더 들었다' : '집밥을 먹으면 아낀 돈이 쌓인다') +
    '</ul>' +
    '<p class="hint">' + (winRun ? '같은 목표로 한 번 더, 아니면 조금 낮춰 도전해 보자.' : '하루 기준을 넘긴 날이 많았다. 목표를 조금 올리거나 집밥을 늘려 다시 해 보자.') +
      (App.resultOthers > 0 ? ' 다른 챌린지 ' + App.resultOthers + '개도 끝났다 — 챌린지 기록에서 본다.' : '') + '</p>';
}

// ---------- 14. 식비 쓰기 시트 ----------
function renderSpendKinds(chosen) {
  $('spend-kinds').innerHTML = SPEND_KINDS.map(function (k) {
    var on = k.key === chosen;
    return '<button type="button" role="radio" aria-checked="' + on + '" class="kind' + (on ? ' on' : '') + '" data-act="spend-kind" data-kind="' + esc(k.key) + '">' +
      '<span aria-hidden="true">' + k.icon + '</span>' + esc(k.key) + '</button>';
  }).join('');
  var quick = { '장보기': [10000, 20000, 30000], '배달': [15000, 20000, 25000], '외식': [7000, 9000, 12000], '편의점': [3000, 5000, 8000], '카페·간식': [2000, 4500, 6000], '기타': [1000, 5000, 10000] }[chosen] || [];
  $('spend-quick').innerHTML = quick.map(function (v) { return btn({ act: 'spend-quick', label: won(v), cls: 'small', data: { v: v } }); }).join('');
}
// R-07: 숫자판 위 큰 금액. 금액 칸이 바뀌는 모든 길(숫자판·자주 쓰는 값·타자·열기)이 미리보기를 거치므로 여기서 같이 그린다
function renderSpendDisplay() {
  var v = Number($('spend-amount').value), d = $('spend-display');
  d.textContent = won(v >= 0 ? v : 0);
  d.classList.toggle('empty-amt', !(v >= 1));
}
function renderSpendPreview() {
  renderSpendDisplay();
  var box = $('spend-preview'), ch = activeChal();
  if (!ch) { box.innerHTML = '<p class="hint">진행 중인 챌린지가 없다. 식비는 기록으로 남고, 챌린지를 시작하면 그 기간 것만 센다.</p>'; return; }
  var amt = Number($('spend-amount').value), day = $('spend-date').value;
  var cur = App.editSpendId ? spendById(App.editSpendId) : null;
  var before = chalInfo(ch);
  if (!(amt >= 1) || !Calc.isDay(day)) { box.innerHTML = '<p class="hint">값을 넣으면 ' + esc(ch.name) + ' 남은 돈이 어떻게 바뀌는지 저장 전에 보인다. 지금 남은 돈 ' + won(before.left) + '</p>'; return; }
  var delta = (Calc.inPeriod(day, ch.start, ch.end) ? amt : 0) - (cur && Calc.inPeriod(cur.date, ch.start, ch.end) ? cur.amount : 0);
  if (!Calc.inPeriod(day, ch.start, ch.end)) { box.innerHTML = '<p class="hint">이 날짜는 챌린지 기간(' + Calc.shortDay(ch.start) + ' ~ ' + Calc.shortDay(ch.end) + ') 밖이라 챌린지에 세지 않는다.</p>'; return; }
  box.innerHTML = chalDeltaHtml(ch, delta);
}
// 아직 저장하지 않은 돈 delta 를 더했을 때 챌린지가 어떻게 바뀌나 (식비 쓰기·장 본 값이 같이 쓴다)
function chalDeltaHtml(ch, delta) {
  var b = chalInfo(ch), a = chalInfo(ch, delta || 0);
  return '<p class="chal-delta"><b>🎯 ' + esc(ch.name) + '</b><br>남은 돈 ' + won(b.left) + ' → <b class="' + (a.left < 0 ? 'warn-text' : '') + '">' + won(a.left) + '</b>' +
    ' · 오늘 쓸 수 있는 돈 ' + won(b.perDay) + ' → <b>' + won(a.perDay) + '</b>' +
    (a.pace !== b.pace ? '<br><span class="badge lv-' + a.pace + '">' + PACE_TEXT[a.pace] + '</span> 으로 바뀐다' : '') + '</p>';
}

// ---------- 15. 챌린지 고르기 시트 ----------
// R-09: 지난달 식비(v)보다 낮으면서 가장 가까운 한 달 프리셋 번호. 낮은 것이 없으면 가장 적은 한 달 프리셋
function suggestPreset(v) {
  var best = -1, low = -1;
  CHALLENGE_PRESETS.forEach(function (p, i) {
    if (p.months !== 1) return;
    if (low < 0 || p.budget < CHALLENGE_PRESETS[low].budget) low = i;
    if (p.budget < v && (best < 0 || p.budget > CHALLENGE_PRESETS[best].budget)) best = i;
  });
  return best >= 0 ? best : low;
}
function renderChalSheet() {
  var today = Calc.today();
  var v = App.chalSuggest, rec = v ? suggestPreset(v) : -1;
  Array.prototype.forEach.call(document.querySelectorAll('#chal-quiz [data-act="chal-suggest"]'), function (b) {
    var on = v != null && Number(b.dataset.v) === v;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  $('chal-quiz-out').textContent = rec >= 0
    ? '지난달보다 조금만 줄여 보자 — \'' + CHALLENGE_PRESETS[rec].name + '\' 을(를) 추천한다. 고르면 바로 첫 식비 넣기로 간다.'
    : '';
  $('chal-presets').innerHTML = '<p class="count">고르면 오늘부터 시작한다</p>' + CHALLENGE_PRESETS.map(function (p, i) {
    var end = Calc.challengeEnd(today, p.months);
    var days = Calc.periodDays(today, end);
    var isRec = i === rec;
    return '<button type="button" class="pick preset' + (isRec ? ' recommend' : '') + '" data-act="chal-preset" data-i="' + i + '"' +
      (isRec ? ' aria-describedby="chal-quiz-out"' : '') + '><b>' + esc(p.name) +
      (isRec ? ' <span class="badge rec">추천</span>' : '') + '</b><small>' +
      esc(p.note) + '<br>' + days + '일 · 하루 ' + won(Math.floor(p.budget / days)) + ' · ' + Calc.shortDay(end) + '까지</small></button>';
  }).join('');
  if (rec >= 0) {
    var rb = document.querySelector('#chal-presets .pick.recommend');
    try { rb.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { /* 없어도 된다 */ }
  }
  renderChalCalc();
}
function renderChalCalc() {
  var b = Number($('chal-budget').value), m = Number($('chal-months').value) || 1, s = $('chal-start').value;
  var out = $('chal-calc');
  if (!(b >= 1000) || !Calc.isDay(s)) { out.textContent = '목표와 시작일을 넣으면 기간과 하루 쓸 수 있는 돈이 나온다.'; return; }
  var end = Calc.challengeEnd(s, m), days = Calc.periodDays(s, end);
  out.textContent = Calc.shortDay(s) + ' ~ ' + Calc.shortDay(end) + ' · ' + days + '일 · 하루 ' + won(Math.floor(b / days));
}
function avgRate(infos) {
  var r = infos.filter(function (x) { return x.i.rate != null; });
  if (!r.length) return null;
  return r.reduce(function (a, x) { return a + x.i.rate; }, 0) / r.length;
}

function menuRow(m, info) {
  return '<div class="row' + flashCls(m.id) + '" data-row="' + m.id + '">' +
    '<button type="button" class="row-main" data-act="detail" data-id="' + m.id + '">' +
      '<span class="row-title">' + esc(m.name) + '</span>' +
      '<span class="row-sub">한 끼 ' + won(info.cost) + ' · 사 먹으면 ' + won(m.price) +
        (info.missing ? ' · <b class="warn-text">값 빠짐 ' + info.missing + '</b>' : '') + '</span>' +
      '<span class="row-tags">' + rateBadge(info) + (info.margin > 0 ? '<span class="sug good">' + won(info.margin) + ' 아낌</span>' : '') + '</span>' +
      '<span class="meter" aria-hidden="true"><i class="lv-' + info.level + '" style="width:' + Math.min(100, Math.max(0, info.rate || 0)) + '%"></i></span>' +
    '</button>' +
    '<button type="button" class="row-btn" data-act="menu-edit" data-id="' + m.id + '" aria-label="' + esc(m.name) + ' 고치기">고치기</button>' +
  '</div>';
}

function histUp(h, which) {
  return which === 'old' ? Calc.unitPriceOf(h.oldPrice, h.oldQty, h.oldUnit) : Calc.unitPriceOf(h.newPrice, h.newQty, h.newUnit);
}
function histRow(h) {
  var o = histUp(h, 'old'), n = histUp(h, 'new');
  var ch = Calc.changePct(o, n);
  var cls = ch == null ? 'first' : ch > 0.05 ? 'up' : ch < -0.05 ? 'down' : 'same';
  var dim = Calc.dimOf(h.newUnit);
  return '<div class="hrow ' + cls + '">' +
    '<span class="h-date">' + Calc.shortDay(h.date) + '</span>' +
    '<span class="h-name">' + esc(h.name) + '<small>' + (h.oldPrice ? fmtQty(h.oldQty) + h.oldUnit + ' ' + won(h.oldPrice) + ' → ' : '') + fmtQty(h.newQty) + h.newUnit + ' ' + won(h.newPrice) + '</small></span>' +
    '<span class="h-ch">' + signPct(ch) + '<small>' + unitText(dim) + ' ' + won(unitPriceShown(n, h.newUnit)) + '</small></span>' +
  '</div>';
}

// ---------- 2. 재료 ----------
function fillCatSelect(sel, withAll) {
  if (sel.options.length) return;
  sel.innerHTML = (withAll ? '<option value="">모든 종류</option>' : '') +
    CATS.concat(['기타']).map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
}
function renderIng() {
  var st = App.state;
  fillCatSelect($('ing-cat'), true);
  var box = $('ing-list');
  if (!st.ingredients.length) {
    box.innerHTML = emptyBox(ART.ing, '재료가 아직 없다', '자주 사는 재료를 산 양과 값으로 넣는다. 목록에서 고르면 이름과 단위가 채워진다.', [
      { act: 'ing-new', label: '+ 재료 넣기', cls: 'primary' },
      { act: 'tpl-open', label: '목록에서 고르기', data: { tab: 'ing' } }
    ]);
    return;
  }
  var q = $('ing-q').value.trim(), cat = $('ing-cat').value, sort = $('ing-sort').value;
  var list = st.ingredients.filter(function (g) {
    return (!q || g.name.indexOf(q) >= 0) && (!cat || g.cat === cat);
  });
  var cmp = {
    name: byName,
    missing: function (a, b) { return (Calc.hasPrice(a) ? 1 : 0) - (Calc.hasPrice(b) ? 1 : 0) || byName(a, b); },
    old: function (a, b) { return (a.updated || '0000').localeCompare(b.updated || '0000') || byName(a, b); },
    recent: function (a, b) { return (b.updated || '0000').localeCompare(a.updated || '0000') || byName(a, b); },
    unit: function (a, b) { return (unitPriceShown(Calc.unitPrice(b), b.buyUnit) || 0) - (unitPriceShown(Calc.unitPrice(a), a.buyUnit) || 0); }
  }[sort] || byName;
  list.sort(cmp);
  if (!list.length) {
    box.innerHTML = emptyBox(ART.search, '찾는 재료가 없다', '이름 일부만 넣어 보거나 종류를 \'모든 종류\'로 바꿔 보자.', [
      { act: 'clear-filter', label: '찾기 지우기', data: { scope: 'ing' } },
      { act: 'ing-new', label: '+ 새 재료로 넣기', cls: 'primary' }
    ]);
    return;
  }
  box.innerHTML = '<p class="count">' + list.length + '개</p>' + list.map(function (g) {
    var used = usedBy(g.id).length;
    var tags = '';
    if (!Calc.hasPrice(g)) tags += '<span class="badge lv-mid">값 없음</span>';
    else if (isStale(g)) tags += '<span class="badge lv-none">확인할 때</span>';
    if (g.yieldPct < 100) tags += '<span class="badge soft">수율 ' + g.yieldPct + '%</span>';
    return '<div class="row' + flashCls(g.id) + '" data-row="' + g.id + '">' +
      '<button type="button" class="row-main" data-act="ing-edit" data-id="' + g.id + '">' +
        '<span class="row-title">' + esc(g.name) + '</span>' +
        '<span class="row-sub">' + esc(g.cat) + ' · ' + buyText(g) + ' · ' + unitPriceText(g) + '</span>' +
        '<span class="row-tags">' + tags + '<small>' + (g.updated ? Calc.shortDay(g.updated) + ' 바꿈' : '값 안 넣음') + ' · 메뉴 ' + used + '개</small></span>' +
      '</button>' +
      '<button type="button" class="row-btn" data-act="price-for" data-id="' + g.id + '" aria-label="' + esc(g.name) + ' 장 본 값 넣기">값 넣기</button>' +
    '</div>';
  }).join('');
}

// ---------- 3. 메뉴 ----------
function renderMenu() {
  var st = App.state, s = st.settings;
  var box = $('menu-list'), sum = $('menu-sum');
  if (!st.menus.length) {
    sum.hidden = true;
    box.innerHTML = emptyBox(ART.menu, '집밥 메뉴가 아직 없다', st.ingredients.length
        ? '메뉴 이름과 사 먹으면 드는 값, 한 그릇에 들어가는 재료를 적으면 한 끼 값과 아낀 돈이 나온다.'
        : '먼저 재료를 넣고 메뉴를 만든다. 메뉴 예시를 고르면 필요한 재료도 함께 들어온다.', [
      { act: 'menu-new', label: '+ 메뉴 만들기', cls: 'primary' },
      { act: 'tpl-open', label: '메뉴 예시에서', data: { tab: 'menu' } }
    ]);
    return;
  }
  var infos = st.menus.map(function (m) { return { m: m, i: menuInfo(m) }; });
  var bad = infos.filter(function (x) { return x.i.level === 'bad'; }).length;
  var mid = infos.filter(function (x) { return x.i.level === 'mid'; }).length;
  sum.hidden = false;
  var withOut = infos.filter(function (x) { return x.i.margin != null; });
  var avgSaved = withOut.length ? withOut.reduce(function (a, x) { return a + x.i.margin; }, 0) / withOut.length : null;
  sum.innerHTML = '<div class="stats">' +
    stat('메뉴', infos.length + '개') + stat('한 끼 아낌 평균', won(avgSaved)) +
    stat('보통', mid + '개') + stat('비쌈', bad + '개') + '</div>' +
    '<p class="hint">사 먹는 값의 ' + s.target + '% 이하 알뜰 · ' + s.warn + '% 이상 비쌈</p>';
  var q = $('menu-q').value.trim(), sort = $('menu-sort').value;
  var list = infos.filter(function (x) { return !q || x.m.name.indexOf(q) >= 0; });
  var cmp = {
    rate: function (a, b) { return (b.i.rate || 0) - (a.i.rate || 0); },
    name: function (a, b) { return byName(a.m, b.m); },
    cost: function (a, b) { return b.i.cost - a.i.cost; },
    margin: function (a, b) { return (a.i.margin == null ? 1e12 : a.i.margin) - (b.i.margin == null ? 1e12 : b.i.margin); }
  }[sort];
  if (cmp) list.sort(cmp);
  if (!list.length) {
    box.innerHTML = emptyBox(ART.search, '찾는 메뉴가 없다', '이름 일부만 넣어 보자.', [
      { act: 'clear-filter', label: '찾기 지우기', data: { scope: 'menu' } },
      { act: 'menu-new', label: '+ 새 메뉴', cls: 'primary' }
    ]);
    return;
  }
  box.innerHTML = list.map(function (x) { return menuRow(x.m, x.i); }).join('');
}
function stat(label, value) { return '<div class="stat"><small>' + label + '</small><b>' + value + '</b></div>'; }

// ---------- 4. 기록 ----------
function renderHist() {
  var st = App.state;
  if (!App.histMonth) App.histMonth = Calc.monthOf(Calc.today());
  var key = App.histMonth;
  $('hist-month').textContent = Calc.monthLabel(key);
  var sel = $('hist-ing');
  var chosen = sel.value;
  var names = {};
  st.history.forEach(function (h) { names[h.ingId] = h.name; });
  st.ingredients.forEach(function (g) { if (names[g.id]) names[g.id] = g.name; });
  var ids = Object.keys(names).sort(function (a, b) { return names[a].localeCompare(names[b], 'ko'); });
  sel.innerHTML = '<option value="">모든 재료</option>' + ids.map(function (id) {
    return '<option value="' + esc(id) + '"' + (id === chosen ? ' selected' : '') + '>' + esc(names[id]) + '</option>';
  }).join('');
  if (chosen && !names[chosen]) chosen = '';

  var sumBox = $('hist-sum'), box = $('hist-list');
  if (!st.history.length) {
    sumBox.innerHTML = '';
    box.innerHTML = emptyBox(ART.hist, '재료 값 기록이 아직 없다', '장 본 값을 넣을 때마다 여기에 쌓인다. 달마다 무엇이 올랐는지 다시 볼 수 있다.', [
      { act: 'price-open', label: '🧾 장 본 값 넣기', cls: 'primary' }
    ]);
    return;
  }
  var inMonth = st.history.filter(function (h) { return Calc.monthOf(h.date) === key && (!chosen || h.ingId === chosen); });
  var ups = 0, downs = 0, firsts = 0, top = null;
  inMonth.forEach(function (h) {
    var ch = Calc.changePct(histUp(h, 'old'), histUp(h, 'new'));
    if (ch == null) firsts++;
    else if (ch > 0.05) { ups++; if (!top || ch > top.ch) top = { name: h.name, ch: ch }; }
    else if (ch < -0.05) downs++;
  });
  var html = '<div class="card soft"><div class="stats">' + stat('바뀐 횟수', inMonth.length + '번') + stat('오름', ups + '번') +
    stat('내림', downs + '번') + stat('처음 값', firsts + '번') + '</div>' +
    (top ? '<p class="hint">이 달 가장 많이 오른 것: <b>' + esc(top.name) + '</b> ' + signPct(top.ch) + '</p>' : '') + '</div>';
  html += monthBars(key, chosen);
  if (chosen) html += trendChart(chosen);
  sumBox.innerHTML = html;

  if (!inMonth.length) {
    box.innerHTML = emptyBox(ART.search, Calc.monthLabel(key) + '에는 기록이 없다', '이전 달로 가거나 재료를 \'모든 재료\'로 바꿔 보자.', [
      { act: 'hist-prev', label: '◀ 이전 달' },
      { act: 'hist-today', label: '이번 달로' }
    ]);
    return;
  }
  box.innerHTML = inMonth.slice().reverse().map(histRow).join('');
}
// 고른 달까지 여섯 달의 오른 횟수
function monthBars(key, ingId) {
  var months = [];
  for (var i = 5; i >= 0; i--) months.push(Calc.addMonths(key, -i));
  var counts = months.map(function (mk) {
    var up = 0, all = 0;
    App.state.history.forEach(function (h) {
      if (Calc.monthOf(h.date) !== mk || (ingId && h.ingId !== ingId)) return;
      all++;
      var ch = Calc.changePct(histUp(h, 'old'), histUp(h, 'new'));
      if (ch != null && ch > 0.05) up++;
    });
    return { mk: mk, up: up, all: all };
  });
  var max = Math.max(1, Math.max.apply(null, counts.map(function (c) { return c.all; })));
  return '<div class="card"><h3>여섯 달 흐름 <small>막대: 바뀐 횟수 / 빨강: 오른 횟수</small></h3><div class="bars">' +
    counts.map(function (c) {
      return '<div class="bar-col' + (c.mk === key ? ' cur' : '') + '"><div class="bar-stack"><i style="height:' + (c.all / max * 100) + '%"></i><b style="height:' + (c.up / max * 100) + '%"></b></div><small>' + (+c.mk.slice(5)) + '월</small><small>' + c.all + '</small></div>';
    }).join('') + '</div></div>';
}
// 한 재료의 단가 흐름(최근 10번)
function trendChart(ingId) {
  var hs = App.state.history.filter(function (h) { return h.ingId === ingId; }).slice(-10);
  if (!hs.length) return '';
  var vals = hs.map(function (h) { return unitPriceShown(histUp(h, 'new'), h.newUnit) || 0; });
  var max = Math.max.apply(null, vals) || 1;
  var first = vals[0], last = vals[vals.length - 1];
  var ch = first > 0 ? (last - first) / first * 100 : null;
  return '<div class="card"><h3>' + esc(hs[0].name) + ' ' + unitText(Calc.dimOf(hs[hs.length - 1].newUnit)) + ' 값 <small>처음보다 ' + signPct(hs.length > 1 ? ch : null) + '</small></h3><div class="bars">' +
    hs.map(function (h, i) {
      return '<div class="bar-col"><div class="bar-stack"><i class="solid" style="height:' + (vals[i] / max * 100) + '%"></i></div><small>' + won(vals[i]) + '</small><small>' + h.date.slice(5).replace('-', '/') + '</small></div>';
    }).join('') + '</div></div>';
}

// ---------- 5. 설정 ----------
function renderMore() {
  var s = S();
  $('set-target').value = s.target;
  $('set-warn').value = s.warn;
  $('set-stale').value = s.staleDays;
  $('set-font').value = s.font;
  $('set-theme').value = s.theme;
  $('set-motion').checked = document.body.classList.contains('reduce-motion');
  var res = Calc.selfTest();
  var okN = res.filter(function (r) { return r.ok; }).length;
  $('selftest').innerHTML = '<li class="test-sum">' + okN + ' / ' + res.length + ' 맞음</li>' + res.map(function (r) {
    return '<li class="' + (r.ok ? 'ok' : 'no') + '">' + (r.ok ? '✓' : '✗') + ' ' + esc(r.name) + ' → ' + esc(Math.round(r.got * 1000) / 1000) + (r.ok ? '' : ' (기대 ' + r.want + ')') + '</li>';
  }).join('');
}

// ---------- 방법 ----------
function renderHelp() {
  var ol = $('help-tips');
  if (!ol.children.length) ol.innerHTML = TIPS.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
}

// ---------- 7. 장 본 값 넣기 ----------
function renderPricePick() {
  var q = $('price-q').value.trim();
  var list = sortedIngs().filter(function (g) { return !q || g.name.indexOf(q) >= 0; });
  // 단가 없는 것을 앞에
  list.sort(function (a, b) { return (Calc.hasPrice(a) ? 1 : 0) - (Calc.hasPrice(b) ? 1 : 0); });
  var box = $('price-pick-list');
  if (!App.state.ingredients.length) {
    box.innerHTML = emptyBox(ART.ing, '넣을 재료가 없다', '먼저 재료를 하나 넣는다. 목록 ' + ING_TEMPLATES.length + '개에서 고르면 산 양·단위가 채워진다.', [
      { act: 'tpl-open', label: '목록에서 고르기', cls: 'primary', data: { tab: 'ing' } },
      { act: 'ing-new', label: '+ 재료 넣기' }
    ]);
    return;
  }
  if (!list.length) {
    box.innerHTML = emptyBox(ART.search, '그런 재료가 없다', '새 재료로 넣을 수 있다.', [
      { act: 'clear-filter', label: '찾기 지우기', data: { scope: 'price' } },
      { act: 'ing-new', label: '+ 새 재료', cls: 'primary' }
    ]);
    return;
  }
  box.innerHTML = list.slice(0, 40).map(function (g) {
    return '<button type="button" class="pick" data-act="price-pick" data-id="' + g.id + '"><b>' + esc(g.name) + '</b><small>' +
      (Calc.hasPrice(g) ? buyText(g) + ' · ' + (g.updated ? Calc.shortDay(g.updated) : '') : '값 없음') + ' · 메뉴 ' + usedBy(g.id).length + '개</small></button>';
  }).join('') + (list.length > 40 ? '<p class="hint">' + (list.length - 40) + '개 더 있다. 이름으로 찾아 보자.</p>' : '');
}

// 지금 입력으로 바꾼 재료(검사를 통과하지 못하면 null)
function priceDraft() {
  var ing = ingById(App.priceIng);
  if (!ing) return null;
  var p = Number($('price-won').value), q = Number($('price-qty').value), u = $('price-unit').value;
  if (!(p >= 1 && p <= 100000000) || !(q > 0 && q <= 100000) || !Calc.isUnit(u)) return null;
  return Object.assign({}, ing, { price: p, buyQty: q, buyUnit: u });
}
// 바뀌기 전·뒤 비교. 장 본 값 미리보기와 결과 창이 같이 쓴다.
// 재료 하나 또는 배열(R-08 장바구니)을 받는다. 여러 재료를 쓰는 메뉴는 한 줄로, 담은 값을 모두 바꾼 한 끼 값을 보인다.
function impactOf(oldIng, newIng) {
  var olds = [].concat(oldIng), news = [].concat(newIng);
  var finder = function (id) {
    for (var i = 0; i < news.length; i++) if (news[i].id === id) return news[i];
    return ingById(id);
  };
  var seen = {}, menus = [];
  olds.forEach(function (g) {
    usedBy(g.id).forEach(function (m) { if (!seen[m.id]) { seen[m.id] = true; menus.push(m); } });
  });
  return menus.map(function (m) {
    return { m: m, before: menuInfo(m), after: menuInfo(m, finder) };
  }).sort(function (a, b) { return (b.after.rate || 0) - (a.after.rate || 0); });
}
function impactHead(oldIng, newIng) {
  var oUp = Calc.unitPrice(oldIng), nUp = Calc.unitPrice(newIng);
  var ch = Calc.changePct(oUp, nUp);
  return '<p class="impact-head"><b>' + esc(newIng.name) + '</b> ' + unitText(Calc.dimOf(newIng.buyUnit)) + ' ' +
    (oUp != null ? won(unitPriceShown(oUp, oldIng.buyUnit)) + ' → ' : '') + '<b>' + won(unitPriceShown(nUp, newIng.buyUnit)) + '</b> ' +
    '<span class="chg ' + (ch == null ? '' : ch > 0.05 ? 'up' : ch < -0.05 ? 'down' : '') + '">' + signPct(ch) + '</span></p>';
}
function impactHtml(oldIng, newIng, rows) {
  var olds = [].concat(oldIng), news = [].concat(newIng);
  var crossed = rows.filter(function (r) { return r.after.level === 'bad' && r.before.level !== 'bad'; }).length;
  var html = news.map(function (n, i) { return impactHead(olds[i], n); }).join('');
  if (!rows.length) return html + '<p class="hint">아직 ' + (news.length > 1 ? '담은 재료를' : '이 재료를') + ' 쓰는 집밥 메뉴가 없다. 메뉴에 넣으면 한 끼 값에 들어간다.</p>';
  html += '<p class="hint">' + (news.length > 1 ? '재료 ' + news.length + '개로 ' : '') + '집밥 메뉴 ' + rows.length + '개의 한 끼 값이 바뀐다' + (crossed ? ' · <b class="warn-text">새로 \'비쌈\'이 되는 메뉴 ' + crossed + '개</b>' : '') + '</p>';
  html += '<ul class="impact">' + rows.map(function (r) {
    var b = r.before, a = r.after;
    return '<li class="lv-' + a.level + '"><span class="imp-name">' + esc(r.m.name) + '<small>한 끼 ' + won(b.cost) + ' → ' + won(a.cost) + '</small></span>' +
      '<span class="imp-rate">' + pct(b.rate) + ' → <b>' + pct(a.rate) + '</b><small>' + (a.margin != null ? won(a.margin) + ' 아낌' : '사 먹는 값 없음') + '</small></span>' +
    '</li>';
  }).join('') + '</ul>';
  return html;
}
// 장바구니(R-08)와 지금 넣는 값을 합친 바뀜. 지금 값이 같은 재료를 담은 것보다 먼저다.
function priceChanges(draft) {
  var olds = [], news = [], total = 0;
  App.priceCart.forEach(function (c) {
    var g = ingById(c.ingId);
    if (!g || (draft && draft.id === g.id)) return;
    olds.push(g);
    news.push(Object.assign({}, g, { price: c.price, buyQty: c.buyQty, buyUnit: c.buyUnit }));
    total += c.price;
  });
  if (draft) { olds.push(ingById(draft.id)); news.push(draft); total += draft.price; }
  return { olds: olds, news: news, total: total };
}
function renderPriceCart() {
  // 담은 뒤 지운 재료는 보이지 않고 저장에도 들어가지 않는다 (priceChanges 와 같다)
  var cart = App.priceCart.filter(function (c) { return ingById(c.ingId); }), box = $('price-cart');
  box.hidden = !cart.length;
  $('price-cart-save').hidden = !cart.length || !!App.priceIng;
  $('price-submit').textContent = cart.length ? '담은 ' + cart.length + '개와 함께 저장' : '이 값으로 바꾸기';
  if (!cart.length) { $('price-cart-list').innerHTML = ''; return; }
  var total = 0;
  $('price-cart-list').innerHTML = App.priceCart.map(function (c, i) {
    var g = ingById(c.ingId);
    if (!g) return '';
    total += c.price;
    return '<li' + (c.ingId === App.priceIng ? ' class="now"' : '') + '><span class="pc-name"><b>' + esc(g.name) + '</b><small>' + fmtQty(c.buyQty) + c.buyUnit +
      (c.ingId === App.priceIng ? ' · 지금 고치는 중' : '') + '</small></span><b class="pc-won">' + won(c.price) + '</b>' +
      '<button type="button" class="icon" data-act="price-cart-del" data-i="' + i + '" aria-label="' + esc(g.name) + ' 장바구니에서 빼기">✕</button></li>';
  }).join('');
  $('h-price-cart').textContent = '장바구니 ' + cart.length + '개';
  $('price-cart-total').textContent = won(total);
}
function renderPricePreview() {
  renderPriceCart();
  var ing = ingById(App.priceIng);
  var box = $('price-preview');
  var ch = activeChal();
  var d = ing ? priceDraft() : null;
  var all = priceChanges(d);
  $('price-spend-wrap').hidden = !ch || (!ing && !all.news.length);
  if (!ing && !all.news.length) { box.innerHTML = ''; return; }
  if (ing && !d && !all.news.length) {
    box.innerHTML = '<p class="hint">산 값과 산 양을 넣으면, 저장하기 전에 ' + (ch ? '챌린지 남은 돈과 ' : '') + '집밥 메뉴 한 끼 값이 어떻게 바뀌는지 여기 보인다. (쓰는 메뉴 ' + usedBy(ing.id).length + '개)</p>';
    return;
  }
  // 챌린지는 장바구니 합계로, 메뉴는 담은 재료 모두를 바꾼 한 목록으로
  var chHtml = ch && $('price-spend').checked && Calc.inPeriod(Calc.today(), ch.start, ch.end) ? chalDeltaHtml(ch, all.total) : '';
  box.innerHTML = '<div class="card soft">' + (all.news.length > 1 ? '<p class="hint">담은 재료 ' + all.news.length + '개 · 합계 <b>' + won(all.total) + '</b></p>' : '') +
    chHtml + impactHtml(all.olds, all.news, impactOf(all.olds, all.news)) +
    (ing && !d ? '<p class="hint">지금 재료 값을 넣으면 여기에 더해진다.</p>' : '') + '</div>';
}

// ---------- 8. 재료 시트의 바로 계산 ----------
function renderIngCalc() {
  var p = Number($('ing-price').value), q = Number($('ing-qty').value), u = $('ing-unit').value, y = Number($('ing-yield').value) || 100;
  var up = Calc.unitPriceOf(p, q, u);
  $('ing-calc').textContent = up == null ? '값과 양을 넣으면 100g·100ml·개당 값이 나온다.'
    : unitText(Calc.dimOf(u)) + ' ' + won(unitPriceShown(up, u)) + (y > 0 && y < 100 ? ' · 손질 뒤 기준 ' + won(unitPriceShown(up, u) / (y / 100)) : '');
}

// ---------- 9. 메뉴 시트 ----------
function lineRow(l, i, ings) {
  var opts = '<option value="">재료 고르기</option>' + ings.map(function (g) {
    return '<option value="' + g.id + '"' + (g.id === l.ingId ? ' selected' : '') + '>' + esc(g.name) + (Calc.hasPrice(g) ? '' : ' (값 없음)') + '</option>';
  }).join('');
  var ing = ingById(l.ingId);
  var units = Calc.unitsFor(ing ? ing.buyUnit : l.unit);
  var uopts = units.map(function (u) { return '<option' + (u === l.unit ? ' selected' : '') + '>' + u + '</option>'; }).join('');
  return '<div class="line" data-i="' + i + '">' +
    '<select class="ln-ing" aria-label="' + (i + 1) + '번째 재료">' + opts + '</select>' +
    '<input class="ln-qty" type="number" inputmode="decimal" min="0" step="any" value="' + (l.qty > 0 ? l.qty : '') + '" aria-label="' + (i + 1) + '번째 양" placeholder="양">' +
    '<select class="ln-unit" aria-label="' + (i + 1) + '번째 단위">' + uopts + '</select>' +
    '<button type="button" class="icon" data-act="line-del" data-i="' + i + '" aria-label="' + (i + 1) + '번째 줄 빼기">✕</button>' +
    '<span class="ln-cost"></span><em class="err"></em>' +
  '</div>';
}
function renderMenuLines() {
  var box = $('menu-lines');
  var ings = sortedIngs();
  if (!ings.length) {
    box.innerHTML = emptyBox(ART.ing, '넣을 재료가 없다', '메뉴에 넣을 재료를 먼저 만든다.', [{ act: 'ing-new', label: '+ 재료 넣기', cls: 'primary' }]);
    return;
  }
  if (!App.draftMenu.lines.length) {
    box.innerHTML = '<p class="hint empty-line">🥄 아직 재료 줄이 없다. 아래 \'+ 재료 줄\'을 눌러 한 그릇에 들어가는 재료를 넣는다.</p>';
    return;
  }
  box.innerHTML = App.draftMenu.lines.map(function (l, i) { return lineRow(l, i, ings); }).join('');
}
function renderMenuLive() {
  var d = App.draftMenu;
  if (!d) return;
  // 아직 재료를 고르지 않은 줄은 빼고 센다
  var info = menuInfo(Object.assign({}, d, { lines: d.lines.filter(function (l) { return l.ingId; }) }));
  // 줄마다 원가
  $('menu-lines').querySelectorAll('.line').forEach(function (row) {
    var l = d.lines[+row.dataset.i], c = row.querySelector('.ln-cost');
    var g = l ? ingById(l.ingId) : null;
    if (!c) return;
    if (!g) { c.textContent = ''; return; }
    var r = Calc.lineCost(l, g);
    c.textContent = r.missing ? '값 없음' : won(r.cost);
  });
  $('menu-live').innerHTML = '<div class="stats">' + stat('한 끼 값', won(info.cost)) + stat('사 먹으면', d.price > 0 ? won(d.price) : '—') +
    stat('사 먹는 값의', d.price > 0 ? pct(info.rate) : '—') + stat('한 끼 아낌', d.price > 0 ? won(info.margin) : '—') + '</div>' +
    (d.price > 0 ? rateBadge(info) : '<p class="hint">사 먹으면 드는 값을 넣으면 얼마 아끼는지 나온다.</p>') +
    (info.missing ? '<p class="hint warn-text">값 없는 재료 ' + info.missing + '개는 한 끼 값에 빠져 있다.</p>' : '');
}

// ---------- 10. 메뉴 자세히 ----------
function renderDetail() {
  var m = menuById(App.detailId);
  var box = $('detail-body');
  if (!m) { box.innerHTML = '<p class="hint">지워진 메뉴다.</p>'; return; }
  var info = menuInfo(m);
  $('h-detail').textContent = m.name;
  var parts = info.parts.slice().sort(function (a, b) { return b.cost - a.cost; });
  var total = info.cost || 1;
  var eaten = App.state.meals.filter(function (x) { return x.menuId === m.id; });
  var html = '<div class="stats">' + stat('한 끼 값', won(info.cost)) + stat('사 먹으면', won(m.price)) + stat('사 먹는 값의', pct(info.rate)) + stat('한 끼 아낌', won(info.margin)) + '</div>' +
    '<p>' + rateBadge(info) + ' <span class="hint">먹은 횟수 ' + eaten.length + '번' + (eaten.length ? ' · 마지막 ' + Calc.shortDay(eaten[eaten.length - 1].date) : '') + '</span></p>';
  if (m.memo) html += '<p class="memo">📝 ' + esc(m.memo) + '</p>';
  html += '<h3>무엇이 한 끼 값을 만드나</h3>';
  if (!parts.length && !info.extra) {
    html += emptyBox(ART.search, '재료 줄이 없다', '이 메뉴에 들어가는 재료를 넣어야 한 끼 값이 나온다.', [{ act: 'menu-edit', label: '재료 넣기', cls: 'primary', data: { id: m.id } }]);
  } else {
    html += '<ul class="parts">' + parts.map(function (p) {
      var name = p.ing ? p.ing.name : '(지워진 재료)';
      var share = p.cost / total * 100;
      return '<li><span class="p-name">' + esc(name) + '<small>' + fmtQty(p.line.qty) + p.line.unit + (p.ing && p.ing.yieldPct < 100 ? ' · 수율 ' + p.ing.yieldPct + '%' : '') + '</small></span>' +
        '<span class="p-cost">' + (p.missing ? '<b class="warn-text">값 없음</b>' : won(p.cost) + '<small>' + pct(share) + '</small>') + '</span>' +
        '<span class="meter"><i class="lv-good" style="width:' + Math.min(100, share) + '%"></i></span></li>';
    }).join('') + (info.extra ? '<li><span class="p-name">그 밖의 비용</span><span class="p-cost">' + won(info.extra) + '<small>' + pct(info.extra / total * 100) + '</small></span><span class="meter"><i class="lv-none" style="width:' + Math.min(100, info.extra / total * 100) + '%"></i></span></li>' : '') + '</ul>';
  }
  var topIng = parts.length && parts[0].ing ? parts[0].ing : null;
  html += '<div class="sheet-actions wrap">' +
    btn({ act: 'menu-edit', label: '고치기', data: { id: m.id } }) +
    (topIng ? btn({ act: 'price-for', label: esc(topIng.name) + ' 값 넣기', data: { id: topIng.id } }) : '') +
    btn({ act: 'meal-eat', label: '🍳 오늘 한 끼 먹었다', cls: 'primary', data: { id: m.id } }) +
  '</div>';
  if (eaten.length) html += '<div class="sec-head"><h3>먹은 기록 ' + eaten.length + '번</h3><small>잘못 눌렀으면 지운다</small></div>' + mealList(eaten, 10);
  box.innerHTML = html;
}

// ---------- 11. 목록에서 고르기 ----------
function renderTpl() {
  var tab = App.tplTab;
  $('tpl-tab-ing').setAttribute('aria-selected', tab === 'ing' ? 'true' : 'false');
  $('tpl-tab-menu').setAttribute('aria-selected', tab === 'menu' ? 'true' : 'false');
  $('tpl-cat-wrap').hidden = tab !== 'ing';
  var sel = $('tpl-cat');
  if (!sel.options.length) sel.innerHTML = '<option value="">모든 종류</option>' + CATS.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
  var q = $('tpl-q').value.trim();
  var have = {};
  App.state.ingredients.forEach(function (g) { have[g.name] = true; });
  var box = $('tpl-list');
  if (tab === 'ing') {
    var cat = sel.value;
    var list = ING_TEMPLATES.filter(function (t) { return (!q || t.name.indexOf(q) >= 0) && (!cat || t.cat === cat); });
    if (!list.length) {
      box.innerHTML = emptyBox(ART.search, '목록에 없는 재료다', '직접 이름을 적어 넣을 수 있다.', [
        { act: 'clear-filter', label: '찾기 지우기', data: { scope: 'tpl' } },
        { act: 'ing-new', label: '+ 직접 넣기', cls: 'primary' }
      ]);
      return;
    }
    box.innerHTML = '<p class="count">' + list.length + '개 · 값은 동네·마트마다 달라 비워 두었다</p>' + list.map(function (t) {
      var got = have[t.name];
      return '<div class="row compact"><span class="row-main static"><span class="row-title">' + esc(t.name) + '</span><span class="row-sub">' + esc(t.cat) + ' · 보통 ' + fmtQty(t.buyQty) + t.buyUnit + ' 단위</span></span>' +
        (got ? '<span class="badge soft">있음</span>' : btn({ act: 'tpl-ing', label: '넣기', cls: 'row-btn', data: { name: t.name }, aria: t.name + ' 넣기' })) + '</div>';
    }).join('');
  } else {
    var ms = MENU_TEMPLATES.map(function (t, i) { return { t: t, i: i }; }).filter(function (x) { return !q || x.t.name.indexOf(q) >= 0; });
    if (!ms.length) {
      box.innerHTML = emptyBox(ART.search, '그런 메뉴 예시가 없다', '빈 메뉴로 만들어 재료를 직접 넣을 수 있다.', [
        { act: 'clear-filter', label: '찾기 지우기', data: { scope: 'tpl' } },
        { act: 'menu-new', label: '+ 빈 메뉴', cls: 'primary' }
      ]);
      return;
    }
    box.innerHTML = '<p class="count">고르면 없는 재료는 \'값 없음\'으로 함께 들어온다</p>' + ms.map(function (x) {
      var lack = x.t.lines.filter(function (l) { return !have[l[0]]; }).length;
      return '<div class="row compact"><span class="row-main static"><span class="row-title">' + esc(x.t.name) + ' <small>사 먹으면 ' + won(x.t.out) + '</small></span><span class="row-sub">' +
        esc(x.t.lines.map(function (l) { return l[0] + ' ' + l[1] + l[2]; }).join(', ')) + '</span>' +
        (lack ? '<span class="row-tags"><small>새 재료 ' + lack + '개</small></span>' : '') + '</span>' +
        btn({ act: 'tpl-menu', label: '넣기', cls: 'row-btn', data: { i: x.i }, aria: x.t.name + ' 넣기' }) + '</div>';
    }).join('');
  }
}

// ---------- 0. 내 냉장고 (양문형 냉장고 첫 화면) ----------
function shelfById(id) {
  for (var i = 0; i < FRIDGE_SHELVES.length; i++) if (FRIDGE_SHELVES[i].id === id) return FRIDGE_SHELVES[i];
  return null;
}
function fridgeItemById(id) {
  var list = App.state.fridge.items;
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return null;
}
function itemsIn(shelfId) {
  return App.state.fridge.items.filter(function (x) { return x.shelf === shelfId; }).sort(byExp);
}
// 유통기한이 가까운 것부터, 날짜 없는 것은 뒤로
function byExp(a, b) { return (a.exp || '9999').localeCompare(b.exp || '9999') || byName(a, b); }
// 유통기한까지 남은 날과 표시 (지남·오늘까지·D-n)
function expInfo(exp) {
  if (!Calc.isDay(exp)) return null;
  var d = Calc.daysBetween(Calc.today(), exp);
  if (d < 0) return { d: d, lv: 'bad', text: -d + '일 지남' };
  if (d === 0) return { d: 0, lv: 'bad', text: '오늘까지' };
  if (d <= 3) return { d: d, lv: 'mid', text: 'D-' + d };
  return { d: d, lv: 'good', text: 'D-' + d };
}
function expBadge(exp) {
  var e = expInfo(exp);
  return e ? '<span class="badge lv-' + e.lv + '">' + e.text + '</span>' : '';
}
// 지났거나 3일 안에 끝나는 음식
function expSoon() {
  return App.state.fridge.items.filter(function (x) { var e = expInfo(x.exp); return e && e.d <= 3; }).sort(byExp);
}
function photoAgo(p) {
  var d = Calc.daysBetween(p.date, Calc.today());
  return d <= 0 ? '오늘 찍음' : d + '일 전에 찍음';
}
function latestPhoto() { return App.photos.length ? App.photos[App.photos.length - 1] : null; }

function renderFridge() {
  var fr = App.state.fridge, open = App.fridgeOpen;
  var box = $('fridge');
  box.classList.toggle('open', open);
  showFridgeIn(open);
  document.querySelectorAll('#fridge .handle').forEach(function (h) {
    h.setAttribute('aria-label', (h.closest('.left') ? '냉동실' : '냉장실') + ' 문 ' + (open ? '닫기' : '열기'));
  });
  // 닫힌 문에 붙은 메모지: 왼쪽은 챌린지, 오른쪽은 유통기한
  var ch = activeChal();
  if (ch) {
    var st = chalInfo(ch);
    // R-04: 오늘 쓸 수 있는 돈을 큰 숫자로, 쓴 비율을 원형 게이지로 (둘레 100 짜리 원이라 dasharray 가 곧 %)
    var used = Math.max(0, Math.min(100, st.usedPct)), big = won(st.perDay);
    $('door-l-note').innerHTML = '<b>🎯 ' + esc(ch.name) + '</b>' +
      '<span class="note-row"><svg class="note-ring lv-' + st.pace + '" viewBox="0 0 36 36" aria-hidden="true">' +
        '<circle class="ring-bg" cx="18" cy="18" r="15.9155"/>' +
        '<circle class="ring-val" cx="18" cy="18" r="15.9155" stroke-dasharray="' + used.toFixed(1) + ' 100"/></svg>' +
        '<small>오늘 쓸 돈<br>' + pct(st.usedPct) + ' 씀</small></span>' +
      '<b class="note-big">' + big.replace(/원$/, '') + '<small>원</small></b>';
  } else {
    $('door-l-note').innerHTML = '<b>🎯 챌린지 없음</b><small>\'한 달 10만원\'부터</small>';
  }
  var soon = expSoon();
  var photo = latestPhoto();
  $('door-r-note').innerHTML = soon.length
    ? '<b class="warn-text">⏰ 유통기한 ' + soon.length + '개</b><small>' + esc(soon.slice(0, 2).map(function (x) { return x.name; }).join(', ')) + (soon.length > 2 ? ' 외' : '') + '</small>'
    : '<b>🧊 음식 ' + fr.items.length + '개</b><small>' + (!fr.items.length ? '손잡이를 눌러 열자' : photo ? '사진: ' + photoAgo(photo) : '사진을 찍어 두자') + '</small>';
  // R-06: 닫힌 문 메모지 아래에 다음 할 일 하나 (시작 단계 가운데 첫 미완료). 문이 열렸거나 네 단계를 다 하면 숨긴다
  var steps = startSteps(), nextIdx = -1;
  steps.some(function (s, i) { if (!s.done) { nextIdx = i; return true; } return false; });
  var dn = $('door-next');
  if (nextIdx < 0) {
    dn.innerHTML = '';
    dn.hidden = true;
  } else {
    var ns = steps[nextIdx], doneN = steps.filter(function (s) { return s.done; }).length;
    dn.innerHTML = '<p class="dn-head"><span class="start-no" aria-hidden="true">' + (nextIdx + 1) + '</span>' +
        '<small>다음 할 일 · <b class="dn-count">' + doneN + ' / ' + steps.length + '</b></small></p>' +
      '<b class="dn-title">' + ns.title + '</b>' +
      btn(Object.assign({}, ns.btn, { cls: 'small primary', aria: (nextIdx + 1) + '단계 ' + ns.title + ' ' + ns.btn.label }));
    dn.hidden = open;
  }
  // 문 안쪽: 칸별 메모
  var cols = ['L', 'R'].map(function (side) {
    return '<div class="fridge-col ' + (side === 'L' ? 'freezer' : 'chiller') + '"><p class="col-tag">' + (side === 'L' ? '냉동실' : '냉장실') + '</p>' +
      FRIDGE_SHELVES.filter(function (s) { return s.side === side; }).map(function (s) {
        var items = itemsIn(s.id), memo = fr.memos[s.id] || '';
        var worst = items.length && items[0].exp ? expBadge(items[0].exp) : '';
        return '<button type="button" class="shelf' + (s.id.indexOf('d') >= 0 ? ' door-shelf' : '') + flashCls(s.id) + '" data-act="shelf-open" data-id="' + s.id + '">' +
          '<span class="shelf-name">' + s.icon + ' ' + esc(s.name) + '</span>' +
          '<span class="shelf-sub">' + (items.length ? esc(items.slice(0, 3).map(function (x) { return x.name; }).join(', ')) + (items.length > 3 ? ' 외 ' + (items.length - 3) : '') : '비어 있음') + '</span>' +
          (memo ? '<span class="shelf-memo">📝 ' + esc(memo.length > 24 ? memo.slice(0, 24) + '…' : memo) + '</span>' : '') +
          (worst ? '<span class="shelf-tag">' + worst + '</span>' : '') +
        '</button>';
      }).join('') + '</div>';
  }).join('');
  $('fridge-shelves').innerHTML = cols;
  // 문 안쪽 메뉴: 지금 고른 것 (칸별 / 유통기한 / 사진)
  document.querySelectorAll('.fridge-mode button').forEach(function (b) {
    b.setAttribute('aria-pressed', b.dataset.mode === App.fridgeMode ? 'true' : 'false');
  });
  // 문 안쪽: 사진으로 보기
  $('fridge-photo-in').innerHTML = photo
    ? '<img class="photo-big" src="' + photo.data + '" alt="' + esc(photo.label) + ' 사진, ' + photoAgo(photo) + '"><p class="hint">' + esc(photo.label) + ' · ' + Calc.shortDay(photo.date) + ' · ' + photoAgo(photo) + '</p>' +
      btn({ act: 'photo-open', label: '사진 모두 보기', cls: 'small' })
    : emptyBox(ART.noPhoto, '아직 찍은 사진이 없다', '냉장고 안을 찍어 두면 문을 열지 않고도 무엇이 있었는지 본다.', [
        { act: 'photo-take', label: '📷 사진 찍기', cls: 'primary' }
      ]);
  // 문 안쪽 맨 위: 처음 5분 시작 단계 (H-11 로 닫힌 냉장고 아래에서 문 안쪽으로 옮겼다)
  $('fridge-start').innerHTML = startCardHtml();
  // 문 안쪽: 유통기한 가까운 음식 (H-11 로 첫 화면 아래에서 문 안쪽 메뉴로 옮겼다)
  var exp = $('fridge-exp');
  var dated = fr.items.filter(function (x) { return x.exp; }).sort(byExp);
  if (!fr.items.length) {
    exp.innerHTML = emptyBox(ART.fridgeEmpty, '냉장고가 아직 비어 있다', '칸을 눌러 무엇이 들어 있는지와 유통기한을 적거나, 날짜가 찍힌 곳을 사진으로 찍어 두자. 장 보기 전에 열어 보면 같은 것을 또 사지 않는다.', [
      { act: 'shelf-open', label: '칸 열어 넣기', cls: 'primary', data: { id: FRIDGE_SHELVES[0].id } },
      { act: 'sample', label: '예시 자취방으로 둘러보기' }
    ]);
    return;
  }
  exp.innerHTML = '<div class="sec-head"><h3>유통기한 가까운 음식</h3><small>날짜 넣은 것 ' + dated.length + ' / ' + fr.items.length + '개</small></div>' +
    (dated.length ? dated.slice(0, 8).map(fridgeItemRow).join('') : emptyBox('<span class="emoji-art">⏰🥛</span>', '유통기한을 넣은 음식이 없다', '칸을 열어 음식에 날짜를 적으면 여기 가까운 순서로 모인다. 사 먹기 전에 먼저 먹을 것이 보인다.', [
      { act: 'shelf-open', label: '칸 열어 날짜 넣기', cls: 'primary', data: { id: (fr.items[0] && shelfById(fr.items[0].shelf) ? fr.items[0].shelf : FRIDGE_SHELVES[0].id) } }
    ]));
}
// 냉장고 음식 한 줄 (칸 시트·첫 화면이 같이 쓴다)
function fridgeItemRow(x) {
  var s = shelfById(x.shelf);
  return '<div class="row compact' + flashCls(x.id) + '" data-row="' + x.id + '">' +
    '<button type="button" class="row-main" data-act="item-edit" data-id="' + x.id + '">' +
      '<span class="row-title">' + esc(x.name) + (x.qty ? ' <small>' + esc(x.qty) + '</small>' : '') + '</span>' +
      '<span class="row-sub">' + (s ? s.icon + ' ' + esc(s.name) : '') + (x.exp ? ' · ' + Calc.shortDay(x.exp) + '까지' : ' · 유통기한 없음') + '</span>' +
    '</button>' +
    expBadge(x.exp) +
    btn({ act: 'item-del', label: '꺼냄', cls: 'row-btn', data: { id: x.id }, aria: x.name + ' 꺼냄(지우기)' }) +
  '</div>';
}

// ---------- 19. 냉장고 칸 시트 ----------
function renderShelf() {
  var s = shelfById(App.shelfId);
  if (!s) return;
  var items = itemsIn(s.id);
  $('h-shelf').textContent = s.icon + ' ' + s.name;
  $('shelf-count').textContent = '들어 있는 음식 ' + items.length + '개';
  $('shelf-items').innerHTML = items.length ? items.map(fridgeItemRow).join('')
    : emptyBox('<span class="emoji-art">🧊🥡</span>', '이 칸은 비어 있다', '아래에 음식 이름과 유통기한을 넣으면 이 칸에 들어간다. 날짜를 넣은 음식은 첫 화면에 가까운 순서로 모인다.', [
        { act: 'item-focus', label: '+ 음식 넣기', cls: 'primary' },
        { act: 'item-focus', label: '+7일로 넣기', data: { d: 7 } }
      ]);
  $('item-quick').innerHTML = [['오늘', 0], ['+3일', 3], ['+7일', 7], ['+14일', 14], ['+한 달', 30], ['날짜 없음', -1]].map(function (q) {
    return btn({ act: 'item-exp', label: q[0], cls: 'small', data: { d: q[1] } });
  }).join('');
}

// ---------- 20. 내 냉장고 보기 시트 ----------
function renderPhoto() {
  var sel = $('photo-label');
  if (!sel.options.length) sel.innerHTML = PHOTO_LABELS.map(function (l) { return '<option>' + esc(l) + '</option>'; }).join('');
  var list = App.photos, view = $('photo-view');
  var cur = list.filter(function (p) { return p.id === App.photoId; })[0] || latestPhoto();
  if (!cur) {
    view.innerHTML = emptyBox(ART.noPhoto, '아직 찍은 냉장고 사진이 없다', '문을 연 냉장고 전체나 칸을 찍어 두면, 밖에서도 \'아, 이렇게 있었지\' 하고 본다.', [
      { act: 'photo-take', label: '📷 사진 찍기', cls: 'primary' }
    ]);
    $('photo-thumbs').innerHTML = '';
    return;
  }
  view.innerHTML = '<figure class="photo-fig"><img class="photo-big" src="' + cur.data + '" alt="' + esc(cur.label) + ' 사진, ' + photoAgo(cur) + '">' +
    '<figcaption><b>' + esc(cur.label) + '</b> · ' + cur.date.replace(/-/g, '.') + ' · ' + photoAgo(cur) +
    (Calc.daysBetween(cur.date, Calc.today()) > 7 ? ' <span class="badge lv-mid">오래된 사진</span>' : '') + '</figcaption></figure>' +
    '<div class="btn-row">' + btn({ act: 'photo-del', label: '이 사진 지우기', cls: 'danger small', data: { id: cur.id } }) + '</div>';
  $('photo-thumbs').innerHTML = list.length > 1 ? '<p class="count">사진 ' + list.length + ' / ' + Store.MAX_PHOTOS + '장 · 누르면 크게</p>' + list.slice().reverse().map(function (p) {
    return '<button type="button" class="thumb' + (p.id === cur.id ? ' on' : '') + '" data-act="photo-pick" data-id="' + p.id + '" aria-label="' + esc(p.label) + ' ' + Calc.shortDay(p.date) + ' 사진 보기">' +
      '<img src="' + p.data + '" alt=""><small>' + esc(p.label) + '<br>' + Calc.shortDay(p.date) + '</small></button>';
  }).join('') : '';
}

// ---------- 화면별 그리기 ----------
function renderScreen(name) {
  if (name === 'fridge') renderFridge();
  else if (name === 'home') renderHome();
  else if (name === 'chal') renderChal();
  else if (name === 'ing') renderIng();
  else if (name === 'menu') renderMenu();
  else if (name === 'hist') renderHist();
  else if (name === 'more') renderMore();
  else if (name === 'help') renderHelp();
  App.flash = null;
}
