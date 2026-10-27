/* Tide Haul — 콘텐츠 데이터. 규칙은 game.js, 화면은 ui.js */
'use strict';

var DATA = {};

DATA.W = 15;          // 바다 판 가로 칸
DATA.H = 24;          // 바다 판 세로 칸 (0줄은 물 위)
DATA.BOAT_X = 7;      // 배가 떠 있는 칸
DATA.DIVES = 3;       // 하루 잠수 횟수
DATA.DAY_MAX = 8;     // 마지막 날

/* 처음 능력치 — 모든 효과는 이 이름에 더해진다 */
DATA.BASE = {
  airMax: 40, str: 5, maxLoad: 12, radius: 2, keep: 0.4,
  valAll: 0, val0: 0, val1: 0, val2: 0, val3: 0, val4: 0,
  reqMul: 0, quotaMul: 0, bubble: 0, stingMul: 0, upMul: 0,
  kelpFree: 0, digFree: 0, pinchImmune: 0, stealImmune: 0, inkImmune: 0,
  firstAir: 0, interest: 0, pullDiscount: 0, score: 0, digLuck: 0, vent: 0
};

/* 구역 — 깊이(줄)로 나뉜다 */
DATA.ZONES = [
  { id: 'shoal', name: '얕은 여울', from: 1, to: 4, color: '--z0', rock: 0.16, sand: 0.12, kelp: 0.04, note: '햇빛이 닿는 모래 바닥. 가볍고 값싼 것이 많다.' },
  { id: 'kelp', name: '다시마 숲', from: 5, to: 9, color: '--z1', rock: 0.14, sand: 0.05, kelp: 0.26, note: '다시마 칸은 지날 때 산소가 하나 더 든다.' },
  { id: 'wreck', name: '난파선 골짜기', from: 10, to: 14, color: '--z2', rock: 0.24, sand: 0.08, kelp: 0.05, note: '무거운 쇠붙이와 궤짝. 곰치가 숨어 있다.' },
  { id: 'coral', name: '산호 절벽', from: 15, to: 19, color: '--z3', rock: 0.26, sand: 0.06, kelp: 0.06, note: '값진 산호와 진주. 쏘는 것이 많다.' },
  { id: 'trench', name: '검은 해구', from: 20, to: 23, color: '--z4', rock: 0.22, sand: 0.04, kelp: 0.02, note: '빛이 없는 바닥. 등대를 다시 켤 조각이 잠들어 있다.' }
];

/* 하루 — 납품 목표와 바다 상태 (stage = day) */
DATA.DAYS = [
  { day: 1, name: '잔잔한 물때', quota: 7, hazard: 0, loot: 1, current: 0.02 },
  { day: 2, name: '흐린 물때', quota: 9, hazard: 1, loot: 1, current: 0.03 },
  { day: 3, name: '바람 부는 물때', quota: 11, hazard: 1, loot: 1, current: 0.04 },
  { day: 4, name: '보름 물때', quota: 12, hazard: 2, loot: 2, current: 0.04 },
  { day: 5, name: '안개 물때', quota: 14, hazard: 2, loot: 2, current: 0.05 },
  { day: 6, name: '센 물때', quota: 15, hazard: 3, loot: 2, current: 0.06 },
  { day: 7, name: '폭풍 뒤 물때', quota: 16, hazard: 3, loot: 3, current: 0.06 },
  { day: 8, name: '등대의 밤', quota: 18, hazard: 4, loot: 3, current: 0.07 }
];

