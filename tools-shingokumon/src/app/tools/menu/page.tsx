import MenuTool from '@/components/tool/MenuTool'
import Nav from '@/components/layout/Nav'
import GeoBg from '@/components/ui/GeoBg'

export default function MenuToolPage() {
  return (
    <main className="relative overflow-hidden min-h-screen">
      <GeoBg />
      <Nav />
      <MenuTool />
    </main>
  )
}
