/* Beat Orchard — 콘텐츠 데이터 */
(function () {
  'use strict';

  // 지역: pool 은 ENEMIES id, boss 는 BOSSES id
  var REGIONS = [
    { id: 'dew', name: '이슬 비탈', color: '#5d8f6a', hpMul: 1.0, pool: ['puff', 'drip', 'wisp', 'roller', 'bubble', 'twin'], boss: 'b_moss',
      desc: '첫 번째 과수원. 느릿한 안개가 대부분이에요.' },
    { id: 'moon', name: '달맞이 둑', color: '#6b78a8', hpMul: 1.35, pool: ['puff', 'drip', 'lamp', 'shell', 'twin', 'moss', 'rush', 'bubble'], boss: 'b_halo',
      desc: '하늘을 나는 반딧안개가 섞여서 몰려와요.' },
    { id: 'frost', name: '서리 울타리', color: '#7fa7c0', hpMul: 1.8, pool: ['frost', 'shell', 'rush', 'thorn', 'lamp', 'stone', 'haze', 'moss'], boss: 'b_frost',
      desc: '방어력이 높은 단단한 안개가 많아요.' },
    { id: 'ash', name: '잿빛 개울', color: '#8a8178', hpMul: 2.4, pool: ['ash', 'smog', 'shade', 'tide', 'mire', 'spark', 'stone', 'thorn'], boss: 'b_ash',
      desc: '처치하면 여러 갈래로 갈라지는 안개를 조심하세요.' },
    { id: 'hill', name: '사과나무 언덕', color: '#a86b5d', hpMul: 3.1, pool: ['gloom', 'flick', 'elder', 'dusk', 'tide', 'shade', 'mire', 'spark', 'smog'], boss: 'b_elder',
      desc: '가장 오래된 안개가 잠들어 있는 언덕이에요.' }
  ];

  // 안개 무리 (적). sym 은 색 말고도 구분하는 기호
  var ENEMIES = [
    { id: 'puff', name: '안개솜', sym: '○', color: '#cfd8e3', hp: 20, speed: 6, dmg: 4, minWave: 1, desc: '가장 흔한 안개. 느릿느릿 굴러온다.' },
    { id: 'drip', name: '물방울안개', sym: '◇', color: '#9fd3f0', hp: 14, speed: 9, dmg: 3, minWave: 1, desc: '작지만 재빠르다.' },
    { id: 'wisp', name: '실안개', sym: '~', color: '#e6e0ff', hp: 10, speed: 12, dmg: 3, fly: true, minWave: 2, desc: '공중에 떠 있어서 전열 정원사를 그냥 지나친다.' },
    { id: 'roller', name: '굴렁안개', sym: '◎', color: '#b8c4b0', hp: 45, speed: 4, dmg: 7, minWave: 3, desc: '덩치가 크고 느리다.' },
    { id: 'shell', name: '껍질안개', sym: '▣', color: '#c9b58f', hp: 35, speed: 5, dmg: 5, armor: 2, minWave: 2, desc: '단단한 껍질 덕분에 받는 피해가 2씩 줄어든다.' },
    { id: 'twin', name: '쌍둥이안개', sym: '∞', color: '#d9c2e8', hp: 30, speed: 6, dmg: 4, split: { id: 'drip', n: 2 }, minWave: 4, desc: '처치하면 물방울안개 둘로 갈라진다.' },
    { id: 'moss', name: '이끼안개', sym: '♣', color: '#8fc98a', hp: 40, speed: 5, dmg: 5, regen: 2, minWave: 3, desc: '시간이 지나면 체력이 조금씩 회복된다.' },
    { id: 'lamp', name: '반딧안개', sym: '✦', color: '#f3e58a', hp: 18, speed: 10, dmg: 4, fly: true, minWave: 2, desc: '반짝반짝 빛나며 날아온다.' },
    { id: 'frost', name: '서리안개', sym: '❄', color: '#d6f1ff', hp: 50, speed: 5, dmg: 6, armor: 3, minWave: 1, desc: '차갑고 단단하다.' },
    { id: 'bubble', name: '거품안개', sym: '◌', color: '#bfe7e4', hp: 25, speed: 6, dmg: 4, shieldHits: 2, minWave: 5, desc: '거품 보호막이 공격을 두 번 막아 준다.' },
    { id: 'rush', name: '돌풍안개', sym: '»', color: '#e8b8a0', hp: 28, speed: 8, dmg: 5, burst: true, minWave: 4, desc: '체력이 절반 아래로 떨어지면 빨라진다.' },
    { id: 'stone', name: '돌안개', sym: '■', color: '#9a9a9a', hp: 110, speed: 3, dmg: 10, armor: 4, minWave: 5, desc: '바위처럼 무겁고 단단하다.' },
    { id: 'ash', name: '잿가루안개', sym: '⁂', color: '#b0a8a0', hp: 40, speed: 6, dmg: 6, split: { id: 'wisp', n: 2 }, minWave: 1, desc: '처치하면 실안개 둘이 날아오른다.' },
    { id: 'smog', name: '매연안개', sym: '▲', color: '#8c8476', hp: 70, speed: 4, dmg: 7, regen: 4, minWave: 2, desc: '체력이 빠르게 회복된다.' },
    { id: 'shade', name: '그늘안개', sym: '◐', color: '#7d7aa0', hp: 55, speed: 7, dmg: 6, fly: true, minWave: 3, desc: '그림자처럼 소리 없이 날아온다.' },
    { id: 'thorn', name: '가시안개', sym: '✱', color: '#c7a0b8', hp: 60, speed: 5, dmg: 8, shieldHits: 3, minWave: 4, desc: '가시 보호막이 공격을 세 번 막아 준다.' },
    { id: 'tide', name: '밀물안개', sym: '≈', color: '#7fb0d8', hp: 90, speed: 5, dmg: 8, burst: true, minWave: 3, desc: '체력이 절반 아래로 떨어지면 밀물처럼 몰아친다.' },
    { id: 'gloom', name: '먹구름안개', sym: '☁', color: '#6e7480', hp: 140, speed: 3, dmg: 10, armor: 3, split: { id: 'puff', n: 3 }, minWave: 1, desc: '처치하면 안개솜 셋으로 흩어진다.' },
    { id: 'flick', name: '깜빡안개', sym: '✧', color: '#fff2b0', hp: 35, speed: 13, dmg: 5, fly: true, burst: true, minWave: 2, desc: '눈 깜짝할 사이에 날아든다.' },
    { id: 'elder', name: '묵은안개', sym: '◆', color: '#a0a6b8', hp: 200, speed: 2.5, dmg: 14, armor: 5, regen: 5, minWave: 5, desc: '오래 묵은 만큼 단단하고, 체력도 계속 회복된다.' },
    { id: 'haze', name: '아지랑이', sym: '░', color: '#f0d0c0', hp: 30, speed: 7, dmg: 4, fly: true, shieldHits: 1, minWave: 3, desc: '흐릿해서 첫 공격은 빗나간다.' },
    { id: 'mire', name: '늪안개', sym: '▼', color: '#7f9a78', hp: 85, speed: 3.5, dmg: 8, armor: 1, regen: 3, minWave: 2, desc: '질척하게 들러붙어 좀처럼 쓰러지지 않는다.' },
    { id: 'spark', name: '불티안개', sym: '✶', color: '#ffb070', hp: 22, speed: 14, dmg: 4, burst: true, minWave: 1, desc: '불티처럼 튀며 빠르게 다가온다.' },
    { id: 'dusk', name: '해질녘안개', sym: '◒', color: '#c8907a', hp: 160, speed: 3, dmg: 11, shieldHits: 4, split: { id: 'shade', n: 2 }, minWave: 4, desc: '노을빛 보호막이 공격을 네 번 막고, 처치하면 그늘안개 둘로 갈라진다.' }
  ];

  // 우두머리. ability: summon / shield / haste / hop
  var BOSSES = [
    { id: 'b_moss', name: '이끼 우두머리', sym: '♠', color: '#6fbf6a', hp: 600, speed: 2.2, dmg: 18, armor: 1, ability: 'summon', every: 7, summon: 'puff', desc: '안개솜을 계속 불러낸다.' },
    { id: 'b_halo', name: '달무리', sym: '◉', color: '#b8c0ff', hp: 900, speed: 2.4, dmg: 20, armor: 2, ability: 'shield', every: 8, desc: '때때로 달빛 보호막을 두른다.' },
    { id: 'b_frost', name: '서리 군주', sym: '✺', color: '#cfefff', hp: 1300, speed: 2.0, dmg: 24, armor: 4, ability: 'haste', every: 7, desc: '얼음 위를 미끄러지듯 갑자기 빨라진다.' },
    { id: 'b_ash', name: '잿빛 쌍두', sym: '⊛', color: '#a89a90', hp: 1800, speed: 2.0, dmg: 26, armor: 3, ability: 'summon', every: 6, summon: 'ash', desc: '잿가루안개를 쏟아 낸다.' },
    { id: 'b_elder', name: '태고의 안개', sym: '❖', color: '#9aa0c0', hp: 2600, speed: 1.8, dmg: 30, armor: 5, ability: 'hop', every: 6, desc: '이 줄 저 줄을 옮겨 다닌다.' }
  ];

  // 정원사. role front = 전열 근접, back = 후열 원거리
  // skill.type: shield / slow / seed / heal / burst / rally / rain
  var GARDENERS = [
    { id: 'hedge', name: '밤송이', emoji: '🦔', role: 'front', hp: 120, dmg: 9, rate: 1.0, range: 6, cost: 0,
      desc: '전열을 든든하게 지키는 고슴도치.', skill: { type: 'shield', name: '가시 울타리', cd: 22, power: 40, desc: '울타리에 보호막 40을 두른다. 보호막은 시간이 지나면 조금씩 사라진다.' } },
    { id: 'frog', name: '개굴', emoji: '🐸', role: 'back', hp: 70, dmg: 6, rate: 1.2, range: 72, cost: 0,
      desc: '후열에서 물방울을 튕겨 공격하는 개구리.', skill: { type: 'slow', name: '물웅덩이', cd: 18, power: 4, desc: '같은 줄의 안개를 4초 동안 느리게 만든다.' } },
    { id: 'squirrel', name: '도토리', emoji: '🐿️', role: 'back', hp: 60, dmg: 4, rate: 2.0, range: 60, cost: 0,
      desc: '도토리를 재빠르게 던지는 다람쥐.', skill: { type: 'seed', name: '숨긴 씨앗', cd: 30, power: 2, desc: '숨겨 둔 씨앗 2알을 꺼내 온다.' } },
    { id: 'turtle', name: '등껍질', emoji: '🐢', role: 'front', hp: 220, dmg: 5, rate: 0.8, range: 6, cost: 40,
      desc: '느리지만 아주 튼튼한 거북이.', skill: { type: 'heal', name: '느긋한 낮잠', cd: 28, power: 0.35, desc: '모든 정원사의 체력을 35% 회복하고, 쓰러진 정원사를 일으킨다.' } },
    { id: 'bear', name: '곰방울', emoji: '🐻', role: 'front', hp: 160, dmg: 16, rate: 0.7, range: 7, cost: 60,
      desc: '한 방 한 방이 묵직한 곰.', skill: { type: 'burst', name: '땅 구르기', cd: 20, power: 45, desc: '같은 줄의 모든 안개에게 피해 45.' } },
    { id: 'badger', name: '굴파기', emoji: '🦡', role: 'front', hp: 140, dmg: 11, rate: 1.1, range: 6, cost: 80,
      desc: '공격과 체력이 고루 뛰어난 오소리.', skill: { type: 'rally', name: '함성', cd: 26, power: 6, desc: '6초 동안 모든 정원사의 공격력이 1.5배가 된다.' } },
    { id: 'owl', name: '부엉', emoji: '🦉', role: 'back', hp: 55, dmg: 14, rate: 0.6, range: 90, cost: 50,
      desc: '먼 거리에서 강하게 공격하는 부엉이.', skill: { type: 'rain', name: '깃털 비', cd: 30, power: 30, desc: '모든 줄의 안개에게 피해 30.' } },
    { id: 'bee', name: '붕붕', emoji: '🐝', role: 'back', hp: 45, dmg: 3, rate: 3.0, range: 50, cost: 70,
      desc: '쉴 새 없이 침을 쏘는 꿀벌.', skill: { type: 'burst', name: '벌집 털기', cd: 16, power: 30, desc: '같은 줄의 모든 안개에게 피해 30.' } },
    { id: 'duck', name: '꽥꽥', emoji: '🦆', role: 'back', hp: 65, dmg: 8, rate: 1.0, range: 70, cost: 90,
      desc: '후열을 든든하게 받쳐 주는 오리.', skill: { type: 'shield', name: '깃털 담', cd: 26, power: 60, desc: '울타리에 보호막 60을 두른다. 보호막은 시간이 지나면 조금씩 사라진다.' } },
    { id: 'ladybug', name: '점박이', emoji: '🐞', role: 'back', hp: 50, dmg: 5, rate: 1.4, range: 65, cost: 100,
      desc: '동료들을 살뜰히 돌보는 무당벌레.', skill: { type: 'heal', name: '이슬 한 방울', cd: 24, power: 0.5, desc: '모든 정원사의 체력을 50% 회복하고, 쓰러진 정원사를 일으킨다.' } },
    { id: 'fox', name: '여울', emoji: '🦊', role: 'front', hp: 130, dmg: 13, rate: 1.3, range: 7, cost: 120,
      desc: '전열에서 날쌔게 싸우는 여우.', skill: { type: 'slow', name: '여울 꼬리', cd: 20, power: 5, desc: '같은 줄의 안개를 5초 동안 느리게 만든다.' } },
    { id: 'mouse', name: '쪼르', emoji: '🐭', role: 'back', hp: 40, dmg: 4, rate: 1.6, range: 55, cost: 150,
      desc: '씨앗을 귀신같이 찾아내는 생쥐.', skill: { type: 'seed', name: '씨앗 굴', cd: 26, power: 4, desc: '숨겨 둔 씨앗 4알을 꺼내 온다.' } }
  ];

  // 강화 (웨이브 사이 3지선다). rare 1~3. apply(m) 은 능력치만 바꾼다. onPick(run) 은 고를 때 한 번.
  // beat: true = 박자 규칙(판정 범위·콤보·완벽!)을 바꾸는 항목. 고르기 카드에 '박자' 태그가 붙는다
  var UPGRADES = [
    { id: 'u01', name: '단단한 가지', rare: 1, desc: '나무 열매 피해 +15%', apply: function (m) { m.treeDmg *= 1.15; } },
    { id: 'u02', name: '빠른 열매', rare: 1, beat: true, desc: '나무 공격 속도 +12%. 완벽! 판정이 나면 그 줄 나무가 열매를 하나 더 던진다', apply: function (m) { m.treeRate *= 1.12; m.perfectShot += 1; } },
    { id: 'u03', name: '거름 한 줌', rare: 1, desc: '씨앗 한 알당 효과 +3%', apply: function (m) { m.seedPower += 0.03; } },
    { id: 'u04', name: '굵은 손목', rare: 1, desc: '정원사 공격력 +15%', apply: function (m) { m.unitDmg *= 1.15; } },
    { id: 'u05', name: '두꺼운 앞치마', rare: 1, desc: '정원사 체력 +20%', apply: function (m) { m.unitHp *= 1.2; } },
    { id: 'u06', name: '부지런한 손', rare: 1, desc: '정원사 공격 속도 +12%', apply: function (m) { m.unitRate *= 1.12; } },
    { id: 'u07', name: '관통 씨앗', rare: 2, desc: '공격이 안개를 하나 더 관통한다', apply: function (m) { m.pierce += 1; } },
    { id: 'u08', name: '반짝 눈', rare: 1, beat: true, desc: '치명타 확률 +8%, 완벽! 판정 범위 +15%', apply: function (m) { m.crit += 0.08; m.perfectWin *= 1.15; } },
    { id: 'u09', name: '묵직한 한 방', rare: 1, desc: '치명타 피해 배율 +0.5', apply: function (m) { m.critMul += 0.5; } },
    { id: 'u10', name: '끈적한 과즙', rare: 2, desc: '공격이 맞으면 15% 확률로 안개가 느려진다', apply: function (m) { m.slowOnHit += 0.15; } },
    { id: 'u11', name: '튀는 과즙', rare: 2, desc: '맞은 안개 주변에도 피해의 20%', apply: function (m) { m.splash += 0.2; } },
    { id: 'u12', name: '울타리 보강', rare: 1, desc: '울타리 최대 체력 +15, 바로 15 수리', apply: function (m) { m.fenceMax += 15; }, onPick: function (r) { r.fence += 15; } },
    { id: 'u13', name: '씨앗 주머니', rare: 1, desc: '씨앗 획득 확률 +8%', apply: function (m) { m.dropChance += 0.08; } },
    { id: 'u14', name: '짧은 숨', rare: 1, desc: '기술 쿨타임 -15%', apply: function (m) { m.skillCd *= 0.85; } },
    { id: 'u15', name: '은씨앗 눈썰미', rare: 1, desc: '판이 끝날 때 받는 은씨앗 +15%', apply: function (m) { m.goldMul += 0.15; } },
    { id: 'u16', name: '울타리 덩굴', rare: 1, desc: '웨이브가 끝날 때마다 울타리 3 수리', apply: function (m) { m.fenceRegen += 3; } },
    { id: 'u17', name: '껍질 깨기', rare: 2, desc: '안개 방어력 2 무시', apply: function (m) { m.armorPierce += 2; } },
    { id: 'u18', name: '씨앗 세 알', rare: 1, desc: '바로 씨앗 3알을 얻는다', apply: function () {}, onPick: function (r) { r.pouch += 3; } },
    { id: 'u19', name: '전열 방패', rare: 2, desc: '전열 정원사가 받는 피해 -2', apply: function (m) { m.frontArmor += 2; } },
    { id: 'u20', name: '큰 녀석 사냥', rare: 2, desc: '우두머리에게 주는 피해 +25%', apply: function (m) { m.bossDmg *= 1.25; } },
    { id: 'u21', name: '하늘 겨냥', rare: 1, desc: '나는 안개에게 주는 피해 +30%', apply: function (m) { m.flyDmg *= 1.3; } },
    { id: 'u22', name: '넓은 시야', rare: 3, once: true, desc: '앞으로 강화를 고를 때 선택지가 하나 늘어난다', apply: function (m) { m.extraChoice += 1; } },
    { id: 'u23', name: '따뜻한 차', rare: 1, desc: '웨이브가 끝날 때마다 정원사 체력 25% 회복', apply: function (m) { m.healOnWave += 0.25; } },
    { id: 'u24', name: '수리 망치', rare: 1, desc: '울타리를 바로 30 수리', apply: function () {}, onPick: function (r) { r.fence += 30; } },
    { id: 'u25', name: '거센 가지', rare: 2, desc: '열매 피해 +25%, 나무 공격 속도 -8%', apply: function (m) { m.treeDmg *= 1.25; m.treeRate *= 0.92; } },
    { id: 'u26', name: '잔가지 연사', rare: 2, desc: '나무 공격 속도 +25%, 열매 피해 -10%', apply: function (m) { m.treeRate *= 1.25; m.treeDmg *= 0.9; } },
    { id: 'u27', name: '깊은 뿌리', rare: 2, desc: '씨앗 한 알당 효과 +5%', apply: function (m) { m.seedPower += 0.05; } },
    { id: 'u28', name: '찰떡 호흡', rare: 1, beat: true, desc: '정원사 공격력 +10%, 공격 속도 +8%. 콤보 1당 열매 피해 4% → 5%', apply: function (m) { m.unitDmg *= 1.1; m.unitRate *= 1.08; m.comboPower += 0.01; } },
    { id: 'u29', name: '질긴 장화', rare: 2, desc: '정원사 체력 +35%', apply: function (m) { m.unitHp *= 1.35; } },
    { id: 'u30', name: '바람 읽기', rare: 1, beat: true, desc: '치명타 확률 +5%, 느려짐 확률 +8%, 좋아! 판정 범위 +15%', apply: function (m) { m.crit += 0.05; m.slowOnHit += 0.08; m.goodWin *= 1.15; } },
    { id: 'u31', name: '넓은 바구니', rare: 2, desc: '씨앗 획득 확률 +12%', apply: function (m) { m.dropChance += 0.12; } },
    { id: 'u32', name: '맑은 머리', rare: 3, desc: '기술 쿨타임 -25%', apply: function (m) { m.skillCd *= 0.75; } },
    { id: 'u33', name: '열매 폭죽', rare: 3, beat: true, desc: '맞은 안개 주변에도 피해의 35%. 콤보 10마다 그 줄의 안개가 모두 폭발 피해를 입는다', apply: function (m) { m.splash += 0.35; m.comboBurst += 15; } },
    { id: 'u34', name: '바늘 씨앗', rare: 3, desc: '공격이 안개를 둘 더 관통한다', apply: function (m) { m.pierce += 2; } },
    { id: 'u35', name: '첫서리 칼날', rare: 3, desc: '치명타 피해 배율 +1, 치명타 확률 +5%', apply: function (m) { m.critMul += 1; m.crit += 0.05; } },
    { id: 'u36', name: '마을의 응원', rare: 3, beat: true, desc: '열매·정원사 피해 +10%, 울타리 최대 체력 +10, 콤보 상한 +5', apply: function (m) { m.treeDmg *= 1.1; m.unitDmg *= 1.1; m.fenceMax += 10; m.comboCap += 5; } },
    { id: 'u37', name: '고요한 밭', rare: 2, desc: '웨이브가 끝날 때마다 울타리 5 수리', apply: function (m) { m.fenceRegen += 5; } },
    { id: 'u38', name: '씨앗 다섯 알', rare: 2, desc: '바로 씨앗 5알을 얻는다', apply: function () {}, onPick: function (r) { r.pouch += 5; } },
    { id: 'u39', name: '끝까지 버티기', rare: 1, beat: true, desc: '정원사 체력 +15%, 전열이 받는 피해 -1. 웨이브마다 한 번은 놓쳐도 콤보가 이어진다', apply: function (m) { m.unitHp *= 1.15; m.frontArmor += 1; m.missGuard += 1; } },
    { id: 'u40', name: '이슬 맺힌 잎', rare: 1, beat: true, desc: '나무 공격 속도 +8%, 씨앗 효과 +2%. 박자 물 주기 효과 +25%', apply: function (m) { m.treeRate *= 1.08; m.seedPower += 0.02; m.pumpGain *= 1.25; } }
  ];

  // 보물 (3·6번째 웨이브 뒤에 고른다. 한 판에 같은 것은 한 번)
  var RELICS = [
    { id: 'r01', name: '오래된 물뿌리개', beat: true, desc: '나무 공격 속도 +20%. 박자 물 주기 효과 +30%', apply: function (m) { m.treeRate *= 1.2; m.pumpGain *= 1.3; } },
    { id: 'r02', name: '은 가위', desc: '치명타 확률 +12%', apply: function (m) { m.crit += 0.12; } },
    { id: 'r03', name: '금빛 거름통', desc: '씨앗 한 알당 효과 +6%', apply: function (m) { m.seedPower += 0.06; } },
    { id: 'r04', name: '등나무 지팡이', desc: '정원사 공격력 +25%', apply: function (m) { m.unitDmg *= 1.25; } },
    { id: 'r05', name: '누비 조끼', desc: '정원사 체력 +40%', apply: function (m) { m.unitHp *= 1.4; } },
    { id: 'r06', name: '바람개비', desc: '기술 쿨타임 -30%', apply: function (m) { m.skillCd *= 0.7; } },
    { id: 'r07', name: '서리 방울', desc: '공격이 맞으면 25% 확률로 안개가 느려진다', apply: function (m) { m.slowOnHit += 0.25; } },
    { id: 'r08', name: '쪼개진 호두', desc: '공격이 안개를 둘 더 관통한다', apply: function (m) { m.pierce += 2; } },
    { id: 'r09', name: '꿀단지', desc: '웨이브가 끝날 때마다 정원사 체력 40% 회복', apply: function (m) { m.healOnWave += 0.4; } },
    { id: 'r10', name: '돌담 조각', desc: '울타리 최대 체력 +40, 바로 40 수리', apply: function (m) { m.fenceMax += 40; }, onPick: function (r) { r.fence += 40; } },
    { id: 'r11', name: '반딧불 병', desc: '나는 안개에게 주는 피해 +60%', apply: function (m) { m.flyDmg *= 1.6; } },
    { id: 'r12', name: '큰 낫', desc: '우두머리에게 주는 피해 +50%', apply: function (m) { m.bossDmg *= 1.5; } },
    { id: 'r13', name: '깃털 모자', desc: '씨앗 획득 확률 +15%', apply: function (m) { m.dropChance += 0.15; } },
    { id: 'r14', name: '무쇠 냄비', desc: '전열 정원사가 받는 피해 -4', apply: function (m) { m.frontArmor += 4; } },
    { id: 'r15', name: '은씨앗 저금통', desc: '받는 은씨앗 +40%', apply: function (m) { m.goldMul += 0.4; } },
    { id: 'r16', name: '둥근 렌즈', desc: '치명타 피해 배율 +1.2', apply: function (m) { m.critMul += 1.2; } },
    { id: 'r17', name: '덩굴 매듭', desc: '웨이브가 끝날 때마다 울타리 8 수리', apply: function (m) { m.fenceRegen += 8; } },
    { id: 'r18', name: '쌍갈래 가지', beat: true, desc: '맞은 안개 주변에도 피해의 40%. 완벽! 판정이 나면 그 줄 나무가 열매를 하나 더 던진다', apply: function (m) { m.splash += 0.4; m.perfectShot += 1; } },
    { id: 'r19', name: '녹슨 못', desc: '안개 방어력 4 무시', apply: function (m) { m.armorPierce += 4; } },
    { id: 'r20', name: '씨앗 목걸이', desc: '바로 씨앗 8알을 얻는다', apply: function () {}, onPick: function (r) { r.pouch += 8; } },
    { id: 'r21', name: '해시계', beat: true, desc: '정원사 공격 속도 +25%. 웨이브마다 한 번은 놓쳐도 콤보가 이어진다', apply: function (m) { m.unitRate *= 1.25; m.missGuard += 1; } },
    { id: 'r22', name: '마른 꽃다발', beat: true, desc: '열매 피해 +30%, 콤보 상한 +10', apply: function (m) { m.treeDmg *= 1.3; m.comboCap += 10; } },
    { id: 'r23', name: '작은 종', beat: true, desc: '기술 쿨타임 -15%, 정원사 공격력 +10%, 완벽! 판정 범위 +25%', apply: function (m) { m.skillCd *= 0.85; m.unitDmg *= 1.1; m.perfectWin *= 1.25; } },
    { id: 'r24', name: '낡은 지도', desc: '받는 은씨앗 +20%, 씨앗 획득 확률 +8%', apply: function (m) { m.goldMul += 0.2; m.dropChance += 0.08; } }
  ];

  // 작업실 영구 강화 (은씨앗으로 한 번씩 산다. 모든 판에 적용)
  var WORKSHOP = [
    { id: 'w01', name: '튼튼한 울타리', cost: 20, desc: '울타리 최대 체력 +20', apply: function (m) { m.fenceMax += 20; } },
    { id: 'w02', name: '첫 거름', cost: 15, desc: '씨앗 2알을 가지고 시작', apply: function (m) { m.startSeeds += 2; } },
    { id: 'w03', name: '날 선 가지', cost: 30, desc: '열매 피해 +10%', apply: function (m) { m.treeDmg *= 1.1; } },
    { id: 'w04', name: '손질한 장갑', cost: 30, desc: '정원사 공격력 +10%', apply: function (m) { m.unitDmg *= 1.1; } },
    { id: 'w05', name: '새 앞치마', cost: 25, desc: '정원사 체력 +15%', apply: function (m) { m.unitHp *= 1.15; } },
    { id: 'w06', name: '씨앗 자루', cost: 35, desc: '씨앗 획득 확률 +5%', apply: function (m) { m.dropChance += 0.05; } },
    { id: 'w07', name: '휘파람', cost: 40, desc: '기술 쿨타임 -10%', apply: function (m) { m.skillCd *= 0.9; } },
    { id: 'w08', name: '은씨앗 저울', cost: 50, desc: '받는 은씨앗 +10%', apply: function (m) { m.goldMul += 0.1; } },
    { id: 'w09', name: '덩굴 손질', cost: 40, desc: '웨이브가 끝날 때마다 울타리 2 수리', apply: function (m) { m.fenceRegen += 2; } },
    { id: 'w10', name: '반짝 돋보기', cost: 35, desc: '치명타 확률 +4%', apply: function (m) { m.crit += 0.04; } },
    { id: 'w11', name: '둘째 바구니', cost: 60, desc: '씨앗 3알을 더 가지고 시작', apply: function (m) { m.startSeeds += 3; } },
    { id: 'w12', name: '오래 핀 나무', cost: 60, desc: '나무 공격 속도 +10%', apply: function (m) { m.treeRate *= 1.1; } },
    { id: 'w13', name: '추가 선택지', cost: 120, desc: '강화를 고를 때 선택지가 하나 늘어난다', apply: function (m) { m.extraChoice += 1; } },
    { id: 'w14', name: '튼튼한 돌담', cost: 90, desc: '울타리 최대 체력 +30', apply: function (m) { m.fenceMax += 30; } },
    { id: 'w15', name: '뿌리 비료', cost: 80, desc: '씨앗 한 알당 효과 +2%', apply: function (m) { m.seedPower += 0.02; } },
    { id: 'w16', name: '전열 투구', cost: 70, desc: '전열 정원사가 받는 피해 -1', apply: function (m) { m.frontArmor += 1; } }
  ];

  function codexCount(M, kind) { return (M.codex && M.codex[kind]) ? M.codex[kind].length : 0; }

  // 업적. check(M) 은 저장된 meta 를 본다
  var ACHIEVEMENTS = [
    { id: 'a01', name: '첫 밤', desc: '첫 판을 끝까지 플레이한다', check: function (M) { return M.stats.runs >= 1; } },
    { id: 'a02', name: '첫 아침', desc: '과수원 한 곳을 되찾는다', check: function (M) { return M.stats.wins >= 1; } },
    { id: 'a03', name: '안개 사냥꾼', desc: '안개 100마리를 물리친다', check: function (M) { return M.stats.kills >= 100; } },
    { id: 'a04', name: '맑게 갠 하늘', desc: '안개 1,000마리를 물리친다', check: function (M) { return M.stats.kills >= 1000; } },
    { id: 'a05', name: '씨 뿌리는 손', desc: '씨앗 50알을 심는다', check: function (M) { return M.stats.planted >= 50; } },
    { id: 'a06', name: '과수원 주인', desc: '씨앗 500알을 심는다', check: function (M) { return M.stats.planted >= 500; } },
    { id: 'a07', name: '우두머리 사냥', desc: '우두머리를 처음으로 물리친다', check: function (M) { return M.stats.bossKills >= 1; } },
    { id: 'a08', name: '다섯 우두머리', desc: '우두머리를 다섯 번 물리친다', check: function (M) { return M.stats.bossKills >= 5; } },
    { id: 'a09', name: '이슬 비탈 지킴이', desc: '이슬 비탈을 되찾는다', check: function (M) { return !!M.cleared[0]; } },
    { id: 'a10', name: '달맞이 둑 지킴이', desc: '달맞이 둑을 되찾는다', check: function (M) { return !!M.cleared[1]; } },
    { id: 'a11', name: '서리 울타리 지킴이', desc: '서리 울타리를 되찾는다', check: function (M) { return !!M.cleared[2]; } },
    { id: 'a12', name: '잿빛 개울 지킴이', desc: '잿빛 개울을 되찾는다', check: function (M) { return !!M.cleared[3]; } },
    { id: 'a13', name: '언덕의 새벽', desc: '사과나무 언덕을 되찾는다', check: function (M) { return !!M.cleared[4]; } },
    { id: 'a14', name: '흠 없는 울타리', desc: '울타리가 한 번도 다치지 않고 과수원을 되찾는다', check: function (M) { return M.stats.perfectWins >= 1; } },
    { id: 'a15', name: '손에 익은 기술', desc: '기술을 50번 쓴다', check: function (M) { return M.stats.skillUses >= 50; } },
    { id: 'a16', name: '은씨앗 항아리', desc: '은씨앗을 모두 합쳐 200개 모은다', check: function (M) { return M.stats.silverTotal >= 200; } },
    { id: 'a17', name: '고르고 또 고르고', desc: '강화를 100번 고른다', check: function (M) { return M.stats.upgradesPicked >= 100; } },
    { id: 'a18', name: '보물 상자', desc: '보물 10종을 발견한다', check: function (M) { return codexCount(M, 'relic') >= 10; } },
    { id: 'a19', name: '모두 모였다', desc: '정원사 12명을 모두 영입한다', check: function (M) { return M.unlocked.length >= GARDENERS.length; } },
    { id: 'a20', name: '백전노장', desc: '웨이브를 모두 합쳐 100번 막아 낸다', check: function (M) { return M.stats.wavesCleared >= 100; } },
    { id: 'a21', name: '열 번째 밤', desc: '열 판을 플레이한다', check: function (M) { return M.stats.runs >= 10; } },
    { id: 'a22', name: '울창한 한 줄', desc: '한 줄에 씨앗 20알을 심는다', check: function (M) { return M.stats.maxLaneSeeds >= 20; } },
    { id: 'a23', name: '안개 도감', desc: '안개 24종을 모두 만난다', check: function (M) { return codexCount(M, 'enemy') >= ENEMIES.length; } },
    { id: 'a24', name: '작업실 완성', desc: '영구 강화를 모두 구매한다', check: function (M) { return M.shop.length >= WORKSHOP.length; } }
  ];

  var HELP_TIPS = [
    '나무는 같은 줄에 안개가 나타나면 알아서 열매를 던져요.',
    '씨앗을 많이 심은 줄일수록 열매가 강하고 빨라져요.',
    '전열 정원사는 안개를 붙잡아 둬요. 하지만 나는 안개는 막지 못해요.',
    '쓰러진 정원사는 웨이브가 끝나면 체력 절반으로 돌아와요.',
    '3번째와 6번째 웨이브가 끝나면 보물을 고를 수 있어요.',
    '10번째 웨이브에는 우두머리가 나타나요.'
  ];

  // 난이도: hp = 안개·우두머리 체력 배율, count = 웨이브 예산(안개 수) 배율, silver = 은씨앗 배율
  var DIFFICULTIES = [
    { id: 'normal', name: '보통', hp: 1, count: 1, silver: 1, desc: '처음 도전하기 좋은 난이도.' },
    { id: 'hard', name: '어려움', hp: 1.5, count: 1.3, silver: 1.6, desc: '더 강한 안개가 더 많이 몰려와요. 은씨앗 1.6배.' },
    { id: 'nightmare', name: '악몽', hp: 2.2, count: 1.6, silver: 2.5, desc: '짙은 안개가 끝없이 밀려와요. 은씨앗 2.5배.' }
  ];

  // 물결별 안개 체력 배율 (지역 hpMul·난이도 hp 와 곱한다). 3.0 → 14.4, 5번째부터 물결마다 약 11~27%씩(차츰 줄며) 올라
  // 울타리 피해가 6~10번째에 나뉘어 쌓인다. 균형 시험(봇 100판) 숫자를 보고 고친다
  // (2차: 6~8번째가 너무 가팔라 7·8번째에서 73판이 졌다 → 6~10번째를 낮추고 고르게 폈다)
  // (3차: 승률 29%, 7·8번째에서 53판이 졌다 → 6~10번째를 4~8% 더 낮췄다)
  var WAVE_HP = [3.0, 3.6, 4.6, 6.0, 7.6, 9.0, 10.2, 11.6, 13.0, 14.4];

  window.GD = {
    REGIONS: REGIONS, ENEMIES: ENEMIES, BOSSES: BOSSES, GARDENERS: GARDENERS,
    UPGRADES: UPGRADES, RELICS: RELICS, WORKSHOP: WORKSHOP, ACHIEVEMENTS: ACHIEVEMENTS, HELP_TIPS: HELP_TIPS,
    DIFFICULTIES: DIFFICULTIES, WAVE_HP: WAVE_HP,
    WAVES: 10
  };
})();
