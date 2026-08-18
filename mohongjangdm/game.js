const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const vendingScreen = document.getElementById("vendingScreen");
const gameOverScreen = document.getElementById("gameOverScreen");

const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const nextStageButton = document.getElementById("nextStageButton");
const infiniteStartButton = document.getElementById("infiniteStartButton");

const buyIgnoreButton = document.getElementById("buyIgnoreButton");
const buyAutoReplyButton = document.getElementById("buyAutoReplyButton");
const buyCoffeeButton = document.getElementById("buyCoffeeButton");

const mobileLeftButton = document.getElementById("mobileLeftButton");
const mobileRightButton = document.getElementById("mobileRightButton");

const gameArea = document.getElementById("gameArea");
const player = document.getElementById("player");
const statusText = document.getElementById("statusText");
const mapMarker = document.getElementById("mapMarker");

const stageName = document.getElementById("stageName");
const stageTimeText = document.getElementById("stageTimeText");
const timeLabel = document.getElementById("timeLabel");
const coinText = document.getElementById("coinText");
const vendingCoinText = document.getElementById("vendingCoinText");
const heartText = document.getElementById("heartText");
const ignoreText = document.getElementById("ignoreText");
const autoReplyText = document.getElementById("autoReplyText");
const coffeeText = document.getElementById("coffeeText");

const ownedIgnoreText = document.getElementById("ownedIgnoreText");
const ownedAutoReplyText = document.getElementById("ownedAutoReplyText");
const ownedCoffeeText = document.getElementById("ownedCoffeeText");

const vendingTitle = document.getElementById("vendingTitle");
const vendingMessage = document.getElementById("vendingMessage");
const shopStatusText = document.getElementById("shopStatusText");

const endingBadge = document.getElementById("endingBadge");
const endingTitle = document.getElementById("endingTitle");
const endingMessage = document.getElementById("endingMessage");
const finalStageText = document.getElementById("finalStageText");
const rankTitleText = document.getElementById("rankTitle");

const stages = [
  {
    name: "스테이지 1 · 캠퍼스 입성",
    clearName: "캠퍼스 입성 성공!",
    duration: 25,
    bossSpeed: 155,
    loverSpeed: 145,
    spawnMs: 850,
    extraSpawnAt: 999,
    backgroundClass: "",
    pattern: "normal"
  },
  {
    name: "스테이지 2 · 대학생활 적응",
    clearName: "대학생활 적응 성공!",
    duration: 35,
    bossSpeed: 175,
    loverSpeed: 165,
    spawnMs: 820,
    extraSpawnAt: 16,
    backgroundClass: "stage-2",
    pattern: "double"
  },
  {
    name: "스테이지 3 · 청춘 방어전",
    clearName: "청춘 방어 성공!",
    duration: 50,
    bossSpeed: 190,
    loverSpeed: 178,
    spawnMs: 760,
    extraSpawnAt: 18,
    backgroundClass: "stage-3",
    pattern: "zigzag"
  }
];

const infiniteStageBase = {
  name: "무한모드 · 끝나지 않는 입교설명회",
  bossSpeed: 190,
  loverSpeed: 178,
  spawnMs: 820,
  extraSpawnAt: 8,
  backgroundClass: "infinite-stage",
  pattern: "infinite"
};

let infiniteStage = { ...infiniteStageBase };

const bossMessagesByStage = {
  1: [
    "신입생 맞지?",
    "3사 알고 있니?",
    "너 리더십 있어 보인다",
    "아들~ 군대영장 나왔어",
    "3사 입교 설명 들어볼래?"
  ],
  2: [
    "동아리보다 3사 어때?",
    "축제 가기 전에 3사 어때?",
    "학식 먹고 상담 가능?",
    "너 장교상인데?",
    "지원서 5분이면 끝나"
  ],
  3: [
    "3사 갈래?",
    "과잠보다 전투복 어때?",
    "새내기 말고 생도 어때?",
    "이제 서명만 하면 돼"
  ],
  infinite: [
    "3사 갈갈래?"
  ]
};

const loverMessagesByHeart = {
  3: [
    "오늘 끝나고 뭐해?",
    "같이 학식 먹을래?",
    "같이 축제 갈래?",
    "동아리 같이 들어갈래?",
    "카페 갈래?",
    "너 번호 저장해도 돼?"
  ],
  2: [
    "공강인데 뭐해?",
    "오늘 같이 가기로 했잖아",
    "소개팅 받을 거야 말 거야?",
    "동아리방에서 기다리는데?",
  ],
  1: [
    "너 입교하는 거야?",
    "새내기 라이프 끝났네",
    "소개팅은 다른 애랑 할게",
    "너 진짜 생각 중이야?",
    "청춘보다 설명회야?"
  ]
};

