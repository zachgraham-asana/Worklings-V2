import './styles.css';

import { DEFAULT_CONFIG } from './character/CharacterView.js';
import {
  canvasTexture,
  loadModel,
  loadTexture,
  makeSpriteSubject,
} from './character/subjects.js';
import { sampleAccent } from './character/accent.js';
import { renderTeammate } from './teammate/composite.js';
import { DEFAULT_LOOP, LoopPlayer } from './twod/LoopPlayer.js';
import { DEFAULT_EXPORT, downloadBlob, exportLoopGif } from './twod/exportGif.js';
import { DEFAULT_TEAMMATE, TeammateView } from './teammate/TeammateView.js';
import { DEFAULT_PULSE, PulseView } from './teammate/PulseView.js';
import { USING_PLACEHOLDER_BODY } from './teammate/assets.js';
import { DEFAULT_HOVER, GalleryCard } from './ui/GalleryCard.js';
import { createPanel } from './ui/panel.js';
import {
  CARD_GROUPS,
  LOOP_GROUPS,
  TEAMMATE_GROUPS,
  THINKING_GROUPS,
  VIEW_2D,
  VIEW_3D,
  VIEW_TEAMMATE,
  VIEW_THINKING,
} from './views.js';

const CARD = {
  title: 'Content Localization Manager',
  description: 'Turn market data into actionable competitive comparison summaries.',
  tags: ['Competitor Intel', 'Market Synthesis', '+1'],
};

// Resolution the teammate is flattened to for the card's texture. Independent
// of the builder's preview size — that only affects how large it's drawn on
// screen, not how much detail the 3D subject carries.
const TEAMMATE_TEXTURE_SIZE = 512;

const app = document.querySelector('#app');

/* ── Artboard ────────────────────────────────────────────────────────────── */

const stage = document.createElement('div');
stage.className = 'right-pane';

const teammateStage = document.createElement('div');
teammateStage.className = 'artboard';

const thinkingStage = document.createElement('div');
thinkingStage.className = 'artboard';
thinkingStage.hidden = true;

const cardStage = document.createElement('div');
cardStage.className = 'artboard';
cardStage.hidden = true;

const loopStage = document.createElement('div');
loopStage.className = 'artboard';
loopStage.hidden = true;

stage.append(teammateStage, thinkingStage, cardStage, loopStage);

const teammate = new TeammateView(teammateStage);

// Its own TeammateView defaults to the same DEFAULT_TEAMMATE the builder
// starts on, so the two begin in sync with no explicit hand-off; every
// change after that is forwarded through the 'teammate' branch below.
const pulse = new PulseView(thinkingStage);

const card = new GalleryCard(CARD);
cardStage.appendChild(card.el);

const loop = new LoopPlayer(loopStage);

/* ── Config ──────────────────────────────────────────────────────────────── */

const DEFAULTS = {
  ...DEFAULT_CONFIG,
  ...DEFAULT_HOVER,
  ...DEFAULT_LOOP,
  ...DEFAULT_EXPORT,
  ...DEFAULT_TEAMMATE,
  ...DEFAULT_PULSE,
};
const config = { ...DEFAULTS };
card.setHoverStyle(config);

let activeView = VIEW_TEAMMATE;

const panel = createPanel({
  activeView,
  config,
  views: [
    {
      id: VIEW_TEAMMATE,
      label: 'Workling Builder',
      groups: TEAMMATE_GROUPS,
      hint: USING_PLACEHOLDER_BODY
        ? 'Placeholder art — drop greyscale body PNGs into _Assets/bodies to replace it.'
        : 'Colour is Hard Light over the greyscale body; eyes composite on top.',
      actions: [{ label: 'Reset to defaults', onClick: () => resetView(TEAMMATE_GROUPS) }],
    },
    {
      id: VIEW_THINKING,
      label: 'Workling Thinking',
      groups: THINKING_GROUPS,
      hint: 'Pulses to represent a Workling processing a request. Character comes from the Workling Builder.',
      actions: [{ label: 'Reset to defaults', onClick: () => resetView(THINKING_GROUPS) }],
    },
    {
      id: VIEW_3D,
      label: '3D Card',
      groups: CARD_GROUPS,
      hint: 'Character comes from the Workling Builder. Loading a file overrides it for this session.',
      actions: [
        { label: 'Load PNG or OBJ', onClick: () => pickFile() },
        { label: 'Reset to defaults', onClick: () => resetView(CARD_GROUPS) },
      ],
    },
    {
      id: VIEW_2D,
      label: '2D Loader',
      groups: LOOP_GROUPS,
      hint: 'Shapes swap at peak compression, so the bounce carries the cut.',
      actions: [
        { label: 'Export GIF', onClick: () => runExport() },
        { label: 'Reset to defaults', onClick: () => resetView(LOOP_GROUPS) },
      ],
    },
  ],
  // `domain` comes from the control's group, and decides which subsystem a
  // change belongs to: the WebGL rig takes patches, the CSS hover styling is
  // rewritten wholesale from current config, the loop player takes patches.
  onChange: (patch, domain) => {
    Object.assign(config, patch);
    if (domain === 'card') card.setHoverStyle(config);
    else if (domain === 'loop') loop.setConfig(patch);
    else if (domain === 'teammate') {
      teammate.setConfig(patch);
      // The pulse and the 3D card both wear whatever's built here — pulse
      // takes the DOM-rendered parts directly, the card needs a re-flattened
      // texture (below) since it's a WebGL subject, not a DOM element.
      pulse.setConfig(patch);
      if (['body', 'eyes', 'teammateColor'].some((k) => k in patch)) syncCardCharacter();
    } else if (domain === 'thinking') pulse.setConfig(patch);
    else if (domain === 'export') { /* read straight from config at export time */ }
    else card.view.setConfig(patch);
  },
  onView: (id) => setActiveView(id),
});

