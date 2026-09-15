# API migration

## 0.1.x → 0.2.0 upgrade checklist

1. Upgrade all installed Quilt packages to **0.2.0** together and rebuild.
2. Keep the adapter stylesheet import (`quilt-vanilla/styles.css` or
   `quilt-react/styles.css`), and give the host a definite height.
3. Choose either `registry` or the separate `tabs` and
   `renderers`/`components` maps. TypeScript now rejects mixing them.
4. Await popout completion and move durable pane data outside component/view state.
5. Use workspace JSON for complete settings; keep application data and CSS assets
   in application storage. Existing raw layouts can still use core `store.load`.
6. Review pane-content CSS and opt into close confirmation where desired.
7. Smoke-test save/load, theme switching, and popout return in your host.

### Behavior and API details

- Await `mounted.popout(id)` for its `Promise<boolean>` result. Call it directly
  inside the user gesture; do not await preparation before opening.
- Declarative `<Layout>` panes now inherit React providers. Remove duplicate
  provider wrappers where appropriate. Standalone `reactRenderer` retains its
  separate-root contract. Cross-document local state still remounts.
- Ordinary callback and component-map identity changes no longer rebuild the
  workspace. Replacing the store still replaces the session.
- Use `exportWorkspace()`/`loadWorkspace()` for layout and appearance together.
  Core `store.export()` remains the raw live model. Workspace exports dock copies;
  imported popouts no longer advertise a pending “Reopen window” action.
- Quilt's reset, focus and scrollbar rules now target its own chrome. Applications
  wanting the same rules inside pane content should opt in through their CSS.
- Geometry theme tokens accept CSS lengths. Use `refreshTheme()` after CSSOM or
  media-query changes; avoid clearing overrides merely to trigger a refresh.
- Close confirmation is opt-in (`Pane.confirmClose` or a registered default).
  Explicit core commands continue to bypass UI confirmation.
- Workspace JSON is a new envelope; existing layout JSON remains valid for
  `store.load`. The demos accept both and export the complete envelope.

See [integration examples](integration.md). All three packages use version 0.2.0.

## Earlier pre-release migration

The library is now named **Quilt**. Update dependencies and imports together:

| Previous package | New package     |
| ---------------- | --------------- |
| `layouts-core`   | `quilt-core`    |
| `layouts`        | `quilt-vanilla` |
| `layouts-react`  | `quilt-react`   |

Stylesheet imports are now `quilt-vanilla/styles.css` or `quilt-react/styles.css`.
The first npm release is `0.1.0`. The existing `.layouts`
CSS classes, `--layouts-*` theme variables, and `layouts:*` icon keys remain
unchanged, so application styling and icon overrides continue to work. The GitHub
repository is now `niko-dellic/quilt`.

These source changes also break older development tarball APIs; do not replace a
released archive under the same version.

## Registered content replaces createPane

`LayoutOptions.createPane` and the corresponding React prop are removed. Register available content and pass the registry as `tabs` instead:

```ts
import { TabRegistry } from 'quilt-vanilla'; // also exported by quilt-react
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

React apps can import `quilt-react/styles.css` instead of `quilt-vanilla/styles.css`; both contain the same rules. No JSON migration is needed; layout version remains 1.
