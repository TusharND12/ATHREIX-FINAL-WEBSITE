'use client'

import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Rig } from './Rig'

/**
 * The fixed WebGL layer. Mounts once at app root and never unmounts — DOM
 * sections scroll over the top of it. If this ever remounts you get a white
 * flash and lose all GPU state, so keep it out of any conditional branch.
 */
export function Stage() {
  /**
   * COLD-LOAD FIRST PAINT — do not remove without re-testing a hard reload.
   *
   * react-three-fiber measures this container with a ResizeObserver and only
   * mounts the <Canvas> children once it has a size. On a cold load that first
   * measurement does not settle: the <canvas> element is created and the WebGL
   * context comes up, but the children never mount — Rig's function body is
   * never called, useFrame never runs, and the hero stays blank.
   *
   * Nothing on a static page resizes afterwards, so R3F never retries. The
   * first scroll used to "fix" it only because scrolling forces a reflow, which
   * finally fires the observer. Verified directly: dispatching a single resize
   * event on a blank page paints the scene immediately.
   *
   * So we dispatch that notification ourselves instead of waiting for the user
   * to scroll. Three kicks — synchronously, next frame, and after 120ms — cover
   * slow stylesheet and font loads. They are idempotent and cost nothing.
   */
  useEffect(() => {
    const kick = () => window.dispatchEvent(new Event('resize'))
    kick()
    const raf = requestAnimationFrame(kick)
    const timer = setTimeout(kick, 120)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [])

  return (
    /**
     * Sized with inline styles rather than Tailwind utilities: this element is
     * measured by a ResizeObserver, so its geometry should not depend on when
     * the stylesheet happens to apply. Decorative classes are fine here.
     */
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 38, near: 0.1, far: 100, position: [0, 0, 11.4] }}
      >
        <Rig />
      </Canvas>
    </div>
  )
}
