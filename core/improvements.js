/**
 * RETRO ARCADE - CORE IMPROVEMENTS MODULE
 * 
 * Implements: Difficulty System, Achievement System, Leaderboard, Settings
 * Built as unified foundation for all games
 */

// ============================================================
// DIFFICULTY SYSTEM
// ============================================================

const DifficultySystem = {
    tiers: {
        easy:     { label: 'Easy',     enemySpeed: 0.7, playerSpeed: 1.2, spawnRate: 1.5, collisionTolerance: 2, scoreMultiplier: 0.8 },
        normal:   { label: 'Normal',   enemySpeed: 1.0, playerSpeed: 1.0, spawnRate: 1.0, collisionTolerance: 1, scoreMultiplier: 1.0 },
        hard:     { label: 'Hard',     enemySpeed: 1.3, playerSpeed: 0.9, spawnRate: 0.7, collisionTolerance: 0.5, scoreMultiplier: 1.5 },
        expert:   { label: 'Expert',   enemySpeed: 1.6, playerSpeed: 0.8, spawnRate: 0.5, collisionTolerance: 0.3, scoreMultiplier: 2.0 },
        insane:   { label: 'Insane',   enemySpeed: 2.0, playerSpeed: 0.7, spawnRate: 0.3, collisionTolerance: 0.1, scoreMultiplier: 3.0 }
    },

    getCurrentTier() {
        return localStorage.getItem('arcade_difficulty') || 'normal';
    },

    setTier(tier) {
        if (this.tiers[tier]) {
            localStorage.setItem('arcade_difficulty', tier);
            return true;
        }
        return false;
    },

    getConfig() {
        const tierKey = this.getCurrentTier();
        return { ...this.tiers[tierKey], key: tierKey };
    },

    getTierList() {
        return Object.keys(this.tiers).map(key => ({
            key,
            label: this.tiers[key].label
        }));
    }
};

// ============================================================
// SETTINGS SYSTEM
// ============================================================

const SettingsSystem = {
    defaults: {
        masterVolume: 75,
        musicVolume: 80,
        sfxVolume: 90,
        difficulty: 'normal',
        colorblindMode: false,
        showGrid: true,
        particleQuality: 'high',
        crtOverlay: true,
        showFPS: false
    },

    getSettings() {
        const saved = localStorage.getItem('arcade_settings');
        return saved ? { ...this.defaults, ...JSON.parse(saved) } : { ...this.defaults };
    },

    saveSettings(settings) {
        // Only save serializable properties
        const toSave = {};
        for (const key in settings) {
            if (typeof settings[key] !== 'function') {
                toSave[key] = settings[key];
            }
        }
        localStorage.setItem('arcade_settings', JSON.stringify(toSave));
    },

    resetSettings() {
        localStorage.removeItem('arcade_settings');
        return { ...this.defaults };
    },

    applyToSoundSystem(soundSystem) {
        if (!soundSystem) return;
        const settings = this.getSettings();
        if (soundSystem.masterGain) {
            soundSystem.masterGain.gain.value = settings.masterVolume / 100;
        }
        soundSystem.enabled = settings.masterVolume > 0;
    }
};

// ============================================================
// ACHIEVEMENT SYSTEM
// ============================================================

