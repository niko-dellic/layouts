import type { PaneRenderer, PaneContext } from 'layouts';
import { state } from './model.js';
export function field(doc: Document, tag: string, text: string, className = '') {
  const e = doc.createElement(tag);
  e.textContent = text;
  e.className = className;
  return e;
}
export const notes: PaneRenderer = ({ element, document: doc }) => {
  element.classList.add('demo-inspector');
  const caption = field(doc, 'p', 'SELECTED OBJECT', 'eyebrow'),
    title = field(doc, 'h2', 'Assembly 01');
  const description = field(doc, 'p', 'A little state. A lot of possibility.', 'muted');
  const label = field(doc, 'label', 'Working notes', 'field-label');
  const input = doc.createElement('textarea');
  input.setAttribute('aria-label', 'Working notes');
  input.value = state.get().note;
  label.append(input);
  const colors = field(doc, 'div', '', 'swatches');
  for (const color of ['#91bfa9', '#dfa776', '#95adc8', '#c9a7c0']) {
    const b = doc.createElement('button');
    b.type = 'button';
    b.style.background = color;
    b.setAttribute('aria-label', `Use ${color}`);
    b.onclick = () => state.update({ color });
    colors.append(b);
  }
  element.append(
    caption,
    title,
    description,
    field(doc, 'div', 'SURFACE', 'eyebrow'),
    colors,
    label,
    field(doc, 'p', 'App-owned state survives view remounts.', 'footnote'),
  );
  input.oninput = () => state.update({ note: input.value });
  const unsubscribe = state.subscribe(() => {
    if (input.value !== state.get().note) input.value = state.get().note;
  });
  return {
    dispose() {
      unsubscribe();
    },
  };
};
export const canvas: PaneRenderer = ({ element, document: doc }) => {
  const surface = doc.createElement('canvas');
  surface.className = 'scene-canvas';
  surface.setAttribute('aria-label', 'Abstract architectural scene');
  element.append(surface);
  const chip = field(doc, 'div', 'PERSPECTIVE  /  ORTHOGRAPHIC STUDY', 'scene-chip');
  element.append(chip);
  element.classList.add('scene-container');
  const draw = () => {
    const w = element.clientWidth,
      h = element.clientHeight;
    if (!w || !h) return;
    const scale = doc.defaultView?.devicePixelRatio ?? 1;
    surface.width = w * scale;
    surface.height = h * scale;
    const c = surface.getContext('2d');
    if (!c) return;
    c.scale(scale, scale);
    c.fillStyle = '#e7e9e2';
    c.fillRect(0, 0, w, h);
    const cx = w * 0.5,
      cy = h * 0.53,
      s = Math.min(w / 720, h / 500) * 1.05;
    const point = (x: number, y: number, z = 0): [number, number] => [
      cx + (x - y) * s,
      cy + (x + y) * s * 0.48 - z * s,
    ];
    const line = (a: [number, number], b: [number, number], color: string) => {
      c.strokeStyle = color;
      c.beginPath();
      c.moveTo(...a);
      c.lineTo(...b);
      c.stroke();
    };
    if (state.get().grid)
      for (let i = -600; i <= 600; i += 35) {
        line(point(i, -600), point(i, 600), '#cdd2c8');
        line(point(-600, i), point(600, i), '#cdd2c8');
      }
    line(point(-550, 0), point(550, 0), '#b29b88');
    line(point(0, -550), point(0, 550), '#91a796');
    const face = (pts: [number, number][], fill: string) => {
      c.fillStyle = fill;
      c.beginPath();
      pts.forEach((p, i) => (i ? c.lineTo(...p) : c.moveTo(...p)));
      c.closePath();
      c.fill();
      c.strokeStyle = '#63736e';
      c.lineWidth = 1;
      c.stroke();
    };
    const box = (x: number, y: number, bw: number, bd: number, bh: number) => {
      face([point(x, y), point(x + bw, y), point(x + bw, y, bh), point(x, y, bh)], '#688e7f');
      face(
        [point(x + bw, y), point(x + bw, y + bd), point(x + bw, y + bd, bh), point(x + bw, y, bh)],
        '#80a592',
      );
      face(
        [point(x, y, bh), point(x + bw, y, bh), point(x + bw, y + bd, bh), point(x, y + bd, bh)],
        state.get().color,
      );
    };
    face([point(-170, -145), point(190, -145), point(190, 180), point(-170, 180)], '#d7dcd0');
    box(-140, -120, 100, 200, 105);
    box(-10, -120, 155, 80, 155);
    box(-10, -5, 155, 100, 65);
    c.fillStyle = '#56665e';
    c.font = '10px ui-monospace, monospace';
    c.fillText('X', ...point(230, 0));
    c.fillText('Y', ...point(0, 235));
  };
  const unsub = state.subscribe(draw);
  return {
    resize: draw,
    dispose() {
      unsub();
    },
  };
};
export const toolbar: PaneRenderer = ({ element, document: doc }) => {
  element.classList.add('demo-toolbar');
  element.append(
    field(doc, 'strong', 'Untitled workspace'),
    field(doc, 'span', '/', 'slash'),
    field(doc, 'span', 'Spatial study', 'muted'),
  );
  const right = field(doc, 'div', '', 'toolbar-right');
  const grid = doc.createElement('button');
  grid.type = 'button';
  grid.textContent = 'Grid';
  grid.setAttribute('aria-pressed', String(state.get().grid));
  grid.onclick = () => state.update({ grid: !state.get().grid });
  right.append(grid, field(doc, 'span', 'Local session', 'session-dot'));
  element.append(right);
  const unsub = state.subscribe(() => grid.setAttribute('aria-pressed', String(state.get().grid)));
  return { dispose: unsub };
};
export const tools: PaneRenderer = ({ element, document: doc }) => {
  element.classList.add('demo-tools');
  element.append(field(doc, 'p', 'COLLECTION', 'eyebrow'));
  for (const [name, meta] of [
    ['Assembly 01', '3 objects'],
    ['West volume', '100 × 200'],
    ['North volume', '155 × 80'],
    ['Courtyard', '155 × 100'],
  ]) {
    const row = field(doc, 'div', '', 'object-row');
    row.append(field(doc, 'span', name!, 'object-name'), field(doc, 'small', meta!));
    element.append(row);
  }
  element.append(
    field(
      doc,
      'p',
      'Drag a tab to an edge to split. Drop it in the center to make a tab group.',
      'tools-help',
    ),
  );
  return { dispose() {} };
};
export const timeline: PaneRenderer = ({ element, document: doc }) => {
  element.classList.add('demo-timeline');
  const row = field(doc, 'div', '', 'ruler');
  for (let i = 0; i <= 120; i += 10) row.append(field(doc, 'span', String(i).padStart(3, '0')));
  element.append(row);
  const track = field(doc, 'div', '', 'track');
  track.append(field(doc, 'span', 'Assembly 01', 'track-label'));
  const clip = field(doc, 'div', 'Spatial study', 'clip');
  track.append(clip);
  element.append(track);
  return { dispose() {} };
};
export const activity: PaneRenderer = ({ element, document: doc }) => {
  element.classList.add('demo-inspector');
  element.append(field(doc, 'p', 'SESSION', 'eyebrow'), field(doc, 'h2', 'Every view, connected.'));
  const count = field(doc, 'p', '', 'activity-count');
  const update = () => (count.textContent = `${state.get().changes} state changes`);
  update();
  element.append(
    count,
    field(
      doc,
      'p',
      'Edit the notes or change the surface color. The canvas and inspector share application-owned state, even in different windows.',
      'muted',
    ),
  );
  return { dispose: state.subscribe(update) };
};
export const footer: PaneRenderer = ({ element, document: doc }) => {
  element.classList.add('demo-footer');
  element.append(
    field(doc, 'span', '●  Ready'),
    field(doc, 'span', 'TypeScript core · Native windows · Your components'),
  );
  return { dispose() {} };
};
export const renderers = { notes, canvas, toolbar, tools, timeline, activity, footer };
export function imperativeView(context: PaneContext) {
  return renderers[context.pane.type as keyof typeof renderers]?.(context) ?? notes(context);
}
