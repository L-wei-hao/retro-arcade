/**
 * RETRO ARCADE - Main Application
 * 
 * Integrated with Arcade Improvements:
 * - Difficulty System
 * - Achievement System
 * - Leaderboard
 * - Settings Panel
 * - Tutorial System
 * - Player Profile
 */
(function() {
    // Game instances
    let currentGame = null;
    let currentGameName = null;
    let animationId = null;
    let lastTimestamp = 0;
    
    // Timing
    let gameStartTime = 0;
    let playtimeTracker = null;
    
    // Settings panel state
    let settingsPanelOpen = false;

    // DOM elements
    const mainMenu = document.getElementById('main-menu');
    const gameScreen = document.getElementById('game-screen');
    const gameCanvas = document.getElementById('game-canvas');
    const gameTitle = document.getElementById('game-title');
    const scoreDisplay = document.getElementById('score');
    const gameOverScreen = document.getElementById('game-over');
    const finalScoreDisplay = document.getElementById('final-score');
    const highScoreDisplay = document.getElementById('high-score');
    const backBtn = document.getElementById('back-btn');
    const restartBtn = document.getElementById('restart-btn');
    const gameCards = document.querySelectorAll('.game-card');

    // Game title mapping
    const gameTitles = {
        snake: 'SNAKE',
        breakout: 'BREAKOUT',
        spaceinvaders: 'SPACE INVADERS',
        orbitimpact: 'ORBIT IMPACT',
        tetris: 'TETRIS',
        pong: 'PONG',
        minesweeper: 'MINESWEEPER'
    };

    // Initialize game instances
    function createGame(gameName) {
        switch(gameName) {
            case 'snake': return new SnakeGame(gameCanvas);
            case 'breakout': return new BreakoutGame(gameCanvas);
            case 'spaceinvaders': return new SpaceInvadersGame(gameCanvas);
            case 'orbitimpact': return new OrbitImpactGame(gameCanvas);
            case 'tetris': return new TetrisGame(gameCanvas);
            case 'pong': return new PongGame(gameCanvas);
            case 'minesweeper': return new MinesweeperGame(gameCanvas);
            default: return null;
        }
    }

    function fitGameCanvas() {
        if (!currentGame) return;

        const header = gameScreen.querySelector('.game-header');
        const footer = gameScreen.querySelector('.game-controls-info');
        const screenRect = gameScreen.getBoundingClientRect();
        const headerH = header ? header.getBoundingClientRect().height : 0;
        const footerH = footer ? footer.getBoundingClientRect().height : 0;
        const availableW = screenRect.width;
        const availableH = Math.max(0, screenRect.height - headerH - footerH);
        const intrinsicW = gameCanvas.width || currentGame.canvas.width;
        const intrinsicH = gameCanvas.height || currentGame.canvas.height;

        if (!intrinsicW || !intrinsicH || !availableW || !availableH) return;

        const scale = Math.min(availableW / intrinsicW, availableH / intrinsicH);
        const displayW = Math.floor(intrinsicW * scale);
        const displayH = Math.floor(intrinsicH * scale);

        gameCanvas.style.width = `${displayW}px`;
        gameCanvas.style.height = `${displayH}px`;
        gameCanvas.style.alignSelf = 'center';
    }

    function startGame(gameName) {
        // Initialize audio on first user interaction
        retroSounds.init();
        
        // Record game play
        PlayerProfile.recordGamePlayed(gameName);
        
        // Check tutorial
        if (!TutorialSystem.hasCompleted(gameName)) {
            showTutorial(gameName);
        }
        
        currentGameName = gameName;
        gameScreen.dataset.game = gameName;
        currentGame = createGame(gameName);
        currentGame.init();

        // Apply difficulty settings to game
        const diffConfig = DifficultySystem.getConfig();
        if (currentGame.applyDifficulty) {
            currentGame.applyDifficulty(diffConfig);
        }

        // Update UI
        gameTitle.textContent = gameTitles[gameName];
        scoreDisplay.textContent = '0';
        const controlSpans = gameScreen.querySelectorAll('.game-controls-info span');
        if (gameName === 'orbitimpact' && controlSpans.length >= 3) {
            controlSpans[0].textContent = 'Arrow Keys / WASD - Move';
            controlSpans[1].textContent = 'Space - Fire | Z Special | X Switch';
            controlSpans[2].textContent = 'Enter - Start | Esc - Pause';
        } else if (controlSpans.length >= 3) {
            controlSpans[0].textContent = 'Arrow Keys / WASD - Move';
            controlSpans[1].textContent = 'Space - Action';
            controlSpans[2].textContent = 'Enter - Start';
        }
        mainMenu.classList.remove('active');
        gameScreen.classList.add('active');
        gameOverScreen.classList.add('hidden');

        // Resize canvas for the game
        gameCanvas.width = currentGame.canvas.width;
        gameCanvas.height = currentGame.canvas.height;
        requestAnimationFrame(fitGameCanvas);

        // Track playtime
        gameStartTime = Date.now();
        if (playtimeTracker) clearInterval(playtimeTracker);
        playtimeTracker = setInterval(() => {
            if (currentGameName) {
                PlayerProfile.addPlaytime(currentGameName, 1);
            }
        }, 1000);

        // Start game loop
        if (animationId) cancelAnimationFrame(animationId);
        lastTimestamp = 0;
        gameLoop(0);
    }

    // Return to menu
    function returnToMenu() {
        // Record final playtime
        if (playtimeTracker && currentGameName) {
            const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
            PlayerProfile.addPlaytime(currentGameName, elapsed);
        }
        if (playtimeTracker) clearInterval(playtimeTracker);
        
        if (currentGame && currentGame.stopTimer) {
            currentGame.stopTimer();
        }
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        currentGame = null;
        currentGameName = null;
        gameCanvas.style.width = '';
        gameCanvas.style.height = '';
        gameScreen.classList.remove('active');
        gameScreen.removeAttribute('data-game');
        mainMenu.classList.add('active');
        gameOverScreen.classList.add('hidden');
        settingsPanelOpen = false;
    }

    // Show game over
    function showGameOver() {
        if (!currentGame) return;
        
        const score = currentGame.score || 0;
        const highScore = currentGame.highScore || 0;
        const timePlayed = Date.now() - gameStartTime;

        // Update displays
        finalScoreDisplay.textContent = score;
        highScoreDisplay.textContent = highScore;
        gameOverScreen.classList.remove('hidden');

        // Save score to leaderboard
        if (currentGameName) {
            LeaderboardSystem.addScore(currentGameName, score, DifficultySystem.getCurrentTier());
            
            // Check achievements
            checkAchievements(currentGameName, score, timePlayed);
            
            // Award XP
            const xp = ArcadeImprovements.calculateXP(score, DifficultySystem.getCurrentTier(), timePlayed);
            const profile = PlayerProfile.addXP(currentGameName, xp);
            
            // Record playtime
            PlayerProfile.addPlaytime(currentGameName, Math.floor(timePlayed / 1000));
        }
    }

    // Restart game
    function restartGame() {
        if (!currentGame) return;

        gameOverScreen.classList.add('hidden');
        currentGame.reset();
        currentGame._gameOverShown = false;
        scoreDisplay.textContent = '0';
        
        // Reset timing
        gameStartTime = Date.now();

        // Games with explicit restart/start helpers should resume immediately.
        if (typeof currentGame.startRun === 'function') {
            currentGame.startRun();
        } else if (typeof currentGame.start === 'function') {
            currentGame.start();
        } else {
            // Games like Breakout, Pong, Tetris, and Space Invaders only start
            // after an Enter press. Make Play Again behave like that input.
            const instantRestartGames = new Set(['breakout', 'pong', 'tetris', 'spaceinvaders']);
            if (instantRestartGames.has(currentGameName)) {
                currentGame.gameStarted = true;
                currentGame.gameOver = false;
                currentGame.paused = false;
                retroSounds.init();
                retroSounds.playStart();
            }
        }
        
        if (currentGame.stopTimer) {
            currentGame.stopTimer();
        }
    }
    
    // Check and unlock achievements
    function checkAchievements(gameName, score, timePlayed) {
        const achievements = AchievementSystem;
        
        // Score-based achievements (all games)
        achievements.unlockAchievement('first_hundred', { score: score });
        achievements.unlockAchievement('thousand_scorer', { score: score });
        achievements.unlockAchievement('ten_k_scorer', { score: score });
        achievements.unlockAchievement('fifty_k_scorer', { score: score });
        
        // Speed achievement
        if (timePlayed < 30000 && score >= 500) {
            achievements.unlockAchievement('speed_demon', { score: score, time: timePlayed / 1000 });
        }
        
        // Quick start
        achievements.unlockAchievement('quick_start');
        
        // Game-specific achievements
        if (gameName === 'snake') {
            achievements.unlockAchievement('snake_master');
            achievements.unlockAchievement('snake_long', { snake_long: currentGame ? currentGame.snake.length : 0 });
        }
        if (gameName === 'breakout') {
            achievements.unlockAchievement('brick_smasher');
            achievements.unlockAchievement('breakout_survivor', { breakout_breakout_survivor: currentGame ? currentGame.lives : 0 });
        }
        if (gameName === 'tetris') {
            achievements.unlockAchievement('tetris_master');
            achievements.unlockAchievement('tetris_tetris', { tetris_tetris_tetris: 4 });
        }
        
        // High score check
        const highScore = currentGame && typeof currentGame.highScore === 'number' ? currentGame.highScore : 0;
        if (score >= highScore && score > 0) {
            achievements.unlockAchievement('high_roller');
        }
    }

    // Game loop
    function gameLoop(timestamp) {
        if (!currentGame) return;

        if (lastTimestamp === 0) lastTimestamp = timestamp;
        const delta = timestamp - lastTimestamp;
        lastTimestamp = timestamp;

        // Update
        if (currentGame.update) {
            currentGame.update(timestamp);
        }

        // Check if game should show game over
        if (currentGame.gameOver && !currentGame._gameOverShown) {
            currentGame._gameOverShown = true;
            showGameOver();
        }

        // Draw
        currentGame.draw();

        // Update score display
        scoreDisplay.textContent = currentGame.score.toString().padStart(6, '0');

        animationId = requestAnimationFrame(gameLoop);
    }

    // ===== EVENT LISTENERS =====

    // Game card clicks
    gameCards.forEach(card => {
        card.addEventListener('click', () => {
            const gameName = card.dataset.game;
            startGame(gameName);
        });
    });

    // Back button
    backBtn.addEventListener('click', returnToMenu);

    // Restart button
    restartBtn.addEventListener('click', restartGame);

    // Keyboard input
    window.addEventListener('keydown', (e) => {
        if (!currentGame) return;
        if (currentGame.handleKeyDown) {
            currentGame.handleKeyDown(e);
        }
    }, true);

    window.addEventListener('keyup', (e) => {
        if (!currentGame) return;
        if (currentGame.handleKeyUp) {
            currentGame.handleKeyUp(e);
        }
    }, true);

    // Canvas mouse input
    gameCanvas.addEventListener('mousedown', (e) => {
        if (!currentGame) return;
        if (currentGame.handleClick) {
            currentGame.handleClick(e, e.button);
        }
    });

    gameCanvas.addEventListener('mousemove', (e) => {
        if (!currentGame) return;
        if (currentGame.handleMouseMove) {
            currentGame.handleMouseMove(e);
        }
    });

    gameCanvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    // Prevent scrolling with arrow keys and space
    window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }
    });
    
    window.addEventListener('resize', () => {
        fitGameCanvas();
    });

    // ===== IMPROVEMENTS INTEGRATION =====
    
    // Show tutorial overlay
    function showTutorial(gameName) {
        // Remove any existing overlays first
        removeOverlays();
        
        const html = ArcadeImprovements.createTutorialHTML(gameName);
        if (!html) return; // Already completed
        
        const overlay = document.createElement('div');
        overlay.className = 'arcade-tutorial-overlay';
        overlay.id = 'tutorial-overlay';
        overlay.innerHTML = html;
        gameScreen.appendChild(overlay);

        const dismissTutorial = (markComplete) => {
            if (markComplete) {
                TutorialSystem.markCompleted(gameName);
            }
            removeOverlays();

            // Start the game immediately after dismissing the tutorial.
            // This avoids input-focus issues and matches the on-screen prompt.
            if (currentGame && currentGame.handleKeyDown) {
                currentGame.handleKeyDown({ key: 'Enter', preventDefault() {} });
            }
        };

        overlay.querySelector('#tutorial-skip')?.addEventListener('click', () => dismissTutorial(false));
        overlay.querySelector('#tutorial-complete')?.addEventListener('click', () => dismissTutorial(true));
    }
    
    // Show settings panel
    function showSettings(gameName) {
        if (settingsPanelOpen) return;
        
        removeOverlays();
        
        const overlay = document.createElement('div');
        overlay.className = 'arcade-settings-overlay';
        overlay.id = 'settings-overlay';
        overlay.innerHTML = ArcadeImprovements.createSettingsHTML(gameName);
        gameScreen.appendChild(overlay);
        settingsPanelOpen = true;
        
        // Bind volume display
        const volumeSlider = document.getElementById('setting-volume');
        const volumeValue = document.getElementById('volume-value');
        if (volumeSlider && volumeValue) {
            volumeSlider.addEventListener('input', () => {
                volumeValue.textContent = volumeSlider.value + '%';
            });
        }
        
        // Bind buttons
        document.getElementById('setting-apply').addEventListener('click', () => {
            const newSettings = {
                masterVolume: parseInt(document.getElementById('setting-volume').value),
                difficulty: document.getElementById('setting-difficulty').value,
                colorblindMode: document.getElementById('setting-colorblind').checked,
                crtOverlay: document.getElementById('setting-crt').checked,
                showFPS: document.getElementById('setting-fps').checked,
                showGrid: document.getElementById('setting-grid').checked
            };
            
            SettingsSystem.saveSettings(newSettings);
            DifficultySystem.setTier(newSettings.difficulty);
            
            // Apply colorblind mode
            const container = document.getElementById('arcade-container');
            if (newSettings.colorblindMode) {
                container.classList.add('colorblind-mode');
            } else {
                container.classList.remove('colorblind-mode');
            }
            
            // Apply CRT overlay visibility
            const crtOverlay = document.getElementById('crt-overlay');
            if (crtOverlay) {
                crtOverlay.style.display = newSettings.crtOverlay ? 'block' : 'none';
            }
            
            // Apply volume to sound system
            SettingsSystem.applyToSoundSystem(retroSounds);
            
            removeOverlays();
        });
        
        document.getElementById('setting-reset').addEventListener('click', () => {
            SettingsSystem.resetSettings();
            removeOverlays();
        });
        
        document.getElementById('setting-close').addEventListener('click', () => {
            removeOverlays();
        });
    }
    
    // Remove all overlays
    function removeOverlays() {
        const tutorialOverlay = document.getElementById('tutorial-overlay');
        if (tutorialOverlay) tutorialOverlay.remove();
        const settingsOverlay = document.getElementById('settings-overlay');
        if (settingsOverlay) settingsOverlay.remove();
        settingsPanelOpen = false;
    }
    
    // Show leaderboard for current game
    function showLeaderboard() {
        if (!currentGameName) return;
        
        removeOverlays();
        
        const overlay = document.createElement('div');
        overlay.className = 'arcade-leaderboard-overlay';
        overlay.id = 'leaderboard-overlay';
        
        const leaderboard = LeaderboardSystem.getLeaderboard(currentGameName);
        
        let entriesHTML = '';
        if (leaderboard.length > 0) {
            entriesHTML = leaderboard.map((entry, i) => `
                <div class="leaderboard-entry">
                    <span class="leaderboard-rank">#${i + 1}</span>
                    <span class="leaderboard-score">${entry.score.toLocaleString()}</span>
                    <span class="leaderboard-difficulty">${entry.difficulty}</span>
                </div>
            `).join('');
        } else {
            entriesHTML = '<div class="leaderboard-empty">No scores yet! Be the first!</div>';
        }
        
        overlay.innerHTML = `
            <div class="arcade-leaderboard-panel">
                <h3>🏆 TOP SCORES - ${gameTitles[currentGameName]}</h3>
                <div class="leaderboard-entries">
                    ${entriesHTML}
                </div>
                <div class="leaderboard-actions">
                    <button id="leaderboard-copy">📋 COPY</button>
                    <button id="leaderboard-clear">🗑️ CLEAR</button>
                    <button id="leaderboard-close">CLOSE</button>
                </div>
            </div>
        `;
        
        gameScreen.appendChild(overlay);
        
        // Bind buttons
        document.getElementById('leaderboard-close').addEventListener('click', () => {
            removeOverlays();
        });
        
        document.getElementById('leaderboard-copy').addEventListener('click', () => {
            LeaderboardSystem.exportScore(currentGameName, 0);
            document.getElementById('leaderboard-copy').textContent = 'COPIED!';
            setTimeout(() => {
                document.getElementById('leaderboard-copy').textContent = '📋 COPY';
            }, 2000);
        });
        
        document.getElementById('leaderboard-clear').addEventListener('click', () => {
            if (confirm('Clear all high scores for this game?')) {
                LeaderboardSystem.clearLeaderboard(currentGameName);
                removeOverlays();
            }
        });
    }
    
    // Show achievement notification
    function showAchievementNotification(achievementKey) {
        const achievement = AchievementSystem.achievements[achievementKey];
        if (!achievement) return;
        
        const notif = document.createElement('div');
        notif.className = 'achievement-notification';
        notif.innerHTML = `
            <div class="notif-header">🏆 ACHIEVEMENT UNLOCKED</div>
            <div class="notif-name">${achievement.name}</div>
            <div class="notif-desc">${achievement.desc}</div>
            <button class="notif-close">✕</button>
        `;
        
        document.body.appendChild(notif);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notif.parentNode) notif.remove();
        }, 5000);
        
        // Close button
        notif.querySelector('.notif-close').addEventListener('click', () => {
            notif.remove();
        });
    }
    
    // Override achievement unlock to show notification
    const originalUnlock = AchievementSystem.unlockAchievement.bind(AchievementSystem);
    AchievementSystem.unlockAchievement = function(key, extraData) {
        const result = originalUnlock(key, extraData);
        if (result) {
            showAchievementNotification(key);
        }
        return result;
    };
    
    // Add settings and leaderboard buttons to game over screen
    const originalShowGameOver = showGameOver;
    const enhancedGameOverHTML = `
        <div class="arcade-game-actions" style="margin-top: 20px;">
            <button class="arcade-restart-btn">🔄 PLAY AGAIN</button>
            <button class="arcade-settings-btn" id="gameover-settings">⚙️ SETTINGS</button>
            <button class="arcade-share-btn" id="gameover-leaderboard">🏆 SCORES</button>
        </div>
    `;
    
    // Add event listeners for improvements buttons
    const observer = new MutationObserver(() => {
        const gameOverEl = document.getElementById('game-over');
        if (gameOverEl && !gameOverEl.querySelector('.arcade-game-actions')) {
            // Add the improvements buttons
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'arcade-game-actions';
            actionsDiv.innerHTML = `
                <button class="arcade-settings-btn" id="improved-settings-btn">⚙️ SETTINGS</button>
                <button class="arcade-share-btn" id="improved-leaderboard-btn">🏆 SCORES</button>
            `;
            gameOverEl.appendChild(actionsDiv);
            
            // Bind buttons
            const settingsBtn = document.getElementById('improved-settings-btn');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', () => {
                    if (currentGameName) showSettings(currentGameName);
                });
            }
            
            const leaderboardBtn = document.getElementById('improved-leaderboard-btn');
            if (leaderboardBtn) {
                leaderboardBtn.addEventListener('click', () => {
                    if (currentGameName) showLeaderboard();
                });
            }
        }
    });
    
    observer.observe(gameOverScreen, { childList: true, subtree: true });
    
    // Add improvements CSS link
    const improvementsCSS = document.createElement('link');
    improvementsCSS.rel = 'stylesheet';
    improvementsCSS.href = 'css/improvements.css';
    document.head.appendChild(improvementsCSS);
    
    // Add profile display to game screen
    function updateProfileDisplay() {
        let profileEl = document.getElementById('profile-display');
        if (!profileEl) {
            profileEl = document.createElement('div');
            profileEl.id = 'profile-display';
            profileEl.className = 'arcade-profile-display';
            gameScreen.appendChild(profileEl);
        }
        
        const profile = PlayerProfile.getProfile();
        const level = profile.level;
        const xp = profile.totalXP || 0;
        const xpInLevel = xp - ((level - 1) * 500);
        const xpNeeded = 500;
        const xpPercent = (xpInLevel / xpNeeded) * 100;
        const header = gameScreen.querySelector('.game-header');
        const headerHeight = header ? header.offsetHeight : 0;

        profileEl.style.top = `${headerHeight + 10}px`;
        profileEl.style.right = '10px';
        profileEl.style.maxWidth = 'calc(100% - 20px)';
        
        profileEl.innerHTML = `
            <div class="profile-level">LVL ${level}</div>
            <div class="profile-xp-bar">
                <div class="profile-xp-fill" style="width: ${xpPercent}%"></div>
            </div>
        `;
    }
    
    // Update profile display periodically
    setInterval(() => {
        if (gameScreen.classList.contains('active')) {
            updateProfileDisplay();
        }
    }, 1000);
    
    // Add settings button to game header
    const gameHeader = document.querySelector('.game-header');
    if (gameHeader) {
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'retro-btn';
        settingsBtn.id = 'game-settings-btn';
        settingsBtn.textContent = '⚙️';
        settingsBtn.addEventListener('click', () => {
            if (currentGameName) showSettings(currentGameName);
        });
        gameHeader.appendChild(settingsBtn);
    }

})();
