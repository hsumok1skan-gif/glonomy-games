// 한끼 계산기 — 상태와 동작 (화면 전환, 저장, 입력 검사, 버튼)

var App = {
  state: null,
  screen: 'fridge',
  fridgeOpen: false,  // 첫 화면 냉장고 문이 열렸나
  fridgeMode: 'shelf', // 열린 냉장고 안: 칸별 메모 / 유통기한 / 사진
  shelfId: null,      // 칸 시트에서 보는 칸
  editItemId: null,   // 칸 시트에서 고치는 음식
  photos: [],         // 냉장고 사진 (따로 저장)
  photoId: null,      // 내 냉장고 보기에서 크게 보는 사진
  ocrFor: 'photo',    // 글자 읽기 진행 표시를 띄울 곳: photo / shelf
  // 사진에서 읽은 것 (H-11): 칸 시트(shelf)·내 냉장고 보기(photo) 마다 { text, date, dateOk, manual, name }
  ocrPick: { shelf: null, photo: null },
  stack: [],          // 열린 시트·겹침 창 id (위가 끝)
  priceIng: null,     // 장 본 값 넣기에서 고른 재료
  editIngId: null,
  editSpendId: null,  // 식비 쓰기에서 고치는 기록
  spendKind: '장보기',
  draftMenu: null,    // 메뉴 시트에서 고치는 사본
  detailId: null,
  tplTab: 'ing',
  histMonth: null,
  undo: null,         // 되돌리기용 직전 상태(글)
  confirmFn: null,
  flash: null,
  chalFrom: null,     // 저장 직전 챌린지 남은 돈·오늘 쓸 돈 (숫자 굴리기)
  lastDay: null,
  toastTimer: 0
};

var SCREENS = ['fridge', 'home', 'chal', 'ing', 'menu', 'hist', 'more', 'help'];

function save() {
  var ok = Store.save(App.state);
  $('store-warn').hidden = ok;
  return ok;
}
function newId(prefix) { return prefix + (App.state.nextId++); }
function rememberUndo() { App.undo = Store.exportText(App.state, App.photos); }

// ---------- 전환: 모든 화면·시트·겹침 창이 이 함수를 거친다 ----------
function reduced() { return document.body.classList.contains('reduce-motion'); }
function toggleView(node, show, instant) {
  if (!node) return;
  clearTimeout(node._hideTimer);
  if (show) {
    node.hidden = false;
    if (reduced()) { node.classList.add('in'); return; }
    void node.offsetWidth; // 숨김을 푼 뒤 한 번 그려야 전환이 걸린다
    node.classList.add('in');
  } else {
    node.classList.remove('in');
    if (instant || reduced()) { node.hidden = true; return; }
    node._hideTimer = setTimeout(function () { node.hidden = true; }, 240);
  }
}

