const BOARD_SIZE = 9;
const MINE_COUNT = 10;

const boardElement = document.querySelector('#board');
const mineCountElement = document.querySelector('#mine-count');
const timerElement = document.querySelector('#timer');
const statusElement = document.querySelector('#status');
const restartButton = document.querySelector('#restart-button');

let cells = [];
let flaggedCount = 0;
let openedCount = 0;
let elapsedSeconds = 0;
let timerId = null;
let gameState = 'ready';

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: BOARD_SIZE }, (_, column) => ({
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

      if (row >= 0 && row < BOARD_SIZE && column >= 0 && column < BOARD_SIZE) {
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

  availableCells.slice(0, MINE_COUNT).forEach((cell) => {
    cell.isMine = true;
  });

  cells.flat().forEach((cell) => {
    cell.adjacentMines = getNeighbors(cell).filter((neighbor) => neighbor.isMine).length;
  });
}

function updateCounter() {
  mineCountElement.textContent = String(MINE_COUNT - flaggedCount).padStart(2, '0');
}

function updateTimer() {
  timerElement.textContent = String(elapsedSeconds).padStart(3, '0');
}

function startTimer() {
  timerId = window.setInterval(() => {
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
  const safeCellCount = BOARD_SIZE * BOARD_SIZE - MINE_COUNT;

  if (openedCount !== safeCellCount) return;

  gameState = 'over';
  stopTimer();
  setStatus('성공! 모든 안전한 칸을 찾았습니다.');

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
    setStatus('지뢰를 밟았습니다. 다시 도전해보세요.');
    return;
  }

  openCell(cell);
  checkWin();
}

function handleFlag(cell) {
  if (gameState === 'over' || cell.isOpen) return;

  if (!cell.isFlagged && flaggedCount >= MINE_COUNT) return;

  cell.isFlagged = !cell.isFlagged;
  flaggedCount += cell.isFlagged ? 1 : -1;
  renderCell(cell);
  updateCounter();

  if (gameState === 'ready') {
    setStatus('깃발을 표시했습니다. 첫 칸을 열어 게임을 시작하세요.');
  }
}

function createCellElement(cell) {
  const element = document.createElement('button');
  element.className = 'cell';
  element.type = 'button';
  element.setAttribute('role', 'gridcell');
  element.addEventListener('click', () => handleOpen(cell));
  element.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    handleFlag(cell);
  });
  cell.element = element;
  boardElement.append(element);
  renderCell(cell);
}

function resetGame() {
  stopTimer();
  cells = createEmptyBoard();
  flaggedCount = 0;
  openedCount = 0;
  elapsedSeconds = 0;
  gameState = 'ready';
  boardElement.replaceChildren();
  cells.flat().forEach(createCellElement);
  updateCounter();
  updateTimer();
  setStatus('첫 칸을 열어 게임을 시작하세요.');
}

restartButton.addEventListener('click', resetGame);
resetGame();