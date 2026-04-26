# 🕹️ RETRO ARCADE

![Retro Arcade Banner](https://github.com/L-wei-hao/retro-arcade/blob/main/screenshot.png?raw=true)

A complete, end-to-end retro arcade suite developed from scratch via a locally hosted instance of **Qwen/Qwen3.6-35B-A3B**. This project showcases the capabilities of self-hosted Large Language Models in complex, multi-component game development.

---

## 🎨 Design Philosophy
The arcade is designed with a **Retro-Futuristic** aesthetic, blending classic 8-bit visuals with modern web technologies:
- **CRT Effect**: Immersive scanline overlays and radial vignette for an authentic cathode-ray tube feel.
- **Glitch Visuals**: Dynamic CSS-driven glitch animations for titles and UI elements.
- **Neon Palette**: High-contrast, vibrant color schemes featuring cyan, magenta, and neon yellow.
- **Micro-animations**: Smooth transitions, hover rotations, and feedback effects that make the interface feel alive.

## 🏗️ Architecture
The project follows a modular, object-oriented architecture designed for scalability and ease of maintenance.

### 1. Core Engine (`app.js`)
The central nervous system of the arcade. It manages:
- **Screen State**: Switching between the Main Menu and the active Game Screen.
- **Game Lifecycle**: Initializing, updating, and drawing the current game instance.
- **Unified Event Handling**: Centralized keyboard and mouse input routing.
- **Global Systems**: Integration with the XP, Achievement, and Leaderboard systems.

### 2. Game Modules (`games/*.js`)
Each game is implemented as a standalone class/object following a standard interface:
- `init()`: Setup game state and assets.
- `update(delta)`: Process game logic and physics.
- `draw()`: Render frame to the canvas.
- `reset()`: Return to starting state.

### 3. Audio System (`sound.js`)
A custom synthesizer that generates retro-style SFX and music on the fly using the Web Audio API, eliminating the need for external asset files.

### 4. Persistence & Metadata (`core/improvements.js`)
Handles complex features like:
- **Leaderboards**: LocalStorage-backed high score tracking.
- **Achievement Engine**: Logic for unlocking and notifying players of milestones.
- **Leveling System**: XP calculation and player progression.

---

## 🎮 The Games
The suite includes six classic arcade experiences:

| Game | Description | Goal |
| :--- | :--- | :--- |
| **🐍 Snake** | Classic growth survival | Eat food, avoid walls and your own tail. |
| **🧱 Breakout** | Physics-based brick breaker | Clear all blocks using the paddle and ball. |
| **👾 Space Invaders**| Vertical defense shooter | Defend Earth from waves of alien attackers. |
| **🟦 Tetris** | Geometric puzzle solver | Stack and clear horizontal lines. |
| **🏓 Pong** | Competitive paddle tennis | Score points by getting the ball past the opponent. |
| **💣 Minesweeper** | Strategic grid exploration | Identify all hidden mines without detonating them. |

---

## 🛠️ Features
- **Difficulty Tiers**: Switch between Easy, Normal, and Hard modes to challenge yourself.
- **CRT Toggle**: Enable or disable the scanline effect for a cleaner or more retro look.
- **Achievements**: Unlock specific milestones like "Speed Demon" or "Snake Master".
- **Leaderboards**: Compete with yourself to climb the local rankings.
- **Tutorials**: Integrated onboarding for every game to get you started quickly.

---

## 🚀 How to Run

Since this is a static web application, you can run it without any heavy dependencies.

### Option 1: Simple Open
1. Clone the repository: `git clone https://github.com/L-wei-hao/retro-arcade.git`
2. Open `index.html` in any modern web browser.

### Option 2: Local Server (Recommended)
For the best experience, use a local development server:
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .
```
Then visit `http://localhost:8000` (or the port specified).

---

## 🤖 Development Context
This entire project—from the CSS glitch effects to the collision logic in Tetris—was generated and refined using a locally hosted **Qwen/Qwen3.6-35B-A3B** model. It serves as a testament to the power of open-source AI in the modern development workflow.

---
Developed by **L-wei-hao** 🕹️
