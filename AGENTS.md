# Quilt contributor guide

Keep the core package framework-independent and free of browser APIs. The DOM renderer owns chrome and interactions; React bindings reuse it. Applications own pane content and data.

Use strict TypeScript and Node 24. Build before running demos: they resolve compiled package outputs. Keep package imports public; never alias an application to sibling source files.

Layout JSON is versioned. Commands validate atomically. Keep pane IDs stable and preserve content when joining or moving regions. Every listener, observer, React root, timer, and companion window needs explicit cleanup.

Popouts are one-pane same-origin companion windows owned by the main session. Opening requires a user action. Failure must preserve the original view. Data lives outside renderer lifetimes. Do not silently turn view unmounts into application-data deletion or job cancellation.

Run `npm run check` before publication. Keep source stable during browser tests. Read docs/lifecycle.md before changing pane or popout ownership.
