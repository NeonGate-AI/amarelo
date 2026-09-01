export type EloId = 'ana' | 'isa' | 'nico'

export interface EloOption {
  description: string
  id: EloId
  keywords: readonly string[]
  label: string
}

export const eloOptions: readonly EloOption[] = [
  {
    id: 'ana',
    label: 'Ana',
    description: 'Sobrecarga, rotina, emoções e limites.',
    keywords: ['ana', 'rotina', 'sobrecarga', 'limites']
  },
  {
    id: 'nico',
    label: 'Nico',
    description: 'Ansiedade, isolamento e sobrecarga emocional.',
    keywords: ['nico', 'ansiedade', 'isolamento', 'emocional']
  },
  {
    id: 'isa',
    label: 'Isa',
    description: 'Relacionamentos, autoestima e autocuidado.',
    keywords: ['isa', 'relacionamentos', 'autoestima', 'autocuidado']
  }
]

export function isEloId(value: string): value is EloId {
  return eloOptions.some((elo) => elo.id === value)
}
