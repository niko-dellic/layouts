import { createRef, useEffect, createContext, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Layout,
  LayoutStore,
  createLayout,
  useLayoutSnapshot,
  TabRegistry,
  PaneRegistry,
  themes,
} from 'quilt-react';
import type { MountedLayout, PaneProps, LayoutSnapshot, LayoutProps } from 'quilt-react';
import 'quilt-react/styles.css';
const store = new LayoutStore(createLayout({ pane: { id: 'note', type: 'note', title: 'Note' } }));
const state = { text: 'initial' };
const Context = createContext('missing');
const stats = { live: 0 };
const getPaneState = () => state;
function Note({ state: data }: PaneProps) {
  useEffect(() => {
    stats.live++;
    return () => {
      stats.live--;
    };
  }, []);
  const inherited = useContext(Context);
  if (inherited !== 'inherited') throw new Error('Provider context was lost');
  const model = data as typeof state;
  return (
    <input
      aria-label="Note data"
      defaultValue={model.text}
      onChange={(event) => {
        model.text = event.target.value;
      }}
    />
  );
}
const components = { note: Note };
const tabs = new TabRegistry();
const ref = createRef<MountedLayout>();
function App() {
  const snapshot: LayoutSnapshot = useLayoutSnapshot(store);
  return (
    <>
      <output>{snapshot.panes.note?.title}</output>
      <Layout
        ref={ref}
        store={store}
        components={components}
        tabs={tabs}
        theme={themes.light}
        getPaneState={getPaneState}
        style={{ height: 400 }}
      />
      <button onClick={() => ref.current?.popout('note')}>Pop out</button>
    </>
  );
}
const props: LayoutProps = { store, components };
// @ts-expect-error Content creation requires TabRegistry.
props.createPane = () => undefined;
const root = createRoot(document.getElementById('app')!);
root.render(
  <Context.Provider value="inherited">
    <App />
  </Context.Provider>,
);
Object.assign(window, { consumer: { store, stats, state, dispose: () => root.unmount() } });

const unified = new PaneRegistry<import('react').ComponentType<PaneProps>>();
// @ts-expect-error Unified registration excludes component maps.
const conflict: LayoutProps = { store, registry: unified, components };
// @ts-expect-error Unified registration excludes tabs.
const conflictTabs: LayoutProps = { store, registry: unified, tabs };
void conflict;
void conflictTabs;
function TypedNote({ state }: PaneProps<{ text: string }>) {
  return <p>{state.text}</p>;
}
const typedLayout = (
  <Layout store={store} components={{ note: TypedNote }} getPaneState={() => ({ text: 'typed' })} />
);
void typedLayout;
