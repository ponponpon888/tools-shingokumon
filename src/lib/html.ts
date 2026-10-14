/**
 * ユーザー入力をHTMLに差し込む前のエスケープ。
 * テキストノード・属性値のどちらに入れても安全になるよう、
 * シングルクォートとダブルクォートも変換する。
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
