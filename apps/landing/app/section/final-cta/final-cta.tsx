import { InterestForm } from './interest-form'

const commitments = [
  'Sem promessa clínica',
  'Sem inclusão automática',
  'Você pode sair quando quiser'
]

export function FinalCtaSection() {
  return (
    <section
      aria-labelledby="final-cta-title"
      className="relative overflow-hidden bg-primary py-24 text-primary-foreground sm:py-32"
      id="participar"
    >
      <div
        aria-hidden="true"
        className="absolute top-1/2 -right-100 size-180 -translate-y-1/2 rounded-full border border-primary-foreground/15 before:absolute before:inset-[12%] before:rounded-full before:border before:border-inherit before:content-[''] after:absolute after:inset-[26%] after:rounded-full after:border after:border-inherit after:content-['']"
      />
      <div className="relative z-1 mx-auto grid w-full max-w-300 items-center gap-12 px-4 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-20">
        <div className="max-w-2xl">
          <p className="text-[0.7rem] font-bold tracking-[0.16em] text-primary-foreground/65 uppercase">
            Pesquisa de interesse · 18+
          </p>
          <h2
            className="mt-4 font-heading text-[clamp(2.65rem,6.5vw,5.2rem)] leading-[0.96] font-semibold tracking-[-0.06em] text-balance"
            id="final-cta-title"
          >
            Ajude a construir uma ponte que respeite seu ritmo.
          </h2>
          <p className="mt-6 max-w-[56ch] text-base leading-7 text-primary-foreground/75">
            Estamos validando a primeira experiência do Amarelo com pessoas
            adultas. Conte como gostaria de participar — sem relatar condição,
            diagnóstico ou qualquer detalhe sensível.
          </p>
          <ul className="mt-7 flex list-none flex-wrap gap-2 p-0">
            {commitments.map((commitment) => (
              <li
                className="rounded-full border border-primary-foreground/20 bg-white/25 px-3 py-2 text-xs font-semibold"
                key={commitment}
              >
                {commitment}
              </li>
            ))}
          </ul>
        </div>
        <InterestForm />
      </div>
    </section>
  )
}
