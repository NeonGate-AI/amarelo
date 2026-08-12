# `@repo/react-web`

Shared React Web implementation for the landing, console, and onboarding apps.

## Ownership

- `src/formatters`: framework-neutral formatting helpers.
- `src/next`: Next.js-specific integrations such as local fonts.
- `src/ui`: Amarelo-owned reusable components.
- `src/vendors/smoothui`: locally owned SmoothUI-generated source.
- `src/vendors/shadcn`: locally owned shadcn-generated source.

Apps import only the package's public subpaths. They own their semantic tokens,
theme selection, layouts, routes, sections, and views. Web component styling is
Tailwind-first; consumer global CSS is limited to Tailwind entry points, token
mapping, themes, and element-level defaults.

Each consumer must make Tailwind scan this package:

```css
@source "../../../packages/react-web/src";
```

AI Elements remains an evaluated option, not an installed dependency. If it is
adopted, only the components used by an app should be generated and maintained
as local source alongside the other web vendors.

Component filenames do not encode `client`, `view`, or `section`. Directories
express those roles, while interactive modules use the standard `use client`
directive.
