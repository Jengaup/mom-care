/** Mini-gráfica de línea en SVG puro (sin librerías). Muestra la evolución
 * de un signo numérico. Pensada para móvil: ancho fluido, alto fijo. */
export function TrendChart({
  points,
  color = "#15803d",
  height = 56,
}: {
  points: number[];
  color?: string;
  height?: number;
}) {
  const n = points.length;
  if (n < 2) return null;

  const w = 100; // viewBox en unidades relativas; el SVG escala al contenedor
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const padY = 6;
  const usableH = height - padY * 2;

  const x = (i: number) => (n === 1 ? w / 2 : (i / (n - 1)) * w);
  const y = (v: number) => padY + (1 - (v - min) / span) * usableH;

  const d = points
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(v).toFixed(2)}`)
    .join(" ");
  const lastX = x(n - 1);
  const lastY = y(points[n - 1]!);

  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      className="h-14 w-full"
      role="img"
      aria-label="Gráfica de tendencia"
    >
      <path d={d} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
      <circle cx={lastX} cy={lastY} r={2.4} fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
