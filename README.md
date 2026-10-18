# Customer Search Dashboard

A responsive customer search dashboard built with React, TypeScript, Vite and SCSS. This project demonstrates frontend engineering practices for handling search, filtering, pagination, asynchronous API requests and accessible user interfaces.

## Features

- **Debounced search** to reduce unnecessary API requests while typing.
- **Status filtering** for Active, Inactive and Pending customers, with an All option.
- **Pagination** to navigate customer results.
- **Automatic page reset** when the search query or status filter changes.
- **Loading, empty and error states**, including retry functionality.
- **Request cancellation** using `AbortController`.
- **Stale-response protection** to prevent older requests from overwriting newer results.
- **Responsive design** for desktop and mobile screens.
- **Accessibility** through semantic HTML, accessible labels, keyboard-friendly controls and appropriate status announcements.
- **Automated tests** for key interactions, filtering and asynchronous request behaviour.

## Tech Stack

- React
- TypeScript
- Vite
- SCSS with BEM naming conventions
- Vitest
- React Testing Library
- `@testing-library/user-event`
- ESLint

## Getting Started

### Requirements

- Node.js 20.11 or later
- npm 10 or later

### Installation

Clone the repository and navigate to the project directory.

```bash
npm install
npm run dev
