import type { Scope } from './lifetime.js';

let nextTooltip = 0;
/** Shared hints for vertical tabs and empty panes follow the region lifetime. */
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
      (!anchor.matches('.layouts-empty') && region.dataset.tabPlacement !== 'left') ||
      (anchor.matches('.layouts-empty') && Boolean(region.querySelector('.layouts-picker'))) ||
      !anchor.isConnected ||
      !anchor.getClientRects().length
    ) {
      hide();
      return;
    }
    const empty = anchor.matches('.layouts-empty');
    tooltip.textContent = empty ? 'Click to add a pane' : (anchor.getAttribute('aria-label') ?? '');
    const rect = (empty ? region : anchor).getBoundingClientRect();
    const size = tooltip.getBoundingClientRect();
    tooltip.style.left = `${Math.max(8, Math.min(empty ? rect.left + (rect.width - size.width) / 2 : rect.right + 8, win.innerWidth - size.width - 8))}px`;
    tooltip.style.top = `${Math.max(8, Math.min(rect.top + (rect.height - size.height) / 2, win.innerHeight - size.height - 8))}px`;
  };
  const show = (event: Event) => {
    const target = event.target as Element | null;
    const tab = target?.closest<HTMLElement>('.layouts-tab, .layouts-empty');
    if (!tab || !region.contains(tab)) return;
    const empty = tab.matches('.layouts-empty');
    if (
      empty
        ? tab.matches(':disabled') || region.querySelector('.layouts-picker')
        : !header.contains(tab) || region.dataset.tabPlacement !== 'left'
    )
      return;
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
  scope.listen(region, 'pointerover', show);
  scope.listen(region, 'focusin', show);
  scope.listen(region, 'pointerout', (event) => {
    if (!anchor?.contains((event as PointerEvent).relatedTarget as Node | null)) hide();
  });
  scope.listen(region, 'focusout', hide);
  scope.listen(region, 'pointerdown', hide);
  scope.listen(region, 'dragstart', hide);
  scope.listen(root, 'scroll', hide, { capture: true });
  scope.listen(win, 'resize', hide);
  scope.listen(doc, 'keydown', (event) => {
    if ((event as KeyboardEvent).key === 'Escape') hide();
  });
  scope.add(hide);
  return refresh;
}