function setScreen(name) {
  if (SCREENS.indexOf(name) < 0) name = 'fridge';
  var prev = App.screen;
  App.screen = name;
  SCREENS.forEach(function (s) {
    var n = $('screen-' + s);
    if (s !== name && !n.hidden) toggleView(n, false, true);
  });
  renderScreen(name);
  toggleView($('screen-' + name), true);
  // H-11: 아래 탭 줄 없음. 첫 화면은 냉장고만 보이고(머리 띠도 숨김), 설정의 '모든 화면' 에 지금 화면을 표시한다
  document.body.classList.toggle('on-fridge', name === 'fridge');
  document.querySelectorAll('.nav-list button').forEach(function (b) {
    if (b.dataset.to === name) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  if (prev !== name) window.scrollTo(0, 0);
}

function openLayer(id) {
  var n = $(id);
  App.stack = App.stack.filter(function (x) { return x !== id; });
  App.stack.push(id);
  layerOrder();
  toggleView(n, true);
  try { n.focus({ preventScroll: true }); } catch (e) { n.focus(); }
}
function closeLayer(id) {
  id = id || App.stack[App.stack.length - 1];
  if (!id) return;
  App.stack = App.stack.filter(function (x) { return x !== id; });
  toggleView($(id), false);
  layerOrder();
  afterLayerClosed(id);
}
function closeAllLayers() {
  App.stack.slice().reverse().forEach(function (id) { closeLayer(id); });
}
function layerOrder() {
  App.stack.forEach(function (id, i) { $(id).style.zIndex = String(40 + i * 2 + 1); });
  var bd = $('backdrop');
  bd.style.zIndex = String(40 + Math.max(0, App.stack.length - 1) * 2);
  toggleView(bd, App.stack.length > 0);
  // 처음 안내가 맨 위면 뒤의 냉장고가 또렷이 보이게 뒷배경을 옅게 한다
  bd.classList.toggle('soft', App.stack[App.stack.length - 1] === 'ov-welcome');
  document.body.classList.toggle('locked', App.stack.length > 0);
}
function isOpen(id) { return App.stack.indexOf(id) >= 0; }
// 위에 있던 창을 닫으면 아래 창과 화면을 새로 그린다
function afterLayerClosed(id) {
  if (id === 'ov-confirm') App.confirmFn = null;
  if (id === 'sheet-menu') App.draftMenu = null;
  if (id === 'sheet-spend') App.editSpendId = null;
  if (id === 'sheet-shelf') { App.editItemId = null; App.flash = App.shelfId; }
  refreshOpen();
}
function refreshOpen() {
  if (isOpen('sheet-shelf')) renderShelf();
  if (isOpen('sheet-photo')) renderPhoto();
  renderScreen(App.screen);
  if (isOpen('sheet-tpl')) renderTpl();
  if (isOpen('sheet-detail')) renderDetail();
  if (isOpen('sheet-spend')) renderSpendPreview();
  if (isOpen('sheet-price') && !App.priceIng) renderPricePick();
  if (isOpen('ov-result') && chalById(App.resultId)) renderResult(chalById(App.resultId));
}

// ---------- 알림 ----------
function toast(msg, withUndo) {
  var t = $('toast');
  $('toast-text').textContent = msg;
  $('toast-undo').hidden = !withUndo;
  clearTimeout(App.toastTimer);
  t.hidden = false;
  t.classList.remove('pop');
  void t.offsetWidth;
  t.classList.add('pop');
  App.toastTimer = setTimeout(function () { t.classList.remove('pop'); t.hidden = true; }, withUndo ? 6000 : 3000);
}
function askConfirm(title, text, okLabel, fn) {
  $('h-confirm').textContent = title;
  $('confirm-text').textContent = text;
  $('confirm-ok').textContent = okLabel;
  App.confirmFn = fn;
  openLayer('ov-confirm');
}

// ---------- 입력 검사 ----------
function clearErrs(root) {
  root.querySelectorAll('.err').forEach(function (e) { e.textContent = ''; });
  root.querySelectorAll('.bad').forEach(function (e) { e.classList.remove('bad'); e.removeAttribute('aria-invalid'); });
}
function fieldErr(input, msg) {
  input.classList.remove('bad');
  void input.offsetWidth; // 다시 흔들리게
  input.classList.add('bad');
  input.setAttribute('aria-invalid', 'true');
  var f = input.closest('.field, .line');
  var e = f && f.querySelector('.err');
  if (e) e.textContent = msg;
}
function num(input) {
  var v = String(input.value).trim();
  return v === '' ? NaN : Number(v);
}
function checkNum(input, lo, hi, label, integer) {
  var v = num(input);
  if (isNaN(v)) { fieldErr(input, label + '을(를) 숫자로 넣는다.'); return null; }
  if (v < lo || v > hi) { fieldErr(input, label + '은(는) ' + lo.toLocaleString('ko-KR') + '~' + hi.toLocaleString('ko-KR') + ' 사이로 넣는다.'); return null; }
  if (integer && Math.round(v) !== v) { fieldErr(input, label + '은(는) 소수 없이 넣는다.'); return null; }
  return v;
}
function checkName(input, list, selfId, label) {
  var v = input.value.trim().replace(/\s+/g, ' ');
  if (!v) { fieldErr(input, label + '을(를) 넣는다.'); return null; }
  if (v.length > 30) { fieldErr(input, label + '은(는) 30자까지다.'); return null; }
  var dup = list.some(function (x) { return x.id !== selfId && x.name === v; });
  if (dup) { fieldErr(input, '같은 이름이 이미 있다.'); return null; }
  return v;
}
function unitOptions(sel, units, chosen) {
  sel.innerHTML = units.map(function (u) { return '<option' + (u === chosen ? ' selected' : '') + '>' + u + '</option>'; }).join('');
}

// ---------- 단가 기록 ----------
function pushHistory(ing, old) {
  App.state.history.push({
    id: newId('h'), date: Calc.today(), ingId: ing.id, name: ing.name,
    oldPrice: old && Calc.hasPrice(old) ? old.price : null, oldQty: old ? old.buyQty : null, oldUnit: old ? old.buyUnit : null,
    newPrice: ing.price, newQty: ing.buyQty, newUnit: ing.buyUnit
  });
  var h = App.state.history;
  if (h.length > 1500) h.splice(0, h.length - 1500);
}

// ---------- 7. 장 본 값 넣기 ----------
function openPrice(ingId) {
  App.priceIng = ingId && ingById(ingId) ? ingId : null;
  $('price-q').value = '';
  $('price-spend').checked = true;
  showPriceStep();
  openLayer('sheet-price');
}
function showPriceStep() {
  var ing = ingById(App.priceIng);
  var pick = $('price-pick'), form = $('price-form');
  // 고르기 ↔ 값 넣기: 나가는 쪽은 바로 숨기고 들어오는 쪽에 전환을 건다
  toggleView(ing ? pick : form, false, true);
  toggleView(ing ? form : pick, true);
  clearErrs($('price-form'));
  if (!ing) { renderPricePick(); return; }
  $('price-current').innerHTML = '<b>' + esc(ing.name) + '</b><br><small>지금 ' + (Calc.hasPrice(ing) ? buyText(ing) + ' · ' + unitPriceText(ing) + (ing.updated ? ' · ' + Calc.shortDay(ing.updated) + ' 값' : '') : '값 없음') + '</small>';
  $('price-won').value = '';
  $('price-won').placeholder = Calc.hasPrice(ing) ? String(ing.price) : '예: 3500';
  $('price-qty').value = ing.buyQty;
  unitOptions($('price-unit'), Calc.unitsFor(ing.buyUnit), ing.buyUnit);
  renderPricePreview();
}
function submitPrice() {
  var form = $('price-form');
  clearErrs(form);
  var ing = ingById(App.priceIng);
  if (!ing) return;
  var p = checkNum($('price-won'), 1, 100000000, '산 값', true);
  var q = checkNum($('price-qty'), 0.01, 100000, '산 양', false);
  var u = $('price-unit').value;
  if (p == null || q == null) return;
  if (Calc.dimOf(u) !== Calc.dimOf(ing.buyUnit)) { fieldErr($('price-unit'), '처음 단위와 같은 종류로 고른다.'); return; }
  var old = Object.assign({}, ing);
  var next = Object.assign({}, ing, { price: p, buyQty: q, buyUnit: u });
  var rows = impactOf(old, next);
  var day = Calc.today();
  var ch = activeChal();
  var toChal = !!ch && $('price-spend').checked && Calc.inPeriod(day, ch.start, ch.end);
  // 챌린지 변화는 식비를 더하기 전에 센다
  var html = (toChal ? chalDeltaHtml(ch, p) : '') + impactHtml(old, next, rows);
  markChalFrom();
  ing.price = p; ing.buyQty = q; ing.buyUnit = u; ing.updated = day;
  pushHistory(ing, old);
  if (toChal) addSpend({ date: day, amount: p, kind: '장보기', memo: ing.name });
  save();
  App.flash = ing.id;
  closeLayer('sheet-price');
  rollChalNums();
  App.priceIng = null;
  showImpact(html, rows.map(function (r) { return r.m.id; }));
  toast(ing.name + ' 값을 바꿨다' + (toChal ? ' · 장보기 ' + won(p) + ' 더함' : ''));
}
// 결과 창: 장 본 값 하나로 바뀐 챌린지와 집밥 메뉴
var lastImpact = { head: '', ids: [] };
function showImpact(html, ids) {
  lastImpact = { head: html, ids: ids };
  renderImpact();
  openLayer('ov-impact');
}
function renderImpact() {
  var rows = lastImpact.ids.map(menuById).filter(Boolean).map(function (m) { return { m: m, i: menuInfo(m) }; });
  var cheap = rows.filter(function (r) { return r.i.margin > 0; }).sort(function (a, b) { return b.i.margin - a.i.margin; })[0];
  $('impact-body').innerHTML = lastImpact.head +
    (cheap ? '<p class="hint">💡 지금 가장 많이 아끼는 메뉴는 <b>' + esc(cheap.m.name) + '</b> (한 끼 ' + won(cheap.i.margin) + ' 아낌)</p>' : '');
}

// ---------- 챌린지 숫자 굴리기 ----------
// 바꾸기 직전에 부른다. 그 뒤 그리는 chalCard 가 이 값을 data-from 에 넣는다.
function markChalFrom() {
  var ch = activeChal();
  if (!ch) { App.chalFrom = null; return; }
  var st = chalInfo(ch);
  App.chalFrom = { id: ch.id, left: st.left, perDay: st.perDay, usedPct: st.usedPct };
}
// 화면을 그린 다음 부른다: 남은 돈·오늘 쓸 돈이 바뀌기 전 값에서 굴러가고 막대가 차오른다
function rollChalNums() {
  App.chalFrom = null;
  document.querySelectorAll('#home-chal .chal-big b[data-from], #chal-now .chal-big b[data-from]').forEach(function (el) {
    var f = el.dataset.from, t = el.dataset.to;
    if (f === '' || t === '' || f === t) return;
    animateNumber(el, Number(f), Number(t), 600);
  });
  if (reduced()) return;
  document.querySelectorAll('#home-chal .chal-meter i[data-from], #chal-now .chal-meter i[data-from]').forEach(function (el) {
    if (el.dataset.from === el.dataset.to) return;
    el.style.width = el.dataset.from + '%';
    void el.offsetWidth; // 앞 값으로 한 번 그려야 막대 transition 이 걸린다
    el.style.width = el.dataset.to + '%';
  });
}

// ---------- 식비 쓰기 ----------
function addSpend(o) {
  var x = { id: newId('s'), date: o.date, amount: o.amount, kind: o.kind, memo: (o.memo || '').slice(0, 40), sample: !!o.sample };
  App.state.spends.push(x);
  if (App.state.spends.length > 5000) App.state.spends.splice(0, App.state.spends.length - 5000);
  return x;
}
function openSpend(id) {
  var x = id ? spendById(id) : null;
  App.editSpendId = x ? x.id : null;
  if (x) App.spendKind = x.kind;
  clearErrs($('spend-form'));
  $('h-spend').textContent = x ? '식비 고치기' : '식비 쓰기';
  $('spend-amount').value = x ? x.amount : '';
  $('spend-date').value = x ? x.date : Calc.today();
  $('spend-date').max = Calc.today();
  $('spend-memo').value = x ? x.memo : '';
  $('spend-del').hidden = !x;
  renderSpendKinds(App.spendKind);
  renderSpendPreview();
  openLayer('sheet-spend');
}
function submitSpend() {
  var form = $('spend-form');
  clearErrs(form);
  var amt = checkNum($('spend-amount'), 1, 10000000, '쓴 돈', true);
  var dateIn = $('spend-date'), day = dateIn.value, today = Calc.today();
  var dayOk = true;
  if (!Calc.isDay(day)) { fieldErr(dateIn, '날짜를 고른다.'); dayOk = false; }
  else if (day > today) { fieldErr(dateIn, '오늘보다 뒤 날짜는 넣을 수 없다.'); dayOk = false; }
  else if (Calc.daysBetween(day, today) > 3660) { fieldErr(dateIn, '10년보다 오래된 날짜는 넣을 수 없다.'); dayOk = false; }
  if (amt == null || !dayOk) return;
  var memo = $('spend-memo').value.trim().replace(/\s+/g, ' ').slice(0, 40);
  var x = App.editSpendId ? spendById(App.editSpendId) : null;
  markChalFrom();
  if (x) {
    x.amount = amt; x.date = day; x.kind = App.spendKind; x.memo = memo;
  } else {
    x = addSpend({ date: day, amount: amt, kind: App.spendKind, memo: memo });
  }
  App.flash = x.id;
  var mark = streakMark();
  save();
  closeLayer('sheet-spend');
  rollChalNums();
  var ch = activeChal();
  toast(App.spendKind + ' ' + won(amt) + ' 넣었다' + (ch && Calc.inPeriod(day, ch.start, ch.end) ? ' · 남은 돈 ' + won(chalInfo(ch).left) : '') +
    (mark ? ' · 🔥 ' + mark + '일 연속 지킴!' : ''));
}
// 연속 지킨 날이 3·7·14 가 되면 그 연속에 한 번만 알린다 (연속 첫날:n 을 챌린지에 적어 둔다)
function streakMark() {
  var ch = activeChal();
  if (!ch) return 0;
  var n = streakOf(ch);
  if (STREAK_MARKS.indexOf(n) < 0) return 0;
  var today = Calc.today(), last = today > ch.end ? ch.end : today;
  var key = Calc.addDays(last, -(n - 1)) + ':' + n;
  if (ch.streakSeen === key) return 0;
  ch.streakSeen = key;
  return n;
}
function deleteSpend() {
  var x = App.editSpendId ? spendById(App.editSpendId) : null;
  if (!x) return;
  askConfirm('식비를 지울까요?', Calc.shortDay(x.date) + ' ' + x.kind + ' ' + won(x.amount) + ' 을(를) 지운다.', '지우기', function () {
    rememberUndo();
    markChalFrom();
    App.state.spends = App.state.spends.filter(function (s) { return s.id !== x.id; });
    save();
    closeLayer('sheet-spend');
    rollChalNums();
    toast('식비를 지웠다', true);
  });
}

// ---------- 식비 챌린지 ----------
function budgetName(budget, months) {
  var m = { 1: '한 달', 2: '두 달', 3: '석 달', 4: '넉 달', 6: '여섯 달', 12: '일 년' }[months] || months + '달';
  return m + ' ' + (budget % 10000 === 0 ? (budget / 10000).toLocaleString('ko-KR') + '만원' : won(budget));
}
function openChalSheet() {
  clearErrs($('chal-form'));
  $('chal-name').value = '';
  $('chal-budget').value = '';
  $('chal-months').value = '1';
  $('chal-start').value = Calc.today();
  renderChalSheet();
  openLayer('sheet-chal');
}
function startChallenge(name, budget, months, start) {
  var go = function () {
    var cur = activeChal();
    if (cur) { cur.status = 'quit'; cur.spent = spentIn(cur); }
    var ch = { id: newId('c'), name: name, budget: budget, months: months, start: start, end: Calc.challengeEnd(start, months), status: 'active', spent: null, sample: false };
    App.state.challenges.push(ch);
    App.state.welcomed = true;
    save();
    closeAllLayers();
    setScreen('chal');
    var st = chalInfo(ch);
    toast(name + ' 시작! 오늘 쓸 수 있는 돈 ' + won(st.perDay), !!cur);
  };
  var cur = activeChal();
  if (cur) {
    askConfirm('챌린지를 바꿀까요?', '진행 중인 \'' + cur.name + '\'을(를) 그만두고 \'' + name + '\'을(를) 시작한다. 그만둔 챌린지는 지난 챌린지에 남는다.', '바꾸기', function () { rememberUndo(); go(); });
  } else go();
}
function submitChalForm() {
  var form = $('chal-form');
  clearErrs(form);
  var budget = checkNum($('chal-budget'), 1000, 100000000, '식비 목표', true);
  var months = Number($('chal-months').value) || 1;
  var startIn = $('chal-start'), start = startIn.value, today = Calc.today();
  var ok = budget != null;
  if (!Calc.isDay(start)) { fieldErr(startIn, '시작일을 고른다.'); ok = false; }
  else if (Calc.challengeEnd(start, months) < today) { fieldErr(startIn, '이미 끝난 기간이다. 시작일을 더 뒤로 잡는다.'); ok = false; }
  else if (Calc.daysBetween(today, start) > 60) { fieldErr(startIn, '시작일은 오늘부터 60일 안으로 잡는다.'); ok = false; }
  var nameIn = $('chal-name'), name = nameIn.value.trim().replace(/\s+/g, ' ');
  if (name.length > 30) { fieldErr(nameIn, '이름은 30자까지다.'); ok = false; }
  if (!ok) return;
  startChallenge(name || budgetName(budget, months), budget, months, start);
}
function quitChallenge() {
  var ch = activeChal();
  if (!ch) return;
  askConfirm('챌린지를 그만둘까요?', '\'' + ch.name + '\'을(를) 그만둔다. 넣은 식비는 그대로 남고, 지난 챌린지에 \'그만둠\'으로 남는다.', '그만두기', function () {
    rememberUndo();
    ch.status = 'quit';
    ch.spent = spentIn(ch);
    save();
    refreshOpen();
    toast(ch.name + ' 을(를) 그만뒀다', true);
  });
}
// 끝나는 날이 지난 챌린지는 쓴 돈으로 성공·실패를 정한다
function settleChallenges() {
  var today = Calc.today(), msgs = [], done = [];
  App.state.challenges.forEach(function (ch) {
    if (ch.status !== 'active' || Calc.daysBetween(ch.end, today) <= 0) return;
    ch.spent = spentIn(ch);
    ch.status = ch.spent <= ch.budget ? 'won' : 'lost';
    done.push(ch);
    msgs.push(ch.status === 'won' ? '🎉 ' + ch.name + ' 성공! ' + won(ch.budget - ch.spent) + ' 남겼다' : ch.name + ' 은(는) ' + won(ch.spent - ch.budget) + ' 넘었다. 다음 챌린지로 다시!');
  });
  if (msgs.length) {
    save();
    toast(msgs.join(' / '));
    // 알림 한 줄은 놓치기 쉬우니, 가장 늦게 끝난 챌린지를 결과 창으로 크게 보여 준다 (R-05)
    showResult(done.sort(function (a, b) { return a.end.localeCompare(b.end); })[done.length - 1], done.length - 1);
  }
  return msgs.length;
}
// 챌린지 끝 결과 창
function showResult(ch, others) {
  if (!ch) return;
  App.resultId = ch.id;
  App.resultOthers = others || 0;
  renderResult(ch);
  openLayer('ov-result');
}

// ---------- 집밥 한 끼 ----------
function eatMeal(id) {
  var m = menuById(id);
  if (!m) return;
  var info = menuInfo(m);
  rememberUndo(); // 잘못 눌렀거나 두 번 눌렀을 때 알림의 되돌리기로 뺀다
  markChalFrom();
  App.state.meals.push({ id: newId('e'), date: Calc.today(), menuId: m.id, name: m.name, cost: Math.round(info.cost), out: m.price, sample: false });
  if (App.state.meals.length > 3000) App.state.meals.splice(0, App.state.meals.length - 3000);
  save();
  App.flash = m.id;
  refreshOpen();
  rollChalNums();
  toast(m.name + ' 한 끼' + (info.margin > 0 ? ' · 사 먹을 때보다 ' + won(info.margin) + ' 아꼈다' : ' 기록했다'), true);
}
function mealById(id) {
  var list = App.state.meals;
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return null;
}
function deleteMeal(id) {
  var x = mealById(id);
  if (!x) return;
  askConfirm('먹은 기록을 지울까요?', Calc.shortDay(x.date) + ' ' + x.name + ' 한 끼를 지운다. 챌린지의 집밥 끼니·아낀 돈에서도 빠진다.', '지우기', function () {
    rememberUndo();
    App.state.meals = App.state.meals.filter(function (e) { return e.id !== x.id; });
    save();
    refreshOpen();
    toast('먹은 기록을 지웠다', true);
  });
}

// ---------- 내 냉장고: 문 열기·칸 메모·음식과 유통기한 (H-03) ----------
function toggleFridge(open) {
  App.fridgeOpen = open == null ? !App.fridgeOpen : !!open;
  if (App.screen !== 'fridge') { closeAllLayers(); setScreen('fridge'); }
  renderFridge();
  showFridgeIn(App.fridgeOpen);
}
// 문 안쪽(#fridge-in)도 전환 함수를 거친다. 이미 그 상태면 다시 걸지 않는다
function showFridgeIn(open) {
  var n = $('fridge-in');
  if (n && n.classList.contains('in') !== !!open) toggleView(n, !!open);
}
// 열린 냉장고 안(문 안쪽 메뉴): 칸별 메모 / 유통기한 가까운 음식 / 사진 (전환 함수를 거친다)
var FRIDGE_MODES = { shelf: 'fridge-shelves', exp: 'fridge-exp', photo: 'fridge-photo-in' };
function setFridgeMode(mode) {
  if (!FRIDGE_MODES[mode]) mode = 'shelf';
  if (mode === App.fridgeMode) return;
  var prev = App.fridgeMode;
  App.fridgeMode = mode;
  toggleView($(FRIDGE_MODES[prev]), false, true);
  renderFridge();
  toggleView($(FRIDGE_MODES[mode]), true);
}
function openShelf(id) {
  if (!shelfById(id)) return;
  App.shelfId = id;
  $('shelf-memo').value = App.state.fridge.memos[id] || '';
  clearErrs($('shelf-memo-form'));
  resetItemForm();
  hideOcrAsk();
  renderShelf();
  openLayer('sheet-shelf');
}
function resetItemForm() {
  App.editItemId = null;
  clearErrs($('item-form'));
  $('item-name').value = '';
  $('item-qty').value = '';
  $('item-exp').value = '';
  $('h-item').textContent = '음식 넣기';
  $('item-save').textContent = '이 칸에 넣기';
  $('item-cancel').hidden = true;
}
function submitShelfMemo() {
  var ta = $('shelf-memo');
  clearErrs($('shelf-memo-form'));
  var v = ta.value.trim().replace(/[ \t]+/g, ' ');
  if (v.length > 200) { fieldErr(ta, '메모는 200자까지다.'); return; }
  var memos = App.state.fridge.memos;
  if (v) memos[App.shelfId] = v; else delete memos[App.shelfId];
  save();
  ta.classList.remove('flash'); void ta.offsetWidth; ta.classList.add('flash');
  toast(shelfById(App.shelfId).name + (v ? ' 메모를 저장했다' : ' 메모를 비웠다'));
}
function editItem(id) {
  var x = fridgeItemById(id);
  if (!x) return;
  if (!isOpen('sheet-shelf') || App.shelfId !== x.shelf) openShelf(x.shelf);
  App.editItemId = x.id;
  clearErrs($('item-form'));
  $('item-name').value = x.name;
  $('item-qty').value = x.qty;
  $('item-exp').value = x.exp;
  $('h-item').textContent = x.name + ' 고치기';
  $('item-save').textContent = '고친 대로 저장';
  $('item-cancel').hidden = false;
  try { $('item-name').focus({ preventScroll: true }); } catch (e) { $('item-name').focus(); }
}
function submitItem() {
  var form = $('item-form');
  clearErrs(form);
  var nameIn = $('item-name'), name = nameIn.value.trim().replace(/\s+/g, ' ');
  var qty = $('item-qty').value.trim().replace(/\s+/g, ' ');
  var expIn = $('item-exp'), exp = expIn.value, today = Calc.today();
  var ok = true;
  if (!name) { fieldErr(nameIn, '음식 이름을 넣는다.'); ok = false; }
  else if (name.length > 30) { fieldErr(nameIn, '이름은 30자까지다.'); ok = false; }
  if (qty.length > 20) { fieldErr($('item-qty'), '양·메모는 20자까지다.'); ok = false; }
  if (exp) {
    if (!Calc.isDay(exp)) { fieldErr(expIn, '날짜 모양이 맞지 않다.'); ok = false; }
    else if (Calc.daysBetween(today, exp) > 3660) { fieldErr(expIn, '유통기한은 10년 안으로 넣는다.'); ok = false; }
    else if (Calc.daysBetween(exp, today) > 365) { fieldErr(expIn, '1년도 더 지난 날짜다. 날짜를 다시 본다.'); ok = false; }
  }
  if (!ok) return false;
  var list = App.state.fridge.items;
  var x = App.editItemId ? fridgeItemById(App.editItemId) : null;
  var memos = App.state.fridge.memos, memoBefore = memos[x ? x.shelf : App.shelfId] || '';
  if (x) {
    // 사진으로 넣은 메모 줄(⏰ 이름 ~날짜)이 있으면 같이 고친다 (H-13)
    var oldLine = memoLineFor(x.name, x.exp), hadLine = (memos[x.shelf] || '').split('\n').indexOf(oldLine) >= 0;
    x.name = name; x.qty = qty; x.exp = exp;
    if (hadLine) { memoRemoveLine(x.shelf, oldLine); if (exp) memoAddLine(x.shelf, memoLineFor(name, exp)); }
  } else {
    if (list.length >= 1000) { toast('냉장고 음식은 1000개까지다'); return false; }
    x = { id: newId('k'), shelf: App.shelfId, name: name, qty: qty, exp: exp, added: today, sample: false };
    list.push(x);
    // 사진에서 읽은 날짜를 손으로 고쳐 넣었을 때도 칸 메모에 남긴다 (H-13)
    if (App.ocrPick.shelf && exp) memoAddLine(x.shelf, memoLineFor(name, exp));
  }
  var edited = !!App.editItemId;
  save();
  App.flash = x.id;
  resetItemForm();
  hideOcrAsk(); // 사진에서 읽은 것을 넣었으면 묻는 카드도 닫는다
  refreshOpen();
  if ((memos[x.shelf] || '') !== memoBefore) syncShelfMemoBox(x.shelf);
  var e = expInfo(exp);
  toast(name + (edited ? ' 고쳤다' : ' 넣었다') + (e ? ' · ' + e.text : ''));
  try { $('item-name').focus({ preventScroll: true }); } catch (err) { $('item-name').focus(); }
  return true;
}
function deleteItem(id) {
  var x = fridgeItemById(id);
  if (!x) return;
  askConfirm('냉장고에서 꺼낼까요?', x.name + ' 을(를) ' + shelfById(x.shelf).name + '에서 지운다. 다 먹었거나 버렸을 때 누른다.', '꺼내기', function () {
    rememberUndo();
    App.state.fridge.items = App.state.fridge.items.filter(function (i) { return i.id !== x.id; });
    memoRemoveLine(x.shelf, memoLineFor(x.name, x.exp)); // 사진으로 넣은 메모 줄도 뺀다 (H-13)
    if (App.editItemId === x.id) resetItemForm();
    save();
    refreshOpen();
    syncShelfMemoBox(x.shelf);
    toast(x.name + ' 꺼냈다', true);
  });
}
function quickExp(days) {
  var n = Number(days);
  $('item-exp').value = n < 0 ? '' : Calc.addDays(Calc.today(), n);
  var i = $('item-exp');
  i.classList.remove('flash'); void i.offsetWidth; i.classList.add('flash');
}
// 빈 칸 시트의 시작 버튼: 이름 칸으로 바로 (days 가 있으면 유통기한도 채움)
function focusItemName(days) {
  if (!isOpen('sheet-shelf')) return;
  if (days !== undefined && days !== '') quickExp(days);
  var n = $('item-name');
  try { n.focus({ preventScroll: true }); } catch (e) { n.focus(); }
  try { n.scrollIntoView({ block: 'center' }); } catch (e) { /* 없어도 된다 */ }
}

// ---------- 내 냉장고 보기: 사진 찍기·보기 ----------
function openPhoto(id) {
  App.photoId = id || null;
  renderPhoto();
  openLayer('sheet-photo');
}
function takePhoto() {
  var inp = $('photo-input');
  inp.value = '';
  try { inp.click(); } catch (e) { toast('이 브라우저에서는 사진을 고를 수 없다'); }
}
// 고른 사진 파일을 긴 쪽 max px JPEG dataURL 로 줄인다 (기기 밖으로 보내지 않는다)
function readImageFile(f, max, quality, done) {
  if (!f) return;
  if (!/^image\//.test(f.type)) { toast('사진 파일만 넣을 수 있다'); return; }
  if (f.size > 30 * 1024 * 1024) { toast('사진이 너무 크다(30MB까지)'); return; }
  var reader = new FileReader();
  reader.onerror = function () { toast('사진을 읽지 못했다'); };
  reader.onload = function () {
    var img = new Image();
    img.onerror = function () { toast('사진을 열지 못했다'); };
    img.onload = function () {
      var w = img.naturalWidth, h = img.naturalHeight;
      var k = Math.min(1, max / Math.max(w, h));
      var c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * k));
      c.height = Math.max(1, Math.round(h * k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      var data;
      try { data = c.toDataURL('image/jpeg', quality); } catch (e) { toast('사진을 줄이지 못했다'); return; }
      done(data);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(f);
}
// 냉장고 사진은 긴 쪽 960px 로 줄여 저장한다
function onPhotoChosen() {
  var f = $('photo-input').files && $('photo-input').files[0];
  var label = $('photo-label').value || PHOTO_LABELS[0];
  readImageFile(f, 960, 0.7, function (data) { addPhoto(data, label); });
}
function addPhoto(data, label) {
  var before = App.photos.slice();
  var p = { id: newId('p'), date: Calc.today(), label: label, data: data };
  App.photos.push(p);
  var dropped = 0;
  while (App.photos.length > Store.MAX_PHOTOS) { App.photos.shift(); dropped++; }
  // 자리가 모자라면 오래된 사진부터 빼며 다시 저장한다
  while (!Store.savePhotos(App.photos)) {
    if (App.photos.length <= 1) { App.photos = before; Store.savePhotos(before); toast('저장할 자리가 모자라 사진을 넣지 못했다'); return; }
    App.photos.shift(); dropped++;
  }
  save();
  App.photoId = p.id;
  setFridgeMode('photo');
  if (!isOpen('sheet-photo')) openPhoto(p.id);
  refreshOpen();
  toast(label + ' 사진을 남겼다' + (dropped ? ' · 오래된 사진 ' + dropped + '장은 뺐다' : ''));
  readPhotoText(data);
}

// ---------- 사진 글자 읽기 (H-08, 코드\vendor\tesseract\ 만 쓴다) ----------
// 사진을 처음 남길 때 Ocr 가 vendor 스크립트를 붙여 불러오고, 그동안 진행 막대(%)를 띄운다
function readPhotoText(data) {
  $('ocr-out').hidden = true;
  if (!Ocr.available()) { $('ocr-file').hidden = false; return; }
  App.ocrFor = 'photo';
  ocrScan(data).then(function (r) {
    showOcrPick('photo', r);
  }, function () {
    toast('글자 읽기를 불러오지 못했다. 사진은 그대로 남았다');
  });
}

// ---------- 사진에서 유통기한 읽기 (H-09) ----------
// 앱의 사진 흐름과 시험 훅이 같은 길(Ocr.scan → findDate)을 쓴다
function ocrScan(data) {
  return Ocr.scan(data).then(function (r) {
    return { text: String(r.text || '').replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim(), date: r.date || null };
  });
}
window.__ocrTest = function (src) { return ocrScan(src); };

function ocrDateText(date) {
  var e = expInfo(date);
  return Calc.shortDay(date) + (e ? ' · ' + e.text : '');
}
// ---------- 사진 → 날짜 확인 → 음식 이름 고르기 → 냉장고 칸에 바로 넣기 (H-11) ----------
// 칸 시트(at='shelf')와 내 냉장고 보기(at='photo')가 같은 카드 모양·함수를 쓴다. 요소 id 는 앞머리만 다르다
function ocrEl(at, key) { return $((at === 'shelf' ? 'shelf-ocr-' : 'ocr-') + key); }

// 이름으로 쓰지 않는 표시 낱말 (날짜·용량·영양 표시 글)
var OCR_SKIP = /^(유통기한|소비기한|유통|소비|기한|까지|제조|제조일|제조일자|제조년월일|생산|생산일|원재료|원재료명|내용량|중량|용량|보관|보관방법|냉장|냉장보관|냉동|냉동보관|영양|영양정보|영양성분|열량|칼로리|나트륨|탄수화물|당류|지방|포화지방|트랜스지방|콜레스테롤|단백질|포장|포장재질|재질|업소명|제조원|판매원|소재지|품목|품목보고번호|반품|교환|가격|판매가|할인|바코드|exp|best|before|kcal|mg|ml|kg|g|l)$/i;
// 글자 인식은 한글을 '서 울 우 유' 처럼 한 글자씩 띄워 읽을 때가 많다. 이어진 한 글자들을 한 낱말로 붙인다 (H-14)
function ocrWords(line) {
  var words = [], run = '';
  line.split(/\s+/).forEach(function (w) {
    if (/^[가-힣]$/.test(w)) { run += w; return; }
    if (run) { words.push(run); run = ''; }
    if (w) words.push(w);
  });
  if (run) words.push(run);
  return words;
}
// 읽힌 글에서 음식 이름 후보를 고른다: 한 줄 통째(짧은 것)와 낱말, 날짜·숫자·단위·표시 낱말은 뺀다.
// 한글이 든 것을 앞에 두고 12개까지 (H-14)
function ocrNames(text) {
  var seen = {}, out = [];
  function add(s) {
    s = String(s).replace(/^[^0-9A-Za-z가-힣]+/, '').replace(/[^0-9A-Za-z가-힣)]+$/, '').replace(/\s+/g, ' ').trim();
    if (s.length < 2 || s.length > 20) return;
    if (!/[가-힣]/.test(s) && !/[A-Za-z]{3,}/.test(s)) return;   // 한글이 없으면 영어 세 글자 이상만
    if (/\d{2,4}\s*[.\-\/년]\s*\d{1,2}/.test(s)) return;           // 날짜 조각
    if (/^\d+([.,]\d+)?\s*(g|kg|ml|l|원|개|kcal|mg|%)$/i.test(s)) return;
    if (OCR_SKIP.test(s) || OCR_SKIP.test(s.replace(/[\s:]/g, ''))) return;
    var k = s.toLowerCase();
    if (seen[k]) return;
    seen[k] = true;
    out.push(s);
  }
  String(text || '').split(/\n/).forEach(function (line) {
    var words = ocrWords(line.trim());
    var l = words.join(' ');
    if (words.length > 1 && l.length <= 20) add(l);
    words.forEach(add);
  });
  var ko = out.filter(function (s) { return /[가-힣]/.test(s); });
  return ko.concat(out.filter(function (s) { return !/[가-힣]/.test(s); })).slice(0, 12);
}
function fillShelfSelect() {
  var sel = $('ocr-shelf');
  if (!sel.options.length) sel.innerHTML = FRIDGE_SHELVES.map(function (s) { return '<option value="' + s.id + '">' + s.icon + ' ' + esc(s.name) + '</option>'; }).join('');
}
// 읽은 결과로 카드를 연다. 날짜는 아직 '맞음' 전이다 (넣기 전에 늘 묻는다)
function showOcrPick(at, r) {
  App.ocrPick[at] = { text: r.text || '', date: Calc.isDay(r.date) ? r.date : null, dateOk: false, manual: false, name: '', own: false, savedId: null, memoLine: '', memoFull: false };
  // 칸 시트에서 음식을 고치는 중에 찍었으면, 날짜를 확인할 때 그 음식을 고친다
  var editing = at === 'shelf' && App.editItemId ? fridgeItemById(App.editItemId) : null;
  if (editing) { App.ocrPick[at].savedId = editing.id; App.ocrPick[at].memoLine = memoLineFor(editing.name, editing.exp); }
  if (at === 'photo') fillShelfSelect();
  renderOcrPick(at);
  var box = at === 'shelf' ? $('shelf-ocr-ask') : $('ocr-out');
  box.hidden = false;
  box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash');
  try { box.scrollIntoView({ block: 'nearest' }); } catch (e) { /* 없어도 된다 */ }
}
function renderOcrPick(at) {
  var o = App.ocrPick[at];
  if (!o) return;
  var where = at === 'shelf' ? esc(shelfById(App.shelfId) ? shelfById(App.shelfId).name : '이 칸') : '고른 칸';
  var day = o.date ? '<b>' + o.date.replace(/-/g, '.') + '</b>(' + ocrDateText(o.date) + ')' : '';
  var q;
  var saved = o.savedId ? fridgeItemById(o.savedId) : null;
  if (o.date && !o.dateOk && !o.manual) q = '⏰ 사진에서 찾은 유통기한 ' + day + '<br>이 날짜가 맞나요? 맞으면 ' + where + ' 메모에 바로 넣는다.';
  else if (o.dateOk && saved) q = '✓ <b>' + esc(saved.name) + '</b> · 유통기한 ' + day + '<br>' + esc(shelfById(saved.shelf).name) +
    (o.memoFull ? '에 넣었다(칸 메모가 200자라 메모 줄은 못 더했다).' : ' 메모에 넣었다.') + ' 이름이 다르면 아래 글자를 누르거나 직접 써서 바꾼다.';
  else if (o.dateOk) q = '✓ 유통기한 ' + day + ' 확인. ' + (o.name ? '' : '아래에서 음식 이름을 고르면 바로 ' + where + '에 넣는다.');
  else if (o.manual) q = '날짜는 ' + (at === 'shelf' ? '위 유통기한 칸에서 고치자. 이름을 고른 뒤 \'이 칸에 넣기\'를 누른다.' : '칸을 열어 고치자.');
  else q = '⏰ 유통기한 날짜를 찾지 못했다. ' + (at === 'shelf' ? '위 유통기한 칸에 직접 넣고, 이름을 고른 뒤 \'이 칸에 넣기\'를 누른다.' : '이름을 고르고 \'칸 열어 직접 넣기\'로 날짜를 넣자.');
  ocrEl(at, 'q').innerHTML = q;
  ocrEl(at, 'q').parentNode.classList.toggle('saved', !!(o.dateOk && saved)); // 넣었으면 상추색 막대 (H-13)
  ocrEl(at, 'btns').hidden = !(o.date && !o.dateOk && !o.manual);
  var names = ocrNames(o.text);
  // 직접 쓴 이름은 읽힌 글자 버튼 맨 앞에 고른 채로 둔다 (H-14)
  var typed = o.name && names.indexOf(o.name) < 0 ? o.name : '';
  ocrEl(at, 'names').innerHTML = (typed ? [typed] : []).concat(names).map(function (n) {
    var on = n === o.name;
    return '<button type="button" class="chip' + (on ? ' on' : '') + (n === typed ? ' typed' : '') + '" data-act="ocr-name" data-at="' + at + '" data-name="' + esc(n) + '" aria-pressed="' + on + '">' +
      (on ? '✓ ' : '') + (n === typed ? '✏️ ' : '') + esc(n) + '</button>';
  }).join('') + (names.length ? '' : '<p class="hint">이름으로 쓸 만한 글자를 찾지 못했다. 아래 \'직접 쓰기\'로 쓰자.</p>') +
    btn({ act: 'ocr-name-own', label: '✏️ 직접 쓰기', cls: 'chip own', data: { at: at } });
  ocrEl(at, 'own').hidden = !o.own;
  ocrEl(at, 'names').querySelector('.chip.own').setAttribute('aria-expanded', String(!!o.own));
  // 읽힌 글자 전체: 줄바꿈 그대로 다 펼치고, 제목 옆에 줄·글자 수를 작게 단다 (H-15)
  ocrEl(at, 'text').textContent = o.text || '읽힌 글자가 없다. 날짜·이름 부분이 크게 나오게 가까이 찍어 보자.';
  ocrEl(at, 'count').textContent = o.text ? ocrCountText(o.text) : '';
  ocrCopyDone(at, false);
  ocrEl(at, 'copy').disabled = !o.text;
}
function ocrCountText(text) {
  return text.split('\n').length + '줄 · ' + text.replace(/\s/g, '').length + '자';
}
// 전체 복사 버튼: 복사하면 1.6초 동안 '✓ 복사했다'(상추색)로 바뀐다
function ocrCopyDone(at, on) {
  var b = ocrEl(at, 'copy');
  clearTimeout(b._doneTimer);
  b.classList.toggle('done', on);
  b.textContent = on ? '✓ 복사했다' : '📋 전체 복사';
  if (on) b._doneTimer = setTimeout(function () { ocrCopyDone(at, false); }, 1600);
}
// '✓ 날짜 맞음': 확인한 날짜를 그 칸 메모와 음식 목록에 바로 넣는다 (H-13). 이름은 뒤에 골라도 따라 바뀐다
function ocrDateOk(at) {
  var o = App.ocrPick[at];
  if (!o || !o.date) return;
  o.dateOk = true;
  if (!ocrAutoSave(at)) renderOcrPick(at);
}
// '다른 날짜': 날짜는 손으로 고친다 (내 냉장고 보기에서는 칸 시트를 연다)
function ocrDateNo(at) {
  var o = App.ocrPick[at];
  if (!o) return;
  if (at === 'photo') { ocrToShelf(); return; }
  o.manual = true; o.dateOk = false;
  renderOcrPick(at);
  var i = $('item-exp');
  if (!i.value && o.date) i.value = o.date;
  try { i.focus({ preventScroll: true }); } catch (e) { i.focus(); }
}
// 읽힌 글자 버튼: 음식 이름으로 고른다. 날짜가 확인돼 있으면 바로 넣는다
function ocrName(at, name) {
  var o = App.ocrPick[at];
  if (!o || !name) return;
  o.name = String(name).slice(0, 30);
  o.own = false;
  if (o.dateOk && ocrAutoSave(at)) return; // 이미 넣었으면 그 음식·메모 줄 이름을 바꾼다
  if (at === 'shelf') {
    var n = $('item-name');
    n.value = o.name;
    n.classList.remove('flash'); void n.offsetWidth; n.classList.add('flash');
  }
  renderOcrPick(at);
  if (o.date && !o.dateOk && !o.manual) toast('이름을 골랐다. 날짜가 맞으면 \'✓ 날짜 맞음\'을 누르자');
}
// 맞는 이름이 없으면 카드 안 칸에 직접 쓴다 (H-14). 두 카드 모두 그 자리에서 쓰고, 이미 넣은 음식이면 이름이 따라 바뀐다
function ocrNameOwn(at) {
  var o = App.ocrPick[at];
  if (!o) return;
  o.own = !o.own;
  renderOcrPick(at);
  if (!o.own) return;
  var inp = ocrEl(at, 'own-in');
  clearErrs(ocrEl(at, 'own'));
  var saved = o.savedId ? fridgeItemById(o.savedId) : null;
  inp.value = o.name || (saved && saved.name !== OCR_NONAME ? saved.name : '') || (at === 'shelf' ? $('item-name').value.trim() : '');
  try { inp.focus({ preventScroll: true }); } catch (e) { inp.focus(); }
  inp.select();
}
function ocrOwnUse(at) {
  var o = App.ocrPick[at];
  if (!o) return;
  var inp = ocrEl(at, 'own-in'), v = inp.value.trim().replace(/\s+/g, ' ');
  clearErrs(ocrEl(at, 'own'));
  if (!v) { fieldErr(inp, '음식 이름을 쓴다.'); return; }
  if (v.length > 30) { fieldErr(inp, '이름은 30자까지다.'); return; }
  ocrName(at, v);
}

// ---------- 확인한 유통기한을 칸 메모에 자동으로 넣기 (H-13) ----------
var OCR_NONAME = '사진 속 음식';
// 칸 메모에 남기는 한 줄: '⏰ 두부 ~2026.11.03'
function memoLineFor(name, exp) { return '⏰ ' + name + ' ~' + String(exp).replace(/-/g, '.'); }
// 칸 메모에 줄을 더한다. 200자를 넘으면 더하지 않고 false
function memoAddLine(shelfId, line) {
  var memos = App.state.fridge.memos, cur = memos[shelfId] || '';
  if (cur.split('\n').indexOf(line) >= 0) return true;
  var next = cur ? cur + '\n' + line : line;
  if (next.length > 200) return false;
  memos[shelfId] = next;
  return true;
}
function memoRemoveLine(shelfId, line) {
  var memos = App.state.fridge.memos, cur = memos[shelfId];
  if (!cur || !line) return;
  var lines = cur.split('\n'), i = lines.indexOf(line);
  if (i < 0) return;
  lines.splice(i, 1);
  var next = lines.join('\n').trim();
  if (next) memos[shelfId] = next; else delete memos[shelfId];
}
// 칸 시트가 그 칸을 보고 있으면 메모 칸 글도 맞춘다
function syncShelfMemoBox(shelfId) {
  if (!isOpen('sheet-shelf') || App.shelfId !== shelfId) return;
  var ta = $('shelf-memo');
  ta.value = App.state.fridge.memos[shelfId] || '';
  ta.classList.remove('flash'); void ta.offsetWidth; ta.classList.add('flash');
}
// 날짜를 확인하면 부른다: 처음이면 넣고(되돌리기 가능), 이미 넣었으면 이름·칸만 맞춘다
function ocrAutoSave(at) {
  var o = App.ocrPick[at];
  if (!o || !o.dateOk || !Calc.isDay(o.date)) return false;
  var s = shelfById(at === 'shelf' ? App.shelfId : $('ocr-shelf').value);
  if (!s) return false;
  var typed = at === 'shelf' && !o.savedId ? $('item-name').value.trim().replace(/\s+/g, ' ').slice(0, 30) : '';
  var name = o.name || (o.savedId ? '' : typed || OCR_NONAME);
  var x = o.savedId ? fridgeItemById(o.savedId) : null;
  var first = !x;
  if (first) {
    var list = App.state.fridge.items;
    if (list.length >= 1000) { toast('냉장고 음식은 1000개까지다'); return false; }
    rememberUndo();
    var qty = at === 'shelf' ? $('item-qty').value.trim().replace(/\s+/g, ' ').slice(0, 20) : '';
    x = { id: newId('k'), shelf: s.id, name: name, qty: qty, exp: o.date, added: Calc.today(), sample: false };
    list.push(x);
    o.savedId = x.id;
  } else {
    memoRemoveLine(x.shelf, o.memoLine);
    if (name) x.name = name;
    x.shelf = s.id;
    x.exp = o.date;
  }
  o.memoLine = memoLineFor(x.name, x.exp);
  o.memoFull = !memoAddLine(x.shelf, o.memoLine);
  if (o.memoFull) o.memoLine = '';
  save();
  App.flash = x.id;
  if (at === 'shelf') resetItemForm();
  refreshOpen();
  syncShelfMemoBox(x.shelf);
  renderOcrPick(at);
  var where = s.name + (o.memoFull ? '' : ' 메모');
  toast(first ? x.name + ' · ' + ocrDateText(x.exp) + ' 을(를) ' + where + '에 넣었다' :
    x.name + ' · ' + ocrDateText(x.exp) + ' 로 ' + where + '을(를) 고쳤다', first);
  return true;
}
// 내 냉장고 보기에서 넣을 칸을 바꾸면, 이미 넣은 음식·메모 줄도 그 칸으로 옮긴다
function onOcrShelfChange() {
  var o = App.ocrPick.photo;
  if (o && o.dateOk && o.savedId) ocrAutoSave('photo');
}
// 칸 시트를 열어 고른 이름·확인한 날짜를 채우고, 같은 카드로 이어서 묻는다 (이미 넣었으면 그 음식 고치기로)
function ocrToShelf() {
  var o = App.ocrPick.photo, id = $('ocr-shelf').value;
  if (!o || !shelfById(id)) return;
  var saved = o.savedId ? fridgeItemById(o.savedId) : null;
  openShelf(saved ? saved.shelf : id);
  App.ocrPick.shelf = { text: o.text, date: o.date, dateOk: o.dateOk, manual: o.manual, name: o.name, own: false, savedId: saved ? saved.id : null, memoLine: o.memoLine || '', memoFull: !!o.memoFull };
  if (saved) {
    editItem(saved.id);
  } else {
    if (o.name) $('item-name').value = o.name;
    if (o.date && (o.dateOk || o.manual)) $('item-exp').value = o.date;
  }
  renderOcrPick('shelf');
  $('shelf-ocr-ask').hidden = false;
  var focus = o.name || saved ? $('item-exp') : $('item-name');
  try { focus.focus({ preventScroll: true }); } catch (e) { focus.focus(); }
}
function copyOcrText(at) {
  var o = App.ocrPick[at];
  if (!o || !o.text) { toast('복사할 글자가 없다'); return; }
  copyText(o.text, '읽힌 글자 ' + ocrCountText(o.text) + '를 모두 복사했다', null, function () { ocrCopyDone(at, true); });
}
// 칸 시트: 사진을 찍어 이 칸에 넣을 날짜·이름을 고른다
function takeShelfPhoto() {
  if (!Ocr.available()) { $('shelf-ocr-file').hidden = false; $('item-exp').focus(); return; }
  var inp = $('shelf-photo-input');
  inp.value = '';
  try { inp.click(); } catch (e) { toast('이 브라우저에서는 사진을 고를 수 없다'); }
}
function onShelfPhotoChosen() {
  var f = $('shelf-photo-input').files && $('shelf-photo-input').files[0];
  readImageFile(f, 1600, 0.9, function (data) {
    var shelf = App.shelfId;
    hideOcrAsk();
    App.ocrFor = 'shelf';
    ocrScan(data).then(function (r) {
      if (!isOpen('sheet-shelf') || App.shelfId !== shelf) return; // 그 사이 칸을 닫거나 바꿨으면 묻지 않는다
      showOcrPick('shelf', r);
    }, function () {
      toast('글자 읽기를 불러오지 못했다. 유통기한은 직접 넣자');
    });
  });
}
function hideOcrAsk() {
  App.ocrPick.shelf = null;
  $('shelf-ocr-ask').hidden = true;
  $('shelf-ocr-file').hidden = true;
}

// 진행 표시는 지금 읽는 쪽(내 냉장고 보기 / 칸 시트)에 띄운다
function showOcrProgress(label, pct, done) {
  var p = App.ocrFor === 'shelf' ? 'shelf-ocr-' : 'ocr-';
  var box = $(p + 'box');
  if (done) { $('ocr-box').hidden = true; $('shelf-ocr-box').hidden = true; return; }
  box.hidden = false;
  $(p + 'label').textContent = label;
  $(p + 'pct').textContent = pct + '%';
  $(p + 'fill').style.width = pct + '%';
  var bar = $(p + 'bar');
  bar.setAttribute('aria-valuenow', String(pct));
  bar.setAttribute('aria-valuetext', label + ' ' + pct + '%');
}
function deletePhoto(id) {
  var p = App.photos.filter(function (x) { return x.id === id; })[0];
  if (!p) return;
  askConfirm('사진을 지울까요?', Calc.shortDay(p.date) + ' ' + p.label + ' 사진을 지운다.', '지우기', function () {
    rememberUndo();
    App.photos = App.photos.filter(function (x) { return x.id !== id; });
    Store.savePhotos(App.photos);
    App.photoId = null;
    refreshOpen();
    toast('사진을 지웠다', true);
  });
}

// ---------- 8. 재료 넣기·고치기 ----------
function openIng(id, preset) {
  var g = id ? ingById(id) : null;
  App.editIngId = g ? g.id : null;
  var src = g || preset || { name: '', cat: CATS[0], buyQty: 1, buyUnit: 'kg', price: null, yieldPct: 100 };
  var form = $('ing-form');
  clearErrs(form);
  fillCatSelect($('ing-cat-in'), false);
  $('h-ing-sheet').textContent = g ? '재료 고치기' : '재료 넣기';
  $('ing-name').value = src.name;
  $('ing-cat-in').value = CATS.indexOf(src.cat) >= 0 || src.cat === '기타' ? src.cat : '기타';
  $('ing-price').value = src.price > 0 ? src.price : '';
  $('ing-qty').value = src.buyQty;
  unitOptions($('ing-unit'), Calc.UNIT_KEYS, src.buyUnit);
  $('ing-yield').value = src.yieldPct || 100;
  $('ing-del').hidden = !g;
  var used = g ? usedBy(g.id) : [];
  $('ing-used').textContent = used.length ? '쓰는 메뉴: ' + used.map(function (m) { return m.name; }).join(', ') : (g ? '아직 이 재료를 쓰는 메뉴가 없다.' : '');
  renderIngCalc();
  openLayer('sheet-ing');
}
function submitIng() {
  var form = $('ing-form');
  clearErrs(form);
  var st = App.state;
  var g = App.editIngId ? ingById(App.editIngId) : null;
  var name = checkName($('ing-name'), st.ingredients, g ? g.id : null, '이름');
  var price = checkNum($('ing-price'), 1, 100000000, '산 값', true);
  var qty = checkNum($('ing-qty'), 0.01, 100000, '산 양', false);
  var y = checkNum($('ing-yield'), 1, 100, '수율', true);
  var unit = $('ing-unit').value;
  if (name == null || price == null || qty == null || y == null) return;
  if (g && Calc.dimOf(unit) !== Calc.dimOf(g.buyUnit) && usedBy(g.id).length) {
    fieldErr($('ing-unit'), '메뉴에서 쓰는 단위와 종류가 다르다(무게·부피·개수). 같은 종류로 고른다.');
    return;
  }
  var cat = $('ing-cat-in').value;
  if (g) {
    var old = Object.assign({}, g);
    var priceChanged = old.price !== price || old.buyQty !== qty || old.buyUnit !== unit;
    g.name = name; g.cat = cat; g.price = price; g.buyQty = qty; g.buyUnit = unit; g.yieldPct = y;
    if (priceChanged) { g.updated = Calc.today(); pushHistory(g, old); }
    if (old.name !== name) st.history.forEach(function (h) { if (h.ingId === g.id) h.name = name; });
    App.flash = g.id;
    save();
    closeLayer('sheet-ing');
    toast(name + ' 저장했다');
  } else {
    var n = { id: newId('i'), name: name, cat: cat, buyQty: qty, buyUnit: unit, price: price, yieldPct: y, updated: Calc.today(), sample: false };
    st.ingredients.push(n);
    pushHistory(n, null);
    App.flash = n.id;
    save();
    closeLayer('sheet-ing');
    toast(name + ' 넣었다');
  }
}
function deleteIng() {
  var g = ingById(App.editIngId);
  if (!g) return;
  var used = usedBy(g.id);
  askConfirm('재료를 지울까요?', g.name + (used.length ? ' 은(는) 메뉴 ' + used.length + '개(' + used.map(function (m) { return m.name; }).join(', ') + ')에서 쓰인다. 지우면 그 줄도 빠진다.' : ' 을(를) 지운다.'), '지우기', function () {
    rememberUndo();
    App.state.ingredients = App.state.ingredients.filter(function (x) { return x.id !== g.id; });
    App.state.menus.forEach(function (m) { m.lines = m.lines.filter(function (l) { return l.ingId !== g.id; }); });
    save();
    closeLayer('sheet-ing');
    toast(g.name + ' 지웠다', true);
  });
}

// ---------- 9. 메뉴 넣기·고치기 ----------
function openMenu(id, preset) {
  var m = id ? menuById(id) : null;
  var src = m || preset || { name: '', price: 0, extra: 0, memo: '', lines: [] };
  App.draftMenu = { id: m ? m.id : null, name: src.name, price: src.price || 0, extra: src.extra || 0, memo: src.memo || '',
    lines: src.lines.map(function (l) { return { ingId: l.ingId, qty: l.qty, unit: l.unit }; }) };
  var form = $('menu-form');
  clearErrs(form);
  $('h-menu-sheet').textContent = m ? '메뉴 고치기' : '메뉴 만들기';
  $('menu-name').value = src.name;
  $('menu-price').value = src.price > 0 ? src.price : '';
  $('menu-extra').value = src.extra > 0 ? src.extra : '';
  $('menu-memo').value = src.memo || '';
  $('menu-del').hidden = !m;
  if (!App.draftMenu.lines.length && App.state.ingredients.length) App.draftMenu.lines.push({ ingId: '', qty: 0, unit: 'g' });
  renderMenuLines();
  renderMenuLive();
  openLayer('sheet-menu');
}
// 화면 입력을 사본에 옮긴다
function readMenuForm() {
  var d = App.draftMenu;
  if (!d) return;
  d.name = $('menu-name').value;
  d.price = Number($('menu-price').value) || 0;
  d.extra = Number($('menu-extra').value) || 0;
  d.memo = $('menu-memo').value;
  $('menu-lines').querySelectorAll('.line').forEach(function (row) {
    var i = +row.dataset.i, l = d.lines[i];
    if (!l) return;
    l.ingId = row.querySelector('.ln-ing').value;
    l.qty = Number(row.querySelector('.ln-qty').value) || 0;
    l.unit = row.querySelector('.ln-unit').value;
  });
}
function addLine() {
  readMenuForm();
  if (!App.draftMenu) return;
  if (App.draftMenu.lines.length >= 30) { toast('재료 줄은 30개까지다'); return; }
  App.draftMenu.lines.push({ ingId: '', qty: 0, unit: 'g' });
  renderMenuLines();
  renderMenuLive();
  var rows = $('menu-lines').querySelectorAll('.line');
  var last = rows[rows.length - 1];
  if (last) { last.classList.add('flash'); last.querySelector('.ln-ing').focus(); }
}
function removeLine(i) {
  readMenuForm();
  if (!App.draftMenu) return;
  App.draftMenu.lines.splice(i, 1);
  renderMenuLines();
  renderMenuLive();
}
function submitMenu() {
  readMenuForm();
  var d = App.draftMenu;
  if (!d) return;
  var form = $('menu-form');
  clearErrs(form);
  var st = App.state;
  var name = checkName($('menu-name'), st.menus, d.id, '메뉴 이름');
  var price = checkNum($('menu-price'), 1, 10000000, '사 먹으면 드는 값', true);
  var extraIn = $('menu-extra');
  var extra = extraIn.value.trim() === '' ? 0 : checkNum(extraIn, 0, 1000000, '그 밖의 비용', true);
  var ok = name != null && price != null && extra != null;
  var rows = $('menu-lines').querySelectorAll('.line');
  var lines = [];
  d.lines.forEach(function (l, i) {
    var row = rows[i];
    if (!l.ingId && !(l.qty > 0)) return; // 빈 줄은 뺀다
    if (!l.ingId) { ok = false; if (row) fieldErr(row.querySelector('.ln-ing'), '재료를 고른다.'); return; }
    var ing = ingById(l.ingId);
    if (!(l.qty > 0 && l.qty <= 100000)) { ok = false; if (row) fieldErr(row.querySelector('.ln-qty'), '양은 0보다 크고 100,000 이하로 넣는다.'); return; }
    if (ing && Calc.dimOf(l.unit) !== Calc.dimOf(ing.buyUnit)) { ok = false; if (row) fieldErr(row.querySelector('.ln-unit'), '산 단위와 같은 종류로 고른다.'); return; }
    lines.push({ ingId: l.ingId, qty: l.qty, unit: l.unit });
  });
  if (!lines.length && ok) {
    ok = false;
    $('menu-lines-err').textContent = '재료 줄을 하나 이상 넣는다.';
    var b = form.querySelector('[data-act="line-add"]');
    b.classList.remove('bad'); void b.offsetWidth; b.classList.add('bad');
  }
  if (!ok) return;
  var memo = d.memo.trim().slice(0, 80);
  if (d.id) {
    var m = menuById(d.id);
    m.name = name; m.price = price; m.extra = extra; m.lines = lines; m.memo = memo;
    App.flash = m.id;
  } else {
    var nm = { id: newId('m'), name: name, price: price, extra: extra, memo: memo, lines: lines, sample: false };
    st.menus.push(nm);
    App.flash = nm.id;
  }
  save();
  closeLayer('sheet-menu');
  toast(name + ' 저장했다');
}
function deleteMenu() {
  var d = App.draftMenu;
  var m = d && d.id ? menuById(d.id) : null;
  if (!m) return;
  askConfirm('메뉴를 지울까요?', m.name + ' 을(를) 지운다. 재료와 값 기록, 먹은 기록은 남는다.', '지우기', function () {
    rememberUndo();
    App.state.menus = App.state.menus.filter(function (x) { return x.id !== m.id; });
    save();
    closeLayer('sheet-menu');
    if (isOpen('sheet-detail') && App.detailId === m.id) closeLayer('sheet-detail');
    toast(m.name + ' 지웠다', true);
  });
}

// ---------- 10. 자세히 ----------
function openDetail(id) {
  if (!menuById(id)) return;
  App.detailId = id;
  renderDetail();
  openLayer('sheet-detail');
}

// ---------- 11. 목록에서 고르기 ----------
function openTpl(tab) {
  App.tplTab = tab === 'menu' ? 'menu' : 'ing';
  $('tpl-q').value = '';
  renderTpl();
  openLayer('sheet-tpl');
}
function tplByName(name) {
  for (var i = 0; i < ING_TEMPLATES.length; i++) if (ING_TEMPLATES[i].name === name) return ING_TEMPLATES[i];
  return null;
}
// 이름으로 재료를 찾고, 없으면 목록의 단위로 '값 없음' 재료를 만든다
function ensureIng(name, fallbackUnit, sample) {
  var have = App.state.ingredients.filter(function (g) { return g.name === name; })[0];
  if (have) return have;
  var t = tplByName(name);
  var g = { id: newId('i'), name: name, cat: t ? t.cat : '기타', buyQty: t ? t.buyQty : 1,
    buyUnit: t ? t.buyUnit : (fallbackUnit === 'g' ? 'kg' : fallbackUnit === 'ml' ? 'L' : fallbackUnit), price: null, yieldPct: 100, updated: null, sample: !!sample };
  App.state.ingredients.push(g);
  return g;
}
function useMenuTemplate(i) {
  var t = MENU_TEMPLATES[i];
  if (!t) return;
  var before = App.state.ingredients.length;
  var lines = t.lines.map(function (l) {
    var g = ensureIng(l[0], l[2], false);
    return { ingId: g.id, qty: l[1], unit: Calc.dimOf(l[2]) === Calc.dimOf(g.buyUnit) ? l[2] : Calc.lineUnitFor(g.buyUnit) };
  });
  var added = App.state.ingredients.length - before;
  save();
  var name = t.name;
  var n = 2;
  while (App.state.menus.some(function (m) { return m.name === name; })) name = t.name + ' ' + (n++);
  openMenu(null, { name: name, price: t.out || 0, extra: 0, memo: '', lines: lines });
  if (added) toast('새 재료 ' + added + '개를 \'값 없음\'으로 넣었다. 값은 장 본 값 넣기로');
}

// ---------- 12. 내보내기·가져오기 ----------
function openBackup() {
  $('export-text').value = Store.exportText(App.state, App.photos);
  $('restore-text').value = '';
  clearErrs($('sheet-backup'));
  openLayer('sheet-backup');
}
function copyExport() {
  copyText($('export-text').value, '복사했다. 안전한 곳에 붙여 두자', $('export-text'));
}
// 글을 클립보드로 복사한다. 막히면 글 상자(없으면 잠깐 만든 숨은 상자)를 골라 복사한다. 되면 onOk 를 부른다
function copyText(text, okMsg, ta, onOk) {
  var fallback = function () {
    var box = ta, temp = !box;
    if (temp) {
      box = document.createElement('textarea');
      box.value = text;
      box.setAttribute('readonly', '');
      box.className = 'sr';
      document.body.appendChild(box);
    }
    var ok = false;
    try { box.focus(); box.select(); ok = document.execCommand('copy'); } catch (e) { ok = false; }
    if (temp) document.body.removeChild(box);
    toast(ok ? okMsg : '글을 길게 눌러 직접 복사해 주세요');
    if (ok && onOk) onOk();
  };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg); if (onOk) onOk(); }, fallback);
    } else fallback();
  } catch (e) { fallback(); }
}
function restoreData() {
  var ta = $('restore-text');
  clearErrs($('sheet-backup'));
  var r = Store.parseImport(ta.value);
  if (!r.ok) { fieldErr(ta, r.msg); return; }
  var s = r.state;
  askConfirm('기록을 바꿀까요?', '재료 ' + s.ingredients.length + '개, 메뉴 ' + s.menus.length + '개, 값 기록 ' + s.history.length + '개, 챌린지 ' + s.challenges.length + '개, 식비 ' + s.spends.length + '건, 냉장고 음식 ' + s.fridge.items.length + '개, 사진 ' + r.photos.length + '장으로 지금 기록을 모두 바꾼다.', '바꾸기', function () {
    rememberUndo();
    s.welcomed = true;
    App.state = s;
    App.photos = r.photos;
    Store.savePhotos(App.photos);
    applySettings();
    save();
    closeLayer('sheet-backup');
    toast('가져왔다', true);
  });
}

