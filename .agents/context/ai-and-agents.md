# Contexto de IA e Agentes

## Papel da IA

A IA ajuda a pessoa a:

- organizar narrativas;
- reconhecer lacunas de contexto;
- preparar uma conversa;
- produzir uma representação compartilhável;
- revisar e distinguir fatos, autorrelatos e inferências.

A IA não é família, amigo, profissional de saúde, diagnóstico ou autoridade clínica.

## Arquitetura conceitual

Um mesmo sistema pode atender pessoa e rede de apoio, mas:

- sessões e contextos devem permanecer isolados;
- autorização é aplicada antes de retrieval;
- conteúdo derivado não ganha visibilidade automaticamente;
- a resposta deve declarar quando usa memória ou inferência;
- acesso deve ser auditável.

## Agentes do protótipo

Os nomes abaixo são protótipos de UX:

| Agente | Contexto apresentado | Paleta | Status |
|---|---|---|---|
| Ana | relações, intensidade emocional e comunicação | amarelo/dourado | PROTÓTIPO |
| Jacira | rotina, sobrecarga e neurodivergência | menta/céu | PROTÓTIPO |
| Cleane | ansiedade, humor e autocuidado cotidiano | lilás/rosa | PROTÓTIPO |

O seletor não pergunta “qual transtorno você tem?”. Ele oferece contextos de conversa e permite trocar depois.

## Estados visuais

A Siri Orb pode expressar estados de interface:

- idle;
- listening;
- thinking;
- streaming;
- done;
- error.

No protótipo atual, as orbs permanecem predominantemente em `idle`. Movimento deve respeitar `prefers-reduced-motion`.

## Restrições

- Não imitar voz de profissional.
- Não declarar diagnóstico.
- Não prescrever medicamento ou conduta clínica.
- Não criar certeza a partir de correlação.
- Não incentivar dependência ou exclusividade emocional.
- Não contatar terceiros sem autorização e ação explícita.
