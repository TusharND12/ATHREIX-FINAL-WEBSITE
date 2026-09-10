import * as THREE from 'three'

/**
 * THE LATENT FIELD
 *
 * One THREE.Points cloud, one draw call, five positions per point. The vertex
 * shader blends between those five layouts using five weights, so the whole
 * cloud reorganises itself without a single position being touched on the CPU.
 * Scroll drives the weights; that is the entire mechanism.
 *
 *   0  noise     raw, unstructured input
 *   1  clusters  the same points grouped by meaning
 *   2  manifold  a swiss roll — the classic picture of learned structure
 *   3  glyph     the Athreix mark
 *   4  stream    lanes flowing toward the viewer, i.e. output tokens
 *
 * Weights blend rather than switch, so intermediate states are real shapes:
 * half cluster and half manifold is a legitimate in-between, which is what
 * makes the scroll feel continuous instead of like a slideshow.
 */

export const CLUSTER_COUNT = 7

export type LatentField = {
  points: THREE.Points
  material: THREE.ShaderMaterial
  count: number
  dispose: () => void
}

/** Deterministic PRNG — the field must look identical on every load. */
function makeRandom(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** Box-Muller, for cluster spread that looks natural rather than boxy. */
function gaussian(rnd: () => number) {
  const u = Math.max(rnd(), 1e-6)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd())
}

/** The Athreix mark: an A drawn as polylines, sampled by arc length. */
const GLYPH_STROKES: Array<[number, number, number, number]> = [
  [-1.55, -2.2, 0, 2.55],
  [0, 2.55, 1.55, -2.2],
  [-0.78, -0.32, 0.78, -0.32],
]
const GLYPH_SCALE = 1.45

function buildTargets(count: number) {
  const rnd = makeRandom(0x5eed)

  const noise = new Float32Array(count * 3)
  const cluster = new Float32Array(count * 3)
  const manifold = new Float32Array(count * 3)
  const glyph = new Float32Array(count * 3)
  const stream = new Float32Array(count * 3)
  const seed = new Float32Array(count)
  const clusterId = new Float32Array(count)

  const centres: THREE.Vector3[] = []
  for (let c = 0; c < CLUSTER_COUNT; c++) {
    const phi = Math.acos(1 - (2 * (c + 0.5)) / CLUSTER_COUNT)
    const theta = Math.PI * (1 + Math.sqrt(5)) * c
    centres.push(
      new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi),
      ).multiplyScalar(3.5),
    )
  }

  const strokeLen = GLYPH_STROKES.map(([x1, y1, x2, y2]) => Math.hypot(x2 - x1, y2 - y1))
  const strokeTotal = strokeLen.reduce((a, b) => a + b, 0)

  for (let i = 0; i < count; i++) {
    const i3 = i * 3

    // --- 0: noise — uniform in a sphere. cbrt keeps it uniform by volume;
    // without it everything crowds the centre and there is no field to speak of.
    const nr = 6.4 * Math.cbrt(rnd())
    const nTheta = rnd() * Math.PI * 2
    const nPhi = Math.acos(2 * rnd() - 1)
    noise[i3] = nr * Math.sin(nPhi) * Math.cos(nTheta)
    noise[i3 + 1] = nr * Math.sin(nPhi) * Math.sin(nTheta)
    noise[i3 + 2] = nr * Math.cos(nPhi)

    // --- 1: clusters — the same points, grouped -----------------------------
    const cid = i % CLUSTER_COUNT
    clusterId[i] = cid
    const centre = centres[cid]
    cluster[i3] = centre.x + gaussian(rnd) * 0.66
    cluster[i3 + 1] = centre.y + gaussian(rnd) * 0.66
    cluster[i3 + 2] = centre.z + gaussian(rnd) * 0.66

    // --- 2: manifold — a swiss roll -----------------------------------------
    const t = 1.1 + rnd() * (3.3 * Math.PI - 1.1)
    manifold[i3] = t * Math.cos(t) * 0.34
    manifold[i3 + 1] = (rnd() - 0.5) * 5.6
    manifold[i3 + 2] = t * Math.sin(t) * 0.34

    // --- 3: glyph — sampled along the mark ----------------------------------
    let pick = rnd() * strokeTotal
    let si = 0
    while (si < strokeLen.length - 1 && pick > strokeLen[si]) {
      pick -= strokeLen[si]
      si++
    }
    const [x1, y1, x2, y2] = GLYPH_STROKES[si]
    const u = pick / strokeLen[si]
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.hypot(dx, dy) || 1
    const jitter = gaussian(rnd) * 0.11
    glyph[i3] = (x1 + dx * u + (-dy / len) * jitter) * GLYPH_SCALE
    glyph[i3 + 1] = (y1 + dy * u + (dx / len) * jitter) * GLYPH_SCALE
    glyph[i3 + 2] = gaussian(rnd) * 0.22

    // --- 4: stream — lanes flowing toward the viewer ------------------------
    stream[i3] = (rnd() - 0.5) * 8.5
    stream[i3 + 1] = (rnd() - 0.5) * 5.0
    stream[i3 + 2] = rnd() * 34

    seed[i] = rnd()
  }

  return { noise, cluster, manifold, glyph, stream, seed, clusterId }
}

