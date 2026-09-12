export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Capability = 'resize' | 'move' | 'split' | 'join' | 'close' | 'popout';
export type Axis = 'horizontal' | 'vertical';
export interface Pane {
  id: string;
  type: string;
  title: string;
  params?: Json;
  capabilities?: Partial<Record<Capability, boolean>>;
  size?: { minWidth?: number; maxWidth?: number; minHeight?: number; maxHeight?: number };
  /** Hide chrome only for a one-tab group. Host commands can still operate on it. */
  header?: boolean;
}
export interface Group {
  kind: 'group';
  id: string;
  panes: string[];
  active: string | null;
}
export interface Split {
  kind: 'split';
  id: string;
  axis: Axis;
  ratio: number;
  children: [Node, Node];
}
export type Node = Group | Split;
export interface WindowPlacement {
  width?: number;
  height?: number;
  left?: number;
  top?: number;
}
export interface Popout {
  paneId: string;
  groupId: string;
  index: number;
  placement?: WindowPlacement;
}
export interface Layout {
  version: 1;
  root: Node;
  panes: Record<string, Pane>;
  popouts: Popout[];
  maximized: string | null;
}
export interface Issue {
  path: string;
  message: string;
}
export class LayoutError extends Error {
  constructor(public readonly issues: Issue[]) {
    super(issues.map((i) => `${i.path}: ${i.message}`).join('; '));
    this.name = 'LayoutError';
  }
}
export interface CommandOptions {
  /** Treat capability flags as user-interaction restrictions. */ source?: 'user' | 'api';
}
export interface Change {
  action: string;
  layout: Layout;
}
export interface Bounds {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
}
