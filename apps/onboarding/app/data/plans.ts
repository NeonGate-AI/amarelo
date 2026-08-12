export type PlanId = 'continuidade' | 'essencial' | 'rede'

export interface PlanOption {
  description: string
  features: readonly string[]
  id: PlanId
  label: string
  price: string
  priceDetail: string
  recommended?: boolean
}

export const planOptions: readonly PlanOption[] = [
  {
    id: 'essencial',
    label: 'Essencial',
    price: 'R$ 0',
    priceDetail: 'para começar',
    description: 'Organize seu contexto com voz ou texto, no seu ritmo.',
    features: [
      'Conversas privadas por voz e texto',
      'Revisão antes de salvar ou compartilhar',
      'Contextos essenciais de apoio'
    ],
    recommended: true
  },
  {
    id: 'continuidade',
    label: 'Continuidade',
    price: 'Em breve',
    priceDetail: 'sem cobrança agora',
    description:
      'Mais histórico e sínteses para acompanhar mudanças ao longo do tempo.',
    features: [
      'Tudo do Essencial',
      'Histórico ampliado e revisável',
      'Sínteses entre consultas'
    ]
  },
  {
    id: 'rede',
    label: 'Rede',
    price: 'Em breve',
    priceDetail: 'sem cobrança agora',
    description: 'Compartilhe somente o que escolher com pessoas de confiança.',
    features: [
      'Tudo do Continuidade',
      'Permissões específicas e revogáveis',
      'Contextos separados para cada pessoa'
    ]
  }
]

export function isPlanId(value: string): value is PlanId {
  return planOptions.some((plan) => plan.id === value)
}
