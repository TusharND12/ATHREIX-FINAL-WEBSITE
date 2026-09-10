import * as THREE from 'three'
import { THEME } from './sceneState'

/**
 * PLACEHOLDER GEOMETRY — this is the file you delete in Phase 2.
 *
 * It stands in for the real Athreix core GLB so the scroll choreography can be
 * built and timed before any 3D art exists. When the GLB lands, replace this
 * with a loader that traverses the scene graph and produces the same `CorePart[]`
 * shape below. Nothing else in the app needs to change.
 *
 * The contract the 3D artist must honour:
 *   - one top-level object per named part, names exactly as in PART_SPECS
 *   - each part's origin set to its own centroid
 *   - +Z is the front of the core (the face the camera flies into)
 *   - model fits roughly within a 4-unit cube
 */

export type CorePart = {
  name: string
  /** Capability label shown in the blueprint act. */
  label: string
  node: THREE.Group
  /** Assembled position. Parts return here at explode = 0. */
  base: THREE.Vector3
  /** Unit vector the part travels along when exploding. */
  dir: THREE.Vector3
}

/** One coloured arc on the aperture ring. */
export type RingSegment = {
  /** The bright arc itself. */
  core: THREE.MeshBasicMaterial
  /** A fatter, additive copy sitting behind it, faking a bloom. */
  halo: THREE.MeshBasicMaterial
}

export type CoreModel = {
  group: THREE.Group
  parts: CorePart[]
  ringSegments: RingSegment[]
  /** Invisible marker at the front face, used to register the DOM stage. */
  apertureAnchor: THREE.Object3D
  apertureRadius: number
  solidMaterial: THREE.MeshStandardMaterial
  lineMaterial: THREE.LineBasicMaterial
  dispose: () => void
}

type Spec = {
  name: string
  label: string
  z: number
  r: number
  h: number
  /** Adds a ring of small blocks around the circumference for silhouette detail. */
  studs?: number
}

const PART_SPECS: Spec[] = [
  { name: 'ingest', label: 'Ingestion', z: 1.45, r: 1.42, h: 0.4 },
  { name: 'embed', label: 'Embedding', z: 0.98, r: 1.22, h: 0.42, studs: 24 },
  { name: 'retrieve', label: 'Retrieval', z: 0.5, r: 1.34, h: 0.36 },
  { name: 'infer', label: 'Inference', z: -0.08, r: 1.56, h: 0.62, studs: 16 },
  { name: 'guard', label: 'Guardrails', z: -0.66, r: 1.18, h: 0.32 },
  { name: 'orchestrate', label: 'Orchestration', z: -1.1, r: 1.38, h: 0.44, studs: 32 },
  { name: 'observe', label: 'Observability', z: -1.6, r: 1.1, h: 0.34 },
  { name: 'deploy', label: 'Deployment', z: -2.06, r: 1.48, h: 0.3 },
]

const APERTURE_R = 1.6

/**
 * One arc per act, in page order, using each act's accent.
 *
 * This is why the ring is worth having: it is not decoration, it is the page's
 * own table of contents wrapped around the lens. The lit arc tells you where
 * you are, and the colour matches the heading you are reading.
 */
const RING_COLORS = [
  '#ff5a5f', // hero
  '#ff5a5f', // orbit
  '#ff8f3f', // explode
  '#ff8f3f', // blueprint
  '#2ee6a8', // enter
  '#2ee6a8', // cap-retrieval
  '#4d9fff', // cap-inference
  '#22d3ee', // cap-guardrails
  '#b6f34a', // modular
  '#ff5a5f', // outro
]

/** Gap between arcs, in radians. Enough to read as separate segments. */
const SEG_GAP = 0.05

