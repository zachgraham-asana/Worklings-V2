/**
 * A "subject" is whatever the look-at rig is pointing at the cursor.
 *
 * Today that's a flat PNG. The trick that keeps it from looking like a
 * rotating sticker is `makeCurvedPlane`: the image is mapped onto a shallow
 * barrel instead of a flat quad, so yaw shifts the silhouette and the scene
 * light rakes across a real curved normal. Tuned low (0.12–0.2) it reads as
 * volume; pushed high it reads as a fisheye.
 *
 * When the OBJ arrives, `loadModel` returns an Object3D from the same call
 * site and nothing in CharacterView changes — the rig drives whatever it is
 * given.
 */

import {
  Box3,
  CanvasTexture,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
} from 'three';

export function makeCurvedPlaneGeometry(width, height, curve, segments = 40) {
  const geometry = new PlaneGeometry(width, height, segments, segments);
  const pos = geometry.attributes.position;
  const hw = width / 2;
  const hh = height / 2;

  for (let i = 0; i < pos.count; i += 1) {
    const u = pos.getX(i) / hw; // -1..1 across
    const v = pos.getY(i) / hh; // -1..1 up
    const across = 1 - u * u;
    const up = 1 - v * v;
    // Mostly a horizontal barrel, with a little vertical doming so the top and
    // bottom edges fall away too.
    pos.setZ(i, curve * across * (0.6 + 0.4 * up));
  }

  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

export function loadTexture(url) {
  return new Promise((resolve, reject) => {
    new TextureLoader().load(
      url,
      (texture) => {
        texture.colorSpace = SRGBColorSpace;
        texture.anisotropy = 8;
        resolve(texture);
      },
      undefined,
      () => reject(new Error(`Could not load character texture: ${url}`))
    );
  });
}

/** For a subject composited at runtime rather than loaded from a file. */
export function canvasTexture(canvas) {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function makeSpriteSubject(texture, { curve = 0.16, height = 1 } = {}) {
  const image = texture.image;
  const aspect = image?.width && image?.height ? image.width / image.height : 1;
  const width = height * aspect;

  const material = new MeshStandardMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.02,
    roughness: 0.78,
    metalness: 0,
  });

  const mesh = new Mesh(makeCurvedPlaneGeometry(width, height, curve), material);
  mesh.userData.rebuildCurve = (nextCurve) => {
    mesh.geometry.dispose();
    mesh.geometry = makeCurvedPlaneGeometry(width, height, nextCurve);
  };
  mesh.userData.aspect = aspect;
  return mesh;
}

/**
 * OBJ path — wired but unused until a model exists.
 *
 * OBJ carries no materials of its own, so an accompanying .mtl (or an explicit
 * material override) is expected; without either, three falls back to white
 * and the character will look unpainted. The returned object is normalised to
 * the same 1-unit height the sprite uses, and recentred on its own bounding
 * box, so swapping subjects doesn't disturb camera or framing.
 */
export async function loadModel(url, { height = 1, material = null } = {}) {
  // Loaded on demand so the OBJ loader stays out of the initial bundle.
  const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js');

  const root = await new Promise((resolve, reject) => {
    new OBJLoader().load(url, resolve, undefined, () =>
      reject(new Error(`Could not load model: ${url}`))
    );
  });

  if (material) {
    root.traverse((child) => {
      if (child.isMesh) child.material = material;
    });
  }

  const box = new Box3().setFromObject(root);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const scale = size.y > 0 ? height / size.y : 1;

  root.position.sub(center);
  root.scale.setScalar(scale);
  root.position.multiplyScalar(scale);
  root.userData.rebuildCurve = () => {}; // curvature is a 2D-only concern
  root.userData.aspect = size.y > 0 ? size.x / size.y : 1;
  return root;
}
