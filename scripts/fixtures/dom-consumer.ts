import {
  mountLayout,
  LayoutStore,
  createLayout,
  TabRegistry,
  themes,
  validate,
} from 'quilt-vanilla';
import type {
  LayoutSnapshot,
  LayoutTheme,
  MountedLayout,
  PaneRenderer,
  LayoutOptions,
} from 'quilt-vanilla';
import 'quilt-vanilla/styles.css';
const layout: LayoutSnapshot = createLayout();
const theme: LayoutTheme = themes.light;
const store = new LayoutStore(layout);
const renderer: PaneRenderer = () => ({ dispose() {} });
const options: LayoutOptions = {
  store,
  theme,
  tabs: new TabRegistry(),
  renderers: { text: renderer },
};
// @ts-expect-error Content creation requires TabRegistry.
options.createPane = () => undefined;
const mounted: MountedLayout = mountLayout(document.createElement('div'), options);
void validate(layout);
mounted.dispose();
store.dispose();
