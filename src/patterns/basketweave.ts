import type { PatternDefinition, PatternParams, Polyline } from '../types/tile';
import { generateWithRotation } from '../utils/geometry';

/**
 * バスケット織り：tileSize 角のブロックに tileSize × tileSize/2 のタイルを
 * 2 枚ずつ、縦横交互に敷き詰める。
 */
function basketweavePattern(params: PatternParams): Polyline[] {
  const s = Math.max(params.tileSize, 1);
  return generateWithRotation(params, (b) => {
    const lines: Polyline[] = [];
    // ブロック境界の格子線
    for (let x = Math.floor(b.x / s) * s; x <= b.x + b.w; x += s) {
      lines.push({ points: [{ x, y: b.y }, { x, y: b.y + b.h }], closed: false });
    }
    for (let y = Math.floor(b.y / s) * s; y <= b.y + b.h; y += s) {
      lines.push({ points: [{ x: b.x, y }, { x: b.x + b.w, y }], closed: false });
    }
    // 各ブロックの中央線（縦横交互）
    const ix0 = Math.floor(b.x / s);
    const iy0 = Math.floor(b.y / s);
    for (let iy = iy0; iy * s <= b.y + b.h; iy++) {
      for (let ix = ix0; ix * s <= b.x + b.w; ix++) {
        const x = ix * s;
        const y = iy * s;
        if ((((ix + iy) % 2) + 2) % 2 === 0) {
          lines.push({ points: [{ x, y: y + s / 2 }, { x: x + s, y: y + s / 2 }], closed: false });
        } else {
          lines.push({ points: [{ x: x + s / 2, y }, { x: x + s / 2, y: y + s }], closed: false });
        }
      }
    }
    return lines;
  });
}

const definition: PatternDefinition = {
  id: 'basketweave',
  label: 'バスケット',
  order: 5,
  generate: basketweavePattern,
};
export default definition;
