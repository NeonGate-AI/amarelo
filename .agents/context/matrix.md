# Matrix do Amar.elo

## Finalidade

Este documento traduz para o repositório as decisões institucionais conhecidas da `@Matrix — Amar.elo`. Ele não substitui a Matrix e não transforma hipóteses em decisões.

Ordem de autoridade:

1. instrução explícita do trabalho atual;
2. decisão consolidada pela Matrix;
3. decisão da área responsável;
4. especificação deste repositório;
5. implementação atual;
6. inferência técnica documentada.

## Tese institucional

Existe uma distância entre:

- aquilo que uma pessoa vive;
- aquilo que consegue compreender e organizar;
- aquilo que consegue verbalizar;
- aquilo que comunica à família, aos amigos e aos profissionais;
- aquilo que sua rede de apoio consegue compreender.

O Amar.elo existe para ajudar a reduzir essa distância.

Princípio central:

> A IA não é a rede de apoio. Ela ajuda a rede de apoio humana a funcionar melhor.

## Decisões consolidadas

### Posicionamento

- A marca de produto é `Amarelo`; `Amar.elo` é o nome do workspace.
- O produto oferece contexto, organização, educação e apoio à comunicação.
- O produto não se apresenta como terapeuta, psicólogo, psiquiatra, diagnóstico, prescrição ou tratamento automatizado.
- Inspirações culturais não implicam autorização, parceria ou endosso.

### MVP

- Público inicial: pessoas adultas, com 18 anos ou mais.
- Menores de idade permanecem fora do MVP até validação jurídica, científica e de segurança específica.
- O MVP precisa aprender se conversa recorrente, memória longitudinal e compartilhamento controlado melhoram a comunicação percebida pelo usuário.
- Quantidade de features não é métrica de sucesso.

### Privacidade

- Privado por padrão.
- Compartilhamento explícito, granular, intencional, específico por destinatário e revogável.
- Permissão deve ser verificada antes de qualquer recuperação de contexto.
- Resumos, memórias, inferências e representações derivadas não herdam autorização mais ampla.
- Sem compartilhamento silencioso e sem treinamento com conteúdo do usuário por padrão.
- Proveniência, retenção, exportação, exclusão e histórico de acesso fazem parte do produto.

### Ciência e segurança

- Autorrelato, observação, dado clínico e inferência de IA são categorias distintas.
- Inferência de IA nunca deve aparecer silenciosamente como fato clínico.
- Claims devem ser classificados como sustentados, condicionais, experimentais, não sustentados, potencialmente danosos ou desconhecidos.
- Crise e risco exigem arquitetura própria de safety; o protótipo visual atual não simula previsão de crise.

### Marca e interface

- `#FAD715` é a âncora amarela.
- Amarelo é identidade, não tinta para preencher toda a interface.
- Neutros quentes sustentam light e dark mode.
- O arquivo Satoshi Variable existente no repositório é a fonte padrão desta implementação.
- Acessibilidade e contraste têm precedência sobre uso decorativo da marca.

## Hipóteses de produto

As proposições abaixo orientam o protótipo, mas ainda precisam de validação:

- `APP = conversa`.
- `WEB = contexto + controle`.
- Agentes especializados por contexto podem facilitar adoção e compreensão.
- Um seletor de agentes pode ajudar o usuário a escolher por necessidade, sem induzir autodiagnóstico.
- Uma visão semanal de autorrelatos pode ajudar reflexão, desde que não pareça score clínico.

## Decisões desta entrega pendentes de registro na Matrix

- Satoshi passa a ser a única família tipográfica aplicada na landing e no console.
- SmoothUI Siri Orb representa presença conversacional dos agentes.
- Três agentes fictícios — Ana, Jacira e Cleane — compõem o protótipo de escolha inicial.
- O Chart do shadcn, sobre Recharts, representa dados demonstrativos de check-ins no console.

Essas decisões são válidas para a implementação atual e não aprovam nomes, especialidades ou linguagem clínica para produção.

## Questões abertas

- Nome e definição final de cada agente.
- Condições e comorbidades presentes no primeiro release.
- Modelo operacional de participação de familiares e profissionais.
- Protocolo de safety para risco e crise.
- Validação jurídica da marca e do domínio `amarelo.health`.
- Métricas de ativação e retenção que não incentivem dependência da IA.
