import type { CustomTile, Point, Polyline } from '../types/tile';

/**
 * 手描き画像の自動ベクトル化。
 * グレースケール → 大津の二値化 → マーチングスクエア輪郭抽出
 * → Ramer–Douglas–Peucker 単純化 → 四辺の連続性チェック。
 * 結果は単位正方形 (0..1) に正規化したポリライン群。
 */
export function vectorizeImage(img: ImageData): CustomTile {
  const { width: w, height: h, data } = img;
  const warnings: string[] = [];

  // 1. グレースケール（透明部は白として合成）
  const gray = new Uint8Array(w * h);
  const hist = new Array<number>(256).fill(0);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const bl = data[i * 4 + 2];
    const a = data[i * 4 + 3] / 255;
    const lum = (0.299 * r + 0.587 * g + 0.114 * bl) * a + 255 * (1 - a);
    const v = Math.max(0, Math.min(255, Math.round(lum)));
    gray[i] = v;
    hist[v]++;
  }

  // 2. 二値化（大津の方法）
  const threshold = otsu(hist, w * h);
  const bin = new Uint8Array(w * h);
  let ink = 0;
  for (let i = 0; i < w * h; i++) {
    if (gray[i] <= threshold) {
      bin[i] = 1;
      ink++;
    }
  }
  if (ink === 0 || ink === w * h) {
    return {
      polylines: [],
      warnings: ['線が検出できませんでした。コントラストのはっきりした画像を使用してください。'],
    };
  }

  // 3. マーチングスクエアで輪郭抽出し、線分をつないでポリライン化
  const segs = marchingSquares(bin, w, h);
  const chains = chainSegments(segs);

  // 4. Ramer–Douglas–Peucker 単純化
  const eps = Math.max(w, h) / 200;
  const simplified: Polyline[] = [];
  for (const pl of chains) {
    if (pl.closed) {
      const pts = rdp([...pl.points, pl.points[0]], eps);
      pts.pop();
      if (pts.length >= 3) simplified.push({ points: pts, closed: true });
    } else {
      const pts = rdp(pl.points, eps);
      if (pts.length >= 2) simplified.push({ points: pts, closed: false });
    }
  }

  // 5. 単位正方形へ正規化
  const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
  const polylines: Polyline[] = simplified.map((pl) => ({
    closed: pl.closed,
    points: pl.points.map((p) => ({
      x: clamp01((p.x + 0.5) / w),
      y: clamp01((p.y + 0.5) / h),
    })),
  }));

  // 6. 四辺の連続性チェック（上下・左右の二値プロファイル比較）
  let mismatchTB = 0;
  for (let x = 0; x < w; x++) {
    if (bin[x] !== bin[(h - 1) * w + x]) mismatchTB++;
  }
  let mismatchLR = 0;
  for (let y = 0; y < h; y++) {
    if (bin[y * w] !== bin[y * w + w - 1]) mismatchLR++;
  }
  if (mismatchTB / w > 0.02) {
    warnings.push('上端と下端の絵柄が一致していません。縦に並べたとき継ぎ目が不連続になります。');
  }
  if (mismatchLR / h > 0.02) {
    warnings.push('左端と右端の絵柄が一致していません。横に並べたとき継ぎ目が不連続になります。');
  }
  if (polylines.length === 0) {
    warnings.push('輪郭を抽出できませんでした。');
  }

  return { polylines, warnings };
}

function otsu(hist: number[], total: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let max = 0;
  let threshold = 127;
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += i * hist[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > max) {
      max = between;
      threshold = i;
    }
  }
  return threshold;
}

type Seg = [number, number, number, number];

function marchingSquares(bin: Uint8Array, w: number, h: number): Seg[] {
  const v = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= w || y >= h ? 0 : bin[y * w + x];
  const segs: Seg[] = [];
  for (let y = -1; y < h; y++) {
    for (let x = -1; x < w; x++) {
      const c = (v(x, y) << 3) | (v(x + 1, y) << 2) | (v(x + 1, y + 1) << 1) | v(x, y + 1);
      if (c === 0 || c === 15) continue;
      const top: [number, number] = [x + 0.5, y];
      const right: [number, number] = [x + 1, y + 0.5];
      const bottom: [number, number] = [x + 0.5, y + 1];
      const left: [number, number] = [x, y + 0.5];
      const add = (p1: [number, number], p2: [number, number]): void => {
        segs.push([p1[0], p1[1], p2[0], p2[1]]);
      };
      switch (c) {
        case 1:
        case 14:
          add(left, bottom);
          break;
        case 2:
        case 13:
          add(bottom, right);
          break;
        case 3:
        case 12:
          add(left, right);
          break;
        case 4:
        case 11:
          add(top, right);
          break;
        case 5:
          add(top, right);
          add(left, bottom);
          break;
        case 6:
        case 9:
          add(top, bottom);
          break;
        case 7:
        case 8:
          add(left, top);
          break;
        case 10:
          add(left, top);
          add(bottom, right);
          break;
      }
    }
  }
  return segs;
}

function chainSegments(segs: Seg[]): Polyline[] {
  // 座標は 0.5 刻みなので 2 倍して整数キー化
  const key = (x: number, y: number): string => `${Math.round(x * 2)},${Math.round(y * 2)}`;
  const map = new Map<string, number[]>();
  const push = (k: string, i: number): void => {
    const list = map.get(k);
    if (list) list.push(i);
    else map.set(k, [i]);
  };
  segs.forEach((s, i) => {
    push(key(s[0], s[1]), i);
    push(key(s[2], s[3]), i);
  });
  const used = new Uint8Array(segs.length);
  const takeNext = (p: Point): Point | null => {
    const list = map.get(key(p.x, p.y));
    if (!list) return null;
    for (const j of list) {
      if (used[j]) continue;
      used[j] = 1;
      const s = segs[j];
      return key(s[0], s[1]) === key(p.x, p.y) ? { x: s[2], y: s[3] } : { x: s[0], y: s[1] };
    }
    return null;
  };
  const out: Polyline[] = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const pts: Point[] = [
      { x: segs[i][0], y: segs[i][1] },
      { x: segs[i][2], y: segs[i][3] },
    ];
    for (let p = takeNext(pts[pts.length - 1]); p; p = takeNext(pts[pts.length - 1])) {
      pts.push(p);
    }
    for (let p = takeNext(pts[0]); p; p = takeNext(pts[0])) {
      pts.unshift(p);
    }
    const closed =
      pts.length > 3 && key(pts[0].x, pts[0].y) === key(pts[pts.length - 1].x, pts[pts.length - 1].y);
    if (closed) pts.pop();
    out.push({ points: pts, closed });
  }
  return out;
}

function perpDist(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
}

function rdp(pts: Point[], eps: number): Point[] {
  if (pts.length <= 2) return [...pts];
  const a = pts[0];
  const b = pts[pts.length - 1];
  let maxD = -1;
  let maxI = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], a, b);
    if (d > maxD) {
      maxD = d;
      maxI = i;
    }
  }
  if (maxD <= eps) return [a, b];
  const left = rdp(pts.slice(0, maxI + 1), eps);
  const right = rdp(pts.slice(maxI), eps);
  return [...left.slice(0, -1), ...right];
}
