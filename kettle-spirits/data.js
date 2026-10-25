'use strict';
/* Kettle Spirits — 콘텐츠 데이터 */
var DATA = {};

/* 찻잎 12종 (기본 6 + 해금 6). eff 는 game.js brewEffect 가 읽는다. v 는 기본 값, up 은 한 단계 올릴 때 더하는 값 */
DATA.LEAVES = [
  { id: 'ssuk',    name: '쑥',     sym: '🌿', eff: 'calm',    v: 9,  up: 2, base: true,  desc: '맨 앞 정령의 화를 {v} 달랩니다.' },
  { id: 'gukhwa',  name: '국화',   sym: '🌼', eff: 'shield',  v: 8,  up: 2, base: true,  desc: '보호막 {v}을 얻습니다.' },
  { id: 'ginger',  name: '생강',   sym: '♨',  eff: 'calmAll', v: 6,  up: 1, base: true,  desc: '모든 정령의 화를 {v} 달랩니다.' },
  { id: 'mint',    name: '박하',   sym: '❄',  eff: 'delay',   v: 2,  up: 1, base: true,  desc: '맨 앞 정령의 다음 행동을 {v}수 늦추고 화를 2 달랩니다.' },
  { id: 'jujube',  name: '대추',   sym: '🍒', eff: 'heal',    v: 8,  up: 2, base: true,  desc: '평온을 {v} 되찾습니다.' },
  { id: 'yuja',    name: '유자',   sym: '🍋', eff: 'charge',  v: 35, up: 10, base: true, desc: '찻잔 기운을 {v} 채우고 맨 앞 정령을 3 달랩니다.' },
  { id: 'lotus',   name: '연꽃',   sym: '🌸', eff: 'pierce',  v: 9,  up: 3, base: false, desc: '막이를 무시하고 맨 앞 정령을 {v} 달랩니다.' },
  { id: 'cinnamon',name: '계피',   sym: '🌰', eff: 'steam',   v: 2,  up: 1, base: false, desc: '김이 4수 동안 맨 앞 정령을 수마다 {v} 달랩니다.' },
  { id: 'plum',    name: '매실',   sym: '🍏', eff: 'double',  v: 2,  up: 1, base: false, desc: '다음 우림의 효과가 두 배가 되고 지금 {v} 달랩니다.' },
  { id: 'barley',  name: '보리',   sym: '🌾', eff: 'sweep',   v: 3,  up: 1, base: false, desc: '주전자의 낙엽을 모두 치우고 보호막 {v}을 얻습니다.' },
  { id: 'omija',   name: '오미자', sym: '🍇', eff: 'mix',     v: 4,  up: 1, base: false, desc: '맨 앞 정령을 {v} 달래고 평온을 {v} 되찾습니다.' },
  { id: 'star',    name: '별꽃',   sym: '⭐', eff: 'wild',    v: 0,  up: 0, base: false, desc: '주전자에 넣으면 가장 많이 든 잎과 같은 잎이 됩니다.' }
];
DATA.JUNK = { id: 'junk', name: '낙엽', sym: '🍂', desc: '정령이 던져 넣은 낙엽. 셋이 모이면 사라질 뿐 아무 효과가 없습니다.' };

/* 계절 4곳. 단계 1~12 가 계절마다 3단계씩 */
DATA.SEASONS = [
  { id: 'spring', name: '봄 마당',   sub: '꽃가루가 날리는 찻집 앞마당', scale: 1.0 },
  { id: 'summer', name: '여름 개울', sub: '물소리 옆 대나무 평상',       scale: 1.25 },
  { id: 'autumn', name: '가을 숲',   sub: '낙엽이 쌓인 숲속 오솔길',     scale: 1.5 },
  { id: 'winter', name: '겨울 산',   sub: '눈 덮인 산마루 정자',         scale: 1.8 }
];

/* 정령 24 (계절마다 6). pattern: [행동, 값, 남은 수] 를 차례로 되풀이한다.
   행동: hit 평온 깎기 · clutter 낙엽 넣기 · guard 막이 얻기 · rage 화풀이 세기 오름 · lock 선반 칸 잠그기 · sulk 화 되찾기 · drain 보호막 무시 */
