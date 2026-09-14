import { test, expect } from '@playwright/test';
for (const demo of ['vanilla', 'react']) {
  test(`${demo}: corner handle styles and visibility update live`, async ({ page }) => {
    await page.goto(`/${demo}.html`);
    const section = page.getByRole('region', { name: 'Corner handles', exact: true });
    const handle = page.locator('[data-node-id="scene-group"] > .layouts-corner[data-corner="tl"]');
    const pseudo = () =>
      handle.evaluate((el) => {
        const css = getComputedStyle(el, '::after');
        return {
          opacity: css.opacity,
          radius: css.borderTopLeftRadius,
          stroke: css.borderTopWidth,
          fill: css.backgroundColor,
        };
      });
    await section.getByRole('slider', { name: 'Handle size', exact: true }).fill('20');
    await section.getByRole('slider', { name: 'Handle inset', exact: true }).fill('6');
    await expect(handle).toHaveCSS('width', '20px');
    await expect(handle).toHaveCSS('top', '6px');
    await expect(handle).toHaveCSS('left', '6px');
    for (const shape of ['bracket', 'rounded', 'square', 'dot']) {
      await section.getByRole('combobox', { name: 'Handle style' }).selectOption(shape);
      const css = await pseudo();
      expect(css.stroke).toBe(shape === 'dot' ? '0px' : '2px');
      if (shape === 'rounded' || shape === 'dot') expect(css.radius).toBe('50%');
    }
    await section.getByRole('combobox', { name: 'Visibility', exact: true }).selectOption('hidden');
    await expect(handle).toBeHidden();
    await section.getByRole('combobox', { name: 'Visibility', exact: true }).selectOption('hover');
    expect((await pseudo()).opacity).toBe('0');
    await handle.hover();
    expect((await pseudo()).opacity).toBe('1');
    await section.getByRole('combobox', { name: 'Visibility', exact: true }).selectOption('always');
    await section.getByRole('slider', { name: 'Idle opacity' }).fill('70');
    await section.locator('summary').hover();
    expect((await pseudo()).opacity).toBe('0.7');
    await expect(handle).toBeVisible();
  });
}
