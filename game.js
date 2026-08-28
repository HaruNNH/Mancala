```javascript
(() => {
  const INITIAL = 4;

  const COLOR_CLASSES = [
    'c-red', 'c-orange', 'c-yellow', 'c-green',
    'c-cyan', 'c-blue', 'c-purple', 'c-pink'
  ];

  // =========================================================
  // SOUND
  // =========================================================

  let soundEnabled = true;
  let audioCtx = null;
  let soundBuffer = null;

  const SOUND_URL = 'sound/stone.wav';

  const SOUND_CLIPS = [
    { start: 2.00,  duration: 0.35 },
    { start: 6.15,  duration: 0.35 },
    { start: 10.23, duration: 0.35 },
    { start: 13.95, duration: 0.35 },
    { start: 18.20, duration: 0.35 }
  ];

  function initAudio() {
    if (!audioCtx) {
      const AudioContext =
        window.AudioContext || window.webkitAudioContext;

      if (AudioContext) {
        audioCtx = new AudioContext();
        loadSound();
      }
    }

    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  window.addEventListener('pointerdown', initAudio);

  async function loadSound() {
    if (!audioCtx || soundBuffer) return;

    try {
      const response = await fetch(SOUND_URL);
      const arrayBuffer = await response.arrayBuffer();
      soundBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch (err) {
      console.warn('Audio fetch failed:', err);
    }
  }

  function playGlassStoneSound() {
    if (!soundEnabled) return;

    initAudio();

    if (!audioCtx || !soundBuffer) return;

    const clip =
      SOUND_CLIPS[Math.floor(Math.random() * SOUND_CLIPS.length)];

    const source = audioCtx.createBufferSource();
    const gainNode = audioCtx.createGain();

    source.buffer = soundBuffer;
    source.playbackRate.value = 0.97 + Math.random() * 0.06;
    gainNode.gain.value = 0.9;

    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    source.start(0, clip.start, clip.duration);
  }

  // =========================================================
  // DOM
  // =========================================================

  const soundToggle = document.getElementById('soundToggle');
  const soundStatus = document.getElementById('soundStatus');

  const pitsEl = document.getElementById('pits');
  const boardWrap = document.getElementById('boardWrap');

  const titleScreen = document.getElementById('titleScreen');
  const settingsScreen = document.getElementById('settingsScreen');
  const gameUI = document.getElementById('gameUI');

  const pauseOverlay = document.getElementById('pauseOverlay');
  const resultOverlay = document.getElementById('resultOverlay');

  const opponentLabel = document.getElementById('opponentLabel');
  const youLabel = document.getElementById('youLabel');

  const leftGoalCount = document.getElementById('leftGoalCount');
  const rightGoalCount = document.getElementById('rightGoalCount');

  const goalLeft = document.getElementById('goalLeft');
  const goalRight = document.getElementById('goalRight');

  const settingsError = document.getElementById('settingsError');

  const levelEl = document.getElementById('level');
  const ruleEl = document.getElementById('rule');

  const thinking = document.getElementById('thinking');
  const resultText = document.getElementById('resultText');

  // =========================================================
  // GAME STATE
  // =========================================================

  // 0〜5   = YOU pits
  // 6      = YOU goal
  // 7〜12  = CPU pits
  // 13     = CPU goal

  let boardStones = Array(14).fill(null).map(() => []);
  let board = Array(14).fill(0);

  let current = 'human';
  let cpuLevel = 1;

  let busy = false;
  let isPaused = false;

  // =========================================================
  // SOUND TOGGLE
  // =========================================================

  soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;

    soundToggle.classList.toggle('active', soundEnabled);
    soundStatus.textContent = soundEnabled ? 'ON' : 'OFF';
  });

  // =========================================================
  // BOARD DISPLAY
  // =========================================================

  function createPits() {
    pitsEl.innerHTML = '';

    const isPortrait =
      window.matchMedia('(orientation: portrait)').matches;

    if (isPortrait) {

      // 左列：YOU 0〜5
      // 右列：CPU 12〜7

      for (let row = 0; row < 6; row++) {

        const leftIdx = row;

        const dLeft = document.createElement('div');
        dLeft.className = 'pit bottom';
        dLeft.dataset.index = String(leftIdx);
        dLeft.innerHTML = '<span class="count">0</span>';

        dLeft.addEventListener('click', () => {
          humanMove(Number(dLeft.dataset.index));
        });

        pitsEl.appendChild(dLeft);

        const rightIdx = 12 - row;

        const dRight = document.createElement('div');
        dRight.className = 'pit top';
        dRight.dataset.index = String(rightIdx);
        dRight.innerHTML = '<span class="count">0</span>';

        dRight.addEventListener('click', () => {
          humanMove(Number(dRight.dataset.index));
        });

        pitsEl.appendChild(dRight);
      }

    } else {

      // CPU：12〜7
      for (let i = 12; i >= 7; i--) {

        const d = document.createElement('div');

        d.className = 'pit top';
        d.dataset.index = String(i);
        d.innerHTML = '<span class="count">0</span>';

        d.addEventListener('click', () => {
          humanMove(Number(d.dataset.index));
        });

        pitsEl.appendChild(d);
      }

      // YOU：0〜5
      for (let i = 0; i < 6; i++) {

        const d = document.createElement('div');

        d.className = 'pit bottom';
        d.dataset.index = String(i);
        d.innerHTML = '<span class="count">0</span>';

        d.addEventListener('click', () => {
          humanMove(Number(d.dataset.index));
        });

        pitsEl.appendChild(d);
      }
    }
  }

  window.addEventListener('resize', () => {
    createPits();
    render();
  });

  // =========================================================
  // STONE RENDERING
  // =========================================================

  function renderStones(container, colors, isGoal = false) {

    container
      .querySelectorAll('.stone')
      .forEach(s => s.remove());

    const visibleColors = colors.slice(0, 32);
    const count = visibleColors.length;

    const isPortrait =
      window.matchMedia('(orientation: portrait)').matches;

    visibleColors.forEach((colorClass, k) => {

      const s = document.createElement('span');
      s.className = `stone ${colorClass}`;

      if (!isGoal) {

        const angle =
          (k / Math.max(1, count)) * Math.PI * 2;

        const r = isPortrait
          ? (count <= 6 ? 10 : 15)
          : (count <= 6 ? 20 : 26);

        s.style.transform =
          `translate(${Math.cos(angle) * r}px, ${Math.sin(angle) * r}px)`;

      } else {

        if (isPortrait) {

          const cols = Math.min(count, 12);
          const rows = Math.ceil(count / cols);

          const spacingX = 20;
          const spacingY = 18;

          const col = k % cols;
          const row = Math.floor(k / cols);

          const offsetX =
            (col - (cols - 1) / 2) * spacingX;

          const offsetY =
            (row - (rows - 1) / 2) * spacingY;

          s.style.transform =
            `translate(${offsetX}px, ${offsetY}px)`;

        } else {

          const col = k % 2 === 0 ? -14 : 14;

          const rowHeight =
            Math.min(20, 180 / Math.ceil(count / 2));

          const row =
            (Math.floor(k / 2) - (count / 4)) * rowHeight;

          const offsetX =
            col + Math.sin(k * 3) * 3;

          const offsetY =
            row + Math.cos(k * 2) * 3;

          s.style.transform =
            `translate(${offsetX}px, ${offsetY}px)`;
        }
      }

      container.appendChild(s);
    });
  }

  function render() {

    for (let i = 0; i < 14; i++) {
      board[i] = boardStones[i].length;
    }

    document.querySelectorAll('.pit').forEach(el => {

      const i = Number(el.dataset.index);
      const stones = boardStones[i];

      el.querySelector('.count').textContent =
        stones.length;

      renderStones(el, stones, false);
    });

    leftGoalCount.textContent =
      boardStones[13].length;

    renderStones(
      goalLeft,
      boardStones[13],
      true
    );

    rightGoalCount.textContent =
      boardStones[6].length;

    renderStones(
      goalRight,
      boardStones[6],
      true
    );

    opponentLabel.classList.toggle(
      'active',
      current === 'cpu'
    );

    youLabel.classList.toggle(
      'active',
      current === 'human'
    );
  }

  // =========================================================
  // RESET
  // =========================================================

  function resetBoard() {

    boardStones =
      Array(14).fill(null).map(() => []);

    let pool = [];

    COLOR_CLASSES.forEach(color => {

      for (let i = 0; i < 6; i++) {
        pool.push(color);
      }
    });

    for (let i = pool.length - 1; i > 0; i--) {

      const j =
        Math.floor(Math.random() * (i + 1));

      [pool[i], pool[j]] =
        [pool[j], pool[i]];
    }

    [
      0, 1, 2, 3, 4, 5,
      7, 8, 9, 10, 11, 12
    ].forEach(idx => {

      boardStones[idx] =
        pool.splice(0, INITIAL);
    });

    current = 'human';
    busy = false;
    isPaused = false;

    thinking.style.display = 'none';

    pauseOverlay.classList.add('hidden');

    render();
  }

  // =========================================================
  // COMMON HELPERS
  // =========================================================

  function ownGoal(player) {
    return player === 'human' ? 6 : 13;
  }

  function isOwnPit(index, player) {

    if (player === 'human') {
      return index >= 0 && index <= 5;
    }

    return index >= 7 && index <= 12;
  }

  function legalMoves(player, state = board) {

    const moves = [];

    if (player === 'human') {

      for (let i = 0; i <= 5; i++) {
        if (state[i] > 0) moves.push(i);
      }

    } else {

      for (let i = 7; i <= 12; i++) {
        if (state[i] > 0) moves.push(i);
      }
    }

    return moves;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // =========================================================
  // OPPOSITE PIT
  //
  // 0 <-> 12
  // 1 <-> 11
  // 2 <-> 10
  // 3 <-> 9
  // 4 <-> 8
  // 5 <-> 7
  // =========================================================

  function oppositePit(index) {

    const opposite = {
      0: 12,
      1: 11,
      2: 10,
      3: 9,
      4: 8,
      5: 7,

      7: 5,
      8: 4,
      9: 3,
      10: 2,
      11: 1,
      12: 0
    };

    return opposite[index];
  }

  // =========================================================
  // BASIC
  //
  // ・すべての14マスを順番に回る
  // ・相手ゴールも飛ばさない
  // ・横取りなし
  // ・自分のゴールで終わったら追加ターン
  // ・どちらかの陣地が空になった時点で終了
  // ・残った石を合算する処理はしない
  // ・勝敗は「先に自分の陣地を空にしたか」
  // =========================================================

  async function makeBasicMove(start, player, animate = true) {

    if (boardStones[start].length === 0) {
      return false;
    }

    let hand = [...boardStones[start]];

    boardStones[start] = [];

    render();

    let pos = start;

    while (hand.length > 0) {

      pos = (pos + 1) % 14;

      // BASICは相手ゴールも含めて
      // すべてのマスに置く
      boardStones[pos].push(hand.pop());

      render();

      if (animate) {
        playGlassStoneSound();
        await sleep(220);
      }
    }

    return pos === ownGoal(player);
  }

  // =========================================================
  // KALAHA
  //
  // ・相手ゴールは飛ばす
  // ・自分のゴールには入れる
  // ・最後の石が自分の空ポケット
  //   → その1個 + 対面の石を全部取る
  //   → 自分のゴールへ
  // ・対面が0でも「自分の1個」は必ずゴールへ
  // ・自分のゴールで終わったら追加ターン
  // ・陣地が空になったら終了
  // ・残った石を各自のゴールへ合算
  // ・最終的にゴール数で勝敗
  // =========================================================

  function nextKalahaIndex(pos, player) {

    pos = (pos + 1) % 14;

    const opponentGoal =
      player === 'human' ? 13 : 6;

    if (pos === opponentGoal) {
      pos = (pos + 1) % 14;
    }

    return pos;
  }

  async function makeKalahaMove(start, player, animate = true) {

    if (boardStones[start].length === 0) {
      return false;
    }

    let hand = [...boardStones[start]];

    boardStones[start] = [];

    render();

    let pos = start;

    while (hand.length > 0) {

      pos = nextKalahaIndex(pos, player);

      boardStones[pos].push(hand.pop());

      render();

      if (animate) {
        playGlassStoneSound();
        await sleep(220);
      }
    }

    // -----------------------------------------
    // 自分のゴールで終了
    // -----------------------------------------

    if (pos === ownGoal(player)) {
      return true;
    }

    // -----------------------------------------
    // 自分の陣地の空ポケットで終了
    // → 横取り
    //
    // 重要：
    // 対面が空でも「最後に置いた1個」は
    // 必ずゴールへ移す
    // -----------------------------------------

    if (
      isOwnPit(pos, player) &&
      boardStones[pos].length === 1
    ) {

      const opposite = oppositePit(pos);

      const captured =
        boardStones[opposite].length;

      // 最後に置いた1個
      const ownStone =
        boardStones[pos].pop();

      // 自分のゴールへ
      boardStones[ownGoal(player)].push(ownStone);

      // 対面の石を全部取る
      while (boardStones[opposite].length > 0) {
        boardStones[ownGoal(player)].push(
          boardStones[opposite].pop()
        );
      }

      render();

      if (animate) {
        playGlassStoneSound();
        await sleep(300);
      }

      // captured が0でも、
      // ownStone 1個は必ず移動済み
    }

    return false;
  }

  // =========================================================
  // SUNKA
  //
  // ・相手ゴールは飛ばす
  // ・自分のゴールには入れる
  //
  // 最後の石について：
  //
  // 1. 自分のゴール
  //    → 追加ターン
  //
  // 2. ゴールではなく、最後のポケットが空だった
  //    → 相手ターン
  //
  // 3. 最後のポケットに元々石があった
  //    → 「元々あった石 + 今置いた1個」を全部取る
  //    → その石を持って続けて撒く
  //
  // この処理は自分の陣地か相手の陣地かを問わない。
  // 「最後に置いたポケットに石が残っているか」
  // だけを見る。
  //
  // =========================================================

  function nextSunkaIndex(pos, player) {

    pos = (pos + 1) % 14;

    const opponentGoal =
      player === 'human' ? 13 : 6;

    if (pos === opponentGoal) {
      pos = (pos + 1) % 14;
    }

    return pos;
  }

  async function makeSunkaMove(start, player, animate = true) {

    if (boardStones[start].length === 0) {
      return {
        again: false,
        last: start
      };
    }

    let hand = [...boardStones[start]];

    boardStones[start] = [];

    render();

    let pos = start;

    while (hand.length > 0) {

      pos = nextSunkaIndex(pos, player);

      boardStones[pos].push(hand.pop());

      render();

      if (animate) {
        playGlassStoneSound();
        await sleep(220);
      }
    }

    // -----------------------------------------
    // ① 自分のゴールで終わった
    // → 新しく好きな場所を選んで追加ターン
    // -----------------------------------------

    if (pos === ownGoal(player)) {

      return {
        again: true,
        last: pos
      };
    }

    // -----------------------------------------
    // ② 最後のポケットに元々石があった
    //
    // 最後に置いた1個を含めて、
    // そのポケットにある石を全部取る
    //
    // そして、その石を持って
    // もう一度「置いていく」。
    //
    // 自分陣地か相手陣地かは関係ない。
    // -----------------------------------------

    if (boardStones[pos].length > 1) {

      hand = [...boardStones[pos]];

      boardStones[pos] = [];

      render();

      if (animate) {
        playGlassStoneSound();
        await sleep(250);
      }

      // 取った石を再び撒く
      while (hand.length > 0) {

        pos = nextSunkaIndex(pos, player);

        boardStones[pos].push(hand.pop());

        render();

        if (animate) {
          playGlassStoneSound();
          await sleep(220);
        }
      }

      // 再び最後の場所を判定するため、
      // この関数から戻らずSunkaの連鎖を続ける
      return resolveSunkaChain(pos, player, animate);
    }

    // -----------------------------------------
    // ③ 最後のポケットが空
    // → 相手ターン
    // -----------------------------------------

    return {
      again: false,
      last: pos
    };
  }

  async function resolveSunkaChain(pos, player, animate = true) {

    // ゴールなら追加ターン
    if (pos === ownGoal(player)) {

      return {
        again: true,
        last: pos
      };
    }

    // 最後のポケットに石があるなら
    // その石を全部取ってさらに撒く
    if (boardStones[pos].length > 0) {

      let hand = [...boardStones[pos]];

      boardStones[pos] = [];

      render();

      if (animate) {
        playGlassStoneSound();
        await sleep(250);
      }

      while (hand.length > 0) {

        pos = nextSunkaIndex(pos, player);

        boardStones[pos].push(hand.pop());

        render();

        if (animate) {
          playGlassStoneSound();
          await sleep(220);
        }
      }

      // また最後の場所を判定
      return resolveSunkaChain(
        pos,
        player,
        animate
      );
    }

    // 空ポケットで終了
    return {
      again: false,
      last: pos
    };
  }

  // =========================================================
  // MOVE DISPATCH
  // =========================================================

  async function makeMove(start, player, animate = true) {

    const rule = ruleEl.value;

    if (rule === 'basic') {

      const again =
        await makeBasicMove(
          start,
          player,
          animate
        );

      return {
        again,
        last: null
      };
    }

    if (rule === 'kahala') {

      const again =
        await makeKalahaMove(
          start,
          player,
          animate
        );

      return {
        again,
        last: null
      };
    }

    if (rule === 'sunka') {

      return await makeSunkaMove(
        start,
        player,
        animate
      );
    }

    // 念のため
    return {
      again: false,
      last: null
    };
  }

  // =========================================================
  // GAME END
  // =========================================================

  function basicGameEnded() {

    const humanEmpty =
      board.slice(0, 6).every(v => v === 0);

    const cpuEmpty =
      board.slice(7, 13).every(v => v === 0);

    return humanEmpty || cpuEmpty;
  }

  function scoringGameEnded() {

    const humanEmpty =
      board.slice(0, 6).every(v => v === 0);

    const cpuEmpty =
      board.slice(7, 13).every(v => v === 0);

    return humanEmpty || cpuEmpty;
  }

  function finishScoringGame() {

    // 終了時に残っている石を
    // それぞれのゴールへ全部移す

    for (let i = 0; i <= 5; i++) {

      while (boardStones[i].length > 0) {
        boardStones[6].push(
          boardStones[i].pop()
        );
      }
    }

    for (let i = 7; i <= 12; i++) {

      while (boardStones[i].length > 0) {
        boardStones[13].push(
          boardStones[i].pop()
        );
      }
    }

    render();

    const humanScore =
      boardStones[6].length;

    const cpuScore =
      boardStones[13].length;

    let result;

    if (humanScore > cpuScore) {
      result = 'WIN';
    } else if (humanScore < cpuScore) {
      result = 'LOSE';
    } else {
      result = 'DRAW';
    }

    resultText.textContent = result;
    resultOverlay.classList.remove('hidden');

    busy = true;

    return true;
  }

  function checkWinner() {

    const rule = ruleEl.value;

    // -----------------------------------------
    // BASIC
    // -----------------------------------------

    if (rule === 'basic') {

      if (!basicGameEnded()) {
        return false;
      }

      busy = true;

      const humanEmpty =
        board.slice(0, 6).every(v => v === 0);

      const cpuEmpty =
        board.slice(7, 13).every(v => v === 0);

      let result;

      if (humanEmpty && !cpuEmpty) {
        result = 'WIN';
      } else if (cpuEmpty && !humanEmpty) {
        result = 'LOSE';
      } else {
        result = 'DRAW';
      }

      resultText.textContent = result;
      resultOverlay.classList.remove('hidden');

      return true;
    }

    // -----------------------------------------
    // KALAHA / SUNKA
    // -----------------------------------------

    if (
      rule === 'kahala' ||
      rule === 'sunka'
    ) {

      if (!scoringGameEnded()) {
        return false;
      }

      return finishScoringGame();
    }

    return false;
  }

  // =========================================================
  // AI
  // =========================================================

  /*
    AIについてはルールごとにシミュレーションを分ける。
    Basic / Kalaha / Sunka を混ぜない。
  */

  function cloneState(state) {
    return state.map(v => v);
  }

  function simulateBasic(state, start, player) {

    const s = cloneState(state);

    let stones = s[start];

    s[start] = 0;

    let pos = start;

    while (stones > 0) {

      pos = (pos + 1) % 14;

      s[pos]++;
      stones--;
    }

    return {
      state: s,
      last: pos,
      again: pos === ownGoal(player)
    };
  }

  function simulateKalaha(state, start, player) {

    const s = cloneState(state);

    let stones = s[start];

    s[start] = 0;

    let pos = start;

    while (stones > 0) {

      pos = nextKalahaIndex(pos, player);

      s[pos]++;
      stones--;
    }

    // ゴールなら追加ターン
    if (pos === ownGoal(player)) {

      return {
        state: s,
        last: pos,
        again: true
      };
    }

    // 空の自分ポケットなら横取り
    if (
      isOwnPit(pos, player) &&
      s[pos] === 1
    ) {

      const opposite =
        oppositePit(pos);

      s[ownGoal(player)] +=
        1 + s[opposite];

      s[pos] = 0;
      s[opposite] = 0;
    }

    return {
      state: s,
      last: pos,
      again: false
    };
  }

  function simulateSunka(state, start, player) {

    let s = cloneState(state);

    let stones = s[start];

    s[start] = 0;

    let pos = start;

    while (stones > 0) {

      pos = nextSunkaIndex(pos, player);

      s[pos]++;
      stones--;
    }

    while (true) {

      // ゴールなら追加ターン
      if (pos === ownGoal(player)) {

        return {
          state: s,
          last: pos,
          again: true
        };
      }

      // 最後のポケットに石がある
      // → 全部取って続ける
      if (s[pos] > 0) {

        stones = s[pos];

        s[pos] = 0;

        while (stones > 0) {

          pos =
            nextSunkaIndex(
              pos,
              player
            );

          s[pos]++;
          stones--;
        }

        continue;
      }

      // 空ポケット
      return {
        state: s,
        last: pos,
        again: false
      };
    }
  }

  function simulateByRule(
    state,
    start,
    player
  ) {

    const rule = ruleEl.value;

    if (rule === 'basic') {
      return simulateBasic(
        state,
        start,
        player
      );
    }

    if (rule === 'kahala') {
      return simulateKalaha(
        state,
        start,
        player
      );
    }

    if (rule === 'sunka') {
      return simulateSunka(
        state,
        start,
        player
      );
    }

    return simulateBasic(
      state,
      start,
      player
    );
  }

  // =========================================================
  // AI EVALUATION
  // =========================================================

  function evaluateBasic(s) {

    const humanPits =
      s.slice(0, 6)
       .reduce((a, b) => a + b, 0);

    const cpuPits =
      s.slice(7, 13)
       .reduce((a, b) => a + b, 0);

    // Basicはゴール数では勝敗を決めない
    // 「自分側を空にする」ことを評価する

    return (
      (cpuPits - humanPits) * 10
      + (humanPits === 0 ? 1000 : 0)
      - (cpuPits === 0 ? 1000 : 0)
    );
  }

  function evaluateScoring(s) {

    const humanGoal = s[6];
    const cpuGoal = s[13];

    const humanPits =
      s.slice(0, 6)
       .reduce((a, b) => a + b, 0);

    const cpuPits =
      s.slice(7, 13)
       .reduce((a, b) => a + b, 0);

    return (
      (cpuGoal - humanGoal) * 30
      + (cpuPits - humanPits) * 5
    );
  }

  function evaluateState(s) {

    if (ruleEl.value === 'basic') {
      return evaluateBasic(s);
    }

    return evaluateScoring(s);
  }

  // =========================================================
  // MINIMAX
  // =========================================================

  function minimax(
    state,
    depth,
    player,
    alpha,
    beta
  ) {

    const humanEmpty =
      state.slice(0, 6)
           .every(v => v === 0);

    const cpuEmpty =
      state.slice(7, 13)
           .every(v => v === 0);

    if (humanEmpty || cpuEmpty) {

      if (ruleEl.value === 'basic') {

        if (cpuEmpty && !humanEmpty) {
          return 100000;
        }

        if (humanEmpty && !cpuEmpty) {
          return -100000;
        }

        return 0;
      }

      return evaluateScoring(state) * 100;
    }

    if (depth <= 0) {
      return evaluateState(state);
    }

    const moves =
      legalMoves(player, state);

    if (!moves.length) {
      return evaluateState(state);
    }

    // CPU = maximize
    if (player === 'cpu') {

      let value = -Infinity;

      for (const move of moves) {

        const result =
          simulateByRule(
            state,
            move,
            'cpu'
          );

        const nextPlayer =
          result.again
            ? 'cpu'
            : 'human';

        let score =
          minimax(
            result.state,
            depth - 1,
            nextPlayer,
            alpha,
            beta
          );

        if (result.again) {
          score += 15;
        }

        value =
          Math.max(value, score);

        alpha =
          Math.max(alpha, value);

        if (beta <= alpha) {
          break;
        }
      }

      return value;
    }

    // HUMAN = minimize
    let value = Infinity;

    for (const move of moves) {

      const result =
        simulateByRule(
          state,
          move,
          'human'
        );

      const nextPlayer =
        result.again
          ? 'human'
          : 'cpu';

      let score =
        minimax(
          result.state,
          depth - 1,
          nextPlayer,
          alpha,
          beta
        );

      if (result.again) {
        score -= 15;
      }

      value =
        Math.min(value, score);

      beta =
        Math.min(beta, value);

      if (beta <= alpha) {
        break;
      }
    }

    return value;
  }

  // =========================================================
  // CPU MOVE
  // =========================================================

  function chooseCpuMove() {

    const moves =
      legalMoves('cpu');

    if (!moves.length) {
      return 7;
    }

    // LEVEL 1
    if (cpuLevel === 1) {

      return moves[
        Math.floor(
          Math.random() * moves.length
        )
      ];
    }

    // LEVEL 2
    if (cpuLevel === 2) {

      let best = -Infinity;
      let candidates = [];

      for (const move of moves) {

        const result =
          simulateByRule(
            board,
            move,
            'cpu'
          );

        let score =
          evaluateState(result.state);

        if (result.again) {
          score += 20;
        }

        if (score > best) {

          best = score;
          candidates = [move];

        } else if (score === best) {

          candidates.push(move);
        }
      }

      return candidates[
        Math.floor(
          Math.random() * candidates.length
        )
      ];
    }

    // LEVEL 3
    if (cpuLevel === 3) {

      let best = -Infinity;
      let candidates = [];

      for (const move of moves) {

        const result =
          simulateByRule(
            board,
            move,
            'cpu'
          );

        let score =
          evaluateState(result.state);

        if (result.again) {
          score += 25;
        }

        const humanMoves =
          legalMoves(
            'human',
            result.state
          );

        if (humanMoves.length) {

          let worst = Infinity;

          for (const humanMove of humanMoves) {

            const response =
              simulateByRule(
                result.state,
                humanMove,
                'human'
              );

            let responseScore =
              evaluateState(
                response.state
              );

            if (response.again) {
              responseScore -= 10;
            }

            worst =
              Math.min(
                worst,
                responseScore
              );
          }

          score += worst * 0.7;
        }

        if (score > best) {

          best = score;
          candidates = [move];

        } else if (score === best) {

          candidates.push(move);
        }
      }

      return candidates[
        Math.floor(
          Math.random() * candidates.length
        )
      ];
    }

    // LEVEL 4
    const SEARCH_DEPTH = 5;

    let bestScore = -Infinity;
    let candidates = [];

    for (const move of moves) {

      const result =
        simulateByRule(
          board,
          move,
          'cpu'
        );

      const nextPlayer =
        result.again
          ? 'cpu'
          : 'human';

      let score =
        minimax(
          result.state,
          SEARCH_DEPTH - 1,
          nextPlayer,
          -Infinity,
          Infinity
        );

      if (result.again) {
        score += 30;
      }

      if (score > bestScore) {

        bestScore = score;
        candidates = [move];

      } else if (score === bestScore) {

        candidates.push(move);
      }
    }

    return candidates[
      Math.floor(
        Math.random() * candidates.length
      )
    ];
  }

  // =========================================================
  // HUMAN TURN
  // =========================================================

  async function humanMove(index) {

    if (
      busy ||
      isPaused ||
      current !== 'human'
    ) {
      return;
    }

    if (
      index < 0 ||
      index > 5 ||
      boardStones[index].length === 0
    ) {
      return;
    }

    busy = true;

    const result =
      await makeMove(
        index,
        'human',
        true
      );

    if (checkWinner()) {
      return;
    }

    if (result.again) {

      // ゴールで終わった場合：
      // Basic / Kalaha / Sunka すべて
      // 自分のターンを継続
      current = 'human';

      render();

      await sleep(250);

      busy = false;

    } else {

      current = 'cpu';

      render();

      await sleep(350);

      await cpuTurn();
    }
  }

  // =========================================================
  // CPU TURN
  // =========================================================

  async function cpuTurn() {

    if (checkWinner() || isPaused) {
      return;
    }

    busy = true;

    thinking.style.display = 'block';

    await sleep(450);

    if (isPaused) {

      busy = false;
      return;
    }

    const move =
      chooseCpuMove();

    const result =
      await makeMove(
        move,
        'cpu',
        true
      );

    thinking.style.display = 'none';

    if (checkWinner()) {
      return;
    }

    if (result.again) {

      current = 'cpu';

      render();

      await sleep(350);

      busy = false;

      await cpuTurn();

    } else {

      current = 'human';

      render();

      busy = false;
    }
  }

  // =========================================================
  // MENU
  // =========================================================

  function showTitle() {

    resultOverlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');

    settingsScreen.classList.add('hidden');
    titleScreen.classList.remove('hidden');

    gameUI.classList.add('hidden');

    boardWrap.style.opacity = '0.52';

    resetBoard();
  }

  document
    .getElementById('toSettings')
    .addEventListener('click', () => {

      settingsError.textContent = '';

      settingsScreen.classList.remove('hidden');
      titleScreen.classList.add('hidden');
    });

  document
    .getElementById('startGame')
    .addEventListener('click', () => {

      if (
        !levelEl.value ||
        !ruleEl.value
      ) {

        settingsError.textContent =
          'Please make a selection';

        return;
      }

      cpuLevel =
        Number(levelEl.value);

      settingsError.textContent = '';

      settingsScreen.classList.add('hidden');
      gameUI.classList.remove('hidden');

      boardWrap.style.opacity = '1';

      resetBoard();
    });

  document
    .getElementById('pauseBtn')
    .addEventListener('click', () => {

      isPaused = true;

      pauseOverlay.classList.remove('hidden');
    });

  document
    .getElementById('resumeBtn')
    .addEventListener('click', () => {

      isPaused = false;

      pauseOverlay.classList.add('hidden');

      if (
        current === 'cpu' &&
        !busy
      ) {
        cpuTurn();
      }
    });

  document
    .getElementById('quitBtn')
    .addEventListener(
      'click',
      showTitle
    );

  document
    .getElementById('restart')
    .addEventListener('click', () => {

      resultOverlay.classList.add('hidden');

      boardWrap.style.opacity = '1';

      resetBoard();
    });

  document
    .getElementById('backTitle')
    .addEventListener(
      'click',
      showTitle
    );

  // =========================================================
  // INITIALIZE
  // =========================================================

  createPits();
  resetBoard();

  boardWrap.style.opacity = '0.52';

})();
```
