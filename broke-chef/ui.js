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
function byName(a, b) { return a.name.localeCompare(b.name, 'ko'); }
function flashCls(id) { return App.flash && App.flash === id ? ' flash' : ''; }
function btn(o) {
  var attrs = ' data-act="' + o.act + '"';
  if (o.data) Object.keys(o.data).forEach(function (k) { attrs += ' data-' + k + '="' + esc(o.data[k]) + '"'; });
  if (o.aria) attrs += ' aria-label="' + esc(o.aria) + '"';
  return '<button type="button" class="' + (o.cls || '') + '"' + attrs + '>' + o.label + '</button>';
}
// H-21: 빈 상태는 그림·제목·버튼만. 설명 문장은 두지 않는다
function emptyBox(art, title, buttons) {
  return '<div class="empty"><div class="empty-art" aria-hidden="true">' + art + '</div><h3>' + title + '</h3>' +
    '<div class="empty-btns">' + buttons.map(btn).join('') + '</div></div>';
}
// 빈 화면 그림: 사람 그림 assets/한끼_계산기_2.png 한 장을 3칸×2줄로, _3.png 는 왼쪽 빈 냉장고·오른쪽 사진 없음으로 잘라 쓴다
var ART = {
  chal: '<span class="art-img six c2"></span>',   // 달력·과녁
  spend: '<span class="art-img six c3"></span>',  // 장바구니·배달 상자·영수증
  meal: '<span class="art-img six c5"></span>',   // 볶음밥·밥·젓가락 쟁반
  fridgeEmpty: '<span class="art-img two left"></span>',
  noPhoto: '<span class="art-img two right"></span>'
};

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
// 집밥 횟수·한 끼 평균·배달·외식과 견준 아낀 돈 (H-16 '잘 먹겠습니다'). 집밥은 돈을 바꾸지 않는다
function mealStats(ch) {
  var sp = spendsIn(ch), meals = mealsIn(ch).length;
  var shop = sp.filter(function (x) { return x.kind === '장보기'; }).reduce(function (a, x) { return a + x.amount; }, 0);
  var outs = sp.filter(function (x) { return EAT_OUT_KINDS.indexOf(x.kind) >= 0; });
  var outTotal = outs.reduce(function (a, x) { return a + x.amount; }, 0);
  return { meals: meals, shop: shop, avg: Calc.mealAvg(shop, meals), outCount: outs.length,
    saving: Calc.mealSaving(shop, meals, outTotal, outs.length) };
}
function mealLine(ms) {
  return ms.meals > 0 ? '🍚 집밥 ' + ms.meals + '끼 · 한 끼 평균 ' + won(ms.avg) : '🍚 아직 집밥 기록이 없어요';
}
function kindIcon(k) {
  for (var i = 0; i < SPEND_KINDS.length; i++) if (SPEND_KINDS[i].key === k) return SPEND_KINDS[i].icon;
  return '🧾';
}
var PACE_TEXT = { good: '여유', mid: '조금 빠름', bad: '넘음' };
var STATUS_TEXT = { active: '진행 중', won: '성공', lost: '실패', quit: '그만둠' };
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
// 챌린지 기간의 날마다 그날 쓴 돈 합·집밥 횟수와 하루 기준을 견준다: good(기준 이하)·bad(넘음)·future(오늘 뒤)
function chalDays(ch) {
  var base = dayBase(ch), today = Calc.today(), sums = {}, eats = {};
  spendsIn(ch).forEach(function (x) { sums[x.date] = (sums[x.date] || 0) + x.amount; });
  mealsIn(ch).forEach(function (x) { eats[x.date] = (eats[x.date] || 0) + 1; });
  var out = [], total = Calc.periodDays(ch.start, ch.end);
  for (var i = 0; i < total; i++) {
    var d = Calc.addDays(ch.start, i), spent = sums[d] || 0;
    out.push({ date: d, spent: spent, meals: eats[d] || 0, today: d === today, state: d > today ? 'future' : spent <= base ? 'good' : 'bad' });
  }
  return out;
}
// 오늘(챌린지가 끝났으면 마지막 날)부터 거꾸로 이어진 good 날 수
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
function riceDots(n) {
  if (!n) return '';
  return '<span class="rice" aria-hidden="true">' + (n > 3 ? '🍚' + n : new Array(n + 1).join('🍚')) + '</span>';
}
// ---------- 쪽 넘기기 (H-18: 화면을 넘기지 않는다. 칸 높이에 들어가는 줄만 그리고 '‹ 앞'·'다음 ›' 으로 쪽을 옮긴다) ----------
// o: { head, foot, n(줄 수), row(i, first) → 줄 HTML, start(null 이면 처음), focus(처음 열 때 보여야 할 줄) }
// 돌려주는 값 { start, end, prev } — end 는 다음 쪽 시작, prev 는 앞 쪽 시작
function pagedCard(box, o) {
  box.innerHTML = '<div class="card pg-card">' + o.head + '<div class="pg-list"></div>' + (o.foot || '') +
    '<div class="pg-nav"><button type="button" class="small" data-act="pg-prev" aria-label="앞 쪽 보기">‹ 앞</button>' +
    '<span class="pg-at" aria-live="polite"></span><button type="button" class="small" data-act="pg-next" aria-label="다음 쪽 보기">다음 ›</button></div></div>';
  var card = box.firstElementChild, list = card.querySelector('.pg-list'), nav = card.querySelector('.pg-nav'), n = o.n;
  function over() { return list.scrollHeight > list.clientHeight + 1; }
  function wrap(i, first) { return '<div class="pg-row">' + o.row(i, first) + '</div>'; }
  // from 부터 넘치기 직전까지 넣는다(적어도 한 줄). 다음 쪽 시작을 돌려준다
  function fill(from) {
    list.innerHTML = '';
    var i = from;
    for (; i < n; i++) {
      list.insertAdjacentHTML('beforeend', wrap(i, i === from));
      if (i > from && over()) { list.removeChild(list.lastElementChild); break; }
    }
    return i;
  }
  // endEx 앞에서 거꾸로 들어가는 만큼 — 그 쪽의 시작을 돌려준다
  function fillBack(endEx) {
    list.innerHTML = '';
    var i = endEx - 1;
    for (; i >= 0; i--) {
      list.insertAdjacentHTML('afterbegin', wrap(i, true));
      if (i < endEx - 1 && over()) return i + 1;
    }
    return 0;
  }
  var start = o.start == null ? 0 : Math.max(0, Math.min(o.start, n - 1)), end = fill(start);
  if (o.start == null && o.focus != null && o.focus >= end) { start = fillBack(Math.min(n, o.focus + 1)); end = fill(start); }
  var prev = 0;
  if (start > 0) { prev = fillBack(start); end = fill(start); }
  nav.hidden = start === 0 && end >= n;
  nav.firstElementChild.disabled = start === 0;
  nav.lastElementChild.disabled = end >= n;
  nav.querySelector('.pg-at').textContent = n ? (start + 1) + '–' + end + ' / ' + n : '';
  return { start: start, end: end, prev: prev };
}

