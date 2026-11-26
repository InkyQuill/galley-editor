import { expect, test, type Locator, type Page } from '@playwright/test';
import type { EditorView } from '@codemirror/view';

const target = 'alpha bravo charlie delta';
const document = Array.from({ length: 100 }, (_, index) => [
  '```js',
  `const block = ${index};`,
  'console.log(block);',
  '```',
  '',
  `> Quoted paragraph ${index}.`,
  '> Another quoted line.',
  '',
  `Paragraph ${index}.`,
].join('\n')).join('\n\n') + `\n\n${target}\n\nAfter target.\n`;

async function loadDocument(page: Page, source: string, mode: 'live' | 'preview') {
  await page.goto('/');
  const load = page.getByText('Load or edit exact Markdown', { exact: true });
  await load.click();
  await page.getByLabel('Markdown source', { exact: true }).fill(source);
  await expect.poll(() => page.locator('pre code').last().textContent()).toBe(source);
  await load.click();
  await page.getByLabel('Mode', { exact: true }).selectOption(mode);
  await page.addStyleTag({ content: '.cm-editor .cm-scroller { max-height: 420px; overflow: auto; }' });
  await page.locator('.cm-scroller').evaluate((element) => { element.scrollTop = element.scrollHeight; });
}

function textPosition(line: Locator, offset: number) {
  return line.evaluate((element, index) => {
    const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let remaining = index;
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      const length = text.textContent?.length ?? 0;
      if (remaining <= length) {
        const range = element.ownerDocument.createRange();
        range.setStart(text, remaining);
        range.collapse(true);
        const rect = range.getBoundingClientRect();
        return { x: rect.left, y: rect.top + rect.height / 2 };
      }
      remaining -= length;
    }
    throw new Error('Offset outside target text');
  }, offset);
}

for (const mode of ['live', 'preview'] as const) {
  test(`keeps pointer selection aligned after scrolling past many blocks in ${mode} mode`, async ({ page }) => {
    await loadDocument(page, document, mode);
    const content = page.locator('.cm-content');
    const line = content.getByText(target, { exact: true });
    await line.scrollIntoViewIfNeeded();
    await expect(line).toBeInViewport();
    await expect.soft.poll(() => line.evaluate((element) => {
      // The bench exposes the existing CodeMirror instance through its content tile.
      const contentElement = element.closest('.cm-content') as
        (HTMLElement & { cmTile?: { root: { view: EditorView } } }) | null;
      const view = contentElement?.cmTile?.root.view;
      if (!view) throw new Error('Expected a mounted CodeMirror view');
      const position = view.posAtDOM(element);
      const modelTop = view.documentTop + view.lineBlockAt(position).top;
      return Math.abs(modelTop - element.getBoundingClientRect().top);
    })).toBeLessThan(2);

    const click = await textPosition(line, 'alpha '.length);
    expect(await line.evaluate((element, point) =>
      element.contains(element.ownerDocument.elementFromPoint(point.x, point.y)),
    click)).toBe(true);
    await page.mouse.click(click.x, click.y);
    await expect.poll(() => line.evaluate((element) => {
      const selection = element.ownerDocument.getSelection();
      return selection?.focusNode === element.firstChild ? selection.focusOffset : -1;
    })).toBe('alpha '.length);

    const end = await textPosition(line, 'alpha bravo charlie'.length);
    await page.mouse.move(click.x, click.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => content.evaluate((element) => element.ownerDocument.getSelection()?.toString())).toBe('bravo charlie');
  });
}

for (const mode of ['live', 'preview'] as const) {
  test(`drag-selects inside a late code fence in ${mode} mode`, async ({ page, browserName }) => {
    if (browserName === 'chromium') await page.context().grantPermissions(['clipboard-read']);
    const source = document + '\n```text\nfirst fence row\nomega bravo charlie delta\nlast fence row\n```\n';
    await loadDocument(page, source, mode);
    const content = page.locator('.cm-content');
    const widgetBody = content.locator('.ge-code-body code').filter({ hasText: 'first fence row' });
    await widgetBody.scrollIntoViewIfNeeded();
    let code = widgetBody;
    let prefix = 'first fence row\nomega ';
    if (mode === 'live') {
      await widgetBody.click();
      code = content.locator('.cm-line').filter({ hasText: /^omega bravo charlie delta$/ });
      prefix = 'omega ';
      await expect(code).toBeVisible();
    }

    await code.evaluate((element) => element.scrollIntoView({ block: 'center' }));
    await expect(code).toBeInViewport({ ratio: 0.9 });
    const start = await textPosition(code, prefix.length);
    const end = await textPosition(code, prefix.length + 'bravo charlie'.length);
    expect(await code.evaluate((element, points) => {
      const hitArea = element.closest('.ge-code-body') ?? element;
      return points.every(({ x, y }) => hitArea.contains(element.ownerDocument.elementFromPoint(x, y)));
    }, [start, end])).toBe(true);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => content.evaluate((element) => element.ownerDocument.getSelection()?.toString())).toBe('bravo charlie');
    if (browserName === 'chromium') {
      await page.keyboard.press('ControlOrMeta+c');
      await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('bravo charlie');
    }
    if (mode === 'preview') {
      await page.keyboard.press('Escape');
      await expect(page.getByText(/: Escape$/)).toBeVisible();
    }
  });
}
