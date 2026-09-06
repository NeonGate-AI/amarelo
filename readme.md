<p align="center">
  <img src="./assets/images/amarelo-banner.png" alt="Amarelo. AI Voice Engineering. Powering mental health support." width="720">
</p>

<p align="center">
  <strong>AI for human connection in mental health.</strong>
</p>

<p align="center">
  <a href="https://amarelo.life">Website</a> ·
  <a href="#the-product">The product</a> ·
  <a href="#continuity">Continuity</a> ·
  <a href="#try-the-preview">Try the preview</a>
</p>

## The product

Amarelo is a voice-first mental health support product in development. It is designed to help people talk about everyday experiences, carry meaningful memories forward and strengthen their connection with the people who support them.

A difficult week, a change in routine or something that helped yesterday can matter again tomorrow. Amarelo's ambition is to make conversations feel less like starting over and more like being understood over time.

The person stays at the center. AI supports expression and reflection; human connection remains essential.

### The experience we are building

| Experience | Value for the person |
| --- | --- |
| **Talk naturally** | A voice-centered experience with readable captions, accessible controls and an installable app. |
| **Carry memories forward** | Continuity between conversations, without needing to repeat the whole story. |
| **Stay in control** | The ability to review memories and choose what to share with trusted people. |
| **Strengthen human support** | Help communicating experiences to friends, family or qualified professionals when the person chooses to involve them. |

Amarelo calls its AI companions **Elos**, Portuguese for links. Ana is the first agent being developed; Ana, Nico and Isa appear in the product experience. Choosing an Elo is a personal preference, not a diagnosis.

## Continuity

Longitudinal memory is the product's approach to preserving meaningful experiences across time. A conversation can build on what came before while leaving room for a person's routines, preferences and circumstances to change.

The goal is a more personal experience, with the person deciding which memories remain useful and what they want others to know.

## Human support, on your terms

Amarelo is designed for adults and their support networks. Privacy and personal agency guide the product: being a relative, supporter or professional must never automatically grant access to someone else's conversations. Sharing is intended to be explicit and under the person's control.

Amarelo is not therapy, diagnosis, treatment or a crisis service, and does not replace qualified care.

## Project status

**Amarelo is an MVP in development.** The repository includes a public landing page, onboarding, a PWA and an early memory review interface. The default local conversation preview uses synthetic data.

The complete voice-and-memory experience, review and sharing journeys are still being developed and validated. This is a portfolio and development preview, not a production-ready service or a claim of clinical effectiveness.

## Try the preview

Visit [amarelo.life](https://amarelo.life) for the product introduction.

To explore the interface locally, use **Node.js 24**, **pnpm 10.32.1** and a POSIX shell:

```sh
git clone https://github.com/NeonGate-AI/amarelo.git
cd amarelo
pnpm install --frozen-lockfile
./cli/elo doctor
pnpm dev
```

Open the PWA at `http://localhost:3003`. This preview demonstrates the interface with synthetic conversation content; it does not establish a working live voice service.

## The work behind Amarelo

Created by [Jonatas Sales](https://github.com/neonjonatas), Amarelo brings together product design, accessible web interfaces and AI voice engineering. It is built with TypeScript, React and Next.js, with [Orbz](https://github.com/NeonGate-AI/orbz) providing the visual voice presence.

The project reflects an emphasis on thoughtful user experience, responsible product boundaries and spec-driven development. Feedback is welcome through [GitHub issues](https://github.com/NeonGate-AI/amarelo/issues).