DATA.SPIRITS = [
  { id: 's01', season: 0, name: '투덜 새싹',     face: '🌱', hp: 10, pattern: [['hit', 2, 3], ['hit', 2, 3], ['guard', 1, 2]] },
  { id: 's02', season: 0, name: '재채기 꽃가루', face: '🌾', hp: 8,  pattern: [['clutter', 1, 3], ['hit', 2, 2]] },
  { id: 's03', season: 0, name: '심술 민들레씨', face: '🌬', hp: 10, pattern: [['hit', 3, 4], ['lock', 1, 2]] },
  { id: 's04', season: 0, name: '뾰로통 개구리', face: '🐸', hp: 9,  pattern: [['guard', 1, 3], ['hit', 3, 3]] },
  { id: 's05', season: 0, name: '수다 참새떼',   face: '🐦', hp: 9,  pattern: [['hit', 1, 2], ['hit', 1, 2], ['rage', 1, 3]] },
  { id: 's06', season: 0, name: '덜 깬 두더지',  face: '🐹', hp: 11, pattern: [['sulk', 1, 3], ['hit', 3, 4]] },

  { id: 's07', season: 1, name: '끈적 장맛비',   face: '🌧', hp: 10, pattern: [['clutter', 1, 3], ['hit', 2, 3]] },
  { id: 's08', season: 1, name: '후끈 아지랑이', face: '🔆', hp: 9,  pattern: [['drain', 1, 3], ['hit', 2, 3]] },
  { id: 's09', season: 1, name: '앵앵 모기떼',   face: '🦟', hp: 8,  pattern: [['hit', 1, 2], ['hit', 1, 3], ['hit', 2, 3]] },
  { id: 's10', season: 1, name: '성난 소나기',   face: '⛈', hp: 10, pattern: [['rage', 1, 4], ['hit', 2, 4]] },
  { id: 's11', season: 1, name: '뒤척 매미',     face: '🦗', hp: 11, pattern: [['lock', 1, 2], ['hit', 3, 4]] },
  { id: 's12', season: 1, name: '눅눅 이끼',     face: '🍀', hp: 10, pattern: [['guard', 1, 3], ['sulk', 1, 3], ['hit', 3, 3]] },

  { id: 's13', season: 2, name: '바스락 낙엽',   face: '🍁', hp: 10, pattern: [['clutter', 1, 3], ['hit', 2, 3]] },
  { id: 's14', season: 2, name: '떫은 도토리',   face: '🌰', hp: 11, pattern: [['guard', 1, 3], ['hit', 3, 4]] },
  { id: 's15', season: 2, name: '찬바람 허수아비', face: '🎐', hp: 11, pattern: [['lock', 1, 2], ['drain', 2, 4]] },
  { id: 's16', season: 2, name: '토라진 다람쥐', face: '🐿', hp: 9,  pattern: [['hit', 1, 2], ['hit', 1, 3], ['rage', 1, 3]] },
  { id: 's17', season: 2, name: '들뜬 억새',     face: '🌿', hp: 9,  pattern: [['clutter', 1, 2], ['hit', 2, 4]] },
  { id: 's18', season: 2, name: '시무룩 버섯',   face: '🍄', hp: 12, pattern: [['sulk', 1, 3], ['hit', 3, 4]] },

  { id: 's19', season: 3, name: '시린 고드름',   face: '🧊', hp: 12, pattern: [['drain', 2, 4], ['guard', 1, 3]] },
  { id: 's20', season: 3, name: '칭얼 눈송이',   face: '❄', hp: 10, pattern: [['clutter', 1, 3], ['hit', 2, 3]] },
  { id: 's21', season: 3, name: '꽁꽁 서리',     face: '🌫', hp: 12, pattern: [['lock', 2, 3], ['hit', 3, 4]] },
  { id: 's22', season: 3, name: '웅크린 곰',     face: '🐻', hp: 13, pattern: [['guard', 1, 4], ['hit', 4, 5]] },
  { id: 's23', season: 3, name: '흩날 눈보라',   face: '🌨', hp: 10, pattern: [['hit', 1, 2], ['clutter', 1, 3], ['hit', 2, 3]] },
  { id: 's24', season: 3, name: '졸린 부엉이',   face: '🦉', hp: 12, pattern: [['sulk', 1, 3], ['rage', 1, 3], ['hit', 3, 4]] }
];

/* 우두머리 4 — 계절 마지막 단계 */
DATA.BOSSES = [
  { id: 'b1', season: 0, name: '꽃샘 할멈',   face: '👵', hp: 18, pattern: [['hit', 2, 3], ['clutter', 1, 2], ['guard', 1, 2], ['hit', 3, 3]] },
  { id: 'b2', season: 1, name: '천둥 두꺼비', face: '🐊', hp: 21, pattern: [['hit', 3, 3], ['lock', 1, 2], ['drain', 2, 3], ['guard', 1, 2]] },
  { id: 'b3', season: 2, name: '단풍 여우',   face: '🦊', hp: 24, pattern: [['clutter', 1, 3], ['hit', 3, 3], ['sulk', 1, 3], ['hit', 3, 3]] },
  { id: 'b4', season: 3, name: '설산 노인',   face: '🧓', hp: 27, pattern: [['guard', 1, 2], ['lock', 2, 3], ['hit', 3, 3], ['clutter', 1, 3], ['drain', 3, 4]] }
];

