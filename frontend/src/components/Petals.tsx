const COLORS = ["#F5C6C9", "#BAB4C7", "#e8a8a0", "#d4b8b4"];

// Deterministic (no Math.random) so server and client markup match.
const PETALS = Array.from({ length: 16 }, (_, i) => ({
  left: (i * 37) % 100,
  size: 10 + ((i * 7) % 12),
  dur: 11 + ((i * 5) % 8),
  delay: -((i * 3) % 13),
  drift: (i % 2 ? 1 : -1) * (20 + ((i * 11) % 40)),
  color: COLORS[i % COLORS.length],
}));

export function Petals() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="petal"
          style={
            {
              left: `${p.left}%`,
              background: p.color,
              "--size": `${p.size}px`,
              "--dur": `${p.dur}s`,
              "--delay": `${p.delay}s`,
              "--drift": `${p.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
