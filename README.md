# KIILA-site

KIILA株式会社のコーポレートサイト。[Astro](https://astro.build) 製の静的サイトです。

- **トップ（LP）** … `/` — ブランドコンセプト（KIILA＝フィンランド語で「楔」）と2事業の紹介
- **MOKURI** … `/mokuri/` — カスタム木製タイルブランド。EC（オーダータイル設計ツール）への導線あり
- **GORDIX** … `/gordix/` — CNCルーター普及事業。ドキュメント一覧・教育機関向けプログラム・問い合わせフォーム（ダミー）

## ローカルでの動かし方

```bash
npm install     # 初回のみ
npm run dev     # 開発サーバー起動 → http://localhost:4321/
npm run build   # 本番ビルド（dist/ に出力）
npm run preview # ビルド結果の確認
```

※ 本番と同じく、ローカルでもサイトはルートパス（`/`）で動作します。

## 画像の差し替え方法

画像は `public/images/` 配下に**固定ファイル名**で置いてあります。
**同じファイル名で上書きするだけ**で差し替えられます（コード変更不要。pushすれば自動で再ビルド・反映）。

| フォルダ | 用途 |
| --- | --- |
| `public/images/kiila/` | トップページ（hero-main / hero-sub / business-mokuri / business-gordix / news-01〜04） |
| `public/images/mokuri/` | MOKURIページ（hero / story / product-01〜06） |
| `public/images/gordix/` | GORDIXページ（hero / machine / education / case-01〜03） |

現在はすべてグラデーションのプレースホルダーPNGです。拡張子（.png）も同じにしてください。
※ 写真がJPEGの場合は、PNGに変換して上書きするか、コード側の参照（各 `.astro` ファイル内のファイル名）を `.jpg` に変更してください。

## GORDIXドキュメントの追加方法

`src/content/docs/` にMarkdownファイルを1つ追加するだけで、
GORDIXページの一覧と詳細ページ（`/gordix/docs/ファイル名/`）が自動生成されます。

```markdown
---
title: 記事タイトル
description: 一覧に表示される説明文
category: manual   # manual（マニュアル）/ case（導入事例）/ news（お知らせ）
date: 2026-07-01
---

本文をMarkdownで書く。見出しは ## から。
```

スキーマ定義は `src/content.config.ts` にあります（Astro v5の仕様で、設定ファイルは `src/content/config.ts` ではなく `src/` 直下に置きます）。

## Xserver へのデプロイ

このサイトは独自ドメインのルート（`https://example.com/`）で配信する設定です。GitHub Pages には依存しません。

1. ローカルで `npm ci && npm run build` を実行する（タイル生成アプリも自動でビルドされます）
2. `dist/` の中身を Xserver の対象ドメインの `public_html/` へアップロードする
3. `dist/tile-generator/api/order-config.example.php` を `order-config.php` に複製し、`recipient`（工房の受信先）と `from`（同一ドメインの送信元）を実在するメールアドレスへ変更する

公開後の主なURLは `/mokuri/` と `/tile-generator/` です。内部リンクと画像はURL変更後もルート基準で解決します。

## MOKURI タイル生成・見積もり依頼

タイル生成アプリはリポジトリ内の `tile-generator/` に同梱され、ビルド時に `/tile-generator/` としてKIILAサイト内へ出力されます。外部の GitHub Pages や iframe のクロスドメイン参照は使いません。

「データを送って見積もり依頼」では、入力条件と SVG・DXF の設計データを `tile-generator/api/tile-order.php` 経由で工房へメール送信します。PHPの送信先設定を必ず完了してから公開してください。

## 主な構成

```
src/
├── components/        # Header / Footer（共通パーツ）
├── layouts/           # BaseLayout（全ページ共通の枠組み）
├── lib/paths.ts       # base付きURL生成・日付フォーマット
├── styles/global.css  # 配色・タイポグラフィなどの共通スタイル
├── content.config.ts  # docsコレクションのスキーマ定義
├── content/docs/      # GORDIXドキュメント（Markdown追加で自動反映）
└── pages/             # 各ページ（index / mokuri / gordix / gordix/docs/[...slug]）
```

※ 会社住所・電話番号・お知らせ・仕様値などは差し替え前提のダミーです。
