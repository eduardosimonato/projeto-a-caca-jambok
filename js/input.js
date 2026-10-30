Aurora.Input = class {
  constructor(onPause) {
    this.keys = new Set();
    const gameKeys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','ShiftRight','KeyP','Escape'];
    window.addEventListener('keydown', e => {
      if (e.target.closest?.('input,textarea,select,[contenteditable],dialog')) return;
      if (!gameKeys.includes(e.code)) return;
      // Preserva espaço/Enter nos botões quando os menus têm o foco.
      if (e.code === 'Space' && e.target.tagName === 'BUTTON') return;
      e.preventDefault();
      if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) onPause();
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.clear());
  }
  has(...codes) { return codes.some(code => this.keys.has(code)); }
  clear() { this.keys.clear(); }
  axes() {
    let x = Number(this.has('KeyD','ArrowRight')) - Number(this.has('KeyA','ArrowLeft'));
    let y = Number(this.has('KeyS','ArrowDown')) - Number(this.has('KeyW','ArrowUp'));
    const length = Math.hypot(x,y) || 1;
    return { x: x / length, y: y / length };
  }
};
