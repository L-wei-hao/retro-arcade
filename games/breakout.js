/**
 * BREAKOUT GAME - Retro Arcade Collection
 */
class BreakoutGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.paddle = { x: 0, y: 0, width: 100, height: 15, speed: 8 };
        this.ball = { x: 0, y: 0, radius: 8, dx: 4, dy: -4, speed: 5 };
        this.bricks = [];
        this.score = 0;
        this.lives = 3;
        this.gameStarted = false;
        this.gameOver = false;
        this.highScore = parseInt(localStorage.getItem('breakout_highscore')) || 0;
        this.brickRows = 6;
        this.brickCols = 12;
        this.brickWidth = 65;
        this.brickHeight = 20;
        this.brickPadding = 5;
        this.brickOffsetX = 30;
        this.brickOffsetY = 40;
        this.colors = ['#f00', '#f80', '#ff0', '#0f0', '#08f', '#80f'];
        // Power-ups
        this.powerUps = [];
        this.activeEffects = {};
        this.basePaddleWidth = 100;
        // Sound
        this.lastBallHitTime = 0;
        this.lastPaddleHitTime = 0;
        this.keys = {};
        this.lastPaddleX = 0;
        this.particles = [];
    }

    init() {
        this.canvas.width = 860;
        this.canvas.height = 540;
        this.reset();
    }

    reset() {
        this.paddle.width = this.basePaddleWidth;
        this.paddle.x = (this.canvas.width - this.paddle.width) / 2;
        this.paddle.y = this.canvas.height - 35;
        this.ball.radius = 8;
        this.ball.speed = 5;
        this.resetBall();
        this.createBricks();
        this.score = 0;
        this.lives = 3;
        this.gameStarted = false;
        this.gameOver = false;
        this.powerUps = [];
        this.activeEffects = {};
    }

    resetBall() {
        this.ball.x = this.paddle.x + this.paddle.width / 2;
        this.ball.y = this.paddle.y - this.ball.radius - 2;
        this.ball.dx = this.ball.speed * (Math.random() > 0.5 ? 1 : -1);
        this.ball.dy = -this.ball.speed;
    }

    createBricks() {
        this.bricks = [];
        for (let r = 0; r < this.brickRows; r++) {
            for (let c = 0; c < this.brickCols; c++) {
                this.bricks.push({
                    x: this.brickOffsetX + c * (this.brickWidth + this.brickPadding),
                    y: this.brickOffsetY + r * (this.brickHeight + this.brickPadding),
                    width: this.brickWidth,
                    height: this.brickHeight,
                    alive: true,
                    color: this.colors[r],
                    hits: r < 2 ? 2 : 1 // Top 2 rows need 2 hits
                });
            }
        }
    }

    update() {
        if (!this.gameStarted || this.gameOver) return;

        // Ball follows paddle before launch
        if (!this.gameStarted) {
            this.ball.x = this.paddle.x + this.paddle.width / 2;
            this.ball.y = this.paddle.y - this.ball.radius - 2;
            return;
        }

        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;

        // Wall collisions
        if (this.ball.x - this.ball.radius < 0 || this.ball.x + this.ball.radius > this.canvas.width) {
            this.ball.dx = -this.ball.dx;
            retroSounds.playBounce();
        }
        if (this.ball.y - this.ball.radius < 0) {
            this.ball.dy = -this.ball.dy;
            retroSounds.playBounce();
        }

        // Paddle collision
        if (this.ball.y + this.ball.radius >= this.paddle.y &&
            this.ball.x >= this.paddle.x &&
            this.ball.x <= this.paddle.x + this.paddle.width &&
            this.ball.dy > 0) {
            this.ball.dy = -this.ball.dy;
            const now = Date.now();
            if (now - this.lastPaddleHitTime > 60) {
                retroSounds.playHit();
                this.lastPaddleHitTime = now;
            }
            const hitPos = (this.ball.x - this.paddle.x) / this.paddle.width;
            const paddleMove = this.paddle.x - this.lastPaddleX;
            this.ball.dx = this.ball.speed * (hitPos - 0.5) * 2.5 + (paddleMove * 0.2);
            this.ball.dx = Math.max(-this.ball.speed * 2, Math.min(this.ball.speed * 2, this.ball.dx));
        }
        this.lastPaddleX = this.paddle.x;

        // Brick collisions
        this.bricks.forEach(brick => {
            if (!brick.alive) return;
            if (this.ball.x + this.ball.radius > brick.x &&
                this.ball.x - this.ball.radius < brick.x + brick.width &&
                this.ball.y + this.ball.radius > brick.y &&
                this.ball.y - this.ball.radius < brick.y + brick.height) {
                brick.hits--;
                const now = Date.now();
                if (brick.hits <= 0) {
                    brick.alive = false;
                    // Chance to drop power-up (20%)
                    if (Math.random() < 0.20) {
                        this.spawnPowerUp(brick.x + brick.width / 2 - 12, brick.y);
                    }
                    if (now - this.lastBallHitTime > 50) {
                        retroSounds.playBrickBreak();
                        this.lastBallHitTime = now;
                    }
                    // Add particles
                    for (let i = 0; i < 8; i++) {
                        this.particles.push({
                            x: brick.x + brick.width / 2,
                            y: brick.y + brick.height / 2,
                            dx: (Math.random() - 0.5) * 6,
                            dy: (Math.random() - 0.5) * 6,
                            color: brick.color,
                            life: 1.0
                        });
                    }
                } else {
                    // Brick flashing - partially damaged
                    this.ball.dy = -this.ball.dy;
                    if (now - this.lastBallHitTime > 50) {
                        retroSounds.playBrickHit();
                        this.lastBallHitTime = now;
                    }
                }
                const row = Math.floor((brick.y - this.brickOffsetY) / (this.brickHeight + this.brickPadding));
                this.score += 10 * (this.brickRows - Math.floor(this.brickRows / 2) + row);
                this.score += 5;
            }
        });

        // Bottom - lose life
        if (this.ball.y + this.ball.radius > this.canvas.height) {
            this.lives--;
            retroSounds.playBallLose();
            if (this.lives <= 0) {
                this.gameOver = true;
                if (this.score > this.highScore) {
                    this.highScore = this.score;
                    localStorage.setItem('breakout_highscore', this.highScore);
                }
            } else {
                this.resetBall();
            }
        }

        // Smooth paddle movement
        if (this.keys['ArrowLeft'] || this.keys['a']) {
            this.paddle.x -= this.paddle.speed;
        }
        if (this.keys['ArrowRight'] || this.keys['d']) {
            this.paddle.x += this.paddle.speed;
        }
        this.paddle.x = Math.max(0, Math.min(this.canvas.width - this.paddle.width, this.paddle.x));

        // Win check
        if (this.bricks.every(b => !b.alive)) {
            this.createBricks();
            this.ball.speed = Math.min(this.ball.speed + 0.5, 10);
            this.resetBall();
        }

        // Update power-ups
        this.updatePowerUps();

        // Update particles
        this.particles.forEach(p => {
            p.x += p.dx;
            p.y += p.dy;
            p.life -= 0.04;
        });
        this.particles = this.particles.filter(p => p.life > 0);
    }

    updatePowerUps() {
        // Remove expired effects
        for (const key in this.activeEffects) {
            if (Date.now() > this.activeEffects[key].endTime) {
                delete this.activeEffects[key];
            }
        }

        // Update falling power-ups
        this.powerUps = this.powerUps.filter(pu => {
            pu.y += pu.speed;
            // Check if caught by paddle
            if (pu.y + pu.height >= this.paddle.y &&
                pu.x + pu.width >= this.paddle.x &&
                pu.x <= this.paddle.x + this.paddle.width) {
                this.activatePowerUp(pu.type);
                return false;
            }
            return pu.y < this.canvas.height;
        });
    }

    activatePowerUp(type) {
        retroSounds.playPowerUp();
        switch(type) {
            case 'wide':
                this.paddle.width = Math.min(160, this.basePaddleWidth + 60);
                this.activeEffects.wide = { endTime: Date.now() + 15000 };
                break;
            case 'multiball':
                this.lives = Math.min(5, this.lives + 1);
                break;
            case 'slow':
                this.ball.speed = Math.max(3, this.ball.speed - 1.5);
                this.activeEffects.slow = { endTime: Date.now() + 10000 };
                break;
        }
    }

    spawnPowerUp(x, y) {
        const types = ['wide', 'wide', 'slow', 'multiball'];
        const type = types[Math.floor(Math.random() * types.length)];
        const colors = { wide: '#0ff', slow: '#f0f', multiball: '#ff0' };
        const symbols = { wide: '↔', slow: 'S', multiball: '♥' };
        this.powerUps.push({
            x: x,
            y: y,
            width: 25,
            height: 15,
            type: type,
            color: colors[type],
            symbol: symbols[type],
            speed: 2
        });
    }

    draw() {
        const ctx = this.ctx;

        // Background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Particles
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, 3, 3);
        });
        ctx.globalAlpha = 1;

        // Bricks
        this.bricks.forEach(brick => {
            if (!brick.alive) return;
            ctx.fillStyle = brick.color;
            ctx.shadowColor = brick.color;
            ctx.shadowBlur = 8;
            ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(brick.x, brick.y, brick.width, brick.height / 2);
            // Damage indicator for multi-hit bricks
            if (brick.hits > 1) {
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(brick.x + 5, brick.y + brick.height / 2);
                ctx.lineTo(brick.x + brick.width - 5, brick.y + brick.height / 2);
                ctx.stroke();
            }
        });
        ctx.shadowBlur = 0;

        // Power-ups falling
        this.powerUps.forEach(pu => {
            ctx.fillStyle = pu.color;
            ctx.shadowColor = pu.color;
            ctx.shadowBlur = 10;
            ctx.fillRect(pu.x, pu.y, pu.width, pu.height);
            ctx.textBaseline = 'middle';
            
            // Draw custom symbols instead of emojis
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            if (pu.type === 'wide') {
                ctx.beginPath(); ctx.moveTo(pu.x + 5, pu.y + 7.5); ctx.lineTo(pu.x + 20, pu.y + 7.5); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(pu.x + 5, pu.y + 7.5); ctx.lineTo(pu.x + 10, pu.y + 3); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(pu.x + 5, pu.y + 7.5); ctx.lineTo(pu.x + 10, pu.y + 12); ctx.stroke();
            } else if (pu.type === 'slow') {
                ctx.beginPath(); ctx.arc(pu.x + 12.5, pu.y + 7.5, 4, 0, Math.PI * 2); ctx.stroke();
            } else if (pu.type === 'multiball') {
                ctx.beginPath(); ctx.arc(pu.x + 8, pu.y + 6, 3, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(pu.x + 17, pu.y + 6, 3, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.moveTo(pu.x + 12.5, pu.y + 12); ctx.lineTo(pu.x + 5, pu.y + 6); ctx.lineTo(pu.x + 20, pu.y + 6); ctx.closePath(); ctx.fill();
            }
            
            ctx.shadowBlur = 0;
        });

        // Paddle (with effect indicator)
        const grad = ctx.createLinearGradient(this.paddle.x, this.paddle.y, this.paddle.x, this.paddle.y + this.paddle.height);
        if (this.activeEffects.wide) {
            grad.addColorStop(0, '#ff0');
            grad.addColorStop(1, '#f80');
        } else {
            grad.addColorStop(0, '#0ff');
            grad.addColorStop(1, '#08f');
        }
        ctx.fillStyle = grad;
        ctx.shadowColor = this.activeEffects.wide ? '#ff0' : '#0ff';
        ctx.shadowBlur = this.activeEffects.wide ? 25 : 15;
        ctx.beginPath();
        ctx.roundRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height, 5);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Ball
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Lives
        ctx.fillStyle = '#0ff';
        ctx.font = '14px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(`LIVES: ${'♥'.repeat(this.lives)}`, 15, 30);

        // Active power-up effects display
        let effectY = 55;
        ctx.font = '10px "Press Start 2P"';
        if (this.activeEffects.wide) {
            ctx.fillStyle = '#ff0';
            ctx.fillText(`WIDE: ${Math.ceil((this.activeEffects.wide.endTime - Date.now()) / 1000)}s`, 15, effectY);
            effectY += 18;
        }
        if (this.activeEffects.slow) {
            ctx.fillStyle = '#f0f';
            ctx.fillText(`SLOW: ${Math.ceil((this.activeEffects.slow.endTime - Date.now()) / 1000)}s`, 15, effectY);
        }

        // Start message
        if (!this.gameStarted && !this.gameOver) {
            ctx.fillStyle = '#0f0';
            ctx.font = '16px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('PRESS ENTER OR SPACE TO LAUNCH', this.canvas.width / 2, this.canvas.height / 2 + 50);
        }

        // Game over
        if (this.gameOver) {
            ctx.fillStyle = '#f00';
            ctx.font = '24px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 20);
        }
    }

    handleKeyDown(e) {
        this.keys[e.key] = true;
        if (['Enter', ' '].includes(e.key)) {
            if (!this.gameStarted && !this.gameOver) {
                this.gameStarted = true;
                retroSounds.init();
                retroSounds.playStart();
            }
            e.preventDefault();
        }
        if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
        }
    }

    handleKeyUp(e) {
        this.keys[e.key] = false;
    }
}