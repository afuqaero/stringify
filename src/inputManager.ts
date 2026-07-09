export class InputManager {
  bindings: { kb: string, gp: number }[] = [
    { kb: 'a', gp: 0 }, // Lane 0
    { kb: 's', gp: 1 }, // Lane 1
    { kb: 'd', gp: 2 }, // Lane 2
    { kb: 'f', gp: 3 }, // Lane 3
    { kb: 'g', gp: 4 }, // Lane 4
  ];

  keysDown: Set<string> = new Set();
  gamepadButtonsDown: Set<number> = new Set();
  
  // Touch tracking
  numLanes: number = 4;
  touchesActive: Map<number, number> = new Map(); // touchID -> lane
  lanesTouched: Set<number> = new Set();
  prevLanesTouched: Set<number> = new Set();

  // Track previous state for "just pressed" logic
  prevKeysDown: Set<string> = new Set();
  prevGamepadButtonsDown: Set<number> = new Set();

  constructor() {
    window.addEventListener('keydown', (e) => this.keysDown.add(e.key.toLowerCase()));
    window.addEventListener('keyup', (e) => this.keysDown.delete(e.key.toLowerCase()));

    // Mobile touch handling
    window.addEventListener('touchstart', (e) => {
      // Unmute/enable AudioContext on touch if needed
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const lane = this.getLaneFromTouchX(touch.clientX);
        if (lane !== -1) {
          this.touchesActive.set(touch.identifier, lane);
          this.lanesTouched.add(lane);
        }
      }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const lane = this.touchesActive.get(touch.identifier);
        if (lane !== undefined) {
          this.touchesActive.delete(touch.identifier);
          // Only remove lane if no other active touch matches it
          if (!Array.from(this.touchesActive.values()).includes(lane)) {
            this.lanesTouched.delete(lane);
          }
        }
      }
    }, { passive: true });

    window.addEventListener('touchcancel', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const lane = this.touchesActive.get(touch.identifier);
        if (lane !== undefined) {
          this.touchesActive.delete(touch.identifier);
          if (!Array.from(this.touchesActive.values()).includes(lane)) {
            this.lanesTouched.delete(lane);
          }
        }
      }
    }, { passive: true });
  }

  getLaneFromTouchX(clientX: number): number {
    const width = window.innerWidth;
    const laneWidth = width / this.numLanes;
    const lane = Math.floor(clientX / laneWidth);
    return Math.max(0, Math.min(this.numLanes - 1, lane));
  }

  update() {
    this.prevKeysDown = new Set(this.keysDown);
    this.prevGamepadButtonsDown = new Set(this.gamepadButtonsDown);
    this.prevLanesTouched = new Set(this.lanesTouched);
    
    this.gamepadButtonsDown.clear();
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (gp) {
        gp.buttons.forEach((btn, index) => {
          if (btn.pressed) {
            this.gamepadButtonsDown.add(index);
          }
        });
      }
    }
  }

  isLaneDown(lane: number): boolean {
    const bind = this.bindings[lane];
    const isKb = this.keysDown.has(bind.kb);
    const isGp = this.gamepadButtonsDown.has(bind.gp);
    const isTouch = this.lanesTouched.has(lane);
    return isKb || isGp || isTouch;
  }

  isLaneJustPressed(lane: number): boolean {
    const bind = this.bindings[lane];
    const kbPressed = this.keysDown.has(bind.kb) && !this.prevKeysDown.has(bind.kb);
    const gpPressed = this.gamepadButtonsDown.has(bind.gp) && !this.prevGamepadButtonsDown.has(bind.gp);
    const touchPressed = this.lanesTouched.has(lane) && !this.prevLanesTouched.has(lane);
    return kbPressed || gpPressed || touchPressed;
  }

  isAnyActionJustPressed(): boolean {
    // Spacebar, Gamepad A (0), or any touch screen tap
    const kb = this.keysDown.has(' ') && !this.prevKeysDown.has(' ');
    const gp = this.gamepadButtonsDown.has(0) && !this.prevGamepadButtonsDown.has(0);
    const touch = this.lanesTouched.size > 0 && this.prevLanesTouched.size === 0;
    return kb || gp || touch;
  }

  getAnyJustPressed(): { type: 'kb', key: string } | { type: 'gp', btn: number } | null {
    for (const key of this.keysDown) {
      if (!this.prevKeysDown.has(key)) return { type: 'kb', key };
    }
    for (const btn of this.gamepadButtonsDown) {
      if (!this.prevGamepadButtonsDown.has(btn)) return { type: 'gp', btn };
    }
    return null;
  }
}

export const input = new InputManager();