/* 찻잔 24 — 판 안에서 얻는 보물. key 는 game.js mods 에 그대로 더해진다 */
DATA.RELICS = [
  { id: 'r01', name: '잎 거름망',     sym: '🥣', desc: '넘침 피해가 3 줄어듭니다.',                  mod: { overflowCut: 3 } },
  { id: 'r02', name: '두꺼운 잔받침', sym: '🍽', desc: '싸움을 시작할 때 보호막 6.',                  mod: { startShield: 6 } },
  { id: 'r03', name: '쑥 향 주머니',  sym: '👝', desc: '쑥 우림이 3 더 달랩니다.',                    mod: { bonus_ssuk: 3 } },
  { id: 'r04', name: '국화 받침',     sym: '🌼', desc: '국화 보호막이 3 늘어납니다.',                 mod: { bonus_gukhwa: 3 } },
  { id: 'r05', name: '생강 절구',     sym: '🥄', desc: '생강 우림이 2 더 달랩니다.',                  mod: { bonus_ginger: 2 } },
  { id: 'r06', name: '박하 부채',     sym: '🪭', desc: '박하가 1수 더 늦춥니다.',                     mod: { bonus_mint: 1 } },
  { id: 'r07', name: '대추 소쿠리',   sym: '🧺', desc: '대추 회복이 3 늘어납니다.',                   mod: { bonus_jujube: 3 } },
  { id: 'r08', name: '유자 껍질',     sym: '🍊', desc: '유자 기운이 20 늘어납니다.',                  mod: { bonus_yuja: 20 } },
  { id: 'r09', name: '찻물 시계',     sym: '⏳', desc: '우릴 때마다 찻잔 기운이 10 더 찹니다.',       mod: { chargePerBrew: 10 } },
  { id: 'r10', name: '덧댄 칸',     sym: '🫖', desc: '주전자 칸이 1 늘어납니다.',                   mod: { traySize: 1 } },
  { id: 'r11', name: '낙엽 비',       sym: '🧹', desc: '낙엽 셋이 사라질 때 모든 정령을 5 달랩니다.', mod: { junkCalm: 5 } },
  { id: 'r12', name: '따끈한 손',     sym: '🤲', desc: '싸움이 끝나면 평온을 5 되찾습니다.',          mod: { afterHeal: 5 } },
  { id: 'r13', name: '은행 저금통',   sym: '🐷', desc: '판이 끝나면 은행잎을 25% 더 받습니다.',       mod: { ginkgoBonus: 25 } },
  { id: 'r14', name: '첫잔',          sym: '🍵', desc: '싸움의 첫 우림은 효과가 두 배입니다.',       mod: { firstDouble: 1 } },
  { id: 'r15', name: '연잎 그릇',     sym: '🥗', desc: '두 수 안에 다시 우리면 2 더 달랩니다.',       mod: { chainCalm: 2 } },
  { id: 'r16', name: '나무 국자',     sym: '🥢', desc: '싸움을 시작할 때 찻잔 기운 30.',              mod: { startCharge: 30 } },
  { id: 'r17', name: '삼색 보자기',   sym: '🎀', desc: '서로 다른 잎을 셋 이어 우리면 보호막 5.',     mod: { triColor: 5 } },
  { id: 'r18', name: '느린 모래시계', sym: '⌛', desc: '정령의 첫 행동이 1수 늦어집니다.',            mod: { firstDelay: 1 } },
  { id: 'r19', name: '맑은 물병',     sym: '🧴', desc: '얻을 때 최대 평온이 10 늘어납니다.',          mod: { maxHp: 10 } },
  { id: 'r20', name: '찻잎 체',       sym: '🕸', desc: '정령이 넣는 낙엽이 1장 줄어듭니다.',          mod: { junkCut: 1 } },
  { id: 'r21', name: '두 번 끓이기',  sym: '🔁', desc: '다섯 번째 우림마다 효과가 한 번 더 납니다.',  mod: { fifthRepeat: 1 } },
  { id: 'r22', name: '꿀단지',        sym: '🍯', desc: '넘친 회복은 보호막이 됩니다.',                mod: { overHealShield: 1 } },
  { id: 'r23', name: '붉은 끈',       sym: '🧶', desc: '평온이 절반 아래면 달램이 2 늘어납니다.',     mod: { lowHpCalm: 2 } },
  { id: 'r24', name: '고요한 종',     sym: '🔔', desc: '정령 하나를 달래면 남은 정령들이 1수 늦어집니다.', mod: { calmDelay: 1 } }
];

