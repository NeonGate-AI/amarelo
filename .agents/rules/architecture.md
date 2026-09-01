# Architecture rules

- Canonical source root is `workspaces/`; references to the retired source-root name are forbidden in live implementation/configuration.
- A workspace must not contain a nested generic `apps/` or `packages/` mini-monorepo.
- Memory Nucleus is a single workspace/package with real Clean Architecture direction: `infrastructure → application → domain`.
- Domain must not import Application or Infrastructure. Application must not import concrete Infrastructure.
- Cross-workspace imports use declared package names, never relative paths.
- Two-or-more-parent source imports (`../../`) are forbidden.
- Package namespaces communicate ownership: `@ai/*`, `@nucleus/*`, `@repo/*`.
- Shared packages require demonstrated cross-workspace ownership or an intentional public boundary.
