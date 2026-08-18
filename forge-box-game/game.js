'use strict';

/* ═══════════════════════════════════════
   데이터
   ═══════════════════════════════════════ */

const UPGRADE_SUCCESS_RATES = [
  100, 100, 100, 100, 100,
  95, 90, 83, 76, 69,
  62, 56, 50, 40, 30,
  25, 20, 15, 10, 8,
  7, 6, 5, 4, 3,
];

/** 강화 단계별 성공률 (도달 단계 1~25, 판매가·위험 점수 계산용) */
const SUCCESS_RATES = {
  1: 100, 2: 100, 3: 100, 4: 100, 5: 100,
  6: 95, 7: 90, 8: 83, 9: 76, 10: 69,
  11: 62, 12: 56, 13: 50, 14: 40, 15: 30,
  16: 25, 17: 20, 18: 15, 19: 10, 20: 8,
  21: 7, 22: 6, 23: 5, 24: 4, 25: 3,
};

const UPGRADE_COSTS = {
  1: 100, 2: 300, 3: 700, 4: 1500, 5: 3000,
  6: 30000, 7: 100000, 8: 500000, 9: 1500000, 10: 5000000,
  11: 8000000, 12: 12000000, 13: 20000000, 14: 32000000, 15: 50000000,
  16: 100000000, 17: 180000000, 18: 300000000, 19: 500000000, 20: 800000000,
  21: 1300000000, 22: 2000000000, 23: 3500000000, 24: 7000000000, 25: 15000000000,
};

const CHEST_UPGRADE_COSTS = {
  2: 100000,
  3: 500000,
  4: 2000000,
  5: 8000000,
  6: 25000000,
  7: 70000000,
  8: 180000000,
  9: 500000000,
  10: 1500000000,
};

const TREASURE_META = {
  protectionStone: {
    id: 'protectionStone',
    name: '방지석',
    shortName: '방지석',
    description: '강화 실패 시 장비 파괴를 1회 막습니다.',
    sellPrice: 800000,
    usable: true,
  },
  protectionShard: {
    id: 'protectionShard',
    name: '방지석 조각',
    shortName: '조각',
    description: '3개를 모으면 방지석 1개로 자동 합성됩니다.',
    sellPrice: 150000,
    usable: false,
  },
  smallJewel: {
    id: 'smallJewel',
    name: '작은 보석',
    shortName: '작은 보석',
    description: '판매하면 50,000G를 얻는 작은 보물입니다.',
    sellPrice: 50000,
    usable: false,
  },
  brilliantJewel: {
    id: 'brilliantJewel',
    name: '찬란한 보석',
    shortName: '찬란 보석',
    description: '판매하면 1,000,000G를 얻는 값비싼 보물입니다.',
    sellPrice: 1000000,
    usable: false,
  },
  divineJewel: {
    id: 'divineJewel',
    name: '신의 보석',
    shortName: '신의 보석',
    description: '판매하면 100,000,000G를 얻는 전설급 보물입니다.',
    sellPrice: 100000000,
    usable: false,
  },
  enchantScroll: {
    id: 'enchantScroll',
    name: '인챈트 두루마리',
    shortName: '두루마리',
    description: '사용하면 다음 강화 성공률이 10% 증가합니다. (최대 +30%)',
    sellPrice: 300000,
    usable: true,
  },
  ancientBlessing: {
    id: 'ancientBlessing',
    name: '고대의 축복',
    shortName: '축복',
    description: '사용하면 다음 강화 비용이 무료가 되고 성공률이 5% 증가합니다.',
    sellPrice: 600000,
    usable: true,
  },
};

const BLESSING_EVENTS = [
  {
    id: 'hammerBlessing',
    apply: () => { gameState.nextSuccessBonus += 5; },
    log: '망치의 축복. 성공률 상승.',
  },
  {
    id: 'goldenSmile',
    apply: () => {
      const bonus = Math.floor(50000 * (1 + chestLevel * 0.5));
      gameState.gold += bonus;
    },
    log: '상자에서 골드 획득.',
  },
  {
    id: 'godJoke',
    apply: () => { gameState.freeUpgradeCount += 1; },
    log: '다음 강화 무료.',
  },
  {
    id: 'fateWhisper',
    apply: () => { gameState.protectionCount += 1; },
    log: '방지석 효과 1회 획득.',
  },
];

const CURSE_EVENTS = [
  {
    id: 'rustyHand',
    apply: () => { gameState.nextSuccessPenalty += 10; },
    log: '저주. 성공률 하락.',
  },
  {
    id: 'goldThief',
    apply: () => {
      const loss = Math.max(1, Math.floor(gameState.gold * 0.1));
      gameState.gold -= loss;
    },
    log: '골드 10% 손실.',
  },
  {
    id: 'betrayingBox',
    apply: () => removeRandomTreasureOrSell(),
    log: '보물 1개 회수.',
  },
  {
    id: 'greedShadow',
    apply: () => { addDoom(20); },
    log: '파멸 +20.',
  },
];

