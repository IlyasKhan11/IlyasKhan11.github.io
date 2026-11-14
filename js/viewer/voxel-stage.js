import * as THREE from 'three';

/**
 * ONE WebGL canvas for the whole page.
 *
 * Browsers only allow a handful of WebGL canvases at once (around 16), and each
 * one costs memory. So instead of a canvas per model, a single transparent
 * canvas is pinned over the page. Every frame it looks up where each 3D slot
 * currently is on screen and draws that slot's scene into exactly that
 * rectangle ("viewport" + "scissor": draw here, and nowhere else).
 *
 * The canvas ignores the mouse (pointer-events: none), so drags fall through
 * to the slot element underneath, which is where the rotation controls listen.
 */
export class VoxelStage {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'voxel-stage-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    document.body.append(this.canvas);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.views = [];
    this.clock = new THREE.Clock();
    this.canvasSize = { width: 0, height: 0 };
    this.renderer.setAnimationLoop(() => this.tick());
  }

  addView(view) {
    this.views.push(view);
  }

  tick() {
    const delta = Math.min(this.clock.getDelta(), 0.1); // avoid a jump after the tab was hidden
    if (document.hidden) return;
    const now = this.clock.getElapsedTime();

    this.matchCanvasToWindow();
    this.renderer.setScissorTest(false);
    this.renderer.clear();
    this.renderer.setScissorTest(true);

    for (const view of this.views) {
      const rect = view.element.getBoundingClientRect();
      if (!this.isOnScreen(rect)) continue;

      view.update(delta, now, rect.width, rect.height);

      // WebGL measures y from the bottom of the canvas; the page measures from the top.
      const bottom = this.canvasSize.height - rect.bottom;
      this.renderer.setViewport(rect.left, bottom, rect.width, rect.height);
      this.renderer.setScissor(rect.left, bottom, rect.width, rect.height);
      this.renderer.render(view.scene, view.camera);
    }
  }

  isOnScreen(rect) {
    return rect.width > 0 && rect.height > 0
      && rect.bottom > 0 && rect.top < this.canvasSize.height
      && rect.right > 0 && rect.left < this.canvasSize.width;
  }

  matchCanvasToWindow() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width === this.canvasSize.width && height === this.canvasSize.height) return;
    this.canvasSize = { width, height };
    this.renderer.setSize(width, height, false);
  }
}
