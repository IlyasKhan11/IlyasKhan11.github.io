/**
 * The opening sequence, played once per browser session:
 *
 *   1. CRT power-on flash                        (pure CSS, instant)
 *   2. boot log types out                        (plain JS, covers the 3D download)
 *   3. voxel globe → cubes fly into "ILYAS KHAN" (voxel-swarm.js)
 *   4. tagline types under the name
 *   5. warp out: cubes rush past the camera while the homepage slides in
 *
 * Any click or key press skips straight to step 5.
 *
 * Whether it plays is decided by a tiny script in <head> (so there's no flash
 * of the page first): it adds the "intro-pending" class to <html>.
 */

const SEEN_KEY = 'intro-seen';
const SWARM_EARLIEST_START_MS = 350;   // let the power-on flash finish first
const THREE_LOAD_TIMEOUT_MS = 2500;    // slower than this → text-only fallback
const HOLD_AFTER_TAGLINE_MS = 900;     // admire the name before warping out
const SAFETY_TIMEOUT_MS = 9000;        // never trap anyone behind the intro

const BOOT_LINES = [
  { prompt: true, text: 'ssh guest@portfolio' },
  { ok: true, text: 'connected · karachi, pk' },
  { ok: true, text: 'loading 16 voxel models' },
  { ok: true, text: 'warming up pipelines: detect · track · segment' },
  { prompt: true, text: './build --for production' },
];
const TAGLINE = 'AI/ML Engineer';

let activeIntro = null;

export function playIntro() {
  if (activeIntro) return;
  activeIntro = new IntroSequence(document.getElementById('intro'));
  activeIntro.start();
}

class IntroSequence {
  constructor(overlay) {
    this.overlay = overlay;
    this.canvas = overlay.querySelector('.intro-canvas');
    this.log = overlay.querySelector('.intro-log');
    this.taglineText = overlay.querySelector('.intro-tagline-text');
    this.startedAt = performance.now();
    this.phase = 'boot';             // boot → swarm → exit → done
    this.swarm = null;
    this.swarmStartedAt = 0;
    this.exitStartedAt = 0;
    this.timers = [];
    this.onSkip = () => this.beginExit();
    this.onResize = () => this.swarm?.resize();
  }

  // ───────────── lifecycle ─────────────

  async start() {
    window.scrollTo(0, 0);
    document.documentElement.classList.add('intro-pending');
    this.overlay.classList.remove('is-exiting', 'is-fallback');
    this.overlay.classList.add('is-active');
    this.log.textContent = '';
    this.taglineText.textContent = '';

    this.overlay.addEventListener('pointerdown', this.onSkip);
    window.addEventListener('keydown', this.onSkip);
    window.addEventListener('resize', this.onResize);
    this.later(SAFETY_TIMEOUT_MS, () => this.finish());

    this.typeBootLog();
    this.swarm = await this.loadSwarm();
    if (this.phase === 'done') {
      this.swarm?.dispose(); // intro already ended while loading: don't leak the WebGL canvas
      return;
    }
    const waitMs = Math.max(0, SWARM_EARLIEST_START_MS - (performance.now() - this.startedAt));
    this.later(waitMs, () => {
      if (this.phase !== 'boot') return; // skipped while the 3D was loading
      if (this.swarm) this.runSwarm();
      else this.runFallback();
    });
  }

  /** Load three.js and build the swarm, or give up (→ text fallback). */
  async loadSwarm() {
    try {
      const loading = import('./voxel-swarm.js');
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('3D took too long')), THREE_LOAD_TIMEOUT_MS));
      const { VoxelSwarm, SWARM_ASSEMBLED_AT } = await Promise.race([loading, timeout]);
      this.assembledAtMs = SWARM_ASSEMBLED_AT * 1000;
      return new VoxelSwarm(this.canvas);
    } catch (error) {
      console.warn('Intro is using the text-only version:', error.message);
      return null;
    }
  }

  runSwarm() {
    this.phase = 'swarm';
    this.swarmStartedAt = performance.now();
    this.later(this.assembledAtMs - 250, () => this.typeTagline());
    this.frame();
  }

  /** No WebGL: show the name as plain pixel text instead. */
  runFallback() {
    this.phase = 'swarm';
    this.overlay.classList.add('is-fallback');
    this.later(500, () => this.typeTagline());
  }

  frame() {
    if (this.phase === 'done') return;
    const now = performance.now();
    const exitProgress = this.phase === 'exit' ? Math.min((now - this.exitStartedAt) / 900, 1) : 0;
    this.swarm.render((now - this.swarmStartedAt) / 1000, exitProgress);
    requestAnimationFrame(() => this.frame());
  }

  /** Step 5: warp out and let the homepage slide in underneath. */
  beginExit() {
    if (this.phase === 'exit' || this.phase === 'done') return;
    this.phase = 'exit';
    this.exitStartedAt = performance.now();
    this.overlay.classList.add('is-exiting');
    // The page starts revealing now, so it slides in while the cubes fly past.
    document.documentElement.classList.remove('intro-pending');
    this.later(950, () => this.finish());
  }

  finish() {
    if (this.phase === 'done') return;
    this.phase = 'done';
    this.timers.forEach(clearTimeout);
    this.overlay.removeEventListener('pointerdown', this.onSkip);
    window.removeEventListener('keydown', this.onSkip);
    window.removeEventListener('resize', this.onResize);

    this.overlay.classList.remove('is-active', 'is-exiting');
    document.documentElement.classList.remove('intro-pending');
    this.swarm?.dispose();
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* private mode: fine */ }

    activeIntro = null;
    window.dispatchEvent(new Event('intro:done'));
  }

  // ───────────── text effects ─────────────

  async typeBootLog() {
    for (const line of BOOT_LINES) {
      if (this.phase === 'exit' || this.phase === 'done') return;
      const row = document.createElement('div');
      const marker = document.createElement('span');
      marker.className = line.ok ? 'intro-ok' : 'prompt';
      marker.textContent = line.ok ? '[ ok ] ' : '~ $ ';
      const text = document.createElement('span');
      row.append(marker, text);
      this.log.append(row);
      await this.typeInto(text, line.text, 9);
      await wait(90);
    }
  }

  typeTagline() {
    if (this.phase === 'exit' || this.phase === 'done') return;
    this.typeInto(this.taglineText, TAGLINE, 22).then(() => {
      this.later(HOLD_AFTER_TAGLINE_MS, () => this.beginExit());
    });
  }

  async typeInto(element, text, msPerCharacter) {
    for (let i = 1; i <= text.length; i++) {
      if (this.phase === 'done') return;
      element.textContent = text.slice(0, i);
      await wait(msPerCharacter);
    }
  }

  later(ms, callback) {
    this.timers.push(setTimeout(callback, ms));
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Start straight away if the <head> script decided this visit gets the intro.
if (document.documentElement.classList.contains('intro-pending')) playIntro();
