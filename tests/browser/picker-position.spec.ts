import { test, expect } from '@playwright/test';

for (const framework of ['vanilla', 'react']) {
  for (const entry of ['hotkey', 'menu']) {
    test(`${framework}: ${entry} add-tab picker stays centered in its pane`, async ({ page }) => {
      await page.goto(`/${framework}.html`);
      const region = page.locator('[data-node-id="scene-group"]');
      if (entry === 'hotkey') {
        await region.getByRole('tab', { name: 'Scene', exact: true }).hover();
        await page.keyboard.press('t');
      } else {
        await region.getByRole('button', { name: 'Scene actions', exact: true }).click();
        await page.getByRole('button', { name: '+ Add tab', exact: true }).click();
      }
      const picker = page.locator('dialog.layouts-picker');
      await expect(page.getByRole('combobox', { name: 'Search tabs' })).toBeFocused();
      const check = async () => {
        await expect
          .poll(async () => {
            const pane = (await region.boundingBox())!;
            const box = (await picker.boundingBox())!;
            return Math.max(
              Math.abs(box.x + box.width / 2 - pane.x - pane.width / 2),
              Math.abs(box.y + box.height / 2 - pane.y - pane.height / 2),
            );
          })
          .toBeLessThan(1);
      };
      await check();
      await page.getByRole('combobox', { name: 'Search tabs' }).fill('viewport');
      await check();
      await page.setViewportSize({ width: 1100, height: 800 });
      await check();
      await picker.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(picker).toHaveCount(0);
    });
  }
}
