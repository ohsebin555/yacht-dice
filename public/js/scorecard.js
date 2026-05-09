// =============================================
//  scorecard.js — 전체 재검증 & 수정
//  규칙 기준: 유저 제공 요트 다이스 규칙
// =============================================

const ALL_CATS = [
  'ones','twos','threes','fours','fives','sixes',
  'choice','fourOfAKind','fullHouse','smallStraight','largeStraight','yacht'
];
const UPPER_CATS = ['ones','twos','threes','fours','fives','sixes'];
const LOWER_CATS = ['choice','fourOfAKind','fullHouse','smallStraight','largeStraight','yacht'];

const CAT_NAMES = {
  ones:          'Aces',
  twos:          'Deuces',
  threes:        'Threes',
  fours:         'Fours',
  fives:         'Fives',
  sixes:         'Sixes',
  choice:        'Choice',
  fourOfAKind:   '4 of a Kind',
  fullHouse:     'Full House',
  smallStraight: 'S. Straight',
  largeStraight: 'L. Straight',
  yacht:         'Yacht',
};

// ── 각 눈금 개수 세기 ──
// 반환 예: {1:2, 3:1, 5:2}  ← 키는 반드시 Number로 변환해서 사용
function getCounts(dice) {
  const acc = {};
  dice.forEach(v => { acc[v] = (acc[v] || 0) + 1; });
  return acc;
}

// ── 전체 합 ──
function sumAll(dice) {
  return dice.reduce((a, b) => a + b, 0);
}

// ══════════════════════════════════════════
//  족보 계산 — 유저 제공 규칙 기준
// ══════════════════════════════════════════
const ScoreCalc = {

  // ─ 상단: 해당 숫자 눈만 합산 ─
  // Aces: 1이 나온 주사위 총합. 최대 5점
  ones:   dice => dice.filter(v => v === 1).reduce((a, b) => a + b, 0),
  // Deuces: 2가 나온 주사위 총합. 최대 10점
  twos:   dice => dice.filter(v => v === 2).reduce((a, b) => a + b, 0),
  // Threes: 3이 나온 주사위 총합. 최대 15점
  threes: dice => dice.filter(v => v === 3).reduce((a, b) => a + b, 0),
  // Fours: 4가 나온 주사위 총합. 최대 20점
  fours:  dice => dice.filter(v => v === 4).reduce((a, b) => a + b, 0),
  // Fives: 5가 나온 주사위 총합. 최대 25점
  fives:  dice => dice.filter(v => v === 5).reduce((a, b) => a + b, 0),
  // Sixes: 6이 나온 주사위 총합. 최대 30점
  sixes:  dice => dice.filter(v => v === 6).reduce((a, b) => a + b, 0),

  // ─ Choice: 5개 전부 합산, 조건 없음. 최대 30점 ─
  choice: dice => sumAll(dice),

  // ─ Four of a Kind: 같은 숫자 4개 이상 → 그 숫자 × 4 ─
  // 최대 24점 (4 × 6)
  // [1,1,1,1,5] → 1×4 = 4 (5는 포함 안 됨)
  // [6,6,6,6,3] → 6×4 = 24 (3은 포함 안 됨)
  // [1,1,1,1,1] → 1×4 = 4 (5개여도 4개만 계산)
  fourOfAKind: dice => {
    const counts = getCounts(dice);
    // 4개 이상인 숫자 찾기
    const entry = Object.entries(counts).find(([, cnt]) => cnt >= 4);
    if (!entry) return 0;
    const matchVal = Number(entry[0]); // 해당 숫자 (Number 변환 필수!)
    return matchVal * 4; // 항상 4개만 계산
  },

  // ─ Full House: 3개 + 2개 → 5개 전부 합산. 최대 28점 ─
  // [2,2,3,3,3] → 2+2+3+3+3 = 13
  // [5,5,6,6,6] → 5+5+6+6+6 = 28
  // Yacht는 해당 안 됨 (2종류 숫자 필요)
  fullHouse: dice => {
    const counts = getCounts(dice);
    // 숫자 정렬 필수: (a,b)=>a-b 없으면 문자열 정렬돼서 버그 발생!
    const vals = Object.values(counts).sort((a, b) => a - b);
    const ok = vals.length === 2 && vals[0] === 2 && vals[1] === 3;
    return ok ? sumAll(dice) : 0;
  },

  // ─ S. Straight: 4개 이상 연속 → 고정 15점 ─
  // 가능 조합: 1-2-3-4, 2-3-4-5, 3-4-5-6
  // L. Straight가 나와도 S. Straight 15점 선택 가능
  smallStraight: dice => {
    const unique = [...new Set(dice)].sort((a, b) => a - b);
    const seqs = [[1,2,3,4], [2,3,4,5], [3,4,5,6]];
    return seqs.some(s => s.every(n => unique.includes(n))) ? 15 : 0;
  },

  // ─ L. Straight: 5개 연속 → 고정 30점 ─
  // 가능 조합: 1-2-3-4-5, 2-3-4-5-6
  largeStraight: dice => {
    const unique = [...new Set(dice)].sort((a, b) => a - b);
    if (unique.length !== 5) return 0; // 중복 있으면 무조건 탈락
    const joined = unique.join('');
    return (joined === '12345' || joined === '23456') ? 30 : 0;
  },

  // ─ Yacht: 5개 모두 동일 → 고정 50점 ─
  yacht: dice => new Set(dice).size === 1 ? 50 : 0,
};

