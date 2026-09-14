import type { TabRegistry } from './registry.js';
import type { LayoutTheme } from './theme.js';
import type { LayoutStore, Pane, WindowPlacement } from 'layouts-core';
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
export interface TabBarStyle {
  mode?: 'full' | 'tapered';
  shape?: 'angle' | 'round' | 'scoop' | 'vertical';
  /** Positive finite CSS pixels. Omit to match header height. */
  taperWidth?: number;
}
export interface TabBarOptions extends TabBarStyle {
  /** Partial overrides keyed by stable group ID; not serialized in Layout JSON. */
  regions?: Record<string, TabBarStyle>;
}
export interface LayoutOptions {
  tabBar?: TabBarOptions;
  store: LayoutStore;
  tabs?: TabRegistry;
  theme?: LayoutTheme;
  renderers: Record<string, PaneRenderer>;
  /** Return a fresh decorative icon element. Unknown keys use a title initial. */
  renderIcon?: (key: string, document: Document) => Element | undefined;
  /** Opt-in conveniences; omitted and false disable both. */
  shortcuts?: boolean | { maximize?: boolean; middleClickClose?: boolean };
  getPaneState?: (paneId: string) => unknown;
  /** Legacy split factory, used only when no registry is supplied. */
  createPane?: (source: Pane) => Pane | undefined;
  onError?: (error: unknown) => void;
  /** Copy additional app styles/assets into a same-origin companion document. */
  prepareWindow?: (window: Window, pane: Pane) => void;
  /** Override window creation for applications with a managed same-origin host. Must return synchronously. */
  openWindow?: (pane: Pane, placement: WindowPlacement) => Window | null;
}
export interface MountedLayout {
  setTabBar(options: TabBarOptions): void;
  setTheme(theme: LayoutTheme): void;
  popout(paneId: string, placement?: WindowPlacement): boolean;
  returnPane(paneId: string): void;
  dispose(): void;
}
