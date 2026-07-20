import type { PatternParams, Point, Polyline } from '../types/tile';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const deg2rad = (d: number): number => (d * Math.PI) / 180;

/** 自動フィット結果：パネルに収める実寸と、横・縦の個数 */
export interface TilingFit {
  /** 実際に敷き詰める 1 マスの寸法 mm（基準にした軸にピッタリ整数個並ぶ） */
  size: number;
  /** 横方向の個数 */
  cols: number;
  /** 縦方向の個数 */
  rows: number;
}

/** ピッタリ合わせる基準にする軸 */
export type FitPriority = 'cols' | 'rows';

/**
 * パネル W×H に対し、基準軸（横 or 縦）の枚数がピッタリ収まる 1 マス寸法を求め、
 * もう一方の軸は最も近い整数枚数に丸める。
 *
 * 例: W300×H500, priority='cols', count=3 → size100（横3枚ピッタリ、縦は5枚）
 * 丸めた側は中央寄せ（generateWithRotation 側）で上下または左右が
 * 対称に切れるようにする。
 */
export function computeTilingFitByCount(
  W: number,
  H: number,
  count: number,
  priority: FitPriority,
): TilingFit {
  const n = Math.max(1, Math.round(count));
  if (priority === 'cols') {
    const size = W / n;
    return { size, cols: n, rows: Math.max(1, Math.round(H / size)) };
  }
  const size = H / n;
  return { size, cols: Math.max(1, Math.round(W / size)), rows: n };
}

export function rotatePoint(p: Point, c: Point, rad: number): Point {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
}

const EPS = 1e-6;

const samePoint = (a: Point, b: Point): boolean =>
  Math.abs(a.x - b.x) < 1e-4 && Math.abs(a.y - b.y) < 1e-4;

/** Liang–Barsky による線分の矩形クリップ */
export function clipSegmentToRect(a: Point, b: Point, r: Rect): [Point, Point] | null {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const p = [-dx, dx, -dy, dy];
  const q = [a.x - r.x, r.x + r.w - a.x, a.y - r.y, r.y + r.h - a.y];
  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < EPS) {
      if (q[i] < 0) return null;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return null;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return null;
        if (t < t1) t1 = t;
      }
    }
  }
  return [
    { x: a.x + t0 * dx, y: a.y + t0 * dy },
    { x: a.x + t1 * dx, y: a.y + t1 * dy },
  ];
}

/** ポリラインを矩形でクリップし、断片のポリライン群を返す */
export function clipPolylineToRect(poly: Polyline, rect: Rect): Polyline[] {
  const inside = (p: Point): boolean =>
    p.x >= rect.x - EPS &&
    p.x <= rect.x + rect.w + EPS &&
    p.y >= rect.y - EPS &&
    p.y <= rect.y + rect.h + EPS;
  if (poly.points.length >= 2 && poly.points.every(inside)) return [poly];

  const pts = poly.closed ? [...poly.points, poly.points[0]] : poly.points;
  const out: Polyline[] = [];
  let current: Point[] | null = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const seg = clipSegmentToRect(pts[i], pts[i + 1], rect);
    if (!seg) {
      if (current) {
        out.push({ points: current, closed: false });
        current = null;
      }
      continue;
    }
    if (current && samePoint(current[current.length - 1], seg[0])) {
      current.push(seg[1]);
    } else {
      if (current) out.push({ points: current, closed: false });
      current = [seg[0], seg[1]];
    }
  }
  if (current) out.push({ points: current, closed: false });
  return out.filter((pl) => pl.points.length >= 2);
}

/**
 * パターン生成の共通ラッパー。
 * 回転前の座標系で十分広い範囲を生成させ、パネル中心まわりに回転後、
 * パネル矩形 (0,0)-(W,H) でクリップする。
 */
export function generateWithRotation(
  params: PatternParams,
  gen: (bounds: Rect) => Polyline[],
): Polyline[] {
  const panel: Rect = { x: 0, y: 0, w: params.panelWidth, h: params.panelHeight };
  const c: Point = { x: panel.w / 2, y: panel.h / 2 };
  const rad = deg2rad(params.rotation);
  const corners: Point[] = [
    { x: 0, y: 0 },
    { x: panel.w, y: 0 },
    { x: panel.w, y: panel.h },
    { x: 0, y: panel.h },
  ].map((p) => rotatePoint(p, c, -rad));
  const margin = params.tileSize * 2;
  const minX = Math.min(...corners.map((p) => p.x)) - margin;
  const maxX = Math.max(...corners.map((p) => p.x)) + margin;
  const minY = Math.min(...corners.map((p) => p.y)) - margin;
  const maxY = Math.max(...corners.map((p) => p.y)) + margin;
  const lines = gen({ x: minX, y: minY, w: maxX - minX, h: maxY - minY });
  // 中央寄せ：パターンは原点(0)基準のグリッドで生成されるので、
  // パネル内で対称に切れるよう全体を平行移動する。
  // 割り切れる軸ではオフセット 0（そのままピッタリ）、割り切れない軸では
  // 端の欠けが上下／左右で等しくなる量だけずらす。
  const s = Math.max(params.tileSize, 1);
  const offX = (panel.w - Math.max(1, Math.round(panel.w / s)) * s) / 2;
  const offY = (panel.h - Math.max(1, Math.round(panel.h / s)) * s) / 2;
  const centered =
    offX === 0 && offY === 0
      ? lines
      : lines.map((pl) => ({
          ...pl,
          points: pl.points.map((p) => ({ x: p.x + offX, y: p.y + offY })),
        }));
  const rotated =
    rad === 0
      ? centered
      : centered.map((pl) => ({
          ...pl,
          points: pl.points.map((p) => rotatePoint(p, c, rad)),
        }));
  return rotated.flatMap((pl) => clipPolylineToRect(pl, panel));
}

/** 共有エッジの重複を除去して 2 点ポリライン群にする（六角形・ボロノイ用） */
export function dedupeSegments(segs: [Point, Point][]): Polyline[] {
  const seen = new Set<string>();
  const out: Polyline[] = [];
  const k = (p: Point): string => `${Math.round(p.x * 100)},${Math.round(p.y * 100)}`;
  for (const [a, b] of segs) {
    const ka = k(a);
    const kb = k(b);
    const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ points: [a, b], closed: false });
  }
  return out;
}
