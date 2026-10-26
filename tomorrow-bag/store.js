/* Tomorrow Bag — 저장·불러오기·내보내기·가져오기 */
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
    DATA.SUBJECTS.forEach(function (s) { out.push({ id: s.id, kind: 'subj', name: s.name, icon: s.icon, items: s.items.slice() }); });
    DATA.ACADEMIES.forEach(function (s) { out.push({ id: s.id, kind: 'acad', name: s.name, icon: s.icon, items: s.items.slice() }); });
    return out;
  }

  function defaults() {
    return {
      v: 1,
      kids: [],
      cur: null,
      packs: copyPacks(),
      daily: DATA.DAILY.slice(),
      rules: DATA.RULES.map(function (r) { return { id: r.id, dow: r.dow, item: r.item, on: true }; }),
      notes: [],
      checks: {},
      history: [],
      settings: {
        switchHour: 14,
        font: 1,
        reduce: false,
        dark: false,
        teacher: false,
        holidays: [],
        guardians: ['엄마', '아빠'],
        welcomed: false,
        setupDone: false
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

  // 빠진 칸을 처음 값으로 채운다 (예전 판 데이터·가져온 데이터)
  function fill(d) {
    var base = defaults();
    Object.keys(base).forEach(function (k) { if (d[k] === undefined) d[k] = base[k]; });
    Object.keys(base.settings).forEach(function (k) { if (d.settings[k] === undefined) d.settings[k] = base.settings[k]; });
    if (!Array.isArray(d.settings.holidays)) d.settings.holidays = [];
    if (!Array.isArray(d.settings.guardians)) d.settings.guardians = base.settings.guardians.slice();
    if (typeof d.checks !== 'object' || !d.checks || Array.isArray(d.checks)) d.checks = {};
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
    if (!d || typeof d !== 'object') return { ok: false, errs: ['글이 Tomorrow Bag 내보내기 형식이 아닙니다.'] };
    if (d.v !== 1) errs.push('이 앱에서 내보낸 글이 아니거나 다른 판의 글입니다.');
    if (!Array.isArray(d.kids)) errs.push('아이 목록이 없습니다.');
    else d.kids.forEach(function (k, i) {
      if (!k || typeof k.name !== 'string' || !k.name.trim()) errs.push((i + 1) + '번째 아이 이름이 비었습니다.');
      if (k && (typeof k.periods !== 'number' || k.periods < 4 || k.periods > 7)) errs.push((i + 1) + '번째 아이의 교시 수가 4~7이 아닙니다.');
    });
    if (!Array.isArray(d.packs)) errs.push('꾸러미 목록이 없습니다.');
    else d.packs.forEach(function (p, i) {
      if (!p || typeof p.name !== 'string' || !isStrArr(p.items)) errs.push((i + 1) + '번째 꾸러미의 이름이나 물건 목록이 잘못됐습니다.');
    });
    if (d.notes !== undefined && !Array.isArray(d.notes)) errs.push('알림장 목록이 잘못됐습니다.');
    else if (Array.isArray(d.notes)) d.notes.forEach(function (n, i) {
      if (!n || !/^\d{4}-\d{2}-\d{2}$/.test(n.date) || !isStrArr(n.items)) errs.push((i + 1) + '번째 알림장의 날짜나 준비물이 잘못됐습니다.');
    });
    if (d.history !== undefined && !Array.isArray(d.history)) errs.push('챙긴 기록이 잘못됐습니다.');
    else if (Array.isArray(d.history)) d.history.forEach(function (h, i) {
      if (!h || !/^\d{4}-\d{2}-\d{2}$/.test(h.date) || typeof h.total !== 'number' || typeof h.done !== 'number' || !isStrArr(h.missed)) {
        errs.push((i + 1) + '번째 기록의 날짜나 개수가 잘못됐습니다.');
      }
    });
    if (d.checks !== undefined && (typeof d.checks !== 'object' || Array.isArray(d.checks))) errs.push('챙김 표시가 잘못됐습니다.');
    if (!d.settings || typeof d.settings !== 'object') errs.push('설정이 없습니다.');
    return { ok: errs.length === 0, errs: errs.slice(0, 6) };
  }

  function exportText(state) {
    return JSON.stringify(state);
  }

  function parseImport(text) {
    var t = (text || '').trim();
    if (!t) return { ok: false, errs: ['붙여 넣은 글이 없습니다.'] };
    var d;
    try { d = JSON.parse(t); } catch (e) { return { ok: false, errs: ['글이 잘렸거나 다른 글입니다. 내보내기 글을 처음부터 끝까지 붙여 넣어 주세요.'] }; }
    var r = validate(d);
    if (!r.ok) return r;
    return { ok: true, data: fill(d) };
  }

  return {
    load: load, save: save, clear: clear, defaults: defaults, emptyWeek: emptyWeek,
    exportText: exportText, parseImport: parseImport, validate: validate, uid: uid, MAX_NAME: MAX_NAME
  };
})();
