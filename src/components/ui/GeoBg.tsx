export default function GeoBg() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 0 }}
      viewBox="0 0 1100 900"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line x1="0" y1="900" x2="900" y2="0" stroke="#c9a84c" strokeWidth="0.5" opacity="0.06" />
      <line x1="100" y1="900" x2="1000" y2="0" stroke="#c9a84c" strokeWidth="0.4" opacity="0.04" />
      <line x1="200" y1="900" x2="1100" y2="0" stroke="#c9a84c" strokeWidth="0.4" opacity="0.03" />
      <line x1="0" y1="600" x2="600" y2="0" stroke="#c9a84c" strokeWidth="0.4" opacity="0.03" />
      <polygon points="820,60 880,160 760,160" fill="none" stroke="#c9a84c" strokeWidth="0.6" opacity="0.09" />
      <polygon points="840,80 870,135 810,135" fill="none" stroke="#c9a84c" strokeWidth="0.3" opacity="0.05" />
      <rect
        x="790" y="50" width="100" height="100"
        fill="none" stroke="#c9a84c" strokeWidth="0.3" opacity="0.04"
        transform="rotate(15 840 100)"
      />
      <polygon points="80,700 130,780 30,780" fill="none" stroke="#c9a84c" strokeWidth="0.5" opacity="0.06" />
      <circle cx="550" cy="450" r="280" fill="none" stroke="#c9a84c" strokeWidth="0.3" opacity="0.025" />
      <circle cx="550" cy="450" r="380" fill="none" stroke="#c9a84c" strokeWidth="0.2" opacity="0.015" />
      <line x1="0" y1="450" x2="1100" y2="450" stroke="#c9a84c" strokeWidth="0.2" opacity="0.025" />
      <line x1="550" y1="0" x2="550" y2="900" stroke="#c9a84c" strokeWidth="0.2" opacity="0.025" />
    </svg>
  )
}
