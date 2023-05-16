<template>
  <div id="label-studio-container" class="m-4">
    <div id="label-studio"></div>
  </div>
</template>
<script setup lang="ts">
import "@heartexlabs/label-studio/build/static/css/main.css";
import { Annotation, LSSerializedAnnotation, useAnnotationApi } from "~/data/annotation";
import {
  AnnotationRelation,
  LSSerializedRelation,
  useAnnotationRelationApi,
} from "~/data/annotation_relations";
import { Assignment, useAssignmentApi } from "~/data/assignment";
import { LsLabels } from "~/data/labelset";

import { useLabelStudioBridge } from "~/stores/useLabelStudioBridge";

const labelStudioBridge = useLabelStudioBridge();

const annotationApi = useAnnotationApi();
const relationApi = useAnnotationRelationApi();
const assignmentApi = useAssignmentApi();

const label_studio = ref();

const emit = defineEmits(["nextAssignment"]);

const props = defineProps<{
  user: any;
  assignment: Assignment | undefined;
  annotations: LSSerializedAnnotation | undefined;
  relations: LSSerializedRelation[] | undefined;
  text: string | undefined;
  labels: LsLabels | undefined;
  isEditor: boolean | undefined;
  guidelines: string | undefined;
}>();

const initLS = async () => {
  // @ts-ignore
  const LabelStudio = (await import("@heartexlabs/label-studio")).default;
  label_studio.value = new LabelStudio("label-studio", {
    config: `
                <View style="display: flex;">
                  <View style="width: 150px; background: #f1f1f1; border-radius: 3px">
                    <Filter name="fl" toName="label" hotkey="shift+f" minlength="1" />
                    <Labels style="padding-left: 2em; margin-right: 2em;" name="label" toName="text">
                      ${props.labels
                        ?.map(
                          (l) => `<Label value="${l.name}" background="${l.color}" />`
                        )
                        .join("\n")}
                    </Labels>
                  </View>
                  <View>
                    <View style="height: auto; overflow-y: auto; padding: 0 1em">
                      <Text name="text" value="$text" />
                    </View>
                  <Relations>
                    <Relation value="Is a" />
                    <Relation value="Has a" />
                    <Relation value="Implies" />
                    <Relation value="Depends on" />
                    <Relation value="Belongs to" />
                    <Relation value="Related to" />
                  </Relations>
                  </View>
                </View>
                `,
    description: `<html><pre>${props.guidelines}</pre></html>`,
    interfaces: [
      "panel",
      "update",
      "submit",
      "skip",
      "controls",
      "infobar",
      "topbar",
      "topbar:prevnext",
      props.isEditor ? "review" : "",
      "instruction",
      "side-column",
      // "annotations:history",
      // "annotations:tabs",
      // "annotations:menu",
      "annotations:current",
      "annotations:add-new",
      "annotations:delete",
      // "annotations:view-all",
      // "predictions:tabs",
      // "predictions:menu",
      // "auto-annotation",
      "edit-history",
    ],
    user: {
      pk: 1,
      firstName: props.user.value?.email,
      // lastName: "Dean",
    },
    task: {
      annotations: props.annotations?.length
        ? [{ result: (props.annotations as any).concat(props.relations) }]
        : [],
      // predictions: this.predictions,
      data: {
        text: props.text,
      },
    },
    onLabelStudioLoad: (LS: any) => {
      if (props.annotations?.length) {
        LS.annotationStore.selectAnnotation(LS.annotationStore.annotations);
      } else {
        const c = LS.annotationStore.addAnnotation({
          userGenerate: true,
        });
        LS.annotationStore.selectAnnotation(c.id);
      }

      console.log("LSLOAD value", LS);
      if (LS.annotationStore)
        labelStudioBridge.setMobxAnnotationStore(LS.annotationStore);

    },
    onSkipTask() {
      if (!props.assignment) return;
      assignmentApi
        .updateAssignment(props.assignment?.id.toString(), { status: "done" })
        .then((a) => {
          emit("nextAssignment");
        });
    },
    onAcceptAnnotation() {},
    onRejectAnnotation() {},
    onSubmitAnnotation: async (
      LS: any,
      { serializeAnnotation }: { serializeAnnotation: () => LSSerializedAnnotation }
    ) => {
      updateAnnotationsAndRelations(serializeAnnotation());
    },
    onUpdateAnnotation: async (
      LS: any,
      { serializeAnnotation }: { serializeAnnotation: () => LSSerializedAnnotation }
    ) => {
      updateAnnotationsAndRelations(serializeAnnotation());
    },
  });

};

const updateAnnotationsAndRelations = async (serializedAnnotations: any[]) => {
  if (!props.assignment) return;

  // create annotations
  const ls_anns = serializedAnnotations.filter((x) => x.type == "labels");
  const db_anns = annotationApi.convert_ls2db(ls_anns, props.assignment?.id);
  const created_anns = await annotationApi.updateAssignmentAnnotations(
    props.assignment?.id,
    db_anns
  );

  if (!created_anns) return;

  // create relations
  const ls_rels = serializedAnnotations.filter((x) => x.type == "relation");

  ls_rels.map((rel) => {
    var from = -1;
    var to = -1;
    for (let i = 0; i < created_anns.length; ++i) {
      if (created_anns[i].ls_id == ((rel as unknown) as LSSerializedRelation).from_id)
        from = created_anns[i].id;

      if (created_anns[i].ls_id == ((rel as unknown) as LSSerializedRelation).to_id)
        to = created_anns[i].id;
    }
    relationApi.createRelation((rel as unknown) as LSSerializedRelation, from, to);
  });
};

onMounted(() => {
  initLS();
});
</script>
<style>
#label-studio {
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.lsf-richtext {
  margin-top: 1rem;
}

.lsf-current-task {
  display: none;
}

.lsf-topbar__section {
  border-left: none !important;
  padding: 0 !important;
  margin-left: 0;
}

[aria-label="Reset"],
[aria-label="Copy Annotation"],
[aria-label="Settings"],
[aria-label="Delete"],
.lsf-annotations-list {
  display: none;
}

[aria-label="skip-task"],
[aria-label="reject-annotation"] {
  order: 1;
}

[aria-label="skip-task"]:first-child,
[aria-label="reject-annotation"]:first-child {
  visibility: hidden;
}

[aria-label="skip-task"]::after {
  content: "Next";
  margin-left: -40px;
  visibility: visible;
}

[aria-label="reject-annotation"]::after {
  content: "Reject";
  margin-left: -40px;
  visibility: visible;
}
</style>
