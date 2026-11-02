// 한끼 계산기 — 저장·불러오기·내보내기 검사 (이 기기 브라우저 localStorage 에만)
var Store = (function () {
  'use strict';
  var KEY = 'nae-sikbi-v1';
  var OLD_KEY = 'wonga-jeoul-v1'; // 이름을 바꾸기 전 기록도 읽는다
  var STATUS = ['active', 'won', 'lost', 'quit'];
  var PHOTO_KEY = 'nae-sikbi-photo-v1'; // 냉장고 사진은 크기가 커서 따로 둔다
  var MAX_PHOTOS = 4;

  function defaultSettings() {
    return { font: 'm', motion: null, theme: 'light', bright: true };
  }
  // H-16: 재료·메뉴·값 기록은 없다. 집밥은 날짜만 남긴다(메뉴 이름을 받지 않는다)
  function defaults() {
    return { app: 'nae-sikbi', v: 4, challenges: [], spends: [], meals: [],
      fridge: { items: [] }, settings: defaultSettings(), fridgeOpened: false, nextId: 1 };
  }
  function shelfOk(id) { return FRIDGE_SHELVES.some(function (s) { return s.id === id; }); }
  function fail(msg) { return { ok: false, msg: msg }; }
  function isText(s, max) { return typeof s === 'string' && s.trim().length > 0 && s.length <= max; }
  function isNum(n) { return typeof n === 'number' && isFinite(n); }
  function kindOk(k) { return SPEND_KINDS.some(function (x) { return x.key === k; }); }

  // 가져오기 전에 형식을 본다. 틀린 곳을 사람이 알 수 있는 말로 돌려준다.
  function validate(o) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return fail('한끼 계산기 기록 모양이 아니에요.');
    if (o.challenges != null && !Array.isArray(o.challenges)) return fail('챌린지 목록(challenges) 모양이 달라요.');
    if (o.spends != null && !Array.isArray(o.spends)) return fail('식비 기록(spends) 모양이 달라요.');
    if (o.meals != null && !Array.isArray(o.meals)) return fail('집밥 기록(meals) 모양이 달라요.');
    if (o.challenges == null && o.spends == null && o.fridge == null) return fail('챌린지·식비·냉장고 기록이 하나도 없어요.');
    if ((o.spends || []).length > 5000) return fail('식비 기록은 5000개까지예요.');
    var cs = o.challenges || [];
    for (var c = 0; c < cs.length; c++) {
      var ch = cs[c], cw = '챌린지 ' + (c + 1) + '번째';
      if (!ch || !isText(ch.id, 40)) return fail(cw + ': 번호(id)가 없어요.');
      if (!isText(ch.name, 30)) return fail(cw + ': 이름이 비었거나 30자를 넘어요.');
      if (!isNum(ch.budget) || ch.budget < 1000) return fail(cw + ' (' + ch.name + '): 식비 목표가 1,000원보다 적어요.');
      if (!Calc.isDay(ch.start) || !Calc.isDay(ch.end) || ch.end < ch.start) return fail(cw + ' (' + ch.name + '): 시작·끝 날짜가 맞지 않아요.');
      if (STATUS.indexOf(ch.status) < 0) return fail(cw + ' (' + ch.name + '): 상태가 맞지 않아요.');
    }
    var sp = o.spends || [];
    for (var s = 0; s < sp.length; s++) {
      var x = sp[s], sw = '식비 ' + (s + 1) + '번째';
      if (!x || !isText(x.id, 40)) return fail(sw + ': 번호(id)가 없어요.');
      if (!Calc.isDay(x.date)) return fail(sw + ': 날짜가 맞지 않아요.');
      if (!isNum(x.amount) || x.amount < 1 || x.amount > 10000000) return fail(sw + ': 값이 1~10,000,000원이 아니에요.');
      if (!kindOk(x.kind)) return fail(sw + ': 종류가 장보기·배달·외식·편의점·카페·간식·기타가 아니에요.');
    }
    if (o.fridge != null) {
      if (typeof o.fridge !== 'object' || Array.isArray(o.fridge)) return fail('냉장고(fridge) 모양이 달라요.');
      var fi = o.fridge.items || [];
      if (!Array.isArray(fi)) return fail('냉장고 음식 목록(fridge.items) 모양이 달라요.');
      if (fi.length > 1000) return fail('냉장고 음식은 1000개까지예요.');
      for (var f = 0; f < fi.length; f++) {
        var it = fi[f], fw = '냉장고 음식 ' + (f + 1) + '번째';
        if (!it || !isText(it.id, 40)) return fail(fw + ': 번호(id)가 없어요.');
        if (!shelfOk(it.shelf)) return fail(fw + ': 칸이 맞지 않아요.');
        if (!isText(it.name, 30)) return fail(fw + ': 이름이 비었거나 30자를 넘어요.');
        if (it.exp && !Calc.isDay(it.exp)) return fail(fw + ' (' + it.name + '): 유통기한 날짜가 맞지 않아요.');
      }
    }
    var ph = o.photos || [];
    if (!Array.isArray(ph)) return fail('냉장고 사진(photos) 모양이 달라요.');
    for (var p = 0; p < ph.length; p++) {
      var q = ph[p];
      if (!q || !isText(q.id, 40) || !Calc.isDay(q.date) || typeof q.data !== 'string' || q.data.indexOf('data:image/') !== 0) return fail('냉장고 사진 ' + (p + 1) + '번째가 맞지 않아요.');
    }
    return { ok: true };
  }
  // 사진 목록을 고르게 맞춘다 (최근 MAX_PHOTOS 장). 이름표는 찍은 뒤에 고르므로 빈 글('')도 받는다
  function normalizePhotos(list) {
    return (Array.isArray(list) ? list : []).filter(function (q) {
      return q && typeof q.id === 'string' && Calc.isDay(q.date) && typeof q.data === 'string' && q.data.indexOf('data:image/') === 0;
    }).map(function (q) {
      return { id: q.id, date: q.date, label: PHOTO_LABELS.indexOf(q.label) >= 0 ? q.label : '', data: q.data };
    }).slice(-MAX_PHOTOS);
  }
  function clampNum(v, lo, hi, d) { return isNum(v) && v >= lo && v <= hi ? v : d; }

  // 검사를 통과한 기록을 앱이 쓰는 모양으로 맞춘다. 예전 기록의 재료·메뉴·값 기록은 버린다 (H-16)
  function normalize(o) {
    var d = defaults();
    var s = o.settings || {}, ds = defaultSettings();
    d.settings = {
      font: ['s', 'm', 'l'].indexOf(s.font) >= 0 ? s.font : ds.font,
      motion: typeof s.motion === 'boolean' ? s.motion : null,
      theme: s.bright === true && ['auto', 'light', 'dark'].indexOf(s.theme) >= 0 ? s.theme : ds.theme,
      bright: true
    };
    d.challenges = (o.challenges || []).map(function (c) {
      return { id: c.id, name: c.name.trim(), budget: Math.round(c.budget), months: clampNum(c.months, 1, 12, 1),
        start: c.start, end: c.end, status: c.status, spent: isNum(c.spent) ? c.spent : null, sample: c.sample === true,
        streakSeen: typeof c.streakSeen === 'string' ? c.streakSeen.slice(0, 20) : '' };
    });
    // 진행 중은 하나만 둔다(뒤의 것을 남긴다)
    d.challenges.filter(function (c) { return c.status === 'active'; }).slice(0, -1).forEach(function (c) { c.status = 'quit'; });
    d.spends = (o.spends || []).map(function (x) {
      return { id: x.id, date: x.date, amount: Math.round(x.amount), kind: x.kind,
        memo: typeof x.memo === 'string' ? x.memo.slice(0, 40) : '', sample: x.sample === true };
    });
    // 집밥은 날짜만 (예전 기록의 메뉴 이름·원가는 버린다)
    d.meals = (o.meals || []).filter(function (x) { return x && typeof x.id === 'string' && Calc.isDay(x.date); })
      .map(function (x) { return { id: x.id, date: x.date, sample: x.sample === true }; }).slice(-3000);
    // 칸 메모(fridge.memos)는 없앴다. 예전 기록에 있어도 버린다 (H-31)
    var fr = o.fridge || {};
    d.fridge.items = (Array.isArray(fr.items) ? fr.items : []).filter(function (x) { return x && typeof x.id === 'string' && shelfOk(x.shelf) && isText(x.name, 30); })
      .map(function (x) { return { id: x.id, shelf: x.shelf, name: x.name.trim(), qty: typeof x.qty === 'string' ? x.qty.slice(0, 20) : '',
        exp: Calc.isDay(x.exp) ? x.exp : '', memo: typeof x.memo === 'string' ? x.memo.slice(0, 40) : '', added: Calc.isDay(x.added) ? x.added : Calc.today(), sample: x.sample === true }; }).slice(0, 1000);
    d.fridgeOpened = o.fridgeOpened === true; // 손잡이로 문을 한 번이라도 열었나
    // 다음 번호는 이미 쓴 번호보다 크게
    var max = isNum(o.nextId) ? o.nextId : 1;
    [d.challenges, d.spends, d.meals, d.fridge.items, normalizePhotos(o.photos)].forEach(function (arr) {
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
    if (!t) return fail('붙여 넣은 글이 없어요. 내보내기 글을 통째로 붙여 넣어 주세요.');
    if (t.length > 12000000) return fail('글이 너무 길어요.');
    var o;
    try { o = JSON.parse(t); } catch (e) { return fail('글 모양이 깨졌어요. 처음 { 부터 끝 } 까지 모두 붙여 넣었는지 봐 주세요.'); }
    var v = validate(o);
    if (!v.ok) return v;
    return { ok: true, state: normalize(o), photos: normalizePhotos(o.photos) };
  }

  return { defaults: defaults, load: load, save: save, exportText: exportText, parseImport: parseImport,
    loadPhotos: loadPhotos, savePhotos: savePhotos, MAX_PHOTOS: MAX_PHOTOS, isAvailable: function () { return available; } };
})();
