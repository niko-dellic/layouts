import { test, expect } from '@playwright/test';

for (const mode of ['disabled', 'protected'] as const) {
  test(`${mode}: the empty surface opens search from any point or keyboard`, async ({ page }) => {
    await page.goto('/tests/browser/harness.html');
    await page.evaluate((mode) => {
      const { store, tabs } = window.harness;
      store.close('a');
      store.setAutoCollapse(mode);
      tabs.register({
        id: 'new',
        title: 'New tab',
        create: () => ({ id: 'c', title: 'C', type: 'test' }),
      });
    }, mode);
    const group = page.locator('[data-node-id="left"]');
    const surface = group.locator('.layouts-empty');
    await expect(surface).toHaveText('');
    await expect(group.getByText('Empty region', { exact: true })).toHaveCount(0);
    await expect(surface.locator('path')).toHaveAttribute('d', 'M0 0 L100 100 M100 0 L0 100');
    await expect(surface.locator('path')).toHaveAttribute('vector-effect', 'non-scaling-stroke');
    const box = (await surface.boundingBox())!;
    await surface.click({ position: { x: box.width - 25, y: box.height - 25 } });
    const search = page.getByRole('combobox', { name: 'Search tabs' });
    await expect(search).toBeFocused();
    await search.fill('New');
    if (mode === 'protected') await search.fill('');
    await search.press('Escape');
    if (mode === 'disabled') {
      await surface.click({ position: { x: 25, y: 55 } });
      await expect(search).toHaveValue('New');
    } else {
      await expect(search).toHaveCount(0);
      await surface.focus();
      await surface.press('Enter');
    }
    await expect(search).toBeFocused();
    await search.press('Enter');
    await expect(group.getByRole('tab', { name: 'C', exact: true })).toBeVisible();
    await expect(surface).toHaveCount(0);
  });
}

test('a completely empty workspace can create content with no source pane', async ({ page }) => {
  await page.goto('/tests/browser/harness.html');
  await page.evaluate(() => {
    const { store, tabs } = window.harness;
    store.close('a');
    store.close('b');
    tabs.register({
      id: 'new',
      title: 'New tab',
      create: ({ source }) => {
        if (source !== undefined) throw Error('Expected no source');
        return { id: 'c', title: 'C', type: 'test' };
      },
    });
  });
  const group = page.locator('[data-node-id="left"]');
  await group.locator('.layouts-empty').focus();
  await group.locator('.layouts-empty').press('Space');
  await page.getByRole('option', { name: 'New tab', exact: true }).click();
  await expect(group.getByRole('tab', { name: 'C', exact: true })).toBeVisible();
});
