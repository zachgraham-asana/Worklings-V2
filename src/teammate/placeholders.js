/**
 * Stand-ins so the builder is usable before real art lands.
 *
 * The body is deliberately *greyscale*, because that's what the Hard Light
 * pipeline needs: mid-grey reproduces the palette colour exactly, lighter
 * areas screen toward white and darker areas multiply toward black. Ship a
 * pre-tinted body and the colour control stops meaning anything.
 *
 * Both are replaced the moment a PNG appears in `_Assets/bodies` or
 * `_Assets/eyes`.
 */

const SIZE = 512;

// Seven lobes around a centre, matching the reference silhouette. Overlapping
// circles with one fill read as a single blobby form.
function lobes() {
  const petals = [];
  const count = 7;
  const r = 116;
  const ring = 132;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const cx = 256 + Math.cos(angle) * ring;
    const cy = 256 + Math.sin(angle) * ring;
    petals.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}"/>`);
  }
  petals.push('<circle cx="256" cy="256" r="170"/>');
  return petals.join('');
}

const bodySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <radialGradient id="shade" cx="0.36" cy="0.28" r="0.78">
      <stop offset="0"    stop-color="#efefef"/>
      <stop offset="0.42" stop-color="#b8b8b8"/>
      <stop offset="0.78" stop-color="#8a8a8a"/>
      <stop offset="1"    stop-color="#5e5e5e"/>
    </radialGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="3" result="n"/>
      <feColorMatrix in="n" type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.10"/></feComponentTransfer>
    </filter>
    <clipPath id="silhouette">${lobes()}</clipPath>
  </defs>
  <g clip-path="url(#silhouette)">
    <rect width="${SIZE}" height="${SIZE}" fill="url(#shade)"/>
    <rect width="${SIZE}" height="${SIZE}" filter="url(#grain)" opacity="0.5"
          style="mix-blend-mode:overlay"/>
  </g>
</svg>`;

const eye = (cx) => `
  <g>
    <ellipse cx="${cx}" cy="262" rx="42" ry="62" fill="#000"/>
    <ellipse cx="${cx - 12}" cy="228" rx="14" ry="19" fill="#fff" opacity="0.5"/>
  </g>`;

const eyesSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  ${eye(212)}${eye(310)}
</svg>`;

const toUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export const PLACEHOLDER_BODY = toUrl(bodySvg);
export const PLACEHOLDER_EYES = toUrl(eyesSvg);
