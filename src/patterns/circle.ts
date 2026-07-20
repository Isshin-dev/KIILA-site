import type { PatternDefinition, PatternParams, Point, Polyline } from '../types/tile';
import { generateWithRotation } from '../utils/geometry';

const SEGMENTS = 48;

/** 円形タイル：tileSize 間隔のグリッドに目地幅ぶん縮めた円を配置 */
function circlePattern(params: PatternParams): Polyline[] {
  const s = Math.max(params.tileSize, 1);
  const r = Math.max((s - params.groutWidth) / 2, s * 0.1);
  return generateWithRotation(params, (b) => {
    const cols = Math.ceil(b.w / s) + 1;
    const rows = Math.ceil(b.h / s) + 1;
    if (cols * rows > 15000) return [];
    const out: Polyline[] = [];
    const x0 = Math.floor(b.x / s) * s + s / 2;
    const y0 = Math.floor(b.y / s) * s + s / 2;
    for (let y = y0; y <= b.y + b.h + s; y += s) {
      for (let x = x0; x <= b.x + b.w + s; x += s) {
        const pts: Point[] = [];
        for (let k = 0; k < SEGMENTS; k++) {
          const a = (2 * Math.PI * k) / SEGMENTS;
          pts.push({ x: x + r * Math.cos(a), y: y + r * Math.sin(a) });
        }
        out.push({ points: pts, closed: true });
      }
    }
    return out;
  });
}

const definition: PatternDefinition = {
  id: 'circle',
  label: '円形',
  order: 4,
  generate: circlePattern,
};
export default definition;
