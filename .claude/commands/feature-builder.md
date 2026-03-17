# Feature Builder

You are building a new feature (or extending an existing one) in the pharma-finance Angular + Supabase app.

Follow this order strictly — do not skip layers:

1. **Domain model** — create/update the interface in `src/domain/models/`. No Angular, no Supabase imports.
2. **Repository interface** — create/update the abstract interface in `src/domain/repositories/`. Methods only, no implementation.
3. **Use case(s)** — create in `src/application/use-cases/<feature>/`. Inject repository interfaces, never concrete classes. No Supabase imports.
4. **Supabase repository** — implement the interface in `src/infrastructure/supabase/repositories/`. This is the only place Supabase SDK is used.
5. **Angular component** — build the page/component in `src/presentation/features/<feature>/`. Call use cases via `inject()`. Never call Supabase directly.
6. **Route** — add lazy-loaded route to `src/app/app.routes.ts` via `loadComponent`.
7. **Sidebar** — add nav entry to `src/presentation/core/layout/sidebar/sidebar.component.ts` if it's a top-level page.

## Checklist before finishing

- [ ] Domain model has no framework imports
- [ ] Repository interface is abstract (no implementation)
- [ ] Use case injects repository interface, not concrete class
- [ ] Supabase repository implements the interface exactly
- [ ] Component uses `ChangeDetectionStrategy.OnPush`
- [ ] Component uses `signal()` / `computed()` for state
- [ ] Component calls use cases via `inject()` only
- [ ] Route is lazy-loaded via `loadComponent`

## Conventions

- All components: `standalone: true`, `ChangeDetectionStrategy.OnPush`
- State: `signal()`, `computed()` — no BehaviorSubject
- DI: `inject()` function — no constructor injection
- Currency: every monetary field has its own `currency: 'USD' | 'LBP'` — never auto-convert
- Styling: CSS custom properties from `src/styles.css` (--bg-base, --gold, --border, etc.)
- Common classes: `.btn-primary`, `.btn-ghost`, `.input`, `.label`, `.card`, `.stat-card`, `.table-wrap`, `.modal`, `.modal-overlay`, `.font-mono`, `.fade-up`
