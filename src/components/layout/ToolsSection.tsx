const subTools = [
  { tag: '2本目 · 準備中', title: 'Google口コミ返信AI', desc: '口コミをペーストするだけで返信文を生成。' },
  { tag: '3本目 · 準備中', title: 'Google集客診断', desc: 'Googleマップ上の改善点を即提示。' },
  { tag: '接客支援 · 準備中', title: '多言語接客フレーズ', desc: '予約・会計・注意事項を多言語で出力。' },
]

export default function ToolsSection() {
  return (
    <section id="tools" className="relative z-10 mx-auto max-w-6xl px-8 py-16 md:px-12 md:py-20">
      {/* セクションヘッド */}
      <div
        className="mb-3 flex items-center gap-3 text-[9px] tracking-[0.25em]"
        style={{ color: 'rgba(201,168,76,0.45)' }}
      >
        <span className="block h-px w-4" style={{ background: 'rgba(201,168,76,0.25)' }} />
        TOOLS
      </div>
      <h2
        className="mb-10 text-2xl font-light tracking-tight md:text-3xl"
        style={{ color: '#f0ece4' }}
      >
        お店の仕事を、AIが代わりにやります。
      </h2>

      {/* 看板ツール（大） */}
      <div
        className="mb-px grid grid-cols-1 md:grid-cols-2"
        style={{
          border: '1px solid rgba(201,168,76,0.08)',
          background: 'rgba(201,168,76,0.07)',
          gap: '1px',
        }}
      >
        <div className="p-10" style={{ background: '#0a0a0a' }}>
          <div
            className="mb-4 text-[8px] tracking-[0.2em]"
            style={{ color: 'rgba(201,168,76,0.4)' }}
          >
            看板ツール · 停止中
          </div>
          <h3
            className="mb-3 text-xl font-light leading-snug"
            style={{ color: '#f0ece4' }}
          >
            写真を撮るだけで
            <br />
            多言語メニューPDFが完成
          </h3>
          <p
            className="mb-7 text-sm leading-loose"
            style={{ color: 'rgba(240,236,228,0.4)' }}
          >
            日本語のメニュー表を写真でアップするだけ。AIが内容を読み取り、
            英語・中国語・韓国語のメニュー表を自動生成。印刷してそのまま使えます。
          </p>
          <div
            className="border px-6 py-3"
            style={{ borderColor: 'rgba(201,168,76,0.15)', background: 'rgba(201,168,76,0.03)' }}
          >
            <div className="mb-1 text-[10px] tracking-wider" style={{ color: 'rgba(201,168,76,0.5)' }}>
              停止中
            </div>
            <div className="text-[11px] leading-relaxed" style={{ color: 'rgba(240,236,228,0.3)' }}>
              バックエンドの Supabase プロジェクトを終了したため、このツールは利用できません。
              コードと設計は参照用に公開しています。
            </div>
          </div>
        </div>
        <div className="p-8" style={{ background: '#0a0a0a' }}>
          {/* サンプルプレビュー */}
          <div className="mb-2 text-[8px] tracking-widest" style={{ color: 'rgba(201,168,76,0.35)' }}>
            — 生成サンプル —
          </div>
          {[
            { ja: '唐揚げ', trans: 'Japanese Fried Chicken / 炸鸡块 / 가라아게', price: '¥780' },
            { ja: '刺身盛り合わせ', trans: 'Sashimi Platter / 刺身拼盘 / 모듬 사시미', price: '¥1,580' },
            { ja: '茶碗蒸し', trans: 'Steamed Egg Custard / 茶碗蒸 / 차완무시', price: '¥480' },
          ].map((item) => (
            <div key={item.ja}>
              <div
                className="flex justify-between border-b py-2 text-xs"
                style={{ borderColor: 'rgba(255,255,255,0.04)', color: 'rgba(240,236,228,0.75)' }}
              >
                <span>{item.ja}</span>
                <span style={{ color: '#c9a84c' }}>{item.price}</span>
              </div>
              <div className="py-1 text-[9px]" style={{ color: 'rgba(201,168,76,0.4)' }}>
                {item.trans}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* サブツール（小・3列） */}
      <div
        className="grid grid-cols-1 md:grid-cols-3"
        style={{
          border: '1px solid rgba(201,168,76,0.07)',
          background: 'rgba(201,168,76,0.07)',
          gap: '1px',
        }}
      >
        {subTools.map((tool) => (
          <div key={tool.title} className="p-7" style={{ background: '#0a0a0a' }}>
            <div
              className="mb-3 text-[8px] tracking-[0.15em]"
              style={{ color: 'rgba(201,168,76,0.3)' }}
            >
              {tool.tag}
            </div>
            <div
              className="mb-2 text-sm font-light leading-snug"
              style={{ color: '#f0ece4' }}
            >
              {tool.title}
            </div>
            <div className="text-xs leading-loose" style={{ color: 'rgba(240,236,228,0.3)' }}>
              {tool.desc}
            </div>
            <div
              className="mt-3 text-[8px] tracking-wider"
              style={{ color: 'rgba(201,168,76,0.2)' }}
            >
              COMING SOON
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
