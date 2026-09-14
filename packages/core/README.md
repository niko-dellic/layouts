# layouts-core

Framework-independent layout JSON, validation, commands, and subscriptions. No DOM or React dependency. MIT licensed; ships ESM, TypeScript declarations, and sources for editor navigation.

## Install

Not yet published to npm. In the repository, use Node 24, run `npm ci` and `npm run pack:all`, then copy the core archive listed in `artifacts/packages/manifest.json` into your application's `vendor/` directory:

```sh
npm install ./vendor/layouts-core-<version>.tgz
```

Replace `<version>` with the archive's version. Keep the archive and lockfile together.

## Use

```ts
import { createLayout, LayoutStore, validate } from 'layouts-core';

const store = new LayoutStore(
  createLayout({
    pane: { id: 'notes', type: 'notes', title: 'Notes' },
  }),
);
const unsubscribe = store.subscribe(({ action, layout }) => {
  console.log(action, JSON.stringify(layout));
});
store.split('main', 'horizontal', { id: 'preview', type: 'preview', title: 'Preview' });
console.log(validate(store.export())); // []
unsubscribe();
store.dispose();
```

`createLayout()` returns a fresh empty layout. `createLayout({ pane, groupId })` returns a validated clone, activates the supplied pane, and defaults `groupId` to `main`. It preserves IDs and throws `LayoutError` for invalid input. `parseLayout` validates complete JSON; `validate` returns issues without throwing for invalid layout input.

Use ESM imports. Development and verification use Node 24; browser use requires modern JavaScript support including `structuredClone`. This package needs no stylesheet or host element. The `layouts` DOM adapter and `layouts-react` binding provide views. Application data and persistence remain application-owned.

See [API documentation](https://github.com/niko-dellic/layouts/blob/main/docs/api.md) and [migration notes](https://github.com/niko-dellic/layouts/blob/main/docs/migration.md).