/* 보물 40 — zone, 무게 w, 값 v */
DATA.TREASURES = [
  { id: 'shell', zone: 0, name: '소라 껍데기', icon: '🐚', w: 1, v: 2 },
  { id: 'seaglass', zone: 0, name: '바다 유리', icon: '💠', w: 1, v: 3 },
  { id: 'starfish', zone: 0, name: '마른 불가사리', icon: '⭐', w: 1, v: 2 },
  { id: 'bottle', zone: 0, name: '편지 병', icon: '🍾', w: 2, v: 5 },
  { id: 'oldcoin', zone: 0, name: '구멍 난 동전', icon: '🪙', w: 1, v: 4 },
  { id: 'button', zone: 0, name: '놋쇠 단추', icon: '🔘', w: 1, v: 3 },
  { id: 'net', zone: 0, name: '찢긴 그물', icon: '🕸️', w: 2, v: 3 },
  { id: 'spoon', zone: 0, name: '은 숟가락', icon: '🥄', w: 1, v: 5 },

  { id: 'clam', zone: 1, name: '진주조개', icon: '🦪', w: 2, v: 8 },
  { id: 'kelpbundle', zone: 1, name: '다시마 묶음', icon: '🌿', w: 2, v: 5 },
  { id: 'bell', zone: 1, name: '작은 종', icon: '🔔', w: 2, v: 7 },
  { id: 'compass', zone: 1, name: '녹슨 나침반', icon: '🧭', w: 2, v: 9 },
  { id: 'brokenlamp', zone: 1, name: '깨진 등', icon: '🏮', w: 3, v: 9 },
  { id: 'ring', zone: 1, name: '산호 반지', icon: '💍', w: 1, v: 10 },
  { id: 'watch', zone: 1, name: '회중시계', icon: '⏱️', w: 2, v: 9 },
  { id: 'doll', zone: 1, name: '나무 인형', icon: '🪆', w: 2, v: 6 },

  { id: 'chest', zone: 2, name: '작은 궤짝', icon: '🧰', w: 4, v: 18 },
  { id: 'anchor', zone: 2, name: '녹슨 닻', icon: '⚓', w: 6, v: 16 },
  { id: 'ironball', zone: 2, name: '쇠공', icon: '⚫', w: 4, v: 10 },
  { id: 'goblet', zone: 2, name: '은잔', icon: '🏆', w: 2, v: 14 },
  { id: 'chart', zone: 2, name: '젖은 해도', icon: '🗺️', w: 1, v: 12 },
  { id: 'wheel', zone: 2, name: '키 손잡이', icon: '☸️', w: 5, v: 17 },
  { id: 'jar', zone: 2, name: '선장의 병', icon: '🍶', w: 2, v: 11 },
  { id: 'spyglass', zone: 2, name: '망원경', icon: '🔭', w: 3, v: 15 },

  { id: 'pinkcoral', zone: 3, name: '분홍 산호', icon: '🪸', w: 3, v: 20 },
  { id: 'blackpearl', zone: 3, name: '검은 진주', icon: '🌑', w: 1, v: 24 },
  { id: 'crown', zone: 3, name: '조개 왕관', icon: '👑', w: 3, v: 26 },
  { id: 'amber', zone: 3, name: '호박 덩이', icon: '🟠', w: 2, v: 19 },
  { id: 'fossil', zone: 3, name: '소라 화석', icon: '🦴', w: 3, v: 18 },
  { id: 'mirror', zone: 3, name: '바다 거울', icon: '🪞', w: 2, v: 22 },
  { id: 'vase', zone: 3, name: '산호 항아리', icon: '🏺', w: 4, v: 25 },
  { id: 'bluestone', zone: 3, name: '푸른 돌', icon: '💎', w: 1, v: 28 },

  { id: 'lens', zone: 4, name: '등대 렌즈 조각', icon: '🔆', w: 3, v: 40 },
  { id: 'idol', zone: 4, name: '해구 석상', icon: '🗿', w: 6, v: 45 },
  { id: 'glowshell', zone: 4, name: '빛 조개', icon: '✨', w: 2, v: 34 },
  { id: 'starstone', zone: 4, name: '별똥 돌', icon: '☄️', w: 4, v: 42 },
  { id: 'deepegg', zone: 4, name: '심해 알', icon: '🥚', w: 3, v: 36 },
  { id: 'orb', zone: 4, name: '물빛 구슬', icon: '🫧', w: 1, v: 38 },
  { id: 'bonekey', zone: 4, name: '고래뼈 열쇠', icon: '🗝️', w: 2, v: 40 },
  { id: 'harp', zone: 4, name: '바다 하프', icon: '🎼', w: 5, v: 50 }
];

/* 바다 생물 25 — fx: sting(산소 깎기) pinch(가벼운 것 떨어뜨림) steal(비싼 것 가져감)
   ink(등불 좁아짐) push(위로 밀림) slow(걸음마다 산소 +1) gift(산소 줌) guide(둘레를 밝힘)
   stay: 효과 뒤에도 그 칸에 남음 / mover: 걸음마다 한 칸씩 헤엄침 */
