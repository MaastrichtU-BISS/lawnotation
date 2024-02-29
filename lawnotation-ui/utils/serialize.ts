import type {
  LSSerializedAnnotations,
  Annotation,
  LSSerializedRelation,
  AnnotationRelation
} from "~/types";

export const convert_annotation_ls2db = (anns: LSSerializedAnnotations, assignment_id: number, isWordLevel: boolean): Omit<Annotation, "id">[] => {
  return anns.map((ann) => {
    return {
      ls_id: ann.id,
      origin: ann.origin,
      start_index: isWordLevel ? ann.value.start : 0,
      end_index: isWordLevel ? ann.value.end : 0,
      text: isWordLevel ? ann.value.text : '',
      label: isWordLevel ? ann.value.labels[0] : ann.value.choices.join(","),
      assignment_id: assignment_id,
    };
  });
};

export const convert_annotation_db2ls = (anns: Annotation[], assignment_id: number, isWordLevel: boolean): LSSerializedAnnotations => {
  const arr = anns.map((a) => {
    return {
      id: a.ls_id,
      origin: "manual",
      from_name: "label",
      to_name: "text",
      type: isWordLevel ? "labels" : "choices",
      value: {
        start: a.start_index,
        end: a.end_index,
        text: a.text,
        labels: isWordLevel ? [a.label] : undefined,
        // TODO: extend this check to support multiple levels
        choices: !isWordLevel ? a.label.split(',') : undefined,
      },
    };
  });

  return arr;
};

export const convert_relation_ls2db = (rel: LSSerializedRelation, from_id: number, to_id: number): Omit<AnnotationRelation, "id"> => {
  return {
    ls_from: rel.from_id,
    ls_to: rel.to_id,
    direction: rel.direction,
    labels: rel.labels,
    from_id: from_id,
    to_id: to_id,
  };
}

export const convert_relation_db2ls = (rel: AnnotationRelation): LSSerializedRelation => {
  return {
    from_id: rel.ls_from,
    to_id: rel.ls_to,
    labels: rel.labels,
    direction: rel.direction,
    type: 'relation'
  };
}