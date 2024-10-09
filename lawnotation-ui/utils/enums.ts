export enum AnnotationLevels {
  SYMBOL = "symbol",
  WORD = "word",
  SENTENCE = "sentence",
  PARAGRAPH = "paragraph",
  DOCUMENT = "document",
}
export enum GuidanceSteps {
  NONE = "",
  CREATE_PROJECT = "create_project",
  VIEW_PROJECT = "view_project",
  UPLOAD_DOCUMENTS = "upload_documents",
  CREATE_TASK = "create_task",
  ASSIGN_ANNOTATORS = "assign_annotators",
  CHECK_ASSIGNMENTS = "check_assignments"
}

export enum AssignmentStatuses {
  PENDING = "pending",
  DONE = "done",
  PREDICTING = "predicting",
  PREANNOTATED = "pre-annotated",
  FAILED = "failed"
}

export enum Origins {
  MANUAL = "manual",
  IMPORTED = "imported",
  MODEL = "model"
}

export enum Direction {
  PREVIOUS = "previous",
  CURRENT = "current",
  NEXT = "next"
}