const DOOM_EVENTS = [
  {
    id: 'treasureRaid',
    apply: () => {
      const idx = findTreasureSlotIndex();
      if (idx !== -1) {
        gameState.treasureSlots[idx] = null;
        addLog('파멸 사건: 보물 1개 소실.', 'doom');
      } else {
        const loss = Math.max(1, Math.floor(gameState.gold * 0.1));
        gameState.gold -= loss;
        addLog(`파멸 사건: 골드 ${formatGold(loss)} 손실.`, 'doom');
      }
    },
  },
  {
    id: 'goldEvaporate',
    apply: () => {
      const loss = Math.max(1, Math.floor(gameState.gold * 0.2));
      gameState.gold -= loss;
      addLog('파멸 사건: 골드 20% 손실.', 'doom');
    },
  },
  {
    id: 'hammerCurse',
    apply: () => {
      gameState.nextSuccessPenalty += 15;
      addLog('파멸 사건: 성공률 -15%.', 'doom');
    },
  },
  {
    id: 'boxMockery',
    apply: () => {
      gameState.skipNextBoxReward = true;
      addLog('파멸 사건: 다음 상자 보상 없음.', 'doom');
    },
  },
];

const GAME_CONFIG = {
  maxEnhanceLevel: 25,
  maxStoredWeapons: 5,
  maxTreasureSlots: 5,
  startingGold: 1000,
  maxDoom: 100,
  maxLogEntries: 10,
  sellWeaponDoomReduce: 20,
  blessingDoomReduce: 5,
  curseDoomAdd: 15,
  scrollBonusCap: 30,
};

let chestLevel = 1;
const maxChestLevel = 10;

let currentWeapon = createNewWeapon();
const storedWeapons = new Array(GAME_CONFIG.maxStoredWeapons).fill(null);

const gameState = {
  gold: GAME_CONFIG.startingGold,
  doomGauge: 0,
  treasureSlots: new Array(GAME_CONFIG.maxTreasureSlots).fill(null),
  logs: [],
  activeTreasureSlot: null,
  nextSuccessBonus: 0,
  nextSuccessPenalty: 0,
  freeUpgradeCount: 0,
  protectionCount: 0,
  skipNextBoxReward: false,
};

/* ═══════════════════════════════════════
   무기 / 감정가 / 골드
   ═══════════════════════════════════════ */

function rollAppraisal() {
  const roll = Math.random();

  if (roll < 0.1) {
    return {
      grade: '낮은 감정가',
      multiplier: 0.98 + Math.random() * 0.02,
    };
  }

  if (roll < 0.7) {
    return {
      grade: '보통 감정가',
      multiplier: 1.0 + Math.random() * 0.03,
    };
  }

  if (roll < 0.95) {
    return {
      grade: '좋은 감정가',
      multiplier: 1.03 + Math.random() * 0.05,
    };
  }

  return {
    grade: '희귀 감정가',
    multiplier: 1.08 + Math.random() * 0.08,
  };
}

function getRiskScore(level) {
  let score = 0;

  for (let i = 1; i <= level; i++) {
    const rate = SUCCESS_RATES[i] ?? 100;

    if (rate >= 100) {
      score += 0;
    } else if (rate >= 80) {
      score += 0.2;
    } else if (rate >= 60) {
      score += 0.5;
    } else if (rate >= 40) {
      score += 1.0;
    } else if (rate >= 20) {
      score += 1.8;
    } else if (rate >= 10) {
      score += 3.0;
    } else {
      score += 4.5;
    }
  }

  return score;
}

function getRiskLabel(level) {
  const score = getRiskScore(level);

  if (score < 1) return '거의 없음';
  if (score < 4) return '낮음';
  if (score < 8) return '보통';
  if (score < 14) return '높음';
  if (score < 22) return '매우 높음';
  return '전설급';
}

function createNewWeapon() {
  const appraisal = rollAppraisal();

  return {
    type: 'sword',
    name: '검',
    level: 0,
    totalInvestedGold: 0,
    appraisalGrade: appraisal.grade,
    appraisalMultiplier: appraisal.multiplier,
    valueTail: Math.floor(Math.random() * 9999),
  };
}

function migrateWeapon(weapon) {
  if (!weapon) return weapon;

  if (!weapon.appraisalGrade) {
    const appraisal = rollAppraisal();
    weapon.appraisalGrade = appraisal.grade;
    weapon.appraisalMultiplier = appraisal.multiplier;
  }

  if (weapon.totalInvestedGold == null) weapon.totalInvestedGold = 0;
  if (weapon.valueTail == null) weapon.valueTail = Math.floor(Math.random() * 9999);

  delete weapon.durability;
  delete weapon.maxDurability;
  delete weapon.valueMultiplier;

  return weapon;
}

