/* 내일 가방 — 기본 내용 (과목·방과후 꾸러미, 요일 규칙, 알림장 준비물 사전, 행사 꾸러미, 도움말, 물건 그림, 칭찬 스티커) */
var DATA = (function () {
  // 과목 꾸러미 15 — 그 과목이 시간표에 있는 날 가방에 들어갈 것
  var SUBJECTS = [
    { id: 's-kor', name: '국어', icon: '📖', items: ['국어 교과서', '국어 활동 책', '받아쓰기 공책'] },
    { id: 's-math', name: '수학', icon: '➗', items: ['수학 교과서', '수학 익힘 책', '30cm 자'] },
    { id: 's-int', name: '통합교과', icon: '🌱', items: ['통합 교과서', '색연필', '풀'] },
    { id: 's-safe', name: '안전한 생활', icon: '🦺', items: ['안전한 생활 책'] },
    { id: 's-soc', name: '사회', icon: '🗺️', items: ['사회 교과서', '사회과 부도'] },
    { id: 's-sci', name: '과학', icon: '🔬', items: ['과학 교과서', '실험 관찰 책'] },
    { id: 's-eng', name: '영어', icon: '🔤', items: ['영어 교과서', '영어 공책'] },
    { id: 's-mor', name: '도덕', icon: '🤝', items: ['도덕 교과서'] },
    { id: 's-prac', name: '실과', icon: '🧵', items: ['실과 교과서', '앞치마'] },
    { id: 's-pe', name: '체육', icon: '🏃', items: ['체육복', '운동화', '물병', '머리끈'] },
    { id: 's-mus', name: '음악', icon: '🎵', items: ['음악 교과서', '리코더'] },
    { id: 's-art', name: '미술', icon: '🎨', items: ['미술 교과서', '크레파스', '물감과 붓', '팔토시'] },
    { id: 's-cre', name: '창의적 체험활동', icon: '🧩', items: ['활동지 파일'] },
    { id: 's-read', name: '아침 독서', icon: '📚', items: ['읽을 책 한 권', '독서록'] },
    { id: 's-dict', name: '받아쓰기 시험', icon: '✏️', items: ['받아쓰기 공책', '연필 두 자루'] }
  ];

  // 방과후·학원 꾸러미 15
  var ACADEMIES = [
    { id: 'a-tkd', name: '태권도', icon: '🥋', items: ['도복', '띠', '물병'] },
    { id: 'a-swim', name: '수영', icon: '🏊', items: ['수영복', '수모', '물안경', '수건', '세면도구 주머니'] },
    { id: 'a-piano', name: '피아노', icon: '🎹', items: ['피아노 교재', '연습 기록장'] },
    { id: 'a-art', name: '미술학원', icon: '🖌️', items: ['스케치북', '앞치마'] },
    { id: 'a-eng', name: '영어학원', icon: '🗣️', items: ['영어학원 교재', '단어장', '영어 숙제'] },
    { id: 'a-math', name: '수학학원', icon: '📐', items: ['수학 문제집', '수학 숙제', '계산 공책'] },
    { id: 'a-soc', name: '축구', icon: '⚽', items: ['축구화', '정강이 보호대', '축구복', '물병'] },
    { id: 'a-rope', name: '줄넘기', icon: '🪢', items: ['줄넘기', '운동화'] },
    { id: 'a-ballet', name: '발레', icon: '🩰', items: ['발레복', '타이츠', '발레 슈즈', '머리망'] },
    { id: 'a-code', name: '코딩 교실', icon: '💻', items: ['코딩 교재', '계정 적은 쪽지'] },
    { id: 'a-baduk', name: '바둑', icon: '⚫', items: ['바둑 교재'] },
    { id: 'a-sci', name: '방과후 과학', icon: '🧪', items: ['실험 공책', '방과후 출석 카드'] },
    { id: 'a-care', name: '돌봄교실', icon: '🏫', items: ['돌봄 간식', '읽을 책 한 권'] },
    { id: 'a-essay', name: '독서논술', icon: '📝', items: ['이번 주 읽은 책', '논술 공책'] },
    { id: 'a-choir', name: '합창', icon: '🎤', items: ['악보 파일', '물병'] }
  ];

  // 매일 챙길 것 (처음 값, 사람이 고친다)
  var DAILY = ['알림장', '필통', '물병', '손수건', '숙제'];

  // 요일 규칙 5 — dow: 1 월 … 5 금
  var RULES = [
    { id: 'r-mon-shoe', dow: 1, item: '실내화 주머니' },
    { id: 'r-mon-brush', dow: 1, item: '칫솔·치약 (새로 바꾼 것)' },
    { id: 'r-wed-lib', dow: 3, item: '도서관 책 반납' },
    { id: 'r-fri-shoe', dow: 5, item: '실내화 집에 가져오기' },
    { id: 'r-fri-home', dow: 5, item: '주말 숙제 챙겨 오기' }
  ];

  // 알림장에 자주 나오는 준비물 100 — 알림장 넣기에서 눌러 고른다
  var SUPPLIES = [
    { cat: '학용품', items: ['연필 두 자루', '지우개', '자', '가위', '풀', '딱풀', '색연필', '사인펜', '네임펜', '형광펜',
      '스카치테이프', '양면테이프', '스테이플러', '클립', '공책', '줄 공책', '모눈 공책', '클리어 파일', 'L자 파일', '포스트잇'] },
    { cat: '미술·만들기', items: ['색종이', '도화지', '크레파스', '물감', '붓', '물통', '팔레트', '찰흙', '고무찰흙', '수수깡',
      '나무젓가락', '빨대', '종이컵', '휴지 심', '빈 우유갑', '페트병', '병뚜껑', '털실', '단추', '골판지'] },
    { cat: '체육·놀이', items: ['체육복', '운동화', '줄넘기', '모자', '팔토시', '여벌 양말', '머리끈', '공', '훌라후프', '수건',
      '썬크림', '돗자리', '물총', '여벌 옷', '우비'] },
    { cat: '생활', items: ['물티슈', '휴지', '손수건', '마스크', '칫솔', '치약', '컵', '수저 세트', '앞치마', '두건',
      '위생 장갑', '비닐봉지', '지퍼백', '장바구니', '우산', '실내화', '보온 물병', '간식', '도시락', '잔돈'] },
    { cat: '서류·돈', items: ['가정통신문 회신', '동의서', '검진표', '우유 급식 신청서', '현장학습 신청서', '방과후 신청서', '상담 신청서',
      '체험학습 보고서', '통장 사본', '학부모 서명'] },
    { cat: '책·공부', items: ['독서록', '일기장', '받아쓰기 공책', '단어장', '사전', '지도', '학습지', '방학 숙제', '탐구 보고서', '발표 자료',
      '가족 사진', '아기 때 사진', '좋아하는 책', '빌린 책', '악보', '리코더', '멜로디언', '실험 재료', '관찰 일지', '조사 숙제'] }
  ];

  // 행사 꾸러미 12 — 날짜에 붙이면 그날 가방에 알림장 준비물로 들어간다
  var EVENTS = [
    { id: 'e-trip', name: '현장체험학습', icon: '🚌', items: ['도시락', '돗자리', '물', '간식', '모자', '손수건', '비닐봉지'] },
    { id: 'e-sports', name: '운동회', icon: '🏅', items: ['체육복', '운동화', '물병', '모자', '반 티셔츠'] },
    { id: 'e-health', name: '건강검진', icon: '🩺', items: ['검진표', '소변 검사 통'] },
    { id: 'e-swim', name: '생존수영 수업', icon: '🛟', items: ['수영복', '수모', '물안경', '수건', '슬리퍼', '비닐봉지'] },
    { id: 'e-show', name: '학예회', icon: '🎭', items: ['공연 옷', '공연 소품', '여벌 옷'] },
    { id: 'e-open', name: '공개수업', icon: '👀', items: ['발표 자료', '이름표'] },
    { id: 'e-unit', name: '단원평가', icon: '📝', items: ['연필 두 자루', '지우개', '복습 공책'] },
    { id: 'e-end', name: '방학식', icon: '🎒', items: ['큰 쇼핑백 (사물함 짐)', '실내화 주머니', '방학 생활 계획표'] },
    { id: 'e-start', name: '개학식', icon: '🔔', items: ['방학 숙제', '실내화', '새 공책'] },
    { id: 'e-market', name: '알뜰 시장', icon: '🛍️', items: ['팔 물건', '장바구니', '잔돈'] },
    { id: 'e-cook', name: '요리 체험', icon: '🍳', items: ['앞치마', '두건', '위생 장갑', '반찬통'] },
    { id: 'e-scday', name: '과학의 날', icon: '🚀', items: ['만들기 재료', '가위', '풀', '셀로판테이프'] }
  ];

  // 도움말 한 줄 20
  var TIPS = [
    '시간표는 학기 초에 한 번만 넣으면 돼요. 바뀐 칸만 눌러 고쳐요.',
    '알림장에 적힌 준비물만 골라 넣으면 그날 가방에 바로 들어가요.',
    '오후 2시가 지나면 다음 학교 가는 날 가방을 보여 줘요. 설정의 쉬는 날에서 시각을 바꿔요.',
    '주말은 저절로 건너뛰어요. 재량휴업일은 설정의 쉬는 날에 넣어 두세요.',
    '같은 물건이 여러 곳에 나오면 한 칸으로 합쳐요. 칸을 길게 누르면 왜 필요한지 보여요.',
    '한 번만 필요한 알림장 준비물은 가방 시트의 맨 앞 쪽에 모여요.',
    '방과후마다 데리러 갈 사람을 정해 두면 가방 화면에 한 줄로 보여요.',
    '위의 보내기 버튼을 누르면 가족에게 보낼 한 줄이 복사돼요.',
    '아이가 챙겨요를 켜면 칸과 글자가 커져서 아이 혼자서도 쏙쏙 눌러요.',
    '가방을 다 챙기면 칭찬 스티커가 가방 달력에 붙어요.',
    '꾸러미는 과목·학원마다 늘 챙기는 물건 묶음이에요. 우리 학교에 맞게 고쳐요.',
    '행사 꾸러미를 날짜에 붙이면 체험학습 준비물이 한 번에 들어가요.',
    '아이가 둘 이상이면 위의 이름을 눌러 바꿔 가며 챙겨요.',
    '월요일 실내화처럼 요일마다 챙길 것은 꾸러미의 매일 · 요일에 있어요.',
    '넣은 내용은 이 기기 브라우저에만 저장돼요. 가끔 내보내기로 보관해 두세요.',
    '휴대폰을 바꿀 때는 내보내기 글을 새 휴대폰의 가져오기에 붙여 넣어요.',
    '잘못 지웠다면 아래 알림의 되돌리기를 바로 눌러요.',
    '글자가 작으면 설정에서 글자 크기를 키워요.',
    '저녁에 아이와 함께 가방 챙기기를 눌러 보면 아침이 편해져요.',
    '며칠 뒤 준비물은 날짜 아래 작은 알약으로 미리 알려 줘요.'
  ];

  var DOW = ['일', '월', '화', '수', '목', '금', '토'];

  // 물건 그림 70 — 사람이 그린 그림이 오기 전까지 쓰는 24×24 선 SVG (stroke 는 currentColor)
  // [id, 이름, 찾는 말(| 로 나눔, 한 글자 말은 낱말 하나일 때만 맞음), 그림]
  // 이름이 여러 말에 맞으면 가장 긴 말이 이긴다. 같으면 앞에 있는 것. 그래서 넓은 뜻(교과서·공책·봉투·가방)은 맨 뒤에 둔다
  var ICON_ROWS = [
    ['pencilcase', '필통', '필통', '<rect x="3" y="8" width="18" height="9" rx="3"/><path d="M3 12h18M10 12v2"/>'],
    ['pencil', '연필', '연필', '<path d="M5 19l1-4L16 5l3 3L9 18z"/><path d="M14 7l3 3"/>'],
    ['eraser', '지우개', '지우개', '<path d="M4 15l8-8 6 6-5 5H7z"/><path d="M9 10l6 6"/>'],
    ['ruler', '자', '자|30cm|줄자', '<rect x="2" y="9" width="20" height="6" rx="1"/><path d="M6 9v3M10 9v2M14 9v3M18 9v2"/>'],
    ['scissors', '가위', '가위', '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M8 15L17 4M16 15L7 4"/>'],
    ['glue', '풀', '풀|딱풀|목공풀', '<rect x="8" y="9" width="8" height="12" rx="2"/><rect x="9" y="4" width="6" height="5" rx="1"/>'],
    ['colorpencil', '색연필', '색연필|사인펜|네임펜|형광펜|매직', '<path d="M6 21V8l2-4 2 4v13M14 21V8l2-4 2 4v13M6 8h4M14 8h4"/>'],
    ['crayon', '크레파스', '크레파스|크레용|파스텔', '<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M7 7V4h2v3M11 7V3h2v4M15 7V4h2v3M4 12h16"/>'],
    ['paint', '물감', '물감|팔레트', '<rect x="3" y="6" width="18" height="12" rx="3"/><circle cx="8" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="16" cy="12" r="1.6"/>'],
    ['brush', '붓', '붓', '<path d="M19 3l-9 9"/><path d="M10 12c-3 0-5 2-5 5 0 2-1 3-2 4 4 0 9-1 9-6z"/>'],
    ['brushcup', '물통', '물통', '<path d="M5 6h14l-1 14H6z"/><path d="M5 10h14M10 6V2"/>'],
    ['recorder', '리코더', '리코더|단소', '<path d="M10 2h4v4l-1 15h-2L10 6z"/><circle cx="12" cy="9" r=".8"/><circle cx="12" cy="12" r=".8"/><circle cx="12" cy="15" r=".8"/>'],
    ['keys', '건반', '피아노|멜로디언|건반', '<rect x="3" y="6" width="18" height="12" rx="1"/><path d="M7.5 6v12M12 6v12M16.5 6v12M6 6v6M10.5 6v6M15 6v6"/>'],
    ['sheetmusic', '악보', '악보', '<path d="M9 18V5l10-2v13"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="16" r="2"/>'],
    ['indoor', '실내화', '실내화', '<path d="M3 15c0-3 2-6 5-6h3l2 4 7 1c1 0 1 4 0 4H4c-1 0-1-1-1-3z"/><path d="M3 16h18"/>'],
    ['sneakers', '운동화', '운동화|축구화|슈즈|신발', '<path d="M2 17V9l5 1 3 3 9 1c2 0 3 2 3 3z"/><path d="M2 17h20M8 12l1.5-1.5M10.5 13.5L12 12"/>'],
    ['slippers', '슬리퍼', '슬리퍼', '<path d="M6 20c-2 0-3-2-3-5V7a3 3 0 0 1 6 0v8c0 3-1 5-3 5zM18 20c-2 0-3-2-3-5V7a3 3 0 0 1 6 0v8c0 3-1 5-3 5z"/><path d="M3 10h6M15 10h6"/>'],
    ['gym', '체육복', '체육복|축구복|티셔츠|옷', '<path d="M8 3L3 6l2 4 3-1v12h8V9l3 1 2-4-5-3c-1 2-2.5 2.5-4 2.5S9 5 8 3z"/>'],
    ['dobok', '도복', '도복|띠', '<path d="M7 3l5 6 5-6 3 3v15H4V6z"/><path d="M4 13h16M12 9v12"/>'],
    ['swimsuit', '수영복', '수영복|수모', '<path d="M8 3v5c0 2 8 2 8 0V3M8 8L6 21h12L16 8M8 16h8"/>'],
    ['goggles', '수경', '수경|물안경', '<circle cx="7" cy="13" r="3.5"/><circle cx="17" cy="13" r="3.5"/><path d="M10.5 13h3M3.5 12L2 10M20.5 12L22 10"/>'],
    ['towel', '수건', '수건', '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 15h14M5 18h14"/>'],
    ['hanky', '손수건', '손수건', '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M9 4v16"/>'],
    ['tissue', '휴지', '휴지|물티슈', '<path d="M4 10h16v10H4z"/><path d="M9 10c0-3 2-6 3-6s3 3 3 6"/>'],
    ['tube', '휴지 심', '휴지 심|휴지심', '<ellipse cx="12" cy="6" rx="5" ry="2"/><path d="M7 6v12c0 1 2 2 5 2s5-1 5-2V6"/>'],
    ['mask', '마스크', '마스크', '<path d="M5 8h14v7c0 2-3 4-7 4s-7-2-7-4z"/><path d="M5 10H2M19 10h3M8 12h8"/>'],
    ['umbrella', '우산', '우산|우비', '<path d="M3 12a9 9 0 0 1 18 0z"/><path d="M12 12v7a2 2 0 0 1-4 0"/>'],
    ['cap', '모자', '모자|두건', '<path d="M4 15a8 8 0 0 1 16 0z"/><path d="M4 15h18"/>'],
    ['hairtie', '머리끈', '머리끈|머리망|머리핀', '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="3"/>'],
    ['armsleeve', '팔토시', '팔토시', '<path d="M7 3h8l2 18H9z"/><path d="M7.5 7h8M8.5 17h8"/>'],
    ['socks', '양말', '양말', '<path d="M8 3h6v9l4 4c1 1 1 3-1 4l-2 1-7-6z"/><path d="M8 7h6"/>'],
    ['tights', '타이츠', '타이츠|발레복', '<path d="M7 3h10l-1 18h-3l-1-11-1 11H8z"/>'],
    ['shinguard', '보호대', '보호대', '<path d="M7 3h10v12c0 4-2 6-5 6s-5-2-5-6z"/><path d="M10 8h4"/>'],
    ['jumprope', '줄넘기', '줄넘기', '<path d="M6 4v5M18 4v5"/><path d="M6 9c0 12 12 12 12 0"/>'],
    ['ball', '공', '공|훌라후프', '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'],
    ['bottle', '물병', '물병|물|보온병', '<rect x="8" y="7" width="8" height="14" rx="3"/><path d="M10 7V4h4v3M8 12h8"/>'],
    ['cup', '컵', '컵|종이컵|통', '<path d="M6 5h12l-2 15H8z"/><path d="M6.5 9h11"/>'],
    ['spoon', '수저', '수저|숟가락|젓가락', '<ellipse cx="8" cy="6" rx="2.5" ry="3.5"/><path d="M8 9.5V21M16 3v18M14 3v5a2 2 0 0 0 4 0V3"/>'],
    ['lunchbox', '도시락', '도시락|반찬통', '<rect x="3" y="8" width="18" height="11" rx="2"/><path d="M3 12h18M10 5h4v3"/>'],
    ['snack', '간식', '간식', '<path d="M6 4l3 2 3-2 3 2 3-2v16H6z"/><circle cx="12" cy="13" r="2.5"/>'],
    ['toothbrush', '칫솔', '칫솔|치약|세면도구', '<path d="M4 20L15 9"/><path d="M14 6l4-4 4 4-4 4z"/>'],
    ['suncream', '선크림', '선크림|썬크림', '<path d="M9 3h6v4H9zM8 7h8l1 14H7z"/><circle cx="12" cy="14" r="2"/>'],
    ['apron', '앞치마', '앞치마', '<path d="M9 3h6v4l4 2-2 12H7L5 9l4-2z"/><path d="M9 13h6v4H9z"/>'],
    ['gloves', '장갑', '장갑', '<path d="M7 21v-8L4 9l2-1 2 3V4h2v6V3h2v7V4h2v7V6h2v9l-2 6z"/>'],
    ['mat', '돗자리', '돗자리', '<rect x="3" y="7" width="18" height="12" rx="1"/><path d="M3 11h18M3 15h18M9 7v12M15 7v12"/>'],
    ['colorpaper', '색종이', '색종이|도화지|골판지|스케치북', '<rect x="3" y="3" width="12" height="12" rx="1"/><rect x="9" y="9" width="12" height="12" rx="1"/>'],
    ['tape', '테이프', '테이프', '<circle cx="11" cy="12" r="7"/><circle cx="11" cy="12" r="2.5"/><path d="M18 12h4"/>'],
    ['stapler', '스테이플러', '스테이플러|클립', '<path d="M3 17h18M4 13l14-4c2 0 3 1 3 2v2H4z"/>'],
    ['memo', '메모지', '포스트잇|메모지|쪽지', '<path d="M4 4h16v11l-5 5H4z"/><path d="M15 20v-5h5"/>'],
    ['file', '파일', '파일', '<path d="M3 6h7l2 2h9v12H3z"/>'],
    ['clay', '찰흙', '찰흙', '<path d="M4 18c0-6 4-10 8-10s8 4 8 10z"/><path d="M8 18c0-3 2-5 4-5"/>'],
    ['straw', '빨대', '빨대|수수깡', '<path d="M8 9h8l-1 12H9z"/><path d="M12 9l3-6h3"/>'],
    ['milk', '우유갑', '우유', '<path d="M7 8l2-4h6l2 4v13H7z"/><path d="M7 8h10M10 13h4"/>'],
    ['pet', '페트병', '페트병|병뚜껑', '<path d="M10 2h4v3l2 3v13H8V8l2-3z"/><path d="M8 13h8"/>'],
    ['yarn', '털실', '털실|단추', '<circle cx="12" cy="12" r="8"/><path d="M6 8c4 0 8 4 10 10M5 13c4 0 7 3 8 7M10 4c2 3 6 5 10 5"/>'],
    ['coin', '돈', '잔돈|돈|통장', '<circle cx="12" cy="12" r="8"/><path d="M8.5 9l1.8 6L12 10l1.7 5 1.8-6M8 12h8"/>'],
    ['dict', '사전', '사전', '<path d="M5 4h11a3 3 0 0 1 3 3v14H8a3 3 0 0 1-3-3z"/><path d="M5 18a3 3 0 0 1 3-3h11M10 8h5"/>'],
    ['map', '지도', '지도|부도', '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>'],
    ['photo', '사진', '사진', '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 8"/>'],
    ['laptop', '코딩', '코딩|계정|노트북', '<rect x="5" y="5" width="14" height="10" rx="1"/><path d="M3 19h18l-2-4H5z"/>'],
    ['baduk', '바둑', '바둑', '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/><circle cx="9" cy="9" r="2"/><circle cx="15" cy="15" r="2"/>'],
    ['nametag', '이름표', '이름표|카드', '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M10 4h4v4h-4zM7 13h4M7 16h7"/>'],
    ['notice', '알림장', '알림장', '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>'],
    ['homework', '숙제', '숙제|학습지|문제집|활동지', '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8 13l2 2 4-4"/>'],
    ['paper', '서류', '가정통신문|통신문|동의서|검진표|신청서|회신|보고서|서명|계획표|자료|일지', '<path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7M9 18h4"/>'],
    ['book', '읽을 책', '읽을 책|읽은 책|빌린 책|좋아하는 책|도서관|독서', '<path d="M12 6C9 4 5 4 3 5v14c2-1 6-1 9 1 3-2 7-2 9-1V5c-2-1-6-1-9 1z"/><path d="M12 6v14"/>'],
    ['notebook', '공책', '공책|노트|일기장|독서록|단어장|기록장', '<rect x="6" y="3" width="13" height="18" rx="2"/><path d="M4 7h3M4 12h3M4 17h3M10 8h6"/>'],
    ['textbook', '교과서', '교과서|교재|책', '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v18M12 8h4"/>'],
    ['pouch', '준비물 봉투', '봉투|주머니|쇼핑백|봉지|지퍼백|장바구니|재료', '<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'],
    ['bag', '가방', '가방|배낭', '<rect x="5" y="8" width="14" height="13" rx="3.5"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/><rect x="9" y="13.5" width="6" height="3.5" rx="1.2"/>']
  ];
  var ICONS = ICON_ROWS.map(function (r) { return { id: r[0], name: r[1], w: r[2].split('|'), d: r[3] }; });

  // 칭찬 스티커 12 — 가방을 다 챙긴 날 달력에 붙는다 (c 는 style.css 의 색 변수)
  var STICKERS = [
    { e: '⭐', name: '반짝 별', c: '--gold' }, { e: '🌈', name: '무지개', c: '--sub' }, { e: '🐻', name: '곰돌이', c: '--accent' },
    { e: '🍀', name: '네잎클로버', c: '--ok' }, { e: '🌻', name: '해바라기', c: '--gold' }, { e: '🚀', name: '로켓', c: '--violet' },
    { e: '🐳', name: '고래', c: '--sub' }, { e: '🍓', name: '딸기', c: '--accent' }, { e: '🎈', name: '풍선', c: '--violet' },
    { e: '🦊', name: '여우', c: '--accent' }, { e: '🐰', name: '토끼', c: '--ok' }, { e: '🦄', name: '유니콘', c: '--violet' }
  ];

  // 학년 기본 시간표 3묶음 — 새 아이를 넣을 때 칸을 미리 채운다 (월~금 × 6교시, 모두 SUBJECTS 의 id)
  var TIMETABLES = [
    { grades: [1, 2], name: '1~2학년', week: {
      1: ['s-kor', 's-kor', 's-math', 's-int', 's-int', 's-cre'],
      2: ['s-read', 's-kor', 's-math', 's-int', 's-int', 's-safe'],
      3: ['s-kor', 's-dict', 's-math', 's-int', 's-int', 's-cre'],
      4: ['s-kor', 's-math', 's-int', 's-int', 's-kor', 's-safe'],
      5: ['s-read', 's-kor', 's-math', 's-int', 's-int', 's-cre'] } },
    { grades: [3, 4], name: '3~4학년', week: {
      1: ['s-kor', 's-math', 's-soc', 's-sci', 's-pe', 's-mor'],
      2: ['s-kor', 's-eng', 's-math', 's-sci', 's-mus', 's-cre'],
      3: ['s-kor', 's-math', 's-soc', 's-pe', 's-art', 's-art'],
      4: ['s-eng', 's-kor', 's-math', 's-sci', 's-mus', 's-pe'],
      5: ['s-kor', 's-soc', 's-math', 's-mor', 's-eng', 's-cre'] } },
    { grades: [5, 6], name: '5~6학년', week: {
      1: ['s-kor', 's-math', 's-soc', 's-sci', 's-pe', 's-eng'],
      2: ['s-kor', 's-math', 's-prac', 's-prac', 's-mus', 's-cre'],
      3: ['s-kor', 's-eng', 's-sci', 's-sci', 's-soc', 's-pe'],
      4: ['s-kor', 's-math', 's-art', 's-art', 's-mor', 's-pe'],
      5: ['s-math', 's-kor', 's-soc', 's-eng', 's-mus', 's-cre'] } }
  ];

  return { SUBJECTS: SUBJECTS, ACADEMIES: ACADEMIES, DAILY: DAILY, RULES: RULES, SUPPLIES: SUPPLIES, EVENTS: EVENTS, TIPS: TIPS, DOW: DOW, ICONS: ICONS, STICKERS: STICKERS, TIMETABLES: TIMETABLES };
})();