/* 비법 30 — 싸움 뒤 보상. kind: up(잎 단계 올리기) · add(잎 넣기) · cut(잎 빼기) · stat(능력) */
DATA.RECIPES = [
  { id: 'p01', kind: 'up',  leaf: 'ssuk',    name: '쑥 덖기',       desc: '쑥 효과 +2' },
  { id: 'p02', kind: 'up',  leaf: 'gukhwa',  name: '국화 말리기',   desc: '국화 효과 +2' },
  { id: 'p03', kind: 'up',  leaf: 'ginger',  name: '생강 저미기',   desc: '생강 효과 +1' },
  { id: 'p04', kind: 'up',  leaf: 'mint',    name: '박하 비비기',   desc: '박하 늦춤 +1' },
  { id: 'p05', kind: 'up',  leaf: 'jujube',  name: '대추 고기',     desc: '대추 효과 +2' },
  { id: 'p06', kind: 'up',  leaf: 'yuja',    name: '유자청 담기',   desc: '유자 효과 +10' },
  { id: 'p07', kind: 'up',  leaf: 'lotus',   name: '연꽃 덖기',     desc: '연꽃 효과 +3' },
  { id: 'p08', kind: 'up',  leaf: 'cinnamon',name: '계피 굽기',     desc: '계피 김 +1' },
  { id: 'p09', kind: 'up',  leaf: 'plum',    name: '매실 절이기',   desc: '매실 효과 +1' },
  { id: 'p10', kind: 'up',  leaf: 'barley',  name: '보리 볶기',     desc: '보리 효과 +1' },
  { id: 'p11', kind: 'up',  leaf: 'omija',   name: '오미자 우리기', desc: '오미자 효과 +1' },
  { id: 'p12', kind: 'add', leaf: 'ssuk',    name: '쑥 한 줌',      desc: '주머니에 쑥 3장' },
  { id: 'p13', kind: 'add', leaf: 'gukhwa',  name: '국화 한 줌',    desc: '주머니에 국화 3장' },
  { id: 'p14', kind: 'add', leaf: 'ginger',  name: '생강 한 줌',    desc: '주머니에 생강 3장' },
  { id: 'p15', kind: 'add', leaf: 'mint',    name: '박하 한 줌',    desc: '주머니에 박하 3장' },
  { id: 'p16', kind: 'add', leaf: 'jujube',  name: '대추 한 줌',    desc: '주머니에 대추 3장' },
  { id: 'p17', kind: 'add', leaf: 'yuja',    name: '유자 한 줌',    desc: '주머니에 유자 3장' },
  { id: 'p18', kind: 'add', leaf: 'lotus',   name: '연꽃 들이기',   desc: '주머니에 연꽃 3장' },
  { id: 'p19', kind: 'add', leaf: 'cinnamon',name: '계피 들이기',   desc: '주머니에 계피 3장' },
  { id: 'p20', kind: 'add', leaf: 'plum',    name: '매실 들이기',   desc: '주머니에 매실 3장' },
  { id: 'p21', kind: 'add', leaf: 'barley',  name: '보리 들이기',   desc: '주머니에 보리 3장' },
  { id: 'p22', kind: 'add', leaf: 'omija',   name: '오미자 들이기', desc: '주머니에 오미자 3장' },
  { id: 'p23', kind: 'add', leaf: 'star',    name: '별꽃 들이기',   desc: '주머니에 별꽃 2장', n: 2 },
  { id: 'p24', kind: 'cut', leaf: 'ssuk',    name: '쑥 덜어내기',   desc: '주머니에서 쑥 3장 빼기' },
  { id: 'p25', kind: 'cut', leaf: 'mint',    name: '박하 덜어내기', desc: '주머니에서 박하 3장 빼기' },
  { id: 'p26', kind: 'cut', leaf: 'yuja',    name: '유자 덜어내기', desc: '주머니에서 유자 3장 빼기' },
  { id: 'p27', kind: 'stat', stat: 'maxHp',  v: 6,  name: '든든한 아침',  desc: '최대 평온 +6, 평온 +6' },
  { id: 'p28', kind: 'stat', stat: 'heal',   v: 14, name: '낮잠 한숨',    desc: '평온 +14' },
  { id: 'p29', kind: 'stat', stat: 'coins',  v: 25, name: '찻값 받기',    desc: '엽전 +25' },
  { id: 'p30', kind: 'stat', stat: 'charge', v: 1,  name: '잔 데우기',    desc: '싸움 시작 찻잔 기운 +20 (판 끝까지)' }
];

/* 주전자 5 — 판을 시작할 때 고른다. 백자만 처음부터 열림 */
DATA.POTS = [
  { id: 'white', name: '백자 주전자', sym: '🫖', tray: 10, hp: 40, skill: 'breathe', skillName: '한숨 돌리기', skillDesc: '모든 정령의 다음 행동을 2수 늦춥니다.', desc: '칸 10 · 평온 40. 무난한 주전자.', cost: 0 },
  { id: 'iron',  name: '무쇠 주전자', sym: '⚫', tray: 9, hp: 46, skill: 'blaze',   skillName: '센 불',       skillDesc: '맨 앞 정령을 15 달랩니다.',        desc: '칸 9 · 평온 46. 쑥이 2 더 달랩니다.', bonus: { bonus_ssuk: 2 }, cost: 40 },
  { id: 'glass', name: '유리 주전자', sym: '🔮', tray: 11, hp: 34, skill: 'rinse',   skillName: '맑게 비우기', skillDesc: '주전자를 비우고 보호막 8을 얻습니다.', desc: '칸 11 · 평온 34. 넓지만 여립니다.', cost: 60 },
  { id: 'bamboo',name: '대나무 주전자', sym: '🎋', tray: 10, hp: 40, skill: 'sprout', skillName: '새순',        skillDesc: '평온 10을 되찾고 선반을 새로 채웁니다.', desc: '칸 10 · 평온 40. 대추가 2 더 회복합니다.', bonus: { bonus_jujube: 2 }, cost: 80 },
  { id: 'celadon', name: '청자 주전자', sym: '🏺', tray: 10, hp: 38, skill: 'echo',  skillName: '메아리',      skillDesc: '마지막으로 우린 차를 한 번 더 우립니다.', desc: '칸 10 · 평온 38. 찻잔 기운이 빨리 찹니다.', bonus: { chargePerBrew: 8 }, cost: 120 }
];

