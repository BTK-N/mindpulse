import React, { useEffect, useRef, useState } from 'react';

export type Species = 'fern' | 'lavender' | 'eucalyptus' | 'bay';

export interface BotanicalProps {
  species: Species;
  className?: string;
  style?: React.CSSProperties;
  animate?: boolean;
  usePaperColor?: boolean;
  mirrored?: boolean;
}

const BAY_PATHS = [
  'M 80 215 C 75 160 85 100 78 15',
  'M 78 165 C 50 155 25 140 18 115 C 12 90 38 80 65 105 C 74 114 77 135 77 155',
  'M 77 160 C 52 140 34 122 22 105',
  'M 60 144 C 48 148 38 150 32 146',
  'M 50 134 C 38 136 28 134 24 126',
  'M 42 122 C 32 120 25 114 24 106',
  'M 81 135 C 110 122 136 108 142 82 C 148 58 122 50 95 72 C 86 80 82 102 82 125',
  'M 82 130 C 106 108 124 90 136 72',
  'M 98 114 C 112 116 122 118 128 112',
  'M 108 102 C 120 102 130 100 134 92',
  'M 116 90 C 126 88 134 82 135 74',
  'M 78 90 C 54 80 34 66 30 46 C 26 26 48 20 70 38 C 76 45 78 62 78 80',
  'M 78 86 C 58 68 44 54 34 38',
  'M 66 74 C 54 76 46 76 40 72',
  'M 56 64 C 46 64 38 60 36 52',
  'M 78 30 C 70 20 72 10 78 3 C 84 10 86 20 79 28',
  'M 78 28 C 78 18 78 10 78 4',
];

export const Botanical: React.FC<BotanicalProps> = ({
  species,
  className = '',
  style = {},
  animate = false,
  usePaperColor = false,
  mirrored = false,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [config, setConfig] = useState<{ viewBox: string; paths: string[] }>(() => {
    if (species === 'bay') {
      return { viewBox: '0 0 160 220', paths: BAY_PATHS };
    }
    return { viewBox: '0 0 100 100', paths: [] };
  });

  useEffect(() => {
    if (species === 'bay') {
      setConfig({ viewBox: '0 0 160 220', paths: BAY_PATHS });
    } else {
      let cancelled = false;
      import('./landingSpecies').then(({ getLandingSpeciesConfig }) => {
        if (!cancelled) {
          setConfig(getLandingSpeciesConfig(species));
        }
      });
      return () => {
        cancelled = true;
      };
    }
  }, [species]);

  useEffect(() => {
    if (!animate || typeof window === 'undefined') return;
    if (config.paths.length === 0) return;

    const svg = svgRef.current;
    if (!svg) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const paths = Array.from(svg.querySelectorAll('path'));

    if (prefersReduced) {
      paths.forEach((p) => {
        p.style.strokeDasharray = 'none';
        p.style.strokeDashoffset = '0';
      });
      return;
    }

    paths.forEach((p) => {
      try {
        const len = p.getTotalLength();
        p.style.strokeDasharray = `${len}`;
        p.style.strokeDashoffset = `${len}`;
      } catch {}
    });

    let cleanup = () => {};

    import('../landing/gsapConfig').then(({ getGsapWithScrollTrigger }) => {
      const { gsap, ScrollTrigger } = getGsapWithScrollTrigger();

      const st = ScrollTrigger.create({
        trigger: svg,
        start: 'top 75%',
        once: true,
        onEnter: () => {
          gsap.to(paths, {
            strokeDashoffset: 0,
            duration: 1.0,
            ease: 'power2.inOut',
            stagger: 0.03,
          });
        },
      });

      cleanup = () => {
        st.kill();
      };
    });

    return () => {
      cleanup();
    };
  }, [animate, config.paths]);

  const defaultColor = usePaperColor ? 'var(--color-paper)' : 'var(--color-ink)';
  const defaultOpacity = usePaperColor ? 0.14 : 0.05;

  const combinedStyle: React.CSSProperties = {
    color: defaultColor,
    opacity: defaultOpacity,
    transform: mirrored ? `${style.transform || ''} scaleX(-1)`.trim() : style.transform,
    pointerEvents: 'none',
    ...style,
  };

  return (
    <div
      aria-hidden="true"
      className={`select-none pointer-events-none inline-block ${className}`}
      style={combinedStyle}
    >
      <svg
        ref={svgRef}
        viewBox={config.viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-full h-full"
        aria-hidden="true"
      >
        {config.paths.map((d, i) => (
          <path
            key={i}
            stroke="currentColor"
            fill="none"
            strokeWidth={1}
            strokeLinecap="round"
            strokeLinejoin="round"
            d={d}
          />
        ))}
      </svg>
    </div>
  );
};
