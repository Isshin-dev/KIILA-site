import { useState } from 'react';
import type { FormEvent } from 'react';
import type { PatternParams, Polyline } from '../types/tile';
import { buildDXF, buildSVG, downloadText } from '../utils/export';

interface Props {
  params: PatternParams;
  polylines: Polyline[];
}

export default function ExportPanel({ params, polylines }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<'idle' | 'success' | 'error'>('idle');

  const openOrderForm = (): void => {
    setResult('idle');
    setShowModal(true);
  };

  const submitOrder = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    if (String(values.get('website') ?? '').trim()) return;

    const svg = buildSVG(polylines, params);
    const dxf = buildDXF(polylines, params);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const payload = new FormData();
    payload.append('name', String(values.get('name') ?? '').trim());
    payload.append('email', String(values.get('email') ?? '').trim());
    payload.append('phone', String(values.get('phone') ?? '').trim());
    payload.append('message', String(values.get('message') ?? '').trim());
    payload.append('website', String(values.get('website') ?? '').trim());
    payload.append(
      'specification',
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        params,
        pathCount: polylines.length,
      }),
    );
    payload.append('svg', new Blob([svg], { type: 'image/svg+xml' }), `mokuri-tile-${timestamp}.svg`);
    payload.append('dxf', new Blob([dxf], { type: 'application/dxf' }), `mokuri-tile-${timestamp}.dxf`);

    setIsSending(true);
    setResult('idle');
    try {
      const response = await fetch('./api/tile-order.php', { method: 'POST', body: payload });
      if (!response.ok) throw new Error('送信に失敗しました');
      setResult('success');
      form.reset();
    } catch {
      setResult('error');
    } finally {
      setIsSending(false);
    }
  };

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
          onClick={openOrderForm}
          className="bg-black px-6 py-2 text-sm text-white hover:bg-neutral-800"
        >
          データを送って見積もり依頼
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
            {result === 'success' ? (
              <>
                <p className="text-lg font-bold tracking-widest">送信しました</p>
                <p className="mt-3 text-sm text-neutral-600">
                  設計データを工房へ送信しました。内容を確認のうえご連絡します。
                </p>
                <button
                  type="button"
                  className="mt-6 border border-black px-8 py-2 text-sm hover:bg-neutral-100"
                  onClick={() => setShowModal(false)}
                >
                  閉じる
                </button>
              </>
            ) : (
              <form className="mx-auto max-w-md space-y-4 text-left" onSubmit={submitOrder}>
                <div>
                  <p className="text-lg font-bold tracking-widest">設計データを送る</p>
                  <p className="mt-2 text-sm text-neutral-600">
                    DXF と SVG の設計データを工房へ送信します。確認後、見積もりをご連絡します。
                  </p>
                </div>
                <label className="block text-sm">
                  お名前
                  <input name="name" required className="mt-1 w-full border border-black px-3 py-2" autoComplete="name" />
                </label>
                <label className="block text-sm">
                  メールアドレス
                  <input name="email" type="email" required className="mt-1 w-full border border-black px-3 py-2" autoComplete="email" />
                </label>
                <label className="block text-sm">
                  電話番号（任意）
                  <input name="phone" type="tel" className="mt-1 w-full border border-black px-3 py-2" autoComplete="tel" />
                </label>
                <label className="block text-sm">
                  ご要望（任意）
                  <textarea name="message" rows={3} className="mt-1 w-full border border-black px-3 py-2" />
                </label>
                <label className="hidden" aria-hidden="true">
                  Website
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
                {result === 'error' && (
                  <p className="text-sm text-red-700">送信できませんでした。時間をおいて再度お試しください。</p>
                )}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    className="border border-black px-5 py-2 text-sm hover:bg-neutral-100"
                    onClick={() => setShowModal(false)}
                    disabled={isSending}
                  >
                    キャンセル
                  </button>
                  <button type="submit" className="bg-black px-5 py-2 text-sm text-white disabled:opacity-50" disabled={isSending}>
                    {isSending ? '送信中…' : '設計データを送信'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
