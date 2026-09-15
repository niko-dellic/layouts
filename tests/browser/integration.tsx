import { StrictMode, createContext, useContext, useEffect, useState, createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Layout, LayoutStore, createLayout } from 'quilt-react';
import type { PaneProps, MountedLayout } from 'quilt-react';
import 'quilt-react/styles.css';
const context = createContext('missing');
const store = new LayoutStore(createLayout({ pane: { id: 'a', type: 'note', title: 'Note' } }));
const handle = createRef<MountedLayout>();
const stats = { mounts: 0, live: 0, errors: [] as string[] };
let fail = false;
function Note(props: PaneProps) {
  const value = useContext(context);
  useEffect(() => {
    stats.mounts++;
    stats.live++;
    return () => {
      stats.live--;
    };
  }, []);
  if (fail && props.location === 'popout') throw new Error('Destination failed');
  return (
    <>
      <output aria-label="Provider">{value}</output>
      <input aria-label="Local text" defaultValue="initial" />
    </>
  );
}
function Alternate() {
  return <p>Replacement</p>;
}
function App() {
  const [version, setVersion] = useState(0);
  const [replacement, setReplacement] = useState(false);
  return (
    <context.Provider value={`context ${version}`}>
      <button onClick={() => setVersion((value) => value + 1)}>Rerender</button>
      <button onClick={() => setReplacement(true)}>Replace</button>
      <button
        onClick={() => {
          void handle.current?.popout('a');
        }}
      >
        Pop out
      </button>
      <Layout
        ref={handle}
        store={store}
        components={{ note: replacement ? Alternate : Note }}
        onError={(error) => stats.errors.push(String(error))}
        style={{ height: 400 }}
      />
    </context.Provider>
  );
}
const root = createRoot(document.querySelector('#app')!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
export const integration = {
  store,
  stats,
  handle,
  fail: () => {
    fail = true;
  },
  dispose: () => root.unmount(),
};
declare global {
  interface Window {
    integration: typeof integration;
  }
}
window.integration = integration;