function getWeaponValue(weapon = currentWeapon) {
  const invested = weapon.totalInvestedGold || 0;
  const level = weapon.level || 0;

  if (level <= 0 || invested <= 0) {
    return 1000 + (weapon.valueTail || 0);
  }

  const riskScore = getRiskScore(level);

  let multiplier = 1.03;
  multiplier += riskScore * 0.08;

  if (level >= 10) multiplier += 0.1;
  if (level >= 15) multiplier += 0.25;
  if (level >= 20) multiplier += 0.6;
  if (level >= 24) multiplier += 1.2;

  const appraisal = weapon.appraisalMultiplier || 1;

  let value = invested * multiplier * appraisal;

  // 100% 강화 구간(+1~+5)은 명성 보너스 없음 — 초반 돈 복사 방지
  const fameLevel = Math.max(0, level - 5);
  value += fameLevel * fameLevel * 3000;

  value += weapon.valueTail || 0;

  return Math.floor(value);
}

function formatGold(value) {
  value = Math.floor(value);

  if (value >= 100000000) {
    const eok = value / 100000000;
    return `${Number.isInteger(eok) ? eok : eok.toFixed(1)}억G`;
  }

  if (value >= 10000) {
    const man = value / 10000;
    return `${Number.isInteger(man) ? man : man.toFixed(1)}만G`;
  }

  return `${value.toLocaleString()}G`;
}

function formatGoldDetailed(value) {
  value = Math.floor(value);

  if (value >= 100000000) {
    const eok = Math.floor(value / 100000000);
    const rest = value % 100000000;
    const man = Math.floor(rest / 10000);
    const tail = rest % 10000;

    if (man > 0 && tail > 0) {
      return `${eok}억 ${man.toLocaleString()}만 ${tail.toLocaleString()}G`;
    }
    if (man > 0) return `${eok}억 ${man.toLocaleString()}만G`;
    return `${eok}억G`;
  }

  if (value >= 10000) {
    const man = Math.floor(value / 10000);
    const tail = value % 10000;

    if (tail > 0) return `${man.toLocaleString()}만 ${tail.toLocaleString()}G`;
    return `${man.toLocaleString()}만G`;
  }

  return `${value.toLocaleString()}G`;
}

function getGoldDisplayClass(value) {
  if (value >= 10000000000) return 'gold-legend';
  if (value >= 1000000000) return 'gold-epic';
  if (value >= 100000000) return 'gold-rare';
  return '';
}

function getUpgradeCost(targetLevel) {
  return UPGRADE_COSTS[targetLevel] ?? 0;
}

function getBaseSuccessRate(level) {
  if (level >= GAME_CONFIG.maxEnhanceLevel) return 0;
  return UPGRADE_SUCCESS_RATES[level] ?? 0;
}

function getFinalSuccessRate(level) {
  const base = getBaseSuccessRate(level);
  const final = base + gameState.nextSuccessBonus - gameState.nextSuccessPenalty;
  return Math.min(100, Math.max(1, final));
}

function rollSuccess(ratePercent) {
  return Math.random() * 100 < ratePercent;
}

/* ═══════════════════════════════════════
   파멸
   ═══════════════════════════════════════ */

function addDoom(amount) {
  gameState.doomGauge = Math.min(
    GAME_CONFIG.maxDoom,
    Math.max(0, gameState.doomGauge + amount)
  );
}

function checkDoomThreshold() {
  if (gameState.doomGauge >= GAME_CONFIG.maxDoom) {
    triggerDoomEvent();
    gameState.doomGauge = 0;
  }
}

function triggerDoomEvent() {
  const event = DOOM_EVENTS[Math.floor(Math.random() * DOOM_EVENTS.length)];
  event.apply();
}

function getDoomIncreaseByChestLevel() {
  if (chestLevel <= 3) return 5;
  if (chestLevel <= 6) return 7;
  if (chestLevel <= 9) return 10;
  return 12;
}

/* ═══════════════════════════════════════
   상자
   ═══════════════════════════════════════ */

