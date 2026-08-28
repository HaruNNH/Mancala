(() => {
  const INITIAL = 4;

  const COLOR_CLASSES = [
    'c-red',
    'c-orange',
    'c-yellow',
    'c-green',
    'c-cyan',
    'c-blue',
    'c-purple',
    'c-pink'
  ];

  /* =========================================================
     SOUND
     ========================================================= */

  let soundEnabled = true;
  let audioCtx = null;
  let soundBuffer = null;

  /*
    stone.wav は index.html と同じ Mancala フォルダに置く
  */
  const SOUND_URL = 'stone.wav';

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

  window.addEventListener('pointerdown', initAudio, {
    once: false
  });

  async function loadSound() {
    if (!audioCtx || soundBuffer) return;

    try {
      const response = await fetch(SOUND_URL);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      soundBuffer =
        await audioCtx.decodeAudioData(arrayBuffer);

    } catch (err) {
      console.warn('Audio fetch failed:', err);
    }
  }

  function playGlassStoneSound() {
    if (!soundEnabled) return;

    initAudio();

    if (!audioCtx || !soundBuffer) return;

    const clip =
      SOUND_CLIPS[
        Math.floor(Math.random() * SOUND_CLIPS.length)
      ];

    const source = audioCtx.createBufferSource();
    const gainNode = audioCtx.createGain();

    source.buffer = soundBuffer;
    source.playbackRate.value =
      0.97 + Math.random() * 0.06;

    gainNode.gain.value = 0.9;

    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    source.start(
      0,
      clip.start,
      clip.duration
    );
  }


  /* =========================================================
     DOM
     ========================================================= */

  const soundToggle =
    document.getElementById('soundToggle');

  const soundStatus =
    document.getElementById('soundStatus');

  const pitsEl =
    document.getElementById('pits');

  const boardWrap =
    document.getElementById('boardWrap');

  const titleScreen =
    document.getElementById('titleScreen');

  const settingsScreen =
    document.getElementById('settingsScreen');

  const gameUI =
    document.getElementById('gameUI');

  const pauseOverlay =
    document.getElementById('pauseOverlay');

  const resultOverlay =
    document.getElementById('resultOverlay');

  const opponentLabel =
    document.getElementById('opponentLabel');

  const youLabel =
    document.getElementById('youLabel');

  const leftGoalCount =
    document.getElementById('leftGoalCount');

  const rightGoalCount =
    document.getElementById('rightGoalCount');

  const goalLeft =
    document.getElementById('goalLeft');

  const goalRight =
    document.getElementById('goalRight');

  const settingsError =
    document.getElementById('settingsError');

  const levelEl =
    document.getElementById('level');

  const ruleEl =
    document.getElementById('rule');

  const thinking =
    document.getElementById('thinking');

  const resultText =
    document.getElementById('resultText');


  /* =========================================================
     RULES
     ========================================================= */

  /*
    basic  = これまでの Clear-to-Win
    kalaha = 今回作ったカハラ
    sunka  = 今回作るスンカ
  */

  const RULE_BASIC = 'basic';
  const RULE_KALAHA = 'kalaha';
  const RULE_SUNKA = 'sunka';

  let currentRule = RULE_BASIC;


  /*
    HTML側にまだ選択肢がなくても、
    JSから追加する。
  */
  function setupRuleOptions() {
    if (!ruleEl) return;

    const existing = [
      ...ruleEl.options
    ].map(option => option.value);

    if (!existing.includes(RULE_BASIC)) {
      const option =
        document.createElement('option');

      option.value = RULE_BASIC;
      option.textContent = 'Clear-to-Win';

      ruleEl.appendChild(option);
    }

    if (!existing.includes(RULE_KALAHA)) {
      const option =
        document.createElement('option');

      option.value = RULE_KALAHA;
      option.textContent = 'Kalaha';

      ruleEl.appendChild(option);
    }

    if (!existing.includes(RULE_SUNKA)) {
      const option =
        document.createElement('option');

      option.value = RULE_SUNKA;
      option.textContent = 'Sunka';

      ruleEl.appendChild(option);
    }
  }


  /* =========================================================
     GAME STATE
     ========================================================= */

  /*
    index:

      YOU
      0 1 2 3 4 5
      6 = YOU GOAL

      CPU
      7 8 9 10 11 12
      13 = CPU GOAL
  */

  let boardStones =
    Array(14)
      .fill(null)
      .map(() => []);

  let board =
    Array(14).fill(0);

  let current = 'human';

  let cpuLevel = 1;

  let busy = false;

  let isPaused = false;


  /* =========================================================
     BOARD DISPLAY
     ========================================================= */

  function createPits() {
    pitsEl.innerHTML = '';

    const isPortrait =
      window.matchMedia(
        '(orientation: portrait)'
      ).matches;

    if (isPortrait) {

      /*
        スマホ

        左列：YOU 0〜5
        右列：CPU 12〜7
      */

      for (let row = 0; row < 6; row++) {

        const leftIdx = row;

        const dLeft =
          document.createElement('div');

        dLeft.className = 'pit bottom';

        dLeft.dataset.index =
          String(leftIdx);

        dLeft.innerHTML =
          '<span class="count">0</span>';

        dLeft.addEventListener(
          'click',
          () =>
            humanMove(
              Number(dLeft.dataset.index)
            )
        );

        pitsEl.appendChild(dLeft);


        const rightIdx =
          12 - row;

        const dRight =
          document.createElement('div');

        dRight.className = 'pit top';

        dRight.dataset.index =
          String(rightIdx);

        dRight.innerHTML =
          '<span class="count">0</span>';

        dRight.addEventListener(
          'click',
          () =>
            humanMove(
              Number(dRight.dataset.index)
            )
        );

        pitsEl.appendChild(dRight);
      }

    } else {

      /*
        PC

        上側：CPU 12〜7
        下側：YOU 0〜5
      */

      for (let i = 12; i >= 7; i--) {

        const d =
          document.createElement('div');

        d.className = 'pit top';

        d.dataset.index =
          String(i);

        d.innerHTML =
          '<span class="count">0</span>';

        d.addEventListener(
          'click',
          () =>
            humanMove(
              Number(d.dataset.index)
            )
        );

        pitsEl.appendChild(d);
      }

      for (let i = 0; i < 6; i++) {

        const d =
          document.createElement('div');

        d.className = 'pit bottom';

        d.dataset.index =
          String(i);

        d.innerHTML =
          '<span class="count">0</span>';

        d.addEventListener(
          'click',
          () =>
            humanMove(
              Number(d.dataset.index)
            )
        );

        pitsEl.appendChild(d);
      }
    }
  }


  window.addEventListener(
    'resize',
    () => {
      createPits();
      render();
    }
  );


  /* =========================================================
     STONE RENDERING
     ========================================================= */

  function renderStones(
    container,
    colors,
    isGoal = false
  ) {
    container
      .querySelectorAll('.stone')
      .forEach(s => s.remove());

    const visibleColors =
      colors.slice(0, 32);

    const count =
      visibleColors.length;

    const isPortrait =
      window.matchMedia(
        '(orientation: portrait)'
      ).matches;

    visibleColors.forEach(
      (colorClass, k) => {

        const s =
          document.createElement('span');

        s.className =
          `stone ${colorClass}`;

        if (!isGoal) {

          const angle =
            (k / Math.max(1, count))
            * Math.PI * 2;

          const r =
            isPortrait
              ? (count <= 6 ? 10 : 15)
              : (count <= 6 ? 20 : 26);

          s.style.transform =
            `translate(${Math.cos(angle) * r}px, ${Math.sin(angle) * r}px)`;

        } else {

          if (isPortrait) {

            const cols =
              Math.min(count, 12);

            const rows =
              Math.ceil(count / cols);

            const spacingX = 20;
            const spacingY = 18;

            const col =
              k % cols;

            const row =
              Math.floor(k / cols);

            const offsetX =
              (col - (cols - 1) / 2)
              * spacingX;

            const offsetY =
              (row - (rows - 1) / 2)
              * spacingY;

            s.style.transform =
              `translate(${offsetX}px, ${offsetY}px)`;

          } else {

            const col =
              k % 2 === 0
                ? -14
                : 14;

            const rowHeight =
              Math.min(
                20,
                180 / Math.ceil(count / 2)
              );

            const row =
              (
                Math.floor(k / 2)
                - (count / 4)
              )
              * rowHeight;

            const offsetX =
              col + Math.sin(k * 3) * 3;

            const offsetY =
              row + Math.cos(k * 2) * 3;

            s.style.transform =
              `translate(${offsetX}px, ${offsetY}px)`;
          }
        }

        container.appendChild(s);
      }
    );
  }


  function render() {

    for (let i = 0; i < 14; i++) {
      board[i] =
        boardStones[i].length;
    }

    document
      .querySelectorAll('.pit')
      .forEach(el => {

        const i =
          Number(el.dataset.index);

        const stones =
          boardStones[i];

        el.querySelector(
          '.count'
        ).textContent =
          stones.length;

        renderStones(
          el,
          stones,
          false
        );
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


  /* =========================================================
     RESET
     ========================================================= */

  function resetBoard() {

    boardStones =
      Array(14)
        .fill(null)
        .map(() => []);

    let pool = [];

    COLOR_CLASSES.forEach(color => {

      for (let i = 0; i < 6; i++) {
        pool.push(color);
      }
    });


    for (
      let i = pool.length - 1;
      i > 0;
      i--
    ) {
      const j =
        Math.floor(
          Math.random() * (i + 1)
        );

      [
        pool[i],
        pool[j]
      ] = [
        pool[j],
        pool[i]
      ];
    }


    [
      0, 1, 2, 3, 4, 5,
      7, 8, 9, 10, 11, 12
    ].forEach(idx => {

      boardStones[idx] =
        pool.splice(
          0,
          INITIAL
        );
    });


    current = 'human';
    busy = false;
    isPaused = false;

    thinking.style.display =
      'none';

    pauseOverlay.classList.add(
      'hidden'
    );

    render();
  }


  /* =========================================================
     COMMON BOARD FUNCTIONS
     ========================================================= */

  function isHumanPit(i) {
    return i >= 0 && i < 6;
  }

  function ownGoal(player) {
    return player === 'human'
      ? 6
      : 13;
  }

  function isOwnPit(index, player) {
    if (player === 'human') {
      return index >= 0 && index <= 5;
    }

    return index >= 7 && index <= 12;
  }

  function isOpponentGoal(index, player) {
    return player === 'human'
      ? index === 13
      : index === 6;
  }

  function nextIndex(i) {
    return (i + 1) % 14;
  }


  /*
    通常の合法手
  */

  function legalMoves(
    player,
    state = board
  ) {

    const arr = [];

    if (player === 'human') {

      for (let i = 0; i <= 5; i++) {

        if (state[i] > 0) {
          arr.push(i);
        }
      }

    } else {

      for (let i = 7; i <= 12; i++) {

        if (state[i] > 0) {
          arr.push(i);
        }
      }
    }

    return arr;
  }


  /* =========================================================
     BASIC / CLEAR-TO-WIN
     ========================================================= */

  /*
    元のルール：

    ・相手ゴールも含めて全部に置く
    ・最後が自分のゴールなら追加ターン
    ・どちらかの陣地が空になったら終了
  */

  async function makeMoveBasic(
    start,
    player,
    animate = true
  ) {

    if (
      boardStones[start].length === 0
    ) {
      return false;
    }

    let hand =
      [...boardStones[start]];

    boardStones[start] = [];

    render();

    let pos = start;

    while (hand.length > 0) {

      pos = nextIndex(pos);

      boardStones[pos].push(
        hand.pop()
      );

      render();

      if (animate) {
        playGlassStoneSound();
        await sleep(220);
      }
    }

    return pos === ownGoal(player);
  }


  /* =========================================================
     KALAHA
     ========================================================= */

  /*
    カハラ：

    ・相手のゴールには置かない
    ・自分のゴールには置く
    ・最後の石が自分のゴールなら追加ターン
    ・最後の石が自分の空ポケットなら横取り
    ・対面の石も自分のゴールへ
  */


  /*
    対面関係

    YOU側       CPU側

    0  ↔  12
    1  ↔  11
    2  ↔  10
    3  ↔  9
    4  ↔  8
    5  ↔  7

    ※ 3の対面は9
  */

  const OPPOSITE = {
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


  function nextIndexKalaha(
    i,
    player
  ) {

    let next =
      nextIndex(i);

    /*
      相手ゴールを飛ばす
    */

    if (
      isOpponentGoal(
        next,
        player
      )
    ) {
      next =
        nextIndex(next);
    }

    return next;
  }


  async function makeMoveKalaha(
    start,
    player,
    animate = true
  ) {

    if (
      boardStones[start].length === 0
    ) {
      return false;
    }

    let hand =
      [...boardStones[start]];

    boardStones[start] = [];

    render();

    let pos = start;

    while (hand.length > 0) {

      pos =
        nextIndexKalaha(
          pos,
          player
        );

      boardStones[pos].push(
        hand.pop()
      );

      render();

      if (animate) {
        playGlassStoneSound();
        await sleep(220);
      }
    }


    /*
      横取り

      最後の石が
      自分の陣地の空ポケットに入った場合
    */

    if (
      isOwnPit(pos, player) &&
      boardStones[pos].length === 1
    ) {

      const opposite =
        OPPOSITE[pos];

      const captured =
        boardStones[opposite].length;

      if (captured > 0) {

        /*
          自分の最後の1個
          ＋
          対面の石全部
          ↓
          自分のゴール
        */

        const capturedStones =
          boardStones[opposite];

        boardStones[opposite] = [];

        const ownStone =
          boardStones[pos].pop();

        boardStones[
          ownGoal(player)
        ].push(ownStone);

        boardStones[
          ownGoal(player)
        ].push(
          ...capturedStones
        );

        render();

        if (animate) {
          playGlassStoneSound();
          await sleep(220);
        }
      }
    }


    return pos === ownGoal(player);
  }


  /* =========================================================
     SUNKA
     ========================================================= */

  /*
    スンカ

    ・相手ゴールには置かない
    ・自分ゴールには置く
    ・最後に置いた「ポケット」に
      もともと石があった場合、

        もともとの石
        ＋
        今置いた1個

      を全部取って、そこから再びまくる。

    ・自分の陣地か相手の陣地かは関係ない。

    ・連鎖は何回でも続く。

    ・最後の場所がゴールの場合、
      ゴールは「ポケット」ではないので
      その時点で終了。

    ・最後のポケットが空だった場合も終了。
  */


  function nextIndexSunka(
    i,
    player
  ) {

    let next =
      nextIndex(i);

    /*
      相手ゴールを飛ばす
    */

    if (
      isOpponentGoal(
        next,
        player
      )
    ) {
      next =
        nextIndex(next);
    }

    return next;
  }


  async function makeMoveSunka(
    start,
    player,
    animate = true
  ) {

    if (
      boardStones[start].length === 0
    ) {
      return false;
    }


    /*
      最初のポケットから
      石を全部持つ
    */

    let hand =
      [...boardStones[start]];

    boardStones[start] = [];

    render();


    let pos = start;


    while (true) {

      /*
        現在持っている石を
        1個ずつまく
      */

      while (hand.length > 0) {

        pos =
          nextIndexSunka(
            pos,
            player
          );

        boardStones[pos].push(
          hand.pop()
        );

        render();

        if (animate) {
          playGlassStoneSound();
          await sleep(220);
        }
      }


      /*
        最後の場所がゴールなら終了。

        ゴールは「ポケット」ではない。
      */

      if (
        pos === 6 ||
        pos === 13
      ) {
        return false;
      }


      /*
        最後の石を置いたポケットに
        もともと石があったか。

        今1個置いた後に
        2個以上なら、
        もともと石が存在していた。
      */

      if (
        boardStones[pos].length > 1
      ) {

        /*
          そのポケットの石を
          全部取る
        */

        hand =
          [...boardStones[pos]];

        boardStones[pos] = [];

        render();

        /*
          ここからまた同じ場所を起点に
          連続してまくる。

          好きなポケットを選び直さない。
        */

        if (animate) {
          await sleep(120);
        }

        continue;
      }


      /*
        最後のポケットが

        0個だった → 今1個になった

        つまり、もともと空だった。

        そこで終了。
      */

      return false;
    }
  }


  /* =========================================================
     MOVE DISPATCHER
     ========================================================= */

  async function makeMove(
    start,
    player,
    animate = true
  ) {

    if (currentRule === RULE_KALAHA) {

      return makeMoveKalaha(
        start,
        player,
        animate
      );

    }

    if (currentRule === RULE_SUNKA) {

      return makeMoveSunka(
        start,
        player,
        animate
      );

    }

    return makeMoveBasic(
      start,
      player,
      animate
    );
  }


  /* =========================================================
     SIMULATION
     ========================================================= */

  /*
    AI専用。

    実際の画面を動かさず、
    その手を打った後の盤面を作る。
  */


  function simulateBasic(
    state,
    start,
    player
  ) {

    const s = state.slice();

    let stones =
      s[start];

    s[start] = 0;

    let pos = start;

    while (stones > 0) {

      pos =
        nextIndex(pos);

      s[pos]++;

      stones--;
    }

    return {
      state: s,
      last: pos,
      again:
        pos === ownGoal(player)
    };
  }


  function simulateKalaha(
    state,
    start,
    player
  ) {

    const s = state.slice();

    let stones =
      s[start];

    s[start] = 0;

    let pos = start;

    while (stones > 0) {

      pos =
        nextIndexKalaha(
          pos,
          player
        );

      s[pos]++;

      stones--;
    }


    /*
      横取り
    */

    if (
      isOwnPit(pos, player) &&
      s[pos] === 1
    ) {

      const opposite =
        OPPOSITE[pos];

      if (s[opposite] > 0) {

        s[
          ownGoal(player)
        ] +=
          s[pos] +
          s[opposite];

        s[pos] = 0;
        s[opposite] = 0;
      }
    }


    return {
      state: s,
      last: pos,
      again:
        pos === ownGoal(player)
    };
  }


  /*
    スンカのAIシミュレーション。

    連鎖を最後まで計算する。
  */

  function simulateSunka(
    state,
    start,
    player
  ) {

    const s = state.slice();

    let hand =
      s[start];

    s[start] = 0;

    let pos = start;

    let chainCount = 0;


    while (true) {

      while (hand > 0) {

        pos =
          nextIndexSunka(
            pos,
            player
          );

        s[pos]++;

        hand--;
      }


      /*
        ゴールで終了
      */

      if (
        pos === 6 ||
        pos === 13
      ) {

        return {
          state: s,
          last: pos,
          again: false,
          chainCount
        };
      }


      /*
        2個以上なら、
        置く前から石が存在した。

        全部取って再スタート。
      */

      if (s[pos] > 1) {

        hand =
          s[pos];

        s[pos] = 0;

        chainCount++;

        continue;
      }


      /*
        もともと空だったポケット。
        終了。
      */

      return {
        state: s,
        last: pos,
        again: false,
        chainCount
      };
    }
  }


  function simulate(
    state,
    start,
    player
  ) {

    if (currentRule === RULE_KALAHA) {
      return simulateKalaha(
        state,
        start,
        player
      );
    }

    if (currentRule === RULE_SUNKA) {
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


  /* =========================================================
     END-GAME SIMULATION
     ========================================================= */

  function isSideEmpty(
    state,
    player
  ) {

    if (player === 'human') {

      return state
        .slice(0, 6)
        .every(v => v === 0);

    }

    return state
      .slice(7, 13)
      .every(v => v === 0);
  }


  /*
    カハラ / スンカでは、
    終了時に残った石を
    そのプレイヤーのゴールへ移す。

    AIの評価にもこれを反映する。
  */

  function collectRemaining(
    state
  ) {

    const s = state.slice();

    const humanRemaining =
      s
        .slice(0, 6)
        .reduce(
          (a, b) => a + b,
          0
        );

    const cpuRemaining =
      s
        .slice(7, 13)
        .reduce(
          (a, b) => a + b,
          0
        );


    s[6] += humanRemaining;
    s[13] += cpuRemaining;


    for (let i = 0; i < 6; i++) {
      s[i] = 0;
    }

    for (let i = 7; i < 13; i++) {
      s[i] = 0;
    }

    return s;
  }


  /* =========================================================
     EVALUATION
     ========================================================= */

  /*
    基本ルール用
  */

  function evaluateBasic(s) {

    const humanPits =
      s
        .slice(0, 6)
        .reduce((a, b) => a + b, 0);

    const cpuPits =
      s
        .slice(7, 13)
        .reduce((a, b) => a + b, 0);

    return (
      humanPits - cpuPits
    ) * 10;
  }


  /*
    カハラ / スンカ共通評価

    ゴールの石が最重要。
  */

  function evaluateScoringRule(s) {

    const humanGoal = s[6];
    const cpuGoal = s[13];

    const humanPits =
      s
        .slice(0, 6)
        .reduce((a, b) => a + b, 0);

    const cpuPits =
      s
        .slice(7, 13)
        .reduce((a, b) => a + b, 0);


    /*
      実際の勝敗に直結する
      ゴールを最重要にする。
    */

    const goalScore =
      (cpuGoal - humanGoal) * 100;


    /*
      残っている石も将来の得点なので評価。
    */

    const pitScore =
      (cpuPits - humanPits) * 8;


    return (
      goalScore +
      pitScore
    );
  }


  /*
    スンカ専用評価。

    連鎖が発生しそうな手を少し高く評価する。
  */

  function evaluateSunkaMove(
    result,
    player
  ) {

    let bonus = 0;

    if (result.chainCount > 0) {

      /*
        連鎖が長いほど有利。
      */

      bonus +=
        result.chainCount * 15;
    }

    /*
      CPU側ならプラス、
      YOU側ならマイナス。

      minimaxの視点に合わせる。
    */

    return player === 'cpu'
      ? bonus
      : -bonus;
  }


  function evaluate(s) {

    if (
      currentRule === RULE_KALAHA ||
      currentRule === RULE_SUNKA
    ) {
      return evaluateScoringRule(s);
    }

    return evaluateBasic(s);
  }


  function evaluateAdvanced(s) {

    if (
      currentRule === RULE_KALAHA ||
      currentRule === RULE_SUNKA
    ) {

      const base =
        evaluateScoringRule(s);

      let score = base;


      /*
        スンカでは
        「次に連鎖できる穴」を評価。
      */

      if (currentRule === RULE_SUNKA) {

        for (const move of legalMoves(
          'cpu',
          s
        )) {

          const r =
            simulateSunka(
              s,
              move,
              'cpu'
            );

          if (r.chainCount > 0) {
            score +=
              r.chainCount * 4;
          }
        }

        for (const move of legalMoves(
          'human',
          s
        )) {

          const r =
            simulateSunka(
              s,
              move,
              'human'
            );

          if (r.chainCount > 0) {
            score -=
              r.chainCount * 4;
          }
        }
      }

      return score;
    }


    return evaluateBasic(s);
  }


  /* =========================================================
     CPU AI
     ========================================================= */

  function chooseCpuMove() {

    const moves =
      legalMoves(
        'cpu',
        board
      );


    if (!moves.length) {
      return 7;
    }


    /* =======================================================
       LEVEL 1
       完全ランダム
       ======================================================= */

    if (cpuLevel === 1) {

      return moves[
        Math.floor(
          Math.random() *
          moves.length
        )
      ];
    }


    /* =======================================================
       LEVEL 2
       1手だけ評価
       ======================================================= */

    if (cpuLevel === 2) {

      let best =
        -Infinity;

      let candidates = [];


      for (const move of moves) {

        const result =
          simulate(
            board,
            move,
            'cpu'
          );

        let score =
          evaluate(
            result.state
          );


        /*
          カハラだけでなく、
          スンカの連鎖も評価。
        */

        if (
          currentRule === RULE_SUNKA
        ) {

          score +=
            evaluateSunkaMove(
              result,
              'cpu'
            );
        }


        if (result.again) {
          score += 30;
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
          Math.random() *
          candidates.length
        )
      ];
    }


    /* =======================================================
       LEVEL 3
       CPU → HUMAN の1手先
       ======================================================= */

    if (cpuLevel === 3) {

      let best =
        -Infinity;

      let candidates = [];


      for (const move of moves) {

        const result =
          simulate(
            board,
            move,
            'cpu'
          );


        let score =
          evaluate(
            result.state
          );


        if (
          currentRule === RULE_SUNKA
        ) {

          score +=
            evaluateSunkaMove(
              result,
              'cpu'
            );
        }


        if (result.again) {
          score += 25;
        }


        const opponentMoves =
          legalMoves(
            'human',
            result.state
          );


        if (opponentMoves.length) {

          let worst =
            Infinity;


          for (
            const opponentMove
            of opponentMoves
          ) {

            const opponentResult =
              simulate(
                result.state,
                opponentMove,
                'human'
              );


            let after =
              evaluate(
                opponentResult.state
              );


            if (
              currentRule === RULE_SUNKA
            ) {

              after +=
                evaluateSunkaMove(
                  opponentResult,
                  'human'
                );
            }


            if (
              opponentResult.again
            ) {
              after -= 20;
            }


            worst =
              Math.min(
                worst,
                after
              );
          }


          score +=
            worst * 0.8;
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
          Math.random() *
          candidates.length
        )
      ];
    }


    /* =======================================================
       LEVEL 4
       MINIMAX
       ======================================================= */

    const SEARCH_DEPTH = 4;

    let bestScore =
      -Infinity;

    let candidates = [];


    for (const move of moves) {

      const result =
        simulate(
          board,
          move,
          'cpu'
        );


      let nextPlayer =
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


      if (
        currentRule === RULE_SUNKA &&
        result.chainCount > 0
      ) {

        score +=
          result.chainCount * 15;
      }


      if (score > bestScore) {

        bestScore = score;
        candidates = [move];

      } else if (
        score === bestScore
      ) {

        candidates.push(move);
      }
    }


    return candidates[
      Math.floor(
        Math.random() *
        candidates.length
      )
    ];
  }


  /* =========================================================
     MINIMAX
     ========================================================= */

  function minimax(
    state,
    depth,
    player,
    alpha,
    beta
  ) {


    /*
      ゲーム終了判定
    */

    const humanEmpty =
      isSideEmpty(
        state,
        'human'
      );

    const cpuEmpty =
      isSideEmpty(
        state,
        'cpu'
      );


    if (
      humanEmpty ||
      cpuEmpty
    ) {

      /*
        カハラ・スンカは
        最後の石をゴールへ移してから評価。
      */

      if (
        currentRule === RULE_KALAHA ||
        currentRule === RULE_SUNKA
      ) {

        const finalState =
          collectRemaining(
            state
          );

        const humanGoal =
          finalState[6];

        const cpuGoal =
          finalState[13];


        if (
          cpuGoal > humanGoal
        ) {
          return 100000;
        }

        if (
          cpuGoal < humanGoal
        ) {
          return -100000;
        }

        return 0;
      }


      return evaluate(state) * 100;
    }


    if (depth <= 0) {
      return evaluateAdvanced(
        state
      );
    }


    const moves =
      legalMoves(
        player,
        state
      );


    if (!moves.length) {
      return evaluateAdvanced(
        state
      );
    }


    /* =======================================================
       CPU = MAX
       ======================================================= */

    if (player === 'cpu') {

      let value =
        -Infinity;


      for (const move of moves) {

        const result =
          simulate(
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
          score += 20;
        }


        if (
          currentRule === RULE_SUNKA &&
          result.chainCount > 0
        ) {

          score +=
            result.chainCount * 10;
        }


        value =
          Math.max(
            value,
            score
          );


        alpha =
          Math.max(
            alpha,
            value
          );


        if (
          beta <= alpha
        ) {
          break;
        }
      }


      return value;
    }


    /* =======================================================
       HUMAN = MIN
       ======================================================= */

    let value =
      Infinity;


    for (const move of moves) {

      const result =
        simulate(
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
        score -= 20;
      }


      if (
        currentRule === RULE_SUNKA &&
        result.chainCount > 0
      ) {

        score -=
          result.chainCount * 10;
      }


      value =
        Math.min(
          value,
          score
        );


      beta =
        Math.min(
          beta,
          value
        );


      if (
        beta <= alpha
      ) {
        break;
      }
    }


    return value;
  }


  /* =========================================================
     REAL GAME END
     ========================================================= */

  function checkWinner() {

    /*
      盤面の現在値を更新
    */

    for (let i = 0; i < 14; i++) {
      board[i] =
        boardStones[i].length;
    }


    const humanEmpty =
      board
        .slice(0, 6)
        .every(v => v === 0);

    const cpuEmpty =
      board
        .slice(7, 13)
        .every(v => v === 0);


    if (
      !humanEmpty &&
      !cpuEmpty
    ) {
      return false;
    }


    busy = true;


    /*
      カハラ・スンカ

      終了時に残った石を
      その陣地のゴールへ移す。
    */

    if (
      currentRule === RULE_KALAHA ||
      currentRule === RULE_SUNKA
    ) {

      /*
        YOU側が空
        → CPU側の残りをCPUゴールへ
      */

      if (humanEmpty) {

        const remaining =
          boardStones
            .slice(7, 13)
            .reduce(
              (sum, stones) =>
                sum + stones.length,
              0
            );


        for (let i = 7; i <= 12; i++) {

          if (
            boardStones[i].length
          ) {

            boardStones[13].push(
              ...boardStones[i]
            );

            boardStones[i] = [];
          }
        }
      }


      /*
        CPU側が空
        → YOU側の残りをYOUゴールへ
      */

      if (cpuEmpty) {

        for (let i = 0; i <= 5; i++) {

          if (
            boardStones[i].length
          ) {

            boardStones[6].push(
              ...boardStones[i]
            );

            boardStones[i] = [];
          }
        }
      }


      render();


      /*
        最終ゴール数で勝敗判定
      */

      const humanGoal =
        boardStones[6].length;

      const cpuGoal =
        boardStones[13].length;


      let result;

      if (
        humanGoal > cpuGoal
      ) {

        result = 'WIN';

      } else if (
        cpuGoal > humanGoal
      ) {

        result = 'LOSE';

      } else {

        result = 'DRAW';
      }


      resultText.textContent =
        result;

      resultOverlay.classList.remove(
        'hidden'
      );

      return true;
    }


    /*
      Clear-to-Win

      元のルール
    */

    let result;

    if (
      humanEmpty &&
      !cpuEmpty
    ) {

      result = 'WIN';

    } else if (
      cpuEmpty &&
      !humanEmpty
    ) {

      result = 'LOSE';

    } else {

      result = 'DRAW';
    }


    resultText.textContent =
      result;

    resultOverlay.classList.remove(
      'hidden'
    );

    return true;
  }


  /* =========================================================
     HUMAN TURN
     ========================================================= */

  async function humanMove(index) {

    if (
      busy ||
      isPaused ||
      current !== 'human' ||
      !isHumanPit(index) ||
      boardStones[index].length === 0
    ) {
      return;
    }


    busy = true;


    const again =
      await makeMove(
        index,
        'human',
        true
      );


    if (checkWinner()) {
      return;
    }


    /*
      カハラだけでなく、
      スンカも「ゴールで終わった場合」の
      追加ターンは存在しない。

      カハラ：
        own goal → 追加ターン

      スンカ：
        ゴールは連鎖判定の対象ではない。
        したがって、ゴールに入った場合も
        ここでは通常ターン終了。

      ※ makeMoveSunka は常に false を返す。
    */

    if (currentRule === RULE_KALAHA && again) {

      current = 'human';

      render();

      await sleep(250);

      busy = false;

      return;
    }


    if (
      currentRule === RULE_BASIC &&
      again
    ) {

      current = 'human';

      render();

      await sleep(250);

      busy = false;

      return;
    }


    /*
      相手のターン
    */

    current = 'cpu';

    render();

    await sleep(350);

    await cpuTurn();
  }


  /* =========================================================
     CPU TURN
     ========================================================= */

  async function cpuTurn() {

    if (
      checkWinner() ||
      isPaused
    ) {
      return;
    }


    busy = true;

    thinking.style.display =
      'block';


    await sleep(450);


    if (isPaused) {

      busy = false;

      return;
    }


    const move =
      chooseCpuMove();


    const again =
      await makeMove(
        move,
        'cpu',
        true
      );


    thinking.style.display =
      'none';


    if (checkWinner()) {
      return;
    }


    /*
      カハラ / Basic は
      ゴールで追加ターン。

      スンカは
      連鎖が終わったら終了。
    */

    if (
      (currentRule === RULE_KALAHA ||
       currentRule === RULE_BASIC) &&
      again
    ) {

      current = 'cpu';

      render();

      await sleep(350);

      busy = false;

      await cpuTurn();

      return;
    }


    current = 'human';

    render();

    busy = false;
  }


  /* =========================================================
     UTILITY
     ========================================================= */

  function sleep(ms) {
    return new Promise(
      resolve => setTimeout(
        resolve,
        ms
      )
    );
  }


  /* =========================================================
     SOUND TOGGLE
     ========================================================= */

  if (soundToggle) {

    soundToggle.addEventListener(
      'click',
      () => {

        soundEnabled =
          !soundEnabled;

        soundToggle.classList.toggle(
          'active',
          soundEnabled
        );

        soundStatus.textContent =
          soundEnabled
            ? 'ON'
            : 'OFF';
      }
    );
  }


  /* =========================================================
     TITLE / SETTINGS
     ========================================================= */

  function showTitle() {

    resultOverlay.classList.add(
      'hidden'
    );

    pauseOverlay.classList.add(
      'hidden'
    );

    settingsScreen.classList.add(
      'hidden'
    );

    titleScreen.classList.remove(
      'hidden'
    );

    gameUI.classList.add(
      'hidden'
    );

    boardWrap.style.opacity =
      '0.52';

    resetBoard();
  }


  document
    .getElementById('toSettings')
    .addEventListener(
      'click',
      () => {

        settingsError.textContent =
          '';

        settingsScreen.classList.remove(
          'hidden'
        );

        titleScreen.classList.add(
          'hidden'
        );
      }
    );


  document
    .getElementById('startGame')
    .addEventListener(
      'click',
      () => {

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

        currentRule =
          ruleEl.value;


        settingsError.textContent =
          '';

        settingsScreen.classList.add(
          'hidden'
        );

        gameUI.classList.remove(
          'hidden'
        );

        boardWrap.style.opacity =
          '1';

        resetBoard();
      }
    );


  /* =========================================================
     PAUSE
     ========================================================= */

  document
    .getElementById('pauseBtn')
    .addEventListener(
      'click',
      () => {

        isPaused = true;

        pauseOverlay.classList.remove(
          'hidden'
        );
      }
    );


  document
    .getElementById('resumeBtn')
    .addEventListener(
      'click',
      () => {

        isPaused = false;

        pauseOverlay.classList.add(
          'hidden'
        );

        if (
          current === 'cpu' &&
          !busy
        ) {
          cpuTurn();
        }
      }
    );


  document
    .getElementById('quitBtn')
    .addEventListener(
      'click',
      showTitle
    );


  /* =========================================================
     RESULT BUTTONS
     ========================================================= */

  document
    .getElementById('restart')
    .addEventListener(
      'click',
      () => {

        resultOverlay.classList.add(
          'hidden'
        );

        boardWrap.style.opacity =
          '1';

        resetBoard();
      }
    );


  document
    .getElementById('backTitle')
    .addEventListener(
      'click',
      showTitle
    );


  /* =========================================================
     START
     ========================================================= */

  setupRuleOptions();

  createPits();

  resetBoard();

  boardWrap.style.opacity =
    '0.52';

})();
