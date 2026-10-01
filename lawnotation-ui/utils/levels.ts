import type { AnnotationLevel } from "legal-annotation-kit";
import type { Task } from "~/types";
import { AnnotationLevels } from "~/utils/enums";

export function isDocumentLevel(task: Task) {
  return task.annotation_level == "document";
}

export function getDocFormat(docName: string) {
  const splitted = docName.split('.');
  const format = splitted[splitted.length - 1];
  return format;
}

/**
 * A document uploaded as HTML before parsing moved to the server. Its text is
 * still markup, and its annotations' offsets count text the way Label Studio
 * did (see legacyHtmlToText). New .html uploads are stored as plain text and
 * do not match.
 */
export function isLegacyHtml(docName: string, fullText: string) {
  return /\.html?$/i.test(docName) && /<\/?[a-z][^>]*>/i.test(fullText);
}

/** Label Studio called character granularity "symbol"; legal-annotation-kit does not. */
export function toKitLevel(level: string): AnnotationLevel {
  return level === AnnotationLevels.SYMBOL ? "character" : (level as AnnotationLevel);
}
