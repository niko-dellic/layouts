import { chromium } from '@playwright/test';
const baseURL = process.env.DEMO_URL ?? 'http://localhost:5298';
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
  const drag = async (id, dx, dy) => {
    const divider = page.locator(`[data-node-id="${id}"] > .layouts-divider`);
    const box = await divider.boundingBox();
    if (!box) throw new Error(`Missing divider ${id}`);
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y + dy, { steps: 16 });
    await page.mouse.up();
    await page.mouse.move(15, 15);
  };
  await drag('inspector-split', -145, 0);
  await drag('timeline-split', 0, -110);
  await page.screenshot({ path: 'docs/media/workspace-resized.png' });
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
  console.log('Captured four screenshots.');
} finally {
  await browser?.close();
}