// ③ 날짜 판: 지킨 날 파랑·넘은 날 당근색·남은 날 옅게, 오늘은 테두리, 집밥 먹은 날은 작은 🍚 점. 한 줄이 한 주(7칸)
function chalDaysHtml(ch) {
  var days = chalDays(ch), base = dayBase(ch);
  var good = days.filter(function (d) { return d.state === 'good'; }).length;
  var bad = days.filter(function (d) { return d.state === 'bad'; }).length;
  var weeks = Math.ceil(days.length / 7);
  return {
    head: '<div class="sec-head"><h3>날짜 판</h3><small>하루 기준 ' + won(base) + '</small></div>',
    foot: '<p class="hint day-legend"><span class="dot good"></span>지킨 날 ' + good + ' · <span class="dot bad"></span>넘은 날 ' + bad +
      ' · <span class="dot future"></span>남은 날 ' + (days.length - good - bad) + ' · 🍚 집밥</p>',
    n: weeks,
    focus: Math.max(0, Math.min(weeks - 1, Math.floor(Calc.daysBetween(ch.start, Calc.today()) / 7))),
    row: function (w) {
      return '<ol class="chal-days">' + days.slice(w * 7, w * 7 + 7).map(function (d, k) {
        var i = w * 7 + k, p = d.date.split('-'), label = i === 0 || k === 0 || p[2] === '01' ? (+p[1]) + '/' + (+p[2]) : String(+p[2]);
        return '<li class="day ' + d.state + (d.today ? ' today' : '') + '" aria-label="' + Calc.shortDay(d.date) + (d.today ? ' 오늘' : '') + ' ' + DAY_TEXT[d.state] +
          (d.state === 'future' ? '' : ' ' + won(d.spent)) + (d.meals ? ' 집밥 ' + d.meals + '번' : '') + '"' + (d.today ? ' aria-current="date"' : '') + '>' +
          '<span class="dnum">' + label + '</span>' + riceDots(d.meals) + '</li>';
      }).join('') + '</ol>';
    }
  };
}
// 집밥 기록: 날짜별 횟수와 '빼기' (A-06 — 되돌리기 알림이 사라진 뒤에도 잘못 누른 집밥을 뺀다). 최근 날부터
function mealLogHtml(days) {
  var eaten = days.filter(function (d) { return d.meals > 0; }).reverse();
  var total = eaten.reduce(function (a, d) { return a + d.meals; }, 0);
  return {
    head: '<div class="sec-head"><h3>🍚 집밥 기록 ' + total + '끼</h3></div>',
    n: eaten.length,
    row: function (i) {
      var d = eaten[i];
      return '<div class="row meal-row' + flashCls('meal-' + d.date) + '"><span class="row-title">' + Calc.shortDay(d.date) + ' <small>(' + dowOf(d.date) + ')</small></span>' +
        '<span class="meal-n">' + riceDots(Math.min(d.meals, 3)) + ' ' + d.meals + '번</span>' +
        btn({ act: 'meal-del', label: '빼기', cls: 'small row-btn', data: { date: d.date }, aria: Calc.shortDay(d.date) + ' 집밥 하나 빼기' }) + '</div>';
    }
  };
}
// ① 파란 챌린지 카드: 남은 돈 / 오늘 쓸 수 있는 돈 / 진행 막대와 상태 배지 / 집밥 n끼 · 한 끼 평균 (H-16)
// App.chalFrom: 저장 직전 값. 있으면 data-from 에 넣어 그린 뒤 rollChalNums 가 굴린다.
function chalCard(ch) {
  var st = chalInfo(ch), ms = mealStats(ch);
  var f = App.chalFrom && App.chalFrom.id === ch.id ? App.chalFrom : { left: st.left, perDay: st.perDay, usedPct: st.usedPct };
  return '<div class="card chal-hero pace-' + st.pace + '">' +
    '<p class="hero-name">' + esc(ch.name) + ' <small>' + Calc.shortDay(ch.start) + ' ~ ' + Calc.shortDay(ch.end) +
      (st.upcoming ? ' · 곧 시작' : ' · ' + st.passed + '/' + st.total + '일째') + '</small></p>' +
    '<p class="chal-big hero-left"><small>남은 돈</small><b data-from="' + numAttr(f.left) + '" data-to="' + numAttr(st.left) + '">' + won(st.left) + '</b></p>' +
    '<p class="chal-big hero-day"><small>오늘 쓸 수 있는 돈</small><b data-from="' + numAttr(f.perDay) + '" data-to="' + numAttr(st.perDay) + '">' + won(st.perDay) + '</b></p>' +
    '<div class="hero-meter-row"><div class="chal-meter" aria-hidden="true"><i class="used" data-from="' + Math.min(100, f.usedPct || 0) + '" data-to="' + Math.min(100, st.usedPct) + '" style="width:' + Math.min(100, st.usedPct) + '%"></i><b class="time" style="left:' + Math.min(100, st.timePct) + '%"></b></div>' +
      '<span class="badge pace lv-' + st.pace + '">' + PACE_TEXT[st.pace] + '</span></div>' +
    (st.pace !== 'good' && st.ahead > 0 ? '<p class="hero-ahead">계획보다 ' + won(st.ahead) + ' 더 썼어요</p>' : '') +
    '<p class="hero-meal" id="hero-meal">' + mealLine(ms) + '</p>' +
  '</div>';
}
// 식비 한 줄 (그날 묶음 안에서)
function spendRow(x) {
  return '<div class="row' + flashCls(x.id) + '" data-row="' + x.id + '">' +
    '<button type="button" class="row-main" data-act="spend-edit" data-id="' + x.id + '">' +
      '<span class="row-title">' + kindIcon(x.kind) + ' ' + esc(x.kind) + (x.memo ? ' <small>· ' + esc(x.memo) + '</small>' : '') + '</span>' +
      '<b class="amt">' + won(x.amount) + '</b>' +
    '</button>' +
  '</div>';
}
// ⑤ 식비 기록: 날짜별로 묶고, 하루 기준을 넘은 날은 합계 옆에 작은 주황 점만 둔다 (H-16)
var DOW = ['일', '월', '화', '수', '목', '금', '토'];
function dowOf(s) { var p = String(s).split('-'); return DOW[new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay()]; }
// 쪽 넘기기 줄: 식비 한 건이 한 줄. 날이 바뀌는 줄과 쪽의 첫 줄 위에 날짜·그날 합계 머리를 단다
function spendGroupsHtml(list, ch) {
  var base = ch ? dayBase(ch) : Infinity, today = Calc.today(), sums = {}, counts = {};
  list.forEach(function (x) { sums[x.date] = (sums[x.date] || 0) + x.amount; counts[x.date] = (counts[x.date] || 0) + 1; });
  return {
    head: '<div class="sec-head"><h3>식비 기록 ' + list.length + '건</h3></div>',
    n: list.length,
    row: function (i, first) {
      var x = list[i], d = x.date, head = '';
      if (first || list[i - 1].date !== d) {
        var over = sums[d] > base;
        head = '<h4 class="dg-head" aria-label="' + Calc.shortDay(d) + ' ' + dowOf(d) + '요일 식비 ' + counts[d] + '건 ' + won(sums[d]) + (over ? ' 하루 기준 넘음' : '') + '">' +
          '<span class="dg-day">' + Calc.shortDay(d) + ' <small>(' + dowOf(d) + ')</small>' + (d === today ? ' <span class="badge soft">오늘</span>' : '') + '</span>' +
          '<span class="dg-sum">' + (over ? '<i class="over-dot" title="하루 기준 ' + won(base) + ' 넘음"></i>' : '') + '<b>' + won(sums[d]) + '</b></span></h4>';
      }
      return head + spendRow(x);
    }
  };
}

