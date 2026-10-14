/** 必要な環境変数が設定されていない。呼び出し側は 503 を返す。 */
export class MissingApiKeyError extends Error {
  constructor(public readonly envName: string) {
    super(`${envName} is not configured`)
    this.name = 'MissingApiKeyError'
  }
}
