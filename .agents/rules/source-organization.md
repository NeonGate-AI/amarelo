---
version: 1
extends: code-style.md
name: Source Organization
description: Source code organization, module boundaries, file naming, and folder conventions.
alwaysApply: true
priority: high
tags:
  - architecture
  - source
  - organization
---

# Source Organization

## Purpose

This document defines the mandatory standards for organizing source code.

It extends the rules defined in [`code-style.md`](./code-style.md).

## Scope

These rules apply only to files and directories created inside the project's source code.

They do not apply to framework-defined conventions outside the source tree.

---

## Files

### Framework Conventions

Some frameworks define reserved filenames that must be used exactly as specified.

These filenames are exceptions to the rules in this document and must not be renamed or receive suffixes.

These rules apply only to files created by the project.

### Suffixes

Use only the suffixes defined in this table.

| Suffix | Applies To | Example | Description |
|---------|------------|---------|-------------|
| `.abstract` | Any | `payment.abstract.ts` | Declares an abstract contract intended to be implemented by another type. |
| `.client` | Any | `http.client.ts` | Declares a client for communicating with an external system such as HTTP, gRPC, MCP, or an event bus. |
| `.compute` | Any | `score.compute.ts` | Declares a function that computes or derives a value. |
| `.data` | Any | `thresholds.data.ts` | Exports static application data that is not environment-specific. |
| `.event` | Any | `user-created.event.ts` | Declares an event definition or event payload. |
| `.fmt` | Any | `ms-to-time.fmt.ts` | Declares a function that formats a value. |
| `.guard` | Any | `authenticated.guard.ts` | Declares a guard that validates access or execution conditions. |
| `.handler` | Any | `submit.handler.ts` | Declares an event or request handler. |
| `.map` | Any | `client.map.ts` | Declares a mapper that transforms one representation into another. |
| `.mock` | Any | `client.mock.ts` | Declares a mock implementation for testing or development. |
| `.schema` | Any | `client.schema.ts` | Declares a schema, such as a Zod schema. |
| `.service` | Any | `payment.service.ts` | Declares a service that encapsulates related domain or infrastructure operations. |
| `.state` | Any | `client.state.ts` | Declares the initial or default state for a feature or model. |
| `.type` | Any | `client.type.ts` | Declares a single type or interface. |
| `.validate` | Any | `client.validate.ts` | Declares validation logic for a model or input. |
| `.adapter` | Architecture | `stripe.adapter.ts` | Adapts one interface or protocol to another. |
| `.port` | Architecture | `payment.port.ts` | Declares a port in a Ports and Adapters architecture. |
| `.domain` | Domain | `client.domain.ts` | Declares a domain model or domain-specific type. |
| `.action` | React | `sign-in.action.ts` | Declares a React Server Action or server function invoked by the application. |
| `.client` | React | `sign-in-form.client.tsx` | Marks a Client Component. |
| `.hook` | React | `use-client.hook.ts` | Declares a custom React Hook. |
| `.server` | React | `logo.server.tsx` | Marks a Server Component. |
| `.atom` | State Management | `client-cpf.atom.ts` | Declares an atom for graph-based state management libraries such as Jotai or Recoil. |
| `.view` | UI | `hero.view.tsx` | Declares a view representing a page or a primary application section. |

---

## 1. File Suffixes

### Description

Use a standardized suffix for every source file.

Use only the suffixes defined in the **Suffixes** table.

Do not create new suffixes without adding them to this document.

Do not apply these rules to framework-defined filenames.

### Incorrect

```text
user.helper.ts
auth.misc.ts
button.thing.tsx
```

### Correct

```text
auth.hook.ts
date.map.ts
banner-section.client.tsx
```

---

## 2. File Naming

### Description

Use kebab-case for every source file.

This rule applies only to project-created source files.

### Incorrect

```text
UserCard.tsx
useAuth.ts
DateUtil.ts
buttonStyles.ts
```

### Correct

```text
user-card.tsx
auth.hook.ts
date.map.ts
banner-section.client.tsx
```

---

## 3. Module Responsibility

### Description

Use one primary artifact per module.

Create one module for each function, type, interface, class, component, hook, schema, or other primary artifact.

Keep supporting constants, helper functions, and internal types in the same module only when they exist exclusively to support the primary artifact.

Use colocation to keep related modules close to each other.

The `.data` suffix is an exception to this rule. A `.data` module may export multiple related constants that belong to the same concern.

### Incorrect

```ts
// user.ts

export interface User {}

export interface UserAddress {}

export function createUser() {}

export function deleteUser() {}

export const DEFAULT_NAME = 'Guest'
```

### Correct

```md
user/
├── create-user.compute.ts
├── delete-user.compute.ts
├── user.type.ts
├── user-address.type.ts
└── user.data.ts
```

---

## Folders

### Folder Types

## 4. Source Root

### Description

Create a single source root for every application, package, and agent.

The source root is the directory where developers and AI agents create and maintain source code.

The source root name depends on the framework.

Examples include `app` and `src`.

---

## 5. Folder Naming

### Description

Use kebab-case for every project-created folder.

### Incorrect

```text
BannerSection/
UserProfile/
PaymentGateway/
```

### Correct

```text
banner-section/
user-profile/
payment-gateway/
```

---

## 6. UI Component Organization

### Description

Place globally reusable UI components inside the `ui` directory.

Export the public API of the `ui` directory through `index.ts`.

Create one directory for each UI component.

Name the component directory after its primary component.

