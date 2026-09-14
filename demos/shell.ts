import { themes, themeFamilies } from 'layouts';
import { store } from './model.js';
import type { MountedLayout } from 'layouts';
export function setupShell(getMounted: () => MountedLayout | undefined) {
  const themeSelect = document.createElement('select');
  themeSelect.setAttribute('aria-label', 'Workspace theme');
  for (const name of [
    'sage',
    'light',
    'dark',
    ...Object.keys(themeFamilies).flatMap((family) => [`${family}-dark`, `${family}-light`]),
  ]) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name[0]!.toUpperCase() + name.slice(1);
    themeSelect.append(option);
  }
  themeSelect.onchange = () =>
    getMounted()?.setTheme({
      ...(themeSelect.value.includes('-')
        ? themeFamilies[themeSelect.value.split('-')[0] as keyof typeof themeFamilies][
            themeSelect.value.split('-')[1] as 'dark' | 'light'
          ]
        : themes[themeSelect.value as keyof typeof themes]),
      fontSize: '11px',
      headerHeight: '32px',
    });
  document.querySelector('.demo-actions')!.prepend(themeSelect);
  const output = document.querySelector<HTMLTextAreaElement>('#layout-json')!;
  const dialog = document.querySelector<HTMLDialogElement>('#json-dialog')!;
  const error = document.querySelector<HTMLElement>('#json-error')!;
  document.querySelector('#json-open')!.addEventListener('click', () => {
    output.value = JSON.stringify(store.export(), null, 2);
    error.textContent = '';
    dialog.showModal();
  });
  document.querySelector('#json-cancel')!.addEventListener('click', () => dialog.close());
  document.querySelector('#json-load')!.addEventListener('click', () => {
    try {
      store.load(JSON.parse(output.value));
      dialog.close();
    } catch (e) {
      error.textContent = e instanceof Error ? e.message : String(e);
    }
  });
  document.querySelector('#reset')!.addEventListener('click', () => store.reset());
  document
    .querySelector('#popout-inspector')!
    .addEventListener('click', () => getMounted()?.popout('notes'));
  const status = document.querySelector('#layout-status')!;
  store.subscribe(({ action, layout }) => {
    status.textContent = `${action} · ${Object.keys(layout.panes).length} panes`;
  });
}
