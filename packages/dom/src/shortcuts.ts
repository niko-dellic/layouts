import { findNode } from 'layouts-core';
import type { LayoutOptions } from './types.js';
import type { Scope } from './lifetime.js';
export function shortcutEnabled(options: LayoutOptions, key: 'maximize' | 'middleClickClose') {
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
) {
  if (!shortcutEnabled(options, 'maximize')) return;
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
    if (e.defaultPrevented || e.repeat || !maximizeKey || e.ctrlKey || e.metaKey || e.shiftKey)
      return;
    const target = e.target as HTMLElement | null;
    if (
      target?.closest(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), dialog',
      ) ||
      root.ownerDocument.querySelector('dialog[open]')
    )
      return;
    const focused =
      target && root.contains(target)
        ? target.closest<HTMLElement>('.layouts-group')?.dataset.nodeId
        : undefined;
    const id = hovered ?? focused;
    const layout = options.store.getSnapshot();
    if (!id || findNode(layout.root, id)?.kind !== 'group') return;
    e.preventDefault();
    act(() => options.store.maximize(layout.maximized === id ? null : id));
  });
}
