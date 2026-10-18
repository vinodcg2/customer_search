
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
git clone https://github.com/vinodcg2/customer_search.git
cd customer_search
npm install
```

### Run the Development Server

Start the local development server.

```bash
npm run dev
```

Open the local URL displayed in the terminal to view the application in your browser.

### Run Tests

Run the automated test suite.

```bash
npm test
```

### Code Quality and Production Build

Run the available checks individually.

```bash
npm run lint
npm run typecheck
npm run build
```

To run all project checks together, use:

```bash
npm run check
```

### API Behaviour

The project uses a mock customer API to demonstrate search, filtering, pagination and asynchronous request handling without requiring an external backend service.

The mock API supports testing loading and error states, request cancellation and protection against stale responses.

## Project Goals

This project demonstrates practical frontend engineering skills, including component organisation, TypeScript usage, responsive styling, accessible interactions, asynchronous state management and automated testing.
