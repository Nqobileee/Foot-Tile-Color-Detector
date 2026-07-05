import { useMemo } from 'react';

const STAR_COUNT = 50;
const GLOWS = [
  { left: '12%', top: '12%', color: '#5FD4FF' },
  { left: '85%', top: '10%', color: '#9B4DFF' },
  { left: '15%', top: '82%', color: '#FF6B8B' },
  { left: '88%', top: '85%', color: '#1FAE4A' },
];

function randomStars(count) {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    size: 1 + Math.random() * 2.5,
    fallDuration: 8 + Math.random() * 14,
    fallDelay: -Math.random() * 20,
    twinkleDuration: 2 + Math.random() * 2,
  }));
}

// Purely decorative: soft brand-color glow blobs + slow falling/twinkling
// stars behind the home and wiki screens. No gameplay logic lives here.
export default function StarsBackground() {
  const stars = useMemo(() => randomStars(STAR_COUNT), []);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {GLOWS.map((g, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: g.left,
            top: g.top,
            width: '45vmax',
            height: '45vmax',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background: g.color,
            opacity: 0.16,
            filter: 'blur(60px)',
          }}
        />
      ))}
      {stars.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${s.left}%`,
            top: 0,
            width: s.size,
            height: s.size,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 0 4px rgba(255,255,255,0.8)',
            animation: `star-fall ${s.fallDuration}s linear infinite, star-twinkle ${s.twinkleDuration}s ease-in-out infinite`,
            animationDelay: `${s.fallDelay}s, 0s`,
          }}
        />
      ))}
    </div>
  );
}
