/* Beat Orchard — 언어 (한국어·영어, H-24)
   화면 글은 모두 이 파일을 거친다. 한국어가 원문이고, 영어는 아래 표에 둔다. 영어가 빠진 글은 한국어로 보인다.
   - JS 글: T('한국어 원문 {n}', { n: 3 }) — 원문을 그대로 열쇠로 쓴다
   - index.html 글: data-i18n="열쇠"(안 글), data-i18n-aria="열쇠"(aria-label), data-i18n-title="열쇠"(title).
     한국어는 처음 읽은 HTML 그대로를 기억해 두고, 영어는 HTML_EN 표에서 찾는다
   - 콘텐츠(data.js): 항목마다 이름·설명을 CONTENT_EN 표의 영어로 바꿔 끼운다(같은 객체, 개수·id·규칙 숫자는 그대로) */
(function () {
  'use strict';

  var lang = 'ko';

  // ---------- JS 화면 글 (한국어 원문 → 영어) ----------
  var EN = {
    // 공통
    '{m}분 {s}초': '{m}m {s}s',
    '저장된 게임을 이어서 해요': 'Continue your saved game',
    '이어서 할 게임이 없어요': 'No saved game to continue',
    '이어하기 ({t})': 'Continue ({t})',
    '저장된 게임을 불러오지 못했어요': 'Couldn\'t load the saved game',
    // 지역·편성
    '앞 과수원을 되찾으면 열려요': 'Reclaim the previous orchard to unlock',
    '{name} — {desc} (안개 체력 ×{hp}, 안개 수 ×{count}, 은열매 ×{silver})': '{name} — {desc} (Spirit HP ×{hp}, spirit count ×{count}, Silver Fruit ×{silver})',
    '전열 · 근접': 'Front · Melee',
    '후열 · 원거리': 'Back · Ranged',
    '작업실에서 영입할 수 있어요': 'Recruit in the Workshop',
    '정원사는 세 명까지 데려갈 수 있어요': 'You can bring up to three gardeners',
    // 전투
    '{name} 기술 {skill}': '{name} skill: {skill}',
    '쓰러짐': 'Down',
    '{n}초': '{n}s',
    '사용 가능!': 'Ready!',
    '울타리 {n}': 'Fence {n}',
    ' + 보호막 {n}': ' + Shield {n}',
    '다음 웨이브 ({w}/{max})': 'Next wave ({w}/{max})',
    '이번 웨이브 ({w}/{max})': 'This wave ({w}/{max})',
    ' (비행)': ' (flying)',
    ' (우두머리)': ' (boss)',
    '오늘의 도전은 이미 끝났어요. 내일 다시 도전해 주세요': 'You\'ve already played today\'s challenge. Come back tomorrow!',
    '오늘의 도전 · ': 'Daily Challenge · ',
    '{region} · {diff} · 웨이브 {w}/{max} · 울타리 {fence}': '{region} · {diff} · Wave {w}/{max} · Fence {fence}',
    '보물 선택': 'Choose a Treasure',
    '강화 선택': 'Choose an Upgrade',
    '웨이브 {w} 방어 성공! ': 'Wave {w} cleared! ',
    '과수원을 되찾기까지 {n}웨이브 남았어요. ': '{n} more waves to reclaim the orchard. ',
    '하나를 골라 주세요. (키보드 1~{n})': 'Pick one. (Keys 1–{n})',
    '등급 {n}': 'Rarity {n}',
    '♪ 박자': '♪ Beat',
    // 결과
    '「{name}」 탈환 성공!': '{name} reclaimed!',
    '울타리가 무너졌어요': 'The fence fell',
    '웨이브 {w}/{max}까지 버텼어요. 다른 강화를 골라 다시 도전해 보세요!': 'You held out to wave {w}/{max}. Try again with different upgrades!',
    '별 {n}개': '{n} stars',
    '오늘의 도전 {d} · ': 'Daily Challenge {d} · ',
    '난이도 {name}': '{name} difficulty',
    '막아 낸 웨이브': 'Waves cleared',
    '물리친 안개': 'Spirits defeated',
    ' (우두머리 {n})': ' (boss {n})',
    '심은 열매': 'Fruit planted',
    '플레이 시간': 'Play time',
    '박자 판정': 'Beat timing',
    '완벽 {a} · 좋아 {b} · 놓침 {c}': 'Perfect {a} · Good {b} · Miss {c}',
    '최대 콤보': 'Best combo',
    '돌려보낸 정령': 'Spirits sent home',
    '받은 은열매': 'Silver Fruit earned',
    '울타리 무피해 클리어!': 'Flawless fence clear!',
    '+은열매 {n}': '+{n} Silver Fruit',
    '오늘의 도전 최고 기록: 웨이브 {w}/{max} · 다음 도전은 내일 열려요': 'Daily best: wave {w}/{max} · The next challenge opens tomorrow',
    '최고 기록 경신! ': 'New best! ',
    '이 과수원({diff}) 최고 기록: 웨이브 {w}/{max}': 'Best on this orchard ({diff}): wave {w}/{max}',
    ' · 최단 클리어 {t}': ' · Fastest clear {t}',
    '업적 달성: {list}': 'Achievements unlocked: {list}',
    '오늘의 도전 보기': 'View Daily Challenge',
    '다시 하기': 'Play Again',
    '결과를 복사했어요': 'Result copied',
    // 오늘의 도전
    '지역: {name} — {desc}': 'Orchard: {name} — {desc}',
    '난이도: {name}': 'Difficulty: {name}',
    '정원사: {list}': 'Gardeners: {list}',
    '웨이브 10개 · 오늘은 모든 사람에게 같은 순서로 안개가 나와요': '10 waves · Everyone faces the same spirits in the same order today',
    '아직 도전하지 않았어요. 하루에 한 번만 도전할 수 있어요.': 'Not played yet. You can play once a day.',
    '오늘 결과: {r} · 웨이브 {w}/{max} · 물리친 안개 {k} · {t}': 'Today\'s result: {r} · Wave {w}/{max} · Spirits defeated {k} · {t}',
    '방어 성공': 'Defended',
    '방어 실패': 'Defeated',
    '오늘의 도전이 진행 중이에요. 시작 화면의 이어하기를 눌러 계속하세요.': 'Today\'s challenge is in progress. Press Continue on the home screen to keep going.',
    '도전 시작': 'Start Challenge',
    '내일 다시 도전할 수 있어요': 'Play again tomorrow',
    '아직 기록이 없어요': 'No records yet',
    ' · 웨이브 {w}/{max} · 물리친 안개 {k} · {t}': ' · Wave {w}/{max} · Spirits defeated {k} · {t}',
    '📅 오늘의 도전': '📅 Daily Challenge',
    '📅 오늘의 도전 (완료)': '📅 Daily Challenge (done)',
    // 도감
    '전열': 'Front',
    '후열': 'Back',
    ' · {role} · 기술 「{name}」 {desc}': ' · {role} · Skill "{name}": {desc}',
    ' · 체력 {n}': ' · HP {n}',
    ' · 방어력 {n}': ' · Armor {n}',
    ' · 비행': ' · Flying',
    '아직 발견하지 못했어요': 'Not discovered yet',
    // 기록
    '플레이 횟수': 'Runs',
    '승리': 'Wins',
    '패배': 'Losses',
    '물리친 우두머리': 'Bosses defeated',
    '평균 웨이브': 'Average wave',
    '기술 사용 횟수': 'Skills used',
    '고른 강화': 'Upgrades picked',
    '한 줄 최다 열매': 'Most fruit in one lane',
    '모은 은열매': 'Silver Fruit collected',
    '무피해 승리': 'Flawless wins',
    '총 플레이 시간': 'Total play time',
    '완벽! 판정 횟수': 'Perfect! hits',
    '오늘의 도전': 'Daily Challenge',
    '최근 {n}번 도전 · 성공 {w}번': 'Last {n} tries · {w} wins',
    // 작업실
    '은열매 {n}': 'Silver Fruit {n}',
    '{name} ({role})': '{name} ({role})',
    ' 기술 「{name}」 {desc}': ' Skill "{name}": {desc}',
    '✔ 영입함': '✔ Recruited',
    '✔ 구매함': '✔ Owned',
    '{name} 영입 완료!': '{name} recruited!',
    '{name} 구매 완료!': '{name} purchased!',
    ' · 업적 달성: {list}': ' · Achievements unlocked: {list}',
    // 옵션
    '다음 게임을 시작할 때 튜토리얼이 다시 나와요': 'The tutorial will show again when you start your next game',
    '모든 기록을 지웠어요': 'All records erased',
    // 판 위 글 (game.js)
    '놓침': 'Miss',
    '좋아!': 'Good!',
    '완벽!': 'Perfect!',
    '콤보 유지!': 'Combo kept!',
    '콤보 끊김': 'Combo broken',
    '열매 +{n}': '+{n} Fruit',
    '심기 ×{n}!': 'Plant ×{n}!',
    '심었다!': 'Planted!',
    '콤보 {n}! 열매 발사': 'Combo {n}! Fruit shot',
    '돌아갔다!': 'Sent home!',
    '마지막 웨이브 — 우두머리 등장!': 'Final wave — the boss appears!',
    '웨이브 {n}': 'Wave {n}',
    '소환!': 'Summon!',
    '보호막!': 'Shield!',
    '질주!': 'Dash!',
    '줄 이동!': 'Lane hop!',
    '막혔다': 'Blocked',
    '줄 전체 폭발!': 'Lane blast!',
    '보호막': 'Shield',
    '열매 없음': 'No fruit',
    '열매 {n}': 'Fruit {n}',
    '{n} 콤보  ×{m}': '{n} combo  ×{m}',
    // 공유 문구 (daily.js)
    '오늘의 도전 {d}': 'Daily Challenge {d}',
    '방어 기록': 'Defense record',
    '방어 성공!': 'Defended!',
    '웨이브 {w}/{max} {bar}': 'Wave {w}/{max} {bar}',
    '물리친 안개 {n}마리': 'Spirits defeated {n}',
    ' · 심은 열매 {n}알': ' · Fruit planted {n}',
    '플레이 시간 {t}': 'Play time {t}',
    ' · 울타리 무피해': ' · Flawless fence',
    // 광고 (ads.js)
    '보상형 광고': 'Rewarded ad',
    '끝까지 보면 보상을 받아요': 'Watch to the end to get your reward',
    '보상 받기': 'Claim reward',
    '광고': 'Ad',
    '잠시 후 닫을 수 있어요': 'You can close this in a moment',
    '닫기': 'Close',
    // 광고 자리 (ads.js SLOTS, H-26)
    '광고 보고 이어하기': 'Watch ad to continue',
    '울타리 50%로 이번 웨이브를 이어서 해요': 'Keep going this wave with the fence at 50%',
    '광고 보고 은열매 2배': 'Watch ad for 2× silver fruit',
    '이번 판 은열매를 한 번 더 받아요': 'Get this run\'s silver fruit once more',
    '광고 보고 열매 +3': 'Watch ad for +3 fruit',
    '가진 열매에 3개를 더해요': 'Adds 3 fruit to your pouch',
    '광고 보고 은열매 +30': 'Watch ad for +30 silver fruit',
    '하루 3번까지 은열매를 받아요': 'Get silver fruit up to 3 times a day',
    '판이 끝나고 결과 화면으로 넘어갈 때': 'When a run ends, before the results screen',
    // 보상형 광고 버튼 남은 횟수 (ads.js, H-27)
    '{n}번 남음': '{n} left',
    '오늘 {n}번 남음': '{n} left today',
    '다 썼어요': 'Used up',
    // 대신 광고 창의 보상 안내 (ads.js, H-28)
    '끝까지 보면 받아요: {r}': 'Watch to the end to get: {r}',
    '그만 봐도 잃는 것은 없어요': 'Stopping early costs you nothing',
    // 보상형 광고 자리 (ui.js·game.js, H-29)
    '웨이브 {w}/{max}에서 울타리가 무너졌어요. 광고를 끝까지 보면 울타리 50%와 잠깐의 보호막으로 이번 웨이브를 이어서 할 수 있어요.':
      'The fence fell on wave {w}/{max}. Watch an ad to the end to keep playing this wave with the fence at 50% and a brief shield.',
    '다시 일어섰다!': 'Back on your feet!',
    '열매 +{n}! 다음 웨이브에서 심어 보세요': '+{n} fruit! Plant them in the next wave',
    '은열매 {n}개를 더 받았어요': 'You got {n} more silver fruit',
    '은열매 +{n}!': '+{n} silver fruit!'
  };

  // ---------- index.html 글 (열쇠 → 영어). 한국어는 HTML 원문 ----------
  var HTML_EN = {
    // 화면 이름 (aria-label)
    'a.title': 'Home', 'a.menu': 'Menu', 'a.help': 'How to Play', 'a.settings': 'Options', 'a.region': 'Choose an orchard',
    'a.squad': 'Gardener squad', 'a.battle': 'Battle', 'a.result': 'Result', 'a.daily': 'Daily Challenge', 'a.codex': 'Codex',
    'a.links': 'Shortcuts', 'a.achv': 'Achievements', 'a.stats': 'Records', 'a.shop': 'Workshop', 'a.diff': 'Difficulty',
    'a.back': 'Back', 'a.field': 'Orchard field', 'a.fence': 'Fence', 'a.seeds': 'Fruit in hand', 'a.pause': 'Pause',
    'a.skip': 'Skip tutorial', 'a.share': 'Result text to share',
    // 홈 메뉴 (영어일 때는 영어 한 줄)
    'm.start': 'Start', 'm.continue': 'Continue', 'm.options': 'Options', 'm.codex': 'Codex',
    // 공통
    'back': '‹ Back',
    // 게임 방법
    'help.title': 'How to Play',
    'help.s1': 'Defend', 'help.s1d': 'Guard the fence for 10 waves',
    'help.s2': 'Keep the beat', 'help.s2d': 'Tap the trees on the beat',
    'help.s3': 'Grow', 'help.s3d': 'Plant fruit to power up a lane',
    'help.goal.h': 'Goal',
    'help.goal': 'Protect the fence on the left and hold off 10 waves of fog spirits. A boss shows up in the 10th wave. If the fence HP (the bar at the top center of the field) hits 0, you lose. The green badge above the plant buttons shows how much fruit you have.',
    'help.beat.h': 'Night Wind Beat',
    'help.beat': 'The whole orchard sways to a single beat. The ring around each tree shrinks, and the moment it touches the tree is the beat. The beat gets faster as the waves go on.',
    'help.b1': '<b>Watering</b>: Tap a tree on the left on the beat to make that lane\'s fruit fly faster (blue bar). <b>Perfect!</b> speeds it up a lot, <b>Good!</b> a little. If you miss the beat or tap the same tree twice in one beat, you get a <b>Miss</b> and the extra speed drops.',
    'help.b2': '<b>Combo</b>: Your combo only goes up by 1 on a <b>Perfect!</b>. The higher your combo, the stronger every tree\'s fruit (up to ×1.6 by default, more with beat upgrades). A <b>Good!</b>, a <b>Miss</b>, or resting for more than 4 beats breaks the combo.',
    'help.b3': '<b>Fruit Shot</b>: Every time your combo hits 5, 10, 15…, a gardener fires golden fruit at the spirit closest to the fence (1 at 5 combo, 2 at 10, 3 from 15). Spirits that get the fruit go back to the forest. Bosses don\'t leave — they just take big damage.',
    'help.b4': '<b>♪ Beat upgrades and treasures</b>: Upgrades and treasures tagged "Beat" change the beat rules. They can widen the timing window, raise the combo cap, throw an extra fruit on a Perfect!, blast a whole lane every 10 combo, or keep your combo going after a miss.',
    'help.b5': '<b>Plant and use skills on the beat too</b>: Plant right on the beat and one fruit grows like two. Skills get stronger on the beat: Perfect! ×1.5, Good! ×1.2.',
    'help.b6': 'If the beat feels too hard, set <b>Beat timing window</b> to <b>Wide</b> in Options.',
    'help.tree.h': 'Trees and Fruit',
    'help.tree': 'Each lane has one tree, and it throws fruit on its own when a spirit shows up in that lane. Defeated spirits sometimes drop fruit. Press a <b>Plant</b> button on the left of the field to plant fruit under that lane\'s tree, making its fruit hit harder and fly faster. With no fruit in hand, the plant buttons dim.',
    'help.gard.h': 'Gardeners',
    'help.gard': 'Each lane has one front slot and one back slot. Front-row gardeners (blue slot) hold spirits in place and fight up close, and back-row gardeners (purple slot) attack from afar. Flying spirits can\'t be held. Tap a gardener, then tap another slot to move there or swap places. Downed gardeners come back with half HP when the wave ends.',
    'help.skill.h': 'Skills, Upgrades and Treasures',
    'help.skill': 'The buttons on the right of the field use each gardener\'s own skill. After every wave you pick an upgrade, and after the 3rd and 6th waves you pick a treasure. When a run ends you earn Silver Fruit, which you can spend in the Workshop (at the top of the Codex) to recruit new gardeners or buy permanent upgrades.',
    'help.ctrl.h': 'Controls',
    'help.c1': 'Play with your phone held sideways (turning it upright pauses the game; turn it back to keep playing).',
    'help.c2': 'Phone: tap a tree = water (on the beat), plant buttons on the left = plant fruit in that lane (left thumb), tap a gardener → tap a slot = move, buttons on the right = skills (right thumb)',
    'help.c3': 'Keyboard: <b>A·S·D</b> water lanes 1·2·3, <b>1·2·3</b> plant in that lane, <b>Q·W·E</b> skills, <b>Arrow keys</b> choose a slot, <b>Space·Enter</b> pick up / drop a gardener, <b>P·Esc</b> pause',
    'help.c4': 'Upgrade and treasure picks: choose with keys <b>1–5</b>',
    'help.fog.h': 'Telling Spirits Apart',
    'help.fog': 'Spirits are told apart by color and a shape symbol. Outer ring = shield (blocks a few attacks), dotted ring = slowed, shadow = flying spirit.',
    'help.prev.h': 'Wave Preview',
    'help.prev': 'The small tag at the top left of the field shows which spirits come in this wave and how many. When picking an upgrade you can preview the next wave, so plan which lane to power up. (flying) = flying spirit (the front row can\'t hold it), (boss) = the final wave\'s boss.',
    'help.diff.h': 'Difficulty',
    'help.diff': 'Each orchard can be played on Normal, Hard or Nightmare. Harder levels bring tougher and more numerous spirits, but also more Silver Fruit. Best records and clear marks are kept for each difficulty.',
    'help.daily.h': 'Daily Challenge',
    'help.daily': 'Every day, everyone plays the same run once, with the same orchard, difficulty and gardeners. Share your score with friends using <b>Copy Result</b> on the result screen.',
    // 옵션
    'set.title': 'Options',
    'set.help': '❓ How to Play',
    'set.tutorial': 'Replay Tutorial',
    'set.wipe': 'Erase Records',
    'set.wipeWarn': 'Your Silver Fruit, gardeners, achievements and records will all be gone. Erase everything?',
    'set.wipeYes': 'Erase',
    'set.wipeNo': 'Cancel',
    // 지역·편성
    'region.title': 'Choose an Orchard',
    'squad.title': 'Gardeners',
    'squad.hint': 'Bring up to three gardeners. The <span class="tag-front">front row</span> holds spirits in place, and the <span class="tag-back">back row</span> attacks from afar.',
    'squad.go': 'Go ▶',
    // 전투
    'plant.0': '<span aria-hidden="true">🌱</span> <span class="pl-long">Plant lane 1</span><span class="pl-short">Lane 1</span>',
    'plant.1': '<span aria-hidden="true">🌱</span> <span class="pl-long">Plant lane 2</span><span class="pl-short">Lane 2</span>',
    'plant.2': '<span aria-hidden="true">🌱</span> <span class="pl-long">Plant lane 3</span><span class="pl-short">Lane 3</span>',
    // 결과 (제목·다시 하기는 ui.js showResult 가 T 로 채운다)
    'res.change': 'Change Orchard & Gardeners',
    'res.share': 'Copy Result',
    'res.home': 'Home',
    'res.shareMsg': 'Couldn\'t copy automatically. Press and hold the text above to copy it.',
    // 오늘의 도전
    'daily.title': 'Daily Challenge',
    'daily.hint': 'Everyone plays the same run once a day. This result doesn\'t count toward orchard records or unlocks.',
    'daily.log': 'Past Challenges',
    // 도감·업적·기록·작업실
    'codex.title': 'Codex',
    'codex.achv': '<span aria-hidden="true">🏆</span> Achievements',
    'codex.stats': '<span aria-hidden="true">📊</span> Records',
    'codex.shop': '<span aria-hidden="true">🛠️</span> Workshop',
    'tab.gardener': 'Gardeners', 'tab.enemy': 'Spirits', 'tab.boss': 'Bosses', 'tab.upgrade': 'Upgrades', 'tab.relic': 'Treasures',
    'achv.title': 'Achievements',
    'stats.title': 'Records',
    'shop.title': 'Workshop',
    'shop.recruit': 'Recruit Gardeners',
    'shop.work': 'Permanent Upgrades',
    // 일시정지·광고 (고르기 창 제목·광고 제목·닫기는 ui.js·ads.js 가 T 로 채운다)
    'pause.title': 'Paused',
    'pause.resume': '▶ Resume',
    'pause.help': 'How to Play',
    'pause.settings': 'Options',
    'pause.quit': 'Give Up',
    'pause.quitMsg': 'Press again to give up this run.',
    'ad.skip': 'Stop watching',
    'revive.title': 'The fence fell',
    'revive.giveup': 'Give up and see results',
    // 세로 안내 (한국어 제목 '가로로 돌려 주세요' 는 늘 그대로 두고, 영어일 때 아래 줄을 더한다)
    'rotate.sub': 'Beat Orchard is a landscape-only game. Turn your phone sideways to keep playing.'
  };

  // ---------- 콘텐츠 (data.js) — 분류마다 id → [이름, 설명, 기술 이름, 기술 설명] ----------
  var CONTENT_EN = {
    REGIONS: {
      dew: ['Dewy Slope', 'The first orchard. Most spirits here drift in slowly.'],
      moon: ['Moonrise Bank', 'Flying firefly spirits join the crowd.'],
      frost: ['Frost Fence', 'Full of tough, heavily armored spirits.'],
      ash: ['Ashen Brook', 'Watch out for spirits that split apart when defeated.'],
      hill: ['Apple Hill', 'The hill where the oldest spirit sleeps.']
    },
    ENEMIES: {
      puff: ['Fog Puff', 'The most common spirit. It rolls in slowly.'],
      drip: ['Droplet Fog', 'Small but quick.'],
      wisp: ['Wisp', 'Floats in the air and slips right past front-row gardeners.'],
      roller: ['Rolling Fog', 'Big and slow.'],
      shell: ['Shell Fog', 'Its hard shell reduces damage taken by 2.'],
      twin: ['Twin Fog', 'Splits into two Droplet Fogs when defeated.'],
      moss: ['Moss Fog', 'Slowly regains health over time.'],
      lamp: ['Firefly Fog', 'Flies in, twinkling.'],
      frost: ['Frost Fog', 'Cold and tough.'],
      bubble: ['Bubble Fog', 'A bubble shield blocks two attacks.'],
      rush: ['Gust Fog', 'Speeds up below half health.'],
      stone: ['Stone Fog', 'Heavy and hard as a rock.'],
      ash: ['Ash Fog', 'Defeat it and two Wisps fly out.'],
      smog: ['Smog', 'Regains health quickly.'],
      shade: ['Shade Fog', 'Flies in silently like a shadow.'],
      thorn: ['Thorn Fog', 'A thorny shield blocks three attacks.'],
      tide: ['Tide Fog', 'Below half health, it surges in like the tide.'],
      gloom: ['Storm Cloud', 'Scatters into three Fog Puffs when defeated.'],
      flick: ['Flicker Fog', 'Darts in the blink of an eye.'],
      elder: ['Old Fog', 'As tough as it is old, and it keeps regaining health.'],
      haze: ['Heat Haze', 'So blurry that the first attack misses.'],
      mire: ['Bog Fog', 'Clingy, sticky and hard to bring down.'],
      spark: ['Ember Fog', 'Hops in fast like a flying spark.'],
      dusk: ['Dusk Fog', 'A sunset shield blocks four attacks, and it splits into two Shade Fogs when defeated.']
    },
    BOSSES: {
      b_moss: ['Moss Chief', 'Keeps calling in Fog Puffs.'],
      b_halo: ['Moon Halo', 'Wraps itself in a moonlight shield now and then.'],
      b_frost: ['Frost Lord', 'Suddenly speeds up, gliding as if on ice.'],
      b_ash: ['Ashen Twinhead', 'Pours out Ash Fogs.'],
      b_elder: ['Primeval Fog', 'Hops from lane to lane.']
    },
    GARDENERS: {
      hedge: ['Chestnut', 'A hedgehog who holds the front row firmly.', 'Thorn Hedge', 'Gives the fence a 40-point shield. The shield slowly fades over time.'],
      frog: ['Croaky', 'A frog who flicks water drops from the back row.', 'Puddle', 'Slows spirits in the same lane for 4 seconds.'],
      squirrel: ['Acorn', 'A squirrel who throws acorns at lightning speed.', 'Hidden Stash', 'Brings out 2 hidden fruit.'],
      turtle: ['Shellby', 'A slow but very sturdy turtle.', 'Lazy Nap', 'Heals all gardeners by 35% and revives downed gardeners.'],
      bear: ['Bearbell', 'A bear whose every hit lands heavy.', 'Ground Roll', 'Deals 45 damage to all spirits in the same lane.'],
      badger: ['Digger', 'A badger with well-rounded attack and health.', 'Battle Cry', 'All gardeners deal 1.5× damage for 6 seconds.'],
      owl: ['Hoot', 'An owl who strikes hard from far away.', 'Feather Rain', 'Deals 30 damage to spirits in every lane.'],
      bee: ['Buzz', 'A honeybee who stings nonstop.', 'Hive Shake', 'Deals 30 damage to all spirits in the same lane.'],
      duck: ['Quack', 'A duck who backs up the back row.', 'Feather Wall', 'Gives the fence a 60-point shield. The shield slowly fades over time.'],
      ladybug: ['Dotty', 'A ladybug who looks after every teammate.', 'Dewdrop', 'Heals all gardeners by 50% and revives downed gardeners.'],
      fox: ['Ripple', 'A fox who fights swiftly in the front row.', 'Ripple Tail', 'Slows spirits in the same lane for 5 seconds.'],
      mouse: ['Squeak', 'A mouse with an uncanny nose for fruit.', 'Fruit Burrow', 'Brings out 4 hidden fruit.']
    },
    UPGRADES: {
      u01: ['Sturdy Branches', 'Tree fruit damage +15%'],
      u02: ['Quick Fruit', 'Tree attack speed +12%. On a Perfect!, that lane\'s tree throws one extra fruit'],
      u03: ['Handful of Compost', 'Effect per planted fruit +3%'],
      u04: ['Strong Wrists', 'Gardener attack +15%'],
      u05: ['Thick Apron', 'Gardener HP +20%'],
      u06: ['Busy Hands', 'Gardener attack speed +12%'],
      u07: ['Piercing Fruit', 'Attacks pierce 1 more spirit'],
      u08: ['Sharp Eyes', 'Crit chance +8%, Perfect! window +15%'],
      u09: ['Heavy Hit', 'Crit damage multiplier +0.5'],
      u10: ['Sticky Juice', 'Hits have a 15% chance to slow spirits'],
      u11: ['Splashing Juice', 'Deals 20% of the damage to nearby spirits too'],
      u12: ['Fence Brace', 'Max fence HP +15, repairs 15 right away'],
      u13: ['Fruit Pouch', 'Fruit drop chance +8%'],
      u14: ['Short Breath', 'Skill cooldown −15%'],
      u15: ['Silver Eye', 'Silver Fruit earned at the end of a run +15%'],
      u16: ['Fence Vines', 'Repairs the fence by 3 after each wave'],
      u17: ['Shell Breaker', 'Ignores 2 spirit armor'],
      u18: ['Three Fruit', 'Get 3 fruit right away'],
      u19: ['Front Shield', 'Front-row gardeners take 2 less damage'],
      u20: ['Big Game Hunter', 'Damage to bosses +25%'],
      u21: ['Sky Aim', 'Damage to flying spirits +30%'],
      u22: ['Wide View', 'Future upgrade picks offer one more choice'],
      u23: ['Warm Tea', 'Heals gardeners by 25% after each wave'],
      u24: ['Repair Hammer', 'Repairs the fence by 30 right away'],
      u25: ['Mighty Branches', 'Fruit damage +25%, tree attack speed −8%'],
      u26: ['Twig Barrage', 'Tree attack speed +25%, fruit damage −10%'],
      u27: ['Deep Roots', 'Effect per planted fruit +5%'],
      u28: ['In Sync', 'Gardener attack +10%, attack speed +8%. Fruit damage per combo 4% → 5%'],
      u29: ['Tough Boots', 'Gardener HP +35%'],
      u30: ['Read the Wind', 'Crit chance +5%, slow chance +8%, Good! window +15%'],
      u31: ['Wide Basket', 'Fruit drop chance +12%'],
      u32: ['Clear Mind', 'Skill cooldown −25%'],
      u33: ['Fruit Fireworks', 'Deals 35% of the damage to nearby spirits too. Every 10 combo, all spirits in that lane take blast damage'],
      u34: ['Needle Fruit', 'Attacks pierce 2 more spirits'],
      u35: ['First Frost Blade', 'Crit damage multiplier +1, crit chance +5%'],
      u36: ['Village Cheer', 'Fruit and gardener damage +10%, max fence HP +10, combo cap +5'],
      u37: ['Quiet Field', 'Repairs the fence by 5 after each wave'],
      u38: ['Five Fruit', 'Get 5 fruit right away'],
      u39: ['Hold the Line', 'Gardener HP +15%, front row takes 1 less damage. Once per wave, a Good! or Miss won\'t break your combo'],
      u40: ['Dewy Leaves', 'Tree attack speed +8%, fruit effect +2%. Beat watering effect +25%']
    },
    RELICS: {
      r01: ['Old Watering Can', 'Tree attack speed +20%. Beat watering effect +30%'],
      r02: ['Silver Shears', 'Crit chance +12%'],
      r03: ['Golden Compost Bin', 'Effect per planted fruit +6%'],
      r04: ['Wisteria Staff', 'Gardener attack +25%'],
      r05: ['Quilted Vest', 'Gardener HP +40%'],
      r06: ['Pinwheel', 'Skill cooldown −30%'],
      r07: ['Frost Bell', 'Hits have a 25% chance to slow spirits'],
      r08: ['Cracked Walnut', 'Attacks pierce 2 more spirits'],
      r09: ['Honey Jar', 'Heals gardeners by 40% after each wave'],
      r10: ['Stone Wall Piece', 'Max fence HP +40, repairs 40 right away'],
      r11: ['Firefly Jar', 'Damage to flying spirits +60%'],
      r12: ['Great Scythe', 'Damage to bosses +50%'],
      r13: ['Feather Hat', 'Fruit drop chance +15%'],
      r14: ['Iron Pot', 'Front-row gardeners take 4 less damage'],
      r15: ['Silver Piggy Bank', 'Silver Fruit earned +40%'],
      r16: ['Round Lens', 'Crit damage multiplier +1.2'],
      r17: ['Vine Knot', 'Repairs the fence by 8 after each wave'],
      r18: ['Forked Branch', 'Deals 40% of the damage to nearby spirits too. On a Perfect!, that lane\'s tree throws one extra fruit'],
      r19: ['Rusty Nail', 'Ignores 4 spirit armor'],
      r20: ['Fruit Necklace', 'Get 8 fruit right away'],
      r21: ['Sundial', 'Gardener attack speed +25%. Once per wave, a Good! or Miss won\'t break your combo'],
      r22: ['Dried Bouquet', 'Fruit damage +30%, combo cap +10'],
      r23: ['Little Bell', 'Skill cooldown −15%, gardener attack +10%, Perfect! window +25%'],
      r24: ['Old Map', 'Silver Fruit earned +20%, fruit drop chance +8%']
    },
    WORKSHOP: {
      w01: ['Sturdy Fence', 'Max fence HP +20'],
      w02: ['First Compost', 'Start with 2 fruit'],
      w03: ['Sharpened Branches', 'Fruit damage +10%'],
      w04: ['Mended Gloves', 'Gardener attack +10%'],
      w05: ['New Apron', 'Gardener HP +15%'],
      w06: ['Fruit Sack', 'Fruit drop chance +5%'],
      w07: ['Whistle', 'Skill cooldown −10%'],
      w08: ['Silver Scale', 'Silver Fruit earned +10%'],
      w09: ['Vine Care', 'Repairs the fence by 2 after each wave'],
      w10: ['Shiny Magnifier', 'Crit chance +4%'],
      w11: ['Second Basket', 'Start with 3 more fruit'],
      w12: ['Long-Blooming Tree', 'Tree attack speed +10%'],
      w13: ['Extra Choice', 'Upgrade picks offer one more choice'],
      w14: ['Solid Stone Wall', 'Max fence HP +30'],
      w15: ['Root Fertilizer', 'Effect per planted fruit +2%'],
      w16: ['Front Helmet', 'Front-row gardeners take 1 less damage']
    },
    ACHIEVEMENTS: {
      a01: ['First Night', 'Finish your first run'],
      a02: ['First Morning', 'Reclaim an orchard'],
      a03: ['Fog Hunter', 'Defeat 100 spirits'],
      a04: ['Clear Skies', 'Defeat 1,000 spirits'],
      a05: ['Green Thumb', 'Plant 50 fruit'],
      a06: ['Orchard Keeper', 'Plant 500 fruit'],
      a07: ['Boss Hunt', 'Defeat a boss for the first time'],
      a08: ['Five Bosses', 'Defeat bosses five times'],
      a09: ['Dewy Slope Guardian', 'Reclaim Dewy Slope'],
      a10: ['Moonrise Bank Guardian', 'Reclaim Moonrise Bank'],
      a11: ['Frost Fence Guardian', 'Reclaim Frost Fence'],
      a12: ['Ashen Brook Guardian', 'Reclaim Ashen Brook'],
      a13: ['Dawn on the Hill', 'Reclaim Apple Hill'],
      a14: ['Flawless Fence', 'Reclaim an orchard without the fence ever taking damage'],
      a15: ['Practiced Hands', 'Use skills 50 times'],
      a16: ['Silver Jar', 'Collect 200 Silver Fruit in total'],
      a17: ['Pick and Pick Again', 'Pick upgrades 100 times'],
      a18: ['Treasure Chest', 'Discover 10 treasures'],
      a19: ['All Together', 'Recruit all 12 gardeners'],
      a20: ['Seasoned Veteran', 'Clear 100 waves in total'],
      a21: ['Tenth Night', 'Play 10 runs'],
      a22: ['Lush Lane', 'Plant 20 fruit in one lane'],
      a23: ['Fog Codex', 'Meet all 24 spirits'],
      a24: ['Workshop Complete', 'Buy every permanent upgrade']
    },
    DIFFICULTIES: {
      normal: ['Normal', 'A good place to start.'],
      hard: ['Hard', 'Stronger spirits come in greater numbers. Silver Fruit ×1.6.'],
      nightmare: ['Nightmare', 'Thick fog rolls in without end. Silver Fruit ×2.5.']
    }
  };
  var TIPS_EN = [
    'Trees throw fruit on their own when a spirit shows up in their lane.',
    'The more fruit you plant in a lane, the harder and faster its tree throws.',
    'Front-row gardeners hold spirits in place, but they can\'t stop flying ones.',
    'Downed gardeners come back with half HP when the wave ends.',
    'You can pick a treasure after the 3rd and 6th waves.',
    'A boss shows up in the 10th wave.'
  ];
  var CONTENT_KINDS = ['REGIONS', 'ENEMIES', 'BOSSES', 'GARDENERS', 'UPGRADES', 'RELICS', 'WORKSHOP', 'ACHIEVEMENTS', 'DIFFICULTIES'];

  function fill(s, vars) {
    if (!vars) return s;
    return s.replace(/\{(\w+)\}/g, function (m, k) { return Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m; });
  }
  // 화면 글 하나: 영어 설정이고 영어가 있으면 영어, 아니면 한국어 원문
  function T(ko, vars) {
    var s = lang === 'en' && Object.prototype.hasOwnProperty.call(EN, ko) ? EN[ko] : ko;
    return fill(s, vars);
  }
  // [한국어, 영어] 짝에서 고른다 (같은 한국어가 자리마다 다른 영어가 되는 곳: 옵션 값 등)
  function pick(ko, en) { return lang === 'en' && en ? en : ko; }

  // index.html 의 data-i18n 글을 지금 언어로. 한국어 원문은 처음 볼 때 요소에 기억해 둔다
  function applyStatic(root) {
    root = root || document;
    var i, el, k;
    var list = root.querySelectorAll('[data-i18n]');
    for (i = 0; i < list.length; i++) {
      el = list[i];
      if (el._ko === undefined) el._ko = el.innerHTML;
      k = el.getAttribute('data-i18n');
      var html = lang === 'en' && HTML_EN[k] ? HTML_EN[k] : el._ko;
      if (el.innerHTML !== html) el.innerHTML = html;
    }
    list = root.querySelectorAll('[data-i18n-aria]');
    for (i = 0; i < list.length; i++) {
      el = list[i];
      if (el._koAria === undefined) el._koAria = el.getAttribute('aria-label') || '';
      k = el.getAttribute('data-i18n-aria');
      el.setAttribute('aria-label', lang === 'en' && HTML_EN[k] ? HTML_EN[k] : el._koAria);
    }
    list = root.querySelectorAll('[data-i18n-title]');
    for (i = 0; i < list.length; i++) {
      el = list[i];
      if (el._koTitle === undefined) el._koTitle = el.getAttribute('title') || '';
      k = el.getAttribute('data-i18n-title');
      el.setAttribute('title', lang === 'en' && HTML_EN[k] ? HTML_EN[k] : el._koTitle);
    }
  }

  // data.js 콘텐츠의 이름·설명을 지금 언어로 바꿔 끼운다. 한국어 원문은 항목마다 _ko 에 남긴다
  function applyContent() {
    var GD = window.GD;
    if (!GD) return;
    CONTENT_KINDS.forEach(function (kind) {
      var table = CONTENT_EN[kind] || {};
      (GD[kind] || []).forEach(function (d) {
        if (!d._ko) d._ko = { name: d.name, desc: d.desc, sname: d.skill ? d.skill.name : '', sdesc: d.skill ? d.skill.desc : '' };
        var e = lang === 'en' ? table[d.id] : null;
        d.name = (e && e[0]) || d._ko.name;
        d.desc = (e && e[1]) || d._ko.desc;
        if (d.skill) {
          d.skill.name = (e && e[2]) || d._ko.sname;
          d.skill.desc = (e && e[3]) || d._ko.sdesc;
        }
      });
    });
    if (Array.isArray(GD.HELP_TIPS)) {
      if (!GD._tipsKo) GD._tipsKo = GD.HELP_TIPS.slice();
      for (var i = 0; i < GD.HELP_TIPS.length; i++) GD.HELP_TIPS[i] = (lang === 'en' && TIPS_EN[i]) || GD._tipsKo[i];
    }
  }

  function setLang(l) {
    lang = l === 'en' ? 'en' : 'ko';
    try { document.documentElement.setAttribute('lang', lang); } catch (e) { /* 문서 없음 */ }
    applyContent();
    if (typeof document !== 'undefined' && document.querySelectorAll) applyStatic(document);
  }

  window.I18N = {
    T: T,
    pick: pick,
    set: setLang,
    lang: function () { return lang; },
    applyStatic: applyStatic,
    applyContent: applyContent,
    langs: [{ id: 'ko', name: '한국어' }, { id: 'en', name: 'English' }]
  };
  window.T = T;
})();