// ── 상단 합계 계산 ──
function getUpperSum(scores) {
  return UPPER_CATS.reduce((sum, cat) => sum + (scores[cat] ?? 0), 0);
}

// ── 최종 총점 (상단 + 보너스 + 하단) ──
function getTotal(scores) {
  const upper = getUpperSum(scores);
  const bonus = upper >= 63 ? 35 : 0;
  const lower = LOWER_CATS.reduce((sum, cat) => sum + (scores[cat] ?? 0), 0);
  return upper + bonus + lower;
}

// ══════════════════════════════════════════
//  점수판 UI 업데이트
// ══════════════════════════════════════════
function updateScoreCard(playerScores, aiScores, currentDice, isPlayerTurn, rollsLeft, onSelect) {
  const hasDice     = Array.isArray(currentDice) && currentDice.length === 5;
  const showPreview = isPlayerTurn && hasDice && rollsLeft < 3;

  ALL_CATS.forEach(cat => {
    const row = document.querySelector(`tr[data-cat="${cat}"]`);
    if (!row) return;

    const pCell = row.querySelector('.cell-player');
    const aCell = row.querySelector('.cell-ai');
    if (!pCell || !aCell) return;

    // ── 플레이어 셀 ──
    if (playerScores[cat] !== undefined) {
      // 이미 기록됨
      pCell.textContent  = playerScores[cat];
      pCell.className    = 'sc-cell cell-player scored';
      pCell.style.cursor = 'default';
      pCell.onclick      = null;

    } else if (showPreview) {
      const preview = ScoreCalc[cat](currentDice);

      if (preview > 0) {
        // 점수 있음 → 초록 강조
        pCell.textContent  = `(${preview})`;
        pCell.className    = 'sc-cell cell-player available';
        pCell.style.cursor = 'pointer';
        pCell.onclick      = () => { if (onSelect) onSelect(cat); };
      } else {
        // 0점 → 주황 (선택하면 0점 기록)
        pCell.textContent  = '0';
        pCell.className    = 'sc-cell cell-player zero-avail';
        pCell.style.cursor = 'pointer';
        pCell.onclick      = () => { if (onSelect) onSelect(cat); };
      }
    } else {
      // 아직 굴리지 않음
      pCell.textContent  = '-';
      pCell.className    = 'sc-cell cell-player';
      pCell.style.cursor = 'default';
      pCell.onclick      = null;
    }

    // ── AI 셀 ──
    if (aiScores[cat] !== undefined) {
      aCell.textContent = aiScores[cat];
      aCell.className   = 'sc-cell cell-ai scored';
    } else {
      aCell.textContent = '-';
      aCell.className   = 'sc-cell cell-ai';
    }
  });

  // ── 소계 ──
  const pu = getUpperSum(playerScores);
  const au = getUpperSum(aiScores);
  const subRow = document.getElementById('row-subtotal');
  if (subRow) {
    subRow.querySelector('.cell-player').textContent = `${pu}/63`;
    subRow.querySelector('.cell-ai').textContent     = `${au}/63`;
  }

  // ── 보너스 ──
  const bonRow = document.getElementById('row-bonus');
  if (bonRow) {
    bonRow.querySelector('.cell-player').textContent = pu >= 63 ? '+35' : '-';
    bonRow.querySelector('.cell-ai').textContent     = au >= 63 ? '+35' : '-';
  }

  // ── 합계 ──
  const totRow = document.getElementById('row-total');
  if (totRow) {
    totRow.querySelector('.cell-player').textContent = getTotal(playerScores);
    totRow.querySelector('.cell-ai').textContent     = getTotal(aiScores);
  }
}