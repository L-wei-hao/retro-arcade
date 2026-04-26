/**
 * RETRO SOUND SYSTEM - Web Audio API
 * Generates classic arcade sounds programmatically
 */
class RetroSoundSystem {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.masterGain = null;
        this.initialized = false;
    }

    // Initialize audio context (must be called from user gesture)
    init() {
        if (this.initialized) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.3; // Master volume
            this.masterGain.connect(this.audioContext.destination);
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    // Resume audio context (for browsers that suspend it)
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // Create an oscillator with envelope
    playTone(frequency, duration, type = 'square', volume = 1, slide = 0) {
        if (!this.enabled || !this.initialized) return;
        this.resume();

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        if (slide !== 0) {
            osc.frequency.exponentialRampToValueAtTime(
                Math.max(1, frequency + slide),
                this.audioContext.currentTime + duration
            );
        }

        gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + duration);
    }

    // Play noise burst (for explosions)
    playNoise(duration = 0.15, volume = 1) {
        if (!this.enabled || !this.initialized) return;
        this.resume();

        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

        source.connect(gain);
        gain.connect(this.masterGain);

        source.start(this.audioContext.currentTime);
    }

    // ===== RETRO SOUND EFFECTS =====

    // Classic coin/collect sound (piano-like)
    playCollect() {
        this.playTone(988, 0.08, 'square', 0.8);
        setTimeout(() => this.playTone(1319, 0.15, 'square', 0.8), 60);
    }

    // Bonus collect (brighter, higher)
    playBonusCollect() {
        this.playTone(1319, 0.08, 'square', 0.8);
        setTimeout(() => this.playTone(1568, 0.08, 'square', 0.8), 60);
        setTimeout(() => this.playTone(1976, 0.15, 'square', 0.8), 120);
    }

    // Explosion sound
    playExplosion() {
        this.playNoise(0.2, 0.8);
        this.playTone(80, 0.2, 'sawtooth', 0.5, -40);
    }

    // Small explosion/crash
    playSmallExplosion() {
        this.playNoise(0.1, 0.5);
        this.playTone(120, 0.12, 'sawtooth', 0.3, -50);
    }

    // Laser/shoot sound
    playLaser() {
        this.playTone(1200, 0.1, 'square', 0.5, -800);
    }

    // Player shoot (lower laser)
    playPlayerShoot() {
        this.playTone(800, 0.08, 'square', 0.4, -400);
    }

    // Enemy shoot
    playEnemyShoot() {
        this.playTone(300, 0.15, 'sawtooth', 0.3, 100);
    }

    // Paddle/hit sound
    playHit() {
        this.playTone(440, 0.08, 'square', 0.6);
    }

    // Wall bounce
    playBounce() {
        this.playTone(300, 0.05, 'square', 0.3);
    }

    // Game over sound
    playGameOver() {
        this.playTone(440, 0.15, 'square', 0.6);
        setTimeout(() => this.playTone(370, 0.15, 'square', 0.6), 150);
        setTimeout(() => this.playTone(311, 0.15, 'square', 0.6), 300);
        setTimeout(() => this.playTone(261, 0.4, 'square', 0.5), 450);
    }

    // Win sound
    playWin() {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.2, 'square', 0.6), i * 120);
        });
    }

    // Start game sound
    playStart() {
        const notes = [262, 330, 392, 523];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.15, 'square', 0.5), i * 100);
        });
    }

    // Piece lock (Tetris)
    playLock() {
        this.playTone(200, 0.1, 'triangle', 0.5);
    }

    // Line clear (Tetris)
    playLineClear() {
        this.playTone(523, 0.08, 'square', 0.6);
        setTimeout(() => this.playTone(659, 0.08, 'square', 0.6), 60);
        setTimeout(() => this.playTone(784, 0.15, 'square', 0.6), 120);
    }

    // Tetris (4 lines)
    playTetris() {
        const notes = [523, 659, 784, 1047, 1319];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.15, 'square', 0.7), i * 80);
        });
    }

    // Soft drop sound
    playSoftDrop() {
        this.playTone(250, 0.03, 'triangle', 0.2);
    }

    // Hard drop sound
    playHardDrop() {
        this.playTone(150, 0.1, 'square', 0.5);
        this.playTone(100, 0.08, 'triangle', 0.3);
    }

    // Move sound (subtle)
    playMove() {
        this.playTone(220, 0.02, 'triangle', 0.1);
    }

    // Rotate sound
    playRotate() {
        this.playTone(440, 0.04, 'triangle', 0.2);
    }

    // Hard drop (Tetris)
    playHardDropTetris() {
        this.playTone(180, 0.12, 'square', 0.5);
        setTimeout(() => this.playTone(120, 0.08, 'triangle', 0.3), 50);
    }

    // Power-up collect
    playPowerUp() {
        this.playTone(660, 0.08, 'square', 0.6);
        setTimeout(() => this.playTone(880, 0.08, 'square', 0.6), 60);
        setTimeout(() => this.playTone(1100, 0.12, 'square', 0.6), 120);
    }

    // Mine click/reveal
    playReveal() {
        this.playTone(350, 0.04, 'triangle', 0.2);
    }

    // Flag place
    playFlag() {
        this.playTone(500, 0.06, 'square', 0.3);
    }

    // Mine explode
    playMineExplode() {
        this.playNoise(0.3, 0.8);
        this.playTone(60, 0.3, 'sawtooth', 0.6, -30);
    }

    // Game win (Minesweeper)
    playWinMinesweeper() {
        const notes = [523, 659, 784, 1047, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.15, 'square', 0.5), i * 100);
        });
    }

    // Paddle hit (Pong)
    playPongHit() {
        this.playTone(440, 0.06, 'square', 0.5);
    }

    // Pong score
    playPongScore() {
        this.playTone(523, 0.1, 'square', 0.5);
        setTimeout(() => this.playTone(659, 0.15, 'square', 0.5), 80);
    }

    // Pong score against (negative)
    playPongScoreAgainst() {
        this.playTone(300, 0.15, 'sawtooth', 0.4);
        setTimeout(() => this.playTone(200, 0.2, 'sawtooth', 0.4), 100);
    }

    // Pong wall bounce
    playPongBounce() {
        this.playTone(350, 0.04, 'square', 0.2);
    }

    // Pause sound
    playPause() {
        this.playTone(440, 0.08, 'square', 0.4);
        setTimeout(() => this.playTone(330, 0.08, 'square', 0.4), 80);
    }

    // Snake eat (food)
    playSnakeEat() {
        this.playTone(600, 0.05, 'square', 0.5);
        setTimeout(() => this.playTone(800, 0.08, 'square', 0.5), 40);
    }

    // Snake eat bonus food
    playSnakeBonus() {
        this.playTone(800, 0.05, 'square', 0.6);
        setTimeout(() => this.playTone(1000, 0.05, 'square', 0.6), 50);
        setTimeout(() => this.playTone(1200, 0.05, 'square', 0.6), 100);
        setTimeout(() => this.playTone(1600, 0.12, 'square', 0.6), 150);
    }

    // Snake game over
    playSnakeGameOver() {
        this.playTone(350, 0.15, 'sawtooth', 0.5);
        setTimeout(() => this.playTone(280, 0.15, 'sawtooth', 0.5), 150);
        setTimeout(() => this.playTone(200, 0.3, 'sawtooth', 0.5), 300);
    }

    // Brick break (Breakout)
    playBrickBreak() {
        this.playTone(500, 0.06, 'square', 0.4);
    }

    // Brick hit (multi-hit)
    playBrickHit() {
        this.playTone(400, 0.04, 'square', 0.3);
    }

    // Ball lose (Breakout)
    playBallLose() {
        this.playTone(300, 0.1, 'sawtooth', 0.4);
        setTimeout(() => this.playTone(200, 0.15, 'sawtooth', 0.4), 80);
    }

    // Enemy destroyed (Space Invaders)
    playEnemyDestroyed() {
        this.playTone(800, 0.05, 'square', 0.5);
        setTimeout(() => this.playTone(600, 0.05, 'square', 0.5), 30);
        setTimeout(() => this.playTone(400, 0.08, 'square', 0.5), 60);
    }

    // Player destroyed (Space Invaders)
    playPlayerDestroyed() {
        this.playNoise(0.25, 0.7);
        this.playTone(100, 0.25, 'sawtooth', 0.5, -50);
    }

    // Level up (Space Invaders)
    playLevelUp() {
        const notes = [392, 523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.12, 'square', 0.5), i * 80);
        });
    }

    // Toggle sound on/off
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

// Global sound instance
const retroSounds = new RetroSoundSystem();