const AchievementSystem = {
    achievements: {
        // Score achievements
        first_hundred:    { name: 'First Blood',      desc: 'Score your first 100 points',  game: 'all',       type: 'score',       target: 100,    reward: 'badge' },
        thousand_scorer:  { name: 'Thousand Club',    desc: 'Score 1,000 points',           game: 'all',       type: 'score',       target: 1000,   reward: 'badge' },
        ten_k_scorer:     { name: 'Ten Grand',        desc: 'Score 10,000 points',          game: 'all',       type: 'score',       target: 10000,  reward: 'badge' },
        fifty_k_scorer:   { name: 'Fifty K',          desc: 'Score 50,000 points',          game: 'all',       type: 'score',       target: 50000,  reward: 'badge' },
        
        // Snake achievements
        snake_master:     { name: 'Snake Master',     desc: 'Play Snake for 10 minutes total', game: 'snake',    type: 'time',      target: 600,    reward: 'badge' },
        snake_long:       { name: 'Growing Pains',    desc: 'Reach length 30 in Snake',      game: 'snake',    type: 'stat',      target: 30,     reward: 'badge' },
        
        // Breakout achievements
        brick_smasher:    { name: 'Brick Smasher',   desc: 'Break 100 bricks in Breakout',  game: 'breakout', type: 'stat',      target: 100,    reward: 'badge' },
        breakout_survivor:{ name: 'Lives Left',      desc: 'Complete a level with 3 lives',  game: 'breakout', type: 'stat',      target: 3,      reward: 'badge' },
        
        // Tetris achievements
        tetris_master:    { name: 'Tetris Master',   desc: 'Clear 100 lines in Tetris',     game: 'tetris',   type: 'stat',      target: 100,    reward: 'badge' },
        tetris_tetris:    { name: 'Tetris!',         desc: 'Clear 4 lines at once',           game: 'tetris',   type: 'stat',      target: 4,      reward: 'badge' },
        
        // Speed achievements
        speed_demon:      { name: 'Speed Demon',     desc: 'Score 500 points in under 30 seconds', game: 'all', type: 'speed', target: 500, timeLimit: 30, reward: 'badge' },
        quick_start:      { name: 'Quick Start',     desc: 'Start your first game',           game: 'all',    type: 'action',    target: 1,      reward: 'badge' },
        
        // Collection achievements
        high_roller:      { name: 'High Roller',     desc: 'Reach any high score',          game: 'all',    type: 'highscore', target: 1,      reward: 'badge' },
    },

    getProgress() {
        const progress = localStorage.getItem('arcade_achievement_progress');
        return progress ? JSON.parse(progress) : {};
    },

    saveProgress(progress) {
        localStorage.setItem('arcade_achievement_progress', JSON.stringify(progress));
    },

    unlockAchievement(achievementKey, extraData = {}) {
        const achievement = this.achievements[achievementKey];
        if (!achievement) return false;

        let progress = this.getProgress();
        if (!progress.unlocked) progress.unlocked = [];
        if (!progress.stats) progress.stats = {};

        // Check if already unlocked
        if (progress.unlocked.includes(achievementKey)) return false;

        // Check unlock conditions
        if (this.canUnlock(achievementKey, progress, extraData)) {
            progress.unlocked.push(achievementKey);
            
            // Update stats
            if (!progress.stats.unlockedCount) progress.stats.unlockedCount = 0;
            progress.stats.unlockedCount++;

            this.saveProgress(progress);
            
            // Notify
            console.log(`🏆 Achievement Unlocked: ${achievement.name}`);
            return true;
        }

        return false;
    },

    canUnlock(key, progress, extraData) {
        const achievement = this.achievements[key];
        const stats = progress.stats || {};

        switch (achievement.type) {
            case 'score':
                const gameScore = extraData.score || (stats[achievement.game + '_highscore'] || 0);
                return gameScore >= achievement.target;
            
            case 'time':
                const gameTime = stats[achievement.game + '_playtime'] || 0;
                return gameTime >= achievement.target;
            
            case 'stat':
                const gameStat = stats[achievement.game + '_' + key] || 0;
                return gameStat >= achievement.target;
            
            case 'speed':
                return extraData.time <= achievement.timeLimit && extraData.score >= achievement.target;
            
            case 'highscore':
                return stats.any_highscore >= achievement.target;
            
            case 'action':
                return true; // Actions are auto-unlocked
            
            default:
                return true;
        }
    },

    getUnlockedCount() {
        const progress = this.getProgress();
        return (progress.unlocked || []).length;
    },

    getTotalCount() {
        return Object.keys(this.achievements).length;
    },

    getProgressPercent() {
        return (this.getUnlockedCount() / this.getTotalCount()) * 100;
    }
};

// ============================================================
// LEADERBOARD SYSTEM
// ============================================================

const LeaderboardSystem = {
    getEntryKey(game) {
        return `arcade_leaderboard_${game}`;
    },

    getLeaderboard(game, limit = 10) {
        const entry = localStorage.getItem(this.getEntryKey(game));
        if (!entry) return [];
        return JSON.parse(entry).slice(0, limit);
    },

    addScore(game, score, difficulty, date) {
        let leaderboard = this.getLeaderboard(game);
        
        const entry = {
            score: score,
            difficulty: difficulty || DifficultySystem.getCurrentTier(),
            date: date || new Date().toISOString(),
            timestamp: Date.now()
        };

        // Check if this score qualifies
        const minScore = leaderboard.length < 10 ? 0 : leaderboard[leaderboard.length - 1].score;
        if (leaderboard.length >= 10 && score < minScore) return false;

        leaderboard.push(entry);
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard = leaderboard.slice(0, 10);

        localStorage.setItem(this.getEntryKey(game), JSON.stringify(leaderboard));
        return true;
    },

    getTopScore(game) {
        const leaderboard = this.getLeaderboard(game);
        return leaderboard.length > 0 ? leaderboard[0].score : 0;
    },

    exportScore(game, index = 0) {
        const leaderboard = this.getLeaderboard(game);
        if (leaderboard[index]) {
            const entry = leaderboard[index];
            const text = `🎮 Retro Arcade - ${game}\n🏆 Score: ${entry.score}\n📊 Difficulty: ${entry.difficulty}\n📅 ${new Date(entry.date).toLocaleDateString()}`;
            
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text);
            }
            return text;
        }
        return null;
    },

    clearLeaderboard(game) {
        localStorage.removeItem(this.getEntryKey(game));
    }
};

