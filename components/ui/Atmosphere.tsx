/**
 * The three full-screen effect layers that sit between the canvas and the UI.
 * Static markup — everything about them is driven by CSS variables that Rig and
 * SmoothScroll already write, so this costs nothing per frame.
 */
export function Atmosphere() {
  return (
    <>
      <div className="fx fx-bloom" aria-hidden="true" />
      <div className="fx fx-vignette" aria-hidden="true" />
      <div className="fx fx-grain" aria-hidden="true" />
    </>
  )
}

export function CornerFrame() {
  return (
    <div aria-hidden="true">
      <span className="bracket bracket-tl" />
      <span className="bracket bracket-tr" />
      <span className="bracket bracket-bl" />
      <span className="bracket bracket-br" />
    </div>
  )
}
