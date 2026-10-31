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

    // 가방 시트에서 '내일은 빼기' 한 물건은 그날 가방에서만 뺀다
    var skip = (state.skips && kid && state.skips[checkKey(kid.id, k)]) || [];
    if (skip.length) order = order.filter(function (it) { return skip.indexOf(it.name) < 0; });
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
    var full = pr.total > 0 && pr.done === pr.total;
    var first = nameI(kid.name) + ' ' + dayLabel(bag.date) + (full ? ' 가방 다 챙겼어요 🎒' : ' 가방을 챙기고 있어요 🎒');
    var who = bag.pickups.filter(function (p) { return p.who; }).map(function (p) {
      return (p.time ? p.time + ' ' : '') + p.name + ' → ' + p.who;
    });
    return who.length ? first + '\n' + who.join(' · ') : first;
  }

  // 다 챙겼을 때 가족·선생님께 보낼 글 (shareText 와 같다). 다 챙기지 않았으면 ''
  function doneText(state, kid, bag) {
    if (!kid || !bag.items.length) return '';
    var done = state.checks[checkKey(kid.id, bag.date)] || [];
    if (!bag.items.every(function (it) { return done.indexOf(it.name) >= 0; })) return '';
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
    // 5) 가방 달력: 10/21 다 챙김, 10/22 덜 챙김, 10/23 다 챙김, 11/2 다 챙김 → 10월 스티커 2장
    var hs = [
      { kid: 'k', date: '2026-10-21', total: 10, done: 10, missed: [] },
      { kid: 'k', date: '2026-10-22', total: 10, done: 8, missed: ['리코더', '물병'] },
      { kid: 'k', date: '2026-10-23', total: 5, done: 5, missed: [] },
      { kid: 'k', date: '2026-11-02', total: 5, done: 5, missed: [] }
    ];
    eq('10월 칭찬 스티커', monthStickers(hs, 'k', '2026-10'), 2);
    eq('스티커는 12가지 안', stickerFor('2026-11-02') >= 0 && stickerFor('2026-11-02') < 12, true);
    // 5-1) 물건 그림 찾기: 이름에 든 말로, 한 글자 말은 낱말일 때만, 없으면 가방
    eq('그림 찾기 가위', iconFor('가위').id, 'scissors');
    eq('그림 찾기 실내화 주머니', iconFor('실내화 주머니').id, 'indoor');
    eq('그림 찾기 30cm 자', iconFor('30cm 자').id, 'ruler');
    eq('그림 찾기 연필 두 자루', iconFor('연필 두 자루').id, 'pencil');
    eq('그림 찾기 없는 물건', iconFor('우주선 모형').id, 'bag');
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
    // 9-4) 학년 기본 시간표: 4학년은 3~4학년 묶음, 4교시로 자르고 지운 꾸러미 칸은 비운다
    var gt = [{ grades: [3, 4], week: { 1: ['a', 'b', 'x', 'a', 'b', 'a'], 2: ['b'], 3: [], 4: [], 5: [] } }];
    var gw = gradeWeek(gt, [{ id: 'a' }, { id: 'b' }], 4, 4);
    eq('학년 기본 시간표 (4교시)', gw[1].join(',') + '|' + gw[2].length, 'a,b,,a|4');
    eq('학년 기본 시간표 (없는 학년)', gradeWeek(gt, [], 1, 6), null);
    // 9-5) 교시 시간: 기본값과 검사
    var dt = defaultTimes();
    eq('기본 1교시 시간', dt[0].join('~'), '09:00~09:40');
    eq('기본 5교시 시간 (점심 50분 뒤)', dt[4].join('~'), '13:00~13:40');
    eq('기본 7교시 시간', dt[6].join('~'), '14:40~15:20');
    eq('점심 자리', lunchAfter(dt, 6), 3);
    var bt = dt.map(function (x) { return x.slice(); });
    bt[2][0] = '10:20';
    eq('겹친 교시 시간', (checkTimes(bt) || {}).i, 2);
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
    buildBag: buildBag, progress: progress, snapshot: snapshot, closePast: closePast, checkKey: checkKey,
    iconFor: iconFor, stickerFor: stickerFor, monthStickers: monthStickers, findSupplies: findSupplies, supplyUsage: supplyUsage,
    missCounts: missCounts, upcoming: upcoming, setupSteps: setupSteps, gradeWeek: gradeWeek, defaultTimes: defaultTimes, periodTimes: periodTimes, checkTimes: checkTimes, lunchAfter: lunchAfter, MAX_P: MAX_P, shareText: shareText, doneText: doneText, teacherPack: teacherPack, teacherUnpack: teacherUnpack, mergeTeacher: mergeTeacher, selfTest: selfTest, findPack: findPack, norm: norm,
    GROUPS: GROUPS, GROUP_NAME: GROUP_NAME
  };
})();
