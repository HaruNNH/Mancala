(() => {
    const INITIAL = 4;
    const COLOR_CLASSES = ['c-red', 'c-orange', 'c-yellow', 'c-green', 'c-cyan', 'c-blue', 'c-purple', 'c-pink'];
  
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
        const AudioContext = window.AudioContext || window.webkitAudioContext;
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
  
      const clip = SOUND_CLIPS[Math.floor(Math.random() * SOUND_CLIPS.length)];
      const source = audioCtx.createBufferSource();
      const gainNode = audioCtx.createGain();
  
      source.buffer = soundBuffer;
      source.playbackRate.value = 0.97 + Math.random() * 0.06;
      gainNode.gain.value = 0.9;
  
      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      source.start(0, clip.start, clip.duration);
    }
  
    const soundToggle = document.getElementById('soundToggle');
    const soundStatus = document.getElementById('soundStatus');
  
    soundToggle.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      soundToggle.classList.toggle('active', soundEnabled);
      soundStatus.textContent = soundEnabled ? 'ON' : 'OFF';
    });
  
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
  
    let boardStones = Array(14).fill(null).map(() => []);
    let board = Array(14).fill(0);
    let current = 'human';
    let cpuLevel = 1;
    let busy = false;
    let isPaused = false;
  
    function createPits() {
      pitsEl.innerHTML = '';
      const isPortrait = window.matchMedia('(orientation: portrait)').matches;
  
      if (isPortrait) {
        /*
          【スマホ版レイアウト】
          - 左列：上から下へ 0〜5 (YOU)
          - 右列：下から上へ 12〜7 (CPU)
        */
        for (let row = 0; row < 6; row++) {
          const leftIdx = row; // 0〜5
          const dLeft = document.createElement('div');
          dLeft.className = 'pit bottom';
          dLeft.dataset.index = String(leftIdx);
          dLeft.innerHTML = '<span class="count">0</span>';
          dLeft.addEventListener('click', () => humanMove(Number(dLeft.dataset.index)));
          pitsEl.appendChild(dLeft);
  
          const rightIdx = 12 - row; // 12〜7
          const dRight = document.createElement('div');
          dRight.className = 'pit top';
          dRight.dataset.index = String(rightIdx);
          dRight.innerHTML = '<span class="count">0</span>';
          dRight.addEventListener('click', () => humanMove(Number(dRight.dataset.index)));
          pitsEl.appendChild(dRight);
        }
      } else {
        /*
          【PC版レイアウト】
          - 上側（CPU）：12〜7
          - 下側（YOU）：0〜5
        */
        for (let i = 12; i >= 7; i--) {
          const d = document.createElement('div');
          d.className = 'pit top';
          d.dataset.index = String(i);
          d.innerHTML = '<span class="count">0</span>';
          d.addEventListener('click', () => humanMove(Number(d.dataset.index)));
          pitsEl.appendChild(d);
        }
        for (let i = 0; i < 6; i++) {
          const d = document.createElement('div');
          d.className = 'pit bottom';
          d.dataset.index = String(i);
          d.innerHTML = '<span class="count">0</span>';
          d.addEventListener('click', () => humanMove(Number(d.dataset.index)));
          pitsEl.appendChild(d);
        }
      }
    }
  
    window.addEventListener('resize', () => {
      createPits();
      render();
    });
  
  function renderStones(container, colors, isGoal = false) {
    container.querySelectorAll('.stone').forEach(s => s.remove());
    const visibleColors = colors.slice(0, 32);
    const count = visibleColors.length;
    const isPortrait = window.matchMedia('(orientation: portrait)').matches;
  
    visibleColors.forEach((colorClass, k) => {
      const s = document.createElement('span');
      s.className = `stone ${colorClass}`;
  
      if (!isGoal) {
        const angle = (k / Math.max(1, count)) * Math.PI * 2;
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
      for (let i = 0; i < 14; i++) board[i] = boardStones[i].length;
  
      document.querySelectorAll('.pit').forEach(el => {
        const i = Number(el.dataset.index);
        const stones = boardStones[i];
        el.querySelector('.count').textContent = stones.length;
        renderStones(el, stones, false);
      });
  
      const isPortrait = window.matchMedia('(orientation: portrait)').matches;
      if (isPortrait) {
        // スマホ版：goalLeft(上) = CPUゴール(13)、goalRight(下) = YOUゴール(6)
        leftGoalCount.textContent = boardStones[13].length;
        renderStones(goalLeft, boardStones[13], true);
        rightGoalCount.textContent = boardStones[6].length;
        renderStones(goalRight, boardStones[6], true);
      } else {
        // PC版：goalLeft(左) = CPUゴール(13)、goalRight(右) = YOUゴール(6)
        leftGoalCount.textContent = boardStones[13].length;
        renderStones(goalLeft, boardStones[13], true);
        rightGoalCount.textContent = boardStones[6].length;
        renderStones(goalRight, boardStones[6], true);
      }
  
      opponentLabel.classList.toggle('active', current === 'cpu');
      youLabel.classList.toggle('active', current === 'human');
    }
  
    function resetBoard() {
      boardStones = Array(14).fill(null).map(() => []);
      let pool = [];
      COLOR_CLASSES.forEach(color => {
        for (let i = 0; i < 6; i++) pool.push(color);
      });
  
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
  
      [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12].forEach(idx => {
        boardStones[idx] = pool.splice(0, INITIAL);
      });
  
      current = 'human';
      busy = false;
      isPaused = false;
      thinking.style.display = 'none';
      pauseOverlay.classList.add('hidden');
      render();
    }
  
    function isHumanPit(i){ 
      return i >= 0 && i < 6; // 0〜5はYOU側のピット
    }
  
    function ownGoal(player){ 
      return player === 'human' ? 6 : 13;   // YOUのゴール=6, CPUのゴール=13
    }
  
    function nextIndex(i){ return (i+1)%14; }
  
    function legalMoves(player, state=board) {
      const arr = [];
      if(player==='human') {
        [0,1,2,3,4,5].forEach(i => { if(state[i]>0) arr.push(i); });
      } else {
        [7,8,9,10,11,12].forEach(i => { if(state[i]>0) arr.push(i); });
      }
      return arr;
    }
  
    async function makeMove(start, player, animate=true) {
      if (boardStones[start].length === 0) return false;
      let hand = [...boardStones[start]];
      boardStones[start] = [];
      render();
  
      let pos = start;
  
      while(hand.length > 0) {
        pos = nextIndex(pos);
  
        // 【完全ルール適用】
        // 相手のゴール（もう一方のプレイヤーのゴール）には石を入れずにとばすのが通常のマンカラですが、
        // 「通ったすべての穴に石を落としてね」というご指定に基づき、全てのゴール・ピットに漏れなく石を配ります。
        boardStones[pos].push(hand.pop());
        render();
  
        if(animate) {
          playGlassStoneSound();
          await sleep(220);
        }
      }
      return pos === ownGoal(player);
    }
  
    function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
  
    async function humanMove(index) {
      if(busy || isPaused || current!=='human' || !isHumanPit(index) || boardStones[index].length===0) return;
      busy = true;
      const again = await makeMove(index, 'human', true);
      if(checkWinner()) return;
      if(again) {
        current = 'human'; render(); await sleep(250); busy = false;
      } else {
        current = 'cpu'; render(); await sleep(350); await cpuTurn();
      }
    }
  
    async function cpuTurn() {
      if(checkWinner() || isPaused) return;
      busy = true;
      thinking.style.display = 'block';
      await sleep(450);
  
      if(isPaused) { busy = false; return; }
  
      const move = chooseCpuMove();
      const again = await makeMove(move, 'cpu', true);
      thinking.style.display = 'none';
  
      if(checkWinner()) return;
      if(again){
        current = 'cpu'; render(); await sleep(350); busy = false; await cpuTurn();
      } else {
        current = 'human'; render(); busy = false;
      }
    }
  
    function simulate(state, start, player){
      const s = state.slice();
      let stones = s[start]; s[start] = 0;
      let pos = start;
  
      while(stones > 0){
        pos = nextIndex(pos);
        s[pos]++; stones--;
      }
      return {state:s, last:pos, again:pos===ownGoal(player)};
    }
  
    function evaluate(s){
      const humanPits = s.slice(0,6).reduce((a,b)=>a+b, 0);
      const cpuPits = s.slice(7,13).reduce((a,b)=>a+b, 0);
      return (humanPits - cpuPits) * 10;
    }
  
  function chooseCpuMove(){
    const moves = legalMoves('cpu');
  
    if(!moves.length) return 7;
  
    /* =========================================
       LEVEL 1
       完全ランダム
       ========================================= */
    if(cpuLevel === 1){
      return moves[Math.floor(Math.random() * moves.length)];
    }
  
  
    /* =========================================
       LEVEL 2
       自分にとって良い手を選ぶ
       ========================================= */
    if(cpuLevel === 2){
      let best = -Infinity;
      let candidates = [];
  
      for(const m of moves){
        const r = simulate(board, m, 'cpu');
  
        let score =
          evaluate(r.state)
          + (r.again ? 15 : 0);
  
        if(score > best){
          best = score;
          candidates = [m];
        }
        else if(score === best){
          candidates.push(m);
        }
      }
  
      return candidates[
        Math.floor(Math.random() * candidates.length)
      ];
    }
  
  
    /* =========================================
       LEVEL 3
       自分 → 相手の1手先まで読む
       ========================================= */
    if(cpuLevel === 3){
      let best = -Infinity;
      let candidates = [];
  
      for(const m of moves){
  
        const r = simulate(board, m, 'cpu');
  
        let score =
          evaluate(r.state)
          + (r.again ? 20 : 0);
  
        const oppMoves = legalMoves('human', r.state);
  
        if(oppMoves.length){
  
          let worst = Infinity;
  
          for(const om of oppMoves){
  
            const or =
              simulate(r.state, om, 'human');
  
            let after =
              evaluate(or.state);
  
            if(or.again){
              const follow =
                legalMoves('human', or.state);
  
              if(follow.length){
                after += Math.max(
                  ...follow.map(f =>
                    evaluate(
                      simulate(
                        or.state,
                        f,
                        'human'
                      ).state
                    )
                  )
                ) * 0.25;
              }
            }
  
            worst = Math.min(worst, after);
          }
  
          score += worst * 0.7;
        }
  
        if(score > best){
          best = score;
          candidates = [m];
        }
        else if(score === best){
          candidates.push(m);
        }
      }
  
      return candidates[
        Math.floor(Math.random() * candidates.length)
      ];
    }
  
  
    /* =========================================
       LEVEL 4
       数手先まで読むミニマックス
       ========================================= */
  
    const SEARCH_DEPTH = 4;
  
    let bestScore = -Infinity;
    let candidates = [];
  
    for(const m of moves){
  
      const result =
        simulate(board, m, 'cpu');
  
      let score;
  
      /*
        自分の手を打った結果、
        追加ターンならCPUが続けて動ける。
        その場合は相手の手番にせず、
        もう一度CPU側として探索する。
      */
      if(result.again){
  
        score =
          minimax(
            result.state,
            SEARCH_DEPTH - 1,
            'cpu',
            -Infinity,
            Infinity
          );
  
      }else{
  
        score =
          minimax(
            result.state,
            SEARCH_DEPTH - 1,
            'human',
            -Infinity,
            Infinity
          );
      }
  
      /*
        最後の石をゴールに入れる手は
        少しだけ優先。
      */
      if(result.again){
        score += 25;
      }
  
      if(score > bestScore){
        bestScore = score;
        candidates = [m];
      }
      else if(score === bestScore){
        candidates.push(m);
      }
    }
  
    return candidates[
      Math.floor(Math.random() * candidates.length)
    ];
  }
  function minimax(state, depth, player, alpha, beta){
  
    /*
      ゲーム終了
    */
    const humanEmpty =
      state.slice(0,6).every(v => v === 0);
  
    const cpuEmpty =
      state.slice(7,13).every(v => v === 0);
  
    if(humanEmpty || cpuEmpty){
      return evaluate(state) * 100;
    }
  
  
    /*
      探索終了
    */
    if(depth <= 0){
      return evaluateAdvanced(state);
    }
  
  
    const moves =
      legalMoves(player, state);
  
    if(!moves.length){
      return evaluateAdvanced(state);
    }
  
  
    /*
      CPU = 最大化
    */
    if(player === 'cpu'){
  
      let value = -Infinity;
  
      for(const move of moves){
  
        const result =
          simulate(state, move, 'cpu');
  
        let nextPlayer;
  
        /*
          ゴールに入ったら追加ターン
        */
        if(result.again){
          nextPlayer = 'cpu';
        }else{
          nextPlayer = 'human';
        }
  
        let score =
          minimax(
            result.state,
            depth - 1,
            nextPlayer,
            alpha,
            beta
          );
  
        /*
          追加ターンを評価
        */
        if(result.again){
          score += 18;
        }
  
        value = Math.max(value, score);
  
        alpha = Math.max(alpha, value);
  
        if(beta <= alpha){
          break;
        }
      }
  
      return value;
    }
  
  
    /*
      HUMAN = 最小化
    */
  
    let value = Infinity;
  
    for(const move of moves){
  
      const result =
        simulate(state, move, 'human');
  
      let nextPlayer;
  
      if(result.again){
        nextPlayer = 'human';
      }else{
        nextPlayer = 'cpu';
      }
  
      let score =
        minimax(
          result.state,
          depth - 1,
          nextPlayer,
          alpha,
          beta
        );
  
      if(result.again){
        score -= 18;
      }
  
      value = Math.min(value, score);
  
      beta = Math.min(beta, value);
  
      if(beta <= alpha){
        break;
      }
    }
  
    return value;
  }
  
    function evaluateAdvanced(s){
  
    const humanPits =
      s.slice(0,6)
        .reduce((a,b) => a+b, 0);
  
    const cpuPits =
      s.slice(7,13)
        .reduce((a,b) => a+b, 0);
  
    const humanGoal = s[6];
    const cpuGoal = s[13];
  
    /*
      ゴールの石はかなり重要
    */
    const goalScore =
      (cpuGoal - humanGoal) * 12;
  
    /*
      盤上に残っている石
    */
    const pitScore =
      (humanPits - cpuPits) * 8;
  
    /*
      空になりそうな自分の穴を少し評価
    */
    let emptyBonus = 0;
  
    for(let i=7;i<13;i++){
      if(s[i] === 0){
        emptyBonus += 3;
      }
    }
  
    /*
      相手側の空き穴は逆に少しマイナス
    */
    for(let i=0;i<6;i++){
      if(s[i] === 0){
        emptyBonus -= 3;
      }
    }
  
    return (
      goalScore +
      pitScore +
      emptyBonus
    );
  }
  
    function checkWinner(){
      const humanEmpty = board.slice(0,6).every(v => v===0);
      const cpuEmpty = board.slice(7,13).every(v => v===0);
      if(!humanEmpty && !cpuEmpty) return false;
  
      busy = true;
      let result = humanEmpty && !cpuEmpty ? 'WIN' : (cpuEmpty && !humanEmpty ? 'LOSE' : 'DRAW');
  
      document.getElementById('resultText').textContent = result;
      resultOverlay.classList.remove('hidden');
      return true;
    }
  
    function showTitle() {
      resultOverlay.classList.add('hidden');
      pauseOverlay.classList.add('hidden');
      settingsScreen.classList.add('hidden');
      titleScreen.classList.remove('hidden');
      gameUI.classList.add('hidden');
      boardWrap.style.opacity = '0.52';
      resetBoard();
    }
  
    document.getElementById('toSettings').addEventListener('click', () => {
      settingsError.textContent = '';
      settingsScreen.classList.remove('hidden');
      titleScreen.classList.add('hidden');
    });
  
    document.getElementById('startGame').addEventListener('click', () => {
      if(!levelEl.value || !ruleEl.value){
        settingsError.textContent = 'Please make a selection';
        return;
      }
      cpuLevel = Number(levelEl.value);
      settingsError.textContent = '';
      settingsScreen.classList.add('hidden');
      gameUI.classList.remove('hidden');
      boardWrap.style.opacity = '1';
      resetBoard();
    });
  
    document.getElementById('pauseBtn').addEventListener('click', () => {
      isPaused = true;
      pauseOverlay.classList.remove('hidden');
    });
  
    document.getElementById('resumeBtn').addEventListener('click', () => {
      isPaused = false;
      pauseOverlay.classList.add('hidden');
      if(current === 'cpu' && !busy) cpuTurn();
    });
  
    document.getElementById('quitBtn').addEventListener('click', showTitle);
    document.getElementById('restart').addEventListener('click', () => {
      resultOverlay.classList.add('hidden');
      boardWrap.style.opacity = '1';
      resetBoard();
    });
    document.getElementById('backTitle').addEventListener('click', showTitle);
  
    createPits();
    resetBoard();
    boardWrap.style.opacity = '0.52';
  })();