app.append(panel.el, stage);

function setActiveView(id) {
  activeView = id;
  const is2d = id === VIEW_2D;
  const isThinking = id === VIEW_THINKING;
  teammateStage.hidden = id !== VIEW_TEAMMATE;
  thinkingStage.hidden = !isThinking;
  cardStage.hidden = id !== VIEW_3D;
  loopStage.hidden = !is2d;

  // Only the visible tool animates — the shared ticker parks itself when the
  // card's springs settle, and neither the loop nor the pulse ever settle, so
  // leaving either running behind a hidden artboard would burn a frame budget
  // for nothing.
  if (is2d) loop.start();
  else loop.stop();
  if (isThinking) pulse.start();
  else pulse.stop();
}
setActiveView(activeView);

let exporting = false;

async function runExport() {
  if (exporting) return; // a second click mid-encode would interleave frames
  exporting = true;
  try {
    const blob = await exportLoopGif(config, {
      onProgress: (p) => panel.setStatus(`Encoding GIF… ${Math.round(p * 100)}%`),
    });
    downloadBlob(blob, `shape-loop-${config.transition}-${config.shapeSize}px.gif`);
    panel.setStatus(`Exported ${(blob.size / 1024).toFixed(0)} KB`);
  } catch (error) {
    panel.setStatus(`Export failed: ${error.message}`);
    throw error;
  } finally {
    exporting = false;
    setTimeout(() => panel.clearStatus(), 4000);
  }
}

/** Restore only the keys belonging to the given groups, not the whole config. */
function resetView(groups) {
  const patch = {};
  for (const group of groups) {
    for (const control of group.controls) patch[control.key] = DEFAULTS[control.key];
  }
  Object.assign(config, patch);

  card.view.setConfig(config);
  card.setHoverStyle(config);
  loop.setConfig(config);
  teammate.setConfig(config);
  pulse.setConfig(config);
  syncCardCharacter();
  panel.sync(config);
}

/* ── The card's character ────────────────────────────────────────────────── */

// Renders are async, and two controls changed in quick succession can resolve
// out of order — leaving the card showing an older teammate than the config
// says. Only the newest request is allowed to land.
let cardSyncToken = 0;

/** The built teammate, flattened and handed to the card's 3D rig. */
async function syncCardCharacter() {
  const token = ++cardSyncToken;
  const canvas = await renderTeammate(config, TEAMMATE_TEXTURE_SIZE);
  if (token !== cardSyncToken) return;
  useSubject(canvasTexture(canvas), canvas);
}

function useSubject(texture, sampleFrom) {
  card.view.setSubject(makeSpriteSubject(texture, { curve: config.curve }));

  // Sampled rather than taken from `teammateColor` directly: the palette
  // colours are pastels chosen to survive Hard Light, and a 1px border needs
  // more saturation than that to read on white.
  const accent = sampleAccent(sampleFrom);
  card.setAccent(accent);
  document.documentElement.style.setProperty('--card-accent', accent);
}

async function useTexture(url) {
  const texture = await loadTexture(url);
  useSubject(texture, texture.image);
}

async function useModel(url) {
  card.view.setSubject(await loadModel(url));
}

function pickFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.png,.jpg,.jpeg,.webp,.svg,.obj';
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) applyFile(file);
  });
  input.click();
}

async function applyFile(file) {
  const name = file.name;

  if (name.toLowerCase().endsWith('.obj')) {
    const url = URL.createObjectURL(file);
    try {
      await useModel(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    return;
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  // A one-off override for this session. Changing any teammate part rebuilds
  // the subject from the builder and takes the card back over.
  await useTexture(dataUrl);
}

/* ── Drag and drop onto the artboard ─────────────────────────────────────── */

let dragDepth = 0;

stage.addEventListener('dragenter', (e) => {
  if (activeView !== VIEW_3D) return;
  e.preventDefault();
  dragDepth += 1;
  stage.classList.add('is-dropping');
});

stage.addEventListener('dragover', (e) => {
  if (activeView === VIEW_3D) e.preventDefault();
});

stage.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) stage.classList.remove('is-dropping');
});

stage.addEventListener('drop', (e) => {
  if (activeView !== VIEW_3D) return;
  e.preventDefault();
  dragDepth = 0;
  stage.classList.remove('is-dropping');
  const file = e.dataTransfer?.files?.[0];
  if (file) applyFile(file);
});

syncCardCharacter();

// Handy from the console while tuning: `__ait.view.lookAt(x, y)`, `__ait.config`.
window.__ait = { card, loop, pulse, config, get view() { return card.view; } };
