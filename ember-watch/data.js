// Ember Watch — 콘텐츠 데이터 (장작·재료·자원·지을 것·밤·그림자·강화·유물·야영 준비·등불·야영지·업적·야영 일지)
window.EW_DATA = (function () {
  'use strict';

  // 장작 4 — fire: 모닥불·화톳불에 넣을 때 연료, lamp: 등불에 넣을 때 등불 연료
  // day: 이 날부터 지도에 나온다(첫날은 마른 가지만), intro: 처음 나오는 날 아침 알림 한 줄
  // col: style.css :root 의 `--wood-*` 변수 이름, mark: 칸에 쓰는 글자 한 자, pat: 칸 무늬(style.css `.pat-*`) — 색만으로 구분하지 않게
  const WOODS = [
    { id: 'twig', name: '마른 가지', mark: '가', pat: 'plain', fire: 15, lamp: 20, day: 1, col: '--wood-twig', intro: '어디서나 나는 가벼운 가지. 연료 15.', desc: '어디서나 나는 가벼운 가지. 불에 넣으면 연료 15.' },
    { id: 'oak', name: '참나무 장작', mark: '참', pat: 'ring', fire: 22, lamp: 24, day: 3, col: '--wood-oak', intro: '오래 타는 묵직한 장작. 나무를 베면 나온다. 연료 22.', desc: '셋째 날부터 나온다. 오래 타는 묵직한 장작. 불에 넣으면 연료 22.' },
    { id: 'pine', name: '송진 장작', mark: '송', pat: 'drop', fire: 25, lamp: 34, day: 5, col: '--wood-pine', sp: 'flash', intro: '먼 숲 송진 나무와 깊은 어둠에서 난다. 넣으면 확 타오른다.', desc: '닷새째부터 먼 숲과 깊은 어둠에서만 난다. 불에 넣으면 연료 25에 확 타올라 불빛 안 그림자에게 20 피해.' },
    { id: 'wet', name: '젖은 장작', mark: '젖', pat: 'wave', fire: 8, lamp: 6, day: 7, col: '--wood-wet', sp: 'damp', intro: '그대로는 연기만 난다. 장작 더미에 하루 두어 말려 쓴다.', desc: '이레째부터 나온다. 그대로 넣으면 연기만 난다(연료 8, 10초 동안 불이 반만 줄어든다). 장작 더미에 하루 두면 참나무 장작으로 마른다.' }
  ];

  // 가방에 드는 것 9 — 장작 4 + 돌·풀·열매·버섯·구운 버섯. food: 먹으면 차는 배고픔, hp: 먹으면 차는 체력
  const ITEMS = [
    { id: 'twig', name: '마른 가지', mark: '가', pat: 'plain', col: '--wood-twig', wood: true },
    { id: 'oak', name: '참나무 장작', mark: '참', pat: 'ring', col: '--wood-oak', wood: true },
    { id: 'pine', name: '송진 장작', mark: '송', pat: 'drop', col: '--wood-pine', wood: true },
    { id: 'wet', name: '젖은 장작', mark: '젖', pat: 'wave', col: '--wood-wet', wood: true },
    { id: 'stone', name: '돌', mark: '돌', pat: 'check', col: '--item-stone', desc: '화톳불·덫·등불 손질·모닥불 키우기에 쓴다.' },
    { id: 'grass', name: '풀', mark: '풀', pat: 'stripe', col: '--item-grass', desc: '덫과 등불 손질에 쓴다.' },
    { id: 'berry', name: '열매', mark: '열', pat: 'dots', col: '--item-berry', food: 22, desc: '먹으면 배고픔 22가 찬다.' },
    { id: 'mush', name: '버섯', mark: '버', pat: 'plain', col: '--item-mush', raw: true, desc: '날로는 못 먹는다. 모닥불 빛 안에 2초 있으면 하나씩 구워진다.' },
    { id: 'mush_r', name: '구운 버섯', mark: '구', pat: 'shine', col: '--item-mushr', food: 34, hp: 6, desc: '먹으면 배고픔 34·체력 6이 찬다.' }
  ];

  // 낮에 모으는 자원 7 — 가까이 가서 누르고 있으면 모은다. time: 모으는 데 걸리는 초, gives: 얻는 것, regrow: 다시 나기까지 새벽 수
  // dMin·dMax: 모닥불에서 떨어진 거리. 먼 곳일수록 좋은 재료(송진 나무·단단한 돌)
  // 나무는 야영지 둘레에 10그루 안팎만 있고 베면 나흘 뒤에야 다시 난다 — 낮 장작은 하루 평균 5개쯤이라 밤 하나(6~8개)에 모자란다
  const NODES = [
    { id: 'tree', name: '나무', time: 1.6, gives: [['oak', 1], ['twig', 1]], regrow: 4, dMin: 190, dMax: 520, desc: '베면 참나무 장작 하나와 마른 가지 하나(이틀째까지는 마른 가지 둘). 나흘 뒤 다시 난다.' },
    { id: 'pinetree', name: '송진 나무', time: 2.0, gives: [['pine', 2]], regrow: 3, dMin: 480, dMax: 1000, day: 5, desc: '닷새째부터 먼 숲에 보인다. 베면 송진 장작 둘.' },
    { id: 'stone', name: '돌', time: 1.2, gives: [['stone', 1]], regrow: 2, dMin: 180, dMax: 470, desc: '캐면 돌 하나.' },
    { id: 'hardstone', name: '단단한 돌', time: 1.8, gives: [['stone', 2]], regrow: 3, dMin: 480, dMax: 1000, desc: '먼 곳에만 있다. 캐면 돌 둘.' },
    { id: 'grass', name: '풀', time: 0.6, gives: [['grass', 1]], regrow: 1, dMin: 170, dMax: 800, desc: '뜯으면 풀 하나.' },
    { id: 'bush', name: '열매 덤불', time: 0.8, gives: [['berry', 2]], regrow: 1, dMin: 200, dMax: 700, desc: '따면 열매 둘. 하루 뒤 다시 열린다.' },
    { id: 'mushroom', name: '버섯', time: 0.6, gives: [['mush', 1]], regrow: 1, dMin: 200, dMax: 800, desc: '캐면 버섯 하나. 불 곁에서 구워 먹는다.' }
  ];

  // 지을 것 6 — 모닥불 옆에서 짓는다. cost 의 wood 는 마른 장작(가지·참나무·송진) 아무것이나. max: 지을 수 있는 수
  const BUILDS = [
    { id: 'brazier', name: '화톳불', icon: '🔥', cost: { stone: 3, wood: 2 }, max: 4, desc: '야영지 둘레에 작은 불을 하나 더 세운다. 빛 안전 구역이 넓어지지만 그림자가 이것도 노린다. 연료 40까지, 밤에 천천히 준다.' },
    { id: 'pile', name: '장작 더미', icon: '🪵', cost: { wood: 4 }, max: 1, desc: '모닥불 옆에 장작을 6개까지 쌓아 둔다. 곁에서 줍기/모으기로 쌓고, 가방에 장작이 없을 때 불에 넣기로 꺼내 쓴다. 젖은 장작은 하루 두면 마른다.' },
    { id: 'fence', name: '말뚝 울타리', icon: '🚧', cost: { wood: 2 }, max: 12, desc: '모닥불 둘레에 말뚝을 박는다. 부딪힌 그림자를 잠깐 멈춰 세우고 부서진다.' },
    { id: 'trap', name: '덫', icon: '🪤', cost: { grass: 2, stone: 1 }, max: 8, desc: '야영지 바깥 둘레에 놓는다. 밟은 그림자를 3초 묶는다. 새벽마다 다시 놓인다.' },
    { id: 'lamp', name: '등불 손질', icon: '🏮', cost: { stone: 2, grass: 2 }, max: 3, desc: '등불 연료 최대치 +20 (3번까지).' },
    { id: 'fireup', name: '모닥불 키우기', icon: '⛺', cost: { stone: 5, wood: 5 }, max: 3, desc: '모닥불 빛 반경 +15%·연료 최대치 +20 (3단계까지).' }
  ];

  // 밤 이름 15 — 16번째 밤부터는 마지막 이름을 이어 쓴다. 그림자 수·체력·밤 길이는 game.js 의 식(날마다 늘어남)
  const NIGHTS = [
    { n: 1, name: '바람 없는 밤' }, { n: 2, name: '서늘한 밤' }, { n: 3, name: '긴 그림자의 밤' },
    { n: 4, name: '젖은 밤' }, { n: 5, name: '큰 그림자의 밤' }, { n: 6, name: '달 없는 밤' },
    { n: 7, name: '울음의 밤' }, { n: 8, name: '얼어붙는 밤' }, { n: 9, name: '가장 긴 밤' },
    { n: 10, name: '두 번째 큰 그림자의 밤' }, { n: 11, name: '별이 숨은 밤' }, { n: 12, name: '재가 날리는 밤' },
    { n: 13, name: '안개 낀 밤' }, { n: 14, name: '잠들지 못하는 밤' }, { n: 15, name: '끝없는 밤' }
  ];

  // 그림자 18 + 큰 그림자 5 — 그림자는 빛을 꺼뜨리러 온다
  // tg: fire(가장 가까운 불을 노림) / player(불지기의 등불을 노림) / mix(가까운 쪽)
  // hit: 불에 닿을 때 깎는 연료(닿으면 스러진다. 큰 그림자는 튕겨 나갔다 다시 온다), dmg: 불지기에 닿아 있는 동안 초당 체력 피해
  // sp: split 갈라짐, drink 등불 연료 빨기, dim 빛 가림, dash 돌진, armor 등불에 강함, frost 얼림, mire 붙잡음,
  //     thief 불씨 채어 달아남, call 부르기, heal 고치기, blink 순간 이동, double 두 배로 깎음
  // 등불은 밀어내고 조금 깎을 뿐이다: 보통 그림자는 등불 빛 안에 3초 넘게 붙잡아 둬야 쓰러진다(game.js LAMP_MIN_T)
  // col: style.css :root 의 그림자 몸 색 `--shade-*` 변수 이름, mark: 몸에 쓰는 글자 한 자
  const ENEMIES = [
    { id: 'wisp', name: '떠도는 그을음', mark: '떠', desc: '가볍게 떠서 가장 가까운 불로 곧장 간다.', hp: 30, spd: 48, dmg: 6, hit: 15, tg: 'fire', r: 11, ember: 1, sp: [], col: '--shade-ash' },
    { id: 'crawler', name: '기는 재', mark: '기', desc: '땅에 붙어 느리게 기어 온다. 조금 질기다.', hp: 40, spd: 38, dmg: 8, hit: 15, tg: 'fire', r: 13, ember: 1, sp: [], col: '--shade-soot' },
    { id: 'moth', name: '재나방', mark: '나', desc: '빠르게 날아와 불지기를 문다. 등불 빛에 잘 밀려난다.', hp: 28, spd: 96, dmg: 5, hit: 0, tg: 'player', r: 8, ember: 1, sp: [], col: '--shade-moth' },
    { id: 'stalker', name: '눈 달린 덤불', mark: '덤', desc: '불지기를 끈질기게 따라온다.', hp: 46, spd: 52, dmg: 9, hit: 0, tg: 'player', r: 14, ember: 2, sp: [], col: '--shade-moss' },
    { id: 'splitter', name: '갈라지는 연기', mark: '갈', desc: '쓰러지면 연기 조각 둘로 갈라진다.', hp: 44, spd: 40, dmg: 7, hit: 15, tg: 'fire', r: 15, ember: 2, sp: ['split'], col: '--shade-ash' },
    { id: 'smoke_bit', name: '연기 조각', mark: '조', desc: '갈라진 연기에서 나온 작은 조각. 불에 닿으면 연료 8.', hp: 28, spd: 70, dmg: 4, hit: 8, tg: 'fire', r: 8, ember: 0, sp: [], col: '--shade-smoke' },
    { id: 'dasher', name: '바람 그늘', mark: '바', desc: '잠깐씩 세 배로 빠르게 돌진한다.', hp: 40, spd: 46, dmg: 9, hit: 15, tg: 'mix', r: 12, ember: 2, sp: ['dash'], col: '--shade-frost' },
    { id: 'gnawer', name: '불 끄는 손', mark: '끄', desc: '불에 닿으면 연료를 두 배(30)로 깎는다.', hp: 40, spd: 42, dmg: 6, hit: 15, tg: 'fire', r: 13, ember: 2, sp: ['double'], col: '--shade-rust' },
    { id: 'drinker', name: '연료 빨이', mark: '빨', desc: '불지기에 붙어 등불 연료를 빨아 간다.', hp: 34, spd: 72, dmg: 4, hit: 0, tg: 'player', r: 11, ember: 2, sp: ['drink'], col: '--shade-frost' },
    { id: 'shell', name: '껍질 그림자', mark: '껍', desc: '등불 빛에 강해 잘 타지 않고 덜 밀린다.', hp: 70, spd: 32, dmg: 8, hit: 15, tg: 'fire', r: 17, ember: 3, sp: ['armor'], col: '--shade-husk' },
    { id: 'mire', name: '늪 손', mark: '늪', desc: '닿아 있는 동안 불지기를 붙잡아 거의 걷지 못하게 한다.', hp: 46, spd: 38, dmg: 7, hit: 0, tg: 'player', r: 14, ember: 2, sp: ['mire'], col: '--shade-moss' },
    { id: 'frost', name: '서리 숨', mark: '서', desc: '닿으면 불지기를 1.5초 얼려 느리게 하고 등불 연료를 빨리 닳게 한다. 불에 닿으면 연료를 두 배로 깎는다.', hp: 44, spd: 44, dmg: 7, hit: 15, tg: 'mix', r: 13, ember: 3, sp: ['frost', 'double'], col: '--shade-frost' },
    { id: 'howler', name: '울부짖는 그늘', mark: '울', desc: '6초마다 재나방을 불러낸다.', hp: 46, spd: 40, dmg: 7, hit: 15, tg: 'fire', r: 15, ember: 3, sp: ['call'], col: '--shade-ash' },
    { id: 'healer', name: '이끼 그림자', mark: '이', desc: '둘레 그림자의 상처를 메운다.', hp: 42, spd: 38, dmg: 5, hit: 15, tg: 'fire', r: 14, ember: 3, sp: ['heal'], col: '--shade-moss' },
    { id: 'dimmer', name: '빛 가리는 장막', mark: '막', desc: '둘레 그림자가 받는 빛 피해를 반으로 줄인다.', hp: 54, spd: 34, dmg: 6, hit: 15, tg: 'fire', r: 18, ember: 3, sp: ['dim'], col: '--shade-veil' },
    { id: 'ember_thief', name: '불씨 도둑', mark: '도', desc: '불에서 불씨를 한 움큼(연료 8) 채어 달아난다.', hp: 32, spd: 84, dmg: 4, hit: 8, tg: 'fire', r: 10, ember: 4, sp: ['thief'], col: '--shade-rust' },
    { id: 'brute', name: '큰 그을음', mark: '큰', desc: '느리지만 아주 질기고, 불에 닿으면 연료 25를 깎는다.', hp: 120, spd: 30, dmg: 14, hit: 25, tg: 'fire', r: 22, ember: 6, sp: [], col: '--shade-soot' },
    { id: 'phantom', name: '흐릿한 그림자', mark: '흐', desc: '빛 밖에서는 눈도 보이지 않고, 순간 이동해 다가온다.', hp: 38, spd: 56, dmg: 9, hit: 0, tg: 'player', r: 12, ember: 3, sp: ['blink'], col: '--shade-veil' },
    // 큰 그림자 5 — 닷새마다 하나씩 차례로 온다. 등불로는 쓰러지지 않고(밀리지도 거의 않는다) 덫·울타리·화톳불로만 막는다.
    // 불에 닿으면 연료 40을 깎고 튕겨 나갔다가 다시 온다. 새벽이 오면 물러간다
    { id: 'b_pine', name: '늙은 솔그늘', mark: '솔', desc: '첫 큰 그림자. 재나방을 계속 불러낸다. 등불로는 쓰러지지 않는다.', hp: 420, spd: 26, dmg: 16, hit: 40, tg: 'fire', r: 34, ember: 40, sp: ['call'], col: '--shade-moss', boss: true },
    { id: 'b_marsh', name: '늪의 어머니', mark: '어', desc: '둘레를 고친다. 등불로는 쓰러지지 않는다.', hp: 460, spd: 24, dmg: 16, hit: 40, tg: 'fire', r: 34, ember: 40, sp: ['heal', 'split'], col: '--shade-moss', boss: true },
    { id: 'b_snow', name: '하얀 숨', mark: '하', desc: '닿으면 불지기를 얼린다. 불에 닿으면 연료를 두 배로 깎는다. 등불로는 쓰러지지 않는다.', hp: 500, spd: 26, dmg: 18, hit: 40, tg: 'fire', r: 34, ember: 45, sp: ['frost', 'double'], col: '--shade-frost', boss: true },
    { id: 'b_canyon', name: '붉은 먼지 거인', mark: '거', desc: '돌진으로 순식간에 거리를 좁힌다. 등불로는 쓰러지지 않는다.', hp: 560, spd: 24, dmg: 20, hit: 40, tg: 'fire', r: 36, ember: 50, sp: ['dash'], col: '--shade-rust', boss: true },
    { id: 'b_village', name: '빈집의 주인', mark: '주', desc: '빛을 가리고 순간 이동한다. 등불로는 쓰러지지 않는다.', hp: 620, spd: 26, dmg: 20, hit: 40, tg: 'fire', r: 36, ember: 55, sp: ['dim', 'blink'], col: '--shade-veil', boss: true }
  ];
  // 날이 갈수록 앞에서부터 하나씩 더 나온다 (첫날 셋, 둘째 날 넷 …)
  const SPAWN_ORDER = ['wisp', 'crawler', 'moth', 'stalker', 'splitter', 'dasher', 'gnawer', 'drinker', 'shell', 'mire', 'frost', 'howler', 'healer', 'dimmer', 'ember_thief', 'brute', 'phantom'];
  const BOSSES = ['b_pine', 'b_marsh', 'b_snow', 'b_canyon', 'b_village'];

  // 강화 카드 45 — 사흘마다 새벽에 셋 중 하나. r: 1 흔함, 2 드묾, 3 귀함
  const CARDS = [
    { id: 'c_wick', name: '굵은 심지', r: 1, desc: '등불 피해 +15%', m: [['lampDps', 'mul', 1.15]] },
    { id: 'c_glass', name: '맑은 유리', r: 1, desc: '등불 빛 반경 +12%', m: [['lampRadius', 'mul', 1.12]] },
    { id: 'c_oilcan', name: '연료 주머니', r: 1, desc: '등불 연료 최대 +20', m: [['oilMax', 'add', 20]] },
    { id: 'c_slowwick', name: '느린 심지', r: 1, desc: '등불 연료가 15% 덜 닳는다', m: [['lampDrain', 'mul', 0.85]] },
    { id: 'c_boots', name: '가벼운 신', r: 1, desc: '걷는 속도 +10%', m: [['moveSpeed', 'mul', 1.1]] },
    { id: 'c_axe', name: '날 선 도끼', r: 1, desc: '모으는 빠르기 +20%', m: [['gatherSpeed', 'mul', 1.2]] },
    { id: 'c_bigaxe', name: '무거운 도끼', r: 2, desc: '모으는 빠르기 +35%, 걷는 속도 -5%', m: [['gatherSpeed', 'mul', 1.35], ['moveSpeed', 'mul', 0.95]] },
    { id: 'c_stones', name: '둥근 돌 화덕', r: 1, desc: '모닥불이 10% 덜 줄어든다', m: [['fireBurn', 'mul', 0.9]] },
    { id: 'c_ring', name: '돌담', r: 1, desc: '모닥불 빛 반경 +10%', m: [['fireRadius', 'mul', 1.1]] },
    { id: 'c_hotcoal', name: '뜨거운 숯', r: 1, desc: '모닥불 빛 안 그림자가 초당 4 피해', m: [['fireDps', 'add', 4]] },
    { id: 'c_dry', name: '잘 마른 손', r: 1, desc: '불에 넣는 장작 값 +15%', m: [['woodFire', 'mul', 1.15]] },
    { id: 'c_resin', name: '송진 바르기', r: 1, desc: '등불에 넣는 장작 값 +20%', m: [['woodLamp', 'mul', 1.2]] },
    { id: 'c_reach', name: '긴 팔', r: 1, desc: '손 닿는 거리 +12, 줍는 거리 +6', m: [['reach', 'add', 12], ['pickR', 'add', 6]] },
    { id: 'c_blanket', name: '두꺼운 담요', r: 1, desc: '받는 피해 -10%', m: [['armor', 'add', 0.1]] },
    { id: 'c_tea', name: '따뜻한 차', r: 1, desc: '모닥불 곁 회복 +1/초', m: [['regen', 'add', 1]] },
    { id: 'c_heart', name: '튼튼한 몸', r: 1, desc: '최대 체력 +20', m: [['maxHp', 'add', 20]] },
    { id: 'c_scavenger', name: '그을음 줍기', r: 1, desc: '그림자가 장작을 떨어뜨릴 확률 +8%', m: [['dropChance', 'add', 0.08]] },
    { id: 'c_greed', name: '불씨 모으기', r: 1, desc: '얻는 불씨 +25%', m: [['emberMul', 'mul', 1.25]] },
    { id: 'c_morning', name: '새벽 기도', r: 1, desc: '새벽마다 체력 +15 더', m: [['dawnHeal', 'add', 15]] },
    { id: 'c_glare', name: '눈부심', r: 1, desc: '빛 안 그림자가 10% 더 느려진다', m: [['lightSlow', 'add', 0.1]] },
    { id: 'c_lid', name: '냄비 뚜껑', r: 1, desc: '그림자가 불에 닿아 깎는 연료 -15%', m: [['hitResist', 'add', 0.15]] },
    { id: 'c_siphon', name: '그림자 심지', r: 2, desc: '그림자를 쓰러뜨리면 등불 연료 +3', m: [['oilOnKill', 'add', 3]] },
    { id: 'c_feast', name: '불티 거두기', r: 2, desc: '그림자를 쓰러뜨리면 모닥불 연료 +1.5', m: [['fuelOnKill', 'add', 1.5]] },
    { id: 'c_vamp', name: '따뜻한 숨', r: 2, desc: '그림자를 쓰러뜨리면 체력 +2', m: [['hpOnKill', 'add', 2]] },
    { id: 'c_spark', name: '튀는 불티', r: 1, desc: '1.5초마다 모닥불이 어둠 속 그림자에게 불티 12 피해', m: [['spark', 'add', 12]] },
    { id: 'c_spark2', name: '불티 바람', r: 2, desc: '불티 피해 +18, 모닥불이 5% 더 빨리 탄다', m: [['spark', 'add', 18], ['fireBurn', 'mul', 1.05]] },
    { id: 'c_berry', name: '열매 바구니', r: 1, desc: '먹을 것으로 차는 배고픔 +25%', m: [['foodMul', 'mul', 1.25]] },
    { id: 'c_belly', name: '든든한 배', r: 1, desc: '배고픔이 15% 천천히 준다', m: [['hungerRate', 'mul', 0.85]] },
    { id: 'c_forest', name: '숲 냄새', r: 1, desc: '어둠 속 장작이 20% 더 자주 떨어진다', m: [['logRate', 'mul', 1.2]] },
    { id: 'c_thorns', name: '가시 외투', r: 1, desc: '불지기에 닿은 그림자가 초당 8 피해', m: [['thorns', 'add', 8]] },
    { id: 'c_burst', name: '불꽃 터뜨리기', r: 2, desc: '모닥불에 넣을 때 불빛 안 그림자에게 25 피해', m: [['feedBurst', 'add', 25]] },
    { id: 'c_rage', name: '마지막 빛', r: 2, desc: '체력이 35% 아래면 등불 피해 1.5배', m: [['rage', 'add', 1]] },
    { id: 'c_wide', name: '넓은 갓', r: 2, desc: '등불 빛 반경 +20%, 등불 피해 -8%', m: [['lampRadius', 'mul', 1.2], ['lampDps', 'mul', 0.92]] },
    { id: 'c_focus', name: '모은 빛', r: 2, desc: '등불 피해 +30%, 등불 빛 반경 -12%', m: [['lampDps', 'mul', 1.3], ['lampRadius', 'mul', 0.88]] },
    { id: 'c_bonfire', name: '큰 모닥불', r: 2, desc: '모닥불 연료 최대 +20, 빛 반경 +5%', m: [['fuelMax', 'add', 20], ['fireRadius', 'mul', 1.05]] },
    { id: 'c_tank', name: '큰 연료통', r: 2, desc: '등불 연료 최대 +30', m: [['oilMax', 'add', 30]] },
    { id: 'c_quick', name: '빠른 손', r: 2, desc: '걷는 속도 +8%, 모으는 빠르기 +10%', m: [['moveSpeed', 'mul', 1.08], ['gatherSpeed', 'mul', 1.1]] },
    { id: 'c_push', name: '센 바람', r: 1, desc: '등불이 그림자를 30% 더 세게 밀어낸다', m: [['lampPush', 'mul', 1.3]] },
    { id: 'c_dark', name: '어둠 견디기', r: 2, desc: '어둠이 갉아먹는 체력 -40%', m: [['darkDps', 'mul', 0.6]] },
    { id: 'c_trap', name: '단단한 덫', r: 1, desc: '덫이 묶는 시간 +1.5초', m: [['trapTime', 'add', 1.5]] },
    { id: 'c_lantern2', name: '둘째 심지', r: 3, desc: '등불 피해 +35%', m: [['lampDps', 'mul', 1.35]] },
    { id: 'c_phoenix', name: '다시 타는 재', r: 3, desc: '모닥불이 꺼지면 한 번 연료 30으로 다시 붙는다', m: [['revive', 'add', 1]] },
    { id: 'c_sun', name: '작은 해', r: 3, desc: '모닥불 빛 반경 +20%, 빛 안 그림자 초당 4 피해', m: [['fireRadius', 'mul', 1.2], ['fireDps', 'add', 4]] },
    { id: 'c_wind', name: '등 뒤의 바람', r: 3, desc: '걷는 속도 +15%, 등불 연료 15% 덜 닳음', m: [['moveSpeed', 'mul', 1.15], ['lampDrain', 'mul', 0.85]] },
    { id: 'c_hearth', name: '오래 타는 화덕', r: 3, desc: '모닥불이 22% 덜 줄어든다', m: [['fireBurn', 'mul', 0.78]] }
  ];

  // 유물 24 — 여섯째·열두째… 새벽에 셋 중 하나. 앞 12개는 처음부터, 뒤 12개는 야영지에서 불씨로 연다.
  const RELICS = [
    { id: 'r_compass', name: '낡은 나침반', cost: 0, desc: '어둠 속 장작이 15% 더 자주 떨어지고 줍는 거리 +6', m: [['logRate', 'mul', 1.15], ['pickR', 'add', 6]] },
    { id: 'r_kettle', name: '찌그러진 주전자', cost: 0, desc: '모닥불 곁 회복 +1/초', m: [['regen', 'add', 1]] },
    { id: 'r_mitten', name: '짝 잃은 장갑', cost: 0, desc: '모으는 빠르기 +15%', m: [['gatherSpeed', 'mul', 1.15]] },
    { id: 'r_bell', name: '놋쇠 방울', cost: 0, desc: '빛 안 그림자가 12% 더 느려진다', m: [['lightSlow', 'add', 0.12]] },
    { id: 'r_flint', name: '부싯돌', cost: 0, desc: '모닥불에 넣을 때 불빛 안 그림자에게 30 피해', m: [['feedBurst', 'add', 30]] },
    { id: 'r_jar', name: '연료 단지', cost: 0, desc: '등불 연료 최대 +20, 쓰러뜨릴 때 등불 연료 +1', m: [['oilMax', 'add', 20], ['oilOnKill', 'add', 1]] },
    { id: 'r_shovel', name: '작은 삽', cost: 0, desc: '쓰러뜨릴 때 모닥불 연료 +1', m: [['fuelOnKill', 'add', 1]] },
    { id: 'r_scarf', name: '붉은 목도리', cost: 0, desc: '받는 피해 -12%', m: [['armor', 'add', 0.12]] },
    { id: 'r_map', name: '그을린 지도', cost: 0, desc: '그림자가 장작을 떨어뜨릴 확률 +10%', m: [['dropChance', 'add', 0.1]] },
    { id: 'r_pouch', name: '불씨 주머니', cost: 0, desc: '얻는 불씨 +40%', m: [['emberMul', 'mul', 1.4]] },
    { id: 'r_owl', name: '부엉이 깃', cost: 0, desc: '등불 빛 반경 +15%', m: [['lampRadius', 'mul', 1.15]] },
    { id: 'r_stone', name: '따뜻한 돌', cost: 0, desc: '새벽 회복 +10, 배고픔 10% 천천히', m: [['dawnHeal', 'add', 10], ['hungerRate', 'mul', 0.9]] },
    { id: 'r_mirror', name: '손거울', cost: 60, desc: '등불 피해 +20%', m: [['lampDps', 'mul', 1.2]] },
    { id: 'r_grate', name: '쇠 석쇠', cost: 60, desc: '모닥불이 15% 덜 줄어든다', m: [['fireBurn', 'mul', 0.85]] },
    { id: 'r_horn', name: '뿔피리', cost: 80, desc: '불티 피해 +20', m: [['spark', 'add', 20]] },
    { id: 'r_coat', name: '송진 바른 외투', cost: 80, desc: '닿은 그림자에게 초당 12 피해, 받는 피해 -5%', m: [['thorns', 'add', 12], ['armor', 'add', 0.05]] },
    { id: 'r_drum', name: '작은 북', cost: 90, desc: '걷는 속도 +12%', m: [['moveSpeed', 'mul', 1.12]] },
    { id: 'r_cask', name: '술통 장작', cost: 90, desc: '불에 넣는 장작 값 +25%', m: [['woodFire', 'mul', 1.25]] },
    { id: 'r_lens', name: '볼록 유리', cost: 100, desc: '등불 빛 반경 +10%, 등불 피해 +10%', m: [['lampRadius', 'mul', 1.1], ['lampDps', 'mul', 1.1]] },
    { id: 'r_doll', name: '짚 인형', cost: 110, desc: '모닥불이 꺼지면 한 번 다시 붙는다', m: [['revive', 'add', 1]] },
    { id: 'r_cauldron', name: '무쇠솥', cost: 120, desc: '그림자가 불에 닿아 깎는 연료 -30%', m: [['hitResist', 'add', 0.3]] },
    { id: 'r_feather', name: '불새 깃', cost: 140, desc: '등불이 40% 더 세게 밀어내고 등불 연료가 10% 덜 닳는다', m: [['lampPush', 'mul', 1.4], ['lampDrain', 'mul', 0.9]] },
    { id: 'r_star', name: '떨어진 별', cost: 160, desc: '모닥불 빛 반경 +15%, 빛 안 그림자 초당 4 피해', m: [['fireRadius', 'mul', 1.15], ['fireDps', 'add', 4]] },
    { id: 'r_crown', name: '숯 왕관', cost: 200, desc: '체력 35% 아래면 등불 피해 1.5배, 등불 피해 +15%', m: [['rage', 'add', 1], ['lampDps', 'mul', 1.15]] }
  ];

  // 야영 준비 6 — 판을 넘어 쌓이는 영구 강화 (각 3단계, 불씨로 올린다)
  const PREP = [
    { id: 'p_wood', name: '챙겨 온 장작', desc: '시작할 때 마른 가지 +1', cost: [20, 45, 80], m: [['startWood', 'add', 1]] },
    { id: 'p_fuel', name: '마른 불쏘시개', desc: '시작 모닥불 연료 +8', cost: [20, 45, 80], m: [['startFuel', 'add', 8]] },
    { id: 'p_hp', name: '밤샘 단련', desc: '최대 체력 +8', cost: [25, 50, 90], m: [['maxHp', 'add', 8]] },
    { id: 'p_oil', name: '연료병', desc: '등불 연료 최대 +8', cost: [25, 50, 90], m: [['oilMax', 'add', 8]] },
    { id: 'p_dawn', name: '새벽 단잠', desc: '새벽 회복 +4', cost: [30, 60, 100], m: [['dawnHeal', 'add', 4]] },
    { id: 'p_gather', name: '손에 익은 일', desc: '모으는 빠르기 +8%', cost: [20, 40, 70], m: [['gatherSpeed', 'mul', 1.08]] }
  ];

  // 등불 6 — 출발 준비에서 하나 고른다. need: 열리는 기준(가장 오래 버틴 날 수), feat: 카드에 쓰는 특징 한 줄
  // glass: 등불 유리 색(style.css :root 변수 이름), m: 이번 판 능력치에 더하는 것
  const LANTERNS = [
    { id: 'tin', name: '양철 등불', need: 0, glass: '--lamp', feat: '고른 등불. 빛·미는 힘·연료가 보통이다.', m: [] },
    { id: 'wide', name: '넓은 갓 등불', need: 2, glass: '--fire-hot', feat: '빛이 20% 넓고, 깎는 힘은 15% 약하다.', m: [['lampRadius', 'mul', 1.2], ['lampDps', 'mul', 0.85]] },
    { id: 'thrift', name: '아끼는 등불', need: 3, glass: '--good', feat: '연료가 25% 덜 닳고, 연료 통은 10 작다.', m: [['lampDrain', 'mul', 0.75], ['oilMax', 'add', -10]] },
    { id: 'gust', name: '바람 등불', need: 4, glass: '--text', feat: '그림자를 40% 더 세게 밀고, 깎는 힘은 20% 약하다.', m: [['lampPush', 'mul', 1.4], ['lampDps', 'mul', 0.8]] },
    { id: 'coal', name: '숯불 등불', need: 5, glass: '--fire', feat: '깎는 힘이 25% 세고, 연료가 25% 빨리 닳는다.', m: [['lampDps', 'mul', 1.25], ['lampDrain', 'mul', 1.25]] },
    { id: 'barrel', name: '큰 통 등불', need: 7, glass: '--rare', feat: '연료 통 +30, 무거워 걸음이 8% 느리다.', m: [['oilMax', 'add', 30], ['moveSpeed', 'mul', 0.92]] }
  ];

  // 야영지 5 — 출발 준비에서 고르는 시작 지도. 고른 곳에서 날을 이어 간다.
  // prev·days: 그 전 야영지에서 이만큼 버티면 열린다. plan: 지도에 놓이는 자원 수, m: 그 땅의 날씨
  // 땅 색은 style.css :root 의 `--land-<id>`·`--land-<id>-deco`·`--land-<id>-dark`
  const CAMPS = [
    { id: 'pine', name: '솔숲', prev: null, days: 0, feat: '나무와 열매가 고르게 있는 처음 숲.', m: [],
      plan: [['tree', 10], ['pinetree', 6], ['stone', 12], ['hardstone', 5], ['grass', 14], ['bush', 9], ['mushroom', 9]] },
    { id: 'marsh', name: '늪', prev: 'pine', days: 3, feat: '버섯과 풀이 많고 돌이 적은 젖은 땅.', m: [],
      plan: [['tree', 8], ['pinetree', 6], ['stone', 8], ['hardstone', 4], ['grass', 20], ['bush', 8], ['mushroom', 14]] },
    { id: 'snow', name: '고개', prev: 'marsh', days: 4, feat: '돌이 많고 열매가 드물다. 바람에 배가 빨리 고프다.', m: [['hungerRate', 'mul', 1.1]],
      plan: [['tree', 7], ['pinetree', 6], ['stone', 16], ['hardstone', 8], ['grass', 10], ['bush', 5], ['mushroom', 6]] },
    { id: 'canyon', name: '협곡', prev: 'snow', days: 5, feat: '나무가 드물고 단단한 돌이 많다. 어둠이 더 아프다.', m: [['darkDps', 'mul', 1.15]],
      plan: [['tree', 6], ['pinetree', 5], ['stone', 14], ['hardstone', 9], ['grass', 12], ['bush', 8], ['mushroom', 8]] },
    { id: 'village', name: '마을터', prev: 'canyon', days: 6, feat: '빈집 둘레. 열매 덤불이 많지만 나무가 적다.', m: [],
      plan: [['tree', 6], ['pinetree', 5], ['stone', 12], ['hardstone', 5], ['grass', 14], ['bush', 13], ['mushroom', 8]] }
  ];

  // 업적 20
  const ACHS = [
    { id: 'a_first', name: '첫 새벽', desc: '첫째 밤을 버틴다' },
    { id: 'a_d3', name: '사흘', desc: '한 판에 밤 셋을 버틴다' },
    { id: 'a_d5', name: '닷새', desc: '한 판에 밤 다섯을 버틴다' },
    { id: 'a_d10', name: '열흘', desc: '한 판에 밤 열을 버틴다' },
    { id: 'a_d20', name: '스무 날', desc: '한 판에 밤 스물을 버틴다' },
    { id: 'a_boss', name: '큰 그림자 버티기', desc: '큰 그림자가 온 밤을 처음 버틴다' },
    { id: 'a_k100', name: '그림자 백', desc: '그림자를 모두 합쳐 100 쓰러뜨린다' },
    { id: 'a_k1000', name: '그림자 천', desc: '그림자를 모두 합쳐 1000 쓰러뜨린다' },
    { id: 'a_fire50', name: '불지기', desc: '불에 장작을 모두 합쳐 50 넣는다' },
    { id: 'a_lamp20', name: '등불지기', desc: '등불에 장작을 모두 합쳐 20 넣는다' },
    { id: 'a_brazier4', name: '네 개의 불', desc: '한 판에 화톳불 넷을 세운다' },
    { id: 'a_fence8', name: '말뚝 담', desc: '한 판에 말뚝 울타리를 여덟 박는다' },
    { id: 'a_trap10', name: '덫 사냥꾼', desc: '덫으로 그림자를 모두 합쳐 10번 묶는다' },
    { id: 'a_fireup3', name: '큰불', desc: '모닥불을 3단계까지 키운다' },
    { id: 'a_lamp3', name: '손질한 등불', desc: '등불을 세 번 손질한다' },
    { id: 'a_pile6', name: '가득 찬 장작 더미', desc: '장작 더미에 장작 여섯을 쌓는다' },
    { id: 'a_tree50', name: '나무꾼', desc: '나무를 모두 합쳐 50 그루 벤다' },
    { id: 'a_eat30', name: '배부른 불지기', desc: '열매·구운 버섯을 모두 합쳐 30번 먹는다' },
    { id: 'a_close', name: '아슬아슬', desc: '모닥불 연료가 5 아래로 떨어지고도 그 밤을 버틴다' },
    { id: 'a_runs10', name: '열 번의 밤샘', desc: '판을 열 번 한다' }
  ];

  // 야영 일지 20 — d: 그 수만큼 밤을 버티면 열린다 (0 은 처음 시작할 때)
  const JOURNAL = [
    { d: 0, title: '첫 장작', text: '마을 사람들은 밤이 길어졌다고 했다. 불을 지키는 사람이 하나는 있어야 한다고. 나는 등불 하나와 장작 몇 개를 들고 숲으로 왔다.' },
    { d: 1, title: '첫 새벽', text: '해가 들자 그림자는 이슬처럼 사라졌다. 낮 동안 나무를 베고 돌을 모아야 한다. 밤은 반드시 다시 온다.' },
    { d: 2, title: '둘째 새벽', text: '그림자는 불을 미워하는 게 아니라 빛을 꺼뜨리고 싶어 한다. 그래서 불이 클수록 더 많이 모여든다.' },
    { d: 3, title: '사흘째', text: '화톳불을 하나 더 세웠다. 그림자들이 그쪽으로 몰려가는 동안 모닥불은 조용했다. 작은 불이 큰 불을 지켜 준다.' },
    { d: 4, title: '나흘째', text: '숲 깊은 곳 송진 나무는 손에 끈적하게 붙는다. 그 장작 하나면 등불이 오래 버틴다.' },
    { d: 5, title: '큰 그림자', text: '늙은 솔그늘이 숲 끝에서 나를 봤다. 등불로 밀어내도 다시 온다. 덫과 울타리가 아니었다면 불은 꺼졌을 것이다.' },
    { d: 6, title: '엿새째', text: '장작 더미 옆에 젖은 장작을 두었더니 하룻밤 새 말라 있었다. 불이 숨을 나눠 준 것 같다.' },
    { d: 7, title: '이레째', text: '이제 야영지는 한눈에 다 보이지 않을 만큼 넓다. 화톳불 사이를 걸으면 어둠이 멀게 느껴진다.' },
    { d: 8, title: '여드레째', text: '서리 숨이 닿은 손가락이 한참 굳어 있었다. 불 곁에서 녹이며 다음 밤을 생각한다.' },
    { d: 9, title: '아흐레째', text: '빛 가리는 장막 뒤에 숨은 그림자는 등불로도 잘 타지 않는다. 장막부터 걷어 내야 한다.' },
    { d: 10, title: '열흘', text: '두 번째 큰 그림자가 왔다 갔다. 열흘을 버티자 숲이 나를 조금은 알아보는 것 같다.' },
    { d: 12, title: '열이틀', text: '불씨 도둑은 잡히지 않으려 달아난다. 훔친 불씨로 저쪽 어딘가에 자기 불을 피우는 걸까.' },
    { d: 14, title: '두 이레', text: '배가 고프면 등불을 든 손이 떨린다. 낮에 열매를 따 두는 것도 불을 지키는 일이다.' },
    { d: 15, title: '보름', text: '세 번째 큰 그림자, 하얀 숨이 지나간 자리에 서리꽃이 피었다. 아침 해에 금방 녹았다.' },
    { d: 17, title: '열이레', text: '울타리 말뚝이 부러질 때마다 그림자 하나가 멈칫한다. 그 한 번의 멈칫이 밤을 바꾼다.' },
    { d: 20, title: '스무 날', text: '불은 나보다 오래 산다. 나는 그 불을 하루 더 살게 해 줄 뿐이다.' },
    { d: 25, title: '스무닷새', text: '빈집의 주인이 문을 두드리지 않고 들어왔다. 등불을 꼭 쥐고 잠들지 않았다.' },
    { d: 30, title: '한 달', text: '한 달 동안 꺼지지 않은 불. 누군가 이 숲을 지나다 이 빛을 본다면 길을 잃지 않을 것이다.' },
    { d: 40, title: '마흔 날', text: '이제 그림자들도 새벽이 오는 것을 아는 것 같다. 해가 뜨기 직전 그들은 잠깐 멈춰 서서 불을 본다.' },
    { d: 50, title: '쉰 날', text: '마을에서 사람 하나가 등불을 들고 찾아왔다. 이 불을 같이 지키겠다고 했다. 처음으로 깊이 잤다.' }
  ];

  function map(arr) { const o = {}; arr.forEach(function (x) { o[x.id] = x; }); return o; }

  return {
    WOODS: WOODS, ITEMS: ITEMS, NODES: NODES, BUILDS: BUILDS, NIGHTS: NIGHTS, ENEMIES: ENEMIES,
    SPAWN_ORDER: SPAWN_ORDER, BOSSES: BOSSES, CARDS: CARDS, RELICS: RELICS, PREP: PREP,
    LANTERNS: LANTERNS, CAMPS: CAMPS, ACHS: ACHS, JOURNAL: JOURNAL,
    WOOD_MAP: map(WOODS), ITEM_MAP: map(ITEMS), NODE_MAP: map(NODES), BUILD_MAP: map(BUILDS),
    ENEMY_MAP: map(ENEMIES), CARD_MAP: map(CARDS), RELIC_MAP: map(RELICS), PREP_MAP: map(PREP),
    LANTERN_MAP: map(LANTERNS), CAMP_MAP: map(CAMPS)
  };
})();
