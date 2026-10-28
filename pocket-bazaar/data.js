// Pocket Bazaar — 콘텐츠 데이터
// 물건 60 · 손님 30 · 부적 30 · 장날 사건 25 · 장날 10 · 가판대 4 · 업적 20 · 장터 일지 15
var DATA = {};

DATA.CATS = {
  food:    { name: '먹을거리', icon: '🍙', mark: '●', pair: 'drink' },
  drink:   { name: '마실거리', icon: '🍵', mark: '▲', pair: 'food' },
  cloth:   { name: '옷가지',   icon: '🧣', mark: '■', pair: 'trinket' },
  trinket: { name: '장신구',   icon: '💍', mark: '◆', pair: 'cloth' },
  toy:     { name: '장난감',   icon: '🪁', mark: '★', pair: 'tool' },
  tool:    { name: '살림 도구', icon: '🔨', mark: '✚', pair: 'toy' }
};
DATA.CAT_KEYS = ['food', 'drink', 'cloth', 'trinket', 'toy', 'tool'];

// 물건 꼬리표 — 진열 자리에 따라 값이 바뀐다
DATA.TAGS = {
  crowd: { name: '북적', desc: '이웃 물건 하나마다 값 +1' },
  lone:  { name: '외톨이', desc: '이웃이 하나도 없으면 값 두 배' },
  edge:  { name: '가장자리', desc: '진열대 가장자리 칸이면 값 +2' },
  center:{ name: '한가운데', desc: '가운데 줄(둘째 줄)이면 값 +2' },
  twin:  { name: '짝꿍', desc: '같은 물건이 이웃이면 값 두 배' },
  grow:  { name: '묵힘', desc: '진열대에서 하루 지날 때마다 값 +1' }
};

