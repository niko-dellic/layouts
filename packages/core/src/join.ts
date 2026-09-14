import { findParent } from './model.js';
import type { Group, Node, Split } from './types.js';

/** A contiguous run within one row/column. Perpendicular splits are barriers. */
export function joinRange(root: Node, from: string, to: string) {
  let row = findParent(root, from);
  if (!row || from === to) return undefined;
  let parent = findParent(root, row.id);
  while (parent?.axis === row.axis) {
    row = parent;
    parent = findParent(root, row.id);
  }
  const regions: Node[] = [];
  const weights: number[] = [];
  const boundaries: Split[] = [];
  const visit = (node: Node, weight: number) => {
    if (node.kind === 'split' && node.axis === row.axis) {
      visit(node.children[0], weight * node.ratio);
      boundaries.push(node);
      visit(node.children[1], weight * (1 - node.ratio));
    } else {
      regions.push(node);
      weights.push(weight);
    }
  };
  visit(row, 1);
  const a = regions.findIndex((node) => node.id === from);
  const b = regions.findIndex((node) => node.id === to);
  if (a < 0 || b < 0) return undefined;
  const start = Math.min(a, b),
    end = Math.max(a, b);
  const selected = regions.slice(start, end + 1);
  if (selected.some((node) => node.kind !== 'group')) return undefined;
  return { row, regions, weights, boundaries, start, end, selected: selected as Group[] };
}
