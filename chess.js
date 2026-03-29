// ============================================================
//  SORA NO HOSHI — Chess Module
//  Full 2-player local chess (all rules: castling, en passant, promotion)
// ============================================================

const SYM = { K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙', k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟' };
const isW  = p => p && p === p.toUpperCase();
const isB  = p => p && p !== p.toUpperCase();
const oob  = (r,c) => r<0||r>7||c<0||c>7;
const INIT = [
    ['r','n','b','q','k','b','n','r'],['p','p','p','p','p','p','p','p'],
    [null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null],
    ['P','P','P','P','P','P','P','P'],['R','N','B','Q','K','B','N','R'],
];

// ── Chess State ───────────────────────────────────────────────
let g = null; // game state
let sel = null, legal = [];

function newState() {
    return {
        board: INIT.map(r=>[...r]),
        turn: 'w',
        ep: null,          // en-passant square [r,c]
        castle: {wK:true,wQ:true,bK:true,bQ:true},
        status: 'playing', // 'playing'|'check'|'checkmate'|'stalemate'
        history: [],
        capW: [], capB: []  // pieces captured by white/black
    };
}

function clone(b){ return b.map(r=>[...r]); }

// ── Pseudo-legal moves (ignores leaving king in check) ────────
function pseudo(board, r, c, ep) {
    const p = board[r][c]; if (!p) return [];
    const white = isW(p), pt = p.toUpperCase(), moves = [];

    const push = (nr, nc) => {
        if (oob(nr,nc)) return false;
        const t = board[nr][nc];
        if (t && (white ? isW(t) : isB(t))) return false;
        moves.push([nr,nc]); return !t;
    };
    const slide = (dr,dc) => { for(let i=1;i<8;i++) if(!push(r+dr*i,c+dc*i)) break; };

    if (pt==='P') {
        const d = white?-1:1, s = white?6:1;
        if (!board[r+d]?.[c]) { moves.push([r+d,c]); if (r===s&&!board[r+d*2]?.[c]) moves.push([r+d*2,c]); }
        for (const dc of [-1,1]) {
            const t=board[r+d]?.[c+dc];
            if (t&&(white?isB(t):isW(t))) moves.push([r+d,c+dc]);
            if (ep&&ep[0]===r+d&&ep[1]===c+dc) moves.push([r+d,c+dc]);
        }
    } else if (pt==='N') {
        [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>push(r+dr,c+dc));
    } else if (pt==='B') {
        [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc])=>slide(dr,dc));
    } else if (pt==='R') {
        [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>slide(dr,dc));
    } else if (pt==='Q') {
        [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>slide(dr,dc));
    } else if (pt==='K') {
        [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>push(r+dr,c+dc));
    }
    return moves;
}

function inCheck(board, turn, ep) {
    const king = turn==='w'?'K':'k';
    let kr=-1,kc=-1;
    outer: for(let r=0;r<8;r++) for(let c=0;c<8;c++) if(board[r][c]===king){kr=r;kc=c;break outer;}
    if(kr<0) return false;
    for(let r=0;r<8;r++) for(let c=0;c<8;c++){
        const p=board[r][c]; if(!p) continue;
        if(turn==='w'?isW(p):isB(p)) continue;
        if(pseudo(board,r,c,ep).some(([mr,mc])=>mr===kr&&mc===kc)) return true;
    }
    return false;
}

function legalMoves(board, r, c, turn, ep, castle) {
    const p=board[r][c]; if(!p) return [];
    if((turn==='w')!==isW(p)) return [];
    const moves=[];
    for(const [nr,nc] of pseudo(board,r,c,ep)){
        const nb=clone(board); nb[nr][nc]=p; nb[r][c]=null;
        if(p.toUpperCase()==='P'&&nc!==c&&!board[nr][nc]) nb[r][nc]=null; // ep capture
        if(!inCheck(nb,turn,null)) moves.push([nr,nc]);
    }
    // Castling
    if(p.toUpperCase()==='K'&&!inCheck(board,turn,ep)){
        const row=turn==='w'?7:0;
        if(r===row&&c===4){
            // Kingside
            if((turn==='w'?castle.wK:castle.bK)&&!board[row][5]&&!board[row][6]){
                const b1=clone(board);b1[row][5]=p;b1[row][4]=null;
                const b2=clone(b1);b2[row][6]=p;b2[row][5]=null;
                if(!inCheck(b1,turn,null)&&!inCheck(b2,turn,null)) moves.push([row,6]);
            }
            // Queenside
            if((turn==='w'?castle.wQ:castle.bQ)&&!board[row][1]&&!board[row][2]&&!board[row][3]){
                const b1=clone(board);b1[row][3]=p;b1[row][4]=null;
                const b2=clone(b1);b2[row][2]=p;b2[row][3]=null;
                if(!inCheck(b1,turn,null)&&!inCheck(b2,turn,null)) moves.push([row,2]);
            }
        }
    }
    return moves;
}

function anyLegal(board, turn, ep, castle) {
    for(let r=0;r<8;r++) for(let c=0;c<8;c++){
        const p=board[r][c]; if(!p) continue;
        if((turn==='w')!==isW(p)) continue;
        if(legalMoves(board,r,c,turn,ep,castle).length>0) return true;
    }
    return false;
}

