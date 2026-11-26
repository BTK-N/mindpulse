import React from 'react';

export type PlatformId = 'instagram' | 'tiktok' | 'youtube' | 'snapchat' | 'x' | 'linkedin';

export interface PlatformLogoProps {
  name: PlatformId | string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const PlatformLogo: React.FC<PlatformLogoProps> = ({
  name,
  size = 28,
  className = '',
  style = {},
}) => {
  const commonSvgProps = {
    viewBox: '0 0 24 24',
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    style,
    'aria-hidden': true,
  };

  switch (name.toLowerCase()) {
    case 'instagram':
      return (
        <svg {...commonSvgProps}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4.25" />
          <circle cx="17.5" cy="6.5" r="0.75" />
        </svg>
      );

    case 'tiktok':
      return (
        <svg {...commonSvgProps}>
          <path d="M 13.5 16 C 13.5 18.2 11.7 20 9.5 20 C 7.3 20 5.5 18.2 5.5 16 C 5.5 13.8 7.3 12 9.5 12 C 10.5 12 11.4 12.4 12 13 L 13.5 13 V 4 C 15.5 7 18 8.2 20.5 8.5" />
        </svg>
      );

    case 'youtube':
      return (
        <svg {...commonSvgProps}>
          <rect x="2.5" y="5" width="19" height="14" rx="4" />
          <polygon points="10,8.5 16,12 10,15.5" />
        </svg>
      );

    case 'snapchat':
      return (
        <svg {...commonSvgProps}>
          <path d="M 12 3.5 C 9 3.5 7 5.8 7 9 C 7 10.8 7.5 12 6.2 13 C 5 13.8 3.5 14 3.5 15 C 3.5 16.2 5.5 16.5 7.2 16 C 8.2 15.7 8.8 16.5 8.8 17.5 C 8.8 18.5 7.5 19.2 6.5 20 C 6 20.4 6.8 21 8.2 21 C 9.8 21 10.2 19.8 12 19.8 C 13.8 19.8 14.2 21 15.8 21 C 17.2 21 18 20.4 17.5 20 C 16.5 19.2 15.2 18.5 15.2 17.5 C 15.2 16.5 15.8 15.7 16.8 16 C 18.5 16.5 20.5 16.2 20.5 15 C 20.5 14 19 13.8 17.8 13 C 16.5 12 17 10.8 17 9 C 17 5.8 15 3.5 12 3.5 Z" />
        </svg>
      );

    case 'x':
      return (
        <svg {...commonSvgProps}>
          <path d="M 18.9 3 H 21.6 L 14.7 10.9 L 22.8 21 H 16.2 L 11 14.2 L 5.1 21 H 2.4 L 9.7 12.6 L 1.8 3 H 8.5 L 13.3 9.4 Z" />
        </svg>
      );

    case 'linkedin':
      return (
        <svg {...commonSvgProps}>
          <rect x="3" y="3" width="18" height="18" rx="4" />
          <circle cx="7.5" cy="7.5" r="0.75" />
          <line x1="7.5" y1="10.5" x2="7.5" y2="16.5" />
          <path d="M 11.5 16.5 V 10.5 M 11.5 13.2 C 11.5 11.6 12.6 10.5 14.2 10.5 C 15.8 10.5 16.5 11.6 16.5 13.2 V 16.5" />
        </svg>
      );

    default:
      return null;
  }
};
