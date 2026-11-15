/** Finds Japanese text that is not inside an element with lang="ja". */
const JAPANESE = /[぀-ヿ㐀-鿿豈-﫿]/;

/** Text nodes with kana or kanji that no ancestor marks as lang="ja". */
export function untaggedJapanese(root: Node): string[] {
  const found: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? '';
    if (!JAPANESE.test(text)) continue;
    const lang = (node.parentElement?.closest('[lang]') as HTMLElement | null)?.lang;
    if (lang !== 'ja') found.push(text.trim());
  }
  return found;
}
