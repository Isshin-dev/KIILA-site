import type { PatternDefinition, PatternParams, Point, Polyline } from '../types/tile';
import { generateWithRotation } from '../utils/geometry';

/**
 * トルコ（イスラム幾何学）八芒星パターン。
 * 45°ずらした 2 つの正方形を重ねた星形を tileSize 間隔の格子に配置。
 * 隣り合う星の頂点同士が接し、隙間が十字形になる伝統的構成。
 */
function turkishPattern(params: PatternParams): Polyline[] {
  const s = Math.max(params.tileSize, 1);
  const R = s / 2;
  // 2 つの正方形の辺の交点までの距離
  const inner = R / Math.SQRT2 / Math.cos(Math.PI / 8);
  return generateWithRotation(params, (b) => {
    const cols = Math.ceil(b.w / s) + 1;
    const rows = Math.ceil(b.h / s) + 1;
    if (cols * rows > 15000) return [];
    const out: Polyline[] = [];
    const x0 = Math.floor(b.x / s) * s;
    const y0 = Math.floor(b.y / s) * s;
    for (let y = y0; y <= b.y + b.h + s; y += s) {
      for (let x = x0; x <= b.x + b.w + s; x += s) {
        const pts: Point[] = [];
        for (let k = 0; k < 16; k++) {
          const a = (k * Math.PI) / 8;
          const rad = k % 2 === 0 ? R : inner;
          pts.push({ x: x + rad * Math.cos(a), y: y + rad * Math.sin(a) });
        }
        out.push({ points: pts, closed: true });
      }
    }
    return out;
  });
}

const definition: PatternDefinition = {
  id: 'turkish',
  label: 'トルコ星',
  order: 6,
  generate: turkishPattern,
};
export default definition;
