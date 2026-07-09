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
  
  // Track previous state for "just pressed" logic
  prevKeysDown: Set<string> = new Set();
  prevGamepadButtonsDown: Set<number> = new Set();

  constructor() {
    window.addEventListener('keydown', (e) => this.keysDown.add(e.key.toLowerCase()));
    window.addEventListener('keyup', (e) => this.keysDown.delete(e.key.toLowerCase()));
  }

  update() {
    this.prevKeysDown = new Set(this.keysDown);
    this.prevGamepadButtonsDown = new Set(this.gamepadButtonsDown);
    
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
    return this.keysDown.has(bind.kb) || this.gamepadButtonsDown.has(bind.gp);
  }

  isLaneJustPressed(lane: number): boolean {
    const bind = this.bindings[lane];
    const kbPressed = this.keysDown.has(bind.kb) && !this.prevKeysDown.has(bind.kb);
    const gpPressed = this.gamepadButtonsDown.has(bind.gp) && !this.prevGamepadButtonsDown.has(bind.gp);
    return kbPressed || gpPressed;
  }

  isAnyActionJustPressed(): boolean {
    // Spacebar or Gamepad A (0)
    const kb = this.keysDown.has(' ') && !this.prevKeysDown.has(' ');
    const gp = this.gamepadButtonsDown.has(0) && !this.prevGamepadButtonsDown.has(0);
    return kb || gp;
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
