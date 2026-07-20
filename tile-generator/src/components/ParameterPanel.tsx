import type { PatternParams } from '../types/tile';
import type { FitPriority, TilingFit } from '../utils/geometry';

interface NumberFieldProps {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}

function NumberField({ label, unit, value, min, max, step = 1, onChange }: NumberFieldProps) {
  return (
    <label className="block">
      <span className="flex justify-between text-xs">
        <span>{label}</span>
        <span className="text-neutral-500">{unit}</span>
      </span>
      <input
        type="number"
        className="mt-1 w-full border border-black px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v)) onChange(v);
        }}
      />
    </label>
  );
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <label className="block">
      <span className="text-xs">{label}</span>
      <span className="mt-1 flex items-center gap-2">
        <input
          type="color"
          className="h-8 w-12 cursor-pointer border border-black bg-white p-0.5"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="text-xs text-neutral-500">{value}</span>
      </span>
    </label>
  );
}

const clampInt = (v: number, min: number, max: number): number =>
  Math.min(Math.max(Math.round(v), min), max);

interface CountStepperProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  /** この軸が「ピッタリ合わせる基準」かどうか。基準側だけ操作できる */
  active: boolean;
  min?: number;
  max?: number;
}

/** EC の数量選択でおなじみの [−][数値][＋] ステッパー。非基準側は自動計算値を表示するだけの読み取り専用 */
function CountStepper({ label, value, onChange, active, min = 1, max = 100 }: CountStepperProps) {
  return (
    <div>
      <span className="flex items-center justify-between text-xs">
        <span>{label}</span>
        <span className={active ? 'font-bold text-black' : 'text-neutral-400'}>
          {active ? '基準' : '自動計算'}
        </span>
      </span>
      <div
        className={`mt-1 flex items-stretch border ${
          active ? 'border-black' : 'border-neutral-300 bg-neutral-50'
        }`}
      >
        <button
          type="button"
          disabled={!active}
          onClick={() => onChange(clampInt(value - 1, min, max))}
          className="w-9 text-base leading-none text-black transition-colors enabled:hover:bg-neutral-100 disabled:text-neutral-300"
          aria-label={`${label}を減らす`}
        >
          −
        </button>
        <input
          type="number"
          readOnly={!active}
          tabIndex={active ? 0 : -1}
          className={`w-full border-x px-1 py-1.5 text-center text-sm focus:outline-none ${
            active
              ? 'border-black focus:ring-1 focus:ring-black'
              : 'border-neutral-300 bg-neutral-50 text-neutral-500'
          }`}
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            if (!active) return;
            const v = Number(e.target.value);
            if (!Number.isNaN(v)) onChange(clampInt(v, min, max));
          }}
        />
        <button
          type="button"
          disabled={!active}
          onClick={() => onChange(clampInt(value + 1, min, max))}
          className="w-9 text-base leading-none text-black transition-colors enabled:hover:bg-neutral-100 disabled:text-neutral-300"
          aria-label={`${label}を増やす`}
        >
          ＋
        </button>
      </div>
    </div>
  );
}

interface Props {
  params: PatternParams;
  onChange: (params: PatternParams) => void;
  /** 枚数と基準方向から自動計算した実寸・個数 */
  fit: TilingFit;
  fitPriority: FitPriority;
  onFitPriorityChange: (p: FitPriority) => void;
  colsCount: number;
  onColsCountChange: (v: number) => void;
  rowsCount: number;
  onRowsCountChange: (v: number) => void;
}

export default function ParameterPanel({
  params,
  onChange,
  fit,
  fitPriority,
  onFitPriorityChange,
  colsCount,
  onColsCountChange,
  rowsCount,
  onRowsCountChange,
}: Props) {
  const set = <K extends keyof PatternParams>(key: K, value: PatternParams[K]): void => {
    onChange({ ...params, [key]: value });
  };
  return (
    <section>
      <h2 className="mb-3 text-sm font-bold tracking-widest">パラメータ</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="パネル幅"
            unit="mm"
            value={params.panelWidth}
            min={50}
            max={3000}
            step={10}
            onChange={(v) => set('panelWidth', v)}
          />
          <NumberField
            label="パネル高さ"
            unit="mm"
            value={params.panelHeight}
            min={50}
            max={3000}
            step={10}
            onChange={(v) => set('panelHeight', v)}
          />
        </div>
        <div>
          <span className="mb-1 block text-xs">敷き詰め方向の基準</span>
          <div className="flex border border-black text-xs">
            <button
              type="button"
              onClick={() => onFitPriorityChange('cols')}
              className={`flex-1 px-2 py-2 transition-colors ${
                fitPriority === 'cols' ? 'bg-black text-white' : 'bg-white hover:bg-neutral-100'
              }`}
            >
              横を基準に合わせる
            </button>
            <button
              type="button"
              onClick={() => onFitPriorityChange('rows')}
              className={`flex-1 border-l border-black px-2 py-2 transition-colors ${
                fitPriority === 'rows' ? 'bg-black text-white' : 'bg-white hover:bg-neutral-100'
              }`}
            >
              縦を基準に合わせる
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <CountStepper
            label="横の枚数"
            value={colsCount}
            onChange={onColsCountChange}
            active={fitPriority === 'cols'}
          />
          <CountStepper
            label="縦の枚数"
            value={rowsCount}
            onChange={onRowsCountChange}
            active={fitPriority === 'rows'}
          />
        </div>
        <div className="border border-black bg-neutral-50 px-3 py-2 text-xs">
          <div className="flex justify-between">
            <span className="text-neutral-600">仕上がりサイズ</span>
            <span className="font-bold">{fit.size.toFixed(1)} mm 角</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-neutral-600">配置</span>
            <span className="font-bold">
              横 {fit.cols} 枚 × 縦 {fit.rows} 枚
            </span>
          </div>
          <p className="mt-1 text-[10px] leading-tight text-neutral-500">
            基準にした方向はぴったり収まり、反対側は自動計算されます。割り切れない側は上下／左右が対称になるようカットされます。
          </p>
        </div>
        <div>
          <span className="flex justify-between text-xs">
            <span>回転角度</span>
            <span className="text-neutral-500">{params.rotation}°</span>
          </span>
          <input
            type="range"
            className="mt-1 w-full accent-black"
            min={-90}
            max={90}
            step={1}
            value={params.rotation}
            onChange={(e) => set('rotation', Number(e.target.value))}
          />
        </div>
        <div className="flex justify-between text-xs">
          <span>目地幅</span>
          <span className="text-neutral-500">3 mm（固定）</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ColorField label="タイル色" value={params.tileColor} onChange={(v) => set('tileColor', v)} />
          <ColorField label="目地色" value={params.groutColor} onChange={(v) => set('groutColor', v)} />
        </div>
      </div>
    </section>
  );
}
