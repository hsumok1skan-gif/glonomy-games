/* 내일 가방 — 날짜 계산, 가방 목록 만들기, 물건 그림 찾기, 칭찬 스티커, 계산 점검 */
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
  // '11월 2일(월)' — 가족에게 보낼 한 줄, 가방 시트 제목
  function dayLabel(k) {
    var d = fromKey(k);
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일(' + DATA.DOW[d.getDay()] + ')';
  }
  // '11/2' — 칭찬 스티커 위 날짜
  function shortDay(k) {
    var d = fromKey(k);
    return (d.getMonth() + 1) + '/' + d.getDate();
  }
  // 받침이 있는 한글 이름이면 '이'를 붙여 부르는 이름으로 (하윤 → 하윤이, 서아 → 서아)
  function nameI(name) {
    var s = String(name || '');
    var c = s.charCodeAt(s.length - 1);
    if (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0) return s + '이';
    return s;
  }

  // ---- 물건 그림: 이름에 든 말로 가장 비슷한 그림을 찾는다. 없으면 가방 그림 ----
  function iconFor(name) {
    var n = norm(name).toLowerCase();
    var best = null, score = 0;
    DATA.ICONS.forEach(function (ic) {
      ic.w.forEach(function (w) {
        // 한 글자 말(자·풀·책·띠·물·공·옷·통)은 낱말 하나로 있을 때만 맞는다 (모자·연필 두 자루에 '자'가 붙지 않게)
        var ok = w.length > 1 ? n.indexOf(w) >= 0 :
          (n === w || n.indexOf(w + ' ') === 0 || n.slice(-(w.length + 1)) === ' ' + w || n.indexOf(' ' + w + ' ') >= 0);
        if (ok && w.length > score) { score = w.length; best = ic; }
      });
    });
    if (best) return best;
    for (var i = 0; i < DATA.ICONS.length; i++) if (DATA.ICONS[i].id === 'bag') return DATA.ICONS[i];
    return DATA.ICONS[DATA.ICONS.length - 1];
  }

  // ---- 칭찬 스티커: 날짜마다 정해진 하나 (12가지) ----
  function stickerFor(k) {
    var p = String(k).split('-');
    return ((+p[0]) * 7 + (+p[1]) * 31 + (+p[2]) * 5) % 12;
  }
  // 그 달(YYYY-MM)에 가방을 다 챙긴 날 수 = 가방 달력의 스티커 수
  function monthStickers(history, kidId, ym) {
    var seen = {};
    (history || []).forEach(function (h) {
      if (h.kid === kidId && String(h.date).slice(0, 7) === ym && h.total > 0 && h.done === h.total) seen[h.date] = true;
    });
    return Object.keys(seen).length;
  }
  // 스티커 모음판: 그 아이가 다 챙긴 날(같은 날은 한 번)을 스티커 12가지별로 센다 → 길이 12 배열
  function stickerBook(history, kidId) {
    var out = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], seen = {};
    (history || []).forEach(function (h) {
      if (h.kid !== kidId || !(h.total > 0 && h.done === h.total) || seen[h.date]) return;
      seen[h.date] = true;
      out[stickerFor(h.date)]++;
    });
    return out;
  }
  // 연속으로 다 챙긴 학교 가는 날 수: todayKey 를 아직 다 챙기지 않았으면 그 앞 학교 가는 날부터 거슬러 센다
  // 주말·쉬는 날은 prevSchoolDay 가 건너뛰므로 끊지 않는다
  function streak(history, kidId, todayKey, holidays) {
    var full = {};
    (history || []).forEach(function (h) {
      if (h.kid === kidId && h.total > 0 && h.done === h.total) full[h.date] = true;
    });
    var k = full[todayKey] ? todayKey : prevSchoolDay(todayKey, holidays), n = 0;
    while (full[k] && n < 1000) { n++; k = prevSchoolDay(k, holidays); }
    return n;
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
    // pic: 물건 이름으로 찾은 물건 그림 id (가방 시트 칸에 그린다)
    function add(name, src, group, icon) {
      var n = norm(name);
      if (!n) return;
      var key = n.toLowerCase();
      var it = map[key];
      if (!it) {
        it = { name: n, sources: [], group: group, icon: icon || '🎒', pic: iconFor(n).id };
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
    var changedP = [];   // 이날만 바꾼 교시 자리 (0 부터)
    // 이날만 바꾼 것을 시간표보다 먼저 본다: p 는 교시번호(1 부터) → 꾸러미 id 또는 null(빈 칸), after 는 방과후 id → {who, off}
    var edit = (state.dayEdits && kid && state.dayEdits[checkKey(kid.id, k)]) || {};
    var editP = edit.p || {}, editAfter = edit.after || {};

    (state.notes || []).forEach(function (n) {
      if (n.kid === kid.id && n.date === k) n.items.forEach(function (x) { add(x, n.title ? '알림장 · ' + n.title : '알림장', 'note', '📝'); });
    });
    (state.rules || []).forEach(function (r) {
      if (r.on && r.dow === w) add(r.item, DATA.DOW[w] + '요일', 'rule', '📅');
    });
    if (day) {
      day.p.forEach(function (pid, i) {
        var over = Object.prototype.hasOwnProperty.call(editP, i + 1);
        var id = over ? editP[i + 1] : pid;
        if (over && (id || null) !== (pid || null)) changedP.push(i);
        var pk = id ? findPack(state.packs, id) : null;
        periods.push(pk ? pk.name : '');
        if (pk) pk.items.forEach(function (x) { add(x, (i + 1) + '교시 ' + pk.name, 'class', pk.icon); });
      });
      day.after.slice().sort(function (a, b) { return (a.time || '').localeCompare(b.time || ''); }).forEach(function (a) {
        var pk = findPack(state.packs, a.packId);
        if (!pk) return;
        var ae = editAfter[a.id] || {};
        var base = a.who || '';
        var who = typeof ae.who === 'string' ? ae.who : base;
        var off = !!ae.off;
        // 이날 쉬는 방과후는 물건을 넣지 않고, 쉰다고 보여 주려고 pickups 에만 남긴다
        if (!off) pk.items.forEach(function (x) { add(x, '방과후 ' + pk.name, 'after', pk.icon); });
        var pu = { id: pk.id, aid: a.id, time: a.time || '', name: pk.name, icon: pk.icon, pic: pk.pic, who: who };
        if (off) pu.off = true;
        if (off || who !== base) pu.changed = true;
        pickups.push(pu);
      });
    }
    (state.daily || []).forEach(function (x) { add(x, '매일', 'daily', '🎒'); });

    // 가방 시트에서 '내일은 빼기' 한 물건은 그날 가방에서만 뺀다
    var skip = (state.skips && kid && state.skips[checkKey(kid.id, k)]) || [];
    if (skip.length) order = order.filter(function (it) { return skip.indexOf(it.name) < 0; });
    // 늘 학교에 두는 물건은 모든 날에 뺀다. 알림장·선생님 링크로 온 것은 그날 가져가야 하니 남긴다
    order = order.filter(function (it) { return it.group === 'note' || !isStay(state, it.name); });
    order.sort(function (a, b) { return GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group); });
    order.forEach(function (it) {
      it.morning = isMorning(state, it.name);   // 가방 시트에서 '아침' 쪽으로 모은다
      it.stay = isStay(state, it.name);         // 알림장으로 남은 물건이면 말풍선에서 되돌릴 수 있게
    });
    return { date: k, items: order, periods: periods, changedP: changedP, pickups: pickups, school: isSchoolDay(k, state.settings.holidays) };
  }

  function checkKey(kidId, k) { return kidId + '|' + k; }

  // 이번 주 누가 데리러 가나: fromKey 부터(학교 가는 날이 아니면 다음 학교 가는 날부터) 학교 가는 날 5일 동안
  // 모든 아이의 buildBag(...).pickups 가운데 쉬지 않는 것을 사람별로 모은다 → { 사람이름: [{date, time, kid, name}] }
  // who 가 '' 이면 '정하지 않음' 키. buildBag 이 dayEdits 를 보므로 이날만 바꾼 사람도 그대로 반영된다
  var NO_WHO = '정하지 않음';
  function pickupWeek(state, fromKey) {
    var hs = (state.settings && state.settings.holidays) || [];
    var k = isSchoolDay(fromKey, hs) ? fromKey : nextSchoolDay(fromKey, hs);
    var out = {};
    for (var i = 0; i < 5; i++) {
      (state.kids || []).forEach(function (kid) {
        buildBag(state, kid, k).pickups.forEach(function (p) {
          if (p.off) return;
          var who = p.who || NO_WHO;
          (out[who] = out[who] || []).push({ date: k, time: p.time, kid: kid.name, name: p.name });
        });
      });
      k = nextSchoolDay(k, hs);
    }
    Object.keys(out).forEach(function (w) {
      out[w].sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.time || '').localeCompare(b.time || ''); });
    });
    return out;
  }
  // 칩 한 칸 글: '11/16(월) 14:30 하윤 태권도'
  function pickupLine(p) { return shortLabel(p.date) + ' ' + (p.time ? p.time + ' ' : '') + p.kid + ' ' + p.name; }
  // 복사할 글: '아빠 이번 주 데리러 갈 날: 11/16(월) 14:30 하윤 태권도, …' (없으면 '아빠 이번 주 데리러 갈 날: 없음')
  function pickupWeekText(who, list) {
    var head = (who === NO_WHO ? '데리러 갈 사람을 정하지 않은 날' : who + ' 이번 주 데리러 갈 날') + ': ';
    return head + ((list && list.length) ? list.map(pickupLine).join(', ') : '없음');
  }

  // 앞 학교 가는 날 가방과 달라진 것: { add: 오늘에만 있는 이름, out: 어제에만 있는 이름 } (norm·소문자로 비교, 매일 물건은 양쪽에 있어 빠진다)
  function bagDiff(state, kid, k) {
    var cur = buildBag(state, kid, k).items;
    var prev = buildBag(state, kid, prevSchoolDay(k, state.settings.holidays)).items;
    function keys(list) {
      var o = {};
      list.forEach(function (it) { o[norm(it.name).toLowerCase()] = true; });
      return o;
    }
    function only(list, other) {
      return list.filter(function (it) { return !other[norm(it.name).toLowerCase()]; }).map(function (it) { return it.name; });
    }
    return { add: only(cur, keys(prev)), out: only(prev, keys(cur)) };
  }

  // 어제 넣은 물건 그대로: 앞 학교 가는 날 챙긴 물건(S.checks) 가운데 오늘 가방에도 있는 것 (norm·소문자 비교).
  // 아침에 넣을 물건(물병·도시락)은 밤사이 꺼내므로 뺀다. 오늘 가방의 이름으로 돌려준다
  function carryOver(state, kid, k) {
    if (!kid) return [];
    var prevK = prevSchoolDay(k, (state.settings && state.settings.holidays) || []);
    var had = {};
    ((state.checks || {})[checkKey(kid.id, prevK)] || []).forEach(function (x) { had[norm(x).toLowerCase()] = true; });
    return buildBag(state, kid, k).items.filter(function (it) {
      return had[norm(it.name).toLowerCase()] && !isMorning(state, it.name);
    }).map(function (it) { return it.name; });
  }

  function progress(state, kid, bag) {
    var done = state.checks[checkKey(kid.id, bag.date)] || [];
    var n = 0;
    bag.items.forEach(function (it) { if (done.indexOf(it.name) >= 0) n++; });
    return { done: n, total: bag.items.length, pct: bag.items.length ? Math.round(n * 100 / bag.items.length) : 0 };
  }

  // 아침에 넣을 물건(물병·도시락처럼 밤에는 넣지 않는 것)인지: 이름을 다듬어 소문자로 비교한다
  function isMorning(state, name) {
    var key = norm(name).toLowerCase();
    return (state.morning || []).some(function (m) { return norm(m).toLowerCase() === key; });
  }

  // 늘 학교에 두는 물건인지: 이름을 다듬어 소문자로 비교한다
  function isStay(state, name) {
    var key = norm(name).toLowerCase();
    return (state.stay || []).some(function (m) { return norm(m).toLowerCase() === key; });
  }

  // 밤에 챙길 것(아침 물건을 뺀 나머지)이 하나 이상 있고 모두 챙겼으면 true — 아침 물건은 남아도 다 챙긴 것으로 친다
  function nightDone(state, kid, bag) {
    if (!kid || !bag.items.length) return false;
    var done = state.checks[checkKey(kid.id, bag.date)] || [];
    var night = bag.items.filter(function (it) { return !isMorning(state, it.name); });
    return night.length > 0 && night.every(function (it) { return done.indexOf(it.name) >= 0; });
  }

  // 그날 가방을 기록 한 줄로 (챙기지 않은 아침 물건은 아침에 넣으니 덜 챙긴 것으로 세지 않는다)
  function snapshot(state, kid, k) {
    var bag = buildBag(state, kid, k);
    var done = state.checks[checkKey(kid.id, k)] || [];
    var items = bag.items.filter(function (it) { return done.indexOf(it.name) >= 0 || !isMorning(state, it.name); });
    var missed = items.filter(function (it) { return done.indexOf(it.name) < 0; }).map(function (it) { return it.name; });
    return { kid: kid.id, date: k, total: items.length, done: items.length - missed.length, missed: missed };
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

  // 자주 덜 챙긴 물건: fromKey 부터(toKey 가 있으면 그날 앞까지) 그 아이 기록의 missed 를 이름(norm·소문자)별로 센다
  // 화면에 말로 보이지 않는다. 가방 시트에서 2번 이상인 물건을 그 쪽 맨 앞 칸에 놓기만 한다 (ui.js bagPages)
  function missCounts(history, kidId, fromKey, toKey) {
    var out = {};
    (history || []).forEach(function (h) {
      if (h.kid !== kidId || (fromKey && h.date < fromKey) || (toKey && h.date >= toKey)) return;
      var seen = {};
      (h.missed || []).forEach(function (m) {
        var key = norm(m).toLowerCase();
        if (!key || seen[key]) return;
        seen[key] = true;
        out[key] = (out[key] || 0) + 1;
      });
    });
    return out;
  }

  // 알림장 준비물 고르기: 찾는 말(이름에 든 것)·갈래 거르기(all 또는 갈래 이름)·순서(base 갈래 순서 / name 가나다순 / often 자주 쓰는 순)
  // usage: 지금까지 알림장에 넣은 횟수 { 이름(소문자): n }
  function findSupplies(q, cat, sort, usage) {
    var t = norm(q).toLowerCase();
    var out = [], seen = {};
    DATA.SUPPLIES.forEach(function (g) {
      if (cat && cat !== 'all' && g.cat !== cat) return;
      g.items.forEach(function (x) {
        if (seen[x]) return;
        if (t && x.toLowerCase().indexOf(t) < 0) return;
        seen[x] = true;
        out.push({ name: x, o: out.length });
      });
    });
    usage = usage || {};
    if (sort === 'name') out.sort(function (a, b) { return a.name.localeCompare(b.name, 'ko'); });
    else if (sort === 'often') out.sort(function (a, b) { return (usage[b.name.toLowerCase()] || 0) - (usage[a.name.toLowerCase()] || 0) || a.o - b.o; });
    return out.map(function (x) { return x.name; });
  }
  // 알림장에 넣은 준비물 횟수 (자주 쓰는 순)
  function supplyUsage(state) {
    var u = {};
    (state.notes || []).forEach(function (n) {
      (n.items || []).forEach(function (x) { var key = norm(x).toLowerCase(); u[key] = (u[key] || 0) + 1; });
    });
    return u;
  }

  // 알림장 글 붙여 넣기: 학교 알림 앱·문자로 온 글에서 가져갈 날과 준비물을 뽑는다 → { date: 'YYYY-MM-DD' 또는 null, items: [...] }
  // items: ① 글 안에 든 DATA.SUPPLIES 이름 (긴 말 먼저 찾고 찾은 자리는 지워 '딱풀' 안의 '풀'이 또 잡히지 않게, 한 글자 말은 낱말일 때만)
  //        ② '준비물:'·'준비물 -' 뒤(빈 줄 앞까지)를 쉼표·줄바꿈·'/'로 나눈 말 (norm, 40자 이하). 대소문자·띄어쓰기 무시하고 중복 없음
  // date: 글에서 가장 먼저 나온 '내일'·'모레'·'n월 n일'·'n/n'. 해가 없는 날짜가 baseKey 보다 60일 넘게 앞이면 다음 해로 본다
  var SUP_BY_LEN = null;
  function parseNoteText(text, baseKey) {
    var raw = String(text || '');
    var items = [], seen = {};
    function push(x) {
      var n = norm(x);
      var key = n.toLowerCase();
      if (!n || n.length > 40 || seen[key]) return;
      seen[key] = true;
      items.push(n);
    }
    if (!SUP_BY_LEN) {
      var all = [];
      DATA.SUPPLIES.forEach(function (g) { g.items.forEach(function (x) { if (all.indexOf(x) < 0) all.push(x); }); });
      SUP_BY_LEN = all.map(function (x, i) { return { x: x, i: i }; })
        .sort(function (a, b) { return b.x.length - a.x.length || a.i - b.i; })
        .map(function (o) { return o.x; });
    }
    var hay = raw.replace(/\s+/g, ' ').toLowerCase();
    SUP_BY_LEN.forEach(function (x) {
      var w = x.toLowerCase(), from = 0, hit = false, at;
      while ((at = hay.indexOf(w, from)) >= 0) {
        from = at + w.length;
        if (w.length === 1) {
          var pv = hay.charAt(at - 1), nx = hay.charAt(at + 1);
          if (/[가-힣a-z0-9]/.test(pv)) continue;
          if (/[가-힣]/.test(nx) && '을를이가은는과와도랑만'.indexOf(nx) < 0) continue;
        }
        hit = true;
        hay = hay.slice(0, at) + new Array(w.length + 1).join('\u0001') + hay.slice(at + w.length);
      }
      if (hit) push(x);
    });
    var mk = /준비물\s*(?::|：|-)\s*/.exec(raw);
    if (mk) {
      raw.slice(mk.index + mk[0].length).split(/\n\s*\n/)[0].split(/[,，、\n\/]/).forEach(function (p) {
        push(p.replace(/^\s*(?:[-•·*▶▷○●◦]+|\d+[.)])\s*/, ''));
      });
    }

    var cands = [];
    var re, m;
    re = /내일\s*모레|내일|모레/g;
    while ((m = re.exec(raw))) cands.push({ at: m.index, key: addDays(baseKey, m[0] === '내일' ? 1 : 2) });
    function md(at, mo, d) {
      var y = +baseKey.slice(0, 4);
      var k = y + '-' + pad(mo) + '-' + pad(d);
      if (validKey(k) && k < addDays(baseKey, -60)) k = (y + 1) + '-' + pad(mo) + '-' + pad(d);
      if (validKey(k)) cands.push({ at: at, key: k });
    }
    re = /(\d{1,2})\s*월\s*(\d{1,2})\s*일/g;
    while ((m = re.exec(raw))) md(m.index, +m[1], +m[2]);
    re = /(^|[^\d\/])(\d{1,2})\/(\d{1,2})(?![\d\/])/g;
    while ((m = re.exec(raw))) md(m.index + m[1].length, +m[2], +m[3]);
    cands.sort(function (a, b) { return a.at - b.at; });
    return { date: cands.length ? cands[0].key : null, items: items };
  }

  // 며칠 뒤 준비물: fromKey 다음 날부터 days 일 안의 그 아이 알림장을 날짜순으로 (미리 사 둘 것)
  function upcoming(state, kid, fromKey, days) {
    if (!kid) return [];
    var end = addDays(fromKey, days || 7);
    return (state.notes || []).filter(function (n) {
      return n.kid === kid.id && n.date > fromKey && n.date <= end;
    }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  }

  // 살 것 글: '사 둘 것: 휴지 심 2개, 돗자리' (빈 이름·같은 이름(띄어쓰기·대소문자 무시)은 한 번만)
  function buyText(list) {
    var seen = [], out = [];
    (list || []).forEach(function (x) {
      var t = norm(x), low = t.toLowerCase();
      if (!t || seen.indexOf(low) >= 0) return;
      seen.push(low); out.push(t);
    });
    return out.length ? '사 둘 것: ' + out.join(', ') : '';
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

  // 학년 기본 시간표: grade 가 든 묶음을 periods 길이로 자르고(모자라면 빈 칸), 지운 꾸러미 칸은 비운다
  function gradeWeek(tables, packs, grade, periods) {
    var t = null;
    (tables || []).forEach(function (x) { if (x.grades.indexOf(grade) >= 0) t = x; });
    if (!t) return null;
    var w = {};
    for (var d = 1; d <= 5; d++) {
      var p = [];
      for (var i = 0; i < periods; i++) {
        var id = t.week[d][i];
        p.push(id && findPack(packs, id) ? id : null);
      }
      w[d] = p;
    }
    return w;
  }

  // ---- 교시 시간: 기본 1교시 09:00~09:40, 쉬는 시간 10분, 4교시 뒤 점심 50분 ----
  var MAX_P = 7;
  function hm(min) { var h = Math.floor(min / 60), m = min % 60; return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }
  function toMin(t) { var m = /^(\d{2}):(\d{2})$/.exec(t || ''); return m ? (+m[1]) * 60 + (+m[2]) : -1; }
  function defaultTimes() {
    var out = [], t = 9 * 60;
    for (var i = 0; i < MAX_P; i++) {
      out.push([hm(t), hm(t + 40)]);
      t += 40 + (i === 3 ? 50 : 10);
    }
    return out;
  }
  // 저장된 교시 시간이 맞으면 그대로, 아니면 기본값
  function periodTimes(settings) {
    var p = settings && settings.ptimes;
    if (!Array.isArray(p) || p.length !== MAX_P) return defaultTimes();
    var ok = p.every(function (x) { return Array.isArray(x) && toMin(x[0]) >= 0 && toMin(x[1]) > toMin(x[0]); });
    return ok ? p : defaultTimes();
  }
  // 고친 교시 시간 검사: 틀린 첫 칸 { i, end, msg } 또는 null
  function checkTimes(list) {
    for (var i = 0; i < list.length; i++) {
      var s = toMin(list[i][0]), e = toMin(list[i][1]);
      if (s < 0) return { i: i, end: false, msg: (i + 1) + '교시 시작 시각을 골라 주세요.' };
      if (e < 0) return { i: i, end: true, msg: (i + 1) + '교시 끝 시각을 골라 주세요.' };
      if (e <= s) return { i: i, end: true, msg: (i + 1) + '교시는 시작보다 늦게 끝나야 해요.' };
      if (i && s < toMin(list[i - 1][1])) return { i: i, end: false, msg: (i + 1) + '교시는 ' + i + '교시가 끝난 뒤에 시작해요.' };
    }
    return null;
  }
  // 점심: 앞 교시 끝과 다음 교시 시작 사이가 30분 이상인 첫 자리 (그 앞 교시 번호, 0 부터). 없으면 -1
  function lunchAfter(list, n) {
    for (var i = 0; i + 1 < Math.min(n, list.length); i++) if (toMin(list[i + 1][0]) - toMin(list[i][1]) >= 30) return i;
    return -1;
  }

  // 가족에게 보낼 글: 첫 줄 '하윤이 11월 2일(월) 가방 다 챙겼어요 🎒' (다 챙기기 전에는 '챙기고 있어요'),
  // 데리러 갈 사람이 있으면 둘째 줄 '14:30 태권도 → 아빠' (여럿이면 · 로 이어 한 줄)
  function shareText(state, kid, bag) {
    var pr = progress(state, kid, bag);
    var full = (pr.total > 0 && pr.done === pr.total) || nightDone(state, kid, bag);
    var first = nameI(kid.name) + ' ' + dayLabel(bag.date) + (full ? ' 가방 다 챙겼어요 🎒' : ' 가방을 챙기고 있어요 🎒');
    var who = bag.pickups.filter(function (p) { return p.who && !p.off; }).map(function (p) {
      return (p.time ? p.time + ' ' : '') + p.name + ' → ' + p.who;
    });
    return who.length ? first + '\n' + who.join(' · ') : first;
  }

  // 다 챙겼을 때 가족·선생님께 보낼 글 (shareText 와 같다). 다 챙기지 않았으면 ''
  function doneText(state, kid, bag) {
    if (!kid || !bag.items.length) return '';
    var done = state.checks[checkKey(kid.id, bag.date)] || [];
    if (!bag.items.every(function (it) { return done.indexOf(it.name) >= 0; }) && !nightDone(state, kid, bag)) return '';
    return shareText(state, kid, bag);
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

  // ---- 가족 링크: 아이 하나의 시간표를 링크 주소(#f=…) 안에 담아 다른 보호자 폰으로 넘긴다 (서버 없음) ----
  // 담는 꼴: JSON { v:1, n:이름, g:학년, c:교시 수, w:[요일마다 칸별 꾸러미 번호(1부터, 0은 빈 칸)], a:[[요일, 꾸러미 번호, 시각, 데리러 갈 사람]],
  //   k:[꾸러미], u:[데리러 갈 사람], o:[[날짜, 이유, [준비물], 메모, 반]] } → UTF-8 → base64url
  // QR코드에 담기게, 고치지 않은 기본 꾸러미는 id 만 담는다
  function defaultPack(id) {
    var out = null;
    function look(list, kind) {
      list.forEach(function (d) { if (d.id === id) out = { id: d.id, kind: kind, name: d.name, icon: d.icon, pic: d.pic, items: d.items.slice() }; });
    }
    look(DATA.SUBJECTS, 'subj');
    look(DATA.ACADEMIES, 'acad');
    return out;
  }
  function samePack(a, b) { return a.name === b.name && a.kind === b.kind && a.items.join('\n') === b.items.join('\n'); }
  function familyPack(state, kid, todayKey) {
    var today = todayKey || toKey(new Date());
    var ids = [], used = [];
    function packNo(id) {
      if (!id) return 0;
      var at = ids.indexOf(id);
      if (at >= 0) return at + 1;
      var p = findPack(state.packs, id);
      if (!p) return 0;
      ids.push(id);
      used.push(p);
      return ids.length;
    }
    var w = [], a = [];
    for (var d = 1; d <= 5; d++) {
      var day = (kid.week && kid.week[d]) || { p: [], after: [] };
      var row = [];
      for (var i = 0; i < kid.periods; i++) row.push(packNo(day.p[i]));
      w.push(row);
      day.after.forEach(function (x) {
        var n = packNo(x.packId);
        if (n) a.push([d, n, x.time || '', x.who || '']);
      });
    }
    var k = used.map(function (p) {
      var base = defaultPack(p.id);
      if (base && samePack(p, base) && p.icon === base.icon && (!p.pic || p.pic === base.pic)) return p.id;
      return [p.id, p.kind === 'acad' ? 'acad' : 'subj', p.name, p.icon || '', p.pic || '', p.items];
    });
    var o = (state.notes || []).filter(function (n) {
      return n.kid === kid.id && n.date >= today && validKey(n.date);
    }).map(function (n) { return [n.date, n.title || '', n.items, n.memo || '', n.from || '']; });
    return b64url(utf8Bytes(JSON.stringify({ v: 1, n: kid.name, g: +kid.grade || 1, c: kid.periods, w: w, a: a, k: k, u: state.settings.guardians || [], o: o })));
  }
  // 링크에서 다시 읽기. 꼴이 틀리면 null. 받은 값은 믿지 않는다: id 는 글자를 가리고, 긴 글은 저장 검사(store.js validate)를 넘지 않게 자른다
  function familyUnpack(s) {
    var b = unb64url(String(s || ''));
    if (!b) return null;
    var o;
    try { o = JSON.parse(bytesText(b)); } catch (e) { return null; }
    function isInt(x, lo, hi) { return typeof x === 'number' && x % 1 === 0 && x >= lo && x <= hi; }
    function str(x) { return typeof x === 'string'; }
    function cut(x, n) { return norm(x).slice(0, n); }
    function words(list) { return list.filter(str).map(function (x) { return cut(x, 60); }).filter(Boolean); }
    if (!o || o.v !== 1 || !str(o.n) || !isInt(o.g, 1, 6) || !isInt(o.c, 4, 7)) return null;
    if (!Array.isArray(o.w) || o.w.length !== 5 || !Array.isArray(o.a) || !Array.isArray(o.k) || !Array.isArray(o.u) || !Array.isArray(o.o)) return null;
    var name = cut(o.n, 30);
    if (!name) return null;

    var packs = [], i;
    for (i = 0; i < o.k.length; i++) {
      var e = o.k[i], pk = null;
      if (str(e)) pk = defaultPack(e);
      else if (Array.isArray(e) && e.length === 6 && str(e[0]) && /^[A-Za-z0-9_-]{1,40}$/.test(e[0]) && (e[1] === 'subj' || e[1] === 'acad') &&
        str(e[2]) && cut(e[2], 40) && str(e[3]) && str(e[4]) && Array.isArray(e[5])) {
        pk = { id: e[0], kind: e[1], name: cut(e[2], 40), icon: e[3].slice(0, 8), pic: e[4].slice(0, 20), items: words(e[5]) };
      }
      if (!pk || findPack(packs, pk.id)) return null;
      packs.push(pk);
    }

    var week = {}, d;
    for (d = 1; d <= 5; d++) {
      var row = o.w[d - 1];
      if (!Array.isArray(row) || row.length !== o.c) return null;
      var p = [];
      for (i = 0; i < row.length; i++) {
        if (!isInt(row[i], 0, packs.length)) return null;
        p.push(row[i] ? packs[row[i] - 1].id : null);
      }
      week[d] = { p: p, after: [] };
    }
    for (i = 0; i < o.a.length; i++) {
      var x = o.a[i];
      if (!Array.isArray(x) || x.length !== 4 || !isInt(x[0], 1, 5) || !isInt(x[1], 1, packs.length) || !str(x[2]) || !str(x[3])) return null;
      if (x[2] && !/^\d{2}:\d{2}$/.test(x[2])) return null;
      // 같은 링크를 또 열어도 방과후 id 가 그대로라 이날만 바꾼 것이 이어진다
      week[x[0]].after.push({ id: 'f' + x[0] + '-' + week[x[0]].after.length, packId: packs[x[1] - 1].id, time: x[2], who: cut(x[3], 12) });
    }

    var notes = [];
    for (i = 0; i < o.o.length; i++) {
      var n = o.o[i];
      if (!Array.isArray(n) || n.length !== 5 || !str(n[0]) || !validKey(n[0]) || !str(n[1]) || !Array.isArray(n[2]) || !str(n[3]) || !str(n[4])) return null;
      var its = words(n[2]);
      if (its.length) notes.push({ date: n[0], title: cut(n[1], 40), items: its, memo: cut(n[3], 100), from: cut(n[4], 20) });
    }
    return { name: name, grade: o.g, periods: o.c, week: week, packs: packs, notes: notes,
      guardians: o.u.filter(str).map(function (x) { return cut(x, 12); }).filter(Boolean).slice(0, 8) };
  }
  // 받는 쪽: 그 아이 것만 넣고 다른 아이·기록은 건드리지 않는다. 같은 이름의 아이가 있으면 시간표만 바꾸고 달력 기록은 둔다.
  // 이 폰에서 고친 꾸러미는 덮어쓰지 않고 따로 더한다(다른 아이 가방이 바뀌지 않게). 같은 링크를 또 열어도 늘어나지 않는다.
  function mergeFamily(state, f, newId) {
    var target = f.packs.map(function (p) {
      var cur = findPack(state.packs, p.id);
      if (cur && samePack(cur, p)) return p.id;
      var twin = cur ? state.packs.filter(function (x) { return samePack(x, p); })[0] : null;
      if (twin) return twin.id;
      var id = cur ? newId('p') : p.id;
      state.packs.push({ id: id, kind: p.kind, name: p.name, icon: p.icon, pic: p.pic, items: p.items.slice() });
      return id;
    });
    function mapped(id) {
      for (var i = 0; i < f.packs.length; i++) if (f.packs[i].id === id) return target[i];
      return null;
    }
    var week = {};
    for (var d = 1; d <= 5; d++) {
      week[d] = {
        p: f.week[d].p.map(function (id) { return id ? mapped(id) : null; }),
        after: f.week[d].after.map(function (a) { return { id: a.id, packId: mapped(a.packId), time: a.time, who: a.who }; })
      };
    }
    var kid = state.kids.filter(function (x) { return !x.sample && x.name === f.name; })[0] || null;
    var isNew = !kid;
    if (isNew) {
      kid = { id: newId('k'), name: f.name, grade: f.grade, periods: f.periods, week: week };
      state.kids.push(kid);
    } else {
      kid.grade = f.grade;
      kid.periods = f.periods;
      kid.week = week;
    }
    // 시간표에 적힌 사람도 고를 수 있게 함께 더한다
    var gs = state.settings.guardians;
    var people = f.guardians.slice();
    for (d = 1; d <= 5; d++) week[d].after.forEach(function (a) { if (a.who) people.push(a.who); });
    people.forEach(function (g) { if (gs.indexOf(g) < 0 && gs.length < 8) gs.push(g); });
    // 알림장: 같은 날·같은 이유면 한 장에 이어 붙인다
    f.notes.forEach(function (n) {
      var cur = state.notes.filter(function (x) { return x.kid === kid.id && x.date === n.date && (x.title || '') === n.title; })[0];
      if (cur) {
        cur.items = cur.items.concat(n.items.filter(function (x) { return cur.items.indexOf(x) < 0; })).slice(0, 30);
        if (n.memo) cur.memo = n.memo;
        return;
      }
      var note = { id: newId('n'), kid: kid.id, date: n.date, title: n.title, items: n.items.slice(0, 30) };
      if (n.memo) note.memo = n.memo;
      if (n.from) note.from = n.from;
      state.notes.push(note);
    });
    return { kid: kid, isNew: isNew };
  }

  // ---- 밤 알림: 다음 날 학교 가는 밤(일~목)마다 울리는 달력 파일 글 (서버 없음, 아이 이름은 넣지 않는다) ----
  // 시작은 todayKey 부터 처음 오는 일~목. UID 를 고정해 시각을 바꿔 다시 넣으면 그 일정을 고치게 한다
  function remindIcs(time, todayKey) {
    var k = todayKey;
    while (dow(k) === 5 || dow(k) === 6) k = addDays(k, 1);
    var stamp = new Date().toISOString().replace(/[-:]|\.\d{3}/g, '');
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//내일 가방//밤 알림//KO',
      'BEGIN:VEVENT',
      'UID:night-reminder@tomorrow-bag',
      'DTSTAMP:' + stamp,
      'DTSTART:' + k.replace(/-/g, '') + 'T' + time.replace(':', '') + '00',
      'DURATION:PT10M',
      'RRULE:FREQ=WEEKLY;BYDAY=SU,MO,TU,WE,TH',
      'SUMMARY:내일 가방 챙기기',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:내일 가방을 챙길 시간이에요',
      'TRIGGER:PT0S',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n') + '\r\n';
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
    eq('진행 고리', progress(st, kid, bag).pct, 29); // 2/7 = 28.6% → 29
    eq('물병 그림', bottle ? bottle.pic : '', 'bottle');
    // 4-2) '내일은 빼기': 그날 가방에서만 뺀다 → 6개, 다른 날은 그대로
    st.skips = { 'k|2026-10-26': ['필통'] };
    eq('내일은 빼기 뒤 물건 수', buildBag(st, kid, '2026-10-26').items.length, 6);
    delete st.skips;
    // 4-2b) 늘 학교에 두는 물건: 수업 물건은 모든 날에 빠지고(6개 → 5개), 같은 이름이 알림장에 있으면 남는다
    var ys = { packs: st.packs, daily: st.daily, rules: st.rules, notes: [], checks: {}, settings: st.settings, stay: [' 국어  교과서 '] };
    eq('학교에 두는 물건 비교', isStay(ys, '국어 교과서'), true);
    eq('학교에 두는 물건 뺀 수', buildBag(ys, kid, '2026-10-26').items.length, 5);
    ys.notes = [{ kid: 'k', date: '2026-10-26', items: ['국어 교과서'] }];
    var ybag = buildBag(ys, kid, '2026-10-26');
    eq('알림장에 있으면 남음', ybag.items.length + '|' + ybag.items[0].name + '|' + ybag.items[0].group, '6|국어 교과서|note');
    // 4-2c) 사람이 넣은 목요일 규칙: 그 주 목요일(10/29) 가방에만 들어가고 수요일(10/28)에는 없다
    var rs = { packs: [], daily: [], rules: [{ id: 'r1', dow: 4, item: '영어 단어장', on: true }], notes: [], checks: {}, settings: { holidays: [] } };
    var rhas = function (k) { return buildBag(rs, kid, k).items.some(function (i) { return i.name === '영어 단어장' && i.group === 'rule'; }); };
    eq('목요일 규칙 목요일에 들어감', rhas('2026-10-29'), true);
    eq('목요일 규칙 수요일엔 없음', rhas('2026-10-28'), false);
    // 4-3) 어제와 달라진 것: 월 체육(체육복·물병·Pen) → 화 국어(국어 교과서·' pen '). 매일 필통과 대소문자만 다른 pen 은 빠진다
    var ds = { packs: [{ id: 'A', name: '체육', items: ['체육복', '물병', 'Pen'] }, { id: 'B', name: '국어', items: ['국어 교과서', ' pen '] }],
      daily: ['필통'], rules: [], notes: [], checks: {}, settings: { holidays: [] } };
    var dd = bagDiff(ds, { id: 'k', week: { 1: { p: ['A'], after: [] }, 2: { p: ['B'], after: [] } } }, '2026-10-27');
    eq('어제와 달라진 것', dd.add.join(',') + '|' + dd.out.join(','), '국어 교과서|체육복,물병');
    // 4-4) 어제 넣은 것 그대로: 월요일에 Pen·필통·물병·체육복을 챙겼고 화요일 가방은 국어 교과서·pen·필통·물병.
    //      대소문자만 다른 pen 과 필통은 이어받고, 체육복은 오늘 가방에 없어 빠지고, 물병은 아침 물건이라 빠진다
    var cs = { packs: ds.packs, daily: ['필통', '물병'], rules: [], notes: [], settings: { holidays: [] },
      checks: { 'k|2026-10-26': ['Pen', '필통', '물병', '체육복'] } };
    var ck = { id: 'k', week: { 1: { p: ['A'], after: [] }, 2: { p: ['B'], after: [] } } };
    eq('어제 넣은 것 그대로 수', carryOver(cs, ck, '2026-10-27').length, 3);
    cs.morning = [' 물병 '];
    eq('어제 넣은 것 (아침 물건 뺌)', carryOver(cs, ck, '2026-10-27').join(','), 'pen,필통');
    eq('어제 챙긴 것 없으면 0개', carryOver({ packs: ds.packs, daily: ['필통'], rules: [], notes: [], checks: {}, settings: { holidays: [] } }, ck, '2026-10-27').length, 0);
    // 5) 가방 달력: 10/21 다 챙김, 10/22 덜 챙김, 10/23 다 챙김, 11/2 다 챙김 → 10월 스티커 2장
    var hs = [
      { kid: 'k', date: '2026-10-21', total: 10, done: 10, missed: [] },
      { kid: 'k', date: '2026-10-22', total: 10, done: 8, missed: ['리코더', '물병'] },
      { kid: 'k', date: '2026-10-23', total: 5, done: 5, missed: [] },
      { kid: 'k', date: '2026-11-02', total: 5, done: 5, missed: [] }
    ];
    eq('10월 칭찬 스티커', monthStickers(hs, 'k', '2026-10'), 2);
    eq('스티커는 12가지 안', stickerFor('2026-11-02') >= 0 && stickerFor('2026-11-02') < 12, true);
    // 5-0) 스티커 모음판: 다 챙긴 3일(10/21 5번·10/23 3번·11/2 1번)만, 다른 아이·같은 날 두 줄은 빼고 → 칸 12개 합 3
    var sb0 = stickerBook(hs.concat([{ kid: 'x', date: '2026-10-24', total: 3, done: 3 }, { kid: 'k', date: '2026-10-21', total: 2, done: 2 }]), 'k');
    eq('스티커 모음판', sb0.length + '|' + sb0.reduce(function (a, b) { return a + b; }, 0) + '|' + sb0[5] + sb0[3] + sb0[1], '12|3|111');
    // 5-1) 물건 그림 찾기: 이름에 든 말로, 한 글자 말은 낱말일 때만, 없으면 가방
    eq('그림 찾기 가위', iconFor('가위').id, 'scissors');
    eq('그림 찾기 실내화 주머니', iconFor('실내화 주머니').id, 'indoor');
    eq('그림 찾기 30cm 자', iconFor('30cm 자').id, 'ruler');
    eq('그림 찾기 연필 두 자루', iconFor('연필 두 자루').id, 'pencil');
    eq('그림 찾기 없는 물건', iconFor('우주선 모형').id, 'bag');
    // 5-1b) 과목·학원 꾸러미 30개의 pic 은 모두 있는 선 그림 id
    var picIds = {};
    DATA.ICONS.forEach(function (ic) { picIds[ic.id] = true; });
    eq('꾸러미 그림 모두 있음', DATA.SUBJECTS.concat(DATA.ACADEMIES).filter(function (p) { return !picIds[p.pic]; }).length, 0);
    // 5-1b2) 과목 15개는 모두 시간표 칸 색(c, :root 색 변수 이름)이 있고, 5가지 이상 쓴다
    var subjC = {};
    DATA.SUBJECTS.forEach(function (p) { if (/^--[a-z-]+$/.test(p.c || '')) subjC[p.c] = true; });
    eq('과목 칸 색 모두 있음', DATA.SUBJECTS.filter(function (p) { return !/^--[a-z-]+$/.test(p.c || ''); }).length, 0);
    eq('과목 칸 색 5가지 이상', Object.keys(subjC).length >= 5, true);
    // 5-1c) 행사 12개의 pic 은 모두 있는 선 그림 id, 스티커 12개는 모두 직접 그린 그림(d)이 있다
    eq('행사 그림 모두 있음', DATA.EVENTS.filter(function (e) { return !picIds[e.pic]; }).length, 0);
    eq('스티커 그림 모두 있음', DATA.STICKERS.filter(function (s) { return !s.d; }).length, 0);
    // 5-2) 자주 덜 챙긴 것: 30일 앞(9/25)·다른 아이·그날(10/26) 기록은 빼고, ' 리코더'·'리코더' 는 같은 것 → 리코더 2, 물병 1
    var mc = missCounts([
      { kid: 'k', date: '2026-09-20', missed: ['리코더'] },
      { kid: 'k', date: '2026-10-20', missed: ['리코더', '물병'] },
      { kid: 'k', date: '2026-10-22', missed: [' 리코더 '] },
      { kid: 'x', date: '2026-10-23', missed: ['리코더'] },
      { kid: 'k', date: '2026-10-26', missed: ['물병'] }
    ], 'k', addDays('2026-10-26', -30), '2026-10-26');
    eq('맨 앞에 놓을 물건 횟수', (mc['리코더'] || 0) + '|' + (mc['물병'] || 0), '2|1');
    // 5-3) 준비물 찾기: '풀' → 풀·딱풀, 자주 쓰는 순이면 많이 넣은 딱풀이 먼저
    eq('준비물 찾기 풀', findSupplies('풀', 'all', 'base').join(','), '풀,딱풀');
    eq('준비물 자주 쓰는 순', findSupplies('풀', 'all', 'often', { '딱풀': 3 })[0], '딱풀');
    // 5-4) 알림장 글 뽑기: 날짜 'n월 n일', 긴 말 먼저(딱풀 안의 풀은 안 잡음), '준비물:' 뒤 쉼표·'/'·줄바꿈 말, 중복 없음
    var pn = parseNoteText('[알림장] 11월 3일 준비물: 색종이, 딱풀 / 휴지 심 2개\n체육복', '2026-11-01');
    eq('알림장 글 날짜', pn.date, '2026-11-03');
    eq('알림장 글 준비물', pn.items.join(','), '휴지 심,색종이,체육복,딱풀,휴지 심 2개');
    eq('알림장 글 모레 (해 넘김)', parseNoteText('모레 현장체험 있어요', '2026-12-31').date, '2027-01-02');
    eq('알림장 글 n/n (다음 해)', parseNoteText('1/5 개학', '2026-12-28').date, '2027-01-05');
    eq('알림장 글 날짜 없음', parseNoteText('준비물 - 모자', '2026-11-01').date, null);
    eq('알림장 글 한 글자 말', parseNoteText('모자, 자세히 보기', '2026-11-01').items.join(','), '모자');
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
    eq('살 것 글', buyText(['휴지 심 2개', ' 돗자리 ', '휴지  심 2개', '']), '사 둘 것: 휴지 심 2개, 돗자리');
    eq('살 것 없으면 빈 글', buyText([]), '');
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
    // 9-2) 가족에게 보낼 글: 하나라도 남으면 다 챙김 글은 '', 다 챙기면 '하윤이 10월 26일(월) 가방 다 챙겼어요 🎒'
    var dk = { id: 'k', name: '하윤', week: pk.week };
    var dbag = buildBag(ps, dk, '2026-10-26');
    ps.checks[checkKey('k', '2026-10-26')] = ['풀'];
    eq('다 챙김 글 (남은 것 있음)', doneText(ps, dk, dbag), '');
    ps.checks[checkKey('k', '2026-10-26')] = dbag.items.map(function (it) { return it.name; });
    eq('다 챙김 글', doneText(ps, dk, dbag), '하윤이 10월 26일(월) 가방 다 챙겼어요 🎒');
    // 9-3) 데리러 갈 사람 줄: '14:30 태권도 → 아빠' 한 줄만 더한다
    var sb = { date: '2026-11-02', items: [], pickups: [{ time: '14:30', name: '태권도', who: '아빠' }, { time: '16:00', name: '수영', who: '' }] };
    eq('가족 글 둘째 줄', shareText({ checks: {} }, { id: 'k', name: '서아' }, sb), '서아 11월 2일(월) 가방을 챙기고 있어요 🎒\n14:30 태권도 → 아빠');
    // 9-3a) 이날만 바꾸기: 월요일 1교시 체육→국어, 3교시 체육→빈 칸, 수영 → 할머니, 저녁 체육 쉼. 다음 월요일은 그대로
    var es = { packs: st.packs, daily: [], rules: [], notes: [], checks: {}, settings: { holidays: [] },
      dayEdits: { 'k|2026-10-26': { p: { 1: 'B', 3: null }, after: { a1: { who: '할머니', off: false }, a2: { who: '엄마', off: true } } } } };
    var ek = { id: 'k', name: '서아', week: { 1: { p: ['A', 'B', 'A'], after: [{ id: 'a1', packId: 'C', time: '15:00', who: '아빠' }, { id: 'a2', packId: 'A', time: '17:00', who: '엄마' }] } } };
    var eb = buildBag(es, ek, '2026-10-26');
    eq('이날만 수업', eb.periods.join(',') + '|' + eb.changedP.join(','), '국어,국어,|0,2');
    eq('이날만 물건 (국어 교과서·수영복·물병)', eb.items.length, 3);
    eq('이날만 데리러 갈 사람', eb.pickups[0].who + '|' + !!eb.pickups[0].changed, '할머니|true');
    eq('이날만 쉬는 방과후', !!eb.pickups[1].off + '|' + !!eb.pickups[1].changed, 'true|true');
    eq('이날만 가족 글', shareText(es, ek, eb), '서아 10월 26일(월) 가방을 챙기고 있어요 🎒\n15:00 수영 → 할머니');
    var eb2 = buildBag(es, ek, '2026-11-02');
    eq('다른 날은 그대로', eb2.periods.join(',') + '|' + eb2.pickups[0].who + '|' + !!eb2.pickups[0].changed, '체육,국어,체육|아빠|false');
    // 9-3b) 아침에 넣을 물건: 4번 가방(7개)에서 물병을 아침에 넣으면, 밤에 나머지 6개만 챙겨도 다 챙김. 기록은 6개 가운데 6개
    var ms = { packs: st.packs, daily: st.daily, rules: st.rules, notes: st.notes, settings: st.settings, morning: [' 물병 '],
      checks: { 'k|2026-10-26': ['색종이', '필통', '실내화 주머니', '체육복', '국어 교과서'] } };
    var mbag = buildBag(ms, kid, '2026-10-26');
    eq('밤 물건 하나 남음', nightDone(ms, kid, mbag), false);
    ms.checks['k|2026-10-26'].push('수영복');
    eq('밤 물건 다 챙김 (물병은 아침에)', nightDone(ms, kid, mbag), true);
    var msn = snapshot(ms, kid, '2026-10-26');
    eq('아침 물건 뺀 기록', msn.done + '/' + msn.total, '6/6');
    eq('아침 물건 없으면 다 챙겨야', nightDone(st, kid, bag), false);
    // 9-4) 학년 기본 시간표: 4학년은 3~4학년 묶음, 4교시로 자르고 지운 꾸러미 칸은 비운다
    var gt = [{ grades: [3, 4], week: { 1: ['a', 'b', 'x', 'a', 'b', 'a'], 2: ['b'], 3: [], 4: [], 5: [] } }];
    var gw = gradeWeek(gt, [{ id: 'a' }, { id: 'b' }], 4, 4);
    eq('학년 기본 시간표 (4교시)', gw[1].join(',') + '|' + gw[2].length, 'a,b,,a|4');
    eq('학년 기본 시간표 (없는 학년)', gradeWeek(gt, [], 1, 6), null);
    // 실제 기본 시간표: 1학년 5교시(수요일 4교시), 3학년 수요일 6교시는 빈 칸
    var full = function (w) { return [1, 2, 3, 4, 5].map(function (d) { return w[d].filter(function (x) { return x; }).length; }).join(','); };
    eq('1학년 기본 시간표 (5교시, 수 4교시)', full(gradeWeek(DATA.TIMETABLES, DATA.SUBJECTS, 1, 5)), '5,5,4,5,5');
    eq('3학년 기본 시간표 (수 6교시 비움)', full(gradeWeek(DATA.TIMETABLES, DATA.SUBJECTS, 3, 6)), '6,6,5,6,6');
    // 9-5) 교시 시간: 기본값과 검사
    var dt = defaultTimes();
    eq('기본 1교시 시간', dt[0].join('~'), '09:00~09:40');
    eq('기본 5교시 시간 (점심 50분 뒤)', dt[4].join('~'), '13:00~13:40');
    eq('기본 7교시 시간', dt[6].join('~'), '14:40~15:20');
    eq('점심 자리', lunchAfter(dt, 6), 3);
    var bt = dt.map(function (x) { return x.slice(); });
    bt[2][0] = '10:20';
    eq('겹친 교시 시간', (checkTimes(bt) || {}).i, 2);
    // 9-6) 가족 링크: 쓰는 꾸러미(없어진 칸·안 쓰는 꾸러미 빼고), 방과후 시각·사람, 오늘부터의 그 아이 알림장만 담는다
    var fas = { packs: [
        { id: 's-kor', kind: 'subj', name: '국어', icon: '📖', pic: 'kor', items: ['국어 교과서', '국어 활동 책', '받아쓰기 공책'] },
        { id: 'pX', kind: 'acad', name: '수영 🏊', icon: '🏊', pic: '', items: ['수영복'] },
        { id: 'pU', kind: 'subj', name: '안 쓰는 과목', icon: '', pic: '', items: ['책'] }
      ],
      notes: [
        { id: 'n4', kid: 'k', date: '2026-11-07', title: '오늘', items: ['풀'] },
        { id: 'n1', kid: 'k', date: '2026-11-08', title: '체험', items: ['돗자리'] },
        { id: 'n2', kid: 'k', date: '2026-11-01', title: '지난', items: ['가위'] },
        { id: 'n3', kid: 'x', date: '2026-11-09', title: '다른 아이', items: ['자'] }
      ],
      settings: { guardians: ['엄마', '아빠'] } };
    var fak = { id: 'k', name: '서아', grade: 2, periods: 4, week: {} };
    for (var fad = 1; fad <= 5; fad++) fak.week[fad] = { p: [null, null, null, null], after: [] };
    fak.week[1].p = ['s-kor', null, 's-kor', 'gone'];
    fak.week[2].after = [{ id: 'a1', packId: 'pX', time: '15:00', who: '아빠' }];
    var fp2 = familyUnpack(familyPack(fas, fak, '2026-11-07'));
    eq('가족 링크 아이', fp2.name + '|' + fp2.grade + '|' + fp2.periods, '서아|2|4');
    eq('가족 링크 시간표', fp2.week[1].p.join(','), 's-kor,,s-kor,');
    eq('가족 링크 방과후', fp2.week[2].after[0].packId + '|' + fp2.week[2].after[0].time + '|' + fp2.week[2].after[0].who, 'pX|15:00|아빠');
    eq('가족 링크 쓰는 꾸러미만', fp2.packs.map(function (p) { return p.id; }).join(','), 's-kor,pX');
    eq('가족 링크 기본 꾸러미 되읽기', fp2.packs[0].items.join(','), '국어 교과서,국어 활동 책,받아쓰기 공책');
    eq('가족 링크 이모지 되읽기', fp2.packs.length > 1 ? fp2.packs[1].name : '', '수영 🏊');
    eq('가족 링크 오늘부터 알림장', fp2.notes.map(function (n) { return n.date; }).join(','), '2026-11-07,2026-11-08');
    eq('가족 링크 데리러 갈 사람', fp2.guardians.join(','), '엄마,아빠');
    eq('망가진 가족 링크', familyUnpack('@@'), null);
    eq('선생님 링크는 가족 링크가 아님', familyUnpack(teacherPack({ c: '2반', d: '2026-11-07', i: ['풀'], m: '' })), null);
    // 9-7) 가족 링크 받기: 같은 이름 아이는 시간표만 바꾸고, 이 폰에서 고친 꾸러미는 그대로 둔 채 따로 더하고, 또 열어도 늘어나지 않는다
    var far = { kids: [{ id: 'z', name: '서아', grade: 1, periods: 6, week: {} }],
      packs: [{ id: 's-kor', kind: 'subj', name: '국어', icon: '📖', pic: 'kor', items: ['내가 고친 책'] }],
      notes: [{ id: 'o1', kid: 'z', date: '2026-11-08', title: '체험', items: ['모자'] }],
      settings: { guardians: ['할머니'] } };
    var fac = 0;
    function faId(p) { fac++; return p + fac; }
    var fam = mergeFamily(far, fp2, faId);
    eq('가족 링크 받기 같은 아이', far.kids.length + '|' + fam.kid.id + '|' + fam.kid.periods + '|' + fam.isNew, '1|z|4|false');
    eq('가족 링크 받기 꾸러미', findPack(far.packs, 's-kor').items[0] + '|' + fam.kid.week[1].p[0] + '|' + far.packs.length, '내가 고친 책|p1|3');
    eq('가족 링크 받기 알림장', far.notes[0].items.join(',') + '|' + far.notes.length, '모자,돗자리|2');
    eq('가족 링크 받기 사람', far.settings.guardians.join(','), '할머니,엄마,아빠');
    mergeFamily(far, fp2, faId);
    eq('같은 가족 링크 또 열기', far.packs.length + '|' + far.notes.length + '|' + far.notes[0].items.length, '3|2|2');
    // 9-8) 밤 알림 달력 파일: 2026-11-08 은 일요일이라 그날부터, 금요일(11/13)이면 일요일(11/15)부터, 줄바꿈은 모두 CRLF
    var ri = remindIcs('21:00', '2026-11-08');
    eq('밤 알림 시작 (일요일은 그날)', ri.indexOf('DTSTART:20261108T210000') >= 0, true);
    eq('밤 알림 요일', ri.indexOf('BYDAY=SU,MO,TU,WE,TH') >= 0, true);
    eq('밤 알림 시작 (금요일은 일요일로)', remindIcs('20:30', '2026-11-13').indexOf('DTSTART:20261115T203000') >= 0, true);
    eq('밤 알림 줄바꿈', ri.replace(/\r\n/g, '').indexOf('\n'), -1);
    // 9-9) 연속으로 다 챙긴 날: 2026-11-06(금)·11-09(월)·11-10(화)는 주말을 넘어 이어지고, 11-05(목)은 덜 챙겨 끊긴다
    var skh = [
      { kid: 'k', date: '2026-11-05', total: 5, done: 4 },
      { kid: 'k', date: '2026-11-06', total: 5, done: 5 },
      { kid: 'k', date: '2026-11-09', total: 4, done: 4 },
      { kid: 'k', date: '2026-11-10', total: 6, done: 6 },
      { kid: 'x', date: '2026-11-04', total: 3, done: 3 }
    ];
    eq('연속 다 챙김 (주말 넘어 이어짐)', streak(skh, 'k', '2026-11-10', []), 3);
    eq('연속 다 챙김 (오늘 아직이면 앞 학교 날부터)', streak(skh, 'k', '2026-11-11', []), 3);
    eq('연속 다 챙김 (쉬는 날 건너뜀)', streak(skh.concat([{ kid: 'k', date: '2026-11-12', total: 2, done: 2 }]), 'k', '2026-11-12', ['2026-11-11']), 4);
    eq('연속 다 챙김 (덜 챙긴 날에서 끊김)', streak(skh, 'k', '2026-11-06', []), 1);
    // 9-10) 이번 주 데리러 가기: 일요일(11/08)이면 월~금(11/09~13). 화요일은 이날만 엄마로 바꿈, 목요일은 사람 없음, 금요일은 쉼
    //        둘째 아이(하윤)는 월·수 아빠
    var pws = { kids: [{ id: 'k', name: '서아', week: {} }, { id: 'h', name: '하윤', week: {} }],
      packs: [{ id: 'pX', kind: 'acad', name: '수영', icon: '🏊', items: ['수경'] }, { id: 'pT', kind: 'acad', name: '태권도', icon: '🥋', items: ['도복'] }],
      settings: { holidays: [] }, dayEdits: { 'k|2026-11-10': { after: { a1: { who: '엄마' } } }, 'k|2026-11-13': { after: { a3: { off: true } } } } };
    for (var pwd = 1; pwd <= 5; pwd++) { pws.kids[0].week[pwd] = { p: [], after: [] }; pws.kids[1].week[pwd] = { p: [], after: [] }; }
    pws.kids[0].week[2].after = [{ id: 'a1', packId: 'pX', time: '15:00', who: '아빠' }];
    pws.kids[0].week[4].after = [{ id: 'a2', packId: 'pX', time: '16:00', who: '' }];
    pws.kids[0].week[5].after = [{ id: 'a3', packId: 'pX', time: '14:00', who: '아빠' }];
    pws.kids[1].week[1].after = [{ id: 'b1', packId: 'pT', time: '14:30', who: '아빠' }];
    pws.kids[1].week[3].after = [{ id: 'b2', packId: 'pT', time: '14:30', who: '아빠' }];
    var pw = pickupWeek(pws, '2026-11-08');
    eq('이번 주 데리러 가기 사람', Object.keys(pw).sort().join(','), '아빠,엄마,정하지 않음');
    eq('이번 주 데리러 가기 사람별 수', pw['아빠'].length + '|' + pw['엄마'].length + '|' + pw['정하지 않음'].length, '2|1|1');
    eq('이번 주 데리러 가기 바꾼 사람', pw['엄마'][0].date + '|' + pw['엄마'][0].time + '|' + pw['엄마'][0].kid + '|' + pw['엄마'][0].name, '2026-11-10|15:00|서아|수영');
    eq('이번 주 데리러 가기 아빠 날짜순', pw['아빠'].map(function (p) { return p.date; }).join(','), '2026-11-09,2026-11-11');
    eq('이번 주 데리러 가기 글', pickupWeekText('아빠', pw['아빠']), '아빠 이번 주 데리러 갈 날: 11/9(월) 14:30 하윤 태권도, 11/11(수) 14:30 하윤 태권도');
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
    label: label, shortLabel: shortLabel, relLabel: relLabel, dayLabel: dayLabel, shortDay: shortDay, nameI: nameI,
    buildBag: buildBag, pickupWeek: pickupWeek, pickupLine: pickupLine, pickupWeekText: pickupWeekText, NO_WHO: NO_WHO, bagDiff: bagDiff, carryOver: carryOver, progress: progress, isMorning: isMorning, isStay: isStay, nightDone: nightDone, snapshot: snapshot, closePast: closePast, checkKey: checkKey,
    iconFor: iconFor, stickerFor: stickerFor, monthStickers: monthStickers, stickerBook: stickerBook, streak: streak, findSupplies: findSupplies, supplyUsage: supplyUsage, parseNoteText: parseNoteText,
    missCounts: missCounts, upcoming: upcoming, buyText: buyText,setupSteps: setupSteps, gradeWeek: gradeWeek, defaultTimes: defaultTimes, periodTimes: periodTimes, checkTimes: checkTimes, lunchAfter: lunchAfter, MAX_P: MAX_P, shareText: shareText, doneText: doneText, teacherPack: teacherPack, teacherUnpack: teacherUnpack, mergeTeacher: mergeTeacher, familyPack: familyPack, familyUnpack: familyUnpack, mergeFamily: mergeFamily, remindIcs: remindIcs, selfTest: selfTest, findPack: findPack, norm: norm,
    GROUPS: GROUPS, GROUP_NAME: GROUP_NAME
  };
})();
