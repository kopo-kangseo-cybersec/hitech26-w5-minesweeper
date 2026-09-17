import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createBoard,
  placeMines,
  revealFlood,
  isWin,
  getNeighbors,
  countAdjacentMines,
} from '../src/gameLogic.js';

const board = createBoard(9, 9);


test('createBoard creates a 9x9 board with all cells hidden and no mines', () => {
  assert.equal(board.length, 9);
  assert.equal(board[0].length, 9);
  assert.equal(board[4][4].revealed, false);
  assert.equal(board[4][4].flagged, false);
  assert.equal(board[4][4].mine, false);
});

test('placeMines respects the first-click safe zone', () => {
  const safeZone = { row: 4, col: 4 };
  const newBoard = placeMines(createBoard(9, 9), safeZone.row, safeZone.col, 10);
  const dangerous = [];
  for (let r = 0; r < newBoard.length; r += 1) {
    for (let c = 0; c < newBoard[r].length; c += 1) {
      if (newBoard[r][c].mine) {
        dangerous.push({ r, c });
      }
    }
  }

  const isAllowed = dangerous.every(({ r, c }) => {
    const rowDistance = Math.abs(r - safeZone.row);
    const colDistance = Math.abs(c - safeZone.col);
    return rowDistance > 1 || colDistance > 1;
  });

  assert.equal(isAllowed, true);
  assert.equal(dangerous.length, 10);
});

test('getNeighbors returns adjacent cells including diagonal neighbors', () => {
  const neighbors = getNeighbors(1, 1, 3, 3);
  assert.equal(neighbors.length, 8);
});

test('countAdjacentMines counts surrounding mines correctly', () => {
  const boardWithMines = createBoard(3, 3);
  boardWithMines[0][0].mine = true;
  boardWithMines[0][1].mine = true;
  boardWithMines[1][0].mine = true;

  assert.equal(countAdjacentMines(boardWithMines, 1, 1), 3);
});

test('revealFlood opens connected empty cells and stops at numbered borders', () => {
  const boardWithVoid = createBoard(3, 3);
  boardWithVoid[0][0].mine = true;
  boardWithVoid[1][0].mine = true;
  const result = revealFlood(boardWithVoid, 2, 2);

  assert.equal(result[2][2].revealed, true);
  assert.equal(result[2][1].revealed, true);
  assert.equal(result[2][0].revealed, false);
});

test('isWin detects a board cleared of all safe cells', () => {
  const boardState = createBoard(2, 2);
  boardState[0][0].mine = true;
  boardState[0][1].revealed = true;
  boardState[1][0].revealed = true;
  boardState[1][1].revealed = true;

  assert.equal(isWin(boardState), true);
});
