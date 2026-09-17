import {
  DIFFICULTIES,
  createBoard,
  getNeighbors,
  isWin,
  placeMines,
  revealFlood,
} from './gameLogic.js';

const boardElement = document.getElementById('board');
const mineCounterElement = document.getElementById('mine-count');
const timerElement = document.getElementById('timer');
const resetButton = document.getElementById('reset-button');
const gameMenu = document.getElementById('game-menu');
const confettiLayer = document.getElementById('confetti-layer');

const state = {
  difficulty: 'beginner',
  board: [],
  rows: 9,
  cols: 9,
  mines: 10,
  flagsPlaced: 0,
  firstMove: true,
  gameOver: false,
  hasWon: false,
  timer: 0,
  timerId: null,
};

function setFace(face) {
  resetButton.textContent = {
    idle: '😊',
    pressed: '😮',
    win: '😎',
    lose: '😵',
  }[face];

  resetButton.classList.remove('win', 'lose', 'pressed');
  if (face === 'win') {
    resetButton.classList.add('win');
  }
  if (face === 'lose') {
    resetButton.classList.add('lose');
  }
  if (face === 'pressed') {
    resetButton.classList.add('pressed');
  }
}

function updateCounters() {
  const remaining = Math.max(-999, Math.min(999, state.mines - state.flagsPlaced));
  const sign = remaining < 0 ? '-' : '';
  const digits = String(Math.abs(remaining)).padStart(3, '0');
  mineCounterElement.textContent = `${sign}${digits}`;
  timerElement.textContent = String(Math.min(999, state.timer)).padStart(3, '0');
}

function clearTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function startTimer() {
  clearTimer();
  state.timerId = setInterval(() => {
    if (state.gameOver || state.hasWon) {
      clearTimer();
      return;
    }

    state.timer += 1;
    updateCounters();
  }, 1000);
}

function triggerConfetti() {
  confettiLayer.innerHTML = '';
  const colors = ['#ff4d4d', '#ffd166', '#06d6a0', '#118ab2', '#8338ec'];

  for (let i = 0; i < 80; i += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.setProperty('--x-shift', `${(Math.random() - 0.5) * 240}px`);
    piece.style.animationDelay = `${Math.random() * 0.3}s`;
    confettiLayer.appendChild(piece);

    setTimeout(() => piece.remove(), 2200);
  }
}

function revealAllMines() {
  state.board.forEach((rowValues) => {
    rowValues.forEach((cell) => {
      if (cell.mine) {
        cell.revealed = true;
      }
      if (cell.flagged && !cell.mine) {
        cell.wrongFlag = true;
        cell.flagged = false;
      }
    });
  });
}

function finishLoss() {
  state.gameOver = true;
  clearTimer();
  revealAllMines();
  setFace('lose');
  renderBoard();
}

function finishWin() {
  state.hasWon = true;
  state.gameOver = true;
  clearTimer();
  setFace('win');
  triggerConfetti();
  renderBoard();
}

function startNewGame(levelKey = state.difficulty) {
  const config = DIFFICULTIES[levelKey];
  state.difficulty = levelKey;
  state.rows = config.rows;
  state.cols = config.cols;
  state.mines = config.mines;
  state.board = createBoard(config.rows, config.cols);
  state.flagsPlaced = 0;
  state.firstMove = true;
  state.gameOver = false;
  state.hasWon = false;
  state.timer = 0;
  clearTimer();
  setFace('idle');
  updateCounters();
  boardElement.style.gridTemplateColumns = `repeat(${config.cols}, 32px)`;
  renderBoard();
}

