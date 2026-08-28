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

```
  if (AudioContext) {
    audioCtx = new AudioContext();
    loadSound();
  }
}

if (audioCtx && audioCtx.state === 'suspended') {
  audioCtx.resume();
}
```

}

window.addEventListener('pointerdown', initAudio);

async function loadSound() {
if (!audioCtx || soundBuffer) return;

```
try {
  const response = await fetch(SOUND_URL);
  const arrayBuffer = await response.arrayBuffer();
  soundBuffer = await audioCtx.decodeAudioData(arrayBuffer);
} catch (err) {
  console.warn('Audio fetch failed:', err);
}
```

}

function playGlassStoneSound() {
if (!soundEnabled) return;

```
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
```

}

/* =========================================================
DOM
========================================================= */

const soundToggle =
document.getElementById('soundToggle');

const soundStatus =
document.getElementById('soundStatus');

soundToggle.addEventListener('click', () => {
soundEnabled = !soundEnabled;

```
soundToggle.classList.toggle(
  'active',
  soundEnabled
);

soundStatus.textContent =
  soundEnabled ? 'ON' : 'OFF';
```

});

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

/* =========================================================
GAME STATE
========================================================= */

let boardStones =
Array(14)
.fill(null)
.map(() => []);

let board =
Array(14).fill(0);

let current = 'human';

let cpuLevel = 1;

let currentRule = 'basic';

let busy = false;

let isPaused = false;

/* =========================================================
BOARD LAYOUT
========================================================= */

function createPits() {
pitsEl.innerHTML = '';

```
const isPortrait =
  window.matchMedia(
    '(orientation: portrait)'
  ).matches;

if (isPortrait) {

  /*
    スマホ

    左列：YOU
    0 → 5

    右列：CPU
    12 → 7
  */

  for (let row = 0; row < 6; row++) {

    const leftIdx = row;

    const dLeft =
      document.createElement('div');

    dLeft.className =
      'pit bottom';

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

    dRight.className =
      'pit top';

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

    d.className =
      'pit top';

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

    d.className =
      'pit bottom';

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
```

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

```
container
  .querySelectorAll('.stone')
  .forEach(
    s => s.remove()
  );

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
          Math.ceil(
            count / cols
          );

        const spacingX = 20;
        const spacingY = 18;

        const col =
          k % cols;

        const row =
          Math.floor(k / cols);

        const offsetX =
          (col -
            (cols - 1) / 2)
          * spacingX;

        const offsetY =
          (row -
            (rows - 1) / 2)
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
            Math.ceil(
              count / 2
            )
          );

        const row =
          (
            Math.floor(k / 2)
            - (count / 4)
          ) * rowHeight;

        const offsetX =
          col +
          Math.sin(k * 3) * 3;

        const offsetY =
          row +
          Math.cos(k * 2) * 3;

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
```

}

function render() {

```
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
```

}

/* =========================================================
INITIAL BOARD
========================================================= */

function resetBoard() {

```
boardStones =
  Array(14)
    .fill(null)
    .map(() => []);

let pool = [];

COLOR_CLASSES.forEach(
  color => {
    for (let i = 0; i < 6; i++) {
      pool.push(color);
    }
  }
);

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
```

}

/* =========================================================
COMMON HELPERS
========================================================= */

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

function isOwnPit(
index,
player
) {

```
if (player === 'human') {
  return index >= 0 &&
         index <= 5;
}

return index >= 7 &&
       index <= 12;
```

}

function legalMoves(
player,
state = board
) {

```
const result = [];

const start =
  player === 'human'
    ? 0
    : 7;

const end =
  player === 'human'
    ? 5
    : 12;

for (
  let i = start;
  i <= end;
  i++
) {

  if (state[i] > 0) {
    result.push(i);
  }
}

return result;
```

}

function sleep(ms) {
return new Promise(
resolve => setTimeout(
resolve,
ms
)
);
}

/* =========================================================
BASIC RULE

```
 ・すべてのマスに置く
 ・相手ゴールも飛ばさない
 ・横取りなし
 ・自分のゴールで終了 → 追加ターン
```

========================================================= */

