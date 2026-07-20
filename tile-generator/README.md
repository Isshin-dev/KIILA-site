# オーダータイルデザイン (tile-designer)

合板パネルを CNC（ShopBot）で溝彫り加工するためのタイルパターン作成 Web アプリ。
React 18 + TypeScript + Vite + Tailwind CSS。バックエンドなし。

## 起動

```bash
npm install
npm run dev      # http://localhost:5174
npm run build    # 型チェック + 本番ビルド
```

## 機能

- プリセットパターン：レンガ / 正方形 / 六角形 / 円形 / トルコ八芒星 / ボロノイ
  - ボロノイはパネル寸法から導出した固定シードで決定的（同寸法なら常に同じ模様）
- パラメータ：パネル寸法・タイルサイズ・回転・目地幅・色（すべて mm 単位）
- オリジナルタイル：エディタで辺を直接変形して作成（エッシャー方式）
  - 辺をクリックで制御点を追加、ドラッグで変形、ダブルクリックで削除
  - 対になる辺が自動追従するため、どう変形しても隙間なく敷き詰められることが構造的に保証される
  - 敷き詰めモード：平行移動（上辺=下辺・左辺=右辺）／180°回転（各辺が中点対称、1 つおきに回転コピー）
  - 実装は `utils/editableTile.ts`（形状構築）と `components/TileEditor.tsx`（編集 UI）
  - 旧・手描き画像ベクトル化（`components/TileCreator.tsx` / `utils/vectorize.ts`）は UI から外したがコードは残置
- 部屋写真シミュレーション：写真上に矩形をドラッグしてパターンを平面合成（遠近補正なし）
- 書き出し：
  - SVG — 溝中心線のストロークパス、viewBox 1 単位 = 1mm
  - DXF — R12 ヘッダ（AC1009）、LWPOLYLINE、単位 mm、PANEL / GROOVES レイヤー
- 注文ボタンはプレースホルダー（「近日公開予定」モーダル）

G コード出力なし。CAM は工房側で行う前提。

## プリセットパターンの追加・更新

`src/patterns/` に 1 ファイル追加するだけで、セレクタに自動で表示されます
（`patterns/index.ts` が `import.meta.glob` でフォルダ内を一括登録）。
型・switch 文・セレクタの修正は不要です。

```ts
// src/patterns/myPattern.ts
import type { PatternDefinition, PatternParams, Polyline } from '../types/tile';
import { generateWithRotation } from '../utils/geometry';

function myPattern(params: PatternParams): Polyline[] {
  const s = Math.max(params.tileSize, 1);
  // generateWithRotation が回転とパネル矩形でのクリップを共通処理する。
  // コールバックには回転を考慮した十分広い範囲 b (Rect) が渡されるので、
  // その範囲を覆うように溝中心線（mm 単位）を生成して返せばよい。
  return generateWithRotation(params, (b) => {
    const lines: Polyline[] = [];
    for (let y = Math.floor(b.y / s) * s; y <= b.y + b.h; y += s) {
      lines.push({ points: [{ x: b.x, y }, { x: b.x + b.w, y }], closed: false });
    }
    return lines;
  });
}

const definition: PatternDefinition = {
  id: 'myPattern',   // 一意な ID（ファイル名と合わせる）
  label: 'マイ柄',    // セレクタに表示するボタン名
  order: 8,          // 表示順
  generate: myPattern,
};
export default definition;
```

補足:
- 共有エッジが重複する形状（多角形を並べる等）は `dedupeSegments` で重複除去すると二重彫りを防げる（hexagon.ts 参照）
- ランダム性を使う場合はパネル寸法から導出した固定シードで決定的にする（voronoi.ts 参照）
- 既存パターンの見た目を変えたいときは、該当ファイルの `generate` 関数や `label` / `order` を直接編集する
- ファイルを削除すればセレクタからも消える
