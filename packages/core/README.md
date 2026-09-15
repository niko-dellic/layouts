# quilt-core

Framework-independent layout JSON, validation, commands, and subscriptions. No DOM or React dependency. MIT licensed; ships ESM, TypeScript declarations, and sources for editor navigation.

## Install

```sh
npm install quilt-core
```

Use ESM imports. For local development archives, see [packaging instructions](https://github.com/niko-dellic/quilt/blob/main/docs/packaging.md).

## Use

```ts
import { createLayout, LayoutStore, validate } from 'quilt-core';

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

Development and verification use Node 24; browser use requires modern JavaScript support including `structuredClone`. This package needs no stylesheet or host element. The `quilt-vanilla` DOM adapter and `quilt-react` binding provide views. Application data and persistence remain application-owned.

See [API documentation](https://github.com/niko-dellic/quilt/blob/main/docs/api.md) and [migration notes](https://github.com/niko-dellic/quilt/blob/main/docs/migration.md).
