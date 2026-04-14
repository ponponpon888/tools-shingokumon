import dynamic from 'next/dynamic'
import Nav from '@/components/layout/Nav'
import GeoBg from '@/components/ui/GeoBg'

const MenuTool = dynamic(() => import('@/components/tool/MenuTool'), { ssr: false })

export default function MenuToolPage() {
  return (
    <main className="relative overflow-hidden min-h-screen">
      <GeoBg />
      <Nav />
      <MenuTool />
    </main>
  )
}