/**
 * SPACE INVADERS GAME - Retro Arcade Collection
 */
class SpaceInvadersGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.player = { x: 0, y: 0, width: 40, height: 25, speed: 5 };
        this.bullets = [];
        this.enemyBullets = [];
        this.enemies = [];
        this.explosions = [];
        this.shields = [];
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.gameStarted = false;
        this.gameOver = false;
        this.highScore = parseInt(localStorage.getItem('invaders_highscore')) || 0;
        this.enemyDirection = 1;
        this.enemySpeed = 1;
        this.lastShot = 0;
        this.lastEnemyShot = 0;
        this.shootCooldown = 300;
        this.enemyShootInterval = 1500;
        this.ufo = { x: -100, y: 30, width: 50, height: 20, active: false, speed: 2 };
        this.ufoTimer = 0;
        this.keys = {};
        this.starField = [];
        for (let i = 0; i < 80; i++) {
            this.starField.push({
                x: Math.random() * 860,
                y: Math.random() * 540,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 0.5 + 0.1
            });
        }
        // Sound
        this.lastEnemyShootTime = 0;
        this.lastLevelUpTime = 0;
    }

    init() {
        this.canvas.width = 860;
        this.canvas.height = 540;
        this.reset();
    }

    reset() {
        this.player.x = this.canvas.width / 2 - this.player.width / 2;
        this.player.y = this.canvas.height - 50;
        this.bullets = [];
        this.enemyBullets = [];
        this.explosions = [];
        this.score = 0;
        this.shieldDestroyedCount = 0;
        this.level = 1;
        this.lives = 3;
        this.gameStarted = false;
        this.gameOver = false;
        this.enemyDirection = 1;
        this.enemySpeed = 1;
        this.ufo.active = false;
        this.ufoTimer = 0;
        this.createEnemies();
        this.createShields();
    }

    createShields() {
        this.shields = [];
        const shieldWidth = 50;
        const shieldHeight = 35;
        const shieldPixels = 4; // Each "pixel" of the shield
        const positions = [150, 340, 530];

        positions.forEach(sx => {
            // Create shield shape (arch)
            for (let py = 0; py < shieldHeight; py += shieldPixels) {
                for (let px = 0; px < shieldWidth; px += shieldPixels) {
                    // Create arch shape at bottom
                    const isInArch = py > shieldHeight * 0.6 &&
                                     px > 10 && px < shieldWidth - 10 &&
                                     py < shieldHeight * 0.85;
                    if (!isInArch) {
                        // Check if in curved top
                        const cx = shieldWidth / 2;
                        const cy = shieldHeight * 0.3;
                        const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
                        const isInCurve = dist > shieldWidth * 0.4;
                        if (py > shieldHeight * 0.3 || isInCurve) {
                            this.shields.push({
                                x: sx + px,
                                y: this.canvas.height - 120 + py,
                                width: shieldPixels,
                                height: shieldPixels,
                                health: 3
                            });
                        }
                    }
                }
            }
        });
    }

    createEnemies() {
        this.enemies = [];
        const rows = 5;
        const cols = 10;
        const enemyWidth = 35;
        const enemyHeight = 25;
        const padding = 10;
        const offsetX = (this.canvas.width - cols * (enemyWidth + padding)) / 2;
        const offsetY = 50;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                this.enemies.push({
                    x: offsetX + c * (enemyWidth + padding),
                    y: offsetY + r * (enemyHeight + padding),
                    width: enemyWidth,
                    height: enemyHeight,
                    alive: true,
                    type: r < 1 ? 2 : r < 3 ? 1 : 0,
                    frame: 0
                });
            }
        }
    }

    update(timestamp) {
        if (!this.gameStarted || this.gameOver) return;

        // Player movement
        if (this.keys['ArrowLeft'] || this.keys['a']) {
            this.player.x -= this.player.speed;
        }
        if (this.keys['ArrowRight'] || this.keys['d']) {
            this.player.x += this.player.speed;
        }
        this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.width, this.player.x));

        // Shooting
        if ((this.keys[' '] || this.keys['Enter']) && timestamp - this.lastShot > this.shootCooldown) {
            this.bullets.push({
                x: this.player.x + this.player.width / 2 - 2,
                y: this.player.y,
                width: 4,
                height: 12,
                speed: 8
            });
            this.lastShot = timestamp;
            retroSounds.playPlayerShoot();
        }

        // Update bullets
        this.bullets = this.bullets.filter(b => {
            b.y -= b.speed;
            return b.y > 0;
        });

        // Update enemy bullets
        this.enemyBullets = this.enemyBullets.filter(b => {
            b.y += b.speed;
            return b.y < this.canvas.height;
        });

        // Enemy movement
        let shouldDrop = false;
        const aliveEnemies = this.enemies.filter(e => e.alive);
        if (aliveEnemies.length === 0) {
            // Level complete
            const now = Date.now();
            if (now - this.lastLevelUpTime > 500) {
                retroSounds.playLevelUp();
                this.lastLevelUpTime = now;
            }
            this.level++;
            this.enemySpeed += 0.5;
            this.createEnemies();
            return;
        }

        // Dynamic enemy speed based on count
        const totalEnemies = 50; // Initial count
        const countRatio = aliveEnemies.length / totalEnemies;
        const currentBaseSpeed = this.enemySpeed + (1 - countRatio) * 2;

        aliveEnemies.forEach(e => {
            e.x += currentBaseSpeed * this.enemyDirection;
            if (e.x <= 0 || e.x + e.width >= this.canvas.width) {
                shouldDrop = true;
            }
        });

        // UFO Logic
        this.ufoTimer += 16; // ~60fps increment
        if (!this.ufo.active && Math.random() < 0.001) {
            this.ufo.active = true;
            this.ufo.x = -50;
        }
        if (this.ufo.active) {
            this.ufo.x += this.ufo.speed;
            if (this.ufo.x > this.canvas.width) this.ufo.active = false;
        }

        if (shouldDrop) {
            this.enemyDirection *= -1;
            this.enemies.forEach(e => {
                if (e.alive) e.y += 15;
            });
        }

        // Enemy shooting
        if (timestamp - this.lastEnemyShot > this.enemyShootInterval && aliveEnemies.length > 0) {
            const shooter = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
            this.enemyBullets.push({
                x: shooter.x + shooter.width / 2 - 2,
                y: shooter.y + shooter.height,
                width: 4,
                height: 12,
                speed: 3 + this.level * 0.5
            });
            this.lastEnemyShot = timestamp;
            const now = Date.now();
            if (now - this.lastEnemyShootTime > 200) {
                retroSounds.playEnemyShoot();
                this.lastEnemyShootTime = now;
            }
        }

        // Bullet-enemy collision (also check shields)
        this.bullets.forEach((b, bi) => {
            let hit = false;
            // Check shield collision first
            this.shields.forEach(s => {
                if (hit) return;
                if (b.x < s.x + s.width && b.x + b.width > s.x &&
                    b.y < s.y + s.height && b.y + b.height > s.y) {
                    s.health--;
                    hit = true;
                }
            });
            this.shields = this.shields.filter(s => s.health > 0);

            if (!hit) {
                this.enemies.forEach(e => {
                    if (hit || !e.alive) return;
                    if (b.x < e.x + e.width && b.x + b.width > e.x &&
                        b.y < e.y + e.height && b.y + b.height > e.y) {
                        e.alive = false;
                        hit = true;
                        this.bullets.splice(bi, 1);
                        this.score += (e.type + 1) * 10;
                        this.explosions.push({ x: e.x + e.width/2, y: e.y + e.height/2, frame: 0 });
                        retroSounds.playEnemyDestroyed();
                    }
                });

                // Check UFO collision
                if (!hit && this.ufo.active) {
                    if (b.x < this.ufo.x + this.ufo.width && b.x + b.width > this.ufo.x &&
                        b.y < this.ufo.y + this.ufo.height && b.y + b.height > this.ufo.y) {
                        this.ufo.active = false;
                        hit = true;
                        this.bullets.splice(bi, 1);
                        this.score += 100;
                        this.explosions.push({ x: this.ufo.x + this.ufo.width/2, y: this.ufo.y + this.ufo.height/2, frame: 0 });
                        retroSounds.playEnemyDestroyed();
                    }
                }
            }
        });

        // Enemy bullet collision (check shields and player)
        this.enemyBullets.forEach((b, bi) => {
            let hit = false;
            // Check shield collision
            this.shields.forEach(s => {
                if (hit) return;
                if (b.x < s.x + s.width && b.x + b.width > s.x &&
                    b.y < s.y + s.height && b.y + b.height > s.y) {
                    s.health--;
                    hit = true;
                }
            });
            this.shields = this.shields.filter(s => s.health > 0);

            // Check player collision
            if (!hit) {
                if (b.x < this.player.x + this.player.width && b.x + b.width > this.player.x &&
                    b.y < this.player.y + this.player.height && b.y + b.height > this.player.y) {
                    this.enemyBullets.splice(bi, 1);
                    this.lives--;
                    this.explosions.push({ x: this.player.x + this.player.width/2, y: this.player.y + this.player.height/2, frame: 0 });
                    retroSounds.playPlayerDestroyed();
                    if (this.lives <= 0) {
                        this.gameOver = true;
                        if (this.score > this.highScore) {
                            this.highScore = this.score;
                            localStorage.setItem('invaders_highscore', this.highScore);
                        }
                    }
                }
            }
        });

        // Enemies reached bottom
        aliveEnemies.forEach(e => {
            if (e.y + e.height >= this.player.y) {
                this.gameOver = true;
                if (this.score > this.highScore) {
                    this.highScore = this.score;
                    localStorage.setItem('invaders_highscore', this.highScore);
                }
            }
        });

        // Update explosions
        this.explosions = this.explosions.filter(exp => {
            exp.frame++;
            return exp.frame < 15;
        });
    }

    draw() {
        const ctx = this.ctx;

        // Background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Stars
        ctx.fillStyle = '#fff';
        this.starField.forEach(star => {
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 1000 + star.x) * 0.3;
            ctx.fillRect(star.x, star.y, star.size, star.size);
        });
        ctx.globalAlpha = 1;

        // Enemies
        this.enemies.forEach(e => {
            if (!e.alive) return;
            const colors = ['#0f0', '#ff0', '#f0f'];
            ctx.fillStyle = colors[e.type];
            ctx.shadowColor = colors[e.type];
            ctx.shadowBlur = 10;

            // Draw alien shape
            const x = e.x, y = e.y, w = e.width, h = e.height;
            ctx.fillRect(x + w*0.2, y, w*0.6, h*0.3);
            ctx.fillRect(x, y + h*0.3, w, h*0.4);
            ctx.fillRect(x + w*0.15, y + h*0.7, w*0.2, h*0.3);
            ctx.fillRect(x + w*0.65, y + h*0.7, w*0.2, h*0.3);
            // Eyes
            ctx.fillStyle = '#000';
            ctx.fillRect(x + w*0.3, y + h*0.35, w*0.12, h*0.15);
            ctx.fillRect(x + w*0.58, y + h*0.35, w*0.12, h*0.15);
        });
        ctx.shadowBlur = 0;

        // Player ship
        if (!this.gameOver) {
            const px = this.player.x, py = this.player.y, pw = this.player.width, ph = this.player.height;
            ctx.fillStyle = '#0ff';
            ctx.shadowColor = '#0ff';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.moveTo(px + pw/2, py);
            ctx.lineTo(px + pw, py + ph);
            ctx.lineTo(px, py + ph);
            ctx.closePath();
            ctx.fill();
            // Turret
            ctx.fillRect(px + pw/2 - 2, py - 5, 4, 8);
            ctx.shadowBlur = 0;
        }

        // UFO
        if (this.ufo.active) {
            ctx.fillStyle = '#f00';
            ctx.shadowColor = '#f00';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.ellipse(this.ufo.x + this.ufo.width/2, this.ufo.y + this.ufo.height/2, this.ufo.width/2, this.ufo.height/2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillRect(this.ufo.x + this.ufo.width/4, this.ufo.y + this.ufo.height/3, this.ufo.width/2, 2);
            ctx.shadowBlur = 0;
        }

        // Player bullets
        ctx.fillStyle = '#0ff';
        ctx.shadowColor = '#0ff';
        ctx.shadowBlur = 10;
        this.bullets.forEach(b => {
            ctx.fillRect(b.x, b.y, b.width, b.height);
        });

        // Enemy bullets
        ctx.fillStyle = '#f44';
        ctx.shadowColor = '#f44';
        this.enemyBullets.forEach(b => {
            ctx.fillRect(b.x, b.y, b.width, b.height);
        });
        ctx.shadowBlur = 0;

        // Shields
        this.shields.forEach(s => {
            const alpha = s.health / 3;
            ctx.fillStyle = `rgba(0, 255, 100, ${alpha})`;
            ctx.shadowColor = '#0f6';
            ctx.shadowBlur = 5;
            ctx.fillRect(s.x, s.y, s.width, s.height);
        });
        ctx.shadowBlur = 0;

        // Explosions
        this.explosions.forEach(exp => {
            const progress = exp.frame / 15;
            ctx.strokeStyle = `rgba(255, ${Math.floor(255*(1-progress))}, 0, ${1-progress})`;
            ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 + progress * 2;
                const len = 20 * progress;
                ctx.beginPath();
                ctx.moveTo(exp.x + Math.cos(angle) * len * 0.5, exp.y + Math.sin(angle) * len * 0.5);
                ctx.lineTo(exp.x + Math.cos(angle) * len, exp.y + Math.sin(angle) * len);
                ctx.stroke();
            }
        });

        // Lives
        ctx.fillStyle = '#0ff';
        ctx.font = '14px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(`LIVES: ${'♥'.repeat(this.lives)}`, 15, 30);
        ctx.fillText(`LEVEL: ${this.level}`, 15, 55);

        // Score for enemies
        const aliveCount = this.enemies.filter(e => e.alive).length;
        ctx.textAlign = 'right';
        ctx.fillText(`ENEMIES: ${aliveCount}`, this.canvas.width - 15, 30);

        // Start message
        if (!this.gameStarted && !this.gameOver) {
            ctx.fillStyle = '#0f0';
            ctx.font = '16px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('PRESS ENTER TO START', this.canvas.width / 2, this.canvas.height / 2 + 50);
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
        if (e.key === 'Enter' && !this.gameStarted && !this.gameOver) {
            this.gameStarted = true;
            retroSounds.init();
            retroSounds.playStart();
        }
        if (['ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(e.key)) {
            e.preventDefault();
        }
    }

    handleKeyUp(e) {
        this.keys[e.key] = false;
    }
}