DATA.CREATURES = [
  { id: 'jelly', zone: 0, name: '물해파리', icon: '🎐', fx: 'sting', p: 4, note: '닿으면 산소 4를 잃는다.' },
  { id: 'crab', zone: 0, name: '집게 게', icon: '🦀', fx: 'pinch', p: 1, note: '가장 가벼운 것 하나를 떨어뜨린다.' },
  { id: 'urchin', zone: 0, name: '가시 성게', icon: '🌰', fx: 'sting', p: 3, stay: true, note: '움직이지 않지만 지날 때마다 찔린다.' },
  { id: 'turtle', zone: 0, name: '느림보 거북', icon: '🐢', fx: 'gift', p: 8, note: '등에서 공기 방울을 나눠 준다 (+8).' },
  { id: 'minnow', zone: 0, name: '은빛 송사리 떼', icon: '🐟', fx: 'guide', p: 3, mover: true, note: '둘레 3칸을 밝혀 준다.' },

  { id: 'octopus', zone: 1, name: '먹물 문어', icon: '🐙', fx: 'ink', p: 6, note: '6걸음 동안 등불이 한 칸 좁아진다.' },
  { id: 'eel', zone: 1, name: '틈새 곰치', icon: '🐍', fx: 'steal', p: 1, mover: true, note: '헤엄쳐 다니다 가장 비싼 것을 물어 간다.' },
  { id: 'seahorse', zone: 1, name: '꼬리 해마', icon: '🦄', fx: 'gift', p: 5, note: '산소 5를 나눠 준다.' },
  { id: 'vine', zone: 1, name: '감기는 덩굴', icon: '🪢', fx: 'slow', p: 4, stay: true, note: '4걸음 동안 걸음마다 산소가 1 더 든다.' },
  { id: 'squid', zone: 1, name: '꼬마 오징어', icon: '🦑', fx: 'ink', p: 4, mover: true, note: '헤엄쳐 다니며 먹물을 뿌린다.' },

  { id: 'pup', zone: 2, name: '새끼 상어', icon: '🦈', fx: 'sting', p: 8, mover: true, note: '들이받아 산소 8을 잃게 한다.' },
  { id: 'barnacle', zone: 2, name: '따개비 무리', icon: '🪨', fx: 'slow', p: 3, stay: true, note: '긁혀서 3걸음 동안 느려진다.' },
  { id: 'hermit', zone: 2, name: '소라게 대장', icon: '🐌', fx: 'pinch', p: 2, note: '가벼운 것 둘을 떨어뜨린다.' },
  { id: 'ray', zone: 2, name: '넓적 가오리', icon: '🪁', fx: 'push', p: 3, note: '날개짓에 위로 3칸 밀려 오른다.' },
  { id: 'school', zone: 2, name: '정어리 떼', icon: '🐠', fx: 'guide', p: 4, mover: true, note: '둘레 4칸을 밝혀 준다.' },

  { id: 'lionfish', zone: 3, name: '부채 쏠배', icon: '🎏', fx: 'sting', p: 7, stay: true, note: '산호 틈에서 산소 7을 쏜다.' },
  { id: 'bigoct', zone: 3, name: '큰 문어', icon: '🐙', fx: 'ink', p: 8, fx2: 'pinch', p2: 1, note: '먹물 8걸음, 가벼운 것 하나를 뺏는다.' },
  { id: 'kingeel', zone: 3, name: '곰치 우두머리', icon: '🐉', fx: 'steal', p: 2, mover: true, note: '비싼 것 둘을 물어 간다.' },
  { id: 'torpedo', zone: 3, name: '저릿 가오리', icon: '⚡', fx: 'slow', p: 5, fx2: 'sting', p2: 3, note: '5걸음 느려지고 산소 3을 잃는다.' },
  { id: 'whale', zone: 3, name: '노래 고래', icon: '🐋', fx: 'gift', p: 15, fx2: 'push', p2: 2, note: '산소 15를 주고 위로 2칸 들어 올린다.' },

  { id: 'angler', zone: 4, name: '초롱 아귀', icon: '🏮', fx: 'steal', p: 1, fx2: 'sting', p2: 5, mover: true, note: '불빛으로 꾀어 비싼 것을 물고 산소 5를 깎는다.' },
  { id: 'deepjelly', zone: 4, name: '심해 해파리', icon: '🪼', fx: 'sting', p: 10, note: '산소 10을 잃는다.' },
  { id: 'giantsquid', zone: 4, name: '큰 오징어', icon: '🦑', fx: 'ink', p: 10, fx2: 'sting', p2: 4, mover: true, note: '먹물 10걸음, 산소 4.' },
  { id: 'glowfish', zone: 4, name: '빛 물고기', icon: '🐡', fx: 'guide', p: 5, mover: true, note: '둘레 5칸을 밝혀 준다.' },
  { id: 'trenchcrab', zone: 4, name: '해구 대게', icon: '🦞', fx: 'pinch', p: 2, fx2: 'sting', p2: 4, stay: true, note: '가벼운 것 둘을 떨어뜨리고 산소 4.' }
];

