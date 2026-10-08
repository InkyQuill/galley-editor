import { expect, test, type Page } from '@playwright/test';

async function replaceDocument(page: Page, text: string) {
  await page.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText(text);
}

async function expectDocument(page: Page, text: string) {
  await expect.poll(() => page.locator('pre code').last().textContent()).toBe(text);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('mouse toggles tasks repeatedly without revealing the marker', async ({ page }) => {
  await replaceDocument(page, 'intro\n\n- [ ] task\n- [x] done');
  const task = page.getByRole('checkbox', { name: 'task', exact: true });
  await task.click();
  await expectDocument(page, 'intro\n\n- [x] task\n- [x] done');
  await expect(task).toBeVisible();
  await task.click();
  await expectDocument(page, 'intro\n\n- [ ] task\n- [x] done');
  await expect(task).toBeVisible();
});

for (const text of ['тест тест т', 'тест  тест т', 'test test t', '**тест** тест т']) {
  test(`backspace preserves preceding spaces: ${text}`, async ({ page }) => {
    await replaceDocument(page, text);
    await page.keyboard.press('Backspace');
    await expectDocument(page, text.slice(0, -1));
    await page.keyboard.insertText('t');
    await expectDocument(page, text.slice(0, -1) + 't');
  });
}

test('backspace deletes an emoji without leaving a broken surrogate', async ({ page }) => {
  await replaceDocument(page, 'test 😀');
  await page.keyboard.press('Backspace');
  await expectDocument(page, 'test ');
});

for (const setting of ['read-only', 'preview'] as const) {
  test(`${setting} tasks cannot change the document`, async ({ page }) => {
    await page.getByRole('button', { name: 'Tasks fixture', exact: true }).click();
    if (setting === 'preview') await page.getByLabel('Mode', { exact: true }).selectOption('preview');
    else await page.getByLabel('Editable', { exact: true }).uncheck();
    const task = page.getByRole('checkbox', { name: 'task', exact: true });
    await expect(task).toBeDisabled();
    await expectDocument(page, 'intro\n\n- [ ] task\n- [x] done\n- [X] uppercase');
  });
}

test('custom checkbox classes support mouse and keyboard activation', async ({ page }) => {
  await page.getByRole('button', { name: 'Tasks fixture', exact: true }).click();
  await page.getByLabel('Multiple checkbox classes').check();
  const task = page.getByRole('checkbox', { name: 'task', exact: true });
  await task.click();
  await expect(task).toBeChecked();
  await task.focus();
  await page.keyboard.press('Space');
  await expect(task).not.toBeChecked();
  await expectDocument(page, 'intro\n\n- [ ] task\n- [x] done\n- [X] uppercase');
});

for (const [initial, continued] of [['- one', '- one\n- '], ['1. one', '1. one\n2. '], ['- [x] one', '- [x] one\n- [ ] ']]) {
  test(`Enter continues and exits ${initial}`, async ({ page }) => {
    await replaceDocument(page, initial);
    await page.keyboard.press('Enter');
    await expectDocument(page, continued);
    await page.keyboard.press('Enter');
    await expectDocument(page, initial + '\n');
  });
}

test('Tab indents and Shift-Tab outdents a list item', async ({ page }) => {
  await replaceDocument(page, '- first\n- second');
  await page.keyboard.press('Tab');
  await expectDocument(page, '- first\n  - second');
  await page.keyboard.press('Shift+Tab');
  await expectDocument(page, '- first\n- second');
});

test('selection formatting, undo and redo preserve content', async ({ page }) => {
  await replaceDocument(page, 'тест тест');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('ControlOrMeta+b');
  await expectDocument(page, '**тест тест**');
  await page.keyboard.press('ControlOrMeta+z');
  await expectDocument(page, 'тест тест');
  await page.keyboard.press('ControlOrMeta+Shift+Z');
  await expectDocument(page, '**тест тест**');
});

test('mode changes preserve trailing spaces and text', async ({ page }) => {
  await replaceDocument(page, 'тест  тест  ');
  for (const mode of ['markdown', 'preview', 'live']) {
    await page.getByLabel('Mode', { exact: true }).selectOption(mode);
    await expectDocument(page, 'тест  тест  ');
  }
});

test('deleting before an internal space preserves the space', async ({ page }) => {
  await replaceDocument(page, 'тест тест т');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Backspace');
  await page.keyboard.insertText('t');
  await expectDocument(page, 'тест тесt т');
});

test('Delete and Shift-Enter preserve surrounding text', async ({ page }) => {
  await replaceDocument(page, 'one two');
  await page.keyboard.press('Home');
  await page.keyboard.press('Delete');
  await expectDocument(page, 'ne two');
  await page.keyboard.press('End');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.insertText('three');
  await expectDocument(page, 'ne two\nthree');
});

for (const mode of ['live', 'preview']) {
  test(`read-only keyboard cannot mutate ${mode} content`, async ({ page }) => {
    await replaceDocument(page, 'keep this');
    await page.getByLabel('Mode', { exact: true }).selectOption(mode);
    await page.getByLabel('Editable', { exact: true }).uncheck();
    await page.locator('.cm-content').focus();
    for (const key of ['Backspace', 'Enter', 'Shift+Enter', 'Tab']) {
      await page.keyboard.press(key);
      await expectDocument(page, 'keep this');
    }
  });
}

for (const [button, expected] of [
  ['Bold', '**word**'], ['Italic', '*word*'], ['Strikethrough', '~~word~~'], ['Inline code', '`word`'],
  ['Bullet list', '- word'], ['Ordered list', '1. word'], ['Task list', '- [ ] word'],
]) {
  test(`toolbar ${button} formats selected text`, async ({ page }) => {
    await replaceDocument(page, 'word');
    await page.keyboard.press('ControlOrMeta+a');
    await page.locator('.ge-toolbar').getByRole('button', { name: button, exact: true }).click();
    await expectDocument(page, expected);
  });
}

test('checkbox undo restores only the task state', async ({ page }) => {
  await page.getByRole('button', { name: 'Tasks fixture', exact: true }).click();
  const task = page.getByRole('checkbox', { name: 'task', exact: true });
  await task.click();
  await expect(task).toBeChecked();
  await page.locator('.ge-toolbar').getByRole('button', { name: 'Undo', exact: true }).click();
  await expectDocument(page, 'intro\n\n- [ ] task\n- [x] done\n- [X] uppercase');
});

test('table cell editing commits text and Escape cancels a draft', async ({ page }) => {
  await page.getByText('Load or edit exact Markdown', { exact: true }).click();
  await page.getByLabel('Markdown source', { exact: true }).fill('intro\n\n| A | B |\n| --- | --- |\n| one | two |');
  await page.getByRole('cell', { name: 'one', exact: true }).click();
  await page.getByRole('cell', { name: 'one', exact: true }).click();
  const input = page.locator('.ge-table-cell-editor');
  await input.fill('changed');
  await input.press('Enter');
  await expect(page.getByRole('cell', { name: 'changed', exact: true })).toBeVisible();
  await expect(page.getByLabel('Markdown source', { exact: true })).toHaveValue(/changed/);
  await page.getByRole('cell', { name: 'changed', exact: true }).click();
  await page.getByRole('cell', { name: 'changed', exact: true }).click();
  await input.fill('discard');
  await input.press('Escape');
  await expect(page.getByRole('cell', { name: 'changed', exact: true })).toBeVisible();
  await expect(page.getByLabel('Markdown source', { exact: true })).not.toHaveValue(/discard/);
});

test('inline source reveal and mode switching retain links and code', async ({ page }) => {
  const source = 'intro\n\n[link](https://example.com) and `code`\n\nend';
  await replaceDocument(page, source);
  await page.getByLabel('Mode', { exact: true }).selectOption('markdown');
  await expect(page.locator('.cm-content')).toContainText('[link](https://example.com)');
  await page.getByLabel('Mode', { exact: true }).selectOption('preview');
  await expect(page.locator('.cm-content')).toContainText('link');
  await expectDocument(page, source);
});


test('console content tracing requires opt-in and stops when disabled', async ({ page }) => {
  const records: string[] = [];
  page.on('console', message => {
    if (message.text().startsWith('[Galley ')) records.push(message.text());
  });
  const tracing = page.getByLabel('Console event tracing', { exact: true });
  await expect(tracing).not.toBeChecked();
  await replaceDocument(page, 'private default input');
  await expectDocument(page, 'private default input');
  expect(records).toEqual([]);

  await tracing.check();
  await replaceDocument(page, 'explicit diagnostic input');
  await expect.poll(() => records.some(record => record.includes('explicit diagnostic input'))).toBe(true);

  await tracing.uncheck();
  records.length = 0;
  await replaceDocument(page, 'private input after disabling');
  await expectDocument(page, 'private input after disabling');
  expect(records).toEqual([]);
});

// These scenarios check author actions and retained Markdown, not UI copy snapshots.
test('heading selection can return a paragraph to normal and undo both changes', async ({ page }) => {
  await replaceDocument(page, 'Chapter');
  await page.getByLabel('Text style', { exact: true }).selectOption('h2');
  await expectDocument(page, '## Chapter');
  await page.getByLabel('Text style', { exact: true }).selectOption('normal');
  await expectDocument(page, 'Chapter');
  await page.locator('.ge-toolbar').getByRole('button', { name: 'Undo', exact: true }).click();
  await expectDocument(page, '## Chapter');
});

test('keyboard activation hides and restores the toolbar without changing the draft', async ({ page }) => {
  await replaceDocument(page, 'Draft with **formatting**');
  const toggle = page.getByRole('button', { name: 'Hide formatting toolbar', exact: true });
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.ge-toolbar')).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(page.locator('.ge-toolbar')).toBeVisible();
  await expectDocument(page, 'Draft with **formatting**');
});

test('preview disables editing controls and returning to live restores editing', async ({ page }) => {
  await replaceDocument(page, 'Keep me');
  await page.getByLabel('Mode', { exact: true }).selectOption('preview');
  const bold = page.locator('.ge-toolbar').getByRole('button', { name: 'Bold', exact: true });
  await expect(bold).toBeDisabled();
  await page.getByLabel('Mode', { exact: true }).selectOption('live');
  await expect(bold).toBeEnabled();
  await page.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+a');
  await bold.click();
  await expectDocument(page, '**Keep me**');
});

test('table cell pipes remain one cell after commit and mode round trip', async ({ page }) => {
  await page.getByText('Load or edit exact Markdown', { exact: true }).click();
  await page.getByLabel('Markdown source', { exact: true }).fill('intro\n\n| A | B |\n| --- | --- |\n| one | two |');
  const cell = page.getByRole('cell', { name: 'one', exact: true });
  await cell.click();
  await cell.click();
  await page.locator('.ge-table-cell-editor').fill('left | right');
  await page.locator('.ge-table-cell-editor').press('Enter');
  await expect(page.getByRole('cell', { name: 'left | right', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'two', exact: true })).toBeVisible();
  await page.getByLabel('Mode', { exact: true }).selectOption('markdown');
  await expect(page.getByLabel('Markdown source', { exact: true })).toHaveValue(/left \\\| right/);
  await page.getByLabel('Mode', { exact: true }).selectOption('preview');
  await expect(page.getByRole('cell', { name: 'left | right', exact: true })).toBeVisible();
});

for (const width of [390, 1280]) {
  test(`editor remains usable at ${width}px with long content and theme changes`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await replaceDocument(page, 'Long ' + 'word'.repeat(120) + '\n\n- [ ] task');
    await page.getByRole('button', { name: 'Theme: auto', exact: true }).click();
    await page.getByRole('button', { name: 'Theme: light', exact: true }).click();
    const shell = page.locator('.ge-editor-shell');
    await expect(shell).toBeVisible();
    const styleSelector = page.getByLabel('Text style', { exact: true });
    await expect(styleSelector).toHaveCSS('color-scheme', 'dark');
    const toolbarBackground = await page.locator('.ge-toolbar').evaluate(element => getComputedStyle(element).backgroundColor);
    await expect(styleSelector).toHaveCSS('background-color', toolbarBackground);
    const bounds = await shell.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await expect(page.locator('vite-error-overlay')).toHaveCount(0);
    await page.getByRole('checkbox', { name: 'task', exact: true }).click();
    await expectDocument(page, 'Long ' + 'word'.repeat(120) + '\n\n- [x] task');
    expect(errors).toEqual([]);
    await shell.screenshot({ path: testInfo.outputPath(`editor-${width}.png`) });
  });
}
