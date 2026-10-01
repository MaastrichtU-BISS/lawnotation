import { TRPCError } from "@trpc/server";
import WordExtractor from "word-extractor";
import type { Importer, Parser } from "node-legal-docs-import";

// Uploaded files become stored text here, through node-legal-docs-import, so
// every document is normalised the same way and annotation offsets mean the
// same thing however the file arrived.

/**
 * Legacy Word (.doc), which node-legal-docs-import does not read. Lawnotation
 * always accepted it, so it stays — normalised like everything else.
 */
function docParser(tidy: (s: string) => string): Parser {
  return {
    extensions: [".doc"],
    async parse(file) {
      const extracted = await new WordExtractor().extract(Buffer.from(file.data));
      return { full_text: tidy(extracted.getBody()) };
    },
  };
}

let importer: Promise<Importer> | undefined;

// Loaded on first use: pdfjs is large, and most requests never touch it.
function getImporter(): Promise<Importer> {
  importer ??= import("node-legal-docs-import").then((m) =>
    m.createImporter(m.textParser, m.htmlParser, m.docxParser, m.pdfParser, docParser(m.tidy))
  );
  return importer;
}

/** The text of one uploaded file, or a BAD_REQUEST saying why there is none. */
export async function extractDocumentText(name: string, data: Uint8Array): Promise<string> {
  const { documents, skipped } = await (await getImporter()).import([{ name, data }]);
  if (!documents.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: skipped[0]?.reason ?? "This file could not be read.",
    });
  }
  return documents[0].full_text;
}