/* 장비 8줄 × 3단계 = 24 — 배 위 가게에서 동전으로 산다 */
DATA.GEAR = [
  { id: 'tank', name: '산소통', icon: '🫙', levels: [
    { price: 18, mod: { airMax: 12 }, desc: '산소 +12' },
    { price: 40, mod: { airMax: 12 }, desc: '산소 +12' },
    { price: 75, mod: { airMax: 16 }, desc: '산소 +16' } ] },
  { id: 'belt', name: '버팀 허리띠', icon: '🎗️', levels: [
    { price: 20, mod: { str: 2 }, desc: '버티는 힘 +2 (무거워도 덜 지친다)' },
    { price: 44, mod: { str: 2 }, desc: '버티는 힘 +2' },
    { price: 80, mod: { str: 3 }, desc: '버티는 힘 +3' } ] },
  { id: 'lamp', name: '물속 등불', icon: '🔦', levels: [
    { price: 14, mod: { radius: 1 }, desc: '보이는 거리 +1' },
    { price: 34, mod: { radius: 1 }, desc: '보이는 거리 +1' },
    { price: 60, mod: { radius: 1, inkImmune: 1 }, desc: '보이는 거리 +1, 먹물이 듣지 않음' } ] },
  { id: 'fins', name: '오리발', icon: '🩴', levels: [
    { price: 16, mod: { upMul: -0.15 }, desc: '위로 오르는 걸음 산소 -15%' },
    { price: 36, mod: { upMul: -0.15 }, desc: '위로 오르는 걸음 산소 -15%' },
    { price: 64, mod: { upMul: -0.2 }, desc: '위로 오르는 걸음 산소 -20%' } ] },
  { id: 'bag', name: '그물 가방', icon: '🎒', levels: [
    { price: 15, mod: { maxLoad: 5 }, desc: '들 수 있는 무게 +5' },
    { price: 35, mod: { maxLoad: 5 }, desc: '들 수 있는 무게 +5' },
    { price: 62, mod: { maxLoad: 6 }, desc: '들 수 있는 무게 +6' } ] },
  { id: 'knife', name: '잠수 칼', icon: '🔪', levels: [
    { price: 14, mod: { kelpFree: 1 }, desc: '다시마를 베어 지남 (추가 산소 없음)' },
    { price: 32, mod: { stealImmune: 0.5 }, desc: '곰치·아귀를 반쯤 쫓아냄' },
    { price: 58, mod: { digFree: 1 }, desc: '모래를 산소 없이 팜' } ] },
  { id: 'buoy', name: '비상 부표', icon: '🛟', levels: [
    { price: 12, mod: { keep: 0.15 }, desc: '산소가 떨어져도 건지는 몫 +15%' },
    { price: 28, mod: { keep: 0.15 }, desc: '건지는 몫 +15%' },
    { price: 50, mod: { keep: 0.15, pullDiscount: 0.1 }, desc: '건지는 몫 +15%, 줄 당기기 산소 -10%' } ] },
  { id: 'glove', name: '고무 장갑', icon: '🧤', levels: [
    { price: 12, mod: { stingMul: -0.2 }, desc: '쏘이는 산소 -20%' },
    { price: 30, mod: { pinchImmune: 1 }, desc: '집게에 물려도 떨어뜨리지 않음' },
    { price: 55, mod: { stingMul: -0.25 }, desc: '쏘이는 산소 -25%' } ] }
];

