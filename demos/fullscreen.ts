import { renderIcon } from './icons.js';

/** Demo chrome only: the layout and its pane views remain mounted. */
export function mountFullscreenToggle(doc: Document) {
  const target = doc.querySelector<HTMLElement>('.demo-main');
  const button = doc.createElement('button');
  button.type = 'button';
  button.className = 'workspace-fullscreen';
  let disposed = false;
  let pending = false;
  const update = () => {
    if (disposed) return;
    const active = doc.fullscreenElement === target;
    const label = active ? 'Exit workspace fullscreen' : 'Enter workspace fullscreen';
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', String(active));
    button.title = label;
    button.disabled = pending || !target || !doc.fullscreenEnabled;
    const icon = renderIcon(active ? 'exitFullscreen' : 'fullscreen', doc)!;
    icon.setAttribute('aria-hidden', 'true');
    button.replaceChildren(icon);
  };
  button.onclick = async () => {
    if (!target || pending || disposed) return;
    pending = true;
    update();
    let failed = false;
    try {
      if (doc.fullscreenElement === target) await doc.exitFullscreen();
      else await target.requestFullscreen();
    } catch {
      failed = true;
    } finally {
      pending = false;
      update();
      if (failed && !disposed) {
        button.title = 'Fullscreen was blocked. Click to try again.';
        button.setAttribute('aria-label', button.title);
      }
    }
  };
  doc.addEventListener('fullscreenchange', update);
  update();
  return {
    button,
    dispose() {
      disposed = true;
      doc.removeEventListener('fullscreenchange', update);
      button.onclick = null;
    },
  };
}
