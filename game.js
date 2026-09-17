(function () {
  "use strict";

  const DIFFICULTIES = {
    beginner: { label: "초급", cols: 9, rows: 9, mines: 10 },
    intermediate: { label: "중급", cols: 16, rows: 16, mines: 40 },
    expert: { label: "고급", cols: 30, rows: 16, mines: 99 }
  };

  const boardElement = document.querySelector("#board");
  const difficultyElement = document.querySelector("#difficulty");
  const mineCounterElement = document.querySelector("#mine-counter");
  const timerElement = document.querySelector("#timer");
  const resetButton = document.querySelector("#reset-button");
  const statusElement = document.querySelector("#status-message");

  let state;
  let timerId = null;
  let pressedCell = null;
  let pressedButtons = 0;

  function createCell() {
    return { mine: false, adjacentMines: 0, open: false, flagged: false, result: "" };
  }

  function createGame(difficultyKey) {
    const difficulty = DIFFICULTIES[difficultyKey];
    stopTimer();
    state = {
      difficultyKey,
      ...difficulty,
      cells: Array.from({ length: difficulty.rows * difficulty.cols }, createCell),
      minesPlaced: false,
      phase: "ready",
      flags: 0,
      openedSafe: 0,
      seconds: 0
    };
    render();
  }

  function indexOf(row, col) { return row * state.cols + col; }

  function coordinates(index) {
    return { row: Math.floor(index / state.cols), col: index % state.cols };
  }

  function neighbors(index) {
    const { row, col } = coordinates(index);
    const result = [];
    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
        if (!rowOffset && !colOffset) continue;
        const nextRow = row + rowOffset;
        const nextCol = col + colOffset;
        if (nextRow >= 0 && nextRow < state.rows && nextCol >= 0 && nextCol < state.cols) {
          result.push(indexOf(nextRow, nextCol));
        }
      }
    }
    return result;
  }

  function placeMines(firstIndex) {
    const safe = new Set([firstIndex, ...neighbors(firstIndex)]);
    const candidates = state.cells.map((_, index) => index).filter((index) => !safe.has(index));
    for (let index = candidates.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]];
    }
    candidates.slice(0, state.mines).forEach((index) => { state.cells[index].mine = true; });
    state.cells.forEach((cell, index) => {
      cell.adjacentMines = neighbors(index).filter((neighbor) => state.cells[neighbor].mine).length;
    });
    state.minesPlaced = true;
  }

  function startTimer() {
    if (timerId !== null) return;
    timerId = window.setInterval(() => {
      state.seconds = Math.min(999, state.seconds + 1);
      timerElement.textContent = formatCounter(state.seconds);
      if (state.seconds >= 999) stopTimer();
    }, 1000);
  }

  function stopTimer() {
    if (timerId !== null) window.clearInterval(timerId);
    timerId = null;
  }

  function formatCounter(value) {
    const normalized = Math.max(-99, Math.min(999, value));
    return normalized < 0 ? `-${Math.abs(normalized).toString().padStart(2, "0")}` : normalized.toString().padStart(3, "0");
  }

  function openCell(index) {
    const cell = state.cells[index];
    if (state.phase === "won" || state.phase === "lost" || cell.open || cell.flagged) return;
    if (!state.minesPlaced) {
      placeMines(index);
      state.phase = "playing";
      startTimer();
    }
    if (cell.mine) {
      cell.open = true;
      cell.result = "hit";
      lose();
      return;
    }
    floodOpen(index);
    checkWin();
  }

  function floodOpen(startIndex) {
    const queue = [startIndex];
    const visited = new Set();
    while (queue.length) {
      const index = queue.shift();
      if (visited.has(index)) continue;
      visited.add(index);
      const cell = state.cells[index];
      if (cell.open || cell.flagged || cell.mine) continue;
      cell.open = true;
      state.openedSafe += 1;
      if (cell.adjacentMines === 0) {
        neighbors(index).forEach((neighbor) => {
          if (!state.cells[neighbor].open && !state.cells[neighbor].flagged) queue.push(neighbor);
        });
      }
    }
  }

  function toggleFlag(index) {
    if (state.phase === "won" || state.phase === "lost" || state.cells[index].open) return;
    state.cells[index].flagged = !state.cells[index].flagged;
    state.flags += state.cells[index].flagged ? 1 : -1;
    render();
  }

  function chord(index) {
    const cell = state.cells[index];
    if (state.phase !== "playing" || !cell.open || cell.adjacentMines === 0) return;
    const nearby = neighbors(index);
    const flagCount = nearby.filter((neighbor) => state.cells[neighbor].flagged).length;
    if (flagCount !== cell.adjacentMines) return;
    nearby.filter((neighbor) => !state.cells[neighbor].flagged && !state.cells[neighbor].open)
      .forEach(openCell);
    checkWin();
  }

  function checkWin() {
    if (state.openedSafe !== state.cells.length - state.mines) return;
    state.phase = "won";
    stopTimer();
    state.cells.forEach((cell) => {
      if (cell.mine && !cell.flagged) { cell.flagged = true; state.flags += 1; }
    });
    render();
    statusElement.textContent = "축하합니다! 모든 안전한 칸을 열었습니다.";
    if (typeof window.confetti === "function") {
      window.confetti({ particleCount: 180, spread: 90, origin: { y: 0.55 } });
    }
  }

  function lose() {
    state.phase = "lost";
    stopTimer();
    state.cells.forEach((cell) => {
      if (cell.mine) cell.result = cell.result === "hit" ? "hit" : "mine";
      if (cell.flagged && !cell.mine) cell.result = "wrong-flag";
    });
    render();
    statusElement.textContent = "지뢰를 밟았습니다. 다시 시도해보세요.";
  }

  function clearDepressed() {
    document.querySelectorAll(".cell.depressed").forEach((cell) => cell.classList.remove("depressed"));
    pressedCell = null;
    pressedButtons = 0;
  }

  function pressNeighbors(index) {
    if (!state.cells[index].open) return;
    pressedCell = index;
    neighbors(index).forEach((neighbor) => {
      const cell = state.cells[neighbor];
      if (!cell.open && !cell.flagged) boardElement.querySelector(`[data-index="${neighbor}"]`).classList.add("depressed");
    });
  }

  function render() {
    boardElement.style.gridTemplateColumns = `repeat(${state.cols}, var(--cell-size))`;
    boardElement.setAttribute("aria-rowcount", state.rows);
    boardElement.setAttribute("aria-colcount", state.cols);
    boardElement.innerHTML = "";
    state.cells.forEach((cell, index) => {
      const button = document.createElement("button");
      const { row, col } = coordinates(index);
      button.type = "button";
      button.className = "cell";
      button.dataset.index = index;
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-rowindex", row + 1);
      button.setAttribute("aria-colindex", col + 1);
      button.setAttribute("aria-label", `행 ${row + 1}, 열 ${col + 1}`);
      if (cell.open) {
        button.classList.add("open");
        if (cell.adjacentMines) {
          button.classList.add(`number-${cell.adjacentMines}`);
          button.textContent = cell.adjacentMines;
        }
      }
      if (cell.flagged && state.phase !== "lost") button.classList.add("flagged");
      if (state.phase === "lost" && cell.result === "mine") button.classList.add("mine", "open");
      if (cell.result === "hit") button.classList.add("mine", "hit-mine", "open");
      if (cell.result === "wrong-flag") button.classList.add("wrong-flag", "open");
      boardElement.append(button);
    });
    mineCounterElement.textContent = formatCounter(state.mines - state.flags);
    timerElement.textContent = formatCounter(state.seconds);
    resetButton.textContent = state.phase === "won" ? "😎" : state.phase === "lost" ? "😵" : "🙂";
    if (state.phase === "ready") statusElement.textContent = "첫 칸을 열어 게임을 시작하세요.";
  }

  boardElement.addEventListener("click", (event) => {
    const cell = event.target.closest(".cell");
    if (!cell) return;
    const index = Number(cell.dataset.index);
    if (state.cells[index].open) chord(index); else openCell(index);
    render();
  });

  boardElement.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    const cell = event.target.closest(".cell");
    if (cell) toggleFlag(Number(cell.dataset.index));
  });

  boardElement.addEventListener("auxclick", (event) => {
    if (event.button !== 1) return;
    event.preventDefault();
    const cell = event.target.closest(".cell");
    if (cell) chord(Number(cell.dataset.index));
    render();
  });

  boardElement.addEventListener("mousedown", (event) => {
    if (event.button !== 0 && event.button !== 2) return;
    pressedButtons |= 1 << event.button;
    const cell = event.target.closest(".cell");
    if (cell) pressNeighbors(Number(cell.dataset.index));
  });

  ["mouseup", "mouseleave", "dragend"].forEach((eventName) => boardElement.addEventListener(eventName, clearDepressed));
  difficultyElement.addEventListener("change", () => createGame(difficultyElement.value));
  resetButton.addEventListener("click", () => createGame(difficultyElement.value));
  resetButton.addEventListener("mousedown", () => { resetButton.textContent = "😮"; });
  resetButton.addEventListener("mouseup", () => { if (state.phase === "ready" || state.phase === "playing") resetButton.textContent = "🙂"; });

  createGame("beginner");
})();