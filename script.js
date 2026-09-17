const DIFFICULTIES = {
  low: { label: '하급', rows: 9, columns: 9, mines: 10 },
  medium: { label: '중급', rows: 16, columns: 16, mines: 40 },
  high: { label: '상급', rows: 16, columns: 30, mines: 99 },
};

const boardElement = document.querySelector('#board');
const mineCountElement = document.querySelector('#mine-count');
const timerElement = document.querySelector('#timer');
const statusElement = document.querySelector('#status');
const restartButton = document.querySelector('#restart-button');
const restartIconElement = restartButton.querySelector('span');
const confettiElement = document.querySelector('#confetti');
const difficultyElement = document.querySelector('#difficulty');

let difficulty = DIFFICULTIES.low;
let cells = [];
let flaggedCount = 0;
let openedCount = 0;
let elapsedSeconds = 0;
let timerId = null;
let gameState = 'ready';

function createEmptyBoard() {
  return Array.from({ length: difficulty.rows }, (_, row) =>
    Array.from({ length: difficulty.columns }, (_, column) => ({
      row,
      column,
      isMine: false,
      isOpen: false,
      isFlagged: false,
      adjacentMines: 0,
      element: null,
    })),
  );
}

function getNeighbors(cell) {
  const neighbors = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) continue;

      const row = cell.row + rowOffset;
      const column = cell.column + columnOffset;

      if (row >= 0 && row < difficulty.rows && column >= 0 && column < difficulty.columns) {
        neighbors.push(cells[row][column]);
      }
    }
  }

  return neighbors;
}

function placeMines(firstCell) {
  const availableCells = cells.flat().filter(
    (cell) => cell !== firstCell && !getNeighbors(firstCell).includes(cell),
  );

  for (let index = availableCells.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [availableCells[index], availableCells[randomIndex]] = [
      availableCells[randomIndex],
      availableCells[index],
    ];
  }

  availableCells.slice(0, difficulty.mines).forEach((cell) => {
    cell.isMine = true;
  });

  cells.flat().forEach((cell) => {
    cell.adjacentMines = getNeighbors(cell).filter((neighbor) => neighbor.isMine).length;
  });
}

function updateCounter() {
  mineCountElement.textContent = String(difficulty.mines - flaggedCount).padStart(3, '0');
}

function updateTimer() {
  timerElement.textContent = String(elapsedSeconds).padStart(3, '0');
}

function setGameFace(face) {
  restartIconElement.textContent = face;
}

function startTimer() {
  timerId = window.setInterval(() => {
    if (elapsedSeconds >= 999) {
      stopTimer();
      return;
    }

    elapsedSeconds += 1;
    updateTimer();
  }, 1000);
}

function stopTimer() {
  window.clearInterval(timerId);
  timerId = null;
}

function setStatus(message) {
  statusElement.textContent = message;
}

function celebrateWin() {
  const colors = ['#ff0000', '#0000ff', '#008000', '#ffcc00', '#800080'];
  confettiElement.replaceChildren();

  for (let index = 0; index < 48; index += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.setProperty('--confetti-color', colors[index % colors.length]);
    piece.style.setProperty('--confetti-delay', `${Math.random() * 0.45}s`);
    piece.style.setProperty('--confetti-x', `${Math.random() * 100 - 50}vw`);
    piece.style.setProperty('--confetti-y', `${Math.random() * 48 + 24}vh`);
    piece.style.setProperty('--confetti-rotation', `${Math.random() * 1080 - 540}deg`);
    confettiElement.append(piece);
  }
}

function renderCell(cell) {
  const element = cell.element;
  element.className = 'cell';
  element.textContent = '';
  element.removeAttribute('data-number');

  if (cell.isFlagged) {
    element.classList.add('is-flagged');
    element.textContent = '🚩';
    element.setAttribute('aria-label', `${cell.row + 1}행 ${cell.column + 1}열, 깃발`);
    return;
  }

  if (!cell.isOpen) {
    element.setAttribute('aria-label', `${cell.row + 1}행 ${cell.column + 1}열, 닫힌 칸`);
    return;
  }

  element.classList.add('is-open');

  if (cell.isMine) {
    element.classList.add('is-mine');
    element.textContent = '✹';
    element.setAttribute('aria-label', `${cell.row + 1}행 ${cell.column + 1}열, 지뢰`);
  } else if (cell.adjacentMines > 0) {
    element.dataset.number = String(cell.adjacentMines);
    element.textContent = String(cell.adjacentMines);
    element.setAttribute('aria-label', `${cell.row + 1}행 ${cell.column + 1}열, 인접 지뢰 ${cell.adjacentMines}개`);
  } else {
    element.setAttribute('aria-label', `${cell.row + 1}행 ${cell.column + 1}열, 빈 칸`);
  }
}

