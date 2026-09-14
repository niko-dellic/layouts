# Changelog

## 0.1.1

- Keep pane action menus and submenus inside the viewport, including near window edges and during resizing. Oversized menus scroll so every action remains accessible.
- Add stylesheet export declarations for TypeScript 7 and checked side-effect imports, with packed-consumer coverage for TypeScript 5.9 and 7 and React 18.3 and 19.
- Update the README with a workspace settings overview, screenshots, and the recorded demo walkthrough.
- Upgrade the build and test toolchain and GitHub Actions, and validate downloaded release artifacts before publication.

## 0.1.0

Initial public release of Quilt:

- Framework-independent layout model, validation, commands, and subscriptions in `quilt-core`.
- Split panes, tabs, themes, and same-origin popouts in `quilt-vanilla`.
- React 18.3 and 19 components and hooks in `quilt-react`.
- ESM exports, TypeScript declarations, and adapter stylesheet entry points.