const infiniteLoverMessagesByHeart = {
  3: [
    "너 입교하는 거야?",
  ],
  2: [
    "너 입교하는 거야?",
  ],
  1: [
    "너 입교하는 거야?",
  ]
};

const bossEndMessages = [
  "모홍장의 설명회는 설명회가 아니었습니다. 포획 작전이었습니다.",
  "정신을 차려보니 입교지원서가 제출되어 있었습니다.",
  "청춘은 도망쳤고, 지원서는 남았습니다.",
  "공강 시간은 사라지고 입교 일정표가 도착했습니다.",
  "수강신청보다 빠르게 입교지원서가 접수되었습니다."
];

const loverEndMessages = [
  "새내기 라이프가 조용히 멀어졌습니다.",
  "썸은 지나갔고 설명회만 남았습니다.",
  "공강 카페 약속이 사라졌습니다.",
  "축제도, 동아리도, 소개팅도 놓쳤습니다.",
  "청춘 게이지가 조용히 0이 되었습니다."
];

let stats = {
  bossHit: 0,
  loverCaught: 0,
  loverMissed: 0,
  coinsCollected: 0,
  ignoreUsed: 0,
  autoReplyUsed: 0,
  infiniteSeconds: 0
};

let gameRunning = false;
let currentStageIndex = 0;
let stageTimeLeft = 0;
let playerX = 0;
let hearts = 3;
let coins = 0;
let ignoreTickets = 0;
let autoReplyTickets = 0;
let coffeeTickets = 0;
let coffeeBoostActive = false;
let elapsedTime = 0;
let infiniteMode = false;
let infiniteTime = 0;
let lastInfiniteShopAt = 0;

let spawnInterval = null;
let stageTimer = null;
let animationFrame = null;
let statusTimer = null;
let flashTimer = null;
let lastFrameTime = 0;

let fallingItems = [];
let keys = { left: false, right: false };

// 콤보 시스템
let loverCombo = 0;
let comboTimer = null;

// 총 플레이 시간
let totalPlaySeconds = 0;
let playTimeTimer = null;

startButton.addEventListener("click", startNewRun);
restartButton.addEventListener("click", startNewRun);
nextStageButton.addEventListener("click", handleNextStageButton);
infiniteStartButton.addEventListener("click", startInfiniteMode);

buyIgnoreButton.addEventListener("click", () => buyItem("ignore"));
buyAutoReplyButton.addEventListener("click", () => buyItem("autoReply"));
buyCoffeeButton.addEventListener("click", () => buyItem("coffee"));

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    keys.left = true;
  }

  if (e.key === "ArrowRight") {
    e.preventDefault();
    keys.right = true;
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") keys.left = false;
  if (e.key === "ArrowRight") keys.right = false;
});

bindHoldButton(mobileLeftButton, "left");
bindHoldButton(mobileRightButton, "right");

function bindHoldButton(button, direction) {
  if (!button) return;

  const start = (event) => {
    event.preventDefault();
    button.blur();
    keys[direction] = true;
  };

  const stop = (event) => {
    event.preventDefault();
    button.blur();
    keys[direction] = false;
  };

  button.addEventListener("pointerdown", start);
  button.addEventListener("pointerup", stop);
  button.addEventListener("pointercancel", stop);
  button.addEventListener("pointerleave", stop);

  button.addEventListener("touchstart", start, { passive: false });
  button.addEventListener("touchend", stop, { passive: false });
}

function handleNextStageButton() {
  if (infiniteMode) {
    continueInfiniteMode();
    return;
  }

  startCurrentStage();
}

function startNewRun() {
  currentStageIndex = 0;
  hearts = 3;
  coins = 0;
  ignoreTickets = 0;
  autoReplyTickets = 0;
  coffeeTickets = 0;
  coffeeBoostActive = false;
  elapsedTime = 0;
  infiniteMode = false;
  infiniteTime = 0;
  lastInfiniteShopAt = 0;
  infiniteStage = { ...infiniteStageBase };

  stats = {
    bossHit: 0,
    loverCaught: 0,
    loverMissed: 0,
    coinsCollected: 0,
    ignoreUsed: 0,
    autoReplyUsed: 0,
    infiniteSeconds: 0
  };

  loverCombo = 0;
  clearTimeout(comboTimer);
  totalPlaySeconds = 0;
  clearInterval(playTimeTimer);

  const cardEl = document.getElementById("resultCard");
  if (cardEl) cardEl.style.display = "none";

  infiniteStartButton.classList.add("hidden");
  nextStageButton.textContent = "다음 스테이지 시작";

  resetGameAreaFeedback();
  clearAllFallingItems();
  showScreen("game");
  startCurrentStage();
}

