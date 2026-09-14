import { test, expect } from '@playwright/test';

for (const framework of ['vanilla', 'react']) {
  test(`${framework}: canvas orbits, zooms, cancels, resets, and retains its camera across windows`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/${framework}.html`);
    const canvas = page.locator('.scene-canvas');
    await expect(canvas).toBeVisible();
    const snapshot = () =>
      canvas.evaluate((element: HTMLCanvasElement) => {
        const pixels = element
          .getContext('2d')!
          .getImageData(0, 0, element.width, element.height).data;
        let hash = 2166136261;
        for (const value of pixels) hash = Math.imul(hash ^ value, 16777619);
        return hash >>> 0;
      });
    const cameraState = () =>
      page.evaluate(async () => {
        const url = '/demos/model.ts';
        const { cameraFor } = await import(url);
        return { ...cameraFor('canvas') };
      });
    // Wait for the first nonempty frame.
    await expect
      .poll(() => canvas.evaluate((element: HTMLCanvasElement) => element.width))
      .toBeGreaterThan(300);
    const initial = await snapshot();
    const initialCamera = await cameraState();
    const box = (await canvas.boundingBox())!;
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 190, y + 25, { steps: 12 });
    await page.mouse.up();
    await expect.poll(snapshot).not.toBe(initial);
    const orbited = await snapshot();
    await page.mouse.wheel(0, -150);
    await expect.poll(snapshot).not.toBe(orbited);
    const zoomed = await snapshot();
    await page.mouse.down();
    await page.mouse.move(x, y - 40, { steps: 5 });
    await expect.poll(snapshot).not.toBe(zoomed);
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expect.poll(snapshot).toBe(zoomed);
    const retainedCamera = await cameraState();
    await page.getByRole('button', { name: 'Scene actions', exact: true }).click();
    const popupEvent = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'Open in window', exact: true }).click();
    const popup = await popupEvent;
    await expect(popup.locator('.scene-canvas')).toBeVisible();
    await popup.close();
    await expect(canvas).toBeVisible();
    await expect.poll(cameraState).toEqual(retainedCamera);
    await canvas.dblclick();
    await expect.poll(cameraState).toEqual(initialCamera);
    expect(errors).toEqual([]);
  });
}
