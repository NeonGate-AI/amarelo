# ADR-002: Manter a CLI legada fora da migração Amar.elo

- **Status:** Aceito nesta entrega
- **Data:** 2026-08-09

## Contexto

A CLI será tratada separadamente e pode vir a ser publicada como pacote npm. Ela contém nomes, comandos e contratos associados à SIM.

## Decisão

Não modificar `cli/` durante a migração de landing, console e documentação institucional.

Também preservar o script raiz `pnpm sim` enquanto ele for o entrypoint da CLI.

## Alternativas consideradas

### Rebrandear a CLI agora

Rejeitada. Mistura dois trabalhos, amplia o diff e pode quebrar distribuição futura.

### Apagar a CLI

Rejeitada. O código possui valor independente e a exclusão não foi autorizada.

## Consequências

- Referências a SIM dentro de `cli/` são exceção deliberada.
- Auditorias de referências residuais devem excluir esse diretório.
- A migração da CLI exigirá ADR e escopo próprios.
