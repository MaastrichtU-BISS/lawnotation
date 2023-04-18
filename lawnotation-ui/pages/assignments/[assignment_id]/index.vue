<template>
  <div>
    <div id="label-studio"></div>
  </div>
</template>
<script setup lang="ts">
import "@heartexlabs/label-studio/build/static/css/main.css";
import { Assignment, useAssignmentApi } from "~/data/assignment";
import { Document, useDocumentApi } from "~/data/document";
import { Task, useTaskApi } from "~/data/task";
import { Label, useLabelApi } from "~/data/label";
import { Annotation, LSSerializedAnnotation, useAnnotationApi } from "~/data/annotation";


const supabase = useSupabaseClient();
const user = useSupabaseUser();
const assignmentApi = useAssignmentApi();
const documentApi = useDocumentApi();
const taskApi = useTaskApi();
const labelApi = useLabelApi();
const annotationApi = useAnnotationApi();

type Id = number;

const route = useRoute();
const assignment = ref<Assignment>();
const task = ref<Task>();
const documment = ref<Document>();

const annotations = reactive<Annotation[]>([]);
const ls_annotations = reactive<LSSerializedAnnotation>([]);

const labels = reactive<{ name: string; color: string }[]>([]);
const label_studio = ref();
/*
const updateAnnotation = async (id: number, ser_ann: LSSerializedAnnotation) => {
  console.log("serialized annotation", ser_ann)
  return;

  const { data, error } = await supabase
    .from("annotations")
    .update({ result: new_ann })
    .eq("id", id);
  if (error) {
    console.log("ERROR: ", error);
  }
  if (data) {
    console.log("ANNOTATION: ", data);
  }
};
*/
const initLS = async () => {
  const LabelStudio = (await import("@heartexlabs/label-studio")).default;

  label_studio.value = new LabelStudio("label-studio", {
    config: `
              <View style="display: flex;">
                <View style="width: 150px; background: #f1f1f1; border-radius: 3px">
                  <Filter name="fl" toName="label" hotkey="shift+f" minlength="1" />
                  <Labels style="padding-left: 2em; margin-right: 2em;" name="label" toName="text">
                    ${labels
                      .map((l) => `<Label value="${l.name}" background="${l.color}" />`)
                      .join("\n")}
                  </Labels>
                </View>
                <View>
                  <View style="height: auto; overflow-y: auto; padding: 0 1em">
                    <Text name="text" value="$text" />
                  </View>
                <Relations>
                  <Relation value="Is A" />
                  <Relation value="Has Function" />
                  <Relation value="Involved In" />
                  <Relation value="Related To" />
                </Relations>
                </View>
              </View>
              `,
    interfaces: [
      "panel",
      "update",
      "submit",
      "skip",
      "controls",
      "infobar",
      "topbar",
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
      firstName: user.value?.email,
      // lastName: "Dean",
    },
    task: {
      annotations: [{result: ls_annotations}],
      // predictions: this.predictions,
      data: {
        text: documment.value?.full_text,
      },
    },
    onLabelStudioLoad: (LS: any) => {
      if (annotations.length) {
        LS.annotationStore.selectAnnotation(LS.annotationStore.annotations);
      } else {
        const c = LS.annotationStore.addAnnotation({
          userGenerate: true,
        });
        LS.annotationStore.selectAnnotation(c.id);
      }
    },
    onSubmitAnnotation: (LS: any, { serializeAnnotation }: { serializeAnnotation: () => LSSerializedAnnotation }) => {
      if (!assignment.value)
        return;
      
      const db_anns = annotationApi.convert_ls2db(
        serializeAnnotation(),
        assignment.value.id
      );
      annotationApi.updateAssignmentAnnotations(assignment.value.id, db_anns)
    },
    onUpdateAnnotation: (LS: any, { serializeAnnotation }: { serializeAnnotation: () => LSSerializedAnnotation }) => {
      if (!assignment.value)
        return;

      const db_anns = annotationApi.convert_ls2db(
        serializeAnnotation(),
        assignment.value.id
      );
      annotationApi.updateAssignmentAnnotations(assignment.value.id, db_anns)
    },
  });
};

const loadData = async () => {
  assignment.value = await assignmentApi.findAssignment(
    route.params.assignment_id.toString()
  );
  if (!assignment.value)
    throw Error("Assignment not found")

  documment.value = await documentApi.findDocument(
    assignment.value.document_id.toString()
  );
  if (!documment.value)
    throw Error("Document not found")

  if (!assignment.value.task_id)
    throw Error("Document not found")
  task.value = await taskApi.findTask(assignment.value.task_id?.toString());

  const _labels: Label = await labelApi.findLabel(task.value.label_id.toString());

  labels.splice(0) &&
    labels.push(
      ..._labels.data.map((l) => {
        return l;
      })
    );

  annotations.splice(0) &&
    annotations.push(
      ...(await annotationApi.findAnnotations(assignment.value.id.toString()))
    );

  const db2ls_anns = annotationApi.convert_db2ls(annotations, assignment.value.id);
  if (annotations.length) {
    ls_annotations.splice(0) &&
      ls_annotations.push(...db2ls_anns);
  }

  initLS();
};

onMounted(() => {
  loadData();
});

definePageMeta({
  middleware: ["auth", "assignment"],
});
</script>
<style>
.lsf-current-task > div {
  display: none;
}

.lsf-current-task::before {
  content: "Annotate";
}

[aria-label="Reset"],
[aria-label="Copy Annotation"],
[aria-label="Settings"],
.lsf-annotations-list {
  display: none;
}
</style>
