# Quilt

[![CI](https://github.com/niko-dellic/quilt/actions/workflows/ci.yml/badge.svg)](https://github.com/niko-dellic/quilt/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/quilt-react)](https://www.npmjs.com/package/quilt-react)

**A place for every pane.** A small TypeScript workspace library with recursive splits, tab groups, constrained bars, and real browser-window popouts. A framework-independent engine powers vanilla DOM and React bindings.

Applications own their content and data. Quilt owns arrangement and chrome.

## See it in action

![Recorded Quilt walkthrough showing pane arrangements, scene interaction, and workspace preset changes](docs/media/demo-walkthrough.webp)

Explore pane arrangements, interact with the scene, and switch workspace presets in this 35-second recording. [Compare before and after resizing screenshots](docs/showcase.md#resizing).

### Configure your workspace

The vanilla and React adapters share the same layout engine and configuration options.

| Setting                        | What you can control                                                                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Pane arrangement**           | Nest horizontal (side-by-side) and vertical (stacked) splits, set their proportions, and group panes into tabs.                                                                                  |
| **Tab orientation and labels** | Use horizontal tabs along the top or a vertical rail on the left. Show labels when space permits, or use compact icon-only tabs. Override these settings per region.                             |
| **Tab taper and shape**        | Choose full-width or tapered anchored bars. Taper shapes include angled, round, and scooped ends, with configurable taper width; fitted and rounded shapes are also available.                   |
| **Floating tabs**              | Anchor tabs to the pane edge or float them over content. Floating bars support full-width or fit-to-content sizing, fitted/rounded/capsule corners, and a configurable inset.                    |
| **Pane size limits**           | Set minimum and maximum width and height per pane. Equal limits create fixed-size regions, useful for toolbars and status bars; hide the header for a single-tab group.                          |
| **Dividers**                   | Change the resize-handle width (4px by default), override individual split gaps, and style or hide disabled dividers and their borders.                                                          |
| **Empty-region collapsing**    | `disabled` keeps empty regions (the default); `protected` collapses them after closing or moving panes but preserves popout source regions; `enabled` also collapses regions emptied by popouts. |
| **Pane permissions**           | Allow or restrict user resizing, moving, splitting, joining, closing, and popping out on a pane-by-pane basis.                                                                                   |
| **Corner handles**             | Customize split/join handle size, inset, stroke, radius, fill, color, opacity, and visibility. The demo offers bracket, rounded bracket, square, and dot styles.                                 |
| **Themes and density**         | Use light/dark presets or custom colors. Adjust fonts, icon sizes, tab height, vertical rail width, padding, control spacing, and scrollbars.                                                    |
| **Available content**          | Register the pane types users can create, with titles, descriptions, search keywords, icons, and creation callbacks through `TabRegistry`.                                                       |
| **Popout windows**             | Open same-origin companion windows with configurable size and position, supply application styles, and return panes to the workspace.                                                            |
| **Shortcut preferences**       | Opt into maximize/restore, add-tab, restore-closed-tab, and middle-click-close conveniences individually or together.                                                                            |
| **Workspace state**            | Choose active tabs, maximize or restore a region, and export/load validated layout JSON. The demo includes Default, Focus, and Review presets.                                                   |

Explore the [screenshot gallery](docs/showcase.md), [configuration API](docs/api.md), and [theme and tab-bar options](docs/theming.md).

## Try it

Open the live [vanilla demo](https://layouts-ruddy.vercel.app/vanilla.html) or [React demo](https://layouts-ruddy.vercel.app/react.html), or run locally:

```sh
nvm use
npm ci
npm run build
npm run dev
```

Open [localhost:5186](http://localhost:5186). The [vanilla demo](http://localhost:5186/vanilla.html) and [React demo](http://localhost:5186/react.html) use the same configuration. Drag tabs, resize dividers, use the pane action menus, edit Layout JSON, or pop out the inspector. Edit its notes in the second window and close it: the notes return with the pane.

The React demo uses a React-controlled inspector alongside an imperative canvas. The main window owns application state; pane views remount when crossing documents. React-local state does not automatically travel.

## Packages

| Package         | Responsibility                                                    |
| --------------- | ----------------------------------------------------------------- |
| `quilt-core`    | Pure model, commands, validation, constraints, change events      |
| `quilt-vanilla` | Vanilla DOM rendering, chrome, gestures, browser-window lifecycle |
| `quilt-react`   | React components and hooks over the same engine and chrome        |

All packages ship ESM, declarations, and source maps. React is a peer dependency of the React package only. The vanilla package does not depend on React.

## Install in your application

```sh
# Vanilla DOM (includes core)
npm install quilt-vanilla

# React (includes core and DOM)
npm install quilt-react react react-dom

# Model only
npm install quilt-core
```

Import `quilt-vanilla/styles.css` for vanilla or `quilt-react/styles.css` for React.
Use ESM imports and a bundler with CSS support, such as Vite. TypeScript React
applications also need matching `@types/react` and `@types/react-dom`.

For checkout builds and local tarball installation, see
[Packaging and integration](docs/packaging.md).

## Vanilla

```ts
import { LayoutStore, mountLayout, createLayout } from 'quilt-vanilla';
import 'quilt-vanilla/styles.css';

const store = new LayoutStore(
  createLayout({
    pane: { id: 'notes', type: 'notes', title: 'Notes' },
  }),
);
const data = { text: 'Hello, workspace.' }; // application-owned
const mounted = mountLayout(document.querySelector<HTMLElement>('#workspace')!, {
  store,
  getPaneState: () => data,
  renderers: {
    notes: ({ element, document: doc, state }) => {
      const model = state as typeof data;
      const input = doc.createElement('textarea');
      input.value = model.text;
      input.oninput = () => {
        model.text = input.value;
      };
      element.append(input);
      return {
        dispose() {
          input.oninput = null;
        },
      };
    },
  },
});
const unsubscribe = store.subscribe(({ action, layout }) => {
  // Persist through your own storage adapter; data is a separate responsibility.
  console.log(action, JSON.stringify(layout));
});
// Teardown: unsubscribe(); mounted.dispose(); store.dispose();
```

Give the host an explicit size (`width: 100%; height: 600px`, for example).

## React

```tsx
import { Layout } from 'quilt-react';
import type { PaneProps } from 'quilt-react';
import 'quilt-react/styles.css';

// Create the store and app state outside the pane component's lifetime.
function Notes({ state }: PaneProps) {
  const model = state as { text: string };
  return (
    <textarea
      defaultValue={model.text}
      onChange={(event) => {
        model.text = event.target.value;
      }}
    />
  );
}
const components = { notes: Notes };
// The store owns the session; ordinary inline components maps and callbacks are supported.
const getPaneState = () => data;
function Workspace() {
  return <Layout store={store} components={components} getPaneState={getPaneState} />;
}
```

Use `useLayoutSnapshot(store)` to subscribe to the layout. Declarative panes inherit application providers through React portals, including in companions. Keep the store stable; changing callback or component-map identities does not rebuild the workspace. Use an external store for state that must survive document transitions; the demo shows `useSyncExternalStore`.

## Configure bars and capabilities

Bars are ordinary panes. Put a one-tab group at the top of a vertical split and set its pane to:

```ts
{
  id: 'toolbar', type: 'toolbar', title: 'Toolbar', header: false,
  size: { minHeight: 48, maxHeight: 48 },
  capabilities: {
    resize: false, move: false, split: false,
    join: false, close: false, popout: false,
  },
}
```

Bottom and side bars use the same tree composition. Set a minimum and maximum to the same value to fix a dimension. `header: false` hides chrome only when the group has one pane. Capability flags restrict user actions; host commands default to explicit API authority. Invalid structures and contradictory constraints are always rejected.

## Documentation

- [Copyable vanilla, React, and Electron starters](examples/README.md)
- [Host compatibility](docs/compatibility.md)

- [Configuration and API](docs/api.md)
- [0.2.0 upgrade checklist](docs/migration.md)
- [Pane and window lifecycle](docs/lifecycle.md)
- [Packaging and integration](docs/packaging.md)
- [Architecture and contribution](CONTRIBUTING.md)

## Verify

```sh
npx playwright install chromium firefox webkit
npm run check
```

The suite checks the pure model, real popouts, rollback, lifecycle cleanup, data retention, accessible commands, resizing, framework parity, and packed-package installation. Browser tests run against `localhost` in Chromium, Firefox, and WebKit.

## Version-one boundaries

- One pane per popout; split trees and tab groups stay in the main window.
- Popouts depend on the main session and the same origin. Independent sessions and cross-origin windows are out of scope.
- Window placement is a browser request, not a guarantee. Popups need user activation. Loading JSON never opens windows automatically.
- Storage and application data belong to the app. Workspace JSON includes layout and appearance; optional close confirmation supports either a Quilt dialog or your own.
- Unknown renderer types show placeholders. Workspace menus allow keyboard alternatives to dragging.
- On small viewports, constraints are preserved through overflow rather than silently shrinking panes below their minimums.

MIT © niko-dellic

Tab creation uses an application-owned `TabRegistry` with a searchable picker, including canvas views. See [registration API](docs/api.md#register-available-tabs) and [theme tokens and presets](docs/theming.md).

### Directional splits and fixed bars

Split nodes accept an optional nonnegative `gap` in pixels (default 4); use
`gap: 0` for fixed application bars. Bounds and allocation honor this value.
The Split menu has a hover/keyboard submenu for left, right, up and down.

Drag a region corner inward to choose content for a new split. Drag into an
immediate sibling group to join, retaining every tab. Release commits; Escape
and pointer cancellation leave the layout unchanged. Capability flags protect
fixed bars and other restricted panes. Corners do not join arbitrary nested
neighbors.

Scrollbar theme roles are `scrollbarThumb`, `scrollbarTrack`, and
`scrollbarSize`, or their CSS variables `--layouts-scrollbar-thumb`,
`--layouts-scrollbar-track`, and `--layouts-scrollbar-size`. Browsers supporting
standard scrollbar-width use their thin width; WebKit scrollbar styling uses the
size role. The same roles apply in companion windows.

## Releases

See [release instructions](docs/releases.md) and the [changelog](CHANGELOG.md).

## Save a workspace and customize integration

```ts
const json = JSON.stringify(mounted.exportWorkspace());
mounted.loadWorkspace(JSON.parse(json));
```

Workspace JSON includes theme overrides, tab-bar settings and automatic collapse.
Popouts export as docked panes without closing live windows. Reloading never
reopens windows. Storage is your choice.

See [Web integration](docs/integration.md) for unified registrations, provider
context, custom themes, save/load examples, configurable shortcuts, and optional
close confirmation. See [migration notes](docs/migration.md) for API changes.
