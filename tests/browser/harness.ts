import { LayoutStore } from '@niko-dellic/layouts-core';
import type { Layout } from '@niko-dellic/layouts-core';
import { mountLayout, TabRegistry } from '@niko-dellic/layouts';
import '@niko-dellic/layouts/styles.css';
import type { MountedLayout } from '@niko-dellic/layouts';
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
  mounted = mountLayout(document.querySelector('#host')!, {
    store,
    tabs,
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
export const harness = {
  tabs,
  setTheme: (theme: import('@niko-dellic/layouts').LayoutTheme) => mounted.setTheme(theme),
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
