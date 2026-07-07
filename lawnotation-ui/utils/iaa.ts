export type NullableFloat = number | null;

export type PairResult = {
  true_positives: number;
  ref_span_count: number;
  sys_span_count: number;
  documents_compared: number;
  precision: NullableFloat;
  recall: NullableFloat;
  f1: NullableFloat;
};

export type SpanMatchingSummary = {
  macro_f1: NullableFloat;
  // outer key "annotator_<A>_vs_annotator_<B>", inner key "annotator_<A>_as_reference" / "annotator_<B>_as_reference"
  // null entirely when annotation_level == "document"
  pairs: Record<string, Record<string, PairResult>> | null;
};

export type CoverageAgreement = {
  matrix_items: number;
  krippendorff_alpha: NullableFloat;
  // key "annotator_<A>_vs_annotator_<B>"
  cohen_kappa_pairs: Record<string, NullableFloat>;
};

export type LabelResult = {
  // key "annotator_<id>"
  span_counts_per_annotator: Record<string, number>;
  span_matching: SpanMatchingSummary;
  coverage_agreement: CoverageAgreement;
};

export type IaaMeta = {
  input_file: string;
  annotation_level: string;
  criterion: string;
  granularity: string;
  annotators: string[];
  num_documents: number;
  notes: Record<string, string>;
};

export type IaaReport = {
  meta: IaaMeta;
  per_label: Record<string, LabelResult>;
};

export type DifficultyRatingSummary = {
  total: number;
  rated: number;
  mean: NullableFloat;
  counts: Record<string, number>; // keys "1".."5"
  krippendorff_alpha: NullableFloat;
  // key "annotator_<A>_vs_annotator_<B>"
  krippendorff_alpha_pairs: Record<string, NullableFloat>;
};

export type IaaMetricsResponse = {
  annotation_metrics: IaaReport;
  confidence_metrics: DifficultyRatingSummary;
};

export function stripAnnotatorPrefix(annotator: string): string {
  return annotator.startsWith("annotator_") ? annotator.slice("annotator_".length) : annotator;
}

export function formatNullableFloat(value: NullableFloat, digits: number = 3): string {
  return value == null ? "N/A" : value.toFixed(digits);
}
