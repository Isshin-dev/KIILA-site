export interface Point {
  x: number;
  y: number;
}

/** 溝の中心線。座標はすべて mm（パネル左上原点、y は下向き） */
export interface Polyline {
  points: Point[];
  closed: boolean;
}

/** パターン ID。プリセットの id（各パターンファイルで定義）または 'custom' */
export type PatternType = string;

/**
 * プリセットパターンの定義。
 * src/patterns/ に新しいファイルを作り、これを default export すると
 * 自動的にセレクタへ追加される（patterns/index.ts が一括読み込みする）。
 */
export interface PatternDefinition {
  /** 一意な ID（ファイル名と合わせる） */
  id: string;
  /** セレクタに表示するボタン名 */
  label: string;
  /** セレクタでの表示順（小さいほど先頭） */
  order: number;
  /** 溝中心線の生成関数（mm 単位、パネル矩形でクリップ済みを返す） */
  generate: (params: PatternParams) => Polyline[];
}

export interface PatternParams {
  /** パネル幅 mm */
  panelWidth: number;
  /** パネル高さ mm */
  panelHeight: number;
  /** タイル一辺 mm */
  tileSize: number;
  /** パターン回転角 deg */
  rotation: number;
  /** 目地（溝）幅 mm */
  groutWidth: number;
  /** タイル面の色（プレビュー用） */
  tileColor: string;
  /** 目地の色（プレビュー用） */
  groutColor: string;
}

/** 手描きタイル：単位正方形 (0..1) に正規化したポリライン群（旧方式・現在は未使用） */
export interface CustomTile {
  polylines: Polyline[];
  warnings: string[];
}

/**
 * 敷き詰め方式。
 * - translation: 平行移動コピーで敷き詰める（上辺=下辺、左辺=右辺）
 * - rotation180: 1 つおきに 180°回転したコピーで敷き詰める
 *   （各辺は自身の中点について点対称）
 */
export type TileSymmetry = 'translation' | 'rotation180';

/**
 * エディタで作るオリジナルタイル。座標は単位正方形 (0..1) 基準で、
 * 辺の変形ルールにより必ず隙間なく敷き詰められる形が保たれる。
 */
export interface EditableTile {
  symmetry: TileSymmetry;
  /**
   * 各辺の中間点（コーナーを除く）。
   * translation では top / left のみ使用（bottom / right は平行移動で導出）。
   * rotation180 では各辺の前半（コーナー→中点）のみ保持し、
   * 後半は中点について点対称に導出する。
   */
  top: Point[];
  right: Point[];
  bottom: Point[];
  left: Point[];
}
