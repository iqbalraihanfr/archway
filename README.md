# Archway

**Archway** is a local-first architecture workspace for turning rough product ideas into structured implementation assets before you start coding.

It helps you move from:

- brief
- requirements
- user stories
- use cases
- diagrams
- validation
- generated tasks
- exportable documentation

All inside one visual workspace.

## What Archway is for

Archway is designed for the pre-coding phase of a project:

- clarifying project goals
- documenting scope
- tracing requirements into stories and use cases
- shaping data and flow diagrams
- surfacing consistency issues
- generating task breakdowns
- exporting architecture documentation

Instead of treating architecture notes, diagrams, and task planning as separate tools, Archway keeps them connected in one graph-based workflow.

## Core product features

### 1. Visual node-based workspace

Each project is represented as a connected architecture flow.  
You work through nodes such as:

- `Project Brief`
- `Requirements`
- `User Stories`
- `Use Cases`
- `Flowchart`
- `DFD`
- `ERD`
- `Sequence`
- `Task Board`
- `Summary`

You can:

- open a node from the canvas
- edit content in a side panel
- move around the workspace visually
- track completion status per node
- continue from the recommended next node

### 2. Guided editors as source of truth

For supported nodes, Archway provides structured editors instead of relying only on freeform notes.

Examples:

- **Project Brief**: name, background, objectives, target users, scope, success metrics, constraints, tech stack, references
- **Requirements**: FR/NFR breakdown, priority, category, related scope
- **User Stories**: role, goal, benefit, related requirement, acceptance criteria
- **Use Cases**: actors, main flow, alternative flows, related user stories
- **ERD**: entities, attributes, relationships
- **Flowchart**: flows, steps, connections
- **DFD**: processes, entities, data stores, data flows
- **Sequence**: participants, messages, groups, related use case

The guided data drives:

- validation
- summary generation
- coverage metrics
- task generation
- export output
- diagram generation support

### 3. Mermaid-assisted diagram workflow

Archway supports Mermaid-backed diagram work for architecture nodes.

You can work with:

- generated diagram content
- manual Mermaid edits
- live diagram preview
- export-ready visual documentation

This is useful for nodes like:

- `Flowchart`
- `ERD`
- `DFD`
- `Sequence`

### 4. SQL-aware ERD workflow

The ERD flow is not just visual. Archway also supports schema-oriented thinking through:

- entities
- attributes
- relationships
- SQL schema notes
- summary inclusion for schema sections

This makes the ERD node useful both for product planning and implementation handoff.

### 5. Cross-node validation

Archway checks consistency between nodes and surfaces validation issues such as:

- missing requirements
- target users with no user stories
- scope items not covered by requirements
- functional requirements without user stories
- user stories without use cases
- use cases without flowcharts
- use cases without sequence coverage
- ERD entities not represented in DFD data stores

Validation is grouped by severity:

- `error`
- `warning`
- `info`

This helps you spot architecture gaps before implementation starts.

### 6. Task Board with generated implementation tasks

Archway can generate project tasks from structured node content.

Examples of task generation sources:

- user stories
- ERD entities and relationships
- sequence messages and API endpoints
- flowchart steps

The task board supports:

- generated tasks
- manual tasks
- task grouping
- priority tracking
- status tracking
- duplicate detection
- export options

This gives you a bridge from architecture into execution planning.

### 7. Summary node for architecture review

The `Summary` node compiles architecture information across the workspace into a review-friendly document view.

It includes:

- project readiness state
- node completion overview
- task summary
- validation summary
- API endpoint listing
- architecture documentation by node
- coverage metrics across major flows

This is useful as a final review surface before coding or handoff.

### 8. Export support

Archway includes export flows for architecture and planning artifacts.

Available exports in the app include:

- project documentation as Markdown
- project documentation as PDF
- task exports as Markdown
- task exports as CSV
- task exports as JSON
- task exports in Linear-friendly CSV format
- diagram export to PNG

### 9. Local-first project storage

Archway stores workspace data locally in the browser using IndexedDB via Dexie.

That means:

- fast local iteration
- no required backend for basic usage
- persistent project workspaces on your machine
- offline-friendly architecture drafting

## Project templates

Archway currently supports two workspace modes.

### Quick Start

Best for:

- solo projects
- prototypes
- MVP planning
- client work
- lightweight internal tools

Flow:

1. `Project Brief`
2. `Requirements`
3. `ERD`
4. `Task Board`
5. `Summary`

This path is optimized for speed and a lower documentation burden.

### Full Architecture

Best for:

- deeper planning
- cross-functional handoff
- more complex feature design
- systems that need behavioral and structural documentation

Flow:

1. `Project Brief`
2. `Requirements`
3. `User Stories`
4. `Use Cases`
5. `Flowchart`
6. `DFD`
7. `ERD`
8. `Sequence`
9. `Task Board`
10. `Summary`

This path provides more traceability from business intent to implementation detail.

## Recommended workflow

## Quick architecture workflow

Use this when you want to move fast.

### Step 1 — Fill the Project Brief

Capture:

- project context
- why the project exists
- who it serves
- what is in scope
- what is out of scope
- success metrics