function startInfiniteMode() {
  infiniteMode = true;
  infiniteTime = 0;
  lastInfiniteShopAt = 0;
  hearts = 3;
  coffeeBoostActive = false;
  infiniteStage = { ...infiniteStageBase };

  const cardEl = document.getElementById("resultCard");
  if (cardEl) cardEl.style.display = "none";

  infiniteStartButton.classList.add("hidden");

  resetGameAreaFeedback();
  clearAllFallingItems();

  vendingTitle.textContent = "심야 자판기 도착";
  vendingMessage.textContent = "모홍장의 집요함은 계속됩니다. 아이템을 정비한 뒤 무한모드에 들어갑니다.";
  shopStatusText.textContent = "무한모드 전에 필요한 아이템을 구매하세요.";
  nextStageButton.textContent = "무한모드 시작";

  updateHud();
  updateVendingHud();
  showScreen("vending");
}

function continueInfiniteMode() {
  resetGameAreaFeedback();
  clearAllFallingItems();
  showScreen("game");
  startCurrentStage();
}

function startCurrentStage() {
  const stage = getCurrentStage();

  gameRunning = false;
  fallingItems = [];
  keys.left = false;
  keys.right = false;
  elapsedTime = 0;

  if (infiniteMode) {
    stageTimeLeft = 0;
  } else {
    stageTimeLeft = stage.duration;
  }

  clearAllFallingItems();
  stopTimers();
  resetGameAreaFeedback();
  showScreen("game");
  applyStageVisual();

  stageName.textContent = stage.name;
  timeLabel.textContent = infiniteMode ? "생존 시간" : "남은 시간";
  stageTimeText.textContent = infiniteMode ? infiniteTime : stageTimeLeft;

  const areaWidth = gameArea.clientWidth;
  playerX = areaWidth / 2 - player.clientWidth / 2;
  updatePlayerPosition();
  updateHud();
  updateMapProgress();

  // 카운트다운 3·2·1
  let count = 3;
  showStatus(`${count}...`);
  const countInterval = setInterval(() => {
    count -= 1;
    if (count > 0) {
      showStatus(`${count}...`);
    } else {
      clearInterval(countInterval);
      showStatus(infiniteMode ? "무한 입교설명회 진행 중입니다." : "모홍장 멘트는 피하고, 청춘 이벤트는 받으세요.");
      if (coffeeTickets > 0) {
        coffeeBoostActive = true;
        showStatus(`에너지드링크 ${coffeeTickets}개 효과 적용! 이동속도 증가 ⚡`);
      } else {
        coffeeBoostActive = false;
      }

      gameRunning = true;
      spawnInterval = setInterval(spawnWave, stage.spawnMs);

      // 플레이타임 타이머
      playTimeTimer = setInterval(() => {
        if (gameRunning) totalPlaySeconds += 1;
      }, 1000);

      stageTimer = setInterval(() => {
        if (!gameRunning) return;

        if (infiniteMode) {
          infiniteTime += 1;
          stats.infiniteSeconds = infiniteTime;
          stageTimeText.textContent = infiniteTime;
          updateInfiniteDifficulty();
          updateMapProgress();

          if (infiniteTime > 0 && infiniteTime % 30 === 0 && infiniteTime !== lastInfiniteShopAt) {
            lastInfiniteShopAt = infiniteTime;
            enterInfiniteShop();
          }

          return;
        }

        stageTimeLeft -= 1;
        stageTimeText.textContent = stageTimeLeft;
        updateMapProgress();

        if (stageTimeLeft <= 0) clearStage();
      }, 1000);

      lastFrameTime = performance.now();
      animationFrame = requestAnimationFrame(gameLoop);
    }
  }, 700);
}

function enterInfiniteShop() {
  gameRunning = false;
  stopTimers();
  resetGameAreaFeedback();
  clearAllFallingItems();

  vendingTitle.textContent = `심야 자판기 도착 · ${infiniteTime}초 생존`;
  vendingMessage.textContent = "모홍장의 입교설명회는 계속됩니다. 잠깐 정비하고 다시 버티세요.";
  shopStatusText.textContent = "무한모드에서도 아이템을 구매할 수 있습니다.";
  nextStageButton.textContent = "무한모드 계속";

  updateHud();
  updateVendingHud();
  showScreen("vending");
}

