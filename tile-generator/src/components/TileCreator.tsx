import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { CustomTile } from '../types/tile';
import { vectorizeImage } from '../utils/vectorize';

interface Props {
  customTile: CustomTile | null;
  onCreated: (tile: CustomTile) => void;
}

const MAX_DIM = 300;

/** 手描き画像のアップロード → 自動ベクトル化 */
export default function TileCreator({ customTile, onCreated }: Props) {
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const s = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
        const w = Math.max(2, Math.round(img.width * s));
        const h = Math.max(2, Math.round(img.height * s));
        const cvs = document.createElement('canvas');
        cvs.width = w;
        cvs.height = h;
        const ctx = cvs.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const tile = vectorizeImage(ctx.getImageData(0, 0, w, h));
        onCreated(tile);
      } catch {
        setError('ベクトル化に失敗しました。別の画像でお試しください。');
      } finally {
        setBusy(false);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError('画像を読み込めませんでした。');
      setBusy(false);
    };
    img.src = url;
  };

  useEffect(() => {
    const cvs = previewRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    const size = cvs.width;
    ctx.clearRect(0, 0, size, size);
    if (!customTile || customTile.polylines.length === 0) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const pl of customTile.polylines) {
      ctx.beginPath();
      pl.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x * size, p.y * size);
        else ctx.lineTo(p.x * size, p.y * size);
      });
      if (pl.closed) ctx.closePath();
      ctx.stroke();
    }
    ctx.strokeStyle = '#a3a3a3';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
  }, [customTile]);

  return (
    <section>
      <h2 className="mb-3 text-sm font-bold tracking-widest">手描きタイル作成</h2>
      <p className="mb-3 text-xs text-neutral-600">
        手描きの絵や模様の画像をアップロードすると、自動で輪郭線を抽出してタイル化します。
      </p>
      <label className="block cursor-pointer border border-black px-4 py-2 text-center text-sm hover:bg-neutral-100">
        {busy ? '処理中…' : '画像をアップロード'}
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={busy} />
      </label>
      {error && <p className="mt-2 text-xs">⚠ {error}</p>}
      {customTile && (
        <div className="mt-3 space-y-2">
          <canvas ref={previewRef} width={160} height={160} className="border border-black" />
          {customTile.warnings.map((wmsg) => (
            <p key={wmsg} className="text-xs leading-relaxed">
              ⚠ {wmsg}
            </p>
          ))}
          {customTile.warnings.length === 0 && customTile.polylines.length > 0 && (
            <p className="text-xs text-neutral-600">✓ 四辺の連続性に問題はありません</p>
          )}
        </div>
      )}
    </section>
  );
}