// [id, 이름, 그림, 갈래, 값, 신선(날, 0이면 안 상함), 꼬리표]
DATA.GOODS = [
  ['sweetpotato', '군고구마', '🍠', 'food', 2, 3, ''],
  ['riceball', '주먹밥', '🍙', 'food', 2, 2, ''],
  ['skewer', '떡꼬치', '🍡', 'food', 3, 2, 'crowd'],
  ['pancake', '꿀호떡', '🥞', 'food', 3, 2, ''],
  ['bun', '찐빵', '🥟', 'food', 3, 3, 'twin'],
  ['corn', '찰옥수수', '🌽', 'food', 2, 3, 'edge'],
  ['apple', '꿀사과', '🍎', 'food', 4, 4, ''],
  ['pie', '밤파이', '🥧', 'food', 5, 2, 'center'],
  ['cookie', '생강 과자', '🍪', 'food', 4, 5, 'lone'],
  ['honey', '벌꿀 단지', '🍯', 'food', 6, 0, 'grow'],

  ['sikhye', '식혜', '🥤', 'drink', 2, 2, ''],
  ['barley', '보리차', '🍵', 'drink', 2, 4, ''],
  ['yuja', '유자차', '🍋', 'drink', 3, 3, 'crowd'],
  ['milk', '우유', '🥛', 'drink', 3, 2, ''],
  ['jujube', '대추차', '🫖', 'drink', 4, 3, 'center'],
  ['flowertea', '꽃차', '🌼', 'drink', 4, 4, 'lone'],
  ['punch', '수정과', '🍹', 'drink', 3, 3, 'twin'],
  ['cocoa', '코코아', '☕', 'drink', 4, 2, 'edge'],
  ['lemonade', '레몬수', '🧃', 'drink', 2, 2, ''],
  ['plumjar', '매실청 병', '🍶', 'drink', 6, 0, 'grow'],

  ['mitten', '털장갑', '🧤', 'cloth', 3, 0, ''],
  ['scarf', '목도리', '🧣', 'cloth', 4, 0, 'crowd'],
  ['socks', '양말', '🧦', 'cloth', 2, 0, 'twin'],
  ['yarn', '털실 뭉치', '🧶', 'cloth', 2, 0, ''],
  ['cap', '챙모자', '🧢', 'cloth', 3, 0, 'edge'],
  ['robe', '무명 겉옷', '👘', 'cloth', 6, 0, 'center'],
  ['boots', '장화', '🥾', 'cloth', 5, 0, ''],
  ['umbrella', '우산', '☂️', 'cloth', 4, 0, 'lone'],
  ['wrap', '비단 보자기', '🎁', 'cloth', 6, 0, 'grow'],
  ['slipper', '털신', '🥿', 'cloth', 3, 0, ''],

  ['yoyo', '요요', '🪀', 'toy', 2, 0, ''],
  ['kite', '방패연', '🪁', 'toy', 3, 0, 'edge'],
  ['ball', '고무공', '⚽', 'toy', 3, 0, ''],
  ['bear', '곰 인형', '🧸', 'toy', 5, 0, 'lone'],
  ['cards', '딱지', '🃏', 'toy', 2, 0, 'twin'],
  ['boat', '종이배', '⛵', 'toy', 2, 0, ''],
  ['balloon', '풍선', '🎈', 'toy', 2, 0, 'crowd'],
  ['puzzle', '조각 맞추기', '🧩', 'toy', 4, 0, 'center'],
  ['chime', '풍경', '🎐', 'toy', 3, 0, ''],
  ['robot', '태엽 로봇', '🤖', 'toy', 6, 0, 'grow'],

  ['hammer', '망치', '🔨', 'tool', 3, 0, ''],
  ['scissors', '가위', '✂️', 'tool', 2, 0, ''],
  ['broom', '싸리비', '🧹', 'tool', 3, 0, 'edge'],
  ['lamp', '등잔', '🪔', 'tool', 4, 0, 'lone'],
  ['basket', '대바구니', '🧺', 'tool', 3, 0, 'crowd'],
  ['lock', '자물쇠', '🔒', 'tool', 4, 0, ''],
  ['saw', '톱', '🪚', 'tool', 5, 0, 'center'],
  ['ruler', '줄자', '📏', 'tool', 2, 0, 'twin'],
  ['bucket', '양동이', '🪣', 'tool', 3, 0, ''],
  ['compass', '나침반', '🧭', 'tool', 6, 0, 'grow'],

  ['ring', '은반지', '💍', 'trinket', 5, 0, ''],
  ['pin', '머리핀', '🎗️', 'trinket', 2, 0, 'twin'],
  ['shell', '조개 목걸이', '🐚', 'trinket', 3, 0, 'edge'],
  ['mirror', '손거울', '🪞', 'trinket', 3, 0, 'lone'],
  ['bell', '방울', '🔔', 'trinket', 2, 0, 'crowd'],
  ['feather', '깃털 꽂이', '🪶', 'trinket', 3, 0, ''],
  ['fan', '쥘부채', '🪭', 'trinket', 4, 0, 'center'],
  ['marble', '유리구슬', '🫧', 'trinket', 2, 0, ''],
  ['brooch', '별 브로치', '🌟', 'trinket', 4, 0, ''],
  ['norigae', '옥 노리개', '📿', 'trinket', 6, 0, 'grow']
].map(function (g) {
  return { id: g[0], name: g[1], icon: g[2], cat: g[3], base: g[4], fresh: g[5], tag: g[6] };
});