// ---------- 다음 할 일 (H-16: 세 단계, 실제 데이터로 판단. 예시 자취방도 끝난 것으로 본다) ----------
function startSteps() {
  var st = App.state;
  return [
    { key: 'chal', title: '챌린지 고르기', done: st.challenges.length > 0, btn: { act: 'chal-open', label: '고르기' } },
    { key: 'spend', title: '첫 식비 쓰기', done: st.spends.length > 0, btn: { act: 'spend-new', label: '쓰기' } },
    { key: 'item', title: '냉장고에 음식 하나 넣기', done: st.fridge.items.length > 0, btn: { act: 'shelf-open', label: '넣기', data: { id: 'r2' } } }
  ];
}

// ---------- 냉장고 ----------
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
// 유통기한까지 남은 날과 표시. 빨강(expired)은 지난 것에만 쓴다 (H-16)
function expInfo(exp) {
  if (!Calc.isDay(exp)) return null;
  var d = Calc.daysBetween(Calc.today(), exp);
  if (d < 0) return { d: d, lv: 'expired', text: -d + '일 지남' };
  if (d === 0) return { d: 0, lv: 'mid', text: '오늘까지' };
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
// 재료 이름 묶음 대표 이름 (H-46, recipe_match.js 의 IngMatch.keyOf — '달걀'→계란, '쪽파'→파, '쇠고기'→소고기)
function foodKey(name) {
  return typeof IngMatch !== 'undefined' ? IngMatch.keyOf(name) : String(name || '').replace(/\s+/g, '');
}
// 두 음식 이름이 같은 재료 묶음인지 (H-46)
function sameFood(a, b) { return !!a && !!b && foodKey(a) === foodKey(b); }
// 음식 이름 → 자주 넣는 음식(FOODS). 같은 이름, 없으면 같은 재료 묶음(H-46 표, 대표 이름 먼저), 없으면 이름 안에 든 가장 긴 음식 이름
function foodByName(name) {
  var n = String(name || '').replace(/\s+/g, ' ').trim();
  if (!n) return null;
  var k = foodKey(n);
  var same = FOODS.filter(function (f) { return foodKey(f.name) === k; });
  return FOODS.filter(function (f) { return f.name === n; })[0] ||
    same.filter(function (f) { return f.name === k; })[0] || same[0] ||
    FOODS.filter(function (f) { return f.name.length >= 2 && n.indexOf(f.name) >= 0; })
      .sort(function (a, b) { return b.name.length - a.name.length; })[0] || null;
}
function itemIcon(name, shelfId) {
  var f = foodByName(name);
  if (f) return f.icon;
  var s = shelfById(shelfId);
  return s ? s.icon : '🍽️';
}
function itemIcHtml(x) { return '<span class="item-ic" aria-hidden="true">' + itemIcon(x.name, x.shelf) + '</span>'; }
function photoAgo(p) {
  var d = Calc.daysBetween(p.date, Calc.today());
  return d <= 0 ? '오늘 찍었어요' : d + '일 전에 찍었어요';
}
function latestPhoto() { return App.photos.length ? App.photos[App.photos.length - 1] : null; }

function renderFridge() {
  var fr = App.state.fridge, open = App.fridgeOpen;
  var box = $('fridge');
  box.classList.toggle('open', open);
  showFridgeIn(open);
  box.classList.toggle('coach', App.coach && !open); // 손잡이만 깜빡인다 (H-21: 말풍선 글은 뺐다)
  document.querySelectorAll('#fridge .handle').forEach(function (h) {
    h.setAttribute('aria-label', (h.closest('.left') ? '냉동실' : '냉장실') + ' 문 ' + (open ? '닫기' : '열기'));
  });
  // 냉동실 메모지 세 줄: 챌린지 이름 / '오늘 쓸 수 있는 돈' / 큰 금액. 원형 게이지는 오른쪽 위에 작게 (H-16)
  var ch = activeChal();
  if (ch) {
    var st = chalInfo(ch), used = Math.max(0, Math.min(100, st.usedPct));
    $('door-l-note').innerHTML = '<svg class="note-ring lv-' + st.pace + '" viewBox="0 0 36 36" aria-hidden="true">' +
        '<circle class="ring-bg" cx="18" cy="18" r="15.9155"/>' +
        '<circle class="ring-val" cx="18" cy="18" r="15.9155" stroke-dasharray="' + used.toFixed(1) + ' 100"/></svg>' +
      '<b class="note-title">' + esc(ch.name) + '</b>' +
      '<small>오늘 쓸 수 있는 돈</small>' +
      '<b class="note-big">' + won(st.perDay).replace(/원$/, '') + '<small>원</small></b>';
  } else {
    $('door-l-note').innerHTML = '<b class="note-title">챌린지 없음</b>';
  }
  // 냉동실 문 아래: '이번 주' 7칸 + 연속 지킨 날. 챌린지가 없어도 빈 칸 7개로 자리를 채운다
  var cells = [], streak = 0;
  if (ch) {
    var wDays = chalDays(ch), wEnd = Math.max(0, Math.min(wDays.length - 1, Calc.daysBetween(ch.start, Calc.today())));
    var wFrom = Math.max(0, Math.min(wEnd - 6, wDays.length - 7));
    cells = wDays.slice(wFrom, wFrom + 7);
    streak = streakOf(ch, wDays);
  }
  while (cells.length < 7) cells.push({ state: 'future', date: '', spent: 0, meals: 0 });
  $('door-week').innerHTML = '<small class="dw-head">이번 주</small>' +
    '<ol class="dw-days">' + cells.map(function (d) {
      return '<li class="day ' + d.state + (d.today ? ' today' : '') + '"' + (d.date ? ' aria-label="' + Calc.shortDay(d.date) + (d.today ? ' 오늘' : '') + ' ' + DAY_TEXT[d.state] + (d.meals ? ' 집밥 ' + d.meals + '번' : '') + '"' : ' aria-hidden="true"') +
        (d.today ? ' aria-current="date"' : '') + '>' + (d.meals ? '<i class="rice-dot"></i>' : '') + '</li>';
    }).join('') + '</ol>' +
    '<b class="dw-streak">' + (ch ? '🔥 ' + streak + '일 연속' : '') + '</b>';
  // 냉장실 메모지: 임박이 있으면 '⏰ 곧 먹어야 해요 n개' + 이름 두 개, 없으면 '음식 n개'
  var soon = expSoon();
  $('door-r-note').innerHTML = soon.length
    ? '<b class="note-title warn-text">⏰ 곧 먹어야 해요 ' + soon.length + '개</b><small>' + esc(soon.slice(0, 2).map(function (x) { return x.name; }).join(', ')) + '</small>'
    : '<b class="note-title">🧊 음식 ' + fr.items.length + '개</b><small>' + (fr.items.length ? '곧 먹어야 할 것은 없어요' : '비어 있어요') + '</small>';
  // 냉장실 문 아래: 다음 할 일 (세 단계). 다 끝났으면 오늘 집밥·사진 한 장 카드로 자리를 채운다
  var steps = startSteps(), next = steps.filter(function (s) { return !s.done; })[0];
  var dn = $('door-next');
  if (next) {
    var doneN = steps.filter(function (s) { return s.done; }).length, idx = steps.indexOf(next);
    dn.className = 'door-next';
    dn.setAttribute('aria-label', '다음 할 일');
    dn.innerHTML = '<p class="dn-head"><small>다음 할 일</small><b class="dn-count">' + doneN + ' / ' + steps.length + '</b></p>' +
      '<b class="dn-title">' + (idx + 1) + '. ' + next.title + '</b>' +
      btn(Object.assign({}, next.btn, { cls: 'small primary', aria: next.title + ' ' + next.btn.label }));
  } else {
    var todayMeals = App.state.meals.filter(function (m) { return m.date === Calc.today(); }).length, ph = latestPhoto();
    dn.className = 'door-next door-today';
    dn.setAttribute('aria-label', '오늘');
    dn.innerHTML = '<p class="dn-head"><small>오늘</small></p>' +
      '<b class="dn-title">🍚 집밥 ' + todayMeals + '번</b>' +
      '<small class="dn-sub">' + (ph ? '📷 ' + photoAgo(ph) : '📷 아직 찍은 사진이 없어요') + '</small>';
  }
  dn.hidden = open;
  // 문 안쪽: 칸 버튼은 냉장고 그림 속 실제 선반·서랍 자리(FRIDGE_SHELVES at, %)에 놓는다 (H-28)
  $('fridge-in').dataset.mode = App.fridgeMode;
  $('fridge-shelves').innerHTML = ['L', 'R'].map(function (side) {
    return '<div class="fridge-col ' + (side === 'L' ? 'freezer' : 'chiller') + '" role="group" aria-label="' + (side === 'L' ? '냉동실' : '냉장실') + '"><p class="col-tag">' + (side === 'L' ? '냉동실' : '냉장실') + '</p>' +
      FRIDGE_SHELVES.filter(function (s) { return s.side === side; }).map(function (s) {
        var items = itemsIn(s.id);
        var worst = items.length && items[0].exp ? expBadge(items[0].exp) : '';
        var at = s.at || [0, 0, 0, 0];
        return '<button type="button" class="shelf' + (s.id.indexOf('d') >= 0 ? ' door-shelf' : '') + flashCls(s.id) + '" data-act="shelf-open" data-id="' + s.id + '"' +
          ' style="left:' + at[0] + '%;top:' + at[1] + '%;width:' + at[2] + '%;height:' + at[3] + '%">' +
          '<span class="shelf-name"><span aria-hidden="true">' + s.icon + '</span> <span class="shelf-label">' + esc(s.name) + '</span></span>' +
          (items.length ? '<span class="shelf-n" aria-hidden="true">' + items.length + '</span>' : '') +
          '<span class="shelf-sub">' + (items.length ? items.slice(0, 3).map(function (x) {
            return '<span class="shelf-item">' + itemIcHtml(x) + esc(x.name) + '</span>';
          }).join('') + (items.length > 3 ? '<span class="shelf-more">외 ' + (items.length - 3) + '</span>' : '') : '비어 있어요') + '</span>' +
          (worst ? '<span class="shelf-tag">' + worst + '</span>' : '') +
        '</button>';
      }).join('') + '</div>';
  }).join('');
  document.querySelectorAll('.fridge-mode button').forEach(function (b) {
    b.setAttribute('aria-pressed', b.dataset.mode === App.fridgeMode ? 'true' : 'false');
  });
  renderPhoto();
  // 문 안쪽: 유통기한 가까운 순 음식 목록 (H-40). 지난 것 맨 위, 날짜 없는 것은 맨 아래(byExp). 개수로 자르지 않고
  // 목록(.exp-list)만 위아래로 넘긴다. 머리 제목·개수 덧글은 두지 않는다 (탭 이름 '⏰ 유통기한' 이 제목)
  // H-42: 목록 위 '📷 유통기한 찍기' — 찍어서 읽은 날짜가 채워진 음식 넣기 창을 연다 (app.js snapExpDate)
  var exp = $('fridge-exp');
  var snap = '<button type="button" class="exp-snap" data-act="exp-snap"' + (App.snapBusy ? ' aria-busy="true"' : '') + ' aria-label="유통기한 찍기 — 사진에서 날짜를 읽어 음식 넣기">' +
    '<span aria-hidden="true">📷</span> 유통기한 찍기</button>';
  // H-43: 판 맨 아래 버튼 줄 — 왼쪽 '음식 넣기'(빈 음식 넣기 창), 오른쪽 '문 닫기'(냉장고 문을 닫는다). 목록 밖이라 넘기지 않는다
  var foot = '<div class="exp-foot">' +
    '<button type="button" class="foot-add" data-act="exp-add"><span class="foot-ic" aria-hidden="true">＋</span>음식 넣기</button>' +
    '<button type="button" class="primary foot-close" data-act="fridge-door">문 닫기</button></div>';
  if (!fr.items.length) {
    exp.innerHTML = snap + emptyBox(ART.fridgeEmpty, '냉장고가 아직 비어 있어요', [
      { act: 'shelf-open', label: '칸 열기', cls: 'primary', data: { id: 'r2' } },
      { act: 'sample', label: '예시 보기' }
    ]) + foot;
    return;
  }
  exp.innerHTML = snap + '<div class="exp-list" role="list" aria-label="유통기한 가까운 순 음식" tabindex="0">' +
    fr.items.slice().sort(byExp).map(function (x) { return fridgeItemRow(x, true); }).join('') + '</div>' + foot;
}
// 냉장고 음식 한 줄. 칸 창(withShelf 없음)은 세 줄 모양(shelfItemRow, H-30).
// 유통기한 목록 한 줄 (H-40): 이름(굵게) · 수량 · D-n 배지 · 칸 이름(작게) · 메모(작게, 있을 때만). 줄 사이 가는 구분선.
// H-20: 유통기한 목록의 줄은 눌러도 칸 창으로 넘어가지 않는다(div). 칸 창 안의 줄만 그 자리에서 고친다
// H-41: 유통기한 목록은 보기만 한다. 줄 안에 data-act 가 하나도 없어 음식을 눌러도 창(고치기·꺼내기 확인)이 뜨지 않는다.
// 꺼내기는 그 음식이 든 칸 창(shelfItemRow)에서 한다
function fridgeItemRow(x, withShelf) {
  if (!withShelf) return shelfItemRow(x);
  var s = shelfById(x.shelf);
  return '<div class="row item-row exp-row-1' + flashCls(x.id) + '" data-row="' + x.id + '" role="listitem">' +
    '<div class="row-main">' +
      '<span class="ex-name">' + itemIcHtml(x) + esc(x.name) + '</span>' +
      (x.qty ? '<span class="ex-qty">' + esc(x.qty) + '</span>' : '') +
      expBadge(x.exp) +
      (s ? '<span class="ex-shelf">' + s.icon + ' ' + esc(s.name) + '</span>' : '') +
      (x.memo ? '<span class="ex-memo">' + esc(x.memo) + '</span>' : '') +
    '</div>' +
  '</div>';
}
// 칸 창의 음식 한 개 (H-30): 1줄 이름(굵게·크게) / 2줄 수량(보통 글자) + D-n 색 배지 + 날짜 / 3줄 메모(작고 옅게, 있을 때만).
// 음식 사이는 가는 구분선(--row-line)
// H-57: 이름(크고 굵게) · 수량(파랑 테두리 알약) · 유통기한(색 배지 + 'n월 n일까지') · 메모(왼쪽 막대 쪽지)가 서로 다른 글자 모양
function shelfItemRow(x) {
  var sub = (x.qty ? '<span class="it-qty">' + esc(x.qty) + '</span>' : '') +
    (x.exp ? expBadge(x.exp) + '<span class="it-date">' + Calc.shortDay(x.exp) + '까지</span>' : '');
  return '<div class="row item-row item-3' + flashCls(x.id) + '" data-row="' + x.id + '">' +
    '<button type="button" class="row-main" data-act="item-edit" data-id="' + x.id + '">' +
      '<span class="it-name">' + itemIcHtml(x) + esc(x.name) + '</span>' +
      (sub ? '<span class="it-sub">' + sub + '</span>' : '') +
      (x.memo ? '<span class="it-memo">' + esc(x.memo) + '</span>' : '') +
    '</button>' +
    btn({ act: 'item-del', label: '꺼내기', cls: 'row-btn', data: { id: x.id }, aria: x.name + ' 꺼내기(지우기)' }) +
  '</div>';
}

// ---------- 냉장고 칸 시트 ----------
function renderShelf() {
  var s = shelfById(App.shelfId);
  if (!s) return;
  var items = itemsIn(s.id);
  $('h-shelf').textContent = s.icon + ' ' + s.name;
  $('shelf-count').textContent = '들어 있는 음식 ' + items.length + '개';
  $('shelf-items').innerHTML = items.length ? items.map(function (x) { return fridgeItemRow(x, false); }).join('')
    : emptyBox('<span class="emoji-art">🧊🥡</span>', '이 칸은 비어 있어요', [
        { act: 'item-focus', label: '넣기', cls: 'primary' }
      ]);
  // 이 칸에 자주 넣는 음식: 한 번 누르면 오늘+n일로 바로 들어간다. 이미 이 칸에 있는 음식은 빼고 그린다 (R-18)
  // 같은 재료 묶음이면 이름이 달라도 있는 것으로 본다 (H-46 — 칸에 '쪽파'가 있으면 '대파', '달걀'이 있으면 '계란' 칩을 숨김)
  var quick = (SHELF_QUICK[s.id] || []).filter(function (q) {
    return !items.some(function (x) { return sameFood(x.name, q[0]); });
  });
  $('shelf-quick').innerHTML = quick.map(function (q) {
    var f = foodByName(q[0]);
    return btn({ act: 'item-quick-add', label: (f ? f.icon : s.icon) + ' ' + esc(q[0]), cls: 'chip', data: { name: q[0], d: q[1] }, aria: q[0] + ' 넣기, 유통기한 ' + q[1] + '일 뒤' });
  }).join('');
  $('shelf-quick').hidden = !quick.length;
  renderItemHint();
}
// 유통기한 날짜 고르기 (H-35): 연·월·일 세 칸을 #item-exp 값(YYYY-MM-DD 또는 빈칸)에 맞춰 그린다.
// 연도는 작년부터 10년 뒤까지(submitItem 날짜 검사와 같은 범위), 일은 그 달 마지막 날까지
function renderExpPick() {
  var v = $('item-exp').value, p = Calc.isDay(v) ? v.split('-').map(Number) : null;
  var ty = +Calc.today().slice(0, 4), years = [];
  for (var y = ty - 1; y <= ty + 10; y++) years.push(y);
  if (p && years.indexOf(p[0]) < 0) years.push(p[0]);
  function opts(list, unit, empty, cur) {
    return '<option value="">' + empty + '</option>' + list.map(function (n) {
      return '<option value="' + n + '"' + (n === cur ? ' selected' : '') + '>' + n + unit + '</option>';
    }).join('');
  }
  var months = [], days = [], last = p ? Calc.daysInMonth(p[0], p[1]) : 31;
  for (var m = 1; m <= 12; m++) months.push(m);
  for (var d = 1; d <= last; d++) days.push(d);
  $('item-exp-y').innerHTML = opts(years, '년', '연도', p && p[0]);
  $('item-exp-m').innerHTML = opts(months, '월', '월', p && p[1]);
  $('item-exp-d').innerHTML = opts(days, '일', '일', p && p[2]);
  $('item-exp-pick').classList.toggle('set', !!p);
}
// 고른 유통기한은 날짜 고르기 아래 한 줄로. +n일 빠른 버튼은 두지 않는다 (H-35·H-58: 연·월·일 칸과 카메라만)
function renderItemHint() {
  var exp = $('item-exp').value;
  var e = expInfo(exp);
  $('item-exp-out').textContent = e ? '유통기한 ' + Calc.shortDay(exp) + ' · ' + e.text : '';
  renderExpPick();
}

// ---------- 📷 사진 탭 (열린 냉장고 안) ----------
var CAM_SVG = '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.3-2h5.2l1.3 2h1.6A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="12.5" r="3.4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
// H-45: 사진 칸 자체가 버튼 — 누르면 다른 창 없이 바로 카메라(photo-take). 없으면 카메라 그림 + '사진 찍기', 있으면 사진 + 📷 동그라미
function renderPhoto() {
  var list = App.photos, view = $('photo-view');
  var cur = list.filter(function (p) { return p.id === App.photoId; })[0] || latestPhoto();
  if (!cur) {
    view.innerHTML = '<button type="button" class="photo-slot empty-slot" data-act="photo-take" aria-label="냉장고 사진 찍기">' +
      '<span class="slot-cam">' + CAM_SVG + '</span><span class="slot-name">사진 찍기</span></button>';
    $('photo-thumbs').innerHTML = '';
    $('photo-label-ask').hidden = true;
    return;
  }
  view.innerHTML = '<button type="button" class="photo-slot" data-act="photo-take" aria-label="' + esc(cur.label || '냉장고') + ' 사진, ' + photoAgo(cur) + ' — 누르면 다시 찍기">' +
      '<img class="photo-big" src="' + cur.data + '" alt=""><span class="slot-dot" aria-hidden="true">📷</span></button>' +
    '<div class="photo-cap"><span class="cap-txt"><b>' + esc(cur.label || '이름표 없음') + '</b> · ' + Calc.shortDay(cur.date) + ' · ' + photoAgo(cur) +
      (Calc.daysBetween(cur.date, Calc.today()) > 7 ? ' <span class="badge lv-mid">오래된 사진</span>' : '') + '</span>' +
      btn({ act: 'photo-del', label: '지우기', cls: 'small danger', data: { id: cur.id } }) + '</div>';
  // 이름표는 찍은 뒤에 묻는다. 고르기 전(빈 이름표)일 때만 보인다
  var ask = $('photo-label-ask');
  ask.hidden = !!cur.label;
  $('photo-labels').innerHTML = cur.label ? '' : PHOTO_LABELS.map(function (l) {
    return btn({ act: 'photo-label', label: esc(l), cls: 'chip', data: { id: cur.id, label: l } });
  }).join('');
  $('photo-thumbs').innerHTML = list.length > 1 ? '<p class="count">사진 ' + list.length + ' / ' + Store.MAX_PHOTOS + '장</p>' + list.slice().reverse().map(function (p) {
    return '<button type="button" class="thumb' + (p.id === cur.id ? ' on' : '') + '" data-act="photo-pick" data-id="' + p.id + '" aria-label="' + esc(p.label || '냉장고') + ' ' + Calc.shortDay(p.date) + ' 사진 보기">' +
      '<img src="' + p.data + '" alt=""><small>' + esc(p.label || '사진') + '<br>' + Calc.shortDay(p.date) + '</small></button>';
  }).join('') : '';
}

// ---------- 식비 챌린지 화면 ----------
// '오늘 챙길 것': 유통기한 임박, 오늘 식비 미입력 두 가지만 (H-16)
function todayChecks(ch) {
  var out = [], soon = expSoon();
  if (soon.length) out.push(btn({ act: 'fridge-open-exp', label: '⏰ 곧 먹어야 해요 ' + soon.length + '개', cls: 'chip warn' }));
  var today = Calc.today();
  if (ch && !App.state.spends.some(function (x) { return x.date === today; })) out.push(btn({ act: 'spend-new', label: '🧾 오늘 식비를 아직 안 넣었어요', cls: 'chip' }));
  return out.length ? '<div class="today-checks chip-row" role="group" aria-label="오늘 챙길 것">' + out.join('') + '</div>' : '';
}
// 챌린지 화면 아래 보기 탭 (H-18: 한 번에 한 장만, 줄이 많으면 쪽 넘기기)
var CHAL_VIEWS = { days: '날짜 판', kinds: '어디에 썼나', spends: '식비 기록', meals: '집밥 기록', past: '지난 챌린지' };
function renderChal() {
  var st = App.state, ch = activeChal();
  var acts = '<div class="btn-pair">' + btn({ act: 'meal-eat', label: '🍚 잘 먹겠습니다', cls: 'big meal-btn' }) +
    btn({ act: 'spend-new', label: '+ 식비 쓰기', cls: 'big primary' }) + '</div>';
  var views = {}, done = st.challenges.filter(function (c) { return c.status !== 'active'; }).slice().reverse();
  if (!ch) {
    $('chal-card').innerHTML = emptyBox(ART.chal, '진행 중인 챌린지가 없어요', [
      { act: 'chal-open', label: '챌린지 고르기', cls: 'primary' },
      { act: 'sample', label: '예시 보기' }
    ]);
    $('chal-acts').innerHTML = acts + todayChecks(null);
    // 챌린지 없이 누른 집밥도 뺄 수 있게 날짜별 기록만 둔다
    var eats = {};
    st.meals.forEach(function (x) { eats[x.date] = (eats[x.date] || 0) + 1; });
    var mealDays = Object.keys(eats).sort().map(function (d) { return { date: d, meals: eats[d] }; });
    if (mealDays.length) views.meals = mealLogHtml(mealDays);
  } else {
    var info = chalInfo(ch), ms = mealStats(ch);
    $('chal-card').innerHTML = chalCard(ch);
    // 배달·외식 기록이 있고 집밥을 먹었으면 한 끼에 얼마 싼지와 아낀 돈. 없으면 이 줄은 숨긴다
    var sv = ms.saving;
    $('chal-acts').innerHTML = acts + (sv && ms.meals > 0 ? '<p class="saving-line" id="saving-line">' + (sv.perMeal > 0
      ? '집밥이 한 끼에 <b>' + won(sv.perMeal) + '</b> 싸요 · 아낀 돈 <b>' + won(sv.saved) + '</b><small>배달·외식 한 번 평균 ' + won(sv.outAvg) + '</small>'
      : '한 끼 평균이 배달·외식 한 번 평균(' + won(sv.outAvg) + ')보다 비싸요') + '</p>' : '') +
      todayChecks(ch);
    views.days = chalDaysHtml(ch);
    var spends = spendsIn(ch).slice().sort(function (a, b) { return b.date.localeCompare(a.date) || b.id.localeCompare(a.id); });
    var byKind = SPEND_KINDS.map(function (k) {
      return { k: k, sum: spends.filter(function (x) { return x.kind === k.key; }).reduce(function (a, x) { return a + x.amount; }, 0) };
    }).filter(function (x) { return x.sum > 0; }).sort(function (a, b) { return b.sum - a.sum; });
    var maxK = byKind.length ? byKind[0].sum : 1;
    if (byKind.length) views.kinds = { head: '<h3>어디에 썼나</h3>', n: byKind.length, row: function (i) {
      var x = byKind[i];
      return '<div class="kind-row"><span>' + x.k.icon + ' ' + esc(x.k.key) + '</span><b>' + won(x.sum) + '<small>' + pct(x.sum / Math.max(1, info.spent) * 100) + '</small></b>' +
        '<span class="meter"><i style="width:' + (x.sum / maxK * 100) + '%"></i></span></div>';
    } };
    views.spends = spends.length ? spendGroupsHtml(spends, ch)
      : { empty: emptyBox(ART.spend, '아직 넣은 식비가 없어요', [
          { act: 'spend-new', label: '+ 식비 쓰기', cls: 'primary' }
        ]) };
    var md = chalDays(ch);
    if (md.some(function (d) { return d.meals > 0; })) views.meals = mealLogHtml(md);
  }
  // 지난 챌린지
  if (done.length) {
    var wins = done.filter(function (c) { return c.status === 'won'; }).length;
    views.past = { head: '<div class="sec-head"><h3>지난 챌린지 ' + done.length + '개</h3><small>성공 ' + wins + '</small></div>', n: done.length, row: function (i) {
      var c = done[i], lv = c.status === 'won' ? 'good' : c.status === 'lost' ? 'mid' : 'none';
      var spent = c.spent != null ? c.spent : spentIn(c);
      return '<div class="hrow"><span class="badge lv-' + lv + '">' + STATUS_TEXT[c.status] + '</span>' +
        '<span class="h-name">' + esc(c.name) + '<small>' + Calc.shortDay(c.start) + ' ~ ' + Calc.shortDay(c.end) + '</small></span>' +
        '<span class="h-ch">' + won(spent) + '<small>목표 ' + won(c.budget) + '</small></span></div>';
    } };
  }
  // 맨 아래: 회색 '다른 챌린지 고르기'·'이 챌린지 그만두기' (한 장의 높이를 재기 전에 먼저 그린다)
  $('chal-foot').innerHTML = ch ? '<div class="foot-btns">' + btn({ act: 'chal-open', label: '다른 챌린지 고르기', cls: 'text-btn' }) + btn({ act: 'chal-quit', label: '이 챌린지 그만두기', cls: 'text-btn' }) + '</div>' : '';
  // 보기 탭과 그 한 장
  var keys = Object.keys(CHAL_VIEWS).filter(function (k) { return views[k]; });
  if (keys.indexOf(App.chalView) < 0) { App.chalView = keys[0] || null; App.chalStart = null; }
  $('chal-tabs').innerHTML = keys.length > 1 ? keys.map(function (k) {
    return '<button type="button" data-act="chal-view" data-view="' + k + '" aria-pressed="' + (k === App.chalView) + '">' + CHAL_VIEWS[k] + '</button>';
  }).join('') : '';
  var panel = $('chal-panel'), v = views[App.chalView];
  if (!v) panel.innerHTML = '';
  else if (v.empty) panel.innerHTML = '<div class="card pg-card">' + v.empty + '</div>';
  else {
    var pg = pagedCard(panel, { head: v.head, foot: v.foot, n: v.n, row: v.row, focus: v.focus, start: App.chalStart });
    App.chalStart = pg.start; App.chalEnd = pg.end; App.chalPrev = pg.prev;
  }
}

// ---------- 챌린지 끝 결과 창 (R-05) ----------
function renderResult(ch) {
  var spent = ch.spent != null ? ch.spent : spentIn(ch);
  var winRun = ch.status === 'won', diff = ch.budget - spent;
  var days = chalDays(ch);
  var good = days.filter(function (d) { return d.state === 'good'; }).length;
  var best = 0, run = 0;
  days.forEach(function (d) { run = d.state === 'good' ? run + 1 : 0; if (run > best) best = run; });
  var top = days.reduce(function (a, d) { return d.spent > (a ? a.spent : 0) ? d : a; }, null);
  var ms = mealStats(ch);
  var usedPct = ch.budget > 0 ? spent / ch.budget * 100 : 0;
  $('h-result').textContent = winRun ? '🎉 챌린지 성공!' : '챌린지 실패';
  function row(lv, icon, label, value, sub) {
    return '<li class="lv-' + lv + '"><span class="res-icon" aria-hidden="true">' + icon + '</span><span class="res-name">' + label +
      (sub ? '<small>' + sub + '</small>' : '') + '</span><b>' + value + '</b></li>';
  }
  $('result-body').innerHTML =
    '<div class="result-hero ' + (winRun ? 'won' : 'lost') + '">' +
      '<span class="result-badge" aria-hidden="true">' + (winRun ? '🏆' : '💪') + '</span>' +
      '<p><b>' + esc(ch.name) + '</b><small>' + Calc.shortDay(ch.start) + ' ~ ' + Calc.shortDay(ch.end) + ' · ' + days.length + '일</small></p>' +
    '</div>' +
    '<ul class="result-list">' +
      row(usedPct <= 100 ? 'good' : 'mid', '🧾', '쓴 돈 / 목표', won(spent) + ' / ' + won(ch.budget), pct(usedPct) + ' 썼어요') +
      row(diff >= 0 ? 'good' : 'mid', diff >= 0 ? '💰' : '⚠️', diff >= 0 ? '남긴 돈' : '넘은 돈', won(Math.abs(diff)), diff >= 0 ? '목표 안에서 끝냈어요' : '목표보다 더 썼어요') +
      row(good * 2 >= days.length ? 'good' : 'mid', '📅', '지킨 날', good + ' / ' + days.length + '일', '하루 ' + won(dayBase(ch)) + ' 이하 · 가장 긴 연속 ' + best + '일') +
      row('none', '📈', '가장 많이 쓴 날', top ? Calc.shortDay(top.date) + ' ' + won(top.spent) : '없어요', '') +
      row(ms.meals ? 'good' : 'none', '🍚', '집밥', ms.meals + '끼', ms.meals ? '한 끼 평균 ' + won(ms.avg) : '집밥 기록이 없어요') +
    '</ul>' +
    (App.resultOthers > 0 ? '<p class="hint">다른 챌린지 ' + App.resultOthers + '개도 끝났어요.</p>' : '');
}

// ---------- 식비 쓰기 시트 ----------
function renderSpendKinds(chosen) {
  $('spend-kinds').innerHTML = SPEND_KINDS.map(function (k) {
    var on = k.key === chosen;
    return '<button type="button" role="radio" aria-checked="' + on + '" class="kind' + (on ? ' on' : '') + '" data-act="spend-kind" data-kind="' + esc(k.key) + '">' +
      '<span aria-hidden="true">' + k.icon + '</span>' + esc(k.key) + '</button>';
  }).join('');
  var kind = SPEND_KINDS.filter(function (k) { return k.key === chosen; })[0];
  $('spend-quick').innerHTML = (kind ? kind.quick : []).map(function (v) { return btn({ act: 'spend-quick', label: won(v), cls: 'small', data: { v: v } }); }).join('');
}
// 최근 식비: 예시가 아닌 식비를 최근 것부터 종류+금액+메모가 겹치지 않게 4개까지
function recentSpends() {
  var list = App.state.spends.map(function (x, i) { return { x: x, i: i }; }).filter(function (o) { return !o.x.sample; });
  list.sort(function (a, b) { return a.x.date < b.x.date ? 1 : a.x.date > b.x.date ? -1 : b.i - a.i; });
  var seen = {}, out = [];
  for (var k = 0; k < list.length && out.length < 4; k++) {
    var x = list[k].x, key = x.kind + '|' + x.amount + '|' + (x.memo || '');
    if (seen[key]) continue;
    seen[key] = true;
    out.push(x);
  }
  return out;
}
function renderSpendRecent() {
  var box = $('spend-recent'), list = App.editSpendId ? [] : recentSpends();
  box.hidden = !list.length;
  box.innerHTML = list.length ? '<span class="sr-head">최근</span><div class="sr-row">' + list.map(function (x, i) {
    return '<button type="button" class="recent-chip" data-act="spend-repeat" data-i="' + i + '" aria-label="' + esc(x.kind + ' ' + won(x.amount) + (x.memo ? ' ' + x.memo : '') + ' 다시 넣기') + '">' +
      '<i aria-hidden="true">' + kindIcon(x.kind) + '</i><b>' + won(x.amount) + '</b></button>';
  }).join('') + '</div>' : '';
}
function renderSpendDisplay() {
  var v = Number($('spend-amount').value), d = $('spend-display');
  d.textContent = won(v >= 0 ? v : 0);
  d.classList.toggle('empty-amt', !(v >= 1));
}
function renderSpendPreview() {
  renderSpendDisplay();
  var box = $('spend-preview'), ch = activeChal();
  if (!ch) { box.innerHTML = ''; return; }
  var amt = Number($('spend-amount').value), day = $('spend-date').value;
  var cur = App.editSpendId ? spendById(App.editSpendId) : null;
  var before = chalInfo(ch);
  if (!(amt >= 1) || !Calc.isDay(day)) { box.innerHTML = '<p class="hint">남은 돈 ' + won(before.left) + '</p>'; return; }
  if (!Calc.inPeriod(day, ch.start, ch.end)) { box.innerHTML = '<p class="hint">챌린지 기간(' + Calc.shortDay(ch.start) + ' ~ ' + Calc.shortDay(ch.end) + ') 밖</p>'; return; }
  var delta = amt - (cur && Calc.inPeriod(cur.date, ch.start, ch.end) ? cur.amount : 0);
  box.innerHTML = chalDeltaHtml(ch, delta) + (MEAL_EQUIV_KINDS.indexOf(App.spendKind) >= 0 ? mealEquivHtml(amt) : '');
}
// 사 먹은 돈을 집밥 끼니로 (R-17). H-16 으로 메뉴 원가가 빠져, 이번 챌린지 한 끼 평균(장보기 합계 ÷ 집밥 횟수)으로 센다.
// 집밥 기록이 없거나 금액이 한 끼 평균보다 적으면 빈 글
var MEAL_EQUIV_KINDS = ['배달', '외식', '편의점', '카페·간식'];
function mealEquivHtml(amount) {
  var ch = activeChal(), avg = ch ? mealStats(ch).avg : null;
  if (!(avg > 0) || !(amount >= avg)) return '';
  var n = Math.floor(amount / avg);
  return '<p class="meal-equiv"><span class="me-ic" aria-hidden="true">🍚</span><span>이 돈이면 <b>집밥</b> <em class="me-n">' + n + '끼</em>' +
    '<small>한 끼 평균 ' + won(avg) + '</small></span></p>';
}
function chalDeltaHtml(ch, delta) {
  var b = chalInfo(ch), a = chalInfo(ch, delta || 0);
  return '<p class="chal-delta">남은 돈 ' + won(b.left) + ' → <b>' + won(a.left) + '</b> · 오늘 ' + won(b.perDay) + ' → <b>' + won(a.perDay) + '</b>' +
    (a.pace !== b.pace ? ' <span class="badge lv-' + a.pace + '">' + PACE_TEXT[a.pace] + '</span>' : '') + '</p>';
}

// ---------- 챌린지 고르기 시트 ----------
// 지난달 식비(v)보다 낮으면서 가장 가까운 한 달 프리셋 번호. 낮은 것이 없으면 가장 적은 한 달 프리셋
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
  $('chal-quiz-out').textContent = rec >= 0 ? '추천: \'' + CHALLENGE_PRESETS[rec].name + '\'' : '';
  // 12개를 3칸 판으로: 이름과 하루 금액만. 설명은 aria-label 에만 (H-18 한 화면, H-21 설명 글 없음)
  $('chal-presets').innerHTML = CHALLENGE_PRESETS.map(function (p, i) {
    var end = Calc.challengeEnd(today, p.months), days = Calc.periodDays(today, end), isRec = i === rec;
    return '<button type="button" class="pick preset' + (isRec ? ' recommend' : '') + '" data-act="chal-preset" data-i="' + i + '"' +
      ' aria-label="' + esc(p.name + (isRec ? ' 추천' : '') + ', ' + days + '일, 하루 ' + won(Math.floor(p.budget / days)) + ', ' + Calc.shortDay(end) + '까지. ' + p.note) + '"' +
      (isRec ? ' aria-describedby="chal-quiz-out"' : '') + '><b>' + esc(p.name) + (isRec ? ' <span class="badge rec">추천</span>' : '') + '</b><small>' +
      '하루 ' + won(Math.floor(p.budget / days)) + '</small></button>';
  }).join('');
  // 골라서 시작 / 직접 정하기 — 한 번에 하나만
  var own = App.chalMode === 'own';
  showChalMode(own);
  document.querySelectorAll('.chal-sheet-mode button').forEach(function (b) {
    b.setAttribute('aria-pressed', (b.dataset.mode === 'own') === own ? 'true' : 'false');
  });
  renderChalCalc();
}
function renderChalCalc() {
  var b = Number($('chal-budget').value), m = Number($('chal-months').value) || 1, s = $('chal-start').value;
  var out = $('chal-calc');
  if (!(b >= 1000) || !Calc.isDay(s)) { out.textContent = ''; return; }
  var end = Calc.challengeEnd(s, m), days = Calc.periodDays(s, end);
  out.textContent = Calc.shortDay(s) + ' ~ ' + Calc.shortDay(end) + ' · ' + days + '일 · 하루 ' + won(Math.floor(b / days));
}

// ---------- 설정 ----------
function renderMore() {
  var s = App.state.settings;
  var cur = { font: s.font, theme: s.theme, motion: document.body.classList.contains('reduce-motion') ? 'on' : 'off' };
  $('settings-form').querySelectorAll('[data-act="set-pick"]').forEach(function (b) {
    b.setAttribute('aria-pressed', cur[b.dataset.key] === b.dataset.v ? 'true' : 'false');
  });
}

// ---------- 화면별 그리기 ----------
var SCREEN_TITLE = { chal: '식비 챌린지', more: '설정' };
function renderScreen(name) {
  if (name === 'fridge') renderFridge();
  else if (name === 'chal') renderChal();
  else if (name === 'more') renderMore();
  $('top-title').textContent = SCREEN_TITLE[name] || '';
  App.flash = null;
}
