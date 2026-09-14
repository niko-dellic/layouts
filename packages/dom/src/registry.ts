import type { Pane } from 'quilt-core';
export interface TabRegistration {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  keywords?: readonly string[];
  /** Source is undefined when creating content in a completely empty workspace.
   * Return a fresh pane with a unique id; undefined cancels creation. */
  create: (context: { source: Pane | undefined; groupId: string }) => Pane | undefined;
}
/** Available content types, independent of open pane instances and layout JSON. */
export class TabRegistry {
  private entries = new Map<string, TabRegistration>();
  private listeners = new Set<() => void>();
  constructor(entries: readonly TabRegistration[] = []) {
    for (const entry of entries) this.register(entry);
  }
  list(): readonly TabRegistration[] {
    return [...this.entries.values()];
  }
  register(entry: TabRegistration): () => void {
    if (!entry.id || this.entries.has(entry.id))
      throw new Error(`Duplicate or empty tab registration: ${entry.id}`);
    const stored = Object.freeze({
      ...entry,
      ...(entry.keywords ? { keywords: Object.freeze([...entry.keywords]) } : {}),
    });
    this.entries.set(entry.id, stored);
    this.emit();
    return () => {
      if (this.entries.get(entry.id) !== stored) return;
      this.entries.delete(entry.id);
      this.emit();
    };
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private emit() {
    for (const listener of this.listeners) listener();
  }
}
