const DIFFICULTIES = {
  easy: { rows: 9, cols: 9, mines: 10, label: '초급' },
  medium: { rows: 16, cols: 16, mines: 40, label: '중급' },
  hard: { rows: 16, cols: 30, mines: 99, label: '고급' },
};

const boardElement = document.getElementById('board');
const mineCountElement = document.getElementById('mine-count');
const timerElement = document.getElementById('timer');
const restartButton = document.getElementById('restart-btn');
const difficultyButtons = Array.from(document.querySelectorAll('.difficulty-btn'));

const state = {
  difficulty: 'easy',
  rows: 9,
  cols: 9,
  mines: 10,
  board: [],
  flagsPlaced: 0,
  firstMove: true,
  revealedCount: 0,
  timer: 0,
  timerId: null,
  gameOver: false,
  win: false,
};

function createEmptyBoard(rows, cols) {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({
      row,
      col,
      mine: false,
      flagged: false,
      revealed: false,
      exploded: false,
      adjacentMines: 0,
    }))
  );
}

function updateDifficultyButtons() {
  difficultyButtons.forEach((button) => {
    const isActive = button.dataset.difficulty === state.difficulty;
    button.classList.toggle('active', isActive);
  });
}

function getNeighbors(row, col) {
  const neighbors = [];
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (rowOffset === 0 && colOffset === 0) continue;
      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;
      if (nextRow < 0 || nextCol < 0 || nextRow >= state.rows || nextCol >= state.cols) continue;
      neighbors.push({ row: nextRow, col: nextCol });
    }
  }
  return neighbors;
}

function placeMines(firstRow, firstCol) {
  const safeZone = new Set();
  getNeighbors(firstRow, firstCol).forEach(({ row, col }) => safeZone.add(`${row},${col}`));
  safeZone.add(`${firstRow},${firstCol}`);

  const availablePositions = [];
  for (let row = 0; row < state.rows; row += 1) {
    for (let col = 0; col < state.cols; col += 1) {
      if (!safeZone.has(`${row},${col}`)) {
        availablePositions.push({ row, col });
      }
    }
  }

  for (let index = availablePositions.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [availablePositions[index], availablePositions[swapIndex]] = [availablePositions[swapIndex], availablePositions[index]];
  }

  availablePositions.slice(0, state.mines).forEach(({ row, col }) => {
    state.board[row][col].mine = true;
  });

  for (let row = 0; row < state.rows; row += 1) {
    for (let col = 0; col < state.cols; col += 1) {
      const cell = state.board[row][col];
      if (cell.mine) {
        cell.adjacentMines = -1;
        continue;
      }
      cell.adjacentMines = getNeighbors(row, col).reduce((count, { row: neighborRow, col: neighborCol }) => {
        return count + (state.board[neighborRow][neighborCol].mine ? 1 : 0);
      }, 0);
    }
  }
}

function updateMineCounter() {
  const displayValue = String(state.mines - state.flagsPlaced).padStart(3, '0');
  mineCountElement.textContent = displayValue;
}

function updateTimer() {
  timerElement.textContent = String(state.timer).padStart(3, '0');
}

function startTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
  }

  state.timerId = setInterval(() => {
    if (state.gameOver) {
      clearInterval(state.timerId);
      return;
    }

    state.timer = Math.min(state.timer + 1, 999);
    updateTimer();
  }, 1000);
}

function stopTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function revealCell(row, col) {
  const cell = state.board[row][col];

  if (cell.revealed || cell.flagged || state.gameOver) {
    return;
  }

  cell.revealed = true;
  state.revealedCount += 1;

  if (cell.adjacentMines === 0 && !cell.mine) {
    const queue = [{ row, col }];

    while (queue.length > 0) {
      const current = queue.shift();
      const neighbors = getNeighbors(current.row, current.col);

      neighbors.forEach(({ row: neighborRow, col: neighborCol }) => {
        const neighbor = state.board[neighborRow][neighborCol];
        if (neighbor.revealed || neighbor.flagged || neighbor.mine) {
          return;
        }

        neighbor.revealed = true;
        state.revealedCount += 1;
        if (neighbor.adjacentMines === 0) {
          queue.push({ row: neighborRow, col: neighborCol });
        }
      });
    }
  }

  if (state.revealedCount >= state.rows * state.cols - state.mines) {
    endGame(true);
  }
}

