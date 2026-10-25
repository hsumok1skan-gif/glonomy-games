/* Tomorrow Bag — 날짜 계산, 가방 목록 만들기, 기록 요약, 계산 점검 */
var Logic = (function () {
  // ---- 날짜 (모두 기기 현지 날짜, 'YYYY-MM-DD') ----
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromKey(k) {
    var p = k.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0); // 정오로 잡아 서머타임·자정 넘김에 흔들리지 않게
  }
  // new Date(y, m, d + n) 이 월말·윤년을 넘겨 준다
  function addDays(k, n) {
    var d = fromKey(k);
    return toKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12, 0, 0));
  }
  function dow(k) { return fromKey(k).getDay(); }
  function validKey(k) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return false;
    return toKey(fromKey(k)) === k; // 2월 30일 같은 없는 날은 다른 날로 바뀌어 걸러진다
  }

  function isSchoolDay(k, holidays) {
    var w = dow(k);
    if (w === 0 || w === 6) return false;
    return (holidays || []).indexOf(k) < 0;
  }

  // k 다음의 학교 가는 날 (k 는 빼고), 쉬는 날이 길어도 60일 안에서 찾는다
  function nextSchoolDay(k, holidays) {
    var c = k;
    for (var i = 0; i < 60; i++) {
      c = addDays(c, 1);
      if (isSchoolDay(c, holidays)) return c;
    }
    return addDays(k, 1);
  }
  function prevSchoolDay(k, holidays) {
    var c = k;
    for (var i = 0; i < 60; i++) {
      c = addDays(c, -1);
      if (isSchoolDay(c, holidays)) return c;
    }
    return addDays(k, -1);
  }

  // 지금 챙길 가방의 날짜: 학교 가는 날 바뀌는 시각 전이면 오늘, 아니면 다음 학교 가는 날
  function bagDate(now, settings) {
    var today = toKey(now);
    var hs = settings.holidays || [];
    if (isSchoolDay(today, hs) && now.getHours() < settings.switchHour) return today;
    return nextSchoolDay(today, hs);
  }

  function label(k) {
    var d = fromKey(k);
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + DATA.DOW[d.getDay()] + '요일';
  }
  function shortLabel(k) {
    var d = fromKey(k);
    return (d.getMonth() + 1) + '/' + d.getDate() + '(' + DATA.DOW[d.getDay()] + ')';
  }
  // 오늘과의 거리로 '오늘·내일·모레·n일 뒤'
  function relLabel(k, todayKey) {
    var diff = Math.round((fromKey(k) - fromKey(todayKey)) / 86400000);
    if (diff === 0) return '오늘';
    if (diff === 1) return '내일';
    if (diff === 2) return '모레';
    if (diff > 2) return diff + '일 뒤';
    if (diff === -1) return '어제';
    return (-diff) + '일 전';
  }

  // ---- 가방 목록 ----
  var GROUPS = ['note', 'rule', 'class', 'after', 'daily'];
  var GROUP_NAME = { note: '알림장 준비물', rule: '요일마다', class: '수업', after: '방과후', daily: '매일' };

  function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  function findPack(packs, id) {
    for (var i = 0; i < packs.length; i++) if (packs[i].id === id) return packs[i];
    return null;
  }

  // 차별점의 중심: 시간표(교시·방과후) + 요일 규칙 + 알림장 + 매일 물건을 한 목록으로 합치고, 물건마다 왜 필요한지(출처)를 모은다
  function buildBag(state, kid, k) {
    var map = {};
    var order = [];
    function add(name, src, group) {
      var n = norm(name);
      if (!n) return;
      var key = n.toLowerCase();
      var it = map[key];
      if (!it) {
        it = { name: n, sources: [], group: group };
        map[key] = it;
        order.push(it);
      }
      if (it.sources.indexOf(src) < 0) it.sources.push(src);
      if (GROUPS.indexOf(group) < GROUPS.indexOf(it.group)) it.group = group;
    }
    var w = dow(k);
    var day = (w >= 1 && w <= 5 && kid && kid.week) ? kid.week[w] : null;
    var periods = [];
    var pickups = [];

    (state.notes || []).forEach(function (n) {
      if (n.kid === kid.id && n.date === k) n.items.forEach(function (x) { add(x, n.title ? '알림장 · ' + n.title : '알림장', 'note'); });
    });
    (state.rules || []).forEach(function (r) {
      if (r.on && r.dow === w) add(r.item, DATA.DOW[w] + '요일', 'rule');
    });
    if (day) {
      day.p.forEach(function (pid, i) {
        var pk = pid ? findPack(state.packs, pid) : null;
        periods.push(pk ? pk.name : '');
        if (pk) pk.items.forEach(function (x) { add(x, (i + 1) + '교시 ' + pk.name, 'class'); });
      });
      day.after.slice().sort(function (a, b) { return (a.time || '').localeCompare(b.time || ''); }).forEach(function (a) {
        var pk = findPack(state.packs, a.packId);
        if (!pk) return;
        pk.items.forEach(function (x) { add(x, '방과후 ' + pk.name, 'after'); });
        pickups.push({ time: a.time || '', name: pk.name, icon: pk.icon, who: a.who || '' });
      });
    }
    (state.daily || []).forEach(function (x) { add(x, '매일', 'daily'); });

    order.sort(function (a, b) { return GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group); });
    return { date: k, items: order, periods: periods, pickups: pickups, school: isSchoolDay(k, state.settings.holidays) };
  }

  function checkKey(kidId, k) { return kidId + '|' + k; }

  function progress(state, kid, bag) {
    var done = state.checks[checkKey(kid.id, bag.date)] || [];
    var n = 0;
    bag.items.forEach(function (it) { if (done.indexOf(it.name) >= 0) n++; });
    return { done: n, total: bag.items.length, pct: bag.items.length ? Math.round(n * 100 / bag.items.length) : 0 };
  }

  // 그날 가방을 기록 한 줄로
  function snapshot(state, kid, k) {
    var bag = buildBag(state, kid, k);
    var done = state.checks[checkKey(kid.id, k)] || [];
    var missed = bag.items.filter(function (it) { return done.indexOf(it.name) < 0; }).map(function (it) { return it.name; });
    return { kid: kid.id, date: k, total: bag.items.length, done: bag.items.length - missed.length, missed: missed };
  }

  // 지나간 날 가운데 체크를 했지만 기록이 없는 날을 기록으로 닫는다
  function closePast(state, todayKey) {
    var added = 0;
    Object.keys(state.checks).forEach(function (ck) {
      var p = ck.split('|');
      var kid = null;
      state.kids.forEach(function (x) { if (x.id === p[0]) kid = x; });
      if (!kid || !p[1] || p[1] >= todayKey) return;
      var has = state.history.some(function (h) { return h.kid === kid.id && h.date === p[1]; });
      if (!has) {
        var s = snapshot(state, kid, p[1]);
        s.auto = true;
        state.history.push(s);
        added++;
      }
    });
    return added;
  }

  // 기록 요약: 챙김률, 다 챙긴 날, 연속 다 챙긴 날, 자주 빠뜨린 것
  function summary(history, kidId, fromKeyStr) {
    var list = history.filter(function (h) { return h.kid === kidId && (!fromKeyStr || h.date >= fromKeyStr); });
    list.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var tot = 0, dn = 0, full = 0, streak = 0, miss = {};
    list.forEach(function (h) {
      tot += h.total; dn += h.done;
      if (h.total > 0 && h.done === h.total) { full++; streak++; } else streak = 0;
      h.missed.forEach(function (m) { miss[m] = (miss[m] || 0) + 1; });
    });
    var top = Object.keys(miss).map(function (m) { return { name: m, n: miss[m] }; })
      .sort(function (a, b) { return b.n - a.n || (a.name < b.name ? -1 : 1); }).slice(0, 5);
    return { days: list.length, rate: tot ? Math.round(dn * 100 / tot) : 0, full: full, streak: streak, top: top, list: list };
  }

  // 요일별 챙김률 (월~금)
  function byWeekday(list) {
    var r = {};
    for (var i = 1; i <= 5; i++) r[i] = { t: 0, d: 0 };
    list.forEach(function (h) {
      var w = dow(h.date);
      if (r[w]) { r[w].t += h.total; r[w].d += h.done; }
    });
    var out = [];
    for (var j = 1; j <= 5; j++) out.push({ dow: j, pct: r[j].t ? Math.round(r[j].d * 100 / r[j].t) : null });
    return out;
  }

  // 가족에게 보낼 글
  function shareText(state, kid, bag) {
    var done = state.checks[checkKey(kid.id, bag.date)] || [];
    var lines = ['[' + kid.name + ' ' + shortLabel(bag.date) + ' 가방]'];
    bag.items.forEach(function (it) {
      lines.push((done.indexOf(it.name) >= 0 ? '☑ ' : '☐ ') + it.name + ' — ' + it.sources.join(', '));
    });
    if (bag.pickups.length) {
      lines.push('');
      lines.push('방과후');
      bag.pickups.forEach(function (p) {
        lines.push('· ' + (p.time || '시간 미정') + ' ' + p.name + (p.who ? ' — 데리러: ' + p.who : ''));
      });
    }
    return lines.join('\n');
  }

  // ---- 계산 점검: 기획서 `계산 예시` 와 같은 값을 내는지 ----
  function selfTest() {
    var res = [];
    function eq(name, got, want) { res.push({ name: name, ok: got === want, got: got, want: want }); }
    // 1) 금요일 다음 학교 가는 날은 월요일
    eq('2026-10-30(금) 다음 학교 가는 날', nextSchoolDay('2026-10-30', []), '2026-11-02');
    // 2) 윤년 2월 28일(월) 다음 날은 2월 29일(화)
    eq('2028-02-28(월) 다음 학교 가는 날', nextSchoolDay('2028-02-28', []), '2028-02-29');
    // 3) 연말 + 쉬는 날: 2026-12-31(목) 다음, 2027-01-01(금) 쉬면 2027-01-04(월)
    eq('2026-12-31 다음 (1/1 쉬는 날)', nextSchoolDay('2026-12-31', ['2027-01-01']), '2027-01-04');
    // 4) 합치기: 같은 물병이 1·3교시 체육, 방과후 수영, 매일에서 나오면 한 줄, 출처 4개
    var st = {
      packs: [
        { id: 'A', name: '체육', items: ['체육복', '물병'] },
        { id: 'B', name: '국어', items: ['국어 교과서'] },
        { id: 'C', name: '수영', items: ['수영복', '물병'] }
      ],
      daily: ['물병', '필통'],
      rules: [{ dow: 1, item: '실내화 주머니', on: true }],
      notes: [{ kid: 'k', date: '2026-10-26', items: ['색종이', '필통'] }],
      checks: { 'k|2026-10-26': ['물병', '체육복'] },
      settings: { holidays: [] }
    };
    var kid = { id: 'k', week: { 1: { p: ['A', 'B', 'A'], after: [{ packId: 'C', time: '15:00', who: '아빠' }] } } };
    var bag = buildBag(st, kid, '2026-10-26');
    var bottle = bag.items.filter(function (i) { return i.name === '물병'; })[0];
    eq('합친 물건 수', bag.items.length, 7);
    eq('물병 출처 수', bottle ? bottle.sources.length : 0, 4);
    eq('맨 위 물건 (알림장 먼저)', bag.items[0].name, '색종이');
    eq('챙김 진행률', progress(st, kid, bag).pct, 29); // 2/7 = 28.6% → 29
    // 5) 기록 요약: 10/10, 8/10, 5/5 → 23/25 = 92%, 다 챙긴 날 2, 연속 1
    var sm = summary([
      { kid: 'k', date: '2026-10-21', total: 10, done: 10, missed: [] },
      { kid: 'k', date: '2026-10-22', total: 10, done: 8, missed: ['리코더', '물병'] },
      { kid: 'k', date: '2026-10-23', total: 5, done: 5, missed: [] }
    ], 'k');
    eq('챙김률', sm.rate, 92);
    eq('다 챙긴 날', sm.full, 2);
    eq('연속 다 챙긴 날', sm.streak, 1);
    // 6) 없는 날짜 거르기
    eq('2026-02-30 은 없는 날', validKey('2026-02-30'), false);
    return res;
  }

  return {
    toKey: toKey, fromKey: fromKey, addDays: addDays, dow: dow, validKey: validKey,
    isSchoolDay: isSchoolDay, nextSchoolDay: nextSchoolDay, prevSchoolDay: prevSchoolDay, bagDate: bagDate,
    label: label, shortLabel: shortLabel, relLabel: relLabel,
    buildBag: buildBag, progress: progress, snapshot: snapshot, closePast: closePast, checkKey: checkKey,
    summary: summary, byWeekday: byWeekday, shareText: shareText, selfTest: selfTest, findPack: findPack, norm: norm,
    GROUPS: GROUPS, GROUP_NAME: GROUP_NAME
  };
})();
