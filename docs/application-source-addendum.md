# Application source: addendum

This file accompanies the application source files. It does **not** replace
`README.md` or `docs/decision-log.md`. Merge the sections below into them when ready.

---

## Decision-log entries to append

### D-015 - Dependency-free mock HTTP API instead of MSW (amends D-009)
**Context:** D-009 planned MSW. The agreed `package.json` has no MSW, and the dependency set was to stay unchanged.

**Decision:** `src/api/mock/mockFetch.ts` implements a deterministic `fetch`-compatible function for `GET /api/customers` (text search, status filter, pagination, simulated latency, validation, HTTP errors). It honours `AbortSignal`. `installMockApi()` routes `/api/customers*` to it in `main.tsx`; tests call `vi.stubGlobal('fetch', ...)`.

**Why this is still a "real" HTTP path:** the app code uses plain `fetch` with a URL, headers and an abort signal, and receives real `Response` objects, so status handling and JSON parsing are exercised.

**Trade-offs:** no service worker and no extra dependency, but the mock patches `window.fetch` in the browser rather than intercepting at the network layer. The pure filtering logic is separate (`customerQuery.ts`), so porting to MSW later only means wrapping `createMockFetch` in a handler.

**Demo hooks:** searching for `trigger-error` makes the mock answer HTTP 500 (to see the error and retry UI). Default latency is 400 ms.

### D-016 - Stale-response guard is a per-request closure flag (refines D-014)
**Decision:** each effect run owns `let isCurrent = true` and an `AbortController`. Cleanup sets `isCurrent = false` and aborts. Results and errors are committed only while `isCurrent` is true.

**Why not a counter in a ref (as D-014 sketched):** the closure is itself a unique request identity, needs no shared mutable state, and avoids touching `ref.current` in an effect cleanup (which `react-hooks/exhaustive-deps` flags). The guarantee is the same: a late response, even from a transport that ignores `abort()`, cannot overwrite newer state, and nothing is committed after unmount.

**Verified by tests that settle already-aborted requests on purpose** (`useCustomerSearch.test.ts`, "stale responses"; dashboard integration test "out-of-order responses").

### D-017 - Page reset is derived during render, not done in an effect (implements D-012)
**Decision:** the hook stores `{ page, criteriaKey }` where `criteriaKey` is the status plus the *debounced* query. If the key in state differs from the current key, the page is reset to 1 during render (React's "adjust state while rendering" pattern).

**Why:** an effect-based reset would first render and fetch the new criteria with the old page (a wasted, possibly wrong request). It also handles the debounce window correctly: typing does not reset the page until the search actually changes, so the page never pairs the old query with page 1. Because the stored key is updated on every change, returning to a previous filter does not resurrect an old page.

### D-018 - Pagination uses `aria-disabled`, not `disabled`
**Decision:** Previous/Next stay focusable at the bounds and ignore clicks.

**Why:** a native `disabled` button drops out of the tab order; a keyboard user pressing Next on the second-to-last page would lose focus when it becomes disabled.

### D-019 - Other accessibility choices
- Results announce through one polite `role="status"` summary ("Showing 11-20 of 48 customers"); errors use `role="alert"`.
- The results container is the programmatic focus target after "Try again", because the retry button unmounts.
- The table is a focusable, labelled region so keyboard users can scroll it horizontally.
- Status is shown as text in a badge, never by colour alone.

### D-020 - Network data is validated, not asserted
`parseCustomerPage` checks the response shape and status values with type guards, so no `as` assertions or `any` are needed downstream.

---

## README additions

**Running the app:** `npm run dev`. There is no backend; the mock API answers `/api/customers`.
Try searching for `foxglove`, filtering by status, or searching `trigger-error` to see the error and retry state.

**Source layout:**

```
src/
├── api/            customerApi.ts, errors.ts, parseCustomerPage.ts, endpoints.ts
│   └── mock/       customers.ts (dataset), customerQuery.ts, mockFetch.ts, installMockApi.ts
├── components/     one folder per component (tsx + scss + test): SearchBox, StatusFilter,
│                   CustomerTable, Pagination, StatusMessage, CustomerDashboard
├── hooks/          useDebouncedValue.ts, useCustomerSearch.ts
├── styles/         global SCSS only: tokens, reset, base, utilities
├── test/           setup.ts, deferred.ts, fixtures.ts
└── types/          customer.ts
```

**Test map:**

| Requirement | Where |
|---|---|
| Debounce timing | `hooks/useDebouncedValue.test.ts`, `hooks/useCustomerSearch.test.ts`, dashboard integration |
| Request cancellation | `useCustomerSearch.test.ts` ("request cancellation"), dashboard integration, `mockFetch.test.ts` |
| Out-of-order responses | `useCustomerSearch.test.ts` ("stale responses"), dashboard integration |
| Pagination and page reset | `Pagination.test.tsx`, `useCustomerSearch.test.ts`, dashboard integration |
| Status filters | `StatusFilter.test.tsx`, `mockFetch.test.ts`, dashboard integration |
| Loading / error / empty / retry | `StatusMessage.test.tsx`, `useCustomerSearch.test.ts`, dashboard integration |
