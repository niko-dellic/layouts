import { describe, it, expect } from 'vitest';
import {
  LayoutStore,
  parseLayout,
  allocate,
  bounds,
  groups,
  validate,
} from '@niko-dellic/layouts-core';
import type { Layout, Pane } from '@niko-dellic/layouts-core';
const pane = (id: string): Pane => ({ id, type: 'test', title: id });
function fixture(): Layout {
  return {
    version: 1,
    root: {
      kind: 'split',
      id: 'root',
      axis: 'horizontal',
      ratio: 0.4,
      children: [
        { kind: 'group', id: 'a-group', panes: ['a', 'b'], active: 'a' },
        { kind: 'group', id: 'c-group', panes: ['c'], active: 'c' },
      ],
    },
    panes: { a: pane('a'), b: pane('b'), c: pane('c') },
    popouts: [],
    maximized: null,
  };
}
describe('transactional layout model', () => {
  it('round-trips snapshots and isolates caller mutation', () => {
    const input = fixture();
    const s = new LayoutStore(input);
    input.panes.a!.title = 'changed';
    const copy = s.export();
    copy.panes.a!.title = 'also changed';
    expect(s.getSnapshot().panes.a!.title).toBe('a');
    expect(parseLayout(JSON.parse(JSON.stringify(s.export())))).toEqual(fixture());
    expect(Object.isFrozen(s.getSnapshot().root)).toBe(true);
  });
  it('rejects malformed inputs without changing the current snapshot', () => {
    const s = new LayoutStore(fixture());
    const before = s.getSnapshot();
    const bad = fixture();
    bad.root = { kind: 'group', id: 'bad', panes: ['a', 'a'], active: 'a' };
    expect(() => s.load(bad)).toThrow();
    expect(s.getSnapshot()).toBe(before);
    expect(validate({ ...fixture(), version: 3 })).not.toEqual([]);
  });
  it('rejects functions, cycles, duplicate ids and nonfinite values', () => {
    expect(() => parseLayout({ ...fixture(), bad: () => {} })).toThrow();
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(validate(cyclic).length).toBeGreaterThan(0);
    const bad = fixture();
    bad.panes.a!.size = { minWidth: Infinity };
    expect(validate(bad).length).toBeGreaterThan(0);
  });
  it('splits, joins and preserves every pane exactly once', () => {
    const s = new LayoutStore(fixture());
    s.split('c-group', 'vertical', pane('d'));
    expect(groups(s.getSnapshot().root)).toHaveLength(3);
    s.join('c-group');
    expect(groups(s.getSnapshot().root).find((g) => g.id === 'c-group')?.panes).toEqual(['c', 'd']);
    expect(validate(s.export())).toEqual([]);
  });
  it('moves tabs and edge-docks without creating empty branches', () => {
    const s = new LayoutStore(fixture());
    s.move('b', 'c-group', 'tab', 0);
    expect(groups(s.getSnapshot().root).find((g) => g.id === 'c-group')?.panes).toEqual(['b', 'c']);
    s.move('a', 'c-group', 'bottom');
    expect(groups(s.getSnapshot().root)).toHaveLength(2);
    expect(validate(s.export())).toEqual([]);
  });
  it('enforces user capabilities but allows host operations', () => {
    const f = fixture();
    f.panes.a!.capabilities = {
      resize: false,
      move: false,
      split: false,
      join: false,
      close: false,
      popout: false,
    };
    const s = new LayoutStore(f);
    expect(() => s.close('a', { source: 'user' })).toThrow();
    expect(() => s.resize('root', 0.6, { source: 'user' })).toThrow();
    expect(() => s.move('a', 'c-group', 'tab', undefined, { source: 'user' })).toThrow();
    expect(() => s.split('a-group', 'vertical', pane('d'), { source: 'user' })).toThrow();
    s.resize('root', 0.6);
    s.close('a');
    expect(s.getSnapshot().panes.a).toBeUndefined();
  });
  it('returns a popout after its original group disappears', () => {
    const s = new LayoutStore(fixture());
    s.popout('c');
    expect(s.getSnapshot().popouts[0]?.groupId).toBe('c-group');
    s.returnPane('c');
    expect(s.getSnapshot().popouts).toEqual([]);
    expect(groups(s.getSnapshot().root).flatMap((g) => g.panes)).toContain('c');
  });
  it('supports all panes popped out and arbitrary return order', () => {
    const s = new LayoutStore(fixture());
    for (const id of ['a', 'b', 'c']) s.popout(id);
    expect(groups(s.getSnapshot().root)[0]?.panes).toEqual([]);
    for (const id of ['c', 'b', 'a']) s.returnPane(id);
    expect(validate(s.export())).toEqual([]);
    expect(
      groups(s.getSnapshot().root)
        .flatMap((g) => g.panes)
        .sort(),
    ).toEqual(['a', 'b', 'c']);
  });
  it('clears maximize if its group is removed', () => {
    const s = new LayoutStore(fixture());
    s.maximize('c-group');
    s.close('c');
    expect(s.getSnapshot().maximized).toBe(null);
  });
  it('unsubscribes and makes disposal idempotent', () => {
    const s = new LayoutStore(fixture());
    let n = 0;
    const stop = s.subscribe(() => n++);
    s.activate('a-group', 'b');
    stop();
    s.activate('a-group', 'a');
    expect(n).toBe(1);
    s.dispose();
    s.dispose();
    expect(() => s.close('a')).toThrow(/disposed/);
  });
  it('isolates observer exceptions after a committed change', () => {
    const s = new LayoutStore(fixture());
    let seen = 0;
    s.onError(() => seen++);
    s.subscribe(() => {
      throw Error('consumer');
    });
    s.close('a');
    expect(seen).toBe(1);
    expect(s.getSnapshot().panes.a).toBeUndefined();
  });
});
describe('constraints', () => {
  it('retains minima in small viewports and caps maxima', () => {
    expect(allocate(100, 0.5, 90, Infinity, 80, Infinity)).toEqual([90, 80]);
    expect(allocate(1000, 0.8, 50, 100, 50, 200)).toEqual([100, 200]);
    expect(allocate(400, 0.9, 48, 48, 100, Infinity)).toEqual([48, 346]);
  });
  it('rejects incompatible tab constraints atomically', () => {
    const f = fixture();
    f.panes.a!.size = { minWidth: 400 };
    f.panes.b!.size = { maxWidth: 300 };
    expect(() => new LayoutStore(f)).toThrow(/cannot coexist/);
  });
  it('computes recursive constraints including dividers', () => {
    const f = fixture();
    f.panes.a!.size = { minWidth: 100, minHeight: 60 };
    f.panes.c!.size = { minWidth: 200, minHeight: 90 };
    expect(bounds(f.root, f).minWidth).toBe(306);
    expect(bounds(f.root, f).minHeight).toBe(90);
  });
  it('maintains invariants through repeated operation sequences', () => {
    const s = new LayoutStore(fixture());
    for (let i = 0; i < 60; i++) {
      s.split('a-group', i % 2 ? 'horizontal' : 'vertical', pane('extra-' + i));
      s.move('extra-' + i, 'c-group');
      s.popout('extra-' + i);
      s.returnPane('extra-' + i);
      s.close('extra-' + i);
      expect(validate(s.export())).toEqual([]);
    }
    expect(Object.keys(s.export().panes).sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('configuration replacement and nested observers', () => {
  it('loads a new configuration without retaining old extra fields', () => {
    const s = new LayoutStore({ ...fixture(), extra: 'old' });
    s.load(fixture());
    expect(s.export()).toEqual(fixture());
  });
  it('delivers nested commands in commit order with matching snapshots', () => {
    const s = new LayoutStore(fixture());
    const seen: string[] = [];
    s.subscribe((event) => {
      if (event.action === 'activate') s.close('c');
    });
    s.subscribe((event) => seen.push(event.action + ':' + Object.keys(event.layout.panes).length));
    s.activate('a-group', 'b');
    expect(seen).toEqual(['activate:3', 'close:2']);
  });
  it('returns panes into a new region when existing groups have incompatible constraints', () => {
    const f = fixture();
    f.panes.a!.size = { maxWidth: 200 };
    f.panes.b!.size = { maxWidth: 200 };
    f.panes.c!.size = { minWidth: 300 };
    const s = new LayoutStore(f);
    s.popout('c');
    s.returnPane('c');
    expect(groups(s.getSnapshot().root)).toHaveLength(2);
    expect(validate(s.export())).toEqual([]);
  });
});