// ============================================================
// TUTORIAL/HINT SYSTEM
// ============================================================

const TutorialSystem = {
    tutorials: {
        snake: {
            title: '🐍 Snake',
            steps: [
                'Press ENTER or any arrow key to start',
                'Use Arrow Keys or WASD to move',
                'Eat the red food to grow longer',
                'Avoid hitting walls or yourself',
                'Golden stars give bonus points!'
            ],
            completedKey: 'snake_tutorial_done'
        },
        breakout: {
            title: '🧱 Breakout',
            steps: [
                'Press ENTER or SPACE to launch the ball',
                'Use Arrow Keys or A/D to move the paddle',
                'Break all the colored bricks to win',
                'Catch power-ups for special abilities!',
                'You have 3 lives - use them wisely'
            ],
            completedKey: 'breakout_tutorial_done'
        },
        spaceinvaders: {
            title: '👾 Space Invaders',
            steps: [
                'Press ENTER to start',
                'Arrow Keys or A/D to move your ship',
                'SPACE or Enter to fire lasers',
                'Destroy all aliens to advance',
                'Shields degrade over time - use them wisely!',
                'Watch out for the mysterious UFO!'
            ],
            completedKey: 'invaders_tutorial_done'
        },
        orbitimpact: {
            title: '▻ Orbit Impact',
            steps: [
                'Press ENTER to start the mission',
                'Arrow Keys or WASD move within the auto-scrolling screen',
                'SPACE fires your basic laser',
                'Z uses Rocket, Bomb, or Beam ammo; X switches weapon',
                'Collect +, A, R, S, and $ power-ups',
                'Survive each sector and defeat the boss at the end'
            ],
            completedKey: 'orbitimpact_tutorial_done'
        },
        tetris: {
            title: '🟦 Tetris',
            steps: [
                'Press ENTER to start',
                'Arrow Keys to move and rotate pieces',
                'Complete horizontal lines to clear them',
                'SPACE for hard drop (instant place)',
                'C to hold a piece for later',
                'Clear more lines for higher scores!'
            ],
            completedKey: 'tetris_tutorial_done'
        },
        pong: {
            title: '🏓 Pong',
            steps: [
                'Press ENTER to start',
                'Arrow Keys or WASD to move your paddle',
                'Score by getting the ball past your opponent',
                'First to win the best of rounds takes it',
                'Angle your shots by hitting with paddle edges'
            ],
            completedKey: 'pong_tutorial_done'
        },
        minesweeper: {
            title: '💣 Minesweeper',
            steps: [
                'Left click to reveal a cell',
                'Numbers show adjacent mines',
                'Right click to place a flag on suspected mines',
                'Clear all non-mine cells to win',
                'Use logic to deduce safe cells!'
            ],
            completedKey: 'minesweeper_tutorial_done'
        }
    },

    hasCompleted(game) {
        const tutorial = this.tutorials[game];
        return tutorial && localStorage.getItem(tutorial.completedKey);
    },

    markCompleted(game) {
        const tutorial = this.tutorials[game];
        if (tutorial) {
            localStorage.setItem(tutorial.completedKey, new Date().toISOString());
        }
    },

    getSteps(game) {
        const tutorial = this.tutorials[game];
        return tutorial ? tutorial.steps : [];
    },

    getTitle(game) {
        const tutorial = this.tutorials[game];
        return tutorial ? tutorial.title : '';
    }
};

// ============================================================
// PLAYER PROFILE SYSTEM
// ============================================================

