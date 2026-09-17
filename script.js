const BOARD_SIZE = 9;
const MINE_COUNT = 10;

const boardElement = document.querySelector("#board");
const mineCountElement = document.querySelector("#mine-count");
const timerElement = document.querySelector("#timer");
const resetButton = document.querySelector("#reset-button");
const statusElement = document.querySelector("#status");

let cells = [];
let mines = new Set();
let flags = new Set();
let revealed = new Set();
let gameState = "ready";
let elapsedSeconds = 0;
let timerId = null;

function getIndex(row, column) {
  return row * BOARD_SIZE + column;
}

function getNeighbors(index) {
  const row = Math.floor(index / BOARD_SIZE);
  const column = index % BOARD_SIZE;
  const neighbors = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) continue;
      const neighborRow = row + rowOffset;
      const neighborColumn = column + columnOffset;
      if (
        neighborRow >= 0 && neighborRow < BOARD_SIZE
        && neighborColumn >= 0 && neighborColumn < BOARD_SIZE
      ) {
        neighbors.push(getIndex(neighborRow, neighborColumn));
      }
    }
  }
  return neighbors;
}

function placeMines(firstIndex) {
  const candidates = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => index)
    .filter((index) => index !== firstIndex);

  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [candidates[index], candidates[randomIndex]] = [candidates[randomIndex], candidates[index]];
  }
  mines = new Set(candidates.slice(0, MINE_COUNT));
}

function getAdjacentMineCount(index) {
  return getNeighbors(index).filter((neighbor) => mines.has(neighbor)).length;
}

function renderCell(index) {
  const cell = cells[index];
  cell.className = "cell";
  cell.textContent = "";
  cell.setAttribute("aria-label", `${Math.floor(index / BOARD_SIZE) + 1}행 ${index % BOARD_SIZE + 1}열`);

  if (flags.has(index)) {
    cell.classList.add("flagged");
    cell.textContent = "⚑";
    cell.setAttribute("aria-label", "깃발이 꽂힌 칸");
  } else if (revealed.has(index)) {
    cell.classList.add("revealed");
    if (mines.has(index)) {
      cell.classList.add("mine");
      cell.textContent = "✹";
      cell.setAttribute("aria-label", "지뢰");
    } else {
      const count = getAdjacentMineCount(index);
      if (count > 0) {
        cell.classList.add(`number-${count}`);
        cell.textContent = count;
      }
      cell.setAttribute("aria-label", count ? `주변 지뢰 ${count}개` : "빈 칸");
    }
  }
}

function updateMineCounter() {
  mineCountElement.textContent = String(MINE_COUNT - flags.size).padStart(2, "0");
}

function revealEmptyArea(startIndex) {
  const queue = [startIndex];
  const visited = new Set();

  while (queue.length) {
    const index = queue.shift();
    if (visited.has(index) || flags.has(index) || mines.has(index)) continue;
    visited.add(index);
    revealed.add(index);

    if (getAdjacentMineCount(index) === 0) {
      getNeighbors(index).forEach((neighbor) => {
        if (!visited.has(neighbor) && !flags.has(neighbor)) queue.push(neighbor);
      });
    }
  }
}

function stopTimer() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

function startTimer() {
  timerId = setInterval(() => {
    elapsedSeconds += 1;
    timerElement.textContent = String(elapsedSeconds).padStart(3, "0");
  }, 1000);
}

function endGame(won, explodedIndex = null) {
  gameState = won ? "won" : "lost";
  stopTimer();
  if (!won) {
    mines.forEach((index) => revealed.add(index));
    statusElement.textContent = "지뢰를 밟았습니다. 다시 도전해보세요!";
    resetButton.querySelector("span").textContent = "😵";
  } else {
    statusElement.textContent = "축하합니다! 모든 안전한 칸을 열었습니다.";
    resetButton.querySelector("span").textContent = "😎";
  }
  cells.forEach((_, index) => renderCell(index));
  if (!won && explodedIndex !== null) cells[explodedIndex].classList.add("exploded");
}

function checkWin() {
  if (revealed.size === BOARD_SIZE * BOARD_SIZE - MINE_COUNT) endGame(true);
}

function openCell(index) {
  if (gameState === "lost" || gameState === "won" || flags.has(index)) return;
  if (gameState === "ready") {
    placeMines(index);
    gameState = "playing";
    statusElement.textContent = "좋아요! 조심스럽게 지뢰를 피해보세요.";
    startTimer();
  }
  if (mines.has(index)) {
    revealed.add(index);
    endGame(false, index);
    return;
  }
  revealEmptyArea(index);
  cells.forEach((_, cellIndex) => renderCell(cellIndex));
  checkWin();
}

function toggleFlag(index) {
  if (gameState === "lost" || gameState === "won" || revealed.has(index)) return;
  if (flags.has(index)) flags.delete(index);
  else if (flags.size < MINE_COUNT) flags.add(index);
  else return;
  renderCell(index);
  updateMineCounter();
}

function createBoard() {
  boardElement.replaceChildren();
  cells = [];
  for (let index = 0; index < BOARD_SIZE * BOARD_SIZE; index += 1) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cell";
    cell.setAttribute("role", "gridcell");
    cell.addEventListener("click", () => openCell(index));
    cell.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      toggleFlag(index);
    });
    boardElement.appendChild(cell);
    cells.push(cell);
    renderCell(index);
  }
}

function resetGame() {
  stopTimer();
  mines = new Set();
  flags = new Set();
  revealed = new Set();
  gameState = "ready";
  elapsedSeconds = 0;
  timerElement.textContent = "000";
  statusElement.textContent = "안전한 칸을 찾아 시작하세요.";
  resetButton.querySelector("span").textContent = "🙂";
  updateMineCounter();
  createBoard();
}

resetButton.addEventListener("click", resetGame);
resetGame();
