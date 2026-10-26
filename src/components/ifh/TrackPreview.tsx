import type { IfhTrack } from "../../domain/ifhTypes";

export function TrackPreview({ track }: { track: IfhTrack }) {
  const legs = [...track.legs].sort((a, b) => a.order - b.order);
  if (!legs.length) {
    return (
      <div className="ifh-empty compact">
        Noch keine Schenkel geplant. Die schematische Vorschau wächst mit dem
        Aufbau.
      </div>
    );
  }
  const points = legs.map((_, index) => ({
    x: index % 2 === 0 ? 30 : 270,
    y: 30 + index * 62,
  }));
  const height = Math.max(120, 60 + (legs.length - 1) * 62);
  const pointString = points.map(({ x, y }) => `${x},${y}`).join(" ");
  const positionOnLeg = (legId: string, positionSteps: number | null) => {
    const index = legs.findIndex((leg) => leg.id === legId);
    if (index < 0) return null;
    const start = points[index];
    const end = points[index + 1] ?? {
      x: start.x === 30 ? 270 : 30,
      y: start.y + 45,
    };
    const length = legs[index].lengthSteps;
    const fraction =
      positionSteps !== null && length && length > 0
        ? Math.max(0, Math.min(1, positionSteps / length))
        : 0.5;
    return {
      x: start.x + (end.x - start.x) * fraction,
      y: start.y + (end.y - start.y) * fraction,
    };
  };
  return (
    <figure className="ifh-preview">
      <figcaption>Schematische Vorschau – nicht maßstabsgetreu</figcaption>
      <svg
        viewBox={`0 0 300 ${height}`}
        role="img"
        aria-label="Schematischer Fährtenverlauf"
      >
        <polyline
          points={pointString}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point, index) => (
          <g key={legs[index].id}>
            <circle
              cx={point.x}
              cy={point.y}
              r="17"
              className="ifh-preview-leg"
            />
            <text x={point.x} y={point.y + 5} textAnchor="middle">
              {index + 1}
            </text>
          </g>
        ))}
        {track.articles.map((article) => {
          const point = positionOnLeg(article.legId, article.positionSteps);
          return point ? (
            <g key={article.id}>
              <rect
                x={point.x - 9}
                y={point.y - 9}
                width="18"
                height="18"
                rx="3"
                className="ifh-preview-article"
              />
              <text x={point.x} y={point.y + 4} textAnchor="middle">
                G{article.number}
              </text>
            </g>
          ) : null;
        })}
        {track.crossTracks.map((crossing) => {
          const point = positionOnLeg(crossing.legId, crossing.positionSteps);
          return point ? (
            <g key={crossing.id} className="ifh-preview-cross">
              <path
                d={`M ${point.x - 10} ${point.y - 10} L ${point.x + 10} ${point.y + 10} M ${point.x + 10} ${point.y - 10} L ${point.x - 10} ${point.y + 10}`}
              />
              <title>Verleitung</title>
            </g>
          ) : null;
        })}
      </svg>
      <div className="ifh-preview-legend">
        <span>● Schenkel</span>
        <span>■ Gegenstand</span>
        <span>× Verleitung</span>
      </div>
    </figure>
  );
}