async function makeBasicMove(
start,
player,
animate = true
) {

```
let hand =
  [...boardStones[start]];

boardStones[start] = [];

render();

let pos = start;

while (hand.length > 0) {

  pos =
    (pos + 1) % 14;

  /*
    BASICでは
    相手ゴールも含めて
    全14マスに置く。
  */

  boardStones[pos].push(
    hand.pop()
  );

  render();

  if (animate) {
    playGlassStoneSound();
    await sleep(220);
  }
}

return {
  last: pos,
  again:
    pos === ownGoal(player)
};
```

}

/* =========================================================
KAHALA RULE

```
 ・相手ゴールは飛ばす
 ・自分のゴールには置く
 ・自分のゴールで終了 → 追加ターン
 ・自分の空ポケットで終了 → 横取り
 ・対面が0でも、自分の最後の1個は取る
```

========================================================= */

function nextKahalaIndex(
pos,
player
) {

```
pos =
  (pos + 1) % 14;

if (
  pos ===
  opponentGoal(player)
) {

  pos =
    (pos + 1) % 14;
}

return pos;
```

}

function oppositePit(index) {

```
/*
  対面関係

  0 ↔ 12
  1 ↔ 11
  2 ↔ 10
  3 ↔ 9
  4 ↔ 8
  5 ↔ 7

  6 / 13 はゴールなので
  対面関係には入らない。
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

return map[index];
```

}

async function makeKahalaMove(
start,
player,
animate = true
) {

```
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
  最後が自分のゴール
  → 追加ターン
*/

if (
  pos === ownGoal(player)
) {

  return {
    again: true,
    last: pos
  };
}

/*
  最後が自分の陣地の
  空だったポケット
*/

if (
  isOwnPit(pos, player) &&
  boardStones[pos].length === 1
) {

  const opposite =
    oppositePit(pos);

  /*
    最後に置いた1個
    ＋
    対面にある石全部

    対面が0なら
    1 + 0 = 1
    なので最後の1個は
    必ずゴールへ入れる。
  */

  const captured =
    boardStones[pos].splice(
      0
    );

  const oppositeStones =
    boardStones[opposite].splice(
      0
    );

  boardStones[
    ownGoal(player)
  ].push(
    ...captured,
    ...oppositeStones
  );

  render();

  if (animate) {
    playGlassStoneSound();
    await sleep(220);
  }
}

return {
  again: false,
  last: pos
};
```

}

/* =========================================================
SUNKA RULE

```
 ・相手ゴールは飛ばす
 ・横取りなし
 ・最後のポケットに
   元々石があった場合
   → そのポケット全部を取る
   → その石を持って続行
 ・相手陣地でも発生する
 ・空ポケットならそこで終了
 ・自分のゴールで終了なら
   追加ターン
```

========================================================= */

async function makeSunkaMove(
start,
player,
animate = true
) {

```
/*
  「最後に置いたポケットに
   元々石があったか」を
  判断する必要がある。

  そのため、各着手について
  何個あったかを記録する。
*/

let hand =
  [...boardStones[start]];

boardStones[start] = [];

render();

let pos = start;

while (true) {

  /*
    今回の手で最後に石を置く場所を
    1個ずつ処理する。
  */

  while (hand.length > 0) {

    pos =
      nextKahalaIndex(
        pos,
        player
      );

    /*
      この時点でポケットに
      何個あったかを記録。
    */

    const before =
      boardStones[pos].length;

    boardStones[pos].push(
      hand.pop()
    );

    render();

    if (animate) {
      playGlassStoneSound();
      await sleep(220);
    }

    /*
      まだ手の中に石があるなら
      「最後の石」ではないので
      続ける。
    */

    if (hand.length > 0) {
      continue;
    }

    /*
      ここが「最後に置いた場所」。
    */

    /*
      ゴールの場合
    */

    if (
      pos === ownGoal(player)
    ) {

      /*
        ゴールで終わった場合は
        追加ターン。
      */

      return {
        again: true,
        last: pos
      };
    }

    /*
      最後に置いた場所が
      ポケットで、
      そこに元々石があった場合
      → そのポケット全部を取る。
    */

    if (
      pos >= 0 &&
      pos <= 13 &&
      pos !== 6 &&
      pos !== 13 &&
      before > 0
    ) {

      /*
        横取りではない。

        自分・相手を問わず、
        最後に置いたポケット自身の
        石を全部取る。
      */

      hand =
        boardStones[pos].splice(
          0
        );

      render();

      if (animate) {
        playGlassStoneSound();
        await sleep(220);
      }

      /*
        取った石を持って、
        その場所からさらに続行。

        つまり
        「最後に置いたポケットに
         石があった」
        → その石を全部持つ
        → そこからまた配る。
      */

      continue;
    }

    /*
      元々空だったポケットなら
      そこで終了。
    */

    return {
      again: false,
      last: pos
    };
  }
}
```

}

