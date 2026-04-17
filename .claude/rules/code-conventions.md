---
description: General code conventions for the SendGrid Viewer project.
paths:
  - '**/*.ts'
  - '**/*.tsx'
  - '**/*.astro'
---

# General Code Conventions

## Core Tech Stack
- **Framework**: [Astro](https://astro.build/)
- **UI Architecture**: [React](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Components**: [Shadcn UI](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## Standards
- **TypeScript**: Use strict TypeScript. Avoid `any`.
- **API**: Use **Streaming (NDJSON)** for long-running fetches.
- **State Management**: Prefer React hooks (`useState`, `useEffect`).
- **Templating**: Use `Handlebars` for email template previews.
