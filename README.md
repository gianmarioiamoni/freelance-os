# FreelanceOS

FreelanceOS is a web application for freelancer operations management.

## Status

Release 0 — Foundation. EPIC-001 Phase 1 (Repository Bootstrap) is in progress.

Planning and architecture documents are the source of truth. See [`MASTER_PLAN.md`](./MASTER_PLAN.md).

## Prerequisites

- Node.js 20 or later
- [pnpm](https://pnpm.io) 10 or later

## Installation

```bash
pnpm install
```

No application environment variables are required for the current bootstrap. Copy `.env.example` to `.env.local` when later Foundation work introduces variables.

## Commands

| Command          | Description                        |
| ---------------- | ---------------------------------- |
| `pnpm dev`       | Start the development server       |
| `pnpm build`     | Create a production build          |
| `pnpm start`     | Start the production server        |
| `pnpm lint`      | Run ESLint                         |
| `pnpm typecheck` | Run TypeScript type checking       |
| `pnpm format`    | Format project files with Prettier |

## Repository structure

```text
freelance-os/
├── README.md
├── MASTER_PLAN.md
├── CHANGELOG.md
├── docs/
├── src/
│   ├── app/
│   ├── features/
│   ├── components/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── lib/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── public/
```

Canonical technical documentation lives under `docs/`.
