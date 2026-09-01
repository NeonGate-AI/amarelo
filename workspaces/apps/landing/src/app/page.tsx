import { FaqSection } from '@section/faq'
import { Footer } from '@section/footer'
import { HeroSection } from '@section/hero'
import { ProductStorySection } from '@section/product-story'

export default function LandingPage() {
  return (
    <>
      <a className="skip-link" href="#conteudo-principal">
        Pular para o conteúdo
      </a>
      <main id="conteudo-principal">
        <HeroSection />
        <ProductStorySection />
        <FaqSection />
      </main>
      <Footer />
    </>
  )
}
