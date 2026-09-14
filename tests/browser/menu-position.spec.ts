import { expect, test, type Locator } from '@playwright/test';

async function expectOnScreen(element: Locator) {
  await expect(element).toBeVisible();
  await expect
    .poll(async () =>
      element.evaluate((node) => {
        const bounds = node.getBoundingClientRect();
        return (
          bounds.left >= 7 &&
          bounds.top >= 7 &&
          bounds.right <= document.documentElement.clientWidth - 7 &&
          bounds.bottom <= document.documentElement.clientHeight - 7
        );
      }),
    )
    .toBe(true);
  // Bounds alone do not catch a flyout clipped by its scrolling parent.
  expect(
    await element.evaluate((node) => {
      const bounds = node.getBoundingClientRect();
      return node.contains(
        document.elementFromPoint(bounds.left + bounds.width / 2, bounds.bottom - 5),
      );
    }),
  ).toBe(true);
}

for (const edge of ['left', 'right'] as const) {
  test(`menus and flyouts stay visible at the bottom ${edge} and after viewport resize`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await page.goto('/tests/browser/harness.html');
    await page.addStyleTag({
      content: `#host { position: fixed; bottom: 0; ${edge}: 0; width: 300px !important; height: 120px !important; }`,
    });
    await page.getByRole('button', { name: 'B actions', exact: true }).click();
    const dialog = page.locator('dialog.layouts-menu');
    await expectOnScreen(dialog);
    const trigger = page.getByRole('button', { name: 'Tab display', exact: true });
    await trigger.hover();
    const flyout = page.getByRole('menu', { name: 'Tab display', exact: true });
    await expectOnScreen(flyout);
    await flyout.getByRole('menuitemradio', { name: 'Compact', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('[data-node-id="right"]')).toHaveAttribute(
      'data-tab-display',
      'compact',
    );

    await page.getByRole('button', { name: 'B actions', exact: true }).click();
    await page.setViewportSize({ width: 240, height: 180 });
    await expectOnScreen(dialog);
    expect(await dialog.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
    await trigger.focus();
    await page.keyboard.press('ArrowRight');
    await expectOnScreen(flyout);
    await expect(
      flyout.getByRole('menuitemradio', { name: 'Workspace default', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(flyout).toBeHidden();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await page.setViewportSize({ width: 800, height: 600 });
    expect(await page.evaluate(() => window.harness.stats.errors)).toEqual([]);
  });
}
