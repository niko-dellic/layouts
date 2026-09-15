import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { chromium, _electron, expect } from '@playwright/test';
import { preview } from 'vite';
import electronPath from 'electron';

const root = resolve('.');
const manifest = JSON.parse(readFileSync('artifacts/packages/manifest.json', 'utf8'));
const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const temp = mkdtempSync(join(tmpdir(), 'quilt-starters-'));
const run = (command, args, cwd) => execFileSync(command, args, { cwd, stdio: 'inherit' });
async function exercise(page, openCompanion) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const note = page.getByRole('textbox', { name: 'Note text' });
  await expect(note).toBeVisible();
  await note.fill('Application data survives');
  await page.getByRole('button', { name: 'Save workspace', exact: true }).click();
  const json = page.getByRole('textbox', { name: 'Workspace JSON' });
  const preset = JSON.parse(await json.inputValue());
  expect(preset.version).toBe(1);
  expect(preset.theme.accent).toBe('var(--app-accent)');
  await page.getByRole('button', { name: 'Close note', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(note).toHaveValue('Application data survives');
  const popup = await openCompanion();
  await expect(popup.getByRole('textbox', { name: 'Note text' })).toHaveValue(
    'Application data survives',
  );
  await page.getByRole('button', { name: 'Switch theme', exact: true }).click();
  await expect
    .poll(() =>
      popup
        .locator('.layouts')
        .evaluate((el) => getComputedStyle(el).getPropertyValue('--app-accent').trim()),
    )
    .toBe('#b44b18');
  await page.getByRole('button', { name: 'Save workspace', exact: true }).click();
  expect(JSON.parse(await json.inputValue()).layout.popouts).toEqual([]);
  expect(popup.isClosed()).toBe(false);
  // Invalid JSON preserves the live companion and current workspace.
  await json.fill('{"version":999}');
  await page.getByRole('button', { name: 'Load workspace', exact: true }).click();
  expect(popup.isClosed()).toBe(false);
  await popup.close();
  await expect(note).toHaveValue('Application data survives');
  await json.fill(JSON.stringify(preset));
  await page.getByRole('button', { name: 'Load workspace', exact: true }).click();
  await expect(note).toHaveValue('Application data survives');
  const second = await openCompanion();
  await page.getByRole('button', { name: 'Dispose', exact: true }).click();
  await expect.poll(() => second.isClosed()).toBe(true);
  await expect(page.locator('.layouts')).toHaveCount(0);
  expect(errors).toEqual([]);
}
try {
  for (const name of ['vanilla', 'react', 'electron']) {
    const dir = join(temp, name);
    cpSync(join(root, 'examples', name), dir, {
      recursive: true,
      filter: (path) => !path.includes('/node_modules') && !path.includes('/dist'),
    });
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    for (const archive of manifest.packages) {
      expect(archive.version).toBe(version);
      if (pkg.dependencies[archive.name]) {
        expect(pkg.dependencies[archive.name]).toBe(version);
        pkg.dependencies[archive.name] = 'file:' + join(root, 'artifacts/packages', archive.file);
      }
    }
    writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg));
    run('npm', ['install', '--include=dev', '--ignore-scripts', '--no-audit', '--no-fund'], dir);
    run('npm', ['run', 'build'], dir);
    let browser, desktop, server;
    try {
      if (name === 'electron') {
        desktop = await _electron.launch({
          executablePath: electronPath,
          args: [join(dir, 'main.cjs')],
        });
        const page = await desktop.firstWindow();
        await exercise(page, async () => {
          const opened = desktop.waitForEvent('window');
          await page.getByRole('button', { name: 'Pop out note', exact: true }).click();
          return opened;
        });
        expect(
          await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length),
        ).toBe(1);
        // Host closure must also tear down companions, independent of renderer disposal.
        await page.reload();
        const opened = desktop.waitForEvent('window');
        await page.getByRole('button', { name: 'Pop out note', exact: true }).click();
        const companion = await opened;
        await expect(companion.getByRole('textbox', { name: 'Note text' })).toBeVisible();
        await page.close();
        await expect.poll(() => companion.isClosed()).toBe(true);
      } else {
        server = await preview({
          root: dir,
          configFile: false,
          preview: { host: '127.0.0.1', port: 0 },
        });
        browser = await chromium.launch();
        const page = await browser.newPage();
        await page.goto(server.resolvedUrls.local[0]);
        await exercise(page, async () => {
          const opened = page.waitForEvent('popup');
          await page.getByRole('button', { name: 'Pop out note', exact: true }).click();
          return opened;
        });
      }
      console.log(
        `Packed ${name} starter: build, theme, JSON, confirmation, popout/return and cleanup passed.`,
      );
    } finally {
      await desktop?.close();
      await browser?.close();
      if (server)
        await new Promise((yes, no) =>
          server.httpServer.close((error) => (error ? no(error) : yes())),
        );
    }
  }
} finally {
  if (process.env.QUILT_KEEP_TEST_TEMP) console.log('Retained starter copies:', temp);
  else rmSync(temp, { recursive: true, force: true });
}
