import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, MouseEvent as ReactMouseEvent } from 'react';
import type { PatternParams, Point, Polyline } from '../types/tile';

interface DragRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  params: PatternParams;
  polylines: Polyline[];
}

/**
 * 部屋写真へのタイル合成（平面 2D、遠近補正なし）。
 * 写真上でドラッグした矩形にパターンを敷き詰める。
 */
export default function PhotoOverlay({ params, polylines }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [rect, setRect] = useState<DragRect | null>(null);
  const [dragStart, setDragStart] = useState<Point | null>(null);

  const handleFile = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImage(img);
      setRect(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const toCanvas = (e: ReactMouseEvent<HTMLCanvasElement>): Point => {
    const cvs = canvasRef.current!;
    const r = cvs.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * cvs.width,
      y: ((e.clientY - r.top) / r.height) * cvs.height,
    };
  };

  const onMouseDown = (e: ReactMouseEvent<HTMLCanvasElement>): void => {
    if (!image) return;
    const p = toCanvas(e);
    setDragStart(p);
    setRect({ x: p.x, y: p.y, w: 0, h: 0 });
  };

  const onMouseMove = (e: ReactMouseEvent<HTMLCanvasElement>): void => {
    if (!dragStart) return;
    const p = toCanvas(e);
    setRect({
      x: Math.min(dragStart.x, p.x),
      y: Math.min(dragStart.y, p.y),
      w: Math.abs(p.x - dragStart.x),
      h: Math.abs(p.y - dragStart.y),
    });
  };

  const onMouseUp = (): void => setDragStart(null);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    const W = cvs.width;
    const H = cvs.height;
    ctx.clearRect(0, 0, W, H);

    if (!image) {
      ctx.fillStyle = '#737373';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('部屋の写真をアップロードしてください', W / 2, H / 2);
      return;
    }

    const s = Math.min(W / image.width, H / image.height);
    const iw = image.width * s;
    const ih = image.height * s;
    const ix = (W - iw) / 2;
    const iy = (H - ih) / 2;
    ctx.drawImage(image, ix, iy, iw, ih);

    if (rect && rect.w > 4 && rect.h > 4) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.w, rect.h);
      ctx.clip();

      // パネル mm → 矩形ピクセルの倍率（矩形を覆うように合わせる）
      const scale = Math.max(rect.w / params.panelWidth, rect.h / params.panelHeight);

      ctx.globalAlpha = 0.55;
      ctx.fillStyle = params.tileColor;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = params.groutColor;
      ctx.lineWidth = Math.max(params.groutWidth * scale, 0.5);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const pl of polylines) {
        ctx.beginPath();
        pl.points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(rect.x + p.x * scale, rect.y + p.y * scale);
          else ctx.lineTo(rect.x + p.x * scale, rect.y + p.y * scale);
        });
        if (pl.closed) ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();

      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.setLineDash([]);
    }
  }, [image, rect, params, polylines]);

  return (
    <section>
      <h2 className="mb-3 text-sm font-bold tracking-widest">部屋写真シミュレーション</h2>
      <p className="mb-3 text-xs text-neutral-600">
        写真をアップロードし、タイルを貼りたい範囲をドラッグで指定してください（平面合成・遠近補正なし）。
      </p>
      <div className="mb-3 flex gap-3">
        <label className="cursor-pointer border border-black px-4 py-2 text-sm hover:bg-neutral-100">
          写真をアップロード
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
        <button
          type="button"
          onClick={() => setRect(null)}
          disabled={!rect}
          className="border border-black px-4 py-2 text-sm hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
        >
          範囲をクリア
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={960}
        height={560}
        className={`w-full border border-black bg-neutral-50 ${image ? 'cursor-crosshair' : ''}`}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      />
    </section>
  );
}
