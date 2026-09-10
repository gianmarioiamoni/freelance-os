# EPIC-001 --- Foundation / Repository

**Status:** Planned\
**Release:** R0 --- Foundation\
**Epic:** EPIC-001\
**Objective:** Establish the smallest clean, maintainable application
foundation from which all subsequent FreelanceOS Epics can safely
evolve.

------------------------------------------------------------------------

## 1. Purpose

EPIC-001 establishes the technical skeleton of FreelanceOS.

The Epic does **not** implement business functionality. Its purpose is
to create a repository and application baseline that is:

-   understandable
-   maintainable
-   testable
-   reviewable
-   buildable
-   ready for subsequent Foundation Epics

This follows the project methodology's principle that architecture
precedes implementation and that implementation should execute an
already-defined plan rather than redesigning the architecture while
coding.

------------------------------------------------------------------------

# 2. Source Documents

The implementation team must recover context from the repository rather
than from previous conversations.

Relevant documents for this Epic:

``` text
MASTER_PLAN.md

docs/product-vision.md
docs/domain-model.md
docs/architecture.md
docs/storage.md
docs/testing-strategy.md
```

For EPIC-001, the most relevant documents are:

1.  `MASTER_PLAN.md`
2.  `docs/architecture.md`
3.  `docs/testing-strategy.md`

The product and domain documents provide background but should not be
unnecessarily loaded into every implementation chat.

------------------------------------------------------------------------

# 3. Objective

Create the initial FreelanceOS repository and application shell with:

-   Next.js
-   React
-   TypeScript
-   package manager
-   linting
-   formatting
-   environment conventions
-   source structure
-   application shell
-   basic UI foundation
-   test commands
-   build command
-   CI-ready quality gates
-   README foundation

At the end of the Epic, a developer should be able to clone the
repository, configure the required environment, install dependencies,
run the application, run tests, and produce a production build.

------------------------------------------------------------------------

# 4. Scope

## Included

### Repository

-   project initialization
-   source-control conventions
-   `.gitignore`
-   environment example
-   package scripts
-   README

### Application

-   Next.js application
-   React
-   TypeScript
-   App Router baseline
-   root layout
-   basic application shell
-   initial route

### Code organization

Establish the architectural folder boundaries:

``` text
src/
├── app/
├── features/
├── components/
├── domain/
├── application/
├── infrastructure/
└── lib/
```

These directories may initially contain only minimal placeholders where
implementation is not yet required.

### UI foundation

-   Tailwind CSS
-   shadcn/ui foundation
-   typography/layout baseline
-   basic shell
-   accessible structural primitives

### Developer quality

-   lint
-   formatting
-   type checking
-   test command
-   production build command

### Documentation

-   README
-   development instructions
-   environment variables
-   architecture entry points

------------------------------------------------------------------------

# 5. Explicit Non-Goals

EPIC-001 must **not** implement:

-   authentication
-   Google OAuth
-   password recovery
-   workspace creation
-   workspace membership
-   client CRUD
-   contracts
-   time entries
-   dashboard
-   analytics
-   reports
-   billing
-   alerts
-   notifications
-   PostgreSQL schema
-   Prisma schema
-   database migrations
-   AI
-   e-invoicing
-   external integrations

Those concerns belong to later Epics.

A dependency may be installed or minimally configured only when required
to establish the Foundation, but no business behavior should be
implemented.

------------------------------------------------------------------------

# 6. Architectural Constraints

## 6.1 Modular monolith

The repository must support the approved Modular Monolith architecture.

Do not introduce:

-   microservices
-   service-to-service HTTP calls
-   unnecessary distributed infrastructure
-   separate deployable applications

------------------------------------------------------------------------

## 6.2 Layer boundaries

The intended logical structure is:

``` text
Presentation
      ↓
Application
      ↓
Domain
      ↑
Infrastructure
```

EPIC-001 establishes the directories and conventions but does not
implement domain/application functionality prematurely.

------------------------------------------------------------------------

## 6.3 Forbidden dependencies

The following architectural dependencies are forbidden:

``` text
Domain → Prisma
Domain → React
Domain → Next.js

UI → Prisma
UI → direct database

AI → PostgreSQL
AI → arbitrary SQL
```

There is no AI implementation in this Epic, but the repository structure
must not make such coupling the natural path.

------------------------------------------------------------------------

# 7. Repository Structure

Target baseline:

