import { createHash } from 'node:crypto'

/**
 * オブジェクトのキー順に依存しない正規形へ変換する。
 * JSON.stringify はキーの挿入順をそのまま出すため、
 * 同じ内容でもクライアント側の組み立て順で文字列が変わってしまう。
 */
export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize)
  }
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(source).sort()) {
      if (source[key] === undefined) continue
      result[key] = canonicalize(source[key])
    }
    return result
  }
  return value
}

/** 同じ入力なら同じ値になる 64 文字の16進ハッシュ。 */
export function fingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex')
}
