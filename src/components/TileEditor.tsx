import { useEffect, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { EditableTile, Point, TileSymmetry } from '../types/tile';
import {
  buildEdge,
  createDefaultTile,
  editableEdges,
  tileCellCurves,
  type EdgeName,
} from '../utils/editableTile';

const CANVAS = 480;
const VIEW_MIN = -0.5; // 表示範囲はタイル正規化座標で -0.5 〜 1.5
const SCALE = CANVAS / 2;
const HANDLE_RADIUS = 12; // ハンドルの当たり判定 (canvas px)
const SEGMENT_RADIUS = 10; // 辺クリックで点追加する当たり判定 (canvas px)

const toCanvas = (p: Point): Point => ({
  x: (p.x - VIEW_MIN) * SCALE,
  y: (p.y - VIEW_MIN) * SCALE,
});
const toNorm = (p: Point): Point => ({
  x: p.x / SCALE + VIEW_MIN,
  y: p.y / SCALE + VIEW_MIN,
});
const clampNorm = (p: Point): Point => ({
  x: Math.min(Math.max(p.x, -0.45), 1.45),
  y: Math.min(Math.max(p.y, -0.45), 1.45),
});

/**
 * 編集対象になるサブカーブ（コーナー含む点列、単位座標）。
 * translation は辺全体、rotation180 はコーナー→中点の前半のみ。
 */
function editableCurve(tile: EditableTile, edge: EdgeName): Point[] {
  const full = buildEdge(tile, edge);
  if (tile.symmetry === 'translation') return full;
  // full = [コーナー, ...前半, 中点, ...後半, コーナー]
  return full.slice(0, tile[edge].length + 2);
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

const SYMMETRY_MODES: { value: TileSymmetry; label: string }[] = [
  { value: 'translation', label: '平行移動' },
  { value: 'rotation180', label: '180°回転' },
];

interface Props {
  tile: EditableTile;
  onChange: (tile: EditableTile) => void;
}

/**
 * オリジナルタイルのエディタ。
 * 辺上の点をドラッグして変形すると、対になる辺（平行移動モードでは反対側の辺、
 * 180°回転モードでは同じ辺の後半）が自動で追従し、
 * どう変形しても隙間なく敷き詰められる形が保たれる。
 */
export default function TileEditor({ tile, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ edge: EdgeName; index: number } | null>(null);

  const eventPos = (e: { clientX: number; clientY: number }): Point => {
    const cvs = canvasRef.current!;
    const r = cvs.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * CANVAS,
      y: ((e.clientY - r.top) / r.height) * CANVAS,
    };
  };

  const findHandle = (cp: Point): { edge: EdgeName; index: number } | null => {
    for (const edge of editableEdges(tile)) {
      const pts = tile[edge];
      for (let i = 0; i < pts.length; i++) {
        const h = toCanvas(pts[i]);
        if (Math.hypot(h.x - cp.x, h.y - cp.y) < HANDLE_RADIUS) return { edge, index: i };
      }
    }
    return null;
  };

  const capture = (e: ReactPointerEvent<HTMLCanvasElement>): void => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 合成イベント等でキャプチャできなくてもドラッグ自体は動く
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>): void => {
    const cp = eventPos(e);
    const hit = findHandle(cp);
    if (hit) {
      dragRef.current = hit;
      capture(e);
      return;
    }
    // 編集可能な辺の上なら点を追加してそのままドラッグ開始
    for (const edge of editableEdges(tile)) {
      const curve = editableCurve(tile, edge).map(toCanvas);
      for (let i = 0; i < curve.length - 1; i++) {
        if (distToSegment(cp, curve[i], curve[i + 1]) < SEGMENT_RADIUS) {
          const pts = [...tile[edge]];
          pts.splice(i, 0, clampNorm(toNorm(cp)));
          dragRef.current = { edge, index: i };
          onChange({ ...tile, [edge]: pts });
          capture(e);
          return;
        }
      }
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>): void => {
    const drag = dragRef.current;
    if (!drag) return;
    const pts = [...tile[drag.edge]];
    pts[drag.index] = clampNorm(toNorm(eventPos(e)));
    onChange({ ...tile, [drag.edge]: pts });
  };

  const onPointerUp = (): void => {
    dragRef.current = null;
  };

  const onDoubleClick = (e: ReactMouseEvent<HTMLCanvasElement>): void => {
    const hit = findHandle(eventPos(e));
    if (!hit) return;
    const pts = [...tile[hit.edge]];
    pts.splice(hit.index, 1);
    onChange({ ...tile, [hit.edge]: pts });
  };

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS, CANVAS);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS, CANVAS);

    const stroke = (pts: Point[], offset: Point): void => {
      ctx.beginPath();
      pts.forEach((p, i) => {
        const c = toCanvas({ x: p.x + offset.x, y: p.y + offset.y });
        if (i === 0) ctx.moveTo(c.x, c.y);
        else ctx.lineTo(c.x, c.y);
      });
      ctx.stroke();
    };

    // 周囲 3×3 の敷き詰めゴースト
    const { even, odd } = tileCellCurves(tile);
    ctx.strokeStyle = '#d4d4d4';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        const set = (((di + dj) % 2) + 2) % 2 === 0 ? even : odd;
        for (const pl of set) stroke(pl.points, { x: di, y: dj });
      }
    }

    // 元の単位セル（参考線）
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = '#a3a3a3';
    ctx.lineWidth = 1;
    const o = toCanvas({ x: 0, y: 0 });
    ctx.strokeRect(o.x, o.y, SCALE, SCALE);
    ctx.setLineDash([]);

    // 中央タイルの輪郭
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    for (const edge of ['top', 'right', 'bottom', 'left'] as EdgeName[]) {
      stroke(buildEdge(tile, edge), { x: 0, y: 0 });
    }

    // 固定点：コーナー（回転モードでは辺の中点も）
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    const fixed: Point[] = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 },
    ];
    if (tile.symmetry === 'rotation180') {
      fixed.push({ x: 0.5, y: 0 }, { x: 1, y: 0.5 }, { x: 0.5, y: 1 }, { x: 0, y: 0.5 });
    }
    for (const p of fixed) {
      const c = toCanvas(p);
      ctx.beginPath();
      ctx.rect(c.x - 4, c.y - 4, 8, 8);
      ctx.fill();
      ctx.stroke();
    }

    // 編集ハンドル
    ctx.fillStyle = '#000000';
    for (const edge of editableEdges(tile)) {
      for (const p of tile[edge]) {
        const c = toCanvas(p);
        ctx.beginPath();
        ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [tile]);

  return (
    <section>
      <h2 className="mb-3 text-sm font-bold tracking-widest">オリジナルタイル作成</h2>
      <p className="mb-3 text-xs leading-relaxed text-neutral-600">
        辺をクリックで点を追加、ドラッグで変形、点をダブルクリックで削除。
        対になる辺が自動で追従するため、どう変形しても隙間なく敷き詰められます。
      </p>
      <div className="mb-2 grid grid-cols-2 gap-2">
        {SYMMETRY_MODES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            title="切り替えると編集中の形はリセットされます"
            onClick={() => onChange(createDefaultTile(value))}
            className={`border border-black px-2 py-2 text-sm transition-colors ${
              tile.symmetry === value
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS}
        height={CANVAS}
        className="w-full cursor-crosshair touch-none border border-black bg-white"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onDoubleClick={onDoubleClick}
      />
      <button
        type="button"
        onClick={() => onChange(createDefaultTile(tile.symmetry))}
        className="mt-2 w-full border border-black px-4 py-2 text-sm hover:bg-neutral-100"
      >
        リセット
      </button>
    </section>
  );
}
