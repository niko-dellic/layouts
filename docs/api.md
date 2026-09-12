# Configuration and API

## JSON v1

```ts
interface Layout {
  version: 1;
  root: Group | Split;
  panes: Record<string, Pane>;
  popouts: Popout[];
  maximized: string | null; // group id
}
interface Group {
  kind: 'group';
  id: string;
  panes: string[];
  active: string | null;
}
interface Split {
  kind: 'split';
  id: string;
  axis: 'horizontal' | 'vertical';
  ratio: number; // preferred share of the first child, strictly between 0 and 1
  children: [Group | Split, Group | Split];
}
interface Pane {
  id: string;
  type: string;
  title: string;
  params?: Json; // JSON only, not runtime state
  header?: boolean;
  capabilities?: Partial<
    Record<'resize' | 'move' | 'split' | 'join' | 'close' | 'popout', boolean>
  >;
  size?: { minWidth?: number; maxWidth?: number; minHeight?: number; maxHeight?: number };
}
interface Popout {
  paneId: string;
  groupId: string;
  index: number; // desired return location
  placement?: { width?: number; height?: number; left?: number; top?: number };
}
```

The `version`, `root`, `panes`, `popouts`, and `maximized` properties are required. Node IDs are unique across the tree; pane IDs are unique in their dictionary. Every pane appears exactly once, either in a group or the popout list. Empty groups have `active: null`. Maximum nesting depth is 64. JSON cannot contain cycles, functions, undefined values, nonfinite numbers, or class instances.

Sizes refer to the full pane region, including chrome. Defaults are minimum zero and no maximum. Tab groups satisfy the intersection of their panes' constraints, so incompatible tabs are rejected. Split children may leave unused space when a maximum prevents them filling the cross axis. A six-pixel divider contributes to recursive minimum sizes. Below the combined minimum, the workspace scrolls. Above combined maximums, surplus space stays empty. Split ratios are preferences constrained by these limits, not guaranteed pixel proportions.

Capability flags default to true. Group-level operations require permission from affected panes: resizing a split checks both subtrees; tabbing and moving check the dragged pane and destination group; splitting checks the destination; joining checks the sibling region. Fixed bars normally disable all capabilities as well as specify size bounds. Host code can still deliberately reposition them.

## Core exports

`parseLayout(unknown): Layout` clones and validates or throws `LayoutError`. `validate(unknown): Issue[]` returns `{path, message}` issues. `bounds`, `allocate`, `groups`, `paneIds`, `findNode`, and `findParent` are pure helpers.

`new LayoutStore(input)` creates a single state owner. Commands clone, validate, and commit atomically. A failed command leaves the previous snapshot intact and reports to `onError` subscribers before throwing.

| Method                                               | Behavior                                                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `getSnapshot()`                                      | Stable, deeply frozen snapshot; treat it as read-only                                                   |
| `export()`                                           | Mutable clone suitable for JSON serialization                                                           |
| `subscribe(listener)`                                | Observe `{action, layout}`; returns unsubscribe                                                         |
| `onError(listener)`                                  | Observe command/subscriber failures; returns unsubscribe                                                |
| `load(input)`                                        | Replace with validated JSON atomically                                                                  |
| `reset()`                                            | Restore constructor configuration                                                                       |
| `activate(groupId, paneId)`                          | Select an existing tab                                                                                  |
| `add(pane, groupId, options?)`                       | Insert a new pane as a tab                                                                              |
| `updatePane(pane)`                                   | Replace metadata/constraints with validation                                                            |
| `split(groupId, axis, newPane, options?)`            | Create a new region after the existing group                                                            |
| `join(groupId, options?)`                            | Collapse its parent split, retaining all sibling content as tabs                                        |
| `move(paneId, groupId, position?, index?, options?)` | Position is `tab`, `left`, `right`, `top`, or `bottom`; index is a tab insertion index after detachment |
| `resize(splitId, ratio, options?)`                   | Set a preferred split proportion                                                                        |
| `maximize(groupId \| null)`                          | Maximize or restore a region                                                                            |
| `close(paneId, options?)`                            | Remove pane and placement                                                                               |
| `popout(paneId, placement?, options?)`               | Pure model transition; does not open a browser                                                          |
| `returnPane(paneId)`                                 | Return to a compatible original/fallback group, or a new region                                         |
| `dispose()`                                          | End subscriptions; idempotent; subsequent commands fail                                                 |

Options accept `{source: 'user' | 'api'}`; default is `api`. Flags only restrict `user` commands. Use the mounted renderer's `popout` method, not the store's pure `popout` command, to open browser windows. A DOM renderer interprets detached records without live companion handles as restored data and docks them with a Reopen action.

## DOM exports

`mountLayout(host, options)` appends its own scoped root; it does not clear unrelated host content. Options:

- `store`: externally owned `LayoutStore`.
- `renderers`: pane-type-to-renderer registry.
- `getPaneState(id)`: optional application-owned reference for each view mount.
- `createPane(source)`: synchronous new-pane factory for split-menu commands; returning undefined cancels. IDs must be unique.
- `onError(error)`: mount, interaction, and window failures.
- `prepareWindow(window, pane)`: copy additional styles/providers/assets into a companion document.
- `openWindow(pane, placement)`: optional synchronous, same-origin window factory; null means blocked. The library owns this returned window and replaces its body, so do not return an existing unrelated application window.

