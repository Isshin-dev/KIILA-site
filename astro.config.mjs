import { defineConfig } from 'astro/config';

// GitHub Pages: https://isshin-dev.github.io/KIILA-site/
// Xサーバー等のルートドメインへ移行する場合は site を独自ドメインに変更し、
// base を削除（または '/'）にして再ビルドする
export default defineConfig({
  site: 'https://isshin-dev.github.io',
  base: '/KIILA-site',
  markdown: {
    // 編集的なモノクロ基調に合わせ、コードブロックは明るいテーマで表示
    shikiConfig: { theme: 'github-light' },
  },
});
