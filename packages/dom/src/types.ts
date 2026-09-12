import type { LayoutStore, Pane, WindowPlacement } from '@niko-dellic/layouts-core';
export interface PaneContext {
  element: HTMLElement;
  document: Document;
  window: Window;
  pane: Pane;
  /** Stable application-owned reference. The library does not serialize this value. */
  state: unknown;
  location: 'main' | 'popout';
}
export interface PaneView {
  dispose(): void;
  resize?(width: number, height: number): void;
  update?(pane: Pane): void;
}
export type PaneRenderer = (context: PaneContext) => PaneView;
export interface LayoutOptions {
  store: LayoutStore;
  renderers: Record<string, PaneRenderer>;
  getPaneState?: (paneId: string) => unknown;
  /** Called by the split menu. Returning undefined cancels pane creation. */
  createPane?: (source: Pane) => Pane | undefined;
  onError?: (error: unknown) => void;
  /** Copy additional app styles/assets into a same-origin companion document. */
  prepareWindow?: (window: Window, pane: Pane) => void;
  /** Override window creation for applications with a managed same-origin host. Must return synchronously. */
  openWindow?: (pane: Pane, placement: WindowPlacement) => Window | null;
}
export interface MountedLayout {
  popout(paneId: string, placement?: WindowPlacement): boolean;
  returnPane(paneId: string): void;
  dispose(): void;
}
