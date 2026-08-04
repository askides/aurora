import { cn } from "~/lib/utils";

const WIDTH = 72;
const HEIGHT = 24;

// Half of the stroke sits outside the path, so the extremes need a little room
// or the peak and the baseline are both shaved off by the viewBox edge.
const TOP = 1;
const BASE = HEIGHT - 1;

type Point = { x: number; y: number };

function plot(data: number[]): Point[] {
  // A single reading has no shape to draw; fall back to the empty baseline.
  if (data.length < 2) {
    return [
      { x: 0, y: BASE },
      { x: WIDTH, y: BASE },
    ];
  }

  const max = Math.max(...data);

  return data.map((value, index) => ({
    x: (index / (data.length - 1)) * WIDTH,
    // A week with no traffic has no scale to normalise against, and reads
    // better as a line resting on the floor than as a divide-by-zero.
    y: max > 0 ? BASE - (value / max) * (BASE - TOP) : BASE,
  }));
}

const at = (point: Point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`;

/**
 * Shape-at-a-glance trend line. Decorative by design: the figures next to it
 * carry the actual values, so it is hidden from assistive tech.
 */
export function Sparkline({
  data,
  className,
}: {
  data: number[];
  className?: string;
}) {
  const points = plot(data);
  const line = points.map(at).join(" ");

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className={cn(className)}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={`M0,${BASE} L${line} L${WIDTH},${BASE} Z`}
        fill="currentColor"
        fillOpacity={0.12}
      />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        // preserveAspectRatio="none" would otherwise smear the stroke into a
        // different weight on each axis whenever the box is not 3:1.
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
