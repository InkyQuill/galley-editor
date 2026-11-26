import { expect, test, type Locator } from '@playwright/test';
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

function textPosition(line: Locator, offset: number) {
  return line.evaluate((element, index) => {
    const text = element.firstChild;
    if (!text || text.nodeType !== Node.TEXT_NODE) throw new Error('Expected plain target text');
    const range = element.ownerDocument.createRange();
    range.setStart(text, index);
    range.collapse(true);
    const rect = range.getBoundingClientRect();
    return { x: rect.left, y: rect.top + rect.height / 2 };
  }, offset);
}

for (const mode of ['live', 'preview']) {
  test(`keeps pointer selection aligned after scrolling past many blocks in ${mode} mode`, async ({ page }) => {
    await page.goto('/');
    await page.getByText('Load or edit exact Markdown', { exact: true }).click();
    await page.getByLabel('Markdown source', { exact: true }).fill(document);
    await expect.poll(() => page.locator('pre code').last().textContent()).toBe(document);
    await page.getByText('Load or edit exact Markdown', { exact: true }).click();
    await page.getByLabel('Mode', { exact: true }).selectOption(mode);
    await page.addStyleTag({ content: '.cm-editor .cm-scroller { max-height: 420px; overflow: auto; }' });
    const content = page.locator('.cm-content');
    const viewport = page.locator('.cm-scroller');
    const line = content.getByText(target, { exact: true });
    await viewport.evaluate((element) => { element.scrollTop = element.scrollHeight; });
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