// 손님 [id, 이름, 그림, 바라는 갈래(any = 아무거나), 값 배율, 팔면 평판, 나오는 날, 한 줄]
DATA.CUSTOMERS = [
  ['kid', '동네 아이', '🧒', 'toy', 1.0, 0, 1, '용돈을 꼭 쥐고 왔다'],
  ['student', '학생', '🧑‍🎓', 'food', 1.0, 0, 1, '학교 끝나고 배가 고프다'],
  ['grandma', '할머니', '👵', 'cloth', 1.1, 0, 1, '손주 줄 것을 찾는다'],
  ['grandpa', '할아버지', '👴', 'drink', 1.1, 0, 1, '따뜻한 한 잔이 좋다'],
  ['carpenter', '목수', '🧑‍🔧', 'tool', 1.2, 0, 1, '연장이 하나 모자라다'],
  ['dandy', '멋쟁이', '💃', 'trinket', 1.3, 0, 1, '오늘 저녁 잔치에 간다'],
  ['traveler', '나그네', '🧳', 'any', 1.0, 0, 1, '무엇이든 하나 사 간다'],
  ['farmer', '농부', '🧑‍🌾', 'food', 1.1, 0, 1, '밭일 사이 새참거리'],
  ['painter', '화가', '🧑‍🎨', 'trinket', 1.2, 0, 2, '고운 빛깔을 좋아한다'],
  ['chef', '요리사', '🧑‍🍳', 'food', 1.3, 0, 3, '좋은 재료에는 돈을 아끼지 않는다'],
  ['collector', '수집가', '🧐', 'any', 1.5, 0, 4, '흔하지 않은 것을 찾는다'],
  ['haggler', '흥정꾼', '🤑', 'any', 0.7, 1, 1, '깎아 주면 소문을 내 준다'],
  ['regular', '단골', '🙂', 'any', 1.0, 1, 2, '늘 이 가판대에 들른다'],
  ['courier', '자전거 배달꾼', '🚲', 'drink', 1.2, 0, 2, '목이 마르다'],
  ['teacher', '선생님', '🧑‍🏫', 'tool', 1.1, 0, 2, '교실에 쓸 것을 고른다'],
  ['twins', '쌍둥이', '👯', 'toy', 1.4, 0, 3, '둘이 똑같은 걸 원한다'],
  ['bride', '새색시', '👰', 'cloth', 1.4, 0, 4, '혼수를 장만한다'],
  ['doctor', '의원', '🧑‍⚕️', 'drink', 1.3, 0, 4, '몸에 좋은 차를 찾는다'],
  ['fisher', '어부', '🎣', 'tool', 1.3, 0, 3, '배에 쓸 것을 산다'],
  ['singer', '소리꾼', '🎤', 'drink', 1.2, 0, 2, '목을 축여야 한다'],
  ['girl', '꼬마 손님', '👧', 'food', 0.9, 0, 1, '달콤한 냄새를 따라왔다'],
  ['butler', '부잣집 집사', '🎩', 'trinket', 1.8, 0, 6, '값은 묻지 않는다'],
  ['watch', '장터 지기', '🪧', 'any', 1.0, 2, 5, '장사 잘하는 가판대를 적어 간다'],
  ['smith', '대장장이', '⚒️', 'tool', 1.5, 0, 5, '쓸 만한 연장만 산다'],
  ['tailor', '재봉사', '🪡', 'cloth', 1.5, 0, 5, '좋은 천을 알아본다'],
  ['candy', '과자 장수', '🍬', 'food', 1.4, 0, 5, '다른 가판대 맛을 본다'],
  ['teahouse', '찻집 주인', '🏮', 'drink', 1.6, 0, 6, '가게에 둘 차를 찾는다'],
  ['toyseller', '장난감 상인', '🎪', 'toy', 1.6, 0, 6, '되팔 물건을 고른다'],
  ['neighbor', '이웃 장사꾼', '🛒', 'any', 1.2, 0, 2, '모자란 물건을 채운다'],
  ['nightguest', '밤손님', '🌙', 'any', 2.0, 0, 8, '장이 파할 무렵 큰돈을 쓴다']
].map(function (c) {
  return { id: c[0], name: c[1], icon: c[2], wish: c[3], mult: c[4], rep: c[5], minDay: c[6], line: c[7] };
});

