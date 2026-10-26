// Ember Watch — 화면·저장·업적·HUD (규칙은 game.js, 그리기는 render.js)
(function () {
  'use strict';
  const EW = window.EW = window.EW || {};
  const D = window.EW_DATA;
  const KEY = 'emberwatch_save_v1';
  const $ = function (id) { return document.getElementById(id); };

  // ---------------- 저장 ----------------
  function prefersReduce() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function defSave() {
    return {
      v: 1,
      settings: { sound: true, vol: 2, vib: true, shake: true, reduce: prefersReduce(), nums: true, hints: true },
      meta: {
        embers: 0, lanterns: ['old'], relics: [], regionsWon: [], prep: {},
        seen: { e: {}, w: {}, c: {}, r: {} }, ach: {}, journal: {},
        stats: { runs: 0, wins: 0, kills: 0, nights: 0, fedFire: 0, fedLamp: 0, bossKills: 0, embersTotal: 0, bestScore: 0, playTime: 0, fireOut: 0, fell: 0, bestNight: [0, 0, 0, 0, 0] }
      },
      run: null, tutDone: false, lastRegion: 0, lastLantern: 'old',
      // 오늘의 도전: 하루 한 번. date 는 마지막으로 시작한 날, done 은 그날 판을 끝냈는지
      daily: { date: '', done: false, score: 0, dawns: 0, won: false, count: 0, best: 0 }
    };
  }
  function merge(base, o) {
    if (!o || typeof o !== 'object') return base;
    Object.keys(base).forEach(function (k) {
      if (!(k in o)) return;
      const b = base[k], v = o[k];
      if (b && typeof b === 'object' && !Array.isArray(b) && v && typeof v === 'object' && !Array.isArray(v)) base[k] = merge(b, v);
      else if (Array.isArray(b) ? Array.isArray(v) : (v === null || typeof v === typeof b || b === null)) base[k] = v;
    });
    return base;
  }
  function load() {
    try {
      const s = window.localStorage.getItem(KEY);
      if (s) return merge(defSave(), JSON.parse(s));
    } catch (e) { /* 저장소가 없어도 돈다 */ }
    return defSave();
  }
  function save() {
    if (EW.testMode) return;
    try { window.localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 저장소가 없어도 돈다 */ }
  }
  let S = load();
  EW.S = S;
  EW.save = save;

  // ---------------- 화면 전환 (모든 전환이 이 함수를 거친다) ----------------
  let lock = false;
  let current = 'scr-title';
  const G = { paused: false, rotPaused: false, returnTo: 'scr-title', quitArmed: false, focusOffer: 0, codexTab: 'e', campTab: 'lantern', recTab: 'ach', lastFire: 0 };
  EW.G = G;

  function transition(fn) {
    if (lock) return false;
    const ms = S.settings.reduce ? 0 : 220;
    lock = ms > 0;
    fn();
    if (lock) setTimeout(function () { lock = false; }, ms);
    return true;
  }
  function show(id) {
    return transition(function () {
      const el = $(id);
      if (!el) return;
      if (el.classList.contains('overlay')) { el.classList.add('open'); return; }
      document.querySelectorAll('.screen.active').forEach(function (s) { s.classList.remove('active'); });
      document.querySelectorAll('.overlay.open').forEach(function (s) { s.classList.remove('open'); });
      el.classList.add('active');
      current = id;
      if (id === 'scr-game') setTimeout(EW.resizeCanvas, 0);
    });
  }
  function hide(id) {
    return transition(function () { const el = $(id); if (el) el.classList.remove('open'); });
  }
  EW.show = show;
  EW.currentScreen = function () { return current; };

  function on(id, fn, important) {
    const el = $(id);
    if (!el) return;
    el.addEventListener('click', function (ev) {
      if (lock) { ev.preventDefault(); return; }
      EW.audioInit();
      EW.sfx('click');
      if (important) EW.vibrate(15);
      fn(ev);
    });
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmtTime(sec) { sec = Math.max(0, Math.floor(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
  const NIGHT_WORD = ['첫째', '둘째', '셋째', '넷째', '다섯째', '여섯째', '일곱째', '여덟째', '아홉째', '열째'];
  function nightName(n) { return (NIGHT_WORD[n - 1] || n + '번째') + ' 밤'; }

  // ---------------- 시작 화면 ----------------
  function refreshTitle() {
    $('btn-continue').classList.toggle('hidden', !S.run);
    const st = S.meta.stats;
    $('title-meta').textContent = '불씨 ' + S.meta.embers + ' · 최고 점수 ' + st.bestScore + ' · 이긴 판 ' + st.wins + '/' + st.runs;
    refreshDaily();
  }

  // ---------------- 오늘의 도전 ----------------
  // 이 기기의 날짜(YYYY-MM-DD)로 씨앗·지역·등불이 정해진다. 야영 준비·열린 유물 없이 누구나 같은 조건이고, 하루 한 번만 시작한다
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function refreshDaily() {
    const today = todayStr();
    const dy = S.daily;
    const used = dy.date === today;
    const setup = EW.dailySetup(today);
    const b = $('btn-daily');
    b.disabled = used;
    let sub;
    if (!used) sub = D.REGIONS[setup.region].short + ' · ' + D.LANTERN_MAP[setup.lantern].name;
    else if (dy.done) sub = (dy.won ? '이김' : '밤 ' + dy.dawns + '/10') + ' · 점수 ' + dy.score + ' · 내일 다시';
    else if (S.run && S.run.daily === today) sub = '하는 중 · 이어하기로 계속';
    else sub = '오늘 시작함 · 내일 다시';
    $('daily-sub').textContent = sub;
    b.setAttribute('aria-label', '오늘의 도전 ' + today + ' — ' + sub);
  }
  function startDaily() {
    const today = todayStr();
    if (S.daily.date === today) { refreshDaily(); return; }
    const setup = EW.dailySetup(today);
    S.daily.date = today; S.daily.done = false; S.daily.score = 0; S.daily.dawns = 0; S.daily.won = false;
    S.daily.count++;
    EW.newRun({ region: setup.region, lantern: setup.lantern, prep: null, relicPool: null, daily: today, seed: setup.seed });
    unlockJournal(setup.region, 0);
    S.run = EW.snapshot();
    save();
    beginGame();
  }

  // ---------------- 출발 준비 ----------------
  function regionUnlocked(i) { return i === 0 || S.meta.regionsWon.indexOf(i - 1) >= 0; }
  let prepRegion = 0, prepLantern = 'old';
  function refreshPrep() {
    $('prep-embers').textContent = '불씨 ' + S.meta.embers;
    $('region-list').innerHTML = D.REGIONS.map(function (r, i) {
      const ok = regionUnlocked(i);
      const best = S.meta.stats.bestNight[i] || 0;
      return '<button class="item' + (prepRegion === i ? ' sel' : '') + (ok ? '' : ' locked') + '" data-region="' + i + '" aria-pressed="' + (prepRegion === i) + '"' + (ok ? '' : ' disabled') + '>' +
        '<span class="name">' + esc(r.name) + (S.meta.regionsWon.indexOf(i) >= 0 ? ' ☀' : '') + '</span>' +
        '<span class="desc">' + (ok ? esc(r.desc) + '<br>규칙: ' + esc(r.rule) : '앞 지역에서 열째 밤을 버티면 열린다') + '</span>' +
        '<span class="tag">' + (ok ? '가장 멀리 버틴 밤 ' + best + '/10' : '잠김') + '</span></button>';
    }).join('');
    $('lantern-list').innerHTML = D.LANTERNS.map(function (l) {
      const own = S.meta.lanterns.indexOf(l.id) >= 0;
      return '<button class="item' + (prepLantern === l.id ? ' sel' : '') + (own ? '' : ' locked') + '" data-lantern="' + l.id + '" aria-pressed="' + (prepLantern === l.id) + '"' + (own ? '' : ' disabled') + '>' +
        '<span class="name">' + esc(l.name) + '</span><span class="desc">' + esc(l.desc) + '</span>' +
        '<span class="tag">' + (own ? '가짐' : '야영지에서 불씨 ' + l.cost) + '</span></button>';
    }).join('');
  }
  function openPrep() {
    prepRegion = regionUnlocked(S.lastRegion) ? S.lastRegion : 0;
    prepLantern = S.meta.lanterns.indexOf(S.lastLantern) >= 0 ? S.lastLantern : 'old';
    refreshPrep();
    show('scr-prep');
  }

  // ---------------- 판 시작·이어하기 ----------------
  function beginGame() {
    G.paused = false; G.quitArmed = false;
    $('btn-quit').textContent = '그만두기';
    lastSlotSig = '';
    show('scr-game');
    EW.sfx('start');
    tutStep = (!S.tutDone && S.settings.hints) ? 0 : -1;
    updateHint();
  }
  function startRun() {
    S.lastRegion = prepRegion; S.lastLantern = prepLantern;
    EW.newRun({ region: prepRegion, lantern: prepLantern, prep: Object.assign({}, S.meta.prep), relicPool: S.meta.relics.slice() });
    unlockJournal(prepRegion, 0);
    S.run = EW.snapshot();
    save();
    beginGame();
  }
  function continueRun() {
    if (!S.run) return;
    try { EW.loadRun(S.run); } catch (e) { S.run = null; save(); refreshTitle(); return; }
    beginGame();
  }

  // ---------------- HUD ----------------
  let lastSlotSig = '';
  // 장작 그림: 색 + 무늬(.pat-*) + 글자 한 자. 장작 칸·방법·도감이 같이 쓴다
  function woodChip(w, cls) {
    return '<span class="wood-chip ' + (cls || '') + '"><i class="pat-' + w.pat + '" style="background-color:var(' + w.col + ')"></i><b>' + esc(w.mark) + '</b></span>';
  }
  function renderSlots(R) {
    const sig = R.wood.join(',') + '|' + R.sel + '|' + R.st.carry;
    if (sig === lastSlotSig) return;
    const grew = lastSlotSig && R.wood.length > lastSlotSig.split('|')[0].split(',').filter(Boolean).length;
    lastSlotSig = sig;
    let html = '';
    for (let i = 0; i < R.st.carry; i++) {
      const w = R.wood[i] ? D.WOOD_MAP[R.wood[i]] : null;
      if (w) html += '<button class="wood-slot' + (i === R.sel ? ' sel' : '') + (grew && i === R.wood.length - 1 ? ' gain' : '') + '" data-slot="' + i + '" aria-pressed="' + (i === R.sel) + '" aria-label="' + esc(w.name) + ' (모닥불 ' + w.fire + ' · 등불 ' + w.lamp + ')' + (i === R.sel ? ' · 먼저 씀' : '') + '">' + woodChip(w) + '</button>';
      else html += '<button class="wood-slot empty" disabled aria-label="빈 칸"></button>';
    }
    $('wood-slots').innerHTML = html;
  }

  // 밤 하늘 호: index.html 의 호(가운데 100,46 · 가로 88 · 세로 40)를 따라 달을 옮긴다
  function drawSky(p) {
    const a = Math.PI * (1 - p);
    const x = 100 + 88 * Math.cos(a), y = 46 - 40 * Math.sin(a);
    $('sky-moon').setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
    $('sky-done').style.strokeDasharray = (p * 100).toFixed(1) + ' 100';
    $('sky-arc').classList.toggle('near', p >= 0.85);
  }

  EW.updateHud = function () {
    const R = EW.getRun();
    if (!R) return;
    const st = R.st;
    const fuelP = Math.max(0, R.fuel) / st.fuelMax * 100;
    $('fire-fill').style.width = fuelP.toFixed(1) + '%';
    $('fire-num').textContent = Math.max(0, Math.ceil(R.fuel));
    $('fire-meter').classList.toggle('low', R.fuel < 20);
    $('hp-fill').style.width = (Math.max(0, R.hp) / st.maxHp * 100).toFixed(1) + '%';
    $('hp-num').textContent = Math.max(0, Math.ceil(R.hp));
    $('oil-fill').style.width = (R.oil / st.oilMax * 100).toFixed(1) + '%';
    $('oil-num').textContent = Math.ceil(R.oil);
    $('oil-meter').classList.toggle('low', R.oil <= 0);
    $('hud-night').textContent = nightName(R.night) + ' · ' + D.REGIONS[R.region].short + ' · 남은 ' + fmtTime(EW.NIGHT_LEN - R.t);
    drawSky(Math.min(1, Math.max(0, R.t / EW.NIGHT_LEN)));
    $('hud-embers').textContent = '불씨 ' + R.embers;
    const can = R.phase === 'night' && R.wood.length > 0;
    $('btn-feed-fire').disabled = !can;
    $('btn-feed-lamp').disabled = !can;
    $('btn-feed-fire').classList.toggle('go', R.goal === 'fire');
    renderSlots(R);
  };

  function banner(text, danger) {
    const b = $('banner');
    b.textContent = text;
    b.classList.remove('on', 'danger');
    void b.offsetWidth;
    b.classList.add('on');
    if (danger) b.classList.add('danger');
  }

  // 첫 판 안내 (한 동작씩)
  const TUT = [
    '화면을 끌거나 W·A·S·D 로 움직여 반짝이는 장작을 주우세요',
    '🔥 불에 넣기(Q): 모닥불이 커지고 오래 탑니다. 불빛 밖이면 걸어가서 넣어요',
    '🏮 등불에 넣기(스페이스): 내 둘레 빛이 커져 그림자를 세게 태워요',
    '장작마다 어디에 넣을지 골라 새벽까지 버티세요!'
  ];
  let tutStep = -1;
  function updateHint() {
    const h = $('hint');
    if (tutStep < 0 || tutStep >= TUT.length) { h.classList.remove('on'); return; }
    h.textContent = TUT[tutStep];
    h.classList.add('on');
  }
  function tutAdvance(from) {
    if (tutStep !== from) return;
    tutStep++;
    if (tutStep === TUT.length - 1) {
      updateHint();
      setTimeout(function () { tutStep = -1; S.tutDone = true; save(); updateHint(); }, 4000);
      return;
    }
    updateHint();
  }

  // ---------------- 게임 사건 → 손맛·소리·화면 ----------------
  EW.ev = function (name, d) {
    if (EW.testMode) return;
    const R = EW.getRun();
    const P = EW.PAL || {};
    switch (name) {
      case 'night':
        banner(nightName(d) + ' — ' + D.NIGHTS[d - 1].name);
        EW.sfx('night');
        break;
      case 'nextNight':
        S.run = EW.snapshot(); save();
        break;
      case 'pick':
        S.meta.seen.w[d.type] = 1;
        EW.addNum(d.x, d.y, '+' + D.WOOD_MAP[d.type].name, P.fireHot);
        EW.burst(d.x, d.y, P.fire, 8, 120);
        EW.sfx('pick');
        tutAdvance(0);
        break;
      case 'goal':
        EW.addNum(R.px, R.py - 30, '모닥불로!', P.fire);
        break;
      case 'feedFire':
        EW.addNum(EW.FX, EW.FY - 50, '+' + Math.round(d.v) + ' 연료', P.fireHot, true);
        EW.burst(EW.FX, EW.FY - 10, P.fire, 22, 220);
        EW.ring(EW.FX, EW.FY, P.fire, EW.fireR());
        EW.flashIt(P.fire, 0.12);
        EW.shakeIt(4);
        EW.sfx('feedFire'); EW.vibrate(20);
        tutAdvance(1);
        break;
      case 'feedLamp':
        EW.addNum(R.px, R.py - 34, '+' + Math.round(d.v) + ' 기름', P.lamp, true);
        EW.burst(R.px, R.py, P.lamp, 18, 200);
        EW.ring(R.px, R.py, P.lamp, EW.lampR());
        EW.flashIt(P.lamp, 0.1);
        EW.shakeIt(3);
        EW.sfx('feedLamp'); EW.vibrate(20);
        tutAdvance(2);
        break;
      case 'dmg':
        if (S.settings.nums) EW.addNum(d.x, d.y - 12, Math.round(d.v), d.big ? P.fireHot : P.text, !!d.big);
        if (Math.random() < 0.3) EW.sfx('hit');
        break;
      case 'burst':
        EW.ring(EW.FX, EW.FY, P.fireHot, EW.fireR());
        EW.shakeIt(8); EW.sfx('burst');
        break;
      case 'spark':
        EW.burst(d.x, d.y, P.fireHot, 6, 90);
        if (S.settings.nums) EW.addNum(d.x, d.y - 14, d.v, P.fireHot);
        EW.sfx('spark');
        break;
      case 'kill':
        EW.burst(d.x, d.y, d.boss ? P.fireHot : P.muted, d.boss ? 50 : 14, d.boss ? 320 : 180);
        EW.addNum(d.x, d.y - 20, '+' + Math.round(d.b.ember * R.st.emberMul) + ' 불씨', P.fireHot, d.boss);
        EW.shakeIt(d.boss ? 16 : 2);
        if (d.boss) { EW.flashIt(P.fireHot, 0.4); banner(d.b.name + ' 쓰러짐!'); EW.vibrate(80); }
        EW.sfx('kill');
        break;
      case 'spawn':
        S.meta.seen.e[d.id] = 1;
        if (d.boss) { banner((d.elite ? '약한 모습의 ' : '') + d.b.name + ' 나타남', true); EW.sfx('boss'); EW.shakeIt(10); }
        break;
      case 'hurt':
        EW.addNum(d.x, d.y - 30, '-' + Math.max(1, Math.round(d.v)), P.danger, true);
        EW.flashIt(P.danger, 0.22);
        EW.shakeIt(4 + d.v);
        EW.sfx('hurt'); EW.vibrate(40);
        hudHurt();
        break;
      case 'eat':
        EW.addNum(EW.FX + (Math.random() - 0.5) * 40, EW.FY - 30, '냠', P.danger);
        EW.sfx('eat');
        break;
      case 'steal':
        EW.addNum(EW.FX, EW.FY - 40, '-' + Math.round(d.v) + ' 도둑!', P.danger, true);
        EW.shakeIt(6); EW.flashIt(P.danger, 0.15);
        EW.sfx('steal');
        break;
      case 'escape':
        EW.addNum(d.x < 0 ? 40 : Math.min(EW.W - 40, d.x), Math.max(40, Math.min(EW.H - 40, d.y)), '불씨를 놓쳤다', P.danger);
        break;
      case 'fireLow':
        banner('모닥불이 꺼져 간다!', true); EW.sfx('warn'); EW.vibrate(60);
        break;
      case 'revive':
        banner('재가 다시 타오른다!'); EW.sfx('revive'); EW.flashIt(P.fireHot, 0.4);
        break;
      case 'blink':
        EW.burst(d.x, d.y, P.muted, 6, 80);
        break;
      case 'mire':
        EW.addNum(R.px, R.py - 48, '붙잡힘!', P.good);
        break;
      case 'frost':
        EW.addNum(R.px, R.py - 48, '얼어붙음! 기름 빨리 닳음', P.text);
        EW.burst(R.px, R.py, P.text, 8, 90);
        EW.flashIt(P.text, 0.12);
        break;
      case 'dawn':
        EW.flashIt(P.fireHot, 0.45);
        d.enemies.forEach(function (e) { EW.burst(e.x, e.y, P.fireHot, 4, 100); });
        EW.sfx('dawn');
        S.meta.stats.nights++;
        unlockJournal(R.region, d.night);
        checkAch(false);
        save();
        setTimeout(openOffer, S.settings.reduce ? 0 : 450);
        break;
      case 'card':
        S.meta.seen.c[d] = 1;
        EW.sfx('card');
        break;
      case 'relicOffer':
        renderOffer();
        break;
      case 'relic':
        S.meta.seen.r[d] = 1;
        EW.sfx('relic');
        break;
      case 'end':
        finishRun(d.won, d.why);
        break;
      default: break;
    }
  };

  function hudHurt() {
    const h = $('hud');
    h.classList.add('hurt');
    clearTimeout(hudHurt.t);
    hudHurt.t = setTimeout(function () { h.classList.remove('hurt'); }, 180);
  }

  // ---------------- 새벽 고르기 ----------------
  function openOffer() {
    const R = EW.getRun();
    if (!R || (R.phase !== 'cards' && R.phase !== 'relic')) return;
    G.focusOffer = 0;
    renderOffer();
    show('ov-cards');
  }
  function renderOffer() {
    const R = EW.getRun();
    if (!R) return;
    const relic = R.phase === 'relic';
    $('cards-title').textContent = relic ? '유물을 하나 고르세요' : nightName(R.night) + '을 버텼다 — 새벽';
    $('cards-sub').textContent = relic ? '이번 판 끝까지 함께한다' : '강화 카드 셋 중 하나를 고르세요 (1·2·3)';
    const RW = { 1: '흔함', 2: '드묾', 3: '귀함' };
    $('card-list').innerHTML = R.offer.map(function (id, i) {
      const c = relic ? D.RELIC_MAP[id] : D.CARD_MAP[id];
      const cls = relic ? 'relic' : 'r' + c.r;
      const tag = relic ? '유물' : RW[c.r];
      const owned = relic ? '' : (R.cards.filter(function (x) { return x === id; }).length ? ' · 가진 것 ' + R.cards.filter(function (x) { return x === id; }).length : '');
      return '<button class="offer ' + cls + (i === G.focusOffer ? ' focus' : '') + '" data-offer="' + i + '"' + (i === G.focusOffer ? ' aria-current="true"' : '') + '>' +
        '<span class="tag">' + (i + 1) + ' · ' + tag + owned + '</span><span class="name">' + esc(c.name) + '</span><span class="desc">' + esc(c.desc) + '</span></button>';
    }).join('');
  }
  function chooseOffer(i) {
    const R = EW.getRun();
    if (!R || lock) return;
    const btn = document.querySelector('[data-offer="' + i + '"]');
    if (btn) btn.classList.add('picked');
    EW.vibrate(25);
    EW.pickOffer(i);
    if (R.phase === 'relic') { G.focusOffer = 0; renderOffer(); return; }
    if (R.phase === 'night') { hide('ov-cards'); lastSlotSig = ''; }
  }

  // ---------------- 판 끝 ----------------
  const WHY = { dawn: '열 밤을 모두 지켜 아침이 왔다.', fire: '모닥불이 꺼졌다. 그림자가 야영지를 덮었다.', hp: '불지기가 쓰러졌다.', quit: '스스로 불을 끄고 떠났다.' };
  function finishRun(won, why) {
    const R = EW.getRun();
    const m = S.meta, st = m.stats;
    const score = EW.score(R);
    const prevBest = st.bestScore;
    st.runs++; if (won) st.wins++;
    st.kills += R.kills; st.bossKills += R.bossKills; st.fedFire += R.fedFire; st.fedLamp += R.fedLamp;
    st.embersTotal += R.embers; st.playTime += R.time;
    if (why === 'fire') st.fireOut++;
    if (why === 'hp') st.fell++;
    st.bestNight[R.region] = Math.max(st.bestNight[R.region] || 0, R.dawns);
    st.bestScore = Math.max(st.bestScore, score);
    m.embers += R.embers;
    // 오늘의 도전은 지역을 날짜가 정하므로 이겨도 지역을 열지 않는다
    if (won && !R.daily && m.regionsWon.indexOf(R.region) < 0) m.regionsWon.push(R.region);
    if (R.daily && R.daily === S.daily.date) {
      S.daily.done = true; S.daily.score = score; S.daily.dawns = R.dawns; S.daily.won = won;
      S.daily.best = Math.max(S.daily.best, score);
    }
    S.run = null;
    const newAch = checkAch(true);
    save();
    EW.sfx(won ? 'win' : 'lose');
    if (!won) { EW.flashIt(EW.PAL.danger, 0.4); EW.shakeIt(12); EW.vibrate(120); }
    const t = $('res-title');
    t.textContent = won ? '새벽을 지켰다' : (why === 'quit' ? '불을 껐다' : '밤에 졌다');
    t.className = 'res-title ' + (won ? 'win' : 'lose');
    $('res-why').textContent = WHY[why] || '';
    const lines = [
      ['지역', D.REGIONS[R.region].name], ['등불', D.LANTERN_MAP[R.lantern].name],
      ['버틴 밤', R.dawns + ' / 10'], ['쓰러뜨린 그림자', R.kills],
      ['모닥불에 넣은 장작', R.fedFire], ['등불에 넣은 장작', R.fedLamp],
      ['얻은 불씨', R.embers], ['걸린 시간', fmtTime(R.time)],
      ['강화 카드', R.cards.length], ['유물', R.relics.length],
      ['점수', score], ['최고 점수', Math.max(prevBest, score)]
    ];
    if (R.daily) lines.push(['오늘의 도전', R.daily + ' · 내일 새 판']);
    $('res-lines').innerHTML = lines.map(function (l, i) {
      return '<div' + (i === 11 && score > prevBest ? ' class="best"' : '') + '><span>' + esc(l[0]) + '</span><b>' + esc(l[1]) + (i === 11 && score > prevBest ? ' 새 기록!' : '') + '</b></div>';
    }).join('');
    const news = newAch.map(function (a) { return '업적: ' + a.name; }).concat(newJournal.map(function (j) { return '야영 일지: ' + j.title; }));
    newJournal = [];
    $('res-new').innerHTML = news.length ? news.map(esc).join('<br>') : (won && !R.daily && R.region < 4 && m.regionsWon.indexOf(R.region) >= 0 ? '새 지역이 열렸다: ' + esc(D.REGIONS[R.region + 1].name) : '');
    G.shareText = shareText(R, won, why, score);
    $('share-box').value = G.shareText;
    $('share-box').classList.add('hidden');
    $('share-msg').textContent = '';
    setTimeout(function () { show('scr-result'); }, S.settings.reduce ? 0 : 700);
  }

  // ---------------- 결과 공유 문구 ----------------
  function shareText(R, won, why, score) {
    const head = won ? '새벽을 지켰다' : (why === 'quit' ? '불을 껐다' : '밤에 졌다');
    const out = [
      'Ember Watch — ' + head + (R.daily ? ' (오늘의 도전 ' + R.daily + ')' : ''),
      D.REGIONS[R.region].name + ' · ' + D.LANTERN_MAP[R.lantern].name,
      '버틴 밤 ' + R.dawns + '/10 · 점수 ' + score,
      '그림자 ' + R.kills + ' · 장작 불에 ' + R.fedFire + ' / 등불에 ' + R.fedLamp + ' · ' + fmtTime(R.time)
    ];
    return out.join('\n');
  }
  // 복사가 막히면(권한·http 등) 글 상자를 보여 주고 글을 골라 둔다
  function showShareBox(msg) {
    const box = $('share-box');
    box.value = G.shareText;
    box.classList.remove('hidden');
    try { box.focus(); box.select(); } catch (e) { /* 고르기 못 해도 글은 보인다 */ }
    let ok = false;
    try { ok = document.execCommand && document.execCommand('copy'); } catch (e) { ok = false; }
    $('share-msg').textContent = ok ? '결과 문구를 복사했다' : msg;
  }
  function copyShare() {
    if (!G.shareText) return;
    const fail = '복사가 막혔다 — 아래 글을 길게 눌러(또는 Ctrl+C) 복사하세요';
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(G.shareText).then(function () {
          $('share-msg').textContent = '결과 문구를 복사했다';
        }, function () { showShareBox(fail); });
        return;
      }
    } catch (e) { /* 아래 글 상자로 */ }
    showShareBox(fail);
  }

  // ---------------- 업적·야영 일지 ----------------
  let newJournal = [];
  function unlockJournal(region, night) {
    D.JOURNAL.forEach(function (j, i) {
      if (j.r === region && j.n === night && !S.meta.journal[i]) { S.meta.journal[i] = 1; newJournal.push(j); }
    });
  }
  const ACH_CHECK = {
    a_first: function (R) { return R.dawns >= 1; },
    a_n5: function (R) { return R.dawns >= 5; },
    a_win: function (R) { return R.won; },
    a_win3: function () { return S.meta.regionsWon.length >= 3; },
    a_winall: function () { return S.meta.regionsWon.length >= 5; },
    a_k100: function (R, end) { return S.meta.stats.kills + (end ? 0 : R.kills) >= 100; },
    a_k1000: function (R, end) { return S.meta.stats.kills + (end ? 0 : R.kills) >= 1000; },
    a_boss: function (R) { return R.bossKills > 0; },
    a_fire50: function (R, end) { return S.meta.stats.fedFire + (end ? 0 : R.fedFire) >= 50; },
    a_lamp50: function (R, end) { return S.meta.stats.fedLamp + (end ? 0 : R.fedLamp) >= 50; },
    a_nolamp: function (R) { return R.fedLamp === 0 && R.dawns >= 4; },
    a_nofire: function (R) { return R.fedFire === 0 && R.dawns >= 3; },
    a_close: function (R) { return R.flags.close; },
    a_full: function (R) { return R.flags.full; },
    a_carry: function (R) { return R.flags.maxCarry >= 6; },
    a_rich: function () { return S.meta.embers >= 300; },
    a_relic3: function (R) { return R.relics.length >= 3; },
    a_card6: function (R) { return R.cards.length >= 6; },
    a_lantern3: function () { return S.meta.lanterns.length >= 3; },
    a_runs10: function () { return S.meta.stats.runs >= 10; }
  };
  function checkAch(end) {
    const R = EW.getRun();
    const got = [];
    D.ACHS.forEach(function (a) {
      if (S.meta.ach[a.id]) return;
      const f = ACH_CHECK[a.id];
      let ok = false;
      try { ok = !!(f && f(R || { dawns: 0, won: false, kills: 0, bossKills: 0, fedFire: 0, fedLamp: 0, flags: {}, relics: [], cards: [] }, end)); } catch (e) { ok = false; }
      if (ok) { S.meta.ach[a.id] = 1; got.push(a); if (!end && !EW.testMode) banner('업적: ' + a.name); }
    });
    return got;
  }

  // ---------------- 야영지 ----------------
  function refreshCamp() {
    $('camp-embers').textContent = '불씨 ' + S.meta.embers;
    const tabs = [['lantern', '등불'], ['relic', '유물'], ['prep', '야영 준비']];
    $('camp-tabs').innerHTML = tabs.map(function (t) { return '<button class="btn" role="tab" data-tab="' + t[0] + '" aria-selected="' + (G.campTab === t[0]) + '">' + t[1] + '</button>'; }).join('');
    let html = '';
    if (G.campTab === 'lantern') {
      html = D.LANTERNS.map(function (l) {
        const own = S.meta.lanterns.indexOf(l.id) >= 0;
        return '<button class="item' + (own ? ' done' : '') + '" data-buy="lantern:' + l.id + '"' + (own || S.meta.embers < l.cost ? ' disabled' : '') + '>' +
          '<span class="name">' + esc(l.name) + '</span><span class="desc">' + esc(l.desc) + '</span><span class="tag">' + (own ? '가짐' : '불씨 ' + l.cost + '로 사기') + '</span></button>';
      }).join('');
    } else if (G.campTab === 'relic') {
      html = D.RELICS.map(function (r) {
        const own = r.cost === 0 || S.meta.relics.indexOf(r.id) >= 0;
        return '<button class="item' + (own ? ' done' : '') + '" data-buy="relic:' + r.id + '"' + (own || S.meta.embers < r.cost ? ' disabled' : '') + '>' +
          '<span class="name">' + esc(r.name) + '</span><span class="desc">' + esc(r.desc) + '</span><span class="tag">' + (own ? '새벽에 나올 수 있음' : '불씨 ' + r.cost + '로 열기') + '</span></button>';
      }).join('');
    } else {
      html = D.PREP.map(function (p) {
        const lv = S.meta.prep[p.id] || 0;
        const max = lv >= p.cost.length;
        const cost = max ? 0 : p.cost[lv];
        return '<button class="item' + (max ? ' done' : '') + '" data-buy="prep:' + p.id + '"' + (max || S.meta.embers < cost ? ' disabled' : '') + '>' +
          '<span class="name">' + esc(p.name) + ' ' + '●'.repeat(lv) + '○'.repeat(p.cost.length - lv) + '</span><span class="desc">' + esc(p.desc) + ' (단계마다)</span>' +
          '<span class="tag">' + (max ? '다 올림' : '불씨 ' + cost + '로 올리기') + '</span></button>';
      }).join('');
    }
    $('camp-list').innerHTML = html;
  }
  function buy(spec) {
    const parts = spec.split(':');
    const kind = parts[0], id = parts[1];
    let cost = 0;
    if (kind === 'lantern') {
      const l = D.LANTERN_MAP[id]; if (!l || S.meta.lanterns.indexOf(id) >= 0) return;
      cost = l.cost; if (S.meta.embers < cost) return;
      S.meta.lanterns.push(id);
    } else if (kind === 'relic') {
      const r = D.RELIC_MAP[id]; if (!r || r.cost === 0 || S.meta.relics.indexOf(id) >= 0) return;
      cost = r.cost; if (S.meta.embers < cost) return;
      S.meta.relics.push(id);
    } else if (kind === 'prep') {
      const p = D.PREP_MAP[id]; if (!p) return;
      const lv = S.meta.prep[id] || 0; if (lv >= p.cost.length) return;
      cost = p.cost[lv]; if (S.meta.embers < cost) return;
      S.meta.prep[id] = lv + 1;
    } else return;
    S.meta.embers -= cost;
    checkAch(true);
    save();
    EW.sfx('buy'); EW.vibrate(30);
    refreshCamp();
    const el = document.querySelector('[data-buy="' + spec + '"]');
    if (el) el.classList.add('picked');
  }

  // ---------------- 도감 ----------------
  function refreshCodex() {
    const tabs = [['e', '그림자'], ['w', '장작'], ['c', '강화'], ['r', '유물'], ['g', '지역']];
    $('codex-tabs').innerHTML = tabs.map(function (t) { return '<button class="btn" role="tab" data-tab="' + t[0] + '" aria-selected="' + (G.codexTab === t[0]) + '">' + t[1] + '</button>'; }).join('');
    const seen = S.meta.seen;
    let list = [], total = 0, have = 0;
    function card(ok, name, desc, tag) {
      total++; if (ok) have++;
      return '<div class="item' + (ok ? '' : ' locked') + '"><span class="name">' + (ok ? esc(name) : '???') + '</span><span class="desc">' + (ok ? esc(desc) : '아직 만나지 못했다') + '</span>' + (tag && ok ? '<span class="tag">' + esc(tag) + '</span>' : '') + '</div>';
    }
    const TG = { fire: '모닥불을 노림', player: '불지기를 노림', mix: '가까운 쪽을 노림' };
    if (G.codexTab === 'e') list = D.ENEMIES.map(function (e) { return card(seen.e[e.id], e.name + (e.boss ? ' (우두머리)' : ''), e.desc, '몸 글자 ' + e.mark + ' · 체력 ' + e.hp + ' · ' + TG[e.tg]); });
    else if (G.codexTab === 'w') list = D.WOODS.map(function (w) { return card(seen.w[w.id], w.name, w.desc, '모닥불 +' + w.fire + ' · 등불 +' + w.lamp); });
    else if (G.codexTab === 'c') list = D.CARDS.map(function (c) { return card(seen.c[c.id], c.name, c.desc, ['', '흔함', '드묾', '귀함'][c.r]); });
    else if (G.codexTab === 'r') list = D.RELICS.map(function (r) { return card(seen.r[r.id], r.name, r.desc, ''); });
    else list = D.REGIONS.map(function (g, i) { return card(regionUnlocked(i), g.name, g.desc + ' 규칙: ' + g.rule, '가장 멀리 버틴 밤 ' + (S.meta.stats.bestNight[i] || 0) + '/10'); });
    $('codex-list').innerHTML = list.join('');
    $('codex-count').textContent = have + ' / ' + total;
  }

  // ---------------- 기록 ----------------
  function refreshRecords() {
    const tabs = [['ach', '업적'], ['jr', '야영 일지'], ['st', '통계']];
    $('rec-tabs').innerHTML = tabs.map(function (t) { return '<button class="btn" role="tab" data-tab="' + t[0] + '" aria-selected="' + (G.recTab === t[0]) + '">' + t[1] + '</button>'; }).join('');
    let html = '';
    if (G.recTab === 'ach') {
      html = D.ACHS.map(function (a) {
        const ok = !!S.meta.ach[a.id];
        return '<div class="item' + (ok ? ' done' : ' locked') + '"><span class="name">' + (ok ? '★ ' : '☆ ') + esc(a.name) + '</span><span class="desc">' + esc(a.desc) + '</span></div>';
      }).join('');
    } else if (G.recTab === 'jr') {
      html = D.JOURNAL.map(function (j, i) {
        const ok = !!S.meta.journal[i];
        return '<div class="item' + (ok ? '' : ' locked') + '"><span class="name">' + (ok ? esc(j.title) : '???') + '</span><span class="desc">' + (ok ? esc(j.text) : esc(D.REGIONS[j.r].name) + (j.n === 0 ? '에 처음 가면' : j.n === 10 ? '에서 이기면' : '에서 ' + NIGHT_WORD[j.n - 1] + ' 밤을 버티면') + ' 열린다') + '</span></div>';
      }).join('');
    } else {
      const st = S.meta.stats;
      const rows = [
        ['한 판 수', st.runs], ['이긴 판', st.wins], ['버틴 밤', st.nights], ['쓰러뜨린 그림자', st.kills],
        ['쓰러뜨린 우두머리', st.bossKills], ['모닥불에 넣은 장작', st.fedFire], ['등불에 넣은 장작', st.fedLamp],
        ['모은 불씨', st.embersTotal], ['최고 점수', st.bestScore], ['평균 버틴 밤', st.runs ? (st.nights / st.runs).toFixed(1) : '0'],
        ['불이 꺼진 판', st.fireOut], ['쓰러진 판', st.fell], ['모두 한 시간', fmtTime(st.playTime)],
        ['업적', Object.keys(S.meta.ach).length + ' / ' + D.ACHS.length], ['야영 일지', Object.keys(S.meta.journal).length + ' / ' + D.JOURNAL.length],
        ['오늘의 도전 한 번 수', S.daily.count], ['오늘의 도전 최고 점수', S.daily.best]
      ];
      html = rows.map(function (r) { return '<div class="item"><span class="desc">' + esc(r[0]) + '</span><span class="name">' + esc(r[1]) + '</span></div>'; }).join('');
    }
    $('rec-list').innerHTML = html;
  }

  // ---------------- 설정 ----------------
  const SETTINGS = [
    ['sound', '효과음', 'toggle'], ['vol', '음량', 'vol'], ['vib', '진동', 'toggle'], ['shake', '화면 흔들림', 'toggle'],
    ['reduce', '움직임 줄이기', 'toggle'], ['nums', '피해 숫자 보기', 'toggle'], ['hints', '첫 판 안내', 'toggle']
  ];
  function refreshSettings() {
    $('settings-list').innerHTML = SETTINGS.map(function (s) {
      const v = S.settings[s[0]];
      const label = s[2] === 'vol' ? ['끔', '작게', '보통', '크게'][v] : (v ? '켬' : '끔');
      return '<div class="item"><span class="name">' + s[1] + '</span><button class="btn" data-set="' + s[0] + '" aria-pressed="' + (s[2] === 'vol' ? v > 0 : !!v) + '">' + label + '</button></div>';
    }).join('');
    document.body.classList.toggle('reduce', !!S.settings.reduce);
  }
  function toggleSetting(k) {
    if (k === 'vol') S.settings.vol = (S.settings.vol + 1) % 4;
    else S.settings[k] = !S.settings[k];
    if (k === 'hints' && S.settings.hints) S.tutDone = false;
    save();
    EW.audioVolume();
    refreshSettings();
  }
  function openSettings(from) { G.returnTo = from; refreshSettings(); $('wipe-confirm').classList.add('hidden'); show('scr-settings'); }
  function openHelp(from) { G.returnTo = from; show('scr-help'); }
  function backFromSub() {
    if (G.returnTo === 'pause') { show('scr-game'); setTimeout(function () { lock = false; show('ov-pause'); }, S.settings.reduce ? 0 : 230); }
    else { refreshTitle(); show('scr-title'); }
  }

  // ---------------- 멈춤 ----------------
  function pauseGame() {
    const R = EW.getRun();
    if (!R || R.phase !== 'night' || current !== 'scr-game' || G.paused) return;
    G.paused = true; G.quitArmed = false;
    $('btn-quit').textContent = '그만두기';
    const cards = R.cards.map(function (id) { return D.CARD_MAP[id].name; });
    const relics = R.relics.map(function (id) { return D.RELIC_MAP[id].name; });
    $('pause-info').innerHTML = (R.daily ? '오늘의 도전 ' + esc(R.daily) + '<br>' : '') + esc(D.REGIONS[R.region].name) + ' · ' + nightName(R.night) + ' · 등불 ' + esc(D.LANTERN_MAP[R.lantern].name) +
      '<br>카드: ' + (cards.length ? esc(cards.join(', ')) : '없음') + '<br>유물: ' + (relics.length ? esc(relics.join(', ')) : '없음');
    show('ov-pause');
  }
  EW.pauseGame = pauseGame;
  function resumeGame() { G.paused = false; hide('ov-pause'); }

  // ---------------- 입력 ----------------
  const keys = {};
  function keyMove() {
    let x = 0, y = 0;
    if (keys.ArrowLeft || keys.KeyA) x -= 1;
    if (keys.ArrowRight || keys.KeyD) x += 1;
    if (keys.ArrowUp || keys.KeyW) y -= 1;
    if (keys.ArrowDown || keys.KeyS) y += 1;
    if (!joy.on) EW.setMove(x, y);
  }
  const joy = { on: false, id: -1, ox: 0, oy: 0 };
  function joyStart(ev) {
    if (current !== 'scr-game' || G.paused) return;
    EW.audioInit();
    joy.on = true; joy.id = ev.pointerId; joy.ox = ev.clientX; joy.oy = ev.clientY;
    const j = $('joy');
    j.style.left = ev.clientX + 'px'; j.style.top = ev.clientY + 'px';
    j.classList.add('on');
    $('joy-knob').style.transform = '';
    try { $('cv').setPointerCapture(ev.pointerId); } catch (e) { /* 무시 */ }
  }
  function joyMove(ev) {
    if (!joy.on || ev.pointerId !== joy.id) return;
    const dx = ev.clientX - joy.ox, dy = ev.clientY - joy.oy;
    const len = Math.sqrt(dx * dx + dy * dy);
    const k = len > 40 ? 40 / len : 1;
    $('joy-knob').style.transform = 'translate(' + (dx * k) + 'px,' + (dy * k) + 'px)';
    if (len < 6) EW.setMove(0, 0); else EW.setMove(dx / 40, dy / 40);
  }
  function joyEnd(ev) {
    if (!joy.on || ev.pointerId !== joy.id) return;
    joy.on = false;
    $('joy').classList.remove('on');
    EW.setMove(0, 0);
  }

  function onKey(ev, down) {
    const R = EW.getRun();
    const code = ev.code;
    if (current === 'scr-game' && !G.paused && R) {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].indexOf(code) >= 0) {
        keys[code] = down;
        if (R.phase === 'night') { keyMove(); ev.preventDefault(); return; }
      }
      if (!down) return;
      if (R.phase === 'night') {
        if (code === 'KeyQ' || code === 'KeyJ') { EW.audioInit(); EW.feedFire(); ev.preventDefault(); }
        else if (code === 'Space' || code === 'KeyK') { EW.audioInit(); EW.feedLamp(); ev.preventDefault(); }
        else if (/^Digit[1-8]$/.test(code)) EW.selectWood(parseInt(code.slice(5), 10) - 1);
        else if (code === 'KeyP' || code === 'Escape') { pauseGame(); ev.preventDefault(); }
      } else if ((R.phase === 'cards' || R.phase === 'relic') && $('ov-cards').classList.contains('open')) {
        const n = R.offer.length;
        if (/^Digit[1-3]$/.test(code)) { chooseOffer(parseInt(code.slice(5), 10) - 1); ev.preventDefault(); }
        else if (code === 'ArrowLeft' || code === 'ArrowUp') { G.focusOffer = (G.focusOffer + n - 1) % n; renderOffer(); ev.preventDefault(); }
        else if (code === 'ArrowRight' || code === 'ArrowDown') { G.focusOffer = (G.focusOffer + 1) % n; renderOffer(); ev.preventDefault(); }
        else if (code === 'Enter' || code === 'Space') { chooseOffer(G.focusOffer); ev.preventDefault(); }
      }
      return;
    }
    if (!down) return;
    if (G.paused && (code === 'Escape' || code === 'KeyP') && current === 'scr-game') { resumeGame(); ev.preventDefault(); }
  }

  // ---------------- 묶기 ----------------
  function bind() {
    on('btn-start', openPrep, true);
    on('btn-continue', continueRun, true);
    on('btn-daily', startDaily, true);
    on('btn-help', function () { openHelp('title'); });
    on('btn-settings', function () { openSettings('title'); });
    on('btn-camp', function () { refreshCamp(); show('scr-camp'); });
    on('btn-codex', function () { refreshCodex(); show('scr-codex'); });
    on('btn-records', function () { refreshRecords(); show('scr-records'); });
    on('btn-prep-back', function () { refreshTitle(); show('scr-title'); });
    on('btn-go', startRun, true);
    on('btn-help-back', backFromSub);
    on('btn-settings-back', backFromSub);
    on('btn-camp-back', function () { refreshTitle(); show('scr-title'); });
    on('btn-codex-back', function () { refreshTitle(); show('scr-title'); });
    on('btn-records-back', function () { refreshTitle(); show('scr-title'); });
    on('btn-again', function () { openPrep(); }, true);
    on('btn-home', function () { refreshTitle(); show('scr-title'); });
    on('btn-share', copyShare);
    on('btn-pause', pauseGame);
    on('btn-resume', resumeGame);
    on('btn-pause-help', function () { G.returnTo = 'pause'; show('scr-help'); });
    on('btn-pause-settings', function () { openSettings('pause'); });
    on('btn-quit', function () {
      if (!G.quitArmed) { G.quitArmed = true; $('btn-quit').textContent = '한 번 더 누르면 그만둡니다'; return; }
      G.quitArmed = false; G.paused = false;
      hide('ov-pause');
      EW.giveUp();
    }, true);
    on('btn-feed-fire', function () { EW.feedFire(); }, true);
    on('btn-feed-lamp', function () { EW.feedLamp(); }, true);
    on('btn-wipe', function () { $('wipe-confirm').classList.remove('hidden'); });
    on('btn-wipe-no', function () { $('wipe-confirm').classList.add('hidden'); });
    on('btn-wipe-yes', function () {
      const keep = S.settings;
      // 오늘의 도전 날짜는 남겨 기록을 지워도 같은 날 다시 하지 못하게 한다
      const keepDaily = S.daily.date;
      S = defSave(); S.settings = keep; S.daily.date = keepDaily; EW.S = S;
      save();
      $('wipe-confirm').classList.add('hidden');
      refreshSettings(); refreshTitle();
      banner('기록을 지웠다');
    }, true);

    // 목록 안 버튼 (누를 때마다 다시 그리므로 위임)
    function delegate(id, attr, fn) {
      $(id).addEventListener('click', function (ev) {
        const b = ev.target.closest('[' + attr + ']');
        if (!b || b.disabled || lock) return;
        EW.audioInit(); EW.sfx('click');
        fn(b.getAttribute(attr), b);
      });
    }
    delegate('region-list', 'data-region', function (v) { prepRegion = parseInt(v, 10) || 0; refreshPrep(); });
    delegate('lantern-list', 'data-lantern', function (v) { prepLantern = v; refreshPrep(); });
    delegate('card-list', 'data-offer', function (v) { chooseOffer(parseInt(v, 10) || 0); });
    delegate('camp-list', 'data-buy', buy);
    delegate('camp-tabs', 'data-tab', function (v) { G.campTab = v; refreshCamp(); });
    delegate('codex-tabs', 'data-tab', function (v) { G.codexTab = v; refreshCodex(); });
    delegate('rec-tabs', 'data-tab', function (v) { G.recTab = v; refreshRecords(); });
    delegate('settings-list', 'data-set', toggleSetting);
    delegate('wood-slots', 'data-slot', function (v) { EW.selectWood(parseInt(v, 10) || 0); lastSlotSig = ''; EW.requestDraw(); });

    const cv = $('cv');
    cv.addEventListener('pointerdown', joyStart);
    cv.addEventListener('pointermove', joyMove);
    cv.addEventListener('pointerup', joyEnd);
    cv.addEventListener('pointercancel', joyEnd);
    window.addEventListener('keydown', function (e) { onKey(e, true); });
    window.addEventListener('keyup', function (e) { onKey(e, false); });
    window.addEventListener('pointerdown', function () { EW.audioInit(); }, { once: true });
    document.addEventListener('visibilitychange', function () { if (document.hidden) pauseGame(); });

    $('help-woods').innerHTML = D.WOODS.map(function (w) {
      return '<div>' + woodChip(w, 'mini') + '<b>' + esc(w.name) + '</b> 모닥불 +' + w.fire + ' · 등불 +' + w.lamp + (w.sp ? ' — ' + esc(w.desc) : '') + '</div>';
    }).join('');
  }

  EW.uiInit = function () {
    bind();
    refreshSettings();
    refreshTitle();
  };

  // 세로로 들면 멈췄다가 가로로 돌리면 그대로 이어 간다
  EW.checkOrientation = function () {
    const portrait = window.innerHeight > window.innerWidth;
    if (portrait && current === 'scr-game' && !G.paused) G.rotPaused = true;
    if (!portrait && G.rotPaused) G.rotPaused = false;
  };

  EW.isRunning = function () {
    const R = EW.getRun();
    return !!R && current === 'scr-game' && !G.paused && !G.rotPaused && R.phase === 'night';
  };
})();
