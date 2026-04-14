import Nav from '@/components/layout/Nav'
import Hero from '@/components/layout/Hero'
import TrustBar from '@/components/layout/TrustBar'
import ToolsSection from '@/components/layout/ToolsSection'
import Footer from '@/components/layout/Footer'
import GeoBg from '@/components/ui/GeoBg'

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <GeoBg />
      <Nav />
      <Hero />
      <TrustBar />
      <ToolsSection />
      <Footer />
    </main>
  )
}
