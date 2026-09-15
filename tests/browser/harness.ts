import { LayoutStore } from 'quilt-core';
import type { Layout } from 'quilt-core';
import { mountLayout, TabRegistry, PaneRegistry } from 'quilt-vanilla';
import 'quilt-vanilla/styles.css';
import type { PaneRenderer } from 'quilt-vanilla';
import type { MountedLayout } from 'quilt-vanilla';
const data = { text: 'initial' };
const stats = { mounts: 0, disposals: 0, live: 0, errors: [] as string[] };
const fixture: Layout = {
  version: 1,
  maximized: null,
  popouts: [],
  root: {
    kind: 'split',
    id: 'split',
    axis: 'horizontal',
    ratio: 0.5,
    children: [
      { kind: 'group', id: 'left', panes: ['a'], active: 'a' },
      { kind: 'group', id: 'right', panes: ['b'], active: 'b' },
    ],
  },
  panes: {
    a: { id: 'a', type: 'test', title: 'A', size: { minWidth: 100 } },
    b: { id: 'b', type: 'test', title: 'B', size: { minWidth: 100 } },
  },
};
const store = new LayoutStore(fixture);
const tabs = new TabRegistry();
let mounted: MountedLayout;
let fail = false,
  blocked = false;
function mount() {
  mounted = mountLayout<unknown>(document.querySelector('#host')!, {
    store,
    ...(new URLSearchParams(location.search).has('no-registry') ? {} : { tabs }),
    shortcuts: new URLSearchParams(location.search).has('shortcuts'),
    getPaneState: () => data,
    onError: (e) => stats.errors.push(String(e)),
    openWindow: () =>
      blocked ? null : window.open('about:blank', '', 'popup=yes,width=400,height=400'),
    renderers: {
      test: (context) => {
        if (fail && context.location === 'popout') throw Error('Deliberate destination failure');
        stats.mounts++;
        stats.live++;
        const input = context.document.createElement('input');
        input.setAttribute('aria-label', context.pane.title);
        input.value = data.text;
        input.oninput = () => (data.text = input.value);
        context.element.append(input);
        return {
          dispose() {
            stats.disposals++;
            stats.live--;
          },
        };
      },
    },
  });
}
mount();
document.querySelector('#open')!.addEventListener('click', () => mounted.popout('a'));
document.querySelector('#return')!.addEventListener('click', () => mounted.returnPane('a'));
let extra: { store: LayoutStore; mounted: MountedLayout } | undefined;
const unified = new PaneRegistry<PaneRenderer>();
export const harness = {
  unified,
  get extra() {
    return extra!;
  },
  secondary() {
    const host = document.createElement('div');
    host.id = 'secondary';
    host.style.cssText = 'width:900px;height:200px';
    document.body.append(host);
    const other = new LayoutStore(fixture);
    extra = {
      store: other,
      mounted: mountLayout<unknown>(host, { store: other, renderers: {}, shortcuts: true }),
    };
    return;
  },
  useRegistry() {
    mounted.dispose();
    mounted = mountLayout<unknown>(document.querySelector('#host')!, { store, registry: unified });
  },
  registerTest() {
    return unified.register({
      type: 'test',
      title: 'Registered',
      confirmClose: true,
      view: ({ element }) => {
        element.textContent = 'Dynamic renderer';
        return { dispose() {} };
      },
    });
  },
  get mounted() {
    return mounted;
  },
  tabs,
  setTabBar: (options: import('quilt-vanilla').TabBarOptions) => mounted.setTabBar(options),
  setTheme: (theme: import('quilt-vanilla').LayoutTheme) => mounted.setTheme(theme),
  store,
  stats,
  fixture,
  block: () => {
    blocked = true;
  },
  fail: () => {
    fail = true;
  },
  dispose: () => mounted.dispose(),
  remount: () => {
    mounted.dispose();
    mount();
  },
  open: () => mounted.popout('a'),
};
declare global {
  interface Window {
    harness: typeof harness;
  }
}
window.harness = harness;
