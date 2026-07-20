import type { EditableTile, Point, Polyline, TileSymmetry } from '../types/tile';

export type EdgeName = 'top' | 'right' | 'bottom' | 'left';

/** 各辺の始点・終点（単位正方形のコーナー） */
export const EDGE_ENDS: Record<EdgeName, [Point, Point]> = {
  top: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
  right: [{ x: 1, y: 0 }, { x: 1, y: 1 }],
  bottom: [{ x: 0, y: 1 }, { x: 1, y: 1 }],
  left: [{ x: 0, y: 0 }, { x: 0, y: 1 }],
};

export function createDefaultTile(symmetry: TileSymmetry = 'translation'): EditableTile {
  return { symmetry, top: [], right: [], bottom: [], left: [] };
}

/** 編集できる辺（それ以外は対称ルールで導出される） */
export function editableEdges(tile: EditableTile): EdgeName[] {
  return tile.symmetry === 'translation'
    ? ['top', 'left']
    : ['top', 'right', 'bottom', 'left'];
}

/** 点 c についての点対称 */
const pointSym = (p: Point, c: Point): Point => ({ x: 2 * c.x - p.x, y: 2 * c.y - p.y });

/**
 * 辺の完全なカーブ（両端コーナーを含む点列、単位座標）を返す。
 * translation: bottom = top の平行移動、right = left の平行移動。
 * rotation180: 保持している前半 + 中点 + 前半の点対称コピー。
 */
export function buildEdge(tile: EditableTile, edge: EdgeName): Point[] {
  const [a, b] = EDGE_ENDS[edge];
  if (tile.symmetry === 'translation') {
    if (edge === 'bottom') {
      return buildEdge(tile, 'top').map((p) => ({ x: p.x, y: p.y + 1 }));
    }
    if (edge === 'right') {
      return buildEdge(tile, 'left').map((p) => ({ x: p.x + 1, y: p.y }));
    }
    return [a, ...tile[edge], b];
  }
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const mirrored = [...tile[edge]].reverse().map((p) => pointSym(p, m));
  return [a, ...tile[edge], m, ...mirrored, b];
}

/**
 * 1 セルに描く溝カーブ（セル原点基準の単位座標）。
 * 重複彫りを避けるため、各セルは自分の上辺と左辺だけを受け持つ。
 * even は偶数セル (ix+iy が偶数)、odd は奇数セル用。
 * rotation180 では奇数セルにタイルの 180°回転コピーが置かれるため、
 * その上辺・左辺は元タイルの bottom / right を回転したものになる。
 */
export function tileCellCurves(tile: EditableTile): { even: Polyline[]; odd: Polyline[] } {
  const even: Polyline[] = [
    { points: buildEdge(tile, 'top'), closed: false },
    { points: buildEdge(tile, 'left'), closed: false },
  ];
  if (tile.symmetry === 'translation') {
    return { even, odd: even };
  }
  const rho = (p: Point): Point => ({ x: 1 - p.x, y: 1 - p.y });
  const odd: Polyline[] = [
    { points: buildEdge(tile, 'bottom').map(rho), closed: false },
    { points: buildEdge(tile, 'right').map(rho), closed: false },
  ];
  return { even, odd };
}
