// 한끼 계산기 — 상태와 동작 (화면 전환, 저장, 입력 검사, 버튼)
// H-16: 기능은 냉장고·유통기한·식비 챌린지(칸 메모는 H-31 로 뺐다). 화면은 냉장고(첫 화면)·열린 냉장고·챌린지·설정 네 개다.

var App = {
  state: null,
  screen: 'fridge',
  fridgeOpen: false,  // 첫 화면 냉장고 문이 열렸나
  fridgeMode: 'shelf', // 열린 냉장고 안: 칸별 / 유통기한 / 사진
  coach: false,       // 손잡이 말풍선 (처음 3초만)
  shelfId: null,      // 칸 시트에서 보는 칸
  editItemId: null,   // 칸 시트에서 고치는 음식
  photos: [],         // 냉장고 사진 (따로 저장)
  photoId: null,      // 사진 탭에서 크게 보는 사진
  ocrFor: 'photo',    // 글자 읽기 진행 표시를 띄울 곳: photo / shelf
  snapFromExp: false, // 유통기한 목록 '📷 유통기한 찍기' 로 연 카메라인가 (H-42)
  snapBusy: false,    // 그 사진에서 날짜를 읽는 중인가 (찍기 버튼 진행 표시)
  ocrPick: { photo: null }, // 사진 탭에서 읽은 것 { text, date, dateOk, manual, name, ... } (음식 넣기 창은 날짜만 바로 채운다, H-36)
  stack: [],          // 열린 시트·겹침 창 id (위가 끝)
  chalSuggest: null,
  editSpendId: null,
  spendKind: '장보기',
  undo: null,         // 되돌리기용 직전 상태(글)
  chalView: null,     // 챌린지 화면 아래 보기 탭: days / kinds / spends / meals / past (H-18)
  chalStart: null,    // 그 탭에서 지금 쪽의 첫 줄 (null 이면 처음 여는 쪽)
  chalEnd: 0,         // 다음 쪽의 첫 줄
  chalPrev: 0,        // 앞 쪽의 첫 줄
  chalMode: 'pick',   // 챌린지 고르기 창: pick(골라서 시작) / own(직접 정하기)
  confirmFn: null,
  flash: null,
  chalFrom: null,     // 저장 직전 챌린지 남은 돈·오늘 쓸 돈 (숫자 굴리기)
  lastDay: null,
  shotMode: false,    // 주소 끝 #shot=이름 으로 연 완료 기준 화면인가 (H-55)
  toastTimer: 0
};

var SCREENS = ['fridge', 'chal', 'more'];

function save() {
  if (App.shotMode) return true; // H-55: 스크린샷 화면은 이 탭 안에서만 보이고 저장하지 않는다
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
  if (prev !== name) App.chalStart = null;
  // 챌린지 화면의 쪽 넘기기는 남은 높이를 재서 줄 수를 정하므로, 보이게 한 뒤 그린다 (H-18)
  document.body.classList.toggle('on-fridge', name === 'fridge'); // 첫 화면은 냉장고만 (머리 띠 숨김)
  $('screen-' + name).hidden = false;
  renderScreen(name);
  toggleView($('screen-' + name), true);
}
function openLayer(id) {
  var n = $(id);
  App.stack = App.stack.filter(function (x) { return x !== id; });
  App.stack.push(id);
  if (FRIDGE_WINS.indexOf(id) >= 0) fitFridgeWin(id);
  layerOrder();
  toggleView(n, true);
  try { n.focus({ preventScroll: true }); } catch (e) { n.focus(); }
}
// H-19: 냉장고 화면에서 여는 칸 창(메모·음식 목록·음식 넣기)은 화면 아래 끝이 아니라 냉장고 틀 안에 든다.
// 냉장고 자리를 재어 CSS 변수로 넘기면 style.css `.sheet.in-fridge` 가 좌우 --win-pad-x · 위아래 --win-pad-y 를 띄운다
// H-29: 칸 음식 목록 창(보기만)과 음식 넣기 창이 따로 있고, 둘 다 냉장고 틀 안에 든다
var FRIDGE_WINS = ['sheet-shelf', 'sheet-item'];
function fitFridgeWin(id) {
  var n = $(id), f = $('fridge');
  var r = App.screen === 'fridge' && f ? f.getBoundingClientRect() : null;
  var on = !!(r && r.width > 0 && r.height > 0);
  n.classList.toggle('in-fridge', on);
  if (!on) return;
  n.style.setProperty('--fr-top', r.top + 'px');
  n.style.setProperty('--fr-left', r.left + 'px');
  n.style.setProperty('--fr-w', r.width + 'px');
  n.style.setProperty('--fr-h', r.height + 'px');
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
  document.body.classList.toggle('locked', App.stack.length > 0);
}
function isOpen(id) { return App.stack.indexOf(id) >= 0; }
// 챌린지 화면 보기 탭·쪽을 바꿀 때도 같은 전환을 건다. 높이를 재야 하므로 숨기지 않고 흐리게만 한 뒤 다시 그린다 (H-18)
function turnChalPanel() {
  var p = $('chal-panel');
  p.classList.remove('in');
  renderChal();
  toggleView(p, true);
}
function afterLayerClosed(id) {
  if (id === 'ov-confirm') App.confirmFn = null;
  if (id === 'sheet-spend') App.editSpendId = null;
  if (id === 'sheet-item') { App.editItemId = null; hideOcrAsk(); }
  if (id === 'sheet-shelf') App.flash = App.shelfId;
  refreshOpen();
}
function refreshOpen() {
  if (isOpen('sheet-shelf') || isOpen('sheet-item')) renderShelf();
  renderScreen(App.screen);
  if (isOpen('sheet-spend')) renderSpendPreview();
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
  var f = input.closest('.field');
  var e = f && f.querySelector('.err');
  if (e) e.textContent = msg;
}
function num(input) {
  var v = String(input.value).trim();
  return v === '' ? NaN : Number(v);
}
function checkNum(input, lo, hi, label, integer) {
  var v = num(input);
  if (isNaN(v)) { fieldErr(input, label + '을(를) 숫자로 넣어 주세요.'); return null; }
  if (v < lo || v > hi) { fieldErr(input, label + '은(는) ' + lo.toLocaleString('ko-KR') + '~' + hi.toLocaleString('ko-KR') + ' 사이로 넣어 주세요.'); return null; }
  if (integer && Math.round(v) !== v) { fieldErr(input, label + '은(는) 소수 없이 넣어 주세요.'); return null; }
  return v;
}
function flashEl(n) { n.classList.remove('flash'); void n.offsetWidth; n.classList.add('flash'); }
function focusEl(n) { try { n.focus({ preventScroll: true }); } catch (e) { n.focus(); } }

// ---------- 챌린지 숫자 굴리기 ----------
function markChalFrom() {
  var ch = activeChal();
  if (!ch) { App.chalFrom = null; return; }
  var st = chalInfo(ch);
  App.chalFrom = { id: ch.id, left: st.left, perDay: st.perDay, usedPct: st.usedPct };
}
function rollChalNums() {
  App.chalFrom = null;
  document.querySelectorAll('#chal-card .chal-big b[data-from]').forEach(function (el) {
    var f = el.dataset.from, t = el.dataset.to;
    if (f === '' || t === '' || f === t) return;
    animateNumber(el, Number(f), Number(t), 600);
  });
  if (reduced()) return;
  document.querySelectorAll('#chal-card .chal-meter i[data-from]').forEach(function (el) {
    if (el.dataset.from === el.dataset.to) return;
    el.style.width = el.dataset.from + '%';
    void el.offsetWidth;
    el.style.width = el.dataset.to + '%';
  });
}

