import React from 'react';

interface PaperBackgroundProps {
  isLanding?: boolean;
}

export const PaperBackground: React.FC<PaperBackgroundProps> = ({ isLanding = false }) => {
  const grainOpacity = isLanding ? 0.08 : 0.045;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden bg-[var(--color-paper)]"
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    >
      {/* Layer 2: Tonal Wash (Warm Ambient Light) */}
      <div className="wash-layer" aria-hidden="true">
        <div className="wash wash-a" />
        <div className="wash wash-b" />
      </div>

      {/* Layer 3: Ruled Grid (App Pages Only) */}
      {!isLanding && <div className="ruled-grid" />}

      {/* Layer 1: Static Paper Grain Overlay */}
      <svg
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          opacity: grainOpacity,
          mixBlendMode: 'overlay',
        }}
      >
        <filter id="paper-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves={3}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#paper-grain)" />
      </svg>
    </div>
  );
};