function applyMove(state, fr, fc, tr, tc) {
    const b=clone(state.board), p=b[fr][fc];
    const cap=b[tr][tc];
    const nc={...state.castle};
    let nep=null;

    b[tr][tc]=p; b[fr][fc]=null;

    // En passant capture
    if(p.toUpperCase()==='P'&&tc!==fc&&!cap) b[fr][tc]=null;
    // Double pawn push → set ep
    if(p.toUpperCase()==='P'&&Math.abs(tr-fr)===2) nep=[(fr+tr)/2,tc];
    // Castling rook move
    if(p==='K'){nc.wK=nc.wQ=false; if(tc===6){b[7][5]='R';b[7][7]=null;} if(tc===2){b[7][3]='R';b[7][0]=null;}}
    if(p==='k'){nc.bK=nc.bQ=false; if(tc===6){b[0][5]='r';b[0][7]=null;} if(tc===2){b[0][3]='r';b[0][0]=null;}}
    if(p==='R'){if(fr===7&&fc===0)nc.wQ=false; if(fr===7&&fc===7)nc.wK=false;}
    if(p==='r'){if(fr===0&&fc===0)nc.bQ=false; if(fr===0&&fc===7)nc.bK=false;}
    // Promotion (auto-queen)
    if(p==='P'&&tr===0) b[tr][tc]='Q';
    if(p==='p'&&tr===7) b[tr][tc]='q';

    const nturn=state.turn==='w'?'b':'w';
    const capPiece=cap||(p.toUpperCase()==='P'&&tc!==fc&&!cap?state.board[fr][tc]:null);
    if(capPiece){isW(capPiece)?state.capB.push(capPiece):state.capW.push(capPiece);}

    const newState={...state,board:b,turn:nturn,ep:nep,castle:nc,
        history:[...state.history,{fr,fc,tr,tc,p,cap:capPiece}]};

    const chk=inCheck(b,nturn,nep);
    const hasL=anyLegal(b,nturn,nep,nc);
    newState.status=!hasL?(chk?'checkmate':'stalemate'):(chk?'check':'playing');
    return newState;
}

// ── UI ────────────────────────────────────────────────────────
let p1='White', p2='Black', containerId='chess-container';

export function initChess(cId, whitePlayer, blackPlayer) {
    containerId=cId||'chess-container';
    p1=whitePlayer||'White'; p2=blackPlayer||'Black';
    g=newState(); sel=null; legal=[];
    renderAll();
}

window.chessNewGame = () => { g=newState(); sel=null; legal=[]; renderAll(); };

function renderAll() {
    const el=document.getElementById(containerId); if(!el) return;
    el.innerHTML=`
    <div class="chess-wrap">
      <div class="chess-top-bar">
        <div class="chess-player-bar ${g.turn==='b'?'active-player':''}">
          <span class="ch-sym">♟</span><span id="ch-p2">${p2}</span><span class="ch-label">Black</span>
          <span class="ch-caps" id="ch-caps-w">${g.capW.map(p=>`<i>${SYM[p]||p}</i>`).join('')}</span>
        </div>
      </div>
      <div class="chess-board-row">
        <div class="chess-ranks">${[8,7,6,5,4,3,2,1].map(n=>`<span>${n}</span>`).join('')}</div>
        <div class="chess-board" id="chess-board"></div>
      </div>
      <div class="chess-files"><span></span>${'abcdefgh'.split('').map(f=>`<span>${f}</span>`).join('')}</div>
      <div class="chess-bottom-bar">
        <div class="chess-player-bar ${g.turn==='w'?'active-player':''}">
          <span class="ch-sym">♙</span><span id="ch-p1">${p1}</span><span class="ch-label">White</span>
          <span class="ch-caps" id="ch-caps-b">${g.capB.map(p=>`<i>${SYM[p]||p}</i>`).join('')}</span>
        </div>
        <button class="chess-new-btn" onclick="chessNewGame()">↺ New</button>
      </div>
      <div class="chess-status" id="chess-status"></div>
    </div>`;
    renderBoard();
    renderStatus();
}

function renderBoard() {
    const bd=document.getElementById('chess-board'); if(!bd) return;
    bd.innerHTML='';
    for(let r=0;r<8;r++) for(let c=0;c<8;c++){
        const sq=document.createElement('div');
        sq.className='ch-sq '+((r+c)%2===0?'ch-light':'ch-dark');
        if(sel&&sel[0]===r&&sel[1]===c) sq.classList.add('ch-sel');
        if(legal.some(([lr,lc])=>lr===r&&lc===c))
            sq.classList.add(g.board[r][c]?'ch-cap':'ch-legal');
        const p=g.board[r][c];
        if(p){ const s=document.createElement('span'); s.className='ch-piece '+(isW(p)?'ch-wp':'ch-bp'); s.textContent=SYM[p]||p; sq.appendChild(s); }
        sq.addEventListener('click',()=>handleClick(r,c));
        bd.appendChild(sq);
    }
}

function handleClick(r,c) {
    if(g.status==='checkmate'||g.status==='stalemate') return;
    // If a legal move is selected, apply it
    if(sel&&legal.some(([lr,lc])=>lr===r&&lc===c)){
        g=applyMove(g,sel[0],sel[1],r,c);
        sel=null; legal=[]; renderAll(); return;
    }
    const p=g.board[r][c];
    if(p&&((g.turn==='w')===isW(p))){
        sel=[r,c]; legal=legalMoves(g.board,r,c,g.turn,g.ep,g.castle);
    } else { sel=null; legal=[]; }
    renderBoard(); renderStatus();
}

function renderStatus() {
    const el=document.getElementById('chess-status'); if(!el) return;
    const who=g.turn==='w'?p1:p2;
    const map={checkmate:`♚ Checkmate! ${g.turn==='w'?p2:p1} wins!`,stalemate:'½ Stalemate — Draw',check:`⚠ ${who} is in Check`,playing:`${who}'s turn`};
    el.textContent=map[g.status]||'';
    el.className='chess-status '+(g.status==='checkmate'?'ch-end':(g.status==='check'?'ch-check':''));
}
