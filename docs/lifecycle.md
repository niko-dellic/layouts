# Pane and window lifecycle

## A single owner, multiple views

A pane registry maps `type` strings to synchronous mount functions:

```ts
(context: PaneContext) => {
  dispose(): void;
  resize?(width: number, height: number): void;
  update?(pane: Pane): void;
}
```

`context` contains `element`, `document`, `window`, `pane`, `state`, and `location` (`main` or `popout`). Use the supplied document/window for DOM creation, timers, event listeners, canvas contexts, portals, and computed styles. The element may initially be detached; use `resize` or ResizeObserver for measurements.

A successful renderer owns cleanup of its subscriptions, frames, observers, and application resources. If mounting throws before returning a view, the renderer must clean up resources it already allocated. Handle asynchronous data loading inside the view with a loading/error state; returning a Promise is not supported.

In the main document, stable pane IDs retain their view across resizing, tab activation, movement, and maximize/restore. Inactive tabs stay mounted and hidden. Changes to type or params remount that pane. Metadata changes call `update` when provided. Data changes should flow through application-owned subscriptions, not repeated layout JSON updates.

## Popout transaction

1. A user action calls `mounted.popout(id)` synchronously.
2. The browser opens a blank same-origin window. Blocking leaves the original pane untouched and emits an error.
3. The library copies head stylesheet elements and basic document theme attributes, then runs `prepareWindow`.
4. The destination view mounts against the same application-owned state. It briefly coexists with the old view; avoid exclusive singleton resources during mounting.
5. Only successful mounting commits the detached placement and disposes the old view. A failed mount closes the destination and preserves the original placement/view.
6. A Return action or detected window close restores the pane. The old group is preferred; if constraints no longer permit it, a compatible group or new region is used. Returning also exits maximize mode so the pane is discoverable.

Popouts contain one pane. They cannot form separate split/tab workspaces in v1. Use Return before moving a popped-out pane elsewhere.

Application-owned data must be updated continuously. An input value or React `useState` living only inside the old view will not survive remounting. Map engines should place document/history state outside the renderer and explicitly release graphics resources. A simulated job belongs to the application's job owner, not a pane's lifetime.

## Browser behavior

Window opening requires a user gesture. Requested size/position can be adjusted by the browser and OS; some environments may open a tab. Placement JSON stores requested geometry, not continuous tracking of OS window movement. Access to multiple monitors is not requested.

Loading JSON never attempts unsolicited window creation. Detached records without live window handles dock into the main layout and expose Reopen window. Applications may persist the returned normalized layout.

The main window owns the session. Explicit disposal closes companions, releases mounts, and marks accessible orphan documents disconnected. Page departure attempts the same teardown. Close polling supplements `pagehide` detection. Browser crashes, mobile termination, or lost processes do not guarantee unload callbacks; this library is not a durable state store.

The default companion starts at `about:blank` and inherits the opener origin. A custom window factory must return a same-origin document synchronously. Cross-origin navigation is unsupported and triggers return/cleanup when access is lost. Do not request `noopener`: this architecture intentionally requires an opener-owned session.

## Styles and React providers

Linked styles and inline style elements are copied into companions and refreshed when the source head changes. Document/body class, style, and data attributes are synchronized. Ancestor-specific selectors, shadow-root styles, adopted stylesheets, assets initialized by scripts, and provider context need explicit application integration through `prepareWindow` or pane wrappers.

React panes are separate roots. Wrap pane components in required providers; they do not inherit the outer application root's contexts. The React binding delays initial mounting beyond the parent commit so pane roots can be mounted transactionally. Keep registry and callback identities stable; changing those options rebuilds the mounted workspace.

The host owns unsaved-work confirmation. For a pane with work that cannot yet be closed safely, set `close: false`; use explicit host actions after your own review/save flow. Closing a popout returns the pane rather than discarding its application data.

## Corner gestures and pending content

Corner dragging previews the new region using the same constraint allocation as the renderer. The dominant drag axis chooses split orientation. A gesture into an immediate sibling outlines both regions and labels the receiver; joining retains both regions' content as tabs. Escape and pointer cancellation remove the preview without changing state.

Releasing a split creates an empty group before opening a centered registry chooser. Choosing content adds it to that stable group ID. With the default `autoCollapse: "disabled"`, the chooser stays open within the new region when focus moves elsewhere or Escape is pressed. Multiple pending regions can coexist; select content later or use the empty tab bar’s “Close empty pane” button. With `"enabled"` or `"protected"`, cancelling removes only the still-empty new group, preserving unrelated edits. Empty groups are valid JSON and provide a chooser if restored after a reload. Applications can use `store.split(groupId, axis, null, options)` and `store.removeEmptyGroup(groupId)` for the same workflow; filled groups are never removed by the latter.

## Automatic collapse

Configure the core store with `new LayoutStore(layout, { autoCollapse: 'disabled' })`.
`AutoCollapse` accepts `'enabled' | 'protected' | 'disabled'`; omitted means `'disabled'`.
Read or change it with `store.getAutoCollapse()` and `store.setAutoCollapse(mode)`.
This is a workspace-wide session setting shared by DOM and React. It is not exported in
layout JSON and survives `load` and `reset`. The demo Settings pane includes a live selector.

- `enabled`: closing, moving, or popping out the last tab removes its empty source region.
- `protected`: closing or moving the last tab removes the region; popping it out preserves it.
- `disabled`: all three operations preserve the empty region, its ID, and its placement.

Only the region emptied by an action is eligible for automatic removal. Switching modes
never prunes existing empty regions. To retain the previous automatic behavior, opt into
`enabled`. Empty tab bars provide “Close empty pane”; the final root cannot be removed.
Removing a region never deletes its detached content. Returning popouts prefer the preserved
original region, or use the existing fallback placement if it was explicitly removed.
