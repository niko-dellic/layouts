export class Scope {
  private tasks: (() => void)[] = [];
  private ended = false;
  add(cleanup: () => void) {
    if (this.ended) cleanup();
    else this.tasks.push(cleanup);
  }
  listen(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions,
  ) {
    target.addEventListener(type, listener, options);
    this.add(() => target.removeEventListener(type, listener, options));
  }
  dispose() {
    if (this.ended) return;
    this.ended = true;
    for (const task of this.tasks.splice(0).reverse()) {
      try {
        task();
      } catch {
        /* Complete the remaining cleanup even if a consumer fails. */
      }
    }
  }
}
export function syncChildren(parent: HTMLElement, children: HTMLElement[]) {
  children.forEach((child, i) => {
    if (parent.children[i] !== child) parent.insertBefore(child, parent.children[i] ?? null);
  });
  for (const child of Array.from(parent.children))
    if (!children.includes(child as HTMLElement)) child.remove();
}
export function el<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = doc.createElement(tag);
  node.className = className;
  node.dataset.layoutsChrome = '';
  if (text !== undefined) node.textContent = text;
  return node;
}
