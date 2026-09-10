import * as THREE from 'three'
import { THEME } from './sceneState'

/**
 * THE DEVICE CLUSTER
 *
 * A laptop at the centre with phone, tablet, wearable, gateway, sensor,
 * on-prem node and network hardware orbiting it. The story is "this runs where
 * your work happens", so the object is the estate itself rather than a machine
 * standing in for one.
 *
 * The laptop display is the stage: the capability demos render as DOM on top of
 * it, registered to its projected rectangle. That is why the display panel
 * stays square-on to the camera — a tilted screen projects to a trapezoid, and
 * a DOM rectangle cannot follow it without a matrix3d transform.
 */

export type DevicePart = {
  name: string
  label: string
  node: THREE.Group
  /** Assembled position. Parts return here at explode = 0. */
  base: THREE.Vector3
  /** Unit vector the part travels along when exploding. */
  dir: THREE.Vector3
}

export type RingSegment = {
  core: THREE.MeshBasicMaterial
  halo: THREE.MeshBasicMaterial
}

export type DeviceCluster = {
  group: THREE.Group
  parts: DevicePart[]
  ringSegments: RingSegment[]
  /** Centre of the laptop display, in model space. */
  screenAnchor: THREE.Object3D
  /** The lid. Pivots at the hinge; rotation.x is driven by sceneState.lid. */
  lid: THREE.Group
  /** Half extents of the display, in world units. */
  screenHalf: { w: number; h: number }
  solidMaterial: THREE.MeshStandardMaterial
  lineMaterial: THREE.LineBasicMaterial
  /** The display panel itself — dark, unlit, so the DOM demo sits on a void. */
  screenMaterial: THREE.MeshBasicMaterial
  dispose: () => void
}

const SCREEN_W = 2.5
const SCREEN_H = 1.56

/** Hinge position in the laptop's local space — the lid's pivot. */
const HINGE_Y = -0.83
const HINGE_Z = -0.02

/** Rounded slab — the shared language for every screen-shaped device here. */
function slab(w: number, h: number, d: number, r: number) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 6 })
  g.translate(0, 0, -d / 2)
  return g
}

/** Where each satellite device sits, as an angle around the laptop. */
const ORBIT: Array<{ name: string; label: string; deg: number; r: number; z: number }> = [
  { name: 'phone', label: 'Mobile', deg: 18, r: 2.75, z: -0.35 },
  { name: 'watch', label: 'Wearable', deg: 68, r: 2.6, z: -0.8 },
  { name: 'edge', label: 'Edge gateway', deg: 126, r: 2.7, z: -0.7 },
  { name: 'tablet', label: 'Field tablet', deg: 172, r: 3.0, z: -0.3 },
  { name: 'server', label: 'On-prem node', deg: 218, r: 2.85, z: -0.9 },
  { name: 'sensor', label: 'Vision sensor', deg: 268, r: 2.5, z: -0.75 },
  { name: 'router', label: 'Network', deg: 318, r: 2.7, z: -0.6 },
]

const RING_COLORS = [
  '#ff5a5f', '#ff5a5f', '#ff8f3f', '#ff8f3f', '#2ee6a8',
  '#2ee6a8', '#4d9fff', '#22d3ee', '#b6f34a', '#ff5a5f',
]
const SEG_GAP = 0.05
const RING_R = 3.75