/* 찻집 개량 18 — 판 사이에 은행잎으로 산다 */
DATA.UPGRADES = [
  { id: 'u_lotus',    kind: 'leaf', leaf: 'lotus',    name: '연꽃 들이기',   desc: '판 안 보상과 장터에 연꽃이 나옵니다.',   cost: 20 },
  { id: 'u_cinnamon', kind: 'leaf', leaf: 'cinnamon', name: '계피 들이기',   desc: '판 안 보상과 장터에 계피가 나옵니다.',   cost: 25 },
  { id: 'u_plum',     kind: 'leaf', leaf: 'plum',     name: '매실 들이기',   desc: '판 안 보상과 장터에 매실이 나옵니다.',   cost: 30 },
  { id: 'u_barley',   kind: 'leaf', leaf: 'barley',   name: '보리 들이기',   desc: '판 안 보상과 장터에 보리가 나옵니다.',   cost: 30 },
  { id: 'u_omija',    kind: 'leaf', leaf: 'omija',    name: '오미자 들이기', desc: '판 안 보상과 장터에 오미자가 나옵니다.', cost: 35 },
  { id: 'u_star',     kind: 'leaf', leaf: 'star',     name: '별꽃 들이기',   desc: '판 안 보상과 장터에 별꽃이 나옵니다.',   cost: 50 },
  { id: 'u_iron',     kind: 'pot',  pot: 'iron',      name: '무쇠 주전자',   desc: '칸은 좁고 단단한 주전자를 엽니다.',     cost: 40 },
  { id: 'u_glass',    kind: 'pot',  pot: 'glass',     name: '유리 주전자',   desc: '칸이 넓은 주전자를 엽니다.',             cost: 60 },
  { id: 'u_bamboo',   kind: 'pot',  pot: 'bamboo',    name: '대나무 주전자', desc: '회복이 좋은 주전자를 엽니다.',           cost: 80 },
  { id: 'u_celadon',  kind: 'pot',  pot: 'celadon',   name: '청자 주전자',   desc: '기운이 빨리 차는 주전자를 엽니다.',     cost: 120 },
  { id: 'u_hp1',      kind: 'perk', name: '푹신한 방석',   desc: '시작 평온 +4',             perk: { maxHp: 4 },        cost: 25 },
  { id: 'u_hp2',      kind: 'perk', name: '따뜻한 온돌',   desc: '시작 평온 +6',             perk: { maxHp: 6 },        cost: 60, need: 'u_hp1' },
  { id: 'u_coin',     kind: 'perk', name: '단골 손님',     desc: '시작 엽전 +20',            perk: { coins: 20 },       cost: 30 },
  { id: 'u_shield',   kind: 'perk', name: '처마 그늘',     desc: '싸움 시작 보호막 +3',      perk: { startShield: 3 },  cost: 45 },
  { id: 'u_charge',   kind: 'perk', name: '달군 찻잔',     desc: '싸움 시작 찻잔 기운 +20',  perk: { startCharge: 20 }, cost: 45 },
  { id: 'u_overflow', kind: 'perk', name: '넉넉한 쟁반',   desc: '넘침 피해 -2',             perk: { overflowCut: 2 },  cost: 55 },
  { id: 'u_reroll',   kind: 'perk', name: '두 번 보기',    desc: '보상을 판마다 한 번 새로 뽑을 수 있습니다.', perk: { rerolls: 1 }, cost: 70 },
  { id: 'u_relic',    kind: 'perk', name: '선물 보따리',   desc: '판을 찻잔 하나를 들고 시작합니다.', perk: { startRelic: 1 }, cost: 90 }
];

