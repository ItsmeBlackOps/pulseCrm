# Agent Instructions

This repository uses Node.js with Vite and TypeScript.

- Install dependencies with `npm install`.
- Run `npm run dev` to start the development server.
- Lint all code with `npm run lint` before committing.
- When test infrastructure is added, run tests with `npm run test`.
- Keep dependencies up to date with the latest stable versions.

Ensure new features include unit tests once testing is configured.

## Architectural Guidelines

- Adopt a modular, layered architecture (e.g. presentation, business logic, data access).
- Use Domain-Driven Design (DDD) concepts to model sales leads and RBAC entities.
- Define clear service boundaries (microservices or well-scoped modules).
- Apply the Single Responsibility Principle to each component.
- Define roles, permissions, and scopes upfront aligned to your sales-lead workflows.
- Implement the principle of least privilege for every role.
- Store role-permission mappings in a centralized policy store or database.
- Support dynamic role assignment via admin UI or API.
