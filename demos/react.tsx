import { themes } from 'layouts';
import { renderIcon } from './icons.js';
import 'layouts/styles.css';
import './style.css';
import { createRoot } from 'react-dom/client';
import { createRef, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { Layout } from 'layouts-react';
import type { PaneProps } from 'layouts-react';
import type { MountedLayout } from 'layouts';
import { store, state, getPaneState, tabs } from './model.js';
import { imperativeView } from './views.js';
import { setupShell } from './shell.js';
function Notes() {
  const data = useSyncExternalStore(state.subscribe, state.get, state.get);
  return (
    <div className="demo-inspector">
      <p className="eyebrow">SELECTED OBJECT</p>
      <h2>Assembly 01</h2>
      <p className="muted">A little state. A lot of possibility.</p>
      <div className="eyebrow">SURFACE</div>
      <div className="swatches">
        {['#91bfa9', '#dfa776', '#95adc8', '#c9a7c0'].map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Use ${color}`}
            style={{ background: color }}
            onClick={() => state.update({ color })}
          />
        ))}
      </div>
      <label className="field-label">
        Working notes
        <textarea
          aria-label="Working notes"
          value={data.note}
          onChange={(e) => state.update({ note: e.target.value })}
        />
      </label>
      <p className="footnote">App-owned state survives view remounts.</p>
    </div>
  );
}
function Imperative(props: PaneProps) {
  const host = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!host.current) return;
    const element = host.current;
    const view = imperativeView({ ...props, element });
    const observer = new ResizeObserver(() =>
      view.resize?.(element.clientWidth, element.clientHeight),
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      view.dispose();
    };
  }, [props.pane.id, props.document]);
  return <div ref={host} style={{ width: '100%', height: '100%' }} />;
}
const components = {
  notes: Notes,
  canvas: Imperative,
  toolbar: Imperative,
  tools: Imperative,
  timeline: Imperative,
  activity: Imperative,
  footer: Imperative,
};
const demoTheme = { ...themes.sage, fontSize: '11px', headerHeight: '32px' };
const ref = createRef<MountedLayout>();
const root = createRoot(document.querySelector('#workspace')!);
root.render(
  <Layout
    ref={ref}
    store={store}
    components={components}
    getPaneState={getPaneState}
    tabs={tabs}
    theme={demoTheme}
    renderIcon={renderIcon}
    shortcuts
  />,
);
setupShell(() => ref.current ?? undefined);