export function buildPlaceholderCore(): CoreModel {
  const disposables: Array<{ dispose: () => void }> = []

  const solidMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(THEME.dark.solid),
    flatShading: true,
    roughness: 0.72,
    metalness: 0.0,
    transparent: true,
    opacity: 1,
  })
  const lineMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color(THEME.dark.line),
    transparent: true,
    opacity: 0,
  })
  disposables.push(solidMaterial, lineMaterial)

  const group = new THREE.Group()
  group.name = 'athreix-core'

  const parts: CorePart[] = []
  const ringSegments: RingSegment[] = []

  // --- the barrel stack -----------------------------------------------------
  for (const spec of PART_SPECS) {
    const node = new THREE.Group()
    node.name = spec.name

    const geos: THREE.BufferGeometry[] = []

    const body = new THREE.CylinderGeometry(spec.r, spec.r, spec.h, 48, 1, false)
    body.rotateX(Math.PI / 2)
    geos.push(body)

    if (spec.studs) {
      for (let i = 0; i < spec.studs; i++) {
        const a = (i / spec.studs) * Math.PI * 2
        const stud = new THREE.BoxGeometry(0.1, 0.16, spec.h * 0.8)
        stud.translate(Math.cos(a) * (spec.r + 0.05), Math.sin(a) * (spec.r + 0.05), 0)
        geos.push(stud)
      }
    }

    for (const g of geos) {
      node.add(new THREE.Mesh(g, solidMaterial))
      const edges = new THREE.EdgesGeometry(g, 25)
      node.add(new THREE.LineSegments(edges, lineMaterial))
      disposables.push(g, edges)
    }

    node.position.set(0, 0, spec.z)
    group.add(node)

    parts.push({
      name: spec.name,
      label: spec.label,
      node,
      base: node.position.clone(),
      dir: new THREE.Vector3(),
    })
  }

  // --- the aperture ring: the front face, and the frame for the DOM stage ----
  {
    const node = new THREE.Group()
    node.name = 'aperture'

    const ring = new THREE.TorusGeometry(APERTURE_R, 0.075, 12, 64)
    const collar = new THREE.CylinderGeometry(APERTURE_R + 0.06, APERTURE_R + 0.02, 0.3, 64, 1, true)
    collar.rotateX(Math.PI / 2)

    for (const g of [ring, collar]) {
      node.add(new THREE.Mesh(g, solidMaterial))
      const edges = new THREE.EdgesGeometry(g, 25)
      node.add(new THREE.LineSegments(edges, lineMaterial))
      disposables.push(g, edges)
    }

    // --- the coloured segment ring ----------------------------------------
    const segCount = RING_COLORS.length
    const segArc = (Math.PI * 2) / segCount - SEG_GAP

    for (let i = 0; i < segCount; i++) {
      const color = new THREE.Color(RING_COLORS[i])

      // toneMapped:false keeps these at their literal hex value. Without it the
      // renderer's tone curve mutes them into the grey of the body.
      const coreMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.25,
        toneMapped: false,
      })
      const haloMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })

      const coreGeo = new THREE.TorusGeometry(APERTURE_R + 0.17, 0.042, 8, 40, segArc)
      const haloGeo = new THREE.TorusGeometry(APERTURE_R + 0.17, 0.15, 8, 40, segArc)

      const rot = (i / segCount) * Math.PI * 2 + SEG_GAP / 2

      const coreMesh = new THREE.Mesh(coreGeo, coreMat)
      const haloMesh = new THREE.Mesh(haloGeo, haloMat)
      coreMesh.rotation.z = rot
      haloMesh.rotation.z = rot
      // Slightly proud of the ring so the arcs never z-fight with the collar.
      coreMesh.position.z = 0.02
      haloMesh.position.z = 0.02

      node.add(haloMesh, coreMesh)
      ringSegments.push({ core: coreMat, halo: haloMat })
      disposables.push(coreGeo, haloGeo, coreMat, haloMat)
    }

    node.position.set(0, 0, 1.9)
    group.add(node)

    parts.push({
      name: 'aperture',
      label: 'Core',
      node,
      base: node.position.clone(),
      dir: new THREE.Vector3(),
    })
  }

  // --- explode directions ---------------------------------------------------
  // Mostly axial (a barrel pulls apart along its axis) with a small deterministic
  // radial component so the exploded view reads as a cloud, not a queue.
  const center = new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3())
  parts.forEach((p, i) => {
    const a = (i / parts.length) * Math.PI * 2
    p.dir
      .set(Math.cos(a) * 0.34, Math.sin(a) * 0.34, p.base.z - center.z)
      .normalize()
  })

  const apertureAnchor = new THREE.Object3D()
  apertureAnchor.position.set(0, 0, 1.9)
  group.add(apertureAnchor)

  return {
    group,
    parts,
    ringSegments,
    apertureAnchor,
    apertureRadius: APERTURE_R,
    solidMaterial,
    lineMaterial,
    dispose: () => disposables.forEach((d) => d.dispose()),
  }
}
