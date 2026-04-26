/**
 * PONG GAME - Retro Arcade Collection
 */
class PongGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.paddleWidth = 15;
        this.paddleHeight = 90;
        this.paddleSpeed = 7;
        this.player = { x: 30, y: 0, score: 0 };
        this.ai = { x: 0, y: 0, score: 0, speed: 4.5 };
        this.ball = { x: 0, y: 0, radius: 10, dx: 5, dy: 4, speed: 6 };
        this.score = 0;
        this.winsNeeded = 10;
        this.gameStarted = false;
        this.gameOver = false;
        this.paused = false;
        this.highScore = parseInt(localStorage.getItem('pong_highscore')) || 0;
        this.netDots = [];
        this.trail = [];
        this.keys = {};
        this.lastTime = 0;
        this.difficulty = 1;
        // Sound
        this.lastBallHitTime = 0;
        this.lastWallBounceTime = 0;
        this.lastScoreTime = 0;
        this.shake = 0;
    }

    init() {
        this.canvas.width = 860;
        this.canvas.height = 540;
        this.player.y = this.canvas.height / 2 - this.paddleHeight / 2;
        this.ai.x = this.canvas.width - 30 - this.paddleWidth;
        this.ai.y = this.canvas.height / 2 - this.paddleHeight / 2;
        this.resetBall();
        this.reset();
    }

    reset() {
        this.player.score = 0;
        this.ai.score = 0;
        this.score = 0;
        this.gameStarted = false;
        this.gameOver = false;
        this.paused = false;
        this.difficulty = 1;
        this.resetBall();
    }

    resetBall() {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height / 2;
        this.ball.speed = 6;
        const angle = (Math.random() * Math.PI / 3) - Math.PI / 6;
        this.ball.dx = this.ball.speed * Math.cos(angle) * (Math.random() > 0.5 ? 1 : -1);
        this.ball.dy = this.ball.speed * Math.sin(angle);
        this.trail = [];
    }

    update(timestamp) {
        if (!this.gameStarted || this.gameOver || this.paused) return;

        const dt = (timestamp - this.lastTime) / 16.67;
        this.lastTime = timestamp;

        // Player movement
        if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) {
            this.player.y -= this.paddleSpeed * dt;
        }
        if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) {
            this.player.y += this.paddleSpeed * dt;
        }
        this.player.y = Math.max(0, Math.min(this.canvas.height - this.paddleHeight, this.player.y));

        // AI movement (Smarter: only moves when ball is coming towards it, with some "reaction" lag)
        const aiCenter = this.ai.y + this.paddleHeight / 2;
        let targetY = this.canvas.height / 2; // Default to center

        if (this.ball.dx > 0) {
            // Predict where the ball will be (simplified prediction)
            const timeToReach = (this.ai.x - this.ball.x) / this.ball.dx;
            targetY = this.ball.y + this.ball.dy * timeToReach;
            
            // Handle wall bounces in prediction
            while (targetY < 0 || targetY > this.canvas.height) {
                if (targetY < 0) targetY = -targetY;
                else targetY = 2 * this.canvas.height - targetY;
            }
        }

        const aiSpeed = this.ai.speed * this.difficulty * dt;
        if (aiCenter < targetY - 15) {
            this.ai.y += Math.min(aiSpeed, targetY - aiCenter);
        } else if (aiCenter > targetY + 15) {
            this.ai.y -= Math.min(aiSpeed, aiCenter - targetY);
        }
        this.ai.y = Math.max(0, Math.min(this.canvas.height - this.paddleHeight, this.ai.y));

        // Ball trail
        this.trail.push({ x: this.ball.x, y: this.ball.y, alpha: 1 });
        if (this.trail.length > 15) this.trail.shift();

        // Ball movement
        this.ball.x += this.ball.dx * dt;
        this.ball.y += this.ball.dy * dt;

        // Top/bottom bounce
        if (this.ball.y - this.ball.radius < 0) {
            this.ball.dy = Math.abs(this.ball.dy);
            this.ball.y = this.ball.radius;
            this.shake = 3; // Minor shake on wall hit
            const now = Date.now();
            if (now - this.lastWallBounceTime > 100) {
                retroSounds.playPongBounce();
                this.lastWallBounceTime = now;
            }
        }
        if (this.ball.y + this.ball.radius > this.canvas.height) {
            this.ball.dy = -Math.abs(this.ball.dy);
            this.ball.y = this.canvas.height - this.ball.radius;
            this.shake = 3;
            const now = Date.now();
            if (now - this.lastWallBounceTime > 100) {
                retroSounds.playPongBounce();
                this.lastWallBounceTime = now;
            }
        }

        // Player paddle collision
        if (this.ball.x - this.ball.radius < this.player.x + this.paddleWidth &&
            this.ball.x + this.ball.radius > this.player.x &&
            this.ball.y > this.player.y &&
            this.ball.y < this.player.y + this.paddleHeight &&
            this.ball.dx < 0) {
            this.ball.dx = Math.abs(this.ball.dx) * 1.05;
            const hitPos = (this.ball.y - this.player.y) / this.paddleHeight - 0.5;
            this.ball.dy = hitPos * this.ball.speed * 1.5;
            this.ball.x = this.player.x + this.paddleWidth + this.ball.radius;
            this.score += 10;
            this.shake = 8; // Screen shake
            const now = Date.now();
            if (now - this.lastBallHitTime > 80) {
                retroSounds.playPongHit();
                this.lastBallHitTime = now;
            }
        }

        // AI paddle collision
        if (this.ball.x + this.ball.radius > this.ai.x &&
            this.ball.x - this.ball.radius < this.ai.x + this.paddleWidth &&
            this.ball.y > this.ai.y &&
            this.ball.y < this.ai.y + this.paddleHeight &&
            this.ball.dx > 0) {
            this.ball.dx = -Math.abs(this.ball.dx) * 1.05;
            const hitPos = (this.ball.y - this.ai.y) / this.paddleHeight - 0.5;
            this.ball.dy = hitPos * this.ball.speed * 1.5;
            this.ball.x = this.ai.x - this.ball.radius;
            const now = Date.now();
            if (now - this.lastBallHitTime > 80) {
                retroSounds.playPongHit();
                this.lastBallHitTime = now;
            }
        }

        // Scoring with flash effect
        if (this.ball.x < 0) {
            this.ai.score++;
            this.scoreFlash = 30; // Flash on AI score
            const now = Date.now();
            if (now - this.lastScoreTime > 1000) {
                retroSounds.playPongScoreAgainst();
                this.lastScoreTime = now;
            }
            this.resetBall();
        }
        if (this.ball.x > this.canvas.width) {
            this.player.score++;
            this.score += 100;
            this.scoreFlash = -30; // Flash on player score
            const now = Date.now();
            if (now - this.lastScoreTime > 1000) {
                retroSounds.playPongScore();
                this.lastScoreTime = now;
            }
            this.resetBall();
        }
        if (this.scoreFlash) {
            this.scoreFlash--;
            if (this.scoreFlash === 0) this.scoreFlash = null;
        }

        // Increase difficulty
        this.difficulty = 1 + (this.player.score + this.ai.score) * 0.1;
        this.ball.speed = Math.min(18, 6 + (this.player.score + this.ai.score) * 0.5);

        // Win/lose check
        if (this.player.score >= this.winsNeeded) {
            this.gameOver = true;
            retroSounds.playWin();
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('pong_highscore', this.highScore);
            }
        }
        if (this.ai.score >= this.winsNeeded) {
            this.gameOver = true;
            retroSounds.playGameOver();
        }
    }

    draw() {
        const ctx = this.ctx;

        // Screen Shake
        if (this.shake > 0) {
            ctx.save();
            ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
            this.shake *= 0.9;
            if (this.shake < 0.5) this.shake = 0;
        }

        // Background
        ctx.fillStyle = '#000';
        ctx.fillRect(-50, -50, this.canvas.width + 100, this.canvas.height + 100);

        // Restore context after shake if applied
        if (this.shake > 0 || this.ctx.getTransform().e !== 0) {
            // We will restore at the end of draw
        }

        // Center net
        ctx.fillStyle = '#222';
        for (let y = 0; y < this.canvas.height; y += 30) {
            ctx.fillRect(this.canvas.width / 2 - 1, y + 10, 2, 15);
        }

        // Ball trail
        this.trail.forEach((t, i) => {
            t.alpha = i / this.trail.length * 0.4;
            ctx.fillStyle = `rgba(255, 255, 255, ${t.alpha})`;
            ctx.beginPath();
            ctx.arc(t.x, t.y, this.ball.radius * (i / this.trail.length), 0, Math.PI * 2);
            ctx.fill();
        });

        // Ball
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Score flash overlay
        if (this.scoreFlash) {
            const flashColor = this.scoreFlash > 0 ? `rgba(0, 255, 255, ${this.scoreFlash / 60})` : `rgba(255, 0, 255, ${-this.scoreFlash / 60})`;
            ctx.fillStyle = flashColor;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Player paddle
        const pGrad = ctx.createLinearGradient(this.player.x, 0, this.player.x + this.paddleWidth, 0);
        pGrad.addColorStop(0, '#08f');
        pGrad.addColorStop(1, '#0ff');
        ctx.fillStyle = pGrad;
        ctx.shadowColor = '#0ff';
        ctx.shadowBlur = 20;
        ctx.fillRect(this.player.x, this.player.y, this.paddleWidth, this.paddleHeight);
        ctx.shadowBlur = 0;

        // AI paddle
        const aGrad = ctx.createLinearGradient(this.ai.x, 0, this.ai.x + this.paddleWidth, 0);
        aGrad.addColorStop(0, '#f0f');
        aGrad.addColorStop(1, '#f08');
        ctx.fillStyle = aGrad;
        ctx.shadowColor = '#f0f';
        ctx.shadowBlur = 20;
        ctx.fillRect(this.ai.x, this.ai.y, this.paddleWidth, this.paddleHeight);
        ctx.shadowBlur = 0;

        // Scores (large, centered)
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = '100px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(this.player.score, this.canvas.width / 4, 110);
        ctx.fillText(this.ai.score, this.canvas.width * 3 / 4, 110);

        // Win progress
        ctx.fillStyle = '#555';
        ctx.font = '10px "Press Start 2P"';
        ctx.fillText(`${this.player.score}/${this.winsNeeded}`, this.canvas.width / 4, 130);
        ctx.fillText(`${this.ai.score}/${this.winsNeeded}`, this.canvas.width * 3 / 4, 130);

        // Pause overlay
        if (this.gameStarted && !this.gameOver && this.paused) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.fillStyle = '#ff0';
            ctx.font = '28px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2 - 10);
            ctx.fillStyle = '#888';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText('Press P to resume', this.canvas.width / 2, this.canvas.height / 2 + 30);
        }

        // Start message
        if (!this.gameStarted && !this.gameOver) {
            ctx.fillStyle = '#0f0';
            ctx.font = '16px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('PRESS ENTER TO START', this.canvas.width / 2, this.canvas.height / 2 + 60);
            ctx.fillStyle = '#0ff';
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText('PONG', this.canvas.width / 2, this.canvas.height / 2 - 20);
            ctx.fillStyle = '#888';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText('W/S or ↑/↓ : Move', this.canvas.width / 2, this.canvas.height / 2 + 100);
            ctx.fillText('P : Pause', this.canvas.width / 2, this.canvas.height / 2 + 120);
        }

        // Game over
        if (this.gameOver) {
            ctx.fillStyle = this.player.score >= this.winsNeeded ? '#0f0' : '#f00';
            ctx.font = '24px "Press Start 2P"';
            ctx.textAlign = 'center';
            const msg = this.player.score >= this.winsNeeded ? 'YOU WIN!' : 'YOU LOSE';
            ctx.fillText(msg, this.canvas.width / 2, this.canvas.height / 2 - 20);
        }
        
        ctx.restore(); // Restore from shake
    }

    handleKeyDown(e) {
        this.keys[e.key] = true;
        if (e.key === 'Enter' && !this.gameStarted && !this.gameOver) {
            this.gameStarted = true;
            retroSounds.init();
            retroSounds.playStart();
        }
        // Pause toggle
        if ((e.key === 'p' || e.key === 'P') && this.gameStarted && !this.gameOver) {
            this.paused = !this.paused;
            if (this.paused) retroSounds.playPause();
            e.preventDefault();
        }
        if (['ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) {
            e.preventDefault();
        }
    }

    handleKeyUp(e) {
        this.keys[e.key] = false;
    }
}