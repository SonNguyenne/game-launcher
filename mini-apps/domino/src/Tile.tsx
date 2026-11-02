import s from './Domino.module.css';

/** Vị trí chấm trong một nửa quân (ô 1×1). */
const SPOTS: Record<number, [number, number][]> = {
  0: [],
  1: [[0.5, 0.5]],
  2: [[0.27, 0.27], [0.73, 0.73]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.27, 0.22], [0.27, 0.5], [0.27, 0.78], [0.73, 0.22], [0.73, 0.5], [0.73, 0.78]],
};

function Half({ x, y, value, wide }: { x: number; y: number; value: number; wide: boolean }) {
  return (
    <>
      {(SPOTS[value] ?? []).map(([px, py], i) => (
        // Nửa của quân nằm ngang: xoay mẫu 6 chấm thành hai hàng ba.
        <circle key={i} className={s.pip} cx={x + (wide ? py : px)} cy={y + (wide ? px : py)} r={0.09} />
      ))}
    </>
  );
}

/** Vẽ một quân trong hệ tọa độ SVG đơn vị nửa quân. */
export function TileShape({ x, y, w, h, first, second, hot, fresh }: { x: number; y: number; w: number; h: number; first: number; second: number; hot?: boolean; fresh?: boolean }) {
  const wide = w > h;
  const pad = 0.04;
  return (
    <g className={fresh ? s.fresh : undefined}>
      <rect className={hot ? `${s.face} ${s.faceHot}` : s.face} x={x + pad} y={y + pad} width={w - pad * 2} height={h - pad * 2} rx={0.14} />
      {wide ? (
        <line className={s.split} x1={x + 1} y1={y + 0.18} x2={x + 1} y2={y + h - 0.18} />
      ) : (
        <line className={s.split} x1={x + 0.18} y1={y + 1} x2={x + w - 0.18} y2={y + 1} />
      )}
      <Half x={x} y={y} value={first} wide={wide} />
      <Half x={wide ? x + 1 : x} y={wide ? y : y + 1} value={second} wide={wide} />
    </g>
  );
}

/** Một quân đứng riêng (trên tay, trong bảng kết quả). */
export function TileSvg({ a, b, className }: { a: number; b: number; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1 2" aria-hidden="true">
      <TileShape x={0} y={0} w={1} h={2} first={a} second={b} />
    </svg>
  );
}