/* 부적 30 — 하루를 넘길 때 셋 중 하나를 고른다 */
DATA.CHARMS = [
  { id: 'deepbreath', name: '긴 숨 매듭', icon: '🌬️', rar: 1, mod: { airMax: 8 }, desc: '산소 +8' },
  { id: 'oxbone', name: '소뼈 단추', icon: '🦴', rar: 1, mod: { str: 1 }, desc: '버티는 힘 +1' },
  { id: 'glowbead', name: '반딧 구슬', icon: '🟡', rar: 1, mod: { radius: 1 }, desc: '보이는 거리 +1' },
  { id: 'widenet', name: '넓은 그물코', icon: '🧶', rar: 1, mod: { maxLoad: 4 }, desc: '들 수 있는 무게 +4' },
  { id: 'luckyknot', name: '행운 매듭', icon: '🪢', rar: 1, mod: { keep: 0.12 }, desc: '비상 때 건지는 몫 +12%' },
  { id: 'shoaltag', name: '여울 표지', icon: '🏷️', rar: 1, mod: { val0: 0.4 }, desc: '얕은 여울 보물 값 +40%' },
  { id: 'kelptag', name: '다시마 표지', icon: '🍃', rar: 1, mod: { val1: 0.35 }, desc: '다시마 숲 보물 값 +35%' },
  { id: 'wrecktag', name: '난파 표지', icon: '⚓', rar: 2, mod: { val2: 0.3 }, desc: '난파선 골짜기 보물 값 +30%' },
  { id: 'coraltag', name: '산호 표지', icon: '🪸', rar: 2, mod: { val3: 0.3 }, desc: '산호 절벽 보물 값 +30%' },
  { id: 'trenchtag', name: '해구 표지', icon: '🌀', rar: 3, mod: { val4: 0.3 }, desc: '검은 해구 보물 값 +30%' },
  { id: 'merchant', name: '장사꾼 저울', icon: '⚖️', rar: 2, mod: { valAll: 0.15 }, desc: '모든 보물 값 +15%' },
  { id: 'letter', name: '부탁 편지', icon: '✉️', rar: 1, mod: { reqMul: 0.5 }, desc: '부탁 보상 +50%' },
  { id: 'kindclerk', name: '너그러운 장부', icon: '📒', rar: 2, mod: { quotaMul: -0.12 }, desc: '납품 목표 -12%' },
  { id: 'bubblecup', name: '방울 컵', icon: '🫧', rar: 1, mod: { bubble: 4 }, desc: '공기 구멍 산소 +4' },
  { id: 'thickskin', name: '두꺼운 잠수복', icon: '🦺', rar: 1, mod: { stingMul: -0.25 }, desc: '쏘이는 산소 -25%' },
  { id: 'climber', name: '물살 타기', icon: '🐬', rar: 2, mod: { upMul: -0.2 }, desc: '위로 오르는 걸음 산소 -20%' },
  { id: 'kelpcutter', name: '다시마 낫', icon: '🌾', rar: 1, mod: { kelpFree: 1 }, desc: '다시마를 산소 없이 지남' },
  { id: 'shovel', name: '조개 삽', icon: '🪏', rar: 2, mod: { digFree: 1, digLuck: 0.1 }, desc: '모래를 산소 없이 파고, 묻힌 것을 더 찾음' },
  { id: 'claw', name: '게 집게 장식', icon: '🦀', rar: 2, mod: { pinchImmune: 1 }, desc: '집게에 물려도 떨어뜨리지 않음' },
  { id: 'eelcharm', name: '곰치 이빨', icon: '🦷', rar: 2, mod: { stealImmune: 0.6 }, desc: '물어 가는 것을 60% 막음' },
  { id: 'inkcloth', name: '먹물 천', icon: '🧣', rar: 2, mod: { inkImmune: 1 }, desc: '먹물이 등불을 가리지 않음' },
  { id: 'morningtea', name: '아침 보리차', icon: '🍵', rar: 1, mod: { firstAir: 12 }, desc: '그날 첫 잠수 산소 +12' },
  { id: 'piggy', name: '조개 저금통', icon: '🐖', rar: 2, mod: { interest: 0.1 }, desc: '하루 시작에 가진 동전 10% 이자' },
  { id: 'ropeknot', name: '빠른 줄 매듭', icon: '🧵', rar: 2, mod: { pullDiscount: 0.2 }, desc: '줄 당기기 산소 -20%' },
  { id: 'brightlung', name: '맑은 허파', icon: '🫁', rar: 3, mod: { airMax: 14, str: 1 }, desc: '산소 +14, 버티는 힘 +1' },
  { id: 'heavyhand', name: '무쇠 팔찌', icon: '⛓️', rar: 3, mod: { str: 3, maxLoad: 3 }, desc: '버티는 힘 +3, 무게 +3' },
  { id: 'deepeye', name: '깊은 눈', icon: '👁️', rar: 3, mod: { radius: 2 }, desc: '보이는 거리 +2' },
  { id: 'goldtooth', name: '금니 부적', icon: '🦷', rar: 3, mod: { valAll: 0.3 }, desc: '모든 보물 값 +30%' },
  { id: 'ventmap', name: '공기 구멍 지도', icon: '📍', rar: 2, mod: { vent: 2 }, desc: '잠수마다 공기 구멍 2개 더' },
  { id: 'scoreshell', name: '자랑 소라', icon: '📯', rar: 1, mod: { score: 0.2 }, desc: '점수 +20%' }
];