This is the foundation for everything downstream.

### Step 2 — Define Requirements

Document:

- core functional requirements
- at least one non-functional requirement
- priority levels
- category
- scope alignment

This becomes the main implementation contract.

### Step 3 — Shape the ERD

Define:

- entities
- fields
- key relationships
- optional schema notes

Use this to establish the data model early.

### Step 4 — Generate and refine tasks

Open the `Task Board` to:

- review generated tasks
- add manual tasks
- regroup work
- prioritize implementation

### Step 5 — Review the Summary

Use the `Summary` node to confirm:

- documentation completeness
- readiness state
- major architecture sections
- generated endpoint/task visibility
- outstanding validation issues

## Full architecture workflow

Use this when you need deeper coverage and traceability.

### Step 1 — Start from the Project Brief

Document business context first.

Recommended focus:

- target users
- scope in
- scope out
- objectives
- constraints

This improves the quality of every downstream editor.

### Step 2 — Define Requirements

Split requirements clearly into:

- FRs
- NFRs

Use priorities and categories consistently so the project stays reviewable.

### Step 3 — Convert requirements into User Stories

Use stories to express:

- actor
- goal
- benefit
- linked requirement
- acceptance criteria

This creates a clean trace from requirement to user-facing intent.

### Step 4 — Build Use Cases

Translate stories into system interaction flows:

- actors
- main flow
- alternate flows
- related user stories
- include/extend relationships

This layer helps you bridge product behavior and system design.

### Step 5 — Add Flowcharts

Use flowcharts to visualize procedural flows behind use cases.

Helpful for:

- decision branches
- happy path vs alternate path
- process sequencing

### Step 6 — Add DFD

Use DFD to model:

- external entities
- processes
- data stores
- data movement

This helps validate system boundaries and information exchange.

### Step 7 — Define ERD

Build the data model:

- entities
- attributes
- keys
- relationships

Then check whether DFD data stores align with ERD entities.

### Step 8 — Add Sequence coverage

Use sequence diagrams to describe runtime interaction:

- participants
- messages
- API interactions
- grouped branches like `alt`, `opt`, and `loop`

This is especially useful for backend and API planning.

### Step 9 — Review generated tasks

The task board can now reflect richer architecture inputs, including:

- feature work
- database work
- API work
- testing work
- integration work

### Step 10 — Final review in Summary

Before implementation, use the `Summary` node to review:

- node completion
- validation state
- architecture sections
- coverage consistency
- API endpoint visibility
- readiness to build

## How to use Archway

### Create a new project

From the dashboard:

1. click **New Project**
2. enter a project name
3. optionally add a short description
4. choose `Quick Start` or `Full Architecture`
5. create the workspace

### Work inside the workspace

Once inside a workspace, you can:

- click a node to open its editor
- use the **Guided** tab as the main source of truth
- move between nodes from the visual graph
- jump to the recommended next node
- open validation review
- use search/jump helpers
- fit the canvas view
- export documentation when ready

### Manage node progress

Each node has a status:

- `Empty`
- `In Progress`
- `Done`

A healthier workflow is:

- mark `In Progress` when drafting
- mark `Done` only after the node is coherent and reviewed

### Use validation as a quality gate

Treat validation as architecture feedback, not just warning noise.

A good review loop is:

1. fill the current node
2. inspect validation
3. fix cross-node gaps
4. continue downstream
5. review the `Summary` node before coding

### Use the task board as execution handoff

After enough structure exists, open `Task Board` to:

- inspect generated tasks
- add missing manual work
- change status and priority
- export for external planning tools

## Typical use cases

Archway works well for:

- solo founders planning MVPs
- freelancers preparing client builds
- developers clarifying architecture before implementation
- teams wanting a lightweight architecture workspace
- internal product/tool planning
- transforming structured analysis into executable task plans

## Tech stack

From the current app setup, Archway is built with:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Dexie / IndexedDB
- React Flow
- Mermaid
- shadcn/ui

## Getting started locally

### Requirements

You’ll need:

- Node.js
- npm

### Install dependencies

```/dev/null/install.sh#L1-2
npm install
```

### Start the development server

```/dev/null/dev.sh#L1-2
npm run dev
```

Then open:

```/dev/null/url.txt#L1-1
http://localhost:3000
```

### Lint the project

```/dev/null/lint.sh#L1-2
npm run lint
```

## Product mindset

Archway is most effective when you treat it as:

- a pre-coding workspace
- a thinking-to-building bridge
- a traceability tool
- a task generation base
- a review layer before implementation

The strongest workflow is:

1. structure the brief
2. connect downstream nodes
3. review validation
4. refine summary
5. export and build

## Current workflow guidance

If you are unsure which template to pick:

- choose **Quick Start** for speed
- choose **Full Architecture** for completeness and traceability

If you are unsure where to spend effort:

- prioritize `Project Brief`
- then `Requirements`
- then whichever downstream nodes your delivery style actually needs

## In short

Archway helps you turn architecture from scattered notes into a connected working system of:

- structured planning
- visual design
- consistency checking
- implementation task generation
- exportable documentation

It is the bridge between **thinking** and **building**.