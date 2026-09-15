import {
  mountLayout,
  LayoutStore,
  createLayout,
  TabRegistry,
  PaneRegistry,
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
const preset = mounted.exportWorkspace();
mounted.loadWorkspace(JSON.parse(JSON.stringify(preset)));
mounted.refreshTheme();
mounted.updateOptions({ popouts: false, messages: { Cancel: 'Dismiss' } });
mounted.dispose();
store.dispose();

// Registration combinations must fail even for consumers using emitted declarations.
const registry = new PaneRegistry<PaneRenderer>();
// @ts-expect-error Unified registry excludes low-level renderers.
const conflicting: LayoutOptions = { store, registry, renderers: {} };
// @ts-expect-error Unified registry excludes low-level creation tabs.
const conflictingTabs: LayoutOptions = { store, registry, tabs: new TabRegistry() };
void conflicting;
void conflictingTabs;
mounted.updateOptions({
  theme: undefined,
  tabBar: undefined,
  registry: undefined,
  messages: undefined,
  shortcuts: undefined,
  popouts: undefined,
  confirmClose: undefined,
});
type NotesState = { text: string };
const typedRenderer: PaneRenderer<NotesState> = ({ state }) => {
  state.text.toUpperCase();
  // @ts-expect-error Pane state retains its declared shape.
  state.missing;
  return { dispose() {} };
};
const typed: LayoutOptions<NotesState> = {
  store,
  renderers: { note: typedRenderer },
  getPaneState: () => ({ text: '' }),
};
void typed;
// @ts-expect-error A typed state requires an application state provider.
const missingState: LayoutOptions<NotesState> = { store, renderers: { note: typedRenderer } };
void missingState;

const typedHandle = mountLayout(document.createElement('div'), typed);
typedHandle.updateOptions({
  renderers: { note: typedRenderer },
  getPaneState: () => ({ text: 'updated' }),
});
// @ts-expect-error State providers cannot change to an incompatible type.
typedHandle.updateOptions({ getPaneState: () => 123 });
typedHandle.dispose();
