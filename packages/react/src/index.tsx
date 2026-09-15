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
import type { ComponentType, CSSProperties, ReactNode, RefAttributes, ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal, flushSync } from 'react-dom';
import { mountLayout, PaneRegistry } from 'quilt-vanilla';
import type { LayoutOptions, MountedLayout, PaneContext, PaneRenderer } from 'quilt-vanilla';
import type { Layout as LayoutSnapshot, LayoutStore } from 'quilt-core';
export type PaneProps<State = unknown> = Omit<PaneContext<State>, 'element'>;
class Boundary extends Component<
  { children: ReactNode; onError: (error: unknown) => void; fallback?: string },
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
    return this.state.failed
      ? createElement(
          'div',
          { role: 'alert' },
          this.props.fallback ?? 'Pane could not be rendered.',
        )
      : this.props.children;
  }
}
/** A separate root is created for each pane view, including companion documents. */
export function reactRenderer<State = unknown>(
  component: ComponentType<PaneProps<State>>,
): PaneRenderer<State> {
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
              context.reportError(error);
            },
            children: createElement(component, { ...props, pane }),
          }),
        );
      },
    };
  };
}

interface PortalEntry {
  id: number;
  context: PaneContext;
  component: ComponentType<PaneProps>;
  ready: () => void;
  fail: (error: unknown) => void;
}
function Ready({ children, onReady }: { children: ReactNode; onReady: () => void }) {
  useLayoutEffect(onReady, [onReady]);
  return children;
}
function createBridge() {
  let sequence = 0;
  let entries: PortalEntry[] = [];
  const listeners = new Set<() => void>();
  const emit = () => {
    for (const listener of listeners) listener();
  };
  const cache = new WeakMap<ComponentType<PaneProps>, PaneRenderer>();
  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    snapshot: () => entries,
    renderer(component: ComponentType<PaneProps>): PaneRenderer {
      let renderer = cache.get(component);
      if (renderer) return renderer;
      renderer = (context) => {
        let resolve!: () => void, reject!: (error: unknown) => void;
        const ready = new Promise<void>((yes, no) => {
          resolve = yes;
          reject = no;
        });
        void ready.catch(() => {});
        const entry: PortalEntry = {
          id: ++sequence,
          context,
          component,
          ready: resolve,
          fail: reject,
        };
        entries = [...entries, entry];
        emit();
        return {
          ready,
          update(pane) {
            entry.context = { ...entry.context, pane };
            entries = [...entries];
            emit();
          },
          dispose() {
            entries = entries.filter((value) => value !== entry);
            emit();
            reject(new Error('Pane disposed before readiness'));
          },
        };
      };
      cache.set(component, renderer);
      return renderer;
    },
  };
}
export type LayoutProps<State = unknown> = Omit<
  LayoutOptions<State>,
  'renderers' | 'registry' | 'tabs'
> & {
  className?: string;
  style?: CSSProperties;
} & (
    | { registry: PaneRegistry<ComponentType<PaneProps<State>>>; components?: never; tabs?: never }
    | {
        registry?: undefined;
        components?: Record<string, ComponentType<PaneProps<State>>>;
        tabs?: import('quilt-vanilla').TabRegistry;
      }
  );
