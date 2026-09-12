import { renderIcon } from './icons.js';
import '@niko-dellic/layouts/styles.css';
import './style.css';
import { mountLayout } from '@niko-dellic/layouts';
import { store, getPaneState, createPane } from './model.js';
import { renderers } from './views.js';
import { setupShell } from './shell.js';
const layout = mountLayout(document.querySelector('#workspace')!, {
  store,
  renderers,
  getPaneState,
  createPane,
  renderIcon,
  shortcuts: true,
});
setupShell(() => layout);
window.addEventListener('pagehide', () => layout.dispose(), { once: true });