/* 부탁 30 — 하루에 둘. kind: item(그 보물 n개) zone(그 구역 보물 n개) haul(한 번에 v 이상) depth(그 줄까지 내려감) weight(한 번에 무게 w 이상) */
DATA.REQUESTS = [
  { id: 'r01', kind: 'item', t: 'shell', n: 2, reward: 6, z: 0, text: '아이들 목걸이에 쓸 소라 껍데기 2개' },
  { id: 'r02', kind: 'item', t: 'bottle', n: 1, reward: 8, z: 0, text: '편지 병 하나 — 누가 보낸 편지일까' },
  { id: 'r03', kind: 'zone', zone: 0, n: 4, reward: 8, z: 0, text: '여울 보물 4개를 한 번에' },
  { id: 'r04', kind: 'haul', v: 12, reward: 6, z: 0, text: '한 번에 12동전어치' },
  { id: 'r05', kind: 'depth', row: 6, reward: 6, z: 0, text: '다시마 숲(6줄)까지 내려가 보기' },
  { id: 'r06', kind: 'item', t: 'spoon', n: 1, reward: 7, z: 0, text: '식당 할머니의 은 숟가락' },
  { id: 'r07', kind: 'weight', w: 6, reward: 7, z: 0, text: '한 번에 무게 6 이상 건지기' },
  { id: 'r08', kind: 'item', t: 'clam', n: 1, reward: 10, z: 1, text: '진주조개 하나' },
  { id: 'r09', kind: 'zone', zone: 1, n: 3, reward: 12, z: 1, text: '다시마 숲 보물 3개' },
  { id: 'r10', kind: 'item', t: 'compass', n: 1, reward: 12, z: 1, text: '고깃배에 달 나침반' },
  { id: 'r11', kind: 'haul', v: 25, reward: 10, z: 1, text: '한 번에 25동전어치' },
  { id: 'r12', kind: 'depth', row: 10, reward: 10, z: 1, text: '난파선 골짜기(10줄)까지' },
  { id: 'r13', kind: 'item', t: 'bell', n: 1, reward: 11, z: 1, text: '학교 종을 새로' },
  { id: 'r14', kind: 'weight', w: 10, reward: 11, z: 1, text: '한 번에 무게 10 이상' },
  { id: 'r15', kind: 'item', t: 'chart', n: 1, reward: 16, z: 2, text: '젖은 해도 — 옛 뱃길을 알고 싶다' },
  { id: 'r16', kind: 'zone', zone: 2, n: 2, reward: 16, z: 2, text: '난파선 보물 2개' },
  { id: 'r17', kind: 'item', t: 'anchor', n: 1, reward: 18, z: 2, text: '부두에 걸 녹슨 닻' },
  { id: 'r18', kind: 'haul', v: 45, reward: 15, z: 2, text: '한 번에 45동전어치' },
  { id: 'r19', kind: 'depth', row: 15, reward: 15, z: 2, text: '산호 절벽(15줄)까지' },
  { id: 'r20', kind: 'item', t: 'goblet', n: 1, reward: 16, z: 2, text: '잔치에 쓸 은잔' },
  { id: 'r21', kind: 'weight', w: 14, reward: 15, z: 2, text: '한 번에 무게 14 이상' },
  { id: 'r22', kind: 'item', t: 'pinkcoral', n: 1, reward: 22, z: 3, text: '분홍 산호 한 가지' },
  { id: 'r23', kind: 'zone', zone: 3, n: 2, reward: 24, z: 3, text: '산호 절벽 보물 2개' },
  { id: 'r24', kind: 'item', t: 'blackpearl', n: 1, reward: 26, z: 3, text: '검은 진주 — 촌장의 부탁' },
  { id: 'r25', kind: 'haul', v: 70, reward: 22, z: 3, text: '한 번에 70동전어치' },
  { id: 'r26', kind: 'depth', row: 20, reward: 22, z: 3, text: '검은 해구(20줄)까지' },
  { id: 'r27', kind: 'item', t: 'lens', n: 1, reward: 40, z: 4, text: '등대 렌즈 조각 — 불을 다시 켜려면' },
  { id: 'r28', kind: 'zone', zone: 4, n: 2, reward: 36, z: 4, text: '해구 보물 2개' },
  { id: 'r29', kind: 'haul', v: 100, reward: 30, z: 4, text: '한 번에 100동전어치' },
  { id: 'r30', kind: 'depth', row: 23, reward: 30, z: 4, text: '바다 맨 밑(23줄) 찍고 오기' }
];

