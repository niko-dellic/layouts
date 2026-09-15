# Quilt Electron starter

A small source project using Quilt 0.2.0 and Electron. This download contains
source code, not a prebuilt desktop installer.

## Run

Install Node.js 24, unzip the download, then open a terminal in this folder:

```sh
npm install
npm start
```

The first command installs Quilt and Electron from npm. The second checks
TypeScript, builds the interface, and opens a native Electron window.

Edit the note, pop it out, and close the companion to return it. Try switching
the theme, saving and loading workspace JSON, and the optional close confirmation.
Note text remains application-owned; it is not part of workspace JSON.

## Files

- `main.cjs`: Electron host and companion window policy.
- `main.ts`: Quilt setup, note renderer, and workspace actions.
- `style.css`: Application styles and custom theme variable.

Run `npm run dev` for browser development or `npm start` for desktop behavior.
The starter targets the same DOM renderer as the browser packages.

Source and documentation: https://github.com/niko-dellic/quilt
