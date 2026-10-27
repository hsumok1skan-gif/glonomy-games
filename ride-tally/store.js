/* Ride Tally 저장 — localStorage(이 기기 브라우저에만), 내보내기·가져오기 형식 검사 */
(function () {
  'use strict';
  var KEY = 'ridetally.v1';
  var APP = 'ridetally';

  function blank() {
    var D = window.RT_DATA;
    return {
      app: APP, v: 1,
      settings: {
        welcomed: false, vehicle: 'sc125', costMode: 'fuel', kmPerL: 40, perKm: 0, fuelPrice: 1700,
        goal: 150000, workDays: 25, dayHours: 8, setAside: 10,
        fs: 1, light: false, reduce: false, vib: true, sound: true
      },
      platforms: D.PLATFORMS.map(function (p) { return { id: p.id, name: p.name, cut: p.cut, perCall: p.perCall, color: p.color }; }),
      fixed: [],
      shifts: [],
      expenses: [],
      maint: {},
      odo: 0,
      ride: null,
      lastPid: 'p1'
    };
  }

  // 옛 데이터·가져온 데이터에 빠진 칸 채우기
  function fill(s) {
    var b = blank();
    if (!s || typeof s !== 'object') return b;
    Object.keys(b).forEach(function (k) { if (s[k] === undefined) s[k] = b[k]; });
    Object.keys(b.settings).forEach(function (k) { if (s.settings[k] === undefined) s.settings[k] = b.settings[k]; });
    if (!s.platforms.length) s.platforms = b.platforms;
    s.shifts.forEach(function (x) { if (!x.breaks) x.breaks = []; if (!x.calls) x.calls = []; });
    if (s.ride && !s.ride.breaks) s.ride.breaks = [];
    return s;
  }

  function isArr(a) { return Object.prototype.toString.call(a) === '[object Array]'; }
  function isNum(n) { return typeof n === 'number' && isFinite(n); }

  function validate(s) {
    if (!s || typeof s !== 'object') return '내보낸 글의 형식이 아니에요';
    if (s.app !== APP) return 'Ride Tally에서 내보낸 글이 아니에요';
    if (!s.settings || typeof s.settings !== 'object') return '설정 형식이 맞지 않아요';
    if (!isArr(s.platforms)) return '일하는 곳 목록 형식이 맞지 않아요';
    if (!isArr(s.shifts)) return '운행 기록 형식이 맞지 않아요';
    if (s.expenses !== undefined && !isArr(s.expenses)) return '지출 목록 형식이 맞지 않아요';
    if (s.fixed !== undefined && !isArr(s.fixed)) return '고정비 목록 형식이 맞지 않아요';
    for (var i = 0; i < s.platforms.length; i++) {
      var p = s.platforms[i];
      if (!p || typeof p.id !== 'string' || typeof p.name !== 'string') return (i + 1) + '번째 일하는 곳 형식이 맞지 않아요';
    }
    for (var j = 0; j < s.shifts.length; j++) {
      var sh = s.shifts[j];
      if (!sh || !isNum(sh.startMs) || !isNum(sh.endMs) || sh.endMs < sh.startMs) return (j + 1) + '번째 운행의 시각이 맞지 않아요';
      if (!isArr(sh.calls)) return (j + 1) + '번째 운행의 콜 목록이 맞지 않아요';
      for (var c = 0; c < sh.calls.length; c++) {
        if (!isNum(sh.calls[c].amt) || !isNum(sh.calls[c].at)) return (j + 1) + '번째 운행의 ' + (c + 1) + '번째 콜 금액이 맞지 않아요';
      }
    }
    var ex = s.expenses || [];
    for (var e = 0; e < ex.length; e++) {
      if (!ex[e] || !isNum(ex[e].amt) || typeof ex[e].date !== 'string') return (e + 1) + '번째 지출 형식이 맞지 않아요';
    }
    return '';
  }

  function load() {
    var raw = null;
    try { raw = window.localStorage.getItem(KEY); } catch (e) {
      return { ok: false, data: blank(), why: '이 브라우저는 저장소를 쓸 수 없어요. 기록이 남지 않아요.' };
    }
    if (!raw) return { ok: true, data: blank() };
    try {
      var s = JSON.parse(raw);
      var why = validate(s);
      if (why) return { ok: false, data: blank(), why: '저장된 기록을 읽지 못했어요 (' + why + '). 새로 시작해요.' };
      return { ok: true, data: fill(s) };
    } catch (e2) {
      return { ok: false, data: blank(), why: '저장된 기록이 깨져 있어 새로 시작해요.' };
    }
  }

  function save(s) {
    try { window.localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch (e) { return false; }
  }
  function clear() {
    try { window.localStorage.removeItem(KEY); return true; } catch (e) { return false; }
  }

  function exportText(s) {
    var copy = JSON.parse(JSON.stringify(s));
    copy.exportedAt = new Date().toISOString();
    return JSON.stringify(copy);
  }
  function parseImport(text) {
    text = String(text || '').trim();
    if (!text) return { ok: false, why: '붙여 넣은 글이 없어요' };
    if (text.length > 5000000) return { ok: false, why: '글이 너무 길어요' };
    var s;
    try { s = JSON.parse(text); } catch (e) { return { ok: false, why: '내보낸 글을 처음부터 끝까지 그대로 붙여 넣어 주세요' }; }
    var why = validate(s);
    if (why) return { ok: false, why: why };
    delete s.exportedAt;
    return { ok: true, data: fill(s) };
  }

  window.Store = { KEY: KEY, blank: blank, fill: fill, load: load, save: save, clear: clear, exportText: exportText, parseImport: parseImport, validate: validate };
})();