``` text
freelance-os/
├── README.md
├── MASTER_PLAN.md
├── CHANGELOG.md
├── package.json
├── tsconfig.json
├── next.config.*
├── eslint.config.*
├── .gitignore
├── .env.example
│
├── docs/
│   ├── product-vision.md
│   ├── domain-model.md
│   ├── architecture.md
│   ├── storage.md
│   ├── testing-strategy.md
│   └── epics/
│       └── EPIC-001/
│           └── epic-plan.md
│
├── src/
│   ├── app/
│   ├── features/
│   ├── components/
│   │   └── ui/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── lib/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── factories/
│   └── fixtures/
│
└── public/
```

The exact generated configuration filenames may depend on the pinned
framework/tool versions.

Do not force a file into existence solely to match this tree if the
selected toolchain does not require it.

------------------------------------------------------------------------

# 8. Phase Plan

EPIC-001 is divided into four implementation phases.

``` text
Phase 1
Repository Bootstrap
        ↓
Phase 2
Application Shell
        ↓
Phase 3
Developer Quality Baseline
        ↓
Phase 4
Epic Engineering Review
```

Each implementation phase should use a new Cursor chat and have a
focused objective.

------------------------------------------------------------------------

# 9. Phase 1 --- Repository Bootstrap

## Objective

Create the initial Next.js/TypeScript repository and establish project
conventions.

## Scope

Implement:

-   Next.js application
-   React
-   TypeScript
-   selected package manager
-   App Router
-   initial source structure
-   `.gitignore`
-   `.env.example`
-   package scripts
-   initial README
-   initial `CHANGELOG.md` if not already present
-   development startup

## Do not implement

-   business modules
-   database
-   authentication
-   API business endpoints
-   domain logic

## Acceptance Criteria

-   [ ] repository installs successfully
-   [ ] development server starts
-   [ ] TypeScript compilation succeeds
-   [ ] initial page renders
-   [ ] source structure matches architectural intent
-   [ ] no unnecessary dependencies are introduced
-   [ ] environment conventions are documented
-   [ ] README explains how to install and run the project

## Expected Commit

``` text
chore(foundation): bootstrap application repository
```

------------------------------------------------------------------------

# 10. Phase 2 --- Application Shell

## Objective

Establish the initial application shell and UI foundation without
implementing product features.

## Scope

Implement:

-   root layout
-   application shell
-   basic navigation placeholder
-   responsive page container
-   typography baseline
-   Tailwind CSS
-   shadcn/ui foundation
-   basic accessible UI primitives
-   initial home/application page

The shell should visually establish the direction of the product without
pretending that unavailable features already exist.

## UX Principle

Do not create fake dashboard/client/report functionality merely to make
the shell look complete.

Use intentional placeholders where necessary.

## Acceptance Criteria

-   [ ] application shell renders
-   [ ] layout is responsive
-   [ ] typography is consistent
-   [ ] basic UI primitives are accessible
-   [ ] Tailwind is working
-   [ ] shadcn/ui foundation is working
-   [ ] navigation structure can support later features
-   [ ] no business logic is introduced
-   [ ] no direct database dependency exists in UI

## Expected Commit

``` text
feat(ui): establish application shell
```

------------------------------------------------------------------------

# 11. Phase 3 --- Developer Quality Baseline

## Objective

Make the repository safe for iterative engineering.

## Scope

Establish commands for:

``` text
lint
typecheck
test
build
```

Establish the initial test structure:

``` text
tests/
├── unit/
├── integration/
├── e2e/
├── factories/
└── fixtures/
```

Configure the minimum tooling required for the agreed testing strategy.

The full PostgreSQL integration environment may belong to EPIC-002;
EPIC-001 only needs the test architecture and executable baseline
required to prove that the quality pipeline works.

## Acceptance Criteria

-   [ ] lint command executes
-   [ ] typecheck command executes
-   [ ] test command executes
-   [ ] build command executes
-   [ ] at least one meaningful smoke test exists
-   [ ] test directories are established
-   [ ] CI can execute the quality commands
-   [ ] failures return non-zero exit codes
-   [ ] build does not depend on local-only configuration that is
    undocumented

## Expected Commit

``` text
chore(ci): establish development quality gates
```

------------------------------------------------------------------------

# 12. Phase 4 --- Epic Engineering Review

## Objective

Verify that the Foundation is technically healthy before beginning the
next Epic.

This phase is review-only unless corrections are required.

## Review Areas

### Architecture

-   folder boundaries
-   dependency direction
-   unnecessary coupling
-   framework leakage
-   future persistence boundary

### Maintainability

-   naming
-   complexity
-   configuration clarity
-   package selection
-   unnecessary abstractions

### Developer Experience

-   install
-   run
-   test
-   lint
-   typecheck
-   build

### Security Baseline

