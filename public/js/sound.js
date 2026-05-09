// =============================================
//  sound.js — 사운드 시스템
//  굴리기: E 딸그락딸그락 (보드게임 리듬)
//  킵:     D 딸깍 (가벼운 기계음)
//  점수선택: C 슥! (카드 슬라이드)
// =============================================

const SFX = {
  _ctx: null,

  // ── AudioContext 안전하게 가져오기 ──
  async _getCtx() {
    try {
      if (!this._ctx)
        this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this._ctx.state === 'suspended')
        await this._ctx.resume();
      return this._ctx;
    } catch (e) { return null; }
  },

  // ── 단순 음 ──
  async _tone(freq, delay, vol, dur, type = 'sine') {
    const ctx = await this._getCtx();
    if (!ctx) return;
    try {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    } catch (e) {}
  },

  // ── 노이즈 버스트 ──
  async _noise(delay, vol, dur, hpFreq = 800, bpFreq = 0) {
    const ctx = await this._getCtx();
    if (!ctx) return;
    try {
      const size = Math.floor(ctx.sampleRate * dur);
      const buf  = ctx.createBuffer(1, size, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1);

      const src  = ctx.createBufferSource();
      src.buffer = buf;

      // 하이패스 필터
      const hp  = ctx.createBiquadFilter();
      hp.type   = 'highpass';
      hp.frequency.value = hpFreq;

      const gain = ctx.createGain();
      const t    = ctx.currentTime + delay;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      src.connect(hp);

      // 밴드패스 필터 옵션
      if (bpFreq > 0) {
        const bp  = ctx.createBiquadFilter();
        bp.type   = 'bandpass';
        bp.frequency.value = bpFreq;
        bp.Q.value = 2.5;
        hp.connect(bp);
        bp.connect(gain);
      } else {
        hp.connect(gain);
      }

      gain.connect(ctx.destination);
      src.start(t);
      src.stop(t + dur + 0.02);
    } catch (e) {}
  },

  // ══════════════════════════════════════════
  //  1. 게임 시작 — 갓필드 띵동
  //     sounds/start.mp3 우선, 없으면 합성
  // ══════════════════════════════════════════
  async playStart() {
    try {
      const audio = new Audio('sounds/start.mp3');
      audio.volume = 0.85;
      await audio.play();
      return;
    } catch (e) {}
    // 합성 대체음
    this._tone(1047, 0.00, 0.50, 0.65);
    this._tone(880,  0.00, 0.18, 0.55);
    this._tone(784,  0.30, 0.45, 0.70);
    this._tone(659,  0.30, 0.14, 0.60);
  },

  // ══════════════════════════════════════════
  //  2. 주사위 굴리는 소리
  //     E: 보드게임 딸그락딸그락 (리듬감)
  //     → 딸-그락 그룹을 3번 반복
  //     → 나무 질감 저음 추가
  // ══════════════════════════════════════════
  playDiceRoll() {
    (async () => {
      const ctx = await this._getCtx();
      if (!ctx) return;

      // 딸그락 그룹 3개 (갈수록 약해짐)
      const groups = [
        { t: 0.00, vol: 0.40 },
        { t: 0.24, vol: 0.32 },
        { t: 0.46, vol: 0.24 },
      ];

      groups.forEach(({ t, vol }) => {
        // "딸" — 날카로운 고주파 타격
        this._noise(t + 0.000, vol,        0.052, 1000, 1400);
        this._tone(88 + Math.random()*18, t + 0.000, vol * 0.22, 0.042, 'square');

        // "그락" — 약간 낮고 잔향 있는 소리
        this._noise(t + 0.078, vol * 0.78, 0.068, 750,  1000);
        this._tone(72 + Math.random()*16, t + 0.078, vol * 0.14, 0.052, 'square');
      });

      // 마지막 정착음 (주사위 멈추는 느낌)
      this._noise(0.68, 0.16, 0.038, 1400);
    })();
  },

  // ══════════════════════════════════════════
  //  3. 주사위 킵(고정)할 때
  //     D: 딸깍 — 가벼운 기계음
  //     → 고주파 클릭 + 짧은 리바운드
  // ══════════════════════════════════════════
  playKeep() {
    (async () => {
      // 첫 타격: 날카로운 기계음
      this._noise(0.000, 0.58, 0.016, 4200);
      this._tone(1600, 0.000, 0.12,  0.020, 'square');

      // 리바운드: 살짝 낮아지며 마무리
      this._tone(900,  0.018, 0.065, 0.030, 'square');
      this._noise(0.018, 0.22, 0.013, 2800);
    })();
  },

  // ══════════════════════════════════════════
  //  4. 점수 선택할 때
  //     C: 슥! — 카드 빠르게 슬라이드
  //     → 고주파 스윕 + 선택 확정음
  // ══════════════════════════════════════════
  playClick() {
    (async () => {
      // 슥! — 빠른 고주파 슬라이드
      this._noise(0.000, 0.44, 0.050, 2400);
      this._tone(2000, 0.000, 0.10,  0.032, 'sine');
      this._tone(1400, 0.028, 0.06,  0.024, 'sine');

      // 선택 확정음 (살짝 낮은 음)
      this._tone(880,  0.058, 0.12,  0.085, 'sine');
    })();
  },

  // ══════════════════════════════════════════
  //  5. Yacht 달성 축하 🎉
  // ══════════════════════════════════════════
  playYacht() {
    (async () => {
      const steps = [523, 659, 784, 1047, 1319];
      steps.forEach((f, i) => this._tone(f, i * 0.10, 0.42, 0.22));
      const t0 = steps.length * 0.10 + 0.06;
      [1047, 784, 523].forEach((f, i) =>
        this._tone(f, t0, 0.38 - i * 0.08, 0.9)
      );
    })();
  },

  // ══════════════════════════════════════════
  //  6. AI 턴 시작 알림음
  // ══════════════════════════════════════════
  playAITurn() {
    (async () => {
      this._tone(440, 0.00, 0.20, 0.18);
      this._tone(554, 0.14, 0.16, 0.15);
    })();
  },

  // ══════════════════════════════════════════
  //  7. 게임 종료 — 승리
  // ══════════════════════════════════════════
  playWin() {
    (async () => {
      [523, 659, 784, 1047].forEach((f, i) =>
        this._tone(f, i * 0.12, 0.42, 0.28)
      );
      const t0 = 4 * 0.12 + 0.04;
      [1047, 784, 523].forEach((f, i) =>
        this._tone(f, t0, 0.50 - i * 0.08, 1.2)
      );
    })();
  },

  // ══════════════════════════════════════════
  //  8. 게임 종료 — 패배
  // ══════════════════════════════════════════
  playLose() {
    (async () => {
      [523, 494, 440, 392, 349].forEach((f, i) =>
        this._tone(f, i * 0.14, 0.35, 0.28)
      );
    })();
  },

  // ══════════════════════════════════════════
  //  9. 무승부
  // ══════════════════════════════════════════
  playDraw() {
    (async () => {
      this._tone(523, 0.00, 0.28, 0.30);
      this._tone(523, 0.35, 0.28, 0.30);
    })();
  },
};