function getChestRewardTable() {
  if (chestLevel <= 3) {
    return [
      { type: 'normalGold', weight: 18 },
      { type: 'jackpotGold', weight: 7 },
      { type: 'smallJewel', weight: 12 },
      { type: 'brilliantJewel', weight: 3 },
      { type: 'divineJewel', weight: 0.1 },
      { type: 'protectionShard', weight: 14 },
      { type: 'protectionStone', weight: 6 },
      { type: 'enchantScroll', weight: 8 },
      { type: 'ancientBlessing', weight: 4 },
      { type: 'blessingEvent', weight: 12 },
      { type: 'curseEvent', weight: 11 },
      { type: 'empty', weight: 2 },
    ];
  }

  if (chestLevel <= 6) {
    return [
      { type: 'normalGold', weight: 16 },
      { type: 'jackpotGold', weight: 9 },
      { type: 'smallJewel', weight: 10 },
      { type: 'brilliantJewel', weight: 5 },
      { type: 'divineJewel', weight: 0.5 },
      { type: 'protectionShard', weight: 13 },
      { type: 'protectionStone', weight: 7 },
      { type: 'enchantScroll', weight: 8 },
      { type: 'ancientBlessing', weight: 5 },
      { type: 'blessingEvent', weight: 12 },
      { type: 'curseEvent', weight: 10 },
      { type: 'empty', weight: 1 },
    ];
  }

  if (chestLevel <= 9) {
    return [
      { type: 'normalGold', weight: 14 },
      { type: 'jackpotGold', weight: 11 },
      { type: 'smallJewel', weight: 8 },
      { type: 'brilliantJewel', weight: 7 },
      { type: 'divineJewel', weight: 1.5 },
      { type: 'protectionShard', weight: 11 },
      { type: 'protectionStone', weight: 8 },
      { type: 'enchantScroll', weight: 9 },
      { type: 'ancientBlessing', weight: 6 },
      { type: 'blessingEvent', weight: 11 },
      { type: 'curseEvent', weight: 10 },
      { type: 'empty', weight: 0 },
    ];
  }

  return [
    { type: 'normalGold', weight: 12 },
    { type: 'jackpotGold', weight: 12 },
    { type: 'smallJewel', weight: 6 },
    { type: 'brilliantJewel', weight: 9 },
    { type: 'divineJewel', weight: 3 },
    { type: 'protectionShard', weight: 10 },
    { type: 'protectionStone', weight: 8 },
    { type: 'enchantScroll', weight: 9 },
    { type: 'ancientBlessing', weight: 6 },
    { type: 'blessingEvent', weight: 11 },
    { type: 'curseEvent', weight: 12 },
    { type: 'empty', weight: 0 },
  ];
}

function pickWeightedFromTable(table) {
  const total = table.reduce((sum, e) => sum + e.weight, 0);
  if (total <= 0) return table[0]?.type ?? 'empty';
  let roll = Math.random() * total;
  for (const entry of table) {
    roll -= entry.weight;
    if (roll <= 0) return entry.type;
  }
  return table[table.length - 1].type;
}

function getNormalGoldReward() {
  const lv = currentWeapon.level;
  return Math.floor(
    1000 * Math.pow(lv + 1, 2) * (1 + (chestLevel - 1) * 0.08)
  );
}

function getJackpotGoldReward() {
  const lv = currentWeapon.level;
  return Math.floor(
    10000 * Math.pow(lv + 1, 3) * (1 + (chestLevel - 1) * 0.12)
  );
}

function getChestQualityLabel() {
  if (chestLevel >= maxChestLevel) return '최고';
  if (chestLevel >= 7) return '매우 높음';
  if (chestLevel >= 4) return '상승 중';
  return '보통';
}

function getNextChestUpgradeCost() {
  if (chestLevel >= maxChestLevel) return null;
  return CHEST_UPGRADE_COSTS[chestLevel + 1];
}

const TREASURE_HINT = {
  protectionStone: '실패 1회 방지',
  protectionShard: '3개 → 방지석',
  smallJewel: '판매 전용',
  brilliantJewel: '판매 전용',
  divineJewel: '판매 전용',
  enchantScroll: '성공률 +10%',
  ancientBlessing: '무료 강화 +5%',
};

const TREASURE_ACQUIRE_LOGS = {
  smallJewel: '작은 보석 획득.',
  brilliantJewel: '찬란한 보석 획득.',
  divineJewel: '신의 보석 획득.',
  protectionStone: '방지석 획득.',
  protectionShard: '방지석 조각 획득.',
  enchantScroll: '두루마리 획득.',
  ancientBlessing: '고대의 축복 획득.',
};

const TREASURE_SELL_LOGS = {
  smallJewel: '작은 보석 판매.',
  brilliantJewel: '찬란한 보석 판매.',
  divineJewel: '신의 보석 판매.',
  protectionStone: '방지석 판매.',
  protectionShard: '조각 판매.',
  enchantScroll: '두루마리 판매.',
  ancientBlessing: '축복 판매.',
};

/* ═══════════════════════════════════════
   보물 인벤토리
   ═══════════════════════════════════════ */

function countTreasure(treasureId) {
  return gameState.treasureSlots.reduce(
    (sum, slot) => (slot && slot.id === treasureId ? sum + slot.count : sum),
    0
  );
}

function findTreasureSlotIndex(treasureId) {
  if (treasureId) {
    return gameState.treasureSlots.findIndex((s) => s && s.id === treasureId);
  }
  const filled = gameState.treasureSlots
    .map((s, i) => (s ? i : -1))
    .filter((i) => i !== -1);
  if (filled.length === 0) return -1;
  return filled[Math.floor(Math.random() * filled.length)];
}

function findEmptyTreasureSlot() {
  return gameState.treasureSlots.findIndex((s) => s === null);
}

