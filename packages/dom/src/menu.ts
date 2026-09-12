import type { Group, Pane } from '@niko-dellic/layouts-core';
import type { LayoutOptions } from './types.js';
import type { Windows } from './windows.js';
import { el, Scope } from './lifetime.js';
export function createPaneMenu(
  root: HTMLElement,
  options: Pick<LayoutOptions, 'store' | 'createPane'>,
  windows: Pick<Windows, 'pending' | 'open'>,
  refresh: () => void,
  report: (e: unknown) => void,
) {
  const doc = root.ownerDocument,
    win = doc.defaultView!;
  let current: Scope | undefined;
  const act = (fn: () => void) => {
    try {
      fn();
    } catch (error) {
      report(error);
    }
  };
  function button(text: string, title: string, action: () => void) {
    const b = el(doc, 'button', 'layouts-button', text);
    b.type = 'button';
    b.title = title;
    b.setAttribute('aria-label', title);
    b.onclick = () => act(action);
    return b;
  }
  function open(anchor: HTMLElement, pane: Pane, group: Group) {
    current?.dispose();
    const local = new Scope();
    current = local;
    const dialog = el(doc, 'dialog', 'layouts-menu');
    dialog.setAttribute('aria-label', `${pane.title} actions`);
    local.add(() => dialog.remove());
    const add = (label: string, enabled: boolean, fn: () => void) => {
      const b = button(label, label, () => {
        local.dispose();
        act(fn);
      });
      b.disabled = !enabled;
      dialog.append(b);
    };
    const allowed = (cap: 'split' | 'join' | 'move') =>
      group.panes.every((id) => options.store.can(id, cap));
    const create = (axis: 'horizontal' | 'vertical') => {
      const fresh = options.createPane?.(pane);
      if (fresh) options.store.split(group.id, axis, fresh, { source: 'user' });
    };
    add('+ Add tab', Boolean(options.createPane) && allowed('move'), () => {
      const fresh = options.createPane?.(pane);
      if (fresh) options.store.add(fresh, group.id, { source: 'user' });
    });
    add('Split right', Boolean(options.createPane) && allowed('split'), () => create('horizontal'));
    add('Split below', Boolean(options.createPane) && allowed('split'), () => create('vertical'));
    add('Join sibling region', allowed('join'), () =>
      options.store.join(group.id, { source: 'user' }),
    );
    add(
      options.store.getSnapshot().maximized === group.id ? 'Restore region' : 'Maximize region',
      true,
      () =>
        options.store.maximize(
          options.store.getSnapshot().maximized === group.id ? null : group.id,
        ),
    );
    add(
      windows.pending.has(pane.id) ? 'Reopen window' : 'Open in window',
      options.store.can(pane.id, 'popout'),
      () => {
        windows.open(pane.id, windows.pending.get(pane.id));
        refresh();
      },
    );
    add('Close pane', options.store.can(pane.id, 'close'), () =>
      options.store.close(pane.id, { source: 'user' }),
    );
    add('Cancel', true, () => {});
    root.append(dialog);
    const rect = anchor.getBoundingClientRect();
    dialog.style.left = `${Math.max(8, Math.min(rect.right - 230, win!.innerWidth - 250))}px`;
    dialog.style.top = `${Math.min(rect.bottom + 4, win!.innerHeight - 180)}px`;
    local.listen(dialog, 'close', () => local.dispose());
    local.listen(dialog, 'click', (event) => {
      if (event.target === dialog) {
        const r = dialog.getBoundingClientRect();
        const e = event as MouseEvent;
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
          local.dispose();
      }
    });
    dialog.showModal();
  }
  return {
    open,
    dispose() {
      current?.dispose();
    },
  };
}
