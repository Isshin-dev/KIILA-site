import type { PatternParams, Polyline } from '../types/tile';

const fmt = (n: number): string => String(Math.round(n * 1000) / 1000);

/**
 * SVG 書き出し。溝の中心線のみのストロークパス。
 * viewBox の 1 単位 = 1mm。
 */
export function buildSVG(polylines: Polyline[], params: PatternParams): string {
  const { panelWidth: w, panelHeight: h, groutWidth } = params;
  const paths = polylines
    .map((pl) => {
      const d =
        pl.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${fmt(p.x)} ${fmt(p.y)}`).join(' ') +
        (pl.closed ? ' Z' : '');
      return `    <path d="${d}"/>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">
  <g id="panel" fill="none" stroke="#000000" stroke-width="1">
    <rect x="0" y="0" width="${w}" height="${h}"/>
  </g>
  <g id="grooves" fill="none" stroke="#000000" stroke-width="${groutWidth}" stroke-linecap="round" stroke-linejoin="round">
${paths}
  </g>
</svg>
`;
}

function dxfPolyline(pl: Polyline, layer: string, panelHeight: number): string {
  const lines: string[] = [
    '0',
    'LWPOLYLINE',
    '8',
    layer,
    '90',
    String(pl.points.length),
    '70',
    pl.closed ? '1' : '0',
  ];
  for (const p of pl.points) {
    // DXF は y 軸が上向きなので反転する
    lines.push('10', fmt(p.x), '20', fmt(panelHeight - p.y));
  }
  return lines.join('\n');
}

/**
 * DXF (R12) 書き出し。単位 mm、LWPOLYLINE エンティティ。
 * PANEL レイヤー：パネル外形、GROOVES レイヤー：溝の中心線。
 */
export function buildDXF(polylines: Polyline[], params: PatternParams): string {
  const { panelWidth: w, panelHeight: h } = params;
  const parts: string[] = [
    '0', 'SECTION', '2', 'HEADER',
    '9', '$ACADVER', '1', 'AC1009',
    '9', '$INSUNITS', '70', '4',
    '0', 'ENDSEC',
    '0', 'SECTION', '2', 'TABLES',
    '0', 'TABLE', '2', 'LAYER', '70', '2',
    '0', 'LAYER', '2', 'PANEL', '70', '0', '62', '7', '6', 'CONTINUOUS',
    '0', 'LAYER', '2', 'GROOVES', '70', '0', '62', '7', '6', 'CONTINUOUS',
    '0', 'ENDTAB',
    '0', 'ENDSEC',
    '0', 'SECTION', '2', 'ENTITIES',
  ];
  parts.push(
    dxfPolyline(
      {
        points: [
          { x: 0, y: 0 },
          { x: w, y: 0 },
          { x: w, y: h },
          { x: 0, y: h },
        ],
        closed: true,
      },
      'PANEL',
      h,
    ),
  );
  for (const pl of polylines) {
    parts.push(dxfPolyline(pl, 'GROOVES', h));
  }
  parts.push('0', 'ENDSEC', '0', 'EOF');
  return parts.join('\n') + '\n';
}

export function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
