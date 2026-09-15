import type { PaneRegistry } from './registry.js';
import type { WorkspacePreset } from './workspace.js';
import type { Messages } from './messages.js';
import type { TabRegistry } from './registry.js';
import type { LayoutTheme } from './theme.js';
import type { LayoutStore, Pane, WindowPlacement } from 'quilt-core';
export interface PaneContext<State = unknown> {
  element: HTMLElement;
  reportError(error: unknown): void;
  document: Document;
  window: Window;
  pane: Pane;
  /** Stable application-owned reference. The library does not serialize this value. */
  state: State;
  location: 'main' | 'popout';
}
export interface PaneView {
  /** Resolves once destination content has committed; rejection rolls back a popout. */
  ready?: Promise<void>;
  dispose(): void;
  resize?(width: number, height: number): void;
  update?(pane: Pane): void;
}
export type PaneRenderer<State = unknown> = (context: PaneContext<State>) => PaneView;
export interface TabBarStyle {
  /** Left placement uses an icon-only rail; mode and shape apply in either placement. */
  placement?: 'top' | 'left';
  /** Automatic shows labels as width permits; compact always uses icons only. */
  display?: 'automatic' | 'compact';
  mode?: 'full' | 'tapered';
  shape?: 'angle' | 'round' | 'scoop' | 'vertical' | 'rounded';
  /** Anchored by default; floating bars overlay content with an 8px inset. */
  attachment?: 'anchored' | 'floating';
  fit?: 'full' | 'fit';
  corners?: 'fitted' | 'rounded' | 'capsule';
  /** Positive finite CSS pixels. Omit to match header height. */
  taperWidth?: number;
}
export interface TabBarOptions extends TabBarStyle {
  /** Partial overrides keyed by stable group ID; not serialized in Layout JSON. */
  regions?: Record<string, TabBarStyle>;
}
export interface ResolvedLayoutOptions<State = unknown> {
  tabBar?: TabBarOptions;
  store: LayoutStore;
  tabs?: TabRegistry;
  theme?: LayoutTheme;
  renderers?: Record<string, PaneRenderer<State>>;
  registry?: PaneRegistry<PaneRenderer<State>>;
  messages?: Messages;
  popouts?: boolean;
  confirmClose?: (request: CloseRequest) => boolean | Promise<boolean>;
  /** Return a fresh decorative icon element. Unknown keys use a title initial. */
  renderIcon?: (key: string, document: Document) => Element | undefined;
  /** Opt-in conveniences; omitted and false disable all. */
  shortcuts?:
    | boolean
    | {
        maximize?: boolean | KeyBinding | readonly KeyBinding[];
        middleClickClose?: boolean;
        addTab?: boolean | KeyBinding | readonly KeyBinding[];
        restoreClosedTab?: boolean | KeyBinding | readonly KeyBinding[];
      };
  getPaneState?: (paneId: string) => State;
  onError?: (error: unknown) => void;
  /** Copy additional app styles/assets into a same-origin companion document. */
  prepareWindow?: (window: Window, pane: Pane) => void;
  /** Override window creation for applications with a managed same-origin host. Must return synchronously. */
  openWindow?: (pane: Pane, placement: WindowPlacement) => Window | null;
}
/** Choose a unified registry OR the low-level renderer and creation maps. */
export type LayoutOptions<State = unknown> = Omit<
  ResolvedLayoutOptions<State>,
  'registry' | 'renderers' | 'tabs' | 'getPaneState'
> &
  (unknown extends State
    ? { getPaneState?: (paneId: string) => State }
    : { getPaneState: (paneId: string) => State }) &
  (
    | { registry: PaneRegistry<PaneRenderer<State>>; renderers?: never; tabs?: never }
    | { registry?: undefined; renderers?: Record<string, PaneRenderer<State>>; tabs?: TabRegistry }
  );
/** Omitted keys retain their value; explicit undefined restores the default. */
export type LayoutOptionUpdates<State = unknown> = {
  [Key in keyof Omit<ResolvedLayoutOptions<State>, 'store'>]?:
    ResolvedLayoutOptions<State>[Key] | undefined;
};
export interface KeyBinding {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
}
export interface CloseRequest {
  panes: readonly Pane[];
  requiringConfirmation: readonly Pane[];
  groupId?: string;
  signal: AbortSignal;
}
export interface MountedLayout<State = unknown> {
  updateOptions(options: LayoutOptionUpdates<State>): void;
  exportWorkspace(): WorkspacePreset;
  loadWorkspace(input: unknown): void;
  refreshTheme(): void;
  retryPane(id: string): void;
  requestClose(id: string, kind?: 'pane' | 'group'): Promise<boolean>;
  setTabBar(options: TabBarOptions): void;
  setTheme(theme: LayoutTheme): void;
  popout(paneId: string, placement?: WindowPlacement): Promise<boolean>;
  returnPane(paneId: string): void;
  dispose(): void;
}
