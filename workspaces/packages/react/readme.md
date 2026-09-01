# `@repo/react`

Shared React implementation for the landing, console, onboarding, and PWA apps.

## Ownership

- `src/formatters`: framework-neutral formatting helpers.
- `src/next`: isolated Next.js-specific integrations such as local fonts.
- `src/ui`: Amarelo-owned reusable components.
- `src/vendors/smoothui`: locally owned SmoothUI-generated source.
- `src/vendors/shadcn`: locally owned shadcn-generated source.

Apps import only the package's public subpaths. They own their semantic tokens,
theme selection, layouts, routes, sections, and views. Web component styling is
Tailwind-first; consumer global CSS is limited to Tailwind entry points, token
mapping, themes, and element-level defaults.

Each consumer must make Tailwind scan this package:

```css
@source "../../../packages/react/src";
```

Framework-neutral consumers should prefer narrow public subpaths so their
bundlers do not traverse unrelated or Next.js-specific modules:

```tsx
import { AgentOrb } from '@repo/react/ui/agent-orb'
import { agentOrbPresets } from '@repo/react/ui/agent-orb/presets'
import { SmoothButton } from '@repo/react/ui/smooth-button'
```

Next.js is an optional peer dependency. Only imports below `@repo/react/next/*`
require it; the shared UI and SmoothUI paths are framework-neutral.

Vite and other framework-neutral consumers can load the package-owned Satoshi
font without coupling to `next/font`:

```css
@import '@repo/react/fonts/satoshi.css';
```

AI Elements remains an evaluated option, not an installed dependency. If it is
adopted, only the components used by an app should be generated and maintained
as local source alongside the other web vendors.

Component filenames do not encode `client`, `view`, or `section`. Directories
express those roles, while interactive modules use the standard `use client`
directive.
