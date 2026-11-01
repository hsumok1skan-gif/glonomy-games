/* Spray Gate — 계산 (날짜·계량·수확 문·판정·요약·점검) */
(function () {
  'use strict';

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // 기기 현지 날짜로 'YYYY-MM-DD'
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return ymd(new Date()); }

  // 2월 30일 같은 없는 날을 거른다
  function validDate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var p = s.split('-').map(Number);
    var t = new Date(p[0], p[1] - 1, p[2]);
    return t.getFullYear() === p[0] && t.getMonth() === p[1] - 1 && t.getDate() === p[2];
  }
  function parse(s) {
    if (!validDate(s)) return null;
    var p = s.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  // new Date(y, m, d + n) 이 월말·윤년·연말을 넘겨 준다
  function addDays(s, n) {
    var t = parse(s);
    if (!t) return '';
    return ymd(new Date(t.getFullYear(), t.getMonth(), t.getDate() + n));
  }
  // b - a (날 수). 서머타임이 있는 곳에서도 어긋나지 않게 UTC 로 센다
  function diff(a, b) {
    var A = parse(a), B = parse(b);
    if (!A || !B) return 0;
    return Math.round((Date.UTC(B.getFullYear(), B.getMonth(), B.getDate()) - Date.UTC(A.getFullYear(), A.getMonth(), A.getDate())) / 86400000);
  }
  function md(s) { return s ? s.slice(5).replace('-', '.') : ''; }
  function wday(s) { var t = parse(s); return t ? '일월화수목금토'.charAt(t.getDay()) : ''; }
  function monthDays(y, m) { return new Date(y, m, 0).getDate(); }

  // 물 L 와 희석배수로 약 양(mL·g). 소수 한 자리
  function dose(water, dil) {
    water = Number(water); dil = Number(dil);
    if (!(water > 0) || !(dil > 0)) return 0;
    return Math.round(water * 1000 / dil * 10) / 10;
  }
  // 면적(㎡)과 10a(1000㎡)당 물 양으로 뿌릴 물 양
  function waterForArea(areaM2, per10a) {
    areaM2 = Number(areaM2); per10a = Number(per10a);
    if (!(areaM2 > 0) || !(per10a > 0)) return 0;
    return Math.round(areaM2 / 1000 * per10a * 10) / 10;
  }
  function fmtNum(n) {
    if (n >= 100) return String(Math.round(n * 10) / 10);
    return String(n);
  }

  function findField(st, id) { for (var i = 0; i < st.fields.length; i++) if (st.fields[i].id === id) return st.fields[i]; return null; }
  function findProduct(st, id) { for (var i = 0; i < st.products.length; i++) if (st.products[i].id === id) return st.products[i]; return null; }
  function findSpray(st, id) { for (var i = 0; i < st.sprays.length; i++) if (st.sprays[i].id === id) return st.sprays[i]; return null; }

  // 이번 작기(밭의 작기 시작일부터)의 살포
  function seasonSprays(st, fid, exceptId) {
    var f = findField(st, fid);
    if (!f) return [];
    return st.sprays.filter(function (s) {
      return s.fieldId === fid && s.id !== exceptId && (!f.start || s.date >= f.start);
    }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  }

  // 이번 작기에 그 약을 친 횟수
  function usesOf(st, fid, pid, exceptId) {
    var n = 0;
    seasonSprays(st, fid, exceptId).forEach(function (s) {
      s.items.forEach(function (it) { if (it.pid === pid) n++; });
    });
    return n;
  }

  // 수확 문: 이번 작기 살포마다 (날짜 + 수확 전 날수) 가운데 가장 늦은 날
  function gate(st, fid, exceptId) {
    var rows = [];
    seasonSprays(st, fid, exceptId).forEach(function (s) {
      s.items.forEach(function (it) {
        rows.push({ sprayId: s.id, pid: it.pid, name: it.name, date: s.date, phi: it.phi, until: addDays(s.date, it.phi) });
      });
    });
    var earliest = '';
    var by = null;
    rows.forEach(function (r) { if (!earliest || r.until > earliest) { earliest = r.until; by = r; } });
    return { rows: rows, earliest: earliest, by: by };
  }

  // 횟수를 넘긴 약 (이번 작기)
  function overUses(st, fid) {
    var count = {}, out = [];
    seasonSprays(st, fid).forEach(function (s) {
      s.items.forEach(function (it) {
        count[it.pid] = (count[it.pid] || 0) + 1;
        if (it.max > 0 && count[it.pid] === it.max + 1) out.push({ pid: it.pid, name: it.name, max: it.max });
      });
    });
    out.forEach(function (o) { o.used = count[o.pid]; });
    return out;
  }

  // 출하 판정: 이 날 수확해도 되는가
  function checkHarvest(st, fid, H) {
    var g = gate(st, fid);
    var margin = st.settings.margin;
    var reasons = [];
    var verdict = 'ok';
    var rows = g.rows.map(function (r) {
      var m = diff(r.until, H);
      var v = m < 0 ? 'bad' : (m < margin ? 'tight' : 'ok');
      return { name: r.name, date: r.date, phi: r.phi, until: r.until, margin: m, v: v };
    });
    rows.forEach(function (r) {
      if (r.v === 'bad') { verdict = 'bad'; reasons.push(r.name + ' (' + md(r.date) + ' 살포) 은 ' + md(r.until) + ' 부터 수확할 수 있어요 — ' + (-r.margin) + '일 이릅니다'); }
    });
    overUses(st, fid).forEach(function (o) {
      verdict = 'bad';
      reasons.push(o.name + ' 을 이번 작기에 ' + o.used + '회 쳤어요 (라벨 ' + o.max + '회 이내)');
    });
    if (verdict !== 'bad') {
      rows.forEach(function (r) {
        if (r.v === 'tight') { verdict = 'tight'; reasons.push(r.name + ' 의 수확 문이 ' + md(r.until) + ' 에 열려 여유가 ' + r.margin + '일뿐이에요'); }
      });
    }
    if (!rows.length) reasons.push('이번 작기 살포 기록이 없어요');
    else if (verdict === 'ok') reasons.push('모든 약이 수확 전 날수를 ' + margin + '일 이상 남기고 지켜요');
    return { verdict: verdict, rows: rows, earliest: g.earliest, reasons: reasons };
  }

  // 살포 판정: 이 밭에 이 날 이 약들을 치면 (차별점 — 살포 화면이 약을 고를 때마다 부른다)
  function planSpray(st, fid, date, pids, exceptId) {
    var f = findField(st, fid);
    var out = { verdict: 'none', rows: [], before: '', after: '', harvest: f ? f.harvest : '', reasons: [] };
    if (!f || !validDate(date)) return out;
    var g = gate(st, fid, exceptId);
    out.before = g.earliest;
    out.after = g.earliest;
    var margin = st.settings.margin;
    var verdict = 'ok';
    pids.forEach(function (pid) {
      var p = findProduct(st, pid);
      if (!p) return;
      var until = addDays(date, p.phi);
      var used = usesOf(st, fid, pid, exceptId);
      var row = { pid: pid, name: p.name, phi: p.phi, max: p.max, until: until, used: used, after: used + 1, over: p.max > 0 && used + 1 > p.max, margin: null, v: 'ok' };
      if (f.harvest) row.margin = diff(until, f.harvest);
      if (row.over) { row.v = 'bad'; out.reasons.push(p.name + ': 이번 작기 ' + used + '회 쳤어요. 라벨은 ' + p.max + '회 이내라 더 칠 수 없어요'); }
      if (row.margin !== null && row.margin < 0) { row.v = 'bad'; out.reasons.push(p.name + ': 수확 문이 ' + md(until) + ' 에 열려 수확 예정 ' + md(f.harvest) + ' 보다 ' + (-row.margin) + '일 늦어요'); }
      else if (row.margin !== null && row.margin < margin && row.v !== 'bad') { row.v = 'tight'; out.reasons.push(p.name + ': 수확 예정일까지 여유가 ' + row.margin + '일뿐이에요'); }
      if (row.v === 'bad') verdict = 'bad';
      else if (row.v === 'tight' && verdict !== 'bad') verdict = 'tight';
      if (!out.after || until > out.after) out.after = until;
      out.rows.push(row);
    });
    if (!out.rows.length) { out.verdict = 'none'; return out; }
    if (f.start && date < f.start) out.reasons.push('작기 시작일(' + md(f.start) + ') 보다 앞선 날이라 이번 작기 횟수에 들지 않아요');
    if (verdict === 'ok') out.reasons.push(f.harvest ? '수확 예정 ' + md(f.harvest) + ' 전에 수확 문이 열리고 횟수도 남아요' : '수확 예정일이 없어 수확 문만 계산했어요');
    out.verdict = verdict;
    return out;
  }

  // 오늘(그 날) 이 밭에 쳐도 되는 약 카드
  function safeProducts(st, fid, date) {
    return st.products.map(function (p) {
      return { p: p, r: planSpray(st, fid, date, [p.id]) };
    });
  }

  // 밭마다 지금 상태 (오늘 화면)
  function fieldStatus(st, f, now) {
    var g = gate(st, f.id);
    var s = { field: f, earliest: g.earliest, by: g.by, open: !g.earliest || g.earliest <= now, daysLeft: g.earliest ? diff(now, g.earliest) : 0, verdict: 'none', toHarvest: f.harvest ? diff(now, f.harvest) : null };
    if (f.harvest) s.verdict = checkHarvest(st, f.id, f.harvest).verdict;
    return s;
  }

  // 오늘 할 일 (A-27: 알림 대신 오늘 화면 맨 위에 띄운다). 밭마다 가장 급한 것 하나, 급한 순(bad → warn → ok)
  var TASK_LEVEL = { bad: 0, warn: 1, ok: 2 };
  function todayTasks(st, now) {
    var out = [];
    st.fields.forEach(function (f) {
      var s = fieldStatus(st, f, now);
      var t = null;
      if (f.harvest && s.toHarvest < 0) t = { kind: 'passed', level: 'warn', text: '수확 예정(' + md(f.harvest) + ')이 지났어요. 거뒀으면 다음 작기로 밭을 고쳐 두세요', btn: '밭 고치기', act: 'open-field' };
      else if (s.verdict === 'bad') t = { kind: 'gate-bad', level: 'bad', text: '수확 예정 ' + md(f.harvest) + ' (D-' + s.toHarvest + ') 에 출하할 수 없어요. 수확 문은 ' + md(s.earliest) + ' 에 열려요', btn: '출하 판정', act: 'open-gate' };
      else if (f.harvest && s.toHarvest === 0) t = { kind: 'harvest-today', level: 'ok', text: '오늘 수확 예정이에요. 수확 문이 열려 있어 거둬도 돼요', btn: '출하 판정', act: 'open-gate' };
      else if (s.verdict === 'tight' && s.toHarvest <= 7) t = { kind: 'tight', level: 'warn', text: '수확 예정 D-' + s.toHarvest + ', 여유가 빠듯해요. 수확 전까지 약을 더 치지 마세요', btn: '출하 판정', act: 'open-gate' };
      else if (s.earliest && s.earliest === now) t = { kind: 'gate-opens', level: 'ok', text: '오늘 수확 문이 열려요 (' + (s.by ? s.by.name : '') + ' ' + (s.by ? s.by.phi : 0) + '일 전까지)', btn: '출하 판정', act: 'open-gate' };
      else if (f.harvest && s.toHarvest <= 3) t = { kind: 'harvest-soon', level: 'ok', text: '수확 예정 D-' + s.toHarvest + '. 수확 문은 열려 있어요', btn: '출하 판정', act: 'open-gate' };
      if (t) { t.fieldId = f.id; t.name = f.name; out.push(t); }
    });
    if (st.fields.length && !st.products.length) out.push({ kind: 'no-product', level: 'warn', fieldId: '', name: '약 카드', text: '약 병 라벨을 옮겨 적어 두면 살포 때 바로 계산돼요', btn: '약 카드 만들기', act: 'open-product' });
    return out.sort(function (a, b) { return TASK_LEVEL[a.level] - TASK_LEVEL[b.level]; });
  }

  // 달 요약
  function monthStats(st, ym) {
    var list = st.sprays.filter(function (s) { return s.date.slice(0, 7) === ym; });
    var byProduct = {}, byField = {}, water = 0, items = 0, targets = {};
    list.forEach(function (s) {
      water += Number(s.water) * (s.tanks || 1);
      byField[s.fieldId] = (byField[s.fieldId] || 0) + 1;
      s.items.forEach(function (it) { items++; byProduct[it.name] = (byProduct[it.name] || 0) + 1; });
      (s.targets || []).forEach(function (t) { targets[t] = (targets[t] || 0) + 1; });
    });
    function top(o) { return Object.keys(o).map(function (k) { return [k, o[k]]; }).sort(function (a, b) { return b[1] - a[1]; }); }
    var days = {};
    list.forEach(function (s) { days[s.date] = 1; });
    return { count: list.length, days: Object.keys(days).length, water: Math.round(water * 10) / 10, items: items, products: top(byProduct), fields: top(byField), targets: top(targets) };
  }

  // 정렬 — 약 카드 목록·일지 목록에서 사용자가 고른다
  var SORTS = {
    product: [['name', '이름순'], ['used', '많이 쓴 순'], ['phi', '수확 전 날수 짧은 순']],
    log: [['new', '최신순'], ['old', '오래된 순'], ['field', '밭 이름순']]
  };
  function byName(a, b) { return String(a).localeCompare(String(b), 'ko'); }
  function useCount(st, pid) {
    var n = 0;
    st.sprays.forEach(function (s) { s.items.forEach(function (it) { if (it.pid === pid) n++; }); });
    return n;
  }
  function sortProducts(st, list, key) {
    var used = {};
    if (key === 'used') list.forEach(function (p) { used[p.id] = useCount(st, p.id); });
    return list.slice().sort(function (a, b) {
      if (key === 'used' && used[a.id] !== used[b.id]) return used[b.id] - used[a.id];
      if (key === 'phi' && Number(a.phi) !== Number(b.phi)) return Number(a.phi) - Number(b.phi);
      return byName(a.name, b.name);
    });
  }
  function sortSprays(st, list, key) {
    function fname(s) { var f = findField(st, s.fieldId); return f ? f.name : ''; }
    function newest(a, b) { return a.date === b.date ? byName(b.id, a.id) : (a.date < b.date ? 1 : -1); }
    return list.slice().sort(function (a, b) {
      if (key === 'old') return -newest(a, b);
      if (key === 'field') { var c = byName(fname(a), fname(b)); if (c) return c; }
      return newest(a, b);
    });
  }

  // 출하 판정 글
  function shareText(st, now) {
    var lines = ['[밭별 수확 가능일 · ' + md(now) + ' 기준]'];
    st.fields.forEach(function (f) {
      var g = gate(st, f.id);
      var line = '- ' + f.name + ' (' + f.crop + '): ';
      if (!g.earliest) line += '이번 작기 살포 없음';
      else line += md(g.earliest) + ' 부터 수확 가능 (마지막 ' + g.by.name + ' ' + md(g.by.date) + ' 살포, ' + g.by.phi + '일 전까지)';
      if (f.harvest) {
        var v = checkHarvest(st, f.id, f.harvest).verdict;
        line += ' / 수확 예정 ' + md(f.harvest) + ' ' + VERDICT[v];
      }
      lines.push(line);
    });
    return lines.join('\n');
  }

  var VERDICT = { ok: '괜찮음', tight: '빠듯', bad: '불가', none: '-' };

  // 입력 검사
  function checkNum(v, min, max, label, integer) {
    var s = String(v == null ? '' : v).trim();
    if (!s) return { ok: false, msg: label + ' 을 넣어 주세요' };
    var n = Number(s);
    if (!isFinite(n)) return { ok: false, msg: label + ' 은 숫자로 넣어 주세요' };
    if (integer && Math.floor(n) !== n) return { ok: false, msg: label + ' 은 정수로 넣어 주세요' };
    if (n < min || n > max) return { ok: false, msg: label + ' 은 ' + min + '~' + max + ' 사이로 넣어 주세요' };
    return { ok: true, val: n };
  }
  function checkText(v, max, label, required) {
    var s = String(v == null ? '' : v).trim();
    if (required && !s) return { ok: false, msg: label + ' 을 넣어 주세요' };
    if (s.length > max) return { ok: false, msg: label + ' 은 ' + max + '자 안으로 써 주세요 (지금 ' + s.length + '자)' };
    return { ok: true, val: s };
  }

  function countContent() {
    var D = window.DATA;
    return D.CROPS.length + D.PESTS.length + D.DILUTIONS.length + D.TANKS.length + D.KINDS.length +
      D.SAFETY.length + D.STEPS.length + D.TIPS.length + D.WEATHER.length;
  }

  // 계산 점검 — 기획서 `계산 예시` 와 같은 값이어야 한다
  function selfTest() {
    var T = [];
    function t(label, got, want) { T.push({ label: label, got: String(got), want: String(want), ok: String(got) === String(want) }); }
    t('물 20L · 1000배 → 약 mL', dose(20, 1000), 20);
    t('물 18L · 2000배 → 약 mL', dose(18, 2000), 9);
    t('물 500L · 1500배 → 약 mL', dose(500, 1500), 333.3);
    t('면적 660㎡ · 10a당 200L → 물 L', waterForArea(660, 200), 132);
    t('11-01 살포 · 7일 전까지 → 수확 가능', addDays('2026-11-01', 7), '2026-11-08');
    t('2028-02-25 살포 · 7일 (윤년) → 수확 가능', addDays('2028-02-25', 7), '2028-03-03');
    t('2026-12-28 살포 · 5일 (연말) → 수확 가능', addDays('2026-12-28', 5), '2027-01-02');
    t('2026-02-30 은 없는 날', validDate('2026-02-30'), false);
    t('2028년 2월 날 수', monthDays(2028, 2), 29);
    var st = {
      settings: { margin: 2 },
      fields: [{ id: 'f1', name: '앞밭', crop: '상추', start: '2026-10-01', harvest: '2026-11-10' }],
      products: [{ id: 'p1', name: '가약', phi: 7, max: 2, dil: 1000 }, { id: 'p2', name: '나약', phi: 3, max: 3, dil: 2000 }],
      sprays: [
        { id: 's1', fieldId: 'f1', date: '2026-11-01', items: [{ pid: 'p1', name: '가약', phi: 7, max: 2 }] },
        { id: 's2', fieldId: 'f1', date: '2026-11-03', items: [{ pid: 'p2', name: '나약', phi: 3, max: 3 }] },
        { id: 's0', fieldId: 'f1', date: '2026-09-20', items: [{ pid: 'p1', name: '가약', phi: 7, max: 2 }] }
      ]
    };
    t('수확 문 (11-01 7일 · 11-03 3일)', gate(st, 'f1').earliest, '2026-11-08');
    t('11-07 수확 판정', checkHarvest(st, 'f1', '2026-11-07').verdict, 'bad');
    t('11-08 수확 판정 (여유 2일)', checkHarvest(st, 'f1', '2026-11-08').verdict, 'tight');
    t('11-10 수확 판정', checkHarvest(st, 'f1', '2026-11-10').verdict, 'ok');
    t('작기 앞 살포는 횟수에서 뺌', usesOf(st, 'f1', 'p1'), 1);
    t('10-25 가약 한 번 더 (2회 이내, 여유 9일)', planSpray(st, 'f1', '2026-10-25', ['p1']).verdict, 'ok');
    st.sprays.push({ id: 's3', fieldId: 'f1', date: '2026-11-02', items: [{ pid: 'p1', name: '가약', phi: 7, max: 2 }] });
    t('가약 세 번째 → 불가', planSpray(st, 'f1', '2026-11-04', ['p1']).verdict, 'bad');
    t('11-06 나약 (수확 11-10, 여유 1일)', planSpray(st, 'f1', '2026-11-06', ['p2']).verdict, 'tight');
    t('일지 오래된 순 (작기 앞 09-20 먼저)', sortSprays(st, st.sprays, 'old').map(function (s) { return s.id; }).join(','), 's0,s1,s3,s2');
    t('약 카드 많이 쓴 순 (가약 3번 · 나약 1번)', sortProducts(st, st.products.slice().reverse(), 'used').map(function (p) { return p.name; }).join(','), '가약,나약');
    var st2 = {
      settings: { margin: 2 },
      fields: [{ id: 'a', name: '지난밭', crop: '상추', start: '2026-10-01', harvest: '2026-11-03' }, { id: 'b', name: '겹친밭', crop: '시금치', start: '2026-10-01', harvest: '2026-11-07' }],
      products: [{ id: 'p1', name: '가약', phi: 7, max: 2, dil: 1000 }],
      sprays: [{ id: 'x1', fieldId: 'b', date: '2026-11-01', items: [{ pid: 'p1', name: '가약', phi: 7, max: 2 }] }]
    };
    t('11-05 오늘 할 일 (겹친 밭 먼저, 지난 밭 다음)', todayTasks(st2, '2026-11-05').map(function (x) { return x.kind; }).join(','), 'gate-bad,passed');
    t('기본 내용 수', countContent(), 169);
    return T;
  }

  window.Logic = {
    pad: pad, ymd: ymd, today: today, validDate: validDate, parse: parse, addDays: addDays, diff: diff, md: md, wday: wday, monthDays: monthDays,
    dose: dose, waterForArea: waterForArea, fmtNum: fmtNum,
    findField: findField, findProduct: findProduct, findSpray: findSpray,
    seasonSprays: seasonSprays, usesOf: usesOf, gate: gate, overUses: overUses, checkHarvest: checkHarvest, planSpray: planSpray,
    safeProducts: safeProducts, fieldStatus: fieldStatus, todayTasks: todayTasks, monthStats: monthStats, shareText: shareText,
    SORTS: SORTS, sortProducts: sortProducts, sortSprays: sortSprays,
    VERDICT: VERDICT, checkNum: checkNum, checkText: checkText, countContent: countContent, selfTest: selfTest
  };
})();
