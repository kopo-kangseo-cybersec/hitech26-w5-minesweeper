(() => {
  'use strict';

  const DIFFICULTIES = {
    beginner: { rows: 9, cols: 9, mines: 10 },
    intermediate: { rows: 16, cols: 16, mines: 40 },
    expert: { rows: 16, cols: 30, mines: 99 },
  };

  const elements = {
    board: document.querySelector('#game-board'),
    difficultyButtons: document.querySelectorAll('.difficulty-button'),
    mineCounter: document.querySelector('#mine-counter'),
    restart: document.querySelector('#restart-button'),
    status: document.querySelector('#status-message'),
    timer: document.querySelector('#timer'),
    celebration: document.querySelector('#celebration-layer'),
  };

  const gameState = {
    difficulty: 'beginner',
    board: [],
    status: 'playing',
    firstMove: true,
    flags: 0,
    elapsedSeconds: 0,
    timerId: null,
    leftMouseDown: false,
    rightMouseDown: false,
    chordCell: null,
    chordNeighbors: [],
    suppressNextClick: false,
  };

  function getDifficulty() {
    return DIFFICULTIES[gameState.difficulty];
  }

  function createCell(row, col) {
    return { row, col, isMine: false, isOpen: false, isFlagged: false, isQuestion: false, adjacentMines: 0, element: null };
  }

  function createBoard() {
    const { rows, cols } = getDifficulty();
    gameState.board = Array.from({ length: rows }, (_, row) =>
      Array.from({ length: cols }, (_, col) => createCell(row, col)),
    );
    elements.board.style.gridTemplateColumns = `repeat(${cols}, minmax(22px, 30px))`;
    elements.board.replaceChildren();

    gameState.board.flat().forEach((cell) => {
      const cellElement = document.createElement('button');
      cellElement.type = 'button';
      cellElement.className = 'cell';
      cellElement.setAttribute('role', 'gridcell');
      cellElement.setAttribute('aria-label', `닫힌 칸 ${cell.row + 1}, ${cell.col + 1}`);
      cellElement.addEventListener('click', () => handleLeftClick(cell));
      cellElement.addEventListener('mousedown', (event) => handleMouseDown(event, cell));
      cellElement.addEventListener('mouseup', (event) => handleMouseUp(event));
      cellElement.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        toggleFlag(cell);
      });
      cell.element = cellElement;
      elements.board.append(cellElement);
    });
  }

  function getNeighbors(cell) {
    const { rows, cols } = getDifficulty();
    const neighbors = [];
    for (let row = cell.row - 1; row <= cell.row + 1; row += 1) {
      for (let col = cell.col - 1; col <= cell.col + 1; col += 1) {
        if ((row !== cell.row || col !== cell.col) && row >= 0 && row < rows && col >= 0 && col < cols) {
          neighbors.push(gameState.board[row][col]);
        }
      }
    }
    return neighbors;
  }

  function placeMines(firstCell) {
    const protectedCells = new Set([firstCell, ...getNeighbors(firstCell)]);
    const candidates = gameState.board.flat().filter((cell) => !protectedCells.has(cell));
    const { mines } = getDifficulty();

    for (let index = candidates.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [candidates[index], candidates[randomIndex]] = [candidates[randomIndex], candidates[index]];
    }
    candidates.slice(0, mines).forEach((cell) => { cell.isMine = true; });
  }

  function calculateNumbers() {
    gameState.board.flat().forEach((cell) => {
      cell.adjacentMines = getNeighbors(cell).filter((neighbor) => neighbor.isMine).length;
    });
  }

  function updateMineCounter() {
    const remaining = Math.max(0, getDifficulty().mines - gameState.flags);
    elements.mineCounter.textContent = String(remaining).padStart(3, '0');
  }

  function updateTimer() {
    elements.timer.textContent = String(gameState.elapsedSeconds).padStart(3, '0');
  }

  function startTimer() {
    if (gameState.timerId !== null) return;
    gameState.timerId = window.setInterval(() => {
      gameState.elapsedSeconds += 1;
      updateTimer();
    }, 1000);
  }

  function stopTimer() {
    if (gameState.timerId !== null) window.clearInterval(gameState.timerId);
    gameState.timerId = null;
  }

  function renderCell(cell, showMines = false) {
    const cellElement = cell.element;
    cellElement.className = 'cell';
    cellElement.removeAttribute('data-number');

    if (cell.isOpen || showMines) {
      cellElement.classList.add('open');
      if (cell.isMine) {
        cellElement.textContent = '💣';
        cellElement.classList.add('mine');
      } else if (cell.adjacentMines > 0) {
        cellElement.textContent = String(cell.adjacentMines);
        cellElement.dataset.number = String(cell.adjacentMines);
      } else {
        cellElement.textContent = '';
      }
    } else if (cell.isFlagged) {
      cellElement.textContent = '🚩';
      cellElement.classList.add('flagged');
    } else if (cell.isQuestion) {
      cellElement.textContent = '❓';
      cellElement.classList.add('question');
    } else {
      cellElement.textContent = '';
    }

    if (showMines && cell.isFlagged && !cell.isMine) {
      cellElement.textContent = '✕';
      cellElement.classList.add('wrong-flag');
    }
    cellElement.setAttribute('aria-label', getCellLabel(cell, showMines));
  }

  function getCellLabel(cell, showMines) {
    const location = `${cell.row + 1}, ${cell.col + 1}`;
    if (cell.isFlagged && !showMines) return `깃발 ${location}`;
    if (cell.isQuestion && !showMines) return `물음표 ${location}`;
    if (!cell.isOpen && !showMines) return `닫힌 칸 ${location}`;
    if (cell.isMine) return `지뢰 ${location}`;
    return cell.adjacentMines ? `${cell.adjacentMines} 주변 지뢰 ${location}` : `빈 칸 ${location}`;
  }

  function renderBoard(showMines = false) {
    gameState.board.flat().forEach((cell) => renderCell(cell, showMines));
  }

  function clearCelebration() {
    elements.celebration.replaceChildren();
  }

  function showCelebration() {
    const colors = ['#ff3b30', '#ffcc00', '#34c759', '#007aff', '#af52de', '#ff9500'];
    const shellBounds = document.querySelector('.game-shell').getBoundingClientRect();
    const pieces = Array.from({ length: 44 }, (_, index) => {
      const piece = document.createElement('span');
      const startsFromLeft = index % 2 === 0;
      const confettiX = Math.round((startsFromLeft ? 1 : -1) * Math.random() * window.innerWidth * 0.9);
      piece.className = 'confetti-piece';
      piece.style.setProperty('--confetti-color', colors[index % colors.length]);
      piece.style.left = `${startsFromLeft ? shellBounds.left : shellBounds.right}px`;
      piece.style.top = `${shellBounds.bottom}px`;
      piece.style.setProperty('--confetti-start-y', `${shellBounds.bottom}px`);
      piece.style.setProperty('--confetti-x', `${confettiX}px`);
      piece.style.setProperty('--confetti-mid-x', `${Math.round(confettiX * 0.45)}px`);
      piece.style.setProperty('--confetti-rotation', `${Math.round(Math.random() * 720 - 360)}deg`);
      piece.style.setProperty('--confetti-delay', `${Math.round(Math.random() * 220)}ms`);
      return piece;
    });
    elements.celebration.replaceChildren(...pieces);
  }

  function expandEmptyCells(startCell) {
    const queue = [startCell];
    const visited = new Set();
    while (queue.length > 0) {
      const cell = queue.shift();
      if (visited.has(cell) || cell.isFlagged || cell.isMine) continue;
      visited.add(cell);
      cell.isOpen = true;
      if (cell.adjacentMines === 0) {
        getNeighbors(cell).forEach((neighbor) => {
          if (!neighbor.isOpen && !neighbor.isFlagged && !visited.has(neighbor)) queue.push(neighbor);
        });
      }
    }
  }

  function checkWin() {
    const hasWon = gameState.board.flat().every((cell) => cell.isMine || cell.isOpen);
    if (!hasWon) return false;
    gameState.status = 'win';
    stopTimer();
    gameState.board.flat().filter((cell) => cell.isMine).forEach((cell) => { cell.isFlagged = true; });
    gameState.flags = getDifficulty().mines;
    elements.restart.textContent = '😎';
    elements.status.textContent = '🎉 YOU WIN! 모든 안전한 칸을 열었습니다.';
    updateMineCounter();
    renderBoard();
    showCelebration();
    return true;
  }

  function gameOver() {
    gameState.status = 'lose';
    stopTimer();
    elements.restart.textContent = '😵';
    elements.status.textContent = '💥 GAME OVER 지뢰를 밟았습니다.';
    renderBoard(true);
  }

  function openCell(cell) {
    if (gameState.status !== 'playing' || cell.isOpen || cell.isFlagged) return;
    if (gameState.firstMove) {
      placeMines(cell);
      calculateNumbers();
      gameState.firstMove = false;
      startTimer();
    }
    cell.isQuestion = false;
    if (cell.isMine) {
      cell.isOpen = true;
      gameOver();
      return;
    }
    if (cell.adjacentMines === 0) expandEmptyCells(cell);
    else cell.isOpen = true;
    renderBoard();
    checkWin();
  }

  function chordCell(cell) {
    if (gameState.status !== 'playing' || !cell.isOpen || cell.adjacentMines === 0) return;
    const neighbors = getNeighbors(cell);
    const flaggedCount = neighbors.filter((neighbor) => neighbor.isFlagged).length;
    if (flaggedCount !== cell.adjacentMines) return;
    neighbors.filter((neighbor) => !neighbor.isFlagged && !neighbor.isOpen).forEach((neighbor) => openCell(neighbor));
  }

  function startChord(cell) {
    if (gameState.status !== 'playing' || !cell.isOpen || gameState.chordCell) return;
    gameState.chordCell = cell;
    gameState.chordNeighbors = getNeighbors(cell).filter((neighbor) => !neighbor.isOpen);
    gameState.chordNeighbors.forEach((neighbor) => neighbor.element.classList.add('chord-pressed'));
  }

  function clearChord(shouldOpen = false) {
    if (!gameState.chordCell) return;
    const pressedCell = gameState.chordCell;
    gameState.chordNeighbors.forEach((neighbor) => neighbor.element.classList.remove('chord-pressed'));
    gameState.chordCell = null;
    gameState.chordNeighbors = [];
    if (shouldOpen) {
      gameState.suppressNextClick = true;
      chordCell(pressedCell);
    }
  }

  function handleMouseDown(event, cell) {
    if (event.button === 0) gameState.leftMouseDown = true;
    if (event.button === 2) gameState.rightMouseDown = true;
    if (cell.isOpen && gameState.leftMouseDown && gameState.rightMouseDown) startChord(cell);
  }

  function handleMouseUp(event) {
    const wasChord = Boolean(gameState.chordCell);
    if (event.button === 0) gameState.leftMouseDown = false;
    if (event.button === 2) gameState.rightMouseDown = false;
    if (wasChord && (!gameState.leftMouseDown || !gameState.rightMouseDown)) clearChord(true);
  }

  function handleLeftClick(cell) {
    if (gameState.suppressNextClick) {
      gameState.suppressNextClick = false;
      return;
    }
    if (cell.isOpen) chordCell(cell);
    else openCell(cell);
  }

  function toggleFlag(cell) {
    if (gameState.status !== 'playing' || cell.isOpen) return;
    if (cell.isFlagged) {
      cell.isFlagged = false;
      cell.isQuestion = true;
      gameState.flags -= 1;
    } else if (cell.isQuestion) {
      cell.isQuestion = false;
    } else {
      cell.isFlagged = true;
      gameState.flags += 1;
    }
    renderCell(cell);
    updateMineCounter();
  }

  function initGame() {
    stopTimer();
    clearCelebration();
    gameState.status = 'playing';
    gameState.firstMove = true;
    gameState.flags = 0;
    gameState.elapsedSeconds = 0;
    elements.restart.textContent = '😊';
    elements.status.textContent = '첫 칸을 열어 게임을 시작하세요.';
    updateTimer();
    updateMineCounter();
    createBoard();
  }

  function selectDifficulty(difficulty) {
    gameState.difficulty = difficulty;
    elements.difficultyButtons.forEach((button) => {
      const isActive = button.dataset.difficulty === difficulty;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
    initGame();
  }

  elements.difficultyButtons.forEach((button) => {
    button.addEventListener('click', () => selectDifficulty(button.dataset.difficulty));
  });
  elements.restart.addEventListener('click', initGame);
  window.addEventListener('mouseup', handleMouseUp);

  initGame();
})();
