import { readFiles } from 'h3-formidable'
import fs from 'node:fs';
import pdfParse from "pdf-parse/lib/pdf-parse";

export default eventHandler(async (event) => {
  const files = await readFiles(event);
  let buffer = fs.readFileSync(files.pdfFile[0].filepath);
  const parsedText = await pdfParse(buffer);
  // replaceAll is needed to remove 'unsupported Unicode'
  return parsedText.text.replaceAll('\x00', ' ');
})