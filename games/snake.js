/**
 * SNAKE GAME - Retro Arcade Collection
 */
class SnakeGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gridSize = 20;
        this.tileCountX = 0;
        this.tileCountY = 0;
        this.snake = [];
        this.food = { x: 0, y: 0 };
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.score = 0;
        this.gameStarted = false;
        this.gameOver = false;
        this.speed = 120;
        this.lastUpdate = 0;
        this.highScore = parseInt(localStorage.getItem('snake_highscore')) || 0;
        // Bonus food (golden apple)
        this.bonusFood = null;
        this.bonusTimer = 0;
        this.bonusInterval = 15000; // Every 15 seconds
        this.bonusCooldown = 0;
        // Sound
        this.lastEatTime = 0;
    }

    init() {
        this.canvas.width = 860;
        this.canvas.height = 540;
        this.tileCountX = Math.floor(this.canvas.width / this.gridSize);
        this.tileCountY = Math.floor(this.canvas.height / this.gridSize);
        this.reset();
    }

    reset() {
        const startX = Math.floor(this.tileCountX / 2);
        const startY = Math.floor(this.tileCountY / 2);
        this.snake = [
            { x: startX, y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY }
        ];
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.score = 0;
        this.gameStarted = false;
        this.gameOver = false;
        this.placeFood();
    }

    placeFood() {
        let valid = false;
        while (!valid) {
            this.food.x = Math.floor(Math.random() * this.tileCountX);
            this.food.y = Math.floor(Math.random() * this.tileCountY);
            valid = !this.snake.some(seg => seg.x === this.food.x && seg.y === this.food.y);
        }
    }

    placeBonusFood() {
        if (this.bonusFood) return; // Already active
        let valid = false;
        let attempts = 0;
        while (!valid && attempts < 100) {
            this.bonusFood = {
                x: Math.floor(Math.random() * this.tileCountX),
                y: Math.floor(Math.random() * this.tileCountY),
                lifetime: 8000 // 8 seconds to eat it
            };
            valid = !this.snake.some(seg => seg.x === this.bonusFood.x && seg.y === this.bonusFood.y) &&
                    !(this.food.x === this.bonusFood.x && this.food.y === this.bonusFood.y);
            attempts++;
        }
        if (!valid) this.bonusFood = null;
    }

    update(timestamp) {
        if (!this.gameStarted || this.gameOver) return;

        if (timestamp - this.lastUpdate < this.speed) return;
        this.lastUpdate = timestamp;

        this.direction = { ...this.nextDirection };

        const head = {
            x: this.snake[0].x + this.direction.x,
            y: this.snake[0].y + this.direction.y
        };

        // Wall collision with Grace Period (allow turning at the last millisecond)
        if (head.x < 0 || head.x >= this.tileCountX || head.y < 0 || head.y >= this.tileCountY) {
            // Check if user is trying to turn away from the wall
            const turningAway = (head.x < 0 && this.nextDirection.x > 0) ||
                               (head.x >= this.tileCountX && this.nextDirection.x < 0) ||
                               (head.y < 0 && this.nextDirection.y > 0) ||
                               (head.y >= this.tileCountY && this.nextDirection.y < 0);
            
            if (!turningAway) {
                this.endGame();
                return;
            } else {
                // Apply the turn immediately
                this.direction = { ...this.nextDirection };
                head.x = this.snake[0].x + this.direction.x;
                head.y = this.snake[0].y + this.direction.y;
            }
        }

        // Self collision
        if (this.snake.some(seg => seg.x === head.x && seg.y === head.y)) {
            this.endGame();
            return;
        }

        this.snake.unshift(head);

        // Eat normal food
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.placeFood();
            // Speed up slightly (more gradual scaling)
            if (this.speed > 50) this.speed -= 0.5;
            // Play eat sound (throttled)
            const now = Date.now();
            if (now - this.lastEatTime > 100) {
                retroSounds.playSnakeEat();
                this.lastEatTime = now;
            }
        } else {
            this.snake.pop();
        }

        // Check bonus food
        if (this.bonusFood) {
            // Check if ate bonus food
            if (head.x === this.bonusFood.x && head.y === this.bonusFood.y) {
                this.score += 50;
                this.bonusFood = null;
                this.bonusCooldown = this.bonusInterval;
                retroSounds.playSnakeBonus();
            }
            // Check if bonus food expired
            else if (timestamp - this.bonusFood.spawnTime > this.bonusFood.lifetime) {
                this.bonusFood = null;
                this.bonusCooldown = this.bonusInterval;
            }
        }

        // Spawn bonus food
        if (!this.bonusFood && this.bonusCooldown <= 0) {
            this.placeBonusFood();
            if (this.bonusFood) {
                this.bonusFood.spawnTime = timestamp;
            }
        }
        if (this.bonusCooldown > 0) {
            this.bonusCooldown -= this.speed;
        }
    }

    endGame() {
        this.gameOver = true;
        retroSounds.playSnakeGameOver();
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('snake_highscore', this.highScore);
        }
    }

    setDirection(x, y) {
        // Prevent reversing
        if (this.direction.x === -x && this.direction.y === -y) return;
        if (this.direction.x === x && this.direction.y === y) return;
        this.nextDirection = { x, y };
    }

    start() {
        this.gameStarted = true;
        retroSounds.init();
        retroSounds.playStart();
    }

    draw() {
        const ctx = this.ctx;
        const gs = this.gridSize;

        // Background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Grid lines (subtle)
        ctx.strokeStyle = '#111';
        for (let x = 0; x <= this.tileCountX; x++) {
            ctx.beginPath();
            ctx.moveTo(x * gs, 0);
            ctx.lineTo(x * gs, this.canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= this.tileCountY; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * gs);
            ctx.lineTo(this.canvas.width, y * gs);
            ctx.stroke();
        }

        // Snake
        this.snake.forEach((seg, i) => {
            const brightness = 255 - (i * 3);
            const r = Math.max(0, brightness * 0.2);
            const g = Math.max(0, brightness);
            const b = Math.max(0, brightness * 0.2);
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.shadowColor = '#0f0';
            ctx.shadowBlur = i === 0 ? 15 : 5;
            ctx.fillRect(seg.x * gs + 1, seg.y * gs + 1, gs - 2, gs - 2);
        });
        ctx.shadowBlur = 0;

        // Food (pulsing red apple)
        const pulse = Math.sin(Date.now() / 200) * 3;
        ctx.fillStyle = '#f00';
        ctx.shadowColor = '#f00';
        ctx.shadowBlur = 15 + pulse;
        ctx.beginPath();
        ctx.arc(
            this.food.x * gs + gs / 2,
            this.food.y * gs + gs / 2,
            gs / 2 - 2 + pulse / 3,
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.shadowBlur = 0;

        // Bonus food (golden star)
        if (this.bonusFood) {
            const age = Date.now() - this.bonusFood.spawnTime;
            const remaining = this.bonusFood.lifetime - age;
            const isFading = remaining < 2000;
            const blinkRate = remaining < 1000 ? 100 : 300;
            const visible = Math.sin(Date.now() / blinkRate) > 0 || !isFading;

            if (visible) {
                const starPulse = Math.sin(Date.now() / 150) * 2;
                ctx.fillStyle = '#ff0';
                ctx.shadowColor = '#ff0';
                ctx.shadowBlur = 20 + starPulse;
                this.drawStar(
                    ctx,
                    this.bonusFood.x * gs + gs / 2,
                    this.bonusFood.y * gs + gs / 2,
                    5,
                    gs / 3 + starPulse / 2,
                    gs / 5
                );
                ctx.shadowBlur = 0;

                // Timer bar
                const barWidth = gs - 4;
                const barHeight = 3;
                const progress = Math.max(0, remaining / this.bonusFood.lifetime);
                ctx.fillStyle = '#333';
                ctx.fillRect(this.bonusFood.x * gs + 2, this.bonusFood.y * gs - 5, barWidth, barHeight);
                ctx.fillStyle = progress > 0.5 ? '#0f0' : progress > 0.25 ? '#ff0' : '#f00';
                ctx.fillRect(this.bonusFood.x * gs + 2, this.bonusFood.y * gs - 5, barWidth * progress, barHeight);
                
                // Add "Hurry Up" pulse effect when low on time
                if (remaining < 2000) {
                    ctx.strokeStyle = `rgba(255, 0, 0, ${Math.sin(Date.now() / 100) * 0.5 + 0.5})`;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(this.bonusFood.x * gs, this.bonusFood.y * gs, gs, gs);
                }
            }
        }

        // Score popup for bonus food hint
        if (this.bonusFood) {
            ctx.fillStyle = '#ff0';
            ctx.font = '8px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('★50', this.bonusFood.x * gs + gs / 2, this.bonusFood.y * gs - 10);
        }

        // Start message
        if (!this.gameStarted && !this.gameOver) {
            ctx.fillStyle = '#0f0';
            ctx.font = '16px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('PRESS ENTER TO START', this.canvas.width / 2, this.canvas.height / 2);
            ctx.font = '10px "Press Start 2P"';
            ctx.fillStyle = '#888';
            ctx.fillText('Use Arrow Keys or WASD', this.canvas.width / 2, this.canvas.height / 2 + 35);
        }

        // Game over message
        if (this.gameOver) {
            ctx.fillStyle = '#f00';
            ctx.font = '24px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 20);
        }
    }

    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    }

    handleKeyDown(e) {
        switch (e.key) {
            case 'ArrowUp': case 'w': case 'W':
                this.setDirection(0, -1); 
                if (!this.gameStarted) { retroSounds.init(); retroSounds.playStart(); this.gameStarted = true; }
                else retroSounds.playMove();
                e.preventDefault(); break;
            case 'ArrowDown': case 's': case 'S':
                this.setDirection(0, 1); 
                if (!this.gameStarted) { retroSounds.init(); retroSounds.playStart(); this.gameStarted = true; }
                else retroSounds.playMove();
                e.preventDefault(); break;
            case 'ArrowLeft': case 'a': case 'A':
                this.setDirection(-1, 0); 
                if (!this.gameStarted) { retroSounds.init(); retroSounds.playStart(); this.gameStarted = true; }
                else retroSounds.playMove();
                e.preventDefault(); break;
            case 'ArrowRight': case 'd': case 'D':
                this.setDirection(1, 0); 
                if (!this.gameStarted) { retroSounds.init(); retroSounds.playStart(); this.gameStarted = true; }
                else retroSounds.playMove();
                e.preventDefault(); break;
            case 'Enter':
                if (!this.gameStarted) this.start();
                e.preventDefault(); break;
        }
    }
}
