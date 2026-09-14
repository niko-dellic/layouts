import type { PaneRenderer } from 'layouts';
import { state, cameraFor, defaultCamera } from './model.js';
import type { Camera } from './model.js';
import { surfaceColors } from './surfaces.js';
type Point = [number, number, number];
export const canvas: PaneRenderer = ({ element, document: doc, window: win, pane }) => {
  const surface = doc.createElement('canvas');
  surface.className = 'scene-canvas';
  surface.setAttribute('aria-label', 'Abstract architectural scene');
  element.append(surface);
  const chip = doc.createElement('div');
  chip.className = 'scene-chip';
  chip.textContent = 'DRAG TO ORBIT · SCROLL TO ZOOM · DOUBLE-CLICK TO RESET';
  surface.tabIndex = 0;
  const camera = cameraFor(pane.id);
  element.append(chip);
  element.classList.add('scene-container');
  let themeRoot: Element | null = null;
  const draw = () => {
    const root = element.closest('.layouts');
    if (root && root !== themeRoot) {
      themeObserver.disconnect();
      themeObserver.observe(root, { attributes: true, attributeFilter: ['style'] });
      themeRoot = root;
    }
    const styles = doc.defaultView!.getComputedStyle(element);
    const color = (role: string) => styles.getPropertyValue(`--layouts-${role}`).trim();
    const w = element.clientWidth,
      h = element.clientHeight;
    if (!w || !h) return;
    const scale = doc.defaultView?.devicePixelRatio ?? 1;
    const pixelWidth = Math.round(w * scale),
      pixelHeight = Math.round(h * scale);
    if (surface.width !== pixelWidth) surface.width = pixelWidth;
    if (surface.height !== pixelHeight) surface.height = pixelHeight;
    const c = surface.getContext('2d');
    if (!c) return;
    c.setTransform(scale, 0, 0, scale, 0, 0);
    c.fillStyle = color('panel');
    c.fillRect(0, 0, w, h);
    const { azimuth, elevation, zoom } = camera;
    const ca = Math.cos(azimuth),
      sa = Math.sin(azimuth);
    const ce = Math.cos(elevation),
      se = Math.sin(elevation);
    const depth = ([x, y, z]: Point) => (x * sa + y * ca) * ce + z * se;
    const cx = w * 0.5,
      cy = h * 0.5,
      s = Math.min(w / 720, h / 500) * 1.4 * zoom;
    const point = (x: number, y: number, z = 0): [number, number] => [
      cx + ((x - 10) * ca - (y - 17.5) * sa) * s,
      cy + ((x - 10) * sa + (y - 17.5) * ca) * se * s - (z - 70) * ce * s,
    ];
    const line = (a: [number, number], b: [number, number], color: string) => {
      c.strokeStyle = color;
      c.beginPath();
      c.moveTo(...a);
      c.lineTo(...b);
      c.stroke();
    };
    c.globalAlpha = 0.45;
    if (state.get().grid)
      for (let i = -600; i <= 600; i += 35) {
        line(point(i, -600), point(i, 600), color('line'));
        line(point(-600, i), point(600, i), color('line'));
      }
    c.globalAlpha = 1;
    line(point(-550, 0), point(550, 0), color('muted'));
    line(point(0, -550), point(0, 550), color('accent'));
    const paint = surfaceColors(state.get().color, color('panel'));
    const face = (pts: [number, number][], fill: string, edge = color('line')) => {
      c.fillStyle = fill;
      c.beginPath();
      pts.forEach((p, i) => (i ? c.lineTo(...p) : c.moveTo(...p)));
      c.closePath();
      c.fill();
      c.strokeStyle = edge;
      c.lineWidth = 1;
      c.stroke();
    };
    const faces: { points: Point[]; fill: string; depth: number }[] = [];
    const addFace = (points: Point[], fill: string, normal: Point) => {
      if (depth(normal) <= 0) return;
      faces.push({
        points,
        fill,
        depth: points.reduce((sum, p) => sum + depth(p), 0) / points.length,
      });
    };
    const box = (x: number, y: number, bw: number, bd: number, bh: number) => {
      const a: Point = [x, y, 0],
        b: Point = [x + bw, y, 0];
      const c: Point = [x + bw, y + bd, 0],
        d: Point = [x, y + bd, 0];
      const top = ([px, py]: Point): Point => [px, py, bh];
      addFace([a, b, top(b), top(a)], paint.front, [0, -1, 0]);
      addFace([b, c, top(c), top(b)], paint.side, [1, 0, 0]);
      addFace([c, d, top(d), top(c)], paint.front, [0, 1, 0]);
      addFace([d, a, top(a), top(d)], paint.side, [-1, 0, 0]);
      addFace([top(a), top(b), top(c), top(d)], paint.top, [0, 0, 1]);
    };
    face([point(-170, -145), point(190, -145), point(190, 180), point(-170, 180)], color('header'));
    box(-140, -120, 100, 200, 105);
    box(-10, -120, 155, 80, 155);
    box(-10, -5, 155, 100, 65);
    for (const item of faces.sort((a, b) => a.depth - b.depth)) {
      face(
        item.points.map(([x, y, z]) => point(x, y, z)),
        item.fill,
        paint.edge,
      );
    }
    c.fillStyle = color('text');
    c.font = '10px ui-monospace, monospace';
    c.fillText('X', ...point(230, 0));
    c.fillText('Y', ...point(0, 235));
  };
  let frame = 0;
  const redraw = () => {
    if (!frame)
      frame = win.requestAnimationFrame(() => {
        frame = 0;
        draw();
      });
  };
  let drag: { id: number; x: number; y: number; start: Camera } | undefined;
  const finish = (cancel = false) => {
    if (!drag) return;
    const current = drag;
    drag = undefined;
    if (cancel) Object.assign(camera, current.start);
    surface.classList.remove('is-orbiting');
    if (surface.hasPointerCapture(current.id)) surface.releasePointerCapture(current.id);
    redraw();
  };
  surface.onpointerdown = (event) => {
    if (event.button !== 0 || drag) return;
    event.preventDefault();
    surface.focus({ preventScroll: true });
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, start: { ...camera } };
    surface.setPointerCapture(event.pointerId);
    surface.classList.add('is-orbiting');
  };
  surface.onpointermove = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    camera.azimuth = drag.start.azimuth - (event.clientX - drag.x) * 0.008;
    camera.elevation = Math.max(
      0.15,
      Math.min(1.35, drag.start.elevation + (event.clientY - drag.y) * 0.006),
    );
    redraw();
  };
  surface.onpointerup = (event) => {
    if (event.pointerId === drag?.id) finish();
  };
  surface.onpointercancel = (event) => {
    if (event.pointerId === drag?.id) finish(true);
  };
  surface.onlostpointercapture = () => finish(true);
  const keydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && drag) {
      event.preventDefault();
      finish(true);
    }
  };
  doc.addEventListener('keydown', keydown);
  const wheel = (event: WheelEvent) => {
    if (event.ctrlKey) return;
    event.preventDefault();
    const delta =
      event.deltaY *
      (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1);
    camera.zoom = Math.max(
      0.45,
      Math.min(2.8, camera.zoom * Math.exp(-Math.max(-100, Math.min(100, delta)) * 0.002)),
    );
    redraw();
  };
  surface.addEventListener('wheel', wheel, { passive: false });
  surface.ondblclick = () => {
    finish();
    Object.assign(camera, defaultCamera);
    redraw();
  };
  const themeObserver = new MutationObserver(redraw);
  const unsub = state.subscribe(redraw);
  return {
    resize: redraw,
    dispose() {
      finish();
      if (frame) win.cancelAnimationFrame(frame);
      surface.onpointerdown = surface.onpointermove = surface.onpointerup = null;
      surface.onpointercancel = surface.onlostpointercapture = surface.ondblclick = null;
      surface.removeEventListener('wheel', wheel);
      doc.removeEventListener('keydown', keydown);
      unsub();
      themeObserver.disconnect();
    },
  };
};