/* 길에서 만나는 일 20. 고르면 fx 를 차례로 적용한다. fx: heal·hurt·coins·maxHp·add(잎,장)·cut(잎,장)·up(잎)·relic·charge */
DATA.EVENTS = [
  { id: 'e01', title: '길 잃은 꼬마 손님', text: '우산을 놓고 간 꼬마가 돌아와 문 앞을 서성입니다.',
    choices: [{ label: '우산을 찾아 준다', fx: [['heal', 8]], note: '평온 +8' }, { label: '따뜻한 차 한 잔을 내준다', fx: [['cut', 'yuja', 2], ['coins', 15]], note: '유자 2장 빼기 · 엽전 +15' }] },
  { id: 'e02', title: '이웃 할머니의 소쿠리', text: '이웃 할머니가 마당에서 딴 것을 나눠 주십니다.',
    choices: [{ label: '대추를 받는다', fx: [['add', 'jujube', 3]], note: '대추 3장' }, { label: '쑥을 받는다', fx: [['add', 'ssuk', 3]], note: '쑥 3장' }] },
  { id: 'e03', title: '깨진 찻잔', text: '선반에서 찻잔 하나가 떨어져 금이 갔습니다.',
    choices: [{ label: '금을 메워 쓴다', fx: [['coins', -10], ['maxHp', 4]], note: '엽전 -10 · 최대 평온 +4' }, { label: '그냥 치운다', fx: [['hurt', 3]], note: '평온 -3' }] },
  { id: 'e04', title: '떠돌이 차 장수', text: '등짐을 진 차 장수가 귀한 잎을 보여 줍니다.',
    choices: [{ label: '엽전 20에 산다', fx: [['coins', -20], ['relic', 1]], note: '엽전 -20 · 찻잔 하나' }, { label: '구경만 한다', fx: [['heal', 3]], note: '평온 +3' }] },
  { id: 'e05', title: '소나기', text: '갑자기 비가 쏟아져 말리던 잎이 젖었습니다.',
    choices: [{ label: '젖은 잎을 버린다', fx: [['cut', 'gukhwa', 2]], note: '국화 2장 빼기' }, { label: '다시 말린다', fx: [['hurt', 4], ['up', 'gukhwa']], note: '평온 -4 · 국화 효과 +2' }] },
  { id: 'e06', title: '조용한 오후', text: '손님이 없는 틈에 잠깐 눈을 붙일 수 있습니다.',
    choices: [{ label: '낮잠을 잔다', fx: [['heal', 12]], note: '평온 +12' }, { label: '찻잔을 닦는다', fx: [['charge', 1]], note: '싸움 시작 기운 +20' }] },
  { id: 'e07', title: '수상한 항아리', text: '마루 밑에서 오래된 항아리가 나왔습니다.',
    choices: [{ label: '열어 본다', fx: [['hurt', 6], ['relic', 1]], note: '평온 -6 · 찻잔 하나' }, { label: '덮어 둔다', fx: [['coins', 10]], note: '엽전 +10' }] },
  { id: 'e08', title: '생강 밭', text: '뒤뜰 생강이 알맞게 여물었습니다.',
    choices: [{ label: '캐서 넣는다', fx: [['add', 'ginger', 3]], note: '생강 3장' }, { label: '잘 저며 둔다', fx: [['up', 'ginger']], note: '생강 효과 +1' }] },
  { id: 'e09', title: '바람에 날린 박하', text: '창틀에 둔 박하잎이 바람에 흩어졌습니다.',
    choices: [{ label: '줍지 않는다', fx: [['cut', 'mint', 2]], note: '박하 2장 빼기' }, { label: '모아 비빈다', fx: [['up', 'mint']], note: '박하 늦춤 +1' }] },
  { id: 'e10', title: '단골의 부탁', text: '단골이 아픈 친구에게 줄 차를 부탁합니다.',
    choices: [{ label: '대추차를 싸 준다', fx: [['cut', 'jujube', 2], ['coins', 25]], note: '대추 2장 빼기 · 엽전 +25' }, { label: '정중히 거절한다', fx: [['heal', 4]], note: '평온 +4' }] },
  { id: 'e11', title: '찻집 고양이', text: '어디선가 고양이가 들어와 방석에 눕습니다.',
    choices: [{ label: '쓰다듬는다', fx: [['heal', 6], ['maxHp', 2]], note: '평온 +6 · 최대 평온 +2' }, { label: '먹을 것을 준다', fx: [['coins', -5], ['relic', 1]], note: '엽전 -5 · 찻잔 하나' }] },
  { id: 'e12', title: '유자 한 상자', text: '남쪽에서 유자 한 상자가 도착했습니다.',
    choices: [{ label: '청을 담근다', fx: [['up', 'yuja']], note: '유자 효과 +10' }, { label: '그대로 둔다', fx: [['add', 'yuja', 3]], note: '유자 3장' }] },
  { id: 'e13', title: '오래된 다서', text: '먼지 쌓인 찻잎 책 한 권을 찾았습니다.',
    choices: [{ label: '쑥 덖는 법을 읽는다', fx: [['up', 'ssuk']], note: '쑥 효과 +2' }, { label: '대추 고는 법을 읽는다', fx: [['up', 'jujube']], note: '대추 효과 +2' }] },
  { id: 'e14', title: '연못가', text: '연못에 꽃이 피었습니다.',
    choices: [{ label: '꽃잎을 딴다', fx: [['add', 'lotus', 2]], note: '연꽃 2장' }, { label: '바라만 본다', fx: [['heal', 7]], note: '평온 +7' }] },
  { id: 'e15', title: '장작 패기', text: '겨울 준비로 장작을 패야 합니다.',
    choices: [{ label: '힘껏 팬다', fx: [['hurt', 5], ['maxHp', 5]], note: '평온 -5 · 최대 평온 +5' }, { label: '내일로 미룬다', fx: [['coins', 5]], note: '엽전 +5' }] },
  { id: 'e16', title: '잎 고르기', text: '주머니 속 잎을 한 번 정리할 때가 됐습니다.',
    choices: [{ label: '유자를 덜어낸다', fx: [['cut', 'yuja', 3]], note: '유자 3장 빼기' }, { label: '박하를 덜어낸다', fx: [['cut', 'mint', 3]], note: '박하 3장 빼기' }] },
  { id: 'e17', title: '지나가는 악사', text: '피리 부는 악사가 쉬어 가기를 청합니다.',
    choices: [{ label: '한 곡 청한다', fx: [['charge', 1], ['heal', 4]], note: '싸움 시작 기운 +20 · 평온 +4' }, { label: '찻값을 받는다', fx: [['coins', 18]], note: '엽전 +18' }] },
  { id: 'e18', title: '계피 향', text: '어디선가 달콤한 계피 냄새가 납니다.',
    choices: [{ label: '냄새를 따라간다', fx: [['add', 'cinnamon', 2], ['hurt', 2]], note: '계피 2장 · 평온 -2' }, { label: '하던 일을 한다', fx: [['heal', 5]], note: '평온 +5' }] },
  { id: 'e19', title: '서리 내린 아침', text: '밤새 서리가 내려 마당이 하얗습니다.',
    choices: [{ label: '마당을 쓴다', fx: [['hurt', 3], ['coins', 15]], note: '평온 -3 · 엽전 +15' }, { label: '불을 더 땐다', fx: [['heal', 9]], note: '평온 +9' }] },
  { id: 'e20', title: '빈 찻잔 하나', text: '누군가 마루에 빈 찻잔을 두고 갔습니다.',
    choices: [{ label: '가져간다', fx: [['relic', 1], ['hurt', 4]], note: '찻잔 하나 · 평온 -4' }, { label: '주인을 기다린다', fx: [['heal', 6], ['coins', 8]], note: '평온 +6 · 엽전 +8' }] }
];

