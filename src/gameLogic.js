export const DIFFICULTIES = {
  beginner: { label: 'Beginner', rows: 9, cols: 9, mines: 10 },
  intermediate: { label: 'Intermediate', rows: 16, cols: 16, mines: 40 },
  expert: { label: 'Expert', rows: 16, cols: 30, mines: 99 },
};

export function createBoard(rows, cols) {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({
      row,
      col,
      mine: false,
      flagged: false,
      revealed: false,
      adjacentMines: 0,
      wrongFlag: false,
    })),
  );
}

export function getNeighbors(row, col, rows, cols) {
  const neighbors = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (rowOffset === 0 && colOffset === 0) {
        continue;
      }

      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;

      if (nextRow >= 0 && nextRow < rows && nextCol >= 0 && nextCol < cols) {
        neighbors.push({ row: nextRow, col: nextCol });
      }
    }
  }

  return neighbors;
}

export function countAdjacentMines(board, row, col) {
  const rows = board.length;
  const cols = board[0].length;

  return getNeighbors(row, col, rows, cols).filter(({ row: nextRow, col: nextCol }) => {
    return board[nextRow][nextCol].mine;
  }).length;
}

export function placeMines(board, safeRow, safeCol, mineCount) {
  const rows = board.length;
  const cols = board[0].length;

  board.forEach((rowValues) => {
    rowValues.forEach((cell) => {
      cell.mine = false;
      cell.adjacentMines = 0;
      cell.flagged = false;
      cell.revealed = false;
      cell.wrongFlag = false;
    });
  });

  const safeZone = new Set();
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      const nextRow = safeRow + rowOffset;
      const nextCol = safeCol + colOffset;

      if (nextRow >= 0 && nextRow < rows && nextCol >= 0 && nextCol < cols) {
        safeZone.add(`${nextRow}-${nextCol}`);
      }
    }
  }

  const availableCells = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!safeZone.has(`${row}-${col}`)) {
        availableCells.push({ row, col });
      }
    }
  }

  for (let i = availableCells.length - 1; i > 0; i -= 1) {
    const targetIndex = Math.floor(Math.random() * (i + 1));
    [availableCells[i], availableCells[targetIndex]] = [availableCells[targetIndex], availableCells[i]];
  }

  for (let i = 0; i < mineCount; i += 1) {
    const { row, col } = availableCells[i];
    board[row][col].mine = true;
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      board[row][col].adjacentMines = countAdjacentMines(board, row, col);
    }
  }

  return board;
}

export function revealFlood(board, startRow, startCol) {
  const rows = board.length;
  const cols = board[0].length;
  const queue = [[startRow, startCol]];
  const visited = new Set();

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      board[row][col].adjacentMines = countAdjacentMines(board, row, col);
    }
  }

  while (queue.length > 0) {
    const [row, col] = queue.shift();
    const key = `${row}-${col}`;

    if (visited.has(key)) {
      continue;
    }

    visited.add(key);

    const cell = board[row][col];
    if (cell.flagged || cell.revealed || cell.mine) {
      continue;
    }

    cell.revealed = true;

    if (cell.adjacentMines !== 0) {
      continue;
    }

    const neighbors = getNeighbors(row, col, rows, cols);
    for (const neighbor of neighbors) {
      const nextCell = board[neighbor.row][neighbor.col];
      if (!nextCell.revealed && !nextCell.flagged && !nextCell.mine) {
        queue.push([neighbor.row, neighbor.col]);
      }
    }
  }

  return board;
}

export function isWin(board) {
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const cell = board[row][col];
      if (!cell.mine && !cell.revealed) {
        return false;
      }
    }
  }

  return true;
}
