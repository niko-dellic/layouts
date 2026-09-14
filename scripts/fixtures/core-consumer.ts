import {
  LayoutStore,
  createLayout,
  parseLayout,
  validate,
  LayoutError,
  joinRange,
  DIVIDER,
} from 'quilt-core';
import type { Layout, Pane, JoinOptions } from 'quilt-core';
// @ts-expect-error Internal validation helper is not public.
import { isJson } from 'quilt-core';
// @ts-expect-error Internal bounds helper is not public.
import { paneBounds } from 'quilt-core';
const pane: Pane = { id: 'a', type: 'text', title: 'A' };
const layout: Layout = createLayout({ pane });
const store = new LayoutStore(parseLayout(layout));
const options: JoinOptions = {};
void [validate(store.export()), LayoutError, joinRange, DIVIDER, options, isJson, paneBounds];
store.dispose();
