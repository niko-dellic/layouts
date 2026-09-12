import { test, expect } from '@playwright/test';
for (const framework of ['vanilla', 'react']) {
  test.describe(framework, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/${framework}.html`);
      await expect(page.getByRole('tab', { name: 'Scene', exact: true })).toBeVisible();
    });
    test('preserves form state through tabs, resize, JSON reload, and maximize', async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page
        .getByRole('textbox', { name: 'Working notes' })
        .fill('Persistent application state');
      await page.getByRole('tab', { name: 'Activity', exact: true }).click();
      await expect(page.getByText('1 state changes')).toBeVisible();
      await page.getByRole('tab', { name: 'Inspector', exact: true }).click();
      await expect(page.getByRole('textbox', { name: 'Working notes' })).toHaveValue(
        'Persistent application state',
      );
      const divider = page.locator('[data-node-id="inspector-split"] > [role="separator"]');
      const before = await page.locator('[data-node-id="scene-group"]').boundingBox();
      await divider.focus();
      await page.keyboard.press('ArrowLeft');
      const after = await page.locator('[data-node-id="scene-group"]').boundingBox();
      expect(after!.width).toBeLessThan(before!.width);
      await page.getByRole('button', { name: 'Scene actions', exact: true }).click();
      await page.getByRole('button', { name: 'Maximize region', exact: true }).click();
      await expect(page.getByRole('tab', { name: 'Inspector', exact: true })).not.toBeVisible();
      await page.getByRole('button', { name: 'Scene actions', exact: true }).click();
      await page.getByRole('button', { name: 'Restore region', exact: true }).click();
      await expect(page.getByRole('textbox', { name: 'Working notes' })).toHaveValue(
        'Persistent application state',
      );
      await page.getByRole('button', { name: 'Layout JSON', exact: true }).click();
      await page.getByRole('button', { name: 'Load layout', exact: true }).click();
      await expect(page.getByRole('textbox', { name: 'Working notes' })).toHaveValue(
        'Persistent application state',
      );
      expect(errors).toEqual([]);
    });
    test('real popout remounts data and returns it on close', async ({ page }) => {
      await page.getByRole('textbox', { name: 'Working notes' }).fill('Before popout');
      const opened = page.waitForEvent('popup');
      await page.getByRole('button', { name: 'Pop out inspector' }).click();
      const popup = await opened;
      await expect(popup.getByRole('textbox', { name: 'Working notes' })).toHaveValue(
        'Before popout',
      );
      await popup.getByRole('textbox', { name: 'Working notes' }).fill('Edited in another window');
      await expect(page.getByRole('tab', { name: 'Inspector', exact: true })).toHaveCount(0);
      await popup.close();
      await expect(page.getByRole('textbox', { name: 'Working notes' })).toHaveValue(
        'Edited in another window',
      );
    });
    test('split, move, join, and capability restrictions', async ({ page }) => {
      const fixed = page.locator('[data-node-id="top"] > [role="separator"]');
      await expect(fixed).toHaveAttribute('aria-disabled', 'true');
      await page.getByRole('button', { name: 'Scene actions', exact: true }).click();
      await page.getByRole('button', { name: 'Split below', exact: true }).click();
      await expect(page.getByRole('tab', { name: 'Notes', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Notes actions', exact: true }).click();
      await page.getByRole('button', { name: 'Join sibling region', exact: true }).click();
      await expect(page.getByRole('tab', { name: 'Scene', exact: true })).toBeVisible();
      await page
        .getByRole('tab', { name: 'Notes', exact: true })
        .dragTo(page.getByRole('tab', { name: 'Inspector', exact: true }));
      const target = page.locator('[data-node-id="inspector-group"]');
      await expect(target.getByRole('tab', { name: 'Notes', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Notes actions', exact: true }).click();
      await page.getByRole('button', { name: 'Close pane', exact: true }).click();
      await expect(page.getByRole('tab', { name: 'Notes', exact: true })).toHaveCount(0);
    });
    test('invalid JSON is rejected without destroying the workspace', async ({ page }) => {
      await page.getByRole('button', { name: 'Layout JSON', exact: true }).click();
      await page.getByRole('textbox', { name: 'Layout JSON', exact: true }).fill('{"version":42}');
      await page.getByRole('button', { name: 'Load layout', exact: true }).click();
      await expect(page.locator('#json-error')).not.toBeEmpty();
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(page.getByRole('tab', { name: 'Scene', exact: true })).toBeVisible();
    });
  });
}

test('native tab dragging creates an edge split', async ({ page }) => {
  await page.goto('/vanilla.html');
  const tab = page.getByRole('tab', { name: 'Inspector', exact: true });
  const scene = page.locator('[data-node-id="scene-group"]');
  const box = await scene.boundingBox();
  await tab.dragTo(scene, { targetPosition: { x: box!.width - 10, y: box!.height / 2 } });
  await expect(
    page
      .locator('[data-node-id="inspector-group"]')
      .getByRole('tab', { name: 'Inspector', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Working notes' })).toBeVisible();
});
