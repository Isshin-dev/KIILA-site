import type { PatternDefinition, PatternParams, Point, Polyline } from '../types/tile';
import { dedupeSegments, generateWithRotation } from '../utils/geometry';

/** 六角形タイル（とがり頂点が上、対辺距離 = tileSize） */
function hexagonPattern(params: PatternParams): Polyline[] {
  const w = Math.max(params.tileSize, 1);
  const R = w / Math.sqrt(3);
  return generateWithRotation(params, (b) => {
    const segs: [Point, Point][] = [];
    const rowH = 1.5 * R;
    const row0 = Math.floor(b.y / rowH) - 1;
    const row1 = Math.ceil((b.y + b.h) / rowH) + 1;
    for (let row = row0; row <= row1; row++) {
      const cy = row * rowH;
      const offset = (((row % 2) + 2) % 2) * (w / 2);
      const col0 = Math.floor((b.x - offset) / w) - 1;
      const col1 = Math.ceil((b.x + b.w - offset) / w) + 1;
      for (let col = col0; col <= col1; col++) {
        const cx = col * w + offset;
        const verts: Point[] = [];
        for (let k = 0; k < 6; k++) {
          const ang = Math.PI / 2 + (k * Math.PI) / 3;
          verts.push({ x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang) });
        }
        for (let k = 0; k < 6; k++) {
          segs.push([verts[k], verts[(k + 1) % 6]]);
        }
      }
    }
    return dedupeSegments(segs);
  });
}

const definition: PatternDefinition = {
  id: 'hexagon',
  label: '六角形',
  order: 3,
  generate: hexagonPattern,
};
export default definition;