// ---------- 예시 자취방 ----------
function loadSample() {
  var st = App.state, today = Calc.today();
  rememberUndo();
  var added = 0;
  Object.keys(SAMPLE_SHOP.prices).forEach(function (name) {
    if (st.ingredients.some(function (g) { return g.name === name; })) return;
    var t = tplByName(name);
    if (!t) return;
    var g = { id: newId('i'), name: name, cat: t.cat, buyQty: t.buyQty, buyUnit: t.buyUnit, price: SAMPLE_SHOP.prices[name],
      yieldPct: SAMPLE_SHOP.yields[name] || 100, updated: Calc.addDays(today, -40), sample: true };
    st.ingredients.push(g);
    st.history.push({ id: newId('h'), date: g.updated, ingId: g.id, name: name, oldPrice: null, oldQty: null, oldUnit: null, newPrice: g.price, newQty: g.buyQty, newUnit: g.buyUnit, sample: true });
    added++;
  });
  // 지난 값 바뀜: 예전 값 → 지금 값
  SAMPLE_SHOP.changes.forEach(function (c) {
    var g = st.ingredients.filter(function (x) { return x.name === c[0] && x.sample; })[0];
    if (!g) return;
    var first = st.history.filter(function (h) { return h.ingId === g.id; })[0];
    if (first) first.newPrice = c[1];
    var day = Calc.addDays(today, -c[2]);
    st.history.push({ id: newId('h'), date: day, ingId: g.id, name: g.name, oldPrice: c[1], oldQty: g.buyQty, oldUnit: g.buyUnit, newPrice: g.price, newQty: g.buyQty, newUnit: g.buyUnit, sample: true });
    g.updated = day;
  });
  st.history.sort(function (a, b) { return a.date.localeCompare(b.date); });
  SAMPLE_SHOP.menus.forEach(function (sm) {
    if (st.menus.some(function (m) { return m.name === sm[0]; })) return;
    var t = MENU_TEMPLATES.filter(function (x) { return x.name === sm[0]; })[0];
    if (!t) return;
    var lines = t.lines.map(function (l) { var g = ensureIng(l[0], l[2], true); return { ingId: g.id, qty: l[1], unit: l[2] }; });
    st.menus.push({ id: newId('m'), name: sm[0], price: sm[1], extra: 0, memo: '예시 메뉴', lines: lines, sample: true });
    added++;
  });
  // 예시 챌린지와 그동안 쓴 식비·먹은 집밥 (진행 중 챌린지가 없을 때만)
  if (!activeChal() && !st.spends.some(function (x) { return x.sample; })) {
    var sc = SAMPLE_SHOP.challenge, p = CHALLENGE_PRESETS[sc.preset];
    var start = Calc.addDays(today, -sc.startedDaysAgo);
    st.challenges.push({ id: newId('c'), name: p.name, budget: p.budget, months: p.months, start: start, end: Calc.challengeEnd(start, p.months), status: 'active', spent: null, sample: true });
    SAMPLE_SHOP.spends.forEach(function (s) { addSpend({ date: Calc.addDays(today, -s[0]), amount: s[1], kind: s[2], memo: s[3], sample: true }); });
    SAMPLE_SHOP.meals.forEach(function (e) {
      var m = st.menus.filter(function (x) { return x.name === e[1]; })[0];
      if (!m) return;
      st.meals.push({ id: newId('e'), date: Calc.addDays(today, -e[0]), menuId: m.id, name: m.name, cost: Math.round(menuInfo(m).cost), out: m.price, sample: true });
    });
    added++;
  }
  // 예시 냉장고: 칸 메모와 음식·유통기한 (예시 음식이 없을 때만, 직접 쓴 메모는 덮지 않는다)
  if (!st.fridge.items.some(function (x) { return x.sample; })) {
    var sf = SAMPLE_SHOP.fridge;
    Object.keys(sf.memos).forEach(function (k) { if (!st.fridge.memos[k]) st.fridge.memos[k] = sf.memos[k]; });
    sf.items.forEach(function (x) {
      st.fridge.items.push({ id: newId('k'), shelf: x[0], name: x[1], qty: x[2], exp: Calc.addDays(today, x[3]), added: Calc.addDays(today, -3), sample: true });
    });
    added++;
  }
  st.welcomed = true;
  save();
  closeAllLayers();
  App.fridgeOpen = true;
  setScreen('fridge');
  toast(added ? '예시 자취방을 넣었다. 값은 예시 숫자다' : '예시가 이미 들어 있다', added > 0);
}
function removeSample() {
  var st = App.state;
  var n = st.ingredients.filter(function (g) { return g.sample; }).length + st.menus.filter(function (m) { return m.sample; }).length +
    st.challenges.filter(function (c) { return c.sample; }).length + st.spends.filter(function (x) { return x.sample; }).length +
    st.fridge.items.filter(function (x) { return x.sample; }).length;
  if (!n) { toast('지울 예시가 없다'); return; }
  askConfirm('예시를 지울까요?', '예시로 넣은 재료·메뉴·챌린지·식비·냉장고 음식 ' + n + '개와 그 기록을 지운다. 직접 넣은 것은 남는다.', '지우기', function () {
    rememberUndo();
    var gone = {};
    st.ingredients.forEach(function (g) { if (g.sample) gone[g.id] = true; });
    st.ingredients = st.ingredients.filter(function (g) { return !g.sample; });
    st.menus = st.menus.filter(function (m) { return !m.sample; });
    st.menus.forEach(function (m) { m.lines = m.lines.filter(function (l) { return !gone[l.ingId]; }); });
    st.history = st.history.filter(function (h) { return !gone[h.ingId]; });
    st.challenges = st.challenges.filter(function (c) { return !c.sample; });
    st.spends = st.spends.filter(function (x) { return !x.sample; });
    st.meals = st.meals.filter(function (x) { return !x.sample; });
    st.fridge.items = st.fridge.items.filter(function (x) { return !x.sample; });
    // 예시 메모 그대로인 칸만 비운다
    Object.keys(SAMPLE_SHOP.fridge.memos).forEach(function (k) { if (st.fridge.memos[k] === SAMPLE_SHOP.fridge.memos[k]) delete st.fridge.memos[k]; });
    save();
    refreshOpen();
    toast('예시를 지웠다', true);
  });
}
function clearAll() {
  askConfirm('기록을 모두 지울까요?', '재료·메뉴·값 기록·챌린지·식비 기록·냉장고 칸 메모·음식·사진을 모두 지운다. 설정은 남는다. 지우기 전에 내보내기를 해 두면 되살릴 수 있다.', '모두 지우기', function () {
    rememberUndo();
    var keep = App.state.settings;
    App.state = Store.defaults();
    App.state.settings = keep;
    App.state.welcomed = true;
    App.photos = [];
    Store.savePhotos(App.photos);
    save();
    toast('모두 지웠다', true);
    setScreen('fridge');
  });
}
function doUndo() {
  if (!App.undo) return;
  var r = Store.parseImport(App.undo);
  App.undo = null;
  $('toast').hidden = true;
  if (!r.ok) return;
  App.state = r.state;
  App.photos = r.photos;
  Store.savePhotos(App.photos);
  applySettings();
  save();
  refreshOpen();
  // 사진으로 넣은 음식을 되돌렸으면 묻는 카드도 날짜 확인 전으로 (H-13)
  ['shelf', 'photo'].forEach(function (at) {
    var o = App.ocrPick[at];
    if (o && o.savedId && !fridgeItemById(o.savedId)) { o.savedId = null; o.memoLine = ''; o.dateOk = false; renderOcrPick(at); }
  });
  if (isOpen('sheet-shelf')) $('shelf-memo').value = App.state.fridge.memos[App.shelfId] || '';
  toast('되돌렸다');
}

