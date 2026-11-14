# Portfolio · Terminal brand (1a)

Plain HTML, CSS and JavaScript. No build step.

## Run it locally

The 3D code uses JavaScript modules, which browsers refuse to load from a double-clicked file. Start a tiny local server instead:

```bash
python3 -m http.server 5173
```

Then open http://localhost:5173.

## Put it online

Upload the whole folder to any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages). Nothing else is needed.

## Where to edit things

| What | Where |
|---|---|
| Text: career, projects, skills, links | `index.html` |
| Colours, fonts, spacing | `css/styles.css` (top of file: brand tokens) |
| Hero gallery models (knight, robot, terminal, gamepad, cube) | `js/viewer/models/hero-models.js` |
| Project-card models (football, microphone, planet, ID card, clapperboard) | `js/viewer/models/project-models.js` |
| Section models (camera, chip, chessboard, cap, book, envelope) | `js/viewer/models/section-models.js` |
| Drag / spin feel | `js/viewer/rotation-controls.js` (constants at the top) |
| Lights, camera, model pop-in | `js/viewer/voxel-view.js` |
| The one shared 3D canvas | `js/viewer/voxel-stage.js` |

## How the 3D works

- Any element with `data-voxel-models="football"` becomes a 3D slot. Several ids, comma-separated, make a gallery (the hero uses this).
- Add `data-voxel-sphere="off"` to hide the dotted globe.
- One transparent canvas covers the page and draws every visible slot into its own rectangle. This avoids the browser's limit on how many 3D canvases a page can have.
- On phones, the hero model turns freely; the others spin sideways so vertical swipes still scroll the page.

## The intro animation

- Plays once per browser session. Add `?intro` to the URL (e.g. `http://localhost:5173/?intro`) to force it, or click **▶ intro** in the status bar.
- Click, press any key or hit "skip intro →" to jump to the end.
- Skipped automatically for visitors whose system asks for reduced motion.
- Timing lives at the top of `js/intro/intro.js` (boot log text, tagline, hold time) and `js/intro/voxel-swarm.js` (`SWARM_TIMING`).
- Letters come from the 5×7 pixel font in `js/intro/pixel-font.js`.

## Placeholders to replace

- Your resume's GitHub / LinkedIn / Medium links point at the bare homepages (github.com, linkedin.com, medium.com). The website has the real ones now; fix the resume too.
- `assets/muhammad-ilyas-khan-resume.pdf` is a copy of your resume for the download button. It includes your phone number; remove the file and the button if you don't want that public.

## Adding your own 3D model

Copy a model object in one of the `models/` files and change `build()`.
A model is a `VoxelGrid` of coloured cubes: use `fillBox`, `fillSoftBox`, `fillDisc`,
`fillSphere`, `fillRing`, or draw pixel art row by row with `extrudeFrontView` /
`extrudeTopView`. Export it, then use its id in a `data-voxel-models` attribute.
