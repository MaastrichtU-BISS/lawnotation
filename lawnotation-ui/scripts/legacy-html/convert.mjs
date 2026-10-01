// Turns a document uploaded as HTML (before parsing moved to the server) into
// the plain text new uploads get, and moves its annotations onto that text.
//
// Two texts matter here:
//
//   old — what Label Studio annotated: every text node of the HTML, in order,
//         plus one character per <br> (findGlobalOffset in its
//         selection-tools.js). annotations.start_index/end_index point into it.
//   new — what node-legal-docs-import's htmlParser makes of the same HTML:
//         block tags end lines, script/style dropped, then tidy() (collapse
//         whitespace within lines, keep one blank line between paragraphs).
//
// Both are built in one walk over one parse, so every character of the new
// text knows which character of the old one it came from. That map is what
// moves the annotations; nothing is matched by searching for text.
//
// The HTML is parsed with parse5, the spec's parsing algorithm, in a <div>
// context — the same tree the browser built when Label Studio set the HTML as
// innerHTML, which is what makes the old offsets reproducible here.
import { parseFragment, defaultTreeAdapter, html as parse5Html } from "parse5";

// Kept in step with node-legal-docs-import's html.ts.
const BLOCK = new Set([
  "address", "article", "aside", "blockquote", "br", "dd", "div", "dl", "dt",
  "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4",
  "h5", "h6", "header", "hr", "li", "main", "nav", "ol", "p", "pre", "section",
  "table", "tbody", "td", "tfoot", "th", "thead", "tr", "ul",
]);
const SKIP = new Set(["script", "style", "noscript", "template"]);

/** Same test as tidy()'s /\s+/ split. */
const isSpace = (ch) => /\s/.test(ch);

/**
 * @param {string} html the stored full_text of a legacy HTML document
 * @returns {{ oldText: string, newText: string, mapRange: (start: number, end: number) => ({start: number, end: number} | null) }}
 */
export function convertLegacyHtml(html) {
  const context = defaultTreeAdapter.createElement("div", parse5Html.NS.HTML, []);
  const root = parseFragment(context, html);

  // The importer's chunk stream, one entry per character, each carrying the
  // old offset it came from (null for a line break the importer inserts).
  /** @type {{ ch: string, old: number | null }[]} */
  const stream = [];
  let oldText = "";

  const walk = (node, skipped) => {
    for (const child of node.childNodes ?? []) {
      if (child.nodeName === "#text") {
        for (const ch of child.value) {
          if (!skipped) stream.push({ ch, old: oldText.length });
          oldText += ch;
        }
      } else if (child.nodeName === "#comment" || child.nodeName === "#documentType") {
        // Neither text to Label Studio nor to the importer.
      } else {
        const tag = child.tagName;
        // Template content lives in child.content, which Label Studio's
        // TreeWalker never entered either.
        walk(child, skipped || SKIP.has(tag));
        if (tag === "br") {
          // One character to Label Studio; a line break to the importer.
          if (!skipped) stream.push({ ch: "\n", old: oldText.length });
          oldText += "\n";
        } else if (BLOCK.has(tag) && !skipped) {
          stream.push({ ch: "\n", old: null });
        }
      }
    }
  };
  walk(root, false);

  // tidy(), keeping each kept character's old offset. \r cannot occur: the
  // HTML parser already turned line endings into \n.
  /** @type {{ ch: string, old: number | null }[]} */
  const out = [];
  let blank = true; // leading blank lines are dropped
  let line = [];
  const flushLine = () => {
    // Words of the line, joined by single spaces. A joining space has no old
    // character of its own; the first whitespace character that stood there
    // lends it one, so a range ending on that whitespace still maps.
    const words = [];
    let word = [];
    let gap = null;
    for (const c of line) {
      if (isSpace(c.ch)) {
        if (word.length) {
          words.push({ word, gapBefore: gap });
          word = [];
          gap = null;
        }
        if (gap === null) gap = c.old;
      } else {
        word.push(c);
      }
    }
    if (word.length) words.push({ word, gapBefore: gap });

    if (!words.length) {
      if (!blank) out.push({ ch: "\n", old: null });
      blank = true;
    } else {
      words.forEach((w, i) => {
        if (i > 0) out.push({ ch: " ", old: w.gapBefore });
        out.push(...w.word);
      });
      out.push({ ch: "\n", old: null });
      blank = false;
    }
    line = [];
  };
  for (const c of stream) {
    if (c.ch === "\n") flushLine();
    else line.push(c);
  }
  flushLine();
  while (out.length && out[out.length - 1].ch === "\n") out.pop();

  const newText = out.map((c) => c.ch).join("");

  /**
   * An old [start, end) range as the smallest new range holding every one of
   * its characters that survived; null if none did (the span covered only
   * whitespace or dropped content).
   */
  const mapRange = (start, end) => {
    let first = -1;
    let last = -1;
    for (let i = 0; i < out.length; i++) {
      const old = out[i].old;
      if (old === null || old < start || old >= end) continue;
      if (first === -1) first = i;
      last = i;
    }
    if (first === -1) return null;
    // A span never starts or ends on whitespace the conversion introduced.
    while (first <= last && isSpace(newText[first])) first++;
    while (last >= first && isSpace(newText[last])) last--;
    return first > last ? null : { start: first, end: last + 1 };
  };

  return { oldText, newText, mapRange };
}

/**
 * Whether two spans hold the same characters apart from whitespace — the check
 * that an annotation still covers what it did. Whitespace may legitimately
 * differ: runs collapse, and blocks Label Studio saw run together
 * ("<li>a</li><li>b</li>" was "ab") now end lines.
 */
export function sameCharacters(a, b) {
  return a.replace(/\s+/g, "") === b.replace(/\s+/g, "");
}
