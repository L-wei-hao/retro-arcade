# Retro Arcade

![Retro Arcade Banner](https://github.com/L-wei-hao/retro-arcade/blob/main/screenshot.png?raw=true)

Retro Arcade is a browser-based collection of classic and original mini-games built with HTML5 Canvas, plain JavaScript, and CSS. It is a static project, so you can open it locally and play without installing any backend services.

## Highlights

- 7 playable games in one launcher
- Retro-futuristic CRT-inspired visual style
- Keyboard, mouse, and touch-friendly input support
- Local high scores and progression features stored in browser storage
- Lightweight audio generated with the Web Audio API
- No external game engine or sprite pipeline required

## Included Games

| Game | Description |
| :--- | :--- |
| Snake | Classic growth-and-survival gameplay. Eat food, avoid walls, and do not crash into yourself. |
| Breakout | Paddle-and-ball brick breaker with increasing difficulty. |
| Space Invaders | Vertical shooter where you defend Earth from alien waves. |
| Orbit Impact | Neon horizontal shooter with scrolling levels, power-ups, and boss fights. |
| Tetris | Classic block-stacking puzzle game. |
| Pong | Head-to-head paddle tennis. |
| Minesweeper | Grid-based logic puzzle with mine detection. |

## Features

- Difficulty tiers: Easy, Normal, and Hard
- CRT toggle for scanlines and vignette effects
- Achievements and progress tracking
- Local leaderboards and top-score storage
- Built-in tutorials and onboarding for each game
- Mobile-friendly on-screen controls for supported games

## Project Structure

- `app.js` - Main application shell, menu flow, and game routing
- `games/*.js` - Individual game implementations
- `sound.js` - Retro-style sound effects and music via Web Audio API
- `core/improvements.js` - Shared systems such as achievements, levels, and leaderboards
- `styles.css` - Global UI styling and CRT presentation
- `index.html` - Main entry point

## Orbit Impact

Orbit Impact is an original side-scrolling shooter inspired by early-2000s mobile games. It uses generated shapes instead of external art assets, while keeping the same neon CRT direction as the rest of the arcade.

Controls:
- Desktop: Arrow keys or WASD to move, Space to fire, Z to use the selected special weapon, X to switch special weapon, Enter to start or confirm, Esc to pause, R to restart after game over
- Keypad mode: 8 up, 0 down, * left, # right, 1 or 3 fire, 4 or 6 special weapon
- Mobile: on-screen D-pad, Fire, Special, and Switch buttons appear on touch devices and small screens

Gameplay:
- 8 themed levels: Outer Orbit, Asteroid Belt, Lunar Tunnel, Alien Outpost, Ice Planet, Magma Core, Mechanical Hive, and Final Mothership
- Auto-scrolling stages with boss encounters at the end of each sector
- Enemy variety includes straight-line ships, sine-wave ships, pursuing ships, projectile shooters, and durable mini-enemies
- Special weapons include Rocket, Bomb, and Beam, which consume ammo or energy from pickups
- Power-ups grant health, special ammo, rapid fire, shield, or score bonuses
- Scores are saved locally with end-of-run bonuses and boss rewards

## How to Run

### Option 1: Open directly

1. Clone the repository:
   ```bash
   git clone https://github.com/L-wei-hao/retro-arcade.git
   ```
2. Open `index.html` in a modern browser.

### Option 2: Run a local server

Recommended for the smoothest experience:

```bash
# Python
python -m http.server 8000

# Node.js
npx serve .
```

Then open `http://localhost:8000` in your browser.

## Browser Notes

- Best experienced in Chromium-based browsers, Firefox, or Safari
- Web Audio works best after a user interaction such as a click or key press
- LocalStorage is used for scores, achievements, and progression data

## Development Context

This project was developed and refined with the help of a locally hosted large language model workflow. The result is a fully playable arcade suite built as a single static web app.

## License

No license file is currently included in this repository. If you plan to reuse or distribute the project, add an appropriate license first.

---

Developed by L-wei-hao
