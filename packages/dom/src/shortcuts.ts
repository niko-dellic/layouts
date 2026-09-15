import { findNode } from 'quilt-core';
import type { Group } from 'quilt-core';
import type { ResolvedLayoutOptions, KeyBinding } from './types.js';
import type { Scope } from './lifetime.js';
type Action = 'maximize' | 'addTab' | 'restoreClosedTab';
const defaults: Record<Action, readonly KeyBinding[]> = {
  maximize: [{ key: '`' }, { key: ' ', alt: true }],
  addTab: [{ key: 't' }],
  restoreClosedTab: [{ key: 'r' }],
};
export function shortcutEnabled(options: ResolvedLayoutOptions, key: Action | 'middleClickClose') {
  return (
    options.shortcuts === true ||
    (typeof options.shortcuts === 'object' && !!options.shortcuts[key])
  );
}
const hovered = new WeakMap<Document, HTMLElement>();
export function bindShortcuts(
  root: HTMLElement,
  options: ResolvedLayoutOptions,
  scope: Scope,
  act: (fn: () => void) => void,
  addTab: (group: Group) => void,
) {
  const doc = root.ownerDocument;
  let hoveredGroup: string | undefined;
  scope.listen(root, 'pointerover', (event) => {
    hovered.set(doc, root);
    hoveredGroup = (event.target as Element).closest<HTMLElement>('.layouts-group')?.dataset.nodeId;
  });
  scope.listen(root, 'pointerleave', () => {
    if (hovered.get(doc) === root) hovered.delete(doc);
    hoveredGroup = undefined;
  });
  scope.add(() => {
    if (hovered.get(doc) === root) hovered.delete(doc);
  });
  scope.listen(doc, 'keydown', (event) => {
    const e = event as KeyboardEvent;
    const target = e.target as HTMLElement | null;
    const focused = doc.activeElement?.closest<HTMLElement>('.layouts');
    if ((focused ?? hovered.get(doc)) !== root || e.defaultPrevented || e.repeat || e.isComposing)
      return;
    if (
      target?.closest(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), dialog',
      ) ||
      doc.querySelector('dialog[open]')
    )
      return;
    const matches = (binding: KeyBinding) =>
      e.key.toLowerCase() === binding.key.toLowerCase() &&
      e.ctrlKey === !!binding.ctrl &&
      e.altKey === !!binding.alt &&
      e.shiftKey === !!binding.shift &&
      e.metaKey === !!binding.meta;
    const action = (Object.keys(defaults) as Action[]).find((key) => {
      const configured =
        options.shortcuts === true
          ? true
          : typeof options.shortcuts === 'object'
            ? options.shortcuts[key]
            : false;
      if (!configured) return false;
      const bindings =
        configured === true
          ? defaults[key]
          : Array.isArray(configured)
            ? configured
            : [configured as KeyBinding];
      return bindings.some(matches);
    });
    if (!action) return;
    if (action === 'restoreClosedTab') {
      if (!options.store.canRestoreClosedTab()) return;
      e.preventDefault();
      act(() => options.store.restoreClosedTab());
      return;
    }
    const focusedGroup =
      focused === root ? target?.closest<HTMLElement>('.layouts-group')?.dataset.nodeId : undefined;
    const id = (hovered.get(doc) === root ? hoveredGroup : undefined) ?? focusedGroup;
    const group = id ? findNode(options.store.getSnapshot().root, id) : undefined;
    if (group?.kind !== 'group') return;
    if (
      action === 'addTab' &&
      (!options.tabs?.list().length || !group.panes.every((id) => options.store.can(id, 'move')))
    )
      return;
    e.preventDefault();
    act(() =>
      action === 'addTab'
        ? addTab(group)
        : options.store.maximize(
            options.store.getSnapshot().maximized === group.id ? null : group.id,
          ),
    );
  });
}