// ---------- 설정 ----------
function applySettings() {
  var s = App.state.settings, b = document.body;
  b.classList.remove('font-s', 'font-m', 'font-l');
  b.classList.add('font-' + s.font);
  var reduce = s.motion;
  if (reduce == null) {
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { reduce = false; }
  }
  b.classList.toggle('reduce-motion', !!reduce);
  b.setAttribute('data-theme', s.theme);
}
function onSettingsChange(e) {
  var form = $('settings-form');
  clearErrs(form);
  var s = App.state.settings;
  var target = checkNum($('set-target'), 5, 90, '알뜰 기준', false);
  var warn = checkNum($('set-warn'), 6, 99, '비쌈 기준', false);
  var stale = checkNum($('set-stale'), 1, 365, '값 확인 주기', true);
  if (target != null && warn != null && warn <= target) { fieldErr($('set-warn'), '비쌈 기준은 알뜰 기준보다 커야 한다.'); warn = null; }
  if (target != null) s.target = target;
  if (warn != null) s.warn = warn;
  if (stale != null) s.staleDays = stale;
  s.font = $('set-font').value;
  s.theme = $('set-theme').value;
  if (e && e.target && e.target.id === 'set-motion') s.motion = $('set-motion').checked;
  applySettings();
  var ok = save();
  var msg = $('set-saved');
  msg.textContent = ok ? '✓ 저장했다' : '저장이 안 된다';
  msg.classList.remove('flash'); void msg.offsetWidth; msg.classList.add('flash');
}

