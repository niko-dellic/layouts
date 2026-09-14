import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { Layout } from 'quilt-react';
import { LayoutStore } from 'quilt-core';
import type { TabBarOptions } from 'quilt-vanilla';
import 'quilt-vanilla/styles.css';
const store = new LayoutStore({
  version: 1,
  root: { kind: 'group', id: 'main', panes: ['a'], active: 'a' },
  panes: { a: { id: 'a', type: 'notes', title: 'Notes' } },
  popouts: [],
  maximized: null,
});
let mounts = 0;
function Notes() {
  const [value, setValue] = useState('initial');
  useEffect(() => {
    mounts++;
  }, []);
  return (
    <input aria-label="Retained state" value={value} onChange={(e) => setValue(e.target.value)} />
  );
}
const components = { notes: Notes };
function App() {
  const [tabBar, setTabBar] = useState<TabBarOptions>({});
  return (
    <>
      <button onClick={() => setTabBar({ mode: 'tapered', shape: 'scoop' })}>Taper</button>
      <button onClick={() => setTabBar({})}>Full</button>
      <output
        aria-label="Mounts"
        onClick={(e) => {
          e.currentTarget.textContent = String(mounts);
        }}
      >
        Read mounts
      </output>
      <Layout
        store={store}
        components={components}
        tabBar={tabBar}
        style={{ width: 800, height: 400 }}
      />
    </>
  );
}
createRoot(document.querySelector('#host')!).render(<App />);
