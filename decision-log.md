# Engineering Decision Log

Each entry: context, decision, trade-offs. Entries are never deleted; a changed decision is marked
"Superseded" and a new entry is added. Entries marked **(planned)** record intent for a later step
and are not yet implemented.

---

## D-001 - One config for Vite and Vitest
**Step:** 1

**Decision:** `vite.config.ts` imports `defineConfig` from `vitest/config` and holds the `test` block, so the app and tests share plugins and resolution rules.

**Trade-off:** The config mixes build and test concerns. At this project size that is simpler than two files that must be kept in sync.

---

## D-002 - Strict TypeScript, enforced by lint
**Step:** 1 (flags), 1.1 (lint enforcement)

**Decision:** `strict: true` plus `noUncheckedIndexedAccess`, `noImplicitReturns`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`, and `verbatimModuleSyntax`.

**Why:** `noUncheckedIndexedAccess` matters most here. Pagination and list code index into arrays constantly, and this forces the "might be undefined" case to be handled.

**Avoiding `any` and unsafe assertions:** the compiler alone does not forbid these, so ESLint does (see D-010): `no-explicit-any`, the type-aware `no-unsafe-*` family, `no-non-null-assertion`, and `consistent-type-assertions` with object-literal assertions banned. Plain `as` is still permitted, because banning it outright forces awkward code, but it should be treated as a review flag. Network data will be validated at the API boundary (Step 2) rather than asserted into a type.

**Not enabled:** `exactOptionalPropertyTypes`. It adds friction with React props and library types for little practical gain here.

**Trade-off:** Slightly more verbose code in exchange for catching a class of runtime errors at compile time.

---

## D-003 - Separate tsconfig for Vite config
**Step:** 1

**Decision:** `tsconfig.json` covers `src/` (DOM libs, React JSX). `tsconfig.node.json` covers `vite.config.ts` (no DOM libs).

**Why:** Prevents browser globals from type-checking in Node-side config and vice versa. `npm run typecheck` runs both.

---

## D-004 - Quality gates as scripts
**Step:** 1, extended in 1.1

**Decision:**
- `build` runs `typecheck` first, because Vite transpiles but does not type-check.
- `lint`, `typecheck`, `test`, and `build` are separate scripts so each can run alone.
- `check` = `lint` then `test` then `build` (which includes `typecheck`). It is the single command to run before committing or in CI.

**Trade-off:** `check` is sequential and fails fast; it is not the fastest possible CI layout, but it is simple and easy to read.

---

## D-005 - SCSS and BEM
**Step:** 1, rewritten in 1.1

**Why SCSS:**
- It matches the team's experience, which lowers maintenance cost.
- `@use` gives module scoping, and partials give a natural split between global and component styles.
- It has no runtime cost and adds exactly one dev dependency (`sass`).
- CSS Modules and CSS-in-JS were not chosen: BEM already provides namespacing by convention, and the alternatives add build or runtime complexity this project does not need.

**Why BEM:** it keeps every selector a single class (specificity 0,1,0), makes the owner of each rule obvious from its name, and is easy to review without tooling.

**Rules:**
1. **Block** = a standalone component, kebab-case (`customer-table`). **Element** = `customer-table__row`. **Modifier** = `customer-table--loading`, always applied together with the base class.
2. No element-of-element (`block__a__b`). Flatten to `block__b`.
3. Selectors are a single class. Allowed nesting, one level deep only: `&__element`, `&--modifier`, state pseudo-classes (`&:hover`, `&:focus-visible`, `&:disabled`), and `@media`. No tag, id, descendant, or child selectors.
4. No `!important`. Two documented exceptions in `_reset.scss`: the `[hidden]` rule and the `prefers-reduced-motion` override, both of which must win over component styles by design.
5. A block never styles another block's internals. A parent positions a child by passing it a parent-owned class (a BEM "mix", for example `className="dashboard__search"`) or a modifier.
6. **Global vs component:** `src/styles/` is global only (tokens, reset, base, utilities), loaded once in `main.tsx`. Each component keeps `<Name>.scss` beside it and imports it itself. Because specificity is flat, CSS ordering between components does not matter.
7. **No Sass abstractions** (mixins, functions, maps, `@extend`) until the same pattern appears three times. Currently zero Sass variables are used.

**Trade-offs:** `&__element` nesting means the full class name does not appear verbatim in the source, which makes grep slightly harder. This is accepted for readability. BEM is enforced by review, not tooling. Adding stylelint was considered and deferred to avoid another dependency.

---

## D-006 - Design tokens as CSS custom properties
**Step:** 1

**Decision:** Colours, spacing, type, radius, focus, and motion tokens are CSS custom properties on `:root`, not Sass variables.

**Why:** Visible in devtools, overridable at runtime (for example a future dark theme), and usable from any component stylesheet without importing anything.

**Known limitation:** Custom properties cannot be used inside `@media` conditions. If breakpoints are needed, a small Sass variable will be added at that point (not before).

---

## D-007 - Accessibility baked into the base layer
**Step:** 1

**Decision:**
- A single global `:focus-visible` outline for every interactive element.
- `prefers-reduced-motion` support in the reset.
- A `.visually-hidden` utility for screen-reader-only text and live regions.
- `--color-border-strong` is reserved for form control boundaries so they meet the 3:1 non-text contrast guideline. The lighter `--color-border` is for decorative dividers only.

---

## D-008 - Test setup without Vitest globals
**Step:** 1

**Decision:** `globals` is off, so test files import `describe`, `it`, `expect` from `vitest`. Because of that, RTL's auto-cleanup does not register and `setup.ts` calls `cleanup()` explicitly. `restoreMocks` and `unstubGlobals` are enabled so spies and stubbed globals cannot leak between tests.

**Why:** Explicit imports make test files self-describing and keep global types out of the project.

**Note:** Vitest does not process plain CSS/SCSS imports in tests by default, so tests do not need Sass compilation.

---

## D-009 - Mock API strategy: MSW as the single mock layer (planned)
**Step:** 1 (decision), 2 (implementation)

**Decision:** One deterministic in-memory dataset and one set of MSW request handlers, used by both the dev server (service worker) and tests (Node server). The mock supports text search, status filtering, pagination, and simulated latency.

**Why MSW adds real value here:** The app code uses real `fetch` against real URLs, and the same handlers serve dev and tests. Tests exercise the real fetch and abort path instead of a hand-rolled fetch mock. Per-test overrides make error and out-of-order scenarios easy to express.

**Trade-off:** One extra dev dependency and a generated `public/mockServiceWorker.js` that must be committed. MSW is not added yet because nothing uses it.

---

## D-010 - Linting: ESLint 9 flat config, type-aware, explicit Hooks rules
**Step:** 1.1 (supersedes the earlier "no ESLint" decision)

**Decision:**
- ESLint 9 with a flat config (`eslint.config.js`), `@eslint/js` recommended, and `typescript-eslint` `recommendedTypeChecked`.
- `eslint-plugin-react-hooks` is registered as a plugin and its two rules are set explicitly: `rules-of-hooks: error` and `exhaustive-deps: error`.
- Project rules added: `no-non-null-assertion` and `consistent-type-assertions` (object-literal assertions banned).
- Type-aware linting (`projectService`) applies to `src/**/*.{ts,tsx}` only. `eslint.config.js` and `vite.config.ts` are not in `tsconfig.json`, so they use `disableTypeChecked`.

**Why explicit Hooks rules instead of the plugin's `recommended` preset:** the preset's export name and contents have changed between plugin major versions (legacy vs flat config, and newer majors add further rules). Because the installed version cannot be confirmed offline, listing the two stable rules guarantees the same behaviour on any 5.x-or-later release. `exhaustive-deps` is an error rather than the preset's usual warning, because the hooks in Steps 3-4 (debounce, cancellation, stale-response guard) depend on correct dependency arrays, and warnings get ignored.

**Why type-aware:** `no-floating-promises`, `no-misused-promises`, and the `no-unsafe-*` rules directly support the async and no-`any` goals. This applies as soon as the first `fetch` is written.

**Trade-offs:** Type-aware linting is slower and needs the tsconfig. `engines.node` is `>=20.11` because the config uses `import.meta.dirname`. The explicit rule list will not automatically pick up new rules in later plugin versions; revisit when upgrading the plugin major. Prettier is intentionally not included.

---

## D-011 - Dependency version policy and compatibility claims
**Step:** 1.1

**Decision:** Caret ranges for most packages, `~` for TypeScript (minor line pinned because typescript-eslint supports a bounded TS range). No upgrades beyond what the architecture needs. A lockfile will be generated on first install and committed.

**Compatibility basis.** The following are beliefs from memory, not verified against the npm registry or by installing:

| Pairing | Basis | Status |
|---|---|---|
| Vite 6 + Vitest 3 | Vitest 3 is believed to support Vite 5 and 6 | Unverified |
| Vite 6 + `@vitejs/plugin-react` 4.3 | 4.3.x is believed to support Vite 4-6 | Unverified |
| React 18.3 + RTL 16 (+ `@testing-library/dom` 10 as peer) | RTL 16 requires `dom` as an explicit peer and supports React 18 | Unverified |
| ESLint 9 + typescript-eslint 8 | v8 supports flat config and ESLint 9 | Unverified |
| ESLint 9 + `eslint-plugin-react-hooks` 5.x | 5.x peer range believed to include ESLint 9 | Unverified |
| TypeScript 5.6 + typescript-eslint 8.x | Supported TS range is believed to include 5.6 | Unverified |
| Node >= 20.11 | Reasoned from minimum Node versions of Vite 6, ESLint 9, Vitest 3, and `import.meta.dirname` | Unverified |

**How these get verified:** a clean `npm install` with no `ERESOLVE` errors or peer warnings, then `npm run check` passing. Until then they are unconfirmed.

---

## D-012 - Customer status filter
**Step:** 1.1 (requirement), 2-7 (implementation) **(planned)**

**Decision:** Customers have a status of `active`, `inactive`, or `pending`. The UI filter offers Active, Inactive, Pending, plus an "All" option, combined with the text search.

**Rule:** changing the search query **or** the status filter resets pagination to page 1. Changing only the page does not change the other criteria.

**Implementation intent:**
- The status union type lives in `src/types/customer.ts`; the mock API and client accept `status` as a query parameter.
- The page reset happens in the state update itself (event handler or reducer), not in an effect that reacts to changes. An effect would render once with a stale page and trigger a wasted request.
- Edge case to handle in Step 4: the query input changes immediately but the request uses the debounced value. The design must not issue a request that combines the old query with a reset page during the debounce window.

---

## D-013 - Testing approach
**Step:** 1.1 (rationale), 2-7 (implementation)

**Decision:** Vitest + React Testing Library + `user-event` + jest-dom in jsdom, in three layers:
1. **Unit:** pure logic and hooks via `renderHook`, with fake timers for debounce.
2. **Component:** each component through its accessible roles and names, with no implementation details.
3. **Integration:** the full dashboard against the MSW mock API, using real `fetch` and `AbortController`.

**Required scenarios:** debounce timing; request cancellation; out-of-order responses (a slow earlier response must not replace a fast later one); pagination; status filtering; page reset on query and filter change; error states; retry.

**Why:** Querying by role keeps tests tied to behaviour users and assistive technology see, which doubles as accessibility checking. MSW means the abort and ordering tests run against real network semantics. Snapshot tests are avoided because they are brittle and say little about behaviour.

**Trade-off:** Integration tests with simulated latency are slower and need careful control of timers. Latency in the mock is deterministic and overridable per test to keep them fast and stable.

---

## D-014 - Stale-response guard in addition to AbortController (planned)
**Step:** 4

**Decision:** `AbortController` is used to cancel in-flight work, but correctness does not depend on it. Each request gets a monotonically increasing id held in a ref, and results or errors are committed only if the id still matches the latest request and the component is still mounted.

**Why:** Abort is best-effort. A response can already be parsed when the abort fires, a mock or library may not honour the signal, and an aborted request must never surface as an error. The id check makes ordering correctness independent of transport behaviour.

**Test:** an integration test with a deliberately slow first response and fast second response, asserting the UI shows the second.

---

## Verification record

Recorded after Step 1.1 on 2026-10-17. The authoring sandbox has no network access and no installed dependencies.

| Check | Result |
|---|---|
| `package.json`, `tsconfig.json`, `tsconfig.node.json` parse as valid JSON | **Ran: passed** |
| `package.json` scripts present; dependency lists alphabetical | **Ran: passed** |
| Both tsconfigs accepted by `tsc --showConfig` (global tsc 6.0.3, not the pinned 5.6) | **Ran: passed** (validates option names and structure only) |
| `eslint.config.js` syntax via `node --check` | **Ran: passed** (syntax only; imports not resolved) |
| SCSS audit by grep: 0 `@import`, 4 `@use`, 0 Sass variables, one class selector, `!important` only in the two documented reset rules | **Ran: passed** |
| WCAG contrast of colour tokens (Step 1) | **Ran: passed** |
| `npm install` | **Not run.** Offline attempt failed with `ENOTCACHED`; a registry lookup returned no output |
| Dependency version existence and compatibility (D-011) | **Not verified** |
| `npm run lint` | **Not run** (ESLint not installed; config semantics, `projectService` behaviour, and rule names unconfirmed) |
| `npm run typecheck` with the pinned TypeScript 5.6 and real `@types/*` | **Not run** |
| `npm test` (smoke test, jsdom, RTL, jest-dom setup) | **Not run** |
| `npm run build` | **Not run** |
| `npm run dev` | **Not run** |
| SCSS compilation by `sass` | **Not run** |
| `npm run check` | **Not run** |
