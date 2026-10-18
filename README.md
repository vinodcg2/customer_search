# Customer Search Dashboard

A React + TypeScript + Vite dashboard for searching and filtering customers, built
incrementally. Planned behaviour:

- Debounced text search
- Status filter: **Active**, **Inactive**, **Pending** (plus "All")
- Server-side pagination
- Loading and error states with retry
- Request cancellation **and** a stale-response guard, so out-of-order responses can
  never overwrite newer results

## Requirements

- Node.js >= 20.11 (needed for `import.meta.dirname` in the ESLint config)
- npm >= 10

## Getting started

```bash
npm install
npm run dev          # start the dev server
npm run check        # lint + tests + production build (build runs the typecheck first)
```

## Scripts

| Script | What it does |
|---|---|
| `dev` | Vite dev server |
| `build` | `typecheck`, then `vite build` |
| `preview` | Serve the production build locally |
| `typecheck` | `tsc --noEmit` for `src/` and for `vite.config.ts` |
| `lint` | `eslint .` (type-aware for `src/`, includes React Hooks rules) |
| `test` | `vitest run` (single run, CI-friendly) |
| `test:watch` | `vitest` in watch mode |
| `check` | `lint`, then `test`, then `build` (which includes `typecheck`) |

> **Verification status:** the scripts above were written in an offline environment and
> have not been executed yet. See the *Verification record* at the bottom of
> [`docs/decision-log.md`](docs/decision-log.md) for exactly what has and has not been run.
> If `npm install` reports peer-dependency conflicts, or `npm run check` fails on first run,
> please report the output.

## Conventions

### TypeScript

- `strict: true` plus `noUncheckedIndexedAccess`, `noImplicitReturns`, `noImplicitOverride`,
  `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`.
- No `any`, no non-null assertions (`!`), no object-literal type assertions. Enforced by ESLint.
- Data from the network is validated at the API boundary instead of being asserted into a type.

### React Hooks

- `react-hooks/rules-of-hooks` and `react-hooks/exhaustive-deps` are both errors.
  Effect dependency arrays are never silenced; if a lint error appears, the code is restructured.

### Styling: SCSS + BEM

- SCSS, authored with `@use` (never `@import`). The only Sass features used are partials and nesting.
- **BEM:** `.block`, `.block__element`, `.block--modifier`. Kebab-case names. No element-of-element
  (`block__a__b`); flatten to `block__b`. Modifiers are always applied together with the base class.
- **Selectors:** one class only. Nesting is limited to `&__element`, `&--modifier`, state
  pseudo-classes and `@media`, one level deep. No tag/id selectors, no descendant or child
  combinators, no `!important` (two documented exceptions in the reset).
- **Global vs component:** `src/styles/` holds global tokens, reset, base and utilities, loaded once
  in `main.tsx`. Each component keeps its own stylesheet beside it and imports it itself.
- **Tokens** are CSS custom properties in `src/styles/_tokens.scss`.
- No mixins, functions, maps or `@extend` until the same pattern has appeared three times.

```scss
// components/StatusBadge/StatusBadge.scss
.status-badge {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);

  &__label {
    font-weight: var(--font-weight-medium);
  }

  &--inactive {
    color: var(--color-text-muted);
  }
}
```

### Testing

- Vitest + React Testing Library + `user-event` + jest-dom, in jsdom.
- Tests query by role and accessible name, the way users and assistive technology find things.
- Network behaviour is tested against a deterministic mock HTTP API (MSW, added in Step 2), so
  tests exercise real `fetch` and `AbortController` behaviour rather than a hand-written fetch mock.
- Time-dependent behaviour (debounce) uses fake timers.
- Required coverage: debounce timing, request cancellation, out-of-order responses, pagination,
  status filtering, page reset, errors, and retry.

## Search and filter behaviour (target for Steps 2-7)

- Filters: free-text query and status (`all`, `active`, `inactive`, `pending`).
- **Changing the query or the status filter resets pagination to page 1.**
- Only the latest request may update the UI; see decisions D-013 and D-014.

## Project structure

Current:

```
.
├── eslint.config.js
├── index.html
├── package.json
├── tsconfig.json / tsconfig.node.json
├── vite.config.ts
├── docs/decision-log.md
└── src/
    ├── main.tsx
    ├── App.tsx / App.test.tsx        (placeholder + smoke test)
    ├── vite-env.d.ts
    ├── test/setup.ts
    └── styles/                       (GLOBAL styles only)
        ├── main.scss
        ├── _tokens.scss
        ├── _reset.scss
        ├── _base.scss
        └── _utilities.scss
```

Planned: `src/api/`, `src/types/`, `src/hooks/`, `src/components/<Name>/` (each with its own
`.tsx`, `.scss`, `.test.tsx`), `src/test/mocks/`.

## Project status

Each step is reviewed before the next begins.

- [x] **Step 1** - Configuration, strict TypeScript, ESLint (React Hooks), test setup, global SCSS tokens/base
- [ ] Step 2 - Types (incl. customer status), API errors, mock HTTP API (MSW) with search + status filter + pagination, API client
- [ ] Step 3 - `useDebouncedValue`
- [ ] Step 4 - `useCustomerSearch` (cancellation + stale-response guard + page reset)
- [ ] Step 5 - SearchBox, StatusFilter, StatusMessage, CustomerTable
- [ ] Step 6 - Pagination
- [ ] Step 7 - Dashboard composition and integration tests
- [ ] Step 8 - Final review and README completion

## Engineering decisions

See [`docs/decision-log.md`](docs/decision-log.md).
