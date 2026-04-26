/**
 * TETRIS GAME - Retro Arcade Collection
 */
class TetrisGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cols = 10;
        this.rows = 20;
        this.blockSize = 23;
        this.offsetX = 0;
        this.offsetY = 60;
        this.board = [];
        this.pieces = [];
        this.currentPiece = null;
        this.nextPiece = null;
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.gameStarted = false;
        this.gameOver = false;
        this.highScore = parseInt(localStorage.getItem('tetris_highscore')) || 0;
        this.dropInterval = 800;
        this.lastDrop = 0;
        this.colors = {
            I: '#00f0f0',
            O: '#f0f000',
            T: '#a000f0',
            S: '#00f000',
            Z: '#f00000',
            J: '#0000f0',
            L: '#f0a000'
        };
        this.shapes = {
            I: [[0,0],[1,0],[2,0],[3,0]],
            O: [[0,0],[1,0],[0,1],[1,1]],
            T: [[0,0],[1,0],[2,0],[1,1]],
            S: [[1,0],[2,0],[0,1],[1,1]],
            Z: [[0,0],[1,0],[1,1],[2,1]],
            J: [[0,0],[0,1],[1,1],[2,1]],
            L: [[2,0],[0,1],[1,1],[2,1]]
        };
        this.pieceNames = Object.keys(this.shapes);
        // Sound
        this.lastDropSoundTime = 0;
        this.lastMoveSoundTime = 0;
        this.lastRotateSoundTime = 0;
        this.bag = [];
        this.holdPiece = null;
        this.canHold = true;
    }

    init() {
        // Fixed internal resolution
        this.canvas.width = 680;
        this.canvas.height = 620;
        
        // Horizontal centering: (Canvas width - (Grid width + Side panel margin + Side panel width)) / 2
        // Let's assume side panel is roughly 200px including margins
        const totalWidth = this.cols * this.blockSize + 220; 
        this.offsetX = Math.floor((this.canvas.width - totalWidth) / 2) + 20;
        this.offsetY = 30;
        this.reset();
    }

    reset() {
        this.rows = 20;
        this.board = Array.from({length: this.rows}, () => Array(this.cols).fill(0));
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.gameStarted = false;
        this.gameOver = false;
        this.dropInterval = 800;
        this.bag = [];
        this.holdPiece = null;
        this.canHold = true;
        this.spawnPiece();
    }

    getNextFromBag() {
        if (this.bag.length === 0) {
            this.bag = [...this.pieceNames];
            for (let i = this.bag.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
            }
        }
        return this.bag.pop();
    }

    spawnPiece(pieceName = null) {
        const name = pieceName || this.getNextFromBag();
        this.currentPiece = {
            name: name,
            blocks: this.shapes[name].map(b => [...b]),
            x: Math.floor(this.cols / 2) - 1,
            y: 0,
            color: this.colors[name]
        };
        // Generate next piece if we're not just swapping from hold
        if (!pieceName) {
            const nextName = this.getNextFromBag();
            this.nextPiece = {
                name: nextName,
                blocks: this.shapes[nextName].map(b => [...b]),
                color: this.colors[nextName]
            };
        }
        this.canHold = true;
        // Check game over
        if (this.collide(this.currentPiece.x, this.currentPiece.y, this.currentPiece.blocks)) {
            this.gameOver = true;
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('tetris_highscore', this.highScore);
            }
        }
    }

    collide(x, y, blocks) {
        return blocks.some(([bx, by]) => {
            const nx = x + bx;
            const ny = y + by;
            // Check walls
            if (nx < 0 || nx >= this.cols) return true;
            // Check bottom
            if (ny >= this.rows) return true;
            // Check board only for cells that are on the board
            if (ny >= 0 && this.board[ny] && this.board[ny][nx]) return true;
            return false;
        });
    }

    rotate(piece) {
        const rotated = piece.blocks.map(([x, y]) => [-y, x]);
        // Wall Kick System (Basic SRS)
        const kicks = [0, 1, -1, 2, -2];
        for (let dx of kicks) {
            if (!this.collide(piece.x + dx, piece.y, rotated)) {
                piece.x += dx;
                return rotated;
            }
        }
        return null; // Rotation failed
    }

    lockPiece() {
        // Lock the current piece to the board
        this.currentPiece.blocks.forEach(([bx, by]) => {
            const y = this.currentPiece.y + by;
            const x = this.currentPiece.x + bx;
            if (y >= 0 && y < this.rows && x >= 0 && x < this.cols) {
                this.board[y][x] = this.currentPiece.color;
            }
        });
        this.clearLines();
        this.spawnPiece();
    }

    clearLines() {
        let cleared = 0;
        this.board = this.board.filter(row => {
            if (row.every(cell => cell !== 0)) {
                cleared++;
                return false;
            }
            return true;
        });
        // Add empty rows at top to maintain height
        while (this.board.length < this.rows) {
            this.board.unshift(Array(this.cols).fill(0));
        }
        
        this.lines += cleared;
        const points = [0, 100, 300, 500, 800];
        this.score += (points[cleared] || 0) * this.level;
        this.level = Math.floor(this.lines / 10) + 1;
        this.dropInterval = Math.max(100, 800 - (this.level - 1) * 70);
        
        // Play line clear sound
        const now = Date.now();
        if (cleared >= 4) {
            if (now - this.lastDropSoundTime > 500) {
                retroSounds.playTetris();
                this.lastDropSoundTime = now;
            }
        } else if (cleared >= 2) {
            if (now - this.lastDropSoundTime > 500) {
                retroSounds.playLineClear();
                this.lastDropSoundTime = now;
            }
        }
    }

    getGhostPosition() {
        let ghostY = this.currentPiece.y;
        while (!this.collide(this.currentPiece.x, ghostY + 1, this.currentPiece.blocks)) {
            ghostY++;
        }
        return ghostY;
    }

    update(timestamp) {
        if (!this.gameStarted || this.gameOver || !this.currentPiece) return;

        // Initialize lastDrop on first update call
        if (this.lastDrop === 0) {
            this.lastDrop = timestamp;
        }

        if (timestamp - this.lastDrop > this.dropInterval) {
            this.lastDrop = timestamp;
            if (!this.collide(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.blocks)) {
                this.currentPiece.y++;
            } else {
                // Piece has landed
                const now = Date.now();
                if (now - this.lastDropSoundTime > 100) {
                    retroSounds.playLock();
                    this.lastDropSoundTime = now;
                }
                this.lockPiece();
            }
        }
    }

    move(dx, dy) {
        if (!this.currentPiece || this.gameOver) return false;
        if (!this.collide(this.currentPiece.x + dx, this.currentPiece.y + dy, this.currentPiece.blocks)) {
            this.currentPiece.x += dx;
            this.currentPiece.y += dy;
            return true;
        }
        return false;
    }

    hardDrop() {
        if (!this.currentPiece || this.gameOver) return;
        while (!this.collide(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.blocks)) {
            this.currentPiece.y++;
            this.score += 2;
        }
        const now = Date.now();
        if (now - this.lastDropSoundTime > 100) {
            retroSounds.playHardDropTetris();
            this.lastDropSoundTime = now;
        }
        this.lockPiece();
    }

    hold() {
        if (!this.canHold || this.gameOver || !this.currentPiece) return;
        const currentName = this.currentPiece.name;
        if (this.holdPiece) {
            const nextName = this.holdPiece;
            this.holdPiece = currentName;
            this.spawnPiece(nextName);
        } else {
            this.holdPiece = currentName;
            this.spawnPiece(this.nextPiece.name);
        }
        this.canHold = false;
        if (typeof retroSounds !== 'undefined') retroSounds.playRotate(); 
    }

    draw() {
        const ctx = this.ctx;
        const bs = this.blockSize;

        // Background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Game board background
        ctx.fillStyle = '#111';
        ctx.fillRect(this.offsetX, this.offsetY, this.cols * bs, this.rows * bs);

        // Grid lines
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= this.cols; x++) {
            ctx.beginPath();
            ctx.moveTo(this.offsetX + x * bs, this.offsetY);
            ctx.lineTo(this.offsetX + x * bs, this.offsetY + this.rows * bs);
            ctx.stroke();
        }
        for (let y = 0; y <= this.rows; y++) {
            ctx.beginPath();
            ctx.moveTo(this.offsetX, this.offsetY + y * bs);
            ctx.lineTo(this.offsetX + this.cols * bs, this.offsetY + y * bs);
            ctx.stroke();
        }

        // Board
        this.board.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell && y < this.rows) { // Strict row check
                    ctx.fillStyle = cell;
                    ctx.shadowColor = cell;
                    ctx.shadowBlur = 5;
                    ctx.fillRect(this.offsetX + x * bs + 1, this.offsetY + y * bs + 1, bs - 2, bs - 2);
                    ctx.shadowBlur = 0;
                }
            });
        });

        // Ghost piece
        if (this.currentPiece) {
            const ghostY = this.getGhostPosition();
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            this.currentPiece.blocks.forEach(([bx, by]) => {
                const gy = ghostY + by;
                if (gy < this.rows) {
                    const gx = this.offsetX + (this.currentPiece.x + bx) * bs;
                    const py = this.offsetY + gy * bs;
                    ctx.strokeRect(gx + 1, py + 1, bs - 2, bs - 2);
                }
            });
        }

        // Current piece
        if (this.currentPiece) {
            ctx.fillStyle = this.currentPiece.color;
            ctx.shadowColor = this.currentPiece.color;
            ctx.shadowBlur = 10;
            this.currentPiece.blocks.forEach(([bx, by]) => {
                const py_idx = this.currentPiece.y + by;
                if (py_idx < this.rows) {
                    const px = this.offsetX + (this.currentPiece.x + bx) * bs;
                    const py = this.offsetY + py_idx * bs;
                    ctx.fillRect(px + 1, py + 1, bs - 2, bs - 2);
                }
            });
            ctx.shadowBlur = 0;
        }

        // Side panel
        const panelX = this.offsetX + this.cols * bs + 30;
        
        ctx.textAlign = 'left';
        ctx.fillStyle = '#0ff';
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText('SCORE', panelX, this.offsetY + 40);
        ctx.fillStyle = '#0f0';
        ctx.font = '14px "Press Start 2P"';
        ctx.fillText(this.score.toString().padStart(8, '0'), panelX, this.offsetY + 65);

        ctx.fillStyle = '#0ff';
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText('LEVEL', panelX, this.offsetY + 110);
        ctx.fillStyle = '#ff0';
        ctx.font = '14px "Press Start 2P"';
        ctx.fillText(this.level.toString(), panelX, this.offsetY + 135);

        ctx.fillStyle = '#0ff';
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText('LINES', panelX, this.offsetY + 180);
        ctx.fillStyle = '#f0f';
        ctx.font = '14px "Press Start 2P"';
        ctx.fillText(this.lines.toString(), panelX, this.offsetY + 205);

        ctx.fillStyle = '#0ff';
        ctx.font = '10px "Press Start 2P"';
        ctx.fillText('HIGH SCORE', panelX, this.offsetY + 260);
        ctx.fillStyle = '#0f0';
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText(this.highScore.toString().padStart(8, '0'), panelX, this.offsetY + 285);

        ctx.fillStyle = '#0ff';
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText('NEXT', panelX, this.offsetY + 330);

        if (this.nextPiece) {
            const previewBlockSize = 18;
            const previewStartX = panelX;
            const previewStartY = this.offsetY + 350;
            ctx.fillStyle = '#111';
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.fillRect(previewStartX - 5, previewStartY - 5, 80, 80);
            ctx.strokeRect(previewStartX - 5, previewStartY - 5, 80, 80);

            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            this.nextPiece.blocks.forEach(([x, y]) => {
                minX = Math.min(minX, x); maxX = Math.max(maxX, x);
                minY = Math.min(minY, y); maxY = Math.max(maxY, y);
            });
            const pieceW = (maxX - minX + 1) * previewBlockSize;
            const pieceH = (maxY - minY + 1) * previewBlockSize;
            const offsetX = (80 - pieceW) / 2 - previewStartX + 5;
            const offsetY = (80 - pieceH) / 2 - previewStartY + 5;

            ctx.fillStyle = this.nextPiece.color;
            ctx.shadowColor = this.nextPiece.color;
            ctx.shadowBlur = 8;
            this.nextPiece.blocks.forEach(([bx, by]) => {
                const px = previewStartX + offsetX + (bx - minX) * previewBlockSize;
                const py = previewStartY + offsetY + (by - minY) * previewBlockSize;
                ctx.fillRect(px, py, previewBlockSize - 1, previewBlockSize - 1);
            });
            ctx.shadowBlur = 0;
        }

        // Hold Piece
        ctx.fillStyle = '#0ff';
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText('HOLD', panelX, this.offsetY + 460);

        if (this.holdPiece) {
            const previewBlockSize = 18;
            const previewStartX = panelX;
            const previewStartY = this.offsetY + 480;
            ctx.fillStyle = '#111';
            ctx.fillRect(previewStartX - 5, previewStartY - 5, 80, 80);
            ctx.strokeRect(previewStartX - 5, previewStartY - 5, 80, 80);

            const name = this.holdPiece;
            const blocks = this.shapes[name];
            ctx.fillStyle = this.colors[name];
            ctx.shadowColor = this.colors[name];
            ctx.shadowBlur = 8;
            blocks.forEach(([bx, by]) => {
                ctx.fillRect(previewStartX + bx * previewBlockSize + 10, previewStartY + by * previewBlockSize + 15, previewBlockSize - 1, previewBlockSize - 1);
            });
            ctx.shadowBlur = 0;
        }

        // Controls
        ctx.fillStyle = '#555';
        ctx.font = '8px "Courier New"';
        const controls = [
            '← → : Move',
            '↑ : Rotate',
            '↓ : Soft Drop',
            'C : Hold',
            'Space : Hard Drop',
            'Enter : Start'
        ];
        controls.forEach((text, i) => {
            ctx.fillText(text, this.offsetX, this.offsetY + this.rows * bs + 25 + i * 14);
        });

        if (!this.gameStarted && !this.gameOver) {
            ctx.fillStyle = '#0f0';
            ctx.font = '16px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('PRESS ENTER', this.offsetX + this.cols * bs / 2, this.offsetY + this.rows * bs / 2);
        }

        if (this.gameOver) {
            ctx.fillStyle = '#f00';
            ctx.font = '24px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', this.offsetX + this.cols * bs / 2, this.offsetY + this.rows * bs / 2 - 20);
        }
        ctx.textAlign = 'left';
    }

    handleKeyDown(e) {
        if (!this.currentPiece) return;
        const now = Date.now();
        
        switch (e.key) {
            case 'ArrowLeft': case 'a': case 'A':
                if (this.move(-1, 0)) {
                    if (now - this.lastMoveSoundTime > 80) {
                        retroSounds.playMove();
                        this.lastMoveSoundTime = now;
                    }
                }
                e.preventDefault(); break;
            case 'ArrowRight': case 'd': case 'D':
                if (this.move(1, 0)) {
                    if (now - this.lastMoveSoundTime > 80) {
                        retroSounds.playMove();
                        this.lastMoveSoundTime = now;
                    }
                }
                e.preventDefault(); break;
            case 'ArrowDown': case 's': case 'S':
                if (this.move(0, 1)) {
                    this.score += 1;
                    if (now - this.lastDropSoundTime > 100) {
                        retroSounds.playSoftDrop();
                        this.lastDropSoundTime = now;
                    }
                }
                e.preventDefault(); break;
            case 'ArrowUp': case 'w': case 'W':
                const rotated = this.rotate(this.currentPiece);
                if (rotated) {
                    this.currentPiece.blocks = rotated;
                    if (now - this.lastRotateSoundTime > 80) {
                        retroSounds.playRotate();
                        this.lastRotateSoundTime = now;
                    }
                }
                e.preventDefault(); break;
            case 'c': case 'C':
                this.hold();
                e.preventDefault(); break;
            case ' ':
                this.hardDrop();
                e.preventDefault(); break;
            case 'Enter':
                if (this.gameOver) {
                    this.reset();
                    e.preventDefault();
                    break;
                }
                if (!this.gameStarted) {
                    this.gameStarted = true;
                    retroSounds.init();
                    retroSounds.playStart();
                }
                e.preventDefault(); break;
        }
    }

}