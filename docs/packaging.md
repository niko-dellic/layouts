# Packaging and application integration

The packages are currently distributed as tarballs, not published to the npm
registry. Install the local archives below to use `layouts-core`, `layouts`, and
`layouts-react`.

From a clone of this repository:

```sh
nvm use
npm ci
npm run build
npm run pack:all
```

The `artifacts/packages/` output directory contains:

- `layouts-core-0.1.0.tgz`
- `layouts-0.1.0.tgz`
- `layouts-react-0.1.0.tgz`
- `manifest.json` recording repository, source commit, working-tree status, and SHA-256 digests.

Pack a clean committed checkout for reproducible application integration. A null commit or `dirty: true` indicates development output, not a verified release source. `npm run test:packed` installs archives in an isolated temporary consumer, checks ESM/declarations/styles, and confirms vanilla installation does not bring React along.

For a vanilla consumer, copy the core and DOM tarballs into its own vendor directory and install both together:

```sh
npm install ./vendor/layouts/layouts-core-0.1.0.tgz \
  ./vendor/layouts/layouts-0.1.0.tgz
```

For React, add the React tarball and the required peers in the same installation:

```sh
npm install ./vendor/layouts/layouts-core-0.1.0.tgz \
  ./vendor/layouts/layouts-0.1.0.tgz \
  ./vendor/layouts/layouts-react-0.1.0.tgz react react-dom
```

Keep those archive files and the consumer lockfile together. Internal package dependencies resolve to the matching local packages when installed together. A subsequent `npm ci` must work without the layouts checkout. Bump versions when replacing archives for a new release, and restart the consumer's dev server after dependency replacement.

For example, the vanilla consumer's `package.json` records relative archive paths:

```json
{
  "dependencies": {
    "layouts-core": "file:vendor/layouts/layouts-core-0.1.0.tgz",
    "layouts": "file:vendor/layouts/layouts-0.1.0.tgz"
  }
}
```

Application source uses the installed package names, independent of where the
application or original checkout lives:

```ts
import { LayoutStore } from 'layouts-core';
import { mountLayout } from 'layouts';
import 'layouts/styles.css';
```

React applications additionally import `Layout` from `layouts-react`.
These are public exports backed by compiled ESM and TypeScript declarations.
Use an ESM-capable bundler with CSS import support, such as the demos' Vite setup.
Relative paths belong in the installation commands and `file:` dependency values,
not in cross-package source imports. No TypeScript `paths` mapping, bundler alias,
or reference to sibling source files is needed.
