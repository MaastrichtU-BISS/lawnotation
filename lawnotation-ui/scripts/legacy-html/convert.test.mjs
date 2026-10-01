// node --test scripts/legacy-html
import { test } from "node:test";
import assert from "node:assert/strict";
import { htmlParser } from "node-legal-docs-import";
import { convertLegacyHtml, sameCharacters } from "./convert.mjs";

const importerText = async (html) =>
  (await htmlParser.parse({ name: "x.html", data: new TextEncoder().encode(html) })).full_text;

// Stored by Label Studio 1.4 for this document, in a real session.
const RULING =
  '<h1>Judgment</h1>\n<p>The court <b>finds</b> that the appeal is <i>well founded</i>.</p>\n<p>Line one<br />Line two &amp; three</p>';

test("old text reproduces Label Studio's offsets", () => {
  const { oldText } = convertLegacyHtml(RULING);
  assert.equal(oldText.slice(19, 48), "finds that the appeal is well");
  assert.equal(oldText.slice(72, 83), "two & three");
  assert.equal(oldText.slice(0, 8), "Judgment");
});

test("new text is what node-legal-docs-import makes of the same HTML", async () => {
  const samples = [
    RULING,
    "<p>One</p><p>Two</p>",
    "<div>\n  <p>  spaced   out  </p>\n\n\n<p>next</p>\n</div>",
    "<ul><li>a</li><li>b</li></ul><table><tr><td>c</td><td>d</td></tr></table>",
    "<p>keep<script>alert(1)</script> this</p><style>p{}</style>",
    "plain text with &nbsp;entities&eacute;",
  ];
  for (const html of samples) {
    assert.equal(convertLegacyHtml(html).newText, await importerText(html), html);
  }
});

test("annotations move with their words", () => {
  const { oldText, newText, mapRange } = convertLegacyHtml(RULING);
  for (const [start, end] of [[19, 48], [72, 83], [0, 8], [9, 18]]) {
    const range = mapRange(start, end);
    assert.ok(range, `${start}-${end}`);
    assert.ok(sameCharacters(oldText.slice(start, end), newText.slice(range.start, range.end)));
  }
  assert.equal(newText, "Judgment\n\nThe court finds that the appeal is well founded.\n\nLine one\nLine two & three");
});

test("a span over collapsed whitespace keeps only its words", () => {
  const html = "<p>alpha     beta</p>";
  const { oldText, newText, mapRange } = convertLegacyHtml(html);
  const start = oldText.indexOf("alpha");
  const end = oldText.indexOf("beta") + 4;
  const range = mapRange(start, end);
  assert.equal(newText.slice(range.start, range.end), "alpha beta");
  // Only the whitespace between them: nothing left to annotate.
  assert.equal(mapRange(start + 5, start + 9), null);
});

test("a span ending inside a <br> line break", () => {
  const { oldText, newText, mapRange } = convertLegacyHtml("<p>one<br>two</p>");
  assert.equal(oldText, "one\ntwo");
  const range = mapRange(0, 7);
  assert.equal(newText.slice(range.start, range.end), "one\ntwo");
});

test("blocks Label Studio ran together end lines, and spans across them still match", () => {
  const { oldText, newText, mapRange } = convertLegacyHtml("<ul><li>first</li><li>second</li></ul>");
  assert.equal(oldText, "firstsecond");
  assert.equal(newText, "first\nsecond");
  const range = mapRange(0, 11);
  assert.equal(newText.slice(range.start, range.end), "first\nsecond");
  assert.ok(sameCharacters(oldText, newText.slice(range.start, range.end)));
});
