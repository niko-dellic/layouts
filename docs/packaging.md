# Packaging and application integration

## Registry installation

```sh
npm install quilt-dom
# Or, for React:
npm install quilt-react react react-dom
# Model only:
npm install quilt-core
```

Adapters install their Quilt dependencies automatically. Import `quilt-dom/styles.css`
or `quilt-react/styles.css` in browser applications using a bundler with CSS support.

## Local development archives

From a clone of this repository:

```sh
nvm use
npm ci
npm run pack:all
```

The `artifacts/packages/` output directory contains:

- `quilt-core-0.1.0.tgz`
- `quilt-dom-0.1.0.tgz`
- `quilt-react-0.1.0.tgz`
- `manifest.json` recording repository, source commit, working-tree status, and SHA-256 digests.

Pack a clean committed checkout for reproducible application integration. A null commit or `dirty: true` indicates development output, not a verified release source. `npm run test:packed` installs archives in an isolated temporary consumer, checks ESM/declarations/styles, and confirms vanilla installation does not bring React along.

For a vanilla consumer, copy the core and DOM tarballs into its own vendor directory and install both together:

```sh
npm install ./vendor/quilt/quilt-core-0.1.0.tgz \
  ./vendor/quilt/quilt-dom-0.1.0.tgz
```

For React, add the React tarball and the required peers in the same installation:

```sh
npm install ./vendor/quilt/quilt-core-0.1.0.tgz \
  ./vendor/quilt/quilt-dom-0.1.0.tgz \
  ./vendor/quilt/quilt-react-0.1.0.tgz react react-dom
```

Keep those archive files and the consumer lockfile together. Internal package dependencies resolve to the matching local packages when installed together. A subsequent `npm ci` must work without the Quilt checkout. Bump versions when replacing archives for a new release, and restart the consumer's dev server after dependency replacement.

For example, the vanilla consumer's `package.json` records relative archive paths:

```json
{
  "dependencies": {
    "quilt-core": "file:vendor/quilt/quilt-core-0.1.0.tgz",
    "quilt-dom": "file:vendor/quilt/quilt-dom-0.1.0.tgz"
  }
}
```

Application source uses the installed package names, independent of where the
application or original checkout lives:

```ts
import { LayoutStore } from 'quilt-core';
import { mountLayout } from 'quilt-dom';
import 'quilt-dom/styles.css';
```

React applications additionally import `Layout` from `quilt-react`.
These are public exports backed by compiled ESM and TypeScript declarations.
Use an ESM-capable bundler with CSS import support, such as the demos' Vite setup.
Relative paths belong in the installation commands and `file:` dependency values,
not in cross-package source imports. No TypeScript `paths` mapping, bundler alias,
or reference to sibling source files is needed.

## Build and consumer guarantees

Every package's `prepack` builds its dependency chain from source in core → DOM → React
order. Builds first remove that package's old `dist`; CSS is copied with Node filesystem
operations. Direct `npm pack` from a package directory works after a repository `npm ci`,
even without existing compiled output. Packing does not invoke another pack operation.
Source files ship alongside declaration maps for editor navigation; applications still
import public compiled exports, never source paths.

`npm run test:packed` compiles isolated consumers in NodeNext and Bundler modes with
full declaration checking. Core compiles without DOM libraries. React 18.3 and 19 use
matching type packages and exercise mounting, snapshots, popout/return, and cleanup in
Chromium. CSS exports, map targets, vanilla's absence of React, and lockfile reinstalls
are verified. Registry access and a Playwright Chromium installation are required.
React consumers may use `quilt-react/styles.css` and import their store, registry,
and configuration types directly from `quilt-react`.