/* =========================================================
RULE DISPATCHER
========================================================= */

async function makeMove(
start,
player,
animate = true
) {

```
if (
  currentRule === 'basic'
) {

  return makeBasicMove(
    start,
    player,
    animate
  );

}

if (
  currentRule === 'kahala'
) {

  return makeKahalaMove(
    start,
    player,
    animate
  );

}

if (
  currentRule === 'sunka'
) {

  return makeSunkaMove(
    start,
    player,
    animate
  );
}

return makeBasicMove(
  start,
  player,
  animate
);
```

}

/* =========================================================
GAME END
========================================================= */

function isSideEmpty(
player,
state = board
) {

```
const start =
  player === 'human'
    ? 0
    : 7;

const end =
  player === 'human'
    ? 5
    : 12;

for (
  let i = start;
  i <= end;
  i++
) {

  if (state[i] > 0) {
    return false;
  }
}

return true;
```

}

/*
Kahala / Sunka の終了処理。

```
どちらかの陣地が空になったら、
もう片方の陣地に残っている石を
その人のゴールへ全部移す。

重要：
空になった側に対して
もう一度この処理をするわけではない。
```

*/

function collectRemainingStones() {

```
for (let i = 0; i < 6; i++) {

  if (boardStones[i].length > 0) {

    boardStones[6].push(
      ...boardStones[i]
    );

    boardStones[i] = [];
  }
}

for (let i = 7; i < 13; i++) {

  if (boardStones[i].length > 0) {

    boardStones[13].push(
      ...boardStones[i]
    );

    boardStones[i] = [];
  }
}

render();
```

}

function checkWinner() {

```
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
  BASIC
  -------------------------
  先に自分の陣地が空になった
  プレイヤーが勝ち。

  ゴール数は一切関係ない。
*/

if (
  currentRule === 'basic'
) {

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

  document
    .getElementById(
      'resultText'
    )
    .textContent = result;

  resultOverlay.classList.remove(
    'hidden'
  );

  return true;
}

/*
  KAHALA / SUNKA
  -------------------------
  終了時に残った石を
  それぞれのゴールへ移す。
*/

collectRemainingStones();

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

document
  .getElementById(
    'resultText'
  )
  .textContent = result;

resultOverlay.classList.remove(
  'hidden'
);

return true;
```

}

/* =========================================================
HUMAN TURN
========================================================= */

function isHumanPit(index) {

```
return (
  index >= 0 &&
  index < 6
);
```

}

async function humanMove(index) {

```
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
```

}

/* =========================================================
AI
========================================================= */

/*
AI用シミュレーション。

```
実際のゲームと同じルールを
同じ関数で扱えるように、
「ルール別のシミュレーション」を用意する。
```

*/

function cloneState(state) {
return state.map(
stones => stones.slice()
);
}

function simulateBasic(
state,
start,
player
) {

```
const s =
  cloneState(state);

let hand =
  s[start].length;

s[start] = [];

let pos = start;

while (hand > 0) {

  pos =
    (pos + 1) % 14;

  s[pos].push('x');

  hand--;
}

return {
  state: s,
  last: pos,
  again:
    pos === ownGoal(player)
};
```

}

