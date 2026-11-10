/* 내일 가방 — 저장·불러오기·내보내기·가져오기 */
var Store = (function () {
  var KEY = 'tomorrowbag.v1';
  var MAX_NAME = 30;

  function uid(p) {
    return (p || 'x') + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  }

  function emptyWeek(periods) {
    var w = {};
    for (var d = 1; d <= 5; d++) {
      var p = [];
      for (var i = 0; i < periods; i++) p.push(null);
      w[d] = { p: p, after: [] };
    }
    return w;
  }

  function copyPacks() {
    var out = [];
    DATA.SUBJECTS.forEach(function (s) { out.push({ id: s.id, kind: 'subj', name: s.name, icon: s.icon, pic: s.pic, c: s.c, items: s.items.slice() }); });
    DATA.ACADEMIES.forEach(function (s) { out.push({ id: s.id, kind: 'acad', name: s.name, icon: s.icon, pic: s.pic, items: s.items.slice() }); });
    return out;
  }

  function defaults() {
    return {
      v: 1,
      kids: [],
      cur: null,
      packs: copyPacks(),
      daily: DATA.DAILY.slice(),
      morning: ['물병', '도시락', '간식'],                   // 아침에 넣을 물건 (밤에는 남아도 다 챙긴 것으로 친다)
      stay: [],                                              // 늘 학교에 두는 물건 (알림장에 적히지 않으면 가방에 넣지 않는다)
      rules: DATA.RULES.map(function (r) { return { id: r.id, dow: r.dow, item: r.item, on: true }; }),
      notes: [],
      checks: {},
      skips: {},
      outs: {},                                              // 어제 가방에서 꺼냈다고 표시한 물건 (챙김 수·기록에는 넣지 않는다)
      dayEdits: {},                                          // 이날만 바꾼 것 { '아이|날짜': { p: {교시번호(1부터): 꾸러미 id 또는 null}, after: {방과후 id: {who, off}} } }
      history: [],
      settings: {
        switchHour: 14,
        font: 1,
        reduce: false,
        dark: false,
        mute: false,
        vibe: true,                                          // 칸을 누를 때 짧은 진동 (진동이 되는 기기만)
        teacher: false,
        holidays: [],
        guardians: ['엄마', '아빠'],
        ptimes: Logic.defaultTimes(),                        // 교시마다 [시작, 끝]
        gradeP: { 1: 5, 2: 5, 3: 6, 4: 6, 5: 6, 6: 6 },      // 학년별 교시 수 (새 아이에 쓴다, 1~2학년은 5교시)
        welcomed: false,
        setupDone: false,
        remindAt: '',                                        // 달력 파일로 받은 밤 알림 시각 (받은 적 없으면 '')
        remindAsked: false,                                  // 다 챙김 창에서 밤 알림을 한 번 권했다
        firstBagSeen: false,                                 // 아이를 넣자마자 보여 준 처음 가방 카드를 닫았다
        coachSeen: false                                     // 가방 시트에서 처음 한 칸을 눌러 봤다 (누르기 안내를 끈다)
      }
    };
  }

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { return { data: defaults(), ok: false }; }
    if (!raw) return { data: defaults(), ok: true };
    try {
      var d = JSON.parse(raw);
      var r = validate(d);
      if (!r.ok) return { data: defaults(), ok: false };
      return { data: fill(d), ok: true };
    } catch (e) {
      return { data: defaults(), ok: false };
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch (e) { /* 저장소가 없어도 앱은 돈다 */ }
  }

  // 비어 있는 칸을 처음 값으로 채운다 (예전 판 데이터·가져온 데이터)
  function fill(d) {
    var base = defaults();
    Object.keys(base).forEach(function (k) { if (d[k] === undefined) d[k] = base[k]; });
    Object.keys(base.settings).forEach(function (k) { if (d.settings[k] === undefined) d.settings[k] = base.settings[k]; });
    if (!Array.isArray(d.morning)) d.morning = base.morning.slice();
    d.morning = d.morning.filter(function (x) { return typeof x === 'string' && x.trim(); });
    if (!Array.isArray(d.stay)) d.stay = [];
    d.stay = d.stay.filter(function (x) { return typeof x === 'string' && x.trim(); });
    // 예전 판에 저장한 기본 과목 꾸러미에도 시간표 칸 색을 채운다
    d.packs.forEach(function (p) {
      if (!p || p.c) return;
      var s = DATA.SUBJECTS.filter(function (x) { return x.id === p.id; })[0];
      if (s) p.c = s.c;
    });
    if (typeof d.settings.vibe !== 'boolean') d.settings.vibe = base.settings.vibe;
    if (!Array.isArray(d.settings.holidays)) d.settings.holidays = [];
    if (!Array.isArray(d.settings.guardians)) d.settings.guardians = base.settings.guardians.slice();
    if (!/^\d{2}:\d{2}$/.test(d.settings.remindAt)) d.settings.remindAt = '';
    d.settings.ptimes = Logic.periodTimes(d.settings).map(function (x) { return x.slice(); });
    var gp = d.settings.gradeP;
    if (!gp || typeof gp !== 'object') gp = d.settings.gradeP = {};
    for (var g = 1; g <= 6; g++) if (!(gp[g] >= 4 && gp[g] <= 7)) gp[g] = base.settings.gradeP[g];
    if (typeof d.checks !== 'object' || !d.checks || Array.isArray(d.checks)) d.checks = {};
    if (typeof d.skips !== 'object' || !d.skips || Array.isArray(d.skips)) d.skips = {};
    Object.keys(d.skips).forEach(function (k) { if (!Array.isArray(d.skips[k])) delete d.skips[k]; });
    if (typeof d.outs !== 'object' || !d.outs || Array.isArray(d.outs)) d.outs = {};
    Object.keys(d.outs).forEach(function (k) { if (!Array.isArray(d.outs[k])) delete d.outs[k]; });
    if (typeof d.dayEdits !== 'object' || !d.dayEdits || Array.isArray(d.dayEdits)) d.dayEdits = {};
    Object.keys(d.dayEdits).forEach(function (k) {
      var e = d.dayEdits[k];
      if (!e || typeof e !== 'object' || Array.isArray(e)) { delete d.dayEdits[k]; return; }
      if (!e.p || typeof e.p !== 'object' || Array.isArray(e.p)) e.p = {};
      if (!e.after || typeof e.after !== 'object' || Array.isArray(e.after)) e.after = {};
    });
    d.kids.forEach(function (k) {
      if (!k.week) k.week = emptyWeek(k.periods || 6);
      for (var i = 1; i <= 5; i++) {
        if (!k.week[i]) k.week[i] = { p: [], after: [] };
        if (!Array.isArray(k.week[i].p)) k.week[i].p = [];
        if (!Array.isArray(k.week[i].after)) k.week[i].after = [];
        while (k.week[i].p.length < k.periods) k.week[i].p.push(null);
      }
    });
    return d;
  }

  function isStrArr(a, max) {
    return Array.isArray(a) && a.every(function (x) { return typeof x === 'string' && x.length <= (max || 60); });
  }

  // 가져오기 전 형식 검사 — 틀린 곳마다 이유를 돌려준다
  function validate(d) {
    var errs = [];
    if (!d || typeof d !== 'object') return { ok: false, errs: ['내일 가방에서 내보낸 글이 아니에요.'] };
    if (d.v !== 1) errs.push('이 앱에서 내보낸 글이 아니거나 다른 판의 글이에요.');
    if (!Array.isArray(d.kids)) errs.push('아이 목록이 없어요.');
    else d.kids.forEach(function (k, i) {
      if (!k || typeof k.name !== 'string' || !k.name.trim()) errs.push((i + 1) + '번째 아이 이름이 비어 있어요.');
      if (k && (typeof k.periods !== 'number' || k.periods < 4 || k.periods > 7)) errs.push((i + 1) + '번째 아이의 교시 수가 4~7이 아니에요.');
    });
    if (!Array.isArray(d.packs)) errs.push('꾸러미 목록이 없어요.');
    else d.packs.forEach(function (p, i) {
      if (!p || typeof p.name !== 'string' || !isStrArr(p.items)) errs.push((i + 1) + '번째 꾸러미의 이름이나 물건 목록이 맞지 않아요.');
    });
    if (d.notes !== undefined && !Array.isArray(d.notes)) errs.push('알림장 목록이 맞지 않아요.');
    else if (Array.isArray(d.notes)) d.notes.forEach(function (n, i) {
      if (!n || !/^\d{4}-\d{2}-\d{2}$/.test(n.date) || !isStrArr(n.items)) errs.push((i + 1) + '번째 알림장의 날짜나 준비물이 맞지 않아요.');
    });
    if (d.history !== undefined && !Array.isArray(d.history)) errs.push('가방 달력 기록이 맞지 않아요.');
    else if (Array.isArray(d.history)) d.history.forEach(function (h, i) {
      if (!h || !/^\d{4}-\d{2}-\d{2}$/.test(h.date) || typeof h.total !== 'number' || typeof h.done !== 'number' || !isStrArr(h.missed)) {
        errs.push((i + 1) + '번째 가방 기록의 날짜나 개수가 맞지 않아요.');
      }
    });
    if (d.checks !== undefined && (typeof d.checks !== 'object' || Array.isArray(d.checks))) errs.push('챙긴 표시가 맞지 않아요.');
    if (d.skips !== undefined && (typeof d.skips !== 'object' || !d.skips || Array.isArray(d.skips))) errs.push('뺀 물건 표시가 맞지 않아요.');
    if (!d.settings || typeof d.settings !== 'object') errs.push('설정이 없어요.');
    return { ok: errs.length === 0, errs: errs.slice(0, 6) };
  }

  function exportText(state) {
    return JSON.stringify(state);
  }

  function parseImport(text) {
    var t = (text || '').trim();
    if (!t) return { ok: false, errs: ['붙여 넣은 글이 없어요.'] };
    var d;
    try { d = JSON.parse(t); } catch (e) { return { ok: false, errs: ['글이 잘렸거나 다른 글이에요. 내보내기 글을 처음부터 끝까지 붙여 넣어 주세요.'] }; }
    var r = validate(d);
    if (!r.ok) return r;
    return { ok: true, data: fill(d) };
  }

  return {
    load: load, save: save, clear: clear, defaults: defaults, emptyWeek: emptyWeek,
    exportText: exportText, parseImport: parseImport, validate: validate, uid: uid, MAX_NAME: MAX_NAME
  };
})();
