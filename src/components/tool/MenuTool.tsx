'use client'

import { useState } from 'react'
import StepBar from './StepBar'
import Step1Upload from './Step1Upload'
import Step2Edit from './Step2Edit'
import Step3Template from './Step3Template'
import Step3_5Language from './Step3_5Language'
import Step4Generate from './Step4Generate'
import Step5Result from './Step5Result'
import type { MenuContent } from '@/types/database'

export type ToolState = {
  step: number
  inputMode: 'image_ocr' | 'manual'
  rawImageBase64: string | null
  shopName: string
  industry: string
  industryOther: string
  templateId: string
  content: MenuContent
  generatedContent: MenuContent | null
  menuProjectId: string | null
  email: string
  selectedLanguages: string[]
}

const initialContent: MenuContent = { sections: [] }

export default function MenuTool() {
  const [state, setState] = useState<ToolState>({
    step: 1,
    inputMode: 'manual',
    rawImageBase64: null,
    shopName: '',
    industry: '',
    industryOther: '',
    templateId: 'gold',
    content: initialContent,
    generatedContent: null,
    menuProjectId: null,
    email: '',
    selectedLanguages: ['en'],
  })

  const update = (partial: Partial<ToolState>) =>
    setState((prev) => ({ ...prev, ...partial }))

  return (
    <div className="relative z-10 mx-auto max-w-4xl px-6 py-12 md:px-8">
      <div className="mb-8 text-center">
        <div className="mb-2 text-[9px] tracking-[0.25em]" style={{ color: 'rgba(201,168,76,0.45)' }}>
          多言語メニュー作成ツール
        </div>
        <h1 className="text-lg font-light" style={{ color: '#f0ece4' }}>
          5ステップで完成。すべて無料。
        </h1>
      </div>

      <StepBar currentStep={state.step} onStepClick={(s) => s < state.step && update({ step: s })} />

      <div className="border p-8 md:p-10" style={{ borderColor: 'rgba(201,168,76,0.08)', background: '#0a0a0a' }}>
        {state.step === 1 && <Step1Upload state={state} update={update} />}
        {state.step === 2 && <Step2Edit state={state} update={update} />}
        {state.step === 3 && <Step3Template state={state} update={update} />}
        {state.step === 4 && <Step3_5Language state={state} update={update} />}
        {state.step === 5 && <Step4Generate state={state} update={update} />}
        {state.step === 6 && <Step5Result state={state} />}
      </div>
    </div>
  )
}