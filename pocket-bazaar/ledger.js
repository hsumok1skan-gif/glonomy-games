// Pocket Bazaar — 장부 (판 안 장날마다의 기록과 판을 넘는 갈래·손님·큰 장사 기록)
// 규칙(Game)의 사건만 듣고 적는다. 값·동전·판 흐름은 바꾸지 않는다.
var Ledger = (function () {
  var TOP_MAX = 5;        // 큰 장사 기록 수
  var SALES_MAX = 16;     // 장날 하나에 적어 두는 판 물건 수

  // ---------- 판을 넘는 장부 (Store.meta.ledger) ----------
  function book() {
    var m = Store.meta;
    var l = m.ledger;
    if (!l || typeof l !== 'object') l = m.ledger = {};
    if (!l.cats || typeof l.cats !== 'object') l.cats = {};
    DATA.CAT_KEYS.forEach(function (k) {
      var c = l.cats[k];
      if (!c || typeof c.n !== 'number' || typeof c.coins !== 'number') l.cats[k] = { n: 0, coins: 0 };
    });
    if (!l.cust || typeof l.cust !== 'object') l.cust = {};
    if (!Array.isArray(l.top)) l.top = [];
    if (typeof l.runs !== 'number') l.runs = 0;
    if (l.last === undefined) l.last = null;
    return l;
  }

  // ---------- 이번 판 장부 (run.ledger — 판 저장에 함께 들어가 이어하기도 이어진다) ----------
  function runBook(r) {
    if (!r.ledger || !Array.isArray(r.ledger.days)) r.ledger = { days: [] };
    return r.ledger;
  }
  function newDay(r) {
    return {
      day: r.day, event: r.event, rent: r.rent, sold: 0, earned: 0, skipped: 0, spoiled: 0,
      bought: 0, spent: 0, charm: null, sales: [], paid: null, end: null, closed: false
    };
  }
  // 이어하기는 장날 시작 때 저장한 판을 다시 열므로, 그 장날 줄이 없으면 여기서 새로 만든다
  function dayEntry(r) {
    var b = runBook(r);
    var e = b.days[b.days.length - 1];
    if (!e || e.day !== r.day) { e = newDay(r); b.days.push(e); }
    return e;
  }

  // 장날 하나를 닫을 때만 판을 넘는 장부에 더한다 (이어하기로 같은 장날을 다시 해도 두 번 세지 않는다)
  function closeDay(r, e) {
    if (e.closed) return;
    e.closed = true;
    var l = book();
    e.sales.forEach(function (s) {
      var g = Game.goods(s.id);
      if (!g) return;
      var c = l.cats[g.cat];
      c.n++;
      c.coins += s.price;
      l.cust[s.cust] = (l.cust[s.cust] || 0) + 1;
      addTop(l, { id: s.id, price: s.price, cust: s.cust, day: e.day });
    });
  }
  function addTop(l, rec) {
    if (l.top.length >= TOP_MAX && rec.price <= l.top[l.top.length - 1].price) return;
    l.top.push(rec);
    l.top.sort(function (a, b) { return b.price - a.price; });
    if (l.top.length > TOP_MAX) l.top.length = TOP_MAX;
  }

  function finishRun(r) {
    var l = book();
    var reached = r.won ? r.day : r.day - 1;
    l.runs++;
    l.last = {
      stall: r.stall, won: !!r.won, score: r.score, reached: reached, reason: r.reason,
      daily: !!r.daily, date: r.dailyDate || '', earned: r.earned,
      days: runBook(r).days.map(function (e) {
        return { day: e.day, event: e.event, rent: e.rent, sold: e.sold, earned: e.earned, skipped: e.skipped,
          spoiled: e.spoiled, bought: e.bought, spent: e.spent, charm: e.charm, paid: e.paid, end: e.end,
          best: bestOf(e.sales) };
      })
    };
  }
  function bestOf(sales) {
    var b = null;
    sales.forEach(function (s) { if (!b || s.price > b.price) b = s; });
    return b ? { id: b.id, price: b.price } : null;
  }

  // ---------- 규칙 사건 듣기 ----------
  function onEvent(type, d) {
    var r = Game.run;
    if (!r || r.test) return;
    var e;
    switch (type) {
      case 'day':
      case 'resume':
        dayEntry(r);
        break;
      case 'sell':
        e = dayEntry(r);
        e.sold++;
        e.earned += d.price;
        if (e.sales.length < SALES_MAX) e.sales.push({ id: d.id, price: d.price, cust: d.cust });
        break;
      case 'leave':
        dayEntry(r).skipped++;
        break;
      case 'spoil':
        dayEntry(r).spoiled += d.list.length;
        break;
      case 'settle':
        e = dayEntry(r);
        e.paid = true;
        e.end = r.coins;
        closeDay(r, e);
        Store.save();
        break;
      case 'charm':
        dayEntry(r).charm = d.id;
        break;
      case 'buy':
        e = dayEntry(r);
        e.bought++;
        e.spent += d.cost;
        break;
      case 'over':
        e = dayEntry(r);
        // 자릿세를 셈한 장날이면 그 결과를, 장을 일찍 접었으면 비워 둔다
        if (r.summary && r.summary.day === r.day) { e.paid = !!r.summary.paid; e.end = r.coins; }
        closeDay(r, e);
        finishRun(r);
        Store.save();
        break;
    }
  }
  Game.on(onEvent);

  // ---------- 기록 화면 '장부' 탭 ----------
  function pct(v, max) { return max > 0 ? Math.max(2, Math.round(v / max * 100)) : 0; }
  function bar(cls, v, max) { return '<div class="ldg-bar ' + cls + '" style="width:' + pct(v, max) + '%"></div>'; }
  function row(name, bars, note, cls) {
    return '<div class="ldg-row' + (cls ? ' ' + cls : '') + '"><span class="ldg-name">' + name + '</span>' +
      '<div class="ldg-bars">' + bars + '<span class="ldg-note">' + note + '</span></div></div>';
  }
  function block(title, body) { return '<div class="ldg-block"><h4>' + title + '</h4>' + body + '</div>'; }

  function lastRunHtml(esc, last) {
    if (!last || !last.days || !last.days.length) {
      return block('지난 판', '<p class="ldg-note">아직 끝낸 판이 없다. 한 판을 끝내면 장날마다 번 동전과 자릿세가 여기 적힌다.</p>');
    }
    var st = Game.stall(last.stall);
    var head = '<p class="ldg-note">' + (last.daily ? '오늘의 도전 ' + esc(last.date) + ' · ' : '') + st.icon + ' ' + esc(st.name) +
      ' · ' + (last.won ? '열 장날을 버텼다' : last.reached + '장날 버팀') + ' · 점수 ' + last.score + ' · ' + esc(last.reason || '') + '</p>';
    var max = 1;
    last.days.forEach(function (e) { max = Math.max(max, e.earned, e.rent); });
    var rows = last.days.map(function (e) {
      var ev = Game.event(e.event);
      var name = e.day + '장날 ' + (ev ? ev.icon : '');
      var parts = ['판 ' + e.sold, '+' + e.earned, '자릿세 ' + e.rent];
      if (e.skipped) parts.push('그냥 간 ' + e.skipped);
      if (e.spoiled) parts.push('상함 ' + e.spoiled);
      if (e.bought) parts.push('산 물건 ' + e.bought + '(-' + e.spent + ')');
      if (e.best) { var g = Game.goods(e.best.id); if (g) parts.push('최고 ' + g.icon + e.best.price); }
      if (e.charm) { var c = Game.charm(e.charm); if (c) parts.push(c.icon + ' ' + esc(c.name)); }
      parts.push(e.paid === false ? '자릿세 못 냄' : e.paid ? '남은 동전 ' + e.end : '장 접음');
      return row(name, bar('earn', e.earned, max) + bar('rent', e.rent, max), parts.join(' · '), e.paid === false ? 'fail' : '');
    }).join('');
    return block('지난 판 — 장날마다 번 동전(금색)과 자릿세(빨강)', head + rows + flowHtml(last));
  }

  // 지난 판 흐름 요약: 평균, 가장 남은 날, 가장 빠듯한 날
  function flowHtml(last) {
    var days = last.days.filter(function (e) { return e.paid !== null; });
    if (!days.length) return '';
    var sum = 0, best = null, worst = null;
    days.forEach(function (e) {
      var gap = e.earned - e.rent;
      sum += e.earned;
      if (!best || gap > best.gap) best = { day: e.day, gap: gap };
      if (!worst || gap < worst.gap) worst = { day: e.day, gap: gap };
    });
    var sign = function (n) { return (n >= 0 ? '+' : '') + n; };
    return '<p class="ldg-note">장날 평균 번 동전 ' + Math.round(sum / days.length) +
      ' · 가장 남은 날 ' + best.day + '장날(' + sign(best.gap) + ') · 가장 빠듯한 날 ' + worst.day + '장날(' + sign(worst.gap) + ')</p>';
  }

  function catsHtml(l) {
    var max = 1, total = 0;
    DATA.CAT_KEYS.forEach(function (k) { max = Math.max(max, l.cats[k].coins); total += l.cats[k].n; });
    if (!total) return block('갈래별로 판 것 (모든 판)', '<p class="ldg-note">아직 판 물건이 없다.</p>');
    var rows = DATA.CAT_KEYS.map(function (k) {
      var c = DATA.CATS[k], v = l.cats[k];
      var share = Math.round(v.n / total * 100);
      return '<div class="ldg-row cat-' + k + '"><span class="ldg-name">' + c.mark + ' ' + c.name + '</span>' +
        '<div class="ldg-bars">' + bar('cat', v.coins, max) + '<span class="ldg-note">' + v.n + '개 (' + share + '%) · 동전 ' + v.coins +
        (v.n ? ' · 하나에 ' + (v.coins / v.n).toFixed(1) : '') + '</span></div></div>';
    }).join('');
    return block('갈래별로 판 것 (모든 판)', rows);
  }

  function custHtml(esc, l) {
    var ids = Object.keys(l.cust).filter(function (id) { return Game.cust(id); });
    if (!ids.length) return block('자주 산 손님', '<p class="ldg-note">아직 산 손님이 없다.</p>');
    ids.sort(function (a, b) { return l.cust[b] - l.cust[a]; });
    var max = l.cust[ids[0]];
    var rows = ids.slice(0, 5).map(function (id) {
      var c = Game.cust(id);
      return row(c.icon + ' ' + esc(c.name), bar('cust', l.cust[id], max), l.cust[id] + '번 샀다');
    }).join('');
    return block('자주 산 손님', rows);
  }

  function topHtml(esc, l) {
    var list = l.top.filter(function (t) { return Game.goods(t.id); });
    if (!list.length) return block('큰 장사', '<p class="ldg-note">아직 판 물건이 없다.</p>');
    var rows = list.map(function (t, i) {
      var g = Game.goods(t.id), c = Game.cust(t.cust);
      return row((i + 1) + '. ' + g.icon + ' ' + esc(g.name), bar('earn', t.price, list[0].price),
        '동전 ' + t.price + ' · ' + t.day + '장날' + (c ? ' · ' + c.icon + ' ' + esc(c.name) : ''));
    }).join('');
    return block('큰 장사 (모든 판)', rows);
  }

  function html(esc) {
    var l = book();
    return lastRunHtml(esc, l.last) + catsHtml(l) + custHtml(esc, l) + topHtml(esc, l) +
      '<div class="ldg-block"><p class="ldg-note">장부에 적은 판 ' + l.runs + '판</p></div>';
  }

  return { html: html, book: book };
})();
