/* Ward Rhythm — 저장·불러오기·내보내기·가져오기 (이 기기 브라우저 localStorage 에만) */
var Store = (function () {
  var KEY = 'wardrhythm.v1';

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function defaults() {
    return { v: 1, shifts: clone(DATA.SHIFT_TYPES), roster: {}, notes: {}, plans: [], sleeps: [], set: clone(DATA.DEFAULT_SET), welcomed: false, sample: null };
  }

  /* 빠진 칸은 기본값으로 채운다 */
  function merge(d) {
    var st = defaults();
    st.roster = d.roster || {};
    st.notes = d.notes || {};
    st.plans = d.plans || [];
    st.sleeps = d.sleeps || [];
    st.welcomed = !!d.welcomed;
    st.sample = d.sample || null;
    Object.keys(st.set).forEach(function (k) { if (d.set && d.set[k] !== undefined) st.set[k] = d.set[k]; });
    if (Array.isArray(d.shifts)) {
      st.shifts.forEach(function (t) {
        d.shifts.forEach(function (u) {
          if (u && u.id === t.id && t.work) {
            if (Logic.validHM(u.start)) t.start = u.start;
            if (Logic.validHM(u.end)) t.end = u.end;
          }
        });
      });
    }
    return st;
  }

  /* 형식 검사 — 틀린 곳이 있으면 이유를 돌려준다 */
  function validate(d) {
    if (!d || typeof d !== 'object') return { ok: false, err: '데이터가 비어 있어요' };
    if (d.roster && typeof d.roster !== 'object') return { ok: false, err: '근무표 형식이 틀려요' };
    var ids = DATA.SHIFT_TYPES.map(function (t) { return t.id; });
    var keys = Object.keys(d.roster || {});
    for (var i = 0; i < keys.length; i++) {
      if (!Logic.validDate(keys[i])) return { ok: false, err: '근무표 날짜가 틀려요: ' + keys[i] };
      if (ids.indexOf(d.roster[keys[i]]) < 0) return { ok: false, err: '모르는 근무 종류: ' + d.roster[keys[i]] };
    }
    if (d.plans && !Array.isArray(d.plans)) return { ok: false, err: '약속 목록 형식이 틀려요' };
    var plans = d.plans || [];
    for (var j = 0; j < plans.length; j++) {
      var p = plans[j];
      if (!p || !p.id || !Logic.validDate(p.date) || !Logic.validHM(p.start)) return { ok: false, err: (j + 1) + '번째 약속의 날짜·시각이 틀려요' };
      if (!(p.dur >= 10 && p.dur <= 1440)) return { ok: false, err: (j + 1) + '번째 약속의 길이가 틀려요' };
      if (String(p.title || '').length > 40) return { ok: false, err: (j + 1) + '번째 약속 이름이 너무 길어요' };
    }
    if (d.sleeps && !Array.isArray(d.sleeps)) return { ok: false, err: '잠 기록 형식이 틀려요' };
    var sl = d.sleeps || [];
    for (var k = 0; k < sl.length; k++) {
      var s = sl[k];
      if (!s || !s.id || !Logic.validDate(s.date) || !Logic.validHM(s.bed) || !Logic.validHM(s.wake)) return { ok: false, err: (k + 1) + '번째 잠 기록이 틀려요' };
    }
    if (d.notes && typeof d.notes !== 'object') return { ok: false, err: '근무 메모 형식이 틀려요' };
    return { ok: true };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return { state: defaults(), ok: true, fresh: true };
      var o = JSON.parse(raw);
      var v = validate(o);
      if (!v.ok) return { state: defaults(), ok: false, err: '저장된 기록이 깨져 새로 시작해요 (' + v.err + ')' };
      return { state: merge(o), ok: true };
    } catch (e) {
      return { state: defaults(), ok: false, err: '저장된 기록을 읽지 못했어요. 이 브라우저가 저장을 막았을 수 있어요.' };
    }
  }
  function save(st) {
    try { localStorage.setItem(KEY, JSON.stringify(st)); return true; } catch (e) { return false; }
  }
  function clear() {
    try { localStorage.removeItem(KEY); return true; } catch (e) { return false; }
  }

  function exportText(st) {
    return JSON.stringify({ app: 'WardRhythm', v: 1, at: new Date().toISOString(), data: st });
  }
  function parseImport(text) {
    text = String(text || '').trim();
    if (!text) return { ok: false, err: '붙여 넣은 글이 없어요' };
    var o;
    try { o = JSON.parse(text); } catch (e) { return { ok: false, err: '이 앱에서 내보낸 글 모양이 아니에요. 처음부터 끝까지 그대로 붙여 넣어 주세요' }; }
    if (!o || o.app !== 'WardRhythm' || !o.data) return { ok: false, err: '이 앱에서 내보낸 글이 아니에요. 내보내기에서 복사한 글을 붙여 넣어 주세요' };
    var v = validate(o.data);
    if (!v.ok) return v;
    return { ok: true, state: merge(o.data) };
  }
  /* 근무표 표(탭 구분) — 표 계산 프로그램에 붙여 넣기 */
  function rosterTable(st, y, m) {
    var rows = ['날짜\t요일\t근무\t시작\t끝\t메모'];
    var n = Logic.monthDays(y, m);
    for (var i = 1; i <= n; i++) {
      var d = Logic.monthKey(y, m) + '-' + Logic.pad(i), t = Logic.shiftOf(st, d), note = st.notes[d];
      rows.push([d, Logic.DOW[Logic.dow(d)], t ? t.name : '', t && t.work ? t.start : '', t && t.work ? t.end : '',
        note ? ((note.chips || []).join('·') + (note.text ? ' ' + note.text : '')).replace(/\s+/g, ' ') : ''].join('\t'));
    }
    return rows.join('\n');
  }

  return { KEY: KEY, defaults: defaults, merge: merge, validate: validate, load: load, save: save, clear: clear, exportText: exportText, parseImport: parseImport, rosterTable: rosterTable, clone: clone };
})();