// ---------- 버튼 ----------
var ACTIONS = {
  go: function (d) { closeAllLayers(); setScreen(d.to); },
  close: function () { closeLayer(); },
  'fridge-door': function () { toggleFridge(); },
  'fridge-mode': function (d) { if (!App.fridgeOpen) toggleFridge(true); setFridgeMode(d.mode); },
  'shelf-open': function (d) { openShelf(d.id); },
  'item-edit': function (d) { editItem(d.id); },
  'item-del': function (d) { deleteItem(d.id); },
  'item-exp': function (d) { quickExp(d.d); },
  'item-focus': function (d) { focusItemName(d.d); },
  'item-cancel': resetItemForm,
  'photo-open': function () { openPhoto(null); },
  'photo-take': takePhoto,
  'photo-pick': function (d) { App.photoId = d.id; renderPhoto(); },
  'photo-del': function (d) { deletePhoto(d.id); },
  'shelf-ocr': takeShelfPhoto,
  'ocr-date-use': function (d) { ocrDateOk(d.at); },
  'ocr-date-no': function (d) { ocrDateNo(d.at); },
  'ocr-name': function (d) { ocrName(d.at, d.name); },
  'ocr-name-own': function (d) { ocrNameOwn(d.at); },
  'ocr-own-use': function (d) { ocrOwnUse(d.at); },
  'ocr-copy': function (d) { copyOcrText(d.at); },
  'ocr-to-shelf': ocrToShelf,
  'price-open': function () { openPrice(null); },
  'price-for': function (d) { openPrice(d.id); },
  'price-pick': function (d) { App.priceIng = d.id; showPriceStep(); },
  'price-back': function () { App.priceIng = null; showPriceStep(); },
  'ing-new': function () { openIng(null, null); },
  'ing-edit': function (d) { openIng(d.id, null); },
  'ing-del': deleteIng,
  'ing-stale': function () { closeAllLayers(); $('ing-sort').value = 'old'; $('ing-q').value = ''; $('ing-cat').value = ''; setScreen('ing'); },
  'menu-new': function () { openMenu(null, null); },
  'menu-edit': function (d) { openMenu(d.id, null); },
  'menu-del': deleteMenu,
  'line-add': addLine,
  'line-del': function (d) { removeLine(+d.i); },
  detail: function (d) { openDetail(d.id); },
  'meal-eat': function (d) { eatMeal(d.id); },
  'meal-del': function (d) { deleteMeal(d.id); },
  'spend-new': function () { openSpend(null); },
  'spend-edit': function (d) { openSpend(d.id); },
  'spend-del': deleteSpend,
  'spend-kind': function (d) { App.spendKind = d.kind; renderSpendKinds(App.spendKind); renderSpendPreview(); },
  'spend-quick': function (d) {
    var a = $('spend-amount');
    a.value = d.v;
    a.classList.remove('flash'); void a.offsetWidth; a.classList.add('flash');
    renderSpendPreview();
  },
  // R-07: 숫자판 — 금액 칸(#spend-amount) 값을 고친 뒤 큰 금액·미리보기를 다시 그린다. 1,000만 원을 넘는 키는 받지 않고 흔든다
  'spend-key': function (d) {
    var a = $('spend-amount'), k = d.k;
    var s = String(a.value || '').replace(/\D/g, '');
    if (k === 'back') s = s.slice(0, -1);
    else if (k === 'clear') s = '';
    else if (k.charAt(0) === '+') s = String((Number(s) || 0) + Number(k.slice(1)));
    else s = (s + k).replace(/^0+/, '');
    if (Number(s) > 10000000) { fieldErr(a, '쓴 돈은 1~10,000,000 사이로 넣는다.'); return; }
    clearErrs(a.closest('.field'));
    a.value = s;
    renderSpendPreview();
  },
  'chal-open': function () { if (isOpen('ov-result')) closeLayer('ov-result'); openChalSheet(); },
  'chal-preset': function (d) {
    var p = CHALLENGE_PRESETS[+d.i];
    if (p) startChallenge(p.name, p.budget, p.months, Calc.today());
  },
  'chal-quit': quitChallenge,
  'tpl-open': function (d) { openTpl(d.tab); },
  'tpl-tab': function (d) {
    var tab = d.tab === 'menu' ? 'menu' : 'ing';
    if (tab === App.tplTab) return;
    App.tplTab = tab;
    var list = $('tpl-list');
    toggleView(list, false, true);
    renderTpl();
    toggleView(list, true);
  },
  'tpl-ing': function (d) { var t = tplByName(d.name); if (t) openIng(null, { name: t.name, cat: t.cat, buyQty: t.buyQty, buyUnit: t.buyUnit, price: null, yieldPct: 100 }); },
  'tpl-menu': function (d) { useMenuTemplate(+d.i); },
  backup: openBackup,
  copy: copyExport,
  'restore': restoreData,
  sample: loadSample,
  'sample-del': removeSample,
  'clear-all': clearAll,
  'clear-filter': function (d) {
    if (d.scope === 'ing') { $('ing-q').value = ''; $('ing-cat').value = ''; }
    if (d.scope === 'menu') $('menu-q').value = '';
    if (d.scope === 'price') { $('price-q').value = ''; renderPricePick(); }
    if (d.scope === 'tpl') { $('tpl-q').value = ''; $('tpl-cat').value = ''; renderTpl(); }
    renderScreen(App.screen);
  },
  'hist-prev': function () { App.histMonth = Calc.addMonths(App.histMonth || Calc.monthOf(Calc.today()), -1); renderHist(); },
  'hist-next': function () {
    var now = Calc.monthOf(Calc.today());
    var next = Calc.addMonths(App.histMonth || now, 1);
    if (next > now) { toast('다음 달 기록은 아직 없다'); return; }
    App.histMonth = next; renderHist();
  },
  'hist-today': function () { App.histMonth = Calc.monthOf(Calc.today()); renderHist(); },
  'impact-menus': function () { closeAllLayers(); $('menu-sort').value = 'rate'; setScreen('menu'); },
  'confirm-ok': function () { var fn = App.confirmFn; App.confirmFn = null; closeLayer('ov-confirm'); if (fn) fn(); },
  'confirm-cancel': function () { closeLayer('ov-confirm'); },
  'welcome-sample': function () { closeLayer('ov-welcome'); loadSample(); },
  'welcome-empty': function () { App.state.welcomed = true; save(); closeLayer('ov-welcome'); },
  'welcome-chal': function () { App.state.welcomed = true; save(); closeLayer('ov-welcome'); openChalSheet(); },
  'welcome-open': function () { openLayer('ov-welcome'); },
  undo: doUndo
};

