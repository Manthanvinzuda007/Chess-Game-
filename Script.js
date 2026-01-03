 /**
         * GAME STATE (Single Source of Truth)
         */
        let gameState = {
            board: [],
            currentTurn: 'white', // white = gold, black = black
            selected: null,
            validMoves: [],
            gameOver: false,
            mode: 'friend'
        };

        const PIECES = {
            white: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
            black: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
        };

        /**
         * INITIALIZATION
         */
        function initBoard() {
            const startBoard = [
                ['br', 'bn', 'bb', 'bq', 'bk', 'bb', 'bn', 'br'],
                ['bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp'],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                ['wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp'],
                ['wr', 'wn', 'wb', 'wq', 'wk', 'wb', 'wn', 'wr']
            ];
            gameState.board = startBoard;
            gameState.currentTurn = 'white';
            gameState.selected = null;
            gameState.validMoves = [];
            gameState.gameOver = false;
            document.getElementById('game-over-msg').classList.add('hidden');
            render();
        }

        /**
         * MOVE LOGIC
         */
        function getValidMoves(r, c, board, checkKingSafety = true) {
            const piece = board[r][c];
            if (!piece) return [];
            const color = piece[0];
            const type = piece[1];
            let moves = [];

            const isEnemy = (nr, nc) => board[nr][nc] && board[nr][nc][0] !== color;
            const isEmpty = (nr, nc) => !board[nr][nc];
            const onBoard = (nr, nc) => nr >= 0 && nr < 8 && nc >= 0 && nc < 8;

            if (type === 'p') {
                const dir = color === 'w' ? -1 : 1;
                // Forward
                if (onBoard(r + dir, c) && isEmpty(r + dir, c)) {
                    moves.push({ r: r + dir, c: c });
                    const startRow = color === 'w' ? 6 : 1;
                    if (r === startRow && isEmpty(r + 2 * dir, c)) {
                        moves.push({ r: r + 2 * dir, c: c });
                    }
                }
                // Captures
                for (let dc of [-1, 1]) {
                    if (onBoard(r + dir, c + dc) && isEnemy(r + dir, c + dc)) {
                        moves.push({ r: r + dir, c: c + dc });
                    }
                }
            } else if (type === 'r' || type === 'b' || type === 'q') {
                const dirs = [];
                if (type === 'r' || type === 'q') dirs.push([0, 1], [0, -1], [1, 0], [-1, 0]);
                if (type === 'b' || type === 'q') dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
                
                dirs.forEach(d => {
                    for (let i = 1; i < 8; i++) {
                        const nr = r + d[0] * i, nc = c + d[1] * i;
                        if (!onBoard(nr, nc)) break;
                        if (isEmpty(nr, nc)) {
                            moves.push({ r: nr, c: nc });
                        } else {
                            if (isEnemy(nr, nc)) moves.push({ r: nr, c: nc });
                            break;
                        }
                    }
                });
            } else if (type === 'n') {
                const nMoves = [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];
                nMoves.forEach(m => {
                    const nr = r + m[0], nc = c + m[1];
                    if (onBoard(nr, nc) && (isEmpty(nr, nc) || isEnemy(nr, nc))) {
                        moves.push({ r: nr, c: nc });
                    }
                });
            } else if (type === 'k') {
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;
                        const nr = r + dr, nc = c + dc;
                        if (onBoard(nr, nc) && (isEmpty(nr, nc) || isEnemy(nr, nc))) {
                            moves.push({ r: nr, c: nc });
                        }
                    }
                }
            }

            // King Safety Check
            if (checkKingSafety) {
                return moves.filter(m => {
                    const nextBoard = board.map(row => [...row]);
                    nextBoard[m.r][m.c] = nextBoard[r][c];
                    nextBoard[r][c] = null;
                    return !isCheck(color, nextBoard);
                });
            }
            return moves;
        }

        function isCheck(color, board) {
            let kingPos = null;
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    if (board[r][c] === color + 'k') { kingPos = { r, c }; break; }
                }
                if (kingPos) break;
            }
            if (!kingPos) return true;

            const enemyColor = color === 'w' ? 'b' : 'w';
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    if (board[r][c] && board[r][c][0] === enemyColor) {
                        const moves = getValidMoves(r, c, board, false);
                        if (moves.some(m => m.r === kingPos.r && m.c === kingPos.c)) return true;
                    }
                }
            }
            return false;
        }

        /**
         * INTERACTION HANDLING
         */
        function handleSquareClick(r, c) {
            if (gameState.gameOver) return;
            if (gameState.mode === 'ai' && gameState.currentTurn === 'black') return;

            const piece = gameState.board[r][c];
            const colorPrefix = gameState.currentTurn[0];

            // Select piece
            if (piece && piece[0] === colorPrefix) {
                gameState.selected = { r, c };
                gameState.validMoves = getValidMoves(r, c, gameState.board);
                console.log(`[Game] Selected ${piece} at ${r},${c}. Valid moves: ${gameState.validMoves.length}`);
                render();
            } 
            // Move piece
            else if (gameState.selected) {
                const move = gameState.validMoves.find(m => m.r === r && m.c === c);
                if (move) {
                    executeMove(gameState.selected.r, gameState.selected.c, r, c);
                } else {
                    gameState.selected = null;
                    gameState.validMoves = [];
                    render();
                }
            }
        }

        function executeMove(fr, fc, tr, tc) {
            gameState.board[tr][tc] = gameState.board[fr][fc];
            gameState.board[fr][fc] = null;
            gameState.selected = null;
            gameState.validMoves = [];
            
            gameState.currentTurn = gameState.currentTurn === 'white' ? 'black' : 'white';
            console.log(`[Game] Turn switched to ${gameState.currentTurn}`);

            checkWinCondition();
            render();

            if (!gameState.gameOver && gameState.mode === 'ai' && gameState.currentTurn === 'black') {
                const delay = 300 + Math.random() * 200;
                setTimeout(aiMove, delay);
            }
        }

        function checkWinCondition() {
            const colorPrefix = gameState.currentTurn[0];
            let anyMoves = false;
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    if (gameState.board[r][c] && gameState.board[r][c][0] === colorPrefix) {
                        if (getValidMoves(r, c, gameState.board).length > 0) {
                            anyMoves = true; break;
                        }
                    }
                }
                if (anyMoves) break;
            }

            if (!anyMoves) {
                gameState.gameOver = true;
                const winner = gameState.currentTurn === 'white' ? "Black" : "Gold";
                const checkmate = isCheck(colorPrefix, gameState.board);
                const msg = checkmate ? `CHECKMATE! ${winner} WINS.` : "STALEMATE! DRAW.";
                const msgEl = document.getElementById('game-over-msg');
                msgEl.innerText = msg;
                msgEl.classList.remove('hidden');
            }
        }

        /**
         * AI LOGIC (Easy)
         */
        function aiMove() {
            if (gameState.gameOver) return;
            const blackMoves = [];
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    if (gameState.board[r][c] && gameState.board[r][c][0] === 'b') {
                        const moves = getValidMoves(r, c, gameState.board);
                        moves.forEach(m => blackMoves.push({ fr: r, fc: c, tr: m.r, tc: m.c }));
                    }
                }
            }

            if (blackMoves.length > 0) {
                const random = blackMoves[Math.floor(Math.random() * blackMoves.length)];
                executeMove(random.fr, random.fc, random.tr, random.tc);
            }
        }

        /**
         * UI RENDERING
         */
        function render() {
            const boardEl = document.getElementById('board');
            boardEl.innerHTML = '';

            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const square = document.createElement('div');
                    square.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
                    
                    const pieceCode = gameState.board[r][c];
                    if (pieceCode) {
                        const colorClass = pieceCode[0] === 'w' ? 'white' : 'black';
                        const type = pieceCode[1];
                        const span = document.createElement('span');
                        span.className = `piece ${colorClass}`;
                        span.innerText = PIECES[colorClass === 'white' ? 'white' : 'black'][type];
                        square.appendChild(span);

                        if (!gameState.gameOver && pieceCode[0] === gameState.currentTurn[0]) {
                            square.classList.add('selectable');
                        }
                    }

                    if (gameState.selected && gameState.selected.r === r && gameState.selected.c === c) {
                        square.classList.add('selected');
                    }

                    const move = gameState.validMoves.find(m => m.r === r && m.c === c);
                    if (move) {
                        const isCapture = gameState.board[r][c] !== null;
                        const hint = document.createElement('div');
                        hint.className = isCapture ? 'hint-capture' : 'hint-dot';
                        square.appendChild(hint);
                        square.classList.add('selectable');
                    }

                    square.onclick = () => handleSquareClick(r, c);
                    boardEl.appendChild(square);
                }
            }

            const turnDisplay = document.getElementById('status');
            turnDisplay.innerText = `${gameState.currentTurn === 'white' ? "Gold" : "Black"}'s Turn`;
        }

        function setMode(mode) {
            gameState.mode = mode;
            document.getElementById('btn-friend').classList.toggle('active', mode === 'friend');
            document.getElementById('btn-ai').classList.toggle('active', mode === 'ai');
            resetGame();
        }

        function resetGame() {
            initBoard();
        }

        // Start
        initBoard();