-   no committed secrets
-   environment variables documented
-   no credentials in source
-   no server-only secrets exposed to browser code

### Documentation

-   README accurate
-   project structure documented
-   commands documented
-   environment configuration documented
-   MASTER_PLAN status ready to update

## Output

Create:

``` text
docs/epics/EPIC-001/engineering-review.md
```

The review must state:

``` text
PASS
```

or:

``` text
CORRECTIONS REQUIRED
```

------------------------------------------------------------------------

# 13. Phase Commit Policy

Default implementation rule:

``` text
One Phase = One meaningful commit
```

Expected commits:

``` text
1. chore(foundation): bootstrap application repository
2. feat(ui): establish application shell
3. chore(ci): establish development quality gates
```

The Engineering Review does not create a commit unless corrective
implementation is required.

If corrections are required, they must be planned as a focused
corrective phase rather than mixed into unrelated work.

------------------------------------------------------------------------

# 14. Implementation Prompt Contract

Every Cursor implementation prompt for this Epic must explicitly state:

``` text
New Cursor chat: YES
Commit expected: YES
```

Then provide:

``` text
Context
Mission
Implementation requirements
Acceptance criteria
Output format
Commit message
```

The prompt must cover **one phase only**.

Do not ask Cursor to:

``` text
plan + implement + review + QA + document
```

in one conversation.

------------------------------------------------------------------------

# 15. Testing Requirements

EPIC-001 establishes the testing foundation rather than the full
business test suite.

Minimum required tests:

### Application smoke test

Verify the application can render the initial route.

### Configuration/tooling test

Verify the expected test command succeeds in a clean development
environment.

### Build validation

Verify production build succeeds.

### Architectural smoke check

Where practical, verify that the initial structure does not introduce
forbidden imports.

Business invariants are deferred to the relevant Epics.

------------------------------------------------------------------------

# 16. Definition of Done --- Phase

A phase is complete when:

-   [ ] implementation matches the phase scope
-   [ ] acceptance criteria pass
-   [ ] relevant tests pass
-   [ ] lint passes
-   [ ] typecheck passes
-   [ ] build passes where applicable
-   [ ] no unrelated functionality was introduced
-   [ ] documentation is updated if required
-   [ ] commit is created with the planned message
-   [ ] Product Owner/Engineering Advisor review can begin

------------------------------------------------------------------------

# 17. Definition of Done --- EPIC-001

EPIC-001 is complete when:

### Repository

-   [ ] repository structure established
-   [ ] application starts
-   [ ] README exists and is accurate
-   [ ] environment conventions documented
-   [ ] no secrets committed

### Architecture

-   [ ] Modular Monolith structure established
-   [ ] layer boundaries visible
-   [ ] forbidden dependency patterns avoided
-   [ ] no premature business architecture introduced

### UI

-   [ ] application shell exists
-   [ ] Tailwind configured
-   [ ] shadcn/ui foundation configured
-   [ ] responsive baseline works
-   [ ] accessible structural components exist

### Quality

-   [ ] lint passes
-   [ ] typecheck passes
-   [ ] tests pass
-   [ ] production build passes
-   [ ] CI-ready commands exist

### Review

-   [ ] Engineering Review completed
-   [ ] no unresolved Release Blocker
-   [ ] technical debt documented
-   [ ] MASTER_PLAN ready to move to EPIC-002

------------------------------------------------------------------------

# 18. Risks

## Risk R001 --- Overengineering the foundation

### Risk

Creating excessive abstractions before the first business feature.

### Mitigation

Build only the boundaries required by the approved architecture.

------------------------------------------------------------------------

## Risk R002 --- Premature database implementation

### Risk

Introducing Prisma/database behavior into the repository before
EPIC-002.

### Mitigation

Keep EPIC-001 focused on repository/application foundation.

------------------------------------------------------------------------

## Risk R003 --- UI pretending to be complete

### Risk

Building fake dashboard/client features simply to demonstrate visual
progress.

### Mitigation

Create only the shell and intentional placeholders.

------------------------------------------------------------------------

## Risk R004 --- Dependency sprawl

### Risk

Installing libraries "for later".

### Mitigation

Every dependency must have a current Foundation purpose.

------------------------------------------------------------------------

## Risk R005 --- Architecture drift

### Risk

Framework conventions gradually collapse the intended layer boundaries.

### Mitigation

Review imports and directory responsibilities during Engineering Review.

------------------------------------------------------------------------

# 19. Decisions Required Before or During EPIC-001

The following should be finalized before implementation reaches the
relevant point.

## Technical

### TD-001 --- Package manager

Candidate:

``` text
pnpm
```

Decision must be recorded in the implementation baseline.