function onClick(e) {
  var b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  // 뒷배경은 자기 자신을 눌렀을 때만 닫는다
  if (b.id === 'backdrop' && e.target !== b) return;
  var fn = ACTIONS[b.dataset.act];
  if (fn) fn(b.dataset, b, e);
}

function onKey(e) {
  if (e.key === 'Escape' && App.stack.length) { e.preventDefault(); closeLayer(); return; }
  // 설정 칸은 저장 버튼 없이 엔터로 바로 저장
  if (e.key === 'Enter' && e.target && e.target.tagName === 'INPUT' && e.target.closest('#settings-form')) {
    e.preventDefault();
    onSettingsChange(e);
    return;
  }
  // 사진 카드의 '직접 쓰기' 칸은 엔터로 그 이름을 고른다 (칸 시트에서는 음식 넣기 폼이 제출되지 않게)
  if (e.key === 'Enter' && e.target && (e.target.id === 'shelf-ocr-own-in' || e.target.id === 'ocr-own-in')) {
    e.preventDefault();
    ocrOwnUse(e.target.id === 'ocr-own-in' ? 'photo' : 'shelf');
    return;
  }
  if (e.key === 'Enter' && e.target && e.target.id === 'price-q') {
    e.preventDefault();
    var first = $('price-pick-list').querySelector('[data-act="price-pick"]');
    if (first) { App.priceIng = first.dataset.id; showPriceStep(); }
  }
}

