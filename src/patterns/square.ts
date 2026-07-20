import type { PatternDefinition, PatternParams, Polyline } from '../types/tile';
import { generateWithRotation } from '../utils/geometry';

/** 正方形グリッド */
function squarePattern(params: PatternParams): Polyline[] {
  const s = Math.max(params.tileSize, 1);
  return generateWithRotation(params, (b) => {
    const lines: Polyline[] = [];
    for (let x = Math.floor(b.x / s) * s; x <= b.x + b.w; x += s) {
      lines.push({ points: [{ x, y: b.y }, { x, y: b.y + b.h }], closed: false });
    }
    for (let y = Math.floor(b.y / s) * s; y <= b.y + b.h; y += s) {
      lines.push({ points: [{ x: b.x, y }, { x: b.x + b.w, y }], closed: false });
    }
    return lines;
  });
}

const definition: PatternDefinition = {
  id: 'square',
  label: '正方形',
  order: 2,
  generate: squarePattern,
};
export default definition;
