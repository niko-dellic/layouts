export type { TabBarOptions, TabBarStyle } from 'layouts';
import {
  Component,
  createElement,
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import type { ComponentType, CSSProperties, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { mountLayout } from 'layouts';
import type { LayoutOptions, MountedLayout, PaneContext, PaneRenderer } from 'layouts';
import type { Layout as LayoutSnapshot, LayoutStore } from 'layouts-core';
export type PaneProps = Omit<PaneContext, 'element'>;
class Boundary extends Component<
  { children: ReactNode; onError: (error: unknown) => void },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: unknown) {
    this.props.onError(error);
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}
/** A separate root is created for each pane view, including companion documents. */
export function reactRenderer(component: ComponentType<PaneProps>): PaneRenderer {
  return (context) => {
    const root = createRoot(context.element);
    let failure: unknown;
    const { element: _element, ...props } = context;
    try {
      flushSync(() =>
        root.render(
          createElement(Boundary, {
            onError: (error) => {
              failure = error;
            },
            children: createElement(component, props),
          }),
        ),
      );
      if (failure) throw failure;
    } catch (error) {
      root.unmount();
      throw error;
    }
    return {
      dispose() {
        root.unmount();
      },
      update(pane) {
        root.render(
          createElement(Boundary, {
            onError: (error) => {
              context.element.textContent = error instanceof Error ? error.message : String(error);
            },
            children: createElement(component, { ...props, pane }),
          }),
        );
      },
    };
  };
}
export interface LayoutProps extends Omit<LayoutOptions, 'renderers'> {
  components: Record<string, ComponentType<PaneProps>>;
  className?: string;
  style?: CSSProperties;
}
/** Keep store, components, and adapter callbacks stable to avoid remounting the workspace. */
export const Layout = forwardRef<MountedLayout, LayoutProps>(function Layout(props, ref) {
  const {
    store,
    tabs,
    theme,
    tabBar,
    components,
    getPaneState,
    onError,
    prepareWindow,
    openWindow,
    renderIcon,
    shortcuts,
    className,
    style,
  } = props;
  const host = useRef<HTMLDivElement>(null),
    mounted = useRef<MountedLayout | null>(null);
  const currentTabBar = useRef(tabBar);
  currentTabBar.current = tabBar;
  useLayoutEffect(() => {
    mounted.current?.setTabBar(tabBar ?? {});
  }, [tabBar]);
  const currentTheme = useRef(theme);
  currentTheme.current = theme;
  useLayoutEffect(() => {
    mounted.current?.setTheme(theme ?? {});
  }, [theme]);
  const renderers = useMemo(
    () => Object.fromEntries(Object.entries(components).map(([id, c]) => [id, reactRenderer(c)])),
    [components],
  );
  useImperativeHandle(
    ref,
    () => ({
      setTabBar: (options) => mounted.current?.setTabBar(options),
      setTheme: (theme) => mounted.current?.setTheme(theme),
      popout: (...args) => mounted.current?.popout(...args) ?? false,
      returnPane: (id) => mounted.current?.returnPane(id),
      dispose: () => mounted.current?.dispose(),
    }),
    [],
  );
  useLayoutEffect(() => {
    let cancelled = false;
    let instance: MountedLayout | undefined;
    // Pane roots must mount outside the parent React commit (flushSync is forbidden there).
    queueMicrotask(() => {
      if (cancelled || !host.current) return;
      instance = mountLayout(host.current, {
        store,
        renderers,
        ...(currentTabBar.current ? { tabBar: currentTabBar.current } : {}),
        ...(tabs ? { tabs } : {}),
        ...(currentTheme.current ? { theme: currentTheme.current } : {}),
        ...(getPaneState ? { getPaneState } : {}),
        ...(onError ? { onError } : {}),
        ...(prepareWindow ? { prepareWindow } : {}),
        ...(openWindow ? { openWindow } : {}),
        ...(renderIcon ? { renderIcon } : {}),
        ...(shortcuts !== undefined ? { shortcuts } : {}),
      });
      mounted.current = instance;
    });
    return () => {
      cancelled = true;
      const previous = instance;
      queueMicrotask(() => previous?.dispose());
      if (mounted.current === previous) mounted.current = null;
    };
  }, [
    store,
    renderers,
    tabs,
    getPaneState,
    onError,
    prepareWindow,
    openWindow,
    renderIcon,
    shortcuts,
  ]);
  return (
    <div ref={host} className={className} style={{ width: '100%', height: '100%', ...style }} />
  );
});
export function useLayoutSnapshot(store: LayoutStore): LayoutSnapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
export { LayoutStore, LayoutError, createLayout, parseLayout, validate } from 'layouts-core';
export type {
  AutoCollapse,
  LayoutStoreOptions,
  Json,
  Capability,
  Axis,
  Pane,
  Group,
  Split,
  Node,
  WindowPlacement,
  Popout,
  Layout as LayoutSnapshot,
  Issue,
  CommandOptions,
  Change,
  Bounds,
  JoinOptions,
} from 'layouts-core';
export { TabRegistry, themes, themeFamilies } from 'layouts';
export type {
  TabRegistration,
  LayoutTheme,
  LayoutOptions,
  MountedLayout,
  PaneContext,
  PaneView,
  PaneRenderer,
} from 'layouts';