/* 업적 24. test(s) 의 s 는 누적 기록(Store.meta.stats) */
DATA.ACHIEVEMENTS = [
  { id: 'a01', name: '첫 잔',         desc: '차를 처음 우린다.',              test: function (s) { return s.brews >= 1; } },
  { id: 'a02', name: '찻집 단골',     desc: '차를 100번 우린다.',             test: function (s) { return s.brews >= 100; } },
  { id: 'a03', name: '찻물 장인',     desc: '차를 500번 우린다.',             test: function (s) { return s.brews >= 500; } },
  { id: 'a04', name: '첫 달램',       desc: '정령을 처음 달랜다.',            test: function (s) { return s.calmed >= 1; } },
  { id: 'a05', name: '정령의 벗',     desc: '정령을 50 달랜다.',              test: function (s) { return s.calmed >= 50; } },
  { id: 'a06', name: '정령의 집',     desc: '정령을 200 달랜다.',             test: function (s) { return s.calmed >= 200; } },
  { id: 'a07', name: '봄 손님',       desc: '꽃샘 할멈을 달랜다.',            test: function (s) { return (s.bossCalmed || {}).b1 >= 1; } },
  { id: 'a08', name: '여름 손님',     desc: '천둥 두꺼비를 달랜다.',          test: function (s) { return (s.bossCalmed || {}).b2 >= 1; } },
  { id: 'a09', name: '가을 손님',     desc: '단풍 여우를 달랜다.',            test: function (s) { return (s.bossCalmed || {}).b3 >= 1; } },
  { id: 'a10', name: '사계절 찻집',   desc: '설산 노인을 달래 한 판을 끝낸다.', test: function (s) { return s.wins >= 1; } },
  { id: 'a11', name: '다시 또 사계절', desc: '판을 5번 끝까지 지킨다.',       test: function (s) { return s.wins >= 5; } },
  { id: 'a12', name: '찻집 열기',     desc: '판을 10번 시작한다.',            test: function (s) { return s.runs >= 10; } },
  { id: 'a13', name: '넘치는 주전자', desc: '주전자를 처음 넘친다.',          test: function (s) { return s.overflows >= 1; } },
  { id: 'a14', name: '말끔한 쟁반',   desc: '넘침 없이 우두머리를 달랜다.',   test: function (s) { return s.cleanBoss >= 1; } },
  { id: 'a15', name: '찻잔 모으기',   desc: '찻잔 12종을 모은다.',            test: function (s) { return Object.keys(s.relicSeen || {}).length >= 12; } },
  { id: 'a16', name: '찻잔 장식장',   desc: '찻잔 24종을 모두 모은다.',       test: function (s) { return Object.keys(s.relicSeen || {}).length >= 24; } },
  { id: 'a17', name: '정령 도감',     desc: '정령 24종을 모두 만난다.',       test: function (s) { return Object.keys(s.spiritSeen || {}).length >= 24; } },
  { id: 'a18', name: '이어 우리기',   desc: '한 싸움에서 우림 5번을 두 수 안에 잇는다.', test: function (s) { return s.bestChain >= 5; } },
  { id: 'a19', name: '큰 한 잔',      desc: '한 번 우림으로 20 넘게 달랜다.', test: function (s) { return s.bestCalm >= 20; } },
  { id: 'a20', name: '찻잔 기술',     desc: '찻잔 기술을 30번 쓴다.',         test: function (s) { return s.skills >= 30; } },
  { id: 'a21', name: '부자 찻집',     desc: '한 판에 엽전 150을 모은다.',     test: function (s) { return s.bestCoins >= 150; } },
  { id: 'a22', name: '길손 맞이',     desc: '길에서 만나는 일 20번을 겪는다.', test: function (s) { return s.events >= 20; } },
  { id: 'a23', name: '주전자 수집',   desc: '주전자 5개를 모두 연다.',        test: function (s) { return s.potsOpen >= 5; } },
  { id: 'a24', name: '낙엽 쓸기',     desc: '낙엽 셋을 30번 치운다.',         test: function (s) { return s.junkCleared >= 30; } }
];

