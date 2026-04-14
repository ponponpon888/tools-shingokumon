const items = [
  { num: '13年', label: 'ホテル支配人経験' },
  { num: '3言語', label: '英・中・韓 対応' },
  { num: '1分', label: 'PDF完成' },
  { num: '無料', label: '完全無料で使える' },
]

export default function TrustBar() {
  return (
    <div
      className="relative z-10 grid grid-cols-2 md:grid-cols-4"
      style={{
        borderTop: '1px solid rgba(201,168,76,0.08)',
        borderBottom: '1px solid rgba(201,168,76,0.08)',
        background: 'rgba(0,0,0,0.3)',
      }}
    >
      {items.map((item, i) => (
        <div
          key={item.label}
          className="px-6 py-5 md:px-8"
          style={{
            borderRight:
              i % 2 === 1 || i === items.length - 1
                ? 'none'
                : '1px solid rgba(201,168,76,0.07)',
            borderTop:
              i >= 2 ? '1px solid rgba(201,168,76,0.07)' : 'none',
          }}
        >
          <span
            className="block text-xl font-light tracking-wide"
            style={{ color: '#c9a84c' }}
          >
            {item.num}
          </span>
          <span className="mt-1 block text-[10px] tracking-wide" style={{ color: 'rgba(240,236,228,0.3)' }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}
