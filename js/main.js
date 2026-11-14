/**
 * Page wiring: the 3D model slots, the tmux-style status bar, and the clock.
 * The 3D code is loaded lazily so the text of the page never waits on it.
 */

setUpStatusBar();
setUpClock();
setUpVoxelSlots();
setUpIntroReplay();
setUpResumeLink();

// ───────────── 3D models ─────────────

/**
 * Every element with data-voxel-models="id,id,…" becomes a rotatable 3D view.
 * They all share one canvas (see js/viewer/voxel-stage.js).
 */
async function setUpVoxelSlots() {
  const slots = [...document.querySelectorAll('[data-voxel-models]')];
  if (slots.length === 0) return;

  let VoxelStage, VoxelView, MODEL_LIBRARY, stage;
  try {
    ({ VoxelStage } = await import('./viewer/voxel-stage.js'));
    ({ VoxelView } = await import('./viewer/voxel-view.js'));
    ({ MODEL_LIBRARY } = await import('./viewer/models/index.js'));
    stage = new VoxelStage();
  } catch (error) {
    console.error('3D models could not start:', error);
    showVoxelFallback(slots);
    return;
  }

  for (const slot of slots) {
    const models = slot.dataset.voxelModels.split(',').map((id) => MODEL_LIBRARY[id.trim()]);
    const caption = slot.querySelector('.voxel-caption');
    const view = new VoxelView(slot, models, {
      showSphere: slot.dataset.voxelSphere !== 'off',
      onModelChange: (model) => {
        if (caption) caption.textContent = `// ${model.caption}`;
      },
    });
    stage.addView(view);

    if (slot.id === 'hero-slot') connectHeroGallery(view, models);
  }
}

/** The hero slot has extra UI: model tabs, a file name label and a reset button. */
function connectHeroGallery(view, models) {
  const tabsContainer = document.getElementById('model-tabs');
  const fileLabel = document.getElementById('model-file');
  const caption = view.element.querySelector('.voxel-caption');

  const tabs = models.map((model, index) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'model-tab';
    tab.role = 'tab';
    tab.textContent = model.id;
    tab.addEventListener('click', () => view.showModel(index));
    tabsContainer.append(tab);
    return tab;
  });

  const markSelected = (model, selectedIndex) => {
    fileLabel.textContent = model.file;
    caption.textContent = `// ${model.caption}`;
    tabs.forEach((tab, index) => tab.setAttribute('aria-selected', String(index === selectedIndex)));
  };
  view.onModelChange = markSelected;
  markSelected(models[view.modelIndex], view.modelIndex);

  document.getElementById('viewer-reset').addEventListener('click', () => view.resetRotation());
  // When the intro hands over, pop the hero model in fresh so it's not already sitting there.
  window.addEventListener('intro:done', () => view.replayEntrance());
}

// ───────────── resume link ─────────────

/**
 * One click does both: the link itself opens the PDF in a new tab (its
 * target="_blank"), and this handler also starts a download. Without JavaScript
 * the link still works; it just opens the tab.
 */
function setUpResumeLink() {
  const link = document.getElementById('resume-link');
  link?.addEventListener('click', () => {
    const download = document.createElement('a');
    download.href = link.href;
    download.download = 'Muhammad-Ilyas-Khan-Resume.pdf'; // the file name the visitor gets
    download.click();
  });
}

// ───────────── intro replay ─────────────

function setUpIntroReplay() {
  document.getElementById('replay-intro')?.addEventListener('click', async () => {
    const { playIntro } = await import('./intro/intro.js');
    playIntro();
  });
}

function showVoxelFallback(slots) {
  for (const slot of slots) {
    const message = document.createElement('p');
    message.className = 'viewer-fallback';
    message.textContent = '~ $ 3d needs WebGL, which this browser has turned off.';
    slot.replaceChildren(message);
  }
}

// ───────────── status bar ─────────────

/**
 * Builds "0:hero 1:work …" from each section's data-section attribute and
 * highlights whichever section is currently in the middle of the screen.
 */
function setUpStatusBar() {
  const sections = [...document.querySelectorAll('[data-section]')];
  const windowsContainer = document.getElementById('status-windows');
  const topNavLinks = [...document.querySelectorAll('.topnav a')];

  const statusLinks = sections.map((section) => {
    const link = document.createElement('a');
    link.href = `#${section.id}`;
    link.textContent = section.dataset.section;
    windowsContainer.append(link);
    return link;
  });

  const highlight = (sectionId) => {
    for (const link of [...statusLinks, ...topNavLinks]) {
      link.classList.toggle('is-current', link.getAttribute('href') === `#${sectionId}`);
    }
  };

  // A thin band across the middle of the viewport decides which section is "current".
  const observer = new IntersectionObserver(
    (entries) => entries.filter((entry) => entry.isIntersecting).forEach((entry) => highlight(entry.target.id)),
    { rootMargin: '-45% 0px -50% 0px' },
  );
  sections.forEach((section) => observer.observe(section));
  highlight(sections[0].id);
}

// ───────────── clock ─────────────

function setUpClock() {
  const clock = document.getElementById('status-clock');
  const render = () => {
    clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  render();
  setInterval(render, 15_000);
}
