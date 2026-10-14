import { escapeHtml } from '@/lib/html'

const LANG_LABEL_JA: Record<string, string> = {
  en: '英語',
  zh: '中国語',
  ko: '韓国語',
}

/** 件名に改行や制御文字を持ち込ませない。 */
function sanitizeSubject(value: string): string {
  return value.replace(/[\r\n\t\u0000-\u001f\u007f]/g, ' ').trim()
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://tools.shingokumon.com'
}

export function buildDay0Email(args: {
  shopName: string
  menuProjectId: string
  selectedLanguages: string[]
  baseUrl?: string
}): { subject: string; html: string } {
  const { shopName, menuProjectId, selectedLanguages } = args
  const baseUrl = args.baseUrl ?? appUrl()

  const safeShopName = escapeHtml(shopName)
  const safeLangText = escapeHtml(
    selectedLanguages.map((lang) => LANG_LABEL_JA[lang] ?? lang).join('・')
  )
  // menuProjectId は Supabase 生成の uuid だが、URL に入るので念のため通す。
  const safeProjectId = encodeURIComponent(menuProjectId)

  return {
    subject: sanitizeSubject(`【完成】${shopName}様の多言語メニューが完成しました`),
    html: `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="background:#080808;color:#f0ece4;font-family:sans-serif;padding:40px 20px;max-width:600px;margin:0 auto;">
  <div style="border:1px solid rgba(201,168,76,0.15);padding:40px;">
    <div style="font-size:11px;letter-spacing:3px;color:rgba(201,168,76,0.5);margin-bottom:24px;">
      TOOLS.SHINGOKUMON.COM
    </div>
    <h1 style="font-size:20px;font-weight:300;color:#f0ece4;margin-bottom:12px;">
      ${safeShopName}様の多言語メニューが完成しました
    </h1>
    <p style="font-size:13px;color:rgba(240,236,228,0.5);line-height:1.9;margin-bottom:32px;">
      ご利用ありがとうございます。<br>
      ${safeLangText}に対応したメニューが完成しました。<br>
      後からメニューの編集・改善も可能です。
    </p>
    <div style="border:1px solid rgba(201,168,76,0.15);padding:20px;margin-bottom:32px;text-align:center;">
      <a href="${baseUrl}/menu/${safeProjectId}"
         style="display:inline-block;border:1px solid rgba(201,168,76,0.45);color:#c9a84c;padding:12px 32px;font-size:12px;letter-spacing:2px;text-decoration:none;">
        メニューを確認する
      </a>
    </div>
    <p style="font-size:11px;color:rgba(240,236,228,0.25);margin-top:40px;border-top:1px solid rgba(201,168,76,0.08);padding-top:20px;">
      このメールは tools.shingokumon.com からお送りしています。<br>
      配信停止をご希望の場合は <a href="${baseUrl}/unsubscribe?id=${safeProjectId}" style="color:rgba(201,168,76,0.4);">こちら</a>
    </p>
  </div>
</body>
</html>`,
  }
}
