(function () {
  'use strict';

  // ---------- 고정 데이터 ----------

  // 꽃밭 11색: 밤 정원에 어울리는 차분한 색 (이끼·라벤더·살구·하늘·장미·겨자·청록·자두·모래·흙빨강·은회색)
  var COLORS = ['#6e8b57', '#8a7db5', '#d49a6a', '#6a96b8', '#b86e7e', '#c2a84e', '#4f9a8e', '#7d5a86', '#b9a88a', '#a9634a', '#9aa0a8'];
  var ZONES = ['장미 정원', '연못', '대나무 숲', '온실', '허브 밭', '버드나무 길', '돌다리', '별빛 언덕'];
  var RULE_ALL = '가로줄·세로줄·꽃밭마다 등불 하나, 서로 닿지 않게';
  var FREE_HINTS = 1;
  var HINT_MAX = 3;          // 힌트는 한 판에 3번까지 (무료 1 + 광고 2)
  var HINT_PENALTY = 20;     // 힌트를 쓸 때마다 걸린 시간에 20초를 더한다
  var AD_EVERY = 4;          // 전면 광고: 레벨 4개마다 완료 화면 뒤에 한 번
  var AD_FROM_LEVEL = 11;    // 레벨 1~10 에는 전면 광고를 띄우지 않는다
  var AD_SECONDS = 3;
  var SAVE_KEY = 'lanternGarden.v2';
  var EMPTY = 0, CROSS = 1, LAMP = 2;

  // 별 두 상태: 받은 별(.star.on 금빛)·못 받은 별(.star.off 빈 별). 같은 둥근 끝 별 모양, 바탕은 투명.
  var STAR_PATH = 'M12 2.6L14.47 9.2L21.51 9.51L15.99 13.9L17.88 20.69L12 16.8L6.12 20.69L8.01 13.9L2.49 9.51L9.53 9.2Z';
  function starHtml(on) {
    return '<span class="star ' + (on ? 'on' : 'off') + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + STAR_PATH + '"/></svg></span>';
  }
  // 지도의 잠긴 레벨 아래 자물쇠: 둥근 고리와 몸통, 바탕은 투명
  var LOCK_SVG = '<span class="lock" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="M3.6 5.4V3.9a2.4 2.4 0 0 1 4.8 0v1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="2.2" y="5.2" width="7.6" height="5.6" rx="1.4" fill="currentColor"/></svg></span>';
  function starsHtml(got) {
    var s = '';
    for (var k = 0; k < 3; k++) s += starHtml(k < got);
    return s;
  }

  var LG = window.LanternLogic || null;
  var LD = window.LEVEL_DATA || null;
  var DD = window.DAILY_DATA || null;

  function decode(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) out.push(parseInt(str.charAt(i), 36));
    return out;
  }

  var LEVELS = [];
  if (LD && LD.levels) {
    for (var li = 0; li < LD.levels.length; li++) {
      var row = LD.levels[li];
      LEVELS.push({ no: li + 1, n: row[0], reg: decode(row[1]), sol: decode(row[2]), score: row[3], maxTech: row[4], steps: row[5], tut: row[6], breath: !!row[7],
        par: row[8] || parSeconds(row[0], row[3]) });
    }
  }

  // 별 3개 목표 시간(초). levels.js 는 판마다 이 값을 9번째로 갖고 있다(tools\par.js 와 같은 식: 칸 수 × 0.8 + 난이도 점수 × 1.2, 5초 단위로 올림).
  // 값이 없는 판(오늘의 정원)만 여기서 셈한다
  function parSeconds(n, score) {
    return Math.ceil((n * n * 0.8 + score * 1.2) / 5) * 5;
  }
  var BADGES = (LD && LD.badges) || [
    { name: '쉬움', min: 0, max: 29 }, { name: '보통', min: 30, max: 39 },
    { name: '어려움', min: 40, max: 52 }, { name: '아주 어려움', min: 53, max: 9999 }
  ];
  var TUTORIAL = (LD && LD.tutorial) || {};

  function badgeOf(score) {
    for (var i = 0; i < BADGES.length; i++) if (score >= BADGES[i].min && score <= BADGES[i].max) return i;
    return BADGES.length - 1;
  }

  // 진행 단계: 판 크기가 바뀌는 레벨에서 새 단계가 열린다 (levels.js 의 크기 구간 그대로 4×4 → 11×11)
  function stageOf(no) {
    var lv = LEVELS[no - 1];
    if (!lv) return null;
    var from = no, to = no;
    while (from > 1 && LEVELS[from - 2].n === lv.n) from--;
    while (to < LEVELS.length && LEVELS[to].n === lv.n) to++;
    return { n: lv.n, from: from, to: to, first: from === no };
  }

  function $(id) { return document.getElementById(id); }

  // ---------- 저장 ----------

  function blankSave() {
    return {
      stars: {},                 // 레벨 번호 → 별 1~3
      best: {},                  // 레벨 번호 → 가장 빠른 시간(초)
      settings: { sound: true, autoX: false, cb: false, still: false, tutor: true },   // tutor: 첫 판 안내(레벨 1~3), '다시 보지 않기' 로 끔
      daily: { last: '', streak: 0, best: 0, timeDate: '', time: 0 },   // time: timeDate 날 처음 깬 시간(초, 하루 한 번)
      clears: 0,                 // 레벨을 깬 횟수 (전면 광고 셈)
      ach: {},                   // 업적 id → 이룬 날 (YYYY-MM-DD)
      swift: 0,                  // 힌트 없이 목표 시간의 절반 안에 깬 횟수 (업적 '바람처럼')
      stats: blankStats(),       // 누적 통계 (통계 창)
      playLevel: null,           // 풀던 레벨 판
      playDaily: null            // 풀던 오늘의 정원 판
    };
  }

  // wins: 깬 판(레벨·오늘의 정원, 다시 한 판 포함), timed: 그 가운데 시간을 센 판(통계 전 기록은 판 수만 있다)
  // time: timed 판의 걸린 시간 합(초), noHint: timed 판 가운데 힌트 없이 깬 판, days: 오늘의 정원을 밝힌 날 수
  function blankStats() {
    return { wins: 0, levelWins: 0, dailyWins: 0, timed: 0, time: 0, noHint: 0, days: 0 };
  }

  var save = blankSave();

  // 저장소가 없거나(사생활 보호 창·막힘) 저장 글이 깨져도 빈 기록으로 돈다
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

  function numMap(m, lo, hi) {            // { 레벨 번호: 숫자 } 에서 범위 밖·숫자 아닌 값은 버린다
    var out = {};
    if (!isObj(m)) return out;
    for (var k in m) {
      if (!Object.prototype.hasOwnProperty.call(m, k)) continue;
      var no = +k, v = +m[k];
      if (no >= 1 && no <= LEVELS.length && isFinite(v) && v >= lo && v <= hi) out[no] = v;
    }
    return out;
  }

  function slimOk(p) {
    return isObj(p) && Array.isArray(p.marks) ? p : null;
  }

  function loadSave() {
    var b = blankSave();
    try {
      var raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (!isObj(s)) return;
      save.stars = numMap(s.stars, 1, 3);
      save.best = numMap(s.best, 0, 359999);
      if (isObj(s.settings)) {
        for (var k in b.settings) if (typeof s.settings[k] === 'boolean') b.settings[k] = s.settings[k];
      }
      save.settings = b.settings;
      if (isObj(s.daily)) {
        var d = s.daily;
        if (typeof d.last === 'string') b.daily.last = d.last;
        if (typeof d.timeDate === 'string') b.daily.timeDate = d.timeDate;
        if (isFinite(+d.streak) && +d.streak >= 0) b.daily.streak = +d.streak;
        if (isFinite(+d.best) && +d.best >= 0) b.daily.best = +d.best;
        if (isFinite(+d.time) && +d.time >= 0) b.daily.time = +d.time;
      }
      save.daily = b.daily;
      save.clears = isFinite(+s.clears) && +s.clears >= 0 ? +s.clears : 0;
      save.ach = {};
      if (isObj(s.ach)) {
        for (var ai = 0; ai < ACHS.length; ai++) {
          var aid = ACHS[ai].id;
          if (typeof s.ach[aid] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.ach[aid])) save.ach[aid] = s.ach[aid];
        }
      }
      save.swift = isFinite(+s.swift) && +s.swift >= 0 ? +s.swift : 0;
      save.stats = b.stats;
      if (isObj(s.stats)) {
        for (var sk in b.stats) if (isFinite(+s.stats[sk]) && +s.stats[sk] >= 0) b.stats[sk] = +s.stats[sk];
      } else {
        // 통계가 생기기 전 기록: 레벨을 깬 횟수만 알 수 있다
        b.stats.wins = b.stats.levelWins = save.clears;
      }
      save.playLevel = slimOk(s.playLevel);
      save.playDaily = slimOk(s.playDaily);
    } catch (e) { save = blankSave(); }
  }

  function persist() {
    try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* 저장할 수 없으면 넘어간다 */ }
  }

  function clearedCount() {
    var c = 0;
    for (var k in save.stars) if (Object.prototype.hasOwnProperty.call(save.stars, k)) c++;
    return c;
  }

  function nextLevelNo() {
    for (var i = 1; i <= LEVELS.length; i++) if (!save.stars[i]) return i;
    return LEVELS.length;
  }

  function starTotal() {
    var t = 0;
    for (var k in save.stars) if (Object.prototype.hasOwnProperty.call(save.stars, k)) t += save.stars[k];
    return t;
  }

  // ---------- 업적·정원 도감 (판을 넘어 쌓이는 목표) ----------
  // 업적은 저장된 기록에서 셈한다. 한 번 이루면 save.ach[id] 에 이룬 날을 적어 두고, 기록 지우기 전까지 남는다.
  // 정원 도감은 구역 8곳(ZONES, 10레벨마다 바뀜) 칸이고, 그 구역의 레벨을 하나라도 깨면 칸이 켜진다.

  function zoneOf(no) { return Math.floor((no - 1) / 10) % ZONES.length; }

  function levelStats() {
    var s = { cleared: 0, perfect: 0, stars: 0, big: 0, zones: [] };
    for (var z = 0; z < ZONES.length; z++) s.zones.push(false);
    for (var k in save.stars) {
      if (!Object.prototype.hasOwnProperty.call(save.stars, k)) continue;
      var no = +k, st = save.stars[k], lv = LEVELS[no - 1];
      s.cleared++;
      s.stars += st;
      if (st === 3) s.perfect++;
      if (lv && lv.n >= 11) s.big++;
      s.zones[zoneOf(no)] = true;
    }
    s.zoneCount = s.zones.filter(Boolean).length;
    return s;
  }

  var ACHS = [
    { id: 'first', name: '첫 등불', desc: '레벨을 처음 깨요', goal: 1, of: function (s) { return s.cleared; } },
    { id: 'lv10', name: '정원 문을 열고', desc: '레벨 10개를 깨요', goal: 10, of: function (s) { return s.cleared; } },
    { id: 'lv50', name: '길을 아는 사람', desc: '레벨 50개를 깨요', goal: 50, of: function (s) { return s.cleared; } },
    { id: 'lv100', name: '등불 백 개', desc: '레벨 100개를 깨요', goal: 100, of: function (s) { return s.cleared; } },
    { id: 'lv250', name: '밤의 정원사', desc: '레벨 250개를 깨요', goal: 250, of: function (s) { return s.cleared; } },
    { id: 'lv500', name: '반쯤 밝힌 정원', desc: '레벨 500개를 깨요', goal: 500, of: function (s) { return s.cleared; } },
    { id: 'lv1000', name: '온 정원의 등불', desc: '레벨 1000개를 모두 깨요', goal: 1000, of: function (s) { return s.cleared; } },
    { id: 'zones', name: '정원 한 바퀴', desc: '정원 도감 8칸을 모두 켜요', goal: ZONES.length, of: function (s) { return s.zoneCount; } },
    { id: 'perfect1', name: '첫 별 셋', desc: '별 셋으로 레벨을 깨요', goal: 1, of: function (s) { return s.perfect; } },
    { id: 'perfect50', name: '별 셋 쉰 번', desc: '별 셋 받은 레벨 50개', goal: 50, of: function (s) { return s.perfect; } },
    { id: 'stars300', name: '별 주머니', desc: '별을 모두 300개 모아요', goal: 300, of: function (s) { return s.stars; } },
    { id: 'big', name: '큰 정원', desc: '11×11 정원을 하나 깨요', goal: 1, of: function (s) { return s.big; } },
    { id: 'swift', name: '바람처럼', desc: '힌트 없이 목표 시간의 절반 안에 깨요', goal: 1, of: function () { return save.swift; } },
    { id: 'daily1', name: '오늘의 등불', desc: '오늘의 정원을 처음 밝혀요', goal: 1, of: function () { return save.daily.best; } },
    { id: 'streak7', name: '한 주 내내', desc: '오늘의 정원 연속 7일', goal: 7, of: function () { return save.daily.best; } },
    { id: 'streak30', name: '한 달 내내', desc: '오늘의 정원 연속 30일', goal: 30, of: function () { return save.daily.best; } }
  ];

  // 새로 이룬 업적을 save.ach 에 적고 그 목록을 돌려준다 (저장은 부른 쪽이 persist)
  function checkAch() {
    var s = levelStats(), got = [], d = today();
    for (var i = 0; i < ACHS.length; i++) {
      var a = ACHS[i];
      if (save.ach[a.id]) continue;
      if (a.of(s) >= a.goal) { save.ach[a.id] = d; got.push(a); }
    }
    return got;
  }

  function achCount() {
    var c = 0;
    for (var i = 0; i < ACHS.length; i++) if (save.ach[ACHS[i].id]) c++;
    return c;
  }

  function renderAch() {
    var s = levelStats();
    $('achCount').textContent = '업적 ' + achCount() + ' / ' + ACHS.length + ' · 도감 ' + s.zoneCount + ' / ' + ZONES.length;
    var zl = $('achZones');
    zl.innerHTML = '';
    ZONES.forEach(function (name, z) {
      var li = document.createElement('li');
      li.className = 'zone-cell zone-' + z + (s.zones[z] ? ' on' : '');
      li.textContent = (s.zones[z] ? '✓ ' : '? ') + (s.zones[z] ? name : '아직 못 간 곳');
      zl.appendChild(li);
    });
    var al = $('achList');
    al.innerHTML = '';
    ACHS.forEach(function (a) {
      var done = save.ach[a.id], v = Math.min(a.goal, a.of(s));
      var li = document.createElement('li');
      li.className = 'ach' + (done ? ' on' : '');
      var mark = document.createElement('span');
      mark.className = 'ach-mark';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = done ? '★' : '☆';
      var body = document.createElement('span');
      body.className = 'ach-body';
      var b = document.createElement('b');
      b.textContent = a.name;
      var p = document.createElement('span');
      p.className = 'small';
      p.textContent = a.desc;
      body.appendChild(b);
      body.appendChild(p);
      var st = document.createElement('span');
      st.className = 'ach-state';
      st.textContent = done ? '달성 · ' + done.slice(5).replace('-', '/') : v + ' / ' + a.goal;
      li.appendChild(mark);
      li.appendChild(body);
      li.appendChild(st);
      al.appendChild(li);
    });
  }

  function openAch() {
    renderAch();
    openPanel('ach');
  }

  // ---------- 통계 (누적 기록) ----------
  // 판 수·평균 시간·힌트 없이 깬 비율은 save.stats 에서, 레벨·별·가장 빠른 시간은 save.stars·save.best 에서 센다.

  function sizeStats() {
    var rows = [], at = {};
    for (var i = 0; i < LEVELS.length; i++) {
      var n = LEVELS[i].n;
      if (!at[n]) { at[n] = { n: n, total: 0, cleared: 0, stars: 0, fast: 0, sum: 0, timed: 0 }; rows.push(at[n]); }
      var r = at[n], no = i + 1;
      r.total++;
      if (!save.stars[no]) continue;
      r.cleared++;
      r.stars += save.stars[no];
      var t = save.best[no];
      if (t) {
        r.timed++;
        r.sum += t;
        if (!r.fast || t < r.fast) r.fast = t;
      }
    }
    return rows;
  }

  function farthestLevel() {
    var far = 0;
    for (var k in save.stars) if (Object.prototype.hasOwnProperty.call(save.stars, k) && +k > far) far = +k;
    return far;
  }

  function renderStats() {
    var st = save.stats, ls = levelStats();
    var avgStar = ls.cleared ? (ls.stars / ls.cleared).toFixed(1) : '-';
    var items = [
      ['깬 판', st.wins + '판', '레벨 ' + st.levelWins + ' · 오늘의 정원 ' + st.dailyWins + ' (다시 한 판 포함)'],
      ['깬 레벨', ls.cleared + ' / ' + LEVELS.length, farthestLevel() ? '가장 멀리 간 레벨 ' + farthestLevel() : '아직 없어요'],
      ['별', ls.stars + ' / ' + (LEVELS.length * 3), '레벨마다 평균 별 ' + avgStar + ' · 별 셋 ' + ls.perfect + '개'],
      ['평균 풀이 시간', st.timed ? fmtTime(st.time / st.timed) : '-', st.timed ? st.timed + '판 · 모두 ' + fmtTime(st.time) : '판을 깨면 세요'],
      ['힌트 없이 깬 판', st.timed ? Math.round(st.noHint * 100 / st.timed) + '%' : '-', st.timed ? st.noHint + ' / ' + st.timed + '판' : ''],
      ['오늘의 정원', st.days + '일', '지금 연속 ' + shownStreak() + '일 · 최고 연속 ' + save.daily.best + '일']
    ];
    var gl = $('statsGrid');
    gl.innerHTML = '';
    items.forEach(function (it) {
      var li = document.createElement('li');
      li.className = 'stat';
      var name = document.createElement('span');
      name.className = 'small';
      name.textContent = it[0];
      var val = document.createElement('b');
      val.textContent = it[1];
      li.appendChild(name);
      li.appendChild(val);
      if (it[2]) {
        var sub = document.createElement('span');
        sub.className = 'small stat-sub';
        sub.textContent = it[2];
        li.appendChild(sub);
      }
      gl.appendChild(li);
    });
    var tb = $('statsSizes');
    tb.innerHTML = '';
    sizeStats().forEach(function (r) {
      var tr = document.createElement('tr');
      [
        r.n + '×' + r.n,
        r.cleared + ' / ' + r.total,
        r.cleared ? (r.stars / r.cleared).toFixed(1) : '-',
        r.fast ? fmtTime(r.fast) : '-',
        r.timed ? fmtTime(r.sum / r.timed) : '-'
      ].forEach(function (text, ci) {
        var td = document.createElement(ci ? 'td' : 'th');
        if (!ci) td.setAttribute('scope', 'row');
        td.textContent = text;
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
  }

  function openStats() {
    renderStats();
    openPanel('stats');
  }

  // ---------- 날짜 ----------

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function pad(x) { return (x < 10 ? '0' : '') + x; }

  function dayNumber(str) {
    return Math.round(Date.UTC(+str.slice(0, 4), +str.slice(5, 7) - 1, +str.slice(8, 10)) / 86400000);
  }

  function shownStreak() {
    if (!save.daily.last) return 0;
    var gap = dayNumber(today()) - dayNumber(save.daily.last);
    return gap <= 1 ? save.daily.streak : 0;
  }

  function dailyBoard(dayStr) {
    if (!DD || !DD.list || !DD.list.length) return null;
    var idx = dayNumber(dayStr) - dayNumber(DD.from);
    idx = ((idx % DD.list.length) + DD.list.length) % DD.list.length;
    var row = DD.list[idx];
    return { n: DD.n, reg: decode(row[0]), sol: decode(row[1]), score: row[2], par: parSeconds(DD.n, row[2]) };
  }

  function dailyFallback(dayStr) {
    var pool = [];
    for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].n === 8) pool.push(LEVELS[i]);
    if (!pool.length) pool = LEVELS;
    if (!pool.length) return null;
    var idx = ((dayNumber(dayStr) % pool.length) + pool.length) % pool.length;
    var lv = pool[idx];
    return { n: lv.n, reg: lv.reg, sol: lv.sol, score: lv.score, par: lv.par };
  }

  // ---------- 답이 하나인 판 ----------

  // 판을 열 때마다 logic.js 풀이기(LG.pickUnique → isUnique: 되짚기로 답 수 세기)로 답이 하나인지 확인한다(판마다 한 번, 결과는 기억).
  // 답이 하나가 아니면 씨앗값으로 새 판을 LG.MAX_TRIES(400)번까지 만들어 답이 하나인 판을 찾고,
  // 시도 상한(또는 PICK_MS)에 걸리면 대체 판을 쓴다. 대체 판은 답이 여럿일 수 있지만, 깼는지는 afterChange 가
  // 저장된 답이 아니라 규칙(conflicts: 등불 n개·걸림 0)으로 보므로 규칙에 맞는 배치면 모두 깬 것으로 친다.
  var PICK_MS = 1500;
  var picked = {};

  function uniqueBoard(key, first, seed, fallback) {
    if (picked[key]) return picked[key];
    var out = { board: first || fallback, source: 'data', tries: 0, unique: null };
    if (LG && LG.pickUnique && out.board) {
      try { out = LG.pickUnique(out.board.n, first, seed, fallback || first, LG.MAX_TRIES, PICK_MS); }
      catch (e) { out = { board: fallback || first, source: 'fallback', tries: 0, unique: null }; }
      if (!out.board) out.board = fallback || first;
    }
    picked[key] = out;
    return out;
  }

  function madeBoard(m, tut) {
    return { n: m.n, reg: m.reg, sol: m.sol, score: m.score, tut: tut || 0, par: parSeconds(m.n, m.score), made: { max: m.maxTech, steps: m.steps } };
  }

  // 레벨 판: levels.js 판이 답이 하나면 그대로, 아니면 새로 만든 판, 400번에 걸리면 levels.js 판을 대체 판으로
  function levelBoard(no) {
    var lv = LEVELS[no - 1];
    if (!lv) return null;
    var pk = uniqueBoard('L' + no, lv, 1000003 * no + 17, lv);
    return pk.source === 'made' ? madeBoard(pk.board, lv.tut) : lv;
  }

  // 오늘의 정원 판: daily.js 판(없으면 날짜로 고른 8×8 레벨 판) → 새로 만든 판 → 400번에 걸리면 8×8 레벨 판을 대체 판으로
  function dailyFor(dayStr) {
    var b = dailyBoard(dayStr), fb = dailyFallback(dayStr);
    if (!b && !fb) return null;
    var pk = uniqueBoard('D' + dayStr, b || fb, dayNumber(dayStr) * 7 + 3, fb || b);
    return pk.source === 'made' ? madeBoard(pk.board, 0) : pk.board;
  }

  // ---------- 소리 ----------

  // 소리는 사람이 처음 누른(터치·클릭·키) 뒤에만 켠다. 그 전에는 AudioContext 를 만들지 않아
  // 효과음 함수(tone·sweep·noise)가 모두 조용히 끝난다. 시험 훅(__test)의 act 도 사람 입력이 아니라 소리가 없다
  var audioCtx = null;
  var audioUnlocked = false;

  function unlockAudio(e) {
    if (audioUnlocked || (e && e.isTrusted === false)) return;
    audioUnlocked = true;
    window.removeEventListener('pointerdown', unlockAudio, true);
    window.removeEventListener('keydown', unlockAudio, true);
    window.removeEventListener('touchstart', unlockAudio, true);
    ensureAudio();
  }
  // 캡처 단계라 버튼·판의 pointerdown 보다 먼저 풀린다 → 첫 누름의 효과음부터 난다
  window.addEventListener('pointerdown', unlockAudio, true);
  window.addEventListener('keydown', unlockAudio, true);
  window.addEventListener('touchstart', unlockAudio, true);

  // 소리를 끄거나 탭이 숨겨지면 멈추고, 다시 켜거나 돌아오면(첫 누름 뒤에만) 잇는다
  function suspendAudio() {
    if (!audioCtx) return;
    try {
      if (audioCtx.state === 'running') {
        var p = audioCtx.suspend();
        if (p && p.catch) p.catch(function () {});
      }
    } catch (e) { /* 멈추지 못해도 게임은 계속한다 */ }
  }

  function ensureAudio() {
    if (!audioUnlocked || !save.settings.sound) return;
    try {
      if (!audioCtx) {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audioCtx = new Ctx();
      }
      if (audioCtx.state === 'suspended') {
        var p = audioCtx.resume();
        if (p && p.catch) p.catch(function () {});
      }
    } catch (e) { audioCtx = null; }
  }

  function tone(freq, delay, dur, vol, type) {
    if (!save.settings.sound || !audioCtx) return;
    try {
      var t = audioCtx.currentTime + delay;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    } catch (e) { /* 소리가 안 나도 게임은 계속한다 */ }
  }

  // 높이가 내려가는 소리 (별이 박히는 낮고 묵직한 '쿵')
  function sweep(f0, f1, delay, dur, vol, type) {
    if (!save.settings.sound || !audioCtx) return;
    try {
      var t = audioCtx.currentTime + delay;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    } catch (e) { /* 소리가 안 나도 게임은 계속한다 */ }
  }

  // 짧은 잡음 (별이 박히는 '착')
  var noiseBuf = null;
  function noise(delay, dur, vol, hp) {
    if (!save.settings.sound || !audioCtx) return;
    try {
      if (!noiseBuf) {
        noiseBuf = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * 0.3), audioCtx.sampleRate);
        var d = noiseBuf.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      var t = audioCtx.currentTime + delay;
      var src = audioCtx.createBufferSource();
      var filt = audioCtx.createBiquadFilter();
      var gain = audioCtx.createGain();
      src.buffer = noiseBuf;
      filt.type = 'highpass';
      filt.frequency.value = hp;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filt);
      filt.connect(gain);
      gain.connect(audioCtx.destination);
      src.start(t);
      src.stop(t + dur + 0.02);
    } catch (e) { /* 소리가 안 나도 게임은 계속한다 */ }
  }

  var CHIME_BASE = 1047;     // 첫 별 종소리 기준음 (C6). 둘째 +4반음, 셋째 +8반음

  var SFX = {
    lamp: function () { tone(660, 0, 0.16, 0.12); tone(990, 0.04, 0.12, 0.05); },
    unlamp: function () { tone(440, 0, 0.1, 0.07); },
    cross: function () { tone(300, 0, 0.05, 0.05, 'triangle'); },
    bad: function () { tone(220, 0, 0.18, 0.09, 'triangle'); },
    hint: function () { tone(880, 0, 0.12, 0.08); tone(1175, 0.1, 0.16, 0.06); },
    undo: function () { tone(380, 0, 0.08, 0.06, 'triangle'); },
    toggle: function () { tone(520, 0, 0.06, 0.05); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, k) { tone(f, k * 0.12, 0.35, 0.12); }); },
    // 별이 박히는 순간: 낮고 묵직한 쿵 + 짧은 착 + 맑은 종소리(별마다 4반음씩 높게)
    slam: function (k) {
      sweep(160, 48, 0, 0.22, 0.32);
      noise(0, 0.05, 0.16, 2400);
      var f = CHIME_BASE * Math.pow(2, (k * 4) / 12);
      tone(f, 0.01, 0.7, 0.1);
      tone(f * 2, 0.01, 0.35, 0.03);
    },
    fanfare: function () {
      [523, 659, 784].forEach(function (f, k) { tone(f, 0.08 + k * 0.11, 0.18, 0.09, 'triangle'); });
      [523, 659, 784, 1047].forEach(function (f) { tone(f, 0.45, 0.9, 0.07, 'triangle'); });
    },
    rise: function () { [660, 784, 988].forEach(function (f, k) { tone(f, k * 0.17, 0.2, 0.05); }); },
    lightUp: function () { tone(1175, 0, 0.4, 0.08); tone(1568, 0.06, 0.35, 0.04); },
    page: function () { tone(600, 0, 0.05, 0.04); },
    fix: function () { tone(587, 0, 0.12, 0.08); tone(880, 0.08, 0.2, 0.07); }
  };

  // ---------- 화면 전환 ----------

  var screens = { start: $('startScreen'), map: $('mapScreen'), play: $('playScreen') };
  var panels = {
    clear: $('clearPanel'), ad: $('adPanel'), reward: $('rewardPanel'),
    settings: $('settingsPanel'), how: $('howPanel'), reset: $('resetPanel'),
    pause: $('pausePanel'), ach: $('achPanel'), stats: $('statsPanel')
  };
  var overlay = $('overlay');
  var curScreen = 'start';
  var curPanel = null;
  var panelStack = [];

  // 시작 화면 풍경(400×440): 위 자리(.start-sky)가 그림보다 납작하면(데스크톱 1280×720 등) 아래 끝 기준(xMidYMax)으로
  // 잘려 하늘이 사라진다. 그럴 때는 가운데 기준(xMidYMid slice)으로 자르고, 달·별을 보이는 하늘 맨 위 바로 아래로 내려
  // 초승달 .moon 이 늘 화면 안에 보이게 한다 (V-03). 마스크(#ssMoonCut)는 .moon 의 좌표를 따라 함께 움직인다
  var startSky = document.querySelector('.start-sky');
  var startArt = document.querySelector('.start-art');
  function fitStartArt() {
    if (!startSky || !startArt) return;
    var w = startSky.clientWidth, h = startSky.clientHeight;
    if (!w || !h) return;
    var seen = 400 * h / w;                       // 보이는 그림 높이 (viewBox 단위)
    var low = seen < 440;
    startArt.setAttribute('preserveAspectRatio', low ? 'xMidYMid slice' : 'xMidYMax slice');
    var top = low ? 220 - seen / 2 : 0;           // 보이는 맨 위 y
    // 달 원판 위 끝(y 48)을 맨 위에서 12 아래로. 언덕(y 200) 아래로는 내리지 않는다
    var dy = Math.max(0, Math.min(108, top + 12 - 48));
    startArt.querySelectorAll('.moon, .stars').forEach(function (g) {
      if (dy) g.setAttribute('transform', 'translate(0 ' + dy.toFixed(1) + ')');
      else g.removeAttribute('transform');
    });
  }

  function showScreen(name) {
    document.body.classList.toggle('still', stillMode());
    for (var k in screens) if (Object.prototype.hasOwnProperty.call(screens, k)) screens[k].classList.toggle('on', k === name);
    curScreen = name;
    if (name === 'start') { renderStart(); fitStartArt(); }
    if (name === 'map') renderMap();
    if (name === 'play') { resize(); render(); }
    wake();
  }

  function openPanel(name) {
    if (curPanel && curPanel !== name) panelStack.push(curPanel);
    for (var k in panels) if (Object.prototype.hasOwnProperty.call(panels, k)) panels[k].classList.toggle('show', k === name);
    overlay.classList.remove('hidden');
    curPanel = name;
    markPaused();
    wake();
  }

  function closePanel() {
    var back = panelStack.pop() || null;
    for (var k in panels) if (Object.prototype.hasOwnProperty.call(panels, k)) panels[k].classList.toggle('show', k === back);
    curPanel = back;
    if (!back) overlay.classList.add('hidden');
    markPaused();
    wake();   // 완료 창으로 돌아오면 연출을, 판으로 돌아오면 시간을 다시 움직인다
  }

  function closeAllPanels() {
    if (window.ClearFx) window.ClearFx.stop();
    panelStack = [];
    curPanel = null;
    for (var k in panels) if (Object.prototype.hasOwnProperty.call(panels, k)) panels[k].classList.remove('show');
    overlay.classList.add('hidden');
    markPaused();
    wake();
  }

  // 일시정지 창이 떠 있거나 그 위에 설정·방법 창을 겹쳐 연 동안은 판을 가린다
  function markPaused() {
    document.body.classList.toggle('paused', curPanel === 'pause' || panelStack.indexOf('pause') >= 0);
  }

  // ---------- 일시정지 ----------
  // 창이 하나라도 떠 있으면 tick 이 시간을 흘리지 않는다. 일시정지는 그 창을 띄우는 것이다.

  function pauseGame() {
    if (curScreen !== 'play' || !P || P.done || curPanel) return false;
    storePlay();
    $('pauseTime').textContent = fmtTime(P.time);
    openPanel('pause');
    SFX.page();
    return true;
  }

  function resumeGame() {
    if (curPanel !== 'pause') return;
    closePanel();
    lastTick = window.performance && performance.now ? performance.now() : 0;
  }

  function leavePause() {
    closeAllPanels();
    storePlay();
    showScreen(P && P.kind === 'daily' ? 'start' : 'map');
  }

  var toastTimer = 0;
  function toast(text) {
    var el = $('toast');
    el.textContent = text;
    el.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { el.classList.remove('show'); }, 1800);
  }

  // ---------- 시작 화면 ----------

  function renderStart() {
    var resume = save.playLevel && LEVELS[save.playLevel.no - 1];
    $('playBtn').textContent = resume ? '이어하기 · 레벨 ' + save.playLevel.no : '시작';
    var st = shownStreak();
    $('streakText').textContent = st ? '연속 ' + st + '일' : '';
    $('streakText').hidden = !st;   // 0일이면 빈 배지를 숨긴다 (V-04)
    $('dailyBtn').disabled = !DD;
    var info = [];
    if (LEVELS.length) info.push('레벨 ' + LEVELS.length + '개 · 깬 레벨 ' + clearedCount() + ' · 별 ' + starTotal());
    else info.push('레벨을 준비하는 중이에요.');
    $('startAchBtn').textContent = '업적 ' + achCount() + '/' + ACHS.length;
    if (save.daily.last === today()) info.push('오늘의 정원을 밝혔어요' + (save.daily.timeDate === today() && save.daily.time ? ' (' + fmtTime(save.daily.time) + ')' : ''));
    $('startInfo').textContent = info.join(' · ');
  }

  // ---------- 레벨 지도 ----------

  var mapBuiltFor = '';
  var mapAdvance = 0;        // 방금 깨고 지도로 돌아온 레벨 번호 (다음 등불로 빛이 올라가는 연출을 한 번 한다)
  var advanceTimer = 0;
  // 지도 구역 치수 (style.css .zone padding·.node-row height 와 같다)
  var ZONE_TOP = 28, ZONE_BOTTOM = 60, ROW_H = 76;

  // 정원 길이 굽이치는 가로 위치(%). 등불 자리와 길이 같은 식을 쓴다
  function mapX(t) { return 50 + Math.sin(t * 0.9) * 30; }

  // 지도는 아래에서 위로 올라간다: 1단계가 맨 아래, 구역 안에서도 위가 높은 레벨이다.
  // 구역 하나의 정원 길. 위 끝은 t = 끝 레벨 - 0.5, 아래 끝은 t = 첫 레벨 - 0.5 의 자리에서
  // 세로로 들고 나서, 구역끼리 위아래로 이어 붙이면 길이 끊기지 않는다
  function zonePathSvg(from, to) {
    var H = ZONE_TOP + (to - from) * ROW_H + ZONE_BOTTOM;
    var pts = [[mapX(to - 0.5), 0]];
    for (var k = to - 1; k >= from; k--) pts.push([Math.round(mapX(k)), ZONE_TOP + (to - 1 - k) * ROW_H + 32]);
    pts.push([mapX(from - 0.5), H]);
    var d = 'M' + pts[0][0].toFixed(2) + ' 0';
    for (var p = 1; p < pts.length; p++) {
      var a = pts[p - 1], b = pts[p], m = (b[1] - a[1]) / 2;
      d += ' C' + a[0].toFixed(2) + ' ' + (a[1] + m) + ' ' + b[0].toFixed(2) + ' ' + (b[1] - m) + ' ' + b[0].toFixed(2) + ' ' + b[1];
    }
    return '<svg class="zone-path" viewBox="0 0 100 ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<path class="edge" d="' + d + '"/><path class="soil" d="' + d + '"/><path class="pebble" d="' + d + '"/></svg>';
  }

  function renderMap() {
    var list = $('mapList');
    var next = nextLevelNo();
    var sig = LEVELS.length + ':' + next + ':' + starTotal();
    $('mapStars').textContent = '★ ' + starTotal() + ' · ' + clearedCount() + '/' + LEVELS.length;
    if (sig !== mapBuiltFor) {
      mapBuiltFor = sig;
      list.innerHTML = '';
      if (!LEVELS.length) {
        var note = document.createElement('p');
        note.className = 'map-note';
        note.textContent = '레벨을 준비하는 중이에요. 오늘의 정원은 먼저 할 수 있어요.';
        list.appendChild(note);
        return;
      }
      var frag = document.createDocumentFragment();
      var zoneCount = Math.ceil(LEVELS.length / 10);
      for (var zi = zoneCount - 1; zi >= 0; zi--) {
        var from = zi * 10, to = Math.min(from + 10, LEVELS.length);
        var z = zi % ZONES.length;
        var zone = document.createElement('div');
        zone.className = 'zone zone-' + z;
        zone.innerHTML = zonePathSvg(from, to);
        // 구역이 바뀌는 자리(구역 아래 끝, 올라가며 들어서는 곳)에 구역 이름만 가운데 반투명 띠 위에 둔다 (H-18)
        var h = document.createElement('h3');
        h.className = 'zone-name';
        h.innerHTML = '<span>' + ZONES[z] + '</span>';
        zone.appendChild(h);
        for (var i = to - 1; i >= from; i--) {
          var no = i + 1;
          var rowEl = document.createElement('div');
          rowEl.className = 'node-row';
          var node;
          if (no <= next) {
            node = document.createElement('button');
            node.type = 'button';
            node.setAttribute('aria-label', '레벨 ' + no + (save.stars[no] ? ' · 깬 레벨 · 별 ' + save.stars[no] + '개' : ' · 지금 할 레벨'));
            node.className = 'node ' + (save.stars[no] ? 'lit' : 'now');
          } else {
            node = document.createElement('div');
            node.className = 'node locked';
            node.setAttribute('role', 'img');
            node.setAttribute('aria-label', '레벨 ' + no + ' · 잠김');
          }
          node.setAttribute('data-no', String(no));
          node.style.left = Math.round(mapX(i)) + '%';
          // 깬 레벨 등불 아래 별 세 칸(받은 별 금빛 채움, 못 받은 칸 빈 점선), 잠긴 레벨 아래 자물쇠 — 색만으로 가르지 않는다 (G-24)
          var s = save.stars[no] || 0;
          node.innerHTML = '<span>' + no + '</span>' + (s ? '<span class="st" aria-hidden="true">' + starsHtml(s) + '</span>' : (no > next ? LOCK_SVG : ''));
          rowEl.appendChild(node);
          zone.appendChild(rowEl);
        }
        frag.appendChild(zone);
      }
      list.appendChild(frag);
    }
    var from0 = mapAdvance;
    mapAdvance = 0;
    window.clearTimeout(advanceTimer);
    if (from0 && from0 + 1 === next && !save.stars[next] && !stillMode()) advanceLight(from0, next);
    else centerOn(next, false);
  }

  // 지도 등불 하나를 지도 화면 가운데로 (scrollIntoView 는 #app 까지 밀 수 있어 지도 목록만 움직인다)
  function centerOn(no, smooth) {
    var list = $('mapList');
    var el = list.querySelector('[data-no="' + no + '"]');
    if (!el) return;
    var lr = list.getBoundingClientRect(), er = el.getBoundingClientRect();
    var top = list.scrollTop + (er.top + er.height / 2) - (lr.top + lr.height / 2);
    if (smooth && list.scrollTo && !stillMode()) list.scrollTo({ top: top, behavior: 'smooth' });
    else list.scrollTop = top;
  }

  // 깬 레벨에서 다음 레벨 등불까지 길을 따라 빛이 한 칸 올라가고(0.6초), 다음 등불에 불이 켜진 뒤 그 레벨이 가운데로 온다
  function advanceLight(from, to) {
    var list = $('mapList');
    var a = list.querySelector('[data-no="' + from + '"]'), b = list.querySelector('[data-no="' + to + '"]');
    if (!a || !b) { centerOn(to, false); return; }
    centerOn(from, false);
    b.classList.add('wait');
    var lr = list.getBoundingClientRect();
    var at = function (el) {
      var r = el.getBoundingClientRect();
      return [r.left - lr.left + r.width / 2, r.top - lr.top + list.scrollTop + r.height / 2];
    };
    var p0 = at(a), p1 = at(b);
    var row = b.parentNode.getBoundingClientRect();
    var mid = [row.left - lr.left + row.width * mapX(from - 0.5) / 100, (p0[1] + p1[1]) / 2];
    var spark = document.createElement('span');
    spark.className = 'map-spark';
    list.appendChild(spark);
    var frames = [p0, mid, p1].map(function (p) { return { transform: 'translate(' + p[0].toFixed(1) + 'px, ' + p[1].toFixed(1) + 'px)' }; });
    spark.style.transform = frames[0].transform;
    if (spark.animate) spark.animate(frames, { duration: 600, easing: 'ease-in-out', fill: 'forwards' });
    SFX.rise();
    advanceTimer = window.setTimeout(function () {
      if (spark.parentNode) spark.parentNode.removeChild(spark);
      b.classList.remove('wait');
      b.classList.add('arrive');
      SFX.lightUp();
      centerOn(to, true);
    }, 600);
  }

  function stillMode() {
    if (save.settings.still) return true;
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }

  // 기기 설정의 '동작 줄이기' 를 켜고 끄면 바로 body.still 을 맞춘다 (설정 '움직임 줄이기' 와 같은 규칙)
  try {
    var reduceMq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    var onReduce = function () { document.body.classList.toggle('still', stillMode()); };
    if (reduceMq && reduceMq.addEventListener) reduceMq.addEventListener('change', onReduce);
    else if (reduceMq && reduceMq.addListener) reduceMq.addListener(onReduce);
  } catch (e) { /* matchMedia 가 없으면 설정 버튼만 쓴다 */ }

  // 누르기는 pointer 이벤트로 받는다: 같은 대상 위에서 눌렀다 떼면 바로 동작하고, 뒤따르는 click 은 거른다.
  // click 은 키보드(엔터·스페이스)로 누를 때만 남는다. pick(요소) 는 누른 대상(없으면 null)을 돌려준다
  function onPress(el, pick, fn) {
    var down = null, firedAt = -1e9;
    el.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      ensureAudio();
      down = { id: e.pointerId, t: pick(e.target) };
    });
    el.addEventListener('pointerup', function (e) {
      var d = down;
      down = null;
      if (!d || d.id !== e.pointerId || !d.t) return;
      if (pick(document.elementFromPoint(e.clientX, e.clientY)) !== d.t) return;   // 손가락을 밖으로 빼고 떼면 그만둠
      firedAt = performance.now();
      fn(d.t);
    });
    el.addEventListener('pointercancel', function () { down = null; });   // 지도를 끌어 넘기면 누르지 않은 것
    el.addEventListener('click', function (e) {
      if (performance.now() - firedAt < 700) return;
      var t = pick(e.target);
      if (!t) return;
      ensureAudio();
      fn(t);
    });
  }

  var mapListEl = $('mapList');
  onPress(mapListEl, function (t) {
    var b = t && t.closest ? t.closest('button[data-no]') : null;
    return b && mapListEl.contains(b) ? b : null;
  }, function (b) {
    startLevel(parseInt(b.getAttribute('data-no'), 10));
  });

  // ---------- 판 상태 ----------

  var P = null;              // 지금 푸는 판
  var cells = [];
  var boardEl = $('board');
  var fingerEl = null;
  var glowEl = $('clearGlow'), holeEl = $('clearHole');   // 완료 장면 겹
  var cursor = 0, showCursor = false;
  var hintMark = null;       // { focus: [], target: [] }
  var msgState = { text: '', cls: '', until: 0 };
  var lastLamp = -1;
  var cellFx = null;         // { i, cls, until } 방금 누른 칸의 짧은 효과 (맞음 반짝임·틀림 흔들림·뺌)
  var msgFx = null;          // { cls, until, fresh } 안내 줄의 짧은 효과 (등불 수 오르내림·걸림 풀림)
  var lastCount = -1, lastBad = 0;

  function newPlay(kind, no, date, b) {
    var N = b.n * b.n, marks = [], auto = [];
    for (var i = 0; i < N; i++) { marks.push(EMPTY); auto.push(-1); }
    return { kind: kind, no: no, date: date, n: b.n, reg: b.reg, sol: b.sol, score: b.score, tut: b.tut || 0, par: b.par || parSeconds(b.n, b.score),
      tech: b.made, marks: marks, auto: auto, hist: [], time: 0, hints: 0, xMode: false, done: false, coach: 0 };
  }

  function storePlay() {
    if (!P) return;
    var slim = { no: P.no, date: P.date, marks: P.marks, auto: P.auto, time: Math.round(P.time), hints: P.hints, xMode: P.xMode };
    if (P.kind === 'level') save.playLevel = P.done ? null : slim;
    else save.playDaily = P.done ? null : slim;
    persist();
  }

  function restore(p, slim) {
    if (!slim || !Array.isArray(slim.marks) || slim.marks.length !== p.marks.length) return p;
    p.marks = slim.marks.slice();
    p.auto = (slim.auto && slim.auto.length === p.marks.length) ? slim.auto.slice() : p.auto;
    p.time = slim.time || 0;
    p.hints = Math.min(HINT_MAX, Math.max(0, +slim.hints || 0));
    p.xMode = !!slim.xMode;
    return p;
  }

  function startLevel(no) {
    var lv = levelBoard(no);
    if (!lv) return;
    var p = newPlay('level', no, '', lv);
    if (save.playLevel && save.playLevel.no === no) p = restore(p, save.playLevel);
    beginPlay(p);
  }

  function startDaily() {
    var d = today();
    // 오늘의 정원 데이터(daily.js)가 없으면 날짜로 고른 8×8 레벨 판을 대신 준다(모두 같은 날 같은 판은 그대로)
    var b = dailyFor(d);
    if (!b) { toast('오늘의 정원을 준비하는 중이에요'); return; }
    var p = newPlay('daily', 0, d, b);
    if (save.playDaily && save.playDaily.date === d) p = restore(p, save.playDaily);
    // 날짜마다 같은 판을 모두 같이 푼다. 기록은 하루 한 번(그날 처음 깬 판)이고, 그 뒤로는 연습 판이다
    p.practice = save.daily.last === d;
    beginPlay(p);
    if (p.practice) toast('오늘 기록은 남겼어요 · 이번 판은 연습이에요');
  }

  function beginPlay(p) {
    cancelClear();
    P = p;
    cursor = 0;
    hintMark = null;
    lastLamp = -1;
    cellFx = null;
    msgFx = null;
    lastCount = -1;
    lastBad = 0;
    msgState = { text: '', cls: '', until: 0 };
    closeAllPanels();
    buildBoard();
    if (P.kind === 'level') {
      $('levelText').textContent = '레벨 ' + P.no;
      var bi = badgeOf(P.score);
      $('badgeText').textContent = BADGES[bi].name;
      $('badgeText').className = 'badge b' + (bi + 1);
      $('dailyMark').hidden = true;
      $('ruleText').textContent = TUTORIAL[P.no] || RULE_ALL;
    } else {
      $('levelText').textContent = '오늘의 정원';
      $('badgeText').textContent = P.date.slice(5).replace('-', '/') + (P.practice ? ' · 연습' : '');
      $('badgeText').className = 'badge daily';
      $('dailyMark').hidden = false;
      $('ruleText').textContent = RULE_ALL;
    }
    if (P.kind === 'level') {
      var stg = stageOf(P.no), lvb = LEVELS[P.no - 1];
      if (P.no === 3 && !coachOn()) {
        setMsg('× 표시를 켜고 칸을 누르면 등불이 못 들어갈 칸에 ×를 찍을 수 있어요.', 'hint', 0);
      } else if (stg && stg.first && P.no > 1) {
        setMsg('새 단계 · ' + stg.n + '×' + stg.n + ' 정원(레벨 ' + stg.from + '~' + stg.to + ') — 판이 커졌어요. 처음 몇 판은 쉬워요.', 'hint', 0);
      } else if (lvb && lvb.breath) {
        setMsg('숨 돌릴 판 — 이번 판은 조금 쉬워요.', 'hint', 0);
      }
    }
    showScreen('play');
    storePlay();
    checkSolved();
  }

  // ---------- 판 그리기 ----------

  function buildBoard() {
    var n = P.n;
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = 'repeat(' + n + ', 1fr)';
    boardEl.style.gridTemplateRows = 'repeat(' + n + ', 1fr)';
    boardEl.classList.remove('won');
    cells = [];
    for (var i = 0; i < n * n; i++) {
      var r = Math.floor(i / n), c = i % n, g = P.reg[i];
      var cell = document.createElement('div');
      cell.className = 'cell p' + (g % COLORS.length);
      cell.setAttribute('data-i', String(i));
      cell.setAttribute('role', 'gridcell');
      cell.style.background = COLORS[g % COLORS.length];
      cell.style.borderTop = edge(r === 0 || P.reg[i - n] !== g);
      cell.style.borderBottom = edge(r === n - 1 || P.reg[i + n] !== g);
      cell.style.borderLeft = edge(c === 0 || P.reg[i - 1] !== g);
      cell.style.borderRight = edge(c === n - 1 || P.reg[i + 1] !== g);
      cell._sig = '';
      boardEl.appendChild(cell);
      cells.push(cell);
    }
    hideClearGlow();
    fingerEl = document.createElement('div');
    fingerEl.className = 'finger';
    fingerEl.innerHTML = FINGER_SVG;
    fingerEl.style.display = 'none';
    boardEl.appendChild(fingerEl);
  }

  function edge(thick) {
    return thick ? '2px solid #10132a' : '1px solid rgba(16, 19, 42, 0.28)';
  }

  function resize() {
    if (!P) return;
    var area = $('boardArea');
    var w = area.clientWidth - 4, h = area.clientHeight - 4;   // 11×11 도 폭 360px 에서 칸 32px
    var size = Math.max(120, Math.min(w, h));
    var cell = Math.floor((size - 4) / P.n);
    var total = cell * P.n + 4;
    boardEl.style.width = total + 'px';
    boardEl.style.height = total + 'px';
    boardEl.style.setProperty('--cell', cell + 'px');
    if (glowEl.classList.contains('on')) placeHole();
  }

  // 칸의 × 와 판 아래 `× 표시` 버튼 아이콘은 같은 엇갈린 잔가지 모양 하나를 쓴다
  var X_SHAPE = '<path d="M6 5.5Q11.2 11.4 18 18.5M18 5.5Q12.8 11.4 6 18.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>' +
    '<circle cx="5.2" cy="4.6" r="1.5" fill="currentColor"/><circle cx="18.8" cy="4.6" r="1.5" fill="currentColor"/>';
  var X_SVG = '<svg class="xmark" viewBox="0 0 24 24" aria-hidden="true">' + X_SHAPE + '</svg>';
  var X_SVG_AUTO = X_SVG.replace('class="xmark"', 'class="xmark auto"');
  var xBtnSvg = document.querySelector('#xBtn svg');
  if (xBtnSvg) xBtnSvg.innerHTML = X_SHAPE;

  // 오늘의 정원 배지:금빛 테두리 남색 원 안에 크림빛 초승달과 매달린 등불 하나, 원 밖은 투명.
  // 시작 화면 `#dailyBtn` 과 풀이 화면 위 띠 `#dailyMark` 가 함께 쓴다
  var DAILY_SVG = '<svg viewBox="0 0 32 32" aria-hidden="true">' +
    '<circle cx="16" cy="16" r="14.6" fill="#1b2448" stroke="#f4c95d" stroke-width="1.6"/>' +
    '<circle cx="11.5" cy="13" r="6" fill="#f3ead0"/>' +
    '<circle cx="14.2" cy="11.2" r="5.2" fill="#1b2448"/>' +
    '<circle cx="8" cy="22.5" r="0.9" fill="#f3ead0"/><circle cx="13" cy="25.2" r="0.7" fill="#f3ead0"/>' +
    '<path d="M21.5 3.6V11" stroke="#c9b78a" stroke-width="1" stroke-linecap="round"/>' +
    '<circle class="glow" cx="21.5" cy="17.2" r="6.4" fill="#f4c95d" opacity="0.28"/>' +
    '<rect x="19.3" y="11" width="4.4" height="1.8" rx="0.8" fill="#5b4535"/>' +
    '<ellipse cx="21.5" cy="17" rx="3.6" ry="4.4" fill="#f4c95d" stroke="#d9952f" stroke-width="0.8"/>' +
    '<ellipse cx="21.1" cy="16.3" rx="1.5" ry="2.2" fill="#fff6d6"/>' +
    '<rect x="20.4" y="21.2" width="2.2" height="1.3" rx="0.6" fill="#5b4535"/>' +
    '</svg>';
  Array.prototype.forEach.call(document.querySelectorAll('.daily-mark'), function (el) { el.innerHTML = DAILY_SVG; });

  // 튜토리얼 손가락:왼쪽 위를 가리키는 둥근 손, 바탕은 투명.
  // 손가락 끝은 그림의 (27.5%, 17.5%) — style.css `.finger` 의 margin 이 그 점을 칸 가운데에 맞춘다. 끝 아래 금빛 고리 `.ring` 은 누를 때 퍼진다.
  var FINGER_SVG = '<svg viewBox="0 0 40 40" aria-hidden="true">' +
    '<circle class="ring" cx="11" cy="7" r="6"/>' +
    '<g transform="rotate(-28 11 7)" stroke="#5b4535" stroke-width="1.3" stroke-linejoin="round">' +
    '<ellipse cx="4.6" cy="23" rx="3.6" ry="5.6" transform="rotate(-20 4.6 23)" fill="#efcfa3"/>' +
    '<rect x="4" y="16" width="20" height="17" rx="7" fill="#f2d7b0"/>' +
    '<path d="M15.5 22q3.2-1.6 6.5 0M15.5 26.6q3.2-1.6 6.5 0" fill="none" stroke="#c99a6e" stroke-linecap="round"/>' +
    '<rect x="7" y="3" width="8" height="19" rx="4" fill="#f8ebd0"/>' +
    '<rect x="9" y="4.6" width="4" height="3.4" rx="1.6" fill="#fff8ea" stroke="none"/>' +
    '</g></svg>';

  // 규칙에 걸린 등불과 그 까닭
  function conflicts() {
    var n = P.n, lamps = [], bad = {}, count = 0;
    for (var i = 0; i < n * n; i++) if (P.marks[i] === LAMP) lamps.push(i);
    for (var a = 0; a < lamps.length; a++) {
      for (var b = a + 1; b < lamps.length; b++) {
        var why = clash(lamps[a], lamps[b]);
        if (!why) continue;
        if (!bad[lamps[a]]) { bad[lamps[a]] = why; count++; }
        if (!bad[lamps[b]]) { bad[lamps[b]] = why; count++; }
      }
    }
    return { lamps: lamps.length, bad: bad, badCount: count };
  }

  function clash(i1, i2) {
    var n = P.n, r1 = Math.floor(i1 / n), c1 = i1 % n, r2 = Math.floor(i2 / n), c2 = i2 % n;
    if (r1 === r2) return '같은 가로줄';
    if (c1 === c2) return '같은 세로줄';
    if (P.reg[i1] === P.reg[i2]) return '같은 꽃밭';
    if (Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1) return '서로 닿음';
    return '';
  }

  function render() {
    if (!P) return null;
    var info = conflicts();
    document.body.classList.toggle('still', stillMode());
    boardEl.classList.toggle('cb', !!save.settings.cb);
    var whyAt = -1;
    if (info.badCount) whyAt = info.bad[lastLamp] ? lastLamp : +Object.keys(info.bad)[0];
    var focus = {}, target = {}, cfocus = {};
    if (hintMark) {
      hintMark.focus.forEach(function (k) { focus[k] = true; });
      hintMark.target.forEach(function (k) { target[k] = true; });
    }
    var step = coachStep();
    if (step) step.focus.forEach(function (k) { cfocus[k] = true; });
    for (var i = 0; i < cells.length; i++) {
      var m = P.marks[i];
      var sig = m + ':' + (P.auto[i] >= 0 ? 'a' : '') + ':' + (i === whyAt ? info.bad[i] : '');
      if (cells[i]._sig !== sig) {
        var html = m === LAMP ? '<span class="lamp"></span>' : (m === CROSS ? (P.auto[i] >= 0 ? X_SVG_AUTO : X_SVG) : '');
        if (i === whyAt) html += '<span class="why">' + info.bad[i] + '</span>';
        cells[i].innerHTML = html;
        cells[i]._sig = sig;
      }
      var cls = 'cell p' + (P.reg[i] % COLORS.length);
      if (info.bad[i]) cls += ' bad';
      if (focus[i]) cls += ' hfocus';
      if (target[i]) cls += ' htarget';
      if (cfocus[i] && !focus[i]) cls += ' cfocus';
      if (showCursor && i === cursor) cls += ' cursor';
      if (P.done && m === LAMP) cls += ' lit';
      if (cellFx && cellFx.i === i && performance.now() < cellFx.until) cls += ' ' + cellFx.cls;
      if (cells[i].className !== cls) cells[i].className = cls;
    }
    noteChange(info);
    var xb = $('xBtn');
    xb.classList.toggle('on', P.xMode);
    xb.setAttribute('aria-pressed', P.xMode ? 'true' : 'false');
    $('xLabel').textContent = P.xMode ? '× 표시 켬' : '× 표시 끔';
    var free = Math.max(0, FREE_HINTS - P.hints), left = Math.max(0, HINT_MAX - P.hints);
    $('hintLabel').textContent = free ? '힌트 (무료 ' + free + ')' : (left ? '힌트 (광고 ' + left + ')' : '힌트 (다 씀)');
    $('hintBtn').classList.toggle('spent', !left);
    xb.classList.toggle('teach', !!step && step.btn === 'xBtn');
    $('hintBtn').classList.toggle('teach', !!step && step.btn === 'hintBtn');
    $('timeText').textContent = fmtTime(P.time);
    renderFinger(step);
    renderCoach(step);
    renderMsg(info);
    return info;
  }

  // ---------- 첫 판 안내 (레벨 1~3) ----------
  // 처음 하는 사람에게 한 번에 한 동작만 알려 준다: 안내 띠 #coach 에 지금 할 일 하나, 누를 칸은 손가락과 빛 테두리(.cfocus),
  // 누를 버튼은 깜빡임(.teach). 그 동작을 하면 다음 단계로 넘어가고(P.coach 는 앞으로만 간다), 마지막 단계는 혼자 풀기다.
  // '다시 보지 않기'(#coachOffBtn)는 save.settings.tutor 를 끄고 저장한다. 설정 #setTutor 로 다시 켠다.
  function coachOn() {
    return !!(P && P.kind === 'level' && P.tut >= 1 && P.tut <= 3 && !P.done && save.settings.tutor);
  }

  function rowCells(r) {
    var out = [];
    for (var c = 0; c < P.n; c++) out.push(r * P.n + c);
    return out;
  }

  function regionCells(g) {
    var out = [];
    for (var i = 0; i < P.reg.length; i++) if (P.reg[i] === g) out.push(i);
    return out;
  }

  function solCell(r) { return r * P.n + P.sol[r]; }

  function hasOwnCross() {
    for (var i = 0; i < P.marks.length; i++) if (P.marks[i] === CROSS && P.auto[i] < 0) return true;
    return false;
  }

  function lampAt(i) { return function () { return P.marks[i] === LAMP; }; }
  function never() { return false; }

  // 레벨마다 단계 목록. 단계 하나 = { text, cell(손가락 칸, 없으면 -1), focus(빛 테두리 칸), btn(깜빡일 버튼 id), done() }
  function coachSteps() {
    var n = P.n, steps = [];
    if (P.tut === 1) {
      for (var r = 0; r < n; r++) {
        var c1 = solCell(r);
        steps.push({
          text: r === 0 ? '손가락이 짚은 칸을 눌러 등불을 놓아 보세요.'
            : '가로줄마다 등불 하나예요. 빛나는 ' + (r + 1) + '번째 줄의 짚은 칸을 눌러요.',
          cell: c1, focus: rowCells(r), btn: '', done: lampAt(c1)
        });
      }
    } else if (P.tut === 2) {
      var a = solCell(0), b = solCell(1);
      steps.push({ text: '색 꽃밭마다 등불 하나예요. 빛나는 꽃밭의 짚은 칸을 눌러요.', cell: a, focus: regionCells(P.reg[a]), btn: '', done: lampAt(a) });
      steps.push({ text: '같은 줄·같은 꽃밭은 피해요. 이번엔 이 꽃밭의 짚은 칸이에요.', cell: b, focus: regionCells(P.reg[b]), btn: '', done: lampAt(b) });
      steps.push({ text: '남은 꽃밭에도 하나씩, 이제 혼자 놓아 봐요. 틀리면 그 칸에 까닭이 떠요.', cell: -1, focus: [], btn: '', done: never });
    } else if (P.tut === 3) {
      var s = solCell(0), sr = 0, sc = P.sol[0], diag = [];
      [[sr + 1, sc - 1], [sr + 1, sc + 1]].forEach(function (rc) {
        if (rc[0] < n && rc[1] >= 0 && rc[1] < n) diag.push(rc[0] * n + rc[1]);
      });
      var xAt = function () {
        for (var k = 0; k < diag.length; k++) if (P.marks[diag[k]] === EMPTY) return diag[k];
        return -1;
      };
      steps.push({ text: '짚은 칸을 눌러 등불을 놓아요.', cell: s, focus: [], btn: '', done: lampAt(s) });
      steps.push({ text: '아래 깜빡이는 × 표시 버튼을 눌러 켜요.', cell: -1, focus: [], btn: 'xBtn', done: function () { return P.xMode || hasOwnCross(); } });
      steps.push({ text: '등불과 대각선으로 닿는 칸에도 등불이 못 와요. 짚은 칸을 눌러 ×를 찍어요.', cell: xAt, focus: diag, btn: '',
        done: function () { return hasOwnCross() || xAt() < 0; } });
      steps.push({ text: '× 표시 버튼을 다시 눌러 꺼요. 꺼야 등불을 놓을 수 있어요.', cell: -1, focus: [], btn: 'xBtn', done: function () { return !P.xMode; } });
      steps.push({ text: '이제 혼자 풀어 봐요. 막히면 힌트(무료 1번)를 눌러요.', cell: -1, focus: [], btn: '', done: never });
    }
    return steps;
  }

  // 지금 단계(이미 한 동작은 건너뛴다). 안내가 꺼졌거나 단계가 끝났으면 null
  function coachStep() {
    if (!coachOn()) return null;
    var steps = coachSteps();
    var before = P.coach = P.coach || 0;
    while (P.coach < steps.length && steps[P.coach].done()) P.coach++;
    if (P.coach >= steps.length) return null;
    var st = steps[P.coach];
    st.no = P.coach + 1;
    st.total = steps.length;
    st.moved = P.coach !== before;
    if (typeof st.cell === 'function') st.cell = st.cell();
    return st;
  }

  function renderCoach(step) {
    var box = $('coach');
    if (!step) { box.hidden = true; return; }
    box.hidden = false;
    var label = '안내 ' + step.no + '/' + step.total;
    if ($('coachStep').textContent !== label) $('coachStep').textContent = label;
    if ($('coachText').textContent !== step.text) $('coachText').textContent = step.text;
    if (step.moved) replay(box, 'fx-next');
  }

  function coachOff() {
    save.settings.tutor = false;
    persist();
    toast('첫 판 안내를 껐어요. 설정에서 다시 켤 수 있어요');
    if (P) render();
  }

  function renderFinger(step) {
    if (!fingerEl) return;
    var at = step && step.cell >= 0 && P.marks[step.cell] !== LAMP ? step.cell : -1;
    if (at < 0) { fingerEl.style.display = 'none'; return; }
    var cell = cells[at];
    fingerEl.style.display = 'block';
    fingerEl.style.left = (cell.offsetLeft + cell.offsetWidth / 2) + 'px';
    fingerEl.style.top = (cell.offsetTop + cell.offsetHeight / 2) + 'px';
  }

  // 짧은 효과: 같은 효과를 잇달아 걸어도 처음부터 다시 돌게 클래스를 뗐다 붙인다
  function replay(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function flashCell(i, cls, ms) {
    cellFx = { i: i, cls: cls, until: performance.now() + ms };
    if (cells[i]) replay(cells[i], cls);
  }

  // 등불 수가 바뀌면 안내 줄을 튀기고(늘면 금빛, 줄면 옅게), 걸린 등불이 모두 풀리면 알린다
  function noteChange(info) {
    if (lastCount >= 0 && !P.done) {
      var until = performance.now() + 600;
      if (lastBad > 0 && info.badCount === 0 && info.lamps > 0) {
        setMsg('좋아요! 이제 걸린 등불이 없어요.', 'ok', 1600);
        SFX.fix();
        msgFx = { cls: 'fx-fix', until: until, fresh: true };
      } else if (info.lamps > lastCount) msgFx = { cls: 'fx-up', until: until, fresh: true };
      else if (info.lamps < lastCount) msgFx = { cls: 'fx-down', until: until, fresh: true };
    }
    lastCount = info.lamps;
    lastBad = info.badCount;
  }

  function setMsg(text, cls, ms) {
    msgState = { text: text, cls: cls || '', until: ms ? performance.now() + ms : 0, sticky: !ms };
  }

  function renderMsg(info) {
    var el = $('msg');
    var text = msgState.text, cls = msgState.cls;
    if (!text || (msgState.until && performance.now() > msgState.until)) {
      if (info.badCount) {
        text = '빨간 등불은 규칙에 걸려요: ' + info.bad[Object.keys(info.bad)[0]] + '.';
        cls = 'bad';
      } else if (P.done) {
        text = '정원이 모두 밝아졌어요!';
        cls = 'hint';
      } else {
        text = '등불 ' + info.lamps + ' / ' + P.n + '개' + (P.xMode ? ' · × 표시 켬: 누르거나 끌어서 × 찍기' : '');
        cls = '';
      }
    }
    if (el.textContent !== text) el.textContent = text;
    var base = 'msg' + (cls ? ' ' + cls : '');
    if (msgFx && msgFx.fresh) { msgFx.fresh = false; el.className = base; void el.offsetWidth; }
    el.className = base + (msgFx && performance.now() < msgFx.until ? ' ' + msgFx.cls : '');
  }

  function fmtTime(sec) {
    var s = Math.floor(sec), m = Math.floor(s / 60), r = s % 60;
    return m + ':' + pad(r);
  }

  // ---------- 조작 ----------

  function isPeer(a, b) {
    return a !== b && clash(a, b) !== '';
  }

  // 한 번의 조작 = 바뀐 칸 묶음 하나 (되돌리기 단위)
  function commit(changes) {
    var batch = [];
    for (var k = 0; k < changes.length; k++) {
      var ch = changes[k];
      var na = ch.a === undefined ? P.auto[ch.i] : ch.a;
      if (P.marks[ch.i] === ch.v && P.auto[ch.i] === na) continue;
      batch.push({ i: ch.i, m: P.marks[ch.i], a: P.auto[ch.i] });
      P.marks[ch.i] = ch.v;
      P.auto[ch.i] = na;
    }
    if (batch.length) P.hist.push(batch);
    return batch.length;
  }

  function placeLamp(i) {
    var ch = [{ i: i, v: LAMP, a: -1 }];
    if (save.settings.autoX) {
      for (var j = 0; j < P.marks.length; j++) {
        if (P.marks[j] === EMPTY && isPeer(i, j)) ch.push({ i: j, v: CROSS, a: i });
      }
    }
    commit(ch);
    lastLamp = i;
    var info = conflicts();
    // 맞음: 칸에 금빛 고리가 번진다 / 틀림: 칸이 빨갛게 흔들린다
    if (info.bad[i]) { SFX.bad(); flashCell(i, 'fx-bad', 420); }
    else { SFX.lamp(); flashCell(i, 'fx-ok', 600); }
  }

  function removeLamp(i) {
    var ch = [{ i: i, v: EMPTY, a: -1 }];
    // 이 등불이 찍은 자동 × 는 함께 거둔다 (다른 등불이 막는 칸이면 그 등불 몫으로 남긴다)
    for (var j = 0; j < P.marks.length; j++) {
      if (P.marks[j] !== CROSS || P.auto[j] !== i) continue;
      var other = -1;
      for (var k = 0; k < P.marks.length; k++) if (k !== i && P.marks[k] === LAMP && isPeer(k, j)) { other = k; break; }
      ch.push(other >= 0 ? { i: j, v: CROSS, a: other } : { i: j, v: EMPTY, a: -1 });
    }
    commit(ch);
    SFX.unlamp();
    flashCell(i, 'fx-off', 400);
  }

  function tapCell(i) {
    if (!P || P.done || i < 0 || i >= P.marks.length) return;
    hintMark = null;
    if (msgState.text && msgState.cls === 'hint') msgState.text = '';
    var m = P.marks[i];
    if (P.xMode) {
      if (m === LAMP) { setMsg('등불은 × 표시를 끄고 눌러야 빠져요.', '', 1800); }
      else { commit([{ i: i, v: m === CROSS ? EMPTY : CROSS, a: -1 }]); SFX.cross(); }
    } else if (m === LAMP) removeLamp(i);
    else placeLamp(i);
    afterChange();
  }

  function afterChange() {
    var info = render();
    storePlay();
    if (info && info.lamps === P.n && info.badCount === 0) win();
  }

  // × 표시 켬 상태에서 누른 채 끌기
  var drag = null;

  function cellAt(x, y) {
    var el = document.elementFromPoint(x, y);
    var c = el && el.closest ? el.closest('.cell') : null;
    if (!c || !boardEl.contains(c)) return -1;
    return parseInt(c.getAttribute('data-i'), 10);
  }

  boardEl.addEventListener('pointerdown', function (e) {
    ensureAudio();
    if (!P || P.done || curPanel) return;
    var i = cellAt(e.clientX, e.clientY);
    if (i < 0 || isNaN(i)) return;
    e.preventDefault();
    showCursor = false;
    cursor = i;
    if (P.xMode && P.marks[i] !== LAMP) {
      var adding = P.marks[i] === EMPTY;
      drag = { adding: adding, seen: {}, batch: [] };
      dragApply(i);
      try { boardEl.setPointerCapture(e.pointerId); } catch (err) { /* 잡지 못해도 끌기는 된다 */ }
      return;
    }
    tapCell(i);
  });

  boardEl.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var i = cellAt(e.clientX, e.clientY);
    if (i >= 0 && !isNaN(i)) dragApply(i);
  });

  function endDrag() {
    if (!drag) return;
    if (drag.batch.length) P.hist.push(drag.batch);
    drag = null;
    afterChange();
  }

  boardEl.addEventListener('pointerup', endDrag);
  boardEl.addEventListener('pointercancel', endDrag);

  function dragApply(i) {
    if (drag.seen[i]) return;
    drag.seen[i] = true;
    var m = P.marks[i];
    if (drag.adding ? m !== EMPTY : m !== CROSS) return;
    drag.batch.push({ i: i, m: m, a: P.auto[i] });
    P.marks[i] = drag.adding ? CROSS : EMPTY;
    P.auto[i] = -1;
    hintMark = null;
    SFX.cross();
    render();
  }

  function toggleX() {
    if (!P || P.done) return;
    P.xMode = !P.xMode;
    SFX.toggle();
    render();
    storePlay();
  }

  function undo() {
    if (!P || P.done) return;
    var batch = P.hist.pop();
    if (!batch) { setMsg('되돌릴 것이 없어요.', '', 1500); render(); return; }
    for (var k = batch.length - 1; k >= 0; k--) { P.marks[batch[k].i] = batch[k].m; P.auto[batch[k].i] = batch[k].a; }
    hintMark = null;
    SFX.undo();
    render();
    storePlay();
  }

  function clearBoard() {
    if (!P || P.done) return;
    var ch = [];
    for (var i = 0; i < P.marks.length; i++) ch.push({ i: i, v: EMPTY, a: -1 });
    if (commit(ch)) setMsg('판을 비웠어요. 되돌리기로 살릴 수 있어요.', '', 2200);
    hintMark = null;
    render();
    storePlay();
  }

  // ---------- 힌트 ----------

  function hintsUsedUp() {
    if (P.hints < HINT_MAX) return false;
    setMsg('이 판의 힌트 ' + HINT_MAX + '번을 다 썼어요. 되돌리기와 × 표시로 풀어 봐요.', '', 2600);
    render();
    return true;
  }

  function askHint() {
    if (!P || P.done || hintsUsedUp()) return;
    if (P.hints < FREE_HINTS) { giveHint(); return; }
    openPanel('reward');
  }

  // 힌트 한 번 쓰기: 횟수를 세고 걸린 시간에 20초를 더한다
  function useHint() {
    P.hints++;
    P.time += HINT_PENALTY;
    $('timeText').textContent = fmtTime(P.time);
    toast('힌트 ' + P.hints + '/' + HINT_MAX + ' · 시간 +' + HINT_PENALTY + '초');
  }

  // 답 자리가 아닌 등불 (그 가로줄의 답 칸이 아닌 곳에 놓인 등불)
  function wrongLamps() {
    var n = P.n, out = [];
    for (var i = 0; i < n * n; i++) if (P.marks[i] === LAMP && i % n !== P.sol[Math.floor(i / n)]) out.push(i);
    return out;
  }

  function giveHint() {
    if (!P || P.done || hintsUsedUp()) return;
    if (!LG) { setMsg('힌트를 준비하는 중이에요.', '', 2000); render(); return; }
    var n = P.n;
    // 틀린 등불이 있으면 그것부터 치운다 (한 번에 모두, 되돌리기 한 번으로 살릴 수 있다)
    var wrong = wrongLamps();
    if (wrong.length) {
      var ch = [];
      for (var w = 0; w < wrong.length; w++) {
        var wi = wrong[w];
        ch.push({ i: wi, v: EMPTY, a: -1 });
        // 치운 등불이 찍은 자동 × 도 거둔다 (남은 등불이 막는 칸이면 그 등불 몫으로 남긴다)
        for (var j = 0; j < P.marks.length; j++) {
          if (P.marks[j] !== CROSS || P.auto[j] !== wi) continue;
          var other = -1;
          for (var k = 0; k < P.marks.length; k++) {
            if (P.marks[k] === LAMP && wrong.indexOf(k) < 0 && isPeer(k, j)) { other = k; break; }
          }
          ch.push(other >= 0 ? { i: j, v: CROSS, a: other } : { i: j, v: EMPTY, a: -1 });
        }
      }
      commit(ch);
      useHint();
      hintMark = { focus: wrong.slice(), target: [] };
      setMsg('힌트: 자리가 맞지 않는 등불 ' + wrong.length + '개를 치웠어요. 표시한 칸에는 등불이 들어가지 않아요.', 'hint', 0);
      SFX.hint();
      flashCell(wrong[0], 'fx-off', 400);
      render();
      storePlay();
      return;
    }
    // × 를 등불 자리에 찍었으면 먼저 알려 준다 (어느 칸인지가 아니라 어느 줄인지)
    for (var r = 0; r < n; r++) {
      var at = r * n + P.sol[r];
      if (P.marks[at] === CROSS) {
        var row = [];
        for (var c = 0; c < n; c++) row.push(r * n + c);
        useHint();
        hintMark = { focus: row, target: [] };
        setMsg('이 가로줄의 × 가운데 등불이 들어갈 칸이 있어요. × 를 다시 살펴봐요.', 'hint', 0);
        SFX.hint();
        render();
        storePlay();
        return;
      }
    }
    // 풀이기는 단계마다 칸 수만큼만 돈다. 그래도 깨진 판 등으로 예외가 나면 아래 대체 힌트(등불 없는 가로줄)로 간다
    var step = null;
    try { step = LG.hintStep(n, P.reg, P.sol, P.marks); } catch (e) { step = null; }
    if (!step) {
      // 추리 단계를 못 찾아도 막히지 않게: 아직 등불이 없는 가로줄 하나를 짚어 준다(답 칸은 찍지 않는다)
      for (var r2 = 0; r2 < n; r2++) {
        if (P.marks[r2 * n + P.sol[r2]] === LAMP) continue;
        var line = [];
        for (var c2 = 0; c2 < n; c2++) line.push(r2 * n + c2);
        useHint();
        hintMark = { focus: line, target: [] };
        setMsg('힌트: 이 가로줄에 아직 등불이 없어요. 이 줄의 빈칸을 하나씩 따져 봐요.', 'hint', 0);
        SFX.hint();
        render();
        storePlay();
        return;
      }
      setMsg('지금은 더 알려 줄 추리가 없어요.', '', 2000); render(); return;
    }
    useHint();
    hintMark = { focus: step.focus || [], target: (step.place || []).concat(step.elim || []) };
    setMsg('힌트: ' + step.msg, 'hint', 0);
    SFX.hint();
    render();
    storePlay();
  }

  // ---------- 광고 자리 (실제 광고는 출시 때 붙인다) ----------

  var adTimer = 0, adLeft = 0, adThen = null, adUntil = 0;

  function showAd(then) {
    adThen = then;
    adLeft = AD_SECONDS;
    adUntil = Date.now() + AD_SECONDS * 1000;   // 초 세기 타이머가 밀려도(탭 숨김 등) 이 시각이 지나면 닫을 수 있다
    openPanel('ad');
    tickAd();
  }

  function tickAd() {
    if (adLeft > 0 && Date.now() >= adUntil) adLeft = 0;
    var btn = $('adCloseBtn');
    btn.disabled = adLeft > 0;
    btn.textContent = adLeft > 0 ? '닫기 (' + adLeft + ')' : '닫기';
    window.clearTimeout(adTimer);
    if (adLeft > 0) adTimer = window.setTimeout(function () { adLeft--; tickAd(); }, 1000);
  }

  function closeAd() {
    if (adLeft > 0 && Date.now() < adUntil) return;
    adLeft = 0;
    window.clearTimeout(adTimer);
    closePanel();
    var f = adThen;
    adThen = null;
    if (f) f();
  }

  // ---------- 완료 ----------

  // 그 판의 목표 시간 (levels.js 판마다, 풀이기 난이도로 정한 값)
  function parTime() {
    return P.par;
  }

  // 추리 풀이기가 이 판을 푼 길: 가장 어려운 기법·추리 단계 수·난이도 점수 (levels.js 4~6번째 값).
  // 값이 없는 판(오늘의 정원)은 한 번만 logic.js solveLogic 으로 풀어 얻는다(단계 상한 칸 수 + 1)
  var TECH_MARK = ['', '①', '②', '③', '④', '⑤'];
  function techOf(p) {
    if (p.tech === undefined) {
      var lv = p.kind === 'level' ? LEVELS[p.no - 1] : null;
      p.tech = null;
      if (lv && lv.maxTech) p.tech = { max: lv.maxTech, steps: lv.steps };
      else if (LG) {
        try {
          var res = LG.solveLogic(p.n, p.reg);
          if (res.solved) p.tech = { max: res.maxTech, steps: res.steps };
        } catch (e) { p.tech = null; }
      }
    }
    return p.tech;
  }
  function techText(p) {
    var t = techOf(p);
    if (!t || !TECH_MARK[t.max]) return '';
    var name = LG && LG.TECH_NAMES ? ' ' + LG.TECH_NAMES[t.max] : '';
    return '이 판의 추리: 기법 ' + TECH_MARK[t.max] + name + '까지 · ' + t.steps + '단계 · 난이도 점수 ' + p.score + ' (' + BADGES[badgeOf(p.score)].name + ')';
  }

  // 별 1개: 깼다. 별 2개: 힌트 없이 깼다. 별 3개: 힌트 없이, 목표 시간 안에 깼다
  function starsFor() {
    if (P.hints > 0) return 1;
    return P.time <= parTime() ? 3 : 2;
  }

  function win() {
    P.done = true;
    hintMark = null;
    var stars = starsFor();
    var streak = 0;
    var sec = Math.round(P.time);
    var rec = { first: false, newTime: false, newStars: false };
    if (P.kind === 'level') {
      var oldStars = save.stars[P.no] || 0, oldTime = save.best[P.no] || 0;
      rec.first = !oldStars;
      rec.newStars = !rec.first && stars > oldStars;
      rec.newTime = !rec.first && sec < oldTime;
      if (stars > oldStars) save.stars[P.no] = stars;
      if (!oldTime || sec < oldTime) save.best[P.no] = sec;
      save.clears++;
      save.playLevel = null;
    } else {
      var d = P.date;
      // 오늘의 정원 기록은 하루 한 번: 그날 처음 깬 판의 시간만 남고, 그 뒤 판(연습)은 기록·연속 일수를 바꾸지 않는다
      if (!P.practice && save.daily.last !== d) {
        save.daily.timeDate = d;
        save.daily.time = sec;
        rec.first = true;
        save.stats.days++;
        var gap = save.daily.last ? dayNumber(d) - dayNumber(save.daily.last) : 99;
        save.daily.streak = gap === 1 ? save.daily.streak + 1 : 1;
        save.daily.last = d;
        if (save.daily.streak > save.daily.best) save.daily.best = save.daily.streak;
      }
      streak = save.daily.streak;
      save.playDaily = null;
    }
    if (P.kind === 'level' && !P.hints && P.time <= parTime() / 2) save.swift++;
    var sts = save.stats;
    sts.wins++;
    if (P.kind === 'level') sts.levelWins++; else sts.dailyWins++;
    sts.timed++;
    sts.time += sec;
    if (!P.hints) sts.noHint++;
    rec.ach = checkAch();
    persist();
    mapBuiltFor = '';
    render();
    SFX.win();
    // 등불이 하나씩 차례로 밝아지고 정원 전체가 환해지며 판 둘레에서 반딧불이 떠오른다 (1.5초)
    var lampsAt = [];
    for (var i = 0; i < P.marks.length; i++) if (P.marks[i] === LAMP) lampsAt.push(i);
    lampsAt.forEach(function (k, idx) {
      var el = cells[k].querySelector('.lamp');
      if (el) el.style.animationDelay = (idx * (1.0 / lampsAt.length)) + 's';
    });
    boardEl.classList.add('won');
    showClearGlow();
    // 판이 끝나면 반드시 완료 창(결과 화면)으로 간다. 연출 중에 뒤로 가기를 눌러도 완료 창을 먼저 띄운다(playBackBtn)
    cancelClear();
    clearPending = { stars: stars, streak: streak, rec: rec };
    clearTimer = window.setTimeout(flushClear, stillMode() ? 300 : 1500);
  }

  var clearPending = null, clearTimer = 0;

  function cancelClear() {
    window.clearTimeout(clearTimer);
    clearTimer = 0;
    clearPending = null;
  }

  function flushClear() {
    var c = clearPending;
    cancelClear();
    if (!c || !P || !P.done) return;
    if (curScreen !== 'play') showScreen('play');
    showClear(c.stars, c.streak, c.rec);
  }

  // 판이 이미 다 풀린 채로 열렸으면(저장 직후 앱이 닫힌 경우 등) 바로 끝낸다
  function checkSolved() {
    if (!P || P.done) return;
    var info = conflicts();
    if (info.lamps === P.n && info.badCount === 0) win();
  }

  // 완료 장면: 판 자리(가운데)는 비워 두고, 판 둘레에서 반딧불이 떠오르며 풀이 화면 전체에 금빛이 번진다
  function showClearGlow() {
    placeHole();
    glowEl.classList.add('on');
    if (!stillMode()) spawnFireflies();
  }

  function hideClearGlow() {
    glowEl.classList.remove('on');
    clearFlies();
  }

  function clearFlies() {
    var flies = glowEl.querySelectorAll('.fly');
    for (var i = 0; i < flies.length; i++) glowEl.removeChild(flies[i]);
  }

  function placeHole() {
    var g = glowEl.getBoundingClientRect(), b = boardEl.getBoundingClientRect();
    holeEl.style.left = (b.left - g.left) + 'px';
    holeEl.style.top = (b.top - g.top) + 'px';
    holeEl.style.width = b.width + 'px';
    holeEl.style.height = b.height + 'px';
  }

  function spawnFireflies() {
    clearFlies();
    var x = parseFloat(holeEl.style.left) || 0, y = parseFloat(holeEl.style.top) || 0;
    var w = parseFloat(holeEl.style.width) || 0, h = parseFloat(holeEl.style.height) || 0;
    for (var k = 0; k < 24; k++) {
      var side = k % 4, t = Math.random(), out = 6 + Math.random() * 22;
      var px = side === 0 ? x + t * w : side === 1 ? x + w + out : side === 2 ? x + t * w : x - out;
      var py = side === 0 ? y + h + out : side === 1 ? y + t * h : side === 2 ? y - out : y + t * h;
      var f = document.createElement('span');
      f.className = 'fly';
      f.style.left = px + 'px';
      f.style.top = py + 'px';
      f.style.animationDelay = (Math.random() * 0.5) + 's';
      glowEl.appendChild(f);
    }
  }

  function showClear(stars, streak, rec) {
    if (!P || curScreen !== 'play') return;
    rec = rec || {};
    var host = $('clearStars');
    host.setAttribute('aria-label', '별 ' + stars + '개');
    var hintText = P.hints ? '힌트 ' + P.hints + '번(+' + (P.hints * HINT_PENALTY) + '초)' : '힌트 없이';
    var bestText, isNew = !!(rec.newTime || rec.newStars);
    if (P.kind === 'level') {
      $('clearTitle').textContent = '레벨 ' + P.no + ' 정원이 밝아졌어요';
      $('clearText').textContent = '별 ' + stars + '개 · ' + hintText + ' (별 셋: 힌트 없이 ' + fmtTime(parTime()) + ' 안에)';
      bestText = '별 ' + (save.stars[P.no] || stars) + '개 · ' + fmtTime(save.best[P.no] || P.time) + (rec.first ? ' (첫 기록)' : '');
      var more = P.no < LEVELS.length;
      $('nextBtn').textContent = more ? '다음 레벨' : '지도';
      $('nextBtn').hidden = false;
      $('clearMapBtn').hidden = false;
    } else {
      $('clearTitle').textContent = P.practice ? '연습 판을 밝혔어요' : '오늘의 정원을 밝혔어요';
      $('clearText').textContent = '별 ' + stars + '개 · ' + hintText + ' · 연속 ' + streak + '일';
      bestText = '오늘 기록 ' + fmtTime(save.daily.time || P.time) + ' · 최고 연속 ' + save.daily.best + '일' +
        (P.practice ? ' · 연습 판은 기록에 남지 않아요' : ' (오늘의 기록)');
      // 오늘의 정원은 다음 판이 없다: 다시 하기·처음으로만 둔다
      $('nextBtn').hidden = true;
      $('clearMapBtn').hidden = true;
    }
    $('clearBestText').textContent = bestText;
    $('clearNew').hidden = !isNew;
    var newAch = rec.ach || [];
    $('clearAch').hidden = !newAch.length;
    $('clearAchText').textContent = newAch.map(function (a) { return a.name; }).join(' · ');
    $('clearTech').textContent = techText(P);
    shareStars = stars;
    $('shareBox').hidden = true;
    openPanel('clear');
    // 별을 왼쪽부터 하나씩 박고(clear_fx.js), 마지막 별 뒤에 걸린 시간을 0부터 올린다
    var total = P.time;
    $('clearScore').textContent = fmtTime(0);
    if (window.ClearFx) {
      window.ClearFx.play({
        host: host, stars: stars, still: stillMode(), screen: $('app'), flash: $('slamFlash'),
        countTo: total,
        onLand: function (k) { SFX.slam(k); },
        onFinale: function () { SFX.fanfare(); },
        onCount: function (v, done) { $('clearScore').textContent = fmtTime(done ? total : v); }
      });
      wake();
    } else {
      host.innerHTML = '<span class="stars">' + starsHtml(stars) + '</span>';
      $('clearScore').textContent = fmtTime(total);
    }
  }

  // ---------- 결과 복사 (G-27) ----------

  var shareStars = 0;

  // 결과 화면의 결과 문구: 이름·판·별·걸린 시간·힌트(오늘의 정원은 연속 일수)
  function shareMessage() {
    if (!P) return '';
    var starLine = '';
    for (var k = 0; k < 3; k++) starLine += k < shareStars ? '★' : '☆';
    var head = P.kind === 'level'
      ? '레벨 ' + P.no + ' (' + P.n + '×' + P.n + ')'
      : (P.practice ? '오늘의 정원 연습 ' : '오늘의 정원 ') + P.date;
    var tail = P.hints ? '힌트 ' + P.hints + '번' : '힌트 없이';
    if (P.kind !== 'level' && !P.practice) tail += ' · 연속 ' + save.daily.streak + '일';
    return 'Lantern Garden 등불 정원 — ' + head + '\n' + starLine + ' ' + fmtTime(P.time) + ' · ' + tail;
  }

  // 클립보드에 쓰고, 막히면(권한·보안 연결 아님·옛 브라우저) 글 상자를 보여 주고 골라 둔다
  function shareResult() {
    if (curPanel !== 'clear') return;
    var text = shareMessage();
    var box = $('shareText');
    box.value = text;
    var fallback = function () {
      $('shareBox').hidden = false;
      try { box.focus(); box.select(); box.setSelectionRange(0, text.length); } catch (e) {}
      var ok = false;
      try { ok = document.execCommand && document.execCommand('copy'); } catch (e) { ok = false; }
      $('shareNote').textContent = ok
        ? '복사했어요. 같은 글을 아래에도 둘게요.'
        : '복사가 막혀 있어요. 아래 글을 길게 눌러(또는 Ctrl+C) 복사해 주세요.';
      if (ok) toast('결과를 복사했어요');
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext !== false) {
        navigator.clipboard.writeText(text).then(function () {
          $('shareBox').hidden = true;
          toast('결과를 복사했어요');
        }, fallback);
        return;
      }
    } catch (e) {}
    fallback();
  }

  // 결과 화면 `다시 하기`: 같은 판을 빈 판·0:00·힌트 0 으로 처음부터 (별·최고 기록은 더 좋을 때만 바뀐다)
  function retryClear() {
    if (!P) return;
    var p = P;
    closeAllPanels();
    if (p.kind === 'level') {
      save.playLevel = null;
      startLevel(p.no);
    } else {
      var b = dailyFor(p.date);
      if (!b) { showScreen('start'); return; }
      save.playDaily = null;
      var np = newPlay('daily', 0, p.date, b);
      np.practice = save.daily.last === p.date;
      beginPlay(np);
    }
  }

  function afterClear() {
    if (!P) return;
    var p = P;
    closeAllPanels();
    var go = function () {
      if (p.kind === 'daily') { showScreen('start'); return; }
      if (p.no < LEVELS.length) startLevel(p.no + 1);
      else { mapAdvance = p.no; showScreen('map'); }
    };
    if (p.kind === 'level' && p.no >= AD_FROM_LEVEL && save.clears % AD_EVERY === 0) showAd(go);
    else go();
  }

  // ---------- 설정 ----------

  function renderSettings() {
    var st = save.settings;
    setToggle('setSound', st.sound);
    setToggle('setAutoX', st.autoX);
    setToggle('setCb', st.cb);
    setToggle('setStill', st.still);
    setToggle('setTutor', st.tutor);
    $('setClearBoard').disabled = !(P && curScreen === 'play' && !P.done);
  }

  function setToggle(id, on) {
    var b = $(id);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    var bold = b.querySelector('b');
    if (bold) bold.textContent = on ? '켬' : '끔';
  }

  function flip(key) {
    save.settings[key] = !save.settings[key];
    persist();
    if (key === 'sound') { if (save.settings.sound) ensureAudio(); else suspendAudio(); }
    document.body.classList.toggle('still', stillMode());
    renderSettings();
    if (P) render();
  }

  // 기록 지우기는 확인 창(#resetPanel)에서 '모두 지우기' 를 한 번 더 눌러야 한다
  function askReset() {
    openPanel('reset');
  }

  function resetAll() {
    if (curPanel !== 'reset') return;
    var keepSettings = save.settings;
    save = blankSave();
    save.settings = keepSettings;
    persist();
    mapBuiltFor = '';
    cancelClear();
    P = null;
    closeAllPanels();
    showScreen('start');
    toast('기록을 지웠어요');
  }

  function openSettings() {
    renderSettings();
    openPanel('settings');
  }

  // ---------- 버튼 ----------

  function on(id, fn) {
    var el = $(id);
    onPress(el, function (t) {
      return t && el.contains(t) ? el : null;
    }, function () {
      fn();
      if (el.blur) el.blur();
    });
  }

  on('playBtn', function () {
    if (save.playLevel && LEVELS[save.playLevel.no - 1]) startLevel(save.playLevel.no);
    else showScreen('map');
  });
  on('dailyBtn', startDaily);
  on('startHowBtn', function () { openPanel('how'); });
  on('startAchBtn', openAch);
  on('achCloseBtn', closePanel);
  on('startStatsBtn', openStats);
  on('statsCloseBtn', closePanel);
  on('startSetBtn', openSettings);
  on('mapBackBtn', function () { showScreen('start'); });
  on('mapSetBtn', openSettings);
  on('playBackBtn', function () {
    if (P && P.done && clearPending) { flushClear(); return; }
    storePlay();
    if (P && P.kind === 'daily') showScreen('start');
    else showScreen('map');
  });
  on('playSetBtn', openSettings);
  on('pauseBtn', pauseGame);
  on('pauseResumeBtn', resumeGame);
  on('pauseSetBtn', openSettings);
  on('pauseMapBtn', leavePause);
  on('undoBtn', undo);
  on('xBtn', toggleX);
  on('hintBtn', askHint);
  on('nextBtn', afterClear);
  on('clearMapBtn', function () {
    closeAllPanels();
    if (P && P.kind === 'level') mapAdvance = P.no;
    showScreen(P && P.kind === 'daily' ? 'start' : 'map');
  });
  on('retryBtn', retryClear);
  on('shareBtn', shareResult);
  on('clearHomeBtn', function () {
    closeAllPanels();
    showScreen('start');
  });
  on('adCloseBtn', closeAd);
  on('rewardBtn', function () { closePanel(); showAd(giveHint); });
  on('rewardNoBtn', closePanel);
  on('setSound', function () { flip('sound'); });
  on('setAutoX', function () { flip('autoX'); });
  on('setCb', function () { flip('cb'); });
  on('setStill', function () { flip('still'); });
  on('setTutor', function () { flip('tutor'); });
  on('coachOffBtn', coachOff);
  on('setClearBoard', function () { closeAllPanels(); clearBoard(); });
  on('setHow', function () { openPanel('how'); });
  on('setNoAds', function () { toast('광고 제거는 준비 중이에요'); });
  on('setReset', askReset);
  on('resetNoBtn', closePanel);
  on('resetYesBtn', resetAll);
  on('setCloseBtn', closePanel);
  on('howCloseBtn', closePanel);

  // ---------- 키보드 ----------

  // 창·화면마다 정한 키. 탭 키로 고른 버튼 위에서 엔터·스페이스는 그 버튼이 받는다(가로채지 않음)
  function onButton() {
    var a = document.activeElement;
    return !!(a && a.tagName === 'BUTTON');
  }

  function isKey(e, list) {
    return list.indexOf(e.key) >= 0;
  }

  var OK_KEYS = ['Enter', ' '];

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // 누르고 있어 되풀이되는 키는 방향키만 받는다(엔터를 누른 채 완료 창을 건너뛰지 않게)
    if (e.repeat && String(e.key || '').indexOf('Arrow') !== 0) { if (!onButton()) e.preventDefault(); return; }
    if (curPanel === 'how' || curPanel === 'settings' || curPanel === 'reset' || curPanel === 'ach' || curPanel === 'stats') {
      if (e.key === 'Escape' || (curPanel === 'ach' && (e.key === 'a' || e.key === 'A')) || (curPanel === 'stats' && (e.key === 't' || e.key === 'T'))) { closePanel(); e.preventDefault(); }
      else if ((curPanel === 'ach' || curPanel === 'stats') && isKey(e, OK_KEYS) && !onButton()) { closePanel(); e.preventDefault(); }
      else if (e.key === '?' && curPanel === 'settings') { openPanel('how'); e.preventDefault(); }
      else if (curPanel === 'how' && isKey(e, OK_KEYS) && !onButton()) { closePanel(); e.preventDefault(); }
      return;
    }
    if (curPanel === 'pause') {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P' || (isKey(e, OK_KEYS) && !onButton())) { resumeGame(); e.preventDefault(); }
      else if (e.key === 's' || e.key === 'S') { openSettings(); e.preventDefault(); }
      else if (e.key === 'q' || e.key === 'Q') { leavePause(); e.preventDefault(); }
      return;
    }
    if (curPanel === 'clear') {
      // 엔터·스페이스 다음 레벨(오늘의 정원은 처음으로), R 다시 하기, M 지도, C 결과 복사, Esc 처음으로
      // 결과 글 상자 안에서는 Esc 말고는 상자가 받는다(골라서 복사할 수 있게)
      if (document.activeElement && document.activeElement.id === 'shareText' && e.key !== 'Escape') return;
      var handledClear = true;
      if (e.key === 'c' || e.key === 'C') shareResult();
      else if (isKey(e, OK_KEYS)) {
        if (onButton()) return;
        if (P && P.kind === 'level') afterClear();
        else { closeAllPanels(); showScreen('start'); }
      } else if (e.key === 'r' || e.key === 'R') retryClear();
      else if ((e.key === 'm' || e.key === 'M') && P && P.kind === 'level') { closeAllPanels(); showScreen('map'); }
      else if (e.key === 'Escape') { closeAllPanels(); showScreen('start'); }
      else handledClear = false;
      if (handledClear) e.preventDefault();
      return;
    }
    if (curPanel === 'ad') {
      // 초 세기가 끝난 뒤에만 닫힌다(closeAd 가 본다)
      if (e.key === 'Escape' || (isKey(e, OK_KEYS) && !onButton())) { closeAd(); e.preventDefault(); }
      return;
    }
    if (curPanel === 'reward') {
      if (e.key === 'Escape' || e.key === 'n' || e.key === 'N') { closePanel(); e.preventDefault(); }
      else if ((isKey(e, OK_KEYS) && !onButton()) || e.key === 'h' || e.key === 'H') { closePanel(); showAd(giveHint); e.preventDefault(); }
      return;
    }
    if (curPanel) return;
    if ((e.key === 'p' || e.key === 'P') && pauseGame()) { e.preventDefault(); return; }
    // ? 는 어느 화면에서나 방법 창, S 는 설정 창 (다 푼 뒤 완료 연출 중에는 빼고)
    if (curScreen === 'play' && P && P.done && clearPending && e.key !== 'Escape') return;
    if (e.key === '?') { openPanel('how'); e.preventDefault(); return; }
    if (e.key === 's' || e.key === 'S') { openSettings(); e.preventDefault(); return; }
    if (curScreen === 'start') {
      // 엔터·스페이스 시작(이어하기), D 오늘의 정원
      if (isKey(e, OK_KEYS) && !onButton()) {
        ensureAudio();
        if (save.playLevel && LEVELS[save.playLevel.no - 1]) startLevel(save.playLevel.no);
        else showScreen('map');
        e.preventDefault();
      } else if (e.key === 'd' || e.key === 'D') { ensureAudio(); startDaily(); e.preventDefault(); }
      else if (e.key === 'a' || e.key === 'A') { openAch(); e.preventDefault(); }
      else if (e.key === 't' || e.key === 'T') { openStats(); e.preventDefault(); }
      return;
    }
    if (curScreen === 'map') {
      // 엔터·스페이스 지금 레벨(풀던 판이 있으면 그 판), Esc 시작 화면
      if (isKey(e, OK_KEYS) && !onButton()) {
        ensureAudio();
        startLevel(save.playLevel && LEVELS[save.playLevel.no - 1] ? save.playLevel.no : nextLevelNo());
        e.preventDefault();
      } else if (e.key === 'Escape') { showScreen('start'); e.preventDefault(); }
      return;
    }
    if (curScreen !== 'play' || !P) return;
    if (e.key === 'Escape') {
      // 풀이 중 Esc 는 일시정지, 다 푼 뒤 연출 중이면 완료 창을 바로 띄운다
      if (P.done && clearPending) flushClear();
      else pauseGame();
      e.preventDefault();
      return;
    }
    if (onButton() && isKey(e, OK_KEYS)) return;
    var n = P.n, r = Math.floor(cursor / n), c = cursor % n, handled = true;
    switch (e.key) {
      case 'ArrowUp': r = Math.max(0, r - 1); break;
      case 'ArrowDown': r = Math.min(n - 1, r + 1); break;
      case 'ArrowLeft': c = Math.max(0, c - 1); break;
      case 'ArrowRight': c = Math.min(n - 1, c + 1); break;
      case ' ':
      case 'Enter':
        ensureAudio();
        showCursor = true;
        tapCell(cursor);
        e.preventDefault();
        return;
      case 'x': case 'X': toggleX(); break;
      case 'z': case 'Z': undo(); break;
      case 'h': case 'H': askHint(); break;
      default: handled = false;
    }
    if (handled) {
      e.preventDefault();
      cursor = r * n + c;
      showCursor = true;
      render();
    }
  });

  // ---------- 시간 ----------

  var lastTick = 0;
  // 움직이는 화면은 이 requestAnimationFrame 고리 하나로 그린다(G-29). 풀이 시간이 흐르거나 완료 창 연출이
  // 움직일 때만 다음 프레임을 걸고, 멈추면(창·일시정지·시작·지도 화면·숨은 탭·연출 끝) 고리를 쉰다.
  // 다시 움직일 수 있는 때(화면·창이 바뀔 때, 이어하기, 탭이 돌아올 때, 연출 시작)에 wake() 가 고리를 다시 건다.
  // 고리 하나가 예외로 끊기면 시간·연출이 멈추므로, 예외가 나면 다음 프레임을 건다(finally).
  // 연출(ClearFx)이 잇달아 예외를 내면 FX_FAIL_MAX 번 뒤로는 연출을 건너뛰고 완료 창은 그대로 쓴다
  var FX_FAIL_MAX = 3, fxFails = 0;
  var rafId = 0;
  function frameNow() { return window.performance && performance.now ? performance.now() : 0; }
  function wake() {
    if (rafId) return;
    lastTick = frameNow();
    rafId = window.requestAnimationFrame(tick);
  }
  function tick(now) {
    rafId = 0;
    var again = true;
    try {
      var running = !!(curScreen === 'play' && P && !P.done && !curPanel && !document.hidden);
      if (running) {
        var dt = (now - lastTick) / 1000;
        if (dt > 0 && dt < 1) P.time += dt;
        var t = fmtTime(P.time);
        var te = $('timeText');
        if (te.textContent !== t) te.textContent = t;
        if (msgState.until && now > msgState.until) { msgState.text = ''; msgState.until = 0; render(); }
      }
      var fxBusy = false;
      if (window.ClearFx && fxFails < FX_FAIL_MAX) {   // 완료 창 별 박기 연출도 이 한 고리에서 그린다
        try { window.ClearFx.step(now); fxBusy = window.ClearFx.busy(); } catch (e) { fxFails++; fxBusy = fxFails < FX_FAIL_MAX; }
      }
      again = running || fxBusy;
    } finally {
      lastTick = now;
      if (again && !rafId) rafId = window.requestAnimationFrame(tick);
    }
  }

  document.addEventListener('visibilitychange', function () {
    // 탭이 숨겨지면 풀던 판을 저장하고 일시정지 창을 띄운다. 돌아와도 이어하기를 눌러야 시간이 다시 흐른다
    if (document.hidden) { if (!pauseGame()) storePlay(); suspendAudio(); }
    else { ensureAudio(); wake(); }
  });
  window.addEventListener('pagehide', storePlay);
  window.addEventListener('resize', function () { if (curScreen === 'play') { resize(); render(); } if (curScreen === 'start') fitStartArt(); });
  window.addEventListener('orientationchange', function () { if (curScreen === 'play') { resize(); render(); } if (curScreen === 'start') fitStartArt(); });
  // 창 크기는 그대로인데 판 자리만 바뀔 때(안내 글이 두세 줄로 늘어 판 자리가 줄 때 등)도 판을 다시 맞춘다.
  // 판 자리(.board-area)는 flex: 1 이라 판 크기가 자리 크기를 바꾸지 않는다(되먹임 없음)
  if (window.ResizeObserver) {
    new ResizeObserver(function () { if (curScreen === 'play') resize(); }).observe($('boardArea'));
    // 시작 화면 글(오늘 기록 등)이 늘어 풍경 자리가 줄어도 달 자리를 다시 맞춘다
    if (startSky) new ResizeObserver(function () { if (curScreen === 'start') fitStartArt(); }).observe(startSky);
  }

  // ---------- 처음 ----------

  loadSave();
  if (checkAch().length) persist();     // 업적이 생기기 전에 쌓은 기록도 업적으로 센다
  showScreen('start');
})();