const PlayerProfile = {
    getProfile() {
        const saved = localStorage.getItem('arcade_profile');
        if (saved) return JSON.parse(saved);
        return this.createDefaultProfile();
    },

    createDefaultProfile() {
        const profile = {
            created: new Date().toISOString(),
            level: 1,
            totalXP: 0,
            gamesPlayed: { snake: 0, breakout: 0, spaceinvaders: 0, orbitimpact: 0, tetris: 0, pong: 0, minesweeper: 0 },
            totalPlaytime: 0,
            lastPlayed: {},
            preferences: {}
        };
        this.saveProfile(profile);
        return profile;
    },

    saveProfile(profile) {
        localStorage.setItem('arcade_profile', JSON.stringify(profile));
    },

    addXP(game, amount) {
        const profile = this.getProfile();
        profile.totalXP = (profile.totalXP || 0) + amount;
        profile.level = this.calculateLevel(profile.totalXP);
        
        if (!profile.lastPlayed) profile.lastPlayed = {};
        profile.lastPlayed[game] = new Date().toISOString();
        
        this.saveProfile(profile);
        return profile;
    },

    calculateLevel(totalXP) {
        // Level formula: level = floor(XP / 500) + 1
        return Math.floor((totalXP || 0) / 500) + 1;
    },

    recordGamePlayed(game) {
        const profile = this.getProfile();
        profile.gamesPlayed[game] = (profile.gamesPlayed[game] || 0) + 1;
        this.saveProfile(profile);
    },

    addPlaytime(game, seconds) {
        const profile = this.getProfile();
        profile.totalPlaytime = (profile.totalPlaytime || 0) + seconds;
        this.saveProfile(profile);
    }
};

// ============================================================
// GAME MODE SYSTEM
// ============================================================

const GameModeSystem = {
    modes: {
        classic:  { label: 'Classic',   desc: 'Traditional arcade gameplay' },
        survival: { label: 'Survival',  desc: 'Last as long as possible' },
        timeattack: { label: 'Time Attack', desc: 'Score as many points as possible in 60 seconds' },
        marathon: { label: 'Marathon', desc: 'Play until you fall over' }
    },

    getCurrentMode(game) {
        return localStorage.getItem(`arcade_mode_${game}`) || 'classic';
    },

    setMode(game, mode) {
        if (this.modes[mode]) {
            localStorage.setItem(`arcade_mode_${game}`, mode);
            return true;
        }
        return false;
    },

    getModeList() {
        return Object.keys(this.modes).map(key => ({
            key,
            label: this.modes[key].label,
            desc: this.modes[key].desc
        }));
    }
};

// ============================================================
// UNIFIED IMPROVEMENTS API
// ============================================================

