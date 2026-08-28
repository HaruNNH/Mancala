(() => {
  const INITIAL = 4;
  const COLOR_CLASSES = [
    'c-red', 'c-orange', 'c-yellow', 'c-green',
    'c-cyan', 'c-blue', 'c-purple', 'c-pink'
  ];

  /* =========================================================
     SOUND
     ========================================================= */

  let soundEnabled = true;
  let audioCtx = null;
  let soundBuffer = null;

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

  window.addEventListener('pointerdown', initAudio, { once: false });

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

  /* =========================================================
     DOM
     ========================================================= */

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

  const leftGoalCount =
    document.getElementById('leftGoalCount');

  const rightGoalCount =
    document.getElementById('rightGoalCount');

  const goalLeft = document.getElementById('goalLeft');
  const goalRight = document.getElementById('goalRight');

  const settingsError =
    document.getElementById('settingsError');

  const levelEl = document.getElementById('level');
  const ruleEl = document.getElementById('rule');

  const thinking =
    document.getElementById('thinking');

  const resultText =
    document.getElementById('resultText');

  /* =========================================================
     GAME STATE
     ========================================================= */

  let boardStones =
    Array(14).fill(null).map(() => []);
  let board = Array(14).fill(0);
  let current = 'human';
  let cpuLevel = 1;
  let busy = false;
  let isPaused = false;
  //Kahala
 

  function isKahalah() {
    return ruleEl.value === 'kahala';
  }

  /* =========================================================
     BOARD
     ========================================================= */

  function createPits() {
    pitsEl.innerHTML = '';

    const isPortrait =
      window.matchMedia('(orientation: portrait)').matches;

    if (isPortrait) {

      /*
        スマホ

        左列：
        0〜5 YOU

        右列：
        12〜7 CPU
      */

      for (let row = 0; row < 6; row++) {

        const leftIdx = row;

        const dLeft =
          document.createElement('div');

        dLeft.className = 'pit bottom';
        dLeft.dataset.index = String(leftIdx);

        dLeft.innerHTML =
          '<span class="count">0</span>';

        dLeft.addEventListener(
          'click',
          () => humanMove(
            Number(dLeft.dataset.index)
          )
        );

        pitsEl.appendChild(dLeft);


        const rightIdx = 12 - row;

        const dRight =
          document.createElement('div');

        dRight.className = 'pit top';
        dRight.dataset.index =
          String(rightIdx);

        dRight.innerHTML =
          '<span class="count">0</span>';

        dRight.addEventListener(
          'click',
          () => humanMove(
            Number(dRight.dataset.index)
          )
        );

        pitsEl.appendChild(dRight);
      }

    } else {

      /*
        PC

        上：12〜7 CPU
        下：0〜5 YOU
      */

      for (let i = 12; i >= 7; i--) {

        const d =
          document.createElement('div');

        d.className = 'pit top';
        d.dataset.index = String(i);

        d.innerHTML =
          '<span class="count">0</span>';

        d.addEventListener(
          'click',
          () => humanMove(
            Number(d.dataset.index)
          )
        );

        pitsEl.appendChild(d);
      }

      for (let i = 0; i < 6; i++) {

        const d =
          document.createElement('div');

        d.className = 'pit bottom';
        d.dataset.index = String(i);

        d.innerHTML =
          '<span class="count">0</span>';

        d.addEventListener(
          'click',
          () => humanMove(
            Number(d.dataset.index)
          )
        );

        pitsEl.appendChild(d);
      }
    }
  }

  window.addEventListener('resize', () => {
    createPits();
    render();
  });


  /* =========================================================
     STONES
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

    visibleColors.forEach((colorClass, k) => {

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
          `translate(
            ${Math.cos(angle) * r}px,
            ${Math.sin(angle) * r}px
          )`;

      } else {

        if (isPortrait) {

          const cols =
            Math.min(count, 12);

          const rows =
            Math.ceil(count / cols);

          const spacingX = 20;
          const spacingY = 18;

          const col = k % cols;
          const row = Math.floor(k / cols);

          const offsetX =
            (col - (cols - 1) / 2)
            * spacingX;

          const offsetY =
            (row - (rows - 1) / 2)
            * spacingY;

          s.style.transform =
            `translate(
              ${offsetX}px,
              ${offsetY}px
            )`;

        } else {

          const col =
            k % 2 === 0 ? -14 : 14;

          const rowHeight =
            Math.min(
              20,
              180 / Math.ceil(count / 2)
            );

          const row =
            (
              Math.floor(k / 2)
              - (count / 4)
            ) * rowHeight;

          const offsetX =
            col + Math.sin(k * 3) * 3;

          const offsetY =
            row + Math.cos(k * 2) * 3;

          s.style.transform =
            `translate(
              ${offsetX}px,
              ${offsetY}px
            )`;
        }
      }

      container.appendChild(s);
    });
  }


  /* =========================================================
     RENDER
     ========================================================= */

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

        el.querySelector('.count')
          .textContent =
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
      Array(14).fill(null).map(() => []);

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


  /* =========================================================
     BASIC GAME INFORMATION
     ========================================================= */

  function isHumanPit(i) {
    return i >= 0 && i <= 5;
  }

  function ownGoal(player) {
    return player === 'human'
      ? 6
      : 13;
  }

  function opponentGoal(player) {
    return player === 'human'
      ? 13
      : 6;
  }

  function isOwnPit(i, player) {

    if (player === 'human') {
      return i >= 0 && i <= 5;
    }

    return i >= 7 && i <= 12;
  }

  function nextKahalaIndex(i, player) {

    let next =
      (i + 1) % 14;

    /*
      YOUはCPUゴール13を飛ばす
    */

    if (
      player === 'human' &&
      next === 13
    ) {
      next = 0;
    }

    /*
      CPUはYOUゴール6を飛ばす
    */

    if (
      player === 'cpu' &&
      next === 6
    ) {
      next = 7;
    }

    return next;
  }


  /* =========================================================
     OPPOSITE PIT
     ========================================================= */

  function oppositePit(i) {

    /*
      対面

      0 ↔ 12
      1 ↔ 11
      2 ↔ 10
      3 ↔ 9
      4 ↔ 8
      5 ↔ 7
    */

    const map = {
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

    return map[i];
  }


  /* =========================================================
     LEGAL MOVES
     ========================================================= */

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
     KALAHA MOVE SIMULATION
     ========================================================= */

  function simulateKahala(
    state,
    start,
    player
  ) {

    const s = state.slice();

    let stones = s[start];

    s[start] = 0;

    let pos = start;

    if (stones <= 0) {
      return {
        state: s,
        last: start,
        again: false
      };
    }


    /*
      石を1個ずつ配る
      相手ゴールは飛ばす
    */

    while (stones > 0) {

      pos =
        nextKahalaIndex(
          pos,
          player
        );

      s[pos]++;
      stones--;
    }


    /*
      よこどり

      最後の石が自分の陣地にある
      空ポケットに入った場合
    */

    let captured = 0;

    if (
      isOwnPit(pos, player) &&
      s[pos] === 1
    ) {

      const opposite =
        oppositePit(pos);

      if (
        opposite !== undefined &&
        s[opposite] > 0
      ) {

        captured =
          s[opposite];

        s[opposite] = 0;

        s[pos] = 0;

        s[ownGoal(player)] +=
          captured + 1;
      }
    }


    /*
      よこどりが起きなかった場合でも、
      最後の石が自分のゴールなら追加ターン
    */

    const again =
      pos === ownGoal(player);


    return {
      state: s,
      last: pos,
      again,
      captured
    };
  }


  /* =========================================================
     ACTUAL MOVE
     ========================================================= */

  async function makeKahalaMove(
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
        nextKahalaIndex(
          pos,
          player
        );

      boardStones[pos]
        .push(hand.pop());

      render();


      if (animate) {

        playGlassStoneSound();

        await sleep(220);
      }
    }


    /*
      最後の石が自分の陣地の
      空ポケットだった場合のよこどり
    */

    if (
      isOwnPit(pos, player) &&
      boardStones[pos].length === 1
    ) {

      const opposite =
        oppositePit(pos);

      if (
        opposite !== undefined &&
        boardStones[opposite].length > 0
      ) {

        const captured =
          boardStones[opposite];

        boardStones[opposite] = [];

        const ownStone =
          boardStones[pos];

        boardStones[pos] = [];

        boardStones[
          ownGoal(player)
        ].push(
          ...ownStone,
          ...captured
        );

        render();

        if (animate) {
          playGlassStoneSound();
          await sleep(250);
        }
      }
    }


    /*
      最後の石が自分のゴールなら
      追加ターン
    */

    return pos === ownGoal(player);
  }


  function sleep(ms) {
    return new Promise(
      resolve => setTimeout(resolve, ms)
    );
  }


  /* =========================================================
     END CONDITION
     ========================================================= */

  function isSideEmpty(
    player,
    state = board
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
    ゲーム終了時、

    残っている側の陣地にある石を
    その側のゴールへ全部移す。
  */

  async function collectRemainingStones() {

    const humanEmpty =
      isSideEmpty('human');

    const cpuEmpty =
      isSideEmpty('cpu');


    if (!humanEmpty && !cpuEmpty) {
      return;
    }


    /*
      YOU側に残っている石
      → YOUゴール6
    */

    if (!humanEmpty) {

      for (let i = 0; i <= 5; i++) {

        if (boardStones[i].length > 0) {

          boardStones[6].push(
            ...boardStones[i]
          );

          boardStones[i] = [];
        }
      }
    }


    /*
      CPU側に残っている石
      → CPUゴール13
    */

    if (!cpuEmpty) {

      for (let i = 7; i <= 12; i++) {

        if (boardStones[i].length > 0) {

          boardStones[13].push(
            ...boardStones[i]
          );

          boardStones[i] = [];
        }
      }
    }


    render();

    await sleep(400);
  }


  /*
    カハラ用checkWinner

    ①どちらかの陣地が空か確認
    ②残った側の石をゴールへ移す
    ③ゴール数を比較
    ④WIN / LOSE / DRAW
  */

  async function checkWinner() {

    /*
      まず現在の陣地を確認
    */

    const humanEmpty =
      isSideEmpty('human');

    const cpuEmpty =
      isSideEmpty('cpu');


    if (
      !humanEmpty &&
      !cpuEmpty
    ) {
      return false;
    }


    busy = true;


    /*
      残り石をゴールへ合算
    */

    await collectRemainingStones();


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
      await makeKahalaMove(
        index,
        'human',
        true
      );


    /*
      ここでゲーム終了判定
    */

    if (
      await checkWinner()
    ) {
      return;
    }


    /*
      ゴールに入ったら追加ターン
    */

    if (again) {

      current = 'human';

      render();

      await sleep(250);

      busy = false;

    } else {

      /*
        CPUへ
      */

      current = 'cpu';

      render();

      await sleep(350);

      await cpuTurn();
    }
  }


  /* =========================================================
     CPU TURN
     ========================================================= */

  async function cpuTurn() {

    if (
      await checkWinner() ||
      isPaused
    ) {
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


    const again =
      await makeKahalaMove(
        move,
        'cpu',
        true
      );


    thinking.style.display = 'none';


    if (
      await checkWinner()
    ) {
      return;
    }


    if (again) {

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


  /* =========================================================
     AI EVALUATION
     ========================================================= */

  /*
    CPUが多くゴールに入れているほど高評価。
    最終的な勝敗と同じ方向を向く。
  */

  function evaluateKahala(state) {

    const humanGoal =
      state[6];

    const cpuGoal =
      state[13];


    /*
      ゴール差を最重要視
    */

    let score =
      (cpuGoal - humanGoal) * 100;


    /*
      まだ盤上にある石についても評価。

      CPU側に多く残っている
      → CPUが将来的に得点できるのでプラス

      YOU側に多く残っている
      → YOUが将来的に得点できるのでマイナス
    */

    const humanPits =
      state
        .slice(0, 6)
        .reduce((a, b) => a + b, 0);

    const cpuPits =
      state
        .slice(7, 13)
        .reduce((a, b) => a + b, 0);


    score +=
      (cpuPits - humanPits) * 4;


    /*
      よこどり可能性を評価
    */

    for (let i = 7; i <= 12; i++) {

      if (state[i] === 0) {

        const opposite =
          oppositePit(i);

        if (
          opposite !== undefined &&
          state[opposite] > 0
        ) {

          score +=
            state[opposite] * 5;
        }
      }
    }


    return score;
  }


  /* =========================================================
     AI SIMULATION
     ========================================================= */

  function simulateFullKahala(
    state,
    start,
    player
  ) {

    const result =
      simulateKahala(
        state,
        start,
        player
      );


    const s =
      result.state;


    /*
      シミュレーションでも
      陣地が空になった場合は
      最終合算まで行う。
    */

    const humanEmpty =
      isSideEmpty(
        'human',
        s
      );

    const cpuEmpty =
      isSideEmpty(
        'cpu',
        s
      );


    if (
      humanEmpty ||
      cpuEmpty
    ) {

      if (!humanEmpty) {

        for (let i = 0; i <= 5; i++) {

          s[6] += s[i];
          s[i] = 0;
        }
      }


      if (!cpuEmpty) {

        for (let i = 7; i <= 12; i++) {

          s[13] += s[i];
          s[i] = 0;
        }
      }
    }


    return {
      ...result,
      state: s
    };
  }


  /* =========================================================
     AI LEVEL 1
     ========================================================= */

  function chooseRandomMove(moves) {

    return moves[
      Math.floor(
        Math.random() * moves.length
      )
    ];
  }


  /* =========================================================
     AI LEVEL 2
     ========================================================= */

  function chooseLevel2(moves) {

    let best = -Infinity;
    let candidates = [];


    for (const move of moves) {

      const result =
        simulateFullKahala(
          board,
          move,
          'cpu'
        );


      let score =
        evaluateKahala(
          result.state
        );


      /*
        追加ターンを強く評価
      */

      if (result.again) {
        score += 30;
      }


      /*
        よこどりを評価
      */

      if (result.captured > 0) {

        score +=
          result.captured * 15;
      }


      if (score > best) {

        best = score;
        candidates = [move];

      } else if (score === best) {

        candidates.push(move);
      }
    }


    return chooseRandomMove(
      candidates
    );
  }


  /* =========================================================
     AI LEVEL 3
     ========================================================= */

  function chooseLevel3(moves) {

    let best = -Infinity;
    let candidates = [];


    for (const move of moves) {

      const result =
        simulateFullKahala(
          board,
          move,
          'cpu'
        );


      let score =
        evaluateKahala(
          result.state
        );


      if (result.again) {
        score += 30;
      }


      if (result.captured > 0) {

        score +=
          result.captured * 15;
      }


      /*
        相手の最善手を考える
      */

      const humanMoves =
        legalMoves(
          'human',
          result.state
        );


      if (humanMoves.length > 0) {

        let worst =
          Infinity;


        for (
          const humanMove
          of humanMoves
        ) {

          const humanResult =
            simulateFullKahala(
              result.state,
              humanMove,
              'human'
            );


          let humanScore =
            evaluateKahala(
              humanResult.state
            );


          /*
            人間側に追加ターンがあるなら
            CPUにとって危険
          */

          if (humanResult.again) {
            humanScore -= 30;
          }


          if (
            humanResult.captured > 0
          ) {

            humanScore -=
              humanResult.captured * 15;
          }


          worst =
            Math.min(
              worst,
              humanScore
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


    return chooseRandomMove(
      candidates
    );
  }


  /* =========================================================
     AI LEVEL 4
     ========================================================= */

  const SEARCH_DEPTH = 5;


  function chooseLevel4(moves) {

    let bestScore = -Infinity;
    let candidates = [];


    for (const move of moves) {

      const result =
        simulateFullKahala(
          board,
          move,
          'cpu'
        );


      let nextPlayer =
        result.again
          ? 'cpu'
          : 'human';


      let score =
        minimaxKahala(
          result.state,
          SEARCH_DEPTH - 1,
          nextPlayer,
          -Infinity,
          Infinity
        );


      /*
        追加ターン
      */

      if (result.again) {
        score += 35;
      }


      /*
        よこどり
      */

      if (result.captured > 0) {

        score +=
          result.captured * 20;
      }


      if (score > bestScore) {

        bestScore = score;
        candidates = [move];

      } else if (score === bestScore) {

        candidates.push(move);
      }
    }


    return chooseRandomMove(
      candidates
    );
  }


  /* =========================================================
     MINIMAX
     ========================================================= */

  function minimaxKahala(
    state,
    depth,
    player,
    alpha,
    beta
  ) {

    /*
      ゲーム終了
    */

    const humanEmpty =
      isSideEmpty(
        'human',
        state
      );

    const cpuEmpty =
      isSideEmpty(
        'cpu',
        state
      );


    if (
      humanEmpty ||
      cpuEmpty
    ) {

      const finalState =
        state.slice();


      if (!humanEmpty) {

        for (let i = 0; i <= 5; i++) {

          finalState[6] +=
            finalState[i];

          finalState[i] = 0;
        }
      }


      if (!cpuEmpty) {

        for (let i = 7; i <= 12; i++) {

          finalState[13] +=
            finalState[i];

          finalState[i] = 0;
        }
      }


      /*
        最終勝敗を非常に大きく評価
      */

      const diff =
        finalState[13] -
        finalState[6];


      if (diff > 0) {
        return 100000 + diff * 100;
      }

      if (diff < 0) {
        return -100000 + diff * 100;
      }

      return 0;
    }


    if (depth <= 0) {

      return evaluateKahala(
        state
      );
    }


    const moves =
      legalMoves(
        player,
        state
      );


    if (!moves.length) {

      return evaluateKahala(
        state
      );
    }


    //CPU = 最大化

    if (player === 'cpu') {
      let value = -Infinity;
      for (const move of moves) {
        const result =
          simulateFullKahala(
            state,
            move,
            'cpu'
          );
        const nextPlayer =
          result.again
            ? 'cpu'
            : 'human';

        let score =
          minimaxKahala(
            result.state,
            depth - 1,
            nextPlayer,
            alpha,
            beta
          );

        if (result.again) {
          score += 25;
        }

        if (result.captured > 0) {

          score +=
            result.captured * 15;
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
        if (beta <= alpha) {
          break;
        }
      }
      return value;
    }

    /*
      HUMAN = 最小化
    */

    let value = Infinity;

    for (const move of moves) {
      const result =
        simulateFullKahala(
          state,
          move,
          'human'
        );


      const nextPlayer =
        result.again
          ? 'human'
          : 'cpu';

      let score =
        minimaxKahala(
          result.state,
          depth - 1,
          nextPlayer,
          alpha,
          beta
        );

      if (result.again) {
        score -= 25;
      }


      if (result.captured > 0) {

        score -=
          result.captured * 15;
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


      if (beta <= alpha) {
        break;
      }
    }


    return value;
  }


  /* =========================================================
     CPU MOVE SELECTOR
     ========================================================= */

  function chooseCpuMove() {

    const moves =
      legalMoves('cpu');


    if (!moves.length) {
      return 7;
    }


    if (cpuLevel === 1) {
      return chooseRandomMove(moves);
    }


    if (cpuLevel === 2) {
      return chooseLevel2(moves);
    }


    if (cpuLevel === 3) {
      return chooseLevel3(moves);
    }


    return chooseLevel4(moves);
  }


  /* =========================================================
     SETTINGS / MENU
     ========================================================= */

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


  document
    .getElementById('toSettings')
    .addEventListener(
      'click',
      () => {

        settingsError.textContent = '';

        settingsScreen
          .classList.remove('hidden');

        titleScreen
          .classList.add('hidden');
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

        settingsError.textContent =
          '';
        settingsScreen
          .classList.add('hidden');
        gameUI
          .classList.remove('hidden');
        boardWrap.style.opacity = '1';
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
        pauseOverlay
          .classList.remove('hidden');
      }
    );

  document
    .getElementById('resumeBtn')
    .addEventListener(
      'click',
      () => {
        isPaused = false;
        pauseOverlay
          .classList.add('hidden');
        if (
          current === 'cpu' &&　!busy
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
     RESULT
     ========================================================= */

  document
    .getElementById('restart')
    .addEventListener(
      'click',
      () => {
        resultOverlay
          .classList.add('hidden');
        boardWrap.style.opacity = '1';
        resetBoard();
      }
    );

  document
    .getElementById('backTitle')
    .addEventListener(
      'click',
      showTitle
    );

  function showTitle() {
    resultOverlay
      .classList.add('hidden');
    pauseOverlay
      .classList.add('hidden');
    settingsScreen
      .classList.add('hidden');
    titleScreen
      .classList.remove('hidden');
    gameUI
      .classList.add('hidden');
    boardWrap.style.opacity = '0.52';
    resetBoard();
  }


  /* =========================================================
     INITIALIZE
     ========================================================= */
  createPits();
  resetBoard();
  boardWrap.style.opacity = '0.52';
})();