/* 잠수복 4 — 판을 넘어 불빛 조각으로 연다 */
DATA.SUITS = [
  { id: 'plain', name: '기본 잠수복', icon: '🤿', cost: 0, mod: {}, desc: '모자람도 넘침도 없다.' },
  { id: 'freediver', name: '맨몸 물질옷', icon: '🩱', cost: 6, mod: { airMax: 10, str: -1 }, desc: '산소 +10, 버티는 힘 -1. 가볍게 깊이.' },
  { id: 'porter', name: '짐꾼 잠수복', icon: '🦺', cost: 10, mod: { str: 3, maxLoad: 4, airMax: -6 }, desc: '버티는 힘 +3, 무게 +4, 산소 -6. 무겁게 많이.' },
  { id: 'lamplighter', name: '등대지기 옷', icon: '🧥', cost: 16, mod: { radius: 1, valAll: 0.1, maxLoad: -3 }, desc: '보이는 거리 +1, 보물 값 +10%, 무게 -3.' }
];

/* 업적 20 */
DATA.ACHS = [
  { id: 'a01', name: '첫 물질', desc: '처음으로 잠수를 마쳤다' },
  { id: 'a02', name: '다시마 아래', desc: '5줄 아래까지 내려갔다' },
  { id: 'a03', name: '난파선 손님', desc: '10줄 아래까지 내려갔다' },
  { id: 'a04', name: '산호 절벽', desc: '15줄 아래까지 내려갔다' },
  { id: 'a05', name: '검은 해구', desc: '20줄 아래까지 내려갔다' },
  { id: 'a06', name: '바다 바닥', desc: '맨 밑 23줄을 밟았다' },
  { id: 'a07', name: '든든한 하루', desc: '납품 목표를 처음 채웠다' },
  { id: 'a08', name: '등대가 켜지다', desc: '8일을 모두 버텼다' },
  { id: 'a09', name: '한 그물 50', desc: '한 번 잠수로 50동전 이상' },
  { id: 'a10', name: '한 그물 120', desc: '한 번 잠수로 120동전 이상' },
  { id: 'a11', name: '부탁 열 개', desc: '한 판에 부탁 10개를 들어줬다' },
  { id: 'a12', name: '숨 고르기', desc: '공기 구멍을 모두 20번 썼다' },
  { id: 'a13', name: '깨끗한 귀환', desc: '비상 부표 없이 8일을 버텼다' },
  { id: 'a14', name: '무거운 손', desc: '한 번에 무게 20 이상을 건졌다' },
  { id: 'a15', name: '장비 장인', desc: '장비 하나를 3단계까지 올렸다' },
  { id: 'a16', name: '부적 꾸러미', desc: '한 판에 부적 6개를 모았다' },
  { id: 'a17', name: '도둑맞은 바다', desc: '곰치·아귀에게 모두 5번 물려 갔다' },
  { id: 'a18', name: '백 번의 숨', desc: '모두 100번 잠수했다' },
  { id: 'a19', name: '해구의 보물', desc: '검은 해구 보물 8가지를 모두 건졌다' },
  { id: 'a20', name: '줄 끝의 감', desc: '산소를 3 이하로 남기고 걸어서 올라왔다' }
];