Returned handle: `popout(id, placement?): boolean`, `returnPane(id)`, `dispose()`. Dispose the mounted view before disposing the externally owned store.

## React exports

`Layout` accepts the same options, replacing `renderers` with `components: Record<string, ComponentType<PaneProps>>`, plus `className` and `style`. Its ref exposes the mounted handle. Mounting is deferred one microtask beyond React's commit; ref methods return false/no-op before mounting completes.

`reactRenderer(Component)` adapts a React component for mixed vanilla/React consumers. `useLayoutSnapshot(store)` subscribes with React's external-store API. React 18.3 and 19 are peer-compatible; automated development tests use React 19.

`PaneProps` includes `document`, `window`, `pane`, `state`, and `location`; the vanilla renderer also receives `element`.

## Theme variables

Override `.layouts` variables in your application stylesheet: `--layouts-bg`, `--layouts-panel`, `--layouts-header`, `--layouts-text`, `--layouts-muted`, `--layouts-line`, `--layouts-accent`, `--layouts-focus`, and `--layouts-radius`. Styling remains scoped; application content is yours. No OS-dependent motion overrides are installed.

## Tab icons and shortcuts

`Pane.icon?: string` is an optional, serializable application key. Supply
`renderIcon(key, document)` to the vanilla mount options or React `<Layout>`.
Return a fresh decorative DOM element, or `undefined` for an unknown key.
The library falls back to the first character of the title, keeps the full title
as the accessible name and tooltip, and never interprets icon keys as markup.
The demos use a small Lucide registry; consumers can use any icon library without
adding Lucide to their production dependencies. See `demos/icons.ts`.

Tabs shrink according to their own available width. Below 130px per tab, only
the active tab keeps its close button; below 95px, labels hide and icons remain.
If even icon tabs cannot fit, the strip scrolls. Drag to either half of another
tab to insert before or after it, including within the same pane region.
Closing respects `capabilities.close`; locked tabs have no close button.

Convenience shortcuts are disabled by default:

```ts
mountLayout(host, {
  store,
  renderers,
  shortcuts: true, // enable both defaults
});
// Or select individually:
// shortcuts: { maximize: true, middleClickClose: false }
```

Option+Space (`Alt+Space`) toggles workspace maximize/restore for the hovered
pane region, falling back to the keyboard-focused region. This fills the layout
host; it does not invoke the browser Fullscreen API. Text inputs, editable
content, dialogs, and repeated key events are left alone. Some operating systems
reserve Alt+Space and may intercept it before the page receives it; the actions
menu remains available. Middle-click closes a tab when enabled and permitted.
Normal tab arrow-key navigation and divider keyboard resizing remain available
regardless of this convenience setting.

## Register available tabs

A `TabRegistry` describes what users can create; the layout snapshot describes
what is already open. Registering a type does not mount it. Removing a
registration prevents new instances without closing existing panes.

```ts
import { TabRegistry, mountLayout } from '@niko-dellic/layouts';
const tabs = new TabRegistry();
const unregister = tabs.register({
  id: 'canvas',
  title: 'Canvas',
  description: 'Interactive scene viewport',
  icon: 'canvas',
  keywords: ['scene', 'viewport', '3d'],
  create: ({ source, groupId }) => ({
    id: crypto.randomUUID(),
    type: 'canvas', // corresponding renderer/component registry key
    title: 'Scene',
    icon: 'canvas',
  }),
});
const workspace = mountLayout(host, { store, renderers, tabs });
// unregister(); // also updates a currently open picker
```

`new TabRegistry(entries)` accepts an initial array. `register` rejects duplicate
or empty IDs and returns an idempotent unregister function. `list()` returns
registrations in insertion order; `subscribe(listener)` returns cleanup.
Registration IDs identify choices; pane IDs identify individual open instances.
Factories own unique IDs, type, metadata, constraints, and initial params; return
`undefined` to cancel. They run only after an explicit selection. Core validation
remains atomic, so a rejected creation preserves the workspace.

Add tab and split actions open a searchable combobox tray. Search matches titles,
descriptions, and keywords. Arrow keys move selection, Enter creates, and Escape
cancels. Add tab activates the new tab in the same region. Split creates a new
region containing the selected type. Canvas is an ordinary pane renderer and can
be added, tabbed, dragged, closed, maximized, and popped out under the same rules.

Pass `tabs` to React `<Layout>` too. Keep the registry object stable and register
or unregister entries as features mount or unmount. The legacy `createPane`
callback is supported only for splitting when no registry is supplied; Add tab
requires registered choices. Existing movement/split capability checks still
apply. See [Theming](theming.md) for the separate theme API.

Menu actions include built-in decorative icons. The optional `renderIcon` resolver
can override them using `layouts:add-tab`, `layouts:split-right`,
`layouts:split-below`, `layouts:join`, `layouts:maximize`, `layouts:restore`,
`layouts:popout`, `layouts:close`, and `layouts:cancel`. Return `undefined` to use
the built-in icon. Icons inherit text color, including disabled and themed states.
