import type {
  LSSerializedAnnotations,
  Annotation,
  LSSerializedRelation,
  AnnotationRelation
} from "~/types";

export const convert_annotation_ls2db = (anns: LSSerializedAnnotations, assignment_id: number, isWordLevel: boolean): Omit<Annotation, "id">[] => {
  let response: Omit<Annotation, "id">[] = [];
  anns.map(ann => {

    if(isWordLevel) {
      // value.labels, start_index, end_index, text all exist
      response.push(...ann.value?.labels!.map(label => {
        return {
          ls_id: ann.id,
          origin: ann.origin,
          start_index: ann.value?.start!,
          end_index: ann.value?.end!,
          text: ann.value?.text!,
          label: label,
          assignment_id: assignment_id
        };
      }));
    } else {
      // value.choices exist
      response.push(...ann.value?.choices!.map(label => {
        return {
          ls_id: ann.id,
          origin: ann.origin,
          start_index: 0,
          end_index: 0,
          text: '',
          label: label,
          assignment_id: assignment_id
        };
      }));
    }
  });

  return response;
};

export const convert_annotation_db2ls = (anns: Annotation[], assignment_id: number, isWordLevel: boolean): LSSerializedAnnotations => {
  
  if(isWordLevel) {
    return anns.map((a) => {
      return {
        id: a.ls_id,
        origin: "manual",
        from_name: "label",
        to_name: "text",
        type: "labels",
        value: {
          start: a.start_index,
          end: a.end_index,
          text: a.text,
          labels: [a.label],
        },
      };
    });
  }
  else {
    // Document level
    return anns && anns.length ? [{
      id: anns[0].ls_id,
      origin: "manual",
      from_name: "label",
      to_name: "text",
      type: "choices",
      value: {
        choices: anns.map(ann => ann.label)
      }
    }] : [];
  }
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