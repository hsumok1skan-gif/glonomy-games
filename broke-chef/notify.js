// 한끼 계산기 — 알림 (안드로이드 앱에서만. 웹·홈 화면 앱에서는 아무것도 하지 않는다)
// · 유통기한: 하루 전과 당일 아침 9시에 한 번씩 (그날 걸리는 음식을 한 알림에 묶는다)
// · 식비: 챌린지 중에 그날 식비를 하나도 안 넣었으면 밤 9시
// 기록이 바뀔 때마다(save) 앞으로 30일 치를 다시 잡는다. 알림을 누르면 그 화면으로 간다.
var Notify = (function () {
  'use strict';
  var EXP_HOUR = 9, SPEND_HOUR = 21, EXP_DAYS = 30, SPEND_DAYS = 14;
  var EXP_BASE = 1000, SPEND_BASE = 2000;   // 알림 번호: 유통기한 1000~, 식비 2000~
  var ln = null, timer = 0, onTap = null;

  function native() {
    try { return !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()); } catch (e) { return false; }
  }
  function plugin() {
    if (!ln && native() && Capacitor.registerPlugin) ln = Capacitor.registerPlugin('LocalNotifications');
    return ln;
  }
  function available() { return native(); }

  function at(day, hour) {
    var p = day.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2], hour, 0, 0, 0);
  }
  function names(list) {
    var n = list.map(function (x) { return x.name; });
    return n.length > 3 ? n.slice(0, 3).join(', ') + ' 외 ' + (n.length - 3) + '개' : n.join(', ');
  }

  // 앞으로 보낼 알림 목록 (화면과 상관없는 계산 — 점검에서 그대로 부른다)
  function plan(state, now) {
    now = now || new Date();
    var today = Calc.today(now), out = [];
    var items = (state.fridge && state.fridge.items) || [];
    for (var i = 0; i < EXP_DAYS; i++) {
      var d = Calc.addDays(today, i), next = Calc.addDays(d, 1);
      var due = items.filter(function (x) { return x.exp === d; });
      var tmr = items.filter(function (x) { return x.exp === next; });
      if (!due.length && !tmr.length) continue;
      var when = at(d, EXP_HOUR);
      if (when <= now) continue;
      var body = [];
      if (due.length) body.push('오늘까지: ' + names(due));
      if (tmr.length) body.push('내일까지: ' + names(tmr));
      out.push({ id: EXP_BASE + i, title: '⏰ 유통기한 임박', body: body.join(' · '), at: when, extra: { go: 'exp' } });
    }
    var ch = null, cs = state.challenges || [];
    for (var c = cs.length - 1; c >= 0; c--) if (cs[c].status === 'active') { ch = cs[c]; break; }
    if (ch) {
      var spentDays = {};
      (state.spends || []).forEach(function (x) { spentDays[x.date] = true; });
      for (var j = 0; j < SPEND_DAYS; j++) {
        var sd = Calc.addDays(today, j);
        if (sd < ch.start || sd > ch.end || spentDays[sd]) continue;
        var sw = at(sd, SPEND_HOUR);
        if (sw <= now) continue;
        out.push({ id: SPEND_BASE + j, title: '🧾 오늘 식비', body: '오늘 쓴 식비를 아직 안 넣었어요', at: sw, extra: { go: 'spend' } });
      }
    }
    return out;
  }

  function ours(id) { return id >= EXP_BASE && id < SPEND_BASE + 100; }

  // 잡아 둔 알림을 모두 지우고 다시 잡는다. 꺼져 있거나 권한이 없으면 지우기만 한다
  function syncNow(state) {
    var p = plugin();
    if (!p) return Promise.resolve(false);
    return p.getPending().then(function (r) {
      var old = ((r && r.notifications) || []).filter(function (n) { return ours(+n.id); }).map(function (n) { return { id: +n.id }; });
      return old.length ? p.cancel({ notifications: old }) : null;
    }).then(function () {
      if (!state.settings || state.settings.notify === false) return false;
      return p.checkPermissions().then(function (perm) {
        if (!perm || perm.display !== 'granted') return false;
        var list = plan(state);
        if (!list.length) return true;
        return p.schedule({ notifications: list.map(function (n) {
          return { id: n.id, title: n.title, body: n.body, extra: n.extra, schedule: { at: n.at, allowWhileIdle: true } };
        }) }).then(function () { return true; });
      });
    }).catch(function () { return false; });
  }
  function sync(state) {
    if (!available()) return;
    clearTimeout(timer);
    timer = setTimeout(function () { syncNow(state); }, 800);
  }
  // 권한 묻기: 처음이면 안드로이드 허용 창을 띄운다. 돌려주는 값: 'granted' | 'denied' | 'none'(웹)
  function ensurePermission() {
    var p = plugin();
    if (!p) return Promise.resolve('none');
    return p.checkPermissions().then(function (perm) {
      if (perm && perm.display === 'granted') return 'granted';
      if (perm && perm.display === 'denied') return 'denied';
      return p.requestPermissions().then(function (r) { return r && r.display === 'granted' ? 'granted' : 'denied'; });
    }).catch(function () { return 'denied'; });
  }
  // 알림을 눌렀을 때 (extra.go: 'exp' | 'spend')
  function onAction(fn) {
    onTap = fn;
    var p = plugin();
    if (!p || !p.addListener) return;
    p.addListener('localNotificationActionPerformed', function (e) {
      var go = e && e.notification && e.notification.extra && e.notification.extra.go;
      if (onTap && go) onTap(go);
    });
  }

  // 점검 예시 (오늘 2026-11-10 08:00 기준)
  function selfTest() {
    var now = new Date(2026, 10, 10, 8, 0, 0);
    var st = { settings: { notify: true },
      fridge: { items: [{ name: '우유', exp: '2026-11-10' }, { name: '두부', exp: '2026-11-11' }, { name: '햄', exp: '2026-11-12' }, { name: '김치', exp: '' }] },
      challenges: [{ status: 'active', start: '2026-11-01', end: '2026-11-11' }],
      spends: [{ date: '2026-11-10', amount: 3000 }] };
    var p = plan(st, now);
    var first = p[0] || {};
    var spend = p.filter(function (n) { return n.extra.go === 'spend'; });
    return [
      { name: '오늘 9시: 오늘까지 우유 · 내일까지 두부', ok: first.body === '오늘까지: 우유 · 내일까지: 두부' && first.at.getHours() === 9 },
      { name: '내일 9시: 오늘까지 두부 · 내일까지 햄', ok: !!p[1] && p[1].body === '오늘까지: 두부 · 내일까지: 햄' },
      { name: '식비: 오늘은 이미 넣어 빼고, 챌린지 마지막 날(11일)까지만', ok: spend.length === 1 && Calc.today(spend[0].at) === '2026-11-11' && spend[0].at.getHours() === 21 },
      { name: '날짜 없는 음식은 알림 없음', ok: p.every(function (n) { return n.body.indexOf('김치') < 0; }) }
    ];
  }

  return { available: available, plan: plan, sync: sync, syncNow: syncNow, ensurePermission: ensurePermission, onAction: onAction, selfTest: selfTest };
})();
