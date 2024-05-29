import type {
  LSSerializedAnnotations,
  Annotation,
  LSSerializedRelation,
  AnnotationRelation,
  LSSerializedAnnotation,
} from "~/types";

export const convert_annotation_ls2db = (
  anns: LSSerializedAnnotations,
  assignment_id: number
): Omit<Annotation, "id">[] => {
  let response: Omit<Annotation, "id">[] = [];
  anns.map((ann) => {
    let labels: string[] = [];
    let text = "";
    let start = 0;
    let end = 0;
    let html_metadata = undefined;

    switch (ann.type) {
      case "labels":
        labels = ann.value?.labels!;
        start = +ann.value?.start!;
        end = +ann.value?.end!;
        text = ann.value?.text!;
        break;
      case "hypertextlabels":
        labels = ann.value?.hypertextlabels!;
        start = ann.value?.globalOffsets?.start!;
        end = ann.value?.globalOffsets?.end!;
        text = ann.value?.text!;
        html_metadata = {
          start: ann.value.start?.toString()!,
          end: ann.value.end?.toString()!,
          startOffset: ann.value.startOffset!,
          endOffset: ann.value.endOffset!,
          globalOffsets: {
            start: ann.value.globalOffsets?.start!,
            end: ann.value.globalOffsets?.end!
          }
        }
        break;
      case "choices":
        labels = ann.value?.choices!;
        break;
      default:
        break;
    }

    response.push(
      ...labels.map((label) => {
        return {
          ls_id: ann.id,
          origin: ann.origin,
          start_index: start,
          end_index: end,
          text: text,
          label: label,
          assignment_id: assignment_id,
          html_metadata: html_metadata,
          confidence_rating: ann.value.confidence_rating ?? 0
        };
      })
    );
  });

  return response;
};

export const convert_annotation_db2ls = (
  anns: Annotation[],
  isSpanLevel: boolean,
  isHtml: boolean,
): LSSerializedAnnotations => {
  if (isSpanLevel) {
    if(isHtml) {
      const base_anns = anns.map((a) => {
        return {
          id: a.ls_id,
          origin: "manual",
          from_name: "label",
          to_name: "text",
          type: "hypertextlabels",
          value: {
            start: a.html_metadata?.start,
            end: a.html_metadata?.end,
            text: a.text,
            hypertexlabels: [a.label],
            startOffset: a.html_metadata?.startOffset,
            endOffset: a.html_metadata?.endOffset,
            globalOffsets: {
              start: a.html_metadata?.globalOffsets.start!,
              end: a.html_metadata?.globalOffsets.end!
            }
          },
        } as LSSerializedAnnotation;
      });

      const confidence_anns = anns.map((a) => {
        return {
          id: a.ls_id,
          origin: "manual",
          from_name: "ann_confidence",
          to_name: "text",
          type: "rating",
          value: {
            start: a.html_metadata?.start,
            end: a.html_metadata?.end,
            text: a.text,
            rating: a.confidence_rating,
            startOffset: a.html_metadata?.startOffset,
            endOffset: a.html_metadata?.endOffset,
            globalOffsets: {
              start: a.html_metadata?.globalOffsets.start!,
              end: a.html_metadata?.globalOffsets.end!
            }
          },
        } as LSSerializedAnnotation;
      });

      return base_anns.concat(confidence_anns);
    } else {
      const base_anns = anns.map((a) => {
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
        } as LSSerializedAnnotation;
      });

      const confidence_anns = anns.map((a) => { 
        return {
          id: a.ls_id,
          origin: "manual",
          from_name: "ann_confidence",
          to_name: "text",
          type: "rating",
          value: {
            start: a.start_index,
            end: a.end_index,
            text: a.text,
            rating: a.confidence_rating ?? 0,
          },
        } as LSSerializedAnnotation;
      });

      return base_anns.concat(confidence_anns);
    }
  } else {
    // Document level
    return anns && anns.length
      ? [
          {
            id: anns[0].ls_id,
            origin: "manual",
            from_name: "label",
            to_name: "text",
            type: "choices",
            value: {
              choices: anns.map((ann) => ann.label),
            },
          },
        ]
      : [];
  }
};

export const convert_relation_ls2db = (
  rel: LSSerializedRelation,
  from_id: number,
  to_id: number
): Omit<AnnotationRelation, "id"> => {
  return {
    ls_from: rel.from_id,
    ls_to: rel.to_id,
    direction: rel.direction,
    labels: rel.labels,
    from_id: from_id,
    to_id: to_id,
  };
};

export const convert_relation_db2ls = (
  rel: AnnotationRelation
): LSSerializedRelation => {
  return {
    from_id: rel.ls_from,
    to_id: rel.ls_to,
    labels: rel.labels,
    direction: rel.direction,
    type: "relation",
  };
};
