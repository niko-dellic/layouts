import { themes } from 'layouts';
import { renderIcon } from './icons.js';
import 'layouts/styles.css';
import './style.css';
import { mountLayout } from 'layouts';
import { store, getPaneState, tabs } from './model.js';
import { renderers } from './views.js';
import { setupShell } from './shell.js';
const layout = mountLayout(document.querySelector('#workspace')!, {
  store,
  renderers,
  getPaneState,
  tabs,
  theme: { ...themes.sage, fontSize: '11px', headerHeight: '32px' },
  renderIcon,
  shortcuts: true,
});
setupShell(() => layout);
window.addEventListener('pagehide', () => layout.dispose(), { once: true });
