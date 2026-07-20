import { useState } from 'react';
import type { PatternParams, Polyline } from '../types/tile';
import { buildDXF, buildSVG, downloadText } from '../utils/export';

interface Props {
  params: PatternParams;
  polylines: Polyline[];
}

export default function ExportPanel({ params, polylines }: Props) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="hidden text-xs text-neutral-500 sm:block">
        書き出し単位：mm ／ 材料：合板（CAM 加工は工房側で行います）
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => downloadText('tile-panel.svg', buildSVG(polylines, params), 'image/svg+xml')}
          className="border border-black px-5 py-2 text-sm hover:bg-neutral-100"
        >
          SVG書き出し
        </button>
        <button
          type="button"
          onClick={() => downloadText('tile-panel.dxf', buildDXF(polylines, params), 'application/dxf')}
          className="border border-black px-5 py-2 text-sm hover:bg-neutral-100"
        >
          DXF書き出し
        </button>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="bg-black px-6 py-2 text-sm text-white hover:bg-neutral-800"
        >
          注文する
        </button>
      </div>
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="border border-black bg-white p-10 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-lg font-bold tracking-widest">近日公開予定</p>
            <p className="mt-3 text-sm text-neutral-600">注文機能は現在準備中です。</p>
            <button
              type="button"
              className="mt-6 border border-black px-8 py-2 text-sm hover:bg-neutral-100"
              onClick={() => setShowModal(false)}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