const ArcadeImprovements = {
    // Convenience access to all systems
    difficulty: DifficultySystem,
    settings: SettingsSystem,
    achievements: AchievementSystem,
    leaderboard: LeaderboardSystem,
    tutorial: TutorialSystem,
    profile: PlayerProfile,
    gameModes: GameModeSystem,

    // Initialize all systems
    init() {
        // Ensure default profile exists
        this.profile.getProfile();
        // Ensure default settings exist
        this.settings.getSettings();
        console.log('🎮 Retro Arcade Improvements initialized');
    },

    // Generate settings HTML for a game
    createSettingsHTML(game, onClose) {
        const settings = this.settings.getSettings();
        const difficulty = this.difficulty.getTierList();
        const modes = this.gameModes.getModeList();
        const currentMode = this.gameModes.getCurrentMode(game);

        return `
            <div class="arcade-settings-overlay">
                <div class="arcade-settings-panel">
                    <h3>⚙️ SETTINGS</h3>
                    
                    <div class="settings-section">
                        <label>Difficulty:</label>
                        <select id="setting-difficulty">
                            ${difficulty.map(d => `<option value="${d.key}" ${d.key === settings.difficulty ? 'selected' : ''}>${d.label}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="settings-section">
                        <label>Mode:</label>
                        <select id="setting-mode">
                            ${modes.map(m => `<option value="${m.key}" ${m.key === currentMode ? 'selected' : ''}>${m.label}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="settings-section">
                        <label>Master Volume: <span id="volume-value">${settings.masterVolume}%</span></label>
                        <input type="range" id="setting-volume" min="0" max="100" value="${settings.masterVolume}">
                    </div>
                    
                    <div class="settings-section">
                        <label><input type="checkbox" id="setting-colorblind" ${settings.colorblindMode ? 'checked' : ''}> Colorblind Mode</label>
                    </div>
                    
                    <div class="settings-section">
                        <label><input type="checkbox" id="setting-crt" ${settings.crtOverlay ? 'checked' : ''}> CRT Overlay Effect</label>
                    </div>
                    
                    <div class="settings-section">
                        <label><input type="checkbox" id="setting-fps" ${settings.showFPS ? 'checked' : ''}> Show FPS Counter</label>
                    </div>
                    
                    <div class="settings-section">
                        <label><input type="checkbox" id="setting-grid" ${settings.showGrid ? 'checked' : ''}> Show Grid Lines</label>
                    </div>
                    
                    <div class="settings-actions">
                        <button id="setting-apply">APPLY</button>
                        <button id="setting-reset">RESET</button>
                        <button id="setting-close">CLOSE</button>
                    </div>
                </div>
            </div>
        `;
    },

    // Generate game over HTML with improvements
    createGameOverHTML(game, score, highScore, timePlayed) {
        const achievements = this.achievements;
        const unlockedCount = achievements.getUnlockedCount();
        const totalCount = achievements.getTotalCount();
        const profile = this.profile.getProfile();
        const level = profile.level;

        return `
            <div class="arcade-game-over">
                <div class="arcade-game-over-content">
                    <h2>GAME OVER</h2>
                    
                    <div class="arcade-score-display">
                        <div class="arcade-final-score">${score.toLocaleString()}</div>
                        <div class="arcade-high-score-label">HIGH SCORE</div>
                        <div class="arcade-high-score">${highScore.toLocaleString()}</div>
                    </div>
                    
                    <div class="arcade-game-stats">
                        <div class="stat-item">
                            <span class="stat-label">⏱️ Time</span>
                            <span class="stat-value">${this.formatTime(timePlayed)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">📊 Difficulty</span>
                            <span class="stat-value">${DifficultySystem.getCurrentTier()}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">🎮 Level</span>
                            <span class="stat-value">${level}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">⭐ XP</span>
                            <span class="stat-value">${profile.totalXP}</span>
                        </div>
                    </div>
                    
                    <div class="arcade-achievement-progress">
                        <div class="achievement-bar">
                            <div class="achievement-fill" style="width: ${achievements.getProgressPercent()}%"></div>
                        </div>
                        <span class="achievement-label">${unlockedCount}/${totalCount} achievements</span>
                    </div>
                    
                    <div class="arcade-game-actions">
                        <button class="arcade-restart-btn">🔄 PLAY AGAIN</button>
                        <button class="arcade-settings-btn">⚙️ SETTINGS</button>
                        <button class="arcade-share-btn">📋 SHARE</button>
                    </div>
                </div>
            </div>
        `;
    },

    // Generate tutorial HTML
    createTutorialHTML(game) {
        const tutorial = this.tutorial;
        if (tutorial.hasCompleted(game)) return '';

        const steps = tutorial.getSteps(game);
        const title = tutorial.getTitle(game);

        return `
            <div class="arcade-tutorial-panel">
                <h3>${title}</h3>
                <div class="arcade-tutorial-steps">
                    ${steps.map((step, i) => `
                        <div class="tutorial-step">
                            <div class="step-number">${i + 1}</div>
                            <div class="step-text">${step}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="arcade-tutorial-actions">
                    <button id="tutorial-skip">SKIP</button>
                    <button id="tutorial-complete">GOT IT!</button>
                </div>
            </div>
        `;
    },

    // Format time helper
    formatTime(ms) {
        if (!ms || ms <= 0) return '0:00';
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    },

    // Calculate XP for a game session
    calculateXP(score, difficulty, timePlayed) {
        const diffConfig = DifficultySystem.tiers[difficulty] || DifficultySystem.tiers.normal;
        let xp = Math.floor(score / 10); // 1 XP per 10 points
        
        xp = Math.floor(xp * diffConfig.scoreMultiplier); // Difficulty multiplier
        
        if (timePlayed > 60000) {
            xp += Math.floor(timePlayed / 60000); // 1 XP per minute played
        }
        
        return Math.max(1, xp); // Minimum 1 XP
    }
};

// Initialize on load
ArcadeImprovements.init();

// Export for use in games
if (typeof window !== 'undefined') {
    window.ArcadeImprovements = ArcadeImprovements;
    window.DifficultySystem = DifficultySystem;
    window.SettingsSystem = SettingsSystem;
    window.AchievementSystem = AchievementSystem;
    window.LeaderboardSystem = LeaderboardSystem;
    window.TutorialSystem = TutorialSystem;
    window.PlayerProfile = PlayerProfile;
    window.GameModeSystem = GameModeSystem;
}