Name the primary component file after its directory.

### Correct

```md
app/
└── ui/
    ├── index.ts
    └── banner-section/
        ├── banner-section.client.tsx
        ├── section-aside.client.tsx
        ├── banner-section.feature
        ├── banner-section.test.ts
        └── banner-section.stories.tsx
```

```ts
// app/ui/index.ts

export { ... } from './banner-section/banner-section.client'
export { ... } from './hero-section/hero-section.client'
export { ... } from './footer/footer.client'
export { ... } from './header/header.client'
export { ... } from './button/button.client'
```

```tsx
// app/(marketing)/page.tsx

import {
  BannerSection,
  Button,
  Footer,
  Header,
  HeroSection,
} from '@ui'
```

### Folder Types

Use only the folder types defined in these tables.

#### Top-Level Folders

| Folder | Applies To | Example | Description |
|---------|------------|---------|-------------|
| `ui` | Frontend | `app/ui/` | Declares globally reusable UI components. Exports its public API through `index.ts`. |
| `lib` | Frontend | `app/lib/` | Declares globally reusable libraries organized by concern. Each concern exposes its public API through `index.ts`. |
| `infra` | Frontend | `app/infra/` | Declares integrations with frameworks, third-party libraries, and external services. |
| `atoms` | Frontend | `app/atoms/` | Declares globally shared state atoms. Exports its public API through `index.ts`. |
| `brand` | Frontend | `app/brand/` | Declares branding resources. Contains `fonts`, `styles`, and `theme`. |
| `api` | Next.js | `app/api/` | Declares API Route Handlers. |

#### Route Folders

Every route declares a single `lib` directory.

The `lib` directory is the source root for the route.

All project-created folders inside a route must be placed inside `lib`.

| Folder | Applies To | Example | Description |
|---------|------------|---------|-------------|
| `lib` | Route | `app/(hero)/lib/` | Declares the source root for a route. Contains all route-specific source code. |
| `ui` | Route | `app/(hero)/lib/ui/` | Declares UI components used only by the current route. Exports its public API through `index.ts`. |
| `atoms` | Route | `app/(hero)/lib/atoms/` | Declares state atoms scoped to the current route. Exports its public API through `index.ts`. |
| `infra` | Route | `app/(hero)/lib/infra/` | Declares route-specific integrations with frameworks, third-party libraries, and external services. |
| `events` | Route | `app/(hero)/lib/events/` | Declares events used only by the current route. |
| `formatters` | Route | `app/(hero)/lib/formatters/` | Declares formatting functions used only by the current route. |
| `mappers` | Route | `app/(hero)/lib/mappers/` | Declares mapping functions used only by the current route. |
| `actions` | Route | `app/(hero)/lib/actions/` | Declares route-specific actions. |

---

### Import Conventions

#### Global UI

```tsx
import {
  BannerSection,
  Button,
  Footer,
  Header,
  HeroSection,
} from '@ui'
```

#### Global Atoms

```tsx
import {
  selectedMerchantAtom,
  themeAtom,
  userAtom,
} from '@atoms'
```

#### Global Libraries

```tsx
import { formatCurrency } from '@lib-formatters'
import { merchantMapper } from '@lib-mappers'
import { validateCpf } from '@lib-validators'
```

#### Route Libraries

```tsx
import { buildHeroCards } from '@hero'
import { createBannerAnimation } from '@banners'
import { merchantFilters } from '@merchants'
import { onboardingSteps } from '@onboarding'
```

```json
// tsconfig.paths.json

{
  "compilerOptions": {
    "paths": {
      "@hero/*": ["./app/(hero)/lib/*"],
      "@banners/*": ["./app/(banners)/lib/*"],
      "@merchants/*": ["./app/(merchants)/lib/*"],
      "@onboarding/*": ["./app/(onboarding)/lib/*"]
    }
  }
}
```

#### Infrastructure

```tsx
import { SmoothCenter } from '@smoothui'
```

---

### Brand Organization

```md
brand/
├── fonts/
├── styles/
└── theme/
```

- `fonts` declares the project's font resources.
- `styles` declares the foundation styles used to compose themes.
- `theme` declares the consolidated application theme.

---

## 7. Feature Route Groups

### Description

Use route groups to organize source code by feature.

Create one route group for each application feature.

Use the feature name consistently across specifications, route groups, and import aliases.

A route group may exist without a `page.tsx` file.

Use route groups without pages to organize feature-specific source code and provide a meaningful import alias.

### Incorrect

```md
app/
├── hero/
├── banners/
├── onboarding/
└── merchants/
```

```tsx
import { createBannerAnimation } from '../../../banner/lib/animations'
import { buildHeroCards } from '../../../hero/lib/cards'
```

### Correct

```md
app/
├── (hero)/
│   └── lib/
├── (banners)/
│   └── lib/
├── (merchants)/
│   └── lib/
└── (onboarding)/
    └── lib/
```

```json
// tsconfig.paths.json

{
  "compilerOptions": {
    "paths": {
      "@hero/*": ["./app/(hero)/lib/*"],
      "@banners/*": ["./app/(banners)/lib/*"],
      "@merchants/*": ["./app/(merchants)/lib/*"],
      "@onboarding/*": ["./app/(onboarding)/lib/*"]
    }
  }
}
```

```tsx
import { buildHeroCards } from '@hero/cards'
import { createBannerAnimation } from '@banners/animations'
import { merchantFilters } from '@merchants/filters'
import { onboardingSteps } from '@onboarding/steps'
```