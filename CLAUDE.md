# Project Core Principles
- **Style:** Functional & Declarative.
- **Node.js:** CommonJS (`require`/`module.exports`).
- **Goal:** Expressive, testable, immutable code.

# Coding Standards
- **Paradigm:** Use functional programming patterns (`map`, `filter`, `reduce`, `flatMap`).
- **No Classes:** Prefer functions, pure functions, and data objects.
- **Immutability:** Use `const` always; avoid `let` and `var`. Do not mutate objects/arrays. Use `Object.freeze()` when appropriate — note that it is shallow, so deep-clone nested objects before mutation.
- **Naming:** camelCase for variables/functions, snake_case for directories.
- **Async:** Use `async/await`.
- **HTTP:** Use the native `fetch` API. Check `response.ok` before reading the body.
- **Strictness:** Always include `'use strict';`.
- **Linting and Formatting:** No eslint/prettier config exists yet. If added, follow the project config.

# Node.js
- Compose small, pure functions. Avoid shared mutable state.

# Directory Structure
- `/api` — Express API entry point and routes (`index.js`).
- `/api/services` — Data access and shared constants (fetch-based ES client).
- `/api/controllers` — Stateless business logic (currently empty).
- `/test` — Mocha tests with sinon stubs for fetch.

# Commands
- Test: `npm test`
- Dev: `npm run dev`

# Prohibitions
- DO NOT use classes or `this`.
- Prefer `map`, `filter`, `reduce`; `for...of` / `for await...of` is allowed when sequential async processing requires it.
- Avoid `console.log` in business logic — use a dedicated logger when available (not yet set up).
