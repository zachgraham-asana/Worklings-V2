/**
 * Dropdown that always opens downward.
 *
 * A native `<select>` can't do this: macOS positions the popup itself,
 * centring it on the current selection, so a long list with a mid-list value
 * selected opens upward over the control. No CSS reaches that.
 *
 * The list is `position: fixed` and placed from the trigger's rect rather than
 * absolutely positioned inside it — the panel is a scroll container, and an
 * absolutely positioned menu would be clipped by its `overflow-y: auto`. Fixed
 * positioning escapes that, at the cost of having to close on scroll/resize
 * since it no longer travels with the trigger.
 */

const GAP = 6;
const MIN_SPACE = 120; // don't bother opening into a sliver

export function createSelect({ options, value, onChange, className = '' }) {
  const root = document.createElement('div');
  root.className = `sel ${className}`.trim();

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'sel-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');

  const list = document.createElement('div');
  list.className = 'sel-list';
  list.setAttribute('role', 'listbox');
  list.hidden = true;

  let current = value;
  let activeIndex = Math.max(0, options.findIndex((o) => o.value === value));

  const items = options.map((option, index) => {
    const item = document.createElement('div');
    item.className = 'sel-item';
    item.setAttribute('role', 'option');
    item.textContent = option.label;
    item.addEventListener('click', () => {
      commit(option.value);
      close();
    });
    item.addEventListener('mousemove', () => setActive(index));
    list.appendChild(item);
    return item;
  });

  function paint() {
    const option = options.find((o) => o.value === current) ?? options[0];
    trigger.textContent = option?.label ?? '';
    items.forEach((item, i) => {
      const selected = options[i].value === current;
      item.setAttribute('aria-selected', String(selected));
      item.classList.toggle('is-selected', selected);
      item.classList.toggle('is-active', i === activeIndex);
    });
  }

  function setActive(index) {
    activeIndex = Math.min(Math.max(index, 0), options.length - 1);
    paint();
    if (!list.hidden) items[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }

  function commit(next) {
    if (next === current) return;
    current = next;
    activeIndex = options.findIndex((o) => o.value === next);
    paint();
    onChange(next);
  }

  function position() {
    const rect = trigger.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - GAP * 2;
    list.style.left = `${rect.left}px`;
    list.style.width = `${rect.width}px`;
    list.style.top = `${rect.bottom + GAP}px`;
    // Always downward: if there isn't room, the list scrolls rather than flips.
    list.style.maxHeight = `${Math.max(MIN_SPACE, below)}px`;
  }

  function open() {
    if (!list.hidden) return;
    list.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    root.classList.add('is-open');
    position();
    setActive(Math.max(0, options.findIndex((o) => o.value === current)));
    document.addEventListener('pointerdown', onOutside, true);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
  }

  function close() {
    if (list.hidden) return;
    list.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    root.classList.remove('is-open');
    document.removeEventListener('pointerdown', onOutside, true);
    window.removeEventListener('scroll', close, true);
    window.removeEventListener('resize', close);
  }

  function onOutside(event) {
    if (!root.contains(event.target) && !list.contains(event.target)) close();
  }

  trigger.addEventListener('click', () => (list.hidden ? open() : close()));

  trigger.addEventListener('keydown', (event) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (list.hidden) open();
        else setActive(activeIndex + (event.key === 'ArrowDown' ? 1 : -1));
        break;
      }
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (list.hidden) open();
        else {
          commit(options[activeIndex].value);
          close();
        }
        break;
      case 'Escape':
        close();
        break;
      case 'Home':
        if (!list.hidden) { event.preventDefault(); setActive(0); }
        break;
      case 'End':
        if (!list.hidden) { event.preventDefault(); setActive(options.length - 1); }
        break;
      default:
        break;
    }
  });

  root.append(trigger, list);
  // The list is fixed-position, so it lives on <body> to sit above the panel's
  // stacking context rather than inside its scroll container.
  document.body.appendChild(list);
  paint();

  return {
    el: root,
    get value() {
      return current;
    },
    setValue(next) {
      current = next;
      activeIndex = Math.max(0, options.findIndex((o) => o.value === next));
      paint();
    },
  };
}
