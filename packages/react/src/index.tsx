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
import { mountLayout } from '@niko-dellic/layouts';
import type { LayoutOptions, MountedLayout, PaneContext, PaneRenderer } from '@niko-dellic/layouts';
import type { Layout as LayoutSnapshot, LayoutStore } from '@niko-dellic/layouts-core';
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
    components,
    getPaneState,
    createPane,
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
        ...(tabs ? { tabs } : {}),
        ...(currentTheme.current ? { theme: currentTheme.current } : {}),
        ...(getPaneState ? { getPaneState } : {}),
        ...(createPane ? { createPane } : {}),
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
    createPane,
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
