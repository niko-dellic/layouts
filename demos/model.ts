import { TabRegistry } from '@niko-dellic/layouts';
import { LayoutStore } from '@niko-dellic/layouts-core';
import type { Layout, Pane } from '@niko-dellic/layouts-core';
export const initial: Layout = {
  version: 1,
  maximized: null,
  popouts: [],
  panes: {
    toolbar: {
      id: 'toolbar',
      type: 'toolbar',
      title: 'Workspace toolbar',
      header: false,
      size: { minHeight: 48, maxHeight: 48 },
      capabilities: {
        resize: false,
        move: false,
        split: false,
        join: false,
        close: false,
        popout: false,
      },
    },
    tools: {
      id: 'tools',
      type: 'tools',
      icon: 'tools',
      title: 'Objects',
      size: { minWidth: 190, minHeight: 120 },
    },
    canvas: {
      id: 'canvas',
      type: 'canvas',
      icon: 'canvas',
      title: 'Scene',
      size: { minWidth: 280, minHeight: 180 },
    },
    notes: {
      id: 'notes',
      type: 'notes',
      icon: 'notes',
      title: 'Inspector',
      size: { minWidth: 220, minHeight: 180 },
    },
    activity: {
      id: 'activity',
      type: 'activity',
      icon: 'activity',
      title: 'Activity',
      size: { minWidth: 220, minHeight: 180 },
    },
    timeline: {
      id: 'timeline',
      type: 'timeline',
      icon: 'timeline',
      title: 'Timeline',
      size: { minHeight: 110 },
    },
    footer: {
      id: 'footer',
      type: 'footer',
      title: 'Status bar',
      header: false,
      size: { minHeight: 28, maxHeight: 28 },
      capabilities: {
        resize: false,
        move: false,
        split: false,
        join: false,
        close: false,
        popout: false,
      },
    },
  },
  root: {
    kind: 'split',
    id: 'top',
    axis: 'vertical',
    ratio: 0.08,
    children: [
      { kind: 'group', id: 'toolbar-group', panes: ['toolbar'], active: 'toolbar' },
      {
        kind: 'split',
        id: 'footer-split',
        axis: 'vertical',
        ratio: 0.95,
        children: [
          {
            kind: 'split',
            id: 'timeline-split',
            axis: 'vertical',
            ratio: 0.78,
            children: [
              {
                kind: 'split',
                id: 'tools-split',
                axis: 'horizontal',
                ratio: 0.19,
                children: [
                  { kind: 'group', id: 'tools-group', panes: ['tools'], active: 'tools' },
                  {
                    kind: 'split',
                    id: 'inspector-split',
                    axis: 'horizontal',
                    ratio: 0.72,
                    children: [
                      { kind: 'group', id: 'scene-group', panes: ['canvas'], active: 'canvas' },
                      {
                        kind: 'group',
                        id: 'inspector-group',
                        panes: ['notes', 'activity'],
                        active: 'notes',
                      },
                    ],
                  },
                ],
              },
              { kind: 'group', id: 'timeline-group', panes: ['timeline'], active: 'timeline' },
            ],
          },
          { kind: 'group', id: 'footer-group', panes: ['footer'], active: 'footer' },
        ],
      },
    ],
  },
};
export const store = new LayoutStore(initial);
export interface DemoData {
  note: string;
  color: string;
  grid: boolean;
  changes: number;
}
let data: DemoData = {
  note: 'A workspace that adapts to your work.\n\nTry opening this inspector in a new window. Your notes will travel with it.',
  color: '#91bfa9',
  grid: true,
  changes: 0,
};
const listeners = new Set<() => void>();
export const state = {
  get: () => data,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  update: (patch: Partial<DemoData>) => {
    data = { ...data, ...patch, changes: data.changes + 1 };
    listeners.forEach((fn) => fn());
  },
};
export const getPaneState = () => state;
export const tabs = new TabRegistry([
  {
    id: 'canvas',
    title: 'Canvas',
    description: 'Interactive scene viewport',
    icon: 'canvas',
    keywords: ['scene', '3d', 'viewport'],
    create: () => ({
      id: crypto.randomUUID(),
      type: 'canvas',
      icon: 'canvas',
      title: 'Scene',
      size: { minWidth: 180, minHeight: 120 },
    }),
  },
  ...[
    ['notes', 'Notes', 'Inspector and working notes'],
    ['tools', 'Objects', 'Scene object collection'],
    ['activity', 'Activity', 'Application activity'],
    ['timeline', 'Timeline', 'Animation and playback'],
  ].map(([type, title, description]) => ({
    id: type!,
    title: title!,
    description: description!,
    icon: type!,
    create: (): Pane => ({
      id: crypto.randomUUID(),
      type: type!,
      icon: type!,
      title: title!,
      size: { minWidth: 180, minHeight: 120 },
    }),
  })),
]);
