import type { Scope } from './lifetime.js';

let nextTooltip = 0;
/** Delegated tooltip ownership follows the region, not disposable tab buttons. */
export function bindTabTooltip(
  region: HTMLElement,
  header: HTMLElement,
  root: HTMLElement,
  scope: Scope,
) {
  const doc = root.ownerDocument;
  const win = doc.defaultView!;
  let anchor: HTMLElement | undefined;
  let tooltip: HTMLDivElement | undefined;
  const hide = () => {
    anchor?.removeAttribute('aria-describedby');
    tooltip?.remove();
    anchor = undefined;
    tooltip = undefined;
  };
  const refresh = () => {
    if (!anchor || !tooltip) return;
    if (
      region.dataset.tabPlacement !== 'left' ||
      !anchor.isConnected ||
      !anchor.getClientRects().length
    ) {
      hide();
      return;
    }
    tooltip.textContent = anchor.getAttribute('aria-label') ?? '';
    const rect = anchor.getBoundingClientRect();
    const size = tooltip.getBoundingClientRect();
    tooltip.style.left = `${Math.max(8, Math.min(rect.right + 8, win.innerWidth - size.width - 8))}px`;
    tooltip.style.top = `${Math.max(8, Math.min(rect.top + (rect.height - size.height) / 2, win.innerHeight - size.height - 8))}px`;
  };
  const show = (event: Event) => {
    const target = event.target as Element | null;
    const tab = target?.closest<HTMLElement>('.layouts-tab');
    if (!tab || !header.contains(tab) || region.dataset.tabPlacement !== 'left') return;
    if (anchor === tab) return;
    hide();
    anchor = tab;
    tooltip = doc.createElement('div');
    tooltip.className = 'layouts-tab-tooltip';
    tooltip.id = `layouts-tooltip-${++nextTooltip}`;
    tooltip.setAttribute('role', 'tooltip');
    anchor.setAttribute('aria-describedby', tooltip.id);
    root.append(tooltip);
    refresh();
  };
  scope.listen(header, 'pointerover', show);
  scope.listen(header, 'focusin', show);
  scope.listen(header, 'pointerout', (event) => {
    if (!anchor?.contains((event as PointerEvent).relatedTarget as Node | null)) hide();
  });
  scope.listen(header, 'focusout', hide);
  scope.listen(header, 'pointerdown', hide);
  scope.listen(header, 'dragstart', hide);
  scope.listen(root, 'scroll', hide, { capture: true });
  scope.listen(win, 'resize', hide);
  scope.listen(doc, 'keydown', (event) => {
    if ((event as KeyboardEvent).key === 'Escape') hide();
  });
  scope.add(hide);
  return refresh;
}
