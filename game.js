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

  const SOUND_URL = 'stone.wav';

  const SOUND_CLIPS = [
    { start: 2.00, duration: 0.35 },
    { start: 6.15, duration: 0.35 },
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

  const soundToggle =
    document.getElementById('soundToggle');

  const soundStatus =
    document.getElementById('soundStatus');

  soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;

    soundToggle.classList.toggle(
      'active',
      soundEnabled
    );

    soundStatus.textContent =
      soundEnabled ? 'ON' : 'OFF';
  });


  /* =========================================================
     DOM
     ========================================================= */

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
     GAME STATE
     ========================================================= */

  /*
    0〜5   = YOU
    6      = YOU GOAL
    7〜12  = CPU
    13     = CPU GOAL
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

  /*
    HTMLのruleセレクトから取得するルール。

    basic
    kahala
    sunka
  */

  let currentRule = 'basic';


  /* =========================================================
     RULE INFORMATION
     ========================================================= */

  function isBasic() {
    return currentRule === 'basic';
  }

  function isKahala() {
    return currentRule === 'kahala';
  }

  function isSunka() {
    return currentRule === 'sunka';
  }

  /*
    プレイヤーの陣地
  */

  function playerPits(player) {
    if (player === 'human') {
      return [0, 1, 2, 3, 4, 5];
    }

    return [7, 8, 9, 10, 11, 12];
  }

  /*
    ゴール
  */

  function ownGoal(player) {
    return player === 'human'
      ? 6
      : 13;
  }

  /*
    相手ゴール
  */

  function opponentGoal(player) {
    return player === 'human'
      ? 13
      : 6;
  }

  /*
    自分の陣地かどうか
  */

  function isOwnPit(index, player) {
    return playerPits(player).includes(index);
  }

  /*
    対面ポケット
    YOU:
      0 ↔ 12
      1 ↔ 11
      2 ↔ 10
      3 ↔ 9
      4 ↔ 8
      5 ↔ 7

    CPU:
      7 ↔ 5
      8 ↔ 4
      9 ↔ 3
      10 ↔ 2
      11 ↔ 1
      12 ↔ 0
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

  function oppositePit(index) {
    return OPPOSITE[index];
  }


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
        左列：YOU
        0 → 5

        右列：CPU
        12 → 7
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

        CPU：12 → 7
        YOU：0 → 5
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


  window.addEventListener('resize', () => {
    createPits();
    render();
  });


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
              k % 2 === 0
                ? -14
                : 14;

            const rowHeight =
              Math.min(
                20,
                180 /
                Math.ceil(count / 2)
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
      Array(14)
        .fill(null)
        .map(() => []);

    let pool = [];

    COLOR_CLASSES.forEach(color => {

      for (let i = 0; i < 6; i++) {
        pool.push(color);
      }
    });


    /*
      シャッフル
    */

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


    /*
      12個のポケットに4個ずつ
    */

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
     MOVE HELPERS
     ========================================================= */

  function nextIndex(index) {
    return (index + 1) % 14;
  }


  /*
    Kalaha / Sunkaでは
    相手のゴールを飛ばす。

    Basicでは
    全14マスに入れる。
  */

  function nextPlayableIndex(
    index,
    player
  ) {

    let next =
      nextIndex(index);

    if (
      (isKahala() || isSunka()) &&
      next === opponentGoal(player)
    ) {

      next =
        nextIndex(next);
    }

    return next;
  }


  function legalMoves(
    player,
    state = board
  ) {

    return playerPits(player)
      .filter(
        i => state[i] > 0
      );
  }


  /* =========================================================
     COMMON GAME END CONDITION
     ========================================================= */

  /*
    3ルール共通。

    どちらか一方の陣地の
    ポケットが全部空になったら終了。

    ゴールは判定対象外。
  */

  function isGameOver(state = board) {

    const humanEmpty =
      playerPits('human')
        .every(i => state[i] === 0);

    const cpuEmpty =
      playerPits('cpu')
        .every(i => state[i] === 0);

    return humanEmpty || cpuEmpty;
  }


  /* =========================================================
     END-OF-GAME COLLECTION
     ========================================================= */

  /*
    Kalaha / Sunkaのみ。

    終了した瞬間に、

    YOU陣地に残った石
      → YOUゴール

    CPU陣地に残った石
      → CPUゴール

    Basicでは行わない。
  */

  async function collectRemainingStones(
    animate = true
  ) {

    if (isBasic()) {
      return;
    }

    const humanPits =
      playerPits('human');

    const cpuPits =
      playerPits('cpu');


    /*
      YOUの残り石
    */

    let humanRemaining = [];

    humanPits.forEach(i => {

      humanRemaining.push(
        ...boardStones[i]
      );

      boardStones[i] = [];
    });


    /*
      CPUの残り石
    */

    let cpuRemaining = [];

    cpuPits.forEach(i => {

      cpuRemaining.push(
        ...boardStones[i]
      );

      boardStones[i] = [];
    });


    /*
      ゴールへ移動
    */

    boardStones[6].push(
      ...humanRemaining
    );

    boardStones[13].push(
      ...cpuRemaining
    );

    render();

    if (
      animate &&
      (humanRemaining.length > 0 ||
       cpuRemaining.length > 0)
    ) {
      await sleep(300);
    }
  }


  /* =========================================================
     WINNER
     ========================================================= */

  async function finishGame() {

    /*
      すでに終了処理済みなら何もしない
    */

    if (!isGameOver()) {
      return false;
    }


    busy = true;


    /*
      Kalaha / Sunka

      残り石をゴールへ移動
    */

    if (!isBasic()) {
      await collectRemainingStones(true);
    }


    let result;


    if (isBasic()) {

      /*
        Basicは
        「先に自分の陣地を空にした人が勝ち」

        つまり、

        humanEmpty = YOUの勝ち
        cpuEmpty   = CPUの勝ち
      */

      const humanEmpty =
        playerPits('human')
          .every(i => board[i] === 0);

      const cpuEmpty =
        playerPits('cpu')
          .every(i => board[i] === 0);


      if (humanEmpty && !cpuEmpty) {
        result = 'WIN';
      } else if (
        cpuEmpty && !humanEmpty
      ) {
        result = 'LOSE';
      } else {
        result = 'DRAW';
      }

    } else {

      /*
        Kalaha / Sunka

        最終ゴール数で勝敗
      */

      const humanScore =
        boardStones[6].length;

      const cpuScore =
        boardStones[13].length;


      if (humanScore > cpuScore) {
        result = 'WIN';
      } else if (
        cpuScore > humanScore
      ) {
        result = 'LOSE';
      } else {
        result = 'DRAW';
      }
    }


    resultText.textContent =
      result;

    resultOverlay.classList.remove(
      'hidden'
    );

    return true;
  }


  /* =========================================================
     HUMAN MOVE
     ========================================================= */

  async function humanMove(index) {

    if (
      busy ||
      isPaused ||
      current !== 'human' ||
      !isOwnPit(index, 'human') ||
      boardStones[index].length === 0
    ) {
      return;
    }


    busy = true;


    await performMove(
      index,
      'human'
    );


    if (
      await finishGame()
    ) {
      return;
    }


    /*
      performMoveの結果により
      次のターンが決まっている。
    */

    if (
      moveAgain
    ) {

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
     MOVE RESULT
     ========================================================= */

  /*
    performMoveが
    「もう一度自分のターンか」
    をここに返す。

    true:
      同じプレイヤー

    false:
      相手へ
  */

  let moveAgain = false;


  /* =========================================================
     ACTUAL MOVE
     ========================================================= */

  async function performMove(
    start,
    player
  ) {

    moveAgain = false;


    /*
      最初のポケットから
      石を全部取り出す。
    */

    let hand =
      [...boardStones[start]];

    boardStones[start] = [];

    render();


    let pos = start;


    /*
      石を1個ずつ置く
    */

    while (hand.length > 0) {

      pos =
        nextPlayableIndex(
          pos,
          player
        );


      /*
        最後に置く前の状態を保存。

        Sunkaでは
        「最後に置いたポケットに
        もともと石があったか」
        が重要。
      */

      const wasOccupied =
        boardStones[pos].length > 0;


      /*
        1個置く
      */

      boardStones[pos].push(
        hand.pop()
      );

      render();

      playGlassStoneSound();

      await sleep(220);


      /*
        まだ手元に石があるなら
        そのまま次へ。

        ここでSunkaの連鎖判定を
        行うのは「今回の一巡」が
        完全に終わったときだけ。
      */
    }


    /*
      ここが最後の石の場所。
    */


    /* =====================================================
       BASIC
       ===================================================== */

    if (isBasic()) {

      /*
        Basicでは

        ・横取りなし
        ・最後のポケットが空かどうか
          による特殊処理なし

        ・自分のゴールなら追加ターン
        ・それ以外なら相手ターン
      */

      if (
        pos === ownGoal(player)
      ) {
        moveAgain = true;
      } else {
        moveAgain = false;
      }

      return;
    }


    /* =====================================================
       KALAHA
       ===================================================== */

    if (isKahala()) {

      /*
        自分のゴールで終わった
        → もう一度
      */

      if (
        pos === ownGoal(player)
      ) {

        moveAgain = true;

        return;
      }


      /*
        自分の陣地の空ポケットで終わった
        → 横取り
      */

      if (
        isOwnPit(pos, player) &&
        boardStones[pos].length === 1
      ) {

        const opposite =
          oppositePit(pos);


        /*
          自分が今置いた1個
          +
          対面の相手の石全部

          相手が0個でも
          自分の1個は必ずゴールへ。
        */

        const captured =
          [...boardStones[opposite]];

        boardStones[opposite] = [];


        const taken =
          [...boardStones[pos]];

        boardStones[pos] = [];


        boardStones[
          ownGoal(player)
        ].push(
          ...taken,
          ...captured
        );


        render();

        await sleep(250);
      }


      /*
        横取りが起きても
        追加ターンではない。
      */

      moveAgain = false;

      return;
    }


    /* =====================================================
       SUNKA
       ===================================================== */

    if (isSunka()) {

      /*
        ① 自分のゴールで終わった
           → もう一度

        これは最優先。
      */

      if (
        pos === ownGoal(player)
      ) {

        moveAgain = true;

        return;
      }


      /*
        ② ゴールではなく、
           最後に置いたポケットに
           「もともと石があった」

        → そのポケットの石を全部取る
        → もう一度、自分の番
        → 取った石を続けて配る
      */

      /*
        ここでは最終ポケットが
        1個ではなく、
        「置く前から石があった」
        かどうかを確認する必要がある。

        その情報は最後の石を置いた
        時点の wasOccupied に相当する。
      */

      /*
        ただし、performMoveのループでは
        最後のポケットのwasOccupiedが
        スコープを抜けているため、
        下の別実装で処理する。
      */

      return;
    }
  }


  /* =========================================================
     SUNKA MOVE
     ========================================================= */

  /*
    Sunkaだけは連鎖処理が必要なので、
    performMoveを専用版にする。
  */

  async function performSunkaMove(
    start,
    player
  ) {

    moveAgain = false;

    let hand =
      [...boardStones[start]];

    boardStones[start] = [];

    render();


    let pos = start;


    while (true) {

      /*
        handに持っている石を
        1個ずつ置いていく。
      */

      let lastWasOccupied = false;


      while (hand.length > 0) {

        pos =
          nextPlayableIndex(
            pos,
            player
          );


        /*
          最後の石について
          元々石があったかを記録。
        */

        lastWasOccupied =
          boardStones[pos].length > 0;


        boardStones[pos].push(
          hand.pop()
        );

        render();

        playGlassStoneSound();

        await sleep(220);
      }


      /*
        ゴールで終わった
        → 追加ターン
      */

      if (
        pos === ownGoal(player)
      ) {

        moveAgain = true;

        return;
      }


      /*
        最後の場所に
        元々石があった場合
        → その場所の石を全部取る
        → 再びそこから配る
      */

      if (
        lastWasOccupied &&
        pos !== ownGoal(player)
      ) {

        hand =
          [...boardStones[pos]];

        boardStones[pos] = [];

        render();

        await sleep(200);

        /*
          取った石を持ったまま
          「最後に置いた場所の次」
          から通常通り置いていく。

          自分の陣地か相手の陣地かは
          一切関係ない。
        */

        continue;
      }


      /*
        空のポケットで終わった
        → 相手のターン
      */

      moveAgain = false;

      return;
    }
  }


  /* =========================================================
     DISPATCH MOVE
     ========================================================= */

  async function executeMove(
    start,
    player
  ) {

    if (isSunka()) {

      await performSunkaMove(
        start,
        player
      );

    } else {

      await performMove(
        start,
        player
      );
    }
  }


  /*
    humanMoveをSunka対応版に上書きするため、
    実際の人間ターン処理。
  */

  async function humanTurn(index) {

    if (
      busy ||
      isPaused ||
      current !== 'human' ||
      !isOwnPit(index, 'human') ||
      boardStones[index].length === 0
    ) {
      return;
    }


    busy = true;


    await executeMove(
      index,
      'human'
    );


    if (
      await finishGame()
    ) {
      return;
    }


    if (moveAgain) {

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


  /*
    createPitsのクリックイベントから
    呼ぶ関数をSunka対応にする。
  */

  window.humanMove =
    humanTurn;


  /* =========================================================
     CPU
     ========================================================= */

  async function cpuTurn() {

    if (
      isGameOver() ||
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


    await executeMove(
      move,
      'cpu'
    );


    thinking.style.display =
      'none';


    if (
      await finishGame()
    ) {
      return;
    }


    if (moveAgain) {

      current = 'cpu';

      render();

      await sleep(350);

      await cpuTurn();

    } else {

      current = 'human';

      render();

      busy = false;
    }
  }


  /* =========================================================
     AI SIMULATION
     ========================================================= */

  /*
    AI用の簡易状態。

    Sunkaの連鎖も含めて
    実際のルールに近い形でシミュレーションする。
  */

  function cloneState(state) {
    return state.slice();
  }


  function simulateBasic(
    state,
    start,
    player
  ) {

    const s =
      cloneState(state);

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


  function simulateKahala(
    state,
    start,
    player
  ) {

    const s =
      cloneState(state);

    let stones =
      s[start];

    s[start] = 0;

    let pos = start;


    while (stones > 0) {

      pos =
        nextPlayableIndex(
          pos,
          player
        );

      s[pos]++;

      stones--;
    }


    /*
      ゴール
      → 追加ターン
    */

    if (
      pos === ownGoal(player)
    ) {

      return {
        state: s,
        last: pos,
        again: true
      };
    }


    /*
      横取り
    */

    if (
      isOwnPit(pos, player) &&
      s[pos] === 1
    ) {

      const opposite =
        oppositePit(pos);

      s[
        ownGoal(player)
      ] +=
        s[pos] +
        s[opposite];

      s[pos] = 0;
      s[opposite] = 0;
    }


    return {
      state: s,
      last: pos,
      again: false
    };
  }


  /*
    Sunka AI simulation

    連鎖を完全に再現する。
  */

  function simulateSunka(
    state,
    start,
    player
  ) {

    const s =
      cloneState(state);

    let hand =
      s[start];

    s[start] = 0;

    let pos = start;


    while (true) {

      let lastWasOccupied =
        false;


      while (hand > 0) {

        pos =
          nextPlayableIndex(
            pos,
            player
          );

        lastWasOccupied =
          s[pos] > 0;

        s[pos]++;

        hand--;
      }


      /*
        ゴール
        → 追加ターン
      */

      if (
        pos === ownGoal(player)
      ) {

        return {
          state: s,
          last: pos,
          again: true
        };
      }


      /*
        元々石があったポケット
        → 全部取って再開
      */

      if (
        lastWasOccupied
      ) {

        hand =
          s[pos];

        s[pos] = 0;

        continue;
      }


      /*
        空ポケットで終了
      */

      return {
        state: s,
        last: pos,
        again: false
      };
    }
  }


  function simulate(
    state,
    start,
    player
  ) {

    if (isBasic()) {

      return simulateBasic(
        state,
        start,
        player
      );
    }


    if (isKahala()) {

      return simulateKahala(
        state,
        start,
        player
      );
    }


    return simulateSunka(
      state,
      start,
      player
    );
  }


  /* =========================================================
     AI EVALUATION
     ========================================================= */

  function scoreState(s) {

    /*
      Basic
      → ゴールの数ではなく、
        陣地を空にすることが目的。

      Kalaha / Sunka
      → ゴール数が最重要。
    */

    if (isBasic()) {

      const humanPits =
        s.slice(0, 6)
          .reduce(
            (a, b) => a + b,
            0
          );

      const cpuPits =
        s.slice(7, 13)
          .reduce(
            (a, b) => a + b,
            0
          );

      return (
        (humanPits - cpuPits) * 10
      );
    }


    const humanGoal =
      s[6];

    const cpuGoal =
      s[13];


    const humanPits =
      s.slice(0, 6)
        .reduce(
          (a, b) => a + b,
          0
        );

    const cpuPits =
      s.slice(7, 13)
        .reduce(
          (a, b) => a + b,
          0
        );


    return (
      (cpuGoal - humanGoal) * 30
      +
      (humanPits - cpuPits) * 4
    );
  }


  function evaluateAdvanced(s) {

    if (isBasic()) {

      const humanEmpty =
        s.slice(0, 6)
          .every(v => v === 0);

      const cpuEmpty =
        s.slice(7, 13)
          .every(v => v === 0);


      if (
        cpuEmpty &&
        !humanEmpty
      ) {
        return -100000;
      }

      if (
        humanEmpty &&
        !cpuEmpty
      ) {
        return 100000;
      }


      return scoreState(s);
    }


    const humanGoal =
      s[6];

    const cpuGoal =
      s[13];


    return (
      (cpuGoal - humanGoal) * 50
      +
      scoreState(s)
    );
  }


  /* =========================================================
     CPU MOVE CHOICE
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
          Math.random() *
          moves.length
        )
      ];
    }


    /* =====================================================
       LEVEL 2
       1手を見る
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
          evaluateAdvanced(
            r.state
          );


        if (r.again) {
          score += 30;
        }


        if (score > best) {

          best = score;

          candidates = [m];

        } else if (
          score === best
        ) {

          candidates.push(m);
        }
      }


      return candidates[
        Math.floor(
          Math.random() *
          candidates.length
        )
      ];
    }


    /* =====================================================
       LEVEL 3
       自分 → 相手
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
          evaluateAdvanced(
            r.state
          );


        if (r.again) {
          score += 40;
        }


        const oppMoves =
          legalMoves(
            'human',
            r.state
          );


        if (oppMoves.length) {

          let worst =
            Infinity;


          for (
            const om
            of oppMoves
          ) {

            const or =
              simulate(
                r.state,
                om,
                'human'
              );


            let after =
              evaluateAdvanced(
                or.state
              );


            if (or.again) {
              after -= 10;
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

          candidates = [m];

        } else if (
          score === best
        ) {

          candidates.push(m);
        }
      }


      return candidates[
        Math.floor(
          Math.random() *
          candidates.length
        )
      ];
    }


    /* =====================================================
       LEVEL 4
       MINIMAX
       ===================================================== */

    const SEARCH_DEPTH = 4;

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
        score += 40;
      }


      if (score > bestScore) {

        bestScore = score;

        candidates = [m];

      } else if (
        score === bestScore
      ) {

        candidates.push(m);
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
      ゲーム終了
    */

    const humanEmpty =
      state
        .slice(0, 6)
        .every(v => v === 0);

    const cpuEmpty =
      state
        .slice(7, 13)
        .every(v => v === 0);


    if (
      humanEmpty ||
      cpuEmpty
    ) {

      if (isBasic()) {

        if (
          cpuEmpty &&
          !humanEmpty
        ) {
          return 100000;
        }

        if (
          humanEmpty &&
          !cpuEmpty
        ) {
          return -100000;
        }

      } else {

        /*
          Kalaha / Sunkaでは
          終了後に残り石が
          ゴールへ入る。

          ここではAI評価用に
          その結果を計算する。
        */

        const finalState =
          finishSimulation(
            state
          );

        const humanScore =
          finalState[6];

        const cpuScore =
          finalState[13];

        if (
          cpuScore > humanScore
        ) {
          return 100000;
        }

        if (
          humanScore > cpuScore
        ) {
          return -100000;
        }

        return 0;
      }
    }


    if (depth <= 0) {
      return evaluateAdvanced(state);
    }


    const moves =
      legalMoves(
        player,
        state
      );


    if (!moves.length) {
      return evaluateAdvanced(state);
    }


    if (player === 'cpu') {

      let value =
        -Infinity;


      for (
        const move
        of moves
      ) {

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
          score += 25;
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

    } else {

      let value =
        Infinity;


      for (
        const move
        of moves
      ) {

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
          score -= 25;
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
  }


  /*
    AI用の終了時処理。

    Kalaha / Sunkaでは
    陣地に残った石を
    ゴールへ移す。
  */

  function finishSimulation(state) {

    const s =
      state.slice();


    if (isBasic()) {
      return s;
    }


    const humanRemaining =
      s.slice(0, 6)
        .reduce(
          (a, b) => a + b,
          0
        );

    const cpuRemaining =
      s.slice(7, 13)
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
     MENU
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


  /*
    HTML側のselectを使用。

    JS側ではoptionを作らない。
  */

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
     INITIALIZE
     ========================================================= */

  createPits();

  resetBoard();

  boardWrap.style.opacity =
    '0.52';

})();