// 부적 — fx 는 Game.buildStats 가 더한다
DATA.CHARMS = [
  { id: 'saucer', name: '찻잔 받침', icon: '🫓', rar: 1, desc: '짝 갈래 이웃 보너스 +25%', fx: { pair: 0.25 } },
  { id: 'twine', name: '노끈 다발', icon: '🪢', rar: 1, desc: '같은 갈래 이웃 보너스 +15%', fx: { same: 0.15 } },
  { id: 'awning', name: '넓은 차양', icon: '⛱️', rar: 1, desc: '날마다 손님 +1', fx: { cust: 1 } },
  { id: 'salt', name: '소금 단지', icon: '🧂', rar: 1, desc: '먹을거리·마실거리가 하루 더 버틴다', fx: { fresh: 1 } },
  { id: 'abacus', name: '흥정 주판', icon: '🧮', rar: 1, desc: '파는 물건마다 값 +1', fx: { flat: 1 } },
  { id: 'sack', name: '큰 자루', icon: '👝', rar: 1, desc: '날마다 물건을 한 장 더 받는다', fx: { draw: 1 } },
  { id: 'stamp', name: '장터 도장', icon: '🏷️', rar: 2, desc: '자릿세 10% 덜 낸다', fx: { rentMul: -0.1 } },
  { id: 'steamer', name: '대나무 찜기', icon: '🍲', rar: 1, desc: '먹을거리 값 +20%', fx: { cat: { food: 0.2 } } },
  { id: 'kettle', name: '구리 주전자', icon: '🍯', rar: 1, desc: '마실거리 값 +20%', fx: { cat: { drink: 0.2 } } },
  { id: 'needle', name: '은바늘', icon: '🪡', rar: 1, desc: '옷가지 값 +20%', fx: { cat: { cloth: 0.2 } } },
  { id: 'polish', name: '광내는 천', icon: '🧽', rar: 1, desc: '장신구 값 +20%', fx: { cat: { trinket: 0.2 } } },
  { id: 'whistle', name: '호루라기', icon: '📯', rar: 1, desc: '장난감 값 +20%', fx: { cat: { toy: 0.2 } } },
  { id: 'oil', name: '기름병', icon: '🛢️', rar: 1, desc: '살림 도구 값 +20%', fx: { cat: { tool: 0.2 } } },
  { id: 'lantern', name: '홀로 등', icon: '🏮', rar: 2, desc: '외톨이 물건이 세 배', fx: { lone: 1 } },
  { id: 'frame', name: '나무 틀', icon: '🖼️', rar: 2, desc: '가장자리·한가운데 꼬리표 +2 더', fx: { edge: 2, center: 2 } },
  { id: 'mirrorpair', name: '쌍거울', icon: '🪞', rar: 2, desc: '짝꿍 물건이 세 배', fx: { twin: 1 } },
  { id: 'crate', name: '묵은 궤짝', icon: '📦', rar: 2, desc: '묵힘 물건이 하루에 +2', fx: { grow: 1 } },
  { id: 'drum', name: '작은 북', icon: '🥁', rar: 2, desc: '북적 물건이 이웃마다 +2', fx: { crowd: 1 } },
  { id: 'purse', name: '복주머니', icon: '👛', rar: 2, desc: '장날 끝에 남은 동전 10마다 +1', fx: { interest: 1 } },
  { id: 'coupon', name: '도매 쪽지', icon: '🧾', rar: 1, desc: '장보기 값 1 덜 냄', fx: { cheap: 1 } },
  { id: 'smile', name: '웃는 얼굴', icon: '😊', rar: 1, desc: '평판 +2 (바로)', fx: { repNow: 2 } },
  { id: 'sign', name: '큰 간판', icon: '🪧', rar: 2, desc: '아무거나 손님이 값 +30%', fx: { any: 0.3 } },
  { id: 'scale', name: '정직한 저울', icon: '⚖️', rar: 2, desc: '바라는 대로 팔면 3번째마다 평판 +1', fx: { repEvery: 3 } },
  { id: 'icebox', name: '얼음 상자', icon: '🧊', rar: 2, desc: '상한 물건이 동전 2를 돌려준다', fx: { refund: 2 } },
  { id: 'apron', name: '두툼한 앞치마', icon: '🦺', rar: 1, desc: '안 놓은 물건이 다음 날까지 손에 남는다', fx: { keepHand: 1 } },
  { id: 'map', name: '도매상 지도', icon: '🗺️', rar: 2, desc: '장보기에 물건이 하나 더 나온다', fx: { offers: 1 } },
  { id: 'bellrope', name: '문간 방울', icon: '🔔', rar: 2, desc: '평판이 7 이상이면 손님 +1 더', fx: { highRep: 1 } },
  { id: 'cushion', name: '방석', icon: '🟫', rar: 1, desc: '손님을 그냥 보내도 평판이 덜 깎인다(2번에 1)', fx: { soft: 1 } },
  { id: 'goldleaf', name: '금박 종이', icon: '✨', rar: 3, desc: '모든 물건 값 +15%', fx: { all: 0.15 } },
  { id: 'twotone', name: '두 빛 천막', icon: '🎪', rar: 3, desc: '짝·같은 갈래 보너스 +20%씩', fx: { same: 0.2, pair: 0.2 } }
];

