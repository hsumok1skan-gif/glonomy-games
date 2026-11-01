/* Myco Weave — 콘텐츠 데이터 */
window.DATA = (function () {
  // 땅 종류 (콘텐츠 수에는 넣지 않음)
  var TERRAIN = {
    // mark: 색을 못 가려도 알 수 있게 칸마다 그리는 무늬 (ui.js terrainMark, 방법 화면 '땅')
    soil:   { name: '흙',       cost: 2, color: 'var(--c-soil)',   mark: '고랑 두 줄' },
    moist:  { name: '젖은 흙',  cost: 1, color: 'var(--c-moist)',  mark: '물결 ≈' },
    dry:    { name: '마른 흙',  cost: 3, color: 'var(--c-dry)',    mark: '갈라진 금' },
    litter: { name: '낙엽 더미', cost: 2, color: 'var(--c-litter)', mark: '흩어진 점' },
    log:    { name: '썩은 통나무', cost: 3, color: 'var(--c-log)', mark: '🪵' },
    rock:   { name: '바위',     cost: 0, color: 'var(--c-rock)',   mark: '빗금' },
    tree:   { name: '나무',     cost: 0, color: 'var(--c-soil)',   mark: '나무 그림' }
  };

  // 1. 숲 8곳 (단계) — 포자 목표는 균형 시험(2026-11-01, 승률 94% → 78%)을 보고 두 번 올렸다
  var FORESTS = [
    { id: 'moss',   name: '이끼 언덕',     days: 10, goal: 20,spawn: 0.5, grow: 0.10, rock: 4, moist: 9,  dry: 3,  litter: 6, log: 2, trees: 6, desc: '부드러운 이끼가 덮인 언덕. 딱정벌레가 가끔 내려온다.' },
    { id: 'oak',    name: '참나무 그늘',   days: 11, goal: 34,spawn: 0.6, grow: 0.12, rock: 5, moist: 7,  dry: 4,  litter: 7, log: 2, trees: 7, desc: '큰 나무 그늘 아래. 푸른곰팡이가 자리를 넓히려 한다.' },
    { id: 'birch',  name: '자작 비탈',     days: 11, goal: 50,spawn: 0.7, grow: 0.14, rock: 6, moist: 6,  dry: 6,  litter: 6, log: 2, trees: 7, desc: '흰 줄기가 늘어선 비탈. 개미와 민달팽이가 기어 다닌다.' },
    { id: 'pine',   name: '가문 솔숲',     days: 12, goal: 68,spawn: 0.8, grow: 0.15, rock: 6, moist: 3,  dry: 12, litter: 5, log: 2, trees: 7, desc: '비가 드문 솔숲. 마른 흙이 많아 뻗기가 비싸다.' },
    { id: 'marsh',  name: '안개 늪가',     days: 12, goal: 92,spawn: 0.9, grow: 0.16, rock: 4, moist: 14, dry: 2,  litter: 5, log: 3, trees: 7, desc: '늘 축축한 늪가. 흰곰팡이가 하루 만에 번진다.' },
    { id: 'deadwood', name: '쓰러진 고목터', days: 13, goal: 122,spawn: 1.0, grow: 0.17, rock: 6, moist: 6, dry: 5, litter: 6, log: 7, trees: 6, desc: '오래된 나무가 쓰러진 자리. 통나무가 많고 두더지가 판다.' },
    { id: 'frost',  name: '서리 능선',     days: 13, goal: 148,spawn: 1.1, grow: 0.18, rock: 8, moist: 5,  dry: 6,  litter: 5, log: 3, trees: 6, desc: '찬 바람이 부는 능선. 서리진드기와 진딧물 떼가 온다.' },
    { id: 'heart',  name: '오래된 숲 심장', days: 14, goal: 176,spawn: 1.2, grow: 0.20, rock: 6, moist: 7,  dry: 6,  litter: 7, log: 4, trees: 8, desc: '숲에서 가장 오래된 자리. 큰 사슴벌레가 두 번 찾아온다.' }
  ];

  // 2. 위협 18종
  // kind: walker(망 칸을 갉음) eater(버섯을 먹음) thief(기운을 훔침) spreader(곰팡이, 번짐) digger(여러 칸을 팜)
  var THREATS = [
    { id: 'beetle',     name: '딱정벌레',     icon: '🪲', kind: 'walker',   hp: 1, speed: 1, bites: 1, minForest: 1, weight: 10, desc: '가장 가까운 망 칸으로 걸어와 한 칸을 갉는다.' },
    { id: 'springtail', name: '톡토기',       icon: '🦗', kind: 'eater',    hp: 1, speed: 2, bites: 1, minForest: 1, weight: 6,  desc: '버섯을 찾아 뛰어와 먹는다. 버섯이 없으면 망 칸을 갉는다.' },
    { id: 'greenmold',  name: '푸른곰팡이',   icon: '🟢', kind: 'spreader', hp: 2, period: 2, minForest: 2, weight: 5,  desc: '이틀마다 망 쪽으로 한 칸 번진다. 굵은 칸이 막는다.' },
    { id: 'ant',        name: '일개미',       icon: '🐜', kind: 'thief',    hp: 1, speed: 2, steal: 3, minForest: 3, weight: 6,  desc: '망에 닿으면 기운 3을 훔쳐 달아난다.' },
    { id: 'slug',       name: '민달팽이',     icon: '🐌', kind: 'eater',    hp: 2, speed: 1, bites: 1, slime: true, minForest: 3, weight: 5, desc: '버섯을 먹고 그 칸을 마른 흙으로 만든다.' },
    { id: 'nematode',   name: '선충',         icon: '〰️', kind: 'walker',   hp: 1, speed: 1, bites: 1, tip: true, minForest: 4, weight: 6, desc: '망 끝(이웃이 하나뿐인 칸)을 노린다.' },
    { id: 'fastbeetle', name: '날쌘 딱정벌레', icon: '🐞', kind: 'walker',   hp: 1, speed: 2, bites: 1, minForest: 4, weight: 6,  desc: '하루에 두 칸씩 달려온다.' },
    { id: 'whitemold',  name: '흰곰팡이',     icon: '⚪', kind: 'spreader', hp: 1, period: 1, minForest: 5, weight: 5,  desc: '하루마다 번지지만 약하다.' },
    { id: 'armorbeetle', name: '갑옷 딱정벌레', icon: '🛡️', kind: 'walker',  hp: 3, speed: 1, bites: 1, minForest: 5, weight: 4,  desc: '단단해서 굵은 칸에 세 번 튕겨야 쓰러진다.' },
    { id: 'shrew',      name: '땃쥐',         icon: '🐭', kind: 'eater',    hp: 2, speed: 2, bites: 1, minForest: 5, weight: 4,  desc: '빠르게 버섯을 찾아 먹는다.' },
    { id: 'mole',       name: '두더지',       icon: '🦔', kind: 'digger',   hp: 2, speed: 2, bites: 3, minForest: 6, weight: 3,  desc: '땅을 파며 망 칸 세 개를 연달아 끊는다.' },
    { id: 'blackmold',  name: '검은곰팡이',   icon: '⚫', kind: 'spreader', hp: 3, period: 2, minForest: 6, weight: 4,  desc: '삭이기 비싸고 굵은 칸도 갉아 낸다.' },
    { id: 'weevil',     name: '바구미',       icon: '🪳', kind: 'eater',    hp: 2, speed: 1, bites: 2, minForest: 6, weight: 4,  desc: '버섯을 먹은 뒤 그 칸까지 갉는다.' },
    { id: 'aphids',     name: '진딧물 떼',    icon: '🫧', kind: 'walker',   hp: 1, speed: 1, bites: 1, group: 3, minForest: 7, weight: 4, desc: '셋이 한꺼번에 몰려온다.' },
    { id: 'frostmite',  name: '서리진드기',   icon: '❄️', kind: 'walker',   hp: 2, speed: 1, bites: 1, freeze: true, minForest: 7, weight: 4, desc: '갉은 자리 둘레를 하루 얼려 흐름을 막는다.' },
    { id: 'antqueen',   name: '여왕개미',     icon: '👑', kind: 'thief',    hp: 3, speed: 1, steal: 6, minForest: 7, weight: 2, desc: '망에 닿으면 기운 6을 훔친다.' },
    { id: 'rootrot',    name: '뿌리썩음',     icon: '🟤', kind: 'spreader', hp: 2, period: 3, rot: true, minForest: 8, weight: 3, desc: '사흘마다 번지며 닿은 버섯을 썩힌다.' },
    { id: 'stag',       name: '큰 사슴벌레',  icon: '🦌', kind: 'walker',   hp: 5, speed: 1, bites: 3, boss: true, minForest: 99, weight: 0, desc: '숲 심장의 우두머리. 망 칸 셋을 갉는다.' }
  ];

  // 3. 나무 16종
  var TREES = [
    { id: 'oak',      name: '참나무',      icon: '🌳', yield: 3, fx: '',         weight: 10, desc: '기운 3을 나눠 준다.' },
    { id: 'pine',     name: '소나무',      icon: '🌲', yield: 2, fx: 'thickCheap', weight: 8, desc: '이웃 칸 굵히기 비용 -1.' },
    { id: 'birch',    name: '자작나무',    icon: '🎋', yield: 2, fx: 'growCheap', weight: 8,  desc: '이웃 칸 뻗기 비용 -1.' },
    { id: 'maple',    name: '단풍나무',    icon: '🍁', yield: 2, fx: 'spore',     weight: 7,  desc: '이웃 버섯 포자 +1.' },
    { id: 'chestnut', name: '밤나무',      icon: '🌰', yield: 3, fx: 'feast',     weight: 6,  desc: '처음 짝을 맺은 날 기운 +4.' },
    { id: 'willow',   name: '버드나무',    icon: '🌿', yield: 2, fx: 'moist',     weight: 6,  desc: '짝을 맺으면 이웃 흙이 젖는다.' },
    { id: 'fir',      name: '전나무',      icon: '🎄', yield: 2, fx: 'shield',    weight: 6,  desc: '이웃에 새로 뻗은 칸은 굵게 시작한다.' },
    { id: 'ginkgo',   name: '은행나무',    icon: '🍂', yield: 4, fx: 'far',       weight: 4,  desc: '기운 4, 대신 거리 손실이 두 칸마다.' },
    { id: 'elm',      name: '느릅나무',    icon: '🌴', yield: 2, fx: 'heal',      weight: 5,  desc: '처음 짝을 맺으면 심장 +1.' },
    { id: 'cherry',   name: '벚나무',      icon: '🌸', yield: 1, fx: 'bloom',     weight: 5,  desc: '처음 짝을 맺으면 포자 +3.' },
    { id: 'hazel',    name: '개암나무',    icon: '🥜', yield: 2, fx: 'litter',    weight: 5,  desc: '사흘마다 이웃에 낙엽을 떨군다.' },
    { id: 'yew',      name: '주목',        icon: '🌲', yield: 2, fx: 'toxin',     weight: 4,  desc: '이웃에 온 위협에게 날마다 1 피해.' },
    { id: 'alder',    name: '오리나무',    icon: '🌱', yield: 2, fx: 'soil',      weight: 5,  desc: '짝을 맺으면 이웃 마른 흙이 흙이 된다.' },
    { id: 'beech',    name: '너도밤나무',  icon: '🌳', yield: 3, fx: '',          weight: 6,  desc: '기운 3을 나눠 준다.' },
    { id: 'linden',   name: '피나무',      icon: '🍃', yield: 2, fx: 'calm',      weight: 4,  desc: '이웃 망 칸은 끊겨도 시들지 않는다.' },
    { id: 'oldoak',   name: '늙은 참나무', icon: '🪵', yield: 5, fx: 'far',       weight: 2,  desc: '기운 5, 대신 거리 손실이 두 칸마다.' }
  ];

  // 4. 버섯 12종 — 피울 때 자리로 정해진다 (위에서부터 먼저 맞는 것)
  var MUSHROOMS = [
    { id: 'logcap',   name: '통나무버섯', icon: '🍄', bonus: 2, rule: 'wasLog',   desc: '통나무였던 칸에서 핀다. 포자 +2.' },
    { id: 'eldercap', name: '고목버섯',   icon: '🍄', bonus: 2, rule: 'nearFar',  desc: '은행나무·늙은 참나무 곁에서 핀다. 포자 +2.' },
    { id: 'leafcap',  name: '낙엽버섯',   icon: '🍄', bonus: 1, rule: 'litter',   desc: '낙엽 더미에서 핀다. 포자 +1.' },
    { id: 'drycap',   name: '마른버섯',   icon: '🍄', bonus: 1, rule: 'dry',      desc: '마른 흙에서 핀다. 포자 +1.' },
    { id: 'shadecap', name: '그늘버섯',   icon: '🍄', bonus: 1, rule: 'nearTree', desc: '나무 곁에서 핀다. 포자 +1.' },
    { id: 'heartcap', name: '심장버섯',   icon: '🍄', bonus: 1, rule: 'nearHeart', desc: '심장 곁에서 핀다. 포자 +1.' },
    { id: 'twincap',  name: '쌍둥이버섯', icon: '🍄', bonus: 1, rule: 'nearMush', desc: '다른 버섯 곁에서 핀다. 포자 +1.' },
    { id: 'thorncap', name: '가시버섯',   icon: '🍄', bonus: 0, rule: 'thick',    desc: '굵은 칸에서 핀다. 먹히면 먹은 위협이 1 피해.' },
    { id: 'mosscap',  name: '이끼버섯',   icon: '🍄', bonus: 0, rule: 'moist',    desc: '젖은 흙에서 핀다. 피우기 비용 -1.' },
    { id: 'toxcap',   name: '독버섯',     icon: '🍄', bonus: 0, rule: 'toxic',    desc: '독 형질이 있으면 핀다. 이웃 위협에게 날마다 1 피해.' },
    { id: 'glowcap',  name: '빛버섯',     icon: '🍄', bonus: 0, rule: 'glow',     desc: '밤빛균만 피운다. 빛 피우기 때 포자 세 배.' },
    { id: 'threadcap', name: '실버섯',    icon: '🍄', bonus: 0, rule: 'any',      desc: '어디서나 피는 기본 버섯.' }
  ];

  // 5. 형질 40종 — 숲을 넘길 때 셋 중 하나
  var TRAITS = [
    { id: 't_income1',   name: '넓은 잔뿌리',   fx: { income: 1 },            rare: 1, desc: '날마다 기운 +1.' },
    { id: 't_income2',   name: '깊은 잔뿌리',   fx: { income: 2 },            rare: 3, desc: '날마다 기운 +2.' },
    { id: 't_start3',    name: '저장 주머니',   fx: { startEnergy: 3 },       rare: 1, desc: '숲마다 기운 +3으로 시작.' },
    { id: 't_start6',    name: '큰 저장 주머니', fx: { startEnergy: 6 },      rare: 2, desc: '숲마다 기운 +6으로 시작.' },
    { id: 't_cap',       name: '두꺼운 벽',     fx: { cap: 8 },               rare: 1, desc: '기운을 8 더 모아 둘 수 있다.' },
    { id: 't_heart1',    name: '단단한 심장',   fx: { heartHp: 1 },           rare: 1, desc: '심장 최대 +1, 바로 +1.' },
    { id: 't_heart2',    name: '겹 심장',       fx: { heartHp: 2 },           rare: 2, desc: '심장 최대 +2, 바로 +2.' },
    { id: 't_loss1',     name: '매끄러운 관',   fx: { lossStep: 1 },          rare: 1, desc: '거리 손실이 한 칸 늦게 시작.' },
    { id: 't_loss2',     name: '물관 다발',     fx: { lossStep: 2 },          rare: 2, desc: '거리 손실이 두 칸 늦게 시작.' },
    { id: 't_moist',     name: '물 머금기',     fx: { growMoist: 1 },         rare: 1, desc: '젖은 흙 뻗기 비용 0.' },
    { id: 't_dry',       name: '마른 땅 파기',  fx: { growDry: 1 },           rare: 1, desc: '마른 흙 뻗기 비용 -1.' },
    { id: 't_soil',      name: '흙 녹이기',     fx: { growSoil: 1 },          rare: 2, desc: '흙 뻗기 비용 -1.' },
    { id: 't_litter',    name: '낙엽 분해',     fx: { growLitter: 1, litterIncome: 1 }, rare: 1, desc: '낙엽 뻗기 -1, 낙엽 칸 기운 +1.' },
    { id: 't_fruit',     name: '빠른 갓',       fx: { fruitCost: 1 },         rare: 2, desc: '버섯 피우기 비용 -1.' },
    { id: 't_thick',     name: '실 꼬기',       fx: { thickCost: 1 },         rare: 1, desc: '굵히기 비용 -1.' },
    { id: 't_thickmax',  name: '겹 굵히기',     fx: { thickMax: 1 },          rare: 2, desc: '한 칸을 두 번까지 굵힐 수 있다.' },
    { id: 't_spore',     name: '포자 주머니',   fx: { spore: 1 },             rare: 3, desc: '모든 버섯 포자 +1.' },
    { id: 't_sporetree', name: '나무 친구',     fx: { sporeTree: 1 },         rare: 1, desc: '나무 곁 버섯 포자 +1.' },
    { id: 't_wither',    name: '끈질긴 실',     fx: { witherDays: 1 },        rare: 1, desc: '끊긴 칸이 하루 더 버틴다.' },
    { id: 't_digest',    name: '산 분비',       fx: { digestCost: 1 },        rare: 1, desc: '곰팡이 삭이기 비용 -1.' },
    { id: 't_kill',      name: '사냥 균사',     fx: { killEnergy: 1 },        rare: 1, desc: '위협을 쓰러뜨릴 때 기운 +1.' },
    { id: 't_thorn',     name: '가시 실',       fx: { thickDmg: 1 },          rare: 2, desc: '굵은 칸에 튕긴 위협이 1 더 다친다.' },
    { id: 't_toxic',     name: '독 갓',         fx: { toxicCap: 1 },          rare: 2, desc: '자리 규칙에 맞는 버섯이 없는 칸에 독버섯이 핀다.' },
    { id: 't_tree',      name: '나무와 나눔',   fx: { treeYield: 1 },         rare: 2, desc: '짝 나무마다 기운 +1.' },
    { id: 't_log',       name: '통나무 먹기',   fx: { logBonus: 3 },          rare: 1, desc: '통나무 칸을 차지하면 기운 +3 더.' },
    { id: 't_heal',      name: '새살',          fx: { healForest: 1 },        rare: 1, desc: '숲을 넘길 때 심장 +1 더.' },
    { id: 't_cd',        name: '빠른 기억',     fx: { skillCd: 1 },           rare: 2, desc: '균주 기술 다시 쓰기 하루 빨리.' },
    { id: 't_days',      name: '긴 가을',       fx: { daysPlus: 1 },          rare: 2, desc: '숲마다 하루 더.' },
    { id: 't_goal',      name: '작은 포자',     fx: { goalCut: 10 },          rare: 3, desc: '숲 포자 목표 -10%.' },
    { id: 't_calm',      name: '조용한 실',     fx: { spawnCut: 15 },         rare: 2, desc: '위협이 15% 덜 온다.' },
    { id: 't_freegrow',  name: '아침 뻗기',     fx: { freeGrow: 1 },          rare: 2, desc: '날마다 첫 뻗기 비용 0.' },
    { id: 't_growthick', name: '굵은 끝',       fx: { growThick: 3 },         rare: 1, desc: '세 번째 뻗기마다 굵게 시작.' },
    { id: 't_guard',     name: '질긴 갓',       fx: { mushGuard: 1 },         rare: 2, desc: '버섯마다 한 번은 먹혀도 버틴다.' },
    { id: 't_killspore', name: '양분 사냥',     fx: { killSpore: 1 },         rare: 2, desc: '위협을 쓰러뜨릴 때 포자 +1.' },
    { id: 't_partner',   name: '숲 이웃',       fx: { partnerBonus: 1 },      rare: 1, desc: '짝 나무 셋마다 기운 +1 더.' },
    { id: 't_luck',      name: '좋은 날씨',     fx: { eventLuck: 1 },         rare: 1, desc: '좋은 사건이 더 자주 온다.' },
    { id: 't_heartcap',  name: '심장 곁 갓',    fx: { sporeHeart: 1 },        rare: 1, desc: '심장 곁 버섯 포자 +1 더.' },
    { id: 't_cluster',   name: '무리 짓기',     fx: { sporeTwin: 1 },         rare: 1, desc: '쌍둥이버섯 포자 +1 더.' },
    { id: 't_bounce',    name: '튕겨 내기',     fx: { thickKeep: 1 },         rare: 3, desc: '굵은 칸이 튕겨도 굵기가 줄지 않을 때가 있다(절반).' },
    { id: 't_dew',       name: '이슬 받기',     fx: { moistIncome: 1 },       rare: 1, desc: '젖은 흙 망 칸 넷마다 기운 +1.' }
  ];

  // 6. 숲 사건 26종 — 날이 밝을 때 가끔
  var EVENTS = [
    { id: 'rain',      name: '보슬비',       good: true,  fx: 'rain',      desc: '오늘 뻗기 비용 -1.' },
    { id: 'heavyrain', name: '큰비',         good: true,  fx: 'heavyrain', desc: '빈 흙 네 칸이 젖고 오늘 뻗기 -1.' },
    { id: 'drought',   name: '가뭄',         good: false, fx: 'drought',   desc: '굵지 않은 망 끝 칸 하나가 마르고 빈 흙 둘이 마른다.' },
    { id: 'heatwave',  name: '불볕',         good: false, fx: 'heatwave',  desc: '빈 흙 세 칸이 마른다.' },
    { id: 'leaffall',  name: '낙엽비',       good: true,  fx: 'leaffall',  desc: '빈 칸 세 곳에 낙엽이 쌓인다.' },
    { id: 'rotleaves', name: '썩은 잎 더미', good: true,  fx: 'rotleaves', desc: '빈 칸 네 곳에 낙엽이 쌓인다.' },
    { id: 'logfall',   name: '가지 부러짐',  good: true,  fx: 'logfall',   desc: '빈 칸 하나에 통나무가 생긴다.' },
    { id: 'thunder',   name: '벼락',         good: false, fx: 'thunder',   desc: '짝이 없는 나무 하나가 쓰러져 통나무가 된다.' },
    { id: 'frost',     name: '첫서리',       good: false, fx: 'frost',     desc: '오늘 나무 몫이 반으로 준다.' },
    { id: 'sun',       name: '맑은 햇살',    good: true,  fx: 'sun',       desc: '오늘 짝 나무마다 기운 +1.' },
    { id: 'pollen',    name: '꽃가루 날림',  good: true,  fx: 'sun',       desc: '오늘 짝 나무마다 기운 +1.' },
    { id: 'birds',     name: '새 떼',        good: true,  fx: 'birds',     desc: '걷는 위협 둘이 쪼여 쓰러진다.' },
    { id: 'owl',       name: '부엉이',       good: true,  fx: 'owl',       desc: '가장 센 걷는 위협 하나가 쓰러진다.' },
    { id: 'wind',      name: '센바람',       good: false, fx: 'wind',      desc: '위협 하나가 더 온다.' },
    { id: 'antmarch',  name: '개미 행렬',    good: false, fx: 'antmarch',  desc: '일개미 둘이 온다.' },
    { id: 'worms',     name: '지렁이 길',    good: true,  fx: 'worms',     desc: '마른 흙 세 칸이 흙이 된다.' },
    { id: 'spring',    name: '샘물',         good: true,  fx: 'spring',    desc: '심장 둘레 빈 흙이 젖는다.' },
    { id: 'dew',       name: '아침 이슬',    good: true,  fx: 'dew',       desc: '기운 +2.' },
    { id: 'quiet',     name: '고요한 날',    good: true,  fx: 'quiet',     desc: '기운 +1.' },
    { id: 'picker',    name: '버섯 따는 손', good: false, fx: 'picker',    desc: '버섯 하나를 잃고 기운 +3.' },
    { id: 'hail',      name: '우박',         good: false, fx: 'hail',      desc: '굵지 않은 버섯 하나가 부서진다.' },
    { id: 'mist',      name: '짙은 안개',    good: true,  fx: 'mist',      desc: '오늘 밤 위협이 움직이지 않는다.' },
    { id: 'deer',      name: '사슴 발굽',    good: false, fx: 'deer',      desc: '굵지 않은 망 끝 칸 하나가 밟힌다.' },
    { id: 'boar',      name: '멧돼지',       good: false, fx: 'boar',      desc: '굵지 않은 망 끝 칸 둘이 파헤쳐진다.' },
    { id: 'fireflies', name: '반딧불',       good: true,  fx: 'fireflies', desc: '오늘 밤 버섯마다 포자 +1.' },
    { id: 'sporecloud', name: '포자 구름',   good: true,  fx: 'sporecloud', desc: '포자 +3.' }
  ];

  // 7. 균주 6종 — 시작할 때 고른다
  var STRAINS = [
    { id: 'white',  name: '흰실균',     icon: '🤍', unlock: 0, startEnergy: 0, income: 0, heart: 0, fx: {},               skill: { id: 'rain',     name: '비 부르기', cd: 3, desc: '오늘 뻗기 비용 -1.' },                         desc: '고르게 자라는 기본 균주.' },
    { id: 'red',    name: '붉은갓균',   icon: '❤️', unlock: 2, startEnergy: 0, income: 0, heart: 0, fx: { killEnergy: 1 }, skill: { id: 'poison',   name: '독 포자',   cd: 4, desc: '망 둘레 두 칸 안 위협 모두 2 피해.' },          desc: '위협을 쓰러뜨리면 기운 +1.' },
    { id: 'thick',  name: '굵은뿌리균', icon: '🟫', unlock: 3, startEnergy: 0, income: 0, heart: 1, fx: { thickCost: 1 },  skill: { id: 'fortify',  name: '단단히',    cd: 4, desc: '심장 둘레 망 칸을 모두 한 번 굵힌다.' },        desc: '굵히기 비용 -1, 심장 +1.' },
    { id: 'glow',   name: '밤빛균',     icon: '💡', unlock: 4, startEnergy: 0, income: 0, heart: 0, fx: { sporeTree: 1 },  skill: { id: 'glow',     name: '빛 피우기', cd: 4, desc: '오늘 밤 버섯 포자 두 배(빛버섯 세 배).' },     desc: '나무 곁 버섯 포자 +1. 빛버섯을 피운다.' },
    { id: 'far',    name: '먼길균',     icon: '🧭', unlock: 5, startEnergy: 2, income: 0, heart: 0, fx: { lossStep: 2 },   skill: { id: 'pull',     name: '양분 끌기', cd: 3, desc: '오늘 거리 손실 없음, 짝 나무마다 +1.' },     desc: '거리 손실이 두 칸 늦게 시작.' },
    { id: 'ash',    name: '잿빛균',     icon: '🩶', unlock: 6, startEnergy: 0, income: 1, heart: 0, fx: { digestCost: 1 }, skill: { id: 'dissolve', name: '녹여 먹기', cd: 3, desc: '곰팡이 칸 모두 2 피해, 오늘 삭이기 -1.' },    desc: '삭이기 비용 -1, 날마다 기운 +1.' }
  ];

  var DIFFS = [
    { id: 'easy',   name: '쉬움',   spawn: 0.7, goal: 0.85, heart: 2 },
    { id: 'normal', name: '보통',   spawn: 1.0, goal: 1.0,  heart: 0 },
    { id: 'hard',   name: '어려움', spawn: 1.3, goal: 1.15, heart: -1 }
  ];

  // 8. 업적 26개 — r: 판 기록
  var ACHIEVEMENTS = [
    { id: 'a_first',    name: '첫 실',        desc: '처음으로 숲 하나를 넘긴다.',         check: function (r) { return r.cleared >= 1; } },
    { id: 'a_three',    name: '세 숲',        desc: '한 판에 숲 셋을 넘긴다.',           check: function (r) { return r.cleared >= 3; } },
    { id: 'a_five',     name: '다섯 숲',      desc: '한 판에 숲 다섯을 넘긴다.',         check: function (r) { return r.cleared >= 5; } },
    { id: 'a_win',      name: '숲 심장',      desc: '여덟 숲을 모두 넘긴다.',            check: function (r) { return r.won; } },
    { id: 'a_hard',     name: '거친 숲',      desc: '어려움으로 숲 셋을 넘긴다.',        check: function (r) { return r.diff === 'hard' && r.cleared >= 3; } },
    { id: 'a_spore50',  name: '포자 쉰',      desc: '한 판에 포자 50을 모은다.',         check: function (r) { return r.spores >= 50; } },
    { id: 'a_spore150', name: '포자 백쉰',    desc: '한 판에 포자 150을 모은다.',        check: function (r) { return r.spores >= 150; } },
    { id: 'a_kill10',   name: '숲 지킴이',    desc: '한 판에 위협 10을 쓰러뜨린다.',     check: function (r) { return r.kills >= 10; } },
    { id: 'a_kill30',   name: '숲 사냥꾼',    desc: '한 판에 위협 30을 쓰러뜨린다.',     check: function (r) { return r.kills >= 30; } },
    { id: 'a_grow40',   name: '먼 실',        desc: '한 판에 칸 40개를 뻗는다.',         check: function (r) { return r.grown >= 40; } },
    { id: 'a_grow120',  name: '숲을 덮다',    desc: '한 판에 칸 120개를 뻗는다.',        check: function (r) { return r.grown >= 120; } },
    { id: 'a_mush20',   name: '버섯 밭',      desc: '한 판에 버섯 20을 피운다.',         check: function (r) { return r.mush >= 20; } },
    { id: 'a_kinds6',   name: '여러 갓',      desc: '한 판에 버섯 여섯 종류를 피운다.',  check: function (r) { return r.kinds >= 6; } },
    { id: 'a_trees5',   name: '숲과 손잡기',  desc: '한 숲에서 나무 다섯과 짝을 맺는다.', check: function (r) { return r.maxPartners >= 5; } },
    { id: 'a_digest5',  name: '곰팡이 먹기',  desc: '한 판에 곰팡이 5칸을 삭인다.',      check: function (r) { return r.digest >= 5; } },
    { id: 'a_thick15',  name: '굵은 실',      desc: '한 판에 15번 굵힌다.',              check: function (r) { return r.thick >= 15; } },
    { id: 'a_bounce10', name: '튕겨라',       desc: '한 판에 위협을 10번 튕겨 낸다.',    check: function (r) { return r.bounces >= 10; } },
    { id: 'a_noheart',  name: '다치지 않음',  desc: '심장을 다치지 않고 숲 셋을 넘긴다.', check: function (r) { return r.cleared >= 3 && r.heartHits === 0; } },
    { id: 'a_fast',     name: '이른 수확',    desc: '숲 하나를 닷새 안에 넘긴다.',        check: function (r) { return r.fastest > 0 && r.fastest <= 5; } },
    { id: 'a_traits5',  name: '형질 다섯',    desc: '한 판에 형질 다섯을 모은다.',        check: function (r) { return r.traits >= 5; } },
    { id: 'a_skill5',   name: '기술 다섯',    desc: '한 판에 균주 기술을 다섯 번 쓴다.',  check: function (r) { return r.skills >= 5; } },
    { id: 'a_events8',  name: '숲 날씨',      desc: '한 판에 사건 여덟을 겪는다.',        check: function (r) { return r.events >= 8; } },
    { id: 'a_rich',     name: '넉넉한 기운',  desc: '하루 기운 수입 15를 넘긴다.',        check: function (r) { return r.maxIncome >= 15; } },
    { id: 'a_bossk',    name: '큰 뿔 꺾기',   desc: '큰 사슴벌레를 쓰러뜨린다.',          check: function (r) { return r.bossKills >= 1; } },
    { id: 'a_red',      name: '붉은 갓',      desc: '붉은갓균으로 숲 셋을 넘긴다.',       check: function (r) { return r.strain === 'red' && r.cleared >= 3; } },
    { id: 'a_score300', name: '깊은 숲',      desc: '한 판 점수 300을 넘긴다.',           check: function (r) { return r.score >= 300; } }
  ];

  return {
    TERRAIN: TERRAIN, FORESTS: FORESTS, THREATS: THREATS, TREES: TREES, MUSHROOMS: MUSHROOMS,
    TRAITS: TRAITS, EVENTS: EVENTS, STRAINS: STRAINS, DIFFS: DIFFS, ACHIEVEMENTS: ACHIEVEMENTS
  };
})();
