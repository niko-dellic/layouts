# Host compatibility

Quilt core contains no browser APIs. The vanilla renderer needs a live browser
document; React uses the same renderer. Desktop support does not add a runtime
dependency to either published package.

| Configuration                              | Status                                           | Scope                                                                                         |
| ------------------------------------------ | ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Chromium, Firefox, WebKit                  | Tested by browser suite                          | Docking, themes, JSON, interactions, same-origin companion lifecycle                          |
| React 18.3 and 19                          | Tested with packed packages                      | Public imports, provider context, mount/popout/return/disposal                                |
| TypeScript 5.9 and 7                       | Tested with packed declarations                  | NodeNext and Bundler, strict and exact optional properties                                    |
| Electron 44.3.0 on macOS                   | Tested locally (macOS arm64)                     | Packed starter: docking, themes, JSON, confirmation, popout/return, disposal and host closure |
| Electron on Linux / Windows                | Expected; not yet locally verified               | Linux CI is configured with Xvfb; Windows coverage remains future work                        |
| Tauri docked webview                       | Expected; unverified                             | Ordinary DOM layout with `popouts: false`                                                     |
| Tauri native popouts                       | Unsupported by current window API                | Requires an asynchronous, message-based host adapter                                          |
| Vue / other DOM frameworks                 | Vanilla integration expected; unverified         | No dedicated binding; application supplies mount/update/dispose                               |
| Cross-origin or independent native windows | Unsupported                                      | Current companions require synchronous same-origin DOM access                                 |
| SSR                                        | Core supported; renderer requires a client mount | No claim of server-rendered Quilt chrome                                                      |

## Electron reference host

[The starter](../examples/electron) uses `BrowserWindow` with
`contextIsolation: true`, `sandbox: true`, and `nodeIntegration: false`.
Only Quilt's `about:blank` child windows are allowed; child navigation and further
child creation are denied. No preload or Node access is needed by pane content.

Electron supports same-origin `window.open` children through a native window and
DOM Window pair. This fits Quilt's current session-owned companions.
See [Electron's window-opening documentation](https://www.electronjs.org/docs/latest/api/window-open).

Run `npm run pack:all && npm run test:examples` to build temporary consumers and
test docked content, popout/return, theme propagation, workspace JSON, optional
confirmation, disposal, and host-window closure. On Linux use
`xvfb-run -a npm run test:examples` after installing Electron's system dependencies
and Playwright Chromium. Do not infer Windows or all Linux distribution support
from a macOS result.

Popouts remain temporary session views on every host. This example does not
restore native windows on launch, implement IPC data synchronization, or package
an executable installer. A future Tauri adapter should reuse the core and DOM
renderer while handling readiness, messaging, and lifecycle in a host-specific layer.
