/* Tint Ledger — 저장 (이 기기 브라우저 localStorage 에만) */
window.Store = (function () {
  var KEY = 'tintledger.v1';
  var APP = 'Tint Ledger';

  function blank() {
    return {
      v: 1,
      clients: [],
      services: [],
      products: [],
      timers: [],
      settings: {
        ratio: 1.5, dev: 6, growth: 1.2, rootCm: 1.5, colorWon: 120, devWon: 8,
        sound: true, vibrate: true, big: false, dark: false, reduce: false,
        welcomed: false, tipIdx: 0, timerFrom: 'start'
      }
    };
  }
  // 읽기 — 실패하면 { data: 빈 판, error: 이유 }
  function load() {
    var raw = null;
    try { raw = window.localStorage.getItem(KEY); } catch (e) {
      return { data: blank(), error: '이 브라우저는 저장을 막고 있어요. 닫으면 기록이 사라집니다.' };
    }
    if (!raw) return { data: blank(), error: '' };
    try {
      var d = JSON.parse(raw);
      var err = validate(d);
      if (err) return { data: blank(), error: '저장된 기록을 읽지 못했어요: ' + err };
      return { data: fill(d), error: '' };
    } catch (e2) {
      return { data: blank(), error: '저장된 기록이 깨져 있어요. 내보내기 글이 있으면 가져오기로 되살려 주세요.' };
    }
  }
  function save(d) {
    try {
      var copy = {};
      Object.keys(d).forEach(function (k) { if (k.charAt(0) !== '_') copy[k] = d[k]; });
      window.localStorage.setItem(KEY, JSON.stringify(copy));
      return true;
    } catch (e) { return false; }
  }
  function clear() {
    try { window.localStorage.removeItem(KEY); return true; } catch (e) { return false; }
  }
  // 빠진 설정은 기본값으로
  function fill(d) {
    var b = blank();
    ['clients', 'services', 'products', 'timers'].forEach(function (k) { if (!Array.isArray(d[k])) d[k] = []; });
    d.settings = d.settings || {};
    Object.keys(b.settings).forEach(function (k) { if (d.settings[k] === undefined) d.settings[k] = b.settings[k]; });
    d.v = 1;
    return d;
  }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  // 형식 검사 — 틀리면 이유 한 줄
  function validate(d) {
    if (!d || typeof d !== 'object') return '글 전체가 기록 형식이 아니에요.';
    if (d.clients && !Array.isArray(d.clients)) return '손님 목록 형식이 아니에요.';
    if (d.services && !Array.isArray(d.services)) return '시술 목록 형식이 아니에요.';
    var ids = {};
    var i, c, s;
    for (i = 0; i < (d.clients || []).length; i++) {
      c = d.clients[i];
      if (!c || typeof c.id !== 'string' || typeof c.name !== 'string') return (i + 1) + '번째 손님에 id·이름이 없어요.';
      if (c.name.length > 40) return (i + 1) + '번째 손님 이름이 너무 길어요.';
      ids[c.id] = true;
    }
    for (i = 0; i < (d.services || []).length; i++) {
      s = d.services[i];
      if (!s || typeof s.id !== 'string') return (i + 1) + '번째 시술에 id 가 없어요.';
      if (!ids[s.clientId]) return (i + 1) + '번째 시술의 손님을 찾지 못했어요.';
      if (!window.Logic.validKey(s.date)) return (i + 1) + '번째 시술 날짜가 이상해요.';
      if (!isNum(s.total) || s.total < 0 || s.total > 2000) return (i + 1) + '번째 시술 양(g)이 이상해요.';
      if (!Array.isArray(s.lines)) return (i + 1) + '번째 시술에 색 줄이 없어요.';
    }
    for (i = 0; i < (d.products || []).length; i++) {
      var p = d.products[i];
      if (!p || typeof p.id !== 'string' || typeof p.name !== 'string') return (i + 1) + '번째 선반 제품 형식이 아니에요.';
      if (!isNum(p.packG) || p.packG <= 0) return (i + 1) + '번째 선반 제품 g 이 이상해요.';
    }
    return '';
  }
  function exportText(d) {
    var copy = { app: APP, exportedAt: new Date().toISOString() };
    ['v', 'clients', 'services', 'products', 'settings'].forEach(function (k) { copy[k] = d[k]; });
    return JSON.stringify(copy, null, 1);
  }
  // 시술 목록 표 (엑셀에 붙여 넣기)
  function exportCsv(d) {
    var names = {};
    d.clients.forEach(function (c) { names[c.id] = c.name; });
    var rows = [['날짜', '손님', '시술', '전체g', '비율', '산화제%', '색 줄', '약값', '남은g', '점수', '메모', '다음 방문'].join('\t')];
    d.services.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).forEach(function (s) {
      rows.push([s.date, names[s.clientId] || '', s.kindName || s.kind, s.total, '1:' + s.ratio, s.dev,
        (s.lines || []).map(function (l) { return l.shade + ' ' + l.g + 'g'; }).join(' + '),
        s.cost || 0, s.left == null ? '' : s.left, s.score || '', String(s.note || '').replace(/[\t\n]/g, ' '), s.nextDate || ''].join('\t'));
    });
    return rows.join('\n');
  }
  function parseImport(text) {
    var t = String(text || '').trim();
    if (!t) return { error: '붙여 넣은 글이 없어요.' };
    if (t.length > 3000000) return { error: '글이 너무 길어요.' };
    var d;
    try { d = JSON.parse(t); } catch (e) { return { error: '내보내기 글 형식이 아니에요. 처음부터 끝까지 그대로 붙여 넣어 주세요.' }; }
    if (d.app !== APP) return { error: APP + ' 에서 내보낸 글이 아니에요.' };
    var err = validate(d);
    if (err) return { error: err };
    delete d.app; delete d.exportedAt;
    d.timers = [];
    return { data: fill(d) };
  }
  return { KEY: KEY, blank: blank, load: load, save: save, clear: clear, validate: validate, exportText: exportText, exportCsv: exportCsv, parseImport: parseImport };
})();