// ---------- 식비 쓰기 (실제로 돈이 나간 것만. 장 본 돈은 '장보기') ----------
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
  renderSpendRecent();
  renderSpendPreview();
  openLayer('sheet-spend');
}
function submitSpend() {
  var form = $('spend-form');
  clearErrs(form);
  var amt = checkNum($('spend-amount'), 1, 10000000, '쓴 돈', true);
  var dateIn = $('spend-date'), day = dateIn.value, today = Calc.today();
  var dayOk = true;
  if (!Calc.isDay(day)) { fieldErr(dateIn, '날짜를 골라 주세요.'); dayOk = false; }
  else if (day > today) { fieldErr(dateIn, '오늘보다 뒤 날짜는 넣을 수 없어요.'); dayOk = false; }
  else if (Calc.daysBetween(day, today) > 3660) { fieldErr(dateIn, '10년보다 오래된 날짜는 넣을 수 없어요.'); dayOk = false; }
  if (amt == null) flashEl($('spend-display'));
  if (amt == null || !dayOk) return;
  var memo = $('spend-memo').value.trim().replace(/\s+/g, ' ').slice(0, 40);
  var x = App.editSpendId ? spendById(App.editSpendId) : null;
  markChalFrom();
  if (x) { x.amount = amt; x.date = day; x.kind = App.spendKind; x.memo = memo; }
  else x = addSpend({ date: day, amount: amt, kind: App.spendKind, memo: memo });
  App.flash = x.id;
  var mark = streakMark();
  save();
  closeLayer('sheet-spend');
  rollChalNums();
  var ch = activeChal();
  toast(App.spendKind + ' ' + won(amt) + ' 넣었어요' + (ch && Calc.inPeriod(day, ch.start, ch.end) ? ' · 남은 돈 ' + won(chalInfo(ch).left) : '') +
    (mark ? ' · 🔥 ' + mark + '일 연속 지켰어요!' : ''));
}
// 연속 지킨 날이 3·7·14 가 되면 그 연속에 한 번만 알린다
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
  askConfirm('식비를 지울까요?', Calc.shortDay(x.date) + ' ' + x.kind + ' ' + won(x.amount) + '을(를) 지워요.', '지우기', function () {
    rememberUndo();
    markChalFrom();
    App.state.spends = App.state.spends.filter(function (s) { return s.id !== x.id; });
    save();
    closeLayer('sheet-spend');
    rollChalNums();
    toast('식비를 지웠어요', true);
  });
}

