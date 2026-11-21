// PLACEHOLDER only: a deterministic pattern that looks like a QR but is not scannable.
const N = 21;
const inFinder = (x: number, y: number) =>
  [[0, 0], [N - 7, 0], [0, N - 7]].some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);

export function Qr({ seed, label }: { seed: number; label: string }) {
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) if (!inFinder(x, y) && ((x * 31 + y * 17 + x * y * seed) % 7) < 3) cells.push({ x, y });
  const finder = (fx: number, fy: number) => (
    <g key={`${fx}-${fy}`}>
      <rect x={fx} y={fy} width="7" height="7" fill="#4a1d27" />
      <rect x={fx + 1} y={fy + 1} width="5" height="5" fill="#fff" />
      <rect x={fx + 2} y={fy + 2} width="3" height="3" fill="#4a1d27" />
    </g>
  );
  return (
    <svg viewBox={`-1 -1 ${N + 2} ${N + 2}`} role="img" aria-label={label} className="h-40 w-40 rounded bg-white">
      {cells.map((c) => (
        <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width="1" height="1" fill="#4a1d27" />
      ))}
      {finder(0, 0)}
      {finder(N - 7, 0)}
      {finder(0, N - 7)}
    </svg>
  );
}
