# Graph Report - /Users/aadidev/CODE/timeSync-willwork  (2026-08-06)

## Corpus Check
- Corpus is ~9,657 words - fits in a single context window. You may not need a graph.

## Summary
- 102 nodes · 107 edges · 24 communities (15 shown, 9 thin omitted)
- Extraction: 78% EXTRACTED · 22% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_Dialog Components|Dialog Components]]
- [[_COMMUNITY_Timetable Editing|Timetable Editing]]
- [[_COMMUNITY_Main App Flow|Main App Flow]]
- [[_COMMUNITY_Google Calendar Sync|Google Calendar Sync]]
- [[_COMMUNITY_Project Metadata|Project Metadata]]
- [[_COMMUNITY_Semester Selection|Semester Selection]]
- [[_COMMUNITY_Image Parsing|Image Parsing]]
- [[_COMMUNITY_Project Instructions|Project Instructions]]
- [[_COMMUNITY_Document Asset|Document Asset]]
- [[_COMMUNITY_Vercel Asset|Vercel Asset]]
- [[_COMMUNITY_Next Asset|Next Asset]]
- [[_COMMUNITY_Globe Asset|Globe Asset]]
- [[_COMMUNITY_Window Asset|Window Asset]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 25 edges
2. `Next.js Project` - 5 edges
3. `getAuthToken()` - 4 edges
4. `POST()` - 4 edges
5. `App()` - 3 edges
6. `getToday()` - 2 edges
7. `getEndOfSemester()` - 2 edges
8. `isRateLimited()` - 2 edges
9. `POST()` - 2 edges
10. `firstOccurrence()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `DialogOverlay()` --calls--> `cn()`  [INFERRED]
  src/components/ui/dialog.jsx → src/lib/utils.js
- `DialogContent()` --calls--> `cn()`  [INFERRED]
  src/components/ui/dialog.jsx → src/lib/utils.js
- `DialogHeader()` --calls--> `cn()`  [INFERRED]
  src/components/ui/dialog.jsx → src/lib/utils.js
- `DialogFooter()` --calls--> `cn()`  [INFERRED]
  src/components/ui/dialog.jsx → src/lib/utils.js
- `DialogTitle()` --calls--> `cn()`  [INFERRED]
  src/components/ui/dialog.jsx → src/lib/utils.js

## Communities (24 total, 9 thin omitted)

### Community 0 - "UI Primitives"
Cohesion: 0.12
Nodes (19): cn(), Button(), Card(), CardAction(), CardContent(), CardDescription(), CardFooter(), CardHeader() (+11 more)

### Community 1 - "Dialog Components"
Cohesion: 0.18
Nodes (6): DialogContent(), DialogDescription(), DialogFooter(), DialogHeader(), DialogOverlay(), DialogTitle()

### Community 3 - "Main App Flow"
Cohesion: 0.28
Nodes (3): App(), getEndOfSemester(), getToday()

### Community 4 - "Google Calendar Sync"
Cohesion: 0.52
Nodes (6): DELETE(), eventDateTime(), firstOccurrence(), GET(), getAuthToken(), POST()

### Community 5 - "Project Metadata"
Cohesion: 0.29
Nodes (7): app/page.js, create-next-app, Development Server, Geist Font, next/font, Next.js Project, Vercel Platform

## Knowledge Gaps
- **12 isolated node(s):** `create-next-app`, `Development Server`, `app/page.js`, `Geist Font`, `Vercel Platform` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `UI Primitives` to `Dialog Components`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Are the 24 inferred relationships involving `cn()` (e.g. with `DialogOverlay()` and `DialogContent()`) actually correct?**
  _`cn()` has 24 INFERRED edges - model-reasoned connections that need verification._
- **What connects `create-next-app`, `Development Server`, `app/page.js` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Primitives` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._