const VERT = /* glsl */ `
  attribute vec3 aCluster;
  attribute vec3 aManifold;
  attribute vec3 aGlyph;
  attribute vec3 aStream;
  attribute float aSeed;
  attribute float aClusterId;

  uniform float uW[5];
  uniform float uTime;
  uniform float uDrift;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uFocus;

  varying float vSeed;
  varying float vClusterId;
  varying float vFocus;

  void main() {
    // Stream lanes wrap along z so the flow is continuous.
    vec3 streamPos = aStream;
    streamPos.z = mod(streamPos.z + uTime * 3.4, 34.0) - 25.0;

    float wsum = uW[0] + uW[1] + uW[2] + uW[3] + uW[4];
    vec3 p =
        position   * uW[0]
      + aCluster   * uW[1]
      + aManifold  * uW[2]
      + aGlyph     * uW[3]
      + streamPos  * uW[4];
    p /= max(wsum, 0.0001);

    // Per-point drift, so a section you linger on never looks frozen.
    float ph = aSeed * 6.2831;
    p += vec3(
      sin(uTime * 0.55 + ph),
      cos(uTime * 0.47 + ph * 1.7),
      sin(uTime * 0.61 + ph * 2.3)
    ) * uDrift;

    vFocus = (uFocus < 0.0) ? 1.0 : (abs(aClusterId - uFocus) < 0.5 ? 1.0 : 0.16);
    vSeed = aSeed;
    vClusterId = aClusterId;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio * (0.55 + 0.45 * aSeed) * (14.0 / -mv.z);
  }
`

const FRAG = /* glsl */ `
  precision highp float;

  uniform vec3 uBase;
  uniform vec3 uAccent;
  uniform float uOpacity;
  uniform float uAccentMix;
  uniform float uAlpha;

  varying float vSeed;
  varying float vClusterId;
  varying float vFocus;

  void main() {
    // Round, soft-edged points. Square points read as pixels, not particles.
    vec2 d = gl_PointCoord - 0.5;
    float r = dot(d, d);
    if (r > 0.25) discard;
    float alpha = smoothstep(0.25, 0.02, r);

    float tint = uAccentMix * (0.35 + 0.65 * fract(vClusterId * 0.37 + vSeed * 0.3));
    vec3 col = mix(uBase, uAccent, clamp(tint, 0.0, 1.0));

    // uAlpha keeps additive accumulation below clipping. At 1.0 the dense core
    // of any shape saturates to flat white and the structure — the whole point
    // of the manifold — disappears into a blob.
    gl_FragColor = vec4(col, alpha * uAlpha * uOpacity * vFocus);
  }
`

export function buildLatentField(count: number): LatentField {
  const t = buildTargets(count)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(t.noise, 3))
  geometry.setAttribute('aCluster', new THREE.BufferAttribute(t.cluster, 3))
  geometry.setAttribute('aManifold', new THREE.BufferAttribute(t.manifold, 3))
  geometry.setAttribute('aGlyph', new THREE.BufferAttribute(t.glyph, 3))
  geometry.setAttribute('aStream', new THREE.BufferAttribute(t.stream, 3))
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(t.seed, 1))
  geometry.setAttribute('aClusterId', new THREE.BufferAttribute(t.clusterId, 1))
  // A computed sphere would be wrong the moment the weights change.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30)

  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uW: { value: [1, 0, 0, 0, 0] },
      uTime: { value: 0 },
      uDrift: { value: 0.38 },
      uSize: { value: 4.0 },
      uPixelRatio: { value: 1 },
      uFocus: { value: -1 },
      uBase: { value: new THREE.Color('#8f9aad') },
      uAccent: { value: new THREE.Color('#7c8cff') },
      uAccentMix: { value: 0.55 },
      uOpacity: { value: 1 },
      uAlpha: { value: 0.3 },
    },
  })

  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false

  return {
    points,
    material,
    count,
    dispose: () => {
      geometry.dispose()
      material.dispose()
    },
  }
}

/** Desktop gets the full cloud; phones get a third of it and still read well. */
export function pointCountForViewport(width: number) {
  if (width < 640) return 26000
  if (width < 1280) return 52000
  return 82000
}
