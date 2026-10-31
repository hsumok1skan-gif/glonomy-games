/* Popcorn Drop (팝콘 팡팡) — 콘텐츠 데이터 (스킬 칸 표·상영관·손님·글) */
(function () {
  'use strict';

  // ---------- 스킬 칸 표 ----------
  // 가지 다섯: 옥수수(위) · 못(오른쪽 위) · 프라이팬(오른쪽 아래) · 손님(왼쪽 아래) · 매점(왼쪽 위)
  // 칸 자리: M1~M7 = 가지 가운데 줄(깊이 1~7), A2·A4·A6 = 시계 방향 옆칸, B3·B5·B6 = 반시계 방향 옆칸
  // 효과 키: corn 옥수수 +n알 · gold 황금 옥수수 확률(%) · x2 두 배 못 · x3 세 배 못 · gpeg 황금 못 · rows 못 판 줄
  //          pan 프라이팬 폭(px) · rim 가장자리 받침 · rimw 받침 넓히기(px) · pan2 프라이팬 하나 더
  //          cust 손님 +n명 · price 팝콘 값(%) · tip 팁 확률(%) · vip VIP 손님 · bonus 판 끝 보너스 · sold 매진 보너스(%) · repour 다시 쏟기
  const BRANCHES = [
    { key: 'corn', name: '옥수수', angle: -90, color: 'corn' },
    { key: 'peg', name: '못', angle: -18, color: 'mint' },
    { key: 'pan', name: '프라이팬', angle: 54, color: 'pot' },
    { key: 'cust', name: '손님', angle: 126, color: 'seat' },
    { key: 'shop', name: '매점', angle: 198, color: 'gold' }
  ];

  // [가지, 자리, 이름, 아이콘, 효과 키, 값]
  const SKILL_TABLE = [
    ['corn', 'M1', '옥수수 +5', '🌽', 'corn', 5],
    ['corn', 'M2', '옥수수 +5', '🌽', 'corn', 5],
    ['corn', 'M3', '옥수수 +8', '🌽', 'corn', 8],
    ['corn', 'M4', '옥수수 +10', '🌽', 'corn', 10],
    ['corn', 'M5', '옥수수 +12', '🌽', 'corn', 12],
    ['corn', 'M6', '옥수수 +15', '🌽', 'corn', 15],
    ['corn', 'M7', '옥수수 +20', '🌽', 'corn', 20],
    ['corn', 'A2', '황금 옥수수 3%', '✨', 'gold', 3],
    ['corn', 'B3', '옥수수 +6', '🌽', 'corn', 6],
    ['corn', 'A4', '황금 옥수수 4%', '✨', 'gold', 4],
    ['corn', 'B5', '옥수수 +10', '🌽', 'corn', 10],
    ['corn', 'A6', '황금 옥수수 5%', '✨', 'gold', 5],
    ['corn', 'B6', '옥수수 +15', '🌽', 'corn', 15],

    ['peg', 'M1', '두 배 못 +1', '✌', 'x2', 1],
    ['peg', 'M2', '두 배 못 +1', '✌', 'x2', 1],
    ['peg', 'M3', '세 배 못 +1', '🔱', 'x3', 1],
    ['peg', 'M4', '못 판 줄 +1', '📏', 'rows', 1],
    ['peg', 'M5', '황금 못 +1', '⭐', 'gpeg', 1],
    ['peg', 'M6', '세 배 못 +1', '🔱', 'x3', 1],
    ['peg', 'M7', '못 판 줄 +1', '📏', 'rows', 1],
    ['peg', 'A2', '두 배 못 +1', '✌', 'x2', 1],
    ['peg', 'B3', '황금 못 +1', '⭐', 'gpeg', 1],
    ['peg', 'A4', '두 배 못 +1', '✌', 'x2', 1],
    ['peg', 'B5', '세 배 못 +1', '🔱', 'x3', 1],
    ['peg', 'A6', '두 배 못 +2', '✌', 'x2', 2],
    ['peg', 'B6', '못 판 줄 +1', '📏', 'rows', 1],

    ['pan', 'M1', '프라이팬 넓게 +12', '🍳', 'pan', 12],
    ['pan', 'M2', '프라이팬 넓게 +12', '🍳', 'pan', 12],
    ['pan', 'M3', '가장자리 받침', '🛡', 'rim', 14],
    ['pan', 'M4', '프라이팬 넓게 +14', '🍳', 'pan', 14],
    ['pan', 'M5', '프라이팬 넓게 +14', '🍳', 'pan', 14],
    ['pan', 'M6', '프라이팬 넓게 +16', '🍳', 'pan', 16],
    ['pan', 'M7', '프라이팬 하나 더', '🥘', 'pan2', 1],
    ['pan', 'A2', '프라이팬 넓게 +6', '🍳', 'pan', 6],
    ['pan', 'B3', '받침 넓히기 +6', '🛡', 'rimw', 6],
    ['pan', 'A4', '프라이팬 넓게 +8', '🍳', 'pan', 8],
    ['pan', 'B5', '받침 넓히기 +6', '🛡', 'rimw', 6],
    ['pan', 'A6', '프라이팬 넓게 +10', '🍳', 'pan', 10],
    ['pan', 'B6', '받침 넓히기 +8', '🛡', 'rimw', 8],

    ['cust', 'M1', '손님 +2명', '🙋', 'cust', 2],
    ['cust', 'M2', '팝콘 값 +20%', '💲', 'price', 20],
    ['cust', 'M3', '팁 확률 15%', '💝', 'tip', 15],
    ['cust', 'M4', '손님 +3명', '🙋', 'cust', 3],
    ['cust', 'M5', 'VIP 손님', '🎩', 'vip', 1],
    ['cust', 'M6', '팝콘 값 +30%', '💲', 'price', 30],
    ['cust', 'M7', 'VIP 손님 +1', '🎩', 'vip', 1],
    ['cust', 'A2', '손님 +2명', '🙋', 'cust', 2],
    ['cust', 'B3', '팝콘 값 +15%', '💲', 'price', 15],
    ['cust', 'A4', '팁 확률 15%', '💝', 'tip', 15],
    ['cust', 'B5', '손님 +3명', '🙋', 'cust', 3],
    ['cust', 'A6', '팝콘 값 +25%', '💲', 'price', 25],
    ['cust', 'B6', '팁 확률 20%', '💝', 'tip', 20],

    ['shop', 'M1', '판 끝 보너스 +3', '🎁', 'bonus', 3],
    ['shop', 'M2', '매진 보너스 +50%', '🏆', 'sold', 50],
    ['shop', 'M3', '판 끝 보너스 +5', '🎁', 'bonus', 5],
    ['shop', 'M4', '다시 쏟기', '🔁', 'repour', 50],
    ['shop', 'M5', '매진 보너스 +100%', '🏆', 'sold', 100],
    ['shop', 'M6', '판 끝 보너스 +10', '🎁', 'bonus', 10],
    ['shop', 'M7', '다시 쏟기 크게', '🔁', 'repour', 25],
    ['shop', 'A2', '판 끝 보너스 +2', '🎁', 'bonus', 2],
    ['shop', 'B3', '매진 보너스 +50%', '🏆', 'sold', 50],
    ['shop', 'A4', '판 끝 보너스 +4', '🎁', 'bonus', 4],
    ['shop', 'B5', '판 끝 보너스 +6', '🎁', 'bonus', 6],
    ['shop', 'A6', '매진 보너스 +100%', '🏆', 'sold', 100],
    ['shop', 'B6', '판 끝 보너스 +8', '🎁', 'bonus', 8]
  ];

  // 칸 값: 깊이가 깊을수록(단계가 오를수록) 비싸다. 첫 판 돈(보통 3~10)으로 깊이 1 칸을 1~2개 산다.
  const COST = [0, 3, 6, 10, 16, 26, 42, 65];
  // 열쇠 네 개(네 귀퉁이): 열 때마다 값이 오른다
  const KEY_COST = [150, 220, 300, 400];
  const SIDE_OFF = 0.72;

  function rad(a) { return a * Math.PI / 180; }
  const SKILLS = [{ id: 'start', br: 'start', slot: 'S', name: '매점 문 열기', icon: '🍿', eff: 'none', val: 0, depth: 0, x: 0, y: 0, links: [] }];
  const byId = { start: SKILLS[0] };
  SKILL_TABLE.forEach(r => {
    const b = BRANCHES.find(x => x.key === r[0]);
    const slot = r[1], depth = Number(slot.slice(1)), side = slot[0] === 'M' ? 0 : slot[0] === 'A' ? 1 : -1;
    const a = rad(b.angle), pa = rad(b.angle + 90);
    const rr = side ? depth - 0.15 : depth;
    const n = { id: r[0] + '_' + slot, br: r[0], slot, name: r[2], icon: r[3], eff: r[4], val: r[5], depth,
      x: Math.cos(a) * rr + Math.cos(pa) * SIDE_OFF * side, y: Math.sin(a) * rr + Math.sin(pa) * SIDE_OFF * side, links: [] };
    SKILLS.push(n); byId[n.id] = n;
  });
  // 열쇠 칸: 대각선 네 귀퉁이 (각 열쇠는 이웃한 두 가지의 깊이 6 옆칸과 이어진다)
  const KEYS = [
    { id: 'key_1', angle: -45, a: 'corn_A6', b: 'peg_B6' },
    { id: 'key_2', angle: 45, a: 'peg_A6', b: 'pan_B6' },
    { id: 'key_3', angle: 135, a: 'cust_A6', b: 'shop_B6' },
    { id: 'key_4', angle: 225, a: 'shop_A6', b: 'corn_B6' }
  ];
  KEYS.forEach(k => {
    const n = { id: k.id, br: 'key', slot: 'K', name: '열쇠 — 새 상영관', icon: '🔑', eff: 'key', val: 1, depth: 8,
      x: Math.cos(rad(k.angle)) * 7.1, y: Math.sin(rad(k.angle)) * 7.1, links: [] };
    SKILLS.push(n); byId[n.id] = n;
  });
  function link(a, b, kind) {
    const A = byId[a], B = byId[b];
    if (!A || !B || A.links.indexOf(b) >= 0) return;
    A.links.push(b); B.links.push(a);
    LINKS.push({ a, b, kind: kind || 'main' });
  }
  const LINKS = [];
  BRANCHES.forEach((b, bi) => {
    const p = b.key + '_';
    link('start', p + 'M1');
    for (let d = 1; d < 7; d++) link(p + 'M' + d, p + 'M' + (d + 1));
    link(p + 'A2', p + 'M2'); link(p + 'B3', p + 'M3'); link(p + 'A4', p + 'M4'); link(p + 'B5', p + 'M5');
    link(p + 'A6', p + 'M6'); link(p + 'B6', p + 'M6');
    link(p + 'A4', p + 'A2', 'side'); link(p + 'A6', p + 'A4', 'side'); link(p + 'B5', p + 'B3', 'side'); link(p + 'B6', p + 'B5', 'side');
    // 그물: 이웃 가지의 옆칸끼리 잇는다
    const nb = BRANCHES[(bi + 1) % BRANCHES.length].key + '_';
    link(p + 'A4', nb + 'B5', 'web');
  });
  KEYS.forEach(k => { link(k.id, k.a, 'key'); link(k.id, k.b, 'key'); });
  link('pan_A6', 'cust_B6', 'web');

  function costOf(n, keysOwned) {
    if (n.eff === 'key') return KEY_COST[Math.min(KEY_COST.length - 1, keysOwned || 0)];
    return COST[n.depth] || 0;
  }
  function descOf(n) {
    const v = n.val;
    switch (n.eff) {
      case 'corn': return '쏟는 옥수수가 ' + v + '알 늘어요.';
      case 'gold': return '쏟는 옥수수가 ' + v + '% 확률로 황금 옥수수(캐러멜 팝콘, 팝콘 5개 몫)가 돼요.';
      case 'x2': return '두 배 못(×2)이 ' + v + '개 더 박혀요. 닿은 옥수수가 2알로 갈라져요.';
      case 'x3': return '세 배 못(×3)이 하나 더 박혀요. 닿은 옥수수가 3알로 갈라져요.';
      case 'gpeg': return '황금 못(★)이 하나 더 박혀요. 닿은 옥수수가 황금 옥수수가 돼요.';
      case 'rows': return '못 판에 줄이 하나 더 생겨 더 많이 튕겨요.';
      case 'pan': return '프라이팬이 ' + v + 'px 넓어져요.';
      case 'rim': return '프라이팬 양쪽 가장자리에 받침이 생겨, 살짝 빗나간 알을 한 번 튕겨 넣어요.';
      case 'rimw': return '가장자리 받침이 ' + v + 'px 넓어져요.';
      case 'pan2': return '프라이팬이 둘이 돼요. 두 팬이 판을 더 넓게 받아요.';
      case 'cust': return '줄 서는 손님이 ' + v + '명 늘어요.';
      case 'price': return '손님이 내는 팝콘 값이 ' + v + '% 올라요.';
      case 'tip': return '손님이 ' + v + '% 확률로 팁을 더 줘요.';
      case 'vip': return '많이 사고(10~14개) 두 배로 내는 VIP 손님이 매 판 줄 끝에 와요.';
      case 'bonus': return '판이 끝날 때마다 동전 ' + v + '개를 더 받아요.';
      case 'sold': return '매진 보너스가 ' + v + '% 커져요.';
      case 'repour': return v === 50 ? '한 판에 한 번, 쏟은 옥수수의 절반을 한 번 더 쏟아요.' : '다시 쏟을 때 절반 대신 3/4 을 쏟아요.';
      case 'key': return '열면 새 상영관이 열려요. 배경·못 판 모양·손님이 바뀌고 손님이 더 많이 내요.';
      default: return '매점의 시작 칸이에요.';
    }
  }

  // ---------- 상영관 5 ----------
  // 못 판 모양: even 짝수 줄 못 수, odd 홀수 줄 못 수, wave 줄마다 좌우 물결(px), shift 줄마다 엇갈림(px)
  const THEATERS = [
    { n: 1, name: '1관 동네 매점', shape: { even: 8, odd: 7, wave: 0, shift: 0 }, pay: 1, extra: 0 },
    { n: 2, name: '2관 물결 상영관', shape: { even: 8, odd: 7, wave: 9, shift: 0 }, pay: 1.5, extra: 2 },
    { n: 3, name: '3관 넓은 틈 상영관', shape: { even: 7, odd: 6, wave: 0, shift: 0 }, pay: 2, extra: 4 },
    { n: 4, name: '4관 촘촘 상영관', shape: { even: 9, odd: 8, wave: 0, shift: 0 }, pay: 2.5, extra: 6 },
    { n: 5, name: '5관 별빛 상영관', shape: { even: 8, odd: 7, wave: 5, shift: 7 }, pay: 3, extra: 8 }
  ];

  // ---------- 손님 24 (상영관마다 다른 손님 다섯 무리) + VIP ----------
  const CUSTOMERS = [
    ['꼬마 관객', '🧒', 1], ['할머니', '👵', 1], ['할아버지', '👴', 1], ['학생', '👦', 1], ['회사원', '🧔', 1],
    ['데이트 손님', '👩', 2], ['영화 동아리', '🧑', 2], ['수다쟁이', '👧', 2], ['평론가', '🧐', 2], ['감독 지망생', '🤓', 2],
    ['배고픈 손님', '😋', 3], ['들뜬 손님', '🤩', 3], ['공포 영화 팬', '😱', 3], ['졸린 손님', '😪', 3], ['선글라스 손님', '😎', 3],
    ['모자 손님', '🤠', 4], ['노래꾼', '🎤', 4], ['로봇 옷 손님', '🤖', 4], ['외계인 옷 손님', '👽', 4], ['아기 엄마', '👩‍🍼', 4],
    ['곰 탈 손님', '🐻', 5], ['고양이 탈 손님', '🐱', 5], ['여우 탈 손님', '🦊', 5], ['펭귄 탈 손님', '🐧', 5]
  ].map((r, i) => ({ id: 'c' + (i + 1), name: r[0], face: r[1], hall: r[2] }));
  const VIP = { id: 'vip', name: 'VIP 손님', face: '🤵', hall: 0 };

  // ---------- 상영작 20 (화면 위 간판, 판마다 바뀐다) ----------
  const FILMS = [
    '달빛 우체부', '구름 위 고래', '여름밤의 로봇', '팝콘 행성', '마지막 기차', '고양이 탐정', '용과 우산', '별을 세는 아이',
    '바닷속 도서관', '시간 여행 빵집', '눈사람의 여름', '숲의 왕관', '안개 마을', '종이비행기', '꿈꾸는 등대', '거꾸로 시계',
    '사막의 정원', '하늘 자전거', '작은 영웅들', '오로라 너머'
  ];

  // ---------- 손님 말 40 (받았을 때 20 · 품절로 돌아갈 때 20) ----------
  const HAPPY = ['고소해요!', '바삭바삭!', '최고예요!', '딱 좋아요', '냄새 좋다', '영화 볼 맛 나요', '따끈따끈!', '또 올게요', '푸짐해요', '감사해요!',
    '이거지!', '반짝반짝', '팡팡 맛!', '행복해요', '버터 향!', '한 통 더?', '친구도 데려올게요', '완벽해요', '맛있겠다', '야호!'];
  const SAD = ['아쉽다…', '다음엔 꼭!', '품절이라니', '내일 올게요', '힝…', '조금만 빨리 올걸', '줄이 길었네', '또 올게요…', '배고파요', '다음 판에!',
    '괜찮아요', '아까비', '헉, 다 팔렸네', '빈손이네', '영화만 볼게요', '아이참', '기다릴게요', '팝콘 없이…', '꼭 남겨 줘요', '흑흑'];

  // ---------- 업적 24 — key 는 기록 이름, best 면 한 번 최고, 아니면 누적 ----------
  const ACHS = [
    ['a01', '첫 팝콘', '팝콘을 처음 만든다', 'popcorn', 1],
    ['a02', '첫 손님', '손님에게 처음 팝콘을 준다', 'served', 1],
    ['a03', '톡!', '옥수수를 처음 갈라 본다', 'splits', 1],
    ['a04', '매진!', '줄 선 손님 모두에게 준다', 'sellouts', 1],
    ['a05', '첫 스킬', '스킬 칸을 처음 산다', 'nodes', 1],
    ['a06', '스킬 10칸', '스킬 칸 10개를 산다', 'nodes', 10],
    ['a07', '스킬 30칸', '스킬 칸 30개를 산다', 'nodes', 30],
    ['a08', '스킬 60칸', '스킬 칸 60개를 산다', 'nodes', 60],
    ['a09', '새 상영관', '열쇠로 새 상영관을 연다', 'keys', 1],
    ['a10', '상영관 다섯', '상영관 다섯을 모두 연다', 'keys', 4],
    ['a11', '캐러멜 장인', '캐러멜 팝콘 30개', 'caramel', 30],
    ['a12', '팝콘 산', '팝콘 1000개', 'popcorn', 1000],
    ['a13', '단골 매점', '손님 100명에게 준다', 'served', 100],
    ['a14', '세 갈래', '세 배 못으로 갈라 본다', 'triple', 1],
    ['a15', '한 판 50', '한 판에 팝콘 50개', 'round', 50, true],
    ['a16', '한 판 150', '한 판에 팝콘 150개', 'round', 150, true],
    ['a17', '부자 매점', '동전 500개 모으기', 'coins', 500],
    ['a18', '큰손', '동전 3000개 모으기', 'coins', 3000],
    ['a19', '목표 5연속', '목표를 5판 이어서 채운다', 'streak', 5, true],
    ['a20', '목표 15연속', '목표를 15판 이어서 채운다', 'streak', 15, true],
    ['a21', '팁 부자', '팁 30번 받기', 'tips', 30],
    ['a22', 'VIP 대접', 'VIP 손님 10명에게 준다', 'vips', 10],
    ['a23', '다시 쏟기', '다시 쏟기를 처음 한다', 'repours', 1],
    ['a24', '스무 판', '스무 판 하기', 'rounds', 20]
  ].map(r => ({ id: r[0], name: r[1], desc: r[2], key: r[3], need: r[4], best: !!r[5] }));

  const SETTINGS = [
    { key: 'sound', name: '소리', def: true },
    { key: 'vibe', name: '진동', def: true },
    { key: 'shake', name: '화면 흔들림', def: true },
    { key: 'reduce', name: '움직임 줄이기', def: false },
    { key: 'big', name: '큰 글자', def: false },
    { key: 'guide', name: '손님 숫자 크게', def: false }
  ];

  const HELP = [
    ['한 판', '‘쏟아붓기!’를 누르면 위 옥수수 자루에서 옥수수가 한꺼번에 쏟아진다. 누를 것은 이것 하나뿐이다.'],
    ['못 판', '옥수수는 못에 튕기며 떨어진다. 두 배 못(×2)·세 배 못(×3)에 닿으면 갈라져 불어나고, 황금 못(★)은 황금 옥수수를 만든다.'],
    ['프라이팬', '맨 아래 프라이팬에 떨어진 옥수수만 잠깐 뒤 팡! 팝콘이 되어 아래 팝콘 통에 모인다. 밖으로 떨어진 옥수수는 굴러 사라진다.'],
    ['손님', '판이 끝나면 왼쪽 줄 맨 앞 손님부터 머리 위 숫자만큼 팝콘을 받아 가고 동전을 낸다. 모자라면 팝콘 품절! 남은 손님은 돌아간다(벌칙 없음).'],
    ['목표', '판마다 ‘목표 팝콘’이 있다. 지금 스킬로 보통 나오는 만큼보다 조금 낮게 정해진다. 이어서 채우면 연속 기록이 쌓인다.'],
    ['스킬 트리', '번 동전으로 스킬 칸을 산다. 이미 연 칸과 이어진 칸만 살 수 있다. 끌어서 움직이고, 두 손가락(또는 휠·＋−)으로 확대·축소한다.'],
    ['열쇠와 상영관', '네 귀퉁이 끝의 열쇠를 열면 새 상영관이 열린다. 못 판 모양과 손님이 바뀌고 손님이 더 많이 낸다.'],
    ['오늘의 도전', '시작 화면 ‘오늘 도전’. 날짜로 정해진 스킬·상영관·손님 줄·떨어지는 자리가 같은 판을 하루 한 번 쏟는다. 번 동전은 내 매점에 들어오고, 연속 기록과는 따로 센다.'],
    ['조작', '터치: 단추 누르기, 스킬 트리 끌기·두 손가락 확대. 키보드: 스페이스·엔터 쏟아붓기/다음 판, T 스킬 트리, 방향키·＋− 트리 움직이기, P·Esc 멈춤.']
  ];

  window.DATA = { BRANCHES, SKILL_TABLE, SKILLS, SKILL: byId, LINKS, KEYS, COST, KEY_COST, costOf, descOf,
    THEATERS, CUSTOMERS, VIP, FILMS, HAPPY, SAD, ACHS, SETTINGS, HELP };
})();