function revealAllMines() {
  for (let row = 0; row < state.rows; row += 1) {
    for (let col = 0; col < state.cols; col += 1) {
      const cell = state.board[row][col];
      if (cell.mine) {
        cell.revealed = true;
      }
    }
  }
}

function handleCellReveal(row, col) {
  if (state.gameOver) return;

  const cell = state.board[row][col];
  if (cell.flagged || cell.revealed) return;

  if (state.firstMove) {
    placeMines(row, col);
    state.firstMove = false;
    startTimer();
  }

  if (cell.mine) {
    cell.exploded = true;
    revealAllMines();
    state.gameOver = true;
    stopTimer();
    restartButton.textContent = '😵';
    renderBoard();
    return;
  }

  revealCell(row, col);
  renderBoard();

  if (state.gameOver) {
    return;
  }

  if (state.revealedCount >= state.rows * state.cols - state.mines) {
    endGame(true);
  }
}

function toggleFlag(row, col) {
  if (state.gameOver) return;

  const cell = state.board[row][col];
  if (cell.revealed) return;

  cell.flagged = !cell.flagged;
  state.flagsPlaced += cell.flagged ? 1 : -1;
  updateMineCounter();
  renderBoard();
}

function endGame(won) {
  state.gameOver = true;
  state.win = won;
  stopTimer();
  restartButton.textContent = won ? '😎' : '😵';
  if (won) {
    for (let row = 0; row < state.rows; row += 1) {
      for (let col = 0; col < state.cols; col += 1) {
        const cell = state.board[row][col];
        if (!cell.mine && !cell.revealed) {
          cell.revealed = true;
        }
      }
    }
  }
  renderBoard();
}

function renderBoard() {
  boardElement.innerHTML = '';
  boardElement.style.gridTemplateColumns = `repeat(${state.cols}, 28px)`;

  for (let row = 0; row < state.rows; row += 1) {
    for (let col = 0; col < state.cols; col += 1) {
      const cell = state.board[row][col];
      const cellButton = document.createElement('button');
      cellButton.type = 'button';
      cellButton.className = 'cell';
      cellButton.dataset.row = String(row);
      cellButton.dataset.col = String(col);

      if (cell.revealed) cellButton.classList.add('revealed');
      if (cell.flagged) cellButton.classList.add('flagged');
      if (cell.mine && cell.revealed) cellButton.classList.add('mine');
      if (cell.exploded) cellButton.classList.add('exploded');

      if (cell.flagged && !cell.revealed) {
        cellButton.textContent = '🚩';
      } else if (cell.mine && cell.revealed) {
        cellButton.textContent = '💣';
      } else if (cell.revealed && cell.adjacentMines > 0) {
        cellButton.textContent = String(cell.adjacentMines);
        cellButton.classList.add(`n${cell.adjacentMines}`);
      }

      cellButton.setAttribute('aria-label', `${row + 1}행 ${col + 1}열`);
      boardElement.appendChild(cellButton);
    }
  }
}

function setupBoardEvents() {
  boardElement.addEventListener('click', (event) => {
    const cell = event.target.closest('.cell');
    if (!cell) return;

    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    handleCellReveal(row, col);
  });

  boardElement.addEventListener('contextmenu', (event) => {
    const cell = event.target.closest('.cell');
    if (!cell) return;

    event.preventDefault();
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    toggleFlag(row, col);
  });
}

function initializeGame() {
  const difficulty = DIFFICULTIES[state.difficulty];
  state.rows = difficulty.rows;
  state.cols = difficulty.cols;
  state.mines = difficulty.mines;
  state.board = createEmptyBoard(state.rows, state.cols);
  state.flagsPlaced = 0;
  state.firstMove = true;
  state.revealedCount = 0;
  state.timer = 0;
  state.gameOver = false;
  state.win = false;
  stopTimer();
  restartButton.textContent = '🙂';
  updateDifficultyButtons();
  updateMineCounter();
  updateTimer();
  renderBoard();
}

difficultyButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.difficulty = button.dataset.difficulty;
    initializeGame();
  });
});

restartButton.addEventListener('click', () => {
  initializeGame();
});

setupBoardEvents();
initializeGame();
