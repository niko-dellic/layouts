import { fillTabPicker } from './picker.js';
import type { Group, Pane } from '@niko-dellic/layouts-core';
import type { LayoutOptions } from './types.js';
import type { Windows } from './windows.js';
import { el, Scope } from './lifetime.js';
export function createPaneMenu(
  root: HTMLElement,
  options: LayoutOptions,
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
    const available = Boolean(options.tabs?.list().length);
    const create = (axis?: 'horizontal' | 'vertical') => {
      const commit = (fresh: Pane) =>
        axis
          ? options.store.split(group.id, axis, fresh, { source: 'user' })
          : options.store.add(fresh, group.id, { source: 'user' });
      if (options.tabs) {
        const pickerScope = new Scope();
        current = pickerScope;
        const picker = el(doc, 'dialog', 'layouts-menu layouts-picker');
        pickerScope.add(() => picker.remove());
        pickerScope.listen(picker, 'close', () => pickerScope.dispose());
        root.append(picker);
        const rect = anchor.getBoundingClientRect();
        picker.style.left = `${Math.max(8, Math.min(rect.right - 340, win.innerWidth - 356))}px`;
        picker.style.top = `${Math.max(8, Math.min(rect.bottom + 4, win.innerHeight - 380))}px`;
        pickerScope.listen(picker, 'click', (event) => {
          const e = event as MouseEvent;
          const bounds = picker.getBoundingClientRect();
          if (
            e.target === picker &&
            (e.clientX < bounds.left ||
              e.clientX > bounds.right ||
              e.clientY < bounds.top ||
              e.clientY > bounds.bottom)
          )
            pickerScope.dispose();
        });
        picker.showModal();
        fillTabPicker(picker, pickerScope, options, pane, group, commit, report);
      } else if (axis) {
        const fresh = options.createPane?.(pane);
        if (fresh) commit(fresh);
      }
    };
    add('+ Add tab', available && allowed('move'), () => create());
    const canCreate = options.tabs ? available : Boolean(options.createPane);
    add('Split right', canCreate && allowed('split'), () => create('horizontal'));
    add('Split below', canCreate && allowed('split'), () => create('vertical'));
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