### TD-002 --- Exact dependency versions

Versions must be pinned during Foundation setup.

### TD-003 --- Deployment target

Candidate:

``` text
Vercel
```

Production deployment is not implemented in this Epic, but assumptions
should not conflict with the architecture.

------------------------------------------------------------------------

# 20. Explicitly Deferred Decisions

These are not required to complete EPIC-001:

-   PostgreSQL schema details
-   Prisma model details
-   contract billing rules
-   daily-rate partial-day semantics
-   money rounding
-   holiday model
-   vacation model
-   period closure
-   audit log
-   workspace permission matrix beyond what is needed for Foundation
-   multi-currency reporting
-   AI behavior
-   e-invoicing

These remain governed by the architecture/storage/domain documents and
later Epic plans.

------------------------------------------------------------------------

# 21. Engineering Review Checklist

The reviewer should inspect:

``` text
[ ] package.json
[ ] tsconfig
[ ] Next.js configuration
[ ] lint configuration
[ ] test configuration
[ ] source tree
[ ] app shell
[ ] environment configuration
[ ] README
[ ] gitignore
[ ] CI configuration, if included
```

And answer:

### Architecture

``` text
Does the repository reflect the approved architecture?
```

### Maintainability

``` text
Can a new engineer understand the project quickly?
```

### Simplicity

``` text
Did the implementation introduce anything not required by the Epic?
```

### Quality

``` text
Can the project be linted, typechecked, tested and built reliably?
```

### Security

``` text
Are secrets and server-only configuration protected?
```

------------------------------------------------------------------------

# 22. QA Preparation

EPIC-001's QA should remain proportionate to the Foundation.

Minimum QA should verify:

``` text
clean install
→ development start
→ page rendering
→ lint
→ typecheck
→ test
→ production build
```

The full QA strategy defined in `docs/testing-strategy.md` becomes
increasingly relevant from EPIC-002 onward.

------------------------------------------------------------------------

# 23. Documentation Updates After Completion

After EPIC-001:

### MASTER_PLAN.md

Update:

``` text
EPIC-001 status → complete
current Epic → EPIC-002
```

### CHANGELOG.md

Record the Foundation changes.

### README.md

Reflect actual setup and execution instructions.

### Architecture documents

Only update if implementation revealed a real architectural change.

Do not rewrite architecture documentation merely to document unchanged
behavior.

------------------------------------------------------------------------

# 24. Expected Deliverables

At Epic completion:

``` text
README.md
CHANGELOG.md

src/
  application/
  components/
  domain/
  features/
  infrastructure/
  lib/
  app/

tests/
  unit/
  integration/
  e2e/
  factories/
  fixtures/

docs/epics/EPIC-001/
├── epic-plan.md
└── engineering-review.md
```

A QA report is generated after implementation and engineering review.

UX review is performed after QA.

Production validation is performed only at the appropriate release gate.

------------------------------------------------------------------------

# 25. Epic Exit Sequence

The exact sequence is:

``` text
Phase 1
Repository Bootstrap
        ↓
Phase 2
Application Shell
        ↓
Phase 3
Developer Quality
        ↓
Engineering Review
        ↓
QA
        ↓
Documentation Update
        ↓
EPIC-001 COMPLETE
        ↓
EPIC-002 PLAN
```

Do not start EPIC-002 implementation before EPIC-001 has passed its
completion gate.

------------------------------------------------------------------------

# 26. Next Epic

The next Epic is:

``` text
EPIC-002 — Database & Persistence
```

Its objective will be to implement the storage architecture defined in:

``` text
docs/storage.md
```

including:

-   PostgreSQL
-   Prisma
-   application-owned schema
-   migrations
-   workspace-scoped persistence
-   Client
-   Contract
-   TimeEntry
-   Alert
-   Notification
-   WorkspaceSettings
-   database constraints
-   indexes
-   seed data
-   repository implementations
-   persistence integration tests

EPIC-002 should receive its own detailed Epic Plan before
implementation.

------------------------------------------------------------------------

# 27. Status

``` yaml
epic: EPIC-001
name: Foundation / Repository
release: R0
status: planned
implementation_started: true
engineering_review: not-started
qa: not-started
ux_review: not-started
production_validation: not-started
next_epic: EPIC-002
```

------------------------------------------------------------------------

# 28. Final Principle

EPIC-001 is successful if it makes the **next Epic easier and safer**,
not if it contains a large amount of code.

The desired result is a small, clean foundation:

``` text
simple
      +
well structured
      +
testable
      +
documented
      +
ready to evolve
```

No business complexity should be introduced before it is required.
