import { useEffect, useRef } from 'react';
import type { PatternParams, Polyline } from '../types/tile';

interface Props {
  params: PatternParams;
  polylines: Polyline[];
}

export default function PreviewCanvas({ params, polylines }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    const W = cvs.width;
    const H = cvs.height;
    const pad = 40;
    const pw = params.panelWidth;
    const ph = params.panelHeight;
    const scale = Math.min((W - pad * 2) / pw, (H - pad * 2) / ph);
    const ox = (W - pw * scale) / 2;
    const oy = (H - ph * scale) / 2;

    ctx.clearRect(0, 0, W, H);

    // パネル面
    ctx.fillStyle = params.tileColor;
    ctx.fillRect(ox, oy, pw * scale, ph * scale);

    // 溝（目地）
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, oy, pw * scale, ph * scale);
    ctx.clip();
    ctx.strokeStyle = params.groutColor;
    ctx.lineWidth = Math.max(params.groutWidth * scale, 0.6);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const pl of polylines) {
      ctx.beginPath();
      pl.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(ox + p.x * scale, oy + p.y * scale);
        else ctx.lineTo(ox + p.x * scale, oy + p.y * scale);
      });
      if (pl.closed) ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();

    // パネル外形
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ox, oy, pw * scale, ph * scale);

    // 寸法表示
    ctx.fillStyle = '#000000';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${pw} mm`, ox + (pw * scale) / 2, oy - 10);
    ctx.save();
    ctx.translate(ox - 10, oy + (ph * scale) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${ph} mm`, 0, 0);
    ctx.restore();
  }, [params, polylines]);

  return (
    <section>
      <h2 className="mb-3 text-sm font-bold tracking-widest">プレビュー</h2>
      <canvas ref={ref} width={960} height={640} className="w-full border border-black bg-white" />
    </section>
  );
}
