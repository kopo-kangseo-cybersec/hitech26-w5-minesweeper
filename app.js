const boardEl = document.getElementById('board');
const timerEl = document.getElementById('timer');
const minesLeftEl = document.getElementById('mines-left');
const resetBtn = document.getElementById('reset');
const statusEl = document.getElementById('status');
const difficultyEl = document.getElementById('difficulty');

let ROWS = 9, COLS = 9, MINES = 10;
let cells = [];
let firstClick = true;
let timer = null;
let time = 0;
let gameOver = false;
let flags = 0;

// face states: default, pressed, dead, win
function setFace(state){
  const faces = {default: '🙂', pressed: '😮', dead: '😵', win: '😎'};
  resetBtn.textContent = faces[state] || faces.default;
}

// visual animations in place of sound effects
function triggerWinAnimation(){
  boardEl.classList.add('win');
  setTimeout(()=> boardEl.classList.remove('win'), 1200);
  // small counter flash
  document.getElementById('mines-counter').classList.add('flash');
  document.getElementById('time-counter').classList.add('flash');
  setTimeout(()=>{ document.getElementById('mines-counter').classList.remove('flash'); document.getElementById('time-counter').classList.remove('flash'); }, 1200);
}

function triggerExplosionAnimation(){
  boardEl.classList.add('shake');
  setTimeout(()=> boardEl.classList.remove('shake'), 800);
  // highlight all mines briefly
  const mineEls = boardEl.querySelectorAll('.cell.mine');
  mineEls.forEach(el=> el.classList.add('pulse'));
  setTimeout(()=> mineEls.forEach(el=> el.classList.remove('pulse')), 800);
}

function createCells(){
  cells = [];
  for(let r=0;r<ROWS;r++){
    const row = [];
    for(let c=0;c<COLS;c++){
      row.push({r,c,isMine:false,neigh:0,revealed:false,flagged:false,el:null});
    }
    cells.push(row);
  }
}

function renderBoard(){
  boardEl.innerHTML = '';
  boardEl.style.pointerEvents = gameOver ? 'none' : '';
  boardEl.style.gridTemplateColumns = `repeat(${COLS}, var(--cell-size))`;
  boardEl.style.gridTemplateRows = `repeat(${ROWS}, var(--cell-size))`;
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const cell = cells[r][c];
      const el = document.createElement('div');
      el.className = 'cell';
      el.dataset.row = r; el.dataset.col = c;
      el.tabIndex = 0;
      cell.el = el;
      el.addEventListener('click', onLeftClick);
      el.addEventListener('contextmenu', onRightClick);
      boardEl.appendChild(el);
      refreshCell(cell);
    }
  }
}

function refreshCell(cell){
  const el = cell.el;
  el.className = 'cell';
  if(cell.revealed){
    el.classList.add('revealed');
    if(cell.isMine){
      el.classList.add('mine');
      el.textContent = '💣';
    } else if(cell.neigh>0){
      el.dataset.neigh = cell.neigh;
      el.textContent = cell.neigh;
    } else {
      el.textContent = '';
    }
  } else {
    if(cell.flagged){
      el.classList.add('flagged');
      el.textContent = '🚩';
    } else {
      el.textContent = '';
    }
  }
}

function placeMines(excludeR, excludeC){
  let placed = 0;
  while(placed<MINES){
    const r = Math.floor(Math.random()*ROWS);
    const c = Math.floor(Math.random()*COLS);
    if((r===excludeR && c===excludeC) || cells[r][c].isMine) continue;
    cells[r][c].isMine = true; placed++;
  }
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      cells[r][c].neigh = countNeighbors(r,c);
    }
  }
}

function countNeighbors(r,c){
  let cnt=0;
  for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
    if(dr===0 && dc===0) continue;
    const nr=r+dr, nc=c+dc;
    if(nr>=0 && nr<ROWS && nc>=0 && nc<COLS && cells[nr][nc].isMine) cnt++;
  }
  return cnt;
}

function countFlagsAround(r,c){
  let cnt=0;
  for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
    if(dr===0 && dc===0) continue;
    const nr=r+dr, nc=c+dc;
    if(nr>=0 && nr<ROWS && nc>=0 && nc<COLS && cells[nr][nc].flagged) cnt++;
  }
  return cnt;
}

