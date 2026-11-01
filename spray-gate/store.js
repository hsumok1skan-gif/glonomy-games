/* Spray Gate — 저장·불러오기·내보내기·가져오기 */
(function () {
  'use strict';
  var KEY = 'spraygate.v1';
  var APP = 'SprayGate';

  function blank() {
    return {
      v: 1,
      fields: [],
      products: [],
      sprays: [],
      settings: { tank: 20, margin: 2, per10a: 200, big: false, calm: false, sound: true, dark: false },
      welcomed: false,
      sample: false
    };
  }

  function load() {
    var raw = null;
    try { raw = window.localStorage.getItem(KEY); } catch (e) {
      return { data: blank(), warn: '이 브라우저에서는 기록을 저장할 수 없어요. 창을 닫으면 넣은 것이 사라져요.' };
    }
    if (!raw) return { data: blank(), warn: '' };
    try {
      var d = JSON.parse(raw);
      var err = validate(d);
      if (err) return { data: blank(), warn: '저장된 기록이 깨져 새로 시작해요 (' + err + ').' };
      return { data: fill(d), warn: '' };
    } catch (e2) {
      return { data: blank(), warn: '저장된 기록을 읽지 못해 새로 시작해요.' };
    }
  }

  function save(d) {
    try { window.localStorage.setItem(KEY, JSON.stringify(d)); return ''; } catch (e) {
      return '저장하지 못했어요. 브라우저 저장 공간이 꽉 찼거나 막혀 있어요.';
    }
  }

  function clear() {
    try { window.localStorage.removeItem(KEY); return ''; } catch (e) { return '지우지 못했어요.'; }
  }

  // 빠진 설정을 기본값으로 채운다
  function fill(d) {
    var b = blank();
    Object.keys(b.settings).forEach(function (k) { if (d.settings[k] === undefined) d.settings[k] = b.settings[k]; });
    if (d.welcomed === undefined) d.welcomed = true;
    if (d.sample === undefined) d.sample = false;
    return d;
  }

  function validate(d) {
    var L = window.Logic;
    if (!d || typeof d !== 'object') return '내용이 없어요';
    if (!Array.isArray(d.fields) || !Array.isArray(d.products) || !Array.isArray(d.sprays)) return '밭·약·기록 목록이 없어요';
    if (!d.settings || typeof d.settings !== 'object') return '설정이 없어요';
    var i, f, p, s;
    var fids = {}, pids = {};
    for (i = 0; i < d.fields.length; i++) {
      f = d.fields[i];
      if (!f || typeof f.id !== 'string' || typeof f.name !== 'string' || !f.name || f.name.length > 30) return (i + 1) + '번째 밭 이름이 이상해요';
      if (typeof f.crop !== 'string' || f.crop.length > 20) return f.name + ' 의 작물이 이상해요';
      if (f.start && !L.validDate(f.start)) return f.name + ' 의 작기 시작일이 이상해요';
      if (f.harvest && !L.validDate(f.harvest)) return f.name + ' 의 수확 예정일이 이상해요';
      fids[f.id] = 1;
    }
    for (i = 0; i < d.products.length; i++) {
      p = d.products[i];
      if (!p || typeof p.id !== 'string' || typeof p.name !== 'string' || !p.name || p.name.length > 30) return (i + 1) + '번째 약 카드 이름이 이상해요';
      if (!(p.dil > 0 && p.dil <= 10000)) return p.name + ' 의 희석배수가 이상해요';
      if (!(p.phi >= 0 && p.phi <= 365)) return p.name + ' 의 수확 전 날수가 이상해요';
      if (!(p.max >= 0 && p.max <= 50)) return p.name + ' 의 횟수가 이상해요';
      pids[p.id] = 1;
    }
    for (i = 0; i < d.sprays.length; i++) {
      s = d.sprays[i];
      if (!s || typeof s.id !== 'string' || !L.validDate(s.date)) return (i + 1) + '번째 기록의 날짜가 이상해요';
      if (!fids[s.fieldId]) return s.date + ' 기록의 밭이 목록에 없어요';
      if (!(s.water > 0 && s.water <= 5000)) return s.date + ' 기록의 물 양이 이상해요';
      if (!Array.isArray(s.items) || !s.items.length) return s.date + ' 기록에 약이 없어요';
      for (var j = 0; j < s.items.length; j++) {
        var it = s.items[j];
        if (!it || typeof it.name !== 'string' || !(it.phi >= 0) || !(it.dil > 0)) return s.date + ' 기록의 약 내용이 이상해요';
      }
    }
    return '';
  }

  function exportText(d) {
    return JSON.stringify({ app: APP, v: 1, at: new Date().toISOString(), data: d }, null, 1);
  }

  function parseImport(text) {
    var o;
    text = String(text || '').trim();
    if (!text) return { ok: false, msg: '붙여 넣은 글이 없어요' };
    try { o = JSON.parse(text); } catch (e) {
      return { ok: false, msg: '이 앱에서 내보낸 글 모양이 아니에요. 처음부터 끝까지 그대로 붙여 넣어 주세요' };
    }
    if (!o || o.app !== APP || !o.data) return { ok: false, msg: '다른 앱의 글이에요. 이 앱 더보기 → 내보내기에서 복사한 글을 붙여 넣어 주세요' };
    var err = validate(o.data);
    if (err) return { ok: false, msg: '되살릴 수 없어요: ' + err };
    return { ok: true, data: fill(o.data) };
  }

  window.Store = { blank: blank, load: load, save: save, clear: clear, validate: validate, exportText: exportText, parseImport: parseImport };
})();
