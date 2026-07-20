import type {
  EditableTile,
  PatternDefinition,
  PatternParams,
  PatternType,
  Polyline,
} from '../types/tile';
import { tileCellCurves } from '../utils/editableTile';
import { generateWithRotation } from '../utils/geometry';

/**
 * プリセットパターンの自動登録。
 * このフォルダ内の *.ts（index.ts 以外）をすべて読み込み、
 * default export された PatternDefinition を order 順に並べる。
 * → 新しいパターンはファイルを 1 つ追加するだけで選択肢に現れる。
 */
const modules = import.meta.glob(['./*.ts', '!./index.ts'], {
  eager: true,
  import: 'default',
});

export const PRESET_PATTERNS: PatternDefinition[] = Object.entries(modules)
  .filter((entry): entry is [string, PatternDefinition] => {
    const def = entry[1] as Partial<PatternDefinition> | undefined;
    const valid =
      !!def && typeof def.id === 'string' && typeof def.label === 'string' &&
      typeof def.order === 'number' && typeof def.generate === 'function';
    if (!valid && import.meta.env.DEV) {
      console.warn(`[patterns] ${entry[0]} に有効な PatternDefinition の default export がありません`);
    }
    return valid;
  })
  .map(([, def]) => def)
  .sort((a, b) => a.order - b.order);

if (import.meta.env.DEV) {
  const ids = PRESET_PATTERNS.map((d) => d.id);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length > 0) console.warn(`[patterns] ID が重複しています: ${dup.join(', ')}`);
}

const byId = new Map(PRESET_PATTERNS.map((d) => [d.id, d]));

/**
 * オリジナルタイル（エディタ製）を tileSize で敷き詰める。
 * 各セルは自分の上辺と左辺だけを描くので、溝の重複彫りは発生しない。
 * rotation180 ではセルの偶奇でタイルの向きが切り替わる。
 */
function customPattern(params: PatternParams, tile: EditableTile): Polyline[] {
  const s = Math.max(params.tileSize, 1);
  const { even, odd } = tileCellCurves(tile);
  return generateWithRotation(params, (b) => {
    const ix0 = Math.floor(b.x / s) - 1;
    const ix1 = Math.ceil((b.x + b.w) / s) + 1;
    const iy0 = Math.floor(b.y / s) - 1;
    const iy1 = Math.ceil((b.y + b.h) / s) + 1;
    if ((ix1 - ix0) * (iy1 - iy0) > 15000) return [];
    const out: Polyline[] = [];
    for (let iy = iy0; iy <= iy1; iy++) {
      for (let ix = ix0; ix <= ix1; ix++) {
        const set = (((ix + iy) % 2) + 2) % 2 === 0 ? even : odd;
        for (const pl of set) {
          out.push({
            closed: pl.closed,
            points: pl.points.map((p) => ({ x: (ix + p.x) * s, y: (iy + p.y) * s })),
          });
        }
      }
    }
    return out;
  });
}

export function generatePattern(
  type: PatternType,
  params: PatternParams,
  custom: EditableTile | null,
): Polyline[] {
  if (type === 'custom') {
    return custom ? customPattern(params, custom) : [];
  }
  const def = byId.get(type);
  return def ? def.generate(params) : [];
}
