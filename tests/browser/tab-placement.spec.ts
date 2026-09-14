import { test, expect } from '@playwright/test';
for (const framework of ['vanilla', 'react']) {
  test(`${framework}: per-region orientation survives JSON loading`, async ({ page }) => {
    await page.goto(`/${framework}.html`);
    const scene = page.locator('[data-node-id="scene-group"]');
    const tools = page.locator('[data-node-id="tools-group"]');
    await scene.getByRole('button', { name: 'Scene actions', exact: true }).click();
    await page.getByRole('combobox', { name: 'Tab orientation', exact: true }).selectOption('left');
    await expect(scene).toHaveAttribute('data-tab-placement', 'left');
    await expect(tools).toHaveAttribute('data-tab-placement', 'top');
    await page.getByRole('button', { name: 'Layout JSON', exact: true }).click();
    const json = page.getByRole('textbox', { name: 'Layout JSON', exact: true });
    const saved = await json.inputValue();
    expect(saved).toContain('"tabPlacement": "left"');
    await page.locator('#json-load').click();
    await expect(scene).toHaveAttribute('data-tab-placement', 'left');
    await scene.getByRole('button', { name: 'Scene actions', exact: true }).click();
    await page.getByRole('combobox', { name: 'Tab orientation', exact: true }).selectOption('top');
    await expect(scene).toHaveAttribute('data-tab-placement', 'top');
    await page.getByRole('button', { name: 'Layout JSON', exact: true }).click();
    await json.fill(saved);
    await page.locator('#json-load').click();
    await expect(scene).toHaveAttribute('data-tab-placement', 'left');
  });
}
