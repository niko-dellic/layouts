import { allocate, bounds, DIVIDER, findNode, findParent, paneIds } from 'layouts-core';
import type { Group, Pane } from 'layouts-core';
import type { LayoutOptions } from './types.js';
import { el, Scope } from './lifetime.js';
type Direction = 'left' | 'right' | 'top' | 'bottom';
/** Commit once on release; cancellation never changes the layout or pane ownership. */
export function bindCorners(
  host: HTMLElement,
  id: string,
  options: LayoutOptions,
  scope: Scope,
  split: (pane: Pane, group: Group, direction: Direction, ratio: number) => void,
  report: (error: unknown) => void,
) {
  const doc = host.ownerDocument;
  let drag: Scope | undefined;
  scope.add(() => drag?.dispose());
  const initial = findNode(options.store.getSnapshot().root, id);
  if (initial?.kind !== 'group' || !initial.panes.every((p) => options.store.can(p, 'split')))
    return;
  for (const corner of ['tl', 'tr', 'bl', 'br']) {
    const handle = el(doc, 'button', 'layouts-corner');
    handle.dataset.corner = corner;
    handle.title = 'Drag inward to split; drag into a sibling region to join. Escape cancels.';
    handle.setAttribute('aria-label', 'Split or join region from ' + corner + ' corner');
    handle.tabIndex = -1; // Equivalent keyboard operations live in the pane menu.
    host.append(handle);
    scope.add(() => handle.remove());
    scope.listen(handle, 'pointerdown', (event) => {
      const start = event as PointerEvent;
      if (start.button !== 0) return;
      const node = findNode(options.store.getSnapshot().root, id);
      if (node?.kind !== 'group' || !node.panes.every((p) => options.store.can(p, 'split'))) return;
      event.preventDefault();
      event.stopPropagation();
      drag?.dispose();
      const local = new Scope();
      drag = local;
      handle.setPointerCapture(start.pointerId);
      let target:
        | { kind: 'split'; direction: Direction; ratio: number }
        | { kind: 'join'; id: string }
        | undefined;
      const overlay = el(doc, 'div', 'layouts-corner-overlay');
      overlay.setAttribute('aria-hidden', 'true');
      host.closest('.layouts')!.append(overlay);
      local.add(() => overlay.remove());
      const mark = (
        rect: { left: number; top: number; width: number; height: number },
        kind: string,
        label: string,
      ) => {
        const box = el(doc, 'div', 'layouts-corner-preview');
        box.dataset.cornerPreview = kind;
        Object.assign(box.style, {
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
        });
        box.append(el(doc, 'span', 'layouts-corner-label', label));
        overlay.append(box);
      };
      const clear = () => {
        overlay.replaceChildren();
        target = undefined;
      };
      local.add(() => {
        clear();
        try {
          handle.releasePointerCapture(start.pointerId);
        } catch {}
      });
      local.listen(handle, 'pointermove', (e) => {
        const move = e as PointerEvent;
        clear();
        if (Math.hypot(move.clientX - start.clientX, move.clientY - start.clientY) < 24) return;
        const rect = host.getBoundingClientRect();
        const inside =
          move.clientX > rect.left &&
          move.clientX < rect.right &&
          move.clientY > rect.top &&
          move.clientY < rect.bottom;
        if (inside) {
          const horizontal =
            Math.abs(move.clientX - start.clientX) > Math.abs(move.clientY - start.clientY);
          const direction: Direction = horizontal
            ? corner.endsWith('l')
              ? 'left'
              : 'right'
            : corner.startsWith('t')
              ? 'top'
              : 'bottom';
          target = {
            kind: 'split',
            direction,
            ratio: Math.max(
              0.1,
              Math.min(
                0.9,
                horizontal
                  ? (move.clientX - rect.left) / rect.width
                  : (move.clientY - rect.top) / rect.height,
              ),
            ),
          };
          const before = direction === 'left' || direction === 'top';
          const layout = options.store.getSnapshot();
          const current = findNode(layout.root, id);
          if (!current) return;
          const constraints = bounds(current, layout);
          const min = horizontal ? constraints.minWidth : constraints.minHeight;
          const max = horizontal ? constraints.maxWidth : constraints.maxHeight;
          const total = horizontal ? rect.width : rect.height;
          const disabled =
            current.kind === 'group' &&
            (!current.panes.every((p) => options.store.can(p, 'resize')) || min === max);
          const configuredGap = parseFloat(
            doc
              .defaultView!.getComputedStyle(host.closest('.layouts')!)
              .getPropertyValue(
                disabled
                  ? '--layouts-disabled-resize-handle-width'
                  : '--layouts-resize-handle-width',
              ),
          );
          const gap =
            Number.isFinite(configuredGap) && configuredGap >= 0
              ? configuredGap
              : disabled
                ? 0
                : DIVIDER;
          const [first, second] = allocate(
            total,
            target.ratio,
            before ? 0 : min,
            before ? Infinity : max,
            before ? min : 0,
            before ? max : Infinity,
            gap,
          );
          // Store uses content extents (excluding the divider), matching this preview exactly.
          const newRect = horizontal
            ? {
                left: rect.left + (before ? 0 : first + gap),
                top: rect.top,
                width: before ? first : second,
                height: rect.height,
              }
            : {
                left: rect.left,
                top: rect.top + (before ? 0 : first + gap),
                width: rect.width,
                height: before ? first : second,
              };
          mark(newRect, 'split', 'New pane');
        } else {
          const layout = options.store.getSnapshot();
          const parent = findParent(layout.root, id);
          const sibling = parent?.children.find((n) => n.id !== id);
          if (
            sibling?.kind !== 'group' ||
            !parent ||
            !paneIds(parent).every((p) => options.store.can(p, 'join'))
          )
            return;
          const element = Array.from(doc.querySelectorAll<HTMLElement>('[data-node-id]')).find(
            (el) =>
              el.dataset.nodeId === sibling.id &&
              el.closest('.layouts') === host.closest('.layouts'),
          );
          const box = element?.getBoundingClientRect();
          if (
            box &&
            move.clientX >= box.left &&
            move.clientX <= box.right &&
            move.clientY >= box.top &&
            move.clientY <= box.bottom
          ) {
            target = { kind: 'join', id: sibling.id };
            const sourceTitle = layout.panes[node.active ?? '']?.title ?? 'This region';
            const targetTitle = layout.panes[sibling.active ?? '']?.title ?? 'Sibling region';
            mark(rect, 'join-source', `Joins ${targetTitle}`);
            mark(box, 'join-target', `${targetTitle} absorbs ${sourceTitle}`);
            const combined = {
              left: Math.min(rect.left, box.left),
              top: Math.min(rect.top, box.top),
              width: Math.max(rect.right, box.right) - Math.min(rect.left, box.left),
              height: Math.max(rect.bottom, box.bottom) - Math.min(rect.top, box.top),
            };
            mark(combined, 'join', '');
          }
        }
      });
      local.listen(handle, 'pointerup', () => {
        const action = target;
        local.dispose();
        if (!action) return;
        try {
          if (action.kind === 'join') options.store.join(action.id, { source: 'user' });
          else {
            const layout = options.store.getSnapshot(),
              group = findNode(layout.root, id);
            if (group?.kind === 'group' && group.active)
              split(layout.panes[group.active]!, group, action.direction, action.ratio);
          }
        } catch (error) {
          report(error);
        }
      });
      local.listen(handle, 'pointercancel', () => local.dispose());
      local.listen(handle, 'lostpointercapture', () => local.dispose());
      local.listen(doc, 'keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Escape') local.dispose();
      });
    });
  }
}