function clearStage() {
  gameRunning = false;
  stopTimers();
  resetGameAreaFeedback();
  clearAllFallingItems();

  const clearedStage = getCurrentStage();
  currentStageIndex += 1;

  if (currentStageIndex >= stages.length) {
    endGame("success");
    return;
  }

  vendingTitle.textContent = clearedStage.clearName;
  vendingMessage.textContent = "청춘은 지켰지만, 아직 방심하면 안 됩니다. 자판기에서 정비하세요.";
  shopStatusText.textContent = "필요한 아이템을 구매하세요.";
  nextStageButton.textContent = "다음 스테이지 시작";

  updateHud();
  updateVendingHud();
  showScreen("vending");
}

function spawnWave() {
  if (!gameRunning) return;

  const stage = getCurrentStage();
  const elapsed = infiniteMode ? infiniteTime : stage.duration - stageTimeLeft;

  createFallingItem();

  if (stage.pattern === "double" && elapsed >= stage.extraSpawnAt) {
    setTimeout(() => { if (gameRunning) createFallingItem("boss"); }, 260);
  } else if (elapsed >= stage.extraSpawnAt) {
    setTimeout(() => { if (gameRunning) createFallingItem(); }, 340);
  }

  if (infiniteMode && elapsed >= 30) {
    setTimeout(() => { if (gameRunning) createFallingItem(); }, 520);
  }
}

function createFallingItem(forceType) {
  if (!gameRunning) return;

  const stage = getCurrentStage();
  const random = Math.random();
  const type = forceType || (random < 0.22 ? "coin" : random < 0.48 ? "lover" : "boss");

  const item = document.createElement("div");
  item.className = `falling ${type}`;

  if (type === "boss") item.textContent = getBossMessage();
  if (type === "lover") item.textContent = getLoverMessage();
  if (type === "coin") item.textContent = "🪙";

  gameArea.appendChild(item);

  const areaWidth = gameArea.clientWidth;
  const itemWidth = item.offsetWidth;
  const maxLeft = Math.max(0, areaWidth - itemWidth - 10);
  const left = Math.random() * maxLeft;

  const speed = type === "boss" ? stage.bossSpeed : stage.loverSpeed + (type === "coin" ? 2 : 0);
  const zigzag = (stage.pattern === "zigzag" || stage.pattern === "infinite") && type === "boss";

  item.style.left = `${left}px`;
  item.style.top = "-80px";

  fallingItems.push({
    element: item,
    type,
    y: -80,
    x: left,
    speed,
    zigzag,
    zigzagPhase: Math.random() * Math.PI * 2,
    zigzagAmp: 40 + Math.random() * 28,
    zigzagFreq: 1.3 + Math.random() * 0.6
  });
}

function updateInfiniteDifficulty() {
  if (!infiniteMode) return;

  const stage = getCurrentStage();

  stage.bossSpeed = Math.min(260, infiniteStageBase.bossSpeed + infiniteTime * 1.4);
  stage.loverSpeed = Math.min(245, infiniteStageBase.loverSpeed + infiniteTime * 1.2);

  const nextSpawn = Math.max(560, infiniteStageBase.spawnMs - infiniteTime * 4);

  if (stage.spawnMs !== nextSpawn) {
    stage.spawnMs = nextSpawn;
    clearInterval(spawnInterval);
    spawnInterval = setInterval(spawnWave, stage.spawnMs);
  }
}

function gameLoop(currentTime) {
  if (!gameRunning) return;

  const deltaTime = Math.min((currentTime - lastFrameTime) / 1000, 0.033);
  lastFrameTime = currentTime;
  elapsedTime += deltaTime;

  movePlayerByKeyboard(deltaTime);
  moveFallingItems(deltaTime);
  checkCollisions();

  animationFrame = requestAnimationFrame(gameLoop);
}

function movePlayerByKeyboard(deltaTime) {
  const baseSpeed = 420;
  const coffeeBonus = coffeeTickets * 45;
  const maxSpeed = 690;

  const speed = Math.min(baseSpeed + coffeeBonus, maxSpeed);
  const areaWidth = gameArea.clientWidth;

  if (keys.left) playerX -= speed * deltaTime;
  if (keys.right) playerX += speed * deltaTime;

  if (playerX < 0) playerX = 0;
  if (playerX > areaWidth - player.clientWidth) playerX = areaWidth - player.clientWidth;

  updatePlayerPosition();
}

function updatePlayerPosition() {
  player.style.left = `${playerX}px`;
  player.style.transform = "none";
}