function tryCombineProtectionShards() {
  const total = countTreasure('protectionShard');
  if (total < 3) return;

  let toRemove = 3;
  for (let i = 0; i < gameState.treasureSlots.length && toRemove > 0; i++) {
    const slot = gameState.treasureSlots[i];
    if (!slot || slot.id !== 'protectionShard') continue;
    const take = Math.min(slot.count, toRemove);
    slot.count -= take;
    toRemove -= take;
    if (slot.count <= 0) gameState.treasureSlots[i] = null;
  }

  addTreasure('protectionStone', 1, true);
  addLog('방지석 조각 3개 → 방지석 합성.', 'good');
}

function addTreasure(treasureId, count = 1, skipAcquireLog = false) {
  const meta = TREASURE_META[treasureId];
  if (!meta) return;

  let remaining = count;

  while (remaining > 0) {
    const existingIdx = gameState.treasureSlots.findIndex(
      (s) => s && s.id === treasureId
    );

    if (existingIdx !== -1) {
      gameState.treasureSlots[existingIdx].count += remaining;
      remaining = 0;
    } else {
      const emptyIdx = findEmptyTreasureSlot();
      if (emptyIdx === -1) {
        gameState.gold += meta.sellPrice * remaining;
        addLog(`인벤토리 가득. ${meta.name} 자동 판매.`, 'normal');
        remaining = 0;
      } else {
        gameState.treasureSlots[emptyIdx] = { id: treasureId, count: remaining };
        remaining = 0;
      }
    }
  }

  if (!skipAcquireLog && TREASURE_ACQUIRE_LOGS[treasureId]) {
    addLog(TREASURE_ACQUIRE_LOGS[treasureId], 'good');
  }

  if (treasureId === 'protectionShard') {
    tryCombineProtectionShards();
  }
}

function removeRandomTreasureOrSell() {
  const idx = findTreasureSlotIndex();
  if (idx === -1) return;
  const slot = gameState.treasureSlots[idx];
  const meta = TREASURE_META[slot.id];
  gameState.gold += meta.sellPrice;
  slot.count -= 1;
  if (slot.count <= 0) gameState.treasureSlots[idx] = null;
}

function sellTreasureAtSlot(slotIndex) {
  const slot = gameState.treasureSlots[slotIndex];
  if (!slot) return;

  const meta = TREASURE_META[slot.id];
  gameState.gold += meta.sellPrice;
  slot.count -= 1;
  if (slot.count <= 0) gameState.treasureSlots[slotIndex] = null;

  addLog(TREASURE_SELL_LOGS[slot.id] || `「${meta.name}」을 판매했습니다.`, 'good');
  gameState.activeTreasureSlot = null;
}

function useTreasureAtSlot(slotIndex) {
  const slot = gameState.treasureSlots[slotIndex];
  if (!slot) return;

  const meta = TREASURE_META[slot.id];
  if (!meta.usable) return;

  if (slot.id === 'protectionStone') {
    gameState.protectionCount += 1;
    addLog('방지석 사용.', 'good');
  } else if (slot.id === 'enchantScroll') {
    const room = GAME_CONFIG.scrollBonusCap - gameState.nextSuccessBonus;
    if (room <= 0) {
      addLog('성공률 보정 최대.', 'normal');
      return;
    }
    gameState.nextSuccessBonus += Math.min(10, room);
    addLog('두루마리 사용. 성공률 +10%.', 'good');
  } else if (slot.id === 'ancientBlessing') {
    gameState.freeUpgradeCount += 1;
    gameState.nextSuccessBonus += 5;
    addLog('고대의 축복 사용.', 'bless');
  }

  slot.count -= 1;
  if (slot.count <= 0) gameState.treasureSlots[slotIndex] = null;
  gameState.activeTreasureSlot = null;
}

function applyChestReward(rewardType) {
  switch (rewardType) {
    case 'normalGold': {
      const amount = getNormalGoldReward();
      gameState.gold += amount;
      addLog(`상자 골드: ${formatGoldDetailed(amount)}`, 'good');
      break;
    }
    case 'jackpotGold': {
      const amount = getJackpotGoldReward();
      gameState.gold += amount;
      addLog(`상자 대박: ${formatGoldDetailed(amount)}`, 'good');
      break;
    }
    case 'smallJewel':
    case 'brilliantJewel':
    case 'divineJewel':
    case 'protectionShard':
    case 'protectionStone':
    case 'enchantScroll':
    case 'ancientBlessing':
      addTreasure(rewardType);
      break;
    case 'blessingEvent': {
      const ev = BLESSING_EVENTS[Math.floor(Math.random() * BLESSING_EVENTS.length)];
      ev.apply();
      addLog(ev.log, 'bless');
      addDoom(-GAME_CONFIG.blessingDoomReduce);
      break;
    }
    case 'curseEvent': {
      const ev = CURSE_EVENTS[Math.floor(Math.random() * CURSE_EVENTS.length)];
      ev.apply();
      addLog(ev.log, 'bad');
      if (ev.id !== 'greedShadow') {
        addDoom(GAME_CONFIG.curseDoomAdd);
      }
      break;
    }
    case 'empty':
    default:
      addLog('상자가 비었습니다.', 'normal');
  }
}

