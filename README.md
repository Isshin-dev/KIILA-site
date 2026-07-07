# KIILA-site

KIILA株式会社のコーポレートサイト。[Astro](https://astro.build) 製の静的サイトです。

- **トップ（LP）** … `/` — ブランドコンセプト（KIILA＝フィンランド語で「楔」）と2事業の紹介
- **MOKURI** … `/mokuri/` — カスタム木製タイルブランド。EC（オーダータイル設計ツール）への導線あり
- **GORDIX** … `/gordix/` — CNCルーター普及事業。ドキュメント一覧・教育機関向けプログラム・問い合わせフォーム（ダミー）

## ローカルでの動かし方

```bash
npm install     # 初回のみ
npm run dev     # 開発サーバー起動 → http://localhost:4321/KIILA-site/
npm run build   # 本番ビルド（dist/ に出力）
npm run preview # ビルド結果の確認
```

※ GitHub Pagesのサブパス（`/KIILA-site/`）付きで動く設定のため、開発サーバーでも URL に `/KIILA-site/` が付きます。

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

## デプロイ（GitHub Pages）

`main` ブランチへpushすると、GitHub Actions（`.github/workflows/deploy.yml`）が自動でビルドしてGitHub Pagesへデプロイします。

初回のみ以下の設定が必要です：

1. GitHubに `KIILA-site` という名前でリポジトリを作成してpush
2. リポジトリの **Settings → Pages → Source** を **「GitHub Actions」** に変更

公開URL: `https://isshin-dev.github.io/KIILA-site/`

## Xサーバー等へ移行する場合

1. `astro.config.mjs` の `site` を独自ドメインに変更し、`base: '/KIILA-site'` の行を削除
2. `npm run build` して `dist/` の中身をサーバーにアップロード

内部リンク・画像パスはすべて `src/lib/paths.ts` の `withBase()` 経由なので、設定変更だけで追従します。

## ECサイト（MOKURI）への導線について

MOKURIページには、稼働中のオーダータイル設計ツール（https://isshin-dev.github.io/woodtile_ec/）への導線を**2種類**実装しています：

1. **別タブで開くボタン**（「設計ツールを開く」）
2. **ページ内iframe埋め込み**

どちらかに絞る場合は、`src/pages/mokuri/index.astro` の該当ブロック（コメントで明示してあります）を削除してください。

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