function openCell(cell) {
  if (gameState === 'over' || cell.isOpen || cell.isFlagged) return;

  cell.isOpen = true;
  openedCount += 1;
  renderCell(cell);

  if (cell.adjacentMines === 0 && !cell.isMine) {
    getNeighbors(cell).forEach((neighbor) => {
      if (!neighbor.isMine && !neighbor.isOpen && !neighbor.isFlagged) {
        openCell(neighbor);
      }
    });
  }
}

function revealMines(explodedCell) {
  cells.flat().forEach((cell) => {
    if (cell.isMine) {
      cell.isOpen = true;
      renderCell(cell);
    }
  });

  explodedCell.element.classList.add('is-exploded');
}

function checkWin() {
  const safeCellCount = difficulty.rows * difficulty.columns - difficulty.mines;

  if (openedCount !== safeCellCount) return;

  gameState = 'over';
  stopTimer();
  setGameFace('😎');
  setStatus('성공! 모든 안전한 칸을 찾았습니다.');
  celebrateWin();

  cells.flat().forEach((cell) => {
    if (cell.isMine && !cell.isFlagged) {
      cell.isFlagged = true;
      flaggedCount += 1;
      renderCell(cell);
    } else if (cell.isOpen) {
      cell.element.classList.add('is-safe');
    }
  });

  updateCounter();
}

function handleOpen(cell) {
  if (gameState === 'over' || cell.isOpen || cell.isFlagged) return;

  if (gameState === 'ready') {
    placeMines(cell);
    gameState = 'playing';
    startTimer();
    setStatus('좋아요. 지뢰를 피해 안전한 칸을 모두 찾으세요.');
  }

  if (cell.isMine) {
    cell.isOpen = true;
    renderCell(cell);
    revealMines(cell);
    gameState = 'over';
    stopTimer();
    setGameFace('😵');
    setStatus('지뢰를 밟았습니다. 다시 도전해보세요.');
    return;
  }

  openCell(cell);
  checkWin();
}

function handleFlag(cell) {
  if (gameState === 'over' || cell.isOpen) return;

  if (!cell.isFlagged && flaggedCount >= difficulty.mines) return;

  cell.isFlagged = !cell.isFlagged;
  flaggedCount += cell.isFlagged ? 1 : -1;
  renderCell(cell);
  updateCounter();

  if (gameState === 'ready') {
    setStatus('깃발을 표시했습니다. 첫 칸을 열어 게임을 시작하세요.');
  }
}

function handleChord(cell) {
  if (gameState === 'over' || !cell.isOpen || cell.adjacentMines === 0) return;

  const neighbors = getNeighbors(cell);
  const adjacentFlagCount = neighbors.filter((neighbor) => neighbor.isFlagged).length;

  if (adjacentFlagCount !== cell.adjacentMines) return;

  neighbors.forEach((neighbor) => {
    if (!neighbor.isOpen && !neighbor.isFlagged) {
      handleOpen(neighbor);
    }
  });

  checkWin();
}

function createCellElement(cell) {
  const element = document.createElement('button');
  element.className = 'cell';
  element.type = 'button';
  element.setAttribute('role', 'gridcell');
  element.addEventListener('click', () => handleOpen(cell));
  element.addEventListener('mousedown', (event) => {
    if (event.buttons === 3) {
      event.preventDefault();
      cell.chordHandled = true;
      handleChord(cell);
    } else if (event.button === 1) {
      event.preventDefault();
      handleChord(cell);
    }
  });
  element.addEventListener('auxclick', (event) => {
    if (event.button === 1) event.preventDefault();
  });
  element.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    if (cell.chordHandled) {
      cell.chordHandled = false;
      return;
    }
    handleFlag(cell);
  });
  cell.element = element;
  boardElement.append(element);
  renderCell(cell);
}

function resetGame() {
  stopTimer();
  confettiElement.replaceChildren();
  cells = createEmptyBoard();
  flaggedCount = 0;
  openedCount = 0;
  elapsedSeconds = 0;
  gameState = 'ready';
  boardElement.style.setProperty('--board-columns', difficulty.columns);
  boardElement.style.setProperty('--board-rows', difficulty.rows);
  boardElement.setAttribute(
    'aria-label',
    `${difficulty.rows} 곱하기 ${difficulty.columns} 지뢰찾기 보드`,
  );
  boardElement.replaceChildren();
  cells.flat().forEach(createCellElement);
  setGameFace('😊');
  updateCounter();
  updateTimer();
  setStatus('첫 칸을 열어 게임을 시작하세요.');
}

restartButton.addEventListener('click', resetGame);
difficultyElement.addEventListener('change', () => {
  difficulty = DIFFICULTIES[difficultyElement.value];
  resetGame();
});
resetGame();