interface FooterLink {
  href: string
  label: string
}

interface FooterNavProps {
  label: string
  links: FooterLink[]
}

export interface FooterProps {
  copyright?: string
}

const productLinks: FooterLink[] = [
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#produto', label: 'Produto' },
  { href: '#contextos', label: 'Contextos' }
]

const trustLinks: FooterLink[] = [
  { href: '#privacidade', label: 'Privacidade' },
  { href: '#limites', label: 'Limites' },
  { href: '#perguntas', label: 'Perguntas' }
]

export function Footer(props: FooterProps) {
  const { copyright = '© 2026 Amarelo.' } = props

  return (
    <footer className="bg-[var(--elo-neutral-950)] text-[var(--elo-neutral-50)]">
      <div className="mx-auto grid w-full max-w-[75rem] gap-10 px-4 py-12 sm:px-8 md:grid-cols-[1fr_auto_auto]">
        <div className="max-w-sm">
          <a
            aria-label="Amarelo, voltar ao início"
            className="inline-flex min-h-11 items-center font-heading font-bold text-2xl tracking-[-0.055em] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[var(--elo-yellow-500)]"
            href="#inicio"
          >
            Amarelo<span className="text-[var(--elo-yellow-500)]">.</span>
          </a>
          <p className="mt-3 text-sm leading-6 text-[var(--elo-neutral-400)]">
            Contexto para conversas que importam. A IA é a ponte; a rede de
            apoio continua humana.
          </p>
        </div>

        <FooterNav label="Produto" links={productLinks} />
        <FooterNav label="Confiança" links={trustLinks} />
      </div>
      <div className="border-[var(--elo-neutral-800)] border-t">
        <div className="mx-auto flex min-h-16 w-full max-w-[75rem] flex-col justify-center gap-2 px-4 py-4 text-xs text-[var(--elo-neutral-500)] sm:px-8 md:flex-row md:items-center md:justify-between">
          <p className="m-0">{copyright}</p>
          <p className="m-0">18+ · Não é terapia ou serviço de emergência.</p>
        </div>
      </div>
    </footer>
  )
}

function FooterNav(props: FooterNavProps) {
  const { label, links } = props

  return (
    <nav aria-label={label}>
      <p className="mb-3 font-semibold text-sm text-[var(--elo-neutral-300)]">
        {label}
      </p>
      <ul className="m-0 grid list-none gap-1 p-0">
        {links.map((link) => (
          <li key={link.href}>
            <a
              className="inline-flex min-h-9 items-center text-sm text-[var(--elo-neutral-400)] underline-offset-4 hover:text-[var(--elo-neutral-50)] hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--elo-yellow-500)]"
              href={link.href}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
