<template>
  <div id="label-studio-container">
    <div id="label-studio"></div>
  </div>
</template>
<script setup lang="ts">
import "@heartexlabs/label-studio/build/static/css/main.css";
import { Assignment, useAssignmentApi } from "~/data/assignment";
import { Document, useDocumentApi } from "~/data/document";
import { Task, useTaskApi } from "~/data/task";
import { Labelset, useLabelsetApi } from "~/data/labelset.js";
import { Annotation, LSSerializedAnnotation, useAnnotationApi } from "~/data/annotation";
import { AssignmentIterator } from "~/data/assignmentsIterator";

const supabase = useSupabaseClient();
const user = useSupabaseUser();
const assignmentApi = useAssignmentApi();
const documentApi = useDocumentApi();
const taskApi = useTaskApi();
const labelsetApi = useLabelsetApi();
const annotationApi = useAnnotationApi();

type Id = number;

const route = useRoute();
const current_assignment = ref<Assignment>();
const assignmentIterator = new AssignmentIterator();
const task = ref<Task>();
const doc = ref<Document>();

const annotations = reactive<Annotation[]>([]);
const ls_annotations = reactive<LSSerializedAnnotation>([]);

const labels = reactive<{ name: string; color: string }[]>([]);
const label_studio = ref();
const isEditor = ref<boolean>();

const initLS = async () => {
  const LabelStudio = (await import("@heartexlabs/label-studio")).default;

  var parent = document.getElementById("label-studio-container");
  var child = document.getElementById("label-studio");
  parent?.removeChild(child);
  var new_child = document.createElement("div");
  new_child.setAttribute("id", "label-studio");
  parent?.appendChild(new_child);
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
    // description: "Description",
    interfaces: [
      "panel",
      "update",
      "submit",
      "skip",
      "controls",
      "infobar",
      "topbar",
      "topbar:prevnext",
      isEditor.value ? "review" : "",
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
      annotations: ls_annotations.length ? [{ result: ls_annotations }] : [],
      // predictions: this.predictions,
      data: {
        text: doc.value?.full_text,
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
    onSkipTask() {
      if (assignmentIterator.moveNext()) {
        current_assignment.value = assignmentIterator.getCurrent();
        loadData();
      } else {
        alert("All tasks are done: you will be logged out");
        supabase.auth.signOut();
      }
    },
    onAcceptAnnotation() {
      if (assignmentIterator.moveNext()) {
        current_assignment.value = assignmentIterator.getCurrent();
        loadData();
      } else {
        alert("All tasks have been reviewed");
      }
    },
    onRejectAnnotation() {
      if (assignmentIterator.moveNext()) {
        current_assignment.value = assignmentIterator.getCurrent();
        loadData();
      } else {
        alert("All tasks have been reviewed");
      }
    },
    onSubmitAnnotation: (
      LS: any,
      { serializeAnnotation }: { serializeAnnotation: () => LSSerializedAnnotation }
    ) => {
      if (!current_assignment.value) return;

      const db_anns = annotationApi.convert_ls2db(
        serializeAnnotation(),
        current_assignment.value.id
      );
      annotationApi.updateAssignmentAnnotations(current_assignment.value.id, db_anns);
    },
    onUpdateAnnotation: (
      LS: any,
      { serializeAnnotation }: { serializeAnnotation: () => LSSerializedAnnotation }
    ) => {
      if (!current_assignment.value) return;

      const db_anns = annotationApi.convert_ls2db(
        serializeAnnotation(),
        current_assignment.value.id
      );
      annotationApi.updateAssignmentAnnotations(current_assignment.value.id, db_anns);
    },
  });
};

const initAssignmentsIterator = async () => {
  const first_assignment = await assignmentApi.findAssignment(
    route.params.assignment_id.toString()
  );

  isEditor.value = user.value?.id != first_assignment?.annotator_id;

  console.log("1", user.value?.id);
  console.log("2", first_assignment?.annotator_id);
  console.log("3", isEditor.value);

  await assignmentIterator.loadAssignments(
    first_assignment.annotator_id,
    first_assignment.task_id
  );
};

const loadData = async () => {
  current_assignment.value = assignmentIterator.getCurrent();

  if (!current_assignment.value) throw Error("Assignment not found");

  doc.value = await documentApi.findDocument(
    current_assignment.value.document_id.toString()
  );
  if (!doc.value) throw Error("Document not found");

  if (!current_assignment.value.task_id) throw Error("Document not found");
  task.value = await taskApi.findTask(current_assignment.value.task_id?.toString());

  const _labelset: Labelset = await labelsetApi.findLabelset(task.value.labelset_id.toString());

  labels.splice(0) &&
    labels.push(
      ..._labelset.labels.map((l) => {
        return l;
      })
    );

  annotations.splice(0) &&
    annotations.push(
      ...(await annotationApi.findAnnotations(current_assignment.value.id.toString()))
    );

  const db2ls_anns = annotationApi.convert_db2ls(
    annotations,
    current_assignment.value.id
  );
  if (annotations.length) {
    ls_annotations.splice(0) && ls_annotations.push(...db2ls_anns);
  }

  initLS();
};

onMounted(() => {});

watch(user, () => {
  initAssignmentsIterator().then((res) => {
    loadData();
  });
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
