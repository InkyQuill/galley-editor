import type { Text } from '@codemirror/state';
import type { ViewUpdate } from '@codemirror/view';

function wordStarts(text: string, startsInWord = false): number {
  let inWord = startsInWord;
  let words = 0;
  for (const character of text) {
    const isWord = /\S/.test(character);
    if (isWord && !inWord) words += 1;
    inWord = isWord;
  }
  return words;
}

function affectedWords(doc: Text, from: number, to: number): number {
  // The first unchanged character after an edit can start or stop starting
  // a word. The character before the range only supplies its boundary.
  return wordStarts(
    doc.sliceString(from, Math.min(doc.length, to + 1)),
    from > 0 && /\S/.test(doc.sliceString(from - 1, from)),
  );
}

function createSnapshot(doc: Text | string, wordCount: number) {
  let value: string | undefined = typeof doc === 'string' ? doc : undefined;
  return {
    wordCount,
    characterCount: doc.length,
    getValue: () => (value ??= doc.toString()),
  };
}

export function createDocumentStatistics(initialValue: string) {
  // CodeMirror represents each line break as one UTF-16 code unit.
  const document = initialValue.replace(/\r\n?/g, '\n');
  let snapshot = createSnapshot(document, wordStarts(document));
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => snapshot,
    subscribe(notify: () => void) {
      listeners.add(notify);
      return () => { listeners.delete(notify); };
    },
    reset(doc: Text) {
      snapshot = createSnapshot(doc, wordStarts(doc.toString()));
      listeners.forEach((notify) => notify());
    },
    update(update: ViewUpdate) {
      if (!update.docChanged) return;
      const before = update.startState.doc;
      const after = update.state.doc;
      let { wordCount } = snapshot;
      // The default iterator combines adjacent edits, so their boundary
      // characters are counted only once.
      update.changes.iterChanges((fromA, toA, fromB, toB) => {
        wordCount += affectedWords(after, fromB, toB) - affectedWords(before, fromA, toA);
      });
      snapshot = createSnapshot(after, wordCount);
      listeners.forEach((notify) => notify());
    },
  };
}

export type DocumentStatistics = ReturnType<typeof createDocumentStatistics>;
