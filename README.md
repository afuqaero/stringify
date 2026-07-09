# Stringify 🎸

**Live Demo:** [https://stringify-one.vercel.app/](https://stringify-one.vercel.app/)

Stringify is a premium, web-based rhythm game built with HTML, TypeScript, Vite, and Three.js. Inspired by classic games like *Guitar Hero*, Stringify delivers a fast-paced, visually stunning experience featuring high-performance 3D graphics, dynamic lighting, real-time audio synchronization, and full custom-chart creation.

---

## 🌟 Key Features

*   **Dual Gameplay Modes:**
    *   🎸 **Play Mode:** Load custom-designed note charts (JSON format) and play along to your favorite MP3/WAV/audio files.
    *   🎙️ **Record Mode:** Act as a chart creator! Play any audio track and tap along in real-time to author your own custom note charts, then export them with one click.
*   **Immersive 3D Visuals (Three.js):**
    *   A clean, neon-infused perspective highway with responsive visual notes, scrolling beat grids, and customizable lane counts (3 for Easy, 4 for Medium, 5 for Hard).
    *   Vibrant, lane-colored sparks particle system featuring custom additive blending and physics-based gravity decay on note hits.
*   **Intuitive Controls & Custom Calibration:**
    *   Responsive keyboard and gamepad inputs.
    *   Built-in **Calibration Menu** allowing players to remap keyboard keys or gamepad buttons for each lane.
*   **Sustain (Long Bar) Note Mechanics:**
    *   Smooth hold-note handling. Successfully holding a sustain note dynamically shrinks the neon tail, triggers particle bursts, and increases the glowing intensity of the note group.
    *   Visual feedback on dropped holds (fades to a deactivated grey state).
*   **Complete Performance HUD & Scoring System:**
    *   Real-time scoring, accuracy rating, combo streaks, and floating combo multipliers.
    *   End-of-song performance summary scoring you from 1 to 5 stars.
*   **Robust Gameplay Controls:**
    *   Pause menu (press `Esc`, `P`, or Gamepad Start) with clean countdown overlays to prep you back into the action.
    *   Compact, sleek header HUD showing current song details, notes count, and lane specifications.

---

## 🛠️ Tech Stack

*   **Core Logic:** TypeScript
*   **Rendering Pipeline:** Three.js (WebGL)
*   **Build System & Local Dev Server:** Vite
*   **Styling:** Modern Vanilla CSS (neon gradients, glassmorphism, responsive elements)

---

## 🚀 Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. Clone this repository (or download the files):
   ```bash
   git clone https://github.com/afuqaero/stringify.git
   cd stringify
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server locally:
   ```bash
   npm run dev
   ```
   Open the address provided by Vite (e.g., `http://localhost:5173/`) in your browser.

### Building for Production

To create a production-optimized build:
```bash
npm run build
```
This output is saved to the `dist` directory.

---

## 🎮 How to Play

### Play Mode
1. Click **Play Mode** on the Hub.
2. Select your difficulty.
3. Click **Step 1: Load Chart JSON** to upload your chart file.
4. Click **Step 2: Select Song & Start** to upload your MP3/WAV/audio file.
5. Tap the keys shown on screen as notes cross the receptors at the bottom of the highway!

### Record Mode
1. Click **Record Mode** on the Hub.
2. Select the difficulty/lane density.
3. Click **Select Song & Start (MP3)** to start the audio.
4. Tap the lanes in rhythm to lay down note heads. Hold down keys to record sustain/long notes.
5. Pause the game or finish the track, then click **Export Chart (JSON)** to download your newly authored chart.

---

Created by **lailatulCoder** 🚀
