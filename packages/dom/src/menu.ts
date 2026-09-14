import { actionIcon } from './action-icons.js';
import type { ActionIcon } from './action-icons.js';
import { fillTabPicker } from './picker.js';
import { findNode, findParent, groups, paneIds } from 'layouts-core';
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
  const persistentPickers = new Map<string, Scope>();
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
    pane: Pane | undefined,
    group: Group,
    direction?: 'left' | 'right' | 'top' | 'bottom',
    ratio = 0.5,
    groupActions = false,
    addTab = false,
  ) {
    current?.dispose();
    const latestGroup = findNode(options.store.getSnapshot().root, group.id);
    if (latestGroup?.kind !== 'group') return;
    group = latestGroup;
    const local = new Scope();
    current = local;
    const dialog = el(doc, 'dialog', 'layouts-menu');
    dialog.tabIndex = -1;
    dialog.autofocus = true;
    dialog.setAttribute(
      'aria-label',
      pane && !groupActions ? `${pane.title} actions` : 'Empty pane actions',
    );
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
      return b;
    };
    const allowed = (cap: 'split' | 'join' | 'move') =>
      group.panes.every((id) => options.store.can(id, cap));
    const available = Boolean(options.tabs?.list().length);
    const create = (axis?: 'horizontal' | 'vertical', before = false) => {
      if (!axis && !pane && !options.tabs) return;
      let destination = group;
      if (axis && (options.tabs || !pane)) {
        const id = options.store.split(group.id, axis, null, { source: 'user', before, ratio });
        destination = findNode(options.store.getSnapshot().root, id) as Group;
        refresh();
        if (!options.tabs) return;
      }
      const commit = (fresh: Pane) =>
        axis && !options.tabs
          ? options.store.split(group.id, axis, fresh, { source: 'user', before, ratio })
          : options.store.add(fresh, destination.id, { source: 'user' });
      if (options.tabs) {
        if ((axis || !group.panes.length) && options.store.getAutoCollapse() === 'disabled') {
          if (persistentPickers.has(destination.id)) {
            const region = Array.from(root.querySelectorAll<HTMLElement>('[data-node-id]')).find(
              (element) => element.dataset.nodeId === destination.id,
            );
            region?.querySelector<HTMLInputElement>('.layouts-picker-search')?.focus();
            return;
          }
          const region = Array.from(root.querySelectorAll<HTMLElement>('[data-node-id]')).find(
            (element) => element.dataset.nodeId === destination.id,
          );
          if (!region) return;
          const pickerScope = new Scope();
          persistentPickers.set(destination.id, pickerScope);
          const picker = el(doc, 'div', 'layouts-menu layouts-picker layouts-picker-persistent');
          picker.setAttribute('role', 'dialog');
          region.append(picker);
          pickerScope.listen(
            doc,
            'pointerdown',
            (event) => {
              if (!event.composedPath().includes(region)) pickerScope.dispose();
            },
            { capture: true },
          );
          pickerScope.add(() => {
            picker.remove();
            persistentPickers.delete(destination.id);
          });
          pickerScope.add(
            options.store.subscribe(() => {
              const group = findNode(options.store.getSnapshot().root, destination.id);
              if (group?.kind !== 'group' || group.panes.length) pickerScope.dispose();
            }),
          );
          fillTabPicker(picker, pickerScope, options, pane, destination, commit, report, true);
          return;
        }
        const pickerScope = new Scope();
        current = pickerScope;
        const picker = el(doc, 'dialog', 'layouts-menu layouts-picker');
        if (axis)
          pickerScope.add(() => {
            if (options.store.getAutoCollapse() !== 'disabled')
              options.store.removeEmptyGroup(destination.id);
          });
        pickerScope.add(() => picker.remove());
        pickerScope.listen(picker, 'close', () => pickerScope.dispose());
        root.append(picker);
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
      } else if (axis) {
        const fresh = pane ? options.createPane?.(pane) : undefined;
        if (fresh) commit(fresh);
      }
    };
    if (addTab || (!direction && !group.panes.length && !groupActions)) {
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
    const canCreate =
      !group.panes.length || (options.tabs ? available : Boolean(pane && options.createPane));
    function submenu(label: string, icon: ActionIcon, enabled = true) {
      const container = el(doc, 'div', 'layouts-submenu');
      const trigger = button(`${label} ▸`, label, () => setOpen(true));
      const glyph = el(doc, 'span', 'layouts-tab-icon');
      glyph.setAttribute('aria-hidden', 'true');
      glyph.append(actionIcon(doc, icon, options));
      trigger.prepend(glyph);
      trigger.disabled = !enabled;
      trigger.setAttribute('aria-haspopup', 'menu');
      trigger.setAttribute('aria-expanded', 'false');
      const flyout = el(doc, 'div', 'layouts-submenu-content');
      flyout.hidden = true;
      flyout.setAttribute('role', 'menu');
      flyout.setAttribute('aria-label', label);
      const setOpen = (open: boolean) => {
        flyout.hidden = !open;
        trigger.setAttribute('aria-expanded', String(open));
      };
      local.listen(container, 'pointerenter', () => {
        if (!trigger.disabled) setOpen(true);
      });
      local.listen(container, 'pointerleave', () => setOpen(false));
      local.listen(trigger, 'keydown', (event) => {
        if ((event as KeyboardEvent).key === 'ArrowRight') {
          event.preventDefault();
          setOpen(true);
          (flyout.firstElementChild as HTMLElement)?.focus();
        }
      });
      local.listen(flyout, 'keydown', (event) => {
        if ((event as KeyboardEvent).key === 'ArrowLeft') {
          event.preventDefault();
          setOpen(false);
          trigger.focus();
        }
      });
      container.dataset.side =
        anchor.getBoundingClientRect().right + 220 > win.innerWidth ? 'left' : 'right';
      container.append(trigger, flyout);
      dialog.append(container);
      return flyout;
    }
    const flyout = submenu('Split', 'split-right', canCreate && allowed('split'));
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
    const joinParent = findParent(options.store.getSnapshot().root, group.id);
    const join = add(
      'join',
      'Join sibling region',
      Boolean(joinParent) && paneIds(joinParent!).every((id) => options.store.can(id, 'join')),
      () => options.store.join(group.id, { source: 'user' }),
    );
    let preview: Scope | undefined;
    const clearPreview = () => {
      preview?.dispose();
      preview = undefined;
    };
    local.add(clearPreview);
    const showPreview = () => {
      clearPreview();
      const layout = options.store.getSnapshot();
      const parent = findParent(layout.root, group.id);
      if (join.disabled || !parent) return;
      const scope = new Scope();
      preview = scope;
      const overlay = el(doc, 'div', 'layouts-corner-overlay');
      overlay.setAttribute('aria-hidden', 'true');
      root.append(overlay);
      scope.add(() => overlay.remove());
      const targetTitle = layout.panes[group.active ?? '']?.title ?? 'This region';
      const regions = groups(parent).map((region) => ({
        region,
        element: Array.from(root.querySelectorAll<HTMLElement>('[data-node-id]')).find(
          (element) => element.dataset.nodeId === region.id && element.closest('.layouts') === root,
        ),
      }));
      const position = () => {
        overlay.replaceChildren();
        for (const { region, element } of regions) {
          if (!element || !element.getClientRects().length) continue;
          const rect = element.getBoundingClientRect();
          const box = el(doc, 'div', 'layouts-corner-preview');
          box.dataset.cornerPreview = region.id === group.id ? 'join-target' : 'join-source';
          Object.assign(box.style, {
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
          });
          box.append(
            el(
              doc,
              'span',
              'layouts-corner-label',
              region.id === group.id ? `${targetTitle} keeps all tabs` : `Joins ${targetTitle}`,
            ),
          );
          overlay.append(box);
        }
      };
      position();
      const observer = new win.ResizeObserver(position);
      for (const { element } of regions) if (element) observer.observe(element);
      scope.add(() => observer.disconnect());
      scope.listen(win, 'resize', position);
      scope.listen(doc, 'scroll', position, { capture: true });
      scope.add(options.store.subscribe(clearPreview));
    };
    local.listen(join, 'pointerenter', showPreview);
    local.listen(join, 'pointerleave', clearPreview);
    local.listen(join, 'focus', showPreview);
    local.listen(join, 'blur', clearPreview);
    add(
      options.store.getSnapshot().maximized === group.id ? 'restore' : 'maximize',
      options.store.getSnapshot().maximized === group.id ? 'Restore region' : 'Maximize region',
      true,
      () =>
        options.store.maximize(
          options.store.getSnapshot().maximized === group.id ? null : group.id,
        ),
    );
    if (group.panes.length && pane) {
      add(
        'popout',
        windows.pending.has(pane.id) ? 'Reopen window' : 'Open in window',
        options.store.can(pane.id, 'popout'),
        () => {
          windows.open(pane.id, windows.pending.get(pane.id));
          refresh();
        },
      );
    }
    const orientation = submenu('Tab orientation', 'tab-orientation');
    for (const [value, label] of [
      [undefined, 'Workspace default'],
      ['top', 'Horizontal'],
      ['left', 'Vertical'],
    ] as const) {
      const selected = group.tabPlacement === value;
      const option = button(label, label, () => {
        options.store.setTabPlacement(group.id, value);
        local.dispose();
      });
      option.setAttribute('role', 'menuitemradio');
      option.setAttribute('aria-checked', String(selected));
      const mark = el(doc, 'span', 'layouts-tab-icon', selected ? '✓' : '');
      mark.setAttribute('aria-hidden', 'true');
      option.prepend(mark);
      orientation.append(option);
    }
    const display = submenu('Tab display', 'tab-orientation');
    for (const [value, label] of [
      [undefined, 'Workspace default'],
      ['automatic', 'Automatic'],
      ['compact', 'Compact'],
    ] as const) {
      const selected = group.tabDisplay === value;
      const option = button(label, label, () => {
        options.store.setTabDisplay(group.id, value);
        local.dispose();
      });
      option.setAttribute('role', 'menuitemradio');
      option.setAttribute('aria-checked', String(selected));
      const mark = el(doc, 'span', 'layouts-tab-icon', selected ? '✓' : '');
      mark.setAttribute('aria-hidden', 'true');
      option.prepend(mark);
      display.append(option);
    }
    if (group.panes.length && pane) {
      add('close', 'Close active tab', options.store.can(pane.id, 'close'), () =>
        options.store.close(pane.id, { source: 'user' }),
      );
      add(
        'close',
        'Close pane',
        group.panes.every((id) => options.store.can(id, 'close')),
        () => options.store.closeGroup(group.id, { source: 'user' }),
      );
    } else {
      add('close', 'Close empty pane', options.store.getSnapshot().root.id !== group.id, () =>
        options.store.removeEmptyGroup(group.id),
      );
    }
    add('restore', 'Restore closed tab', options.store.canRestoreClosedTab(), () =>
      options.store.restoreClosedTab(),
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
    dialog.focus({ preventScroll: true });
  }
  return {
    open,
    addTab(anchor: HTMLElement, group: Group) {
      const layout = options.store.getSnapshot();
      open(
        anchor,
        group.active ? layout.panes[group.active] : undefined,
        group,
        undefined,
        0.5,
        false,
        true,
      );
    },
    openEmpty(anchor: HTMLElement, group: Group) {
      const source = Object.values(options.store.getSnapshot().panes).find(
        (pane) => pane.header !== false,
      );
      open(anchor, source, group, undefined, 0.5, true);
    },
    dispose() {
      current?.dispose();
      for (const picker of persistentPickers.values()) picker.dispose();
    },
  };
}
