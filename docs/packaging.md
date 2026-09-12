# Local tarballs and future application integration

```sh
nvm use
npm ci
npm run build
npm run pack:all
```

The output directory contains:

- `niko-dellic-layouts-core-0.1.0.tgz`
- `niko-dellic-layouts-0.1.0.tgz`
- `niko-dellic-layouts-react-0.1.0.tgz`
- `manifest.json` recording repository, source commit, working-tree status, and SHA-256 digests.

Pack a clean committed checkout for reproducible application integration. A null commit or `dirty: true` indicates development output, not a verified release source. `npm run test:packed` installs archives in an isolated temporary consumer, checks ESM/declarations/styles, and confirms vanilla installation does not bring React along.

For a vanilla consumer, copy the core and DOM tarballs into its own vendor directory and install both together:

```sh
npm install ./vendor/layouts/niko-dellic-layouts-core-0.1.0.tgz \
  ./vendor/layouts/niko-dellic-layouts-0.1.0.tgz
```

For React, add the React tarball and the required peers in the same installation:

```sh
npm install ./vendor/layouts/niko-dellic-layouts-core-0.1.0.tgz \
  ./vendor/layouts/niko-dellic-layouts-0.1.0.tgz \
  ./vendor/layouts/niko-dellic-layouts-react-0.1.0.tgz react react-dom
```

Keep those archive files and the consumer lockfile together. Internal package dependencies resolve to the matching local packages when installed together. A subsequent `npm ci` must work without the layouts checkout. Bump versions when replacing archives for a new release, and restart the consumer's dev server after dependency replacement.

No PreFORM integration is part of this repository's initial delivery. Evaluate the two demos and the pane lifecycle contract before choosing vanilla or React integration there.
