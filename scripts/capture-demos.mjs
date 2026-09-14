import { chromium } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
const baseURL = process.env.DEMO_URL ?? 'http://localhost:5298';
const frames = mkdtempSync(join(tmpdir(), 'quilt-resize-'));
let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 820 },
    deviceScaleFactor: 1,
  });
  page.setDefaultTimeout(10000);
  await page.goto(`${baseURL}/vanilla.html`);
  await page.getByRole('tab', { name: 'Objects', exact: true }).click();
  await page.getByLabel('Workspace theme').selectOption('neutral-dark');
  await page.mouse.move(15, 15);
  await page.screenshot({ path: 'docs/media/workspace-dark.png' });
  let frame = 0;
  const capture = () =>
    page.screenshot({ path: join(frames, `${String(frame++).padStart(3, '0')}.png`) });
  const hold = async () => {
    for (let i = 0; i < 7; i++) await capture();
  };
  const drag = async (id, dx, dy) => {
    const divider = page.locator(`[data-node-id="${id}"] > .layouts-divider`);
    const box = await divider.boundingBox();
    if (!box) throw new Error(`Missing divider ${id}`);
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 16; i++) {
      const progress = (1 - Math.cos((Math.PI * i) / 16)) / 2;
      await page.mouse.move(x + dx * progress, y + dy * progress);
      await capture();
    }
    await page.mouse.up();
    await page.mouse.move(15, 15);
  };
  await hold();
  await drag('inspector-split', -145, 0);
  await hold();
  await drag('timeline-split', 0, -110);
  await hold();
  await page.screenshot({ path: 'docs/media/workspace-resized.png' });
  await drag('timeline-split', 0, 110);
  await drag('inspector-split', 145, 0);
  await hold();
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-framerate',
      '12',
      '-i',
      join(frames, '%03d.png'),
      '-filter_complex',
      'fps=10,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=none',
      '-loop',
      '0',
      'docs/media/resizing.gif',
    ],
    { stdio: 'pipe' },
  );
  await page.getByRole('button', { name: 'Focus', exact: true }).click();
  await page.getByLabel('Workspace theme').selectOption('neutral-light');
  await page.getByLabel('Tab orientation').selectOption('left');
  await page.getByLabel('Tab display').selectOption('compact');
  await page.getByLabel('Corner type').selectOption('capsule');
  await page.mouse.move(15, 15);
  await page.screenshot({ path: 'docs/media/focus-light.png' });
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  await page.getByLabel('Workspace theme').selectOption('sage');
  await page.getByLabel('Tab orientation').selectOption('top');
  await page.getByLabel('Tab display').selectOption('automatic');
  await page.getByLabel('Tab placement').selectOption('anchored');
  await page.getByLabel('Taper options').selectOption('angle');
  await page.mouse.move(15, 15);
  await page.screenshot({ path: 'docs/media/review-sage.png' });
  console.log('Captured four screenshots and the resizing GIF.');
} finally {
  await browser?.close();
  rmSync(frames, { recursive: true, force: true });
}