/* ═══════════════════════════════════════
   로그
   ═══════════════════════════════════════ */

function addLog(message, type = 'normal') {
  gameState.logs.unshift({ message, type });
  if (gameState.logs.length > GAME_CONFIG.maxLogEntries) {
    gameState.logs.length = GAME_CONFIG.maxLogEntries;
  }
}

const CHEST_UPGRADE_LOGS = [(lv) => `상자 Lv.${lv} 달성.`];

/* ═══════════════════════════════════════
   게임 액션
   ═══════════════════════════════════════ */

function openBox() {
  addDoom(getDoomIncreaseByChestLevel());

  if (gameState.skipNextBoxReward) {
    gameState.skipNextBoxReward = false;
    addLog('상자 보상 없음.', 'doom');
    checkDoomThreshold();
    updateUI();
    return;
  }

  const rewardType = pickWeightedFromTable(getChestRewardTable());
  applyChestReward(rewardType);
  checkDoomThreshold();
  updateUI();
}

function upgradeChest() {
  if (chestLevel >= maxChestLevel) {
    addLog('상자 최대 레벨.');
    updateUI();
    return;
  }

  const cost = CHEST_UPGRADE_COSTS[chestLevel + 1];
  if (gameState.gold < cost) {
    addLog('골드 부족. 상자 강화 실패.');
    updateUI();
    return;
  }

  gameState.gold -= cost;
  chestLevel += 1;
  const msgFn = CHEST_UPGRADE_LOGS[Math.floor(Math.random() * CHEST_UPGRADE_LOGS.length)];
  addLog(msgFn(chestLevel), 'good');
  updateUI();
}

function resetUpgradeModifiers() {
  gameState.nextSuccessBonus = 0;
  gameState.nextSuccessPenalty = 0;
}

function destroyCurrentWeapon() {
  const lostLevel = currentWeapon.level;
  const destroyLogs = [
    '강화 실패. 장비가 산산조각났습니다.',
    `+${lostLevel} 장비 파괴.`,
    '장비가 먼지가 되었습니다.',
  ];
  addLog(destroyLogs[Math.floor(Math.random() * destroyLogs.length)], 'bad');
  currentWeapon = createNewWeapon();
  gameState.doomGauge = 0;
}

function handleUpgradeFailure() {
  if (gameState.protectionCount > 0) {
    gameState.protectionCount -= 1;
    addLog('강화 실패. 방지석으로 방어.', 'good');
    return;
  }

  destroyCurrentWeapon();
}

function upgradeWeapon() {
  const level = currentWeapon.level;

  if (level >= GAME_CONFIG.maxEnhanceLevel) {
    addLog('이미 +25.');
    updateUI();
    return;
  }

  const targetLevel = level + 1;
  const cost = getUpgradeCost(targetLevel);
  const usedFreeUpgrade = gameState.freeUpgradeCount > 0;

  if (!usedFreeUpgrade && gameState.gold < cost) {
    addLog('골드 부족.');
    updateUI();
    return;
  }

  if (!usedFreeUpgrade) {
    gameState.gold -= cost;
    currentWeapon.totalInvestedGold += cost;
  } else {
    gameState.freeUpgradeCount -= 1;
  }

  const rate = getFinalSuccessRate(level);

  if (rollSuccess(rate)) {
    currentWeapon.level += 1;
    addLog(`강화 성공 → +${currentWeapon.level}`, 'good');

    if (currentWeapon.level >= GAME_CONFIG.maxEnhanceLevel) {
      addLog('+25 전설 완성!', 'legend');
    }
  } else {
    handleUpgradeFailure();
  }

  resetUpgradeModifiers();
  updateUI();
}

function sellWeapon() {
  const price = getWeaponValue(currentWeapon);
  gameState.gold += price;
  addDoom(-GAME_CONFIG.sellWeaponDoomReduce);
  addLog(`장비 판매: ${formatGoldDetailed(price)}`, 'good');
  currentWeapon = createNewWeapon();
  updateUI();
}

function storeCurrentWeapon() {
  if (currentWeapon.level < 1) {
    addLog('+0은 보관 불가.');
    updateUI();
    return;
  }

  const emptyIdx = storedWeapons.findIndex((w) => w === null);
  if (emptyIdx === -1) {
    addLog('보관함 가득 참.');
    updateUI();
    return;
  }

  storedWeapons[emptyIdx] = { ...currentWeapon };
  addLog('장비 보관.', 'good');
  currentWeapon = createNewWeapon();
  updateUI();
}