function moveFallingItems(deltaTime) {
  const areaHeight = gameArea.clientHeight;

  fallingItems.forEach((itemObj) => {
    itemObj.y += itemObj.speed * deltaTime;

    if (itemObj.zigzag) {
      const areaWidth = gameArea.clientWidth;
      const itemWidth = itemObj.element.offsetWidth;
      const newX = itemObj.x + Math.sin(elapsedTime * itemObj.zigzagFreq + itemObj.zigzagPhase) * itemObj.zigzagAmp;
      const clampedX = Math.max(0, Math.min(areaWidth - itemWidth, newX));
      itemObj.element.style.left = `${clampedX}px`;
    }

    itemObj.element.style.top = `${itemObj.y}px`;
  });

  fallingItems = fallingItems.filter((itemObj) => {
    if (itemObj.y > areaHeight + 90) {
      if (itemObj.type === "lover") loseHeart();
      itemObj.element.remove();
      return false;
    }

    return true;
  });
}

function getHitBox(element, inset) {
  const rect = element.getBoundingClientRect();

  return {
    left: rect.left + inset.left,
    right: rect.right - inset.right,
    top: rect.top + inset.top,
    bottom: rect.bottom - inset.bottom
  };
}

function isRectOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function checkCollisions() {
  const playerHitBox = getHitBox(player, { left: 21, right: 21, top: 4, bottom: 4 });

  for (const itemObj of fallingItems) {
    const inset = itemObj.type === "coin"
      ? { left: 7, right: 7, top: 3, bottom: 3 }
      : { left: 14, right: 14, top: 4, bottom: 4 };

    const itemHitBox = getHitBox(itemObj.element, inset);

    if (!isRectOverlap(playerHitBox, itemHitBox)) continue;

    if (itemObj.type === "boss") {
      handleBossHit(itemObj);
      return;
    }

    if (itemObj.type === "lover") {
      stats.loverCaught++;
      loverCombo += 1;
      clearTimeout(comboTimer);

      if (loverCombo >= 3) {
        coins += 2;
        stats.coinsCollected += 2;
        showStatus(`${loverCombo}연속 수락! 멘탈코인 +2 🪙🪙`);
        spawnCoinPopup("+2");
      } else if (loverCombo === 2) {
        showStatus("2연속 수락! 청춘 게이지 상승 ❤️❤️");
        spawnHeartParticle(itemObj.element);
      } else {
        showStatus("청춘 이벤트 수락! ❤️");
        spawnHeartParticle(itemObj.element);
      }

      // 2초 안에 다음 lover 못 받으면 콤보 리셋
      comboTimer = setTimeout(() => { loverCombo = 0; }, 2000);

      removeItem(itemObj);
      updateHud();
      return;
    }

    if (itemObj.type === "coin") {
      coins += 1;
      stats.coinsCollected++;
      showStatus("멘탈코인 +1 🪙");
      spawnCoinPopup("+1");
      removeItem(itemObj);
      updateHud();
      return;
    }
  }
}

function handleBossHit(itemObj) {
  if (ignoreTickets > 0) {
    ignoreTickets -= 1;
    stats.ignoreUsed++;
    showCenterNotice("🛡️ 저 대학생인데요!");
    showStatus("저 대학생인데요 사용! 모홍장 멘트 1회 방어 🛡️");
    removeItem(itemObj);
    updateHud();
    return;
  }

  stats.bossHit++;
  hearts -= 1;
  if (navigator.vibrate) navigator.vibrate(80);
  flashScreen("boss");
  loverCombo = 0;

  if (hearts > 0) {
    showStatus(`모홍장에게 포획될 뻔했습니다! 하트 ${hearts}개 남음 💦`);
    removeItem(itemObj);
    updateHud();
    return;
  }

  updateHud();
  endGame("boss");
}

function loseHeart() {
  if (autoReplyTickets > 0) {
    autoReplyTickets -= 1;
    stats.autoReplyUsed++;
    showCenterNotice("💬 생각해볼게요!");
    showStatus("생각해볼게요 사용! 청춘 멘트 1회 방어 💬");
    updateHud();
    return;
  }

  stats.loverMissed++;
  hearts -= 1;
  if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
  flashScreen("lover");
  loverCombo = 0;

  if (hearts > 0) {
    showStatus(`청춘 이벤트를 놓쳤습니다. 하트 ${hearts}개 남음`);
    updateHud();
    return;
  }

  updateHud();
  endGame("lover");
}

function flashScreen(type) {
  clearTimeout(flashTimer);

  const color = type === "boss" ? "#ff4d4d" : "#ff85b3";
  gameArea.style.transition = "box-shadow 0.05s";
  gameArea.style.boxShadow = `inset 0 0 0 5px ${color}, 8px 8px 0 #222`;

  flashTimer = setTimeout(() => {
    resetGameAreaFeedback();
  }, 180);
}

