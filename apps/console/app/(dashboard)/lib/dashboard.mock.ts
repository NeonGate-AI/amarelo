import { agentOrbPalettes } from '@repo/react-web/ui/agent-orb/palettes'

export const dashboardMock = {
  user: {
    firstName: 'Alex',
    fullName: 'Alex Ribeiro',
    initials: 'AR'
  },
  navigation: [
    { label: 'Início', icon: 'home' },
    { label: 'Conversas', icon: 'conversations' },
    { label: 'Registros', icon: 'journal' },
    { label: 'Rede de apoio', icon: 'network' },
    { label: 'Privacidade', icon: 'privacy' }
  ],
  metrics: [
    {
      id: 'weekly-check-ins',
      icon: 'journal',
      label: 'Check-ins nesta semana',
      value: '5 de 7'
    },
    {
      id: 'active-shares',
      icon: 'share',
      label: 'Compartilhamentos ativos',
      value: '2'
    }
  ],
  agents: [
    {
      id: 'ana',
      name: 'Ana',
      context: 'Relações e comunicação',
      description:
        'Organiza situações intensas e ajuda a preparar conversas importantes.',
      colors: agentOrbPalettes.ana
    },
    {
      id: 'nico',
      name: 'Nico',
      context: 'Rotina e sobrecarga',
      description:
        'Ajuda a registrar mudanças, limites sensoriais e necessidades de rotina.',
      colors: agentOrbPalettes.nico
    },
    {
      id: 'isa',
      name: 'Isa',
      context: 'Ansiedade e autocuidado',
      description:
        'Reúne contexto de autorrelatos e ajuda a preparar perguntas para sua rede.',
      colors: agentOrbPalettes.isa
    }
  ],
  trend: {
    labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
    dayPerception: [3, 4, 3, 4, 4, 5, 4],
    perceivedAnxiety: [4, 3, 4, 2, 3, 2, 3]
  },
  activities: [
    {
      id: 'morning-check-in-2026-08-09',
      kind: 'check-in',
      title: 'Check-in da manhã',
      date: 'Hoje, 08:20',
      category: 'Autorrelato',
      visibility: 'Privado'
    },
    {
      id: 'routine-note-2026-08-08',
      kind: 'note',
      title: 'Nota sobre mudança de planos',
      date: 'Ontem, 19:45',
      category: 'Rotina',
      visibility: 'Privado'
    },
    {
      id: 'professional-summary-2026-08-07',
      kind: 'share',
      title: 'Resumo para profissional A.',
      date: '7 ago 2026',
      category: 'Compartilhamento',
      visibility: '7 dias restantes'
    },
    {
      id: 'conversation-ana-2026-08-06',
      kind: 'conversation',
      title: 'Conversa com Ana',
      date: '6 ago 2026',
      category: 'Relações',
      visibility: 'Privado'
    }
  ]
} as const
