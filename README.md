# layouts

**A place for every pane.** A small TypeScript workspace library with recursive splits, tab groups, constrained bars, and real browser-window popouts. A framework-independent engine powers vanilla DOM and React bindings.

Applications own their content and data. Layouts owns arrangement and chrome.

## Try it

```sh
nvm use
npm ci
npm run build
npm run dev
```

Open [localhost:5186](http://localhost:5186). The [vanilla demo](http://localhost:5186/vanilla.html) and [React demo](http://localhost:5186/react.html) use the same configuration. Drag tabs, resize dividers, use the pane action menus, edit Layout JSON, or pop out the inspector. Edit its notes in the second window and close it: the notes return with the pane.

The React demo uses a React-controlled inspector alongside an imperative canvas. The main window owns application state; pane views remount when crossing documents. React-local state does not automatically travel.

## Packages

| Package                      | Responsibility                                                    |
| ---------------------------- | ----------------------------------------------------------------- |
| `@niko-dellic/layouts-core`  | Pure model, commands, validation, constraints, change events      |
| `@niko-dellic/layouts`       | Vanilla DOM rendering, chrome, gestures, browser-window lifecycle |
| `@niko-dellic/layouts-react` | React components and hooks over the same engine and chrome        |

All packages ship ESM, declarations, and source maps. React is a peer dependency of the React package only. The vanilla package does not depend on React. Packages are distributed as local tarballs for now, not published to the npm registry.

## Vanilla

```ts
import { LayoutStore } from '@niko-dellic/layouts-core';
import { mountLayout } from '@niko-dellic/layouts';
import '@niko-dellic/layouts/styles.css';

const store = new LayoutStore({
  version: 1,
  root: { kind: 'group', id: 'main', panes: ['notes'], active: 'notes' },
  panes: { notes: { id: 'notes', type: 'notes', title: 'Notes' } },
  popouts: [],
  maximized: null,
});
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
import { Layout } from '@niko-dellic/layouts-react';
import type { PaneProps } from '@niko-dellic/layouts-react';
import '@niko-dellic/layouts/styles.css';

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
// store, components, and callbacks should have stable identities.
const getPaneState = () => data;
function Workspace() {
  return <Layout store={store} components={components} getPaneState={getPaneState} />;
}
```

Use `useLayoutSnapshot(store)` to subscribe to the layout. Pane components are separate React roots and do not inherit context providers from your app root. Supply a component wrapper with any required providers. Use an external store for state that must survive popouts; the demo shows `useSyncExternalStore`.

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

- [Configuration and API](docs/api.md)
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
- Persistence and unsaved-work policy belong to the app. Layout change events are not a durable data store.
- Unknown renderer types show placeholders. Workspace menus allow keyboard alternatives to dragging.
- On small viewports, constraints are preserved through overflow rather than silently shrinking panes below their minimums.

MIT © niko-dellic

Tab creation uses an application-owned `TabRegistry` with a searchable picker, including canvas views. See [registration API](docs/api.md#register-available-tabs) and [theme tokens and presets](docs/theming.md).
