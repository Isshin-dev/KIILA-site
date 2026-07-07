// base（GitHub Pagesのサブパス）を含めた内部リンク・画像パスを組み立てる。
// Xサーバー移行時に base を変えてもコード側の修正が不要になる。
const raw = import.meta.env.BASE_URL;
export const base = raw.endsWith('/') ? raw.slice(0, -1) : raw;

export function withBase(path: string): string {
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}
