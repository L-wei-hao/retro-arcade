/*
 * ORBIT IMPACT - Original monochrome side-scrolling shooter
 * Inspired by early mobile-phone shmups. All sprites are simple generated pixel shapes.
 */
class OrbitImpactGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 320;
        this.height = 208;
        this.scale = 1;
        this.keys = {};
        this.pointer = { active: false, x: 0, y: 0 };
        this.highScore = parseInt(localStorage.getItem('orbitImpactHighScore') || '0', 10);
        this.topScores = JSON.parse(localStorage.getItem('orbitImpactTopScores') || '[]');
        this.themeNames = [
            'OUTER ORBIT', 'ASTEROID BELT', 'LUNAR TUNNEL', 'ALIEN OUTPOST',
            'ICE PLANET', 'MAGMA CORE', 'MECHANICAL HIVE', 'FINAL MOTHERSHIP'
        ];
        this.weaponNames = ['ROCKET', 'BOMB', 'BEAM'];
        this.levelDuration = 125000;
        this.maxEntities = { bullets: 80, enemyBullets: 70, enemies: 55, powerups: 18, particles: 90 };
        this.mobileControls = null;
        this.palette = {
            bg0: '#050515',
            bg1: '#0a1033',
            bg2: '#1b0f3f',
            cyan: '#00f7ff',
            magenta: '#ff4fd8',
            yellow: '#ffe45c',
            green: '#67ff8c',
            red: '#ff6b7a',
            blue: '#72a7ff',
            panel: 'rgba(6, 8, 28, 0.94)'
        };
    }

    init() {
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx.imageSmoothingEnabled = false;
        this.makePools();
        this.createMobileControls();
        this.reset();
    }

    reset() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.levelTime = 0;
        this.elapsed = 0;
        this.lastTs = 0;
        this.spawnTimer = 600;
        this.powerTimer = 5000;
        this.fireTimer = 0;
        this.rapidTimer = 0;
        this.shieldTimer = 0;
        this.hitGrace = 1500;
        this.message = 'ORBIT IMPACT';
        this.messageTimer = 2500;
        this.state = 'title';
        this.gameStarted = false;
        this.gameOver = false;
        this.paused = false;
        this.levelClearTimer = 0;
        this.scroll = 0;
        this.warningTimer = 0;
        this.boss = null;
        this.player = { x: 34, y: 96, w: 16, h: 10, speed: 92, hp: 3, maxHp: 3 };
        this.specialIndex = 0;
        this.ammo = { rocket: 8, bomb: 3, beam: 70 };
        this.clearPools();
        this.seedStars();
    }

    makePools() {
        const make = (n) => Array.from({ length: n }, () => ({ active: false }));
        this.bullets = make(this.maxEntities.bullets);
        this.enemyBullets = make(this.maxEntities.enemyBullets);
        this.enemies = make(this.maxEntities.enemies);
        this.powerups = make(this.maxEntities.powerups);
        this.particles = make(this.maxEntities.particles);
    }

    clearPools() {
        [this.bullets, this.enemyBullets, this.enemies, this.powerups, this.particles].forEach(pool => pool.forEach(o => o.active = false));
    }

    seedStars() {
        const starColors = [this.palette.cyan, this.palette.magenta, this.palette.yellow, '#ffffff'];
        this.stars = Array.from({ length: 58 }, (_, i) => ({
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            z: 0.25 + (i % 4) * 0.25,
            blink: Math.random() * 10,
            color: starColors[i % starColors.length]
        }));
    }

    applyDifficulty(config) {
        if (!config) return;
        this.diff = config;
    }

    normalizeKey(k) {
        const legacy = { Left: 'ArrowLeft', Right: 'ArrowRight', Up: 'ArrowUp', Down: 'ArrowDown', Spacebar: ' ' };
        return legacy[k] || k;
    }

    handleKeyDown(e) {
        const k = this.normalizeKey(e.key);
        const code = this.normalizeKey(e.code);
        this.keys[k] = true;
        if (code && code !== k) this.keys[code] = true;
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Spacebar','z','Z','x','X','Enter','Escape','8','0','*','#','1','3','4','6'].includes(k)) e.preventDefault?.();
        if (k === 'Enter' && (this.state === 'title' || this.state === 'topScores')) this.startRun();
        if (k === 'Enter' && this.state === 'levelComplete') this.nextLevel();
        if ((k === 'Enter' || k === 'r' || k === 'R') && this.gameOver) this.reset();
        if (k === 'Escape' && this.gameStarted && !this.gameOver) this.togglePause();
        if ((k === 'x' || k === 'X') && this.gameStarted) this.switchWeapon();
        if ((k === 'z' || k === 'Z' || k === '4' || k === '6') && this.gameStarted) this.fireSpecial();
        if ((k === ' ' || k === 'Spacebar' || k === '1' || k === '3') && this.gameStarted) this.tryFire(true);
    }

    handleKeyUp(e) {
        const k = this.normalizeKey(e.key);
        const code = this.normalizeKey(e.code);
        this.keys[k] = false;
        if (code && code !== k) this.keys[code] = false;
    }

    startRun() {
        this.state = 'playing';
        this.gameStarted = true;
        this.gameOver = false;
        this.paused = false;
        this.message = 'LEVEL 1: OUTER ORBIT';
        this.messageTimer = 2200;
        retroSounds.playStart?.();
    }

    togglePause() {
        this.paused = !this.paused;
        this.state = this.paused ? 'paused' : 'playing';
        retroSounds.playPause?.();
    }

    switchWeapon() {
        this.specialIndex = (this.specialIndex + 1) % this.weaponNames.length;
        this.message = this.weaponNames[this.specialIndex];
        this.messageTimer = 700;
        retroSounds.playMove?.();
    }

    update(timestamp) {
        const dt = Math.min(0.033, ((timestamp || 0) - (this.lastTs || timestamp || 0)) / 1000 || 0.016);
        this.lastTs = timestamp || 0;
        if (!this.gameStarted || this.gameOver || this.paused || this.state === 'levelComplete' || this.state === 'topScores') {
            this.updateBackground(dt);
            return;
        }
        this.elapsed += dt * 1000;
        this.levelTime += dt * 1000;
        this.scroll += dt * (18 + this.level * 3);
        this.fireTimer -= dt * 1000;
        this.spawnTimer -= dt * 1000;
        this.powerTimer -= dt * 1000;
        this.messageTimer = Math.max(0, this.messageTimer - dt * 1000);
        this.rapidTimer = Math.max(0, this.rapidTimer - dt * 1000);
        this.shieldTimer = Math.max(0, this.shieldTimer - dt * 1000);
        this.hitGrace = Math.max(0, this.hitGrace - dt * 1000);
        this.warningTimer = Math.max(0, this.warningTimer - dt * 1000);

        this.updateBackground(dt);
        this.updatePlayer(dt);
        if (this.isFireHeld()) this.tryFire(false);
        this.updateBullets(dt);
        this.updateEnemies(dt);
        this.updatePowerups(dt);
        this.updateParticles(dt);
        this.updateBoss(dt);
        this.checkCollisions();

        if (!this.boss && this.levelTime > this.levelDuration) this.spawnBoss();
        if (this.spawnTimer <= 0 && !this.boss) this.spawnWave();
        if (this.powerTimer <= 0) this.spawnPowerup();
    }

    isFireHeld() { return this.keys[' '] || this.keys.Spacebar || this.keys['1'] || this.keys['3']; }

    updatePlayer(dt) {
        let mx = 0, my = 0;
        if (this.keys.ArrowLeft || this.keys.a || this.keys.A || this.keys['*']) mx--;
        if (this.keys.ArrowRight || this.keys.d || this.keys.D || this.keys['#']) mx++;
        if (this.keys.ArrowUp || this.keys.w || this.keys.W || this.keys['8']) my--;
        if (this.keys.ArrowDown || this.keys.s || this.keys.S || this.keys['0']) my++;
        const len = Math.hypot(mx, my) || 1;
        this.player.x = Math.max(4, Math.min(this.width - this.player.w - 4, this.player.x + (mx / len) * this.player.speed * dt));
        this.player.y = Math.max(22, Math.min(this.height - this.player.h - 6, this.player.y + (my / len) * this.player.speed * dt));
    }

    tryFire(manual) {
        const cooldown = this.rapidTimer > 0 ? 95 : 185;
        if (this.fireTimer > 0) return;
        this.fireTimer = cooldown;
        this.spawnBullet(this.player.x + this.player.w, this.player.y + 4, 150, 0, 1, 'laser');
        retroSounds.playPlayerShoot?.();
    }

    fireSpecial() {
        if (this.paused || this.gameOver || this.state !== 'playing') return;
        const weapon = this.weaponNames[this.specialIndex];
        if (weapon === 'ROCKET') {
            if (this.ammo.rocket <= 0) return this.noAmmo();
            this.ammo.rocket--;
            this.spawnBullet(this.player.x + this.player.w, this.player.y + 3, 120, 0, 4, 'rocket', 8, 4);
            retroSounds.playLaser?.();
        } else if (weapon === 'BOMB') {
            if (this.ammo.bomb <= 0) return this.noAmmo();
            this.ammo.bomb--;
            this.spawnBullet(this.player.x + this.player.w, this.player.y + 5, 95, 0, 2, 'bomb', 7, 7);
            retroSounds.playEnemyShoot?.();
        } else {
            if (this.ammo.beam < 15) return this.noAmmo();
            this.ammo.beam -= 15;
            this.spawnBullet(this.player.x + this.player.w, this.player.y + 4, 240, 0, 2, 'beam', this.width, 3, 0.16);
            retroSounds.playLaser?.();
        }
    }

    noAmmo() {
        this.message = 'NO AMMO';
        this.messageTimer = 600;
        retroSounds.playLock?.();
    }

    spawnBullet(x, y, vx, vy, damage, type, w = 6, h = 2, life = 3) {
        const b = this.bullets.find(o => !o.active); if (!b) return;
        Object.assign(b, { active: true, x, y, vx, vy, w, h, damage, type, life });
    }

    spawnEnemyBullet(x, y, vx, vy, w = 4, h = 3) {
        const b = this.enemyBullets.find(o => !o.active); if (!b) return;
        Object.assign(b, { active: true, x, y, vx, vy, w, h, life: 5 });
    }

    spawnWave() {
        const count = Math.min(2 + Math.floor(this.level / 2), 5);
        const patterns = ['straight', 'sine', 'chaser', 'shooter', 'durable'];
        for (let i = 0; i < count; i++) {
            const type = patterns[(Math.floor(Math.random() * patterns.length) + this.level + i) % patterns.length];
            this.spawnEnemy(type, this.width + i * 26, 28 + Math.random() * (this.height - 58));
        }
        this.spawnTimer = Math.max(450, 1650 - this.level * 120 - Math.random() * 400);
    }

    spawnEnemy(type, x, y) {
        const e = this.enemies.find(o => !o.active); if (!e) return;
        const hp = type === 'durable' ? 5 + this.level : type === 'shooter' ? 3 + Math.floor(this.level / 2) : 2 + Math.floor(this.level / 3);
        Object.assign(e, { active: true, type, x, y, baseY: y, w: type === 'durable' ? 17 : 13, h: type === 'durable' ? 13 : 10, hp, maxHp: hp, t: 0, shoot: 900 + Math.random() * 1200, value: 70 + hp * 16 });
    }

    spawnPowerup() {
        const types = ['health', 'ammo', 'rapid', 'shield', 'score'];
        const p = this.powerups.find(o => !o.active); if (!p) return;
        Object.assign(p, { active: true, type: types[Math.floor(Math.random() * types.length)], x: this.width + 8, y: 30 + Math.random() * (this.height - 60), w: 9, h: 9, vx: -34, t: 0 });
        this.powerTimer = 9000 + Math.random() * 7000;
    }

    spawnBoss() {
        this.warningTimer = 3500;
        this.message = 'BOSS WARNING';
        this.messageTimer = 3500;
        retroSounds.playLevelUp?.();
        const hp = 45 + this.level * 18;
        this.boss = { x: this.width + 50, y: 54, w: 48, h: 72, hp, maxHp: hp, phase: 0, t: 0, shoot: 900, entering: true };
    }

    updateBackground(dt) {
        for (const s of this.stars) {
            s.x -= (12 + this.level * 2) * s.z * dt;
            s.blink += dt;
            if (s.x < 0) { s.x = this.width; s.y = Math.random() * this.height; }
        }
    }

    updateBullets(dt) {
        for (const pool of [this.bullets, this.enemyBullets]) for (const b of pool) if (b.active) {
            b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
            if (b.x > this.width + 10 || b.x < -20 || b.y < -20 || b.y > this.height + 20 || b.life <= 0) b.active = false;
        }
    }

    updateEnemies(dt) {
        for (const e of this.enemies) if (e.active) {
            e.t += dt;
            const speed = 28 + this.level * 4;
            e.x -= speed * dt;
            if (e.type === 'sine') e.y = e.baseY + Math.sin(e.t * 5) * 22;
            if (e.type === 'chaser') e.y += Math.sign((this.player.y + 4) - e.y) * (18 + this.level * 2) * dt;
            if (e.type === 'shooter' || e.type === 'durable') {
                e.shoot -= dt * 1000;
                if (e.shoot <= 0 && e.x < this.width - 10) {
                    const dy = (this.player.y - e.y) * 0.7;
                    this.spawnEnemyBullet(e.x, e.y + e.h / 2, -70, Math.max(-35, Math.min(35, dy)) / 10);
                    e.shoot = 1100 - Math.min(500, this.level * 45) + Math.random() * 500;
                    retroSounds.playEnemyShoot?.();
                }
            }
            if (e.x < -30) e.active = false;
        }
    }

    updatePowerups(dt) {
        for (const p of this.powerups) if (p.active) {
            p.t += dt; p.x += p.vx * dt; p.y += Math.sin(p.t * 4) * 0.45;
            if (p.x < -20) p.active = false;
        }
    }

    updateParticles(dt) {
        for (const p of this.particles) if (p.active) {
            p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.vx *= 0.99; p.vy *= 0.99;
            if (p.life <= 0) p.active = false;
        }
    }

    updateBoss(dt) {
        const b = this.boss; if (!b) return;
        b.t += dt; b.shoot -= dt * 1000;
        if (b.entering) { b.x -= 26 * dt; if (b.x <= this.width - b.w - 12) b.entering = false; }
        else b.y = 40 + Math.sin(b.t * (1.3 + this.level * 0.05)) * 44;
        b.phase = b.hp < b.maxHp * 0.35 ? 2 : b.hp < b.maxHp * 0.68 ? 1 : 0;
        if (b.shoot <= 0 && !b.entering) {
            if (b.phase === 0) {
                this.spawnEnemyBullet(b.x, b.y + 15, -86, -10); this.spawnEnemyBullet(b.x, b.y + 55, -86, 10);
            } else if (b.phase === 1) {
                for (let i = -2; i <= 2; i++) this.spawnEnemyBullet(b.x, b.y + 36, -74, i * 16, 4, 4);
            } else {
                this.spawnEnemyBullet(b.x, b.y + 12, -108, -22); this.spawnEnemyBullet(b.x, b.y + 36, -118, 0); this.spawnEnemyBullet(b.x, b.y + 60, -108, 22);
                this.spawnEnemy('chaser', b.x - 4, b.y + 32);
            }
            b.shoot = Math.max(360, 880 - this.level * 45 - b.phase * 130);
            retroSounds.playEnemyShoot?.();
        }
    }

    checkCollisions() {
        const playerBox = this.player;
        for (const b of this.bullets) if (b.active) {
            for (const e of this.enemies) if (e.active && this.overlap(b, e)) {
                e.hp -= b.damage; if (b.type !== 'beam') b.active = false;
                if (b.type === 'bomb') this.bomb(e.x, e.y);
                if (e.hp <= 0) this.killEnemy(e);
                break;
            }
            if (this.boss && b.active && this.overlap(b, this.boss)) {
                this.boss.hp -= b.damage; if (b.type !== 'beam') b.active = false;
                if (b.type === 'bomb') this.boss.hp -= 7;
                this.spark(b.x, b.y, 5);
                if (this.boss.hp <= 0) this.killBoss();
            }
        }
        for (const e of this.enemies) if (e.active && this.overlap(e, playerBox)) { e.active = false; this.damagePlayer(); }
        for (const b of this.enemyBullets) if (b.active && this.overlap(b, playerBox)) { b.active = false; this.damagePlayer(); }
        for (const p of this.powerups) if (p.active && this.overlap(p, playerBox)) this.collectPowerup(p);
    }

    overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

    killEnemy(e) {
        this.score += e.value;
        e.active = false;
        this.spark(e.x + e.w / 2, e.y + e.h / 2, 10);
        if (Math.random() < 0.07) this.spawnPowerup();
        retroSounds.playEnemyDestroyed?.();
    }

    killBoss() {
        this.score += 2500 + this.level * 600;
        this.spark(this.boss.x + 24, this.boss.y + 36, 40);
        this.boss = null;
        retroSounds.playExplosion?.();
        if (this.level >= 8) return this.winGame();
        this.state = 'levelComplete';
        this.levelClearTimer = 0;
        this.message = `LEVEL ${this.level} COMPLETE`;
        this.messageTimer = 999999;
    }

    bomb(x, y) {
        this.spark(x, y, 22);
        for (const e of this.enemies) if (e.active && Math.hypot(e.x - x, e.y - y) < 44) { e.hp -= 4; if (e.hp <= 0) this.killEnemy(e); }
        if (this.boss) {
            const bx = this.boss.x + this.boss.w / 2;
            const by = this.boss.y + this.boss.h / 2;
            const cx = x + 4;
            const cy = y + 4;
            if (Math.hypot(bx - cx, by - cy) < 72) this.boss.hp -= 8;
            if (this.boss.hp <= 0) this.killBoss();
        }
        retroSounds.playExplosion?.();
    }

    damagePlayer() {
        if (this.shieldTimer > 0 || this.hitGrace > 0) { this.spark(this.player.x, this.player.y, 6); return; }
        this.lives--;
        this.hitGrace = 1500;
        this.spark(this.player.x, this.player.y, 18);
        retroSounds.playPlayerDestroyed?.();
        if (this.lives <= 0) this.endGame();
    }

    collectPowerup(p) {
        p.active = false;
        this.score += 120;
        if (p.type === 'health') this.lives = Math.min(5, this.lives + 1);
        if (p.type === 'ammo') { this.ammo.rocket += 3; this.ammo.bomb += 1; this.ammo.beam = Math.min(99, this.ammo.beam + 25); }
        if (p.type === 'rapid') this.rapidTimer = 9000;
        if (p.type === 'shield') this.shieldTimer = 8500;
        if (p.type === 'score') this.score += 900;
        this.message = p.type.toUpperCase();
        this.messageTimer = 850;
        retroSounds.playPowerUp?.();
    }

    nextLevel() {
        this.level++;
        this.levelTime = 0;
        this.spawnTimer = 900;
        this.powerTimer = 4500;
        this.boss = null;
        this.state = 'playing';
        this.message = `LEVEL ${this.level}: ${this.themeNames[this.level - 1]}`;
        this.messageTimer = 2300;
        this.clearPools();
        this.player.x = 34; this.player.y = 96;
        this.hitGrace = 1500;
        retroSounds.playStart?.();
    }

    winGame() {
        const bonus = this.lives * 1500 + Math.max(0, Math.floor((8 * this.levelDuration - this.elapsed) / 1000)) * 5;
        this.score += bonus;
        this.message = 'MOTHERSHIP DOWN';
        this.messageTimer = 999999;
        this.endGame(true);
        retroSounds.playWin?.();
    }

    endGame(won = false) {
        this.gameOver = true;
        this.gameStarted = false;
        this.state = won ? 'topScores' : 'gameOver';
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('orbitImpactHighScore', String(this.highScore));
        }
        this.topScores.push({ score: this.score, level: this.level, date: new Date().toLocaleDateString() });
        this.topScores = this.topScores.sort((a, b) => b.score - a.score).slice(0, 8);
        localStorage.setItem('orbitImpactTopScores', JSON.stringify(this.topScores));
        retroSounds.playGameOver?.();
    }

    spark(x, y, n) {
        for (let i = 0; i < n; i++) {
            const p = this.particles.find(o => !o.active); if (!p) return;
            const a = Math.random() * Math.PI * 2, s = 16 + Math.random() * 54;
            Object.assign(p, { active: true, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.25 + Math.random() * 0.45 });
        }
    }

    draw() {
        const c = this.ctx;
        c.save();
        c.imageSmoothingEnabled = false;
        c.fillStyle = this.palette.bg0; c.fillRect(0, 0, this.width, this.height);
        this.drawBackground(c);
        if (this.state !== 'title') {
            this.drawEntities(c);
            this.drawHUD(c);
        }
        if (this.state === 'title') this.drawTitle(c);
        if (this.state === 'paused') this.drawPanel(c, 'PAUSED', ['ESC TO RESUME', 'ENTER NOT USED']);
        if (this.state === 'levelComplete') this.drawPanel(c, 'LEVEL COMPLETE', ['ENTER: NEXT SECTOR', `BONUS +${this.lives * 250}`]);
        if (this.state === 'gameOver') this.drawTopScores(c, 'GAME OVER');
        if (this.state === 'topScores') this.drawTopScores(c, 'MISSION COMPLETE');
        if (this.messageTimer > 0 && this.state === 'playing') this.centerText(c, this.message, 94, '#00ffff');
        if (this.warningTimer > 0) this.drawWarning(c);
        this.drawLCD(c);
        c.restore();
    }

    drawBackground(c) {
        const sky = c.createLinearGradient(0, 0, 0, this.height);
        sky.addColorStop(0, this.palette.bg1);
        sky.addColorStop(0.5, this.palette.bg0);
        sky.addColorStop(1, '#03030d');
        c.fillStyle = sky;
        c.fillRect(0, 0, this.width, this.height);

        c.save();
        c.globalAlpha = 0.22;
        c.fillStyle = this.palette.cyan;
        c.beginPath();
        c.ellipse(268, 34, 30, 14, -0.3, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = this.palette.magenta;
        c.beginPath();
        c.ellipse(52, 48, 18, 8, 0.2, 0, Math.PI * 2);
        c.fill();
        c.restore();

        for (const s of this.stars) {
            const twinkle = 0.45 + Math.max(0, Math.sin(s.blink * 5));
            c.globalAlpha = twinkle * (s.z * 0.9 + 0.2);
            c.fillStyle = s.color;
            c.fillRect(Math.floor(s.x), Math.floor(s.y), s.z > 0.75 ? 2 : 1, s.z > 0.6 ? 2 : 1);
        }
        c.globalAlpha = 1;

        c.strokeStyle = 'rgba(0, 247, 255, 0.14)';
        for (let y = 22; y < this.height; y += 18) {
            c.beginPath();
            c.moveTo(0, y);
            c.lineTo(this.width, y);
            c.stroke();
        }

        c.strokeStyle = 'rgba(255, 79, 216, 0.18)';
        for (let x = (this.scroll * 0.18) % 32; x < this.width; x += 32) {
            c.beginPath();
            c.moveTo(x, 18);
            c.lineTo(x + 10, this.height);
            c.stroke();
        }

        const theme = this.level;
        c.save();
        c.globalAlpha = 0.65;
        if (theme === 2) for (let i = 0; i < 9; i++) this.rock(c, (i * 47 - this.scroll * 0.45) % 370 - 30, 30 + (i * 31) % 150, 8 + (i % 3) * 4);
        if (theme === 3 || theme === 6) {
            c.fillStyle = 'rgba(10, 16, 51, 0.78)';
            c.fillRect(0, 20, this.width, 16);
            c.fillRect(0, this.height - 18, this.width, 18);
            c.strokeStyle = 'rgba(0, 247, 255, 0.24)';
            c.strokeRect(0, 20, this.width, 16);
            c.strokeRect(0, this.height - 18, this.width, 18);
        }
        if (theme === 4 || theme === 7 || theme === 8) {
            c.strokeStyle = 'rgba(103, 255, 140, 0.22)';
            for (let x = -30 + (this.scroll % 40); x < this.width; x += 40) {
                c.strokeRect(x, 28, 28, 10);
                c.strokeRect(x + 12, 168, 36, 12);
            }
        }
        if (theme === 5) {
            c.strokeStyle = 'rgba(255, 228, 92, 0.24)';
            for (let x = -20 + (this.scroll % 55); x < this.width; x += 55) {
                c.beginPath();
                c.moveTo(x, 185);
                c.lineTo(x + 20, 160);
                c.lineTo(x + 42, 185);
                c.stroke();
            }
        }
        c.restore();
    }

    drawEntities(c) {
        this.drawPlayer(c);
        for (const b of this.bullets) if (b.active) this.drawBullet(c, b, true);
        for (const b of this.enemyBullets) if (b.active) this.drawBullet(c, b, false);
        for (const e of this.enemies) if (e.active) this.drawEnemy(c, e);
        for (const p of this.powerups) if (p.active) this.drawPower(c, p);
        if (this.boss) this.drawBoss(c, this.boss);
        c.fillStyle = '#00ffff'; for (const p of this.particles) if (p.active) c.fillRect(p.x, p.y, 2, 2);
    }

    drawPlayer(c) {
        const p = this.player;
        const hull = this.hitGrace > 0 && Math.floor(this.hitGrace / 80) % 2 ? this.palette.blue : this.palette.cyan;
        c.save();
        c.shadowColor = hull;
        c.shadowBlur = 6;
        c.fillStyle = hull;
        c.fillRect(p.x + 2, p.y + 3, 11, 4);
        c.fillRect(p.x + 6, p.y + 1, 7, 8);
        c.fillRect(p.x + 12, p.y + 4, 5, 2);
        c.fillRect(p.x - 2, p.y + 4, 4, 2);
        c.fillStyle = this.palette.magenta;
        c.fillRect(p.x + 7, p.y + 3, 3, 2);
        c.fillStyle = this.palette.yellow;
        c.fillRect(p.x - 4, p.y + 4, 2, 2);
        c.fillRect(p.x + 15, p.y + 4, 2, 2);
        c.shadowBlur = 0;
        c.strokeStyle = 'rgba(255,255,255,0.6)';
        c.strokeRect(p.x + 1, p.y + 2, 13, 6);
        if (this.shieldTimer > 0) {
            c.strokeStyle = this.palette.cyan;
            c.strokeRect(p.x - 5, p.y - 5, p.w + 10, p.h + 10);
            c.strokeRect(p.x - 7, p.y - 7, p.w + 14, p.h + 14);
        }
        c.restore();
    }

    drawEnemy(c, e) {
        const glow = e.type === 'durable' ? this.palette.yellow : (e.type === 'shooter' ? this.palette.red : e.type === 'chaser' ? this.palette.green : this.palette.magenta);
        c.save();
        c.shadowColor = glow;
        c.shadowBlur = 5;
        c.fillStyle = glow;
        if (e.type === 'sine') {
            c.fillRect(e.x, e.y + 3, 13, 4);
            c.fillRect(e.x + 4, e.y, 5, 10);
            c.fillStyle = this.palette.cyan;
            c.fillRect(e.x + 6, e.y + 3, 2, 2);
        } else if (e.type === 'chaser') {
            c.fillRect(e.x, e.y + 1, 8, 8);
            c.fillRect(e.x + 8, e.y + 3, 5, 3);
            c.fillStyle = this.palette.cyan;
            c.fillRect(e.x + 2, e.y + 3, 2, 2);
        } else if (e.type === 'shooter') {
            c.fillRect(e.x, e.y + 1, 12, 8);
            c.fillRect(e.x - 4, e.y + 4, 5, 2);
            c.fillStyle = this.palette.yellow;
            c.fillRect(e.x + 4, e.y + 3, 4, 2);
        } else if (e.type === 'durable') {
            c.fillRect(e.x, e.y, 17, 13);
            c.fillStyle = '#111';
            c.fillRect(e.x + 3, e.y + 3, 11, 7);
            c.fillStyle = this.palette.cyan;
            c.fillRect(e.x + 5, e.y + 5, 6, 2);
        } else {
            c.fillRect(e.x, e.y + 2, 11, 6);
            c.fillRect(e.x + 10, e.y + 4, 4, 2);
        }
        c.shadowBlur = 0;
        c.strokeStyle = 'rgba(255,255,255,0.35)';
        c.strokeRect(e.x - 1, e.y - 1, e.w + 2, e.h + 2);
        c.fillStyle = this.palette.cyan;
        c.fillRect(e.x, e.y - 3, Math.max(1, e.w * (e.hp / e.maxHp)), 1);
        c.restore();
    }

    drawBoss(c, b) {
        c.save();
        c.shadowColor = this.palette.magenta;
        c.shadowBlur = 8;
        c.strokeStyle = this.palette.cyan;
        c.fillStyle = this.palette.red;
        c.strokeRect(b.x, b.y, b.w, b.h);
        c.fillRect(b.x + 8, b.y + 8, 24, 8);
        c.fillRect(b.x + 5, b.y + 28, 35, 12);
        c.fillRect(b.x + 10, b.y + 52, 28, 8);
        c.fillStyle = this.palette.cyan;
        c.fillRect(b.x - 8, b.y + 14, 8, 4);
        c.fillRect(b.x - 8, b.y + 54, 8, 4);
        c.fillStyle = this.palette.yellow;
        c.fillRect(b.x + 18, b.y + 18, 12, 10);
        c.shadowBlur = 0;
        c.strokeStyle = 'rgba(255,255,255,0.55)';
        c.strokeRect(94, 13, 128, 5);
        c.fillStyle = this.palette.magenta;
        c.fillRect(95, 14, 126 * Math.max(0, b.hp / b.maxHp), 3);
        c.restore();
    }

    drawBullet(c, b, own) {
        c.save();
        c.shadowColor = own ? this.palette.cyan : this.palette.red;
        c.shadowBlur = 4;
        c.fillStyle = own ? this.palette.cyan : this.palette.red;
        if (b.type === 'beam') { c.fillRect(b.x, b.y, b.w, b.h); c.fillRect(b.x, b.y - 2, b.w, 1); }
        else if (b.type === 'rocket') { c.fillRect(b.x, b.y, b.w, b.h); c.fillRect(b.x - 2, b.y + 1, 2, 2); }
        else if (b.type === 'bomb') { c.strokeStyle = own ? this.palette.cyan : this.palette.red; c.strokeRect(b.x, b.y, b.w, b.h); }
        else c.fillRect(b.x, b.y, b.w, b.h);
        c.restore();
    }

    drawPower(c, p) {
        const pc = { health: '#00ff66', ammo: '#ffea00', rapid: '#00ffff', shield: '#ff00ff', score: '#ffffff' }[p.type];
        c.strokeStyle = pc; c.fillStyle = pc; c.strokeRect(p.x, p.y, p.w, p.h);
        const letter = { health: '+', ammo: 'A', rapid: 'R', shield: 'S', score: '$' }[p.type];
        c.font = '7px monospace'; c.fillText(letter, p.x + 2, p.y + 7);
    }

    drawHUD(c) {
        c.fillStyle = 'rgba(6, 8, 28, 0.92)'; c.fillRect(0, 0, this.width, 18);
        c.strokeStyle = this.palette.cyan; c.strokeRect(0, 0, this.width, 18);
        c.fillStyle = this.palette.cyan; c.font = '8px "Press Start 2P", monospace';
        c.fillText(`L${this.level} ${this.themeNames[this.level - 1]}`, 5, 12);
        c.fillText(`♥${this.lives}`, 143, 12);
        c.fillText(`${this.weaponNames[this.specialIndex]} ${this.ammoText()}`, 171, 12);
        c.fillText(String(this.score).padStart(6, '0'), 270, 12);
        c.fillStyle = this.palette.magenta; c.fillRect(5, 18, Math.min(310, 310 * (this.levelTime / this.levelDuration)), 2);
    }

    ammoText() { return this.specialIndex === 0 ? this.ammo.rocket : this.specialIndex === 1 ? this.ammo.bomb : this.ammo.beam; }

    drawTitle(c) {
        c.save();
        c.fillStyle = 'rgba(5, 5, 21, 0.55)';
        c.fillRect(18, 26, 284, 146);
        c.strokeStyle = 'rgba(0, 247, 255, 0.35)';
        c.strokeRect(18, 26, 284, 146);
        this.centerText(c, 'ORBIT IMPACT', 55, this.palette.cyan, '20px "Press Start 2P", monospace');
        this.centerText(c, 'NEON SPACE RUNNER', 77, this.palette.magenta, '10px "Press Start 2P", monospace');
        this.centerText(c, 'ENTER TO LAUNCH', 102, this.palette.yellow, '10px "Press Start 2P", monospace');
        this.drawPanel(c, '', ['ARROWS/WASD MOVE  SPACE FIRE', 'Z SPECIAL  X SWITCH  ESC PAUSE', 'MOBILE BUTTONS ENABLED']);
        c.restore();
    }

    drawTopScores(c, title) {
        const lines = [`SCORE ${this.score}`, `HIGH ${this.highScore}`, '', 'TOP SCORES'];
        this.topScores.slice(0, 5).forEach((s, i) => lines.push(`${i + 1}. ${String(s.score).padStart(6, '0')}  L${s.level}`));
        lines.push('', 'ENTER/R: RESTART');
        this.drawPanel(c, title, lines);
    }

    drawPanel(c, title, lines) {
        c.fillStyle = this.palette.panel; c.fillRect(34, 45, 252, 118);
        c.strokeStyle = this.palette.cyan; c.strokeRect(34, 45, 252, 118); c.strokeRect(38, 49, 244, 110);
        if (title) this.centerText(c, title, 65, this.palette.cyan, '15px "Press Start 2P", monospace');
        c.font = '8px "Press Start 2P", monospace'; c.fillStyle = this.palette.yellow;
        lines.forEach((line, i) => this.centerText(c, line, 84 + i * 11, i === 0 && !title ? this.palette.cyan : this.palette.yellow));
    }

    drawWarning(c) { if (Math.floor(this.warningTimer / 180) % 2) { c.strokeStyle = '#00ffff'; c.strokeRect(2, 21, this.width - 4, this.height - 24); } }

    drawLCD(c) {
        c.fillStyle = 'rgba(0,0,0,0.10)'; for (let y = 0; y < this.height; y += 3) c.fillRect(0, y, this.width, 1);
        c.strokeStyle = 'rgba(0, 255, 255, 0.30)'; c.strokeRect(1, 1, this.width - 2, this.height - 2);
    }

    centerText(c, text, y, color = '#00ffff', font = '9px monospace') {
        c.font = font; c.fillStyle = color; c.textAlign = 'center'; c.fillText(text, this.width / 2, y); c.textAlign = 'left';
    }

    rock(c, x, y, r) { c.strokeStyle = '#ff00ff'; c.beginPath(); c.moveTo(x, y + r/2); c.lineTo(x + r/3, y); c.lineTo(x + r, y + r/4); c.lineTo(x + r*0.8, y + r); c.lineTo(x + r/4, y + r*0.9); c.closePath(); c.stroke(); }

    createMobileControls() {
        if (this.mobileControls) return;
        const screen = document.getElementById('game-screen'); if (!screen) return;
        const pad = document.createElement('div');
        pad.className = 'orbit-mobile-controls';
        pad.innerHTML = `<div class="orbit-dpad"><button data-k="ArrowUp">▲</button><button data-k="ArrowLeft">◀</button><button data-k="ArrowDown">▼</button><button data-k="ArrowRight">▶</button></div><div class="orbit-actions"><button data-action="fire">FIRE</button><button data-action="special">Z</button><button data-action="switch">X</button></div>`;
        screen.appendChild(pad);
        const press = (key, on) => { this.keys[key] = on; };
        pad.querySelectorAll('button').forEach(btn => {
            const down = (ev) => { ev.preventDefault(); const k = btn.dataset.k; if (k) press(k, true); if (btn.dataset.action === 'fire') press(' ', true); if (btn.dataset.action === 'special') this.fireSpecial(); if (btn.dataset.action === 'switch') this.switchWeapon(); };
            const up = (ev) => { ev.preventDefault(); const k = btn.dataset.k; if (k) press(k, false); if (btn.dataset.action === 'fire') press(' ', false); };
            btn.addEventListener('pointerdown', down); btn.addEventListener('pointerup', up); btn.addEventListener('pointercancel', up); btn.addEventListener('pointerleave', up);
        });
        this.mobileControls = pad;
    }
}
