/**
 * Discover teammate parts from `_Assets/bodies` and `_Assets/eyes`.
 *
 * Globbed at build time, so dropping a PNG into either folder is the whole
 * registration step — no manifest to keep in sync. Vite hashes and copies each
 * one into `dist`, so they ship with the build.
 */

import { PLACEHOLDER_BODY, PLACEHOLDER_EYES } from './placeholders.js';

const bodyFiles = import.meta.glob('../../_Assets/bodies/*.{png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const eyeFiles = import.meta.glob('../../_Assets/eyes/*.{png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

/**
 * Everything after the first underscore is the menu label:
 * `Workling_Fish.png` → `Fish`, `Workling_StackedTubes.png` → `Stacked Tubes`.
 *
 * Casing is preserved rather than title-cased, so the filename is the label —
 * but CamelCase is split on the lower→upper boundary, since the art is named
 * `StackedTubes` and the menu should read "Stacked Tubes". That boundary
 * leaves `3D Printer` and `Kettlebell` alone.
 *
 * Files with no underscore fall back to prettifying the whole name, which is
 * what the eye plates use — they're already named `Arc Up.png`, `Oval.png`.
 */
function labelFor(path) {
  const name = (path.split('/').pop() ?? path).replace(/\.(png|webp)$/i, '');
  const underscore = name.indexOf('_');

  if (underscore !== -1 && underscore < name.length - 1) {
    return name
      .slice(underscore + 1)
      .replace(/_+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim();
  }

  return name
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function toOptions(files) {
  return Object.entries(files)
    .map(([path, url]) => ({ value: url, label: labelFor(path) }))
    // Sorted by label, since that's the order the menu actually shows.
    .sort((a, b) => a.label.localeCompare(b.label));
}

const discoveredBodies = toOptions(bodyFiles);
const discoveredEyes = toOptions(eyeFiles);

/** Falls back to the first entry if the named default isn't present. */
function preferred(options, label) {
  return options.find((o) => o.label === label) ?? options[0];
}

export const BODIES = discoveredBodies.length
  ? discoveredBodies
  : [{ value: PLACEHOLDER_BODY, label: 'Placeholder' }];

// Eyes are optional in a way bodies aren't — a bare body is a legitimate state.
export const EYES = [
  { value: 'none', label: 'None' },
  ...(discoveredEyes.length
    ? discoveredEyes
    : [{ value: PLACEHOLDER_EYES, label: 'Placeholder' }]),
];

/** URL → menu label, so per-body layout data can be keyed by a stable name
 *  rather than a build-hashed URL. */
export const BODY_LABELS = new Map(BODIES.map((b) => [b.value, b.label]));

export const USING_PLACEHOLDER_BODY = discoveredBodies.length === 0;
export const USING_PLACEHOLDER_EYES = discoveredEyes.length === 0;

/** What a fresh session opens on. Named, not positional, so reordering the
 *  folder or adding art can't quietly change the default. */
export const DEFAULT_BODY = preferred(BODIES, 'Stacked Tubes').value;
export const DEFAULT_EYES = preferred(EYES.slice(1), 'Oval')?.value ?? 'none';
