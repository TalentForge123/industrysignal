export interface SparklineProps {
  data?: number[];
  height?: number;
  width?: number;
  accentLast?: boolean;
}

export function Sparkline({
  data = [3, 5, 4, 7, 6, 9, 8, 5, 7],
  height = 22,
  width = 64,
  accentLast = true,
}: SparklineProps) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = Math.max(max - min, 1);
  const step = width / (data.length - 1);
  const pts = data.map<[number, number]>((v, i) => [
    i * step,
    height - ((v - min) / span) * (height - 2) - 1,
  ]);
  const path = pts
    .map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`))
    .join(' ');
  const last = pts[pts.length - 1]!;
  return (
    <svg width={width} height={height} style={{ display: 'block' }} aria-hidden="true">
      <path d={path} fill="none" stroke="var(--graphite-500)" strokeWidth="1.25" />
      {accentLast && <circle cx={last[0]} cy={last[1]} r="2" fill="var(--amber-300)" />}
    </svg>
  );
}