function swapStoredWeapon(index) {
  const stored = storedWeapons[index];
  if (!stored) return;

  migrateWeapon(stored);

  if (currentWeapon.level === 0) {
    currentWeapon = { ...stored };
    storedWeapons[index] = null;
    addLog(`보관 장비 꺼냄: +${stored.level} ${stored.name}`, 'good');
  } else {
    const previous = { ...currentWeapon };
    currentWeapon = { ...stored };
    storedWeapons[index] = migrateWeapon(previous);
    addLog(`장비 교체: +${stored.level} ${stored.name}`, 'good');
  }

  updateUI();
}

/* ═══════════════════════════════════════
   UI
   ═══════════════════════════════════════ */

function getWeaponTierClass(level) {
  if (level >= GAME_CONFIG.maxEnhanceLevel) return 'tier-legend';
  if (level >= 15) return 'tier-danger';
  if (level >= 6) return 'tier-mid';
  return '';
}

function buildWeaponStatsHtml(level) {
  const sellValue = getWeaponValue(currentWeapon);

  if (level >= GAME_CONFIG.maxEnhanceLevel) {
    return `
      <div class="weapon-stat-row highlight">
        <span>판매가</span>
        <span class="val">${formatGoldDetailed(sellValue)}</span>
      </div>
    `;
  }
  const nextLevel = level + 1;
  const baseRate = getBaseSuccessRate(level);
  const finalRate = getFinalSuccessRate(level);
  const cost = getUpgradeCost(nextLevel);
  const goldMissing = gameState.freeUpgradeCount <= 0 && gameState.gold < cost;
  const hasRateMod =
    gameState.nextSuccessBonus > 0 || gameState.nextSuccessPenalty > 0;

  let rateVal = `${finalRate}%`;
  if (hasRateMod) {
    rateVal = `${baseRate}% → ${finalRate}%`;
  }

  let costVal = formatGold(cost);
  if (gameState.freeUpgradeCount > 0) {
    costVal = '무료';
  }

  let html = `
    <div class="weapon-stat-row highlight">
      <span>판매가</span>
      <span class="val">${formatGoldDetailed(sellValue)}</span>
    </div>
    <div class="weapon-stat-row${goldMissing ? ' missing' : ''}">
      <span>강화 비용</span>
      <span class="val">${costVal}</span>
    </div>
    <div class="weapon-stat-row">
      <span>성공률</span>
      <span class="val">${rateVal}</span>
    </div>
  `;

  if (gameState.protectionCount > 0) {
    html += `
      <div class="weapon-stat-row">
        <span>방지석</span>
        <span class="val">${gameState.protectionCount}</span>
      </div>
    `;
  }

  if (gameState.freeUpgradeCount > 0) {
    html += `
      <div class="weapon-stat-row">
        <span>무료 강화</span>
        <span class="val">${gameState.freeUpgradeCount}</span>
      </div>
    `;
  }

  return html;
}

function buildChestCardHtml() {
  const doomInc = getDoomIncreaseByChestLevel();
  const isMax = chestLevel >= maxChestLevel;
  const nextCost = getNextChestUpgradeCost();

  if (isMax) {
    return `
      <div class="chest-info-row">
        <span>파멸</span>
        <span class="val">+${doomInc}</span>
      </div>
    `;
  }

  return `
    <div class="chest-info-row">
      <span>다음 강화</span>
      <span class="val">${formatGold(nextCost)}</span>
    </div>
    <div class="chest-info-row">
      <span>파멸</span>
      <span class="val">+${doomInc}</span>
    </div>
  `;
}

function updateUI() {
  const { gold, doomGauge, logs, treasureSlots } = gameState;
  const level = currentWeapon.level;
  const isMax = level >= GAME_CONFIG.maxEnhanceLevel;

  const panel = document.getElementById('weapon-panel');
  panel.className = `weapon-card weapon-panel ${getWeaponTierClass(level)}`;

  document.getElementById('weapon-type').textContent = currentWeapon.name;
  document.getElementById('enhance-level').textContent = `+${level}`;
  document.getElementById('weapon-stats').innerHTML = buildWeaponStatsHtml(level);
  document.getElementById('completion-banner').classList.toggle('hidden', !isMax);

  const goldEl = document.getElementById('gold-amount');
  goldEl.textContent = formatGold(gold);
  goldEl.className = `value ${getGoldDisplayClass(gold)}`;

  const statusBar = document.getElementById('status-bar');
  statusBar.classList.toggle('doom-danger', doomGauge >= 80);

  document.getElementById('doom-bar').style.width = `${doomGauge}%`;
  document.getElementById('doom-text').textContent =
    `파멸 ${doomGauge}/${GAME_CONFIG.maxDoom}`;

  const chestCard = document.getElementById('chest-card');
  chestCard.classList.toggle('max-level', chestLevel >= maxChestLevel);
  document.getElementById('chest-title').textContent =
    `운명의 상자 Lv.${chestLevel}`;
  document.getElementById('chest-card-body').innerHTML = buildChestCardHtml();

  document.getElementById('upgradeChestBtn').disabled = chestLevel >= maxChestLevel;

  const targetLevel = level + 1;
  const upgradeCost = getUpgradeCost(targetLevel);
  const canUpgrade =
    !isMax && (gameState.freeUpgradeCount > 0 || gold >= upgradeCost);

  document.getElementById('upgradeBtn').disabled = !canUpgrade;
  document.getElementById('store-weapon-btn').disabled = level < 1;

  renderTreasureInventory(treasureSlots);
  renderStorage();
  renderLogs(logs);

  if (gameState.activeTreasureSlot !== null) {
    renderTreasureDetail(gameState.activeTreasureSlot);
  }
}