function simulateKahala(
state,
start,
player
) {

```
const s =
  cloneState(state);

let hand =
  s[start].length;

s[start] = [];

let pos = start;

while (hand > 0) {

  pos =
    nextKahalaIndex(
      pos,
      player
    );

  s[pos].push('x');

  hand--;
}

if (
  pos === ownGoal(player)
) {

  return {
    state: s,
    last: pos,
    again: true
  };
}

if (
  isOwnPit(pos, player) &&
  s[pos].length === 1
) {

  const opposite =
    oppositePit(pos);

  const taken =
    s[pos].length +
    s[opposite].length;

  s[pos] = [];

  s[opposite] = [];

  for (
    let i = 0;
    i < taken;
    i++
  ) {

    s[ownGoal(player)].push(
      'x'
    );
  }
}

return {
  state: s,
  last: pos,
  again: false
};
```

}

function simulateSunka(
state,
start,
player
) {

```
const s =
  cloneState(state);

let hand =
  s[start].length;

s[start] = [];

let pos = start;

while (true) {

  while (hand > 0) {

    pos =
      nextKahalaIndex(
        pos,
        player
      );

    const before =
      s[pos].length;

    s[pos].push('x');

    hand--;

    if (hand > 0) {
      continue;
    }

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
      元々石があった
      → 全部取って続行
    */

    if (
      pos !== 6 &&
      pos !== 13 &&
      before > 0
    ) {

      hand =
        s[pos].length;

      s[pos] = [];

      continue;
    }

    return {
      state: s,
      last: pos,
      again: false
    };
  }
}
```

}

function simulate(
state,
start,
player
) {

```
if (
  currentRule === 'basic'
) {

  return simulateBasic(
    state,
    start,
    player
  );
}

if (
  currentRule === 'kahala'
) {

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
```

}

/* =========================================================
AI EVALUATION
========================================================= */

function evaluateBasic(s) {

```
/*
  Basicでは
  「どちらが先に空になるか」
  が最重要。

  ゴール数は評価に使わない。
*/

const human =
  s.slice(0, 6)
    .reduce(
      (a, b) => a + b,
      0
    );

const cpu =
  s.slice(7, 13)
    .reduce(
      (a, b) => a + b,
      0
    );

return (
  (human - cpu) * 10
);
```

}

function evaluateKahala(s) {

```
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
  (cpuGoal - humanGoal) * 20 +
  (humanPits - cpuPits) * 3
);
```

}

function evaluateSunka(s) {

```
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
  (cpuGoal - humanGoal) * 20 +
  (humanPits - cpuPits) * 3
);
```

}

function evaluate(s) {

```
if (
  currentRule === 'basic'
) {

  return evaluateBasic(s);
}

if (
  currentRule === 'kahala'
) {

  return evaluateKahala(s);
}

return evaluateSunka(s);
```

}

/* =========================================================
ADVANCED EVALUATION
========================================================= */

function evaluateAdvanced(s) {

```
const base =
  evaluate(s);

let bonus = 0;

/*
  追加ターンを作れそうな
  手を少し評価。
*/

const cpuMoves =
  legalMoves(
    'cpu',
    s
  );

for (
  const move of cpuMoves
) {

  const result =
    simulate(
      s,
      move,
      'cpu'
    );

  if (result.again) {
    bonus += 8;
  }
}

return base + bonus;
```

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

```
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

  /*
    Basic

    人間側が空
    → CPU勝利なので
    CPUに大きなプラス。

    CPU側が空
    → 人間勝利なので
    CPUに大きなマイナス。
  */

  if (
    currentRule === 'basic'
  ) {

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
  }

  /*
    Kahala / Sunka
    終了時はゴール勝負。
  */

  const terminal =
    cloneState(state);

  for (let i = 0; i < 6; i++) {

    terminal[6].push(
      ...terminal[i]
    );

    terminal[i] = [];
  }

  for (let i = 7; i < 13; i++) {

    terminal[13].push(
      ...terminal[i]
    );

    terminal[i] = [];
  }

  return (
    terminal[13].length -
    terminal[6].length
  ) * 1000;
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

/* CPU = 最大化 */

if (
  player === 'cpu'
) {

  let value =
    -Infinity;

  for (
    const move of moves
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
      score += 15;
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

/* HUMAN = 最小化 */

let value =
  Infinity;

for (
  const move of moves
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
    score -= 15;
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
```

}

