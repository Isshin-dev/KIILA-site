import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// GORDIXドキュメント／ノウハウのコレクション。
// src/content/docs/ にMarkdownファイルを追加するだけで
// 一覧ページ・詳細ページが自動的に生成される。
const docs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // manual: マニュアル / case: 導入事例 / news: お知らせ
    category: z.enum(['manual', 'case', 'news']).default('manual'),
    date: z.coerce.date(),
  }),
});

export const collections = { docs };
