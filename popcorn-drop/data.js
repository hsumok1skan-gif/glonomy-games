/* Popcorn Drop (팝콘 팡팡) — 콘텐츠 데이터 */
(function () {
  'use strict';

  // 통 크기: S 작은 통 10개 · M 중간 25개 · L 큰 통 50개, 다 채우면 받는 영화 표 동전
  const TUBS = {
    S: { cap: 10, coin: 3, name: '작은 통' },
    M: { cap: 25, coin: 8, name: '중간 통' },
    L: { cap: 50, coin: 20, name: '큰 통' }
  };

  // 상영관 30: [한쪽 줄 수, 통 (왼쪽 위→아래, 오른쪽 위→아래 순서로 섞어 앉힘), 목표(다 채울 손님 수), 쥐구멍 수, 못 판 무늬 번호]
  const HALLS = [
    [3, 'SSSSSM', 2, 0, 0],
    [3, 'SSSSMM', 3, 1, 1],
    [4, 'SSSSSMMM', 3, 1, 2],
    [4, 'SSSSMMMM', 4, 2, 3],
    [4, 'SSSSMMML', 5, 2, 4],
    [5, 'SSSSMMMMML', 6, 3, 5],
    [5, 'SSSMMMMMLL', 6, 3, 6],
    [5, 'SSMMMMMMLL', 6, 3, 7],
    [6, 'SSSMMMMMMLLL', 6, 4, 8],
    [6, 'SSMMMMMMMLLL', 7, 4, 9],
    [6, 'SMMMMMMMMLLL', 7, 4, 10],
    [6, 'SMMMMMMMLLLL', 8, 5, 11],
    [7, 'SSMMMMMMMMLLLL', 8, 5, 12],
    [7, 'SMMMMMMMMMLLLL', 8, 5, 13],
    [7, 'SMMMMMMMMLLLLL', 9, 5, 14],
    [7, 'MMMMMMMMMLLLLL', 9, 6, 15],
    [7, 'MMMMMMMMLLLLLL', 10, 6, 16],
    [8, 'SSMMMMMMMMLLLLLL', 10, 6, 17],
    [8, 'SMMMMMMMMMLLLLLL', 10, 7, 18],
    [8, 'MMMMMMMMMMLLLLLL', 11, 7, 19],
    [8, 'MMMMMMMMMLLLLLLL', 11, 7, 20],
    [8, 'MMMMMMMMLLLLLLLL', 11, 8, 21],
    [8, 'SMMMMMMMLLLLLLLL', 12, 8, 22],
    [8, 'MMMMMMMLLLLLLLLL', 12, 8, 23],
    [8, 'MMMMMMLLLLLLLLLL', 12, 8, 0],
    [8, 'MMMMMLLLLLLLLLLL', 13, 9, 5],
    [8, 'MMMMLLLLLLLLLLLL', 13, 9, 10],
    [8, 'MMMLLLLLLLLLLLLL', 13, 9, 15],
    [8, 'MMLLLLLLLLLLLLLL', 14, 10, 20],
    [8, 'MLLLLLLLLLLLLLLL', 14, 10, 23]
  ].map((r, i) => ({ n: i + 1, rows: r[0], tubs: r[1], goal: r[2], rats: r[3], layout: r[4] }));

  // 못 판 무늬 24: 두 배·네 배·황금 못 수와 놓일 곳(가운데 center·고르게 even·위 top·아래 low·양옆 wide)
  const LAYOUTS = [
    { id: 'L01', name: '첫 상영', x2: 5, x4: 0, gold: 0, zone: 'center' },
    { id: 'L02', name: '나란히', x2: 5, x4: 0, gold: 0, zone: 'even' },
    { id: 'L03', name: '위쪽 바람', x2: 5, x4: 1, gold: 0, zone: 'top' },
    { id: 'L04', name: '두 줄 기차', x2: 6, x4: 0, gold: 0, zone: 'even' },
    { id: 'L05', name: '한가운데', x2: 4, x4: 1, gold: 1, zone: 'center' },
    { id: 'L06', name: '아랫마을', x2: 5, x4: 1, gold: 0, zone: 'low' },
    { id: 'L07', name: '양날개', x2: 6, x4: 0, gold: 1, zone: 'wide' },
    { id: 'L08', name: '별빛', x2: 5, x4: 1, gold: 1, zone: 'even' },
    { id: 'L09', name: '눈사태', x2: 6, x4: 1, gold: 0, zone: 'top' },
    { id: 'L10', name: '금가루', x2: 4, x4: 0, gold: 2, zone: 'center' },
    { id: 'L11', name: '사다리', x2: 6, x4: 1, gold: 1, zone: 'even' },
    { id: 'L12', name: '깊은 밤', x2: 5, x4: 1, gold: 1, zone: 'low' },
    { id: 'L13', name: '쌍둥이 길', x2: 7, x4: 0, gold: 1, zone: 'wide' },
    { id: 'L14', name: '불꽃놀이', x2: 5, x4: 2, gold: 1, zone: 'center' },
    { id: 'L15', name: '모래시계', x2: 6, x4: 1, gold: 1, zone: 'top' },
    { id: 'L16', name: '팡팡 거리', x2: 6, x4: 1, gold: 2, zone: 'even' },
    { id: 'L17', name: '바닥 축제', x2: 6, x4: 2, gold: 1, zone: 'low' },
    { id: 'L18', name: '넓은 객석', x2: 7, x4: 1, gold: 1, zone: 'wide' },
    { id: 'L19', name: '황금 시사회', x2: 5, x4: 1, gold: 3, zone: 'center' },
    { id: 'L20', name: '바둑판', x2: 7, x4: 1, gold: 2, zone: 'even' },
    { id: 'L21', name: '폭포', x2: 7, x4: 2, gold: 1, zone: 'top' },
    { id: 'L22', name: '심야 상영', x2: 6, x4: 2, gold: 2, zone: 'low' },
    { id: 'L23', name: '날갯짓', x2: 8, x4: 1, gold: 2, zone: 'wide' },
    { id: 'L24', name: '대축제', x2: 8, x4: 2, gold: 2, zone: 'center' }
  ];

  // 특수 못 종류
  const PEG_KINDS = {
    n: { name: '보통 못', desc: '튕기기만 한다' },
    x2: { name: '두 배 못', desc: '닿은 알이 2개로 갈라진다(한 알당 한 번)', price: 30 },
    x4: { name: '네 배 못', desc: '닿은 알이 4개로 갈라진다(한 알당 한 번)', price: 90 },
    gold: { name: '황금 못', desc: '알이 황금 옥수수가 된다 → 캐러멜 팝콘(5개 몫)', price: 60 },
    rat: { name: '쥐구멍', desc: '빠진 알은 사라진다' }
  };

  // 영화관 키우기 20 단계
  const UPGRADES = {
    corn: { name: '옥수수 통 늘리기', unit: '알', levels: [
      { add: 15, cost: 20 }, { add: 15, cost: 35 }, { add: 15, cost: 55 }, { add: 20, cost: 80 },
      { add: 20, cost: 110 }, { add: 20, cost: 150 }, { add: 25, cost: 200 }, { add: 25, cost: 260 }] },
    pot: { name: '냄비 크게', unit: '알', levels: [
      { add: 25, cost: 15 }, { add: 25, cost: 30 }, { add: 25, cost: 50 }, { add: 25, cost: 75 },
      { add: 25, cost: 100 }, { add: 25, cost: 130 }, { add: 25, cost: 170 }, { add: 25, cost: 220 }] },
    fire: { name: '불 하나 더 켜기', unit: '개', levels: [{ add: 1, cost: 120 }] },
    rat: { name: '쥐구멍 막기', unit: '개', levels: [{ add: 1, cost: 25 }, { add: 1, cost: 50 }, { add: 1, cost: 90 }] }
  };

  // 손님 24
  const CUSTOMERS = [
    ['c01', '꼬마 관객', '🧒', 0], ['c02', '할머니', '👵', 1], ['c03', '할아버지', '👴', 1], ['c04', '영화 동아리', '🧑', 0],
    ['c05', '데이트 손님', '👩', 1], ['c06', '회사원', '🧔', 0], ['c07', '학생', '👦', 0], ['c08', '수다쟁이', '👧', 0],
    ['c09', '평론가', '🧐', 2], ['c10', '감독 지망생', '🤓', 1], ['c11', '아기 엄마', '👩‍🍼', 1], ['c12', '배고픈 손님', '😋', 2],
    ['c13', '졸린 손님', '😪', 0], ['c14', '들뜬 손님', '🤩', 1], ['c15', '공포 영화 팬', '😱', 1], ['c16', '눈물 많은 손님', '🥲', 1],
    ['c17', '미소 손님', '😊', 0], ['c18', '선글라스 손님', '😎', 2], ['c19', '모자 손님', '🤠', 1], ['c20', '노래꾼', '🎤', 1],
    ['c21', '로봇 옷 손님', '🤖', 2], ['c22', '외계인 옷 손님', '👽', 2], ['c23', '곰 탈 손님', '🐻', 1], ['c24', '고양이 탈 손님', '🐱', 1]
  ].map(r => ({ id: r[0], name: r[1], face: r[2], tip: r[3] }));

  // 꾸미기 36 (객석 12 · 의자 12 · 스크린 12) — 겉모습만 바뀐다
  const DECO = [];
  const DECO_SRC = {
    hall: ['짙은 남색', '자줏빛 벽', '숲 속 극장', '별빛 천장', '붉은 벨벳', '바다 밑', '눈 오는 밤', '사막 극장', '단풍 극장', '네온 거리', '구름 위', '우주 정거장'],
    seat: ['빨간 의자', '파란 의자', '초록 의자', '노란 의자', '보라 의자', '분홍 의자', '나무 의자', '구름 쿠션', '왕좌', '빈백', '흔들의자', '금빛 의자'],
    screen: ['흰 스크린', '노을빛', '푸른 빛', '초록 빛', '분홍 빛', '황금 빛', '무지개', '별 무늬', '오로라', '바다 물결', '불꽃', '은하수']
  };
  // 색은 style.css :root 의 --deco-종류-n 변수 이름 (ui.js 가 그 값을 읽는다)
  ['hall', 'seat', 'screen'].forEach(kind => {
    DECO_SRC[kind].forEach((name, i) => {
      DECO.push({ id: kind + (i + 1), kind, name, color: 'deco-' + kind + '-' + (i + 1), cost: i === 0 ? 0 : 20 + i * 15 });
    });
  });
  const DECO_KINDS = { hall: '객석', seat: '의자', screen: '스크린' };

  // 상영작 20 — 상영관마다 걸리는 영화 제목(지은 이름)
  const FILMS = [
    '달빛 우체부', '구름 위 고래', '여름밤의 로봇', '팝콘 행성', '마지막 기차', '고양이 탐정', '용과 우산', '별을 세는 아이',
    '바닷속 도서관', '시간 여행 빵집', '눈사람의 여름', '숲의 왕관', '안개 마을', '종이비행기', '꿈꾸는 등대', '거꾸로 시계',
    '사막의 정원', '하늘 자전거', '작은 영웅들', '오로라 너머'
  ];

  // 오늘의 상영 규칙 12 — 날짜마다 하나
  const DAILY_MODS = [
    { id: 'd01', name: '두 배 잔치', desc: '두 배 못 +3', x2: 3 },
    { id: 'd02', name: '네 배의 밤', desc: '네 배 못 +1', x4: 1 },
    { id: 'd03', name: '황금 시사회', desc: '황금 못 +2', gold: 2 },
    { id: 'd04', name: '쥐들의 소풍', desc: '쥐구멍 +2', rats: 2 },
    { id: 'd05', name: '넉넉한 통', desc: '옥수수 +30알', corn: 30 },
    { id: 'd06', name: '빠듯한 통', desc: '옥수수 -20알, 두 배 못 +2', corn: -20, x2: 2 },
    { id: 'd07', name: '큰 냄비', desc: '냄비 최대 +50알', pot: 50 },
    { id: 'd08', name: '불 셋', desc: '불을 3개까지', fire: 1 },
    { id: 'd09', name: '짧은 예고편', desc: '시계 75초, 두 배 못 +2', time: -15, x2: 2 },
    { id: 'd10', name: '긴 광고 시간', desc: '시계 105초', time: 15 },
    { id: 'd11', name: '꽉 찬 객석', desc: '줄 +1', rows: 1 },
    { id: 'd12', name: '조용한 밤', desc: '쥐구멍 없음', rats: -99 }
  ];

  // 업적 24 — key 는 기록 이름, best 면 한 판 최고, 아니면 누적
  const ACHS = [
    ['a01', '첫 팝콘', '팝콘을 처음 튀긴다', 'popped', 1],
    ['a02', '첫 손님', '손님 통을 처음 다 채운다', 'filled', 1],
    ['a03', '톡!', '옥수수를 처음 갈라 본다', 'splits', 1],
    ['a04', '대폭발!', '한 번에 50알 이상 터뜨린다', 'mega', 1],
    ['a05', '매진', '모든 손님 통을 채운다', 'soldout', 1],
    ['a06', '상영관 3', '상영관 3을 연다', 'hall', 3, true],
    ['a07', '상영관 5', '상영관 5를 연다', 'hall', 5, true],
    ['a08', '상영관 10', '상영관 10을 연다', 'hall', 10, true],
    ['a09', '상영관 20', '상영관 20을 연다', 'hall', 20, true],
    ['a10', '상영관 30', '상영관 30을 연다', 'hall', 30, true],
    ['a11', '캐러멜 장인', '캐러멜 팝콘 50개', 'caramel', 50],
    ['a12', '팝콘 산', '팝콘 1000개', 'popped', 1000],
    ['a13', '단골 극장', '손님 100명 채우기', 'filled', 100],
    ['a14', '네 갈래', '네 배 못으로 갈라 본다', 'quad', 1],
    ['a15', '한 방', '한 번에 100알 이상 터뜨린다', 'biggest', 100, true],
    ['a16', '줄줄이', '1초 안에 통 4개 연달아 채우기', 'chain', 4, true],
    ['a17', '부자 극장', '동전 500개 모으기', 'coins', 500],
    ['a18', '큰손', '동전 2000개 모으기', 'coins', 2000],
    ['a19', '쥐 친구', '쥐구멍에 알 30개', 'ratted', 30],
    ['a20', '탄내', '탄 옥수수 20개', 'burnt', 20],
    ['a21', '꾸미기', '꾸미기 물건 3개 사기', 'decos', 3],
    ['a22', '못 장인', '특수 못 10개 끼우기', 'placed', 10],
    ['a23', '오늘의 상영', '오늘의 상영 처음 하기', 'daily', 1],
    ['a24', '열 번 상영', '열 번 상영하기', 'shows', 10]
  ].map(r => ({ id: r[0], name: r[1], desc: r[2], key: r[3], need: r[4], best: !!r[5] }));

  const SETTINGS = [
    { key: 'sound', name: '소리', def: true },
    { key: 'vibe', name: '진동', def: true },
    { key: 'shake', name: '화면 흔들림', def: true },
    { key: 'reduce', name: '움직임 줄이기', def: false },
    { key: 'big', name: '큰 글자', def: false },
    { key: 'guide', name: '냄비 숫자 크게', def: false }
  ];

  const HELP = [
    ['목표', '상영이 시작되기 전(90초)에 객석 손님들의 팝콘 통을 채운다. 목표만큼 채우면 다음 상영관이 열린다.'],
    ['옥수수 떨구기', '화면을 누른 채 좌우로 끌면 깔때기가 따라오고, 누르는 동안 1초에 4알씩 떨어진다. 옥수수 통이 비면 끝.'],
    ['특수 못', '두 배 못(×2)·네 배 못(×4)은 알을 갈라 늘린다. 황금 못은 캐러멜 팝콘(5개 몫)을 만든다. 가장자리 쥐구멍에 빠지면 사라진다.'],
    ['냄비와 불', '불 꺼진 냄비에는 알이 쌓인다(최대 200). 버너 단추로 불을 켜면 2초 뒤 팡팡 터진다. 50알 이상이면 대폭발! 불은 한 번에 2개까지.'],
    ['조심', '불을 켠 채 냄비가 6초 비면 냄비가 탄다. 그때 들어간 알은 탄 옥수수가 되어 팝콘이 되지 않는다. 불을 끄면 멈춘다.'],
    ['손님', '튀어 오른 팝콘이 양옆 객석으로 떨어져 통에 들어간다. 위쪽 통부터 찬다. 통이 차면 손님이 환호하고 영화 표 동전을 준다.'],
    ['영화관 키우기', '로비에서 동전으로 옥수수 통·냄비·불·특수 못·쥐구멍 막기·꾸미기를 산다. 동전·옥수수·못은 현금으로 팔지 않는다.'],
    ['조작', '터치: 누르고 끌기, 버너 단추. 키보드: ←→ 깔때기, 스페이스 누르는 동안 떨구기, 1~5 버너, P·Esc 멈춤.']
  ];

  window.DATA = { TUBS, HALLS, LAYOUTS, PEG_KINDS, UPGRADES, CUSTOMERS, DECO, DECO_KINDS, FILMS, DAILY_MODS, ACHS, SETTINGS, HELP };
})();