/* =========================================================
CPU MOVE
========================================================= */

function chooseCpuMove() {

```
const moves =
  legalMoves(
    'cpu'
  );

if (!moves.length) {
  return 7;
}

/*
  LEVEL 1
  完全ランダム
*/

if (
  cpuLevel === 1
) {

  return moves[
    Math.floor(
      Math.random() *
      moves.length
    )
  ];
}

/*
  LEVEL 2
  1手だけ評価
*/

if (
  cpuLevel === 2
) {

  let best =
    -Infinity;

  let candidates = [];

  for (
    const move of moves
  ) {

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
      result.again
    ) {

      score += 25;
    }

    if (
      score > best
    ) {

      best = score;
      candidates = [move];

    } else if (
      score === best
    ) {

      candidates.push(
        move
      );
    }
  }

  return candidates[
    Math.floor(
      Math.random() *
      candidates.length
    )
  ];
}

/*
  LEVEL 3
  自分の手 → 相手の手
*/

if (
  cpuLevel === 3
) {

  let best =
    -Infinity;

  let candidates = [];

  for (
    const move of moves
  ) {

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
      result.again
    ) {

      score += 25;
    }

    const humanMoves =
      legalMoves(
        'human',
        result.state
      );

    if (
      humanMoves.length
    ) {

      let worst =
        Infinity;

      for (
        const humanMove
        of humanMoves
      ) {

        const humanResult =
          simulate(
            result.state,
            humanMove,
            'human'
          );

        let after =
          evaluate(
            humanResult.state
          );

        if (
          humanResult.again
        ) {

          after -= 15;
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

    if (
      score > best
    ) {

      best = score;
      candidates = [move];

    } else if (
      score === best
    ) {

      candidates.push(
        move
      );
    }
  }

  return candidates[
    Math.floor(
      Math.random() *
      candidates.length
    )
  ];
}

/*
  LEVEL 4
  ミニマックス
*/

const SEARCH_DEPTH = 4;

let bestScore =
  -Infinity;

let candidates = [];

for (
  const move of moves
) {

  const result =
    simulate(
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

  if (
    result.again
  ) {

    score += 25;
  }

  if (
    score > bestScore
  ) {

    bestScore = score;
    candidates = [move];

  } else if (
    score === bestScore
  ) {

    candidates.push(
      move
    );
  }
}

return candidates[
  Math.floor(
    Math.random() *
    candidates.length
  )
];
```

}

/* =========================================================
CPU TURN
========================================================= */

async function cpuTurn() {

```
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

const result =
  await makeMove(
    move,
    'cpu',
    true
  );

thinking.style.display =
  'none';

if (
  checkWinner()
) {

  return;
}

if (
  result.again
) {

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
```

}

/* =========================================================
MENU / SETTINGS
========================================================= */

function showTitle() {

```
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
```

}

document
.getElementById(
'toSettings'
)
.addEventListener(
'click',
() => {

```
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
```

document
.getElementById(
'startGame'
)
.addEventListener(
'click',
() => {

```
    if (
      !levelEl.value ||
      !ruleEl.value
    ) {

      settingsError.textContent =
        'Please make a selection';

      return;
    }

    cpuLevel =
      Number(
        levelEl.value
      );

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
```

document
.getElementById(
'pauseBtn'
)
.addEventListener(
'click',
() => {

```
    isPaused = true;

    pauseOverlay.classList.remove(
      'hidden'
    );
  }
);
```

document
.getElementById(
'resumeBtn'
)
.addEventListener(
'click',
() => {

```
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
```

document
.getElementById(
'quitBtn'
)
.addEventListener(
'click',
showTitle
);

document
.getElementById(
'restart'
)
.addEventListener(
'click',
() => {

```
    resultOverlay.classList.add(
      'hidden'
    );

    boardWrap.style.opacity =
      '1';

    resetBoard();
  }
);
```

document
.getElementById(
'backTitle'
)
.addEventListener(
'click',
showTitle
);

/* =========================================================
START
========================================================= */

createPits();
resetBoard();

boardWrap.style.opacity =
'0.52';

})();