/* 첫 판 1단계 싸움의 짜인 선반 12칸(QWER/ASDF/ZXCV 차례). 쑥 3장(1·5·10칸), 나머지는 2장씩이라 처음 셋이 쑥으로 맞는다 */
DATA.TUTORIAL_SHELF = [
  'gukhwa', 'ssuk',   'mint',   'jujube',
  'yuja',   'ssuk',   'ginger', 'gukhwa',
  'mint',   'jujube', 'ssuk',   'ginger'
];

/* 첫 판 안내 6단계. slot 이 있는 단계는 선반의 그 칸만 짚는다(그 칸에 짜인 잎이 남아 있을 때) */
DATA.TUTORIAL = [
  { text: '빛나는 쑥 칸을 눌러 아래 주전자 칸에 담아 보세요.', slot: 5 },
  { text: '쑥을 하나 더 담아 보세요. 주전자에 2장이 들면 남은 쑥 칸이 빛나고, 3장이 모이면 차가 우러납니다.', slot: 1 },
  { text: '정령 머리 위 숫자는 행동까지 남은 수입니다. 잎을 하나 담을 때마다 1씩 줄어요.', target: '#spirits' },
  { text: '주전자 칸이 가득 차면 넘쳐서 평온이 깎입니다. 칸을 잘 비워 두세요.', target: '#tray' },
  { text: '찻잔 기운이 다 차면 찻잔 기술을 쓸 수 있습니다.', target: '#btn-skill' },
  { text: '정령의 화를 모두 0으로 만들면 달래기 성공입니다. 사계절을 지켜 보세요!', target: '#spirits' }
];

/* 엽전으로 사는 도우미 3 — 싸움 중 차례를 쓰지 않고 쓴다. 판을 시작할 때 start 개씩, 장터에서 price 엽전에 1개 */
DATA.TOOLS = [
  { id: 'undo',    sym: '↩', name: '되돌리기', key: '1', price: 8,  start: 1, desc: '마지막에 담은 잎을 선반 제자리로 돌려놓습니다. 우러나거나 넘친 뒤에는 못 쓰고, 정령의 남은 수는 돌아오지 않습니다.' },
  { id: 'shuffle', sym: '🔀', name: '섞기',     key: '2', price: 8,  start: 1, desc: '잠기지 않은 선반 잎을 모두 주머니에 넣고 다시 뽑습니다.' },
  { id: 'pop',     sym: '🗑', name: '덜어내기', key: '3', price: 10, start: 1, desc: '주전자 맨 끝 잎 1장을 버립니다.' }
];

/* 오늘의 도전 바람 7 —날짜로 하나가 정해진다. mod 는 판 내내 더해지는 값, 나머지는 game.js 가 판 시작·길·싸움에서 읽는다 */
DATA.DAILY = [
  { id: 'd_rain',   name: '봄비 오는 날',   desc: '주전자 칸 +1 · 정령의 화 +15%',                     mod: { traySize: 1, spiritHp: 15 } },
  { id: 'd_market', name: '장날',           desc: '엽전 30을 들고 시작 · 갈림길에 장터가 늘 나옴',      mod: {}, coins: 30, node: 'shop' },
  { id: 'd_wind',   name: '바람 부는 날',   desc: '정령이 낙엽을 1장 더 넣음 · 낙엽 셋을 치우면 모두 3 달램', mod: { junkCut: -1, junkCalm: 3 } },
  { id: 'd_still',  name: '고요한 날',      desc: '싸움 시작 보호막 +5 · 평온 8 적게 시작',             mod: { startShield: 5 }, hp: -8 },
  { id: 'd_fire',   name: '불 센 날',       desc: '우릴 때 찻잔 기운 +10 더 · 넘침 피해 +2',            mod: { chargePerBrew: 10, overflowCut: -2 } },
  { id: 'd_guest',  name: '손님 많은 날',   desc: '정령 손님이 늘 둘 · 이기면 엽전 +50%',               mod: { coinMul: 50 }, minSpirits: 2 },
  { id: 'd_gift',   name: '선물 받은 날',   desc: '찻잔 하나를 들고 시작 · 갈림길에 쉼터가 없음',       mod: {}, relic: 1, noNode: 'rest' }
];

DATA.SETTINGS = [
  { id: 'sound',   name: '소리',          type: 'bool',   def: true },
  { id: 'volume',  name: '소리 크기',     type: 'choice', def: 2, opts: ['작게', '보통', '크게'] },
  { id: 'vibrate', name: '진동',          type: 'bool',   def: true },
  { id: 'shake',   name: '화면 흔들림',   type: 'bool',   def: true },
  { id: 'reduce',  name: '움직임 줄이기', type: 'bool',   def: false },
  { id: 'fast',    name: '정령 행동 빠르게', type: 'bool', def: false },
  { id: 'big',     name: '큰 글자',       type: 'bool',   def: false },
  { id: 'hints',   name: '잎 효과 글 보기', type: 'bool', def: true }
];
