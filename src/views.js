/**
 * Control definitions per tool view. Kept apart from `panel.js` so the panel
 * stays a renderer and this file stays the thing you edit to add a knob.
 */

import { BODIES, EYES } from './teammate/assets.js';
import { TEAMMATE_COLORS } from './teammate/colors.js';
import { PALETTE } from './twod/palette.js';

export const VIEW_TEAMMATE = 'teammate-builder';
export const VIEW_THINKING = 'workling-thinking';
export const VIEW_3D = '3d-card';
export const VIEW_2D = '2d-loader';

const degrees = (v) => (v * 180) / Math.PI;

export const TEAMMATE_GROUPS = [
  {
    legend: 'Teammate',
    domain: 'teammate',
    controls: [
      { key: 'body', label: 'Body', type: 'select', options: BODIES },
      {
        key: 'teammateColor',
        label: 'Color',
        type: 'select',
        options: TEAMMATE_COLORS.map((c) => ({ value: c.hex, label: c.label })),
      },
      { key: 'eyes', label: 'Eyes', type: 'select', options: EYES },
    ],
  },
  {
    legend: 'Preview',
    domain: 'teammate',
    controls: [
      { key: 'teammateSize', label: 'Size', min: 24, max: 240, step: 8, unit: 'px' },
    ],
  },
];

export const THINKING_GROUPS = [
  {
    legend: 'Pulse',
    domain: 'thinking',
    controls: [
      { key: 'thinkingMaxSize', label: 'Max Size', min: 4, max: 48, step: 1, unit: 'px' },
      // Naming matches the request — it's a pixel size like Max Size, not a
      // unitless scale factor, just the small end of the pulse rather than the large.
      { key: 'thinkingMinSize', label: 'Min Scale', min: 4, max: 48, step: 1, unit: 'px' },
      { key: 'thinkingSpeed', label: 'Speed', min: 100, max: 2000, step: 10, unit: 'ms' },
      // 0 = no overshoot at all, which is why the curve is easeOutBack rather
      // than a spring — a spring can't express "no bounce". See PulseView.
      { key: 'thinkingBounce', label: 'Bounce', min: 0, max: 4, step: 0.05, decimals: 2 },
    ],
  },
  {
    legend: 'Easing',
    domain: 'thinking',
    controls: [
      // 0 = linear, 1 = fully eased. Separate per direction so the pulse can
      // snap one way and glide the other.
      { key: 'thinkingEaseUp', label: 'Scale Up', min: 0, max: 1, step: 0.01, decimals: 2 },
      { key: 'thinkingEaseDown', label: 'Scale Down', min: 0, max: 1, step: 0.01, decimals: 2 },
    ],
  },
  {
    legend: 'Border',
    domain: 'thinking',
    controls: [
      // Phrased as "Animate" rather than "Off" — a switch labelled Off reads
      // backwards, since turning it *on* would turn the effect off.
      { key: 'thinkingBorderAnimate', label: 'Animate', type: 'toggle' },
      // Duration of one full lap, so — like the other Speed sliders here —
      // dragging right slows it down.
      { key: 'thinkingBorderSpeed', label: 'Speed', min: 300, max: 6000, step: 50, unit: 'ms' },
    ],
  },
];