// 장날 사건
DATA.EVENTS = [
  { id: 'clear', name: '맑은 날', icon: '☀️', desc: '평소와 같다', fx: {} },
  { id: 'rain', name: '비 오는 날', icon: '🌧️', desc: '마실거리·옷가지 값 +30%, 손님 -1', fx: { cat: { drink: 0.3, cloth: 0.3 }, cust: -1 } },
  { id: 'festival', name: '마을 잔치', icon: '🎉', desc: '손님 +2, 장난감 값 +30%', fx: { cust: 2, cat: { toy: 0.3 } } },
  { id: 'cold', name: '찬바람', icon: '🌬️', desc: '옷가지 값 +50%', fx: { cat: { cloth: 0.5 } } },
  { id: 'heat', name: '불볕더위', icon: '🥵', desc: '마실거리 값 +50%, 먹을거리가 빨리 상한다', fx: { cat: { drink: 0.5 }, spoil: 1 } },
  { id: 'harvest', name: '추수 장', icon: '🌾', desc: '먹을거리 값 +40%', fx: { cat: { food: 0.4 } } },
  { id: 'wedding', name: '혼례 날', icon: '💐', desc: '장신구·옷가지 값 +30%', fx: { cat: { trinket: 0.3, cloth: 0.3 } } },
  { id: 'school', name: '방학 첫날', icon: '🎒', desc: '장난감 값 +40%, 손님 +1', fx: { cat: { toy: 0.4 }, cust: 1 } },
  { id: 'repair', name: '집 고치는 철', icon: '🏚️', desc: '살림 도구 값 +40%', fx: { cat: { tool: 0.4 } } },
  { id: 'fog', name: '안개', icon: '🌫️', desc: '손님 -2, 그 대신 모든 값 +20%', fx: { cust: -2, all: 0.2 } },
  { id: 'crowdday', name: '사람 많은 날', icon: '👥', desc: '손님 +3', fx: { cust: 3 } },
  { id: 'taxday', name: '세금 걷는 날', icon: '📜', desc: '자릿세 +3', fx: { rentAdd: 3 } },
  { id: 'kindguard', name: '너그러운 장터 지기', icon: '🫡', desc: '자릿세 -3', fx: { rentAdd: -3 } },
  { id: 'gossip', name: '소문난 날', icon: '🗣️', desc: '같은 갈래 이웃 보너스 +25%', fx: { same: 0.25 } },
  { id: 'picnic', name: '소풍 날', icon: '🧺', desc: '짝 갈래 이웃 보너스 +25%', fx: { pair: 0.25 } },
  { id: 'market2', name: '이웃 장도 서는 날', icon: '🏪', desc: '모든 값 -15%, 손님 +2', fx: { all: -0.15, cust: 2 } },
  { id: 'moon', name: '보름달', icon: '🌕', desc: '아무거나 손님 값 +40%', fx: { any: 0.4 } },
  { id: 'snow', name: '첫눈', icon: '❄️', desc: '옷가지·마실거리 값 +40%, 장난감 -20%', fx: { cat: { cloth: 0.4, drink: 0.4, toy: -0.2 } } },
  { id: 'wind', name: '연 날리는 날', icon: '🪁', desc: '가장자리 꼬리표 +3', fx: { edge: 3 } },
  { id: 'quiet', name: '한산한 날', icon: '🍃', desc: '손님 -1, 외톨이 꼬리표 세 배', fx: { cust: -1, lone: 1 } },
  { id: 'twinsday', name: '짝 맞추는 날', icon: '🧦', desc: '짝꿍 꼬리표 세 배', fx: { twin: 1 } },
  { id: 'oldday', name: '옛 물건 장', icon: '🕰️', desc: '묵힘 물건 값 +3', fx: { growNow: 3 } },
  { id: 'music', name: '풍물 놀이', icon: '🪘', desc: '북적 꼬리표 이웃마다 +2', fx: { crowd: 1 } },
  { id: 'cheapday', name: '도매 장', icon: '🚚', desc: '오늘 장보기 값 2 덜 냄', fx: { cheap: 2 } },
  { id: 'storm', name: '먹구름', icon: '⛈️', desc: '손님 -2, 자릿세 -2', fx: { cust: -2, rentAdd: -2 } }
];

