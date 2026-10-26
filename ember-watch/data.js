// Ember Watch — 콘텐츠 데이터 (지역·밤·그림자·장작·강화·유물·등불·야영 준비·업적·야영 일지)
window.EW_DATA = (function () {
  'use strict';

  // 지역 5 — 땅·무늬·어둠 색은 style.css :root 의 `--land-*` 변수 이름(디자인 규칙 `색 조합`의 그림 색). darkA 는 어둠의 짙기
  const REGIONS = [
    {
      id: 'pine', name: '솔숲 야영지', short: '솔숲',
      desc: '바람이 잔잔한 소나무 숲. 그림자들이 아직 서툴다.',
      rule: '특별한 규칙 없음',
      ground: '--land-pine', deco: '--land-pine-deco', dark: '--land-pine-dark', darkA: 0.93,
      mods: [], hpMul: 1, spdMul: 1, spawnMul: 1, logMul: 1,
      enemies: ['wisp', 'crawler', 'moth', 'stalker', 'gnawer', 'splitter', 'dasher', 'howler', 'brute'],
      woods: { twig: 4, oak: 3, pine: 2, birch: 1, ember: 1 },
      boss: 'b_pine'
    },
    {
      id: 'marsh', name: '안개 늪', short: '늪',
      desc: '물기가 많아 등불 기름이 빨리 닳는다. 젖은 장작이 흔하다.',
      rule: '등불 기름이 15% 빨리 닳는다 · 그림자가 조금 느리다',
      ground: '--land-marsh', deco: '--land-marsh-deco', dark: '--land-marsh-dark', darkA: 0.94,
      mods: [['lampDrain', 'mul', 1.15]], hpMul: 1, spdMul: 0.95, spawnMul: 1, logMul: 1,
      enemies: ['wisp', 'moth', 'mire', 'drinker', 'splitter', 'healer', 'shell', 'phantom', 'brute'],
      woods: { twig: 3, wet: 4, oak: 2, silver: 1, ember: 1 },
      boss: 'b_marsh'
    },
    {
      id: 'snow', name: '눈 덮인 고개', short: '고개',
      desc: '찬바람에 모닥불이 빨리 줄어든다. 숯덩이를 아껴 쓴다.',
      rule: '모닥불이 15% 빨리 탄다',
      ground: '--land-snow', deco: '--land-snow-deco', dark: '--land-snow-dark', darkA: 0.93,
      mods: [['fireBurn', 'mul', 1.15]], hpMul: 1, spdMul: 1, spawnMul: 1, logMul: 1,
      enemies: ['crawler', 'moth', 'frost', 'dasher', 'shell', 'gnawer', 'dimmer', 'howler', 'brute'],
      woods: { oak: 3, wet: 2, charcoal: 2, birch: 2, silver: 1 },
      boss: 'b_snow'
    },
    {
      id: 'canyon', name: '붉은 협곡', short: '협곡',
      desc: '나무가 귀한 바위 골짜기. 그림자가 빠르고 불씨 도둑이 많다.',
      rule: '장작이 15% 덜 나온다 · 그림자가 8% 빠르다',
      ground: '--land-canyon', deco: '--land-canyon-deco', dark: '--land-canyon-dark', darkA: 0.93,
      mods: [], hpMul: 1, spdMul: 1.08, spawnMul: 1, logMul: 0.85,
      enemies: ['crawler', 'ember_thief', 'dasher', 'gnawer', 'stalker', 'shell', 'splitter', 'dimmer', 'brute'],
      woods: { charcoal: 3, twig: 3, pine: 2, ember: 2 },
      boss: 'b_canyon'
    },
    {
      id: 'village', name: '잠든 마을터', short: '마을터',
      desc: '사람이 떠난 빈 마을. 그림자가 질기고 서로를 돕는다.',
      rule: '그림자 체력 15% 많음 · 조금 더 자주 온다',
      ground: '--land-village', deco: '--land-village-deco', dark: '--land-village-dark', darkA: 0.94,
      mods: [], hpMul: 1.15, spdMul: 1, spawnMul: 0.92, logMul: 1,
      enemies: ['wisp', 'phantom', 'drinker', 'ember_thief', 'healer', 'dimmer', 'howler', 'frost', 'brute'],
      woods: { oak: 2, twig: 2, silver: 2, birch: 2, ember: 1, charcoal: 1 },
      boss: 'b_village'
    }
  ];

  // 밤 10 — 한 판은 밤 10개. 밤마다 그림자가 더 자주, 더 질기게 온다.
  const NIGHTS = [
    { n: 1, name: '바람 없는 밤', spawn: 2.6, hpMul: 1.0, burn: 0.40 },
    { n: 2, name: '서늘한 밤', spawn: 2.3, hpMul: 1.04, burn: 0.42 },
    { n: 3, name: '긴 그림자의 밤', spawn: 2.1, hpMul: 1.08, burn: 0.44 },
    { n: 4, name: '젖은 밤', spawn: 1.9, hpMul: 1.12, burn: 0.46 },
    { n: 5, name: '큰 그림자의 밤', spawn: 1.8, hpMul: 1.16, burn: 0.48, elite: true },
    { n: 6, name: '달 없는 밤', spawn: 1.65, hpMul: 1.2, burn: 0.50 },
    { n: 7, name: '울음의 밤', spawn: 1.5, hpMul: 1.25, burn: 0.52 },
    { n: 8, name: '얼어붙는 밤', spawn: 1.4, hpMul: 1.3, burn: 0.54 },
    { n: 9, name: '가장 긴 밤', spawn: 1.3, hpMul: 1.35, burn: 0.56 },
    { n: 10, name: '마지막 밤', spawn: 1.2, hpMul: 1.4, burn: 0.58, boss: true }
  ];

  // 그림자 18 + 우두머리 5
  // tg: fire(모닥불을 노림) / player(불지기를 노림) / mix(가까운 쪽)
  // sp: split 갈라짐, drink 기름 빨기, dim 빛 가림, dash 돌진, armor 불빛에 강함, frost 얼림, mire 붙잡음,
  //     thief 불씨 훔쳐 달아남, call 부르기, heal 고치기, blink 순간 이동, eat2 두 배로 먹음
  // col: style.css :root 의 그림자 몸 색 `--shade-*` 변수 이름(디자인 규칙 `색 조합`의 그림 색)
  // mark: 몸에 쓰는 글자 한 자 — 같은 색 그림자도 글자로 구분한다(색만으로 구분하지 않게)
  const ENEMIES = [
    { id: 'wisp', name: '떠도는 그을음', mark: '떠',desc: '가볍게 떠서 모닥불로 곧장 간다.', hp: 14, spd: 62, dmg: 6, eat: 3, tg: 'fire', r: 11, ember: 1, sp: [], col: '--shade-ash' },
    { id: 'crawler', name: '기는 재', mark: '기',desc: '땅에 붙어 느리게 기어 온다. 조금 질기다.', hp: 24, spd: 42, dmg: 8, eat: 4, tg: 'fire', r: 13, ember: 1, sp: [], col: '--shade-soot' },
    { id: 'moth', name: '재나방', mark: '나',desc: '빠르게 날아와 불지기를 문다. 무리 지어 다닌다.', hp: 9, spd: 96, dmg: 5, eat: 1, tg: 'player', r: 8, ember: 1, sp: [], col: '--shade-moth' },
    { id: 'stalker', name: '눈 달린 덤불', mark: '덤',desc: '불지기를 끈질기게 따라온다.', hp: 30, spd: 52, dmg: 10, eat: 2, tg: 'player', r: 14, ember: 2, sp: [], col: '--shade-moss' },
    { id: 'gnawer', name: '숯먹이', mark: '숯',desc: '모닥불에 붙으면 두 배로 먹어 치운다.', hp: 26, spd: 46, dmg: 6, eat: 4, tg: 'fire', r: 13, ember: 2, sp: ['eat2'], col: '--shade-rust' },
    { id: 'splitter', name: '갈라지는 연기', mark: '갈',desc: '쓰러지면 연기 조각 둘로 갈라진다.', hp: 30, spd: 44, dmg: 7, eat: 3, tg: 'fire', r: 15, ember: 2, sp: ['split'], col: '--shade-ash' },
    { id: 'smoke_bit', name: '연기 조각', mark: '조',desc: '갈라진 연기에서 나온 작은 조각.', hp: 8, spd: 80, dmg: 4, eat: 2, tg: 'fire', r: 8, ember: 0, sp: [], col: '--shade-smoke' },
    { id: 'drinker', name: '기름 빨이', mark: '빨',desc: '불지기에 붙어 등불 기름을 빨아 먹는다.', hp: 22, spd: 72, dmg: 4, eat: 1, tg: 'player', r: 11, ember: 2, sp: ['drink'], col: '--shade-frost' },
    { id: 'dimmer', name: '빛 먹는 장막', mark: '막',desc: '둘레 그림자가 받는 빛 피해를 반으로 줄인다.', hp: 40, spd: 34, dmg: 6, eat: 3, tg: 'fire', r: 18, ember: 3, sp: ['dim'], col: '--shade-veil' },
    { id: 'dasher', name: '바람 그늘', mark: '바',desc: '잠깐씩 세 배로 빠르게 돌진한다.', hp: 28, spd: 52, dmg: 9, eat: 2, tg: 'mix', r: 12, ember: 2, sp: ['dash'], col: '--shade-frost' },
    { id: 'shell', name: '껍질 그림자', mark: '껍',desc: '모닥불 빛에 강하다. 등불로 태워야 한다.', hp: 58, spd: 30, dmg: 8, eat: 4, tg: 'fire', r: 17, ember: 3, sp: ['armor'], col: '--shade-husk' },
    { id: 'frost', name: '서리 숨', mark: '서',desc: '닿으면 불지기를 1.5초 얼려 느리게 하고 등불 기름을 빨리 닳게 한다. 모닥불은 두 배로 식힌다.', hp: 32, spd: 44, dmg: 7, eat: 3, tg: 'mix', r: 13, ember: 3, sp: ['frost', 'eat2'], col: '--shade-frost' },
    { id: 'mire', name: '늪 손', mark: '늪',desc: '닿아 있는 동안 불지기를 붙잡아 거의 걷지 못하게 한다.', hp: 34, spd: 38, dmg: 7, eat: 2, tg: 'player', r: 14, ember: 2, sp: ['mire'], col: '--shade-moss' },
    { id: 'ember_thief', name: '불씨 도둑', mark: '도',desc: '모닥불에서 불씨를 한 움큼 훔쳐 달아난다.', hp: 20, spd: 84, dmg: 4, eat: 0, tg: 'fire', r: 10, ember: 4, sp: ['thief'], col: '--shade-rust' },
    { id: 'howler', name: '울부짖는 그늘', mark: '울',desc: '6초마다 재나방을 불러낸다.', hp: 34, spd: 40, dmg: 7, eat: 3, tg: 'fire', r: 15, ember: 3, sp: ['call'], col: '--shade-ash' },
    { id: 'healer', name: '이끼 그림자', mark: '이',desc: '둘레 그림자의 상처를 메운다.', hp: 30, spd: 38, dmg: 5, eat: 2, tg: 'fire', r: 14, ember: 3, sp: ['heal'], col: '--shade-moss' },
    { id: 'brute', name: '큰 그을음', mark: '큰',desc: '느리지만 아주 질기고, 불지기를 세게 문다.', hp: 95, spd: 30, dmg: 14, eat: 4, tg: 'fire', r: 22, ember: 6, sp: [], col: '--shade-soot' },
    { id: 'phantom', name: '흐릿한 그림자', mark: '흐',desc: '빛 밖에서는 눈도 보이지 않고, 순간 이동해 다가온다.', hp: 26, spd: 56, dmg: 9, eat: 2, tg: 'player', r: 12, ember: 3, sp: ['blink'], col: '--shade-veil' },
    // 우두머리 5 (지역마다 하나, 5번째 밤에는 약한 모습으로 먼저 나온다)
    { id: 'b_pine', name: '늙은 솔그늘', mark: '솔',desc: '솔숲의 우두머리. 재나방을 계속 불러낸다.', hp: 520, spd: 26, dmg: 16, eat: 2.5, tg: 'fire', r: 34, ember: 40, sp: ['call'], col: '--shade-moss', boss: true },
    { id: 'b_marsh', name: '늪의 어머니', mark: '어',desc: '둘레를 고치고, 쓰러지면 연기로 갈라진다.', hp: 560, spd: 24, dmg: 16, eat: 2.5, tg: 'fire', r: 34, ember: 40, sp: ['heal', 'split'], col: '--shade-moss', boss: true },
    { id: 'b_snow', name: '하얀 숨', mark: '하',desc: '닿으면 불지기를 얼려 느리게 하고 등불 기름을 빨리 닳게 한다. 모닥불은 두 배로 식힌다.', hp: 600, spd: 26, dmg: 18, eat: 2, tg: 'fire', r: 34, ember: 45, sp: ['frost', 'eat2'], col: '--shade-frost', boss: true },
    { id: 'b_canyon', name: '붉은 먼지 거인', mark: '거',desc: '돌진으로 순식간에 거리를 좁힌다.', hp: 680, spd: 24, dmg: 20, eat: 3, tg: 'fire', r: 36, ember: 50, sp: ['dash'], col: '--shade-rust', boss: true },
    { id: 'b_village', name: '빈집의 주인', mark: '주',desc: '빛을 가리고 순간 이동한다.', hp: 740, spd: 26, dmg: 20, eat: 3, tg: 'fire', r: 36, ember: 55, sp: ['dim', 'blink'], col: '--shade-veil', boss: true }
  ];

  // 장작 8 — fire: 모닥불에 넣을 때 연료, lamp: 등불에 넣을 때 기름
  // col: style.css :root 의 장작 색 `--wood-*` 변수 이름(디자인 규칙 `색 조합`의 그림 색)
  // mark: 장작 칸에 쓰는 글자 한 자, pat: 장작 칸 무늬(style.css `.pat-*`) — 색만으로 구분하지 않게
  const WOODS = [
    { id: 'twig', name: '마른 가지', mark: '가', pat: 'plain', fire: 10, lamp: 22, col: '--wood-twig', desc: '어디서나 나는 가벼운 가지.' },
    { id: 'oak', name: '참나무 장작', mark: '참', pat: 'ring', fire: 18, lamp: 30, col: '--wood-oak', desc: '오래 타는 묵직한 장작.' },
    { id: 'pine', name: '송진 장작', mark: '송', pat: 'drop', fire: 12, lamp: 44, col: '--wood-pine', desc: '송진이 많아 등불 기름으로 좋다.' },
    { id: 'wet', name: '젖은 장작', mark: '젖', pat: 'wave', fire: 8, lamp: 14, col: '--wood-wet', sp: 'damp', desc: '모닥불에 넣으면 10초 동안 불이 반만 줄어든다.' },
    { id: 'birch', name: '자작 껍질', mark: '자', pat: 'stripe', fire: 14, lamp: 26, col: '--wood-birch', sp: 'flash', desc: '모닥불에 넣으면 확 타올라 불빛 안 그림자에게 30 피해.' },
    { id: 'charcoal', name: '숯덩이', mark: '숯', pat: 'check', fire: 30, lamp: 16, col: '--wood-charcoal', desc: '모닥불에 넣으면 아주 오래 탄다.' },
    { id: 'ember', name: '불씨 나무', mark: '씨', pat: 'dots', fire: 16, lamp: 28, col: '--wood-ember', sp: 'ember', desc: '어디에 넣든 불씨 5개를 더 얻는다.' },
    { id: 'silver', name: '은빛 장작', mark: '은', pat: 'shine', fire: 15, lamp: 34, col: '--wood-silver', sp: 'bright', desc: '등불에 넣으면 8초 동안 등불 피해 1.5배.' }
  ];

  // 강화 카드 45 — 새벽마다 셋 중 하나. r: 1 흔함, 2 드묾, 3 귀함
  const CARDS = [
    { id: 'c_wick', name: '굵은 심지', r: 1, desc: '등불 피해 +15%', m: [['lampDps', 'mul', 1.15]] },
    { id: 'c_glass', name: '맑은 유리', r: 1, desc: '등불 빛 반경 +12%', m: [['lampRadius', 'mul', 1.12]] },
    { id: 'c_oilcan', name: '기름 주머니', r: 1, desc: '등불 기름 최대 +25', m: [['oilMax', 'add', 25]] },
    { id: 'c_slowwick', name: '느린 심지', r: 1, desc: '등불 기름이 15% 덜 닳는다', m: [['lampDrain', 'mul', 0.85]] },
    { id: 'c_boots', name: '가벼운 신', r: 1, desc: '걷는 속도 +10%', m: [['moveSpeed', 'mul', 1.1]] },
    { id: 'c_sack', name: '장작 자루', r: 1, desc: '들 수 있는 장작 +1', m: [['carry', 'add', 1]] },
    { id: 'c_bigsack', name: '큰 장작 자루', r: 2, desc: '들 수 있는 장작 +2, 걷는 속도 -5%', m: [['carry', 'add', 2], ['moveSpeed', 'mul', 0.95]] },
    { id: 'c_stones', name: '둥근 돌 화덕', r: 1, desc: '모닥불이 10% 덜 줄어든다', m: [['fireBurn', 'mul', 0.9]] },
    { id: 'c_ring', name: '돌담', r: 1, desc: '모닥불 빛 반경 +10%', m: [['fireRadius', 'mul', 1.1]] },
    { id: 'c_hotcoal', name: '뜨거운 숯', r: 1, desc: '모닥불 빛 피해 +3', m: [['fireDps', 'add', 3]] },
    { id: 'c_dry', name: '잘 마른 손', r: 1, desc: '모닥불에 넣는 장작 값 +15%', m: [['woodFire', 'mul', 1.15]] },
    { id: 'c_resin', name: '송진 바르기', r: 1, desc: '등불에 넣는 장작 값 +15%', m: [['woodLamp', 'mul', 1.15]] },
    { id: 'c_reach', name: '긴 팔', r: 1, desc: '장작 줍는 거리 +12', m: [['pickR', 'add', 12]] },
    { id: 'c_blanket', name: '두꺼운 담요', r: 1, desc: '받는 피해 -10%', m: [['armor', 'add', 0.1]] },
    { id: 'c_tea', name: '따뜻한 차', r: 1, desc: '모닥불 곁 회복 +1.5/초', m: [['regen', 'add', 1.5]] },
    { id: 'c_heart', name: '튼튼한 몸', r: 1, desc: '최대 체력 +20', m: [['maxHp', 'add', 20]] },
    { id: 'c_scavenger', name: '그을음 줍기', r: 1, desc: '그림자가 장작을 떨어뜨릴 확률 +8%', m: [['dropChance', 'add', 0.08]] },
    { id: 'c_greed', name: '불씨 모으기', r: 1, desc: '얻는 불씨 +25%', m: [['emberMul', 'mul', 1.25]] },
    { id: 'c_morning', name: '아침 장작', r: 1, desc: '새벽마다 모닥불 연료 +10 더', m: [['dawnFuel', 'add', 10]] },
    { id: 'c_glare', name: '눈부심', r: 1, desc: '빛 안 그림자가 10% 더 느려진다', m: [['lightSlow', 'add', 0.1]] },
    { id: 'c_lid', name: '냄비 뚜껑', r: 1, desc: '그림자가 모닥불을 20% 덜 먹는다', m: [['eatResist', 'add', 0.2]] },
    { id: 'c_siphon', name: '그림자 기름', r: 2, desc: '그림자를 쓰러뜨리면 등불 기름 +3', m: [['oilOnKill', 'add', 3]] },
    { id: 'c_feast', name: '불이 먹는 그림자', r: 2, desc: '그림자를 쓰러뜨리면 모닥불 연료 +1.5', m: [['fuelOnKill', 'add', 1.5]] },
    { id: 'c_vamp', name: '따뜻한 숨', r: 2, desc: '그림자를 쓰러뜨리면 체력 +2', m: [['hpOnKill', 'add', 2]] },
    { id: 'c_spark', name: '튀는 불티', r: 1, desc: '1.5초마다 모닥불이 어둠 속 그림자에게 불티 12 피해', m: [['spark', 'add', 12]] },
    { id: 'c_spark2', name: '불티 바람', r: 2, desc: '불티 피해 +18, 모닥불이 5% 더 빨리 탄다', m: [['spark', 'add', 18], ['fireBurn', 'mul', 1.05]] },
    { id: 'c_share', name: '남는 불씨', r: 2, desc: '모닥불에 넣으면 그 장작 등불 값의 25%도 등불에 들어간다', m: [['shareFire', 'add', 0.25]] },
    { id: 'c_share2', name: '등불 나눔', r: 2, desc: '등불에 넣으면 그 장작 모닥불 값의 25%도 모닥불에 들어간다', m: [['shareLamp', 'add', 0.25]] },
    { id: 'c_forest', name: '숲 냄새', r: 1, desc: '장작이 20% 더 자주 나온다', m: [['logRate', 'mul', 1.2]] },
    { id: 'c_thorns', name: '가시 외투', r: 1, desc: '불지기에 닿은 그림자가 초당 8 피해', m: [['thorns', 'add', 8]] },
    { id: 'c_burst', name: '불꽃 터뜨리기', r: 2, desc: '모닥불에 넣을 때 불빛 안 그림자에게 25 피해', m: [['feedBurst', 'add', 25]] },
    { id: 'c_rage', name: '마지막 빛', r: 2, desc: '체력이 35% 아래면 등불 피해 1.5배', m: [['rage', 'add', 1]] },
    { id: 'c_wide', name: '넓은 갓', r: 2, desc: '등불 빛 반경 +20%, 등불 피해 -8%', m: [['lampRadius', 'mul', 1.2], ['lampDps', 'mul', 0.92]] },
    { id: 'c_focus', name: '모은 빛', r: 2, desc: '등불 피해 +30%, 등불 빛 반경 -12%', m: [['lampDps', 'mul', 1.3], ['lampRadius', 'mul', 0.88]] },
    { id: 'c_bonfire', name: '큰 모닥불', r: 2, desc: '모닥불 연료 최대 +25, 빛 반경 +5%', m: [['fuelMax', 'add', 25], ['fireRadius', 'mul', 1.05]] },
    { id: 'c_tank', name: '큰 기름통', r: 2, desc: '등불 기름 최대 +30', m: [['oilMax', 'add', 30]] },
    { id: 'c_quick', name: '빠른 손', r: 2, desc: '걷는 속도 +8%, 줍는 거리 +6', m: [['moveSpeed', 'mul', 1.08], ['pickR', 'add', 6]] },
    { id: 'c_fortress', name: '불 울타리', r: 2, desc: '모닥불 빛 피해 +5, 모닥불이 8% 더 빨리 탄다', m: [['fireDps', 'add', 5], ['fireBurn', 'mul', 1.08]] },
    { id: 'c_heart2', name: '붉은 마음', r: 2, desc: '모닥불 빛 피해 +2, 등불 피해 +8%', m: [['fireDps', 'add', 2], ['lampDps', 'mul', 1.08]] },
    { id: 'c_dawnheal', name: '새벽 기도', r: 1, desc: '새벽마다 체력 +20 더', m: [['dawnHeal', 'add', 20]] },
    { id: 'c_lantern2', name: '둘째 심지', r: 3, desc: '등불 피해 +35%', m: [['lampDps', 'mul', 1.35]] },
    { id: 'c_phoenix', name: '다시 타는 재', r: 3, desc: '모닥불이 꺼지면 한 번 연료 30으로 다시 붙는다', m: [['revive', 'add', 1]] },
    { id: 'c_sun', name: '작은 해', r: 3, desc: '모닥불 빛 반경 +20%, 빛 피해 +4', m: [['fireRadius', 'mul', 1.2], ['fireDps', 'add', 4]] },
    { id: 'c_wind', name: '등 뒤의 바람', r: 3, desc: '걷는 속도 +15%, 등불 기름 15% 덜 닳음', m: [['moveSpeed', 'mul', 1.15], ['lampDrain', 'mul', 0.85]] },
    { id: 'c_hearth', name: '오래 타는 화덕', r: 3, desc: '모닥불이 22% 덜 줄어든다', m: [['fireBurn', 'mul', 0.78]] }
  ];

  // 유물 24 — 3·6·9번째 새벽에 셋 중 하나. 앞 12개는 처음부터, 뒤 12개는 야영지에서 불씨로 연다.
  const RELICS = [
    { id: 'r_compass', name: '낡은 나침반', cost: 0, desc: '장작이 15% 더 자주 나오고 줍는 거리 +6', m: [['logRate', 'mul', 1.15], ['pickR', 'add', 6]] },
    { id: 'r_kettle', name: '찌그러진 주전자', cost: 0, desc: '모닥불 곁 회복 +2/초', m: [['regen', 'add', 2]] },
    { id: 'r_mitten', name: '짝 잃은 장갑', cost: 0, desc: '들 수 있는 장작 +1', m: [['carry', 'add', 1]] },
    { id: 'r_bell', name: '놋쇠 방울', cost: 0, desc: '빛 안 그림자가 12% 더 느려진다', m: [['lightSlow', 'add', 0.12]] },
    { id: 'r_flint', name: '부싯돌', cost: 0, desc: '모닥불에 넣을 때 불빛 안 그림자에게 30 피해', m: [['feedBurst', 'add', 30]] },
    { id: 'r_jar', name: '기름 단지', cost: 0, desc: '등불 기름 최대 +20, 쓰러뜨릴 때 기름 +1', m: [['oilMax', 'add', 20], ['oilOnKill', 'add', 1]] },
    { id: 'r_shovel', name: '작은 삽', cost: 0, desc: '쓰러뜨릴 때 모닥불 연료 +1', m: [['fuelOnKill', 'add', 1]] },
    { id: 'r_scarf', name: '붉은 목도리', cost: 0, desc: '받는 피해 -12%', m: [['armor', 'add', 0.12]] },
    { id: 'r_map', name: '그을린 지도', cost: 0, desc: '장작을 떨어뜨릴 확률 +10%', m: [['dropChance', 'add', 0.1]] },
    { id: 'r_pouch', name: '불씨 주머니', cost: 0, desc: '얻는 불씨 +40%', m: [['emberMul', 'mul', 1.4]] },
    { id: 'r_owl', name: '부엉이 깃', cost: 0, desc: '등불 빛 반경 +15%', m: [['lampRadius', 'mul', 1.15]] },
    { id: 'r_stone', name: '따뜻한 돌', cost: 0, desc: '새벽 연료 +12, 새벽 회복 +10', m: [['dawnFuel', 'add', 12], ['dawnHeal', 'add', 10]] },
    { id: 'r_mirror', name: '손거울', cost: 60, desc: '등불 피해 +20%', m: [['lampDps', 'mul', 1.2]] },
    { id: 'r_grate', name: '쇠 석쇠', cost: 60, desc: '모닥불이 15% 덜 줄어든다', m: [['fireBurn', 'mul', 0.85]] },
    { id: 'r_horn', name: '뿔피리', cost: 80, desc: '불티 피해 +20', m: [['spark', 'add', 20]] },
    { id: 'r_coat', name: '기름 먹인 외투', cost: 80, desc: '닿은 그림자에게 초당 12 피해, 받는 피해 -5%', m: [['thorns', 'add', 12], ['armor', 'add', 0.05]] },
    { id: 'r_drum', name: '작은 북', cost: 90, desc: '걷는 속도 +12%', m: [['moveSpeed', 'mul', 1.12]] },
    { id: 'r_cask', name: '술통 장작', cost: 90, desc: '모닥불에 넣는 장작 값 +25%', m: [['woodFire', 'mul', 1.25]] },
    { id: 'r_lens', name: '볼록 유리', cost: 100, desc: '등불 빛 반경 +10%, 등불 피해 +10%', m: [['lampRadius', 'mul', 1.1], ['lampDps', 'mul', 1.1]] },
    { id: 'r_doll', name: '짚 인형', cost: 110, desc: '모닥불이 꺼지면 한 번 다시 붙는다', m: [['revive', 'add', 1]] },
    { id: 'r_cauldron', name: '무쇠솥', cost: 120, desc: '그림자가 모닥불을 35% 덜 먹는다', m: [['eatResist', 'add', 0.35]] },
    { id: 'r_feather', name: '불새 깃', cost: 140, desc: '어디에 넣든 다른 쪽에도 30%가 들어간다', m: [['shareFire', 'add', 0.3], ['shareLamp', 'add', 0.3]] },
    { id: 'r_star', name: '떨어진 별', cost: 160, desc: '모닥불 빛 반경 +15%, 빛 피해 +4', m: [['fireRadius', 'mul', 1.15], ['fireDps', 'add', 4]] },
    { id: 'r_crown', name: '숯 왕관', cost: 200, desc: '체력 35% 아래면 등불 피해 1.5배, 등불 피해 +15%', m: [['rage', 'add', 1], ['lampDps', 'mul', 1.15]] }
  ];

  // 등불 6 — 판을 시작할 때 하나 고른다
  const LANTERNS = [
    { id: 'old', name: '낡은 등불', cost: 0, desc: '평범한 등불. 모자란 것도 넘치는 것도 없다.', m: [] },
    { id: 'glass', name: '유리 등불', cost: 40, desc: '빛 반경 +20%, 피해 -10%', m: [['lampRadius', 'mul', 1.2], ['lampDps', 'mul', 0.9]] },
    { id: 'copper', name: '구리 등불', cost: 60, desc: '피해 +25%, 기름 15% 빨리 닳음', m: [['lampDps', 'mul', 1.25], ['lampDrain', 'mul', 1.15]] },
    { id: 'wind', name: '바람 등불', cost: 80, desc: '걷는 속도 +15%, 기름 10% 빨리 닳음', m: [['moveSpeed', 'mul', 1.15], ['lampDrain', 'mul', 1.1]] },
    { id: 'twin', name: '쌍심지 등불', cost: 120, desc: '피해 +40%, 빛 반경 -15%, 기름 최대 -15', m: [['lampDps', 'mul', 1.4], ['lampRadius', 'mul', 0.85], ['oilMax', 'add', -15]] },
    { id: 'star', name: '별빛 등불', cost: 160, desc: '기름 30% 덜 닳음, 피해 -10%, 기름 최대 +20', m: [['lampDrain', 'mul', 0.7], ['lampDps', 'mul', 0.9], ['oilMax', 'add', 20]] }
  ];

  // 야영 준비 6 — 판을 넘어 쌓이는 영구 강화 (각 3단계)
  const PREP = [
    { id: 'p_wood', name: '챙겨 온 장작', desc: '시작할 때 마른 가지 +1', cost: [20, 45, 80], m: [['startWood', 'add', 1]] },
    { id: 'p_fuel', name: '마른 불쏘시개', desc: '시작 모닥불 연료 +8', cost: [20, 45, 80], m: [['startFuel', 'add', 8]] },
    { id: 'p_hp', name: '밤샘 단련', desc: '최대 체력 +8', cost: [25, 50, 90], m: [['maxHp', 'add', 8]] },
    { id: 'p_oil', name: '기름병', desc: '등불 기름 최대·시작 +8', cost: [25, 50, 90], m: [['oilMax', 'add', 8], ['startOil', 'add', 8]] },
    { id: 'p_dawn', name: '새벽 장작더미', desc: '새벽 연료 +4', cost: [30, 60, 100], m: [['dawnFuel', 'add', 4]] },
    { id: 'p_reach', name: '손 뻗기', desc: '줍는 거리 +4', cost: [20, 40, 70], m: [['pickR', 'add', 4]] }
  ];

  // 업적 20
  const ACHS = [
    { id: 'a_first', name: '첫 새벽', desc: '첫째 밤을 버틴다' },
    { id: 'a_n5', name: '다섯 밤', desc: '한 판에 다섯째 밤까지 버틴다' },
    { id: 'a_win', name: '새벽을 지킨 사람', desc: '열째 밤을 버텨 판을 이긴다' },
    { id: 'a_win3', name: '세 곳의 아침', desc: '서로 다른 지역 셋에서 이긴다' },
    { id: 'a_winall', name: '다섯 곳의 아침', desc: '모든 지역에서 이긴다' },
    { id: 'a_k100', name: '그림자 백', desc: '그림자를 모두 합쳐 100 쓰러뜨린다' },
    { id: 'a_k1000', name: '그림자 천', desc: '그림자를 모두 합쳐 1000 쓰러뜨린다' },
    { id: 'a_boss', name: '우두머리 사냥', desc: '우두머리를 처음 쓰러뜨린다' },
    { id: 'a_fire50', name: '불지기', desc: '모닥불에 장작을 모두 합쳐 50 넣는다' },
    { id: 'a_lamp50', name: '등불지기', desc: '등불에 장작을 모두 합쳐 50 넣는다' },
    { id: 'a_nolamp', name: '등불 없이', desc: '등불에 한 번도 넣지 않고 넷째 밤을 버틴다' },
    { id: 'a_nofire', name: '모닥불 없이', desc: '모닥불에 한 번도 넣지 않고 셋째 밤을 버틴다' },
    { id: 'a_close', name: '아슬아슬', desc: '모닥불 연료가 5 아래로 떨어지고도 그 밤을 버틴다' },
    { id: 'a_full', name: '넉넉한 불', desc: '모닥불 연료 90 이상으로 새벽을 맞는다' },
    { id: 'a_carry', name: '한 아름', desc: '장작 6개를 한꺼번에 든다' },
    { id: 'a_rich', name: '불씨 부자', desc: '불씨 300을 모아 둔다' },
    { id: 'a_relic3', name: '유물 셋', desc: '한 판에 유물 셋을 모은다' },
    { id: 'a_card6', name: '여섯 장', desc: '한 판에 강화 카드 여섯 장을 모은다' },
    { id: 'a_lantern3', name: '등불 수집가', desc: '등불 셋을 가진다' },
    { id: 'a_runs10', name: '열 번의 밤샘', desc: '판을 열 번 한다' }
  ];

  // 야영 일지 20 — 지역마다 시작·셋째·여섯째 새벽·이김에서 열린다
  const JOURNAL = [
    { r: 0, n: 0, title: '솔숲, 첫 장작', text: '마을 사람들은 밤이 길어졌다고 했다. 불을 지키는 사람이 하나는 있어야 한다고. 나는 등불 하나와 장작 몇 개를 들고 솔숲으로 왔다.' },
    { r: 0, n: 3, title: '솔숲, 셋째 새벽', text: '그림자는 불을 미워하지 않는다. 불을 먹고 싶어 한다. 그래서 불이 클수록 더 많이 모여든다.' },
    { r: 0, n: 6, title: '솔숲, 여섯째 새벽', text: '늙은 솔그늘이 숲 끝에서 나를 본다. 아직은 다가오지 않는다. 열째 밤을 기다리는 것 같다.' },
    { r: 0, n: 10, title: '솔숲의 아침', text: '해가 솔잎 사이로 들었다. 재만 남은 모닥불 곁에 앉아 처음으로 오래 잤다.' },
    { r: 1, n: 0, title: '늪, 젖은 장작', text: '늪의 장작은 다 젖어 있다. 불에 넣으면 연기만 나지만 그 연기가 불을 오래 붙잡아 준다.' },
    { r: 1, n: 3, title: '늪, 셋째 새벽', text: '등불 기름이 안개에 녹듯 줄어든다. 기름 빨이가 다리에 붙을 때마다 빛이 흔들린다.' },
    { r: 1, n: 6, title: '늪, 여섯째 새벽', text: '이끼 그림자는 다친 그림자를 감싸 준다. 그들도 서로를 지키는 것이다.' },
    { r: 1, n: 10, title: '늪의 아침', text: '안개가 걷히자 늪은 그냥 물웅덩이였다. 늪의 어머니가 있던 자리에 연꽃 하나가 떠 있었다.' },
    { r: 2, n: 0, title: '고개, 찬바람', text: '바람이 불씨를 날려 버린다. 돌을 쌓아 바람막이를 만들고 숯덩이를 아껴 둔다.' },
    { r: 2, n: 3, title: '고개, 셋째 새벽', text: '서리 숨이 닿은 손가락이 한참 동안 굳어 있었다. 불 곁에서 녹이며 다음 밤을 생각한다.' },
    { r: 2, n: 6, title: '고개, 여섯째 새벽', text: '눈 위에는 그림자 발자국이 없다. 그래도 아침마다 모닥불 둘레의 눈만 녹아 있다.' },
    { r: 2, n: 10, title: '고개의 아침', text: '하얀 숨이 흩어지고 고개 너머로 마을 불빛이 보였다. 누군가 내 불을 보고 있었을지도 모른다.' },
    { r: 3, n: 0, title: '협곡, 귀한 나무', text: '협곡에는 나무가 거의 없다. 대신 오래된 숯이 바위 틈에 박혀 있다. 누가 여기서 불을 지켰던 걸까.' },
    { r: 3, n: 3, title: '협곡, 셋째 새벽', text: '불씨 도둑은 잡히지 않으려 달아난다. 훔친 불씨로 저쪽 어딘가에 자기 불을 피우는 걸까.' },
    { r: 3, n: 6, title: '협곡, 여섯째 새벽', text: '붉은 먼지 거인이 지나간 자리는 바위가 갈라져 있다. 장작을 더 모아 둔다.' },
    { r: 3, n: 10, title: '협곡의 아침', text: '붉은 바위가 해를 받아 불처럼 빛났다. 오늘만큼은 불을 지킬 필요가 없다.' },
    { r: 4, n: 0, title: '마을터, 빈집', text: '사람들이 떠난 마을에 모닥불을 피운다. 창문마다 그림자가 비친다.' },
    { r: 4, n: 3, title: '마을터, 셋째 새벽', text: '빛 먹는 장막 뒤에 숨은 그림자는 등불로도 잘 타지 않는다. 장막부터 걷어 내야 한다.' },
    { r: 4, n: 6, title: '마을터, 여섯째 새벽', text: '빈집의 주인은 문을 두드리지 않고 들어온다. 등불을 꼭 쥐고 잠들지 않는다.' },
    { r: 4, n: 10, title: '마을터의 아침', text: '빈집마다 아침 해가 들었다. 언젠가 사람들이 돌아오면 이 모닥불 자리부터 보게 될 것이다.' }
  ];

  function map(arr) { const o = {}; arr.forEach(function (x) { o[x.id] = x; }); return o; }

  return {
    REGIONS: REGIONS, NIGHTS: NIGHTS, ENEMIES: ENEMIES, WOODS: WOODS, CARDS: CARDS, RELICS: RELICS,
    LANTERNS: LANTERNS, PREP: PREP, ACHS: ACHS, JOURNAL: JOURNAL,
    ENEMY_MAP: map(ENEMIES), WOOD_MAP: map(WOODS), CARD_MAP: map(CARDS), RELIC_MAP: map(RELICS),
    LANTERN_MAP: map(LANTERNS), PREP_MAP: map(PREP)
  };
})();
