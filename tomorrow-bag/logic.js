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
    // icon: 처음 나온 출처의 그림 (꾸러미면 pk.icon, 알림장 📝, 요일 규칙 📅, 매일 🎒)
    function add(name, src, group, icon) {
      var n = norm(name);
      if (!n) return;
      var key = n.toLowerCase();
      var it = map[key];
      if (!it) {
        it = { name: n, sources: [], group: group, icon: icon || '🎒' };
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
      if (n.kid === kid.id && n.date === k) n.items.forEach(function (x) { add(x, n.title ? '알림장 · ' + n.title : '알림장', 'note', '📝'); });
    });
    (state.rules || []).forEach(function (r) {
      if (r.on && r.dow === w) add(r.item, DATA.DOW[w] + '요일', 'rule', '📅');
    });
    if (day) {
      day.p.forEach(function (pid, i) {
        var pk = pid ? findPack(state.packs, pid) : null;
        periods.push(pk ? pk.name : '');
        if (pk) pk.items.forEach(function (x) { add(x, (i + 1) + '교시 ' + pk.name, 'class', pk.icon); });
      });
      day.after.slice().sort(function (a, b) { return (a.time || '').localeCompare(b.time || ''); }).forEach(function (a) {
        var pk = findPack(state.packs, a.packId);
        if (!pk) return;
        pk.items.forEach(function (x) { add(x, '방과후 ' + pk.name, 'after', pk.icon); });
        pickups.push({ time: a.time || '', name: pk.name, icon: pk.icon, who: a.who || '' });
      });
    }
    (state.daily || []).forEach(function (x) { add(x, '매일', 'daily', '🎒'); });

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

  // 꾸러미 찾기·거르기·정렬: 이름이나 물건에 찾는 말이 든 것, 종류(all/subj/acad), 순서(base/name/many)
  function findPacks(packs, q, kind, sort) {
    var t = norm(q).toLowerCase();
    var list = packs.filter(function (p) {
      if (kind && kind !== 'all' && p.kind !== kind) return false;
      if (!t) return true;
      return p.name.toLowerCase().indexOf(t) >= 0 || p.items.some(function (x) { return x.toLowerCase().indexOf(t) >= 0; });
    });
    if (sort === 'name') list.sort(function (a, b) { return a.name.localeCompare(b.name, 'ko'); });
    else if (sort === 'many') list.sort(function (a, b) { return b.items.length - a.items.length || a.name.localeCompare(b.name, 'ko'); });
    return list;
  }

  // 기록 날짜별 거르기(all/miss/full)·정렬(new/old/low)·물건 찾기(빠진 물건 이름)
  function filterHistory(list, show, sort, q) {
    var t = norm(q).toLowerCase();
    function pct(h) { return h.total ? h.done / h.total : 0; }
    var out = list.filter(function (h) {
      if (show === 'miss' && !h.missed.length) return false;
      if (show === 'full' && h.missed.length) return false;
      if (t && !h.missed.some(function (m) { return m.toLowerCase().indexOf(t) >= 0; })) return false;
      return true;
    });
    out.sort(function (a, b) {
      if (sort === 'low') return pct(a) - pct(b) || (a.date < b.date ? 1 : -1);
      if (sort === 'old') return a.date < b.date ? -1 : 1;
      return a.date < b.date ? 1 : -1;
    });
    return out;
  }

  // 며칠 뒤 준비물: fromKey 다음 날부터 days 일 안의 그 아이 알림장을 날짜순으로 (미리 사 둘 것)
  function upcoming(state, kid, fromKey, days) {
    if (!kid) return [];
    var end = addDays(fromKey, days || 7);
    return (state.notes || []).filter(function (n) {
      return n.kid === kid.id && n.date > fromKey && n.date <= end;
    }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  }

  // 처음 설정 3단계: ① 시간표 칸 5개 이상 ② 방과후 1개 이상 ③ 알림장 1개 이상 또는 체크 1회
  function setupSteps(state, kid) {
    if (!kid) return null;
    var filled = 0, total = 0, after = 0;
    for (var d = 1; d <= 5; d++) {
      var w = kid.week[d];
      total += w.p.length;
      w.p.forEach(function (x) { if (x) filled++; });
      after += w.after.length;
    }
    var notes = (state.notes || []).filter(function (n) { return n.kid === kid.id; }).length;
    var checked = Object.keys(state.checks || {}).some(function (ck) {
      return ck.indexOf(kid.id + '|') === 0 && state.checks[ck].length > 0;
    }) || (state.history || []).some(function (h) { return h.kid === kid.id; });
    var steps = [
      { key: 'week', done: filled >= 5, filled: filled, total: total },
      { key: 'after', done: after >= 1, n: after },
      { key: 'note', done: notes >= 1 || checked, n: notes }
    ];
    return { steps: steps, n: steps.filter(function (s) { return s.done; }).length, all: steps.every(function (s) { return s.done; }) };
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

  // 다 챙겼을 때 가족·선생님께 보낼 한 줄: '하윤 내일 준비물 다 챙겼어요' (+ 날짜·물건 수)
  // 다 챙기지 않았으면 '' — 화면은 이때 복사 버튼을 그리지 않는다
  function doneText(state, kid, bag, todayKey) {
    if (!kid || !bag.items.length) return '';
    var done = state.checks[checkKey(kid.id, bag.date)] || [];
    if (!bag.items.every(function (it) { return done.indexOf(it.name) >= 0; })) return '';
    var rel = relLabel(bag.date, todayKey);
    var when = (rel === '오늘' || rel === '내일' || rel === '모레') ? rel : shortLabel(bag.date);
    return kid.name + ' ' + when + ' 준비물 다 챙겼어요 ✓\n(' + shortLabel(bag.date) + ' 가방 ' + bag.items.length + '개 모두)';
  }

  // ---- 선생님 모드: 반 이름·날짜·준비물·메모를 링크 주소 # 뒤에 담는다 (서버 없음) ----
  // 담는 꼴: JSON { v:1, c:반 이름, d:날짜, i:[준비물], m:메모 } → UTF-8 → base64url
  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  function utf8Bytes(s) {
    var out = [];
    s = String(s);
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c >= 0xD800 && c < 0xDC00 && i + 1 < s.length) {
        var d = s.charCodeAt(i + 1);
        if (d >= 0xDC00 && d < 0xE000) { c = 0x10000 + ((c - 0xD800) << 10) + (d - 0xDC00); i++; }
      }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }
  function bytesText(b) {
    var s = '', i = 0;
    while (i < b.length) {
      var c = b[i++];
      if (c >= 0xF0) { c = ((c & 7) << 18) | ((b[i++] & 63) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63); c -= 0x10000; s += String.fromCharCode(0xD800 + (c >> 10), 0xDC00 + (c & 1023)); continue; }
      if (c >= 0xE0) c = ((c & 15) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63);
      else if (c >= 0xC0) c = ((c & 31) << 6) | (b[i++] & 63);
      s += String.fromCharCode(c);
    }
    return s;
  }
  function b64url(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i += 3) {
      var n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
      s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
      if (i + 1 < bytes.length) s += B64[(n >> 6) & 63];
      if (i + 2 < bytes.length) s += B64[n & 63];
    }
    return s;
  }
  function unb64url(s) {
    var out = [], acc = 0, nb = 0;
    for (var i = 0; i < s.length; i++) {
      var v = B64.indexOf(s.charAt(i));
      if (v < 0) return null;
      acc = (acc << 6) | v; nb += 6;
      if (nb >= 8) { nb -= 8; out.push((acc >> nb) & 255); }
    }
    return out;
  }
  function teacherPack(t) {
    return b64url(utf8Bytes(JSON.stringify({ v: 1, c: t.c, d: t.d, i: t.i, m: t.m || '' })));
  }
  // 링크에서 다시 읽기. 꼴이 틀리면 null
  function teacherUnpack(s) {
    var b = unb64url(String(s || ''));
    if (!b) return null;
    var o;
    try { o = JSON.parse(bytesText(b)); } catch (e) { return null; }
    if (!o || o.v !== 1 || typeof o.c !== 'string' || !validKey(o.d) || !Array.isArray(o.i)) return null;
    var items = o.i.filter(function (x) { return typeof x === 'string' && norm(x); }).map(norm);
    if (!items.length) return null;
    return { c: norm(o.c), d: o.d, i: items, m: typeof o.m === 'string' ? norm(o.m) : '' };
  }

  // 부모 쪽: 선생님 링크 준비물을 그 아이·그날 알림장에 넣는다.
  // 그날 가방에 이미 있는 물건(알림장·수업·방과후·요일·매일 어디서든, 띄어쓰기·대소문자 무시)은 새로 넣지 않고 하나로 합친다.
  // 같은 반 링크를 또 열면 그 반 알림장 하나에 이어 붙인다. 저장 검사(store.js validate)를 넘지 않게 길이를 자른다.
  function mergeTeacher(state, kid, t, newId) {
    var cls = norm(t.c).slice(0, 20) || '선생님';
    var memo = norm(t.m).slice(0, 100);
    var items = t.i.map(norm).filter(function (x) { return x && x.length <= 40; }).slice(0, 15);
    var have = {};
    buildBag(state, kid, t.d).items.forEach(function (it) { have[it.name.toLowerCase()] = true; });
    var added = [], merged = [];
    items.forEach(function (x) {
      var key = x.toLowerCase();
      if (have[key]) { if (merged.indexOf(x) < 0 && added.indexOf(x) < 0) merged.push(x); return; }
      have[key] = true;
      added.push(x);
    });
    var note = null;
    (state.notes || []).forEach(function (n) { if (n.kid === kid.id && n.date === t.d && n.from === cls) note = n; });
    if (added.length) {
      if (note) note.items = note.items.concat(added).slice(0, 30);
      else {
        note = { id: newId, kid: kid.id, date: t.d, title: cls + ' 선생님', items: added.slice(), from: cls };
        state.notes.push(note);
      }
    }
    if (note && memo) note.memo = memo;
    return { cls: cls, date: t.d, added: added, merged: merged, note: note };
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
    eq('알림장 물건 그림', bag.items[0].icon, '📝');
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
    // 7) 며칠 뒤 준비물: 10/26 가방 기준, 그날(10/26)·8일 뒤(11/3)·다른 아이는 빼고 10/28·11/2 두 개, 날짜순
    var up = upcoming({ notes: [
      { kid: 'k', date: '2026-11-02', items: ['돗자리'] },
      { kid: 'k', date: '2026-10-26', items: ['색종이'] },
      { kid: 'k', date: '2026-11-03', items: ['휴지 심'] },
      { kid: 'x', date: '2026-10-27', items: ['풀'] },
      { kid: 'k', date: '2026-10-28', items: ['리코더'] }
    ] }, { id: 'k' }, '2026-10-26', 7);
    eq('며칠 뒤 준비물 수', up.length, 2);
    eq('며칠 뒤 준비물 첫 날', up.length ? up[0].date : '', '2026-10-28');
    // 7-2) 처음 설정 단계: 칸 4개·방과후 1개·체크 1회면 2/3, 칸을 5개로 채우면 셋 다
    var sw = { 1: { p: ['a', 'b', 'c', null], after: [{ id: 'a1' }] }, 2: { p: ['d', null, null, null], after: [] }, 3: { p: [null, null, null, null], after: [] }, 4: { p: [null, null, null, null], after: [] }, 5: { p: [null, null, null, null], after: [] } };
    var sst = { notes: [], checks: { 'k|2026-10-26': ['물병'] }, history: [] };
    var ss = setupSteps(sst, { id: 'k', week: sw });
    eq('처음 설정 끝낸 단계', ss.n + '|' + ss.steps[0].filled + '/' + ss.steps[0].total, '2|4/20');
    sw[2].p[1] = 'e';
    eq('처음 설정 셋 다', setupSteps(sst, { id: 'k', week: sw }).all, true);
    // 8) 선생님 링크: 담은 것을 다시 읽으면 같다 (한글·이모지 포함)
    var tp = teacherUnpack(teacherPack({ c: '2학년 3반', d: '2026-10-27', i: ['색종이', '풀 🧴'], m: '이름 쓰기' }));
    eq('선생님 링크 다시 읽기', tp ? tp.c + '|' + tp.d + '|' + tp.i.join(',') + '|' + tp.m : '', '2학년 3반|2026-10-27|색종이,풀 🧴|이름 쓰기');
    eq('망가진 선생님 링크', teacherUnpack('@@'), null);
    // 9) 부모가 링크를 열면: 10/26 가방에 색종이(알림장)·물병(매일)이 이미 있으면 그 둘은 합치고 풀만 새로, 같은 링크를 또 열면 0개
    var ps = { packs: [], rules: [], daily: ['물병'], checks: {}, settings: { holidays: [] },
      notes: [{ id: 'n1', kid: 'k', date: '2026-10-26', items: ['색종이'] }] };
    var pk = { id: 'k', week: { 1: { p: [], after: [] } } };
    var link = { c: '2학년 3반', d: '2026-10-26', i: ['색종이', ' 물병 ', '풀'], m: '' };
    var m1 = mergeTeacher(ps, pk, link, 'n2');
    eq('링크 받기 새로 넣은 것', m1.added.join(','), '풀');
    eq('링크 받기 합친 것', m1.merged.join(','), '색종이,물병');
    eq('링크 받은 뒤 가방 물건 수', buildBag(ps, pk, '2026-10-26').items.length, 3);
    eq('같은 링크 또 열기', mergeTeacher(ps, pk, link, 'n3').added.length + '|' + ps.notes.length, '0|2');
    // 9-2) 다 챙김 문구: 하나라도 남으면 '', 다 챙기면 '하윤 내일 준비물 다 챙겼어요' 로 시작
    var dk = { id: 'k', name: '하윤', week: pk.week };
    var dbag = buildBag(ps, dk, '2026-10-26');
    ps.checks[checkKey('k', '2026-10-26')] = ['풀'];
    eq('다 챙김 문구 (남은 것 있음)', doneText(ps, dk, dbag, '2026-10-25'), '');
    ps.checks[checkKey('k', '2026-10-26')] = dbag.items.map(function (it) { return it.name; });
    eq('다 챙김 문구 첫 줄', doneText(ps, dk, dbag, '2026-10-25').split('\n')[0], '하윤 내일 준비물 다 챙겼어요 ✓');
    if (typeof QR !== 'undefined') {
      // 10) QR 오류 정정: 1-M 'HELLO WORLD' 데이터 16글자의 오류 정정 10글자
      var hw = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
      eq('QR 오류 정정 글자', QR.rsRemainder(hw, QR.rsDivisor(10)).join(','), '196,35,39,119,235,215,231,226,93,23');
      eq('QR 1-M 데이터 글자 수', QR.dataCodewords(1), 16);
      eq('QR 10-M 데이터 글자 수', QR.dataCodewords(10), 216);
      var q = QR.make('ABCDEFGHIJKLMN'); // 14바이트 → 1판(21칸)
      eq('QR 14바이트 판 크기', q ? q.size : 0, 21);
    }
    return res;
  }

  return {
    toKey: toKey, fromKey: fromKey, addDays: addDays, dow: dow, validKey: validKey,
    isSchoolDay: isSchoolDay, nextSchoolDay: nextSchoolDay, prevSchoolDay: prevSchoolDay, bagDate: bagDate,
    label: label, shortLabel: shortLabel, relLabel: relLabel,
    buildBag: buildBag, progress: progress, snapshot: snapshot, closePast: closePast, checkKey: checkKey,
    summary: summary, byWeekday: byWeekday, findPacks: findPacks, filterHistory: filterHistory, upcoming: upcoming, setupSteps: setupSteps, shareText: shareText, doneText: doneText, teacherPack: teacherPack, teacherUnpack: teacherUnpack, mergeTeacher: mergeTeacher, selfTest: selfTest, findPack: findPack, norm: norm,
    GROUPS: GROUPS, GROUP_NAME: GROUP_NAME
  };
})();
