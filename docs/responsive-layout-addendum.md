# Responsive layout: addendum

Does not replace `README.md` or `docs/decision-log.md`; merge the entries below when ready.

## D-021 - Responsive strategy: desktop-first overrides at the end of each component stylesheet
**Context:** the desktop design was good; mobile was broken. Rewriting base styles risked regressions.

**Decision:** base rules stay as the desktop design. Each component's SCSS ends with `@media (max-width: ...)` blocks that override only what must change. Inside media queries, selectors are written as flat full BEM class names (`.pagination__button`), not `&`-nested, so nesting stays one level deep and specificity stays at one class. Breakpoints:

| Range | Rule |
|---|---|
| Desktop, 1024px and up | base styles, no media query |
| Tablet, 768-1023px | `max-width: $tablet-max` (63.9375rem) |
| Mobile, 320-767px | `max-width: $mobile-max` (47.9375rem), placed after the tablet rules so it wins |

The two values live in `src/styles/_breakpoints.scss` as Sass variables (CSS custom properties cannot be used in `@media`, per D-006). The partial emits no CSS; components pull it in with `@use '../../styles/breakpoints' as bp;`.

**Trade-off:** desktop-first means mobile devices parse some overridden rules. At this size that cost is negligible, and it keeps the desktop diff nearly empty.

## D-022 - Root causes found, and the fix for each
1. **Page overflowed horizontally.** `.customer-dashboard` was a grid with an implicit `auto` column, which will not shrink below its widest child (the table's `min-width: 42rem`). Fix: `grid-template-columns: minmax(0, 1fr)`, so the table scrolls inside its own container instead of stretching the page. This also adds `min-width: 0` to the search flex item.
2. **Pagination needed about 330px** (fixed `min-width: 7rem` status plus two buttons). Fix on mobile: a two-column grid; "Page X of Y" spans the top row, Previous and Next share the second. `order: -1` moves the status visually only; tab order is unchanged.
3. **Small touch targets** (radio labels about 24px, buttons and input about 42px). Fix on mobile: 44px (`2.75rem`) minimum for the search input, filter tiles, pagination buttons and the retry button. The status filter becomes a 2 x 2 grid of tiles whose whole area is the tap target (the radio sits inside its label).
4. **No sign the table scrolls.** Fix at tablet width and below: CSS "scroll shadows" (opaque `local` background layers over `scroll` shadow layers) show a shadow only on the side that has more columns. No markup changes. On mobile, cells do not wrap (`white-space: nowrap`), so names, emails, badges and dates stay readable and the container scrolls; `overscroll-behavior-x: contain` stops a table swipe from triggering browser back navigation.
5. **Spacing.** Smaller page padding and title on mobile, tighter table cell padding, a shorter minimum results height, and `overflow-wrap: anywhere` on status message text so a long unbroken string cannot overflow.

**Not done, deliberately:** turning table rows into stacked cards on mobile. That needs `data-label` markup and `display: block` on table elements, which removes table semantics in some browsers and assistive technology. A scrolling table keeps the semantics and the tests.

**Possible follow-up:** a visible "Scroll sideways" hint would need a wrapper element around the table (the scroll container is currently the same element as the labelled region, and tests rely on that). Worth doing only if the shadows prove too subtle in real use.

## Manual responsive checklist
Chrome DevTools > Toggle device toolbar, at 320, 375, 414, 768, 1024 and 1440px wide:

- [ ] No horizontal page scrollbar at any width (only the table scrolls)
- [ ] 320px: search is full width; filters form a 2 x 2 grid; pagination shows the status line above two equal buttons
- [ ] 320px: table scrolls sideways with a shadow on the edge that has more content; email, status and date do not wrap
- [ ] Loading, empty and error states (search `trigger-error`) fit the viewport with a 44px "Try again" button
- [ ] 768-1023px: controls wrap naturally; table padding is tighter
- [ ] 1024px and up: identical to before
- [ ] Browser zoom at 200% and 400% still has no horizontal page scroll
- [ ] Tab through the page at 320px; focus rings are visible and order is Previous, Next (status text is not focusable)
