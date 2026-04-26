/**
 * MINESWEEPER GAME - Retro Arcade Collection
 */
class MinesweeperGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cols = 12;
        this.rows = 12;
        this.mineCount = 18;
        this.cellSize = 38;
        this.offsetX = 0;
        this.offsetY = 0;
        this.board = [];
        this.revealed = [];
        this.flagged = [];
        this.score = 0;
        this.gameStarted = false;
        this.gameOver = false;
        this.gameWon = false;
        this.firstClick = true;
        this.timer = 0;
        this.highScore = parseInt(localStorage.getItem('minesweeper_highscore')) || 0;
        this.hoveredCell = null;
        this.flagsUsed = 0;
        // Sound
        this.lastRevealSoundTime = 0;
    }

    init() {
        this.canvas.width = 520;
        this.canvas.height = 580;
        this.offsetX = (this.canvas.width - this.cols * this.cellSize) / 2;
        this.offsetY = 80;
        this.reset();
    }

    reset() {
        this.board = Array.from({length: this.rows}, () => Array(this.cols).fill(0));
        this.revealed = Array.from({length: this.rows}, () => Array(this.cols).fill(false));
        this.flagged = Array.from({length: this.rows}, () => Array(this.cols).fill(false));
        this.score = 0;
        this.gameStarted = false;
        this.gameOver = false;
        this.gameWon = false;
        this.firstClick = true;
        this.timer = 0;
        this.flagsUsed = 0;
        this.hoveredCell = null;
    }

    placeMines(excludeRow, excludeCol) {
        let placed = 0;
        const exclude = new Set();
        for (let r = Math.max(0, excludeRow - 1); r <= Math.min(this.rows - 1, excludeRow + 1); r++) {
            for (let c = Math.max(0, excludeCol - 1); c <= Math.min(this.cols - 1, excludeCol + 1); c++) {
                exclude.add(`${r},${c}`);
            }
        }
        while (placed < this.mineCount) {
            const r = Math.floor(Math.random() * this.rows);
            const c = Math.floor(Math.random() * this.cols);
            if (this.board[r][c] !== -1 && !exclude.has(`${r},${c}`)) {
                this.board[r][c] = -1;
                placed++;
            }
        }
        // Calculate numbers
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c] === -1) continue;
                let count = 0;
                this.getNeighbors(r, c).forEach(([nr, nc]) => {
                    if (this.board[nr][nc] === -1) count++;
                });
                this.board[r][c] = count;
            }
        }
    }

    getNeighbors(row, col) {
        const neighbors = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = row + dr;
                const nc = col + dc;
                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                    neighbors.push([nr, nc]);
                }
            }
        }
        return neighbors;
    }

    reveal(row, col) {
        if (this.gameOver || this.gameWon || this.flagged[row][col] || this.revealed[row][col]) return;

        if (this.firstClick) {
            this.firstClick = false;
            this.gameStarted = true;
            this.placeMines(row, col);
            this.startTimer();
        }

        if (this.board[row][col] === -1) {
            this.gameOver = true;
            this.stopTimer();
            this.revealAllMines();
            retroSounds.playMineExplode();
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('minesweeper_highscore', this.highScore);
            }
            return;
        }

        // Flood fill for empty cells
        const stack = [[row, col]];
        while (stack.length > 0) {
            const [r, c] = stack.pop();
            if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) continue;
            if (this.revealed[r][c] || this.flagged[r][c]) continue;

            this.revealed[r][c] = true;
            const now = Date.now();
            if (this.board[r][c] === 0) {
                // Play reveal sound for empty cells (throttled)
                if (now - this.lastRevealSoundTime > 80) {
                    retroSounds.playReveal();
                    this.lastRevealSoundTime = now;
                }
                this.getNeighbors(r, c).forEach(([nr, nc]) => {
                    if (!this.revealed[nr][nc] && !this.flagged[nr][nc]) {
                        stack.push([nr, nc]);
                    }
                });
            }
        }
        this.score = Math.max(0, 1000 - this.timer * 2);
        this.checkWin();
    }

    revealAllMines() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c] === -1) {
                    this.revealed[r][c] = true;
                }
            }
        }
    }

    checkWin() {
        let unrevealedSafe = 0;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.board[r][c] === -1 && !this.revealed[r][c]) {
                    unrevealedSafe++;
                }
            }
        }
        if (unrevealedSafe === 0) {
            this.gameWon = true;
            this.gameOver = true;
            this.stopTimer();
            this.score = Math.max(1000 - this.timer * 2, 500);
            retroSounds.playWinMinesweeper();
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('minesweeper_highscore', this.highScore);
            }
        }
    }

    toggleFlag(row, col) {
        if (this.gameOver || this.gameWon || !this.gameStarted || this.revealed[row][col]) return;
        if (!this.flagged[row][col]) {
            // Check if enough cells revealed
            let revealedCount = 0;
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    if (this.revealed[r][c]) revealedCount++;
                }
            }
            if (revealedCount === 0) return;
            this.flagged[row][col] = true;
            this.flagsUsed++;
            retroSounds.playFlag();
        } else {
            this.flagged[row][col] = false;
            this.flagsUsed--;
        }
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (!this.gameOver && !this.gameWon) {
                this.timer++;
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    getCellFromMouse(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const col = Math.floor((x - this.offsetX) / this.cellSize);
        const row = Math.floor((y - this.offsetY) / this.cellSize);
        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
            return [row, col];
        }
        return null;
    }

    draw() {
        const ctx = this.ctx;

        // Background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Header bar
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(this.offsetX - 10, this.offsetY - 45, this.cols * this.cellSize + 20, 40);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.offsetX - 10, this.offsetY - 45, this.cols * this.cellSize + 20, 40);

        // Timer
        ctx.fillStyle = '#f00';
        ctx.font = '16px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(`⏱ ${this.timer.toString().padStart(3, '0')}`, this.offsetX, this.offsetY - 18);

        // Mines remaining
        ctx.fillStyle = '#ff0';
        ctx.textAlign = 'center';
        ctx.fillText(`💣 ${this.mineCount - this.flagsUsed}`, this.offsetX + (this.cols * this.cellSize) / 2, this.offsetY - 18);

        // Reset button (Custom drawn face)
        const btnX = this.offsetX + this.cols * this.cellSize - 15;
        const btnY = this.offsetY - 25;
        ctx.fillStyle = '#ff0';
        ctx.beginPath(); ctx.arc(btnX, btnY, 12, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(btnX - 4, btnY - 3, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(btnX + 4, btnY - 3, 1.5, 0, Math.PI * 2); ctx.fill();
        // Mouth
        ctx.beginPath();
        if (this.gameOver && !this.gameWon) {
            ctx.arc(btnX, btnY + 5, 5, Math.PI, 0); // Frown
        } else if (this.gameWon) {
            ctx.arc(btnX, btnY + 2, 5, 0, Math.PI); // Smile
            // Sunglasses
            ctx.fillStyle = '#000';
            ctx.fillRect(btnX - 7, btnY - 5, 14, 4);
        } else {
            ctx.arc(btnX, btnY + 2, 5, 0, Math.PI); // Smile
        }
        ctx.stroke();

        // Draw cells
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const x = this.offsetX + c * this.cellSize;
                const y = this.offsetY + r * this.cellSize;
                const isHovered = this.hoveredCell && this.hoveredCell[0] === r && this.hoveredCell[1] === c;

                if (this.revealed[r][c]) {
                    // Revealed cell
                    if (this.board[r][c] === -1) {
                        ctx.fillStyle = '#f00';
                    } else if (this.board[r][c] === 0) {
                        ctx.fillStyle = '#0a0a1a';
                    } else {
                        ctx.fillStyle = '#111128';
                    }
                    ctx.fillRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2);

                    if (this.board[r][c] === -1) {
                        ctx.fillStyle = '#fff';
                        ctx.font = '20px "Courier New"';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('💣', x + this.cellSize / 2, y + this.cellSize / 2);
                    } else if (this.board[r][c] > 0) {
                        const colors = ['', '#0ff', '#0f0', '#f00', '#00f', '#f80', '#08f', '#000', '#888'];
                        ctx.fillStyle = colors[this.board[r][c]] || '#fff';
                        ctx.font = `bold ${this.cellSize - 12}px "Press Start 2P"`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(this.board[r][c], x + this.cellSize / 2, y + this.cellSize / 2);
                    }
                } else {
                    // Unrevealed cell
                    const grad = ctx.createLinearGradient(x, y, x + this.cellSize, y + this.cellSize);
                    grad.addColorStop(0, isHovered ? '#4a4a6e' : '#2a2a4e');
                    grad.addColorStop(1, isHovered ? '#3a3a5e' : '#1a1a3e');
                    ctx.fillStyle = grad;
                    ctx.fillRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2);
                    ctx.strokeStyle = '#444';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);

                    if (this.flagged[r][c]) {
                        ctx.fillStyle = '#ff0';
                        ctx.font = '20px "Courier New"';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('🚩', x + this.cellSize / 2, y + this.cellSize / 2);
                    }
                }
            }
        }

        // Game over / win overlay
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
            ctx.fillRect(this.offsetX, this.offsetY, this.cols * this.cellSize, this.rows * this.cellSize);
            ctx.fillStyle = '#f00';
            ctx.font = '20px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText('GAME OVER', this.canvas.width / 2, this.offsetY + this.rows * this.cellSize + 20);
        }

        if (this.gameWon) {
            ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
            ctx.fillRect(this.offsetX, this.offsetY, this.cols * this.cellSize, this.rows * this.cellSize);
            ctx.fillStyle = '#0f0';
            ctx.font = '20px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText('YOU WIN!', this.canvas.width / 2, this.offsetY + this.rows * this.cellSize + 20);
        }

        // Controls
        ctx.fillStyle = '#555';
        ctx.font = '9px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('Left Click: Reveal  Right-Click: Flag  Click Number: Chord', this.canvas.width / 2, this.canvas.height - 30);
        ctx.fillText('Click 🙂 to restart', this.canvas.width / 2, this.canvas.height - 12);

        // Start message
        if (!this.gameStarted && !this.gameOver && !this.gameWon) {
            ctx.fillStyle = '#0f0';
            ctx.font = '14px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('CLICK ANY CELL', this.canvas.width / 2, this.offsetY + this.rows * this.cellSize + 60);
        }
    }

    handleKeyDown(e) {
        if (e.key === 'Enter' || e.key === 'r' || e.key === 'R') {
            if (this.gameOver || this.gameWon) {
                this.stopTimer();
                this.reset();
            }
            e.preventDefault();
        }
    }

    chordReveal(row, col) {
        if (!this.revealed[row][col] || this.board[row][col] === 0) return;
        
        const neighbors = this.getNeighbors(row, col);
        let flagCount = 0;
        neighbors.forEach(([nr, nc]) => {
            if (this.flagged[nr][nc]) flagCount++;
        });

        // If correct number of flags, reveal remaining neighbors
        if (flagCount === this.board[row][col]) {
            neighbors.forEach(([nr, nc]) => {
                if (!this.revealed[nr][nc] && !this.flagged[nr][nc]) {
                    this.reveal(nr, nc);
                }
            });
        }
    }

    handleClick(e, button) {
        const cell = this.getCellFromMouse(e);
        if (!cell) return;
        const [row, col] = cell;

        if (this.gameOver || this.gameWon) {
            // Check if clicking reset button
            const resetX = this.offsetX + this.cols * this.cellSize + 25;
            const resetY = this.offsetY - 25;
            if (Math.abs(e.clientX - resetX) < 20 && Math.abs(e.clientY - resetY) < 20) {
                this.stopTimer();
                this.reset();
                return;
            }
            return;
        }

        if (button === 2) {
            // Right click - flag
            this.toggleFlag(row, col);
        } else {
            // Left click - reveal or chord
            if (this.revealed[row][col] && this.board[row][col] > 0) {
                // Chord reveal on already revealed number
                this.chordReveal(row, col);
            } else {
                // Left click - reveal
                this.reveal(row, col);
            }
        }
    }

    handleMouseMove(e) {
        this.hoveredCell = this.getCellFromMouse(e);
    }
}