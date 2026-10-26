/* Pace Mark — 저장 (이 기기 브라우저 localStorage 에만) */
(function () {
  'use strict';
  var KEY = 'pacemark.v1';

  function blank() {
    return {
      v: 1,
      templates: [],
      sessions: [],
      run: null,
      lastTpl: 'p-g9',
      settings: { fs: 1, dark: false, reduce: false, vibrate: true, sound: true, warnMin: 10, welcomed: false, coached: false }
    };
  }

  function load() {
    var raw = null;
    try { raw = window.localStorage.getItem(KEY); } catch (e) { return { data: blank(), ok: false, why: '이 브라우저는 저장소를 쓸 수 없어요.' }; }
    if (!raw) return { data: blank(), ok: true };
    try {
      var d = JSON.parse(raw);
      var errs = validate(d);
      if (errs.length) return { data: blank(), ok: false, why: '저장된 기록이 깨져 새로 시작했어요. (' + errs[0] + ')' };
      return { data: fill(d), ok: true };
    } catch (e2) {
      return { data: blank(), ok: false, why: '저장된 기록을 읽지 못해 새로 시작했어요.' };
    }
  }

  function save(d) {
    try { window.localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; }
  }

  function clear() {
    try { window.localStorage.removeItem(KEY); return true; } catch (e) { return false; }
  }

  // 빠진 칸을 기본값으로 채운다
  function fill(d) {
    var b = blank();
    d.templates = Array.isArray(d.templates) ? d.templates : [];
    d.sessions = Array.isArray(d.sessions) ? d.sessions : [];
    d.run = d.run && typeof d.run === 'object' ? d.run : null;
    d.lastTpl = typeof d.lastTpl === 'string' ? d.lastTpl : b.lastTpl;
    d.settings = d.settings && typeof d.settings === 'object' ? d.settings : {};
    Object.keys(b.settings).forEach(function (k) { if (!(k in d.settings)) d.settings[k] = b.settings[k]; });
    d.v = 1;
    return d;
  }

  function isTpl(t) {
    return t && typeof t.name === 'string' && typeof t.total === 'number' && typeof t.reserve === 'number' &&
      Array.isArray(t.sections) && t.sections.length > 0 && t.sections.every(function (s) {
        return s && typeof s.name === 'string' && typeof s.count === 'number' && s.count >= 1 && typeof s.min === 'number';
      });
  }

  // 형식 검사: 고칠 점 목록(빈 배열이면 통과)
  function validate(d) {
    var errs = [];
    if (!d || typeof d !== 'object') return ['내보낸 글의 형식이 아니에요'];
    if (d.templates !== undefined && !Array.isArray(d.templates)) errs.push('내 틀 목록 형식이 맞지 않아요');
    if (d.sessions !== undefined && !Array.isArray(d.sessions)) errs.push('기록 목록 형식이 맞지 않아요');
    (d.templates || []).forEach(function (t, i) {
      if (!isTpl(t) || typeof t.id !== 'string') errs.push('내 틀 ' + (i + 1) + '번째 형식이 맞지 않아요');
    });
    (d.sessions || []).forEach(function (s, i) {
      if (!isTpl(s) || typeof s.id !== 'string' || !window.Logic.validKey(s.date) || !Array.isArray(s.laps)) errs.push('기록 ' + (i + 1) + '번째 형식이 맞지 않아요');
      else if (s.laps.some(function (l) { return !l || typeof l.t !== 'number' || typeof l.at !== 'number' || typeof l.sec !== 'number'; })) errs.push('기록 ' + (i + 1) + '번째 문항 시간이 맞지 않아요');
    });
    if (d.settings !== undefined && (typeof d.settings !== 'object' || d.settings === null)) errs.push('설정 형식이 맞지 않아요');
    return errs;
  }

  function exportText(d) {
    var out = { app: 'pacemark', v: 1, exported: new Date().toISOString(), templates: d.templates, sessions: d.sessions, lastTpl: d.lastTpl, settings: d.settings };
    return JSON.stringify(out, null, 1);
  }

  // 붙여 넣은 글 → { ok, data } 또는 { ok:false, why }
  function parseImport(text) {
    var t = String(text || '').trim();
    if (!t) return { ok: false, why: '붙여 넣은 글이 없어요.' };
    if (t.length > 3000000) return { ok: false, why: '글이 너무 길어요.' };
    var d;
    try { d = JSON.parse(t); } catch (e) { return { ok: false, why: '내보낸 글의 형식이 아니에요. 내보내기로 받은 글을 그대로 붙여 넣어 주세요.' }; }
    if (!d || d.app !== 'pacemark') return { ok: false, why: 'Pace Mark에서 내보낸 글이 아니에요.' };
    var errs = validate(d);
    if (errs.length) return { ok: false, why: errs[0] + (errs.length > 1 ? ' 외 ' + (errs.length - 1) + '곳' : '') };
    var data = fill({ templates: d.templates, sessions: d.sessions, run: null, lastTpl: d.lastTpl, settings: d.settings });
    return { ok: true, data: data };
  }

  window.Store = { KEY: KEY, blank: blank, load: load, save: save, clear: clear, validate: validate, exportText: exportText, parseImport: parseImport };
})();
