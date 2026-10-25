// 한끼 계산기 — 저장·불러오기·내보내기 검사 (이 기기 브라우저 localStorage 에만)
var Store = (function () {
  'use strict';
  var KEY = 'nae-sikbi-v1';
  var OLD_KEY = 'wonga-jeoul-v1'; // 이름을 바꾸기 전 기록도 읽는다
  var MAX_ITEMS = 2000;
  var STATUS = ['active', 'won', 'lost', 'quit'];

  function defaultSettings() {
    return { target: 40, warn: 70, staleDays: 30, font: 'm', motion: null, theme: 'light', bright: true }; // 기본은 밝은 화면 (H-02)
  }
  function defaults() {
    return { app: 'nae-sikbi', v: 3, ingredients: [], menus: [], history: [], challenges: [], spends: [], meals: [],
      fridge: { memos: {}, items: [] }, settings: defaultSettings(), welcomed: false, nextId: 1 };
  }
  var PHOTO_KEY = 'nae-sikbi-photo-v1'; // 냉장고 사진은 크기가 커서 따로 둔다
  var MAX_PHOTOS = 4;
  function shelfOk(id) { return FRIDGE_SHELVES.some(function (s) { return s.id === id; }); }

  function fail(msg) { return { ok: false, msg: msg }; }
  function isText(s, max) { return typeof s === 'string' && s.trim().length > 0 && s.length <= max; }
  function isNum(n) { return typeof n === 'number' && isFinite(n); }
  function kindOk(k) { return SPEND_KINDS.some(function (x) { return x.key === k; }); }

  // 가져오기 전에 형식을 본다. 틀린 곳을 사람이 알 수 있는 말로 돌려준다.
  function validate(o) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return fail('한끼 계산기 기록 형식이 아니다.');
    if (!Array.isArray(o.ingredients)) return fail('재료 목록(ingredients)이 없다.');
    if (!Array.isArray(o.menus)) return fail('메뉴 목록(menus)이 없다.');
    if (o.history != null && !Array.isArray(o.history)) return fail('단가 기록(history) 형식이 다르다.');
    if (o.challenges != null && !Array.isArray(o.challenges)) return fail('챌린지 목록(challenges) 형식이 다르다.');
    if (o.spends != null && !Array.isArray(o.spends)) return fail('식비 기록(spends) 형식이 다르다.');
    if (o.meals != null && !Array.isArray(o.meals)) return fail('집밥 기록(meals) 형식이 다르다.');
    if (o.ingredients.length > MAX_ITEMS || o.menus.length > MAX_ITEMS || (o.spends || []).length > 5000) return fail('항목이 너무 많다(재료·메뉴 ' + MAX_ITEMS + '개, 식비 5000개까지).');
    var ids = {};
    for (var i = 0; i < o.ingredients.length; i++) {
      var g = o.ingredients[i];
      var where = '재료 ' + (i + 1) + '번째';
      if (!g || !isText(g.id, 40)) return fail(where + ': 번호(id)가 없다.');
      if (ids[g.id]) return fail(where + ': 번호(id)가 겹친다.');
      ids[g.id] = true;
      if (!isText(g.name, 30)) return fail(where + ': 이름이 비었거나 30자를 넘는다.');
      if (!isNum(g.buyQty) || g.buyQty <= 0) return fail(where + ' (' + g.name + '): 산 양이 0보다 커야 한다.');
      if (!Calc.isUnit(g.buyUnit)) return fail(where + ' (' + g.name + '): 단위가 g·kg·ml·L·개 가 아니다.');
      if (g.price != null && (!isNum(g.price) || g.price < 0)) return fail(where + ' (' + g.name + '): 값이 숫자가 아니다.');
    }
    for (var j = 0; j < o.menus.length; j++) {
      var m = o.menus[j];
      var w = '메뉴 ' + (j + 1) + '번째';
      if (!m || !isText(m.id, 40)) return fail(w + ': 번호(id)가 없다.');
      if (!isText(m.name, 30)) return fail(w + ': 이름이 비었거나 30자를 넘는다.');
      if (!isNum(m.price) || m.price < 0) return fail(w + ' (' + m.name + '): 사 먹으면 드는 값이 숫자가 아니다.');
      if (!Array.isArray(m.lines)) return fail(w + ' (' + m.name + '): 재료 줄이 없다.');
      for (var k = 0; k < m.lines.length; k++) {
        var l = m.lines[k];
        if (!l || typeof l.ingId !== 'string' || !isNum(l.qty) || l.qty <= 0 || !Calc.isUnit(l.unit)) {
          return fail(w + ' (' + m.name + ') ' + (k + 1) + '번째 줄의 재료·양·단위가 맞지 않다.');
        }
      }
    }
    var cs = o.challenges || [];
    for (var c = 0; c < cs.length; c++) {
      var ch = cs[c], cw = '챌린지 ' + (c + 1) + '번째';
      if (!ch || !isText(ch.id, 40)) return fail(cw + ': 번호(id)가 없다.');
      if (!isText(ch.name, 30)) return fail(cw + ': 이름이 비었거나 30자를 넘는다.');
      if (!isNum(ch.budget) || ch.budget < 1000) return fail(cw + ' (' + ch.name + '): 식비 목표가 1,000원보다 적다.');
      if (!Calc.isDay(ch.start) || !Calc.isDay(ch.end) || ch.end < ch.start) return fail(cw + ' (' + ch.name + '): 시작·끝 날짜가 맞지 않다.');
      if (STATUS.indexOf(ch.status) < 0) return fail(cw + ' (' + ch.name + '): 상태가 맞지 않다.');
    }
    var sp = o.spends || [];
    for (var s = 0; s < sp.length; s++) {
      var x = sp[s], sw = '식비 ' + (s + 1) + '번째';
      if (!x || !isText(x.id, 40)) return fail(sw + ': 번호(id)가 없다.');
      if (!Calc.isDay(x.date)) return fail(sw + ': 날짜가 맞지 않다.');
      if (!isNum(x.amount) || x.amount < 1 || x.amount > 10000000) return fail(sw + ': 값이 1~10,000,000원이 아니다.');
      if (!kindOk(x.kind)) return fail(sw + ': 종류가 장보기·배달·외식·편의점·카페·간식·기타 가 아니다.');
    }
    if (o.fridge != null) {
      if (typeof o.fridge !== 'object' || Array.isArray(o.fridge)) return fail('냉장고(fridge) 형식이 다르다.');
      var fi = o.fridge.items || [];
      if (!Array.isArray(fi)) return fail('냉장고 음식 목록(fridge.items) 형식이 다르다.');
      if (fi.length > 1000) return fail('냉장고 음식은 1000개까지다.');
      for (var f = 0; f < fi.length; f++) {
        var it = fi[f], fw = '냉장고 음식 ' + (f + 1) + '번째';
        if (!it || !isText(it.id, 40)) return fail(fw + ': 번호(id)가 없다.');
        if (!shelfOk(it.shelf)) return fail(fw + ': 칸이 맞지 않다.');
        if (!isText(it.name, 30)) return fail(fw + ': 이름이 비었거나 30자를 넘는다.');
        if (it.exp && !Calc.isDay(it.exp)) return fail(fw + ' (' + it.name + '): 유통기한 날짜가 맞지 않다.');
      }
    }
    var ph = o.photos || [];
    if (!Array.isArray(ph)) return fail('냉장고 사진(photos) 형식이 다르다.');
    for (var p = 0; p < ph.length; p++) {
      var q = ph[p];
      if (!q || !isText(q.id, 40) || !Calc.isDay(q.date) || typeof q.data !== 'string' || q.data.indexOf('data:image/') !== 0) return fail('냉장고 사진 ' + (p + 1) + '번째가 맞지 않다.');
    }
    return { ok: true };
  }
  // 사진 목록을 고르게 맞춘다 (최근 MAX_PHOTOS 장)
  function normalizePhotos(list) {
    return (Array.isArray(list) ? list : []).filter(function (q) {
      return q && typeof q.id === 'string' && Calc.isDay(q.date) && typeof q.data === 'string' && q.data.indexOf('data:image/') === 0;
    }).map(function (q) {
      return { id: q.id, date: q.date, label: PHOTO_LABELS.indexOf(q.label) >= 0 ? q.label : PHOTO_LABELS[0], data: q.data };
    }).slice(-MAX_PHOTOS);
  }

  function clampNum(v, lo, hi, d) { return isNum(v) && v >= lo && v <= hi ? v : d; }

  // 검사를 통과한 기록을 앱이 쓰는 모양으로 고르게 맞춘다
  function normalize(o) {
    var d = defaults();
    var s = o.settings || {};
    var ds = defaultSettings();
    var fromOld = o.app !== 'nae-sikbi'; // 이름 바꾸기 전 기록이면 기준을 새 기본값으로
    d.settings = {
      target: fromOld ? ds.target : clampNum(s.target, 5, 90, ds.target),
      warn: fromOld ? ds.warn : clampNum(s.warn, 6, 99, ds.warn),
      staleDays: clampNum(s.staleDays, 1, 365, ds.staleDays),
      font: ['s', 'm', 'l'].indexOf(s.font) >= 0 ? s.font : ds.font,
      motion: typeof s.motion === 'boolean' ? s.motion : null,
      // 밝은 화면으로 바꾸기 전(bright 표시 없음) 기록은 한 번 밝게 돌린다 (H-02)
      theme: s.bright === true && ['auto', 'light', 'dark'].indexOf(s.theme) >= 0 ? s.theme : ds.theme,
      bright: true
    };
    if (d.settings.warn <= d.settings.target) d.settings.warn = Math.min(99, d.settings.target + 5);
    d.ingredients = o.ingredients.map(function (g) {
      return {
        id: g.id, name: g.name.trim(), cat: typeof g.cat === 'string' && g.cat ? g.cat : '기타',
        buyQty: g.buyQty, buyUnit: g.buyUnit, price: isNum(g.price) && g.price > 0 ? g.price : null,
        yieldPct: clampNum(g.yieldPct, 1, 100, 100), updated: Calc.isDay(g.updated) ? g.updated : null,
        sample: g.sample === true
      };
    });
    var known = {};
    d.ingredients.forEach(function (g) { known[g.id] = true; });
    d.menus = o.menus.map(function (m) {
      return {
        id: m.id, name: m.name.trim(), price: m.price, extra: clampNum(m.extra, 0, 1000000, 0),
        memo: typeof m.memo === 'string' ? m.memo.slice(0, 80) : '',
        lines: m.lines.filter(function (l) { return known[l.ingId]; }).map(function (l) { return { ingId: l.ingId, qty: l.qty, unit: l.unit }; }),
        sample: m.sample === true
      };
    });
    d.history = (o.history || []).filter(function (h) { return h && Calc.isDay(h.date) && typeof h.name === 'string'; }).slice(-1500);
    d.challenges = (o.challenges || []).map(function (c) {
      return { id: c.id, name: c.name.trim(), budget: Math.round(c.budget), months: clampNum(c.months, 1, 12, 1),
        start: c.start, end: c.end, status: c.status, spent: isNum(c.spent) ? c.spent : null, sample: c.sample === true };
    });
    // 진행 중은 하나만 둔다(뒤의 것을 남긴다)
    var act = d.challenges.filter(function (c) { return c.status === 'active'; });
    act.slice(0, -1).forEach(function (c) { c.status = 'quit'; });
    d.spends = (o.spends || []).map(function (x) {
      return { id: x.id, date: x.date, amount: Math.round(x.amount), kind: x.kind,
        memo: typeof x.memo === 'string' ? x.memo.slice(0, 40) : '', sample: x.sample === true };
    });
    d.meals = (o.meals || []).filter(function (x) { return x && typeof x.id === 'string' && Calc.isDay(x.date) && typeof x.name === 'string' && isNum(x.cost); })
      .map(function (x) { return { id: x.id, date: x.date, menuId: typeof x.menuId === 'string' ? x.menuId : '', name: x.name.slice(0, 30),
        cost: x.cost, out: isNum(x.out) ? x.out : 0, sample: x.sample === true }; }).slice(-3000);
    var fr = o.fridge || {}, memos = fr.memos && typeof fr.memos === 'object' ? fr.memos : {};
    FRIDGE_SHELVES.forEach(function (s) {
      if (typeof memos[s.id] === 'string' && memos[s.id].trim()) d.fridge.memos[s.id] = memos[s.id].slice(0, 200);
    });
    d.fridge.items = (Array.isArray(fr.items) ? fr.items : []).filter(function (x) { return x && typeof x.id === 'string' && shelfOk(x.shelf) && isText(x.name, 30); })
      .map(function (x) { return { id: x.id, shelf: x.shelf, name: x.name.trim(), qty: typeof x.qty === 'string' ? x.qty.slice(0, 20) : '',
        exp: Calc.isDay(x.exp) ? x.exp : '', added: Calc.isDay(x.added) ? x.added : Calc.today(), sample: x.sample === true }; }).slice(0, 1000);
    d.welcomed = o.welcomed !== false;
    // 다음 번호는 이미 쓴 번호보다 크게
    var max = isNum(o.nextId) ? o.nextId : 1;
    [d.ingredients, d.menus, d.history, d.challenges, d.spends, d.meals, d.fridge.items, normalizePhotos(o.photos)].forEach(function (arr) {
      arr.forEach(function (x) { var n = parseInt(String(x.id || '').replace(/^\D+/, ''), 10); if (n >= max) max = n + 1; });
    });
    d.nextId = max;
    return d;
  }

  var available = true;
  function load() {
    try {
      var raw = localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY);
      if (!raw) return defaults();
      var p = JSON.parse(raw);
      if (validate(p).ok) return normalize(p);
    } catch (e) {
      available = false;
    }
    return defaults();
  }
  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      available = true;
    } catch (e) {
      available = false;
    }
    return available;
  }
  // 냉장고 사진: 따로 읽고 쓴다. 자리가 모자라면 false 를 돌려준다(다른 기록은 그대로).
  function loadPhotos() {
    try {
      var raw = localStorage.getItem(PHOTO_KEY);
      return raw ? normalizePhotos(JSON.parse(raw)) : [];
    } catch (e) { return []; }
  }
  function savePhotos(list) {
    try {
      localStorage.setItem(PHOTO_KEY, JSON.stringify(list || []));
      return true;
    } catch (e) { return false; }
  }
  // 내보내기 글에는 사진도 함께 넣는다
  function exportText(state, photos) {
    var o = Object.assign({}, state);
    if (photos && photos.length) o.photos = photos;
    return JSON.stringify(o, null, 1);
  }
  // 붙여 넣은 글을 읽어 { ok, state, photos } 또는 { ok:false, msg } 로 돌려준다
  function parseImport(text) {
    var t = String(text || '').trim();
    if (!t) return fail('붙여 넣은 글이 없다. 내보내기 글을 통째로 붙여 넣는다.');
    if (t.length > 12000000) return fail('글이 너무 길다.');
    var o;
    try { o = JSON.parse(t); } catch (e) { return fail('글 모양이 깨졌다. 처음 { 부터 끝 } 까지 모두 붙여 넣었는지 본다.'); }
    var v = validate(o);
    if (!v.ok) return v;
    return { ok: true, state: normalize(o), photos: normalizePhotos(o.photos) };
  }

  return { defaults: defaults, load: load, save: save, exportText: exportText, parseImport: parseImport,
    loadPhotos: loadPhotos, savePhotos: savePhotos, MAX_PHOTOS: MAX_PHOTOS, isAvailable: function () { return available; } };
})();
