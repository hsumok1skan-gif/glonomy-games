(function () {
  'use strict';

  var STORE_KEY = 'haruhankan.v1';
  var MAX = 60;
  var DATA = window.PT_DATA || {};
  ['SYMPTOMS', 'EXAMPLES', 'VET_QUESTIONS', 'HELP_TIPS', 'SAMPLE'].forEach(function (k) {
    if (!Array.isArray(DATA[k])) DATA[k] = [];
  });
  // 컨디션 다섯 단계(data.js CONDITIONS). 3(처짐)·4(아픔)이 나쁜 날이다.
  var COLORS = Array.isArray(DATA.CONDITIONS) && DATA.CONDITIONS.length === 5 ? DATA.CONDITIONS : [
    { name: '좋음', hex: '#6cbf84', desc: '' },
    { name: '보통', hex: '#8fbfd9', desc: '' },
    { name: '덜 먹음', hex: '#f4c542', desc: '' },
    { name: '처짐', hex: '#ef8a4c', desc: '' },
    { name: '아픔', hex: '#d9636b', desc: '' }
  ];
  var BAD = 3;
  var WEEK = ['일', '월', '화', '수', '목', '금', '토'];
  var FONT = { '보통': '100%', '크게': '112.5%', '아주 크게': '125%' };
  var DEFAULT_SETTINGS = { name: '', kind: '개', age: '', alertDays: 3, font: '보통' };

  function $(id) { return document.getElementById(id); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // ---- 날짜 처리: 모두 기기 현지 날짜(연·월·일)로 계산한다 ----
  // toISOString(UTC)으로 날짜를 만들면 한국에서는 아침 9시 전에 어제 날짜가 되므로 쓰지 않는다.
  // Date 는 낮 12시로 만들어, 일광 절약 시간이 자정에 바뀌는 지역에서도 날짜가 밀리지 않게 한다.
  var MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  // m 은 0~11. 2월은 윤년이면 29일
  function daysInMonth(y, m) { return m === 1 && isLeap(y) ? 29 : MONTH_DAYS[m]; }
  function localDate(y, m, d) { return new Date(y, m, d, 12, 0, 0, 0); }
  function keyOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function keyFrom(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }
  function partsOf(k) { return { y: +k.slice(0, 4), m: +k.slice(5, 7) - 1, d: +k.slice(8, 10) }; }
  function parseKey(k) { var p = partsOf(k); return localDate(p.y, p.m, p.d); }
  // 2026-02-29·2026-04-31 처럼 없는 날은 받지 않는다 (2028-02-29 는 윤년이라 받는다)
  function validKey(k) {
    if (typeof k !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(k)) return false;
    var p = partsOf(k);
    return p.y >= 1000 && p.m >= 0 && p.m <= 11 && p.d >= 1 && p.d <= daysInMonth(p.y, p.m);
  }
  function todayKey() { return keyOf(new Date()); }
  // 월말을 넘으면 다음 달 1일로, 1일 앞은 지난달 말일로 넘기고, 12월·1월에서는 해를 넘긴다
  function addDays(k, n) {
    var p = partsOf(k), y = p.y, m = p.m, d = p.d + n;
    while (d > daysInMonth(y, m)) {
      d -= daysInMonth(y, m);
      m++;
      if (m > 11) { m = 0; y++; }
    }
    while (d < 1) {
      m--;
      if (m < 0) { m = 11; y--; }
      d += daysInMonth(y, m);
    }
    return keyFrom(y, m, d);
  }
  // 달 옮기기: 12월 다음은 다음 해 1월, 1월 앞은 지난해 12월
  function addMonths(y, m, n) {
    var t = y * 12 + m + n;
    return { year: Math.floor(t / 12), month: ((t % 12) + 12) % 12 };
  }
  // 두 날 사이 날수. 시각·일광 절약 시간과 상관없이 달력 날짜로만 센다
  function dayNumber(k) { var p = partsOf(k); return Date.UTC(p.y, p.m, p.d) / 86400000; }
  function daysBetween(a, b) { return dayNumber(b) - dayNumber(a); }
  function labelOf(k) {
    var d = parseKey(k);
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + WEEK[d.getDay()] + ')';
  }
  function msg(id, text) { var el = $(id); if (el) el.textContent = text; }

  // ---- 입력 검사: 틀린 칸에 표시를 하고 그 칸으로 옮긴 뒤, 무엇이 틀렸는지 알린다 ----
  var RESTORE_MAX = 200000;
  var NEXT_MAX_DAYS = 365;
  function markBad(id, msgId, text) {
    var el = $(id);
    if (el) {
      el.setAttribute('aria-invalid', 'true');
      if (el.focus) el.focus();
    }
    msg(msgId, text);
  }
  function markOk(ids) {
    ids.forEach(function (id) { var el = $(id); if (el) el.removeAttribute('aria-invalid'); });
  }
  // 붙여 넣은 글이 최대 글자 수를 넘으면 브라우저가 말없이 자르므로, 잘린 글자 수를 알린다
  function guardPaste(id, max, msgId, what) {
    var el = $(id);
    el.addEventListener('paste', function (ev) {
      var cd = ev.clipboardData || window.clipboardData;
      if (!cd) return;
      var add = String(cd.getData('text') || '').replace(/\r?\n/g, '');
      var picked = (el.selectionEnd || 0) - (el.selectionStart || 0);
      var over = el.value.length - picked + add.length - max;
      if (over > 0) msg(msgId, what + '은 ' + max + '자까지라 붙여 넣은 글의 뒤 ' + over + '자는 들어가지 않았어요.');
    });
  }

  // ---- 저장 ----
  function clean(obj) {
    var out = {};
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      if (validKey(k) && v && typeof v.t === 'string' &&
          typeof v.c === 'number' && v.c >= 0 && v.c < COLORS.length) {
        out[k] = { c: Math.floor(v.c), t: v.t.slice(0, MAX) };
        if (v.s) out[k].s = 1;
      }
    });
    return out;
  }
  function cleanVisits(arr) {
    if (!Array.isArray(arr)) return [];
    var seen = {};
    return arr.filter(function (k) {
      if (!validKey(k) || seen[k]) return false;
      seen[k] = true;
      return true;
    }).sort();
  }
  function cleanSettings(s) {
    var out = {};
    Object.keys(DEFAULT_SETTINGS).forEach(function (k) { out[k] = DEFAULT_SETTINGS[k]; });
    if (!s || typeof s !== 'object') return out;
    if (typeof s.name === 'string') out.name = s.name.slice(0, 20);
    if (s.kind === '개' || s.kind === '고양이') out.kind = s.kind;
    if (typeof s.age === 'number' && s.age >= 0 && s.age <= 30) out.age = Math.floor(s.age);
    if (typeof s.alertDays === 'number' && s.alertDays >= 2 && s.alertDays <= 7) out.alertDays = Math.floor(s.alertDays);
    if (FONT[s.font]) out.font = s.font;
    return out;
  }
  // 저장소 상태: ok / none(읽기·쓰기 불가) / broken(저장된 글이 깨짐) / fail(마지막 저장 실패)
  var storeStatus = 'ok';
  function canWrite() {
    try {
      var probe = STORE_KEY + '.probe';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return true;
    } catch (e) {
      return false;
    }
  }
  function load() {
    var empty = { entries: {}, visits: [], next: '', settings: cleanSettings(null) };
    var raw;
    try {
      raw = localStorage.getItem(STORE_KEY);
    } catch (e) {
      storeStatus = 'none';
      return empty;
    }
    if (!canWrite()) storeStatus = 'none';
    if (!raw) return empty;
    try {
      var data = JSON.parse(raw);
      if (data && data.entries && typeof data.entries === 'object') {
        return {
          entries: clean(data.entries),
          visits: cleanVisits(data.visits),
          next: validKey(data.next) ? data.next : '',
          settings: cleanSettings(data.settings)
        };
      }
    } catch (e) { /* 아래에서 깨진 기록으로 다룬다 */ }
    // 깨진 기록은 다음 저장에 덮이지 않게 따로 남겨 둔다
    try { localStorage.setItem(STORE_KEY + '.broken', raw); } catch (e) { /* 남기지 못해도 빈 기록으로 시작 */ }
    if (storeStatus === 'ok') storeStatus = 'broken';
    return empty;
  }
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        entries: entries, visits: visits, next: nextVisit, settings: settings
      }));
      if (storeStatus === 'fail' || storeStatus === 'none') storeStatus = 'ok';
      renderStoreWarn();
      return true;
    } catch (e) {
      if (storeStatus !== 'none') storeStatus = 'fail';
      renderStoreWarn();
      return false;
    }
  }
  var SAVE_FAIL = ' 다만 브라우저에 저장하지 못해 창을 닫으면 사라져요.';
  var STORE_WARN = {
    none: '이 브라우저에서는 기록을 저장할 수 없어요(시크릿 창이거나 저장 기능이 꺼져 있어요). 지금 쓴 칸은 창을 닫으면 사라지니 백업 글로 옮겨 두세요.',
    broken: '저장된 기록을 읽지 못해 빈 기록으로 열었어요. 예전 기록은 지우지 않고 따로 남겨 두었어요. 백업 글이 있으면 복원으로 되살려 주세요.',
    fail: '방금 기록을 저장하지 못했어요(저장 공간이 꽉 찼거나 막혀 있어요). 창을 닫기 전에 백업 글로 옮겨 두세요.'
  };
  function renderStoreWarn() {
    var box = $('storeWarn');
    if (!box) return;
    var text = STORE_WARN[storeStatus];
    box.hidden = !text;
    if (text) $('storeWarnText').textContent = text;
  }

  var loaded = load();
  var entries = loaded.entries;
  var visits = loaded.visits;
  var nextVisit = loaded.next;
  var settings = loaded.settings;
  var now = partsOf(todayKey());
  var state = {
    view: 'write',
    editDate: todayKey(),
    color: -1,
    year: now.y,
    month: now.m,
    picked: null,
    visitEdit: null
  };

  function monthKey() { return state.year + '-' + pad(state.month + 1); }
  function monthLabel() { return state.year + '년 ' + (state.month + 1) + '월'; }
  function monthEntries() {
    var mk = monthKey();
    return Object.keys(entries).filter(function (k) { return k.slice(0, 7) === mk; }).sort();
  }
  function petName() { return settings.name || (settings.kind === '고양이' ? '우리 고양이' : '우리 개'); }

  // ---- 확인 겹침 ----
  var pendingConfirm = null, confirmReturn = null;
  function askConfirm(text, yesLabel, fn) {
    pendingConfirm = fn;
    confirmReturn = document.activeElement;
    $('confirmText').textContent = text;
    $('confirmYes').textContent = yesLabel;
    $('ov-confirm').hidden = false;
    $('confirmNo').focus();
  }
  function closeConfirm(run) {
    var fn = pendingConfirm;
    pendingConfirm = null;
    $('ov-confirm').hidden = true;
    if (confirmReturn && confirmReturn.focus) confirmReturn.focus();
    confirmReturn = null;
    if (run && fn) fn();
  }

  // ---- 시트 ----
  var openSheetId = null, sheetReturn = null;
  function openSheet(id) {
    if (openSheetId) closeSheet();
    stopPlay(false);
    sheetReturn = document.activeElement;
    openSheetId = id;
    if (id === 'sheet-visit') renderVisits();
    if (id === 'sheet-symptom') { msg('symptomMsg', ''); renderExamples(); }
    if (id === 'sheet-backup') { $('exportText').value = exportText(); msg('backupMsg', ''); }
    $(id).hidden = false;
    var close = $(id).querySelector('.sheetClose');
    if (close) close.focus();
  }
  function closeSheet() {
    if (!openSheetId) return;
    $(openSheetId).hidden = true;
    openSheetId = null;
    if (sheetReturn && sheetReturn.focus) sheetReturn.focus();
    sheetReturn = null;
    renderCurrent();
  }

  // ---- 쓰기 ----
  function buildColors() {
    var box = $('colors');
    COLORS.forEach(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.style.setProperty('--c', c.hex);
      b.setAttribute('aria-pressed', 'false');
      var dot = document.createElement('span');
      dot.className = 'dot';
      var name = document.createElement('span');
      name.textContent = c.name;
      b.appendChild(dot);
      b.appendChild(name);
      b.addEventListener('click', function () {
        state.color = i;
        renderColors();
        msg('writeMsg', '');
      });
      box.appendChild(b);
    });
  }
  function renderColors() {
    var bs = $('colors').children;
    for (var i = 0; i < bs.length; i++) {
      var on = i === state.color;
      bs[i].classList.toggle('on', on);
      bs[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  function buildWeek() {
    var box = $('week');
    for (var i = 0; i < 7; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'wday';
      var w = document.createElement('span');
      var d = document.createElement('b');
      b.appendChild(w);
      b.appendChild(d);
      b.addEventListener('click', onWeekDay);
      box.appendChild(b);
    }
  }
  function onWeekDay(ev) {
    var k = ev.currentTarget.getAttribute('data-key');
    if (k) openEditor(k);
  }
  function renderWeek() {
    var bs = $('week').children;
    var first = addDays(todayKey(), -6);
    for (var i = 0; i < bs.length; i++) {
      var k = addDays(first, i), d = parseKey(k), e = entries[k], b = bs[i];
      b.setAttribute('data-key', k);
      b.children[0].textContent = WEEK[d.getDay()];
      b.children[1].textContent = d.getDate();
      b.style.background = e ? COLORS[e.c].hex : '';
      b.classList.toggle('sel', k === state.editDate);
      b.setAttribute('aria-label', labelOf(k) + (e ? ' · ' + COLORS[e.c].name : ' · 빈 칸'));
    }
  }

  // 오늘(오늘 칸이 비었으면 어제)부터 거꾸로 빈 날이 나올 때까지 센다. 월말·해 넘김은 addDays 가 맞춘다
  // 날마다 entries 로 다시 세므로, 빠뜨린 날을 나중에 채우면 그 앞 기록과 다시 이어진다
  function runStart() {
    var k = todayKey();
    return entries[k] ? k : addDays(k, -1);
  }
  function filledRun() {
    var k = runStart(), n = 0;
    while (entries[k] && n < 100000) {
      n++;
      k = addDays(k, -1);
    }
    return n;
  }
  // 연속이 끊긴 빈 날. 그 앞날이 채워져 있어 이 하루만 채우면 다시 이어질 때만 돌려준다
  function runGap() {
    var gap = addDays(runStart(), -filledRun());
    return entries[addDays(gap, -1)] ? gap : '';
  }
  function filledRunText() {
    var total = Object.keys(entries).length;
    if (!total) return '아직 채운 칸이 없어요. 오늘 첫 칸을 채워 보세요.';
    var n = filledRun(), gap = runGap();
    var head = n ? '연속 ' + n + '일째 기록 중' : '오늘과 어제 칸이 비어 연속 기록이 멈췄어요';
    var tail = gap ? ' · ' + labelOf(gap) + '을 채우면 앞 기록과 다시 이어져요' : '';
    return head + ' · 지금까지 ' + total + '칸' + tail;
  }
  // 오늘(오늘 칸이 비었으면 어제)부터 거꾸로 이어진 나쁜 날 수
  function badRun() {
    var k = todayKey();
    if (!entries[k]) k = addDays(k, -1);
    var n = 0;
    while (entries[k] && entries[k].c >= BAD && n < 100000) {
      n++;
      k = addDays(k, -1);
    }
    return n;
  }
  function renderAlert() {
    var n = badRun(), box = $('alertBox');
    if (n >= settings.alertDays) {
      $('alertText').textContent = '처짐·아픔이 ' + n + '일째 이어지고 있어요. 진료 요약을 만들어 병원에 문의해 보세요.';
      box.hidden = false;
    } else {
      box.hidden = true;
    }
  }

  // ---- 핵심 흐름: 채운 칸이 달력·나쁜 날·진료 요약에 어떻게 쌓였는지 ----
  function monthStats(mk) {
    var ks = Object.keys(entries).filter(function (k) { return k.slice(0, 7) === mk; }).sort();
    var counts = COLORS.map(function () { return 0; });
    ks.forEach(function (k) { counts[entries[k].c]++; });
    var bad = ks.filter(function (k) { return entries[k].c >= BAD; }).length;
    return { keys: ks, counts: counts, bad: bad };
  }
  function fillBar(bar, counts) {
    bar.innerHTML = '';
    counts.forEach(function (n, j) {
      if (!n) return;
      var s = document.createElement('span');
      s.style.flexGrow = String(n);
      s.style.background = COLORS[j].hex;
      s.title = COLORS[j].name + ' ' + n;
      bar.appendChild(s);
    });
  }
  function renderResult() {
    var k = state.editDate, e = entries[k], box = $('flowResult');
    if (!e) { box.hidden = true; return; }
    var st = monthStats(k.slice(0, 7)), run = badRun(), r = vetRange();
    var inRange = Object.keys(entries).filter(function (x) { return x >= r.from && x <= r.to; }).length;
    $('resultHead').textContent = labelOf(k) + ' · ' + COLORS[e.c].name + ' 칸이 달력에 들어갔어요.';
    $('resultText').textContent = [
      (parseKey(k).getMonth() + 1) + '월 ' + st.keys.length + '칸 · 나쁜 날 ' + st.bad + '일',
      run ? '오늘까지 나쁜 날 ' + run + '일째 (알림 기준 ' + settings.alertDays + '일)' : '오늘까지 이어지는 나쁜 날 없음',
      (r.hasVisit ? '지난 진료 뒤 ' : '최근 30일 중 ') + inRange + '일이 진료 요약에 모였어요'
    ].join(' · ');
    fillBar($('resultBar'), st.counts);
    box.hidden = false;
  }
  function goMonthOf(k, view) {
    var d = parseKey(k);
    state.year = d.getFullYear();
    state.month = d.getMonth();
    state.picked = k;
    setView(view);
  }

  function renderWrite() {
    var k = state.editDate, e = entries[k], isToday = k === todayKey();
    $('writeDate').textContent = (isToday ? '오늘 · ' : '') + labelOf(k);
    $('todayBtn').hidden = isToday;
    $('clearBtn').hidden = !e;
    $('saveBtn').textContent = e ? '고쳐 저장' : '칸 채우기';
    renderCount();
    $('runDays').textContent = filledRunText();
    // 기록이 하나도 없으면 무엇을 하면 되는지 첫 실행 안내를 띄운다
    $('firstRun').hidden = Object.keys(entries).length > 0;
    renderAlert();
    renderResult();
    renderColors();
    renderWeek();
  }

  // 한 날의 칸을 비우기 전에 확인 겹침으로 한 번 더 묻는다 (쓰기·달력에서 함께 쓴다)
  function askClearEntry(k, msgId) {
    if (!entries[k]) return;
    askConfirm(labelOf(k) + ' 칸을 비울까요? 그날의 컨디션과 한 줄 메모가 지워져요.', '비우기', function () {
      delete entries[k];
      var ok = save();
      if (state.editDate === k) openEditor(k);
      renderCurrent();
      msg(msgId, labelOf(k) + ' 칸을 비웠어요.' + (ok ? '' : SAVE_FAIL));
    });
  }
  function editDay(k) {
    if (!k || k > todayKey()) return;
    openEditor(k);
    setView('write');
    msg('writeMsg', labelOf(k) + ' 기록을 고쳐요. 색이나 한 줄을 바꾸고 고쳐 저장을 눌러 주세요.');
  }

  function openEditor(k) {
    if (k > todayKey()) k = todayKey();
    state.editDate = k;
    var e = entries[k];
    state.color = e ? e.c : -1;
    $('lineInput').value = e ? e.t : '';
    markOk(['lineInput']);
    msg('writeMsg', '');
    renderWrite();
  }
  // 글자 수를 보이고, 60자를 다 쓰면 더 적을 수 없다고 알린다
  function renderCount() {
    var n = $('lineInput').value.length, c = $('count');
    c.textContent = n + ' / ' + MAX + (n >= MAX ? ' · 더 적을 수 없어요' : '');
    c.classList.toggle('full', n >= MAX);
  }

  // ---- 증상 고르기 ----
  function buildSymptoms() {
    var box = $('symptomList');
    DATA.SYMPTOMS.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = s;
      b.addEventListener('click', function () { addSymptom(s); });
      box.appendChild(b);
    });
  }
  function addSymptom(s) {
    var input = $('lineInput'), cur = input.value.trim();
    var next = cur ? cur + ', ' + s : s;
    if (next.length > MAX) {
      msg('symptomMsg', '60자를 넘어 붙이지 못했어요: "' + s + '". 한 줄을 줄인 뒤 다시 눌러 주세요.');
      return;
    }
    input.value = next;
    input.removeAttribute('aria-invalid');
    renderCount();
    msg('symptomMsg', '붙였어요: "' + s + '" (' + next.length + ' / ' + MAX + ')');
  }

  // ---- 한 줄 예시: 고른 컨디션의 예시 10개(안 골랐으면 50개 모두) ----
  function renderExamples() {
    var box = $('exampleList'), c = state.color;
    box.innerHTML = '';
    $('exampleNote').textContent = c >= 0
      ? COLORS[c].name + ' 날의 예시예요. 누르면 한 줄 메모가 이 글로 바뀌어요.'
      : '아직 컨디션을 고르지 않아 다섯 단계 예시를 모두 보여 드려요. 누르면 그 컨디션과 한 줄이 함께 들어가요.';
    DATA.EXAMPLES.forEach(function (ex) {
      if (c >= 0 && ex.c !== c) return;
      if (!COLORS[ex.c] || ex.t.length > MAX) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip example';
      var dot = document.createElement('i');
      dot.style.background = COLORS[ex.c].hex;
      b.appendChild(dot);
      b.appendChild(document.createTextNode(ex.t));
      b.setAttribute('aria-label', COLORS[ex.c].name + ' 예시: ' + ex.t);
      b.addEventListener('click', function () { useExample(ex); });
      box.appendChild(b);
    });
  }
  function useExample(ex) {
    var input = $('lineInput');
    input.value = ex.t;
    input.removeAttribute('aria-invalid');
    var picked = state.color < 0;
    if (picked) { state.color = ex.c; renderColors(); }
    renderCount();
    msg('symptomMsg', '한 줄을 바꿨어요: "' + ex.t + '".' + (picked ? ' 컨디션도 ' + COLORS[ex.c].name + ' 칸으로 골랐어요.' : '') +
      ' 창을 닫고 칸 채우기를 눌러 주세요.');
  }

  // ---- 달력 ----
  function buildGrid() {
    var g = $('grid');
    for (var i = 0; i < 42; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cell off';
      b.addEventListener('click', onCell);
      g.appendChild(b);
    }
  }
  function onCell(ev) {
    var k = ev.currentTarget.getAttribute('data-key');
    if (!k) return;
    state.picked = k;
    msg('calMsg', '');
    renderCalendar();
  }
  function renderCalendar() {
    $('monthTitle').textContent = monthLabel();
    var start = localDate(state.year, state.month, 1).getDay();
    var days = daysInMonth(state.year, state.month);
    var rows = Math.ceil((start + days) / 7);
    var tk = todayKey();
    var cells = $('grid').children;
    for (var i = 0; i < cells.length; i++) {
      var b = cells[i], day = i - start + 1;
      b.className = 'cell';
      b.style.background = '';
      b.textContent = '';
      if (i >= rows * 7) {
        b.classList.add('gone');
        b.removeAttribute('data-key');
        b.tabIndex = -1;
        continue;
      }
      if (day < 1 || day > days) {
        b.classList.add('off');
        b.removeAttribute('data-key');
        b.setAttribute('aria-hidden', 'true');
        b.tabIndex = -1;
        continue;
      }
      var k = keyFrom(state.year, state.month, day), e = entries[k];
      b.setAttribute('data-key', k);
      b.removeAttribute('aria-hidden');
      b.tabIndex = 0;
      b.textContent = day;
      if (e) { b.style.background = COLORS[e.c].hex; b.classList.add('filled'); }
      if (k > tk) b.classList.add('future');
      if (k === tk) b.classList.add('today');
      if (k === state.picked) b.classList.add('sel');
      if (visits.indexOf(k) >= 0) b.classList.add('visit');
      b.setAttribute('aria-label', labelOf(k) + (e ? ' · ' + COLORS[e.c].name : '') +
        (visits.indexOf(k) >= 0 ? ' · 진료' : ''));
    }
    renderDetail();
    renderStats();
  }
  function renderDetail() {
    var k = state.picked, btn = $('detailBtn'), clr = $('detailClearBtn');
    clr.hidden = true;
    if (!k || k.slice(0, 7) !== monthKey()) {
      $('detailText').textContent = '날짜를 누르면 그날의 기록이 보여요.';
      btn.hidden = true;
      return;
    }
    if (k > todayKey()) {
      $('detailText').textContent = labelOf(k) + ' — 아직 오지 않은 날이에요.';
      btn.hidden = true;
      return;
    }
    var e = entries[k];
    $('detailText').textContent = e
      ? labelOf(k) + ' · ' + COLORS[e.c].name + ' — ' + e.t
      : labelOf(k) + ' — 빈 칸';
    btn.textContent = e ? '이날 고치기' : '이날 채우기';
    btn.hidden = false;
    clr.hidden = !e;
  }
  function renderStats() {
    var st = monthStats(monthKey()), ks = st.keys, counts = st.counts;
    var best = 0;
    for (var i = 1; i < counts.length; i++) if (counts[i] > counts[best]) best = i;
    $('statsText').textContent = ks.length
      ? '이 달 ' + ks.length + '칸 채움 · 나쁜 날(처짐·아픔) ' + st.bad + '일 · 가장 많은 컨디션: ' + COLORS[best].name
      : '이 달에는 아직 채운 칸이 없어요. 오늘이나 지난 날짜를 누르고 이날 채우기로 첫 칸을 남겨 보세요.';
    var legend = $('legend');
    fillBar($('bar'), counts);
    legend.innerHTML = '';
    counts.forEach(function (n, j) {
      var item = document.createElement('span');
      var dot = document.createElement('i');
      dot.style.background = COLORS[j].hex;
      item.appendChild(dot);
      item.appendChild(document.createTextNode(COLORS[j].name + ' ' + n));
      legend.appendChild(item);
    });
  }

  function shiftMonth(delta, msgId) {
    var to = addMonths(state.year, state.month, delta), y = to.year, m = to.month;
    var n = partsOf(todayKey());
    if (y > n.y || (y === n.y && m > n.m)) {
      msg(msgId, '이번 달 다음으로는 아직 넘어갈 수 없어요.');
      return;
    }
    if (y < 2000) return;
    state.year = y;
    state.month = m;
    state.picked = null;
    msg(msgId, '');
    stopPlay(false);
    renderCurrent();
  }

  // ---- 모아보기 ----
  var timer = null, playIdx = 0, playKeys = [];

  function setStage(bg, date, text, count) {
    $('stage').style.backgroundColor = bg;
    $('stageDate').textContent = date;
    $('stageText').textContent = text;
    $('stageCount').textContent = count;
  }
  function idleStage() {
    var n = monthEntries().length;
    setStage('', monthLabel(), n
      ? '돌려보기를 누르면 이 달의 ' + n + '칸이 하루씩 지나가요.'
      : '이 달에는 아직 채운 칸이 없어요.', '');
  }
  // 지금 무대에 나온 날을 아래 목록에서도 표시한다 (k 가 비면 표시를 거둔다)
  function markRow(k) {
    var rows = $('list').children;
    for (var i = 0; i < rows.length; i++) {
      var on = !!k && rows[i].getAttribute('data-key') === k;
      rows[i].classList.toggle('now', on);
      if (on) rows[i].setAttribute('aria-current', 'true');
      else rows[i].removeAttribute('aria-current');
    }
  }
  function showFrame() {
    // 돌려보는 중에 비운 칸은 건너뛴다
    while (playIdx < playKeys.length && !entries[playKeys[playIdx]]) playIdx++;
    if (playIdx >= playKeys.length) { stopPlay(true); return; }
    var k = playKeys[playIdx], e = entries[k];
    var st = $('stage');
    st.classList.remove('pop');
    void st.offsetWidth;
    st.classList.add('pop');
    setStage(COLORS[e.c].hex, labelOf(k) + ' · ' + COLORS[e.c].name, e.t, (playIdx + 1) + ' / ' + playKeys.length);
    markRow(k);
  }
  function startPlay() {
    stopPlay(false);
    playKeys = monthEntries();
    if (!playKeys.length) {
      msg('reviewMsg', '이 달에는 돌려볼 칸이 없어요. 쓰기에서 먼저 칸을 채워 주세요.');
      return;
    }
    msg('reviewMsg', '');
    playIdx = 0;
    showFrame();
    $('playBtn').textContent = '처음부터';
    timer = setInterval(function () {
      playIdx++;
      if (playIdx >= playKeys.length) {
        stopPlay(true);
        return;
      }
      showFrame();
    }, 1800);
  }
  function stopPlay(done) {
    if (timer) { clearInterval(timer); timer = null; }
    $('playBtn').textContent = '돌려보기';
    markRow('');
    if (done) {
      setStage('', monthLabel(), '다 봤어요. 이 달에 ' + playKeys.length + '칸을 채웠어요.', '');
    }
  }

  function renderReview() {
    $('reviewTitle').textContent = monthLabel();
    var list = $('list');
    list.innerHTML = '';
    var ks = monthEntries();
    if (!ks.length) {
      var li = document.createElement('li');
      li.className = 'empty';
      li.textContent = '이 달에 남긴 기록이 아직 없어요. 쓰기에서 컨디션 색을 고르고 칸 채우기를 누르면 여기에 날짜순으로 쌓여요.';
      list.appendChild(li);
    }
    ks.forEach(function (k) {
      var e = entries[k];
      var row = document.createElement('li');
      row.setAttribute('data-key', k);
      var dot = document.createElement('i');
      dot.style.background = COLORS[e.c].hex;
      var date = document.createElement('span');
      date.textContent = labelOf(k).replace(/^\d+월 /, '');
      var text = document.createElement('p');
      text.textContent = e.t;
      var edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'ghost small';
      edit.textContent = '고치기';
      edit.setAttribute('aria-label', labelOf(k) + ' 고치기');
      edit.addEventListener('click', function () { editDay(k); });
      row.appendChild(dot);
      row.appendChild(date);
      row.appendChild(text);
      row.appendChild(edit);
      list.appendChild(row);
    });
    if (!timer) idleStage();
  }

  // ---- 진료 ----
  function lastVisit() {
    var tk = todayKey(), past = visits.filter(function (k) { return k <= tk; });
    return past.length ? past[past.length - 1] : '';
  }
  function vetRange() {
    var to = todayKey(), from = lastVisit();
    return { from: from || addDays(to, -29), to: to, hasVisit: !!from };
  }
  function vetSummaryText(r) {
    var ks = Object.keys(entries).filter(function (k) { return k >= r.from && k <= r.to; }).sort();
    var total = daysBetween(r.from, r.to) + 1;
    var who = petName() + ' (' + settings.kind + (settings.age !== '' ? ', ' + settings.age + '살' : '') + ')';
    var lines = [who + ' 컨디션 기록'];
    lines.push('기간: ' + r.from + ' ~ ' + r.to + ' (' + total + '일 중 ' + ks.length + '일 기록)' +
      (r.hasVisit ? '' : ' — 진료 날짜가 없어 최근 30일'));
    if (!ks.length) {
      lines.push('이 기간에 남긴 기록이 없어요.');
      lines.push('쓰기 화면에서 매일 컨디션 색과 한 줄을 남기면 여기에 진료용 요약이 모여요. 설정의 예시 넣기로 미리 볼 수 있어요.');
      return lines.join('\n');
    }
    var counts = COLORS.map(function () { return 0; });
    ks.forEach(function (k) { counts[entries[k].c]++; });
    lines.push(COLORS.map(function (c, i) { return c.name + ' ' + counts[i] + '일'; }).join(' · '));

    var bad = ks.filter(function (k) { return entries[k].c >= BAD; });
    var longest = 0, run = 0, prev = '';
    bad.forEach(function (k) {
      run = prev && daysBetween(prev, k) === 1 ? run + 1 : 1;
      if (run > longest) longest = run;
      prev = k;
    });
    lines.push('');
    lines.push('나쁜 날(처짐·아픔) ' + bad.length + '일' + (bad.length ? ', 가장 길게 ' + longest + '일 이어짐' : ''));
    bad.forEach(function (k) {
      lines.push('- ' + labelOf(k) + ' ' + COLORS[entries[k].c].name + ' — ' + entries[k].t);
    });

    var freq = DATA.SYMPTOMS.map(function (s) {
      var n = 0;
      ks.forEach(function (k) { if (entries[k].t.indexOf(s) >= 0) n++; });
      return { s: s, n: n };
    }).filter(function (x) { return x.n > 0 && x.s !== '평소와 같음'; })
      .sort(function (a, b) { return b.n - a.n; }).slice(0, 5);
    lines.push('');
    lines.push('자주 적은 증상: ' + (freq.length
      ? freq.map(function (x) { return x.s + ' ' + x.n + '번'; }).join(', ')
      : '증상 목록에 있는 말을 적은 날이 없어요'));
    lines.push('');
    lines.push('※ 진단이 아니라 보호자가 매일 남긴 기록입니다.');
    return lines.join('\n');
  }
  function renderVet() {
    var r = vetRange();
    $('vetRange').textContent = r.hasVisit
      ? '지난 진료 ' + labelOf(r.from) + '부터 오늘까지 ' + (daysBetween(r.from, r.to) + 1) + '일'
      : '진료 날짜가 아직 없어서 최근 30일을 모았어요. 진료 날짜에서 병원 다녀온 날을 넣어 주세요.';
    var tk = todayKey();
    if (nextVisit && nextVisit >= tk) {
      var d = daysBetween(tk, nextVisit);
      $('vetNext').textContent = '다음 진료 ' + labelOf(nextVisit) + (d ? ' · ' + d + '일 남음' : ' · 오늘');
    } else {
      $('vetNext').textContent = '다음 진료 예정일이 아직 없어요.';
    }
    $('vetSummary').value = vetSummaryText(r) + questionText();
  }

  // ---- 진료 때 물어볼 것: 고른 질문은 요약 글 끝에 붙는다 (이 창을 연 동안만 기억) ----
  var pickedQuestions = [];
  function buildQuestions() {
    var box = $('vetQuestions');
    DATA.VET_QUESTIONS.forEach(function (q, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip question';
      b.textContent = q;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { toggleQuestion(i, b); });
      box.appendChild(b);
    });
    $('vetSource').textContent = DATA.SOURCE || '';
  }
  function toggleQuestion(i, b) {
    var at = pickedQuestions.indexOf(i);
    if (at >= 0) pickedQuestions.splice(at, 1);
    else pickedQuestions.push(i);
    var on = at < 0;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    renderVet();
    msg('vetMsg', (on ? '물어볼 것에 넣었어요' : '물어볼 것에서 뺐어요') + ' · 고른 질문 ' + pickedQuestions.length + '개');
  }
  function questionText() {
    if (!pickedQuestions.length) return '';
    var lines = ['', '', '물어볼 것'];
    pickedQuestions.slice().sort(function (a, b) { return a - b; }).forEach(function (i, n) {
      lines.push((n + 1) + '. ' + DATA.VET_QUESTIONS[i]);
    });
    return lines.join('\n');
  }

  // ---- 방법: 컨디션 단계 뜻과 도움말 글 ----
  function buildHelp() {
    var cond = $('helpConditions'), tips = $('helpTips');
    COLORS.forEach(function (c) {
      if (!c.desc) return;
      var li = document.createElement('li');
      var dot = document.createElement('i');
      dot.style.background = c.hex;
      var b = document.createElement('b');
      b.textContent = c.name;
      li.appendChild(dot);
      li.appendChild(b);
      li.appendChild(document.createTextNode(' — ' + c.desc));
      cond.appendChild(li);
    });
    DATA.HELP_TIPS.forEach(function (t) {
      var li = document.createElement('li');
      li.textContent = t;
      tips.appendChild(li);
    });
  }

  function renderVisits() {
    var list = $('visitList');
    list.innerHTML = '';
    if (!visits.length) {
      var li = document.createElement('li');
      li.className = 'empty';
      li.textContent = '아직 넣은 진료 날짜가 없어요.';
      list.appendChild(li);
    }
    visits.slice().reverse().forEach(function (k) {
      var row = document.createElement('li');
      var date = document.createElement('span');
      date.textContent = k.slice(0, 4) + '년 ' + labelOf(k);
      var edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'ghost small';
      edit.textContent = '고치기';
      edit.setAttribute('aria-label', labelOf(k) + ' 고치기');
      edit.addEventListener('click', function () { startVisitEdit(k); });
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'ghost small';
      del.textContent = '지우기';
      del.setAttribute('aria-label', labelOf(k) + ' 지우기');
      del.addEventListener('click', function () {
        askConfirm(labelOf(k) + ' 진료 날짜를 지울까요?', '지우기', function () {
          visits = visits.filter(function (v) { return v !== k; });
          if (state.visitEdit === k) stopVisitEdit();
          var ok = save();
          renderVisits();
          msg('visitMsg', '지웠어요.' + (ok ? '' : SAVE_FAIL));
        });
      });
      row.appendChild(date);
      row.appendChild(edit);
      row.appendChild(del);
      list.appendChild(row);
    });
    if (nextVisit) {
      var nx = document.createElement('li');
      var t = document.createElement('span');
      t.textContent = '다음 진료 예정 ' + nextVisit.slice(0, 4) + '년 ' + labelOf(nextVisit);
      var nxEdit = document.createElement('button');
      nxEdit.type = 'button';
      nxEdit.className = 'ghost small';
      nxEdit.textContent = '고치기';
      nxEdit.setAttribute('aria-label', '다음 진료 예정일 고치기');
      nxEdit.addEventListener('click', function () {
        stopVisitEdit();
        $('visitDate').value = nextVisit;
        $('visitKind').value = 'next';
        msg('visitMsg', '다음 진료 예정일을 고쳐요. 날짜를 바꾸고 추가를 누르면 바뀌어요.');
        $('visitDate').focus();
      });
      var clr = document.createElement('button');
      clr.type = 'button';
      clr.className = 'ghost small';
      clr.textContent = '지우기';
      clr.setAttribute('aria-label', '다음 진료 예정일 지우기');
      clr.addEventListener('click', function () {
        askConfirm('다음 진료 예정일을 지울까요?', '지우기', function () {
          nextVisit = '';
          var ok = save();
          renderVisits();
          msg('visitMsg', '예정일을 지웠어요.' + (ok ? '' : SAVE_FAIL));
        });
      });
      nx.className = 'next';
      nx.appendChild(t);
      nx.appendChild(nxEdit);
      nx.appendChild(clr);
      list.appendChild(nx);
    }
  }
  function startVisitEdit(k) {
    state.visitEdit = k;
    $('visitDate').value = k;
    $('visitKind').value = 'done';
    $('visitSave').textContent = '고쳐 저장';
    $('visitCancel').hidden = false;
    msg('visitMsg', labelOf(k) + ' 진료 날짜를 고쳐요. 날짜를 바꾸고 고쳐 저장을 눌러 주세요.');
  }
  function stopVisitEdit() {
    state.visitEdit = null;
    $('visitSave').textContent = '추가';
    $('visitCancel').hidden = true;
  }
  function submitVisit() {
    var input = $('visitDate'), k = input.value, kind = $('visitKind').value, tk = todayKey();
    markOk(['visitDate']);
    if (input.validity && input.validity.badInput) { markBad('visitDate', 'visitMsg', '날짜가 덜 입력됐어요. 연·월·일을 모두 골라 주세요.'); return; }
    if (!k) { markBad('visitDate', 'visitMsg', '날짜가 비어 있어요. 날짜를 골라 주세요.'); return; }
    if (!validKey(k)) { markBad('visitDate', 'visitMsg', '"' + k + '"은 없는 날짜예요. 2026-10-01처럼 골라 주세요.'); return; }
    if (k < '2000-01-01') { markBad('visitDate', 'visitMsg', '2000년 이후 날짜만 넣을 수 있어요.'); return; }
    if (kind === 'next') {
      if (state.visitEdit) {
        msg('visitMsg', '병원 다녀온 날을 고치는 중이에요. 병원 다녀온 날로 그대로 두거나, 고치기 취소를 누른 뒤 예정일을 넣어 주세요.');
        return;
      }
      if (k < tk) { markBad('visitDate', 'visitMsg', '다음 진료 예정일은 오늘이나 그 뒤로 골라 주세요.'); return; }
      if (daysBetween(tk, k) > NEXT_MAX_DAYS) { markBad('visitDate', 'visitMsg', '다음 진료 예정일은 오늘부터 1년 안으로 골라 주세요.'); return; }
      nextVisit = k;
      stopVisitEdit();
      var ok1 = save();
      renderVisits();
      msg('visitMsg', '다음 진료 예정일을 ' + labelOf(k) + '로 넣었어요.' + (ok1 ? '' : SAVE_FAIL));
      return;
    }
    if (k > tk) { markBad('visitDate', 'visitMsg', '병원 다녀온 날은 오늘이나 그 전이어야 해요. 앞으로 갈 날은 다음 진료 예정일로 넣어 주세요.'); return; }
    var list = visits.filter(function (v) { return v !== state.visitEdit; });
    if (list.indexOf(k) >= 0) { markBad('visitDate', 'visitMsg', labelOf(k) + '은 이미 넣은 날이에요.'); return; }
    list.push(k);
    visits = list.sort();
    var was = state.visitEdit;
    stopVisitEdit();
    var ok = save();
    renderVisits();
    msg('visitMsg', (was ? '고쳤어요: ' : '넣었어요: ') + labelOf(k) + (ok ? '' : SAVE_FAIL));
  }

  // ---- 내보내기·가져오기 ----
  // 글 형식: 첫 줄 머리말, 설정 다섯 줄, 하루 칸(예시 칸은 앞에 "예시 "), 진료 날짜, 다음 진료.
  var EXPORT_HEAD = '하루 한 칸 기록';
  function settingsChanged() {
    return Object.keys(DEFAULT_SETTINGS).some(function (k) { return settings[k] !== DEFAULT_SETTINGS[k]; });
  }
  function exportText() {
    var ks = Object.keys(entries).sort();
    if (!ks.length && !visits.length && !nextVisit && !settingsChanged()) return '';
    var lines = [
      EXPORT_HEAD,
      '이름 ' + settings.name,
      '종류 ' + settings.kind,
      '나이 ' + (settings.age === '' ? '' : settings.age),
      '알림 ' + settings.alertDays + '일',
      '글자 ' + settings.font
    ].map(function (l) { return l.trim(); });
    ks.forEach(function (k) {
      var e = entries[k];
      lines.push((e.s ? '예시 ' : '') + k + ' (' + WEEK[parseKey(k).getDay()] + ') [' + COLORS[e.c].name + '] ' + e.t);
    });
    visits.forEach(function (k) { lines.push('진료 ' + k); });
    if (nextVisit) lines.push('다음 진료 ' + nextVisit);
    return lines.join('\n');
  }
  function parseRestore(text) {
    var out = { entries: {}, visits: [], next: '', settings: null };
    var lines = text.split(/\r?\n/), count = 0, headSeen = false, set = {};
    function fail(i, why) { return { error: (i + 1) + '번째 줄: ' + why }; }
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim(), m;
      if (!line) continue;
      if (!headSeen) {
        if (line !== EXPORT_HEAD) return { error: '첫 줄이 "' + EXPORT_HEAD + '"가 아니에요. 이 앱에서 복사한 백업 글을 처음부터 끝까지 그대로 붙여 넣어 주세요.' };
        headSeen = true;
        continue;
      }
      m = /^(예시 )?(\d{4}-\d{2}-\d{2}) \(([일월화수목금토])\) \[([^\]]+)\] (.+)$/.exec(line);
      if (m) {
        var k = m[2], c = -1;
        COLORS.forEach(function (col, j) { if (col.name === m[4]) c = j; });
        if (!validKey(k)) return fail(i, '없는 날짜예요 (' + k + ').');
        if (WEEK[parseKey(k).getDay()] !== m[3]) return fail(i, k + '의 요일이 맞지 않아요 (적힌 요일: ' + m[3] + ').');
        if (c < 0) return fail(i, '"' + m[4] + '"은 컨디션 이름이 아니에요. ' + COLORS.map(function (x) { return x.name; }).join('·') + ' 중 하나여야 해요.');
        if (out.entries[k]) return fail(i, k + ' 칸이 두 번 들어 있어요.');
        if (m[5].length > MAX) return fail(i, '한 줄이 ' + MAX + '자를 넘어요 (' + m[5].length + '자).');
        out.entries[k] = { c: c, t: m[5] };
        if (m[1]) out.entries[k].s = 1;
        count++;
        continue;
      }
      m = /^진료 (\S+)$/.exec(line);
      if (m) {
        if (!validKey(m[1])) return fail(i, '진료 날짜 "' + m[1] + '"가 맞지 않아요. 2026-10-01처럼 적어 주세요.');
        if (out.visits.indexOf(m[1]) >= 0) return fail(i, '진료 날짜 ' + m[1] + '가 두 번 들어 있어요.');
        out.visits.push(m[1]);
        count++;
        continue;
      }
      m = /^다음 진료 (\S+)$/.exec(line);
      if (m) {
        if (!validKey(m[1])) return fail(i, '다음 진료 날짜 "' + m[1] + '"가 맞지 않아요.');
        if (out.next) return fail(i, '다음 진료 날짜가 두 번 들어 있어요.');
        out.next = m[1];
        count++;
        continue;
      }
      m = /^(이름|종류|나이|알림|글자)(?: (.*))?$/.exec(line);
      if (m) {
        var key = m[1], v = (m[2] || '').trim();
        if (set.hasOwnProperty(key)) return fail(i, key + ' 줄이 두 번 들어 있어요.');
        if (key === '이름') {
          if (v.length > 20) return fail(i, '이름은 20자까지예요.');
          set[key] = v;
        } else if (key === '종류') {
          if (v !== '개' && v !== '고양이') return fail(i, '종류는 개 또는 고양이여야 해요.');
          set[key] = v;
        } else if (key === '나이') {
          if (v !== '' && (!/^\d{1,2}$/.test(v) || +v > 30)) return fail(i, '나이는 0~30 사이 숫자여야 해요.');
          set[key] = v === '' ? '' : +v;
        } else if (key === '알림') {
          var a = /^([2-7])일$/.exec(v);
          if (!a) return fail(i, '알림 기준은 2일~7일이어야 해요.');
          set[key] = +a[1];
        } else {
          if (!FONT[v]) return fail(i, '글자 크기는 ' + Object.keys(FONT).join('·') + ' 중 하나여야 해요.');
          set[key] = v;
        }
        continue;
      }
      return fail(i, '읽을 수 없는 줄이에요: "' + line.slice(0, 20) + (line.length > 20 ? '…' : '') + '"');
    }
    if (!headSeen) return { error: '복원할 기록이 없어요. 백업 글을 그대로 붙여 넣어 주세요.' };
    var setKeys = Object.keys(set);
    if (!count && !setKeys.length) return { error: '첫 줄만 있고 복원할 칸·진료 날짜·설정이 없어요.' };
    if (setKeys.length) {
      // 빠진 설정 줄은 지금 설정을 그대로 둔다
      out.settings = cleanSettings({
        name: set.hasOwnProperty('이름') ? set['이름'] : settings.name,
        kind: set['종류'] || settings.kind,
        age: set.hasOwnProperty('나이') ? set['나이'] : settings.age,
        alertDays: set['알림'] || settings.alertDays,
        font: set['글자'] || settings.font
      });
    }
    out.visits.sort();
    out.count = count;
    return out;
  }
  function restore() {
    var text = $('restoreText').value;
    markOk(['restoreText']);
    if (!text.trim()) { markBad('restoreText', 'backupMsg', '붙여 넣은 글이 없어요. 백업 글을 이 칸에 붙여 넣어 주세요.'); return; }
    if (text.length > RESTORE_MAX) {
      markBad('restoreText', 'backupMsg', '붙여 넣은 글이 너무 길어요 (' + text.length + '자, ' + RESTORE_MAX + '자까지). 이 앱의 백업 글만 붙여 넣어 주세요.');
      return;
    }
    var r = parseRestore(text);
    if (r.error) { markBad('restoreText', 'backupMsg', '복원하지 못했어요. ' + r.error); return; }
    askConfirm('지금 기록을 모두 지우고 붙여 넣은 기록으로 바꿀까요? (칸 ' + Object.keys(r.entries).length + '개, 진료 날짜 ' +
      r.visits.length + '개' + (r.next ? ', 다음 진료 예정일' : '') + (r.settings ? ', 설정' : '') + ')', '바꾸기', function () {
      entries = r.entries;
      visits = r.visits;
      nextVisit = r.next;
      if (r.settings) { settings = r.settings; applyFont(); }
      stopVisitEdit();
      var ok = save();
      $('restoreText').value = '';
      $('exportText').value = exportText();
      openEditor(state.editDate);
      msg('backupMsg', '복원했어요: 칸 ' + Object.keys(r.entries).length + '개, 진료 날짜 ' + r.visits.length + '개' +
        (r.settings ? ', 설정' : '') + '.' + (ok ? '' : SAVE_FAIL));
    });
  }

  function copyText(text, msgId, ta) {
    var okText = '복사했어요. 메모장이나 문자에 붙여 넣으면 돼요.';
    var failText = '자동 복사가 안 돼요. 글 칸을 길게 눌러 직접 복사해 주세요.';
    function fallback() {
      try {
        ta.focus();
        ta.select();
        var ok = document.execCommand ? document.execCommand('copy') : false;
        msg(msgId, ok ? okText : failText);
      } catch (e) {
        msg(msgId, failText);
      }
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { msg(msgId, okText); }, fallback);
        return;
      }
    } catch (e) { /* 클립보드를 못 쓰면 아래로 */ }
    fallback();
  }

  // ---- 설정 ----
  function applyFont() {
    document.documentElement.style.fontSize = FONT[settings.font] || '100%';
  }
  function renderSettings() {
    $('petName').value = settings.name;
    $('petKind').value = settings.kind;
    $('petAge').value = settings.age === '' ? '' : String(settings.age);
    $('alertDays').value = String(settings.alertDays);
    $('fontSize').value = settings.font;
  }
  function submitSettings() {
    markOk(['petName', 'petAge', 'alertDays']);
    // 이름 안의 여러 칸 띄움은 한 칸으로 고쳐 저장한다
    var rawName = $('petName').value, name = rawName.trim().replace(/\s+/g, ' ');
    var ageEl = $('petAge'), daysEl = $('alertDays');
    var ageRaw = ageEl.value.trim(), daysRaw = daysEl.value.trim();
    if (name.length > 20) { markBad('petName', 'setMsg', '이름이 ' + name.length + '자예요. 20자까지 적어 주세요.'); return; }
    if (ageEl.validity && ageEl.validity.badInput) { markBad('petAge', 'setMsg', '나이에 숫자가 아닌 글이 있어요. 12처럼 숫자만 적어 주세요.'); return; }
    var age = '';
    if (ageRaw !== '') {
      age = Number(ageRaw);
      if (!isFinite(age) || Math.floor(age) !== age) { markBad('petAge', 'setMsg', '나이 "' + ageRaw + '"에 소수점이 있어요. 12처럼 살 수만 적어 주세요.'); return; }
      if (age < 0 || age > 30) { markBad('petAge', 'setMsg', '나이 ' + age + '살은 넣을 수 없어요. 0~30 사이로 적어 주세요.'); return; }
    }
    if (daysEl.validity && daysEl.validity.badInput) { markBad('alertDays', 'setMsg', '알림 기준에 숫자가 아닌 글이 있어요. 3처럼 숫자만 적어 주세요.'); return; }
    if (daysRaw === '') { markBad('alertDays', 'setMsg', '알림 기준이 비어 있어요. 2~7 사이 날수를 적어 주세요.'); return; }
    var days = Number(daysRaw);
    if (!isFinite(days) || Math.floor(days) !== days) { markBad('alertDays', 'setMsg', '알림 기준 "' + daysRaw + '"에 소수점이 있어요. 2~7 사이 날수를 적어 주세요.'); return; }
    if (days < 2 || days > 7) { markBad('alertDays', 'setMsg', '알림 기준 ' + days + '일은 넣을 수 없어요. 2~7일 사이로 적어 주세요.'); return; }
    settings = cleanSettings({ name: name, kind: $('petKind').value, age: age, alertDays: days, font: $('fontSize').value });
    applyFont();
    var ok = save();
    renderSettings();
    msg('setMsg', '설정을 저장했어요.' + (name !== rawName ? ' 이름 앞뒤·사이의 빈칸은 정리했어요.' : '') + (ok ? '' : SAVE_FAIL));
  }
  function addSample(msgId) {
    var k = todayKey(), n = 0;
    DATA.SAMPLE.forEach(function (s) {
      if (!entries[k]) { entries[k] = { c: s.c, t: s.t, s: 1 }; n++; }
      k = addDays(k, -1);
    });
    var ok = save();
    msg(msgId, n ? '예시 ' + n + '칸을 빈 날에 넣었어요. 달력과 진료 요약에서 볼 수 있고, 설정의 예시 지우기로 지울 수 있어요.' + (ok ? '' : SAVE_FAIL)
      : '최근 날이 모두 채워져 있어서 예시를 넣지 않았어요.');
  }
  function removeSample() {
    var ks = Object.keys(entries).filter(function (k) { return entries[k].s; });
    if (!ks.length) { msg('setMsg', '지울 예시가 없어요.'); return; }
    askConfirm('예시 ' + ks.length + '칸을 지울까요? 직접 쓴 칸은 그대로 남아요.', '지우기', function () {
      ks.forEach(function (k) { delete entries[k]; });
      var ok = save();
      openEditor(state.editDate);
      msg('setMsg', '예시를 지웠어요.' + (ok ? '' : SAVE_FAIL));
    });
  }
  function wipeAll() {
    askConfirm('모든 칸과 진료 날짜를 지울까요? 지우면 되돌릴 수 없어요. 먼저 백업 글을 복사해 두시길 권해요.', '전체 지우기', function () {
      entries = {};
      visits = [];
      nextVisit = '';
      stopVisitEdit();
      // 읽지 못해 따로 남겨 둔 예전 글도 함께 지워 이 기기에 기록이 남지 않게 한다
      try { localStorage.removeItem(STORE_KEY + '.broken'); } catch (e) { /* 저장소를 못 쓰면 남은 것도 없다 */ }
      var ok = save();
      openEditor(todayKey());
      msg('setMsg', '모두 지웠어요.' + (ok ? '' : SAVE_FAIL));
    });
  }

  // ---- 화면 전환 ----
  var VIEWS = ['write', 'calendar', 'review', 'vet', 'settings'];
  function renderCurrent() {
    if (state.view === 'write') renderWrite();
    else if (state.view === 'calendar') renderCalendar();
    else if (state.view === 'review') renderReview();
    else if (state.view === 'vet') renderVet();
    else renderSettings();
  }
  function setView(v) {
    if (VIEWS.indexOf(v) < 0) return;
    if (v !== 'review') stopPlay(false);
    state.view = v;
    VIEWS.forEach(function (name) {
      $('view-' + name).hidden = name !== v;
    });
    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      var on = tabs[i].getAttribute('data-view') === v;
      tabs[i].classList.toggle('on', on);
      tabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
    renderCurrent();
  }

  // ---- 자정 넘김: 창을 열어 둔 채 날이 바뀌면 '오늘'을 새 날짜로 옮긴다 ----
  var shownToday = todayKey(), dayTimer = null;
  function msToMidnight() {
    var n = new Date();
    // 다음 날 0시 0분 1초. 날짜가 월말·연말이면 Date 가 다음 달·다음 해로 넘긴다
    var next = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 1);
    // 기기가 잠들었다 깨거나 시계가 바뀌어도 놓치지 않게 길어도 한 시간마다 다시 본다
    return Math.max(1000, Math.min(next - n, 3600000));
  }
  function scheduleDayCheck() {
    if (dayTimer) clearTimeout(dayTimer);
    dayTimer = setTimeout(function () {
      checkDayChange();
      scheduleDayCheck();
    }, msToMidnight());
  }
  function checkDayChange() {
    var tk = todayKey(), old = shownToday;
    if (tk === old) return;
    shownToday = tk;
    var k = state.editDate, saved = entries[k];
    // 저장하지 않은 색·글이 있으면 적던 날을 그대로 둔다
    var typing = $('lineInput').value !== (saved ? saved.t : '') || state.color !== (saved ? saved.c : -1);
    var note = '';
    if (k > tk) {
      // 시계가 뒤로 돌아가 쓰던 날이 앞날이 되었다
      openEditor(tk);
      note = '기기 날짜가 ' + labelOf(tk) + '로 바뀌어 오늘 칸으로 옮겼어요.';
    } else if (k === old && !typing) {
      openEditor(tk);
      note = '자정이 지나 오늘이 ' + labelOf(tk) + '로 바뀌었어요.';
    } else if (k === old) {
      note = '자정이 지나 날짜가 바뀌었어요. 적던 글은 ' + labelOf(k) + ' 칸으로 저장돼요. 새 날을 쓰려면 오늘로를 눌러 주세요.';
    }
    // 보고 있던 달이 지난 오늘의 달이고 오늘이 새 달·새 해로 넘어갔으면 새 달을 보여 준다
    var o = partsOf(old), t = partsOf(tk);
    if (state.year === o.y && state.month === o.m && (t.y !== o.y || t.m !== o.m) && !timer) {
      state.year = t.y;
      state.month = t.m;
      state.picked = null;
    }
    renderCurrent();
    if (note) msg('writeMsg', note);
  }

  // ---- 연결 ----
  function setHelp(open) {
    $('help').hidden = !open;
    $('helpBtn').setAttribute('aria-expanded', open ? 'true' : 'false');
    $('helpBtn').textContent = open ? '닫기' : '사용 방법';
  }

  // ---- 키보드: 확인 창·시트가 열려 있으면 탭 키가 그 안에서만 돈다 ----
  var FOCUSABLE = 'button, input, select, textarea, [tabindex]';
  function focusables(box) {
    var all = box.querySelectorAll(FOCUSABLE), out = [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.disabled || el.tabIndex < 0 || el.closest('[hidden]')) continue;
      out.push(el);
    }
    return out;
  }
  function trapTab(ev) {
    var box = !$('ov-confirm').hidden ? $('ov-confirm') : (openSheetId ? $(openSheetId) : null);
    if (!box) return;
    var els = focusables(box);
    if (!els.length) return;
    var first = els[0], last = els[els.length - 1], cur = document.activeElement;
    if (!box.contains(cur)) { ev.preventDefault(); first.focus(); }
    else if (ev.shiftKey && cur === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && cur === last) { ev.preventDefault(); first.focus(); }
  }

  function bind() {
    $('helpBtn').addEventListener('click', function () { setHelp($('help').hidden); });

    $('firstHelpBtn').addEventListener('click', function () {
      setHelp(true);
      $('helpBtn').focus();
    });
    $('firstSampleBtn').addEventListener('click', function () {
      addSample('writeMsg');
      var m = $('writeMsg').textContent;
      openEditor(state.editDate);
      msg('writeMsg', m);
    });
    $('firstSettingsBtn').addEventListener('click', function () { setView('settings'); });
    $('storeWarnBtn').addEventListener('click', function () { openSheet('sheet-backup'); });

    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function (ev) {
        setView(ev.currentTarget.getAttribute('data-view'));
      });
    }

    $('lineInput').addEventListener('input', renderCount);
    guardPaste('lineInput', MAX, 'writeMsg', '한 줄');
    guardPaste('petName', 20, 'setMsg', '이름');
    // 틀렸다고 표시한 칸은 다시 고치기 시작하면 표시를 거둔다
    function clearMark(ev) { if (ev.target && ev.target.removeAttribute) ev.target.removeAttribute('aria-invalid'); }
    document.addEventListener('input', clearMark);
    document.addEventListener('change', clearMark);

    $('writeForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var raw = $('lineInput').value, t = raw.trim().replace(/\s+/g, ' ');
      markOk(['lineInput']);
      if (state.color < 0) {
        msg('writeMsg', '컨디션을 먼저 골라 주세요. 좋음·보통·덜 먹음·처짐·아픔 중 하나를 누르면 돼요.');
        if ($('colors').firstChild) $('colors').firstChild.focus();
        return;
      }
      if (!t) {
        markBad('lineInput', 'writeMsg', raw ? '한 줄에 빈칸만 있어요. 오늘 본 것을 적거나 증상 고르기로 눌러 넣어 주세요.'
          : '한 줄이 비어 있어요. 오늘 본 것을 적거나 증상 고르기로 눌러 넣어 주세요.');
        return;
      }
      // 60자를 넘는 글은 60자로 잘라 저장하고 알린다
      var cut = t.length > MAX ? t.length - MAX : 0;
      var k = state.editDate, runBefore = filledRun();
      entries[k] = { c: state.color, t: t.slice(0, MAX) };
      var ok = save();
      $('lineInput').value = entries[k].t;
      renderWrite();
      var note = cut ? ' 한 줄이 ' + MAX + '자를 넘어 뒤 ' + cut + '자를 잘랐어요.' : (t !== raw ? ' 앞뒤·사이의 빈칸은 정리했어요.' : '');
      // 빠뜨린 지난날을 채워 끊겼던 연속이 다시 이어졌으면 알린다
      var runAfter = filledRun();
      if (k !== todayKey() && runAfter > runBefore + 1) note += ' 빠뜨린 날을 채워 연속 기록이 ' + runAfter + '일로 다시 이어졌어요.';
      msg('writeMsg', (ok
        ? labelOf(k) + ' 칸을 채웠어요. 아래에서 달력이나 진료 요약으로 바로 볼 수 있어요.'
        : labelOf(k) + ' 칸을 채웠어요.' + SAVE_FAIL) + note);
    });

    $('toCalendarBtn').addEventListener('click', function () { goMonthOf(state.editDate, 'calendar'); });
    $('toReviewBtn').addEventListener('click', function () {
      goMonthOf(state.editDate, 'review');
      startPlay();
    });
    $('toVetBtn').addEventListener('click', function () { setView('vet'); });
    $('alertVetBtn').addEventListener('click', function () { setView('vet'); });

    $('clearBtn').addEventListener('click', function () { askClearEntry(state.editDate, 'writeMsg'); });

    $('todayBtn').addEventListener('click', function () { openEditor(todayKey()); });
    $('symptomBtn').addEventListener('click', function () { openSheet('sheet-symptom'); });

    $('prevMonth').addEventListener('click', function () { shiftMonth(-1, 'calMsg'); });
    $('nextMonth').addEventListener('click', function () { shiftMonth(1, 'calMsg'); });
    $('prevMonth2').addEventListener('click', function () { shiftMonth(-1, 'reviewMsg'); });
    $('nextMonth2').addEventListener('click', function () { shiftMonth(1, 'reviewMsg'); });

    $('detailBtn').addEventListener('click', function () {
      if (!state.picked || state.picked > todayKey()) return;
      openEditor(state.picked);
      setView('write');
    });
    $('detailClearBtn').addEventListener('click', function () { askClearEntry(state.picked, 'calMsg'); });

    $('playBtn').addEventListener('click', startPlay);
    $('stopBtn').addEventListener('click', function () {
      if (!timer) { msg('reviewMsg', '지금은 돌려보기 중이 아니에요.'); return; }
      stopPlay(false);
      msg('reviewMsg', '멈췄어요.');
    });
    $('reviewBackupBtn').addEventListener('click', function () { openSheet('sheet-backup'); });

    $('visitBtn').addEventListener('click', function () {
      stopVisitEdit();
      $('visitDate').value = todayKey();
      $('visitKind').value = 'done';
      msg('visitMsg', '');
      openSheet('sheet-visit');
    });
    $('vetCopyBtn').addEventListener('click', function () {
      copyText($('vetSummary').value, 'vetMsg', $('vetSummary'));
    });
    $('visitForm').addEventListener('submit', function (ev) { ev.preventDefault(); submitVisit(); });
    $('visitCancel').addEventListener('click', function () { stopVisitEdit(); msg('visitMsg', ''); });

    $('settingsForm').addEventListener('submit', function (ev) { ev.preventDefault(); submitSettings(); });
    $('backupBtn').addEventListener('click', function () { openSheet('sheet-backup'); });
    $('sampleAddBtn').addEventListener('click', function () { addSample('setMsg'); });
    $('sampleDelBtn').addEventListener('click', removeSample);
    $('wipeBtn').addEventListener('click', wipeAll);

    $('copyBtn').addEventListener('click', function () {
      var ta = $('exportText');
      if (!ta.value) { msg('backupMsg', '백업할 기록이 아직 없어요.'); return; }
      copyText(ta.value, 'backupMsg', ta);
    });
    $('restoreBtn').addEventListener('click', restore);

    var closes = document.querySelectorAll('.sheetClose');
    for (var j = 0; j < closes.length; j++) closes[j].addEventListener('click', closeSheet);
    var wraps = document.querySelectorAll('.sheetWrap');
    for (var w = 0; w < wraps.length; w++) {
      wraps[w].addEventListener('click', function (ev) { if (ev.target === ev.currentTarget) closeSheet(); });
    }

    $('confirmYes').addEventListener('click', function () { closeConfirm(true); });
    $('confirmNo').addEventListener('click', function () { closeConfirm(false); });

    // 가져오기 글 상자는 엔터가 줄바꿈이라 Ctrl(⌘)+엔터로 되살리기를 누른다
    $('restoreText').addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); restore(); }
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        if (!$('ov-confirm').hidden) { closeConfirm(false); return; }
        if (openSheetId) { closeSheet(); return; }
      }
      if (ev.key === 'Tab') { trapTab(ev); return; }
      if (!$('ov-confirm').hidden || openSheetId) return;
      var tag = ev.target && ev.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (state.view !== 'calendar' && state.view !== 'review') return;
      var id = state.view === 'calendar' ? 'calMsg' : 'reviewMsg';
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); shiftMonth(-1, id); }
      else if (ev.key === 'ArrowRight') { ev.preventDefault(); shiftMonth(1, id); }
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && timer) {
        stopPlay(false);
        msg('reviewMsg', '다른 화면으로 넘어가서 돌려보기를 멈췄어요.');
      }
      // 밤에 숨겨 둔 창을 아침에 다시 열면 날짜부터 맞춘다
      if (!document.hidden) { checkDayChange(); scheduleDayCheck(); }
    });
    window.addEventListener('focus', checkDayChange);
  }

  applyFont();
  buildColors();
  buildWeek();
  buildGrid();
  buildSymptoms();
  buildQuestions();
  buildHelp();
  bind();
  renderStoreWarn();
  openEditor(todayKey());
  setView('write');
  scheduleDayCheck();
})();