export function buildDeviceCluster(): DeviceCluster {
  const disposables: Array<{ dispose: () => void }> = []

  const solidMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(THEME.dark.solid),
    flatShading: true,
    roughness: 0.72,
    metalness: 0,
    transparent: true,
    opacity: 1,
  })
  const lineMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color(THEME.dark.line),
    transparent: true,
    opacity: 0,
  })
  const screenMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#08090d'),
    transparent: true,
    opacity: 1,
    toneMapped: false,
  })
  disposables.push(solidMaterial, lineMaterial, screenMaterial)

  const group = new THREE.Group()
  group.name = 'athreix-devices'
  const parts: DevicePart[] = []
  const ringSegments: RingSegment[] = []

  /** Adds a part: solid meshes plus their edge lines, as one named group. */
  function addPart(
    name: string,
    label: string,
    geos: THREE.BufferGeometry[],
    pos: THREE.Vector3,
    extra?: (node: THREE.Group) => void,
  ) {
    const node = new THREE.Group()
    node.name = name
    for (const g of geos) {
      node.add(new THREE.Mesh(g, solidMaterial))
      const edges = new THREE.EdgesGeometry(g, 28)
      node.add(new THREE.LineSegments(edges, lineMaterial))
      disposables.push(g, edges)
    }
    extra?.(node)
    node.position.copy(pos)
    group.add(node)
    parts.push({ name, label, node, base: pos.clone(), dir: new THREE.Vector3() })
    return node
  }

  // --- laptop: chassis, hinge, and a lid that opens --------------------------
  // The lid is its own group pivoted at the hinge so it can rotate: everything
  // riding on it (bezel, display, and the stage anchor the DOM demo registers
  // to) is positioned relative to the hinge, not to the chassis.
  const screenAnchor = new THREE.Object3D()
  const lid = new THREE.Group()
  {
    const chassis = slab(2.72, 1.9, 0.11, 0.09)
    chassis.rotateX(-Math.PI / 2)
    chassis.translate(0, -0.86, 0.82)

    const deck = slab(2.2, 1.3, 0.03, 0.04)
    deck.rotateX(-Math.PI / 2)
    deck.translate(0, -0.79, 0.84)

    const hinge = new THREE.CylinderGeometry(0.055, 0.055, 2.5, 12)
    hinge.rotateZ(Math.PI / 2)
    hinge.translate(0, HINGE_Y, HINGE_Z)

    const node = addPart('laptop', 'Workstation', [chassis, deck, hinge], new THREE.Vector3(0, 0.18, 0))

    lid.name = 'lid'
    lid.position.set(0, HINGE_Y, HINGE_Z)

    // Offsets are hinge-relative: at lid rotation 0 these land exactly where
    // the display sat when it was welded to the chassis.
    const bezel = slab(SCREEN_W + 0.16, SCREEN_H + 0.16, 0.09, 0.07)
    bezel.translate(0, -HINGE_Y, -0.06 - HINGE_Z)
    lid.add(new THREE.Mesh(bezel, solidMaterial))
    const bezelEdges = new THREE.EdgesGeometry(bezel, 28)
    lid.add(new THREE.LineSegments(bezelEdges, lineMaterial))
    disposables.push(bezel, bezelEdges)

    // The display. Unlit: it is a void the DOM demo sits on, not a surface,
    // and lighting it would wash the demo out.
    const panel = new THREE.PlaneGeometry(SCREEN_W, SCREEN_H)
    const panelMesh = new THREE.Mesh(panel, screenMaterial)
    panelMesh.position.set(0, -HINGE_Y, -HINGE_Z)
    lid.add(panelMesh)
    disposables.push(panel)

    screenAnchor.position.set(0, -HINGE_Y, -HINGE_Z + 0.001)
    lid.add(screenAnchor)

    node.add(lid)
  }

  // --- satellites -----------------------------------------------------------
  for (const o of ORBIT) {
    const a = (o.deg * Math.PI) / 180
    const pos = new THREE.Vector3(Math.cos(a) * o.r, Math.sin(a) * o.r + 0.18, o.z)
    const geos: THREE.BufferGeometry[] = []
    let screen: { w: number; h: number; z: number } | null = null

    switch (o.name) {
      case 'phone': {
        geos.push(slab(0.62, 1.26, 0.08, 0.11))
        screen = { w: 0.5, h: 1.0, z: 0.042 }
        const cam = new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10)
        cam.rotateX(Math.PI / 2)
        cam.translate(0.17, 0.44, -0.055)
        geos.push(cam)
        break
      }
      case 'tablet': {
        geos.push(slab(1.18, 1.62, 0.07, 0.09))
        screen = { w: 1.0, h: 1.42, z: 0.037 }
        break
      }
      case 'watch': {
        geos.push(slab(0.46, 0.54, 0.13, 0.14))
        screen = { w: 0.34, h: 0.4, z: 0.067 }
        const strapA = slab(0.3, 0.42, 0.05, 0.05)
        strapA.translate(0, 0.46, 0)
        const strapB = slab(0.3, 0.42, 0.05, 0.05)
        strapB.translate(0, -0.46, 0)
        geos.push(strapA, strapB)
        break
      }
      case 'edge': {
        geos.push(slab(0.92, 0.6, 0.34, 0.05))
        for (let i = 0; i < 2; i++) {
          const ant = new THREE.CylinderGeometry(0.022, 0.022, 0.46, 8)
          ant.translate(-0.28 + i * 0.56, 0.52, 0)
          geos.push(ant)
        }
        break
      }
      case 'server': {
        geos.push(slab(1.15, 0.72, 0.5, 0.04))
        // vent slots
        for (let i = 0; i < 5; i++) {
          const v = new THREE.BoxGeometry(0.62, 0.035, 0.02)
          v.translate(-0.2, 0.22 - i * 0.11, 0.26)
          geos.push(v)
        }
        break
      }
      case 'sensor': {
        const body = new THREE.CylinderGeometry(0.3, 0.3, 0.52, 20)
        body.rotateX(Math.PI / 2)
        geos.push(body)
        const lens = new THREE.CylinderGeometry(0.19, 0.22, 0.12, 20)
        lens.rotateX(Math.PI / 2)
        lens.translate(0, 0, 0.3)
        geos.push(lens)
        // Dark glass in the lens barrel, same trick as the laptop display.
        screen = { w: 0.3, h: 0.3, z: 0.37 }
        break
      }
      case 'router': {
        geos.push(slab(1.05, 0.28, 0.62, 0.05))
        for (let i = 0; i < 3; i++) {
          const ant = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8)
          ant.translate(-0.34 + i * 0.34, 0.36, 0)
          geos.push(ant)
        }
        break
      }
    }

    addPart(o.name, o.label, geos, pos, (node) => {
      if (!screen) return
      const g =
        o.name === 'sensor'
          ? new THREE.CircleGeometry(screen.w / 2, 20)
          : new THREE.PlaneGeometry(screen.w, screen.h)
      const mesh = new THREE.Mesh(g, screenMaterial)
      mesh.position.z = screen.z
      node.add(mesh)
      disposables.push(g)
    })
  }

  // --- the act ring ---------------------------------------------------------
  // Not parented to any device: the estate flies apart, the ring holds. It is
  // the page's index, not part of the hardware.
  {
    const ringNode = new THREE.Group()
    ringNode.name = 'act-ring'
    const segCount = RING_COLORS.length
    const segArc = (Math.PI * 2) / segCount - SEG_GAP

    for (let i = 0; i < segCount; i++) {
      const color = new THREE.Color(RING_COLORS[i])
      const coreMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.09,
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
      const coreGeo = new THREE.TorusGeometry(RING_R, 0.038, 8, 44, segArc)
      const haloGeo = new THREE.TorusGeometry(RING_R, 0.15, 8, 44, segArc)
      const rot = (i / segCount) * Math.PI * 2 + SEG_GAP / 2

      const coreMesh = new THREE.Mesh(coreGeo, coreMat)
      const haloMesh = new THREE.Mesh(haloGeo, haloMat)
      coreMesh.rotation.z = rot
      haloMesh.rotation.z = rot
      coreMesh.position.z = -1.4
      haloMesh.position.z = -1.4

      ringNode.add(haloMesh, coreMesh)
      ringSegments.push({ core: coreMat, halo: haloMat })
      disposables.push(coreGeo, haloGeo, coreMat, haloMat)
    }
    ringNode.position.y = 0.18
    group.add(ringNode)
  }

  // --- explode directions ---------------------------------------------------
  // Radially outward from the laptop, which is the thing everything else is
  // arranged around. The laptop itself barely moves — it is the anchor.
  const centre = new THREE.Vector3(0, 0.18, 0)
  for (const p of parts) {
    if (p.name === 'laptop') {
      p.dir.set(0, 0, 0.35)
      continue
    }
    p.dir.copy(p.base).sub(centre).normalize()
  }

  return {
    group,
    parts,
    ringSegments,
    screenAnchor,
    lid,
    screenHalf: { w: SCREEN_W / 2, h: SCREEN_H / 2 },
    solidMaterial,
    lineMaterial,
    screenMaterial,
    dispose: () => disposables.forEach((d) => d.dispose()),
  }
}
