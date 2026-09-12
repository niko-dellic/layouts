import { store } from './model.js';
import type { MountedLayout } from '@niko-dellic/layouts';
export function setupShell(getMounted: () => MountedLayout | undefined) {
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
