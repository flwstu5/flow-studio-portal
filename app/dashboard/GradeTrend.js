// Hand-rolled inline SVG sparkline — no charting library needed. Shows
// grade_percent over time from a client's snapshot history. Uses
// var(--brand-color) with a static Flow Studio red fallback, so it
// automatically picks up a client's accent color on themed portal pages
// and still looks right on staff pages where that CSS var isn't set.
export default function GradeTrend({ snapshots, width = 120, height = 32 }) {
  const points = (snapshots ?? [])
    .filter((s) => typeof s.grade_percent === "number")
    .slice()
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  if (points.length < 2) return null;

  const stepX = width / (points.length - 1);
  const toY = (percent) => height - (percent / 100) * height;

  const coords = points.map((p, i) => `${i * stepX},${toY(p.grade_percent)}`);
  const last = points[points.length - 1];
  const lastX = (points.length - 1) * stepX;
  const lastY = toY(last.grade_percent);
  const delta = last.grade_percent - points[0].grade_percent;

  return (
    <div className="flex items-center gap-2">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="flex-shrink-0">
        <polyline
          points={coords.join(" ")}
          fill="none"
          stroke="var(--brand-color, #CB181D)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={lastX} cy={lastY} r="2.5" fill="var(--brand-color, #CB181D)" />
      </svg>
      {delta !== 0 && (
        <span className={`text-xs font-medium ${delta > 0 ? "text-green-600" : "text-red-600"}`}>
          {delta > 0 ? "+" : ""}
          {delta}%
        </span>
      )}
    </div>
  );
}