// ---------- 🍚 잘 먹겠습니다 (H-16): 집밥 횟수만 하나 늘고 돈은 바뀌지 않는다 ----------
function eatMeal() {
  rememberUndo(); // 잘못 눌렀으면 알림의 되돌리기로 뺀다
  var x = { id: newId('e'), date: Calc.today(), sample: false };
  App.state.meals.push(x);
  if (App.state.meals.length > 3000) App.state.meals.splice(0, App.state.meals.length - 3000);
  save();
  refreshOpen();
  var ch = activeChal(), n = ch ? mealsIn(ch).length : App.state.meals.length;
  var hm = $('hero-meal');
  if (hm) flashEl(hm);
  toast('맛있게 드세요! ' + (ch ? '이번 챌린지 ' : '') + n + '번째 집밥', true);
}
// 날짜 판 아래 집밥 기록의 '빼기': 그날 집밥 하나를 묻고 뺀다. 돈은 바뀌지 않는다 (A-06)
function deleteMeal(d) {
  var day = d && d.date;
  if (!Calc.isDay(day)) return;
  var same = App.state.meals.filter(function (x) { return x.date === day; });
  if (!same.length) return;
  askConfirm('집밥 하나를 뺄까요?', Calc.shortDay(day) + ' 집밥 ' + same.length + '번 가운데 하나를 빼요. 남은 돈은 그대로예요.', '빼기', function () {
    rememberUndo();
    var gone = same[same.length - 1].id; // 그날 마지막에 누른 것부터 뺀다
    App.state.meals = App.state.meals.filter(function (x) { return x.id !== gone; });
    App.chalView = 'meals';
    App.flash = same.length > 1 ? 'meal-' + day : null;
    save();
    refreshOpen();
    var hm = $('hero-meal');
    if (hm) flashEl(hm);
    toast(Calc.shortDay(day) + ' 집밥 하나를 뺐어요', true);
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
  App.chalSuggest = null;
  App.chalMode = 'pick';
  renderChalSheet();
  openLayer('sheet-chal');
}
function startChallenge(name, budget, months, start) {
  var go = function () {
    var cur = activeChal();
    if (cur) { cur.status = 'quit'; cur.spent = spentIn(cur); }
    var ch = { id: newId('c'), name: name, budget: budget, months: months, start: start, end: Calc.challengeEnd(start, months), status: 'active', spent: null, sample: false };
    App.state.challenges.push(ch);
    save();
    // H-20: 창끼리 잇지 않는다. 챌린지 창만 닫고, 다른 화면·창(식비 쓰기 등)으로 넘어가지 않는다
    closeLayer('sheet-chal');
    var st = chalInfo(ch);
    toast(name + ' 시작! 오늘 쓸 수 있는 돈 ' + won(st.perDay), !!cur);
  };
  var cur = activeChal();
  if (cur) askConfirm('챌린지를 바꿀까요?', '진행 중인 \'' + cur.name + '\'을(를) 그만두고 \'' + name + '\'을(를) 시작해요. 그만둔 챌린지는 지난 챌린지에 남아요.', '바꾸기', function () { rememberUndo(); go(); });
  else go();
}
function submitChalForm() {
  var form = $('chal-form');
  clearErrs(form);
  var budget = checkNum($('chal-budget'), 1000, 100000000, '식비 목표', true);
  var months = Number($('chal-months').value) || 1;
  var startIn = $('chal-start'), start = startIn.value, today = Calc.today();
  var ok = budget != null;
  if (!Calc.isDay(start)) { fieldErr(startIn, '시작일을 골라 주세요.'); ok = false; }
  else if (Calc.challengeEnd(start, months) < today) { fieldErr(startIn, '이미 끝난 기간이에요. 시작일을 더 뒤로 잡아 주세요.'); ok = false; }
  else if (Calc.daysBetween(today, start) > 60) { fieldErr(startIn, '시작일은 오늘부터 60일 안으로 잡아 주세요.'); ok = false; }
  var nameIn = $('chal-name'), name = nameIn.value.trim().replace(/\s+/g, ' ');
  if (name.length > 30) { fieldErr(nameIn, '이름은 30자까지예요.'); ok = false; }
  if (!ok) return;
  startChallenge(name || budgetName(budget, months), budget, months, start);
}
function quitChallenge() {
  var ch = activeChal();
  if (!ch) return;
  askConfirm('챌린지를 그만둘까요?', '\'' + ch.name + '\'을(를) 그만둬요. 넣은 식비는 그대로 남고, 지난 챌린지에 \'그만둠\'으로 남아요.', '그만두기', function () {
    rememberUndo();
    ch.status = 'quit';
    ch.spent = spentIn(ch);
    save();
    refreshOpen();
    toast(ch.name + '을(를) 그만뒀어요', true);
  });
}
// 끝나는 날이 지난 챌린지는 쓴 돈으로 성공·실패를 정한다
function settleChallenges() {
  var today = Calc.today(), done = [];
  App.state.challenges.forEach(function (ch) {
    if (ch.status !== 'active' || Calc.daysBetween(ch.end, today) <= 0) return;
    ch.spent = spentIn(ch);
    ch.status = ch.spent <= ch.budget ? 'won' : 'lost';
    done.push(ch);
  });
  if (done.length) {
    save();
    done.sort(function (a, b) { return a.end.localeCompare(b.end); });
    showResult(done[done.length - 1], done.length - 1);
  }
  return done.length;
}
function showResult(ch, others) {
  if (!ch) return;
  App.resultId = ch.id;
  App.resultOthers = others || 0;
  renderResult(ch);
  openLayer('ov-result');
}

// ---------- 냉장고: 문 열기·음식과 유통기한 ----------
function toggleFridge(open) {
  App.fridgeOpen = open == null ? !App.fridgeOpen : !!open;
  if (App.fridgeOpen) {
    App.coach = false;
    if (!App.state.fridgeOpened) { App.state.fridgeOpened = true; save(); }
  }
  if (App.screen !== 'fridge') { closeAllLayers(); setScreen('fridge'); }
  renderFridge();
}
// 문 안쪽(#fridge-in)도 전환 함수를 거친다. 이미 그 상태면 다시 걸지 않는다
function showFridgeIn(open) {
  var n = $('fridge-in');
  if (n && n.classList.contains('in') !== !!open) toggleView(n, !!open);
}
// 챌린지 고르기 창의 '골라서 시작 / 직접 정하기' 탭도 전환 함수를 거친다. 나가는 쪽은 바로 숨기고 들어오는 쪽은 밀며 나타난다
function showChalMode(own) {
  var out = $(own ? 'chal-pick' : 'chal-form'), inn = $(own ? 'chal-form' : 'chal-pick');
  if (!out.hidden || out.classList.contains('in')) toggleView(out, false, true);
  if (inn.hidden || !inn.classList.contains('in')) toggleView(inn, true);
}
var FRIDGE_MODES = { shelf: 'fridge-shelves', exp: 'fridge-exp', photo: 'fridge-photo-in' };
function setFridgeMode(mode) {
  if (!FRIDGE_MODES[mode]) mode = 'shelf';
  if (!App.fridgeOpen) toggleFridge(true);
  if (mode === App.fridgeMode) return;
  var prev = App.fridgeMode;
  App.fridgeMode = mode;
  toggleView($(FRIDGE_MODES[prev]), false, true);
  renderFridge();
  toggleView($(FRIDGE_MODES[mode]), true);
}
// H-29: 칸을 누르면 그 칸의 음식 목록 창만 뜬다. 보기만 하고(입력 칸 없음) 목록은 위아래로 넘긴다
function openShelf(id) {
  if (!shelfById(id)) return;
  if (isOpen('sheet-item') && App.shelfId !== id) closeLayer('sheet-item');
  App.shelfId = id;
  renderShelf();
  openLayer('sheet-shelf');
  $('shelf-items').scrollTop = 0;
}
// 음식 넣기 창: 사람이 '음식 넣기' 를 눌러야 따로 열린다. 칸 목록 창을 닫거나 바꾸지 않는다 (H-20)
function openItemWin() {
  var s = shelfById(App.shelfId);
  if (!s) return;
  var sel = $('item-shelf');
  if (!sel.options.length) sel.innerHTML = FRIDGE_SHELVES.map(function (k) { return '<option value="' + k.id + '">' + k.icon + ' ' + esc(k.name) + '</option>'; }).join('');
  clearErrs($('sheet-item'));
  resetItemForm();
  hideOcrAsk();
  renderShelf();
  openLayer('sheet-item');
}
function resetItemForm() {
  App.editItemId = null;
  clearErrs($('item-form'));
  $('item-name').value = '';
  $('item-qty').value = '';
  $('item-exp').value = '';
  $('item-memo').value = '';
  if (shelfById(App.shelfId)) $('item-shelf').value = App.shelfId;   // 넣을 칸은 지금 연 칸이 기본 (H-34)
  $('h-item-win').textContent = '음식 넣기';
  $('item-save').textContent = '넣기';
  $('item-cancel').hidden = true;
  if ($('item-exp-pick')) renderItemHint();
}
function editItem(id) {
  var x = fridgeItemById(id);
  if (!x) return;
  if (!isOpen('sheet-item') || App.shelfId !== x.shelf) { App.shelfId = x.shelf; openItemWin(); }
  App.editItemId = x.id;
  clearErrs($('item-form'));
  $('item-name').value = x.name;
  $('item-qty').value = x.qty;
  $('item-exp').value = x.exp;
  $('item-memo').value = x.memo || '';
  $('item-shelf').value = x.shelf;
  $('h-item-win').textContent = x.name + ' 고치기';
  $('item-save').textContent = '저장';
  $('item-cancel').hidden = false;
  renderItemHint();
  focusEl($('item-name'));
}
function submitItem() {
  var form = $('item-form');
  clearErrs(form);
  var nameIn = $('item-name'), name = nameIn.value.trim().replace(/\s+/g, ' ');
  var qty = $('item-qty').value.trim().replace(/\s+/g, ' ');
  var memo = $('item-memo').value.trim().replace(/\s+/g, ' ');
  var shelfIn = $('item-shelf'), shelf = shelfById(shelfIn.value);
  var expIn = $('item-exp'), exp = expIn.value, today = Calc.today();
  var ok = true;
  if (!name) { fieldErr(nameIn, '음식 이름을 넣어 주세요.'); ok = false; }
  else if (name.length > 30) { fieldErr(nameIn, '이름은 30자까지예요.'); ok = false; }
  if (qty.length > 20) { fieldErr($('item-qty'), '수량은 20자까지예요.'); ok = false; }
  if (!shelf) { fieldErr(shelfIn, '넣을 칸을 골라 주세요.'); ok = false; }
  if (exp) {
    var bad = !Calc.isDay(exp) ? '날짜 모양이 맞지 않아요.' : Calc.daysBetween(today, exp) > 3660 ? '유통기한은 10년 안으로 넣어 주세요.' :
      Calc.daysBetween(exp, today) > 365 ? '1년도 더 지난 날짜예요. 날짜를 다시 봐 주세요.' : '';
    if (bad) { fieldErr($('item-exp-y'), bad); ok = false; }
  }
  if (memo.length > 40) { fieldErr($('item-memo'), '메모는 40자까지예요.'); ok = false; }
  if (!ok) return false;
  var list = App.state.fridge.items;
  var x = App.editItemId ? fridgeItemById(App.editItemId) : null;
  if (x) {
    x.name = name; x.qty = qty; x.exp = exp; x.memo = memo; x.shelf = shelf.id;
  } else {
    if (list.length >= 1000) { toast('냉장고 음식은 1000개까지예요'); return false; }
    x = { id: newId('k'), shelf: shelf.id, name: name, qty: qty, exp: exp, memo: memo, added: today, sample: false };
    list.push(x);
  }
  var other = shelf.id !== App.shelfId;   // 다른 칸에 넣었으면 알림에 칸 이름을 붙인다
  var edited = !!App.editItemId;
  save();
  App.flash = x.id;
  resetItemForm();
  hideOcrAsk();
  refreshOpen();
  var e = expInfo(exp);
  toast(name + (edited ? ' 고쳤어요' : ' 넣었어요') + (other ? ' · ' + shelf.icon + ' ' + shelf.name : '') + (e ? ' · ' + e.text : ''));
  focusEl($('item-name'));
  return true;
}
function deleteItem(id) {
  var x = fridgeItemById(id);
  if (!x) return;
  askConfirm('냉장고에서 꺼낼까요?', x.name + '을(를) ' + shelfById(x.shelf).name + '에서 지워요.', '꺼내기', function () {
    rememberUndo();
    App.state.fridge.items = App.state.fridge.items.filter(function (i) { return i.id !== x.id; });
    if (App.editItemId === x.id) resetItemForm();
    save();
    refreshOpen();
    toast(x.name + ' 꺼냈어요', true);
  });
}
// 칸에 자주 넣는 음식 버튼: 이름과 오늘+n일을 채워 그 칸에 바로 넣는다 (R-18)
function quickAddItem(name, days) {
  if (!App.shelfId || !name) return;
  resetItemForm();
  hideOcrAsk();
  $('item-name').value = name;
  $('item-exp').value = Calc.addDays(Calc.today(), Number(days) || 0);
  submitItem();
}
// 유통기한 날짜 고르기 (H-35): 연·월·일 칸으로 바로 고른다. 빈 칸이 있을 때 하나를 고르면
// 나머지는 오늘 날짜로 채워 한 번에 맞는 날짜가 되고, 어느 칸이든 빈칸('연도'·'월'·'일')으로 돌리면 유통기한을 비운다
function onExpPick(e) {
  var y = $('item-exp-y').value, m = $('item-exp-m').value, d = $('item-exp-d').value;
  if ((e && !e.target.value) || (!y && !m && !d)) { $('item-exp').value = ''; renderItemHint(); return; }
  var t = Calc.today().split('-').map(Number);
  y = +y || t[0]; m = +m || t[1]; d = +d || t[2];
  d = Math.min(d, Calc.daysInMonth(y, m));   // 2월 30일처럼 없는 날은 그 달 마지막 날로
  $('item-exp').value = y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
  clearErrs($('item-exp-wrap'));
  renderItemHint();
  flashEl($('item-exp-out'));
}
function pickExpDate() {
  $('item-exp-wrap').hidden = false;
  renderItemHint();
  focusEl($('item-exp-y'));
}
function focusItemName() {
  if (!isOpen('sheet-item')) openItemWin();
  if (!isOpen('sheet-item')) return;
  var n = $('item-name');
  focusEl(n);   // 음식 넣기 창은 넘기지 않으므로 이름 칸은 늘 보인다 (H-18)
}

// ---------- 📷 냉장고 사진 (열린 냉장고의 사진 탭) ----------
function takePhoto() {
  setFridgeMode('photo');
  var inp = $('photo-input');
  inp.value = '';
  try { inp.click(); } catch (e) { toast('이 브라우저에서는 사진을 고를 수 없어요'); }
}
// 고른 사진 파일을 긴 쪽 max px JPEG dataURL 로 줄인다 (기기 밖으로 보내지 않는다)
function readImageFile(f, max, quality, done) {
  if (!f) return;
  if (!/^image\//.test(f.type)) { toast('사진 파일만 넣을 수 있어요'); return; }
  if (f.size > 30 * 1024 * 1024) { toast('사진이 너무 커요(30MB까지)'); return; }
  var reader = new FileReader();
  reader.onerror = function () { toast('사진을 읽지 못했어요'); };
  reader.onload = function () {
    var img = new Image();
    img.onerror = function () { toast('사진을 열지 못했어요'); };
    img.onload = function () {
      var w = img.naturalWidth, h = img.naturalHeight;
      var k = Math.min(1, max / Math.max(w, h));
      var c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * k));
      c.height = Math.max(1, Math.round(h * k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      var data;
      try { data = c.toDataURL('image/jpeg', quality); } catch (e) { toast('사진을 줄이지 못했어요'); return; }
      done(data);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(f);
}
function onPhotoChosen() {
  var f = $('photo-input').files && $('photo-input').files[0];
  readImageFile(f, 960, 0.7, function (data) { addPhoto(data); });
}
// 이름표 없이 남기고, 찍은 뒤에 '어디를 찍었나요?' 를 묻는다 (H-16)
function addPhoto(data) {
  var before = App.photos.slice();
  var p = { id: newId('p'), date: Calc.today(), label: '', data: data };
  App.photos.push(p);
  var dropped = 0;
  while (App.photos.length > Store.MAX_PHOTOS) { App.photos.shift(); dropped++; }
  while (!Store.savePhotos(App.photos)) {
    if (App.photos.length <= 1) { App.photos = before; Store.savePhotos(before); toast('저장할 자리가 모자라 사진을 넣지 못했어요'); return; }
    App.photos.shift(); dropped++;
  }
  save();
  App.photoId = p.id;
  setFridgeMode('photo');
  renderFridge();
  toast('사진을 남겼어요' + (dropped ? ' · 오래된 사진 ' + dropped + '장은 뺐어요' : ''));
  readPhotoText(data);
}
function setPhotoLabel(id, label) {
  var p = App.photos.filter(function (x) { return x.id === id; })[0];
  if (!p || PHOTO_LABELS.indexOf(label) < 0) return;
  p.label = label;
  Store.savePhotos(App.photos);
  renderPhoto();
  toast(label + ' 사진이에요');
}
function deletePhoto(id) {
  var p = App.photos.filter(function (x) { return x.id === id; })[0];
  if (!p) return;
  askConfirm('사진을 지울까요?', Calc.shortDay(p.date) + ' ' + (p.label || '냉장고') + ' 사진을 지워요.', '지우기', function () {
    rememberUndo();
    App.photos = App.photos.filter(function (x) { return x.id !== id; });
    Store.savePhotos(App.photos);
    App.photoId = null;
    refreshOpen();
    toast('사진을 지웠어요', true);
  });
}

// ---------- 사진 글자 읽기 (보조 기능, 코드\vendor\tesseract\ 만 쓴다) ----------
function readPhotoText(data) {
  $('ocr-out').hidden = true;
  if (!Ocr.available()) { $('ocr-file').hidden = false; return; }
  App.ocrFor = 'photo';
  ocrScan(data).then(function (r) { showOcrPick('photo', r); },
    function () { toast('글자 읽기를 불러오지 못했어요. 사진은 그대로 남았어요'); });
}
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
// 묻는 카드(날짜 확인·이름 후보·읽힌 글자)는 사진 탭(at='photo')에만 있다. 음식 넣기 창은 날짜만 바로 채운다 (H-36)
function ocrEl(at, key) { return $('ocr-' + key); }
// 이름으로 쓰지 않는 표시 낱말 (날짜·용량·영양 표시 글)
var OCR_SKIP = /^(유통기한|소비기한|유통|소비|기한|까지|제조|제조일|제조일자|제조년월일|생산|생산일|원재료|원재료명|내용량|중량|용량|보관|보관방법|냉장|냉장보관|냉동|냉동보관|영양|영양정보|영양성분|열량|칼로리|나트륨|탄수화물|당류|지방|포화지방|트랜스지방|콜레스테롤|단백질|포장|포장재질|재질|업소명|제조원|판매원|소재지|품목|품목보고번호|반품|교환|가격|판매가|할인|바코드|exp|best|before|kcal|mg|ml|kg|g|l)$/i;
// 글자 인식은 한글을 한 글자씩 띄워 읽을 때가 많다. 이어진 한 글자들을 한 낱말로 붙인다
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
// 읽힌 글에서 음식 이름 후보: 한 줄 통째(짧은 것)와 낱말. 날짜·숫자·단위·표시 낱말은 뺀다. 한글을 앞에, 12개까지
function ocrNames(text) {
  var seen = {}, out = [];
  function add(s) {
    s = String(s).replace(/^[^0-9A-Za-z가-힣]+/, '').replace(/[^0-9A-Za-z가-힣)]+$/, '').replace(/\s+/g, ' ').trim();
    if (s.length < 2 || s.length > 20) return;
    if (!/[가-힣]/.test(s) && !/[A-Za-z]{3,}/.test(s)) return;
    if (/\d{2,4}\s*[.\-\/년]\s*\d{1,2}/.test(s)) return;
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
// 읽은 결과로 카드를 연다. 날짜는 넣기 전에 늘 묻는다
function showOcrPick(at, r) {
  App.ocrPick[at] = { text: r.text || '', date: Calc.isDay(r.date) ? r.date : null, dateOk: false, manual: false, name: '', own: false, savedId: null };
  fillShelfSelect();
  renderOcrPick(at);
  var box = $('ocr-out');
  box.hidden = false;
  flashEl(box);   // 읽는 동안은 다른 칸을 접어(style.css :has) 넘기지 않고 보인다 (H-18)
}
function renderOcrPick(at) {
  var o = App.ocrPick[at];
  if (!o) return;
  var where = '고른 칸';
  var day = o.date ? '<b>' + o.date.replace(/-/g, '.') + '</b>(' + ocrDateText(o.date) + ')' : '';
  var saved = o.savedId ? fridgeItemById(o.savedId) : null, q;
  // H-21: 결과만 짧게. '~하면 ~해요' 같은 안내 문장은 두지 않는다
  if (o.date && !o.dateOk && !o.manual) q = '⏰ 유통기한 ' + day + ' · ' + where + '<br>이 날짜가 맞나요?';
  else if (o.dateOk && saved) q = '✓ <b>' + esc(saved.name) + '</b> · 유통기한 ' + day + '<br>' + esc(shelfById(saved.shelf).name) + '에 넣었어요.';
  else if (o.dateOk) q = '✓ 유통기한 ' + day;
  else if (o.manual) q = '';
  else q = '⏰ 유통기한 날짜를 찾지 못했어요';
  ocrEl(at, 'q').innerHTML = q;
  ocrEl(at, 'q').parentNode.classList.toggle('saved', !!(o.dateOk && saved));
  ocrEl(at, 'btns').hidden = !(o.date && !o.dateOk && !o.manual);
  var names = ocrNames(o.text);
  var typed = o.name && names.indexOf(o.name) < 0 ? o.name : '';
  ocrEl(at, 'names').innerHTML = (typed ? [typed] : []).concat(names).map(function (n) {
    var on = n === o.name;
    return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-act="ocr-name" data-at="' + at + '" data-name="' + esc(n) + '" aria-pressed="' + on + '">' +
      (on ? '✓ ' : '') + (n === typed ? '✏️ ' : '') + esc(n) + '</button>';
  }).join('') +
    btn({ act: 'ocr-name-own', label: '✏️ 직접 쓰기', cls: 'chip own', data: { at: at } });
  ocrEl(at, 'own').hidden = !o.own;
  ocrEl(at, 'names').querySelector('.chip.own').setAttribute('aria-expanded', String(!!o.own));
  ocrEl(at, 'text').textContent = o.text || '읽힌 글자가 없어요';
  ocrEl(at, 'count').textContent = o.text ? ocrCountText(o.text) : '';
  ocrCopyDone(at, false);
  ocrEl(at, 'copy').disabled = !o.text;
}
function ocrCountText(text) { return text.split('\n').length + '줄 · ' + text.replace(/\s/g, '').length + '자'; }
function ocrCopyDone(at, on) {
  var b = ocrEl(at, 'copy');
  clearTimeout(b._doneTimer);
  b.classList.toggle('done', on);
  b.textContent = on ? '✓ 복사했어요' : '📋 복사';
  if (on) b._doneTimer = setTimeout(function () { ocrCopyDone(at, false); }, 1600);
}
function ocrDateOk(at) {
  var o = App.ocrPick[at];
  if (!o || !o.date) return;
  o.dateOk = true;
  if (!ocrAutoSave(at)) renderOcrPick(at);
}
function ocrDateNo(at) {
  var o = App.ocrPick[at];
  if (!o) return;
  o.manual = true; o.dateOk = false;
  renderOcrPick(at);   // H-20: 사진 탭에서 칸 창으로 넘어가지 않는다
}
function ocrName(at, name) {
  var o = App.ocrPick[at];
  if (!o || !name) return;
  o.name = String(name).slice(0, 30);
  o.own = false;
  if (o.dateOk && ocrAutoSave(at)) return;
  renderOcrPick(at);
}
function ocrNameOwn(at) {
  var o = App.ocrPick[at];
  if (!o) return;
  o.own = !o.own;
  renderOcrPick(at);
  if (!o.own) return;
  var inp = ocrEl(at, 'own-in');
  clearErrs(ocrEl(at, 'own'));
  var saved = o.savedId ? fridgeItemById(o.savedId) : null;
  inp.value = o.name || (saved && saved.name !== OCR_NONAME ? saved.name : '');
  focusEl(inp);
  inp.select();
}
function ocrOwnUse(at) {
  var o = App.ocrPick[at];
  if (!o) return;
  var inp = ocrEl(at, 'own-in'), v = inp.value.trim().replace(/\s+/g, ' ');
  clearErrs(ocrEl(at, 'own'));
  if (!v) { fieldErr(inp, '음식 이름을 써 주세요.'); return; }
  if (v.length > 30) { fieldErr(inp, '이름은 30자까지예요.'); return; }
  ocrName(at, v);
}
// ---------- 확인한 유통기한을 그 음식의 유통기한으로 바로 넣기 (H-13. 칸 메모는 없앴다, H-31) ----------
var OCR_NONAME = '사진 속 음식';
function ocrAutoSave(at) {
  var o = App.ocrPick[at];
  if (!o || !o.dateOk || !Calc.isDay(o.date)) return false;
  var s = shelfById($('ocr-shelf').value);
  if (!s) return false;
  var name = o.name || (o.savedId ? '' : OCR_NONAME);
  var x = o.savedId ? fridgeItemById(o.savedId) : null, first = !x;
  if (first) {
    if (App.state.fridge.items.length >= 1000) { toast('냉장고 음식은 1000개까지예요'); return false; }
    rememberUndo();
    x = { id: newId('k'), shelf: s.id, name: name, qty: '', exp: o.date, memo: '', added: Calc.today(), sample: false };
    App.state.fridge.items.push(x);
    o.savedId = x.id;
  } else {
    if (name) x.name = name;
    x.shelf = s.id;
    x.exp = o.date;
  }
  save();
  App.flash = x.id;
  refreshOpen();
  renderOcrPick(at);
  toast(x.name + ' · ' + ocrDateText(x.exp) + (first ? '을(를) ' + s.name + '에 넣었어요' : '(으)로 고쳤어요'), first);
  return true;
}
function onOcrShelfChange() {
  var o = App.ocrPick.photo;
  if (o && o.dateOk && o.savedId) ocrAutoSave('photo');
}
function copyOcrText(at) {
  var o = App.ocrPick[at];
  if (!o || !o.text) { toast('복사할 글자가 없어요'); return; }
  copyText(o.text, '읽힌 글자 ' + ocrCountText(o.text) + '를 모두 복사했어요', null, function () { ocrCopyDone(at, true); });
}
// ---------- 음식 넣기 창 유통기한 '자동 인식' (H-36) ----------
// 유통기한 칸 오른쪽 카메라 버튼(#item-exp-cam) → 카메라로 찍기 → 읽은 날짜를 유통기한 칸에 바로 채운다.
// 묻는 카드·이름 후보·읽힌 글자 전체·복사는 두지 않는다. 날짜가 틀리면 사람이 연·월·일 칸에서 고친다
function takeShelfPhoto() {
  App.snapFromExp = false;
  if (!Ocr.available()) { $('shelf-ocr-file').hidden = false; pickExpDate(); return; }
  openShelfCamera();
}
function openShelfCamera() {
  var inp = $('shelf-photo-input');
  inp.value = '';
  try { inp.click(); } catch (e) { toast('이 브라우저에서는 사진을 고를 수 없어요'); }
}
// ---------- 유통기한 목록 위 '📷 유통기한 찍기' (H-42) ----------
// 카메라로 찍기 → 음식 넣기 창을 열고(넣을 칸은 지금 연 칸, 없으면 냉장실 가운데 칸) 읽은 날짜를 유통기한 칸에 채운다.
// 같은 길(#shelf-photo-input → ocrScan → fillExpFromPhoto)을 쓴다. 찍기를 그만두면 창을 열지 않는다
function snapExpDate() {
  if (!shelfById(App.shelfId)) App.shelfId = 'r2';
  if (!Ocr.available()) {
    App.snapFromExp = false;
    if (!isOpen('sheet-item')) openItemWin();
    $('shelf-ocr-file').hidden = false;
    pickExpDate();
    return;
  }
  App.snapFromExp = true;
  openShelfCamera();
}
// 날짜를 읽는 동안 유통기한 목록 위 찍기 버튼에 진행 표시(aria-busy, style.css 숨쉬기). 다시 그려도 남게 App 에 둔다
function setSnapBusy(on) {
  App.snapBusy = !!on;
  var b = document.querySelector('#fridge-exp .exp-snap');
  if (b) { if (on) b.setAttribute('aria-busy', 'true'); else b.removeAttribute('aria-busy'); }
}
function onShelfPhotoChosen() {
  var f = $('shelf-photo-input').files && $('shelf-photo-input').files[0];
  readImageFile(f, 1600, 0.9, function (data) {
    var fromExp = App.snapFromExp;
    if (fromExp) {
      App.snapFromExp = false;
      if (!shelfById(App.shelfId)) App.shelfId = 'r2';
      openItemWin();   // 새 음식 넣기 창 — 읽는 동안 진행 표시가 이 창 안에 뜨고, 다 읽으면 날짜가 채워진다
      setSnapBusy(true);
    }
    var shelf = App.shelfId, cam = $('item-exp-cam');
    hideOcrAsk();
    App.ocrFor = 'shelf';
    cam.setAttribute('aria-busy', 'true');
    ocrScan(data).then(function (r) {
      cam.removeAttribute('aria-busy');
      if (fromExp) setSnapBusy(false);
      if (!isOpen('sheet-item') || App.shelfId !== shelf) return;
      fillExpFromPhoto(r.date);
    }, function () { cam.removeAttribute('aria-busy'); if (fromExp) setSnapBusy(false); toast('글자 읽기를 불러오지 못했어요'); });
  });
}
function fillExpFromPhoto(date) {
  if (!Calc.isDay(date)) { toast('📷 날짜를 찾지 못했어요'); pickExpDate(); return; }
  clearErrs($('item-exp-wrap'));
  $('item-exp').value = date;
  renderItemHint();
  var pick = $('item-exp-pick');
  pick.classList.remove('read');
  void pick.offsetWidth;   // 다시 찍어도 빛남이 처음부터 돈다
  pick.classList.add('read');
  flashEl($('item-exp-out'));
  toast('📷 ' + ocrDateText(date) + ' 채웠어요');
}
function hideOcrAsk() {
  $('shelf-ocr-file').hidden = true;
  $('item-exp-pick').classList.remove('read');
}
function showOcrProgress(label, pct, done) {
  var p = App.ocrFor === 'shelf' ? 'shelf-ocr-' : 'ocr-';
  if (done) { $('ocr-box').hidden = true; $('shelf-ocr-box').hidden = true; return; }
  $(p + 'box').hidden = false;
  $(p + 'label').textContent = label;
  $(p + 'pct').textContent = pct + '%';
  $(p + 'fill').style.width = pct + '%';
  var bar = $(p + 'bar');
  bar.setAttribute('aria-valuenow', String(pct));
  bar.setAttribute('aria-valuetext', label + ' ' + pct + '%');
}

// ---------- 기록 옮기기: 내보내기·가져오기 (H-49: 창 둘을 따로 연다) ----------
function openExport() {
  $('export-text').value = Store.exportText(App.state, App.photos);
  openLayer('sheet-export');
}
function openImport() {
  $('restore-text').value = '';
  clearErrs($('sheet-import'));
  openLayer('sheet-import');
  focusEl($('restore-text'));
}
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
    toast(ok ? okMsg : '복사하지 못했어요');
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
  clearErrs($('sheet-import'));
  var r = Store.parseImport(ta.value);
  if (!r.ok) { fieldErr(ta, r.msg); return; }
  var s = r.state;
  askConfirm('기록을 바꿀까요?', '챌린지 ' + s.challenges.length + '개, 식비 ' + s.spends.length + '건, 집밥 ' + s.meals.length + '번, 냉장고 음식 ' + s.fridge.items.length + '개, 사진 ' + r.photos.length + '장으로 지금 기록을 모두 바꿔요.', '바꾸기', function () {
    rememberUndo();
    App.state = s;
    App.photos = r.photos;
    Store.savePhotos(App.photos);
    applySettings();
    save();
    closeLayer('sheet-import');
    toast('가져왔어요', true);
  });
}

// ---------- 예시 자취방 ----------
function loadSample() {
  var st = App.state, today = Calc.today(), added = 0;
  rememberUndo();
  if (!activeChal() && !st.spends.some(function (x) { return x.sample; })) {
    var sc = SAMPLE_ROOM.challenge, p = CHALLENGE_PRESETS[sc.preset];
    var start = Calc.addDays(today, -sc.startedDaysAgo);
    st.challenges.push({ id: newId('c'), name: p.name, budget: p.budget, months: p.months, start: start, end: Calc.challengeEnd(start, p.months), status: 'active', spent: null, sample: true });
    SAMPLE_ROOM.spends.forEach(function (s) { addSpend({ date: Calc.addDays(today, -s[0]), amount: s[1], kind: s[2], memo: s[3], sample: true }); });
    SAMPLE_ROOM.meals.forEach(function (d) { st.meals.push({ id: newId('e'), date: Calc.addDays(today, -d), sample: true }); });
    added++;
  }
  if (!st.fridge.items.some(function (x) { return x.sample; })) {
    var sf = SAMPLE_ROOM.fridge;
    sf.items.forEach(function (x) {
      st.fridge.items.push({ id: newId('k'), shelf: x[0], name: x[1], qty: x[2], exp: Calc.addDays(today, x[3]), memo: x[4] || '', added: Calc.addDays(today, -3), sample: true });
    });
    added++;
  }
  save();
  refreshOpen(); // H-20: 지금 화면·창은 그대로 두고 다시 그리기만 한다
  toast(added ? '예시 자취방을 넣었어요. 돈은 예시 숫자예요' : '예시가 이미 들어 있어요', added > 0);
}
function removeSample() {
  var st = App.state;
  var n = st.challenges.filter(function (c) { return c.sample; }).length + st.spends.filter(function (x) { return x.sample; }).length +
    st.meals.filter(function (x) { return x.sample; }).length + st.fridge.items.filter(function (x) { return x.sample; }).length;
  if (!n) { toast('지울 예시가 없어요'); return; }
  askConfirm('예시를 지울까요?', '예시로 넣은 챌린지·식비·집밥·냉장고 음식 ' + n + '개를 지워요. 직접 넣은 것은 남아요.', '지우기', function () {
    rememberUndo();
    st.challenges = st.challenges.filter(function (c) { return !c.sample; });
    st.spends = st.spends.filter(function (x) { return !x.sample; });
    st.meals = st.meals.filter(function (x) { return !x.sample; });
    st.fridge.items = st.fridge.items.filter(function (x) { return !x.sample; });
    save();
    refreshOpen();
    toast('예시를 지웠어요', true);
  });
}
// H-50: 냉장고 비우기 — 한 번 더 묻고 나서 지운다 (설정은 남김, 되돌리기 가능)
function emptyFridge() {
  askConfirm('냉장고를 비울까요?', '챌린지·식비 기록·집밥 횟수·냉장고 음식·사진을 모두 지워요. 설정은 남아요.', '비우기', function () {
    rememberUndo();
    var keep = App.state.settings;
    App.state = Store.defaults();
    App.state.settings = keep;
    App.photos = [];
    Store.savePhotos(App.photos);
    save();
    toast('냉장고를 비웠어요', true);
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
  var o = App.ocrPick.photo;
  if (o && o.savedId && !fridgeItemById(o.savedId)) { o.savedId = null; o.dateOk = false; renderOcrPick('photo'); }
  toast('되돌렸어요');
}

// ---------- H-55: 완료 기준 — 스크린샷으로 남긴다 ----------
// 주소 끝에 #shot=이름 을 붙여 열면(예: index.html#shot=shelf) 그 기준을 확인할 화면이 바로 뜬다.
// 예시 자취방을 이 탭 안에만 넣고(저장하지 않음, 원래 기록은 그대로) 움직임을 끈 채 연다. 사람·실행 검사가 같은 화면을 찍어 남긴다
var SHOTS = {
  door:  { h: '첫 화면', what: '자석·메모지만, 문 위 냉동실·냉장실 글자 없음', go: function () { toggleFridge(false); } },
  shelf: { h: 'H-56·H-57', what: '칸 창이 냉장고 틀 안 흰 판, 이름·수량·유통기한·메모 글자 모양이 다름', go: function () { setFridgeMode('shelf'); openShelf('r2'); } },
  exp:   { h: 'H-56', what: '유통기한 창이 냉장고 틀 안 불투명 흰 판', go: function () { setFridgeMode('exp'); } },
  item:  { h: 'H-58', what: '음식 넣기의 연·월·일 고르기와 옆 카메라 버튼', go: function () { setFridgeMode('shelf'); openShelf('r2'); openItemWin(); } },
  more:  { h: 'H-59', what: '설정이 스크롤 없이 한 화면, 설명 문장 없음', go: function () { setScreen('more'); } },
  dark:  { h: 'H-60', what: '어둡게에서 냉장고 문이 비치지 않음', theme: 'dark', go: function () { toggleFridge(false); } }
};
function showShot(name) {
  var s = SHOTS[name];
  if (!s) return false;
  App.shotMode = true;
  App.state = Store.defaults();
  App.state.settings.motion = true;            // 전환 없이 바로 그 상태로
  App.state.settings.theme = s.theme || 'light';
  App.state.fridgeOpened = true;
  App.photos = [];
  App.coach = false;
  applySettings();
  closeAllLayers();
  if (App.screen !== 'fridge') setScreen('fridge');
  loadSample();
  App.undo = null;
  clearTimeout(App.toastTimer);
  $('toast').hidden = true;
  s.go();
  document.body.setAttribute('data-shot', name);
  if (name === 'dark') setTimeout(function () { document.body.setAttribute('data-door-solid', doorSolid().ok ? 'yes' : 'no'); }, 60);
  return true;
}
// H-60: 어둡게에서 문이 비치지 않는지 스스로 잰다 — 두 문과 문 위 판의 opacity(조상까지 곱)가 1, 바탕색 알파가 1
function doorSolid() {
  var out = { ok: true, theme: document.body.getAttribute('data-theme'), parts: [] };
  ['door-l', 'door-r', 'door-week', 'door-next'].forEach(function (id) {
    var el = $(id);
    if (!el) return;
    var op = 1, n = el, a = 1;
    while (n && n.nodeType === 1) { op *= parseFloat(getComputedStyle(n).opacity); n = n.parentElement; }
    var m = /rgba?\(([^)]+)\)/.exec(getComputedStyle(el).backgroundColor);
    if (m) { var p = m[1].split(/[\s,\/]+/).filter(Boolean); if (p.length > 3) a = parseFloat(p[3]); }
    var good = op === 1 && a === 1;
    if (!good) out.ok = false;
    out.parts.push({ id: id, opacity: op, bgAlpha: a, ok: good });
  });
  return out;
}
window.__doorCheck = doorSolid;
function shotFromHash() {
  var m = /(?:^#|&)shot=(\w+)/.exec(location.hash || '');
  if (m) showShot(m[1]);
}
window.__shot = showShot;
window.__shots = Object.keys(SHOTS).map(function (k) { return { name: k, h: SHOTS[k].h, what: SHOTS[k].what }; });

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
// H-47: 설정 줄 오른쪽 고르는 버튼 (data-key: font·theme·motion)
function onSettingPick(d) {
  var s = App.state.settings;
  if (d.key === 'font' && /^[sml]$/.test(d.v)) s.font = d.v;
  else if (d.key === 'theme' && /^(light|auto|dark)$/.test(d.v)) s.theme = d.v;
  else if (d.key === 'motion') s.motion = d.v === 'on';
  else return;
  applySettings();
  renderMore();
  var ok = save();
  var msg = $('set-saved');
  msg.textContent = ok ? '✓ 저장했어요' : '저장이 안 돼요';
  flashEl(msg);
}

// ---------- 버튼 ----------
var ACTIONS = {
  go: function (d) { closeAllLayers(); setScreen(d.to); },
  close: function () { closeLayer(); },
  'set-pick': function (d) { onSettingPick(d); },
  'fridge-door': function () { toggleFridge(); },
  'fridge-mode': function (d) { setFridgeMode(d.mode); },
  'fridge-open-exp': function () { closeAllLayers(); if (App.screen !== 'fridge') setScreen('fridge'); setFridgeMode('exp'); },
  'shelf-open': function (d) { openShelf(d.id); },
  'item-edit': function (d) { editItem(d.id); },
  'item-del': function (d) { deleteItem(d.id); },
  'item-quick-add': function (d) { quickAddItem(d.name, d.d); },
  'item-focus': focusItemName,
  'item-new': openItemWin,
  'item-cancel': function () { resetItemForm(); hideOcrAsk(); },
  'photo-take': takePhoto,
  'photo-pick': function (d) { App.photoId = d.id; renderPhoto(); },
  'photo-del': function (d) { deletePhoto(d.id); },
  'photo-label': function (d) { setPhotoLabel(d.id, d.label); },
  'shelf-ocr': takeShelfPhoto,
  'exp-snap': snapExpDate,
  // H-43: 유통기한 판 왼쪽 아래 '음식 넣기' — 넣을 칸은 지금 연 칸, 없으면 냉장실 가운데 칸(찍기와 같은 기본)
  'exp-add': function () { if (!shelfById(App.shelfId)) App.shelfId = 'r2'; openItemWin(); },
  'ocr-date-use': function (d) { ocrDateOk(d.at); },
  'ocr-date-no': function (d) { ocrDateNo(d.at); },
  'ocr-name': function (d) { ocrName(d.at, d.name); },
  'ocr-name-own': function (d) { ocrNameOwn(d.at); },
  'ocr-own-use': function (d) { ocrOwnUse(d.at); },
  'ocr-copy': function (d) { copyOcrText(d.at); },
  'meal-eat': eatMeal,
  'meal-del': deleteMeal,
  'spend-new': function () { openSpend(null); },
  'spend-edit': function (d) { openSpend(d.id); },
  'spend-del': deleteSpend,
  'spend-kind': function (d) { App.spendKind = d.kind; renderSpendKinds(App.spendKind); renderSpendPreview(); },
  // 최근 식비: 종류·금액·메모를 채우고 바로 저장한다
  'spend-repeat': function (d) {
    var x = recentSpends()[+d.i];
    if (!x || App.editSpendId) return;
    App.spendKind = x.kind;
    $('spend-amount').value = x.amount;
    $('spend-memo').value = x.memo || '';
    renderSpendKinds(App.spendKind);
    renderSpendPreview();
    submitSpend();
  },
  'spend-quick': function (d) { $('spend-amount').value = d.v; flashEl($('spend-display')); renderSpendPreview(); },
  // 숫자판: 금액 칸 값을 고친 뒤 큰 금액·미리보기를 다시 그린다. 1,000만 원을 넘는 키는 받지 않고 흔든다
  'spend-key': function (d) {
    var a = $('spend-amount'), k = d.k;
    var s = String(a.value || '').replace(/\D/g, '');
    if (k === 'back') s = s.slice(0, -1);
    else if (k === 'clear') s = '';
    else if (k.charAt(0) === '+') s = String((Number(s) || 0) + Number(k.slice(1)));
    else s = (s + k).replace(/^0+/, '');
    if (Number(s) > 10000000) { fieldErr(a, '쓴 돈은 1~10,000,000원 사이로 넣어 주세요.'); flashEl($('spend-display')); return; }
    clearErrs(a.closest('.field'));
    a.value = s;
    renderSpendPreview();
  },
  'chal-open': function () { openChalSheet(); },
  'chal-preset': function (d) { var p = CHALLENGE_PRESETS[+d.i]; if (p) startChallenge(p.name, p.budget, p.months, Calc.today()); },
  'chal-suggest': function (d) { App.chalSuggest = Number(d.v) || null; renderChalSheet(); },
  'chal-quit': quitChallenge,
  'chal-mode': function (d) { App.chalMode = d.mode === 'own' ? 'own' : 'pick'; renderChalSheet(); if (App.chalMode === 'own') focusEl($('chal-budget')); },
  // 챌린지 화면 보기 탭과 쪽 넘기기 (H-18: 스크롤 대신)
  'chal-view': function (d) { App.chalView = d.view; App.chalStart = null; turnChalPanel(); },
  'pg-next': function () { App.chalStart = App.chalEnd; turnChalPanel(); },
  'pg-prev': function () { App.chalStart = App.chalPrev; turnChalPanel(); },
  'export-open': openExport,
  'import-open': openImport,
  copy: function () { copyText($('export-text').value, '복사했어요', $('export-text')); },
  'contact-copy': function () { copyText($('contact-mail').textContent, '문의 메일 주소를 복사했어요'); },
  restore: restoreData,
  sample: loadSample,
  'sample-del': removeSample,
  'fridge-empty': emptyFridge,
  'privacy-open': function () { openLayer('sheet-privacy'); },
  'howto-open': function () { openLayer('sheet-howto'); },
  'license-open': function () { openLayer('sheet-license'); },
  'confirm-ok': function () { var fn = App.confirmFn; App.confirmFn = null; closeLayer('ov-confirm'); if (fn) fn(); },
  'confirm-cancel': function () { closeLayer('ov-confirm'); },
  undo: doUndo
};

function onClick(e) {
  var b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  if (b.id === 'backdrop' && e.target !== b) return; // 뒷배경은 자기 자신을 눌렀을 때만 닫는다
  var fn = ACTIONS[b.dataset.act];
  if (fn) fn(b.dataset, b, e);
}
function onKey(e) {
  if (e.key === 'Escape' && App.stack.length) { e.preventDefault(); closeLayer(); return; }
  if (e.key === 'Enter' && e.target && e.target.id === 'ocr-own-in') {
    e.preventDefault();
    ocrOwnUse('photo');
  }
}
// 자정을 넘기거나 다시 열었을 때 오늘 날짜로 새로 그린다
function checkDay() {
  var d = Calc.today();
  if (d !== App.lastDay) {
    App.lastDay = d;
    settleChallenges();
    refreshOpen();
  }
}
function bind() {
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  $('spend-form').addEventListener('submit', function (e) { e.preventDefault(); submitSpend(); });
  $('spend-form').addEventListener('input', renderSpendPreview);
  $('spend-form').addEventListener('change', renderSpendPreview);
  $('chal-form').addEventListener('submit', function (e) { e.preventDefault(); submitChalForm(); });
  $('chal-form').addEventListener('input', renderChalCalc);
  $('chal-form').addEventListener('change', renderChalCalc);
  $('item-form').addEventListener('submit', function (e) { e.preventDefault(); submitItem(); });
  $('item-name').addEventListener('input', renderItemHint);
  $('item-exp-pick').addEventListener('change', onExpPick);
  $('photo-input').addEventListener('change', onPhotoChosen);
  $('shelf-photo-input').addEventListener('change', onShelfPhotoChosen);
  $('ocr-shelf').addEventListener('change', onOcrShelfChange);
  Ocr.onProgress(showOcrProgress);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) checkDay(); });
  window.addEventListener('focus', checkDay);
  // 화면 크기가 바뀌면 챌린지 화면의 쪽을 다시 재고(H-18), 칸 창을 냉장고 틀에 다시 맞춘다(H-19)
  window.addEventListener('resize', function () {
    if (App.screen === 'chal') renderChal();
    FRIDGE_WINS.forEach(function (id) { if (isOpen(id)) fitFridgeWin(id); });
  });
  window.addEventListener('hashchange', shotFromHash); // H-55
  setInterval(checkDay, 60000);
}
function init() {
  App.state = Store.load();
  App.photos = Store.loadPhotos();
  App.lastDay = Calc.today();
  applySettings();
  bind();
  $('food-names').innerHTML = FOODS.map(function (f) { return '<option value="' + esc(f.name) + '">'; }).join('');
  $('store-warn').hidden = Store.isAvailable();
  // 손잡이 깜빡임은 문을 한 번도 안 열었을 때 처음 3초만 (H-16. 말풍선 글은 H-21 로 뺐다)
  App.coach = !App.state.fridgeOpened;
  setScreen('fridge');
  if (App.coach) setTimeout(function () { App.coach = false; if (App.screen === 'fridge') renderFridge(); }, 3000);
  settleChallenges();
  shotFromHash();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