// 장날 10 — 자릿세와 기본 손님 수
DATA.DAYS = [
  { rent: 3, cust: 6, name: '첫 장날' },
  { rent: 4, cust: 6, name: '둘째 장날' },
  { rent: 6, cust: 7, name: '셋째 장날' },
  { rent: 7, cust: 7, name: '넷째 장날' },
  { rent: 9, cust: 8, name: '다섯째 장날' },
  { rent: 10, cust: 8, name: '여섯째 장날' },
  { rent: 12, cust: 9, name: '일곱째 장날' },
  { rent: 13, cust: 9, name: '여덟째 장날' },
  { rent: 15, cust: 10, name: '아홉째 장날' },
  { rent: 17, cust: 10, name: '마지막 장날' }
];

// 가판대 (판 사이에 장터 도장으로 연다)
DATA.STALLS = [
  { id: 'alley', name: '골목 잡화', icon: '🛖', cost: 0, desc: '갈래가 고루 섞인 물건 10장으로 시작한다',
    deck: ['sweetpotato', 'riceball', 'barley', 'sikhye', 'yarn', 'socks', 'yoyo', 'boat', 'scissors', 'marble'], fx: {} },
  { id: 'noodle', name: '국수 수레', icon: '🍜', cost: 8, desc: '먹을거리·마실거리 위주, 신선 +1일',
    deck: ['sweetpotato', 'riceball', 'riceball', 'skewer', 'corn', 'barley', 'sikhye', 'lemonade', 'yuja', 'milk'], fx: { fresh: 1 } },
  { id: 'tent', name: '천막 옷가게', icon: '⛺', cost: 12, desc: '옷가지·장신구 위주, 짝 보너스 +10%',
    deck: ['mitten', 'socks', 'socks', 'yarn', 'cap', 'pin', 'pin', 'bell', 'marble', 'shell'], fx: { pair: 0.1 } },
  { id: 'toymat', name: '장난감 좌판', icon: '🎠', cost: 16, desc: '장난감·도구 위주, 날마다 손님 +1',
    deck: ['yoyo', 'cards', 'cards', 'boat', 'balloon', 'kite', 'scissors', 'ruler', 'ruler', 'bucket'], fx: { cust: 1 } }
];

// 업적 — 조건은 Game.checkAch 에서 본다
DATA.ACHS = [
  { id: 'first_sale', name: '첫 손님', desc: '물건을 처음 팔았다' },
  { id: 'day3', name: '사흘 버팀', desc: '셋째 장날 자릿세를 냈다' },
  { id: 'day6', name: '엿새 버팀', desc: '여섯째 장날 자릿세를 냈다' },
  { id: 'win', name: '장터 끝까지', desc: '열 장날을 모두 버텼다' },
  { id: 'big10', name: '큰 장사', desc: '한 번에 동전 10 이상 받았다' },
  { id: 'big20', name: '대박 장사', desc: '한 번에 동전 20 이상 받았다' },
  { id: 'pair3', name: '짝 맞춤', desc: '짝 갈래 이웃이 셋인 물건을 팔았다' },
  { id: 'same3', name: '한 줄 진열', desc: '같은 갈래 이웃이 셋인 물건을 팔았다' },
  { id: 'fullshelf', name: '꽉 찬 진열대', desc: '진열대 12칸을 모두 채웠다' },
  { id: 'rep10', name: '소문난 가판대', desc: '평판 10을 찍었다' },
  { id: 'nofail', name: '아무도 빈손으로', desc: '하루 동안 손님을 한 명도 그냥 보내지 않았다' },
  { id: 'charm5', name: '부적 꾸러미', desc: '한 판에 부적 다섯 개를 모았다' },
  { id: 'deck20', name: '물건 부자', desc: '물건이 20장이 되었다' },
  { id: 'lone', name: '홀로 빛남', desc: '외톨이 물건을 두 배 값에 팔았다' },
  { id: 'twin', name: '짝꿍 장사', desc: '짝꿍 물건을 두 배 값에 팔았다' },
  { id: 'grow5', name: '잘 묵힘', desc: '묵힘 물건을 +5 넘게 키워 팔았다' },
  { id: 'night', name: '밤손님', desc: '밤손님에게 물건을 팔았다' },
  { id: 'coins100', name: '동전 백 닢', desc: '한 판에 동전 100을 벌었다' },
  { id: 'nospoil', name: '알뜰 장사', desc: '한 판 동안 하나도 상하지 않고 다섯째 장날을 넘겼다' },
  { id: 'allstalls', name: '가판대 넷', desc: '가판대 넷을 모두 열었다' }
];

