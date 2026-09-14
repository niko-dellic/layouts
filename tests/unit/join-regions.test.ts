import { describe, expect, it } from 'vitest';
import { allocate, bounds, groups, joinRange, LayoutStore, validate } from 'quilt-core';
import type { Axis, Group, Layout, Node, Split } from 'quilt-core';
const group = (id: string): Group => ({ kind: 'group', id, panes: [id], active: id });
const split = (id: string, a: Node, b: Node, axis: Axis = 'horizontal'): Split => ({
  kind: 'split',
  id,
  axis,
  ratio: 0.5,
  children: [a, b],
});
function fixture(axis: Axis = 'horizontal'): Layout {
  return {
    version: 1,
    maximized: null,
    popouts: [],
    root: split(
      'row',
      group('a'),
      split('tail', split('canvases', group('b'), group('c'), axis), group('d'), axis),
      axis,
    ),
    panes: Object.fromEntries(
      ['a', 'b', 'c', 'd'].map((id) => [id, { id, type: 'test', title: id }]),
    ),
  };
}
function measure(layout: Layout, total: number) {
  const extents: Record<string, number> = {};
  const visit = (node: Node, size: number) => {
    extents[node.id] = size;
    if (node.kind === 'group') return;
    const a = bounds(node.children[0], layout),
      b = bounds(node.children[1], layout);
    const horizontal = node.axis === 'horizontal';
    const sizes = allocate(
      size,
      node.ratio,
      horizontal ? a.minWidth : a.minHeight,
      horizontal ? a.maxWidth : a.maxHeight,
      horizontal ? b.minWidth : b.minHeight,
      horizontal ? b.maxWidth : b.maxHeight,
      node.gap,
    );
    visit(node.children[0], sizes[0]);
    visit(node.children[1], sizes[1]);
  };
  visit(layout.root, total);
  return extents;
}
describe('contiguous region joins', () => {
  for (const axis of ['horizontal', 'vertical'] as const) {
    for (const [receiver, other, expected] of [
      ['a', 'b', ['a', 'b']],
      ['b', 'a', ['a', 'b']],
      ['b', 'd', ['b', 'c', 'd']],
      ['d', 'b', ['b', 'c', 'd']],
      ['a', 'd', ['a', 'b', 'c', 'd']],
    ] as const) {
      it(`${axis}: joins ${receiver} through ${other} across nested parents`, () => {
        const store = new LayoutStore(fixture(axis));
        store.joinRegions(receiver, other);
        const result = store.export();
        expect(groups(result.root).find((g) => g.id === receiver)).toMatchObject({
          panes: expected,
          active: receiver,
        });
        expect(
          groups(result.root)
            .flatMap((g) => g.panes)
            .sort(),
        ).toEqual(['a', 'b', 'c', 'd']);
        expect(result.panes).toEqual(fixture().panes);
        expect(validate(result)).toEqual([]);
      });
    }
  }
  it('preserves measured surrounding sizes, including custom gaps and constrained panes', () => {
    const layout = fixture();
    (layout.root as Split).gap = 9;
    layout.panes.a!.size = { minWidth: 150, maxWidth: 150 };
    const before = measure(layout, 1200);
    const store = new LayoutStore(layout);
    store.joinRegions('b', 'c', { extents: before });
    const after = measure(store.export(), 1200);
    expect(after.a).toBeCloseTo(before.a!, 8);
    expect(after.d).toBeCloseTo(before.d!, 8);
    expect(after.b).toBeCloseTo(before.b! + before.c! + 4, 8);
  });
  it('rejects a perpendicular barrier and invalid endpoints atomically', () => {
    const layout = fixture();
    ((layout.root as Split).children[1] as Split).axis = 'vertical';
    const store = new LayoutStore(layout);
    const before = store.getSnapshot();
    expect(joinRange(before.root, 'b', 'a')).toBeUndefined();
    for (const target of ['a', 'd', 'missing', 'b']) {
      expect(() => store.joinRegions('b', target)).toThrow();
      expect(store.getSnapshot()).toBe(before);
    }
  });
  it('checks intermediate pane permissions and preserves the snapshot on failure', () => {
    const layout = fixture();
    layout.panes.c!.capabilities = { join: false };
    const store = new LayoutStore(layout);
    const before = store.getSnapshot();
    expect(() => store.joinRegions('b', 'd', { source: 'user' })).toThrow();
    expect(store.getSnapshot()).toBe(before);
    store.joinRegions('b', 'd');
    expect(groups(store.export().root).find((g) => g.id === 'b')!.panes).toEqual(['b', 'c', 'd']);
  });
  it('rejects incompatible content constraints and bad measurements atomically', () => {
    const layout = fixture();
    layout.panes.b!.size = { minWidth: 200 };
    layout.panes.c!.size = { maxWidth: 100 };
    const store = new LayoutStore(layout);
    const before = store.getSnapshot();
    expect(() => store.joinRegions('b', 'c')).toThrow();
    expect(() => store.joinRegions('a', 'b', { extents: { a: NaN } })).toThrow();
    expect(store.getSnapshot()).toBe(before);
  });
  it('keeps receiver metadata and detached panes, including empty groups', () => {
    const layout = fixture();
    const b = groups(layout.root).find((g) => g.id === 'b')!;
    b.tabPlacement = 'left';
    b.tabDisplay = 'compact';
    b.panes = [];
    b.active = null;
    layout.popouts = [{ paneId: 'b', groupId: 'b', index: 0 }];
    const store = new LayoutStore(layout);
    store.joinRegions('b', 'c');
    expect(groups(store.export().root).find((g) => g.id === 'b')).toMatchObject({
      tabPlacement: 'left',
      tabDisplay: 'compact',
      active: 'c',
      panes: ['c'],
    });
    expect(store.export().popouts).toEqual(layout.popouts);
    store.returnPane('b');
    expect(groups(store.export().root).find((g) => g.id === 'b')!.panes).toEqual(['b', 'c']);
  });
});
