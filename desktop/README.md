# Packaged Quilt desktop demo

This app bundles the existing vanilla and React showcase pages and their assets.
It starts at the full vanilla showcase and switches to React through its header.
No network server, Node installation, npm install, or source editing is required
by a person downloading the packaged app.

## Develop and verify

From the repository root with Node 24:

```sh
npm ci
npm run build:desktop
npm run test:desktop
npm run package:desktop
npm run test:desktop -- --packaged
```

Packaging uses the current host architecture by default. The GitHub Desktop demo
workflow packages macOS arm64/x64 DMGs, a Windows x64 portable EXE, and a Linux x64
DEB on matching runners. Packaged smoke tests exercise both framework showcases,
native popouts, theme synchronization, resize, workspace JSON, and cleanup.
Linux requires a display, supplied in CI by Xvfb.

Run the Desktop demo workflow on main with publish enabled to create a separate
`desktop-v<version>` release with binaries and checksums. This does not republish
npm packages or replace their existing release archives. Existing desktop tags
are not overwritten. Bump the desktop release version before replacing a binary.

The host loads only bundled files with sandboxing, context isolation, and no
Node integration. New windows are restricted to Quilt's about:blank companions.
Closing the main window destroys companions. External repository links open in
the system browser. Both framework examples reuse the same application source
as the web demos; desktop-specific HTML changes are limited to navigation.

These builds have no developer certificate and are not notarized. macOS uses an
ad-hoc signature to keep the bundle internally valid after packaging. See the release notes for first-run
OS prompts. Signing should be added separately when certificates become available.
