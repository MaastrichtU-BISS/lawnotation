<template>
  <div id="label-studio-container">
    <div id="label-studio"></div>
  </div>
</template>
<script setup lang="ts">
import "@heartexlabs/label-studio/build/static/css/main.css";
import { Annotation, LSSerializedAnnotation, useAnnotationApi } from "~/data/annotation";
import { Assignment, useAssignmentApi } from "~/data/assignment";
import { LsLabels } from "~/data/labelset";

const annotationApi = useAnnotationApi();
const assignmentApi = useAssignmentApi();

const label_studio = ref();

const emit = defineEmits(["nextAssignment"]);

const props = defineProps<{
  user: any;
  assignment: Assignment | undefined;
  annotations: LSSerializedAnnotation | undefined;
  text: string | undefined;
  labels: LsLabels | undefined;
  isEditor: boolean | undefined;
}>();

const initLS = async () => {
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
                    <Relation value="Is A" />
                    <Relation value="Has Function" />
                    <Relation value="Involved In" />
                    <Relation value="Related To" />
                  </Relations>
                  </View>
                </View>
                `,
    // description: "<html>Description</html>",
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
      annotations: props.annotations?.length ? [{ result: props.annotations }] : [],
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
    },
    onSkipTask() {
      assignmentApi
        .updateAssignment(props.assignment?.id.toString(), { status: "done" })
        .then((a) => {
          emit("nextAssignment");
        });
    },
    onAcceptAnnotation() {},
    onRejectAnnotation() {},
    onSubmitAnnotation: (
      LS: any,
      { serializeAnnotation }: { serializeAnnotation: () => LSSerializedAnnotation }
    ) => {
      if (!props.assignment) return;

      const db_anns = annotationApi.convert_ls2db(
        serializeAnnotation(),
        props.assignment?.id
      );
      annotationApi.updateAssignmentAnnotations(props.assignment?.id, db_anns);
    },
    onUpdateAnnotation: (
      LS: any,
      { serializeAnnotation }: { serializeAnnotation: () => LSSerializedAnnotation }
    ) => {
      if (!props.assignment) return;

      const db_anns = annotationApi.convert_ls2db(
        serializeAnnotation(),
        props.assignment?.id
      );
      annotationApi.updateAssignmentAnnotations(props.assignment?.id, db_anns);
    },
  });
};

onMounted(() => {
  initLS();
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