// 장터 일지 — 업적·판 수로 열린다
DATA.LOG = [
  { id: 'l1', need: 'runs1', text: '처음 가판대를 폈다. 천막 기둥이 아직 서툴게 기울었다.' },
  { id: 'l2', need: 'first_sale', text: '첫 손님은 동전을 두 번 세고 웃었다.' },
  { id: 'l3', need: 'day3', text: '사흘째, 옆 가판대 할머니가 보리차를 한 잔 건넸다.' },
  { id: 'l4', need: 'pair3', text: '호떡 옆에 식혜를 두니 손님 발이 멈췄다. 짝이 있으면 덜 외롭다.' },
  { id: 'l5', need: 'same3', text: '털장갑을 한 줄로 걸어 두니 멀리서도 보였다.' },
  { id: 'l6', need: 'day6', text: '엿새째, 장터 지기가 우리 가판대 이름을 장부에 적었다.' },
  { id: 'l7', need: 'rep10', text: '"그 가판대 가 봐." 시장 어귀에서 그런 말이 들렸다.' },
  { id: 'l8', need: 'grow5', text: '오래 둔 꿀단지가 제값을 받았다. 서두르지 않는 것도 장사다.' },
  { id: 'l9', need: 'night', text: '장이 파할 무렵 온 손님은 거스름돈을 받지 않았다.' },
  { id: 'l10', need: 'win', text: '열 번째 장날이 저물었다. 천막을 걷는 손이 가벼웠다.' },
  { id: 'l11', need: 'runs5', text: '다섯 번째 장. 이제 어디에 무엇을 둘지 손이 먼저 안다.' },
  { id: 'l12', need: 'fullshelf', text: '진열대가 꽉 찼다. 빈칸이 하나도 없으니 어쩐지 불안했다.' },
  { id: 'l13', need: 'big20', text: '동전 스무 닢을 한 번에 받았다. 손이 떨려 두 번 셌다.' },
  { id: 'l14', need: 'charm5', text: '부적 주머니가 묵직하다. 다 믿지는 않지만 버리지도 않는다.' },
  { id: 'l15', need: 'allstalls', text: '골목, 수레, 천막, 좌판. 이 장터의 모든 자리를 한 번씩 서 봤다.' }
];

DATA.SETTINGS = [
  { id: 'sound', name: '소리', def: true },
  { id: 'vibrate', name: '진동', def: true },
  { id: 'shake', name: '화면 흔들림', def: true },
  { id: 'reduce', name: '움직임 줄이기', def: false },
  { id: 'big', name: '큰 글자', def: false },
  { id: 'preview', name: '값 미리 보기', def: true },
  { id: 'fast', name: '빠른 손님', def: false }
];

DATA.SHELF_W = 4;
DATA.SHELF_H = 3;
DATA.HAND_BASE = 5;
DATA.HAND_MAX = 8;
DATA.REP_START = 5;
DATA.COINS_START = 5;
DATA.BUY_MAX = 2;      // 장보기 한 번에 살 수 있는 물건 수
DATA.REP_LOW_MAX = 1;  // 평판이 낮아 줄어드는 손님은 이만큼까지
DATA.REP_MAX = 10;