export const CARD_GROUPS = [
  {
    legend: '3D Controls',
    domain: 'view',
    controls: [
      { key: 'maxYaw', label: 'Yaw', min: 0, max: 1.2, step: 0.01, unit: '°', toDisplay: degrees },
      { key: 'maxPitch', label: 'Pitch', min: 0, max: 1.2, step: 0.01, unit: '°', toDisplay: degrees },
      { key: 'reach', label: 'Reach', min: 80, max: 700, step: 10, unit: 'px' },
      { key: 'shift', label: 'Parallax', min: 0, max: 0.2, step: 0.005, decimals: 3 },
      { key: 'hoverScale', label: 'Scale', min: 1, max: 1.3, step: 0.01, decimals: 2 },
    ],
  },
  {
    legend: 'Motion',
    domain: 'view',
    controls: [
      { key: 'stiffness', label: 'Stiffness', min: 20, max: 260, step: 1 },
      { key: 'damping', label: 'Damping', min: 4, max: 40, step: 0.5, decimals: 1 },
    ],
  },
  {
    legend: 'Surface',
    domain: 'view',
    controls: [
      { key: 'curve', label: 'Barrel', min: 0, max: 0.45, step: 0.005, decimals: 3 },
      // min 0.05 rather than 0.2 so the 2.25 default lands exactly on a step
      // (steps run from min, and 0.2 + n*0.02 never hits 2.25).
      { key: 'ambient', label: 'Ambient', min: 0.05, max: 2.5, step: 0.02, decimals: 2 },
      { key: 'key', label: 'Key', min: 0, max: 2.5, step: 0.02, decimals: 2 },
    ],
  },
  {
    legend: 'Card hover',
    domain: 'card',
    controls: [
      { key: 'cardScale', label: 'Scale', min: 1, max: 1.12, step: 0.005, decimals: 3 },
      { key: 'glowSize', label: 'Glow', min: 0, max: 90, step: 1, unit: 'px' },
      { key: 'glowOpacity', label: 'Opacity', min: 0, max: 1, step: 0.01, decimals: 2 },
      {
        key: 'easing',
        label: 'Type',
        type: 'select',
        options: [
          { value: 'linear', label: 'Linear' },
          { value: 'ease-in', label: 'Ease in' },
          { value: 'ease-out', label: 'Ease out' },
        ],
      },
      // Duration, not rate: dragging right makes the hover animation longer.
      { key: 'duration', label: 'Speed', min: 60, max: 800, step: 10, unit: 'ms' },
    ],
  },
];

export const LOOP_GROUPS = [
  {
    legend: 'Loop',
    domain: 'loop',
    controls: [
      { key: 'shapeCount', label: 'Shapes', min: 2, max: 16, step: 1 },
      // Duration of one shape's beat — dragging right slows the loop down.
      { key: 'beat', label: 'Speed', min: 120, max: 1600, step: 20, unit: 'ms' },
    ],
  },
  {
    legend: 'Transition',
    domain: 'loop',
    controls: [
      {
        key: 'transition',
        label: 'Style',
        type: 'select',
        options: [
          { value: 'squash', label: 'Squash' },
          { value: 'scale', label: 'Scale' },
          { value: 'spin', label: 'Spin' },
        ],
      },
      // Depth of the deformation, whichever style is driving it.
      { key: 'squash', label: 'Amount', min: 0, max: 0.4, step: 0.01, decimals: 2 },
      { key: 'overshoot', label: 'Overshoot', min: 0, max: 4, step: 0.05, decimals: 2 },
    ],
  },
  {
    legend: 'Color',
    domain: 'loop',
    controls: [{ key: 'cycleColor', label: 'Cycle', type: 'toggle' }],
  },
  {
    legend: 'Preview',
    domain: 'loop',
    controls: [{ key: 'shapeSize', label: 'Size', min: 32, max: 320, step: 4, unit: 'px' }],
  },
  {
    legend: 'Export',
    domain: 'export',
    controls: [
      { key: 'exportSize', label: 'Size', min: 64, max: 1024, step: 32, unit: 'px' },
      {
        key: 'exportFps',
        label: 'FPS',
        type: 'select',
        // GIF delays are whole hundredths of a second, so only rates that
        // divide 100 play at their stated speed. 50 and 25 do; 30 does not.
        options: [
          { value: '50', label: '50 fps' },
          { value: '25', label: '25 fps' },
        ],
      },
      {
        key: 'exportBg',
        label: 'Matte',
        type: 'select',
        options: [
          { value: 'transparent', label: 'Transparent (hard edges)' },
          { value: '#ffffff', label: 'White (smooth)' },
          { value: '#f6f7f8', label: 'Artboard (smooth)' },
        ],
      },
    ],
  },
];
