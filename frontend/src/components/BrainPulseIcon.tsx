import React from 'react';

interface BrainPulseIconProps {
  size?: number;
  stroke?: string;
  className?: string;
}

export const BrainPulseIcon: React.FC<BrainPulseIconProps> = ({
  size = 20,
  stroke = 'currentColor',
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    stroke={stroke}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M10 5.2C8 3.5 3.5 4.5 3.5 9c0 4.2 3 7 6.5 7.8 3.5-.8 6.5-3.6 6.5-7.8 0-4.5-4.5-5.5-6.5-3.8z" />
    <path d="M1.5 10.5h4l1.3 1.7 1.8-7.7 2.4 11.5 1.6-7.5 1.2 3 0.8-1h3.9" />
  </svg>
);
