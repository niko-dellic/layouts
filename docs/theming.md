# Theming

Themes style workspace chrome: tabs, menus, dividers, picker, and companion window
bars. Pane content is application-owned and may consume these same tokens. A
canvas's authored colors are content, not theme tokens.

Like [Tweakpane](https://tweakpane.github.io/docs/theming/), layouts accepts CSS
custom properties on its container. Variables inherit normally. Defaults are CSS
fallbacks, so a nested `.layouts` element does not overwrite container values.

```css
.my-workspace {
  --layouts-panel: var(--panel);
  --layouts-header: var(--panel2);
  --layouts-text: var(--ink);
  --layouts-line: var(--line);
  --layouts-accent: var(--accent);
}
```

| Typed key      | CSS property              | Role / default                                    |
| -------------- | ------------------------- | ------------------------------------------------- |
| `bg`           | `--layouts-bg`            | Workspace and divider background / `#161a20`      |
| `panel`        | `--layouts-panel`         | Content surface, selected tab, input / `#1d222a`  |
| `header`       | `--layouts-header`        | Headers and menus / `#242a34`                     |
| `text`         | `--layouts-text`          | Primary text / `#e5e9f0`                          |
| `muted`        | `--layouts-muted`         | Secondary text / `#a2acba`                        |
| `line`         | `--layouts-line`          | Borders / `#39414e`                               |
| `accent`       | `--layouts-accent`        | Selection, resize and drop indicators / `#8bbaaa` |
| `focus`        | `--layouts-focus`         | Keyboard focus / `#b3decf`                        |
| `radius`       | `--layouts-radius`        | Control corners / `5px`                           |
| `fontFamily`   | `--layouts-font-family`   | Chrome font / `system-ui, sans-serif`             |
| `fontSize`     | `--layouts-font-size`     | Chrome text size / `13px`                         |
| `headerHeight` | `--layouts-header-height` | Tab strip height / `34px`                         |

Use the typed API for presets and runtime changes:

```ts
import { mountLayout, themes } from '@niko-dellic/layouts';
const workspace = mountLayout(host, {
  store,
  renderers,
  tabs,
  theme: { ...themes.light, accent: '#8060c0' },
});
workspace.setTheme(themes.dark);
workspace.setTheme({}); // remove API overrides; inherit container CSS again
```

`themes.dark`, `themes.light`, and `themes.sage` provide color presets. Values are
CSS strings. `setTheme` replaces the previous API overrides rather than merging
with them. Precedence follows normal CSS: inline API overrides, local CSS rules,
inherited container values, then dark fallback values. Theme changes do not
reload JSON, dispose views, or reset application data. React accepts the same
`theme` prop and updates it without remounting; its imperative ref also exposes
`setTheme`.

Companion windows receive the resolved workspace tokens when opening and when
host/ancestor attributes or head styles change. Arbitrary media-query changes or
stylesheet edits made only through CSSOM do not emit DOM mutations; call
`setTheme` when driving themes that way. Use concrete CSS values in API themes
when custom properties depend on ancestors absent from companion windows.

Theme preferences belong to the application, separate from layout JSON. The
library does not read OS preferences or write browser storage. The demo theme
selector switches chrome presets; visualization palettes remain authored data.
