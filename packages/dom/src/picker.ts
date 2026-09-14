import type { Group, Pane } from 'layouts-core';
import type { LayoutOptions } from './types.js';
import type { TabRegistration } from './registry.js';
import { el, Scope } from './lifetime.js';
let sequence = 0;
/** Search remains focused while aria-activedescendant tracks keyboard selection. */
export function fillTabPicker(
  dialog: HTMLElement,
  scope: Scope,
  options: LayoutOptions,
  source: Pane | undefined,
  group: Group,
  choose: (pane: Pane) => void,
  report: (error: unknown) => void,
  persistent = false,
) {
  const doc = dialog.ownerDocument;
  const input = el(doc, 'input', 'layouts-picker-search');
  input.type = 'search';
  input.placeholder = 'Search tabs…';
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-label', 'Search tabs');
  input.setAttribute('aria-expanded', 'true');
  input.setAttribute('aria-autocomplete', 'list');
  const list = el(doc, 'div', 'layouts-picker-list');
  list.id = `layouts-picker-${++sequence}`;
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', 'Available tabs');
  input.setAttribute('aria-controls', list.id);
  const status = el(doc, 'div', 'layouts-picker-status');
  status.setAttribute('role', 'status');
  let matches: readonly TabRegistration[] = [],
    selected = 0;
  function select(entry: TabRegistration) {
    try {
      const pane = entry.create({ source, groupId: group.id });
      if (pane) {
        choose(pane);
        scope.dispose();
      }
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : String(error);
      report(error);
    }
  }
  function paint() {
    list.replaceChildren();
    matches.forEach((entry, index) => {
      const option = el(doc, 'div', 'layouts-picker-option');
      option.id = `${list.id}-${index}`;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(index === selected));
      option.setAttribute('aria-label', entry.title);
      if (entry.icon) {
        const icon = el(doc, 'span', 'layouts-tab-icon');
        icon.setAttribute('aria-hidden', 'true');
        try {
          const node = options.renderIcon?.(entry.icon, doc);
          if (node) icon.append(node);
        } catch (error) {
          report(error);
        }
        option.append(icon);
      }
      const text = el(doc, 'span', '');
      text.append(el(doc, 'strong', '', entry.title));
      if (entry.description) text.append(el(doc, 'small', '', entry.description));
      option.append(text);
      option.onmousedown = (e) => e.preventDefault();
      option.onclick = () => select(entry);
      list.append(option);
    });
    if (matches[selected]) {
      input.setAttribute('aria-activedescendant', `${list.id}-${selected}`);
      list.children[selected]?.scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
    status.textContent = matches.length ? `${matches.length} tab types` : 'No matching tabs';
  }
  function search() {
    const terms = input.value.toLocaleLowerCase().trim().split(/\s+/);
    matches = (options.tabs?.list() ?? []).filter((entry) => {
      const text = [entry.title, entry.description ?? '', ...(entry.keywords ?? [])]
        .join(' ')
        .toLocaleLowerCase();
      return terms.every((term) => text.includes(term));
    });
    selected = 0;
    paint();
  }
  input.oninput = search;
  input.onkeydown = (e) => {
    if (persistent && e.key === 'Escape') {
      e.preventDefault();
      input.blur();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (matches.length)
        selected = (selected + (e.key === 'ArrowDown' ? 1 : matches.length - 1)) % matches.length;
      paint();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const entry = matches[selected];
      if (entry) select(entry);
    }
  };
  const cancel = el(doc, 'button', 'layouts-button', 'Cancel');
  cancel.type = 'button';
  cancel.onclick = () => scope.dispose();
  dialog.replaceChildren(input, list, status, ...(persistent ? [] : [cancel]));
  dialog.setAttribute('aria-label', 'Choose a tab');
  if (options.tabs) scope.add(options.tabs.subscribe(search));
  search();
  input.focus();
}
