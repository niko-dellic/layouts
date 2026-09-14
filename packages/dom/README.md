# layouts

Vanilla DOM pane layouts, tabs, themes, resizing, and same-origin browser popouts. Includes convenient core exports; does not install React. MIT licensed, ESM and TypeScript.

## Install

Not yet published to npm. With Node 24, run `npm ci` and `npm run pack:all` in the repository. Copy the core and DOM archives listed in `artifacts/packages/manifest.json` to your app's `vendor/` directory and install together:

```sh
npm install ./vendor/layouts-core-<version>.tgz ./vendor/layouts-<version>.tgz
```

Replace `<version>` with the archive version and retain both archives and your lockfile. Use an ESM-capable bundler with CSS import support, such as Vite.

## Use

Provide a host in your HTML: `<div id="workspace" style="width:100%;height:600px"></div>`.

```ts
import { createLayout, LayoutStore, mountLayout } from 'layouts';
import 'layouts/styles.css';

const store = new LayoutStore(
  createLayout({
    pane: { id: 'notes', type: 'notes', title: 'Notes' },
  }),
);
const data = { text: 'Hello' }; // survives view remounts
const mounted = mountLayout(document.getElementById('workspace')!, {
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
// Call when removing the workspace:
function disposeWorkspace() {
  mounted.dispose();
  store.dispose();
}
```

The host needs an explicit height. Supply a `TabRegistry` through `tabs` to offer new content; registration factories return fresh pane IDs. `themes`, `themeFamilies`, `LayoutTheme`, and `MountedLayout` are public exports. The layout JSON type is `LayoutSnapshot` from this entry point.

Call `mounted.popout(id)` from a user action. Companions are same-origin and owned by the main session. Use the supplied document/window inside renderers and release every view-owned resource in `dispose`. Keep app data outside view lifetimes.

See [API](https://github.com/niko-dellic/layouts/blob/main/docs/api.md), [lifecycle](https://github.com/niko-dellic/layouts/blob/main/docs/lifecycle.md), and [migration](https://github.com/niko-dellic/layouts/blob/main/docs/migration.md).