// 자정을 넘기거나 다시 열었을 때 오늘 날짜로 새로 그린다
function checkDay() {
  var d = Calc.today();
  if (d !== App.lastDay) {
    App.lastDay = d;
    App.histMonth = Calc.monthOf(d);
    settleChallenges();
    refreshOpen();
  }
}

function bind() {
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  $('price-form').addEventListener('submit', function (e) { e.preventDefault(); submitPrice(); });
  $('price-form').addEventListener('input', renderPricePreview);
  $('price-form').addEventListener('change', renderPricePreview);
  $('price-q').addEventListener('input', renderPricePick);
  $('ing-form').addEventListener('submit', function (e) { e.preventDefault(); submitIng(); });
  $('ing-form').addEventListener('input', renderIngCalc);
  $('ing-form').addEventListener('change', renderIngCalc);
  $('menu-form').addEventListener('submit', function (e) { e.preventDefault(); submitMenu(); });
  $('menu-form').addEventListener('input', function () { readMenuForm(); renderMenuLive(); });
  $('menu-form').addEventListener('change', function (e) {
    readMenuForm();
    // 재료를 바꾸면 그 재료에 맞는 단위로
    if (e.target.classList.contains('ln-ing')) {
      var row = e.target.closest('.line');
      var l = App.draftMenu && App.draftMenu.lines[+row.dataset.i];
      var g = ingById(e.target.value);
      if (l && g && Calc.dimOf(l.unit) !== Calc.dimOf(g.buyUnit)) l.unit = Calc.lineUnitFor(g.buyUnit);
      renderMenuLines();
    }
    renderMenuLive();
  });
  $('spend-form').addEventListener('submit', function (e) { e.preventDefault(); submitSpend(); });
  $('spend-form').addEventListener('input', renderSpendPreview);
  $('spend-form').addEventListener('change', renderSpendPreview);
  $('chal-form').addEventListener('submit', function (e) { e.preventDefault(); submitChalForm(); });
  $('chal-form').addEventListener('input', renderChalCalc);
  $('chal-form').addEventListener('change', renderChalCalc);
  $('shelf-memo-form').addEventListener('submit', function (e) { e.preventDefault(); submitShelfMemo(); });
  $('item-form').addEventListener('submit', function (e) { e.preventDefault(); submitItem(); });
  $('photo-input').addEventListener('change', onPhotoChosen);
  $('shelf-photo-input').addEventListener('change', onShelfPhotoChosen);
  $('ocr-shelf').addEventListener('change', onOcrShelfChange);
  Ocr.onProgress(showOcrProgress);
  $('settings-form').addEventListener('change', onSettingsChange);
  $('settings-form').addEventListener('submit', function (e) { e.preventDefault(); onSettingsChange(e); });
  ['ing-q', 'ing-cat', 'ing-sort'].forEach(function (id) { $(id).addEventListener('input', renderIng); });
  ['menu-q', 'menu-sort'].forEach(function (id) { $(id).addEventListener('input', renderMenu); });
  $('hist-ing').addEventListener('change', renderHist);
  ['tpl-q', 'tpl-cat'].forEach(function (id) { $(id).addEventListener('input', renderTpl); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) checkDay(); });
  window.addEventListener('focus', checkDay);
  setInterval(checkDay, 60000);
}

function init() {
  App.state = Store.load();
  App.photos = Store.loadPhotos();
  App.lastDay = Calc.today();
  App.histMonth = Calc.monthOf(App.lastDay);
  applySettings();
  bind();
  $('store-warn').hidden = Store.isAvailable();
  $('ocr-file').hidden = Ocr.available(); // file:// 면 글자 읽기 대신 안내 (H-08)
  settleChallenges();
  setScreen('fridge'); // 처음 여는 화면은 양문형 냉장고 (H-03)
  // H-12: 첫 화면은 냉장고만. 처음 안내 시트(아래쪽 버튼 셋)를 저절로 띄우지 않는다.
  // 첫 실행 안내는 닫힌 문의 메모지·다음 할 일(#door-next)이 맡고, 시트는 설정 '모든 화면'의 '처음 안내'로 연다
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
