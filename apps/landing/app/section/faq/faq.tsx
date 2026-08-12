import { FaqSearchable } from '@repo/react-web/vendors/smoothui'

const faqs = [
  {
    question: 'O Amarelo é terapia ou atendimento psicológico?',
    answer:
      'Não. O Amarelo organiza relatos, contexto e comunicação. Ele não diagnostica, prescreve, conduz tratamento nem substitui psicólogos, psiquiatras ou outros profissionais.'
  },
  {
    question: 'A IA entra em contato com minha família ou profissionais?',
    answer:
      'Não automaticamente. Um compartilhamento só acontece depois de uma ação explícita sua, com destinatário, conteúdo e duração definidos. A proposta é apoiar a conversa humana, não agir em seu lugar.'
  },
  {
    question: 'Meus registros ficam privados?',
    answer:
      'Privado é o estado inicial. A experiência foi desenhada para mostrar o que será compartilhado antes da confirmação e permitir revogação e consulta ao histórico de acesso.'
  },
  {
    question: 'Meu conteúdo será usado para treinar modelos?',
    answer:
      'Não por padrão. A política de produto do protótipo proíbe treinamento silencioso com conteúdo do usuário e exige uma decisão específica caso essa possibilidade seja avaliada no futuro.'
  },
  {
    question: 'Os agentes confirmam se eu tenho uma condição?',
    answer:
      'Não. Ana, Nico e Isa são identidades de interface em protótipo. Escolher um contexto não confirma diagnóstico, e qualquer inferência da IA deve aparecer separada do que você relatou.'
  },
  {
    question: 'Quem pode usar o MVP?',
    answer:
      'A primeira versão é planejada para pessoas com 18 anos ou mais. Uma experiência para menores exige validação jurídica, científica e de segurança própria.'
  },
  {
    question: 'O Amarelo funciona em uma situação de emergência?',
    answer:
      'O Amarelo não é um serviço de emergência nem prevê crises. Em risco imediato, procure o serviço de emergência da sua região ou uma pessoa de confiança agora.'
  }
]

export function FaqSection() {
  return (
    <div id="perguntas">
      <FaqSearchable
        description="Respostas diretas sobre agentes, privacidade, rede de apoio e os limites do protótipo."
        faqs={faqs}
        noResultsText="Nenhuma resposta encontrada. Tente buscar por privacidade, agentes ou rede."
        searchLabel="Buscar nas perguntas sobre o Amarelo"
        searchPlaceholder="Busque uma dúvida…"
        title="Perguntas importantes antes de começar"
      />
    </div>
  )
}
