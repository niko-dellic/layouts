import type { Group } from 'quilt-core';
import { findNode } from 'quilt-core';
import type { LayoutOptions } from './types.js';
import type { Scope } from './lifetime.js';
export function shortcutEnabled(
  options: LayoutOptions,
  key: 'maximize' | 'middleClickClose' | 'addTab' | 'restoreClosedTab',
) {
  return (
    options.shortcuts === true ||
    (typeof options.shortcuts === 'object' && options.shortcuts[key] === true)
  );
}
export function bindShortcuts(
  root: HTMLElement,
  options: LayoutOptions,
  scope: Scope,
  act: (fn: () => void) => void,
  addTab: (group: Group) => void,
) {
  if (
    !shortcutEnabled(options, 'maximize') &&
    !shortcutEnabled(options, 'addTab') &&
    !shortcutEnabled(options, 'restoreClosedTab')
  )
    return;
  let hovered: string | undefined;
  scope.listen(root, 'pointerover', (event) => {
    hovered = (event.target as Element).closest<HTMLElement>('.layouts-group')?.dataset.nodeId;
  });
  scope.listen(root, 'pointerleave', () => {
    hovered = undefined;
  });
  scope.listen(root.ownerDocument, 'keydown', (event) => {
    const e = event as KeyboardEvent;
    const maximizeKey = (e.altKey && e.code === 'Space') || (!e.altKey && e.key === '`');
    const addTabKey = !e.metaKey && !e.altKey && e.key.toLowerCase() === 't';
    const maximize = !e.metaKey && maximizeKey && shortcutEnabled(options, 'maximize');
    const restore =
      !e.metaKey &&
      !e.altKey &&
      e.key.toLowerCase() === 'r' &&
      shortcutEnabled(options, 'restoreClosedTab');
    const create = addTabKey && shortcutEnabled(options, 'addTab');
    if (
      e.isComposing ||
      e.defaultPrevented ||
      e.repeat ||
      (!maximize && !create && !restore) ||
      e.ctrlKey ||
      e.shiftKey
    )
      return;
    const target = e.target as HTMLElement | null;
    if (
      target?.closest(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), dialog',
      ) ||
      root.ownerDocument.querySelector('dialog[open]')
    )
      return;
    if (restore) {
      if (options.store.canRestoreClosedTab()) {
        e.preventDefault();
        act(() => options.store.restoreClosedTab());
      }
      return;
    }
    const focused =
      target && root.contains(target)
        ? target.closest<HTMLElement>('.layouts-group')?.dataset.nodeId
        : undefined;
    const id = create ? hovered : (hovered ?? focused);
    const layout = options.store.getSnapshot();
    const group = id ? findNode(layout.root, id) : undefined;
    if (group?.kind !== 'group') return;
    if (
      create &&
      (!options.tabs?.list().length ||
        !group.panes.every((paneId) => options.store.can(paneId, 'move')))
    )
      return;
    e.preventDefault();
    act(() =>
      create
        ? addTab(group)
        : options.store.maximize(layout.maximized === group.id ? null : group.id),
    );
  });
}