function resetGameAreaFeedback() {
  clearTimeout(flashTimer);
  gameArea.style.transition = "box-shadow 0.35s ease";
  gameArea.style.boxShadow = "";
}

function spawnHeartParticle(sourceEl) {
  const rect = sourceEl.getBoundingClientRect();
  const areaRect = gameArea.getBoundingClientRect();
  const cx = rect.left - areaRect.left + rect.width / 2;
  const cy = rect.top - areaRect.top + rect.height / 2;

  for (let i = 0; i < 5; i++) {
    const p = document.createElement("div");
    p.className = "heart-particle";
    p.textContent = "❤️";
    p.style.left = `${cx}px`;
    p.style.top = `${cy}px`;

    const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
    p.style.setProperty("--dx", `${Math.cos(angle) * 40}px`);
    p.style.setProperty("--dy", `${Math.sin(angle) * 40}px`);

    gameArea.appendChild(p);
    setTimeout(() => p.remove(), 600);
  }
}

function buyItem(type) {
  const costs = { ignore: 3, autoReply: 3, coffee: 2 };

  const labels = {
    ignore: "저 대학생인데요는 3코인",
    autoReply: "생각해볼게요는 3코인",
    coffee: "에너지드링크는 2코인"
  };

  if (coins < costs[type]) {
    shopStatusText.textContent = `코인이 부족합니다. ${labels[type]}입니다.`;
    return;
  }

  coins -= costs[type];

  if (type === "ignore") {
    ignoreTickets += 1;
    shopStatusText.textContent = "저 대학생인데요 구매 완료! 모홍장 멘트 1회 방어.";
  }

  if (type === "autoReply") {
    autoReplyTickets += 1;
    shopStatusText.textContent = "생각해볼게요 구매 완료! 청춘 멘트 놓침 1회 방어.";
  }

  if (type === "coffee") {
    coffeeTickets += 1;
    shopStatusText.textContent = `에너지드링크 구매 완료! 현재 이동속도 +${coffeeTickets * 45}`;
  }

  updateHud();
  updateVendingHud();
}

function removeItem(targetItem) {
  targetItem.element.remove();
  fallingItems = fallingItems.filter((i) => i !== targetItem);
}

function getCurrentStage() {
  if (infiniteMode) return infiniteStage;
  return stages[currentStageIndex];
}

function applyStageVisual() {
  gameArea.classList.remove("stage-2", "stage-3", "infinite-stage");

  const stage = getCurrentStage();

  if (stage.backgroundClass) gameArea.classList.add(stage.backgroundClass);
}

function updateHud() {
  coinText.textContent = coins;
  heartText.textContent = "❤️".repeat(hearts) + "♡".repeat(3 - hearts);
  ignoreText.textContent = ignoreTickets;
  autoReplyText.textContent = autoReplyTickets;
  coffeeText.textContent = coffeeTickets;
}

function updateVendingHud() {
  vendingCoinText.textContent = coins;
  ownedIgnoreText.textContent = ignoreTickets;
  ownedAutoReplyText.textContent = autoReplyTickets;
  ownedCoffeeText.textContent = coffeeTickets;
}

function updateMapProgress() {
  if (infiniteMode) {
    mapMarker.style.top = "0%";
    return;
  }

  const completedStages = currentStageIndex;
  const currentStage = getCurrentStage();
  const stageProgress = currentStage ? (currentStage.duration - stageTimeLeft) / currentStage.duration : 0;
  const totalProgress = Math.min((completedStages + stageProgress) / stages.length, 1);

  mapMarker.style.top = `${100 - totalProgress * 100}%`;
}

function showStatus(message) {
  clearTimeout(statusTimer);

  statusText.textContent = message;

  statusTimer = setTimeout(() => {
    if (!gameRunning) return;
    statusText.textContent = infiniteMode ? "무한 입교설명회 진행 중입니다." : "모홍장 멘트는 피하고, 청춘 이벤트는 받으세요.";
  }, 1400);
}

function showScreen(screenName) {
  [startScreen, gameScreen, vendingScreen, gameOverScreen].forEach((screen) => {
    screen.classList.add("hidden");
  });

  if (screenName === "start") startScreen.classList.remove("hidden");
  if (screenName === "game") gameScreen.classList.remove("hidden");
  if (screenName === "vending") vendingScreen.classList.remove("hidden");
  if (screenName === "gameOver") gameOverScreen.classList.remove("hidden");
}

