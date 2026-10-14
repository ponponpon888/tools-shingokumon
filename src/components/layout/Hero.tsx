export default function Hero() {
  return (
    <section className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-8 py-16 md:grid-cols-2 md:gap-16 md:px-12 md:py-20">
      {/* 左：コピー */}
      <div>
        {/* eyebrow */}
        <div
          className="mb-5 flex items-center gap-3 text-[10px] tracking-[0.2em]"
          style={{ color: 'rgba(201,168,76,0.6)' }}
        >
          <span className="block h-px w-5" style={{ background: 'rgba(201,168,76,0.3)' }} />
          サービス業のための無料AIツール
        </div>

        {/* H1 */}
        <h1
          className="mb-3 text-3xl font-light leading-snug tracking-tight md:text-4xl"
          style={{ color: '#f0ece4' }}
        >
          外国人のお客様に、
          <br />
          <span style={{ color: '#c9a84c' }}>そのまま見せられる。</span>
        </h1>
        <p
          className="mb-6 text-base font-light leading-relaxed tracking-wide"
          style={{ color: 'rgba(201,168,76,0.75)' }}
        >
          多言語メニューPDFを、無料で作成。
        </p>
        <p
          className="mb-10 max-w-md text-sm leading-loose"
          style={{ color: 'rgba(240,236,228,0.45)' }}
        >
          日本語のメニューを入れるだけで、英語・中国語・韓国語のメニュー表が完成。
          印刷してそのまま使えます。翻訳会社もデザイナーも不要。
        </p>

        {/* 停止中の案内（旧 CTA の位置） */}
        <div
          className="inline-block border px-8 py-4"
          style={{ borderColor: 'rgba(201,168,76,0.2)', background: 'rgba(201,168,76,0.03)' }}
        >
          <div
            className="mb-1 text-[10px] tracking-[0.2em]"
            style={{ color: 'rgba(201,168,76,0.55)' }}
          >
            このツールは停止中です
          </div>
          <div className="text-[11px] leading-relaxed" style={{ color: 'rgba(240,236,228,0.35)' }}>
            バックエンドの Supabase プロジェクトを終了したため、新しいメニューは作成できません。
          </div>
        </div>
      </div>

      {/* 右：プレビューカード */}
      <div className="relative">
        {/* コーナーマーク */}
        {['tl', 'tr', 'bl', 'br'].map((pos) => (
          <span
            key={pos}
            className={`absolute h-3 w-3 ${pos === 'tl' ? '-left-px -top-px border-l border-t' : ''} ${pos === 'tr' ? '-right-px -top-px border-r border-t' : ''} ${pos === 'bl' ? '-bottom-px -left-px border-b border-l' : ''} ${pos === 'br' ? '-bottom-px -right-px border-b border-r' : ''}`}
            style={{ borderColor: 'rgba(201,168,76,0.4)' }}
          />
        ))}

        <div
          className="border p-1"
          style={{ borderColor: 'rgba(201,168,76,0.12)', background: 'rgba(201,168,76,0.02)' }}
        >
          <div className="p-6" style={{ background: '#0f0f0f' }}>
            {/* 店名 */}
            <div
              className="mb-1 text-sm font-light tracking-[0.2em]"
              style={{ color: '#f0ece4' }}
            >
              山 田 屋
            </div>
            <div
              className="mb-5 border-b pb-3 text-[9px] tracking-widest"
              style={{
                color: 'rgba(201,168,76,0.4)',
                borderColor: 'rgba(201,168,76,0.08)',
              }}
            >
              YAMADAYA · MENU
            </div>

            {/* セクション */}
            <div
              className="mb-2 text-[8px] tracking-widest"
              style={{ color: 'rgba(201,168,76,0.35)' }}
            >
              — SASHIMI —
            </div>
            {[
              { ja: 'まぐろ刺身', trans: 'Tuna Sashimi / 金枪鱼刺身 / 참치회', price: '¥1,280' },
              { ja: 'サーモン', trans: 'Salmon / 三文鱼 / 연어', price: '¥980' },
            ].map((item) => (
              <div key={item.ja} className="mb-2">
                <div
                  className="flex justify-between border-b py-1 text-[11px]"
                  style={{
                    borderColor: 'rgba(255,255,255,0.04)',
                    color: 'rgba(240,236,228,0.75)',
                  }}
                >
                  <span>{item.ja}</span>
                  <span style={{ color: '#c9a84c' }}>{item.price}</span>
                </div>
                <div className="py-1 text-[9px]" style={{ color: 'rgba(240,236,228,0.25)' }}>
                  {item.trans}
                </div>
              </div>
            ))}

            <div
              className="mb-2 mt-3 text-[8px] tracking-widest"
              style={{ color: 'rgba(201,168,76,0.35)' }}
            >
              — DRINKS —
            </div>
            {[
              { ja: '生ビール', trans: 'Draft Beer / 生啤酒 / 생맥주', price: '¥650' },
              { ja: 'ハイボール', trans: 'Highball / 威士忌苏打 / 하이볼', price: '¥550' },
            ].map((item) => (
              <div key={item.ja} className="mb-2">
                <div
                  className="flex justify-between border-b py-1 text-[11px]"
                  style={{
                    borderColor: 'rgba(255,255,255,0.04)',
                    color: 'rgba(240,236,228,0.75)',
                  }}
                >
                  <span>{item.ja}</span>
                  <span style={{ color: '#c9a84c' }}>{item.price}</span>
                </div>
                <div className="py-1 text-[9px]" style={{ color: 'rgba(240,236,228,0.25)' }}>
                  {item.trans}
                </div>
              </div>
            ))}

            {/* 言語タグ */}
            <div
              className="mt-4 flex gap-2 border-t pt-3"
              style={{ borderColor: 'rgba(201,168,76,0.07)' }}
            >
              {['EN', '中文', '한국어'].map((lang) => (
                <span
                  key={lang}
                  className="border px-2 py-1 text-[8px] tracking-wider"
                  style={{
                    borderColor: 'rgba(201,168,76,0.15)',
                    color: 'rgba(201,168,76,0.5)',
                  }}
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
