// Ember Watch — 화면·저장·업적·HUD (규칙은 game.js, 그리기는 render.js)
(function () {
  'use strict';
  const EW = window.EW = window.EW || {};
  const D = window.EW_DATA;
  const KEY = 'emberwatch_save_v2';
  const $ = function (id) { return document.getElementById(id); };

  // ---------------- 저장 ----------------
  function prefersReduce() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function defSave() {
    return {
      v: 2,
      settings: { sound: true, vol: 2, vib: true, shake: true, reduce: prefersReduce(), nums: true, hints: true },
      meta: {
        // campBest: 야영지마다 가장 오래 버틴 날 (다음 야영지가 열리는 기준)
        embers: 0, relics: [], prep: {}, campBest: {},
        seen: { e: {}, w: {}, c: {}, r: {}, b: {}, n: {} }, ach: {}, journal: {},
        stats: {
          runs: 0, bestDays: 0, nights: 0, kills: 0, bossKills: 0, fedFire: 0, fedLamp: 0, embersTotal: 0,
          bestScore: 0, playTime: 0, fireOut: 0, fell: 0, gathered: 0, trees: 0, built: 0, eaten: 0, trapped: 0
        }
      },
      run: null, tutDone: false, lastLantern: 'tin', lastCamp: 'pine',
      // 오늘의 도전: 하루 한 번. date 는 마지막으로 시작한 날, done 은 그날 판을 끝냈는지
      daily: { date: '', done: false, score: 0, dawns: 0, count: 0, best: 0 }
    };
  }
  function merge(base, o) {
    if (!o || typeof o !== 'object') return base;
    Object.keys(base).forEach(function (k) {
      if (!(k in o)) return;
      const b = base[k], v = o[k];
      // 빈 기본값({}: 야영지별 버틴 날·업적·도감 등 키가 정해지지 않은 것)은 저장된 것을 그대로 쓴다
      if (b && typeof b === 'object' && !Array.isArray(b) && v && typeof v === 'object' && !Array.isArray(v)) base[k] = Object.keys(b).length ? merge(b, v) : v;
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
  const G = {
    paused: false, rotPaused: false, adOpen: false, adFor: '', returnTo: 'scr-title', quitArmed: false,
    focusOffer: 0, codexTab: 'e', campTab: 'relic', recTab: 'ach', tut: -1, shareText: ''
  };
  EW.G = G;

  // force: 게임이 부른 겹침 화면(짓기·쓰러짐·광고 자리)은 전환 중이어도 반드시 연다
  function transition(fn, force) {
    if (lock && !force) return false;
    const ms = S.settings.reduce ? 0 : 220;
    lock = ms > 0;
    fn();
    if (lock) setTimeout(function () { lock = false; }, ms);
    return true;
  }
  function show(id, force) {
    return transition(function () {
      const el = $(id);
      if (!el) return;
      if (el.classList.contains('overlay')) { el.classList.add('open'); return; }
      document.querySelectorAll('.screen.active').forEach(function (s) { s.classList.remove('active'); });
      document.querySelectorAll('.overlay.open').forEach(function (s) { s.classList.remove('open'); });
      el.classList.add('active');
      current = id;
      if (id === 'scr-game') setTimeout(EW.resizeCanvas, 0);
    }, force);
  }
  function hide(id, force) {
    return transition(function () { const el = $(id); if (el) el.classList.remove('open'); }, force);
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
  function nightName(n) { const x = D.NIGHTS[Math.min(n, D.NIGHTS.length) - 1]; return x ? x.name : ''; }
  function isNight(R) {
    if (R.phase === 'over') return R.endPhase === 'night';
    return R.phase === 'night' || (R.phase === 'build' && R.prev === 'night') || (R.phase === 'down' && R.downFrom === 'night');
  }

  // ---------------- 시작 화면 ----------------
  function refreshTitle() {
    $('btn-continue').classList.toggle('hidden', !S.run);
    const st = S.meta.stats;
    $('title-meta').textContent = '불씨 ' + S.meta.embers + ' · 가장 오래 버틴 날 ' + st.bestDays + ' · 한 판 ' + st.runs;
    refreshDaily();
  }

  // ---------------- 오늘의 도전 ----------------
  // 이 기기의 날짜(YYYY-MM-DD)로 숲(자원 자리)과 그림자·장작·카드의 무작위가 정해진다. 야영 준비·열린 유물 없이 누구나 같은 조건이고, 하루 한 번만 시작한다
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function refreshDaily() {
    const today = todayStr();
    const dy = S.daily;
    const used = dy.date === today;
    const b = $('btn-daily');
    b.disabled = used;
    let sub;
    if (!used) sub = '오늘의 숲 · 모두 같은 지도';
    else if (dy.done) sub = '버틴 날 ' + dy.dawns + ' · 점수 ' + dy.score + ' · 내일 다시';
    else if (S.run && S.run.daily === today) sub = '하는 중 · 이어하기로 계속';
    else sub = '오늘 시작함 · 내일 다시';
    $('daily-sub').textContent = sub;
    b.setAttribute('aria-label', '오늘의 도전 ' + today + ' — ' + sub);
  }
  function startDaily() {
    const today = todayStr();
    if (S.daily.date === today) { refreshDaily(); return; }
    const setup = EW.dailySetup(today);
    S.daily.date = today; S.daily.done = false; S.daily.score = 0; S.daily.dawns = 0;
    S.daily.count++;
    EW.newRun({ lantern: 'tin', camp: 'pine', prep: null, relicPool: null, daily: today, seed: setup.seed });
    unlockJournal(0);
    S.run = EW.snapshot();
    save();
    beginGame();
  }

  // ---------------- 출발 준비 (야영지·등불을 옆으로 밀어 고른다) ----------------
  // 야영지는 그 전 야영지에서 버틴 날 수로, 등불은 가장 오래 버틴 날 수로 열린다
  function campOpen(c) { return !c.prev || (S.meta.campBest[c.prev] || 0) >= c.days; }
  function lanternOpen(l) { return S.meta.stats.bestDays >= l.need; }
  function campLockText(c) { return D.CAMP_MAP[c.prev].name + '에서 ' + c.days + '일 버티면 열림'; }
  function lanLockText(l) { return l.need + '일 버티면 열림'; }
  let prepCamp = 0, prepLan = 0;
  // 잠긴 항목은 어두운 그림·흐린 글자와 함께 자물쇠로도 보인다
  const LOCK_ICO = '<i class="lock-ico" aria-hidden="true">🔒</i>';
  function renderPrep() {
    $('prep-embers').textContent = '가장 오래 버틴 날 ' + S.meta.stats.bestDays;
    $('camp-track').innerHTML = D.CAMPS.map(function (c, i) {
      const ok = campOpen(c);
      const best = S.meta.campBest[c.id] || 0;
      return '<div class="camp-card' + (ok ? '' : ' locked') + '" role="option" data-camp="' + i + '" style="--c1:var(--land-' + c.id + ');--c2:var(--land-' + c.id + '-deco);--c3:var(--land-' + c.id + '-dark)">' +
        '<div class="camp-art camp-' + c.id + '" aria-hidden="true"><i class="camp-fire"></i></div>' +
        (ok ? '' : '<div class="camp-lock" aria-hidden="true">🔒</div>') +
        '<div class="camp-text"><b class="camp-name">' + (ok ? '' : LOCK_ICO) + esc(c.name) + '</b>' +
        '<span class="camp-feat">' + (ok ? esc(c.feat) + (best ? ' · 여기서 ' + best + '일 버팀' : '') : esc(campLockText(c))) + '</span></div></div>';
    }).join('');
    $('camp-dots').innerHTML = D.CAMPS.map(function () { return '<i></i>'; }).join('');
    $('lan-track').innerHTML = D.LANTERNS.map(function (l, i) {
      const ok = lanternOpen(l);
      return '<button class="lan-card' + (ok ? '' : ' locked') + '" role="option" data-lan="' + i + '" aria-label="' + esc(l.name + ' — ' + (ok ? l.feat : lanLockText(l))) + '">' +
        '<span class="lan-ico" aria-hidden="true" style="--glass:var(' + l.glass + ')"><i></i></span>' +
        '<span class="lan-text"><b>' + (ok ? '' : LOCK_ICO) + esc(l.name) + '</b><small>' + esc(ok ? l.feat : lanLockText(l)) + '</small></span></button>';
    }).join('');
    updatePrepSel();
  }
  function updatePrepSel() {
    const c = D.CAMPS[prepCamp], l = D.LANTERNS[prepLan];
    document.querySelectorAll('#camp-track .camp-card').forEach(function (el, i) { el.classList.toggle('sel', i === prepCamp); el.setAttribute('aria-selected', String(i === prepCamp)); });
    document.querySelectorAll('#camp-dots i').forEach(function (el, i) { el.classList.toggle('on', i === prepCamp); });
    document.querySelectorAll('#lan-track .lan-card').forEach(function (el, i) { el.classList.toggle('sel', i === prepLan); el.setAttribute('aria-selected', String(i === prepLan)); });
    $('btn-camp-prev').disabled = prepCamp <= 0;
    $('btn-camp-next').disabled = prepCamp >= D.CAMPS.length - 1;
    const cOk = campOpen(c), lOk = lanternOpen(l);
    $('btn-go').disabled = !(cOk && lOk);
    $('prep-why').textContent = !cOk ? '🔒 ' + c.name + ' — ' + campLockText(c) : (!lOk ? '🔒 ' + l.name + ' — ' + lanLockText(l) : c.name + ' · ' + l.name);
  }
  // 고른 카드를 줄 가운데로 옮긴다 (트랙은 position: relative 라 offsetLeft 가 트랙 기준)
  function scrollTrackTo(track, el, smooth) {
    if (!track || !el) return;
    const left = Math.max(0, el.offsetLeft - (track.clientWidth - el.offsetWidth) / 2);
    try { track.scrollTo({ left: left, behavior: smooth && !S.settings.reduce ? 'smooth' : 'auto' }); } catch (e) { track.scrollLeft = left; }
  }
  function pickCamp(i, smooth) {
    prepCamp = Math.max(0, Math.min(D.CAMPS.length - 1, i));
    updatePrepSel();
    scrollTrackTo($('camp-track'), $('camp-track').children[prepCamp], smooth);
  }
  function pickLan(i, smooth) {
    prepLan = Math.max(0, Math.min(D.LANTERNS.length - 1, i));
    updatePrepSel();
    scrollTrackTo($('lan-track'), $('lan-track').children[prepLan], smooth);
  }
  // 손으로 밀다 멈춘 자리에서 가운데에 온 카드를 고른다
  function centeredIndex(track) {
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = 0, bd = 1e9;
    Array.prototype.forEach.call(track.children, function (el, i) {
      const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }
  function watchSwipe(id, fn) {
    const track = $(id);
    let t = 0;
    track.addEventListener('scroll', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        if (current !== 'scr-prep' || !track.clientWidth || !track.children.length) return;
        fn(centeredIndex(track));
      }, 140);
    }, { passive: true });
  }
  function openPrep() {
    const ci = D.CAMPS.map(function (c) { return c.id; }).indexOf(S.lastCamp);
    prepCamp = ci >= 0 && campOpen(D.CAMPS[ci]) ? ci : 0;
    const li = D.LANTERNS.map(function (l) { return l.id; }).indexOf(S.lastLantern);
    prepLan = li >= 0 && lanternOpen(D.LANTERNS[li]) ? li : 0;
    renderPrep();
    show('scr-prep');
    setTimeout(function () { pickCamp(prepCamp, false); pickLan(prepLan, false); }, 0);
  }

  // ---------------- 판 시작·이어하기 ----------------
  function beginGame() {
    G.paused = false; G.quitArmed = false; G.adOpen = false;
    $('btn-quit').textContent = '그만두기';
    lastSlotSig = '';
    show('scr-game', true);
    EW.sfx('start');
    const R = EW.getRun();
    G.tut = (!S.tutDone && S.settings.hints && R && R.day === 1) ? 0 : -1;
    updateTut();
  }
  function startRun() {
    const c = D.CAMPS[prepCamp], l = D.LANTERNS[prepLan];
    if (!c || !l || !campOpen(c) || !lanternOpen(l)) return;
    S.lastCamp = c.id; S.lastLantern = l.id;
    EW.newRun({ lantern: l.id, camp: c.id, prep: Object.assign({}, S.meta.prep), relicPool: S.meta.relics.slice() });
    unlockJournal(0);
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
  // 칸 그림: 색 + 무늬(.pat-*) + 글자 한 자. 가방 칸·방법·도감이 같이 쓴다
  function itemChip(it, cls) {
    return '<span class="wood-chip ' + (cls || '') + '"><i class="pat-' + it.pat + '" style="background-color:var(' + it.col + ')"></i><b>' + esc(it.mark) + '</b></span>';
  }
  function renderSlots(R) {
    const sig = R.bag.map(function (s) { return s ? s.id + 'x' + s.n : '-'; }).join(',') + '|' + R.sel;
    if (sig === lastSlotSig) return;
    const before = lastSlotSig ? lastSlotSig.split('|')[0].split(',') : null;
    lastSlotSig = sig;
    let html = '', used = 0;
    for (let i = 0; i < EW.BAG; i++) {
      const s = R.bag[i];
      if (!s) { html += '<button class="wood-slot empty" disabled aria-label="빈 칸"></button>'; continue; }
      used++;
      const it = D.ITEM_MAP[s.id];
      const grew = before && before[i] !== s.id + 'x' + s.n && (before[i] === '-' || parseInt(before[i].split('x')[1], 10) < s.n);
      const isWood = !!D.WOOD_MAP[s.id];
      const sel = isWood && i === R.sel;
      const hint = it.food ? ' · 누르면 먹기' : (isWood ? (sel ? ' · 먼저 넣음' : ' · 누르면 먼저 넣을 장작') : '');
      html += '<button class="wood-slot' + (sel ? ' sel' : '') + (it.food ? ' food' : '') + (grew ? ' gain' : '') + '" data-slot="' + i + '" aria-pressed="' + sel + '" aria-label="' + esc(it.name) + ' ' + s.n + '개' + hint + '">' + itemChip(it) + '<em class="cnt">' + s.n + '</em></button>';
    }
    $('wood-slots').innerHTML = html;
    // 가방 머리 글: 장작 수 · 찬 칸 / 8. 칸이 다 차면 .full 로 색을 바꾼다
    const head = $('wood-head');
    head.textContent = '장작 ' + (EW.dryWood() + EW.countItem('wet')) + ' · 가방 ' + used + '/' + EW.BAG;
    head.classList.toggle('full', used >= EW.BAG);
  }

  // 하늘 호: index.html 의 호(가운데 100,46 · 가로 88 · 세로 40)를 따라 낮에는 해를, 밤에는 달을 옮긴다
  function drawSky(p, night, dusk) {
    const a = Math.PI * (1 - p);
    const x = 100 + 88 * Math.cos(a), y = 46 - 40 * Math.sin(a);
    const pos = 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')';
    if (night) { $('sky-moon').setAttribute('transform', pos); $('sky-sun').setAttribute('transform', 'translate(188 46)'); }
    else $('sky-sun').setAttribute('transform', pos);
    $('sky-moon').classList.toggle('hide', !night);
    $('sky-done').style.strokeDasharray = (p * 100).toFixed(1) + ' 100';
    const arc = $('sky-arc');
    arc.classList.toggle('near', night && p >= 0.85);
    arc.classList.toggle('day', !night);
    arc.classList.toggle('dusk', dusk > 0);
  }

  const FEED_LABEL = { fire: '불에 넣기', brazier: '화톳불에', lamp: '등불에 넣기', walk: '불로 가서 넣기' };
  EW.updateHud = function () {
    const R = EW.getRun();
    if (!R) return;
    const st = R.st;
    const night = isNight(R);
    $('fire-fill').style.width = (Math.max(0, R.fuel) / st.fuelMax * 100).toFixed(1) + '%';
    $('fire-num').textContent = Math.max(0, Math.ceil(R.fuel));
    $('fire-meter').classList.toggle('low', night && R.fuel < 20);
    $('hp-fill').style.width = (Math.max(0, R.hp) / st.maxHp * 100).toFixed(1) + '%';
    $('hp-num').textContent = Math.max(0, Math.ceil(R.hp));
    $('oil-fill').style.width = (R.oil / st.oilMax * 100).toFixed(1) + '%';
    $('oil-num').textContent = Math.ceil(R.oil);
    $('oil-meter').classList.toggle('low', night && R.oil <= 0);
    $('hunger-fill').style.width = (R.hunger / st.hungerMax * 100).toFixed(1) + '%';
    $('hunger-num').textContent = Math.ceil(R.hunger);
    $('hunger-meter').classList.toggle('low', R.hunger < 20);
    const len = night ? R.nightLen : EW.DAY_LEN;
    $('hud-night').textContent = R.day + '일째 ' + (night ? '밤' : '낮') + ' · 남은 ' + fmtTime(len - R.t);
    const dusk = EW.duskLevel();
    drawSky(Math.min(1, Math.max(0, R.t / len)), night, dusk);
    $('scr-game').classList.toggle('dusk', dusk > 0);
    $('hud-days').textContent = '버틴 날 ' + R.dawns;
    const ft = EW.feedTarget();
    const feed = $('btn-feed');
    feed.disabled = !ft;
    feed.classList.toggle('lamp', ft === 'lamp');
    feed.classList.toggle('go', R.goal === 'fire');
    $('feed-label').textContent = FEED_LABEL[ft] || '불에 넣기';
    const g = $('btn-gather');
    g.disabled = !EW.canGather() && !R.gather;
    g.classList.toggle('on', !!R.gather);
    $('btn-build').classList.toggle('hidden', !EW.canBuildHere());
    $('btn-adwood').classList.toggle('hidden', !EW.canAdWood());
    renderSlots(R);
  };

  // sub: 아래 작은 한 줄 (새 장작 알림 등). 있으면 조금 더 오래 보인다
  function banner(text, danger, sub) {
    const b = $('banner');
    b.textContent = text;
    if (sub) { const s = document.createElement('small'); s.textContent = sub; b.appendChild(s); }
    b.classList.remove('on', 'danger', 'long');
    void b.offsetWidth;
    b.classList.add('on');
    if (danger) b.classList.add('danger');
    if (sub) b.classList.add('long');
  }

  // ---------------- 첫날 안내 (해내야 넘어간다, 건너뛰기 있음) ----------------
  const TUT = [
    '나무 곁에서 ✋ 줍기/모으기를 누르고 있어 나무 한 그루를 베세요 (키보드 K)',
    '돌 3개를 모아 모닥불 옆에서 🔨 짓기 → 화톳불을 세우세요',
    '밤이 오면 등불을 들고 빛 밖으로 나가 장작 하나를 주워 와 🔥 불에 넣으세요',
    '잘했어요! 이제 며칠을 버틸 수 있을까요?'
  ];
  function updateTut() {
    const t = $('tut');
    if (G.tut < 0 || G.tut >= TUT.length) { t.classList.remove('on'); return; }
    $('tut-text').textContent = (G.tut < 3 ? (G.tut + 1) + '/3 · ' : '') + TUT[G.tut];
    $('btn-tut-skip').classList.toggle('hidden', G.tut >= 3);
    t.classList.add('on');
  }
  function endTut() { G.tut = -1; S.tutDone = true; save(); updateTut(); }
  function tutAdvance(from) {
    if (G.tut !== from) return;
    G.tut++;
    EW.sfx('card');
    updateTut();
    if (G.tut === 3) setTimeout(function () { if (G.tut === 3) endTut(); }, 4000);
  }

  // ---------------- 게임 사건 → 손맛·소리·화면 ----------------
  function itemNames(gives) { return gives.map(function (g) { return D.ITEM_MAP[g[0]].name + (g[1] > 1 ? ' ' + g[1] : ''); }).join(' · '); }
  EW.ev = function (name, d) {
    if (EW.testMode) return;
    const R = EW.getRun();
    const P = EW.PAL || {};
    switch (name) {
      case 'day': {
        // 장작이 처음 나오는 날 아침에는 무엇인지 한 줄 알려 준다
        const nw = D.WOODS.filter(function (w) { return (w.day || 1) === R.day; })[0];
        if (nw) banner(R.day + '일째 아침 · 새 장작: ' + nw.name, false, nw.intro);
        else banner(R.day + '일째 아침');
        if (nw) S.meta.seen.w[nw.id] = 1;
        EW.sfx('day');
        S.run = EW.snapshot(); save();
        break;
      }
      case 'wave':
        banner('그림자가 두 쪽에서 몰려온다!', true);
        EW.sfx('warn'); EW.vibrate(30);
        break;
      case 'adShow':
        openAd('inter');
        break;
      case 'dusk':
        banner('곧 밤이 와요', true);
        EW.sfx('warn'); EW.vibrate(40);
        break;
      case 'night':
        banner(d + '일째 밤 — ' + nightName(d));
        EW.sfx('night');
        break;
      case 'pick':
        S.meta.seen.w[d.type] = 1;
        EW.addNum(d.x, d.y, '+' + D.WOOD_MAP[d.type].name, P.fireHot);
        EW.burst(d.x, d.y, P.fire, 8, 120);
        EW.sfx('pick');
        break;
      case 'gather':
        S.meta.seen.n[d.node.id] = 1;
        d.gives.forEach(function (g) { S.meta.seen.w[g[0]] = 1; });
        EW.addNum(d.node.x, d.node.y - 30, '+' + itemNames(d.gives), P.fireHot, true);
        EW.burst(d.node.x, d.node.y - 10, P.good, 12, 140);
        EW.shakeIt(2);
        EW.sfx(d.node.id === 'tree' || d.node.id === 'pinetree' ? 'chop' : 'pick');
        if (d.node.id === 'tree' || d.node.id === 'pinetree') tutAdvance(0);
        break;
      case 'bagFull':
        EW.addNum(R.px, R.py - 40, '가방이 가득 찼다', P.danger);
        EW.sfx('warn');
        break;
      case 'goal':
        EW.addNum(R.px, R.py - 30, '모닥불로!', P.fire);
        break;
      case 'feedFire':
        EW.addNum(d.x, d.y - 50, '+' + Math.round(d.v) + ' 연료' + (d.relit ? ' · 다시 붙음' : ''), P.fireHot, true);
        EW.burst(d.x, d.y - 10, P.fire, 22, 220);
        EW.ring(d.x, d.y, P.fire, d.brazier ? 90 : EW.fireR());
        EW.flashIt(P.fire, 0.12);
        EW.shakeIt(4);
        EW.sfx('feedFire'); EW.vibrate(20);
        if (R.phase === 'night' && R.nightPicked > 0) tutAdvance(2);
        break;
      case 'feedLamp':
        EW.addNum(R.px, R.py - 34, '+' + Math.round(d.v) + ' 등불 연료', P.lamp, true);
        EW.burst(R.px, R.py, P.lamp, 18, 200);
        EW.ring(R.px, R.py, P.lamp, EW.lampR());
        EW.flashIt(P.lamp, 0.1);
        EW.shakeIt(3);
        EW.sfx('feedLamp'); EW.vibrate(20);
        break;
      case 'pileAdd':
        EW.addNum(d.p.x, d.p.y - 30, '+' + d.n + ' 쌓음', P.fireHot);
        EW.sfx('pick');
        break;
      case 'pileTake':
        EW.addNum(d.x, d.y - 30, '더미에서 한 개', P.fireHot);
        break;
      case 'dmg':
        if (S.settings.nums) EW.addNum(d.x, d.y - 12, Math.round(d.v), d.big ? P.fireHot : P.lamp, !!d.big);
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
        if (d.boss) { banner(d.b.name + ' 나타남', true); EW.sfx('boss'); EW.shakeIt(10); }
        break;
      case 'hurt':
        EW.addNum(d.x, d.y - 30, '-' + Math.max(1, Math.round(d.v)), P.danger, true);
        EW.flashIt(P.danger, 0.22);
        EW.shakeIt(4 + d.v);
        EW.sfx('hurt'); EW.vibrate(40);
        hudHurt();
        break;
      case 'dark':
        EW.addNum(d.x, d.y - 34, '-' + Math.max(1, Math.round(d.v)) + ' 어둠', P.danger);
        EW.flashIt(P.danger, 0.12);
        EW.sfx('hurt');
        hudHurt();
        break;
      case 'fireHit':
        EW.addNum(d.x + (Math.random() - 0.5) * 40, d.y - 36, '-' + Math.round(d.v) + (d.brazier ? ' 화톳불' : ' 연료'), P.danger, true);
        EW.burst(d.x, d.y - 8, P.muted, 10, 160);
        if (!d.brazier) { EW.flashIt(P.danger, 0.15); EW.shakeIt(5); }
        EW.sfx('fireHit');
        break;
      case 'fade':
        EW.burst(d.x, d.y, P.muted, 8, 100);
        break;
      case 'escape':
        EW.addNum(Math.max(40, Math.min(EW.W - 40, d.x)), Math.max(40, Math.min(EW.H - 40, d.y)), '불씨를 채어 갔다', P.danger);
        break;
      case 'brazierOut':
        EW.addNum(d.x, d.y - 30, '화톳불이 꺼졌다', P.muted, true);
        EW.sfx('out');
        break;
      case 'fireLow':
        banner('모닥불이 꺼져 간다!', true); EW.sfx('warn'); EW.vibrate(60);
        break;
      case 'relight':
        banner('재가 다시 타오른다!'); EW.sfx('revive'); EW.flashIt(P.fireHot, 0.4);
        break;
      case 'blink':
        EW.burst(d.x, d.y, P.muted, 6, 80);
        break;
      case 'lure':
        EW.addNum(d.x, d.y - 24, '등불에 끌림', P.lamp);
        EW.burst(d.x, d.y, P.lamp, 5, 70);
        break;
      case 'mire':
        EW.addNum(R.px, R.py - 48, '붙잡힘!', P.good);
        break;
      case 'frost':
        EW.addNum(R.px, R.py - 48, '얼어붙음! 등불 연료 빨리 닳음', P.text);
        EW.burst(R.px, R.py, P.text, 8, 90);
        EW.flashIt(P.text, 0.12);
        break;
      case 'fenceBreak':
        EW.burst(d.x, d.y, P.fireHot, 12, 160);
        EW.addNum(d.x, d.y - 26, '울타리가 막았다', P.fireHot);
        EW.shakeIt(3);
        EW.sfx('break');
        break;
      case 'trap':
        EW.addNum(d.e.x, d.e.y - 30, '묶임!', P.fireHot, true);
        EW.burst(d.b.x, d.b.y, P.text, 10, 120);
        EW.sfx('trap');
        break;
      case 'roast':
        EW.addNum(R.px, R.py - 40, '버섯이 구워졌다', P.fireHot);
        EW.sfx('pick');
        break;
      case 'eat':
        S.meta.seen.w[d.id] = 1;
        EW.addNum(R.px, R.py - 40, '냠 +' + Math.round(d.food * R.st.foodMul) + ' 배고픔', P.good, true);
        EW.sfx('eat');
        break;
      case 'full':
        EW.addNum(R.px, R.py - 40, '배부르다', P.muted);
        break;
      case 'raw':
        EW.addNum(R.px, R.py - 40, '버섯은 모닥불 빛 안에서 구워진다', P.muted);
        break;
      case 'buildOpen':
        renderBuild();
        show('ov-build', true);
        break;
      case 'buildClose':
        hide('ov-build', true);
        break;
      case 'built':
        S.meta.seen.b[d.id] = 1;
        EW.sfx('build'); EW.vibrate(30);
        if (d.obj) { EW.burst(d.obj.x, d.obj.y, P.fireHot, 18, 180); EW.addNum(d.obj.x, d.obj.y - 30, D.BUILD_MAP[d.id].name, P.fireHot, true); }
        else EW.ring(EW.FX, EW.FY, P.fireHot, EW.fireR());
        renderBuild();
        if (d.id === 'brazier') tutAdvance(1);
        checkAch(false);
        break;
      case 'down':
        openDown(d);
        break;
      case 'revive':
        banner('다시 일어났다'); EW.sfx('revive'); EW.flashIt(P.fireHot, 0.35);
        break;
      case 'adWood':
        EW.addNum(R.px, R.py - 40, '+마른 가지 3', P.fireHot, true);
        EW.sfx('pick');
        break;
      case 'dawn':
        EW.flashIt(P.fireHot, 0.45);
        d.enemies.forEach(function (e) { EW.burst(e.x, e.y, P.fireHot, 4, 100); });
        EW.sfx('dawn');
        S.meta.stats.nights++;
        unlockJournal(d.dawns);
        checkAch(false);
        save();
        // 사흘마다 새벽 카드 (openOffer 가 카드 차례인지 다시 본다)
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

  // ---------------- 짓기 ----------------
  function costText(c) {
    const p = [];
    if (c.stone) p.push('돌 ' + c.stone);
    if (c.grass) p.push('풀 ' + c.grass);
    if (c.wood) p.push('장작 ' + c.wood);
    return p.join('·');
  }
  function renderBuild() {
    const R = EW.getRun();
    if (!R) return;
    $('build-sub').textContent = '가방: 돌 ' + EW.countItem('stone') + ' · 풀 ' + EW.countItem('grass') + ' · 마른 장작 ' + EW.dryWood() + ' — 지은 것은 다음 날에도 남는다 (1~6, 닫기 B)';
    $('build-list').innerHTML = D.BUILDS.map(function (b, i) {
      const inf = EW.buildInfo(b.id);
      return '<button class="offer build-item' + (inf.ok ? '' : ' no') + '" data-build="' + b.id + '"' + (inf.ok ? '' : ' disabled') + '>' +
        '<span class="tag">' + (i + 1) + ' · ' + esc(costText(b.cost)) + ' · 지음 ' + inf.n + '/' + inf.max + '</span>' +
        '<span class="name"><i aria-hidden="true">' + b.icon + '</i> ' + esc(b.name) + '</span><span class="desc">' + esc(b.desc) + '</span>' +
        (inf.ok ? '' : '<span class="why">' + esc(inf.why) + '</span>') + '</button>';
    }).join('');
  }

  // ---------------- 쓰러짐·광고 자리 ----------------
  const DOWN_TITLE = { fire: '모닥불이 꺼졌다', hp: '불지기가 쓰러졌다', hunger: '배가 고파 쓰러졌다', dark: '어둠 속에서 쓰러졌다' };
  function openDown(why) {
    $('down-title').textContent = DOWN_TITLE[why] || '쓰러졌다';
    $('down-why').textContent = '하루 한 번, 광고를 보고 체력 절반·모닥불 연료 절반으로 다시 일어날 수 있다.';
    EW.sfx('lose'); EW.vibrate(80);
    show('ov-down', true);
  }
  let adTick = 0;
  // 광고 자리: 출시 때 광고 SDK 를 붙일 곳. 지금은 2초 뒤 닫을 수 있고, 닫으면 보상을 준다
  function openAd(kind) {
    G.adFor = kind; G.adOpen = true;
    $('ad-title').textContent = kind === 'wood' ? '광고 보고 장작 3개' : (kind === 'revive' ? '광고 보고 다시 일어나기' : '광고');
    $('ad-text').textContent = '광고 자리 — 출시 때 여기에 광고가 나온다.' + (kind === 'inter' ? ' 사흘마다 낮이 시작될 때 한 번.' : ' 닫으면 보상을 받는다.');
    const btn = $('btn-ad-close');
    const total = S.settings.reduce ? 0 : 2000;
    const t0 = Date.now();
    btn.disabled = total > 0;
    $('ad-fill').style.width = total > 0 ? '0%' : '100%';
    clearInterval(adTick);
    if (total > 0) {
      adTick = setInterval(function () {
        const p = Math.min(1, (Date.now() - t0) / total);
        $('ad-fill').style.width = (p * 100).toFixed(0) + '%';
        $('ad-progress').setAttribute('aria-valuenow', String(Math.round(p * 100)));
        if (p >= 1) { clearInterval(adTick); btn.disabled = false; }
      }, 100);
    }
    show('ov-ad', true);
  }
  function closeAdUI() {
    if ($('btn-ad-close').disabled) return;
    clearInterval(adTick);
    hide('ov-ad', true);
    G.adOpen = false;
    const k = G.adFor;
    G.adFor = '';
    if (k === 'inter') EW.closeAd();
    else if (k === 'wood') EW.adWood();
    else if (k === 'revive') EW.revive();
  }

  // ---------------- 새벽 고르기 ----------------
  function openOffer() {
    const R = EW.getRun();
    if (!R || (R.phase !== 'cards' && R.phase !== 'relic')) return;
    G.focusOffer = 0;
    renderOffer();
    show('ov-cards', true);
  }
  function renderOffer() {
    const R = EW.getRun();
    if (!R) return;
    const relic = R.phase === 'relic';
    $('cards-title').textContent = relic ? '유물을 하나 고르세요' : R.dawns + '번째 밤을 버텼다 — 새벽';
    $('cards-sub').textContent = relic ? '이번 판 끝까지 함께한다' : '사흘마다 오는 강화 카드, 셋 중 하나를 고르세요 (1·2·3)';
    const RW = { 1: '흔함', 2: '드묾', 3: '귀함' };
    $('card-list').innerHTML = R.offer.map(function (id, i) {
      const c = relic ? D.RELIC_MAP[id] : D.CARD_MAP[id];
      const cls = relic ? 'relic' : 'r' + c.r;
      const tag = relic ? '유물' : RW[c.r];
      const n = relic ? 0 : R.cards.filter(function (x) { return x === id; }).length;
      return '<button class="offer ' + cls + (i === G.focusOffer ? ' focus' : '') + '" data-offer="' + i + '"' + (i === G.focusOffer ? ' aria-current="true"' : '') + '>' +
        '<span class="tag">' + (i + 1) + ' · ' + tag + (n ? ' · 가진 것 ' + n : '') + '</span><span class="name">' + esc(c.name) + '</span><span class="desc">' + esc(c.desc) + '</span></button>';
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
    if (R.phase !== 'cards') { hide('ov-cards', true); lastSlotSig = ''; }
  }

  // ---------------- 판 끝 ----------------
  const WHY = { fire: '모닥불이 꺼졌다. 그림자가 야영지를 덮었다.', hp: '불지기가 쓰러졌다.', hunger: '배가 고파 쓰러졌다.', dark: '등불 연료가 떨어진 채 어둠 속에서 쓰러졌다.', quit: '스스로 불을 끄고 떠났다.' };
  function finishRun(won, why) {
    const R = EW.getRun();
    const m = S.meta, st = m.stats;
    const score = EW.score(R);
    const prevBest = st.bestScore, prevDays = st.bestDays;
    const lansBefore = D.LANTERNS.filter(lanternOpen).length, campsBefore = D.CAMPS.filter(campOpen).length;
    // 죽으면 그 판은 끝이다: 지은 것·가방은 사라지고 버틴 날 수만 기록에 남는다 (야영지마다 가장 오래 버틴 날)
    m.campBest[R.camp] = Math.max(m.campBest[R.camp] || 0, R.dawns);
    st.runs++;
    st.kills += R.kills; st.bossKills += R.bossKills; st.fedFire += R.fedFire; st.fedLamp += R.fedLamp;
    st.embersTotal += R.embers; st.playTime += R.time;
    st.gathered += R.gathered; st.trees += R.trees; st.built += R.built; st.eaten += R.eaten; st.trapped += R.trapped;
    if (why === 'fire') st.fireOut++; else if (why !== 'quit') st.fell++;
    st.bestDays = Math.max(st.bestDays, R.dawns);
    st.bestScore = Math.max(st.bestScore, score);
    m.embers += R.embers;
    if (R.daily && R.daily === S.daily.date) {
      S.daily.done = true; S.daily.score = score; S.daily.dawns = R.dawns;
      S.daily.best = Math.max(S.daily.best, score);
    }
    S.run = null;
    const newAch = checkAch(true);
    save();
    EW.sfx(R.dawns > prevDays ? 'win' : 'lose');
    if (why !== 'quit') { EW.flashIt(EW.PAL.danger, 0.4); EW.shakeIt(12); EW.vibrate(120); }
    $('res-days').textContent = R.dawns;
    const t = $('res-title');
    t.textContent = why === 'quit' ? '불을 껐다' : R.day + '일째 ' + (isNight(R) ? '밤' : '낮') + '에 끝났다';
    t.className = 'res-title ' + (R.dawns > prevDays ? 'win' : 'lose');
    $('res-why').textContent = (WHY[why] || '') + (R.dawns > prevDays ? ' 새 기록!' : '');
    const camp = D.CAMP_MAP[R.camp], lan = D.LANTERN_MAP[R.lantern];
    const lines = [
      ['야영지 · 등불', (camp ? camp.name : '') + ' · ' + (lan ? lan.name : '')],
      ['버틴 날', R.dawns + '일'], ['가장 오래 버틴 날', Math.max(prevDays, R.dawns) + '일'],
      ['지은 것', R.built], ['모은 자원', R.gathered], ['벤 나무', R.trees], ['쓰러뜨린 그림자', R.kills],
      ['불에 넣은 장작', R.fedFire], ['등불에 넣은 장작', R.fedLamp],
      ['얻은 불씨', R.embers], ['걸린 시간', fmtTime(R.time)], ['강화 카드', R.cards.length], ['점수', score]
    ];
    $('res-lines').innerHTML = lines.map(function (l, i) {
      const best = i === lines.length - 1 && score > prevBest;
      return '<div' + (best ? ' class="best"' : '') + '><span>' + esc(l[0]) + '</span><b>' + esc(l[1]) + (best ? ' 새 기록!' : '') + '</b></div>';
    }).join('');
    const news = newAch.map(function (a) { return '업적: ' + a.name; }).concat(newJournal.map(function (j) { return '야영 일지: ' + j.title; }));
    if (D.CAMPS.filter(campOpen).length > campsBefore) news.push('새 야영지가 열렸다');
    if (D.LANTERNS.filter(lanternOpen).length > lansBefore) news.push('새 등불이 열렸다');
    newJournal = [];
    $('res-new').innerHTML = news.map(esc).join('<br>');
    G.shareText = shareText(R, why, score);
    $('share-box').value = G.shareText;
    $('share-box').classList.add('hidden');
    $('share-msg').textContent = '';
    G.tut = -1; updateTut();
    setTimeout(function () { show('scr-result', true); }, S.settings.reduce ? 0 : 700);
  }

  // ---------------- 결과 공유 문구 ----------------
  function shareText(R, why, score) {
    const out = [
      'Ember Watch — ' + R.dawns + '일을 버텼다' + (R.daily ? ' (오늘의 도전 ' + R.daily + ')' : ''),
      R.day + '일째 ' + (isNight(R) ? '밤' : '낮') + ' · ' + (WHY[why] || ''),
      '점수 ' + score + ' · 지은 것 ' + R.built + ' · 그림자 ' + R.kills,
      '불에 넣은 장작 ' + R.fedFire + ' · 등불 ' + R.fedLamp + ' · ' + fmtTime(R.time)
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
  function unlockJournal(dawns) {
    D.JOURNAL.forEach(function (j, i) {
      if (j.d <= dawns && !S.meta.journal[i]) { S.meta.journal[i] = 1; newJournal.push(j); }
    });
  }
  function total(key, R, end) { return S.meta.stats[key] + (end ? 0 : (R[key] || 0)); }
  const ACH_CHECK = {
    a_first: function (R) { return R.dawns >= 1; },
    a_d3: function (R) { return R.dawns >= 3; },
    a_d5: function (R) { return R.dawns >= 5; },
    a_d10: function (R) { return R.dawns >= 10; },
    a_d20: function (R) { return R.dawns >= 20; },
    a_boss: function (R) { return R.bossKills > 0; },
    a_k100: function (R, end) { return total('kills', R, end) >= 100; },
    a_k1000: function (R, end) { return total('kills', R, end) >= 1000; },
    a_fire50: function (R, end) { return total('fedFire', R, end) >= 50; },
    a_lamp20: function (R, end) { return total('fedLamp', R, end) >= 20; },
    a_brazier4: function (R) { return R.builds.filter(function (b) { return b.kind === 'brazier'; }).length >= 4; },
    a_fence8: function (R) { return R.flags.fences >= 8; },
    a_trap10: function (R, end) { return total('trapped', R, end) >= 10; },
    a_fireup3: function (R) { return R.fireLv >= 3; },
    a_lamp3: function (R) { return R.lampLv >= 3; },
    a_pile6: function (R) { return !!R.flags.pileFull; },
    a_tree50: function (R, end) { return total('trees', R, end) >= 50; },
    a_eat30: function (R, end) { return total('eaten', R, end) >= 30; },
    a_close: function (R) { return !!R.flags.close; },
    a_runs10: function () { return S.meta.stats.runs >= 10; }
  };
  const EMPTY_RUN = { dawns: 0, kills: 0, bossKills: 0, fedFire: 0, fedLamp: 0, trapped: 0, trees: 0, eaten: 0, builds: [], fireLv: 0, lampLv: 0, flags: {} };
  function checkAch(end) {
    const R = EW.getRun();
    const got = [];
    D.ACHS.forEach(function (a) {
      if (S.meta.ach[a.id]) return;
      const f = ACH_CHECK[a.id];
      let ok = false;
      try { ok = !!(f && f(R || EMPTY_RUN, end)); } catch (e) { ok = false; }
      if (ok) { S.meta.ach[a.id] = 1; got.push(a); if (!end && !EW.testMode) banner('업적: ' + a.name); }
    });
    return got;
  }

  // ---------------- 야영지 ----------------
  function refreshCamp() {
    $('camp-embers').textContent = '불씨 ' + S.meta.embers;
    const tabs = [['relic', '유물'], ['prep', '야영 준비']];
    $('camp-tabs').innerHTML = tabs.map(function (t) { return '<button class="btn" role="tab" data-tab="' + t[0] + '" aria-selected="' + (G.campTab === t[0]) + '">' + t[1] + '</button>'; }).join('');
    let html = '';
    if (G.campTab === 'relic') {
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
    if (kind === 'relic') {
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
    save();
    EW.sfx('buy'); EW.vibrate(30);
    refreshCamp();
    const el = document.querySelector('[data-buy="' + spec + '"]');
    if (el) el.classList.add('picked');
  }

  // ---------------- 도감 ----------------
  function refreshCodex() {
    const tabs = [['e', '그림자'], ['w', '장작·재료'], ['c', '강화'], ['r', '유물'], ['b', '야영']];
    $('codex-tabs').innerHTML = tabs.map(function (t) { return '<button class="btn" role="tab" data-tab="' + t[0] + '" aria-selected="' + (G.codexTab === t[0]) + '">' + t[1] + '</button>'; }).join('');
    const seen = S.meta.seen;
    let list = [], all = 0, have = 0;
    function card(ok, name, desc, tag) {
      all++; if (ok) have++;
      return '<div class="item' + (ok ? '' : ' locked') + '"><span class="name">' + (ok ? esc(name) : '???') + '</span><span class="desc">' + (ok ? esc(desc) : '아직 만나지 못했다') + '</span>' + (tag && ok ? '<span class="tag">' + esc(tag) + '</span>' : '') + '</div>';
    }
    const TG = { fire: '가장 가까운 불을 노림', player: '불지기를 노림', mix: '가까운 쪽을 노림' };
    if (G.codexTab === 'e') list = D.ENEMIES.map(function (e) { return card(seen.e[e.id], e.name + (e.boss ? ' (큰 그림자)' : ''), e.desc, '몸 글자 ' + e.mark + ' · 체력 ' + e.hp + ' · ' + TG[e.tg] + (e.hit ? ' · 불에 닿으면 -' + e.hit : '')); });
    else if (G.codexTab === 'w') list = D.ITEMS.map(function (it) { const w = D.WOOD_MAP[it.id]; return card(seen.w[it.id], it.name, w ? w.desc : it.desc, w ? '불 +' + w.fire + ' · 등불 +' + w.lamp + ' · 칸 글자 ' + it.mark : '칸 글자 ' + it.mark); });
    else if (G.codexTab === 'c') list = D.CARDS.map(function (c) { return card(seen.c[c.id], c.name, c.desc, ['', '흔함', '드묾', '귀함'][c.r]); });
    else if (G.codexTab === 'r') list = D.RELICS.map(function (r) { return card(seen.r[r.id], r.name, r.desc, ''); });
    else {
      list = D.BUILDS.map(function (b) { return card(seen.b[b.id], b.icon + ' ' + b.name, b.desc, costText(b.cost) + ' · 최대 ' + b.max); })
        .concat(D.NODES.map(function (n) { return card(seen.n[n.id], n.name, n.desc, '모으는 데 ' + n.time + '초'); }));
    }
    $('codex-list').innerHTML = list.join('');
    $('codex-count').textContent = have + ' / ' + all;
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
        return '<div class="item' + (ok ? '' : ' locked') + '"><span class="name">' + (ok ? esc(j.title) : '???') + '</span><span class="desc">' + (ok ? esc(j.text) : (j.d === 0 ? '처음 시작하면' : '밤 ' + j.d + '개를 버티면') + ' 열린다') + '</span></div>';
      }).join('');
    } else {
      const st = S.meta.stats;
      const rows = [
        ['한 판 수', st.runs], ['가장 오래 버틴 날', st.bestDays], ['버틴 밤 모두', st.nights], ['평균 버틴 날', st.runs ? (st.nights / st.runs).toFixed(1) : '0'],
        ['쓰러뜨린 그림자', st.kills], ['버텨 낸 큰 그림자', st.bossKills], ['불에 넣은 장작', st.fedFire], ['등불에 넣은 장작', st.fedLamp],
        ['모은 자원', st.gathered], ['벤 나무', st.trees], ['지은 것', st.built], ['먹은 것', st.eaten], ['덫에 묶은 그림자', st.trapped],
        ['모은 불씨', st.embersTotal], ['최고 점수', st.bestScore], ['불이 꺼진 판', st.fireOut], ['쓰러진 판', st.fell], ['모두 한 시간', fmtTime(st.playTime)],
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
    ['reduce', '움직임 줄이기', 'toggle'], ['nums', '피해 숫자 보기', 'toggle'], ['hints', '첫날 안내', 'toggle']
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
  // 시작 화면에는 세 버튼만 두므로 오늘의 도전·야영 준비·도감·기록은 설정의 '더 보기'에서 연다 (판 도중 멈춤에서 열면 숨긴다)
  function openSettings(from) {
    G.returnTo = from; refreshSettings(); refreshTitle();
    $('wipe-confirm').classList.add('hidden');
    $('more-box').classList.toggle('hidden', from === 'pause');
    show('scr-settings');
  }
  function openHelp(from) { G.returnTo = from; show('scr-help'); }
  function backFromSub() {
    if (G.returnTo === 'pause') { show('scr-game'); setTimeout(function () { show('ov-pause', true); }, S.settings.reduce ? 0 : 230); }
    else { refreshTitle(); show('scr-title'); }
  }

  // ---------------- 멈춤 ----------------
  function pauseGame() {
    const R = EW.getRun();
    if (!R || (R.phase !== 'day' && R.phase !== 'night') || current !== 'scr-game' || G.paused || G.adOpen) return;
    G.paused = true; G.quitArmed = false;
    EW.gatherRelease();
    $('btn-quit').textContent = '그만두기';
    const cards = R.cards.map(function (id) { return D.CARD_MAP[id].name; });
    const relics = R.relics.map(function (id) { return D.RELIC_MAP[id].name; });
    const bs = D.BUILDS.map(function (b) { const n = EW.buildInfo(b.id).n; return n ? b.name + ' ' + n : ''; }).filter(Boolean);
    const camp = D.CAMP_MAP[R.camp], lan = D.LANTERN_MAP[R.lantern];
    $('pause-info').innerHTML = (R.daily ? '오늘의 도전 ' + esc(R.daily) + '<br>' : '') + esc((camp ? camp.name : '') + ' · ' + (lan ? lan.name : '')) + '<br>' + R.day + '일째 ' + (R.phase === 'night' ? '밤' : '낮') + ' · 버틴 날 ' + R.dawns +
      '<br>지은 것: ' + (bs.length ? esc(bs.join(', ')) : '없음') +
      '<br>카드: ' + (cards.length ? esc(cards.join(', ')) : '없음') + '<br>유물: ' + (relics.length ? esc(relics.join(', ')) : '없음');
    show('ov-pause', true);
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
    // 출발 준비: ←·→ 야영지, ↑·↓ 등불
    if (current === 'scr-prep' && down) {
      const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[code];
      if (step) {
        if (step[0]) pickCamp(prepCamp + step[0], true); else pickLan(prepLan + step[1], true);
        ev.preventDefault();
        return;
      }
    }
    if (current === 'scr-game' && !G.paused && !G.adOpen && R) {
      const live = R.phase === 'day' || R.phase === 'night';
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].indexOf(code) >= 0) {
        keys[code] = down;
        if (live && !(R.phase === 'build')) { keyMove(); ev.preventDefault(); return; }
      }
      if (code === 'KeyK' || code === 'Space') {
        if (live) {
          if (down && !ev.repeat) { EW.audioInit(); EW.gatherPress(); }
          if (!down) EW.gatherRelease();
          ev.preventDefault();
          return;
        }
      }
      if (!down) return;
      if (live) {
        if (code === 'KeyJ' || code === 'KeyQ') { EW.audioInit(); EW.feed(); ev.preventDefault(); }
        else if (code === 'KeyB') { EW.openBuild(); ev.preventDefault(); }
        else if (code === 'KeyE') { EW.eat(); ev.preventDefault(); }
        else if (/^Digit[1-8]$/.test(code)) { EW.useSlot(parseInt(code.slice(5), 10) - 1); lastSlotSig = ''; }
        else if (code === 'KeyP' || code === 'Escape') { pauseGame(); ev.preventDefault(); }
      } else if (R.phase === 'build') {
        if (/^Digit[1-6]$/.test(code)) { EW.build(D.BUILDS[parseInt(code.slice(5), 10) - 1].id); ev.preventDefault(); }
        else if (code === 'KeyB' || code === 'Escape') { EW.closeBuild(); ev.preventDefault(); }
      } else if ((R.phase === 'cards' || R.phase === 'relic') && $('ov-cards').classList.contains('open')) {
        const n = R.offer.length;
        if (/^Digit[1-3]$/.test(code)) { chooseOffer(parseInt(code.slice(5), 10) - 1); ev.preventDefault(); }
        else if (code === 'ArrowLeft' || code === 'ArrowUp') { G.focusOffer = (G.focusOffer + n - 1) % n; renderOffer(); ev.preventDefault(); }
        else if (code === 'ArrowRight' || code === 'ArrowDown') { G.focusOffer = (G.focusOffer + 1) % n; renderOffer(); ev.preventDefault(); }
        else if (code === 'Enter') { chooseOffer(G.focusOffer); ev.preventDefault(); }
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
    on('btn-settings', function () { openSettings('title'); });
    on('btn-camp', function () { refreshCamp(); show('scr-camp'); });
    on('btn-codex', function () { refreshCodex(); show('scr-codex'); });
    on('btn-records', function () { refreshRecords(); show('scr-records'); });
    on('btn-prep-back', function () { refreshTitle(); show('scr-title'); });
    on('btn-camp-prev', function () { pickCamp(prepCamp - 1, true); });
    on('btn-camp-next', function () { pickCamp(prepCamp + 1, true); });
    on('btn-go', startRun, true);
    on('btn-help-back', backFromSub);
    on('btn-settings-back', backFromSub);
    // 야영 준비·도감·기록은 설정의 '더 보기'에서 열었으니 설정으로 돌아간다
    on('btn-camp-back', function () { openSettings('title'); });
    on('btn-codex-back', function () { openSettings('title'); });
    on('btn-records-back', function () { openSettings('title'); });
    on('btn-again', function () { openPrep(); }, true);
    on('btn-home', function () { refreshTitle(); show('scr-title'); });
    on('btn-share', copyShare);
    on('btn-pause', pauseGame);
    on('btn-resume', resumeGame);
    on('btn-pause-help', function () { openHelp('pause'); });
    on('btn-pause-settings', function () { openSettings('pause'); });
    on('btn-quit', function () {
      if (!G.quitArmed) { G.quitArmed = true; $('btn-quit').textContent = '한 번 더 누르면 그만둡니다'; return; }
      G.quitArmed = false; G.paused = false;
      hide('ov-pause', true);
      EW.giveUp();
    }, true);
    on('btn-feed', function () { EW.feed(); }, true);
    on('btn-build', function () { EW.openBuild(); }, true);
    on('btn-build-close', function () { EW.closeBuild(); });
    on('btn-adwood', function () { if (EW.canAdWood()) { EW.gatherRelease(); openAd('wood'); } });
    on('btn-revive', function () { hide('ov-down', true); openAd('revive'); }, true);
    on('btn-down-end', function () { hide('ov-down', true); EW.endDown(); }, true);
    on('btn-ad-close', closeAdUI, true);
    on('btn-tut-skip', endTut);
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

    // 줍기/모으기는 누르고 있는 동안 모은다 (손을 떼면 멈춘다)
    const gb = $('btn-gather');
    gb.addEventListener('pointerdown', function (ev) {
      if (gb.disabled) return;
      EW.audioInit(); EW.sfx('click'); EW.vibrate(10);
      EW.gatherPress();
      try { gb.setPointerCapture(ev.pointerId); } catch (e) { /* 무시 */ }
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { gb.addEventListener(t, function () { EW.gatherRelease(); }); });

    // 목록 안 버튼 (누를 때마다 다시 그리므로 위임)
    function delegate(id, attr, fn) {
      $(id).addEventListener('click', function (ev) {
        const b = ev.target.closest('[' + attr + ']');
        if (!b || b.disabled || lock) return;
        EW.audioInit(); EW.sfx('click');
        fn(b.getAttribute(attr), b);
      });
    }
    // 출발 준비: 카드를 누르거나 옆으로 밀어 멈춘 가운데 카드를 고른다
    $('camp-track').addEventListener('click', function (ev) {
      const b = ev.target.closest('[data-camp]');
      if (!b || lock) return;
      EW.audioInit(); EW.sfx('click');
      pickCamp(parseInt(b.getAttribute('data-camp'), 10) || 0, true);
    });
    delegate('lan-track', 'data-lan', function (v) { pickLan(parseInt(v, 10) || 0, true); });
    watchSwipe('camp-track', function (i) { if (i !== prepCamp) { prepCamp = i; updatePrepSel(); } });
    watchSwipe('lan-track', function (i) { if (i !== prepLan) { prepLan = i; updatePrepSel(); } });
    delegate('card-list', 'data-offer', function (v) { chooseOffer(parseInt(v, 10) || 0); });
    delegate('build-list', 'data-build', function (v) { EW.build(v); renderBuild(); });
    delegate('camp-list', 'data-buy', buy);
    delegate('camp-tabs', 'data-tab', function (v) { G.campTab = v; refreshCamp(); });
    delegate('codex-tabs', 'data-tab', function (v) { G.codexTab = v; refreshCodex(); });
    delegate('rec-tabs', 'data-tab', function (v) { G.recTab = v; refreshRecords(); });
    delegate('settings-list', 'data-set', toggleSetting);
    delegate('wood-slots', 'data-slot', function (v) { EW.useSlot(parseInt(v, 10) || 0); lastSlotSig = ''; EW.requestDraw(); });

    const cv = $('cv');
    cv.addEventListener('pointerdown', joyStart);
    cv.addEventListener('pointermove', joyMove);
    cv.addEventListener('pointerup', joyEnd);
    cv.addEventListener('pointercancel', joyEnd);
    window.addEventListener('keydown', function (e) { onKey(e, true); });
    window.addEventListener('keyup', function (e) { onKey(e, false); });
    window.addEventListener('pointerdown', function () { EW.audioInit(); }, { once: true });
    document.addEventListener('visibilitychange', function () { if (document.hidden) pauseGame(); });

    $('help-woods').innerHTML = D.ITEMS.map(function (it) {
      const w = D.WOOD_MAP[it.id];
      return '<div>' + itemChip(it, 'mini') + '<b>' + esc(it.name) + '</b> ' + esc(w ? w.desc : it.desc) + '</div>';
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
    return !!R && current === 'scr-game' && !G.paused && !G.rotPaused && !G.adOpen && (R.phase === 'day' || R.phase === 'night');
  };
})();
