import { message } from './messages.js';
import type { Pane } from 'quilt-core';
import type { ResolvedLayoutOptions, PaneView, PaneRenderer } from './types.js';
import { el } from './lifetime.js';
export interface MountedPane {
  element: HTMLElement;
  view: PaneView;
  pane: Pane;
  signature: string;
  renderer: PaneRenderer | undefined;
  failed?: boolean;
  dispose(): void;
}
export function mountPane(
  doc: Document,
  pane: Pane,
  location: 'main' | 'popout',
  options: ResolvedLayoutOptions,
): MountedPane {
  const win = doc.defaultView;
  if (!win) throw new Error('Pane needs a live document');
  const element = el(doc, 'div', 'layouts-pane');
  element.dataset.paneId = pane.id;
  const renderer = Object.hasOwn(options.renderers ?? {}, pane.type)
    ? options.renderers?.[pane.type]
    : undefined;
  let view: PaneView;
  let result: MountedPane | undefined;
  const reportError = (error: unknown) => {
    if (result) result.failed = true;
    options.onError?.(error);
  };
  if (renderer)
    view = renderer({
      element,
      reportError,
      document: doc,
      window: win,
      pane,
      state: options.getPaneState?.(pane.id),
      location,
    });
  else {
    element.append(
      el(
        doc,
        'div',
        'layouts-placeholder',
        message(options, 'Unknown pane type: {type}. Register a renderer to display this pane.', {
          type: pane.type,
        }),
      ),
    );
    view = { dispose() {} };
  }
  const observer = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect;
    if (rect) {
      try {
        view.resize?.(rect.width, rect.height);
      } catch (error) {
        options.onError?.(error);
      }
    }
  });
  observer.observe(element);
  let disposed = false;
  result = {
    element,
    view,
    pane,
    signature: JSON.stringify(pane),
    renderer,
    dispose() {
      if (disposed) return;
      disposed = true;
      observer.disconnect();
      try {
        view.dispose();
      } finally {
        element.remove();
      }
    },
  };
  if (location === 'main')
    void view.ready?.catch((error) => {
      if (!disposed) reportError(error);
    });
  return result;
}
