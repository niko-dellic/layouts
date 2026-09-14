import type { TabBarOptions, TabBarStyle } from './types.js';
import type { Scope } from './lifetime.js';

export function validateTabBar(options: TabBarOptions) {
  for (const style of [options, ...Object.values(options.regions ?? {})]) {
    if (style.mode !== undefined && !['full', 'tapered'].includes(style.mode))
      throw new Error('Unknown tab bar mode');
    if (style.shape !== undefined && !['angle', 'round', 'scoop', 'vertical'].includes(style.shape))
      throw new Error('Unknown tab bar shape');
    if (
      style.taperWidth !== undefined &&
      (!Number.isFinite(style.taperWidth) || style.taperWidth <= 0)
    )
      throw new Error('Tab bar taperWidth must be positive and finite');
  }
}

/** Chrome measurement never mounts or replaces application pane views. */
export function bindTabBar(
  region: HTMLElement,
  header: HTMLElement,
  root: HTMLElement,
  scope: Scope,
  getStyle: () => TabBarStyle,
) {
  const doc = region.ownerDocument,
    win = doc.defaultView!;
  let frame = 0,
    disposed = false;
  const measure = () => {
    frame = 0;
    if (disposed || !region.isConnected) return;
    const style = getStyle();
    const tapered = style.mode === 'tapered';
    region.dataset.tabBar = tapered ? 'tapered' : 'full';
    header.dataset.tabBarShape = style.shape ?? 'angle';
    header.querySelector('.layouts-tab-cap')?.remove();
    header.querySelector('.layouts-tab-outline')?.remove();
    const items = Array.from(header.querySelectorAll<HTMLElement>('.layouts-tab-item'));
    header.dataset.tabBarEmpty = String(tapered && !items.length);
    const height = header.hidden ? 0 : header.getBoundingClientRect().height;
    // clientWidth rounds fractional split widths up, allowing chrome to spill
    // outside the region and change the stage's scrollbar/resize geometry.
    const available = parseFloat(win.getComputedStyle(region).width);
    let occupied = available;
    if (!tapered) {
      header.style.removeProperty('width');
      for (const item of items) item.style.removeProperty('--layouts-tab-preferred-width');
      delete region.dataset.tabBarFilled;
    } else if (!height || !items.length) {
      header.style.width = '0px';
      occupied = 0;
      region.dataset.tabBarFilled = 'false';
    } else {
      // Inline-size container queries suppress intrinsic sizing. Measure a hidden,
      // noninteractive copy with containment disabled, including real icons/fonts.
      const probe = header.cloneNode(true) as HTMLElement;
      probe.classList.add('layouts-tab-measure');
      probe.setAttribute('aria-hidden', 'true');
      probe.inert = true;
      probe.removeAttribute('id');
      for (const node of probe.querySelectorAll('[id]')) node.removeAttribute('id');
      root.append(probe);
      try {
        const widths = Array.from(probe.querySelectorAll<HTMLElement>('.layouts-tab-item')).map(
          (item) => Math.ceil(item.getBoundingClientRect().width),
        );
        const computed = win.getComputedStyle(probe);
        const menu = probe.querySelector<HTMLElement>(':scope > .layouts-button');
        const natural = Math.ceil(
          widths.reduce((sum, width) => sum + width, 0) +
            (menu?.getBoundingClientRect().width ?? 0) +
            parseFloat(computed.paddingLeft) +
            parseFloat(computed.paddingRight) +
            (menu ? parseFloat(computed.columnGap) : 0),
        );
        const capWidth = style.shape === 'vertical' ? 0 : (style.taperWidth ?? height);
        // Leave breathing room at the pane edge instead of showing a nearly
        // touching cap. This clearance is not part of the occupied footprint.
        const edgeClearance = 12;
        const fits = natural + capWidth + edgeClearance <= available;
        items.forEach((item, index) =>
          item.style.setProperty('--layouts-tab-preferred-width', `${widths[index]}px`),
        );
        region.dataset.tabBarFilled = String(!fits);
        header.style.width = fits ? `${natural}px` : '100%';
        occupied = fits ? natural + capWidth : available;
        if (fits && capWidth > 0) {
          const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.classList.add('layouts-tab-cap');
          svg.setAttribute('aria-hidden', 'true');
          svg.setAttribute('viewBox', '0 0 1 1');
          svg.setAttribute('preserveAspectRatio', 'none');
          svg.style.width = `${capWidth}px`;
          const path = doc.createElementNS(svg.namespaceURI, 'path');
          const curve =
            style.shape === 'round'
              ? 'A1 1 0 0 0 1 0'
              : style.shape === 'scoop'
                ? 'A1 1 0 0 1 1 0'
                : 'L1 0';
          path.setAttribute('d', `M0 1 ${curve} H0 Z`);
          svg.append(path);
          header.append(svg);
        }
        // A single closed, inset outline covers the controls and cap. Splitting
        // this between CSS borders and SVG strokes leaves seams and clipped edges.
        const outline = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
        outline.classList.add('layouts-tab-outline');
        outline.setAttribute('aria-hidden', 'true');
        outline.setAttribute('viewBox', `0 0 ${occupied} ${height}`);
        outline.style.width = `${occupied}px`;
        outline.style.height = `${height}px`;
        const edge = doc.createElementNS(outline.namespaceURI, 'path');
        const right = Math.max(0.5, occupied - 0.5);
        const bottom = Math.max(0.5, height - 0.5);
        const end = fits && capWidth > 0 ? natural : right;
        const curve =
          fits && capWidth > 0
            ? style.shape === 'round' || style.shape === 'scoop'
              ? `A${Math.max(0.01, right - end)} ${Math.max(0.01, bottom - 0.5)} 0 0 ${style.shape === 'round' ? 1 : 0} ${end} ${bottom}`
              : `L${end} ${bottom}`
            : `V${bottom}`;
        edge.setAttribute('d', `M0.5 0.5 H${right} ${curve} H0.5 Z`);
        outline.append(edge);
        header.append(outline);
      } finally {
        probe.remove();
      }
    }
    region.style.setProperty('--layouts-tab-bar-width', `${height ? occupied : 0}px`);
    region.style.setProperty(
      '--layouts-tab-bar-height',
      `${items.length || !tapered ? height : 0}px`,
    );
  };
  const schedule = () => {
    if (!disposed && !frame) frame = win.requestAnimationFrame(measure);
  };
  let observedHeaderHeight = -1;
  const resize = new ResizeObserver((entries) => {
    let changed = false;
    for (const entry of entries) {
      if (entry.target === region) changed = true;
      else if (entry.contentRect.height !== observedHeaderHeight) {
        observedHeaderHeight = entry.contentRect.height;
        changed = true;
      }
    }
    // Header width is our output, not a measurement input. Observing our own
    // width writes feeds compression changes back into another measurement.
    if (changed) schedule();
  });
  resize.observe(region);
  resize.observe(header);
  const mutation = new MutationObserver(schedule);
  for (let node: HTMLElement | null = root; node; node = node.parentElement)
    mutation.observe(node, { attributes: true, attributeFilter: ['style', 'class'] });
  mutation.observe(doc.head, { subtree: true, childList: true, characterData: true });
  scope.listen(doc.fonts, 'loadingdone', schedule);
  void doc.fonts.ready.then(schedule);
  scope.add(() => {
    disposed = true;
    if (frame) win.cancelAnimationFrame(frame);
    resize.disconnect();
    mutation.disconnect();
  });
  return schedule;
}
