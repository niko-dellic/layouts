# Pre-release API migration

The library is now named **Quilt**. Update dependencies and imports together:

| Previous package | New package   |
| ---------------- | ------------- |
| `layouts-core`   | `quilt-core`  |
| `layouts`        | `quilt-dom`   |
| `layouts-react`  | `quilt-react` |

Stylesheet imports are now `quilt-dom/styles.css` or `quilt-react/styles.css`.
The first npm release is `0.1.0`. The existing `.layouts`
CSS classes, `--layouts-*` theme variables, and `layouts:*` icon keys remain
unchanged, so application styling and icon overrides continue to work. The GitHub
repository is now `niko-dellic/quilt`.

These source changes also break older development tarball APIs; do not replace a
released archive under the same version.

## Registered content replaces createPane

`LayoutOptions.createPane` and the corresponding React prop are removed. Register available content and pass the registry as `tabs` instead:

```ts
import { TabRegistry } from 'quilt-dom'; // also exported by quilt-react
const tabs = new TabRegistry([
  {
    id: 'notes',
    title: 'Notes',
    create: ({ source }) => ({
      id: crypto.randomUUID(),
      type: 'notes',
      title: source ? `${source.title} copy` : 'Notes',
    }),
  },
]);
// mountLayout(host, { store, renderers, tabs });
// <Layout store={store} components={components} tabs={tabs} />
```

Return `undefined` to cancel. Source can be undefined in an empty workspace. Add-tab and populated-region content creation need registered choices. Empty regions can still split into empty regions without a registry. Programmatic `store.add` and `store.split` remain available.

## Imports and initialization

Core's undocumented `isJson` and `paneBounds` exports are now private. Use `validate`/`parseLayout` for layout validation and `bounds` for region constraints. Documented core helpers, `joinRange`, and the shared `DIVIDER` constant remain public.

Both adapters now export `LayoutStore`, `LayoutError`, `createLayout`, `parseLayout`, `validate`, and core types. Import the model as `LayoutSnapshot` from adapters or `Layout` from core. React's `Layout` component name is unchanged. React also re-exports the tab registry, theme presets, and public DOM types.

Use `new LayoutStore(createLayout())` for an empty workspace, or `createLayout({ pane, groupId })` for a single pane. It clones and validates data, preserves IDs, and defaults the group ID to `main`.

React apps can import `quilt-react/styles.css` instead of `quilt-dom/styles.css`; both contain the same rules. No JSON migration is needed; layout version remains 1.
