import { actionIcon } from './action-icons.js';
import type { ActionIcon } from './action-icons.js';
import { fillTabPicker } from './picker.js';
import { findNode } from 'layouts-core';
import type { Group, Pane } from 'layouts-core';
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
  function open(
    anchor: HTMLElement,
    pane: Pane,
    group: Group,
    direction?: 'left' | 'right' | 'top' | 'bottom',
    ratio = 0.5,
  ) {
    current?.dispose();
    const local = new Scope();
    current = local;
    const dialog = el(doc, 'dialog', 'layouts-menu');
    dialog.setAttribute('aria-label', `${pane.title} actions`);
    local.add(() => dialog.remove());
    const add = (icon: ActionIcon, label: string, enabled: boolean, fn: () => void) => {
      const b = button(label, label, () => {
        local.dispose();
        act(fn);
      });
      const glyph = el(doc, 'span', 'layouts-tab-icon');
      glyph.setAttribute('aria-hidden', 'true');
      act(() => glyph.append(actionIcon(doc, icon, options)));
      b.replaceChildren(glyph, el(doc, 'span', '', label.replace(/^\+ /, '')));
      b.disabled = !enabled;
      dialog.append(b);
    };
    const allowed = (cap: 'split' | 'join' | 'move') =>
      group.panes.every((id) => options.store.can(id, cap));
    const available = Boolean(options.tabs?.list().length);
    const create = (axis?: 'horizontal' | 'vertical', before = false) => {
      let destination = group;
      if (axis && options.tabs) {
        const id = options.store.split(group.id, axis, null, { source: 'user', before, ratio });
        destination = findNode(options.store.getSnapshot().root, id) as Group;
        refresh();
      }
      const commit = (fresh: Pane) =>
        axis && !options.tabs
          ? options.store.split(group.id, axis, fresh, { source: 'user', before, ratio })
          : options.store.add(fresh, destination.id, { source: 'user' });
      if (options.tabs) {
        const pickerScope = new Scope();
        current = pickerScope;
        const picker = el(doc, 'dialog', 'layouts-menu layouts-picker');
        if (axis) pickerScope.add(() => options.store.removeEmptyGroup(destination.id));
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
        fillTabPicker(picker, pickerScope, options, pane, destination, commit, report);
        if (axis || !group.panes.length) {
          const region = Array.from(root.querySelectorAll<HTMLElement>('[data-node-id]')).find(
            (element) => element.dataset.nodeId === destination.id,
          );
          if (region) {
            const position = () => {
              const bounds = region.getBoundingClientRect();
              picker.style.width = `${Math.max(0, Math.min(340, bounds.width - 16))}px`;
              picker.style.maxHeight = `${Math.max(0, bounds.height - 16)}px`;
              picker.style.left = `${bounds.left + (bounds.width - picker.offsetWidth) / 2}px`;
              picker.style.top = `${bounds.top + (bounds.height - picker.offsetHeight) / 2}px`;
            };
            position();
            const observer = new ResizeObserver(position);
            observer.observe(region);
            observer.observe(picker);
            pickerScope.add(() => observer.disconnect());
            pickerScope.listen(win, 'resize', position);
            pickerScope.add(
              options.store.subscribe(() => {
                if (!findNode(options.store.getSnapshot().root, destination.id))
                  pickerScope.dispose();
              }),
            );
          }
        }
      } else if (axis) {
        const fresh = options.createPane?.(pane);
        if (fresh) commit(fresh);
      }
    };
    if (!group.panes.length) {
      local.dispose();
      create();
      return;
    }
    if (direction) {
      local.dispose();
      create(
        direction === 'left' || direction === 'right' ? 'horizontal' : 'vertical',
        direction === 'left' || direction === 'top',
      );
      return;
    }
    add('add-tab', '+ Add tab', available && allowed('move'), () => create());
    const canCreate = options.tabs ? available : Boolean(options.createPane);
    const split = el(doc, 'div', 'layouts-submenu');
    const trigger = button('Split ▸', 'Split', () => {
      flyout.hidden = !flyout.hidden;
      trigger.setAttribute('aria-expanded', String(!flyout.hidden));
    });
    const splitIcon = el(doc, 'span', 'layouts-tab-icon');
    splitIcon.setAttribute('aria-hidden', 'true');
    splitIcon.append(actionIcon(doc, 'split-right', options));
    trigger.prepend(splitIcon);
    trigger.disabled = !(canCreate && allowed('split'));
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    const flyout = el(doc, 'div', 'layouts-submenu-content');
    flyout.hidden = true;
    flyout.setAttribute('role', 'menu');
    for (const [label, axis, before] of [
      ['Split left', 'horizontal', true],
      ['Split right', 'horizontal', false],
      ['Split up', 'vertical', true],
      ['Split down', 'vertical', false],
    ] as const) {
      const option = button(label, label, () => {
        local.dispose();
        create(axis, before);
      });
      const icon = el(doc, 'span', 'layouts-tab-icon');
      icon.setAttribute('aria-hidden', 'true');
      icon.append(actionIcon(doc, axis === 'horizontal' ? 'split-right' : 'split-below', options));
      option.prepend(icon);
      option.setAttribute('role', 'menuitem');
      flyout.append(option);
    }
    local.listen(split, 'pointerenter', () => {
      if (!trigger.disabled) {
        flyout.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
    local.listen(split, 'pointerleave', () => {
      flyout.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    });
    local.listen(trigger, 'keydown', (event) => {
      if ((event as KeyboardEvent).key === 'ArrowRight') {
        event.preventDefault();
        flyout.hidden = false;
        (flyout.firstElementChild as HTMLElement).focus();
      }
    });
    local.listen(flyout, 'keydown', (event) => {
      if ((event as KeyboardEvent).key === 'ArrowLeft') {
        event.preventDefault();
        flyout.hidden = true;
        trigger.focus();
      }
    });
    split.dataset.side =
      anchor.getBoundingClientRect().right + 220 > win.innerWidth ? 'left' : 'right';
    split.append(trigger, flyout);
    dialog.append(split);
    add('join', 'Join sibling region', allowed('join'), () =>
      options.store.join(group.id, { source: 'user' }),
    );
    add(
      options.store.getSnapshot().maximized === group.id ? 'restore' : 'maximize',
      options.store.getSnapshot().maximized === group.id ? 'Restore region' : 'Maximize region',
      true,
      () =>
        options.store.maximize(
          options.store.getSnapshot().maximized === group.id ? null : group.id,
        ),
    );
    add(
      'popout',
      windows.pending.has(pane.id) ? 'Reopen window' : 'Open in window',
      options.store.can(pane.id, 'popout'),
      () => {
        windows.open(pane.id, windows.pending.get(pane.id));
        refresh();
      },
    );
    add('close', 'Close pane', options.store.can(pane.id, 'close'), () =>
      options.store.close(pane.id, { source: 'user' }),
    );
    add('cancel', 'Cancel', true, () => {});
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
