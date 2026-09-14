import { findNode, findParent, groups, paneIds, parseLayout, validate } from './model.js';
import { LayoutError } from './types.js';
import type {
  AutoCollapse,
  LayoutStoreOptions,
  Axis,
  Capability,
  Change,
  CommandOptions,
  Group,
  Layout,
  Node,
  Pane,
  WindowPlacement,
} from './types.js';
const freeze = <T>(value: T): T => {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
};
function problem(message: string): never {
  throw new LayoutError([{ path: 'command', message }]);
}
export class LayoutStore {
  private state: Layout;
  private initial: Layout;
  private listeners = new Set<(event: Change) => void>();
  private errors = new Set<(error: unknown) => void>();
  private disposed = false;
  private serial = 0;
  private notifying = false;
  private pending: Change[] = [];
  private autoCollapse: AutoCollapse = 'disabled';
  constructor(input: unknown, options: LayoutStoreOptions = {}) {
    this.setAutoCollapse(options.autoCollapse ?? 'disabled');
    this.state = freeze(parseLayout(input));
    this.initial = this.export();
  }
  /** Stable immutable snapshot, suitable for useSyncExternalStore. */
  getSnapshot = (): Layout => this.state;
  export(): Layout {
    return structuredClone(this.state);
  }
  subscribe = (listener: (event: Change) => void): (() => void) => {
    this.alive();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  onError(listener: (error: unknown) => void): () => void {
    this.errors.add(listener);
    return () => {
      this.errors.delete(listener);
    };
  }
  private alive() {
    if (this.disposed) problem('Store has been disposed');
  }
  private report(error: unknown) {
    for (const listener of this.errors) {
      try {
        listener(error);
      } catch {
        /* A reporting callback cannot invalidate a committed layout. */
      }
    }
  }
  private commit(action: string, mutate: (draft: Layout) => void) {
    this.alive();
    let next: Layout;
    try {
      next = this.export();
      mutate(next);
      next = parseLayout(next);
    } catch (error) {
      this.report(error);
      throw error;
    }
    this.state = freeze(next);
    this.pending.push({ action, layout: this.state });
    if (this.notifying) return;
    this.notifying = true;
    try {
      while (this.pending.length) {
        const event = this.pending.shift()!;
        for (const listener of [...this.listeners]) {
          if (!this.listeners.has(listener)) continue;
          try {
            listener(event);
          } catch (error) {
            this.report(error);
          }
        }
      }
    } finally {
      this.notifying = false;
    }
  }

  private group(draft: Layout, id: string): Group {
    const n = findNode(draft.root, id);
    if (n?.kind !== 'group') problem('Group not found: ' + id);
    return n;
  }
  private pane(draft: Layout, id: string): Pane {
    if (!Object.hasOwn(draft.panes, id)) problem('Pane not found: ' + id);
    return draft.panes[id]!;
  }
  private permit(draft: Layout, ids: string[], cap: Capability, options: CommandOptions) {
    for (const id of ids)
      if (options.source === 'user' && this.pane(draft, id).capabilities?.[cap] === false)
        problem(`${cap} is disabled for ${id}`);
  }
  private id(draft: Layout): string {
    let id: string;
    do {
      id = `layout-${++this.serial}`;
    } while (findNode(draft.root, id));
    return id;
  }
  private replace(draft: Layout, old: Node, next: Node) {
    const parent = findParent(draft.root, old.id);
    if (parent) parent.children[parent.children[0].id === old.id ? 0 : 1] = next;
    else draft.root = next;
  }
  private detach(draft: Layout, id: string): Group {
    const g = groups(draft.root).find((n) => n.panes.includes(id));
    if (!g) problem('Pane is not docked: ' + id);
    const at = g.panes.indexOf(id);
    g.panes.splice(at, 1);
    if (g.active === id) g.active = g.panes[Math.min(at, g.panes.length - 1)] ?? null;
    return g;
  }
  getAutoCollapse(): AutoCollapse {
    return this.autoCollapse;
  }
  setAutoCollapse(mode: AutoCollapse): void {
    this.alive();
    if (!['enabled', 'protected', 'disabled'].includes(mode)) problem('Invalid autoCollapse mode');
    this.autoCollapse = mode;
  }
  private tidy(draft: Layout, source?: Group, popout = false) {
    if (
      source &&
      !source.panes.length &&
      this.autoCollapse !== 'disabled' &&
      (!popout || this.autoCollapse === 'enabled')
    ) {
      const parent = findParent(draft.root, source.id);
      if (parent)
        this.replace(draft, parent, parent.children[parent.children[0].id === source.id ? 1 : 0]);
    }
    if (draft.maximized && !findNode(draft.root, draft.maximized)) draft.maximized = null;
  }
  can(paneId: string, capability: Capability): boolean {
    return (
      Boolean(this.state.panes[paneId]) &&
      this.state.panes[paneId]!.capabilities?.[capability] !== false
    );
  }
  load(input: unknown) {
    this.commit('load', (draft) => {
      const next = parseLayout(input);
      for (const key of Object.keys(draft)) Reflect.deleteProperty(draft, key);
      Object.assign(draft, next);
    });
  }
  reset() {
    this.load(this.initial);
  }
  setTabPlacement(groupId: string, placement: Group['tabPlacement']) {
    this.commit('setTabPlacement', (draft) => {
      const group = findNode(draft.root, groupId);
      if (!group || group.kind !== 'group') problem('Expected a group id');
      if (placement === undefined) delete group.tabPlacement;
      else group.tabPlacement = placement;
    });
  }
  activate(groupId: string, paneId: string) {
    this.commit('activate', (d) => {
      const g = this.group(d, groupId);
      if (!g.panes.includes(paneId)) problem('Tab does not belong to group');
      g.active = paneId;
    });
  }
  resize(splitId: string, ratio: number, options: CommandOptions = {}) {
    this.commit('resize', (d) => {
      const n = findNode(d.root, splitId);
      if (n?.kind !== 'split') problem('Split not found');
      this.permit(d, paneIds(n), 'resize', options);
      n.ratio = ratio;
    });
  }
  /** Atomically update coupled split ratios without intermediate layouts. */
  resizeMany(ratios: Record<string, number>, options: CommandOptions = {}) {
    this.commit('resize', (d) => {
      for (const [id, ratio] of Object.entries(ratios)) {
        const node = findNode(d.root, id);
        if (node?.kind !== 'split') problem('Split not found');
        this.permit(d, paneIds(node), 'resize', options);
        node.ratio = ratio;
      }
    });
  }
  maximize(groupId: string | null) {
    this.commit('maximize', (d) => {
      if (groupId) this.group(d, groupId);
      d.maximized = groupId;
    });
  }
  add(pane: Pane, groupId: string, options: CommandOptions = {}) {
    this.commit('add', (d) => {
      const g = this.group(d, groupId);
      this.permit(d, g.panes, 'move', options);
      if (Object.hasOwn(d.panes, pane.id)) problem('Pane id already exists');
      Object.defineProperty(d.panes, pane.id, {
        value: structuredClone(pane),
        enumerable: true,
        writable: true,
        configurable: true,
      });
      g.panes.push(pane.id);
      g.active = pane.id;
    });
  }
  updatePane(pane: Pane) {
    this.commit('updatePane', (d) => {
      this.pane(d, pane.id);
      d.panes[pane.id] = structuredClone(pane);
    });
  }
  split(
    groupId: string,
    axis: Axis,
    pane: Pane | null,
    options: CommandOptions & { before?: boolean; ratio?: number } = {},
  ) {
    let created = '';
    this.commit('split', (d) => {
      const g = this.group(d, groupId);
      this.permit(d, g.panes, 'split', options);
      if (pane) {
        if (Object.hasOwn(d.panes, pane.id)) problem('Pane id already exists');
        Object.defineProperty(d.panes, pane.id, {
          value: structuredClone(pane),
          enumerable: true,
          writable: true,
          configurable: true,
        });
      }
      const group: Group = {
        kind: 'group',
        id: this.id(d),
        panes: pane ? [pane.id] : [],
        active: pane?.id ?? null,
      };
      created = group.id;
      this.replace(d, g, {
        kind: 'split',
        id: this.id(d),
        axis,
        ratio: options.ratio ?? 0.5,
        children: options.before ? [group, g] : [g, group],
      });
    });
    return created;
  }
  /** Cancel only an unfilled region; never roll back edits made elsewhere. */
  removeEmptyGroup(groupId: string) {
    const existing = findNode(this.state.root, groupId);
    if (
      existing?.kind !== 'group' ||
      existing.panes.length ||
      !findParent(this.state.root, groupId)
    )
      return;
    this.commit('removeEmptyGroup', (d) => {
      if (d.maximized === groupId) d.maximized = null;
      const parent = findParent(d.root, groupId)!;
      this.replace(d, parent, parent.children[parent.children[0].id === groupId ? 1 : 0]);
    });
  }
  /** Move to a tab group or to a new split at an edge. */
  move(
    paneId: string,
    groupId: string,
    position: 'tab' | 'left' | 'right' | 'top' | 'bottom' = 'tab',
    index?: number,
    options: CommandOptions = {},
  ) {
    this.commit('move', (d) => {
      const target = this.group(d, groupId);
      const source = groups(d.root).find((g) => g.panes.includes(paneId));
      if (!source) problem('Return a popped-out pane before moving it');
      this.permit(d, [paneId, ...target.panes], 'move', options);
      if (position !== 'tab') this.permit(d, target.panes, 'split', options);
      if (source === target && target.panes.length === 1) return;
      this.detach(d, paneId);
      if (position === 'tab') {
        target.panes.splice(
          Math.max(0, Math.min(index ?? target.panes.length, target.panes.length)),
          0,
          paneId,
        );
        target.active = paneId;
      } else {
        const g: Group = { kind: 'group', id: this.id(d), panes: [paneId], active: paneId };
        const before = position === 'left' || position === 'top';
        this.replace(d, target, {
          kind: 'split',
          id: this.id(d),
          axis: position === 'left' || position === 'right' ? 'horizontal' : 'vertical',
          ratio: 0.5,
          children: before ? [g, target] : [target, g],
        });
      }
      this.tidy(d, source);
    });
  }
  /** Join the sibling region at this split, retaining its content as tabs. */
  join(groupId: string, options: CommandOptions = {}) {
    this.commit('join', (d) => {
      const g = this.group(d, groupId),
        parent = findParent(d.root, groupId);
      if (!parent) return;
      this.permit(d, paneIds(parent), 'join', options);
      g.panes = paneIds(parent);
      g.active ??= g.panes[0] ?? null;
      this.replace(d, parent, g);
      this.tidy(d);
    });
  }
  close(paneId: string, options: CommandOptions = {}) {
    this.commit('close', (d) => {
      this.permit(d, [paneId], 'close', options);
      this.pane(d, paneId);
      let source: Group | undefined;
      if (d.popouts.some((p) => p.paneId === paneId))
        d.popouts = d.popouts.filter((p) => p.paneId !== paneId);
      else source = this.detach(d, paneId);
      delete d.panes[paneId];
      this.tidy(d, source);
    });
  }
  popout(paneId: string, placement?: WindowPlacement, options: CommandOptions = {}) {
    this.commit('popout', (d) => {
      this.permit(d, [paneId], 'popout', options);
      const group = groups(d.root).find((g) => g.panes.includes(paneId));
      if (!group) problem('Pane is not docked');
      const entry = {
        paneId,
        groupId: group.id,
        index: group.panes.indexOf(paneId),
        ...(placement ? { placement } : {}),
      };
      this.detach(d, paneId);
      d.popouts.push(entry);
      this.tidy(d, group, true);
    });
  }
  returnPane(paneId: string) {
    this.commit('return', (d) => {
      const entry = d.popouts.find((p) => p.paneId === paneId);
      if (!entry) return;
      const preferred = findNode(d.root, entry.groupId);
      d.popouts = d.popouts.filter((p) => p.paneId !== paneId);
      d.maximized = null;
      const candidates = [
        ...(preferred?.kind === 'group' ? [preferred] : []),
        ...groups(d.root).filter(
          (g) => g.id !== entry.groupId && g.panes.every((id) => d.panes[id]!.header !== false),
        ),
      ];
      for (const target of candidates) {
        const previousActive = target.active;
        target.panes.splice(Math.min(entry.index, target.panes.length), 0, paneId);
        target.active = paneId;
        if (!validate(d).length) return;
        target.panes.splice(target.panes.indexOf(paneId), 1);
        target.active = previousActive;
      }
      const g: Group = { kind: 'group', id: this.id(d), panes: [paneId], active: paneId };
      d.root = {
        kind: 'split',
        id: this.id(d),
        axis: 'horizontal',
        ratio: 0.7,
        children: [d.root, g],
      };
    });
  }
  dispose() {
    this.listeners.clear();
    this.errors.clear();
    this.pending = [];
    this.disposed = true;
  }
}