function chordCell(r,c){
  const cell = cells[r][c];
  if(!cell.revealed || cell.neigh===0) return;
  const flagsAround = countFlagsAround(r,c);
  if(flagsAround !== cell.neigh) return;
  for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
    if(dr===0 && dc===0) continue;
    const nr=r+dr, nc=c+dc;
    if(nr>=0 && nr<ROWS && nc>=0 && nc<COLS){
      const ncell = cells[nr][nc];
      if(!ncell.flagged && !ncell.revealed){
        revealCell(nr,nc);
      }
    }
  }
}

function onLeftClick(e){
  if(gameOver) return;
  const r = +this.dataset.row; const c = +this.dataset.col;
  const cell = cells[r][c];
  // If already revealed and numbered, attempt chord (auto-open neighbors if flags match)
  if(cell.revealed){
    chordCell(r,c);
    checkWin();
    return;
  }
  if(cell.flagged) return;
  if(firstClick){
    placeMines(r,c);
    startTimer();
    firstClick = false;
  }
  revealCell(r,c);
  checkWin();
}

function revealCell(r,c){
  const cell = cells[r][c];
  if(cell.revealed || cell.flagged) return;
  cell.revealed = true;
  refreshCell(cell);
  if(cell.isMine){
    // exploded
    cell.el.classList.add('exploded');
    endGame(false);
    return;
  }
  if(cell.neigh===0){
    const q=[cell];
    while(q.length){
      const cur=q.shift();
      for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
        const nr=cur.r+dr, nc=cur.c+dc;
        if(nr>=0 && nr<ROWS && nc>=0 && nc<COLS){
          const ncell = cells[nr][nc];
          if(!ncell.revealed && !ncell.flagged){
            ncell.revealed = true; refreshCell(ncell);
            if(ncell.neigh===0) q.push(ncell);
          }
        }
      }
    }
  }
}

function onRightClick(e){
  e.preventDefault();
  if(gameOver) return;
  const r = +this.dataset.row; const c = +this.dataset.col;
  const cell = cells[r][c];
  if(cell.revealed) return;
  cell.flagged = !cell.flagged;
  flags += cell.flagged ? 1 : -1;
  minesLeftEl.textContent = MINES - flags;
  refreshCell(cell);
}

function startTimer(){
  time = 0; timerEl.textContent = time;
  if(timer) clearInterval(timer);
  timer = setInterval(()=>{time++; timerEl.textContent = time;},1000);
}

function stopTimer(){ if(timer) { clearInterval(timer); timer=null; } }

function endGame(win){
  gameOver = true; stopTimer();
  // reveal all mines
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const cell = cells[r][c];
    if(cell.isMine) { cell.revealed = true; refreshCell(cell); }
  }
  statusEl.textContent = win ? `You win! Time: ${time}s` : 'Game Over';
  boardEl.style.pointerEvents = 'none';
  setFace(win ? 'win' : 'dead');
  if(win) triggerWinAnimation(); else triggerExplosionAnimation();
}

function checkWin(){
  let revealed=0;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++) if(cells[r][c].revealed) revealed++;
  if(revealed === ROWS*COLS - MINES){
    endGame(true);
  }
}

function applyDifficulty(level){
  if(level === 'beginner'){ ROWS=9; COLS=9; MINES=10; }
  else if(level === 'intermediate'){ ROWS=16; COLS=16; MINES=40; }
  else if(level === 'expert'){ ROWS=16; COLS=30; MINES=99; }
}

function resetGame(){
  stopTimer(); time=0; timerEl.textContent = 0;
  firstClick = true; gameOver=false; flags=0; statusEl.textContent='';
  minesLeftEl.textContent = MINES; setFace('default');
  createCells(); renderBoard(); boardEl.style.pointerEvents = '';
}

resetBtn.addEventListener('click', ()=>{ resetGame(); });
boardEl.addEventListener('contextmenu', (e)=>e.preventDefault());

// face interaction: pressed when mouse down on board
boardEl.addEventListener('mousedown', ()=>{ if(!gameOver) setFace('pressed'); });
boardEl.addEventListener('mouseup', ()=>{ if(!gameOver) setFace('default'); });
boardEl.addEventListener('mouseleave', ()=>{ if(!gameOver) setFace('default'); });

difficultyEl.addEventListener('change', ()=>{
  applyDifficulty(difficultyEl.value);
  resetGame();
});

// init
applyDifficulty(difficultyEl.value || 'beginner');
createCells(); renderBoard(); minesLeftEl.textContent = MINES;
