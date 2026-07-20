import { useEffect, useMemo, useState } from 'react';
import ExportPanel from './components/ExportPanel';
import ParameterPanel from './components/ParameterPanel';
import PatternSelector from './components/PatternSelector';
import PhotoOverlay from './components/PhotoOverlay';
import PreviewCanvas from './components/PreviewCanvas';
import PreviewCanvas3D from './components/PreviewCanvas3D';
import TileEditor from './components/TileEditor';
import { generatePattern } from './patterns';
import type { EditableTile, PatternParams, PatternType } from './types/tile';
import { createDefaultTile } from './utils/editableTile';
import type { FitPriority } from './utils/geometry';
import { computeTilingFitByCount } from './utils/geometry';

const clamp = (v: number, min: number, max: number): number => Math.min(Math.max(v, min), max);

/** 目地幅は 3mm 固定 */
const GROUT_WIDTH = 3;

export default function App() {
  const [patternType, setPatternType] = useState<PatternType>('brick');
  const [tile, setTile] = useState<EditableTile>(() => createDefaultTile());
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [params, setParams] = useState<PatternParams>({
    panelWidth: 900,
    panelHeight: 600,
    tileSize: 100, // 自動フィットで上書きされる実寸（初期値はダミー）
    rotation: 0,
    groutWidth: GROUT_WIDTH,
    tileColor: '#ffffff',
    groutColor: '#000000',
  });

  // どちらの方向をピッタリ合わせの基準にするか、その枚数
  const [fitPriority, setFitPriority] = useState<FitPriority>('cols');
  const [colsCount, setColsCount] = useState(3);
  const [rowsCount, setRowsCount] = useState(5);

  // 入力途中の極端な値で固まらないよう、生成前にレンジへ収める
  const clampedInput = useMemo(
    () => ({
      panelWidth: clamp(params.panelWidth, 50, 3000),
      panelHeight: clamp(params.panelHeight, 50, 3000),
      rotation: clamp(params.rotation, -90, 90),
    }),
    [params.panelWidth, params.panelHeight, params.rotation],
  );

  // 基準方向の枚数がピッタリ収まる実寸を自動計算し、もう一方は最も近い枚数に丸める
  const fit = useMemo(
    () =>
      computeTilingFitByCount(
        clampedInput.panelWidth,
        clampedInput.panelHeight,
        fitPriority === 'cols' ? colsCount : rowsCount,
        fitPriority,
      ),
    [clampedInput.panelWidth, clampedInput.panelHeight, fitPriority, colsCount, rowsCount],
  );

  // 丸めた側の枚数表示を最新の自動計算値に同期する
  // （基準を切り替えたときに、直前まで表示していた枚数がそのまま新しい基準値になる）
  useEffect(() => {
    if (fitPriority === 'cols') setRowsCount(fit.rows);
    else setColsCount(fit.cols);
  }, [fitPriority, fit.rows, fit.cols]);

  const safeParams = useMemo<PatternParams>(
    () => ({
      ...params,
      panelWidth: clampedInput.panelWidth,
      panelHeight: clampedInput.panelHeight,
      // 自動フィットした実寸で敷き詰める
      tileSize: fit.size,
      rotation: clampedInput.rotation,
      groutWidth: GROUT_WIDTH,
    }),
    [params, clampedInput, fit.size],
  );

  const polylines = useMemo(
    () => generatePattern(patternType, safeParams, tile),
    [patternType, safeParams, tile],
  );

  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <header className="border-b border-black px-6 py-4">
        <h1 className="text-xl font-bold tracking-widest">オーダータイルデザイン</h1>
        <p className="mt-1 text-xs text-neutral-600">
          合板パネル CNC 加工用 オリジナルタイルパターン作成ツール
        </p>
      </header>
      <main className="flex flex-1 flex-col lg:flex-row">
        <aside className="w-full shrink-0 space-y-8 border-b border-black p-5 lg:w-80 lg:border-b-0 lg:border-r">
          <PatternSelector value={patternType} onChange={setPatternType} />
          <ParameterPanel
            params={params}
            onChange={setParams}
            fit={fit}
            fitPriority={fitPriority}
            onFitPriorityChange={setFitPriority}
            colsCount={colsCount}
            onColsCountChange={setColsCount}
            rowsCount={rowsCount}
            onRowsCountChange={setRowsCount}
          />
          <TileEditor
            tile={tile}
            onChange={(next) => {
              setTile(next);
              setPatternType('custom');
            }}
          />
        </aside>
        <section className="flex-1 space-y-10 p-6">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setViewMode('2d')}
              className={`border border-black px-3 py-1 text-xs tracking-widest ${
                viewMode === '2d' ? 'bg-black text-white' : 'bg-white text-black'
              }`}
            >
              2D
            </button>
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`border border-black px-3 py-1 text-xs tracking-widest ${
                viewMode === '3d' ? 'bg-black text-white' : 'bg-white text-black'
              }`}
            >
              3D
            </button>
          </div>
          {viewMode === '2d' ? (
            <PreviewCanvas params={safeParams} polylines={polylines} />
          ) : (
            <PreviewCanvas3D params={safeParams} polylines={polylines} />
          )}
          <PhotoOverlay params={safeParams} polylines={polylines} />
        </section>
      </main>
      <footer className="sticky bottom-0 border-t border-black bg-white px-6 py-3">
        <ExportPanel params={safeParams} polylines={polylines} />
      </footer>
    </div>
  );
}
