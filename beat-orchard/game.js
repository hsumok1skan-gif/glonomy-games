/* Beat Orchard — 전투 규칙과 그리기 */
(function () {
  'use strict';
  var GD = window.GD;
  var Store = window.Store;
  var Sound = window.Sound;
  var T = window.I18N.T; // 판 위 글도 T('한국어 원문') — 영어는 i18n.js (H-24)

  var FENCE_X = 9;
  var TREE_X = 12;
  var BACK_X = 22;
  var FRONT_X = 37;
  // 판을 누르는 구역 (0~100): 나무 < ZONE_TREE ≤ 뒷칸 < ZONE_BACK ≤ 앞칸 < ZONE_FRONT. 폭 340px 에서도 44px 이상
  var ZONE_TREE = 15;
  var ZONE_BACK = 29;
  var ZONE_FRONT = 45;
  var SPAWN_X = 104;
  var WAVES = GD.WAVES;
  var MAX_ENEMIES = 160;
  var DIFFS = GD.DIFFICULTIES;
  // 밤바람 박자: 나무에 물 주기·심기·기술을 박자에 맞추면 세진다 (차별점, 기획서 맨 위)
  // 판정 폭·이어치기 상한의 기본값. 박자 강화·보물이 r.mods(perfectWin·goodWin·comboCap·comboPower)로 바꾼다
  var PERFECT_SEC = 0.09;
  var GOOD_SEC = 0.2;
  var PUMP_MAX = 1.5;
  var COMBO_CAP = 15;
  var COMBO_POWER = 0.04;
  var MAX_PARTS = 160;
  var PROBE_DT = 1 / 60;
  // 균형 (기획서 `## 균형 목표`, `## 바뀐 점`)
  var SEED_DMG = 0.07;      // 심은 열매 한 알당 던지는 열매 피해 +7%
  var SEED_RATE = 0.025;    // 심은 열매 한 알당 던지는 빠르기 +2.5% (40알까지)
  var SEED_DROP = 0.2;      // 안개를 걷어 낼 때 열매가 떨어질 확률
  var SHIELD_MAX = 100;     // 막이는 이만큼까지 쌓인다
  var SHIELD_DECAY = 5;     // 막이는 초마다 이만큼 흩어진다
  var BOSS_HP = 1.5;        // 우두머리 체력 배율
  var SUMMON_HP = 0.5;      // 우두머리가 부른 안개의 체력 (그 물결 배율에 곱함)
  // 콤보 장면 (H-13): 콤보가 GIFT_STEP 마다 정원사가 정령(안개)에게 열매를 쏜다
  var GIFT_STEP = 5;        // 이 콤보마다 쏜다 (5·10·15 …)
  var GIFT_MAX = 3;         // 한 번에 쏘는 열매 수 상한 (콤보 5 → 1알, 10 → 2알, 15 이상 → 3알)
  var GIFT_TIME = 0.34;     // 열매가 날아가는 시간 (게임 초)
  var GIFT_BOSS = 0.1;      // 우두머리는 돌아가지 않고 최대 체력의 이만큼 피해
  var HOME_TIME = 0.75;     // 돌아가는 정령이 보이는 시간 (그리기만)
  var SLOWMO_TIME = 0.16;   // 정령이 돌아가는 순간 느린 화면 (실제 초, 그리기 고리만)
  var SLOWMO_RATE = 0.3;
  // 광고 보고 이어하기 (H-29, ads.js 자리 revive): 울타리가 무너지면 판을 멈추고 고르게 한다
  var REVIVE_FENCE = 0.5;   // 이어 가면 울타리를 최대의 이만큼으로
  var REVIVE_SHIELD = 30;   // 이어 가는 순간 보호막 (초마다 SHIELD_DECAY 씩 흩어져 약 6초)
  var REVIVE_PUSH = 10;     // 울타리 바로 앞 안개를 이만큼(판 폭 %) 밀어낸다 (우두머리는 그대로)

  function mapBy(arr) { var m = {}; for (var i = 0; i < arr.length; i++) m[arr[i].id] = arr[i]; return m; }
  var EN = mapBy(GD.ENEMIES);
  var BO = mapBy(GD.BOSSES);
  var GA = mapBy(GD.GARDENERS);
  var UP = mapBy(GD.UPGRADES);
  var RE = mapBy(GD.RELICS);
  var WS = mapBy(GD.WORKSHOP);

  var canvas = null;
  var cx = null;
  var W = 0;
  var H = 0;
  var dpr = 1;
  var run = null;
  var state = 'idle'; // idle | running | paused | picking | down(무너짐, 이어하기를 고르는 중) | ended
  var loopId = 0;
  var lastTs = 0;
  var hudTimer = 0;
  var cursor = { lane: 1, slot: 1 };
  var selected = -1;
  var pickKind = '';
  var pickIds = [];
  var listeners = {};
  var probeMode = false; // window.__test 로 돌 때: 그리기·소리·화면 알림 없이 규칙만
  var hold = false; // 첫 판 안내 중: 박자는 돌지만 안개는 나오지 않는다
  var lastWin = false;
  var bgCache = null;    // 판 바탕 그림 (크기·지역이 바뀌면 다시 그림)
  var spriteCache = {};  // 안개·나뭇잎 그림 (색·크기마다 하나)
  var spriteN = 0;
  function keepSprite(key, o) {
    if (++spriteN > 300) { spriteCache = {}; spriteN = 1; }
    spriteCache[key] = o;
    return o;
  }
  // 사람 그림(assets/)이 늦게 불리면 바탕·그림 조각을 새로 만들어 다시 그린다
  if (window.Art) Art.onLoad(function () { bgCache = null; spriteCache = {}; spriteN = 0; renderNow(); });

  function reduced() {
    if (Store.settings.reduceMotion) return true;
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function slotX(slot) { return slot === 1 ? FRONT_X : BACK_X; }
  // 오늘의 도전은 날짜로 정한 씨(seed)로 같은 판을 만든다. 보통 판은 Math.random
  function rng() {
    if (!run || !run.seeded) return Math.random();
    var t = (run.rngState = (run.rngState + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function rand(n) { return Math.floor(rng() * n); }
  function diffOf(r) { return DIFFS[r.diff] || DIFFS[0]; }
  function emit(name, a, b, c) { if (!probeMode && listeners[name]) listeners[name](a, b, c); }

  // ---------- 밤바람 박자 ----------
  function beatPeriod(r) { return Math.max(0.62, 0.9 - 0.015 * (Math.max(1, r.wave) - 1) - 0.01 * r.region); }
  function beatPhase(r) { return r.beat - Math.floor(r.beat); }
  // 2 = 딱 맞음, 1 = 좋음, 0 = 빗나감
  function judge(r) {
    var f = beatPhase(r);
    var d = Math.min(f, 1 - f) * beatPeriod(r);
    var wide = Store.settings.beatWide ? 1.6 : 1;
    var m = r.mods;
    if (d <= PERFECT_SEC * wide * m.perfectWin) return 2;
    if (d <= GOOD_SEC * wide * m.goodWin) return 1;
    return 0;
  }
  function comboMul(r) { return 1 + r.mods.comboPower * Math.min(r.combo, r.mods.comboCap); }
  var JUDGE_TEXT = ['놓침', '좋아!', '완벽!'];
  var JUDGE_COLOR = ['#ff8a8a', '#a8f0a0', '#ffd34d'];
  // 나무 열매 한 알의 피해 (열매·이어치기를 넣어서)
  function treeShotDmg(r, L) {
    var m = r.mods;
    return 6 * m.treeDmg * (1 + (SEED_DMG + m.seedPower) * r.lanes[L].seeds) * comboMul(r);
  }
  // 콤보는 완벽!일 때만 오른다. 좋아!·놓침이면 끊긴다 (박자 강화 missGuard 가 있으면 웨이브마다 그 횟수만큼 버팀)
  function beatResult(r, j, x, lane) {
    var m = r.mods;
    var k;
    if (j === 1) {
      // 좋아!: 열매·기술 효과는 그대로 받지만 콤보는 오르지 않고 끊긴다
      r.goods++;
      r.lastHitBeat = Math.round(r.beat);
      addFloat(r, x, lane, T(JUDGE_TEXT[1]), JUDGE_COLOR[1], 1.1);
      Sound.play('good');
      if (r.combo > 0 && r.guard > 0) {
        r.guard--;
        addFloat(r, x + 6, lane, T('콤보 유지!'), '#a0d8ff', 1.1);
      } else if (r.combo > 0) {
        if (r.combo >= 3) addFloat(r, x + 6, lane, T('콤보 끊김'), '#ff9a9a', 1);
        r.combo = 0;
      }
    } else if (j === 2) {
      r.combo++;
      if (r.combo > r.bestCombo) r.bestCombo = r.combo;
      r.lastHitBeat = Math.round(r.beat);
      r.perfects++;
      addFloat(r, x, lane, T(JUDGE_TEXT[j]) + (r.combo >= 3 ? ' ' + r.combo : ''), JUDGE_COLOR[j], 1.35);
      Sound.play('perfect');
      // 박자 강화: 딱!이면 그 줄 나무가 열매를 바로 던진다
      if (j === 2 && m.perfectShot > 0 && laneHasTarget(r, lane, TREE_X, 100)) {
        for (k = 0; k < m.perfectShot; k++) shoot(r, lane, TREE_X + 2, treeShotDmg(r, lane), 'tree');
        burst(r, TREE_X + 2, lane, '#ffd34d', 4, 18);
      }
      // 콤보 5마다: 정원사가 정령(안개)에게 열매를 쏘고, 받은 정령은 숲으로 돌아간다 (핵심 장면)
      if (r.combo > 0 && r.combo % GIFT_STEP === 0) comboVolley(r, lane);
    } else if (r.combo > 0 && r.guard > 0) {
      // 박자 강화: 물결마다 정한 횟수만큼 빗나가도 이어치기가 버틴다
      r.guard--;
      r.misses++;
      addFloat(r, x, lane, T(JUDGE_TEXT[0]), JUDGE_COLOR[0], 1);
      addFloat(r, x + 6, lane, T('콤보 유지!'), '#a0d8ff', 1.1);
      fxTreeFail(r, lane);
      Sound.play('miss');
    } else {
      if (r.combo >= 3) addFloat(r, x + 6, lane, T('콤보 끊김'), '#ff9a9a', 1);
      r.combo = 0;
      r.misses++;
      addFloat(r, x, lane, T(JUDGE_TEXT[0]), JUDGE_COLOR[0], 1);
      fxTreeFail(r, lane);
      Sound.play('miss');
    }
    emit('onFx', 'combo', r.combo, j);
  }
  // 박자가 지날 때마다: 나무가 고개를 까딱, 오래 안 맞추면 이어치기가 끊긴다
  function onBeat(r) {
    var bi = r.beatIdx;
    if (r.combo > 0 && bi - r.lastHitBeat > 4) {
      if (r.combo >= 3) addFloat(r, TREE_X + 6, 1, T('콤보 끊김'), '#ff9a9a', 1);
      r.combo = 0;
      emit('onFx', 'combo', 0, -1);
    }
    if (probeMode) return;
    for (var L = 0; L < 3; L++) r.lanes[L].beatPop = 0.12;
    if (Store.settings.beatSound) Sound.play('beat');
    // 배경 음악: 다음 박(bi + 1)을 그 박이 올 실제 시각에 미리 예약한다 (싸움 빠르기만큼 짧아짐)
    var real = beatPeriod(r) / (Store.settings.speed || 1);
    Sound.musicBeat(bi + 1, real, r.wave, r.region, (bi + 1 - r.beat) * real);
  }

  // ---------- 손맛 (번쩍임·흔들림·튀는 숫자·짧은 애니메이션) ----------
  function fxLive() { return !probeMode; }
  function moveOk() { return !reduced(); }
  function screenShake(r, amp, t) {
    if (!fxLive() || !moveOk() || !Store.settings.shake) return;
    r.shakeAmp = r.shakeT > 0 ? Math.max(r.shakeAmp, amp) : amp;
    r.shakeT = Math.max(r.shakeT, t);
    r.shakeMax = r.shakeT;
  }
  function screenFlash(r, color, t) {
    if (!fxLive()) return;
    r.flashC = color;
    r.flashT = t;
    r.flashMax = t;
  }
  // 터지는 조각: kind 'spark' 사방으로 / 'suck' 목표점으로 끌려감 / 'ring' 퍼지는 고리
  function burst(r, x, lane, color, n, spd, kind) {
    if (!fxLive() || !moveOk()) return;
    for (var i = 0; i < n; i++) {
      if (r.parts.length >= MAX_PARTS) r.parts.shift();
      var a = Math.random() * Math.PI * 2;
      var v = spd * (0.5 + Math.random() * 0.7);
      r.parts.push({ kind: kind || 'spark', x: x, y: lane + 0.5, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.05,
        life: 0.35 + Math.random() * 0.15, max: 0.5, color: color, size: 2 + Math.random() * 2.5, tx: 0, ty: 0 });
    }
  }
  function suckTo(r, x, lane, tx, ty, color, n) {
    if (!fxLive() || !moveOk()) return;
    for (var i = 0; i < n; i++) {
      if (r.parts.length >= MAX_PARTS) r.parts.shift();
      r.parts.push({ kind: 'suck', x: x + (Math.random() - 0.5) * 3, y: lane + 0.5 + (Math.random() - 0.5) * 0.2, vx: 0, vy: 0,
        life: 0.45, max: 0.45, color: color, size: 3.2, tx: tx, ty: ty, sx: 0, sy: 0 });
      var p = r.parts[r.parts.length - 1];
      p.sx = p.x; p.sy = p.y;
    }
  }
  function ring(r, x, y, color) {
    if (!fxLive()) return;
    if (r.parts.length >= MAX_PARTS) r.parts.shift();
    r.parts.push({ kind: 'ring', x: x, y: y, vx: 0, vy: 0, life: 0.3, max: 0.3, color: color, size: 4, tx: 0, ty: 0 });
  }
  // 맞힘: 대상 번쩍(hitFlash) + 대상 흔들림(jolt, 피해 비례) + 피해 숫자(큰 값은 크게·노랑) + 커졌다 돌아오기(pop)·조각
  function fxHit(r, e, dmg, crit) {
    e.hitFlash = 0.1;
    if (!fxLive()) return;
    var rel = Math.min(1, dmg / Math.max(1, e.maxHp));
    if (moveOk()) { e.jolt = 0.15; e.joltAmp = 1 + rel * 7 + (crit ? 2 : 0); e.pop = 0.16; }
    var big = dmg >= 25 || crit;
    if (Store.settings.dmgNums) addFloat(r, e.x, e.lane, String(Math.round(dmg)), crit ? '#ffd34d' : (big ? '#ffe9b0' : '#ffffff'), 0.9 + Math.min(0.9, dmg / 40) + (crit ? 0.35 : 0));
    burst(r, e.x, e.lane, '#ffffff', crit ? 5 : 2, crit ? 22 : 12);
  }
  // 걷어 냄: 조각이 터지고, 우두머리는 화면이 번쩍·흔들린다
  function fxKill(r, e, def) {
    if (!fxLive()) return;
    burst(r, e.x, e.lane, def.color, e.boss ? 24 : 8, e.boss ? 40 : 24);
    if (e.boss) { screenShake(r, 9, 0.4); screenFlash(r, '#ffffff', 0.18); }
    else screenShake(r, Math.min(3, 0.6 + e.maxHp / 60), 0.1);
  }
  // 얻음: 열매가 왼쪽 위 열매 배지(심기 열) 쪽으로 끌려 들어가고, 배지가 번쩍·커짐(ui.js bumpHud), 숫자 "+열매 n"
  function fxGain(r, x, lane, n) {
    addFloat(r, x, lane, T('열매 +{n}', { n: n }), '#b6f0a0', 1 + Math.min(0.8, (n - 1) * 0.2));
    if (!fxLive()) return;
    suckTo(r, x, lane, 0, -0.15, '#b6f0a0', Math.min(6, 1 + n));
    emit('onFx', 'seed', n);
  }
  // 심음: 나무가 커졌다 돌아오고 초록으로 번쩍, 잎 조각
  function fxPlant(r, lane, n) {
    var ln = r.lanes[lane];
    addFloat(r, TREE_X, lane, n > 1 ? T('심기 ×{n}!', { n: n }) : T('심었다!'), '#b6f0a0', n > 1 ? 1.4 : 1.1);
    if (!fxLive()) return;
    ln.flashT = 0.15; ln.flashC = '#b6f0a0';
    if (moveOk()) { ln.pop = 0.3; ln.jolt = 0.12; ln.joltAmp = 2; }
    burst(r, TREE_X, lane, '#8fe08a', 6 + n * 3, 20);
    emit('onFx', 'plant', n);
  }
  // 놓침·틀림(박자 빗나감, 열매 없음): 나무가 빨갛게 번쩍·흔들리고 움츠러든다
  function fxTreeFail(r, lane) {
    if (!fxLive()) return;
    var ln = r.lanes[lane];
    ln.flashT = 0.15; ln.flashC = '#ff7070';
    if (moveOk()) { ln.jolt = 0.22; ln.joltAmp = 4; ln.squish = 0.2; }
    burst(r, TREE_X, lane, '#ff9a9a', 3, 10);
  }
  // 이어치기 5·10·15: 줄마다 금빛 고리
  function fxComboStep(r, lane) {
    if (!fxLive()) return;
    for (var L = 0; L < 3; L++) { r.lanes[L].flashT = 0.18; r.lanes[L].flashC = '#ffd34d'; if (moveOk()) r.lanes[L].pop = 0.25; }
    ring(r, TREE_X, lane + 0.5, '#ffd34d');
    screenShake(r, 2, 0.12);
  }
  // 열매를 쏜 정원사(또는 나무): 금빛 번쩍 + 튀어 오름 + "콤보 n!" 글자
  function fxGiftLaunch(r, g, n) {
    addFloat(r, g.fx, g.flane, T('콤보 {n}! 열매 발사', { n: r.combo }), '#ffe08a', 1.25 + Math.min(0.4, n * 0.12));
    if (!fxLive()) return;
    if (g.unit) { g.unit.cheer = 0.3; g.unit.flash = 0; }
    burst(r, g.fx, g.flane, '#ffd34d', 6, 22);
    ring(r, g.fx, g.flane + 0.5, '#ffe08a');
    Sound.play('gift');
  }
  // 정령이 돌아감: 금빛 번쩍·흔들림·느린 화면, 금빛 고리 둘, 조각, "돌아갔다!" 큰 글자, 정령은 오른쪽 위 숲으로 날아가며 흐려진다
  function fxHome(r, e) {
    addFloat(r, e.x, e.lane, T('돌아갔다!'), '#ffe9a8', 1.6);
    if (!fxLive()) return;
    if (r.homes.length > 12) r.homes.shift();
    r.homes.push({ id: e.id, x: e.x, lane: e.lane, fly: e.fly, t: HOME_TIME });
    screenFlash(r, '#fff1b8', 0.16);
    screenShake(r, 5, 0.22);
    ring(r, e.x, e.lane + 0.5, '#ffe08a');
    ring(r, e.x, e.lane + 0.5, '#ffffff');
    burst(r, e.x, e.lane, '#ffd34d', 16, 34);
    burst(r, e.x, e.lane, '#ffffff', 6, 20);
    if (moveOk()) r.slowMo = SLOWMO_TIME;
    Sound.play('home');
    Sound.vibrate(20);
  }
  // 울타리 맞음: 화면 빨간 번쩍 + 피해에 비례한 흔들림 + "-피해" 숫자 + 나무 조각
  function fxFence(r, dmg, lane) {
    var big = dmg >= 15;
    addFloat(r, FENCE_X + 3, lane, '-' + Math.round(dmg), '#ff6b6b', 1 + Math.min(1, dmg / 20));
    if (!fxLive()) return;
    screenFlash(r, '#ff3b3b', big ? 0.2 : 0.12);
    screenShake(r, Math.min(10, 2 + dmg * 0.35), big ? 0.4 : 0.25);
    burst(r, FENCE_X, lane, '#c89a6a', big ? 10 : 5, 26);
    emit('onFx', 'fence', dmg);
  }
  // 정원사 맞음: 빨간 번쩍(flash) + 흔들림 + "-피해", 지치면 회색 조각과 작은 화면 흔들림
  function fxUnitHurt(r, u, dmg, down) {
    u.flash = 0.15;
    if (!fxLive()) return;
    if (moveOk()) { u.jolt = 0.18; u.joltAmp = 1.5 + Math.min(5, dmg / u.maxHp * 30); }
    if (Store.settings.dmgNums) addFloat(r, slotX(u.slot), u.lane, '-' + Math.round(dmg), '#ff9a9a', 0.85 + Math.min(0.6, dmg / 25));
    if (down) { burst(r, slotX(u.slot), u.lane, '#b0b8b8', 10, 22); screenShake(r, 4, 0.2); }
  }
  function fxStep(r, dt) {
    var i;
    for (i = r.parts.length - 1; i >= 0; i--) {
      var p = r.parts[i];
      p.life -= dt;
      if (p.life <= 0) { r.parts.splice(i, 1); continue; }
      if (p.kind === 'suck') {
        var k = 1 - p.life / p.max;
        var ease = k * k;
        p.x = p.sx + (p.tx - p.sx) * ease;
        p.y = p.sy + (p.ty - p.sy) * ease;
      } else if (p.kind === 'spark') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.9;
      }
    }
    for (i = 0; i < r.enemies.length; i++) {
      var e = r.enemies[i];
      if (e.jolt > 0) e.jolt -= dt;
      if (e.pop > 0) e.pop -= dt;
    }
    for (i = 0; i < r.units.length; i++) {
      if (r.units[i].jolt > 0) r.units[i].jolt -= dt;
      if (r.units[i].cheer > 0) r.units[i].cheer -= dt;
    }
    for (i = r.homes.length - 1; i >= 0; i--) {
      r.homes[i].t -= dt;
      if (r.homes[i].t <= 0) r.homes.splice(i, 1);
    }
    for (i = 0; i < 3; i++) {
      var ln = r.lanes[i];
      if (ln.pop > 0) ln.pop -= dt;
      if (ln.jolt > 0) ln.jolt -= dt;
      if (ln.squish > 0) ln.squish -= dt;
      if (ln.flashT > 0) ln.flashT -= dt;
      if (ln.beatPop > 0) ln.beatPop -= dt;
    }
    if (r.flashT > 0) r.flashT -= dt;
    if (r.press && r.press.t > 0) r.press.t -= dt;
  }

  // ---------- 능력치 ----------
  function baseMods() {
    return { treeDmg: 1, treeRate: 1, seedPower: 0, unitDmg: 1, unitHp: 1, unitRate: 1, pierce: 0, crit: 0.05, critMul: 2,
      slowOnHit: 0, splash: 0, fenceMax: 0, dropChance: 0, skillCd: 1, goldMul: 1, fenceRegen: 0, armorPierce: 0,
      startSeeds: 0, frontArmor: 0, bossDmg: 1, flyDmg: 1, extraChoice: 0, healOnWave: 0,
      // 박자 규칙 (data.js 에서 beat: true 인 강화·보물이 바꾼다)
      perfectWin: 1,       // 딱! 판정 폭 배율 (judge)
      goodWin: 1,          // 좋아 판정 폭 배율 (judge)
      comboCap: COMBO_CAP, // 이어치기가 피해에 더해지는 상한 (comboMul)
      comboPower: COMBO_POWER, // 이어치기 하나당 피해 + (comboMul)
      perfectShot: 0,      // 딱!일 때 그 줄 나무가 바로 던지는 열매 수 (beatResult)
      comboBurst: 0,       // 이어치기 10마다 그 줄 폭발 피해 (물결 체력 배율에 곱함, beatResult)
      missGuard: 0,        // 물결마다 빗나가도 이어치기가 버티는 횟수 (beatResult)
      pumpGain: 1 };       // 박자 물 주기로 오르는 빠르기 배율 (water)
  }
  function computeMods(r) {
    var m = baseMods();
    var i;
    var shop = Store.meta.shop;
    for (i = 0; i < shop.length; i++) if (WS[shop[i]]) WS[shop[i]].apply(m);
    for (i = 0; i < r.upgrades.length; i++) if (UP[r.upgrades[i]]) UP[r.upgrades[i]].apply(m);
    for (i = 0; i < r.relics.length; i++) if (RE[r.relics[i]]) RE[r.relics[i]].apply(m);
    m.crit = Math.min(0.75, m.crit);
    m.slowOnHit = Math.min(0.8, m.slowOnHit);
    m.skillCd = Math.max(0.3, m.skillCd);
    m.perfectWin = Math.min(1.8, m.perfectWin);
    m.goodWin = Math.min(1.4, m.goodWin);
    m.comboCap = Math.min(40, m.comboCap);
    m.perfectShot = Math.min(3, m.perfectShot);
    m.missGuard = Math.min(3, m.missGuard);
    return m;
  }

  // ---------- 판 만들기 ----------
  function makeUnit(r, d, lane, slot, frac) {
    var maxHp = d.hp * r.mods.unitHp;
    return { id: d.id, lane: lane, slot: slot, maxHp: maxHp, hp: maxHp * frac, atk: 0, cd: 0, down: false, flash: 0, jolt: 0, joltAmp: 0 };
  }
  function unitIndexAt(r, lane, slot) {
    for (var i = 0; i < r.units.length; i++) if (r.units[i].lane === lane && r.units[i].slot === slot) return i;
    return -1;
  }
  function placeSquad(r) {
    var order = [1, 0, 2];
    var fi = 0;
    var bi = 0;
    r.units = [];
    for (var i = 0; i < r.squad.length; i++) {
      var d = GA[r.squad[i]];
      if (!d) continue;
      var slot = d.role === 'front' ? 1 : 0;
      var lane;
      if (slot === 1) { lane = order[fi % 3]; fi++; } else { lane = order[bi % 3]; bi++; }
      var tries = 0;
      while (unitIndexAt(r, lane, slot) >= 0 && tries < 6) {
        lane = (lane + 1) % 3;
        if (tries === 2) slot = 1 - slot;
        tries++;
      }
      r.units.push(makeUnit(r, d, lane, slot, 1));
      Store.seen('gardener', d.id);
    }
  }
  // pump = 박자에 맞춰 물을 준 만큼 오르는 열매 빠르기(시간이 지나면 빠진다), lastBeat = 마지막으로 물 준 박자
  function newLane() {
    return { seeds: 0, fire: 0, pump: 0, lastBeat: -99, pop: 0, jolt: 0, joltAmp: 0, squish: 0, flashT: 0, flashC: '', beatPop: 0 };
  }
  function newRun(regionIdx, squad, opts) {
    opts = opts || {};
    var diff = typeof opts.diff === 'number' && opts.diff >= 0 && opts.diff < DIFFS.length ? opts.diff : 0;
    var r = {
      region: regionIdx, squad: squad.slice(0, 3), wave: 0, t: 0, fence: 0, fenceMax: 0, shield: 0, pouch: 0,
      diff: diff, daily: typeof opts.daily === 'string' ? opts.daily : '',
      seeded: !!opts.seeded, rngState: opts.seed | 0, nextWave: null, waveList: [],
      lanes: [newLane(), newLane(), newLane()],
      units: [], enemies: [], shots: [], floats: [], parts: [], gifts: [], homes: [], homeSent: 0, slowMo: 0,
      upgrades: [], relics: [], kills: 0, bossKills: 0, planted: 0, skillUses: 0, fenceDamaged: false,
      spawnQueue: [], spawnT: 0, hpScale: 1, waveActive: false, rallyUntil: 0,
      shakeT: 0, shakeAmp: 0, shakeMax: 0, flashT: 0, flashMax: 0, flashC: '#ffffff',
      beat: 0, beatIdx: 0, combo: 0, bestCombo: 0, lastHitBeat: -99, perfects: 0, goods: 0, misses: 0, guard: 0,
      banner: '', bannerT: 0, mods: null, nextUid: 1
    };
    r.mods = computeMods(r);
    r.fenceMax = 100 + r.mods.fenceMax;
    r.fence = r.fenceMax;
    r.pouch = r.mods.startSeeds + (opts.tutorial ? 2 : 0);
    placeSquad(r);
    return r;
  }
  function refreshAfterMods(r) {
    r.mods = computeMods(r);
    r.fenceMax = 100 + r.mods.fenceMax;
    if (r.fence > r.fenceMax) r.fence = r.fenceMax;
    for (var i = 0; i < r.units.length; i++) {
      var u = r.units[i];
      var frac = u.maxHp > 0 ? u.hp / u.maxHp : 0;
      u.maxHp = GA[u.id].hp * r.mods.unitHp;
      u.hp = frac * u.maxHp;
    }
  }

  // ---------- 물결 ----------
  function buildWave(r, w) {
    var reg = GD.REGIONS[r.region];
    var q = [];
    var t = 1.5;
    if (w === WAVES) { q.push({ boss: reg.boss, lane: 1, t: t }); t += 3; }
    var df = diffOf(r);
    var budget = Math.round((8 + w * 5 + r.region * 4) * df.count);
    if (w === WAVES) budget = Math.floor(budget * 0.6);
    var pool = reg.pool.filter(function (id) { return EN[id] && (EN[id].minWave || 1) <= w; });
    if (!pool.length) pool = [reg.pool[0]];
    var gap = Math.max(1.1, 4.3 - w * 0.22 - r.region * 0.15);
    var guard = 0;
    while (budget > 0 && guard < 80) {
      guard++;
      var id = pool[rand(pool.length)];
      var cost = Math.max(1, Math.round(EN[id].hp / 12));
      budget -= cost;
      q.push({ id: id, lane: rand(3), t: t });
      t += gap * (0.6 + rng() * 0.8);
    }
    return { wave: w, queue: q, hpScale: reg.hpMul * waveHp(w) * df.hp };
  }
  function waveHp(w) {
    var t = GD.WAVE_HP;
    return t[Math.max(0, Math.min(t.length - 1, w - 1))];
  }
  // 물결 목록을 종류별로 묶는다 (미리보기용, 나온 순서대로)
  function summarizeQueue(q) {
    var out = [];
    var at = {};
    for (var i = 0; i < q.length; i++) {
      var it = q[i];
      var key = it.boss ? 'B:' + it.boss : it.id;
      var d = it.boss ? BO[it.boss] : EN[it.id];
      if (!d) continue;
      if (at[key] === undefined) {
        at[key] = out.length;
        out.push({ id: d.id, sym: d.sym, name: d.name, n: 0, boss: !!it.boss, fly: !!d.fly });
      }
      out[at[key]].n++;
    }
    return out;
  }
  function prepareNext(r) {
    if (r.wave >= WAVES) { r.nextWave = null; return; }
    r.nextWave = buildWave(r, r.wave + 1);
  }
  function startWave(r) {
    r.wave++;
    var b = r.nextWave && r.nextWave.wave === r.wave ? r.nextWave : buildWave(r, r.wave);
    r.nextWave = null;
    r.waveList = summarizeQueue(b.queue);
    r.spawnQueue = b.queue;
    r.hpScale = b.hpScale;
    r.spawnT = 0;
    r.waveActive = true;
    r.guard = r.mods.missGuard;
    r.banner = r.wave === WAVES ? T('마지막 웨이브 — 우두머리 등장!') : T('웨이브 {n}', { n: r.wave });
    r.bannerT = 2;
    Sound.play(r.wave === WAVES ? 'boss' : 'wave');
    emit('onWave', r.wave);
  }
  function makeEnemy(r, def, lane, x, isBoss, hpScale) {
    var hp = isBoss ? def.hp * BOSS_HP * diffOf(r).hp : def.hp * hpScale;
    var e = {
      uid: r.nextUid++, id: def.id, boss: isBoss, lane: lane, x: x, hp: hp, maxHp: hp,
      speed: def.speed, dmg: isBoss ? def.dmg : Math.round(def.dmg * (1 + 0.05 * r.wave + 0.2 * r.region)),
      armor: def.armor || 0, shieldHits: def.shieldHits || 0, regen: (def.regen || 0) * (isBoss ? 1 : hpScale),
      fly: !!def.fly, burst: !!def.burst, split: def.split || null,
      atk: 0, slowT: 0, hasteT: 0, abilT: 0, hitFlash: 0, jolt: 0, joltAmp: 0, pop: 0, dead: false
    };
    r.enemies.push(e);
    Store.seen(isBoss ? 'boss' : 'enemy', def.id);
    return e;
  }
  function spawn(r, item) {
    if (r.enemies.length >= MAX_ENEMIES) return;
    if (item.boss) {
      var bd = BO[item.boss];
      if (bd) makeEnemy(r, bd, item.lane, SPAWN_X, true, 1);
    } else if (EN[item.id]) {
      makeEnemy(r, EN[item.id], item.lane, SPAWN_X, false, r.hpScale);
    }
  }
  function bossAbility(r, e, dt) {
    var def = BO[e.id];
    e.abilT += dt;
    if (e.abilT < def.every) return;
    e.abilT = 0;
    if (def.ability === 'summon' && EN[def.summon]) {
      for (var i = 0; i < 2; i++) {
        if (r.enemies.length < MAX_ENEMIES) makeEnemy(r, EN[def.summon], rand(3), Math.min(SPAWN_X, e.x + 4), false, r.hpScale * SUMMON_HP);
      }
      addFloat(r, e.x, e.lane, T('소환!'), '#ffd0a0');
    } else if (def.ability === 'shield') {
      e.shieldHits += 6;
      addFloat(r, e.x, e.lane, T('보호막!'), '#c0d0ff');
    } else if (def.ability === 'haste') {
      e.hasteT = 2;
      addFloat(r, e.x, e.lane, T('질주!'), '#d0f0ff');
    } else if (def.ability === 'hop') {
      e.lane = (e.lane + 1 + rand(2)) % 3;
      e.atk = 0;
      addFloat(r, e.x, e.lane, T('줄 이동!'), '#d0d0ff');
    }
  }

  // ---------- 싸움 ----------
  // 떠올랐다 흐려지는 글자. size: 큰 값일수록 크게
  function addFloat(r, x, lane, text, color, size) {
    if (probeMode) return;
    if (r.floats.length > 60) r.floats.shift();
    r.floats.push({ x: x, lane: lane, text: text, color: color, life: 0.8, size: size || 1 });
  }
  function laneHasTarget(r, lane, fromX, range) {
    for (var i = 0; i < r.enemies.length; i++) {
      var e = r.enemies[i];
      if (!e.dead && e.lane === lane && e.x >= fromX - 1 && e.x - fromX <= range && e.x < 100) return true;
    }
    return false;
  }
  function nearestAhead(r, lane, fromX, range, groundOnly) {
    var best = null;
    for (var i = 0; i < r.enemies.length; i++) {
      var e = r.enemies[i];
      if (e.dead || e.lane !== lane || (groundOnly && e.fly)) continue;
      if (e.x >= fromX - 1.5 && e.x - fromX <= range && (!best || e.x < best.x)) best = e;
    }
    return best;
  }
  function shoot(r, lane, x, dmg, src) {
    if (r.shots.length > 200) return;
    r.shots.push({ lane: lane, x: x, dmg: dmg, src: src, speed: 70, pierce: r.mods.pierce, hit: [] });
  }
  function damage(r, e, dmg, src) {
    if (e.dead) return;
    var m = r.mods;
    if (e.shieldHits > 0) {
      e.shieldHits--;
      if (src !== 'splash') { addFloat(r, e.x, e.lane, T('막혔다'), '#a8d8d8'); Sound.play('block'); }
      return;
    }
    var crit = rng() < m.crit;
    if (crit) dmg *= m.critMul;
    if (e.boss) dmg *= m.bossDmg;
    if (e.fly) dmg *= m.flyDmg;
    var arm = Math.max(0, e.armor - m.armorPierce);
    dmg = Math.max(1, dmg - arm);
    e.hp -= dmg;
    if (src !== 'splash') fxHit(r, e, dmg, crit); else e.hitFlash = 0.1;
    if (m.slowOnHit > 0 && rng() < m.slowOnHit) e.slowT = Math.max(e.slowT, 1.2);
    if (m.splash > 0 && src !== 'splash') {
      var around = [];
      for (var i = 0; i < r.enemies.length; i++) {
        var o = r.enemies[i];
        if (o !== e && !o.dead && o.lane === e.lane && Math.abs(o.x - e.x) < 5) around.push(o);
      }
      for (var j = 0; j < around.length; j++) damage(r, around[j], dmg * m.splash, 'splash');
    }
    if (e.hp <= 0) kill(r, e);
  }
  // ---------- 콤보 장면 (H-13): 정원사가 정령에게 열매를 쏘고, 받은 정령은 돌아간다 ----------
  // 맞힐 정령: 울타리에 가까운 것부터, 쏜 줄을 먼저. 이미 열매가 날아가는 정령과 우두머리는 뒤로 미룬다
  function giftTarget(r, lane) {
    var best = null;
    var bestKey = 0;
    for (var i = 0; i < r.enemies.length; i++) {
      var e = r.enemies[i];
      if (e.dead || e.x >= 100) continue;
      var aimed = false;
      for (var k = 0; k < r.gifts.length; k++) if (r.gifts[k].uid === e.uid) { aimed = true; break; }
      if (aimed) continue;
      var key = e.x + (e.lane === lane ? 0 : 200) + (e.boss ? 1000 : 0);
      if (!best || key < bestKey) { best = e; bestKey = key; }
    }
    return best;
  }
  // 쏘는 쪽: 정령이 있는 줄의 서 있는 정원사(전열 먼저), 없으면 아무 정원사, 그래도 없으면 그 줄 나무
  function giftShooter(r, lane) {
    var pick = null;
    for (var pass = 0; pass < 2 && !pick; pass++) {
      for (var i = 0; i < r.units.length; i++) {
        var u = r.units[i];
        if (u.down || (pass === 0 && u.lane !== lane)) continue;
        if (!pick || u.slot > pick.slot) pick = u;
      }
    }
    if (pick) return { unit: pick, fx: slotX(pick.slot), flane: pick.lane };
    return { unit: null, fx: TREE_X + 2, flane: lane };
  }
  function comboVolley(r, lane) {
    var m = r.mods;
    var k;
    var n = Math.min(GIFT_MAX, Math.floor(r.combo / GIFT_STEP));
    fxComboStep(r, lane);
    for (k = 0; k < n; k++) {
      var e = giftTarget(r, lane);
      if (!e) break;
      var s = giftShooter(r, e.lane);
      var g = { uid: e.uid, unit: s.unit, fx: s.fx, flane: s.flane, tx: e.x, tlane: e.lane, t: 0, delay: k * 0.08 };
      r.gifts.push(g);
      if (k === 0) fxGiftLaunch(r, g, n);
    }
    // 박자 강화: 콤보 10마다 그 줄 안개가 모두 터진다 (물결 세기만큼 셈)
    if (m.comboBurst > 0 && r.combo % 10 === 0) {
      var inLane = r.enemies.filter(function (x) { return x.lane === lane && !x.dead; });
      for (k = 0; k < inLane.length; k++) damage(r, inLane[k], m.comboBurst * r.hpScale * m.treeDmg, 'skill');
      addFloat(r, TREE_X + 8, lane, T('줄 전체 폭발!'), '#ffb04d', 1.4);
      ring(r, TREE_X + 8, lane + 0.5, '#ffb04d');
      screenShake(r, 4, 0.2);
    }
  }
  // 날아가는 선물 열매: 정령을 따라가다 닿으면 돌려보낸다 (게임 시간으로 흐름 — 균형 시험에서도 같은 규칙)
  function stepGifts(r, dt) {
    for (var i = r.gifts.length - 1; i >= 0; i--) {
      var g = r.gifts[i];
      if (g.delay > 0) { g.delay -= dt; continue; }
      g.t += dt;
      var e = null;
      for (var k = 0; k < r.enemies.length; k++) if (r.enemies[k].uid === g.uid) { e = r.enemies[k]; break; }
      if (e && !e.dead) { g.tx = e.x; g.tlane = e.lane; }
      if (g.t < GIFT_TIME) continue;
      r.gifts.splice(i, 1);
      if (!e || e.dead) { burst(r, g.tx, g.tlane, '#ffd34d', 5, 14); continue; }
      if (e.boss) {
        damage(r, e, e.maxHp * GIFT_BOSS, 'gift');
        ring(r, e.x, e.lane + 0.5, '#ffe08a');
      } else {
        sendHome(r, e);
      }
    }
  }
  // 열매를 받은 정령은 쓰러지지 않고 숲으로 돌아간다 (물리침으로 세고 열매도 떨군다. 갈라지지 않는다)
  function sendHome(r, e) {
    r.homeSent++;
    kill(r, e, true);
  }
  function kill(r, e, home) {
    e.dead = true;
    r.kills++;
    if (home) fxHome(r, e);
    else fxKill(r, e, e.boss ? BO[e.id] : EN[e.id]);
    if (e.boss) {
      r.bossKills++;
      r.pouch += 5;
      fxGain(r, e.x, e.lane, 5);
      Sound.play('seed');
    } else if (rng() < SEED_DROP + r.mods.dropChance) {
      r.pouch++;
      fxGain(r, e.x, e.lane, 1);
      Sound.play('seed');
    }
    if (e.split && EN[e.split.id] && !home) {
      for (var i = 0; i < e.split.n; i++) {
        if (r.enemies.length < MAX_ENEMIES) makeEnemy(r, EN[e.split.id], e.lane, Math.min(SPAWN_X, e.x + 1.5 + i * 2.5), false, r.hpScale * 0.7);
      }
    }
    if (!home) Sound.play('kill');
  }
  function blockerFor(r, e) {
    var best = null;
    for (var i = 0; i < r.units.length; i++) {
      var u = r.units[i];
      if (u.down || u.lane !== e.lane) continue;
      var ux = slotX(u.slot);
      if (e.x >= ux - 1 && e.x - ux <= 3.5 && (!best || ux > slotX(best.slot))) best = u;
    }
    return best;
  }
  function hurtUnit(r, u, dmg) {
    var reduce = u.slot === 1 ? r.mods.frontArmor : 0;
    var got = Math.max(1, dmg - reduce);
    u.hp -= got;
    var down = u.hp <= 0;
    fxUnitHurt(r, u, got, down);
    if (down) {
      u.hp = 0;
      u.down = true;
      if (selected >= 0 && r.units[selected] === u) selected = -1;
      addFloat(r, slotX(u.slot), u.lane, T('쓰러짐'), '#ff9a9a', 1.2);
      Sound.play('hurt');
      Sound.vibrate(30);
    }
  }
  function hurtFence(r, dmg, lane) {
    if (r.shield > 0) {
      var a = Math.min(r.shield, dmg);
      r.shield -= a;
      dmg -= a;
      if (dmg <= 0) { addFloat(r, FENCE_X + 2, lane, T('보호막'), '#a0d8ff'); ring(r, FENCE_X, lane + 0.5, '#a0d8ff'); Sound.play('block'); return; }
    }
    r.fence -= dmg;
    r.fenceDamaged = true;
    fxFence(r, dmg, lane);
    Sound.play('fence');
    Sound.vibrate(40);
  }

  function update(r, dt) {
    var m = r.mods;
    var i;
    r.t += dt;
    // 밤바람 박자: 물결이 오를수록 빨라진다
    r.beat += dt / beatPeriod(r);
    var bi = Math.floor(r.beat);
    if (bi !== r.beatIdx) { r.beatIdx = bi; onBeat(r); }
    // 막이는 쌓아 둘 수 없고 조금씩 흩어진다: 안개가 닿기 직전에 쳐야 쓸모가 있다
    if (r.shield > 0) r.shield = Math.max(0, r.shield - SHIELD_DECAY * dt);
    if (r.waveActive && !hold) {
      r.spawnT += dt;
      var g = 0;
      while (r.spawnQueue.length && r.spawnQueue[0].t <= r.spawnT && g < 20) { g++; spawn(r, r.spawnQueue.shift()); }
    }
    // 나무
    for (var L = 0; L < 3; L++) {
      var ln = r.lanes[L];
      if (ln.pump > 0) ln.pump = Math.max(0, ln.pump - dt * 0.35);
      if (!laneHasTarget(r, L, TREE_X, 100)) { if (ln.fire > 0.9) ln.fire = 0.9; continue; }
      // 물 준 만큼(pump) 빨리 던지고, 이어치기(combo)만큼 세게 던진다
      ln.fire += dt * 1.1 * m.treeRate * (1 + SEED_RATE * Math.min(ln.seeds, 40)) * (1 + ln.pump);
      var n = 0;
      while (ln.fire >= 1 && n < 5) {
        n++;
        ln.fire -= 1;
        shoot(r, L, TREE_X + 2, treeShotDmg(r, L), 'tree');
      }
    }
    // 정원사
    var rally = r.t < r.rallyUntil ? 1.5 : 1;
    for (i = 0; i < r.units.length; i++) {
      var u = r.units[i];
      if (u.cd > 0) u.cd = Math.max(0, u.cd - dt);
      if (u.flash > 0) u.flash -= dt;
      if (u.down) continue;
      var d = GA[u.id];
      var ux = slotX(u.slot);
      if (u.atk < 1) u.atk += dt * d.rate * m.unitRate;
      if (u.atk >= 1) {
        if (d.role === 'front') {
          var tgt = nearestAhead(r, u.lane, ux, d.range, true);
          if (tgt) { u.atk = 0; damage(r, tgt, d.dmg * m.unitDmg * rally, 'unit'); Sound.play('hit'); }
        } else if (laneHasTarget(r, u.lane, ux, d.range)) {
          u.atk = 0;
          shoot(r, u.lane, ux + 2, d.dmg * m.unitDmg * rally, 'unit');
          Sound.play('shoot');
        }
      }
    }
    // 날아가는 열매
    for (var s = r.shots.length - 1; s >= 0; s--) {
      var p = r.shots[s];
      var px = p.x;
      p.x += p.speed * dt;
      for (var k = 0; k < r.enemies.length; k++) {
        var e = r.enemies[k];
        if (e.dead || e.lane !== p.lane || p.hit.indexOf(e.uid) >= 0) continue;
        if (e.x >= px - 1.5 && e.x <= p.x + 1.5) {
          p.hit.push(e.uid);
          damage(r, e, p.dmg, p.src);
          if (p.hit.length > p.pierce) { p.x = 999; break; }
        }
      }
      if (p.x > SPAWN_X + 4) r.shots.splice(s, 1);
    }
    // 콤보 장면의 선물 열매
    if (r.gifts.length) stepGifts(r, dt);
    // 안개
    for (i = 0; i < r.enemies.length; i++) {
      var en = r.enemies[i];
      if (en.dead) continue;
      if (en.regen) en.hp = Math.min(en.maxHp, en.hp + en.regen * dt);
      if (en.slowT > 0) en.slowT -= dt;
      if (en.hasteT > 0) en.hasteT -= dt;
      if (en.hitFlash > 0) en.hitFlash -= dt;
      if (en.boss) bossAbility(r, en, dt);
      var spd = en.speed * (en.slowT > 0 ? 0.5 : 1) * (en.hasteT > 0 ? 2.2 : 1) * (en.burst && en.hp < en.maxHp * 0.5 ? 1.8 : 1);
      var blocker = en.fly ? null : blockerFor(r, en);
      if (blocker) {
        en.atk += dt * (en.boss ? 0.8 : 1);
        if (en.atk >= 1) { en.atk = 0; hurtUnit(r, blocker, en.dmg); }
      } else {
        en.x -= spd * dt;
        if (en.x <= FENCE_X) {
          en.dead = true;
          hurtFence(r, en.boss ? en.dmg * 3 : en.dmg, en.lane);
        }
      }
    }
    for (i = r.enemies.length - 1; i >= 0; i--) if (r.enemies[i].dead) r.enemies.splice(i, 1);
    for (i = r.floats.length - 1; i >= 0; i--) { r.floats[i].life -= dt; if (r.floats[i].life <= 0) r.floats.splice(i, 1); }
    if (!probeMode) fxStep(r, dt);
    if (r.shakeT > 0) r.shakeT -= dt;
    if (r.bannerT > 0) r.bannerT -= dt;

    if (r.fence <= 0) { r.fence = 0; if (canRevive(r)) goDown(r); else endRun(false); return; }
    if (r.waveActive && !r.spawnQueue.length && !r.enemies.length) waveCleared(r);
  }

  function waveCleared(r) {
    var m = r.mods;
    r.waveActive = false;
    r.shots = [];
    r.gifts = [];
    r.fence = Math.min(r.fenceMax, r.fence + m.fenceRegen);
    for (var i = 0; i < r.units.length; i++) {
      var u = r.units[i];
      if (u.down) { u.down = false; u.hp = u.maxHp * 0.5; }
      u.hp = Math.min(u.maxHp, u.hp + u.maxHp * m.healOnWave);
      u.atk = 0;
    }
    Sound.play('clear');
    if (r.wave >= WAVES) { endRun(true); return; }
    offerPick(r);
  }

  // ---------- 강화·보물 고르기 ----------
  function weightedPick(list, n) {
    var out = [];
    var pool = list.slice();
    var guard = 0;
    while (out.length < n && pool.length && guard < 200) {
      guard++;
      var total = 0;
      var i;
      for (i = 0; i < pool.length; i++) total += pool[i].w;
      var x = rng() * total;
      for (i = 0; i < pool.length; i++) {
        x -= pool[i].w;
        if (x <= 0) break;
      }
      if (i >= pool.length) i = pool.length - 1;
      out.push(pool[i].id);
      pool.splice(i, 1);
    }
    return out;
  }
  function offerPick(r) {
    var n = Math.min(5, 3 + r.mods.extraChoice);
    var list;
    if (r.wave === 3 || r.wave === 6) {
      pickKind = 'relic';
      list = GD.RELICS.filter(function (x) { return r.relics.indexOf(x.id) < 0; }).map(function (x) { return { id: x.id, w: 1 }; });
    } else {
      pickKind = 'upgrade';
      list = GD.UPGRADES.filter(function (x) { return !(x.once && r.upgrades.indexOf(x.id) >= 0); })
        .map(function (x) { return { id: x.id, w: x.rare === 3 ? 1 : (x.rare === 2 ? 3 : 6) }; });
    }
    prepareNext(r);
    pickIds = weightedPick(list, n);
    if (!pickIds.length) { saveSnapshot(r); startWave(r); return; }
    state = 'picking';
    Sound.musicStop();
    renderNow();
    emit('onPick', pickKind, pickIds.slice(), r.wave);
  }
  function choose(index) {
    var r = run;
    if (!r || state !== 'picking') return false;
    var id = pickIds[index];
    if (!id) return false;
    if (pickKind === 'relic') {
      r.relics.push(id);
      Store.seen('relic', id);
      if (RE[id].onPick) RE[id].onPick(r);
    } else {
      r.upgrades.push(id);
      Store.seen('upgrade', id);
      if (UP[id].onPick) UP[id].onPick(r);
    }
    refreshAfterMods(r);
    if (r.fence > r.fenceMax) r.fence = r.fenceMax;
    Sound.play('pick');
    pickIds = [];
    saveSnapshot(r);
    startWave(r);
    state = 'running';
    lastTs = 0;
    if (!probeMode) startLoop();
    return true;
  }

  // ---------- 조작 ----------
  function plant(lane) {
    var r = run;
    if (!r || state !== 'running' || lane < 0 || lane > 2) return false;
    if (r.pouch <= 0) { addFloat(r, TREE_X, lane, T('열매 없음'), '#ffb0b0'); fxTreeFail(r, lane); Sound.play('empty'); return false; }
    // 박자에 딱 맞춰 심으면 열매 한 알이 두 알 몫으로 자란다
    var j = judge(r);
    var n = j === 2 ? 2 : 1;
    r.pouch--;
    r.lanes[lane].seeds += n;
    r.planted++;
    beatResult(r, j, TREE_X + 4, lane);
    fxPlant(r, lane, n);
    Sound.play('plant');
    Sound.vibrate(10);
    emit('onHud');
    emit('onAction', 'plant');
    return true;
  }
  // 나무에 물 주기 (나무 누르기 / A·S·D): 박자에 맞으면 그 줄 열매가 빨라지고 이어치기가 쌓인다.
  // 한 박자에 같은 나무를 두 번 누르거나 박자를 놓치면 빗나감 — 빨라진 것이 빠지고 이어치기가 끊긴다
  function water(lane) {
    var r = run;
    if (!r || state !== 'running' || lane < 0 || lane > 2) return false;
    var ln = r.lanes[lane];
    var nb = Math.round(r.beat);
    var j = ln.lastBeat === nb ? 0 : judge(r);
    ln.lastBeat = nb;
    var gain = r.mods.pumpGain;
    if (j === 2) ln.pump = Math.min(PUMP_MAX, ln.pump + 0.4 * gain);
    else if (j === 1) ln.pump = Math.min(PUMP_MAX, ln.pump + 0.22 * gain);
    else ln.pump = Math.max(0, ln.pump - 0.3);
    beatResult(r, j, TREE_X, lane);
    if (j > 0 && fxLive()) {
      ln.flashT = 0.12; ln.flashC = j === 2 ? '#ffd34d' : '#a8f0a0';
      if (moveOk()) ln.pop = j === 2 ? 0.25 : 0.15;
      burst(r, TREE_X, lane, '#8fd0ff', j === 2 ? 6 : 3, 16);
    }
    if (fxLive()) Sound.vibrate(j === 2 ? 12 : 6);
    emit('onAction', 'water');
    return true;
  }
  function useSkill(i) {
    var r = run;
    if (!r || state !== 'running') return false;
    var u = r.units[i];
    if (!u || u.down || u.cd > 0) return false;
    var sk = GA[u.id].skill;
    var k;
    var e;
    // 박자에 맞춰 쓰면 기술이 세진다: 딱 ×1.5, 좋음 ×1.2
    var j = judge(r);
    var pw = sk.power * (j === 2 ? 1.5 : (j === 1 ? 1.2 : 1));
    beatResult(r, j, slotX(u.slot) + 4, u.lane);
    if (sk.type === 'shield') {
      r.shield = Math.min(SHIELD_MAX, r.shield + pw);
      ring(r, FENCE_X, 1.5, '#a0d8ff');
    } else if (sk.type === 'slow') {
      for (k = 0; k < r.enemies.length; k++) { e = r.enemies[k]; if (e.lane === u.lane) e.slowT = Math.max(e.slowT, pw); }
    } else if (sk.type === 'seed') {
      var gain = Math.round(pw);
      r.pouch += gain;
      fxGain(r, slotX(u.slot), u.lane, gain);
    } else if (sk.type === 'heal') {
      for (k = 0; k < r.units.length; k++) {
        var o = r.units[k];
        if (o.down) { o.down = false; o.hp = 0; }
        o.hp = Math.min(o.maxHp, o.hp + o.maxHp * pw);
        burst(r, slotX(o.slot), o.lane, '#7fe08a', 5, 14);
      }
    } else if (sk.type === 'burst') {
      var hitList = r.enemies.filter(function (x) { return x.lane === u.lane && !x.dead; });
      for (k = 0; k < hitList.length; k++) damage(r, hitList[k], pw * r.mods.unitDmg, 'skill');
      screenShake(r, 4, 0.2);
    } else if (sk.type === 'rain') {
      var all = r.enemies.filter(function (x) { return !x.dead; });
      for (k = 0; k < all.length; k++) damage(r, all[k], pw * r.mods.unitDmg, 'skill');
      screenShake(r, 5, 0.25);
      screenFlash(r, '#bfe0ff', 0.12);
    } else if (sk.type === 'rally') {
      r.rallyUntil = r.t + pw;
    }
    u.cd = sk.cd * r.mods.skillCd;
    r.skillUses++;
    addFloat(r, slotX(u.slot), u.lane, sk.name, '#ffe08a', 1.2);
    Sound.play('skill');
    Sound.vibrate(20);
    emit('onHud');
    emit('onAction', 'skill');
    return true;
  }
  function tapSlot(lane, slot) {
    var r = run;
    if (!r || state !== 'running') return;
    var at = unitIndexAt(r, lane, slot);
    if (selected < 0) {
      if (at >= 0) { selected = at; Sound.play('click'); }
      return;
    }
    if (at === selected) { selected = -1; return; }
    var u = r.units[selected];
    if (!u) { selected = -1; return; }
    var oldLane = u.lane;
    var oldSlot = u.slot;
    u.lane = lane;
    u.slot = slot;
    u.atk = 0;
    if (at >= 0) { r.units[at].lane = oldLane; r.units[at].slot = oldSlot; r.units[at].atk = 0; }
    selected = -1;
    Sound.play('click');
    emit('onAction', 'move');
  }
  function onPointer(ev) {
    if (!run || state !== 'running' || !canvas) return;
    var rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    var lx = (ev.clientX - rect.left) / rect.width * 100;
    var lane = Math.max(0, Math.min(2, Math.floor((ev.clientY - rect.top) / rect.height * 3)));
    cursor.lane = lane;
    // 누른 칸 표시: 누른 자리에 퍼지는 고리 + 칸 밝힘
    ring(run, lx, (ev.clientY - rect.top) / rect.height * 3, 'rgba(255,255,255,0.8)');
    run.press = { lane: lane, zone: lx < ZONE_TREE ? 0 : (lx < ZONE_BACK ? 1 : (lx < ZONE_FRONT ? 2 : 3)), t: 0.15 };
    if (lx < ZONE_TREE) water(lane);
    else if (lx < ZONE_BACK) { cursor.slot = 0; tapSlot(lane, 0); }
    else if (lx < ZONE_FRONT) { cursor.slot = 1; tapSlot(lane, 1); }
    else selected = -1;
    if (ev.cancelable) ev.preventDefault();
  }
  function handleKey(k) {
    if (!run || state !== 'running') return false;
    if (k === '1' || k === '2' || k === '3') { plant(parseInt(k, 10) - 1); return true; }
    var wk = { a: 0, s: 1, d: 2, A: 0, S: 1, D: 2 };
    if (Object.prototype.hasOwnProperty.call(wk, k)) { water(wk[k]); return true; }
    var sk = { q: 0, w: 1, e: 2, Q: 0, W: 1, E: 2 };
    if (Object.prototype.hasOwnProperty.call(sk, k)) { useSkill(sk[k]); return true; }
    if (k === 'ArrowUp') { cursor.lane = Math.max(0, cursor.lane - 1); return true; }
    if (k === 'ArrowDown') { cursor.lane = Math.min(2, cursor.lane + 1); return true; }
    if (k === 'ArrowLeft') { cursor.slot = 0; return true; }
    if (k === 'ArrowRight') { cursor.slot = 1; return true; }
    if (k === ' ' || k === 'Enter') { tapSlot(cursor.lane, cursor.slot); return true; }
    if (k === 'Escape' || k === 'x' || k === 'X') { selected = -1; return true; }
    return false;
  }

  // ---------- 저장·끝 ----------
  function saveSnapshot(r) {
    Store.saveRun({
      v: 1, region: r.region, squad: r.squad, wave: r.wave, t: r.t, fence: r.fence, shield: r.shield, pouch: r.pouch,
      seeds: r.lanes.map(function (l) { return l.seeds; }),
      units: r.units.map(function (u) { return { id: u.id, lane: u.lane, slot: u.slot, frac: u.maxHp > 0 ? u.hp / u.maxHp : 1 }; }),
      upgrades: r.upgrades, relics: r.relics, kills: r.kills, bossKills: r.bossKills, planted: r.planted,
      skillUses: r.skillUses, fenceDamaged: r.fenceDamaged,
      diff: r.diff, daily: r.daily, seeded: r.seeded, rngState: r.rngState,
      next: r.nextWave ? { wave: r.nextWave.wave, hpScale: r.nextWave.hpScale, queue: r.nextWave.queue } : null
    });
    Store.save();
  }
  function validSnapshot(s) {
    if (!s || typeof s !== 'object' || s.v !== 1) return false;
    if (typeof s.region !== 'number' || s.region < 0 || s.region >= GD.REGIONS.length) return false;
    if (!Array.isArray(s.squad) || !s.squad.length || !s.squad.every(function (id) { return !!GA[id]; })) return false;
    if (typeof s.wave !== 'number' || s.wave < 0 || s.wave >= WAVES) return false;
    if (s.diff !== undefined && (typeof s.diff !== 'number' || s.diff < 0 || s.diff >= DIFFS.length)) return false;
    return true;
  }
  // 저장해 둔 다음 물결 목록을 되살린다. 모르는 안개가 있으면 버리고 새로 만든다
  function restoreNext(s) {
    var n = s.next;
    if (!n || typeof n !== 'object' || n.wave !== s.wave + 1 || !Array.isArray(n.queue) || !n.queue.length) return null;
    var q = [];
    for (var i = 0; i < n.queue.length && i < 200; i++) {
      var it = n.queue[i];
      if (!it || typeof it.t !== 'number') return null;
      var lane = Math.max(0, Math.min(2, it.lane | 0));
      if (it.boss) { if (!BO[it.boss]) return null; q.push({ boss: it.boss, lane: lane, t: it.t }); }
      else { if (!EN[it.id]) return null; q.push({ id: it.id, lane: lane, t: it.t }); }
    }
    return { wave: n.wave, queue: q, hpScale: +n.hpScale > 0 ? +n.hpScale : 1 };
  }
  // ---------- 광고 보고 이어하기 (H-29) ----------
  // 울타리가 무너져도 바로 끝내지 않고 'down' 으로 멈춘 채 ui.js 창(ov-revive)에서 고르게 한다.
  // 시험 모드·오늘의 도전·이미 이어 간 판·광고 횟수를 다 쓴 판은 지금처럼 바로 끝난다 (균형 시험 숫자 그대로)
  function canRevive(r) {
    if (probeMode || r.daily || r.revived) return false;
    var A = window.Ads;
    return !!(A && A.left && A.left('revive') !== 0);
  }
  function goDown(r) {
    state = 'down';
    stopLoop();
    Sound.musicStop();
    Sound.play('lose');
    Sound.vibrate(120);
    r.downs = (r.downs | 0) + 1;
    renderNow();
    emit('onDown', { wave: r.wave, waves: WAVES, fenceMax: Math.round(r.fenceMax) });
  }
  // 광고를 끝까지 본 뒤에만 ui.js 가 부른다: 울타리 50%·보호막 잠깐, 울타리 앞 안개를 밀어내고 그 웨이브를 이어 간다
  function revive() {
    var r = run;
    if (!r || state !== 'down') return false;
    r.revived = true;
    r.fence = Math.max(1, Math.round(r.fenceMax * REVIVE_FENCE));
    r.shield = Math.min(SHIELD_MAX, Math.max(r.shield, REVIVE_SHIELD));
    for (var i = 0; i < r.enemies.length; i++) {
      var en = r.enemies[i];
      if (!en.boss && en.x < FENCE_X + REVIVE_PUSH) en.x = FENCE_X + REVIVE_PUSH;
    }
    for (var L = 0; L < 3; L++) ring(r, FENCE_X, L + 0.5, '#ffd34d');
    screenFlash(r, '#fff1b8', 0.18);
    addFloat(r, FENCE_X + 6, 1, T('다시 일어섰다!'), '#ffd34d', 1.5);
    Sound.play('home');
    state = 'running';
    lastTs = 0;
    startLoop();
    return true;
  }
  // 이어하지 않고 결과로 (지금까지의 패배와 같다)
  function giveUp() {
    if (!run || state !== 'down') return false;
    endRun(false);
    return true;
  }
  // 웨이브 사이 고르기 창에서 광고를 본 뒤에만 ui.js 가 부른다 (ads.js 자리 refill)
  function addPouch(n) {
    var r = run;
    if (!r || state !== 'picking' || !(n > 0)) return false;
    r.pouch += n;
    saveSnapshot(r);
    emit('onFx', 'seed', n);
    return true;
  }

  function endRun(win) {
    var r = run;
    if (!r || state === 'ended') return;
    state = 'ended';
    lastWin = !!win;
    stopLoop();
    Sound.musicStop();
    var M = Store.meta;
    var st = M.stats;
    var waves = win ? WAVES : (r.waveActive ? Math.max(0, r.wave - 1) : r.wave);
    var df = diffOf(r);
    var silver = Math.round((waves * 2 + r.bossKills * 10 + (win ? 15 + r.region * 8 : 0)) * r.mods.goldMul * df.silver);
    M.silver += silver;
    st.silverTotal += silver;
    st.runs++;
    if (win) {
      st.wins++;
      if (!r.daily) M.cleared[r.region] = true;
      if (!r.fenceDamaged) st.perfectWins++;
    } else st.losses++;
    st.kills += r.kills;
    st.bossKills += r.bossKills;
    st.planted += r.planted;
    st.wavesCleared += waves;
    st.skillUses += r.skillUses;
    st.upgradesPicked += r.upgrades.length;
    st.playTime += r.t;
    var maxSeeds = 0;
    for (var i = 0; i < 3; i++) maxSeeds = Math.max(maxSeeds, r.lanes[i].seeds);
    st.maxLaneSeeds = Math.max(st.maxLaneSeeds, maxSeeds);
    st.bestCombo = Math.max(st.bestCombo || 0, r.bestCombo);
    st.perfects = (st.perfects || 0) + r.perfects;
    var newBest = false;
    var dailyBest = 0;
    if (r.daily) {
      // 오늘의 도전은 지역 기록·해금에 넣지 않고 따로 남긴다
      var dy = M.daily;
      dy.date = r.daily; dy.played = true; dy.done = true; dy.win = win; dy.waves = waves; dy.kills = r.kills; dy.time = r.t;
      M.dailyLog = M.dailyLog.filter(function (x) { return x.date !== r.daily; });
      M.dailyLog.push({ date: r.daily, region: r.region, diff: r.diff, win: win, waves: waves, kills: r.kills, time: r.t });
      if (M.dailyLog.length > 14) M.dailyLog = M.dailyLog.slice(-14);
      for (var j = 0; j < M.dailyLog.length; j++) dailyBest = Math.max(dailyBest, M.dailyLog[j].waves);
    } else {
      var dg = r.diff;
      if (waves > M.bestWave[r.region]) M.bestWave[r.region] = waves;
      if (win && (!M.bestTime[r.region] || r.t < M.bestTime[r.region])) M.bestTime[r.region] = r.t;
      if (waves > M.diffBest[r.region][dg]) { M.diffBest[r.region][dg] = waves; newBest = true; }
      if (win) {
        M.diffCleared[r.region][dg] = true;
        if (!M.diffTime[r.region][dg] || r.t < M.diffTime[r.region][dg]) { M.diffTime[r.region][dg] = r.t; newBest = true; }
      }
      M.lastRegion = r.region;
      M.lastSquad = r.squad.slice();
      M.lastDiff = dg;
    }
    Store.clearRun();
    var got = checkAchievements();
    Store.save();
    Sound.play(win ? 'win' : 'lose');
    Sound.vibrate(win ? 80 : 120);
    emit('onEnd', {
      win: win, region: r.region, waves: waves, kills: r.kills, bossKills: r.bossKills, time: r.t, silver: silver,
      perfect: win && !r.fenceDamaged, planted: r.planted, newBest: newBest, achievements: got,
      fenceLeft: r.fenceMax > 0 ? Math.max(0, r.fence) / r.fenceMax : 0,
      diff: r.diff, daily: r.daily, dailyBest: dailyBest,
      bestWave: r.daily ? dailyBest : M.diffBest[r.region][r.diff],
      bestTime: r.daily ? 0 : M.diffTime[r.region][r.diff], squad: r.squad.slice(),
      bestCombo: r.bestCombo, perfects: r.perfects, goods: r.goods, misses: r.misses, homeSent: r.homeSent
    });
  }
  function checkAchievements() {
    var M = Store.meta;
    var got = [];
    for (var i = 0; i < GD.ACHIEVEMENTS.length; i++) {
      var a = GD.ACHIEVEMENTS[i];
      if (M.achv.indexOf(a.id) >= 0) continue;
      var ok = false;
      try { ok = !!a.check(M); } catch (e) { ok = false; }
      if (ok) { M.achv.push(a.id); got.push(a.name); }
    }
    return got;
  }

  // ---------- 그리기 ----------
  // 가로 화면: 전투 화면(#scr-battle)이 화면 전체를 채우는 flex 배치이고, 판 상자(#field-wrap)는
  // 첫 판 안내·물결 미리보기·심기 열·오른쪽 열(일시정지·기술)을 뺀 나머지를 CSS 가 정한다 (위 HUD 띠는 없다).
  // 캔버스는 그 상자 안에 절대 위치로 들어가므로 상자 크기에 영향을 주지 않고, 상자 크기를 그대로 쓴다.
  function resize() {
    if (!canvas) return;
    var wrap = canvas.parentElement;
    var cw = wrap ? wrap.clientWidth : 0;
    var ch = wrap ? wrap.clientHeight : 0;
    if (cw <= 0 || ch <= 0) return; // 세로 안내로 가려졌거나 전투 화면이 아닐 때
    if (cw === W && ch === H && canvas.width === Math.round(cw * Math.min(2, window.devicePixelRatio || 1))) { renderNow(); return; }
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cw;
    H = ch;
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    bgCache = null;
    spriteCache = {};
    spriteN = 0;
    renderNow();
  }
  function renderNow() { if (!probeMode && run && cx && W > 0) render(run); }
  function roundRect(x, y, w, h, rr) {
    cx.beginPath();
    cx.moveTo(x + rr, y);
    cx.lineTo(x + w - rr, y);
    cx.quadraticCurveTo(x + w, y, x + w, y + rr);
    cx.lineTo(x + w, y + h - rr);
    cx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    cx.lineTo(x + rr, y + h);
    cx.quadraticCurveTo(x, y + h, x, y + h - rr);
    cx.lineTo(x, y + rr);
    cx.quadraticCurveTo(x, y, x + rr, y);
    cx.closePath();
  }
  // 체력 막대: 둥근 어두운 바탕 + 밝은 윗줄이 있는 채움
  function bar(x, y, w, frac, color) {
    var h = 5;
    var f = Math.max(0, Math.min(1, frac));
    cx.fillStyle = 'rgba(5,8,18,0.7)';
    roundRect(x - 1, y - 1, w + 2, h + 2, 3);
    cx.fill();
    if (f <= 0) return;
    cx.fillStyle = color;
    roundRect(x, y, Math.max(h, w * f), h, 2.5);
    cx.fill();
    cx.fillStyle = 'rgba(255,255,255,0.35)';
    cx.fillRect(x + 1, y + 1, Math.max(0, w * f - 2), 1.5);
  }
  // 체력 비율에 따라 초록 → 노랑 → 빨강
  function hpColor(f) { return f > 0.6 ? '#5ef08a' : (f > 0.3 ? '#ffd34d' : '#ff5a6a'); }
  // 그림용 고정 무작위 (게임 규칙의 Math.random 순서를 건드리지 않는다)
  function hrand(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  // '#rrggbb' 를 밝게(amt > 0) 또는 어둡게(amt < 0)
  function shade(hex, amt, alpha) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    var n = m ? parseInt(m[1], 16) : 0x8899aa;
    var c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) {
      return Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt));
    });
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (alpha == null ? 1 : alpha) + ')';
  }
  function offscreen(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * dpr));
    c.height = Math.max(1, Math.round(h * dpr));
    var g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { canvas: c, g: g, w: w, h: h };
  }
  // 판 바탕(밤하늘빛 땅·풀·칸 받침·울타리·가장자리 어둠)은 크기·지역이 바뀔 때만 한 번 그려 둔다
  // 사람 그림 3(과수원 배경)의 나무·밭 자리를 판 좌표에 맞추는 가로 배율·밀기 (그림 나무 13.5% → TREE_X, 앞밭 37.4% → FRONT_X)
  var FIELD_ART_SCALE = (FRONT_X - TREE_X) / (37.4 - 13.5);
  var FIELD_ART_SHIFT = TREE_X - 13.5 * FIELD_ART_SCALE;
  function getBg(r) {
    var fieldArt = window.Art ? Art.image('field') : null;
    var key = r.region + ':' + W + 'x' + H + '@' + dpr + (fieldArt ? ':art' : '');
    if (bgCache && bgCache.key === key) return bgCache;
    if (fieldArt) return getArtBg(r, key, fieldArt);
    var reg = GD.REGIONS[r.region];
    var o = offscreen(W, H);
    var g = o.g;
    var sx = W / 100;
    var lh = H / 3;
    var L, k;
    var sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0c1630');
    sky.addColorStop(1, '#081412');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    for (L = 0; L < 3; L++) {
      var lg = g.createLinearGradient(0, 0, W, 0);
      lg.addColorStop(0, shade(reg.color, -0.45));
      lg.addColorStop(0.45, shade(reg.color, -0.68));
      lg.addColorStop(1, '#121a33');
      g.fillStyle = lg;
      g.fillRect(0, L * lh + 2, W, lh - 4);
      // 줄 안쪽 위는 밝게, 아래는 어둡게 (두둑처럼)
      var vg = g.createLinearGradient(0, L * lh, 0, (L + 1) * lh);
      vg.addColorStop(0, 'rgba(255,255,255,0.07)');
      vg.addColorStop(0.5, 'rgba(255,255,255,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.35)');
      g.fillStyle = vg;
      g.fillRect(0, L * lh + 2, W, lh - 4);
      // 풀잎
      g.lineWidth = 1;
      var blades = Math.min(140, Math.round(W / 3));
      for (k = 0; k < blades; k++) {
        var bx = hrand(L * 997 + k) * W;
        var by = L * lh + 6 + hrand(L * 577 + k * 3) * (lh - 12);
        var bh = 3 + hrand(k * 7 + L) * 5;
        g.strokeStyle = shade(reg.color, 0.25, 0.08 + 0.14 * (1 - bx / W));
        g.beginPath();
        g.moveTo(bx, by);
        g.lineTo(bx + 1.5, by - bh);
        g.stroke();
      }
      // 나무 밑 흙
      g.fillStyle = 'rgba(40,24,12,0.55)';
      g.beginPath();
      g.ellipse(TREE_X * sx, L * lh + lh * 0.8, lh * 0.3, lh * 0.08, 0, 0, Math.PI * 2);
      g.fill();
      // 정원사 칸 받침: 뒷칸 보라, 앞칸 파랑 빛 원
      for (var sl = 0; sl < 2; sl++) {
        var px = slotX(sl) * sx;
        var py = L * lh + lh * 0.5;
        var pr = Math.min(lh * 0.62, 10 * sx) * 0.62;
        var rg = g.createRadialGradient(px, py, 0, px, py, pr);
        rg.addColorStop(0, sl ? 'rgba(90,150,255,0.28)' : 'rgba(170,110,255,0.28)');
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rg;
        g.beginPath();
        g.arc(px, py, pr, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = sl ? 'rgba(140,190,255,0.28)' : 'rgba(200,160,255,0.28)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.ellipse(px, py + pr * 0.55, pr * 0.85, pr * 0.3, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }
    // 줄 사이 빛 선
    for (L = 1; L < 3; L++) {
      g.fillStyle = 'rgba(160,220,255,0.10)';
      g.fillRect(0, L * lh - 1, W, 2);
    }
    // 오른쪽에서 흘러드는 안개
    var fg = g.createLinearGradient(W * 0.72, 0, W, 0);
    fg.addColorStop(0, 'rgba(180,195,235,0)');
    fg.addColorStop(1, 'rgba(180,195,235,0.26)');
    g.fillStyle = fg;
    g.fillRect(W * 0.72, 0, W * 0.28, H);
    // 울타리: 기둥과 가로대
    var fx = (FENCE_X - 2.5) * sx;
    var fw = Math.max(5, 2 * sx);
    var wood = g.createLinearGradient(fx, 0, fx + fw, 0);
    wood.addColorStop(0, '#5a3b20');
    wood.addColorStop(0.5, '#b08050');
    wood.addColorStop(1, '#4a2e18');
    g.fillStyle = wood;
    var posts = 7;
    for (k = 0; k < posts; k++) {
      var py0 = k * H / posts + 3;
      g.beginPath();
      g.moveTo(fx, py0 + 4);
      g.lineTo(fx + fw / 2, py0);
      g.lineTo(fx + fw, py0 + 4);
      g.lineTo(fx + fw, py0 + H / posts - 6);
      g.lineTo(fx, py0 + H / posts - 6);
      g.closePath();
      g.fill();
    }
    g.fillStyle = 'rgba(120,80,45,0.9)';
    g.fillRect(fx - fw * 0.4, 0, fw * 0.4, H);
    return finishBg(key, o, null);
  }
  function finishBg(key, o, trees) {
    var o2 = { key: key, canvas: o.canvas, trees: trees };
    // 가장자리 어둠은 매 프레임 같은 그러데이션을 다시 쓴다
    var vig = cx.createRadialGradient(W * 0.45, H * 0.5, Math.min(W, H) * 0.35, W * 0.45, H * 0.5, Math.max(W, H) * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,10,0.5)');
    o2.vignette = vig;
    bgCache = o2;
    return o2;
  }
  // 사람 그림 3 으로 그린 판 바탕. 줄마다 나무 부분을 잘라(가장자리는 흐리게) 두고, render 가 그 조각을 키우고 흔들어
  // 나무의 손맛(커짐·움츠림·열매만큼 자람)을 낸다. 지역 색은 위에 엷게 덮는다
  function getArtBg(r, key, img) {
    var reg = GD.REGIONS[r.region];
    var o = offscreen(W, H);
    var g = o.g;
    var sx = W / 100;
    var lh = H / 3;
    var L;
    g.fillStyle = '#081412';
    g.fillRect(0, 0, W, H);
    g.drawImage(img, FIELD_ART_SHIFT * sx, 0, W * FIELD_ART_SCALE, H);
    g.fillStyle = shade(reg.color, -0.3, 0.16);
    g.fillRect(0, 0, W, H);
    var trees = [];
    for (L = 0; L < 3; L++) {
      var cw = W * 0.19;
      var ch = lh * 0.92;
      var cx0 = TREE_X * sx - cw / 2;
      var cy0 = Math.max(0, L * lh + lh * 0.46 - ch / 2);
      var t = offscreen(cw, ch);
      t.g.drawImage(o.canvas, Math.max(0, cx0 * dpr), cy0 * dpr, cw * dpr, ch * dpr, Math.max(0, -cx0), 0, cw, ch);
      t.g.save();
      t.g.globalCompositeOperation = 'destination-in';
      t.g.translate(cw / 2, ch / 2);
      t.g.scale(cw / 2, ch / 2);
      var m = t.g.createRadialGradient(0, 0, 0.62, 0, 0, 1);
      m.addColorStop(0, 'rgba(0,0,0,1)');
      m.addColorStop(1, 'rgba(0,0,0,0)');
      t.g.fillStyle = m;
      t.g.fillRect(-1, -1, 2, 2);
      t.g.restore();
      trees.push(t);
    }
    // 정원사 칸 받침 (그림 위에 엷게): 뒷칸 보라, 앞칸 파랑
    for (L = 0; L < 3; L++) {
      for (var sl = 0; sl < 2; sl++) {
        var px = slotX(sl) * sx;
        var py = L * lh + lh * 0.5;
        var pr = Math.min(lh * 0.62, 10 * sx) * 0.62;
        g.strokeStyle = sl ? 'rgba(140,190,255,0.32)' : 'rgba(200,160,255,0.32)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.ellipse(px, py + pr * 0.55, pr * 0.85, pr * 0.3, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }
    return finishBg(key, o, trees);
  }
  // 사람 그림 6(정원사)·5(안개)·4(우두머리)를 칸마다 잘라 둔 그림. 그림이 없으면 null (원래 도형·이모지로 그린다)
  function artSprite(kind, id, h, tint) {
    if (!window.Art) return null;
    var hk = Math.max(8, Math.round(h));
    var key = 'a' + kind + id + hk + (tint || '');
    if (spriteCache[key]) return spriteCache[key];
    var c = Art.cell(kind, id);
    if (!c) return null;
    var w = hk * c.sw / c.sh;
    var o = offscreen(w, hk);
    o.g.drawImage(c.img, c.sx, c.sy, c.sw, c.sh, 0, 0, w, hk);
    if (kind === 'enemy') {
      // 안개 그림은 칸 둘레에 번진 빛이 있어 둥글게 흐려 잘라 낸다
      o.g.save();
      o.g.globalCompositeOperation = 'destination-in';
      var m = o.g.createRadialGradient(w / 2, hk / 2, hk * 0.3, w / 2, hk / 2, hk * 0.5);
      m.addColorStop(0, 'rgba(0,0,0,1)');
      m.addColorStop(1, 'rgba(0,0,0,0)');
      o.g.fillStyle = m;
      o.g.fillRect(0, 0, w, hk);
      o.g.restore();
    }
    if (tint) {
      o.g.save();
      o.g.globalCompositeOperation = 'source-atop';
      o.g.fillStyle = tint;
      o.g.fillRect(0, 0, w, hk);
      o.g.restore();
    }
    return keepSprite(key, o);
  }
  // 안개 몸통 그림: 부드러운 덩어리 네 개 (색·크기마다 한 번만 그린다)
  function fogSprite(color, rad) {
    var rk = Math.max(4, Math.round(rad));
    var key = 'f' + color + rk;
    if (spriteCache[key]) return spriteCache[key];
    var size = rk * 2.8;
    var o = offscreen(size, size);
    var g = o.g;
    var c = size / 2;
    var blobs = [[0, 0, 1], [-0.45, 0.15, 0.7], [0.45, 0.2, 0.72], [0.05, -0.4, 0.66]];
    // 밝은 테두리(림 라이트): 덩어리 겉모양 바깥에만 고리를 남겨 어두운 바탕과 떼어 놓는다
    var rim = offscreen(size, size);
    var rw = Math.max(3, rk * 0.16);
    var i;
    rim.g.fillStyle = rim.g.strokeStyle = shade(color, 0.8, 0.9);
    rim.g.lineWidth = rw;
    for (i = 0; i < blobs.length; i++) {
      rim.g.beginPath();
      rim.g.arc(c + blobs[i][0] * rk, c + blobs[i][1] * rk, rk * blobs[i][2] * 0.95, 0, Math.PI * 2);
      rim.g.fill();
      rim.g.stroke();
    }
    rim.g.globalCompositeOperation = 'destination-out';
    for (i = 0; i < blobs.length; i++) {
      rim.g.beginPath();
      rim.g.arc(c + blobs[i][0] * rk, c + blobs[i][1] * rk, rk * blobs[i][2] * 0.95, 0, Math.PI * 2);
      rim.g.fill();
    }
    g.drawImage(rim.canvas, 0, 0, size, size);
    for (i = 0; i < blobs.length; i++) {
      var bx = c + blobs[i][0] * rk;
      var by = c + blobs[i][1] * rk;
      var br = rk * blobs[i][2];
      var rg = g.createRadialGradient(bx - br * 0.3, by - br * 0.35, br * 0.1, bx, by, br * 1.15);
      rg.addColorStop(0, shade(color, 0.55, 0.98));
      rg.addColorStop(0.55, shade(color, 0, 0.92));
      rg.addColorStop(1, shade(color, -0.3, 0));
      g.fillStyle = rg;
      g.beginPath();
      g.arc(bx, by, br * 1.15, 0, Math.PI * 2);
      g.fill();
    }
    return keepSprite(key, o);
  }
  // 나무 잎 덩어리: 세 겹 원, 왼쪽 위가 밝다
  function canopySprite(color, rad) {
    var rk = Math.max(6, Math.round(rad));
    var key = 'c' + color + rk;
    if (spriteCache[key]) return spriteCache[key];
    var size = rk * 2.6;
    var o = offscreen(size, size);
    var g = o.g;
    var c = size / 2;
    var parts = [[-0.42, 0.18, 0.7], [0.42, 0.18, 0.7], [0, -0.2, 0.85]];
    for (var i = 0; i < parts.length; i++) {
      var bx = c + parts[i][0] * rk;
      var by = c + parts[i][1] * rk;
      var br = rk * parts[i][2];
      var rg = g.createRadialGradient(bx - br * 0.35, by - br * 0.4, br * 0.1, bx, by, br);
      rg.addColorStop(0, shade(color, 0.45));
      rg.addColorStop(0.7, shade(color, 0));
      rg.addColorStop(1, shade(color, -0.35));
      g.fillStyle = rg;
      g.beginPath();
      g.arc(bx, by, br, 0, Math.PI * 2);
      g.fill();
    }
    return keepSprite(key, o);
  }
  function blit(o, x, y) { cx.drawImage(o.canvas, x - o.w / 2, y - o.h / 2, o.w, o.h); }
  function pill(x, y, w, h, fill, stroke) {
    roundRect(x, y, w, h, h / 2);
    cx.fillStyle = fill;
    cx.fill();
    if (stroke) { cx.strokeStyle = stroke; cx.lineWidth = 1; cx.stroke(); }
  }
  function render(r) {
    var sx = W / 100;
    var lh = H / 3;
    var calm = reduced();
    var tt = calm ? 0 : r.t;
    var i;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var sk = r.shakeT > 0 && r.shakeMax > 0 ? r.shakeT / r.shakeMax : 0;
    var shake = (sk > 0 && Store.settings.shake && !calm) ? (Math.random() - 0.5) * 2 * r.shakeAmp * sk : 0;
    var shakeY = shake ? (Math.random() - 0.5) * r.shakeAmp * sk : 0;
    cx.fillStyle = '#060a14';
    cx.fillRect(0, 0, W, H);
    cx.save();
    cx.translate(shake, shakeY);
    var reg = GD.REGIONS[r.region];
    var bg = getBg(r);
    cx.drawImage(bg.canvas, 0, 0, W, H);
    // 흘러가는 안개 자락 (그림만, 시간으로 위치를 정한다)
    var wisp = fogSprite('#aab8dc', lh * 0.55);
    for (var k = 0; k < 6; k++) {
      var span = W + wisp.w * 2;
      var wx = ((hrand(k) * span - tt * (6 + hrand(k + 9) * 8)) % span + span) % span - wisp.w;
      cx.globalAlpha = 0.08 + 0.05 * hrand(k + 4);
      blit(wisp, wx, hrand(k + 3) * H);
    }
    cx.globalAlpha = 1;
    // 반딧불
    if (!calm) {
      cx.globalCompositeOperation = 'lighter';
      for (k = 0; k < 9; k++) {
        var fxp = (hrand(k + 20) * 0.7 + 0.25) * W + Math.sin(tt * 0.7 + k) * 14;
        var fyp = hrand(k + 40) * H + Math.cos(tt * 0.9 + k * 2) * 10;
        var fl = 0.35 + 0.35 * Math.sin(tt * 3 + k * 1.7);
        cx.fillStyle = 'rgba(255,240,150,' + fl.toFixed(3) + ')';
        cx.beginPath();
        cx.arc(fxp, fyp, 1.6, 0, Math.PI * 2);
        cx.fill();
        cx.fillStyle = 'rgba(255,220,120,' + (fl * 0.25).toFixed(3) + ')';
        cx.beginPath();
        cx.arc(fxp, fyp, 5, 0, Math.PI * 2);
        cx.fill();
      }
      cx.globalCompositeOperation = 'source-over';
    }
    // 울타리: 다칠수록 붉게 빛나고, 막이는 푸른 빛 벽
    var ffrac = r.fenceMax > 0 ? r.fence / r.fenceMax : 1;
    var fx0 = (FENCE_X - 2.5) * sx;
    if (ffrac < 0.5) {
      var pulse = calm ? 0.5 : 0.5 + 0.5 * Math.sin(tt * 6);
      var fr = cx.createLinearGradient(fx0, 0, fx0 + 10 * sx, 0);
      fr.addColorStop(0, 'rgba(255,60,80,' + ((0.5 - ffrac) * 0.9 * pulse).toFixed(3) + ')');
      fr.addColorStop(1, 'rgba(255,60,80,0)');
      cx.fillStyle = fr;
      cx.fillRect(fx0, 0, 10 * sx, H);
    }
    if (r.shield > 0) {
      var sa = 0.25 + 0.5 * Math.min(1, r.shield / SHIELD_MAX);
      var sg = cx.createLinearGradient(fx0 - 2 * sx, 0, fx0 + 5 * sx, 0);
      sg.addColorStop(0, 'rgba(90,200,255,0)');
      sg.addColorStop(0.5, 'rgba(120,220,255,' + sa.toFixed(3) + ')');
      sg.addColorStop(1, 'rgba(90,200,255,0)');
      cx.fillStyle = sg;
      cx.fillRect(fx0 - 2 * sx, 0, 7 * sx, H);
      cx.strokeStyle = 'rgba(200,245,255,' + (sa * 0.8).toFixed(3) + ')';
      cx.lineWidth = 1;
      for (k = 0; k < 6; k++) {
        var hy = ((k / 6) * H + tt * 30) % H;
        cx.beginPath();
        cx.moveTo(fx0 - sx, hy);
        cx.lineTo(fx0 + 4 * sx, hy + 6);
        cx.stroke();
      }
    }
    // 누른 칸 밝힘 (G-52)
    if (r.press && r.press.t > 0) {
      var zx = [0, ZONE_TREE, ZONE_BACK, ZONE_FRONT, 100];
      cx.fillStyle = 'rgba(255,255,255,' + (0.18 * r.press.t / 0.15).toFixed(3) + ')';
      cx.fillRect(zx[r.press.zone] * sx, r.press.lane * lh, (zx[r.press.zone + 1] - zx[r.press.zone]) * sx, lh);
    }
    // 나무: 박자 고리가 나무로 좁혀 들어오고, 닿는 순간이 박자다
    var phase = beatPhase(r);
    var L;
    for (L = 0; L < 3; L++) {
      var lnr = r.lanes[L];
      var seeds = lnr.seeds;
      var tx = TREE_X * sx + (lnr.jolt > 0 ? (Math.random() - 0.5) * 2 * lnr.joltAmp : 0);
      var ty = L * lh + lh * 0.46;
      var base = lh * (0.22 + Math.min(0.14, seeds * 0.008));
      var scale = 1 + (lnr.pop > 0 ? 0.28 * lnr.pop / 0.3 : 0) - (lnr.squish > 0 ? 0.18 * lnr.squish / 0.2 : 0) + (lnr.beatPop > 0 && !calm ? 0.06 * lnr.beatPop / 0.12 : 0);
      var size = base * scale;
      if (!calm || phase < 0.15 || phase > 0.85) {
        var rr = calm ? base * 1.15 : base * (1 + 1.4 * (1 - phase));
        var ra = 0.25 + 0.6 * phase;
        cx.strokeStyle = 'rgba(255,214,120,' + (ra * 0.3).toFixed(3) + ')';
        cx.lineWidth = 7;
        cx.beginPath();
        cx.arc(TREE_X * sx, ty, rr, 0, Math.PI * 2);
        cx.stroke();
        cx.strokeStyle = 'rgba(255,240,190,' + ra.toFixed(3) + ')';
        cx.lineWidth = 2;
        cx.stroke();
      }
      // 박자에 닿는 순간 나무 둘레가 환해진다
      if (!calm && (phase < 0.08 || phase > 0.96)) {
        var hg = cx.createRadialGradient(tx, ty, size * 0.5, tx, ty, size * 1.9);
        hg.addColorStop(0, 'rgba(255,230,140,0.35)');
        hg.addColorStop(1, 'rgba(255,230,140,0)');
        cx.fillStyle = hg;
        cx.beginPath();
        cx.arc(tx, ty, size * 1.9, 0, Math.PI * 2);
        cx.fill();
      }
      if (bg.trees) {
        // 사람 그림의 나무 조각을 크기만큼 키워 그린다 (열매 0알·손맛 없음이면 바탕과 꼭 겹친다)
        var tc = bg.trees[L];
        var tk = size / (lh * 0.22);
        cx.drawImage(tc.canvas, tx - tc.w * tk / 2, ty - tc.h * tk / 2, tc.w * tk, tc.h * tk);
        if (lnr.flashT > 0) {
          var tf = cx.createRadialGradient(tx, ty, 0, tx, ty, size * 1.3);
          tf.addColorStop(0, shade(lnr.flashC, 0, 0.55));
          tf.addColorStop(1, shade(lnr.flashC, 0, 0));
          cx.fillStyle = tf;
          cx.beginPath();
          cx.arc(tx, ty, size * 1.3, 0, Math.PI * 2);
          cx.fill();
        }
      } else {
        // 줄기
        var trunk = cx.createLinearGradient(tx - 4, 0, tx + 4, 0);
        trunk.addColorStop(0, '#3e2614');
        trunk.addColorStop(0.5, '#8a5a32');
        trunk.addColorStop(1, '#3e2614');
        cx.fillStyle = trunk;
        roundRect(tx - 3.5, ty, 7, lh * 0.34, 2);
        cx.fill();
        // 잎
        blit(canopySprite(lnr.flashT > 0 ? lnr.flashC : reg.color, size), tx, ty);
      }
      // 심은 열매만큼 열린 열매
      var fruits = Math.min(8, seeds);
      for (k = 0; k < fruits; k++) {
        var an = k * 2.4 + 0.6;
        var fr2 = size * (0.35 + 0.35 * hrand(k + 60));
        cx.fillStyle = '#ff9f43';
        cx.beginPath();
        cx.arc(tx + Math.cos(an) * fr2, ty + Math.sin(an) * fr2 * 0.8, Math.max(2, size * 0.1), 0, Math.PI * 2);
        cx.fill();
        cx.fillStyle = 'rgba(255,240,200,0.8)';
        cx.beginPath();
        cx.arc(tx + Math.cos(an) * fr2 - 1, ty + Math.sin(an) * fr2 * 0.8 - 1, Math.max(0.8, size * 0.035), 0, Math.PI * 2);
        cx.fill();
      }
      // 물 준 만큼(열매 빠르기) 푸른 막대
      if (lnr.pump > 0.05) {
        var pw = base * 2;
        bar(tx - pw / 2, L * lh + 5, pw, lnr.pump / PUMP_MAX, '#5ec8ff');
      }
      // 줄 번호 배지
      var bx0 = tx - size * 0.95;
      var by0 = ty - size * 0.85;
      var br0 = Math.max(8, lh * 0.085);
      cx.fillStyle = 'rgba(6,10,24,0.85)';
      cx.beginPath();
      cx.arc(bx0, by0, br0, 0, Math.PI * 2);
      cx.fill();
      cx.strokeStyle = 'rgba(255,224,138,0.8)';
      cx.lineWidth = 1.5;
      cx.stroke();
      cx.fillStyle = '#ffe08a';
      cx.font = '800 ' + Math.round(br0 * 1.2) + 'px system-ui, sans-serif';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText(String(L + 1), bx0, by0 + 0.5);
      // 열매 수 알약
      var label = T('열매 {n}', { n: seeds });
      var fs = Math.max(10, Math.round(lh * 0.11));
      cx.font = '700 ' + fs + 'px system-ui, sans-serif';
      var lw = cx.measureText(label).width + fs;
      pill(tx - lw / 2, L * lh + lh * 0.9 - fs * 0.7, lw, fs * 1.4, 'rgba(6,10,24,0.7)', 'rgba(120,230,150,0.45)');
      cx.fillStyle = '#b8f5c0';
      cx.fillText(label, tx, L * lh + lh * 0.9);
    }
    // 고른 칸 표시
    var bw = Math.min(lh * 0.62, 10 * sx);
    var cxp = slotX(cursor.slot) * sx;
    var cyp = cursor.lane * lh + lh * 0.5;
    cx.strokeStyle = '#ffe08a';
    cx.setLineDash([5, 4]);
    cx.lineDashOffset = -tt * 20;
    cx.lineWidth = 2;
    cx.beginPath();
    cx.arc(cxp, cyp, bw * 0.62, 0, Math.PI * 2);
    cx.stroke();
    cx.setLineDash([]);
    cx.lineDashOffset = 0;
    // 정원사: 역할 색의 둥근 패, 체력 막대
    for (i = 0; i < r.units.length; i++) {
      var u = r.units[i];
      var d = GA[u.id];
      var ux = slotX(u.slot) * sx + (u.jolt > 0 ? (Math.random() - 0.5) * 2 * u.joltAmp : 0);
      var uy = u.lane * lh + lh * 0.5 + (calm || u.down ? 0 : Math.sin(tt * 2.4 + i * 2) * 1.5);
      var ur = bw * 0.5;
      var front = d.role === 'front';
      var gs = artSprite('gardener', u.id, ur * 2.7, u.flash > 0 ? 'rgba(255,70,90,0.45)' : '');
      if (gs) {
        // 사람 그림: 발밑에 역할 색 고리(전열 파랑·후열 보라), 그 위에 정원사
        var gy = u.lane * lh + lh * 0.5 + ur * 0.85;
        cx.fillStyle = 'rgba(0,0,0,0.35)';
        cx.beginPath();
        cx.ellipse(ux, gy, ur * 0.95, ur * 0.3, 0, 0, Math.PI * 2);
        cx.fill();
        cx.strokeStyle = u.down ? 'rgba(150,150,170,0.7)' : (front ? 'rgba(110,170,255,0.95)' : 'rgba(200,150,255,0.95)');
        cx.lineWidth = 2.5;
        cx.stroke();
        if (i === selected) {
          cx.strokeStyle = '#ffffff';
          cx.lineWidth = 3;
          cx.beginPath();
          cx.arc(ux, uy, ur + 4 + (calm ? 0 : Math.sin(tt * 8) * 1.5), 0, Math.PI * 2);
          cx.stroke();
        }
        // 콤보 장면에서 열매를 쏜 정원사: 금빛으로 빛나며 튀어 오른다
        var ch = u.cheer > 0 ? u.cheer / 0.3 : 0;
        if (ch > 0) {
          var cg = cx.createRadialGradient(ux, uy, 0, ux, uy, ur * 2.2);
          cg.addColorStop(0, 'rgba(255,224,138,' + (0.6 * ch).toFixed(3) + ')');
          cg.addColorStop(1, 'rgba(255,224,138,0)');
          cx.fillStyle = cg;
          cx.beginPath();
          cx.arc(ux, uy, ur * 2.2, 0, Math.PI * 2);
          cx.fill();
        }
        var gk = calm ? 1 : 1 + 0.25 * ch;
        if (u.down) cx.globalAlpha = 0.45;
        cx.drawImage(gs.canvas, ux - gs.w * gk / 2, uy + ur - gs.h * gk - (calm ? 0 : ch * ur * 0.4), gs.w * gk, gs.h * gk);
        cx.globalAlpha = 1;
        if (u.down) {
          cx.font = Math.round(ur * 0.8) + 'px sans-serif';
          cx.textAlign = 'center';
          cx.textBaseline = 'middle';
          cx.fillText('💤', ux + ur * 0.6, uy - ur * 0.9);
        }
        var uf2 = u.hp / u.maxHp;
        bar(ux - ur, gy + ur * 0.35, ur * 2, uf2, hpColor(uf2));
        continue;
      }
      var ug = cx.createLinearGradient(ux, uy - ur, ux, uy + ur);
      if (u.down) { ug.addColorStop(0, '#5a6070'); ug.addColorStop(1, '#2a2e38'); }
      else if (u.flash > 0) { ug.addColorStop(0, '#ff9a9a'); ug.addColorStop(1, '#c03a4a'); }
      else if (front) { ug.addColorStop(0, '#5aa0ff'); ug.addColorStop(1, '#1f3f8a'); }
      else { ug.addColorStop(0, '#c08aff'); ug.addColorStop(1, '#4a2a8a'); }
      cx.fillStyle = 'rgba(0,0,0,0.35)';
      cx.beginPath();
      cx.ellipse(ux, u.lane * lh + lh * 0.5 + ur * 0.95, ur * 0.85, ur * 0.25, 0, 0, Math.PI * 2);
      cx.fill();
      cx.fillStyle = ug;
      cx.beginPath();
      cx.arc(ux, uy, ur * (u.cheer > 0 && !calm ? 1 + 0.25 * u.cheer / 0.3 : 1), 0, Math.PI * 2);
      cx.fill();
      if (u.cheer > 0) { cx.strokeStyle = '#ffe08a'; cx.lineWidth = 3; cx.stroke(); }
      cx.strokeStyle = front ? 'rgba(170,210,255,0.9)' : 'rgba(225,195,255,0.9)';
      cx.lineWidth = 2;
      cx.stroke();
      if (i === selected) {
        cx.strokeStyle = '#ffffff';
        cx.lineWidth = 3;
        cx.beginPath();
        cx.arc(ux, uy, ur + 4 + (calm ? 0 : Math.sin(tt * 8) * 1.5), 0, Math.PI * 2);
        cx.stroke();
      }
      cx.font = Math.round(ur * 1.15) + 'px sans-serif';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText(u.down ? '💤' : d.emoji, ux, uy + 1);
      var uf = u.hp / u.maxHp;
      bar(ux - ur, u.lane * lh + lh * 0.5 + ur + 5, ur * 2, uf, hpColor(uf));
    }
    // 열매: 꼬리를 끌며 빛난다
    cx.globalCompositeOperation = 'lighter';
    var sr = Math.max(3, lh * 0.045);
    for (i = 0; i < r.shots.length; i++) {
      var p = r.shots[i];
      var px = p.x * sx;
      var py = p.lane * lh + lh * 0.5;
      var tree = p.src === 'tree';
      var tl = cx.createLinearGradient(px - sr * 5, 0, px, 0);
      tl.addColorStop(0, tree ? 'rgba(255,140,40,0)' : 'rgba(120,200,255,0)');
      tl.addColorStop(1, tree ? 'rgba(255,160,60,0.55)' : 'rgba(140,210,255,0.55)');
      cx.fillStyle = tl;
      cx.fillRect(px - sr * 5, py - sr * 0.6, sr * 5, sr * 1.2);
      cx.fillStyle = tree ? '#ff9f43' : '#6fc8ff';
      cx.beginPath();
      cx.arc(px, py, sr, 0, Math.PI * 2);
      cx.fill();
      cx.fillStyle = 'rgba(255,255,240,0.9)';
      cx.beginPath();
      cx.arc(px, py, sr * 0.45, 0, Math.PI * 2);
      cx.fill();
    }
    cx.globalCompositeOperation = 'source-over';
    // 안개: 부드러운 덩어리 몸통 + 눈 + 모양 기호(색을 못 봐도 구분)
    for (i = 0; i < r.enemies.length; i++) {
      var e = r.enemies[i];
      var def = e.boss ? BO[e.id] : EN[e.id];
      var rad = lh * (e.boss ? 0.36 : 0.2) * (1 + (e.pop > 0 ? 0.22 * e.pop / 0.16 : 0));
      var ex = e.x * sx + (e.jolt > 0 ? (Math.random() - 0.5) * 2 * e.joltAmp : 0);
      var bob = calm ? 0 : Math.sin(tt * 3 + i * 1.3) * rad * 0.06;
      var ey = e.lane * lh + lh * 0.5 - (e.fly ? lh * 0.14 : 0) + bob;
      cx.fillStyle = 'rgba(0,0,0,' + (e.fly ? 0.22 : 0.35) + ')';
      cx.beginPath();
      cx.ellipse(ex, e.lane * lh + lh * 0.5 + rad * 0.9, rad * 0.85, rad * 0.22, 0, 0, Math.PI * 2);
      cx.fill();
      if (e.boss) {
        var ba = calm ? 0.35 : 0.25 + 0.15 * Math.sin(tt * 4);
        var bgr = cx.createRadialGradient(ex, ey, rad * 0.6, ex, ey, rad * 1.7);
        bgr.addColorStop(0, 'rgba(255,60,90,' + ba.toFixed(3) + ')');
        bgr.addColorStop(1, 'rgba(255,60,90,0)');
        cx.fillStyle = bgr;
        cx.beginPath();
        cx.arc(ex, ey, rad * 1.7, 0, Math.PI * 2);
        cx.fill();
      }
      var es = artSprite(e.boss ? 'boss' : 'enemy', e.id, rad * (e.boss ? 2.7 : 2.9), '');
      if (es) blit(es, ex, ey);
      else blit(fogSprite(def.color, rad), ex, ey);
      if (e.hitFlash > 0) {
        cx.globalAlpha = Math.min(1, e.hitFlash / 0.1) * 0.75;
        cx.fillStyle = '#ffffff';
        cx.beginPath();
        cx.arc(ex, ey, rad * 1.05, 0, Math.PI * 2);
        cx.fill();
        cx.globalAlpha = 1;
      }
      if (e.shieldHits > 0) {
        cx.strokeStyle = 'rgba(168,224,255,0.35)';
        cx.lineWidth = 6;
        cx.beginPath();
        cx.arc(ex, ey, rad + 4, 0, Math.PI * 2);
        cx.stroke();
        cx.strokeStyle = '#c8f0ff';
        cx.lineWidth = 2;
        cx.stroke();
      }
      if (e.slowT > 0) {
        cx.strokeStyle = '#7fc8ff';
        cx.lineWidth = 2;
        cx.setLineDash([3, 3]);
        cx.beginPath();
        cx.arc(ex, ey, rad + 8, 0, Math.PI * 2);
        cx.stroke();
        cx.setLineDash([]);
      }
      if (es) {
        // 사람 그림에는 눈이 있다. 모양 기호는 오른쪽 아래 작은 배지로 남긴다 (색을 못 봐도 구분, G-24)
        var sbr = Math.max(6, rad * 0.32);
        var sbx = ex + rad * 0.72;
        var sby = ey + rad * 0.62;
        cx.fillStyle = 'rgba(6,10,24,0.75)';
        cx.beginPath();
        cx.arc(sbx, sby, sbr, 0, Math.PI * 2);
        cx.fill();
        cx.fillStyle = '#e8eeff';
        cx.font = '800 ' + Math.round(sbr * 1.2) + 'px system-ui, sans-serif';
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        cx.fillText(def.sym, sbx, sby + 0.5);
      } else {
        // 눈
        var eyeR = Math.max(1.6, rad * 0.13);
        var look = -eyeR * 0.35;
        for (var s2 = -1; s2 <= 1; s2 += 2) {
          cx.fillStyle = '#ffffff';
          cx.beginPath();
          cx.ellipse(ex + s2 * rad * 0.3, ey - rad * 0.28, eyeR, eyeR * 1.25, 0, 0, Math.PI * 2);
          cx.fill();
          cx.fillStyle = e.boss ? '#c0102a' : '#1a1e2e';
          cx.beginPath();
          cx.arc(ex + s2 * rad * 0.3 + look, ey - rad * 0.24, eyeR * 0.55, 0, Math.PI * 2);
          cx.fill();
        }
        cx.fillStyle = 'rgba(16,20,34,0.85)';
        cx.font = '800 ' + Math.round(rad * 0.85) + 'px system-ui, sans-serif';
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        cx.fillText(def.sym, ex, ey + rad * 0.3);
      }
      var ef = e.hp / e.maxHp;
      bar(ex - rad, ey - rad - 9, rad * 2, ef, e.boss ? '#ff4a6a' : hpColor(ef));
    }
    // 콤보 장면: 돌아가는 정령 — 금빛으로 물들어 오른쪽 위 숲으로 날아가며 작아지고 흐려진다
    for (i = 0; i < r.homes.length; i++) {
      var hm = r.homes[i];
      var hk2 = 1 - hm.t / HOME_TIME;
      var hdef = EN[hm.id];
      if (!hdef) continue;
      var hrad = lh * 0.2 * (1 + 0.3 * Math.sin(Math.min(1, hk2 * 3) * Math.PI) - 0.45 * hk2);
      var hx = (hm.x + (calm ? 0 : hk2 * hk2 * 40)) * sx;
      var hy = hm.lane * lh + lh * 0.5 - (hm.fly ? lh * 0.14 : 0) - (calm ? 0 : hk2 * lh * 0.6);
      cx.globalAlpha = Math.max(0, 1 - hk2 * hk2);
      var hg2 = cx.createRadialGradient(hx, hy, 0, hx, hy, hrad * 2);
      hg2.addColorStop(0, 'rgba(255,236,160,0.7)');
      hg2.addColorStop(1, 'rgba(255,236,160,0)');
      cx.fillStyle = hg2;
      cx.beginPath();
      cx.arc(hx, hy, hrad * 2, 0, Math.PI * 2);
      cx.fill();
      var hs = artSprite('enemy', hm.id, hrad * 2.9, 'rgba(255,230,140,0.45)');
      blit(hs || fogSprite('#ffe9a8', hrad), hx, hy);
      cx.globalAlpha = 1;
    }
    // 콤보 장면: 날아가는 선물 열매 — 정원사에게서 정령까지 포물선, 큰 금빛 열매와 빛 꼬리
    cx.globalCompositeOperation = 'lighter';
    var gr = Math.max(6, lh * 0.085);
    for (i = 0; i < r.gifts.length; i++) {
      var gf = r.gifts[i];
      if (gf.delay > 0) continue;
      var gk2 = Math.min(1, gf.t / GIFT_TIME);
      var gx0 = gf.fx * sx;
      var gy0 = gf.flane * lh + lh * 0.45;
      var gx1 = gf.tx * sx;
      var gy1 = gf.tlane * lh + lh * 0.5;
      for (k = 5; k >= 0; k--) {
        var gq = Math.max(0, gk2 - k * 0.05);
        var gpx = gx0 + (gx1 - gx0) * gq;
        var gpy = gy0 + (gy1 - gy0) * gq - Math.sin(gq * Math.PI) * lh * 0.45;
        var grr = gr * (k === 0 ? 1 : 0.85 - k * 0.12);
        cx.fillStyle = k === 0 ? '#ffb347' : 'rgba(255,200,90,' + (0.5 - k * 0.07).toFixed(3) + ')';
        cx.beginPath();
        cx.arc(gpx, gpy, Math.max(1, grr), 0, Math.PI * 2);
        cx.fill();
        if (k === 0) {
          var ga = cx.createRadialGradient(gpx, gpy, 0, gpx, gpy, gr * 2.6);
          ga.addColorStop(0, 'rgba(255,240,170,0.8)');
          ga.addColorStop(1, 'rgba(255,240,170,0)');
          cx.fillStyle = ga;
          cx.beginPath();
          cx.arc(gpx, gpy, gr * 2.6, 0, Math.PI * 2);
          cx.fill();
          cx.fillStyle = 'rgba(255,255,240,0.95)';
          cx.beginPath();
          cx.arc(gpx - gr * 0.3, gpy - gr * 0.3, gr * 0.35, 0, Math.PI * 2);
          cx.fill();
        }
      }
    }
    cx.globalCompositeOperation = 'source-over';
    // 조각·끌려 가는 열매·퍼지는 고리 (겹치면 더 밝게)
    cx.globalCompositeOperation = 'lighter';
    for (i = 0; i < r.parts.length; i++) {
      var q = r.parts[i];
      var qa = Math.max(0, Math.min(1, q.life / q.max));
      cx.globalAlpha = q.kind === 'suck' ? 1 : qa;
      if (q.kind === 'ring') {
        cx.strokeStyle = q.color;
        cx.lineWidth = 3;
        cx.beginPath();
        cx.arc(q.x * sx, q.y * lh, 6 + (1 - qa) * lh * 0.35, 0, Math.PI * 2);
        cx.stroke();
      } else {
        cx.fillStyle = q.color;
        cx.beginPath();
        cx.arc(q.x * sx, q.y * lh, q.size * (q.kind === 'suck' ? 0.6 + qa * 0.6 : qa + 0.3), 0, Math.PI * 2);
        cx.fill();
      }
    }
    cx.globalAlpha = 1;
    cx.globalCompositeOperation = 'source-over';
    // 가장자리 어둠
    cx.fillStyle = bg.vignette;
    cx.fillRect(0, 0, W, H);
    // 떠오르는 글자: 처음에 커졌다 줄며 떠오르고 흐려진다. 큰 값은 더 크게
    var fbase = Math.max(14, lh * 0.18);
    cx.textAlign = 'center';
    cx.lineJoin = 'round';
    for (i = 0; i < r.floats.length; i++) {
      var f = r.floats[i];
      var age = 0.8 - f.life;
      var rise = calm ? 0 : age * lh * 0.4;
      var punch = calm ? 1 : (age < 0.1 ? 1 + 0.5 * (1 - age / 0.1) : 1);
      cx.font = '900 ' + Math.round(fbase * (f.size || 1) * punch) + 'px system-ui, sans-serif';
      cx.globalAlpha = Math.max(0, Math.min(1, f.life / 0.4));
      cx.lineWidth = 4;
      cx.strokeStyle = 'rgba(8,6,20,0.8)';
      cx.strokeText(f.text, f.x * sx, f.lane * lh + lh * 0.25 - rise);
      cx.fillStyle = f.color;
      cx.fillText(f.text, f.x * sx, f.lane * lh + lh * 0.25 - rise);
    }
    cx.globalAlpha = 1;
    // 화면 번쩍
    if (r.flashT > 0 && r.flashMax > 0) {
      cx.globalAlpha = 0.35 * r.flashT / r.flashMax;
      cx.fillStyle = r.flashC;
      cx.fillRect(-10, -10, W + 20, H + 20);
      cx.globalAlpha = 1;
    }
    // 이어치기: 오른쪽 위 알약 + 채워지는 막대
    if (r.combo >= 2) {
      var big = r.combo >= r.mods.comboCap;
      var cs = Math.round(Math.max(13, lh * 0.14) * (1 + Math.min(0.4, r.combo / 30)));
      var ctext = T('{n} 콤보  ×{m}', { n: r.combo, m: comboMul(r).toFixed(2) });
      cx.font = '900 ' + cs + 'px system-ui, sans-serif';
      var cw2 = cx.measureText(ctext).width + cs * 1.4;
      var cx0 = W - cw2 - 6;
      pill(cx0, 6, cw2, cs * 1.7, big ? 'rgba(90,40,0,0.85)' : 'rgba(8,10,28,0.78)', big ? '#ffd34d' : 'rgba(255,224,138,0.6)');
      cx.fillStyle = 'rgba(255,211,77,0.8)';
      roundRect(cx0 + cs * 0.5, 6 + cs * 1.7 - 4, (cw2 - cs) * Math.min(1, r.combo / r.mods.comboCap), 2.5, 1);
      cx.fill();
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillStyle = big ? '#ffd34d' : '#fff0c0';
      cx.fillText(ctext, cx0 + cw2 / 2, 6 + cs * 0.82);
    }
    // 함성
    if (r.t < r.rallyUntil) {
      cx.strokeStyle = 'rgba(255,224,138,0.25)';
      cx.lineWidth = 10;
      cx.strokeRect(4, 4, W - 8, H - 8);
      cx.strokeStyle = 'rgba(255,224,138,0.7)';
      cx.lineWidth = 3;
      cx.strokeRect(3, 3, W - 6, H - 6);
    }
    // 알림 띠: 가운데가 짙은 띠와 금빛 줄
    if (r.bannerT > 0) {
      cx.globalAlpha = Math.min(1, r.bannerT);
      var by1 = H * 0.4;
      var bh1 = H * 0.2;
      var rib = cx.createLinearGradient(0, 0, W, 0);
      rib.addColorStop(0, 'rgba(20,10,50,0)');
      rib.addColorStop(0.2, 'rgba(20,10,50,0.88)');
      rib.addColorStop(0.8, 'rgba(20,10,50,0.88)');
      rib.addColorStop(1, 'rgba(20,10,50,0)');
      cx.fillStyle = rib;
      cx.fillRect(0, by1, W, bh1);
      var gl = cx.createLinearGradient(0, 0, W, 0);
      gl.addColorStop(0, 'rgba(255,211,77,0)');
      gl.addColorStop(0.5, 'rgba(255,211,77,0.95)');
      gl.addColorStop(1, 'rgba(255,211,77,0)');
      cx.fillStyle = gl;
      cx.fillRect(0, by1, W, 2);
      cx.fillRect(0, by1 + bh1 - 2, W, 2);
      var bs = Math.round(Math.max(18, lh * 0.2));
      cx.font = '900 ' + bs + 'px system-ui, sans-serif';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.lineWidth = 5;
      cx.strokeStyle = 'rgba(10,4,30,0.9)';
      cx.strokeText(r.banner, W / 2, H * 0.5);
      cx.fillStyle = '#ffe9a8';
      cx.fillText(r.banner, W / 2, H * 0.5);
      cx.globalAlpha = 1;
    }
    cx.restore();
  }

  // ---------- 고리 ----------
  function frame(ts) {
    loopId = 0;
    if (!run || state !== 'running') return;
    var dt = lastTs ? (ts - lastTs) / 1000 : 0;
    lastTs = ts;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;
    var total = dt * (Store.settings.speed || 1);
    // 정령이 돌아가는 순간 잠깐 느리게 (fxHome, 움직임 줄이기면 걸리지 않음)
    if (run.slowMo > 0) { run.slowMo -= dt; total *= SLOWMO_RATE; }
    // 빠른 안개가 정원사를 건너뛰지 않게 잘게 나눠 움직인다
    var steps = Math.max(1, Math.ceil(total / 0.03));
    for (var st = 0; st < steps && state === 'running'; st++) update(run, total / steps);
    if (state === 'running' || state === 'picking') {
      render(run);
      hudTimer += dt;
      if (hudTimer > 0.15) { hudTimer = 0; emit('onHud'); }
    }
    if (state === 'running') loopId = requestAnimationFrame(frame);
  }
  function startLoop() {
    if (loopId) return;
    lastTs = 0;
    loopId = requestAnimationFrame(frame);
  }
  function stopLoop() {
    if (loopId) cancelAnimationFrame(loopId);
    loopId = 0;
  }

  // ---------- 밖에서 부르는 것 ----------
  var Game = {
    init: function (cv, ls) {
      canvas = cv;
      cx = cv.getContext('2d');
      listeners = ls || {};
      cv.addEventListener('pointerdown', onPointer);
      window.addEventListener('resize', resize);
      window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });
      // 안내 상자·미리보기·기술 열이 바뀌어 판 상자 크기가 달라질 때도 맞춘다 (캔버스는 절대 위치라 되먹임 없음)
      if (window.ResizeObserver && cv.parentElement) {
        try { new ResizeObserver(function () { resize(); }).observe(cv.parentElement); } catch (e) { /* 없어도 resize 이벤트로 맞춘다 */ }
      }
    },
    begin: function (regionIdx, squad, opts) {
      stopLoop();
      probeMode = false;
      run = newRun(regionIdx, squad, opts);
      // 광고 자리의 '한 판 n번' 횟수를 새 판마다 다시 센다 (H-26, ads.js). 시험 훅 reset 은 여기를 거치지 않는다
      if (window.Ads && window.Ads.newRun) window.Ads.newRun({ daily: !!run.daily, tutorial: !!(opts && opts.tutorial) });
      hold = !!(opts && opts.tutorial);
      selected = -1;
      cursor = { lane: 1, slot: 1 };
      resize();
      prepareNext(run);
      saveSnapshot(run);
      startWave(run);
      state = 'running';
      startLoop();
    },
    resumeSaved: function (s) {
      if (!validSnapshot(s)) { Store.clearRun(); return false; }
      stopLoop();
      probeMode = false;
      var r = newRun(s.region, s.squad, {
        diff: typeof s.diff === 'number' ? s.diff : 0,
        daily: typeof s.daily === 'string' ? s.daily : '',
        seeded: !!s.seeded, seed: s.rngState | 0
      });
      r.nextWave = restoreNext(s);
      r.upgrades = Array.isArray(s.upgrades) ? s.upgrades.filter(function (id) { return !!UP[id]; }) : [];
      r.relics = Array.isArray(s.relics) ? s.relics.filter(function (id) { return !!RE[id]; }) : [];
      r.mods = computeMods(r);
      r.fenceMax = 100 + r.mods.fenceMax;
      r.wave = s.wave;
      r.t = +s.t || 0;
      r.fence = Math.max(1, Math.min(r.fenceMax, +s.fence || r.fenceMax));
      r.shield = +s.shield || 0;
      r.pouch = Math.max(0, +s.pouch || 0);
      if (Array.isArray(s.seeds)) for (var i = 0; i < 3; i++) r.lanes[i].seeds = Math.max(0, +s.seeds[i] || 0);
      if (Array.isArray(s.units) && s.units.length) {
        r.units = [];
        s.units.forEach(function (x) {
          if (!GA[x.id] || r.units.length >= 3) return;
          var lane = Math.max(0, Math.min(2, x.lane | 0));
          var slot = x.slot === 1 ? 1 : 0;
          if (unitIndexAt(r, lane, slot) >= 0) return;
          r.units.push(makeUnit(r, GA[x.id], lane, slot, Math.max(0.1, Math.min(1, +x.frac || 1))));
        });
        if (!r.units.length) placeSquad(r);
      }
      r.kills = s.kills | 0;
      r.bossKills = s.bossKills | 0;
      r.planted = s.planted | 0;
      r.skillUses = s.skillUses | 0;
      r.fenceDamaged = !!s.fenceDamaged;
      run = r;
      hold = false;
      selected = -1;
      resize();
      startWave(run);
      state = 'running';
      startLoop();
      return true;
    },
    pause: function () { if (state === 'running') { state = 'paused'; stopLoop(); Sound.musicStop(); return true; } return false; },
    resume: function () { if (state === 'paused') { state = 'running'; resize(); startLoop(); } }, // 멈춘 동안 글자 크기를 바꿨을 수 있다
    quit: function () { if (run && state !== 'ended' && state !== 'idle') endRun(false); },
    leave: function () { stopLoop(); Sound.musicStop(); state = 'idle'; run = null; hold = false; },
    setHold: function (on) { hold = !!on; },
    // 첫 판 안내가 짚을 판 위 자리 (판 폭·높이의 %). tree = 2줄 나무, unit = 옮길 정원사 → 고른 뒤에는 옮길 빈 칸
    tutPoint: function (kind) {
      if (!run) return null;
      if (kind === 'tree') return { x: TREE_X, y: 50 };
      if (kind !== 'unit' || !run.units.length) return null;
      var u = run.units[selected >= 0 ? selected : 0];
      if (selected < 0) return { x: slotX(u.slot), y: (u.lane + 0.5) / 3 * 100 };
      for (var L = 0; L < 3; L++) {
        for (var s = 0; s < 2; s++) if (unitIndexAt(run, L, s) < 0) return { x: slotX(s), y: (L + 0.5) / 3 * 100 };
      }
      return { x: slotX(u.slot), y: (u.lane + 0.5) / 3 * 100 };
    },
    // 튜토리얼이 판 위에서 짚을 네모 구역 (판 폭·높이의 %). slots = 정원사 두 칸(후열·전열), combo = 오른쪽 위 콤보 알약 자리
    tutArea: function (kind) {
      if (kind === 'slots') return { x0: ZONE_TREE, y0: 0, x1: ZONE_FRONT, y1: 100 };
      if (kind === 'combo') return { x0: 66, y0: 0, x1: 100, y1: 20 };
      return null;
    },
    state: function () { return state; },
    plant: plant,
    water: water,
    useSkill: useSkill,
    choose: choose,
    revive: revive,
    giveUp: giveUp,
    addPouch: addPouch,
    handleKey: handleKey,
    resize: resize,
    checkAchievements: checkAchievements,
    hud: function () {
      if (!run) return null;
      return {
        fence: Math.ceil(run.fence), fenceMax: Math.round(run.fenceMax), shield: Math.round(run.shield), wave: run.wave, waves: WAVES,
        pouch: run.pouch, region: GD.REGIONS[run.region].name, enemies: run.enemies.length,
        combo: run.combo, comboMul: comboMul(run),
        diff: diffOf(run).name, daily: run.daily,
        units: run.units.map(function (u) {
          var d = GA[u.id];
          return { id: d.id, name: d.name, emoji: d.emoji, skill: d.skill.name, cd: u.cd, cdMax: d.skill.cd * run.mods.skillCd, down: u.down, hp: u.maxHp > 0 ? u.hp / u.maxHp : 0, role: d.role };
        })
      };
    },
    pickInfo: function (id) { return pickKind === 'relic' ? RE[id] : UP[id]; },
    // 고르기 창에서는 다음 물결, 싸우는 동안에는 지금 물결의 안개 종류
    wavePreview: function () {
      if (!run) return null;
      if (state === 'picking' && run.nextWave) {
        return { wave: run.nextWave.wave, upcoming: true, list: summarizeQueue(run.nextWave.queue) };
      }
      return { wave: run.wave, upcoming: false, list: run.waveList.slice() };
    },
    summarizeQueue: summarizeQueue,
    snapshotValid: validSnapshot
  };
  window.Game = Game;

  // ---------- 자동 균형 시험 훅 (기획지시.md 14장) ----------
  // 처음 하는 사람의 첫 판: 첫 지역·보통·처음 정원사 셋, 개량·해금·저장 기록 없음, 첫 판 안내 없음.
  // 행동은 화면 버튼·판 누르기가 부르는 것과 같은 함수(water·plant·useSkill·tapSlot·choose)를 부른다.
  // 그리기·소리·화면 알림은 하지 않고, 시간은 advance 로만 흐른다.
  window.__test = {
    reset: function (seed) {
      stopLoop();
      probeMode = true;
      Store.fresh();
      run = newRun(0, Store.meta.unlocked.slice(0, 3), { diff: 0 });
      hold = false;
      selected = -1;
      cursor = { lane: 1, slot: 1 };
      pickIds = [];
      lastWin = false;
      prepareNext(run);
      saveSnapshot(run);
      startWave(run);
      state = 'running';
      return seed;
    },
    // 지금 누를 수 있는 것: 나무 3(물 주기), 열매가 있으면 심기 버튼 3, 준비된 기술 버튼, 판의 칸 6. 고르기 창이면 그 선택지
    actions: function () {
      if (!run || !probeMode) return [];
      var i;
      if (state === 'picking') { var p = []; for (i = 0; i < pickIds.length; i++) p.push('pick:' + i); return p; }
      if (state !== 'running') return [];
      var out = ['water:0', 'water:1', 'water:2'];
      if (run.pouch > 0) out.push('plant:0', 'plant:1', 'plant:2');
      for (i = 0; i < run.units.length; i++) if (!run.units[i].down && run.units[i].cd <= 0) out.push('skill:' + i);
      for (var L = 0; L < 3; L++) { out.push('slot:' + L + ':0'); out.push('slot:' + L + ':1'); }
      return out;
    },
    act: function (a) {
      if (!run || !probeMode || typeof a !== 'string') return false;
      var p = a.split(':');
      var x = parseInt(p[1], 10);
      if (p[0] === 'pick') return choose(x);
      if (p[0] === 'water') return water(x);
      if (p[0] === 'plant') return plant(x);
      if (p[0] === 'skill') return useSkill(x);
      if (p[0] === 'slot') { tapSlot(x, parseInt(p[2], 10) === 1 ? 1 : 0); return true; }
      return false;
    },
    // 화면과 같은 1/60초 간격으로 규칙만 계산한다
    advance: function (ms) {
      if (!run || !probeMode) return;
      var n = Math.max(0, Math.round((+ms || 0) / 1000 / PROBE_DT));
      for (var i = 0; i < n && state === 'running'; i++) update(run, PROBE_DT);
    },
    state: function () {
      var over = state === 'ended';
      return {
        over: over, won: over && lastWin,
        stage: run ? Math.max(1, Math.min(WAVES, run.wave)) : 1, stageMax: WAVES,
        time: run ? run.t : 0
      };
    }
  };
})();
