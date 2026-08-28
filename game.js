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
     GAME STATE
     ========================================================= */

  let boardStones =
    Array(14).fill(null).map(() => []);

  let board =
    Array(14).fill(0);

  let current = 'human';

  let cpuLevel = 1;

  let selectedRule = 'basic';

  let busy = false;

  let isPaused = false;


  /* =========================================================
     RULE INFORMATION
     ========================================================= */

  function isKahala() {
    return selectedRule === 'kahala';
  }

  function ownGoal(player) {
    return player === 'human' ? 6 : 13;
  }

  function opponentGoal(player) {
    return player === 'human' ? 13 : 6;
  }

  function isHumanPit(i) {
    return i >= 0 && i < 6;
  }

  function isPlayerPit(i, player) {
    if (player === 'human') {
      return i >= 0 && i <= 5;
    }

    return i >= 7 && i <= 12;
  }


  /* =========================================================
     NEXT POSITION
     ========================================================= */

  function nextIndexBasic(i) {
    return (i + 1) % 14;
  }

  /*
    Kahala:

    YOUは13を飛ばす
    CPUは6を飛ばす
  */

  function nextIndexKahala(i, player) {
    let next = (i + 1) % 14;

    if (next === opponentGoal(player)) {
      next = (next + 1) % 14;
    }

    return next;
  }

  function nextIndex(i, player) {
    if (isKahala()) {
      return nextIndexKahala(i, player);
    }

    return nextIndexBasic(i);
  }


  /* =========================================================
     CREATE PITS
     ========================================================= */

  function createPits() {
    pitsEl.innerHTML = '';

    const isPortrait =
      window.matchMedia('(orientation: portrait)').matches;

    if (isPortrait) {

      /*
        スマホ版

        左列：YOU 0〜5
        右列：CPU 12〜7
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
        PC版

        上：CPU 12〜7
        下：YOU 0〜5
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
     RENDER STONES
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
      }
    );
  }


  /* =========================================================
     RENDER BOARD
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

      [
        pool[i],
        pool[j]
      ] =
      [
        pool[j],
        pool[i]
      ];
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
     LEGAL MOVES
     ========================================================= */

  function legalMoves(
    player,
    state = board
  ) {

    const arr = [];

    if (player === 'human') {

      for (let i = 0; i < 6; i++) {

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
     KAHALA OPPOSITE
     ========================================================= */

  function oppositePit(index) {

    const opposites = {
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

    return opposites[index];
  }


  /* =========================================================
     KAHALA MOVE
     ========================================================= */

  async function makeMoveKahala(
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

    let lastWasCapture = false;


    while (hand.length > 0) {

      pos =
        nextIndexKahala(
          pos,
          player
        );


      /*
        最後の石を置く前に、
        そのポケットが空だったかを記録。
      */

      const wasEmpty =
        boardStones[pos].length === 0;


      boardStones[pos].push(
        hand.pop()
      );

      render();


      if (animate) {

        playGlassStoneSound();

        await sleep(220);
      }


      /*
        最後の石だった場合だけ
        空ポケット判定を行う。
      */

      if (
        hand.length === 0 &&
        isPlayerPit(pos, player) &&
        wasEmpty
      ) {

        const opposite =
          oppositePit(pos);

        const captured =
          boardStones[opposite].length;


        /*
          自分が今置いた1個 + 対面全部
          を自分のゴールへ。
        */

        const ownStone =
          boardStones[pos].pop();

        if (ownStone) {

          boardStones[
            ownGoal(player)
          ].push(ownStone);
        }


        const oppositeStones =
          boardStones[opposite].splice(
            0,
            boardStones[opposite].length
          );


        boardStones[
          ownGoal(player)
        ].push(
          ...oppositeStones
        );


        lastWasCapture = true;

        render();


        if (animate && captured > 0) {

          playGlassStoneSound();

          await sleep(300);
        }
      }
    }


    return (
      pos === ownGoal(player)
    );
  }


  /* =========================================================
     BASIC MOVE
     ========================================================= */

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

      pos =
        nextIndexBasic(pos);

      boardStones[pos].push(
        hand.pop()
      );

      render();


      if (animate) {

        playGlassStoneSound();

        await sleep(220);
      }
    }


    return (
      pos === ownGoal(player)
    );
  }


  /* =========================================================
     MAKE MOVE
     ========================================================= */

  async function makeMove(
    start,
    player,
    animate = true
  ) {

    if (isKahala()) {

      return await makeMoveKahala(
        start,
        player,
        animate
      );

    } else {

      return await makeMoveBasic(
        start,
        player,
        animate
      );
    }
  }


  function sleep(ms) {
    return new Promise(
      resolve => setTimeout(resolve, ms)
    );
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


    if (again) {

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
     SIMULATION
     ========================================================= */

  function simulateBasic(
    state,
    start,
    player
  ) {

    const s =
      state.slice();

    let stones =
      s[start];

    s[start] = 0;

    let pos = start;


    while (stones > 0) {

      pos =
        nextIndexBasic(pos);

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


  /*
    Kahala用シミュレーション

    実際の盤面と同じく、

    ・相手ゴールを飛ばす
    ・ゴールには入れる
    ・空ポケット取り込み
    ・追加ターン

    を全部再現する。
  */

  function simulateKahala(
    state,
    start,
    player
  ) {

    const s =
      state.slice();

    let stones =
      s[start];

    s[start] = 0;

    let pos = start;


    while (stones > 0) {

      pos =
        nextIndexKahala(
          pos,
          player
        );


      const wasEmpty =
        s[pos] === 0;


      s[pos]++;

      stones--;


      /*
        最後の石が
        自分の陣地の空ポケットなら
        取り込み。
      */

      if (
        stones === 0 &&
        isPlayerPit(pos, player) &&
        wasEmpty
      ) {

        const opposite =
          oppositePit(pos);

        const captured =
          s[opposite];


        /*
          今置いた1個
        */

        s[pos] = 0;

        /*
          対面の石も取る
        */

        s[opposite] = 0;


        /*
          ゴールへまとめて移動
        */

        s[
          ownGoal(player)
        ] +=
          1 + captured;
      }
    }


    return {
      state: s,
      last: pos,
      again:
        pos === ownGoal(player)
    };
  }


  function simulate(
    state,
    start,
    player
  ) {

    if (isKahala()) {

      return simulateKahala(
        state,
        start,
        player
      );

    } else {

      return simulateBasic(
        state,
        start,
        player
      );
    }
  }


  /* =========================================================
     KAHALA END-OF-GAME SWEEP
     ========================================================= */

  function sweepRemainingStones(
    state
  ) {

    const humanEmpty =
      state
        .slice(0, 6)
        .every(v => v === 0);

    const cpuEmpty =
      state
        .slice(7, 13)
        .every(v => v === 0);


    /*
      YOU側が空になった場合、
      CPU側に残っている石を
      CPUゴールへ。
    */

    if (humanEmpty && !cpuEmpty) {

      for (let i = 7; i <= 12; i++) {

        state[13] += state[i];
        state[i] = 0;
      }
    }


    /*
      CPU側が空になった場合、
      YOU側に残っている石を
      YOUゴールへ。
    */

    if (cpuEmpty && !humanEmpty) {

      for (let i = 0; i <= 5; i++) {

        state[6] += state[i];
        state[i] = 0;
      }
    }


    return state;
  }


  /* =========================================================
     EVALUATION
     ========================================================= */

  function evaluateBasic(s) {

    const humanPits =
      s.slice(0, 6)
        .reduce((a, b) => a + b, 0);

    const cpuPits =
      s.slice(7, 13)
        .reduce((a, b) => a + b, 0);

    return (
      (humanPits - cpuPits) * 10
    );
  }


  /*
    Kahalaでは最終的に
    ゴールの石数が勝敗。

    したがってCPUから見て

    CPUゴール - YOUゴール

    を高く評価する。
  */

  function evaluateKahala(s) {

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
      +
      (cpuPits - humanPits) * 5
    );
  }


  function evaluate(s) {

    if (isKahala()) {
      return evaluateKahala(s);
    }

    return evaluateBasic(s);
  }


  /* =========================================================
     ADVANCED EVALUATION
     ========================================================= */

  function evaluateAdvanced(s) {

    if (isKahala()) {

      const humanGoal = s[6];
      const cpuGoal = s[13];

      const humanPits =
        s.slice(0, 6)
          .reduce((a, b) => a + b, 0);

      const cpuPits =
        s.slice(7, 13)
          .reduce((a, b) => a + b, 0);


      let score =
        (cpuGoal - humanGoal) * 40;

      score +=
        (cpuPits - humanPits) * 8;


      /*
        CPU側の空ポケット。
        終盤に自分の陣地を空にできることは
        有利なので少し評価する。
      */

      for (let i = 7; i <= 12; i++) {

        if (s[i] === 0) {
          score += 4;
        }
      }


      /*
        YOU側が空に近いほど、
        CPUがゲームを終わらせられる可能性が高い。
      */

      const humanEmpty =
        s.slice(0, 6)
          .filter(v => v === 0)
          .length;

      score +=
        humanEmpty * 5;


      return score;
    }


    /*
      BASIC
    */

    const humanPits =
      s.slice(0, 6)
        .reduce((a, b) => a + b, 0);

    const cpuPits =
      s.slice(7, 13)
        .reduce((a, b) => a + b, 0);

    const humanGoal = s[6];
    const cpuGoal = s[13];


    const goalScore =
      (cpuGoal - humanGoal) * 12;

    const pitScore =
      (humanPits - cpuPits) * 8;


    let emptyBonus = 0;


    for (let i = 7; i < 13; i++) {

      if (s[i] === 0) {
        emptyBonus += 3;
      }
    }


    for (let i = 0; i < 6; i++) {

      if (s[i] === 0) {
        emptyBonus -= 3;
      }
    }


    return (
      goalScore +
      pitScore +
      emptyBonus
    );
  }


  /* =========================================================
     LEVEL 1〜4 CPU
     ========================================================= */

  function chooseCpuMove() {

    const moves =
      legalMoves('cpu');


    if (!moves.length) {
      return 7;
    }


    /* =====================================================
       LEVEL 1
       完全ランダム
       ===================================================== */

    if (cpuLevel === 1) {

      return moves[
        Math.floor(
          Math.random() * moves.length
        )
      ];
    }


    /* =====================================================
       LEVEL 2
       その場で一番得な手
       ===================================================== */

    if (cpuLevel === 2) {

      let best =
        -Infinity;

      let candidates = [];


      for (const m of moves) {

        const r =
          simulate(
            board,
            m,
            'cpu'
          );


        let score =
          evaluate(r.state);


        /*
          ゴールに入る手を優先
        */

        if (r.again) {
          score +=
            isKahala()
              ? 80
              : 15;
        }


        /*
          Kahalaの取り込みも評価
        */

        if (isKahala()) {

          const goalGain =
            r.state[13] - board[13];

          score +=
            goalGain * 20;
        }


        if (score > best) {

          best = score;
          candidates = [m];

        } else if (score === best) {

          candidates.push(m);
        }
      }


      return candidates[
        Math.floor(
          Math.random()
          * candidates.length
        )
      ];
    }


    /* =====================================================
       LEVEL 3
       自分の手 → 相手の1手先
       ===================================================== */

    if (cpuLevel === 3) {

      let best =
        -Infinity;

      let candidates = [];


      for (const m of moves) {

        const r =
          simulate(
            board,
            m,
            'cpu'
          );


        let score =
          evaluate(r.state);


        if (r.again) {

          score +=
            isKahala()
              ? 80
              : 20;
        }


        const oppMoves =
          legalMoves(
            'human',
            r.state
          );


        if (oppMoves.length) {

          let worst =
            Infinity;


          for (const om of oppMoves) {

            const or =
              simulate(
                r.state,
                om,
                'human'
              );


            let after =
              evaluate(or.state);


            if (or.again) {

              const follow =
                legalMoves(
                  'human',
                  or.state
                );


              if (follow.length) {

                const followScores =
                  follow.map(
                    f =>
                      evaluate(
                        simulate(
                          or.state,
                          f,
                          'human'
                        ).state
                      )
                  );


                after +=
                  Math.min(
                    ...followScores
                  ) * 0.25;
              }
            }


            worst =
              Math.min(
                worst,
                after
              );
          }


          score +=
            worst * 0.7;
        }


        if (score > best) {

          best = score;
          candidates = [m];

        } else if (score === best) {

          candidates.push(m);
        }
      }


      return candidates[
        Math.floor(
          Math.random()
          * candidates.length
        )
      ];
    }


    /* =====================================================
       LEVEL 4
       MINIMAX
       ===================================================== */

    const SEARCH_DEPTH =
      isKahala()
        ? 5
        : 4;


    let bestScore =
      -Infinity;

    let candidates = [];


    for (const m of moves) {

      const result =
        simulate(
          board,
          m,
          'cpu'
        );


      let score;


      if (result.again) {

        score =
          minimax(
            result.state,
            SEARCH_DEPTH - 1,
            'cpu',
            -Infinity,
            Infinity
          );

      } else {

        score =
          minimax(
            result.state,
            SEARCH_DEPTH - 1,
            'human',
            -Infinity,
            Infinity
          );
      }


      if (result.again) {

        score +=
          isKahala()
            ? 100
            : 25;
      }


      if (score > bestScore) {

        bestScore = score;
        candidates = [m];

      } else if (score === bestScore) {

        candidates.push(m);
      }
    }


    return candidates[
      Math.floor(
        Math.random()
        * candidates.length
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
      Kahalaではゲーム終了時に
      残った石をゴールへ移してから
      勝敗を決める。
    */

    const humanEmpty =
      state
        .slice(0, 6)
        .every(v => v === 0);

    const cpuEmpty =
      state
        .slice(7, 13)
        .every(v => v === 0);


    if (humanEmpty || cpuEmpty) {

      const finished =
        isKahala()
          ? sweepRemainingStones(
              state.slice()
            )
          : state;


      if (isKahala()) {

        return (
          finished[13]
          -
          finished[6]
        ) * 1000;
      }


      return (
        evaluate(finished) * 100
      );
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


    /* =====================================================
       CPU = MAX
       ===================================================== */

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

          score +=
            isKahala()
              ? 80
              : 18;
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


    /* =====================================================
       HUMAN = MIN
       ===================================================== */

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

        score -=
          isKahala()
            ? 80
            : 18;
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
     WINNER
     ========================================================= */

  function checkWinner() {

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
      Kahalaの場合は、
      終了時に残った石をゴールへ
      移してから勝敗判定。
    */

    if (isKahala()) {

      sweepRemainingStones(
        boardStones.map(
          stones => stones.length
        )
      );


      /*
        実際のboardStonesにも反映
        */

      if (humanEmpty && !cpuEmpty) {

        for (let i = 7; i <= 12; i++) {

          boardStones[13].push(
            ...boardStones[i]
          );

          boardStones[i] = [];
        }

      } else if (cpuEmpty && !humanEmpty) {

        for (let i = 0; i <= 5; i++) {

          boardStones[6].push(
            ...boardStones[i]
          );

          boardStones[i] = [];
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


      resultText.textContent =
        result;

      resultOverlay.classList.remove(
        'hidden'
      );

      return true;
    }


    /*
      BASIC
    */

    const result =
      humanEmpty && !cpuEmpty
        ? 'WIN'
        : (
            cpuEmpty && !humanEmpty
              ? 'LOSE'
              : 'DRAW'
          );


    resultText.textContent =
      result;

    resultOverlay.classList.remove(
      'hidden'
    );


    return true;
  }


  /* =========================================================
     TITLE
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


  /* =========================================================
     BUTTONS
     ========================================================= */

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

        selectedRule =
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
     SOUND TOGGLE
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


  /* =========================================================
     INITIALIZE
     ========================================================= */

  createPits();

  resetBoard();

  boardWrap.style.opacity =
    '0.52';

})();
