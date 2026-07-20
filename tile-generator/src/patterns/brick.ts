import type { PatternDefinition, PatternParams, Polyline } from '../types/tile';
import { generateWithRotation } from '../utils/geometry';

/** レンガ張り：幅 tileSize × 高さ tileSize/2、半枚ずらし */
function brickPattern(params: PatternParams): Polyline[] {
  const bw = Math.max(params.tileSize, 1);
  const bh = bw / 2;
  return generateWithRotation(params, (b) => {
    const lines: Polyline[] = [];
    const y0 = Math.floor(b.y / bh) * bh;
    for (let y = y0; y <= b.y + b.h; y += bh) {
      lines.push({ points: [{ x: b.x, y }, { x: b.x + b.w, y }], closed: false });
    }
    let row = Math.round(y0 / bh);
    for (let y = y0; y < b.y + b.h; y += bh, row++) {
      const offset = (((row % 2) + 2) % 2) * (bw / 2);
      const x0 = Math.floor((b.x - offset) / bw) * bw + offset;
      for (let x = x0; x <= b.x + b.w; x += bw) {
        lines.push({ points: [{ x, y }, { x, y: y + bh }], closed: false });
      }
    }
    return lines;
  });
}

const definition: PatternDefinition = {
  id: 'brick',
  label: 'レンガ',
  order: 1,
  generate: brickPattern,
};
export default definition;
