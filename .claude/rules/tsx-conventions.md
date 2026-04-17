---
description: Specific conventions for React (TSX) components using Shadcn and Tailwind.
paths:
  - '**/*.tsx'
---

# React & UI Conventions

## Shadcn UI & Components
- Always use Shadcn UI components from `@/components/ui/` whenever possible.
- Use `lucide-react` for all icons.
- Ensure components are accessible (Shadcn handled).

## Styling
- Use Tailwind CSS utility classes.
- Use the `cn` helper for conditional classes.
- Prefer `grid` and `flex` layouts over absolute positioning.

## Previewing
- When rendering email HTML, use an `iframe` with `srcDoc`.
- Ensure the preview is isolated and safe.

## Logic
- Use `Handlebars` for template merging on the client side.
- Handle JSON parsing errors gracefully with try/catch.
- Persist user data (like test variables) in `localStorage` keyed by template/account.
