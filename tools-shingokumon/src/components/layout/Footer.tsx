export default function Footer() {
  return (
    <footer
      className="relative z-10 flex flex-col items-center justify-between gap-4 px-8 py-6 md:flex-row md:px-12"
      style={{ borderTop: '1px solid rgba(201,168,76,0.07)' }}
    >
      <span className="text-[10px] tracking-wide" style={{ color: 'rgba(240,236,228,0.18)' }}>
        © SHINGO KUMON · TOOLS.SHINGOKUMON.COM
      </span>
      <div className="flex flex-col items-center gap-3 md:flex-row md:gap-6">
        <a
          href="https://shingokumon.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs"
          style={{ color: 'rgba(201,168,76,0.38)' }}
        >
          LP制作・AI実装はこちら
          <span style={{ color: 'rgba(201,168,76,0.55)' }}>→</span>
        </a>
        <a
          href="https://shingokumon.com/musubu"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs"
          style={{ color: 'rgba(201,168,76,0.38)' }}
        >
          MUSUBUのデモを見る
          <span style={{ color: 'rgba(201,168,76,0.55)' }}>→</span>
        </a>
      </div>
    </footer>
  )
}