const LayoutImpl = forwardRef<MountedLayout, LayoutProps>(function Layout(props, ref) {
  const { store, components, registry, className, style, ...rest } = props;
  if (registry && (components || props.tabs))
    throw new Error('registry cannot be combined with components or tabs');
  const bridge = useMemo(createBridge, [store]);
  const entries = useSyncExternalStore(bridge.subscribe, bridge.snapshot, bridge.snapshot);
  const host = useRef<HTMLDivElement>(null);
  const mounted = useRef<MountedLayout | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const adapt = () => {
    const current = latest.current;
    const {
      store: _store,
      components: map,
      registry: source,
      className: _className,
      style: _style,
      ...options
    } = current;
    const complete = Object.fromEntries(
      [
        'tabs',
        'theme',
        'tabBar',
        'getPaneState',
        'onError',
        'prepareWindow',
        'openWindow',
        'renderIcon',
        'shortcuts',
        'messages',
        'popouts',
        'confirmClose',
        'registry',
        'renderers',
      ].map((key) => [key, undefined]),
    );
    if (source) {
      const adapted = new PaneRegistry<PaneRenderer>(
        source.list().map((entry) => ({ ...entry, view: bridge.renderer(entry.view) })),
      );
      return { ...complete, ...options, registry: adapted };
    }
    return {
      ...complete,
      ...options,
      renderers: Object.fromEntries(
        Object.entries(map ?? {}).map(([key, component]) => [key, bridge.renderer(component)]),
      ),
    };
  };
  useImperativeHandle(ref, () => {
    const instance = () => {
      if (!mounted.current) throw new Error('Layout is not mounted');
      return mounted.current;
    };
    return {
      setTheme: (theme) => instance().setTheme(theme),
      setTabBar: (options) => instance().setTabBar(options),
      updateOptions: (options) => instance().updateOptions(options),
      refreshTheme: () => instance().refreshTheme(),
      retryPane: (id) => instance().retryPane(id),
      exportWorkspace: () => instance().exportWorkspace(),
      loadWorkspace: (input) => instance().loadWorkspace(input),
      requestClose: (id, kind) => mounted.current?.requestClose(id, kind) ?? Promise.resolve(false),
      popout: (id, placement) => mounted.current?.popout(id, placement) ?? Promise.resolve(false),
      returnPane: (id) => mounted.current?.returnPane(id),
      dispose: () => mounted.current?.dispose(),
    };
  }, []);
  useLayoutEffect(() => {
    let cancelled = false;
    let instance: MountedLayout | undefined;
    queueMicrotask(() => {
      if (cancelled || !host.current) return;
      instance = mountLayout(host.current, { store, ...adapt() } as LayoutOptions);
      mounted.current = instance;
    });
    return () => {
      cancelled = true;
      if (mounted.current === instance) mounted.current = null;
      queueMicrotask(() => instance?.dispose());
    };
  }, [store, bridge]);
  // Only changes to public options update the DOM adapter; bridge renders don't rebuild chrome.
  useLayoutEffect(() => {
    mounted.current?.updateOptions(adapt());
  }, [
    components,
    registry,
    rest.tabs,
    rest.theme,
    rest.tabBar,
    rest.getPaneState,
    rest.onError,
    rest.prepareWindow,
    rest.openWindow,
    rest.renderIcon,
    rest.shortcuts,
    rest.messages,
    rest.popouts,
    rest.confirmClose,
  ]);
  useLayoutEffect(
    () => registry?.subscribe(() => mounted.current?.updateOptions(adapt())),
    [registry, bridge],
  );
  return (
    <>
      <div ref={host} className={className} style={{ width: '100%', height: '100%', ...style }} />
      {entries.map((entry) => {
        const { element, ...context } = entry.context;
        return createPortal(
          <Boundary
            fallback={
              props.messages?.['Pane could not be rendered.'] ?? 'Pane could not be rendered.'
            }
            onError={(error) => {
              entry.fail(error);
              entry.context.reportError(error);
            }}
          >
            <Ready onReady={entry.ready}>{createElement(entry.component, context)}</Ready>
          </Boundary>,
          element,
          String(entry.id),
        );
      })}
    </>
  );
});
/** State is application-owned and shared by every registered pane in this layout. */
export const Layout = LayoutImpl as <State = unknown>(
  props: LayoutProps<State> & RefAttributes<MountedLayout<State>>,
) => ReactElement | null;
export function useLayoutSnapshot(store: LayoutStore): LayoutSnapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
export { LayoutStore, LayoutError, createLayout, parseLayout, validate } from 'quilt-core';
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
} from 'quilt-core';
export { TabRegistry, themes, themeFamilies } from 'quilt-vanilla';
export type {
  TabRegistration,
  LayoutTheme,
  LayoutOptions,
  MountedLayout,
  PaneContext,
  PaneView,
  PaneRenderer,
} from 'quilt-vanilla';

export {
  PaneRegistry,
  parseWorkspace,
  dockLayout,
  themeProperties,
  defaultMessages,
} from 'quilt-vanilla';
export type {
  PaneRegistration,
  WorkspacePreset,
  Messages,
  CloseRequest,
  KeyBinding,
  TabBarOptions,
  TabBarStyle,
} from 'quilt-vanilla';