/* 섬 일지 20 — 조건을 이루면 열리는 짧은 글 */
DATA.LOG = [
  { id: 'l01', when: '첫날을 넘김', text: '등대가 꺼진 지 석 달. 섬 장부에는 갚을 몫이 날마다 적힌다. 오늘은 채웠다.' },
  { id: 'l02', when: '둘째 날을 넘김', text: '부두의 아이들이 소라 껍데기로 줄을 엮어 내 배에 걸어 주었다.' },
  { id: 'l03', when: '셋째 날을 넘김', text: '물때가 바뀌면 바다 밑 길도 바뀐다. 어제의 길을 믿지 말 것.' },
  { id: 'l04', when: '넷째 날을 넘김', text: '보름. 물이 가장 맑은 날이지만 가장 멀리까지 끌려 내려가는 날이기도 하다.' },
  { id: 'l05', when: '다섯째 날을 넘김', text: '안개가 짙어 배 위에서도 등불을 켰다. 줄 끝만이 집으로 가는 길이다.' },
  { id: 'l06', when: '여섯째 날을 넘김', text: '센 물살에 배가 두 번 기울었다. 짐을 덜 실은 날이 오히려 많이 번 날이었다.' },
  { id: 'l07', when: '일곱째 날을 넘김', text: '촌장이 등대 꼭대기 문을 열었다. 렌즈 자리가 텅 비어 있다.' },
  { id: 'l08', when: '여덟 날을 모두 버팀', text: '불이 켜졌다. 바다 밑까지 닿는 빛줄기를 따라 고깃배들이 돌아온다.' },
  { id: 'l09', when: '다시마 숲에 처음 닿음', text: '다시마는 손을 흔드는 것 같지만, 붙잡히면 숨이 두 배로 든다.' },
  { id: 'l10', when: '난파선 골짜기에 처음 닿음', text: '배 이름은 지워졌고 선실에는 곰치가 산다. 쇠붙이는 무겁다. 욕심은 더 무겁다.' },
  { id: 'l11', when: '산호 절벽에 처음 닿음', text: '산호는 아름답고 날카롭다. 쏠배의 부채 지느러미를 조심할 것.' },
  { id: 'l12', when: '검은 해구에 처음 닿음', text: '등불 밖은 완전한 밤. 무언가 빛나는 것이 나를 부른다. 저것은 미끼다.' },
  { id: 'l13', when: '처음 비상 부표를 띄움', text: '숨이 끊기기 직전 부표가 나를 끌어올렸다. 가방은 반이 비어 있었다.' },
  { id: 'l14', when: '처음 부탁을 들어줌', text: '부탁 하나를 들어주면 섬 사람 하나가 웃는다. 동전보다 오래 남는다.' },
  { id: 'l15', when: '처음 장비를 삼', text: '가게 주인은 낡은 산소통을 닦으며 말했다. "숨은 돈으로 사는 거야."' },
  { id: 'l16', when: '처음 물려 감', text: '곰치가 반지를 물고 바위 틈으로 사라졌다. 다음엔 칼을 챙기자.' },
  { id: 'l17', when: '처음 고래를 만남', text: '고래가 노래하자 몸이 떠올랐다. 등에 매달린 공기 방울이 은빛이었다.' },
  { id: 'l18', when: '처음 맨 밑을 밟음', text: '바닥은 생각보다 고요했다. 위를 보니 내 줄이 가늘게 빛났다.' },
  { id: 'l19', when: '한 번에 100동전 넘게 건짐', text: '저울이 기울어 가게 주인이 웃었다. 오늘은 섬이 조금 밝다.' },
  { id: 'l20', when: '잠수복을 새로 엶', text: '옷을 바꾸면 바다가 다르게 보인다. 같은 바다, 다른 숨.' }
];

/* 설정 7 */
DATA.SETTINGS = [
  { id: 'sound', name: '소리', type: 'bool', def: true },
  { id: 'vibrate', name: '진동', type: 'bool', def: true },
  { id: 'shake', name: '화면 흔들림', type: 'bool', def: true },
  { id: 'reduce', name: '움직임 줄이기', type: 'bool', def: false },
  { id: 'showPath', name: '돌아갈 길 표시', type: 'bool', def: true },
  { id: 'bigText', name: '큰 글자', type: 'bool', def: false },
  { id: 'warnAir', name: '산소 부족 경고음', type: 'bool', def: true }
];