function renderTreasureInventory(slots) {
  const grid = document.getElementById('treasure-inventory');
  grid.innerHTML = slots
    .map((slot, index) => {
      if (!slot) {
        return '<div class="treasure-slot empty" aria-label="빈 슬롯"><span class="slot-label">빈칸</span></div>';
      }
      const meta = TREASURE_META[slot.id];
      const active = gameState.activeTreasureSlot === index ? ' is-active' : '';
      return `
        <button type="button" class="treasure-slot filled${active}"
          data-index="${index}" aria-label="${meta.name} ${slot.count}개">
          <span class="slot-label">${meta.shortName} x${slot.count}</span>
        </button>
      `;
    })
    .join('');

  grid.querySelectorAll('.treasure-slot.filled').forEach((el) => {
    el.addEventListener('click', () => {
      gameState.activeTreasureSlot = Number(el.dataset.index);
      renderTreasureInventory(gameState.treasureSlots);
      renderTreasureDetail(gameState.activeTreasureSlot);
    });
  });
}

function renderTreasureDetail(slotIndex) {
  const panel = document.getElementById('treasure-detail');
  const content = document.getElementById('treasure-detail-content');
  const useBtn = document.getElementById('btn-use-treasure');
  const sellBtn = document.getElementById('btn-sell-treasure');

  const slot = gameState.treasureSlots[slotIndex];
  if (!slot) {
    panel.classList.add('hidden');
    return;
  }

  const meta = TREASURE_META[slot.id];
  panel.classList.remove('hidden');
  const hint = TREASURE_HINT[slot.id] || '';
  content.innerHTML = `
    <div class="detail-name">${meta.name}</div>
    <div class="detail-desc">${hint}</div>
  `;

  useBtn.disabled = !meta.usable;
  useBtn.hidden = !meta.usable;
  useBtn.onclick = () => {
    useTreasureAtSlot(slotIndex);
    updateUI();
  };
  sellBtn.onclick = () => {
    sellTreasureAtSlot(slotIndex);
    updateUI();
  };
}

function renderStorage() {
  const grid = document.getElementById('storage-grid');
  grid.innerHTML = storedWeapons
    .map((weapon, index) => {
      if (!weapon) {
        return '<div class="storage-slot empty" aria-label="빈 보관 슬롯"></div>';
      }
      return `
        <button type="button" class="storage-slot filled" data-index="${index}"
          aria-label="보관 +${weapon.level} ${weapon.name}">
          <span class="storage-label">+${weapon.level} ${weapon.name}</span>
        </button>
      `;
    })
    .join('');

  grid.querySelectorAll('.storage-slot.filled').forEach((el) => {
    el.addEventListener('click', () => swapStoredWeapon(Number(el.dataset.index)));
  });
}

function renderLogs(logs) {
  const list = document.getElementById('log-list');
  if (!logs.length) {
    list.innerHTML =
      '<li class="log-entry">+25에서 끝내세요.</li>';
    return;
  }
  list.innerHTML = logs
    .map((e) => `<li class="log-entry log-${e.type}">${e.message}</li>`)
    .join('');
}

function bindEvents() {
  document.getElementById('openBoxBtn').addEventListener('click', openBox);
  document.getElementById('upgradeBtn').addEventListener('click', upgradeWeapon);
  document.getElementById('upgradeChestBtn').addEventListener('click', upgradeChest);
  document.getElementById('sell-weapon-btn').addEventListener('click', sellWeapon);
  document.getElementById('store-weapon-btn').addEventListener('click', storeCurrentWeapon);

  document.addEventListener('click', (e) => {
    if (
      !e.target.closest('.treasure-slot') &&
      !e.target.closest('.treasure-detail')
    ) {
      gameState.activeTreasureSlot = null;
      document.getElementById('treasure-detail').classList.add('hidden');
      document.querySelectorAll('.treasure-slot.is-active').forEach((el) => {
        el.classList.remove('is-active');
      });
    }
  });
}

function initGame() {
  bindEvents();
  addLog('게임 시작.');
  updateUI();
}

initGame();
