'use client'

export function NoiseOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{ opacity: 'var(--noise-opacity, 0)' }}
      aria-hidden="true"
    >
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <filter id="infoshop-noise-filter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.80"
            numOctaves="4"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#infoshop-noise-filter)" />
      </svg>
    </div>
  )
}