function stopTimers() {
  clearInterval(spawnInterval);
  clearInterval(stageTimer);
  clearInterval(playTimeTimer);
  cancelAnimationFrame(animationFrame);
  clearTimeout(statusTimer);
  clearTimeout(flashTimer);
  clearTimeout(comboTimer);
  resetGameAreaFeedback();
}

function clearAllFallingItems() {
  document.querySelectorAll(".falling").forEach((item) => item.remove());
  document.querySelectorAll(".heart-particle").forEach((p) => p.remove());
  fallingItems = [];
}

function endGame(reason) {
  gameRunning = false;
  stopTimers();
  clearAllFallingItems();

  const title = getRankTitle();
  rankTitleText.textContent = title;

  finalStageText.textContent = infiniteMode
    ? `무한모드 ${infiniteTime}초 생존`
    : currentStageIndex >= stages.length
      ? "청춘 방어 성공"
      : `${Math.min(currentStageIndex + 1, stages.length)}스테이지`;

  infiniteStartButton.classList.add("hidden");

  // 퍼펙트 클리어 숨겨진 엔딩
  const isPerfect = !infiniteMode && currentStageIndex >= stages.length && stats.bossHit === 0 && stats.loverMissed === 0;

  if (isPerfect) {
    endingBadge.textContent = "🌟 완벽한 청춘 방어";
    endingBadge.className = "badge success";
    endingTitle.textContent = "모홍장도 인정한 새내기입니다.";
    endingMessage.innerHTML = "단 한 번도 흔들리지 않았습니다.<br />모홍장이 조용히 명함을 집어넣었습니다.<br />무한모드에 도전하시겠습니까?";
    infiniteStartButton.classList.remove("hidden");
  } else if (reason === "success") {
    endingBadge.textContent = "청춘 방어 성공!";
    endingBadge.className = "badge success";
    endingTitle.textContent = "모홍장의 포획 작전을 피해냈습니다.";
    endingMessage.innerHTML = "오늘의 새내기 라이프는 지켰습니다.<br />하지만 모홍장의 설명회는 아직 끝나지 않았습니다.<br />무한모드에 도전하시겠습니까?";
    infiniteStartButton.classList.remove("hidden");
  } else if (infiniteMode) {
    endingBadge.textContent = "입교지원서 제출";
    endingBadge.className = "badge infinite";
    endingTitle.textContent = "모홍장에게 잡혔습니다.";
    endingMessage.innerHTML = `모홍장의 설명회는 설명회가 아니었습니다.<br />포획 작전이었습니다.<br />무한모드 ${infiniteTime}초 생존.`;
  } else if (reason === "lover") {
    endingBadge.textContent = "청춘 위기";
    endingBadge.className = "badge danger";
    endingTitle.textContent = "청춘 이벤트를 너무 많이 놓쳤습니다.";
    endingMessage.textContent = loverEndMessages[Math.floor(Math.random() * loverEndMessages.length)];
  } else {
    endingBadge.textContent = "입교지원서 제출";
    endingBadge.className = "badge danger";
    endingTitle.textContent = "모홍장에게 잡혔습니다.";
    endingMessage.innerHTML = "모홍장의 설명회는 설명회가 아니었습니다.<br />포획 작전이었습니다.";
  }

  renderResultCard(reason, title, isPerfect);
  showScreen("gameOver");
}

function getRankTitle() {
  if (infiniteMode) {
    if (infiniteTime >= 90) return "입교설명회 생존 괴물";
    if (infiniteTime >= 60) return "모홍장 회피 고수";
    if (infiniteTime >= 30) return "무한설명회 입문자";
    return "지원서 앞에서 무너진 사람";
  }

  if (currentStageIndex >= stages.length) {
    if (stats.bossHit === 0 && stats.loverMissed === 0) return "청춘 방어 완벽주의자";
    if (stats.coinsCollected >= 10) return "멘탈코인 장학생";
    if (stats.ignoreUsed >= 3) return "저 대학생인데요 장인";
    if (stats.autoReplyUsed >= 3) return "생각해볼게요 장인";
    if (stats.loverCaught >= 10) return "새내기 라이프 만렙";
    if (stats.bossHit === 0) return "모홍장 회피 전설";
    if (stats.loverMissed === 0) return "청춘만큼은 진심인 사람";
    return "입교설명회 탈출자";
  }

  if (currentStageIndex === 0) return "캠퍼스 새내기";
  if (currentStageIndex === 1) return "공강 수호자";
  if (currentStageIndex === 2) return "청춘 방어 실패자";

  return "입교설명회 생존자";
}

