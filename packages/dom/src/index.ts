export { mountLayout } from './renderer.js';
export type * from './types.js';

export { TabRegistry } from './registry.js';
export type { TabRegistration } from './registry.js';
export { themes, themeFamilies } from './theme.js';
export type { LayoutTheme } from './theme.js';
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
