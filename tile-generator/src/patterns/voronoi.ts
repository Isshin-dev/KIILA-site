import type { PatternDefinition, PatternParams, Point, Polyline } from '../types/tile';
import { generateWithRotation } from '../utils/geometry';

/** 決定的な疑似乱数（mulberry32） */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 半平面クリップを 1 回適用し、各辺がどの母点との境界かのラベルを保持する。
 * labels[k] は pts[k] → pts[k+1] の辺のラベル（隣接母点 index、外周は -1）。
 */
function clipHalfPlane(
  pts: Point[],
  labels: number[],
  si: Point,
  sj: Point,
  j: number,
): [Point[], number[]] {
  const mx = (si.x + sj.x) / 2;
  const my = (si.y + sj.y) / 2;
  const nx = sj.x - si.x;
  const ny = sj.y - si.y;
  const f = (p: Point): number => (p.x - mx) * nx + (p.y - my) * ny;
  const n = pts.length;
  const newPts: Point[] = [];
  const newLabels: number[] = [];
  for (let k = 0; k < n; k++) {
    const a = pts[k];
    const b = pts[(k + 1) % n];
    const lab = labels[k];
    const fa = f(a);
    const fb = f(b);
    const aIn = fa <= 0;
    const bIn = fb <= 0;
    if (aIn) {
      newPts.push(a);
      newLabels.push(lab);
    }
    if (aIn !== bIn) {
      const t = fa / (fa - fb);
      newPts.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
      // 出ていく交点からは二等分線に沿った新しい辺、入る交点からは元の辺の残り
      newLabels.push(aIn ? j : lab);
    }
  }
  return [newPts, newLabels];
}

/**
 * ボロノイパターン。
 * 母点はパネル寸法から導出した固定シードによるジッタ付きグリッドで、
 * 同じ寸法なら常に同じ模様になる（シャッフルなし）。
 * 各セルを近傍母点との垂直二等分線でクリップして境界線を得る。
 */
function voronoiPattern(params: PatternParams): Polyline[] {
  const s = Math.max(params.tileSize, 5);
  const seed =
    ((Math.round(params.panelWidth) * 73856093) ^
      (Math.round(params.panelHeight) * 19349663)) >>>
    0;
  return generateWithRotation(params, (b) => {
    const cols = Math.max(1, Math.ceil(b.w / s));
    const rows = Math.max(1, Math.ceil(b.h / s));
    if (cols * rows > 5000) return [];
    const rand = mulberry32(seed);
    const sites: Point[] = [];
    for (let iy = 0; iy < rows; iy++) {
      for (let ix = 0; ix < cols; ix++) {
        sites.push({
          x: b.x + (ix + 0.5) * s + (rand() - 0.5) * s * 0.8,
          y: b.y + (iy + 0.5) * s + (rand() - 0.5) * s * 0.8,
        });
      }
    }
    const out: Polyline[] = [];
    for (let iy = 0; iy < rows; iy++) {
      for (let ix = 0; ix < cols; ix++) {
        const i = iy * cols + ix;
        let pts: Point[] = [
          { x: b.x, y: b.y },
          { x: b.x + b.w, y: b.y },
          { x: b.x + b.w, y: b.y + b.h },
          { x: b.x, y: b.y + b.h },
        ];
        let labels: number[] = [-1, -1, -1, -1];
        // ジッタ付きグリッドなので近傍 ±3 セルだけ見れば十分
        outer: for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            if (dx === 0 && dy === 0) continue;
            const jx = ix + dx;
            const jy = iy + dy;
            if (jx < 0 || jy < 0 || jx >= cols || jy >= rows) continue;
            const j = jy * cols + jx;
            [pts, labels] = clipHalfPlane(pts, labels, sites[i], sites[j], j);
            if (pts.length < 3) break outer;
          }
        }
        // 各辺は隣接セル側でも現れるため j > i のものだけ出力して重複を防ぐ
        for (let k = 0; k < pts.length; k++) {
          if (labels[k] > i) {
            out.push({
              points: [pts[k], pts[(k + 1) % pts.length]],
              closed: false,
            });
          }
        }
      }
    }
    return out;
  });
}

const definition: PatternDefinition = {
  id: 'voronoi',
  label: 'ボロノイ',
  order: 7,
  generate: voronoiPattern,
};
export default definition;
