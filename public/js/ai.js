// =============================================
//  ai.js — 완전 개선된 AI 전략
//  ✅ 8단계 우선순위 킵 전략
//  ✅ 족보 완성 즉시 전부 킵
//  ✅ 희생 시 최저가치 카테고리 선택
// =============================================

const CAT_MAX = {
  ones:5, twos:10, threes:15, fours:20, fives:25, sixes:30,
  choice:30, fourOfAKind:24, fullHouse:28,
  smallStraight:15, largeStraight:30, yacht:50,
};

function aiChooseDiceToKeep(dice, availableCats, rollsRemaining) {
  const counts = getCounts(dice);
  const unique  = [...new Set(dice)].sort((a, b) => a - b);

  const sortedCounts = Object.entries(counts)
    .map(([val, cnt]) => ({ val: Number(val), cnt }))
    .sort((a, b) => b.cnt - a.cnt || b.val - a.val);

  const topVal = sortedCounts[0].val;
  const topCnt = sortedCounts[0].cnt;

  // ── 이미 완성된 족보 전부 킵 ──
  if (new Set(dice).size === 1 && availableCats.includes('yacht'))
    return dice.map((_, i) => i);

  if (ScoreCalc.largeStraight(dice) === 30 && availableCats.includes('largeStraight'))
    return dice.map((_, i) => i);

  if (ScoreCalc.fullHouse(dice) > 0 && availableCats.includes('fullHouse'))
    return dice.map((_, i) => i);

  if (ScoreCalc.smallStraight(dice) === 15 && availableCats.includes('smallStraight')
      && !availableCats.includes('largeStraight'))
    return dice.map((_, i) => i);

  // ── 1순위: Yacht 노리기 (3개 이상) ──
  if (availableCats.includes('yacht') && topCnt >= 3)
    return dice.map((v, i) => v === topVal ? i : -1).filter(i => i >= 0);

  // ── 2순위: Yacht 노리기 (2개, 굴리기 2번 이상 남음) ──
  if (availableCats.includes('yacht') && topCnt === 2 && rollsRemaining >= 2)
    return dice.map((v, i) => v === topVal ? i : -1).filter(i => i >= 0);

  // ── 3순위: Large Straight 노리기 ──
  if (availableCats.includes('largeStraight')) {
    const seqs4 = [[1,2,3,4],[2,3,4,5],[3,4,5,6]];
    for (const seq of seqs4) {
      if (seq.every(n => unique.includes(n))) {
        const kept = [], used = new Set();
        seq.forEach(n => {
          const idx = dice.findIndex((v, i) => v === n && !used.has(i));
          if (idx >= 0) { kept.push(idx); used.add(idx); }
        });
        return kept;
      }
    }
    if (rollsRemaining >= 1) {
      const seqs3 = [[1,2,3],[2,3,4],[3,4,5],[4,5,6]];
      for (const seq of seqs3) {
        if (seq.every(n => unique.includes(n))) {
          const kept = [], used = new Set();
          seq.forEach(n => {
            const idx = dice.findIndex((v, i) => v === n && !used.has(i));
            if (idx >= 0) { kept.push(idx); used.add(idx); }
          });
          return kept;
        }
      }
    }
  }

  // ── 4순위: 4 of a Kind 노리기 (3개 이상) ──
  if (availableCats.includes('fourOfAKind') && topCnt >= 3)
    return dice.map((v, i) => v === topVal ? i : -1).filter(i => i >= 0);

  // ── 5순위: Full House 노리기 ──
  if (availableCats.includes('fullHouse')) {
    if (topCnt === 3 && rollsRemaining >= 1)
      return dice.map((v, i) => v === topVal ? i : -1).filter(i => i >= 0);
    if (sortedCounts.length >= 2 &&
        sortedCounts[0].cnt >= 2 && sortedCounts[1].cnt >= 2) {
      const keepVal = sortedCounts[0].val;
      return dice.map((v, i) => v === keepVal ? i : -1).filter(i => i >= 0);
    }
  }

  // ── 6순위: 상단 섹션 최적화 ──
  const upperAvail = UPPER_CATS.filter(c => availableCats.includes(c));
  if (upperAvail.length > 0) {
    const upperBest = upperAvail
      .map(c => {
        const num = UPPER_CATS.indexOf(c) + 1;
        const cnt = counts[num] || 0;
        return { num, cnt, score: cnt * num };
      })
      .sort((a, b) => b.score - a.score);

    if (upperBest[0].cnt >= 2 && upperBest[0].score > 0) {
      const keepVal = upperBest[0].num;
      return dice.map((v, i) => v === keepVal ? i : -1).filter(i => i >= 0);
    }
  }

  // ── 7순위: 쌍 킵 ──
  if (topCnt >= 2)
    return dice.map((v, i) => v === topVal ? i : -1).filter(i => i >= 0);

  // ── 8순위: 가장 높은 눈 1개 킵 ──
  const maxVal = Math.max(...dice);
  return [dice.indexOf(maxVal)];
}

function aiChooseBestScore(dice, availableCats) {
  const scored = availableCats.map(cat => ({
    cat,
    score:    ScoreCalc[cat](dice),
    maxScore: CAT_MAX[cat],
  }));

  const positive = scored.filter(o => o.score > 0);

  if (positive.length > 0) {
    const yacht   = positive.find(o => o.cat === 'yacht');
    if (yacht) return yacht.cat;

    const largeSt = positive.find(o => o.cat === 'largeStraight');
    if (largeSt) return largeSt.cat;

    const fullH   = positive.find(o => o.cat === 'fullHouse');
    if (fullH) return fullH.cat;

    const smallSt = positive.find(o => o.cat === 'smallStraight');
    if (smallSt) return smallSt.cat;

    positive.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.score / b.maxScore) - (a.score / a.maxScore);
    });

    return positive[0].cat;
  }

  // 모두 0점: 최저가치 카테고리 희생
  const preserve   = ['yacht', 'largeStraight', 'fullHouse', 'smallStraight'];
  const sacrifice  = availableCats
    .filter(c => !preserve.includes(c))
    .sort((a, b) => CAT_MAX[a] - CAT_MAX[b]);

  if (sacrifice.length > 0) return sacrifice[0];

  return availableCats.sort((a, b) => CAT_MAX[a] - CAT_MAX[b])[0];
}