function renderResultCard(reason, title, isPerfect) {
  const cardEl = document.getElementById("resultCard");
  if (!cardEl) return;

  const badgeEl = document.getElementById("cardBadgeText");

  if (isPerfect) {
    badgeEl.textContent = "🌟 완벽한 청춘 방어";
    badgeEl.style.background = "#ffe66d";
  } else if (infiniteMode) {
    badgeEl.textContent = `무한모드 ${infiniteTime}초 생존 🌙`;
    badgeEl.style.background = "#cdb4db";
  } else {
    const isSuccess = reason === "success";
    badgeEl.textContent = isSuccess ? "청춘 방어 성공 🎉" : reason === "boss" ? "입교지원서 제출 😵" : "청춘 위기 💔";
    badgeEl.style.background = isSuccess ? "#9be7c7" : "#ff8a80";
  }

  document.getElementById("cardTitle").textContent = title;
  document.getElementById("cardStage").textContent = infiniteMode
    ? `무한모드 ${infiniteTime}초 생존`
    : currentStageIndex >= stages.length
      ? "청춘 방어 성공"
      : `${Math.min(currentStageIndex + 1, stages.length)}스테이지 도달`;

  document.getElementById("cardStat1").textContent = `모홍장 멘트 ${stats.bossHit}회 피격`;
  document.getElementById("cardStat2").textContent = `청춘 이벤트 ${stats.loverCaught}개 수락`;
  document.getElementById("cardStat3").textContent = `멘탈코인 ${stats.coinsCollected}개 획득 · 총 ${totalPlaySeconds}초 플레이`;

  cardEl.style.display = "block";
}

document.addEventListener("DOMContentLoaded", () => {
  const saveBtn = document.getElementById("saveCardButton");
  if (!saveBtn) return;

  saveBtn.addEventListener("click", () => {
    const card = document.getElementById("resultCard");
    if (!card) return;

    if (typeof html2canvas === "undefined") {
      alert("저장 기능 로딩 중입니다. 잠시 후 다시 눌러주세요.");
      return;
    }

    saveBtn.textContent = "저장 중...";

    html2canvas(card, {
      backgroundColor: "#fffdf7",
      scale: 2,
      useCORS: true,
      logging: false
    }).then((canvas) => {
      const link = document.createElement("a");
      link.download = "모홍장님_저는대학생인데요_결과.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
      saveBtn.textContent = "결과 이미지 저장 📸";
    }).catch(() => {
      saveBtn.textContent = "결과 이미지 저장 📸";
      alert("저장에 실패했습니다. 스크린샷을 이용해주세요.");
    });
  });
});

function getBossMessage() {
  const key = infiniteMode ? "infinite" : currentStageIndex + 1;
  const messages = bossMessagesByStage[key];
  return messages[Math.floor(Math.random() * messages.length)];
}

function getLoverMessage() {
  const currentHeart = Math.max(1, Math.min(3, hearts));
  const messageSet = infiniteMode ? infiniteLoverMessagesByHeart : loverMessagesByHeart;
  const messages = messageSet[currentHeart];
  return messages[Math.floor(Math.random() * messages.length)];
}

// 아이템 자동 발동 시 화면 중앙 크게 표시
function showCenterNotice(text) {
  const existing = document.querySelector(".center-notice");
  if (existing) existing.remove();

  const el = document.createElement("div");
  el.className = "center-notice";
  el.textContent = text;
  el.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.6);
    background: #fff;
    border: 3px solid #222;
    border-radius: 20px;
    padding: 14px 22px;
    font-size: 22px;
    font-weight: 900;
    z-index: 30;
    pointer-events: none;
    box-shadow: 5px 5px 0 #222;
    animation: centerNoticeAnim 0.9s ease forwards;
  `;
  gameArea.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

// 코인 획득 시 +N 팝업
function spawnCoinPopup(label) {
  const areaRect = gameArea.getBoundingClientRect();
  const playerRect = player.getBoundingClientRect();
  const cx = playerRect.left - areaRect.left + playerRect.width / 2;
  const cy = playerRect.top - areaRect.top;

  const el = document.createElement("div");
  el.textContent = label;
  el.style.cssText = `
    position: absolute;
    left: ${cx}px;
    top: ${cy}px;
    transform: translateX(-50%);
    font-size: 18px;
    font-weight: 900;
    color: #f4a900;
    pointer-events: none;
    z-index: 25;
    animation: coinPopAnim 0.8s ease forwards;
  `;
  gameArea.appendChild(el);
  setTimeout(() => el.remove(), 800);
}