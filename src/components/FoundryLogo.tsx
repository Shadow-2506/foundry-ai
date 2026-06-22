import React from 'react';

interface FoundryLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

/**
 * FoundryAI brand logo.
 * - size: icon dimension in px (default 32)
 * - showText: whether to render the wordmark beside the icon (default false)
 */
export function FoundryLogo({ size = 32, showText = false, className = '' }: FoundryLogoProps) {
  const s = size;
  // scale internal geometry proportionally
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.42;          // outer hexagon circumradius
  const innerR = r * 0.56;     // inner ring
  const nodeR = s * 0.055;     // connection-node dot radius
  const strokeW = s * 0.07;    // main stroke width
  const nodeStroke = s * 0.04;

  // Hexagon vertices (flat-top orientation, 0° = right)
  const hex = (radius: number, offsetDeg = 0) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = ((i * 60) + offsetDeg) * (Math.PI / 180);
      return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)] as [number, number];
    });

  const outerPts = hex(r, 30);   // pointy-top hex
  const innerPts = hex(innerR, 30);

  // Spoke lines: outer vertex → centre
  const spokes = outerPts.map(([x, y]) => `M${cx},${cy} L${x},${y}`).join(' ');

  // Node dots at alternating inner hex corners (every other vertex)
  const nodeDots = innerPts.filter((_, i) => i % 2 === 0);

  const outerPath = `M ${outerPts.map(([x, y]) => `${x},${y}`).join(' L ')} Z`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={s}
        height={s}
        viewBox={`0 0 ${s} ${s}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="FoundryAI logo"
      >
        {/* Outer hexagon */}
        <path
          d={outerPath}
          stroke="currentColor"
          strokeWidth={strokeW}
          strokeLinejoin="round"
          className="text-primary"
          fill="none"
        />

        {/* Spoke lines */}
        <path
          d={spokes}
          stroke="currentColor"
          strokeWidth={strokeW * 0.5}
          strokeLinecap="round"
          className="text-primary"
          opacity={0.45}
        />

        {/* Center fill dot */}
        <circle cx={cx} cy={cy} r={nodeR * 1.6} className="fill-primary" />

        {/* Outer node dots */}
        {outerPts.map(([x, y], i) => (
          <circle
            key={`on-${i}`}
            cx={x}
            cy={y}
            r={nodeR}
            strokeWidth={nodeStroke}
            stroke="currentColor"
            className="text-primary fill-background"
          />
        ))}

        {/* Inner highlight nodes */}
        {nodeDots.map(([x, y], i) => (
          <circle
            key={`in-${i}`}
            cx={x}
            cy={y}
            r={nodeR * 0.8}
            className="fill-primary"
            opacity={0.7}
          />
        ))}
      </svg>

      {showText && (
        <span className="font-bold text-xl tracking-tight leading-none">FoundryAI</span>
      )}
    </div>
  );
}
