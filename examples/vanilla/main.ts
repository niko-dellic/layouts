import { createLayout, LayoutStore, mountLayout, PaneRegistry } from 'quilt-vanilla';
import type { PaneRenderer } from 'quilt-vanilla';
import 'quilt-vanilla/styles.css';
import './style.css';

// Data belongs to the application, and survives view disposal or document changes.
interface NoteState {
  text: string;
}
const notes = new Map<string, NoteState>();
const registry = new PaneRegistry<PaneRenderer<NoteState>>([
  {
    type: 'note',
    title: 'Note',
    confirmClose: true,
    view: ({ element, document: doc, state }) => {
      const input = doc.createElement('textarea');
      input.setAttribute('aria-label', 'Note text');
      input.value = state.text;
      const change = () => {
        state.text = input.value;
      };
      input.addEventListener('input', change);
      element.classList.add('note');
      element.append(input);
      return {
        dispose() {
          input.removeEventListener('input', change);
          input.remove();
        },
      };
    },
  },
]);
const store = new LayoutStore(createLayout({ pane: { id: 'note', type: 'note', title: 'Note' } }));
const workspace = mountLayout(document.querySelector<HTMLElement>('#workspace')!, {
  store,
  registry,
  getPaneState(id) {
    if (!notes.has(id)) notes.set(id, { text: 'Edit me, then pop out and return.' });
    return notes.get(id)!;
  },
  theme: { accent: 'var(--app-accent)', headerHeight: 'calc(2rem + 4px)' },
  onError: report,
});
const json = document.querySelector<HTMLTextAreaElement>('#json')!;
function report(error: unknown) {
  document.querySelector('#status')!.textContent =
    error instanceof Error ? error.message : String(error);
}
document.querySelector<HTMLButtonElement>('#save')!.onclick = () => {
  try {
    json.value = JSON.stringify(workspace.exportWorkspace(), null, 2);
    report('Saved');
  } catch (error) {
    report(error);
  }
};
document.querySelector<HTMLButtonElement>('#load')!.onclick = () => {
  try {
    workspace.loadWorkspace(JSON.parse(json.value));
    report('Loaded');
  } catch (error) {
    report(error);
  }
};
document.querySelector<HTMLButtonElement>('#theme')!.onclick = () => {
  document.documentElement.dataset.theme =
    document.documentElement.dataset.theme === 'warm' ? 'cool' : 'warm';
  workspace.refreshTheme();
};
document.querySelector<HTMLButtonElement>('#popout')!.onclick = async () => {
  report((await workspace.popout('note')) ? 'Popped out' : 'Could not pop out');
};
document.querySelector<HTMLButtonElement>('#close')!.onclick = () => {
  void workspace.requestClose('note');
};
function dispose() {
  workspace.dispose();
  store.dispose();
  window.removeEventListener('pagehide', dispose);
}
document.querySelector<HTMLButtonElement>('#dispose')!.onclick = dispose;
window.addEventListener('pagehide', dispose);
if (import.meta.hot) import.meta.hot.dispose(dispose);
