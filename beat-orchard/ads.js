/* Beat Orchard — 광고 창구 (무료 모바일 게임, 기획서 `## 전제`·`## 광고 원칙`)
   모든 광고는 Ads.rewarded / Ads.interstitial 하나로만 띄운다. 종류는 보상형·전면 둘뿐이고 배너는 없다.
   광고가 뜰 수 있는 자리는 아래 SLOTS 표의 다섯 곳뿐이다(H-26). 표에 없는 자리·종류가 다른 자리·횟수를 다 쓴 자리는 거절한다.
   이 코드에는 광고 SDK·외부 요청이 없다. 앱으로 포장(웹뷰)할 때 바깥 쪽이 window.AdBridge 를 붙이면 그것을 쓰고,
   없으면(브라우저·시험) 화면 안의 대신 광고 창(#ov-ad)을 몇 초 보여 준다.
   AdBridge 형식: { rewarded(placement, done(ok)), interstitial(placement, done()) } — placement 는 SLOTS 의 자리 이름 */
(function () {
  'use strict';

  var KINDS = {
    rewarded: { sec: 5, title: '보상형 광고', note: '끝까지 보면 보상을 받아요', doneText: '보상 받기' },
    interstitial: { sec: 3, title: '광고', note: '잠시 후 닫을 수 있어요', doneText: '닫기' }
  };
  // 광고 자리 표 (H-26). kind 종류 / per 횟수를 세는 단위('run' 한 판, 'day' 하루) / limit 그 단위 안 최대 횟수(0 = 세지 않음)
  // where 버튼·창이 붙을 화면 / reward 보상(보상형) / label 버튼 글 / noDaily 오늘의 도전 판에서는 안 냄 / noTutorial 튜토리얼 판에서는 안 냄
  // 버튼과 보상을 실제로 붙이는 일은 H-29(보상형)·H-31·H-32(전면) 몫이다. 앱 포장 때 사람이 이 다섯 이름으로 광고 단위를 붙인다
  var SLOTS = {
    revive: { kind: 'rewarded', per: 'run', limit: 1, where: 'ov-revive', reward: { fence: 0.5 },
      label: '광고 보고 이어하기', desc: '울타리 50%로 이번 웨이브를 이어서 해요', noDaily: true, noTutorial: false },
    double: { kind: 'rewarded', per: 'run', limit: 1, where: 'scr-result', reward: { silverMul: 2 },
      label: '광고 보고 은열매 2배', desc: '이번 판 은열매를 한 번 더 받아요', noDaily: false, noTutorial: false },
    refill: { kind: 'rewarded', per: 'run', limit: 2, where: 'ov-pick', reward: { pouch: 3 },
      label: '광고 보고 열매 +3', desc: '가진 열매에 3개를 더해요', noDaily: false, noTutorial: false },
    silver: { kind: 'rewarded', per: 'day', limit: 3, where: 'scr-shop', reward: { silver: 30 },
      label: '광고 보고 은열매 +30', desc: '하루 3번까지 은열매를 받아요', noDaily: false, noTutorial: false },
    // 전면은 판이 끝나 결과 화면으로 넘어갈 때만. every 판에 한 번 (H-32, 아래 '전면 빈도')
    result: { kind: 'interstitial', per: 'run', limit: 1, where: 'scr-result', every: 3, reward: null,
      label: '', desc: '판이 끝나고 결과 화면으로 넘어갈 때', noDaily: false, noTutorial: true }
  };
  var busy = false;
  var tick = 0;
  // 전면 광고가 다음 화면을 막지 않게 (H-30): 앱 쪽 광고가 done() 을 부르지 않아도 이 시간이 지나면 다음으로 넘어간다
  var BRIDGE_MAX_MS = 60000;
  var watchdog = 0;
  // 보상형은 사람이 직접 눌렀을 때만 (H-27·H-28). 마지막 누름·키 입력 시각을 기억해, 그 직후가 아니면 거절한다
  var GESTURE_MS = 1500;
  var lastGesture = -1e9;
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function markGesture(ev) { if (!ev || ev.isTrusted !== false) lastGesture = now(); }
  ['pointerdown', 'click', 'keydown'].forEach(function (t) {
    try { document.addEventListener(t, markGesture, true); } catch (e) { /* 이벤트 없음 */ }
  });
  function byPerson() { return now() - lastGesture <= GESTURE_MS; }
  // 보상형은 그 자리의 광고 버튼(.ad-btn)을 사람이 직접 눌렀을 때만 (H-28). 버튼 click 이 armed 에 자리 이름을 두고,
  // show 가 같은 자리일 때만 받고 바로 비운다. 다른 버튼을 누른 직후 코드가 Ads.rewarded 를 불러도 뜨지 않는다
  var armed = '';
  var shown = { rewarded: 0, interstitial: 0 };
  var runUsed = {};             // 이번 판에 자리마다 본 횟수 (newRun 이 비운다)
  var runRewarded = false;      // 이번 판에 보상형을 끝까지 봤나 — 봤으면 그 판에는 전면을 띄우지 않는다 (H-28 보상형이 먼저)
  var runInfo = { daily: false, tutorial: false };

  function $(id) { return document.getElementById(id); }
  function T(s, v) { return window.I18N ? window.I18N.T(s, v) : s; }
  function gameState() {
    try { return (window.Game && window.Game.state) ? String(window.Game.state()) : ''; } catch (e) { return ''; }
  }
  // 플레이 도중에는 광고를 띄우지 않는다 (판이 돌고 있으면 거절)
  function playing() { return gameState() === 'running'; }
  // 전면은 플레이 도중에 절대 넣지 않는다 (H-33). 판이 도는 중·일시정지·웨이브 사이 고르기·무너져 이어하기를 고르는 중은
  // 모두 판이 아직 끝나지 않은 플레이 도중이다. 전면은 판이 끝났거나(ended) 판 밖(idle)일 때만 낸다
  var MID_PLAY = { running: 1, paused: 1, picking: 1, down: 1 };
  function midPlay() { return MID_PLAY[gameState()] === 1; }
  function today() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  // 하루 횟수는 Store.meta.adDay 에 남는다. 날짜가 바뀌었으면 모두 0 으로
  function dayBook() {
    var m = window.Store && window.Store.meta;
    if (!m) return null;
    if (!m.adDay || typeof m.adDay !== 'object') m.adDay = { date: '' };
    if (m.adDay.date !== today()) {
      m.adDay.date = today();
      for (var k in SLOTS) if (Object.prototype.hasOwnProperty.call(SLOTS, k)) m.adDay[k] = 0;
    }
    return m.adDay;
  }
  function slotOf(id) { return Object.prototype.hasOwnProperty.call(SLOTS, id) ? SLOTS[id] : null; }
  // ---------- 전면 빈도 (H-32) ----------
  // 매판 띄우면 이탈하므로 every(3)판에 한 번만. 끝난 판 수는 Store.meta.adRunCount(모두)·adSinceAd(마지막 전면 뒤)에 남아
  // 페이지를 다시 열어도 이어서 센다. 튜토리얼 판(noTutorial)은 세지 않는다. 처음 every 판은 띄우지 않고,
  // 그 뒤로는 마지막 전면에서 every 판이 지난 판에만 띄운다(4·7·10…번째 판). 보상형을 본 판이라 건너뛰면 수를 그대로 두어 다음 판에 띄운다
  var memo = { adRunCount: 0, adSinceAd: 0 }; // 저장소가 없을 때
  function runBook() {
    var m = window.Store && window.Store.meta;
    if (!m) return memo;
    if (typeof m.adRunCount !== 'number') m.adRunCount = 0;
    if (typeof m.adSinceAd !== 'number') m.adSinceAd = 0;
    return m;
  }
  function saveBook() { try { if (window.Store) window.Store.save(); } catch (e) { /* 저장소 없음 */ } }
  // 판이 끝날 때 한 번 (Ads.interstitial 이 띄우기 전에 부른다)
  function noteRunEnd(id) {
    var s = slotOf(id);
    if (!s || !s.every || (s.noTutorial && runInfo.tutorial)) return;
    var b = runBook();
    b.adRunCount += 1;
    b.adSinceAd += 1;
    saveBook();
  }
  function everyDue(id) {
    var s = slotOf(id);
    if (!s || !s.every) return true;
    var b = runBook();
    return b.adRunCount > s.every && b.adSinceAd >= s.every;
  }
  function noteShown(id) {
    var s = slotOf(id);
    if (!s || !s.every) return;
    runBook().adSinceAd = 0;
    saveBook();
  }
  function used(id) {
    var s = SLOTS[id];
    if (s.per === 'day') { var b = dayBook(); return b ? (b[id] | 0) : 0; }
    return runUsed[id] | 0;
  }
  function count(id) {
    var s = SLOTS[id];
    if (s.per === 'day') {
      var b = dayBook();
      if (b) { b[id] = (b[id] | 0) + 1; try { window.Store.save(); } catch (e) { /* 저장소 없음 */ } }
    } else {
      runUsed[id] = (runUsed[id] | 0) + 1;
    }
  }
  // 이 자리에 남은 횟수 (세지 않는 자리는 -1)
  function left(id) {
    var s = slotOf(id);
    if (!s) return 0;
    if (!s.limit) return -1;
    return Math.max(0, s.limit - used(id));
  }
  // 그 자리가 지금 광고를 낼 수 있나 (표에 있고, 종류가 맞고, 판 종류가 맞고, 횟수가 남았나)
  function slotOpen(kind, id) {
    var s = slotOf(id);
    if (!s || (kind && s.kind !== kind)) return false;
    if (s.noDaily && runInfo.daily) return false;
    if (s.noTutorial && runInfo.tutorial) return false;
    // 사람이 고른 보상형 광고를 본 판에는 전면을 덧붙이지 않는다 (H-28: 거부감이 적은 보상형이 먼저)
    if (s.kind === 'interstitial' && runRewarded) return false;
    // 전면은 every 판에 한 번 (H-32)
    if (s.every && !everyDue(id)) return false;
    return left(id) !== 0;
  }
  // 배너 광고는 없다 (H-34). 앱 쪽 AdBridge 에 배너 함수가 있어도 KINDS(보상형·전면) 밖의 종류는 부르지 않는다
  function bridgeFor(kind) {
    if (!Object.prototype.hasOwnProperty.call(KINDS, kind)) return null;
    var b = window.AdBridge;
    return b && typeof b[kind] === 'function' ? b : null;
  }
  // 대신 광고 창도 다른 겹침 화면과 같은 전환 함수(ui.js view)를 거친다 (G-51): 0.2초 흐려지기·0.24초 커지기,
  // 그동안 두 번 누르기 막기, 움직임 줄이기면 바로 바뀜. ui.js 가 없을 때만 직접 숨기기·보이기
  function viewAd(on) {
    if (window.UI && typeof window.UI.view === 'function') { window.UI.view('ov-ad', on); return; }
    var ov = $('ov-ad');
    if (ov) ov.classList.toggle('hidden', !on);
  }
  function closeStandIn() {
    clearInterval(tick);
    tick = 0;
    standKind = '';
    if ($('ov-ad')) viewAd(false);
  }
  // 대신 광고 창의 키 (H-30): 뒤 화면 키는 ui.js 가 막으므로 여기서 먼저 받는다.
  // 세기가 끝난 뒤 Enter·스페이스·Esc 로 닫는다(전면). 보상형은 Esc 가 그만 보기, Enter·스페이스는 포커스된 버튼
  var standKind = '';
  function onStandKey(e) {
    if (!standKind) return;
    var k = e.key;
    if (k !== 'Enter' && k !== ' ' && k !== 'Spacebar' && k !== 'Escape') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.repeat) return;
    var done = $('btn-ad-done');
    var skip = $('btn-ad-skip');
    if (standKind === 'rewarded') {
      if (k === 'Escape' || document.activeElement === skip) { if (skip && skip.onclick) skip.onclick(); return; }
    }
    if (done && !done.disabled && done.onclick) done.onclick();
  }
  try { document.addEventListener('keydown', onStandKey, true); } catch (e) { /* 이벤트 없음 */ }
  // 브리지가 없을 때: 화면 안 대신 광고 창. 보상형은 다 보면 ok=true, 중간에 그만두면 ok=false
  function standIn(kind, id, finish) {
    var cfg = KINDS[kind];
    var ov = $('ov-ad');
    if (!ov) { finish(kind === 'interstitial'); return; }
    var secs = cfg.sec;
    var counter = $('ad-count');
    var done = $('btn-ad-done');
    var skip = $('btn-ad-skip');
    var s = slotOf(id);
    // 글은 한국어 원문을 지금 언어로 (H-24, i18n.js)
    $('ad-title').textContent = T(cfg.title);
    // 보상형은 무엇을 받는지와 그만 봐도 잃는 것이 없다는 것을 보인다 (H-28)
    var reward = kind === 'rewarded' && s && s.desc;
    $('ad-note').textContent = reward ? T('끝까지 보면 받아요: {r}', { r: T(s.desc) }) : T(cfg.note);
    var safe = $('ad-safe');
    if (safe) {
      safe.textContent = T('그만 봐도 잃는 것은 없어요');
      safe.classList.toggle('hidden', kind !== 'rewarded');
    }
    done.textContent = T(cfg.doneText);
    done.disabled = true;
    skip.classList.toggle('hidden', kind !== 'rewarded');
    // 전면은 화면 전체를 덮는다 (H-31, style.css #ov-ad.ad-full). 보상형은 지금처럼 가운데 창
    ov.classList.toggle('ad-full', kind === 'interstitial');
    counter.textContent = secs;
    done.onclick = function () { closeStandIn(); finish(true); };
    skip.onclick = function () { closeStandIn(); finish(false); };
    viewAd(true);
    standKind = kind;
    // 뒤 화면 버튼에 남은 포커스를 거둔다 (광고 창 밖 버튼이 Enter 로 눌리지 않게)
    try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) { /* 없음 */ }
    clearInterval(tick);
    tick = setInterval(function () {
      secs -= 1;
      counter.textContent = Math.max(0, secs);
      if (secs <= 0) {
        clearInterval(tick); tick = 0; done.disabled = false;
        try { done.focus(); } catch (e) { /* 없음 */ }
      }
    }, 1000);
  }
  function show(kind, placement, cb) {
    var callback = typeof cb === 'function' ? cb : function () {};
    var id = String(placement || '');
    // 보상형을 저절로 띄우지 않는다: 그 자리 버튼을 사람이 막 누른 뒤가 아니면 거절 (H-27·H-28)
    var pressed = armed === id;
    armed = '';
    if (!KINDS[kind] || busy || playing() || !slotOpen(kind, id)) { callback(false); return false; }
    if (kind === 'interstitial' && midPlay()) { callback(false); return false; }
    if (kind === 'rewarded' && (!pressed || !byPerson())) { callback(false); return false; }
    busy = true;
    var ended = false;
    function finish(ok) {
      if (ended) return;
      ended = true;
      busy = false;
      clearTimeout(watchdog);
      watchdog = 0;
      // 전면은 닫히기만 해도 한 번 본 것, 보상형은 끝까지 봤을 때만 센다
      var seen = kind === 'interstitial' || !!ok;
      if (seen) { shown[kind] += 1; count(id); if (kind === 'interstitial') noteShown(id); }
      if (kind === 'rewarded' && ok) runRewarded = true;
      callback(!!ok);
    }
    var b = bridgeFor(kind);
    if (b) {
      // 전면은 앱 쪽이 닫힘을 알리지 않아도 BRIDGE_MAX_MS 뒤에는 다음 화면으로 (H-30). 보상형은 끝까지 본 것으로 치지 않으므로 걸지 않는다
      if (kind === 'interstitial') watchdog = setTimeout(function () { finish(false); }, BRIDGE_MAX_MS);
      try { b[kind](id, finish); return true; } catch (e) { clearTimeout(watchdog); watchdog = 0; /* 브리지가 실패하면 대신 광고로 */ }
    }
    standIn(kind, id, finish);
    return true;
  }

  // ---------- 보상형 광고 버튼 (H-27) ----------
  // 모든 보상형 자리가 같은 모양의 버튼 하나를 쓴다: `▶ AD` 표시 + 보상 글 + 남은 횟수 (.ad-btn, 44px 하한).
  // 누르면 그때만 Ads.rewarded 를 부르고, 끝까지 보면 onReward(자리의 reward) 를 부른다. 그만 보면 아무것도 바뀌지 않는다
  var buttons = [];
  function leftText(id) {
    var s = slotOf(id);
    var n = left(id);
    if (n < 0) return '';
    if (n === 0) return T('다 썼어요');
    return s.per === 'day' ? T('오늘 {n}번 남음', { n: n }) : T('{n}번 남음', { n: n });
  }
  function paint(btn) {
    var id = btn.getAttribute('data-ad-slot');
    var s = slotOf(id);
    var open = !!s && slotOpen('rewarded', id);
    var label = s && s.label ? T(s.label) : '';
    btn.querySelector('.ad-label').textContent = label;
    var lt = btn.querySelector('.ad-left');
    lt.textContent = s ? leftText(id) : '';
    lt.classList.toggle('hidden', !lt.textContent);
    btn.disabled = !open || busy;
    btn.setAttribute('aria-label', T('광고') + ' · ' + label + (lt.textContent ? ' · ' + lt.textContent : ''));
    btn.title = s ? T(s.desc) : '';
  }
  function refreshButtons() {
    // 화면에 붙었다가 빠진 버튼만 목록에서 지운다 (만들고 아직 붙이기 전인 버튼은 남김)
    buttons = buttons.filter(function (b) {
      var inDoc = !!(document.body && document.body.contains(b));
      if (inDoc) b._adPlaced = true;
      return inDoc || !b._adPlaced;
    });
    buttons.forEach(paint);
  }
  // id: SLOTS 의 보상형 자리 이름, onReward(reward, id): 끝까지 봤을 때만, onDone(ok): 광고가 닫힌 뒤 늘(선택)
  function makeButton(id, onReward, onDone) {
    var s = slotOf(id);
    if (!s || s.kind !== 'rewarded') return null;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ad-btn';
    btn.setAttribute('data-ad-slot', id);
    btn.innerHTML = '<span class="ad-tag" aria-hidden="true">▶ AD</span><span class="ad-label"></span><span class="ad-left"></span>';
    btn.addEventListener('click', function (ev) {
      if (btn.disabled) return;
      // 사람의 누름만 (코드가 만든 click 은 isTrusted 가 거짓) — 이 버튼의 자리만 열어 둔다 (H-28)
      if (!ev || ev.isTrusted === false) return;
      armed = id;
      btn.disabled = true;
      var started = show('rewarded', id, function (ok) {
        if (ok && typeof onReward === 'function') {
          try { onReward(s.reward, id); } catch (e) { /* 보상 처리 실패는 화면을 멈추지 않는다 */ }
        }
        refreshButtons();
        if (typeof onDone === 'function') onDone(!!ok);
      });
      // 광고가 떠 있는 동안 다른 광고 버튼도 꺼 두고, 거절됐으면 원래대로
      refreshButtons();
      if (!started) paint(btn);
    });
    buttons.push(btn);
    paint(btn);
    return btn;
  }

  window.Ads = {
    free: true,            // 무료 게임: 결제 없음, 광고로 수익
    kinds: ['rewarded', 'interstitial'], // 배너 없음
    hasBanner: false,
    // 배너 광고는 없다 (H-34): 어느 화면에도 고정 광고 띠를 두지 않는다. 불러도 늘 거절하고 cb(false)
    banner: function (placement, cb) {
      if (typeof cb === 'function') { try { cb(false); } catch (e) { /* 부르는 쪽 실패는 무관 */ } }
      return false;
    },
    SLOTS: SLOTS,
    slots: function () { return Object.keys(SLOTS); },
    slot: function (id) { return slotOf(id); },
    // 버튼에 보일 글 (지금 언어)
    label: function (id) { var s = slotOf(id); return s && s.label ? T(s.label) : ''; },
    left: function (id) { return left(id); },
    // 지금 이 자리에 광고 버튼을 보여도 되나 (판이 도는 동안·다른 광고 중이면 거짓)
    // 전면은 일시정지·고르기·이어하기를 고르는 중에도 거짓 (H-33)
    can: function (id) {
      var s = slotOf(id);
      return !!s && !busy && !playing() && !(s.kind === 'interstitial' && midPlay()) && slotOpen(s.kind, id);
    },
    // 지금 플레이 도중인가 (판이 돌거나·멈췄거나·고르거나·무너져 이어하기를 고르는 중) — 이때 전면은 늘 거절된다 (H-33)
    midPlay: function () { return midPlay(); },
    // 새 판이 시작될 때 game.js Game.begin 이 부른다: 한 판 횟수를 비우고 판 종류(오늘의 도전·튜토리얼)를 기억
    newRun: function (info) {
      runUsed = {};
      runRewarded = false;
      runInfo = { daily: !!(info && info.daily), tutorial: !!(info && info.tutorial) };
      refreshButtons();
    },
    // 보상형: 사람이 그 자리의 Ads.button 을 눌러 볼 때만 뜬다(H-28). 코드에서 바로 부르면 늘 거절되고 cb(false)
    rewarded: function (placement, cb) { return show('rewarded', placement, cb); },
    // 이번 판에 보상형을 끝까지 봤나 (봤으면 그 판에는 전면을 띄우지 않는다)
    rewardedThisRun: function () { return runRewarded; },
    // 보상형 자리의 버튼을 만든다 (H-27). 넣을 자리는 H-29 가 정한다
    button: function (id, onReward, onDone) { return makeButton(id, onReward, onDone); },
    // 언어가 바뀌거나 횟수가 바뀐 뒤 화면에 있는 광고 버튼 글·남은 횟수·켜짐을 다시 맞춘다
    refresh: function () { refreshButtons(); },
    // 전면 (H-30): 판이 끝나고 화면이 바뀔 때만. cb(shown) 은 늘 꼭 한 번 불린다 — 띄웠으면 닫힌 뒤 true,
    // 거절(자리·횟수·플레이 도중 = running·paused·picking·down H-33·다른 광고 중)이면 바로 false, 앱 쪽 광고가 닫힘을 알리지 않아도 BRIDGE_MAX_MS 뒤에는 불린다.
    // 그래서 부르는 쪽은 다음 화면을 늘 cb 안에서 열면 된다. 대신 광고 창은 3초 뒤 닫기·Enter·Esc 로 닫힌다
    interstitial: function (placement, cb) {
      var called = false;
      function next(shown) {
        if (called) return;
        called = true;
        if (typeof cb === 'function') { try { cb(!!shown); } catch (e) { /* 다음 화면 실패는 광고와 무관 */ } }
      }
      // 플레이 도중에 불리면 판이 끝난 것이 아니므로 세지도 띄우지도 않는다 (H-33)
      if (midPlay()) { next(false); return false; }
      // 끝난 판을 먼저 센다 (H-32). 이 수로 이번 판에 띄울 차례인지 정한다
      noteRunEnd(String(placement || ''));
      // show 는 거절할 때도 콜백을 부르므로(바로, false) 띄웠는지는 돌려준 값으로 가린다
      var fired = false;
      var started = show('interstitial', placement, function () { fired = true; if (started) next(true); });
      if (!started) next(false);
      else if (fired) next(true);   // 창이 없어 그 자리에서 끝난 경우
      return started;
    },
    // 전면이 뜨기까지 남은 끝난 판 수 (0 이면 다음에 끝나는 판에 뜰 차례, H-32)
    runsUntil: function (id) {
      var s = slotOf(id);
      if (!s || !s.every) return 0;
      var b = runBook();
      // 앞으로 k 번째로 끝나는 판에 뜬다: 모두 > every, 마지막 전면 뒤 >= every 가 되는 가장 작은 k
      var k = Math.max(1, s.every + 1 - b.adRunCount, s.every - b.adSinceAd);
      return k - 1;
    },
    busy: function () { return busy; },
    shownCount: function (kind) { return shown[kind] | 0; },
    native: function () { return !!window.AdBridge; }
  };
})();
