/**
 * Tuning menu, in the Dash Logo Motion tool's idiom: label / slider / readout
 * rows grouped under hairline section headers, each collapsible.
 *
 * The panel is view-driven — a nav select at the top switches which tool's
 * controls are showing. Every view's controls are built once and hidden, so
 * switching back preserves collapse state and slider positions.
 *
 * Controls span several domains. Some drive the WebGL rig
 * (`CharacterView.setConfig`), some drive CSS custom properties on the card,
 * some drive the 2D loop player. `domain` on each group is what tells
 * `main.js` where a change should go.
 */

import { createSelect } from './Select.js';

export const EASINGS = {
  linear: 'linear',
  'ease-in': 'cubic-bezier(0.42, 0, 1, 1)',
  'ease-out': 'cubic-bezier(0, 0, 0.58, 1)',
};

export function createPanel({ views, activeView, config, onChange, onView }) {
  const el = document.createElement('div');
  el.className = 'left-pane';

  /* Nav */

  const navWrap = document.createElement('div');
  navWrap.className = 'nav-select-wrap';
  const nav = document.createElement('select');
  nav.className = 'nav-select';
  // Browsers restore a select's value across a reload without firing `change`,
  // which would leave the nav pointing at one view while the panel and
  // artboard still show the other.
  nav.autocomplete = 'off';
  for (const view of views) {
    const option = document.createElement('option');
    option.value = view.id;
    option.textContent = view.label;
    nav.appendChild(option);
  }
  nav.value = activeView;
  navWrap.appendChild(nav);
  el.appendChild(navWrap);

  /* One controls block per view, only one visible at a time */

  const renderers = new Map();
  const blocks = new Map();

  for (const view of views) {
    const controls = document.createElement('div');
    controls.className = 'controls';
    controls.hidden = view.id !== activeView;

    for (const group of view.groups) {
      controls.appendChild(buildGroup(group, config, onChange, renderers));
    }
    for (const action of view.actions ?? []) {
      controls.appendChild(pillButton(action.label, action.onClick));
    }

    blocks.set(view.id, controls);
    el.appendChild(controls);
  }

  const status = document.createElement('div');
  status.className = 'status';
  el.appendChild(status);

  const setView = (id) => {
    for (const [key, block] of blocks) block.hidden = key !== id;
    const view = views.find((v) => v.id === id);
    status.textContent = view?.hint ?? '';
  };
  setView(activeView);

  nav.addEventListener('change', () => {
    setView(nav.value);
    onView(nav.value);
  });

  return {
    el,
    setStatus(text) {
      status.textContent = text;
    },
    /** Restore the status line to the active view's standing hint. */
    clearStatus() {
      status.textContent = views.find((v) => v.id === nav.value)?.hint ?? '';
    },
    setView(id) {
      nav.value = id;
      setView(id);
    },
    /** Push config back into the controls (after a reset, or a preset load). */
    sync(next) {
      for (const [key, render] of renderers) render(next[key]);
    },
  };
}

function buildGroup(group, config, onChange, renderers) {
  const section = document.createElement('details');
  section.className = 'section';
  section.open = true;

  const summary = document.createElement('summary');
  summary.textContent = group.legend;
  section.appendChild(summary);

  const body = document.createElement('div');
  body.className = 'section-body';
  section.appendChild(body);

  for (const control of group.controls) {
    const row = document.createElement('div');
    row.className = 'row';

    const label = document.createElement('span');
    label.className = 'lbl';
    label.textContent = control.label;

    const readout = document.createElement('span');
    readout.className = 'readout';

    let field;
    if (control.type === 'toggle') {
      field = document.createElement('button');
      field.type = 'button';
      field.className = 'switch';
      field.setAttribute('role', 'switch');
      const paint = (on) => field.setAttribute('aria-checked', String(!!on));
      paint(config[control.key]);
      field.innerHTML = '<span class="knob"></span>';
      field.addEventListener('click', () => {
        const next = field.getAttribute('aria-checked') !== 'true';
        paint(next);
        onChange({ [control.key]: next }, group.domain);
      });
      renderers.set(control.key, paint);
    } else if (control.type === 'select') {
      // Custom rather than <select>: native popups are positioned by the OS,
      // which centres them on the current selection and so opens upward on a
      // long list. See Select.js.
      const select = createSelect({
        options: control.options,
        value: config[control.key],
        onChange: (value) => onChange({ [control.key]: value }, group.domain),
      });
      field = select.el;
      renderers.set(control.key, (value) => select.setValue(value));
    } else {
      field = document.createElement('input');
      field.type = 'range';
      field.min = control.min;
      field.max = control.max;
      field.step = control.step;
      field.value = config[control.key];

      const render = (value) => {
        readout.textContent = format(control, value);
      };
      render(config[control.key]);
      renderers.set(control.key, (value) => {
        field.value = value;
        render(value);
      });

      field.addEventListener('input', () => {
        const value = Number(field.value);
        render(value);
        onChange({ [control.key]: value }, group.domain);
      });
    }

    field.id = `ctl-${control.key}`;
    // Selects and toggles have no value to print, so they take the readout's
    // width too rather than leaving a dead 42px gutter.
    row.append(label, field);
    if (!control.type) row.append(readout);
    body.appendChild(row);
  }

  return section;
}

function pillButton(text, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pill-btn';
  button.textContent = text;
  button.addEventListener('click', onClick);
  return button;
}

function format(control, value) {
  const display = control.toDisplay ? control.toDisplay(value) : value;
  return `${display.toFixed(control.decimals ?? 0)}${control.unit ?? ''}`;
}
