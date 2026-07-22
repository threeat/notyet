/* =========================================================
   TETRIX - Main Orchestration
   1) Falling pixel-block logo intro
   2) AI demo (auto-play, stands in for a video)
   3) Right when the demo ends, switch to real play on the spot
   4) Keyboard + touch controls, score/level/next UI updates
   5) High-score leaderboard (initials entry, stored per-browser)
   ========================================================= */

(function () {
  const { Board, COLORS, COLS, ROWS } = window.TetrixEngine;
  const { drawBoard, drawBlock, drawNextPreview } = window.TetrixRender;
  const { DemoBot } = window.TetrixBot;
  const audio = window.TetrixAudio;
  const LB = window.TetrixLeaderboard;

  const CELL = 28;

  /* ---------- 1. Pixel logo intro ---------- */
  const FONT = {
    T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"]
  };
  const WORD = ["T", "E", "T", "R", "I", "X"];
  const PALETTE = [COLORS.I, COLORS.O, COLORS.T, COLORS.S, COLORS.Z, COLORS.J, COLORS.L];

  function initLogo() {
    const canvas = document.getElementById("logo-canvas");
    const ctx = canvas.getContext("2d");
    const px = Math.min(14, Math.floor(canvas.width / (WORD.length * 6 + 4)));
    const gapCols = 1;
    let totalCols = 0;
    WORD.forEach(ch => (totalCols += FONT[ch][0].length + gapCols));
    totalCols -= gapCols;
    const startX = (canvas.width - totalCols * px) / 2;
    const startY = (canvas.height - 7 * px) / 2;

    const blocks = [];
    let colorIdx = 0;
    let colOffset = 0;
    WORD.forEach(ch => {
      const rows = FONT[ch];
      for (let y = 0; y < rows.length; y++) {
        for (let x = 0; x < rows[y].length; x++) {
          if (rows[y][x] === "1") {
            blocks.push({
              finalX: startX + (colOffset + x) * px,
              finalY: startY + y * px,
              y: -px * (8 - y) - Math.random() * 220,
              color: PALETTE[colorIdx % PALETTE.length],
              landed: false,
              delay: (colOffset + x) * 14 + Math.random() * 60,
              vy: 0
            });
          }
        }
      }
      colorIdx++;
      colOffset += rows[0].length + gapCols;
    });

    let start = null;
    function frame(ts) {
      if (!start) start = ts;
      const elapsed = ts - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let allLanded = true;
      for (const b of blocks) {
        if (elapsed < b.delay) {
          allLanded = false;
        } else if (!b.landed) {
          b.vy += 1.6; // gravity acceleration
          b.y += b.vy;
          if (b.y >= b.finalY) {
            b.y = b.finalY;
            b.landed = true;
          } else {
            allLanded = false;
          }
        }
        drawBlock(ctx, b.finalX, b.y, px, b.color);
      }
      if (!allLanded) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- 2. Demo (AI auto-play) ---------- */
  const stageCanvas = document.getElementById("stage-canvas");
  const stageCtx = stageCanvas.getContext("2d");
  stageCanvas.width = COLS * CELL;
  stageCanvas.height = ROWS * CELL;

  const nextCanvas = document.getElementById("next-canvas");
  const nextCtx = nextCanvas.getContext("2d");

  const scoreEl = document.getElementById("stat-score");
  const levelEl = document.getElementById("stat-level");
  const linesEl = document.getElementById("stat-lines");
  const badgeEl = document.getElementById("stage-badge");
  const progressFill = document.getElementById("demo-progress-fill");
  const skipBtn = document.getElementById("skip-demo-btn");
  const bgmBtn = document.getElementById("bgm-toggle-btn");
  const leaderboardBtn = document.getElementById("leaderboard-btn");
  const modalBackdrop = document.getElementById("modal-backdrop");
  const modalBox = document.getElementById("modal-box");

  const DEMO_DURATION_MS = 42000;
  let demoBoard = new Board();
  let bot = new DemoBot(demoBoard);
  let demoStart = null;
  let demoRunning = true;
  let demoRAF = null;
  let demoAcc = 0;
  let demoLastTs = null;
  const DEMO_STEP_MS = 95;

  function updateStats(board) {
    scoreEl.textContent = board.score.toLocaleString();
    levelEl.textContent = board.level;
    linesEl.textContent = board.lines;
    drawNextPreview(nextCtx, board.peekType);
  }

  function demoLoop(ts) {
    if (!demoRunning) return;
    if (demoStart === null) demoStart = ts;
    if (demoLastTs === null) demoLastTs = ts;
    const dt = ts - demoLastTs;
    demoLastTs = ts;
    demoAcc += dt;

    while (demoAcc >= DEMO_STEP_MS) {
      const result = bot.step();
      if (result.locked) {
        audio.sfxDrop();
        if (result.cleared) audio.sfxLineClear(result.cleared);
        if (demoBoard.gameOver) {
          demoBoard = new Board();
          bot = new DemoBot(demoBoard);
        }
      }
      demoAcc -= DEMO_STEP_MS;
    }

    drawBoard(stageCtx, demoBoard, CELL);
    updateStats(demoBoard);

    const elapsed = ts - demoStart;
    const pct = Math.min(100, (elapsed / DEMO_DURATION_MS) * 100);
    progressFill.style.width = pct + "%";

    if (elapsed >= DEMO_DURATION_MS) {
      endDemo();
      return;
    }
    demoRAF = requestAnimationFrame(demoLoop);
  }

  function endDemo() {
    if (!demoRunning) return;
    demoRunning = false;
    if (demoRAF) cancelAnimationFrame(demoRAF);
    badgeEl.textContent = "● LIVE";
    badgeEl.classList.add("live");
    skipBtn.style.display = "none";
    document.getElementById("demo-progress-track").style.display = "none";
    document.getElementById("stage-caption").textContent = "Your turn — play now!";
    startGame();
  }

  skipBtn.addEventListener("click", endDemo);

  /* ---------- 3. Real game ---------- */
  let game = null;
  let gameRunning = false;
  let gameAcc = 0;
  let gameLastTs = null;
  let softDropping = false;
  let paused = false;
  let modalOpen = false;
  let scoreHandledForThisGame = false;

  function startGame() {
    game = new Board();
    gameRunning = true;
    gameAcc = 0;
    gameLastTs = null;
    softDropping = false;
    paused = false;
    scoreHandledForThisGame = false;
    updateStats(game);
    requestAnimationFrame(gameLoop);
  }

  function gameLoop(ts) {
    if (!gameRunning) return;
    if (gameLastTs === null) gameLastTs = ts;
    const dt = ts - gameLastTs;
    gameLastTs = ts;

    if (!paused && !modalOpen && !game.gameOver) {
      gameAcc += dt;
      const interval = softDropping ? Math.min(50, game.dropIntervalMs()) : game.dropIntervalMs();
      while (gameAcc >= interval) {
        gameAcc -= interval;
        const prevLevel = game.level;
        if (softDropping) {
          const moved = game.softDropStep();
          if (!moved) {
            const cleared = game.lock();
            handleLockEffects(cleared, prevLevel);
          }
        } else {
          if (!game.move(0, 1)) {
            const cleared = game.lock();
            handleLockEffects(cleared, prevLevel);
          }
        }
      }
    }

    drawBoard(stageCtx, game, CELL);
    updateStats(game);

    if (game.gameOver) {
      drawGameOver();
      if (!scoreHandledForThisGame) {
        scoreHandledForThisGame = true;
        audio.sfxGameOver();
        handleGameOverScore();
      }
      return;
    }
    requestAnimationFrame(gameLoop);
  }

  function handleLockEffects(cleared, prevLevel) {
    audio.sfxLock();
    if (cleared) {
      audio.sfxLineClear(cleared);
      if (game.level > prevLevel) audio.sfxLevelUp();
    }
  }

  function drawGameOver() {
    stageCtx.save();
    stageCtx.fillStyle = "rgba(10,14,39,0.82)";
    stageCtx.fillRect(0, 0, stageCanvas.width, stageCanvas.height);
    stageCtx.fillStyle = "#ff3b6b";
    stageCtx.font = "bold 22px 'Press Start 2P', monospace";
    stageCtx.textAlign = "center";
    stageCtx.fillText("GAME OVER", stageCanvas.width / 2, stageCanvas.height / 2 - 10);
    stageCtx.fillStyle = "#eef2ff";
    stageCtx.font = "12px 'Space Mono', monospace";
    stageCtx.fillText("Press Enter or tap to restart", stageCanvas.width / 2, stageCanvas.height / 2 + 24);
    stageCtx.restore();
  }

  function restartGame() {
    if (!game || !game.gameOver || modalOpen) return;
    startGame();
  }

  /* ---------- Leaderboard modal ---------- */
  function showModal(html) {
    modalBox.innerHTML = html;
    modalBackdrop.hidden = false;
    modalOpen = true;
  }
  function hideModal() {
    modalBackdrop.hidden = true;
    modalBox.innerHTML = "";
    modalOpen = false;
  }

  function handleGameOverScore() {
    const score = game.score;
    if (LB.qualifies(score)) {
      openInitialsModal(score);
    }
  }

  function openInitialsModal(score) {
    showModal(`
      <h2>New High Score!</h2>
      <p>${score.toLocaleString()} points — enter your initials</p>
      <input id="initials-input" class="initials-input" maxlength="3" autocomplete="off" autocapitalize="characters" placeholder="AAA">
      <button id="initials-save-btn" class="ghost-btn full">Save Score</button>
    `);
    const input = document.getElementById("initials-input");
    const saveBtn = document.getElementById("initials-save-btn");
    input.focus();

    input.addEventListener("input", () => {
      input.value = input.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3);
    });
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") save();
    });
    saveBtn.addEventListener("click", save);

    function save() {
      const list = LB.addScore(input.value, score);
      const idx = list.findIndex(e => e.score === score);
      openLeaderboardModal(idx, true);
    }
  }

  function openLeaderboardModal(highlightIndex = -1, offerRestart = false) {
    const list = LB.getScores();
    showModal(`
      <h2>🏆 High Scores</h2>
      ${LB.renderRows(list, highlightIndex)}
      <button id="modal-close-btn" class="ghost-btn full">${offerRestart ? "Play Again" : "Close"}</button>
    `);
    document.getElementById("modal-close-btn").addEventListener("click", () => {
      hideModal();
      if (offerRestart) restartGame();
    });
  }

  leaderboardBtn.addEventListener("click", () => openLeaderboardModal());
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) hideModal();
  });

  /* ---------- 4. Shared input actions (keyboard + touch) ---------- */
  function canAct() {
    return game && gameRunning && !game.gameOver && !paused && !modalOpen;
  }
  function actionMoveLeft() {
    if (!canAct()) return;
    game.move(-1, 0);
    audio.sfxMove();
  }
  function actionMoveRight() {
    if (!canAct()) return;
    game.move(1, 0);
    audio.sfxMove();
  }
  function actionRotate() {
    if (!canAct()) return;
    game.rotate(1);
    audio.sfxRotate();
  }
  function actionHardDrop() {
    if (!canAct()) return;
    const prevLevel = game.level;
    game.hardDrop();
    audio.sfxDrop();
    handleLockEffects(0, prevLevel);
  }
  function actionSoftDrop(on) {
    softDropping = on && canAct();
  }
  function actionTogglePause() {
    if (!game || game.gameOver || modalOpen) return;
    paused = !paused;
  }

  /* ---------- Keyboard ---------- */
  const heldKeys = new Set();
  let dasTimer = null;
  let dasInterval = null;

  function clearDAS() {
    clearTimeout(dasTimer);
    clearInterval(dasInterval);
    dasTimer = null;
    dasInterval = null;
  }

  function startDAS(dir) {
    clearDAS();
    dasTimer = setTimeout(() => {
      dasInterval = setInterval(() => {
        if (canAct()) game.move(dir, 0);
      }, 42);
    }, 160);
  }

  window.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Spacebar"].includes(e.key)) {
      e.preventDefault();
    }
    if (modalOpen) return;
    if (!game || !gameRunning) return;

    if (e.key === "Enter" && game.gameOver) {
      restartGame();
      return;
    }
    if (game.gameOver) return;

    if (e.key.toLowerCase() === "p") {
      actionTogglePause();
      return;
    }
    if (paused) return;

    if (heldKeys.has(e.key)) return;
    heldKeys.add(e.key);

    switch (e.key) {
      case "ArrowLeft":
        actionMoveLeft();
        startDAS(-1);
        break;
      case "ArrowRight":
        actionMoveRight();
        startDAS(1);
        break;
      case "ArrowUp":
        actionRotate();
        break;
      case "ArrowDown":
        actionSoftDrop(true);
        break;
      case " ":
      case "Spacebar":
        actionHardDrop();
        break;
      case "m":
      case "M":
        toggleMusic();
        break;
    }
  });

  window.addEventListener("keyup", (e) => {
    heldKeys.delete(e.key);
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") clearDAS();
    if (e.key === "ArrowDown") actionSoftDrop(false);
  });

  /* ---------- Touch controls (mobile) ---------- */
  const touchButtons = document.querySelectorAll(".touch-btn");
  touchButtons.forEach(btn => {
    const action = btn.dataset.action;

    const start = (e) => {
      e.preventDefault();
      if (game && game.gameOver && !modalOpen) {
        restartGame();
        return;
      }
      switch (action) {
        case "left":
          actionMoveLeft();
          startDAS(-1);
          break;
        case "right":
          actionMoveRight();
          startDAS(1);
          break;
        case "rotate":
          actionRotate();
          break;
        case "softdrop":
          actionSoftDrop(true);
          break;
        case "harddrop":
          actionHardDrop();
          break;
      }
    };
    const end = (e) => {
      e.preventDefault();
      if (action === "left" || action === "right") clearDAS();
      if (action === "softdrop") actionSoftDrop(false);
    };

    btn.addEventListener("touchstart", start, { passive: false });
    btn.addEventListener("touchend", end, { passive: false });
    btn.addEventListener("touchcancel", end, { passive: false });
    // Also support mouse, so the same buttons work on touch laptops / testing with a mouse
    btn.addEventListener("mousedown", start);
    btn.addEventListener("mouseup", end);
    btn.addEventListener("mouseleave", end);
  });

  /* ---------- 5. Music toggle ---------- */
  let musicOn = false;
  function toggleMusic() {
    musicOn = !musicOn;
    audio.startMusic(); // the AudioContext needs a user gesture to actually play/resume
    audio.muted = !musicOn;
    if (audio.masterGain) audio.masterGain.gain.value = musicOn ? 0.5 : 0;
    bgmBtn.textContent = musicOn ? "🔊 Music Off" : "🔇 Music On";
  }
  bgmBtn.addEventListener("click", toggleMusic);

  /* ---------- Boot ---------- */
  initLogo();
  updateStats(demoBoard);
  requestAnimationFrame(demoLoop);
})();
