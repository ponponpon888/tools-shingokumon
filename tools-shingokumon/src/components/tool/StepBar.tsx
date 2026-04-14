const steps = [
  { num: '01', label: 'アップロード' },
  { num: '02', label: '確認・編集' },
  { num: '03', label: 'デザイン' },
  { num: '04', label: 'メール受取' },
  { num: '05', label: '完成' },
]

type Props = {
  currentStep: number
  onStepClick: (step: number) => void
}

export default function StepBar({ currentStep, onStepClick }: Props) {
  return (
    <div
      className="mb-6 grid grid-cols-5 gap-px"
      style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.07)' }}
    >
      {steps.map((s, i) => {
        const stepNum = i + 1
        const isActive = stepNum === currentStep
        const isDone = stepNum < currentStep
        const isClickable = isDone

        return (
          <button
            key={s.num}
            onClick={() => isClickable && onStepClick(stepNum)}
            className="flex flex-col items-center px-2 py-4 text-center transition-colors md:py-5"
            style={{
              background: isActive ? '#0f0d08' : '#0a0a0a',
              cursor: isClickable ? 'pointer' : 'default',
            }}
          >
            <div
              className="mb-2 text-[8px] tracking-[0.15em]"
              style={{ color: isActive ? 'rgba(201,168,76,0.6)' : 'rgba(201,168,76,0.25)' }}
            >
              {s.num}
            </div>
            <div
              className="mb-3 flex h-7 w-7 items-center justify-center border"
              style={{
                borderColor: isActive ? 'rgba(201,168,76,0.45)' : 'rgba(201,168,76,0.1)',
                background: isActive ? 'rgba(201,168,76,0.04)' : 'transparent',
              }}
            >
              {isDone ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5l2.5 2.5 5-5" stroke="#c9a84c" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <div
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: isActive ? '#c9a84c' : 'rgba(201,168,76,0.2)' }}
                />
              )}
            </div>
            <div
              className="hidden text-[10px] font-light leading-tight md:block"
              style={{ color: isActive ? '#f0ece4' : 'rgba(240,236,228,0.35)' }}
            >
              {s.label}
            </div>
          </button>
        )
      })}
    </div>
  )
}
