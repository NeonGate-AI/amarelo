import { FaqSection } from '@section/faq/faq'
import { Footer } from '@section/footer/footer'
import { HeroSection } from '@section/hero/hero'
import { ProductStorySection } from '@section/product-story/product-story'

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
