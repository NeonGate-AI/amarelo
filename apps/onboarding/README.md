# Onboarding Amarelo

Aplicação Next.js independente para autenticação, cadastro B2C, verificação de
e-mail e onboarding por voz. O destino de produção previsto é
`onboarding.amarelo.health`; o console permanece em outro subdomínio.

## Fluxos

- `/sign-in`: login enxuto com tema herdado do cookie ou do sistema; após a
  autenticação, segue diretamente para o console.
- `/sign-up`: plano primeiro e credenciais depois; somente B2C e sem seletor de
  idioma. O tema pode ser alterado nesta tela.
- `/verify-email`: conclui a verificação exigida pelo WorkOS.
- `/onboarding`: quatro perguntas guiadas por voz, com ditado e alternativa por
  texto. Somente nome preferido, plano e conclusão são enviados ao perfil de
  identidade; as respostas sensíveis não são gravadas nos metadados do WorkOS.

## Desenvolvimento

Copie `.env.template` para `.env.local`, preencha as variáveis e execute:

```bash
pnpm onboarding
```

O app abre em `http://localhost:3002`. A porta 6000 é reservada pelo Next.js 16.

## WorkOS e subdomínios

Configure o redirect URI como `https://onboarding.amarelo.health/callback` e use
a mesma `WORKOS_COOKIE_PASSWORD` no onboarding e no console. Em produção,
defina `WORKOS_COOKIE_DOMAIN=.amarelo.health` para a sessão poder ser lida nos
dois subdomínios. O console também deve usar o proxy do AuthKit para renovar a
sessão.

## Voz

Com `OPENAI_API_KEY`, `/api/voice` usa `generateSpeech` do AI SDK e o modelo
configurado em `AI_VOICE_MODEL`. Sem chave ou quando o provedor falha, a
interface usa `SpeechSynthesis` pt-BR do navegador. O ditado usa
`SpeechRecognition` quando disponível e sempre mantém entrada por texto.

Modelos e voz são variáveis de ambiente para que a escolha possa mudar sem
alterar a interface. Nenhum segredo é exposto ao cliente.