function renderBoard() {
  boardElement.innerHTML = '';

  state.board.forEach((rowValues, row) => {
    rowValues.forEach((cell, col) => {
      const cellButton = document.createElement('button');
      cellButton.type = 'button';
      cellButton.className = 'cell';
      cellButton.dataset.row = String(row);
      cellButton.dataset.col = String(col);
      cellButton.setAttribute('aria-label', `Cell ${row + 1}, ${col + 1}`);

      if (cell.revealed) {
        cellButton.classList.add('revealed');

        if (cell.mine) {
          cellButton.classList.add('mine');
          cellButton.textContent = '💣';
        } else if (cell.adjacentMines > 0) {
          cellButton.textContent = String(cell.adjacentMines);
          cellButton.classList.add(`adjacent-${cell.adjacentMines}`);
        } else {
          cellButton.textContent = '';
        }
      } else if (cell.flagged) {
        cellButton.textContent = '🚩';
        cellButton.classList.add('flagged');
      } else if (cell.wrongFlag) {
        cellButton.textContent = '❌';
        cellButton.classList.add('wrong-flag');
      }

      cellButton.addEventListener('click', () => {
        if (state.gameOver) {
          return;
        }

        handleCellReveal(row, col);
      });

      cellButton.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        if (state.gameOver) {
          return;
        }
        toggleFlag(row, col);
      });

      cellButton.addEventListener('mousedown', (event) => {
        if (event.button === 0 && event.buttons === 3) {
          event.preventDefault();
          handleChord(row, col);
        }
      });

      cellButton.addEventListener('auxclick', (event) => {
        event.preventDefault();
        if (state.gameOver) {
          return;
        }
        handleChord(row, col);
      });

      boardElement.appendChild(cellButton);
    });
  });
}

function handleCellReveal(row, col) {
  const cell = state.board[row][col];

  if (cell.revealed || cell.flagged || state.gameOver) {
    return;
  }

  if (state.firstMove) {
    placeMines(state.board, row, col, state.mines);
    state.firstMove = false;
    startTimer();
  }

  if (cell.mine) {
    cell.revealed = true;
    finishLoss();
    return;
  }

  revealFlood(state.board, row, col);

  if (isWin(state.board)) {
    finishWin();
    return;
  }

  renderBoard();
}

function toggleFlag(row, col) {
  const cell = state.board[row][col];

  if (cell.revealed || state.gameOver) {
    return;
  }

  cell.flagged = !cell.flagged;
  state.flagsPlaced += cell.flagged ? 1 : -1;
  updateCounters();
  renderBoard();
}

function handleChord(row, col) {
  const cell = state.board[row][col];

  if (!cell.revealed || state.gameOver) {
    return;
  }

  const neighbors = getNeighbors(row, col, state.rows, state.cols);
  const flaggedNeighbors = neighbors.filter(({ row: nextRow, col: nextCol }) => {
    return state.board[nextRow][nextCol].flagged;
  }).length;

  if (flaggedNeighbors !== cell.adjacentMines) {
    return;
  }

  let triggeredLoss = false;

  for (const { row: nextRow, col: nextCol } of neighbors) {
    const neighborCell = state.board[nextRow][nextCol];

    if (neighborCell.flagged || neighborCell.revealed) {
      continue;
    }

    if (neighborCell.mine) {
      triggeredLoss = true;
      break;
    }

    revealFlood(state.board, nextRow, nextCol);
  }

  if (triggeredLoss) {
    finishLoss();
    return;
  }

  if (isWin(state.board)) {
    finishWin();
    return;
  }

  renderBoard();
}

function toggleMenu(menuElement) {
  const shouldOpen = !menuElement.classList.contains('open');
  gameMenu.classList.remove('open');

  if (shouldOpen) {
    menuElement.classList.add('open');
  }
}

resetButton.addEventListener('mousedown', () => {
  setFace('pressed');
});

resetButton.addEventListener('mouseup', () => {
  if (state.hasWon) {
    setFace('win');
  } else if (state.gameOver) {
    setFace('lose');
  } else {
    setFace('idle');
  }
});

resetButton.addEventListener('mouseleave', () => {
  if (state.hasWon) {
    setFace('win');
  } else if (state.gameOver) {
    setFace('lose');
  } else {
    setFace('idle');
  }
});

resetButton.addEventListener('click', () => {
  startNewGame(state.difficulty);
});

document.getElementById('game-menu-button').addEventListener('click', () => {
  toggleMenu(gameMenu);
});

document.querySelectorAll('[data-difficulty]').forEach((button) => {
  button.addEventListener('click', () => {
    startNewGame(button.dataset.difficulty);
    gameMenu.classList.remove('open');
  });
});

document.addEventListener('click', (event) => {
  const isInsideMenu = event.target.closest('.menu-item') || event.target.closest('.menu-panel');
  if (!isInsideMenu) {
    gameMenu.classList.remove('open');
  }
});

startNewGame();
