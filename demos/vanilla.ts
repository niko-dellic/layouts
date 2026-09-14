import { defaultTheme } from './theme.js';
import { renderIcon } from './icons.js';
import 'quilt-dom/styles.css';
import { mountLayout } from 'quilt-dom';
import { store, getPaneState, tabs } from './model.js';
import { renderers } from './views.js';
import { setupShell } from './shell.js';
const layout = mountLayout(document.querySelector('#workspace')!, {
  store,
  renderers,
  getPaneState,
  tabs,
  theme: defaultTheme,
  renderIcon,
  shortcuts: true,
  tabBar: { attachment: 'floating', fit: 'fit' },
});
setupShell(() => layout);
window.addEventListener('pagehide', () => layout.dispose(), { once: true });
